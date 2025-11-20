
import { GoogleGenAI, GenerateContentResponse, Content, Part, Type } from "@google/genai";
import type { ChatMessage, Provider, SearchSource } from '../types';

// --- Helper Functions ---
const buildGeminiHistory = (messages: ChatMessage[]): Content[] => {
    return messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts as Part[],
    }));
};

const buildOpenRouterHistory = (messages: ChatMessage[]): {role: string, content: string}[] => {
     return messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, ''),
    }));
}

// --- External Search Services ---

export const performExternalSearch = async (
    query: string, 
    tool: 'tavily' | 'exa' | 'brave', 
    apiKey: string
): Promise<{ context: string; sources: SearchSource[] }> => {
    let context = '';
    const sources: SearchSource[] = [];

    try {
        if (tool === 'tavily') {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    max_results: 3
                })
            });
            const data = await response.json();
            if (data.answer) {
                context += `\n[Tavily Answer]: ${data.answer}\n`;
            }
            if (data.results && Array.isArray(data.results)) {
                context += `\n[Tavily Search Results]:\n`;
                data.results.forEach((result: any) => {
                    context += `- Title: ${result.title}\n  Content: ${result.content}\n  URL: ${result.url}\n`;
                    sources.push({ uri: result.url, title: result.title, type: 'web' });
                });
            }

        } else if (tool === 'exa') {
            const response = await fetch('https://api.exa.ai/search', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    query: query,
                    numResults: 3,
                    useAutoprompt: true,
                    contents: { text: true }
                })
            });
            const data = await response.json();
            if (data.results && Array.isArray(data.results)) {
                 context += `\n[Exa/Metaphor Search Results]:\n`;
                 data.results.forEach((result: any) => {
                    context += `- Title: ${result.title || 'No Title'}\n  Content Snippet: ${result.text?.substring(0, 300)}...\n  URL: ${result.url}\n`;
                    sources.push({ uri: result.url, title: result.title || 'Exa Result', type: 'web' });
                });
            }

        } else if (tool === 'brave') {
            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey
                }
            });
            const data = await response.json();
            if (data.web && data.web.results) {
                context += `\n[Brave Search Results]:\n`;
                data.web.results.forEach((result: any) => {
                    context += `- Title: ${result.title}\n  Description: ${result.description}\n  URL: ${result.url}\n`;
                    sources.push({ uri: result.url, title: result.title, type: 'web' });
                });
            }
        }
    } catch (e) {
        console.error(`External search (${tool}) failed:`, e);
        context += `\n[System]: Failed to perform external search with ${tool}. Error: ${(e as Error).message}\n`;
    }

    return { context, sources };
};

// --- Provider-Specific Functions ---

export const generateGeminiChatResponse = async (
    model: string, 
    history: ChatMessage[], 
    userMessage: ChatMessage, 
    systemPrompt: string,
    activeTools: { googleSearch: boolean; googleMaps: boolean },
    onUpdate?: (text: string) => void
): Promise<{ text: string; sources: SearchSource[] }> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set for Gemini.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const contents = buildGeminiHistory([...history, userMessage]);
    
    const config: any = {};
    const tools: any[] = [];

    if (activeTools.googleSearch) {
        tools.push({ googleSearch: {} });
    }
    if (activeTools.googleMaps) {
        tools.push({ googleMaps: {} });
    }

    if (tools.length > 0) {
        config.tools = tools;
    }

    if (systemPrompt.trim() && tools.length === 0) {
        config.systemInstruction = systemPrompt;
    } else if (tools.length > 0) {
        if (systemPrompt.trim()) config.systemInstruction = systemPrompt;
    }

    // Use generateContentStream for streaming
    const streamingResp = await ai.models.generateContentStream({
        model: model,
        contents: contents,
        ...(Object.keys(config).length > 0 && { config }),
    });

    let fullText = '';
    
    for await (const chunk of streamingResp) {
        const chunkText = chunk.text;
        if (chunkText) {
            fullText += chunkText;
            if (onUpdate) onUpdate(fullText);
        }
    }

    // Wait for the final response to extract metadata (sources)
    const finalResponse = await streamingResp.response;
    const sources: SearchSource[] = [];

    if (finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        finalResponse.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
            if (chunk.web) {
                sources.push({
                    uri: chunk.web.uri || '',
                    title: chunk.web.title || chunk.web.uri || 'Web Source',
                    type: 'web'
                });
            } else if (chunk.maps) {
                 const uri = chunk.maps.placeAnswerSources?.[0]?.uri || '';
                 const title = chunk.maps.placeAnswerSources?.[0]?.name || 'Google Maps Result';
                 if (uri || title !== 'Google Maps Result') {
                     sources.push({
                         uri: uri,
                         title: title,
                         type: 'map'
                     });
                 }
            }
        });
    }
    
    return { text: fullText, sources };
}

export const generateOpenRouterChatResponse = async (
    model: string, 
    history: ChatMessage[], 
    userMessage: ChatMessage, 
    apiKey: string, 
    systemPrompt: string,
    onUpdate?: (text: string) => void
): Promise<string> => {
    if (!apiKey) {
        throw new Error("OpenRouter API Key not provided. Please add it in Settings.");
    }
    if (userMessage.parts.some(p => 'inlineData' in p)) {
        throw new Error('File attachments are only supported for Gemini models.');
    }
    const newMessage = userMessage.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');

    const messages: {role: string, content: string}[] = [];
    if (systemPrompt.trim()) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push(...buildOpenRouterHistory(history));
    messages.push({ role: "user", content: newMessage });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": `${window.location.protocol}//${window.location.host}`,
            "X-Title": "Gemini Multi-Modal AI Suite",
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            stream: true, // Enable streaming
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    if (!response.body) return "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            
            // Parse SSE data
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr.trim() === '[DONE]') continue;
                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            if (onUpdate) onUpdate(fullText);
                        }
                    } catch (e) {
                        console.warn("Error parsing SSE JSON", e);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return fullText;
}

export const generateOllamaChatResponse = async (
    model: string, 
    history: ChatMessage[], 
    userMessage: ChatMessage, 
    baseUrl: string, 
    systemPrompt: string,
    onUpdate?: (text: string) => void
): Promise<string> => {
    if (!baseUrl || !baseUrl.startsWith('http')) {
        throw new Error("Ollama Base URL is not set or invalid. Please add it in Settings.");
    }
    if (userMessage.parts.some(p => 'inlineData' in p)) {
        throw new Error('File attachments are only supported for Gemini models.');
    }
    const newMessage = userMessage.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');

    const messages: {role: string, content: string}[] = [];
    if (systemPrompt.trim()) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push(...buildOpenRouterHistory(history));
    messages.push({ role: "user", content: newMessage });

    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true, // Enable streaming
            }),
        });
    
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ollama API error (${response.status}): ${errorData?.error?.message || 'Unknown error'}`);
        }
    
        if (!response.body) return "";

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                         // Handle "data: " prefix if present (OpenAI compatibility mode in some Ollama versions)
                         const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
                         if (jsonStr.trim() === '[DONE]') continue;
                         
                         try {
                            const data = JSON.parse(jsonStr);
                            const content = data.choices?.[0]?.delta?.content || data.message?.content; // Handle both standard and OpenAI-compat formats
                            if (content) {
                                fullText += content;
                                if (onUpdate) onUpdate(fullText);
                            }
                        } catch (e) {
                            // partial JSON ignore
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return fullText;

    } catch(e) {
        throw new Error(`Failed to connect to Ollama at ${baseUrl}. Is it running? Error: ${(e as Error).message}`);
    }
}


// --- Main Service Function ---

export const getChatResponse = async (
    provider: Provider, 
    model: string, 
    history: ChatMessage[], 
    userMessage: ChatMessage, 
    apiConfig: { openRouterKey: string, ollamaUrl: string },
    systemPrompt: string,
    activeTools: { googleSearch: boolean; googleMaps: boolean },
    onUpdate?: (text: string) => void
): Promise<{ text: string, sources: SearchSource[] }> => {
    switch (provider) {
        case 'Gemini':
            return generateGeminiChatResponse(model, history, userMessage, systemPrompt, activeTools, onUpdate);
        case 'OpenRouter': {
            const text = await generateOpenRouterChatResponse(model, history, userMessage, apiConfig.openRouterKey, systemPrompt, onUpdate);
            return { text, sources: [] };
        }
        case 'Ollama': {
            const text = await generateOllamaChatResponse(model, history, userMessage, apiConfig.ollamaUrl, systemPrompt, onUpdate);
            return { text, sources: [] };
        }
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

// --- Self-Correction / Optimization Loop ---

export const optimizeNodeContent = async (
    prompt: string, 
    originalResponse: string, 
    critiqueCriteria: string
): Promise<{ refinedPrompt: string; pass: boolean; reason: string }> => {
    if (!process.env.API_KEY) throw new Error("API Key needed for optimization loop.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const metaPrompt = `
    You are an AI Optimization Agent.
    
    Goal: Evaluate the "Output" against the "Criteria" provided.
    
    1. "Output": "${originalResponse.replace(/"/g, '\\"').substring(0, 5000)}"
    2. "Criteria": "${critiqueCriteria.replace(/"/g, '\\"')}"
    3. "Original Prompt": "${prompt.replace(/"/g, '\\"')}"

    Task:
    If the output meets the criteria, return "PASS".
    If it fails, return "FAIL", explain why, and generate a BETTER version of the "Original Prompt" that would fix the issue.

    Return JSON ONLY: { "pass": boolean, "reason": string, "refinedPrompt": string }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: metaPrompt }] },
        config: { responseMimeType: "application/json" }
    });

    if (response.text) {
        try {
            // Robust parsing: Remove potential markdown code blocks
            const raw = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Optimization Loop JSON Parse Failed", e);
            return { pass: true, reason: "JSON Parse Error - Assuming Pass", refinedPrompt: prompt };
        }
    }
    return { pass: true, reason: "No response", refinedPrompt: prompt };
};


// --- Image Analysis (Gemini-specific) ---

export const analyzeImage = async (prompt: string, imagePart: { inlineData: { data: string; mimeType: string } }): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text || "No analysis generated.";
};

// --- Document Analysis & Graph Generation ---

export interface GeneratedNodeInfo {
    summary: string;
    childNodes: { title: string; prompt: string }[];
}

export const generateNodesFromDocument = async (filePart: { inlineData: { data: string; mimeType: string } }): Promise<GeneratedNodeInfo> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Schema definition for structured output
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            summary: {
                type: Type.STRING,
                description: "A concise summary of the main topic of the document."
            },
            childNodes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Short title for the reasoning node" },
                        prompt: { type: Type.STRING, description: "A specific question or task to explore a sub-topic of the document." }
                    },
                    required: ["title", "prompt"]
                }
            }
        },
        required: ["summary", "childNodes"]
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                filePart,
                { text: "Analyze this document. Provide a summary of the main topic. Then, identify 4 key sub-topics, questions, or analysis tasks derived from this document that would allow for deeper exploration. Return this as a JSON object with 'summary' and a list of 'childNodes' containing 'title' and 'prompt' for each sub-task." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    if (response.text) {
        try {
            const json = JSON.parse(response.text);
            return json as GeneratedNodeInfo;
        } catch (e) {
            throw new Error(`Failed to parse structured response from Gemini. Raw response: ${response.text.substring(0, 100)}...`);
        }
    }
    throw new Error("No response generated from document.");
};

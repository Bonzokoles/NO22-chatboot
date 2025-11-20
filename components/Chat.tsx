
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Provider, Model, ChatPart, SearchSource } from '../types';
import * as aiService from '../services/geminiService';
import { ragService } from '../services/ragService';
import { fileToGenerativePart } from '../utils/fileUtils';
import { SendIcon, UserIcon, BotIcon, LinkIcon, PaperclipIcon, AudioIcon, MapIcon, SparklesIcon, DatabaseIcon } from './icons/Icons';

const ALL_MODELS: Model[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Gemini' },
  { id: 'mistralai/mistral-7b-instruct-free', name: 'Mistral 7B Instruct (Free)', provider: 'OpenRouter' },
  { id: 'google/gemma-2-9b-it:free', name: 'Google Gemma 2 9B (Free)', provider: 'OpenRouter' },
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Meta Llama 3 8B (Free)', provider: 'OpenRouter' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenRouter' },
];

const PROVIDERS: Provider[] = ['Gemini', 'OpenRouter', 'Ollama'];

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>('Gemini');
  const [model, setModel] = useState<string>(ALL_MODELS[0].id);
  const [ollamaModel, setOllamaModel] = useState<string>('llama3');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');

  // Tools State
  const [tools, setTools] = useState({ googleSearch: false, googleMaps: false, knowledgeBase: false });
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const orKey = localStorage.getItem('openRouterApiKey') || '';
    setOpenRouterKey(orKey);
    const olUrl = localStorage.getItem('ollamaUrl') || '';
    setOllamaUrl(olUrl);

    return () => {
      isMountedRef.current = false;
      // Cleanup attachment preview on unmount to prevent memory leaks
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, []); // attachmentPreview is handled in a separate effect below

  // Separate effect to clean up old preview when it changes
  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const availableModels = ALL_MODELS.filter(m => m.provider === provider);

  useEffect(() => {
    if (provider !== 'Ollama' && availableModels.length > 0 && !availableModels.find(m => m.id === model)) {
      setModel(availableModels[0].id);
    }
    if (provider !== 'Gemini') {
      setTools(t => ({ ...t, googleSearch: false, googleMaps: false }));
    }
  }, [provider, availableModels, model]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isModelSelectorOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isModelSelectorOpen]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (provider !== 'Gemini') {
        setError("File attachments are only supported for the Gemini provider.");
        return;
      }
      // Revoke previous URL if exists (handled by useEffect, but good practice to set null first)
      setAttachment(file);
      setAttachmentPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null); // cleanup handled by useEffect
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    setError(null);
    if (provider === 'OpenRouter' && !openRouterKey) {
      setError("OpenRouter API key is not set. Please add it in Settings.");
      return;
    }
    if (provider === 'Ollama' && (!ollamaUrl || !ollamaModel.trim())) {
      setError("Ollama URL and Model Name must be set. Check Settings and the model input field.");
      return;
    }
    if (provider !== 'Gemini' && attachment) {
      setError("File attachments are only supported for the Gemini provider.");
      return;
    }

    const userParts: ChatPart[] = [{ text: input }];
    if (attachment) {
      try {
        const filePart = await fileToGenerativePart(attachment);
        userParts.push(filePart);
      } catch (err) {
        setError(`Error processing file: ${(err as Error).message}`);
        return;
      }
    }

    const userMessage: ChatMessage = { role: 'user', parts: userParts };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    handleRemoveAttachment();
    setIsLoading(true);

    // Create a placeholder message for the model response
    const placeholderMessage: ChatMessage = { role: 'model', parts: [{ text: '' }] };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      const currentModel = provider === 'Ollama' ? ollamaModel : model;
      const apiConfig = { openRouterKey, ollamaUrl };

      let ragContext = "";
      const sources: SearchSource[] = [];

      // --- RAG Integration ---
      if (tools.knowledgeBase) {
        try {
          const ragResult = await ragService.search(input);
          if (ragResult.context) {
            ragContext = `\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n${ragResult.context}\n---------------------------------------\n`;
            // Add RAG sources to the list to be displayed with the response
            sources.push(...ragResult.sources);
          }
        } catch (e) {
          console.error("RAG Error", e);
        }
      }

      let messageToSend = userMessage;
      if (ragContext) {
        // Inject RAG context into the message parts for the AI
        const parts = [...userMessage.parts];
        const firstPart = parts[0];
        if (firstPart && 'text' in firstPart) {
          parts[0] = { text: firstPart.text + ragContext };
        } else {
          parts.unshift({ text: ragContext });
        }
        messageToSend = { ...userMessage, parts };
      }

      const response = await aiService.getChatResponse(
        provider,
        currentModel,
        newMessages, // Use the history *before* the placeholder
        messageToSend,
        apiConfig,
        systemPrompt,
        tools,
        (textChunk) => {
          // Update the last message (placeholder) with streaming text
          if (isMountedRef.current) {
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                ...updated[lastIdx],
                parts: [{ text: textChunk }]
              };
              return updated;
            });
          }
        }
      );

      if (isMountedRef.current) {
        // Final update to ensure everything is synced and sources are added
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            role: 'model',
            parts: [{ text: response.text }],
            sources: [...sources, ...response.sources]
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Error fetching response:', err);
      if (isMountedRef.current) {
        // Replace the placeholder with the error message
        const errorMessageText = `Sorry, something went wrong: ${(err as Error).message}`;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', parts: [{ text: errorMessageText }] };
          return updated;
        });
        setError((err as Error).message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const renderModelSelector = () => {
    if (provider === 'Ollama') {
      return (
        <div className="flex items-center gap-2">
          <label htmlFor="ollama-model-input" className="text-sm font-medium text-gray-600 dark:text-gray-400">Model:</label>
          <input
            id="ollama-model-input"
            type="text"
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            placeholder="e.g., llama3"
            className="w-full p-2 bg-gray-800 dark:bg-gray-950 text-gray-200 border border-gray-700 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm"
            disabled={isLoading}
          />
        </div>
      );
    }

    const filteredModels = availableModels.filter(m =>
      m.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );

    const handleModelSelect = (modelId: string) => {
      setModel(modelId);
      setIsModelSelectorOpen(false);
      setModelSearchTerm('');
    };

    const selectedModelName = ALL_MODELS.find(m => m.id === model)?.name || 'Select Model';

    return (
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Model:</label>
        <div className="relative" ref={modelSelectorRef}>
          <button
            type="button"
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            className="w-full min-w-[200px] text-left bg-gray-800 dark:bg-gray-950 text-gray-200 border border-gray-700 dark:border-gray-800 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 flex justify-between items-center"
            aria-haspopup="listbox"
            aria-expanded={isModelSelectorOpen}
          >
            <span className="truncate">{selectedModelName}</span>
            <svg className={`w-4 h-4 transition-transform text-gray-500 dark:text-gray-400 ${isModelSelectorOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          {isModelSelectorOpen && (
            <div className="absolute z-20 mt-1 w-full bg-gray-900 dark:bg-black shadow-lg max-h-60 overflow-auto border border-gray-700 dark:border-gray-800">
              <div className="p-2 border-b border-gray-800 dark:border-gray-900">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={modelSearchTerm}
                  onChange={e => setModelSearchTerm(e.target.value)}
                  placeholder="Search models..."
                  className="w-full p-2 bg-gray-800 dark:bg-gray-950 text-gray-200 border border-gray-700 dark:border-gray-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <ul role="listbox">
                {filteredModels.length > 0 ? (
                  filteredModels.map(m => (
                    <li
                      key={m.id}
                      onClick={() => handleModelSelect(m.id)}
                      className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-indigo-500 hover:text-white cursor-pointer"
                      role="option"
                      aria-selected={model === m.id}
                    >
                      {m.name}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-sm text-gray-500">No models found.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black">
      <header className="p-3 border-b border-gray-800 dark:border-gray-900 bg-gray-950 dark:bg-black flex flex-col gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-xl font-semibold mr-4">Chat</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="provider-select" className="text-sm font-medium text-gray-600 dark:text-gray-400">Provider:</label>
            <select
              id="provider-select"
              value={provider}
              onChange={e => setProvider(e.target.value as Provider)}
              className="bg-gray-800 dark:bg-gray-950 border border-gray-700 dark:border-gray-800 p-2 text-sm text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {renderModelSelector()}

          {/* Tools Menu */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded border transition-colors ${Object.values(tools).some(Boolean)
                  ? 'bg-indigo-900 text-indigo-200 border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-gray-800 text-gray-300 border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800 hover:bg-gray-700 dark:hover:bg-gray-900'
                }`}
            >
              <SparklesIcon />
              Tools
              {Object.values(tools).some(Boolean) && (
                <span className="ml-1 flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              )}
            </button>

            {isToolsOpen && (
              <div className="absolute z-30 mt-2 w-64 bg-gray-900 dark:bg-black rounded-md shadow-xl border border-gray-700 dark:border-gray-800 p-3">
                {provider === 'Gemini' && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Live Web Data</h3>
                    <div className="space-y-2 mb-3">
                      <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded">
                        <input
                          type="checkbox"
                          checked={tools.googleSearch}
                          onChange={(e) => setTools({ ...tools, googleSearch: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="flex items-center gap-2 text-sm text-gray-300 dark:text-gray-300">
                          <LinkIcon /> Google Search
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                        <input
                          type="checkbox"
                          checked={tools.googleMaps}
                          onChange={(e) => setTools({ ...tools, googleMaps: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                          <MapIcon /> Google Maps
                        </span>
                      </label>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  </>
                )}

                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Context</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={tools.knowledgeBase}
                      onChange={(e) => setTools({ ...tools, knowledgeBase: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <DatabaseIcon /> Knowledge Base
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">System Prompt</label>
          <input
            id="system-prompt"
            type="text"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={(tools.googleSearch || tools.googleMaps) ? "System prompt remains active with tools." : "Guide the AI's behavior, e.g., 'You are a pirate.'"}
            className="w-full p-2 bg-gray-800 dark:bg-gray-950 text-gray-200 border border-gray-700 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm disabled:opacity-50"
            disabled={isLoading}
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 flex items-center justify-center">
                <BotIcon />
              </div>
            )}
            <div className={`max-w-xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 dark:bg-gray-900 text-gray-200'}`}>
              <div className="space-y-2">
                {msg.parts.map((part, partIndex) => {
                  if ('text' in part) { // Allow empty string for streaming start
                    let displayText = part.text;
                    // Hide the injected RAG context from the user bubble for cleaner UI
                    if (msg.role === 'user' && displayText.includes("--- RELEVANT KNOWLEDGE BASE CONTEXT ---")) {
                      displayText = displayText.split("--- RELEVANT KNOWLEDGE BASE CONTEXT ---")[0].trim();
                    }
                    return <p key={partIndex} className="whitespace-pre-wrap">{displayText}</p>;
                  }
                  if ('inlineData' in part) {
                    const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    if (part.inlineData.mimeType.startsWith('image/')) {
                      return <img key={partIndex} src={src} alt="user content" className="max-w-xs max-h-48" />;
                    }
                    if (part.inlineData.mimeType.startsWith('audio/')) {
                      return <audio key={partIndex} controls src={src} />;
                    }
                  }
                  return null;
                })}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 border-t border-gray-300 dark:border-gray-600 pt-2">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1"><SparklesIcon /> Sources & Data:</h4>
                  <ul className="space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i} className="text-xs truncate flex items-center gap-2">
                        {source.type === 'map' ? <MapIcon /> : source.type === 'file' ? <DatabaseIcon size="xs" /> : <LinkIcon />}
                        {source.type === 'web' || source.type === 'map' ? (
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                            {source.title}
                          </a>
                        ) : (
                          <span className="text-indigo-500 dark:text-indigo-400">{source.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-500 dark:bg-gray-600 flex items-center justify-center">
                <UserIcon />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'model' && (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 flex items-center justify-center">
              <BotIcon />
            </div>
            <div className="max-w-xl p-3 bg-white dark:bg-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-800 dark:border-gray-900 bg-gray-950 dark:bg-black">
        {attachment && attachmentPreview && (
          <div className="mb-2 p-2 bg-gray-800 dark:bg-gray-900 relative w-fit">
            {attachment.type.startsWith('image/') ? (
              <img src={attachmentPreview} alt="attachment preview" className="max-h-24 max-w-sm" />
            ) : (
              <div className="flex items-center gap-2 p-2">
                <AudioIcon />
                <span className="text-sm text-gray-700 dark:text-gray-300">{attachment.name}</span>
              </div>
            )}
            <button
              onClick={handleRemoveAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white h-5 w-5 flex items-center justify-center text-xs"
              aria-label="Remove attachment"
            >
              &times;
            </button>
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,audio/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || provider !== 'Gemini'}
            className="p-3 text-gray-400 dark:text-gray-500 bg-gray-800 dark:bg-gray-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 dark:hover:bg-gray-900 transition-colors"
            aria-label="Attach file"
            title={provider !== 'Gemini' ? "Attachments only supported for Gemini" : "Attach file"}
          >
            <PaperclipIcon />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 bg-gray-800 dark:bg-gray-950 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !attachment)}
            className="p-3 bg-indigo-600 disabled:bg-gray-700 dark:disabled:bg-gray-800 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

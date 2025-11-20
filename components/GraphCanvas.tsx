
import React, { useState, useRef, useEffect } from 'react';
import { GraphNodeData, GraphConnection, Provider, Model, SearchSource, RAGDocument, LoopConfig } from '../types';
import { PlusCircleIcon, BotIcon, SendIcon, XIcon, ChainIcon, MapIcon, LinkIcon, SparklesIcon, ChevronDownIcon, ChevronRightIcon, DocumentIcon, TemplateIcon, CodeIcon, DatabaseIcon, LoopIcon, WebhookIcon, ApiGateIcon, RefreshIcon, QuestionMarkIcon } from './icons/Icons';
import * as aiService from '../services/geminiService';
import { fileToGenerativePart } from '../utils/fileUtils';
import { ragService } from '../services/ragService';
import { triggerWebhook, generateCloudflarePayload } from '../services/integrationService';

// Default size for nodes
const NODE_WIDTH = 320;
const NODE_HEIGHT = 400;
const GRID_SIZE = 20;

// Node Templates Categorized
const TEMPLATE_CATEGORIES = {
    'Text Analysis': [
        { label: 'Summarizer', title: 'Summarize', prompt: 'Summarize the input provided in the context. Focus on key points and actionable insights.' },
        { label: 'Fact Checker', title: 'Fact Check', prompt: 'Verify the claims made in the input. Point out inaccuracies and provide corrections where possible.' },
        { label: 'Simplify', title: 'Explain Like I\'m 5', prompt: 'Explain the provided concept or text in simple terms suitable for a beginner or child.' },
    ],
    'Code & Search': [
        { label: 'Python Search Assistant', title: 'Py Search', prompt: 'Write a Python script to extract keywords from the attached file (if any) or the context, and use them to perform a comprehensive web search.', type: 'code' as const },
        { label: 'Code Reviewer', title: 'Code Review', prompt: 'Review the code provided in the context. Identify potential bugs, security issues, and suggest optimizations.', type: 'code' as const },
    ],
    'Agent & Automation': [
        { label: 'Self-Correcting Writer', title: 'Writer Agent', prompt: 'Draft a blog post about AI.', loop: true },
        { label: 'Flowise Connector', title: 'Flowise', prompt: 'Send context to Flowise workflow.', type: 'webhook' as const },
        { label: 'ActivePieces Connector', title: 'ActivePieces', prompt: 'Trigger ActivePieces automation.', type: 'webhook' as const },
    ],
    'Creative & Utility': [
        { label: 'Idea Generator', title: 'Brainstorm', prompt: 'Based on the context, generate 5 creative ideas or potential next steps.' },
        { label: 'Translator (ES)', title: 'To Spanish', prompt: 'Translate the provided context or input into Spanish. Maintain the tone and style.' },
    ]
};

export const GraphCanvas: React.FC = () => {
    const [nodes, setNodes] = useState<GraphNodeData[]>([
        {
            id: 'node-sentiment-demo',
            x: 200,
            y: 200,
            title: 'Sentiment Analysis',
            prompt: 'Analyze the sentiment of the previous output.',
            response: '',
            status: 'idle',
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            collapsed: false,
            sources: [],
            nodeType: 'text'
        },
        {
            id: 'node-webhook-demo',
            x: 400,
            y: 200,
            title: 'External API Call',
            prompt: '',
            response: '',
            status: 'idle',
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            collapsed: false,
            sources: [],
            nodeType: 'webhook'
        }
    ]);
    const [connections, setConnections] = useState<GraphConnection[]>([]);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    
    // Dragging Node State
    const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragNodePos, setDragNodePos] = useState<{x: number, y: number} | null>(null);

    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    // Editing State
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // Link Mode
    const [isLinkMode, setIsLinkMode] = useState(false);
    const [linkStartNode, setLinkStartNode] = useState<string | null>(null);

    // Tool Configuration
    const [tools, setTools] = useState({ 
        googleSearch: false, 
        googleMaps: false,
        tavily: false,
        exa: false,
        brave: false
    });
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

    // Templates Menu
    const [isTemplatesMenuOpen, setIsTemplatesMenuOpen] = useState(false);
    const templatesMenuRef = useRef<HTMLDivElement>(null);

    // API Gate Modal
    const [showApiGate, setShowApiGate] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // API Keys Presence
    const [apiKeys, setApiKeys] = useState({
        tavily: false,
        exa: false,
        brave: false
    });
    
    // Integrations
    const [integrationUrls, setIntegrationUrls] = useState({
        flowise: '',
        activePieces: '',
        langChain: ''
    });

    // Document Analysis
    const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Knowledge Base Files for Attachment
    const [availableFiles, setAvailableFiles] = useState<RAGDocument[]>([]);

    const canvasRef = useRef<HTMLDivElement>(null);
    const toolsMenuRef = useRef<HTMLDivElement>(null);
    
    // Stability: Track mount status to prevent state updates on unmounted component
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        const checkKeys = () => {
            setApiKeys({
                tavily: !!localStorage.getItem('tavilyApiKey'),
                exa: !!localStorage.getItem('exaApiKey'),
                brave: !!localStorage.getItem('braveApiKey'),
            });
            setIntegrationUrls({
                flowise: localStorage.getItem('flowiseUrl') || '',
                activePieces: localStorage.getItem('activePiecesUrl') || '',
                langChain: localStorage.getItem('langChainUrl') || ''
            });
        };
        checkKeys();
        setAvailableFiles(ragService.getDocuments());

        window.addEventListener('focus', checkKeys);
        return () => {
            window.removeEventListener('focus', checkKeys);
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
            setIsToolsMenuOpen(false);
          }
          if (templatesMenuRef.current && !templatesMenuRef.current.contains(event.target as Node)) {
            setIsTemplatesMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Node Management ---

    const addNode = (x: number, y: number, prompt: string = '', parentId?: string, title: string = 'New Node', prefilledResponse: string = '', nodeType: 'text' | 'code' | 'webhook' = 'text', loopConfig?: LoopConfig) => {
        const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

        const newNode: GraphNodeData = {
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: snappedX,
            y: snappedY,
            title: title,
            prompt,
            response: prefilledResponse,
            status: prefilledResponse ? 'success' : 'idle',
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            collapsed: false,
            sources: [],
            nodeType: nodeType,
            loopConfig: loopConfig
        };
        setNodes(prev => [...prev, newNode]);

        if (parentId) {
            const newConnection: GraphConnection = {
                id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fromNodeId: parentId,
                toNodeId: newNode.id
            };
            setConnections(prev => [...prev, newConnection]);
        }
        return newNode.id;
    };

    const removeNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setConnections(prev => prev.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
    };

    const updateNode = (id: string, data: Partial<GraphNodeData>) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    };

    const getNodePosition = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;
        if (nodeId === isDraggingNode && dragNodePos) {
            return { ...node, x: dragNodePos.x, y: dragNodePos.y };
        }
        return node;
    };

    // --- Template Handling ---

    const handleTemplateClick = (template: any) => {
        const cx = -pan.x + (window.innerWidth / 2) - (NODE_WIDTH / 2);
        const cy = -pan.y + (window.innerHeight / 2) - (NODE_HEIGHT / 2);
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;

        let loopConfig: LoopConfig | undefined;
        if (template.loop) {
            loopConfig = { enabled: true, maxRetries: 3, critiquePrompt: "Ensure tone is professional and no factual errors.", currentRetry: 0 };
        }
        
        let title = template.title;
        let prompt = template.prompt;
        let webhookUrl = undefined;

        if (template.title === 'Flowise') webhookUrl = integrationUrls.flowise;
        if (template.title === 'ActivePieces') webhookUrl = integrationUrls.activePieces;

        const nodeId = addNode(cx + offsetX, cy + offsetY, prompt, undefined, title, '', template.type || 'text', loopConfig);
        
        if (webhookUrl) {
            updateNode(nodeId, { webhookUrl });
        }
        
        setIsTemplatesMenuOpen(false);
    };

    // --- Document Handling ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzingDoc(true);
        try {
            const filePart = await fileToGenerativePart(file);
            const result = await aiService.generateNodesFromDocument(filePart);
            
            if (!isMountedRef.current) return;

            const cx = -pan.x + (window.innerWidth / 2) - (NODE_WIDTH / 2);
            const cy = -pan.y + (window.innerHeight / 2) - (NODE_HEIGHT / 2);

            const rootId = addNode(cx, cy, "Summary generated from document analysis", undefined, "Document Summary", result.summary);
            
            result.childNodes.forEach((child, index) => {
                const childX = cx + NODE_WIDTH + 100;
                const childY = cy + (index - (result.childNodes.length - 1) / 2) * (NODE_HEIGHT + 50);
                addNode(childX, childY, child.prompt, rootId, child.title);
            });

        } catch (err) {
            alert(`Failed to analyze document: ${(err as Error).message}`);
        } finally {
            if (isMountedRef.current) setIsAnalyzingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Interactions ---

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
            setIsDraggingCanvas(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            setEditingNodeId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - pan.x;
            const y = e.clientY - rect.top - pan.y;
            setMousePos({ x, y });

            if (isDraggingNode && dragNodePos) {
                const rawX = e.clientX - rect.left - pan.x - dragOffset.x;
                const rawY = e.clientY - rect.top - pan.y - dragOffset.y;
                const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
                const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
                setDragNodePos({ x: snappedX, y: snappedY });
            }
        }

        if (isDraggingCanvas) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        if (isDraggingNode && dragNodePos) {
             updateNode(isDraggingNode, { x: dragNodePos.x, y: dragNodePos.y });
        }
        setIsDraggingCanvas(false);
        setIsDraggingNode(null);
        setDragNodePos(null);
    };

    const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        e.stopPropagation();
        if (isLinkMode) {
            handleLinkClick(id);
        } else {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const node = nodes.find(n => n.id === id);
                if (node) {
                    const mouseX = e.clientX - rect.left - pan.x;
                    const mouseY = e.clientY - rect.top - pan.y;
                    setDragOffset({
                        x: mouseX - node.x,
                        y: mouseY - node.y
                    });
                    setDragNodePos({ x: node.x, y: node.y });
                    setIsDraggingNode(id);
                    setNodes(prev => [...prev.filter(n => n.id !== id), node]);
                }
            }
        }
    };

    const handleLinkClick = (nodeId: string) => {
        if (!linkStartNode) {
            setLinkStartNode(nodeId);
        } else {
            if (linkStartNode !== nodeId) {
                const exists = connections.find(c => c.fromNodeId === linkStartNode && c.toNodeId === nodeId);
                if (!exists) {
                    setConnections(prev => [...prev, {
                        id: `conn-${Date.now()}`,
                        fromNodeId: linkStartNode,
                        toNodeId: nodeId
                    }]);
                }
            }
            setLinkStartNode(null);
            setIsLinkMode(false);
        }
    };

    // --- Logic & Execution ---

    const getParentContext = (nodeId: string, visited = new Set<string>()): string => {
        if (visited.has(nodeId)) return '';
        visited.add(nodeId);

        const parentConnections = connections.filter(c => c.toNodeId === nodeId);
        let context = '';

        for (const conn of parentConnections) {
            const parent = nodes.find(n => n.id === conn.fromNodeId);
            if (parent && parent.response) {
                const grandParentContext = getParentContext(parent.id, visited);
                context += `\n--- Context from Node (Previous Step) ---\n`;
                context += grandParentContext;
                context += `\nInput: ${parent.prompt}\nResult: ${parent.response}\n`;
            }
        }
        return context;
    };

    // Main Execution Function (Handles Text, Code, Webhooks, and Loops)
    const runNode = async (nodeId: string, isRetry = false, currentPromptOverride?: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || (!node.prompt.trim() && node.nodeType !== 'webhook')) return;

        // If starting a new run (not a retry), reset retry count
        if (!isRetry && node.loopConfig) {
            updateNode(nodeId, { 
                status: 'loading', 
                response: '', 
                sources: [], 
                collapsed: false,
                loopConfig: { ...node.loopConfig, currentRetry: 0 }
            });
        } else {
             updateNode(nodeId, { status: node.loopConfig?.enabled ? 'looping' : 'loading', response: isRetry ? 'Refining response based on critique...' : '', sources: [], collapsed: false });
        }

        try {
            const context = getParentContext(nodeId);
            
            // WEBHOOK LOGIC
            if (node.nodeType === 'webhook') {
                const targetUrl = node.webhookUrl || integrationUrls.customWebhookUrl;
                if (!targetUrl) throw new Error("No Webhook URL configured.");
                
                const payload = {
                    nodeId: node.id,
                    timestamp: new Date().toISOString(),
                    prompt: node.prompt,
                    context: context,
                    // Also send attached file content if present
                    attachedFile: node.attachedFileId ? ragService.getDocumentContent(node.attachedFileId) : null
                };
                
                const result = await triggerWebhook(targetUrl, payload);
                if (isMountedRef.current) updateNode(nodeId, { status: 'success', response: result });
                return;
            }

            // AI GENERATION LOGIC
            let systemPrompt = "";
            if (node.nodeType === 'code') {
                systemPrompt = "You are an expert Python developer and Data Scientist. Your task is to write Python code to solve the user's problem, and then SIMULATE the execution of that code to provide the final answer. If the user asks for web search, generate code that would hypothetically extract keywords or process results, then use your internal search tools to act as the execution engine for that code. Always provide the Python code block first, then the execution result.";
            } else {
                systemPrompt = `You are part of a node-based reasoning chain. Use the provided context from previous steps to answer the current prompt.`;
            }

            let fileContext = "";
            if (node.attachedFileId) {
                const content = ragService.getDocumentContent(node.attachedFileId);
                const doc = availableFiles.find(f => f.id === node.attachedFileId);
                if (content) {
                    fileContext = `\n\n--- ATTACHED FILE CONTENT (${doc?.name}) ---\n${content}\n-------------------------------\n`;
                    systemPrompt += `\n\nYou have access to a file named "${doc?.name}". Use its content (JSON configurations, data lists, or text) to guide your actions.`;
                }
            }

            let injectedSearchContext = '';
            const externalSources: SearchSource[] = [];

            if (tools.tavily && apiKeys.tavily) {
                const apiKey = localStorage.getItem('tavilyApiKey') || '';
                const searchRes = await aiService.performExternalSearch(node.prompt, 'tavily', apiKey);
                injectedSearchContext += searchRes.context;
                externalSources.push(...searchRes.sources);
            }
            if (tools.exa && apiKeys.exa) {
                const apiKey = localStorage.getItem('exaApiKey') || '';
                const searchRes = await aiService.performExternalSearch(node.prompt, 'exa', apiKey);
                injectedSearchContext += searchRes.context;
                externalSources.push(...searchRes.sources);
            }
            if (tools.brave && apiKeys.brave) {
                const apiKey = localStorage.getItem('braveApiKey') || '';
                const searchRes = await aiService.performExternalSearch(node.prompt, 'brave', apiKey);
                injectedSearchContext += searchRes.context;
                externalSources.push(...searchRes.sources);
            }

            const promptToUse = currentPromptOverride || node.prompt;

            let fullPrompt = `${context}${fileContext}`;
            if (injectedSearchContext) {
                fullPrompt += `\n\n--- External Search Data ---\n${injectedSearchContext}`;
                systemPrompt += " You have access to external search results. Cite them if used.";
            }
            fullPrompt += `\n\n--- Current Task ---\n${promptToUse}`;
            
            const apiConfig = { 
                openRouterKey: localStorage.getItem('openRouterApiKey') || '', 
                ollamaUrl: localStorage.getItem('ollamaUrl') || '' 
            };

            const activeGeminiTools = {
                googleSearch: tools.googleSearch,
                googleMaps: tools.googleMaps
            };

            if (!isMountedRef.current) return;

            const result = await aiService.getChatResponse(
                'Gemini', 
                'gemini-2.5-flash', 
                [], 
                { role: 'user', parts: [{ text: fullPrompt }] },
                apiConfig,
                systemPrompt,
                activeGeminiTools
            );

            if (!isMountedRef.current) return;

            const allSources = [...externalSources, ...result.sources];
            const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());

            // LOOP / SELF-IMPROVEMENT LOGIC
            if (node.loopConfig && node.loopConfig.enabled) {
                if (node.loopConfig.currentRetry < node.loopConfig.maxRetries) {
                    if (isMountedRef.current) updateNode(nodeId, { status: 'looping' });

                    // Analyze the output
                    const critique = await aiService.optimizeNodeContent(promptToUse, result.text, node.loopConfig.critiquePrompt);
                    
                    if (!critique.pass) {
                         // Loop Fail -> Retry
                         if (isMountedRef.current) {
                            updateNode(nodeId, { 
                                response: `(Loop Attempt ${node.loopConfig.currentRetry + 1}/${node.loopConfig.maxRetries}): Critique Failed.\n\nReason: ${critique.reason}\n\nRefining Prompt and Retrying...`,
                                loopConfig: { ...node.loopConfig, currentRetry: node.loopConfig.currentRetry + 1 }
                            });
                         }
                         
                         // Recursive call with refined prompt
                         setTimeout(() => runNode(nodeId, true, critique.refinedPrompt), 1000);
                         return;
                    }
                }
            }

            updateNode(nodeId, { status: 'success', response: result.text, sources: uniqueSources });

        } catch (error) {
            if (isMountedRef.current) {
                updateNode(nodeId, { status: 'error', response: (error as Error).message });
            }
        }
    };

    // --- Rendering ---

    const renderConnections = () => {
        return connections.map(conn => {
            const from = getNodePosition(conn.fromNodeId);
            const to = getNodePosition(conn.toNodeId);
            if (!from || !to) return null;

            const startX = from.x + from.width; 
            const startY = from.y + 28;
            const endX = to.x; 
            const endY = to.y + 28;

            const dist = Math.abs(endX - startX);
            const cp1x = startX + dist * 0.5;
            const cp1y = startY;
            const cp2x = endX - dist * 0.5;
            const cp2y = endY;

            const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

            return (
                <path 
                    key={conn.id} 
                    d={d} 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    fill="none" 
                    className="text-gray-300 dark:text-gray-600" 
                    markerEnd="url(#arrowhead)"
                />
            );
        });
    };

    return (
        <div className="flex flex-col h-full relative bg-gray-900 dark:bg-black overflow-hidden">
            
             {/* Canvas Area */}
            <div 
                ref={canvasRef}
                className={`w-full h-full cursor-move relative ${isLinkMode ? 'cursor-crosshair' : ''}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div 
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px)`,
                        backgroundImage: 'radial-gradient(circle, #4b5563 1px, transparent 1px)',
                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                    }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10"
                ></div>

                <div 
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                >
                    {/* SVG Layer */}
                    <svg className="absolute overflow-visible top-0 left-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
                            </marker>
                        </defs>

                        {renderConnections()}

                        {/* Interactive Linking Line */}
                        {isLinkMode && linkStartNode && (() => {
                             const startNode = getNodePosition(linkStartNode);
                             if (!startNode) return null;
                             
                             const startX = startNode.x + startNode.width;
                             const startY = startNode.y + 28;
                             
                             const d = `M ${startX} ${startY} L ${mousePos.x} ${mousePos.y}`;
                             
                             return (
                                 <path 
                                    d={d} 
                                    stroke="#F59E0B" 
                                    strokeWidth="2" 
                                    strokeDasharray="5,5" 
                                    fill="none"
                                    markerEnd="url(#arrowhead)" 
                                 />
                             );
                        })()}
                    </svg>

                    {/* Nodes Layer */}
                    {nodes.map(nodeRaw => {
                        const isDragging = isDraggingNode === nodeRaw.id;
                        const node = isDragging && dragNodePos ? { ...nodeRaw, x: dragNodePos.x, y: dragNodePos.y } : nodeRaw;
                        
                        // Define borders based on type/status
                        let borderColor = 'border-gray-200 dark:border-gray-700';
                        if (node.status === 'loading') borderColor = 'border-yellow-400';
                        if (node.status === 'looping') borderColor = 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900';
                        if (node.status === 'success') borderColor = 'border-green-500';
                        if (node.status === 'error') borderColor = 'border-red-500';

                        return (
                        <div
                            key={node.id}
                            style={{ 
                                transform: `translate(${node.x}px, ${node.y}px)`,
                                width: node.width,
                                height: node.collapsed ? 'auto' : node.height
                            }}
                            className={`absolute flex flex-col rounded-lg border pointer-events-auto transition-shadow 
                            ${isDragging ? 'z-50 shadow-2xl opacity-90 cursor-grabbing border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'shadow-xl'}
                            ${isLinkMode && linkStartNode === node.id ? 'ring-4 ring-yellow-400' : ''} 
                            ${borderColor}
                            ${node.nodeType === 'code' ? 'bg-gray-900 text-gray-200 border-gray-700' : node.nodeType === 'webhook' ? 'bg-blue-950 dark:bg-blue-950 border-blue-700 dark:border-blue-800' : 'bg-gray-800 dark:bg-gray-900'}`}
                        >
                            {/* Node Header */}
                            <div 
                                className={`p-3 rounded-t-lg flex justify-between items-center select-none border-b 
                                ${node.nodeType === 'code' ? 'bg-gray-950 border-gray-800' : node.nodeType === 'webhook' ? 'bg-blue-900 dark:bg-blue-950 border-blue-800' : 'bg-gray-950 dark:bg-black border-gray-700 dark:border-gray-800'}
                                ${isLinkMode ? 'cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900' : 'cursor-grab active:cursor-grabbing'}`}
                                onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                            >
                                <div className="flex items-center gap-2 flex-1 mr-2 overflow-hidden">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateNode(node.id, { collapsed: !node.collapsed });
                                        }}
                                        className="text-gray-500 hover:text-indigo-600 transition-colors"
                                    >
                                        {node.collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                                    </button>
                                    
                                    {/* Node Type Toggles */}
                                    {node.nodeType === 'webhook' ? (
                                        <WebhookIcon />
                                    ) : (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateNode(node.id, { nodeType: node.nodeType === 'code' ? 'text' : 'code' });
                                                }}
                                                className={`p-1 rounded ${node.nodeType === 'code' ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                title="Toggle Code Mode"
                                            >
                                                <CodeIcon />
                                            </button>
                                            
                                            {/* Loop Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const isLooping = !!node.loopConfig?.enabled;
                                                    updateNode(node.id, { 
                                                        loopConfig: isLooping 
                                                            ? { ...node.loopConfig!, enabled: false } 
                                                            : { enabled: true, maxRetries: 3, critiquePrompt: "Check for accuracy and tone.", currentRetry: 0 } 
                                                    });
                                                }}
                                                className={`p-1 rounded ${node.loopConfig?.enabled ? 'text-purple-500 bg-purple-100 dark:bg-purple-900/50' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                title="Toggle Self-Improvement Loop"
                                            >
                                                <LoopIcon />
                                            </button>
                                        </>
                                    )}

                                    {/* Attached File Selection */}
                                    <div className="relative group">
                                        <select
                                            value={node.attachedFileId || ""}
                                            onChange={(e) => updateNode(node.id, { attachedFileId: e.target.value || undefined })}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`w-4 h-4 opacity-0 absolute inset-0 cursor-pointer z-10`}
                                            title="Attach File from Knowledge Base"
                                        >
                                            <option value="">No File</option>
                                            {availableFiles.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                        <div className={`p-1 rounded ${node.attachedFileId ? 'text-indigo-500' : 'text-gray-400'}`}>
                                            <DatabaseIcon size="sm" />
                                        </div>
                                    </div>

                                    <div className={`w-3 h-3 rounded-full shrink-0 ${node.status === 'success' ? 'bg-green-500' : node.status === 'error' ? 'bg-red-500' : node.status === 'loading' || node.status === 'looping' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                    
                                    {editingNodeId === node.id ? (
                                        <input
                                            type="text"
                                            value={node.title}
                                            onChange={(e) => updateNode(node.id, { title: e.target.value })}
                                            onBlur={() => setEditingNodeId(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingNodeId(null)}
                                            autoFocus
                                            className="w-full bg-white dark:bg-gray-600 text-sm px-1 py-0.5 rounded border border-indigo-400 focus:outline-none text-gray-900 dark:text-white"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span 
                                            className="font-semibold text-sm cursor-text truncate"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingNodeId(node.id);
                                            }}
                                            title="Double-click to rename"
                                        >
                                            {node.title}
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => removeNode(node.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                                    <XIcon />
                                </button>
                            </div>

                            {/* Node Content */}
                            {!node.collapsed && (
                                <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
                                    {node.attachedFileId && (
                                        <div className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded flex items-center gap-1">
                                            <DocumentIcon /> 
                                            <span className="truncate">Attached: {availableFiles.find(f => f.id === node.attachedFileId)?.name || 'Unknown File'}</span>
                                        </div>
                                    )}
                                    
                                    {/* Loop Config UI */}
                                    {node.loopConfig?.enabled && (
                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800 text-xs space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                    <LoopIcon /> Auto-Refine Loop
                                                </span>
                                                <div className="flex items-center gap-1">
                                                     <span className="text-purple-600 dark:text-purple-400 text-[10px] uppercase font-bold">Max Retries</span>
                                                     <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="10" 
                                                        value={node.loopConfig.maxRetries}
                                                        onChange={(e) => updateNode(node.id, { loopConfig: { ...node.loopConfig!, maxRetries: parseInt(e.target.value) || 1 } })}
                                                        className="w-12 bg-gray-900 dark:bg-gray-950 text-gray-200 border border-purple-200 dark:border-purple-700 rounded px-1 text-center focus:ring-1 focus:ring-purple-500"
                                                        onMouseDown={e => e.stopPropagation()} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold mb-1">Critique Criteria (Success Condition)</label>
                                                <textarea 
                                                    value={node.loopConfig.critiquePrompt}
                                                    onChange={(e) => updateNode(node.id, { loopConfig: { ...node.loopConfig!, critiquePrompt: e.target.value } })}
                                                    className="w-full bg-gray-900 dark:bg-gray-950 text-gray-200 border border-purple-200 dark:border-purple-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-12"
                                                    placeholder="e.g. 'Ensure the code is bug-free and handles edge cases'"
                                                    onMouseDown={e => e.stopPropagation()} 
                                                />
                                            </div>

                                            {node.status === 'looping' && (
                                                <div className="bg-purple-100 dark:bg-purple-900/40 p-1.5 rounded flex justify-between items-center text-[10px] text-purple-700 dark:text-purple-300">
                                                    <span className="animate-pulse">● Optimization in progress...</span>
                                                    <span className="font-mono">Retry {node.loopConfig.currentRetry} / {node.loopConfig.maxRetries}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Webhook Config UI */}
                                    {node.nodeType === 'webhook' && (
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-xs">
                                            <label className="block font-bold text-blue-700 dark:text-blue-300 mb-1">Target URL</label>
                                            <input 
                                                type="text"
                                                value={node.webhookUrl || ''}
                                                onChange={(e) => updateNode(node.id, { webhookUrl: e.target.value })}
                                                placeholder="https://webhook.flowise..."
                                                className="w-full p-1 bg-gray-900 dark:bg-gray-950 text-gray-200 border border-blue-300 rounded"
                                                onMouseDown={e => e.stopPropagation()} 
                                            />
                                            <div className="flex gap-2 mt-1">
                                                <button className="text-blue-600 underline" onClick={() => updateNode(node.id, { webhookUrl: integrationUrls.flowise })}>Flowise</button>
                                                <button className="text-blue-600 underline" onClick={() => updateNode(node.id, { webhookUrl: integrationUrls.activePieces })}>ActivePieces</button>
                                            </div>
                                        </div>
                                    )}

                                    <textarea 
                                        className={`w-full h-20 p-2 text-sm border rounded focus:ring-1 focus:ring-indigo-500 resize-none 
                                        ${node.nodeType === 'code' 
                                            ? 'bg-gray-900 border-gray-700 text-green-400 font-mono' 
                                            : 'bg-gray-950 dark:bg-black border-gray-700 dark:border-gray-800 text-gray-200 dark:text-gray-200'}`}
                                        placeholder={node.nodeType === 'code' ? "Describe the code logic or search task..." : node.nodeType === 'webhook' ? "Enter any additional JSON data to send..." : "Enter prompt..."}
                                        value={node.prompt}
                                        onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
                                        onMouseDown={e => e.stopPropagation()} 
                                    />
                                    
                                    <div className={`flex-1 rounded p-2 overflow-y-auto border min-h-0
                                        ${node.nodeType === 'code' 
                                            ? 'bg-black border-gray-800 text-gray-300' 
                                            : 'bg-gray-950 dark:bg-black border-gray-700 dark:border-gray-800 text-gray-200'}`}
                                    >
                                        {node.status === 'loading' || node.status === 'looping' ? (
                                            <div className="flex flex-col justify-center items-center h-full gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                                                {node.status === 'looping' && (
                                                    <div className="text-center px-2">
                                                        <span className="text-xs text-purple-500 animate-pulse block font-bold">Reviewing Output...</span>
                                                        <span className="text-[10px] text-gray-400">Checking: "{node.loopConfig?.critiquePrompt}"</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={`prose dark:prose-invert text-xs max-w-none ${node.nodeType === 'code' ? 'font-mono' : ''}`}>
                                                <p className="whitespace-pre-wrap">{node.response || <span className="opacity-50 italic">No output yet...</span>}</p>
                                                {node.sources && node.sources.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                        <p className="font-bold opacity-70 flex items-center gap-1"><SparklesIcon /> Sources</p>
                                                        <ul className="space-y-1 mt-1 opacity-80">
                                                        {node.sources.map((s, i) => (
                                                            <li key={i} className="truncate flex items-center gap-1">
                                                                {s.type === 'map' ? <MapIcon /> : <LinkIcon />}
                                                                <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{s.title}</a>
                                                            </li>
                                                        ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mt-auto">
                                        <button 
                                            onClick={() => runNode(node.id)}
                                            disabled={node.status === 'loading' || node.status === 'looping'}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <BotIcon /> Run
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Add Child Button (Absolute positioned on the right) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addNode(node.x + node.width + 50, node.y, '', node.id);
                                }}
                                className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-800 rounded-full p-1 shadow-md text-indigo-400 hover:scale-110 transition z-10"
                                title="Add Continuation Node"
                            >
                                <PlusCircleIcon />
                            </button>
                        </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto w-48">
                 <button 
                    onClick={() => addNode(-pan.x + 100, -pan.y + 100)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition"
                >
                    <PlusCircleIcon /> Add Node
                </button>

                <button 
                    onClick={() => addNode(-pan.x + 130, -pan.y + 130, '', undefined, 'Webhook', '', 'webhook')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                >
                    <WebhookIcon /> Add Webhook
                </button>

                {/* Templates Menu */}
                <div className="relative" ref={templatesMenuRef}>
                    <button 
                        onClick={() => setIsTemplatesMenuOpen(!isTemplatesMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-950 text-gray-200 dark:text-gray-200 border border-gray-700 dark:border-gray-800 rounded shadow hover:bg-gray-700 dark:hover:bg-gray-900 transition w-full justify-between"
                    >
                        <span className="flex items-center gap-2"><TemplateIcon /> Templates</span>
                        <ChevronDownIcon />
                    </button>
                    {isTemplatesMenuOpen && (
                         <div className="absolute top-full mt-2 left-0 w-72 bg-gray-900 dark:bg-black rounded-md shadow-xl border border-gray-700 dark:border-gray-800 z-30 overflow-hidden max-h-[80vh] overflow-y-auto">
                             {Object.entries(TEMPLATE_CATEGORIES).map(([category, templates]) => (
                                 <div key={category} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                     <div className="px-4 py-2 bg-gray-950 dark:bg-gray-950/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                         {category}
                                     </div>
                                     {templates.map((t, i) => (
                                         <button
                                            key={i}
                                            onClick={() => handleTemplateClick(t)}
                                            className="w-full text-left px-4 py-2 hover:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-sm text-gray-200 dark:text-gray-200 border-t border-gray-800 dark:border-gray-900 first:border-0"
                                         >
                                             <span className="font-medium flex items-center gap-2">
                                                {t.type === 'code' ? <CodeIcon /> : t.type === 'webhook' ? <WebhookIcon /> : null}
                                                {t.label}
                                                {t.loop && <LoopIcon />}
                                             </span>
                                             <span className="text-xs text-gray-500 dark:text-gray-400 truncate block mt-0.5">{t.prompt}</span>
                                         </button>
                                     ))}
                                 </div>
                             ))}
                         </div>
                    )}
                </div>

                {/* Document Analysis Button */}
                <div className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf, .txt, .md, .csv"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingDoc}
                        className={`flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-950 text-gray-200 dark:text-gray-200 border border-gray-700 dark:border-gray-800 rounded shadow hover:bg-gray-700 dark:hover:bg-gray-900 transition w-full ${isAnalyzingDoc ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isAnalyzingDoc ? (
                            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
                        ) : (
                            <DocumentIcon />
                        )}
                        {isAnalyzingDoc ? 'Analyzing...' : 'Analyze Doc'}
                    </button>
                </div>
                
                {/* Link Mode Button */}
                <button
                    onClick={() => {
                        setIsLinkMode(!isLinkMode);
                        setLinkStartNode(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded shadow transition border ${isLinkMode ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-gray-800 dark:bg-gray-950 text-gray-200 dark:text-gray-200 border-gray-700 dark:border-gray-800'}`}
                >
                    <ChainIcon /> {isLinkMode ? (linkStartNode ? 'Select Target' : 'Select Source') : 'Connect Results'}
                </button>
                
                {/* Tools Menu */}
                <div className="relative" ref={toolsMenuRef}>
                    <button 
                        onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded shadow border transition w-full justify-between ${
                            Object.values(tools).some(Boolean) 
                                ? 'bg-indigo-900 text-indigo-200 border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-gray-800 dark:bg-gray-950 text-gray-200 dark:text-gray-200 border-gray-700 dark:border-gray-800'
                        }`}
                    >
                       <span className="flex items-center gap-2"><SparklesIcon /> Tools</span>
                       <ChevronDownIcon />
                    </button>

                    {isToolsMenuOpen && (
                        <div className="absolute top-full mt-2 left-0 w-64 bg-gray-900 dark:bg-black p-3 rounded shadow-xl border border-gray-700 dark:border-gray-800 z-30">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Gemini Native</p>
                            <div className="space-y-1 mb-3">
                                <label className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <span className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"><LinkIcon /> Google Search</span>
                                    <input type="checkbox" checked={tools.googleSearch} onChange={e => setTools({...tools, googleSearch: e.target.checked})} className="rounded text-indigo-600"/>
                                </label>
                                <label className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                    <span className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"><MapIcon /> Google Maps</span>
                                    <input type="checkbox" checked={tools.googleMaps} onChange={e => setTools({...tools, googleMaps: e.target.checked})} className="rounded text-indigo-600"/>
                                </label>
                            </div>

                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700 pt-2">External Search</p>
                            <div className="space-y-1">
                                {apiKeys.tavily ? (
                                    <label className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                        <span className="text-sm text-gray-700 dark:text-gray-200">Tavily AI</span>
                                        <input type="checkbox" checked={tools.tavily} onChange={e => setTools({...tools, tavily: e.target.checked})} className="rounded text-indigo-600"/>
                                    </label>
                                ) : (
                                    <div className="p-1.5 text-xs text-gray-400 italic">Tavily Key missing</div>
                                )}

                                {apiKeys.exa ? (
                                    <label className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                        <span className="text-sm text-gray-700 dark:text-gray-200">Exa (Metaphor)</span>
                                        <input type="checkbox" checked={tools.exa} onChange={e => setTools({...tools, exa: e.target.checked})} className="rounded text-indigo-600"/>
                                    </label>
                                ) : (
                                    <div className="p-1.5 text-xs text-gray-400 italic">Exa Key missing</div>
                                )}

                                {apiKeys.brave ? (
                                    <label className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                        <span className="text-sm text-gray-700 dark:text-gray-200">Brave Search</span>
                                        <input type="checkbox" checked={tools.brave} onChange={e => setTools({...tools, brave: e.target.checked})} className="rounded text-indigo-600"/>
                                    </label>
                                ) : (
                                    <div className="p-1.5 text-xs text-gray-400 italic">Brave Key missing</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                 {/* API Gate / Cloudflare Button */}
                 <button
                    onClick={() => setShowApiGate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded shadow hover:bg-orange-700 transition"
                >
                    <ApiGateIcon /> API Gate
                </button>

            </div>

            {/* API Gate Modal */}
            {showApiGate && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 dark:bg-black p-6 rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><ApiGateIcon /> Cloudflare Workers AI Payload</h3>
                            <button onClick={() => setShowApiGate(false)}><XIcon /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            This JSON represents the current state of your graph. You can send this to a Cloudflare Worker or another API Gateway to persist or execute this workflow remotely.
                        </p>
                        <textarea 
                            className="w-full h-64 bg-gray-950 text-green-400 font-mono text-xs p-4 rounded border border-gray-700 mb-4"
                            readOnly
                            value={JSON.stringify(generateCloudflarePayload(nodes, connections), null, 2)}
                        />
                        <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(generateCloudflarePayload(nodes, connections), null, 2));
                                    alert("Copied to clipboard!");
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Copy JSON
                            </button>
                            <button onClick={() => setShowApiGate(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Close</button>
                        </div>
                    </div>
                </div>
            )}

             {/* Help Modal */}
             {showHelp && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 dark:bg-black p-6 rounded-lg shadow-2xl max-w-xl w-full border border-gray-700 dark:border-gray-800 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Graph Canvas Guide</h3>
                            <button onClick={() => setShowHelp(false)}><XIcon /></button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                            <div>
                                <h4 className="font-bold text-indigo-500 flex items-center gap-2"><LoopIcon /> Self-Improvement Loop</h4>
                                <p>
                                    Enable the loop button on a node to make the AI <strong>critique its own work</strong>.
                                    It generates a response, checks it against your criteria (e.g., "Is the code bug-free?"), and if it fails, it automatically rewrites the prompt and tries again.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-500 flex items-center gap-2"><WebhookIcon /> Webhooks</h4>
                                <p>
                                    Use Webhook nodes to send data to external automation platforms like <strong>Flowise, n8n, or ActivePieces</strong>.
                                    The node sends the current prompt and context JSON to your URL and displays the response returned by the server.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-orange-500 flex items-center gap-2"><ApiGateIcon /> API Gate</h4>
                                <p>
                                    This feature exports your entire graph structure as a JSON payload. It's designed for developers who want to run these workflows on serverless infrastructure like <strong>Cloudflare Workers AI</strong>.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 text-right">
                             <button onClick={() => setShowHelp(false)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Got it</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 z-20 flex items-start gap-2">
                 <button 
                    onClick={() => setShowHelp(true)}
                    className="bg-gray-800 dark:bg-gray-950 p-2 rounded-full shadow border border-gray-700 dark:border-gray-800 hover:bg-gray-700 dark:hover:bg-gray-900 text-indigo-400 dark:text-indigo-400"
                    title="Help & Guide"
                >
                    <QuestionMarkIcon />
                </button>
                 <div className="bg-gray-900/80 dark:bg-black/80 p-2 rounded backdrop-blur text-xs text-gray-400 pointer-events-none">
                    Pan: Drag BG | Link: "Connect Results"
                 </div>
            </div>

        </div>
    );
};

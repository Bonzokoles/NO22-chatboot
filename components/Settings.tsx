
import React, { useState, useEffect } from 'react';
import { WebhookIcon } from './icons/Icons';

export const Settings: React.FC = () => {
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [ollamaUrl, setOllamaUrl] = useState('');
    
    // External Tools
    const [tavilyKey, setTavilyKey] = useState('');
    const [exaKey, setExaKey] = useState('');
    const [braveKey, setBraveKey] = useState('');

    // Integrations
    const [flowiseUrl, setFlowiseUrl] = useState('');
    const [activePiecesUrl, setActivePiecesUrl] = useState('');
    const [langChainUrl, setLangChainUrl] = useState('');

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setOpenRouterKey(localStorage.getItem('openRouterApiKey') || '');
        setOllamaUrl(localStorage.getItem('ollamaUrl') || '');
        
        setTavilyKey(localStorage.getItem('tavilyApiKey') || '');
        setExaKey(localStorage.getItem('exaApiKey') || '');
        setBraveKey(localStorage.getItem('braveApiKey') || '');

        setFlowiseUrl(localStorage.getItem('flowiseUrl') || '');
        setActivePiecesUrl(localStorage.getItem('activePiecesUrl') || '');
        setLangChainUrl(localStorage.getItem('langChainUrl') || '');
    }, []);

    const handleSave = () => {
        setSaveStatus('saving');
        localStorage.setItem('openRouterApiKey', openRouterKey);
        localStorage.setItem('ollamaUrl', ollamaUrl);
        
        localStorage.setItem('tavilyApiKey', tavilyKey);
        localStorage.setItem('exaApiKey', exaKey);
        localStorage.setItem('braveApiKey', braveKey);

        localStorage.setItem('flowiseUrl', flowiseUrl);
        localStorage.setItem('activePiecesUrl', activePiecesUrl);
        localStorage.setItem('langChainUrl', langChainUrl);

        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <h2 className="text-xl font-semibold">Settings</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    
                    {/* LLM Providers */}
                    <div className="bg-white dark:bg-gray-900 p-6 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                            LLM Providers
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="openrouter-key" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    OpenRouter API Key
                                </label>
                                <input
                                    type="password"
                                    id="openrouter-key"
                                    value={openRouterKey}
                                    onChange={(e) => setOpenRouterKey(e.target.value)}
                                    placeholder="sk-or-..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    For accessing models like GPT-4, Claude, and Llama via <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">OpenRouter</a>.
                                </p>
                            </div>
                            <div>
                                <label htmlFor="ollama-url" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    Local Server URL (Ollama / LM Studio)
                                </label>
                                <input
                                    type="text"
                                    id="ollama-url"
                                    value={ollamaUrl}
                                    onChange={(e) => setOllamaUrl(e.target.value)}
                                    placeholder="http://localhost:11434"
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Base URL for your local OpenAI-compatible server.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Integrations */}
                    <div className="bg-white dark:bg-gray-900 p-6 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                            <WebhookIcon /> Integrations & Automation
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Configure global webhook URLs for graph nodes to trigger external automation.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    Flowise Webhook URL
                                </label>
                                <input
                                    type="text"
                                    value={flowiseUrl}
                                    onChange={(e) => setFlowiseUrl(e.target.value)}
                                    placeholder="https://flowise.your-domain.com/api/v1/prediction/..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    ActivePieces / n8n Webhook URL
                                </label>
                                <input
                                    type="text"
                                    value={activePiecesUrl}
                                    onChange={(e) => setActivePiecesUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    LangChain / Custom API URL
                                </label>
                                <input
                                    type="text"
                                    value={langChainUrl}
                                    onChange={(e) => setLangChainUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* External Search Tools */}
                    <div className="bg-white dark:bg-gray-900 p-6 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                            External Search Tools
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Add keys here to enable deep search capabilities in the Graph Canvas.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="tavily-key" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    Tavily API Key
                                </label>
                                <input
                                    type="password"
                                    id="tavily-key"
                                    value={tavilyKey}
                                    onChange={(e) => setTavilyKey(e.target.value)}
                                    placeholder="tvly-..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="exa-key" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    Exa (Metaphor) API Key
                                </label>
                                <input
                                    type="password"
                                    id="exa-key"
                                    value={exaKey}
                                    onChange={(e) => setExaKey(e.target.value)}
                                    placeholder="Exa API Key..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="brave-key" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                                    Brave Search API Key
                                </label>
                                <input
                                    type="password"
                                    id="brave-key"
                                    value={braveKey}
                                    onChange={(e) => setBraveKey(e.target.value)}
                                    placeholder="BSA..."
                                    className="mt-1 block w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 transition-colors shadow-md"
                            disabled={saveStatus === 'saving'}
                        >
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Settings Saved!' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
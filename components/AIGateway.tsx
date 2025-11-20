
import React, { useState } from 'react';

export const AIGateway: React.FC = () => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const testConnection = async () => {
    setStatus('connecting');
    try {
      // Placeholder for actual gateway connection logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('connected');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
          AI Gateway (Port 6441)
        </h2>
        <p className="text-gray-400 mt-2">Configure and manage AI service endpoints and routing</p>
      </header>

      <div className="flex-1 space-y-6">
        <div className="bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Gateway Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Endpoint URL</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.example.com/gateway"
                className="w-full p-3 bg-gray-950 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full p-3 bg-gray-950 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={testConnection}
              disabled={!endpoint || status === 'connecting'}
              className="w-full p-3 bg-indigo-600 text-white disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
            >
              {status === 'connecting' ? 'Testing Connection...' : 'Test Connection'}
            </button>

            {status === 'connected' && (
              <div className="p-3 bg-green-900/30 border border-green-700 text-green-400 rounded">
                ✓ Gateway connected successfully
              </div>
            )}
            {status === 'error' && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-400 rounded">
                ✗ Connection failed
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Active Routes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-950 rounded">
              <span className="text-gray-300">/api/chat</span>
              <span className="text-indigo-400">Gemini 2.5 Pro</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-950 rounded">
              <span className="text-gray-300">/api/embeddings</span>
              <span className="text-indigo-400">Gemini Embedding 004</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-950 rounded">
              <span className="text-gray-300">/api/search</span>
              <span className="text-indigo-400">Tavily + Brave</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

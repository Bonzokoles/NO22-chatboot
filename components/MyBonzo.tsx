
import React, { useState } from 'react';

export const MyBonzo: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.open(`https://www.mybonzo.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black">
      <header className="p-6 bg-gray-950 border-b border-gray-800">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 mb-4">
          MyBonzo Hub (Port 6445)
        </h2>
        <p className="text-gray-400 mb-4">Integration gateway to www.mybonzo.com and external AI services</p>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search MyBonzo..."
            className="flex-1 p-3 bg-gray-800 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Search
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Quick Links</h3>
            <div className="space-y-2">
              <a href="https://www.mybonzo.com" target="_blank" rel="noopener noreferrer" 
                 className="block p-3 bg-gray-950 hover:bg-gray-900 text-indigo-400 hover:text-indigo-300 transition-colors rounded">
                → MyBonzo Homepage
              </a>
              <a href="https://www.mybonzo.com/dashboard" target="_blank" rel="noopener noreferrer"
                 className="block p-3 bg-gray-950 hover:bg-gray-900 text-indigo-400 hover:text-indigo-300 transition-colors rounded">
                → Dashboard
              </a>
              <a href="https://www.mybonzo.com/api" target="_blank" rel="noopener noreferrer"
                 className="block p-3 bg-gray-950 hover:bg-gray-900 text-indigo-400 hover:text-indigo-300 transition-colors rounded">
                → API Documentation
              </a>
            </div>
          </div>

          <div className="bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">External AI Services</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-950 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 font-medium">Google Gemini</span>
                  <span className="text-green-400 text-sm">● Connected</span>
                </div>
                <p className="text-sm text-gray-400">Multi-modal AI with grounding</p>
              </div>
              <div className="p-3 bg-gray-950 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 font-medium">OpenRouter</span>
                  <span className="text-green-400 text-sm">● Connected</span>
                </div>
                <p className="text-sm text-gray-400">Access to GPT-4, Claude, Llama</p>
              </div>
              <div className="p-3 bg-gray-950 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 font-medium">Tavily Search</span>
                  <span className="text-yellow-400 text-sm">○ Configurable</span>
                </div>
                <p className="text-sm text-gray-400">AI-optimized web search</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">MyBonzo Preview</h3>
            <div className="bg-gray-950 rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <iframe
                src="https://www.mybonzo.com"
                className="w-full h-full border-0"
                title="MyBonzo Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

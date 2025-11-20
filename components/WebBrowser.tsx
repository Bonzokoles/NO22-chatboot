
import React, { useState } from 'react';

export const WebBrowser: React.FC = () => {
  const [url, setUrl] = useState('https://www.mybonzo.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.mybonzo.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigate = () => {
    setIsLoading(true);
    setCurrentUrl(url);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black">
      <header className="p-4 bg-gray-950 border-b border-gray-800">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 mb-3">
          Web Browser (Port 6444)
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter URL..."
            className="flex-1 p-3 bg-gray-800 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleNavigate}
            className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Go
          </button>
        </div>
      </header>

      <div className="flex-1 bg-white relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
            <div className="text-white text-lg">Loading...</div>
          </div>
        )}
        <iframe
          src={currentUrl}
          className="w-full h-full border-0"
          title="Web Browser"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

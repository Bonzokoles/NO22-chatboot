
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { Transcriber } from './components/Transcriber';
import { Settings } from './components/Settings';
import { GraphCanvas } from './components/GraphCanvas';
import { KnowledgeBase } from './components/KnowledgeBase';
import { AIGateway } from './components/AIGateway';
import { Agents } from './components/Agents';
import { Traffic } from './components/Traffic';
import { WebBrowser } from './components/WebBrowser';
import { MyBonzo } from './components/MyBonzo';
import type { Mode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = localStorage.getItem('theme');
      return (storedTheme as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const renderContent = () => {
    switch (mode) {
      case 'chat':
        return <Chat />;
      case 'graph-canvas':
        return <GraphCanvas />;
      case 'knowledge-base':
        return <KnowledgeBase />;
      case 'image-analyzer':
        return <ImageAnalyzer />;
      case 'transcriber':
        return <Transcriber />;
      case 'settings':
        return <Settings />;
      case 'ai-gateway':
        return <AIGateway />;
      case 'agents':
        return <Agents />;
      case 'traffic':
        return <Traffic />;
      case 'web-browser':
        return <WebBrowser />;
      case 'mybonzo':
        return <MyBonzo />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar activeMode={mode} setMode={setMode} theme={theme} setTheme={setTheme} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
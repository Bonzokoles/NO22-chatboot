
import React, { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  task: string;
  progress: number;
}

export const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([
    { id: '1', name: 'Research Agent', status: 'idle', task: 'Web scraping and analysis', progress: 0 },
    { id: '2', name: 'Code Generator', status: 'idle', task: 'Generate and optimize code', progress: 0 },
    { id: '3', name: 'Data Analyst', status: 'idle', task: 'Process and analyze datasets', progress: 0 },
  ]);

  const startAgent = (id: string) => {
    setAgents(agents.map(a => 
      a.id === id ? { ...a, status: 'running' as const, progress: 0 } : a
    ));
    
    // Simulate progress
    const interval = setInterval(() => {
      setAgents(current => current.map(a => {
        if (a.id === id && a.status === 'running') {
          const newProgress = Math.min(a.progress + 10, 100);
          return {
            ...a,
            progress: newProgress,
            status: newProgress === 100 ? 'completed' as const : 'running' as const
          };
        }
        return a;
      }));
    }, 500);

    setTimeout(() => clearInterval(interval), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
          AI Agents (Port 6442)
        </h2>
        <p className="text-gray-400 mt-2">Autonomous agents for complex multi-step tasks</p>
      </header>

      <div className="flex-1 space-y-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">{agent.name}</h3>
                <p className="text-sm text-gray-400">{agent.task}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm ${
                  agent.status === 'idle' ? 'bg-gray-700 text-gray-300' :
                  agent.status === 'running' ? 'bg-blue-900 text-blue-300' :
                  agent.status === 'completed' ? 'bg-green-900 text-green-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {agent.status.toUpperCase()}
                </span>
                <button
                  onClick={() => startAgent(agent.id)}
                  disabled={agent.status === 'running'}
                  className="px-4 py-2 bg-indigo-600 text-white disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
                >
                  Start
                </button>
              </div>
            </div>

            {agent.status === 'running' || agent.status === 'completed' ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Progress</span>
                  <span>{agent.progress}%</span>
                </div>
                <div className="w-full bg-gray-950 h-2 rounded">
                  <div 
                    className="bg-indigo-600 h-2 rounded transition-all duration-300"
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

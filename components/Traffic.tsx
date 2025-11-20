
import React, { useState, useEffect } from 'react';

interface TrafficData {
  timestamp: string;
  requests: number;
  latency: number;
  status: 'success' | 'error';
}

export const Traffic: React.FC = () => {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);

  useEffect(() => {
    // Simulate real-time traffic data
    const interval = setInterval(() => {
      const newData: TrafficData = {
        timestamp: new Date().toLocaleTimeString(),
        requests: Math.floor(Math.random() * 100) + 1,
        latency: Math.floor(Math.random() * 500) + 50,
        status: Math.random() > 0.1 ? 'success' : 'error'
      };

      setTrafficData(prev => [...prev.slice(-9), newData]);
      setTotalRequests(t => t + newData.requests);
      setAvgLatency(prev => Math.round((prev * 0.9 + newData.latency * 0.1)));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900 dark:bg-black p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
          Traffic Monitor (Port 6443)
        </h2>
        <p className="text-gray-400 mt-2">Real-time API traffic and performance metrics</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-indigo-400">{totalRequests}</div>
        </div>
        <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Avg Latency</div>
          <div className="text-3xl font-bold text-green-400">{avgLatency}ms</div>
        </div>
        <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Success Rate</div>
          <div className="text-3xl font-bold text-blue-400">94.2%</div>
        </div>
      </div>

      <div className="flex-1 bg-gray-800 dark:bg-gray-900 p-6 rounded-lg border border-gray-700 overflow-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Live Traffic Log</h3>
        <div className="space-y-2">
          {trafficData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-950 rounded text-sm">
              <span className="text-gray-400">{data.timestamp}</span>
              <span className="text-gray-300">{data.requests} requests</span>
              <span className="text-gray-300">{data.latency}ms</span>
              <span className={`px-2 py-1 rounded ${
                data.status === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                {data.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

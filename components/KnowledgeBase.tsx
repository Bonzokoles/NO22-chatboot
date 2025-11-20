
import React, { useState, useRef } from 'react';
import { ragService } from '../services/ragService';
import { UploadIcon, DocumentIcon, XIcon, CheckCircleIcon, AlertCircleIcon, SettingsIcon, SearchIcon } from './icons/Icons';
import { RAGDocument } from '../types';

interface UploadItem {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
}

export const KnowledgeBase: React.FC = () => {
    const [documents, setDocuments] = useState<RAGDocument[]>(ragService.getDocuments());
    const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
    const [dragActive, setDragActive] = useState(false);
    
    // Configuration State
    const [chunkSize, setChunkSize] = useState<number>(1000);
    const [chunkOverlap, setChunkOverlap] = useState<number>(100);
    const [showSettings, setShowSettings] = useState(false);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateItemStatus = (id: string, updates: Partial<UploadItem>) => {
        setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        // Basic Validation
        if (chunkOverlap >= chunkSize) {
            alert("Error: Chunk Overlap must be smaller than Chunk Size.");
            return;
        }

        // Create queue items
        const newItems: UploadItem[] = Array.from(files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            progress: 0,
            status: 'pending'
        }));

        setUploadQueue(prev => [...prev, ...newItems]);

        // Process files sequentially to avoid rate limiting issues
        for (const item of newItems) {
            const isSupported = item.file.type.startsWith('text/') || 
                                item.file.name.match(/\.(md|json|js|ts|csv|txt|tsx|jsx)$/i);
            
            if (!isSupported) {
                updateItemStatus(item.id, { status: 'error', error: 'Unsupported file type' });
                continue;
            }

            updateItemStatus(item.id, { status: 'processing', progress: 0 });
            
            try {
                await ragService.addDocument(
                    item.file, 
                    (progress) => {
                        updateItemStatus(item.id, { progress });
                    },
                    chunkSize,
                    chunkOverlap
                );
                updateItemStatus(item.id, { status: 'completed', progress: 100 });
                setDocuments([...ragService.getDocuments()]);
            } catch (e) {
                updateItemStatus(item.id, { status: 'error', error: (e as Error).message });
            }
        }
    };

    const handleDelete = (id: string) => {
        ragService.removeDocument(id);
        setDocuments([...ragService.getDocuments()]);
    };

    const clearCompletedUploads = () => {
        setUploadQueue(prev => prev.filter(item => item.status !== 'completed'));
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const filteredDocuments = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Knowledge Base (Local RAG)</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Upload text documents to create a vector database for context-aware answers.
                    </p>
                </div>
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-md transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    title="Processing Settings"
                >
                    <SettingsIcon />
                </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* Settings Panel */}
                {showSettings && (
                    <div className="mb-6 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Chunk Size (Tokens/Chars)
                            </label>
                            <input 
                                type="number" 
                                value={chunkSize}
                                onChange={(e) => setChunkSize(parseInt(e.target.value) || 1000)}
                                className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Larger chunks provide more context but consume more tokens.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Overlap
                            </label>
                            <input 
                                type="number" 
                                value={chunkOverlap}
                                onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
                                className={`w-full p-2 bg-gray-50 dark:bg-gray-800 border rounded text-sm focus:ring-indigo-500 focus:border-indigo-500 ${chunkOverlap >= chunkSize ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                             {chunkOverlap >= chunkSize ? (
                                <p className="text-xs text-red-500 mt-1">Overlap must be smaller than Chunk Size.</p>
                             ) : (
                                <p className="text-xs text-gray-500 mt-1">Ensures context isn't lost between chunks.</p>
                             )}
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
                        dragActive 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <UploadIcon className="h-10 w-10 mb-2" />
                        <p className="font-medium">Click or Drag files here to upload</p>
                        <p className="text-xs mt-1">Batch upload supported</p>
                    </div>
                </div>

                {/* Upload Queue / Progress */}
                {uploadQueue.length > 0 && (
                    <div className="mb-6 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Upload Queue</h3>
                            <button 
                                onClick={clearCompletedUploads} 
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Clear Completed
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                            {uploadQueue.map(item => (
                                <div key={item.id} className="p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                                            {item.file.name}
                                        </span>
                                        <span className="text-xs flex items-center gap-1">
                                            {item.status === 'completed' && <span className="text-green-600 flex items-center gap-1"><CheckCircleIcon /> Done</span>}
                                            {item.status === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircleIcon /> Failed</span>}
                                            {item.status === 'processing' && <span className="text-indigo-500">Embedding... {item.progress}%</span>}
                                            {item.status === 'pending' && <span className="text-gray-400">Pending</span>}
                                        </span>
                                    </div>
                                    {(item.status === 'processing' || item.status === 'pending') && (
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-full transition-all duration-300" 
                                                style={{ width: `${item.progress}%` }}
                                            ></div>
                                        </div>
                                    )}
                                    {item.error && (
                                        <p className="text-xs text-red-500 mt-1">{item.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Document List */}
                <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">Indexed Documents ({documents.length})</h3>
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Filter documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                    </div>
                    {documents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                            No documents indexed yet. Upload some files to get started.
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                            No documents match your filter.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredDocuments.map(doc => (
                                <li key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded text-indigo-600 dark:text-indigo-300">
                                            <DocumentIcon />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {(doc.size / 1024).toFixed(1)} KB • {doc.chunks} vectors • {new Date(doc.uploadDate).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-gray-400 hover:text-red-500 p-2"
                                        title="Remove document"
                                    >
                                        <XIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

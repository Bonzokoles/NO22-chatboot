import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { fileToGenerativePart } from '../utils/fileUtils';
import { UploadIcon } from './icons/Icons';

export const ImageAnalyzer: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
       setError(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleSubmit = async () => {
    if (!image || !prompt.trim()) {
      setError('Please provide both an image and a prompt.');
      return;
    }

    setIsLoading(true);
    setResponse('');
    setError(null);

    try {
      const imagePart = await fileToGenerativePart(image);
      const result = await analyzeImage(prompt, imagePart);
      setResponse(result);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError('Failed to analyze the image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-xl font-semibold">Image Analyzer (gemini-2.5-flash)</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="flex flex-col gap-4 bg-white dark:bg-gray-900 p-6">
            <div 
                className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-center p-4 cursor-pointer hover:border-indigo-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="Image preview" className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="text-gray-500 dark:text-gray-400">
                        <UploadIcon className="mx-auto h-12 w-12"/>
                        <p>Click to upload or drag & drop an image</p>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to know about the image?"
                className="w-full p-3 bg-gray-200 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition h-28 resize-none"
                disabled={isLoading}
            />
            <button
                onClick={handleSubmit}
                disabled={isLoading || !image || !prompt.trim()}
                className="w-full p-3 bg-indigo-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors font-semibold"
            >
                {isLoading ? 'Analyzing...' : 'Analyze Image'}
            </button>
            {error && <p className="text-red-500 text-center">{error}</p>}
        </div>

        {/* Right Panel */}
        <div className="bg-white dark:bg-gray-900 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Analysis Result</h3>
            {isLoading ? (
                 <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-t-indigo-500 border-gray-300 dark:border-gray-600 animate-spin"></div>
                </div>
            ) : response ? (
                <div className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
                    <p className="whitespace-pre-wrap">{response}</p>
                </div>
            ) : (
                <div className="text-gray-400 dark:text-gray-500 text-center pt-10">
                    <p>The analysis result will appear here.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicIcon, StopIcon } from './icons/Icons';

// Helper functions for audio encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const Transcriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Idle. Press Start to begin transcription.');
  const [transcription, setTranscription] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus('Recording stopped. Press Start to begin again.');
    
    // If there is lingering text, add it. Note: inside a cleanup callback, 
    // state might be stale, but this is primarily for user action stop.
    setCurrentLine((prev) => {
        if(prev.trim()) setTranscription(t => [...t, prev]);
        return '';
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (isRecordingRef.current) {
            // Manually tear down resources without triggering state updates that might warn
            if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close());
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        }
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    isRecordingRef.current = true;
    setTranscription([]);
    setCurrentLine('');
    setStatus('Requesting microphone access...');

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setStatus('Connecting to Gemini...');
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;

      sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
              onopen: () => {
                setStatus('Microphone is active. Start speaking...');
                const source = inputAudioContext.createMediaStreamSource(stream);
                mediaStreamSourceRef.current = source;

                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    if (sessionPromiseRef.current) {
                       sessionPromiseRef.current.then((session) => {
                         session.sendRealtimeInput({ media: pcmBlob });
                       });
                    }
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
              },
              onmessage: (message: LiveServerMessage) => {
                  if (message.serverContent?.inputTranscription) {
                      const text = message.serverContent.inputTranscription.text;
                      setCurrentLine(prev => prev + text);
                  }
                  if (message.serverContent?.turnComplete) {
                      setCurrentLine(prev => {
                          if(prev.trim()) {
                            setTranscription(t => [...t, prev.trim()]);
                          }
                          return '';
                      });
                  }
              },
              onerror: (e: ErrorEvent) => {
                  console.error('API Error:', e);
                  setStatus(`Error: ${e.message}. Please try again.`);
                  stopRecording();
              },
              onclose: () => {
                  setStatus('Connection closed.');
              },
          },
          config: {
              responseModalities: [Modality.AUDIO], // required, but we won't process audio out
              inputAudioTranscription: {},
          },
      });

    } catch (error) {
        console.error('Failed to start recording:', error);
        setStatus(`Failed to start: ${(error as Error).message}`);
        stopRecording();
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-xl font-semibold">Real-time Audio Transcriber</h2>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-6 shadow-lg">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-300 mb-2">Live Transcription:</h3>
          <div className="min-h-[150px] bg-gray-100 dark:bg-gray-700 p-4 text-gray-800 dark:text-gray-200 prose dark:prose-invert">
            {transcription.map((line, i) => <p key={i}>{line}</p>)}
            <p className="text-indigo-600 dark:text-indigo-400">{currentLine}</p>
          </div>
        </div>
        <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{status}</p>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-6 font-semibold text-white transition-all duration-300 flex items-center justify-center space-x-3 text-lg ${
                isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {isRecording ? <StopIcon /> : <MicIcon />}
                <span>{isRecording ? 'Stop' : 'Start'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};


export type ChatPart = 
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
  sources?: SearchSource[];
}

export interface SearchSource {
  uri: string;
  title: string;
  type: 'web' | 'map' | 'file';
}

export type Mode = 'chat' | 'image-analyzer' | 'transcriber' | 'settings' | 'graph-canvas' | 'knowledge-base' | 'ai-gateway' | 'agents' | 'traffic' | 'web-browser' | 'mybonzo';

export type Provider = 'Gemini' | 'OpenRouter' | 'Ollama';

export interface Model {
    id: string;
    name: string;
    provider: Provider;
}

// --- Graph Mode Types ---

export interface LoopConfig {
  enabled: boolean;
  maxRetries: number;
  critiquePrompt: string; // e.g. "Check if the code has bugs"
  currentRetry: number;
}

export interface GraphNodeData {
  id: string;
  x: number;
  y: number;
  title: string;
  prompt: string;
  response: string;
  status: 'idle' | 'loading' | 'success' | 'error' | 'looping';
  sources?: SearchSource[];
  width: number;
  height: number;
  collapsed: boolean;
  attachedFileId?: string; // Link to a specific file in KnowledgeBase
  nodeType: 'text' | 'code' | 'webhook'; // Added webhook
  webhookUrl?: string; // Specific URL for webhook nodes
  loopConfig?: LoopConfig; // Self-improvement loop settings
}

export interface GraphConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

// --- RAG Types ---

export interface RAGDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: number;
  chunks: number;
}

export interface RAGChunk {
  docId: string;
  text: string;
  embedding: number[];
}

// --- Integration Types ---

export interface IntegrationConfig {
  flowiseUrl: string;
  activePiecesUrl: string;
  langChainUrl: string;
  customWebhookUrl: string;
}
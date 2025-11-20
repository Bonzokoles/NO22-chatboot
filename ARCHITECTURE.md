# Application Architecture

## 📂 Project Structure

```
/
├── index.html          # Entry point
├── App.tsx             # Main Router & Global State (Theme, Mode)
├── types.ts            # TypeScript definitions for Models, Nodes, Messages
├── components/         # UI Components
│   ├── Chat.tsx        # Main Chat Interface (State: Messages, Inputs)
│   ├── GraphCanvas.tsx # Node System (State: Nodes, Connections, Pan/Zoom)
│   ├── KnowledgeBase.tsx # RAG Interface (Uploads, List)
│   ├── Settings.tsx    # API Key Management (LocalStorage)
│   ├── Sidebar.tsx     # Navigation
│   └── icons/          # SVG Icon collection
├── services/           # Business Logic & API Calls
│   ├── geminiService.ts # Google GenAI, OpenRouter, & Search API logic
│   └── ragService.ts    # Local Vector Store, Embeddings, Cosine Similarity
└── utils/
    └── fileUtils.ts    # Helpers for Base64 conversion
```

## 🧠 Key Logic Flows

### 1. The Chat System (`Chat.tsx` -> `geminiService.ts`)
*   **User Input**: Captured in `Chat.tsx`.
*   **Processing**:
    *   If **Tools** (Maps/Search) are active, `geminiService` constructs a tool-enabled request.
    *   If **Knowledge Base** is active, `ragService.search(query)` is called first. The context is prepended to the user prompt hiddenly.
*   **Execution**: `getChatResponse` routes the request to the correct provider (Gemini SDK, fetch for OpenRouter/Ollama).

### 2. The Graph System (`GraphCanvas.tsx`)
*   **State**: `nodes` array and `connections` array.
*   **Execution (`runNode`)**:
    1.  **Context Building**: Recursively finds parent nodes (`fromNodeId`) and gathers their `response` text.
    2.  **Tool Injection**: If external search (Tavily/Exa) is on, it fetches data *before* calling the LLM.
    3.  **Prompt Construction**: `[Parent Context] + [File Context] + [Search Results] + [Current Prompt]`.
    4.  **LLM Call**: Sends the massive prompt to Gemini.

### 3. The RAG System (`ragService.ts`)
*   **Client-Side Only**: This app does not use a Python backend (Pinecone/Chroma). It uses an **in-memory array**.
*   **Process**:
    1.  `addDocument`: text -> chunks -> `gemini-embedding-004` -> vector array.
    2.  `search`: query -> embedding -> cosine similarity against array -> top K chunks.

## 🎨 Styling
*   **Tailwind CSS**: Used for all styling.
*   **Dark Mode**: Handled via a `dark` class on the `<html>` tag. Components use `dark:bg-gray-900` variants to adapt.

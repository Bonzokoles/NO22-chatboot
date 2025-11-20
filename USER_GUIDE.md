
# User Guide

## 💬 Chat Interface

The Chat is your primary command center.

### Choosing a Model
1.  **Provider**: Select **Gemini** for the best multimodal experience, **OpenRouter** for external models (Claude, GPT-4), or **Ollama** for local privacy.
2.  **Model**: Use the dropdown to search for specific models. For Ollama, type the model name manually (e.g., `llama3`).

### Using Tools
Click the **Tools (Sparkles)** button to enable capabilities:
*   **Google Search**: Gives the AI access to current web results.
*   **Google Maps**: Allows the AI to find real-world locations.
*   **Knowledge Base**: Forces the AI to read your uploaded documents before answering.

### Attachments
*   **Files**: Click the paperclip to attach images or audio (Gemini only).
*   **Multimodal**: You can ask questions like "What is in this image?" or "Summarize this audio file."

---

## 🕸️ Graph Canvas (The "Noodle" System)

A powerful workspace for complex tasks, code generation, and workflows.

### Basic Controls
*   **Add Node**: Click the **+ Add Node** button or use the sidebar.
*   **Connect**: Drag from the **(+)** circle on a node's right edge to create a child node. The child inherits the parent's output.
*   **Link Results**: Click **Connect Results** in the toolbar, click a Source Node, then click a Target Node to merge contexts.
*   **Help**: Click the **(?)** icon in the top right corner for a quick feature overview.

### Advanced Agentic Features

#### 🔄 Self-Improvement Loop
This feature allows the AI to check its own work before showing it to you.
1.  Click the **Loop Icon** (arrows) on a node header.
2.  Enter a **Critique Prompt** (e.g., "Ensure the code is secure" or "Check for factual accuracy").
3.  When you run the node, the AI will generate an answer, critique it, and if it fails, it will automatically refine its prompt and try again (up to 3 times).

#### 🔗 Webhooks & Integration
Connect your graph to external automation tools like **Flowise**, **n8n**, or **ActivePieces**.
1.  Click **Add Webhook** in the toolbar.
2.  Enter the **Target URL** of your external workflow webhook.
3.  When the node runs, it sends the current Prompt and Context to that URL.
4.  The response from your external tool is displayed in the node output.
*Tip: You can save default URLs in the **Settings** tab.*

#### 🐍 Code Mode
1.  Click the `{ }` icon on a node header.
2.  This instructs the AI to act as a Python Developer/Data Scientist.
3.  Use this for tasks involving logic, math, or simulation.

#### 📂 Document Analysis
1.  Click **Analyze Doc** to upload a PDF/Text file.
2.  The system will generate a Summary Node and automatic Child Nodes with key questions.
3.  **Attaching Files**: You can also manually attach a specific file from your Knowledge Base to any single node using the Database icon on the node header.

---

## 📚 Knowledge Base (RAG)

1.  Go to the **Knowledge Base** tab.
2.  **Drag & Drop** text files, markdown, JSON, or code files.
3.  The system processes them (chunks and embeds them) in your browser's memory.
4.  **Usage**:
    *   In **Chat**: Enable the "Knowledge Base" tool.
    *   In **Graph**: Select the file from the dropdown on a specific node.

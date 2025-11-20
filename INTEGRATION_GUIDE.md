# Integration Guide

## 🏠 Connecting Local AI (Ollama / LM Studio)

You can use this app with models running on your own machine for total privacy and zero cost.

### 1. Prepare Ollama
By default, browsers block requests to local servers due to CORS. You must configure Ollama to allow them.

**Mac / Linux:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

### 2. Configure the App
1.  Go to **Settings** in the sidebar.
2.  Under **Local Server URL**, enter: `http://localhost:11434` (or your specific port).
3.  Click **Save**.
4.  In **Chat**, select Provider: **Ollama**.
5.  Type your model name (e.g., `mistral`, `llama3`, `gemma`).

---

## 🌐 Connecting OpenRouter

Access top-tier models like GPT-4o, Claude 3.5 Sonnet, and Llama 3.1 405B.

1.  Get an API Key from [openrouter.ai/keys](https://openrouter.ai/keys).
2.  Go to **Settings** in the app.
3.  Paste the key into **OpenRouter API Key**.
4.  Click **Save**.

---

## 🔍 Connecting External Search Tools

To enable "Deep Search" in the Graph Canvas, you can connect specialized search APIs.

1.  **Tavily**: Optimized for AI agents. Get key from [tavily.com](https://tavily.com).
2.  **Exa (Metaphor)**: Neural search. Get key from [exa.ai](https://exa.ai).
3.  **Brave Search**: Privacy-focused web search. Get key from [brave.com](https://api.search.brave.com/).

**Usage:**
Once keys are saved in Settings, go to **Graph Canvas** -> **Tools Menu**. You will see checkboxes to enable these search providers for your nodes.

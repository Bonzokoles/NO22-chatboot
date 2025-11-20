# Gemini Multi-Modal AI Suite

An advanced web application showcasing the capabilities of the Gemini API, Local AI integration, and Node-based reasoning. This application acts as a unified interface for text, image, audio, and complex workflows.

## 🚀 Quick Start

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Set Environment Variables**
    Create a `.env` file in the root directory (if not using a cloud coding environment that handles this automatically):
    ```
    API_KEY=your_google_gemini_api_key
    ```

3.  **Run the Application**
    ```bash
    npm run dev
    ```

## 🌟 Key Features

*   **Multi-Provider Chat**: Switch between Google Gemini, OpenRouter, and local Ollama models.
*   **Graph Canvas ("Noodles")**: A node-based interface for chaining prompts, generating code, and visualizing thought processes.
*   **Knowledge Base (RAG)**: Upload local files to create a vector database for context-aware answers.
*   **Deep Search**: Integration with Google Search, Google Maps, Tavily, Exa, and Brave for real-time data.
*   **Multimodal**: Support for Images and Audio input/output.

## 📚 Documentation

*   [User Guide](./USER_GUIDE.md) - How to use the features.
*   [Integration Guide](./INTEGRATION_GUIDE.md) - Connecting Ollama, OpenRouter, and Search Tools.
*   [Architecture](./ARCHITECTURE.md) - Code structure and logic explanation.
*   [Customization](./CUSTOMIZATION.md) - Styling and theming guide.

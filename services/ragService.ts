
import { GoogleGenAI } from "@google/genai";
import { RAGDocument, RAGChunk, SearchSource } from "../types";

// --- Vector Math Utilities ---

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    // Guard against division by zero
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

// --- RAG Service ---

class RAGService {
    private documents: RAGDocument[] = [];
    private chunks: RAGChunk[] = [];
    
    // Simple text chunker
    private chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
        const chunks: string[] = [];
        let start = 0;
        // Ensure overlap is not greater than chunk size to prevent infinite loops
        const safeOverlap = Math.min(overlap, chunkSize - 1);
        
        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));
            start += chunkSize - safeOverlap;
        }
        return chunks;
    }

    public getDocuments(): RAGDocument[] {
        return this.documents;
    }

    // Retrieve full content of a document by ID
    public getDocumentContent(docId: string): string | null {
        // Reconstruct content from chunks (assuming sequential order, which they are pushed as)
        const docChunks = this.chunks.filter(c => c.docId === docId);
        if (docChunks.length === 0) return null;
        
        // Note: This simple reconstruction might have overlaps. 
        // Ideally, we store the full raw text in RAGDocument or handle overlap removal.
        // For this implementation, we will join with a newline separator for context.
        return docChunks.map(c => c.text).join('\n');
    }

    public async addDocument(
        file: File, 
        onProgress?: (progress: number) => void,
        chunkSize: number = 1000,
        chunkOverlap: number = 100
    ): Promise<void> {
        if (!process.env.API_KEY) throw new Error("API Key required for embedding.");
        
        // Security/Performance Guard: Limit file size (e.g., 10MB) to prevent browser crash
        const MAX_SIZE = 10 * 1024 * 1024; 
        if (file.size > MAX_SIZE) {
            throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 10MB.`);
        }

        const text = await file.text();
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const textChunks = this.chunkText(text, chunkSize, chunkOverlap);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = "text-embedding-004";

        const newChunks: RAGChunk[] = [];
        let processedCount = 0;

        // Report 0% starting
        if (onProgress) onProgress(0);

        for (const chunkText of textChunks) {
            const result = await ai.models.embedContent({
                model: model,
                content: { parts: [{ text: chunkText }] }
            });
            
            if (result.embedding?.values) {
                newChunks.push({
                    docId: docId,
                    text: chunkText,
                    embedding: result.embedding.values
                });
            }
            processedCount++;
            if (onProgress) {
                const percent = Math.round((processedCount / textChunks.length) * 100);
                onProgress(percent);
            }
        }

        this.chunks.push(...newChunks);
        this.documents.push({
            id: docId,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadDate: Date.now(),
            chunks: newChunks.length
        });
    }

    public removeDocument(docId: string) {
        this.documents = this.documents.filter(d => d.id !== docId);
        this.chunks = this.chunks.filter(c => c.docId !== docId);
    }

    public async search(query: string, topK: number = 3): Promise<{ context: string; sources: SearchSource[] }> {
        if (this.chunks.length === 0) return { context: "", sources: [] };
        if (!process.env.API_KEY) throw new Error("API Key required for search.");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.embedContent({
            model: "text-embedding-004",
            content: { parts: [{ text: query }] }
        });

        const queryEmbedding = result.embedding?.values;
        if (!queryEmbedding) return { context: "", sources: [] };

        // Calculate similarities
        const scoredChunks = this.chunks.map(chunk => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));

        // Sort and retrieve top K
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, topK);

        const context = topChunks.map(sc => sc.chunk.text).join("\n\n...\n\n");
        
        // Map back to document names for sources
        const sources: SearchSource[] = topChunks.map(sc => {
            const doc = this.documents.find(d => d.id === sc.chunk.docId);
            return {
                uri: '#', // Local file, no URI
                title: doc ? `${doc.name} (Similarity: ${sc.score.toFixed(2)})` : 'Local Document',
                type: 'file'
            };
        });

        return { context, sources };
    }
}

export const ragService = new RAGService();

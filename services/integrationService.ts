
import { GraphNodeData, GraphConnection } from "../types";

export const triggerWebhook = async (
    url: string, 
    payload: any
): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return `Webhook Error: ${response.status} ${response.statusText}`;
        }

        // Try to parse JSON response, otherwise return text
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            // If it's a complex object, stringify it for the node output
            if (typeof json === 'object') return JSON.stringify(json, null, 2);
            return String(json);
        } catch {
            return text;
        }
    } catch (e) {
        if ((e as Error).name === 'AbortError') {
            return 'Error: Webhook timed out after 30 seconds.';
        }
        return `Failed to trigger webhook: ${(e as Error).message}`;
    }
};

// --- AI Gate / Cloudflare Output ---

export const generateCloudflarePayload = (nodes: GraphNodeData[], connections: GraphConnection[]) => {
    // Formats the graph into a standardized JSON schema for AI Gates / Workers
    return {
        version: "1.0",
        timestamp: new Date().toISOString(),
        graph: {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.nodeType,
                inputs: { prompt: n.prompt, file: n.attachedFileId },
                outputs: { response: n.response, status: n.status },
                meta: { x: n.x, y: n.y, title: n.title }
            })),
            edges: connections.map(c => ({
                source: c.fromNodeId,
                target: c.toNodeId
            }))
        },
        // Add compatibility fields for standard agent protocols if needed
        agentProtocol: "noodle-graph-v1"
    };
};

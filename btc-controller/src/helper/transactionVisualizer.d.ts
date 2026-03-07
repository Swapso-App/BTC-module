export interface VisualizationNode {
    id: string;
    label: string;
    group: 'transaction' | 'address' | 'input' | 'output';
    details?: any;
}
export interface VisualizationEdge {
    from: string;
    to: string;
    label?: string;
    value?: number;
    arrows?: string;
    color?: {
        color: string;
    };
}
export interface VisualizationData {
    nodes: VisualizationNode[];
    edges: VisualizationEdge[];
    summary: {
        txid: string;
        fee: number;
        size: number;
        weight: number;
        confirmed: boolean;
        time?: string;
        totalInput: number;
        totalOutput: number;
    };
}
export declare class TransactionVisualizer {
    private apiBaseUrl;
    constructor(network?: 'MAINNET' | 'TESTNET');
    /**
     * Fetches transaction data and constructs a visualization graph.
     * @param txId The transaction ID (hash) to analyze.
     * @returns VisualizationData object compatible with Vis.js
     */
    analyzeTransaction(txId: string): Promise<VisualizationData>;
}

import axios from 'axios';

interface TxInput {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  };
  scriptsig: string;
  scriptsig_asm: string;
  witness: string[];
  is_coinbase: boolean;
  sequence: number;
}

interface TxOutput {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
}

interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TxInput[];
  vout: TxOutput[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface VisualizationNode {
  id: string;
  label: string;
  group: 'transaction' | 'address' | 'input' | 'output';
  details?: any; // Additional info for tooltip
}

export interface VisualizationEdge {
  from: string;
  to: string;
  label?: string; // Value or index
  value?: number; // Visual weight
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

export class TransactionVisualizer {
  private apiBaseUrl: string;

  constructor(network: 'MAINNET' | 'TESTNET' = 'MAINNET') {
    this.apiBaseUrl = network === 'TESTNET' 
      ? 'https://mempool.space/testnet/api' 
      : 'https://mempool.space/api';
  }

  /**
   * Fetches transaction data and constructs a visualization graph.
   * @param txId The transaction ID (hash) to analyze.
   * @returns VisualizationData object compatible with Vis.js
   */
  async analyzeTransaction(txId: string): Promise<VisualizationData> {
    try {
      const response = await axios.get<Transaction>(`${this.apiBaseUrl}/tx/${txId}`);
      const tx = response.data;
      
      const nodes: VisualizationNode[] = [];
      const edges: VisualizationEdge[] = [];
      
      // Central Node: The Transaction itself
      nodes.push({
        id: tx.txid,
        label: `TX\n${tx.txid.substring(0, 8)}...`,
        group: 'transaction',
        details: {
          fullHash: tx.txid,
          fee: tx.fee,
          size: tx.size,
          weight: tx.weight,
          confirmed: tx.status.confirmed,
          blockTime: tx.status.block_time ? new Date(tx.status.block_time * 1000).toLocaleString() : 'Pending'
        }
      });

      let totalInput = 0;
      let totalOutput = 0;

      // Process Inputs (VIN)
      tx.vin.forEach((input, index) => {
        let address = 'Unknown';
        let amount = 0;

        if (input.is_coinbase) {
          // Coinbase inputs have no real sender — add a synthetic node and edge
          const coinbaseNodeId = `coinbase-${index}-${tx.txid}`;
          nodes.push({
            id: coinbaseNodeId,
            label: 'Coinbase\n(New Coins)',
            group: 'input',
            details: { coinbase: true, sequence: input.sequence }
          });
          edges.push({
            from: coinbaseNodeId,
            to: tx.txid,
            label: 'Coinbase',
            arrows: 'to',
            color: { color: '#aaaaff' }
          });
        } else if (input.prevout) {
          address = input.prevout.scriptpubkey_address || 'Unknown Address';
          amount = input.prevout.value;
          totalInput += amount;

          // Create a node for the Sender Address (deduped by address)
          const addressNodeId = `addr-${address}`;
          if (!nodes.find(n => n.id === addressNodeId)) {
             nodes.push({
               id: addressNodeId,
               label: `${address.substring(0, 8)}...`,
               group: 'address',
               details: { address: address }
             });
          }
          
          // Edge from Address to Transaction
          edges.push({
            from: addressNodeId,
            to: tx.txid,
            label: `${(amount / 100000000).toFixed(8)} BTC`,
            value: amount,
            arrows: 'to',
            color: { color: '#ffaaaa' } // Inlet color
          });
        }
      });

      // Process Outputs (VOUT)
      tx.vout.forEach((output) => {
        const address = output.scriptpubkey_address || 'OP_RETURN / Unparsed';
        const amount = output.value;
        totalOutput += amount;
        
        const existingNode = nodes.find(n => n.id === `addr-${address}`);
        const targetId = existingNode ? existingNode.id : `addr-${address}`;

        if (!existingNode) {
          nodes.push({
             id: targetId,
             label: `${address.substring(0, 6)}...`,
             group: 'address',
             details: { address: address }
          });
        }

        edges.push({
          from: tx.txid,
          to: targetId,
          label: `${(amount / 100000000).toFixed(8)} BTC`,
          value: amount,
          arrows: 'to',
          color: { color: '#aaffaa' } // Outlet color
        });
      });

      return {
        nodes,
        edges,
        summary: {
          txid: tx.txid,
          fee: tx.fee,
          size: tx.size,
          weight: tx.weight,
          confirmed: tx.status.confirmed,
          time: tx.status.block_time ? new Date(tx.status.block_time * 1000).toLocaleString() : 'Pending',
          totalInput,
          totalOutput
        }
      };

    } catch (error: any) {
      console.error("Error analyzing transaction:", error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze transaction: ${msg}`);
    }
  }
}

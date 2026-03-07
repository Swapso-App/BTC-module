const assert = require('assert');
const { TransactionVisualizer } = require('../src/index');
const axios = require('axios');

describe('TransactionVisualizer', () => {
    let visualizer;
    let originalAxiosGet;

    beforeEach(() => {
        visualizer = new TransactionVisualizer('MAINNET');
        originalAxiosGet = axios.get;
    });

    afterEach(() => {
        axios.get = originalAxiosGet;
    });

    it('should be instantiated correctly', () => {
        assert(visualizer instanceof TransactionVisualizer);
    });

    it('should analyze a transaction (mocked)', async () => {
        const mockTx = {
            data: {
                txid: 'mock_txid',
                version: 1,
                locktime: 0,
                vin: [
                    {
                        is_coinbase: false,
                        prevout: {
                            scriptpubkey_address: 'bc1qsender',
                            value: 50000
                        }
                    }
                ],
                vout: [
                    {
                        scriptpubkey_address: 'bc1qreceiver',
                        value: 40000
                    }
                ],
                size: 200,
                weight: 800,
                fee: 1000,
                status: { confirmed: true, block_time: 1600000000 }
            }
        };

        // Mock axios.get
        axios.get = async (url) => {
            if (url.includes('mock_txid')) return mockTx;
            throw new Error('Unexpected URL call');
        };

        const result = await visualizer.analyzeTransaction('mock_txid');
        
        assert.strictEqual(result.summary.txid, 'mock_txid');
        assert.strictEqual(result.summary.fee, 1000);
        
        // Check nodes
        const txNode = result.nodes.find(n => n.group === 'transaction');
        assert(txNode, 'Transaction node should exist');
        
        const senderNode = result.nodes.find(n => n.id === 'addr-bc1qsender');
        assert(senderNode, 'Sender address node should exist');
        
        const receiverNode = result.nodes.find(n => n.id === 'addr-bc1qreceiver');
        assert(receiverNode, 'Receiver address node should exist');
        
        // Check edges
        assert.strictEqual(result.edges.length, 2, 'Should have 2 edges (input -> tx -> output)');
    });
});

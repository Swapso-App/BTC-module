'use strict';

const assert = require('assert');
const { TransactionVisualizer } = require('../src/index');
const axios = require('axios');

// ─────────────────────────────────────────────────────────────────── //
// Shared helpers
// ─────────────────────────────────────────────────────────────────── //

function buildTx(overrides = {}) {
    return {
        txid: 'mock_txid',
        version: 1,
        locktime: 0,
        vin: [
            {
                is_coinbase: false,
                prevout: {
                    scriptpubkey_address: 'bc1qsender',
                    value: 50000,
                },
                sequence: 4294967295,
            },
        ],
        vout: [
            {
                scriptpubkey_address: 'bc1qreceiver',
                value: 40000,
            },
        ],
        size: 200,
        weight: 800,
        fee: 1000,
        status: { confirmed: true, block_time: 1600000000 },
        ...overrides,
    };
}

function mockGet(visualizer, txData) {
    axios.get = async (url) => {
        if (url.includes(txData.txid)) return { data: txData };
        throw new Error(`Unexpected URL: ${url}`);
    };
}

// ─────────────────────────────────────────────────────────────────── //
// Suite
// ─────────────────────────────────────────────────────────────────── //

describe('TransactionVisualizer', () => {
    let originalAxiosGet;

    beforeEach(() => {
        originalAxiosGet = axios.get;
    });

    afterEach(() => {
        axios.get = originalAxiosGet;
    });

    // ──────── constructor ──────── //
    describe('constructor', () => {
        it('instantiates with MAINNET by default', () => {
            const v = new TransactionVisualizer();
            assert(v instanceof TransactionVisualizer);
        });

        it('instantiates with MAINNET when specified', () => {
            const v = new TransactionVisualizer('MAINNET');
            assert(v instanceof TransactionVisualizer);
        });

        it('instantiates with TESTNET when specified', () => {
            const v = new TransactionVisualizer('TESTNET');
            assert(v instanceof TransactionVisualizer);
        });
    });

    // ──────── analyzeTransaction — basic flow ──────── //
    describe('analyzeTransaction', () => {

        it('returns summary with correct txid, fee, size, weight', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx();
            mockGet(visualizer, tx);

            const result = await visualizer.analyzeTransaction('mock_txid');

            assert.strictEqual(result.summary.txid, 'mock_txid');
            assert.strictEqual(result.summary.fee, 1000);
            assert.strictEqual(result.summary.size, 200);
            assert.strictEqual(result.summary.weight, 800);
        });

        it('confirmed=true is reflected in summary', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx({ status: { confirmed: true, block_time: 1600000000 } }));
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.strictEqual(result.summary.confirmed, true);
        });

        it('includes a transaction node', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx());
            const result = await visualizer.analyzeTransaction('mock_txid');

            const txNode = result.nodes.find(n => n.group === 'transaction');
            assert(txNode, 'Transaction node should exist');
            assert.strictEqual(txNode.id, 'mock_txid');
        });

        it('creates a sender address node and an input->tx edge', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx());
            const result = await visualizer.analyzeTransaction('mock_txid');

            const senderNode = result.nodes.find(n => n.id === 'addr-bc1qsender');
            assert(senderNode, 'Sender address node should exist');

            const inputEdge = result.edges.find(e => e.from === 'addr-bc1qsender');
            assert(inputEdge, 'Edge from sender to tx should exist');
            assert.strictEqual(inputEdge.to, 'mock_txid');
        });

        it('creates a receiver address node and a tx->output edge', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx());
            const result = await visualizer.analyzeTransaction('mock_txid');

            const receiverNode = result.nodes.find(n => n.id === 'addr-bc1qreceiver');
            assert(receiverNode, 'Receiver address node should exist');

            const outputEdge = result.edges.find(e => e.to === 'addr-bc1qreceiver');
            assert(outputEdge, 'Edge from tx to receiver should exist');
            assert.strictEqual(outputEdge.from, 'mock_txid');
        });

        it('produces exactly 2 edges for a 1-in 1-out transaction', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx());
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.strictEqual(result.edges.length, 2);
        });

        it('accumulates totalInput and totalOutput in summary', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx());
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.strictEqual(result.summary.totalInput, 50000);
            assert.strictEqual(result.summary.totalOutput, 40000);
        });

        it('deduplicates address node when same address is sender and receiver', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vin: [{
                    is_coinbase: false,
                    prevout: { scriptpubkey_address: 'bc1qshared', value: 10000 },
                    sequence: 0,
                }],
                vout: [{ scriptpubkey_address: 'bc1qshared', value: 9000 }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');

            const sharedNodes = result.nodes.filter(n => n.id === 'addr-bc1qshared');
            assert.strictEqual(sharedNodes.length, 1, 'Same address should appear only once as a node');
        });

        it('sets time to "Pending" when block_time is absent', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({ status: { confirmed: false } });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.strictEqual(result.summary.time, 'Pending');
        });

        it('sets time to a formatted string when block_time is present', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            mockGet(visualizer, buildTx({ status: { confirmed: true, block_time: 1600000000 } }));
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.ok(typeof result.summary.time === 'string' && result.summary.time !== 'Pending');
        });
    });

    // ──────── coinbase input handling ──────── //
    describe('coinbase inputs', () => {

        it('creates a coinbase node for a coinbase transaction', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vin: [{ is_coinbase: true, sequence: 4294967295 }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');

            const coinbaseNode = result.nodes.find(n => n.group === 'input');
            assert(coinbaseNode, 'Coinbase node should be created');
            assert(/coinbase/i.test(coinbaseNode.label), 'Coinbase node should have "Coinbase" label');
        });

        it('creates a coinbase->tx edge for a coinbase transaction', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vin: [{ is_coinbase: true, sequence: 4294967295 }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');

            const coinbaseEdge = result.edges.find(e => e.to === 'mock_txid' && e.label === 'Coinbase');
            assert(coinbaseEdge, 'Coinbase->tx edge should exist');
        });

        it('does not include coinbase amount in totalInput', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vin: [{ is_coinbase: true, sequence: 4294967295 }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');
            assert.strictEqual(result.summary.totalInput, 0);
        });
    });

    // ──────── OP_RETURN / missing address outputs ──────── //
    describe('OP_RETURN outputs', () => {

        it('handles outputs without scriptpubkey_address (OP_RETURN)', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vout: [{ scriptpubkey: '6a...', value: 0 /* no scriptpubkey_address */ }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');

            const opReturnNode = result.nodes.find(n => n.id === 'addr-OP_RETURN / Unparsed');
            assert(opReturnNode, 'OP_RETURN node should be created');
        });
    });

    // ──────── inputs without scriptpubkey_address ──────── //
    describe('input without scriptpubkey_address', () => {

        it('falls back to "Unknown Address" when input prevout has no scriptpubkey_address', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            const tx = buildTx({
                vin: [{
                    is_coinbase: false,
                    // prevout exists but no scriptpubkey_address field
                    prevout: { value: 20000 },
                    sequence: 0,
                }],
            });
            mockGet(visualizer, tx);
            const result = await visualizer.analyzeTransaction('mock_txid');

            const unknownNode = result.nodes.find(n => n.id === 'addr-Unknown Address');
            assert(unknownNode, 'Unknown Address node should be created when address is missing');
        });
    });

    // ──────── error handling ──────── //
    describe('error handling', () => {

        it('throws "Failed to analyze transaction" when axios.get rejects', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            axios.get = async () => { throw new Error('Network failure'); };

            await assert.rejects(
                () => visualizer.analyzeTransaction('mock_txid'),
                /Failed to analyze transaction/
            );
        });

        it('wraps non-Error throws in a descriptive message', async () => {
            const visualizer = new TransactionVisualizer('MAINNET');
            axios.get = async () => { throw 'plain string error'; };

            await assert.rejects(
                () => visualizer.analyzeTransaction('mock_txid'),
                /Failed to analyze transaction/
            );
        });
    });

    // ──────── TESTNET URL ──────── //
    describe('TESTNET mode', () => {

        it('uses the testnet mempool.space URL for TESTNET', async () => {
            const visualizer = new TransactionVisualizer('TESTNET');
            let capturedUrl = '';
            axios.get = async (url) => {
                capturedUrl = url;
                return { data: buildTx() };
            };

            await visualizer.analyzeTransaction('mock_txid');
            assert.ok(capturedUrl.includes('testnet'), `Expected testnet URL, got: ${capturedUrl}`);
        });
    });
});


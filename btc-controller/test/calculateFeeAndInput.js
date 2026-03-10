'use strict';

const assert = require('assert');
const nock   = require('nock');
const { getTransactionSize, getFeeAndInput } = require('../src/helper/calculateFeeAndInput');

const TARGET_ADDRESS = 'tb1qcen5y7uvp3r9y0c4l4c55hlaks8gef54pr6v68';
const NETWORK        = 'TESTNET';
const API_BASE       = 'https://app.swapso.io';

// ─────────────────────────────────────────────────────────────────── //
// Shared mock data
// ─────────────────────────────────────────────────────────────────── //
const SINGLE_OUTPUT = [
    {
        value: '0.001',   // → sb.toSatoshi(0.001) = 100 000 sats
        script: '0014c669a3fa381f0b2d03b5f58ea8d1ade58a1073a9',
        tx_hex: 'rawtxhex',
        hash: 'a'.repeat(64),
        index: 0,
    },
];

function mockUnspent(outputs) {
    nock(API_BASE)
        .get('/api/bitcoin/unspent')
        .query(true)
        .reply(200, { data: { outputs } });
}

// ─────────────────────────────────────────────────────────────────── //
// Suite
// ─────────────────────────────────────────────────────────────────── //
describe('calculateFeeAndInput', () => {

    afterEach(() => {
        nock.cleanAll();
    });

    // ──────── getTransactionSize ──────── //
    describe('getTransactionSize', () => {

        it('returns the correct transactionSize for 1 UTXO (formula: 1×148 + 2×34 + 10 = 226)', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { transactionSize } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            assert.strictEqual(transactionSize, 226);
        });

        it('converts UTXO value to satoshis correctly (0.001 BTC → 100 000 sats)', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { totalAmountAvailable } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            assert.strictEqual(totalAmountAvailable, 100000);
        });

        it('returns a non-empty inputs array', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { inputs } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            assert.ok(Array.isArray(inputs));
            assert.strictEqual(inputs.length, 1);
        });

        it('maps UTXO fields (txid, vout, value, scriptPubKey) onto each input correctly', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { inputs } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            const utxo = inputs[0];
            assert.strictEqual(utxo.txid, 'a'.repeat(64));
            assert.strictEqual(utxo.vout, 0);
            assert.strictEqual(utxo.value, 100000);
            assert.strictEqual(utxo.scriptPubKey, SINGLE_OUTPUT[0].script);
        });

        it('accumulates totalAmountAvailable across multiple UTXOs', async () => {
            const twoOutputs = [
                { ...SINGLE_OUTPUT[0], hash: 'b'.repeat(64), index: 0 },
                { value: '0.002', script: '76a914...88ac', tx_hex: '...', hash: 'c'.repeat(64), index: 1 },
            ];
            mockUnspent(twoOutputs);
            const { inputs, totalAmountAvailable } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            assert.strictEqual(inputs.length, 2);
            assert.strictEqual(totalAmountAvailable, 300000);   // 100k + 200k
        });

        it('calculates transactionSize correctly for 2 UTXOs (formula: 2×148 + 2×34 + 10 = 374)', async () => {
            const twoOutputs = [
                { ...SINGLE_OUTPUT[0], hash: 'b'.repeat(64) },
                { ...SINGLE_OUTPUT[0], hash: 'c'.repeat(64) },
            ];
            mockUnspent(twoOutputs);
            const { transactionSize } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            // Standard P2PKH formula: inputCount * 148 + outputCount * 34 + 10
            // 2*148 + 2*34 + 10 = 296 + 68 + 10 = 374
            assert.strictEqual(transactionSize, 374);
        });

        it('rejects when the API returns a 500 error', async () => {
            nock(API_BASE)
                .get('/api/bitcoin/unspent')
                .query(true)
                .reply(500, { error: 'server error' });
            await assert.rejects(() => getTransactionSize(TARGET_ADDRESS, NETWORK));
        });

        it('passes the address and network as query parameters to the API', async () => {
            // Use explicit query matching to verify the params are forwarded
            nock(API_BASE)
                .get('/api/bitcoin/unspent')
                .query({ address: TARGET_ADDRESS, network: NETWORK })
                .reply(200, { data: { outputs: SINGLE_OUTPUT } });
            const { transactionSize } = await getTransactionSize(TARGET_ADDRESS, NETWORK);
            assert.strictEqual(transactionSize, 226);
        });

    });

    // ──────── getFeeAndInput ──────── //
    describe('getFeeAndInput', () => {

        it('calculates fee as transactionSize × satPerByte', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const satPerByte = 20;
            const { fee, transactionSize } = await getFeeAndInput(TARGET_ADDRESS, NETWORK, satPerByte);
            assert.strictEqual(fee, transactionSize * satPerByte);
        });

        it('returns fee = 0 when satPerByte is 0', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { fee } = await getFeeAndInput(TARGET_ADDRESS, NETWORK, 0);
            assert.strictEqual(fee, 0);
        });

        it('returns fee = transactionSize for satPerByte = 1', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { fee, transactionSize } = await getFeeAndInput(TARGET_ADDRESS, NETWORK, 1);
            assert.strictEqual(fee, transactionSize);
        });

        it('returns correct totalAmountAvailable and inputs', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { totalAmountAvailable, inputs } = await getFeeAndInput(TARGET_ADDRESS, NETWORK, 10);
            assert.strictEqual(totalAmountAvailable, 100000);
            assert.ok(inputs.length > 0);
        });

        it('returns the correct transactionSize from the underlying getTransactionSize call', async () => {
            mockUnspent(SINGLE_OUTPUT);
            const { transactionSize } = await getFeeAndInput(TARGET_ADDRESS, NETWORK, 5);
            assert.strictEqual(transactionSize, 226);
        });

    });

});

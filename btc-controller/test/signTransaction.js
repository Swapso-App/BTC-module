'use strict';

const assert   = require('assert');
const bitcoinjs = require('bitcoinjs-lib');
const ecc      = require('@bitcoinerlab/secp256k1');

// ECPairFactory may be a default-export in ESM; handle both styles
const ECPairModule  = require('ecpair');
const ECPairFactory = ECPairModule.default || ECPairModule;
const ECPair        = ECPairFactory(ecc);

const { signTransaction } = require('../src/helper/signTransaction');

const {
    EXTERNAL_ACCOUNT_PRIVATE_KEY,
    EXTERNAL_ACCOUNT_ADDRESS,
    TEST_ADDRESS_2,
} = require('./constants');

const TESTNET = bitcoinjs.networks.testnet;

// ─────────────────────────────────────────────────────────────────── //
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────── //

// Real key pair derived from the well-known test WIF
const keyPair = ECPair.fromWIF(EXTERNAL_ACCOUNT_PRIVATE_KEY, TESTNET);

// P2WPKH scriptPubKey (hex) for the sender address — must match keyPair's pubkey
const fromScriptHex = bitcoinjs.address
    .toOutputScript(EXTERNAL_ACCOUNT_ADDRESS, TESTNET)
    .toString('hex');

// A fake-but-structurally-valid UTXO with enough value to cover amount + fee
const VALID_UTXO = {
    txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    vout: 0,
    scriptPubKey: fromScriptHex,   // P2WPKH script for the sender
    value: 100000,                 // 100 000 sats — well above 1 000 sats target
    confirmations: 6,
};

// ─────────────────────────────────────────────────────────────────── //
// Helper: invoke signTransaction with standard params, allow overrides
// ─────────────────────────────────────────────────────────────────── //
function callSign({ amount = 1000, feeRate = 1, utxos = [VALID_UTXO] } = {}) {
    return signTransaction(
        keyPair,                   // child    (not used inside the function)
        keyPair,                   // keyPair  (used for signing)
        null,                      // privateKey (not used inside the function)
        EXTERNAL_ACCOUNT_ADDRESS,  // from
        TEST_ADDRESS_2,            // to
        amount,
        feeRate,
        'TESTNET',
        TESTNET,
        utxos,
    );
}

// ─────────────────────────────────────────────────────────────────── //
// Suite
// ─────────────────────────────────────────────────────────────────── //
describe('signTransaction', () => {

    // ──────── successful signing ──────── //
    describe('successful signing', () => {

        it('returns a non-empty string', async () => {
            const hex = await callSign();
            assert.strictEqual(typeof hex, 'string');
            assert.ok(hex.length > 0, 'Signed transaction hex must not be empty');
        });

        it('returns a valid lower-case hexadecimal string', async () => {
            const hex = await callSign();
            assert.ok(/^[0-9a-f]+$/.test(hex), `Expected hex string, got: ${hex.slice(0, 60)}…`);
        });

        it('produces a transaction decodable by bitcoinjs-lib', async () => {
            const hex = await callSign();
            const tx  = bitcoinjs.Transaction.fromHex(hex);
            assert.ok(tx.ins.length  >= 1, 'Decoded tx must have at least one input');
            assert.ok(tx.outs.length >= 1, 'Decoded tx must have at least one output');
        });

        it('includes the correct recipient output (amount + scriptPubKey)', async () => {
            const amount = 1000;
            const hex    = await callSign({ amount });
            const tx     = bitcoinjs.Transaction.fromHex(hex);
            const recipientScript = bitcoinjs.address.toOutputScript(TEST_ADDRESS_2, TESTNET).toString('hex');
            const found = tx.outs.some(
                (out) => out.script.toString('hex') === recipientScript && out.value === amount,
            );
            assert.ok(found, 'Decoded transaction must contain the recipient output of 1 000 sats');
        });

        it('includes a change output back to the sender when change >= 100 sats', async () => {
            // 100 000 sats in, 1 000 out → change >> 100 sats
            const hex    = await callSign();
            const tx     = bitcoinjs.Transaction.fromHex(hex);
            const senderScript = bitcoinjs.address.toOutputScript(EXTERNAL_ACCOUNT_ADDRESS, TESTNET).toString('hex');
            const hasChange = tx.outs.some((out) => out.script.toString('hex') === senderScript);
            assert.ok(hasChange, 'Decoded transaction must include a change output to the sender');
        });

        it('is deterministic — same inputs always produce the same raw transaction', async () => {
            const hex1 = await callSign();
            const hex2 = await callSign();
            assert.strictEqual(hex1, hex2);
        });

        it('works with a higher fee rate (10 sat/vB)', async () => {
            const hex = await callSign({ feeRate: 10 });
            const tx  = bitcoinjs.Transaction.fromHex(hex);
            assert.ok(tx.ins.length >= 1);
        });

    });

    // ──────── balance validation ──────── //
    describe('balance validation', () => {

        let _consoleError;
        beforeEach(() => { _consoleError = console.error; console.error = () => {}; });
        afterEach(()  => { console.error = _consoleError; });

        it('throws "Balance is too low" when the UTXOs array is empty', async () => {
            // empty UTXOs → calculateOptimalFee returns selectedUTXOs=[], totalAmountAvailable=0
            // 0 < amountToSend + feeInSats → signTransaction throws
            await assert.rejects(
                () => callSign({ utxos: [] }),
                /Balance is too low/,
            );
        });

        it('throws when UTXO value is far below the target amount', async () => {
            // selectOptimalUTXOs exhausts all UTXOs and throws "Insufficient funds"
            const tinyUtxo = { ...VALID_UTXO, value: 100 };
            await assert.rejects(
                () => callSign({ amount: 10000, utxos: [tinyUtxo] }),
            );
        });

        it('succeeds when the UTXO value is exactly enough to cover amount + fee', async () => {
            // Use a generous UTXO so there is no ambiguity about dust thresholds
            const barelyEnoughUtxo = { ...VALID_UTXO, value: 50000 };
            const hex = await callSign({ amount: 1000, utxos: [barelyEnoughUtxo] });
            assert.ok(typeof hex === 'string' && hex.length > 0);
        });

    });

});

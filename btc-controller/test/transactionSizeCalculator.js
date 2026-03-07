'use strict';

const assert = require('assert');
// esModuleInterop default export
const BitcoinTransactionSizeCalculator = require('../src/helper/utils/transactionSizeCalculator').default;

// ─────────────────────────────────────────────────────────────────── //
// Helper: build a minimal UTXO with no scriptPubKey (falls back to
// senderAddress / default 'P2WPKH' assumption inside the calculator)
// ─────────────────────────────────────────────────────────────────── //
function makeUtxo(value) {
    return {
        txid: 'a'.repeat(64),
        vout: 0,
        value,
        confirmations: 6,
    };
}

// Mainnet P2WPKH address (length 42, bc1q prefix)
const P2WPKH_ADDR = 'bc1q' + 'a'.repeat(38);   // 4 + 38 = 42 chars
// Mainnet P2TR address  (length 62, bc1p prefix)
const P2TR_ADDR   = 'bc1p' + 'a'.repeat(58);   // 4 + 58 = 62 chars

describe('BitcoinTransactionSizeCalculator', () => {

    // ─────────────────────── getAddressType ──────────────────────── //
    describe('getAddressType', () => {

        it('returns "P2WPKH" for a bc1q address of length 42', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getAddressType(P2WPKH_ADDR), 'P2WPKH');
        });

        it('returns "P2TR" for a bc1p address of length 62', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getAddressType(P2TR_ADDR), 'P2TR');
        });

        it('returns "P2SH" for an address starting with "3"', () => {
            assert.strictEqual(
                BitcoinTransactionSizeCalculator.getAddressType('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'),
                'P2SH'
            );
        });

        it('returns "P2PKH" for an address starting with "1"', () => {
            assert.strictEqual(
                BitcoinTransactionSizeCalculator.getAddressType('1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf'),
                'P2PKH'
            );
        });

        it('returns "P2WSH" for a bc1q address longer than 42 chars (native segwit script)', () => {
            // bc1q prefix but length 62 ≠ 42 — falls through bc1q check, then bc1 length > 42 → P2WSH
            const p2wshAddr = 'bc1q' + 'a'.repeat(58);  // length 62
            assert.strictEqual(BitcoinTransactionSizeCalculator.getAddressType(p2wshAddr), 'P2WSH');
        });

        it('returns "UNKNOWN" for a testnet bech32 address (tb1 prefix)', () => {
            assert.strictEqual(
                BitcoinTransactionSizeCalculator.getAddressType('tb1qw3rs6lte05ej6rzm86sd4rg6vt9ss27shx5z8q'),
                'UNKNOWN'
            );
        });

        it('returns "UNKNOWN" for an empty string', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getAddressType(''), 'UNKNOWN');
        });

        it('returns "UNKNOWN" for an arbitrary unrecognised string', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getAddressType('notanaddress'), 'UNKNOWN');
        });

    });

    // ─────────────────────── getInputWeight ──────────────────────── //
    describe('getInputWeight', () => {

        it('returns 592 for P2PKH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('P2PKH'), 592);
        });

        it('returns 640 for P2SH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('P2SH'), 640);
        });

        it('returns 272 for P2WPKH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('P2WPKH'), 272);
        });

        it('returns 272 for P2WSH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('P2WSH'), 272);
        });

        it('returns 230 for P2TR', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('P2TR'), 230);
        });

        it('falls back to 592 (P2PKH) for "UNKNOWN"', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('UNKNOWN'), 592);
        });

        it('falls back to 592 for an unrecognised type string', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getInputWeight('FOOBAR'), 592);
        });

    });

    // ─────────────────────── getOutputWeight ─────────────────────── //
    describe('getOutputWeight', () => {

        it('returns 136 for P2PKH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('P2PKH'), 136);
        });

        it('returns 128 for P2SH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('P2SH'), 128);
        });

        it('returns 124 for P2WPKH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('P2WPKH'), 124);
        });

        it('returns 172 for P2WSH', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('P2WSH'), 172);
        });

        it('returns 172 for P2TR', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('P2TR'), 172);
        });

        it('falls back to 136 for "UNKNOWN"', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('UNKNOWN'), 136);
        });

        it('falls back to 136 for an unrecognised type string', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.getOutputWeight('FOOBAR'), 136);
        });

    });

    // ──────────────── estimateTransactionSize ────────────────────── //
    describe('estimateTransactionSize', () => {

        it('returns the hardcoded fallback when UTXOs is null', () => {
            const est = BitcoinTransactionSizeCalculator.estimateTransactionSize(null, 2);
            assert.strictEqual(est.size, 140);
            assert.strictEqual(est.weight, 560);
            assert.strictEqual(est.vBytes, 140);
            assert.strictEqual(est.inputCount, 1);
            assert.strictEqual(est.outputCount, 2);
            assert.deepStrictEqual(est.inputTypes, ['P2WPKH']);
        });

        it('returns the hardcoded fallback when UTXOs array is empty', () => {
            const est = BitcoinTransactionSizeCalculator.estimateTransactionSize([], 2);
            assert.strictEqual(est.vBytes, 140);
        });

        it('estimates size correctly for a single P2WPKH input (known sender)', () => {
            // overhead=40  input(P2WPKH)=272  outputs(P2WPKH × 2)=248  → weight=560  vBytes=140
            const est = BitcoinTransactionSizeCalculator.estimateTransactionSize(
                [makeUtxo(100000)],
                2,
                P2WPKH_ADDR
            );
            assert.strictEqual(est.inputCount, 1);
            assert.strictEqual(est.outputCount, 2);
            assert.strictEqual(est.inputTypes[0], 'P2WPKH');
            assert.strictEqual(est.weight, 560);
            assert.strictEqual(est.vBytes, 140);
        });

        it('produces a larger vBytes with two inputs vs one', () => {
            const est1 = BitcoinTransactionSizeCalculator.estimateTransactionSize([makeUtxo(50000)], 2, P2WPKH_ADDR);
            const est2 = BitcoinTransactionSizeCalculator.estimateTransactionSize([makeUtxo(50000), makeUtxo(50000)], 2, P2WPKH_ADDR);
            assert.ok(est2.vBytes > est1.vBytes, 'Two inputs must yield a larger transaction');
        });

        it('picks up the address type from scriptPubKey.addresses when present', () => {
            const utxo = {
                txid: 'a'.repeat(64),
                vout: 0,
                value: 100000,
                confirmations: 1,
                scriptPubKey: {
                    type: 'witness_v0_keyhash',
                    addresses: [P2WPKH_ADDR],  // P2WPKH
                },
            };
            const est = BitcoinTransactionSizeCalculator.estimateTransactionSize([utxo], 2);
            assert.strictEqual(est.inputTypes[0], 'P2WPKH');
        });

        it('defaults to P2WPKH input type when neither scriptPubKey.addresses nor senderAddress is given', () => {
            const est = BitcoinTransactionSizeCalculator.estimateTransactionSize([makeUtxo(100000)], 2);
            assert.strictEqual(est.inputTypes[0], 'P2WPKH');
        });

    });

    // ──────────────── selectOptimalUTXOs ─────────────────────────── //
    describe('selectOptimalUTXOs', () => {

        it('selects the fewest UTXOs needed to cover the target', () => {
            const utxos = [makeUtxo(200000), makeUtxo(50000), makeUtxo(10000)];
            const result = BitcoinTransactionSizeCalculator.selectOptimalUTXOs(utxos, 5000, 1);
            // Largest UTXO (200 000) alone covers 5 000 + fee
            assert.strictEqual(result.selectedUTXOs.length, 1);
            assert.ok(result.totalInput >= 5000 + result.estimatedFee);
        });

        it('throws "No UTXOs available" when the array is empty', () => {
            assert.throws(
                () => BitcoinTransactionSizeCalculator.selectOptimalUTXOs([], 5000, 1),
                /No UTXOs available/
            );
        });

        it('throws "Insufficient funds" when UTXOs cannot cover the target', () => {
            const utxos = [makeUtxo(500)];  // 500 sats < 10 000 sats target + fee
            assert.throws(
                () => BitcoinTransactionSizeCalculator.selectOptimalUTXOs(utxos, 10000, 1),
                /Insufficient funds/
            );
        });

        it('sets changeAmount = 0 and finalOutputCount = 1 when change would be dust (< 546 sats)', () => {
            // value=10250, target=10000, feeRate=1
            // feeWithChange ≈ 140  → changeWithChange = 10250 - 10000 - 140 = 110 < 546
            // → no-change scenario; feeWithoutChange ≈ 109  → 10250 >= 10109 ✓
            const result = BitcoinTransactionSizeCalculator.selectOptimalUTXOs([makeUtxo(10250)], 10000, 1);
            assert.strictEqual(result.changeAmount, 0);
            assert.strictEqual(result.finalOutputCount, 1);
        });

        it('includes a change output when change >= 546 sats', () => {
            // value=100000, target=1000 → change >> 546
            const result = BitcoinTransactionSizeCalculator.selectOptimalUTXOs([makeUtxo(100000)], 1000, 1);
            assert.ok(result.changeAmount >= 546);
            assert.strictEqual(result.finalOutputCount, 2);
        });

    });

    // ──────────────── calculateOptimalFee ────────────────────────── //
    describe('calculateOptimalFee', () => {

        let _consoleError;
        beforeEach(() => { _consoleError = console.error; console.error = () => {}; });
        afterEach(()  => { console.error = _consoleError; });

        it('returns an estimated fee (no UTXOs selected) when array is empty', async () => {
            const result = await BitcoinTransactionSizeCalculator.calculateOptimalFee(P2WPKH_ADDR, 1000, 1, []);
            assert.ok(result.feeInSats > 0, 'Fee should be positive even with no UTXOs');
            assert.deepStrictEqual(result.selectedUTXOs, []);
            assert.strictEqual(result.changeAmount, 0);
        });

        it('throws "UTXOs required" when utxos argument is undefined', async () => {
            await assert.rejects(
                () => BitcoinTransactionSizeCalculator.calculateOptimalFee(P2WPKH_ADDR, 1000, 1, undefined),
                /UTXOs required/
            );
        });

        it('selects UTXOs and returns fee, size, change, and selectedUTXOs for a valid request', async () => {
            const result = await BitcoinTransactionSizeCalculator.calculateOptimalFee(
                P2WPKH_ADDR, 1000, 1, [makeUtxo(100000)]
            );
            assert.ok(result.feeInSats > 0);
            assert.ok(result.transactionSize > 0);
            assert.ok(result.selectedUTXOs.length > 0);
            // fee (BTC) must equal feeInSats / 1e8
            assert.strictEqual(result.fee, result.feeInSats / 1e8);
        });

        it('propagates "Insufficient funds" when all UTXOs cannot cover the target', async () => {
            await assert.rejects(
                () => BitcoinTransactionSizeCalculator.calculateOptimalFee(
                    P2WPKH_ADDR, 100000, 1, [makeUtxo(100)]
                ),
                /Insufficient funds/
            );
        });

    });

    // ──────────────────── convertAmount ──────────────────────────── //
    describe('convertAmount', () => {

        it('converts BTC to satoshis', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.convertAmount(1, 'btc', 'sats'), 1e8);
        });

        it('converts satoshis to BTC', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.convertAmount(1e8, 'sats', 'btc'), 1);
        });

        it('returns BTC unchanged when from and to are both "btc"', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.convertAmount(0.5, 'btc', 'btc'), 0.5);
        });

        it('returns sats unchanged when from and to are both "sats"', () => {
            assert.strictEqual(BitcoinTransactionSizeCalculator.convertAmount(50000, 'sats', 'sats'), 50000);
        });

    });

    // ──────────────────── formatFeeDisplay ───────────────────────── //
    describe('formatFeeDisplay', () => {

        it('returns a string', () => {
            const display = BitcoinTransactionSizeCalculator.formatFeeDisplay(1000, 10, 100);
            assert.strictEqual(typeof display, 'string');
        });

        it('includes the fee amount in sats', () => {
            const display = BitcoinTransactionSizeCalculator.formatFeeDisplay(1000, 10, 100);
            assert.ok(display.includes('1000'), `Expected "1000" in: ${display}`);
        });

        it('includes the fee rate (sat/vB)', () => {
            const display = BitcoinTransactionSizeCalculator.formatFeeDisplay(1000, 10, 100);
            assert.ok(display.includes('10'), `Expected fee rate "10" in: ${display}`);
        });

        it('includes the vBytes size', () => {
            const display = BitcoinTransactionSizeCalculator.formatFeeDisplay(1000, 10, 100);
            assert.ok(display.includes('100'), `Expected vBytes "100" in: ${display}`);
        });

        it('includes the BTC representation', () => {
            const display = BitcoinTransactionSizeCalculator.formatFeeDisplay(100000000, 1, 140);
            // 1e8 sats = 1.00000000 BTC
            assert.ok(display.includes('1.00000000'), `Expected BTC representation in: ${display}`);
        });

    });

});

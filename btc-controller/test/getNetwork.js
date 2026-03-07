const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');
const { getNetwork } = require('../src/helper/utils/getNetwork');

describe('getNetwork', () => {

    describe('TESTNET', () => {
        it('should return the bitcoinjs testnet network object', () => {
            const result = getNetwork('TESTNET');
            assert.deepStrictEqual(result, bitcoinjs.networks.testnet);
        });

        it('should have correct testnet bech32 prefix "tb"', () => {
            const result = getNetwork('TESTNET');
            assert.strictEqual(result.bech32, 'tb');
        });

        it('should have correct testnet pubKeyHash (0x6f)', () => {
            const result = getNetwork('TESTNET');
            assert.strictEqual(result.pubKeyHash, 0x6f);
        });

        it('should have correct testnet wif byte (0xef)', () => {
            const result = getNetwork('TESTNET');
            assert.strictEqual(result.wif, 0xef);
        });
    });

    describe('MAINNET', () => {
        it('should return the bitcoinjs mainnet network object', () => {
            const result = getNetwork('MAINNET');
            assert.deepStrictEqual(result, bitcoinjs.networks.bitcoin);
        });

        it('should have correct mainnet bech32 prefix "bc"', () => {
            const result = getNetwork('MAINNET');
            assert.strictEqual(result.bech32, 'bc');
        });

        it('should have correct mainnet pubKeyHash (0x00)', () => {
            const result = getNetwork('MAINNET');
            assert.strictEqual(result.pubKeyHash, 0x00);
        });

        it('should have correct mainnet wif byte (0x80)', () => {
            const result = getNetwork('MAINNET');
            assert.strictEqual(result.wif, 0x80);
        });
    });

    describe('return type', () => {
        it('should return an object for MAINNET', () => {
            const result = getNetwork('MAINNET');
            assert.strictEqual(typeof result, 'object');
        });

        it('should return an object for TESTNET', () => {
            const result = getNetwork('TESTNET');
            assert.strictEqual(typeof result, 'object');
        });

        it('MAINNET and TESTNET should return distinct objects', () => {
            const mainnet = getNetwork('MAINNET');
            const testnet = getNetwork('TESTNET');
            assert.notDeepStrictEqual(mainnet, testnet);
        });
    });

    describe('fallback behavior', () => {
        it('should default to mainnet for an unrecognized network name', () => {
            const result = getNetwork('UNKNOWN_NETWORK');
            assert.deepStrictEqual(result, bitcoinjs.networks.bitcoin);
        });
    });

});

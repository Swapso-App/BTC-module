'use strict';

const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');
const { getAddressFromPk } = require('../src/helper/utils/getAddressFromPk');

const {
    EXTERNAL_ACCOUNT_PRIVATE_KEY,
    EXTERNAL_ACCOUNT_ADDRESS,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_1,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_2,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_3,
    EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_4,
} = require('./constants');

describe('getAddressFromPk', () => {

    // ─────────────────────────────────────────────────────────────────── //
    // Happy-path: valid WIF key on testnet
    // ─────────────────────────────────────────────────────────────────── //
    describe('testnet P2WPKH derivation', () => {

        it('derives the correct bech32 testnet address from a valid WIF key', () => {
            const addr = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            assert.strictEqual(addr, EXTERNAL_ACCOUNT_ADDRESS);
        });

        it('returns an address that starts with "tb1" (testnet bech32 prefix)', () => {
            const addr = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            assert.ok(addr.startsWith('tb1'), `Expected "tb1" prefix, got: ${addr}`);
        });

        it('returns a string', () => {
            const addr = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            assert.strictEqual(typeof addr, 'string');
        });

        it('returns a non-empty address', () => {
            const addr = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            assert.ok(addr && addr.length > 0, 'Address should be non-empty');
        });

        it('is deterministic — same WIF always produces the same address', () => {
            const addr1 = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            const addr2 = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            assert.strictEqual(addr1, addr2);
        });

        it('accepts an optional index argument without affecting the result', () => {
            const addrNoIndex  = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet);
            const addrWithIndex = getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.testnet, 0);
            assert.strictEqual(addrNoIndex, addrWithIndex);
        });

    });

    // ─────────────────────────────────────────────────────────────────── //
    // Invalid inputs — every case must throw
    // ─────────────────────────────────────────────────────────────────── //
    describe('invalid inputs — must throw', () => {

        it('throws for a plaintext invalid WIF string', () => {
            assert.throws(() => getAddressFromPk(EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_1, bitcoinjs.networks.testnet));
        });

        it('throws for a 0x-prefixed hex string (not WIF-encoded)', () => {
            assert.throws(() => getAddressFromPk(EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_2, bitcoinjs.networks.testnet));
        });

        it('throws for a non-WIF Base58 string', () => {
            assert.throws(() => getAddressFromPk(EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_3, bitcoinjs.networks.testnet));
        });

        it('throws for a raw hex private key (not WIF-encoded)', () => {
            assert.throws(() => getAddressFromPk(EXTERNAL_ACCOUNT_WRONG_PRIVATE_KEY_4, bitcoinjs.networks.testnet));
        });

        it('throws when a testnet WIF key is used with the mainnet network object', () => {
            // Testnet WIF uses byte 0xef; mainnet expects 0x80 → fromWIF must throw
            assert.throws(() => getAddressFromPk(EXTERNAL_ACCOUNT_PRIVATE_KEY, bitcoinjs.networks.bitcoin));
        });

        it('throws for an empty string', () => {
            assert.throws(() => getAddressFromPk('', bitcoinjs.networks.testnet));
        });

    });

});

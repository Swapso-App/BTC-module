const assert = require('assert');
const bip32Module = require('bip32');
const ecc = require('@bitcoinerlab/secp256k1');
const bip39 = require('bip39');
const { calcBip32ExtendedKeys } = require('../src/helper/utils/calcBip32ExtendedKeys');

// bip32 v4 exports the factory as `.default` in CJS environments
const BIP32Factory = bip32Module.default || bip32Module;
const bip32 = BIP32Factory(ecc);

// Use the same mnemonic as in constants.js
const MNEMONIC = 'uphold job voyage bunker attract similar ship pear soda security rubber offer';

describe('calcBip32ExtendedKeys', () => {

    let rootKey;

    before(() => {
        const seed = bip39.mnemonicToSeedSync(MNEMONIC);
        rootKey = bip32.fromSeed(seed);
    });

    // ------------------------------------------------------------------ //
    // Falsy / guard branch
    // ------------------------------------------------------------------ //
    describe('falsy bip32RootKey guard', () => {
        it('should return null when bip32RootKey is null', () => {
            const result = calcBip32ExtendedKeys(null, "m/84'/0'/0'/0");
            assert.strictEqual(result, null);
        });

        it('should return undefined when bip32RootKey is undefined', () => {
            const result = calcBip32ExtendedKeys(undefined, "m/84'/0'/0'/0");
            assert.strictEqual(result, undefined);
        });

        it('should return 0 when bip32RootKey is 0 (falsy numeric)', () => {
            const result = calcBip32ExtendedKeys(0, "m/84'/0'/0'/0");
            assert.strictEqual(result, 0);
        });
    });

    // ------------------------------------------------------------------ //
    // Path with no derivable numeric segments
    // ------------------------------------------------------------------ //
    describe('path with no numeric bits ("m" only)', () => {
        it('should return the root key reference unchanged for path "m"', () => {
            const result = calcBip32ExtendedKeys(rootKey, 'm');
            assert.strictEqual(result, rootKey);
        });
    });

    // ------------------------------------------------------------------ //
    // Non-hardened child derivation
    // ------------------------------------------------------------------ //
    describe('non-hardened derivation', () => {
        it('should derive correct child at index 0 (path "m/0")', () => {
            const result = calcBip32ExtendedKeys(rootKey, 'm/0');
            const expected = rootKey.derive(0);
            assert.deepStrictEqual(result.publicKey, expected.publicKey);
        });

        it('should derive correct child at index 1 (path "m/1")', () => {
            const result = calcBip32ExtendedKeys(rootKey, 'm/1');
            const expected = rootKey.derive(1);
            assert.deepStrictEqual(result.publicKey, expected.publicKey);
        });

        it('should derive correct child at index 2 (path "m/2")', () => {
            const result = calcBip32ExtendedKeys(rootKey, 'm/2');
            const expected = rootKey.derive(2);
            assert.deepStrictEqual(result.publicKey, expected.publicKey);
        });

        it('derived node should have a 33-byte compressed public key', () => {
            const result = calcBip32ExtendedKeys(rootKey, 'm/0');
            assert.ok(Buffer.isBuffer(result.publicKey));
            assert.strictEqual(result.publicKey.length, 33);
        });
    });

    // ------------------------------------------------------------------ //
    // Hardened child derivation
    // ------------------------------------------------------------------ //
    describe('hardened derivation', () => {
        it("should derive correct hardened child at index 84 (path \"m/84'\")", () => {
            const result = calcBip32ExtendedKeys(rootKey, "m/84'");
            const expected = rootKey.deriveHardened(84);
            assert.deepStrictEqual(result.publicKey, expected.publicKey);
        });

        it("should correctly derive full BIP84 mainnet path \"m/84'/0'/0'/0\"", () => {
            const result = calcBip32ExtendedKeys(rootKey, "m/84'/0'/0'/0");
            assert.ok(result !== null && result !== undefined);
            assert.ok(Buffer.isBuffer(result.publicKey));
            assert.strictEqual(result.publicKey.length, 33);
        });

        it("should correctly derive full BIP84 testnet path \"m/84'/1'/0'/0\"", () => {
            const result = calcBip32ExtendedKeys(rootKey, "m/84'/1'/0'/0");
            assert.ok(result !== null && result !== undefined);
            assert.ok(Buffer.isBuffer(result.publicKey));
            assert.strictEqual(result.publicKey.length, 33);
        });

        it("BIP84 mainnet and testnet paths should yield different public keys", () => {
            const mainnet = calcBip32ExtendedKeys(rootKey, "m/84'/0'/0'/0");
            const testnet = calcBip32ExtendedKeys(rootKey, "m/84'/1'/0'/0");
            assert.notDeepStrictEqual(mainnet.publicKey, testnet.publicKey);
        });
    });

    // ------------------------------------------------------------------ //
    // Neutered (public-only) key
    // ------------------------------------------------------------------ //
    describe('neutered (public-only) key', () => {
        it('should derive non-hardened child from a neutered key', () => {
            const neuteredKey = rootKey.neutered();
            const result = calcBip32ExtendedKeys(neuteredKey, 'm/0');
            const expected = neuteredKey.derive(0);
            assert.deepStrictEqual(result.publicKey, expected.publicKey);
        });

        it("should return null when hardened derivation is attempted on a neutered key", () => {
            const neuteredKey = rootKey.neutered();
            const result = calcBip32ExtendedKeys(neuteredKey, "m/0'");
            assert.strictEqual(result, null);
        });

        it("should return null for any hardened segment in the path on a neutered key", () => {
            const neuteredKey = rootKey.neutered();
            const result = calcBip32ExtendedKeys(neuteredKey, "m/84'");
            assert.strictEqual(result, null);
        });
    });

});

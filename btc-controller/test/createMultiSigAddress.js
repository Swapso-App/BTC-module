const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');
const ECPairFactory = require('ecpair').default;
const ecc = require('@bitcoinerlab/secp256k1');
const { createMultiSigAddress } = require('../src/helper/utils/createMultiSigAddress');

const ECPair = ECPairFactory(ecc);

function createTestPublicKeys() {
  const privateKeys = ['01', '02', '03'].map((v) => Buffer.from(v.padStart(64, '0'), 'hex'));
  return privateKeys.map((pk) => ECPair.fromPrivateKey(pk).publicKey.toString('hex'));
}

describe('createMultiSigAddress', () => {
  const network = bitcoinjs.networks.testnet;
  const publicKeys = createTestPublicKeys();

  it('creates a legacy P2SH 2-of-3 multisig address', () => {
    const result = createMultiSigAddress({
      publicKeys,
      requiredSignatures: 2,
      network,
      type: 'P2SH',
    });

    const p2ms = bitcoinjs.payments.p2ms({
      m: 2,
      pubkeys: publicKeys.map((k) => Buffer.from(k, 'hex')),
      network,
    });
    const expected = bitcoinjs.payments.p2sh({ redeem: p2ms, network }).address;

    assert.strictEqual(result.address, expected);
    assert.strictEqual(result.type, 'P2SH');
    assert.ok(result.redeemScript);
    assert.strictEqual(result.witnessScript, undefined);
    assert.ok(result.address.startsWith('2'));
  });

  it('creates a nested P2SH-P2WSH 2-of-3 multisig address', () => {
    const result = createMultiSigAddress({
      publicKeys,
      requiredSignatures: 2,
      network,
      type: 'P2SH-P2WSH',
    });

    const p2ms = bitcoinjs.payments.p2ms({
      m: 2,
      pubkeys: publicKeys.map((k) => Buffer.from(k, 'hex')),
      network,
    });
    const p2wsh = bitcoinjs.payments.p2wsh({ redeem: p2ms, network });
    const expected = bitcoinjs.payments.p2sh({ redeem: p2wsh, network }).address;

    assert.strictEqual(result.address, expected);
    assert.strictEqual(result.type, 'P2SH-P2WSH');
    assert.ok(result.redeemScript);
    assert.ok(result.witnessScript);
    assert.ok(result.address.startsWith('2'));
  });

  it('creates a P2WSH (native SegWit) 2-of-3 multisig address', () => {
    const result = createMultiSigAddress({
      publicKeys,
      requiredSignatures: 2,
      network,
      type: 'P2WSH',
    });

    const p2ms = bitcoinjs.payments.p2ms({
      m: 2,
      pubkeys: publicKeys.map((k) => Buffer.from(k, 'hex')),
      network,
    });
    const expected = bitcoinjs.payments.p2wsh({ redeem: p2ms, network }).address;

    assert.strictEqual(result.address, expected);
    assert.strictEqual(result.type, 'P2WSH');
    assert.strictEqual(result.redeemScript, undefined);
    assert.ok(result.witnessScript);
    assert.ok(result.address.startsWith('tb1'));
  });

  it('throws when requiredSignatures is greater than key count', () => {
    assert.throws(() => {
      createMultiSigAddress({
        publicKeys,
        requiredSignatures: 4,
        network,
        type: 'P2SH',
      });
    }, /requiredSignatures cannot be greater than number of public keys/);
  });
});

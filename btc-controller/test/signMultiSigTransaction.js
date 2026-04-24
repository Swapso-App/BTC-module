'use strict';

const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('@bitcoinerlab/secp256k1');

const ECPairModule = require('ecpair');
const ECPairFactory = ECPairModule.default || ECPairModule;
const ECPair = ECPairFactory(ecc);

const { buildMultiSigTransaction } = require('../src/helper/buildMultiSigTransaction');
const { signMultiSigTransaction } = require('../src/helper/signMultiSigTransaction');

const TESTNET = bitcoin.networks.testnet;
const RECIPIENT = 'tb1qcen5y7uvp3r9y0c4l4c55hlaks8gef54pr6v68';

function createMultiSigFixture() {
  const signer1 = ECPair.makeRandom({ network: TESTNET });
  const signer2 = ECPair.makeRandom({ network: TESTNET });
  const signer3 = ECPair.makeRandom({ network: TESTNET });

  const p2ms = bitcoin.payments.p2ms({
    m: 2,
    pubkeys: [
      Buffer.from(signer1.publicKey),
      Buffer.from(signer2.publicKey),
      Buffer.from(signer3.publicKey),
    ],
    network: TESTNET,
  });

  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network: TESTNET });
  const p2sh = bitcoin.payments.p2sh({ redeem: p2wsh, network: TESTNET });

  return {
    signer1,
    signer2,
    signer3,
    witnessScript: p2ms.output.toString('hex'),
    redeemScript: p2wsh.output.toString('hex'),
    scriptPubKey: p2sh.output.toString('hex'),
    changeAddress: p2sh.address,
  };
}

function makeUtxo(txidChar, value, fixture, vout = 0) {
  return {
    txid: txidChar.repeat(64),
    vout,
    value,
    scriptPubKey: fixture.scriptPubKey,
    witnessScript: fixture.witnessScript,
    redeemScript: fixture.redeemScript,
  };
}

describe('signMultiSigTransaction', () => {
  it('adds the first signer partial signature without finalizing', () => {
    const fixture = createMultiSigFixture();

    const unsigned = buildMultiSigTransaction({
      network: TESTNET,
      requiredSignatures: 2,
      totalSigners: 3,
      feeInSats: 500,
      changeAddress: fixture.changeAddress,
      utxos: [makeUtxo('1', 15000, fixture)],
      outputs: [{ address: RECIPIENT, value: 7000 }],
    });

    assert.strictEqual(unsigned.psbt.data.inputs[0].partialSig, undefined);

    const signed = signMultiSigTransaction({
      network: TESTNET,
      psbtBase64: unsigned.psbtBase64,
      signer: fixture.signer1,
    });

    assert.strictEqual(signed.signedInputCount, 1);
    assert.deepStrictEqual(signed.signedInputIndexes, [0]);

    const parsed = bitcoin.Psbt.fromBase64(signed.psbtBase64, { network: TESTNET });
    const partialSignatures = parsed.data.inputs[0].partialSig;

    assert.ok(Array.isArray(partialSignatures));
    assert.strictEqual(partialSignatures.length, 1);
    assert.strictEqual(
      partialSignatures[0].pubkey.toString('hex'),
      Buffer.from(fixture.signer1.publicKey).toString('hex')
    );

    assert.throws(() => parsed.finalizeAllInputs());
  });

  it('signs only requested input indexes', () => {
    const fixture = createMultiSigFixture();

    const unsigned = buildMultiSigTransaction({
      network: TESTNET,
      requiredSignatures: 2,
      totalSigners: 3,
      feeInSats: 1000,
      changeAddress: fixture.changeAddress,
      utxos: [makeUtxo('2', 9000, fixture, 0), makeUtxo('3', 9000, fixture, 1)],
      outputs: [{ address: RECIPIENT, value: 10000 }],
    });

    const signed = signMultiSigTransaction({
      network: TESTNET,
      psbt: unsigned.psbt,
      signer: fixture.signer1,
      inputIndexes: [1],
    });

    assert.strictEqual(signed.signedInputCount, 1);
    assert.deepStrictEqual(signed.signedInputIndexes, [1]);
    assert.strictEqual(unsigned.psbt.data.inputs[0].partialSig, undefined);

    const signedInput = unsigned.psbt.data.inputs[1];
    assert.ok(Array.isArray(signedInput.partialSig));
    assert.strictEqual(signedInput.partialSig.length, 1);
  });
});

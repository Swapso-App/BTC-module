'use strict';

const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('@bitcoinerlab/secp256k1');

const ECPairModule = require('ecpair');
const ECPairFactory = ECPairModule.default || ECPairModule;
const ECPair = ECPairFactory(ecc);

const { buildMultiSigTransaction } = require('../src/helper/buildMultiSigTransaction');
const { serializePsbtToBase64 } = require('../src/helper/psbtSerialization');

const TESTNET = bitcoin.networks.testnet;
const RECIPIENT = 'tb1qcen5y7uvp3r9y0c4l4c55hlaks8gef54pr6v68';

function createFixture() {
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
    witnessScript: p2ms.output.toString('hex'),
    redeemScript: p2wsh.output.toString('hex'),
    scriptPubKey: p2sh.output.toString('hex'),
    changeAddress: p2sh.address,
  };
}

describe('psbtSerialization', () => {
  it('exports an unsigned multisig PSBT to base64 and allows roundtrip import', () => {
    const fixture = createFixture();

    const { psbt, psbtBase64 } = buildMultiSigTransaction({
      network: TESTNET,
      requiredSignatures: 2,
      totalSigners: 3,
      feeInSats: 500,
      changeAddress: fixture.changeAddress,
      utxos: [
        {
          txid: 'a'.repeat(64),
          vout: 0,
          value: 12000,
          scriptPubKey: fixture.scriptPubKey,
          witnessScript: fixture.witnessScript,
          redeemScript: fixture.redeemScript,
        },
      ],
      outputs: [{ address: RECIPIENT, value: 5000 }],
    });

    const encoded = serializePsbtToBase64(psbt);
    assert.strictEqual(encoded, psbtBase64);

    const parsed = bitcoin.Psbt.fromBase64(encoded, { network: TESTNET });
    assert.strictEqual(parsed.txInputs.length, 1);
    assert.strictEqual(parsed.txOutputs.length, 2);
  });

  it('throws on invalid PSBT input', () => {
    assert.throws(() => serializePsbtToBase64(null), /Invalid PSBT instance/);
  });
});

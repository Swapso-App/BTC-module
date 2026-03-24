'use strict';

const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');
const { buildMultiSigTransaction } = require('../src/helper/buildMultiSigTransaction');

const TESTNET = bitcoin.networks.testnet;
const RECIPIENT = 'tb1qcen5y7uvp3r9y0c4l4c55hlaks8gef54pr6v68';
const CHANGE = 'tb1qt3vyrqgy7emqcr8sjr39zcjdca7grfer7lvxhp';

function makeUtxo(txidChar, value) {
  return {
    txid: txidChar.repeat(64),
    vout: 0,
    value,
    scriptPubKey: bitcoin.address.toOutputScript(CHANGE, TESTNET).toString('hex'),
  };
}

describe('buildMultiSigTransaction', () => {
  it('selects only the minimum required UTXOs', () => {
    const result = buildMultiSigTransaction({
      network: TESTNET,
      requiredSignatures: 2,
      totalSigners: 3,
      feeInSats: 500,
      changeAddress: CHANGE,
      utxos: [
        makeUtxo('a', 4000),
        makeUtxo('b', 7000),
        makeUtxo('c', 8000),
      ],
      outputs: [{ address: RECIPIENT, value: 10000 }],
    });

    assert.strictEqual(result.inputCount, 2);
    assert.strictEqual(result.selectedUTXOs.length, 2);
    assert.strictEqual(result.totalInputValue, 15000);
    assert.strictEqual(result.totalOutputValue, 10000);
    assert.strictEqual(result.changeAmount, 4500);
    assert.strictEqual(result.psbt.txInputs.length, 2);
  });

  it('throws when selected UTXOs cannot cover outputs and fee', () => {
    assert.throws(
      () =>
        buildMultiSigTransaction({
          network: TESTNET,
          requiredSignatures: 2,
          totalSigners: 3,
          feeInSats: 300,
          utxos: [makeUtxo('d', 1000), makeUtxo('e', 1200)],
          outputs: [{ address: RECIPIENT, value: 2500 }],
        }),
      /Insufficient funds/
    );
  });
});

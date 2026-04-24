import * as bitcoin from "bitcoinjs-lib";
import BitcoinTransactionSizeCalculator from "./utils/transactionSizeCalculator";
import { serializePsbtToBase64 } from "./psbtSerialization";

export interface MultiSigInputUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  witnessScript?: string;
  redeemScript?: string;
}

export interface MultiSigOutput {
  address: string;
  value: number;
}

export interface BuildMultiSigTransactionOptions {
  network: bitcoin.networks.Network;
  utxos: MultiSigInputUTXO[];
  outputs: MultiSigOutput[];
  requiredSignatures: number;
  totalSigners: number;
  feeInSats?: number;
  feeRate?: number;
  changeAddress?: string;
  dustThreshold?: number;
}

export interface BuildMultiSigTransactionResult {
  psbt: bitcoin.Psbt;
  psbtBase64: string;
  selectedUTXOs: MultiSigInputUTXO[];
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  feeInSats: number;
  changeAmount: number;
}

interface SelectedUtxoSet {
  selectedUTXOs: MultiSigInputUTXO[];
  totalInputValue: number;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function selectMultiSigUTXOs(
  utxos: MultiSigInputUTXO[],
  targetAmount: number
): SelectedUtxoSet {
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const selectedUTXOs: MultiSigInputUTXO[] = [];
  let totalInputValue = 0;

  for (const utxo of sorted) {
    selectedUTXOs.push(utxo);
    totalInputValue += utxo.value;

    if (totalInputValue >= targetAmount) {
      return {
        selectedUTXOs,
        totalInputValue,
      };
    }
  }

  throw new Error("Insufficient funds for selected outputs and fee");
}

function validateOutputs(outputs: MultiSigOutput[], network: bitcoin.networks.Network): void {
  outputs.forEach((output, index) => {
    if (!isPositiveInteger(output.value)) {
      throw new Error(`Invalid output value at index ${index}`);
    }

    try {
      bitcoin.address.toOutputScript(output.address, network);
    } catch {
      throw new Error(`Invalid output address at index ${index}`);
    }
  });
}

function validateUtxos(utxos: MultiSigInputUTXO[]): void {
  utxos.forEach((utxo, index) => {
    if (!utxo.txid || utxo.txid.length !== 64) {
      throw new Error(`Invalid txid for UTXO at index ${index}`);
    }

    if (!Number.isInteger(utxo.vout) || utxo.vout < 0) {
      throw new Error(`Invalid vout for UTXO at index ${index}`);
    }

    if (!isPositiveInteger(utxo.value)) {
      throw new Error(`Invalid value for UTXO at index ${index}`);
    }

    if (!utxo.scriptPubKey || typeof utxo.scriptPubKey !== "string") {
      throw new Error(`Invalid scriptPubKey for UTXO at index ${index}`);
    }
  });
}

export function buildMultiSigTransaction(
  options: BuildMultiSigTransactionOptions
): BuildMultiSigTransactionResult {
  const {
    network,
    utxos,
    outputs,
    requiredSignatures,
    totalSigners,
    feeInSats,
    feeRate = 1,
    changeAddress,
    dustThreshold = 546,
  } = options;

  if (requiredSignatures < 1 || totalSigners < 1 || requiredSignatures > totalSigners) {
    throw new Error("Invalid multisig signer configuration");
  }

  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error("At least one UTXO is required to build a multisig transaction");
  }

  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new Error("At least one output is required to build a multisig transaction");
  }

  if (!Number.isInteger(dustThreshold) || dustThreshold < 0) {
    throw new Error("Invalid dust threshold");
  }

  validateUtxos(utxos);
  validateOutputs(outputs, network);

  const totalOutputValue = outputs.reduce((sum, output) => sum + output.value, 0);

  let selectedUTXOs: MultiSigInputUTXO[] = [];
  let totalInputValue = 0;
  let resolvedFeeInSats = 0;
  let changeAmount = 0;

  if (feeInSats !== undefined) {
    if (!Number.isInteger(feeInSats) || feeInSats < 0) {
      throw new Error("Invalid feeInSats");
    }

    const targetAmount = totalOutputValue + feeInSats;
    const selection = selectMultiSigUTXOs(utxos, targetAmount);
    selectedUTXOs = selection.selectedUTXOs;
    totalInputValue = selection.totalInputValue;
    resolvedFeeInSats = feeInSats;
    changeAmount = totalInputValue - totalOutputValue - resolvedFeeInSats;
  } else {
    if (!Number.isFinite(feeRate) || feeRate <= 0) {
      throw new Error("feeRate must be a positive number when feeInSats is not provided");
    }

    const selection = BitcoinTransactionSizeCalculator.selectOptimalUTXOs(
      utxos as any,
      totalOutputValue,
      feeRate,
      changeAddress
    );

    selectedUTXOs = selection.selectedUTXOs as unknown as MultiSigInputUTXO[];
    totalInputValue = selection.totalInput;
    resolvedFeeInSats = selection.estimatedFee;
    changeAmount = selection.changeAmount;
  }

  if (changeAmount < 0) {
    throw new Error("Insufficient input value to cover outputs and fee");
  }

  const psbt = new bitcoin.Psbt({ network });

  selectedUTXOs.forEach((utxo) => {
    const input: any = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, "hex"),
        value: utxo.value,
      },
    };

    if (utxo.witnessScript) {
      input.witnessScript = Buffer.from(utxo.witnessScript, "hex");
    }

    if (utxo.redeemScript) {
      input.redeemScript = Buffer.from(utxo.redeemScript, "hex");
    }

    psbt.addInput(input);
  });

  outputs.forEach((output) => {
    psbt.addOutput({ address: output.address, value: output.value });
  });

  const shouldAddChange = !!changeAddress && changeAmount >= dustThreshold;
  if (shouldAddChange) {
    psbt.addOutput({ address: changeAddress, value: changeAmount });
  } else {
    // If change is below dust or there is no change target, add it to miner fee.
    resolvedFeeInSats += changeAmount;
    changeAmount = 0;
  }

  return {
    psbt,
    psbtBase64: serializePsbtToBase64(psbt),
    selectedUTXOs,
    inputCount: selectedUTXOs.length,
    outputCount: psbt.txOutputs.length,
    totalInputValue,
    totalOutputValue,
    feeInSats: resolvedFeeInSats,
    changeAmount,
  };
}

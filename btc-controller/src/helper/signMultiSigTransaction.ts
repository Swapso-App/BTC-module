import * as bitcoin from "bitcoinjs-lib";
import { ECPairInterface } from "ecpair";
import { serializePsbtToBase64 } from "./psbtSerialization";

export interface SignMultiSigTransactionOptions {
  network: bitcoin.networks.Network;
  signer: ECPairInterface;
  psbt?: bitcoin.Psbt;
  psbtBase64?: string;
  inputIndexes?: number[];
}

export interface SignMultiSigTransactionResult {
  psbt: bitcoin.Psbt;
  psbtBase64: string;
  signedInputIndexes: number[];
  signedInputCount: number;
}

function resolvePsbt(
  network: bitcoin.networks.Network,
  psbt?: bitcoin.Psbt,
  psbtBase64?: string
): bitcoin.Psbt {
  if (psbt && psbtBase64) {
    throw new Error("Provide either psbt or psbtBase64, not both");
  }

  if (!psbt && !psbtBase64) {
    throw new Error("psbt or psbtBase64 is required");
  }

  if (psbt) {
    return psbt;
  }

  return bitcoin.Psbt.fromBase64(psbtBase64 as string, { network });
}

function resolveInputIndexes(inputCount: number, inputIndexes?: number[]): number[] {
  const indexes = inputIndexes ?? Array.from({ length: inputCount }, (_, i) => i);

  if (!Array.isArray(indexes) || indexes.length === 0) {
    throw new Error("At least one input index is required");
  }

  const uniqueIndexes = Array.from(new Set(indexes));

  uniqueIndexes.forEach((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= inputCount) {
      throw new Error(`Invalid input index: ${index}`);
    }
  });

  return uniqueIndexes;
}

export function signMultiSigTransaction(
  options: SignMultiSigTransactionOptions
): SignMultiSigTransactionResult {
  const { network, signer, psbt, psbtBase64, inputIndexes } = options;
  const resolvedPsbt = resolvePsbt(network, psbt, psbtBase64);

  if (!signer?.publicKey || typeof signer.sign !== "function") {
    throw new Error("Invalid signer: signer must expose publicKey and sign(hash)");
  }

  const signerForPsbt: any = {
    publicKey: Buffer.from(signer.publicKey),
    sign: (hash: Buffer) => Buffer.from(signer.sign(hash)),
  };

  const indexesToSign = resolveInputIndexes(resolvedPsbt.txInputs.length, inputIndexes);

  indexesToSign.forEach((index) => {
    try {
      resolvedPsbt.signInput(index, signerForPsbt);
    } catch (err: any) {
      throw new Error(`Failed to sign input ${index}: ${err?.message ?? "Unknown error"}`);
    }
  });

  return {
    psbt: resolvedPsbt,
    psbtBase64: serializePsbtToBase64(resolvedPsbt),
    signedInputIndexes: indexesToSign,
    signedInputCount: indexesToSign.length,
  };
}

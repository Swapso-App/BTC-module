import * as bitcoin from "bitcoinjs-lib";

export function serializePsbtToBase64(psbt: bitcoin.Psbt): string {
  if (!psbt || typeof (psbt as any).toBase64 !== "function") {
    throw new Error("Invalid PSBT instance");
  }

  return psbt.toBase64();
}

export const exportPsbtToBase64 = serializePsbtToBase64;

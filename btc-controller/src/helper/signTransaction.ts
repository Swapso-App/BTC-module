import * as bitcoin from "bitcoinjs-lib";
import { ECPairInterface } from "ecpair";
import { BitcoinNetworkName } from "../config";
import BitcoinTransactionSizeCalculator from "./utils/transactionSizeCalculator";
import { FeeEstimator, FeeRatePriority } from "./utils/feeEstimator";

/**
 * Build, sign, and return the raw hex of a Bitcoin transaction.
 *
 * Fee-rate resolution order:
 *   1. `satPerByte` — use as-is when explicitly supplied.
 *   2. `FeeEstimator.getFeeRate()` — fetched from the mempool.space API with
 *      automatic retry + exponential back-off.
 *   3. Static fallback (built into FeeEstimator) — used if every network
 *      attempt fails so the transaction can still be constructed.
 *
 * @param satPerByte  Fee rate in sat/vByte.  Pass `undefined` to auto-estimate.
 * @param priority    Fee tier used during auto-estimation (default: "halfHour")
 */
export async function signTransaction(
  child: ECPairInterface,
  keyPair: ECPairInterface,
  privateKey: any,
  from: string,
  to: string,
  amountToSend: number,
  satPerByte: number | undefined = undefined,
  networkType: BitcoinNetworkName,
  network: bitcoin.networks.Network,
  freshUtxos: any[] = [],
  priority: FeeRatePriority = "halfHour"
) {
  const psbt = new bitcoin.Psbt({ network });

  // Resolve effective fee rate: caller value takes precedence; otherwise
  // fetch from the mempool.space API (with retry + static fallback).
  const effectiveFeeRate =
    satPerByte != null
      ? satPerByte
      : await FeeEstimator.getFeeRate(networkType, priority);

  const {
    feeInSats,
    selectedUTXOs,
    changeAmount,
  } = await BitcoinTransactionSizeCalculator.calculateOptimalFee(from, amountToSend, effectiveFeeRate, freshUtxos);

  const totalAmountAvailable = selectedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);
    // console.log("totalAmountAvailable:", totalAmountAvailable);
    // console.log("amountToSend:", amountToSend);
    // console.log("fee:", feeInSats);

  if (totalAmountAvailable < amountToSend + feeInSats) {
    throw new Error("Balance is too low for this transaction");
  }

  psbt.addOutput({ address: to, value: amountToSend });

  if (changeAmount >= 100) {
    psbt.addOutput({ address: from, value: changeAmount });
  }

  selectedUTXOs.forEach((unspentOutput: any) => {
    psbt.addInput({
      hash: unspentOutput.txid,
      index: unspentOutput.vout,
      witnessUtxo: {
        script: Buffer.from(unspentOutput.scriptPubKey, "hex"),
        value: unspentOutput.value,
      },
    });
  });

  const buffer = Buffer.from(keyPair.publicKey);

  const mySigner: any = {
    publicKey: buffer,
    sign: (hash: any) => {
      const signature = Buffer.from(keyPair.sign(hash));
      return signature;
    },
  };

  selectedUTXOs.forEach((_, key: number) => {
    psbt.signInput(key, mySigner);
  });

  psbt.finalizeAllInputs();

  const transaction = psbt.extractTransaction();
  return transaction.toHex();
}

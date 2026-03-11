import axios from "axios";
import sb from "satoshi-bitcoin";
import { BitcoinNetworkName } from "../config";
import { FeeEstimator, FeeRatePriority } from "./utils/feeEstimator";

export async function getTransactionSize(
  address: string,
  network: BitcoinNetworkName
): Promise<{
  transactionSize: number;
  totalAmountAvailable: number;
  inputs: any;
}> {
  let inputCount = 0;
  const outputCount = 2;

  const utxos: any = await axios(
    `https://app.swapso.io/api/bitcoin/unspent?address=${address}&network=${network}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  let totalAmountAvailable = 0;

  const inputs: any[] = [];
  utxos.data.data.outputs.forEach((element: any) => {
    const utxo: any = {};
    utxo.value = sb.toSatoshi(parseFloat(element.value));
    utxo.scriptPubKey = element.script;
    utxo.tx_hex = element.tx_hex;
    utxo.txid = element.hash;
    utxo.vout = element.index;
    totalAmountAvailable += utxo.value;
    inputCount += 1;
    inputs.push(utxo);
  });

  // Standard P2PKH size formula: each input ≈ 148 B, each output ≈ 34 B, base 10 B
  const transactionSize = inputCount * 148 + outputCount * 34 + 10;
  return { transactionSize, totalAmountAvailable, inputs };
}

/**
 * Calculate the recommended fee and collect UTXO inputs for a transaction.
 *
 * When `satPerByte` is omitted (or `undefined`) the fee rate is fetched from
 * the mempool.space API via `FeeEstimator.getFeeRate()`, which applies retry
 * logic and falls back to a static rate if the network is unavailable.
 *
 * @param address    Sender's Bitcoin address (used to look up UTXOs)
 * @param network    "MAINNET" | "TESTNET"
 * @param satPerByte Explicit fee rate in sat/vByte.  Omit to auto-estimate.
 * @param priority   Fee priority tier used when auto-estimating (default: "halfHour")
 */
export async function getFeeAndInput(
  address: string,
  network: BitcoinNetworkName,
  satPerByte?: number,
  priority: FeeRatePriority = "halfHour"
) {
  const { transactionSize, totalAmountAvailable, inputs } =
    await getTransactionSize(address, network);

  // Use the caller-supplied rate when provided; otherwise fetch from the API.
  const effectiveRate =
    satPerByte != null
      ? satPerByte
      : await FeeEstimator.getFeeRate(network, priority);

  // Round up so we never underpay with fractional sat/vByte rates
  const fee = Math.ceil(transactionSize * effectiveRate);
  return { totalAmountAvailable, inputs, fee, transactionSize };
}

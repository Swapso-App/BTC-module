import axios from "axios";
import sb from "satoshi-bitcoin";
import { BitcoinNetworkName } from "../config";

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

export async function getFeeAndInput(
  address: string,
  network: BitcoinNetworkName,
  satPerByte: number
) {
  const { transactionSize, totalAmountAvailable, inputs } =
    await getTransactionSize(address, network);
  let fee = 0;
  // Round up so we never underpay with fractional sat/byte rates
  fee = Math.ceil(transactionSize * satPerByte);
  return { totalAmountAvailable, inputs, fee, transactionSize };
}

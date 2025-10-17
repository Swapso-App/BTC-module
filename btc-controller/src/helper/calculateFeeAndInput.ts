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
  let outputCount = 2;

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

  let inputs = [];
  utxos.data.data.outputs.forEach(async (element) => {
    let utxo: any = {};
    utxo.value = sb.toSatoshi(parseFloat(element.value));
    utxo.scriptPubKey = element.script;
    utxo.tx_hex = element.tx_hex;
    utxo.txid = element.hash;
    utxo.vout = element.index;
    totalAmountAvailable += utxo.value;
    inputCount += 1;
    inputs.push(utxo);
  });

  let transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;
  return { transactionSize, totalAmountAvailable, inputs };
}

export async function getFeeAndInput(
  address: string,
  network: BitcoinNetworkName,
  satPerByte: number
) {
  let { transactionSize, totalAmountAvailable, inputs } =
    await getTransactionSize(address, network);
  let fee = 0;
  // the fees assuming we want to pay 20 satoshis per byte
  fee = transactionSize * satPerByte;
  return { totalAmountAvailable, inputs, fee, transactionSize };
}

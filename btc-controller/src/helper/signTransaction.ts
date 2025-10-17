import * as bitcoin from "bitcoinjs-lib";
import { ECPairInterface } from "ecpair";
import { BitcoinNetworkName } from "../config";
import BitcoinTransactionSizeCalculator from "../../../../../utils/feesCalculator"; // update path accordingly

export async function signTransaction(
  child: ECPairInterface,
  keyPair: ECPairInterface,
  privateKey: any,
  from: string,
  to: string,
  amountToSend: number,
  satPerByte = 1,
  networkType: BitcoinNetworkName,
  network: bitcoin.networks.Network,
  freshUtxos: any[] = []
) {
  const psbt = new bitcoin.Psbt({ network });

  const {
    feeInSats,
    selectedUTXOs,
    changeAmount,
  } = await BitcoinTransactionSizeCalculator.calculateOptimalFee(from, amountToSend, satPerByte, freshUtxos);

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

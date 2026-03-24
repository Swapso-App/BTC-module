import * as bitcoin from "bitcoinjs-lib";
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
    changeAddress?: string;
}
export interface BuildMultiSigTransactionResult {
    psbt: bitcoin.Psbt;
    psbtBase64: string;
    selectedUTXOs: MultiSigInputUTXO[];
    inputCount: number;
    outputCount: number;
    totalInputValue: number;
    totalOutputValue: number;
    changeAmount: number;
}
export declare function buildMultiSigTransaction(options: BuildMultiSigTransactionOptions): BuildMultiSigTransactionResult;

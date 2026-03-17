import { BitcoinNetworkName } from "../config/index";

export type MultiSigAddressType = "p2sh" | "p2wsh" | "p2sh-p2wsh";

export interface MultiSigParticipant {
  publicKey: string;
  label?: string;
  derivationPath?: string;
}

export interface MultiSigConfig {
  requiredSignatures: number;
  totalSigners: number;
  participants: MultiSigParticipant[];
  addressType: MultiSigAddressType;
  networkType: BitcoinNetworkName;
}

export interface MultiSigUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  redeemScript?: string;
  witnessScript?: string;
}

export interface MultiSigTransactionParams {
  from: string;
  to: string;
  amount: number;
  satPerByte?: number;
  networkType: BitcoinNetworkName;
  config: MultiSigConfig;
  utxos?: MultiSigUtxo[];
}

export interface PartialMultiSigSignature {
  inputIndex: number;
  publicKey: string;
  signature: string;
}

export interface MultiSigSigningState {
  signatures: PartialMultiSigSignature[];
  collectedSignatures: number;
  requiredSignatures: number;
  isFinalized: boolean;
}

export interface MultiSigSignedTransaction extends MultiSigSigningState {
  transactionHex: string;
}
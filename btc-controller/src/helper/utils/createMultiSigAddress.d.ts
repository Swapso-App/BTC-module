import * as bitcoinjs from "bitcoinjs-lib";
export type MultiSigAddressType = "P2SH" | "P2SH-P2WSH" | "P2WSH";
export type MultiSigPublicKey = string | Buffer | Uint8Array;
export type CreateMultiSigAddressInput = {
    publicKeys: MultiSigPublicKey[];
    requiredSignatures: number;
    network: bitcoinjs.networks.Network;
    type?: MultiSigAddressType;
};
export type CreateMultiSigAddressResult = {
    type: MultiSigAddressType;
    address: string;
    redeemScript?: string;
    witnessScript?: string;
};
export declare function createMultiSigAddress(input: CreateMultiSigAddressInput): CreateMultiSigAddressResult;

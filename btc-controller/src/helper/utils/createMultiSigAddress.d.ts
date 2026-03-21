import * as bitcoinjs from 'bitcoinjs-lib';
export interface MultiSigConfig {
    publicKeys: string[];
    requiredSignatures: number;
    network?: bitcoinjs.Network;
    type?: 'P2SH' | 'P2SH-P2WSH' | 'P2WSH';
}
export interface MultiSigResult {
    address: string;
    type: string;
    redeemScript?: Buffer;
    witnessScript?: Buffer;
}
export declare function createMultiSigAddress({ publicKeys, requiredSignatures, network, type, }: MultiSigConfig): MultiSigResult;

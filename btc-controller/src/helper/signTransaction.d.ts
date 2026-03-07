import * as bitcoin from "bitcoinjs-lib";
import { ECPairInterface } from "ecpair";
import { BitcoinNetworkName } from "../config";
export declare function signTransaction(child: ECPairInterface, keyPair: ECPairInterface, privateKey: any, from: string, to: string, amountToSend: number, satPerByte: number, networkType: BitcoinNetworkName, network: bitcoin.networks.Network, freshUtxos?: any[]): Promise<string>;

import * as bitcoinjs from "bitcoinjs-lib";
import { BitcoinNetworkName } from "../../config/index";
export declare function getNetwork(_network: BitcoinNetworkName): bitcoinjs.networks.Network;

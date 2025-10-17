import * as bitcoinjs from "bitcoinjs-lib";
import { bitcoin_network, BitcoinNetworkName } from "../../config/index";

export function getNetwork(
  _network: BitcoinNetworkName
): bitcoinjs.networks.Network {
  const { MAINNET, TESTNET } = bitcoin_network;
  return _network === TESTNET.NETWORK
    ? bitcoinjs.networks.testnet
    : bitcoinjs.networks.bitcoin;
}

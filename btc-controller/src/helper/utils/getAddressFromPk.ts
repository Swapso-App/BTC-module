import * as bitcoinjs from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";

export function getAddressFromPk(privateKeyHex, network, index?) {
  const ECPair = ECPairFactory(ecc);
  const ec_pair = ECPair.fromWIF(privateKeyHex, network);
  const { address } = bitcoinjs.payments.p2wpkh({
    network,
    // pubkey: ec_pair.publicKey,
  });
  return address;
}

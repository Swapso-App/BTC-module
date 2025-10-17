import ObservableStore from "obs-store";

import * as bitcoinjs from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import * as ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory, { ECPairInterface } from "ecpair";

import bitcoinMessage from "bitcoinjs-message";
import * as bip39 from "bip39";
import { randomBytes } from "crypto";
import axios from "axios";
import * as helpers from "./helper/index";

import { bitcoin, bitcoin_network, BitcoinNetworkName } from "./config/index";

const { HD_PATH_MAINNET, HD_PATH_TESTNET } = bitcoin;
const { MAINNET, TESTNET } = bitcoin_network;

export class KeyringController {
  bip32: any;
  ECPair: any;
  store: any;
  importedWallets: any;

  constructor(opts: any) {
    this.bip32 = BIP32Factory(ecc);
    this.ECPair = ECPairFactory(ecc);
    this.store = new ObservableStore({
      mnemonic: opts.mnemonic,
      hdPath: opts.network === TESTNET.NETWORK ? HD_PATH_TESTNET : HD_PATH_MAINNET,
      network: helpers.utils.getNetwork(opts.network),
      networkType: opts.network ? opts.network : MAINNET.NETWORK,
      wallet: null,
      address: [],
    });
    this.generateWallet();
    this.importedWallets = [];
  }

  private derivedChild(bip32RootKey: any, hdPath: any, index: number) {
    const path = `${hdPath}/${index}`;
    return bip32RootKey.derivePath(path);
  }

  private toHexString(byteArray: any) {
    return Array.prototype.map
      .call(byteArray, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2))
      .join("");
  }

  private toByteArray(hexString: string) {
    const result = [];
    for (let i = 0; i < hexString.length; i += 2) {
      result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return result;
  }

  generateWallet() {
    const { mnemonic, network, hdPath } = this.store.getState();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32RootKey = this.bip32.fromSeed(seed, network);
    this.updatePersistentStore({ wallet: bip32RootKey });
    return bip32RootKey;
  }

  async addAccount() {
    const { wallet, network, address, hdPath } = this.store.getState();
    const child = this.derivedChild(wallet, hdPath, address.length);

    const { address: _address } = bitcoinjs.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network,
    });

    this.persistAllAddress(_address);
    return { address: _address };
  }

  async getAccounts() {
    const { address } = this.store.getState();
    return address;
  }

  async exportPrivateKey(_address: string) {
    const { wallet, network, address, hdPath } = this.store.getState();
    const idx = address.indexOf(_address);
    if (idx < 0) throw "Invalid address, the address is not available in the wallet";

    const child = this.derivedChild(wallet, hdPath, idx);
    const keyPair = this.ECPair.fromWIF(child.toWIF(), network);
    return { privateKey: this.toHexString(keyPair.privateKey) };
  }

  async importWallet(_privateKey: string) {
    try {
      const { network } = this.store.getState();
      const address = helpers.utils.getAddressFromPk(_privateKey, network);
      this.importedWallets.push(address);
      return address;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async fetchFreshUtxos(address: string, networkType: string) {
    const baseUrl =
      networkType === "MAINNET"
        ? "https://blockstream.info/api"
        : "https://blockstream.info/testnet/api";

    const response = await fetch(`${baseUrl}/address/${address}/utxo`);
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
    }

    const utxos = await response.json();

    const detailedUtxos = await Promise.all(
      utxos.map(async (utxo) => {
        const txResponse = await fetch(`${baseUrl}/tx/${utxo.txid}`);
        const txData = await txResponse.json();
        const vout = txData.vout[utxo.vout];
        return {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: vout.scriptpubkey,
        };
      })
    );

    return detailedUtxos;
  }

  async signTransaction(transaction) {
    const { wallet, network, address, networkType, hdPath } = this.store.getState();
    const { from, to, amount, satPerByte: sat } = transaction;
    let satPerByte = sat;

    if (!satPerByte) {
      const data = await this.getFees(transaction);
      satPerByte = data.fees.fast.satPerByte;
    }

    const idx = address.indexOf(from);
    if (idx < 0) throw "Invalid address, the address is not available in the wallet";

    const child: ECPairInterface = this.derivedChild(wallet, hdPath, idx);
    const keyPair: ECPairInterface = this.ECPair.fromWIF(child.toWIF(), network);
    const privateKey = keyPair.privateKey;
    const freshUtxos = await this.fetchFreshUtxos(from, networkType);

    try {
      const signedTransaction = await helpers.signTransaction(
        child,
        keyPair,
        privateKey,
        from,
        to,
        amount,
        satPerByte,
        networkType,
        network,
        freshUtxos
      );
      return { signedTransaction };
    } catch (err) {
      throw err;
    }
  }

  async signMessage(message: string, _address: string, privateKey = null) {
    const { wallet, network, address, hdPath } = this.store.getState();

    if (!privateKey) {
      const idx = address.indexOf(_address);
      if (idx < 0) throw "Invalid address, the address is not available in the wallet";

      try {
        const child = this.derivedChild(wallet, hdPath, idx);
        const keyPair = this.ECPair.fromWIF(child.toWIF(), network);
        const signature = bitcoinMessage.sign(
          message,
          Buffer.from(keyPair.privateKey),
          keyPair.compressed,
          { segwitType: "p2wpkh", extraEntropy: randomBytes(32) }
        );
        return { signedMessage: signature.toString("base64") };
      } catch (err) {
        throw err;
      }
    } else {
      const keyPair = this.ECPair.fromPrivateKey(
        new Uint8Array(this.toByteArray(privateKey))
      );
      const signature = bitcoinMessage.sign(
        message,
        Buffer.from(keyPair.privateKey),
        keyPair.compressed,
        { segwitType: "p2wpkh", extraEntropy: randomBytes(32) }
      );
      return { signedMessage: signature.toString("base64") };
    }
  }

  async sendTransaction(TransactionHex: string) {
    const { networkType } = this.store.getState();
    try {
      const response = await fetch(`https://app.swapso.io/api/bitcoin/send-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkType,
          transactionHex: TransactionHex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        transactionDetails: result.hash || result.data,
      };
    } catch (err) {
      console.error("SendTransaction error:", err);
      throw err;
    }
  }

  async getFees(rawTransaction) {
    const { networkType } = this.store.getState();
    const { from } = rawTransaction;

    try {
      const response = await axios(`/api/bitcoin/network-info?network=${networkType}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const blocks = response.data.data["mempool"].blocks.slice(0, 3);

      const fees = {
        slow: { satPerByte: parseInt(blocks[2].median_fee_rate) },
        standard: { satPerByte: parseInt(blocks[1].median_fee_rate) },
        fast: { satPerByte: parseInt(blocks[0].median_fee_rate) },
      };

      const { transactionSize } = await helpers.getTransactionSize(from, networkType);

      return {
        transactionSize,
        fees,
      };
    } catch (err) {
      throw err;
    }
  }

  persistAllAddress(_address: string) {
    const { address } = this.store.getState();
    const newAdd = [...address, _address];
    this.store.updateState({ address: newAdd });
    return true;
  }

  updatePersistentStore(obj: object) {
    this.store.updateState(obj);
    return true;
  }
}

export const getBalance = async (
  address: string,
  networkType: BitcoinNetworkName
) => {
  try {
    const balance = await axios(
      `/api/bitcoin/balance?address=${address}&network=${networkType}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return { balance: balance.data.data.confirmed };
  } catch (err) {
    throw err;
  }
};

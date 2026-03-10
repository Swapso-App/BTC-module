"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = exports.KeyringController = exports.TransactionVisualizer = void 0;
const obs_store_1 = __importDefault(require("obs-store"));
const bitcoinjs = __importStar(require("bitcoinjs-lib"));
const bip32_1 = __importDefault(require("bip32"));
const ecc = __importStar(require("@bitcoinerlab/secp256k1"));
const ecpair_1 = __importDefault(require("ecpair"));
const bitcoinjs_message_1 = __importDefault(require("bitcoinjs-message"));
const bip39 = __importStar(require("bip39"));
const crypto_1 = require("crypto");
const axios_1 = __importDefault(require("axios"));
const helpers = __importStar(require("./helper/index"));
const index_1 = require("./config/index");
// Export TransactionVisualizer
var transactionVisualizer_1 = require("./helper/transactionVisualizer");
Object.defineProperty(exports, "TransactionVisualizer", { enumerable: true, get: function () { return transactionVisualizer_1.TransactionVisualizer; } });
const { HD_PATH_MAINNET, HD_PATH_TESTNET } = index_1.bitcoin;
const { MAINNET, TESTNET } = index_1.bitcoin_network;
class KeyringController {
    constructor(opts) {
        this.bip32 = (0, bip32_1.default)(ecc);
        this.ECPair = (0, ecpair_1.default)(ecc);
        this.store = new obs_store_1.default({
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
    derivedChild(bip32RootKey, hdPath, index) {
        const path = `${hdPath}/${index}`;
        return bip32RootKey.derivePath(path);
    }
    toHexString(byteArray) {
        return Array.prototype.map
            .call(byteArray, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2))
            .join("");
    }
    toByteArray(hexString) {
        const result = [];
        for (let i = 0; i < hexString.length; i += 2) {
            result.push(parseInt(hexString.substr(i, 2), 16));
        }
        return result;
    }
    generateWallet() {
        const { mnemonic, network } = this.store.getState();
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
    async exportPrivateKey(_address) {
        const { wallet, network, address, hdPath } = this.store.getState();
        const idx = address.indexOf(_address);
        if (idx < 0)
            throw "Invalid address, the address is not available in the wallet";
        const child = this.derivedChild(wallet, hdPath, idx);
        const keyPair = this.ECPair.fromWIF(child.toWIF(), network);
        return { privateKey: this.toHexString(keyPair.privateKey) };
    }
    async importWallet(_privateKey) {
        try {
            const { network } = this.store.getState();
            const address = helpers.utils.getAddressFromPk(_privateKey, network);
            this.importedWallets.push(address);
            return address;
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    async fetchFreshUtxos(address, networkType) {
        const baseUrl = networkType === "MAINNET"
            ? "https://blockstream.info/api"
            : "https://blockstream.info/testnet/api";
        const response = await fetch(`${baseUrl}/address/${address}/utxo`);
        if (!response.ok) {
            throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
        }
        const utxos = await response.json();
        const detailedUtxos = await Promise.all(utxos.map(async (utxo) => {
            const txResponse = await fetch(`${baseUrl}/tx/${utxo.txid}`);
            const txData = await txResponse.json();
            const vout = txData.vout[utxo.vout];
            return {
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                scriptPubKey: vout.scriptpubkey,
            };
        }));
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
        if (idx < 0)
            throw "Invalid address, the address is not available in the wallet";
        const child = this.derivedChild(wallet, hdPath, idx);
        const keyPair = this.ECPair.fromWIF(child.toWIF(), network);
        const privateKey = keyPair.privateKey;
        const freshUtxos = await this.fetchFreshUtxos(from, networkType);
        try {
            const signedTransaction = await helpers.signTransaction(child, keyPair, privateKey, from, to, amount, satPerByte, networkType, network, freshUtxos);
            return { signedTransaction };
        }
        catch (err) {
            throw err;
        }
    }
    async signMessage(message, _address, privateKey = null) {
        const { wallet, network, address, hdPath } = this.store.getState();
        if (!privateKey) {
            const idx = address.indexOf(_address);
            if (idx < 0)
                throw "Invalid address, the address is not available in the wallet";
            try {
                const child = this.derivedChild(wallet, hdPath, idx);
                const keyPair = this.ECPair.fromWIF(child.toWIF(), network);
                const signature = bitcoinjs_message_1.default.sign(message, Buffer.from(keyPair.privateKey), keyPair.compressed, { segwitType: "p2wpkh", extraEntropy: (0, crypto_1.randomBytes)(32) });
                return { signedMessage: signature.toString("base64") };
            }
            catch (err) {
                throw err;
            }
        }
        else {
            const keyPair = this.ECPair.fromPrivateKey(new Uint8Array(this.toByteArray(privateKey)));
            const signature = bitcoinjs_message_1.default.sign(message, Buffer.from(keyPair.privateKey), keyPair.compressed, { segwitType: "p2wpkh", extraEntropy: (0, crypto_1.randomBytes)(32) });
            return { signedMessage: signature.toString("base64") };
        }
    }
    async sendTransaction(TransactionHex) {
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
        }
        catch (err) {
            console.error("SendTransaction error:", err);
            throw err;
        }
    }
    async getFees(rawTransaction) {
        const { networkType } = this.store.getState();
        const { from } = rawTransaction;
        try {
            const response = await (0, axios_1.default)(`https://app.swapso.io/api/bitcoin/network-info?network=${networkType}`, {
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
        }
        catch (err) {
            throw err;
        }
    }
    persistAllAddress(_address) {
        const { address } = this.store.getState();
        const newAdd = [...address, _address];
        this.store.updateState({ address: newAdd });
        return true;
    }
    updatePersistentStore(obj) {
        this.store.updateState(obj);
        return true;
    }
}
exports.KeyringController = KeyringController;
const getBalance = async (address, networkType) => {
    try {
        const balance = await (0, axios_1.default)(`https://app.swapso.io/api/bitcoin/balance?address=${address}&network=${networkType}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        return { balance: balance.data.data.confirmed };
    }
    catch (err) {
        throw err;
    }
};
exports.getBalance = getBalance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBd0M7QUFFeEMseURBQTJDO0FBQzNDLGtEQUFpQztBQUNqQyw2REFBK0M7QUFDL0Msb0RBQXdEO0FBRXhELDBFQUErQztBQUMvQyw2Q0FBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLGtEQUEwQjtBQUMxQix3REFBMEM7QUFFMUMsMENBQThFO0FBRTlFLCtCQUErQjtBQUMvQix3RUFBdUU7QUFBOUQsOEhBQUEscUJBQXFCLE9BQUE7QUFFOUIsTUFBTSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsR0FBRyxlQUFPLENBQUM7QUFFckQsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyx1QkFBZSxDQUFDO0FBRTdDLE1BQWEsaUJBQWlCO0lBTTVCLFlBQVksSUFBUztRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUEsZUFBWSxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxnQkFBYSxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxtQkFBZSxDQUFDO1lBQy9CLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWU7WUFDNUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDL0MsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPO1lBQzFELE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLFlBQVksQ0FBQyxZQUFpQixFQUFFLE1BQVcsRUFBRSxLQUFhO1FBQ2hFLE1BQU0sSUFBSSxHQUFHLEdBQUcsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ2xDLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRU8sV0FBVyxDQUFDLFNBQWM7UUFDaEMsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUc7YUFDdkIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2QsQ0FBQztJQUVPLFdBQVcsQ0FBQyxTQUFpQjtRQUNuQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxjQUFjO1FBQ1osTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3BELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDckQsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVO1FBQ2QsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3RELE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDcEMsT0FBTztTQUNSLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNmLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFDLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDckMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxJQUFJLEdBQUcsR0FBRyxDQUFDO1lBQUUsTUFBTSw2REFBNkQsQ0FBQztRQUVqRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFtQjtRQUNwQyxJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBZSxFQUFFLFdBQW1CO1FBQ3hELE1BQU0sT0FBTyxHQUNYLFdBQVcsS0FBSyxTQUFTO1lBQ3ZCLENBQUMsQ0FBQyw4QkFBOEI7WUFDaEMsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDO1FBRTdDLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsT0FBTyxZQUFZLE9BQU8sT0FBTyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFcEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN2QixNQUFNLFVBQVUsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLE9BQU8sT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxPQUFPO2dCQUNMLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDaEMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7UUFFRixPQUFPLGFBQWEsQ0FBQztJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxXQUFXO1FBQy9CLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoRixNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQztRQUMxRCxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFFckIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3pDLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLENBQUM7WUFBRSxNQUFNLDZEQUE2RCxDQUFDO1FBRWpGLE1BQU0sS0FBSyxHQUFvQixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEUsTUFBTSxPQUFPLEdBQW9CLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDO1lBQ0gsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxlQUFlLENBQ3JELEtBQUssRUFDTCxPQUFPLEVBQ1AsVUFBVSxFQUNWLElBQUksRUFDSixFQUFFLEVBQ0YsTUFBTSxFQUNOLFVBQVUsRUFDVixXQUFXLEVBQ1gsT0FBTyxFQUNQLFVBQVUsQ0FDWCxDQUFDO1lBQ0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUM7UUFDL0IsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFlLEVBQUUsUUFBZ0IsRUFBRSxVQUFVLEdBQUcsSUFBSTtRQUNwRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVuRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0QyxJQUFJLEdBQUcsR0FBRyxDQUFDO2dCQUFFLE1BQU0sNkRBQTZELENBQUM7WUFFakYsSUFBSSxDQUFDO2dCQUNILE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLFNBQVMsR0FBRywyQkFBYyxDQUFDLElBQUksQ0FDbkMsT0FBTyxFQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUMvQixPQUFPLENBQUMsVUFBVSxFQUNsQixFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLElBQUEsb0JBQVcsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUN4RCxDQUFDO2dCQUNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3pELENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNiLE1BQU0sR0FBRyxDQUFDO1lBQ1osQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ04sTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQ3hDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDN0MsQ0FBQztZQUNGLE1BQU0sU0FBUyxHQUFHLDJCQUFjLENBQUMsSUFBSSxDQUNuQyxPQUFPLEVBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQy9CLE9BQU8sQ0FBQyxVQUFVLEVBQ2xCLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsSUFBQSxvQkFBVyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQ3hELENBQUM7WUFDRixPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUN6RCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsY0FBc0I7UUFDMUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsb0RBQW9ELEVBQUU7Z0JBQ2pGLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsV0FBVztvQkFDWCxjQUFjLEVBQUUsY0FBYztpQkFDL0IsQ0FBQzthQUNILENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sU0FBUyxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxRQUFRLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3JGLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQyxPQUFPO2dCQUNMLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUk7YUFDL0MsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3QyxNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjO1FBQzFCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUM7UUFFaEMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFBLGVBQUssRUFBQywwREFBMEQsV0FBVyxFQUFFLEVBQUU7Z0JBQ3BHLE1BQU0sRUFBRSxLQUFLO2dCQUNiLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2lCQUNuQzthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWhFLE1BQU0sSUFBSSxHQUFHO2dCQUNYLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUN6RCxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDN0QsSUFBSSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUU7YUFDMUQsQ0FBQztZQUVGLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFFaEYsT0FBTztnQkFDTCxlQUFlO2dCQUNmLElBQUk7YUFDTCxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsUUFBZ0I7UUFDaEMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELHFCQUFxQixDQUFDLEdBQVc7UUFDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFuUUQsOENBbVFDO0FBRU0sTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUM3QixPQUFlLEVBQ2YsV0FBK0IsRUFDL0IsRUFBRTtJQUNGLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBQSxlQUFLLEVBQ3pCLHFEQUFxRCxPQUFPLFlBQVksV0FBVyxFQUFFLEVBQ3JGO1lBQ0UsTUFBTSxFQUFFLEtBQUs7WUFDYixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjthQUNuQztTQUNGLENBQ0YsQ0FBQztRQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixNQUFNLEdBQUcsQ0FBQztJQUNaLENBQUM7QUFDSCxDQUFDLENBQUM7QUFsQlcsUUFBQSxVQUFVLGNBa0JyQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBPYnNlcnZhYmxlU3RvcmUgZnJvbSBcIm9icy1zdG9yZVwiO1xyXG5cclxuaW1wb3J0ICogYXMgYml0Y29pbmpzIGZyb20gXCJiaXRjb2luanMtbGliXCI7XHJcbmltcG9ydCBCSVAzMkZhY3RvcnkgZnJvbSBcImJpcDMyXCI7XHJcbmltcG9ydCAqIGFzIGVjYyBmcm9tIFwiQGJpdGNvaW5lcmxhYi9zZWNwMjU2azFcIjtcclxuaW1wb3J0IEVDUGFpckZhY3RvcnksIHsgRUNQYWlySW50ZXJmYWNlIH0gZnJvbSBcImVjcGFpclwiO1xyXG5cclxuaW1wb3J0IGJpdGNvaW5NZXNzYWdlIGZyb20gXCJiaXRjb2luanMtbWVzc2FnZVwiO1xyXG5pbXBvcnQgKiBhcyBiaXAzOSBmcm9tIFwiYmlwMzlcIjtcclxuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tIFwiY3J5cHRvXCI7XHJcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcclxuaW1wb3J0ICogYXMgaGVscGVycyBmcm9tIFwiLi9oZWxwZXIvaW5kZXhcIjtcclxuXHJcbmltcG9ydCB7IGJpdGNvaW4sIGJpdGNvaW5fbmV0d29yaywgQml0Y29pbk5ldHdvcmtOYW1lIH0gZnJvbSBcIi4vY29uZmlnL2luZGV4XCI7XHJcblxyXG4vLyBFeHBvcnQgVHJhbnNhY3Rpb25WaXN1YWxpemVyXHJcbmV4cG9ydCB7IFRyYW5zYWN0aW9uVmlzdWFsaXplciB9IGZyb20gXCIuL2hlbHBlci90cmFuc2FjdGlvblZpc3VhbGl6ZXJcIjtcclxuXHJcbmNvbnN0IHsgSERfUEFUSF9NQUlOTkVULCBIRF9QQVRIX1RFU1RORVQgfSA9IGJpdGNvaW47XHJcblxyXG5jb25zdCB7IE1BSU5ORVQsIFRFU1RORVQgfSA9IGJpdGNvaW5fbmV0d29yaztcclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlyaW5nQ29udHJvbGxlciB7XHJcbiAgYmlwMzI6IGFueTtcclxuICBFQ1BhaXI6IGFueTtcclxuICBzdG9yZTogYW55O1xyXG4gIGltcG9ydGVkV2FsbGV0czogYW55O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRzOiBhbnkpIHtcclxuICAgIHRoaXMuYmlwMzIgPSBCSVAzMkZhY3RvcnkoZWNjKTtcclxuICAgIHRoaXMuRUNQYWlyID0gRUNQYWlyRmFjdG9yeShlY2MpO1xyXG4gICAgdGhpcy5zdG9yZSA9IG5ldyBPYnNlcnZhYmxlU3RvcmUoe1xyXG4gICAgICBtbmVtb25pYzogb3B0cy5tbmVtb25pYyxcclxuICAgICAgaGRQYXRoOiBvcHRzLm5ldHdvcmsgPT09IFRFU1RORVQuTkVUV09SSyA/IEhEX1BBVEhfVEVTVE5FVCA6IEhEX1BBVEhfTUFJTk5FVCxcclxuICAgICAgbmV0d29yazogaGVscGVycy51dGlscy5nZXROZXR3b3JrKG9wdHMubmV0d29yayksXHJcbiAgICAgIG5ldHdvcmtUeXBlOiBvcHRzLm5ldHdvcmsgPyBvcHRzLm5ldHdvcmsgOiBNQUlOTkVULk5FVFdPUkssXHJcbiAgICAgIHdhbGxldDogbnVsbCxcclxuICAgICAgYWRkcmVzczogW10sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZ2VuZXJhdGVXYWxsZXQoKTtcclxuICAgIHRoaXMuaW1wb3J0ZWRXYWxsZXRzID0gW107XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGRlcml2ZWRDaGlsZChiaXAzMlJvb3RLZXk6IGFueSwgaGRQYXRoOiBhbnksIGluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHBhdGggPSBgJHtoZFBhdGh9LyR7aW5kZXh9YDtcclxuICAgIHJldHVybiBiaXAzMlJvb3RLZXkuZGVyaXZlUGF0aChwYXRoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdG9IZXhTdHJpbmcoYnl0ZUFycmF5OiBhbnkpIHtcclxuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwXHJcbiAgICAgIC5jYWxsKGJ5dGVBcnJheSwgKGJ5dGUpID0+IChcIjBcIiArIChieXRlICYgMHhmZikudG9TdHJpbmcoMTYpKS5zbGljZSgtMikpXHJcbiAgICAgIC5qb2luKFwiXCIpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB0b0J5dGVBcnJheShoZXhTdHJpbmc6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhleFN0cmluZy5sZW5ndGg7IGkgKz0gMikge1xyXG4gICAgICByZXN1bHQucHVzaChwYXJzZUludChoZXhTdHJpbmcuc3Vic3RyKGksIDIpLCAxNikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGdlbmVyYXRlV2FsbGV0KCkge1xyXG4gICAgY29uc3QgeyBtbmVtb25pYywgbmV0d29yayB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3Qgc2VlZCA9IGJpcDM5Lm1uZW1vbmljVG9TZWVkU3luYyhtbmVtb25pYyk7XHJcbiAgICBjb25zdCBiaXAzMlJvb3RLZXkgPSB0aGlzLmJpcDMyLmZyb21TZWVkKHNlZWQsIG5ldHdvcmspO1xyXG4gICAgdGhpcy51cGRhdGVQZXJzaXN0ZW50U3RvcmUoeyB3YWxsZXQ6IGJpcDMyUm9vdEtleSB9KTtcclxuICAgIHJldHVybiBiaXAzMlJvb3RLZXk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBhZGRBY2NvdW50KCkge1xyXG4gICAgY29uc3QgeyB3YWxsZXQsIG5ldHdvcmssIGFkZHJlc3MsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgY2hpbGQgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgYWRkcmVzcy5sZW5ndGgpO1xyXG5cclxuICAgIGNvbnN0IHsgYWRkcmVzczogX2FkZHJlc3MgfSA9IGJpdGNvaW5qcy5wYXltZW50cy5wMndwa2goe1xyXG4gICAgICBwdWJrZXk6IEJ1ZmZlci5mcm9tKGNoaWxkLnB1YmxpY0tleSksXHJcbiAgICAgIG5ldHdvcmssXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnBlcnNpc3RBbGxBZGRyZXNzKF9hZGRyZXNzKTtcclxuICAgIHJldHVybiB7IGFkZHJlc3M6IF9hZGRyZXNzIH07XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRBY2NvdW50cygpIHtcclxuICAgIGNvbnN0IHsgYWRkcmVzcyB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgcmV0dXJuIGFkZHJlc3M7XHJcbiAgfVxyXG5cclxuICBhc3luYyBleHBvcnRQcml2YXRlS2V5KF9hZGRyZXNzOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHsgd2FsbGV0LCBuZXR3b3JrLCBhZGRyZXNzLCBoZFBhdGggfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IGlkeCA9IGFkZHJlc3MuaW5kZXhPZihfYWRkcmVzcyk7XHJcbiAgICBpZiAoaWR4IDwgMCkgdGhyb3cgXCJJbnZhbGlkIGFkZHJlc3MsIHRoZSBhZGRyZXNzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhlIHdhbGxldFwiO1xyXG5cclxuICAgIGNvbnN0IGNoaWxkID0gdGhpcy5kZXJpdmVkQ2hpbGQod2FsbGV0LCBoZFBhdGgsIGlkeCk7XHJcbiAgICBjb25zdCBrZXlQYWlyID0gdGhpcy5FQ1BhaXIuZnJvbVdJRihjaGlsZC50b1dJRigpLCBuZXR3b3JrKTtcclxuICAgIHJldHVybiB7IHByaXZhdGVLZXk6IHRoaXMudG9IZXhTdHJpbmcoa2V5UGFpci5wcml2YXRlS2V5KSB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgaW1wb3J0V2FsbGV0KF9wcml2YXRlS2V5OiBzdHJpbmcpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgbmV0d29yayB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgICBjb25zdCBhZGRyZXNzID0gaGVscGVycy51dGlscy5nZXRBZGRyZXNzRnJvbVBrKF9wcml2YXRlS2V5LCBuZXR3b3JrKTtcclxuICAgICAgdGhpcy5pbXBvcnRlZFdhbGxldHMucHVzaChhZGRyZXNzKTtcclxuICAgICAgcmV0dXJuIGFkZHJlc3M7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGZldGNoRnJlc2hVdHhvcyhhZGRyZXNzOiBzdHJpbmcsIG5ldHdvcmtUeXBlOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGJhc2VVcmwgPVxyXG4gICAgICBuZXR3b3JrVHlwZSA9PT0gXCJNQUlOTkVUXCJcclxuICAgICAgICA/IFwiaHR0cHM6Ly9ibG9ja3N0cmVhbS5pbmZvL2FwaVwiXHJcbiAgICAgICAgOiBcImh0dHBzOi8vYmxvY2tzdHJlYW0uaW5mby90ZXN0bmV0L2FwaVwiO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYWRkcmVzcy8ke2FkZHJlc3N9L3V0eG9gKTtcclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggVVRYT3M6ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1dHhvcyA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICBjb25zdCBkZXRhaWxlZFV0eG9zID0gYXdhaXQgUHJvbWlzZS5hbGwoXHJcbiAgICAgIHV0eG9zLm1hcChhc3luYyAodXR4bykgPT4ge1xyXG4gICAgICAgIGNvbnN0IHR4UmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS90eC8ke3V0eG8udHhpZH1gKTtcclxuICAgICAgICBjb25zdCB0eERhdGEgPSBhd2FpdCB0eFJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICBjb25zdCB2b3V0ID0gdHhEYXRhLnZvdXRbdXR4by52b3V0XTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdHhpZDogdXR4by50eGlkLFxyXG4gICAgICAgICAgdm91dDogdXR4by52b3V0LFxyXG4gICAgICAgICAgdmFsdWU6IHV0eG8udmFsdWUsXHJcbiAgICAgICAgICBzY3JpcHRQdWJLZXk6IHZvdXQuc2NyaXB0cHVia2V5LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiBkZXRhaWxlZFV0eG9zO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2lnblRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKSB7XHJcbiAgICBjb25zdCB7IHdhbGxldCwgbmV0d29yaywgYWRkcmVzcywgbmV0d29ya1R5cGUsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgeyBmcm9tLCB0bywgYW1vdW50LCBzYXRQZXJCeXRlOiBzYXQgfSA9IHRyYW5zYWN0aW9uO1xyXG4gICAgbGV0IHNhdFBlckJ5dGUgPSBzYXQ7XHJcblxyXG4gICAgaWYgKCFzYXRQZXJCeXRlKSB7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmdldEZlZXModHJhbnNhY3Rpb24pO1xyXG4gICAgICBzYXRQZXJCeXRlID0gZGF0YS5mZWVzLmZhc3Quc2F0UGVyQnl0ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpZHggPSBhZGRyZXNzLmluZGV4T2YoZnJvbSk7XHJcbiAgICBpZiAoaWR4IDwgMCkgdGhyb3cgXCJJbnZhbGlkIGFkZHJlc3MsIHRoZSBhZGRyZXNzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhlIHdhbGxldFwiO1xyXG5cclxuICAgIGNvbnN0IGNoaWxkOiBFQ1BhaXJJbnRlcmZhY2UgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgaWR4KTtcclxuICAgIGNvbnN0IGtleVBhaXI6IEVDUGFpckludGVyZmFjZSA9IHRoaXMuRUNQYWlyLmZyb21XSUYoY2hpbGQudG9XSUYoKSwgbmV0d29yayk7XHJcbiAgICBjb25zdCBwcml2YXRlS2V5ID0ga2V5UGFpci5wcml2YXRlS2V5O1xyXG4gICAgY29uc3QgZnJlc2hVdHhvcyA9IGF3YWl0IHRoaXMuZmV0Y2hGcmVzaFV0eG9zKGZyb20sIG5ldHdvcmtUeXBlKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzaWduZWRUcmFuc2FjdGlvbiA9IGF3YWl0IGhlbHBlcnMuc2lnblRyYW5zYWN0aW9uKFxyXG4gICAgICAgIGNoaWxkLFxyXG4gICAgICAgIGtleVBhaXIsXHJcbiAgICAgICAgcHJpdmF0ZUtleSxcclxuICAgICAgICBmcm9tLFxyXG4gICAgICAgIHRvLFxyXG4gICAgICAgIGFtb3VudCxcclxuICAgICAgICBzYXRQZXJCeXRlLFxyXG4gICAgICAgIG5ldHdvcmtUeXBlLFxyXG4gICAgICAgIG5ldHdvcmssXHJcbiAgICAgICAgZnJlc2hVdHhvc1xyXG4gICAgICApO1xyXG4gICAgICByZXR1cm4geyBzaWduZWRUcmFuc2FjdGlvbiB9O1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHNpZ25NZXNzYWdlKG1lc3NhZ2U6IHN0cmluZywgX2FkZHJlc3M6IHN0cmluZywgcHJpdmF0ZUtleSA9IG51bGwpIHtcclxuICAgIGNvbnN0IHsgd2FsbGV0LCBuZXR3b3JrLCBhZGRyZXNzLCBoZFBhdGggfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuXHJcbiAgICBpZiAoIXByaXZhdGVLZXkpIHtcclxuICAgICAgY29uc3QgaWR4ID0gYWRkcmVzcy5pbmRleE9mKF9hZGRyZXNzKTtcclxuICAgICAgaWYgKGlkeCA8IDApIHRocm93IFwiSW52YWxpZCBhZGRyZXNzLCB0aGUgYWRkcmVzcyBpcyBub3QgYXZhaWxhYmxlIGluIHRoZSB3YWxsZXRcIjtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgY2hpbGQgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgaWR4KTtcclxuICAgICAgICBjb25zdCBrZXlQYWlyID0gdGhpcy5FQ1BhaXIuZnJvbVdJRihjaGlsZC50b1dJRigpLCBuZXR3b3JrKTtcclxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBiaXRjb2luTWVzc2FnZS5zaWduKFxyXG4gICAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICAgIEJ1ZmZlci5mcm9tKGtleVBhaXIucHJpdmF0ZUtleSksXHJcbiAgICAgICAgICBrZXlQYWlyLmNvbXByZXNzZWQsXHJcbiAgICAgICAgICB7IHNlZ3dpdFR5cGU6IFwicDJ3cGtoXCIsIGV4dHJhRW50cm9weTogcmFuZG9tQnl0ZXMoMzIpIH1cclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiB7IHNpZ25lZE1lc3NhZ2U6IHNpZ25hdHVyZS50b1N0cmluZyhcImJhc2U2NFwiKSB9O1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IGtleVBhaXIgPSB0aGlzLkVDUGFpci5mcm9tUHJpdmF0ZUtleShcclxuICAgICAgICBuZXcgVWludDhBcnJheSh0aGlzLnRvQnl0ZUFycmF5KHByaXZhdGVLZXkpKVxyXG4gICAgICApO1xyXG4gICAgICBjb25zdCBzaWduYXR1cmUgPSBiaXRjb2luTWVzc2FnZS5zaWduKFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgQnVmZmVyLmZyb20oa2V5UGFpci5wcml2YXRlS2V5KSxcclxuICAgICAgICBrZXlQYWlyLmNvbXByZXNzZWQsXHJcbiAgICAgICAgeyBzZWd3aXRUeXBlOiBcInAyd3BraFwiLCBleHRyYUVudHJvcHk6IHJhbmRvbUJ5dGVzKDMyKSB9XHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybiB7IHNpZ25lZE1lc3NhZ2U6IHNpZ25hdHVyZS50b1N0cmluZyhcImJhc2U2NFwiKSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2VuZFRyYW5zYWN0aW9uKFRyYW5zYWN0aW9uSGV4OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHsgbmV0d29ya1R5cGUgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBwLnN3YXBzby5pby9hcGkvYml0Y29pbi9zZW5kLXRyYW5zYWN0aW9uYCwge1xyXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBuZXR3b3JrVHlwZSxcclxuICAgICAgICAgIHRyYW5zYWN0aW9uSGV4OiBUcmFuc2FjdGlvbkhleCxcclxuICAgICAgICB9KSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEubWVzc2FnZSB8fCBlcnJvckRhdGEuZXJyb3IgfHwgYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0cmFuc2FjdGlvbkRldGFpbHM6IHJlc3VsdC5oYXNoIHx8IHJlc3VsdC5kYXRhLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTZW5kVHJhbnNhY3Rpb24gZXJyb3I6XCIsIGVycik7XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdldEZlZXMocmF3VHJhbnNhY3Rpb24pIHtcclxuICAgIGNvbnN0IHsgbmV0d29ya1R5cGUgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IHsgZnJvbSB9ID0gcmF3VHJhbnNhY3Rpb247XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcyhgaHR0cHM6Ly9hcHAuc3dhcHNvLmlvL2FwaS9iaXRjb2luL25ldHdvcmstaW5mbz9uZXR3b3JrPSR7bmV0d29ya1R5cGV9YCwge1xyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGJsb2NrcyA9IHJlc3BvbnNlLmRhdGEuZGF0YVtcIm1lbXBvb2xcIl0uYmxvY2tzLnNsaWNlKDAsIDMpO1xyXG5cclxuICAgICAgY29uc3QgZmVlcyA9IHtcclxuICAgICAgICBzbG93OiB7IHNhdFBlckJ5dGU6IHBhcnNlSW50KGJsb2Nrc1syXS5tZWRpYW5fZmVlX3JhdGUpIH0sXHJcbiAgICAgICAgc3RhbmRhcmQ6IHsgc2F0UGVyQnl0ZTogcGFyc2VJbnQoYmxvY2tzWzFdLm1lZGlhbl9mZWVfcmF0ZSkgfSxcclxuICAgICAgICBmYXN0OiB7IHNhdFBlckJ5dGU6IHBhcnNlSW50KGJsb2Nrc1swXS5tZWRpYW5fZmVlX3JhdGUpIH0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCB7IHRyYW5zYWN0aW9uU2l6ZSB9ID0gYXdhaXQgaGVscGVycy5nZXRUcmFuc2FjdGlvblNpemUoZnJvbSwgbmV0d29ya1R5cGUpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0cmFuc2FjdGlvblNpemUsXHJcbiAgICAgICAgZmVlcyxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwZXJzaXN0QWxsQWRkcmVzcyhfYWRkcmVzczogc3RyaW5nKSB7XHJcbiAgICBjb25zdCB7IGFkZHJlc3MgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IG5ld0FkZCA9IFsuLi5hZGRyZXNzLCBfYWRkcmVzc107XHJcbiAgICB0aGlzLnN0b3JlLnVwZGF0ZVN0YXRlKHsgYWRkcmVzczogbmV3QWRkIH0pO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQZXJzaXN0ZW50U3RvcmUob2JqOiBvYmplY3QpIHtcclxuICAgIHRoaXMuc3RvcmUudXBkYXRlU3RhdGUob2JqKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGdldEJhbGFuY2UgPSBhc3luYyAoXHJcbiAgYWRkcmVzczogc3RyaW5nLFxyXG4gIG5ldHdvcmtUeXBlOiBCaXRjb2luTmV0d29ya05hbWVcclxuKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJhbGFuY2UgPSBhd2FpdCBheGlvcyhcclxuICAgICAgYGh0dHBzOi8vYXBwLnN3YXBzby5pby9hcGkvYml0Y29pbi9iYWxhbmNlP2FkZHJlc3M9JHthZGRyZXNzfSZuZXR3b3JrPSR7bmV0d29ya1R5cGV9YCxcclxuICAgICAge1xyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHsgYmFsYW5jZTogYmFsYW5jZS5kYXRhLmRhdGEuY29uZmlybWVkIH07XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICB0aHJvdyBlcnI7XHJcbiAgfVxyXG59O1xyXG4iXX0=
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBd0M7QUFFeEMseURBQTJDO0FBQzNDLGtEQUFpQztBQUNqQyw2REFBK0M7QUFDL0Msb0RBQXdEO0FBRXhELDBFQUErQztBQUMvQyw2Q0FBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLGtEQUEwQjtBQUMxQix3REFBMEM7QUFFMUMsMENBQThFO0FBRTlFLCtCQUErQjtBQUMvQix3RUFBdUU7QUFBOUQsOEhBQUEscUJBQXFCLE9BQUE7QUFFOUIsTUFBTSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsR0FBRyxlQUFPLENBQUM7QUFFckQsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyx1QkFBZSxDQUFDO0FBRTdDLE1BQWEsaUJBQWlCO0lBTTVCLFlBQVksSUFBUztRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUEsZUFBWSxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxnQkFBYSxFQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxtQkFBZSxDQUFDO1lBQy9CLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWU7WUFDNUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDL0MsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPO1lBQzFE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O0FBQ0gsQ0FBQyxDQUFDO0FBbEJXLFFBQUEsVUFBVSxjQWtCckIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgT2JzZXJ2YWJsZVN0b3JlIGZyb20gXCJvYnMtc3RvcmVcIjtcclxuXHJcbmltcG9ydCAqIGFzIGJpdGNvaW5qcyBmcm9tIFwiYml0Y29pbmpzLWxpYlwiO1xyXG5pbXBvcnQgQklQMzJGYWN0b3J5IGZyb20gXCJiaXAzMlwiO1xyXG5pbXBvcnQgKiBhcyBlY2MgZnJvbSBcIkBiaXRjb2luZXJsYWIvc2VjcDI1NmsxXCI7XHJcbmltcG9ydCBFQ1BhaXJGYWN0b3J5LCB7IEVDUGFpckludGVyZmFjZSB9IGZyb20gXCJlY3BhaXJcIjtcclxuXHJcbmltcG9ydCBiaXRjb2luTWVzc2FnZSBmcm9tIFwiYml0Y29pbmpzLW1lc3NhZ2VcIjtcclxuaW1wb3J0ICogYXMgYmlwMzkgZnJvbSBcImJpcDM5XCI7XHJcbmltcG9ydCB7IHJhbmRvbUJ5dGVzIH0gZnJvbSBcImNyeXB0b1wiO1xyXG5pbXBvcnQgYXhpb3MgZnJvbSBcImF4aW9zXCI7XHJcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSBcIi4vaGVscGVyL2luZGV4XCI7XHJcblxyXG5pbXBvcnQgeyBiaXRjb2luLCBiaXRjb2luX25ldHdvcmssIEJpdGNvaW5OZXR3b3JrTmFtZSB9IGZyb20gXCIuL2NvbmZpZy9pbmRleFwiO1xyXG5cclxuLy8gRXhwb3J0IFRyYW5zYWN0aW9uVmlzdWFsaXplclxyXG5leHBvcnQgeyBUcmFuc2FjdGlvblZpc3VhbGl6ZXIgfSBmcm9tIFwiLi9oZWxwZXIvdHJhbnNhY3Rpb25WaXN1YWxpemVyXCI7XHJcblxyXG5jb25zdCB7IEhEX1BBVEhfTUFJTk5FVCwgSERfUEFUSF9URVNUTkVUIH0gPSBiaXRjb2luO1xyXG5cclxuY29uc3QgeyBNQUlOTkVULCBURVNUTkVUIH0gPSBiaXRjb2luX25ldHdvcms7XHJcblxyXG5leHBvcnQgY2xhc3MgS2V5cmluZ0NvbnRyb2xsZXIge1xyXG4gIGJpcDMyOiBhbnk7XHJcbiAgRUNQYWlyOiBhbnk7XHJcbiAgc3RvcmU6IGFueTtcclxuICBpbXBvcnRlZFdhbGxldHM6IGFueTtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0czogYW55KSB7XHJcbiAgICB0aGlzLmJpcDMyID0gQklQMzJGYWN0b3J5KGVjYyk7XHJcbiAgICB0aGlzLkVDUGFpciA9IEVDUGFpckZhY3RvcnkoZWNjKTtcclxuICAgIHRoaXMuc3RvcmUgPSBuZXcgT2JzZXJ2YWJsZVN0b3JlKHtcclxuICAgICAgbW5lbW9uaWM6IG9wdHMubW5lbW9uaWMsXHJcbiAgICAgIGhkUGF0aDogb3B0cy5uZXR3b3JrID09PSBURVNUTkVULk5FVFdPUksgPyBIRF9QQVRIX1RFU1RORVQgOiBIRF9QQVRIX01BSU5ORVQsXHJcbiAgICAgIG5ldHdvcms6IGhlbHBlcnMudXRpbHMuZ2V0TmV0d29yayhvcHRzLm5ldHdvcmspLFxyXG4gICAgICBuZXR3b3JrVHlwZTogb3B0cy5uZXR3b3JrID8gb3B0cy5uZXR3b3JrIDogTUFJTk5FVC5ORVRXT1JLLFxyXG4gICAgICB3YWxsZXQ6IG51bGwsXHJcbiAgICAgIGFkZHJlc3M6IFtdLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmdlbmVyYXRlV2FsbGV0KCk7XHJcbiAgICB0aGlzLmltcG9ydGVkV2FsbGV0cyA9IFtdO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBkZXJpdmVkQ2hpbGQoYmlwMzJSb290S2V5OiBhbnksIGhkUGF0aDogYW55LCBpbmRleDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwYXRoID0gYCR7aGRQYXRofS8ke2luZGV4fWA7XHJcbiAgICByZXR1cm4gYmlwMzJSb290S2V5LmRlcml2ZVBhdGgocGF0aCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHRvSGV4U3RyaW5nKGJ5dGVBcnJheTogYW55KSB7XHJcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcFxyXG4gICAgICAuY2FsbChieXRlQXJyYXksIChieXRlKSA9PiAoXCIwXCIgKyAoYnl0ZSAmIDB4ZmYpLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpKVxyXG4gICAgICAuam9pbihcIlwiKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdG9CeXRlQXJyYXkoaGV4U3RyaW5nOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoZXhTdHJpbmcubGVuZ3RoOyBpICs9IDIpIHtcclxuICAgICAgcmVzdWx0LnB1c2gocGFyc2VJbnQoaGV4U3RyaW5nLnN1YnN0cihpLCAyKSwgMTYpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBnZW5lcmF0ZVdhbGxldCgpIHtcclxuICAgIGNvbnN0IHsgbW5lbW9uaWMsIG5ldHdvcmssIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3Qgc2VlZCA9IGJpcDM5Lm1uZW1vbmljVG9TZWVkU3luYyhtbmVtb25pYyk7XHJcbiAgICBjb25zdCBiaXAzMlJvb3RLZXkgPSB0aGlzLmJpcDMyLmZyb21TZWVkKHNlZWQsIG5ldHdvcmspO1xyXG4gICAgdGhpcy51cGRhdGVQZXJzaXN0ZW50U3RvcmUoeyB3YWxsZXQ6IGJpcDMyUm9vdEtleSB9KTtcclxuICAgIHJldHVybiBiaXAzMlJvb3RLZXk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBhZGRBY2NvdW50KCkge1xyXG4gICAgY29uc3QgeyB3YWxsZXQsIG5ldHdvcmssIGFkZHJlc3MsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgY2hpbGQgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgYWRkcmVzcy5sZW5ndGgpO1xyXG5cclxuICAgIGNvbnN0IHsgYWRkcmVzczogX2FkZHJlc3MgfSA9IGJpdGNvaW5qcy5wYXltZW50cy5wMndwa2goe1xyXG4gICAgICBwdWJrZXk6IEJ1ZmZlci5mcm9tKGNoaWxkLnB1YmxpY0tleSksXHJcbiAgICAgIG5ldHdvcmssXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnBlcnNpc3RBbGxBZGRyZXNzKF9hZGRyZXNzKTtcclxuICAgIHJldHVybiB7IGFkZHJlc3M6IF9hZGRyZXNzIH07XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRBY2NvdW50cygpIHtcclxuICAgIGNvbnN0IHsgYWRkcmVzcyB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgcmV0dXJuIGFkZHJlc3M7XHJcbiAgfVxyXG5cclxuICBhc3luYyBleHBvcnRQcml2YXRlS2V5KF9hZGRyZXNzOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHsgd2FsbGV0LCBuZXR3b3JrLCBhZGRyZXNzLCBoZFBhdGggfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IGlkeCA9IGFkZHJlc3MuaW5kZXhPZihfYWRkcmVzcyk7XHJcbiAgICBpZiAoaWR4IDwgMCkgdGhyb3cgXCJJbnZhbGlkIGFkZHJlc3MsIHRoZSBhZGRyZXNzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhlIHdhbGxldFwiO1xyXG5cclxuICAgIGNvbnN0IGNoaWxkID0gdGhpcy5kZXJpdmVkQ2hpbGQod2FsbGV0LCBoZFBhdGgsIGlkeCk7XHJcbiAgICBjb25zdCBrZXlQYWlyID0gdGhpcy5FQ1BhaXIuZnJvbVdJRihjaGlsZC50b1dJRigpLCBuZXR3b3JrKTtcclxuICAgIHJldHVybiB7IHByaXZhdGVLZXk6IHRoaXMudG9IZXhTdHJpbmcoa2V5UGFpci5wcml2YXRlS2V5KSB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgaW1wb3J0V2FsbGV0KF9wcml2YXRlS2V5OiBzdHJpbmcpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgbmV0d29yayB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgICBjb25zdCBhZGRyZXNzID0gaGVscGVycy51dGlscy5nZXRBZGRyZXNzRnJvbVBrKF9wcml2YXRlS2V5LCBuZXR3b3JrKTtcclxuICAgICAgdGhpcy5pbXBvcnRlZFdhbGxldHMucHVzaChhZGRyZXNzKTtcclxuICAgICAgcmV0dXJuIGFkZHJlc3M7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGZldGNoRnJlc2hVdHhvcyhhZGRyZXNzOiBzdHJpbmcsIG5ldHdvcmtUeXBlOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGJhc2VVcmwgPVxyXG4gICAgICBuZXR3b3JrVHlwZSA9PT0gXCJNQUlOTkVUXCJcclxuICAgICAgICA/IFwiaHR0cHM6Ly9ibG9ja3N0cmVhbS5pbmZvL2FwaVwiXHJcbiAgICAgICAgOiBcImh0dHBzOi8vYmxvY2tzdHJlYW0uaW5mby90ZXN0bmV0L2FwaVwiO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vYWRkcmVzcy8ke2FkZHJlc3N9L3V0eG9gKTtcclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggVVRYT3M6ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1dHhvcyA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICBjb25zdCBkZXRhaWxlZFV0eG9zID0gYXdhaXQgUHJvbWlzZS5hbGwoXHJcbiAgICAgIHV0eG9zLm1hcChhc3luYyAodXR4bykgPT4ge1xyXG4gICAgICAgIGNvbnN0IHR4UmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS90eC8ke3V0eG8udHhpZH1gKTtcclxuICAgICAgICBjb25zdCB0eERhdGEgPSBhd2FpdCB0eFJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICBjb25zdCB2b3V0ID0gdHhEYXRhLnZvdXRbdXR4by52b3V0XTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdHhpZDogdXR4by50eGlkLFxyXG4gICAgICAgICAgdm91dDogdXR4by52b3V0LFxyXG4gICAgICAgICAgdmFsdWU6IHV0eG8udmFsdWUsXHJcbiAgICAgICAgICBzY3JpcHRQdWJLZXk6IHZvdXQuc2NyaXB0cHVia2V5LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiBkZXRhaWxlZFV0eG9zO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2lnblRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKSB7XHJcbiAgICBjb25zdCB7IHdhbGxldCwgbmV0d29yaywgYWRkcmVzcywgbmV0d29ya1R5cGUsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgeyBmcm9tLCB0bywgYW1vdW50LCBzYXRQZXJCeXRlOiBzYXQgfSA9IHRyYW5zYWN0aW9uO1xyXG4gICAgbGV0IHNhdFBlckJ5dGUgPSBzYXQ7XHJcblxyXG4gICAgaWYgKCFzYXRQZXJCeXRlKSB7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmdldEZlZXModHJhbnNhY3Rpb24pO1xyXG4gICAgICBzYXRQZXJCeXRlID0gZGF0YS5mZWVzLmZhc3Quc2F0UGVyQnl0ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpZHggPSBhZGRyZXNzLmluZGV4T2YoZnJvbSk7XHJcbiAgICBpZiAoaWR4IDwgMCkgdGhyb3cgXCJJbnZhbGlkIGFkZHJlc3MsIHRoZSBhZGRyZXNzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhlIHdhbGxldFwiO1xyXG5cclxuICAgIGNvbnN0IGNoaWxkOiBFQ1BhaXJJbnRlcmZhY2UgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgaWR4KTtcclxuICAgIGNvbnN0IGtleVBhaXI6IEVDUGFpckludGVyZmFjZSA9IHRoaXMuRUNQYWlyLmZyb21XSUYoY2hpbGQudG9XSUYoKSwgbmV0d29yayk7XHJcbiAgICBjb25zdCBwcml2YXRlS2V5ID0ga2V5UGFpci5wcml2YXRlS2V5O1xyXG4gICAgY29uc3QgZnJlc2hVdHhvcyA9IGF3YWl0IHRoaXMuZmV0Y2hGcmVzaFV0eG9zKGZyb20sIG5ldHdvcmtUeXBlKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzaWduZWRUcmFuc2FjdGlvbiA9IGF3YWl0IGhlbHBlcnMuc2lnblRyYW5zYWN0aW9uKFxyXG4gICAgICAgIGNoaWxkLFxyXG4gICAgICAgIGtleVBhaXIsXHJcbiAgICAgICAgcHJpdmF0ZUtleSxcclxuICAgICAgICBmcm9tLFxyXG4gICAgICAgIHRvLFxyXG4gICAgICAgIGFtb3VudCxcclxuICAgICAgICBzYXRQZXJCeXRlLFxyXG4gICAgICAgIG5ldHdvcmtUeXBlLFxyXG4gICAgICAgIG5ldHdvcmssXHJcbiAgICAgICAgZnJlc2hVdHhvc1xyXG4gICAgICApO1xyXG4gICAgICByZXR1cm4geyBzaWduZWRUcmFuc2FjdGlvbiB9O1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHNpZ25NZXNzYWdlKG1lc3NhZ2U6IHN0cmluZywgX2FkZHJlc3M6IHN0cmluZywgcHJpdmF0ZUtleSA9IG51bGwpIHtcclxuICAgIGNvbnN0IHsgd2FsbGV0LCBuZXR3b3JrLCBhZGRyZXNzLCBoZFBhdGggfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuXHJcbiAgICBpZiAoIXByaXZhdGVLZXkpIHtcclxuICAgICAgY29uc3QgaWR4ID0gYWRkcmVzcy5pbmRleE9mKF9hZGRyZXNzKTtcclxuICAgICAgaWYgKGlkeCA8IDApIHRocm93IFwiSW52YWxpZCBhZGRyZXNzLCB0aGUgYWRkcmVzcyBpcyBub3QgYXZhaWxhYmxlIGluIHRoZSB3YWxsZXRcIjtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgY2hpbGQgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgaWR4KTtcclxuICAgICAgICBjb25zdCBrZXlQYWlyID0gdGhpcy5FQ1BhaXIuZnJvbVdJRihjaGlsZC50b1dJRigpLCBuZXR3b3JrKTtcclxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBiaXRjb2luTWVzc2FnZS5zaWduKFxyXG4gICAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICAgIEJ1ZmZlci5mcm9tKGtleVBhaXIucHJpdmF0ZUtleSksXHJcbiAgICAgICAgICBrZXlQYWlyLmNvbXByZXNzZWQsXHJcbiAgICAgICAgICB7IHNlZ3dpdFR5cGU6IFwicDJ3cGtoXCIsIGV4dHJhRW50cm9weTogcmFuZG9tQnl0ZXMoMzIpIH1cclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiB7IHNpZ25lZE1lc3NhZ2U6IHNpZ25hdHVyZS50b1N0cmluZyhcImJhc2U2NFwiKSB9O1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IGtleVBhaXIgPSB0aGlzLkVDUGFpci5mcm9tUHJpdmF0ZUtleShcclxuICAgICAgICBuZXcgVWludDhBcnJheSh0aGlzLnRvQnl0ZUFycmF5KHByaXZhdGVLZXkpKVxyXG4gICAgICApO1xyXG4gICAgICBjb25zdCBzaWduYXR1cmUgPSBiaXRjb2luTWVzc2FnZS5zaWduKFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgQnVmZmVyLmZyb20oa2V5UGFpci5wcml2YXRlS2V5KSxcclxuICAgICAgICBrZXlQYWlyLmNvbXByZXNzZWQsXHJcbiAgICAgICAgeyBzZWd3aXRUeXBlOiBcInAyd3BraFwiLCBleHRyYUVudHJvcHk6IHJhbmRvbUJ5dGVzKDMyKSB9XHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybiB7IHNpZ25lZE1lc3NhZ2U6IHNpZ25hdHVyZS50b1N0cmluZyhcImJhc2U2NFwiKSB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2VuZFRyYW5zYWN0aW9uKFRyYW5zYWN0aW9uSGV4OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHsgbmV0d29ya1R5cGUgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBwLnN3YXBzby5pby9hcGkvYml0Y29pbi9zZW5kLXRyYW5zYWN0aW9uYCwge1xyXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBuZXR3b3JrVHlwZSxcclxuICAgICAgICAgIHRyYW5zYWN0aW9uSGV4OiBUcmFuc2FjdGlvbkhleCxcclxuICAgICAgICB9KSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEubWVzc2FnZSB8fCBlcnJvckRhdGEuZXJyb3IgfHwgYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0cmFuc2FjdGlvbkRldGFpbHM6IHJlc3VsdC5oYXNoIHx8IHJlc3VsdC5kYXRhLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTZW5kVHJhbnNhY3Rpb24gZXJyb3I6XCIsIGVycik7XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdldEZlZXMocmF3VHJhbnNhY3Rpb24pIHtcclxuICAgIGNvbnN0IHsgbmV0d29ya1R5cGUgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IHsgZnJvbSB9ID0gcmF3VHJhbnNhY3Rpb247XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcyhgaHR0cHM6Ly9hcHAuc3dhcHNvLmlvL2FwaS9iaXRjb2luL25ldHdvcmstaW5mbz9uZXR3b3JrPSR7bmV0d29ya1R5cGV9YCwge1xyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGJsb2NrcyA9IHJlc3BvbnNlLmRhdGEuZGF0YVtcIm1lbXBvb2xcIl0uYmxvY2tzLnNsaWNlKDAsIDMpO1xyXG5cclxuICAgICAgY29uc3QgZmVlcyA9IHtcclxuICAgICAgICBzbG93OiB7IHNhdFBlckJ5dGU6IHBhcnNlSW50KGJsb2Nrc1syXS5tZWRpYW5fZmVlX3JhdGUpIH0sXHJcbiAgICAgICAgc3RhbmRhcmQ6IHsgc2F0UGVyQnl0ZTogcGFyc2VJbnQoYmxvY2tzWzFdLm1lZGlhbl9mZWVfcmF0ZSkgfSxcclxuICAgICAgICBmYXN0OiB7IHNhdFBlckJ5dGU6IHBhcnNlSW50KGJsb2Nrc1swXS5tZWRpYW5fZmVlX3JhdGUpIH0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCB7IHRyYW5zYWN0aW9uU2l6ZSB9ID0gYXdhaXQgaGVscGVycy5nZXRUcmFuc2FjdGlvblNpemUoZnJvbSwgbmV0d29ya1R5cGUpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0cmFuc2FjdGlvblNpemUsXHJcbiAgICAgICAgZmVlcyxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwZXJzaXN0QWxsQWRkcmVzcyhfYWRkcmVzczogc3RyaW5nKSB7XHJcbiAgICBjb25zdCB7IGFkZHJlc3MgfSA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IG5ld0FkZCA9IFsuLi5hZGRyZXNzLCBfYWRkcmVzc107XHJcbiAgICB0aGlzLnN0b3JlLnVwZGF0ZVN0YXRlKHsgYWRkcmVzczogbmV3QWRkIH0pO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQZXJzaXN0ZW50U3RvcmUob2JqOiBvYmplY3QpIHtcclxuICAgIHRoaXMuc3RvcmUudXBkYXRlU3RhdGUob2JqKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGdldEJhbGFuY2UgPSBhc3luYyAoXHJcbiAgYWRkcmVzczogc3RyaW5nLFxyXG4gIG5ldHdvcmtUeXBlOiBCaXRjb2luTmV0d29ya05hbWVcclxuKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJhbGFuY2UgPSBhd2FpdCBheGlvcyhcclxuICAgICAgYGh0dHBzOi8vYXBwLnN3YXBzby5pby9hcGkvYml0Y29pbi9iYWxhbmNlP2FkZHJlc3M9JHthZGRyZXNzfSZuZXR3b3JrPSR7bmV0d29ya1R5cGV9YCxcclxuICAgICAge1xyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHsgYmFsYW5jZTogYmFsYW5jZS5kYXRhLmRhdGEuY29uZmlybWVkIH07XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICB0aHJvdyBlcnI7XHJcbiAgfVxyXG59O1xyXG4iXX0=
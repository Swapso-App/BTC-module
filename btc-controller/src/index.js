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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
__exportStar(require("./types/multisig"), exports);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBd0M7QUFFeEMseURBQTJDO0FBQzNDLGtEQUFpQztBQUNqQyw2REFBK0M7QUFDL0Msb0RBQXdEO0FBRXhELDBFQUErQztBQUMvQyw2Q0FBK0I7QUFDL0IsbUNBQXFDO0FBQ3JDLGtEQUEwQjtBQUMxQix3REFBMEM7QUFFMUMsMENBQThFO0FBRTlFLG1EQUFpQztBQUVqQywrQkFBK0I7QUFDL0Isd0VBQXVFO0FBQTlELDhIQUFBLHFCQUFxQixPQUFBO0FBRTlCLE1BQU0sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLEdBQUcsZUFBTyxDQUFDO0FBRXJELE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsdUJBQWUsQ0FBQztBQUU3QyxNQUFhLGlCQUFpQjtJQU01QixZQUFZLElBQVM7UUFDbkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFBLGVBQVksRUFBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUEsZ0JBQWEsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksbUJBQWUsQ0FBQztZQUMvQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxlQUFlO1lBQzVFLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQy9DLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFP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RyxDQUFDO0lBQ1osQ0FBQztBQUNILENBQUMsQ0FBQztBQWxCVyxRQUFBLFVBQVUsY0FrQnJCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE9ic2VydmFibGVTdG9yZSBmcm9tIFwib2JzLXN0b3JlXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBiaXRjb2luanMgZnJvbSBcImJpdGNvaW5qcy1saWJcIjtcclxuaW1wb3J0IEJJUDMyRmFjdG9yeSBmcm9tIFwiYmlwMzJcIjtcclxuaW1wb3J0ICogYXMgZWNjIGZyb20gXCJAYml0Y29pbmVybGFiL3NlY3AyNTZrMVwiO1xyXG5pbXBvcnQgRUNQYWlyRmFjdG9yeSwgeyBFQ1BhaXJJbnRlcmZhY2UgfSBmcm9tIFwiZWNwYWlyXCI7XHJcblxyXG5pbXBvcnQgYml0Y29pbk1lc3NhZ2UgZnJvbSBcImJpdGNvaW5qcy1tZXNzYWdlXCI7XHJcbmltcG9ydCAqIGFzIGJpcDM5IGZyb20gXCJiaXAzOVwiO1xyXG5pbXBvcnQgeyByYW5kb21CeXRlcyB9IGZyb20gXCJjcnlwdG9cIjtcclxuaW1wb3J0IGF4aW9zIGZyb20gXCJheGlvc1wiO1xyXG5pbXBvcnQgKiBhcyBoZWxwZXJzIGZyb20gXCIuL2hlbHBlci9pbmRleFwiO1xyXG5cclxuaW1wb3J0IHsgYml0Y29pbiwgYml0Y29pbl9uZXR3b3JrLCBCaXRjb2luTmV0d29ya05hbWUgfSBmcm9tIFwiLi9jb25maWcvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCAqIGZyb20gXCIuL3R5cGVzL211bHRpc2lnXCI7XHJcblxyXG4vLyBFeHBvcnQgVHJhbnNhY3Rpb25WaXN1YWxpemVyXHJcbmV4cG9ydCB7IFRyYW5zYWN0aW9uVmlzdWFsaXplciB9IGZyb20gXCIuL2hlbHBlci90cmFuc2FjdGlvblZpc3VhbGl6ZXJcIjtcclxuXHJcbmNvbnN0IHsgSERfUEFUSF9NQUlOTkVULCBIRF9QQVRIX1RFU1RORVQgfSA9IGJpdGNvaW47XHJcblxyXG5jb25zdCB7IE1BSU5ORVQsIFRFU1RORVQgfSA9IGJpdGNvaW5fbmV0d29yaztcclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlyaW5nQ29udHJvbGxlciB7XHJcbiAgYmlwMzI6IGFueTtcclxuICBFQ1BhaXI6IGFueTtcclxuICBzdG9yZTogYW55O1xyXG4gIGltcG9ydGVkV2FsbGV0czogYW55O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRzOiBhbnkpIHtcclxuICAgIHRoaXMuYmlwMzIgPSBCSVAzMkZhY3RvcnkoZWNjKTtcclxuICAgIHRoaXMuRUNQYWlyID0gRUNQYWlyRmFjdG9yeShlY2MpO1xyXG4gICAgdGhpcy5zdG9yZSA9IG5ldyBPYnNlcnZhYmxlU3RvcmUoe1xyXG4gICAgICBtbmVtb25pYzogb3B0cy5tbmVtb25pYyxcclxuICAgICAgaGRQYXRoOiBvcHRzLm5ldHdvcmsgPT09IFRFU1RORVQuTkVUV09SSyA/IEhEX1BBVEhfVEVTVE5FVCA6IEhEX1BBVEhfTUFJTk5FVCxcclxuICAgICAgbmV0d29yazogaGVscGVycy51dGlscy5nZXROZXR3b3JrKG9wdHMubmV0d29yayksXHJcbiAgICAgIG5ldHdvcmtUeXBlOiBvcHRzLm5ldHdvcmsgPyBvcHRzLm5ldHdvcmsgOiBNQUlOTkVULk5FVFdPUkssXHJcbiAgICAgIHdhbGxldDogbnVsbCxcclxuICAgICAgYWRkcmVzczogW10sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZ2VuZXJhdGVXYWxsZXQoKTtcclxuICAgIHRoaXMuaW1wb3J0ZWRXYWxsZXRzID0gW107XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGRlcml2ZWRDaGlsZChiaXAzMlJvb3RLZXk6IGFueSwgaGRQYXRoOiBhbnksIGluZGV4OiBudW1iZXIpIHtcclxuICAgIGNvbnN0IHBhdGggPSBgJHtoZFBhdGh9LyR7aW5kZXh9YDtcclxuICAgIHJldHVybiBiaXAzMlJvb3RLZXkuZGVyaXZlUGF0aChwYXRoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdG9IZXhTdHJpbmcoYnl0ZUFycmF5OiBhbnkpIHtcclxuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwXHJcbiAgICAgIC5jYWxsKGJ5dGVBcnJheSwgKGJ5dGUpID0+IChcIjBcIiArIChieXRlICYgMHhmZikudG9TdHJpbmcoMTYpKS5zbGljZSgtMikpXHJcbiAgICAgIC5qb2luKFwiXCIpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB0b0J5dGVBcnJheShoZXhTdHJpbmc6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhleFN0cmluZy5sZW5ndGg7IGkgKz0gMikge1xyXG4gICAgICByZXN1bHQucHVzaChwYXJzZUludChoZXhTdHJpbmcuc3Vic3RyKGksIDIpLCAxNikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGdlbmVyYXRlV2FsbGV0KCkge1xyXG4gICAgY29uc3QgeyBtbmVtb25pYywgbmV0d29yaywgaGRQYXRoIH0gPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBzZWVkID0gYmlwMzkubW5lbW9uaWNUb1NlZWRTeW5jKG1uZW1vbmljKTtcclxuICAgIGNvbnN0IGJpcDMyUm9vdEtleSA9IHRoaXMuYmlwMzIuZnJvbVNlZWQoc2VlZCwgbmV0d29yayk7XHJcbiAgICB0aGlzLnVwZGF0ZVBlcnNpc3RlbnRTdG9yZSh7IHdhbGxldDogYmlwMzJSb290S2V5IH0pO1xyXG4gICAgcmV0dXJuIGJpcDMyUm9vdEtleTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGFkZEFjY291bnQoKSB7XHJcbiAgICBjb25zdCB7IHdhbGxldCwgbmV0d29yaywgYWRkcmVzcywgaGRQYXRoIH0gPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBjaGlsZCA9IHRoaXMuZGVyaXZlZENoaWxkKHdhbGxldCwgaGRQYXRoLCBhZGRyZXNzLmxlbmd0aCk7XHJcblxyXG4gICAgY29uc3QgeyBhZGRyZXNzOiBfYWRkcmVzcyB9ID0gYml0Y29pbmpzLnBheW1lbnRzLnAyd3BraCh7XHJcbiAgICAgIHB1YmtleTogQnVmZmVyLmZyb20oY2hpbGQucHVibGljS2V5KSxcclxuICAgICAgbmV0d29yayxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucGVyc2lzdEFsbEFkZHJlc3MoX2FkZHJlc3MpO1xyXG4gICAgcmV0dXJuIHsgYWRkcmVzczogX2FkZHJlc3MgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldEFjY291bnRzKCkge1xyXG4gICAgY29uc3QgeyBhZGRyZXNzIH0gPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICByZXR1cm4gYWRkcmVzcztcclxuICB9XHJcblxyXG4gIGFzeW5jIGV4cG9ydFByaXZhdGVLZXkoX2FkZHJlc3M6IHN0cmluZykge1xyXG4gICAgY29uc3QgeyB3YWxsZXQsIG5ldHdvcmssIGFkZHJlc3MsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgaWR4ID0gYWRkcmVzcy5pbmRleE9mKF9hZGRyZXNzKTtcclxuICAgIGlmIChpZHggPCAwKSB0aHJvdyBcIkludmFsaWQgYWRkcmVzcywgdGhlIGFkZHJlc3MgaXMgbm90IGF2YWlsYWJsZSBpbiB0aGUgd2FsbGV0XCI7XHJcblxyXG4gICAgY29uc3QgY2hpbGQgPSB0aGlzLmRlcml2ZWRDaGlsZCh3YWxsZXQsIGhkUGF0aCwgaWR4KTtcclxuICAgIGNvbnN0IGtleVBhaXIgPSB0aGlzLkVDUGFpci5mcm9tV0lGKGNoaWxkLnRvV0lGKCksIG5ldHdvcmspO1xyXG4gICAgcmV0dXJuIHsgcHJpdmF0ZUtleTogdGhpcy50b0hleFN0cmluZyhrZXlQYWlyLnByaXZhdGVLZXkpIH07XHJcbiAgfVxyXG5cclxuICBhc3luYyBpbXBvcnRXYWxsZXQoX3ByaXZhdGVLZXk6IHN0cmluZykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgeyBuZXR3b3JrIH0gPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICAgIGNvbnN0IGFkZHJlc3MgPSBoZWxwZXJzLnV0aWxzLmdldEFkZHJlc3NGcm9tUGsoX3ByaXZhdGVLZXksIG5ldHdvcmspO1xyXG4gICAgICB0aGlzLmltcG9ydGVkV2FsbGV0cy5wdXNoKGFkZHJlc3MpO1xyXG4gICAgICByZXR1cm4gYWRkcmVzcztcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZmV0Y2hGcmVzaFV0eG9zKGFkZHJlc3M6IHN0cmluZywgbmV0d29ya1R5cGU6IHN0cmluZykge1xyXG4gICAgY29uc3QgYmFzZVVybCA9XHJcbiAgICAgIG5ldHdvcmtUeXBlID09PSBcIk1BSU5ORVRcIlxyXG4gICAgICAgID8gXCJodHRwczovL2Jsb2Nrc3RyZWFtLmluZm8vYXBpXCJcclxuICAgICAgICA6IFwiaHR0cHM6Ly9ibG9ja3N0cmVhbS5pbmZvL3Rlc3RuZXQvYXBpXCI7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hZGRyZXNzLyR7YWRkcmVzc30vdXR4b2ApO1xyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBVVFhPczogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHV0eG9zID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuICAgIGNvbnN0IGRldGFpbGVkVXR4b3MgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgdXR4b3MubWFwKGFzeW5jICh1dHhvKSA9PiB7XHJcbiAgICAgICAgY29uc3QgdHhSZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L3R4LyR7dXR4by50eGlkfWApO1xyXG4gICAgICAgIGNvbnN0IHR4RGF0YSA9IGF3YWl0IHR4UmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgIGNvbnN0IHZvdXQgPSB0eERhdGEudm91dFt1dHhvLnZvdXRdO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0eGlkOiB1dHhvLnR4aWQsXHJcbiAgICAgICAgICB2b3V0OiB1dHhvLnZvdXQsXHJcbiAgICAgICAgICB2YWx1ZTogdXR4by52YWx1ZSxcclxuICAgICAgICAgIHNjcmlwdFB1YktleTogdm91dC5zY3JpcHRwdWJrZXksXHJcbiAgICAgICAgfTtcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIGRldGFpbGVkVXR4b3M7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzaWduVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pIHtcclxuICAgIGNvbnN0IHsgd2FsbGV0LCBuZXR3b3JrLCBhZGRyZXNzLCBuZXR3b3JrVHlwZSwgaGRQYXRoIH0gPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCB7IGZyb20sIHRvLCBhbW91bnQsIHNhdFBlckJ5dGU6IHNhdCB9ID0gdHJhbnNhY3Rpb247XHJcbiAgICBsZXQgc2F0UGVyQnl0ZSA9IHNhdDtcclxuXHJcbiAgICBpZiAoIXNhdFBlckJ5dGUpIHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZ2V0RmVlcyh0cmFuc2FjdGlvbik7XHJcbiAgICAgIHNhdFBlckJ5dGUgPSBkYXRhLmZlZXMuZmFzdC5zYXRQZXJCeXRlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGlkeCA9IGFkZHJlc3MuaW5kZXhPZihmcm9tKTtcclxuICAgIGlmIChpZHggPCAwKSB0aHJvdyBcIkludmFsaWQgYWRkcmVzcywgdGhlIGFkZHJlc3MgaXMgbm90IGF2YWlsYWJsZSBpbiB0aGUgd2FsbGV0XCI7XHJcblxyXG4gICAgY29uc3QgY2hpbGQ6IEVDUGFpckludGVyZmFjZSA9IHRoaXMuZGVyaXZlZENoaWxkKHdhbGxldCwgaGRQYXRoLCBpZHgpO1xyXG4gICAgY29uc3Qga2V5UGFpcjogRUNQYWlySW50ZXJmYWNlID0gdGhpcy5FQ1BhaXIuZnJvbVdJRihjaGlsZC50b1dJRigpLCBuZXR3b3JrKTtcclxuICAgIGNvbnN0IHByaXZhdGVLZXkgPSBrZXlQYWlyLnByaXZhdGVLZXk7XHJcbiAgICBjb25zdCBmcmVzaFV0eG9zID0gYXdhaXQgdGhpcy5mZXRjaEZyZXNoVXR4b3MoZnJvbSwgbmV0d29ya1R5cGUpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHNpZ25lZFRyYW5zYWN0aW9uID0gYXdhaXQgaGVscGVycy5zaWduVHJhbnNhY3Rpb24oXHJcbiAgICAgICAgY2hpbGQsXHJcbiAgICAgICAga2V5UGFpcixcclxuICAgICAgICBwcml2YXRlS2V5LFxyXG4gICAgICAgIGZyb20sXHJcbiAgICAgICAgdG8sXHJcbiAgICAgICAgYW1vdW50LFxyXG4gICAgICAgIHNhdFBlckJ5dGUsXHJcbiAgICAgICAgbmV0d29ya1R5cGUsXHJcbiAgICAgICAgbmV0d29yayxcclxuICAgICAgICBmcmVzaFV0eG9zXHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybiB7IHNpZ25lZFRyYW5zYWN0aW9uIH07XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgdGhyb3cgZXJyO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2lnbk1lc3NhZ2UobWVzc2FnZTogc3RyaW5nLCBfYWRkcmVzczogc3RyaW5nLCBwcml2YXRlS2V5ID0gbnVsbCkge1xyXG4gICAgY29uc3QgeyB3YWxsZXQsIG5ldHdvcmssIGFkZHJlc3MsIGhkUGF0aCB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG5cclxuICAgIGlmICghcHJpdmF0ZUtleSkge1xyXG4gICAgICBjb25zdCBpZHggPSBhZGRyZXNzLmluZGV4T2YoX2FkZHJlc3MpO1xyXG4gICAgICBpZiAoaWR4IDwgMCkgdGhyb3cgXCJJbnZhbGlkIGFkZHJlc3MsIHRoZSBhZGRyZXNzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhlIHdhbGxldFwiO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBjaGlsZCA9IHRoaXMuZGVyaXZlZENoaWxkKHdhbGxldCwgaGRQYXRoLCBpZHgpO1xyXG4gICAgICAgIGNvbnN0IGtleVBhaXIgPSB0aGlzLkVDUGFpci5mcm9tV0lGKGNoaWxkLnRvV0lGKCksIG5ldHdvcmspO1xyXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGJpdGNvaW5NZXNzYWdlLnNpZ24oXHJcbiAgICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgICAgQnVmZmVyLmZyb20oa2V5UGFpci5wcml2YXRlS2V5KSxcclxuICAgICAgICAgIGtleVBhaXIuY29tcHJlc3NlZCxcclxuICAgICAgICAgIHsgc2Vnd2l0VHlwZTogXCJwMndwa2hcIiwgZXh0cmFFbnRyb3B5OiByYW5kb21CeXRlcygzMikgfVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIHsgc2lnbmVkTWVzc2FnZTogc2lnbmF0dXJlLnRvU3RyaW5nKFwiYmFzZTY0XCIpIH07XHJcbiAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIHRocm93IGVycjtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3Qga2V5UGFpciA9IHRoaXMuRUNQYWlyLmZyb21Qcml2YXRlS2V5KFxyXG4gICAgICAgIG5ldyBVaW50OEFycmF5KHRoaXMudG9CeXRlQXJyYXkocHJpdmF0ZUtleSkpXHJcbiAgICAgICk7XHJcbiAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGJpdGNvaW5NZXNzYWdlLnNpZ24oXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICBCdWZmZXIuZnJvbShrZXlQYWlyLnByaXZhdGVLZXkpLFxyXG4gICAgICAgIGtleVBhaXIuY29tcHJlc3NlZCxcclxuICAgICAgICB7IHNlZ3dpdFR5cGU6IFwicDJ3cGtoXCIsIGV4dHJhRW50cm9weTogcmFuZG9tQnl0ZXMoMzIpIH1cclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuIHsgc2lnbmVkTWVzc2FnZTogc2lnbmF0dXJlLnRvU3RyaW5nKFwiYmFzZTY0XCIpIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBzZW5kVHJhbnNhY3Rpb24oVHJhbnNhY3Rpb25IZXg6IHN0cmluZykge1xyXG4gICAgY29uc3QgeyBuZXR3b3JrVHlwZSB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcHAuc3dhcHNvLmlvL2FwaS9iaXRjb2luL3NlbmQtdHJhbnNhY3Rpb25gLCB7XHJcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIG5ldHdvcmtUeXBlLFxyXG4gICAgICAgICAgdHJhbnNhY3Rpb25IZXg6IFRyYW5zYWN0aW9uSGV4LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yRGF0YS5tZXNzYWdlIHx8IGVycm9yRGF0YS5lcnJvciB8fCBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uRGV0YWlsczogcmVzdWx0Lmhhc2ggfHwgcmVzdWx0LmRhdGEsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIlNlbmRUcmFuc2FjdGlvbiBlcnJvcjpcIiwgZXJyKTtcclxuICAgICAgdGhyb3cgZXJyO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0RmVlcyhyYXdUcmFuc2FjdGlvbikge1xyXG4gICAgY29uc3QgeyBuZXR3b3JrVHlwZSB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgeyBmcm9tIH0gPSByYXdUcmFuc2FjdGlvbjtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGF4aW9zKGBodHRwczovL2FwcC5zd2Fwc28uaW8vYXBpL2JpdGNvaW4vbmV0d29yay1pbmZvP25ldHdvcms9JHtuZXR3b3JrVHlwZX1gLCB7XHJcbiAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgYmxvY2tzID0gcmVzcG9uc2UuZGF0YS5kYXRhW1wibWVtcG9vbFwiXS5ibG9ja3Muc2xpY2UoMCwgMyk7XHJcblxyXG4gICAgICBjb25zdCBmZWVzID0ge1xyXG4gICAgICAgIHNsb3c6IHsgc2F0UGVyQnl0ZTogcGFyc2VJbnQoYmxvY2tzWzJdLm1lZGlhbl9mZWVfcmF0ZSkgfSxcclxuICAgICAgICBzdGFuZGFyZDogeyBzYXRQZXJCeXRlOiBwYXJzZUludChibG9ja3NbMV0ubWVkaWFuX2ZlZV9yYXRlKSB9LFxyXG4gICAgICAgIGZhc3Q6IHsgc2F0UGVyQnl0ZTogcGFyc2VJbnQoYmxvY2tzWzBdLm1lZGlhbl9mZWVfcmF0ZSkgfSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHsgdHJhbnNhY3Rpb25TaXplIH0gPSBhd2FpdCBoZWxwZXJzLmdldFRyYW5zYWN0aW9uU2l6ZShmcm9tLCBuZXR3b3JrVHlwZSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uU2l6ZSxcclxuICAgICAgICBmZWVzLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHBlcnNpc3RBbGxBZGRyZXNzKF9hZGRyZXNzOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHsgYWRkcmVzcyB9ID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgY29uc3QgbmV3QWRkID0gWy4uLmFkZHJlc3MsIF9hZGRyZXNzXTtcclxuICAgIHRoaXMuc3RvcmUudXBkYXRlU3RhdGUoeyBhZGRyZXNzOiBuZXdBZGQgfSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVBlcnNpc3RlbnRTdG9yZShvYmo6IG9iamVjdCkge1xyXG4gICAgdGhpcy5zdG9yZS51cGRhdGVTdGF0ZShvYmopO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0QmFsYW5jZSA9IGFzeW5jIChcclxuICBhZGRyZXNzOiBzdHJpbmcsXHJcbiAgbmV0d29ya1R5cGU6IEJpdGNvaW5OZXR3b3JrTmFtZVxyXG4pID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgYmFsYW5jZSA9IGF3YWl0IGF4aW9zKFxyXG4gICAgICBgaHR0cHM6Ly9hcHAuc3dhcHNvLmlvL2FwaS9iaXRjb2luL2JhbGFuY2U/YWRkcmVzcz0ke2FkZHJlc3N9Jm5ldHdvcms9JHtuZXR3b3JrVHlwZX1gLFxyXG4gICAgICB7XHJcbiAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICByZXR1cm4geyBiYWxhbmNlOiBiYWxhbmNlLmRhdGEuZGF0YS5jb25maXJtZWQgfTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHRocm93IGVycjtcclxuICB9XHJcbn07XHJcbiJdfQ==
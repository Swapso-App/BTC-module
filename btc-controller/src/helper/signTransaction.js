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
exports.signTransaction = signTransaction;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const transactionSizeCalculator_1 = __importDefault(require("./utils/transactionSizeCalculator"));
async function signTransaction(child, keyPair, privateKey, from, to, amountToSend, satPerByte = 1, networkType, network, freshUtxos = []) {
    const psbt = new bitcoin.Psbt({ network });
    const { feeInSats, selectedUTXOs, changeAmount, } = await transactionSizeCalculator_1.default.calculateOptimalFee(from, amountToSend, satPerByte, freshUtxos);
    const totalAmountAvailable = selectedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);
    // console.log("totalAmountAvailable:", totalAmountAvailable);
    // console.log("amountToSend:", amountToSend);
    // console.log("fee:", feeInSats);
    if (totalAmountAvailable < amountToSend + feeInSats) {
        throw new Error("Balance is too low for this transaction");
    }
    psbt.addOutput({ address: to, value: amountToSend });
    if (changeAmount >= 100) {
        psbt.addOutput({ address: from, value: changeAmount });
    }
    selectedUTXOs.forEach((unspentOutput) => {
        psbt.addInput({
            hash: unspentOutput.txid,
            index: unspentOutput.vout,
            witnessUtxo: {
                script: Buffer.from(unspentOutput.scriptPubKey, "hex"),
                value: unspentOutput.value,
            },
        });
    });
    const buffer = Buffer.from(keyPair.publicKey);
    const mySigner = {
        publicKey: buffer,
        sign: (hash) => {
            const signature = Buffer.from(keyPair.sign(hash));
            return signature;
        },
    };
    selectedUTXOs.forEach((_, key) => {
        psbt.signInput(key, mySigner);
    });
    psbt.finalizeAllInputs();
    const transaction = psbt.extractTransaction();
    return transaction.toHex();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblRyYW5zYWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2lnblRyYW5zYWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS0EsMENBZ0VDO0FBckVELHVEQUF5QztBQUd6QyxrR0FBaUY7QUFFMUUsS0FBSyxVQUFVLGVBQWUsQ0FDbkMsS0FBc0IsRUFDdEIsT0FBd0IsRUFDeEIsVUFBZSxFQUNmLElBQVksRUFDWixFQUFVLEVBQ1YsWUFBb0IsRUFDcEIsVUFBVSxHQUFHLENBQUMsRUFDZCxXQUErQixFQUMvQixPQUFpQyxFQUNqQyxhQUFvQixFQUFFO0lBRXRCLE1BQU0sSUFBSSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFFM0MsTUFBTSxFQUNKLFNBQVMsRUFDVCxhQUFhLEVBQ2IsWUFBWSxHQUNiLEdBQUcsTUFBTSxtQ0FBZ0MsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUUzRyxNQUFNLG9CQUFvQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRiw4REFBOEQ7SUFDOUQsOENBQThDO0lBQzlDLGtDQUFrQztJQUVwQyxJQUFJLG9CQUFvQixHQUFHLFlBQVksR0FBRyxTQUFTLEVBQUUsQ0FBQztRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBRXJELElBQUksWUFBWSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBa0IsRUFBRSxFQUFFO1FBQzNDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUk7WUFDeEIsS0FBSyxFQUFFLGFBQWEsQ0FBQyxJQUFJO1lBQ3pCLFdBQVcsRUFBRTtnQkFDWCxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQztnQkFDdEQsS0FBSyxFQUFFLGFBQWEsQ0FBQyxLQUFLO2FBQzNCO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUU5QyxNQUFNLFFBQVEsR0FBUTtRQUNwQixTQUFTLEVBQUUsTUFBTTtRQUNqQixJQUFJLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtZQUNsQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO0tBQ0YsQ0FBQztJQUVGLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBVyxFQUFFLEVBQUU7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUV6QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM5QyxPQUFPLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYml0Y29pbiBmcm9tIFwiYml0Y29pbmpzLWxpYlwiO1xyXG5pbXBvcnQgeyBFQ1BhaXJJbnRlcmZhY2UgfSBmcm9tIFwiZWNwYWlyXCI7XHJcbmltcG9ydCB7IEJpdGNvaW5OZXR3b3JrTmFtZSB9IGZyb20gXCIuLi9jb25maWdcIjtcclxuaW1wb3J0IEJpdGNvaW5UcmFuc2FjdGlvblNpemVDYWxjdWxhdG9yIGZyb20gXCIuL3V0aWxzL3RyYW5zYWN0aW9uU2l6ZUNhbGN1bGF0b3JcIjtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaWduVHJhbnNhY3Rpb24oXHJcbiAgY2hpbGQ6IEVDUGFpckludGVyZmFjZSxcclxuICBrZXlQYWlyOiBFQ1BhaXJJbnRlcmZhY2UsXHJcbiAgcHJpdmF0ZUtleTogYW55LFxyXG4gIGZyb206IHN0cmluZyxcclxuICB0bzogc3RyaW5nLFxyXG4gIGFtb3VudFRvU2VuZDogbnVtYmVyLFxyXG4gIHNhdFBlckJ5dGUgPSAxLFxyXG4gIG5ldHdvcmtUeXBlOiBCaXRjb2luTmV0d29ya05hbWUsXHJcbiAgbmV0d29yazogYml0Y29pbi5uZXR3b3Jrcy5OZXR3b3JrLFxyXG4gIGZyZXNoVXR4b3M6IGFueVtdID0gW11cclxuKSB7XHJcbiAgY29uc3QgcHNidCA9IG5ldyBiaXRjb2luLlBzYnQoeyBuZXR3b3JrIH0pO1xyXG5cclxuICBjb25zdCB7XHJcbiAgICBmZWVJblNhdHMsXHJcbiAgICBzZWxlY3RlZFVUWE9zLFxyXG4gICAgY2hhbmdlQW1vdW50LFxyXG4gIH0gPSBhd2FpdCBCaXRjb2luVHJhbnNhY3Rpb25TaXplQ2FsY3VsYXRvci5jYWxjdWxhdGVPcHRpbWFsRmVlKGZyb20sIGFtb3VudFRvU2VuZCwgc2F0UGVyQnl0ZSwgZnJlc2hVdHhvcyk7XHJcblxyXG4gIGNvbnN0IHRvdGFsQW1vdW50QXZhaWxhYmxlID0gc2VsZWN0ZWRVVFhPcy5yZWR1Y2UoKHN1bSwgdXR4bykgPT4gc3VtICsgdXR4by52YWx1ZSwgMCk7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcInRvdGFsQW1vdW50QXZhaWxhYmxlOlwiLCB0b3RhbEFtb3VudEF2YWlsYWJsZSk7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcImFtb3VudFRvU2VuZDpcIiwgYW1vdW50VG9TZW5kKTtcclxuICAgIC8vIGNvbnNvbGUubG9nKFwiZmVlOlwiLCBmZWVJblNhdHMpO1xyXG5cclxuICBpZiAodG90YWxBbW91bnRBdmFpbGFibGUgPCBhbW91bnRUb1NlbmQgKyBmZWVJblNhdHMpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkJhbGFuY2UgaXMgdG9vIGxvdyBmb3IgdGhpcyB0cmFuc2FjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHBzYnQuYWRkT3V0cHV0KHsgYWRkcmVzczogdG8sIHZhbHVlOiBhbW91bnRUb1NlbmQgfSk7XHJcblxyXG4gIGlmIChjaGFuZ2VBbW91bnQgPj0gMTAwKSB7XHJcbiAgICBwc2J0LmFkZE91dHB1dCh7IGFkZHJlc3M6IGZyb20sIHZhbHVlOiBjaGFuZ2VBbW91bnQgfSk7XHJcbiAgfVxyXG5cclxuICBzZWxlY3RlZFVUWE9zLmZvckVhY2goKHVuc3BlbnRPdXRwdXQ6IGFueSkgPT4ge1xyXG4gICAgcHNidC5hZGRJbnB1dCh7XHJcbiAgICAgIGhhc2g6IHVuc3BlbnRPdXRwdXQudHhpZCxcclxuICAgICAgaW5kZXg6IHVuc3BlbnRPdXRwdXQudm91dCxcclxuICAgICAgd2l0bmVzc1V0eG86IHtcclxuICAgICAgICBzY3JpcHQ6IEJ1ZmZlci5mcm9tKHVuc3BlbnRPdXRwdXQuc2NyaXB0UHViS2V5LCBcImhleFwiKSxcclxuICAgICAgICB2YWx1ZTogdW5zcGVudE91dHB1dC52YWx1ZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShrZXlQYWlyLnB1YmxpY0tleSk7XHJcblxyXG4gIGNvbnN0IG15U2lnbmVyOiBhbnkgPSB7XHJcbiAgICBwdWJsaWNLZXk6IGJ1ZmZlcixcclxuICAgIHNpZ246IChoYXNoOiBhbnkpID0+IHtcclxuICAgICAgY29uc3Qgc2lnbmF0dXJlID0gQnVmZmVyLmZyb20oa2V5UGFpci5zaWduKGhhc2gpKTtcclxuICAgICAgcmV0dXJuIHNpZ25hdHVyZTtcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgc2VsZWN0ZWRVVFhPcy5mb3JFYWNoKChfLCBrZXk6IG51bWJlcikgPT4ge1xyXG4gICAgcHNidC5zaWduSW5wdXQoa2V5LCBteVNpZ25lcik7XHJcbiAgfSk7XHJcblxyXG4gIHBzYnQuZmluYWxpemVBbGxJbnB1dHMoKTtcclxuXHJcbiAgY29uc3QgdHJhbnNhY3Rpb24gPSBwc2J0LmV4dHJhY3RUcmFuc2FjdGlvbigpO1xyXG4gIHJldHVybiB0cmFuc2FjdGlvbi50b0hleCgpO1xyXG59XHJcbiJdfQ==
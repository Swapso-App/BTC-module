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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMultiSigTransaction = buildMultiSigTransaction;
const bitcoin = __importStar(require("bitcoinjs-lib"));
function selectMultiSigUTXOs(utxos, targetAmount) {
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    const selectedUTXOs = [];
    let totalInputValue = 0;
    for (const utxo of sorted) {
        selectedUTXOs.push(utxo);
        totalInputValue += utxo.value;
        if (totalInputValue >= targetAmount) {
            return {
                selectedUTXOs,
                totalInputValue,
            };
        }
    }
    throw new Error("Insufficient funds for selected outputs and fee");
}
function buildMultiSigTransaction(options) {
    const { network, utxos, outputs, requiredSignatures, totalSigners, feeInSats = 0, changeAddress, } = options;
    if (requiredSignatures < 1 || totalSigners < 1 || requiredSignatures > totalSigners) {
        throw new Error("Invalid multisig signer configuration");
    }
    if (!Array.isArray(utxos) || utxos.length === 0) {
        throw new Error("At least one UTXO is required to build a multisig transaction");
    }
    if (!Array.isArray(outputs) || outputs.length === 0) {
        throw new Error("At least one output is required to build a multisig transaction");
    }
    const totalOutputValue = outputs.reduce((sum, output) => sum + output.value, 0);
    const targetAmount = totalOutputValue + feeInSats;
    const { selectedUTXOs, totalInputValue } = selectMultiSigUTXOs(utxos, targetAmount);
    const psbt = new bitcoin.Psbt({ network });
    selectedUTXOs.forEach((utxo) => {
        const input = {
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
                script: Buffer.from(utxo.scriptPubKey, "hex"),
                value: utxo.value,
            },
        };
        if (utxo.witnessScript) {
            input.witnessScript = Buffer.from(utxo.witnessScript, "hex");
        }
        if (utxo.redeemScript) {
            input.redeemScript = Buffer.from(utxo.redeemScript, "hex");
        }
        psbt.addInput(input);
    });
    outputs.forEach((output) => {
        psbt.addOutput({ address: output.address, value: output.value });
    });
    const changeAmount = totalInputValue - totalOutputValue - feeInSats;
    if (changeAmount < 0) {
        throw new Error("Insufficient input value to cover outputs and fee");
    }
    // Skeleton behavior: add change output only when a valid change target is supplied.
    if (changeAddress && changeAmount > 0) {
        psbt.addOutput({ address: changeAddress, value: changeAmount });
    }
    return {
        psbt,
        psbtBase64: psbt.toBase64(),
        selectedUTXOs,
        inputCount: selectedUTXOs.length,
        outputCount: psbt.txOutputs.length,
        totalInputValue,
        totalOutputValue,
        changeAmount,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRNdWx0aVNpZ1RyYW5zYWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnVpbGRNdWx0aVNpZ1RyYW5zYWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUVBLDREQThFQztBQS9JRCx1REFBeUM7QUEwQ3pDLFNBQVMsbUJBQW1CLENBQzFCLEtBQTBCLEVBQzFCLFlBQW9CO0lBRXBCLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1RCxNQUFNLGFBQWEsR0FBd0IsRUFBRSxDQUFDO0lBQzlDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztJQUV4QixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzFCLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsZUFBZSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7UUFFOUIsSUFBSSxlQUFlLElBQUksWUFBWSxFQUFFLENBQUM7WUFDcEMsT0FBTztnQkFDTCxhQUFhO2dCQUNiLGVBQWU7YUFDaEIsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxTQUFnQix3QkFBd0IsQ0FDdEMsT0FBd0M7SUFFeEMsTUFBTSxFQUNKLE9BQU8sRUFDUCxLQUFLLEVBQ0wsT0FBTyxFQUNQLGtCQUFrQixFQUNsQixZQUFZLEVBQ1osU0FBUyxHQUFHLENBQUMsRUFDYixhQUFhLEdBQ2QsR0FBRyxPQUFPLENBQUM7SUFFWixJQUFJLGtCQUFrQixHQUFHLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxJQUFJ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TTtRQUNoQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNO1FBQ2xDLGVBQWU7UUFDZixnQkFBZ0I7UUFDaEIsWUFBWTtLQUNiLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYml0Y29pbiBmcm9tIFwiYml0Y29pbmpzLWxpYlwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNdWx0aVNpZ0lucHV0VVRYTyB7XHJcbiAgdHhpZDogc3RyaW5nO1xyXG4gIHZvdXQ6IG51bWJlcjtcclxuICB2YWx1ZTogbnVtYmVyO1xyXG4gIHNjcmlwdFB1YktleTogc3RyaW5nO1xyXG4gIHdpdG5lc3NTY3JpcHQ/OiBzdHJpbmc7XHJcbiAgcmVkZWVtU2NyaXB0Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE11bHRpU2lnT3V0cHV0IHtcclxuICBhZGRyZXNzOiBzdHJpbmc7XHJcbiAgdmFsdWU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdWlsZE11bHRpU2lnVHJhbnNhY3Rpb25PcHRpb25zIHtcclxuICBuZXR3b3JrOiBiaXRjb2luLm5ldHdvcmtzLk5ldHdvcms7XHJcbiAgdXR4b3M6IE11bHRpU2lnSW5wdXRVVFhPW107XHJcbiAgb3V0cHV0czogTXVsdGlTaWdPdXRwdXRbXTtcclxuICByZXF1aXJlZFNpZ25hdHVyZXM6IG51bWJlcjtcclxuICB0b3RhbFNpZ25lcnM6IG51bWJlcjtcclxuICBmZWVJblNhdHM/OiBudW1iZXI7XHJcbiAgY2hhbmdlQWRkcmVzcz86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdWlsZE11bHRpU2lnVHJhbnNhY3Rpb25SZXN1bHQge1xyXG4gIHBzYnQ6IGJpdGNvaW4uUHNidDtcclxuICBwc2J0QmFzZTY0OiBzdHJpbmc7XHJcbiAgc2VsZWN0ZWRVVFhPczogTXVsdGlTaWdJbnB1dFVUWE9bXTtcclxuICBpbnB1dENvdW50OiBudW1iZXI7XHJcbiAgb3V0cHV0Q291bnQ6IG51bWJlcjtcclxuICB0b3RhbElucHV0VmFsdWU6IG51bWJlcjtcclxuICB0b3RhbE91dHB1dFZhbHVlOiBudW1iZXI7XHJcbiAgY2hhbmdlQW1vdW50OiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTZWxlY3RlZFV0eG9TZXQge1xyXG4gIHNlbGVjdGVkVVRYT3M6IE11bHRpU2lnSW5wdXRVVFhPW107XHJcbiAgdG90YWxJbnB1dFZhbHVlOiBudW1iZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdE11bHRpU2lnVVRYT3MoXHJcbiAgdXR4b3M6IE11bHRpU2lnSW5wdXRVVFhPW10sXHJcbiAgdGFyZ2V0QW1vdW50OiBudW1iZXJcclxuKTogU2VsZWN0ZWRVdHhvU2V0IHtcclxuICBjb25zdCBzb3J0ZWQgPSBbLi4udXR4b3NdLnNvcnQoKGEsIGIpID0+IGIudmFsdWUgLSBhLnZhbHVlKTtcclxuICBjb25zdCBzZWxlY3RlZFVUWE9zOiBNdWx0aVNpZ0lucHV0VVRYT1tdID0gW107XHJcbiAgbGV0IHRvdGFsSW5wdXRWYWx1ZSA9IDA7XHJcblxyXG4gIGZvciAoY29uc3QgdXR4byBvZiBzb3J0ZWQpIHtcclxuICAgIHNlbGVjdGVkVVRYT3MucHVzaCh1dHhvKTtcclxuICAgIHRvdGFsSW5wdXRWYWx1ZSArPSB1dHhvLnZhbHVlO1xyXG5cclxuICAgIGlmICh0b3RhbElucHV0VmFsdWUgPj0gdGFyZ2V0QW1vdW50KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc2VsZWN0ZWRVVFhPcyxcclxuICAgICAgICB0b3RhbElucHV0VmFsdWUsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aHJvdyBuZXcgRXJyb3IoXCJJbnN1ZmZpY2llbnQgZnVuZHMgZm9yIHNlbGVjdGVkIG91dHB1dHMgYW5kIGZlZVwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTXVsdGlTaWdUcmFuc2FjdGlvbihcclxuICBvcHRpb25zOiBCdWlsZE11bHRpU2lnVHJhbnNhY3Rpb25PcHRpb25zXHJcbik6IEJ1aWxkTXVsdGlTaWdUcmFuc2FjdGlvblJlc3VsdCB7XHJcbiAgY29uc3Qge1xyXG4gICAgbmV0d29yayxcclxuICAgIHV0eG9zLFxyXG4gICAgb3V0cHV0cyxcclxuICAgIHJlcXVpcmVkU2lnbmF0dXJlcyxcclxuICAgIHRvdGFsU2lnbmVycyxcclxuICAgIGZlZUluU2F0cyA9IDAsXHJcbiAgICBjaGFuZ2VBZGRyZXNzLFxyXG4gIH0gPSBvcHRpb25zO1xyXG5cclxuICBpZiAocmVxdWlyZWRTaWduYXR1cmVzIDwgMSB8fCB0b3RhbFNpZ25lcnMgPCAxIHx8IHJlcXVpcmVkU2lnbmF0dXJlcyA+IHRvdGFsU2lnbmVycykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBtdWx0aXNpZyBzaWduZXIgY29uZmlndXJhdGlvblwiKTtcclxuICB9XHJcblxyXG4gIGlmICghQXJyYXkuaXNBcnJheSh1dHhvcykgfHwgdXR4b3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBdCBsZWFzdCBvbmUgVVRYTyBpcyByZXF1aXJlZCB0byBidWlsZCBhIG11bHRpc2lnIHRyYW5zYWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFBcnJheS5pc0FycmF5KG91dHB1dHMpIHx8IG91dHB1dHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBdCBsZWFzdCBvbmUgb3V0cHV0IGlzIHJlcXVpcmVkIHRvIGJ1aWxkIGEgbXVsdGlzaWcgdHJhbnNhY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBjb25zdCB0b3RhbE91dHB1dFZhbHVlID0gb3V0cHV0cy5yZWR1Y2UoKHN1bSwgb3V0cHV0KSA9PiBzdW0gKyBvdXRwdXQudmFsdWUsIDApO1xyXG4gIGNvbnN0IHRhcmdldEFtb3VudCA9IHRvdGFsT3V0cHV0VmFsdWUgKyBmZWVJblNhdHM7XHJcblxyXG4gIGNvbnN0IHsgc2VsZWN0ZWRVVFhPcywgdG90YWxJbnB1dFZhbHVlIH0gPSBzZWxlY3RNdWx0aVNpZ1VUWE9zKHV0eG9zLCB0YXJnZXRBbW91bnQpO1xyXG5cclxuICBjb25zdCBwc2J0ID0gbmV3IGJpdGNvaW4uUHNidCh7IG5ldHdvcmsgfSk7XHJcblxyXG4gIHNlbGVjdGVkVVRYT3MuZm9yRWFjaCgodXR4bykgPT4ge1xyXG4gICAgY29uc3QgaW5wdXQ6IGFueSA9IHtcclxuICAgICAgaGFzaDogdXR4by50eGlkLFxyXG4gICAgICBpbmRleDogdXR4by52b3V0LFxyXG4gICAgICB3aXRuZXNzVXR4bzoge1xyXG4gICAgICAgIHNjcmlwdDogQnVmZmVyLmZyb20odXR4by5zY3JpcHRQdWJLZXksIFwiaGV4XCIpLFxyXG4gICAgICAgIHZhbHVlOiB1dHhvLnZhbHVlLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAodXR4by53aXRuZXNzU2NyaXB0KSB7XHJcbiAgICAgIGlucHV0LndpdG5lc3NTY3JpcHQgPSBCdWZmZXIuZnJvbSh1dHhvLndpdG5lc3NTY3JpcHQsIFwiaGV4XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh1dHhvLnJlZGVlbVNjcmlwdCkge1xyXG4gICAgICBpbnB1dC5yZWRlZW1TY3JpcHQgPSBCdWZmZXIuZnJvbSh1dHhvLnJlZGVlbVNjcmlwdCwgXCJoZXhcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHNidC5hZGRJbnB1dChpbnB1dCk7XHJcbiAgfSk7XHJcblxyXG4gIG91dHB1dHMuZm9yRWFjaCgob3V0cHV0KSA9PiB7XHJcbiAgICBwc2J0LmFkZE91dHB1dCh7IGFkZHJlc3M6IG91dHB1dC5hZGRyZXNzLCB2YWx1ZTogb3V0cHV0LnZhbHVlIH0pO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjaGFuZ2VBbW91bnQgPSB0b3RhbElucHV0VmFsdWUgLSB0b3RhbE91dHB1dFZhbHVlIC0gZmVlSW5TYXRzO1xyXG5cclxuICBpZiAoY2hhbmdlQW1vdW50IDwgMCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW5zdWZmaWNpZW50IGlucHV0IHZhbHVlIHRvIGNvdmVyIG91dHB1dHMgYW5kIGZlZVwiKTtcclxuICB9XHJcblxyXG4gIC8vIFNrZWxldG9uIGJlaGF2aW9yOiBhZGQgY2hhbmdlIG91dHB1dCBvbmx5IHdoZW4gYSB2YWxpZCBjaGFuZ2UgdGFyZ2V0IGlzIHN1cHBsaWVkLlxyXG4gIGlmIChjaGFuZ2VBZGRyZXNzICYmIGNoYW5nZUFtb3VudCA+IDApIHtcclxuICAgIHBzYnQuYWRkT3V0cHV0KHsgYWRkcmVzczogY2hhbmdlQWRkcmVzcywgdmFsdWU6IGNoYW5nZUFtb3VudCB9KTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwc2J0LFxyXG4gICAgcHNidEJhc2U2NDogcHNidC50b0Jhc2U2NCgpLFxyXG4gICAgc2VsZWN0ZWRVVFhPcyxcclxuICAgIGlucHV0Q291bnQ6IHNlbGVjdGVkVVRYT3MubGVuZ3RoLFxyXG4gICAgb3V0cHV0Q291bnQ6IHBzYnQudHhPdXRwdXRzLmxlbmd0aCxcclxuICAgIHRvdGFsSW5wdXRWYWx1ZSxcclxuICAgIHRvdGFsT3V0cHV0VmFsdWUsXHJcbiAgICBjaGFuZ2VBbW91bnQsXHJcbiAgfTtcclxufVxyXG4iXX0=
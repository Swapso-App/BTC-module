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
exports.createMultiSigAddress = createMultiSigAddress;
const bitcoinjs = __importStar(require("bitcoinjs-lib"));
function createMultiSigAddress({ publicKeys, requiredSignatures, network = bitcoinjs.networks.bitcoin, type = 'P2SH', }) {
    if (requiredSignatures > publicKeys.length) {
        throw new Error('requiredSignatures cannot be greater than number of public keys');
    }
    // Sort public keys lexicographically to support BIP45 & BIP67 validation
    const pubkeys = publicKeys
        .map((k) => Buffer.from(k, 'hex'))
        .sort((a, b) => a.compare(b));
    const p2ms = bitcoinjs.payments.p2ms({
        m: requiredSignatures,
        pubkeys,
        network,
    });
    if (type === 'P2SH') {
        const p2sh = bitcoinjs.payments.p2sh({
            redeem: p2ms,
            network,
        });
        return {
            address: p2sh.address,
            type,
            redeemScript: p2ms.output,
        };
    }
    if (type === 'P2WSH') {
        const p2wsh = bitcoinjs.payments.p2wsh({
            redeem: p2ms,
            network,
        });
        return {
            address: p2wsh.address,
            type,
            witnessScript: p2ms.output,
        };
    }
    if (type === 'P2SH-P2WSH') {
        const p2wsh = bitcoinjs.payments.p2wsh({
            redeem: p2ms,
            network,
        });
        const p2sh = bitcoinjs.payments.p2sh({
            redeem: p2wsh,
            network,
        });
        return {
            address: p2sh.address,
            type,
            redeemScript: p2wsh.output,
            witnessScript: p2ms.output,
        };
    }
    throw new Error(`Unsupported multisig type: ${type}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlTXVsdGlTaWdBZGRyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlTXVsdGlTaWdBZGRyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBLHNEQWdFQztBQWhGRCx5REFBMkM7QUFnQjNDLFNBQWdCLHFCQUFxQixDQUFDLEVBQ3BDLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUNwQyxJQUFJLEdBQUcsTUFBTSxHQUNFO0lBQ2YsSUFBSSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCx5RUFBeUU7SUFDekUsTUFBTSxPQUFPLEdBQUcsVUFBVTtTQUN2QixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2pDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUNuQyxDQUFDLEVBQUUsa0JBQWtCO1FBQ3JCLE9BQU87UUFDUCxPQUFPO0tBQ1IsQ0FBQyxDQUFDO0lBRUgsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDcEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbkMsTUFBTSxFQUFFLElBQUk7WUFDWixPQUFPO1NBQ1IsQ0FBQyxDQUFDO1FBQ0gsT0FBTztZQUNMLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBUTtZQUN0QixJQUFJO1lBQ0osWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQzFCLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDckIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDckMsTUFBTSxFQUFFLElBQUk7WUFDWixPQUFPO1NBQ1IsQ0FBQyxDQUFDO1FBQ0gsT0FBTztZQUNMLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBUTtZQUN2QixJQUFJO1lBQ0osYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQzNCLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDckMsTUFBTSxFQUFFLElBQUk7WUFDWixPQUFPO1NBQ1IsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbkMsTUFBTSxFQUFFLEtBQUs7WUFDYixPQUFPO1NBQ1IsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNMLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBUTtZQUN0QixJQUFJO1lBQ0osWUFBWSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQzFCLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTTtTQUMzQixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLElBQUksRUFBRSxDQUFDLENBQUM7QUFDeEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGJpdGNvaW5qcyBmcm9tICdiaXRjb2luanMtbGliJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTXVsdGlTaWdDb25maWcge1xyXG4gIHB1YmxpY0tleXM6IHN0cmluZ1tdO1xyXG4gIHJlcXVpcmVkU2lnbmF0dXJlczogbnVtYmVyO1xyXG4gIG5ldHdvcms/OiBiaXRjb2luanMuTmV0d29yaztcclxuICB0eXBlPzogJ1AyU0gnIHwgJ1AyU0gtUDJXU0gnIHwgJ1AyV1NIJztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNdWx0aVNpZ1Jlc3VsdCB7XHJcbiAgYWRkcmVzczogc3RyaW5nO1xyXG4gIHR5cGU6IHN0cmluZztcclxuICByZWRlZW1TY3JpcHQ/OiBCdWZmZXI7XHJcbiAgd2l0bmVzc1NjcmlwdD86IEJ1ZmZlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU11bHRpU2lnQWRkcmVzcyh7XHJcbiAgcHVibGljS2V5cyxcclxuICByZXF1aXJlZFNpZ25hdHVyZXMsXHJcbiAgbmV0d29yayA9IGJpdGNvaW5qcy5uZXR3b3Jrcy5iaXRjb2luLFxyXG4gIHR5cGUgPSAnUDJTSCcsXHJcbn06IE11bHRpU2lnQ29uZmlnKTogTXVsdGlTaWdSZXN1bHQge1xyXG4gIGlmIChyZXF1aXJlZFNpZ25hdHVyZXMgPiBwdWJsaWNLZXlzLmxlbmd0aCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdyZXF1aXJlZFNpZ25hdHVyZXMgY2Fubm90IGJlIGdyZWF0ZXIgdGhhbiBudW1iZXIgb2YgcHVibGljIGtleXMnKTtcclxuICB9XHJcblxyXG4gIC8vIFNvcnQgcHVibGljIGtleXMgbGV4aWNvZ3JhcGhpY2FsbHkgdG8gc3VwcG9ydCBCSVA0NSAmIEJJUDY3IHZhbGlkYXRpb25cclxuICBjb25zdCBwdWJrZXlzID0gcHVibGljS2V5c1xyXG4gICAgLm1hcCgoaykgPT4gQnVmZmVyLmZyb20oaywgJ2hleCcpKVxyXG4gICAgLnNvcnQoKGEsIGIpID0+IGEuY29tcGFyZShiKSk7XHJcblxyXG4gIGNvbnN0IHAybXMgPSBiaXRjb2luanMucGF5bWVudHMucDJtcyh7XHJcbiAgICBtOiByZXF1aXJlZFNpZ25hdHVyZXMsXHJcbiAgICBwdWJrZXlzLFxyXG4gICAgbmV0d29yayxcclxuICB9KTtcclxuXHJcbiAgaWYgKHR5cGUgPT09ICdQMlNIJykge1xyXG4gICAgY29uc3QgcDJzaCA9IGJpdGNvaW5qcy5wYXltZW50cy5wMnNoKHtcclxuICAgICAgcmVkZWVtOiBwMm1zLFxyXG4gICAgICBuZXR3b3JrLFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhZGRyZXNzOiBwMnNoLmFkZHJlc3MhLFxyXG4gICAgICB0eXBlLFxyXG4gICAgICByZWRlZW1TY3JpcHQ6IHAybXMub3V0cHV0LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlID09PSAnUDJXU0gnKSB7XHJcbiAgICBjb25zdCBwMndzaCA9IGJpdGNvaW5qcy5wYXltZW50cy5wMndzaCh7XHJcbiAgICAgIHJlZGVlbTogcDJtcyxcclxuICAgICAgbmV0d29yayxcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWRkcmVzczogcDJ3c2guYWRkcmVzcyEsXHJcbiAgICAgIHR5cGUsXHJcbiAgICAgIHdpdG5lc3NTY3JpcHQ6IHAybXMub3V0cHV0LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlID09PSAnUDJTSC1QMldTSCcpIHtcclxuICAgIGNvbnN0IHAyd3NoID0gYml0Y29pbmpzLnBheW1lbnRzLnAyd3NoKHtcclxuICAgICAgcmVkZWVtOiBwMm1zLFxyXG4gICAgICBuZXR3b3JrLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBwMnNoID0gYml0Y29pbmpzLnBheW1lbnRzLnAyc2goe1xyXG4gICAgICByZWRlZW06IHAyd3NoLFxyXG4gICAgICBuZXR3b3JrLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWRkcmVzczogcDJzaC5hZGRyZXNzISxcclxuICAgICAgdHlwZSxcclxuICAgICAgcmVkZWVtU2NyaXB0OiBwMndzaC5vdXRwdXQsXHJcbiAgICAgIHdpdG5lc3NTY3JpcHQ6IHAybXMub3V0cHV0LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgbXVsdGlzaWcgdHlwZTogJHt0eXBlfWApO1xyXG59XHJcbiJdfQ==
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
exports.generateAddress = generateAddress;
const bitcoinjs = __importStar(require("bitcoinjs-lib"));
function generateAddress(bip32ExtendedKey, network, index) {
    const wallet = bip32ExtendedKey.derive(index);
    const hasPrivkey = !wallet.isNeutered();
    let privkey;
    if (hasPrivkey) {
        privkey = wallet.toWIF();
    }
    const pubkey = wallet.publicKey.toString("hex");
    // Convert publicKey to Buffer if it's a Uint8Array
    const pubkeyBuffer = Buffer.isBuffer(wallet.publicKey)
        ? wallet.publicKey
        : Buffer.from(wallet.publicKey);
    const { address } = bitcoinjs.payments.p2wpkh({
        network,
        pubkey: pubkeyBuffer, // Use the Buffer version
    });
    return {
        wallet,
        address,
        pubkey,
        privkey,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVBZGRyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGVBZGRyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsMENBMEJDO0FBNUJELHlEQUEyQztBQUUzQyxTQUFnQixlQUFlLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLEtBQUs7SUFDOUQsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTlDLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3hDLElBQUksT0FBTyxDQUFDO0lBQ1osSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNmLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRWhELG1EQUFtRDtJQUNuRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO1FBQ2xCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVsQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDNUMsT0FBTztRQUNQLE1BQU0sRUFBRSxZQUFZLEVBQUUseUJBQXlCO0tBQ2hELENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxNQUFNO1FBQ04sT0FBTztRQUNQLE1BQU07UUFDTixPQUFPO0tBQ1IsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBiaXRjb2luanMgZnJvbSBcImJpdGNvaW5qcy1saWJcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFkZHJlc3MoYmlwMzJFeHRlbmRlZEtleSwgbmV0d29yaywgaW5kZXgpIHtcclxuICBjb25zdCB3YWxsZXQgPSBiaXAzMkV4dGVuZGVkS2V5LmRlcml2ZShpbmRleCk7XHJcblxyXG4gIGNvbnN0IGhhc1ByaXZrZXkgPSAhd2FsbGV0LmlzTmV1dGVyZWQoKTtcclxuICBsZXQgcHJpdmtleTtcclxuICBpZiAoaGFzUHJpdmtleSkge1xyXG4gICAgcHJpdmtleSA9IHdhbGxldC50b1dJRigpO1xyXG4gIH1cclxuICBjb25zdCBwdWJrZXkgPSB3YWxsZXQucHVibGljS2V5LnRvU3RyaW5nKFwiaGV4XCIpO1xyXG5cclxuICAvLyBDb252ZXJ0IHB1YmxpY0tleSB0byBCdWZmZXIgaWYgaXQncyBhIFVpbnQ4QXJyYXlcclxuICBjb25zdCBwdWJrZXlCdWZmZXIgPSBCdWZmZXIuaXNCdWZmZXIod2FsbGV0LnB1YmxpY0tleSkgXHJcbiAgICA/IHdhbGxldC5wdWJsaWNLZXkgXHJcbiAgICA6IEJ1ZmZlci5mcm9tKHdhbGxldC5wdWJsaWNLZXkpO1xyXG5cclxuICBjb25zdCB7IGFkZHJlc3MgfSA9IGJpdGNvaW5qcy5wYXltZW50cy5wMndwa2goe1xyXG4gICAgbmV0d29yayxcclxuICAgIHB1YmtleTogcHVia2V5QnVmZmVyLCAvLyBVc2UgdGhlIEJ1ZmZlciB2ZXJzaW9uXHJcbiAgfSk7XHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIHdhbGxldCxcclxuICAgIGFkZHJlc3MsXHJcbiAgICBwdWJrZXksXHJcbiAgICBwcml2a2V5LFxyXG4gIH07XHJcbn0iXX0=
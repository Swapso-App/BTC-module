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
    let wallet = bip32ExtendedKey.derive(index);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVBZGRyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGVBZGRyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsMENBMEJDO0FBNUJELHlEQUEyQztBQUUzQyxTQUFnQixlQUFlLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLEtBQUs7SUFDOUQsSUFBSSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTVDLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3hDLElBQUksT0FBTyxDQUFDO0lBQ1osSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNmLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRWhELG1EQUFtRDtJQUNuRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO1FBQ2xCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVsQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDNUMsT0FBTztRQUNQLE1BQU0sRUFBRSxZQUFZLEVBQUUseUJBQXlCO0tBQ2hELENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxNQUFNO1FBQ04sT0FBTztRQUNQLE1BQU07UUFDTixPQUFPO0tBQ1IsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBiaXRjb2luanMgZnJvbSBcImJpdGNvaW5qcy1saWJcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFkZHJlc3MoYmlwMzJFeHRlbmRlZEtleSwgbmV0d29yaywgaW5kZXgpIHtcclxuICBsZXQgd2FsbGV0ID0gYmlwMzJFeHRlbmRlZEtleS5kZXJpdmUoaW5kZXgpO1xyXG5cclxuICBjb25zdCBoYXNQcml2a2V5ID0gIXdhbGxldC5pc05ldXRlcmVkKCk7XHJcbiAgbGV0IHByaXZrZXk7XHJcbiAgaWYgKGhhc1ByaXZrZXkpIHtcclxuICAgIHByaXZrZXkgPSB3YWxsZXQudG9XSUYoKTtcclxuICB9XHJcbiAgY29uc3QgcHVia2V5ID0gd2FsbGV0LnB1YmxpY0tleS50b1N0cmluZyhcImhleFwiKTtcclxuXHJcbiAgLy8gQ29udmVydCBwdWJsaWNLZXkgdG8gQnVmZmVyIGlmIGl0J3MgYSBVaW50OEFycmF5XHJcbiAgY29uc3QgcHVia2V5QnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKHdhbGxldC5wdWJsaWNLZXkpIFxyXG4gICAgPyB3YWxsZXQucHVibGljS2V5IFxyXG4gICAgOiBCdWZmZXIuZnJvbSh3YWxsZXQucHVibGljS2V5KTtcclxuXHJcbiAgY29uc3QgeyBhZGRyZXNzIH0gPSBiaXRjb2luanMucGF5bWVudHMucDJ3cGtoKHtcclxuICAgIG5ldHdvcmssXHJcbiAgICBwdWJrZXk6IHB1YmtleUJ1ZmZlciwgLy8gVXNlIHRoZSBCdWZmZXIgdmVyc2lvblxyXG4gIH0pO1xyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICB3YWxsZXQsXHJcbiAgICBhZGRyZXNzLFxyXG4gICAgcHVia2V5LFxyXG4gICAgcHJpdmtleSxcclxuICB9O1xyXG59Il19
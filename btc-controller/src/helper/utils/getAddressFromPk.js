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
exports.getAddressFromPk = getAddressFromPk;
const bitcoinjs = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("@bitcoinerlab/secp256k1"));
const ecpair_1 = __importDefault(require("ecpair"));
function getAddressFromPk(privateKeyHex, network, index) {
    const ECPair = (0, ecpair_1.default)(ecc);
    const ec_pair = ECPair.fromWIF(privateKeyHex, network);
    const { address } = bitcoinjs.payments.p2wpkh({
        network,
        // pubkey: ec_pair.publicKey,
        pubkey: ec_pair.publicKey,
    });
    return address;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QWRkcmVzc0Zyb21Qay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldEFkZHJlc3NGcm9tUGsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJQSw0Q0FTQztBQWJELHlEQUEyQztBQUMzQyw2REFBK0M7QUFDL0Msb0RBQW1DO0FBRW5DLFNBQWdCLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsS0FBTTtJQUM3RCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFhLEVBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkQsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQzVDLE9BQU87UUFDUCw2QkFBNkI7UUFDN0IsTUFBTSxFQUFFLE9BQU8sQ0FBQyxTQUFTO0tBQzFCLENBQUMsQ0FBQztJQUNILE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBiaXRjb2luanMgZnJvbSBcImJpdGNvaW5qcy1saWJcIjtcclxuaW1wb3J0ICogYXMgZWNjIGZyb20gXCJAYml0Y29pbmVybGFiL3NlY3AyNTZrMVwiO1xyXG5pbXBvcnQgRUNQYWlyRmFjdG9yeSBmcm9tIFwiZWNwYWlyXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWRkcmVzc0Zyb21Qayhwcml2YXRlS2V5SGV4LCBuZXR3b3JrLCBpbmRleD8pIHtcclxuICBjb25zdCBFQ1BhaXIgPSBFQ1BhaXJGYWN0b3J5KGVjYyk7XHJcbiAgY29uc3QgZWNfcGFpciA9IEVDUGFpci5mcm9tV0lGKHByaXZhdGVLZXlIZXgsIG5ldHdvcmspO1xyXG4gIGNvbnN0IHsgYWRkcmVzcyB9ID0gYml0Y29pbmpzLnBheW1lbnRzLnAyd3BraCh7XHJcbiAgICBuZXR3b3JrLFxyXG4gICAgLy8gcHVia2V5OiBlY19wYWlyLnB1YmxpY0tleSxcclxuICAgIHB1YmtleTogZWNfcGFpci5wdWJsaWNLZXksXHJcbiAgfSk7XHJcbiAgcmV0dXJuIGFkZHJlc3M7XHJcbn1cclxuIl19
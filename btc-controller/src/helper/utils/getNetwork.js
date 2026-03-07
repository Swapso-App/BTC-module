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
exports.getNetwork = getNetwork;
const bitcoinjs = __importStar(require("bitcoinjs-lib"));
const index_1 = require("../../config/index");
function getNetwork(_network) {
    const { MAINNET, TESTNET } = index_1.bitcoin_network;
    return _network === TESTNET.NETWORK
        ? bitcoinjs.networks.testnet
        : bitcoinjs.networks.bitcoin;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldE5ldHdvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHQSxnQ0FPQztBQVZELHlEQUEyQztBQUMzQyw4Q0FBeUU7QUFFekUsU0FBZ0IsVUFBVSxDQUN4QixRQUE0QjtJQUU1QixNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLHVCQUFlLENBQUM7SUFDN0MsT0FBTyxRQUFRLEtBQUssT0FBTyxDQUFDLE9BQU87UUFDakMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTztRQUM1QixDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGJpdGNvaW5qcyBmcm9tIFwiYml0Y29pbmpzLWxpYlwiO1xyXG5pbXBvcnQgeyBiaXRjb2luX25ldHdvcmssIEJpdGNvaW5OZXR3b3JrTmFtZSB9IGZyb20gXCIuLi8uLi9jb25maWcvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXROZXR3b3JrKFxyXG4gIF9uZXR3b3JrOiBCaXRjb2luTmV0d29ya05hbWVcclxuKTogYml0Y29pbmpzLm5ldHdvcmtzLk5ldHdvcmsge1xyXG4gIGNvbnN0IHsgTUFJTk5FVCwgVEVTVE5FVCB9ID0gYml0Y29pbl9uZXR3b3JrO1xyXG4gIHJldHVybiBfbmV0d29yayA9PT0gVEVTVE5FVC5ORVRXT1JLXHJcbiAgICA/IGJpdGNvaW5qcy5uZXR3b3Jrcy50ZXN0bmV0XHJcbiAgICA6IGJpdGNvaW5qcy5uZXR3b3Jrcy5iaXRjb2luO1xyXG59XHJcbiJdfQ==
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
    const { TESTNET } = index_1.bitcoin_network;
    return _network === TESTNET.NETWORK
        ? bitcoinjs.networks.testnet
        : bitcoinjs.networks.bitcoin;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldE5ldHdvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHQSxnQ0FPQztBQVZELHlEQUEyQztBQUMzQyw4Q0FBeUU7QUFFekUsU0FBZ0IsVUFBVSxDQUN4QixRQUE0QjtJQUU1QixNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsdUJBQWUsQ0FBQztJQUNwQyxPQUFPLFFBQVEsS0FBSyxPQUFPLENBQUMsT0FBTztRQUNqQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPO1FBQzVCLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYml0Y29pbmpzIGZyb20gXCJiaXRjb2luanMtbGliXCI7XHJcbmltcG9ydCB7IGJpdGNvaW5fbmV0d29yaywgQml0Y29pbk5ldHdvcmtOYW1lIH0gZnJvbSBcIi4uLy4uL2NvbmZpZy9pbmRleFwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE5ldHdvcmsoXHJcbiAgX25ldHdvcms6IEJpdGNvaW5OZXR3b3JrTmFtZVxyXG4pOiBiaXRjb2luanMubmV0d29ya3MuTmV0d29yayB7XHJcbiAgY29uc3QgeyBURVNUTkVUIH0gPSBiaXRjb2luX25ldHdvcms7XHJcbiAgcmV0dXJuIF9uZXR3b3JrID09PSBURVNUTkVULk5FVFdPUktcclxuICAgID8gYml0Y29pbmpzLm5ldHdvcmtzLnRlc3RuZXRcclxuICAgIDogYml0Y29pbmpzLm5ldHdvcmtzLmJpdGNvaW47XHJcbn1cclxuIl19
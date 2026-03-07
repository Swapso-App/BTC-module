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
exports.TransactionVisualizer = exports.getTransactionSize = exports.getFeeAndInput = exports.utils = exports.signTransaction = void 0;
const signTransaction_1 = require("./signTransaction");
Object.defineProperty(exports, "signTransaction", { enumerable: true, get: function () { return signTransaction_1.signTransaction; } });
const calculateFeeAndInput_1 = require("./calculateFeeAndInput");
Object.defineProperty(exports, "getFeeAndInput", { enumerable: true, get: function () { return calculateFeeAndInput_1.getFeeAndInput; } });
Object.defineProperty(exports, "getTransactionSize", { enumerable: true, get: function () { return calculateFeeAndInput_1.getTransactionSize; } });
const transactionVisualizer_1 = require("./transactionVisualizer");
Object.defineProperty(exports, "TransactionVisualizer", { enumerable: true, get: function () { return transactionVisualizer_1.TransactionVisualizer; } });
const utils = __importStar(require("./utils/index"));
exports.utils = utils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1REFBb0Q7QUFLM0MsZ0dBTEEsaUNBQWUsT0FLQTtBQUp4QixpRUFBNEU7QUFJM0MsK0ZBSnhCLHFDQUFjLE9BSXdCO0FBQUUsbUdBSnhCLHlDQUFrQixPQUl3QjtBQUhuRSxtRUFBZ0U7QUFHSyxzR0FINUQsNkNBQXFCLE9BRzREO0FBRjFGLHFEQUF1QztBQUViLHNCQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2lnblRyYW5zYWN0aW9uIH0gZnJvbSBcIi4vc2lnblRyYW5zYWN0aW9uXCI7XHJcbmltcG9ydCB7IGdldEZlZUFuZElucHV0LCBnZXRUcmFuc2FjdGlvblNpemUgfSBmcm9tIFwiLi9jYWxjdWxhdGVGZWVBbmRJbnB1dFwiO1xyXG5pbXBvcnQgeyBUcmFuc2FjdGlvblZpc3VhbGl6ZXIgfSBmcm9tIFwiLi90cmFuc2FjdGlvblZpc3VhbGl6ZXJcIjtcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSBcIi4vdXRpbHMvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCB7IHNpZ25UcmFuc2FjdGlvbiwgdXRpbHMsIGdldEZlZUFuZElucHV0LCBnZXRUcmFuc2FjdGlvblNpemUsIFRyYW5zYWN0aW9uVmlzdWFsaXplciB9O1xyXG5cclxuIl19
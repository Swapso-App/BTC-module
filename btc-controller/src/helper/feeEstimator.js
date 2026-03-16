"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feeEstimator = exports.FeeEstimator = void 0;
const axios_1 = __importDefault(require("axios"));
// ─── Constants ───────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 30000; // 30-second TTL
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100; // 100 ms between retries (keeps tests fast)
const MAX_HISTORY = 10;
const STATIC_FALLBACK_RATES = {
    slow: 1,
    normal: 5,
    fast: 10,
    urgent: 20,
};
const MEMPOOL_FEE_URL = {
    MAINNET: 'https://mempool.space/api/v1/fees/recommended',
    TESTNET: 'https://mempool.space/testnet/api/v1/fees/recommended',
};
const MEMPOOL_PRICE_URL = 'https://mempool.space/api/v1/prices';
// ─── FeeEstimator ────────────────────────────────────────────────────────────
class FeeEstimator {
    constructor() {
        this.cache = new Map();
        this.history = [];
    }
    // ── Internal helpers ──────────────────────────────────────────────────────
    /**
     * Pause execution for a short period.
     *
     * Used by retry backoff logic between failed HTTP attempts.
     *
     * @param ms Delay duration in milliseconds.
     * @returns Promise that resolves after the delay.
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Execute a GET request with bounded retry attempts.
     *
     * @param url Endpoint URL to fetch.
     * @param retries Maximum number of attempts (default: 3).
     * @returns Response payload (`response.data`) when successful.
     * @throws Last encountered request error after all retries fail.
     */
    async fetchWithRetry(url, retries = MAX_RETRIES) {
        let lastError = new Error('Unknown error');
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios_1.default.get(url, { timeout: 5000 });
                return response.data;
            }
            catch (err) {
                lastError = err;
                if (attempt < retries) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
        throw lastError;
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Fetch the recommended fee rates from mempool.space for the given network.
     *
     * - Results are cached for 30 seconds per network.
     * - Up to 3 HTTP attempts are made before falling back to static rates.
     * - Each successful fetch is recorded in the rate history (max 10 entries).
     *
     * @param network  'MAINNET' (default) or 'TESTNET'
    * @returns Recommended sat/vByte fee rates for all tiers.
     */
    async fetchRates(network = 'MAINNET') {
        var _a, _b, _c, _d;
        const cached = this.cache.get(network);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.rates;
        }
        try {
            const url = MEMPOOL_FEE_URL[network];
            const data = await this.fetchWithRetry(url);
            const rates = {
                slow: (_a = data.economyFee) !== null && _a !== void 0 ? _a : STATIC_FALLBACK_RATES.slow,
                normal: (_b = data.hourFee) !== null && _b !== void 0 ? _b : STATIC_FALLBACK_RATES.normal,
                fast: (_c = data.halfHourFee) !== null && _c !== void 0 ? _c : STATIC_FALLBACK_RATES.fast,
                urgent: (_d = data.fastestFee) !== null && _d !== void 0 ? _d : STATIC_FALLBACK_RATES.urgent,
            };
            // Update cache
            this.cache.set(network, { rates, expiresAt: Date.now() + CACHE_TTL_MS });
            // Record in history (capped at MAX_HISTORY)
            this.history.push({ rates, fetchedAt: Date.now(), network });
            if (this.history.length > MAX_HISTORY) {
                this.history.shift();
            }
            return rates;
        }
        catch (_e) {
            // Fallback — does NOT add a history entry
            return { ...STATIC_FALLBACK_RATES };
        }
    }
    /**
     * Extract the sat/vByte value for a specific fee tier from a `FeeRates` object.
     *
     * @param rates Fee rates grouped by tier.
     * @param tier Target tier to read.
     * @returns sat/vByte for the selected tier.
     */
    getRateForTier(rates, tier) {
        return rates[tier];
    }
    /**
     * Return a snapshot of the fee-rate fetch history (newest at the end).
     * Capped at 10 entries; only successful fetches are recorded.
     *
     * @returns Immutable copy of recorded successful rate fetches.
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * Clear the in-memory fetch history.
     *
     * @returns Nothing.
     */
    clearHistory() {
        this.history = [];
    }
    /**
     * Invalidate all cached fee rates, forcing a fresh fetch on the next call.
     *
     * @returns Nothing.
     */
    clearCache() {
        this.cache.clear();
    }
    // ── USD helpers ───────────────────────────────────────────────────────────
    /**
     * Fetch the current BTC/USD price from mempool.space.
     * Returns `null` if the price API is unavailable.
      *
      * @returns BTC price in USD, or `null` when unavailable.
     */
    async getBtcPriceUsd() {
        try {
            const data = await this.fetchWithRetry(MEMPOOL_PRICE_URL);
            return typeof (data === null || data === void 0 ? void 0 : data.USD) === 'number' ? data.USD : null;
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Convert a sat/vByte fee rate + transaction size into USD.
     *
     * @param satPerVByte  Fee rate in satoshis per virtual byte
     * @param vBytes       Estimated transaction size in virtual bytes
      * @returns Fee totals in sats, BTC, and USD (if price is available).
     */
    async getSatVByteToUsd(satPerVByte, vBytes) {
        const totalSats = satPerVByte * vBytes;
        const totalBtc = totalSats / 1e8;
        const btcPrice = await this.getBtcPriceUsd();
        const totalUSD = btcPrice !== null
            ? parseFloat((totalBtc * btcPrice).toFixed(6))
            : null;
        return { totalSats, totalBtc, totalUSD, btcPrice };
    }
    /**
     * Compare all four fee tiers (slow / normal / fast / urgent) for a given
     * transaction size. Returns sat/vByte, total sats, BTC, and USD per tier.
     *
     * @param vBytes   Estimated transaction size in virtual bytes
     * @param network  'MAINNET' (default) or 'TESTNET'
      * @returns Comparison object containing totals for each fee tier.
     */
    async compareTiers(vBytes, network = 'MAINNET') {
        const rates = await this.fetchRates(network);
        const btcPrice = await this.getBtcPriceUsd();
        const tiers = ['slow', 'normal', 'fast', 'urgent'];
        const result = {};
        for (const tier of tiers) {
            const satPerVByte = rates[tier];
            const totalSats = satPerVByte * vBytes;
            const totalBtc = totalSats / 1e8;
            result[tier] = {
                satPerVByte,
                totalSats,
                totalBtc,
                totalUSD: btcPrice !== null
                    ? parseFloat((totalBtc * btcPrice).toFixed(6))
                    : null,
            };
        }
        return result;
    }
}
exports.FeeEstimator = FeeEstimator;
/** Shared singleton instance — import this for general use. */
exports.feeEstimator = new FeeEstimator();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmVlRXN0aW1hdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmVlRXN0aW1hdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUEwQjtBQTZDMUIsZ0ZBQWdGO0FBRWhGLE1BQU0sWUFBWSxHQUFHLEtBQU0sQ0FBQyxDQUFNLGdCQUFnQjtBQUNsRCxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDdEIsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQVEsNENBQTRDO0FBQy9FLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztBQUV2QixNQUFNLHFCQUFxQixHQUFhO0lBQ3RDLElBQUksRUFBSSxDQUFDO0lBQ1QsTUFBTSxFQUFFLENBQUM7SUFDVCxJQUFJLEVBQUksRUFBRTtJQUNWLE1BQU0sRUFBRSxFQUFFO0NBQ1gsQ0FBQztBQUVGLE1BQU0sZUFBZSxHQUF1QztJQUMxRCxPQUFPLEVBQUUsK0NBQStDO0lBQ3hELE9BQU8sRUFBRSx1REFBdUQ7Q0FDakUsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQUcscUNBQXFDLENBQUM7QUFFaEUsZ0ZBQWdGO0FBRWhGLE1BQWEsWUFBWTtJQUF6QjtRQUNVLFVBQUssR0FBb0UsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuRixZQUFPLEdBQW1CLEVBQUUsQ0FBQztJQStMdkMsQ0FBQztJQTdMQyw2RUFBNkU7SUFFN0U7Ozs7Ozs7T0FPRztJQUNLLEtBQUssQ0FBQyxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQVcsRUFBRSxPQUFPLEdBQUcsV0FBVztRQUM3RCxJQUFJLFNBQVMsR0FBVSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNsRCxLQUFLLElB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QU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTdDLE1BQU0sS0FBSyxHQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUQsTUFBTSxNQUFNLEdBQUcsRUFBb0IsQ0FBQztRQUVwQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3pCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxNQUFNLFNBQVMsR0FBSyxXQUFXLEdBQUcsTUFBTSxDQUFDO1lBQ3pDLE1BQU0sUUFBUSxHQUFNLFNBQVMsR0FBRyxHQUFHLENBQUM7WUFFcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUNiLFdBQVc7Z0JBQ1gsU0FBUztnQkFDVCxRQUFRO2dCQUNSLFFBQVEsRUFBRSxRQUFRLEtBQUssSUFBSTtvQkFDekIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLENBQUMsQ0FBQyxJQUFJO2FBQ1QsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFqTUQsb0NBaU1DO0FBRUQsK0RBQStEO0FBQ2xELFFBQUEsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xyXG5pbXBvcnQgeyBCaXRjb2luTmV0d29ya05hbWUgfSBmcm9tICcuLi9jb25maWcnO1xyXG5cclxuLy8g4pSA4pSA4pSAIFR5cGVzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuZXhwb3J0IHR5cGUgRmVlVGllciA9ICdzbG93JyB8ICdub3JtYWwnIHwgJ2Zhc3QnIHwgJ3VyZ2VudCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZlZVJhdGVzIHtcclxuICAvKiogfmZldyBob3VycyAgIOKAlCBlY29ub215RmVlICAoc2F0L3ZCeXRlKSAqL1xyXG4gIHNsb3c6IG51bWJlcjtcclxuICAvKiogfjEgaG91ciAgICAgIOKAlCBob3VyRmVlICAgICAoc2F0L3ZCeXRlKSAqL1xyXG4gIG5vcm1hbDogbnVtYmVyO1xyXG4gIC8qKiB+MzAgbWludXRlcyAg4oCUIGhhbGZIb3VyRmVlIChzYXQvdkJ5dGUpICovXHJcbiAgZmFzdDogbnVtYmVyO1xyXG4gIC8qKiBuZXh0IGJsb2NrICAg4oCUIGZhc3Rlc3RGZWUgIChzYXQvdkJ5dGUpICovXHJcbiAgdXJnZW50OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmVlUmF0ZUVudHJ5IHtcclxuICByYXRlczogRmVlUmF0ZXM7XHJcbiAgLyoqIFVuaXggbXMgdGltZXN0YW1wIG9mIHdoZW4gdGhpcyBlbnRyeSB3YXMgZmV0Y2hlZCAqL1xyXG4gIGZldGNoZWRBdDogbnVtYmVyO1xyXG4gIG5ldHdvcms6IEJpdGNvaW5OZXR3b3JrTmFtZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTYXRWQnl0ZVRvVXNkUmVzdWx0IHtcclxuICB0b3RhbFNhdHM6IG51bWJlcjtcclxuICB0b3RhbEJ0YzogbnVtYmVyO1xyXG4gIC8qKiBudWxsIHdoZW4gdGhlIEJUQyBwcmljZSBBUEkgaXMgdW5hdmFpbGFibGUgKi9cclxuICB0b3RhbFVTRDogbnVtYmVyIHwgbnVsbDtcclxuICAvKiogbnVsbCB3aGVuIHRoZSBCVEMgcHJpY2UgQVBJIGlzIHVuYXZhaWxhYmxlICovXHJcbiAgYnRjUHJpY2U6IG51bWJlciB8IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFRpZXJDb21wYXJpc29uID0gUmVjb3JkPFxyXG4gIEZlZVRpZXIsXHJcbiAge1xyXG4gICAgc2F0UGVyVkJ5dGU6IG51bWJlcjtcclxuICAgIHRvdGFsU2F0czogbnVtYmVyO1xyXG4gICAgdG90YWxCdGM6IG51bWJlcjtcclxuICAgIC8qKiBudWxsIHdoZW4gdGhlIEJUQyBwcmljZSBBUEkgaXMgdW5hdmFpbGFibGUgKi9cclxuICAgIHRvdGFsVVNEOiBudW1iZXIgfCBudWxsO1xyXG4gIH1cclxuPjtcclxuXHJcbi8vIOKUgOKUgOKUgCBDb25zdGFudHMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5jb25zdCBDQUNIRV9UVExfTVMgPSAzMF8wMDA7ICAgICAgLy8gMzAtc2Vjb25kIFRUTFxyXG5jb25zdCBNQVhfUkVUUklFUyA9IDM7XHJcbmNvbnN0IFJFVFJZX0RFTEFZX01TID0gMTAwOyAgICAgICAgLy8gMTAwIG1zIGJldHdlZW4gcmV0cmllcyAoa2VlcHMgdGVzdHMgZmFzdClcclxuY29uc3QgTUFYX0hJU1RPUlkgPSAxMDtcclxuXHJcbmNvbnN0IFNUQVRJQ19GQUxMQkFDS19SQVRFUzogRmVlUmF0ZXMgPSB7XHJcbiAgc2xvdzogICAxLFxyXG4gIG5vcm1hbDogNSxcclxuICBmYXN0OiAgIDEwLFxyXG4gIHVyZ2VudDogMjAsXHJcbn07XHJcblxyXG5jb25zdCBNRU1QT09MX0ZFRV9VUkw6IFJlY29yZDxCaXRjb2luTmV0d29ya05hbWUsIHN0cmluZz4gPSB7XHJcbiAgTUFJTk5FVDogJ2h0dHBzOi8vbWVtcG9vbC5zcGFjZS9hcGkvdjEvZmVlcy9yZWNvbW1lbmRlZCcsXHJcbiAgVEVTVE5FVDogJ2h0dHBzOi8vbWVtcG9vbC5zcGFjZS90ZXN0bmV0L2FwaS92MS9mZWVzL3JlY29tbWVuZGVkJyxcclxufTtcclxuXHJcbmNvbnN0IE1FTVBPT0xfUFJJQ0VfVVJMID0gJ2h0dHBzOi8vbWVtcG9vbC5zcGFjZS9hcGkvdjEvcHJpY2VzJztcclxuXHJcbi8vIOKUgOKUgOKUgCBGZWVFc3RpbWF0b3Ig4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgY2xhc3MgRmVlRXN0aW1hdG9yIHtcclxuICBwcml2YXRlIGNhY2hlOiBNYXA8Qml0Y29pbk5ldHdvcmtOYW1lLCB7IHJhdGVzOiBGZWVSYXRlczsgZXhwaXJlc0F0OiBudW1iZXIgfT4gPSBuZXcgTWFwKCk7XHJcbiAgcHJpdmF0ZSBoaXN0b3J5OiBGZWVSYXRlRW50cnlbXSA9IFtdO1xyXG5cclxuICAvLyDilIDilIAgSW50ZXJuYWwgaGVscGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgLyoqXHJcbiAgICogUGF1c2UgZXhlY3V0aW9uIGZvciBhIHNob3J0IHBlcmlvZC5cclxuICAgKlxyXG4gICAqIFVzZWQgYnkgcmV0cnkgYmFja29mZiBsb2dpYyBiZXR3ZWVuIGZhaWxlZCBIVFRQIGF0dGVtcHRzLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIG1zIERlbGF5IGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcy5cclxuICAgKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgdGhlIGRlbGF5LlxyXG4gICAqL1xyXG4gIHByaXZhdGUgc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhIEdFVCByZXF1ZXN0IHdpdGggYm91bmRlZCByZXRyeSBhdHRlbXB0cy5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB1cmwgRW5kcG9pbnQgVVJMIHRvIGZldGNoLlxyXG4gICAqIEBwYXJhbSByZXRyaWVzIE1heGltdW0gbnVtYmVyIG9mIGF0dGVtcHRzIChkZWZhdWx0OiAzKS5cclxuICAgKiBAcmV0dXJucyBSZXNwb25zZSBwYXlsb2FkIChgcmVzcG9uc2UuZGF0YWApIHdoZW4gc3VjY2Vzc2Z1bC5cclxuICAgKiBAdGhyb3dzIExhc3QgZW5jb3VudGVyZWQgcmVxdWVzdCBlcnJvciBhZnRlciBhbGwgcmV0cmllcyBmYWlsLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hXaXRoUmV0cnkodXJsOiBzdHJpbmcsIHJldHJpZXMgPSBNQVhfUkVUUklFUyk6IFByb21pc2U8YW55PiB7XHJcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvciA9IG5ldyBFcnJvcignVW5rbm93biBlcnJvcicpO1xyXG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gcmV0cmllczsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQodXJsLCB7IHRpbWVvdXQ6IDUwMDAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgbGFzdEVycm9yID0gZXJyO1xyXG4gICAgICAgIGlmIChhdHRlbXB0IDwgcmV0cmllcykge1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcChSRVRSWV9ERUxBWV9NUyAqIGF0dGVtcHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhyb3cgbGFzdEVycm9yO1xyXG4gIH1cclxuXHJcbiAgLy8g4pSA4pSAIFB1YmxpYyBBUEkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHRoZSByZWNvbW1lbmRlZCBmZWUgcmF0ZXMgZnJvbSBtZW1wb29sLnNwYWNlIGZvciB0aGUgZ2l2ZW4gbmV0d29yay5cclxuICAgKlxyXG4gICAqIC0gUmVzdWx0cyBhcmUgY2FjaGVkIGZvciAzMCBzZWNvbmRzIHBlciBuZXR3b3JrLlxyXG4gICAqIC0gVXAgdG8gMyBIVFRQIGF0dGVtcHRzIGFyZSBtYWRlIGJlZm9yZSBmYWxsaW5nIGJhY2sgdG8gc3RhdGljIHJhdGVzLlxyXG4gICAqIC0gRWFjaCBzdWNjZXNzZnVsIGZldGNoIGlzIHJlY29yZGVkIGluIHRoZSByYXRlIGhpc3RvcnkgKG1heCAxMCBlbnRyaWVzKS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBuZXR3b3JrICAnTUFJTk5FVCcgKGRlZmF1bHQpIG9yICdURVNUTkVUJ1xyXG4gICogQHJldHVybnMgUmVjb21tZW5kZWQgc2F0L3ZCeXRlIGZlZSByYXRlcyBmb3IgYWxsIHRpZXJzLlxyXG4gICAqL1xyXG4gIGFzeW5jIGZldGNoUmF0ZXMobmV0d29yazogQml0Y29pbk5ldHdvcmtOYW1lID0gJ01BSU5ORVQnKTogUHJvbWlzZTxGZWVSYXRlcz4ge1xyXG4gICAgY29uc3QgY2FjaGVkID0gdGhpcy5jYWNoZS5nZXQobmV0d29yayk7XHJcbiAgICBpZiAoY2FjaGVkICYmIERhdGUubm93KCkgPCBjYWNoZWQuZXhwaXJlc0F0KSB7XHJcbiAgICAgIHJldHVybiBjYWNoZWQucmF0ZXM7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXJsID0gTUVNUE9PTF9GRUVfVVJMW25ldHdvcmtdO1xyXG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5mZXRjaFdpdGhSZXRyeSh1cmwpO1xyXG5cclxuICAgICAgY29uc3QgcmF0ZXM6IEZlZVJhdGVzID0ge1xyXG4gICAgICAgIHNsb3c6ICAgZGF0YS5lY29ub215RmVlICA/PyBTVEFUSUNfRkFMTEJBQ0tfUkFURVMuc2xvdyxcclxuICAgICAgICBub3JtYWw6IGRhdGEuaG91ckZlZSAgICAgPz8gU1RBVElDX0ZBTExCQUNLX1JBVEVTLm5vcm1hbCxcclxuICAgICAgICBmYXN0OiAgIGRhdGEuaGFsZkhvdXJGZWUgPz8gU1RBVElDX0ZBTExCQUNLX1JBVEVTLmZhc3QsXHJcbiAgICAgICAgdXJnZW50OiBkYXRhLmZhc3Rlc3RGZWUgID8/IFNUQVRJQ19GQUxMQkFDS19SQVRFUy51cmdlbnQsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBVcGRhdGUgY2FjaGVcclxuICAgICAgdGhpcy5jYWNoZS5zZXQobmV0d29yaywgeyByYXRlcywgZXhwaXJlc0F0OiBEYXRlLm5vdygpICsgQ0FDSEVfVFRMX01TIH0pO1xyXG5cclxuICAgICAgLy8gUmVjb3JkIGluIGhpc3RvcnkgKGNhcHBlZCBhdCBNQVhfSElTVE9SWSlcclxuICAgICAgdGhpcy5oaXN0b3J5LnB1c2goeyByYXRlcywgZmV0Y2hlZEF0OiBEYXRlLm5vdygpLCBuZXR3b3JrIH0pO1xyXG4gICAgICBpZiAodGhpcy5oaXN0b3J5Lmxlbmd0aCA+IE1BWF9ISVNUT1JZKSB7XHJcbiAgICAgICAgdGhpcy5oaXN0b3J5LnNoaWZ0KCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByYXRlcztcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBGYWxsYmFjayDigJQgZG9lcyBOT1QgYWRkIGEgaGlzdG9yeSBlbnRyeVxyXG4gICAgICByZXR1cm4geyAuLi5TVEFUSUNfRkFMTEJBQ0tfUkFURVMgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4dHJhY3QgdGhlIHNhdC92Qnl0ZSB2YWx1ZSBmb3IgYSBzcGVjaWZpYyBmZWUgdGllciBmcm9tIGEgYEZlZVJhdGVzYCBvYmplY3QuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gcmF0ZXMgRmVlIHJhdGVzIGdyb3VwZWQgYnkgdGllci5cclxuICAgKiBAcGFyYW0gdGllciBUYXJnZXQgdGllciB0byByZWFkLlxyXG4gICAqIEByZXR1cm5zIHNhdC92Qnl0ZSBmb3IgdGhlIHNlbGVjdGVkIHRpZXIuXHJcbiAgICovXHJcbiAgZ2V0UmF0ZUZvclRpZXIocmF0ZXM6IEZlZVJhdGVzLCB0aWVyOiBGZWVUaWVyKTogbnVtYmVyIHtcclxuICAgIHJldHVybiByYXRlc1t0aWVyXTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybiBhIHNuYXBzaG90IG9mIHRoZSBmZWUtcmF0ZSBmZXRjaCBoaXN0b3J5IChuZXdlc3QgYXQgdGhlIGVuZCkuXHJcbiAgICogQ2FwcGVkIGF0IDEwIGVudHJpZXM7IG9ubHkgc3VjY2Vzc2Z1bCBmZXRjaGVzIGFyZSByZWNvcmRlZC5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zIEltbXV0YWJsZSBjb3B5IG9mIHJlY29yZGVkIHN1Y2Nlc3NmdWwgcmF0ZSBmZXRjaGVzLlxyXG4gICAqL1xyXG4gIGdldEhpc3RvcnkoKTogRmVlUmF0ZUVudHJ5W10ge1xyXG4gICAgcmV0dXJuIFsuLi50aGlzLmhpc3RvcnldO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXIgdGhlIGluLW1lbW9yeSBmZXRjaCBoaXN0b3J5LlxyXG4gICAqXHJcbiAgICogQHJldHVybnMgTm90aGluZy5cclxuICAgKi9cclxuICBjbGVhckhpc3RvcnkoKTogdm9pZCB7XHJcbiAgICB0aGlzLmhpc3RvcnkgPSBbXTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEludmFsaWRhdGUgYWxsIGNhY2hlZCBmZWUgcmF0ZXMsIGZvcmNpbmcgYSBmcmVzaCBmZXRjaCBvbiB0aGUgbmV4dCBjYWxsLlxyXG4gICAqXHJcbiAgICogQHJldHVybnMgTm90aGluZy5cclxuICAgKi9cclxuICBjbGVhckNhY2hlKCk6IHZvaWQge1xyXG4gICAgdGhpcy5jYWNoZS5jbGVhcigpO1xyXG4gIH1cclxuXHJcbiAgLy8g4pSA4pSAIFVTRCBoZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCB0aGUgY3VycmVudCBCVEMvVVNEIHByaWNlIGZyb20gbWVtcG9vbC5zcGFjZS5cclxuICAgKiBSZXR1cm5zIGBudWxsYCBpZiB0aGUgcHJpY2UgQVBJIGlzIHVuYXZhaWxhYmxlLlxyXG4gICAgKlxyXG4gICAgKiBAcmV0dXJucyBCVEMgcHJpY2UgaW4gVVNELCBvciBgbnVsbGAgd2hlbiB1bmF2YWlsYWJsZS5cclxuICAgKi9cclxuICBhc3luYyBnZXRCdGNQcmljZVVzZCgpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmZldGNoV2l0aFJldHJ5KE1FTVBPT0xfUFJJQ0VfVVJMKTtcclxuICAgICAgcmV0dXJuIHR5cGVvZiBkYXRhPy5VU0QgPT09ICdudW1iZXInID8gZGF0YS5VU0QgOiBudWxsO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29udmVydCBhIHNhdC92Qnl0ZSBmZWUgcmF0ZSArIHRyYW5zYWN0aW9uIHNpemUgaW50byBVU0QuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gc2F0UGVyVkJ5dGUgIEZlZSByYXRlIGluIHNhdG9zaGlzIHBlciB2aXJ0dWFsIGJ5dGVcclxuICAgKiBAcGFyYW0gdkJ5dGVzICAgICAgIEVzdGltYXRlZCB0cmFuc2FjdGlvbiBzaXplIGluIHZpcnR1YWwgYnl0ZXNcclxuICAgICogQHJldHVybnMgRmVlIHRvdGFscyBpbiBzYXRzLCBCVEMsIGFuZCBVU0QgKGlmIHByaWNlIGlzIGF2YWlsYWJsZSkuXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0U2F0VkJ5dGVUb1VzZChzYXRQZXJWQnl0ZTogbnVtYmVyLCB2Qnl0ZXM6IG51bWJlcik6IFByb21pc2U8U2F0VkJ5dGVUb1VzZFJlc3VsdD4ge1xyXG4gICAgY29uc3QgdG90YWxTYXRzID0gc2F0UGVyVkJ5dGUgKiB2Qnl0ZXM7XHJcbiAgICBjb25zdCB0b3RhbEJ0YyAgPSB0b3RhbFNhdHMgLyAxZTg7XHJcbiAgICBjb25zdCBidGNQcmljZSAgPSBhd2FpdCB0aGlzLmdldEJ0Y1ByaWNlVXNkKCk7XHJcbiAgICBjb25zdCB0b3RhbFVTRCAgPSBidGNQcmljZSAhPT0gbnVsbFxyXG4gICAgICA/IHBhcnNlRmxvYXQoKHRvdGFsQnRjICogYnRjUHJpY2UpLnRvRml4ZWQoNikpXHJcbiAgICAgIDogbnVsbDtcclxuXHJcbiAgICByZXR1cm4geyB0b3RhbFNhdHMsIHRvdGFsQnRjLCB0b3RhbFVTRCwgYnRjUHJpY2UgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbXBhcmUgYWxsIGZvdXIgZmVlIHRpZXJzIChzbG93IC8gbm9ybWFsIC8gZmFzdCAvIHVyZ2VudCkgZm9yIGEgZ2l2ZW5cclxuICAgKiB0cmFuc2FjdGlvbiBzaXplLiBSZXR1cm5zIHNhdC92Qnl0ZSwgdG90YWwgc2F0cywgQlRDLCBhbmQgVVNEIHBlciB0aWVyLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHZCeXRlcyAgIEVzdGltYXRlZCB0cmFuc2FjdGlvbiBzaXplIGluIHZpcnR1YWwgYnl0ZXNcclxuICAgKiBAcGFyYW0gbmV0d29yayAgJ01BSU5ORVQnIChkZWZhdWx0KSBvciAnVEVTVE5FVCdcclxuICAgICogQHJldHVybnMgQ29tcGFyaXNvbiBvYmplY3QgY29udGFpbmluZyB0b3RhbHMgZm9yIGVhY2ggZmVlIHRpZXIuXHJcbiAgICovXHJcbiAgYXN5bmMgY29tcGFyZVRpZXJzKHZCeXRlczogbnVtYmVyLCBuZXR3b3JrOiBCaXRjb2luTmV0d29ya05hbWUgPSAnTUFJTk5FVCcpOiBQcm9taXNlPFRpZXJDb21wYXJpc29uPiB7XHJcbiAgICBjb25zdCByYXRlcyAgICA9IGF3YWl0IHRoaXMuZmV0Y2hSYXRlcyhuZXR3b3JrKTtcclxuICAgIGNvbnN0IGJ0Y1ByaWNlID0gYXdhaXQgdGhpcy5nZXRCdGNQcmljZVVzZCgpO1xyXG5cclxuICAgIGNvbnN0IHRpZXJzOiBGZWVUaWVyW10gPSBbJ3Nsb3cnLCAnbm9ybWFsJywgJ2Zhc3QnLCAndXJnZW50J107XHJcbiAgICBjb25zdCByZXN1bHQgPSB7fSBhcyBUaWVyQ29tcGFyaXNvbjtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRpZXIgb2YgdGllcnMpIHtcclxuICAgICAgY29uc3Qgc2F0UGVyVkJ5dGUgPSByYXRlc1t0aWVyXTtcclxuICAgICAgY29uc3QgdG90YWxTYXRzICAgPSBzYXRQZXJWQnl0ZSAqIHZCeXRlcztcclxuICAgICAgY29uc3QgdG90YWxCdGMgICAgPSB0b3RhbFNhdHMgLyAxZTg7XHJcblxyXG4gICAgICByZXN1bHRbdGllcl0gPSB7XHJcbiAgICAgICAgc2F0UGVyVkJ5dGUsXHJcbiAgICAgICAgdG90YWxTYXRzLFxyXG4gICAgICAgIHRvdGFsQnRjLFxyXG4gICAgICAgIHRvdGFsVVNEOiBidGNQcmljZSAhPT0gbnVsbFxyXG4gICAgICAgICAgPyBwYXJzZUZsb2F0KCh0b3RhbEJ0YyAqIGJ0Y1ByaWNlKS50b0ZpeGVkKDYpKVxyXG4gICAgICAgICAgOiBudWxsLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG4vKiogU2hhcmVkIHNpbmdsZXRvbiBpbnN0YW5jZSDigJQgaW1wb3J0IHRoaXMgZm9yIGdlbmVyYWwgdXNlLiAqL1xyXG5leHBvcnQgY29uc3QgZmVlRXN0aW1hdG9yID0gbmV3IEZlZUVzdGltYXRvcigpO1xyXG4iXX0=
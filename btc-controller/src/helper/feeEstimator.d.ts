import { BitcoinNetworkName } from '../config';
export type FeeTier = 'slow' | 'normal' | 'fast' | 'urgent';
export interface FeeRates {
    /** ~few hours   — economyFee  (sat/vByte) */
    slow: number;
    /** ~1 hour      — hourFee     (sat/vByte) */
    normal: number;
    /** ~30 minutes  — halfHourFee (sat/vByte) */
    fast: number;
    /** next block   — fastestFee  (sat/vByte) */
    urgent: number;
}
export interface FeeRateEntry {
    rates: FeeRates;
    /** Unix ms timestamp of when this entry was fetched */
    fetchedAt: number;
    network: BitcoinNetworkName;
}
export interface SatVByteToUsdResult {
    totalSats: number;
    totalBtc: number;
    /** null when the BTC price API is unavailable */
    totalUSD: number | null;
    /** null when the BTC price API is unavailable */
    btcPrice: number | null;
}
export type TierComparison = Record<FeeTier, {
    satPerVByte: number;
    totalSats: number;
    totalBtc: number;
    /** null when the BTC price API is unavailable */
    totalUSD: number | null;
}>;
export declare class FeeEstimator {
    private cache;
    private history;
    /**
     * Pause execution for a short period.
     *
     * Used by retry backoff logic between failed HTTP attempts.
     *
     * @param ms Delay duration in milliseconds.
     * @returns Promise that resolves after the delay.
     */
    private sleep;
    /**
     * Execute a GET request with bounded retry attempts.
     *
     * @param url Endpoint URL to fetch.
     * @param retries Maximum number of attempts (default: 3).
     * @returns Response payload (`response.data`) when successful.
     * @throws Last encountered request error after all retries fail.
     */
    private fetchWithRetry;
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
    fetchRates(network?: BitcoinNetworkName): Promise<FeeRates>;
    /**
     * Extract the sat/vByte value for a specific fee tier from a `FeeRates` object.
     *
     * @param rates Fee rates grouped by tier.
     * @param tier Target tier to read.
     * @returns sat/vByte for the selected tier.
     */
    getRateForTier(rates: FeeRates, tier: FeeTier): number;
    /**
     * Return a snapshot of the fee-rate fetch history (newest at the end).
     * Capped at 10 entries; only successful fetches are recorded.
     *
     * @returns Immutable copy of recorded successful rate fetches.
     */
    getHistory(): FeeRateEntry[];
    /**
     * Clear the in-memory fetch history.
     *
     * @returns Nothing.
     */
    clearHistory(): void;
    /**
     * Invalidate all cached fee rates, forcing a fresh fetch on the next call.
     *
     * @returns Nothing.
     */
    clearCache(): void;
    /**
     * Fetch the current BTC/USD price from mempool.space.
     * Returns `null` if the price API is unavailable.
      *
      * @returns BTC price in USD, or `null` when unavailable.
     */
    getBtcPriceUsd(): Promise<number | null>;
    /**
     * Convert a sat/vByte fee rate + transaction size into USD.
     *
     * @param satPerVByte  Fee rate in satoshis per virtual byte
     * @param vBytes       Estimated transaction size in virtual bytes
      * @returns Fee totals in sats, BTC, and USD (if price is available).
     */
    getSatVByteToUsd(satPerVByte: number, vBytes: number): Promise<SatVByteToUsdResult>;
    /**
     * Compare all four fee tiers (slow / normal / fast / urgent) for a given
     * transaction size. Returns sat/vByte, total sats, BTC, and USD per tier.
     *
     * @param vBytes   Estimated transaction size in virtual bytes
     * @param network  'MAINNET' (default) or 'TESTNET'
      * @returns Comparison object containing totals for each fee tier.
     */
    compareTiers(vBytes: number, network?: BitcoinNetworkName): Promise<TierComparison>;
}
/** Shared singleton instance — import this for general use. */
export declare const feeEstimator: FeeEstimator;

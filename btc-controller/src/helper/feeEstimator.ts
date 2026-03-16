import axios from 'axios';
import { BitcoinNetworkName } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

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

export type TierComparison = Record<
  FeeTier,
  {
    satPerVByte: number;
    totalSats: number;
    totalBtc: number;
    /** null when the BTC price API is unavailable */
    totalUSD: number | null;
  }
>;

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;      // 30-second TTL
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;        // 100 ms between retries (keeps tests fast)
const MAX_HISTORY = 10;

const STATIC_FALLBACK_RATES: FeeRates = {
  slow:   1,
  normal: 5,
  fast:   10,
  urgent: 20,
};

const MEMPOOL_FEE_URL: Record<BitcoinNetworkName, string> = {
  MAINNET: 'https://mempool.space/api/v1/fees/recommended',
  TESTNET: 'https://mempool.space/testnet/api/v1/fees/recommended',
};

const MEMPOOL_PRICE_URL = 'https://mempool.space/api/v1/prices';

// ─── FeeEstimator ────────────────────────────────────────────────────────────

export class FeeEstimator {
  private cache: Map<BitcoinNetworkName, { rates: FeeRates; expiresAt: number }> = new Map();
  private history: FeeRateEntry[] = [];

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Pause execution for a short period.
   *
   * Used by retry backoff logic between failed HTTP attempts.
   *
   * @param ms Delay duration in milliseconds.
   * @returns Promise that resolves after the delay.
   */
  private sleep(ms: number): Promise<void> {
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
  private async fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    let lastError: Error = new Error('Unknown error');
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data;
      } catch (err: any) {
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
  async fetchRates(network: BitcoinNetworkName = 'MAINNET'): Promise<FeeRates> {
    const cached = this.cache.get(network);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.rates;
    }

    try {
      const url = MEMPOOL_FEE_URL[network];
      const data = await this.fetchWithRetry(url);

      const rates: FeeRates = {
        slow:   data.economyFee  ?? STATIC_FALLBACK_RATES.slow,
        normal: data.hourFee     ?? STATIC_FALLBACK_RATES.normal,
        fast:   data.halfHourFee ?? STATIC_FALLBACK_RATES.fast,
        urgent: data.fastestFee  ?? STATIC_FALLBACK_RATES.urgent,
      };

      // Update cache
      this.cache.set(network, { rates, expiresAt: Date.now() + CACHE_TTL_MS });

      // Record in history (capped at MAX_HISTORY)
      this.history.push({ rates, fetchedAt: Date.now(), network });
      if (this.history.length > MAX_HISTORY) {
        this.history.shift();
      }

      return rates;
    } catch {
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
  getRateForTier(rates: FeeRates, tier: FeeTier): number {
    return rates[tier];
  }

  /**
   * Return a snapshot of the fee-rate fetch history (newest at the end).
   * Capped at 10 entries; only successful fetches are recorded.
   *
   * @returns Immutable copy of recorded successful rate fetches.
   */
  getHistory(): FeeRateEntry[] {
    return [...this.history];
  }

  /**
   * Clear the in-memory fetch history.
   *
   * @returns Nothing.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Invalidate all cached fee rates, forcing a fresh fetch on the next call.
   *
   * @returns Nothing.
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ── USD helpers ───────────────────────────────────────────────────────────

  /**
   * Fetch the current BTC/USD price from mempool.space.
   * Returns `null` if the price API is unavailable.
    *
    * @returns BTC price in USD, or `null` when unavailable.
   */
  async getBtcPriceUsd(): Promise<number | null> {
    try {
      const data = await this.fetchWithRetry(MEMPOOL_PRICE_URL);
      return typeof data?.USD === 'number' ? data.USD : null;
    } catch {
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
  async getSatVByteToUsd(satPerVByte: number, vBytes: number): Promise<SatVByteToUsdResult> {
    const totalSats = satPerVByte * vBytes;
    const totalBtc  = totalSats / 1e8;
    const btcPrice  = await this.getBtcPriceUsd();
    const totalUSD  = btcPrice !== null
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
  async compareTiers(vBytes: number, network: BitcoinNetworkName = 'MAINNET'): Promise<TierComparison> {
    const rates    = await this.fetchRates(network);
    const btcPrice = await this.getBtcPriceUsd();

    const tiers: FeeTier[] = ['slow', 'normal', 'fast', 'urgent'];
    const result = {} as TierComparison;

    for (const tier of tiers) {
      const satPerVByte = rates[tier];
      const totalSats   = satPerVByte * vBytes;
      const totalBtc    = totalSats / 1e8;

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

/** Shared singleton instance — import this for general use. */
export const feeEstimator = new FeeEstimator();

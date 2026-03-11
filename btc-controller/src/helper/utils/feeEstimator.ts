import axios from "axios";
import { BitcoinNetworkName } from "../../config";

// ─────────────────────────────────────────────────────────────────── //
// Types
// ─────────────────────────────────────────────────────────────────── //

export type FeeRatePriority = "fastest" | "halfHour" | "hour" | "economy" | "minimum";

interface MempoolFeeResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// ─────────────────────────────────────────────────────────────────── //
// Constants
// ─────────────────────────────────────────────────────────────────── //

const MEMPOOL_API_URLS: Record<string, string> = {
  MAINNET: "https://mempool.space/api/v1/fees/recommended",
  TESTNET: "https://mempool.space/testnet/api/v1/fees/recommended",
};

const PRIORITY_KEY_MAP: Record<FeeRatePriority, keyof MempoolFeeResponse> = {
  fastest: "fastestFee",
  halfHour: "halfHourFee",
  hour: "hourFee",
  economy: "economyFee",
  minimum: "minimumFee",
};

/**
 * Conservative static fallback rates (sat/vByte) used when all network
 * attempts are exhausted.  These are intentionally a bit above the true
 * minimum so transactions still confirm in a reasonable time.
 */
const STATIC_FALLBACK_RATES: Record<FeeRatePriority, number> = {
  fastest: 20,
  halfHour: 10,
  hour: 5,
  economy: 3,
  minimum: 1,
};

// ─────────────────────────────────────────────────────────────────── //
// FeeEstimator
// ─────────────────────────────────────────────────────────────────── //

export class FeeEstimator {
  /** How many times to attempt the API before falling back. */
  static readonly DEFAULT_MAX_RETRIES = 3;

  /** Base delay (ms) between retries — doubles on each subsequent attempt. */
  static readonly BASE_RETRY_DELAY_MS = 500;

  /** Request timeout (ms) per attempt. */
  static readonly REQUEST_TIMEOUT_MS = 5000;

  static readonly DEFAULT_PRIORITY: FeeRatePriority = "halfHour";

  /**
   * Fetch the recommended fee rate (sat/vByte) from the mempool.space API.
   *
   * Retry logic:
   *   - Attempt 1   → immediate
   *   - Attempt 2   → wait BASE_RETRY_DELAY_MS  (500 ms)
   *   - Attempt 3   → wait BASE_RETRY_DELAY_MS × 2 (1 000 ms)
   *   - … and so on (exponential back-off)
   *
   * If every attempt fails, the function logs a warning and returns
   * `staticFallbackRate` (if supplied) or the built-in default for the
   * requested priority level — it never throws.
   *
   * @param network          "MAINNET" | "TESTNET"
   * @param priority         Which fee tier to return (default: "halfHour")
   * @param maxRetries       Maximum network attempts (default: 3)
   * @param staticFallbackRate  Override the built-in fallback (sat/vByte)
   */
  static async getFeeRate(
    network: BitcoinNetworkName = "MAINNET",
    priority: FeeRatePriority = FeeEstimator.DEFAULT_PRIORITY,
    maxRetries: number = FeeEstimator.DEFAULT_MAX_RETRIES,
    staticFallbackRate?: number
  ): Promise<number> {
    const fallback = staticFallbackRate ?? STATIC_FALLBACK_RATES[priority];
    const url = MEMPOOL_API_URLS[network] ?? MEMPOOL_API_URLS["MAINNET"];
    const key = PRIORITY_KEY_MAP[priority];

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Exponential back-off: skip delay on the first attempt
      if (attempt > 0) {
        const delay = FeeEstimator.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }

      try {
        const response = await axios.get<MempoolFeeResponse>(url, {
          timeout: FeeEstimator.REQUEST_TIMEOUT_MS,
        });

        const rate = response.data[key];

        if (typeof rate !== "number" || rate <= 0) {
          throw new Error(`Invalid fee rate in API response: ${String(rate)}`);
        }

        return rate;
      } catch (err) {
        lastError = err;
      }
    }

    console.warn(
      `[FeeEstimator] All ${maxRetries} attempt(s) failed for ${network}/${priority}. ` +
        `Falling back to static rate: ${fallback} sat/vByte. ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );

    return fallback;
  }
}

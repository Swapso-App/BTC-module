'use strict';

const assert   = require('assert');
const nock     = require('nock');
const { FeeEstimator } = require('../src/helper/feeEstimator');

const MEMPOOL_BASE = 'https://mempool.space';

// ─────────────────────────────────────────────────────────────────── //
// Shared mock responses
// ─────────────────────────────────────────────────────────────────── //

const MAINNET_FEE_RESPONSE = {
    fastestFee:  20,
    halfHourFee: 15,
    hourFee:     10,
    economyFee:   5,
    minimumFee:   1,
};

const TESTNET_FEE_RESPONSE = {
    fastestFee:  3,
    halfHourFee: 2,
    hourFee:     1,
    economyFee:  1,
    minimumFee:  1,
};

const PRICE_RESPONSE = { USD: 60000, EUR: 55000 };

// ─────────────────────────────────────────────────────────────────── //
// Mock helpers
// ─────────────────────────────────────────────────────────────────── //

function mockMainnetFees(times = 1) {
    nock(MEMPOOL_BASE)
        .get('/api/v1/fees/recommended')
        .times(times)
        .reply(200, MAINNET_FEE_RESPONSE);
}

function mockTestnetFees(times = 1) {
    nock(MEMPOOL_BASE)
        .get('/testnet/api/v1/fees/recommended')
        .times(times)
        .reply(200, TESTNET_FEE_RESPONSE);
}

function mockPrice(times = 1) {
    nock(MEMPOOL_BASE)
        .get('/api/v1/prices')
        .times(times)
        .reply(200, PRICE_RESPONSE);
}

function mockFeesError(path, times = 3) {
    nock(MEMPOOL_BASE)
        .get(path)
        .times(times)
        .replyWithError('ECONNREFUSED');
}

// ─────────────────────────────────────────────────────────────────── //
// Suite
// ─────────────────────────────────────────────────────────────────── //

describe('FeeEstimator', () => {
    let estimator;

    beforeEach(() => {
        estimator = new FeeEstimator();
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    // ──────── fetchRates — mainnet ──────── //
    describe('fetchRates — mainnet', () => {

        it('maps economyFee → slow, hourFee → normal, halfHourFee → fast, fastestFee → urgent', async () => {
            mockMainnetFees();
            const rates = await estimator.fetchRates('MAINNET');
            assert.strictEqual(rates.slow,   MAINNET_FEE_RESPONSE.economyFee);
            assert.strictEqual(rates.normal, MAINNET_FEE_RESPONSE.hourFee);
            assert.strictEqual(rates.fast,   MAINNET_FEE_RESPONSE.halfHourFee);
            assert.strictEqual(rates.urgent, MAINNET_FEE_RESPONSE.fastestFee);
        });

        it('defaults to MAINNET when no network argument is passed', async () => {
            mockMainnetFees();
            const rates = await estimator.fetchRates();
            assert.strictEqual(rates.urgent, MAINNET_FEE_RESPONSE.fastestFee);
        });

        it('returns static fallback rates (all numbers) when API is unreachable', async () => {
            mockFeesError('/api/v1/fees/recommended');
            const rates = await estimator.fetchRates('MAINNET');
            assert.strictEqual(typeof rates.slow,   'number');
            assert.strictEqual(typeof rates.normal, 'number');
            assert.strictEqual(typeof rates.fast,   'number');
            assert.strictEqual(typeof rates.urgent, 'number');
        });

    });

    // ──────── fetchRates — testnet ──────── //
    describe('fetchRates — testnet', () => {

        it('hits the /testnet/ mempool endpoint and maps fields correctly', async () => {
            mockTestnetFees();
            const rates = await estimator.fetchRates('TESTNET');
            assert.strictEqual(rates.slow,   TESTNET_FEE_RESPONSE.economyFee);
            assert.strictEqual(rates.normal, TESTNET_FEE_RESPONSE.hourFee);
            assert.strictEqual(rates.fast,   TESTNET_FEE_RESPONSE.halfHourFee);
            assert.strictEqual(rates.urgent, TESTNET_FEE_RESPONSE.fastestFee);
        });

        it('returns static fallback when testnet API is unreachable', async () => {
            mockFeesError('/testnet/api/v1/fees/recommended');
            const rates = await estimator.fetchRates('TESTNET');
            assert.strictEqual(typeof rates.urgent, 'number');
        });

    });

    // ──────── Caching ──────── //
    describe('caching', () => {

        it('serves cached rates on a second call without a second HTTP request', async () => {
            mockMainnetFees(1); // only 1 mock — a second HTTP call would cause nock to throw
            const rates1 = await estimator.fetchRates('MAINNET');
            const rates2 = await estimator.fetchRates('MAINNET');
            assert.deepStrictEqual(rates1, rates2);
        });

        it('re-fetches after clearCache() is called', async () => {
            mockMainnetFees(2);
            await estimator.fetchRates('MAINNET');
            estimator.clearCache();
            await estimator.fetchRates('MAINNET');
            assert.strictEqual(nock.pendingMocks().length, 0, 'Both HTTP mocks should have been consumed');
        });

        it('caches mainnet and testnet independently', async () => {
            mockMainnetFees();
            mockTestnetFees();
            const mainnet = await estimator.fetchRates('MAINNET');
            const testnet = await estimator.fetchRates('TESTNET');
            assert.notDeepStrictEqual(mainnet, testnet);
        });

    });

    // ──────── History tracking ──────── //
    describe('getHistory — fee rate history tracking (last 10 rates)', () => {

        it('starts with an empty history', () => {
            assert.deepStrictEqual(estimator.getHistory(), []);
        });

        it('records exactly one entry after a single successful fetch', async () => {
            mockMainnetFees();
            await estimator.fetchRates('MAINNET');
            assert.strictEqual(estimator.getHistory().length, 1);
        });

        it('records the correct network in each history entry', async () => {
            mockMainnetFees();
            await estimator.fetchRates('MAINNET');
            const [entry] = estimator.getHistory();
            assert.strictEqual(entry.network, 'MAINNET');
        });

        it('records a fetchedAt timestamp within the call window', async () => {
            mockMainnetFees();
            const before = Date.now();
            await estimator.fetchRates('MAINNET');
            const after = Date.now();
            const [entry] = estimator.getHistory();
            assert.ok(
                entry.fetchedAt >= before && entry.fetchedAt <= after,
                `fetchedAt ${entry.fetchedAt} should be between ${before} and ${after}`
            );
        });

        it('records separate entries for mainnet and testnet fetches', async () => {
            mockMainnetFees();
            mockTestnetFees();
            await estimator.fetchRates('MAINNET');
            await estimator.fetchRates('TESTNET');
            const history = estimator.getHistory();
            assert.strictEqual(history[0].network, 'MAINNET');
            assert.strictEqual(history[1].network, 'TESTNET');
        });

        it('caps history at exactly 10 entries after 12 fetches', async () => {
            for (let i = 0; i < 12; i++) {
                nock(MEMPOOL_BASE)
                    .get('/api/v1/fees/recommended')
                    .reply(200, { ...MAINNET_FEE_RESPONSE, fastestFee: i + 1 });
                estimator.clearCache();
                await estimator.fetchRates('MAINNET');
            }
            assert.strictEqual(estimator.getHistory().length, 10);
        });

        it('retains the most recent 10 entries (oldest are dropped)', async () => {
            for (let i = 0; i < 12; i++) {
                nock(MEMPOOL_BASE)
                    .get('/api/v1/fees/recommended')
                    .reply(200, { ...MAINNET_FEE_RESPONSE, fastestFee: i + 1 });
                estimator.clearCache();
                await estimator.fetchRates('MAINNET');
            }
            const history = estimator.getHistory();
            // calls 1 and 2 (i=0,1) are dropped; call 3 (i=2) → fastestFee=3 is oldest kept
            assert.strictEqual(history[0].rates.urgent, 3,  'oldest retained entry should be call #3');
            assert.strictEqual(history[9].rates.urgent, 12, 'newest entry should be call #12');
        });

        it('clearHistory() resets history to empty', async () => {
            mockMainnetFees();
            await estimator.fetchRates('MAINNET');
            estimator.clearHistory();
            assert.deepStrictEqual(estimator.getHistory(), []);
        });

        it('does NOT add a history entry when the API fails (fallback path)', async () => {
            mockFeesError('/api/v1/fees/recommended');
            await estimator.fetchRates('MAINNET');
            assert.strictEqual(estimator.getHistory().length, 0);
        });

        it('getHistory() returns a copy — mutating it does not affect internal state', async () => {
            mockMainnetFees();
            await estimator.fetchRates('MAINNET');
            const snapshot = estimator.getHistory();
            snapshot.pop();
            assert.strictEqual(estimator.getHistory().length, 1);
        });

    });

    // ──────── getRateForTier ──────── //
    describe('getRateForTier', () => {
        const rates = { slow: 2, normal: 8, fast: 15, urgent: 25 };

        it('returns the slow rate', () => {
            assert.strictEqual(estimator.getRateForTier(rates, 'slow'), 2);
        });

        it('returns the normal rate', () => {
            assert.strictEqual(estimator.getRateForTier(rates, 'normal'), 8);
        });

        it('returns the fast rate', () => {
            assert.strictEqual(estimator.getRateForTier(rates, 'fast'), 15);
        });

        it('returns the urgent rate', () => {
            assert.strictEqual(estimator.getRateForTier(rates, 'urgent'), 25);
        });

    });

    // ──────── getBtcPriceUsd ──────── //
    describe('getBtcPriceUsd', () => {

        it('returns the USD price from the prices API', async () => {
            mockPrice();
            const price = await estimator.getBtcPriceUsd();
            assert.strictEqual(price, 60000);
        });

        it('returns null when the prices API is unreachable', async () => {
            mockFeesError('/api/v1/prices');
            const price = await estimator.getBtcPriceUsd();
            assert.strictEqual(price, null);
        });

    });

    // ──────── getSatVByteToUsd — sat/vByte → USD helper ──────── //
    describe('getSatVByteToUsd — sat/vByte → USD fee comparison', () => {

        it('calculates totalSats correctly (10 sat/vByte × 200 vBytes = 2000 sats)', async () => {
            mockPrice();
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.strictEqual(result.totalSats, 2000);
        });

        it('calculates totalBtc correctly (2000 sats = 0.00002 BTC)', async () => {
            mockPrice();
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.strictEqual(result.totalBtc, 0.00002);
        });

        it('calculates totalUSD correctly at $60,000/BTC (0.00002 BTC × 60000 = $1.2)', async () => {
            mockPrice();
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.ok(result.totalUSD !== null);
            assert.strictEqual(result.totalUSD, parseFloat((0.00002 * 60000).toFixed(6)));
        });

        it('exposes the btcPrice used in the calculation', async () => {
            mockPrice();
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.strictEqual(result.btcPrice, 60000);
        });

        it('sets totalUSD to null when the prices API is unavailable', async () => {
            mockFeesError('/api/v1/prices');
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.strictEqual(result.totalUSD, null);
        });

        it('sets btcPrice to null when the prices API is unavailable', async () => {
            mockFeesError('/api/v1/prices');
            const result = await estimator.getSatVByteToUsd(10, 200);
            assert.strictEqual(result.btcPrice, null);
        });

        it('returns totalSats correctly even when the price API is unavailable', async () => {
            mockFeesError('/api/v1/prices');
            const result = await estimator.getSatVByteToUsd(5, 140);
            assert.strictEqual(result.totalSats, 700);
        });

    });

    // ──────── compareTiers ──────── //
    describe('compareTiers', () => {

        it('returns all four tiers in the result', async () => {
            mockMainnetFees();
            mockPrice();
            const result = await estimator.compareTiers(200, 'MAINNET');
            assert.ok('slow'   in result);
            assert.ok('normal' in result);
            assert.ok('fast'   in result);
            assert.ok('urgent' in result);
        });

        it('each tier entry has satPerVByte, totalSats, totalBtc, and totalUSD', async () => {
            mockMainnetFees();
            mockPrice();
            const result = await estimator.compareTiers(200, 'MAINNET');
            for (const tier of ['slow', 'normal', 'fast', 'urgent']) {
                const entry = result[tier];
                assert.strictEqual(typeof entry.satPerVByte, 'number');
                assert.strictEqual(typeof entry.totalSats,   'number');
                assert.strictEqual(typeof entry.totalBtc,    'number');
                assert.ok(entry.totalUSD === null || typeof entry.totalUSD === 'number');
            }
        });

        it('slow tier has lower totalSats than urgent tier', async () => {
            mockMainnetFees();
            mockPrice();
            const result = await estimator.compareTiers(200, 'MAINNET');
            assert.ok(result.slow.totalSats < result.urgent.totalSats);
        });

        it('totalSats equals satPerVByte × vBytes for each tier', async () => {
            mockMainnetFees();
            mockPrice();
            const vBytes = 200;
            const result = await estimator.compareTiers(vBytes, 'MAINNET');
            for (const tier of ['slow', 'normal', 'fast', 'urgent']) {
                assert.strictEqual(
                    result[tier].totalSats,
                    result[tier].satPerVByte * vBytes,
                    `totalSats mismatch for tier "${tier}"`
                );
            }
        });

        it('works correctly for TESTNET', async () => {
            mockTestnetFees();
            mockPrice();
            const result = await estimator.compareTiers(200, 'TESTNET');
            assert.ok('urgent' in result);
            assert.strictEqual(result.urgent.satPerVByte, TESTNET_FEE_RESPONSE.fastestFee);
        });

        it('sets totalUSD to null for all tiers when the price API is unavailable', async () => {
            mockMainnetFees();
            mockFeesError('/api/v1/prices');
            const result = await estimator.compareTiers(200, 'MAINNET');
            for (const tier of ['slow', 'normal', 'fast', 'urgent']) {
                assert.strictEqual(result[tier].totalUSD, null);
            }
        });

    });

});

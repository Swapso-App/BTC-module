'use strict';

const assert = require('assert');
const nock = require('nock');
const { FeeEstimator } = require('../src/helper/feeEstimator');

describe('fee engine integration', () => {
  let estimator;

  beforeEach(() => {
    estimator = new FeeEstimator();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('fetches recommended rates and computes full tier comparison in USD', async () => {
    nock('https://mempool.space')
      .get('/api/v1/fees/recommended')
      .reply(200, {
        economyFee: 2,
        hourFee: 6,
        halfHourFee: 12,
        fastestFee: 20,
      });

    nock('https://mempool.space')
      .get('/api/v1/prices')
      .reply(200, { USD: 50000 });

    const comparison = await estimator.compareTiers(250, 'MAINNET');

    assert.deepStrictEqual(comparison.slow, {
      satPerVByte: 2,
      totalSats: 500,
      totalBtc: 0.000005,
      totalUSD: 0.25,
    });
    assert.deepStrictEqual(comparison.normal, {
      satPerVByte: 6,
      totalSats: 1500,
      totalBtc: 0.000015,
      totalUSD: 0.75,
    });
    assert.deepStrictEqual(comparison.fast, {
      satPerVByte: 12,
      totalSats: 3000,
      totalBtc: 0.00003,
      totalUSD: 1.5,
    });
    assert.deepStrictEqual(comparison.urgent, {
      satPerVByte: 20,
      totalSats: 5000,
      totalBtc: 0.00005,
      totalUSD: 2.5,
    });

    const history = estimator.getHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].network, 'MAINNET');
  });

  it('uses cached rates within TTL and avoids a second network request', async () => {
    nock('https://mempool.space')
      .get('/api/v1/fees/recommended')
      .once()
      .reply(200, {
        economyFee: 3,
        hourFee: 8,
        halfHourFee: 14,
        fastestFee: 24,
      });

    const first = await estimator.fetchRates('MAINNET');
    const second = await estimator.fetchRates('MAINNET');

    assert.deepStrictEqual(second, first);
    assert.strictEqual(estimator.getHistory().length, 1);
  });

  it('falls back to static rates after repeated API failure', async () => {
    nock('https://mempool.space')
      .get('/testnet/api/v1/fees/recommended')
      .times(3)
      .reply(500, { error: 'temporary failure' });

    const rates = await estimator.fetchRates('TESTNET');

    assert.deepStrictEqual(rates, {
      slow: 1,
      normal: 5,
      fast: 10,
      urgent: 20,
    });
    assert.strictEqual(estimator.getHistory().length, 0);
  });

  it('returns null USD when BTC price endpoint is unavailable', async () => {
    nock('https://mempool.space')
      .get('/api/v1/prices')
      .times(3)
      .reply(503, { error: 'price unavailable' });

    const result = await estimator.getSatVByteToUsd(12, 220);

    assert.strictEqual(result.totalSats, 2640);
    assert.strictEqual(result.totalBtc, 0.0000264);
    assert.strictEqual(result.btcPrice, null);
    assert.strictEqual(result.totalUSD, null);
  });

  it('supports explicit tier lookup after rate fetch', async () => {
    nock('https://mempool.space')
      .get('/testnet/api/v1/fees/recommended')
      .reply(200, {
        economyFee: 4,
        hourFee: 7,
        halfHourFee: 11,
        fastestFee: 17,
      });

    const rates = await estimator.fetchRates('TESTNET');

    assert.strictEqual(estimator.getRateForTier(rates, 'slow'), 4);
    assert.strictEqual(estimator.getRateForTier(rates, 'normal'), 7);
    assert.strictEqual(estimator.getRateForTier(rates, 'fast'), 11);
    assert.strictEqual(estimator.getRateForTier(rates, 'urgent'), 17);
  });
});

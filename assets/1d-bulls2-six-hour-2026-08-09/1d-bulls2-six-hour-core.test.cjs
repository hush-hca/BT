'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HOUR_MS,
  SIX_HOUR,
  buildIndicatorIndex,
  findIntradayEntry,
  simulateSixHourTrade,
  calculateMetrics,
} = require('./1d-bulls2-six-hour-core.cjs');

const candle = (hour, open, high, low, close, volume = 10, quoteVolume = close * volume) => ({
  time: hour * HOUR_MS, open, high, low, close, volume, quoteVolume,
});

function history(count = 230, transform = {}) {
  return Array.from({ length: count }, (_, hour) => {
    const close = transform.close?.(hour) ?? 100 + hour / 10;
    return candle(hour, close - .2, close + 1, close - 1, close,
      transform.volume?.(hour) ?? hour + 1, transform.quoteVolume?.(hour) ?? close * (hour + 1));
  });
}

test('indicator index excludes the active candle from historical volume and slope references', () => {
  const hourly = history();
  const index = buildIndicatorIndex(hourly, history());
  const point = index.get(205 * HOUR_MS);
  const precedingVolumes = hourly.slice(185, 205).map(x => x.volume);
  assert.equal(point.volumeMedian20, (precedingVolumes[9] + precedingVolumes[10]) / 2);
  assert.equal(point.coinSma200, hourly.slice(5, 205).reduce((sum, x) => sum + x.close, 0) / 200);
  assert.equal(point.coinSma200Rising, false);
});

test('session VWAP resets at 00:00 UTC and uses completed candles only', () => {
  const hourly = [candle(23, 10, 11, 9, 10, 10, 100), candle(24, 20, 21, 19, 20, 2, 40), candle(25, 30, 31, 29, 30, 2, 60)];
  const index = buildIndicatorIndex(hourly, hourly);
  assert.equal(index.get(25 * HOUR_MS).sessionVwap, 20);
  assert.equal(index.get(26 * HOUR_MS).sessionVwap, 25);
});

function inputFor(entry, triggerCandles, overrides = {}) {
  const base = history(240);
  for (const item of triggerCandles) base[item.time / HOUR_MS] = item;
  const btc = history(240, { close: h => 50 + h / 20 });
  return {
    signal: { detectedAt: 200 * HOUR_MS, score: 80, relVol: 2, support: 120, signalType: '0Day' },
    hourly: base,
    btcHourly: btc,
    indicators: buildIndicatorIndex(base, btc),
    combination: { minimumScore: 40, entry, stop: 'atr', targetR: 1.5 },
    ...overrides,
  };
}

test('immediate entry uses the first close at detectedAt plus five hours', () => {
  const result = findIntradayEntry(inputFor('immediate', []));
  assert.equal(result.time, 205 * HOUR_MS);
  assert.equal(result.reason, 'immediate');
});

test('bullish confirmation enforces body and upper-close requirements', () => {
  const weak = inputFor('confirmation', [candle(204, 120, 124, 119, 122)]);
  assert.equal(findIntradayEntry(weak), null);
  const valid = inputFor('confirmation', [candle(204, 120, 124, 119, 123)]);
  assert.equal(findIntradayEntry(valid).reason, 'bullish-confirmation');
});

test('retest, breakout, VWAP, and relative-strength entries expire after six hours', () => {
  for (const entry of ['retest', 'breakout', 'vwap-convergence', 'rs-volume-breakout']) {
    const late = candle(211, 119, 140, 119, 139, 1_000);
    assert.equal(findIntradayEntry(inputFor(entry, [late])), null, entry);
  }
});

test('support retest and breakout use their frozen definitions', () => {
  const retest = inputFor('retest', [candle(204, 119, 122, 119.8, 121.6)]);
  assert.equal(findIntradayEntry(retest).reason, 'support-retest');
  const deepLow = inputFor('retest', [candle(204, 110, 122, 110, 121.6)]);
  assert.equal(findIntradayEntry(deepLow), null);
  const breakout = inputFor('breakout', [
    candle(200, 119, 121, 118, 120), candle(201, 120, 122, 119, 121), candle(202, 121, 123, 120, 122),
    candle(203, 122, 124, 121, 123), candle(204, 123, 125, 122, 124), candle(205, 124, 127, 123, 126),
  ]);
  const result = findIntradayEntry(breakout);
  assert.equal(result.reason, 'breakout');
  assert.equal(result.reference, 125);
  assert.equal(result.time, 206 * HOUR_MS);
});

test('score, RelVol and five-hour support filters reject ineligible signals', () => {
  assert.equal(findIntradayEntry(inputFor('immediate', [], { signal: { detectedAt: 200 * HOUR_MS, score: 39, relVol: 2, support: 120, signalType: '0Day' } })), null);
  assert.equal(findIntradayEntry(inputFor('confirmation', [], { combination: { minimumScore: 40, relVol: [1.2, 3], entry: 'confirmation' }, signal: { detectedAt: 200 * HOUR_MS, score: 80, relVol: 3.1, support: 120, signalType: '0Day' } })), null);
  assert.equal(findIntradayEntry(inputFor('retest', [], { combination: { minimumScore: 40, maxSupportDistance: .03, entry: 'retest' }, signal: { detectedAt: 200 * HOUR_MS, score: 80, relVol: 2, support: 100, signalType: '0Day' } })), null);
});

test('entry accepts canonical 0Day signals only', () => {
  for (const signalType of [undefined, 'intraday', '1Day']) {
    const signal = { detectedAt: 200 * HOUR_MS, score: 80, relVol: 2, support: 120 };
    if (signalType !== undefined) signal.signalType = signalType;
    assert.equal(findIntradayEntry(inputFor('immediate', [], { signal })), null, String(signalType));
  }
  assert.equal(findIntradayEntry(inputFor('immediate', [])).reason, 'immediate');
});

test('time exit occurs at the sixth completed hourly close after entry', () => {
  const hourly = Array.from({ length: 6 }, (_, i) => candle(i + 1, 100, 100.5, 99.5, 100.2));
  const trade = simulateSixHourTrade({ signal: { detectedAt: 0, score: 80, signalType: '0Day' }, entry: { time: HOUR_MS, price: 100.05, marketPrice: 100, candle: candle(0, 100, 101, 99, 100), atr14: 10 }, hourly, combination: { stop: 'atr', targetR: 2 } });
  assert.equal(trade.holdingHours, 6);
  assert.equal(trade.exitReason, 'time-6h');
});

test('stop wins when stop and target share an hourly candle', () => {
  const trade = simulateSixHourTrade({ signal: { detectedAt: 0 }, entry: { time: HOUR_MS, price: 100.05, marketPrice: 100, candle: candle(0, 100, 101, 99, 100), atr14: 5 }, hourly: [candle(1, 100, 120, 90, 110)], combination: { stop: 'atr', targetR: 2 } });
  assert.equal(trade.exitReason, 'stop');
});

test('market fee and adverse slippage are each charged once per fill', () => {
  const trade = simulateSixHourTrade({ signal: { detectedAt: 0 }, entry: { time: HOUR_MS, price: 100.05, marketPrice: 100, candle: candle(0, 100, 101, 99, 100), atr14: 5 }, hourly: [candle(1, 100, 111, 99, 110)], combination: { stop: 'atr', targetR: 2 } });
  assert.equal(trade.fills, 2);
  assert.ok(trade.feeR > 0 && trade.slippageR > 0);
  assert.equal(trade.netR, Number((trade.grossR - trade.feeR - trade.slippageR).toFixed(12)));
});

test('a tight long stop above the unslipped market entry exits immediately instead of being dropped', () => {
  const entry = {
    time: HOUR_MS,
    price: 100.05,
    marketPrice: 100,
    candle: candle(0, 100, 100.1, 99.99, 100),
    atr14: 0.04,
    reason: 'immediate',
  };
  const trade = simulateSixHourTrade({
    signal: { detectedAt: 0, score: 80, signalType: '0Day', symbol: 'USDCUSDT' },
    entry,
    hourly: [candle(1, 100, 101, 99.9, 100.9)],
    combination: { stop: 'atr', targetR: 1.5 },
  });
  assert.equal(trade.stop, 100.01);
  assert.equal(trade.exitReason, 'immediate-stop');
  assert.equal(trade.exitTime, entry.time);
  assert.equal(trade.holdingHours, 0);
  assert.equal(trade.fills, 2);
  assert.equal(trade.grossR, 0);
  assert.ok(trade.feeR > 0);
  assert.ok(trade.slippageR > 0);
  assert.equal(trade.netR, Number((-trade.feeR - trade.slippageR).toFixed(12)));
});

test('split exit takes half at 1R then moves the remaining stop to breakeven', () => {
  const trade = simulateSixHourTrade({ signal: { detectedAt: 0 }, entry: { time: HOUR_MS, price: 100.05, marketPrice: 100, candle: candle(0, 100, 101, 99, 100), atr14: 5 }, hourly: [candle(1, 100, 106, 96, 105)], combination: { stop: 'atr', exit: 'split-1r-2r' } });
  assert.equal(trade.exitReason, 'breakeven-stop');
  assert.equal(trade.fills, 3);
});

test('calculates all declared metrics in chronological order', () => {
  const metrics = calculateMetrics([
    { entryTime: 3, netR: -.5, feeR: .1, slippageR: .1, holdingHours: 6 },
    { entryTime: 1, netR: 1, feeR: .1, slippageR: .1, holdingHours: 2 },
    { entryTime: 2, netR: -.25, feeR: .1, slippageR: .1, holdingHours: 4 },
  ]);
  assert.equal(metrics.tradeCount, 3);
  assert.equal(metrics.expectancy, Number((1 / 12).toFixed(12)));
  assert.equal(metrics.profitFactor, Number((4 / 3).toFixed(12)));
  assert.equal(metrics.consecutiveLosses, 2);
  assert.equal(metrics.maxDrawdownR, .75);
  assert.equal(metrics.meanHoldingHours, 4);
  assert.equal(metrics.medianHoldingHours, 4);
  assert.equal(metrics.feeR, .3);
});

test('exports the frozen six-hour constants', () => {
  assert.deepEqual(SIX_HOUR, { delayHours: 5, entryWindowHours: 6, maxHoldHours: 6, takerFee: .0005, adverseSlippage: .0005 });
});

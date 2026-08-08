'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DAY_MS,
  evaluateBulls2Signal,
  replaySignals,
  entryAtFiveHours,
  measureForwardOutcomes
} = require('./1d-bulls2-validation-core.cjs');

const start = Date.UTC(2026, 0, 2);
const day = (index, overrides = {}) => ({
  time: start + index * DAY_MS,
  open: 102,
  high: 103,
  low: 101,
  close: 102,
  volume: 1_000,
  quoteVolume: 100_000,
  ...overrides
});

function completedReclaimFixture() {
  const candles = Array.from({ length: 71 }, (_, index) => day(index));
  candles[10] = day(10, { low: 100, high: 103, open: 102, close: 102 });
  candles[70] = day(70, {
    open: 101.3,
    high: 109.25,
    low: 99.25,
    close: 108.05,
    volume: 2_000,
    quoteVolume: 200_000
  });
  return candles;
}

function hourlyFixture() {
  const signalDay = Date.UTC(2026, 2, 13);
  const candles = [];
  for (let hour = 0; hour < 24; hour += 1) {
    // Kline timestamps are candle opens, so hour 8 is observed at 09:00.
    const active = hour >= 8;
    candles.push({
      time: signalDay + hour * 60 * 60_000,
      open: active ? 101.3 : 102,
      high: active ? 109.25 : 103,
      low: active ? 99.25 : 101,
      close: active ? 108.05 : 102,
      volume: active ? 2_000 / (hour - 8) : 1_000,
      quoteVolume: active ? 200_000 / (hour - 8) : 100_000
    });
  }
  // The candle opened at 13:00 closes at 14:00, five hours after 09:00.
  candles[13].close = 105;
  return candles;
}

test('replays a completed 1Day reclaim using the frozen Bulls2 score', () => {
  const candles = completedReclaimFixture();
  const record = evaluateBulls2Signal({
    dailyCandles: candles,
    signalIndex: 70,
    observedAt: candles[70].time + DAY_MS,
    kind: '1Day'
  });
  assert.equal(record.signalType, '1Day');
  assert.equal(Number(record.score.toFixed(1)), 72.5);
  assert.equal(record.support, 100);
});

test('does not use a swing low until its three right-hand daily candles have closed', () => {
  const candles = completedReclaimFixture();
  assert.equal(evaluateBulls2Signal({
    dailyCandles: candles,
    signalIndex: 13,
    observedAt: candles[13].time + 12 * 60 * 60_000,
    kind: '0Day'
  }), null);
});

test('emits a 0Day signal only at its first valid hourly observation', () => {
  const base = completedReclaimFixture().slice(0, 70);
  const signalDay = Date.UTC(2026, 2, 13);
  const dailyCandles = [...base, { ...completedReclaimFixture()[70], time: signalDay }];
  const records = replaySignals({ symbol: 'TEST', dailyCandles, hourlyCandles: hourlyFixture() });
  const zeroDay = records.filter(row => row.signalType === '0Day');
  assert.equal(zeroDay.length, 1);
  assert.equal(zeroDay[0].detectedAt, Date.UTC(2026, 2, 13, 9));
});

test('uses the close ending five hours after detection as entry', () => {
  const entry = entryAtFiveHours({
    signalDetectedAt: Date.UTC(2026, 2, 13, 9),
    hourlyCandles: hourlyFixture()
  });
  assert.deepEqual(entry, { time: Date.UTC(2026, 2, 13, 14), price: 105 });
});

test('measures forward return, MFE, and MAE after entry only', () => {
  const hourlyCandles = [
    { time: -60 * 60_000, open: 100, high: 200, low: 1, close: 100 },
    ...Array.from({ length: 24 }, (_, index) => ({
      time: index * 60 * 60_000,
      open: 100,
      high: index === 23 ? 115 : 110,
      low: index === 0 ? 96 : 100,
      close: index === 23 ? 110 : 105
    }))
  ];
  const closesInOneDay = hourlyCandles.filter(candle => candle.time + 60 * 60_000 > 0 && candle.time + 60 * 60_000 <= DAY_MS);
  assert.equal(closesInOneDay.length, 24);
  assert.equal(closesInOneDay.some(candle => candle.time === -60 * 60_000), false);
  const outcomes = measureForwardOutcomes({
    entry: { time: 0, price: 100 },
    hourlyCandles,
    horizonsDays: [1]
  });
  assert.deepEqual(outcomes['1d'], { returnPercent: 10, mfePercent: 15, maePercent: -4 });
});

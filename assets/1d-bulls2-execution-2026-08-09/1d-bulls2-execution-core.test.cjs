'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findEntry, buildInitialStop, simulateTrade, calculateTradeMetrics } = require('./1d-bulls2-execution-core.cjs');
const H = 60 * 60_000;
const signal = { detectedAt: 0, support: 100, score: 80, signalType: '0Day' };
const candle = (hour, open, high, low, close) => ({ time: hour * H, open, high, low, close });

test('breakout waits five hours and uses a fixed confirmation high', () => {
  const hourlyCandles = [candle(0,100,101,99,100),candle(1,100,103,99,102),candle(2,102,105,101,104),candle(3,104,104,102,103),candle(4,103,104,102,103),candle(5,103,106,102,105),candle(6,105,107,104,106)];
  const entry = findEntry({ signal, hourlyCandles, config: { entryFamily: 'breakout' } });
  assert.equal(entry.time, 7 * H);
  assert.equal(entry.reference, 105);
  assert.equal(entry.price, 106.053);
});

test('breakout rejects an incomplete five-hour confirmation window', () => {
  const hourlyCandles = [candle(0,100,101,99,100), candle(4,100,105,99,104), candle(5,104,106,103,106)];
  assert.equal(findEntry({ signal, hourlyCandles, config: { entryFamily: 'breakout' } }), null);
});

test('retest requires proximity, bullishness and an upper-35-percent close', () => {
  const weak = [candle(5,101,102,99,100)];
  const valid = [candle(5,99.8,101,99.5,100.8)];
  assert.equal(findEntry({ signal, hourlyCandles: weak, config: { entryFamily: 'retest' } }), null);
  assert.equal(findEntry({ signal, hourlyCandles: valid, config: { entryFamily: 'retest' } }).family, 'retest');
  assert.equal(findEntry({ signal, hourlyCandles: [candle(5,100,104,99.5,103)], config: { entryFamily: 'retest' } }).family, 'retest');
});

test('limit fills only after delay and within 72 hours', () => {
  assert.equal(findEntry({ signal, hourlyCandles: [candle(72,100,101,99,100)], config: { entryFamily: 'limit', limitOffset: 0.005 } }), null);
  assert.equal(findEntry({ signal, hourlyCandles: [candle(5,101,102,99,100)], config: { entryFamily: 'limit', limitOffset: 0.005 } }).price, 100.5);
  assert.equal(findEntry({ signal, hourlyCandles: [candle(71,101,102,100,101)], config: { entryFamily: 'limit', limitOffset: 0.005 } }).time, 72 * H);
});

test('resting buy limit gets the better opening price after a gap below', () => {
  const entry = findEntry({ signal, hourlyCandles: [candle(5,99,100,98,99.5)], config: { entryFamily: 'limit', limitOffset: 0.005 } });
  assert.equal(entry.price, 99);
});

test('builds support, sweep-low and ATR stops below entry', () => {
  assert.equal(buildInitialStop({ entryPrice:105,support:100,signalLow:99,dailyAtr:4,stopFamily:'support' }), 99.5);
  assert.equal(buildInitialStop({ entryPrice:105,support:100,signalLow:99,dailyAtr:4,stopFamily:'sweep' }), 98.505);
  assert.equal(buildInitialStop({ entryPrice:105,support:100,signalLow:99,dailyAtr:4,stopFamily:'atr' }), 101);
  assert.equal(buildInitialStop({ entryPrice:100,support:101,signalLow:101,dailyAtr:-1,stopFamily:'support' }), null);
});

test('same candle stop wins over fixed target', () => {
  const result = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6,105,120,90,110)], config:{stopFamily:'support',exitFamily:'fixed',targetR:2}, signalLow:99,dailyAtr:4 });
  assert.equal(result.exitReason, 'stop');
  assert.ok(result.netR < -1);
});

test('market entry slippage is charged exactly once', () => {
  const entry = {time:6*H,price:105.0525,marketPrice:105,family:'breakout'};
  const result = simulateTrade({ signal, entry, hourlyCandles:[candle(6,105,116.2,104,116)], config:{stopFamily:'support',exitFamily:'fixed',targetR:2}, signalLow:99,dailyAtr:4 });
  const risk = entry.price - 99.5;
  const target = entry.price + 2 * risk;
  const expectedGross = (target - 105) / risk;
  const expectedCosts = ((entry.price * .0005) + (entry.price - 105) + (target * .0005) + (target * .0005 * .9995)) / risk;
  assert.ok(Math.abs(result.grossR - expectedGross) < 1e-10);
  assert.ok(Math.abs(result.costsR - expectedCosts) < 1e-10);
  assert.ok(Math.abs(result.netR - (expectedGross - expectedCosts)) < 1e-10);
  assert.ok(Math.abs(result.costsR - result.feeCostR - result.slippageCostR) < 2e-12);
  assert.ok(Math.abs(result.targetPrice - target) < 1e-10);
  assert.equal(result.holdingHours, 1);
});

test('supports 1.5R and 3R fixed targets', () => {
  for (const targetR of [1.5, 3]) {
    const risk = 105 - 99.5;
    const target = 105 + targetR * risk;
    const result = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6,105,target+.1,104,target)], config:{stopFamily:'support',exitFamily:'fixed',targetR}, signalLow:99,dailyAtr:4 });
    assert.equal(result.targetPrice, target);
    assert.equal(result.exitReason, `target-${targetR}R`);
  }
});

test('supports split and time exits with explicit costs', () => {
  const split = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6,106,111,105.1,110),candle(7,110,117,109,116)], config:{stopFamily:'support',exitFamily:'split'}, signalLow:99,dailyAtr:4 });
  assert.equal(split.exitReason, 'target-2R');
  assert.ok(split.grossR > split.netR);
  const timed = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6+24*7-1,105,106,104,105.5)], config:{stopFamily:'support',exitFamily:'time',timeExitDays:7}, signalLow:99,dailyAtr:4 });
  assert.equal(timed.exitReason, 'time-7d');
  const timed14 = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6+24*14-1,105,106,104,105.5)], config:{stopFamily:'support',exitFamily:'time',timeExitDays:14}, signalLow:99,dailyAtr:4 });
  assert.equal(timed14.exitReason, 'time-14d');
  assert.equal(timed14.holdingHours, 14 * 24);
});

test('split uses breakeven stop conservatively when 1R and a lower low share a candle', () => {
  const result = simulateTrade({ signal, entry:{time:6*H,price:105,family:'limit'}, hourlyCandles:[candle(6,105,117,104.9,116)], config:{stopFamily:'support',exitFamily:'split'}, signalLow:99,dailyAtr:4 });
  assert.equal(result.exitReason, 'breakeven-stop');
  assert.deepEqual(result.splitTargetPrices, { first: 110.5, final: 116 });
});

test('calculates expectancy, PF, median, drawdown and streak', () => {
  const metrics = calculateTradeMetrics([{netR:1,costsR:.1},{netR:-.5,costsR:.1},{netR:-.25,costsR:.1},{netR:2,costsR:.1}]);
  assert.equal(metrics.tradeCount, 4);
  assert.equal(metrics.profitFactor, 4);
  assert.equal(metrics.consecutiveLosses, 2);
  assert.equal(metrics.maxDrawdownR, .75);
  assert.equal(metrics.totalCostsR, .4);
});

test('drawdown and losing streak use chronological entry order', () => {
  const metrics = calculateTradeMetrics([
    {entryTime:4*H,netR:2,costsR:0},
    {entryTime:2*H,netR:-1,costsR:0},
    {entryTime:3*H,netR:-1,costsR:0},
    {entryTime:1*H,netR:2,costsR:0}
  ]);
  assert.equal(metrics.consecutiveLosses, 2);
  assert.equal(metrics.maxDrawdownR, 2);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  splitThreeWays,
  buildConfigurationGrid,
  enrichSignals,
  selectDevelopmentCandidate,
  passesValidationGate,
  runBacktest,
  runCli
} = require('./1d-bulls2-execution-runner.cjs');

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

test('splits each signal type chronologically 60-20-20', () => {
  const rows = Array.from({ length: 100 }, (_, detectedAt) => ({ detectedAt }));
  const split = splitThreeWays(rows);
  assert.deepEqual([split.development.length, split.validation.length, split.holdout.length], [60, 20, 20]);
});

test('split ordering is deterministic when timestamps tie', () => {
  const split = splitThreeWays([
    { detectedAt: 2, symbol: 'B' }, { detectedAt: 1, symbol: 'Z' }, { detectedAt: 2, symbol: 'A' },
    { detectedAt: 3, symbol: 'A' }, { detectedAt: 4, symbol: 'A' }
  ]);
  assert.deepEqual(split.development.map(row => row.symbol), ['Z', 'A', 'B']);
});

test('split boundaries never divide an identical detectedAt group', () => {
  const rows = [
    ...Array.from({ length: 58 }, (_, index) => ({ detectedAt: index, symbol: `A${index}` })),
    ...Array.from({ length: 8 }, (_, index) => ({ detectedAt: 58, symbol: `T${index}` })),
    ...Array.from({ length: 34 }, (_, index) => ({ detectedAt: 59 + index, symbol: `B${index}` }))
  ];
  const split = splitThreeWays(rows);
  const locations = Object.entries(split).filter(([, values]) => values.some(row => row.detectedAt === 58));
  assert.equal(locations.length, 1);
  assert.equal(locations[0][1].filter(row => row.detectedAt === 58).length, 8);
});

test('grid contains only declared entry, stop, exit, score, and filter variants', () => {
  const grid = buildConfigurationGrid();
  assert.equal(grid.length, 1152);
  assert.equal(new Set(grid.map(config => config.id)).size, 1152);
  assert.ok(grid.some(config => config.entryFamily === 'breakout' && config.stopFamily === 'support' && config.targetR === 2));
  assert.ok(grid.some(config => config.entryFamily === 'limit' && config.limitOffset === 0.005));
  assert.ok(grid.every(config => [0, 60, 70, 80].includes(config.minimumScore)));
  assert.ok(grid.every(config => ['none', 'relvol-1-4', 'distance-3pct', 'relvol-1-4+distance-3pct'].includes(config.contextFilter)));
});

test('enrichment uses only completed daily candles and the known signal-day low', async () => {
  const candles = [];
  for (let day = 0; day < 18; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const time = day * DAY + hour * HOUR;
      candles.push({ time, open: 100, high: 102, low: day === 17 && hour === 7 ? 90 : 98, close: 101, volume: 1 });
    }
  }
  const observations = [{ symbol: 'AAA', signalType: '0Day', candleTime: 17 * DAY, detectedAt: 17 * DAY + 8 * HOUR, support: 95, score: 70, relVol: 2 }];
  const enriched = await enrichSignals({ observations, universe: { symbols: ['AAA'] }, loadHourly: async () => candles });
  assert.equal(enriched.signals[0].signalLow, 90);
  assert.ok(enriched.signals[0].dailyAtr > 0);
  assert.equal(enriched.signals[0].hourlyCandles.some(candle => candle.time > 17 * DAY + 8 * HOUR), true);
});

test('enrichment accesses bounded indexed ranges rather than rescanning the full archive per signal', async () => {
  const candles = Array.from({ length: 40_000 }, (_, index) => ({
    time: index * HOUR, open: 100, high: 102, low: 98, close: 101, volume: 1
  }));
  const observations = Array.from({ length: 100 }, (_, index) => {
    const day = 20 + index * 2;
    return { symbol: 'AAA', signalType: '0Day', candleTime: day * DAY,
      detectedAt: day * DAY + 8 * HOUR, support: 99, score: 70, relVol: 2 };
  });
  const result = await enrichSignals({ observations, universe: { symbols: ['AAA'] }, loadHourly: async () => candles });
  assert.equal(result.signals.length, 100);
  assert.equal(result.accessStats.binarySearches, 400);
  assert.ok(result.accessStats.rangeCandlesVisited < candles.length * 2,
    `visited ${result.accessStats.rangeCandlesVisited} bounded candles for ${candles.length} source candles`);
});

test('development selection and validation gate enforce their own samples and thresholds', () => {
  const weak = { id: 'weak', metrics: { tradeCount: 200, expectancy: 0.2, profitFactor: 1.14, medianR: 0.1, maxDrawdownR: 1 } };
  const good = { id: 'good', metrics: { tradeCount: 100, expectancy: 0.1, profitFactor: 1.2, medianR: 0, maxDrawdownR: 2 } };
  assert.equal(selectDevelopmentCandidate([weak, good]).id, 'good');
  assert.equal(passesValidationGate({ tradeCount: 29, expectancy: 1, profitFactor: 2, medianR: 1 }), false);
  assert.equal(passesValidationGate({ tradeCount: 30, expectancy: 0.01, profitFactor: 1.15, medianR: 0 }), true);
});

test('holdout remains unevaluated when validation fails', async () => {
  const rows = ['0Day', '1Day'].flatMap(signalType => Array.from({ length: 10 }, (_, index) => ({
    symbol: 'AAA', signalType, detectedAt: index * DAY, candleTime: index * DAY,
    support: 100, score: 0, relVol: 2, signalLow: 99, dailyAtr: 3, hourlyCandles: []
  })));
  const result = await runBacktest({ enrichedSignals: rows, grid: [
    { id: 'x', entryFamily: 'breakout', stopFamily: 'support', exitFamily: 'fixed', targetR: 2, minimumScore: 0, contextFilter: 'none' }
  ] });
  assert.equal(result.bySignalType['0Day'].holdout.status, 'not-evaluated');
  assert.equal(result.bySignalType['1Day'].holdout.status, 'not-evaluated');
});

test('CLI pipeline writes every declared artifact from a small archive fixture', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bulls2-execution-'));
  const input = path.join(root, 'input'), out = path.join(root, 'out');
  await fs.mkdir(input);
  const detectedAt = 17 * DAY + 8 * HOUR;
  await fs.writeFile(path.join(input, 'observations.json'), JSON.stringify([
    { symbol: 'AAA', signalType: '0Day', candleTime: 17 * DAY, detectedAt, support: 95, score: 70, relVol: 2 }
  ]));
  await fs.writeFile(path.join(input, 'universe.json'), JSON.stringify({ symbols: ['AAA'] }));
  const candles = Array.from({ length: 36 * 24 }, (_, index) => ({
    time: index * HOUR, open: 100, high: 102, low: index === 17 * 24 + 7 ? 90 : 98, close: 101, volume: 1
  }));
  await runCli({ input, out, loadHourly: async () => candles });
  for (const name of ['execution-grid.json', 'selected-development.json', 'validation-result.json',
    'holdout-result.json', 'trade-ledger.json', 'enrichment-failures.json']) {
    assert.equal(JSON.parse(await fs.readFile(path.join(out, name), 'utf8')) !== undefined, true);
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  ARTIFACT_NAMES, COMBINATIONS, filterStudySignals, studyFilterOutcomes, splitTimestampGroups,
  removeOverlappingTrades, evaluateCombination, runSixHourBacktest, parseArgs,
} = require('./1d-bulls2-six-hour-runner.cjs');
const { HOUR_MS, buildIndicatorIndex } = require('./1d-bulls2-six-hour-core.cjs');

const signal = (id, detectedAt, signalType = '0Day', score = 40, symbol = 'ETH') => ({
  id, detectedAt, signalType, score, symbol, support: 100, relVol: 2,
});
const candle = (hour, close = 100) => ({
  time: hour * HOUR_MS, open: close - 0.2, high: close + 0.4, low: close - 0.4,
  close, volume: 100 + hour, quoteVolume: close * (100 + hour),
});
const candles = (count = 280) => Array.from({ length: count }, (_, hour) => candle(hour, 100 + hour * 0.01));

test('declares exactly the ten preregistered combinations', () => {
  assert.equal(COMBINATIONS.length, 10);
  assert.equal(new Set(COMBINATIONS.map(item => item.id)).size, 10);
  assert.ok(COMBINATIONS.every(item => item.minimumScore >= 40));
  assert.deepEqual(COMBINATIONS.map(item => item.id), [
    'c01-score40-immediate', 'c02-score60-immediate', 'c03-score80-immediate',
    'c04-score40-relvol-confirm', 'c05-score60-relvol-confirm',
    'c06-score80-relvol-confirm', 'c07-score40-support-retest',
    'c08-score60-support-breakout', 'c09-score60-btc-vwap',
    'c10-score80-rs-volume-breakout',
  ]);
});

test('runner retains 0Day score-40-plus signals only', () => {
  const rows = [signal('0d-39', 1, '0Day', 39), signal('1d-80', 2, '1Day', 80), signal('0d-80', 3, '0Day', 80), signal('0d-40', 2, '0Day', 40)];
  assert.deepEqual(filterStudySignals(rows).map(row => row.id), ['0d-40', '0d-80']);
});

test('runner intersects signals with the frozen universe and honors exclusions', () => {
  const rows = [signal('kept', 1, '0Day', 40, 'ETH'), signal('off-universe', 2, '0Day', 80, 'XRP'),
    signal('explicitly-excluded', 3, '0Day', 80, 'SOL')];
  assert.deepEqual(filterStudySignals(rows, { symbols: ['ETH', 'SOL'], excluded: [{ symbol: 'SOL' }] }).map(row => row.id), ['kept']);
  assert.deepEqual(studyFilterOutcomes(rows, { symbols: ['ETH', 'SOL'], excluded: [{ symbol: 'SOL' }] })
    .map(row => row.reason), ['outside-frozen-universe', 'frozen-universe-exclusion']);
});

test('identical detectedAt groups never cross 60-20-20 boundaries', () => {
  const rows = [];
  for (let group = 0; group < 10; group += 1) for (let tie = 0; tie < (group === 6 ? 5 : 1); tie += 1) rows.push(signal(`${group}-${tie}`, group));
  const split = splitTimestampGroups(rows);
  for (const [left, right] of [['development', 'validation'], ['development', 'holdout'], ['validation', 'holdout']]) {
    const leftTimes = new Set(split[left].map(row => row.detectedAt));
    assert.ok(split[right].every(row => !leftTimes.has(row.detectedAt)));
  }
  assert.equal(Object.values(split).flat().length, rows.length);
});

test('holdout stays sealed for each combination that fails validation', () => {
  const hourly = candles();
  const hourlyBySymbol = new Map([['ETH', hourly]]);
  const btcHourly = candles();
  const result = evaluateCombination({
    combination: COMBINATIONS[0],
    split: { development: [], validation: [], holdout: [signal('holdout', 230 * HOUR_MS)] },
    hourlyBySymbol, btcHourly,
    indicatorBySymbol: new Map([['ETH', buildIndicatorIndex(hourly, btcHourly)]]),
  });
  assert.equal(result.validation.passed, false);
  assert.equal(result.holdout.status, 'sealed');
  assert.equal(result.holdout.metrics, null);
  assert.deepEqual(result.holdout.rejectionReasons, ['validation-gate-failed']);
  assert.equal(result.holdout.outcomes[0].status, 'sealed');
});

test('same-symbol open-position state crosses development and validation boundaries', () => {
  const hourly = candles();
  const btcHourly = candles();
  const shared = { hourlyBySymbol: new Map([['ETH', hourly]]), btcHourly,
    indicatorBySymbol: new Map([['ETH', buildIndicatorIndex(hourly, btcHourly)]]) };
  const result = evaluateCombination({ combination: COMBINATIONS[0], ...shared, split: {
    development: [signal('dev', 230 * HOUR_MS)],
    validation: [signal('validation', 236 * HOUR_MS)],
    holdout: [],
  } });
  assert.equal(result.development.trades.length, 1);
  assert.equal(result.validation.trades.length, 0);
  assert.equal(result.validation.outcomes[0].reason, 'same-symbol-position-open');
});

test('signal detected during an open position is ignored even when it would remain untriggered', () => {
  const hourly = candles();
  hourly[234] = { ...hourly[234], open: 100, high: 102, low: 99, close: 101.8 };
  const btcHourly = candles();
  const result = evaluateCombination({ combination: COMBINATIONS[3], split: {
    development: [signal('opens', 230 * HOUR_MS), signal('would-not-trigger', 236 * HOUR_MS)],
    validation: [], holdout: [],
  }, hourlyBySymbol: new Map([['ETH', hourly]]), btcHourly,
  indicatorBySymbol: new Map([['ETH', buildIndicatorIndex(hourly, btcHourly)]]) });
  assert.equal(result.development.trades.length, 1);
  const ignored = result.development.outcomes.find(row => row.signalId === 'would-not-trigger');
  assert.equal(ignored.status, 'ignored');
  assert.equal(ignored.reason, 'same-symbol-position-open');
});

test('holdout candidate gets an independently evaluated c01 baseline on matched eligible IDs', () => {
  const rally = Array.from({ length: 300 }, (_, hour) => candle(hour, 100 + hour * 0.5));
  const btcHourly = rally;
  const validation = Array.from({ length: 40 }, (_, index) => signal(`v${index}`, 230 * HOUR_MS, '0Day', 80, `S${index}`));
  const holdout = [signal('boundary-id', 236 * HOUR_MS, '0Day', 80, 'S0'),
    signal('candidate-id', 250 * HOUR_MS, '0Day', 80, 'HC'), signal('below-candidate', 250 * HOUR_MS, '0Day', 40, 'HL')];
  const symbols = [...new Set([...validation, ...holdout].map(row => row.symbol))];
  const hourlyBySymbol = new Map(symbols.map(symbol => [symbol, rally]));
  const index = buildIndicatorIndex(rally, btcHourly);
  const indicatorBySymbol = new Map(symbols.map(symbol => [symbol, index]));
  const result = evaluateCombination({ combination: COMBINATIONS[2], split: { development: [], validation, holdout },
    hourlyBySymbol, btcHourly, indicatorBySymbol });
  assert.equal(result.validation.passed, true);
  assert.equal(result.holdout.status, 'evaluated');
  assert.equal(result.holdout.matchedBaseline.combinationId, 'c01-score40-immediate');
  assert.equal(result.holdout.outcomes.find(row => row.signalId === 'boundary-id').reason, 'same-symbol-position-open');
  assert.deepEqual(result.holdout.matchedBaseline.signalIds, ['boundary-id', 'candidate-id']);
  assert.equal(result.holdout.matchedBaseline.metrics.tradeCount, 1);
});

test('later same-symbol trades are ignored while a trade is open', () => {
  const fixture = [
    { symbol: 'ETH', detectedAt: 0, entryTime: 10, exitTime: 20 },
    { symbol: 'ETH', detectedAt: 1, entryTime: 15, exitTime: 25 },
    { symbol: 'BTC', detectedAt: 1, entryTime: 15, exitTime: 25 },
    { symbol: 'ETH', detectedAt: 2, entryTime: 20, exitTime: 30 },
    { symbol: 'ETH', detectedAt: 12, entryTime: 31, exitTime: 40 },
  ];
  assert.deepEqual(removeOverlappingTrades(fixture), [fixture[0], fixture[2], fixture[3]]);
});

test('loads each symbol archive once and atomically writes every declared artifact', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'six-hour-runner-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'input'), out = path.join(root, 'out');
  await fs.mkdir(input, { recursive: true });
  const observations = [signal('eth', 230 * HOUR_MS, '0Day', 80, 'ETH'), signal('sol', 232 * HOUR_MS, '0Day', 80, 'SOL'), signal('excluded', 233 * HOUR_MS, '0Day', 90, 'XRP')];
  await Promise.all([
    fs.writeFile(path.join(input, 'observations.json'), JSON.stringify(observations)),
    fs.writeFile(path.join(input, 'metadata.json'), '{}'), fs.writeFile(path.join(input, 'universe.json'), JSON.stringify({ symbols: ['ETH', 'SOL'] })),
  ]);
  const calls = new Map();
  const loadHourly = async symbol => {
    calls.set(symbol, (calls.get(symbol) || 0) + 1);
    return candles();
  };
  const result = await runSixHourBacktest({ input, out, loadHourly });
  assert.deepEqual([...calls].sort(), [['BTC', 1], ['ETH', 1], ['SOL', 1]]);
  assert.equal(result.evaluations.length, 10);
  for (const name of ARTIFACT_NAMES) assert.ok(JSON.parse(await fs.readFile(path.join(out, name), 'utf8')));
  assert.deepEqual((await fs.readdir(out)).filter(name => name.endsWith('.tmp')), []);
  assert.equal(result.metadata.scope.signalType, '0Day');
  assert.equal(result.metadata.scope.minimumScore, 40);
  assert.equal(result.metadata.counts.studySignals, 2);
  assert.ok(result.signalOutcomes.length > 0);
  assert.equal(result.signalOutcomes.find(row => row.signalId === 'excluded').reason, 'outside-frozen-universe');
  assert.ok(result.evaluations.every(row => row.development.rejectionReasons.length > 0));
});

test('archive failures are explicit and do not abort other symbols', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'six-hour-failure-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'input'), out = path.join(root, 'out');
  await fs.mkdir(input, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(input, 'observations.json'), JSON.stringify([signal('eth', 230 * HOUR_MS, '0Day', 80, 'ETH')])),
    fs.writeFile(path.join(input, 'universe.json'), JSON.stringify({ symbols: ['ETH'] })),
  ]);
  const result = await runSixHourBacktest({ input, out, loadHourly: async symbol => {
    if (symbol === 'ETH') throw new Error('missing archive');
    return candles();
  } });
  assert.equal(result.dataFailures.at(-1).symbol, 'ETH');
  assert.match(result.dataFailures.at(-1).message, /missing archive/);
});

test('fails closed when frozen universe artifact is missing, malformed, or empty', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'six-hour-universe-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'input'), out = path.join(root, 'out');
  await fs.mkdir(input, { recursive: true });
  await fs.writeFile(path.join(input, 'observations.json'), '[]');
  await assert.rejects(runSixHourBacktest({ input, out, loadHourly: async () => candles() }), /universe artifact is missing/i);
  await fs.writeFile(path.join(input, 'universe.json'), '{broken');
  await assert.rejects(runSixHourBacktest({ input, out, loadHourly: async () => candles() }), /Invalid frozen universe artifact/i);
  for (const value of [{}, { symbols: [] }, { symbols: ['', null] }]) {
    await fs.writeFile(path.join(input, 'universe.json'), JSON.stringify(value));
    await assert.rejects(runSixHourBacktest({ input, out, loadHourly: async () => candles() }), /nonempty symbols array/i);
  }
});

test('CLI requires input and output paths', () => {
  assert.deepEqual(parseArgs(['--input', 'a', '--out', 'b']), { input: 'a', out: 'b' });
  assert.throws(() => parseArgs(['--input', 'a']), /Usage/);
});

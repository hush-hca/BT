'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { SORTED_CANDLES, findEntry, simulateTrade, calculateTradeMetrics } = require('./1d-bulls2-execution-core.cjs');
const { fetchArchiveHourlyKlines, aggregateHourlyToDaily } = require('./1d-bulls2-validation-runner.cjs');

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const WARMUP_DAYS = 20;
// Entry can occur 72h after detection and the longest exit is another 14d.
const FORWARD_DAYS = 18;

function chronological(left, right) {
  return left.detectedAt - right.detectedAt || String(left.symbol || '').localeCompare(String(right.symbol || ''));
}

function splitThreeWays(signals) {
  const rows = [...signals].sort(chronological);
  const boundaries = [0];
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].detectedAt !== rows[index - 1].detectedAt) boundaries.push(index);
  }
  boundaries.push(rows.length);
  const nearest = (target, minimum = 0) => boundaries
    .filter(value => value >= minimum)
    .sort((left, right) => Math.abs(left - target) - Math.abs(right - target) || left - right)[0];
  const developmentEnd = nearest(rows.length * 0.6);
  const validationEnd = nearest(rows.length * 0.8, developmentEnd);
  return {
    development: rows.slice(0, developmentEnd),
    validation: rows.slice(developmentEnd, validationEnd),
    holdout: rows.slice(validationEnd)
  };
}

function buildConfigurationGrid() {
  const entries = [
    { entryFamily: 'breakout' },
    { entryFamily: 'retest' },
    { entryFamily: 'limit', limitOffset: 0.005 },
    { entryFamily: 'limit', limitOffset: 0.01 }
  ];
  const stops = ['support', 'sweep', 'atr'];
  const exits = [
    { exitFamily: 'fixed', targetR: 1.5 },
    { exitFamily: 'fixed', targetR: 2 },
    { exitFamily: 'fixed', targetR: 3 },
    { exitFamily: 'split' },
    { exitFamily: 'time', timeExitDays: 7 },
    { exitFamily: 'time', timeExitDays: 14 }
  ];
  const scores = [0, 60, 70, 80];
  const filters = ['none', 'relvol-1-4', 'distance-3pct', 'relvol-1-4+distance-3pct'];
  const grid = [];
  for (const entry of entries) for (const stopFamily of stops) for (const exit of exits) {
    for (const minimumScore of scores) for (const contextFilter of filters) {
      const config = { ...entry, stopFamily, ...exit, minimumScore, contextFilter };
      config.id = [entry.entryFamily, entry.limitOffset || '', stopFamily, exit.exitFamily,
        exit.targetR || exit.timeExitDays || '', `score${minimumScore}`, contextFilter].filter(Boolean).join(':');
      grid.push(config);
    }
  }
  return grid;
}

function trueRange(candle, previousClose) {
  return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
}

function atrBefore(dailyCandles, cutoff, period = 14) {
  const completed = dailyCandles.filter(candle => candle.time + DAY_MS <= cutoff);
  if (completed.length < period + 1) return null;
  const window = completed.slice(-(period + 1));
  const ranges = window.slice(1).map((candle, index) => trueRange(candle, window[index].close));
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function buildAtrIndex(dailyCandles, period = 14) {
  const result = new Map(), ranges = [], sortedDays = [...dailyCandles].sort((a, b) => a.time - b.time);
  let rolling = 0;
  for (let index = 1; index < sortedDays.length; index += 1) {
    const range = trueRange(sortedDays[index], sortedDays[index - 1].close);
    ranges.push(range);
    rolling += range;
    if (ranges.length > period) rolling -= ranges[ranges.length - period - 1];
    // This value is attached to the following day, so every component was closed beforehand.
    if (ranges.length >= period && sortedDays[index + 1]) result.set(sortedDays[index + 1].time, rolling / period);
  }
  return result;
}

function lowerBoundTime(candles, target) {
  let low = 0, high = candles.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (candles[middle].time < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function indexedRange(candles, startInclusive, endExclusive, accessStats) {
  const start = lowerBoundTime(candles, startInclusive);
  const end = lowerBoundTime(candles, endExclusive);
  if (accessStats) {
    accessStats.binarySearches += 2;
    accessStats.rangeCandlesVisited += end - start;
  }
  const range = candles.slice(start, end);
  Object.defineProperty(range, SORTED_CANDLES, { value: true });
  return range;
}

function signalLowKnownAt(signal, hourlyCandles) {
  const end = signal.signalType === '1Day' ? signal.candleTime + DAY_MS : signal.detectedAt;
  const known = hourlyCandles.filter(candle => candle.time >= signal.candleTime && candle.time + HOUR_MS <= end);
  return known.length ? Math.min(...known.map(candle => candle.low)) : null;
}

async function enrichSignals({ observations, universe, loadHourly = fetchArchiveHourlyKlines }) {
  const signalsBySymbol = new Map();
  for (const signal of observations) {
    const rows = signalsBySymbol.get(signal.symbol) || [];
    rows.push(signal);
    signalsBySymbol.set(signal.symbol, rows);
  }
  const requested = new Set((universe.symbols || []).map(symbol => String(symbol).replace(/USDT$/, '')));
  const cache = new Map(), failures = [], signals = [];
  const accessStats = { binarySearches: 0, rangeCandlesVisited: 0, sourceCandles: 0, signalsProcessed: 0 };
  for (const [symbol, symbolSignals] of signalsBySymbol) {
    if (requested.size && !requested.has(String(symbol).replace(/USDT$/, ''))) continue;
    const first = Math.min(...symbolSignals.map(row => row.candleTime)) - WARMUP_DAYS * DAY_MS;
    const last = Math.max(...symbolSignals.map(row => row.detectedAt)) + FORWARD_DAYS * DAY_MS + HOUR_MS;
    try {
      const hourly = [...await loadHourly(symbol, first, last)].sort((a, b) => a.time - b.time);
      accessStats.sourceCandles += hourly.length;
      cache.set(symbol, hourly);
      const daily = aggregateHourlyToDaily(hourly);
      const atrIndex = buildAtrIndex(daily);
      for (const signal of symbolSignals) {
        accessStats.signalsProcessed += 1;
        const knownEnd = signal.signalType === '1Day' ? signal.candleTime + DAY_MS : signal.detectedAt;
        const knownSignalCandles = indexedRange(hourly, signal.candleTime, knownEnd, accessStats)
          .filter(candle => candle.time + HOUR_MS <= knownEnd);
        const signalLow = knownSignalCandles.length ? Math.min(...knownSignalCandles.map(candle => candle.low)) : null;
        const dailyAtr = atrIndex.get(signal.candleTime) ?? null;
        if (!(signalLow > 0) || !(dailyAtr > 0)) {
          failures.push({ symbol, detectedAt: signal.detectedAt, reason: 'insufficient-enrichment-history' });
          continue;
        }
        const sliceStart = signal.detectedAt;
        const sliceEnd = signal.detectedAt + FORWARD_DAYS * DAY_MS + HOUR_MS;
        signals.push({ ...signal, signalLow, dailyAtr,
          hourlyCandles: indexedRange(hourly, sliceStart, sliceEnd, accessStats) });
      }
    } catch (error) {
      failures.push({ symbol, reason: error.message });
    }
  }
  return { signals: signals.sort(chronological), failures, hourlyCache: cache, accessStats };
}

function passesContext(signal, entry, config) {
  const relvol = config.contextFilter.includes('relvol');
  const distance = config.contextFilter.includes('distance');
  if (relvol && !(signal.relVol >= 1 && signal.relVol <= 4)) return false;
  if (distance && !(entry.price <= signal.support * 1.03)) return false;
  return true;
}

function simulateConfiguration(signals, config) {
  const eligible = signals.filter(signal => signal.score >= config.minimumScore);
  const trades = [];
  for (const signal of eligible) {
    const entry = findEntry({ signal, hourlyCandles: signal.hourlyCandles, config });
    if (!entry || !passesContext(signal, entry, config)) continue;
    const trade = simulateTrade({ signal, entry, hourlyCandles: signal.hourlyCandles, config,
      signalLow: signal.signalLow, dailyAtr: signal.dailyAtr });
    if (trade) trades.push({ ...trade, symbol: signal.symbol, support: signal.support, relVol: signal.relVol,
      signalLow: signal.signalLow, dailyAtr: signal.dailyAtr, configurationId: config.id });
  }
  return { metrics: { ...calculateTradeMetrics(trades), eligibleSignals: eligible.length,
    fillRate: eligible.length ? trades.length / eligible.length : 0 }, trades };
}

function executionKey(config) {
  return [config.entryFamily, config.limitOffset || '', config.stopFamily, config.exitFamily,
    config.targetR || '', config.timeExitDays || ''].join(':');
}

function entryKey(config) {
  return [config.entryFamily, config.limitOffset || ''].join(':');
}

function simulateBaseTrades(signals, config, precomputedEntries = null) {
  const trades = [];
  for (let index = 0; index < signals.length; index += 1) {
    const signal = signals[index];
    const entry = precomputedEntries ? precomputedEntries[index]
      : findEntry({ signal, hourlyCandles: signal.hourlyCandles, config });
    if (!entry) continue;
    const trade = simulateTrade({ signal, entry, hourlyCandles: signal.hourlyCandles, config,
      signalLow: signal.signalLow, dailyAtr: signal.dailyAtr });
    if (trade) trades.push({ ...trade, symbol: signal.symbol, support: signal.support, relVol: signal.relVol,
      signalLow: signal.signalLow, dailyAtr: signal.dailyAtr, entryDistance: entry.price / signal.support - 1 });
  }
  return trades;
}

function evaluateConfigurations(signals, grid) {
  const baseCache = new Map(), entryCache = new Map();
  return grid.map(config => {
    const key = executionKey(config);
    const entryCacheKey = entryKey(config);
    if (!entryCache.has(entryCacheKey)) entryCache.set(entryCacheKey,
      signals.map(signal => findEntry({ signal, hourlyCandles: signal.hourlyCandles, config })));
    if (!baseCache.has(key)) baseCache.set(key, simulateBaseTrades(signals, config, entryCache.get(entryCacheKey)));
    const eligibleSignals = signals.filter(signal => signal.score >= config.minimumScore).length;
    const trades = baseCache.get(key).filter(trade => trade.score >= config.minimumScore
      && (!config.contextFilter.includes('relvol') || (trade.relVol >= 1 && trade.relVol <= 4))
      && (!config.contextFilter.includes('distance') || trade.entryDistance <= 0.03));
    return { id: config.id, config, metrics: { ...calculateTradeMetrics(trades), eligibleSignals,
      fillRate: eligibleSignals ? trades.length / eligibleSignals : 0 }, trades };
  });
}

function selectDevelopmentCandidate(results) {
  return results
    .filter(row => row.metrics.tradeCount >= 100 && row.metrics.expectancy > 0
      && row.metrics.profitFactor >= 1.15 && row.metrics.medianR >= 0)
    .sort((a, b) => b.metrics.expectancy - a.metrics.expectancy
      || b.metrics.profitFactor - a.metrics.profitFactor
      || a.metrics.maxDrawdownR - b.metrics.maxDrawdownR
      || b.metrics.tradeCount - a.metrics.tradeCount
      || a.id.localeCompare(b.id))[0] || null;
}

function passesValidationGate(metrics) {
  return metrics.tradeCount >= 30 && metrics.expectancy > 0 && metrics.profitFactor >= 1.15 && metrics.medianR >= 0;
}

async function runBacktest({ enrichedSignals, grid = buildConfigurationGrid() }) {
  const bySignalType = {}, ledger = [];
  for (const signalType of ['0Day', '1Day']) {
    const split = splitThreeWays(enrichedSignals.filter(row => row.signalType === signalType));
    const developmentRuns = evaluateConfigurations(split.development, grid);
    const development = developmentRuns.map(({ id, config, metrics }) => ({ id, config, metrics }));
    const selected = selectDevelopmentCandidate(development);
    let validation = { status: 'not-evaluated', metrics: null };
    let holdout = { status: 'not-evaluated', metrics: null };
    if (selected) {
      const developmentRun = simulateConfiguration(split.development, selected.config);
      ledger.push(...developmentRun.trades.map(trade => ({ ...trade, stage: 'development' })));
      const validationRun = simulateConfiguration(split.validation, selected.config);
      validation = { status: 'evaluated', metrics: validationRun.metrics };
      ledger.push(...validationRun.trades.map(trade => ({ ...trade, stage: 'validation' })));
      if (passesValidationGate(validationRun.metrics)) {
        const holdoutRun = simulateConfiguration(split.holdout, selected.config);
        holdout = { status: 'evaluated', metrics: holdoutRun.metrics };
        ledger.push(...holdoutRun.trades.map(trade => ({ ...trade, stage: 'holdout' })));
      }
    }
    bySignalType[signalType] = {
      splitCounts: Object.fromEntries(Object.entries(split).map(([key, rows]) => [key, rows.length])),
      development, selected: selected ? { id: selected.id, config: selected.config, metrics: selected.metrics } : null,
      validation, holdout
    };
  }
  return { bySignalType, ledger: ledger.sort((a, b) => a.entryTime - b.entryTime || a.symbol.localeCompare(b.symbol)) };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, (_key, item) =>
    typeof item === 'number' && !Number.isFinite(item) ? String(item) : item, 2)}\n`, 'utf8');
}

async function runCli({ input, out, loadHourly }) {
  const [observations, universe] = await Promise.all([
    fs.readFile(path.join(input, 'observations.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(input, 'universe.json'), 'utf8').then(JSON.parse)
  ]);
  const enriched = await enrichSignals({ observations, universe, loadHourly });
  const result = await runBacktest({ enrichedSignals: enriched.signals });
  const gridArtifact = Object.fromEntries(Object.entries(result.bySignalType).map(([type, row]) => [type, {
    splitCounts: row.splitCounts, results: row.development
  }]));
  const selected = Object.fromEntries(Object.entries(result.bySignalType).map(([type, row]) => [type, row.selected]));
  const validation = Object.fromEntries(Object.entries(result.bySignalType).map(([type, row]) => [type, row.validation]));
  const holdout = Object.fromEntries(Object.entries(result.bySignalType).map(([type, row]) => [type, row.holdout]));
  await Promise.all([
    writeJson(path.join(out, 'execution-grid.json'), gridArtifact),
    writeJson(path.join(out, 'selected-development.json'), selected),
    writeJson(path.join(out, 'validation-result.json'), validation),
    writeJson(path.join(out, 'holdout-result.json'), holdout),
    writeJson(path.join(out, 'trade-ledger.json'), result.ledger),
    writeJson(path.join(out, 'enrichment-failures.json'), enriched.failures)
  ]);
  return { ...result, enrichmentFailures: enriched.failures };
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!['--input', '--out'].includes(key) || !value) throw new Error('Usage: node scripts/1d-bulls2-execution-runner.cjs --input PATH --out PATH');
    result[key.slice(2)] = value;
  }
  if (!result.input || !result.out) throw new Error('Usage: node scripts/1d-bulls2-execution-runner.cjs --input PATH --out PATH');
  return result;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runCli(args).then(result => console.log(`Wrote ${result.ledger.length} validation/holdout trades`))
    .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = {
  splitThreeWays, buildConfigurationGrid, atrBefore, buildAtrIndex, lowerBoundTime, indexedRange,
  signalLowKnownAt, enrichSignals,
  passesContext, simulateConfiguration, executionKey, entryKey, simulateBaseTrades, evaluateConfigurations,
  selectDevelopmentCandidate, passesValidationGate,
  runBacktest, runCli, parseArgs
};

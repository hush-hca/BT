'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  HOUR_MS, buildIndicatorIndex, findIntradayEntry, simulateSixHourTrade, calculateMetrics,
} = require('./1d-bulls2-six-hour-core.cjs');
const { fetchArchiveHourlyKlines } = require('./1d-bulls2-validation-runner.cjs');

const WARMUP_HOURS = 220;
const FORWARD_HOURS = 18;
const ARTIFACT_NAMES = Object.freeze([
  'study-metadata.json', 'combination-definitions.json', 'development-results.json',
  'validation-results.json', 'holdout-results.json', 'trade-ledger.json', 'signal-outcomes.json',
  'data-failures.json',
]);

const COMBINATIONS = Object.freeze([
  { id: 'c01-score40-immediate', minimumScore: 40, entry: 'immediate', stop: 'atr', targetR: 1.5 },
  { id: 'c02-score60-immediate', minimumScore: 60, entry: 'immediate', stop: 'atr', targetR: 1.5 },
  { id: 'c03-score80-immediate', minimumScore: 80, entry: 'immediate', stop: 'atr', targetR: 1.5 },
  { id: 'c04-score40-relvol-confirm', minimumScore: 40, relVol: [1.2, 3], entry: 'confirmation', stop: 'trigger-low', targetR: 1.5 },
  { id: 'c05-score60-relvol-confirm', minimumScore: 60, relVol: [1.2, 3], entry: 'confirmation', stop: 'atr', targetR: 2 },
  { id: 'c06-score80-relvol-confirm', minimumScore: 80, relVol: [1.2, 3], entry: 'confirmation', stop: 'atr', targetR: 2 },
  { id: 'c07-score40-support-retest', minimumScore: 40, maxSupportDistance: 0.03, entry: 'retest', stop: 'trigger-low-atr-quarter', targetR: 1.5 },
  { id: 'c08-score60-support-breakout', minimumScore: 60, maxSupportDistance: 0.03, entry: 'breakout', stop: 'atr', targetR: 2 },
  { id: 'c09-score60-btc-vwap', minimumScore: 60, entry: 'vwap-convergence', stop: 'atr', exit: 'split-1r-2r' },
  { id: 'c10-score80-rs-volume-breakout', minimumScore: 80, entry: 'rs-volume-breakout', stop: 'trigger-low-atr-quarter', targetR: 2 },
].map(Object.freeze));

const chronological = (a, b) => a.detectedAt - b.detectedAt || String(a.symbol).localeCompare(String(b.symbol));

const cleanSymbol = value => String(value || '').toUpperCase().replace(/USDT$/, '');
const signalKey = signal => signal.id == null ? `${signal.detectedAt}:${cleanSymbol(signal.symbol)}` : String(signal.id);

function filterStudySignals(signals, universe = null) {
  const declared = universe && (universe.symbols || universe.selectedSymbols);
  const allowed = Array.isArray(declared) ? new Set(declared.map(cleanSymbol)) : null;
  const excluded = new Set((universe?.excluded || []).map(row => cleanSymbol(typeof row === 'string' ? row : row.symbol)));
  return (signals || []).filter(row => row?.signalType === '0Day' && Number.isFinite(row.score) && row.score >= 40
      && (!allowed || allowed.has(cleanSymbol(row.symbol))) && !excluded.has(cleanSymbol(row.symbol)))
    .sort(chronological);
}

function studyFilterOutcomes(signals, universe) {
  const declared = universe && (universe.symbols || universe.selectedSymbols);
  const allowed = Array.isArray(declared) ? new Set(declared.map(cleanSymbol)) : null;
  const excluded = new Set((universe?.excluded || []).map(row => cleanSymbol(typeof row === 'string' ? row : row.symbol)));
  return (signals || []).flatMap(signal => {
    let reason = null;
    if (signal?.signalType !== '0Day') reason = 'non-0day-signal';
    else if (!Number.isFinite(signal.score) || signal.score < 40) reason = 'score-below-study-minimum';
    else if (excluded.has(cleanSymbol(signal.symbol))) reason = 'frozen-universe-exclusion';
    else if (allowed && !allowed.has(cleanSymbol(signal.symbol))) reason = 'outside-frozen-universe';
    return reason ? [{ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
      combinationId: null, stage: 'study-filter', status: 'filtered', reason }] : [];
  });
}

function splitTimestampGroups(signals) {
  const rows = [...signals].sort(chronological);
  const boundaries = [0];
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].detectedAt !== rows[index - 1].detectedAt) boundaries.push(index);
  }
  boundaries.push(rows.length);
  const nearest = (target, minimum) => boundaries.filter(value => value >= minimum)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)[0] ?? rows.length;
  const developmentEnd = nearest(rows.length * 0.6, 0);
  const validationEnd = nearest(rows.length * 0.8, developmentEnd);
  return {
    development: rows.slice(0, developmentEnd),
    validation: rows.slice(developmentEnd, validationEnd),
    holdout: rows.slice(validationEnd),
  };
}

function removeOverlappingTrades(trades, intervals = new Map()) {
  const accepted = [];
  for (const trade of [...trades].sort(chronological)) {
    const key = cleanSymbol(trade.symbol);
    const acceptedForSymbol = intervals.get(key) || [];
    const detectedDuringPosition = acceptedForSymbol.some(row => trade.detectedAt >= row.entryTime && trade.detectedAt < row.exitTime);
    const entryWouldOverlap = acceptedForSymbol.some(row => trade.entryTime >= row.entryTime && trade.entryTime < row.exitTime);
    if (detectedDuringPosition || entryWouldOverlap) continue;
    accepted.push(trade);
    acceptedForSymbol.push(trade);
    intervals.set(key, acceptedForSymbol);
  }
  return accepted.sort((a, b) => a.entryTime - b.entryTime || chronological(a, b));
}

function detectedDuringOpenPosition(signal, positionState) {
  const key = cleanSymbol(signal.symbol);
  return (positionState.get(key) || []).some(row => signal.detectedAt >= row.entryTime && signal.detectedAt < row.exitTime);
}

function eligibilityReason(signal, combination, hourly, indicators) {
  if (signal.score < combination.minimumScore) return 'score-below-combination-minimum';
  if (combination.relVol && !(Number.isFinite(signal.relVol)
    && signal.relVol >= combination.relVol[0] && signal.relVol <= combination.relVol[1])) return 'relvol-outside-range';
  if (!hourly || !indicators) return 'market-data-unavailable';
  const observationTime = signal.detectedAt + 5 * HOUR_MS;
  const observationCandle = hourly.find(candle => candle.time + HOUR_MS === observationTime);
  const point = indicators.get(observationTime);
  if (Number.isFinite(combination.maxSupportDistance)) {
    if (!(signal.support > 0) || !observationCandle) return 'support-observation-unavailable';
    if (Math.abs(observationCandle.close - signal.support) / signal.support > combination.maxSupportDistance) return 'support-distance-filter';
  }
  if (combination.entry === 'vwap-convergence') {
    if (!point) return 'trend-observation-unavailable';
    if (!(point.coinClose > point.coinSma200 && point.coinSma200Rising
      && point.btcClose > point.btcSma200 && point.btcSma200Rising)) return 'trend-convergence-filter';
  }
  return null;
}

function yearlyMetrics(trades) {
  const grouped = new Map();
  for (const trade of trades) {
    const year = new Date(trade.entryTime).getUTCFullYear();
    const rows = grouped.get(year) || [];
    rows.push(trade);
    grouped.set(year, rows);
  }
  return Object.fromEntries([...grouped].sort(([a], [b]) => a - b).map(([year, rows]) => [year, {
    tradeCount: rows.length,
    netR: Number(rows.reduce((sum, row) => sum + row.netR, 0).toFixed(12)),
    expectancy: calculateMetrics(rows).expectancy,
    profitFactor: calculateMetrics(rows).profitFactor,
  }]));
}

function stageRun({ signals, hourlyBySymbol, btcHourly, indicatorBySymbol, combination, stage, positionState = new Map() }) {
  const trades = [], outcomes = [];
  let eligibleSignals = 0;
  for (const signal of [...signals].sort(chronological)) {
    if (detectedDuringOpenPosition(signal, positionState)) {
      outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
        combinationId: combination.id, stage, status: 'ignored', reason: 'same-symbol-position-open' });
      continue;
    }
    const hourly = hourlyBySymbol.get(signal.symbol);
    const indicators = indicatorBySymbol.get(signal.symbol);
    const filteredBecause = eligibilityReason(signal, combination, hourly, indicators);
    if (filteredBecause) {
      outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
        combinationId: combination.id, stage, status: 'filtered', reason: filteredBecause });
      continue;
    }
    eligibleSignals += 1;
    const entry = findIntradayEntry({ signal, hourly, btcHourly, indicators: indicatorBySymbol.get(signal.symbol), combination });
    if (!entry) {
      outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
        combinationId: combination.id, stage, status: 'unfilled', reason: 'no-entry-trigger' });
      continue;
    }
    const trade = simulateSixHourTrade({ signal, entry, hourly, combination });
    if (!trade) {
      outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
        combinationId: combination.id, stage, status: 'rejected', reason: 'invalid-risk-or-incomplete-exit' });
      continue;
    }
    const decorated = { ...trade, signalId: signalKey(signal), support: signal.support, relVol: signal.relVol, combinationId: combination.id, stage };
    if (!removeOverlappingTrades([decorated], positionState).length) {
      outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
        combinationId: combination.id, stage, status: 'ignored', reason: 'same-symbol-position-open' });
      continue;
    }
    trades.push(decorated);
    outcomes.push({ signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
      combinationId: combination.id, stage, status: 'filled', reason: decorated.exitReason,
      entryTime: decorated.entryTime, exitTime: decorated.exitTime, netR: decorated.netR });
  }
  return {
    metrics: {
      ...calculateMetrics(trades), eligibleSignals,
      filledTrades: trades.length, fillRate: eligibleSignals ? trades.length / eligibleSignals : 0,
      yearly: yearlyMetrics(trades),
    },
    trades, outcomes, positionState,
  };
}

function passesDevelopment(metrics) {
  return metrics.tradeCount >= 100 && metrics.expectancy > 0 && metrics.profitFactor >= 1.15 && metrics.medianR >= 0;
}

function passesValidation(metrics) {
  return metrics.tradeCount >= 40 && metrics.expectancy > 0 && metrics.profitFactor >= 1.15 && metrics.medianR > 0;
}

function developmentRejectionReasons(metrics) {
  return [metrics.tradeCount < 100 && 'trade-count-below-100', metrics.expectancy <= 0 && 'expectancy-not-positive',
    metrics.profitFactor < 1.15 && 'profit-factor-below-1.15', metrics.medianR < 0 && 'median-r-below-zero'].filter(Boolean);
}

function validationRejectionReasons(metrics) {
  return [metrics.tradeCount < 40 && 'trade-count-below-40', metrics.expectancy <= 0 && 'expectancy-not-positive',
    metrics.profitFactor < 1.15 && 'profit-factor-below-1.15', metrics.medianR <= 0 && 'median-r-not-positive'].filter(Boolean);
}

function holdoutRejectionReasons(metrics, baseline) {
  const positiveYears = Object.values(metrics.yearly || {}).filter(row => row.expectancy > 0).length;
  return [metrics.tradeCount < 40 && 'trade-count-below-40', metrics.expectancy <= 0 && 'expectancy-not-positive',
    metrics.profitFactor < 1.2 && 'profit-factor-below-1.20', metrics.medianR <= 0 && 'median-r-not-positive',
    baseline && metrics.expectancy <= baseline.expectancy && 'expectancy-not-better-than-matched-baseline',
    baseline && metrics.profitFactor <= baseline.profitFactor && 'profit-factor-not-better-than-matched-baseline',
    positiveYears < 2 && 'fewer-than-two-positive-calendar-years'].filter(Boolean);
}

function matchedSignals(signals, outcomes) {
  const eligibleIds = new Set(outcomes.filter(row => row.status !== 'filtered').map(row => row.signalId));
  return signals.filter(signal => eligibleIds.has(signalKey(signal)));
}

function evaluateCombination({ combination, split, hourlyBySymbol, btcHourly, indicatorBySymbol, baseline = COMBINATIONS[0] }) {
  const positionState = new Map();
  const development = stageRun({ signals: split.development, hourlyBySymbol, btcHourly, indicatorBySymbol, combination, stage: 'development', positionState });
  const validation = stageRun({ signals: split.validation, hourlyBySymbol, btcHourly, indicatorBySymbol, combination, stage: 'validation', positionState });
  const validationPassed = passesValidation(validation.metrics);
  let holdout = { status: 'sealed', metrics: null, trades: [], outcomes: split.holdout.map(signal => ({
    signalId: signalKey(signal), symbol: signal.symbol, detectedAt: signal.detectedAt,
    combinationId: combination.id, stage: 'holdout', status: 'sealed', reason: 'validation-gate-failed',
  })), matchedBaseline: null,
    rejectionReasons: ['validation-gate-failed'] };
  if (validationPassed) {
    const candidateHoldout = stageRun({ signals: split.holdout, hourlyBySymbol, btcHourly, indicatorBySymbol, combination, stage: 'holdout', positionState });
    // The matched c01 run is independent of c01's own validation result. It uses the
    // candidate's exact eligible signal IDs at every stage so boundary overlap state is comparable.
    const baselineState = new Map();
    stageRun({ signals: matchedSignals(split.development, development.outcomes), hourlyBySymbol, btcHourly,
      indicatorBySymbol, combination: baseline, stage: 'development', positionState: baselineState });
    stageRun({ signals: matchedSignals(split.validation, validation.outcomes), hourlyBySymbol, btcHourly,
      indicatorBySymbol, combination: baseline, stage: 'validation', positionState: baselineState });
    const matchedBaselineRun = stageRun({ signals: matchedSignals(split.holdout, candidateHoldout.outcomes), hourlyBySymbol,
      btcHourly, indicatorBySymbol, combination: baseline, stage: 'holdout', positionState: baselineState });
    const matchedBaseline = { combinationId: baseline.id,
      signalIds: matchedSignals(split.holdout, candidateHoldout.outcomes).map(signalKey), metrics: matchedBaselineRun.metrics,
      trades: matchedBaselineRun.trades, outcomes: matchedBaselineRun.outcomes };
    holdout = { status: 'evaluated', ...candidateHoldout, matchedBaseline,
      rejectionReasons: holdoutRejectionReasons(candidateHoldout.metrics, matchedBaseline.metrics) };
  }
  return {
    id: combination.id,
    combination,
    development: { status: 'evaluated', passed: passesDevelopment(development.metrics),
      rejectionReasons: developmentRejectionReasons(development.metrics), ...development },
    validation: { status: 'evaluated', passed: validationPassed,
      rejectionReasons: validationRejectionReasons(validation.metrics), ...validation },
    holdout,
  };
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  const json = JSON.stringify(value, (_key, item) => typeof item === 'number' && !Number.isFinite(item) ? String(item) : item, 2);
  await fs.writeFile(temporary, `${json}\n`, 'utf8');
  await fs.rename(temporary, file);
}

async function readOptionalJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function readFrozenUniverse(input) {
  const file = path.join(input, 'universe.json');
  let universe;
  try { universe = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Required frozen universe artifact is missing: ${file}`);
    throw new Error(`Invalid frozen universe artifact ${file}: ${error.message}`);
  }
  if (!universe || !Array.isArray(universe.symbols) || !universe.symbols.length
    || !universe.symbols.some(symbol => cleanSymbol(symbol))) {
    throw new Error(`Frozen universe artifact must contain a nonempty symbols array: ${file}`);
  }
  return universe;
}

async function runSixHourBacktest({ input, out, loadHourly = fetchArchiveHourlyKlines }) {
  const [allSignals, sourceMetadata, universe, sourceFailures] = await Promise.all([
    readOptionalJson(path.join(input, 'observations.json'), []), readOptionalJson(path.join(input, 'metadata.json'), {}),
    readFrozenUniverse(input), readOptionalJson(path.join(input, 'failures.json'), []),
  ]);
  const signals = filterStudySignals(allSignals, universe);
  const split = splitTimestampGroups(signals);
  const symbols = [...new Set([...signals.map(row => row.symbol), 'BTC'])];
  const earliest = signals.length ? signals[0].detectedAt - WARMUP_HOURS * HOUR_MS : 0;
  const latest = signals.length ? signals.at(-1).detectedAt + FORWARD_HOURS * HOUR_MS : HOUR_MS;
  const hourlyBySymbol = new Map(), dataFailures = sourceFailures.map(row => ({ ...row, source: 'validation-artifact' }));
  for (const symbol of symbols) {
    try {
      const hourly = [...await loadHourly(symbol, earliest, latest)].sort((a, b) => a.time - b.time);
      hourlyBySymbol.set(symbol, hourly);
    } catch (error) {
      dataFailures.push({ symbol, source: 'six-hour-enrichment', message: error.message });
    }
  }
  const btcHourly = hourlyBySymbol.get('BTC') || [];
  const indicatorBySymbol = new Map();
  for (const [symbol, hourly] of hourlyBySymbol) indicatorBySymbol.set(symbol, buildIndicatorIndex(hourly, btcHourly));
  const evaluations = COMBINATIONS.map(combination => evaluateCombination({ combination, split, hourlyBySymbol, btcHourly, indicatorBySymbol }));
  const resultsFor = stage => evaluations.map(row => ({
    id: row.id, status: row[stage].status, ...(row[stage].passed === undefined ? {} : { passed: row[stage].passed }),
    metrics: row[stage].metrics, rejectionReasons: row[stage].rejectionReasons,
    ...(stage === 'holdout' ? { matchedBaseline: row[stage].matchedBaseline && {
      combinationId: row[stage].matchedBaseline.combinationId, signalIds: row[stage].matchedBaseline.signalIds,
      metrics: row[stage].matchedBaseline.metrics,
    } } : {}),
  }));
  const ledger = evaluations.flatMap(row => [row.development, row.validation, row.holdout].flatMap(stage => stage.trades || [])
    .concat((row.holdout.matchedBaseline?.trades || []).map(trade => ({ ...trade, matchedBaselineFor: row.id }))))
    .sort((a, b) => a.entryTime - b.entryTime || a.combinationId.localeCompare(b.combinationId));
  const signalOutcomes = studyFilterOutcomes(allSignals, universe).concat(evaluations.flatMap(row => [row.development, row.validation, row.holdout]
    .flatMap(stage => stage.outcomes || []).concat((row.holdout.matchedBaseline?.outcomes || [])
      .map(outcome => ({ ...outcome, matchedBaselineFor: row.id })))));
  const metadata = {
    generatedAt: new Date().toISOString(), sourceInput: path.resolve(input), sourceMetadata,
    universeProvenance: universe.provenance || sourceMetadata.universeProvenance || null,
    scope: { signalType: '0Day', minimumScore: 40, combinations: COMBINATIONS.length, split: 'timestamp-grouped-60/20/20' },
    splitCounts: Object.fromEntries(Object.entries(split).map(([key, rows]) => [key, rows.length])),
    counts: { sourceSignals: allSignals.length, studySignals: signals.length, loadedSymbols: hourlyBySymbol.size, dataFailures: dataFailures.length },
  };
  const artifacts = {
    'study-metadata.json': metadata,
    'combination-definitions.json': COMBINATIONS,
    'development-results.json': resultsFor('development'),
    'validation-results.json': resultsFor('validation'),
    'holdout-results.json': resultsFor('holdout'),
    'trade-ledger.json': ledger,
    'signal-outcomes.json': signalOutcomes,
    'data-failures.json': dataFailures,
  };
  await Promise.all(Object.entries(artifacts).map(([name, value]) => writeJsonAtomic(path.join(out, name), value)));
  return { metadata, evaluations, ledger, signalOutcomes, dataFailures, artifacts };
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!['--input', '--out'].includes(key) || !value) throw new Error('Usage: node scripts/1d-bulls2-six-hour-runner.cjs --input PATH --out PATH');
    result[key.slice(2)] = value;
  }
  if (!result.input || !result.out) throw new Error('Usage: node scripts/1d-bulls2-six-hour-runner.cjs --input PATH --out PATH');
  return result;
}

if (require.main === module) {
  runSixHourBacktest(parseArgs(process.argv.slice(2)))
    .then(result => console.log(`Wrote ${result.ledger.length} six-hour trades across exactly ${COMBINATIONS.length} combinations`))
    .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = {
  ARTIFACT_NAMES, COMBINATIONS, filterStudySignals, studyFilterOutcomes, splitTimestampGroups, removeOverlappingTrades,
  detectedDuringOpenPosition, readFrozenUniverse,
  yearlyMetrics, passesDevelopment, passesValidation, developmentRejectionReasons, validationRejectionReasons,
  holdoutRejectionReasons, evaluateCombination, runSixHourBacktest, parseArgs,
};

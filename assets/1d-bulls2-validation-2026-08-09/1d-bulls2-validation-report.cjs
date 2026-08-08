'use strict';

// Analysis-only companion for the frozen Bulls2 replay.  It never changes the
// scanner and refuses to infer context fields that are absent from an artifact.
const fs = require('node:fs/promises');
const path = require('node:path');

const HORIZONS = ['1d', '3d', '7d', '14d', '30d'];
const FIXED_BANDS = [
  { label: '0-39', min: 0, max: 39.999999 },
  { label: '40-59', min: 40, max: 59.999999 },
  { label: '60-79', min: 60, max: 79.999999 },
  { label: '80-100', min: 80, max: 100 }
];

function finite(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}
function round(value) { return value === null ? null : Number(value.toFixed(4)); }
function median(values) { return percentile(values, 0.5); }

function calculateMetrics(rows, horizonKey) {
  const values = rows.map(row => row.outcomes?.[horizonKey]).filter(value => value && finite(value.returnPercent) !== null);
  const returns = values.map(value => finite(value.returnPercent));
  const mfes = values.map(value => finite(value.mfePercent)).filter(value => value !== null);
  const maes = values.map(value => finite(value.maePercent)).filter(value => value !== null);
  return {
    sampleSize: values.length,
    meanReturn: round(mean(returns)), medianReturn: round(median(returns)),
    winRate: values.length ? round(returns.filter(value => value > 0).length / values.length) : null,
    p10: round(percentile(returns, 0.10)), p25: round(percentile(returns, 0.25)),
    p75: round(percentile(returns, 0.75)), p90: round(percentile(returns, 0.90)),
    meanMfe: round(mean(mfes)), medianMfe: round(median(mfes)),
    meanMae: round(mean(maes)), medianMae: round(median(maes)),
    worstMae: maes.length ? round(Math.min(...maes)) : null
  };
}
function metricsByHorizon(rows) { return Object.fromEntries(HORIZONS.map(horizon => [horizon, calculateMetrics(rows, horizon)])); }
function scoreRows(rows, band) { return rows.filter(row => finite(row.score) !== null && row.score >= band.min && row.score <= band.max); }
function quantileBands(rows) {
  const ordered = [...rows].sort((left, right) => Number(left.score) - Number(right.score) || Number(left.detectedAt) - Number(right.detectedAt));
  if (!ordered.length) return [];
  // Slice by count rather than score predicates: tied scores must still be
  // represented in four equal-count bands instead of being collapsed into Q4.
  return [0, 1, 2, 3].map(index => {
    const start = Math.floor(ordered.length * index / 4);
    const end = Math.floor(ordered.length * (index + 1) / 4);
    const group = ordered.slice(start, end);
    return { label: `Q${index + 1}`, min: finite(group[0]?.score), max: finite(group.at(-1)?.score), rows: group };
  }).filter(band => band.rows.length);
}
function summarizeScoreBands(rows, signalType) {
  const scoped = rows.filter(row => row.signalType === signalType && finite(row.score) !== null);
  const fixed = FIXED_BANDS.map(band => ({ ...band, rows: scoreRows(scoped, band) }));
  const useQuantiles = fixed.some(band => band.rows.length > 0 && band.rows.length < 30);
  const sourceBands = useQuantiles ? quantileBands(scoped) : fixed;
  return {
    signalType, sampleSize: scoped.length, bandMethod: useQuantiles ? 'quantile' : 'fixed',
    bands: sourceBands.map(band => ({ label: band.label, minScore: round(band.min), maxScore: round(band.max), sampleSize: band.rows.length, metrics: metricsByHorizon(band.rows) }))
  };
}

function hasPresentField(rows, reader) { return rows.some(row => reader(row) !== null); }
const FILTER_LIBRARY = [
  { id: 'minimum-liquidity', label: 'Quote volume >= 1,000,000', fields: ['quoteVolume'], read: row => finite(row.quoteVolume), predicate: row => finite(row.quoteVolume) >= 1_000_000 },
  { id: 'relative-volume-range', label: 'Relative volume 1.0–4.0', fields: ['relVol'], read: row => finite(row.relVol), predicate: row => finite(row.relVol) >= 1 && finite(row.relVol) <= 4 },
  { id: 'atr-range', label: 'ATR% 2–15%', fields: ['atrPercent'], read: row => finite(row.atrPercent), predicate: row => finite(row.atrPercent) >= .02 && finite(row.atrPercent) <= .15 },
  { id: 'support-distance', label: 'Entry ≤3% above support', fields: ['entry.price', 'support'], read: row => (finite(row.entry?.price) !== null && finite(row.support) !== null) ? ((row.entry.price / row.support) - 1) * 100 : null, predicate: row => { const distance = FILTER_LIBRARY[3].read(row); return distance !== null && distance <= 3; } },
  { id: 'btc-context', label: 'Constructive BTC context', fields: ['btcContext'], read: row => typeof row.btcContext === 'string' ? row.btcContext : null, predicate: row => row.btcContext === 'constructive' },
  { id: 'one-hour-confirmation', label: '1h confirmation passed', fields: ['confirmation.passed'], read: row => typeof row.confirmation?.passed === 'boolean' ? row.confirmation.passed : null, predicate: row => row.confirmation?.passed === true }
];
function filterEvidence(rows, filter) {
  const present = rows.filter(row => filter.read(row) !== null).length;
  return { id: filter.id, label: filter.label, fields: filter.fields, available: present === rows.length && rows.length > 0, presentCount: present, totalCount: rows.length, status: present === rows.length && rows.length > 0 ? 'available' : 'skipped: missing contextual field' };
}
function improves(candidate, baseline, horizon) {
  const next = candidate[horizon], base = baseline[horizon];
  if (!next || !base || !next.sampleSize || !base.sampleSize) return false;
  const returnImproved = (next.medianReturn !== null && base.medianReturn !== null && next.medianReturn > base.medianReturn) || (next.winRate !== null && base.winRate !== null && next.winRate > base.winRate);
  return returnImproved && next.medianMae !== null && base.medianMae !== null && next.medianMae > base.medianMae;
}
function evaluateExecutionFilter(rows, predicate, { baselineRows = rows } = {}) {
  const selected = rows.filter(predicate);
  const metrics = metricsByHorizon(selected), baseline = metricsByHorizon(baselineRows);
  return { sampleSize: selected.length, metrics, baseline, eligible: improves(metrics, baseline, '7d') && improves(metrics, baseline, '14d') };
}
function splitChronologically(rows, holdoutFraction = .2) {
  const sorted = [...rows].sort((a, b) => Number(a.detectedAt) - Number(b.detectedAt));
  const cut = Math.max(0, Math.floor(sorted.length * (1 - holdoutFraction)));
  return { train: sorted.slice(0, cut), holdout: sorted.slice(cut), cutIndex: cut };
}
function availableFilters(rows) { return FILTER_LIBRARY.filter(filter => filterEvidence(rows, filter).available); }
function combinations(filters) { return [[], ...filters.map(filter => [filter]), ...filters.flatMap((left, index) => filters.slice(index + 1).map(right => [left, right]))]; }
function compareTrainCandidates(left, right) {
  const leftMetrics = left.train.metrics, rightMetrics = right.train.metrics;
  const leftRetention = left.train.baseline['14d'].sampleSize ? left.train.sampleSize / left.train.baseline['14d'].sampleSize : 0;
  const rightRetention = right.train.baseline['14d'].sampleSize ? right.train.sampleSize / right.train.baseline['14d'].sampleSize : 0;
  return Number(right.train.eligible) - Number(left.train.eligible)
    || (rightMetrics['14d'].medianReturn ?? -Infinity) - (leftMetrics['14d'].medianReturn ?? -Infinity)
    || (rightMetrics['7d'].medianReturn ?? -Infinity) - (leftMetrics['7d'].medianReturn ?? -Infinity)
    || rightRetention - leftRetention
    || left.config.minimumScore - right.config.minimumScore
    || left.config.filters.join(',').localeCompare(right.config.filters.join(','));
}
function metricDeltas(candidate, baseline) {
  return Object.fromEntries(['7d', '14d'].map(horizon => [horizon, {
    medianReturn: candidate[horizon].medianReturn === null || baseline[horizon].medianReturn === null ? null : round(candidate[horizon].medianReturn - baseline[horizon].medianReturn),
    winRate: candidate[horizon].winRate === null || baseline[horizon].winRate === null ? null : round(candidate[horizon].winRate - baseline[horizon].winRate),
    medianMae: candidate[horizon].medianMae === null || baseline[horizon].medianMae === null ? null : round(candidate[horizon].medianMae - baseline[horizon].medianMae)
  }]));
}
function hasAbsoluteLongEdge(metrics) {
  return ['7d', '14d'].every(horizon => metrics[horizon].medianReturn !== null
    && metrics[horizon].medianReturn > 0
    && metrics[horizon].winRate !== null
    && metrics[horizon].winRate > .50);
}
function selectBulls3Candidate(rows, { signalType, promotionEligible = true } = {}) {
  const scoped = rows.filter(row => !signalType || row.signalType === signalType).filter(row => finite(row.score) !== null);
  const split = splitChronologically(scoped); const available = availableFilters(split.train);
  const minimumTrainSample = Math.max(100, Math.ceil(split.train.length * .02));
  const candidates = [];
  for (const minimumScore of [0, 40, 60, 70, 80]) for (const filters of combinations(available)) {
    const predicate = row => finite(row.score) >= minimumScore && filters.every(filter => filter.predicate(row));
    const scoreOnlyRows = split.train.filter(row => finite(row.score) >= minimumScore);
    // The primary baseline is the full same-signal population.  Score is part
    // of Bulls3, so comparing only against the score threshold would hide the
    // effect of score selection.  Contextual filters get a separate incremental
    // comparison against that threshold.
    const train = evaluateExecutionFilter(split.train, predicate, { baselineRows: split.train });
    const trainIncremental = filters.length ? evaluateExecutionFilter(split.train, predicate, { baselineRows: scoreOnlyRows }) : null;
    candidates.push({ signalType: signalType || 'combined', config: { minimumScore, filters: filters.map(filter => filter.id) }, train, trainIncremental, meetsTrainSample: train.sampleSize >= minimumTrainSample, trainEligible: train.sampleSize >= minimumTrainSample && train.eligible });
  }
  // The holdout is intentionally untouched until this deterministic train-only
  // ranking has selected exactly one frozen configuration.
  const ranked = candidates.filter(candidate => candidate.trainEligible).sort(compareTrainCandidates);
  const selected = ranked[0] || null;
  let holdout = null;
  let holdoutIncremental = null;
  if (selected) {
    const filters = FILTER_LIBRARY.filter(filter => selected.config.filters.includes(filter.id));
    const predicate = row => finite(row.score) >= selected.config.minimumScore && filters.every(filter => filter.predicate(row));
    holdout = evaluateExecutionFilter(split.holdout, predicate, { baselineRows: split.holdout });
    if (filters.length) holdoutIncremental = evaluateExecutionFilter(split.holdout, predicate, { baselineRows: split.holdout.filter(row => finite(row.score) >= selected.config.minimumScore) });
  }
  const promoted = Boolean(promotionEligible && selected?.trainEligible && holdout && holdout.sampleSize >= 30 && holdout.eligible && hasAbsoluteLongEdge(holdout.metrics));
  const reason = selected ? null : `No train candidate met the required sample size of ${minimumTrainSample} and the full-population 7d/14d quality and loss-control gate.`;
  return { promoted, promotionEligible, candidate: selected && { ...selected, holdout, holdoutDeltas: metricDeltas(holdout.metrics, holdout.baseline), holdoutIncremental, holdoutIncrementalDeltas: holdoutIncremental && metricDeltas(holdoutIncremental.metrics, holdoutIncremental.baseline) }, candidates, evidence: FILTER_LIBRARY.map(filter => filterEvidence(scoped, filter)), split: { train: split.train.length, holdout: split.holdout.length, minimumTrainSample }, reason };
}

function format(value) { return value === null || value === undefined ? '-' : typeof value === 'number' ? value.toFixed(2) : String(value); }
function metricTable(metrics) { return HORIZONS.map(horizon => { const value = metrics[horizon]; return `| ${horizon} | ${value.sampleSize} | ${format(value.meanReturn)} | ${format(value.medianReturn)} | ${value.winRate === null ? '-' : `${(value.winRate * 100).toFixed(1)}%`} | ${format(value.medianMae)} | ${format(value.worstMae)} |`; }).join('\n'); }
function comparisonTable(candidate, baseline, deltas) { return ['| Horizon | Baseline n | Candidate n | Baseline median return % | Candidate median return % | Baseline win rate | Candidate win rate | Delta return % | Delta win rate | Delta median MAE % |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...['7d', '14d'].map(horizon => `| ${horizon} | ${baseline[horizon].sampleSize} | ${candidate[horizon].sampleSize} | ${format(baseline[horizon].medianReturn)} | ${format(candidate[horizon].medianReturn)} | ${baseline[horizon].winRate === null ? '-' : `${(baseline[horizon].winRate * 100).toFixed(1)}%`} | ${candidate[horizon].winRate === null ? '-' : `${(candidate[horizon].winRate * 100).toFixed(1)}%`} | ${format(deltas[horizon].medianReturn)} | ${deltas[horizon].winRate === null ? '-' : `${(deltas[horizon].winRate * 100).toFixed(1)}%`} | ${format(deltas[horizon].medianMae)} |`)].join('\n'); }
function markdownReport({ observations, metadata = {}, failures = [], inputLabel = 'artifact' }) {
  const lines = ['# 1D Bulls2 validation evidence', '', `Source: \`${inputLabel}\``, '', 'Virtual entry: the close of the 1-hour candle ending five hours after first validity. Bulls2 itself is unchanged.', '', '## Run metadata', '', '```json', JSON.stringify({ range: metadata.range || null, counts: metadata.counts || null, universe: metadata.universe?.criteria || null }, null, 2), '```', '', `Failures recorded: ${failures.length}.`, ''];
  for (const type of ['0Day', '1Day']) {
    const summary = summarizeScoreBands(observations, type);
    lines.push(`## ${type} score distribution`, '', `Samples: ${summary.sampleSize}; bands: ${summary.bandMethod}.`, '');
    for (const band of summary.bands) lines.push(`### ${band.label} (${format(band.minScore)}–${format(band.maxScore)}; n=${band.sampleSize})`, '', '| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |', metricTable(band.metrics), '');
    const promotionEligible = metadata.universe?.provenance?.promotionEligible !== false;
    const selected = selectBulls3Candidate(observations, { signalType: type, promotionEligible });
    lines.push('### Execution filter evidence', '', '| Filter | Evidence status | Present / total |', '| --- | --- | ---: |', ...selected.evidence.map(item => `| ${item.label} | ${item.status} | ${item.presentCount} / ${item.totalCount} |`), '', `Holdout split: train ${selected.split.train}, holdout ${selected.split.holdout}; minimum train candidate sample: ${selected.split.minimumTrainSample}.`, '', selected.candidate ? `Frozen train-selected config: score >= ${selected.candidate.config.minimumScore}; ${selected.candidate.config.filters.join(' + ') || 'no contextual filters'}.` : selected.reason, '');
    if (selected.candidate) lines.push('#### Train metrics', '', '| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |', metricTable(selected.candidate.train.metrics), '', '#### Holdout comparison (single frozen config)', '', comparisonTable(selected.candidate.holdout.metrics, selected.candidate.holdout.baseline, selected.candidate.holdoutDeltas), '');
    if (selected.candidate?.holdoutIncremental) lines.push('#### Contextual incremental holdout comparison (against matching score-only baseline)', '', comparisonTable(selected.candidate.holdoutIncremental.metrics, selected.candidate.holdoutIncremental.baseline, selected.candidate.holdoutIncrementalDeltas), '');
    lines.push(`Promotion provenance: ${promotionEligible ? 'eligible' : 'blocked (universe provenance marks promotion ineligible)'}.`, '', 'Absolute long-edge gate: for both 7d and 14d the holdout candidate must have median return > 0 and win rate > 50.0%.', '', `Conclusion: **${selected.promoted ? 'PROMOTE' : 'DO NOT PROMOTE'}**. Promotion requires eligible universe provenance, >=30 holdout observations, absolute long edge, plus 7d and 14d relative return-quality and median-MAE improvements versus the full same-signal population.`, '');
  }
  return `${lines.join('\n')}\n`;
}
async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 2) { if (!['--input', '--report'].includes(argv[i]) || !argv[i + 1]) throw new Error('Usage: node scripts/1d-bulls2-validation-report.cjs --input PATH --report PATH'); out[argv[i].slice(2)] = argv[i + 1]; } if (!out.input || !out.report) throw new Error('Usage: node scripts/1d-bulls2-validation-report.cjs --input PATH --report PATH'); return out; }
async function runReport({ input, report }) { const [observations, metadata, failures] = await Promise.all([readJson(path.join(input, 'observations.json')), readJson(path.join(input, 'metadata.json')), readJson(path.join(input, 'failures.json')).catch(() => [])]); const markdown = markdownReport({ observations, metadata, failures, inputLabel: input }); await fs.mkdir(path.dirname(report), { recursive: true }); await fs.writeFile(report, markdown, 'utf8'); return { markdown, observations: observations.length }; }
if (require.main === module) runReport(parseArgs(process.argv.slice(2))).then(result => console.log(`Wrote report for ${result.observations} observations`)).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { HORIZONS, FILTER_LIBRARY, calculateMetrics, summarizeScoreBands, evaluateExecutionFilter, splitChronologically, selectBulls3Candidate, markdownReport, runReport, parseArgs };

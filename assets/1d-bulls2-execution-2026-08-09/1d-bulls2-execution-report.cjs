const fs = require('node:fs/promises');
const path = require('node:path');

function decidePromotion(metrics = {}) {
  return metrics.tradeCount >= 30
    && metrics.expectancy > 0
    && metrics.profitFactor >= 1.20
    && metrics.medianR > 0
    && metrics.beatsBaseline === true;
}

function passesValidation(metrics = {}) {
  return metrics.tradeCount >= 30 && metrics.expectancy > 0
    && metrics.profitFactor >= 1.15 && metrics.medianR >= 0;
}

function passesAbsoluteHoldout(metrics = {}) {
  return metrics.tradeCount >= 30 && metrics.expectancy > 0
    && metrics.profitFactor >= 1.20 && metrics.medianR > 0;
}

function determineOutcome(validation = {}, holdout = {}) {
  const states = ['0Day', '1Day'].map(type => {
    const validationRow = validation[type];
    if (validationRow?.status !== 'evaluated') return 'inconclusive';
    if (!passesValidation(validationRow.metrics)) return 'rejected';
    const holdoutRow = holdout[type];
    if (holdoutRow?.status !== 'evaluated') return 'inconclusive';
    if (!passesAbsoluteHoldout(holdoutRow.metrics)) return 'rejected';
    if (holdoutRow.metrics?.beatsBaseline === undefined) return 'inconclusive';
    return decidePromotion(holdoutRow.metrics) ? 'promoted' : 'rejected';
  });
  if (states.includes('promoted')) return 'PROMOTE EXECUTION RULE';
  if (states.includes('inconclusive')) return 'INCONCLUSIVE / NOT PROMOTABLE';
  return 'NO ROBUST EXECUTION EDGE';
}

function fixed(value, digits = 3) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : 'N/A';
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

function isoDate(milliseconds) {
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString().slice(0, 10) : 'N/A';
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${columns.join(',')}\n${rows.map(row => columns.map(column => csvEscape(row[column])).join(',')).join('\n')}\n`;
}

function yearlyMetrics(trades) {
  const groups = new Map();
  for (const trade of trades) {
    const year = new Date(trade.entryTime).getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(trade);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([year, rows]) => {
    const total = rows.reduce((sum, row) => sum + row.netR, 0);
    const wins = rows.filter(row => row.netR > 0);
    const losses = rows.filter(row => row.netR < 0);
    const grossProfit = wins.reduce((sum, row) => sum + row.netR, 0);
    const grossLoss = -losses.reduce((sum, row) => sum + row.netR, 0);
    return { year, trades: rows.length, netR: total, expectancy: total / rows.length,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0) };
  });
}

function configText(config) {
  if (!config) return 'None';
  const exit = config.exitFamily === 'fixed' ? `${config.targetR}R fixed target`
    : config.exitFamily === 'time' ? `${config.timeExitDays}-day time exit`
      : `${config.exitFamily} exit`;
  return `${config.entryFamily} entry; ${config.stopFamily} stop; ${exit}; minimum score ${config.minimumScore}; ${config.contextFilter}`;
}

function metricRow(label, status, metrics) {
  if (!metrics) return `| ${label} | ${status} | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |`;
  return `| ${label} | ${status} | ${metrics.tradeCount} | ${fixed(metrics.expectancy)} | ${fixed(metrics.profitFactor)} | ${fixed(metrics.medianR)} | ${percent(metrics.winRate)} | ${fixed(metrics.maxDrawdownR)} | ${metrics.consecutiveLosses} | ${fixed(metrics.totalCostsR)} |`;
}

function buildReport({ selected, validation, holdout, grid, ledger, failures = [], generatedAt = new Date().toISOString() }) {
  const types = ['0Day', '1Day'];
  const outcome = determineOutcome(validation, holdout);
  const failedValidation = types.filter(type => validation[type]?.status === 'evaluated'
    && !passesValidation(validation[type]?.metrics));
  const sealedHoldout = types.filter(type => holdout[type]?.status !== 'evaluated');
  const promotedTypes = types.filter(type => holdout[type]?.status === 'evaluated'
    && decidePromotion(holdout[type]?.metrics));
  const narrative = outcome === 'NO ROBUST EXECUTION EDGE'
    ? `${failedValidation.length ? `${failedValidation.join(' and ')} failed the frozen validation gate.` : 'At least one frozen candidate failed an out-of-sample gate.'} ${sealedHoldout.length ? `The holdout therefore remained sealed for ${sealedHoldout.join(' and ')}.` : ''} No candidate was promotable. Development results are hypothesis-selection results, not deployable evidence. Bulls2 should remain a candidate/watch-only scanner; do not use these rules for live automated entry.`
    : outcome === 'INCONCLUSIVE / NOT PROMOTABLE'
      ? 'The available stages do not support promotion. A candidate that passes holdout absolute metrics still cannot be promoted without an explicit, reproducible comparison against the original five-hour market-entry baseline. Missing baseline evidence is not treated as success.'
      : 'At least one frozen candidate passed validation, holdout absolute gates, and an explicit comparison against the original five-hour market-entry baseline.';
  const methodologyDecision = outcome === 'PROMOTE EXECUTION RULE'
    ? `Selection used development only, then frozen evaluation on validation and holdout. Promoted signal types: ${promotedTypes.join(', ')}.`
    : outcome === 'INCONCLUSIVE / NOT PROMOTABLE'
      ? 'Selection used development only and candidates remained frozen afterward. Available evidence was insufficient for promotion, including the required explicit baseline comparison.'
      : `Selection used development only. ${failedValidation.length ? `Validation failure for ${failedValidation.join(', ')} stopped those pipelines before holdout.` : 'At least one frozen out-of-sample gate failed.'}`;
  const practicalLines = outcome === 'PROMOTE EXECUTION RULE'
    ? [`- Only the explicitly promoted signal types (${promotedTypes.join(', ')}) are eligible for a separately controlled execution trial.`,
      '- Promotion is research evidence, not a guarantee; use conservative sizing and live forward validation before scaling.',
      '- Do not transfer the result to untested signal types, symbols, venues, or execution assumptions.']
    : outcome === 'INCONCLUSIVE / NOT PROMOTABLE'
      ? ['- Treat a Bulls2 hit as a research/watchlist candidate, not a buy signal.',
        '- Do not deploy an execution rule until the missing evidence, especially the registered baseline comparison, is computed without retuning.',
        '- Preserve any unevaluated holdout and register a materially new hypothesis before further testing.']
      : ['- Treat a Bulls2 hit as a research/watchlist candidate, not a buy signal.',
        `- Do not deploy the rejected execution rules live${failedValidation.length ? `; validation failed for ${failedValidation.join(' and ')}` : ''}.`,
        '- If further research is performed, register a materially new hypothesis first and preserve the untouched holdout. Do not tune against validation losses and call the result confirmed.'];
  const outcomeLimitations = outcome === 'PROMOTE EXECUTION RULE'
    ? ['- Passing historical gates does not guarantee future profitability; regime changes and multiple-testing risk remain.',
      '- Baseline improvement applies only to the recorded comparison and assumptions.']
    : outcome === 'INCONCLUSIVE / NOT PROMOTABLE'
      ? ['- Missing evidence prevents a profitability conclusion; absence of rejection is not evidence of an edge.',
        `- ${sealedHoldout.length ? `Holdout remained sealed for ${sealedHoldout.join(' and ')}.` : 'Absolute holdout results cannot substitute for the missing baseline comparison.'}`]
      : ['- The broad configuration search creates selection risk; positive development metrics followed by failed validation are consistent with overfitting.',
        `- No claim of profitability is made${sealedHoldout.length ? `, and the sealed holdout for ${sealedHoldout.join(' and ')} supplies no performance estimate` : ''}.`];
  const lines = [
    '# 1D Bulls2 execution validation', '',
    `Generated: ${generatedAt}`, '',
    `## Conclusion: ${outcome}`, '', narrative, '',
    '## Stage results', '',
    '| Signal | Stage | Trades | Expectancy (R) | Profit factor | Median (R) | Win rate | Maximum drawdown (R) | Consecutive losses | Fees and slippage (R) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const type of types) {
    lines.push(metricRow(type, 'development (selected)', selected[type]?.metrics ? selected[type].metrics : null));
    lines.push(metricRow(type, `validation: ${validation[type]?.status || 'missing'}`, validation[type]?.metrics));
    lines.push(metricRow(type, `holdout: ${holdout[type]?.status || 'missing'}`, holdout[type]?.metrics));
  }
  lines.push('', '## Frozen development selections', '');
  for (const type of types) {
    const item = selected[type];
    lines.push(`- **${type}:** \`${item?.id || 'none'}\` - ${configText(item?.config)}. Eligible signals ${item?.metrics?.eligibleSignals ?? 'N/A'}, fill rate ${percent(item?.metrics?.fillRate)}.`);
  }
  lines.push('', '## Decision evidence', '',
    `- 0Day validation: ${validation['0Day']?.metrics?.tradeCount ?? 0} trades, ${fixed(validation['0Day']?.metrics?.expectancy)} R expectancy, ${fixed(validation['0Day']?.metrics?.profitFactor)} profit factor, and ${fixed(validation['0Day']?.metrics?.medianR)} R median.`,
    `- 1Day validation: ${validation['1Day']?.metrics?.tradeCount ?? 0} trades, ${fixed(validation['1Day']?.metrics?.expectancy)} R expectancy, ${fixed(validation['1Day']?.metrics?.profitFactor)} profit factor, and ${fixed(validation['1Day']?.metrics?.medianR)} R median.`,
    `- Required validation gate: at least 30 trades, positive expectancy, profit factor at least 1.15, and non-negative median R. Failed in this run: ${failedValidation.length ? failedValidation.join(', ') : 'none'}.`,
    '- Required final promotion gate: at least 30 holdout trades, positive expectancy, profit factor at least 1.20, positive median R, and documented improvement over the baseline. The runner does not calculate that baseline comparison, so a future absolute holdout pass alone would remain INCONCLUSIVE / NOT PROMOTABLE.', '',
    '## By calendar year', '',
    'These figures describe only trades actually exposed during development selection and validation; they do not repair the failed out-of-sample result.', '',
    '| Signal | Stage | Year | Trades | Net R | Expectancy (R) | Profit factor |',
    '|---|---|---:|---:|---:|---:|---:|');
  let yearlyRowCount = 0;
  for (const type of types) for (const stage of ['development', 'validation', 'holdout']) {
    const rows = yearlyMetrics(ledger.filter(item => item.signalType === type && item.stage === stage));
    yearlyRowCount += rows.length;
    for (const row of rows) lines.push(`| ${type} | ${stage} | ${row.year} | ${row.trades} | ${fixed(row.netR)} | ${fixed(row.expectancy)} | ${fixed(row.profitFactor)} |`);
  }
  if (!yearlyRowCount) lines.push('| N/A | N/A | N/A | 0 | N/A | N/A | N/A |');
  lines.push('', '## Methodology', '',
    `- Universe/data: unchanged Bulls2 Futures validation set, 2022-07-01 through 2026-06-30 UTC; ${failures.length} archive enrichment failures were recorded.`,
    `- Search: ${grid['0Day']?.results?.length ?? 'N/A'} configurations for 0Day and ${grid['1Day']?.results?.length ?? 'N/A'} for 1Day. Signals were split chronologically 60% development, 20% validation, and 20% sealed holdout without splitting identical detection timestamps.`,
    `- Exact split counts: 0Day ${grid['0Day']?.splitCounts?.development ?? 'N/A'} / ${grid['0Day']?.splitCounts?.validation ?? 'N/A'} / ${grid['0Day']?.splitCounts?.holdout ?? 'N/A'}; 1Day ${grid['1Day']?.splitCounts?.development ?? 'N/A'} / ${grid['1Day']?.splitCounts?.validation ?? 'N/A'} / ${grid['1Day']?.splitCounts?.holdout ?? 'N/A'} (development / validation / holdout).`,
    '- Entry search began five hours after signal validity and expired after 72 hours. Tested breakout, support-retest, and support-limit entries; support, sweep-low, and ATR stops; fixed, split, and time exits.',
    '- Costs: taker fee 0.05% plus 0.05% adverse slippage per market fill; support-limit entry used 0.02% maker fee and no entry slippage. Stops won same-candle stop/target ambiguity.',
    `- ${methodologyDecision}`, '',
    '## Practical use', '', ...practicalLines, '',
    '## Limitations', '',
    '- This is candle-level simulation, not tick/order-book execution. Intrabar ordering is unknown and was handled conservatively.',
    '- Survivorship, exchange listing history, gaps in public archives, latency, partial fills, market impact, funding, and borrowing constraints may differ from live trading.',
    ...outcomeLimitations, '',
    '## Reproduce', '', '```powershell',
    'node --test scripts/1d-bulls2-execution-core.test.cjs scripts/1d-bulls2-execution-runner.test.cjs scripts/1d-bulls2-execution-report.test.cjs',
    'node scripts/1d-bulls2-execution-runner.cjs --input research/1d-bulls2/20220701-20260630-futures --out research/1d-bulls2/execution-20220701-20260630',
    'node scripts/1d-bulls2-execution-report.cjs --input research/1d-bulls2/execution-20220701-20260630 --report docs/research/1d-bulls2-profitable-execution.md',
    '```', ''
  );
  return `${lines.join('\n')}\n`;
}

async function loadJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }

async function runCli({ input, report }) {
  const [selected, validation, holdout, grid, ledger, failures] = await Promise.all([
    loadJson(path.join(input, 'selected-development.json')),
    loadJson(path.join(input, 'validation-result.json')),
    loadJson(path.join(input, 'holdout-result.json')),
    loadJson(path.join(input, 'execution-grid.json')),
    loadJson(path.join(input, 'trade-ledger.json')),
    loadJson(path.join(input, 'enrichment-failures.json'))
  ]);
  const finalText = buildReport({ selected, validation, holdout, grid, ledger, failures });
  await fs.mkdir(path.dirname(report), { recursive: true });
  const stageRows = [];
  for (const type of ['0Day', '1Day']) for (const [stage, value] of Object.entries({ development: { status: 'selected', metrics: selected[type]?.metrics }, validation: validation[type], holdout: holdout[type] }))
    stageRows.push({ signalType: type, stage, status: value?.status || 'none', ...(value?.metrics || {}) });
  await Promise.all([
    fs.writeFile(report, finalText, 'utf8'),
    fs.writeFile(path.join(input, 'selected-configuration.json'), `${JSON.stringify(selected, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(input, 'stage-metrics.csv'), toCsv(stageRows, ['signalType','stage','status','tradeCount','expectancy','profitFactor','medianR','winRate','maxDrawdownR','consecutiveLosses','totalCostsR','eligibleSignals','fillRate']), 'utf8'),
    fs.writeFile(path.join(input, 'trade-ledger.csv'), toCsv(ledger, Object.keys(ledger[0] || {})), 'utf8')
  ]);
  return { conclusion: determineOutcome(validation, holdout), report };
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!['--input', '--report'].includes(key) || !value) throw new Error('Usage: node scripts/1d-bulls2-execution-report.cjs --input PATH --report PATH');
    result[key.slice(2)] = value;
  }
  if (!result.input || !result.report) throw new Error('Usage: node scripts/1d-bulls2-execution-report.cjs --input PATH --report PATH');
  return result;
}

if (require.main === module) runCli(parseArgs(process.argv.slice(2)))
  .then(result => console.log(`${result.conclusion}: ${result.report}`))
  .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { decidePromotion, passesValidation, passesAbsoluteHoldout, determineOutcome,
  yearlyMetrics, toCsv, buildReport, runCli, parseArgs };

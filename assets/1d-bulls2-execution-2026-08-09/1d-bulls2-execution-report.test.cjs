const test = require('node:test');
const assert = require('node:assert/strict');
const { decidePromotion, determineOutcome, yearlyMetrics, buildReport, parseArgs } = require('./1d-bulls2-execution-report.cjs');

test('does not promote a holdout below the absolute execution gates', () => {
  assert.equal(decidePromotion({ tradeCount: 40, expectancy: 0.1, profitFactor: 1.19, medianR: 0.05, beatsBaseline: true }), false);
  assert.equal(decidePromotion({ tradeCount: 40, expectancy: 0.1, profitFactor: 1.2, medianR: 0.05, beatsBaseline: false }), false);
  assert.equal(decidePromotion({ tradeCount: 40, expectancy: 0.1, profitFactor: 1.2, medianR: 0.05, beatsBaseline: true }), true);
});

test('promotes only when validation, holdout and explicit baseline comparison all pass', () => {
  const validation = { tradeCount: 40, expectancy: 0.1, profitFactor: 1.2, medianR: 0.05 };
  const holdout = { ...validation, beatsBaseline: true };
  assert.equal(determineOutcome(
    { '0Day': { status: 'evaluated', metrics: validation }, '1Day': { status: 'evaluated', metrics: { ...validation, expectancy: -0.1 } } },
    { '0Day': { status: 'evaluated', metrics: holdout }, '1Day': { status: 'not-evaluated', metrics: null } }
  ), 'PROMOTE EXECUTION RULE');
});

test('absolute holdout success without baseline evidence is inconclusive', () => {
  const passing = { tradeCount: 40, expectancy: 0.1, profitFactor: 1.2, medianR: 0.05 };
  assert.equal(determineOutcome(
    { '0Day': { status: 'evaluated', metrics: passing }, '1Day': { status: 'evaluated', metrics: { ...passing, expectancy: -0.1 } } },
    { '0Day': { status: 'evaluated', metrics: passing }, '1Day': { status: 'not-evaluated', metrics: null } }
  ), 'INCONCLUSIVE / NOT PROMOTABLE');
});

test('calculates calendar-year results in UTC', () => {
  const rows = yearlyMetrics([
    { entryTime: Date.UTC(2024, 0, 1), netR: 2 }, { entryTime: Date.UTC(2024, 1, 1), netR: -1 },
    { entryTime: Date.UTC(2025, 0, 1), netR: 1 }
  ]);
  assert.deepEqual(rows.map(row => [row.year, row.trades, row.netR]), [[2024, 2, 1], [2025, 1, 1]]);
  assert.equal(rows[0].profitFactor, 2);
});

test('reports rejection, drawdown, losing streak, costs, yearly stability, and practical restraint', () => {
  const metrics = { tradeCount: 50, expectancy: -0.2, profitFactor: 0.7, medianR: -1, winRate: 0.3,
    maxDrawdownR: 12, consecutiveLosses: 8, totalCostsR: 2, eligibleSignals: 100, fillRate: 0.5 };
  const report = buildReport({
    selected: { '0Day': { id: 'x', config: { entryFamily:'breakout', stopFamily:'support', exitFamily:'fixed', targetR:1.5, minimumScore:0, contextFilter:'none' }, metrics }, '1Day': null },
    validation: { '0Day': { status:'evaluated', metrics }, '1Day': { status:'evaluated', metrics } },
    holdout: { '0Day': { status:'not-evaluated', metrics:null }, '1Day': { status:'not-evaluated', metrics:null } },
    grid: { '0Day': { results: Array(3) }, '1Day': { results: Array(3) } }, ledger: [], failures: []
  });
  assert.match(report, /NO ROBUST EXECUTION EDGE/);
  assert.match(report, /Maximum drawdown/);
  assert.match(report, /Consecutive losses/);
  assert.match(report, /Fees and slippage/);
  assert.match(report, /By calendar year/);
  assert.match(report, /candidate\/watch-only/);
  assert.match(report, /holdout therefore remained sealed/);
});

test('positive report fixture contains promotion guidance without rejection or sealed-holdout claims', () => {
  const metrics = { tradeCount: 50, expectancy: 0.2, profitFactor: 1.4, medianR: 0.1, winRate: 0.55,
    maxDrawdownR: 4, consecutiveLosses: 3, totalCostsR: 1, eligibleSignals: 100, fillRate: 0.5 };
  const selectedRow = { id: 'positive', config: { entryFamily:'breakout', stopFamily:'support', exitFamily:'fixed', targetR:2, minimumScore:60, contextFilter:'none' }, metrics };
  const report = buildReport({
    selected: { '0Day': selectedRow, '1Day': selectedRow },
    validation: { '0Day': { status:'evaluated', metrics }, '1Day': { status:'evaluated', metrics } },
    holdout: {
      '0Day': { status:'evaluated', metrics: { ...metrics, beatsBaseline:true } },
      '1Day': { status:'evaluated', metrics: { ...metrics, beatsBaseline:true } }
    },
    grid: { '0Day': { results: [], splitCounts:{} }, '1Day': { results: [], splitCounts:{} } },
    ledger: [], failures: []
  });
  assert.match(report, /Conclusion: PROMOTE EXECUTION RULE/);
  assert.match(report, /eligible for a separately controlled execution trial/);
  assert.doesNotMatch(report, /failed the frozen|remained sealed|Do not deploy the rejected|No claim of profitability/i);
});

test('requires both CLI paths', () => {
  assert.deepEqual(parseArgs(['--input', 'a', '--report', 'b']), { input:'a', report:'b' });
  assert.throws(() => parseArgs(['--input', 'a']), /Usage/);
});

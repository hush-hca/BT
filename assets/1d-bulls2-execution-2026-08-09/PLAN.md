# 1D Bulls2 Profitable Execution Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Determine whether unchanged 1D Bulls2 signals can become a profitable long strategy through hourly confirmation, explicit stops, and mechanical exits.

**Architecture:** Add a research-only execution simulator that consumes the existing 24,335-signal Futures validation artifact and official Binance USD-M hourly archives. Keep signal generation frozen, simulate a finite configuration grid without lookahead, select on development, confirm on validation, and evaluate one frozen rule once on final holdout. Publish the verified evidence to Catching Cat and BT only; do not alter the product scanner.

**Tech Stack:** Node.js CommonJS, `node:test`, existing Binance archive reader, JSON/CSV artifacts, Markdown reports.

## Global Constraints

- Do not modify production 1D Bulls2 behavior or create Bulls3.
- Analyze 0Day and 1Day independently.
- Start entry search five hours after first signal validity and cancel after 72 hours.
- Use 2022-07-01 through 2026-06-30 UTC and the existing 184-symbol Futures archive universe.
- Split chronologically into development 60%, validation 20%, final holdout 20%.
- Select configurations without reading validation or holdout performance.
- Model market orders with 0.05% fee and 0.05% adverse slippage per fill; model support-limit entry with 0.02% maker fee and no entry slippage. Stops, targets, and time exits use taker cost.
- When stop and target touch in the same 1-hour candle, record the stop first.
- Require development >=100 trades, validation >=30 trades, and holdout >=30 trades.
- Final promotion requires net expectancy >0, profit factor >=1.20, median R >0, and improvement over the original five-hour market-entry baseline.

---

### Task 1: Implement deterministic entry and trade simulation

**Files:**
- Create: `scripts/1d-bulls2-execution-core.cjs`
- Create: `scripts/1d-bulls2-execution-core.test.cjs`

**Interfaces:**
- Consumes: signal `{ detectedAt, candleTime, support, score, relVol, signalType }` and normalized hourly/daily candles.
- Produces: `findEntry(input)`, `buildInitialStop(input)`, `simulateTrade(input)`, and `calculateTradeMetrics(trades)`.
- `findEntry` returns `null` or `{ time, price, family, reference }`.
- `simulateTrade` returns a ledger row with entry, stop, target, exit reason, gross R, costs R, and net R.

- [ ] **Step 1: Write failing entry-family tests**

```js
test('breakout waits five hours and enters only after a later hourly close exceeds the fixed confirmation high', () => {
  const entry = findEntry({ signal, hourlyCandles: breakoutFixture(), config: { entryFamily: 'breakout' } });
  assert.deepEqual(entry, { time: hour(8), price: 105.0525, family: 'breakout', reference: 105 });
});

test('retest requires support proximity, a bullish candle, and an upper-35-percent close', () => {
  assert.equal(findEntry({ signal, hourlyCandles: weakRetestFixture(), config: { entryFamily: 'retest' } }), null);
  assert.equal(findEntry({ signal, hourlyCandles: validRetestFixture(), config: { entryFamily: 'retest' } }).family, 'retest');
});

test('limit fills only after the delay and inside the 72-hour window', () => {
  assert.equal(findEntry({ signal, hourlyCandles: lateLimitFixture(), config: { entryFamily: 'limit', limitOffset: 0.005 } }), null);
});
```

- [ ] **Step 2: Verify tests fail**

Run: `node --test scripts/1d-bulls2-execution-core.test.cjs`

Expected: FAIL because `findEntry` does not exist.

- [ ] **Step 3: Implement exact entry rules**

```js
const EXECUTION = Object.freeze({ delayHours: 5, expiryHours: 72, marketFee: 0.0005, marketSlippage: 0.0005, makerFee: 0.0002 });

function findEntry({ signal, hourlyCandles, config }) {
  // Breakout reference: maximum high of the five closed hourly candles from detection to delay.
  // Retest zone: support * 0.995 through support * 1.015; bullish upper-35% close above support.
  // Limit: support * (1 + 0.005 or 0.01), filled when later low <= level <= high.
}
```

- [ ] **Step 4: Write failing stop and same-candle tests**

```js
test('builds support, sweep-low, and daily-ATR stops below entry', () => {
  assert.equal(buildInitialStop({ entryPrice: 105, support: 100, signalLow: 99, dailyAtr: 4, stopFamily: 'support' }), 99.5);
});

test('uses the stop when stop and target are both touched in one candle', () => {
  assert.equal(simulateTrade(sameCandleFixture()).exitReason, 'stop');
});
```

- [ ] **Step 5: Implement stops, targets, split exit, costs, and metrics**

```js
function simulateTrade({ signal, entry, hourlyCandles, config, signalLow, dailyAtr }) {
  // Derive initial R from entry minus stop; reject non-positive risk.
  // Simulate 1.5R/2R/3R, half-at-1R then breakeven/2R, and 7d/14d time exits.
  // Apply conservative intrabar order and explicit fee/slippage deductions.
}
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test scripts/1d-bulls2-execution-core.test.cjs`

Expected: PASS.

```bash
git add scripts/1d-bulls2-execution-core.cjs scripts/1d-bulls2-execution-core.test.cjs
git commit -m "feat: add Bulls2 execution simulator"
```

### Task 2: Run the finite configuration grid without lookahead

**Files:**
- Create: `scripts/1d-bulls2-execution-runner.cjs`
- Create: `scripts/1d-bulls2-execution-runner.test.cjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing validation `observations.json`, `universe.json`, Binance archive helpers, and Task 1 simulator.
- Produces: `execution-grid.json`, `selected-development.json`, `validation-result.json`, `holdout-result.json`, and `trade-ledger.json`.
- CLI: `node scripts/1d-bulls2-execution-runner.cjs --input PATH --out PATH`.

- [ ] **Step 1: Write failing split and grid tests**

```js
test('splits each signal type chronologically 60-20-20', () => {
  const split = splitThreeWays(oneHundredSignals());
  assert.deepEqual([split.development.length, split.validation.length, split.holdout.length], [60, 20, 20]);
});

test('grid contains only declared entry, stop, exit, score, and filter variants', () => {
  const grid = buildConfigurationGrid();
  assert.ok(grid.some(config => config.entryFamily === 'breakout' && config.stopFamily === 'support' && config.targetR === 2));
  assert.ok(grid.every(config => [0, 60, 70, 80].includes(config.minimumScore)));
});
```

- [ ] **Step 2: Verify tests fail**

Run: `node --test scripts/1d-bulls2-execution-runner.test.cjs`

Expected: FAIL because runner functions are not defined.

- [ ] **Step 3: Implement archive loading and signal enrichment**

```js
async function enrichSignals({ observations, universe, start, end }) {
  // Download each symbol's 1h archive once, aggregate daily candles, and attach signalLow and ATR14 by candleTime.
  // Cache candles by symbol for all grid simulations.
}
```

- [ ] **Step 4: Implement development-only selection**

```js
function selectDevelopmentCandidate(results) {
  return results
    .filter(row => row.metrics.tradeCount >= 100 && row.metrics.expectancy > 0 && row.metrics.profitFactor >= 1.15 && row.metrics.medianR >= 0)
    .sort((a, b) => b.metrics.expectancy - a.metrics.expectancy || b.metrics.profitFactor - a.metrics.profitFactor || a.metrics.maxDrawdownR - b.metrics.maxDrawdownR)[0] || null;
}
```

- [ ] **Step 5: Freeze through validation and final holdout**

Evaluate only the development-selected configuration on validation. Proceed to holdout only when validation has at least 30 trades, positive expectancy, profit factor >=1.15, and median R >=0. Evaluate the same unchanged configuration once on holdout.

- [ ] **Step 6: Run runner tests and full backtest**

Run: `node --test scripts/1d-bulls2-execution-runner.test.cjs`

Expected: PASS.

Run: `node scripts/1d-bulls2-execution-runner.cjs --input research/1d-bulls2/20220701-20260630-futures --out research/1d-bulls2/execution-20220701-20260630`

Expected: artifacts for both signal types with immutable development, validation, and holdout stages.

- [ ] **Step 7: Commit**

```bash
git add scripts/1d-bulls2-execution-runner.cjs scripts/1d-bulls2-execution-runner.test.cjs .gitignore
git commit -m "feat: backtest Bulls2 execution rules"
```

### Task 3: Generate the execution research report and publish to BT

**Files:**
- Create: `scripts/1d-bulls2-execution-report.cjs`
- Create: `scripts/1d-bulls2-execution-report.test.cjs`
- Create: `docs/research/1d-bulls2-profitable-execution.md`
- Modify: `README.md`
- Create in BT: `assets/1d-bulls2-execution-2026-08-09/`

**Interfaces:**
- Consumes Task 2 artifacts.
- Produces a report, selected configuration JSON, stage metrics CSV, and trade ledger CSV.

- [ ] **Step 1: Write failing promotion-report tests**

```js
test('does not promote a holdout below the absolute execution gates', () => {
  assert.equal(decidePromotion({ tradeCount: 40, expectancy: 0.1, profitFactor: 1.19, medianR: 0.05 }), false);
});

test('reports drawdown, losing streak, costs, and yearly stability', () => {
  const report = buildReport(reportFixture());
  assert.match(report, /Maximum drawdown/);
  assert.match(report, /Consecutive losses/);
  assert.match(report, /Fees and slippage/);
  assert.match(report, /By calendar year/);
});
```

- [ ] **Step 2: Implement report and promotion decision**

```js
function decidePromotion(metrics) {
  return metrics.tradeCount >= 30 && metrics.expectancy > 0 && metrics.profitFactor >= 1.20 && metrics.medianR > 0 && metrics.beatsBaseline === true;
}
```

- [ ] **Step 3: Run all tests and generate report**

Run: `node --test scripts/1d-bulls2-execution-core.test.cjs scripts/1d-bulls2-execution-runner.test.cjs scripts/1d-bulls2-execution-report.test.cjs`

Expected: PASS.

Run: `node scripts/1d-bulls2-execution-report.cjs --input research/1d-bulls2/execution-20220701-20260630 --report docs/research/1d-bulls2-profitable-execution.md`

Expected: conclusion is `PROMOTE EXECUTION RULE` or `NO ROBUST EXECUTION EDGE`, backed by stage metrics.

- [ ] **Step 4: Copy the verified research package to BT**

Include report, configuration grid summary, selected configuration, validation/holdout metrics, trade ledger, source scripts, tests, and reproduction README. Exclude downloaded raw Binance archives.

- [ ] **Step 5: Commit and push both repositories**

```bash
git add README.md scripts/1d-bulls2-execution-*.cjs docs/research/1d-bulls2-profitable-execution.md
git commit -m "Research profitable Bulls2 execution rules"
git push origin main
```

Commit the BT package separately with `git commit -m "Add Bulls2 execution backtest"` and push `main`.

## Plan self-review

- Task 1 covers all three entry families, three stop families, fixed/split/time exits, costs, and conservative same-candle ordering.
- Task 2 enforces the finite grid, 60/20/20 chronology, minimum samples, and frozen one-time validation/holdout evaluation.
- Task 3 covers requested trading metrics, absolute profitability gates, reproducibility, and BT publication.
- Interfaces consistently use signal, entry, configuration, ledger row, and metrics objects without changing Bulls2.

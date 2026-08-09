# 1D Bulls2 Six-Hour Intraday Backtest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Test exactly ten preregistered 0Day Bulls2 intraday strategies with entry delayed five hours and every trade closed within six hours.

**Architecture:** Build a research-only six-hour simulator on top of the existing frozen Bulls2 observation artifacts and official Binance USD-M archive loader. Separate candle/indicator computation, deterministic trade simulation, staged evaluation, and reporting so each layer can be tested without modifying production Bulls2 behavior.

**Tech Stack:** Node.js CommonJS, `node:test`, existing Binance archive ZIP reader, JSON/CSV, Markdown.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-09-1d-bulls2-six-hour-intraday-design.md` exactly.
- Test 0Day only and reject every signal with score below 40.
- Begin entry search five hours after confirmation; expire entry search six hours later.
- Close every filled trade no later than six hours after entry.
- Evaluate exactly ten configurations; do not add a parameter grid.
- Use official Binance USD-M Futures 1H candles and the frozen Bulls2 liquidity universe.
- Preserve identical detection timestamps within chronological 60/20/20 partitions.
- Use only completed candles and conservative stop-first intrabar ordering.
- Do not modify `app.js`, the Bulls2 scanner, or prior validation artifacts.
- Preserve the existing uncommitted change to `docs/research/1d-bulls2-profitable-execution.md` unless it is explicitly identified as part of this task.

---

### Task 1: Implement the six-hour indicator and execution core

**Files:**
- Create: `scripts/1d-bulls2-six-hour-core.cjs`
- Create: `scripts/1d-bulls2-six-hour-core.test.cjs`

**Interfaces:**
- Consumes: normalized hourly candles `{ time, open, high, low, close, volume, quoteVolume }`, a frozen 0Day signal, BTC candles, and one combination definition.
- Produces: `buildIndicatorIndex(hourly, btcHourly)`, `findIntradayEntry(input)`, `simulateSixHourTrade(input)`, and `calculateMetrics(trades)`.
- `findIntradayEntry` returns `null` or `{ time, price, candle, atr14, sessionVwap, reason }`.
- `simulateSixHourTrade` returns an auditable ledger row including gross R, fee R, slippage R, net R, and holding hours.

- [ ] **Step 1: Write failing no-lookahead indicator tests**

```js
test('indicator index excludes the active candle from historical volume and slope references', () => {
  const index = buildIndicatorIndex(hourlyFixture(), btcFixture());
  const point = index.get(hour(205));
  assert.equal(point.volumeMedian20, median(hours(185, 204).map((item) => item.volume)));
  assert.equal(point.coinSma200, mean(hours(5, 204).map((item) => item.close)));
});

test('session VWAP resets at 00:00 UTC and uses completed candles only', () => {
  const point = buildIndicatorIndex(utcBoundaryFixture(), btcFixture()).get(hourAfterUtcBoundary());
  assert.equal(point.sessionVwap, expectedCurrentSessionVwap());
});
```

- [ ] **Step 2: Run the new core test and confirm it fails**

Run: `node --test scripts/1d-bulls2-six-hour-core.test.cjs`

Expected: FAIL because the module and exports do not exist.

- [ ] **Step 3: Implement indexed completed-candle indicators**

```js
const SIX_HOUR = Object.freeze({
  delayHours: 5,
  entryWindowHours: 6,
  maxHoldHours: 6,
  takerFee: 0.0005,
  adverseSlippage: 0.0005,
});

function buildIndicatorIndex(hourly, btcHourly) {
  // Sort once, align BTC by open timestamp, and precompute ATR14, median20,
  // UTC session VWAP, SMA200/current-minus-12h slope, and ratio SMA20 slope.
}
```

- [ ] **Step 4: Write failing entry-rule tests for all distinct trigger families**

```js
test('immediate entry uses the first close at detectedAt plus five hours', () => {
  assert.equal(findIntradayEntry(immediateFixture()).time, detectedAt + 5 * HOUR);
});

test('bullish confirmation enforces body and upper-close requirements', () => {
  assert.equal(findIntradayEntry(weakBullishFixture()), null);
  assert.equal(findIntradayEntry(validBullishFixture()).reason, 'bullish-confirmation');
});

test('retest, breakout, VWAP, and relative-strength entries expire after six hours', () => {
  for (const fixture of triggerFamilyFixtures()) assert.equal(findIntradayEntry(fixture.late), null);
});
```

- [ ] **Step 5: Implement the five entry families and exact filters**

```js
function findIntradayEntry({ signal, hourly, btcHourly, indicators, combination }) {
  // Apply score/RelVol/support/trend/relative-strength filters at their specified timestamps.
  // Search only [detectedAt+5h, detectedAt+11h] completed closes.
  // Freeze first-five-hour high before evaluating breakout candles.
}
```

- [ ] **Step 6: Write failing six-hour exit, cost, and overlap tests**

```js
test('time exit occurs at the sixth completed hourly close after entry', () => {
  const trade = simulateSixHourTrade(timeExitFixture());
  assert.equal(trade.holdingHours, 6);
  assert.equal(trade.exitReason, 'time-6h');
});

test('stop wins when stop and target share an hourly candle', () => {
  assert.equal(simulateSixHourTrade(ambiguousFixture()).exitReason, 'stop');
});

test('market fee and adverse slippage are each charged once per fill', () => {
  const trade = simulateSixHourTrade(costFixture());
  assert.equal(trade.fills, 2);
  assert.ok(trade.feeR > 0 && trade.slippageR > 0);
});
```

- [ ] **Step 7: Implement stops, fixed/split exits, six-hour deadline, and metrics**

```js
function simulateSixHourTrade({ signal, entry, hourly, combination }) {
  // Reject stop >= entry; process six post-entry closes; apply stop before targets;
  // execute fixed or split exits; charge costs exactly once per fill.
}

function calculateMetrics(trades) {
  return { tradeCount, expectancy, profitFactor, medianR, winRate,
    maxDrawdownR, consecutiveLosses, meanHoldingHours, medianHoldingHours,
    feeR, slippageR };
}
```

- [ ] **Step 8: Run core tests and commit**

Run: `node --test scripts/1d-bulls2-six-hour-core.test.cjs`

Expected: PASS.

Commit:

```powershell
git add scripts/1d-bulls2-six-hour-core.cjs scripts/1d-bulls2-six-hour-core.test.cjs
git commit -m "feat: add Bulls2 six-hour simulator"
```

---

### Task 2: Implement the fixed ten-combination runner

**Files:**
- Create: `scripts/1d-bulls2-six-hour-runner.cjs`
- Create: `scripts/1d-bulls2-six-hour-runner.test.cjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: the prior Futures validation artifact directory and the existing `fetchArchiveHourlyKlines` loader.
- Produces: `COMBINATIONS`, `splitTimestampGroups(signals)`, `evaluateCombination(input)`, `runSixHourBacktest(input)`, and CLI artifacts.
- Calls Task 1 exports without duplicating indicator or execution logic.

- [ ] **Step 1: Write a failing exact-combination test**

```js
test('declares exactly the ten preregistered combinations', () => {
  assert.equal(COMBINATIONS.length, 10);
  assert.equal(new Set(COMBINATIONS.map((item) => item.id)).size, 10);
  assert.ok(COMBINATIONS.every((item) => item.minimumScore >= 40));
  assert.deepEqual(COMBINATIONS.map((item) => item.id), [
    'c01-score40-immediate', 'c02-score60-immediate', 'c03-score80-immediate',
    'c04-score40-relvol-confirm', 'c05-score60-relvol-confirm',
    'c06-score80-relvol-confirm', 'c07-score40-support-retest',
    'c08-score60-support-breakout', 'c09-score60-btc-vwap',
    'c10-score80-rs-volume-breakout',
  ]);
});
```

- [ ] **Step 2: Write failing signal-isolation and partition tests**

```js
test('runner retains 0Day score-40-plus signals only', () => {
  assert.deepEqual(filterStudySignals(fixtureSignals()).map((x) => x.id), ['0d-40', '0d-80']);
});

test('identical detectedAt groups never cross 60-20-20 boundaries', () => {
  const split = splitTimestampGroups(tiedTimestampFixture());
  assertNoTimestampOverlap(split.development, split.validation, split.holdout);
});
```

- [ ] **Step 3: Implement the fixed combination definitions and grouped split**

```js
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
]);
```

- [ ] **Step 4: Write failing staged-gate and overlap tests**

```js
test('holdout stays sealed for each combination that fails validation', () => {
  const result = evaluateCombination(failingFixture());
  assert.equal(result.holdout.status, 'sealed');
});

test('later same-symbol signals are ignored while a trade is open', () => {
  assert.equal(removeOverlappingTrades(overlapFixture()).length, 1);
});
```

- [ ] **Step 5: Implement archive enrichment, combination evaluation, and atomic artifacts**

```js
async function runSixHourBacktest({ input, out, loadHourly = fetchArchiveHourlyKlines }) {
  // Load 0Day observations, filter score >=40, load each symbol once, build indicator
  // indexes once, evaluate development/validation, and open holdout only per passed config.
}
```

Write atomically:

- `study-metadata.json`
- `combination-definitions.json`
- `development-results.json`
- `validation-results.json`
- `holdout-results.json`
- `trade-ledger.json`
- `data-failures.json`

- [ ] **Step 6: Add a bounded-access fixture and CLI integration test**

```js
test('loads each symbol archive once and writes every declared artifact', async () => {
  const calls = new Map();
  await runSixHourBacktest({ input: fixtureInput, out, loadHourly: countedLoader(calls) });
  assert.ok([...calls.values()].every((count) => count === 1));
  assertArtifactsExist(out, expectedArtifactNames);
});
```

- [ ] **Step 7: Run runner and regression tests, then commit**

Run:

```powershell
node --test scripts/1d-bulls2-six-hour-core.test.cjs scripts/1d-bulls2-six-hour-runner.test.cjs
node --test scripts/1d-bulls2-validation-core.test.cjs scripts/1d-bulls2-validation-runner.test.cjs
```

Expected: PASS.

Commit:

```powershell
git add .gitignore scripts/1d-bulls2-six-hour-runner.cjs scripts/1d-bulls2-six-hour-runner.test.cjs
git commit -m "feat: evaluate ten Bulls2 intraday strategies"
```

---

### Task 3: Implement statistical correction and reporting

**Files:**
- Create: `scripts/1d-bulls2-six-hour-report.cjs`
- Create: `scripts/1d-bulls2-six-hour-report.test.cjs`
- Create: `docs/research/1d-bulls2-six-hour-intraday.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 2 artifact directory.
- Produces: `clusterBootstrap(trades, options)`, `holmAdjust(results)`, `determineOutcome(artifacts)`, `buildReport(artifacts)`, CSV summaries, and Markdown.

- [ ] **Step 1: Write failing deterministic bootstrap and Holm tests**

```js
test('cluster bootstrap resamples signal timestamps rather than individual rows', () => {
  const first = clusterBootstrap(clusteredFixture(), { iterations: 2000, seed: 972 });
  const second = clusterBootstrap(clusteredFixture(), { iterations: 2000, seed: 972 });
  assert.equal(first.unit, 'detectedAt');
  assert.deepEqual(first.ci95, second.ci95);
  assert.ok(first.ci95[0] <= first.mean && first.mean <= first.ci95[1]);
});

test('Holm correction rejects only sequential adjusted hypotheses', () => {
  assert.deepEqual(holmAdjust([0.001, 0.01, 0.04], 0.05).map((x) => x.reject), [true, true, false]);
});
```

- [ ] **Step 2: Implement seeded cluster bootstrap and Holm correction**

```js
function clusterBootstrap(trades, { iterations = 10000, seed = 972 } = {}) {
  // Group by detectedAt, resample whole groups, and return percentile CI for mean net R.
}

function holmAdjust(items, alpha = 0.05) {
  // Sort ascending p-values, compare p[i] with alpha/(m-i), and preserve original IDs.
}
```

- [ ] **Step 3: Write failing outcome and narrative tests**

```js
test('does not promote a development-only winner', () => {
  assert.equal(determineOutcome(developmentOnlyFixture()).status, 'NO ROBUST SIX-HOUR EDGE');
});

test('promotes only with validation, holdout, baseline, yearly, and Holm evidence', () => {
  assert.equal(determineOutcome(fullyQualifiedFixture()).status, 'PROMOTE');
});

test('report distinguishes sealed holdout from evaluated failure', () => {
  const report = buildReport(sealedFixture());
  assert.match(report, /holdout remained sealed/i);
  assert.doesNotMatch(report, /holdout expectancy was negative/i);
});
```

- [ ] **Step 4: Implement auditable outcome logic and report generation**

```js
function determineOutcome(artifacts) {
  // Return PROMOTE only when every frozen gate and corrected inference passes.
  // Return INCONCLUSIVE for missing required evidence; otherwise NO ROBUST SIX-HOUR EDGE.
}
```

The report must include all ten combinations, stage metrics, calendar stability, costs, fill rates, confidence intervals, adjusted decisions, failure reasons, and practical non-deployment guidance when rejected.

- [ ] **Step 5: Run report tests and generate the real report**

Run:

```powershell
node --test scripts/1d-bulls2-six-hour-report.test.cjs
node scripts/1d-bulls2-six-hour-report.cjs --input research/1d-bulls2/six-hour-20220701-20260630 --report docs/research/1d-bulls2-six-hour-intraday.md
```

Expected: tests pass and the report conclusion matches machine-readable evidence.

- [ ] **Step 6: Run the complete research test suite and commit**

Run:

```powershell
node --test scripts/1d-bulls2-six-hour-core.test.cjs scripts/1d-bulls2-six-hour-runner.test.cjs scripts/1d-bulls2-six-hour-report.test.cjs
node --check scripts/1d-bulls2-six-hour-core.cjs
node --check scripts/1d-bulls2-six-hour-runner.cjs
node --check scripts/1d-bulls2-six-hour-report.cjs
git diff --check
```

Expected: PASS.

Commit:

```powershell
git add README.md docs/research/1d-bulls2-six-hour-intraday.md scripts/1d-bulls2-six-hour-report.cjs scripts/1d-bulls2-six-hour-report.test.cjs
git commit -m "docs: report Bulls2 six-hour backtest"
```

---

### Task 4: Execute, independently review, package, and publish

**Files:**
- Create: `research/1d-bulls2/six-hour-20220701-20260630/*` (ignored raw artifacts)
- Create: `BT/assets/1d-bulls2-six-hour-2026-08-09/*` in the sibling BT repository
- Modify: `BT/README.md`

**Interfaces:**
- Consumes: all prior tasks and cached official Futures archives.
- Produces: final verified evidence in Catching Cat and a self-contained BT research package.

- [ ] **Step 1: Run the frozen backtest once**

Run:

```powershell
node scripts/1d-bulls2-six-hour-runner.cjs --input research/1d-bulls2/20220701-20260630-futures --out research/1d-bulls2/six-hour-20220701-20260630
```

Expected: exactly ten 0Day combination results and explicit archive failures.

- [ ] **Step 2: Generate the report without modifying rules**

Run:

```powershell
node scripts/1d-bulls2-six-hour-report.cjs --input research/1d-bulls2/six-hour-20220701-20260630 --report docs/research/1d-bulls2-six-hour-intraday.md
```

Expected: `PROMOTE`, `INCONCLUSIVE`, or `NO ROBUST SIX-HOUR EDGE` follows the frozen gates.

- [ ] **Step 3: Perform an independent methodology and implementation review**

Review must verify:

- five-hour delay and six-hour search/hold boundaries;
- no active-candle indicator leakage;
- exact ten definitions and score minimums;
- timestamp-group partition isolation;
- holdout sealing per combination;
- stop-first cost accounting;
- cluster-bootstrap and Holm logic;
- report/artifact consistency.

- [ ] **Step 4: Copy only reproducible evidence to BT**

Include simulator, runner, reporter, tests, design, plan, report, definitions, stage summaries, failures, and trade ledger. Exclude downloaded market archives.

- [ ] **Step 5: Verify both repositories**

Run all six-hour tests in Catching Cat and from the copied BT package. Run `node scripts/verify-dashboard.mjs` in BT and `git diff --check` in both repositories.

- [ ] **Step 6: Commit and push both repositories**

```powershell
git push origin main
```

Expected: clean worktrees except for explicitly preserved pre-existing user changes, and both remotes contain the verified report package.

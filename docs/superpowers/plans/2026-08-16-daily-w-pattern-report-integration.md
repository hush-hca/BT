# Daily W-Pattern Report Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the completed daily W-pattern neckline-retest backtest to the BT Lab dashboard as a bilingual, evidence-backed report without changing existing reports or the nine-study Catching Cat archive.

**Architecture:** Keep the static zero-runtime dashboard and legacy report path. Add a deterministic packaging script for compact source evidence, extend the legacy renderer with optional report-specific rule cards and market labels, register one new multi-asset report, and strengthen the existing build verifier with exact report and asset anchors.

**Tech Stack:** Node.js 20+ standard library, browser-native ES modules, static HTML/CSS/JavaScript, Node test runner.

## Global Constraints

- Stable report ID: `daily-w-pattern-neckline-retest-2026-08-16`.
- Preserve all existing legacy reports and their numerical meaning.
- Preserve exactly nine Catching Cat reports, their lineage, verdict policy, and anchor metrics.
- Provide non-empty Korean and English title, description, status, and custom-rule text.
- Source metrics only from the audited backtest deliverables under `../../outputs/`.
- Package no Binance candle cache, Python bytecode, pytest cache, Git metadata, or unrelated research files.
- Headline results remain: 70 trades, 27.18 net R, 29.53% return, 2.01 profit factor, and 7.18% maximum closed-equity drawdown.
- The report must identify the results as historical in-sample mechanical research, not financial advice.
- Do not push, deploy, or mutate external state.

---

### Task 1: Deterministically Package Evidence and Reproduction Code

**Files:**
- Create: `scripts/package-w-pattern-report.mjs`
- Create: `scripts/package-w-pattern-report.test.mjs`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/SUMMARY.md`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/baseline_summary.csv`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/sensitivity_summary.csv`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/trades.csv`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/equity_curve.csv`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/config.json`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/requirements.txt`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/run_backtest.py`
- Generate: `assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/*.py`
- Generate: `charts/daily-w-pattern-{equity,drawdown,assets,sensitivity}-2026-08-16.png`

**Interfaces:**
- Produces: `packageWPatternReport({ sourceRoot, packageRoot, dashboardRoot }) -> Promise<{ evidenceFiles: string[], chartFiles: string[] }>`.
- CLI defaults: `sourceRoot=../../`, `packageRoot=assets/daily-w-pattern-neckline-retest-2026-08-16`, and `dashboardRoot=.` from the BT repository root.
- The source backtest package is at `<sourceRoot>/work/w_backtest`; audited deliverables are at `<sourceRoot>/outputs`.

- [ ] **Step 1: Write a failing packaging boundary test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageWPatternReport } from './package-w-pattern-report.mjs';

test('packages only declared W-pattern evidence and a self-contained runner', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'w-report-'));
  const source = path.join(root, 'source');
  const dashboard = path.join(root, 'dashboard');
  const packageRoot = path.join(dashboard, 'assets', 'study');
  await seedAuditedOutputs(source);
  await seedBacktestModules(source);
  await mkdir(path.join(source, 'work', 'data'), { recursive: true });
  await writeFile(path.join(source, 'work', 'data', 'BTCUSDT.csv'), 'forbidden');

  const result = await packageWPatternReport({ sourceRoot: source, packageRoot, dashboardRoot: dashboard });

  assert.equal(result.evidenceFiles.length, 7 + 1 + 8);
  assert.equal(result.chartFiles.length, 4);
  await access(path.join(packageRoot, 'SUMMARY.md'));
  await access(path.join(packageRoot, 'backtest', 'w_backtest', 'engine.py'));
  await assert.rejects(access(path.join(packageRoot, 'data', 'BTCUSDT.csv')));
  const runner = await readFile(path.join(packageRoot, 'backtest', 'run_backtest.py'), 'utf8');
  assert.match(runner, /sys\.path\.insert\(0, str\(HERE\)\)/);
  assert.match(runner, /STUDY_ROOT \/ "regenerated"/);
});
```

Implement `seedAuditedOutputs()` and `seedBacktestModules()` in the test with all declared filenames and small deterministic bytes, including valid PNG signatures for chart fixtures.

- [ ] **Step 2: Run the packaging test and verify failure**

Run: `node --test scripts/package-w-pattern-report.test.mjs`

Expected: FAIL because the packager does not exist.

- [ ] **Step 3: Implement an allowlist-only packager**

Use exact mappings, not recursive source-directory copying:

```js
const EVIDENCE = new Map([
  ['w_pattern_retest_report.md', 'SUMMARY.md'],
  ['baseline_summary.csv', 'baseline_summary.csv'],
  ['sensitivity_summary.csv', 'sensitivity_summary.csv'],
  ['trades.csv', 'trades.csv'],
  ['equity_curve.csv', 'equity_curve.csv'],
  ['config.json', 'config.json'],
  ['requirements.txt', 'requirements.txt'],
]);
const CHARTS = new Map([
  ['equity_curve.png', 'daily-w-pattern-equity-2026-08-16.png'],
  ['drawdown.png', 'daily-w-pattern-drawdown-2026-08-16.png'],
  ['per_asset_net_r.png', 'daily-w-pattern-assets-2026-08-16.png'],
  ['sensitivity_robustness.png', 'daily-w-pattern-sensitivity-2026-08-16.png'],
]);
const MODULES = ['__init__.py', 'config.py', 'data.py', 'patterns.py', 'engine.py', 'metrics.py', 'reporting.py', 'cli.py'];
```

Resolve every destination and assert it stays within the exact package or chart directory. Rebuild only `assets/daily-w-pattern-neckline-retest-2026-08-16` and the four declared chart files. Generate this packaged runner:

```python
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
STUDY_ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from w_backtest.cli import run_analysis

if __name__ == "__main__":
    run_analysis(STUDY_ROOT / "regenerated", STUDY_ROOT / "backtest-data", "2026-08-15")
```

- [ ] **Step 4: Pass the packaging test and run the real package**

Run: `node --test scripts/package-w-pattern-report.test.mjs`

Expected: PASS.

Run: `node scripts/package-w-pattern-report.mjs`

Expected: seven top-level evidence files, a runner plus eight modules, and four charts are generated from the audited source workspace.

- [ ] **Step 5: Verify packaged metric anchors**

Read the generated CSVs in the packaging test or a direct Node assertion and require:

```js
assert.match(baseline, /COMBINED,2017-08-18,2026-08-15,12561,413,249,113,70,29,41/);
assert.match(baseline, /0\.2953176899298943,129531\.76899298944,0\.07179788390712454/);
assert.equal(sensitivity.trim().split(/\r?\n/).length, 28);
assert.equal(trades.trim().split(/\r?\n/).length, 71);
```

- [ ] **Step 6: Commit Task 1**

Run: `git add scripts/package-w-pattern-report.mjs scripts/package-w-pattern-report.test.mjs assets/daily-w-pattern-neckline-retest-2026-08-16 charts/daily-w-pattern-*-2026-08-16.png && git commit -m "feat: package W pattern report evidence"`

---

### Task 2: Add Backward-Compatible Custom Legacy Rules

**Files:**
- Modify: `app.js`
- Create: `scripts/legacy-report-renderer.test.mjs`

**Interfaces:**
- Consumes: optional legacy report fields `customRules` and `marketLabel`.
- Produces: `reportRuleCards(report, activeConfig, lang, translations) -> string`.
- Existing `ruleCards(ruleSet, translations)` behavior remains unchanged.

- [ ] **Step 1: Write failing source and rendering tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('legacy renderer supports bilingual custom rules and explicit market labels', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /function reportRuleCards\(/);
  assert.match(source, /report\.customRules/);
  assert.match(source, /report\.marketLabel/);
  assert.match(source, /rule\.label\[lang\]/);
  assert.match(source, /ruleCards\(activeConfig\.rules, t\)/);
});

test('existing reports retain their legacy rule arrays', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /const baseline = \[/);
  assert.match(source, /rules: \[60, 0\.75, 50, 30, 100, 0\.10, 3\]/);
});
```

- [ ] **Step 2: Run and verify the test fails**

Run: `node --test scripts/legacy-report-renderer.test.mjs`

Expected: FAIL because `reportRuleCards` and optional fields are absent.

- [ ] **Step 3: Implement report-aware rule rendering**

```js
function reportRuleCards(report, activeConfig, lang, t) {
  if (!report.customRules) return ruleCards(activeConfig.rules, t);
  return report.customRules
    .map((rule) => `<div><span>${rule.label[lang]}</span><b>${rule.value[lang]}</b></div>`)
    .join('');
}
```

Replace both legacy rule render sites with `reportRuleCards(report, activeConfig, lang, t)` and change the market-label expression to:

```js
const marketLabel = report.marketLabel || (isMultiAsset
  ? 'PEPEUSDT / SOLUSDT / XRPUSDT / LINKUSDT / ADAUSDT / AVAXUSDT'
  : report.symbol || 'BTCUSDT / ETHUSDT');
```

- [ ] **Step 4: Pass focused and existing renderer tests**

Run: `node --test scripts/legacy-report-renderer.test.mjs scripts/research-renderer.test.mjs`

Expected: PASS with existing report behavior preserved.

- [ ] **Step 5: Commit Task 2**

Run: `git add app.js scripts/legacy-report-renderer.test.mjs && git commit -m "feat: support report-specific legacy rules"`

---

### Task 3: Register the Bilingual Report and Strengthen Release Verification

**Files:**
- Modify: `app.js`
- Modify: `scripts/verify-dashboard.mjs`
- Modify: `scripts/verify-dashboard.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: packaged Task 1 assets and Task 2 optional renderer fields.
- Produces: one selectable legacy report with ID `daily-w-pattern-neckline-retest-2026-08-16`.

- [ ] **Step 1: Add failing release-verifier expectations**

Extend `REQUIRED_FILES` with the four chart paths and all public evidence files. Extend `REQUIRED_CONTENT` or exact `requireText` calls with the stable report ID and asset namespace. Add anchor checks:

```js
requireText(app, "id: 'daily-w-pattern-neckline-retest-2026-08-16'", 'W-pattern report ID');
requireText(app, 'BTCUSDT: [21, 47.61904761904761, 0.4638673906146409, 2.2366243428062362]', 'W-pattern BTC metrics');
requireText(app, 'ETHUSDT: [19, 47.368421052631575, 0.4617782234700181, 2.6512017652944007]', 'W-pattern ETH metrics');
requireText(app, 'SOLUSDT: [12, 25, 0.12386567447216211, 1.307159664306917]', 'W-pattern SOL metrics');
requireText(app, 'PEPEUSDT: [5, 40, 0.27117421303702194, 1.6324571191802077]', 'W-pattern PEPE metrics');
requireText(app, 'DOGEUSDT: [13, 38.46153846153847, 0.4475659569224605, 2.347326343334808]', 'W-pattern DOGE metrics');
```

Add mutation tests that change `27.18` to `27.19`, remove a W chart path, and remove the Korean title; each must cause verifier rejection.

- [ ] **Step 2: Run the verifier test and confirm failure**

Run: `node --test scripts/verify-dashboard.test.mjs`

Expected: FAIL because the report record is absent.

- [ ] **Step 3: Add the frozen baseline configuration and report record**

Add one configuration constant:

```js
const dailyWPattern = [{
  id: 1,
  assets: {
    BTCUSDT: [21, 47.61904761904761, 0.4638673906146409, 2.2366243428062362],
    ETHUSDT: [19, 47.368421052631575, 0.4617782234700181, 2.6512017652944007],
    SOLUSDT: [12, 25, 0.12386567447216211, 1.307159664306917],
    PEPEUSDT: [5, 40, 0.27117421303702194, 1.6324571191802077],
    DOGEUSDT: [13, 38.46153846153847, 0.4475659569224605, 2.347326343334808],
  },
  rules: [],
}];
```

Add the report to `reports` with `multiAsset: true`, the explicit five-symbol market label, bilingual fields, eight bilingual `customRules`, four chart paths, exact captions, and file-viewer entries for summary, baseline, sensitivity, ledger, configuration, and packaged runner.

The English status contains the exact text `70 trades · +27.18 net R · +29.53% · PF 2.01 · max drawdown 7.18%`. The Korean status contains the same values and an equivalent historical/in-sample caution.

- [ ] **Step 4: Document the packaged-study workflow**

Add a short README section explaining that this BT Lab report is packaged from `../../outputs`, how to rerun `node scripts/package-w-pattern-report.mjs`, and why it is not part of Catching Cat lineage.

- [ ] **Step 5: Pass the release verifier and complete build**

Run: `node --test scripts/verify-dashboard.test.mjs scripts/legacy-report-renderer.test.mjs`

Expected: PASS.

Run: `npm run build`

Expected: every Node test and `scripts/verify-dashboard.mjs` PASS; the exact nine Catching Cat IDs remain unchanged.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 6: Commit Task 3**

Run: `git add app.js scripts/verify-dashboard.mjs scripts/verify-dashboard.test.mjs README.md && git commit -m "feat: add daily W pattern dashboard report"`

---

### Task 4: Browser Verification and Final Audit

**Files:**
- Modify only if defects are found: `app.js`, `styles.css`, tests, or packaged assets.

**Interfaces:**
- Produces: a visually verified bilingual static report and a clean, committed worktree.

- [ ] **Step 1: Start the static dashboard locally**

Run a static server rooted at the BT repository on an unused localhost port. Confirm `/`, all four W chart URLs, and every listed evidence URL return HTTP 200.

- [ ] **Step 2: Inspect the report in English and Korean**

Select `Daily W-Pattern Neckline Retest`, expand configuration `#1`, and verify:

- title, description, status, and all eight rules change languages;
- the five-asset market label is exact;
- five performance rows show the frozen metrics and correct signs;
- all four charts load without distortion or clipped labels;
- every evidence button loads readable content and copy control works; and
- the caution is visible and does not imply out-of-sample validation.

- [ ] **Step 3: Inspect responsive and regression behavior**

At a narrow mobile viewport, verify selector, rule cards, charts, table scrolling, and file viewer. Switch to an older BT Lab report and two Catching Cat reports to confirm unchanged rendering, language switching, lineage, and evidence disclosures.

- [ ] **Step 4: Run the final automated audit**

Run: `npm run build`

Run: `git diff --check`

Run: `git status --short`

Expected: build passes, whitespace check is clean, and only intentional changes exist.

- [ ] **Step 5: Commit any visual/audit fixes**

If fixes were required, run `git add <exact-files> && git commit -m "fix: verify W pattern dashboard report"`. Otherwise, create no empty commit.

## Plan Self-Review

- The plan covers deterministic evidence packaging, a self-contained public runner, backward-compatible rules and market labels, bilingual report registration, exact metric anchors, full build validation, and visual QA.
- Catching Cat remains exactly nine reports and is not modified by the new report data path.
- Cross-task names are consistent: report ID and asset namespace both use `daily-w-pattern-neckline-retest-2026-08-16`.
- No implementation steps defer unspecified behavior.

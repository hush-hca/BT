import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { packageWPatternReport } from './package-w-pattern-report.mjs';

const MODULES = ['__init__.py', 'config.py', 'data.py', 'patterns.py', 'engine.py', 'metrics.py', 'reporting.py', 'cli.py'];
const PACKAGE_NAMESPACE = 'daily-w-pattern-neckline-retest-2026-08-16';
const EXPECTED_PACKAGE_FILES = [
  'SUMMARY.md',
  'baseline_summary.csv',
  'sensitivity_summary.csv',
  'trades.csv',
  'equity_curve.csv',
  'config.json',
  'requirements.txt',
  'backtest/run_backtest.py',
  ...MODULES.map((filename) => `backtest/w_backtest/${filename}`),
].sort();
const EXPECTED_CHART_FILES = [
  'daily-w-pattern-equity-2026-08-16.png',
  'daily-w-pattern-drawdown-2026-08-16.png',
  'daily-w-pattern-assets-2026-08-16.png',
  'daily-w-pattern-sensitivity-2026-08-16.png',
].sort();
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function write(root, relativePath, contents) {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

async function seedAuditedOutputs(source) {
  const sensitivityRows = ['variant,net_r', ...Array.from({ length: 27 }, (_, index) => `${index + 1},${index + 0.5}`)];
  const tradeRows = ['trade_id,symbol', ...Array.from({ length: 70 }, (_, index) => `${index + 1},BTCUSDT`)];

  await write(source, 'outputs/w_pattern_retest_report.md', '# W-pattern report\n');
  await write(
    source,
    'outputs/baseline_summary.csv',
    [
      'scope,start,end,bars,patterns,breakouts,retests,trades,wins,win_rate_pct,portfolio_return,ending_equity,max_drawdown',
      'COMBINED,2017-08-18,2026-08-15,12561,413,249,113,70,29,41,0.2953176899298943,129531.76899298944,0.07179788390712454',
    ].join('\n'),
  );
  await write(source, 'outputs/sensitivity_summary.csv', `${sensitivityRows.join('\n')}\n`);
  await write(source, 'outputs/trades.csv', `${tradeRows.join('\n')}\n`);
  await write(source, 'outputs/equity_curve.csv', 'date,equity\n2026-08-15,129531.76899298944\n');
  await write(source, 'outputs/config.json', '{"target_r":2}\n');
  await write(source, 'outputs/requirements.txt', 'pandas==2.3.1\n');

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const filename of ['equity_curve.png', 'drawdown.png', 'per_asset_net_r.png', 'sensitivity_robustness.png']) {
    await write(source, `outputs/${filename}`, png);
  }
}

async function seedBacktestModules(source) {
  for (const filename of MODULES) {
    await write(source, `work/w_backtest/${filename}`, `# ${filename}\n`);
  }
}

async function listRelativeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRelativeFiles(root, absolute));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  return files.sort();
}

test('packages only declared W-pattern evidence and a self-contained runner', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'w-report-'));
  const source = path.join(root, 'source');
  const dashboard = path.join(root, 'dashboard');
  const packageRoot = path.join(dashboard, 'assets', PACKAGE_NAMESPACE);
  await seedAuditedOutputs(source);
  await seedBacktestModules(source);
  await write(source, 'work/data/BTCUSDT.csv', 'forbidden');
  await write(packageRoot, 'stale/forbidden.txt', 'remove me');
  await write(packageRoot, 'backtest/__pycache__/stale.pyc', 'remove me');

  const result = await packageWPatternReport({ sourceRoot: source, packageRoot, dashboardRoot: dashboard });

  assert.equal(result.evidenceFiles.length, 7 + 1 + 8);
  assert.equal(result.chartFiles.length, 4);
  await access(path.join(packageRoot, 'SUMMARY.md'));
  await access(path.join(packageRoot, 'backtest', 'w_backtest', 'engine.py'));
  await assert.rejects(access(path.join(packageRoot, 'data', 'BTCUSDT.csv')));
  assert.deepEqual(await listRelativeFiles(packageRoot), EXPECTED_PACKAGE_FILES);

  const generatedCharts = (await readdir(path.join(dashboard, 'charts')))
    .filter((filename) => filename.startsWith('daily-w-pattern-'))
    .sort();
  assert.deepEqual(generatedCharts, EXPECTED_CHART_FILES);
  for (const filename of generatedCharts) {
    const chart = await readFile(path.join(dashboard, 'charts', filename));
    assert.deepEqual(chart.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  }

  const runner = await readFile(path.join(packageRoot, 'backtest', 'run_backtest.py'), 'utf8');
  assert.match(runner, /sys\.path\.insert\(0, str\(HERE\)\)/);
  assert.match(runner, /STUDY_ROOT \/ "regenerated"/);

  const baseline = await readFile(path.join(packageRoot, 'baseline_summary.csv'), 'utf8');
  const sensitivity = await readFile(path.join(packageRoot, 'sensitivity_summary.csv'), 'utf8');
  const trades = await readFile(path.join(packageRoot, 'trades.csv'), 'utf8');
  assert.match(baseline, /COMBINED,2017-08-18,2026-08-15,12561,413,249,113,70,29,41/);
  assert.match(baseline, /0\.2953176899298943,129531\.76899298944,0\.07179788390712454/);
  assert.equal(sensitivity.trim().split(/\r?\n/).length, 28);
  assert.equal(trades.trim().split(/\r?\n/).length, 71);
});

test('rejects every package destination except the stable report namespace', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'w-report-boundary-'));
  const source = path.join(root, 'source');
  const dashboard = path.join(root, 'dashboard');
  await seedAuditedOutputs(source);
  await seedBacktestModules(source);

  await assert.rejects(
    packageWPatternReport({ sourceRoot: source, packageRoot: path.join(root, 'outside'), dashboardRoot: dashboard }),
    /packageRoot must be the exact dashboard asset namespace/,
  );
  await assert.rejects(
    packageWPatternReport({
      sourceRoot: source,
      packageRoot: path.join(dashboard, 'assets', 'catching-cat-research'),
      dashboardRoot: dashboard,
    }),
    /packageRoot must be the exact dashboard asset namespace/,
  );
});

test('frozen packaged evidence retains the audited metric anchors', async () => {
  const packageUrl = new URL('../assets/daily-w-pattern-neckline-retest-2026-08-16/', import.meta.url);
  const baseline = await readFile(new URL('baseline_summary.csv', packageUrl), 'utf8');
  const sensitivity = await readFile(new URL('sensitivity_summary.csv', packageUrl), 'utf8');
  const trades = await readFile(new URL('trades.csv', packageUrl), 'utf8');

  assert.match(baseline, /COMBINED,2017-08-18,2026-08-15,12561,413,249,113,70,29,41/);
  assert.match(baseline, /0\.2953176899298943,129531\.76899298944,0\.07179788390712454/);
  assert.equal(sensitivity.trim().split(/\r?\n/).length, 28);
  assert.equal(trades.trim().split(/\r?\n/).length, 71);
});

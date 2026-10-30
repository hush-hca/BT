import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateResearchReports } from './research-reports-schema.mjs';

const CAT3_QUALIFIED_FILES = [
  'SUMMARY.md',
  'trades-B-hold48-shortlist.csv', 'trades-B-hold48-filterfirst.csv',
  'trades-B-fixed5-shortlist.csv', 'trades-B-fixed5-filterfirst.csv',
  'trades-B-atr2-shortlist.csv', 'trades-B-atr2-filterfirst.csv',
  'trades-B-atr3-shortlist.csv', 'trades-B-atr3-filterfirst.csv',
  'trades-B-structure-shortlist.csv', 'trades-B-structure-filterfirst.csv',
  'trades-B-stalled-shortlist.csv', 'trades-B-stalled-filterfirst.csv',
];
const REQUIRED_FILES = [
  'index.html', 'app.js', 'styles.css', 'research-reports.js', 'research-renderer.js',
  'charts/config-5016-btc-equity.png', 'charts/config-5016-eth-equity.png',
  'charts/support-variants-sweep-21-btc.png', 'charts/support-variants-sweep-21-eth.png', 'vercel.json',
  'charts/daily-w-pattern-equity-2026-08-16.png',
  'charts/daily-w-pattern-drawdown-2026-08-16.png',
  'charts/daily-w-pattern-assets-2026-08-16.png',
  'charts/daily-w-pattern-sensitivity-2026-08-16.png',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/SUMMARY.md',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/baseline_summary.csv',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/sensitivity_summary.csv',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/trades.csv',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/equity_curve.csv',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/config.json',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/requirements.txt',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/run_backtest.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/__init__.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/config.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/data.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/patterns.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/engine.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/metrics.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/reporting.py',
  'assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/w_backtest/cli.py',
  'assets/catching-cat3-quality-2026-10-31/SUMMARY.md',
  'assets/catching-cat3-quality-2026-10-31/EXECUTION.md',
  'assets/catching-cat3-quality-2026-10-31/trades-selected.csv',
  'assets/catching-cat3-quality-2026-10-31/cat3-quality-run.cjs',
  'assets/catching-cat3-quality-2026-10-31/cat3-quality.test.cjs',
  ...CAT3_QUALIFIED_FILES.map((file) => 'assets/catching-cat3-qualified-fixed-2026-10-31/' + file),
];
const REQUIRED_CONTENT = ['styles.css', 'app.js', 'reports', 'language-toggle', 'config-detail-row', 'file-select', 'file-content', 'daily-support-variants', 'sweep-reclaim', 'support-variants-sweep-21-btc.png', 'support-variants-sweep-21-eth.png', 'daily-w-pattern-neckline-retest-2026-08-16', 'cat3-walk-forward-quality', 'cat3-qualified-fixed-policies'];
const EXPECTED_IDS = ['1d-bulls2-validation', '1d-bulls2-six-hour', '1d-bulls2-execution', '1d-bulls3-raw-edge', '1d-bulls4-daily-support', '1d-bulls5-selective-trend', '4h-daily-support-sweep', '4h-daily-support-volume-lock', 'daily-support-1h-confirmation'];
const ANCHORS = [
  ['1d-bulls3-raw-edge', 'validationMean', -0.204],
  ['1d-bulls4-daily-support', 'validation3dMean', -1.596],
  ['4h-daily-support-sweep', 'validationMean', 0.0723],
  ['4h-daily-support-volume-lock', 'validationMean', -0.2454],
  ['daily-support-1h-confirmation', 'oosTrades', 1],
  ['1d-bulls2-execution', 'zeroDayValidationExpectancy', -0.320],
  ['1d-bulls2-execution', 'oneDayValidationPf', 0.123],
];
const FORBIDDEN_REFERENCE = /(?:^|[\\/'"`])(?:logs?|\.cache)(?:[\\/'"`]|$)|(?:attempts|candidates)\.json/i;

function requireText(haystack, needle, label = needle) {
  if (!haystack.includes(needle)) throw new Error(`Missing dashboard content: ${label}`);
}

export async function verifyDashboard(root = process.cwd()) {
  const absoluteRoot = path.resolve(root);
  await Promise.all(REQUIRED_FILES.map((file) => access(path.join(absoluteRoot, file))));
  const [html, app, researchSource, renderer] = await Promise.all(
    ['index.html', 'app.js', 'research-reports.js', 'research-renderer.js'].map((file) => readFile(path.join(absoluteRoot, file), 'utf8')),
  );
  const combined = `${html}\n${app}`;
  for (const text of REQUIRED_CONTENT) requireText(combined, text);
  requireText(app, "import { researchReports, researchLineage } from './research-reports.js';", 'research data import');
  requireText(app, "import { renderResearchReport } from './research-renderer.js';", 'renderer import');
  requireText(app, 'btc: [18, 27.8, 0.07, 1.09]', 'legacy Config #5016 BTC metrics');
  requireText(app, 'eth: [11, 36.4, 0.42, 1.66]', 'legacy Config #5016 ETH metrics');
  requireText(app, "charts: ['/charts/config-5016-btc-equity.png', '/charts/config-5016-eth-equity.png']", 'legacy Config #5016 charts');
  requireText(app, "id: 'daily-w-pattern-neckline-retest-2026-08-16'", 'W-pattern report ID');
  requireText(app, "ko: '일봉 W 패턴 넥라인 리테스트'", 'W-pattern Korean title');
  requireText(app, "en: 'Daily W-Pattern Neckline Retest'", 'W-pattern English title');
  requireText(app, "ko: '70건 거래 · +27.18 순 R · +29.53% · PF 2.01 · 최대 종가 자산 낙폭 7.18%.", 'W-pattern Korean status');
  requireText(app, '70 trades · +27.18 net R · +29.53% · PF 2.01 · max drawdown 7.18%', 'W-pattern headline metrics');
  requireText(app, 'BTCUSDT: [21, 47.61904761904761, 0.4638673906146409, 2.2366243428062362]', 'W-pattern BTC metrics');
  requireText(app, 'ETHUSDT: [19, 47.368421052631575, 0.4617782234700181, 2.6512017652944007]', 'W-pattern ETH metrics');
  requireText(app, 'SOLUSDT: [12, 25, 0.12386567447216211, 1.307159664306917]', 'W-pattern SOL metrics');
  requireText(app, 'PEPEUSDT: [5, 40, 0.27117421303702194, 1.6324571191802077]', 'W-pattern PEPE metrics');
  requireText(app, 'DOGEUSDT: [13, 38.46153846153847, 0.4475659569224605, 2.347326343334808]', 'W-pattern DOGE metrics');
  requireText(app, "id: 'cat3-walk-forward-quality'", 'Cat3 walk-forward report ID');
  requireText(app, "metrics: ['483', '+21.77%', '20.28%', '+0.48%', '1.26']", 'Cat3 walk-forward metrics');
  requireText(app, '/assets/catching-cat3-quality-2026-10-31/trades-selected.csv', 'Cat3 selected trade ledger');
  requireText(app, "id: 'cat3-qualified-fixed-policies'", 'Cat3 qualified fixed-policy report ID');
  requireText(app, "metrics: ['631', '+67.27%', '37.28%', '+0.97%', '48.81%', '1.39', '10.49%']", 'Cat3 B hold48 filter-first metrics');
  for (const file of CAT3_QUALIFIED_FILES) {
    requireText(app, '/assets/catching-cat3-qualified-fixed-2026-10-31/' + file, 'Cat3 qualified evidence ' + file);
  }
  for (const chart of [
    '/charts/daily-w-pattern-equity-2026-08-16.png',
    '/charts/daily-w-pattern-drawdown-2026-08-16.png',
    '/charts/daily-w-pattern-assets-2026-08-16.png',
    '/charts/daily-w-pattern-sensitivity-2026-08-16.png',
  ]) requireText(app, chart, `W-pattern chart ${chart}`);
  for (const evidence of [
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/SUMMARY.md',
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/baseline_summary.csv',
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/sensitivity_summary.csv',
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/trades.csv',
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/config.json',
    '/assets/daily-w-pattern-neckline-retest-2026-08-16/backtest/run_backtest.py',
  ]) requireText(app, evidence, `W-pattern evidence ${evidence}`);
  if (FORBIDDEN_REFERENCE.test(`${html}\n${app}\n${researchSource}\n${renderer}`)) throw new Error('Forbidden path reference in deployed application modules');

  const moduleUrl = `${pathToFileURL(path.join(absoluteRoot, 'research-reports.js')).href}?verify=${Date.now()}-${Math.random()}`;
  const { researchReports, researchLineage } = await import(moduleUrl);
  const actualIds = researchReports.map(({ id }) => id).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify([...EXPECTED_IDS].sort())) throw new Error('Research study IDs do not match the exact approved nine IDs');
  await validateResearchReports(researchReports, path.join(absoluteRoot, 'assets/catching-cat-research'), researchLineage);
  const reports = new Map(researchReports.map((report) => [report.id, report]));
  for (const [id, key, expected] of ANCHORS) {
    const actual = reports.get(id)?.metrics.find((metric) => metric.key === key)?.value;
    if (!Object.is(actual, expected)) throw new Error(`Anchor metric mismatch: ${id}.${key}; expected ${expected}, received ${actual}`);
  }
  return true;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1)));
if (invokedDirectly) {
  await verifyDashboard();
  console.log('Dashboard deployment verification passed.');
}

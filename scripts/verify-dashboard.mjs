import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateResearchReports } from './research-reports-schema.mjs';

const REQUIRED_FILES = [
  'index.html', 'app.js', 'styles.css', 'research-reports.js', 'research-renderer.js',
  'charts/config-5016-btc-equity.png', 'charts/config-5016-eth-equity.png',
  'charts/support-variants-sweep-21-btc.png', 'charts/support-variants-sweep-21-eth.png', 'vercel.json',
];
const REQUIRED_CONTENT = ['styles.css', 'app.js', 'reports', 'language-toggle', 'config-detail-row', 'file-select', 'file-content', 'daily-support-variants', 'sweep-reclaim', 'support-variants-sweep-21-btc.png', 'support-variants-sweep-21-eth.png'];
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

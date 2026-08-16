import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const PACKAGE_NAMESPACE = 'daily-w-pattern-neckline-retest-2026-08-16';

const PACKAGED_RUNNER = `from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
STUDY_ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from w_backtest.cli import run_analysis

if __name__ == "__main__":
    run_analysis(STUDY_ROOT / "regenerated", STUDY_ROOT / "backtest-data", "2026-08-15")
`;

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveInside(root, relativePath) {
  const destination = path.resolve(root, relativePath);
  if (!isInside(root, destination)) {
    throw new Error(`Destination escapes declared root: ${relativePath}`);
  }
  return destination;
}

async function requireSources(paths) {
  await Promise.all(paths.map((source) => access(source)));
}

export async function packageWPatternReport({ sourceRoot, packageRoot, dashboardRoot }) {
  const dashboard = path.resolve(dashboardRoot);
  const source = path.resolve(sourceRoot);
  const assetsRoot = path.resolve(dashboard, 'assets');
  const expectedPackageDirectory = path.resolve(assetsRoot, PACKAGE_NAMESPACE);
  const packageDirectory = path.isAbsolute(packageRoot)
    ? path.resolve(packageRoot)
    : path.resolve(dashboard, packageRoot);
  const chartsRoot = path.resolve(dashboard, 'charts');

  if (packageDirectory !== expectedPackageDirectory) {
    throw new Error(`packageRoot must be the exact dashboard asset namespace assets/${PACKAGE_NAMESPACE}`);
  }

  const outputRoot = path.resolve(source, 'outputs');
  const moduleRoot = path.resolve(source, 'work', 'w_backtest');
  const evidenceCopies = [...EVIDENCE].map(([sourceName, destinationName]) => ({
    source: path.resolve(outputRoot, sourceName),
    destination: resolveInside(packageDirectory, destinationName),
  }));
  const moduleCopies = MODULES.map((filename) => ({
    source: path.resolve(moduleRoot, filename),
    destination: resolveInside(packageDirectory, path.join('backtest', 'w_backtest', filename)),
  }));
  const chartCopies = [...CHARTS].map(([sourceName, destinationName]) => ({
    source: path.resolve(outputRoot, sourceName),
    destination: resolveInside(chartsRoot, destinationName),
  }));
  const runnerDestination = resolveInside(packageDirectory, path.join('backtest', 'run_backtest.py'));

  await requireSources([
    ...evidenceCopies.map(({ source: sourcePath }) => sourcePath),
    ...moduleCopies.map(({ source: sourcePath }) => sourcePath),
    ...chartCopies.map(({ source: sourcePath }) => sourcePath),
  ]);

  await rm(packageDirectory, { recursive: true, force: true });
  await mkdir(path.dirname(runnerDestination), { recursive: true });
  await mkdir(chartsRoot, { recursive: true });
  await Promise.all(chartCopies.map(({ destination }) => rm(destination, { force: true })));

  for (const { source: sourcePath, destination } of [...evidenceCopies, ...moduleCopies]) {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(sourcePath, destination);
  }
  await writeFile(runnerDestination, PACKAGED_RUNNER, 'utf8');
  for (const { source: sourcePath, destination } of chartCopies) {
    await copyFile(sourcePath, destination);
  }

  return {
    evidenceFiles: [...evidenceCopies.map(({ destination }) => destination), runnerDestination, ...moduleCopies.map(({ destination }) => destination)],
    chartFiles: chartCopies.map(({ destination }) => destination),
  };
}

async function main() {
  const dashboardRoot = process.cwd();
  const result = await packageWPatternReport({
    sourceRoot: path.resolve(dashboardRoot, '..', '..'),
    packageRoot: path.join('assets', 'daily-w-pattern-neckline-retest-2026-08-16'),
    dashboardRoot,
  });
  process.stdout.write(`Packaged ${result.evidenceFiles.length} evidence files and ${result.chartFiles.length} charts.\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}

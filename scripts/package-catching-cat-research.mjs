import { execFile as execFileCallback } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const SOURCE_COMMIT = '4d75df4';
const ALLOWED_EVIDENCE_NAMES = new Set([
  'metadata.json',
  'stage-metrics.json',
  'grid-summaries.json',
  'frozen-configuration.json',
]);
const FORBIDDEN_SOURCE_PATTERN = /(?:^|[\\/])(?:\.cache|logs)(?:[\\/]|$)|(?:^|[\\/])(?:attempts|candidates)\.json$/i;

export const STUDY_MANIFEST = [
  {
    id: '1d-bulls2-validation',
    report: 'docs/research/1d-bulls2-validation.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [],
  },
  {
    id: '1d-bulls2-six-hour',
    report: 'docs/research/1d-bulls2-six-hour-intraday.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [],
  },
  {
    id: '1d-bulls2-execution',
    report: 'docs/research/1d-bulls2-profitable-execution.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [],
  },
  {
    id: '1d-bulls3-raw-edge',
    report: 'docs/research/1d-bulls3-intraday-structural-strategy.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/1d-bulls3-intraday-structural-strategy/study-metadata.json' },
      { name: 'stage-metrics.json', source: 'research/1d-bulls3-intraday-structural-strategy/raw-edge.json' },
    ],
  },
  {
    id: '1d-bulls4-daily-support',
    report: 'docs/research/1d-bulls4-daily-support.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/1d-bulls4/daily-support-20220701-20260630/metadata.json' },
      { name: 'stage-metrics.json', source: 'research/1d-bulls4/daily-support-20220701-20260630/raw-edge.json' },
    ],
  },
  {
    id: '1d-bulls5-selective-trend',
    report: 'docs/research/1d-bulls5-selective-trend.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/1d-bulls5/selective-trend-20220701-20260630/metadata.json' },
      { name: 'stage-metrics.json', source: 'research/1d-bulls5/selective-trend-20220701-20260630/stage-metrics.json' },
      { name: 'frozen-configuration.json', source: 'research/1d-bulls5/selective-trend-20220701-20260630/selected-configuration.json' },
    ],
  },
  {
    id: '4h-daily-support-sweep',
    report: 'docs/research/4h-daily-support-liquidity-sweep.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/4h-support-sweep/daily-support-20220701-20260630/metadata.json' },
      { name: 'stage-metrics.json', source: 'research/4h-support-sweep/daily-support-20220701-20260630/stage-metrics.json' },
      { name: 'frozen-configuration.json', source: 'research/4h-support-sweep/daily-support-20220701-20260630/selected-configuration.json' },
    ],
  },
  {
    id: '4h-daily-support-volume-lock',
    report: 'docs/research/4h-daily-support-volume-lock.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/4h-support-volume-lock/refined-20220701-20260630/metadata.json' },
      { name: 'stage-metrics.json', source: 'research/4h-support-volume-lock/refined-20220701-20260630/stage-metrics.json' },
      { name: 'frozen-configuration.json', source: 'research/4h-support-volume-lock/refined-20220701-20260630/selected-configuration.json' },
    ],
  },
  {
    id: 'daily-support-1h-confirmation',
    report: 'docs/research/daily-support-1h-confirmation.md',
    sourceCommit: SOURCE_COMMIT,
    evidence: [
      { name: 'metadata.json', source: 'research/daily-support-1h-confirmation/walk-forward-20220701-20260630/metadata.json' },
      { name: 'stage-metrics.json', source: 'research/daily-support-1h-confirmation/walk-forward-20220701-20260630/stage-metrics.json' },
      { name: 'grid-summaries.json', source: 'research/daily-support-1h-confirmation/walk-forward-20220701-20260630/grid-summaries.json' },
      { name: 'frozen-configuration.json', source: 'research/daily-support-1h-confirmation/walk-forward-20220701-20260630/frozen-configuration.json' },
    ],
  },
];

function isSafeRelativePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/).includes('..');
}

export function validateManifest(manifest) {
  const ids = new Set();
  for (const study of manifest) {
    if (!/^[a-z0-9-]+$/.test(study.id) || ids.has(study.id)) throw new Error(`Invalid or duplicate study id: ${study.id}`);
    ids.add(study.id);
    if (!isSafeRelativePath(study.report) || path.extname(study.report).toLowerCase() !== '.md') {
      throw new Error(`Invalid report path for ${study.id}`);
    }
    if (study.sourceCommit !== SOURCE_COMMIT) throw new Error(`Unexpected source commit for ${study.id}`);
    const names = new Set();
    for (const evidence of study.evidence ?? []) {
      if (!ALLOWED_EVIDENCE_NAMES.has(evidence.name) || names.has(evidence.name)) {
        throw new Error(`Undeclared JSON evidence name for ${study.id}: ${evidence.name}`);
      }
      names.add(evidence.name);
      if (!isSafeRelativePath(evidence.source) || FORBIDDEN_SOURCE_PATTERN.test(evidence.source)) {
        throw new Error(`Forbidden evidence source for ${study.id}: ${evidence.source}`);
      }
      if (path.extname(evidence.source).toLowerCase() !== '.json') {
        throw new Error(`Evidence source must be JSON for ${study.id}: ${evidence.source}`);
      }
    }
  }
  return true;
}

function readmeFor(study) {
  return `# Packaged research evidence\n\n- Study ID: \`${study.id}\`\n- Source repository: \`hush-hca/CatchingCat_Wyckoff\`\n- Source commit: \`${study.sourceCommit}\`\n- Source report: \`${study.report}\`\n\nThis directory is a curated public evidence package. JSON evidence is copied byte for byte. Markdown narrative content is copied from the source commit with terminal blank lines normalized to one LF so the static archive passes repository whitespace checks. Runtime logs, caches, and large row-level artifacts are intentionally excluded.\n`;
}

function normalizeMarkdown(bytes) {
  return Buffer.from(`${bytes.toString('utf8').replace(/[\t ]*(?:\r?\n[\t ]*)*$/u, '')}\n`, 'utf8');
}

async function sourceBytes(sourceRoot, relativePath, sourceCommit) {
  try {
    await access(path.join(sourceRoot, '.git'));
  } catch {
    return readFile(path.join(sourceRoot, relativePath));
  }

  const gitPath = relativePath.replaceAll('\\', '/');
  const { stdout } = await execFile(
    'git',
    ['show', `${sourceCommit}:${gitPath}`],
    { cwd: sourceRoot, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout;
}

export async function packageResearch({ sourceRoot, destinationRoot }) {
  validateManifest(STUDY_MANIFEST);
  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(destinationRoot, { recursive: true });

  for (const study of STUDY_MANIFEST) {
    const outputDirectory = path.join(destinationRoot, study.id);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, 'report.md'),
      normalizeMarkdown(await sourceBytes(sourceRoot, study.report, study.sourceCommit)),
    );
    for (const evidence of study.evidence) {
      await writeFile(
        path.join(outputDirectory, evidence.name),
        await sourceBytes(sourceRoot, evidence.source, study.sourceCommit),
      );
    }
    await writeFile(path.join(outputDirectory, 'README.md'), readmeFor(study), 'utf8');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  const destinationIndex = args.indexOf('--destination');
  if (sourceIndex < 0 || destinationIndex < 0 || !args[sourceIndex + 1] || !args[destinationIndex + 1]) {
    throw new Error('Usage: node scripts/package-catching-cat-research.mjs --source <path> --destination <path>');
  }
  await packageResearch({
    sourceRoot: path.resolve(args[sourceIndex + 1]),
    destinationRoot: path.resolve(args[destinationIndex + 1]),
  });
  console.log(`Packaged ${STUDY_MANIFEST.length} Catching Cat studies.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

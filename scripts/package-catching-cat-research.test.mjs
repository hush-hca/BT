import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { STUDY_MANIFEST, packageResearch } from './package-catching-cat-research.mjs';

test('packages only declared UTF-8 research evidence deterministically', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'catching-cat-package-'));
  const sourceRoot = path.join(root, 'source');
  const destinationRoot = path.join(root, 'public');

  for (const study of STUDY_MANIFEST) {
    const reportPath = path.join(sourceRoot, study.report);
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `# ${study.id}\n한글 연구 보고서\n\n\n`, 'utf8');

    for (const evidence of study.evidence) {
      const evidencePath = path.join(sourceRoot, evidence.source);
      await mkdir(path.dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, JSON.stringify({ study: study.id, kind: evidence.name }), 'utf8');
    }
  }

  await mkdir(path.join(sourceRoot, 'research', '.cache'), { recursive: true });
  await mkdir(path.join(sourceRoot, 'research', 'logs'), { recursive: true });
  await writeFile(path.join(sourceRoot, 'research', '.cache', 'cache.json'), '{}');
  await writeFile(path.join(sourceRoot, 'research', 'logs', 'runtime.log'), 'secret');
  await writeFile(path.join(sourceRoot, 'research', 'attempts.json'), '[]');
  await writeFile(path.join(sourceRoot, 'research', 'candidates.json'), '[]');
  await mkdir(path.join(destinationRoot, 'stale-study'), { recursive: true });
  await writeFile(path.join(destinationRoot, 'stale-study', 'stale.txt'), 'stale');

  await packageResearch({ sourceRoot, destinationRoot });

  assert.deepEqual((await readdir(destinationRoot)).sort(), STUDY_MANIFEST.map(({ id }) => id).sort());
  for (const study of STUDY_MANIFEST) {
    const files = (await readdir(path.join(destinationRoot, study.id))).sort();
    assert.deepEqual(files, ['README.md', 'report.md', ...study.evidence.map(({ name }) => name)].sort());
    assert.match(await readFile(path.join(destinationRoot, study.id, 'README.md'), 'utf8'), /4d75df4/);
    assert.match(await readFile(path.join(destinationRoot, study.id, 'README.md'), 'utf8'), /terminal blank lines normalized to one LF/);
    assert.match(await readFile(path.join(destinationRoot, study.id, 'report.md'), 'utf8'), /한글 연구 보고서/);
    assert.equal(
      await readFile(path.join(destinationRoot, study.id, 'report.md'), 'utf8'),
      `# ${study.id}\n한글 연구 보고서\n`,
    );
    for (const evidence of study.evidence) {
      assert.deepEqual(
        await readFile(path.join(destinationRoot, study.id, evidence.name)),
        await readFile(path.join(sourceRoot, evidence.source)),
      );
    }
  }
});

test('manifest rejects forbidden and undeclared evidence paths', async () => {
  const { validateManifest } = await import('./package-catching-cat-research.mjs');
  const base = { id: 'safe-id', report: 'docs/research/safe.md', sourceCommit: '4d75df4' };

  for (const source of [
    'research/logs/runtime.json',
    'research/.cache/value.json',
    'research/study/attempts.json',
    'research/study/candidates.json',
    'research/study/undeclared.txt',
  ]) {
    assert.throws(
      () => validateManifest([{ ...base, evidence: [{ name: 'metadata.json', source }] }]),
      /forbidden|evidence.*JSON|JSON.*evidence/i,
    );
  }
});

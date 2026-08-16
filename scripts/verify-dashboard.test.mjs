import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyDashboard } from './verify-dashboard.mjs';

const sourceRoot = path.resolve('.');
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bt-verify-'));
  for (const name of ['index.html', 'app.js', 'styles.css', 'research-reports.js', 'research-renderer.js', 'vercel.json', 'charts', 'assets']) {
    await cp(path.join(sourceRoot, name), path.join(root, name), { recursive: true });
  }
  return root;
}
async function mutate(root, file, find, replacement) {
  const target = path.join(root, file);
  const contents = await readFile(target, 'utf8');
  assert.ok(contents.includes(find), `fixture mutation anchor absent: ${find}`);
  await writeFile(target, contents.replace(find, replacement), 'utf8');
}
async function rejectsMutation(file, find, replacement, pattern) {
  const root = await fixture();
  try {
    await mutate(root, file, find, replacement);
    await assert.rejects(verifyDashboard(root), pattern);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('verifies the release fixture', async () => { await assert.doesNotReject(verifyDashboard(sourceRoot)); });
test('rejects a missing required study ID', () => rejectsMutation('research-reports.js', "id:'1d-bulls3-raw-edge'", "id:'missing-study'", /study IDs/i));
test('rejects missing Korean content', () => rejectsMutation('research-reports.js', 'title: bi(...title)', "title: bi('', title[1])", /translation/i));
test('rejects a bad evidence path', () => rejectsMutation('research-reports.js', '`${id}/report.md`', '`../runtime.log`', /evidence path/i));
test('rejects an anchor sign regression', () => rejectsMutation('research-reports.js', "metric('validationMean','검증 평균','Validation mean',0.0723", "metric('validationMean','검증 평균','Validation mean',-0.0723", /anchor metric/i));
test('rejects promote verdicts', () => rejectsMutation('research-reports.js', "verdict: 'reject'", "verdict: 'promote'", /promote/i));
test('rejects runtime log and cache references', () => rejectsMutation('app.js', "import { researchReports", "const forbidden = '.cache/runtime.log';\nimport { researchReports", /forbidden path/i));
test('rejects a missing renderer import', () => rejectsMutation('app.js', "import { renderResearchReport } from './research-renderer.js';", '', /renderer import/i));
test('rejects legacy Config #5016 regression', () => rejectsMutation('app.js', 'btc: [18, 27.8, 0.07, 1.09]', 'btc: [18, 27.8, 0.08, 1.09]', /5016/i));
test('rejects a W-pattern headline regression', () => rejectsMutation('app.js', '+27.18 net R', '+27.19 net R', /headline metrics/i));
test('rejects a missing W-pattern chart path', () => rejectsMutation('app.js', '/charts/daily-w-pattern-drawdown-2026-08-16.png', '/charts/missing-w-pattern-drawdown.png', /W-pattern chart/i));
test('rejects a missing W-pattern Korean title', () => rejectsMutation('app.js', "ko: '일봉 W 패턴 넥라인 리테스트'", "ko: ''", /Korean title/i));

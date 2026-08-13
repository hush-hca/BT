import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { researchReports, researchLineage } from '../research-reports.js';
import { renderResearchReport } from '../research-renderer.js';

const report = researchReports.find(({ id }) => id === 'daily-support-1h-confirmation');

for (const lang of ['ko', 'en']) {
  test(`renders a complete rejected research report in ${lang}`, () => {
    const html = renderResearchReport(report, { lang, lineage: researchLineage });
    assert.match(html, /class="research-report verdict-reject"/);
    assert.match(html, new RegExp(report.verdictExplanation[lang].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /N\/A/);
    assert.match(html, /\+0\.1178%/);
    assert.match(html, /data-report-id="4h-daily-support-volume-lock"/);
    assert.match(html, /data-evidence-path="daily-support-1h-confirmation\/report\.md"/);
    assert.match(html, /<caption>/);
    for (const section of ['objective', 'hypothesis', 'rules', 'process', 'findings', 'failed-gates', 'limitations', 'next-step']) {
      assert.match(html, new RegExp(`data-section="${section}"`));
    }
    assert.doesNotMatch(html, /<canvas|class="[^"]*chart|<img/i);
  });
}

test('escapes authored and tabular content', () => {
  const unsafe = structuredClone(report);
  unsafe.objective.en = '<script>alert(1)</script>';
  unsafe.resultTables[0].rows[0].actual = '<img src=x>';
  const html = renderResearchReport(unsafe, { lang: 'en', lineage: researchLineage });
  assert.doesNotMatch(html, /<script>|<img src=x>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
});

for (const lang of ['ko', 'en']) {
  test(`renders the complete branching lineage with ${lang} titles`, () => {
    const latest = researchReports.find(({ id }) => id === 'daily-support-1h-confirmation');
    const html = renderResearchReport(latest, { lang, lineage: researchLineage, reports: researchReports });
    assert.equal((html.match(/class="lineage-node(?: |")/g) || []).length, 9);
    for (const item of researchReports) assert.match(html, new RegExp(item.title[lang].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /class="lineage-branch"/);
    assert.match(html, /data-report-id="1d-bulls2-six-hour"/);
    assert.match(html, /data-report-id="1d-bulls2-execution"/);
    assert.match(html, /data-report-id="daily-support-1h-confirmation" aria-current="page" disabled/);
  });
}

test('exposes stable structural classes for responsive research styling', () => {
  const html = renderResearchReport(report, { lang: 'en', lineage: researchLineage });
  for (const className of [
    'research-report',
    'verdict-reject',
    'research-verdict',
    'research-metrics',
    'research-metric',
    'research-narrative',
    'research-process',
    'research-table-wrap',
    'research-table',
    'research-disclosure',
    'research-lineage',
    'lineage-nodes',
    'lineage-node',
    'research-evidence',
  ]) {
    assert.match(html, new RegExp(`class="[^"]*\\b${className}\\b`), className);
  }
});

test('research stylesheet includes mobile, focus, sticky table, and motion safeguards', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.verdict-reject\s+\.research-verdict/);
  assert.match(css, /\.verdict-inconclusive\s+\.research-verdict/);
  assert.match(css, /\.lineage-nodes[^{]*\{[^}]*overflow-x\s*:\s*auto/s);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.research-table[^}]*th:first-child[^}]*position\s*:\s*sticky/s);
  assert.match(css, /@media\s*\(max-width\s*:\s*720px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/);
});

test('application dispatches both schemas and wires research interactions', async () => {
  const [app, index] = await Promise.all([readFile(new URL('../app.js', import.meta.url), 'utf8'), readFile(new URL('../index.html', import.meta.url), 'utf8')]);
  assert.match(index, /script type="module" src="\/app\.js"/);
  assert.match(app, /researchReports\.find/);
  assert.match(app, /renderResearchReport/);
  assert.match(app, /data-report-id/);
  assert.match(app, /dataset\.evidencePath/);
  assert.match(app, /scrollIntoView/);
  assert.match(app, /reports\.find/); // legacy dispatch remains available
  assert.match(app, /Config|config-select/);
});

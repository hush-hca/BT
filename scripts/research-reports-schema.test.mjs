import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { researchReports, researchLineage, formatResearchMetric } from '../research-reports.js';
import { validateResearchReports } from './research-reports-schema.mjs';

const root = path.resolve('assets/catching-cat-research');

test('the archive contains exactly nine valid, bilingual, non-promoted studies', async () => {
  assert.equal(researchReports.length, 9);
  assert.equal(new Set(researchReports.map(({ id }) => id)).size, 9);
  assert.deepEqual(new Set(researchReports.map(({ verdict }) => verdict)).has('promote'), false);
  await assert.doesNotReject(validateResearchReports(researchReports, root, researchLineage));
});

test('required source anchors retain their signs and stage semantics', () => {
  const byId = Object.fromEntries(researchReports.map((report) => [report.id, report]));
  const metric = (id, key) => byId[id].metrics.find((item) => item.key === key);
  assert.equal(metric('1d-bulls3-raw-edge', 'validationMean').value, -0.204);
  assert.equal(metric('1d-bulls4-daily-support', 'validation3dMean').value, -1.596);
  assert.equal(metric('4h-daily-support-sweep', 'validationMean').value, 0.0723);
  assert.equal(metric('4h-daily-support-volume-lock', 'validationMean').value, -0.2454);
  assert.equal(metric('daily-support-1h-confirmation', 'oosTrades').value, 1);
  assert.equal(metric('1d-bulls2-execution', 'zeroDayValidationExpectancy').value, -0.320);
  assert.equal(metric('1d-bulls2-execution', 'oneDayValidationPf').value, 0.123);
});

test('metric formatter uses explicit units and preserves unavailable values', () => {
  assert.equal(formatResearchMetric({ value: null, unit: 'pf' }, 'en'), 'N/A');
  assert.equal(formatResearchMetric({ value: 1399, unit: 'count' }, 'en'), '1,399');
  assert.equal(formatResearchMetric({ value: 0.0723, unit: 'percent', precision: 4 }, 'en'), '+0.0723%');
  assert.equal(formatResearchMetric({ value: -0.32, unit: 'r', precision: 3 }, 'ko'), '-0.320R');
  assert.equal(formatResearchMetric({ value: 6, unit: 'hours' }, 'en'), '6 h');
  assert.equal(formatResearchMetric({ value: [-0.5555, 0.687], unit: 'percentInterval', precision: 4 }, 'en'), '[-0.5555%, +0.6870%]');
});

test('validator rejects broken semantics', async () => {
  const clone = () => structuredClone(researchReports);
  const duplicate = clone(); duplicate[1].id = duplicate[0].id;
  await assert.rejects(validateResearchReports(duplicate, root, researchLineage), /duplicate/i);
  const missingKo = clone(); missingKo[0].objective.ko = '';
  await assert.rejects(validateResearchReports(missingKo, root, researchLineage), /translation/i);
  const mojibake = clone(); mojibake[0].summary.ko = '���';
  await assert.rejects(validateResearchReports(mojibake, root, researchLineage), /mojibake/i);
  const promoted = clone(); promoted[0].verdict = 'promote';
  await assert.rejects(validateResearchReports(promoted, root, researchLineage), /promote/i);
  const badPath = clone(); badPath[0].evidence[0].path = '../runtime.log';
  await assert.rejects(validateResearchReports(badPath, root, researchLineage), /evidence path/i);
  const cycle = structuredClone(researchLineage); cycle.push(cycle[0]);
  await assert.rejects(validateResearchReports(clone(), root, cycle), /lineage/i);
});

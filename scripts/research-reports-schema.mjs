import { access } from 'node:fs/promises';
import path from 'node:path';

const VERDICTS = new Set(['reject', 'inconclusive', 'promote']);
const HOLDOUT_STATES = new Set(['sealed', 'evaluated', 'not-applicable']);
const UNITS = new Set(['count', 'percent', 'r', 'hours', 'pf', 'percentInterval']);
const STAGES = new Set(['all', 'development', 'validation', 'holdout']);
const MOJIBAKE = /(?:�|���|Ã.|Â.|â€|ì[\x80-\xBF]|ë[\x80-\xBF])/u;
const REQUIRED_BILINGUAL = ['title', 'summary', 'verdictExplanation', 'objective', 'hypothesis', 'nextStep'];

function fail(message) { throw new TypeError(message); }
function bilingual(value, field) {
  if (!value || typeof value.ko !== 'string' || !value.ko.trim() || typeof value.en !== 'string' || !value.en.trim()) fail(`Missing translation: ${field}`);
  if (MOJIBAKE.test(value.ko) || MOJIBAKE.test(value.en)) fail(`Mojibake detected: ${field}`);
}

export async function validateResearchReports(reports, evidenceRoot, lineage = []) {
  if (!Array.isArray(reports) || reports.length !== 9) fail('Exactly nine research reports are required');
  const ids = reports.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) fail('Duplicate research report ID');
  const idSet = new Set(ids);
  for (const report of reports) {
    if (!VERDICTS.has(report.verdict)) fail(`Unsupported verdict: ${report.verdict}`);
    if (report.verdict === 'promote') fail('Promote is not allowed in this dataset');
    if (!HOLDOUT_STATES.has(report.holdoutStatus)) fail(`Invalid holdout state: ${report.holdoutStatus}`);
    for (const field of REQUIRED_BILINGUAL) bilingual(report[field], `${report.id}.${field}`);
    for (const field of ['rules', 'process', 'findings', 'failedGates', 'limitations']) {
      if (!Array.isArray(report[field]) || report[field].length === 0) fail(`Missing translated ${field}: ${report.id}`);
      report[field].forEach((value, index) => bilingual(value, `${report.id}.${field}[${index}]`));
    }
    if (!Array.isArray(report.metrics) || report.metrics.length === 0) fail(`Missing metrics: ${report.id}`);
    const metricKeys = new Set();
    for (const item of report.metrics) {
      if (!item.key || metricKeys.has(item.key)) fail(`Duplicate metric key: ${report.id}.${item.key}`);
      metricKeys.add(item.key); bilingual(item.label, `${report.id}.metrics.${item.key}.label`);
      if (!UNITS.has(item.unit)) fail(`Invalid metric unit: ${report.id}.${item.key}`);
      if (!STAGES.has(item.stage)) fail(`Invalid metric stage: ${report.id}.${item.key}`);
      if (item.value !== null && item.unit === 'percentInterval' && (!Array.isArray(item.value) || item.value.length !== 2 || item.value.some((value) => !Number.isFinite(value)))) fail(`Invalid interval: ${report.id}.${item.key}`);
      if (item.value !== null && item.unit !== 'percentInterval' && !Number.isFinite(item.value)) fail(`Invalid metric value: ${report.id}.${item.key}`);
    }
    if (!Array.isArray(report.resultTables) || report.resultTables.length === 0) fail(`Missing result tables: ${report.id}`);
    report.resultTables.forEach((result, index) => {
      bilingual(result.caption, `${report.id}.resultTables[${index}].caption`);
      if (!result.columns?.length || !result.rows?.length) fail(`Incomplete result table: ${report.id}`);
      result.columns.forEach((column) => bilingual(column.label, `${report.id}.resultTables[${index}].column.${column.key}`));
    });
    if (!Array.isArray(report.evidence) || report.evidence.length < 2) fail(`Missing evidence: ${report.id}`);
    for (const item of report.evidence) {
      bilingual(item.label, `${report.id}.evidence.label`);
      if (typeof item.path !== 'string' || path.isAbsolute(item.path) || item.path.includes('..') || /(?:^|[\\/])(?:logs?|\.cache|attempts\.json|candidates\.json)(?:$|[\\/])/i.test(item.path)) fail(`Invalid evidence path: ${item.path}`);
      const resolved = path.resolve(evidenceRoot, item.path);
      if (!resolved.startsWith(`${path.resolve(evidenceRoot)}${path.sep}`)) fail(`Invalid evidence path: ${item.path}`);
      await access(resolved).catch(() => fail(`Missing evidence file: ${item.path}`));
    }
    for (const linked of [report.lineage?.predecessor, report.lineage?.successor]) if (linked !== null && !idSet.has(linked)) fail(`Invalid lineage ID: ${linked}`);
  }
  if (!Array.isArray(lineage) || lineage.length !== reports.length || new Set(lineage.map(({ id }) => id)).size !== lineage.length || lineage.some(({ id }) => !idSet.has(id))) fail('Invalid lineage membership');
  const successors = new Map(lineage.map(({ id, successor }) => [id, successor]));
  for (const start of ids) {
    const visited = new Set(); let cursor = start;
    while (cursor != null) {
      if (visited.has(cursor)) fail('Lineage cycle detected');
      visited.add(cursor); cursor = successors.get(cursor) ?? null;
    }
  }
  return true;
}

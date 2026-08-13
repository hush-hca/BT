import { formatResearchMetric } from './research-reports.js';

const labels = {
  ko: { verdict: '판정', reject: '기각', inconclusive: '불충분', objective: '연구 목적', hypothesis: '가설', rules: '동결 규칙', process: '연구 과정', findings: '주요 결과', failedGates: '실패 기준', limitations: '한계', nextStep: '다음 단계', lineage: '연구 계보', evidence: '근거 파일', evidenceHint: '파일을 선택하면 원문을 확인할 수 있습니다.', copy: '파일 내용 복사', loading: '파일을 불러오는 중…', stage: { all: '전체', development: '개발', validation: '검증', holdout: '홀드아웃' } },
  en: { verdict: 'Verdict', reject: 'Reject', inconclusive: 'Inconclusive', objective: 'Objective', hypothesis: 'Hypothesis', rules: 'Frozen rules', process: 'Research process', findings: 'Findings', failedGates: 'Failed gates', limitations: 'Limitations', nextStep: 'Next step', lineage: 'Research lineage', evidence: 'Evidence files', evidenceHint: 'Select a file to inspect the source evidence.', copy: 'Copy file contents', loading: 'Loading file…', stage: { all: 'All', development: 'Development', validation: 'Validation', holdout: 'Holdout' } },
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const text = (value, lang) => escapeHtml(value?.[lang] ?? value ?? '');
const list = (items, lang) => items.map((item) => `<li>${text(item, lang)}</li>`).join('');

function tableValue(value, column) {
  if (value == null || value === '') return 'N/A';
  if (typeof value !== 'number') return escapeHtml(value);
  const hint = `${column.key} ${column.label.en}`.toLowerCase();
  if (/expectancy|\br\b/.test(hint)) return `${value > 0 ? '+' : ''}${value.toFixed(3)}R`;
  if (/mean|median|win|return|percent|%/.test(hint)) return `${value > 0 ? '+' : ''}${value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%`;
  return escapeHtml(value);
}

export function renderResearchReport(report, { lang = 'en', lineage = [] } = {}) {
  const t = labels[lang] || labels.en;
  const lineageRecord = lineage.find(({ id }) => id === report.id) || report.lineage || {};
  const neighbors = [lineageRecord.predecessor, report.id, lineageRecord.successor].filter(Boolean);
  const tables = report.resultTables.map((result) => `<div class="research-table-wrap"><table class="research-table"><caption>${text(result.caption, lang)}</caption><thead><tr>${result.columns.map((column) => `<th scope="col">${text(column.label, lang)}</th>`).join('')}</tr></thead><tbody>${result.rows.map((row) => `<tr>${result.columns.map((column, index) => `<${index ? 'td' : 'th'}${index ? '' : ' scope="row"'}>${tableValue(row[column.key], column)}</${index ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
  const metrics = report.metrics.map((metric) => `<article class="research-metric"><span>${text(metric.label, lang)}</span><strong>${escapeHtml(formatResearchMetric(metric, lang))}</strong><small>${escapeHtml(t.stage[metric.stage] || metric.stage)}</small></article>`).join('');
  return `<article class="research-report verdict-${escapeHtml(report.verdict)}" aria-labelledby="report-title">
    <header class="research-header"><p class="eyebrow">${escapeHtml(report.market)} · ${escapeHtml(report.timeframe)} <span class="date-chip">${escapeHtml(report.date)}</span></p><h1 id="report-title" tabindex="-1">${text(report.title, lang)}</h1><p class="sub">${text(report.summary, lang)}</p><div class="research-verdict"><b>${t.verdict}: ${escapeHtml(t[report.verdict] || report.verdict)}</b> ${text(report.verdictExplanation, lang)}</div></header>
    <div class="research-metrics">${metrics}</div>
    <div class="research-narrative"><section data-section="objective"><h2>${t.objective}</h2><p>${text(report.objective, lang)}</p></section><section data-section="hypothesis"><h2>${t.hypothesis}</h2><p>${text(report.hypothesis, lang)}</p></section></div>
    <details class="research-disclosure" data-section="rules" open><summary>${t.rules}</summary><ul>${list(report.rules, lang)}</ul></details>
    <section data-section="process"><h2>${t.process}</h2><ol class="research-process">${list(report.process, lang)}</ol></section>
    <section data-section="findings"><h2>${t.findings}</h2><ul>${list(report.findings, lang)}</ul>${tables}</section>
    <details class="research-disclosure" data-section="failed-gates" open><summary>${t.failedGates}</summary><ul>${list(report.failedGates, lang)}</ul></details>
    <div class="research-narrative"><section data-section="limitations"><h2>${t.limitations}</h2><ul>${list(report.limitations, lang)}</ul></section><section data-section="next-step"><h2>${t.nextStep}</h2><p>${text(report.nextStep, lang)}</p></section></div>
    <nav class="research-lineage" aria-label="${t.lineage}"><h2>${t.lineage}</h2><div class="lineage-nodes">${neighbors.map((id) => { const item = id === report.id ? report : null; return `<button type="button" class="lineage-node${id === report.id ? ' active' : ''}" data-report-id="${escapeHtml(id)}" ${id === report.id ? 'aria-current="page" disabled' : ''}>${item ? text(item.title, lang) : escapeHtml(id)}</button>`; }).join('')}</div></nav>
    <section class="research-evidence" data-section="evidence"><h2>${t.evidence}</h2><div class="file-layout"><div class="file-list">${report.evidence.map((file) => `<button type="button" class="file-select evidence-select" data-evidence-path="${escapeHtml(file.path)}">${text(file.label, lang)}</button>`).join('')}</div><div class="file-viewer"><div class="file-toolbar"><b id="file-name">${t.evidenceHint}</b><button type="button" id="copy-file" class="icon-button" aria-label="${t.copy}" title="${t.copy}">⧉</button></div><pre id="file-content">${t.loading}</pre><p id="copy-status" class="sr-only" aria-live="polite"></p></div></div></section>
  </article>`;
}

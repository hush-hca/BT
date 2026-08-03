const baseline = [
  { id: 5016, btc: [18, 27.8, 0.07, 1.09], eth: [11, 36.4, 0.42, 1.66], rules: [60, 0.75, 50, 30, 100, 0.10, 3] },
  { id: 4970, btc: [33, 27.3, 0.06, 1.08], eth: [24, 37.5, 0.46, 1.73], rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 3350, btc: [23, 26.1, 0.02, 1.03], eth: [17, 41.2, 0.60, 2.02], rules: [40, 0.50, 30, 30, 0, 0.50, 3] },
];

const variants = [
  { id: 21, btc: [13, 38.5, 0.47, 1.76], eth: [14, 50.0, 0.96, 2.92], rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, btc: [13, 30.8, 0.15, 1.22], eth: [14, 50.0, 0.95, 2.91], rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, btc: [9, 33.3, 0.28, 1.42], eth: [13, 53.8, 1.11, 3.40], rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const reports = [
  {
    id: 'daily-support-bounce', date: '2026-08-03',
    name: { ko: '일봉 지지선 강세 캔들', en: 'Daily Support Bullish Candle' },
    desc: { ko: '기본 BTC/ETH 일봉 지지선 반등 연구입니다.', en: 'Original BTC/ETH daily support-bounce study.' },
    status: { ko: '공통 60% 승률 조건을 만족하는 조합은 찾지 못했습니다.', en: 'No common configuration met the 60% win-rate condition.' },
    configs: baseline,
    charts: ['/charts/config-5016-btc-equity.png', '/charts/config-5016-eth-equity.png'],
    captions: ['BTCUSDT · 18 trades · +0.07R · PF 1.09', 'ETHUSDT · 11 trades · +0.42R · PF 1.66'],
    files: [['전략 README', 'Strategy README', '/assets/daily-support-bounce/README.md'], ['백테스트 엔진', 'Backtest engine', '/assets/daily-support-bounce/btc_support_backtest.py'], ['결과 요약', 'Result summary', '/assets/daily-support-bounce/SUMMARY.md']],
  },
  {
    id: 'daily-support-variants', date: '2026-08-03',
    name: { ko: '지지선 강세 캔들 · 변형 연구', en: 'Support Bullish Candle · Sweep-Reclaim Study' },
    desc: { ko: '강한 종가, 불리시 엔골핑, 지지선 하향 스윕 후 회복 변형을 2024년 이후 보류 구간에서 비교했습니다.', en: 'Compared strong-close, bullish-engulfing, and sweep-reclaim variants on the 2024+ holdout.' },
    status: { ko: '최선의 균형 후보는 #21입니다. BTC 38.5%, ETH 50.0% 승률로 60% 목표에는 미달합니다.', en: 'Best balanced candidate: #21. BTC 38.5% and ETH 50.0% win rates do not meet the 60% target.' },
    configs: variants,
    charts: ['/charts/support-variants-sweep-21-btc.png', '/charts/support-variants-sweep-21-eth.png'],
    captions: ['BTCUSDT · 13 trades · +0.47R · PF 1.76', 'ETHUSDT · 14 trades · +0.96R · PF 2.92'],
    files: [['연구 요약', 'Research summary', '/assets/daily-support-variants-2026-08-03/SUMMARY.md'], ['변형 백테스트 코드', 'Variant backtest code', '/assets/daily-support-variants-2026-08-03/research_support_variants.py'], ['백테스트 엔진', 'Backtest engine', '/assets/daily-support-variants-2026-08-03/btc_support_backtest.py'], ['설정 그리드', 'Configuration grid', '/assets/daily-support-variants-2026-08-03/config_grid.csv'], ['개발 구간 성과', 'Development metrics', '/assets/daily-support-variants-2026-08-03/development_metrics.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/daily-support-variants-2026-08-03/holdout_metrics.csv'], ['#21 BTC 거래', '#21 BTC trades', '/assets/daily-support-variants-2026-08-03/sweep_reclaim_21_btc_trades.csv'], ['#21 ETH 거래', '#21 ETH trades', '/assets/daily-support-variants-2026-08-03/sweep_reclaim_21_eth_trades.csv']],
  },
];

const copy = {
  ko: { reports: '리포트 선택', rules: '선택한 조합 규칙', perf: '후보 조합 성과', files: '전략 파일', copied: '복사됨', loading: '파일을 불러오는 중…', failed: '복사하지 못했습니다', support: '지지선', touch: '터치 범위', body: '몸통 비율', close: '종가 위치', trend: '추세 필터', stop: '손절 버퍼', target: '익절 목표', none: '없음', result: '검증 결과', equity: '자산 곡선' },
  en: { reports: 'Select report', rules: 'Selected configuration rules', perf: 'Candidate performance', files: 'Strategy files', copied: 'Copied', loading: 'Loading file…', failed: 'Could not copy', support: 'Support age', touch: 'Touch band', body: 'Body ratio', close: 'Close location', trend: 'Trend filter', stop: 'Stop buffer', target: 'Profit target', none: 'None', result: 'Validation result', equity: 'Equity curves' },
};

let lang = 'ko';
let selectedReport = 'daily-support-variants';
let selectedId = 21;

function ruleCards(ruleSet, t) {
  return [[t.support, `${ruleSet[0]} bars (3-left / 3-right swing low)`], [t.touch, `±${ruleSet[1].toFixed(2)}%`], [t.body, `≥ ${ruleSet[2]}% of range`], [t.close, `Top ${ruleSet[3]}%`], [t.trend, ruleSet[4] ? `Close > SMA ${ruleSet[4]}` : t.none], [t.stop, `${ruleSet[5].toFixed(2)}% below signal low`], [t.target, `${ruleSet[6].toFixed(1)}R`]]
    .map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
}

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('Copy unavailable'));
}

function render() {
  const t = copy[lang];
  const report = reports.find((item) => item.id === selectedReport);
  const activeConfig = report.configs.find((item) => item.id === selectedId);
  const rows = report.configs.map((config) => `<tr class="${selectedId === config.id ? 'selected' : ''}"><td><button class="config-select" data-id="${config.id}">#${config.id}</button></td><td>${config.btc[0]} / ${config.eth[0]}</td><td>${config.btc[1]}% / ${config.eth[1]}%</td><td>+${config.btc[2].toFixed(2)}R / +${config.eth[2].toFixed(2)}R</td><td>${config.btc[3].toFixed(2)} / ${config.eth[3].toFixed(2)}</td></tr>${selectedId === config.id ? `<tr class="config-detail-row"><td colspan="5"><div class="config-grid">${ruleCards(config.rules, t)}</div></td></tr>` : ''}`).join('');

  document.querySelector('#app').innerHTML = `<div class="wrap"><nav><span class="brand">BT LAB<span>BACKTEST RESEARCH</span></span><div class="nav-controls"><label class="report-control">${t.reports}<select id="report">${reports.map((item) => `<option value="${item.id}" ${item.id === report.id ? 'selected' : ''}>${item.name[lang]} · ${item.date}</option>`).join('')}</select></label><div id="language-toggle" role="group" aria-label="Language"><button type="button" data-lang="ko" class="${lang === 'ko' ? 'active' : ''}" aria-pressed="${lang === 'ko'}">KR</button><button type="button" data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-pressed="${lang === 'en'}">EN</button></div></div></nav><p class="eyebrow">BTCUSDT / ETHUSDT · Daily <span class="date-chip">${report.date}</span></p><h1>${report.name[lang]}</h1><p class="sub">${report.desc[lang]}</p><div class="banner"><b>${t.result}</b> ${report.status[lang]}</div><section><h2>${t.rules}: #${selectedId}</h2><div class="rules">${ruleCards(activeConfig.rules, t)}</div></section><section><h2>${t.equity}</h2><div class="charts">${report.charts.map((path, index) => `<figure><img src="${path}" alt="${t.equity}"/><figcaption>${report.captions[index]}</figcaption></figure>`).join('')}</div></section><section><h2>${t.perf}</h2><div class="table-wrap"><table><thead><tr><th>Config</th><th>Trades<br>BTC / ETH</th><th>Win rate<br>BTC / ETH</th><th>Expectancy R<br>BTC / ETH</th><th>PF<br>BTC / ETH</th></tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>${t.files}</h2><div class="file-layout"><div class="file-list">${report.files.map(([ko, en, path]) => `<button type="button" class="file-select" data-path="${path}">${lang === 'ko' ? ko : en}</button>`).join('')}</div><div class="file-viewer"><div class="file-toolbar"><b id="file-name"></b><button type="button" id="copy-file" class="icon-button" aria-label="${t.copied}" title="${t.copied}"><span aria-hidden="true">⧉</span></button></div><pre id="file-content">${t.loading}</pre><p id="copy-status" class="sr-only" aria-live="polite"></p></div></div></section></div>`;

  document.querySelector('.brand').innerHTML = '<img src="/assets/brand/bt-logo.png" alt="BT Lab logo"/><span class="brand-copy">BT LAB<small>BACKTEST RESEARCH</small></span>';
  document.querySelector('#report').onchange = (event) => { selectedReport = event.target.value; selectedId = reports.find((item) => item.id === selectedReport).configs[0].id; render(); };
  document.querySelectorAll('[data-lang]').forEach((button) => { button.onclick = () => { lang = button.dataset.lang; render(); }; });
  document.querySelectorAll('.config-select').forEach((button) => { button.onclick = () => { selectedId = Number(button.dataset.id); render(); }; });
  const load = async (button) => { document.querySelector('#file-name').textContent = button.textContent; const output = document.querySelector('#file-content'); output.textContent = t.loading; try { const response = await fetch(button.dataset.path); output.textContent = response.ok ? await response.text() : 'Could not load file.'; } catch { output.textContent = 'Could not load file.'; } };
  document.querySelectorAll('.file-select').forEach((button) => { button.onclick = () => load(button); });
  document.querySelector('#copy-file').onclick = async () => { const button = document.querySelector('#copy-file'); const status = document.querySelector('#copy-status'); try { await copyText(document.querySelector('#file-content').textContent); button.innerHTML = '<span aria-hidden="true">✓</span>'; status.textContent = t.copied; setTimeout(() => { if (document.querySelector('#copy-file') === button) button.innerHTML = '<span aria-hidden="true">⧉</span>'; }, 1400); } catch { status.textContent = t.failed; } };
  load(document.querySelector('.file-select'));
}

render();

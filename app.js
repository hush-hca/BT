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

const pepe = [
  { id: 21, assets: { PEPEUSDT: [11, 9.1, -0.65, 0.29, -8.0], SOLUSDT: [19, 26.3, 0.03, 1.04, -7.0], XRPUSDT: [15, 13.3, -0.48, 0.44, -9.0], LINKUSDT: [13, 38.5, 0.50, 1.81, -4.08], ADAUSDT: [18, 33.3, 0.30, 1.44, -7.0], AVAXUSDT: [11, 27.3, 0.07, 1.10, -3.0] }, rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, assets: { PEPEUSDT: [11, 9.1, -0.65, 0.29, -8.0], SOLUSDT: [20, 25.0, -0.03, 0.97, -7.0], XRPUSDT: [15, 13.3, -0.48, 0.44, -9.0], LINKUSDT: [14, 42.9, 0.65, 2.13, -4.0], ADAUSDT: [18, 33.3, 0.29, 1.44, -7.0], AVAXUSDT: [11, 27.3, 0.07, 1.10, -3.0] }, rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, assets: { PEPEUSDT: [9, 11.1, -0.57, 0.36, -6.0], SOLUSDT: [17, 29.4, 0.15, 1.21, -6.0], XRPUSDT: [11, 18.2, -0.29, 0.64, -6.0], LINKUSDT: [10, 40.0, 0.56, 1.93, -3.08], ADAUSDT: [15, 26.7, 0.04, 1.05, -7.0], AVAXUSDT: [10, 30.0, 0.18, 1.26, -3.0] }, rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const fourHour = [
  { id: 21, assets: { BTCUSDT: [135, 29.6, 0.10, 1.14], ETHUSDT: [123, 24.4, -0.09, 0.89], PEPEUSDT: [79, 30.4, 0.17, 1.24], XRPUSDT: [126, 24.6, -0.08, 0.89], SOLUSDT: [124, 25.8, -0.02, 0.98], ADAUSDT: [129, 27.9, 0.06, 1.08], AVAXUSDT: [123, 23.6, -0.11, 0.86], LINKUSDT: [119, 28.6, 0.08, 1.12] }, rules: [60, 0.75, 30, 30, 0, 0.50, 3] },
  { id: 20, assets: { BTCUSDT: [162, 29.0, 0.06, 1.08], ETHUSDT: [129, 24.0, -0.12, 0.85], PEPEUSDT: [84, 27.4, 0.04, 1.06], XRPUSDT: [148, 24.3, -0.11, 0.85], SOLUSDT: [145, 25.5, -0.04, 0.95], ADAUSDT: [138, 26.8, -0.00, 1.00], AVAXUSDT: [143, 25.2, -0.06, 0.92], LINKUSDT: [132, 28.8, 0.08, 1.11] }, rules: [60, 0.75, 30, 30, 0, 0.10, 3] },
  { id: 29, assets: { BTCUSDT: [103, 30.1, 0.12, 1.17], ETHUSDT: [99, 25.3, -0.05, 0.93], PEPEUSDT: [55, 30.9, 0.19, 1.28], XRPUSDT: [97, 23.7, -0.12, 0.84], SOLUSDT: [101, 26.7, 0.02, 1.03], ADAUSDT: [99, 31.3, 0.18, 1.27], AVAXUSDT: [98, 24.5, -0.07, 0.91], LINKUSDT: [93, 32.3, 0.23, 1.33] }, rules: [60, 0.75, 50, 30, 0, 0.50, 3] },
];

const fourHour2r = [
  { id: 21, assets: { BTCUSDT: [155, 36.1, 0.01, 1.01], ETHUSDT: [131, 32.1, -0.10, 0.86], PEPEUSDT: [82, 37.8, 0.09, 1.15], XRPUSDT: [139, 31.7, -0.11, 0.83], SOLUSDT: [134, 33.6, -0.04, 0.94], ADAUSDT: [137, 37.2, 0.06, 1.09], AVAXUSDT: [136, 30.1, -0.15, 0.79], LINKUSDT: [131, 33.6, -0.04, 0.93] }, rules: [60, 0.75, 30, 30, 0, 0.50, 2] },
  { id: 20, assets: { BTCUSDT: [173, 35.8, -0.03, 0.96], ETHUSDT: [139, 30.2, -0.17, 0.76], PEPEUSDT: [85, 35.3, 0.01, 1.02], XRPUSDT: [156, 27.6, -0.24, 0.66], SOLUSDT: [153, 32.0, -0.09, 0.86], ADAUSDT: [145, 37.9, 0.06, 1.10], AVAXUSDT: [147, 29.9, -0.16, 0.77], LINKUSDT: [138, 34.1, -0.04, 0.94] }, rules: [60, 0.75, 30, 30, 0, 0.10, 2] },
  { id: 29, assets: { BTCUSDT: [116, 38.8, 0.09, 1.14], ETHUSDT: [101, 32.7, -0.08, 0.88], PEPEUSDT: [57, 40.4, 0.17, 1.28], XRPUSDT: [102, 29.4, -0.18, 0.75], SOLUSDT: [107, 35.5, 0.02, 1.03], ADAUSDT: [102, 40.2, 0.14, 1.23], AVAXUSDT: [108, 29.6, -0.15, 0.78], LINKUSDT: [102, 37.3, 0.06, 1.10] }, rules: [60, 0.75, 50, 30, 0, 0.50, 2] },
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
  {
    id: 'pepe-fixed-sweep-reclaim', date: '2026-08-04', multiAsset: true,
    name: { ko: 'PEPE · Sweep-Reclaim 고정 조합', en: 'PEPE · Fixed Sweep-Reclaim Configurations' },
    desc: { ko: 'BTC·ETH에서 정한 #21, #20, #29를 재최적화 없이 PEPE·SOL·XRP·LINK·ADA·AVAX에 그대로 적용한 보류구간 검증입니다.', en: 'Applied BTC/ETH-selected #21, #20, and #29 to PEPE, SOL, XRP, LINK, ADA, and AVAX without asset-specific re-optimization.' },
    status: { ko: '자산별 편차가 큽니다. LINK는 양의 기대값이지만 XRP는 모든 조합에서 음수이며, PEPE도 채택 근거가 없습니다.', en: 'Results vary materially by asset. LINK is positive, while XRP is negative in every configuration and PEPE does not support adoption.' },
    configs: pepe,
    charts: ['/charts/link-sweep-21-equity.png', '/charts/link-sweep-21-r-distribution.png'],
    captions: ['LINKUSDT · #21 equity curve · 2024+ holdout', 'LINKUSDT · #21 net R distribution'],
    files: [['PEPE 결과 요약', 'PEPE result summary', '/assets/pepe-sweep-reclaim-2026-08-04/SUMMARY.md'], ['PEPE 백테스트 코드', 'PEPE backtest code', '/assets/pepe-sweep-reclaim-2026-08-04/backtest_pepe_sweep_configs.py'], ['알트코인 결과 요약', 'Altcoin result summary', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/SUMMARY.md'], ['알트코인 백테스트 코드', 'Altcoin backtest code', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/backtest_alt_sweep_configs.py'], ['알트코인 보류 구간 성과', 'Altcoin holdout metrics', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/holdout_metrics.csv'], ['#21 PEPE 거래', '#21 PEPE trades', '/assets/pepe-sweep-reclaim-2026-08-04/sweep_reclaim_21_pepe_trades.csv'], ['#21 LINK 거래', '#21 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_21_linkusdt_trades.csv'], ['#20 LINK 거래', '#20 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_20_linkusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/pepe-sweep-reclaim-2026-08-04/altcoins/sweep_reclaim_29_linkusdt_trades.csv']],
  },
  {
    id: 'four-hour-fixed-sweep-reclaim', date: '2026-08-04', multiAsset: true, timeframe: '4h',
    name: { ko: '4시간 · Sweep-Reclaim 고정 조합', en: '4-Hour · Fixed Sweep-Reclaim Configurations' },
    desc: { ko: '일봉 연구에서 고른 #21·#20·#29를 재최적화 없이 4시간봉 BTC·ETH·PEPE·XRP·SOL·ADA·AVAX·LINK에 적용했습니다.', en: 'Applied daily-study #21, #20, and #29 to 4-hour BTC, ETH, PEPE, XRP, SOL, ADA, AVAX, and LINK without re-optimization.' },
    status: { ko: '#29가 가장 강했지만 ETH·AVAX·XRP는 음수입니다. 공통 자산 엣지로 채택하기에는 자산별 편차가 큽니다.', en: '#29 is strongest, but ETH, AVAX, and XRP remain negative. Cross-asset dispersion is too large for a universal edge claim.' },
    configs: fourHour,
    charts: ['/charts/four-hour-link-29-equity.png', '/charts/four-hour-link-29-r-distribution.png'],
    captions: ['LINKUSDT · 4h #29 equity curve · 2024+ holdout', 'LINKUSDT · 4h #29 net R distribution'],
    files: [['결과 요약', 'Result summary', '/assets/four-hour-sweep-reclaim-2026-08-04/SUMMARY.md'], ['4시간 백테스트 코드', '4-hour backtest code', '/assets/four-hour-sweep-reclaim-2026-08-04/backtest_4h_fixed_sweep.py'], ['설정 그리드', 'Configuration grid', '/assets/four-hour-sweep-reclaim-2026-08-04/config_grid.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/four-hour-sweep-reclaim-2026-08-04/holdout_metrics.csv'], ['#29 BTC 거래', '#29 BTC trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_btcusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_linkusdt_trades.csv'], ['#29 ADA 거래', '#29 ADA trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_adausdt_trades.csv'], ['#29 PEPE 거래', '#29 PEPE trades', '/assets/four-hour-sweep-reclaim-2026-08-04/sweep_reclaim_29_pepeusdt_trades.csv']],
  },
  {
    id: 'four-hour-fixed-sweep-reclaim-2r', date: '2026-08-04', multiAsset: true, timeframe: '4h',
    name: { ko: '4시간 · Sweep-Reclaim 고정 조합 · 2R', en: '4-Hour · Fixed Sweep-Reclaim Configurations · 2R' },
    desc: { ko: '#20·#21·#29의 나머지 규칙은 유지하고 목표 익절만 3R에서 2R로 낮춘 재검증입니다.', en: 'Re-tested #20, #21, and #29 with every rule unchanged except the profit target, reduced from 3R to 2R.' },
    status: { ko: 'PEPE #29가 +0.17R로 가장 높고 ADA #29가 뒤를 잇습니다. ETH·AVAX·XRP는 모든 조합에서 음수입니다.', en: 'PEPE #29 is highest at +0.17R, followed by ADA #29. ETH, AVAX, and XRP are negative in every configuration.' },
    configs: fourHour2r,
    charts: ['/charts/four-hour-2r-pepe-29-equity.png', '/charts/four-hour-2r-pepe-29-r-distribution.png'],
    captions: ['PEPEUSDT · 4h #29 · 2R equity curve · 2024+ holdout', 'PEPEUSDT · 4h #29 · 2R net R distribution'],
    files: [['결과 요약', 'Result summary', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/SUMMARY.md'], ['4시간 2R 백테스트 코드', '4-hour 2R backtest code', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/backtest_4h_fixed_sweep_2r.py'], ['설정 그리드', 'Configuration grid', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/config_grid.csv'], ['보류 구간 성과', 'Holdout metrics', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/holdout_metrics.csv'], ['#29 PEPE 거래', '#29 PEPE trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_pepeusdt_trades.csv'], ['#29 ADA 거래', '#29 ADA trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_adausdt_trades.csv'], ['#29 BTC 거래', '#29 BTC trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_btcusdt_trades.csv'], ['#29 LINK 거래', '#29 LINK trades', '/assets/four-hour-sweep-reclaim-2r-2026-08-04/sweep_reclaim_29_linkusdt_trades.csv']],
  },
];

const copy = {
  ko: { reports: '리포트 선택', rules: '선택한 조합 규칙', perf: '후보 조합 성과', files: '전략 파일', copied: '복사됨', loading: '파일을 불러오는 중…', failed: '복사하지 못했습니다', support: '지지선', touch: '터치 범위', body: '몸통 비율', close: '종가 위치', trend: '추세 필터', stop: '손절 버퍼', target: '익절 목표', none: '없음', result: '검증 결과', equity: '자산 곡선' },
  en: { reports: 'Select report', rules: 'Selected configuration rules', perf: 'Candidate performance', files: 'Strategy files', copied: 'Copied', loading: 'Loading file…', failed: 'Could not copy', support: 'Support age', touch: 'Touch band', body: 'Body ratio', close: 'Close location', trend: 'Trend filter', stop: 'Stop buffer', target: 'Profit target', none: 'None', result: 'Validation result', equity: 'Equity curves' },
};

let lang = 'ko';
let selectedReport = 'four-hour-fixed-sweep-reclaim-2r';
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
  const isSingleAsset = Boolean(report.symbol);
  const isMultiAsset = Boolean(report.multiAsset);
  const rows = report.configs.map((config) => {
    if (isMultiAsset) {
      const assetRows = Object.entries(config.assets).map(([symbol, values]) => `<tr class="${selectedId === config.id ? 'selected' : ''}"><td><button class="config-select" data-id="${config.id}">#${config.id}</button></td><td>${symbol}</td><td>${values[0]}</td><td>${values[1].toFixed(1)}%</td><td>${values[2] >= 0 ? '+' : ''}${values[2].toFixed(2)}R</td><td>${values[3].toFixed(2)}</td></tr>`).join('');
      const detail = selectedId === config.id ? `<tr class="config-detail-row"><td colspan="6"><div class="config-grid">${ruleCards(config.rules, t)}</div></td></tr>` : '';
      return assetRows + detail;
    }
    const cells = isSingleAsset
      ? `<td>${config.pepe[0]}</td><td>${config.pepe[1].toFixed(1)}%</td><td>${config.pepe[2] >= 0 ? '+' : ''}${config.pepe[2].toFixed(2)}R</td><td>${config.pepe[3].toFixed(2)}</td>`
      : `<td>${config.btc[0]} / ${config.eth[0]}</td><td>${config.btc[1]}% / ${config.eth[1]}%</td><td>+${config.btc[2].toFixed(2)}R / +${config.eth[2].toFixed(2)}R</td><td>${config.btc[3].toFixed(2)} / ${config.eth[3].toFixed(2)}</td>`;
    return `<tr class="${selectedId === config.id ? 'selected' : ''}"><td><button class="config-select" data-id="${config.id}">#${config.id}</button></td>${cells}</tr>${selectedId === config.id ? `<tr class="config-detail-row"><td colspan="5"><div class="config-grid">${ruleCards(config.rules, t)}</div></td></tr>` : ''}`;
  }).join('');

  const marketLabel = isMultiAsset ? 'PEPEUSDT / SOLUSDT / XRPUSDT / LINKUSDT / ADAUSDT / AVAXUSDT' : report.symbol || 'BTCUSDT / ETHUSDT';
  const tableLabels = isMultiAsset ? '<th>Config</th><th>Asset</th><th>Trades</th><th>Win rate</th><th>Expectancy R</th><th>PF</th>' : isSingleAsset ? '<th>Config</th><th>Trades</th><th>Win rate</th><th>Expectancy R</th><th>PF</th>' : '<th>Config</th><th>Trades<br>BTC / ETH</th><th>Win rate<br>BTC / ETH</th><th>Expectancy R<br>BTC / ETH</th><th>PF<br>BTC / ETH</th>';
  document.querySelector('#app').innerHTML = `<div class="wrap"><nav><span class="brand">BT LAB<span>BACKTEST RESEARCH</span></span><div class="nav-controls"><label class="report-control">${t.reports}<select id="report">${reports.map((item) => `<option value="${item.id}" ${item.id === report.id ? 'selected' : ''}>${item.name[lang]} · ${item.date}</option>`).join('')}</select></label><div id="language-toggle" role="group" aria-label="Language"><button type="button" data-lang="ko" class="${lang === 'ko' ? 'active' : ''}" aria-pressed="${lang === 'ko'}">KR</button><button type="button" data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-pressed="${lang === 'en'}">EN</button></div></div></nav><p class="eyebrow">${marketLabel} · ${report.timeframe || 'Daily'} <span class="date-chip">${report.date}</span></p><h1>${report.name[lang]}</h1><p class="sub">${report.desc[lang]}</p><div class="banner"><b>${t.result}</b> ${report.status[lang]}</div><section><h2>${t.rules}: #${selectedId}</h2><div class="rules">${ruleCards(activeConfig.rules, t)}</div></section><section><h2>${t.equity}</h2><div class="charts">${report.charts.map((path, index) => `<figure><img src="${path}" alt="${t.equity}"/><figcaption>${report.captions[index]}</figcaption></figure>`).join('')}</div></section><section><h2>${t.perf}</h2><div class="table-wrap"><table><thead><tr>${tableLabels}</tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>${t.files}</h2><div class="file-layout"><div class="file-list">${report.files.map(([ko, en, path]) => `<button type="button" class="file-select" data-path="${path}">${lang === 'ko' ? ko : en}</button>`).join('')}</div><div class="file-viewer"><div class="file-toolbar"><b id="file-name"></b><button type="button" id="copy-file" class="icon-button" aria-label="${t.copied}" title="${t.copied}"><span aria-hidden="true">⧉</span></button></div><pre id="file-content">${t.loading}</pre><p id="copy-status" class="sr-only" aria-live="polite"></p></div></div></section></div>`;

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

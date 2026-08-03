const configurations = [
  { id: 5016, btc: { trades: 18, winRate: 27.8, expectancy: 0.07, pf: 1.09 }, eth: { trades: 11, winRate: 36.4, expectancy: 0.42, pf: 1.66 }, rules: { supportAge: 60, touchBand: 0.75, bodyRatio: 50, closeTop: 30, trendSma: 100, volume: null, stopBuffer: 0.10, targetR: 3.0 } },
  { id: 4970, btc: { trades: 33, winRate: 27.3, expectancy: 0.06, pf: 1.08 }, eth: { trades: 24, winRate: 37.5, expectancy: 0.46, pf: 1.73 }, rules: { supportAge: 60, touchBand: 0.75, bodyRatio: 30, closeTop: 30, trendSma: null, volume: null, stopBuffer: 0.50, targetR: 3.0 } },
  { id: 3350, btc: { trades: 23, winRate: 26.1, expectancy: 0.02, pf: 1.03 }, eth: { trades: 17, winRate: 41.2, expectancy: 0.60, pf: 2.02 }, rules: { supportAge: 40, touchBand: 0.50, bodyRatio: 30, closeTop: 30, trendSma: null, volume: null, stopBuffer: 0.50, targetR: 3.0 } },
  { id: 4898, btc: { trades: 19, winRate: 26.3, expectancy: 0.03, pf: 1.05 }, eth: { trades: 13, winRate: 46.2, expectancy: 0.81, pf: 2.51 }, rules: { supportAge: 60, touchBand: 0.75, bodyRatio: 50, closeTop: 20, trendSma: null, volume: null, stopBuffer: 0.50, targetR: 3.0 } },
  { id: 5114, btc: { trades: 29, winRate: 24.1, expectancy: -0.05, pf: 0.93 }, eth: { trades: 20, winRate: 45.0, expectancy: 0.76, pf: 2.38 }, rules: { supportAge: 60, touchBand: 0.75, bodyRatio: 50, closeTop: 40, trendSma: null, volume: null, stopBuffer: 0.50, targetR: 3.0 } },
];

const copy = {
  ko: {
    dashboard: "백테스트 리서치 랩", subtitle: "BTC/ETH 일봉 지지선 반등 전략 연구. 이후 전략 연구도 같은 구조로 추가할 수 있습니다.",
    source: "Binance 현물 · 일봉 · 아웃오브샘플 홀드아웃", result: "결과: 공통 합격 규칙을 찾지 못했습니다.",
    resultDetail: "BTC와 ETH 모두 홀드아웃 승률 60%, 목표 3R, 양의 기대값, PF 1 초과, 최소 15회 거래를 충족해야 했습니다.",
    grid: "그리드 탐색", eligible: "개발 구간 통과", tested: "홀드아웃 테스트", qualified: "합격", rules: "전략 공통 규칙",
    ruleItems: ["좌우 3봉으로 확정된 스윙 저점 지지선", "오른쪽 3개 일봉 마감 후에만 지지선을 사용", "양봉이며 종가가 일중 범위 상위 구간에 위치", "다음 날 시가 진입, 동시 포지션 1개", "편도 불리한 슬리피지 0.03%, 왕복 수수료 0.10%", "하루 안에 손절·익절이 동시에 닿으면 손절 우선"],
    inspector: "선택한 조합 규칙", inspectorDetail: "클릭한 조합의 실제 최적화 파라미터입니다. 성과는 2024년 이후 홀드아웃 기준입니다.",
    supportAge: "지지선 사용 기간", touchBand: "지지선 터치 허용폭", bodyRatio: "최소 몸통 비율", closeTop: "종가 위치", trendSma: "추세 필터", volume: "거래량 필터", stopBuffer: "손절 여유폭", targetR: "익절 목표",
    bars: "가까운 조합 — 두 자산 중 낮은 승률", barDetail: "목표: BTC와 ETH 모두 60% 이상. 막대는 두 자산 중 낮은 승률입니다.",
    details: "근접 조합 성과", detailsHelp: "BTC / ETH 순서입니다. 기대값은 거래당 순 R, PF는 총 이익 R ÷ 총 손실 R입니다. 조합 번호를 클릭하면 규칙을 확인할 수 있습니다.",
    config: "조합", trades: "거래 수", winRate: "승률", expectancy: "기대값 R", pf: "PF", noFilter: "없음", barsUnit: "봉", top: "상위", below: "신호봉 저가 아래", sma: "종가 > SMA", equity: "#5016 실제 홀드아웃 자산곡선", equityDetail: "수수료와 슬리피지 차감 후 누적 R입니다. 이 그래프는 #5016 조합에만 해당합니다.",
  },
  en: {
    dashboard: "Backtest Research Lab", subtitle: "BTC/ETH daily support-bounce research, ready to host additional strategy studies.",
    source: "Binance spot · daily candles · out-of-sample holdout", result: "Result: no qualifying common rule found.",
    resultDetail: "Both BTC and ETH required 60% holdout win rate, 3R target, positive expectancy, PF above 1, and at least 15 trades.",
    grid: "Grid searched", eligible: "Development eligible", tested: "Holdout tested", qualified: "Qualified", rules: "Shared strategy rules",
    ruleItems: ["3-left / 3-right confirmed swing-low support", "Support is usable only after the right three daily closes", "Bullish candle closing in the upper part of its range", "Enter at next-day open; one position maximum", "0.03% adverse slippage per side; 0.10% round-trip fees", "If stop and target both occur intraday, resolve to stop"],
    inspector: "Selected configuration rules", inspectorDetail: "Actual optimization parameters for the selected configuration. Metrics use the 2024+ holdout.",
    supportAge: "Support age", touchBand: "Touch band", bodyRatio: "Minimum body ratio", closeTop: "Close location", trendSma: "Trend filter", volume: "Volume filter", stopBuffer: "Stop buffer", targetR: "Profit target",
    bars: "Closest configurations — weaker asset win rate", barDetail: "Target: BTC and ETH both at least 60%. Each bar is the weaker asset.",
    details: "Near-miss performance", detailsHelp: "BTC / ETH order. Expectancy is net R per trade; PF is gross winning R divided by gross losing R. Click a configuration ID to inspect its rules.",
    config: "Config", trades: "Trades", winRate: "Win rate", expectancy: "Expectancy R", pf: "PF", noFilter: "None", barsUnit: "bars", top: "Top", below: "below signal low", sma: "Close > SMA", equity: "#5016 actual holdout equity curves", equityDetail: "Cumulative net R after fees and slippage. These charts apply to #5016 only.",
  },
};

let selectedId = 5016;
let language = "ko";
const formatR = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
const ruleRows = (rules, t) => [
  [t.supportAge, `${rules.supportAge} ${t.barsUnit}`], [t.touchBand, `±${rules.touchBand.toFixed(2)}%`],
  [t.bodyRatio, `≥ ${rules.bodyRatio}%`], [t.closeTop, `${t.top} ${rules.closeTop}%`],
  [t.trendSma, rules.trendSma ? `${t.sma} ${rules.trendSma}` : t.noFilter], [t.volume, t.noFilter],
  [t.stopBuffer, `${rules.stopBuffer.toFixed(2)}% ${t.below}`], [t.targetR, `${rules.targetR.toFixed(1)}R`],
].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");

function renderDashboard() {
  const t = copy[language];
  const selected = configurations.find((item) => item.id === selectedId);
  const rows = configurations.map((item) => `<tr class="${item.id === selectedId ? "selected" : ""}"><td><button class="config-select" data-id="${item.id}" aria-pressed="${item.id === selectedId}">#${item.id}</button></td><td>${item.btc.trades} / ${item.eth.trades}</td><td>${item.btc.winRate.toFixed(1)}% / ${item.eth.winRate.toFixed(1)}%</td><td>${formatR(item.btc.expectancy)} / ${formatR(item.eth.expectancy)}</td><td>${item.btc.pf.toFixed(2)} / ${item.eth.pf.toFixed(2)}</td></tr>`).join("");
  const bars = configurations.map((item) => { const weaker = Math.min(item.btc.winRate, item.eth.winRate); return `<div class="bar-row"><button class="config-select bar-label" data-id="${item.id}">#${item.id}</button><div class="track"><div class="bar" style="width:${weaker}%"></div></div><span>${weaker.toFixed(1)}%</span></div>`; }).join("");
  document.querySelector("#app").innerHTML = `<div class="wrap"><nav><span class="brand">BT LAB</span><div id="language-toggle" aria-label="Language"><button class="language-button ${language === "ko" ? "active" : ""}" data-language="ko" aria-pressed="${language === "ko"}">KR</button><button class="language-button ${language === "en" ? "active" : ""}" data-language="en" aria-pressed="${language === "en"}">EN</button></div></nav><p class="eyebrow">${t.source}</p><h1>${t.dashboard}</h1><p class="sub">${t.subtitle}</p><div class="banner"><b>${t.result}</b> ${t.resultDetail}</div><section class="metrics"><div><span>${t.grid}</span><b>5,184</b></div><div><span>${t.eligible}</span><b>34</b></div><div><span>${t.tested}</span><b>20</b></div><div><span>${t.qualified}</span><b class="bad">0</b></div></section><section><h2>${t.rules}</h2><div class="rules">${t.ruleItems.map((rule) => `<div>${rule}</div>`).join("")}</div></section><section id="config-inspector"><h2>${t.inspector}: #${selected.id}</h2><p class="muted">${t.inspectorDetail}</p><div class="config-grid">${ruleRows(selected.rules, t)}</div></section><section><h2>${t.equity}</h2><p class="muted">${t.equityDetail}</p><div class="charts"><figure><img src="/charts/config-5016-btc-equity.png" alt="BTC cumulative R equity curve for config 5016" /><figcaption>BTCUSDT — 18 ${t.trades} — +0.07R — PF 1.09</figcaption></figure><figure><img src="/charts/config-5016-eth-equity.png" alt="ETH cumulative R equity curve for config 5016" /><figcaption>ETHUSDT — 11 ${t.trades} — +0.42R — PF 1.66</figcaption></figure></div></section><section><h2>${t.bars}</h2><p class="target">${t.barDetail}</p><div class="chart">${bars}</div></section><section><h2>${t.details}</h2><p class="muted">${t.detailsHelp}</p><div class="table-wrap"><table><thead><tr><th>${t.config}</th><th>${t.trades}</th><th>${t.winRate}</th><th>${t.expectancy}</th><th>${t.pf}</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
  document.querySelectorAll(".config-select").forEach((button) => button.addEventListener("click", () => { selectedId = Number(button.dataset.id); renderDashboard(); document.querySelector("#config-inspector").scrollIntoView({ behavior: "smooth", block: "start" }); }));
  document.querySelectorAll(".language-button").forEach((button) => button.addEventListener("click", () => { language = button.dataset.language; renderDashboard(); }));
}

renderDashboard();

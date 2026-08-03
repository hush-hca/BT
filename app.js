const configurations = [
  [5016, 27.8, 36.4, 0.07, 0.42, 1.09, 1.66, 18, 11],
  [4970, 27.3, 37.5, 0.06, 0.46, 1.08, 1.73, 33, 24],
  [3350, 26.1, 41.2, 0.02, 0.60, 1.03, 2.02, 23, 17],
  [4898, 26.3, 46.2, 0.03, 0.81, 1.05, 2.51, 19, 13],
  [5114, 24.1, 45.0, -0.05, 0.76, 0.93, 2.38, 29, 20],
];

const formatR = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
const bars = configurations.map(([id, btc, eth]) => {
  const weaker = Math.min(btc, eth);
  return `<div class="bar-row"><b>#${id}</b><div class="track"><div class="bar" style="width:${weaker}%"></div></div><span>${weaker.toFixed(1)}%</span></div>`;
}).join("");

const rows = configurations.map(([id, btc, eth, btcR, ethR, btcPf, ethPf, btcTrades, ethTrades]) => `
  <tr>
    <td><b>#${id}</b></td><td>${btcTrades} / ${ethTrades}</td><td>${btc}% / ${eth}%</td>
    <td>${formatR(btcR)} / ${formatR(ethR)}</td><td>${btcPf.toFixed(2)} / ${ethPf.toFixed(2)}</td>
  </tr>`).join("");

document.querySelector("#app").innerHTML = `
  <div class="wrap">
    <p class="eyebrow">Binance spot · daily candles · out-of-sample holdout</p>
    <h1>Backtest Research Lab</h1>
    <p class="sub">BTC/ETH daily support-bounce research. This dashboard is structured to accommodate future strategy studies.</p>
    <div class="banner"><b>Result: no qualifying common rule found.</b> Both BTC and ETH required a 60% holdout win rate, 3R target, positive expectancy, PF above 1, and at least 15 trades.</div>
    <section class="metrics"><div><span>Grid searched</span><b>5,184</b></div><div><span>Development eligible</span><b>34</b></div><div><span>Holdout tested</span><b>20</b></div><div><span>Qualified</span><b class="bad">0</b></div></section>
    <section><h2>Strategy rules</h2><div class="rules"><div>3-left / 3-right confirmed swing-low support</div><div>Support is usable only after the right three daily closes</div><div>Bullish candle closes in the top 30% of its range</div><div>Enter at the next day's open; maximum one open position</div><div>0.03% adverse slippage per side; 0.10% round-trip fees</div><div>If stop and target both occur intraday, resolve to stop</div></div></section>
    <section><h2>Config #5016 — exact near-miss rule set</h2><p class="muted">Closest common near-miss by the weaker BTC/ETH win rate. It is not qualified: BTC 27.8%; ETH 36.4%.</p><div class="rules config"><div><span>Support age</span><b>60 bars</b></div><div><span>Touch band</span><b>±0.75%</b></div><div><span>Body size</span><b>≥ 50% of range</b></div><div><span>Close location</span><b>Top 30%</b></div><div><span>Trend filter</span><b>Close &gt; SMA 100</b></div><div><span>Volume filter</span><b>None</b></div><div><span>Stop buffer</span><b>0.10% below signal low</b></div><div><span>Target</span><b>3.0R</b></div></div></section>
    <section><h2>Config #5016 — actual holdout equity curves</h2><p class="muted">Cumulative net R after fees and slippage from the actual 2024+ trade logs.</p><div class="charts"><figure><img src="/charts/config-5016-btc-equity.png" alt="BTC cumulative R equity curve for config 5016" /><figcaption>BTCUSDT — 18 trades — +0.07R expectancy — PF 1.09</figcaption></figure><figure><img src="/charts/config-5016-eth-equity.png" alt="ETH cumulative R equity curve for config 5016" /><figcaption>ETHUSDT — 11 trades — +0.42R expectancy — PF 1.66</figcaption></figure></div></section>
    <section><h2>Closest configurations — weaker asset win rate</h2><p class="target">Target: both BTC and ETH ≥ 60%. Each bar is the weaker asset in its pair.</p><div class="chart">${bars}</div></section>
    <section><h2>Near-miss detail</h2><p class="muted">BTC / ETH. Expectancy is net R per trade; PF is gross winning R divided by gross losing R.</p><div class="table-wrap"><table><thead><tr><th>Config</th><th>Trades</th><th>Win rate</th><th>Expectancy R</th><th>PF</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  </div>`;

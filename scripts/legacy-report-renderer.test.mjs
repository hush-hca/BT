import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reportRuleCards, resolveMarketLabel, ruleCards } from '../app.js';

const translations = {
  support: 'Support age',
  touch: 'Touch band',
  body: 'Body ratio',
  close: 'Close location',
  trend: 'Trend filter',
  stop: 'Stop buffer',
  target: 'Profit target',
  none: 'None',
};

test('renders exact bilingual custom rules', () => {
  const report = {
    customRules: [
      { label: { ko: '진입', en: 'Entry' }, value: { ko: '넥라인 재시험', en: 'Neckline retest' } },
      { label: { ko: '목표', en: 'Target' }, value: { ko: '2R 익절', en: 'Take profit at 2R' } },
    ],
  };

  assert.equal(
    reportRuleCards(report, { rules: [] }, 'ko', translations),
    '<div><span>진입</span><b>넥라인 재시험</b></div><div><span>목표</span><b>2R 익절</b></div>',
  );
  assert.equal(
    reportRuleCards(report, { rules: [] }, 'en', translations),
    '<div><span>Entry</span><b>Neckline retest</b></div><div><span>Target</span><b>Take profit at 2R</b></div>',
  );
});

test('escapes unsafe custom rule labels and values', () => {
  const report = {
    customRules: [{
      label: { en: '<img src=x onerror="alert(1)">', ko: '안전' },
      value: { en: "A&B's <script>", ko: '안전' },
    }],
  };

  assert.equal(
    reportRuleCards(report, { rules: [] }, 'en', translations),
    '<div><span>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</span><b>A&amp;B&#39;s &lt;script&gt;</b></div>',
  );
});

test('preserves the legacy rule-card fallback output', () => {
  const activeConfig = { rules: [60, 0.75, 50, 30, 100, 0.10, 3] };
  const expected = '<div><span>Support age</span><b>60 bars (3-left / 3-right swing low)</b></div><div><span>Touch band</span><b>±0.75%</b></div><div><span>Body ratio</span><b>≥ 50% of range</b></div><div><span>Close location</span><b>Top 30%</b></div><div><span>Trend filter</span><b>Close > SMA 100</b></div><div><span>Stop buffer</span><b>0.10% below signal low</b></div><div><span>Profit target</span><b>3.0R</b></div>';

  assert.equal(ruleCards(activeConfig.rules, translations), expected);
  assert.equal(reportRuleCards({}, activeConfig, 'en', translations), expected);
});

test('resolves explicit market labels before existing fallbacks', () => {
  assert.equal(resolveMarketLabel({ marketLabel: 'BTC / ETH / SOL' }, true), 'BTC / ETH / SOL');
  assert.equal(resolveMarketLabel({}, true), 'PEPEUSDT / SOLUSDT / XRPUSDT / LINKUSDT / ADAUSDT / AVAXUSDT');
  assert.equal(resolveMarketLabel({ symbol: 'PEPEUSDT' }, false), 'PEPEUSDT');
  assert.equal(resolveMarketLabel({}, false), 'BTCUSDT / ETHUSDT');
});

test('both actual legacy rule render sites use reportRuleCards', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /config-detail-row[^\n]+reportRuleCards\(report, config, lang, t\)/);
  assert.match(source, /class="rules">\$\{reportRuleCards\(report, activeConfig, lang, t\)\}/);
  assert.doesNotMatch(source, /config-detail-row[^\n]+\$\{ruleCards\(/);
  assert.doesNotMatch(source, /class="rules">\$\{ruleCards\(/);
});

test('existing reports retain their legacy rule arrays', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /const baseline = \[/);
  assert.match(source, /rules: \[60, 0\.75, 50, 30, 100, 0\.10, 3\]/);
});

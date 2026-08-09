const test = require('node:test');
const assert = require('node:assert/strict');
const { clusterBootstrap, holmAdjust, artifactErrors, addStageInference, determineOutcome, buildReport, parseArgs } = require('./1d-bulls2-six-hour-report.cjs');

test('cluster bootstrap resamples whole detectedAt groups deterministically', () => {
  const trades = [
    { detectedAt: 1, netR: 2 }, { detectedAt: 1, netR: -1 },
    { detectedAt: 2, netR: 0.5 }, { detectedAt: 3, netR: -0.25 },
  ];
  const a = clusterBootstrap(trades, { iterations: 2000, seed: 972 });
  const b = clusterBootstrap(trades, { iterations: 2000, seed: 972 });
  assert.equal(a.unit, 'detectedAt');
  assert.equal(a.clusterCount, 3);
  assert.deepEqual(a, b);
  assert.ok(a.ci95[0] <= a.mean && a.mean <= a.ci95[1]);
});

test('Holm correction is sequential and preserves input order and IDs', () => {
  assert.deepEqual(holmAdjust([0.001, 0.01, 0.04], 0.05).map(x => x.reject), [true, true, true]);
  const rows = holmAdjust([{ id:'c', pValue:0.04 }, { id:'a', pValue:0.001 }, { id:'b', pValue:0.01 }]);
  assert.deepEqual(rows.map(x => x.id), ['c', 'a', 'b']);
  assert.deepEqual(rows.map(x => x.adjustedP), [0.04, 0.003, 0.02]);
});

function metrics(overrides = {}) {
  return { tradeCount:50, filledTrades:50, eligibleSignals:80, fillRate:.625, expectancy:.2,
    profitFactor:1.4, medianR:.1, winRate:.55, maxDrawdownR:4, consecutiveLosses:3,
    meanHoldingHours:3.1, medianHoldingHours:3, feeR:1.2, slippageR:.8,
    yearly:{ 2024:{tradeCount:25,netR:3,expectancy:.12,profitFactor:1.3}, 2025:{tradeCount:25,netR:7,expectancy:.28,profitFactor:1.5} }, ...overrides };
}
function qualified() {
  const definitions = Array.from({length:10}, (_,i) => ({id:`c${String(i+1).padStart(2,'0')}`, name:`Combination ${i+1}`}));
  const stageInference={ci95:[.04,.3],pValue:.001,adjustedP:.01,reject:true};
  const development = definitions.map(x => ({id:x.id,status:'evaluated',passed:true,metrics:metrics(),rejectionReasons:[],inference:{...stageInference}}));
  const validation = definitions.map(x => ({id:x.id,status:'evaluated',passed:true,metrics:metrics(),rejectionReasons:[],inference:{...stageInference}}));
  const holdout = definitions.map((x,i) => ({id:x.id,status:'evaluated',metrics:metrics(),rejectionReasons:[],
    matchedBaseline:{combinationId:'c01',metrics:metrics({expectancy:.1,profitFactor:1.25})},
    inference:{ci95:[.05,.35],pValue:i === 0 ? .001 : .5,adjustedP:i === 0 ? .01 : 1,reject:i === 0}}));
  return { metadata:{generatedAt:'2026-08-09T00:00:00Z',scope:{signalType:'0Day',minimumScore:40,combinations:10},splitCounts:{development:600,validation:200,holdout:200}}, definitions, development, validation, holdout, ledger:[], failures:[] };
}

test('fails closed on development-only artifacts', () => {
  const a = qualified(); a.validation = []; a.holdout = [];
  assert.equal(determineOutcome(a).status, 'INCONCLUSIVE');
});

test('promotes only a fully qualified corrected holdout result', () => {
  const a = qualified();
  assert.equal(determineOutcome(a).status, 'PROMOTE');
  a.holdout[0].matchedBaseline = null;
  assert.equal(determineOutcome(a).status, 'INCONCLUSIVE');
});

test('promotion is bound to the same validation-qualified combination', () => {
  const a = qualified();
  a.validation.find(x => x.id === 'c01').passed = false;
  assert.equal(determineOutcome(a).status, 'NO ROBUST SIX-HOUR EDGE');
});

test('validation pass with sealed holdout is inconclusive', () => {
  const a = qualified();
  a.holdout[0] = { id:'c01', status:'sealed', metrics:null, rejectionReasons:['unexpected-seal'] };
  assert.equal(determineOutcome(a).status, 'INCONCLUSIVE');
});

test('report is complete and calls sealed holdout truthfully', () => {
  const a = qualified();
  a.holdout[0] = { id:'c01', status:'sealed', metrics:null, rejectionReasons:['validation-gate-failed'] };
  const report = buildReport(a);
  assert.match(report, /holdout remained sealed/i);
  assert.doesNotMatch(report, /c01[^\n]*holdout expectancy was negative/i);
  assert.match(report, /All ten preregistered combinations/);
  assert.match(report, /Fill rate/);
  assert.match(report, /Matched baseline/);
  assert.match(report, /Holm/);
  assert.match(report, /Fees \(R\)/);
  assert.match(report, /3\.100\/3\.000/);
  assert.match(report, /1\.200/);
  assert.match(report, /0\.800/);
  assert.match(report, /c01 Combination 1 \| development[^\n]*0\.040 to 0\.300[^\n]*0\.0100 \(reject\)/);
  assert.match(report, /c01 Combination 1 \| validation[^\n]*0\.040 to 0\.300[^\n]*0\.0100 \(reject\)/);
  assert.match(report, /c01 Combination 1 \| holdout \| sealed[^\n]*\| N\/A \| N\/A \| validation-gate-failed/);
  assert.doesNotMatch(report, /c01 Combination 1 \| holdout \| sealed[^\n]*not reject/);
});

test('adds separate ten-hypothesis inference to every evaluated row in a stage', () => {
  const rows=Array.from({length:10},(_,i)=>({id:`c${String(i+1).padStart(2,'0')}`,status:'evaluated',rejectionReasons:[]}));
  const ledger=rows.flatMap((row,i)=>[
    {combinationId:row.id,stage:'development',detectedAt:100+i,netR:.2},
    {combinationId:row.id,stage:'development',detectedAt:200+i,netR:.4},
    {combinationId:row.id,stage:'validation',detectedAt:300+i,netR:-9},
  ]);
  const enriched=addStageInference(rows,ledger,'development');
  assert.equal(enriched.length,10);
  assert.ok(enriched.every(x=>x.inference.unit==='detectedAt' && Number.isFinite(x.inference.adjustedP)));
  assert.ok(enriched.every(x=>x.inference.ci95[0]>0));
});

test('renders explicit bootstrap and Holm rejection reasons', () => {
  const a = qualified();
  a.holdout[1].inference = {ci95:[-.1,.2],pValue:.2,adjustedP:1,reject:false};
  const report = buildReport(a);
  assert.match(report, /bootstrap-ci-not-strictly-positive/);
  assert.match(report, /holm-adjusted-hypothesis-not-rejected/);
});

test('fails closed on malformed, duplicate, missing, or stale result IDs', () => {
  for (const mutate of [
    a => a.definitions.pop(),
    a => { a.definitions[9].id = 'c01'; },
    a => a.validation.pop(),
    a => { a.holdout[9].id = 'stale-id'; },
  ]) {
    const a=qualified(); mutate(a);
    assert.ok(artifactErrors(a).length);
    assert.equal(determineOutcome(a).status, 'INCONCLUSIVE');
    assert.throws(() => buildReport(a), /Malformed or stale/);
  }
});

test('requires input and report CLI paths', () => {
  assert.deepEqual(parseArgs(['--input','a','--report','b']), {input:'a',report:'b'});
  assert.throws(() => parseArgs(['--input','a']), /Usage/);
});

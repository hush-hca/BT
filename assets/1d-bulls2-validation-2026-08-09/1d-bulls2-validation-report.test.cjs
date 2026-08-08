'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeScoreBands, evaluateExecutionFilter, splitChronologically, selectBulls3Candidate, markdownReport } = require('./1d-bulls2-validation-report.cjs');

function row({ type = '0Day', score = 70, at = 1, relVol = 1.5, r7 = 3, r14 = 4, mae7 = -2, mae14 = -2 } = {}) {
  return { signalType: type, score, detectedAt: at, relVol, quoteVolume: 2_000_000, support: 100, entry: { price: 102 }, outcomes: { '7d': { returnPercent: r7, mfePercent: r7 + 1, maePercent: mae7 }, '14d': { returnPercent: r14, mfePercent: r14 + 1, maePercent: mae14 } } };
}
test('keeps 0Day and 1Day score distributions separate', () => {
  const rows = Array.from({ length: 30 }, (_, index) => row({ type: '0Day', score: 20 + (index % 2) }));
  rows.push(row({ type: '1Day', score: 20 }));
  const report = summarizeScoreBands(rows, '0Day');
  assert.equal(report.signalType, '0Day'); assert.equal(report.bands[0].metrics['7d'].sampleSize, 30);
});
test('uses quantile bands when a fixed nonempty band has under 30 samples', () => assert.equal(summarizeScoreBands([row({ type: '1Day', score: 70 })], '1Day').bandMethod, 'quantile'));
test('rejects a filter that raises 7d return but worsens 14d MAE', () => {
  const rows = [row({ relVol: 1, r7: 1, r14: 1, mae7: -1, mae14: -1 }), row({ relVol: 2, r7: 8, r14: 8, mae7: -1, mae14: -5 })];
  assert.equal(evaluateExecutionFilter(rows, value => value.relVol >= 1.5).eligible, false);
});
test('splits the last chronological 20 percent into holdout', () => { const result = splitChronologically([row({ at: 3 }), row({ at: 1 }), row({ at: 2 }), row({ at: 4 }), row({ at: 5 })]); assert.equal(result.train.length, 4); assert.equal(result.holdout[0].detectedAt, 5); });
test('skips missing contextual filters without fabricating evidence', () => { const report = markdownReport({ observations: [row()], metadata: {}, failures: [] }); assert.match(report, /skipped: missing contextual field/); });
test('does not promote a small holdout', () => { const report = selectBulls3Candidate(Array.from({ length: 20 }, (_, i) => row({ at: i, score: 70 })), { signalType: '0Day' }); assert.equal(report.promoted, false); });
test('does not use holdout performance to choose the frozen train candidate', () => {
  const rows = [];
  // Train: relative-volume wins. Liquidity is weak during train.
  for (let index = 0; index < 120; index += 1) rows.push({ ...row({ at: index, relVol: 2, r7: 4, r14: 4, mae7: -1, mae14: -1 }), quoteVolume: 500_000 });
  for (let index = 120; index < 240; index += 1) rows.push({ ...row({ at: index, relVol: .5, r7: 0, r14: 0, mae7: -2, mae14: -2 }), quoteVolume: 2_000_000 });
  // Holdout reverses the apparent winner; it must not influence selection.
  for (let index = 240; index < 270; index += 1) rows.push({ ...row({ at: index, relVol: 2, r7: 0, r14: 0, mae7: -2, mae14: -2 }), quoteVolume: 500_000 });
  for (let index = 270; index < 300; index += 1) rows.push({ ...row({ at: index, relVol: .5, r7: 100, r14: 100, mae7: 0, mae14: 0 }), quoteVolume: 2_000_000 });
  const result = selectBulls3Candidate(rows, { signalType: '0Day' });
  assert.deepEqual(result.candidate.config, { minimumScore: 0, filters: ['relative-volume-range'] });
});
test('blocks promotion when the universe provenance is ineligible', () => {
  const rows = Array.from({ length: 300 }, (_, index) => row({ at: index, score: 70, relVol: index % 2 ? 2 : .5, r7: index % 2 ? 4 : 0, r14: index % 2 ? 4 : 0, mae7: index % 2 ? -1 : -2, mae14: index % 2 ? -1 : -2 }));
  const result = selectBulls3Candidate(rows, { signalType: '0Day', promotionEligible: false });
  assert.equal(result.promoted, false); assert.equal(result.promotionEligible, false);
});
test('rejects a tiny high-return configuration before train selection', () => {
  const rows = Array.from({ length: 300 }, (_, index) => row({ at: index, score: index < 4 ? 99 : 40, relVol: .5, r7: index < 4 ? 100 : 0, r14: index < 4 ? 100 : 0, mae7: index < 4 ? 0 : -2, mae14: index < 4 ? 0 : -2 }));
  const result = selectBulls3Candidate(rows, { signalType: '0Day' });
  assert.notEqual(result.candidate?.config.minimumScore, 80);
});
test('includes score-only configurations and compares score against all rows', () => {
  const rows = Array.from({ length: 300 }, (_, index) => {
    const highScore = index % 2 === 0;
    const value = row({ at: index, score: highScore ? 85 : 20, r7: highScore ? 5 : 0, r14: highScore ? 5 : 0, mae7: highScore ? -1 : -2, mae14: highScore ? -1 : -2 });
    delete value.relVol; delete value.quoteVolume;
    return value;
  });
  const result = selectBulls3Candidate(rows, { signalType: '0Day' });
  assert.deepEqual(result.candidate.config, { minimumScore: 40, filters: [] });
  assert.equal(result.candidate.train.baseline['7d'].sampleSize, 240);
  assert.equal(result.candidate.train.sampleSize, 120);
});
function scoreEdgeRows(highOutcome) {
  return Array.from({ length: 400 }, (_, index) => {
    const highScore = index % 2 === 0;
    const outcome = highScore ? highOutcome(index / 2) : -3;
    const value = row({ at: index, score: highScore ? 85 : 20, r7: outcome, r14: outcome, mae7: highScore ? -1 : -2, mae14: highScore ? -1 : -2 });
    delete value.relVol; delete value.quoteVolume;
    return value;
  });
}
test('does not promote a negative median return that is only relatively better', () => {
  const result = selectBulls3Candidate(scoreEdgeRows(() => -1), { signalType: '0Day' });
  assert.equal(result.candidate.holdout.eligible, true);
  assert.equal(result.candidate.holdout.metrics['7d'].medianReturn, -1);
  assert.equal(result.promoted, false);
});
test('does not promote a positive median with a 50 percent win rate', () => {
  const result = selectBulls3Candidate(scoreEdgeRows(index => index % 2 ? 0 : 2), { signalType: '0Day' });
  assert.equal(result.candidate.holdout.eligible, true);
  assert.equal(result.candidate.holdout.metrics['7d'].medianReturn, 1);
  assert.equal(result.candidate.holdout.metrics['7d'].winRate, .5);
  assert.equal(result.promoted, false);
});

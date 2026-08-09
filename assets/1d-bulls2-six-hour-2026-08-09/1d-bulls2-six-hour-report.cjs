const fs = require('node:fs/promises');
const path = require('node:path');

function rng(seed) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function quantile(sorted, q) { if (!sorted.length) return null; const p=(sorted.length-1)*q, lo=Math.floor(p), hi=Math.ceil(p); return sorted[lo]+(sorted[hi]-sorted[lo])*(p-lo); }
function clusterBootstrap(trades, { iterations=10000, seed=972 }={}) {
  const groups = new Map();
  for (const trade of trades || []) { const key=String(trade.detectedAt); if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(Number(trade.netR)); }
  const clusters=[...groups.values()], values=clusters.flat(), mean=values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  if (!clusters.length) return { unit:'detectedAt', clusterCount:0, iterations, seed, mean:null, ci95:[null,null], pValue:null };
  const random=rng(seed), means=[];
  for (let i=0;i<iterations;i++) { let sum=0,n=0; for (let j=0;j<clusters.length;j++) { const c=clusters[Math.floor(random()*clusters.length)]; for(const v of c){sum+=v;n++;} } means.push(sum/n); }
  means.sort((a,b)=>a-b);
  return { unit:'detectedAt', clusterCount:clusters.length, iterations, seed, mean, ci95:[quantile(means,.025),quantile(means,.975)], pValue:(means.filter(x=>x<=0).length+1)/(iterations+1) };
}

function holmAdjust(items, alpha=.05) {
  const normalized=items.map((x,index)=>typeof x==='number'?{index,pValue:x}:{...x,index});
  const sorted=[...normalized].sort((a,b)=>a.pValue-b.pValue), m=sorted.length; let running=0, stopped=false;
  for(let rank=0;rank<m;rank++){ const row=sorted[rank]; running=Math.max(running, Math.min(1,row.pValue*(m-rank))); row.adjustedP=running; row.reject=!stopped && row.pValue<=alpha/(m-rank); if(!row.reject) stopped=true; }
  return normalized.sort((a,b)=>a.index-b.index).map(({index,...row})=>row);
}

function qualifying(row) {
  if (!row || row.status!=='evaluated' || !row.metrics) return false;
  const m=row.metrics, b=row.matchedBaseline?.metrics, years=Object.values(m.yearly||{}).filter(x=>x.expectancy>0).length;
  return m.tradeCount>=40 && m.expectancy>0 && m.profitFactor>=1.2 && m.medianR>0 && b
    && m.expectancy>b.expectancy && m.profitFactor>b.profitFactor && years>=2 && row.inference?.reject===true && row.inference?.ci95?.[0]>0;
}

function artifactErrors(a={}) {
  const definitions=a.definitions;
  if(!Array.isArray(definitions) || definitions.length!==10) return ['exactly-ten-definitions-required'];
  const ids=definitions.map(x=>x?.id);
  if(ids.some(x=>typeof x!=='string') || new Set(ids).size!==10) return ['ten-unique-definition-ids-required'];
  const errors=[];
  for(const stage of ['development','validation','holdout']) {
    const rows=a[stage];
    if(!Array.isArray(rows) || rows.length!==10 || new Set(rows.map(x=>x?.id)).size!==10
      || rows.some(x=>!ids.includes(x.id)) || ids.some(id=>!rows.some(x=>x.id===id))) errors.push(`${stage}-ids-not-aligned`);
  }
  return errors;
}

function determineOutcome(a={}) {
  const malformed=artifactErrors(a);
  if(malformed.length) return {status:'INCONCLUSIVE', promoted:[], reasons:malformed};
  const dev=a.development||[], val=a.validation||[], hold=a.holdout||[];
  const promoted=hold.filter(row=>qualifying(row) && val.find(x=>x.id===row.id)?.passed===true).map(x=>x.id);
  if(promoted.length) return {status:'PROMOTE', promoted};
  if(!val.length && dev.length) return {status:'NO ROBUST SIX-HOUR EDGE', promoted:[], reasons:['development-only-evidence']};
  if(!dev.length || !val.length) return {status:'INCONCLUSIVE', promoted:[], reasons:['required-stage-artifacts-missing']};
  const validationPass=val.filter(x=>x.status==='evaluated' && x.passed===true);
  if(validationPass.some(v=>{const h=hold.find(x=>x.id===v.id); return !h || h.status!=='evaluated' || !h.matchedBaseline || !h.inference;}))
    return {status:'INCONCLUSIVE', promoted:[], reasons:['required-holdout-evidence-missing']};
  return {status:'NO ROBUST SIX-HOUR EDGE', promoted:[], reasons:['no-combination-passed-all-frozen-gates']};
}

const f=(x,d=3)=>Number.isFinite(x)?Number(x).toFixed(d):'N/A';
const pct=x=>Number.isFinite(x)?`${(100*x).toFixed(1)}%`:'N/A';
const esc=x=>{const s=x==null?'':typeof x==='object'?JSON.stringify(x):String(x);return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
function csv(rows, columns){return `${columns.join(',')}\n${rows.map(r=>columns.map(c=>esc(r[c])).join(',')).join('\n')}\n`;}
function reason(row){return row?.rejectionReasons?.length?row.rejectionReasons.join('; '):row?.status==='sealed'?'validation-gate-failed':'none';}
function reportReasons(row) {
  const reasons=[...(row?.rejectionReasons||[])];
  if(row?.status==='sealed' && !reasons.length) reasons.push('validation-gate-failed');
  if(row?.inference) {
    if(!(row.inference.ci95?.[0]>0)) reasons.push('bootstrap-ci-not-strictly-positive');
    if(row.inference.reject!==true) reasons.push('holm-adjusted-hypothesis-not-rejected');
  }
  return reasons.length?[...new Set(reasons)].join('; '):'none';
}

function addStageInference(rows, ledger, stage) {
  if(!Array.isArray(rows) || rows.length!==10) throw new Error(`Exactly ten ${stage} results are required for Holm correction`);
  const enriched=rows.map(row=>row.status==='evaluated'?{...row,inference:clusterBootstrap((ledger||[]).filter(t=>t.stage===stage&&t.combinationId===row.id&&!t.matchedBaselineFor))}:row);
  const adjusted=holmAdjust(enriched.map(row=>({id:row.id,pValue:row.inference?.pValue??1})));
  for(const row of enriched) if(row.inference) {
    const h=adjusted.find(x=>x.id===row.id);
    Object.assign(row.inference,{adjustedP:h.adjustedP,reject:h.reject});
    row.rejectionReasons=[...(row.rejectionReasons||[]),...(row.inference.ci95[0]>0?[]:['bootstrap-ci-not-strictly-positive']),...(h.reject?[]:['holm-adjusted-hypothesis-not-rejected'])];
  }
  return enriched;
}

function buildReport(a) {
  const malformed=artifactErrors(a);
  if(malformed.length) throw new Error(`Malformed or stale six-hour artifacts: ${malformed.join(', ')}`);
  const outcome=determineOutcome(a), byStage={development:a.development||[],validation:a.validation||[],holdout:a.holdout||[]};
  const lines=['# 1D Bulls2 six-hour intraday backtest','',`Generated: ${a.metadata?.generatedAt||new Date().toISOString()}`,'',`## Conclusion: ${outcome.status}`,''];
  if(outcome.status==='PROMOTE') lines.push(`Promotable combinations: ${outcome.promoted.join(', ')}. These alone passed every frozen absolute, matched-baseline, calendar-year, bootstrap, and Holm-corrected gate.`);
  else if(outcome.status==='INCONCLUSIVE') lines.push('Required evidence is missing for at least one validation-qualified candidate. This is not evidence of an edge and nothing should be deployed.');
  else lines.push('No combination supplied robust deployable evidence. Development-only winners are not profitability evidence; keep Bulls2 watch-only and do not deploy these rules.');
  lines.push('','## All ten preregistered combinations','',
    '| Combination | Stage | Status | Eligible | Trades | Fill rate | Expectancy | PF | Median R | Win rate | Max DD R | Loss streak | Mean/median hours | Fees (R) | Slippage (R) | Bootstrap 95% CI | Holm adjusted p | Gate reasons | Matched baseline |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');
  for(const def of a.definitions||[]) for(const stage of ['development','validation','holdout']) {
    const row=byStage[stage].find(x=>x.id===def.id)||{id:def.id,status:'missing'},m=row.metrics||{},i=row.inference||{},b=row.matchedBaseline?.metrics;
    const baseline=b?`c01: E ${f(b.expectancy)}, PF ${f(b.profitFactor)}, n ${b.tradeCount}`:'N/A';
    lines.push(`| ${def.id} ${def.name||''} | ${stage} | ${row.status||'missing'} | ${m.eligibleSignals??'N/A'} | ${m.tradeCount??'N/A'} | ${pct(m.fillRate)} | ${f(m.expectancy)} | ${f(m.profitFactor)} | ${f(m.medianR)} | ${pct(m.winRate)} | ${f(m.maxDrawdownR)} | ${m.consecutiveLosses??'N/A'} | ${f(m.meanHoldingHours)}/${f(m.medianHoldingHours)} | ${f(m.feeR)} | ${f(m.slippageR)} | ${i.ci95?`${f(i.ci95[0])} to ${f(i.ci95[1])}`:'N/A'} | ${Number.isFinite(i.adjustedP)?`${f(i.adjustedP,4)} (${i.reject?'reject':'not reject'})`:'N/A'} | ${reportReasons(row)} | ${baseline} |`);
  }
  lines.push('','## Calendar-year stability','', '| Combination | Stage | Year | Trades | Net R | Expectancy | PF |','|---|---|---:|---:|---:|---:|---:|');
  let yearly=0; for(const [stage,rows] of Object.entries(byStage)) for(const row of rows) for(const [year,m] of Object.entries(row.metrics?.yearly||{})){yearly++;lines.push(`| ${row.id} | ${stage} | ${year} | ${m.tradeCount} | ${f(m.netR)} | ${f(m.expectancy)} | ${f(m.profitFactor)} |`);} if(!yearly) lines.push('| N/A | N/A | N/A | 0 | N/A | N/A | N/A |');
  const sealed=(a.holdout||[]).filter(x=>x.status==='sealed').map(x=>x.id);
  lines.push('','## Statistical and execution notes','',
    '- Bootstrap inference resamples whole `detectedAt` clusters with seed 972; correlated signals at the same timestamp never separate.',
    '- Within each stage, Holm correction is applied across exactly ten preregistered hypotheses. Promotion uses corrected holdout inference only; development and validation inference remain descriptive gate evidence.',
    '- Matched baseline comparisons use Combination 1 on each candidate’s same eligible holdout signal population.',
    `- Costs include the recorded market-fill fees and adverse slippage. Data/archive failures: ${(a.failures||[]).length}.`,
    `- ${sealed.length?`The holdout remained sealed for ${sealed.join(', ')} because validation did not pass.`:'Every reported holdout row was evaluated.'}`,
    '- This candle-level simulation omits order-book effects, partial fills, funding, latency, and market impact. Historical promotion would require a separate controlled forward trial.','',
    '## Reproduce','', '```powershell','node --test scripts/1d-bulls2-six-hour-report.test.cjs','node scripts/1d-bulls2-six-hour-report.cjs --input research/1d-bulls2/six-hour-20220701-20260630 --report docs/research/1d-bulls2-six-hour-intraday.md','```','');
  return `${lines.join('\n')}\n`;
}

async function load(file){return JSON.parse(await fs.readFile(file,'utf8'));}
async function runCli({input,report}) {
  const [metadata,definitions,development,validation,holdout,ledger,failures]=await Promise.all(['study-metadata.json','combination-definitions.json','development-results.json','validation-results.json','holdout-results.json','trade-ledger.json','data-failures.json'].map(n=>load(path.join(input,n))));
  const base={metadata,definitions,development,validation,holdout,ledger,failures}, malformed=artifactErrors(base);
  if(malformed.length) throw new Error(`Malformed or stale six-hour artifacts: ${malformed.join(', ')}`);
  const enrichedDevelopment=addStageInference(development,ledger,'development');
  const enrichedValidation=addStageInference(validation,ledger,'validation');
  const enrichedHoldout=addStageInference(holdout,ledger,'holdout');
  const artifacts={metadata,definitions,development:enrichedDevelopment,validation:enrichedValidation,holdout:enrichedHoldout,ledger,failures};
  await fs.mkdir(path.dirname(report),{recursive:true}); await fs.writeFile(report,buildReport(artifacts),'utf8');
  const rows=[];for(const [stage,set] of Object.entries({development:enrichedDevelopment,validation:enrichedValidation,holdout:enrichedHoldout}))for(const row of set)rows.push({combinationId:row.id,stage,status:row.status,...row.metrics,ciLow:row.inference?.ci95?.[0],ciHigh:row.inference?.ci95?.[1],pValue:row.inference?.pValue,holmAdjustedP:row.inference?.adjustedP,holmReject:row.inference?.reject,rejectionReasons:reportReasons(row),matchedBaselineExpectancy:row.matchedBaseline?.metrics?.expectancy,matchedBaselineProfitFactor:row.matchedBaseline?.metrics?.profitFactor});
  await fs.writeFile(path.join(input,'stage-metrics.csv'),csv(rows,['combinationId','stage','status','eligibleSignals','tradeCount','fillRate','expectancy','profitFactor','medianR','winRate','maxDrawdownR','consecutiveLosses','meanHoldingHours','medianHoldingHours','feeR','slippageR','ciLow','ciHigh','pValue','holmAdjustedP','holmReject','rejectionReasons','matchedBaselineExpectancy','matchedBaselineProfitFactor']),'utf8');
  return {conclusion:determineOutcome(artifacts).status,report};
}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=2){if(!['--input','--report'].includes(argv[i])||!argv[i+1])throw new Error('Usage: node scripts/1d-bulls2-six-hour-report.cjs --input PATH --report PATH');out[argv[i].slice(2)]=argv[i+1];}if(!out.input||!out.report)throw new Error('Usage: node scripts/1d-bulls2-six-hour-report.cjs --input PATH --report PATH');return out;}
if(require.main===module)runCli(parseArgs(process.argv.slice(2))).then(x=>console.log(`${x.conclusion}: ${x.report}`)).catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
module.exports={clusterBootstrap,holmAdjust,artifactErrors,addStageInference,determineOutcome,buildReport,runCli,parseArgs,csv};

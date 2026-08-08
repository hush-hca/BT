'use strict';

// Standalone, auditable Node mirror of the current Bulls2 universe. This file
// deliberately does not import browser code or alter production filtering.
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { DAY_MS, HOUR_MS, replaySignals, entryAtFiveHours, measureForwardOutcomes } = require('./1d-bulls2-validation-core.cjs');

const QUALIFIED_UNIVERSE_SIZE = 184;
const DOMESTIC_DOMINANCE_THRESHOLD = 0.4;
const MANUAL_BLACKLIST = 'BTC, ETH, BNB, SOL, XRP';
const PRIORITY_SYMBOLS = ['SUI', 'ONDO', 'ENA', 'ARB', 'INJ'];
const KLINE_LIMIT = 1500;
const ARCHIVE_ROOT = 'https://data.binance.vision/data/futures/um/monthly/klines';
const ARCHIVE_BUCKET_LIST = 'https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?delimiter=/&prefix=data/futures/um/monthly/klines/';
const URLS = Object.freeze({
  futuresTicker: 'https://fapi.binance.com/fapi/v1/ticker/24hr',
  spotInfo: 'https://data-api.binance.vision/api/v3/exchangeInfo',
  futuresInfo: 'https://fapi.binance.com/fapi/v1/exchangeInfo',
  spotTicker: 'https://data-api.binance.vision/api/v3/ticker/24hr',
  upbit: 'https://api.upbit.com/v1/ticker/all?quote_currencies=KRW',
  bithumbMarkets: 'https://api.bithumb.com/v1/market/all?isDetails=false'
});

function canonicalSymbol(symbol) { return String(symbol || '').toUpperCase().replace(/USDT$/, '').replace(/^(1000000|10000|1000|1M)/, ''); }
function parseBlacklist(value = MANUAL_BLACKLIST) { return new Set(String(value).split(/[\s,]+/).map(canonicalSymbol).filter(Boolean)); }
function intervalMs(interval) { if (interval === '1h') return HOUR_MS; if (interval === '1d') return DAY_MS; throw new Error(`Unsupported interval: ${interval}`); }
async function fetchJson(url, fetchImpl = fetch) { const response = await fetchImpl(url, { headers: { Accept: 'application/json' } }); if (!response?.ok) throw new Error(`Request failed for ${url}: ${response?.status || 'network error'}`); return response.json(); }
async function fetchBuffer(url, fetchImpl = fetch) { const response = await fetchImpl(url); if (!response?.ok) throw new Error(`Archive request failed for ${url}: ${response?.status || 'network error'}`); return Buffer.from(await response.arrayBuffer()); }
async function fetchText(url, fetchImpl = fetch) { const response = await fetchImpl(url); if (!response?.ok) throw new Error(`Request failed for ${url}: ${response?.status || 'network error'}`); return response.text(); }
function addVolume(map, symbol, volume) { const key = canonicalSymbol(symbol); const amount = Number(volume); if (key && Number.isFinite(amount) && amount > 0) map.set(key, (map.get(key) || 0) + amount); }
function binanceVolumeMap(rows) { const output = new Map(); for (const row of rows || []) if (row.symbol?.endsWith('USDT')) addVolume(output, row.symbol, row.quoteVolume); return output; }
function krwVolumeMap(rows) { const output = new Map(); for (const row of rows || []) if (row.market?.startsWith('KRW-')) addVolume(output, row.market.slice(4), row.acc_trade_price_24h); return output; }
function listedUsdtSymbols(info, predicate = () => true) { return new Set((info?.symbols || []).filter(row => row.quoteAsset === 'USDT' && row.status === 'TRADING' && predicate(row)).map(row => canonicalSymbol(row.baseAsset || row.symbol))); }

// Mirrors app.js buildQualifiedUniverse: futures USDT tickers by turnover,
// priority assets first, then a 3x pre-filter candidate pool.
function buildQualifiedUniverse(rows) {
  const liveRows = (rows || []).filter(row => row.symbol?.endsWith('USDT') && Number(row.lastPrice) > 0 && Number(row.quoteVolume) > 0).sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume));
  const bySymbol = new Map(liveRows.map(row => [row.symbol.slice(0, -4), row]));
  const priority = PRIORITY_SYMBOLS.map(symbol => bySymbol.get(symbol)).filter(Boolean);
  const prioritySet = new Set(priority.map(row => row.symbol));
  return [...priority, ...liveRows.filter(row => !prioritySet.has(row.symbol))].slice(0, QUALIFIED_UNIVERSE_SIZE * 3).map(row => ({ symbol: row.symbol.slice(0, -4), quoteVolume: Number(row.quoteVolume) || 0, lastPrice: Number(row.lastPrice) || 0, sourceSymbol: row.symbol }));
}

async function fetchBithumbTickers(fetchImpl) {
  const markets = await fetchJson(URLS.bithumbMarkets, fetchImpl);
  const names = (markets || []).map(row => row.market).filter(market => market?.startsWith('KRW-'));
  const batches = []; for (let index = 0; index < names.length; index += 80) batches.push(names.slice(index, index + 80));
  const settled = await Promise.allSettled(batches.map(batch => fetchJson(`https://api.bithumb.com/v1/ticker?markets=${encodeURIComponent(batch.join(','))}`, fetchImpl)));
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!rows.length) throw new Error('Bithumb ticker unavailable');
  return rows;
}

async function marketSnapshot(futuresRows, fetchImpl) {
  const settled = await Promise.allSettled([fetchJson(URLS.spotInfo, fetchImpl), fetchJson(URLS.futuresInfo, fetchImpl), fetchJson(URLS.spotTicker, fetchImpl), fetchJson(URLS.upbit, fetchImpl), fetchBithumbTickers(fetchImpl)]);
  const warnings = []; const value = (index, label, fallback) => settled[index].status === 'fulfilled' ? settled[index].value : (warnings.push(label), fallback);
  const spotInfo = value(0, 'Binance Spot listings', null); const futuresInfo = value(1, 'Binance Futures listings', null); const spotTickers = value(2, 'Binance Spot volume', []); const upbit = value(3, 'Upbit volume', []); const bithumb = value(4, 'Bithumb volume', []);
  const upbitUsdt = upbit.find(row => row.market === 'KRW-USDT'); const bithumbUsdt = bithumb.find(row => row.market === 'KRW-USDT');
  return { spotListings: spotInfo ? listedUsdtSymbols(spotInfo, row => row.isSpotTradingAllowed !== false) : null, futuresListings: futuresInfo ? listedUsdtSymbols(futuresInfo, row => row.contractType === 'PERPETUAL') : new Set((futuresRows || []).map(row => canonicalSymbol(row.symbol))), spotVolumes: binanceVolumeMap(spotTickers), futuresVolumes: binanceVolumeMap(futuresRows), upbitVolumes: krwVolumeMap(upbit), bithumbVolumes: krwVolumeMap(bithumb), krwPerUsdt: Number(upbitUsdt?.trade_price || bithumbUsdt?.trade_price) || null, warnings };
}

// Exact browser rules: manual exclusion, then Binance Spot + USDT perpetual,
// then only domestic share under 40 percent.
function filterQualifiedAssets({ assets, futuresRows, snapshot, manualBlacklist = MANUAL_BLACKLIST, dominanceThreshold = DOMESTIC_DOMINANCE_THRESHOLD }) {
  const manual = parseBlacklist(manualBlacklist), excluded = [], included = [], currentFuturesVolumes = binanceVolumeMap(futuresRows);
  for (const asset of assets) {
    const symbol = canonicalSymbol(asset.symbol);
    if (manual.has(symbol)) { excluded.push({ symbol: asset.symbol, reason: 'manual' }); continue; }
    const onSpot = snapshot.spotListings?.has(symbol), onPerpetual = snapshot.futuresListings?.has(symbol);
    if (snapshot.spotListings && onSpot && !onPerpetual) { excluded.push({ symbol: asset.symbol, reason: 'spot-only' }); continue; }
    if (snapshot.spotListings && (!onSpot || !onPerpetual)) { excluded.push({ symbol: asset.symbol, reason: 'not-spot-and-perpetual' }); continue; }
    const binanceVolume = (snapshot.spotVolumes.get(symbol) || 0) + (currentFuturesVolumes.get(symbol) || snapshot.futuresVolumes.get(symbol) || 0);
    const domesticKrw = (snapshot.upbitVolumes.get(symbol) || 0) + (snapshot.bithumbVolumes.get(symbol) || 0);
    const domesticVolume = snapshot.krwPerUsdt ? domesticKrw / snapshot.krwPerUsdt : 0; const comparable = binanceVolume + domesticVolume; const domesticShare = comparable > 0 ? domesticVolume / comparable : 0;
    if (snapshot.krwPerUsdt && domesticShare >= dominanceThreshold) { excluded.push({ symbol: asset.symbol, reason: 'domestic-dominant', domesticShare }); continue; }
    included.push(asset);
  }
  const count = reason => excluded.filter(row => row.reason === reason).length;
  return { assets: included, excluded, stats: { input: assets.length, included: included.length, excluded: excluded.length, manual: count('manual'), listing: count('spot-only') + count('not-spot-and-perpetual'), domestic: count('domestic-dominant'), threshold: dominanceThreshold, warnings: snapshot.warnings || [] } };
}

async function buildBulls2Universe({ fetchImpl = fetch, filterAssets, manualBlacklist = MANUAL_BLACKLIST, dominanceThreshold = DOMESTIC_DOMINANCE_THRESHOLD } = {}) {
  let futuresRows;
  try { futuresRows = await fetchJson(URLS.futuresTicker, fetchImpl); }
  catch (error) { if (/418/.test(error.message)) throw new Error('Binance Futures universe endpoint returned HTTP 418. Supply an exact pre-captured Bulls2 universe with --universe-file PATH, or explicitly permit the non-equivalent Spot fallback with --allow-spot-universe-fallback.'); throw error; }
  const candidates = buildQualifiedUniverse(futuresRows); let snapshot = null;
  const result = filterAssets ? await filterAssets({ assets: candidates, futuresRows, manualBlacklist, dominanceThreshold }) : filterQualifiedAssets({ assets: candidates, futuresRows, snapshot: snapshot = await marketSnapshot(futuresRows, fetchImpl), manualBlacklist, dominanceThreshold });
  const selected = (result.assets.length ? result.assets : candidates).slice(0, QUALIFIED_UNIVERSE_SIZE);
  return { symbols: selected.map(asset => asset.symbol), assets: selected, qualifiedUniverseSize: QUALIFIED_UNIVERSE_SIZE, dominanceThreshold, manualBlacklist: [...parseBlacklist(manualBlacklist)], candidates: candidates.length, criteria: { candidateMarket: 'Binance USDT-M futures ticker rows with positive price and turnover', candidatePoolCap: QUALIFIED_UNIVERSE_SIZE * 3, finalCap: QUALIFIED_UNIVERSE_SIZE, requireBinanceSpotAndUsdtPerpetual: true, domesticShareMustBeBelow: dominanceThreshold }, filterStats: result.stats || null, excluded: result.excluded || [], snapshot: snapshot && { sources: URLS, warnings: snapshot.warnings, spotListingCount: snapshot.spotListings?.size ?? null, perpetualListingCount: snapshot.futuresListings?.size ?? null, krwPerUsdt: snapshot.krwPerUsdt } };
}

async function buildSpotFallbackUniverse(fetchImpl = fetch) {
  const rows = await fetchJson(URLS.spotTicker, fetchImpl);
  const assets = buildQualifiedUniverse(rows).filter(asset => !parseBlacklist().has(asset.symbol)).slice(0, QUALIFIED_UNIVERSE_SIZE);
  return { symbols: assets.map(asset => asset.symbol), assets, qualifiedUniverseSize: QUALIFIED_UNIVERSE_SIZE, dominanceThreshold: DOMESTIC_DOMINANCE_THRESHOLD, manualBlacklist: [...parseBlacklist()], candidates: rows.length, criteria: { source: 'Binance Spot 24h ticker fallback', equivalentToBulls2Universe: false }, filterStats: null, excluded: [], snapshot: null, provenance: { kind: 'spot-fallback', equivalent: false, promotionEligible: false } };
}

function discoverUsdMUsdtSymbols(xml) {
  const symbols = new Set(), pattern = /<Prefix>data\/futures\/um\/monthly\/klines\/([^<\/]+)\/<\/Prefix>/g;
  for (const match of String(xml).matchAll(pattern)) if (/^[A-Z0-9]+USDT$/.test(match[1])) symbols.add(match[1].slice(0, -4));
  return [...symbols].sort();
}
async function fetchArchivedFuturesSymbols(fetchImpl = fetch) {
  return discoverUsdMUsdtSymbols(await fetchText(ARCHIVE_BUCKET_LIST, fetchImpl));
}

function unzipFirstFile(buffer) {
  if (buffer.readUInt32LE(0) !== 0x04034b50) throw new Error('Invalid ZIP archive');
  const flags = buffer.readUInt16LE(6), method = buffer.readUInt16LE(8), compressedSize = buffer.readUInt32LE(18), nameLength = buffer.readUInt16LE(26), extraLength = buffer.readUInt16LE(28);
  if (flags & 1) throw new Error('Encrypted ZIP archives are unsupported');
  const start = 30 + nameLength + extraLength;
  let size = compressedSize;
  if (!size || (flags & 8)) {
    const central = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), start);
    if (central < 0) throw new Error('ZIP central directory missing');
    size = buffer.readUInt32LE(central + 20);
  }
  const payload = buffer.subarray(start, start + size);
  if (method === 0) return payload;
  if (method === 8) return zlib.inflateRawSync(payload);
  throw new Error(`Unsupported ZIP compression method ${method}`);
}
function parseArchiveCsv(text) {
  const rows = [];
  for (const line of String(text).trim().split(/\r?\n/)) {
    const cells = line.split(','); if (!/^\d+$/.test(cells[0] || '')) continue;
    const row = normalizeKline(cells); if (Number.isFinite(row.time)) rows.push(row);
  }
  return rows;
}
function monthKeys(startTime, endTime) {
  const keys = [], date = new Date(startTime); date.setUTCDate(1); date.setUTCHours(0, 0, 0, 0);
  while (date.getTime() < endTime) { keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`); date.setUTCMonth(date.getUTCMonth() + 1); }
  return keys;
}
async function fetchArchiveHourlyKlines(symbol, startTime, endTime, fetchImpl = fetch) {
  const source = `${canonicalSymbol(symbol)}USDT`, candles = [];
  for (const month of monthKeys(startTime, endTime)) {
    const url = `${ARCHIVE_ROOT}/${source}/1h/${source}-1h-${month}.zip`;
    try { candles.push(...parseArchiveCsv(unzipFirstFile(await fetchBuffer(url, fetchImpl)).toString('utf8'))); }
    catch (error) { if (/404/.test(error.message)) continue; throw error; }
  }
  return candles.filter(row => row.time >= startTime && row.time < endTime).sort((a, b) => a.time - b.time);
}
async function archivedFuturesTurnover(symbol, asOfDay, fetchImpl = fetch) {
  const dayStart = parseDate(asOfDay, 'futures-universe-as-of'), dayEnd = dayStart + DAY_MS;
  const candles = await fetchArchiveHourlyKlines(symbol, dayStart, dayEnd, fetchImpl);
  const completed = candles.filter(row => row.closeTime < dayEnd).slice(-24);
  if (!completed.length) return null;
  return { symbol: `${canonicalSymbol(symbol)}USDT`, lastPrice: String(completed.at(-1).close), quoteVolume: String(completed.reduce((sum, row) => sum + (row.quoteVolume || 0), 0)), completedHours: completed.length };
}
async function buildArchivedFuturesUniverse({ asOf, fetchImpl = fetch, concurrency = 8, manualBlacklist = MANUAL_BLACKLIST, dominanceThreshold = DOMESTIC_DOMINANCE_THRESHOLD } = {}) {
  parseDate(asOf, 'futures-universe-as-of');
  const symbols = await fetchArchivedFuturesSymbols(fetchImpl);
  const turnoverRows = (await mapConcurrent(symbols, concurrency, symbol => archivedFuturesTurnover(symbol, asOf, fetchImpl).catch(() => null))).filter(Boolean);
  const candidates = buildQualifiedUniverse(turnoverRows), snapshot = await marketSnapshot(turnoverRows, fetchImpl);
  snapshot.futuresListings = new Set(symbols);
  const result = filterQualifiedAssets({ assets: candidates, futuresRows: turnoverRows, snapshot, manualBlacklist, dominanceThreshold });
  const selected = result.assets.slice(0, QUALIFIED_UNIVERSE_SIZE);
  return { symbols: selected.map(asset => asset.symbol), assets: selected, qualifiedUniverseSize: QUALIFIED_UNIVERSE_SIZE, dominanceThreshold, manualBlacklist: [...parseBlacklist(manualBlacklist)], candidates: candidates.length, criteria: { candidateMarket: 'Binance USD-M monthly Futures archive symbols', rankingMetric: 'sum of quoteVolume for final 24 completed 1h candles on UTC as-of date', candidatePoolCap: QUALIFIED_UNIVERSE_SIZE * 3, finalCap: QUALIFIED_UNIVERSE_SIZE, requireBinanceSpotAndArchivedUsdtPerpetual: true, domesticShareMustBeBelow: dominanceThreshold }, filterStats: result.stats, excluded: result.excluded, snapshot: { sources: { archiveBucket: ARCHIVE_BUCKET_LIST, hourlyArchive: ARCHIVE_ROOT, spotInfo: URLS.spotInfo, spotTicker: URLS.spotTicker, upbit: URLS.upbit, bithumbMarkets: URLS.bithumbMarkets }, warnings: snapshot.warnings, archivedFuturesListingCount: symbols.length, turnoverRows: turnoverRows.length, krwPerUsdt: snapshot.krwPerUsdt }, provenance: { kind: 'futures-archive', equivalent: true, promotionEligible: true, asOfUtc: `${asOf}T23:59:59.999Z`, limitations: ['Archive availability can lag live markets.', 'Listing is inferred from symbols present under the official monthly USD-M kline prefix.', 'Domestic-volume filtering uses currently accessible Upbit/Bithumb 24h feeds rather than a historical as-of snapshot.'] } };
}
function aggregateHourlyToDaily(hourlyCandles) {
  const groups = new Map();
  for (const candle of hourlyCandles) { const time = Math.floor(candle.time / DAY_MS) * DAY_MS; const list = groups.get(time) || []; list.push(candle); groups.set(time, list); }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([time, rows]) => ({ time, open: rows[0].open, high: Math.max(...rows.map(row => row.high)), low: Math.min(...rows.map(row => row.low)), close: rows.at(-1).close, volume: rows.reduce((sum, row) => sum + row.volume, 0), closeTime: time + DAY_MS - 1, quoteVolume: rows.reduce((sum, row) => sum + (row.quoteVolume || 0), 0) }));
}
async function loadUniverseFile(file) {
  const parsed = JSON.parse(await fs.readFile(file, 'utf8')); const symbols = Array.isArray(parsed) ? parsed : parsed.symbols || parsed.selectedSymbols;
  if (!Array.isArray(symbols) || !symbols.length) throw new Error('--universe-file must contain a JSON symbol array or an object with symbols');
  const clean = symbols.map(canonicalSymbol).filter(Boolean);
  return { ...(Array.isArray(parsed) ? {} : parsed), symbols: clean, assets: clean.map(symbol => ({ symbol })), provenance: { kind: 'exact-bulls2-snapshot', equivalent: true, promotionEligible: true, file: path.resolve(file) } };
}

function normalizeKline(row) { return { time: Number(row[0]), open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]), closeTime: Number(row[6]), quoteVolume: Number(row[7]) }; }
async function fetchPagedKlines(symbol, interval, startTime, endTime, fetchImpl = fetch) {
  const step = intervalMs(interval), candles = []; let cursor = startTime;
  while (cursor < endTime) {
    const url = new URL('https://fapi.binance.com/fapi/v1/klines'); url.searchParams.set('symbol', `${symbol}USDT`); url.searchParams.set('interval', interval); url.searchParams.set('startTime', String(cursor)); url.searchParams.set('endTime', String(endTime - 1)); url.searchParams.set('limit', String(KLINE_LIMIT));
    const page = (await fetchJson(url.toString(), fetchImpl)).map(normalizeKline).filter(row => Number.isFinite(row.time) && row.time >= cursor && row.time < endTime); candles.push(...page);
    const last = page.at(-1); if (!last || last.time + step <= cursor || page.length < KLINE_LIMIT) break; cursor = last.time + step;
  }
  return candles.sort((a, b) => a.time - b.time);
}
async function writeJsonAtomic(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.tmp`; await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await fs.rename(temporary, file); }
function parseDate(value, name) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${name} must use YYYY-MM-DD`); const time = Date.parse(`${value}T00:00:00.000Z`); if (!Number.isFinite(time)) throw new Error(`Invalid ${name}`); return time; }
async function mapConcurrent(items, limit, worker) { const output = new Array(items.length); let cursor = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (true) { const index = cursor++; if (index >= items.length) return; output[index] = await worker(items[index]); } })); return output; }
async function runValidation({ start, end, outDir, fetchImpl = fetch, universe, universeDetails, universeFile, futuresUniverseAsOf, allowSpotUniverseFallback = false, concurrency = 8 } = {}) {
  const startTime = parseDate(start, 'start'), endExclusive = parseDate(end, 'end') + DAY_MS; if (endExclusive <= startTime) throw new Error('end must be on or after start');
  let built;
  if (universeFile) built = await loadUniverseFile(universeFile);
  else if (futuresUniverseAsOf) built = await buildArchivedFuturesUniverse({ asOf: futuresUniverseAsOf, fetchImpl, concurrency });
  else if (universe) built = { symbols: universe, assets: universe.map(symbol => ({ symbol })), provenance: { kind: 'test-override', equivalent: true, promotionEligible: true } };
  else { try { built = await buildBulls2Universe({ fetchImpl }); built.provenance = { kind: 'live-bulls2', equivalent: true, promotionEligible: true }; } catch (error) { if (!allowSpotUniverseFallback) throw error; built = await buildSpotFallbackUniverse(fetchImpl); } }
  const chosen = universeDetails || built, failures = [];
  const rows = await mapConcurrent(chosen.symbols, concurrency, async symbol => { try { const hourlyCandles = await fetchArchiveHourlyKlines(symbol, startTime - 70 * DAY_MS, endExclusive + 30 * DAY_MS + HOUR_MS, fetchImpl); const dailyCandles = aggregateHourlyToDaily(hourlyCandles); return replaySignals({ symbol, dailyCandles, hourlyCandles }).filter(row => row.detectedAt >= startTime && row.detectedAt < endExclusive).map(row => { const entry = entryAtFiveHours({ signalDetectedAt: row.detectedAt, hourlyCandles }); return { ...row, entry, outcomes: measureForwardOutcomes({ entry, hourlyCandles }) }; }); } catch (error) { failures.push({ symbol, message: error.message }); return []; } });
  const observations = rows.flat().sort((a, b) => a.detectedAt - b.detectedAt || a.symbol.localeCompare(b.symbol)); const metadata = { generatedAt: new Date().toISOString(), command: { start, end, virtualEntry: '1h close ending five hours after first valid signal' }, dataSource: { historicalKlines: 'Binance public monthly USDT-M 1h ZIP archive', dailyCandles: 'UTC aggregation of archived 1h candles' }, promotionEligible: chosen.provenance?.promotionEligible !== false, universeProvenance: chosen.provenance || null, range: { start: new Date(startTime).toISOString(), endExclusive: new Date(endExclusive).toISOString(), dailyWarmupDays: 70, outcomeHorizonDays: 30 }, universe: { ...chosen, selectedSymbols: chosen.symbols }, counts: { symbolsRequested: chosen.symbols.length, symbolsCompleted: chosen.symbols.length - failures.length, failures: failures.length, observations: observations.length, bySignalType: Object.fromEntries(['0Day', '1Day'].map(type => [type, observations.filter(row => row.signalType === type).length])) } };
  await Promise.all([writeJsonAtomic(path.join(outDir, 'universe.json'), chosen), writeJsonAtomic(path.join(outDir, 'observations.json'), observations), writeJsonAtomic(path.join(outDir, 'metadata.json'), metadata), writeJsonAtomic(path.join(outDir, 'failures.json'), failures)]); return { observations, failures, metadata, universe: chosen };
}
function parseArgs(argv) { const output = {}; for (let index = 0; index < argv.length;) { const key = argv[index++]; if (key === '--allow-spot-universe-fallback') { output.allowSpotUniverseFallback = true; continue; } const value = argv[index++]; if (!['--start', '--end', '--out', '--universe-file', '--futures-universe-as-of'].includes(key) || !value) throw new Error('Usage: node scripts/1d-bulls2-validation-runner.cjs --start YYYY-MM-DD --end YYYY-MM-DD --out PATH [--universe-file PATH | --futures-universe-as-of YYYY-MM-DD] [--allow-spot-universe-fallback]'); output[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value; } if (!output.start || !output.end || !output.out) throw new Error('Usage: node scripts/1d-bulls2-validation-runner.cjs --start YYYY-MM-DD --end YYYY-MM-DD --out PATH [--universe-file PATH | --futures-universe-as-of YYYY-MM-DD] [--allow-spot-universe-fallback]'); if (output.universeFile && output.futuresUniverseAsOf) throw new Error('--universe-file and --futures-universe-as-of are mutually exclusive'); return output; }
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runValidation({ start: args.start, end: args.end, outDir: args.out, universeFile: args.universeFile, futuresUniverseAsOf: args.futuresUniverseAsOf, allowSpotUniverseFallback: args.allowSpotUniverseFallback })
    .then(result => console.log(`Wrote ${result.observations.length} observations`))
    .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
module.exports = { QUALIFIED_UNIVERSE_SIZE, DOMESTIC_DOMINANCE_THRESHOLD, MANUAL_BLACKLIST, buildQualifiedUniverse, filterQualifiedAssets, buildBulls2Universe, buildSpotFallbackUniverse, discoverUsdMUsdtSymbols, fetchArchivedFuturesSymbols, archivedFuturesTurnover, buildArchivedFuturesUniverse, fetchPagedKlines, fetchArchiveHourlyKlines, unzipFirstFile, parseArchiveCsv, aggregateHourlyToDaily, loadUniverseFile, normalizeKline, runValidation, parseArgs };

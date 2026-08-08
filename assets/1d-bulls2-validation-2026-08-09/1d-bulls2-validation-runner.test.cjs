'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { QUALIFIED_UNIVERSE_SIZE, buildQualifiedUniverse, buildBulls2Universe, buildSpotFallbackUniverse, discoverUsdMUsdtSymbols, buildArchivedFuturesUniverse, filterQualifiedAssets, normalizeKline, unzipFirstFile, parseArchiveCsv, aggregateHourlyToDaily, runValidation, parseArgs } = require('./1d-bulls2-validation-runner.cjs');
const response = value => ({ ok: true, status: 200, json: async () => value });

test('uses current Bulls2-qualified symbols before historical replay', async () => {
  const fetchImpl = async url => { if (url.includes('ticker/24hr')) return response([{ symbol: 'AAAUSDT', lastPrice: '1', quoteVolume: '500' }, { symbol: 'BBBUSDT', lastPrice: '1', quoteVolume: '400' }, { symbol: 'BTCUSDT', lastPrice: '1', quoteVolume: '900' }]); throw new Error(`Unexpected ${url}`); };
  const result = await buildBulls2Universe({ fetchImpl, filterAssets: async ({ assets }) => ({ assets: assets.filter(asset => ['AAA', 'BBB'].includes(asset.symbol)), excluded: [], stats: { input: assets.length, included: 2, excluded: 0 } }) });
  assert.deepEqual(result.symbols, ['AAA', 'BBB']); assert.equal(result.qualifiedUniverseSize, QUALIFIED_UNIVERSE_SIZE); assert.equal(result.dominanceThreshold, 0.4);
});
test('uses Binance kline open timestamps', () => { assert.equal(normalizeKline([1000, '1', '3', '0.5', '2', '9', 9999, '17']).time, 1000); });
test('mirrors the manual, spot-perpetual, and 40 percent domestic exclusions', () => {
  const snapshot = { spotListings: new Set(['AAA', 'BBB', 'BTC']), futuresListings: new Set(['AAA', 'BTC']), spotVolumes: new Map(), futuresVolumes: new Map([['AAA', 60], ['BBB', 60], ['BTC', 60]]), upbitVolumes: new Map([['AAA', 50]]), bithumbVolumes: new Map(), krwPerUsdt: 1, warnings: [] };
  const result = filterQualifiedAssets({ assets: [{ symbol: 'AAA' }, { symbol: 'BBB' }, { symbol: 'BTC' }], futuresRows: [], snapshot });
  assert.deepEqual(result.assets, []);
  assert.equal(result.stats.domestic, 1);
  assert.equal(result.stats.listing, 1);
  assert.equal(result.stats.manual, 1);
});
test('writes four audit artifacts even when a symbol fetch fails', async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bulls2-runner-'));
  const result = await runValidation({ start: '2026-01-01', end: '2026-01-01', outDir, universe: ['AAA'], fetchImpl: async () => { throw new Error('fixture unavailable'); } });
  assert.equal(result.failures.length, 1); for (const file of ['universe.json', 'observations.json', 'metadata.json', 'failures.json']) assert.ok(JSON.parse(await fs.readFile(path.join(outDir, file), 'utf8')));
  assert.equal(result.metadata.command.virtualEntry, '1h close ending five hours after first valid signal');
});

function storedZip(name, contents) {
  const filename = Buffer.from(name), data = Buffer.from(contents), header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0, 6); header.writeUInt16LE(0, 8); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
  return Buffer.concat([header, filename, data]);
}
test('extracts and parses Binance archive ZIP CSV using Node built-ins', () => {
  const csv = 'open_time,open,high,low,close,volume,close_time,quote_volume\n1000,1,3,0.5,2,9,4599,17\n';
  const rows = parseArchiveCsv(unzipFirstFile(storedZip('AAA.csv', csv)).toString('utf8'));
  assert.equal(rows.length, 1); assert.equal(rows[0].close, 2); assert.equal(rows[0].quoteVolume, 17);
});
test('aggregates archived hourly candles into UTC daily OHLCV', () => {
  const rows = aggregateHourlyToDaily([
    { time: 0, open: 10, high: 12, low: 9, close: 11, volume: 3, quoteVolume: 30 },
    { time: 3600000, open: 11, high: 14, low: 10, close: 13, volume: 5, quoteVolume: 60 }
  ]);
  assert.deepEqual(rows[0], { time: 0, open: 10, high: 14, low: 9, close: 13, volume: 8, closeTime: 86399999, quoteVolume: 90 });
});
test('spot fallback is explicit in CLI parsing', () => {
  const args = parseArgs(['--start', '2025-01-01', '--end', '2025-02-01', '--out', 'x', '--allow-spot-universe-fallback']);
  assert.equal(args.allowSpotUniverseFallback, true);
});
test('exact universe file is promotion eligible while spot fallback metadata is not', async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bulls2-universe-'));
  const universeFile = path.join(outDir, 'snapshot.json'); await fs.writeFile(universeFile, JSON.stringify({ symbols: ['AAA'] }));
  const result = await runValidation({ start: '2026-01-01', end: '2026-01-01', outDir, universeFile, fetchImpl: async () => { throw new Error('fixture unavailable'); } });
  assert.equal(result.metadata.promotionEligible, true); assert.equal(result.metadata.universeProvenance.kind, 'exact-bulls2-snapshot');
});
test('HTTP 418 universe error is actionable', async () => {
  const fetchImpl = async () => ({ ok: false, status: 418, json: async () => ({}) });
  await assert.rejects(() => buildBulls2Universe({ fetchImpl }), /--universe-file.*--allow-spot-universe-fallback/);
});
test('Spot-derived universe is labeled non-equivalent and promotion-ineligible', async () => {
  const fetchImpl = async () => response([{ symbol: 'AAAUSDT', lastPrice: '1', quoteVolume: '500' }]);
  const result = await buildSpotFallbackUniverse(fetchImpl);
  assert.equal(result.provenance.equivalent, false); assert.equal(result.provenance.promotionEligible, false);
});
test('discovers only plain USDT symbols from the official Futures archive XML', () => {
  const xml = '<ListBucketResult><CommonPrefixes><Prefix>data/futures/um/monthly/klines/AAAUSDT/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>data/futures/um/monthly/klines/BBBUSDC/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>data/futures/um/monthly/klines/CCCUSD_250627/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>data/futures/um/monthly/klines/1000PEPEUSDT/</Prefix></CommonPrefixes></ListBucketResult>';
  assert.deepEqual(discoverUsdMUsdtSymbols(xml), ['1000PEPE', 'AAA']);
});
test('ranks archive Futures rows by their 24h quote volume with existing priority behavior', () => {
  const ranked = buildQualifiedUniverse([
    { symbol: 'AAAUSDT', lastPrice: '1', quoteVolume: '500' },
    { symbol: 'ENAUSDT', lastPrice: '1', quoteVolume: '100' },
    { symbol: 'BBBUSDT', lastPrice: '1', quoteVolume: '400' }
  ]);
  assert.deepEqual(ranked.map(row => row.symbol), ['ENA', 'AAA', 'BBB']);
});
test('archive Futures universe records as-of provenance and never uses Spot volume for ranking', async () => {
  const day = Date.parse('2025-01-15T00:00:00Z');
  const csv = (symbol, quote) => Array.from({ length: 24 }, (_, hour) => `${day + hour * 3600000},1,2,0.5,1.5,10,${day + (hour + 1) * 3600000 - 1},${quote}`).join('\n');
  const xml = '<ListBucketResult><CommonPrefixes><Prefix>data/futures/um/monthly/klines/AAAUSDT/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>data/futures/um/monthly/klines/BBBUSDT/</Prefix></CommonPrefixes></ListBucketResult>';
  const fetchImpl = async url => {
    if (url.includes('s3-ap-northeast-1')) return { ok: true, status: 200, text: async () => xml };
    if (url.includes('/AAAUSDT/1h/')) return { ok: true, status: 200, arrayBuffer: async () => storedZip('AAA.csv', csv('AAA', 10)) };
    if (url.includes('/BBBUSDT/1h/')) return { ok: true, status: 200, arrayBuffer: async () => storedZip('BBB.csv', csv('BBB', 20)) };
    if (url.includes('exchangeInfo') && url.includes('data-api')) return response({ symbols: [{ symbol: 'AAAUSDT', baseAsset: 'AAA', quoteAsset: 'USDT', status: 'TRADING' }, { symbol: 'BBBUSDT', baseAsset: 'BBB', quoteAsset: 'USDT', status: 'TRADING' }] });
    if (url.includes('fapi.binance.com/fapi/v1/exchangeInfo')) return { ok: false, status: 418, json: async () => ({}) };
    if (url.includes('data-api') && url.includes('ticker/24hr')) return response([{ symbol: 'AAAUSDT', quoteVolume: '999999' }, { symbol: 'BBBUSDT', quoteVolume: '1' }]);
    if (url.includes('upbit.com')) return response([{ market: 'KRW-USDT', trade_price: 1400, acc_trade_price_24h: 1 }]);
    if (url.includes('bithumb.com/v1/market')) return response([]);
    throw new Error(`Unexpected ${url}`);
  };
  const result = await buildArchivedFuturesUniverse({ asOf: '2025-01-15', fetchImpl, concurrency: 2 });
  assert.deepEqual(result.symbols, ['BBB', 'AAA']);
  assert.equal(result.provenance.kind, 'futures-archive'); assert.equal(result.provenance.promotionEligible, true); assert.equal(result.provenance.asOfUtc, '2025-01-15T23:59:59.999Z');
  assert.match(result.provenance.limitations.join(' '), /Domestic-volume/);
});

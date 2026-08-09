'use strict';

const HOUR_MS = 60 * 60_000;
const SIX_HOUR = Object.freeze({
  delayHours: 5,
  entryWindowHours: 6,
  maxHoldHours: 6,
  takerFee: 0.0005,
  adverseSlippage: 0.0005,
});

const round = value => Number(value.toFixed(12));
const closeTime = candle => candle.time + HOUR_MS;
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = values => {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

function wilderAtr(candles) {
  const values = new Array(candles.length).fill(null);
  const trueRanges = candles.map((candle, index) => index === 0
    ? candle.high - candle.low
    : Math.max(candle.high - candle.low, Math.abs(candle.high - candles[index - 1].close), Math.abs(candle.low - candles[index - 1].close)));
  if (trueRanges.length < 14) return values;
  let atr = mean(trueRanges.slice(0, 14));
  values[13] = atr;
  for (let index = 14; index < trueRanges.length; index += 1) {
    atr = ((atr * 13) + trueRanges[index]) / 14;
    values[index] = atr;
  }
  return values;
}

function rollingMean(candles, end, length, selector = item => item.close) {
  if (end < length) return null;
  return mean(candles.slice(end - length, end).map(selector));
}

function buildIndicatorIndex(hourly, btcHourly) {
  const coin = [...hourly].sort((a, b) => a.time - b.time);
  const btc = [...btcHourly].sort((a, b) => a.time - b.time);
  const btcByTime = new Map(btc.map((item, index) => [item.time, { item, index }]));
  const coinAtr = wilderAtr(coin);
  const btcSmaAt = end => rollingMean(btc, end, 200);
  const ratios = coin.map(item => {
    const match = btcByTime.get(item.time);
    return match && match.item.close > 0 ? item.close / match.item.close : null;
  });
  const ratioMeanAt = (end, length = 20) => {
    if (end < length) return null;
    const values = ratios.slice(end - length, end);
    return values.every(Number.isFinite) ? mean(values) : null;
  };
  const index = new Map();

  // Each key is an hourly candle open. Its point contains only earlier, completed candles.
  for (let position = 0; position <= coin.length; position += 1) {
    const time = position < coin.length ? coin[position].time : (coin.length ? closeTime(coin.at(-1)) : 0);
    const coinSma200 = rollingMean(coin, position, 200);
    const oldCoinSma = rollingMean(coin, position - 12, 200);
    const btcPosition = btcByTime.get(time)?.index ?? btc.findIndex(item => item.time >= time);
    const safeBtcPosition = btcPosition < 0 ? btc.length : btcPosition;
    const btcSma200 = btcSmaAt(safeBtcPosition);
    const oldBtcSma = btcSmaAt(safeBtcPosition - 12);
    const ratioSma20 = ratioMeanAt(position);
    const oldRatioSma = ratioMeanAt(position - 5);
    const dayStart = Math.floor(time / (24 * HOUR_MS)) * 24 * HOUR_MS;
    const session = coin.slice(0, position).filter(item => item.time >= dayStart);
    const sessionQuote = session.reduce((sum, item) => sum + (Number.isFinite(item.quoteVolume) ? item.quoteVolume : item.close * item.volume), 0);
    const sessionVolume = session.reduce((sum, item) => sum + item.volume, 0);
    const lastCoin = position ? coin[position - 1] : null;
    const lastBtc = safeBtcPosition ? btc[safeBtcPosition - 1] : null;
    index.set(time, {
      atr14: position ? coinAtr[position - 1] : null,
      volumeMedian20: position >= 20 ? median(coin.slice(position - 20, position).map(item => item.volume)) : null,
      sessionVwap: sessionVolume > 0 ? sessionQuote / sessionVolume : null,
      coinSma200,
      coinSma200Rising: Number.isFinite(coinSma200) && Number.isFinite(oldCoinSma) ? coinSma200 > oldCoinSma : false,
      btcSma200,
      btcSma200Rising: Number.isFinite(btcSma200) && Number.isFinite(oldBtcSma) ? btcSma200 > oldBtcSma : false,
      coinClose: lastCoin?.close ?? null,
      btcClose: lastBtc?.close ?? null,
      coinBtcRatio: lastCoin && lastBtc?.close > 0 ? lastCoin.close / lastBtc.close : null,
      coinBtcSma20: ratioSma20,
      coinBtcSma20Rising: Number.isFinite(ratioSma20) && Number.isFinite(oldRatioSma) ? ratioSma20 > oldRatioSma : false,
    });
  }
  return index;
}

function bullishConfirmation(candle) {
  const range = candle.high - candle.low;
  return range > 0 && candle.close > candle.open
    && (candle.close - candle.open) / range >= 0.5
    && (candle.high - candle.close) / range <= 0.35;
}

function bullishRetest(candle, support) {
  const range = candle.high - candle.low;
  return range > 0 && candle.low >= support * 0.995 && candle.low <= support * 1.01
    && candle.close > support && (candle.high - candle.close) / range <= 0.3;
}

function indicatorFor(indicators, candle) {
  const completed = indicators.get(closeTime(candle)) || indicators.get(candle.time);
  const historical = indicators.get(candle.time);
  return completed && historical
    ? { ...completed, volumeMedian20: historical.volumeMedian20 }
    : completed;
}

function findIntradayEntry({ signal, hourly, btcHourly, indicators, combination }) {
  if (!signal || signal.signalType !== '0Day' || !Number.isFinite(signal.score) || signal.score < (combination.minimumScore ?? 40)) return null;
  if (combination.relVol && (!Number.isFinite(signal.relVol) || signal.relVol < combination.relVol[0] || signal.relVol > combination.relVol[1])) return null;
  const candles = [...hourly].sort((a, b) => a.time - b.time);
  const computed = indicators || buildIndicatorIndex(candles, btcHourly || []);
  const startsAt = signal.detectedAt + SIX_HOUR.delayHours * HOUR_MS;
  const expiresAt = startsAt + SIX_HOUR.entryWindowHours * HOUR_MS;
  const firstFive = candles.filter(item => closeTime(item) > signal.detectedAt && closeTime(item) <= startsAt);
  if (firstFive.length !== 5) return null;
  const observationCandle = firstFive.at(-1);
  const observation = computed.get(closeTime(observationCandle)) || indicatorFor(computed, observationCandle);
  if (!observation) return null;
  if (Number.isFinite(combination.maxSupportDistance)) {
    if (!(signal.support > 0)) return null;
    const distance = Math.abs(observationCandle.close - signal.support) / signal.support;
    if (distance > combination.maxSupportDistance) return null;
  }
  if (combination.entry === 'vwap-convergence') {
    if (!(observation.coinClose > observation.coinSma200 && observation.coinSma200Rising
      && observation.btcClose > observation.btcSma200 && observation.btcSma200Rising)) return null;
  }
  const firstFiveHigh = Math.max(...firstFive.map(item => item.high));
  const eligible = candles.filter(item => closeTime(item) >= startsAt && closeTime(item) < expiresAt);

  for (const candle of eligible) {
    const point = indicatorFor(computed, candle);
    if (!point || !Number.isFinite(point.atr14)) continue;
    let reason = null;
    if (combination.entry === 'immediate') reason = 'immediate';
    else if (combination.entry === 'confirmation' && bullishConfirmation(candle)) reason = 'bullish-confirmation';
    else if (combination.entry === 'retest' && bullishRetest(candle, signal.support)) reason = 'support-retest';
    else if (combination.entry === 'breakout' && closeTime(candle) > startsAt && candle.close > firstFiveHigh) reason = 'breakout';
    else if (combination.entry === 'vwap-convergence' && bullishConfirmation(candle) && candle.close > point.sessionVwap) reason = 'vwap-convergence';
    else if (combination.entry === 'rs-volume-breakout' && closeTime(candle) > startsAt && candle.close > firstFiveHigh
      && point.coinBtcRatio > point.coinBtcSma20 && point.coinBtcSma20Rising && candle.volume > point.volumeMedian20) reason = 'rs-volume-breakout';
    if (reason) return {
      time: closeTime(candle),
      price: round(candle.close * (1 + SIX_HOUR.adverseSlippage)),
      marketPrice: candle.close,
      candle,
      atr14: point.atr14,
      sessionVwap: point.sessionVwap,
      reason,
      reference: ['breakout', 'rs-volume-breakout'].includes(combination.entry) ? firstFiveHigh : null,
    };
  }
  return null;
}

function initialStop(entry, combination) {
  if (combination.stop === 'trigger-low') return entry.candle.low;
  if (combination.stop === 'trigger-low-atr-quarter') return entry.candle.low - 0.25 * entry.atr14;
  return entry.price - entry.atr14;
}

function simulateSixHourTrade({ signal, entry, hourly, combination }) {
  const stop = initialStop(entry, combination);
  if (!(Number.isFinite(stop) && stop > 0 && stop < entry.price)) return null;
  const risk = entry.price - stop;
  const marketEntry = entry.marketPrice ?? entry.candle?.close ?? entry.price;
  if (stop >= marketEntry) {
    const exitFill = marketEntry * (1 - SIX_HOUR.adverseSlippage);
    const entryFee = entry.price * SIX_HOUR.takerFee;
    const exitFee = exitFill * SIX_HOUR.takerFee;
    const entrySlippage = entry.price - marketEntry;
    const exitSlippage = marketEntry - exitFill;
    const feeR = (entryFee + exitFee) / risk;
    const slippageR = (entrySlippage + exitSlippage) / risk;
    return {
      signalType: signal.signalType,
      symbol: signal.symbol,
      detectedAt: signal.detectedAt,
      score: signal.score,
      entryTime: entry.time,
      entryPrice: entry.price,
      entryMarketPrice: marketEntry,
      entryReason: entry.reason,
      stop: round(stop),
      targetPrice: null,
      splitTargetPrices: null,
      exitTime: entry.time,
      exitPrice: round(exitFill),
      exitReason: 'immediate-stop',
      holdingHours: 0,
      fills: 2,
      grossR: 0,
      feeR: round(feeR),
      slippageR: round(slippageR),
      netR: round(-feeR - slippageR),
    };
  }
  const deadline = entry.time + SIX_HOUR.maxHoldHours * HOUR_MS;
  const candles = [...hourly].sort((a, b) => a.time - b.time)
    .filter(item => closeTime(item) > entry.time && closeTime(item) <= deadline);
  let remaining = 1;
  let grossPnl = 0;
  let exitFee = 0;
  let exitSlippage = 0;
  let fills = 1;
  let exitTime = null;
  let exitPrice = null;
  let exitReason = null;
  let activeStop = stop;
  let firstTaken = false;
  const targetR = combination.targetR ?? 2;
  const target = entry.price + targetR * risk;
  const oneR = entry.price + risk;
  const twoR = entry.price + 2 * risk;

  const closePart = (quantity, reference, reason, time) => {
    const fill = reference * (1 - SIX_HOUR.adverseSlippage);
    grossPnl += (reference - marketEntry) * quantity;
    exitSlippage += (reference - fill) * quantity;
    exitFee += fill * quantity * SIX_HOUR.takerFee;
    remaining = round(remaining - quantity);
    fills += 1;
    exitTime = time;
    exitPrice = fill;
    exitReason = reason;
  };

  for (const candle of candles) {
    if (candle.low <= activeStop) {
      closePart(remaining, activeStop, firstTaken ? 'breakeven-stop' : 'stop', closeTime(candle));
      break;
    }
    if (combination.exit === 'split-1r-2r') {
      if (!firstTaken && candle.high >= oneR) {
        closePart(0.5, oneR, 'partial-1R', closeTime(candle));
        firstTaken = true;
        activeStop = entry.price;
        if (candle.low <= activeStop) {
          closePart(remaining, activeStop, 'breakeven-stop', closeTime(candle));
          break;
        }
      }
      if (firstTaken && candle.high >= twoR) {
        closePart(remaining, twoR, 'target-2R', closeTime(candle));
        break;
      }
    } else if (candle.high >= target) {
      closePart(remaining, target, `target-${targetR}R`, closeTime(candle));
      break;
    }
    if (closeTime(candle) === deadline) {
      closePart(remaining, candle.close, 'time-6h', closeTime(candle));
      break;
    }
  }
  if (remaining > 0) return null;
  const entryFee = entry.price * SIX_HOUR.takerFee;
  const entrySlippage = entry.price - marketEntry;
  const grossR = grossPnl / risk;
  const feeR = (entryFee + exitFee) / risk;
  const slippageR = (entrySlippage + exitSlippage) / risk;
  return {
    signalType: signal.signalType,
    symbol: signal.symbol,
    detectedAt: signal.detectedAt,
    score: signal.score,
    entryTime: entry.time,
    entryPrice: entry.price,
    entryMarketPrice: marketEntry,
    entryReason: entry.reason,
    stop: round(stop),
    targetPrice: combination.exit === 'split-1r-2r' ? null : round(target),
    splitTargetPrices: combination.exit === 'split-1r-2r' ? { first: round(oneR), final: round(twoR) } : null,
    exitTime,
    exitPrice: round(exitPrice),
    exitReason,
    holdingHours: round((exitTime - entry.time) / HOUR_MS),
    fills,
    grossR: round(grossR),
    feeR: round(feeR),
    slippageR: round(slippageR),
    netR: round(grossR - feeR - slippageR),
  };
}

function calculateMetrics(trades) {
  const valid = [...trades].filter(item => Number.isFinite(item.netR)).sort((a, b) => (a.entryTime ?? a.detectedAt ?? 0) - (b.entryTime ?? b.detectedAt ?? 0));
  if (!valid.length) return { tradeCount: 0, expectancy: 0, profitFactor: 0, medianR: 0, winRate: 0, maxDrawdownR: 0, consecutiveLosses: 0, meanHoldingHours: 0, medianHoldingHours: 0, feeR: 0, slippageR: 0 };
  const values = valid.map(item => item.netR);
  const gains = values.filter(value => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(values.filter(value => value < 0).reduce((sum, value) => sum + value, 0));
  let equity = 0, peak = 0, maxDrawdownR = 0, streak = 0, consecutiveLosses = 0;
  for (const value of values) {
    equity += value;
    peak = Math.max(peak, equity);
    maxDrawdownR = Math.max(maxDrawdownR, peak - equity);
    streak = value < 0 ? streak + 1 : 0;
    consecutiveLosses = Math.max(consecutiveLosses, streak);
  }
  const holding = valid.map(item => item.holdingHours).filter(Number.isFinite);
  return {
    tradeCount: valid.length,
    expectancy: round(mean(values)),
    profitFactor: losses ? round(gains / losses) : (gains ? Infinity : 0),
    medianR: round(median(values)),
    winRate: round(values.filter(value => value > 0).length / values.length),
    maxDrawdownR: round(maxDrawdownR),
    consecutiveLosses,
    meanHoldingHours: holding.length ? round(mean(holding)) : 0,
    medianHoldingHours: holding.length ? round(median(holding)) : 0,
    feeR: round(valid.reduce((sum, item) => sum + (item.feeR || 0), 0)),
    slippageR: round(valid.reduce((sum, item) => sum + (item.slippageR || 0), 0)),
  };
}

module.exports = { HOUR_MS, SIX_HOUR, buildIndicatorIndex, findIntradayEntry, simulateSixHourTrade, calculateMetrics };

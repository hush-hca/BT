'use strict';

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const SORTED_CANDLES = Symbol.for('catching-cat.sorted-hourly-candles');

const EXECUTION = Object.freeze({
  delayHours: 5,
  expiryHours: 72,
  marketFee: 0.0005,
  marketSlippage: 0.0005,
  makerFee: 0.0002
});

function closedAt(candle) { return candle.time + HOUR_MS; }
function sorted(candles) { return candles[SORTED_CANDLES] === true ? candles : [...candles].sort((a, b) => a.time - b.time); }
function round(value) { return Number(value.toFixed(12)); }

function findEntry({ signal, hourlyCandles, config }) {
  const candles = sorted(hourlyCandles);
  const delayAt = signal.detectedAt + EXECUTION.delayHours * HOUR_MS;
  const expiresAt = signal.detectedAt + EXECUTION.expiryHours * HOUR_MS;
  const delayed = candles.filter(candle => closedAt(candle) > delayAt && closedAt(candle) <= expiresAt);

  if (config.entryFamily === 'breakout') {
    const confirmation = candles.filter(candle => closedAt(candle) > signal.detectedAt && closedAt(candle) <= delayAt);
    if (confirmation.length !== EXECUTION.delayHours) return null;
    const reference = Math.max(...confirmation.map(candle => candle.high));
    const candle = delayed.find(item => item.close > reference);
    return candle ? {
      time: closedAt(candle),
      price: round(candle.close * (1 + EXECUTION.marketSlippage)),
      family: 'breakout',
      reference,
      marketPrice: candle.close
    } : null;
  }

  if (config.entryFamily === 'retest') {
    const lower = signal.support * 0.995;
    const upper = signal.support * 1.015;
    const candle = delayed.find(item => {
      const range = item.high - item.low;
      return range > 0 && item.low <= upper && item.high >= lower
        && item.close > item.open && item.close > signal.support
        && (item.high - item.close) / range <= 0.35;
    });
    return candle ? {
      time: closedAt(candle),
      price: round(candle.close * (1 + EXECUTION.marketSlippage)),
      family: 'retest',
      reference: signal.support,
      marketPrice: candle.close
    } : null;
  }

  if (config.entryFamily === 'limit') {
    const offset = config.limitOffset;
    if (![0.005, 0.01].includes(offset)) throw new Error('limitOffset must be 0.005 or 0.01');
    const level = signal.support * (1 + offset);
    const candle = delayed.find(item => item.low <= level);
    return candle ? {
      time: closedAt(candle),
      price: round(Math.min(level, candle.open)),
      family: 'limit',
      reference: signal.support
    } : null;
  }
  throw new Error(`Unknown entry family: ${config.entryFamily}`);
}

function buildInitialStop({ entryPrice, support, signalLow, dailyAtr, stopFamily }) {
  let stop;
  if (stopFamily === 'support') stop = support * 0.995;
  else if (stopFamily === 'sweep') stop = signalLow * 0.995;
  else if (stopFamily === 'atr') stop = entryPrice - dailyAtr;
  else throw new Error(`Unknown stop family: ${stopFamily}`);
  return Number.isFinite(stop) && stop > 0 && stop < entryPrice ? round(stop) : null;
}

function exitFill(referencePrice) { return referencePrice * (1 - EXECUTION.marketSlippage); }

function simulateTrade({ signal, entry, hourlyCandles, config, signalLow, dailyAtr }) {
  const stop = buildInitialStop({ entryPrice: entry.price, support: signal.support, signalLow, dailyAtr, stopFamily: config.stopFamily });
  if (!stop) return null;
  const risk = entry.price - stop;
  const candles = sorted(hourlyCandles).filter(candle => closedAt(candle) > entry.time);
  const entryFee = entry.price * (entry.family === 'limit' ? EXECUTION.makerFee : EXECUTION.marketFee);
  const entrySlippage = entry.marketPrice ? entry.price - entry.marketPrice : 0;
  const timeDays = config.timeExitDays || (config.exitFamily === 'time' ? 7 : 14);
  const deadline = entry.time + timeDays * DAY_MS;
  let remaining = 1;
  let grossPnl = 0;
  let exitFees = 0;
  let exitSlippage = 0;
  let exitTime = null;
  let exitPrice = null;
  let exitReason = null;
  let activeStop = stop;
  let firstTaken = false;
  const grossEntryPrice = entry.marketPrice || entry.price;
  const fixedTargetR = config.targetR || 2;
  const fixedTarget = entry.price + fixedTargetR * risk;
  const splitTarget = entry.price + 2 * risk;

  const closePart = (quantity, reference, reason, time) => {
    const fill = exitFill(reference);
    grossPnl += (reference - grossEntryPrice) * quantity;
    exitSlippage += (reference - fill) * quantity;
    exitFees += fill * quantity * EXECUTION.marketFee;
    remaining -= quantity;
    exitTime = time;
    exitPrice = fill;
    exitReason = reason;
  };

  for (const candle of candles) {
    if (candle.low <= activeStop) {
      closePart(remaining, activeStop, 'stop', closedAt(candle));
      break;
    }
    if (config.exitFamily === 'split') {
      const oneR = entry.price + risk;
      if (!firstTaken && candle.high >= oneR) {
        closePart(0.5, oneR, 'partial-1R', closedAt(candle));
        firstTaken = true;
        activeStop = entry.price;
        if (candle.low <= activeStop) {
          closePart(remaining, activeStop, 'breakeven-stop', closedAt(candle));
          break;
        }
      }
      if (firstTaken && candle.high >= splitTarget) {
        closePart(remaining, splitTarget, 'target-2R', closedAt(candle));
        break;
      }
    } else if (config.exitFamily === 'fixed' && candle.high >= fixedTarget) {
      closePart(remaining, fixedTarget, `target-${fixedTargetR}R`, closedAt(candle));
      break;
    }
    if (closedAt(candle) >= deadline) {
      closePart(remaining, candle.close, `time-${timeDays}d`, closedAt(candle));
      break;
    }
  }
  if (remaining > 1e-12) return null;
  const grossR = grossPnl / risk;
  const costsR = (entryFee + entrySlippage + exitFees + exitSlippage) / risk;
  const feeCostR = (entryFee + exitFees) / risk;
  const slippageCostR = (entrySlippage + exitSlippage) / risk;
  return {
    signalType: signal.signalType,
    detectedAt: signal.detectedAt,
    score: signal.score,
    entryTime: entry.time,
    entryPrice: entry.price,
    entryFamily: entry.family,
    stop,
    targetPrice: config.exitFamily === 'fixed' ? round(fixedTarget) : null,
    splitTargetPrices: config.exitFamily === 'split'
      ? { first: round(entry.price + risk), final: round(splitTarget) }
      : null,
    exitTime,
    exitPrice: round(exitPrice),
    exitReason,
    holdingHours: round((exitTime - entry.time) / HOUR_MS),
    grossR: round(grossR),
    feeCostR: round(feeCostR),
    slippageCostR: round(slippageCostR),
    costsR: round(costsR),
    netR: round(grossR - costsR)
  };
}

function calculateTradeMetrics(trades) {
  const chronological = [...trades].sort((left, right) =>
    (left.entryTime ?? left.entry?.time ?? left.detectedAt ?? 0)
      - (right.entryTime ?? right.entry?.time ?? right.detectedAt ?? 0));
  const validTrades = chronological.filter(trade => Number.isFinite(trade.netR));
  const values = validTrades.map(trade => trade.netR);
  if (!values.length) return { tradeCount: 0, expectancy: 0, profitFactor: 0, medianR: 0, winRate: 0, maxDrawdownR: 0, consecutiveLosses: 0, totalCostsR: 0 };
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  const medianR = ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
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
  return {
    tradeCount: values.length,
    expectancy: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    profitFactor: losses ? round(gains / losses) : (gains ? Infinity : 0),
    medianR: round(medianR),
    winRate: round(values.filter(value => value > 0).length / values.length),
    maxDrawdownR: round(maxDrawdownR),
    consecutiveLosses,
    totalCostsR: round(validTrades.reduce((sum, trade) => sum + (trade.costsR || 0), 0))
  };
}

module.exports = { EXECUTION, SORTED_CANDLES, findEntry, buildInitialStop, simulateTrade, calculateTradeMetrics };

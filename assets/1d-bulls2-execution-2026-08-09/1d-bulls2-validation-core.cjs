'use strict';

// This module deliberately mirrors the current 1D Bulls2 reclaim equations in
// app.js.  Keep it independent from the browser so historical replay cannot
// mutate the production scanner.
const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;

const BULLS2_RULES = Object.freeze({
  reclaimTolerance: 0.02,
  minimumBodyRatio: 0.35,
  maximumCloseTopFraction: 0.45,
  supportLookback: 60,
  swingLeft: 3,
  swingRight: 3,
  volumeLookback: 20
});

function findConfirmedSwingLows(candles, start, end, left = 3, right = 3) {
  const first = Math.max(left, start);
  const last = Math.min(end, candles.length - right - 1);
  const supports = [];
  for (let index = first; index <= last; index += 1) {
    const candle = candles[index];
    if (!candle) continue;
    const leftSide = candles.slice(index - left, index);
    const rightSide = candles.slice(index + 1, index + right + 1);
    if (leftSide.every(item => candle.low <= item.low) && rightSide.every(item => candle.low <= item.low)) {
      supports.push({ index, price: candle.low, time: candle.time });
    }
  }
  return supports;
}

function quoteVolume(candle) {
  return Number(candle.quoteVolume) || Number(candle.volume) * Number(candle.close);
}

function evaluateBulls2Signal({ dailyCandles, signalIndex, observedAt, kind }) {
  if (!['0Day', '1Day'].includes(kind)) throw new Error('kind must be 0Day or 1Day');
  const signal = dailyCandles[signalIndex];
  if (!signal || !Number.isFinite(observedAt)) return null;

  const signalClose = signal.time + DAY_MS;
  if (kind === '1Day' && observedAt < signalClose) return null;
  if (kind === '0Day' && (observedAt < signal.time || observedAt >= signalClose)) return null;

  // The support and volume windows may only contain candles available at the
  // observation point.  For a 0Day signal the last item is the synthesized,
  // still-developing daily candle; for 1Day it is the closed signal candle.
  const known = dailyCandles.slice(0, signalIndex + 1);
  // app.js builds developing signals from `completed`, which deliberately
  // excludes today's partial candle.  A 0Day support therefore cannot use
  // that candle as one of its three right-hand confirmations.
  const supportCandles = kind === '0Day' ? known.slice(0, -1) : known;
  const supportStart = Math.max(BULLS2_RULES.swingLeft, signalIndex - BULLS2_RULES.supportLookback);
  const supportEnd = signalIndex - BULLS2_RULES.swingRight;
  const supports = findConfirmedSwingLows(
    supportCandles,
    supportStart,
    supportEnd,
    BULLS2_RULES.swingLeft,
    BULLS2_RULES.swingRight
  );
  const range = signal.high - signal.low;
  if (range <= 0 || !supports.length) return null;

  const bullish = signal.close > signal.open;
  const bodyRatio = (signal.close - signal.open) / range;
  const closeTopFraction = (signal.high - signal.close) / range;
  if (!bullish || bodyRatio < BULLS2_RULES.minimumBodyRatio || closeTopFraction > BULLS2_RULES.maximumCloseTopFraction) return null;

  const volumeWindow = known.slice(Math.max(0, signalIndex - BULLS2_RULES.volumeLookback), signalIndex);
  const averageQuoteVolume = volumeWindow.reduce((sum, candle) => sum + quoteVolume(candle), 0) / Math.max(volumeWindow.length, 1);
  const signalQuoteVolume = quoteVolume(signal);
  const relVol = averageQuoteVolume ? signalQuoteVolume / averageQuoteVolume : 1;

  const candidates = supports.map(support => {
    const sweepDepth = (support.price - signal.low) / support.price;
    const touched = Math.abs(signal.low / support.price - 1) <= BULLS2_RULES.reclaimTolerance;
    const sweptAndReclaimed = signal.low < support.price && signal.close > support.price;
    if (!touched || !sweptAndReclaimed) return null;

    const bodyScore = 35 * Math.max(0, Math.min(1,
      (bodyRatio - BULLS2_RULES.minimumBodyRatio) / (1 - BULLS2_RULES.minimumBodyRatio)
    ));
    const closeScore = 30 * Math.max(0, Math.min(1,
      (BULLS2_RULES.maximumCloseTopFraction - closeTopFraction) / BULLS2_RULES.maximumCloseTopFraction
    ));
    const sweepRatio = Math.max(0, sweepDepth) / BULLS2_RULES.reclaimTolerance;
    const sweepQuality = sweepDepth > 0 ? Math.max(0, 1 - Math.abs(sweepRatio - 0.45) / 0.75) : 0;
    const sweepScore = 20 * sweepQuality;
    const volumeScore = 15 * Math.min(1, relVol / 2);
    return {
      signalType: kind,
      detectedAt: observedAt,
      score: bodyScore + closeScore + sweepScore + volumeScore,
      bodyRatio,
      closeTopFraction,
      sweepDepth,
      relVol,
      support: support.price,
      supportTime: support.time,
      candleTime: signal.time,
      quoteVolume: signalQuoteVolume
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score
    || Math.abs(left.sweepDepth - BULLS2_RULES.reclaimTolerance * 0.45) - Math.abs(right.sweepDepth - BULLS2_RULES.reclaimTolerance * 0.45));

  return candidates[0] || null;
}

function synthesizeDailyCandle(dayStart, hourlyCandles) {
  if (!hourlyCandles.length) return null;
  return {
    time: dayStart,
    open: hourlyCandles[0].open,
    high: Math.max(...hourlyCandles.map(candle => candle.high)),
    low: Math.min(...hourlyCandles.map(candle => candle.low)),
    close: hourlyCandles.at(-1).close,
    volume: hourlyCandles.reduce((sum, candle) => sum + (Number(candle.volume) || 0), 0),
    quoteVolume: hourlyCandles.reduce((sum, candle) => sum + quoteVolume(candle), 0)
  };
}

function replaySignals({ symbol, dailyCandles, hourlyCandles }) {
  const daily = [...dailyCandles].sort((left, right) => left.time - right.time);
  const hourly = [...hourlyCandles].sort((left, right) => left.time - right.time);
  const records = [];
  const emitted = new Set();
  const emit = record => {
    if (!record) return;
    const identity = `${symbol}:${record.signalType}:${record.candleTime}`;
    if (emitted.has(identity)) return;
    emitted.add(identity);
    records.push({ symbol, ...record });
  };

  // A completed signal first exists at the daily close. Future daily candles
  // are kept out of the scorer by its signal-index bounded windows.
  for (let index = BULLS2_RULES.swingLeft; index < daily.length; index += 1) {
    emit(evaluateBulls2Signal({
      dailyCandles: daily,
      signalIndex: index,
      observedAt: daily[index].time + DAY_MS,
      kind: '1Day'
    }));
  }

  // Rebuild each in-progress daily candle hour by hour, then retain just its
  // first valid observation.
  const hoursByDay = new Map();
  for (const candle of hourly) {
    const dayStart = Math.floor(candle.time / DAY_MS) * DAY_MS;
    if (!hoursByDay.has(dayStart)) hoursByDay.set(dayStart, []);
    hoursByDay.get(dayStart).push(candle);
  }
  const dailyByStart = new Map(daily.map((candle, index) => [candle.time, index]));
  for (const [dayStart, dayHours] of hoursByDay) {
    const signalIndex = dailyByStart.get(dayStart);
    if (signalIndex === undefined) continue;
    const historical = daily.slice(0, signalIndex);
    for (let index = 0; index < dayHours.length; index += 1) {
      const developing = synthesizeDailyCandle(dayStart, dayHours.slice(0, index + 1));
      const observedAt = dayHours[index].time + HOUR_MS;
      // At the final hourly close the daily candle is complete and belongs to
      // the 1Day replay, not the in-progress 0Day stream.
      if (observedAt >= dayStart + DAY_MS) continue;
      const record = evaluateBulls2Signal({
        dailyCandles: [...historical, developing],
        signalIndex: historical.length,
        observedAt,
        kind: '0Day'
      });
      if (record) {
        emit(record);
        break;
      }
    }
  }
  return records.sort((left, right) => left.detectedAt - right.detectedAt || left.signalType.localeCompare(right.signalType));
}

function entryAtFiveHours({ signalDetectedAt, hourlyCandles }) {
  const targetTime = signalDetectedAt + 5 * HOUR_MS;
  const candle = [...hourlyCandles].sort((left, right) => left.time - right.time)
    .find(item => item.time + HOUR_MS >= targetTime);
  return candle ? { time: candle.time + HOUR_MS, price: candle.close } : null;
}

function measureForwardOutcomes({ entry, hourlyCandles, horizonsDays = [1, 3, 7, 14, 30] }) {
  if (!entry || !Number.isFinite(entry.price) || entry.price <= 0) return {};
  const hourly = [...hourlyCandles].sort((left, right) => left.time - right.time);
  return Object.fromEntries(horizonsDays.map(days => {
    const endTime = entry.time + days * DAY_MS;
    const window = hourly.filter(candle => {
      const closeTime = candle.time + HOUR_MS;
      return closeTime > entry.time && closeTime <= endTime;
    });
    const close = window.at(-1);
    if (!close || close.time + HOUR_MS < endTime) return [`${days}d`, null];
    const pct = value => Number((((value / entry.price) - 1) * 100).toFixed(10));
    return [`${days}d`, {
      returnPercent: pct(close.close),
      mfePercent: pct(Math.max(...window.map(candle => candle.high))),
      maePercent: pct(Math.min(...window.map(candle => candle.low)))
    }];
  }));
}

module.exports = {
  DAY_MS,
  HOUR_MS,
  BULLS2_RULES,
  findConfirmedSwingLows,
  evaluateBulls2Signal,
  replaySignals,
  entryAtFiveHours,
  measureForwardOutcomes
};

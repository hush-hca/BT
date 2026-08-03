# Daily support bullish-candle variants

## Best holdout-balanced candidate

```json
{
  "variant": "sweep_reclaim",
  "lookback": 60,
  "swing_side": 3,
  "support_tolerance": 0.0075,
  "stop_buffer": 0.005,
  "reward_risk": 3.0,
  "slippage": 0.0003,
  "commission_per_side": 0.0005,
  "min_body_ratio": 0.3,
  "close_top_fraction": 0.3,
  "trend_sma": 0,
  "volume_multiplier": 0.0
}
```

The candidate was selected from the focused 60-bar / 3R grid using the 2024+ holdout. It meets the screening rule on both assets: at least 10 closed trades, positive total R, and profit factor above 1.

| Symbol | Trades | Win rate | Expectancy (R) | PF |
| --- | ---: | ---: | ---: | ---: |
| BTCUSDT | 13 | 38.5% | +0.47 | 1.76 |
| ETHUSDT | 14 | 50.0% | +0.96 | 2.92 |

This does not meet the 60% win-rate target on BTC. It is the strongest holdout-balanced candidate found in this focused search, not proof of a durable live-trading edge.

# PEPEUSDT fixed sweep-reclaim configurations

## Method
- Fixed configurations #21, #20, #29; no parameters were selected using PEPE data.
- Signal: confirmed daily support swing-low, sweep below support, then close back above it with bullish strong-close rules.
- Entry: next daily open. One position at a time. 0.03% adverse slippage per side and 0.10% round-trip commission.
- Evaluation: 2024-01-01 UTC onward; indicators and support levels receive 250 days of prior warmup data.
- Limitation: PEPE has materially shorter market history than BTC/ETH, so this is not a comparable multi-cycle validation.

## Holdout results
```csv
symbol,split,variant,config_id,trades,win_rate,expectancy_r,profit_factor,max_drawdown_r,total_r
PEPEUSDT,holdout_2024_plus,sweep_reclaim,20,11,0.09090909090909091,-0.6458036090458585,0.28961603004955566,-8.000000000000002,-7.103839699504444
PEPEUSDT,holdout_2024_plus,sweep_reclaim,21,11,0.09090909090909091,-0.6451368300566965,0.2903494869376339,-8.0,-7.096505130623662
PEPEUSDT,holdout_2024_plus,sweep_reclaim,29,9,0.1111111111111111,-0.5662783478470735,0.3629368586720424,-6.000000000000001,-5.096505130623662
```

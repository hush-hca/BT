# Backtest Research Dashboard

Static dashboard for multi-strategy backtest research. The first study presents the BTC/ETH daily support-bounce bullish-candle test and its 2024+ holdout result.

## Vercel deployment

The site is a root-level static site and includes a zero-dependency build verification. In Vercel, import `hush-hca/BT` and use these exact settings:

- Production Branch: `main`
- Root Directory: `./` (leave as the repository root)
- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: leave empty

Every Vercel Git deployment runs `npm run build`; it fails if the HTML, JavaScript, CSS, chart files, or Config #5016 details are missing. The deployment URL must be opened at `/`, for example `https://your-project.vercel.app/`.

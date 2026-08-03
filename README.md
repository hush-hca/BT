# Backtest Research Dashboard

Static dashboard for multi-strategy backtest research. The first study presents the BTC/ETH daily support-bounce bullish-candle test and its 2024+ holdout result.

## Dashboard controls

- Click any configuration ID to open its exact backtest rules directly below that table row; click it again to close the rules.
- Use the `KR` / `EN` buttons in the top navigation to switch dashboard language.
- The two equity-curve charts use actual trade logs for Config #5016 only; they are not relabelled when another configuration is selected.
- Use the report selector in navigation to choose a completed backtest study. Add a new completed strategy as a `reports` data object with its title, market, metrics, rules, configurations, and chart references.

## Vercel deployment

The site is a root-level static site and includes a zero-dependency build verification. In Vercel, import `hush-hca/BT` and use these exact settings:

- Production Branch: `main`
- Root Directory: `./` (leave as the repository root)
- Framework Preset: `Other`
- Build Command: turn on Override and leave it empty
- Output Directory: `.` (repository root)

`vercel.json` explicitly sets the output directory to `.` so a stale Vercel project setting cannot make a deployment look for `public/`. Before every push, run `node scripts/verify-dashboard.mjs`; it fails if the HTML, JavaScript, CSS, chart files, or Config #5016 details are missing. The deployment URL must be opened at `/`, for example `https://your-project.vercel.app/`.

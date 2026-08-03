# Strategy report selector design

## Goal

Allow the dashboard to list completed backtest strategies and switch between their reports without duplicating dashboard rendering code.

## Data structure

- A `reports` array contains one object per completed backtest strategy.
- Each report has a stable `id`, Korean and English name, market/data description, research status, summary metrics, rules, configurations, and optional chart references.
- The existing BTC/ETH daily support-bounce study is the first real report.
- Only reports with completed data are included; there are no empty placeholder strategies.

## Interface

- Add a report `<select>` control to the navigation beside the KR/EN control.
- Choosing a report updates the title, summary, rules, charts, and configuration-performance table.
- The selected report is preserved when switching KR/EN but its open configuration details are reset.
- The UI begins with the existing support-bounce report selected.

## Quality and compatibility

- Keep the implementation dependency-free and compatible with Vercel root static output.
- Store JavaScript source as UTF-8 and make `index.html` declare UTF-8 so Korean labels display correctly.
- Extend static verification to require the report selector, `reports` data, and UTF-8 declaration.

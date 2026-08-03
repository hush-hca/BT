# Config inspector and bilingual dashboard design

## Goal

Make every configuration shown in the dashboard inspectable. Selecting a configuration reveals its full backtest rule set. The interface must switch completely between Korean and English and use the existing static Vercel-compatible implementation.

## Interaction

- The top navigation contains a `KR` / `EN` language toggle. Korean is the default.
- Each configuration ID in the near-miss table is a keyboard-accessible button.
- Selecting an ID updates one rule-inspector panel and marks that table row as selected.
- The default selection is configuration `#5016`.
- The inspector states that its metrics are the 2024+ holdout results and labels each rule in the active language.

## Data model

Each displayed configuration contains its metrics and a `rules` object. Rules include support age, touch band, minimum body ratio, close location, trend filter, volume filter, stop buffer, and reward target. The dashboard must not fabricate rules: all values are the actual values used by the saved optimization configuration.

## Presentation

- Replace the dark palette with a white background, dark text, light bordered cards, and a restrained green accent for selected state.
- Place the language toggle in the navigation line at the top right.
- Retain both actual #5016 BTC and ETH equity-curve images. They continue to represent #5016 only; selecting another configuration does not relabel them as another configuration's curves.

## Verification

- The static verification script checks that the dashboard references the config inspector, both language labels, and both chart files.
- JavaScript syntax check must pass.
- A no-dependency static deployment remains compatible with Vercel root output.

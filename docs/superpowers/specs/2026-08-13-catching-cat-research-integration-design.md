# Catching Cat Research Integration Design

## Goal

Extend BT Lab from a configuration-centric backtest viewer into a bilingual research archive that explains every completed Catching Cat study in sufficient detail to understand the hypothesis, causal testing process, measured result, failure gates, and relationship to the next study. Existing BT reports remain available and unchanged in meaning.

## Scope

Add these nine completed Catching Cat reports:

1. 1D Bulls2 validation evidence
2. 1D Bulls2 six-hour intraday backtest
3. 1D Bulls2 execution validation
4. 1D Bulls3 intraday raw-edge gate
5. 1D Bulls4 daily-support reversal
6. 1D Bulls5 selective trend study
7. 4H daily-support liquidity sweep
8. 4H daily-support volume-lock refinement
9. Daily-support 1H confirmation study

The integration does not claim profitability where the source evidence does not. Every displayed number and verdict must be traceable to a committed Catching Cat report or evidence artifact. Runtime logs and cache files are excluded.

## Recommended Information Architecture

Keep the existing single-page report selector, KR/EN toggle, responsive layout, and static zero-dependency deployment. Introduce a second report schema for research narratives instead of forcing the new studies into the old configuration-table schema.

Each research report renders in this order:

1. Identity: title, date, market, timeframe, study family, and verdict.
2. Executive summary: what was tested and what the evidence permits the user to conclude.
3. Metric cards: candidate/sample count, evaluated trades or raw outcomes, return/expectancy, MDD, win rate, profit factor, average holding duration, and modeled costs when the source contains them. Missing or inapplicable metrics display `N/A`, never zero.
4. Objective and hypothesis.
5. Signal and universe rules.
6. Entry, exit, and portfolio rules, or an explicit statement that execution testing was stopped by a raw-edge gate.
7. Research process: data source, period, chronological stages, configuration count, selection procedure, causality safeguards, and holdout state.
8. Results: stage-by-stage tables and the exact gates that passed or failed.
9. Interpretation: failure mechanism, limitations, and why development-only results are not profitability evidence.
10. Research lineage: predecessor, change introduced, and successor when one exists.
11. Evidence files: copied source report plus a curated set of compact JSON/CSV evidence. Very large row-level artifacts are not copied into the dashboard bundle unless required for a displayed claim.

Existing configuration-oriented reports continue to use their current cards, charts, tables, and inline rule inspector.

## Verdict Model

Use a normalized verdict enum while retaining the source wording:

- `promote`: all registered validation and holdout gates passed.
- `reject`: a required validation or walk-forward gate failed.
- `inconclusive`: sample, controls, or required comparisons were insufficient to support promotion.
- `sealed`: testing stopped before holdout; normally combined with `reject` or `inconclusive` in the explanation.

All nine Catching Cat studies currently display a non-promoted verdict. The dashboard must not use green success styling for a positive development-period statistic when validation failed.

## Research Lineage

Render a compact, horizontally scrollable lineage above the detailed narrative:

`Bulls2 validation -> Bulls2 6h/execution -> Bulls3 raw edge -> Bulls4 daily support -> Bulls5 selective trend -> 4H broad sweep -> 4H volume lock -> 1H confirmation`

The Bulls2 six-hour and execution studies are sibling branches. Selecting a lineage node changes the selected report. Each node shows its short verdict and visually distinguishes the active report. The lineage is navigation, not a performance chart.

## Source-Grounded Report Content

### Bulls2 validation

Explain the 0Day and 1Day score distributions, eligible Binance USD-M universe, frozen train/holdout comparison, absolute long-edge gate, and `DO NOT PROMOTE` decision. Report 0Day and 1Day separately rather than blending their populations.

### Bulls2 six-hour

Explain the ten preregistered combinations, causal completed-15m features, six-hour maximum path, fees/slippage, clustered bootstrap, Holm correction, and validation-first stop. Highlight that every tested horizon was negative or statistically insufficient and all holdouts stayed sealed.

### Bulls2 execution

Explain the 1,152 configurations per signal type, 60/20/20 timestamp-safe split, delayed entry search, tested entry/stop/exit families, development-only selection, and failed validation. Display the exact validation metrics: 0Day 55 trades, -0.320R expectancy, PF 0.541; 1Day 51 trades, -0.616R expectancy, PF 0.123.

### Bulls3

Explain that only 0Day score >=50 signals were tested, with volume-conditioned groups and a three-hour raw-return gate before any TP/SL search. Display the 1,480-signal validation baseline: mean -0.204%, median -0.200%, win rate 41.892%. State that exit optimization stopped to avoid fitting exits to a signal without directional edge.

### Bulls4

Explain the causal daily-support reversal reconstruction and matched away/touch controls. Display 2,657 signals and the 1,597/529/531 split. Show the three-day validation signal result: mean -1.596%, median -1.744%, win rate 37.996%, including the failed touch-control uplift. Clearly label the positive score-80 band as a small descriptive subgroup, not validated evidence.

### Bulls5

Explain causal top-150 eligibility, trend/RelVol selection, structural breakout/retest execution, and portfolio gates. Display 2,272 retained candidates from 2,657 raw events, 385 universe rejections, 54 frozen configurations, and at most two development fills per configuration. Verdict: no development-eligible configuration, validation not run, holdout sealed.

### 4H broad sweep

Explain causal daily support, confirmed 4H liquidity pools, top-150 turnover membership, immediate next-4H-open raw return, 0.20% cost, and the terminal raw-edge gate. Display 6,948 signals and 4,158/1,399/1,391 split. Validation: mean +0.0723%, median -0.0150%, win 49.89%, bootstrap 95% [-0.5555%, +0.6870%]. Disclose that the matched-control collection was absent, while noting the independent gates also failed.

### 4H volume lock

Explain the preregistered refinement of the broad population using RelVol >=2, pool tests >=4, and body ratio >=0.50, plus the planned one-time profit lock. Display 634 events and 385/122/127 split. Contrast positive development mean +0.5074% with validation mean -0.2454%, median +0.0732%, win 50.00%, bootstrap [-1.1772%, +0.7149%]. State that only six validation controls matched, structural execution never ran, and holdout remained sealed.

### 1H confirmation

Explain the delayed higher-low, pivot breakout, Session VWAP, top-percentile RelVol, structural target, one-time profit lock, 16 configurations, six chronological folds, and exact walk-forward gates. Display 6,948 candidates, 5,557 research and 1,391 sealed holdout descriptors, 2,259 confirmations, and only one filled OOS trade. Show total return +0.1178%, one of five positive folds, PF unavailable, MDD 0, and why the minimum 100 trades and four-of-five positive-fold gates failed. The positive sole trade must not be presented as evidence of an edge.

## Data Model

Create a dedicated `researchReports` collection whose records contain:

- stable ID, family, sequence, date, bilingual title/summary/verdict;
- market, timeframe, data source, period, cost model, stage counts, holdout status;
- bilingual objective, hypothesis, rule sections, process steps, findings, limitations, and next-step explanation;
- normalized metric cards with `value`, `unit`, `stage`, and bilingual label;
- result tables with explicit columns and rows;
- lineage predecessor/successor IDs;
- evidence file labels and public asset paths.

Rendering must treat `null` as unavailable. Percentage, R, duration, and count formatting are explicit per metric rather than inferred from arbitrary numbers.

## Evidence Packaging

Copy all nine Markdown reports into namespaced folders under `assets/catching-cat-research/`. Copy only compact artifacts necessary to substantiate displayed stage metrics, configuration summaries, metadata, frozen-selection state, or methodology. Link each copied file in the file viewer. Preserve filenames where practical and add a per-study README that records the source Catching Cat commit.

Do not copy cache directories, download failures larger than needed for a summary, runtime logs, or massive candidate/attempt row files. The dashboard copy is an explanatory archive; the Catching Cat repository remains the full reproducibility source.

## Bilingual Content and Encoding

All new UI labels and narrative content have authored Korean and English values. Korean text must be stored and served as valid UTF-8. This work also replaces visibly mojibaked shared labels encountered in the existing report shell when those labels are touched. Research identifiers, config IDs, symbols, formulas, and source verdict strings remain language-neutral.

## Interaction and Responsive Behavior

- Selecting a report resets any open evidence file and scrolls the report content to its heading without disrupting the selector.
- Narrative sections use native disclosure controls on narrow screens and remain expanded on desktop.
- Wide result tables retain horizontal scrolling, sticky first columns where useful, and accessible captions.
- Evidence files load on demand and preserve the existing copy action.
- The lineage remains keyboard navigable and horizontally scrollable.
- No charts are invented. A research report without a source-backed equity series shows results tables and process diagrams only.

## Verification

Extend the zero-dependency dashboard verifier to require:

- all nine stable research IDs;
- both language values for each required narrative field;
- valid normalized verdicts and holdout states;
- existence of every referenced evidence file;
- exact anchor metrics for each study, including negative signs and null PF values;
- no unsupported `PROMOTE` verdict;
- no references to cache or runtime-log paths;
- successful rendering of both legacy and research report schemas.

Run syntax checks, the dashboard verifier, a local static-server smoke test, and visual inspection in desktop and mobile widths for both languages. Broken Korean encoding is a release blocker.

## Non-Goals

- Re-running or changing any backtest.
- Selecting a new profitable strategy.
- Inventing equity curves or metrics absent from evidence.
- Copying the entire multi-gigabyte research cache.
- Replacing the BT dashboard design system or deployment architecture.


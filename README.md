# Backtest Research Dashboard

Static, zero-runtime-dependency dashboard for completed backtest studies. It preserves the original strategy dashboards and adds a bilingual Catching Cat research archive with traceable public evidence.

## Report schemas

The selector serves two intentionally separate schemas:

- Legacy reports live in the `reports` array in `app.js`. They retain the original dashboard-specific fields, configuration tables, rules, metrics, and chart references.
- Research reports live in `research-reports.js`, have `kind: 'research'`, and are rendered by `research-renderer.js`. They include the study objective and hypothesis, rules, process, metrics, result tables, findings, failed gates, limitations, next step, lineage, holdout status, verdict, and evidence links.

Do not convert a legacy report merely to make it appear in the research archive. New Catching Cat studies should use the research schema; existing legacy studies should keep their numerical meaning and rendering path.

## Bilingual research records

Every research record must provide non-empty UTF-8 Korean (`ko`) and English (`en`) text for:

- `title`, `summary`, `verdictExplanation`, `objective`, `hypothesis`, and `nextStep`
- every entry in `rules`, `process`, `findings`, `failedGates`, and `limitations`
- every metric label, result-table caption and column label, and evidence label

Unavailable metric values must be `null`, which renders as `N/A`; do not use numerical zero to represent missing or unevaluated performance. Each metric also needs an explicit supported `unit` and stage so formatting does not imply unsupported precision or meaning.

## Evidence packaging

`scripts/package-catching-cat-research.mjs` is the manifest-driven boundary between the source research repository and this public static site. Each manifest entry declares a stable study ID, source report, pinned source commit, and a small allowlist of optional JSON evidence. The packager writes `assets/catching-cat-research/<study-id>/README.md` and `report.md`, plus only declared compact evidence such as `metadata.json`, `stage-metrics.json`, `grid-summaries.json`, or `frozen-configuration.json`.

From the repository root, package the current source snapshot with:

```powershell
node scripts/package-catching-cat-research.mjs --source ../outputs/catching-cat --destination assets/catching-cat-research
```

The destination is rebuilt from the manifest. Runtime logs, caches, `attempts.json`, `candidates.json`, undeclared files, and large row-level artifacts must never be copied into the dashboard repository.

## Verdict policy

Research verdicts use the controlled values `reject`, `inconclusive`, or `promote`. A verdict must reflect the frozen validation gates and holdout state, not an attractive development metric. Positive development results must be shown with the adjacent validation failure, and a sealed holdout must not be described as evaluated performance. The current nine-study Catching Cat dataset contains no promotable result, so the validator rejects `promote` for this release.

## Adding a completed research study

1. Add a manifest entry to `scripts/package-catching-cat-research.mjs` with a stable ID, pinned source report and commit, and only the compact evidence needed to substantiate the report.
2. Run the packager and inspect the generated study directory. Do not copy source runtime directories or ad hoc output files.
3. Add the bilingual record to `research-reports.js`, including its lineage and evidence paths. Preserve failed gates, limitations, validation context, and the true holdout status.
4. Update the exact report-count/ID expectations in the schema tests and deployment verifier. The current release gate deliberately expects exactly nine IDs.
5. Run the direct checks and the complete build gate below before committing.

## Validation and build

Run individual checks while developing:

```powershell
node --test scripts/package-catching-cat-research.test.mjs
node --test scripts/research-reports-schema.test.mjs
node --test scripts/research-renderer.test.mjs
node --test scripts/verify-dashboard.test.mjs
node scripts/verify-dashboard.mjs
```

Run the release gate and whitespace check before every push:

```powershell
npm run build
git diff --check
```

`npm run build` runs every Node test followed by the deployment verifier. The verifier retains the legacy asset checks and also validates the nine research IDs, bilingual content, evidence accessibility, anchor metrics, renderer integration, verdict safety, and forbidden evidence paths.

## Dashboard controls

- Select a completed study from the report selector. Catching Cat entries expose lineage navigation and evidence disclosures.
- Use the `KR` / `EN` buttons to switch dashboard language.
- In a legacy configuration table, select a configuration ID to expand its exact rules; select it again to close them.
- The two legacy equity-curve charts use actual trade logs for Config #5016 only and are not relabelled when another configuration is selected.

## Vercel deployment

Import `hush-hca/BT` and use these settings:

- Production Branch: `main`
- Root Directory: `./`
- Framework Preset: `Other`
- Build Command: enable Override and leave it empty
- Output Directory: `.`

`vercel.json` fixes the static output directory at the repository root. Open the deployment at `/`, for example `https://your-project.vercel.app/`.

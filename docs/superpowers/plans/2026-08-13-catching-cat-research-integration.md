# Catching Cat Research Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nine source-grounded Catching Cat strategy studies to BT Lab as detailed bilingual research reports without changing existing backtest results.

**Architecture:** Preserve the zero-dependency static site and legacy report renderer. Add a separate declarative research-report module, a research renderer selected by report type, a compact lineage navigator, and namespaced evidence assets. Verification reads the data module and enforces IDs, bilingual fields, anchor metrics, verdict safety, and evidence-file existence.

**Tech Stack:** ES modules compatible with Node 20 and modern browsers, static HTML/CSS/JavaScript, Node built-in test/assert/fs modules, Vercel static hosting.

## Global Constraints

- Existing BT reports and their numerical meaning remain unchanged.
- Add exactly the nine Catching Cat reports listed in the approved design.
- All claims must be traceable to Catching Cat commit `4d75df4` or its committed predecessor reports.
- Missing metrics render as `N/A`, never numerical zero.
- No invented charts, profitability claims, cache files, runtime logs, or large row-level evidence bundles.
- Korean and English content must both be authored UTF-8 text.
- Holdout status and non-promotion verdicts must match the source evidence.
- Preserve root-level static deployment and zero runtime dependencies.

---

### Task 1: Package the source evidence

**Files:**
- Create: `assets/catching-cat-research/<study-id>/README.md`
- Create: `assets/catching-cat-research/<study-id>/report.md`
- Create selectively: `assets/catching-cat-research/<study-id>/{metadata,stage-metrics,grid-summaries,frozen-configuration}.json`
- Create: `scripts/package-catching-cat-research.mjs`
- Test: `scripts/package-catching-cat-research.test.mjs`

**Interfaces:**
- Consumes: Catching Cat reports at `../outputs/catching-cat/docs/research` and compact committed evidence under `../outputs/catching-cat/research`.
- Produces: deterministic public evidence paths consumed by `research-reports.js` and verified by Task 5.

- [ ] **Step 1: Write the failing packaging test**

Use a temporary source/output tree and assert that the packager copies only the declared files, writes a README containing source commit `4d75df4`, preserves UTF-8 Korean, and rejects `logs`, `.cache`, `attempts.json`, `candidates.json`, and undeclared paths.

- [ ] **Step 2: Run the test and verify red**

Run: `node --test scripts/package-catching-cat-research.test.mjs`

Expected: FAIL because the packager module does not exist.

- [ ] **Step 3: Implement a manifest-driven packager**

Export `STUDY_MANIFEST` and `packageResearch({ sourceRoot, destinationRoot })`. Give every study a stable ID, report filename, optional compact evidence allowlist, and source commit. Copy bytes without rewriting report content. Remove destination files not present in the manifest only inside `assets/catching-cat-research`.

- [ ] **Step 4: Package all nine reports and inspect the manifest output**

Run: `node scripts/package-catching-cat-research.mjs --source ../outputs/catching-cat --destination assets/catching-cat-research`

Expected: nine folders, each with `README.md` and `report.md`; compact evidence only where available and needed.

- [ ] **Step 5: Re-run tests and commit**

Run: `node --test scripts/package-catching-cat-research.test.mjs`

Commit: `feat: package Catching Cat research evidence`

---

### Task 2: Define and validate the bilingual research data model

**Files:**
- Create: `research-reports.js`
- Create: `scripts/research-reports-schema.mjs`
- Test: `scripts/research-reports-schema.test.mjs`

**Interfaces:**
- Produces: `researchReports`, `researchLineage`, `formatResearchMetric(metric, lang)`, and `validateResearchReports(reports, evidenceRoot)`.
- Consumers: Task 3 renderer and Task 5 deployment verifier.

- [ ] **Step 1: Write schema tests for exact required semantics**

Assert exactly nine unique IDs; allowed verdicts `reject|inconclusive|promote`; valid holdout states; Korean and English values for title, summary, verdict explanation, objective, hypothesis, rules, process, findings, limitations, and next step; explicit metric units/stages; valid lineage IDs; and no `promote` record in this dataset. Add anchor assertions for each study, including Bulls3 validation mean `-0.204%`, Bulls4 three-day validation mean `-1.596%`, 4H sweep validation mean `+0.0723%`, volume-lock validation mean `-0.2454%`, and 1H confirmation OOS trade count `1`.

- [ ] **Step 2: Run the schema test and verify red**

Run: `node --test scripts/research-reports-schema.test.mjs`

Expected: FAIL because the data and validator do not exist.

- [ ] **Step 3: Implement the validator and formatter**

Represent unavailable values as `null`. Format counts, percentages, R, hours, PF, and intervals only according to an explicit `unit`. Reject mojibake markers, missing translations, unsupported verdicts, invalid evidence paths, duplicate IDs, and lineage cycles.

- [ ] **Step 4: Author the nine complete report records**

Transcribe the approved design and source reports into bilingual records. Include stage counts, rules, exact research process, stage result tables, failed gates, limitations, and lineage. Do not summarize positive development metrics without the adjacent validation failure.

- [ ] **Step 5: Test and commit**

Run: `node --test scripts/research-reports-schema.test.mjs`

Commit: `feat: add bilingual Catching Cat research data`

---

### Task 3: Add the research-report renderer and interactions

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Create: `research-renderer.js`
- Test: `scripts/research-renderer.test.mjs`

**Interfaces:**
- Consumes: Task 2 `researchReports`, `researchLineage`, and formatter.
- Produces: `renderResearchReport(report, context)`, lineage/report navigation markup, evidence-file buttons, disclosure sections, and language-safe HTML.

- [ ] **Step 1: Extract pure rendering boundaries and write failing tests**

Test a representative rejected report and assert verdict text, `N/A` PF, negative metric signs, stage labels, lineage buttons, all narrative sections, result-table caption, evidence paths, and both languages. Test that no chart element renders without a source chart.

- [ ] **Step 2: Run renderer tests and verify red**

Run: `node --test scripts/research-renderer.test.mjs`

Expected: FAIL because `research-renderer.js` does not exist.

- [ ] **Step 3: Implement the pure research renderer**

Escape narrative and table text. Render metric cards, objective/hypothesis, rules, process timeline, result tables, interpretation, limitations, next step, lineage, and evidence viewer shell. Use semantic headings, `nav`, `table/caption`, buttons, and `details/summary` elements.

- [ ] **Step 4: Integrate the dual-schema selector in `app.js`**

Append research records to the selector with a `kind: 'research'` discriminator. Dispatch legacy reports to the unchanged legacy path and research records to `renderResearchReport`. Preserve KR/EN and file-copy behavior. On report change, reset evidence state and focus/scroll the new report heading. Lineage buttons change the selected report.

- [ ] **Step 5: Correct touched shared encoding defects**

Replace mojibaked shared navigation, file-viewer, accessibility, and rule labels with valid Korean/English UTF-8. Do not alter legacy metrics or configurations.

- [ ] **Step 6: Test and commit**

Run: `node --test scripts/research-renderer.test.mjs scripts/research-reports-schema.test.mjs`

Commit: `feat: render detailed research reports`

---

### Task 4: Style the research archive responsively

**Files:**
- Modify: `styles.css`
- Test: `scripts/research-renderer.test.mjs`

**Interfaces:**
- Consumes: semantic class names emitted by Task 3.
- Produces: desktop/mobile presentation without altering the legacy design system.

- [ ] **Step 1: Add structural class assertions to the renderer test**

Require stable classes for verdict variants, lineage scroller/nodes, metrics, narrative grid, process steps, result tables, disclosures, and evidence area.

- [ ] **Step 2: Implement styles using existing tokens**

Add neutral/reject/inconclusive verdict treatments; horizontally scrollable keyboard-friendly lineage; responsive metric cards; readable long-form prose; numbered process steps; sticky first table columns; and disclosure behavior. Never style a rejected report like success.

- [ ] **Step 3: Add mobile and accessibility details**

At <=720px use one-column narratives, two-column metrics, full-width selector, visible table overflow, at least 44px interactive targets where practical, focus-visible outlines, and reduced-motion handling.

- [ ] **Step 4: Run tests and commit**

Run: `node --test scripts/research-renderer.test.mjs`

Commit: `style: add responsive research archive layout`

---

### Task 5: Strengthen deployment verification

**Files:**
- Modify: `scripts/verify-dashboard.mjs`
- Modify: `package.json`
- Test: `scripts/verify-dashboard.test.mjs`

**Interfaces:**
- Consumes: Task 1 evidence, Task 2 validator/data, Task 3 application modules.
- Produces: a single `npm run build` release gate.

- [ ] **Step 1: Write failure-fixture tests**

Create temporary fixtures proving verification fails for a missing study ID, missing Korean content, bad evidence path, positive sign changed to negative or vice versa, unsupported `promote`, runtime-log/cache reference, missing renderer import, and legacy Config #5016 regression.

- [ ] **Step 2: Run verification tests and verify red**

Run: `node --test scripts/verify-dashboard.test.mjs`

Expected: FAIL until the verifier exposes a testable function and new checks.

- [ ] **Step 3: Refactor and extend the verifier**

Export `verifyDashboard(root)`. Retain all legacy checks and invoke `validateResearchReports`. Check every evidence file with `access`, exact nine IDs, anchor metrics, both languages, renderer imports, verdict safety, and forbidden path patterns.

- [ ] **Step 4: Make build run all deterministic checks**

Set `build` to run Node tests followed by deployment verification without adding dependencies.

- [ ] **Step 5: Run and commit**

Run: `npm run build`

Commit: `test: verify research dashboard evidence`

---

### Task 6: Browser smoke test, documentation, and release

**Files:**
- Modify: `README.md`
- Modify if defects are found: `app.js`, `research-renderer.js`, `styles.css`, `research-reports.js`

**Interfaces:**
- Produces: verified static dashboard and documented future-report workflow.

- [ ] **Step 1: Document the research-report workflow**

Explain the two report schemas, evidence packager, required bilingual fields, validation commands, verdict policy, and how to add a new completed study without copying runtime data.

- [ ] **Step 2: Start a local static server**

Run a local zero-dependency server from the repository root and open `/`.

- [ ] **Step 3: Inspect desktop KR and EN**

Verify all nine selector entries, lineage navigation, exact metric signs, `N/A`, disclosures, evidence loading/copying, legacy reports, and no mojibake or console errors.

- [ ] **Step 4: Inspect mobile KR and EN**

At approximately 390px width verify selector, lineage scrolling, readable prose, table scrolling, focus order, disclosures, and absence of horizontal page overflow outside designated scrollers.

- [ ] **Step 5: Run final checks**

Run: `npm run build`

Run: `git diff --check`

Expected: all tests and deployment verification pass; no malformed UTF-8 or untracked generated runtime files.

- [ ] **Step 6: Commit and push**

Commit: `docs: document Catching Cat research archive`

Push `main` to `https://github.com/hush-hca/BT.git` after confirming the worktree contains only intended dashboard changes.


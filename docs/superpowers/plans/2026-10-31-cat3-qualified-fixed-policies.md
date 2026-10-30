# Cat3 Qualified Fixed Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a dashboard report containing only the twelve Cat3 fixed policies that passed the frozen positive-result gate.

**Architecture:** Package a curated summary and only the twelve corresponding trade ledgers under a stable asset namespace. Add a custom legacy-dashboard report model that renders the twelve metrics and expandable rules, then extend the release verifier with exact report and evidence assertions.

**Tech Stack:** Static HTML/CSS/JavaScript dashboard, Node.js test runner, CSV evidence.

**Spec:** docs/superpowers/specs/2026-10-31-cat3-qualified-fixed-policies-design.md

## Global Constraints

- Include exactly the twelve B fixed policies named in the approved design.
- Exclude failed, negative, and all-results Cat3 evidence.
- Preserve the 0.20% round-trip modelled friction assumption and limitations.
- Keep the existing Cat3 walk-forward report unchanged.

## Review Focus

- A missing or extra ledger must fail release verification.
- A positive but non-qualified Cat3 policy must not appear in the report.
- Every displayed metric must match the curated summary.
- Policy rule expansion must distinguish shortlist from filter-first ordering.
- No copy or viewer path may reach a source log or all-results file.

---

### Task 1: Curate the qualified evidence package

**Files:**
- Create: assets/catching-cat3-qualified-fixed-2026-10-31/SUMMARY.md
- Create: assets/catching-cat3-qualified-fixed-2026-10-31/trades-*.csv

**Interfaces:**
- Consumes: Cat3 portfolio-summary.csv and twelve trades-B-*.csv source files.
- Produces: a fixed list of twelve packaged policy names and corresponding ledgers.

- [ ] **Step 1: Write verifier assertions for the twelve allowed files**
- [ ] **Step 2: Run the verifier test and confirm it fails before packaging**
- [ ] **Step 3: Package the twelve ledgers and bilingual-safe summary**
- [ ] **Step 4: Run the verifier test and confirm it passes**
- [ ] **Step 5: Commit the curated evidence**

### Task 2: Render the qualified-policy dashboard report

**Files:**
- Modify: app.js
- Test: scripts/verify-dashboard.test.mjs

**Interfaces:**
- Consumes: the twelve curated policy records and file paths from Task 1.
- Produces: cat3-qualified-fixed-policies report with expandable rule rows.

- [ ] **Step 1: Add a failing release assertion for the report ID and a representative policy metric**
- [ ] **Step 2: Run the relevant test and confirm it fails**
- [ ] **Step 3: Add the bilingual report, 12 metric rows, rule details, and ledger file links**
- [ ] **Step 4: Run the relevant test and confirm it passes**
- [ ] **Step 5: Commit the dashboard integration**

### Task 3: Lock release verification and publish

**Files:**
- Modify: scripts/verify-dashboard.mjs
- Test: scripts/verify-dashboard.test.mjs

**Interfaces:**
- Consumes: report ID, evidence manifest, and fixed metrics from Tasks 1–2.
- Produces: a release check that rejects missing, extra, or mutated curated evidence.

- [ ] **Step 1: Add exact evidence and metric assertions**
- [ ] **Step 2: Run npm run build and confirm all tests pass**
- [ ] **Step 3: Inspect git diff --check and repository status**
- [ ] **Step 4: Commit and push main**

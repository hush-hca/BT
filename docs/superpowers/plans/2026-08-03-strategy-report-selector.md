# Strategy Report Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users select completed strategy backtest reports from the dashboard navigation.

**Architecture:** Wrap the existing support-bounce study in a `reports` array and render the active object identified by `selectedReportId`. A native select control invokes `renderDashboard()` to switch report data, while language state remains unchanged.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js verifier, Vercel.

## Global Constraints

- Only complete, real backtest reports are present in the selector.
- Report selection updates report-specific title, metrics, rules, charts, and configurations.
- KR/EN selection persists across a report change and configuration details close.
- JavaScript is UTF-8 and the site keeps zero runtime dependencies.

---

### Task 1: Add report data and navigation selector

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/verify-dashboard.mjs`

**Interfaces:**
- Produces: `reports`, `selectedReportId`, and `#report-selector`.

- [ ] **Step 1: Add a failing verifier marker**

Add `report-selector` and `reports` to the required strings; `node scripts/verify-dashboard.mjs` must fail before implementation.

- [ ] **Step 2: Create the report wrapper**

Create `reports` with the existing support-bounce report as its only real record. Include stable ID, translated name, market description, rule set, configurations, and two actual #5016 chart paths.

- [ ] **Step 3: Render and bind select control**

Render `<select id="report-selector">` in navigation. On `change`, set `selectedReportId`, reset `selectedId` to `null`, and call `renderDashboard()`.

- [ ] **Step 4: Style selector**

Style it as a clear compact navigation control and stack navigation controls gracefully on narrow screens.

- [ ] **Step 5: Verify**

Run `node --check app.js; node scripts/verify-dashboard.mjs` and expect exit 0.

### Task 2: Validate encoding and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document adding a report**

Explain that a finished strategy is added as a report data object with its metrics, rules, configurations, and chart references.

- [ ] **Step 2: Verify UTF-8 and static deployment**

Run `node --check app.js`, `node scripts/verify-dashboard.mjs`, and JSON validation for `vercel.json`.

- [ ] **Step 3: Commit and push**

Commit the application, CSS, verifier, README, and this plan as `feat: add strategy report selector`, then push `main`.

## Self-review

- The selector, report data boundary, language behavior, configuration reset, UTF-8, and static deployment checks are all covered.

# Config Inspector and Bilingual Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users inspect the exact rules for every displayed configuration, in Korean or English, in a white-themed dashboard.

**Architecture:** Replace the positional configuration array with rule-bearing objects in `app.js`. Render the selected configuration through one `renderDashboard()` function; table buttons and language buttons update in-memory state and rerender. Keep the static root deployment structure unchanged.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js verification script, Vercel static deployment.

## Global Constraints

- Korean is the initial language; `EN` switches all dashboard labels and rule values to English.
- Every displayed configuration must have real optimization-rule values; no fabricated rules.
- Config #5016 equity images remain labelled only as #5016 images.
- No runtime dependencies or framework build output may be added.

---

### Task 1: Model rule-bearing configurations and translations

**Files:**
- Modify: `app.js`
- Test: `scripts/verify-dashboard.mjs`

**Interfaces:**
- Produces: `configurations` objects with `id`, metrics, and `rules` fields.
- Produces: `copy["ko"]` and `copy["en"]` translated labels.

- [ ] **Step 1: Add a failing static-content assertion**

Add these required strings to `scripts/verify-dashboard.mjs`:

```js
"language-toggle", "config-inspector", "supportAge", "touchBand"
```

- [ ] **Step 2: Run the verifier and confirm failure**

Run: `node scripts/verify-dashboard.mjs`

Expected: failure naming a missing dashboard content string.

- [ ] **Step 3: Replace positional arrays with objects**

Use one object per table configuration:

```js
{ id: 5016, metrics: { btc: {...}, eth: {...} }, rules: { supportAge: 60, touchBand: 0.0075, bodyRatio: 0.5, closeTop: 0.3, trendSma: 100, volume: null, stopBuffer: 0.001, targetR: 3 } }
```

Populate every displayed ID with its saved rule set.

- [ ] **Step 4: Add Korean and English copy maps**

Include translated labels for all navigation, summary, rule, metric, and table fields. `copy.ko` supplies Korean text and `copy.en` supplies English text.

- [ ] **Step 5: Run verification**

Run: `node --check app.js; node scripts/verify-dashboard.mjs`

Expected: both commands exit 0.

### Task 2: Render interactive selection and language control

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: rule-bearing `configurations` and `copy` from Task 1.
- Produces: `renderDashboard()`, selected table buttons, and language switch buttons.

- [ ] **Step 1: Implement state and rendering**

Initialize state with:

```js
let selectedId = 5016;
let language = "ko";
```

Implement `renderDashboard()` to render `#config-inspector`, the selected configuration rules, clickable configuration ID buttons, and `#language-toggle` buttons.

- [ ] **Step 2: Bind interactions after each render**

Bind `.config-select` buttons to set `selectedId = Number(button.dataset.id)` and re-render. Bind language buttons to update `language` and re-render. Add `aria-pressed` to the active controls.

- [ ] **Step 3: Apply a white theme**

Replace dark CSS variables with a white background, near-black text, light gray borders, and green selected controls. Preserve responsive table and chart layout.

- [ ] **Step 4: Verify static behavior markers**

Run: `node --check app.js; node scripts/verify-dashboard.mjs`

Expected: both commands exit 0.

### Task 3: Verify and publish

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: final static dashboard and Vercel configuration.

- [ ] **Step 1: Document controls**

Add concise instructions explaining configuration selection and the KR/EN toggle.

- [ ] **Step 2: Run complete checks**

Run:

```powershell
node --check app.js
node scripts/verify-dashboard.mjs
Get-Content -Raw vercel.json | ConvertFrom-Json | Out-Null
```

Expected: each command exits 0.

- [ ] **Step 3: Commit and push**

```powershell
git add app.js styles.css scripts/verify-dashboard.mjs README.md
git commit -m "feat: add bilingual config inspector"
git push origin main
```

## Self-review

- Spec coverage: Task 1 provides real rule data and translation maps; Task 2 provides selectable configurations, language control, and white presentation; Task 3 documents and validates Vercel-compatible static output.
- Placeholder scan: no incomplete implementation steps remain.
- Type consistency: `selectedId`, `language`, `configurations`, `copy`, and `renderDashboard()` are named consistently across tasks.

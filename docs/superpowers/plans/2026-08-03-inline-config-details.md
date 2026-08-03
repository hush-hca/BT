# Inline Configuration Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open exact configuration rules directly beneath the clicked performance-table row without moving the viewport.

**Architecture:** Keep one open configuration ID in state. Table rendering inserts a detail row after the matching metric row; all other rules remain in the existing data objects. Remove the now-redundant top inspector and bar chart sections.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js static verifier.

## Global Constraints

- One configuration detail row may be open at a time; clicking it again closes it.
- KR/EN labels and the white theme remain available.
- The inline rule values remain the saved optimization values.
- No scrolling is triggered by a configuration selection.

---

### Task 1: Render inline details and remove duplicate sections

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/verify-dashboard.mjs`

**Interfaces:**
- Consumes: `configurations`, `copy`, `selectedId`, `ruleRows()`.
- Produces: `.config-detail-row` below the active metric row.

- [ ] **Step 1: Make the verifier fail for inline rendering**

Add `config-detail-row` to the required strings in `scripts/verify-dashboard.mjs`, then run `node scripts/verify-dashboard.mjs` and confirm it fails.

- [ ] **Step 2: Render the detail row after the selected table row**

In the `rows` mapping, append this exact table fragment only when `item.id === selectedId`:

```js
<tr class="config-detail-row"><td colspan="5">${ruleRows(item.rules, t)}</td></tr>
```

Remove the standalone `#config-inspector` section and the weaker-asset bar-chart section.

- [ ] **Step 3: Toggle without scrolling**

Change configuration click handling to set `selectedId` to `null` when the clicked ID is already selected; otherwise assign its ID. Call `renderDashboard()` only; do not call `scrollIntoView`.

- [ ] **Step 4: Add inline-row UI states**

Style `.config-detail-row td`, selected table rows, hover rows, and configuration buttons for a pale green expanded surface, clear borders, keyboard focus, and mobile-safe table overflow.

- [ ] **Step 5: Verify**

Run `node --check app.js; node scripts/verify-dashboard.mjs` and expect both commands to exit 0.

### Task 2: Document and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the interaction description**

State that clicking a configuration ID opens its rules directly beneath that row and clicking again closes it.

- [ ] **Step 2: Run complete checks**

Run `node --check app.js`, `node scripts/verify-dashboard.mjs`, and `Get-Content -Raw vercel.json | ConvertFrom-Json | Out-Null`.

- [ ] **Step 3: Commit and push**

Run `git add app.js styles.css scripts/verify-dashboard.mjs README.md docs/superpowers/plans/2026-08-03-inline-config-details.md`, then commit with `feat: show config rules inline` and push `main`.

## Self-review

- Spec coverage: Task 1 supplies inline detail rendering, no-scroll toggling, duplicate-chart removal, and UI refinement; Task 2 documents and verifies the final static deployment.
- Placeholder scan: no incomplete requirements are present.
- Type consistency: `selectedId`, `ruleRows()`, and `.config-detail-row` are used consistently.

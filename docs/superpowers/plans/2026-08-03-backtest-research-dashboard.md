# Backtest Research Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reusable multi-strategy backtest research dashboard seeded with the BTC/ETH daily support-bounce results.

**Architecture:** A single static React route reads a local strategy manifest and renders reusable overview, rule, metric, chart, and candidate-table sections. Static result data is generated from the completed backtest CSVs and includes extension guidance for future strategies.

**Tech Stack:** React, TypeScript, Vite, CSS, static JSON data.

## Global Constraints

- No secrets, Telegram configuration, or private raw credentials enter the repository.
- Clearly label research limitations and the failed 60%/3R objective.
- New strategy result payloads must render through the same manifest-driven UI.

---

### Task 1: Site foundation and structured data

**Files:**
- Create: site scaffold and `src/data/strategies.ts`

- [ ] Initialize the static site structure.
- [ ] Convert completed metrics and closest candidates into typed strategy data.
- [ ] Add a second empty-state strategy placeholder to demonstrate extensibility.

### Task 2: Dashboard interface

**Files:**
- Create: `src/App.tsx`, `src/styles.css`

- [ ] Build overview, result-status, strategy rule, metrics, chart, and candidate-table sections.
- [ ] Implement responsive layout and accessible labels.
- [ ] Use the strategy manifest rather than hard-coded page sections.

### Task 3: Validate and publish source

**Files:**
- Modify: project metadata and README

- [ ] Build the site.
- [ ] Confirm the rendered data matches the backtest outputs.
- [ ] Commit and push the dashboard to `hush-hca/BT`.

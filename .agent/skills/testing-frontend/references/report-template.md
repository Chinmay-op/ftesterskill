# Report Template — Frontend Quality Report

**This is the template the agent MUST follow when generating the final test report.**
Copy this structure exactly. Fill in the `[PLACEHOLDER]` values with actual data.
Keep the tone professional but human-readable — like a senior engineer writing
to their team, not a machine spitting out logs.

---

<!-- REPORT STARTS HERE — COPY BELOW THIS LINE -->

# 🔬 Frontend Quality Report

**Project:** [PROJECT_NAME]
**Date:** [FULL_DATE, e.g., Wednesday, May 28 2025 · 4:30 PM IST]
**Tested by:** Antigravity Frontend Testing Agent
**Target:** [URL, e.g., http://localhost:4173]
**Duration:** [TOTAL_TIME, e.g., 3m 42s]

---

## 🏥 Health Score

<!-- Calculate: (passed_domains / total_domains) × 100, then assign grade -->

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│          ██████████████████████░░░░░     [SCORE]/100        │
│                                                             │
│          Grade: [A+ / A / B / C / D / F]                    │
│                                                             │
│          [PASSED] of [TOTAL] domains passed                 │
│          [ISSUES_COUNT] issues found                         │
│          [CRITICAL_COUNT] critical · [HIGH_COUNT] high       │
│          [MEDIUM_COUNT] medium · [LOW_COUNT] low             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means:**
- **A+ (95-100):** Production-ready. Ship it. 🚀
- **A (85-94):** Very solid. Minor polish items only.
- **B (70-84):** Good foundation, but has issues that should be fixed before production.
- **C (50-69):** Significant problems. Needs work before any user sees this.
- **D (30-49):** Major issues across multiple domains. Not ready.
- **F (0-29):** Critical failures. App is broken or unsafe.

---

## 📊 Domain Results at a Glance

| # | Domain | Status | Issues | Severity | Time | Evidence |
|:-:|--------|:------:|:------:|----------|-----:|----------|
| 1 | Build & Environment | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 2 | Security & Leakage | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 3 | API Endpoints | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 4 | Component & UI | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |
| 5 | Accessibility | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 6 | Performance | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 7 | Network & State | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 8 | Browser DOM & Visual | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |
| 9 | Point of Breakage | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |
| 10 | Cross-Cutting Quality | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |
| 11 | Persona User Journeys | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |
| 12 | UX Heuristic Evaluation | ✅ or ❌ | [n] | [worst severity] | [Xs] | — |
| 13 | Perceived Quality & Trust | ✅ or ❌ | [n] | [worst severity] | [Xs] | [screenshot links] |

---

## 🧠 Executive Summary

<!-- Write 3-5 sentences summarizing the overall quality. Be honest and specific.
     Mention the biggest win and the biggest concern. This is what a PM or lead
     will read first. -->

> [WRITE_SUMMARY_HERE]
>
> **Biggest win:** [e.g., "Zero accessibility violations across all 8 routes — great job
> on semantic HTML and ARIA labels."]
>
> **Top concern:** [e.g., "The dashboard silently swallows API errors. When the /api/threats
> endpoint returns a 500, the user sees a frozen loading spinner instead of an error message.
> This is a P0 fix before launch."]

---

## 🔧 Domain 1: Build & Environment

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Check | Result | Details |
|-------|:------:|---------|
| Clean production build | ✅/❌ | [n] warnings, [n] errors |
| .env sync | ✅/❌ | [details or "all vars documented"] |
| Debug statements | ✅/❌ | [n] console.log / debugger found |
| Build output size | ✅/❌ | [total size] |

<!-- If issues found, explain each one in human terms -->

---

## 🛡️ Domain 2: Security & Leakage

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Check | Result | Details |
|-------|:------:|---------|
| Exposed secrets in bundle | ✅/❌ | [details] |
| Baked-in env variables | ✅/⚠️/❌ | [details] |
| Internal IPs / staging URLs | ✅/❌ | [details] |
| localStorage token audit | ✅/❌ | [details] |
| Console PII leakage | ✅/❌ | [details] |

<!-- For each failure, explain WHAT was found and WHERE -->

---

## 🌐 Domain 3: API Endpoints

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Endpoint | Method | Auth | Status | Latency | Notes |
|----------|--------|:----:|:------:|--------:|-------|
| /api/health | GET | — | ✅ 200 | 45ms | — |
| /api/users/me | GET | 🔒 | ✅ 200 | 120ms | — |
| [more rows...] | | | | | |

**CORS check:** [result]
**Rate limiting:** [result]
**Content-Type headers:** [result]

---

## 🧩 Domain 4: Component & UI

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Component | Forms | States | Modals | Assets | Notes |
|-----------|:-----:|:------:|:------:|:------:|-------|
| [component name] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | [notes] |

---

## ♿ Domain 5: Accessibility

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Check | Result | Details |
|-------|:------:|---------|
| axe-core violations | ✅/❌ | [n] violations across [n] routes |
| Image alt text | ✅/❌ | [n] images missing alt |
| Form labels | ✅/❌ | [n] inputs without labels |
| Tab order | ✅/❌ | [details] |
| Color contrast (WCAG AA) | ✅/❌ | [details] |

<!-- List each violation with impact level and element -->

---

## ⚡ Domain 6: Performance

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

### Bundle Analysis

| Chunk | Raw | Gzipped | Status |
|-------|----:|--------:|:------:|
| main.js | [KB] | [KB] | ✅/❌ |
| vendor.js | [KB] | [KB] | ✅/❌ |
| [chunk].js | [KB] | [KB] | ✅/❌ |
| **Total** | **[KB]** | **[KB]** | — |

### Lighthouse Scores (if available)

```
Performance:   [██████████░░░░░░░░░░]  [score]/100
Accessibility: [████████████████░░░░]  [score]/100
Best Practices:[██████████████░░░░░░]  [score]/100
SEO:           [████████████████████]  [score]/100
```

### Other Checks

| Check | Result | Details |
|-------|:------:|---------|
| Render-blocking scripts | ✅/❌ | [details] |
| Code splitting | ✅/❌ | [details] |
| Lazy loading | ✅/❌ | [details] |

---

## 🔌 Domain 7: Network & State

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

| Check | Result | Details |
|-------|:------:|---------|
| Offline behavior | ✅/❌ | [graceful degradation? service worker?] |
| Fetch deduplication | ✅/❌ | [React Query/SWR configured?] |
| Failed API → visible error | ✅/❌ | [any silent failures?] |
| Auth token refresh | ✅/❌ | [proactive or reactive?] |

---

## 🌍 Domain 8: Browser-Based DOM & Visual Testing

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]
**Screenshots captured:** [n]

### 8a. Page Load & Initial Render

| Route | Title ✓ | Renders | FOUC | CLS | Error Boundary | Screenshot |
|-------|:-------:|:-------:|:----:|:---:|:--------------:|------------|
| / | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅ | [link] |
| /login | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅ | [link] |
| [more routes...] | | | | | | |

### 8b. Interactive States

| Element | Hover | Click | Focus Ring | Disabled | Screenshot |
|---------|:-----:|:-----:|:----------:|:--------:|------------|
| [button/link name] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/N/A | [link] |

### 8c. Form Flows

| Form | Empty → Error | Invalid → Error | Valid → Success | Server Error → Msg | Screenshots |
|------|:-------------:|:---------------:|:---------------:|:------------------:|-------------|
| Login | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | [4 links] |

### 8d. Navigation & Routing

| Test | Result | Details |
|------|:------:|---------|
| Nav links | ✅/❌ | All [n] links navigate correctly |
| Back/Forward | ✅/❌ | [details] |
| Deep linking | ✅/❌ | [n] routes tested |
| 404 fallback | ✅/❌ | [shows fallback page / white screen] |

### 8e. Loading & Empty States

| Feature | Loading State | Loaded State | Empty State | Screenshot |
|---------|:------------:|:------------:|:-----------:|------------|
| [feature] | ✅/❌ | ✅/❌ | ✅/❌ | [link] |

### 8f. Responsive Breakpoints

| Route | Mobile (375×812) | Tablet (768×1024) | Desktop (1440×900) |
|-------|:----------------:|:-----------------:|:------------------:|
| / | ✅/❌ | ✅/❌ | ✅/❌ |
| /login | ✅/❌ | ✅/❌ | ✅/❌ |

**Mobile-specific checks:**

| Check | Result |
|-------|:------:|
| No horizontal scroll | ✅/❌ |
| Hamburger/drawer nav | ✅/❌ |
| No text overflow/clip | ✅/❌ |
| Touch targets ≥ 44×44px | ✅/❌ |

### 8g. Visual Regression

| Status | Details |
|--------|---------|
| Baseline exists? | Yes / No (first run — baselines saved) |
| Screenshots compared | [n] |
| Regressions found | [n] over 0.1% threshold |

<!-- If regressions found, list each with before/after links -->

---

## 🔴 Domain 9: Point of Breakage Detection

**Status:** ✅ No breakages / ❌ [n] breakages found
**Time:** [Xs]

> This section documents every place where the app breaks, crashes, or behaves
> unexpectedly — with the exact trigger, location, and evidence.

### Breakage Log

<!-- Repeat this block for every breakage found. Number them sequentially. -->

---

#### 🔴 POB-001 · [SEVERITY] · [SHORT_TITLE]

| Field | Value |
|-------|-------|
| **Domain** | JS Runtime / Console / Network / DOM / Memory / CSS / Auth |
| **Severity** | 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low |
| **What broke** | [Human-readable description of what the user would experience] |
| **Triggered by** | [Exact action, e.g., "Clicking the 'Refresh' button on the dashboard"] |
| **Location** | `[file:line]` e.g., `src/components/ThreatCard.jsx:47` |
| **Error message** | `[exact error text]` |
| **Stack trace** | [first 3 lines of stack, formatted] |
| **Screenshot** | ![POB-001](output/screenshots/breakage-001.png) |
| **Recommended fix** | [One actionable sentence] |

---

<!-- Continue with POB-002, POB-003, etc. -->

### 9e. Memory & Performance Profile

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 MEMORY PROFILE                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JS Heap (before):      [XX.XX] MB                          │
│  JS Heap (after):       [XX.XX] MB                          │
│  ─────────────────────────────────                          │
│  Delta:                 [+/-XX.XX] MB                       │
│  Threshold:             20.00 MB                            │
│  Status:                ✅ OK / ❌ LEAK SUSPECTED            │
│                                                             │
│  DOM Nodes (before):    [XXXX]                              │
│  DOM Nodes (after):     [XXXX]                              │
│  Delta:                 [+/-XXX]                            │
│  Detached nodes:        [XX]                                │
│                                                             │
│  Idle period tested:    [XX] seconds                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What this means:**
<!-- Explain in plain English whether the app has a memory problem and what to do -->

---

## 🔗 Domain 10: Cross-Cutting Quality Checks

**Status:** ✅ Passed / ❌ Failed
**Time:** [Xs]

### 10a. Third-Party Resilience

| Test | Result | Details |
|------|:------:|---------|
| App works with analytics blocked | ✅/❌ | [details] |
| App works with CDN scripts blocked | ✅/❌ | [details] |
| App works with all third-parties blocked | ✅/❌ | [details] |

### 10b. Font Loading

| Test | Result | Details |
|------|:------:|---------|
| Custom fonts load correctly | ✅/❌ | [font families detected] |
| Fallback fonts render cleanly | ✅/❌ | [layout stable?] |

### 10c. Keyboard Navigation

| Test | Result | Details |
|------|:------:|---------|
| All elements reachable via Tab | ✅/❌ | [n] elements tested |
| Enter/Space activate buttons | ✅/❌ | — |
| Escape closes modals | ✅/❌ | — |
| No keyboard traps | ✅/❌ | [details] |

### 10d. Scroll Behavior

| Test | Result | Details |
|------|:------:|---------|
| Smooth scroll | ✅/❌ | — |
| No scroll jank | ✅/❌ | — |
| Infinite scroll / pagination | ✅/❌/N/A | — |
| Sticky headers/footers | ✅/❌/N/A | — |

### 10e. Dark Mode / Theme

| Test | Result | Details |
|------|:------:|---------|
| Theme toggle works | ✅/❌/N/A | — |
| No invisible text | ✅/❌ | — |
| No hardcoded colors | ✅/❌ | — |
| Preference persists on refresh | ✅/❌ | — |

---

## 👤 User Personas Tested

<!-- List every persona used in Domain 11 testing -->

| Persona | Context | Device | Patience | Knowledge |
|---------|---------|--------|----------|----------|
| [First-time visitor] | [Has never seen this product] | Desktop | Medium | None |
| [Impatient mobile user] | [On phone, low bandwidth] | Mobile | Very low | Moderate |
| [Error-prone user] | [Not tech-savvy, makes mistakes] | Desktop | Medium | Low |
| [add more...] | | | | |

---

## 🎯 Critical User Journeys

<!-- One row per persona × journey combination -->

| Journey | Persona | Success | Steps | Unnecessary | Hesitations | Friction | Abandonment Risk |
|---------|---------|:-------:|:-----:|:-----------:|:-----------:|:--------:|:----------------:|
| [goal description] | [persona name] | ✅/❌ | [n] | [n] | [n] | [0-10] | Low/Med/High |
| [goal description] | [persona name] | ✅/❌ | [n] | [n] | [n] | [0-10] | Low/Med/High |

<!-- For each failed or high-friction journey, explain what went wrong in human terms -->

---

## ⏸️ Hesitation Map

<!-- Document every point where a persona hesitated, retried, or backtracked -->

| # | Journey | Step | Location | What happened | Impact |
|:-:|---------|------|----------|---------------|--------|
| 1 | [goal] | [step #] | [route/element] | [The user paused because...] | [confusion / delay / abandonment] |
| 2 | [goal] | [step #] | [route/element] | [The user retried because...] | [confusion / delay / abandonment] |

---

## 🔍 Usability Heuristic Violations

<!-- Every finding tagged against Nielsen's heuristics -->

| # | Route | Issue | Heuristic(s) | Severity | Why This Confuses Humans | Cognitive Load | Fix |
|:-:|-------|-------|-------------|:--------:|--------------------------|:--------------:|-----|
| 1 | [route] | [description] | H1, H9 | 🔴/🟠/🟡/🔵 | [plain-language explanation] | High/Med/Low | [one-sentence fix] |
| 2 | [route] | [description] | [H#] | 🔴/🟠/🟡/🔵 | [plain-language explanation] | High/Med/Low | [one-sentence fix] |

### Heuristic Cluster Summary

| Cluster | Heuristics | Violations | Worst Severity |
|---------|------------|:----------:|:--------------:|
| Clarity | H2, H6, H8 | [n] | [severity] |
| Feedback | H1, H9 | [n] | [severity] |
| Control | H3, H5, H7 | [n] | [severity] |
| Consistency | H4 | [n] | [severity] |
| Trust | H1, H9, H10 | [n] | [severity] |

---

## 💬 Confidence Narrative

<!-- Step-by-step replay of each journey in human terms. Write as prose. -->

### Journey: [GOAL_DESCRIPTION] — [PERSONA_NAME]

> [Write a paragraph-by-paragraph narrative of what the user experienced.
> Include what they saw, what they expected, where they hesitated, and
> how they felt at each step. Use the confidence annotations (✅ Clear /
> ⚠️ Uncertain / ❌ Confusing / 🚫 Misleading) to guide the tone.]
>
> **Step 1** ✅ — [narrative sentence]
>
> **Step 2** ⚠️ — [narrative sentence explaining the hesitation]
>
> **Step 3** ❌ — [narrative sentence explaining the confusion]

<!-- Repeat for each journey -->

---

## 🏷️ Semantic Locator Health

<!-- How discoverable are interactive elements through semantic locators? -->

```
┌─────────────────────────────────────────────────────────────┐
│  🏷️ SEMANTIC LOCATOR HEALTH                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total interactive elements:  [XX]                          │
│  Discoverable by role/label:  [XX] ([XX]%)     ✅            │
│  Requires testid fallback:    [XX]              ⚠️            │
│  Requires CSS fallback:       [XX]              ❌            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Control | Route | By Role/Label? | Fallback Used | Concern |
|---------|-------|:--------------:|---------------|--------|
| [button/input/link name] | [route] | ✅/❌ | [testid / CSS selector] | [concern or —] |

---

## ⚠️ Experience Debt Summary

<!-- Issues that don't crash the app but make it feel worse -->

### Clarity Debt
<!-- Confusing labels, missing help text, jargon -->
- [issue description]

### Trust Debt
<!-- Silent failures, vague states, broken feedback loops -->
- [issue description]

### Efficiency Debt
<!-- Unnecessary steps, missing shortcuts, poor defaults -->
- [issue description]

### Polish Debt
<!-- Inconsistent spacing, clipped text, missing empty states -->
- [issue description]

---

## 📸 Visual Evidence Index

All screenshots captured during this test run:

| # | Screenshot | Route/Element | Viewport | What it shows |
|:-:|------------|---------------|----------|---------------|
| 1 | [link to file] | / | Desktop | Initial page load |
| 2 | [link to file] | / | Mobile | Responsive layout |
| 3 | [link to file] | /login | Desktop | Empty form validation errors |
| [continue for all screenshots...] | | | | |

**Total screenshots:** [n]
**Saved to:** `output/screenshots/`
**Baselines:** `output/baselines/`

---

## ⏭️ Skipped Domains

<!-- List every domain or sub-check that was skipped, with a clear reason -->

| Domain / Check | Reason Skipped |
|---------------|----------------|
| [e.g., 10e. Dark Mode] | App does not support theme switching |
| [e.g., 3. API Endpoints] | No live API endpoints in static demo app |

---

## 💡 Recommendations

<!-- Prioritized list of the most impactful improvements. Write these as
     actionable sentences a developer can act on immediately. -->

### 🔴 Critical (fix before shipping)

1. [Actionable recommendation]
2. [Actionable recommendation]

### 🟠 High (fix this sprint)

1. [Actionable recommendation]

### 🟡 Medium (add to backlog)

1. [Actionable recommendation]

### 🔵 Low (nice to have)

1. [Actionable recommendation]

---

## 📋 Test Execution Timeline

| Time | Event |
|-----:|-------|
| 0:00 | Test run started |
| 0:02 | Domain 1 (Build) — ✅ passed |
| 0:05 | Domain 2 (Security) — ✅ passed |
| 0:12 | Domain 3 (API) — ❌ 2 issues |
| [continue...] | |
| [TOTAL] | Test run completed |

---

*Report generated by Antigravity Frontend Testing Agent · [DATE]*
*Skill version: testing-frontend v3.0 (13-domain + human-like UX)*

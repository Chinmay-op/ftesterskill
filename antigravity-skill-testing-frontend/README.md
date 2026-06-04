# f-tester Pro Max

[![npm version](https://img.shields.io/npm/v/f-tester.svg?style=flat-square)](https://www.npmjs.com/package/f-tester)
[![npm downloads](https://img.shields.io/npm/dm/f-tester.svg?style=flat-square)](https://www.npmjs.com/package/f-tester)
[![GitHub stars](https://img.shields.io/github/stars/Chinmay-op/ftesterskill.svg?style=flat-square)](https://github.com/Chinmay-op/ftesterskill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> An AI skill that provides **testing intelligence** for building bulletproof, human-validated frontends.

**16 Testing Domains** · **6 Human Personas** · **10 UX Heuristics** · **Playwright Integration**

---

## What's New in v2.0

### Intelligent Persona-Driven Testing Engine

The flagship feature of v2.0 is the **Persona-Driven User Journey Tester** — an AI-powered reasoning engine that simulates real human behaviors to detect UX flaws, breakage points, and accessibility gaps before your users do.

```
+----------------------------------------------------------------------------------------+
|  TARGET: Frontend Application - RECOMMENDED TESTING REGIMEN                            |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  PATTERN: Plan-Validate-Execute                                                        |
|     Focus: Cross-cutting quality, visual stability, and human usability                |
|     Core Domains:                                                                      |
|       1. Build & Environment Validation                                                |
|       2. Security & Leakage Checks (incl. headers, SRI, dependencies)                  |
|       3. API Endpoint Testing                                                          |
|       4. Browser-Based Visual Testing                                                  |
|       5. Persona-Driven User Journeys                                                  |
|       6. Visual Perception, Brand Fit & Taste Critique                                 |
|       7. Design System Consistency                                                     |
|       8. UX Writing & Microcopy Quality                                                |
|                                                                                        |
|  PERSONAS:                                                                             |
|     - First-time visitor (Skips onboarding, misreads CTAs)                             |
|     - Impatient mobile user (Taps wrong targets, abandons easily)                      |
|     - Keyboard-only user (Relies entirely on Tab/Enter/Escape)                         |
|     - Error-prone user (Submits invalid data, clicks back mid-flow)                    |
|                                                                                        |
|  BREAKAGE DETECTION:                                                                   |
|     JS Runtime Errors: Full stack traces via pageerror                                 |
|     Network Failures: Intercepted via Playwright                                       |
|     Memory Leaks: Heap snapshot comparison                                             |
|                                                                                        |
|  UX HEURISTICS: Nielsen's 10 Heuristics Evaluated                                      |
|     Focus: Clarity, Feedback, Control, Consistency, Trust                              |
|                                                                                        |
+----------------------------------------------------------------------------------------+
```

### How The Persona-Driven Testing Engine Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                                │
│     "Test the frontend" or "Run a UX audit"                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. MULTI-DOMAIN SCAN (16 parallel domains)                     │
│     • Security & Leakage checks                                 │
│     • API Endpoint validation                                   │
│     • Visual Regression & DOM tracking                          │
│     • Cross-cutting quality (theme/scroll/network)              │
│     • Accessibility (A11Y) compliance                           │
│     • Core Web Vitals diagnostics                               │
│     • Design System consistency                                 │
│     • UX Writing & Microcopy quality                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. REASONING ENGINE                                            │
│     • Inject personas into user journeys                        │
│     • Map interactions to UX heuristics                         │
│     • Calculate friction & abandonment risk                     │
│     • Detect exact points of breakage & memory leaks            │
│     • Evaluate visual perception & brand fit                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. COMPLETE HEALTH REPORT OUTPUT                               │
│     Grade + Actionable Steps + Visual Evidence                  │
│     + Narrative Replay + Experience Debt Summary                │
│     + Design System Health + Microcopy Scorecard                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16 Hardened Testing Domains

The reasoning engine includes specialized rules for:

| Domain | Examples |
|--------|----------|
| Build & Env | Clean builds, .env sync, no debug logs |
| Security & Leakage | Exposed keys, baked env variables, internal IPs, SRI, dependency audit |
| API & Network | Status codes, offline behavior, deduplication, retry logic |
| Component & UI | Form state coverage, broken assets, loading states |
| Accessibility (A11Y) | Axe-core scans, semantic locators, tab order, contrast, cognitive load |
| Performance & CWV | LCP, INP, CLS diagnostics, bundle size, perceived speed |
| Browser & Visual | FOUC checks, interactive states, responsive grids, baselines |
| Point of Breakage | JS errors, unhandled rejections, DOM mutation breakage |
| Cross-Cutting | Third-party failures, font loading, dark mode, scroll behavior |
| Persona Journeys | Goal-oriented navigation, hesitation maps, friction scoring |
| UX Heuristics | Clarity, control, real-world language matching |
| Perceived Quality | Feedback latency, trust signals, microcopy audit |
| Visual Perception | Brand fit, visual calm, rhythm, emphasis, craftsmanship |
| Design System | Token coverage, component drift, spacing scale, typography adherence |
| UX Writing | CTA labels, helper text, empty states, error messages, terminology |

---

## Features

- **16 Testing Domains** — A comprehensive 360-degree view of your frontend health
- **6 Human Personas** — First-time visitor, Impatient mobile, Keyboard-only, Error-prone, etc.
- **10 UX Heuristics** — Evaluated based on Nielsen's principles
- **Playwright Integration** — Live browser DOM inspection and screenshot diffing
- **Antigravity Browser Subagent** — Native AI web driving
- **Memory & CLS Profiling** — Heap snapshot comparison and layout shift checks
- **Semantic Locator Audit** — Preference for `getByRole` and `getByLabel` over CSS
- **Core Web Vitals** — LCP, INP, CLS measurement via PerformanceObserver injection
- **Visual Perception** — Automated brand fit, visual calm, rhythm, and taste critique
- **Design System Drift** — Token coverage, component family consistency
- **Microcopy Quality** — CTA audit, helper text coverage, terminology consistency

---

## Installation

### Method 1: AI Skill Init (Recommended)

```bash
# Go to your project
cd /path/to/your/project

# Install the AI agent skill with one command
npx f-tester init-skill
```

This copies the complete skill into `.agent/skills/testing-frontend/` — your AI agent will automatically detect and use it.

### Method 2: Global Install (CLI Usage)

```bash
# Install CLI globally
npm install -g f-tester

# Run in any project
f-tester --help
f-tester init-skill
f-tester scan-leakage ./dist
f-tester check-ux-signals ./src
```

### Method 3: Manual Clone

```bash
# Clone the repository
git clone https://github.com/Chinmay-op/ftesterskill.git

# Copy the skill into your project
cp -r ftesterskill/antigravity-skill-testing-frontend/templates/skill \
  /path/to/your/project/.agent/skills/testing-frontend
```

### Prerequisites

Node 18.x and Playwright are required for browser tests.

```bash
# Install playwright browsers
npx playwright install chromium
```

---

## Usage

### Skill Mode (Auto-activate)

The skill activates automatically when you request QA, testing, or auditing. Just chat naturally:

> Run a comprehensive frontend test on my React app

> Check my UI for UX heuristic violations

> Find the exact point of breakage in the checkout flow

> Run a visual regression test on the dashboard

> Evaluate the design system consistency

> Audit the microcopy and UX writing quality

### CLI Mode (Commands)

Use the standalone commands to invoke specific domains manually:

```bash
npx f-tester scan-leakage ./dist
npx f-tester check-ux-signals ./src
npx f-tester dom-tests
npx f-tester diff-screenshots
npx f-tester memory-leaks
npx f-tester run-all
npx f-tester doctor
```

---

## Example Prompts

- Test the frontend and output a markdown report
- Run a UX audit simulating an impatient mobile user
- Scan the build output for exposed API keys
- Test all form loading and error states
- Check the app's perceived quality and trust signals
- Evaluate the design system token coverage
- Audit all CTA labels and microcopy quality

---

## How It Works

1. **You ask** — Request any testing task (test, audit, QA, evaluate)
2. **Test Plan Generated** — The AI automatically builds a 16-domain checklist tailored to your stack
3. **Smart Execution** — Launches Playwright, evaluates API calls, diffs screenshots, tracks JS heap size
4. **Persona Emulation** — Simulates human behavior, calculating friction scores and logging hesitations
5. **Rich Reporting** — Delivers a human-readable health grade, visual evidence index, and prioritized actionable fixes

---

## Supported Stacks

The skill provides automated testing for:

- **Web Frameworks:** React, Next.js, Vue, Nuxt.js, Svelte, Angular, Astro
- **Testing Tools:** Playwright, axe-core, Lighthouse CI, Vitest, Jest

---

## Architecture & Contributing

### For Users

The codebase uses Antigravity Browser Subagents to bridge the gap between AI code generation and human-centric browser usage. Always install via `npx f-tester init-skill` to get the latest heuristics.

### For Contributors

If you want to contribute to this project:

```bash
# 1. Clone the repository
git clone https://github.com/Chinmay-op/ftesterskill.git
cd ftesterskill/antigravity-skill-testing-frontend

# 2. Understand the structure
bin/                         # CLI entry point
packages/cli/                # Commander-based CLI with cosmiconfig
packages/core/               # Core scanning modules (leakage, bundle, DOM)
packages/reporter/           # Markdown and JSON report generators
packages/heuristics/         # UX heuristic evaluation engine
packages/personas/           # Persona-driven journey runner
templates/skill/             # The installable AI agent skill
templates/ci/                # GitHub Actions workflow template
templates/config/            # Default f-tester.config.ts

# 3. Create PR (never push directly to main)
git checkout -b feat/your-feature
git commit -m "feat: description"
git push -u origin feat/your-feature
gh pr create
```

---

## License

MIT © [Chinmay-op](https://github.com/Chinmay-op)

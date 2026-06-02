# f-tester Pro Max
GitHub Release 161 Testing Domains 13 Personas 6 License

npm npm downloads GitHub stars PayPal

An AI skill that provides testing intelligence for building bulletproof, human-validated frontends.

f-tester Pro Max

If you find this useful, consider supporting the project:

PayPal Donate

Other projects
NextLevelBuilder.io | GoClaw.sh | ClaudeKit.cc | TOSE.sh

What's New in v2.0
Intelligent Persona-Driven Testing Engine
The flagship feature of v2.0 is the Persona-Driven User Journey Tester - an AI-powered reasoning engine that simulates real human behaviors to detect UX flaws, breakage points, and accessibility gaps before your users do.

+----------------------------------------------------------------------------------------+
|  TARGET: Frontend Application - RECOMMENDED TESTING REGIMEN                            |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  PATTERN: Plan-Validate-Execute                                                        |
|     Focus: Cross-cutting quality, visual stability, and human usability                |
|     Core Domains:                                                                      |
|       1. Build & Environment Validation                                                |
|       2. Security & Leakage Checks                                                     |
|       3. API Endpoint Testing                                                          |
|       4. Browser-Based Visual Testing                                                  |
|       5. Persona-Driven User Journeys                                                  |
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
|  PRE-DELIVERY CHECKLIST:                                                               |
|     [ ] Zero PII leakage in console/bundle                                             |
|     [ ] No semantic locator gaps (role/label preferred)                                |
|     [ ] CLS < 0.1 and fast UI feedback latency (<100ms)                                |
|     [ ] 4-case form tests passed (Empty, Invalid, Valid, Server Error)                 |
|                                                                                        |
+----------------------------------------------------------------------------------------+

How The Persona-Driven Testing Engine Works
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                                │
│     "Test the frontend" or "Run a UX audit"                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. MULTI-DOMAIN SCAN (13 parallel domains)                     │
│     • Security & Leakage checks                                 │
│     • API Endpoint validation                                   │
│     • Visual Regression & DOM tracking                          │
│     • Cross-cutting quality (theme/scroll/network)              │
│     • Accessibility (A11Y) compliance                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. REASONING ENGINE                                            │
│     • Inject personas into user journeys                        │
│     • Map interactions to UX heuristics                         │
│     • Calculate friction & abandonment risk                     │
│     • Detect exact points of breakage & memory leaks            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. COMPLETE HEALTH REPORT OUTPUT                               │
│     Grade + Actionable Steps + Visual Evidence                  │
│     + Narrative Replay + Experience Debt Summary                │
└─────────────────────────────────────────────────────────────────┘

13 Hardened Testing Domains
The reasoning engine includes specialized rules for:

Domain	Examples
Build & Env	Clean builds, .env sync, no debug logs
Security & Leakage	Exposed keys, baked env variables, internal IPs
API & Network	Status codes, offline behavior, deduplication, retry logic
Component & UI	Form state coverage, broken assets, loading states
Accessibility (A11Y)	Axe-core scans, semantic locators, tab order, contrast
Browser & Visual	FOUC checks, interactive states, responsive grids, baselines
Point of Breakage	JS errors, unhandled rejections, DOM mutation breakage
Persona Journeys	Goal-oriented navigation, hesitation maps, friction scoring
UX Heuristics	Clarity, control, real-world language matching
Perceived Quality	Feedback latency, trust signals, microcopy audit

Features
13 Testing Domains - A comprehensive 360-degree view of your frontend health
6 Human Personas - First-time visitor, Impatient mobile, Keyboard-only, Error-prone, etc.
10 UX Heuristics - Evaluated based on Nielsen's principles
Playwright Integration - Live browser DOM inspection and screenshot diffing
Antigravity Browser Subagent - Native AI web driving
Memory & CLS Profiling - Heap snapshot comparison and layout shift checks
Semantic Locator Audit - Preference for `getByRole` and `getByLabel` over CSS

Installation
Using AI Assistant Skill (Recommended)
# Go to your project
cd /path/to/your/project

# Install for your AI assistant
npx f-tester init-skill

Global Install (For standalone CLI usage)
# Install CLI globally
npm install -g f-tester

# Run across any directory
f-tester --help
f-tester scan-leakage ./dist
f-tester check-ux-signals ./src

Prerequisites
Node 18.x and Playwright are required for browser tests.

# Install playwright browsers
npx playwright install chromium

Usage
Skill Mode (Auto-activate)
The skill activates automatically when you request QA, testing, or auditing. Just chat naturally:

Run a comprehensive frontend test on my React app

Check my UI for UX heuristic violations

Find the exact point of breakage in the checkout flow

Run a visual regression test on the dashboard

Workflow Mode (CLI Commands)
Use the standalone commands to invoke specific domains manually:

npx f-tester scan-leakage ./dist
npx f-tester check-ux-signals ./src
npx f-tester dom-tests
npx f-tester diff-screenshots
npx f-tester memory-leaks

Example Prompts
Test the frontend and output a markdown report

Run a UX audit simulating an impatient mobile user

Scan the build output for exposed API keys

Test all form loading and error states

Check the app's perceived quality and trust signals

How It Works
You ask - Request any testing task (test, audit, QA, evaluate)
Test Plan Generated - The AI automatically builds a 13-domain checklist tailored to your stack
Smart Execution - Based on your request, it launches Playwright, evaluates API calls, diffs screenshots, and tracks JS heap size
Persona Emulation - Simulates human behavior, calculating friction scores and logging hesitations
Rich Reporting - Delivers a human-readable health grade, visual evidence index, and prioritized actionable fixes

Supported Stacks
The skill provides automated testing for:

Web Frameworks: React, Next.js, Vue, Nuxt.js, Svelte, Angular, Astro
Testing Tools: Playwright, axe-core, Lighthouse CI, Vitest, Jest

Architecture & Contributing
For Users
The codebase uses Antigravity Browser Subagents to bridge the gap between AI code generation and human-centric browser usage. Always install via `npx f-tester init-skill` to get the latest heuristics.

For Contributors
If you want to contribute to this project:

# 1. Clone the repository
git clone https://github.com/nextlevelbuilder/f-tester.git
cd f-tester

# 2. Understand the structure
packages/cli/                # Standalone CLI tools (leakage, ux-signals)
packages/reporter/           # Markdown and JSON report generators
.agent/skills/               # AI reasoning engine & templates
scripts/                     # Bash-based fast evaluation scripts
examples/                    # Playwright & test reference templates

# 3. Create PR (never push directly to main)
git checkout -b feat/your-feature
git commit -m "feat: description"
git push -u origin feat/your-feature
gh pr create

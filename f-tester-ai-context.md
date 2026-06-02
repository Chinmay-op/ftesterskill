# f-tester: AI Skill Context & Flow

This document provides complete context on the **f-tester** (Frontend Tester) skill. It is designed to be shared with AI agents to give them a complete understanding of how this skill operates, its purpose, its workflow, and how it should be executed.

---

## 1. High-Level Overview

`f-tester` is a dual-purpose frontend testing tool:
1. **Standalone CLI Tool:** Allows developers to manually run scans for exposed secrets, bundle bloat, DOM tests, and visual regressions via commands like `npx f-tester dom-tests` or `npx f-tester scan-leakage ./dist`.
2. **AI Agent Skill (The Magic Part):** Teaches AI coding agents exactly how to autonomously test frontend applications. When initialized (via `npx f-tester init-skill`), it drops an `.agent/skills/testing-frontend` directory into the project containing instructions (`SKILL.md`) and helper scripts.

When a user asks the AI to "Check my UI", "Run a frontend test", or similar prompts, the AI detects this skill and transforms into a senior QA engineer executing hardened testing protocols.

---

## 2. Core Execution Workflow

The AI agent must follow a **Plan-Validate-Execute** pattern. It executes a comprehensive 13-domain checklist in a specific order:

### The 13 Domains of Testing:
1. **Build & Environment Validation:** Validates clean builds, `.env` syncs, and no stray debug statements (console.logs) in production.
2. **Security & Leakage Checks:** Uses `scan-leakage.sh` to check for exposed API keys, un-substituted environment variables, hardcoded internal IPs, and PII leaks.
3. **API Endpoint Testing:** Validates REST/GraphQL responses, status codes, OpenAPI schemas, rate limiting, and CORS headers.
4. **Component & UI Testing:** Validates interactive states, form flows (empty, invalid, valid, error), and error boundaries.
5. **Accessibility (A11Y):** Runs `axe-core`, checks `alt` attributes, ARIA labels, tab order, and contrast ratios.
6. **Performance:** Checks bundle sizes (via `check-bundle-size.sh`), lazy loading, and Lighthouse CI metrics.
7. **Network & State:** Tests offline behavior, re-fetch deduplication, token refresh, and failed API states.
8. **Browser-Based DOM & Visual Testing:** Uses **Playwright CLI** and a preview server (`npm run preview`) to capture screenshots (`output/screenshots/`) for page loads, interactive states, navs, responsive breakpoints, and visual regressions against baselines.
9. **Point of Breakage Detection (Critical):** Goes beyond finding *that* it broke to finding *where/why*. Hooks into `page.on('pageerror')`, intercepts network requests, tracks memory leaks (via heap snapshots), and detects CSS/DOM mutation breakages.
10. **Cross-Cutting Quality Checks:** Blocks third-party scripts to test resilience, checks keyboard-only navigation, scroll behavior, and dark mode toggling.
11. **Persona-Driven User Journeys:** Replaces robotic automation with goal-based execution. Uses defined personas (e.g., "Impatient mobile user", "First-time visitor") with specific patience and knowledge levels. Tracks hesitation, unneeded steps, abandonment risk, and outputs a step-by-step human narrative.
12. **UX Heuristic Evaluation:** A secondary evaluation passing all findings against Nielsen's 10 heuristics. Categorizes issues by Clarity, Feedback, Control, Consistency, and Trust. Evaluates the cognitive load of each flaw.
13. **Perceived Quality & Trust Signals:** Automatically checks UI feedback latency (time from click to change), scans microcopy for ambiguous CTAs ("Submit" vs "Save Changes"), audits semantic locator health (ensuring elements are discoverable by accessibility roles instead of just CSS classes), and lists non-breaking experience debt.

### Prerequisite for Domains 8–13:
The AI MUST spin up a preview server (`npm run build && npm run preview` on `http://localhost:4173`) and use the **Antigravity Browser Subagent** + **Playwright CLI** for browser interactions. It must create directories `output/screenshots`, `output/baselines`, and `output/heap-snapshots`. Furthermore, it must strictly adhere to the **Selector Policy**, prioritizing semantic locators (`getByRole`, `getByLabel`) over brittle CSS queries.

---

## 3. Reporting Format

The skill requires the AI to generate a **rich, human-readable report** structured as a markdown artifact. It should read as if a Senior QA Engineer wrote it.

**Required Report Sections (in order):**
1. **Header:** Project name, date, target URL, duration.
2. **Health Score 🏥:** Letter grade (A+ to F), an ASCII progress bar, and issue counts by severity.
3. **Domain Results at a Glance 📊:** Summary table with status, issues, time, and screenshot links.
4. **Executive Summary 🧠:** 3-5 sentences hitting the biggest win and top concern.
5. **Domain Detail Sections (1–13):** Detailed breakdown of passed/failed checks. Explanations must cover WHAT went wrong, WHERE, and a suggested fix, with embedded screenshots.
6. **Memory & Performance Profile 🧠:** Included inside Domain 9. Shows an ASCII box comparing JS Heap sizes, DOM nodes, and detached nodes before/after idle periods.
7. **Point of Breakage Log 🔴:** A log of specific breakages detailing the trigger action, impact, file/line location, screenshot, and an actionable fix.
8. **User Personas Tested 👤:** Table of the personas used in Domain 11 testing, with context and patience level.
9. **Critical User Journeys 🎯:** Table logging task success/failure per persona, steps taken, friction scores, and abandonment risk.
10. **Hesitation Map ⏸️:** Logs where the tester paused, retried, backtracked, or got confused.
11. **Usability Heuristic Violations 🔍:** Table of heuristic tags and cognitive load mappings for all UI issues found.
12. **Confidence Narrative 💬:** Step-by-step prose narrative tracing the user's emotional state (Clear, Uncertain, Confusing, Misleading) throughout each journey.
13. **Semantic Locator Health 🏷️:** A health audit of whether interactive elements are discoverable by role/label versus brittle CSS fallbacks.
14. **Experience Debt Summary ⚠️:** Issues that degrade UX trust/polish but aren't hard crashes (Clarity, Trust, Efficiency, Polish).
15. **Visual Evidence Index 📸:** Table of all captured screenshots with context.
16. **Skipped Domains ⏭️:** Table of any skipped domains with the reason WHY.
17. **Recommendations 💡:** Prioritized fixes (Critical 🔴, High 🟠, Medium 🟡, Low 🔵).
18. **Test Execution Timeline 📋:** Chronological table of test completion.

---

## 4. Key Rules for the AI

- **Do not silently skip domains.** If a tool is missing, report it and suggest installation.
- **Write like a human.** Don't dump raw JSON logs. Explain the user impact (e.g., "The dashboard silently swallows API errors" instead of "Error in component").
- **Screenshots are Mandatory.** For visual/DOM tests, always embed screenshots in the report inline `![description](path)`.
- **Find the Root Cause.** Don't just say a button failed; identify if it was a detached event listener, z-index issue, or a blocked third-party script.
- **Resources to Use:** The AI should utilize the provided scripts (`scan-leakage.sh`, `run-dom-tests.sh`, etc.) and examples (`playwright-form-matrix.ts`, etc.) located within the `.agent/skills/testing-frontend` directory.

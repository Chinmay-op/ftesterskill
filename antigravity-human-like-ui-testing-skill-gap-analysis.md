# Antigravity Skill Gap Analysis: Human-Like UI Testing

## Overview

The current `f-tester` skill is already strong as an automation-oriented frontend QA framework. It covers build validation, leakage/security checks, API validation, accessibility, performance, network/state behavior, Playwright-based DOM and visual testing, breakage detection, and structured reporting. That makes it a solid engineering-grade testing skill rather than a shallow screenshot checker.[cite:1]

However, a **human-like UI testing skill** must do more than verify technical correctness. It should simulate how a real user explores, hesitates, misunderstands, retries, abandons, and recovers while interacting with a product. Existing UI-testing guidance also stresses that UI testing should consider whether users can actually achieve goals, whether the interface is intuitive, and whether subjective usability issues are being caught rather than only binary failures.[cite:2][cite:5][cite:10]

This document explains what such a skill should do, what the current skill already does well, where it is incomplete, and what Antigravity should add next.

## What a Human-Like UI Testing Skill Should Do

A human-like tester should combine **functional validation**, **behavioral exploration**, **usability inspection**, and **root-cause evidence collection**. Pure pass/fail automation is necessary, but it is not sufficient for judging whether a UI feels usable to a real person.[cite:2][cite:5]

### Core responsibilities

- Validate that core journeys actually work from the perspective of a goal-oriented user, not only from the perspective of DOM availability.[cite:2]
- Interact through user-facing affordances such as roles, labels, placeholders, visible names, and navigation structure, which aligns well with modern web-first testing practices.[cite:3]
- Detect usability breakdowns using heuristic principles such as visibility of system status, consistency, error prevention, user control, recognition over recall, and clear language.[cite:8][cite:9]
- Capture evidence for both **technical breakage** and **experience friction**, because many important UI failures are not crashes; they are confusing states, misleading copy, poor feedback, ambiguous controls, or unnecessarily hard workflows.[cite:2][cite:8][cite:9]
- Exercise interfaces at multiple breakpoints, input conditions, and rendering states because responsiveness and readability directly affect user success.[cite:2]
- Avoid flaky behavior by relying on actionability checks and auto-waiting rather than arbitrary sleeps, so the agent behaves more like a patient user and less like a brittle script.[cite:3][cite:4]

## What the Current Skill Already Does Well

The attached `f-tester` design already includes several traits needed for serious UI assessment. It follows a structured plan-validate-execute flow, includes accessibility and performance domains, uses Playwright-based browser testing, captures screenshots, investigates breakage causes, and emphasizes human-readable reporting rather than raw logs.[cite:1]

It is particularly strong in four areas:

| Area | Current strength | Why it matters |
|---|---|---|
| Coverage | Ten domains spanning build, security, APIs, UI, accessibility, performance, network, visuals, breakage, and quality checks.[cite:1] | Broad coverage prevents tunnel vision around only visual regression or only DOM assertions. |
| Root cause focus | Domain 9 explicitly asks for where and why a break happened, including page errors, network interception, memory issues, and CSS/DOM mutation breakage.[cite:1] | Human teams value actionable diagnosis more than raw failure counts. |
| Browser realism | Preview-server execution plus Playwright screenshots across states and breakpoints is already close to user-observable validation.[cite:1][cite:3] | This creates strong evidence for actual UI problems rather than unit-level assumptions. |
| Reporting | The report structure requires executive summary, severity, evidence, recommendations, skipped domains, and timelines.[cite:1] | This makes the output useful to product, design, and engineering stakeholders—not just QA. |

## What It Lacks

The main gap is that the current skill is still **automation-first**, not fully **human-behavior-first**. It checks many important things, but it does not yet appear to model realistic user intent, confusion, or decision-making deeply enough.[cite:1][cite:2][cite:8]

### 1. Persona-driven testing is missing

The current design does not define user personas such as first-time visitor, returning user, power user, low-confidence user, keyboard-only user, or low-bandwidth mobile user. Human-like testing should vary actions and expectations by persona because different users notice different failures and friction points.[cite:1][cite:2][cite:9]

**What to add:**
- Persona packs with goals, patience thresholds, domain knowledge, device assumptions, and likely mistakes.
- Separate journey grades for novice versus expert flows.
- “Would a new user understand this?” and “Would a frequent user complete this quickly?” checks grounded in heuristic evaluation.[cite:9]

### 2. Task success measurement is missing

The current report is rich, but it does not explicitly score whether a user completed a task efficiently, confidently, and without detours. Human-like testing should measure task success, number of retries, dead ends, time-to-completion, error recovery cost, and abandonment risk.[cite:1][cite:2][cite:9]

**What to add:**
- Task completion score.
- Friction score per journey.
- Recovery score after mistakes.
- Abandonment likelihood estimate.
- Extra-click and hesitation counters.

### 3. Exploratory behavior is under-specified

The current flow is checklist-based, which is good for consistency, but real users do not behave linearly. They scroll unexpectedly, open menus out of curiosity, misread labels, go back, retry forms, and inspect secondary UI before returning to primary tasks. A human-like skill should support semi-structured exploration in addition to scripted validation.[cite:1][cite:2]

**What to add:**
- Exploratory interaction mode with bounded randomness.
- Detour logging such as “user opened pricing before signup,” “hovered on tooltip but still unclear,” or “returned to previous step twice.”
- Path-drift analysis comparing ideal versus actual navigation.

### 4. Usability heuristics are not first-class outputs

Although the skill is human-readable, it does not appear to classify findings using formal usability heuristics. A human-like evaluator should tag issues against recognized principles such as visibility of status, match to real-world language, consistency, error prevention, recognition over recall, and user control/freedom.[cite:8][cite:9]

**What to add:**
- Heuristic tags on every UX issue.
- Severity plus heuristic mapping.
- “Why this confuses humans” explanations in plain language.
- Issue clustering by cognitive load, clarity, feedback, control, and trust.

### 5. Perceived quality signals are missing

A user often judges a product by subtle signals: layout stability, feedback timing, animation interruptibility, microcopy clarity, loading honesty, empty-state guidance, and error-message usefulness. These are not always caught by standard DOM assertions or screenshots alone.[cite:2][cite:9]

**What to add:**
- Feedback latency checks: after click, does the UI acknowledge the action quickly?
- Trust checks: vague loading states, silent failures, suspicious disabled buttons.
- Copy clarity checks: jargon, ambiguous CTA labels, inconsistent terminology.[cite:9]
- Layout confidence checks: sudden shifts, clipped text, hidden affordances.

### 6. Accessibility is present, but not behaviorally integrated

The current skill has a dedicated accessibility domain, which is excellent, but a human-like tester should weave accessibility into every journey rather than isolate it as one section. For example, a checkout flow should be tested as keyboard-only, screen-reader-oriented, zoomed, and high-contrast affected—not only as a separate compliance pass.[cite:1][cite:2][cite:3]

**What to add:**
- Journey reruns in keyboard-only mode.
- Zoom and text-scaling runs.
- Focus-order journey maps.
- Accessible-name mismatch detection for key CTAs and form controls.[cite:3]

### 7. Selector philosophy should be more human-centered

Playwright encourages locators such as `getByRole`, `getByLabel`, and other user-facing selectors because they mirror how people perceive the interface.[cite:3] The current design mentions Playwright broadly, but it does not explicitly enforce a selector hierarchy centered on human-observable semantics.[cite:1][cite:3]

**What to add:**
- Mandatory selector policy: role > label > placeholder > text > testid > CSS.
- Penalize brittle selectors in generated tests.
- Report inaccessible or ambiguous controls when semantic locators fail.

### 8. Emotional and confidence signals are missing

A human-like test should ask: Does the user feel stuck? Did the interface reassure them? Was the next step obvious? These are not “soft” concerns—they affect completion and trust. Heuristic evaluation frameworks explicitly emphasize clarity, predictability, user control, and error prevention because these shape the perceived quality of the experience.[cite:8][cite:9]

**What to add:**
- Confidence annotations per step: clear, uncertain, confusing, misleading.
- Reason codes for hesitation: weak affordance, unclear label, delayed feedback, unexpected navigation.
- Narrative replay of the journey in human terms.

## Recommended New Capability Areas

Antigravity should evolve the skill from a 10-domain QA scanner into a **multi-layer human-like testing system** with five additional capability layers.

### A. Persona Engine

Define reusable personas such as:
- First-time visitor.
- Returning authenticated user.
- Impatient mobile user.
- Keyboard-only user.
- Error-prone user.
- Low-context user unfamiliar with product terms.

Each persona should alter navigation style, patience, retry count, and interpretation of labels. This makes the same UI tested from multiple realistic human lenses rather than one robotic path.[cite:2][cite:9]

### B. Goal-Journey Engine

Convert features into real user intents, for example:
- “Sign up and verify whether the value proposition is clear.”
- “Add an item and verify confidence before payment.”
- “Recover from a bad form submission.”
- “Find a past record without knowing internal terminology.”

Each journey should produce structured outputs: success, total steps, unnecessary steps, hesitation points, recovery points, clarity rating, and final trust rating.[cite:2][cite:9]

### C. UX Heuristic Engine

Run a second-pass evaluator over the evidence and classify issues using heuristics. NN/g recommends evaluators review a task again specifically to identify violations of recognized usability principles, then consolidate and prioritize them.[cite:9]

Suggested heuristic taxonomy:
- Visibility of system status.
- Match to real-world language.
- User control and freedom.
- Consistency and standards.
- Error prevention.
- Recognition rather than recall.
- Flexibility and efficiency.
- Aesthetic clarity / minimal cognitive load.
- Error recognition and recovery.
- Help and guidance.[cite:8][cite:9]

### D. Human Timing Model

A human-like agent should not behave like a zero-latency bot. Playwright’s actionability checks already provide a strong technical base because actions wait until elements are visible, stable, and enabled.[cite:3][cite:4] Build on that by adding bounded human behavior such as reading pauses, hesitation before unfamiliar controls, and repeated glance behavior when the UI is unclear.[cite:3][cite:4]

Important rule: this should be **intentional simulation**, not random sleeps. The model should only slow down where a human would reasonably pause, and every pause should be explainable.

### E. Evidence Fusion Layer

The skill should merge:
- DOM/action traces.
- Console and network evidence.
- Screenshots before and after actions.
- Accessibility tree snapshots.
- UX heuristic annotations.
- Task success metrics.

This fusion layer would let the report say not just “The submit button failed,” but “The user hesitated for 7 seconds because the label ‘Continue’ did not indicate payment confirmation, then clicked twice, then encountered an inline validation error with no field focus return.” That is the level of human-like reporting teams actually act on.[cite:1][cite:3][cite:9]

## Concrete Features to Add Next

| Priority | Feature | Why it should be added |
|---|---|---|
| P0 | Persona-based journey execution | This is the biggest missing layer between current automation and real human-like evaluation.[cite:1][cite:2] |
| P0 | Task success, friction, and abandonment metrics | Human-like testing needs more than pass/fail; it needs user-outcome scoring.[cite:2][cite:9] |
| P0 | Heuristic tagging for findings | Turns subjective UX concerns into a repeatable evaluation framework.[cite:8][cite:9] |
| P1 | Selector policy favoring roles/labels | Aligns tests with user-facing semantics and exposes accessibility quality.[cite:3] |
| P1 | Journey replay narrative | Makes reports understandable to product/design stakeholders.[cite:1][cite:9] |
| P1 | Keyboard-only and zoomed journey reruns | Integrates accessibility into actual user tasks, not just one isolated scan.[cite:2][cite:3] |
| P2 | Curiosity-driven exploration mode | Helps uncover dead ends and unclear IA that scripted tests miss.[cite:2] |
| P2 | Microcopy and terminology review | Real-world language clarity is central to human usability.[cite:9] |
| P2 | Trust and feedback quality checks | Users rely on status visibility and clear action feedback.[cite:8][cite:9] |
| P3 | Confidence and emotion annotations | Useful for premium UX-grade reports and prioritization. |

## Proposed Report Upgrade

The report format should be expanded so it reads like a hybrid of QA evidence and UX research.

### Add these sections

1. **User Personas Tested** — persona name, context, assumptions, device, patience level.
2. **Critical User Journeys** — task name, success/failure, friction score, trust score, abandonment risk.
3. **Hesitation Map** — where the tester paused, retried, backtracked, or needed extra cues.
4. **Usability Heuristic Violations** — issue, heuristic broken, severity, impact, fix.
5. **Confidence Narrative** — step-by-step “what the user likely felt/saw/did.”
6. **Semantic Locator Health** — which controls were discoverable by role/label versus only brittle selectors.[cite:3]
7. **Experience Debt Summary** — issues that do not break the app but degrade clarity, trust, or efficiency.

## Proposed Internal Architecture

A strong human-like UI testing skill for Antigravity should have these modules:

- **Environment Layer**: build, preview server, browser startup, device matrix.[cite:1]
- **Observation Layer**: DOM, accessibility tree, screenshots, console, network, performance, memory.[cite:1][cite:3]
- **Action Layer**: semantic Playwright actions with auto-waiting and bounded human timing.[cite:3][cite:4]
- **Persona Layer**: novice/expert/mobile/keyboard/error-prone behavior profiles.[cite:2][cite:9]
- **Journey Layer**: goal-based flows and fallback explorations.[cite:2]
- **Evaluation Layer**: assertions + heuristic UX analysis + task scoring.[cite:8][cite:9]
- **Diagnosis Layer**: root-cause correlation across UI, network, rendering, and accessibility evidence.[cite:1]
- **Reporting Layer**: engineering + product + design readable markdown output.[cite:1]

## Suggested Acceptance Criteria

Antigravity should consider the skill “human-like” only if it can satisfy criteria such as the following:

- It can complete a core user journey and report not just whether it passed, but whether it was understandable and efficient.[cite:2][cite:9]
- It can identify at least one usability issue that is not a strict functional failure, such as ambiguous copy or weak feedback.[cite:8][cite:9]
- It can rerun the same journey under different personas and produce meaningfully different observations.[cite:2]
- It uses semantic selectors first and reports when the UI is hard to discover through accessible names or roles.[cite:3]
- It explains failures in terms of user impact and probable root cause, which your existing design already values.[cite:1]
- It produces a report that product, design, and engineering can all act on without reading raw logs.[cite:1]

## Final Assessment

`f-tester` is already a strong **frontend QA and breakage-analysis skill**. Its main weakness is not lack of rigor; it is the absence of a first-class **human behavior and usability model** layered on top of that rigor.[cite:1]

To make it truly human-like, Antigravity should add persona-driven journeys, task-success and friction scoring, heuristic UX analysis, semantic-locator-first behavior, exploratory interaction modes, and confidence-oriented reporting. Once those layers are in place, the skill will stop behaving like an advanced regression bot and start behaving like a careful human QA plus UX reviewer.[cite:2][cite:3][cite:8][cite:9]

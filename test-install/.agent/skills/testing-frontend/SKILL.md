---
name: testing-frontend
description: >
  Runs comprehensive frontend tests across UI components, API endpoints,
  security/data leakage, accessibility, performance, network behavior,
  browser-based DOM/visual testing, point-of-breakage detection, cross-cutting
  quality checks, persona-driven user journeys, UX heuristic evaluation, and
  perceived quality/trust signal analysis. Uses Antigravity Browser Subagent +
  Playwright CLI for live DOM inspection, visual regression, and human-like
  behavioral testing. Triggers when the user mentions frontend testing, QA,
  audit, endpoint testing, security scan, browser testing, visual regression,
  breakage detection, UX review, usability testing, persona testing, or wants
  to validate a web application.
---

# Comprehensive Frontend Testing

## When to use this skill

- User asks to "test the frontend" or "run QA"
- User mentions endpoint testing, API validation, or schema checks
- User asks for a security scan, leakage check, or audit
- User wants to validate accessibility, performance, or bundle size
- User says "run all checks" or "is this production-ready?"
- User mentions Lighthouse, axe, WCAG, or bundle analysis
- User asks for browser testing, DOM testing, or visual regression
- User mentions Playwright, screenshot testing, or breakage detection
- User wants to find "where exactly something breaks" or "point of failure"
- User asks for a UX review, usability audit, or "does this feel right to a user?"
- User mentions personas, user journeys, friction, or abandonment
- User asks about microcopy, terminology clarity, or trust signals
- User wants to know if a flow is intuitive or confusing
- User asks for responsive testing, dark mode check, or keyboard navigation audit

## Workflow

Use the **Plan-Validate-Execute** pattern. At the start of every test run, output
this checklist and update it as each domain completes:

```markdown
## Frontend Test Run — [Project Name] — [Date]

- [ ] 1. Build & Environment Validation
- [ ] 2. Security & Leakage Checks
- [ ] 3. API Endpoint Testing
- [ ] 4. Component & UI Testing
- [ ] 5. Accessibility (A11Y)
- [ ] 6. Performance
- [ ] 7. Network & State
- [ ] 8. Browser-Based DOM & Visual Testing
- [ ] 9. Point of Breakage Detection
- [ ] 10. Cross-Cutting Quality Checks
- [ ] 11. Persona-Driven User Journeys
- [ ] 12. UX Heuristic Evaluation
- [ ] 13. Perceived Quality & Trust Signals
```

### Execution order

1. **Build & Environment** first — if the build is broken, nothing else matters.
2. **Security & Leakage** second — catch secrets before anything ships.
3. **API Endpoints** third — validate the data layer.
4. **Component & UI** fourth — test what the user sees.
5. **Accessibility** fifth — ensure inclusive design.
6. **Performance** sixth — measure speed and size.
7. **Network & State** seventh — test edge cases and resilience.
8. **Browser-Based DOM & Visual** eighth — live browser verification with screenshots.
9. **Point of Breakage Detection** ninth — find exactly where and why things break.
10. **Cross-Cutting Quality** tenth — theme, keyboard, scroll, third-party resilience.
11. **Persona-Driven User Journeys** eleventh — simulate real user intents with different personas.
12. **UX Heuristic Evaluation** twelfth — second-pass analysis classifying findings against usability heuristics.
13. **Perceived Quality & Trust Signals** last — feedback latency, microcopy, trust, and semantic locator health.

### Browser Test Prerequisite (Domains 8–10)

Before running Domains 8–10, spin up a preview server:

```bash
npm run build && npm run preview
# App should be available at http://localhost:4173
```

Create output directories:

```bash
mkdir -p output/screenshots output/baselines output/heap-snapshots
```

Use the **Antigravity Browser Subagent** + **Playwright CLI** for all browser
interactions. Every test that touches the UI **must** save a screenshot to
`output/screenshots/`.

---

### Selector Policy (Mandatory for Domains 8–13)

All Playwright interactions **must** use the following locator hierarchy, in
order of preference. This ensures tests mirror how real users perceive the
interface and exposes accessibility gaps when semantic locators fail.

1. **`getByRole`** — e.g., `page.getByRole('button', { name: 'Submit' })`
2. **`getByLabel`** — e.g., `page.getByLabel('Email address')`
3. **`getByPlaceholder`** — e.g., `page.getByPlaceholder('Enter your email')`
4. **`getByText`** — e.g., `page.getByText('Sign up')`
5. **`getByTestId`** — e.g., `page.getByTestId('submit-btn')`
6. **CSS/XPath** — last resort only

**Rules:**
- If a control is **only** discoverable by CSS/XPath or testid, report it as a
  **Semantic Locator Gap** in the report (Domain 13).
- Never use CSS selectors when a role or label locator would work.
- When a semantic locator fails, log the failure and fall back — but flag it as
  an accessibility concern.

---

## Instructions

### 1. API Endpoint Testing

- Validate all REST/GraphQL endpoints return correct status codes:
  - `200` on valid authenticated requests
  - `401` on missing or expired auth token
  - `403` on forbidden resources
  - `404` on unknown routes
  - `500` should never appear — flag as critical

- Test request/response shape against schema or OpenAPI spec:
  ```bash
  # If openapi.yaml exists, validate with a spec tool
  npx @openapitools/openapi-generator-cli validate -i openapi.yaml
  ```

- Check auth headers are required on protected routes:
  ```bash
  # Attempt unauthenticated request — expect 401
  curl -s -o /dev/null -w "%{http_code}" https://localhost:3000/api/protected
  ```

- Test rate limiting behavior:
  - Send 100+ rapid requests to a single endpoint
  - Expect `429 Too Many Requests` after threshold

- Validate CORS headers on sensitive routes:
  ```bash
  curl -s -D - -o /dev/null -X OPTIONS \
    -H "Origin: https://evil.com" \
    -H "Access-Control-Request-Method: POST" \
    https://localhost:3000/api/auth/login | grep -i "access-control"
  ```
  - `Access-Control-Allow-Origin` must NOT be `*` on auth/payment routes

- Check `Content-Type` headers on all JSON responses:
  - Must be `application/json; charset=utf-8`, never `text/html`

### 2. Security & Leakage Checks

Run the leakage scanner script:

```bash
bash scripts/scan-leakage.sh ./dist
```

If the script is unavailable, run these checks manually:

- **Exposed secrets in bundle:**
  ```bash
  grep -rE "(api_key|apikey|secret|password|token|bearer)\s*[:=]\s*['\"][^'\"]{8,}" ./dist
  ```

- **Env values baked into JS:**
  ```bash
  grep -rE "REACT_APP_|VITE_|NEXT_PUBLIC_" ./dist
  ```

- **Hardcoded internal IPs or staging URLs:**
  ```bash
  grep -rE "(localhost|127\.0\.0\.1|192\.168|staging\.|internal\.)" ./dist
  ```

- **Stack traces / verbose errors**: Build in production mode, trigger error boundaries, and verify responses do not contain stack traces or internal paths.

- **localStorage/sessionStorage audit**: Check that no tokens, passwords, or PII are written to browser storage in plaintext.

- **Console PII check**: Run the app in production mode and verify `console.log` does not output emails, tokens, or user data.

### 3. Component & UI Testing

- Every interactive element (button, form, link, toggle) must have an associated test.

- **Forms — test all states:**
  - Empty submit → shows validation errors
  - Invalid input → shows field-level errors
  - Valid submit → calls API and shows success
  - Server error → shows user-visible error message

- **UI state coverage:**
  - Loading states (skeletons, spinners)
  - Empty states ("No results found")
  - Error boundary fallbacks

- **Broken assets:**
  ```bash
  # After build, check for 404s on static files
  find ./dist -name "*.html" -exec grep -oP 'src="[^"]*"' {} \; | \
    while read -r src; do
      file=$(echo "$src" | sed 's/src="//;s/"//')
      [ ! -f "./dist/$file" ] && echo "MISSING: $file"
    done
  ```

- **Modals/drawers/tooltips**: Test open, close, escape-key dismiss, and click-outside dismiss.

### 4. Accessibility (A11Y)

- **Run axe-core on all routes:**
  ```bash
  npx @axe-core/cli http://localhost:3000 --exit
  ```
  Or integrate into Playwright:
  ```typescript
  import AxeBuilder from '@axe-core/playwright';
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  ```

- **Image alt attributes**: All `<img>` tags must have non-empty `alt` text.
  ```bash
  grep -rn '<img ' ./src --include="*.tsx" --include="*.jsx" | grep -v 'alt='
  ```

- **Form labels**: Every `<input>`, `<select>`, `<textarea>` must have an associated `<label>` or `aria-label`.

- **Tab order**: Navigate the entire app with Tab key only — no focus traps, logical order.

- **Color contrast**: Must meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text).

### 5. Performance

- **Bundle size check:**
  ```bash
  bash scripts/check-bundle-size.sh ./dist 250
  ```
  Warn if main JS chunk exceeds 250KB gzipped.

- **Render-blocking scripts**: Check `<head>` for `<script>` tags without `defer` or `async`.
  ```bash
  grep -n '<script ' ./dist/index.html | grep -v 'defer\|async\|type="module"'
  ```

- **Lazy loading**: Verify route-level code splitting and `React.lazy()` / dynamic `import()` on heavy components.

- **Lighthouse CI thresholds:**
  ```bash
  npx lhci autorun --collect.url=http://localhost:3000 \
    --assert.assertions.categories:performance=["error", {"minScore": 0.8}] \
    --assert.assertions.categories:accessibility=["error", {"minScore": 0.9}]
  ```

### 6. Network & State

- **Offline behavior**: Disable network in DevTools or test harness → app should show a graceful error or service worker fallback, not a blank screen.

- **Re-fetch deduplication**: If using React Query, SWR, or similar:
  - Re-render a component and verify the same query is NOT refetched.
  - Check `staleTime` / `dedupingInterval` is configured.

- **Failed API → visible error**: Every failed fetch must surface a user-visible message. No silent failures.

- **Auth token refresh**: Simulate a token 1 minute from expiry → verify the app refreshes it before the next API call, not after a 401.

### 7. Build & Environment Validation

- **Clean production build:**
  ```bash
  npm run build 2>&1 | tee build.log
  grep -i "warning\|error" build.log
  ```
  Zero warnings treated as errors.

- **.env sync check:**
  ```bash
  # Compare .env.example keys with actual .env
  diff <(grep -oP '^[A-Z_]+' .env.example | sort) \
       <(grep -oP '^[A-Z_]+' .env | sort)
  ```
  No undocumented variables.

- **No debug statements in production code:**
  ```bash
  grep -rn "console\.log\|debugger" ./src --include="*.ts" --include="*.tsx" --include="*.js"
  ```
  Every match is a failure.

---

### 8. Browser-Based DOM & Visual Testing

> **Requires:** Antigravity Browser Subagent + Playwright CLI.
> Run `npm run preview` on `:4173` first.
> See [playwright-form-matrix.ts](examples/playwright-form-matrix.ts) for form test patterns.

#### 8a. Page Load & Initial Render
- Navigate to each route, confirm it renders (no blank screen)
- Check `document.title` matches expected value per route
- Take screenshot at 100ms and 1000ms — confirm no FOUC (flash of unstyled content)
- Confirm no layout shift after fonts/images load (CLS check)
- Check for visible JS errors or React error boundary fallback screens
- Screenshot: `output/screenshots/[route-name]-initial.png`

#### 8b. Interactive State Verification
- Hover every interactive element (buttons, links, cards) — confirm CSS hover state visually changes (cursor, color, shadow)
- Click every button — confirm expected DOM change occurs
- Focus every input via keyboard Tab — confirm focus ring is visible
- Confirm disabled elements cannot be interacted with
- Screenshot each state: `output/screenshots/[element]-[state].png`

#### 8c. Form Flows (full matrix)
For every form, run all 4 cases:
1. Submit with all fields empty → validation errors appear
2. Submit with invalid input (wrong format) → field-level error
3. Submit with valid input → success state or next step
4. Simulate server error (block request via Playwright route intercept) → user-visible error, not silent failure

Screenshot each case outcome. See [playwright-form-matrix.ts](examples/playwright-form-matrix.ts).

#### 8d. Navigation & Routing
- Click every nav link — confirm URL changes and correct view renders
- Test browser back/forward — no blank or broken states
- Deep link directly to each route URL — confirm it renders
- Navigate to unknown route — confirm 404 fallback, not white screen
- Screenshot each route: `output/screenshots/[route-name]-nav.png`

#### 8e. Dynamic Content & Loading States
- Confirm loading spinners/skeletons appear before data resolves
- Confirm spinners disappear after data resolves (no infinite spinner)
- Confirm empty state UI appears when data returns empty
- Confirm real-time/polling updates visually change the DOM (e.g., counters tick)
- Screenshot: `output/screenshots/[feature]-loading.png`, `[feature]-loaded.png`, `[feature]-empty.png`

#### 8f. Responsive Breakpoints
Run all above tests at these 3 viewport sizes:
- **Mobile:** 375×812 (iPhone 14)
- **Tablet:** 768×1024 (iPad)
- **Desktop:** 1440×900

Confirm per breakpoint:
- No horizontal scroll on mobile
- Navigation collapses to hamburger/drawer on mobile
- Text does not overflow or get clipped
- Touch targets are minimum 44×44px on mobile
- Screenshot: `output/screenshots/[route]-[breakpoint].png`

#### 8g. Visual Regression (baseline comparison)
- **First run:** save all screenshots as baselines to `output/baselines/`
- **Subsequent runs:** diff against baselines, flag pixel changes > 0.1% threshold
- Report every changed element with before/after screenshots
- Use [capture-baselines.sh](scripts/capture-baselines.sh) and [diff-screenshots.sh](scripts/diff-screenshots.sh)

---

### 9. Point of Breakage Detection

> **This is the most important domain.** The goal is to find EXACTLY where and why
> something breaks, not just that it broke.
> See [playwright-breakage-listener.ts](examples/playwright-breakage-listener.ts) for listener setup.
> See [playwright-route-intercept.ts](examples/playwright-route-intercept.ts) for network simulation.

#### 9a. JS Runtime Error Capture
- Attach `page.on('pageerror')` listener before every interaction
- Capture full error message + stack trace for every uncaught exception
- Map each error back to the component/file/line number
- Report format:
  ```
  ERROR: TypeError: Cannot read property 'x' of undefined
  LOCATION: src/components/ThreatCard.jsx:47
  TRIGGERED BY: clicking "Refresh" button on dashboard
  SCREENSHOT: output/screenshots/breakage-001.png
  ```

#### 9b. Console Error & Warning Capture
- Attach `page.on('console')`, filter for type `error` and `warning`
- Capture every `console.error` and `console.warn` during interactions
- Flag React-specific warnings: key prop missing, invalid hook call, prop type mismatch, controlled/uncontrolled input switch
- Report each with: message, triggering action, component if traceable

#### 9c. Network Failure Attribution
- Intercept all fetch/XHR via Playwright route interception
- For each failed request (4xx, 5xx, timeout) identify:
  - **WHICH** component triggered the request (from call stack if available)
  - **WHAT** the UI showed the user (error message, silent failure, crash)
  - **WHETHER** a retry mechanism exists
- Test "what happens if every API call fails" — confirm all failures show user-visible error states, none silently swallow errors

#### 9d. DOM Mutation Breakage
- Inject `MutationObserver` via `page.evaluate()` to watch for:
  - Elements unexpectedly removed from DOM during interactions
  - Z-index/overflow issues causing elements to be hidden under others
  - Elements with zero width/height that should be visible
  - Detached event listeners (click handlers that stop working after re-render)
- Flag any mutation that looks unintentional

#### 9e. Memory Leak Detection
- Take JS heap snapshot before and after: login flow, dashboard navigation, and a 30-second idle period with dynamic updates
- Compare heap sizes: flag if heap grows > 20MB over idle period
- Check for detached DOM nodes via Chrome DevTools Protocol (`queryObjects(HTMLElement)`)
- Use [detect-memory-leaks.sh](scripts/detect-memory-leaks.sh) for automation

#### 9f. CSS Breakage Detection
- For every interactive state (hover, focus, active, disabled), confirm computed styles actually change
- Check for z-index wars: no modal/tooltip/dropdown clipped or hidden behind another element
- Check for `overflow:hidden` clipping interactive content unexpectedly
- Confirm `visibility:hidden` or `display:none` is not permanently applied to elements that should be visible after interaction

#### 9g. Auth & Session Breakage
- **Token expiry mid-session:** Clear `localStorage`/`sessionStorage` via Playwright → does the app redirect to login, show error, or crash silently?
- **Browser refresh when logged in:** Session should persist or cleanly redirect to login
- **Slow network login:** Simulate 5000ms delay via Playwright route → confirm loading state shows, no timeout crash

---

### 10. Cross-Cutting Quality Checks

#### 10a. Third-Party Script Failures
- Block all third-party domains (analytics, fonts, CDN scripts) via Playwright route abort
- Confirm the app still renders and functions — find single points of failure on external dependencies

#### 10b. Font Loading
- Confirm all custom fonts load (check computed `font-family` on key elements)
- Block fonts: confirm fallback fonts render cleanly, no layout breakage from font metric differences

#### 10c. Keyboard-Only Navigation
- Tab through the entire app without using a mouse
- Confirm every interactive element is reachable via Tab
- Confirm Enter/Space activate buttons and links
- Confirm Escape closes modals/drawers
- Confirm no "keyboard trap" (user gets stuck in a component)

#### 10d. Scroll Behavior
- Confirm smooth scroll works where expected
- Confirm no scroll-jank (janky animation) on content-heavy pages
- Confirm infinite scroll or paginated lists load next batch correctly
- Confirm sticky headers/footers stay in place during scroll

#### 10e. Dark Mode / Theme Switching (if applicable)
- Toggle theme if app supports it and confirm:
  - No text becomes invisible (white on white, black on black)
  - No hardcoded colors break the theme
  - Theme preference persists on page refresh

---

### 11. Persona-Driven User Journeys

> **Purpose:** Test the app from the perspective of realistic human personas,
> not just a robotic automation path. Different users notice different failures.
> See [persona-journey-runner.ts](examples/persona-journey-runner.ts) for the
> execution template.

#### 11a. Define Personas

Before running journeys, define at least 3 personas from this list (adapt to
the app's domain):

| Persona | Device | Patience | Knowledge | Likely Mistakes |
|---------|--------|----------|-----------|-----------------|
| **First-time visitor** | Desktop | Medium | None — unfamiliar with product terms | Skips onboarding, misreads CTAs |
| **Returning authenticated user** | Desktop | Low | Familiar with layout | Skips instructions, expects shortcuts |
| **Impatient mobile user** | Mobile (375×812) | Very low | Moderate | Taps wrong targets, abandons on slow load |
| **Keyboard-only user** | Desktop | High | High | None — relies entirely on Tab/Enter/Escape |
| **Error-prone user** | Desktop | Medium | Low | Submits invalid data, clicks back mid-flow |
| **Low-context user** | Desktop | Medium | None — unfamiliar with domain jargon | Confused by internal terminology |

Each persona alters: navigation style, retry count, device viewport, and
interpretation of labels.

#### 11b. Define Goal-Based Journeys

Convert features into real user intents. Examples:
- "Sign up and verify whether the value proposition is clear."
- "Add an item and verify confidence before payment."
- "Recover from a bad form submission."
- "Find a past record without knowing internal terminology."
- "Complete the primary task on mobile with one hand."

Each journey must be tied to a specific persona.

#### 11c. Execute and Score Journeys

For each persona × journey combination, track and report:

- **Task success:** Did the persona complete the goal? (yes / partial / no)
- **Total steps taken:** How many clicks/actions were needed?
- **Unnecessary steps:** Steps that didn't advance the goal (detours, retries, wrong clicks)
- **Hesitation points:** Where the persona would pause, unsure what to do next
- **Recovery points:** Where the persona hit an error and had to recover
- **Friction score:** 0 (effortless) to 10 (severely frustrating)
- **Abandonment risk:** Low / Medium / High — would this persona give up?
- **Confidence annotations per step:** Clear ✅ / Uncertain ⚠️ / Confusing ❌ / Misleading 🚫

#### 11d. Journey Narrative Replay

For each journey, write a **step-by-step narrative** in human terms:

> "The first-time visitor lands on the homepage and sees a 'Get Started' button.
> They click it, but the next page asks for a 'Workspace ID' — a term they've
> never seen. They hesitate for several seconds, look for a tooltip or help link,
> find none, and abandon the flow."

This narrative is the most actionable output for product and design teams.

#### 11e. Accessibility-Integrated Journey Reruns

Rerun at least one critical journey in these modes:
- **Keyboard-only mode** — Tab through the entire flow, no mouse
- **Zoomed to 200%** — Confirm text is readable and layout doesn't break
- **Focus-order map** — Document the Tab order through the journey and flag illogical jumps

---

### 12. UX Heuristic Evaluation

> **Purpose:** Classify all findings (from every domain) against recognized
> usability heuristics. This turns subjective UX concerns into a repeatable
> evaluation framework.

#### 12a. Heuristic Taxonomy

Apply these 10 heuristics (based on Nielsen's heuristics) to every finding:

| # | Heuristic | What to check |
|:-:|-----------|---------------|
| H1 | **Visibility of system status** | Does the UI always tell the user what's happening? Loading states, progress indicators, confirmation messages. |
| H2 | **Match to real-world language** | Does the UI use words the user understands, or internal jargon? |
| H3 | **User control and freedom** | Can the user undo, go back, cancel, or escape? Are there emergency exits? |
| H4 | **Consistency and standards** | Are similar actions/elements styled and labeled consistently? Do they follow platform conventions? |
| H5 | **Error prevention** | Does the UI prevent errors before they happen? (e.g., input masks, disabled buttons when incomplete, confirmation dialogs) |
| H6 | **Recognition over recall** | Is information visible when needed, or does the user have to remember it from a previous screen? |
| H7 | **Flexibility and efficiency** | Are there shortcuts for experienced users? Can power users skip steps? |
| H8 | **Aesthetic clarity / minimal design** | Is the UI free of unnecessary clutter? Does every element serve a purpose? |
| H9 | **Error recognition and recovery** | Are error messages clear, specific, and actionable? Do they help the user fix the problem? |
| H10 | **Help and documentation** | Is contextual help available? Tooltips, inline hints, FAQ links? |

#### 12b. Tag Every Finding

For every issue found across all 13 domains, add:
- **Heuristic violated:** H1–H10 (can be multiple)
- **Why this confuses humans:** One sentence in plain language
- **Cognitive load impact:** Low / Medium / High

Example:
> **Issue:** Dashboard shows infinite spinner on API failure.
> **Heuristic:** H1 (Visibility of status), H9 (Error recovery).
> **Why this confuses humans:** "The user has no idea if the page is still
> loading, if something failed, or if they should wait. They're stuck."
> **Cognitive load:** High.

#### 12c. Cluster Issues

Group all heuristic violations into these 5 buckets for the report:
1. **Clarity** — Can the user understand what they're seeing? (H2, H6, H8)
2. **Feedback** — Does the UI communicate what happened? (H1, H9)
3. **Control** — Can the user navigate freely and recover? (H3, H5, H7)
4. **Consistency** — Is the experience predictable? (H4)
5. **Trust** — Does the UI feel reliable and professional? (H1, H9, H10)

---

### 13. Perceived Quality & Trust Signals

> **Purpose:** Catch issues that don't break the app but degrade user confidence,
> clarity, and perceived polish. These are the issues that make users think
> "this feels cheap" or "I don't trust this."
> See [ux-heuristic-evaluator.ts](examples/ux-heuristic-evaluator.ts) for
> automated checks and [check-ux-signals.sh](scripts/check-ux-signals.sh)
> for source-level scanning.

#### 13a. Feedback Latency Checks

After every button click or form submission, measure time-to-UI-acknowledgement:
- **< 100ms:** Excellent — feels instant
- **100ms–300ms:** Good — noticeable but acceptable
- **300ms–1000ms:** Needs loading indicator
- **> 1000ms without feedback:** Flag as **trust violation** — user doesn't know if click registered

#### 13b. Trust Signal Audit

Check for these trust-damaging patterns:
- Vague loading states ("Loading..." with no context vs. "Loading your proposals...")
- Silent failures (API error with no user-visible message)
- Suspicious disabled buttons (disabled with no tooltip explaining why)
- Broken or missing favicons
- Mixed HTTP/HTTPS content
- Generic error messages ("Something went wrong" with no detail or action)

#### 13c. Microcopy & Terminology Review

Scan all user-facing text for:
- **Ambiguous CTA labels:** "Submit", "Click here", "OK", "Go", "Continue" without context
- **Internal jargon:** Technical terms that a non-technical user wouldn't understand
- **Inconsistent terminology:** Same concept called different names in different places
  (e.g., "Workspace" vs. "Project" vs. "Space")
- **Missing helper text:** Form fields with no placeholder, label, or hint

Run the static scanner:
```bash
bash scripts/check-ux-signals.sh ./src
```

#### 13d. Layout Confidence Checks

- **CLS (Cumulative Layout Shift):** Flag any route with CLS > 0.1
- **Clipped text:** Check for `text-overflow: ellipsis` on critical content
  (titles, prices, error messages) — users can't read what's cut off
- **Hidden affordances:** Interactive elements that look like plain text
  (links without underline/color, clickable divs without cursor:pointer)
- **Inconsistent spacing:** Visually uneven padding/margins in repeated elements

#### 13e. Semantic Locator Health Audit

For every interactive element on every route:
1. Attempt to locate it via `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText`
2. If the element is **only** discoverable via CSS selector or testid, flag it as a
   **Semantic Locator Gap**
3. Report:
   - Total interactive elements audited
   - Elements discoverable by role/label (good)
   - Elements requiring testid fallback (acceptable)
   - Elements requiring CSS fallback (poor — indicates accessibility concern)

#### 13f. Experience Debt Summary

Compile a final list of issues that do NOT break the app but degrade the
experience. These are "experience debt" — technical debt's UX equivalent.
Categorize by:
- **Clarity debt** — confusing labels, missing help text, jargon
- **Trust debt** — silent failures, vague states, broken feedback loops
- **Efficiency debt** — unnecessary steps, missing shortcuts, poor defaults
- **Polish debt** — inconsistent spacing, clipped text, missing empty states

---

## Reporting Format

> **MANDATORY:** Every test run must produce a rich, human-readable report as a markdown
> artifact. Follow the template in [report-template.md](references/report-template.md)
> exactly. See [sample-report.md](references/sample-report.md) for a realistic example.

The report must feel like a senior engineer wrote it for their team — conversational,
specific, and actionable. Never output raw logs or machine-formatted data without context.

### Required Report Sections

The report **must** include all of the following sections, in this order:

1. **Header** — Project name, date (human-readable), target URL, total duration
2. **🏥 Health Score** — Letter grade (A+ through F) with ASCII progress bar,
   calculated as `(passed_domains / total_domains) × 100`. Include issue counts
   by severity (critical / high / medium / low) and a one-line "what this means."
3. **📊 Domain Results at a Glance** — One table row per domain with: status emoji,
   issue count, worst severity, time taken, and screenshot links
4. **🧠 Executive Summary** — 3-5 sentences. Mention the biggest win and the top
   concern. This is what a PM or lead reads first.
5. **Domain Detail Sections (1–13)** — One `###` section per domain with:
   - Status badge and time taken
   - Table of individual checks with ✅/❌/⚠️/N/A results
   - For each failure: human-readable explanation of WHAT went wrong, WHERE,
     and a one-sentence suggested fix
   - Embedded screenshot links for visual domains (8, 9, 10)
6. **🧠 Memory & Performance Profile** (inside Domain 9) — ASCII box showing:
   - JS Heap before/after in MB, delta, threshold, status
   - DOM node count before/after, delta
   - Detached nodes count
   - Idle period duration
   - Plain-English interpretation ("What this means")
7. **🔴 Point of Breakage Log** — For every breakage found:
   - `POB-XXX` ID, domain, severity with color emoji (🔴🟠🟡🔵)
   - What broke (user-facing impact, not just the error message)
   - Exact trigger action ("clicking the Refresh button on /dashboard")
   - File + line location if available
   - Embedded screenshot
   - One actionable fix sentence
8. **👤 User Personas Tested** — Table: persona name, context, device, patience level
9. **🎯 Critical User Journeys** — Table: task, persona, success/fail, friction score,
   trust score, abandonment risk, steps taken, unnecessary steps
10. **⏸️ Hesitation Map** — Where the tester paused, retried, backtracked, or needed
    extra cues. One row per hesitation point with location, trigger, and impact.
11. **🔍 Usability Heuristic Violations** — Table: issue, heuristic(s) broken,
    severity, "why this confuses humans" explanation, cognitive load, suggested fix
12. **💬 Confidence Narrative** — Step-by-step journey replay in human terms:
    what the user likely felt, saw, and did at each step. Written as prose.
13. **🏷️ Semantic Locator Health** — Table: control, route, discoverable by
    role/label?, fallback selector used, accessibility concern
14. **⚠️ Experience Debt Summary** — Issues that don't break the app but degrade
    clarity, trust, or efficiency. Categorized by: clarity / trust / efficiency / polish.
15. **📸 Visual Evidence Index** — Table of ALL screenshots with: number, file link,
    route/element, viewport, and human description of what it shows
16. **⏭️ Skipped Domains** — Table with domain name and clear reason WHY
17. **💡 Recommendations** — Prioritized by severity:
    - 🔴 Critical (fix before shipping)
    - 🟠 High (fix this sprint)
    - 🟡 Medium (add to backlog)
    - 🔵 Low (nice to have)
    Each recommendation is one actionable sentence a developer can act on immediately.
18. **📋 Test Execution Timeline** — Table showing `Time | Event` for each domain
    completion, with status emoji

### Writing Style Rules

- Write like a human, not a machine. Say "The dashboard silently swallows API errors"
  not "ERROR: silent failure detected in component ThreatDashboard."
- Use conversational transitions between sections. Brief is fine, robotic is not.
- For each issue, explain what the USER would experience, not just what the code does.
- Always embed screenshots inline with `![description](path)` — never just list paths.
- Use ASCII art for the health score and memory profile boxes.
- End with a footer line showing date, skill version, total screenshots, and health grade.

---

## Error Handling

- If any test script fails, run it with `--help` or `--verbose` before assuming a config issue.
- Never silently skip a domain. If a tool is missing, report it and suggest installation.
- If a domain is not applicable (e.g., no GraphQL), note it as `[SKIPPED — not applicable]` in the checklist.
- If Playwright is not installed, install it: `npx playwright install chromium`
- If the preview server fails to start, fall back to `npx serve ./dist -l 4173`

---

## Resources

- **Scripts:**
  - [scan-leakage.sh](scripts/scan-leakage.sh) — Wraps all grep-based leakage checks
  - [check-bundle-size.sh](scripts/check-bundle-size.sh) — Checks gzip size of dist/ chunks
  - [run-dom-tests.sh](scripts/run-dom-tests.sh) — Launches preview server, runs all Playwright DOM tests
  - [capture-baselines.sh](scripts/capture-baselines.sh) — First-run screenshot baseline capture
  - [diff-screenshots.sh](scripts/diff-screenshots.sh) — Compares current screenshots against baselines
  - [detect-memory-leaks.sh](scripts/detect-memory-leaks.sh) — Heap snapshot before/after comparison
  - [check-ux-signals.sh](scripts/check-ux-signals.sh) — Scans source for UX anti-patterns (ambiguous labels, missing aria, jargon)

- **Examples:**
  - [api-test-template.ts](examples/api-test-template.ts) — Reusable fetch-based endpoint test template
  - [playwright-form-matrix.ts](examples/playwright-form-matrix.ts) — 4-case form test template (empty, invalid, valid, server error)
  - [playwright-breakage-listener.ts](examples/playwright-breakage-listener.ts) — pageerror + console listener setup for breakage detection
  - [playwright-route-intercept.ts](examples/playwright-route-intercept.ts) — Simulate API failures, slow network, and third-party blocking
  - [persona-journey-runner.ts](examples/persona-journey-runner.ts) — Persona-based goal journey execution with friction scoring
  - [ux-heuristic-evaluator.ts](examples/ux-heuristic-evaluator.ts) — Automated UX heuristic checks, feedback latency, and semantic locator audit

- **Tooling:**
  - [Playwright](https://playwright.dev/) for all browser interaction, DOM inspection, and route interception
  - Playwright `page.on('pageerror')` and `page.on('console')` for error capture
  - Playwright semantic locators (`getByRole`, `getByLabel`, etc.) for human-centered element selection
  - Chrome DevTools Protocol (CDP) via Playwright for heap snapshots
  - `MutationObserver` injected via `page.evaluate()` for DOM watching
  - `pixelmatch` or Playwright screenshot diff for visual regression
  - [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/) for unit testing
  - [axe-core](https://github.com/dequelabs/axe-core) for accessibility
  - [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) for performance
  - `grep` / `ripgrep` for leakage scanning and UX signal scanning (no install needed)

- **References (report formatting):**
  - [report-template.md](references/report-template.md) — **MUST follow** this template for every test report
  - [sample-report.md](references/sample-report.md) — Realistic example of a completed test report with all sections filled in

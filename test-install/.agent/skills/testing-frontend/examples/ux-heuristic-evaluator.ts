/**
 * ux-heuristic-evaluator.ts
 *
 * Automated UX heuristic checks, feedback latency measurement, microcopy
 * clarity scan, and semantic locator health audit using Playwright.
 *
 * Covers Domain 12 (UX Heuristic Evaluation) and Domain 13 (Perceived
 * Quality & Trust Signals).
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL and ROUTES
 *   3. Run: npx playwright test ux-heuristic-evaluator.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 */

import { test, expect, Page } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

/** Routes to evaluate — adapt to your app */
const ROUTES = ["/", "/login", "/dashboard", "/settings"];

// ─── Types ───────────────────────────────────────────────────────────────────

type Heuristic =
  | "H1-visibility"
  | "H2-real-world-language"
  | "H3-user-control"
  | "H4-consistency"
  | "H5-error-prevention"
  | "H6-recognition"
  | "H7-flexibility"
  | "H8-aesthetic-clarity"
  | "H9-error-recovery"
  | "H10-help";

type CognitiveLoad = "low" | "medium" | "high";
type Severity = "critical" | "high" | "medium" | "low";

interface HeuristicViolation {
  route: string;
  element?: string;
  heuristic: Heuristic;
  severity: Severity;
  description: string;
  whyConfusing: string;
  cognitiveLoad: CognitiveLoad;
  suggestedFix: string;
}

interface FeedbackLatencyResult {
  route: string;
  element: string;
  latencyMs: number;
  rating: "excellent" | "good" | "needs-indicator" | "trust-violation";
}

interface SemanticLocatorResult {
  route: string;
  element: string;
  tagName: string;
  foundByRole: boolean;
  foundByLabel: boolean;
  foundByPlaceholder: boolean;
  foundByText: boolean;
  requiresTestId: boolean;
  requiresCSS: boolean;
  accessibilityConcern: string | null;
}

// ─── Heuristic Evaluator ─────────────────────────────────────────────────────

class HeuristicEvaluator {
  violations: HeuristicViolation[] = [];
  feedbackResults: FeedbackLatencyResult[] = [];
  locatorResults: SemanticLocatorResult[] = [];

  // ── H1: Visibility of System Status ──────────────────────────────────

  /**
   * Check that buttons show immediate feedback when clicked.
   * Measures time from click to any visible DOM change.
   */
  async checkFeedbackLatency(page: Page, route: string): Promise<void> {
    const buttons = await page.locator("button:visible").all();

    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const btn = buttons[i];
      const text =
        (await btn.textContent())?.trim().slice(0, 30) || `button-${i}`;

      // Skip buttons that navigate away
      const onclick = await btn.getAttribute("onclick");
      const type = await btn.getAttribute("type");
      if (type === "submit") continue;

      try {
        // Snapshot the page before click
        const beforeHTML = await page.evaluate(() => document.body.innerHTML);
        const start = Date.now();

        await btn.click({ timeout: 2000 });

        // Wait for any DOM change (max 2 seconds)
        let changed = false;
        for (let t = 0; t < 20; t++) {
          await page.waitForTimeout(100);
          const afterHTML = await page.evaluate(() => document.body.innerHTML);
          if (afterHTML !== beforeHTML) {
            changed = true;
            break;
          }
        }

        const latencyMs = changed ? Date.now() - start : 2000;

        let rating: FeedbackLatencyResult["rating"];
        if (latencyMs < 100) rating = "excellent";
        else if (latencyMs < 300) rating = "good";
        else if (latencyMs < 1000) rating = "needs-indicator";
        else rating = "trust-violation";

        this.feedbackResults.push({
          route,
          element: text,
          latencyMs,
          rating,
        });

        if (rating === "trust-violation") {
          this.violations.push({
            route,
            element: text,
            heuristic: "H1-visibility",
            severity: "high",
            description: `Button "${text}" took ${latencyMs}ms to show any feedback after click.`,
            whyConfusing:
              "The user has no idea if their click was registered. They might click again, causing duplicate actions.",
            cognitiveLoad: "high",
            suggestedFix:
              "Add an immediate visual change (loading spinner, button state change, or disabled state) within 100ms of click.",
          });
        }
      } catch {
        // Button might have been removed or caused navigation
      }
    }
  }

  // ── H2: Match to Real-World Language ─────────────────────────────────

  /**
   * Check for ambiguous CTA labels and internal jargon.
   */
  async checkMicrocopy(page: Page, route: string): Promise<void> {
    // Ambiguous button/link labels
    const ambiguousLabels = [
      "submit",
      "click here",
      "ok",
      "go",
      "yes",
      "no",
      "continue",
      "next",
      "back",
      "done",
      "close",
    ];

    const buttons = await page.locator("button:visible, a:visible").all();

    for (const el of buttons) {
      const text = (await el.textContent())?.trim().toLowerCase() || "";
      const ariaLabel =
        (await el.getAttribute("aria-label"))?.toLowerCase() || "";

      for (const ambiguous of ambiguousLabels) {
        if (text === ambiguous || ariaLabel === ambiguous) {
          this.violations.push({
            route,
            element: text || ariaLabel,
            heuristic: "H2-real-world-language",
            severity: "medium",
            description: `Button/link labeled "${text || ariaLabel}" is ambiguous without context.`,
            whyConfusing: `A user seeing just "${text || ariaLabel}" can't predict what will happen. Clear labels like "Save draft" or "Cancel subscription" set expectations.`,
            cognitiveLoad: "medium",
            suggestedFix: `Replace "${text || ariaLabel}" with a specific action label that describes the outcome (e.g., "Save changes", "Go to dashboard").`,
          });
          break;
        }
      }
    }
  }

  // ── H3: User Control and Freedom ─────────────────────────────────────

  /**
   * Check that modals can be dismissed and forms can be cancelled.
   */
  async checkUserControl(page: Page, route: string): Promise<void> {
    // Check: are there modals without close buttons or escape handling?
    const modals = await page
      .locator("[role='dialog']:visible, .modal:visible, .drawer:visible")
      .all();

    for (const modal of modals) {
      const closeBtn = modal.locator(
        "button:has-text('Close'), button:has-text('×'), button[aria-label='Close'], button:has-text('Cancel')"
      );
      const hasClose =
        (await closeBtn.count()) > 0 &&
        (await closeBtn.first().isVisible().catch(() => false));

      if (!hasClose) {
        this.violations.push({
          route,
          element: "modal/dialog",
          heuristic: "H3-user-control",
          severity: "high",
          description:
            "Modal or dialog is open with no visible close/cancel button.",
          whyConfusing:
            "The user feels trapped. They can't go back or dismiss the dialog without guessing (Escape key? Click outside?).",
          cognitiveLoad: "high",
          suggestedFix:
            "Add a visible close button (×) in the top-right corner and ensure Escape key dismisses the dialog.",
        });
      }
    }
  }

  // ── H5: Error Prevention ─────────────────────────────────────────────

  /**
   * Check that forms have input validation hints before submission.
   */
  async checkErrorPrevention(page: Page, route: string): Promise<void> {
    const inputs = await page
      .locator("input:visible, select:visible, textarea:visible")
      .all();

    for (const input of inputs) {
      const type = (await input.getAttribute("type")) || "text";
      const name = (await input.getAttribute("name")) || "";
      const placeholder = (await input.getAttribute("placeholder")) || "";
      const ariaLabel = (await input.getAttribute("aria-label")) || "";
      const required = await input.getAttribute("required");
      const pattern = await input.getAttribute("pattern");

      // Check: required inputs without visual hint
      if (required !== null) {
        const label = await page
          .locator(`label[for="${await input.getAttribute("id")}"]`)
          .first()
          .textContent()
          .catch(() => "");

        if (label && !label.includes("*") && !label.includes("required")) {
          this.violations.push({
            route,
            element: name || placeholder || type,
            heuristic: "H5-error-prevention",
            severity: "low",
            description: `Required field "${name || placeholder}" has no visual indicator that it's required.`,
            whyConfusing:
              "The user won't know this field is mandatory until they try to submit and get an error.",
            cognitiveLoad: "low",
            suggestedFix:
              'Add an asterisk (*) to the label or show "Required" next to the field.',
          });
        }
      }

      // Check: email/password fields without helpful type or pattern
      if (
        type === "text" &&
        (name.includes("email") || placeholder.toLowerCase().includes("email"))
      ) {
        this.violations.push({
          route,
          element: name || placeholder,
          heuristic: "H5-error-prevention",
          severity: "medium",
          description: `Email field "${name || placeholder}" uses type="text" instead of type="email".`,
          whyConfusing:
            "Mobile keyboards won't show the @ key, and the browser won't validate the email format automatically.",
          cognitiveLoad: "medium",
          suggestedFix:
            'Change input type to "email" for built-in validation and mobile keyboard optimization.',
        });
      }
    }
  }

  // ── H9: Error Recognition and Recovery ───────────────────────────────

  /**
   * Check that visible error messages are specific and actionable.
   */
  async checkErrorMessages(page: Page, route: string): Promise<void> {
    const errorSelectors = [
      "[role='alert']",
      ".error",
      ".error-message",
      ".validation-error",
      ".field-error",
    ];

    for (const selector of errorSelectors) {
      const errors = await page.locator(`${selector}:visible`).all();
      for (const error of errors) {
        const text = (await error.textContent())?.trim() || "";
        const genericMessages = [
          "error",
          "something went wrong",
          "invalid",
          "failed",
          "oops",
          "an error occurred",
        ];

        const isGeneric = genericMessages.some(
          (msg) => text.toLowerCase() === msg || text.toLowerCase().startsWith(msg + ".")
        );

        if (isGeneric) {
          this.violations.push({
            route,
            element: text.slice(0, 50),
            heuristic: "H9-error-recovery",
            severity: "medium",
            description: `Error message "${text.slice(0, 60)}" is too vague to help the user recover.`,
            whyConfusing:
              'The user knows something went wrong but has no idea what to do about it. They need specific guidance like "Password must be at least 8 characters."',
            cognitiveLoad: "high",
            suggestedFix:
              "Replace with a specific message that explains what went wrong and what action the user should take.",
          });
        }
      }
    }
  }

  // ── 13e: Semantic Locator Health Audit ────────────────────────────────

  /**
   * For every interactive element, check if it can be discovered by
   * semantic locators (role, label, placeholder, text) or requires
   * brittle CSS selectors.
   */
  async auditSemanticLocators(page: Page, route: string): Promise<void> {
    const interactiveElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        "button, a, input, select, textarea, [role='button'], [role='link'], [role='tab'], [role='menuitem']"
      );
      return Array.from(elements)
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .slice(0, 30)
        .map((el) => ({
          tagName: el.tagName.toLowerCase(),
          role: el.getAttribute("role") || "",
          ariaLabel: el.getAttribute("aria-label") || "",
          name: el.getAttribute("name") || "",
          type: el.getAttribute("type") || "",
          placeholder: el.getAttribute("placeholder") || "",
          text: el.textContent?.trim().slice(0, 50) || "",
          id: el.id || "",
          testId: el.getAttribute("data-testid") || "",
          className: el.className?.toString().slice(0, 50) || "",
        }));
    });

    for (const el of interactiveElements) {
      const result: SemanticLocatorResult = {
        route,
        element: el.ariaLabel || el.text || el.placeholder || el.name || el.id || el.tagName,
        tagName: el.tagName,
        foundByRole: false,
        foundByLabel: false,
        foundByPlaceholder: false,
        foundByText: false,
        requiresTestId: false,
        requiresCSS: false,
        accessibilityConcern: null,
      };

      // Check role discoverability
      if (el.role || ["button", "a", "input", "select", "textarea"].includes(el.tagName)) {
        result.foundByRole = true;
      }

      // Check label discoverability
      if (el.ariaLabel || el.name) {
        result.foundByLabel = true;
      }

      // Check placeholder
      if (el.placeholder) {
        result.foundByPlaceholder = true;
      }

      // Check text content
      if (el.text && el.text.length > 0 && el.text.length < 50) {
        result.foundByText = true;
      }

      // If no semantic locator works, check for testid or CSS-only
      if (!result.foundByRole && !result.foundByLabel && !result.foundByText) {
        if (el.testId) {
          result.requiresTestId = true;
          result.accessibilityConcern =
            "Element is only discoverable by data-testid — it may lack accessible name for screen readers.";
        } else {
          result.requiresCSS = true;
          result.accessibilityConcern =
            "Element has no semantic name, label, or visible text — it is invisible to screen readers and keyboard users.";

          this.violations.push({
            route,
            element: result.element,
            heuristic: "H6-recognition",
            severity: "high",
            description: `Interactive ${el.tagName} element "${result.element}" has no accessible name, label, or visible text.`,
            whyConfusing:
              "Screen reader users and keyboard users cannot identify this control. It's essentially invisible to assistive technology.",
            cognitiveLoad: "high",
            suggestedFix: `Add an aria-label, visible label, or meaningful text content to this ${el.tagName} element.`,
          });
        }
      }

      this.locatorResults.push(result);
    }
  }

  // ── Report Generation ────────────────────────────────────────────────

  /**
   * Generate a structured heuristic violation report.
   */
  generateReport(): string {
    const lines: string[] = [
      "═".repeat(60),
      "  UX HEURISTIC EVALUATION REPORT",
      `  Generated: ${new Date().toISOString()}`,
      "═".repeat(60),
      "",
    ];

    if (this.violations.length === 0) {
      lines.push("  ✅ No heuristic violations detected.");
      return lines.join("\n");
    }

    // Group by heuristic
    const grouped: Record<string, HeuristicViolation[]> = {};
    for (const v of this.violations) {
      if (!grouped[v.heuristic]) grouped[v.heuristic] = [];
      grouped[v.heuristic].push(v);
    }

    for (const [heuristic, violations] of Object.entries(grouped)) {
      lines.push(`\n## ${heuristic}`, "");
      for (const v of violations) {
        lines.push(
          `- **${v.severity.toUpperCase()}** · ${v.route} · "${v.element}"`,
          `  ${v.description}`,
          `  💭 Why this confuses humans: ${v.whyConfusing}`,
          `  🧠 Cognitive load: ${v.cognitiveLoad}`,
          `  🔧 Fix: ${v.suggestedFix}`,
          ""
        );
      }
    }

    // Semantic locator summary
    const total = this.locatorResults.length;
    const byRole = this.locatorResults.filter((r) => r.foundByRole).length;
    const byLabel = this.locatorResults.filter((r) => r.foundByLabel).length;
    const needsTestId = this.locatorResults.filter((r) => r.requiresTestId).length;
    const needsCSS = this.locatorResults.filter((r) => r.requiresCSS).length;

    lines.push(
      "\n## Semantic Locator Health",
      "",
      `  Total interactive elements audited: ${total}`,
      `  ✅ Discoverable by role:            ${byRole} (${Math.round((byRole / total) * 100)}%)`,
      `  ✅ Discoverable by label:           ${byLabel} (${Math.round((byLabel / total) * 100)}%)`,
      `  ⚠️  Requires testid fallback:       ${needsTestId}`,
      `  ❌ Requires CSS fallback:           ${needsCSS}`,
      ""
    );

    // Feedback latency summary
    if (this.feedbackResults.length > 0) {
      lines.push("\n## Feedback Latency", "");
      for (const r of this.feedbackResults) {
        const emoji =
          r.rating === "excellent"
            ? "✅"
            : r.rating === "good"
              ? "✅"
              : r.rating === "needs-indicator"
                ? "⚠️"
                : "❌";
        lines.push(
          `  ${emoji} ${r.route} · "${r.element}" · ${r.latencyMs}ms · ${r.rating}`
        );
      }
    }

    lines.push(
      "",
      "─".repeat(60),
      `Total violations: ${this.violations.length}`,
      `  Critical: ${this.violations.filter((v) => v.severity === "critical").length}`,
      `  High: ${this.violations.filter((v) => v.severity === "high").length}`,
      `  Medium: ${this.violations.filter((v) => v.severity === "medium").length}`,
      `  Low: ${this.violations.filter((v) => v.severity === "low").length}`
    );

    return lines.join("\n");
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Domain 12 & 13: UX Heuristic & Perceived Quality", () => {
  let evaluator: HeuristicEvaluator;

  test.beforeAll(() => {
    evaluator = new HeuristicEvaluator();
  });

  for (const route of ROUTES) {
    test(`Heuristic evaluation: ${route}`, async ({ page }) => {
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Run all automated heuristic checks
      await evaluator.checkFeedbackLatency(page, route);
      await evaluator.checkMicrocopy(page, route);
      await evaluator.checkUserControl(page, route);
      await evaluator.checkErrorPrevention(page, route);
      await evaluator.checkErrorMessages(page, route);
      await evaluator.auditSemanticLocators(page, route);

      // Screenshot
      const routeSlug =
        route.replace(/\//g, "-").replace(/^-/, "") || "root";
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/ux-eval-${routeSlug}.png`,
        fullPage: true,
      });
    });
  }

  test("Generate UX heuristic report", async () => {
    const report = evaluator.generateReport();
    console.log("\n" + report);

    // Fail if there are critical heuristic violations
    const criticals = evaluator.violations.filter(
      (v) => v.severity === "critical"
    );
    expect(criticals, {
      message: `Found ${criticals.length} critical UX heuristic violation(s). See report above.`,
    }).toHaveLength(0);
  });
});

// ─── Trust Signal Checks (Domain 13b) ────────────────────────────────────────

test.describe("Domain 13: Trust Signal Audit", () => {
  for (const route of ROUTES) {
    test(`Trust signals: ${route}`, async ({ page }) => {
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Check for favicon
      const favicon = await page.evaluate(() => {
        const link = document.querySelector(
          "link[rel='icon'], link[rel='shortcut icon']"
        );
        return link ? (link as HTMLLinkElement).href : null;
      });

      if (!favicon) {
        console.log(`  ⚠️ ${route}: No favicon found — looks unprofessional`);
      }

      // Check for vague loading text
      const loadingTexts = await page.evaluate(() => {
        const all = document.querySelectorAll("*");
        const vague: string[] = [];
        all.forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (
            text === "loading..." ||
            text === "loading" ||
            text === "please wait" ||
            text === "please wait..."
          ) {
            vague.push(text);
          }
        });
        return vague;
      });

      if (loadingTexts.length > 0) {
        console.log(
          `  ⚠️ ${route}: Found vague loading text: "${loadingTexts.join('", "')}" — add context like "Loading your proposals..."`
        );
      }

      // Check for disabled buttons without explanation
      const disabledButtons = await page
        .locator("button:disabled:visible")
        .all();

      for (const btn of disabledButtons) {
        const title = await btn.getAttribute("title");
        const ariaLabel = await btn.getAttribute("aria-label");
        const tooltip = await btn.locator("..").locator("[role='tooltip']").count();

        if (!title && !ariaLabel && tooltip === 0) {
          const text = (await btn.textContent())?.trim() || "unnamed";
          console.log(
            `  ⚠️ ${route}: Disabled button "${text}" has no tooltip explaining why it's disabled`
          );
        }
      }

      // Check for generic error messages
      const genericErrors = await page.evaluate(() => {
        const alerts = document.querySelectorAll(
          "[role='alert'], .error, .error-message"
        );
        const generic: string[] = [];
        alerts.forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if (
            text === "something went wrong" ||
            text === "error" ||
            text === "an error occurred" ||
            text.startsWith("oops")
          ) {
            generic.push(el.textContent?.trim() || "");
          }
        });
        return generic;
      });

      if (genericErrors.length > 0) {
        console.log(
          `  ❌ ${route}: Found generic error message(s): "${genericErrors.join('", "')}" — make them specific and actionable`
        );
      }
    });
  }
});

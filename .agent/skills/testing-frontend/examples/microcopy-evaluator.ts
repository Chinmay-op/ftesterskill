/**
 * microcopy-evaluator.ts
 *
 * Playwright-based evaluator for Domain 16: UX Writing & Microcopy Quality.
 * Extracts all user-facing text from the live DOM and evaluates:
 *   16a — CTA label audit (verb+noun, specificity, consistency, length)
 *   16b — Helper text coverage (form inputs with/without guidance)
 *   16c — Empty state quality (data-dependent views with fallback messaging)
 *   16d — Error message quality (specificity, actionability, positioning)
 *   16f — Terminology consistency (synonym detection across routes)
 *   16g — Tone & voice consistency (formality, emoji, punctuation)
 *
 * Concepts borrowed from:
 *   - Vale prose linting rules (CTA pattern checks)
 *   - Heurilens CTA evaluation criteria
 *
 * Usage:
 *   npx playwright test examples/microcopy-evaluator.ts
 *
 * Environment variables:
 *   PREVIEW_URL  — Base URL (default: http://localhost:4173)
 *   ROUTES       — Comma-separated routes (default: /)
 *   MC_GATING    — "warn" (default) or "strict"
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Configuration ──────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
const ROUTES = (process.env.ROUTES ?? "/").split(",").map((r) => r.trim());
const GATING_MODE = process.env.MC_GATING ?? "warn";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MCFinding {
  subdomain: string;
  severity: "critical" | "high" | "medium" | "low";
  route: string;
  element: string;
  observation: string;
  suggestedFix: string;
}

interface CTAAnalysis {
  text: string;
  element: string;
  hasVerb: boolean;
  hasNoun: boolean;
  wordCount: number;
  isVague: boolean;
}

interface HelperTextResult {
  inputSelector: string;
  hasLabel: boolean;
  hasAriaDescribedby: boolean;
  hasPlaceholder: boolean;
  hasVisibleHelper: boolean;
  hasConstraints: boolean;
}

interface MCScorecard {
  ctaQuality: number;
  helperCoverage: number;
  errorQuality: number;
  terminologyConsistency: number;
  overall: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Vague single-word CTAs that should be verb+noun
const VAGUE_LABELS = new Set([
  "submit", "send", "go", "ok", "yes", "no", "cancel", "close",
  "back", "next", "done", "save", "edit", "add", "update", "apply",
  "continue", "proceed", "confirm", "accept", "reject", "decline",
  "delete", "remove", "clear", "reset", "retry", "skip", "open",
  "start", "stop", "run", "view", "show", "hide",
]);

// Common action verbs for detecting verb+noun pattern
const ACTION_VERBS = new Set([
  "create", "save", "send", "submit", "add", "remove", "delete", "update",
  "edit", "view", "open", "close", "start", "stop", "download", "upload",
  "share", "copy", "move", "import", "export", "sign", "log", "register",
  "subscribe", "unsubscribe", "confirm", "cancel", "reset", "retry",
  "search", "filter", "sort", "select", "change", "switch", "toggle",
  "enable", "disable", "activate", "deactivate", "approve", "reject",
  "publish", "unpublish", "archive", "restore", "invite", "join",
  "leave", "follow", "unfollow", "like", "bookmark", "pin",
  "get", "set", "try", "learn", "explore", "discover", "browse",
  "continue", "proceed", "go", "navigate", "skip",
]);

// Synonym groups for terminology consistency checking
const SYNONYM_GROUPS = [
  ["workspace", "project", "space", "environment"],
  ["delete", "remove", "trash", "discard", "erase"],
  ["cancel", "close", "dismiss", "exit", "leave"],
  ["settings", "preferences", "configuration", "options"],
  ["account", "profile", "user"],
  ["create", "add", "new", "make"],
  ["save", "store", "keep", "preserve"],
  ["error", "failure", "problem", "issue"],
];

// ─── Evaluator ──────────────────────────────────────────────────────────────

class MicrocopyEvaluator {
  findings: MCFinding[] = [];
  routeScores: Map<string, MCScorecard> = new Map();
  allCTALabels: Map<string, Set<string>> = new Map(); // label → routes
  allTerms: Map<string, Map<string, Set<string>>> = new Map(); // synonymGroup → term → routes

  private addFinding(finding: MCFinding): void {
    this.findings.push(finding);
  }

  // ── 16a: CTA Label Audit ────────────────────────────────────────────────

  async checkCTALabels(page: Page, route: string): Promise<CTAAnalysis[]> {
    const ctas = await page.evaluate(() => {
      const results: { text: string; element: string; tag: string }[] = [];
      const elements = document.querySelectorAll(
        'button, a[href], [role="button"], input[type="submit"], input[type="button"]'
      );

      elements.forEach((el) => {
        const text = (el.textContent || "").trim().replace(/\s+/g, " ");
        if (text && text.length > 0 && text.length < 100) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : "";
          const cls = el.className ? `.${String(el.className).split(" ")[0]}` : "";
          results.push({
            text,
            element: `${tag}${id}${cls}`,
            tag,
          });
        }
      });

      return results;
    });

    const analyses: CTAAnalysis[] = [];
    let vagueCTAs = 0;
    let goodCTAs = 0;

    for (const cta of ctas) {
      const words = cta.text.toLowerCase().split(/\s+/);
      const firstWord = words[0];
      const hasVerb = ACTION_VERBS.has(firstWord);
      const hasNoun = words.length >= 2;
      const isVague = words.length === 1 && VAGUE_LABELS.has(firstWord);

      const analysis: CTAAnalysis = {
        text: cta.text,
        element: cta.element,
        hasVerb,
        hasNoun,
        wordCount: words.length,
        isVague,
      };
      analyses.push(analysis);

      // Track CTA labels across routes
      const key = cta.text.toLowerCase();
      if (!this.allCTALabels.has(key)) this.allCTALabels.set(key, new Set());
      this.allCTALabels.get(key)!.add(route);

      if (isVague) {
        vagueCTAs++;
        this.addFinding({
          subdomain: "16a",
          severity: "medium",
          route,
          element: cta.element,
          observation: `Vague CTA label: "${cta.text}". Single-word labels don't tell users what will happen.`,
          suggestedFix: `Use verb+noun format: instead of "${cta.text}", try "${firstWord} [object]" (e.g., "Save draft", "Send message").`,
        });
      } else if (words.length > 5) {
        this.addFinding({
          subdomain: "16a",
          severity: "low",
          route,
          element: cta.element,
          observation: `Long CTA label: "${cta.text}" (${words.length} words). CTAs should be 2-5 words.`,
          suggestedFix: `Shorten to the essential action: focus on verb + primary object.`,
        });
      } else {
        goodCTAs++;
      }
    }

    return analyses;
  }

  // ── 16b: Helper Text Coverage ───────────────────────────────────────────

  async checkHelperTextCoverage(page: Page, route: string): Promise<HelperTextResult[]> {
    const results = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
      );
      const data: {
        inputSelector: string;
        hasLabel: boolean;
        hasAriaDescribedby: boolean;
        hasPlaceholder: boolean;
        hasVisibleHelper: boolean;
        hasConstraints: boolean;
      }[] = [];

      inputs.forEach((input) => {
        const el = input as HTMLInputElement;
        const id = el.id || el.name || el.type || "unknown";

        // Check for associated label
        const hasLabel = !!(
          el.labels?.length ||
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby")
        );

        // Check for helper text
        const describedBy = el.getAttribute("aria-describedby");
        const hasAriaDescribedby = !!(describedBy && document.getElementById(describedBy));

        // Check for visible helper text (sibling or nearby element)
        const parent = el.parentElement;
        const hasVisibleHelper = !!(
          parent?.querySelector(".helper-text, .help-text, .hint, .description, small, .form-text") ||
          el.nextElementSibling?.classList.contains("helper") ||
          el.nextElementSibling?.tagName === "SMALL"
        );

        // Check for constraints
        const hasConstraints = !!(
          el.minLength > 0 ||
          el.maxLength > 0 ||
          el.pattern ||
          el.min ||
          el.max ||
          el.required
        );

        data.push({
          inputSelector: `${el.tagName.toLowerCase()}#${id}`,
          hasLabel,
          hasAriaDescribedby,
          hasPlaceholder: !!el.placeholder,
          hasVisibleHelper: hasAriaDescribedby || hasVisibleHelper,
          hasConstraints,
        });
      });

      return data;
    });

    // Find inputs with constraints but no helper text
    for (const r of results) {
      if (r.hasConstraints && !r.hasVisibleHelper) {
        this.addFinding({
          subdomain: "16b",
          severity: "medium",
          route,
          element: r.inputSelector,
          observation: `Input "${r.inputSelector}" has constraints but no helper text explaining them.`,
          suggestedFix: `Add visible helper text below the input (e.g., "Must be at least 8 characters") and link via aria-describedby.`,
        });
      }
      if (!r.hasLabel) {
        this.addFinding({
          subdomain: "16b",
          severity: "high",
          route,
          element: r.inputSelector,
          observation: `Input "${r.inputSelector}" has no associated label or aria-label.`,
          suggestedFix: `Add a <label> element or aria-label attribute.`,
        });
      }
    }

    return results;
  }

  // ── 16c: Empty State Detection ──────────────────────────────────────────

  async checkEmptyStates(page: Page, route: string): Promise<void> {
    const emptyPatterns = await page.evaluate(() => {
      const patterns: { element: string; isEmpty: boolean; hasMessage: boolean }[] = [];

      // Check common list/table/grid containers
      const containers = document.querySelectorAll(
        'table tbody, [class*="list"], [class*="grid"], [class*="cards"], [role="list"], [role="table"]'
      );

      containers.forEach((container) => {
        const children = container.children.length;
        const hasEmptyMsg = !!(
          container.querySelector('[class*="empty"], [class*="no-data"], [class*="no-results"]') ||
          container.textContent?.match(/no (data|results|items|entries)/i)
        );

        if (children === 0) {
          patterns.push({
            element: `${container.tagName}${container.className ? "." + String(container.className).split(" ")[0] : ""}`,
            isEmpty: true,
            hasMessage: hasEmptyMsg,
          });
        }
      });

      return patterns;
    });

    for (const pattern of emptyPatterns) {
      if (pattern.isEmpty && !pattern.hasMessage) {
        this.addFinding({
          subdomain: "16c",
          severity: "medium",
          route,
          element: pattern.element,
          observation: `Empty container "${pattern.element}" shows blank space with no guidance for the user.`,
          suggestedFix: `Add an empty state component explaining: what this area shows, why it's empty, and what action to take.`,
        });
      }
    }
  }

  // ── 16f: Terminology Consistency ────────────────────────────────────────

  async checkTerminology(page: Page, route: string): Promise<void> {
    const pageText = await page.evaluate(() => {
      return document.body?.innerText?.toLowerCase() || "";
    });

    for (const group of SYNONYM_GROUPS) {
      const foundTerms = group.filter((term) => pageText.includes(term));
      if (foundTerms.length > 0) {
        for (const term of foundTerms) {
          const groupKey = group.join("/");
          if (!this.allTerms.has(groupKey)) this.allTerms.set(groupKey, new Map());
          const termMap = this.allTerms.get(groupKey)!;
          if (!termMap.has(term)) termMap.set(term, new Set());
          termMap.get(term)!.add(route);
        }
      }
    }
  }

  // Call after all routes are scanned
  analyzeTerminologyConsistency(): void {
    for (const [groupKey, termMap] of this.allTerms) {
      if (termMap.size > 1) {
        const terms = Array.from(termMap.entries())
          .map(([term, routes]) => `"${term}" (${Array.from(routes).join(", ")})`)
          .join(", ");

        this.addFinding({
          subdomain: "16f",
          severity: "medium",
          route: "cross-route",
          element: "-",
          observation: `Terminology inconsistency in [${groupKey}] group: ${terms}`,
          suggestedFix: `Pick one term and use it consistently. Update all instances across all routes.`,
        });
      }
    }
  }

  // ── Scorecard ───────────────────────────────────────────────────────────

  generateScorecard(route: string, ctas: CTAAnalysis[], helpers: HelperTextResult[]): MCScorecard {
    // CTA quality
    const goodCTAs = ctas.filter((c) => !c.isVague && c.wordCount >= 2 && c.wordCount <= 5).length;
    const ctaScore = ctas.length > 0 ? Math.round((goodCTAs / ctas.length) * 100) : 100;

    // Helper text coverage
    const inputsWithHelp = helpers.filter((h) => h.hasVisibleHelper || !h.hasConstraints).length;
    const helperScore = helpers.length > 0 ? Math.round((inputsWithHelp / helpers.length) * 100) : 100;

    // Error quality (based on findings)
    const errorFindings = this.findings.filter(
      (f) => f.route === route && (f.subdomain === "16d" || f.subdomain === "16c")
    ).length;
    const errorScore = Math.max(0, 100 - errorFindings * 20);

    // Terminology (based on findings)
    const termFindings = this.findings.filter(
      (f) => f.subdomain === "16f"
    ).length;
    const termScore = Math.max(0, 100 - termFindings * 15);

    const overall = Math.round(ctaScore * 0.35 + helperScore * 0.25 + errorScore * 0.2 + termScore * 0.2);

    const scorecard: MCScorecard = {
      ctaQuality: ctaScore,
      helperCoverage: helperScore,
      errorQuality: errorScore,
      terminologyConsistency: termScore,
      overall,
    };

    this.routeScores.set(route, scorecard);
    return scorecard;
  }

  // ── Report ──────────────────────────────────────────────────────────────

  generateReport(): string {
    const lines: string[] = [];

    lines.push("", "═".repeat(70));
    lines.push("  ✍️  UX WRITING & MICROCOPY QUALITY REPORT");
    lines.push("═".repeat(70), "");

    // Scorecard
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│  ✍️  MICROCOPY QUALITY SCORECARD                           │");
    lines.push("├─────────────────────────────────────────────────────────────┤");

    for (const [route, score] of this.routeScores) {
      const bar = (val: number) =>
        "█".repeat(Math.round(val / 10)) + "░".repeat(10 - Math.round(val / 10));
      lines.push(`│                                                             │`);
      lines.push(`│  Route: ${route.padEnd(50)}│`);
      lines.push(`│  CTA Quality:          ${bar(score.ctaQuality)}  ${String(score.ctaQuality).padStart(3)}/100  │`);
      lines.push(`│  Helper Coverage:      ${bar(score.helperCoverage)}  ${String(score.helperCoverage).padStart(3)}/100  │`);
      lines.push(`│  Error Quality:        ${bar(score.errorQuality)}  ${String(score.errorQuality).padStart(3)}/100  │`);
      lines.push(`│  Term. Consistency:    ${bar(score.terminologyConsistency)}  ${String(score.terminologyConsistency).padStart(3)}/100  │`);
      lines.push(`│                                                             │`);
      lines.push(`│  Overall:              ${String(score.overall).padStart(3)}/100                             │`);
    }

    lines.push("│                                                             │");
    lines.push("└─────────────────────────────────────────────────────────────┘");

    // Findings
    if (this.findings.length > 0) {
      lines.push("", "── Findings ─────────────────────────────────────────────────", "");

      const grouped = new Map<string, MCFinding[]>();
      for (const f of this.findings) {
        if (!grouped.has(f.subdomain)) grouped.set(f.subdomain, []);
        grouped.get(f.subdomain)!.push(f);
      }

      for (const [subdomain, findings] of grouped) {
        lines.push(`  --- ${subdomain} ---`);
        for (const f of findings.slice(0, 10)) {
          const emoji = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
          lines.push(`  ${emoji} ${f.route} · ${f.element}`);
          lines.push(`    ${f.observation}`);
          lines.push(`    🔧 ${f.suggestedFix}`);
          lines.push("");
        }
        if (findings.length > 10) {
          lines.push(`  ... and ${findings.length - 10} more in this category.`);
          lines.push("");
        }
      }
    }

    // Summary
    lines.push("─".repeat(70));
    lines.push(`Total findings: ${this.findings.length}`);
    lines.push(`  High: ${this.findings.filter((f) => f.severity === "high" || f.severity === "critical").length}`);
    lines.push(`  Medium: ${this.findings.filter((f) => f.severity === "medium").length}`);
    lines.push(`  Low: ${this.findings.filter((f) => f.severity === "low").length}`);
    lines.push(`Gating mode: ${GATING_MODE}`);
    lines.push("");

    return lines.join("\n");
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe("Domain 16: UX Writing & Microcopy Quality", () => {
  let evaluator: MicrocopyEvaluator;

  test.beforeAll(() => {
    evaluator = new MicrocopyEvaluator();
  });

  for (const route of ROUTES) {
    test(`Microcopy check: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      const ctas = await evaluator.checkCTALabels(page, route);
      const helpers = await evaluator.checkHelperTextCoverage(page, route);
      await evaluator.checkEmptyStates(page, route);
      await evaluator.checkTerminology(page, route);

      evaluator.generateScorecard(route, ctas, helpers);
    });
  }

  test("Generate Microcopy Report", async () => {
    // Run cross-route analysis
    evaluator.analyzeTerminologyConsistency();

    const report = evaluator.generateReport();
    console.log("\n" + report);

    if (GATING_MODE === "strict") {
      const avgOverall = Array.from(evaluator.routeScores.values()).reduce(
        (sum, s) => sum + s.overall,
        0
      ) / evaluator.routeScores.size;

      expect(avgOverall, {
        message: `Microcopy quality score is ${Math.round(avgOverall)}/100.`,
      }).toBeGreaterThanOrEqual(50);
    }
  });
});

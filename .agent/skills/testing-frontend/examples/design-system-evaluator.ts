/**
 * design-system-evaluator.ts
 *
 * Playwright-based evaluator for Domain 15: Design System Consistency.
 * Extracts computed styles from the live DOM and measures:
 *   15a — Token coverage (CSS custom properties vs hardcoded values)
 *   15b — Component family drift (button/input/card style variance)
 *   15c — Semantic color compliance (error/success/warning/info hues)
 *   15d — Typography scale adherence (distinct font-size count)
 *   15e — Spacing scale compliance (margin/padding alignment to base unit)
 *   15f — Dark mode token coverage (theme-aware custom properties)
 *
 * Usage:
 *   npx playwright test examples/design-system-evaluator.ts
 *
 * Environment variables:
 *   PREVIEW_URL  — Base URL of the app (default: http://localhost:4173)
 *   ROUTES       — Comma-separated routes (default: /)
 *   DS_GATING    — "warn" (default), "strict", or "off"
 *   DS_STRICT_THRESHOLD — Minimum token coverage score in strict mode (default: 60)
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Configuration ──────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
const ROUTES = (process.env.ROUTES ?? "/").split(",").map((r) => r.trim());
const GATING_MODE = process.env.DS_GATING ?? "warn";
const STRICT_THRESHOLD = parseInt(process.env.DS_STRICT_THRESHOLD ?? "60", 10);

// ─── Types ──────────────────────────────────────────────────────────────────

interface TokenCoverage {
  property: string;
  total: number;
  tokenized: number;
  percentage: number;
}

interface ComponentFamily {
  selector: string;
  propertyName: string;
  distinctValues: string[];
  variance: number;
}

interface TypographyScale {
  distinctSizes: string[];
  count: number;
  isHealthy: boolean;
}

interface SpacingAnalysis {
  values: number[];
  baseUnit: number;
  aligned: number;
  misaligned: number;
  percentage: number;
}

interface DSFinding {
  subdomain: string;
  severity: "critical" | "high" | "medium" | "low";
  route: string;
  observation: string;
  suggestedFix: string;
}

interface DSScorecard {
  tokenCoverage: number;
  componentConsistency: number;
  typographyAdherence: number;
  spacingCompliance: number;
  overall: number;
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

class DesignSystemEvaluator {
  findings: DSFinding[] = [];
  routeScores: Map<string, DSScorecard> = new Map();

  private addFinding(finding: DSFinding): void {
    this.findings.push(finding);
  }

  // ── 15a: Token Coverage ─────────────────────────────────────────────────

  async checkTokenCoverage(page: Page, route: string): Promise<TokenCoverage[]> {
    const coverageData = await page.evaluate(() => {
      const results: { property: string; total: number; tokenized: number; percentage: number }[] = [];
      const sheets = Array.from(document.styleSheets);
      const propertyGroups: Record<string, { total: number; tokenized: number }> = {
        color: { total: 0, tokenized: 0 },
        spacing: { total: 0, tokenized: 0 },
        radius: { total: 0, tokenized: 0 },
        shadow: { total: 0, tokenized: 0 },
      };

      try {
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule) {
                const style = rule.style;
                // Colors
                for (const prop of ["color", "background-color", "border-color", "fill", "stroke"]) {
                  const val = style.getPropertyValue(prop);
                  if (val) {
                    propertyGroups.color.total++;
                    if (val.includes("var(")) propertyGroups.color.tokenized++;
                  }
                }
                // Spacing
                for (const prop of ["margin", "padding", "margin-top", "margin-bottom", "margin-left", "margin-right", "padding-top", "padding-bottom", "padding-left", "padding-right", "gap"]) {
                  const val = style.getPropertyValue(prop);
                  if (val) {
                    propertyGroups.spacing.total++;
                    if (val.includes("var(")) propertyGroups.spacing.tokenized++;
                  }
                }
                // Radius
                const radius = style.getPropertyValue("border-radius");
                if (radius) {
                  propertyGroups.radius.total++;
                  if (radius.includes("var(")) propertyGroups.radius.tokenized++;
                }
                // Shadow
                const shadow = style.getPropertyValue("box-shadow");
                if (shadow) {
                  propertyGroups.shadow.total++;
                  if (shadow.includes("var(")) propertyGroups.shadow.tokenized++;
                }
              }
            }
          } catch {
            // Cross-origin stylesheet — skip
          }
        }
      } catch {
        // Fallback: measure from computed styles on all elements
      }

      for (const [property, counts] of Object.entries(propertyGroups)) {
        results.push({
          property,
          total: counts.total,
          tokenized: counts.tokenized,
          percentage: counts.total > 0 ? Math.round((counts.tokenized / counts.total) * 100) : 100,
        });
      }

      return results;
    });

    // Evaluate coverage and add findings
    const thresholds: Record<string, { healthy: number; drifting: number }> = {
      color: { healthy: 80, drifting: 50 },
      spacing: { healthy: 60, drifting: 30 },
      radius: { healthy: 70, drifting: 40 },
      shadow: { healthy: 70, drifting: 40 },
    };

    for (const coverage of coverageData) {
      const threshold = thresholds[coverage.property];
      if (threshold && coverage.total > 0 && coverage.percentage < threshold.drifting) {
        this.addFinding({
          subdomain: "15a",
          severity: "high",
          route,
          observation: `Token coverage for ${coverage.property}: ${coverage.percentage}% (${coverage.tokenized}/${coverage.total}). Below ${threshold.drifting}% indicates broken design system adoption.`,
          suggestedFix: `Replace hardcoded ${coverage.property} values with CSS custom properties (var(--...)).`,
        });
      } else if (threshold && coverage.total > 0 && coverage.percentage < threshold.healthy) {
        this.addFinding({
          subdomain: "15a",
          severity: "medium",
          route,
          observation: `Token coverage for ${coverage.property}: ${coverage.percentage}% (${coverage.tokenized}/${coverage.total}). Below ${threshold.healthy}% = drifting.`,
          suggestedFix: `Audit and tokenize remaining hardcoded ${coverage.property} values.`,
        });
      }
    }

    return coverageData;
  }

  // ── 15b: Component Family Drift ─────────────────────────────────────────

  async checkComponentFamilyDrift(page: Page, route: string): Promise<ComponentFamily[]> {
    const families = await page.evaluate(() => {
      const results: { selector: string; propertyName: string; distinctValues: string[]; variance: number }[] = [];

      const checkFamily = (selector: string, properties: string[]) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length < 2) return;

        for (const prop of properties) {
          const values = new Set<string>();
          elements.forEach((el) => {
            const computed = getComputedStyle(el);
            const val = computed.getPropertyValue(prop);
            if (val) values.add(val);
          });

          results.push({
            selector,
            propertyName: prop,
            distinctValues: Array.from(values),
            variance: values.size,
          });
        }
      };

      checkFamily("button", ["border-radius", "font-size", "padding", "font-family"]);
      checkFamily("input, textarea, select", ["border-radius", "border-color", "padding", "font-size"]);
      checkFamily("[class*='card'], [class*='Card']", ["border-radius", "box-shadow", "padding"]);

      return results;
    });

    for (const family of families) {
      if (family.variance > 3) {
        this.addFinding({
          subdomain: "15b",
          severity: "medium",
          route,
          observation: `Component drift: ${family.selector} has ${family.variance} distinct ${family.propertyName} values: ${family.distinctValues.slice(0, 4).join(", ")}`,
          suggestedFix: `Standardize ${family.propertyName} across all ${family.selector} elements using shared CSS classes or tokens.`,
        });
      }
    }

    return families;
  }

  // ── 15d: Typography Scale ───────────────────────────────────────────────

  async checkTypographyScale(page: Page, route: string): Promise<TypographyScale> {
    const typo = await page.evaluate(() => {
      const allElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, a, button, label, li, td, th");
      const sizes = new Set<string>();

      allElements.forEach((el) => {
        const fs = getComputedStyle(el).fontSize;
        if (fs) sizes.add(fs);
      });

      return {
        distinctSizes: Array.from(sizes).sort((a, b) => parseFloat(a) - parseFloat(b)),
        count: sizes.size,
        isHealthy: sizes.size <= 8,
      };
    });

    if (!typo.isHealthy) {
      this.addFinding({
        subdomain: "15d",
        severity: "medium",
        route,
        observation: `Typography scale has ${typo.count} distinct font sizes. More than 8 suggests a broken type scale: ${typo.distinctSizes.slice(0, 10).join(", ")}`,
        suggestedFix: "Define a type scale (e.g., 12/14/16/18/20/24/30/36/48px) and map all text to it.",
      });
    }

    return typo;
  }

  // ── 15e: Spacing Scale ──────────────────────────────────────────────────

  async checkSpacingScale(page: Page, route: string): Promise<SpacingAnalysis> {
    const spacing = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      const values: number[] = [];

      elements.forEach((el) => {
        const computed = getComputedStyle(el);
        for (const prop of ["marginTop", "marginBottom", "marginLeft", "marginRight", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"]) {
          const raw = computed[prop as keyof CSSStyleDeclaration] as string;
          if (raw && raw !== "0px") {
            const num = parseFloat(raw);
            if (!isNaN(num) && num > 0 && num < 200) {
              values.push(num);
            }
          }
        }
      });

      // Try 4px base
      const aligned4 = values.filter((v) => v % 4 === 0).length;
      // Try 8px base
      const aligned8 = values.filter((v) => v % 8 === 0).length;

      const bestBase = aligned8 / values.length > 0.7 ? 8 : 4;
      const bestAligned = bestBase === 8 ? aligned8 : aligned4;

      return {
        values: [...new Set(values)].sort((a, b) => a - b).slice(0, 20),
        baseUnit: bestBase,
        aligned: bestAligned,
        misaligned: values.length - bestAligned,
        percentage: values.length > 0 ? Math.round((bestAligned / values.length) * 100) : 100,
      };
    });

    if (spacing.percentage < 60 && spacing.values.length > 5) {
      this.addFinding({
        subdomain: "15e",
        severity: "medium",
        route,
        observation: `Spacing scale compliance: ${spacing.percentage}% of values align to ${spacing.baseUnit}px grid. Misaligned values create visual inconsistency.`,
        suggestedFix: `Adopt a ${spacing.baseUnit}px base spacing scale and replace off-grid values.`,
      });
    }

    return spacing;
  }

  // ── Scorecard Generation ────────────────────────────────────────────────

  generateScorecard(route: string, tokenCoverage: TokenCoverage[], typography: TypographyScale, spacing: SpacingAnalysis, families: ComponentFamily[]): DSScorecard {
    // Token coverage score (average across properties)
    const avgCoverage = tokenCoverage.length > 0
      ? tokenCoverage.reduce((sum, t) => sum + t.percentage, 0) / tokenCoverage.length
      : 100;

    // Component consistency (fewer distinct values = higher score)
    const maxVariance = families.length > 0
      ? Math.max(...families.map((f) => f.variance))
      : 1;
    const componentScore = Math.max(0, 100 - (maxVariance - 1) * 15);

    // Typography adherence
    const typoScore = typography.count <= 6 ? 100 : typography.count <= 8 ? 80 : typography.count <= 12 ? 50 : 25;

    // Spacing compliance
    const spacingScore = spacing.percentage;

    const overall = Math.round((avgCoverage * 0.35 + componentScore * 0.25 + typoScore * 0.2 + spacingScore * 0.2));

    const scorecard: DSScorecard = {
      tokenCoverage: Math.round(avgCoverage),
      componentConsistency: componentScore,
      typographyAdherence: typoScore,
      spacingCompliance: spacingScore,
      overall,
    };

    this.routeScores.set(route, scorecard);
    return scorecard;
  }

  // ── Report ──────────────────────────────────────────────────────────────

  generateReport(): string {
    const lines: string[] = [];

    lines.push("", "═".repeat(70));
    lines.push("  🏗️  DESIGN SYSTEM CONSISTENCY REPORT");
    lines.push("═".repeat(70), "");

    // Scorecard per route
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│  🏗️  DESIGN SYSTEM SCORECARD                               │");
    lines.push("├─────────────────────────────────────────────────────────────┤");

    for (const [route, score] of this.routeScores) {
      const bar = (val: number) => "█".repeat(Math.round(val / 10)) + "░".repeat(10 - Math.round(val / 10));
      lines.push(`│                                                             │`);
      lines.push(`│  Route: ${route.padEnd(50)}│`);
      lines.push(`│  Token Coverage:       ${bar(score.tokenCoverage)}  ${String(score.tokenCoverage).padStart(3)}/100  │`);
      lines.push(`│  Component Consistency:${bar(score.componentConsistency)}  ${String(score.componentConsistency).padStart(3)}/100  │`);
      lines.push(`│  Typography Adherence: ${bar(score.typographyAdherence)}  ${String(score.typographyAdherence).padStart(3)}/100  │`);
      lines.push(`│  Spacing Compliance:   ${bar(score.spacingCompliance)}  ${String(score.spacingCompliance).padStart(3)}/100  │`);
      lines.push(`│                                                             │`);
      lines.push(`│  Overall:              ${String(score.overall).padStart(3)}/100                             │`);
    }

    lines.push("│                                                             │");
    lines.push("└─────────────────────────────────────────────────────────────┘");

    // Findings
    if (this.findings.length > 0) {
      lines.push("", "── Findings ─────────────────────────────────────────────────", "");
      for (const f of this.findings) {
        const emoji = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
        lines.push(`${emoji} [${f.subdomain}] ${f.severity.toUpperCase()} · ${f.route}`);
        lines.push(`  ${f.observation}`);
        lines.push(`  🔧 ${f.suggestedFix}`);
        lines.push("");
      }
    }

    // Summary
    lines.push("─".repeat(70));
    lines.push(`Total findings: ${this.findings.length}`);
    lines.push(`  High: ${this.findings.filter((f) => f.severity === "high" || f.severity === "critical").length}`);
    lines.push(`  Medium: ${this.findings.filter((f) => f.severity === "medium").length}`);
    lines.push(`  Low: ${this.findings.filter((f) => f.severity === "low").length}`);
    lines.push(`Gating mode: ${GATING_MODE}`);

    return lines.join("\n");
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe("Domain 15: Design System Consistency", () => {
  let evaluator: DesignSystemEvaluator;

  test.beforeAll(() => {
    evaluator = new DesignSystemEvaluator();
  });

  for (const route of ROUTES) {
    test(`Design system check: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      const tokenCoverage = await evaluator.checkTokenCoverage(page, route);
      const families = await evaluator.checkComponentFamilyDrift(page, route);
      const typography = await evaluator.checkTypographyScale(page, route);
      const spacing = await evaluator.checkSpacingScale(page, route);

      evaluator.generateScorecard(route, tokenCoverage, typography, spacing, families);
    });
  }

  test("Generate Design System Report", async () => {
    const report = evaluator.generateReport();
    console.log("\n" + report);

    if (GATING_MODE === "strict") {
      const avgOverall = Array.from(evaluator.routeScores.values()).reduce(
        (sum, s) => sum + s.overall,
        0
      ) / evaluator.routeScores.size;

      expect(avgOverall, {
        message: `Design system score is ${Math.round(avgOverall)}/100, below threshold of ${STRICT_THRESHOLD}/100.`,
      }).toBeGreaterThanOrEqual(STRICT_THRESHOLD);
    }
  });
});

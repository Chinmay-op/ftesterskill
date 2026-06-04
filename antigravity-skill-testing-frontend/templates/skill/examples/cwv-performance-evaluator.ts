/**
 * cwv-performance-evaluator.ts
 *
 * Playwright-based evaluator for Domain 5b: Core Web Vitals Diagnostics.
 * Injects PerformanceObserver via page.addInitScript() to measure:
 *   - LCP (Largest Contentful Paint) — with element identification
 *   - CLS (Cumulative Layout Shift) — with shifting element tracking
 *   - INP (Interaction to Next Paint) — with interaction tracking
 *   - TTFB (Time to First Byte) — baseline server speed
 *
 * Concepts borrowed from:
 *   - Google web-vitals library (PerformanceObserver patterns)
 *   - Checkly performance testing guide (CDP throttling)
 *   - @sachin9210/ultimate-playwright-performance (threshold patterns)
 *
 * Usage:
 *   npx playwright test examples/cwv-performance-evaluator.ts
 *
 * Environment variables:
 *   PREVIEW_URL  — Base URL (default: http://localhost:4173)
 *   ROUTES       — Comma-separated routes (default: /)
 *   CWV_THROTTLE — "none" (default), "3g", or "slow4g"
 *   CWV_GATING   — "warn" (default) or "strict"
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ─── Configuration ──────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
const ROUTES = (process.env.ROUTES ?? "/").split(",").map((r) => r.trim());
const THROTTLE = process.env.CWV_THROTTLE ?? "none";
const GATING_MODE = process.env.CWV_GATING ?? "warn";

// Google's CWV thresholds
const THRESHOLDS = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  ttfb: { good: 800, needsImprovement: 1800 },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CWVMetrics {
  lcp: number;
  lcpElement: string;
  cls: number;
  clsShifters: string[];
  inp: number;
  inpEvent: string;
  ttfb: number;
}

interface CWVRouteResult {
  route: string;
  metrics: CWVMetrics;
  lcpGrade: "good" | "needs-improvement" | "poor";
  clsGrade: "good" | "needs-improvement" | "poor";
  inpGrade: "good" | "needs-improvement" | "poor";
  ttfbGrade: "good" | "needs-improvement" | "poor";
}

// ─── Init Script (injected before page load) ────────────────────────────────

const CWV_INIT_SCRIPT = `
  window.__cwv = {
    lcp: 0,
    lcpElement: '',
    cls: 0,
    clsShifters: [],
    inp: Infinity,
    inpEvent: '',
    ttfb: 0,
  };

  // LCP Observer
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          window.__cwv.lcp = entry.startTime;
          const el = entry.element;
          if (el) {
            window.__cwv.lcpElement = el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '');
          }
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch(e) {}

  // CLS Observer
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__cwv.cls += entry.value;
          if (entry.sources) {
            for (const source of entry.sources) {
              if (source.node) {
                const tag = source.node.tagName || 'unknown';
                const id = source.node.id ? '#' + source.node.id : '';
                const desc = tag + id;
                if (!window.__cwv.clsShifters.includes(desc)) {
                  window.__cwv.clsShifters.push(desc);
                }
              }
            }
          }
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch(e) {}

  // INP Observer (Interaction to Next Paint via event timing)
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        if (duration < window.__cwv.inp) {
          window.__cwv.inp = duration;
          window.__cwv.inpEvent = entry.name;
        }
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch(e) {}

  // TTFB (from Navigation Timing)
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          window.__cwv.ttfb = entry.responseStart - entry.requestStart;
        }
      }
    }).observe({ type: 'navigation', buffered: true });
  } catch(e) {}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function grade(value: number, thresholds: { good: number; needsImprovement: number }): "good" | "needs-improvement" | "poor" {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.needsImprovement) return "needs-improvement";
  return "poor";
}

function gradeEmoji(g: "good" | "needs-improvement" | "poor"): string {
  return g === "good" ? "🟢" : g === "needs-improvement" ? "🟡" : "🔴";
}

async function applyThrottling(context: BrowserContext, page: Page): Promise<void> {
  if (THROTTLE === "none") return;

  const client = await context.newCDPSession(page);

  const profiles: Record<string, { downloadThroughput: number; uploadThroughput: number; latency: number }> = {
    "3g": {
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 40,
    },
    slow4g: {
      downloadThroughput: (4 * 1024 * 1024) / 8,
      uploadThroughput: (3 * 1024 * 1024) / 8,
      latency: 20,
    },
  };

  const profile = profiles[THROTTLE];
  if (profile) {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      ...profile,
    });
  }
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

class CWVEvaluator {
  results: CWVRouteResult[] = [];

  async measure(page: Page, context: BrowserContext, route: string): Promise<CWVRouteResult> {
    // Inject CWV observers before navigation
    await page.addInitScript(CWV_INIT_SCRIPT);

    // Apply throttling if configured
    await applyThrottling(context, page);

    // Navigate
    await page.goto(`${PREVIEW_URL}${route}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for LCP to stabilize
    await page.waitForTimeout(2000);

    // Trigger a click interaction for INP measurement
    const firstButton = page.locator("button, a, [role='button']").first();
    if (await firstButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Extract metrics
    const metrics: CWVMetrics = await page.evaluate(() => {
      const cwv = (window as any).__cwv;
      return {
        lcp: Math.round(cwv.lcp || 0),
        lcpElement: cwv.lcpElement || "unknown",
        cls: Math.round((cwv.cls || 0) * 1000) / 1000,
        clsShifters: cwv.clsShifters || [],
        inp: cwv.inp === Infinity ? 0 : Math.round(cwv.inp || 0),
        inpEvent: cwv.inpEvent || "none",
        ttfb: Math.round(cwv.ttfb || 0),
      };
    });

    const result: CWVRouteResult = {
      route,
      metrics,
      lcpGrade: grade(metrics.lcp, THRESHOLDS.lcp),
      clsGrade: grade(metrics.cls, THRESHOLDS.cls),
      inpGrade: metrics.inp > 0 ? grade(metrics.inp, THRESHOLDS.inp) : "good",
      ttfbGrade: grade(metrics.ttfb, THRESHOLDS.ttfb),
    };

    this.results.push(result);
    return result;
  }

  generateReport(): string {
    const lines: string[] = [];

    lines.push("", "═".repeat(70));
    lines.push("  ⚡ CORE WEB VITALS REPORT");
    lines.push("═".repeat(70), "");

    // Summary card
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│  ⚡ CORE WEB VITALS SCORECARD                              │");
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push("│                                                             │");
    lines.push("│  Metric    │  Good     │ Needs Imp │ Poor     │ Threshold   │");
    lines.push("│  ──────────┼───────────┼───────────┼──────────┼──────────── │");
    lines.push("│  LCP       │ < 2.5s    │ 2.5-4.0s  │ > 4.0s   │ 2500ms      │");
    lines.push("│  INP       │ < 200ms   │ 200-500ms │ > 500ms  │ 200ms       │");
    lines.push("│  CLS       │ < 0.1     │ 0.1-0.25  │ > 0.25   │ 0.1         │");
    lines.push("│  TTFB      │ < 800ms   │ 800-1800  │ > 1800ms │ 800ms       │");
    lines.push("│                                                             │");
    lines.push("└─────────────────────────────────────────────────────────────┘");
    lines.push("");

    // Per-route results
    lines.push("── Per-Route Results ────────────────────────────────────────", "");

    for (const r of this.results) {
      lines.push(`  Route: ${r.route}`);
      lines.push(`    LCP:  ${r.metrics.lcp}ms ${gradeEmoji(r.lcpGrade)} ${r.lcpGrade} — element: ${r.metrics.lcpElement}`);
      lines.push(`    CLS:  ${r.metrics.cls} ${gradeEmoji(r.clsGrade)} ${r.clsGrade}${r.metrics.clsShifters.length > 0 ? " — shifters: " + r.metrics.clsShifters.join(", ") : ""}`);
      lines.push(`    INP:  ${r.metrics.inp}ms ${gradeEmoji(r.inpGrade)} ${r.inpGrade}${r.metrics.inpEvent !== "none" ? " — event: " + r.metrics.inpEvent : ""}`);
      lines.push(`    TTFB: ${r.metrics.ttfb}ms ${gradeEmoji(r.ttfbGrade)} ${r.ttfbGrade}`);
      lines.push("");
    }

    // Overall assessment
    const hasFailure = this.results.some(
      (r) => r.lcpGrade === "poor" || r.clsGrade === "poor" || r.inpGrade === "poor"
    );
    const hasWarning = this.results.some(
      (r) => r.lcpGrade === "needs-improvement" || r.clsGrade === "needs-improvement" || r.inpGrade === "needs-improvement"
    );

    lines.push("─".repeat(70));
    if (hasFailure) {
      lines.push("  🔴 POOR — One or more routes have poor Core Web Vitals.");
    } else if (hasWarning) {
      lines.push("  🟡 NEEDS IMPROVEMENT — Some routes are below Google's 'good' thresholds.");
    } else {
      lines.push("  🟢 GOOD — All routes pass Google's Core Web Vitals thresholds.");
    }

    lines.push(`  Network throttling: ${THROTTLE}`);
    lines.push(`  Gating mode: ${GATING_MODE}`);
    lines.push("");

    return lines.join("\n");
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe("Domain 5b: Core Web Vitals Diagnostics", () => {
  let evaluator: CWVEvaluator;

  test.beforeAll(() => {
    evaluator = new CWVEvaluator();
  });

  for (const route of ROUTES) {
    test(`Core Web Vitals: ${route}`, async ({ page, context }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const result = await evaluator.measure(page, context, route);

      // Log inline results
      console.log(`  CWV ${route}: LCP=${result.metrics.lcp}ms CLS=${result.metrics.cls} INP=${result.metrics.inp}ms TTFB=${result.metrics.ttfb}ms`);
    });
  }

  test("Generate CWV Report", async () => {
    const report = evaluator.generateReport();
    console.log("\n" + report);

    if (GATING_MODE === "strict") {
      for (const result of evaluator.results) {
        expect(result.lcpGrade, {
          message: `LCP on ${result.route} is ${result.metrics.lcp}ms (${result.lcpGrade})`,
        }).not.toBe("poor");

        expect(result.clsGrade, {
          message: `CLS on ${result.route} is ${result.metrics.cls} (${result.clsGrade})`,
        }).not.toBe("poor");
      }
    }
  });
});

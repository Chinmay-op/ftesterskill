/**
 * playwright-breakage-listener.ts
 *
 * Template for setting up pageerror + console listeners to capture
 * runtime errors and warnings during Playwright-driven interactions.
 * This is the core of Domain 9: Point of Breakage Detection.
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL and ROUTES
 *   3. Run: npx playwright test playwright-breakage-listener.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 */

import { test, expect, Page, ConsoleMessage } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

/** Routes to test — adapt to your app */
const ROUTES = ["/", "/login", "/dashboard", "/settings"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface CapturedError {
  type: "pageerror" | "console-error" | "console-warning";
  message: string;
  stack?: string;
  location?: string;
  triggeredBy?: string;
  timestamp: number;
}

interface DOMBreakage {
  type: "removed" | "zero-size" | "hidden" | "z-index";
  selector: string;
  description: string;
  timestamp: number;
}

// ─── Breakage Collector ──────────────────────────────────────────────────────

class BreakageCollector {
  errors: CapturedError[] = [];
  domBreakages: DOMBreakage[] = [];
  private currentAction = "initial load";
  private breakageCounter = 0;

  setCurrentAction(action: string): void {
    this.currentAction = action;
  }

  /**
   * Attach all error listeners to a Playwright page.
   * Call this BEFORE any navigation or interaction.
   */
  attachListeners(page: Page): void {
    // ── 9a. JS Runtime Error Capture ──
    page.on("pageerror", (error) => {
      this.errors.push({
        type: "pageerror",
        message: error.message,
        stack: error.stack,
        location: this.extractLocation(error.stack),
        triggeredBy: this.currentAction,
        timestamp: Date.now(),
      });
    });

    // ── 9b. Console Error & Warning Capture ──
    page.on("console", (msg: ConsoleMessage) => {
      const msgType = msg.type();
      if (msgType === "error" || msgType === "warning") {
        const text = msg.text();

        // Flag React-specific warnings
        const isReactWarning =
          text.includes("key") ||
          text.includes("Invalid hook call") ||
          text.includes("prop type") ||
          text.includes("controlled") ||
          text.includes("uncontrolled") ||
          text.includes("Cannot update a component") ||
          text.includes("findDOMNode");

        this.errors.push({
          type: msgType === "error" ? "console-error" : "console-warning",
          message: text + (isReactWarning ? " [REACT WARNING]" : ""),
          location: msg.location()
            ? `${msg.location().url}:${msg.location().lineNumber}`
            : undefined,
          triggeredBy: this.currentAction,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Inject MutationObserver to watch for DOM breakages.
   * Call after page navigation.
   */
  async injectDOMWatcher(page: Page): Promise<void> {
    await page.evaluate(() => {
      // @ts-ignore - Attach to window for later retrieval
      window.__DOM_BREAKAGES = window.__DOM_BREAKAGES || [];

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          // Watch for removed nodes
          for (const node of Array.from(mutation.removedNodes)) {
            if (node instanceof HTMLElement && node.id) {
              // @ts-ignore
              window.__DOM_BREAKAGES.push({
                type: "removed",
                selector: `#${node.id}`,
                description: `Element #${node.id} was removed from DOM`,
                timestamp: Date.now(),
              });
            }
          }

          // Watch for added nodes with zero dimensions
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              const rect = node.getBoundingClientRect();
              if (
                rect.width === 0 &&
                rect.height === 0 &&
                node.children.length > 0
              ) {
                const selector =
                  node.id ||
                  node.className ||
                  node.tagName.toLowerCase();
                // @ts-ignore
                window.__DOM_BREAKAGES.push({
                  type: "zero-size",
                  selector: String(selector),
                  description: `Element has zero dimensions but contains children`,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      // @ts-ignore
      window.__DOM_OBSERVER = observer;
    });
  }

  /**
   * Collect DOM breakages from the injected MutationObserver.
   */
  async collectDOMBreakages(page: Page): Promise<void> {
    const breakages = await page.evaluate(() => {
      // @ts-ignore
      return window.__DOM_BREAKAGES || [];
    });
    this.domBreakages.push(...breakages);
  }

  /**
   * Check for CSS breakages: z-index wars, hidden elements, overflow clipping.
   */
  async checkCSSBreakages(page: Page): Promise<void> {
    const cssIssues: DOMBreakage[] = await page.evaluate(() => {
      const issues: any[] = [];

      // Check for elements hidden behind others (z-index wars)
      const modals = document.querySelectorAll(
        "[role='dialog'], .modal, .drawer, .tooltip, .dropdown, .popover"
      );
      modals.forEach((modal) => {
        if (modal instanceof HTMLElement) {
          const style = getComputedStyle(modal);
          const rect = modal.getBoundingClientRect();

          // Check if modal is visible but clipped
          if (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            (rect.width === 0 || rect.height === 0)
          ) {
            issues.push({
              type: "z-index",
              selector:
                modal.id || modal.className || modal.tagName,
              description:
                "Modal/overlay is visible in DOM but has zero dimensions (likely clipped)",
              timestamp: Date.now(),
            });
          }
        }
      });

      // Check for overflow:hidden clipping interactive content
      const containers = document.querySelectorAll("*");
      containers.forEach((el) => {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el);
          if (
            style.overflow === "hidden" &&
            el.scrollHeight > el.clientHeight
          ) {
            const interactiveChildren = el.querySelectorAll(
              "button, a, input, select, textarea"
            );
            if (interactiveChildren.length > 0) {
              issues.push({
                type: "hidden",
                selector: el.id || el.className || el.tagName,
                description: `overflow:hidden clips ${interactiveChildren.length} interactive element(s)`,
                timestamp: Date.now(),
              });
            }
          }
        }
      });

      return issues;
    });

    this.domBreakages.push(...cssIssues);
  }

  /**
   * Get the next breakage screenshot name.
   */
  getBreakageScreenshotPath(): string {
    this.breakageCounter++;
    const id = String(this.breakageCounter).padStart(3, "0");
    return `${SCREENSHOT_DIR}/breakage-${id}.png`;
  }

  /**
   * Generate the Point of Breakage report.
   */
  generateReport(): string {
    const lines: string[] = [
      "═══════════════════════════════════════════════════════",
      "  POINT OF BREAKAGE REPORT",
      `  Generated: ${new Date().toISOString()}`,
      "═══════════════════════════════════════════════════════",
      "",
    ];

    if (this.errors.length === 0 && this.domBreakages.length === 0) {
      lines.push("  ✅ No breakages detected.");
      return lines.join("\n");
    }

    let pobId = 0;

    // ── JS Runtime Errors ──
    const pageErrors = this.errors.filter((e) => e.type === "pageerror");
    if (pageErrors.length > 0) {
      lines.push("## JS Runtime Errors", "");
      for (const err of pageErrors) {
        pobId++;
        lines.push(
          `- **BREAKAGE ID:** POB-${String(pobId).padStart(3, "0")}`,
          `- **DOMAIN:** JS Runtime`,
          `- **SEVERITY:** Critical`,
          `- **DESCRIPTION:** ${err.message}`,
          `- **TRIGGER:** ${err.triggeredBy}`,
          `- **LOCATION:** ${err.location || "Unknown"}`,
          `- **STACK:** ${err.stack?.split("\n").slice(0, 3).join(" → ") || "N/A"}`,
          ""
        );
      }
    }

    // ── Console Errors ──
    const consoleErrors = this.errors.filter(
      (e) => e.type === "console-error"
    );
    if (consoleErrors.length > 0) {
      lines.push("## Console Errors", "");
      for (const err of consoleErrors) {
        pobId++;
        lines.push(
          `- **BREAKAGE ID:** POB-${String(pobId).padStart(3, "0")}`,
          `- **DOMAIN:** Console Error`,
          `- **SEVERITY:** High`,
          `- **DESCRIPTION:** ${err.message}`,
          `- **TRIGGER:** ${err.triggeredBy}`,
          `- **LOCATION:** ${err.location || "Unknown"}`,
          ""
        );
      }
    }

    // ── Console Warnings ──
    const consoleWarnings = this.errors.filter(
      (e) => e.type === "console-warning"
    );
    if (consoleWarnings.length > 0) {
      lines.push("## Console Warnings", "");
      for (const err of consoleWarnings) {
        pobId++;
        const severity = err.message.includes("[REACT WARNING]")
          ? "Medium"
          : "Low";
        lines.push(
          `- **BREAKAGE ID:** POB-${String(pobId).padStart(3, "0")}`,
          `- **DOMAIN:** Console Warning`,
          `- **SEVERITY:** ${severity}`,
          `- **DESCRIPTION:** ${err.message}`,
          `- **TRIGGER:** ${err.triggeredBy}`,
          ""
        );
      }
    }

    // ── DOM Breakages ──
    if (this.domBreakages.length > 0) {
      lines.push("## DOM Breakages", "");
      for (const brk of this.domBreakages) {
        pobId++;
        lines.push(
          `- **BREAKAGE ID:** POB-${String(pobId).padStart(3, "0")}`,
          `- **DOMAIN:** DOM / CSS`,
          `- **SEVERITY:** Medium`,
          `- **DESCRIPTION:** ${brk.description}`,
          `- **ELEMENT:** ${brk.selector}`,
          `- **TYPE:** ${brk.type}`,
          ""
        );
      }
    }

    lines.push(
      "",
      `Total breakages: ${pobId}`,
      `  Critical: ${pageErrors.length}`,
      `  High: ${consoleErrors.length}`,
      `  Medium/Low: ${consoleWarnings.length + this.domBreakages.length}`
    );

    return lines.join("\n");
  }

  private extractLocation(stack?: string): string | undefined {
    if (!stack) return undefined;
    // Try to extract first meaningful source location from stack
    const lines = stack.split("\n");
    for (const line of lines) {
      const match = line.match(
        /(?:at\s+)?(?:.*?\s+\()?(.+?):(\d+):(\d+)\)?/
      );
      if (match && !match[1].includes("node_modules")) {
        return `${match[1]}:${match[2]}`;
      }
    }
    return undefined;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Point of Breakage Detection", () => {
  let collector: BreakageCollector;

  test.beforeEach(async () => {
    collector = new BreakageCollector();
  });

  for (const route of ROUTES) {
    test(`Breakage scan: ${route}`, async ({ page }) => {
      // Attach all listeners BEFORE navigation
      collector.attachListeners(page);

      // Navigate
      collector.setCurrentAction(`navigating to ${route}`);
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Inject DOM watcher
      await collector.injectDOMWatcher(page);

      // ── Interact with every clickable element ──
      const clickables = await page
        .locator("button, a, [role='button'], [onclick]")
        .all();

      for (let i = 0; i < clickables.length; i++) {
        const el = clickables[i];
        const text = (await el.textContent())?.trim() || `element-${i}`;
        const tagName = await el.evaluate((e) => e.tagName.toLowerCase());

        collector.setCurrentAction(
          `clicking "${text}" (${tagName}) on ${route}`
        );

        try {
          // Only click if visible and not a navigation link that would leave the page
          if (await el.isVisible()) {
            const href = await el.getAttribute("href");
            const isExternalLink =
              href && (href.startsWith("http") || href.startsWith("//"));

            if (!isExternalLink) {
              await el.click({ timeout: 3000 });
              await page.waitForTimeout(500);
            }
          }
        } catch {
          // Element may have been removed, that's a finding itself
        }
      }

      // ── Hover over interactive elements ──
      const hoverables = await page
        .locator("button, a, .card, [role='button']")
        .all();

      for (let i = 0; i < Math.min(hoverables.length, 20); i++) {
        const el = hoverables[i];
        collector.setCurrentAction(
          `hovering element ${i} on ${route}`
        );

        try {
          if (await el.isVisible()) {
            await el.hover({ timeout: 2000 });
            await page.waitForTimeout(200);
          }
        } catch {
          // Continue
        }
      }

      // ── Check CSS breakages ──
      collector.setCurrentAction(`CSS check on ${route}`);
      await collector.checkCSSBreakages(page);

      // ── Collect DOM breakages ──
      await collector.collectDOMBreakages(page);

      // ── Screenshot if any errors found ──
      if (
        collector.errors.length > 0 ||
        collector.domBreakages.length > 0
      ) {
        const screenshotPath = collector.getBreakageScreenshotPath();
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      // ── Generate report ──
      const report = collector.generateReport();
      console.log(report);

      // Fail if any critical errors (pageerror) were found
      const criticalErrors = collector.errors.filter(
        (e) => e.type === "pageerror"
      );

      expect(criticalErrors, {
        message: `Found ${criticalErrors.length} uncaught JS error(s) on ${route}. See breakage report above.`,
      }).toHaveLength(0);
    });
  }
});

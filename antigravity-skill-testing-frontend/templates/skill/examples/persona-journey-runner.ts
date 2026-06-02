/**
 * persona-journey-runner.ts
 *
 * Template for persona-driven user journey testing using Playwright.
 * Executes goal-based user journeys from the perspective of different
 * human personas, tracking friction, hesitation, confidence, and
 * abandonment risk at every step.
 *
 * Covers Domain 11: Persona-Driven User Journeys.
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL, PERSONAS, and JOURNEYS for your app
 *   3. Run: npx playwright test persona-journey-runner.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 */

import { test, expect, Page, Locator } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConfidenceLevel = "clear" | "uncertain" | "confusing" | "misleading";
type PatienceLevel = "very-low" | "low" | "medium" | "high";

interface Persona {
  /** Human-readable persona name */
  name: string;
  /** Device viewport dimensions */
  viewport: { width: number; height: number };
  /** Device label for screenshots */
  deviceLabel: string;
  /** How patient this persona is — affects abandonment threshold */
  patience: PatienceLevel;
  /** Domain knowledge level */
  knowledge: "none" | "low" | "moderate" | "high";
  /** Common mistakes this persona makes */
  likelyMistakes: string[];
  /** Description of the persona's context */
  context: string;
}

interface JourneyStep {
  /** Human-readable description of the action */
  description: string;
  /**
   * Action function — receives the page and returns a confidence annotation.
   * The function should perform ONE user action (click, fill, navigate, etc.)
   * and return how confident the persona would feel at this step.
   */
  action: (page: Page) => Promise<ConfidenceLevel>;
  /** If true, this step is expected to fail for this persona (e.g., error-prone user) */
  expectFailure?: boolean;
}

interface Journey {
  /** Goal described from the user's perspective */
  goal: string;
  /** Which persona runs this journey */
  personaName: string;
  /** Route to start the journey on */
  startRoute: string;
  /** Ordered steps the persona takes */
  steps: JourneyStep[];
}

interface StepResult {
  stepIndex: number;
  description: string;
  confidence: ConfidenceLevel;
  durationMs: number;
  screenshotPath?: string;
  isHesitation: boolean;
  isRecovery: boolean;
  isUnnecessary: boolean;
  error?: string;
}

interface JourneyResult {
  goal: string;
  persona: Persona;
  success: boolean;
  totalSteps: number;
  unnecessarySteps: number;
  hesitationPoints: number;
  recoveryPoints: number;
  frictionScore: number; // 0-10
  abandonmentRisk: "low" | "medium" | "high";
  stepResults: StepResult[];
  narrative: string;
}

// ─── Persona Definitions ─────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  {
    name: "First-time visitor",
    viewport: { width: 1440, height: 900 },
    deviceLabel: "desktop",
    patience: "medium",
    knowledge: "none",
    likelyMistakes: ["Skips onboarding", "Misreads CTAs"],
    context:
      "Has never seen this product before. Arrived from a Google search. Evaluating whether to sign up.",
  },
  {
    name: "Returning authenticated user",
    viewport: { width: 1440, height: 900 },
    deviceLabel: "desktop",
    patience: "low",
    knowledge: "high",
    likelyMistakes: ["Skips instructions", "Expects keyboard shortcuts"],
    context:
      "Uses the product daily. Knows the layout. Wants to get things done quickly.",
  },
  {
    name: "Impatient mobile user",
    viewport: { width: 375, height: 812 },
    deviceLabel: "mobile",
    patience: "very-low",
    knowledge: "moderate",
    likelyMistakes: ["Taps wrong targets", "Abandons on slow load"],
    context:
      "On a phone, probably commuting. Low bandwidth. Will abandon if anything takes more than 3 seconds.",
  },
  {
    name: "Keyboard-only user",
    viewport: { width: 1440, height: 900 },
    deviceLabel: "desktop",
    patience: "high",
    knowledge: "high",
    likelyMistakes: [],
    context:
      "Uses screen reader or keyboard-only navigation. Relies entirely on Tab, Enter, Escape, and ARIA labels.",
  },
  {
    name: "Error-prone user",
    viewport: { width: 1440, height: 900 },
    deviceLabel: "desktop",
    patience: "medium",
    knowledge: "low",
    likelyMistakes: [
      "Submits invalid data",
      "Clicks back mid-flow",
      "Double-clicks buttons",
    ],
    context:
      "Not tech-savvy. Types slowly. Often makes mistakes in forms and gets confused by error messages.",
  },
  {
    name: "Low-context user",
    viewport: { width: 1440, height: 900 },
    deviceLabel: "desktop",
    patience: "medium",
    knowledge: "none",
    likelyMistakes: ["Confused by domain jargon", "Misinterprets icons"],
    context:
      "Understands the web but not this product's domain. Internal terminology is foreign.",
  },
];

// ─── Journey Definitions ─────────────────────────────────────────────────────

/**
 * Define your journeys here. Each journey ties a user goal to a persona.
 * Adapt the steps to your application.
 */
const JOURNEYS: Journey[] = [
  // ── Example: First-time visitor tries to understand the product ──
  {
    goal: "Understand what the product does and find the sign-up page",
    personaName: "First-time visitor",
    startRoute: "/",
    steps: [
      {
        description: "Land on the homepage and look for a value proposition",
        action: async (page: Page): Promise<ConfidenceLevel> => {
          // Check for a visible heading or hero text
          const hero = page.locator("h1, [role='heading']").first();
          if (await hero.isVisible({ timeout: 3000 }).catch(() => false)) {
            const text = await hero.textContent();
            // A clear value prop is usually > 10 characters
            return text && text.length > 10 ? "clear" : "uncertain";
          }
          return "confusing";
        },
      },
      {
        description: "Find and click a 'Get Started' or 'Sign Up' CTA",
        action: async (page: Page): Promise<ConfidenceLevel> => {
          // Try semantic locators first (Selector Policy)
          const cta =
            page.getByRole("link", { name: /get started|sign up|register/i });
          if (await cta.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cta.click();
            return "clear";
          }
          // Fallback to button role
          const btn =
            page.getByRole("button", { name: /get started|sign up|register/i });
          if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click();
            return "clear";
          }
          // Last resort — any visible CTA-like element
          const fallback = page
            .locator("a, button")
            .filter({ hasText: /get started|sign up|register/i })
            .first();
          if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
            await fallback.click();
            return "uncertain"; // Had to search for it
          }
          return "confusing"; // Couldn't find a CTA at all
        },
      },
      {
        description: "Verify the sign-up page loaded with clear instructions",
        action: async (page: Page): Promise<ConfidenceLevel> => {
          await page.waitForTimeout(1000);
          const form = page.locator("form").first();
          if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Check if form has labels (not just placeholders)
            const labels = await page.locator("label").count();
            return labels > 0 ? "clear" : "uncertain";
          }
          return "confusing";
        },
      },
    ],
  },

  // ── Example: Error-prone user tries to submit a form ──
  {
    goal: "Submit the login form with mistakes and recover",
    personaName: "Error-prone user",
    startRoute: "/login",
    steps: [
      {
        description: "Try to submit the form completely empty",
        expectFailure: true,
        action: async (page: Page): Promise<ConfidenceLevel> => {
          const submit = page.getByRole("button", { name: /log ?in|sign ?in|submit/i });
          if (await submit.isVisible({ timeout: 3000 }).catch(() => false)) {
            await submit.click();
            await page.waitForTimeout(500);
            // Check if validation errors appeared
            const errors = page.locator(
              "[role='alert'], .error, .error-message, .validation-error"
            );
            const count = await errors.count();
            return count > 0 ? "clear" : "confusing";
          }
          return "confusing";
        },
      },
      {
        description: "Enter an invalid email and try again",
        expectFailure: true,
        action: async (page: Page): Promise<ConfidenceLevel> => {
          const email = page.getByLabel(/email/i);
          if (await email.isVisible({ timeout: 2000 }).catch(() => false)) {
            await email.fill("not-an-email");
          } else {
            // Fallback
            const input = page.locator("input[type='email'], input[name='email']").first();
            await input.fill("not-an-email");
          }
          const submit = page.getByRole("button", { name: /log ?in|sign ?in|submit/i });
          await submit.click();
          await page.waitForTimeout(500);

          const errors = page.locator(
            "[role='alert'], .error, .error-message, .field-error"
          );
          const count = await errors.count();
          // Clear = error message explains what's wrong
          // Uncertain = error appeared but vague
          return count > 0 ? "clear" : "misleading";
        },
      },
      {
        description: "Fix the email and enter valid credentials",
        action: async (page: Page): Promise<ConfidenceLevel> => {
          const email = page.getByLabel(/email/i);
          if (await email.isVisible({ timeout: 2000 }).catch(() => false)) {
            await email.fill("test@example.com");
          } else {
            const input = page.locator("input[type='email'], input[name='email']").first();
            await input.fill("test@example.com");
          }

          const password = page.getByLabel(/password/i);
          if (await password.isVisible({ timeout: 2000 }).catch(() => false)) {
            await password.fill("SecureP@ss1234");
          } else {
            const input = page.locator("input[type='password']").first();
            await input.fill("SecureP@ss1234");
          }

          const submit = page.getByRole("button", { name: /log ?in|sign ?in|submit/i });
          await submit.click();
          await page.waitForTimeout(1500);

          // Check if we navigated away or got a success message
          const url = page.url();
          if (!url.includes("/login")) return "clear"; // Navigated away
          const success = page.locator(".success, .welcome, [data-testid='dashboard']");
          if (await success.first().isVisible({ timeout: 1000 }).catch(() => false)) {
            return "clear";
          }
          return "uncertain";
        },
      },
    ],
  },

  // ── Add more journeys for your app here ──
];

// ─── Journey Runner ──────────────────────────────────────────────────────────

class JourneyRunner {
  private screenshotCounter = 0;

  /**
   * Execute a single journey and return structured results.
   */
  async run(page: Page, journey: Journey, persona: Persona): Promise<JourneyResult> {
    const stepResults: StepResult[] = [];
    let success = true;

    // Navigate to start
    await page.goto(`${PREVIEW_URL}${journey.startRoute}`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    for (let i = 0; i < journey.steps.length; i++) {
      const step = journey.steps[i];
      const start = Date.now();
      let confidence: ConfidenceLevel = "confusing";
      let error: string | undefined;
      let screenshotPath: string | undefined;

      try {
        confidence = await step.action(page);
      } catch (err: any) {
        error = err.message;
        confidence = "confusing";
        if (!step.expectFailure) {
          success = false;
        }
      }

      const durationMs = Date.now() - start;

      // Determine step characteristics
      const isHesitation = confidence === "uncertain" || confidence === "confusing";
      const isRecovery = step.expectFailure === true && confidence !== "confusing";
      const isUnnecessary = step.expectFailure === true;

      // Screenshot on hesitation, confusion, or failure
      if (isHesitation || error) {
        this.screenshotCounter++;
        const id = String(this.screenshotCounter).padStart(3, "0");
        screenshotPath = `${SCREENSHOT_DIR}/journey-${persona.name.replace(/\s+/g, "-").toLowerCase()}-step${i + 1}-${id}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      }

      stepResults.push({
        stepIndex: i,
        description: step.description,
        confidence,
        durationMs,
        screenshotPath,
        isHesitation,
        isRecovery,
        isUnnecessary,
        error,
      });
    }

    // Calculate scores
    const hesitationPoints = stepResults.filter((s) => s.isHesitation).length;
    const recoveryPoints = stepResults.filter((s) => s.isRecovery).length;
    const unnecessarySteps = stepResults.filter((s) => s.isUnnecessary).length;
    const frictionScore = this.calculateFriction(stepResults, persona);
    const abandonmentRisk = this.calculateAbandonment(frictionScore, persona);
    const narrative = this.generateNarrative(journey, persona, stepResults);

    return {
      goal: journey.goal,
      persona,
      success,
      totalSteps: stepResults.length,
      unnecessarySteps,
      hesitationPoints,
      recoveryPoints,
      frictionScore,
      abandonmentRisk,
      stepResults,
      narrative,
    };
  }

  /**
   * Calculate friction score (0-10) based on step results and persona patience.
   */
  private calculateFriction(steps: StepResult[], persona: Persona): number {
    let score = 0;

    for (const step of steps) {
      switch (step.confidence) {
        case "clear":
          score += 0;
          break;
        case "uncertain":
          score += 1.5;
          break;
        case "confusing":
          score += 3;
          break;
        case "misleading":
          score += 4;
          break;
      }
      if (step.error) score += 2;
    }

    // Normalize to 0-10
    const maxPossible = steps.length * 4;
    const normalized = Math.min(10, Math.round((score / maxPossible) * 10 * 10) / 10);

    // Impatient personas feel friction more
    if (persona.patience === "very-low") return Math.min(10, normalized * 1.5);
    if (persona.patience === "low") return Math.min(10, normalized * 1.2);

    return normalized;
  }

  /**
   * Calculate abandonment risk based on friction and patience.
   */
  private calculateAbandonment(
    friction: number,
    persona: Persona
  ): "low" | "medium" | "high" {
    const thresholds: Record<PatienceLevel, { medium: number; high: number }> = {
      "very-low": { medium: 2, high: 4 },
      low: { medium: 3, high: 5 },
      medium: { medium: 5, high: 7 },
      high: { medium: 7, high: 9 },
    };

    const t = thresholds[persona.patience];
    if (friction >= t.high) return "high";
    if (friction >= t.medium) return "medium";
    return "low";
  }

  /**
   * Generate a human-readable narrative replay of the journey.
   */
  private generateNarrative(
    journey: Journey,
    persona: Persona,
    steps: StepResult[]
  ): string {
    const lines: string[] = [
      `**Journey:** ${journey.goal}`,
      `**Persona:** ${persona.name} (${persona.context})`,
      `**Device:** ${persona.deviceLabel} (${persona.viewport.width}×${persona.viewport.height})`,
      "",
    ];

    const confidenceEmoji: Record<ConfidenceLevel, string> = {
      clear: "✅",
      uncertain: "⚠️",
      confusing: "❌",
      misleading: "🚫",
    };

    for (const step of steps) {
      const emoji = confidenceEmoji[step.confidence];
      lines.push(
        `**Step ${step.stepIndex + 1}** ${emoji} — ${step.description}`
      );

      // Write a human sentence about what happened
      switch (step.confidence) {
        case "clear":
          lines.push(
            `> The ${persona.name.toLowerCase()} found this step straightforward. No hesitation.`
          );
          break;
        case "uncertain":
          lines.push(
            `> The ${persona.name.toLowerCase()} paused here — the next action wasn't immediately obvious. They figured it out after a moment.`
          );
          break;
        case "confusing":
          lines.push(
            `> The ${persona.name.toLowerCase()} was confused. They couldn't find what they needed or the UI didn't communicate clearly what to do next.`
          );
          break;
        case "misleading":
          lines.push(
            `> The ${persona.name.toLowerCase()} was misled — the UI suggested one outcome but delivered another. This erodes trust.`
          );
          break;
      }

      if (step.error) {
        lines.push(`> ⚠️ Error encountered: ${step.error}`);
      }

      if (step.screenshotPath) {
        lines.push(`> 📸 Screenshot: ${step.screenshotPath}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Domain 11: Persona-Driven User Journeys", () => {
  const runner = new JourneyRunner();

  for (const journey of JOURNEYS) {
    const persona = PERSONAS.find((p) => p.name === journey.personaName);
    if (!persona) {
      console.warn(`⚠️ Persona "${journey.personaName}" not found. Skipping journey.`);
      continue;
    }

    test(`${persona.name}: ${journey.goal}`, async ({ browser }) => {
      // Create context with the persona's viewport
      const context = await browser.newContext({
        viewport: persona.viewport,
      });
      const page = await context.newPage();

      const result = await runner.run(page, journey, persona);

      // Print the narrative
      console.log("\n" + "═".repeat(60));
      console.log(`  JOURNEY RESULT: ${journey.goal}`);
      console.log("═".repeat(60));
      console.log(`  Persona:          ${persona.name}`);
      console.log(`  Success:          ${result.success ? "✅ Yes" : "❌ No"}`);
      console.log(`  Total steps:      ${result.totalSteps}`);
      console.log(`  Unnecessary:      ${result.unnecessarySteps}`);
      console.log(`  Hesitations:      ${result.hesitationPoints}`);
      console.log(`  Recovery points:  ${result.recoveryPoints}`);
      console.log(`  Friction score:   ${result.frictionScore}/10`);
      console.log(`  Abandonment risk: ${result.abandonmentRisk}`);
      console.log("─".repeat(60));
      console.log("\n" + result.narrative);

      await context.close();

      // Assert: journey should succeed (unless it's an intentional failure test)
      // Adapt this assertion to your needs
      if (journey.steps.every((s) => !s.expectFailure)) {
        expect(result.success, {
          message: `Journey failed for ${persona.name}: "${journey.goal}". Friction: ${result.frictionScore}/10, Abandonment: ${result.abandonmentRisk}`,
        }).toBe(true);
      }
    });
  }
});

// ─── Keyboard-Only Journey Rerun (Domain 11e) ────────────────────────────────

test.describe("Domain 11e: Keyboard-Only Journey Rerun", () => {
  test("Navigate primary flow using only keyboard", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    const focusOrder: string[] = [];
    let tabCount = 0;
    const MAX_TABS = 50;

    // Tab through the entire page and record focus order
    while (tabCount < MAX_TABS) {
      await page.keyboard.press("Tab");
      tabCount++;

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role") || "";
        const label =
          el.getAttribute("aria-label") ||
          el.getAttribute("name") ||
          el.textContent?.trim().slice(0, 30) ||
          "";
        return `${tag}${role ? `[role=${role}]` : ""}: "${label}"`;
      });

      if (focused) {
        focusOrder.push(focused);
      }

      // Check if we've looped back to the beginning
      if (tabCount > 5 && focused === focusOrder[0]) {
        break;
      }
    }

    console.log("\n── Keyboard Focus Order ──");
    focusOrder.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el}`);
    });
    console.log(`  Total Tab stops: ${focusOrder.length}`);

    const screenshotPath = `${SCREENSHOT_DIR}/keyboard-focus-order.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // At least some elements should be focusable
    expect(focusOrder.length, {
      message: "No focusable elements found — keyboard navigation is broken",
    }).toBeGreaterThan(0);
  });
});

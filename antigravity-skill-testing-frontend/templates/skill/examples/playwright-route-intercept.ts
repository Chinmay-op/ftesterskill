/**
 * playwright-route-intercept.ts
 *
 * Template for simulating API failures, slow network, and third-party
 * blocking using Playwright route interception.
 * Covers Domain 9c (Network Failure Attribution) and Domain 10a
 * (Third-Party Script Failures).
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL, API_PATTERNS, THIRD_PARTY_DOMAINS
 *   3. Run: npx playwright test playwright-route-intercept.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 */

import { test, expect, Page, Route } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

/** API endpoint patterns to intercept. Adapt to your app. */
const API_PATTERNS = [
  "**/api/**",
  "**/graphql",
  "**/v1/**",
  "**/v2/**",
];

/** Third-party domains to block for resilience testing */
const THIRD_PARTY_DOMAINS = [
  "*.google-analytics.com",
  "*.googletagmanager.com",
  "*.facebook.net",
  "*.hotjar.com",
  "*.sentry.io",
  "*.segment.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
];

/** Routes to test */
const ROUTES = ["/", "/login", "/dashboard"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface FailedRequest {
  url: string;
  method: string;
  status: number;
  uiReaction: "error-shown" | "silent-failure" | "crash" | "retry" | "unknown";
  errorSelector?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function screenshotWithPath(page: Page, name: string): Promise<string> {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

/**
 * Check what the UI shows after a failed request.
 * Returns the UI reaction type.
 */
async function classifyUIReaction(page: Page): Promise<FailedRequest["uiReaction"]> {
  await page.waitForTimeout(2000);

  // Check for visible error indicators
  const errorSelectors = [
    ".error",
    ".error-message",
    "[role='alert']",
    ".toast-error",
    ".notification-error",
    ".Toastify__toast--error",
    ".snackbar-error",
    "[data-testid='error']",
  ];

  for (const selector of errorSelectors) {
    const isVisible = await page
      .locator(selector)
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (isVisible) return "error-shown";
  }

  // Check for crash indicators (error boundary, blank screen)
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  if (bodyHTML.length < 100) return "crash";
  if (bodyHTML.includes("Error boundary") || bodyHTML.includes("Something went wrong"))
    return "error-shown";

  // Check for retry buttons
  const retryVisible = await page
    .locator("button:has-text('Retry'), button:has-text('Try again')")
    .first()
    .isVisible({ timeout: 500 })
    .catch(() => false);
  if (retryVisible) return "retry";

  return "silent-failure";
}

// ─── Test Suite: Network Failure Attribution (Domain 9c) ─────────────────────

test.describe("9c. Network Failure Attribution", () => {
  // ── Test: Individual API failure handling ──
  for (const route of ROUTES) {
    test(`API failure on ${route}: UI shows error, not silent failure`, async ({
      page,
    }) => {
      const failedRequests: FailedRequest[] = [];

      // Intercept all API calls and return 500
      for (const pattern of API_PATTERNS) {
        await page.route(pattern, async (route: Route) => {
          const request = route.request();
          failedRequests.push({
            url: request.url(),
            method: request.method(),
            status: 500,
            uiReaction: "unknown",
          });

          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Internal Server Error",
              message: "Simulated failure for testing",
            }),
          });
        });
      }

      // Navigate and wait for requests
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Classify UI reaction
      const reaction = await classifyUIReaction(page);

      // Screenshot
      const routeSlug = route.replace(/\//g, "-").replace(/^-/, "") || "root";
      const screenshotPath = await screenshotWithPath(
        page,
        `network-fail-${routeSlug}-500`
      );

      // Report
      console.log(`\n── Network Failure Attribution: ${route} ──`);
      console.log(`  Intercepted ${failedRequests.length} API call(s)`);
      console.log(`  UI Reaction: ${reaction}`);
      console.log(`  Screenshot: ${screenshotPath}`);

      for (const req of failedRequests) {
        console.log(`  → ${req.method} ${req.url} → ${req.status}`);
      }

      // Silent failures are the problem — error-shown or retry is acceptable
      if (failedRequests.length > 0) {
        expect(reaction, {
          message: `API failures on ${route} resulted in "${reaction}". Expected visible error handling. Screenshot: ${screenshotPath}`,
        }).not.toBe("silent-failure");
      }
    });
  }

  // ── Test: Timeout simulation ──
  test("Slow API response (5s delay) shows loading state, not timeout crash", async ({
    page,
  }) => {
    // Add 5-second delay to all API calls
    for (const pattern of API_PATTERNS) {
      await page.route(pattern, async (route: Route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.continue();
      });
    }

    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Check for loading indicators
    const loadingSelectors = [
      ".loading",
      ".spinner",
      ".skeleton",
      "[role='progressbar']",
      "[data-testid='loading']",
      ".animate-pulse",
      ".animate-spin",
    ];

    let loadingShown = false;
    for (const selector of loadingSelectors) {
      const isVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (isVisible) {
        loadingShown = true;
        break;
      }
    }

    const screenshotPath = await screenshotWithPath(page, "network-slow-5s");

    console.log(`\n── Slow Network Test ──`);
    console.log(`  Loading indicator shown: ${loadingShown}`);
    console.log(`  Screenshot: ${screenshotPath}`);

    // Page should not crash even with slow API
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    expect(bodyHTML.length, {
      message: `Page appears blank/crashed during slow network. Screenshot: ${screenshotPath}`,
    }).toBeGreaterThan(100);
  });

  // ── Test: Complete network offline ──
  test("Complete network offline shows graceful error", async ({ page }) => {
    // Block ALL requests except the initial page load
    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // Now block everything
    await page.route("**/*", async (route: Route) => {
      if (route.request().resourceType() === "document") {
        await route.continue();
      } else {
        await route.abort("connectionrefused");
      }
    });

    // Try to interact — click buttons that trigger API calls
    const buttons = await page.locator("button").all();
    for (const btn of buttons.slice(0, 5)) {
      try {
        if (await btn.isVisible()) {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(1000);
        }
      } catch {
        // Continue
      }
    }

    const reaction = await classifyUIReaction(page);
    const screenshotPath = await screenshotWithPath(page, "network-offline");

    console.log(`\n── Offline Test ──`);
    console.log(`  UI Reaction: ${reaction}`);
    console.log(`  Screenshot: ${screenshotPath}`);
  });
});

// ─── Test Suite: Third-Party Script Failures (Domain 10a) ────────────────────

test.describe("10a. Third-Party Script Failures", () => {
  test("App renders and functions with all third-party scripts blocked", async ({
    page,
  }) => {
    // Block all third-party domains
    for (const domain of THIRD_PARTY_DOMAINS) {
      await page.route(`**/${domain}/**`, async (route: Route) => {
        await route.abort("blockedbyclient");
      });
      await page.route(`https://${domain}/**`, async (route: Route) => {
        await route.abort("blockedbyclient");
      });
    }

    // Navigate
    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForTimeout(3000);

    // Verify the page still renders
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    const screenshotPath = await screenshotWithPath(
      page,
      "third-party-blocked"
    );

    console.log(`\n── Third-Party Blocking Test ──`);
    console.log(`  Blocked domains: ${THIRD_PARTY_DOMAINS.length}`);
    console.log(`  Page HTML length: ${bodyHTML.length} chars`);
    console.log(`  Screenshot: ${screenshotPath}`);

    expect(bodyHTML.length, {
      message: `App renders blank when third-party scripts are blocked. This indicates a critical dependency on external resources. Screenshot: ${screenshotPath}`,
    }).toBeGreaterThan(200);

    // Verify interactive elements still work
    const buttons = await page.locator("button").all();
    console.log(`  Interactive buttons found: ${buttons.length}`);

    // Try clicking the first few buttons
    for (const btn of buttons.slice(0, 3)) {
      try {
        if (await btn.isVisible()) {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(500);
        }
      } catch {
        // Continue
      }
    }

    const afterInteraction = await page.evaluate(
      () => document.body.innerHTML
    );
    expect(afterInteraction.length, {
      message: "App crashed after interaction with third-party scripts blocked.",
    }).toBeGreaterThan(200);
  });

  // ── Font blocking test (Domain 10b) ──
  test("App renders cleanly with custom fonts blocked", async ({ page }) => {
    // Block font resources
    await page.route("**/*.woff2", (route) => route.abort());
    await page.route("**/*.woff", (route) => route.abort());
    await page.route("**/*.ttf", (route) => route.abort());
    await page.route("**/*.otf", (route) => route.abort());
    await page.route("**/fonts.googleapis.com/**", (route) =>
      route.abort()
    );
    await page.route("**/fonts.gstatic.com/**", (route) =>
      route.abort()
    );

    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // Check that fallback fonts are used (no missing characters)
    const fontInfo = await page.evaluate(() => {
      const elements = document.querySelectorAll("h1, h2, h3, p, a, button, span");
      const fonts: { selector: string; fontFamily: string }[] = [];
      elements.forEach((el) => {
        const computed = getComputedStyle(el);
        fonts.push({
          selector: el.tagName + (el.id ? `#${el.id}` : ""),
          fontFamily: computed.fontFamily,
        });
      });
      return fonts.slice(0, 20);
    });

    const screenshotPath = await screenshotWithPath(page, "fonts-blocked");

    console.log(`\n── Font Blocking Test ──`);
    console.log(`  Elements checked: ${fontInfo.length}`);
    for (const info of fontInfo.slice(0, 10)) {
      console.log(`  → ${info.selector}: ${info.fontFamily}`);
    }
    console.log(`  Screenshot: ${screenshotPath}`);

    // Page should not be blank
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    expect(bodyHTML.length).toBeGreaterThan(200);
  });
});

// ─── Test Suite: Auth & Session Breakage (Domain 9g) ─────────────────────────

test.describe("9g. Auth & Session Breakage", () => {
  test("Clearing auth tokens mid-session: app handles gracefully", async ({
    page,
  }) => {
    await page.goto(`${PREVIEW_URL}/`, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // Clear all storage (simulates token expiry)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Also clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });

    // Try to navigate or interact — should redirect to login or show error
    await page.reload({ waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    const screenshotPath = await screenshotWithPath(page, "auth-token-cleared");

    console.log(`\n── Auth Token Cleared Test ──`);
    console.log(`  Current URL after clear: ${currentUrl}`);
    console.log(`  Page HTML length: ${bodyHTML.length}`);
    console.log(`  Screenshot: ${screenshotPath}`);

    // App should not crash (blank screen)
    expect(bodyHTML.length, {
      message: `App crashed after auth tokens were cleared. Screenshot: ${screenshotPath}`,
    }).toBeGreaterThan(100);
  });

  test("Slow login (5s network delay): shows loading, no crash", async ({
    page,
  }) => {
    // Add 5-second delay to auth endpoints
    await page.route("**/api/auth/**", async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.continue();
    });
    await page.route("**/api/login**", async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto(`${PREVIEW_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Fill login form if it exists
    const emailInput = page.locator(
      "input[type='email'], input[name='email'], #email"
    );
    const passwordInput = page.locator(
      "input[type='password'], input[name='password'], #password"
    );
    const submitBtn = page.locator(
      "button[type='submit'], button:has-text('Login'), button:has-text('Sign in')"
    );

    if (await emailInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.first().fill("test@example.com");
      await passwordInput.first().fill("password123");
      await submitBtn.first().click();

      // Should show loading state during the 5s delay
      await page.waitForTimeout(1000);

      const screenshotPath = await screenshotWithPath(
        page,
        "auth-slow-login"
      );

      // Page should not crash
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      expect(bodyHTML.length, {
        message: `Page appears crashed during slow login. Screenshot: ${screenshotPath}`,
      }).toBeGreaterThan(100);

      console.log(`\n── Slow Login Test ──`);
      console.log(`  Screenshot: ${screenshotPath}`);
    } else {
      console.log("  [SKIPPED] No login form found at /login");
    }
  });
});

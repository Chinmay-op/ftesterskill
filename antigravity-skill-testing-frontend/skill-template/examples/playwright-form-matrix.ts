/**
 * playwright-form-matrix.ts
 *
 * Template for the 4-case form test matrix using Playwright.
 * Tests every form in the app with: empty submit, invalid input,
 * valid input, and simulated server error.
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL, FORM_CONFIGS, and SCREENSHOT_DIR
 *   3. Run: npx playwright test playwright-form-matrix.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 */

import { test, expect, Page, Route } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

/**
 * Define each form in the app to test.
 * Adapt selectors, field names, and API endpoints to your project.
 */
interface FormConfig {
  /** Human-readable name for reporting */
  name: string;
  /** URL path where the form lives */
  route: string;
  /** CSS selector for the form element */
  formSelector: string;
  /** CSS selector for the submit button */
  submitSelector: string;
  /** Fields to fill for each test case */
  fields: {
    /** CSS selector for the input */
    selector: string;
    /** Value for invalid input case */
    invalidValue: string;
    /** Value for valid input case */
    validValue: string;
  }[];
  /** API endpoint the form submits to (for route interception) */
  apiEndpoint: string;
  /** CSS selector for validation error messages */
  errorSelector: string;
  /** CSS selector for success state indicator */
  successSelector: string;
}

const FORM_CONFIGS: FormConfig[] = [
  // ── Example: Login Form ──
  {
    name: "login",
    route: "/login",
    formSelector: "form#login-form, form[data-testid='login-form'], form",
    submitSelector:
      "button[type='submit'], button:has-text('Login'), button:has-text('Sign in')",
    fields: [
      {
        selector: "input[name='email'], input[type='email'], #email",
        invalidValue: "not-an-email",
        validValue: "test@example.com",
      },
      {
        selector: "input[name='password'], input[type='password'], #password",
        invalidValue: "123",
        validValue: "SecureP@ss1234",
      },
    ],
    apiEndpoint: "**/api/auth/login",
    errorSelector:
      ".error, .error-message, [role='alert'], .field-error, .validation-error",
    successSelector:
      ".success, .welcome, [data-testid='dashboard'], .dashboard",
  },
  // ── Add more forms here ──
  // { name: "register", route: "/register", ... },
  // { name: "contact",  route: "/contact",  ... },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function screenshotWithPath(
  page: Page,
  name: string
): Promise<string> {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function clearForm(page: Page, config: FormConfig): Promise<void> {
  for (const field of config.fields) {
    const input = page.locator(field.selector).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("");
    }
  }
}

async function fillForm(
  page: Page,
  config: FormConfig,
  values: "invalid" | "valid"
): Promise<void> {
  for (const field of config.fields) {
    const input = page.locator(field.selector).first();
    const value =
      values === "invalid" ? field.invalidValue : field.validValue;
    await input.fill(value);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

for (const config of FORM_CONFIGS) {
  test.describe(`Form Matrix: ${config.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${PREVIEW_URL}${config.route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
    });

    // ── Case 1: Empty Submit ────────────────────────────────────────────
    test("Case 1: Submit with all fields empty → validation errors appear", async ({
      page,
    }) => {
      // Ensure fields are empty
      await clearForm(page, config);

      // Click submit
      const submitBtn = page.locator(config.submitSelector).first();
      await submitBtn.click();

      // Wait a moment for validation to trigger
      await page.waitForTimeout(500);

      // Check for validation errors
      const errors = page.locator(config.errorSelector);
      const errorCount = await errors.count();

      // Screenshot the result
      const screenshotPath = await screenshotWithPath(
        page,
        `${config.name}-case1-empty-submit`
      );

      // At least one validation error should be visible
      expect(errorCount, {
        message: `Expected validation errors on empty submit for ${config.name}. Screenshot: ${screenshotPath}`,
      }).toBeGreaterThan(0);
    });

    // ── Case 2: Invalid Input ───────────────────────────────────────────
    test("Case 2: Submit with invalid input → field-level errors", async ({
      page,
    }) => {
      // Fill with invalid values
      await fillForm(page, config, "invalid");

      // Click submit
      const submitBtn = page.locator(config.submitSelector).first();
      await submitBtn.click();

      await page.waitForTimeout(500);

      // Check for field-level errors
      const errors = page.locator(config.errorSelector);
      const errorCount = await errors.count();

      const screenshotPath = await screenshotWithPath(
        page,
        `${config.name}-case2-invalid-input`
      );

      expect(errorCount, {
        message: `Expected field-level errors on invalid input for ${config.name}. Screenshot: ${screenshotPath}`,
      }).toBeGreaterThan(0);
    });

    // ── Case 3: Valid Input ─────────────────────────────────────────────
    test("Case 3: Submit with valid input → success state", async ({
      page,
    }) => {
      // Fill with valid values
      await fillForm(page, config, "valid");

      // Click submit
      const submitBtn = page.locator(config.submitSelector).first();
      await submitBtn.click();

      // Wait for either success state or navigation
      await Promise.race([
        page
          .locator(config.successSelector)
          .first()
          .waitFor({ timeout: 10000 })
          .catch(() => null),
        page.waitForURL(/.*/, { timeout: 10000 }).catch(() => null),
      ]);

      await page.waitForTimeout(500);

      const screenshotPath = await screenshotWithPath(
        page,
        `${config.name}-case3-valid-submit`
      );

      // Either the success indicator is visible OR the URL has changed
      const successVisible = await page
        .locator(config.successSelector)
        .first()
        .isVisible()
        .catch(() => false);
      const urlChanged = !page.url().includes(config.route);

      expect(successVisible || urlChanged, {
        message: `Expected success state or navigation after valid submit for ${config.name}. Screenshot: ${screenshotPath}`,
      }).toBe(true);
    });

    // ── Case 4: Server Error (route intercept) ──────────────────────────
    test("Case 4: Simulated server error → user-visible error message", async ({
      page,
    }) => {
      // Intercept the API endpoint and force a 500 error
      await page.route(config.apiEndpoint, async (route: Route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Simulated server failure for testing",
          }),
        });
      });

      // Fill with valid values (we want the form to actually submit)
      await fillForm(page, config, "valid");

      // Click submit
      const submitBtn = page.locator(config.submitSelector).first();
      await submitBtn.click();

      // Wait for error state to appear
      await page.waitForTimeout(2000);

      const screenshotPath = await screenshotWithPath(
        page,
        `${config.name}-case4-server-error`
      );

      // Check that some error message is visible to the user
      const errorVisible = await page
        .locator(config.errorSelector)
        .first()
        .isVisible()
        .catch(() => false);

      // Also check for any toast/snackbar/alert
      const toastVisible = await page
        .locator(
          ".toast, .snackbar, [role='alert'], .notification, .Toastify"
        )
        .first()
        .isVisible()
        .catch(() => false);

      expect(errorVisible || toastVisible, {
        message: `Server error must show a user-visible message, not fail silently for ${config.name}. Screenshot: ${screenshotPath}`,
      }).toBe(true);
    });
  });
}

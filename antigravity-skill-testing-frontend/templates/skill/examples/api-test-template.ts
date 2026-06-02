/**
 * api-test-template.ts
 *
 * Reusable fetch-based endpoint test template.
 * Designed for use with Vitest or Jest. Adapt the base URL and auth
 * token to your project.
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update BASE_URL and getAuthToken()
 *   3. Add your endpoint tests using the helpers
 *
 * Run:
 *   npx vitest run api-test-template.ts
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

/** Replace with your actual auth token retrieval logic */
function getAuthToken(): string {
  return process.env.TEST_AUTH_TOKEN || "test-bearer-token";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TestRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  auth?: boolean;
  expectedStatus?: number;
}

interface TestResponse {
  status: number;
  headers: Headers;
  body: unknown;
  ok: boolean;
  latencyMs: number;
}

/**
 * Makes an API request and returns a structured response for assertions.
 */
async function apiRequest(options: TestRequestOptions): Promise<TestResponse> {
  const {
    method = "GET",
    path,
    body,
    headers = {},
    auth = true,
    expectedStatus,
  } = options;

  const url = `${BASE_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    requestHeaders["Authorization"] = `Bearer ${getAuthToken()}`;
  }

  const start = performance.now();

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const latencyMs = Math.round(performance.now() - start);

  let responseBody: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  const result: TestResponse = {
    status: response.status,
    headers: response.headers,
    body: responseBody,
    ok: response.ok,
    latencyMs,
  };

  // Optional: auto-assert status if provided
  if (expectedStatus !== undefined && response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status} for ${method} ${path}\n` +
        `Response: ${JSON.stringify(responseBody, null, 2)}`
    );
  }

  return result;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest"; // Swap to Jest if needed

describe("API Endpoint Tests", () => {
  // ── Health / Smoke ──────────────────────────────────────────────────────

  it("GET /health returns 200", async () => {
    const res = await apiRequest({
      path: "/health",
      auth: false,
      expectedStatus: 200,
    });
    expect(res.ok).toBe(true);
  });

  // ── Auth Protection ─────────────────────────────────────────────────────

  it("protected route returns 401 without auth token", async () => {
    const res = await apiRequest({
      path: "/users/me",
      auth: false,
    });
    expect(res.status).toBe(401);
  });

  it("protected route returns 200 with valid auth token", async () => {
    const res = await apiRequest({
      path: "/users/me",
      auth: true,
      expectedStatus: 200,
    });
    expect(res.body).toHaveProperty("id");
  });

  // ── Content-Type Headers ────────────────────────────────────────────────

  it("JSON endpoints return application/json content type", async () => {
    const res = await apiRequest({ path: "/users/me" });
    const contentType = res.headers.get("content-type") || "";
    expect(contentType).toContain("application/json");
  });

  // ── CORS Headers ────────────────────────────────────────────────────────

  it("sensitive routes do not allow wildcard CORS origin", async () => {
    const res = await apiRequest({
      method: "OPTIONS",
      path: "/auth/login",
      auth: false,
      headers: {
        Origin: "https://evil.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    expect(allowOrigin).not.toBe("*");
  });

  // ── 404 Handling ────────────────────────────────────────────────────────

  it("unknown routes return 404 with JSON body", async () => {
    const res = await apiRequest({
      path: "/this-route-does-not-exist-" + Date.now(),
      auth: false,
    });
    expect(res.status).toBe(404);
  });

  // ── POST Validation ────────────────────────────────────────────────────

  it("POST with invalid body returns 400 or 422", async () => {
    const res = await apiRequest({
      method: "POST",
      path: "/users",
      body: { email: "not-an-email" }, // intentionally invalid
    });
    expect([400, 422]).toContain(res.status);
  });

  // ── Response Latency ───────────────────────────────────────────────────

  it("API responses complete within 2 seconds", async () => {
    const res = await apiRequest({ path: "/health", auth: false });
    expect(res.latencyMs).toBeLessThan(2000);
  });

  // ── No Stack Traces in Error Responses ─────────────────────────────────

  it("error responses do not leak stack traces", async () => {
    const res = await apiRequest({
      path: "/this-route-does-not-exist",
      auth: false,
    });
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain("at Object.");
    expect(bodyStr).not.toContain("node_modules");
    expect(bodyStr).not.toContain("Error:");
  });
});

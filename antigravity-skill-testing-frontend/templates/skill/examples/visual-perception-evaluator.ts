/**
 * visual-perception-evaluator.ts
 *
 * Automated visual perception, brand-fit, and aesthetic consistency
 * analysis using Playwright. Covers Domain 14 of the frontend testing skill.
 *
 * This evaluator sees the interface the way a human designer would —
 * judging brand cohesion, visual hierarchy, spacing rhythm, color
 * discipline, and craftsmanship. Findings are written in human
 * observational language, not machine-speak.
 *
 * Usage:
 *   1. Copy this file into your test directory
 *   2. Update PREVIEW_URL and ROUTES
 *   3. Run: npx playwright test visual-perception-evaluator.ts
 *
 * Prerequisites:
 *   - npm run build && npm run preview (server on :4173)
 *   - npx playwright install chromium
 *
 * Configuration:
 *   Environment variables control behavior:
 *   - VP_GATING:    "off" | "warn" | "strict"  (default: "warn")
 *   - VP_ARTIFACTS: "minimal" | "standard" | "full"  (default: "standard")
 */

import { test, expect, Page } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:4173";
const SCREENSHOT_DIR = "output/screenshots";

/** Routes to evaluate — adapt to your app */
const ROUTES = ["/", "/login", "/dashboard", "/settings"];

/** Gating mode: "off" | "warn" | "strict" */
const GATING_MODE = (process.env.VP_GATING || "warn") as
  | "off"
  | "warn"
  | "strict";

/** Artifact volume: "minimal" | "standard" | "full" */
const ARTIFACT_MODE = (process.env.VP_ARTIFACTS || "standard") as
  | "minimal"
  | "standard"
  | "full";

/** Threshold for "strict" gating — eye-score below this fails the domain */
const STRICT_THRESHOLD = parseInt(process.env.VP_THRESHOLD || "50", 10);

// ─── Types ───────────────────────────────────────────────────────────────────

type ImpactDimension =
  | "brand"
  | "hierarchy"
  | "readability"
  | "contrast"
  | "layout"
  | "consistency"
  | "cta"
  | "trust";

type Severity = "critical" | "high" | "medium" | "low";

type VisualLabel = "healthy" | "needs-design-review" | "visually-risky";

interface VisualFinding {
  subdomain: string;
  route: string;
  element?: string;
  observation: string;
  impact: ImpactDimension;
  severity: Severity;
  suggestedFix: string;
  screenshot?: string;
  /** Mark checks that can't be fully measured as observational */
  isObservational?: boolean;
}

interface EyeScore {
  brandFit: number;
  visualHierarchy: number;
  readability: number;
  contrastClarity: number;
  layoutHarmony: number;
  componentConsistency: number;
  ctaClarity: number;
  trustPolish: number;
  overall: number;
}

interface ColorSample {
  element: string;
  property: string;
  value: string;
  hue: number;
  saturation: number;
  lightness: number;
}

interface TypographySample {
  element: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  color: string;
}

interface SpacingSample {
  element: string;
  marginTop: number;
  marginBottom: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

interface ButtonSample {
  text: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
}

// ─── Utility: Color Parsing ──────────────────────────────────────────────────

function parseRGB(
  color: string
): { r: number; g: number; b: number; a: number } | null {
  const rgbaMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

function rgbToHSL(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number }
): number {
  const l1 = luminance(fg.r, fg.g, fg.b);
  const l2 = luminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Visual Perception Evaluator ─────────────────────────────────────────────

class VisualPerceptionEvaluator {
  findings: VisualFinding[] = [];
  routeScores: Map<string, EyeScore> = new Map();

  // ── 14a: Visual Identity ────────────────────────────────────────────

  /**
   * Check that the logo is present, rendered crisply, and has breathing room.
   */
  async checkLogoClarity(page: Page, route: string): Promise<void> {
    const logoInfo = await page.evaluate(() => {
      const logo =
        document.querySelector("img[alt*='logo' i]") ||
        document.querySelector("img[class*='logo' i]") ||
        document.querySelector("[class*='logo' i] img") ||
        document.querySelector("[class*='logo' i] svg") ||
        document.querySelector("header img:first-of-type");

      if (!logo) return null;

      const rect = logo.getBoundingClientRect();
      const style = getComputedStyle(logo);
      const parent = logo.parentElement;
      const parentStyle = parent ? getComputedStyle(parent) : null;

      return {
        width: rect.width,
        height: rect.height,
        naturalWidth:
          logo instanceof HTMLImageElement ? logo.naturalWidth : null,
        naturalHeight:
          logo instanceof HTMLImageElement ? logo.naturalHeight : null,
        marginTop: parseFloat(style.marginTop),
        marginRight: parseFloat(style.marginRight),
        marginBottom: parseFloat(style.marginBottom),
        marginLeft: parseFloat(style.marginLeft),
        parentPaddingLeft: parentStyle
          ? parseFloat(parentStyle.paddingLeft)
          : 0,
        parentPaddingTop: parentStyle ? parseFloat(parentStyle.paddingTop) : 0,
        isVisible:
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0,
      };
    });

    if (!logoInfo) {
      this.findings.push({
        subdomain: "14a",
        route,
        observation:
          "No logo element was found on this page. The screen lacks a clear brand anchor.",
        impact: "brand",
        severity: "medium",
        suggestedFix:
          "Add a logo image or SVG in the header area with a descriptive alt attribute containing 'logo'.",
      });
      return;
    }

    if (!logoInfo.isVisible) {
      this.findings.push({
        subdomain: "14a",
        route,
        observation:
          "A logo element exists but is not visible — hidden by CSS or has zero dimensions.",
        impact: "brand",
        severity: "high",
        suggestedFix:
          "Make the logo visible with proper display and dimensions.",
      });
      return;
    }

    // Check crispness: natural size vs display size
    if (
      logoInfo.naturalWidth &&
      logoInfo.naturalHeight &&
      logoInfo.naturalWidth < logoInfo.width * 1.5
    ) {
      this.findings.push({
        subdomain: "14a",
        route,
        element: "logo",
        observation:
          "The logo appears to be rendered at or above its native resolution, which may cause blurriness on high-DPI screens.",
        impact: "trust",
        severity: "low",
        suggestedFix:
          "Provide a logo at 2× the display size (or use SVG) for crisp rendering on retina displays.",
      });
    }

    // Check breathing room
    const totalSpacing =
      logoInfo.marginLeft +
      logoInfo.marginRight +
      logoInfo.parentPaddingLeft;
    if (totalSpacing < 8) {
      this.findings.push({
        subdomain: "14a",
        route,
        element: "logo",
        observation:
          "The logo feels visually cramped — it's pressed against the edge of its container with almost no breathing room.",
        impact: "brand",
        severity: "low",
        suggestedFix:
          "Add at least 12–16px of padding or margin around the logo so it doesn't feel squeezed.",
      });
    }
  }

  /**
   * Extract the color palette used across the page and check for brand harmony.
   * Flags when too many competing accent colors appear.
   */
  async checkBrandColorHarmony(page: Page, route: string): Promise<void> {
    const colors: ColorSample[] = await page.evaluate(() => {
      const samples: Array<{
        element: string;
        property: string;
        value: string;
        hue: number;
        saturation: number;
        lightness: number;
      }> = [];

      const selectors = [
        { sel: "button", name: "button" },
        { sel: "a", name: "link" },
        { sel: "[class*='badge']", name: "badge" },
        { sel: "[class*='hero']", name: "hero" },
        { sel: "[class*='cta']", name: "cta" },
        { sel: "[class*='accent']", name: "accent" },
        { sel: "[class*='primary']", name: "primary" },
        { sel: "nav", name: "nav" },
        { sel: "header", name: "header" },
      ];

      for (const { sel, name } of selectors) {
        const els = document.querySelectorAll(sel);
        els.forEach((el, i) => {
          if (i > 5) return; // limit per selector
          const style = getComputedStyle(el);
          for (const prop of ["backgroundColor", "color", "borderColor"]) {
            const val = style[prop as keyof CSSStyleDeclaration] as string;
            if (
              val &&
              val !== "rgba(0, 0, 0, 0)" &&
              val !== "transparent" &&
              val !== "rgb(0, 0, 0)" &&
              val !== "rgb(255, 255, 255)"
            ) {
              const match = val.match(
                /rgba?\((\d+),\s*(\d+),\s*(\d+)/
              );
              if (match) {
                const r = parseInt(match[1]) / 255;
                const g = parseInt(match[2]) / 255;
                const b = parseInt(match[3]) / 255;
                const max = Math.max(r, g, b),
                  min = Math.min(r, g, b);
                let h = 0,
                  s = 0;
                const l = (max + min) / 2;
                if (max !== min) {
                  const d = max - min;
                  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                  else if (max === g) h = ((b - r) / d + 2) / 6;
                  else h = ((r - g) / d + 4) / 6;
                }
                const sat = Math.round(s * 100);
                if (sat > 15) {
                  // Only chromatic colors
                  samples.push({
                    element: `${name}${i > 0 ? `-${i}` : ""}`,
                    property: prop,
                    value: val,
                    hue: Math.round(h * 360),
                    saturation: sat,
                    lightness: Math.round(l * 100),
                  });
                }
              }
            }
          }
        });
      }
      return samples;
    });

    if (colors.length === 0) return;

    // Group by hue (30-degree buckets)
    const hueBuckets = new Map<number, ColorSample[]>();
    for (const c of colors) {
      const bucket = Math.round(c.hue / 30) * 30;
      if (!hueBuckets.has(bucket)) hueBuckets.set(bucket, []);
      hueBuckets.get(bucket)!.push(c);
    }

    // Flag: more than 3 competing saturated hue groups
    const saturatedBuckets = Array.from(hueBuckets.entries()).filter(
      ([, samples]) => samples.some((s) => s.saturation > 40)
    );

    if (saturatedBuckets.length > 3) {
      const hueList = saturatedBuckets
        .map(([h]) => `${h}°`)
        .join(", ");
      this.findings.push({
        subdomain: "14a",
        route,
        observation: `${saturatedBuckets.length} competing accent color groups appear on this page (hues: ${hueList}). The palette feels scattered rather than intentional — too many colors compete for attention.`,
        impact: "brand",
        severity: "medium",
        suggestedFix:
          "Consolidate to 1 primary and 1 secondary accent color. Reserve additional hues for semantic meaning only (success, warning, error).",
      });
    }
  }

  // ── 14b: First Impression ──────────────────────────────────────────

  /**
   * Check above-the-fold clarity: can a user tell what this page is for
   * within a few seconds?
   */
  async checkAboveTheFold(page: Page, route: string): Promise<void> {
    const foldInfo = await page.evaluate(() => {
      const vh = window.innerHeight;
      const allElements = document.querySelectorAll("*");
      let elementCount = 0;
      let hasH1 = false;
      let hasCTA = false;
      let hasImage = false;

      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0 && rect.height > 0) {
          elementCount++;
          if (el.tagName === "H1") hasH1 = true;
          if (
            el.tagName === "BUTTON" ||
            (el.tagName === "A" &&
              (el.className.includes("btn") ||
                el.className.includes("cta") ||
                el.getAttribute("role") === "button"))
          ) {
            hasCTA = true;
          }
          if (
            el.tagName === "IMG" ||
            el.tagName === "SVG" ||
            el.tagName === "VIDEO"
          ) {
            hasImage = true;
          }
        }
      });

      return { elementCount, hasH1, hasCTA, hasImage, viewportHeight: vh };
    });

    // Noise check: too many visible elements above fold
    if (foldInfo.elementCount > 150) {
      this.findings.push({
        subdomain: "14b",
        route,
        observation: `The first screen feels cluttered — ${foldInfo.elementCount} DOM elements are visible above the fold. The eye has no clear place to rest.`,
        impact: "hierarchy",
        severity: "medium",
        suggestedFix:
          "Reduce visual noise by consolidating elements, increasing whitespace, or moving secondary content below the fold.",
      });
    }

    // Missing primary heading
    if (!foldInfo.hasH1 && route === "/") {
      this.findings.push({
        subdomain: "14b",
        route,
        observation:
          "The landing page has no H1 heading visible above the fold. A visitor can't instantly tell what this product does.",
        impact: "hierarchy",
        severity: "high",
        suggestedFix:
          "Add a clear, prominent H1 headline above the fold that explains the product's value in one line.",
      });
    }

    // Missing CTA above fold on landing page
    if (!foldInfo.hasCTA && route === "/") {
      this.findings.push({
        subdomain: "14b",
        route,
        observation:
          "No call-to-action is visible above the fold on the landing page. The visitor has no clear next step.",
        impact: "cta",
        severity: "high",
        suggestedFix:
          "Place the primary CTA button above the fold, near the headline.",
      });
    }
  }

  // ── 14c: Color System ──────────────────────────────────────────────

  /**
   * Check that the primary CTA gets the strongest color treatment.
   */
  async checkCTAColorPriority(page: Page, route: string): Promise<void> {
    const ctaInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button:not(:disabled)"));
      const visibleButtons = buttons.filter((btn) => {
        const style = getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.top < window.innerHeight
        );
      });

      return visibleButtons.slice(0, 10).map((btn) => {
        const style = getComputedStyle(btn);
        return {
          text: btn.textContent?.trim().slice(0, 30) || "",
          bg: style.backgroundColor,
          color: style.color,
          fontSize: parseFloat(style.fontSize),
          padding: style.padding,
          area:
            btn.getBoundingClientRect().width *
            btn.getBoundingClientRect().height,
        };
      });
    });

    if (ctaInfo.length < 2) return;

    // Check if multiple buttons have the same strong visual weight
    const strongButtons = ctaInfo.filter((btn) => {
      const bg = parseRGB(btn.bg);
      if (!bg) return false;
      const hsl = rgbToHSL(bg.r, bg.g, bg.b);
      return hsl.s > 40 && hsl.l > 20 && hsl.l < 80;
    });

    if (strongButtons.length > 2) {
      this.findings.push({
        subdomain: "14c",
        route,
        observation: `${strongButtons.length} buttons above the fold all use strong, saturated colors. When every button looks primary, none of them do — the user can't tell which action matters most.`,
        impact: "cta",
        severity: "medium",
        suggestedFix:
          "Give only the primary CTA a strong saturated color. Use muted, outlined, or ghost styles for secondary actions.",
      });
    }
  }

  /**
   * Check semantic color consistency (success=green, error=red, etc.)
   */
  async checkMeaningConsistency(page: Page, route: string): Promise<void> {
    const semanticColors = await page.evaluate(() => {
      const results: Array<{
        context: string;
        color: string;
        bg: string;
      }> = [];

      // Check error elements
      const errorEls = document.querySelectorAll(
        ".error, .danger, [class*='error'], [class*='danger'], [role='alert']"
      );
      errorEls.forEach((el) => {
        const style = getComputedStyle(el);
        results.push({
          context: "error",
          color: style.color,
          bg: style.backgroundColor,
        });
      });

      // Check success elements
      const successEls = document.querySelectorAll(
        ".success, [class*='success']"
      );
      successEls.forEach((el) => {
        const style = getComputedStyle(el);
        results.push({
          context: "success",
          color: style.color,
          bg: style.backgroundColor,
        });
      });

      // Check warning elements
      const warningEls = document.querySelectorAll(
        ".warning, [class*='warning'], [class*='warn']"
      );
      warningEls.forEach((el) => {
        const style = getComputedStyle(el);
        results.push({
          context: "warning",
          color: style.color,
          bg: style.backgroundColor,
        });
      });

      return results;
    });

    // Check for misuse: error that isn't reddish, success that isn't greenish
    for (const item of semanticColors) {
      const bg = parseRGB(item.bg);
      if (!bg || (bg.r === 0 && bg.g === 0 && bg.b === 0)) continue;
      const hsl = rgbToHSL(bg.r, bg.g, bg.b);

      if (item.context === "error" && hsl.s > 20) {
        // Error should be in red/orange range (330-30)
        if (hsl.h > 30 && hsl.h < 330) {
          this.findings.push({
            subdomain: "14c",
            route,
            element: "error element",
            observation: `An error element uses a non-red hue (${hsl.h}°). Users instinctively expect red/orange for errors — an unconventional color breaks that mental model.`,
            impact: "consistency",
            severity: "low",
            suggestedFix:
              "Use a red or warm-orange hue for error states to match universal user expectations.",
          });
          break; // one finding is enough
        }
      }
    }
  }

  // ── 14d: Contrast & Readability ────────────────────────────────────

  /**
   * Sample text/background contrast ratios across the page.
   */
  async checkTextContrast(page: Page, route: string): Promise<void> {
    const contrastSamples = await page.evaluate(() => {
      const samples: Array<{
        element: string;
        text: string;
        fg: string;
        bg: string;
        fontSize: number;
        fontWeight: string;
      }> = [];

      const textEls = document.querySelectorAll(
        "h1, h2, h3, h4, p, span, label, a, button, li, td, th, caption"
      );

      textEls.forEach((el, i) => {
        if (i > 30) return;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0
        )
          return;

        const text = el.textContent?.trim().slice(0, 30) || "";
        if (!text) return;

        samples.push({
          element: el.tagName.toLowerCase(),
          text,
          fg: style.color,
          bg: style.backgroundColor,
          fontSize: parseFloat(style.fontSize),
          fontWeight: style.fontWeight,
        });
      });

      return samples;
    });

    let lowContrastCount = 0;

    for (const sample of contrastSamples) {
      const fg = parseRGB(sample.fg);
      const bg = parseRGB(sample.bg);
      if (!fg || !bg) continue;

      // Skip transparent backgrounds (they inherit)
      if (bg.a === 0) continue;

      const ratio = contrastRatio(fg, bg);
      const isLargeText =
        sample.fontSize >= 18 ||
        (sample.fontSize >= 14 &&
          (sample.fontWeight === "bold" ||
            parseInt(sample.fontWeight) >= 700));

      const threshold = isLargeText ? 3 : 4.5;

      if (ratio < threshold) {
        lowContrastCount++;
        if (lowContrastCount <= 3) {
          this.findings.push({
            subdomain: "14d",
            route,
            element: `${sample.element}: "${sample.text}"`,
            observation: `Text "${sample.text}" has a contrast ratio of ${ratio.toFixed(1)}:1 against its background — below the ${threshold}:1 minimum. It blends into the background and feels hard to read.`,
            impact: "contrast",
            severity: ratio < 2.5 ? "high" : "medium",
            suggestedFix: `Increase the contrast ratio to at least ${threshold}:1. Darken the text or lighten the background.`,
          });
        }
      }
    }

    if (lowContrastCount > 3) {
      this.findings.push({
        subdomain: "14d",
        route,
        observation: `${lowContrastCount} text elements have insufficient contrast. This is a systemic issue — the color palette may need a readability review across the board.`,
        impact: "contrast",
        severity: "high",
        suggestedFix:
          "Review the design system's text-on-background color pairings and ensure all pass WCAG AA minimums.",
      });
    }
  }

  // ── 14e: Typography ────────────────────────────────────────────────

  /**
   * Check that heading sizes form a clear descending hierarchy and that
   * font usage is disciplined.
   */
  async checkTypeHierarchy(page: Page, route: string): Promise<void> {
    const typeSamples: TypographySample[] = await page.evaluate(() => {
      const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span"];
      const samples: TypographySample[] = [];

      for (const tag of tags) {
        const el = document.querySelector(tag);
        if (!el) continue;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0
        )
          continue;
        samples.push({
          element: tag,
          fontFamily: style.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
          fontSize: parseFloat(style.fontSize),
          fontWeight: style.fontWeight,
          lineHeight: parseFloat(style.lineHeight) || 0,
          color: style.color,
        });
      }
      return samples;
    });

    if (typeSamples.length < 2) return;

    // Check heading hierarchy: h1 > h2 > h3 in size
    const headings = typeSamples.filter((t) => t.element.startsWith("h"));
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      if (curr.fontSize >= prev.fontSize) {
        this.findings.push({
          subdomain: "14e",
          route,
          element: `${prev.element} → ${curr.element}`,
          observation: `The heading hierarchy breaks: ${curr.element} (${curr.fontSize}px) is the same size or larger than ${prev.element} (${prev.fontSize}px). The reader can't tell which heading is more important.`,
          impact: "readability",
          severity: "medium",
          suggestedFix: `Ensure heading sizes descend: H1 > H2 > H3. A typical scale might be 36 / 28 / 22 / 18px.`,
        });
        break;
      }
    }

    // Check font family count
    const uniqueFonts = new Set(typeSamples.map((t) => t.fontFamily));
    if (uniqueFonts.size > 3) {
      this.findings.push({
        subdomain: "14e",
        route,
        observation: `${uniqueFonts.size} different font families are in use: ${Array.from(uniqueFonts).join(", ")}. Too many fonts make the page feel like a ransom note rather than a cohesive product.`,
        impact: "consistency",
        severity: "medium",
        suggestedFix:
          "Consolidate to 2 font families at most — one for headings, one for body. Use weight variation instead of different families.",
      });
    }

    // Check line height on body text
    const bodyText = typeSamples.find(
      (t) => t.element === "p" || t.element === "span"
    );
    if (bodyText && bodyText.lineHeight > 0) {
      const ratio = bodyText.lineHeight / bodyText.fontSize;
      if (ratio < 1.3) {
        this.findings.push({
          subdomain: "14e",
          route,
          element: "body text",
          observation: `Body text line-height is only ${ratio.toFixed(2)}× the font size. The text feels cramped and hard to scan — paragraphs look like walls of text.`,
          impact: "readability",
          severity: "medium",
          suggestedFix:
            "Set line-height to at least 1.5 for body text to improve readability.",
        });
      }
    }
  }

  // ── 14f: Layout & Spacing ──────────────────────────────────────────

  /**
   * Check spacing rhythm in repeated elements (cards, list items, etc.)
   */
  async checkSpacingRhythm(page: Page, route: string): Promise<void> {
    const spacingData = await page.evaluate(() => {
      // Find repeated container patterns
      const containers = document.querySelectorAll(
        "[class*='card'], [class*='item'], [class*='tile'], li, article"
      );

      const gaps: number[] = [];
      const rects = Array.from(containers)
        .slice(0, 20)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            top: rect.top,
            bottom: rect.bottom,
            marginBottom: parseFloat(style.marginBottom),
            marginTop: parseFloat(style.marginTop),
          };
        })
        .filter((r) => r.top > 0 && r.bottom > 0);

      // Measure gaps between consecutive elements
      for (let i = 1; i < rects.length; i++) {
        const gap = rects[i].top - rects[i - 1].bottom;
        if (gap > 0 && gap < 200) {
          gaps.push(Math.round(gap));
        }
      }

      return { gaps, totalContainers: containers.length };
    });

    if (spacingData.gaps.length < 3) return;

    // Check gap consistency
    const uniqueGaps = new Set(spacingData.gaps);
    if (uniqueGaps.size > 3 && spacingData.gaps.length >= 4) {
      const gapList = Array.from(uniqueGaps)
        .sort((a, b) => a - b)
        .join(", ");
      this.findings.push({
        subdomain: "14f",
        route,
        observation: `Spacing between repeated elements is inconsistent — ${uniqueGaps.size} different gap sizes found: ${gapList}px. The layout feels stitched together rather than designed on a grid.`,
        impact: "layout",
        severity: "medium",
        suggestedFix:
          "Use a consistent spacing scale (e.g., 8/16/24/32/48px) and apply the same gap between all repeated elements.",
      });
    }
  }

  /**
   * Check alignment accuracy of sibling elements.
   */
  async checkAlignmentAccuracy(page: Page, route: string): Promise<void> {
    const alignmentData = await page.evaluate(() => {
      const sections = document.querySelectorAll(
        "section, main > div, [class*='container'], [class*='wrapper']"
      );
      const leftEdges: number[] = [];

      sections.forEach((section) => {
        const children = section.children;
        for (let i = 0; i < Math.min(children.length, 10); i++) {
          const rect = children[i].getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            leftEdges.push(Math.round(rect.left));
          }
        }
      });

      // Group by proximity (within 2px)
      const groups = new Map<number, number>();
      for (const edge of leftEdges) {
        let matched = false;
        for (const [key, count] of groups) {
          if (Math.abs(edge - key) <= 2) {
            groups.set(key, count + 1);
            matched = true;
            break;
          }
        }
        if (!matched) groups.set(edge, 1);
      }

      return {
        totalEdges: leftEdges.length,
        uniqueAlignments: groups.size,
        edges: Array.from(groups.entries()).map(([edge, count]) => ({
          edge,
          count,
        })),
      };
    });

    if (
      alignmentData.uniqueAlignments > 5 &&
      alignmentData.totalEdges > 8
    ) {
      this.findings.push({
        subdomain: "14f",
        route,
        observation: `Content sections start at ${alignmentData.uniqueAlignments} different left-edge positions. The page looks like components were placed individually rather than aligned to a shared grid.`,
        impact: "layout",
        severity: "low",
        suggestedFix:
          "Use a consistent container max-width and padding so all sections align to the same left edge.",
        isObservational: true,
      });
    }
  }

  // ── 14g: Visual Hierarchy ──────────────────────────────────────────

  /**
   * Perform a "squint test" — capture a blurred screenshot to check if
   * the right focal structure remains.
   */
  async checkSquintTest(
    page: Page,
    route: string
  ): Promise<string | undefined> {
    if (ARTIFACT_MODE === "minimal") return undefined;

    const routeSlug =
      route.replace(/\//g, "-").replace(/^-/, "") || "root";
    const blurPath = `${SCREENSHOT_DIR}/vp-squint-${routeSlug}.png`;

    // Inject a blur filter temporarily
    await page.evaluate(() => {
      document.body.style.filter = "blur(6px)";
    });

    await page.screenshot({ path: blurPath, fullPage: false });

    // Remove the blur
    await page.evaluate(() => {
      document.body.style.filter = "";
    });

    return blurPath;
  }

  /**
   * Check the primary focal point — what draws the eye first.
   */
  async checkPrimaryFocalPoint(page: Page, route: string): Promise<void> {
    const focalData = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      let largestArea = 0;
      let largestElement = "";
      let largestIsImportant = false;

      const elements = document.querySelectorAll(
        "h1, h2, img, video, button, [class*='hero'], [class*='banner']"
      );

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top > vh || rect.bottom < 0) return;

        const visibleArea =
          Math.min(rect.bottom, vh) * rect.width -
          Math.max(rect.top, 0) * rect.width;
        if (visibleArea > largestArea) {
          largestArea = visibleArea;
          largestElement = `${el.tagName.toLowerCase()}${el.className ? "." + el.className.toString().split(" ")[0] : ""}`;
          largestIsImportant =
            el.tagName === "H1" ||
            el.tagName === "H2" ||
            el.className.toString().includes("hero") ||
            el.className.toString().includes("banner");
        }
      });

      return {
        largestElement,
        largestArea,
        largestIsImportant,
        viewportArea: vh * vw,
      };
    });

    if (
      focalData.largestElement &&
      !focalData.largestIsImportant &&
      focalData.largestArea > focalData.viewportArea * 0.1
    ) {
      this.findings.push({
        subdomain: "14g",
        route,
        element: focalData.largestElement,
        observation: `The most visually dominant element above the fold is "${focalData.largestElement}", which doesn't appear to be the primary content or hero. The eye is drawn to a secondary element first, weakening the intended hierarchy.`,
        impact: "hierarchy",
        severity: "medium",
        suggestedFix:
          "Make the hero heading or primary content visually larger or more prominent than competing decorative or secondary elements.",
        isObservational: true,
      });
    }
  }

  // ── 14h: Navigation Clarity ────────────────────────────────────────

  /**
   * Check that the navbar is clearly visible and the active state is marked.
   */
  async checkNavbarVisibility(page: Page, route: string): Promise<void> {
    const navInfo = await page.evaluate((currentRoute: string) => {
      const nav = document.querySelector("nav, header nav, [role='navigation']");
      if (!nav) return null;

      const style = getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();

      // Check active link
      const links = nav.querySelectorAll("a");
      let activeFound = false;
      let activeHasVisualDiff = false;

      links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (
          href === currentRoute ||
          (currentRoute === "/" && href === "/") ||
          link.classList.contains("active") ||
          link.getAttribute("aria-current") === "page"
        ) {
          activeFound = true;
          const linkStyle = getComputedStyle(link);
          // Check if active link looks different from others
          const siblingLinks = Array.from(links).filter((l) => l !== link);
          if (siblingLinks.length > 0) {
            const siblingStyle = getComputedStyle(siblingLinks[0]);
            if (
              linkStyle.color !== siblingStyle.color ||
              linkStyle.fontWeight !== siblingStyle.fontWeight ||
              linkStyle.borderBottom !== siblingStyle.borderBottom ||
              linkStyle.backgroundColor !== siblingStyle.backgroundColor
            ) {
              activeHasVisualDiff = true;
            }
          }
        }
      });

      return {
        exists: true,
        bg: style.backgroundColor,
        height: rect.height,
        linkCount: links.length,
        activeFound,
        activeHasVisualDiff,
      };
    }, route);

    if (!navInfo) {
      this.findings.push({
        subdomain: "14h",
        route,
        observation:
          "No navigation element (<nav> or [role='navigation']) was found. The user has no visible way to move between sections.",
        impact: "trust",
        severity: "high",
        suggestedFix:
          "Add a semantic <nav> element with clear links to the main sections of the application.",
      });
      return;
    }

    if (navInfo.activeFound && !navInfo.activeHasVisualDiff) {
      this.findings.push({
        subdomain: "14h",
        route,
        observation:
          "The navigation exists but the current page's link doesn't look visually different from other links. The user can't tell where they are in the site.",
        impact: "hierarchy",
        severity: "medium",
        suggestedFix:
          "Apply a distinct visual style to the active nav link — different color, underline, font-weight, or background.",
      });
    }
  }

  // ── 14i: CTA Clarity ───────────────────────────────────────────────

  /**
   * Check hover, focus, active, and disabled states on CTA buttons.
   */
  async checkCTAStates(page: Page, route: string): Promise<void> {
    const buttons = await page.locator("button:visible").all();

    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const btn = buttons[i];
      const text =
        (await btn.textContent())?.trim().slice(0, 30) || `button-${i}`;

      try {
        // Get default state
        const defaultBg = await btn.evaluate(
          (el) => getComputedStyle(el).backgroundColor
        );
        const defaultShadow = await btn.evaluate(
          (el) => getComputedStyle(el).boxShadow
        );

        // Hover
        await btn.hover();
        await page.waitForTimeout(200);

        const hoverBg = await btn.evaluate(
          (el) => getComputedStyle(el).backgroundColor
        );
        const hoverShadow = await btn.evaluate(
          (el) => getComputedStyle(el).boxShadow
        );

        if (hoverBg === defaultBg && hoverShadow === defaultShadow) {
          this.findings.push({
            subdomain: "14i",
            route,
            element: text,
            observation: `Button "${text}" has no visible hover effect — it looks exactly the same on hover. The user gets no feedback that this is interactive.`,
            impact: "cta",
            severity: "low",
            suggestedFix:
              "Add a hover state: change the background shade, add a shadow lift, or adjust opacity to signal interactivity.",
          });
        }

        // Move mouse away to reset
        await page.mouse.move(0, 0);
      } catch {
        // Button might have been removed or navigated away
      }
    }
  }

  // ── 14k: Component Consistency ─────────────────────────────────────

  /**
   * Check that all buttons share consistent styling (radius, padding, shadow).
   */
  async checkButtonConsistency(page: Page, route: string): Promise<void> {
    const buttonStyles: ButtonSample[] = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      return Array.from(buttons)
        .filter((btn) => {
          const style = getComputedStyle(btn);
          const rect = btn.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0
          );
        })
        .slice(0, 15)
        .map((btn) => {
          const style = getComputedStyle(btn);
          return {
            text: btn.textContent?.trim().slice(0, 20) || "",
            borderRadius: style.borderRadius,
            padding: style.padding,
            boxShadow: style.boxShadow,
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
          };
        });
    });

    if (buttonStyles.length < 3) return;

    // Check border-radius consistency
    const radii = new Set(buttonStyles.map((b) => b.borderRadius));
    if (radii.size > 3) {
      this.findings.push({
        subdomain: "14k",
        route,
        observation: `Buttons use ${radii.size} different border-radius values: ${Array.from(radii).join(", ")}. The inconsistency makes the UI feel like buttons were designed separately rather than as part of one system.`,
        impact: "consistency",
        severity: "medium",
        suggestedFix:
          "Standardize on 1–2 border-radius values in the design system (e.g., 4px for compact, 8px for standard).",
      });
    }

    // Check font-size consistency
    const fontSizes = new Set(buttonStyles.map((b) => b.fontSize));
    if (fontSizes.size > 3) {
      this.findings.push({
        subdomain: "14k",
        route,
        observation: `Button text appears in ${fontSizes.size} different font sizes. The visual weight of buttons varies unpredictably.`,
        impact: "consistency",
        severity: "low",
        suggestedFix:
          "Define button size variants (small, medium, large) with fixed font sizes in the design system.",
      });
    }
  }

  // ── 14l: Responsiveness by Eye ─────────────────────────────────────

  /**
   * Check mobile hierarchy: does the important content still show first?
   */
  async checkMobileHierarchy(page: Page, route: string): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 480) return; // Only for mobile viewports

    const mobileInfo = await page.evaluate(() => {
      const vh = window.innerHeight;
      const firstH1 = document.querySelector("h1");
      const firstButton = document.querySelector(
        "button:not(:disabled), a[class*='btn'], a[class*='cta']"
      );

      return {
        h1Position: firstH1
          ? firstH1.getBoundingClientRect().top
          : null,
        ctaPosition: firstButton
          ? firstButton.getBoundingClientRect().top
          : null,
        viewportHeight: vh,
      };
    });

    if (mobileInfo.h1Position !== null && mobileInfo.h1Position > mobileInfo.viewportHeight) {
      this.findings.push({
        subdomain: "14l",
        route,
        observation:
          "On mobile, the primary heading is pushed below the fold. A user scrolling quickly would miss the most important content entirely.",
        impact: "hierarchy",
        severity: "high",
        suggestedFix:
          "Ensure the H1 and primary CTA are visible above the fold on mobile without scrolling.",
      });
    }
  }

  // ── 14m: Perceived Trust & Polish ──────────────────────────────────

  /**
   * Check finishing details: favicon, loaders, visual stability.
   */
  async checkFinishingDetails(page: Page, route: string): Promise<void> {
    const details = await page.evaluate(() => {
      const favicon = document.querySelector(
        "link[rel='icon'], link[rel='shortcut icon']"
      );

      // Check for consistent loader/spinner styles
      const spinners = document.querySelectorAll(
        "[class*='spinner'], [class*='loader'], [class*='loading']"
      );
      const spinnerStyles = new Set<string>();
      spinners.forEach((el) => {
        const style = getComputedStyle(el);
        spinnerStyles.add(
          `${style.width}|${style.height}|${style.borderColor}`
        );
      });

      return {
        hasFavicon: !!favicon,
        spinnerVariants: spinnerStyles.size,
        spinnerCount: spinners.length,
      };
    });

    if (!details.hasFavicon) {
      this.findings.push({
        subdomain: "14m",
        route,
        observation:
          "No favicon is set. The browser tab shows a generic icon, which feels unfinished and reduces perceived professionalism.",
        impact: "trust",
        severity: "low",
        suggestedFix:
          "Add a favicon.ico or SVG favicon that matches the brand logo.",
      });
    }

    if (details.spinnerVariants > 1) {
      this.findings.push({
        subdomain: "14m",
        route,
        observation: `${details.spinnerVariants} different spinner/loader styles are visible on the same page. Inconsistent loaders make the UI feel like it was assembled from different projects.`,
        impact: "consistency",
        severity: "low",
        suggestedFix:
          "Use a single, consistent loading indicator component throughout the application.",
      });
    }
  }

  /**
   * Check for images rendered larger than their natural resolution (blurry).
   */
  async checkCrispness(page: Page, route: string): Promise<void> {
    const blurryImages = await page.evaluate(() => {
      const images = document.querySelectorAll("img");
      const blurry: Array<{ src: string; display: string; natural: string }> =
        [];

      images.forEach((img) => {
        if (
          img.naturalWidth > 0 &&
          img.width > img.naturalWidth * 1.2
        ) {
          blurry.push({
            src: img.src.split("/").pop() || img.src,
            display: `${img.width}×${img.height}`,
            natural: `${img.naturalWidth}×${img.naturalHeight}`,
          });
        }
      });

      return blurry;
    });

    if (blurryImages.length > 0) {
      const examples = blurryImages
        .slice(0, 3)
        .map((img) => `"${img.src}" displayed at ${img.display} but only ${img.natural} native`)
        .join("; ");

      this.findings.push({
        subdomain: "14m",
        route,
        observation: `${blurryImages.length} image(s) are displayed larger than their native resolution, causing visible blurriness: ${examples}.`,
        impact: "trust",
        severity: "medium",
        suggestedFix:
          "Provide images at 2× the display size for retina clarity, or use SVG for icons and logos.",
      });
    }
  }

  // ── 14n: Eye-Like Scoring ──────────────────────────────────────────

  /**
   * Generate the 8-dimension eye-like scorecard for a route.
   * Starts at 10/10 for each dimension and deducts based on findings.
   */
  generateScorecard(route: string): EyeScore {
    const routeFindings = this.findings.filter((f) => f.route === route);

    const deductions: Record<ImpactDimension, number> = {
      brand: 0,
      hierarchy: 0,
      readability: 0,
      contrast: 0,
      layout: 0,
      consistency: 0,
      cta: 0,
      trust: 0,
    };

    const severityWeight: Record<Severity, number> = {
      critical: 3,
      high: 2,
      medium: 1,
      low: 0.5,
    };

    for (const finding of routeFindings) {
      deductions[finding.impact] += severityWeight[finding.severity];
    }

    const score: EyeScore = {
      brandFit: Math.max(1, Math.round(10 - deductions.brand)),
      visualHierarchy: Math.max(1, Math.round(10 - deductions.hierarchy)),
      readability: Math.max(1, Math.round(10 - deductions.readability)),
      contrastClarity: Math.max(1, Math.round(10 - deductions.contrast)),
      layoutHarmony: Math.max(1, Math.round(10 - deductions.layout)),
      componentConsistency: Math.max(
        1,
        Math.round(10 - deductions.consistency)
      ),
      ctaClarity: Math.max(1, Math.round(10 - deductions.cta)),
      trustPolish: Math.max(1, Math.round(10 - deductions.trust)),
      overall: 0,
    };

    // Calculate overall as average × 10
    const dims = [
      score.brandFit,
      score.visualHierarchy,
      score.readability,
      score.contrastClarity,
      score.layoutHarmony,
      score.componentConsistency,
      score.ctaClarity,
      score.trustPolish,
    ];
    score.overall = Math.round(
      (dims.reduce((a, b) => a + b, 0) / dims.length) * 10
    );

    this.routeScores.set(route, score);
    return score;
  }

  /**
   * Get the three-tier label for a score.
   */
  getLabel(score: EyeScore): VisualLabel {
    if (score.overall >= 70) return "healthy";
    if (score.overall >= 40) return "needs-design-review";
    return "visually-risky";
  }

  /**
   * Get the label emoji.
   */
  getLabelEmoji(label: VisualLabel): string {
    switch (label) {
      case "healthy":
        return "🟢";
      case "needs-design-review":
        return "🟡";
      case "visually-risky":
        return "🔴";
    }
  }

  /**
   * Generate a score bar (visual ASCII representation).
   */
  private scoreBar(value: number, max: number = 10): string {
    const filled = Math.round((value / max) * 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  }

  /**
   * Generate the full Domain 14 report section.
   */
  generateReport(): string {
    const lines: string[] = [
      "═".repeat(70),
      "  👁️  VISUAL PERCEPTION, BRAND FIT & AESTHETIC CONSISTENCY",
      `  Generated: ${new Date().toISOString()}`,
      `  Gating mode: ${GATING_MODE} | Artifacts: ${ARTIFACT_MODE}`,
      "═".repeat(70),
      "",
    ];

    // Aggregate score across all routes
    const allScores = Array.from(this.routeScores.values());
    if (allScores.length === 0) {
      lines.push("  ⚠️ No routes were scored.");
      return lines.join("\n");
    }

    const avgScore: EyeScore = {
      brandFit: Math.round(
        allScores.reduce((a, s) => a + s.brandFit, 0) / allScores.length
      ),
      visualHierarchy: Math.round(
        allScores.reduce((a, s) => a + s.visualHierarchy, 0) / allScores.length
      ),
      readability: Math.round(
        allScores.reduce((a, s) => a + s.readability, 0) / allScores.length
      ),
      contrastClarity: Math.round(
        allScores.reduce((a, s) => a + s.contrastClarity, 0) / allScores.length
      ),
      layoutHarmony: Math.round(
        allScores.reduce((a, s) => a + s.layoutHarmony, 0) / allScores.length
      ),
      componentConsistency: Math.round(
        allScores.reduce((a, s) => a + s.componentConsistency, 0) /
          allScores.length
      ),
      ctaClarity: Math.round(
        allScores.reduce((a, s) => a + s.ctaClarity, 0) / allScores.length
      ),
      trustPolish: Math.round(
        allScores.reduce((a, s) => a + s.trustPolish, 0) / allScores.length
      ),
      overall: Math.round(
        allScores.reduce((a, s) => a + s.overall, 0) / allScores.length
      ),
    };

    const label = this.getLabel(avgScore);
    const emoji = this.getLabelEmoji(label);

    lines.push(
      "┌──────────────────────────────────────────────────────────────────┐",
      "│  👁️  EYE-LIKE SCORECARD                                        │",
      "├──────────────────────────────────────────────────────────────────┤",
      "│                                                                  │",
      `│  Brand Fit:              ${this.scoreBar(avgScore.brandFit)}  ${avgScore.brandFit}/10    │`,
      `│  Visual Hierarchy:       ${this.scoreBar(avgScore.visualHierarchy)}  ${avgScore.visualHierarchy}/10    │`,
      `│  Readability:            ${this.scoreBar(avgScore.readability)}  ${avgScore.readability}/10    │`,
      `│  Contrast Clarity:       ${this.scoreBar(avgScore.contrastClarity)}  ${avgScore.contrastClarity}/10    │`,
      `│  Layout Harmony:         ${this.scoreBar(avgScore.layoutHarmony)}  ${avgScore.layoutHarmony}/10    │`,
      `│  Component Consistency:  ${this.scoreBar(avgScore.componentConsistency)}  ${avgScore.componentConsistency}/10    │`,
      `│  CTA Clarity:            ${this.scoreBar(avgScore.ctaClarity)}  ${avgScore.ctaClarity}/10    │`,
      `│  Trust & Polish:         ${this.scoreBar(avgScore.trustPolish)}  ${avgScore.trustPolish}/10    │`,
      "│                                                                  │",
      `│  Overall:                ${avgScore.overall}/100                            │`,
      `│  Verdict:                ${emoji} ${label.replace(/-/g, " ").toUpperCase()}               │`,
      "│                                                                  │",
      "└──────────────────────────────────────────────────────────────────┘",
      ""
    );

    // Per-route scores
    lines.push("## Per-Route Scores", "");
    lines.push(
      "| Route | Brand | Hierarchy | Read. | Contrast | Layout | Consist. | CTA | Trust | Overall | Verdict |"
    );
    lines.push(
      "|-------|:-----:|:---------:|:-----:|:--------:|:------:|:--------:|:---:|:-----:|:-------:|:-------:|"
    );
    for (const [routeName, score] of this.routeScores) {
      const routeLabel = this.getLabel(score);
      const routeEmoji = this.getLabelEmoji(routeLabel);
      lines.push(
        `| ${routeName} | ${score.brandFit} | ${score.visualHierarchy} | ${score.readability} | ${score.contrastClarity} | ${score.layoutHarmony} | ${score.componentConsistency} | ${score.ctaClarity} | ${score.trustPolish} | **${score.overall}** | ${routeEmoji} |`
      );
    }
    lines.push("");

    // Findings in human language
    if (this.findings.length > 0) {
      lines.push("## Human-Language Observations", "");

      // Group by subdomain
      const bySubdomain = new Map<string, VisualFinding[]>();
      for (const f of this.findings) {
        if (!bySubdomain.has(f.subdomain))
          bySubdomain.set(f.subdomain, []);
        bySubdomain.get(f.subdomain)!.push(f);
      }

      for (const [sub, findings] of bySubdomain) {
        lines.push(`### Sub-domain ${sub}`, "");
        for (const f of findings) {
          const severityEmoji =
            f.severity === "critical"
              ? "🔴"
              : f.severity === "high"
                ? "🟠"
                : f.severity === "medium"
                  ? "🟡"
                  : "🔵";
          const obsTag = f.isObservational ? " *(observational)*" : "";
          lines.push(
            `- ${severityEmoji} **${f.severity.toUpperCase()}** · ${f.route}${f.element ? ` · "${f.element}"` : ""}${obsTag}`,
            `  ${f.observation}`,
            `  🔧 ${f.suggestedFix}`,
            ""
          );
        }
      }
    }

    // Summary stats
    lines.push(
      "",
      "─".repeat(70),
      `Total visual findings: ${this.findings.length}`,
      `  Critical: ${this.findings.filter((f) => f.severity === "critical").length}`,
      `  High: ${this.findings.filter((f) => f.severity === "high").length}`,
      `  Medium: ${this.findings.filter((f) => f.severity === "medium").length}`,
      `  Low: ${this.findings.filter((f) => f.severity === "low").length}`,
      `  Observational: ${this.findings.filter((f) => f.isObservational).length}`,
      "",
      `Gating mode: ${GATING_MODE}`,
      `  off    = Domain 14 not reported`,
      `  warn   = Advisory only, does not affect Health Score (default)`,
      `  strict = Fails if eye-score < ${STRICT_THRESHOLD}/100`
    );

    return lines.join("\n");
  }

  // ── 14o: Visual Calm & Noise ──────────────────────────────────────────────

  async checkVisualCalm(page: Page, route: string): Promise<void> {
    const calmData = await page.evaluate(() => {
      // Count visible elements in viewport
      const allElements = document.querySelectorAll("*");
      let visibleCount = 0;
      const viewportHeight = window.innerHeight;

      allElements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (
          rect.top < viewportHeight &&
          rect.bottom > 0 &&
          rect.width > 0 &&
          rect.height > 0
        ) {
          const style = getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity) > 0) {
            visibleCount++;
          }
        }
      });

      // Count running animations
      const animations = document.getAnimations?.() || [];
      const runningAnimations = animations.filter(
        (a) => a.playState === "running"
      ).length;

      // Count distinct saturated colors above fold
      const colorSet = new Set<string>();
      const aboveFold = document.querySelectorAll("*");
      aboveFold.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < viewportHeight && rect.bottom > 0) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
            colorSet.add(bg);
          }
        }
      });

      return { visibleCount, runningAnimations, distinctColors: colorSet.size };
    });

    if (calmData.visibleCount > 200) {
      this.addFinding({
        subdomain: "14o",
        dimension: "Visual Calm",
        severity: "medium",
        route,
        observation: `High visual density: ${calmData.visibleCount} elements visible in the viewport simultaneously. This creates visual noise.`,
        suggestedFix: "Reduce visible elements by grouping content, using progressive disclosure, or simplifying the layout.",
        isObservational: true,
      });
    }

    if (calmData.runningAnimations > 2) {
      this.addFinding({
        subdomain: "14o",
        dimension: "Visual Calm",
        severity: "medium",
        route,
        observation: `${calmData.runningAnimations} animations running simultaneously above the fold. Competing animations create visual chaos.`,
        suggestedFix: "Limit to 1-2 simultaneous animations. Stagger or reduce animation count.",
        isObservational: true,
      });
    }

    if (calmData.distinctColors > 8) {
      this.addFinding({
        subdomain: "14o",
        dimension: "Visual Calm",
        severity: "low",
        route,
        observation: `${calmData.distinctColors} distinct background colors visible. High color volume adds visual noise.`,
        suggestedFix: "Reduce to 4-6 colors using a constrained palette.",
        isObservational: true,
      });
    }
  }

  // ── 14p: Rhythm & Repetition ──────────────────────────────────────────────

  async checkRhythm(page: Page, route: string): Promise<void> {
    const rhythmData = await page.evaluate(() => {
      // Measure gaps between successive sibling elements in lists/grids
      const containers = document.querySelectorAll(
        "ul, ol, [class*='grid'], [class*='list'], [class*='cards']"
      );
      const gapVariances: { container: string; gaps: number[]; variance: number }[] = [];

      containers.forEach((container) => {
        const children = Array.from(container.children);
        if (children.length < 3) return;

        const gaps: number[] = [];
        for (let i = 1; i < children.length; i++) {
          const prevRect = children[i - 1].getBoundingClientRect();
          const currRect = children[i].getBoundingClientRect();
          const gap = currRect.top - prevRect.bottom;
          if (gap >= 0) gaps.push(Math.round(gap));
        }

        if (gaps.length >= 2) {
          const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const variance = Math.round(
            Math.sqrt(gaps.reduce((sum, g) => sum + (g - avg) ** 2, 0) / gaps.length)
          );

          const cls = container.className
            ? "." + String(container.className).split(" ")[0]
            : "";
          gapVariances.push({
            container: container.tagName + cls,
            gaps: gaps.slice(0, 5),
            variance,
          });
        }
      });

      return gapVariances;
    });

    for (const item of rhythmData) {
      if (item.variance > 4) {
        this.addFinding({
          subdomain: "14p",
          dimension: "Layout Harmony",
          severity: "low",
          route,
          element: item.container,
          observation: `Inconsistent vertical rhythm in ${item.container}: gap variance is ${item.variance}px (gaps: ${item.gaps.join(", ")}px). Predictable spacing creates visual calm.`,
          suggestedFix: "Use consistent gap/margin values across siblings. Consider CSS gap property.",
          isObservational: true,
        });
      }
    }
  }

  // ── 14q: Emphasis Control ──────────────────────────────────────────────────

  async checkEmphasisControl(page: Page, route: string): Promise<void> {
    const emphasisData = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Find the visually largest/most prominent elements
      const elements = document.querySelectorAll("h1, h2, h3, img, video, [class*='hero'], [class*='banner'], button, a");
      const prominent: { tag: string; area: number; fontSize: number }[] = [];

      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < viewportHeight && rect.bottom > 0) {
          const area = rect.width * rect.height;
          const fontSize = parseFloat(getComputedStyle(el).fontSize) || 0;
          prominent.push({
            tag: el.tagName + (el.id ? "#" + el.id : ""),
            area,
            fontSize,
          });
        }
      });

      // Sort by visual prominence (area * fontSize weight)
      prominent.sort((a, b) => b.area * b.fontSize - a.area * a.fontSize);

      // Check if top 2 elements are competing (similar prominence)
      let competing = false;
      if (prominent.length >= 2) {
        const score1 = prominent[0].area * prominent[0].fontSize;
        const score2 = prominent[1].area * prominent[1].fontSize;
        competing = score2 > score1 * 0.8; // Within 80% = competing
      }

      return {
        topElements: prominent.slice(0, 3).map((p) => p.tag),
        competing,
        totalProminent: prominent.length,
      };
    });

    if (emphasisData.competing && emphasisData.topElements.length >= 2) {
      this.addFinding({
        subdomain: "14q",
        dimension: "Visual Hierarchy",
        severity: "medium",
        route,
        observation: `Competing focal points above the fold: ${emphasisData.topElements.slice(0, 2).join(" vs ")}. Both elements have similar visual prominence, splitting the user's attention.`,
        suggestedFix: "Make one element clearly dominant (larger, bolder, or more contrasting) and de-emphasize the other.",
        isObservational: true,
      });
    }
  }

  // ── 14r: Craftsmanship Signals ─────────────────────────────────────────────

  async checkCraftsmanship(page: Page, route: string): Promise<void> {
    const craftData = await page.evaluate(() => {
      // Check transition consistency
      const allElements = document.querySelectorAll("button, a, input, [class*='card']");
      const transitions = new Set<string>();

      allElements.forEach((el) => {
        const t = getComputedStyle(el).transitionDuration;
        if (t && t !== "0s") transitions.add(t);
      });

      // Check border consistency on similar elements
      const buttons = document.querySelectorAll("button");
      const borderRadii = new Set<string>();
      const borderColors = new Set<string>();

      buttons.forEach((btn) => {
        const style = getComputedStyle(btn);
        borderRadii.add(style.borderRadius);
        const bc = style.borderColor;
        if (bc && bc !== "rgb(0, 0, 0)") borderColors.add(bc);
      });

      return {
        distinctTransitions: transitions.size,
        transitionValues: Array.from(transitions).slice(0, 5),
        distinctBorderRadii: borderRadii.size,
        distinctBorderColors: borderColors.size,
      };
    });

    if (craftData.distinctTransitions > 4) {
      this.addFinding({
        subdomain: "14r",
        dimension: "Consistency",
        severity: "low",
        route,
        observation: `${craftData.distinctTransitions} distinct transition durations on interactive elements (${craftData.transitionValues.join(", ")}). Inconsistent timing feels unpolished.`,
        suggestedFix: "Standardize to 2-3 transition durations: fast (150ms), normal (200ms), slow (300ms).",
        isObservational: true,
      });
    }

    if (craftData.distinctBorderRadii > 3) {
      this.addFinding({
        subdomain: "14r",
        dimension: "Consistency",
        severity: "low",
        route,
        observation: `Buttons use ${craftData.distinctBorderRadii} distinct border-radius values. This creates component family drift.`,
        suggestedFix: "Define 1-2 border-radius tokens and apply consistently across all buttons.",
        isObservational: true,
      });
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Domain 14: Visual Perception, Brand Fit & Taste Critique", () => {
  let evaluator: VisualPerceptionEvaluator;

  test.beforeAll(() => {
    evaluator = new VisualPerceptionEvaluator();
  });

  // Desktop evaluation
  for (const route of ROUTES) {
    test(`Visual perception (desktop): ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Run all checks
      await evaluator.checkLogoClarity(page, route);
      await evaluator.checkBrandColorHarmony(page, route);
      await evaluator.checkAboveTheFold(page, route);
      await evaluator.checkCTAColorPriority(page, route);
      await evaluator.checkMeaningConsistency(page, route);
      await evaluator.checkTextContrast(page, route);
      await evaluator.checkTypeHierarchy(page, route);
      await evaluator.checkSpacingRhythm(page, route);
      await evaluator.checkAlignmentAccuracy(page, route);
      await evaluator.checkPrimaryFocalPoint(page, route);
      await evaluator.checkNavbarVisibility(page, route);
      await evaluator.checkCTAStates(page, route);
      await evaluator.checkButtonConsistency(page, route);
      await evaluator.checkFinishingDetails(page, route);
      await evaluator.checkCrispness(page, route);

      // Squint test screenshot
      const squintPath = await evaluator.checkSquintTest(page, route);

      // Standard screenshot
      const routeSlug =
        route.replace(/\//g, "-").replace(/^-/, "") || "root";
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/vp-desktop-${routeSlug}.png`,
        fullPage: true,
      });

      // Taste critique checks (14o-14r)
      await evaluator.checkVisualCalm(page, route);
      await evaluator.checkRhythm(page, route);
      await evaluator.checkEmphasisControl(page, route);
      await evaluator.checkCraftsmanship(page, route);

      // Generate scorecard for this route
      evaluator.generateScorecard(route);
    });
  }

  // Mobile evaluation (subset — responsiveness by eye)
  for (const route of ROUTES) {
    test(`Visual perception (mobile): ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${PREVIEW_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      await evaluator.checkMobileHierarchy(page, route);
      await evaluator.checkAboveTheFold(page, `${route} (mobile)`);

      if (ARTIFACT_MODE !== "minimal") {
        const routeSlug =
          route.replace(/\//g, "-").replace(/^-/, "") || "root";
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/vp-mobile-${routeSlug}.png`,
          fullPage: false,
        });
      }
    });
  }

  // Final report + gating
  test("Generate Visual Perception Report", async () => {
    const report = evaluator.generateReport();
    console.log("\n" + report);

    // Gating behavior
    if (GATING_MODE === "strict") {
      const avgOverall = Array.from(evaluator.routeScores.values()).reduce(
        (sum, s) => sum + s.overall,
        0
      ) / evaluator.routeScores.size;

      expect(avgOverall, {
        message: `Visual Perception eye-score is ${Math.round(avgOverall)}/100, below the strict threshold of ${STRICT_THRESHOLD}/100.`,
      }).toBeGreaterThanOrEqual(STRICT_THRESHOLD);
    }

    // In "warn" mode, log but don't fail
    if (GATING_MODE === "warn") {
      const criticals = evaluator.findings.filter(
        (f) => f.severity === "critical"
      );
      if (criticals.length > 0) {
        console.warn(
          `\n⚠️ ${criticals.length} critical visual perception issue(s) found. Review recommended before shipping.`
        );
      }
    }
  });
});

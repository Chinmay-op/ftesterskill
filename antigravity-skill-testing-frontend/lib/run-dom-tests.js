const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');

async function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function runDomTests(projectDir = '.', previewPort = 4173) {
  const previewUrl = `http://localhost:${previewPort}`;
  const outputDir = path.join(projectDir, 'output');
  const screenshotsDir = path.join(outputDir, 'screenshots');
  const reportFile = path.join(outputDir, 'dom-report.txt');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  🌐 DOM & VISUAL TEST RUNNER");
  console.log("═══════════════════════════════════════════════════════\n");

  const distDir = path.join(projectDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error("❌ ERROR: dist/ directory not found. Please run your build first.");
    return false;
  }

  console.log(`── Checking preview server on ${previewUrl} ──`);
  const isRunning = await checkServer(previewUrl);
  if (!isRunning) {
    console.error("❌ ERROR: Preview server is not running.");
    console.error(`   Please start your server on port ${previewPort} (e.g., npm run preview).`);
    return false;
  }
  console.log("✅ Preview server is running\n");

  console.log("── Running browser-based DOM tests ──\n");

  const viewports = [
    { width: 375, height: 812, label: 'mobile' },
    { width: 768, height: 1024, label: 'tablet' },
    { width: 1440, height: 900, label: 'desktop' }
  ];

  const routes = ['/']; // Hardcoded for simplicity, could be discovered in the future

  let testCount = 0;
  let passCount = 0;
  let failCount = 0;
  let reportContent = `  DOM & VISUAL TEST REPORT\n  Generated: ${new Date().toISOString()}\n  Server: ${previewUrl}\n\n`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("❌ ERROR: Playwright chromium could not be launched.", err.message);
    return false;
  }

  for (const vp of viewports) {
    console.log(`   ┌─ Viewport: ${vp.label} (${vp.width}×${vp.height})`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    for (const route of routes) {
      testCount++;
      const routeSlug = route === '/' ? 'root' : route.replace(/\//g, '-');
      const screenshotName = `${routeSlug}-${vp.label}.png`;
      const screenshotPath = path.join(screenshotsDir, screenshotName);

      process.stdout.write(`   │  Testing ${route} ... `);

      try {
        await page.goto(`${previewUrl}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(2000); // Let animations settle
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const stats = fs.statSync(screenshotPath);
        if (stats.size < 5000) {
          console.log("⚠️  WARNING (tiny screenshot — possible blank page)");
          reportContent += `  [WARN] ${route} @ ${vp.label}: Screenshot only ${stats.size} bytes\n`;
          failCount++;
        } else {
          console.log("✅");
          reportContent += `  [PASS] ${route} @ ${vp.label}: ${screenshotName}\n`;
          passCount++;
        }
      } catch (err) {
        console.log("❌ FAIL");
        reportContent += `  [FAIL] ${route} @ ${vp.label}: Capture failed - ${err.message}\n`;
        failCount++;
      }
    }
    await context.close();
    console.log(`   └─ Done: ${vp.label}\n`);
  }

  await browser.close();

  reportContent += `\n  SUMMARY\n  Total tests: ${testCount}\n  Passed: ${passCount}\n  Failed/Warnings: ${failCount}\n`;
  fs.writeFileSync(reportFile, reportContent);

  console.log("═══════════════════════════════════════════════════════");
  if (failCount > 0) {
    console.log("  ❌ DOM TESTS COMPLETED WITH FAILURES");
  } else {
    console.log("  ✅ ALL DOM TESTS PASSED");
  }
  console.log("═══════════════════════════════════════════════════════");

  return failCount === 0;
}

module.exports = runDomTests;

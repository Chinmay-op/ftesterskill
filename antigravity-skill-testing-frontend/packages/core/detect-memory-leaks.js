const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, () => resolve(true));
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function detectMemoryLeaks(projectDir = '.', previewPort = 4173, idleSeconds = 10, heapThresholdMB = 20) {
  const previewUrl = `http://localhost:${previewPort}`;
  const reportFile = path.join(projectDir, 'output', 'memory-leak-report.txt');

  if (!fs.existsSync(path.join(projectDir, 'output'))) {
    fs.mkdirSync(path.join(projectDir, 'output'), { recursive: true });
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  🧠 MEMORY LEAK DETECTION");
  console.log(`  Server: ${previewUrl}`);
  console.log(`  Idle period: ${idleSeconds}s`);
  console.log(`  Heap threshold: ${heapThresholdMB}MB`);
  console.log("═══════════════════════════════════════════════════════\n");

  const isRunning = await checkServer(previewUrl);
  if (!isRunning) {
    console.error(`❌ ERROR: Server not reachable at ${previewUrl}`);
    return false;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("❌ ERROR: Playwright chromium could not be launched.", err.message);
    return false;
  }

  let fail = false;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    console.log(`Navigating to ${previewUrl}...`);
    await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Taking BEFORE heap snapshot...');
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(1000);

    const beforeMetrics = await page.evaluate(() => ({
      heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
      domNodes: document.querySelectorAll('*').length
    }));

    console.log('Simulating navigation...');
    const links = await page.$$('a[href]');
    const maxClicks = Math.min(links.length, 5);
    for (let i = 0; i < maxClicks; i++) {
      try {
        await links[i].click({ timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {}
    }

    console.log(`Idling for ${idleSeconds} seconds...`);
    await page.waitForTimeout(idleSeconds * 1000);

    console.log('Taking AFTER heap snapshot...');
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(1000);

    const afterMetrics = await page.evaluate(() => ({
      heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
      domNodes: document.querySelectorAll('*').length
    }));

    const heapDeltaMB = (afterMetrics.heapUsed - beforeMetrics.heapUsed) / 1024 / 1024;
    const domDelta = afterMetrics.domNodes - beforeMetrics.domNodes;

    const detachedCount = await page.evaluate(() => {
      let detached = 0;
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          if (!document.body.contains(walker.currentNode)) detached++;
        }
      } catch (e) {}
      return detached;
    });

    let verdict = 'NO_LEAK';
    if (heapDeltaMB > heapThresholdMB) {
      verdict = 'LEAK_DETECTED';
      fail = true;
    } else if (domDelta > 500 || detachedCount > 100) {
      verdict = 'DOM_LEAK_SUSPECTED';
      fail = true;
    }

    const reportContent = `  MEMORY LEAK DETECTION REPORT
  Generated: ${new Date().toISOString()}
  Server: ${previewUrl}

  JS Heap (before):     ${(beforeMetrics.heapUsed / 1024 / 1024).toFixed(2)} MB
  JS Heap (after):      ${(afterMetrics.heapUsed / 1024 / 1024).toFixed(2)} MB
  Heap delta:           ${heapDeltaMB.toFixed(2)} MB
  
  DOM nodes (before):   ${beforeMetrics.domNodes}
  DOM nodes (after):    ${afterMetrics.domNodes}
  DOM delta:            ${domDelta}
  Detached nodes:       ${detachedCount}

  VERDICT:              ${verdict}
`;

    fs.writeFileSync(reportFile, reportContent);
    console.log(`\nReport saved to: ${reportFile}`);

    console.log("═══════════════════════════════════════════════════════");
    if (fail) console.log("  ❌ LEAK DETECTED");
    else console.log("  ✅ NO LEAK DETECTED");
    console.log("═══════════════════════════════════════════════════════");

  } catch (err) {
    console.error("❌ SCRIPT ERROR:", err.message);
    fail = true;
  } finally {
    await browser.close();
  }

  return !fail;
}

module.exports = detectMemoryLeaks;

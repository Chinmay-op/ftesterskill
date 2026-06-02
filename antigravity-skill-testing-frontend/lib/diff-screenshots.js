const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

async function diffScreenshots(projectDir = '.', thresholdPct = 0.1) {
  const outputDir = path.join(projectDir, 'output');
  const screenshotsDir = path.join(outputDir, 'screenshots');
  const baselinesDir = path.join(outputDir, 'baselines');
  const diffsDir = path.join(outputDir, 'diffs');
  const reportFile = path.join(outputDir, 'diff-report.txt');

  if (!fs.existsSync(diffsDir)) fs.mkdirSync(diffsDir, { recursive: true });

  console.log("═══════════════════════════════════════════════════════");
  console.log("  🔍 VISUAL REGRESSION DIFF");
  console.log(`  Threshold: ${thresholdPct}%`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (!fs.existsSync(screenshotsDir)) {
    console.error("❌ ERROR: Screenshots directory not found.");
    return false;
  }
  if (!fs.existsSync(baselinesDir)) {
    console.error("❌ ERROR: Baselines directory not found. Please run baseline capture first.");
    return false;
  }

  let reportContent = `  VISUAL REGRESSION REPORT\n  Generated: ${new Date().toISOString()}\n\n`;
  reportContent += `FILE                                          DIFF %     STATUS\n`;
  reportContent += `────                                          ──────     ──────\n`;

  let total = 0, passed = 0, changed = 0, missing = 0, fail = false;

  const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));

  for (const filename of files) {
    total++;
    const currentPath = path.join(screenshotsDir, filename);
    let baselinePath = path.join(baselinesDir, filename.replace('.png', '-baseline.png'));
    
    if (!fs.existsSync(baselinePath)) {
      baselinePath = path.join(baselinesDir, filename);
    }

    const paddedName = filename.padEnd(45).substring(0, 45);

    if (!fs.existsSync(baselinePath)) {
      console.log(`   ⚠️  No baseline for: ${filename}`);
      reportContent += `${paddedName}          N/A    NO BASE\n`;
      missing++;
      continue;
    }

    try {
      const img1 = PNG.sync.read(fs.readFileSync(currentPath));
      const img2 = PNG.sync.read(fs.readFileSync(baselinePath));

      const width = Math.max(img1.width, img2.width);
      const height = Math.max(img1.height, img2.height);
      const diff = new PNG({ width, height });

      let diffPixels = 0;
      if (img1.width !== img2.width || img1.height !== img2.height) {
        diffPixels = width * height; // Total size mismatch
      } else {
        diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
      }

      const pct = (diffPixels / (width * height)) * 100;
      const diffOutputPath = path.join(diffsDir, `diff-${filename}`);
      fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

      const formattedPct = pct.toFixed(2);
      
      if (pct > thresholdPct) {
        console.log(`   ❌ CHANGED: ${filename} (${formattedPct}% diff)`);
        reportContent += `${paddedName} ${String(formattedPct + '%').padStart(12)}    ❌ FAIL\n`;
        changed++;
        fail = true;
      } else {
        console.log(`   ✅ Match: ${filename} (${formattedPct}% diff)`);
        reportContent += `${paddedName} ${String(formattedPct + '%').padStart(12)}    ✅ PASS\n`;
        passed++;
      }
    } catch (err) {
      console.log(`   ⚠️  Error comparing: ${filename} - ${err.message}`);
      reportContent += `${paddedName}        ERROR         ⚠️\n`;
      fail = true;
    }
  }

  reportContent += `\n  SUMMARY\n  Total compared: ${total}\n  Passed: ${passed}\n  Changed: ${changed}\n  Missing baseline: ${missing}\n`;
  fs.writeFileSync(reportFile, reportContent);

  console.log("\n═══════════════════════════════════════════════════════");
  if (fail) {
    console.log("  ❌ VISUAL REGRESSIONS DETECTED");
  } else {
    console.log("  ✅ NO VISUAL REGRESSIONS");
  }
  console.log("═══════════════════════════════════════════════════════");

  return !fail;
}

module.exports = diffScreenshots;

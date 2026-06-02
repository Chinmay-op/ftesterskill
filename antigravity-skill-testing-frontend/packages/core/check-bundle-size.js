const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

async function checkBundleSize(distDir, maxKb = 250) {
  let fail = false;

  console.log("═══════════════════════════════════════════════════════");
  console.log(`  📦 BUNDLE SIZE CHECK — ${distDir} (max: ${maxKb}KB gzipped)`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (!fs.existsSync(distDir)) {
    console.error(`❌ ERROR: Directory '${distDir}' does not exist.`);
    console.error("   Run your production build first.");
    return false;
  }

  const filesToScan = [];
  walkDir(distDir, (p) => {
    if (p.endsWith('.js')) {
      filesToScan.push(p);
    }
  });

  let totalRaw = 0;
  let totalGz = 0;
  let overLimit = 0;

  console.log("FILE                                               RAW (KB)  GZIP (KB) STATUS");
  console.log("────                                               ────────  ────────  ──────");

  for (const file of filesToScan) {
    const basename = path.basename(file);
    const content = fs.readFileSync(file);
    const rawBytes = content.length;
    const rawKb = Math.round(rawBytes / 1024);

    const gzBytes = zlib.gzipSync(content).length;
    const gzKb = Math.round(gzBytes / 1024);

    totalRaw += rawKb;
    totalGz += gzKb;

    let status = "✅";
    if (gzKb > maxKb) {
      status = "❌ OVER LIMIT";
      overLimit++;
      fail = true;
    }

    const paddedName = basename.padEnd(50).substring(0, 50);
    const paddedRaw = `${rawKb}KB`.padStart(8);
    const paddedGz = `${gzKb}KB`.padStart(8);
    
    console.log(`${paddedName} ${paddedRaw}  ${paddedGz}  ${status}`);
  }

  console.log("");
  console.log(`${"TOTAL".padEnd(50)} ${String(totalRaw + "KB").padStart(8)}  ${String(totalGz + "KB").padStart(8)}`);
  console.log("");

  console.log("═══════════════════════════════════════════════════════");
  if (fail) {
    console.log(`  ⚠️  ${overLimit} chunk(s) exceed ${maxKb}KB gzipped.`);
    console.log("  Consider code-splitting, tree-shaking, or lazy loading.");
    console.log("═══════════════════════════════════════════════════════");
    return false;
  } else {
    console.log(`  ✅ All chunks are within the ${maxKb}KB gzipped limit.`);
    console.log("═══════════════════════════════════════════════════════");
    return true;
  }
}

module.exports = checkBundleSize;

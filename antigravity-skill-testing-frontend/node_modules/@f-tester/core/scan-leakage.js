const fs = require('fs');
const path = require('path');

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

async function scanLeakage(distDir) {
  let fail = false;

  console.log("═══════════════════════════════════════════════════════");
  console.log(`  🔍 LEAKAGE SCAN — ${distDir}`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (!fs.existsSync(distDir)) {
    console.error(`❌ ERROR: Directory '${distDir}' does not exist.`);
    console.error("   Run your production build first.");
    return false;
  }

  const filesToScan = [];
  walkDir(distDir, (p) => {
    // Only scan readable text files like js, css, html, json
    if (/\.(js|css|html|json|txt|map)$/.test(p)) {
      filesToScan.push(p);
    }
  });

  const secretRegex = /(api_key|apikey|secret|password|token|bearer)\s*[:=]\s*['"][^'"]{8,}/gi;
  const envRegex = /REACT_APP_|VITE_|NEXT_PUBLIC_/g;
  const internalRegex = /(localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.\d+\.\d+|staging\.|internal\.)/g;

  let secretLeaks = [];
  let envLeaks = [];
  let internalLeaks = [];

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (secretRegex.test(line)) {
        secretLeaks.push(`${file}:${index + 1} - ${line.substring(0, 100).trim()}`);
      }
      if (envRegex.test(line)) {
        envLeaks.push(`${file}:${index + 1} - ${line.substring(0, 100).trim()}`);
      }
      if (internalRegex.test(line)) {
        internalLeaks.push(`${file}:${index + 1} - ${line.substring(0, 100).trim()}`);
      }
    });
  }

  // 1. Exposed Secrets
  console.log("── 1/3: Scanning for exposed secrets (api_key, token, password, etc.) ──");
  if (secretLeaks.length > 0) {
    console.log("❌ FAIL: Possible secrets found in bundle output:");
    secretLeaks.slice(0, 20).forEach(l => console.log(l));
    console.log();
    fail = true;
  } else {
    console.log("✅ PASS: No exposed secrets detected.\n");
  }

  // 2. Baked-in Env Variables
  console.log("── 2/3: Scanning for baked-in environment variables ──");
  if (envLeaks.length > 0) {
    console.log("⚠️  WARNING: Environment variable references found in bundle:");
    envLeaks.slice(0, 20).forEach(l => console.log(l));
    console.log("\n   Review each match. Public env vars (e.g., NEXT_PUBLIC_SITE_URL)");
    console.log("   may be intentional. Secret values must never be bundled.\n");
    fail = true;
  } else {
    console.log("✅ PASS: No environment variable references in bundle.\n");
  }

  // 3. Internal IPs
  console.log("── 3/3: Scanning for internal IPs, localhost, and staging URLs ──");
  if (internalLeaks.length > 0) {
    console.log("❌ FAIL: Internal/staging references found in bundle:");
    internalLeaks.slice(0, 20).forEach(l => console.log(l));
    console.log();
    fail = true;
  } else {
    console.log("✅ PASS: No internal IPs or staging URLs detected.\n");
  }

  console.log("═══════════════════════════════════════════════════════");
  if (fail) {
    console.log("  ❌ LEAKAGE SCAN FAILED — Review issues above.");
    console.log("═══════════════════════════════════════════════════════");
    return false;
  } else {
    console.log("  ✅ LEAKAGE SCAN PASSED — No issues found.");
    console.log("═══════════════════════════════════════════════════════");
    return true;
  }
}

module.exports = scanLeakage;

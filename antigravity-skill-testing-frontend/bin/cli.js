#!/usr/bin/env node

const path = require('path');
const scanLeakage = require('../lib/scan-leakage');
const checkBundleSize = require('../lib/check-bundle-size');
const runDomTests = require('../lib/run-dom-tests');
const diffScreenshots = require('../lib/diff-screenshots');
const detectMemoryLeaks = require('../lib/detect-memory-leaks');
const initSkill = require('../lib/init-skill');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
f-tester CLI — Comprehensive Frontend UI & Security Checker

Usage: f-tester <command> [options]

Commands:
  scan-leakage [dist]   Scan build output for exposed secrets/IPs.
  bundle-size [dist]    Check for bundle size regressions.
  dom-tests             Run Playwright DOM tests and take screenshots.
  diff-screenshots      Compare current screenshots to baselines.
  memory-leaks          Run heap snapshot comparisons for memory leaks.
  init-skill            Initialize the AI agent skill in your current project.
  run all               Run the entire testing suite.
  `);
  process.exit(0);
}

const targetDir = args[1] || './dist';
const projectDir = process.cwd();

async function main() {
  console.log('🚀 Starting f-tester...');
  let success = true;
  
  if (command === 'scan-leakage' || command === 'run all') {
    success = await scanLeakage(path.resolve(projectDir, targetDir)) && success;
  }
  
  if (command === 'bundle-size' || command === 'run all') {
    success = await checkBundleSize(path.resolve(projectDir, targetDir)) && success;
  }
  
  if (command === 'dom-tests' || command === 'run all') {
    success = await runDomTests(projectDir) && success;
  }
  
  if (command === 'diff-screenshots' || command === 'run all') {
    success = await diffScreenshots(projectDir) && success;
  }
  
  if (command === 'memory-leaks' || command === 'run all') {
    success = await detectMemoryLeaks(projectDir) && success;
  }
  
  if (command === 'init-skill') {
    success = await initSkill(projectDir) && success;
  }

  if (!success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ An unexpected error occurred:', err);
  process.exit(1);
});

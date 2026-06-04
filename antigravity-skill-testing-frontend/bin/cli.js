#!/usr/bin/env node

const path = require('path');
const core = require('../packages/core');
const initSkill = require('../packages/cli/init-skill');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
f-tester Pro Max — Comprehensive Frontend UI & Security Checker

Usage: f-tester <command> [options]

Commands:
  init-skill            Initialize the AI agent skill in your current project.
  scan-leakage [dist]   Scan build output for exposed secrets/IPs.
  bundle-size [dist]    Check for bundle size regressions.
  dom-tests             Run Playwright DOM tests and take screenshots.
  diff-screenshots      Compare current screenshots to baselines.
  memory-leaks          Run heap snapshot comparisons for memory leaks.
  run-all               Run the entire testing suite.
  doctor                Run environment diagnostics.

Version: 2.0.0
Docs:    https://github.com/Chinmay-op/ftesterskill
  `);
  process.exit(0);
}

const targetDir = args[1] || './dist';
const projectDir = process.cwd();

async function main() {
  let success = true;

  if (command === 'init-skill') {
    success = await initSkill(projectDir);
    process.exit(success ? 0 : 1);
    return;
  }

  if (command === 'doctor') {
    const fs = require('fs');
    console.log('🩺 Running f-tester diagnostics...');
    console.log(`Node version: ${process.version}`);

    const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
    console.log(`package.json found: ${hasPackageJson ? '✅' : '❌'}`);

    const distPath = path.resolve(projectDir, targetDir);
    const hasDist = fs.existsSync(distPath);
    console.log(`Target build dir (${distPath}): ${hasDist ? '✅' : '❌ (run your build step first)'}`);

    const skillPath = path.join(projectDir, '.agent', 'skills', 'testing-frontend', 'SKILL.md');
    const hasSkill = fs.existsSync(skillPath);
    console.log(`f-tester skill installed: ${hasSkill ? '✅' : '❌ (run: npx f-tester init-skill)'}`);

    console.log('Diagnostics complete.');
    process.exit(0);
    return;
  }

  console.log('🚀 Starting f-tester...');

  if (command === 'scan-leakage' || command === 'run-all') {
    success = await core.scanLeakage(path.resolve(projectDir, targetDir)) && success;
  }

  if (command === 'bundle-size' || command === 'run-all') {
    success = await core.checkBundleSize(path.resolve(projectDir, targetDir)) && success;
  }

  if (command === 'dom-tests' || command === 'run-all') {
    success = await core.runDomTests(projectDir) && success;
  }

  if (command === 'diff-screenshots' || command === 'run-all') {
    success = await core.diffScreenshots(projectDir) && success;
  }

  if (command === 'memory-leaks' || command === 'run-all') {
    success = await core.detectMemoryLeaks(projectDir) && success;
  }

  if (!['scan-leakage', 'bundle-size', 'dom-tests', 'diff-screenshots', 'memory-leaks', 'run-all'].includes(command)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Run "f-tester --help" for available commands.');
    process.exit(1);
  }

  if (!success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ An unexpected error occurred:', err);
  process.exit(1);
});

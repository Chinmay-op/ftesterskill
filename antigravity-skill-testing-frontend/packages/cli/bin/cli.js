#!/usr/bin/env node

const { Command } = require('commander');
const { cosmiconfigSync } = require('cosmiconfig');
const path = require('path');
const fs = require('fs');
const core = require('@f-tester/core');
const initSkill = require('../lib/init-skill'); // We'll create this

const program = new Command();
const explorer = cosmiconfigSync('f-tester');

program
  .name('f-tester')
  .description('Comprehensive Frontend Testing CLI and AI Skill')
  .version('1.0.0');

// Load config
const loadConfig = () => {
  const result = explorer.search();
  return result ? result.config : {};
};

program
  .command('scan-leakage [dir]')
  .description('Scan build output for exposed secrets/IPs')
  .action(async (dir) => {
    const config = loadConfig();
    const targetDir = path.resolve(process.cwd(), dir || config.targetDir || './dist');
    const success = await core.scanLeakage(targetDir);
    process.exit(success ? 0 : 1);
  });

program
  .command('bundle-size [dir]')
  .description('Check for bundle size regressions')
  .action(async (dir) => {
    const config = loadConfig();
    const targetDir = path.resolve(process.cwd(), dir || config.targetDir || './dist');
    const success = await core.checkBundleSize(targetDir);
    process.exit(success ? 0 : 1);
  });

program
  .command('dom-tests')
  .description('Run Playwright DOM tests and take screenshots')
  .action(async () => {
    const config = loadConfig();
    const success = await core.runDomTests(process.cwd(), config.previewPort || 4173);
    process.exit(success ? 0 : 1);
  });

program
  .command('diff-screenshots')
  .description('Compare current screenshots to baselines')
  .action(async () => {
    const success = await core.diffScreenshots(process.cwd());
    process.exit(success ? 0 : 1);
  });

program
  .command('memory-leaks')
  .description('Run heap snapshot comparisons for memory leaks')
  .action(async () => {
    const success = await core.detectMemoryLeaks(process.cwd());
    process.exit(success ? 0 : 1);
  });

program
  .command('init-skill')
  .description('Initialize the AI agent skill in your current project')
  .action(async () => {
    const success = await initSkill(process.cwd());
    process.exit(success ? 0 : 1);
  });

program
  .command('doctor')
  .description('Run environment diagnostics')
  .action(() => {
    console.log('🩺 Running f-tester diagnostics...');
    const config = loadConfig();
    console.log(`Config loaded: ${Object.keys(config).length > 0 ? 'Yes' : 'No (using defaults)'}`);
    
    // Check Node version
    console.log(`Node version: ${process.version}`);
    
    // Check package.json presence
    const hasPackageJson = fs.existsSync(path.join(process.cwd(), 'package.json'));
    console.log(`package.json found: ${hasPackageJson ? '✅' : '❌'}`);
    
    // Check target dir
    const targetDir = path.resolve(process.cwd(), config.targetDir || './dist');
    const hasTargetDir = fs.existsSync(targetDir);
    console.log(`Target build dir (${targetDir}): ${hasTargetDir ? '✅' : '❌ (run your build step first)'}`);

    console.log('Diagnostics complete.');
  });

program
  .command('run-all')
  .description('Run the entire testing suite')
  .action(async () => {
    console.log('🚀 Running full f-tester suite...');
    const config = loadConfig();
    const targetDir = path.resolve(process.cwd(), config.targetDir || './dist');
    
    let success = true;
    success = await core.scanLeakage(targetDir) && success;
    success = await core.checkBundleSize(targetDir) && success;
    success = await core.runDomTests(process.cwd(), config.previewPort || 4173) && success;
    success = await core.diffScreenshots(process.cwd()) && success;
    success = await core.detectMemoryLeaks(process.cwd()) && success;
    
    process.exit(success ? 0 : 1);
  });

program.parse();

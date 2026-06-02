const checkBundleSize = require('./check-bundle-size');
const detectMemoryLeaks = require('./detect-memory-leaks');
const diffScreenshots = require('./diff-screenshots');
const runDomTests = require('./run-dom-tests');
const scanLeakage = require('./scan-leakage');

module.exports = {
  checkBundleSize,
  detectMemoryLeaks,
  diffScreenshots,
  runDomTests,
  scanLeakage
};

# CI Integration

f-tester is designed to be run in CI environments like GitHub Actions or GitLab CI.

## Best Practices
1. **Always build first**: Run `npm run build` before `f-tester run-all`.
2. **Retain Artifacts**: f-tester produces `output/report.md`, JSON files, traces, and screenshots. Upload these as CI artifacts for debugging.
3. **Trace Retention**: On failures, Playwright traces are saved in `output/traces/`. You can view them at trace.playwright.dev.

# Reporting

f-tester generates two main outputs when the test suite runs:

1. **Markdown Report** (`report.md`): A rich, human-readable document featuring an Executive Summary, Health Score, Domain Details, and a Hesitation Map. It embeds screenshots directly.
2. **JSON Report** (`report.json`): A machine-readable output ideal for sending to custom dashboards or triggering CI failing thresholds.

Configure which reporters run in your `f-tester.config.ts`.

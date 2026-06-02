# f-tester (Frontend Tester CLI & Agent Skill)

`f-tester` is a dual-purpose frontend testing tool. It operates as a comprehensive, standalone **CLI tool** for developers to manually test their UI, check regressions, and scan for vulnerabilities. More powerfully, it acts as a **distributable AI Skill** that teaches AI coding agents exactly how to test frontend applications autonomously.

You can use it in any web project (React, Vue, Next.js, etc.) regardless of your IDE.

---

## 1. Using it as a Standalone CLI

You can run `f-tester` directly against your project's build output to scan for exposed secrets, bundle size bloat, or run DOM tests.

### Installation & Usage

You don't need to install anything to try it out. Just use `npx` in your project folder:

```bash
npx f-tester --help
```

Or install it globally for frequent use:

```bash
npm install -g f-tester
```

Example: Scan your `dist` directory for exposed secrets or hardcoded staging URLs:

```bash
npx f-tester scan-leakage ./dist
```

### Available CLI Commands
- `scan-leakage [dir]`: Scans your build output for API keys, un-substituted environment variables, and internal IP references.
- `bundle-size [dir]`: Checks for bundle size regressions.
- `dom-tests`: Runs Playwright DOM tests and takes screenshots.
- `diff-screenshots`: Compares current screenshots to baselines.
- `memory-leaks`: Runs heap snapshot comparisons for memory leaks.
- `init-skill`: Initializes the AI agent skill in your current project.
- `run all`: Runs the entire testing suite.

---

## 2. Using it as an AI Agent Skill (The Magic Part)

Most AI coding agents lack context about specialized testing workflows. `f-tester` comes with a built-in "Skill" that gives your AI agent specialized knowledge for UI testing.

When installed, your AI agent will automatically know how to trigger UI tests, capture DOM baselines, check for HTTP 500 errors, and analyze results using Playwright. 

### How to Install the Skill

Simply run this command inside your project directory:

```bash
npx f-tester init-skill
```

**What this does:**
The CLI will automatically generate an `.agent/skills/testing-frontend` directory inside your current project and copy all the specialized AI instructions (`SKILL.md`) and helper scripts into it. 

### How to Use the Skill

Once initialized, just tell your AI coding assistant:
> *"Check my UI"* or *"Run a frontend test"*

Your AI agent will detect the skill, read the instructions, and instantly become a senior QA engineer that follows hardened testing protocols.

---

## License
MIT

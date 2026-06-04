# f-tester Pro Max

[![npm version](https://img.shields.io/npm/v/f-tester.svg?style=flat-square)](https://www.npmjs.com/package/f-tester)
[![npm downloads](https://img.shields.io/npm/dm/f-tester.svg?style=flat-square)](https://www.npmjs.com/package/f-tester)
[![GitHub stars](https://img.shields.io/github/stars/Chinmay-op/ftesterskill.svg?style=flat-square)](https://github.com/Chinmay-op/ftesterskill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> An AI skill that provides **testing intelligence** for building bulletproof, human-validated frontends.

**16 Testing Domains** · **6 Human Personas** · **10 UX Heuristics** · **Playwright Integration**

---

## Quick Install

```bash
# One-command install into your project
npx f-tester init-skill

# Or install globally
npm install -g f-tester
```

Then ask your AI agent:

> "Test the frontend"
> "Run a UX audit"
> "Check for security leaks"
> "Evaluate design system consistency"

---

## What It Does

f-tester Pro Max is a comprehensive AI-powered frontend testing skill that runs **16 testing domains** including:

- 🔒 **Security & Leakage** — Exposed keys, SRI, dependency audit
- 🧪 **API Endpoint Testing** — Status codes, CORS, rate limiting
- ♿ **Accessibility (A11Y)** — Axe-core, cognitive load, keyboard-first flows
- ⚡ **Performance & Core Web Vitals** — LCP, INP, CLS diagnostics
- 🎭 **Persona-Driven Testing** — 6 human personas with friction scoring
- 🔍 **UX Heuristic Evaluation** — Nielsen's 10 heuristics
- 🎨 **Visual Perception & Brand Fit** — Taste critique, visual calm, rhythm
- 🏗️ **Design System Consistency** — Token coverage, component drift
- ✍️ **UX Writing & Microcopy Quality** — CTA labels, terminology audit
- 🔴 **Point of Breakage Detection** — Exact error location + stack traces
- 📸 **Visual Regression** — Screenshot baselines + pixel diffing

---

## Documentation

Full documentation is in [`antigravity-skill-testing-frontend/README.md`](./antigravity-skill-testing-frontend/README.md).

---

## Repository Structure

```
├── .agent/skills/testing-frontend/    # Development version of the skill (latest)
│   ├── SKILL.md                       # 16-domain testing intelligence (1200+ lines)
│   ├── scripts/                       # 10 automated scanning scripts
│   ├── examples/                      # 10 Playwright test templates
│   └── references/                    # Report template + sample report
│
├── antigravity-skill-testing-frontend/ # npm package (publishable)
│   ├── bin/                           # CLI entry point
│   ├── packages/                      # Monorepo modules (cli, core, heuristics, personas, reporter)
│   ├── templates/                     # Installable skill template (synced from .agent/)
│   ├── package.json                   # npm publish config
│   └── README.md                      # Full documentation
│
└── README.md                          # This file
```

---

## Contributing

```bash
git clone https://github.com/Chinmay-op/ftesterskill.git
cd ftesterskill
```

See [CONTRIBUTING.md](./antigravity-skill-testing-frontend/CONTRIBUTING.md) for guidelines.

---

## License

MIT © [Chinmay-op](https://github.com/Chinmay-op)

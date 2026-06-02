# Contributing to f-tester

First off, thank you for considering contributing to `f-tester`! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## Monorepo Structure
We use an npm workspaces monorepo structure. All logic lives in `packages/`:
- `cli`: Orchestrates commands and config
- `core`: Heavy lifting (Playwright, Scans)
- `reporter`: Output generation
- `personas` / `heuristics`: AI human-like testing modules

## Local Development
1. Clone the repo
2. Run `npm install`
3. Run `npx tsc` (if applicable) or use directly via `node packages/cli/bin/cli.js`

## Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Issue that pull request!

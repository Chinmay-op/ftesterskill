# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-04

### Added
- **16 Testing Domains** — expanded from 13 to 16 with 3 new domains:
  - Domain 14: Visual Perception, Brand Fit & Taste Critique
  - Domain 15: Design System Consistency
  - Domain 16: UX Writing & Microcopy Quality
- **Publishable npm package** — `npx f-tester init-skill` one-command install
- **3 installation methods** — npx init, npm global, git clone
- **Full `init-skill` command** — copies complete skill with all scripts, examples, and references
- **GitHub Actions CI/CD** — automated publish on release, CI validation on PR
- **Real shields.io badges** in README
- **Template sync** — all 10 scripts, 10 examples, and 2 references included in npm package
- Core Web Vitals evaluator (`cwv-performance-evaluator.ts`)
- Visual perception evaluator (`visual-perception-evaluator.ts`)
- Design system evaluator (`design-system-evaluator.ts`)
- Microcopy evaluator (`microcopy-evaluator.ts`)
- Inclusive accessibility scanner (`check-inclusive-a11y.sh`)
- CWV diagnostics scanner (`check-cwv-diagnostics.sh`)
- Visual perception scanner (`check-visual-perception.sh`)

### Changed
- Bumped version from 1.0.0 to 2.0.0
- Updated README with correct GitHub URLs and contributor instructions
- Restructured `bin/cli.js` entry point for direct npm bin usage
- Updated package.json with proper npm publish metadata (repository, homepage, engines, files)

### Fixed
- `init-skill` command was a stub that just logged "Done" — now fully functional
- Template skill was outdated (13 domains) — now synced to 16-domain version
- `bin` field in package.json pointed to wrong path — fixed to `bin/cli.js`
- Missing `.npmignore` and `.gitignore` — both added

## [1.0.0] - 2026-05-30

### Added
- Complete monorepo restructure for modular maintainability.
- Added `packages/cli` using commander and cosmiconfig for robust CLI parsing.
- Added 13-domain human-like testing capabilities (Persona Journeys, UX Heuristics, Perceived Quality).
- Added `f-tester.config.ts` support.
- Added diagnostic `doctor` command.
- Trace-friendly Playwright test infrastructure.

# tests/e2e/

PR-1 placeholder — substantive end-to-end tests land per flow.

Per architecture §Test organization (architecture lines 4621-4624), this directory is the home for cross-stack end-to-end flow tests (Playwright for web; Maestro or Playwright for mobile). The PR-1 bootstrap creates the home; substantive flow tests land per the named user journeys as they materialize.

`apps/mobile/playwright.config.ts` + `apps/mobile/tests/` (Story 0.14 prototype-validation tests) are preserved in the mobile workspace and are NOT moved here.

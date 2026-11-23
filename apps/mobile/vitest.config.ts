// Vitest config for the mobile app's PURE-LOGIC unit tests (Story 6.2, Task 9).
//
// The mobile app ships via EAS Build. Native layout still requires a device / RN renderer.
// Most tests exercise PURE logic; peer-questionnaire-render opts into jsdom and mocks native
// primitives to verify the real component's hooks and handlers. Tests remain scoped to
// `tests/unit/**` so it never picks up the Playwright web-export e2e (`tests/export.test.ts`).

import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Story 3.15b (DL6) — `lib/announce-repeat.ts` keeps a per-text counter in module state, and vitest isolates modules per
    // FILE, not per test: this setup file resets it before every test. It must ⛔ import `react-native` (it runs before each
    // file's `vi.mock`).
    setupFiles: ['tests/unit/setup-announce-repeat.ts'],
  },
})

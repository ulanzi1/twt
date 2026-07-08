// Vitest config for the mobile app's PURE-LOGIC unit tests (Story 6.2, Task 9).
//
// The mobile app ships via EAS Build and has no RN component-render test harness in this repo
// (component MOUNT tests would need a react-native renderer). This config runs the node-testable
// PURE logic only — the claim step-order + the save-and-resume draft store — scoped to
// `tests/unit/**` so it never picks up the Playwright web-export e2e (`tests/export.test.ts`).

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})

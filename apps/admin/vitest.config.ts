// Vitest config for @twt/admin (Story 1.11b, Task 2.4).
//
// Reuses vite.config.ts's plugins (React JSX transform via @vitejs/plugin-react) so
// component tests render real TSX, and runs them under jsdom with React Testing
// Library + jest-dom matchers (tests/setup.ts). CSS is disabled — the Tailwind v4
// plugin is for the build/dev surface, not the DOM-assertion tests.

import { mergeConfig, defineConfig } from 'vitest/config';

import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      css: false,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      passWithNoTests: true,
    },
  }),
);

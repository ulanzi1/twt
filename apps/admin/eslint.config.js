// ESLint flat config for @twt/admin (Story 1.11b).
//
// Extends the shared baseline (@twt/eslint-config-twt) but layers BROWSER globals
// + JSX parsing for the React SPA sources (the baseline ships Node globals only),
// plus the react-hooks rules. Generated/build outputs are ignored.

import twtConfig from '@twt/eslint-config-twt';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  ...twtConfig,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // The Vite/Vitest config files run in a Node context.
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
];

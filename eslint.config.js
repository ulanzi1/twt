// Root flat config re-exports the shared baseline from @twt/eslint-config-twt.
// Per architecture §ESLint commitment (architecture line 3974) the shared
// config lives in packages/eslint-config-twt/; this root config wires it for
// any files at the repo root + provides a default ignore set.

import twtConfig from '@twt/eslint-config-twt';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      '_bmad/**',
      '_bmad-output/**',
      'design-artifacts/**',
      'docs/**',
      'infra/**',
      'apps/mobile/.expo/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
    ],
  },
  ...twtConfig,
];

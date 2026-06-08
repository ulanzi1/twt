// @twt/eslint-config-twt — shared ESLint 9 flat config baseline.
//
// Per architecture §ESLint commitment (architecture line 3974) the shared
// config lives here. Per architecture §Consolidated ESLint-rule inventory
// (architecture lines 3980-3984), this file is the canonical home for
// CI-enforced lint rules; the README at sibling path documents the rule
// inventory + cadence.
//
// At PR-1 the active rule set is intentionally minimal:
//   - js.configs.recommended (ESLint built-in baseline)
//   - typescript-eslint.configs.recommended (TS baseline)
//   - eslint-config-prettier (suppress formatting rules; Prettier owns them)
//   - no-restricted-imports blocking relative cross-package paths per
//     architecture §Cross-workspace imports use the package name
//     (architecture lines 3779-3781).
//
// The substantive architecture-day-1 rules (raw `logger.error` ban; `Date.now()`
// ban in business-logic packages; `as any` ban; cross-store Zustand import ban;
// raw-SQL camelCase ban; type-shadowing-of-contracts ban) are TODO-marked here
// and activate per-Story as the surfaces they govern materialize. See README §2
// for the activation roster.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Regex catches relative imports at any depth that cross into a sibling workspace.
              // e.g., ../../packages/events, ../../../apps/mobile — any number of ../ levels.
              regex: '^(?:\\.\\./)+(?:packages|apps)/',
              message:
                'Cross-workspace imports must use the package name (e.g., @twt/events), not relative paths. Per architecture §Cross-workspace imports use the package name (architecture lines 3779-3781).',
            },
          ],
        },
      ],
      // TODO Story 1.10 — ban raw `logger.error`; require the audit-log wrapper.
      // TODO Stories 1.X (business-logic packages) — ban `Date.now()` + `new Date()` in business-logic packages; require clock injection per architecture essential-pattern row (architecture line 3618).
      // TODO Story 1.X — ban `as any` + `as unknown as T` outside test fixtures per architecture §Top-10 anti-patterns (architecture lines 4074-4090).
      // TODO Story 1.X — ban cross-store Zustand imports per architecture state-management essential-pattern.
      // TODO Stories that introduce raw SQL — ban camelCase in raw SQL strings (snake_case at the database boundary).
      // TODO Story 1.4 + downstream — ban type-shadowing of packages/contracts/ exports.
      // TODO Phase-2/3 crowdfunding module — gateway-SDK dependency-lint rule per architecture §Crowdfunding Boundary Rule (architecture lines 458-477).
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
];

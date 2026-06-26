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
  {
    // Ignore generated build outputs across every consumer of this config.
    // `tsc -p tsconfig.json` emits `.d.ts` files to `dist/` that contain
    // drizzle-orm-emitted `{}` empty-object types (and other patterns) which
    // are not under our control. Linting build outputs has no value; we lint
    // sources. ESLint 9 flat-config ignores are global when the config block
    // contains only `ignores`.
    ignores: ['**/dist/**', '**/.next/**', '**/.expo/**', '**/build/**', '**/coverage/**'],
  },
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
      // Story 1.16a (deferred D1-1.6) — DB-driver containment. Constructing a raw
      // `pg` Pool / Client belongs only in the data layer (packages/domain:
      // `db.ts` constructs THE application pool; `cross-tenant/` is the single
      // named service-role surface). Apps + other packages receive connections
      // via dependency injection. `import type pg from 'pg'` is allowed
      // everywhere (typing an injected pool is not constructing one), hence
      // `allowTypeImports`. Architecture §1.2 (lines 736-740, 764-770) commits
      // "raw service-role connection construction is forbidden outside the named
      // cross-tenant module"; this is the achievable, lint-green realization of
      // that property given the data layer (not `cross-tenant/`, which only
      // RECEIVES pools by parameter) is where pools are actually constructed.
      // The carve-out override block below exempts packages/domain + test code,
      // which construct real pools by necessity. See README §1.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              message:
                "Construct DB pools only in the data layer (packages/domain: db.ts / cross-tenant/). Apps + packages receive connections via DI. `import type pg from 'pg'` is fine. Per architecture §1.2 (lines 736-740, 764-770) + Story 1.16a / deferred D1-1.6.",
              allowTypeImports: true,
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
      // TODO Story 3.3a (optional dev-time companion) — ban the DigiLocker transport
      // (`xml-crypto` / `@xmldom/xmldom` / `xpath` / `@xmldom/is-dom-node`) outside
      // `apps/api/src/modules/kyc/providers/digilocker/**`. PARKED (not active) because
      // this shared config runs per-package with cwd-relative globs, so a base ban + a
      // digilocker carve-out would have to re-declare the whole `no-restricted-imports`
      // rule to preserve the `pg` ban — net risk > value for a dev-time signal. The
      // AUTHORITATIVE teeth are the `kyc-provider-boundary` CI gate
      // (scripts/kyc-provider-boundary/, Story 3.3a AC3 / AR-43); this lint rule would
      // only be an earlier editor-time hint. Mirrors the parked crowdfunding-SDK TODO above.
    },
  },
  {
    // Carve-out for the D1-1.6 `pg`-import rule (Story 1.16a). NOTE: this shared
    // flat config is run per-package (`eslint .` from each workspace dir), so
    // `files` globs match RELATIVE TO EACH PACKAGE'S cwd — a package-path glob
    // like `packages/domain/**` would never match (the file is seen as
    // `src/db.ts`). So the carve-out is expressed by file ROLE, cwd-relative:
    // the conventional DB-module file (`db.ts` — where `new pg.Pool()` legitimately
    // lives, e.g. `packages/domain/src/db.ts`), test-utility helpers, and test
    // code (which construct real pools by necessity). Scattered `pg` value-imports
    // anywhere else (handlers, services, app entrypoints) stay banned — they must
    // receive connections via DI. The cross-workspace relative-import ban (base
    // `no-restricted-imports`) stays in force here.
    files: ['**/db.ts', '**/test-utils/**', '**/*.test.ts', '**/*.spec.ts', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
];

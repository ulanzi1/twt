// apps/public ESLint — the shared TWT baseline + Astro support.
//
// `eslint-plugin-astro`'s flat/recommended config adds the `astro-eslint-parser`
// for `.astro` files (so the shared TS baseline, which sets the TS parser for
// everything, is overridden for `.astro` by these later blocks) plus the Astro
// component rules. The shared config's cross-workspace relative-import ban + the
// `pg` value-import ban stay in force (we import `@twt/*` by package name; the
// DB pool is constructed in `src/lib/db.server.ts`, the conventional `db`-role
// file the shared carve-out exempts). Per-package cwd-relative globs apply
// (see [[project_eslint_config_per_package_cwd]]).
import astro from 'eslint-plugin-astro';

import twtConfig from '@twt/eslint-config-twt';

export default [
  { ignores: ['dist/**', '.astro/**'] },
  ...twtConfig,
  ...astro.configs['flat/recommended'],
  {
    // Astro's `src/env.d.ts` ambient-types file uses the conventional triple-slash
    // reference to the generated `.astro/types.d.ts` — the sanctioned pattern for
    // `.d.ts` ambient declarations (the `import`-style alternative the rule prefers
    // does not apply to a reference-types directive).
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
];

// packages/tokens/scripts/generate-theme.ts
//
// Build-time generator: render the TS token source (src/tokens.ts) into the
// committed Tailwind v4 `@theme` artifact src/theme.css (Story 1.17, AC2 / FM-4).
// The TS source is canonical; this compiled output is tracked alongside it and web
// consumers `@import '@twt/tokens/theme.css'`. Re-run after editing src/tokens.ts:
//   pnpm --filter @twt/tokens tokens:generate-theme
// The FM-4 sync check (check-theme-determinism.ts) fails the build on drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderThemeCss } from '../src/theme.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/theme.css');

const css = renderThemeCss();
fs.writeFileSync(target, css, { encoding: 'utf8' });

console.log(`✓ packages/tokens/src/theme.css written (${css.length} bytes)`);

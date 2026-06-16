// packages/tokens/scripts/check-theme-determinism.ts
//
// FM-4 token-sync CI gate (Story 1.17, AC2): assert the committed src/theme.css is
// byte-identical to what the generator renders from the TS token source. Mirrors the
// OpenAPI-determinism gate's "regenerate and assert identical" shape. The TS source
// (src/tokens.ts) is canonical; a drifted committed artifact means someone edited
// theme.css by hand or forgot to regenerate after a token change.
//
// Read-only from the repo's POV: the working tree is never altered (we compare the
// in-memory render to the committed file; we do NOT rewrite it).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderThemeCss } from '../src/theme.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../src/theme.css');

if (!fs.existsSync(target)) {
  console.error(`✗ packages/tokens/src/theme.css does not exist at ${target}`);
  console.error('  Run `pnpm --filter @twt/tokens tokens:generate-theme` to author it.');
  process.exit(1);
}

const committed = fs.readFileSync(target, 'utf8');
const rendered = renderThemeCss();

if (committed !== rendered) {
  console.error('✗ packages/tokens/src/theme.css is OUT OF SYNC with the TS token source');
  console.error('  The committed @theme artifact differs from what src/tokens.ts renders.');
  console.error(
    '  Run `pnpm --filter @twt/tokens tokens:generate-theme` locally + commit the result.',
  );
  process.exit(1);
}

console.log('✓ packages/tokens/src/theme.css is in sync with the TS token source (FM-4)');

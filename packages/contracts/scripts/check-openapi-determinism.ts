// packages/contracts/scripts/check-openapi-determinism.ts
//
// CI gate: re-emit openapi/v1.yaml and assert byte-identical to the committed file.
// Architecture §3.2 line 1862-1865 generator-determinism CI gate.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../../../openapi/v1.yaml');

if (!fs.existsSync(target)) {
  console.error(`✗ openapi/v1.yaml does not exist at ${target}`);
  console.error('  Run `pnpm contracts:emit-openapi` to author it.');
  process.exit(1);
}

const before = fs.readFileSync(target, 'utf8');

execSync('tsx scripts/emit-openapi.ts', {
  cwd: path.resolve(here, '..'),
  stdio: 'inherit',
});

const after = fs.readFileSync(target, 'utf8');

if (before !== after) {
  console.error('✗ openapi/v1.yaml emission is non-deterministic');
  console.error('  Committed file and re-emit output differ.');
  console.error('  Run `pnpm contracts:emit-openapi` locally + commit the result.');
  process.exit(1);
}

console.log('✓ openapi/v1.yaml emission is deterministic');

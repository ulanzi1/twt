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

// Snapshot committed content in memory before re-emission so we can restore it
// regardless of outcome — a crash mid-write cannot leave the reference corrupt.
const committed = fs.readFileSync(target, 'utf8');

try {
  // Use an absolute path to the emit script so the invocation is stable
  // regardless of cwd changes introduced by turbo or other task runners.
  execSync(`tsx ${path.resolve(here, 'emit-openapi.ts')}`, {
    cwd: path.resolve(here, '..'),
    stdio: 'inherit',
  });
} catch (err) {
  fs.writeFileSync(target, committed, { encoding: 'utf8' });
  console.error('✗ emit-openapi.ts failed during determinism check');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const emitted = fs.readFileSync(target, 'utf8');

// Always restore the committed file — the determinism check must not alter the
// working tree in CI or locally (the check is read-only from the repo's POV).
fs.writeFileSync(target, committed, { encoding: 'utf8' });

if (committed !== emitted) {
  console.error('✗ openapi/v1.yaml emission is non-deterministic');
  console.error('  Committed file and re-emit output differ.');
  console.error('  Run `pnpm contracts:emit-openapi` locally + commit the result.');
  process.exit(1);
}

console.log('✓ openapi/v1.yaml emission is deterministic');

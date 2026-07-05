// scripts/access-wrapper-invariants/check.ts
//
// access-wrapper-invariants CI gate — Epic-4 retrospective AI-4-3 (the I-3 family).
// Scans packages/validity-service/src/**/*.ts and fails (exit 1, naming file + line)
// on any validity ACCESS ENTRYPOINT (exported `async` fn returning
// `Promise<…MemberValidityPayload>`) that can DEFAULT to returning a full unredacted
// payload — i.e. that lacks the `caller`-XOR-`internal` fail-closed guard and is not
// a pure delegator forwarding its options param to a guarded entrypoint.
//
// This mechanizes the cheapest / most-corrosive slice of the access-wrapper family:
// 4.6's omitted-caller default-open path. The remaining checklist items (independent
// caller-auth, HMAC audit hashes, isolated best-effort writes, permission-key scope
// match) are CONVENTION + reviewer checklist — judgment calls a heuristic lint would
// false-positive on. See docs/access-wrapper-invariants.md.
//
// INVARIANT SCAN of the declared scope — NOT a git-diff (mirror domain-invariants /
// member-state-invariant; NO fetch-depth: 0). Precision-scoped → self-green by
// construction (only validity-service src is read; this gate's own fixtures live
// under scripts/).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type AccessWrapperFinding, formatFinding, scanAccessWrapperInvariant } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/validity-service/src';

function collectTsFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      acc.push(abs);
    }
  }
}

function main(): void {
  console.log(
    'access-wrapper-invariants gate — AI-4-3: validity access entrypoints must fail CLOSED on an omitted caller\n',
  );

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ access-wrapper-invariants gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}\n`);

  const findings: AccessWrapperFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    findings.push(...scanAccessWrapperInvariant(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log(
      '  ✓ every validity access entrypoint guards caller-XOR-internal (or delegates to one that does)\n',
    );
    console.log('✓ access-wrapper-invariants gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ access-wrapper-invariants gate FAILED with ${findings.length} finding(s).\n` +
      '  An entrypoint that returns the full validity payload without an explicit caller/internal\n' +
      '  marker will silently hand an unredacted, unaudited payload to a caller that forgot to\n' +
      '  authenticate (the Story 4.6 omitted-caller default-open defect, I-3). Fix: add\n' +
      '  `if (!opts.caller && !opts.internal) throw ...` as step 0. See docs/access-wrapper-invariants.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ access-wrapper-invariants gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

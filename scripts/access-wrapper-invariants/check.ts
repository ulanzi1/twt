// scripts/access-wrapper-invariants/check.ts
//
// access-wrapper-invariants CI gate — the I-3 "access wrapper is the new TOCTOU"
// family. ONE gate, THREE mechanized invariants, each over its own scan roots:
//
//   (1) VALIDITY caller/internal fail-closed (Epic-4 AI-4-3) — every validity
//       ACCESS ENTRYPOINT (exported `async` fn returning
//       `Promise<…MemberValidityPayload>`) in packages/validity-service/src must
//       declare a caller-XOR-internal marker and fail CLOSED when neither is
//       supplied (the Story 4.6 omitted-caller default-open defect).
//
//   (2) CHANNEL constant-time secret compare (Epic-5 AI-5-1) — within any
//       VERIFICATION CONTEXT on the Epic-5 access surface (packages/channels +
//       the apps/api channel entrypoints), a compare of two runtime values must
//       go through an approved constant-time comparator, never `===`/`!==`/
//       `.includes`/`.startsWith`/`.localeCompare` (the Story 5.4 `hub.verify_token`
//       timing side-channel).
//
//   (3) COMPENSATING-AUDIT mechanization (Epic-5 AI-5-3 / ADR-0030) — on the SAME
//       Epic-5 access surface, a direct `audit.writeAuditEntry` call is
//       non-conformant unless the file is a named AI-4-3(d) isolated-best-effort
//       exemption. `packages/domain/src/audit/compensating.ts`
//       (`withCompensatingAudit` / `writeRolledBackAudit`) is the sole sanctioned
//       caller for every other mutation+audit pairing on this surface.
//
// This closes the AI-4-3 → AI-5-1 → AI-5-3 chain: the gate now honestly reads the
// code each commitment was about (Epic-5's channels + apps/api surface), not just
// last epic's validity-service package. The remaining access-wrapper checklist
// items (independent caller-auth, HMAC-not-raw-PII audit hashing, permission-key
// scope match) stay CONVENTION + reviewer checklist — judgment calls a heuristic
// lint would false-positive on. See docs/access-wrapper-invariants.md.
//
// INVARIANT SCAN of the declared scope — NOT a git-diff (mirror domain-invariants /
// member-state-invariant; NO fetch-depth: 0). DB/network-free. Precision-scoped →
// self-green by construction: the validity invariant only fires on unguarded
// validity entrypoints; the secret-compare invariant only fires inside a
// verification context; the compensating-audit invariant only fires on a direct
// `audit.writeAuditEntry` call outside the canonical helper + named exemptions, and
// the shipped code already routes every compensatable write through it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AccessWrapperFinding,
  formatCompensatingAuditFinding,
  formatFinding,
  formatSecretCompareFinding,
  scanAccessWrapperInvariant,
  scanCompensatingAuditInvariant,
  scanSecretCompareInvariant,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/** (1) validity caller/internal fail-closed — AI-4-3. */
const VALIDITY_ROOTS = ['packages/validity-service/src'];

/** (2) channel constant-time secret compare — AI-5-1. The Epic-5 access surface. */
const CHANNEL_ROOTS = [
  'packages/channels/src',
  'apps/api/src/modules/channel-webhooks',
  'apps/api/src/modules/wa-opt-in',
  'apps/api/src/modules/telegram-opt-in',
  'apps/api/src/modules/channel-config',
  'apps/api/src/modules/degraded-mode',
  'apps/api/src/modules/device-token',
];

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

/** Collect every scannable .ts file under a root set; a missing root is a hard error. */
function filesForRoots(roots: string[]): string[] {
  const files: string[] = [];
  for (const root of roots) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) {
      console.error(`✗ access-wrapper-invariants gate: scan root '${root}' not found`);
      process.exit(1);
    }
    collectTsFiles(absRoot, files);
  }
  files.sort();
  return files;
}

/** Run one invariant scanner over its root set; return findings + formatted lines. */
function runInvariant(
  label: string,
  roots: string[],
  scan: (file: string, source: string) => AccessWrapperFinding[],
  format: (f: AccessWrapperFinding) => string,
): { findings: AccessWrapperFinding[]; lines: string[] } {
  const files = filesForRoots(roots);
  console.log(`▸ ${label} — ${files.length} file(s) under ${roots.join(', ')}`);
  const findings: AccessWrapperFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    findings.push(...scan(rel, fs.readFileSync(abs, 'utf8')));
  }
  return { findings, lines: findings.map(format) };
}

function main(): void {
  console.log('access-wrapper-invariants gate — three mechanized slices of the I-3 access-wrapper family\n');

  const validity = runInvariant(
    'AI-4-3 validity caller/internal fail-closed',
    VALIDITY_ROOTS,
    scanAccessWrapperInvariant,
    formatFinding,
  );
  const secret = runInvariant(
    'AI-5-1 channel constant-time secret compare',
    CHANNEL_ROOTS,
    scanSecretCompareInvariant,
    formatSecretCompareFinding,
  );
  const compensatingAudit = runInvariant(
    'AI-5-3 compensating-audit mechanization',
    CHANNEL_ROOTS,
    scanCompensatingAuditInvariant,
    formatCompensatingAuditFinding,
  );

  const allLines = [...validity.lines, ...secret.lines, ...compensatingAudit.lines];
  console.log('\n▸ Findings');
  if (allLines.length === 0) {
    console.log('  ✓ validity entrypoints fail closed on an omitted caller');
    console.log('  ✓ every channel verification context uses a constant-time secret compare');
    console.log('  ✓ every mutation+audit pairing on this surface flows through withCompensatingAudit\n');
    console.log('✓ access-wrapper-invariants gate passed');
    return;
  }

  for (const line of allLines) console.error(`  ✗ ${line}`);
  console.error(
    `\n✗ access-wrapper-invariants gate FAILED with ${allLines.length} finding(s).\n` +
      '  (1) A validity entrypoint that returns the full payload without a caller/internal marker\n' +
      '      hands an unredacted, unaudited payload to a caller that forgot to authenticate (Story 4.6).\n' +
      '      Fix: `if (!opts.caller && !opts.internal) throw ...` as step 0.\n' +
      '  (2) A verification context comparing two runtime values with `===`/`!==`/`.includes`/etc. leaks a\n' +
      '      timing side-channel on a credential (Story 5.4). Fix: route it through `timingSafeEqual` /\n' +
      '      `timingSafeEqualString` / `timingSafeHashCompare`.\n' +
      '  (3) A direct `audit.writeAuditEntry` call outside `withCompensatingAudit` / `writeRolledBackAudit`\n' +
      '      can let the audit ledger claim a mutation that never durably landed (ADR-0030). Fix: route it\n' +
      '      through `audit.withCompensatingAudit`, or add a named file exemption if this is a genuine\n' +
      '      AI-4-3(d) isolated-best-effort write with no rollback-capable tx in scope.\n' +
      '  See docs/access-wrapper-invariants.md.',
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

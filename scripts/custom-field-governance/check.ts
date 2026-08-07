// scripts/custom-field-governance/check.ts
//
// custom-field-governance CI gate — Story 10.12 (AC3 layer 3).
//
// ⚠ THE SCOPE LIMIT, STATED PLAINLY AND FIRST. Custom-field definitions are DATABASE ROWS written at
// runtime by tenant admins. This gate does not, and cannot, prove that no forbidden definition exists
// in any tenant database — a CI gate that needed a live tenant DB would not be a CI gate. It asserts
// the two things CI can prove about committed source:
//
//   (a) the domain denylist covers every `forbidden_column` pattern in `fr-100-non-add.yaml`;
//   (b) `insert(pariwarCustomFieldDefinitions)` appears ONLY in the sanctioned writer module;
//   (c) `update(members).set({ customFields })` appears ONLY in the sanctioned member-write module —
//       [Review][Patch] AC6 claims this is "asserted by AC3's source-scan leg"; leg (b) never actually
//       scanned for it, so this leg supplies the mechanization the AC's own text assumed existed.
//
// The runtime prohibition itself lives in two other places: layer 1, the domain fence
// (`packages/domain/src/custom-fields/frozen-governance.ts`, called on every publish) and layer 2,
// the DB CHECK `pariwar_custom_field_definitions_frozen_key_ck` (migration 0095), which holds even
// for a writer that never goes through the app layer. Three layers; none sufficient alone.
//
// ⚠ Do NOT extend `scripts/schema-diff` to do this job. epics.md:3605 cites Story 1.16c as the
// enforcer of exactly this rule, and that citation is wrong: `schema-diff` is an invariant scan of
// migrations, route literals and Zod exports. A JSONB key authored at runtime is none of those, so it
// would pass green and useless. This gate exists because that citation had nothing behind it.
//
// INVARIANT SCAN of committed state — NOT a git-diff (mirror member-state-invariant /
// governance-boundary / schema-diff; NO fetch-depth: 0).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Imported DIRECTLY from the fence module, never through the `@twt/domain` barrel: the barrel drags
// in `pg` and the whole schema tree for what is a read of two static arrays.
import {
  CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS,
  fr100ForbiddenColumnPrefix,
} from '../../packages/domain/src/custom-fields/frozen-governance.js';
import {
  checkDenylistConformance,
  denylistConformanceIsClean,
  formatMemberWriterFinding,
  formatWriterFinding,
  scanDefinitionWrites,
  scanMemberCustomFieldWrites,
  type WriterFinding,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

/**
 * Roots scanned by leg (b). Every tree that could plausibly hold a drizzle write — the domain itself
 * plus every app and package that imports it.
 */
const SCAN_ROOTS = ['packages', 'apps', 'scripts'];

/**
 * The SOLE sanctioned writer (forward-slashed, relative to repoRoot).
 *
 * A new legitimate writer is a deliberate, reviewed addition HERE — and it must also run the fence,
 * because adding a path to this list is the one edit that makes the fence optional for it. That is
 * the intended friction: the allowlist is short so that lengthening it is conspicuous in a diff.
 */
const WRITER_ALLOWLIST = new Set<string>(['packages/domain/src/custom-fields/registry.ts']);

/** [Review][Patch] Leg (c)'s sanctioned writer — the ONE `update(members).set({ customFields })` call
 *  site AC6 claims exists and this leg now actually asserts. */
const MEMBER_WRITER_ALLOWLIST = new Set<string>(['packages/domain/src/custom-fields/member-write.ts']);

/**
 * Directories excluded from leg (b). The gate's OWN fixtures live in `lib.test.ts` as string
 * literals, so they are never parsed as source — but test trees elsewhere may legitimately seed rows
 * directly, and a live-DB spec doing so is testing the DB layer, not bypassing the fence in
 * production code.
 *
 * ⚠ This exclusion is the gate's soft spot and is recorded as such: a production write laundered
 * through a file under a `tests/` path would not be reported. It is accepted because the alternative
 * — forcing every fixture through the audited writer — would make the revert-sanity specs in
 * `packages/domain/tests/integration/custom-fields/` impossible to write, and those specs are what
 * prove layers 1 and 2 have teeth.
 */
const EXCLUDED_DIR_SEGMENTS = ['node_modules', 'dist', 'build', '.turbo', 'tests', '__tests__'];

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx'];

function isScannableFile(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  if (name.endsWith('.test.ts') || name.endsWith('.spec.ts')) return false;
  return SCANNED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function collectSourceFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDED_DIR_SEGMENTS.includes(entry.name)) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(abs, acc);
    else if (entry.isFile() && isScannableFile(entry.name)) acc.push(abs);
  }
}

/** Leg (a). Returns true on success. */
function runDenylistLeg(): boolean {
  console.log('▸ Leg (a) — the domain denylist covers every fr-100 `forbidden_column` pattern');

  const fr100 = fr100ForbiddenColumnPrefix();

  // ⚠ A MISSING fr-100 PATTERN IS A GATE FAILURE, NOT A CLEAN LEG. The domain fence fails OPEN to its
  // static list when the YAML cannot be read (deliberately — the static list already carries
  // `payout_destination`), which is the right runtime posture but the wrong CI posture: it would make
  // this leg compare against an empty set and report a vacuous pass forever.
  if (fr100 === null) {
    console.error(
      '  ✗ fr-100-non-add.yaml declared no readable `patterns.forbidden_column`.\n' +
        '      Leg (a) would compare against an empty set and pass vacuously. Either the registry\n' +
        '      moved, or it is malformed — fix the file rather than the gate.',
    );
    return false;
  }

  const result = checkDenylistConformance(CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS, [fr100]);
  console.log(`  · fr-100 forbidden_column : ${result.checked.join(', ')}`);
  console.log(
    `  · domain denylist         : ${CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS.map((e) => `${e.pattern}[${e.mode}]`).join(', ')}`,
  );

  if (denylistConformanceIsClean(result)) {
    console.log('  ✓ every fr-100 forbidden column is covered by a prefix-mode denylist entry\n');
    return true;
  }

  for (const p of result.missing) {
    console.error(
      `  ✗ fr-100 forbids the column prefix '${p}', but CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS has no\n` +
        `      prefix-mode entry covering it — a tenant could author a custom field named '${p}…'\n` +
        '      and the runtime fence would let it through. Add the pattern to the denylist.',
    );
  }
  console.error('');
  return false;
}

/** Leg (b). Returns true on success. */
function runSoleWriterLeg(): boolean {
  console.log('▸ Leg (b) — `insert(pariwarCustomFieldDefinitions)` only in the sanctioned writer  ⟵ LOAD-BEARING');

  const findings: WriterFinding[] = [];
  let scanned = 0;
  let allowlistedSeen = 0;

  for (const root of SCAN_ROOTS) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) {
      console.error(`  ✗ scan root '${root}' does not exist — a stale root scans nothing while reporting clean`);
      return false;
    }
    const files: string[] = [];
    collectSourceFiles(absRoot, files);
    files.sort();
    for (const abs of files) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
      if (WRITER_ALLOWLIST.has(rel)) {
        allowlistedSeen += 1;
        continue;
      }
      scanned += 1;
      findings.push(...scanDefinitionWrites(rel, fs.readFileSync(abs, 'utf8')));
    }
  }

  console.log(`  · ${String(scanned)} source file(s) scanned across ${SCAN_ROOTS.join(', ')}`);
  console.log(`  · allowlisted writer(s): ${[...WRITER_ALLOWLIST].join(', ')}`);

  // ⚠ COVERAGE FLOOR. A gate that scanned nothing has proven nothing while exiting 0 — the most
  // dangerous state a governance gate can be in, because it is indistinguishable from success.
  if (scanned === 0) {
    console.error('  ✗ leg (b) scanned 0 files — a vacuous pass, not a clean one\n');
    return false;
  }

  // ⚠ THE ALLOWLIST MUST NAME A FILE THAT EXISTS. Otherwise a renamed or deleted writer leaves the
  // allowlist pointing at nothing: the real writer's new path is scanned, and if the writer were
  // renamed the gate would fail loudly (fine) — but a DELETED entry that nobody noticed would leave
  // the gate asserting a rule about a file that is gone, which reads as coverage and is not.
  if (allowlistedSeen !== WRITER_ALLOWLIST.size) {
    console.error(
      `  ✗ the writer allowlist names ${String(WRITER_ALLOWLIST.size)} file(s) but only ` +
        `${String(allowlistedSeen)} were found on disk — a stale allowlist entry.\n` +
        '      Update WRITER_ALLOWLIST to the writer\'s real path.\n',
    );
    return false;
  }

  if (findings.length === 0) {
    console.log('  ✓ no definition INSERT outside the sanctioned writer\n');
    return true;
  }

  for (const f of findings) console.error(`  ✗ ${formatWriterFinding(f)}`);
  console.error('');
  return false;
}

/** [Review][Patch] Leg (c). Mirrors `runSoleWriterLeg` exactly, for `update(members).set({
 *  customFields })` instead of `insert(pariwarCustomFieldDefinitions)`. Returns true on success. */
function runMemberWriterLeg(): boolean {
  console.log(
    "▸ Leg (c) — `update(members).set({ customFields })` only in the sanctioned writer  ⟵ AC6's claimed coverage",
  );

  const findings: WriterFinding[] = [];
  let scanned = 0;
  let allowlistedSeen = 0;

  for (const root of SCAN_ROOTS) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) {
      console.error(`  ✗ scan root '${root}' does not exist — a stale root scans nothing while reporting clean`);
      return false;
    }
    const files: string[] = [];
    collectSourceFiles(absRoot, files);
    files.sort();
    for (const abs of files) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
      if (MEMBER_WRITER_ALLOWLIST.has(rel)) {
        allowlistedSeen += 1;
        continue;
      }
      scanned += 1;
      findings.push(...scanMemberCustomFieldWrites(rel, fs.readFileSync(abs, 'utf8')));
    }
  }

  console.log(`  · ${String(scanned)} source file(s) scanned across ${SCAN_ROOTS.join(', ')}`);
  console.log(`  · allowlisted writer(s): ${[...MEMBER_WRITER_ALLOWLIST].join(', ')}`);

  if (scanned === 0) {
    console.error('  ✗ leg (c) scanned 0 files — a vacuous pass, not a clean one\n');
    return false;
  }

  if (allowlistedSeen !== MEMBER_WRITER_ALLOWLIST.size) {
    console.error(
      `  ✗ the member-writer allowlist names ${String(MEMBER_WRITER_ALLOWLIST.size)} file(s) but only ` +
        `${String(allowlistedSeen)} were found on disk — a stale allowlist entry.\n` +
        '      Update MEMBER_WRITER_ALLOWLIST to the writer\'s real path.\n',
    );
    return false;
  }

  if (findings.length === 0) {
    console.log('  ✓ no members.custom_fields UPDATE outside the sanctioned writer\n');
    return true;
  }

  for (const f of findings) console.error(`  ✗ ${formatMemberWriterFinding(f)}`);
  console.error('');
  return false;
}

function main(): void {
  console.log('custom-field-governance gate — the per-Pariwar custom-field fence (Story 10.12 AC3 layer 3)\n');
  console.log(
    '  Scope limit: definitions are DATABASE ROWS. This gate proves nothing about their CONTENT in\n' +
      '  any tenant DB — layer 1 (runtime fence) and layer 2 (the 0095 CHECK) do that. See README.md.\n',
  );

  const denylistOk = runDenylistLeg();
  const writerOk = runSoleWriterLeg();
  const memberWriterOk = runMemberWriterLeg();

  if (denylistOk && writerOk && memberWriterOk) {
    console.log('✓ custom-field-governance gate passed');
    return;
  }

  console.error(
    '✗ custom-field-governance gate FAILED.\n' +
      '  A per-Pariwar custom field must never be able to reach around a frozen governance control\n' +
      '  (epics.md:3605, restated correctly). If leg (a) failed, mirror the new fr-100 pattern into\n' +
      '  CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS. If leg (b) failed, the fix is NOT to widen the\n' +
      '  allowlist: route the write through customFields.publishDefinitionVersion, which runs the\n' +
      '  fence. If leg (c) failed, route the write through customFields.setMemberCustomFields\n' +
      '  instead. See scripts/custom-field-governance/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ custom-field-governance gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

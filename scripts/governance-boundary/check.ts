// scripts/governance-boundary/check.ts
//
// governance-boundary CI gate (Story 10.8 AC5). Makes the feature-flag governance boundary
// MECHANIZED rather than merely documented. Two legs:
//
//   (a) CONFORMANCE — the domain flag registry (`FLAG_DEFAULTS`) and the capability bar
//       (`governance_boundary.yaml`) admit EXACTLY the same flag keys, and the bar's `count`
//       agrees with its entry total.
//
//   (b) SOURCE SCAN — no feature-flag evaluation reaches inside a governance module. The roots are
//       read from the bar's own `prohibited` list, so the scanned surface and the documented
//       prohibitions cannot drift apart.
//
// ⚠ A GREEN LEG (a) PROVES NOTHING ON ITS OWN. Leg (a) checks that the list of flags matches the
// list of flags; it stays green while somebody adds a flag read inside the RBAC module. Leg (b) is
// the invariant. Both must pass; only one is load-bearing.
//
// INVARIANT SCAN of the source trees — NOT a git-diff (mirror kyc-provider-boundary /
// member-state-invariant / schema-diff; NO fetch-depth: 0). The v1 baseline permits ZERO flag reads
// inside a governance module ever, so the gate asserts zero exist — a whole-state scan can neither
// miss a violation added earlier on the branch nor wrongly pass one already merged.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ⚠ Imported from `capability-bar.js` DIRECTLY, never from the feature-flags barrel — the barrel
// re-exports the evaluation surface, and this gate's own directory would then be the one place in
// `scripts/` legitimately holding it, which is precisely the ambiguity the allowlist below exists to
// avoid. Reading the bar is reading a static governance YAML; it is not evaluating a flag.
import {
  allowlistedFlagKeys,
  loadCapabilityBar,
  type CapabilityBar,
} from '../../packages/domain/src/feature-flags/capability-bar.js';
import { FLAG_KEYS } from '../../packages/domain/src/feature-flags/registry.js';
import {
  checkRegistryConformance,
  conformanceIsClean,
  formatBoundaryFinding,
  scanGovernanceBoundaryViolations,
  type BoundaryFinding,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

/**
 * The SOLE allowlisted location (forward-slashed, relative to repoRoot) — this gate itself.
 *
 * The gate lives under `scripts/`, which is one of the prohibited roots (prohibition (f): a flag
 * must never disable a CI gate). It must nonetheless read the registry to check conformance. This
 * is the same shape as kyc-provider-boundary's provider-directory allowlist: the one component that
 * legitimately holds the thing is the one enforcing the rule about it. Note the gate imports only
 * the BAR PARSER and the KEY LIST — it never imports the evaluator, and leg (b) still scans every
 * other file under `scripts/`.
 */
const ALLOWLIST_DIR = 'scripts/governance-boundary/';

function isAllowlisted(rel: string): boolean {
  return rel.startsWith(ALLOWLIST_DIR);
}

/**
 * Extensions the scanner parses. ⚠ `.ts`/`.tsx` alone was not enough (Review Pass 2): `scripts/` is a
 * prohibited root and prohibition (f) is "a flag must never disable a CI gate" — but a gate written
 * as `.mjs`/`.cjs`/`.mts`/`.cts` was never opened, so the file could import the evaluator and the
 * root would still report clean. TypeScript's parser handles all of these.
 */
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx'];

function isScannableFile(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return SCANNED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function collectTsFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    // ⚠ `Dirent.isDirectory()` and `.isFile()` are BOTH false for a symlink, because `readdirSync`
    // with `withFileTypes` does not follow links — so a symlinked file or directory inside a
    // prohibited root used to be skipped silently, with no diagnostic. `statSync` follows the link.
    let isDir: boolean;
    let isFile: boolean;
    if (entry.isSymbolicLink()) {
      try {
        const st = fs.statSync(abs);
        isDir = st.isDirectory();
        isFile = st.isFile();
      } catch {
        continue; // A broken symlink has nothing to scan.
      }
    } else {
      isDir = entry.isDirectory();
      isFile = entry.isFile();
    }
    if (isDir) collectTsFiles(abs, acc);
    else if (isFile && isScannableFile(entry.name)) acc.push(abs);
  }
}

/** Leg (a). Returns true on success. */
function runConformanceLeg(bar: CapabilityBar): boolean {
  const allowKeys = allowlistedFlagKeys(bar);
  const result = checkRegistryConformance(FLAG_KEYS, allowKeys, bar.count);

  console.log('▸ Leg (a) — registry ≡ capability-bar conformance');
  console.log(`  · registry keys : ${FLAG_KEYS.join(', ') || '(none)'}`);
  console.log(`  · bar entries   : ${allowKeys.join(', ') || '(none)'}  (count: ${String(bar.count)})`);

  if (conformanceIsClean(result)) {
    console.log('  ✓ the registry and the capability bar admit exactly the same flag keys\n');
    return true;
  }

  for (const k of result.unlisted) {
    console.error(
      `  ✗ flag '${k}' is registered in FLAG_DEFAULTS but is NOT in governance_boundary.yaml — ` +
        'an unattested flag-toggleable behaviour.',
    );
  }
  for (const k of result.orphaned) {
    console.error(
      `  ✗ governance_boundary.yaml admits '${k}' but no such flag is registered — a stale entry; ` +
        'the bar must describe reality or it stops being read.',
    );
  }
  if (result.countMismatch) {
    console.error(
      `  ✗ governance_boundary.yaml: count (${String(result.countMismatch.declared)}) !== ` +
        `allow.length (${String(result.countMismatch.actual)}) — bump \`count\` in the SAME commit.`,
    );
  }
  console.error('');
  return false;
}

/** Leg (b). Returns true on success. */
function runSourceScanLeg(bar: CapabilityBar): boolean {
  console.log('▸ Leg (b) — no feature-flag evaluation inside a governance module  ⟵ LOAD-BEARING');

  let scannedFiles = 0;
  let failed = false;

  for (const { root, prohibition } of bar.prohibited) {
    const absRoot = path.join(repoRoot, root);

    // ⚠ A ROOT THAT DOES NOT EXIST IS A GATE FAILURE, NOT A CLEAN SCAN (Review Pass 2).
    // `collectTsFiles` used to `return` silently for a missing directory, after which the loop below
    // printed "✓ <root> — clean (0 file(s))" and passed. So a module rename, a moved package, or a
    // typo in the YAML silently disabled the load-bearing leg for that root — forever, with a green
    // checkmark reporting it. The bar's parser validates that a root is repo-relative and
    // traversal-free but never that it RESOLVES, and the unit test asserting "every prohibited root
    // names a real governance module path" only matched a `/^(packages|scripts)/` regex, which any
    // stale path satisfies. This is the AI-5-1 vacuous-gate shape and it belongs on the failure path.
    if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
      failed = true;
      console.error(
        `  ✗ ${root} — prohibited root does not resolve to a directory.\n` +
          '      A stale root silently scans NOTHING while reporting clean. Either the module moved\n' +
          '      (update the `root` in governance_boundary.yaml) or the entry is obsolete (remove it,\n' +
          '      with the same attestation any other bar edit needs).',
      );
      continue;
    }

    const files: string[] = [];
    collectTsFiles(absRoot, files);
    files.sort();

    const findings: BoundaryFinding[] = [];
    for (const abs of files) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
      if (isAllowlisted(rel)) continue;
      scannedFiles += 1;
      findings.push(...scanGovernanceBoundaryViolations(rel, fs.readFileSync(abs, 'utf8')));
    }

    if (findings.length === 0) {
      console.log(`  ✓ ${root} — clean (${String(files.length)} file(s))`);
      continue;
    }
    failed = true;
    console.error(`  ✗ ${root} — ${String(findings.length)} violation(s)`);
    for (const f of findings) console.error(`      ${formatBoundaryFinding(f, prohibition)}`);
  }

  // ⚠ A COVERAGE FLOOR. Even with the per-root existence check above, a gate that scans zero files
  // overall has proven nothing while exiting 0 — the single most dangerous state for a governance
  // gate to be in, because it looks identical to success. Assert the leg actually did work.
  const MIN_SCANNED_FILES = 1;
  if (scannedFiles < MIN_SCANNED_FILES) {
    failed = true;
    console.error(
      '  ✗ leg (b) scanned 0 files — the source-scan leg proved NOTHING.\n' +
        '      This is a vacuous pass, not a clean one. Check that governance_boundary.yaml\'s\n' +
        '      `prohibited` roots still point at real source trees.',
    );
  }

  console.log(`  · ${String(scannedFiles)} source file(s) scanned\n`);
  return !failed;
}

function main(): void {
  console.log('governance-boundary gate — the feature-flag capability bar + boundary invariant (Story 10.8 AC5)\n');

  // A malformed bar throws here, loudly. That is deliberate: a governance artifact that silently
  // degraded to "no entries" would make BOTH legs pass vacuously — leg (a) would compare against an
  // empty allowlist and leg (b) would scan no roots at all.
  const bar = loadCapabilityBar();
  console.log(`▸ governance_boundary.yaml v${String(bar.version)} — ${String(bar.allow.length)} allowed behaviour(s), ${String(bar.prohibited.length)} prohibited root(s)\n`);

  const conformanceOk = runConformanceLeg(bar);
  const scanOk = runSourceScanLeg(bar);

  if (conformanceOk && scanOk) {
    console.log('✓ governance-boundary gate passed');
    return;
  }

  console.error(
    '✗ governance-boundary gate FAILED.\n' +
      '  A feature flag must never be able to bypass audit, consent, validity, RBAC, the\n' +
      '  canonical-financial-truth fence, or a CI gate (epics.md:3516-3522). If leg (a) failed,\n' +
      '  complete the admission workflow documented in governance_boundary.yaml (trustee\n' +
      '  attestation + rationale + ADR + a `count` bump in the same commit). If leg (b) failed, the\n' +
      '  fix is NOT to narrow the scan: a governance module that needs flag-conditioned behaviour\n' +
      '  needs a code change and a review, which is the whole point. See\n' +
      '  scripts/governance-boundary/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ governance-boundary gate ERRORED: ${message}`);
  // ⚠ The `count` cross-check fails HERE, not in leg (a) (Review Pass 2). `loadCapabilityBar()`
  // throws on `count !== allow.length` during parsing, so `runConformanceLeg`'s bespoke
  // `countMismatch` branch is unreachable in situ and its actionable remediation never printed —
  // the operator got a generic "gate ERRORED" instead. Restore the guidance at the level that
  // actually catches it, rather than leaving a documented gate leg exercised only by its own test.
  if (/count \(\d+\) !== allow\.length/.test(message)) {
    console.error(
      '\n  The capability bar\'s `count` disagrees with its entry total. This is the revert-sanity\n' +
        '  cross-check: it fires when an `allow` entry is added or silently dropped without the\n' +
        '  `count` being bumped in the SAME commit. Fix the count, do not delete the check.',
    );
  }
  if (/could not be read/.test(message)) {
    console.error(
      '\n  governance_boundary.yaml was not found. The gate reads it from the repo root; if you are\n' +
        '  running from a build output or a partial checkout, run the gate from the repo root.',
    );
  }
  process.exit(1);
}

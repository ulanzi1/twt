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

function collectTsFiles(absDir: string, acc: string[]): void {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.d.ts')
    ) {
      acc.push(abs);
    }
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
    const files: string[] = [];
    collectTsFiles(path.join(repoRoot, root), files);
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

  console.log(`  · ${String(scannedFiles)} TypeScript file(s) scanned\n`);
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
  console.error(`\n✗ governance-boundary gate ERRORED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

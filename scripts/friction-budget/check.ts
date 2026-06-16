// scripts/friction-budget/check.ts
//
// Friction-budget PR CI gate entrypoint (Story 1.16a, UX-DR3). Runs BOTH facets
// in one pass:
//   (1) METRIC facet     — friction-budget.yaml ceilings + baseline-of-record.
//   (2) DECLARATION facet — friction-budget.md named-payer attribution-on-change.
//
// Repo-global by design (root config + cross-app build scan + PR git diff) → it
// is NOT a per-package turbo task. Invoked via `pnpm friction:check`
// (root package.json) and the dedicated `friction-budget` job in ci.yml.
//
// Bootstrapping (AC-2/AC-6): no member-facing build output exists in
// `pnpm turbo run build` yet, so every surface is a graceful no-op until its
// manifest lands; the declaration facet stays dormant until a member-facing app
// path changes. See friction-budget.md + README.md for the full semantics.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type FrictionBudgetConfig,
  type Manifest,
  type MetricVerdict,
  detectBaselineChanges,
  detectLoosenedCeilings,
  evaluateDeclaration,
  evaluateMetric,
  loosenedGuardVerdict,
  parseAndValidateLedger,
  parseFrictionBudgetYaml,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const YAML_FILE = 'friction-budget.yaml';
const MD_FILE = 'friction-budget.md';

function read(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/** Run git read-only; return trimmed stdout, or null if the command fails. */
function tryGit(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Resolve the PR base ref for diffing:
 *   - CI `pull_request`: GITHUB_BASE_REF is set → origin/<base>.
 *   - local: the merge-base against origin/main.
 *   - push events / no remote: null (PR-only facets skip with a notice).
 */
function resolveBaseRef(): string | null {
  const ghBase = process.env.GITHUB_BASE_REF;
  if (ghBase) {
    const ref = `origin/${ghBase}`;
    if (tryGit(['rev-parse', '--verify', ref]) !== null) return ref;
  }
  const mergeBase = tryGit(['merge-base', 'HEAD', 'origin/main']);
  return mergeBase;
}

function getChangedFiles(baseRef: string | null): string[] | null {
  if (baseRef === null) return null;
  const out = tryGit(['diff', '--name-only', `${baseRef}...HEAD`]);
  if (out === null) return null;
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function getBaseConfig(baseRef: string | null): FrictionBudgetConfig | null {
  if (baseRef === null) return null;
  const raw = tryGit(['show', `${baseRef}:${YAML_FILE}`]);
  if (raw === null) return null; // file did not exist at the base ref
  try {
    return parseFrictionBudgetYaml(raw);
  } catch {
    return null;
  }
}

function loadManifest(relManifestPath: string): Manifest | null {
  const abs = path.join(repoRoot, relManifestPath);
  if (!fs.existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const out: Manifest = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number') out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

function main(): void {
  const failures: string[] = [];
  const notes: string[] = [];

  console.log('friction-budget gate — UX-DR3 (Story 1.16a)\n');

  // ── Parse + validate both registries ──────────────────────────────────────
  const config = parseFrictionBudgetYaml(read(YAML_FILE)); // throws on malformed → gate fails loudly
  const ledger = parseAndValidateLedger(read(MD_FILE));

  console.log('▸ Declaration ledger (friction-budget.md)');
  if (ledger.errors.length > 0) {
    for (const e of ledger.errors) failures.push(`ledger: ${e}`);
    for (const e of ledger.errors) console.log(`  ✗ ${e}`);
  } else {
    console.log(`  ✓ ${ledger.rows.length} declaration row(s), all structurally valid`);
  }

  // ── METRIC facet: measure each surface against its ceilings + baseline ─────
  console.log('\n▸ Metric facet (friction-budget.yaml)');
  const verdicts: MetricVerdict[] = [];
  for (const surface of config.surfaces) {
    const manifest = loadManifest(surface.manifest);
    for (const metric of surface.metrics) {
      const v = evaluateMetric(surface.id, metric, manifest);
      verdicts.push(v);
    }
  }
  for (const v of verdicts) {
    const glyph = v.status === 'fail' ? '✗' : v.status === 'no-op' ? '·' : '✓';
    console.log(`  ${glyph} ${v.message}`);
    if (v.status === 'fail') failures.push(`metric: ${v.message}`);
  }
  for (const d of config.deferredMetrics) {
    console.log(
      `  · deferred — ${d.id}${d.canonicalDevice ? ` (canonical device: ${d.canonicalDevice})` : ''}`,
    );
  }

  // ── git context (PR diff) ─────────────────────────────────────────────────
  const baseRef = resolveBaseRef();
  const changedFiles = getChangedFiles(baseRef);
  const baseConfig = getBaseConfig(baseRef);

  // ── AC-1: same-PR threshold-loosening guard ───────────────────────────────
  console.log('\n▸ Threshold-loosening guard (AC-1)');
  const loosenings = detectLoosenedCeilings(baseConfig, config);
  const baselineChanged = detectBaselineChanges(baseConfig, config);
  const memberTouched =
    changedFiles !== null && changedFiles.some((f) => f.replace(/\\/g, '/').startsWith('apps/'));
  const guard = loosenedGuardVerdict(loosenings, baselineChanged || memberTouched);
  console.log(`  ${guard.ok ? '✓' : '✗'} ${guard.message}`);
  if (!guard.ok) failures.push(`threshold: ${guard.message}`);

  // ── AC-4: declaration attribution-on-change ───────────────────────────────
  console.log('\n▸ Declaration attribution-on-change (AC-4)');
  if (changedFiles === null) {
    notes.push(
      'declaration facet skipped — no PR base ref resolvable (push event or no origin/main). ' +
        'This facet is PR-scoped; CI pull_request runs it with fetch-depth: 0.',
    );
    console.log(`  · ${notes[notes.length - 1]}`);
  } else {
    const decl = evaluateDeclaration(changedFiles);
    console.log(`  ${decl.ok ? '✓' : '✗'} ${decl.message}`);
    if (!decl.ok) failures.push(`declaration: ${decl.message}`);
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  console.log('');
  if (failures.length > 0) {
    console.error(`✗ friction-budget gate FAILED with ${failures.length} finding(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('✓ friction-budget gate passed');
}

main();

// scripts/claim-adjudication-human-actor-invariant/check.ts
//
// claim-adjudication-human-actor-invariant CI gate (Story 6.10 AC4/AC5, D5): every claim-ADJUDICATION
// route composes the HUMAN-actor guard chain [requireAdminSession, scopeResolutionHook,
// requirePermissionHook(...)] and carries NO machine/service/system/null-actor path. Structured AST scan
// of the route-registration files in the explicit COVERAGE SET below — NOT a git-diff (mirror
// claim-state-invariant / claim-canonical-id-invariant; NO fetch-depth: 0).
//
// ⚠ Epic-5 retro H-1 heed ([[feedback_mechanization_split_commitment]] — "you can build the gate and
// still miss the target"): the COVERAGE SET must AIM at where adjudication routes live. Story 6.10 ships
// ONE (the READ-ONLY verifier console — the console read is itself a claim-adjudication-adjacent route
// that MUST require a human actor). Story 6.11 MUST ADD its approve/deny/escalate routes here as they
// land — an unlisted adjudication route is invisible to this gate. A coverage entry that matches NO
// route in its file is a FAILURE (missing coverage), never a silent skip (no silent cap —
// [[feedback_closure_language_precision]]). The gate's teeth are proven by the inline known-bad fixtures
// in lib.test.ts regardless of whether real routes exist.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type AdjudicationFinding, formatFinding, scanAdjudicationRoutes } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/**
 * The explicit coverage set: each claim-adjudication route-registration file + the path substrings that
 * identify its adjudication routes. Story 6.11 appends its approve/deny/escalate route file + substrings.
 */
interface CoverageEntry {
  file: string;
  pathSubstrings: string[];
  owner: string;
}

const COVERAGE_SET: readonly CoverageEntry[] = [
  {
    // Story 6.10 — the READ-ONLY verifier console (one GET). A ₹50L-stakes decision-support read that
    // MUST require an authenticated human actor + district scope (the runtime is the real control; this
    // gate is the structural defense-in-depth).
    file: 'apps/api/src/modules/claims/claims.verifier-console.routes.ts',
    pathSubstrings: ['verifier-console'],
    owner: 'Story 6.10',
  },
  {
    // Story 6.11 — the FIRST verifier WRITE surface (approve/deny/escalate + step-up-gated revise).
    // Both routes MUST compose the human-actor chain [requireAdminSession, scopeResolutionHook,
    // requirePermissionHook(claim.approve, district)] — the runtime is the real control, this gate is
    // the structural defense-in-depth. `verifier-decision` matches BOTH the base + the /revise path.
    file: 'apps/api/src/modules/claims/claims.verification-decision.routes.ts',
    pathSubstrings: ['verifier-decision'],
    owner: 'Story 6.11',
  },
];

function main(): void {
  console.log(
    'claim-adjudication-human-actor-invariant gate — adjudication routes require a HUMAN actor chain (Story 6.10 AC4/AC5)\n',
  );

  const findings: AdjudicationFinding[] = [];
  const missingCoverage: string[] = [];

  for (const entry of COVERAGE_SET) {
    const abs = path.join(repoRoot, entry.file);
    if (!fs.existsSync(abs)) {
      missingCoverage.push(`${entry.file} (${entry.owner}) — file not found`);
      continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const { findings: fileFindings, matchedPaths } = scanAdjudicationRoutes(
      entry.file,
      src,
      entry.pathSubstrings,
    );
    findings.push(...fileFindings);
    if (matchedPaths.length === 0) {
      missingCoverage.push(
        `${entry.file} (${entry.owner}) — no route matched [${entry.pathSubstrings.join(', ')}]`,
      );
    } else {
      console.log(`▸ ${entry.owner}: ${matchedPaths.length} adjudication route(s) scanned in ${entry.file}`);
      for (const p of matchedPaths) console.log(`    · ${p}`);
    }
  }
  console.log('');

  if (missingCoverage.length > 0) {
    console.error('▸ Missing coverage (a listed adjudication route was not found — fix the coverage set or the route):');
    for (const m of missingCoverage) console.error(`  ✗ ${m}`);
    console.error('');
  }

  console.log('▸ Findings');
  if (findings.length === 0 && missingCoverage.length === 0) {
    console.log('  ✓ every covered adjudication route composes the human-actor chain (no machine/service actor)\n');
    console.log('✓ claim-adjudication-human-actor-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ claim-adjudication-human-actor-invariant gate FAILED with ${findings.length} finding(s)` +
      `${missingCoverage.length ? ` + ${missingCoverage.length} missing-coverage error(s)` : ''}.\n` +
      '  Every claim-adjudication route MUST require an authenticated HUMAN actor: the chain\n' +
      '  [requireAdminSession, scopeResolutionHook, requirePermissionHook(...)] with NO machine/service\n' +
      '  actor. This is the structural defense-in-depth behind the runtime control (Story 6.10 AC4/AC5).\n' +
      '  See scripts/claim-adjudication-human-actor-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ claim-adjudication-human-actor-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

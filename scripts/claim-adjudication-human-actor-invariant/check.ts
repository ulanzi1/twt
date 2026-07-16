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
  {
    // Story 6.12 — the R6 manual shepherd reassignment WRITE. A human-actor write (routing the family's
    // ₹50L-stakes contact) MUST compose [requireAdminSession, scopeResolutionHook,
    // requirePermissionHook(claim.assign_shepherd, district)] — never a system/service actor. The
    // AUTOMATIC assignment + AR-61 fallback are pg-boss workers (actor: 'system'), not HTTP routes, and
    // are correctly outside this HTTP-route gate.
    file: 'apps/api/src/modules/claims/claims.shepherd.routes.ts',
    pathSubstrings: ['shepherd/reassign'],
    owner: 'Story 6.12',
  },
  {
    // Story 6.13 — the State-Trustee cycle-freeze (bulk-approval) surface: the pending list + per-claim
    // decision + the step-up-gated commit. Every route MUST compose the human-actor chain
    // [requireAdminSession, scopeResolutionHook, requirePermissionHook(cycle.freeze, pariwar)] — the FIRST
    // state_trustee-facing adjudication surface, extending the Story 6.10 AC5 human-attribution invariant
    // to the trustee layer (AC7). `cycle-freeze` matches the pending / decision / commit paths. NO
    // system-decided actor may reach any cycle-freeze adjudication endpoint.
    file: 'apps/api/src/modules/claims/claims.cycle-freeze.routes.ts',
    pathSubstrings: ['cycle-freeze'],
    owner: 'Story 6.13',
  },
  {
    // Story 6.14 — the R9 special-case voting panel surface: the queue + per-claim panel + open/vote/finalize/
    // cancel + votes-by-trustee. Every route MUST compose the human-actor chain [requireAdminSession,
    // scopeResolutionHook, requirePermissionHook(claim.r9_vote, pariwar)] — the CONSUMER end of the 6.13
    // routeToR9 seam + the FIRST claim-flow read of the niyamavali registry. The finalize route ADDS an
    // r9_finalize step-up AFTER the permission hook (an extra hook, not a machine actor). NO system-decided
    // actor may reach any R9 voting endpoint. `r9-voting` matches all seven paths.
    file: 'apps/api/src/modules/claims/claims.r9-voting.routes.ts',
    pathSubstrings: ['r9-voting'],
    owner: 'Story 6.14',
  },
  {
    // Story 6.15 — the verifier concealment-linkage assessment WRITE. Recording the human-supplied
    // claim.concealed_ima_condition_linked fact is a ₹50L-stakes review annotation that MUST compose the
    // human-actor chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(claim.verify,
    // district)] — never a system/service actor. A verifier annotates; the State Trustee alone decides
    // (D-B). `concealment-assessment` matches the single record/revise path.
    file: 'apps/api/src/modules/claims/claims.concealment-assessment.routes.ts',
    pathSubstrings: ['concealment-assessment'],
    owner: 'Story 6.15',
  },
  {
    // Story 6.16 — the internal 3-stage appeal ADJUDICATION routes: Stage-1 review (district-gated), the
    // Stage-2 panel open/vote/finalize/cancel (pariwar-gated; finalize step-up-gated), Stage-3 decision
    // (pariwar-gated + step-up), and the decisions-by-reviewer audit query. Every one MUST compose the
    // human-actor chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(...)] — these are
    // high-stakes adjudication operations (NOT because each emits a lifecycle event: stage-2 vote/cancel emit
    // none — the 6.14 R9 precedent). The path substrings match ONLY the adjudication routes:
    // `appeal/stage{1,2,3}` and `appeal/decisions-by-reviewer`. The member self-initiate route
    // (/member/claims/:id/appeal, memberSession) and the operator on-behalf initiate
    // (…/admin/claims/:id/appeal, claim.file) are CLAIMANT/filer actions — NOT adjudication — and are
    // DELIBERATELY excluded (they end in `/appeal`, not `/appeal/stage`), documented here so the exclusion
    // reads as intentional, not an oversight.
    file: 'apps/api/src/modules/claims/claims.appeal.routes.ts',
    pathSubstrings: ['appeal/stage', 'appeal/decisions-by-reviewer'],
    owner: 'Story 6.16',
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

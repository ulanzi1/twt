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
  /**
   * The METHODS this entry expects to find, e.g. `['get', 'post']`.
   *
   * ⚠⚠ WITHOUT THIS THE GATE PASSED ON A SINGLE MATCH (code review 2026-09-20). An entry was
   * satisfied as soon as ONE route in the file matched its substrings — so deleting, renaming or
   * failing to resolve the OTHER route (the WRITE, on the entries that have one) left the gate
   * green while its coverage silently halved. Naming the expected methods makes that a failure.
   */
  expectedMethods: string[];
}

const COVERAGE_SET: readonly CoverageEntry[] = [
  {
    // Story 6.10 — the READ-ONLY verifier console (one GET). A ₹50L-stakes decision-support read that
    // MUST require an authenticated human actor + district scope (the runtime is the real control; this
    // gate is the structural defense-in-depth).
    file: 'apps/api/src/modules/claims/claims.verifier-console.routes.ts',
    pathSubstrings: ['verifier-console'],
    owner: 'Story 6.10',
    expectedMethods: ['get'],
  },
  {
    // Story 6.11 — the FIRST verifier WRITE surface (approve/deny/escalate + step-up-gated revise).
    // Both routes MUST compose the human-actor chain [requireAdminSession, scopeResolutionHook,
    // requirePermissionHook(claim.approve, district)] — the runtime is the real control, this gate is
    // the structural defense-in-depth. `verifier-decision` matches BOTH the base + the /revise path.
    file: 'apps/api/src/modules/claims/claims.verification-decision.routes.ts',
    pathSubstrings: ['verifier-decision'],
    owner: 'Story 6.11',
    expectedMethods: ['post', 'post'],
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
    expectedMethods: ['post'],
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
    expectedMethods: ['get', 'post', 'post'],
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
    expectedMethods: ['get', 'get', 'get', 'post', 'post', 'post', 'post'],
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
    expectedMethods: ['post'],
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
    expectedMethods: ['get', 'post', 'post', 'post', 'post', 'post', 'post'],
  },
  {
    // Story 6.18 — the nominee NAME CHECK read + write (one GET + one POST on the same path).
    // BOTH are adjudication-adjacent and BOTH must require a human actor + district scope.
    // ⭐ The WRITE is the sharper case: `2026-09-19-226` cl.3/cl.5 make a NAMED HUMAN — the District
    // Admin — the only authority who may record whether the nominee's name matches, and cl.5 forbids
    // the SYSTEM acting on a mismatch at all. A machine/service actor recording that verdict would
    // be precisely the thing the ruling rules out, so the structural guard matters here as much as
    // the runtime one.
    // ⭐ The READ is listed for the 6.10 reason and one of its own: it decrypts the Tier-1 name of a
    // SECOND, LIVING subject (the nominee), so an unauthenticated or non-human path to it would
    // disclose a living person's name, not just a claim signal.
    file: 'apps/api/src/modules/claims/claims.nominee-name-check.routes.ts',
    // ⭐ THREE routes: the per-claim names READ, the per-claim CHECK write, and — added by the
    // 2026-09-20 review — the District Admin's CORRECTION QUEUE list. The queue is a list of claims
    // waiting for a correction; it decrypts the Pariwar Admin's return note, so it needs the same
    // authenticated-human chain as its siblings.
    pathSubstrings: ['nominee-name-check', 'under-correction'],
    owner: 'Story 6.18',
    expectedMethods: ['get', 'get', 'post'],
  },
];

/**
 * ⭐⭐ ROUTE FILES DELIBERATELY NOT IN `COVERAGE_SET`, each with the reason it is out.
 *
 * ⚠⚠ WHY THIS EXISTS. Until now `COVERAGE_SET` was a hand-maintained list with ⛔ no reconciliation
 * against the filesystem and ⛔ no floor. Two silent failures followed from that: **deleting an
 * entry kept the gate GREEN over a smaller set**, and **a brand-new `claims.*.routes.ts` was simply
 * invisible** — the gate reported success without ever having looked at it. A gate that cannot
 * notice what it is not looking at is not a gate ([[feedback_gate_scope_semantic_coverage]]).
 *
 * ⇒ every `claims.*.routes.ts` must now appear in EXACTLY ONE of three lists. An unclassified file
 *   is a HARD FAILURE, so adding a route file forces a deliberate decision about it.
 */
const NON_ADJUDICATION_ROUTES: readonly { file: string; why: string }[] = [
  {
    file: 'apps/api/src/modules/claims/claims.routes.ts',
    why: 'MEMBER-app routes (memberSession, no :pariwarId): there is no admin human-actor chain to assert. Member authorisation is claim-ownership, enforced in the handlers and covered by the member E2E specs.',
  },
];

/**
 * ⚠ ADMIN claim-route files that SHOULD be enrolled and are not yet. This is recorded DEBT, ⛔ not
 * an exemption: the gate prints them on every run so the number cannot quietly grow. Enrolling one
 * means giving it `pathSubstrings` + `expectedMethods`, which is a deliberate act per file.
 */
const ENROLMENT_OWED: readonly { file: string; why: string }[] = [
  {
    file: 'apps/api/src/modules/claims/claims.helpline.routes.ts',
    why: "Story 6.8/6.18 D4 — the helpline nominee-bank write, which D4's third branch made STATE-INDEPENDENT. Owed enrolment.",
  },
  {
    file: 'apps/api/src/modules/claims/claims.ground-inspection.routes.ts',
    why: 'Story 6.7/6.17 — the block-dimension ground-inspection gate. Owed enrolment.',
  },
  {
    file: 'apps/api/src/modules/claims/claims.convergence.routes.ts',
    why: 'Story 6.4 — the intake convergence point. Owed enrolment.',
  },
];

/** Every `claims.*.routes.ts` on disk must be classified. Returns the unclassified ones. */
function unclassifiedRouteFiles(): string[] {
  const dir = path.join(repoRoot, 'apps/api/src/modules/claims');
  const onDisk = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.routes.ts'))
    .map((f) => `apps/api/src/modules/claims/${f}`);
  const classified = new Set<string>([
    ...COVERAGE_SET.map((e) => e.file),
    ...NON_ADJUDICATION_ROUTES.map((e) => e.file),
    ...ENROLMENT_OWED.map((e) => e.file),
  ]);
  return onDisk.filter((f) => !classified.has(f));
}

/**
 * ⭐ A route file must land in EXACTLY ONE of the three classification lists (code review
 * 2026-09-22). `unclassifiedRouteFiles()` unions them through a `Set`, which silently absorbs a
 * file listed in TWO lists at once — e.g. both "no chain needed" (`NON_ADJUDICATION_ROUTES`) and
 * "owed enrolment" (`ENROLMENT_OWED`) — rather than flagging the contradiction. Returns the files
 * classified more than once.
 */
function duplicateClassifiedFiles(): string[] {
  const all = [
    ...COVERAGE_SET.map((e) => e.file),
    ...NON_ADJUDICATION_ROUTES.map((e) => e.file),
    ...ENROLMENT_OWED.map((e) => e.file),
  ];
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const f of all) {
    if (seen.has(f)) duplicates.add(f);
    seen.add(f);
  }
  return [...duplicates];
}

function main(): void {
  console.log(
    'claim-adjudication-human-actor-invariant gate — adjudication routes require a HUMAN actor chain (Story 6.10 AC4/AC5)\n',
  );

  const findings: AdjudicationFinding[] = [];
  const missingCoverage: string[] = [];

  // ⭐ ANTI-VACUITY FLOOR. Without it, deleting an entry shrinks the gate's scope in silence and it
  // still reports success. Raise this DELIBERATELY when enrolling, ⛔ never to make the gate quiet.
  const COVERAGE_FLOOR = 8; // ⚠ the TRUE count at 2026-09-21 — a first draft guessed 9 and the floor caught it.
  if (COVERAGE_SET.length < COVERAGE_FLOOR) {
    missingCoverage.push(
      `COVERAGE_SET has ${COVERAGE_SET.length} entries but the floor is ${COVERAGE_FLOOR} — an entry was ` +
        'deleted. Restore it, or lower the floor in the same commit with a reason.',
    );
  }

  // ⭐ RECONCILE AGAINST THE FILESYSTEM. A new `claims.*.routes.ts` is a hard failure until someone
  // classifies it — which is the whole point: the gate must notice what it is not looking at.
  for (const f of unclassifiedRouteFiles()) {
    missingCoverage.push(
      `${f} — UNCLASSIFIED claim route file. Add it to COVERAGE_SET (with pathSubstrings + ` +
        'expectedMethods), or to NON_ADJUDICATION_ROUTES / ENROLMENT_OWED with a stated reason.',
    );
  }

  // ⭐ A route file classified in more than one list is a contradiction (e.g. both "no chain
  // needed" and "owed enrolment"), not a harmless duplicate — flag it rather than let the `Set`
  // union in `unclassifiedRouteFiles()` silently absorb it (code review 2026-09-22).
  for (const f of duplicateClassifiedFiles()) {
    missingCoverage.push(
      `${f} — CLASSIFIED IN MORE THAN ONE LIST (COVERAGE_SET / NON_ADJUDICATION_ROUTES / ` +
        'ENROLMENT_OWED). A route file must be classified exactly once — remove it from all but one.',
    );
  }

  for (const entry of COVERAGE_SET) {
    const abs = path.join(repoRoot, entry.file);
    if (!fs.existsSync(abs)) {
      missingCoverage.push(`${entry.file} (${entry.owner}) — file not found`);
      continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const { findings: fileFindings, matchedPaths, matchedMethods, unresolved } = scanAdjudicationRoutes(
      entry.file,
      src,
      entry.pathSubstrings,
    );
    findings.push(...fileFindings);

    // ⚠ A route this gate could not statically resolve is a COVERAGE FAILURE, ⛔ not a shrug.
    for (const u of unresolved) {
      missingCoverage.push(
        `${entry.file} (${entry.owner}) — ${u.method.toUpperCase()} at line ${u.line} has a NON-LITERAL path; ` +
          'this gate cannot scan it. Register the route with a plain string literal.',
      );
    }

    if (matchedPaths.length === 0) {
      missingCoverage.push(
        `${entry.file} (${entry.owner}) — no route matched [${entry.pathSubstrings.join(', ')}]`,
      );
    } else {
      // ⭐ EXACTLY the expected method multiset — so a deleted or renamed sibling route cannot hide
      // behind a surviving one. Compared as SORTED multisets: order of registration is irrelevant,
      // but the count of each method is not.
      const got = [...matchedMethods].sort().join(',');
      const want = [...entry.expectedMethods].sort().join(',');
      if (got !== want) {
        missingCoverage.push(
          `${entry.file} (${entry.owner}) — expected methods [${want}] but scanned [${got}]. ` +
            'A route was added, removed or renamed: update expectedMethods deliberately, never to make the gate quiet.',
        );
      }
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

  if (ENROLMENT_OWED.length > 0) {
    console.log(`▸ Enrolment owed (${ENROLMENT_OWED.length} admin claim-route file(s) not yet scanned):`);
    for (const e of ENROLMENT_OWED) console.log(`    · ${e.file} — ${e.why}`);
    console.log('');
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

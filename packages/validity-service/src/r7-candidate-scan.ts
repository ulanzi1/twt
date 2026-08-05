// The Trustee-Lite R7 candidate scan — Story 10.24 (Task 6; AC5, AC7).
//
// This is the supply side of the seam Story 10.11 NAMED and left `unavailable`: it builds the
// `ViolatorCandidate[]` that `summarizeViolatorFlags` consumes, so the Trustee-Lite violator section
// lights up with ZERO changes to `packages/domain/src/trustee-lite/violator-flags.ts`.
//
// ── ⚠ AC7's BINDING structural criterion: no new N+1 query path ─────────────────────────────────
// The obvious implementation — `for (const member of pariwar) await getValidityAt(member)` — is the
// thing this file exists to NOT be. It would be O(M) full validity evaluations, each with its own
// event replay, keyed-store round-trip and audit line, on a Pariwar-wide admin GET. 10.11 already paid
// for this lesson at test scale (its own spec went 44s → 220s and timed out three unrelated suites on
// exactly this shape); at 4L it is a different order of failure.
//
// So the scan is BOUNDED — a FIXED number of queries regardless of member count:
//   1× `listMemberStatesForPariwar`            (the membership + its projected lifecycle state)
//   2× `readContributionFactInputsForPariwar`  (the ledger + missed-cycle aggregates, GROUP BY member)
//   4× `resolveByClauseId`                     (the R7(C)–(F) payloads — MEMBER-INDEPENDENT, resolved once)
//   ────────────────────────────────────────────
//   7 queries total, then a PURE per-member ladder evaluation with zero I/O.
//
// ── Why the PURE `evaluateLadder`, not `evaluateLadderAt` ───────────────────────────────────────
// `evaluateLadderAt` is the DB SHELL: it re-resolves each clause payload per call and routes through
// the Story 4.1 `evaluateAt` primitive (memo + audit-on-compute). Per member × 4 clauses that is the
// N+1 above. `evaluateLadder` is the SAME LADDER's pure core — `evaluateLadderAt` delegates to
// identical mechanics — so `isApplied`, the `parseMeta` swapped-payload guard, the clause-id sort and
// the precedence pick are the SHIPPED ones, not a re-implementation. There is no second definition of
// "applied" here; the only thing this module does differently is hoist the clause resolution out of
// the per-member loop, which is exactly what makes it bounded.
//
// The trade-off, stated rather than hidden: this path does NOT write the per-clause `rule.evaluate`
// compute-audit line that `evaluateAt` writes. That is correct for a read-only DETECTION scan over
// every member of a Pariwar — auditing M×4 clause computations per dashboard load would flood the
// audit chain with rows nobody reads, and the SURFACE read is already audited once by the handler's
// `admin_trustee_lite.read` line. An individual member's authoritative, audited R7 verdict comes from
// `getValidityAt`, which is unchanged.
//
// ── D2 still governs: only APPLIED clauses reach the candidate payload ──────────────────────────
// `deriveViolatorFlags` maps EVERY R7 clause id it finds in `applicableNiyamavaliClauses[]` into a
// flag, with no `applied` check. Contributing non-applied clauses here would flag every member in the
// Pariwar — the single worst outcome available in this story.
//
// ── Revert-sanity probe, RUN AND RECORDED (2026-08-05, round-2 code review) ─────────────────────
// A green scan proves nothing ([[feedback_gate_scope_semantic_coverage]]). Story 10.24 recorded a
// probe for the OTHER applied-filter (`evaluateAppliedR7ClauseSlots` in rules.ts) but never probed
// THIS one — the filter that feeds the Trustee-Lite surface D2 exists to protect. Probe RUN: removing
// `.filter((entry) => entry.applied)` below made
// `tests/integration/contribution-facts.spec.ts` → "the Pariwar scan surfaces the flagged member…"
// go RED, the flagged member's clause list going from the expected TWO (`r7-c`, `r7-f`) to FOUR — the
// two non-applied clauses (`r7-d`, `r7-e`, each `r7_not_applicable`) riding along as violator flags.
// The same run turns the CLEAN member's list from `[]` into four. That is D2's predicted catastrophe
// on the live scan path. Restored immediately; suite green.

import { contribution, member, niyamavali, ids, type Db } from '@twt/domain';
import { evaluateLadder, R7_NOT_APPLICABLE, type ResolvedClause } from '@twt/niyamavali-engine';

import { contributionFactsToBag, contributionFactsToSummary, deriveContributionFacts } from './producer.js';
import { R7_ACTIVATED_CLAUSE_IDS, R7_REGISTRY_UNPROVISIONED_PRODUCER } from './rules.js';
import { CONTRIBUTION_UNAVAILABLE } from './payload.js';
import type { ContributionHistorySummary } from './types.js';

/** One applicable clause, in the structural shape the domain violator derivation reads. */
export interface R7CandidateClause {
  readonly clauseId: string;
  readonly clauseVersionId: string;
  readonly outcome: string;
  readonly reasonCode: string;
}

/**
 * One candidate, shaped as `ViolatorCandidate` (domain `trustee-lite`) — structurally, not by import:
 * `@twt/domain` cannot import `@twt/validity-service` (the package cycle), so the two sides meet on a
 * declared shape. The handler passes these straight into `summarizeViolatorFlags`.
 */
export interface R7ViolatorCandidate {
  readonly memberId: string;
  readonly payload: {
    readonly memberId: string;
    readonly evaluatedAt: string;
    readonly contributionHistorySummary: ContributionHistorySummary;
    readonly applicableNiyamavaliClauses: readonly R7CandidateClause[];
  };
}

/**
 * What the scan reports, shaped to feed `summarizeViolatorFlags` directly (structurally — `@twt/domain`
 * cannot import this package, so the two sides meet on a declared shape).
 *
 * ⚖ Ratified 2026-08-05: "Unknown rules and unknown facts are the same constitutional state:
 * evaluation unavailable." An unprovisioned registry is the RULES half of that statement.
 */
export type R7ViolatorScan =
  | { readonly status: 'unavailable'; readonly producer: string }
  | { readonly status: 'available'; readonly candidates: readonly R7ViolatorCandidate[] };

/**
 * Scan a Pariwar for R7 violator candidates at the pinned instant `at`.
 *
 * Every member of the Pariwar is returned — including members with no applied clause, whose payload
 * carries an empty clause list. That is deliberate: `summarizeViolatorFlags` is what decides which
 * members surface (it omits zero-flag members), and handing it a PRE-FILTERED list would move that
 * decision out of the shared pure derivation.
 *
 * ⚠ A member absent from the bulk fact read is NOT "un-derivable". The bulk read GROUPs BY member, so
 * a member with no ledger rows and no assignments simply has no group — which is exactly what the
 * single-member aggregate returns for them (`count(*) = 0`, `max(...) = NULL`). Treating that as
 * `{ totalCount: 0, lastConfirmedAt: null, skips: 0 }` here keeps the bulk and single-member paths in
 * agreement; it is NOT a fabricated zero. A genuinely un-derivable member is one whose inputs are
 * structurally incoherent, and `deriveContributionFacts` returns `null` for those — this function then
 * emits the `producer_unavailable` sentinel for that member, which correctly degrades the WHOLE
 * section to `detection_unavailable` (10.11's deliberate strictness: a partial scan is a false
 * all-clear for exactly the members it skipped).
 */
export async function scanR7ViolatorCandidates(
  db: Db,
  pariwarId: ids.PariwarId,
  at: Date,
): Promise<R7ViolatorScan> {
  const evaluatedAt = at.toISOString();

  // ── Bounded reads (AC7): membership + facts + clause payloads, none of them per-member ─────────
  const [memberStates, factInputs, resolvedClauses] = await Promise.all([
    member.listMemberStatesForPariwar(db, pariwarId),
    contribution.readContributionFactInputsForPariwar(db, pariwarId, at),
    resolveActivatedR7Clauses(db, pariwarId, at),
  ]);

  // ── The registry is unprovisioned for this Pariwar: no R7 clause version resolves at `at` ────────
  //
  // ⚖ Ratified 2026-08-05 by BigDev: "Unknown rules and unknown facts are the same constitutional
  // state: evaluation unavailable." So this reports `unavailable`, NOT an empty candidate list.
  //
  // An earlier revision returned `[]` here on the reasoning that an unprovisioned registry is a "no
  // clause applies" answer. That is wrong in the way that matters: `summarizeViolatorFlags` turns an
  // empty candidate list into `{ status: 'ok', members: [] }`, which renders as "detection ran, nobody
  // is flagged" — indistinguishable from a genuinely clean Pariwar, on the surface that feeds
  // suspension decisions. R7 detection did not run at all. That is the false all-clear D1-B forbids,
  // and it is the same failure shape as fabricating a clean member from an unprojected ledger.
  if (resolvedClauses.length === 0) {
    return { status: 'unavailable', producer: R7_REGISTRY_UNPROVISIONED_PRODUCER };
  }

  const inputsByMember = new Map(factInputs.members.map((row) => [String(row.memberId), row]));
  const resolvedClauseVersionIds = resolvedClauses.map((c) => c.clauseVersionId);

  const candidates: R7ViolatorCandidate[] = [];
  for (const { memberId, state } of memberStates) {
    // A member absent from the bulk read has no ledger rows and no assignments — which the single-member
    // aggregate would report identically (`count(*) = 0`, `max(...) = NULL`). Carrying the Pariwar's
    // coverage onto the synthesized row is what keeps the two paths in agreement: whether that member is
    // CLEAN or UN-DERIVABLE is decided by coverage, never by row presence.
    const inputs = inputsByMember.get(String(memberId)) ?? {
      totalCount: 0,
      lastConfirmedAt: null,
      skipsCurrentYear: 0,
      earliestSkipClosedAt: null,
      opportunitiesSinceLast: 0,
      coveredFrom: factInputs.coveredFrom,
    };
    const facts = deriveContributionFacts(inputs, at);
    if (facts === null) {
      candidates.push({
        memberId: String(memberId),
        payload: {
          memberId: String(memberId),
          evaluatedAt,
          contributionHistorySummary: CONTRIBUTION_UNAVAILABLE,
          applicableNiyamavaliClauses: [],
        },
      });
      continue;
    }

    // PURE — zero I/O in this loop. Same ladder mechanics `evaluateLadderAt` uses.
    const ladder = evaluateLadder(
      resolvedClauses,
      {
        pariwarId,
        memberId,
        memberState: state,
        facts: contributionFactsToBag(facts),
        evaluatedAt: at,
        resolvedClauseVersionIds,
      },
      R7_NOT_APPLICABLE,
    );

    candidates.push({
      memberId: String(memberId),
      payload: {
        memberId: String(memberId),
        evaluatedAt,
        contributionHistorySummary: contributionFactsToSummary(facts),
        // D2 — APPLIED ONLY. The ladder already sorts by clause id (deterministic order).
        applicableNiyamavaliClauses: ladder.perClauseResults
          .filter((entry) => entry.applied)
          .map((entry) => ({
            clauseId: entry.clauseId,
            clauseVersionId: String(entry.result.provenance.clauseVersionId),
            outcome: entry.result.result.decision,
            reasonCode: entry.result.reasonCode,
          })),
      },
    });
  }
  return { status: 'available', candidates };
}

/**
 * Resolve the four ACTIVATED R7 clause payloads ONCE for the Pariwar at `at` — member-independent, so
 * it is hoisted out of the per-member loop (that hoist is the whole point of this module).
 *
 * A clause with no version effective at `at` is simply absent, mirroring `evaluateLadderAt`'s
 * `missingClauseIds` behaviour: an unprovisioned clause contributes nothing rather than failing the
 * scan. HELD clauses are never resolved — `R7_ACTIVATED_CLAUSE_IDS` is the only input.
 */
async function resolveActivatedR7Clauses(
  db: Db,
  pariwarId: ids.PariwarId,
  at: Date,
): Promise<ResolvedClause[]> {
  const rows = await Promise.all(
    R7_ACTIVATED_CLAUSE_IDS.map((clauseId) =>
      niyamavali.resolveByClauseId(db, pariwarId, ids.clauseId(clauseId), at),
    ),
  );
  const resolved: ResolvedClause[] = [];
  for (const row of rows) {
    if (row === null) continue;
    resolved.push({
      clauseId: row.clauseId,
      clauseVersionId: row.clauseVersionId,
      payload: row.payload,
      benefitMechanism: row.benefitMechanism,
    });
  }
  return resolved;
}

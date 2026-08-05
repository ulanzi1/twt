// R7 violator flags — DETECTION ONLY — Story 10.11 (Task 1; AC4). PURE.
//
// ── The ratified decision this file implements, verbatim (D1-B, BigDev, 2026-08-04) ───────────
//
//   "Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly
//    render `detection_unavailable` until the contribution-fact producer exists. The story shall not
//    derive R7 violations outside the rule engine."
//
// BOTH halves are binding. The first forbids shipping this section as an empty list or omitting it —
// on a governance surface an empty violator list reads as *"no members are in violation"*, a false
// all-clear, which is a worse failure than an honest gap. The second forbids deriving R7 violation
// here in ANY disguise — "temporary", "just for the flag", "read-only". If R7 facts are not supplied
// to the registry-driven engine, this module does not compute them. It reads the Story 4.6 validity
// payload's already-evaluated clause list and filters it. Nothing else.
//
// ── Why the section is dark today, verified against live source ───────────────────────────────
// `packages/validity-service/src/payload.ts:294` hardcodes
// `contributionHistorySummary: CONTRIBUTION_UNAVAILABLE`, and `types.ts:56-65` states plainly that
// R7/R8 are OMITTED from `applicableNiyamavaliClauses[]` until a producer supplies real
// `contribution.*` facts. Epics 8 and 9 closed `done` and the FACT producer was never built (the
// EVENT producer was — `contribution.confirmed` has two live emitters — which is why the gap
// survived two rounds of governance review; nothing maps events to the seven fact keys the engine
// reads). It is now owned: Stories 10.24 (projection + R7(C)–(F)), 10.25 (R7(A) restoration
// accounting) and 10.26 (R7(G) excuse assertion), all `backlog` at the time of writing.
//
// So today the R7 ∩ applicable-clauses intersection is empty BY CONSTRUCTION, which is exactly why
// it must not be rendered as an empty result. The producer-unavailable sentinel is checked FIRST and
// short-circuits to `detection_unavailable`.
//
// ── Producer-shaped, not story-shaped ─────────────────────────────────────────────────────────
// When 10.24 lands, flags appear here with ZERO changes to this file: the sentinel stops saying
// `producer_unavailable`, the engine starts emitting R7 clauses into `applicableNiyamavaliClauses`,
// and the filter below starts matching. A unit test feeds a synthetic payload carrying real applied
// R7 clauses and asserts flags render — the seam is proven now, not promised.
//
// ── Why the payload arrives structurally typed ────────────────────────────────────────────────
// `@twt/validity-service` DEPENDS ON `@twt/domain`, so this module cannot import its types (the
// turbo/package cycle — the same one `claim/concealment-review.ts:10-13` documents for the engine).
// The input is therefore declared STRUCTURALLY below. That is not a workaround; it is what makes the
// derivation producer-shaped: it names the fields it reads and nothing more.

/**
 * The seven R7(A–G) contribution-discipline clause ids.
 *
 * ⚠ RE-DECLARED, and deliberately so. The canonical list is `R7_CLAUSE_IDS` in
 * `@twt/niyamavali-engine`'s `r7-ladder.ts`, and `@twt/domain` MUST NOT import it: the engine
 * depends on domain, so a domain → engine import is a package cycle (`concealment-review.ts:10-13`
 * documents the identical constraint, and `claim/r9-voting.ts:47-49` the identical resolution).
 *
 * Kept in LOCKSTEP by a drift-guard test that lives in the ENGINE package (which CAN import
 * `@twt/domain`): `packages/niyamavali-engine/tests/r7-clause-ids-lockstep.test.ts`. Adding or
 * removing an R7 sub-clause fails THERE until this list is updated in lockstep — it is not a
 * hand-maintained copy hoping to stay honest.
 */
export const TRUSTEE_LITE_R7_CLAUSE_IDS = [
  'niy.contribution-discipline.r7-a',
  'niy.contribution-discipline.r7-b',
  'niy.contribution-discipline.r7-c',
  'niy.contribution-discipline.r7-d',
  'niy.contribution-discipline.r7-e',
  'niy.contribution-discipline.r7-f',
  'niy.contribution-discipline.r7-g',
] as const;

export type TrusteeLiteR7ClauseId = (typeof TRUSTEE_LITE_R7_CLAUSE_IDS)[number];

const R7_CLAUSE_ID_SET: ReadonlySet<string> = new Set(TRUSTEE_LITE_R7_CLAUSE_IDS);

/** Is this clause id one of the seven R7 sub-clauses? Fail-closed on anything unrecognized. */
export function isR7ClauseId(clauseId: string): clauseId is TrusteeLiteR7ClauseId {
  return R7_CLAUSE_ID_SET.has(clauseId);
}

// ── The structural payload contract (see the header: no validity-service import) ──────────────

/** One applicable clause as the 4.6 payload carries it (mirrors `ApplicableClause`). */
export interface ViolatorFlagClauseInput {
  readonly clauseId: string;
  readonly clauseVersionId: string;
  /** The engine's decision slug for this clause (DATA — from the clause payload's on_pass/on_fail). */
  readonly outcome: string;
  /** The machine-readable reason code. */
  readonly reasonCode: string;
}

/**
 * The contribution-history sub-object. Today it is ALWAYS
 * `{ status: 'producer_unavailable', producer: 'epic-8-9' }` (`payload.ts:294`). The optional
 * members below are the shape a real producer will supply; they are read only when `status` is NOT
 * `producer_unavailable`, so this module needs no change when the producer lands.
 */
export interface ViolatorFlagContributionSummaryInput {
  readonly status: string;
  /** The story/epic that will supply the `contribution.*` facts — the audit trail for the gap. */
  readonly producer?: string;
  /** The evaluated `contribution.*` fact key/value pairs, once a producer supplies them. */
  readonly facts?: Readonly<Record<string, string | number | boolean | null>>;
  /** When the member's current discipline lapse began, once a producer can establish it. */
  readonly lapseSince?: string | null;
}

/** The subset of the Story 4.6 `MemberValidityPayload` this derivation reads. Nothing more. */
export interface ViolatorFlagPayloadInput {
  readonly memberId: string;
  readonly evaluatedAt: string;
  readonly contributionHistorySummary: ViolatorFlagContributionSummaryInput;
  readonly applicableNiyamavaliClauses: readonly ViolatorFlagClauseInput[];
}

// ── The flag (AC4's frozen field set) ─────────────────────────────────────────────────────────

/** One evaluated fact that establishes a clause — a `contribution.*` key and its value. */
export interface ViolatorFlagFact {
  readonly key: string;
  readonly value: string | number | boolean | null;
}

/**
 * ONE R7 violator flag. The field set is FROZEN and deliberately austere (AC4): `clauseId`,
 * `clauseLabel`, `factsEstablishing[]`, `holdingSince`.
 *
 * There is NO `recommendedAction`, NO `suggestedOutcome`, NO severity, NO priority, NO rank, NO
 * score, and NO ordering by inferred urgency — `epics.md:3582-3587` and `prd.md:879`. A contracts
 * frozen-key test pins the wire shape and additionally rejects any key matching
 * `/recommend|suggest|advis|severit|urgen|priorit|rank|score/i`, so a future field cannot smuggle a
 * recommendation in under a new name. The trustee decides; the system only shows what it observed.
 */
export interface ViolatorFlag {
  readonly clauseId: string;
  /** The clause version + outcome slug that fired — provenance, NOT a judgement. */
  readonly clauseLabel: string;
  /** The clause's own evaluated `contribution.*` facts; EMPTY when the producer supplies none. */
  readonly factsEstablishing: readonly ViolatorFlagFact[];
  /**
   * When the member entered this holding, ISO-8601 — or `null` when no producer has established an
   * onset instant.
   *
   * `null` is the honest answer today and is NOT back-filled from `evaluatedAt`: "the clause applies
   * as of this evaluation" and "the member has been in violation since this date" are different
   * claims, and printing the former as the latter on the surface that feeds a suspension decision is
   * exactly the fabrication AC2's "no deadline" affordance exists to refuse. Story 10.24/10.25 will
   * supply a real onset; until then the UI renders an explicit "onset not on record".
   */
  readonly holdingSince: string | null;
}

/**
 * The section is dark because no producer supplies `contribution.*` facts (AC4). Carries the
 * producer identity so the surface can NAME what is missing rather than showing a bare gap.
 */
export interface ViolatorFlagsUnavailable {
  readonly status: 'detection_unavailable';
  /** The raw sentinel from the payload (e.g. `epic-8-9`) — the UI maps it to admin-facing copy. */
  readonly producer: string;
}

/** Detection ran. `flags` MAY be empty — and here, empty legitimately means "none applied". */
export interface ViolatorFlagsOk {
  readonly status: 'ok';
  readonly flags: readonly ViolatorFlag[];
}

export type ViolatorFlagsResult = ViolatorFlagsUnavailable | ViolatorFlagsOk;

/** The sentinel `contributionHistorySummary.status` that means "no producer exists yet". */
export const CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS = 'producer_unavailable';

/** Fallback producer label when the payload carries the sentinel without naming a producer. */
const UNNAMED_PRODUCER = 'unknown';

/**
 * Derive the member's R7 violator flags from an already-evaluated Story 4.6 validity payload (AC4).
 * PURE — no I/O, no clock, no engine call, and NO R7 derivation of its own (D1-B).
 *
 * Returns `detection_unavailable` (naming the missing producer) whenever the contribution-history
 * sentinel says no producer supplied facts — checked FIRST, before the clause filter, so the empty
 * intersection that condition guarantees can never be mistaken for "detection ran and found none".
 * That distinction is the entire point of this function.
 */
export function deriveViolatorFlags(payload: ViolatorFlagPayloadInput): ViolatorFlagsResult {
  const summary = payload.contributionHistorySummary;
  if (summary.status === CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS) {
    return { status: 'detection_unavailable', producer: summary.producer ?? UNNAMED_PRODUCER };
  }

  const facts = summary.facts ?? {};
  // Only `contribution.*` facts can establish an R7 holding — the fact family the R7 ladder reads.
  // Sorted for a replay-stable, deterministic order (the payload's own array-ordering discipline).
  const contributionFacts: ViolatorFlagFact[] = Object.keys(facts)
    .filter((key) => key.startsWith('contribution.'))
    .sort()
    .map((key) => ({ key, value: facts[key] ?? null }));

  const flags = payload.applicableNiyamavaliClauses
    .filter((clause) => isR7ClauseId(clause.clauseId))
    .map((clause) => ({
      clauseId: clause.clauseId,
      clauseLabel: `${clause.outcome} · ${clause.reasonCode}`,
      factsEstablishing: contributionFacts,
      holdingSince: summary.lapseSince ?? null,
    }));

  return { status: 'ok', flags };
}

// ── The section (aggregating the per-member derivation) ───────────────────────────────────────

/** One member's derived flags, as the section carries them. */
export interface ViolatorFlagMember {
  readonly memberId: string;
  readonly flags: readonly ViolatorFlag[];
}

/**
 * The candidate members to evaluate — a DISCRIMINATED source, not a bare array, because "there are
 * no flagged members" and "nothing can tell us who is flagged" are different facts and an array
 * cannot distinguish them.
 *
 * Today the caller always passes `unavailable`: the R7 candidate set is a PROJECTION Story 10.24
 * owns and it does not exist, so scanning every member would only rediscover an intersection
 * `payload.ts:294` already guarantees is empty. When 10.24 lands, the API call site switches to
 * `available` and flags render — with no change to this file (proven by the unit test that feeds a
 * synthetic payload carrying applied R7 clauses).
 */
export type ViolatorCandidateSource =
  | { readonly status: 'unavailable'; readonly producer: string }
  | { readonly status: 'available'; readonly candidates: readonly ViolatorCandidate[] };

export interface ViolatorCandidate {
  readonly memberId: string;
  readonly payload: ViolatorFlagPayloadInput;
}

/** The section as the surface renders it. `ok` carries only members that actually hold ≥1 flag. */
export type ViolatorFlagsSection =
  | ViolatorFlagsUnavailable
  | { readonly status: 'ok'; readonly members: readonly ViolatorFlagMember[] };

/**
 * Aggregate the per-member derivation into the section (AC4). PURE.
 *
 * Degrades to `detection_unavailable` if the candidate source is unavailable OR if ANY candidate's
 * own payload still carries the producer sentinel. That second condition is deliberately strict: a
 * PARTIAL scan on a governance surface is a false all-clear for exactly the members it could not
 * evaluate, and a trustee reading a list of three flagged members has no way to know a fourth was
 * skipped. Better one honest gap than a list that looks complete and is not.
 *
 * Members holding zero flags are omitted — within an `ok` section, absence genuinely means "no R7
 * clause applied to this member", which is a claim the data now supports.
 */
export function summarizeViolatorFlags(source: ViolatorCandidateSource): ViolatorFlagsSection {
  if (source.status === 'unavailable') {
    return { status: 'detection_unavailable', producer: source.producer };
  }

  const members: ViolatorFlagMember[] = [];
  for (const candidate of source.candidates) {
    const result = deriveViolatorFlags(candidate.payload);
    if (result.status === 'detection_unavailable') return result;
    if (result.flags.length > 0) members.push({ memberId: candidate.memberId, flags: result.flags });
  }
  // Deterministic order — by member id. NOT by flag count, clause precedence, or any other proxy for
  // "who most needs action": ordering by inferred urgency is itself a recommendation (AC4).
  members.sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
  return { status: 'ok', members };
}

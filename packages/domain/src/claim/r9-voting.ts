// R9 special-case voting vocabulary + the pure, DATA-driven outcome computation — Story 6.14 (Task 3; D-D).
//
// The bounded vocabulary the R9 voting write paths + read models turn on (three pgEnums + their TS tuples),
// PLUS the pure functions that derive the voting requirement from the niyamavali clause DATA and compute
// the panel outcome. NO business rule is hardcoded per-clause: `deriveVotingRequirement` READS the clause
// payload's voting metadata (the engine NEVER re-encodes a rule — [[project_niyamavali_precedence_is_provenance]]),
// and `computeR9Outcome` is a pure function of (live votes, panel size, requirement).
//
// ── The IMMUTABLE-PANEL, panel-size-denominator model (D-D, BigDev-ratified) ────────────────
// The DENOMINATOR is the PANEL SIZE `N` (the immutable roster captured at open), NOT the number of cast
// votes — an absent or `deny` panelist counts AGAINST the approval threshold:
//   · majority       ⟺ approve > N/2   (i.e. approve ≥ ⌊N/2⌋+1)
//   · supermajority  ⟺ approve ≥ ⌈2N/3⌉
//   · unanimous      ⟺ approve === N   (every panel member approved)
// A `quorum_required` (v1 default `⌊N/2⌋+1`, snapshotted at open) gates finalize BEFORE this runs (a
// below-quorum finalize is a 4xx, never a computed `denied`) — that gate lives in the write path, not here.

import { pgEnum } from 'drizzle-orm/pg-core';

// ── The three bounded R9 voting enums (pgEnum + TS tuple) ───────────────────────────────────

/** An individual panelist's vote. */
export const R9_VOTES = ['approve', 'deny'] as const;
export const r9VoteEnum = pgEnum('r9_vote', R9_VOTES);
export type R9Vote = (typeof R9_VOTES)[number];

/**
 * The DATA-derived approval requirement (D-D). `majority` is the v1 default (+ `R9`'s `majority_required`);
 * `supermajority`/`unanimous` are forward-compat + DATA-driven (no per-clause hardcode). Value-mirrored by
 * the `@twt/contracts` `R9VotingRequirement` z.enum (the browser-bundle rule; a lockstep test pins them).
 */
export const R9_VOTING_REQUIREMENTS = ['majority', 'supermajority', 'unanimous'] as const;
export const r9VotingRequirementEnum = pgEnum('r9_voting_requirement', R9_VOTING_REQUIREMENTS);
export type R9VotingRequirement = (typeof R9_VOTING_REQUIREMENTS)[number];

/**
 * The finalized session outcome (`approved` | `denied`). Distinct from the per-vote `r9_vote` enum. Claim
 * STATE is still derived from the paired `claim.r9_outcome` event, NEVER from this column (AC0/AC10).
 */
export const R9_SESSION_OUTCOMES = ['approved', 'denied'] as const;
export const r9SessionOutcomeEnum = pgEnum('r9_session_outcome', R9_SESSION_OUTCOMES);
export type R9SessionOutcome = (typeof R9_SESSION_OUTCOMES)[number];

// ── The allowed-clause set (the three `route_r9_voting` sub-clauses Story 4.4 committed as DATA) ──

/**
 * The three R9-voting clause ids — the ONLY clause ids `openR9VotingSession` accepts (AC2). Each carries
 * `on_pass: 'route_r9_voting'` + `voting_required: true` in the niyamavali seed (Story 4.4). Kept in
 * LOCKSTEP with `@twt/niyamavali-engine`'s `special-death.ts` via a test in the engine package (which CAN
 * import `@twt/domain`, whereas domain must NOT import the engine — the turbo cycle). Note the epic's
 * longer `…-2025-03` suffix for the Mar-2025 clause is loose prose — the real committed id has no suffix.
 */
export const R9_VOTING_CLAUSE_IDS = [
  'niy.special-death.r9',
  'niy.special-death.r9-a',
  'niy.special-death.r9-suicide-murder',
] as const;
export type R9VotingClauseId = (typeof R9_VOTING_CLAUSE_IDS)[number];

/** Is `clauseId` one of the three R9-voting clauses (the allowed-selection set, AC2)? Fail-closed. */
export function isR9VotingClauseId(clauseId: string): clauseId is R9VotingClauseId {
  return (R9_VOTING_CLAUSE_IDS as readonly string[]).includes(clauseId);
}

/** Panel roster upper bound (AC2) — value-mirrored with `@twt/contracts`'s `R9_PANEL_MAX_MEMBERS`; a hard
 *  sanity ceiling against an unbounded roster forcing an unbounded per-member display-name lookup fan-out.
 *  Enforced here too (not just at the contract edge) as domain-layer defense-in-depth, matching every other
 *  invariant `openR9VotingSession` enforces independent of the transport layer. */
export const R9_PANEL_MAX_MEMBERS = 25;

// ── DATA-driven derivation + the quorum default ─────────────────────────────────────────────

/** Thrown when a clause payload carries NONE of the recognized voting-requirement keys (registry data-shape
 *  drift) — a silent `majority` fallback in this case could under-enforce a `unanimous`/`supermajority` rule
 *  the payload actually intends. Fail loud instead. */
export class R9UnrecognizedVotingRequirementError extends Error {
  public readonly name = 'R9UnrecognizedVotingRequirementError';
  public constructor(public readonly clausePayloadKeys: readonly string[]) {
    super(
      `[r9-voting] clause payload carries none of the recognized voting-requirement keys ` +
        `(unanimous_required, supermajority_required, majority_required, voting_required) — ` +
        `got keys [${clausePayloadKeys.join(', ')}]`,
    );
  }
}

/**
 * Derive the voting requirement from an R9 clause's payload voting metadata (D-D). Precedence:
 * `unanimous_required` → `unanimous`; `supermajority_required` → `supermajority`; else `majority` (the v1
 * seed carries only `majority_required` / a bare `voting_required`, so all three R9 clauses resolve to
 * `majority`). Forward-compat + DATA-driven — NO hardcoded per-clause branch. The engine READS the rule; it
 * never re-encodes it. Throws if the payload carries NONE of the recognized keys (a data-shape drift), rather
 * than silently defaulting to `majority` — a shape drift must never silently under-enforce a stricter rule.
 */
export function deriveVotingRequirement(clausePayload: Record<string, unknown>): R9VotingRequirement {
  if (clausePayload['unanimous_required'] === true) return 'unanimous';
  if (clausePayload['supermajority_required'] === true) return 'supermajority';
  if (clausePayload['majority_required'] === true || clausePayload['voting_required'] === true) return 'majority';
  throw new R9UnrecognizedVotingRequirementError(Object.keys(clausePayload));
}

/**
 * The v1 quorum default: a strict majority of the panel, `⌊N/2⌋ + 1` (for a single-member panel that is
 * `1`, preserving the no-empty-finalize rule). Snapshotted at open (`claim_r9_voting_sessions.quorum_required`)
 * and gating finalize. Forward-compat to a DATA-driven `quorum_required` clause field.
 */
export function r9QuorumFor(panelSize: number): number {
  return Math.floor(panelSize / 2) + 1;
}

// ── The pure outcome computation (panel-size denominator, D-D) ───────────────────────────────

export interface R9OutcomeComputation {
  outcome: R9SessionOutcome;
  approve_count: number;
  deny_count: number;
}

/** Thrown when `computeR9Outcome` receives a `votingRequirement` outside the three recognized literals (e.g.
 *  a stale DB row after an enum drift) — a silent fallthrough would leave the threshold undefined and always
 *  resolve `denied`, which is exactly the kind of silent-under-enforcement `deriveVotingRequirement` already
 *  fails loud on. Fail loud here too rather than let a data-shape drift silently decide a ₹50L outcome. */
export class R9InvalidVotingRequirementError extends Error {
  public readonly name = 'R9InvalidVotingRequirementError';
  public constructor(public readonly received: string) {
    super(`[r9-voting] computeR9Outcome received an unrecognized voting_requirement '${received}'`);
  }
}

/**
 * Compute the R9 panel outcome — PURE. The DENOMINATOR is the immutable `panelSize` `N` (NOT the number of
 * cast votes); an absent or `deny` panelist counts AGAINST the approval threshold:
 *   · majority       ⟺ approve > N/2   (approve ≥ ⌊N/2⌋+1)
 *   · supermajority  ⟺ approve ≥ ⌈2N/3⌉
 *   · unanimous      ⟺ approve === N
 * Returns `approved` iff the threshold is met, else `denied`, with the tally. The QUORUM gate
 * (`castLiveVotes ≥ quorum_required`) is checked in the finalize write-path BEFORE this runs (a below-quorum
 * finalize is a 4xx, never a computed `denied`).
 */
export function computeR9Outcome(
  liveVotes: readonly { vote: R9Vote }[],
  panelSize: number,
  votingRequirement: R9VotingRequirement,
): R9OutcomeComputation {
  const approve_count = liveVotes.filter((v) => v.vote === 'approve').length;
  const deny_count = liveVotes.filter((v) => v.vote === 'deny').length;

  let threshold: number;
  switch (votingRequirement) {
    case 'majority':
      threshold = Math.floor(panelSize / 2) + 1; // approve > N/2
      break;
    case 'supermajority':
      threshold = Math.ceil((2 * panelSize) / 3); // approve ≥ ⌈2N/3⌉
      break;
    case 'unanimous':
      threshold = panelSize; // every panel member approved
      break;
    default: {
      const exhaustive: never = votingRequirement;
      throw new R9InvalidVotingRequirementError(String(exhaustive));
    }
  }

  const outcome: R9SessionOutcome = approve_count >= threshold ? 'approved' : 'denied';
  return { outcome, approve_count, deny_count };
}

// ── The prepared-ciphertext boundary type (AC3) ───────────────────────────────────────────────
//
// The per-vote rationale's ≤500-char bound is a PLAINTEXT business rule (`R9_RATIONALE_MAX_CHARS` in
// `@twt/contracts`'s `R9VoteRequest`/`R9CancelRequest` superRefine) enforced ONCE, at the trusted
// pre-encryption boundary — BEFORE `encryptR9VoteRationale` runs (`apps/api/.../r9-vote-crypto.ts`). The
// domain write path receives ONLY ciphertext and can never re-derive the plaintext's character length from
// it (envelope/KMS overhead + base64/framing means ciphertext byte length does not linearly track plaintext
// char count) — so a ciphertext-length check here would be a FALSE proxy for the ≤500-char rule, not a
// legitimate re-enforcement of it. AC3's "domain write-path" clause is therefore satisfied by two DISTINCT,
// narrower guarantees instead: (1) a compile-time brand asserting the value passed the sanctioned
// validate-then-encrypt path (`prepareR9VoteCiphertext`, called ONLY from the route after contract
// validation + encryption), and (2) a storage-safety ceiling — NOT a business-rule proxy — guarding the
// `piiColumn` from a pathological oversized envelope reaching the DB.

/** Storage-safety ceiling for a Tier-1 R9-vote rationale envelope, in bytes. NOT a proxy for the ≤500-char
 *  plaintext business rule (that is enforced pre-encryption at the contract boundary, `R9_RATIONALE_MAX_CHARS`
 *  in `@twt/contracts`) — this only guards the DB column against a pathologically oversized ciphertext. */
export const R9_VOTE_CIPHERTEXT_MAX_BYTES = 8192;

/** Thrown by `prepareR9VoteCiphertext` when a ciphertext exceeds the storage-safety ceiling, or is empty. */
export class R9CiphertextStorageError extends Error {
  public readonly name = 'R9CiphertextStorageError';
  public constructor(public readonly reason: 'empty' | 'too_large', public readonly byteLength: number) {
    super(
      reason === 'empty'
        ? '[r9-voting] rationale ciphertext must not be empty'
        : `[r9-voting] rationale ciphertext of ${byteLength} bytes exceeds the ${R9_VOTE_CIPHERTEXT_MAX_BYTES}-byte storage-safety ceiling`,
    );
  }
}

/** A rationale ciphertext that has passed the sanctioned pre-encryption boundary (AC3). Opaque brand — the
 *  ONLY way to obtain one is `prepareR9VoteCiphertext`, called from the route AFTER the contract's
 *  ≤500-char plaintext check + AFTER encryption. `castR9Vote` accepts ONLY this type, so a caller cannot
 *  hand it a raw, unvalidated string. */
export type PreparedR9VoteCiphertext = string & { readonly __brand: 'PreparedR9VoteCiphertext' };

/**
 * Stamp a ciphertext as prepared (AC3). Callers (the route, AFTER the contract's ≤500-char plaintext check
 * and AFTER encryption) call this to obtain the branded type `castR9Vote` requires. Enforces ONLY
 * non-emptiness + the storage-safety ceiling here — this is deliberately NOT a re-derivation of the
 * plaintext-length business rule (structurally impossible post-encryption).
 */
export function prepareR9VoteCiphertext(ciphertext: string): PreparedR9VoteCiphertext {
  const byteLength = Buffer.byteLength(ciphertext, 'utf-8');
  if (byteLength === 0) throw new R9CiphertextStorageError('empty', byteLength);
  if (byteLength > R9_VOTE_CIPHERTEXT_MAX_BYTES) throw new R9CiphertextStorageError('too_large', byteLength);
  return ciphertext as PreparedR9VoteCiphertext;
}

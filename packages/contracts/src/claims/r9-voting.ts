// packages/contracts/src/claims/r9-voting.ts
//
// R9 special-case voting transport DTOs — Story 6.14 (the R9 panel surface + the FIRST claim-flow read of
// the niyamavali clause registry). The request/response wire shapes for the seven surfaces:
//   · GET  …/admin/r9-voting/queue                 → the R9 voting queue (AC1)
//   · GET  …/admin/r9-voting/:claimCaseId           → the per-claim panel model (AC1)
//   · POST …/admin/r9-voting/:claimCaseId/open      → open a session (AC2)
//   · POST …/admin/r9-voting/:claimCaseId/vote      → cast/revise a vote (AC3)
//   · POST …/admin/r9-voting/:claimCaseId/finalize  → finalize the outcome (AC4)
//   · POST …/admin/r9-voting/:claimCaseId/cancel    → cancel/correct (AC5)
//   · GET  …/admin/r9-voting/votes-by-trustee       → the votes-by-trustee transcript (AC8)
//
// ── Contracts discipline (the cycle-freeze.ts precedent) ────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the R9 wire enums +
// the R9-voting clause-id set are RE-DECLARED here, value-aligned with the domain `r9_vote` /
// `r9_voting_requirement` / `r9_session_outcome` pgEnums + `R9_VOTING_CLAUSE_IDS`. A cross-package LOCKSTEP
// test pins them. ALL objects `.strict()` — a smuggled `voter_display` / actor id / unknown field is a 400
// (R5: the server resolves + snapshots actor identity, never the client).

import { z } from 'zod';

// ── R9 vocabulary wire mirror (value-aligned with @twt/domain) ──────────────────────────────

/** The DATA-derived approval requirement (value-aligned with the domain `r9_voting_requirement`). */
export const R9VotingRequirement = z.enum(['majority', 'supermajority', 'unanimous']);
export type R9VotingRequirement = z.output<typeof R9VotingRequirement>;

/** An individual panelist's vote (value-aligned with the domain `r9_vote`). */
export const R9Vote = z.enum(['approve', 'deny']);
export type R9Vote = z.output<typeof R9Vote>;

/** The finalized session outcome (value-aligned with the domain `r9_session_outcome`). */
export const R9SessionOutcome = z.enum(['approved', 'denied']);
export type R9SessionOutcome = z.output<typeof R9SessionOutcome>;

/** The three R9-voting clause ids (value-aligned with the domain `R9_VOTING_CLAUSE_IDS`; lockstep-pinned). */
export const R9_VOTING_CLAUSE_IDS = [
  'niy.special-death.r9',
  'niy.special-death.r9-a',
  'niy.special-death.r9-suicide-murder',
] as const;

/** Max per-vote / cancel rationale length (mirrors the 6.11/6.13 ≤500 posture). */
export const R9_RATIONALE_MAX_CHARS = 500;

/** Is `clauseId` one of the three R9-voting clauses? The superRefine + a UI guard consume it. */
export function isR9VotingClauseId(clauseId: string): boolean {
  return (R9_VOTING_CLAUSE_IDS as readonly string[]).includes(clauseId);
}

// ── AC1 — the queue read model ──────────────────────────────────────────────────────────────

export const R9QueueItem = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    /** The routing trustee's R5 display snapshot (from the routed_to_r9 decision row). */
    routing_actor_display: z.string(),
    /** The routing reason code (non-PII; e.g. r9_special_case). */
    routing_reason_code: z.string().nullable(),
    /** True when a live (non-superseded, not-yet-finalized) R9 voting session is already open. */
    session_open: z.boolean(),
  })
  .strict();
export type R9QueueItem = z.output<typeof R9QueueItem>;

export const R9QueueResponse = z
  .object({
    pariwar_id: z.string().uuid(),
    items: z.array(R9QueueItem),
  })
  .strict();
export type R9QueueResponse = z.output<typeof R9QueueResponse>;

// ── AC1 — the per-claim panel model ───────────────────────────────────────────────────────────

/** One panel-roster member with its resolved R5 display (AC1/AC2). */
export const R9PanelMember = z
  .object({
    actor_id: z.string(),
    actor_display: z.string(),
  })
  .strict();
export type R9PanelMember = z.output<typeof R9PanelMember>;

/** One LIVE vote in the panel model. `rationale` is decrypted AFTER authorization at the route (a distinct
 *  sentinel on decrypt failure — never blank-collapsed; rationale is always present per AC3). */
export const R9PanelVote = z
  .object({
    vote_id: z.string().uuid(),
    voter_actor_id: z.string(),
    voter_display: z.string(),
    vote: R9Vote,
    cast_at: z.string(),
    clause_version_id: z.string().uuid(),
    rationale: z.string(),
  })
  .strict();
export type R9PanelVote = z.output<typeof R9PanelVote>;

/** The running / final tally (panel-size denominator). `cast_votes` is the live-vote count. */
export const R9Tally = z
  .object({
    approve_count: z.number().int().nonnegative(),
    deny_count: z.number().int().nonnegative(),
    cast_votes: z.number().int().nonnegative(),
    panel_size: z.number().int().positive(),
    quorum_required: z.number().int().positive(),
    /** The provisional outcome the current live votes WOULD produce (informational preview; finalize is authoritative). */
    provisional_outcome: R9SessionOutcome,
    /** True when the live-vote count meets the snapshotted quorum (finalize is permitted). */
    quorum_met: z.boolean(),
  })
  .strict();
export type R9Tally = z.output<typeof R9Tally>;

/** The open/finalized session view inside the panel model. */
export const R9SessionView = z
  .object({
    session_id: z.string().uuid(),
    clause_id: z.string(),
    clause_version_id: z.string().uuid(),
    rule_code: z.string(),
    voting_requirement: R9VotingRequirement,
    panel: z.array(R9PanelMember),
    quorum_required: z.number().int().positive(),
    opened_by_actor: z.string(),
    opened_display: z.string(),
    opened_at: z.string(),
    /** Set once finalized (else null). */
    outcome: R9SessionOutcome.nullable(),
    finalized_display: z.string().nullable(),
    finalized_at: z.string().nullable(),
  })
  .strict();
export type R9SessionView = z.output<typeof R9SessionView>;

export const R9PanelResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    current_state: z.string(),
    /** Null when no live session is open (e.g. after a cancel — the claim is still queued). */
    session: R9SessionView.nullable(),
    votes: z.array(R9PanelVote),
    /** Null when no live session is open. */
    tally: R9Tally.nullable(),
  })
  .strict();
export type R9PanelResponse = z.output<typeof R9PanelResponse>;

// ── AC2 — open a session ────────────────────────────────────────────────────────────────────

/**
 * The open-session request (AC2). `clause_id` MUST be one of the three R9-voting clauses (the superRefine);
 * `panel_actor_ids` is the immutable roster — non-empty, de-dup enforced. `.strict()` — a smuggled
 * `opened_display`/actor id is a 400 (R5: server-derived).
 */
/** Panel roster upper bound (AC2) — a hard sanity ceiling, not a business rule; guards against an unbounded
 *  roster forcing an unbounded per-member display-name lookup fan-out on every panel read. */
export const R9_PANEL_MAX_MEMBERS = 25;

export const R9OpenSessionRequest = z
  .object({
    clause_id: z.string(),
    panel_actor_ids: z.array(z.string().uuid()).min(1).max(R9_PANEL_MAX_MEMBERS),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!isR9VotingClauseId(val.clause_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clause_id'],
        message: `clause_id must be one of the R9-voting clauses (${R9_VOTING_CLAUSE_IDS.join(', ')})`,
      });
    }
    if (new Set(val.panel_actor_ids).size !== val.panel_actor_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['panel_actor_ids'],
        message: 'panel_actor_ids must not contain duplicates',
      });
    }
  });
export type R9OpenSessionRequest = z.output<typeof R9OpenSessionRequest>;

// ── AC3 — cast / revise a vote ────────────────────────────────────────────────────────────────

/**
 * The cast/revise vote request (AC3). `rationale` is REQUIRED, non-empty, ≤500 chars for EVERY vote (approve
 * AND deny). `.strict()` — a smuggled `voter_display`/actor id is a 400 (R5: server-derived; the voter is the
 * authenticated actor).
 */
export const R9VoteRequest = z
  .object({
    vote: R9Vote,
    rationale: z.string().trim().min(1).max(R9_RATIONALE_MAX_CHARS),
  })
  .strict();
export type R9VoteRequest = z.output<typeof R9VoteRequest>;

/** The vote response — NON-PII metadata (never the rationale). `revised` is true when it replaced a prior live vote. */
export const R9VoteResponse = z
  .object({
    vote_id: z.string().uuid(),
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    voter_actor_id: z.string(),
    voter_display: z.string(),
    vote: R9Vote,
    cast_at: z.string(),
    revised: z.boolean(),
  })
  .strict();
export type R9VoteResponse = z.output<typeof R9VoteResponse>;

// ── AC4 — finalize ────────────────────────────────────────────────────────────────────────────

/** The finalize request — no body fields (the outcome is computed server-side from the live votes). `.strict()`. */
export const R9FinalizeRequest = z.object({}).strict();
export type R9FinalizeRequest = z.output<typeof R9FinalizeRequest>;

/** The finalize response — the computed outcome + tally + the post-finalize claim state. */
export const R9FinalizeResponse = z
  .object({
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    outcome: R9SessionOutcome,
    approve_count: z.number().int().nonnegative(),
    deny_count: z.number().int().nonnegative(),
    voting_requirement: R9VotingRequirement,
    finalized_display: z.string(),
    finalized_at: z.string(),
    /** The claim's lifecycle state AFTER finalize (approved → state_trustee_approved; denied → denied). */
    claim_state: z.string(),
    /** True when this reflects a re-finalize of an already-finalized session (idempotent replay). */
    idempotent_replay: z.boolean(),
  })
  .strict();
export type R9FinalizeResponse = z.output<typeof R9FinalizeResponse>;

// ── AC5 — cancel / correct ──────────────────────────────────────────────────────────────────

/**
 * The cancel request (AC5). `reason_code` (non-PII, audited) + `rationale` are REQUIRED for accountability.
 * v1 has no cancel-retention column, so the rationale is used only for the accountable request record; the
 * audit sink carries the reason_code (never the rationale, AC10). `.strict()`.
 */
export const R9CancelRequest = z
  .object({
    reason_code: z.string().trim().min(1).max(64),
    rationale: z.string().trim().min(1).max(R9_RATIONALE_MAX_CHARS),
  })
  .strict();
export type R9CancelRequest = z.output<typeof R9CancelRequest>;

/** The session-summary response (open + cancel). NON-PII session metadata. */
export const R9SessionResponse = z
  .object({
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    clause_id: z.string(),
    clause_version_id: z.string().uuid(),
    rule_code: z.string(),
    voting_requirement: R9VotingRequirement,
    panel_actor_ids: z.array(z.string().uuid()),
    quorum_required: z.number().int().positive(),
    opened_display: z.string(),
    opened_at: z.string(),
    outcome: R9SessionOutcome.nullable(),
    superseded_at: z.string().nullable(),
  })
  .strict();
export type R9SessionResponse = z.output<typeof R9SessionResponse>;

// ── AC8 — the votes-by-trustee transcript ─────────────────────────────────────────────────────

/** One vote in the transcript — bound to its session/panel/rule identity (#13). `rationale` decrypted at route. */
export const R9VotesByTrusteeItem = z
  .object({
    vote_id: z.string().uuid(),
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    vote: R9Vote,
    cast_at: z.string(),
    /** Null on a LIVE vote; set on a revised/cancelled (superseded) one — the full transcript keeps both. */
    superseded_at: z.string().nullable(),
    clause_id: z.string(),
    clause_version_id: z.string().uuid(),
    rule_code: z.string(),
    voting_requirement: R9VotingRequirement,
    panel_actor_ids: z.array(z.string().uuid()),
    /** The session's final outcome (null while still open). */
    session_outcome: R9SessionOutcome.nullable(),
    rationale: z.string(),
  })
  .strict();
export type R9VotesByTrusteeItem = z.output<typeof R9VotesByTrusteeItem>;

export const R9VotesByTrusteeResponse = z
  .object({
    actor_id: z.string(),
    since_days: z.number().int().positive(),
    votes: z.array(R9VotesByTrusteeItem),
  })
  .strict();
export type R9VotesByTrusteeResponse = z.output<typeof R9VotesByTrusteeResponse>;

/** The votes-by-trustee query params (the actor + window). */
export const R9VotesByTrusteeQuery = z
  .object({
    actorId: z.string().uuid(),
    sinceDays: z.coerce.number().int().positive().max(3650).optional(),
  })
  .strict();
export type R9VotesByTrusteeQuery = z.output<typeof R9VotesByTrusteeQuery>;

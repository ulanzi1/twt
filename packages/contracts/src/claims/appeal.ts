// packages/contracts/src/claims/appeal.ts
//
// Internal 3-stage appeal transport DTOs — Story 6.16 (the LAST story of Epic 6). The request/response wire
// shapes for the appeal surfaces:
//   · POST …/claims/:claimCaseId/appeal                          → initiate from denied (AC1)
//   · POST …/admin/claims/:claimCaseId/appeal/stage1             → Stage-1 District-Admin review (AC2)
//   · POST …/admin/claims/:claimCaseId/appeal/stage2/{open,vote,finalize,cancel} → Stage-2 panel (AC3)
//   · POST …/admin/claims/:claimCaseId/appeal/stage3             → Stage-3 Trustee decision, final (AC4)
//   · GET  …/admin/claims/appeal/decisions-by-reviewer          → the AC6 audit query (+ D-H SLA fields)
//   · GET  …/claims/:claimCaseId/appeal (member)                 → the member-facing appeal-status view (AC7)
//
// ── Contracts discipline (the r9-voting.ts / cycle-freeze.ts precedent) ──────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the appeal wire enums
// are RE-DECLARED here, value-aligned with the domain `appeal_decision` / `appeal_panel_vote` /
// `appeal_panel_outcome` / `appeal_disposition_category` / `appeal_stage` pgEnums. A cross-package LOCKSTEP
// test pins them. ALL objects `.strict()` — a smuggled `reviewer_display` / actor id is a 400 (R5: the server
// resolves + snapshots actor identity, never the client). NO window/deadline field anywhere (D-E — the PRD's
// "no formal time limit, grief-aware" rule removed the claimant-facing deadline).

import { z } from 'zod';

// ── Appeal vocabulary wire mirror (value-aligned with @twt/domain) ──────────────────────────

/** The appeal stage (value-aligned with the domain `appeal_stage`). */
export const AppealStage = z.enum(['1', '2', '3']);
export type AppealStage = z.output<typeof AppealStage>;

/** Stage-1/2 outcome — reverse OR do-not-reverse(advance) ONLY (D-C — never `upheld` in v1). */
export const AppealReviewDecision = z.enum(['reversed', 'advance']);
export type AppealReviewDecision = z.output<typeof AppealReviewDecision>;

/** Stage-3 outcome — reverse OR uphold-final ONLY (the appealFinalDecisionSchema; no `advance`, D-C). */
export const AppealFinalDecision = z.enum(['reversed', 'upheld']);
export type AppealFinalDecision = z.output<typeof AppealFinalDecision>;

/** An individual Stage-2 panelist's vote (value-aligned with the domain `appeal_panel_vote`). */
export const AppealPanelVote = z.enum(['reverse', 'deny']);
export type AppealPanelVote = z.output<typeof AppealPanelVote>;

/** The finalized Stage-2 panel outcome (value-aligned with the domain `appeal_panel_outcome`). */
export const AppealPanelOutcome = z.enum(['reversed', 'advance']);
export type AppealPanelOutcome = z.output<typeof AppealPanelOutcome>;

/** The bounded NON-PII public disposition tag (value-aligned with the domain `appeal_disposition_category`;
 *  D-A). The exact taxonomy + its public wording template is a D-G legal-counsel sign-off item. */
export const AppealDispositionCategory = z.enum([
  'new_evidence_presented',
  'procedural_correction',
  'reconsideration_on_merits',
]);
export type AppealDispositionCategory = z.output<typeof AppealDispositionCategory>;

/** The journey terminal status (value-aligned with the domain `appeal_journey_status`). */
export const AppealJourneyStatus = z.enum(['open', 'reversed', 'upheld_final']);
export type AppealJourneyStatus = z.output<typeof AppealJourneyStatus>;

/** Max rationale length (mirrors the 6.11/6.13/6.14 ≤500 posture). */
export const APPEAL_RATIONALE_MAX_CHARS = 500;
/** Stage-2 panel MINIMUM roster size (D-B — PRD-mandated, stricter than R9's ≥1). */
export const APPEAL_PANEL_MIN_MEMBERS = 2;
/** Stage-2 panel roster upper bound (value-aligned with the domain APPEAL_PANEL_MAX_MEMBERS). */
export const APPEAL_PANEL_MAX_MEMBERS = 25;

// ── AC1 — initiate the appeal (no deadline field, D-E) ─────────────────────────

/**
 * The initiate request (AC1). No body fields are required — the claim id is a path param and the actor is
 * the authenticated session (a claimant self-initiate, or an operator on-behalf under AR-61; the route
 * derives `on_behalf` from the session kind, never the client). `.strict()` — NO window/deadline field (D-E).
 */
export const InitiateAppealRequest = z.object({}).strict();
export type InitiateAppealRequest = z.output<typeof InitiateAppealRequest>;

export const InitiateAppealResponse = z
  .object({
    appeal_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    current_stage: AppealStage,
    status: AppealJourneyStatus,
    initiated_on_behalf: z.boolean(),
    /** The claim's lifecycle state AFTER initiation (appeal_stage_1). */
    claim_state: z.string(),
  })
  .strict();
export type InitiateAppealResponse = z.output<typeof InitiateAppealResponse>;

// ── AC2 — Stage-1 review (District Admin reviewer ≠ original) ───────────────────

/**
 * The Stage-1 review request (AC2). `decision` is reverse|advance ONLY; `rationale` is REQUIRED (≤500);
 * `disposition_category` is REQUIRED iff `decision === 'reversed'` and MUST be absent otherwise (D-A —
 * the superRefine). `.strict()` — reviewer identity is server-derived (R5).
 */
export const AppealStage1ReviewRequest = z
  .object({
    decision: AppealReviewDecision,
    rationale: z.string().trim().min(1).max(APPEAL_RATIONALE_MAX_CHARS),
    disposition_category: AppealDispositionCategory.optional(),
  })
  .strict()
  .superRefine((val, ctx) => enforceDisposition(val.decision, val.disposition_category, ctx));
export type AppealStage1ReviewRequest = z.output<typeof AppealStage1ReviewRequest>;

/** The single-decider (Stage 1 / Stage 3) decision response — NON-PII (never the rationale). */
export const AppealDecisionResponse = z
  .object({
    appeal_decision_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    stage: AppealStage,
    decision: z.enum(['reversed', 'advance', 'upheld']),
    disposition_category: AppealDispositionCategory.nullable(),
    /** The claim's lifecycle state AFTER the decision. */
    claim_state: z.string(),
    /** True when this decision reversed the denial (the D-A publish hook fired). */
    reversed: z.boolean(),
  })
  .strict();
export type AppealDecisionResponse = z.output<typeof AppealDecisionResponse>;

// ── AC3 — Stage-2 panel (open / vote / finalize / cancel) ──────────────────────

/** The open-panel request (AC3). `panel_actor_ids` is the immutable roster — MINIMUM 2 (D-B), de-dup
 *  enforced. `.strict()` — opener identity is server-derived (R5). */
export const AppealStage2OpenRequest = z
  .object({
    panel_actor_ids: z.array(z.string().uuid()).min(APPEAL_PANEL_MIN_MEMBERS).max(APPEAL_PANEL_MAX_MEMBERS),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (new Set(val.panel_actor_ids).size !== val.panel_actor_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['panel_actor_ids'],
        message: 'panel_actor_ids must not contain duplicates',
      });
    }
  });
export type AppealStage2OpenRequest = z.output<typeof AppealStage2OpenRequest>;

/** The cast/revise vote request (AC3). `rationale` is REQUIRED for EVERY vote. `.strict()`. */
export const AppealStage2VoteRequest = z
  .object({
    vote: AppealPanelVote,
    rationale: z.string().trim().min(1).max(APPEAL_RATIONALE_MAX_CHARS),
  })
  .strict();
export type AppealStage2VoteRequest = z.output<typeof AppealStage2VoteRequest>;

/**
 * The finalize request (AC3). `rationale` is REQUIRED (the uniform stage-2 audit row). `disposition_category`
 * is OPTIONAL here — the outcome is computed server-side from the live votes, so the contract cannot know in
 * advance whether it reverses; the surface shows the provisional tally and supplies it when the tally will
 * reverse, and the domain finalize rejects a reversing tally with no disposition (→ 400). `.strict()`.
 */
export const AppealStage2FinalizeRequest = z
  .object({
    rationale: z.string().trim().min(1).max(APPEAL_RATIONALE_MAX_CHARS),
    disposition_category: AppealDispositionCategory.optional(),
  })
  .strict();
export type AppealStage2FinalizeRequest = z.output<typeof AppealStage2FinalizeRequest>;

/** The cancel request (AC3). `reason_code` (non-PII, audited) + `rationale` REQUIRED for accountability. */
export const AppealStage2CancelRequest = z
  .object({
    reason_code: z.string().trim().min(1).max(64),
    rationale: z.string().trim().min(1).max(APPEAL_RATIONALE_MAX_CHARS),
  })
  .strict();
export type AppealStage2CancelRequest = z.output<typeof AppealStage2CancelRequest>;

/** The panel session-summary response (open + cancel). NON-PII session metadata. */
export const AppealPanelSessionResponse = z
  .object({
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    panel_actor_ids: z.array(z.string().uuid()),
    quorum_required: z.number().int().positive(),
    opened_display: z.string(),
    opened_at: z.string(),
    outcome: AppealPanelOutcome.nullable(),
    superseded_at: z.string().nullable(),
  })
  .strict();
export type AppealPanelSessionResponse = z.output<typeof AppealPanelSessionResponse>;

/** The vote response — NON-PII metadata (never the rationale). `revised` = replaced a prior live vote. */
export const AppealPanelVoteResponse = z
  .object({
    vote_id: z.string().uuid(),
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    voter_actor_id: z.string(),
    voter_display: z.string(),
    vote: AppealPanelVote,
    cast_at: z.string(),
    revised: z.boolean(),
  })
  .strict();
export type AppealPanelVoteResponse = z.output<typeof AppealPanelVoteResponse>;

/** The finalize response — the computed outcome + tally + the post-finalize claim state. */
export const AppealPanelFinalizeResponse = z
  .object({
    session_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    outcome: AppealPanelOutcome,
    reverse_count: z.number().int().nonnegative(),
    deny_count: z.number().int().nonnegative(),
    disposition_category: AppealDispositionCategory.nullable(),
    finalized_display: z.string(),
    finalized_at: z.string(),
    /** The claim's lifecycle state AFTER finalize (reversed → reversed; advance → appeal_stage_3). */
    claim_state: z.string(),
    /** True when this reflects a re-finalize of an already-finalized session (idempotent replay). */
    idempotent_replay: z.boolean(),
  })
  .strict();
export type AppealPanelFinalizeResponse = z.output<typeof AppealPanelFinalizeResponse>;

// ── AC4 — Stage-3 decision (Trustee discretion, final) ─────────────────────────

/**
 * The Stage-3 decision request (AC4). `decision` is reverse|uphold ONLY; `rationale` REQUIRED;
 * `disposition_category` REQUIRED iff `decision === 'reversed'` (D-A superRefine). `.strict()`.
 */
export const AppealStage3DecideRequest = z
  .object({
    decision: AppealFinalDecision,
    rationale: z.string().trim().min(1).max(APPEAL_RATIONALE_MAX_CHARS),
    disposition_category: AppealDispositionCategory.optional(),
  })
  .strict()
  .superRefine((val, ctx) => enforceDisposition(val.decision, val.disposition_category, ctx));
export type AppealStage3DecideRequest = z.output<typeof AppealStage3DecideRequest>;

// ── AC6 — the decisions-by-reviewer audit query (+ D-H SLA fields) ─────────────

/** The audit-query params (reviewer + optional stage + window + bounded limit). */
export const AppealDecisionsByReviewerQuery = z
  .object({
    reviewerActorId: z.string().uuid(),
    stage: AppealStage.optional(),
    sinceDays: z.coerce.number().int().positive().max(3650).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
  })
  .strict();
export type AppealDecisionsByReviewerQuery = z.output<typeof AppealDecisionsByReviewerQuery>;

/** One decision in the audit transcript. AC6: NON-PII ONLY — "rationale text itself is Tier-1, never on the
 *  audit line/event", indexed on `(actor_id, stage, decided_at)`; the rationale ciphertext is deliberately
 *  NEVER decrypted/returned here (6.16 review finding — read the full rationale via the per-claim case view
 *  instead, where it is scoped to the claim's own adjudicators). The D-H `sla_breached`/`elapsed_days` are
 *  read-time-derived (never persisted; never a gate). */
export const AppealDecisionsByReviewerItem = z
  .object({
    appeal_decision_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    stage: AppealStage,
    decision: z.enum(['reversed', 'advance', 'upheld']),
    disposition_category: AppealDispositionCategory.nullable(),
    decided_at: z.string(),
    superseded_at: z.string().nullable(),
    /** D-H — true iff this stage's elapsed time exceeded the Pariwar SLA (read-time; never blocks a write). */
    sla_breached: z.boolean(),
    /** D-H — whole days elapsed in this stage (null when the stage-entry event is not found). */
    elapsed_days: z.number().int().nullable(),
  })
  .strict();
export type AppealDecisionsByReviewerItem = z.output<typeof AppealDecisionsByReviewerItem>;

export const AppealDecisionsByReviewerResponse = z
  .object({
    reviewer_actor_id: z.string(),
    since_days: z.number().int().positive(),
    decisions: z.array(AppealDecisionsByReviewerItem),
  })
  .strict();
export type AppealDecisionsByReviewerResponse = z.output<typeof AppealDecisionsByReviewerResponse>;

// ── AC7 — the member-facing appeal-status view ──────────────────────────────────

/**
 * The member-facing appeal-status response (AC7). Non-PII narrative: eligibility (no deadline, D-E), the
 * current stage/status, and whether the D-G external-remedy disclosure applies (always true — surfaced
 * prominently on a Stage-3-uphold). NO reviewer identity / rationale (those are Tier-1 / staff-only).
 */
export const MemberAppealStatusResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    /** True when the claim is `denied` with no prior appeal journey — a "file appeal" affordance is shown. */
    can_initiate: z.boolean(),
    /** The appeal journey status, or null when no appeal has been filed. */
    appeal_status: AppealJourneyStatus.nullable(),
    /** The current appeal stage, or null when no appeal has been filed. */
    current_stage: AppealStage.nullable(),
    /** True once the internal appeal ladder is exhausted (Stage-3 uphold) — the external-remedy disclosure
     *  is surfaced prominently. */
    appeal_exhausted: z.boolean(),
  })
  .strict();
export type MemberAppealStatusResponse = z.output<typeof MemberAppealStatusResponse>;

// ── Admin per-claim appeal case model (the Stage surfaces read this) ───────────

/** One panel member with its resolved R5 display. */
export const AppealPanelMember = z.object({ actor_id: z.string(), actor_display: z.string() }).strict();
export type AppealPanelMember = z.output<typeof AppealPanelMember>;

/** One LIVE panel vote (rationale decrypted AFTER authorization at the route). `rationale` is null until the
 *  REQUESTING panelist has ALSO cast their own vote in this session — a peer's rationale is withheld
 *  beforehand (the herding/bias guard, the R9 precedent this panel mirrors; 6.16 review finding). */
export const AppealPanelVoteView = z
  .object({
    vote_id: z.string().uuid(),
    voter_actor_id: z.string(),
    voter_display: z.string(),
    vote: AppealPanelVote,
    cast_at: z.string(),
    rationale: z.string().nullable(),
  })
  .strict();
export type AppealPanelVoteView = z.output<typeof AppealPanelVoteView>;

/** The running Stage-2 tally (panel-size denominator). */
export const AppealPanelTally = z
  .object({
    reverse_count: z.number().int().nonnegative(),
    deny_count: z.number().int().nonnegative(),
    cast_votes: z.number().int().nonnegative(),
    panel_size: z.number().int().positive(),
    quorum_required: z.number().int().positive(),
    /** The outcome the current live votes WOULD produce (preview; finalize is authoritative). */
    provisional_outcome: AppealPanelOutcome,
    quorum_met: z.boolean(),
  })
  .strict();
export type AppealPanelTally = z.output<typeof AppealPanelTally>;

/** The open Stage-2 panel session view. */
export const AppealPanelSessionView = z
  .object({
    session_id: z.string().uuid(),
    panel: z.array(AppealPanelMember),
    quorum_required: z.number().int().positive(),
    opened_display: z.string(),
    opened_at: z.string(),
    outcome: AppealPanelOutcome.nullable(),
    finalized_display: z.string().nullable(),
    finalized_at: z.string().nullable(),
  })
  .strict();
export type AppealPanelSessionView = z.output<typeof AppealPanelSessionView>;

/** The D-H SLA status for the claim's CURRENT stage (read-time; never a gate). */
export const AppealSlaStatus = z
  .object({
    stage: AppealStage,
    sla_days: z.number().int(),
    elapsed_days: z.number().int().nullable(),
    breached: z.boolean(),
  })
  .strict();
export type AppealSlaStatus = z.output<typeof AppealSlaStatus>;

/** The admin per-claim appeal case model (the Stage-1/2/3 surfaces read this). */
export const AdminAppealCaseResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    /** The journey anchor, or null when no appeal has been filed. */
    journey: z
      .object({
        status: AppealJourneyStatus,
        current_stage: AppealStage,
        initiated_on_behalf: z.boolean(),
      })
      .strict()
      .nullable(),
    /** The live Stage-2 panel session + votes + tally, or null when no live session. */
    session: AppealPanelSessionView.nullable(),
    votes: z.array(AppealPanelVoteView),
    tally: AppealPanelTally.nullable(),
    /** The current stage's SLA status (D-H), or null when not in an appeal stage. */
    sla: AppealSlaStatus.nullable(),
  })
  .strict();
export type AdminAppealCaseResponse = z.output<typeof AdminAppealCaseResponse>;

// ── Shared superRefine: disposition_category set iff reversed (D-A) ─────────────

function enforceDisposition(
  decision: string,
  disposition: AppealDispositionCategory | undefined,
  ctx: z.RefinementCtx,
): void {
  if (decision === 'reversed' && disposition === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['disposition_category'],
      message: 'disposition_category is required when decision is "reversed" (D-A)',
    });
  }
  if (decision !== 'reversed' && disposition !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['disposition_category'],
      message: 'disposition_category must be omitted unless decision is "reversed" (D-A)',
    });
  }
}

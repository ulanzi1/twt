// packages/contracts/src/claims/cycle-freeze.ts
//
// State-Trustee cycle-freeze (bulk-approval) transport DTOs — Story 6.13 (the FIRST state_trustee WRITE
// surface + the FIRST live emitter of the Story 6.1 cycle-freeze events). The request/response wire
// shapes for the three surfaces:
//   · GET  /api/v1/p/:pariwarId/admin/cycle-freeze/pending  → the two-bucket pending list (AC1)
//   · POST /api/v1/p/:pariwarId/admin/cycle-freeze/decision → per-claim vote/route/resolve (AC2/AC3/AC4/AC4b)
//   · POST /api/v1/p/:pariwarId/admin/cycle-freeze/commit   → the step-up-gated bulk commit (AC5)
//
// ── Contracts discipline (the verification-decision.ts precedent) ───────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the trustee outcome
// + reason-code wire enums AND the compat/required rules are RE-DECLARED here, value-aligned with the
// domain `state_trustee_decision_outcome` / `state_trustee_reason_code` pgEnums + the domain
// `REASON_CODE_OUTCOME_COMPAT` / `reasonCodeRequiredForOutcome` (D-F). The DOMAIN copy is the canonical
// source of truth + the defense-in-depth enforcement point; THIS is the value-aligned wire mirror that
// produces the 400 at the boundary. A cross-package LOCKSTEP test pins the two. ALL objects `.strict()`.
//
// ── R5 — the request carries NO actor identity (server-derived only) ────────────────────────
// `actor_display` (and any actor id) is NEVER accepted from the client — the server resolves it from
// `users.display_name` and snapshots it. The DTOs are `.strict()`, so a smuggled `actor_display` (or any
// unknown field) is a 400.
//
// ── claim_case_id is a BODY field, not a path param (Task 1 note) ────────────────────────────
// Unlike the 6.11 path-scoped `:claimCaseId` route, this surface's RBAC is PARIWAR-dimension (not
// claim-scoped), so there is no structural need for a `:claimCaseId` path segment — the target claim is a
// strict-UUID body field.

import { z } from 'zod';

// ── Trustee decision vocabulary wire mirror (value-aligned with @twt/domain) ────────────────

/** The three trustee decision outcomes (value-aligned with the domain `state_trustee_decision_outcome`). */
export const StateTrusteeDecisionOutcome = z.enum(['approved', 'denied', 'routed_to_r9']);
export type StateTrusteeDecisionOutcome = z.output<typeof StateTrusteeDecisionOutcome>;

/** The bounded trustee reason codes (value-aligned with the domain `state_trustee_reason_code` pgEnum).
 *  A NEW trustee-scoped set — NOT the 6.11 `VerifierReasonCode` (D-F). `other` requires the rationale. */
export const StateTrusteeReasonCode = z.enum([
  'standing_not_met',
  'documents_insufficient',
  'concealment_upheld',
  'r9_special_case',
  'other',
]);
export type StateTrusteeReasonCode = z.output<typeof StateTrusteeReasonCode>;

/** Max rationale length (mirrors the 6.11 ≤500 posture). */
export const TRUSTEE_RATIONALE_MAX_CHARS = 500;

/**
 * The wire mirror of the domain `REASON_CODE_OUTCOME_COMPAT` (D-F). Which outcomes each reason code is
 * valid for. Keep value-aligned with packages/domain/src/claim/state-trustee-decision.ts (the canonical
 * source; the lockstep test pins it). NOTE `approved` requires NO code, so no code maps to it.
 */
// NOTE the DISTINCT names (`TRUSTEE_` / `isTrustee…`): the 6.11 `verification-decision.ts` contract already
// exports the generic `REASON_CODE_OUTCOME_COMPAT` / `isReasonCodeValidForOutcome` names, and both modules
// are re-exported via `export *` from the claims barrel — trustee-scoped names avoid the collision.
export const TRUSTEE_REASON_CODE_OUTCOME_COMPAT: Readonly<
  Record<StateTrusteeReasonCode, readonly StateTrusteeDecisionOutcome[]>
> = {
  standing_not_met: ['denied'],
  documents_insufficient: ['denied'],
  concealment_upheld: ['denied'],
  r9_special_case: ['routed_to_r9'],
  other: ['denied', 'routed_to_r9'],
};

/** Does `outcome` REQUIRE a reason code (the D-F presence rule)? `denied` + `routed_to_r9` do; `approved`
 *  does not. Value-aligned with the domain `trusteeReasonCodeRequiredForOutcome`. */
export function trusteeReasonCodeRequiredForOutcome(outcome: string): boolean {
  return outcome === 'denied' || outcome === 'routed_to_r9';
}

/** Is `reasonCode` valid for `outcome`? Value-aligned with the domain `isTrusteeReasonCodeValidForOutcome`. */
export function isTrusteeReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = TRUSTEE_REASON_CODE_OUTCOME_COMPAT[reasonCode as StateTrusteeReasonCode];
  return allowed !== undefined && allowed.includes(outcome as StateTrusteeDecisionOutcome);
}

// ── AC1 — the two-bucket pending list read model ────────────────────────────────────────────

/**
 * ONE pending case's denormalized provenance (AC1). NON-PII except the route-decrypted `verifier_rationale`
 * (ciphertext-as-stored in the accessor; decrypted only AFTER authorization at the route, AC10). The
 * verifier provenance (decision id + display + reason-code) is from `claim_verifier_decisions`; the
 * `concealment_flags` carry `concealment_review_required` when the claim's decision history shows a
 * concealment review (the durable, scope-safe indicator; a validity-service-sourced member flag is
 * deferred to the same integration the 6.10 console's `not_evaluated` tri-state awaits).
 */
export const CycleFreezePendingItem = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    current_state: z.string(),
    /** The live verifier decision backing this case (null if none — e.g. a reversed appeal). */
    verifier_decision_id: z.string().uuid().nullable(),
    verifier_actor_display: z.string().nullable(),
    verifier_reason_code: z.string().nullable(),
    /** The verifier's rationale — decrypted AFTER authorization at the route (fail-soft to '' on absence). */
    verifier_rationale: z.string().nullable(),
    /** A compact, deterministic signals summary (intake provenance + verification posture). */
    signals_summary: z.string(),
    /** `[concealment_review_required]` when the claim's decision history shows a concealment review; else []. */
    concealment_flags: z.array(z.string()),
    /** True when the claim carries a LIVE route-to-R9 exclusion row → excluded from the commit set (AC4). */
    routed_to_r9: z.boolean(),
  })
  .strict();
export type CycleFreezePendingItem = z.output<typeof CycleFreezePendingItem>;

/**
 * The pending-list response (AC1). Three buckets: (a) `ready_to_freeze` — claims in `verifier_approved` /
 * `reversed` ready to freeze; (b) `escalated` — the "verifier_flagged_for_state_trustee" set awaiting
 * resolution (a live `escalated` verifier decision, still at verifier_review / verification_in_progress);
 * (c) `voted_pending_commit` — claims already voted `state_trustee_approved` (this session or an earlier
 * one) that the NEXT commit will act on — surfaced so the trustee can review the full committable set
 * before pressing Commit, not just the ones they voted on just now.
 */
export const CycleFreezePendingResponse = z
  .object({
    pariwar_id: z.string().uuid(),
    ready_to_freeze: z.array(CycleFreezePendingItem),
    escalated: z.array(CycleFreezePendingItem),
    voted_pending_commit: z.array(CycleFreezePendingItem),
  })
  .strict();
export type CycleFreezePendingResponse = z.output<typeof CycleFreezePendingResponse>;

// ── AC2/AC3/AC4/AC4b — the per-claim decision request ────────────────────────────────────────

/** The four per-claim actions. `approve`/`deny` are the frozen votes (AC2/AC3); `route_to_r9` is the
 *  metadata-only routing (AC4); `resolve_escalation` resolves a verifier escalation (AC4b, direction in
 *  `escalation_outcome`). */
export const CycleFreezeDecisionAction = z.enum(['approve', 'deny', 'route_to_r9', 'resolve_escalation']);
export type CycleFreezeDecisionAction = z.output<typeof CycleFreezeDecisionAction>;

/** The effective outcome an action resolves to (drives the required-reason-code rule). */
function effectiveOutcome(
  action: CycleFreezeDecisionAction,
  escalationOutcome: 'approved' | 'denied' | undefined,
): StateTrusteeDecisionOutcome | undefined {
  switch (action) {
    case 'approve':
      return 'approved';
    case 'deny':
      return 'denied';
    case 'route_to_r9':
      return 'routed_to_r9';
    case 'resolve_escalation':
      return escalationOutcome; // approved | denied (validated present by the superRefine)
  }
}

/**
 * The per-claim decision request (AC2/AC3/AC4/AC4b). `claim_case_id` is a strict-UUID BODY field (the
 * RBAC is pariwar-dimension, so no `:claimCaseId` path segment). `escalation_outcome` is REQUIRED iff
 * `action === 'resolve_escalation'` and FORBIDDEN otherwise. The `superRefine` enforces (per D-F):
 * reason-code REQUIRED for `deny` + `route_to_r9` (and a `resolve_escalation` that denies), OPTIONAL for
 * `approve`; a supplied reason-code must be outcome-compatible; the rationale is required on `other`/deny
 * and ≤500 chars. `.strict()` — a smuggled `actor_display`/unknown field is a 400.
 */
export const CycleFreezeDecisionRequest = z
  .object({
    claim_case_id: z.string().uuid(),
    action: CycleFreezeDecisionAction,
    /** Required iff action === 'resolve_escalation' — the direction the escalation resolves to. */
    escalation_outcome: z.enum(['approved', 'denied']).optional(),
    reason_code: StateTrusteeReasonCode.optional(),
    rationale: z.string().max(TRUSTEE_RATIONALE_MAX_CHARS).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // (0) escalation_outcome presence rule — required for resolve_escalation, forbidden otherwise.
    if (val.action === 'resolve_escalation' && val.escalation_outcome === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['escalation_outcome'],
        message: 'escalation_outcome is required when action is "resolve_escalation"',
      });
      return; // effective outcome is undefined without it — skip the downstream reason checks
    }
    if (val.action !== 'resolve_escalation' && val.escalation_outcome !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['escalation_outcome'],
        message: 'escalation_outcome is only valid when action is "resolve_escalation"',
      });
    }

    const outcome = effectiveOutcome(val.action, val.escalation_outcome);
    if (outcome === undefined) return;

    // (a) reason-code REQUIRED for deny + route_to_r9 (+ a denying escalation resolution) — D-F.
    if (trusteeReasonCodeRequiredForOutcome(outcome) && val.reason_code === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason_code'],
        message: `a reason_code is required for a ${outcome === 'denied' ? 'deny' : 'route-to-R9'} decision`,
      });
    }
    // (b) a SUPPLIED reason-code must be outcome-compatible (rejects a code on an approve, or a mismatch).
    if (val.reason_code !== undefined && !isTrusteeReasonCodeValidForOutcome(outcome, val.reason_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason_code'],
        message: `reason_code '${val.reason_code}' is not valid for this decision`,
      });
    }
    // (c) rationale required on `other` and on a deny (the appeal record needs the ground); ≤500 chars.
    const rationale = val.rationale?.trim() ?? '';
    if ((val.reason_code === 'other' || outcome === 'denied') && rationale === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rationale'],
        message: 'a rationale is required for the "other" reason code and for a deny',
      });
    }
    if ((val.rationale?.length ?? 0) > TRUSTEE_RATIONALE_MAX_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        path: ['rationale'],
        maximum: TRUSTEE_RATIONALE_MAX_CHARS,
        type: 'string',
        inclusive: true,
        message: `rationale must be at most ${TRUSTEE_RATIONALE_MAX_CHARS} characters`,
      });
    }
  });
export type CycleFreezeDecisionRequest = z.output<typeof CycleFreezeDecisionRequest>;

/** The per-claim decision response — NON-PII decision metadata only (never the rationale). `claim_state`
 *  is the post-decision lifecycle state so the UI can react. */
export const CycleFreezeDecisionResponse = z
  .object({
    decision_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    phase: z.enum(['frozen_vote', 'commit', 'escalation_resolution', 'routing']),
    outcome: StateTrusteeDecisionOutcome,
    reason_code: StateTrusteeReasonCode.nullable(),
    actor_display: z.string(),
    decided_at: z.string(),
    claim_state: z.string(),
  })
  .strict();
export type CycleFreezeDecisionResponse = z.output<typeof CycleFreezeDecisionResponse>;

// ── AC5 — the step-up-gated bulk commit ──────────────────────────────────────────────────────

/**
 * The bulk commit request (AC5). `commit_id` is a CLIENT-GENERATED UUID submitted in the request and
 * echoed in the response — the idempotency key that lets a client safely retry a commit call that failed
 * or timed out before a response arrived. The commit advances EVERY claim in `state_trustee_approved`
 * (not carrying a live route-to-R9 row) to `approved`; there is no per-claim id list (the committed set
 * is server-derived from the durable freeze/vote state — D-D). `.strict()`.
 */
export const CycleFreezeCommitRequest = z
  .object({
    commit_id: z.string().uuid(),
  })
  .strict();
export type CycleFreezeCommitRequest = z.output<typeof CycleFreezeCommitRequest>;

/** The bulk commit response — the durable commit record's identity + the committed set + the trigger flag. */
export const CycleFreezeCommitResponse = z
  .object({
    commit_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    actor_display: z.string(),
    committed_claim_ids: z.array(z.string().uuid()),
    trigger_delivered: z.boolean(),
    committed_at: z.string(),
    /** True when this response reflects a re-submitted (idempotent) commit rather than a fresh one. */
    idempotent_replay: z.boolean(),
  })
  .strict();
export type CycleFreezeCommitResponse = z.output<typeof CycleFreezeCommitResponse>;

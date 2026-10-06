// packages/contracts/src/claims/verification-decision.ts
//
// Verifier adjudication (approve/deny/escalate/revise) transport DTOs — Story 6.11 (the FIRST verifier
// WRITE). The request/response wire shapes for the decision-strip actions:
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-decision         → approve/deny/escalate
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-decision/revise  → same-outcome revise
//
// ── Contracts discipline (the dpdpa-consent.ts / nominee-bank.ts precedent) ─────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the outcome +
// reason-code wire enums AND the outcome↔reason-code compatibility map are RE-DECLARED here,
// value-aligned with the domain `verifier_decision_outcome` / `verifier_reason_code` pgEnums and the
// domain `REASON_CODE_OUTCOME_COMPAT` (AC8). The DOMAIN copy is the canonical source of truth + the
// defense-in-depth enforcement point (the write path re-checks even if the boundary is bypassed); THIS
// is the value-aligned wire mirror that produces the 400 at the boundary. Keep the two in lockstep (the
// exact posture every claim contract takes with its domain enum). ALL objects `.strict()`.
//
// ── R5 — the request carries NO actor identity (server-derived only) ────────────────────────
// `actor_display` (and any actor id) is NEVER accepted from the client — the server resolves it from
// the authenticated actor's `users.display_name` and snapshots it. The DTOs are `.strict()`, so a
// smuggled `actor_display` (or any unknown field) is a 400.
//
// ── D-G — rationale is Tier-1 PII ───────────────────────────────────────────────────────────
// The optional `rationale` free-text (≤500 chars) is Tier-1-encrypted server-side. It is required on
// `other` and on a Deny (superRefine). Responses carry NON-PII decision metadata only — never the
// rationale (the authorized console re-fetches decrypted (e)/(f) after the invalidation).

import { z } from 'zod';

/** The three adjudication outcomes (value-aligned with the domain `verifier_decision_outcome` pgEnum). */
export const VerifierDecisionOutcome = z.enum(['approved', 'denied', 'escalated']);
export type VerifierDecisionOutcome = z.output<typeof VerifierDecisionOutcome>;

/** The bounded reason codes (value-aligned with the domain `verifier_reason_code` pgEnum). Snake_case
 *  at both the enum and the wire (naming discipline). `other` requires the free-text rationale. */
export const VerifierReasonCode = z.enum([
  'r5_d_natural_death',
  'r8_90pct_met',
  'concealment_flag_override',
  'concealment_flag_uphold',
  // Story 6.20 (D14, `2026-09-21-239`) — the District Admin's refusal on SUSPICION of a nominee
  // version dated on or after the certificate date. `denied` ONLY. Mirrors the domain tuple + 0120.
  'post_death_nominee_change',
  'r9_routed_to_voting',
  'other',
]);
export type VerifierReasonCode = z.output<typeof VerifierReasonCode>;

/** Max rationale length (AC1(b)). */
export const VERIFIER_RATIONALE_MAX_CHARS = 500;

/**
 * The wire mirror of the domain `REASON_CODE_OUTCOME_COMPAT` (AC8). Which outcomes each reason code is
 * valid for. Keep value-aligned with packages/domain/src/claim/verifier-decision.ts (the canonical
 * source). `other` is valid for any outcome.
 */
export const REASON_CODE_OUTCOME_COMPAT: Readonly<
  Record<VerifierReasonCode, readonly VerifierDecisionOutcome[]>
> = {
  r5_d_natural_death: ['approved'],
  r8_90pct_met: ['approved'],
  concealment_flag_override: ['approved'],
  concealment_flag_uphold: ['denied'],
  post_death_nominee_change: ['denied'],
  r9_routed_to_voting: ['escalated'],
  other: ['approved', 'denied', 'escalated'],
};

/** The pure compat predicate (AC8) — the boundary `superRefine` uses it; the domain write-path re-checks
 *  with its own canonical copy. Accepts raw strings; an unknown pair is not compatible → false. */
export function isReasonCodeValidForOutcome(outcome: string, reasonCode: string): boolean {
  const allowed = REASON_CODE_OUTCOME_COMPAT[reasonCode as VerifierReasonCode];
  return allowed !== undefined && allowed.includes(outcome as VerifierDecisionOutcome);
}

/** The reason codes valid for a given outcome (drives the `<ReasonCodeDropdown>` per-outcome options). */
export function reasonCodesForOutcome(outcome: string): VerifierReasonCode[] {
  return VerifierReasonCode.options.filter((code) => isReasonCodeValidForOutcome(outcome, code));
}

/** The shared field superRefine (AC8 + AC1(b)): compat + rationale-required-on-other/deny + ≤500 chars. */
function applyDecisionRefinements<T extends { outcome: string; reason_code: string; rationale?: string }>(
  schema: z.ZodType<T>,
): z.ZodEffects<z.ZodType<T>> {
  return schema.superRefine((val, ctx) => {
    // (a) outcome↔reason-code compatibility (AC8) — a rejected combination is a 400.
    if (!isReasonCodeValidForOutcome(val.outcome, val.reason_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason_code'],
        message: `reason_code '${val.reason_code}' is not valid for outcome '${val.outcome}'`,
      });
    }
    // (b) rationale required on `other` and on a Deny; (c) ≤500 chars.
    const rationale = val.rationale?.trim() ?? '';
    if ((val.reason_code === 'other' || val.outcome === 'denied') && rationale === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rationale'],
        message: 'a rationale is required for the "other" reason code and for a Deny',
      });
    }
    if ((val.rationale?.length ?? 0) > VERIFIER_RATIONALE_MAX_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        path: ['rationale'],
        maximum: VERIFIER_RATIONALE_MAX_CHARS,
        type: 'string',
        inclusive: true,
        message: `rationale must be at most ${VERIFIER_RATIONALE_MAX_CHARS} characters`,
      });
    }
  });
}

// ── Story 6.23a — the nominee-change WARNINGS and the WARNING REASON (NW1, NW5, NW13, NW16) ─────────────────────
// ⛔ `@twt/domain` is never imported here: the kinds, the record's steps and the built-in generic are RE-DECLARED,
// each with a lockstep test against the domain's own copy. ⛔ The verifier vocabulary above is UNCHANGED (Trap 7) — the
// warning reason is its OWN field, beside the approval's real reason (invariant 11).

/** The warning kinds (NW1). ⚠ LOCKSTEP with `@twt/domain`'s `APPROVAL_WARNING_KINDS`. */
export const APPROVAL_WARNING_KINDS = ['post_death_version', 'recent_nominee_change'] as const;
export const ApprovalWarningKind = z.enum(APPROVAL_WARNING_KINDS);
export type ApprovalWarningKind = z.output<typeof ApprovalWarningKind>;

/**
 * The approval-over-warning record's steps (NW13 — 6.23a's two; 6.23b EA1 adds the five later approvers). ⚠ LOCKSTEP with
 * the domain + migration 0144.
 */
export const CLAIM_WARNING_APPROVAL_STEPS = [
  'district_admin_approval',
  'district_admin_late_reason',
  'escalation_resolution',
  'final_vote',
  'r9_vote',
  'super_admin_approval',
  'no_correction_approval',
] as const;

/** The BUILT-IN GENERIC warning reason (NW16) — every Pariwar has it, first. ⚠ LOCKSTEP with the domain. */
export const APPROVAL_WARNING_GENERIC_REASON = {
  code: 'warnings_reviewed',
  label: 'Warnings reviewed — approved despite them',
  whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
} as const;

/** A warning-reason code on the wire — the generic's or a stored `awr_…`. Bounded; ⛔ never free text. */
export const WarningReasonCode = z.string().trim().min(1).max(64);

/**
 * One option on the shared picker (NW9) — 6.23b's surfaces reuse it. `null` provenance marks the built-in generic
 * (*"built in"*). ⛔ No member data: the label and the note are the Super Admin's staff policy text.
 */
export const ApprovalWarningReasonOption = z
  .object({
    code: z.string(),
    reasonId: z.string().uuid().nullable(),
    label: z.string(),
    whenToUse: z.string(),
    addedByDisplay: z.string().nullable(),
    addedAt: z.string().nullable(),
    replacesLabel: z.string().nullable(),
  })
  .strict();
export type ApprovalWarningReasonOption = z.output<typeof ApprovalWarningReasonOption>;

/**
 * ⭐ Story 6.23b (EA7; RD4) — what a LATER approver's screen shows for ONE claim, on every later read surface (the
 * cycle-freeze pending case, the R9 panel, the Super Admin's detail, the "no correction needed" queue item). snake_case
 * like the DTOs it rides on (6.23a's option DTO above stays camelCase). `available: false` ⇔ the warnings could ⛔ not
 * be read (Trap 15): Approve is disabled with its own words — ⛔ never "no warnings" (invariant 7).
 * `waiting_for_district_admin` is judged for the VIEWER as a prospective approver (their own late reasons excluded —
 * `-279` A1; on the R9 panel every live approve voter's too); `own_reason_excluded` ⇔ only that exclusion holds it.
 */
export const ApprovalWarningsSummary = z
  .object({
    available: z.boolean(),
    kinds: z.array(ApprovalWarningKind),
    post_death: z.enum(['evaluated', 'awaiting_determination']),
    waiting_for_district_admin: z.boolean(),
    own_reason_excluded: z.boolean(),
  })
  .strict()
  // Code review 2026-10-06: `available: false` means the warnings could ⛔ not be read (Trap 15) — it must carry no
  // signal of its own, so a degraded read can never masquerade as a specific, known warning state.
  .superRefine((v, ctx) => {
    if (!v.available && (v.kinds.length > 0 || v.waiting_for_district_admin || v.own_reason_excluded)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['available'],
        message: 'an unavailable summary must carry no kinds/waiting/own-reason signal',
      });
    }
  });
export type ApprovalWarningsSummary = z.output<typeof ApprovalWarningsSummary>;

/**
 * The approve/deny/escalate request (the `verifier-decision` route). `outcome` selects the verb; the
 * server derives the actor identity + district (never the client). `.strict()` — a smuggled
 * `actor_display`/`supersedes_decision_id`/unknown field is a 400.
 * ⭐ Story 6.23a (NW5) — `warning_reason_code`: the WARNING REASON, in its own field. Allowed ONLY with
 * `outcome: 'approved'`; when present, a non-blank rationale is required (the note `-262` FQ2 asks for). Whether a
 * warning shows — and so whether it is REQUIRED — is the server's (409 `verifier_decision.warning_reason_required`).
 * ⛔ The revise request does ⛔ not take it: a warned approval is ⛔ never revised (NW7).
 */
export const VerifierDecisionRequest = applyDecisionRefinements(
  z
    .object({
      outcome: VerifierDecisionOutcome,
      reason_code: VerifierReasonCode,
      rationale: z.string().max(VERIFIER_RATIONALE_MAX_CHARS).optional(),
      warning_reason_code: WarningReasonCode.optional(),
    })
    .strict(),
).superRefine((val, ctx) => {
  if (val.warning_reason_code === undefined) return;
  if (val.outcome !== 'approved') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['warning_reason_code'],
      message: 'a warning reason belongs to an approval only',
    });
  }
  if ((val.rationale?.trim() ?? '') === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rationale'],
      message: 'a note is required when a warning reason is chosen',
    });
  }
});
export type VerifierDecisionRequest = z.output<typeof VerifierDecisionRequest>;

/**
 * The revise request (the `verifier-decision/revise` route, step-up-gated). Corrects the reason-code/
 * rationale of the SAME outcome (cross-outcome reversal is Story 6.16 — the domain write-path rejects
 * it). The optional `supersedes_decision_id` is a client optimistic assertion of which decision it
 * believes it is revising (the server confirms it is the live one). `.strict()`.
 */
export const VerifierDecisionReviseRequest = applyDecisionRefinements(
  z
    .object({
      outcome: VerifierDecisionOutcome,
      reason_code: VerifierReasonCode,
      rationale: z.string().max(VERIFIER_RATIONALE_MAX_CHARS).optional(),
      supersedes_decision_id: z.string().uuid().optional(),
    })
    .strict(),
);
export type VerifierDecisionReviseRequest = z.output<typeof VerifierDecisionReviseRequest>;

/**
 * The decision response — NON-PII decision metadata only (never the rationale, D-G). The authorized
 * console re-fetches decrypted (e)/(f) after the client invalidates the console packet. `claim_state`
 * is the post-decision lifecycle state so the UI can react (approve → verifier_approved, escalate →
 * unchanged, revise → unchanged).
 */
export const VerifierDecisionResponse = z
  .object({
    decision_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    outcome: VerifierDecisionOutcome,
    reason_code: VerifierReasonCode,
    /** The decision-time actor_display SNAPSHOT (R5/AC7) — server-resolved, never client-supplied. */
    actor_display: z.string(),
    decided_at: z.string(),
    /** The revised-from decision id (revise only; null on a fresh decision). */
    supersedes_decision_id: z.string().uuid().nullable(),
    /** The claim's lifecycle state after the decision. */
    claim_state: z.string(),
  })
  .strict();
export type VerifierDecisionResponse = z.output<typeof VerifierDecisionResponse>;

/**
 * Story 6.23a (NW14) — the District Admin's (any `claim.approve` holder's) reason for a warning that appeared AFTER the
 * approval. Both fields required; the note is written once and ⛔ never replaced (NW18). `.strict()`.
 */
export const LateWarningReasonRequest = z
  .object({
    warning_reason_code: WarningReasonCode,
    note: z.string().trim().min(1).max(VERIFIER_RATIONALE_MAX_CHARS),
  })
  .strict();
export type LateWarningReasonRequest = z.output<typeof LateWarningReasonRequest>;

/** The late reason's response — NON-PII (⛔ never the note). */
export const LateWarningReasonResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    record_id: z.string().uuid(),
    covered_key_count: z.number().int().positive(),
    kinds: z.array(ApprovalWarningKind),
  })
  .strict();
export type LateWarningReasonResponse = z.output<typeof LateWarningReasonResponse>;

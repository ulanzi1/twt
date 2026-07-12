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

/**
 * The approve/deny/escalate request (the `verifier-decision` route). `outcome` selects the verb; the
 * server derives the actor identity + district (never the client). `.strict()` — a smuggled
 * `actor_display`/`supersedes_decision_id`/unknown field is a 400.
 */
export const VerifierDecisionRequest = applyDecisionRefinements(
  z
    .object({
      outcome: VerifierDecisionOutcome,
      reason_code: VerifierReasonCode,
      rationale: z.string().max(VERIFIER_RATIONALE_MAX_CHARS).optional(),
    })
    .strict(),
);
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

// Story 6.22 — the fraud register's investigation: the helpline operator's FLAG, the District Admin's FINDING, the console
// read, the helpline's per-member list and the District Admin's work-list (DL4–DL7, DL10). `.strict()` throughout.
//
// ⛔ No claimant PII on any of these wires (TR14) — ids, states, dates, the staff display name, and the notes ONLY on the
// console read, withheld UNIFORMLY unless the viewer may record a finding (DL7).

import { z } from 'zod';

import { ReadableErasable } from './nominee-name-check.js';

/**
 * The admin step-up context of the FINDING. ⚠ Step-up contexts have ⛔ no registry (`requireStepUp(deps, actionContext)` takes
 * a free string) — so the route AND the admin OTP caller import THIS constant, ⛔ a retyped literal (the 10.21 footgun; the
 * `MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT` precedent).
 */
export const FRAUD_FINDING_STEP_UP_CONTEXT = 'fraud_finding';

/**
 * HOW the member was confirmed alive. ⚠ LOCKSTEP with `@twt/domain`'s `FRAUD_ALIVE_CONFIRMATIONS` and migration 0197's
 * `claim_fraud_investigation_steps_alive_confirmation_check` (a test pins this one ↔ the domain's). Which proofs suffice is
 * the Panel's (Q9) — this is the BUILT set.
 */
export const FraudAliveConfirmation = z.enum(['in_person', 'video_call', 'ground_inspection']);
export type FraudAliveConfirmation = z.output<typeof FraudAliveConfirmation>;

/** The two outcomes (`-238` cl. 4). ⛔ No third. */
export const FraudFindingOutcome = z.enum(['innocent', 'guilty']);
export type FraudFindingOutcome = z.output<typeof FraudFindingOutcome>;

/** Where a claim's investigation stands — the helpline's view (⛔ the outcome: the District Admin's console shows that). */
export const FraudInvestigationStatus = z.enum(['none', 'flagged', 'found']);
export type FraudInvestigationStatus = z.output<typeof FraudInvestigationStatus>;

/** A staff note on the wire IN: Tier-1 at rest. ⛔ No `.min(1)` — an empty note reaches the writer's own audited `missing_note`. */
const NoteIn = z.string().trim().max(2000);

// ── The flag (DL4) ───────────────────────────────────────────────────────────────────────────────────

/** `POST …/admin/claims/:claimCaseId/fraud-investigation/flag`. */
export const FraudFlagRequest = z
  .object({
    /** Client-minted — a retry with the same id REPLAYS the original result. */
    step_id: z.string().uuid(),
    note: NoteIn,
  })
  .strict();
export type FraudFlagRequest = z.output<typeof FraudFlagRequest>;

export const FraudFlagResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    step_id: z.string().uuid(),
    claim_state: z.string(),
    /** `true` ⇒ this request repeated an earlier flag — ⛔ new record. */
    replayed: z.boolean(),
  })
  .strict();
export type FraudFlagResponse = z.output<typeof FraudFlagResponse>;

// ── The finding (DL3) ────────────────────────────────────────────────────────────────────────────────

/** `POST …/admin/claims/:claimCaseId/fraud-investigation/finding` — behind the `FRAUD_FINDING_STEP_UP_CONTEXT` step-up. */
export const FraudFindingRequest = z
  .object({
    /** Client-minted — a retry with the same step id (and outcome) REPLAYS. */
    step_id: z.string().uuid(),
    /** Client-minted — the finding record's own id. */
    finding_id: z.string().uuid(),
    outcome: FraudFindingOutcome,
    /** OPTIONAL on the wire: a missing one reaches the writer's own audited `missing_alive_confirmation` (→ 400). */
    alive_confirmation: FraudAliveConfirmation.optional(),
    note: NoteIn,
  })
  .strict();
export type FraudFindingRequest = z.output<typeof FraudFindingRequest>;

/** One OTHER claim that still keeps the member's death reported — ids, state, filing date. */
export const StandingDeathReportItem = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    filed_at: z.string().datetime(),
  })
  .strict();
export type StandingDeathReportItem = z.output<typeof StandingDeathReportItem>;

export const FraudFindingResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    step_id: z.string().uuid(),
    finding_id: z.string().uuid(),
    outcome: FraudFindingOutcome,
    /** `true` — the claim is now closed. `false` — see `not_closed_reason`. */
    closed: z.boolean(),
    /** `committed` — approved / paid, so ⛔ stopped by this finding (row 6-22c); `already_closed` — closed earlier. */
    not_closed_reason: z.enum(['committed', 'already_closed']).nullable(),
    /** The member's OTHER claims that still keep them locked (ids, states, dates only). */
    other_standing_claims: z.array(StandingDeathReportItem),
    replayed: z.boolean(),
  })
  .strict();
export type FraudFindingResponse = z.output<typeof FraudFindingResponse>;

// ── The console read (DL7) ───────────────────────────────────────────────────────────────────────────

/**
 * A fraud-investigation note as the console reads it: `ReadableErasable`'s three states (the RTBF scrub writes the sentinel —
 * `anonymized`, DL15) plus `withheld` — the viewer does ⛔ hold `claim.record_fraud_finding` at this district (DL7), UNIFORM on
 * every step. ⚠ ⛔ `ReadableNote` / `WithheldNote`: their reasons (`own_visit`, `check_failed`) are 6.27b's hide rule, and a
 * missing key is neither — the reason would mislead.
 */
export const FraudInvestigationNote = z.discriminatedUnion('state', [
  ...ReadableErasable.options,
  z.object({ state: z.literal('withheld') }).strict(),
]);
export type FraudInvestigationNote = z.output<typeof FraudInvestigationNote>;

export const FraudInvestigationStepKind = z.enum(['flagged', 'found_innocent', 'found_guilty']);
export type FraudInvestigationStepKind = z.output<typeof FraudInvestigationStepKind>;

export const FraudInvestigationStepView = z
  .object({
    step: FraudInvestigationStepKind,
    actor_display: z.string(),
    acted_at: z.string().datetime(),
    alive_confirmation: FraudAliveConfirmation.nullable(),
    /** WITHHELD on EVERY step unless the viewer may record a finding at this claim's district (uniform). */
    note: FraudInvestigationNote,
  })
  .strict();
export type FraudInvestigationStepView = z.output<typeof FraudInvestigationStepView>;

/** `GET …/admin/claims/:claimCaseId/fraud-investigation` (`claim.verify` at the district). */
export const FraudInvestigationResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    steps: z.array(FraudInvestigationStepView),
    viewer: z
      .object({
        /** Judged on the SERVER: holds `claim.record_fraud_finding` here, did ⛔ flag it, and a finding is still open. */
        can_record_finding: z.boolean(),
        /** The viewer FLAGGED this claim — the finding is ⛔ theirs to record (the ruled two-person chain). */
        is_flagger: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type FraudInvestigationResponse = z.output<typeof FraudInvestigationResponse>;

// ── The helpline's per-member list (DL5) ─────────────────────────────────────────────────────────────

/** `GET …/admin/members/:memberId/fraud-investigation/claims` (`claim.flag_fraud`, pariwar). EVERY state. */
export const MemberFraudClaimsResponse = z
  .object({
    claims: z.array(
      z
        .object({
          claim_case_id: z.string().uuid(),
          claim_state: z.string(),
          filed_at: z.string().datetime(),
          investigation: FraudInvestigationStatus,
        })
        .strict(),
    ),
  })
  .strict();
export type MemberFraudClaimsResponse = z.output<typeof MemberFraudClaimsResponse>;

// ── The District Admin's work-list (DL10 (iv)) ───────────────────────────────────────────────────────

/** `GET …/admin/fraud-investigations` — flagged claims with ⛔ finding yet, in the viewer's districts. */
export const OpenFraudInvestigationsResponse = z
  .object({
    items: z.array(
      z
        .object({
          claim_case_id: z.string().uuid(),
          claim_state: z.string(),
          claim_filed_at: z.string().datetime(),
          flagged_at: z.string().datetime(),
        })
        .strict(),
    ),
  })
  .strict();
export type OpenFraudInvestigationsResponse = z.output<typeof OpenFraudInvestigationsResponse>;

/** Every error code the fraud-investigation routes answer with — closed (the admin maps each to copy). */
export const FRAUD_INVESTIGATION_ERROR_CODES = [
  'fraud_investigation.claim_not_found',
  'fraud_investigation.already_flagged',
  'fraud_investigation.not_flagged',
  'fraud_investigation.already_found',
  'fraud_investigation.finder_is_flagger',
  'fraud_investigation.step_conflict',
  'fraud_investigation.missing_note',
  'fraud_investigation.missing_alive_confirmation',
  'fraud_investigation.missing_display',
] as const;
export type FraudInvestigationErrorCode = (typeof FRAUD_INVESTIGATION_ERROR_CODES)[number];

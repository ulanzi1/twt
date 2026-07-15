// Verifier concealment-linkage assessment DTOs — Story 6.15 (Task 5; AC7, D-D/D-G).
//
// The wire contract for the verifier concealment-assessment WRITE surface
// (`POST …/admin/claims/:claimCaseId/concealment-assessment`): the human-supplied
// `claim.concealed_ima_condition_linked` fact — a tri-state review ANNOTATION (`linked | not_linked |
// unable_to_determine`), NEVER an adjudication. It records/revises the LIVE assessment on a claim; it emits
// no approval/denial (the State Trustee decides, Story 6.13). An OPTIONAL note is Tier-1 PII (encrypted
// server-side before the writer; NEVER echoed back on the response, NEVER on an audit line).
//
// `kind` is re-declared value-aligned with the @twt/domain `claim_concealment_assessment_kind` pgEnum (the
// browser-bundle rule — no @twt/domain import from a browser-reachable contract; a lockstep test pins them).

import { z } from 'zod';

/** The tri-state assessment kind (value-aligned with the domain `CLAIM_CONCEALMENT_ASSESSMENT_KINDS`). */
export const ConcealmentAssessmentKind = z.enum(['linked', 'not_linked', 'unable_to_determine']);
export type ConcealmentAssessmentKind = z.output<typeof ConcealmentAssessmentKind>;

/** Max note length (mirrors the 6.11/6.13 ≤500 rationale posture). */
export const CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS = 500;

/**
 * The record/revise request. `claim_case_id` is a strict-UUID PATH param (not in the body). `kind` is
 * required; `note` is OPTIONAL free-text (Tier-1 — encrypted server-side; ≤500 chars). `.strict()` — a
 * smuggled `actor_display` / unknown field is a 400 (the actor identity + display are server-derived, R5).
 */
export const ConcealmentAssessmentRequest = z
  .object({
    kind: ConcealmentAssessmentKind,
    // `.trim().min(1)` (the nominee-bank `correctionReason` precedent) rejects a whitespace-only note AT
    // THE CONTRACT BOUNDARY — not only defensively inside the route's crypto helper, so any future caller
    // of this shared DTO gets the same protection without depending on that specific helper.
    note: z.string().trim().min(1).max(CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS).optional(),
  })
  .strict();
export type ConcealmentAssessmentRequest = z.output<typeof ConcealmentAssessmentRequest>;

/**
 * The record/revise response — NON-PII assessment metadata only (NEVER the note). `claim_state` echoes the
 * post-write lifecycle state so the UI can confirm the assessment changed NOTHING (identity annotation).
 */
export const ConcealmentAssessmentResponse = z
  .object({
    assessment_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    kind: ConcealmentAssessmentKind,
    actor_display: z.string(),
    created_at: z.string(),
    supersedes_assessment_id: z.string().uuid().nullable(),
    claim_state: z.string(),
  })
  .strict();
export type ConcealmentAssessmentResponse = z.output<typeof ConcealmentAssessmentResponse>;

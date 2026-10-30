// Story 6.32 (`2026-10-28-413` IQ7 / IQ9 / IQ10; AC3, AC7) — the inspector's questionnaire for the family at the ground
// inspection, on the WIRE. The served definition REUSES the neighbours' wire schema (`PeerRequestQuestionnaire` — the words
// resolved on the server in en AND hi; the admin shows the English line and the Hindi line beneath it) — ⛔ a copy.
//   · GET  …/ground-inspection/:id/questionnaire — the served definition of the visit's pinned (or live) version, whether the
//     visit is still open, and the inspector's own live answers (decrypted on the server; ⛔ a value that cannot be shown is
//     `unavailable`). 404 `ground_inspection.questionnaire_unavailable` ⇔ ⛔ panel (a certificate check, ⛔ live version).
//   · PUT  …/ground-inspection/:id/questionnaire/answers/:questionKey — `{ codes }`; last write wins (⛔ Idempotency-Key —
//     a retry re-sends the same final value).
// ⛔ Nothing here gates an inspection or an approval (I1) — every question is optional.

import { z } from 'zod';

import { PeerRequestQuestionnaire } from './peer-request.js';

const KEY = /^[a-z][a-z0-9_]*$/;

export const GROUND_INSPECTION_QUESTIONNAIRE_UNAVAILABLE_CODE = 'ground_inspection.questionnaire_unavailable' as const;
export const GROUND_INSPECTION_QUESTIONNAIRE_CERTIFICATE_CHECK_CODE = 'ground_inspection.questionnaire_not_for_certificate_check' as const;
export const GROUND_INSPECTION_QUESTIONNAIRE_STALE_CODE = 'ground_inspection.questionnaire_stale' as const;
/** Story 6.33 (`2026-10-30-421` QE12 R7) — 409: the version changed since the panel loaded it — the panel RELOADS (⛔ retries). */
export const GROUND_INSPECTION_QUESTIONNAIRE_VERSION_STALE_CODE = 'ground_inspection.questionnaire_version_stale' as const;
/**
 * Story 6.33 (R7 (v)) — 409: the visit's pinned version cannot be served for saving — the panel's terminal (read-only) state.
 * ⛔ `…questionnaire_unavailable` (that 404 means "⛔ panel" and is UNCHANGED).
 */
export const GROUND_INSPECTION_QUESTIONNAIRE_VERSION_UNREADABLE_CODE = 'ground_inspection.questionnaire_version_unreadable' as const;
/** 422 — the engine refused the answer; `details.reason` is the engine's `AnswerRefusalReason`. */
export const GROUND_INSPECTION_ANSWER_INVALID_CODE = 'questionnaire.answer_invalid' as const;

/** At most this many codes in one answer (the illness list has ten options). */
export const GROUND_INSPECTION_ANSWER_MAX_CODES = 10;

export const GroundInspectionAnswerValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('codes'), codes: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('unavailable') }).strict(),
]);
export type GroundInspectionAnswerValue = z.infer<typeof GroundInspectionAnswerValue>;

export const GroundInspectionLiveAnswer = z.object({ questionKey: z.string(), value: GroundInspectionAnswerValue }).strict();
export type GroundInspectionLiveAnswer = z.infer<typeof GroundInspectionLiveAnswer>;

export const GroundInspectionQuestionnaireResponse = z
  .object({
    groundInspectionId: z.string(),
    questionnaire: PeerRequestQuestionnaire,
    /** `true` ⇔ the visit is still `scheduled` (answers may be saved); a completed visit's answers are read-only. */
    open: z.boolean(),
    answers: z.array(GroundInspectionLiveAnswer),
  })
  .strict();
export type GroundInspectionQuestionnaireResponse = z.infer<typeof GroundInspectionQuestionnaireResponse>;

/** Story 6.33 (R7) — `questionnaireVersionId` = the version the panel RENDERED; optional (an older client keeps the retryable stale). */
export const GroundInspectionSaveAnswerRequest = z
  .object({
    codes: z.array(z.string().regex(KEY)).min(1).max(GROUND_INSPECTION_ANSWER_MAX_CODES),
    questionnaireVersionId: z.string().regex(/^ground_inspection\.v[0-9]+$/).max(64).optional(),
  })
  .strict();
export type GroundInspectionSaveAnswerRequest = z.infer<typeof GroundInspectionSaveAnswerRequest>;

export const GroundInspectionSaveAnswerResponse = z
  .object({
    questionKey: z.string(),
    /** `false` ⇔ the same value was already saved (⛔ nothing written). */
    written: z.boolean(),
    supersededDependants: z.array(z.string()),
    questionnaireVersionId: z.string(),
  })
  .strict();
export type GroundInspectionSaveAnswerResponse = z.infer<typeof GroundInspectionSaveAnswerResponse>;

/**
 * ⭐ AC6 / AC7 — ③ / ④ on the inspector's discrepancy result: the FAMILY's answer in the options' English words (*"The family
 * said: …. A neighbour's answer differs."*), present ONLY for a ③ / ④ key among the shown keys. ⛔ The neighbour's answer,
 * ⛔ who, ⛔ a count (CF2). Erased / undecryptable ⇒ `unavailable`.
 */
export const FamilyAnswerDisplay = z.discriminatedUnion('status', [
  z.object({ status: z.literal('shown'), codes: z.array(z.string()), labels: z.array(z.string()) }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type FamilyAnswerDisplay = z.infer<typeof FamilyAnswerDisplay>;
export const FamilyAnswersDisplay = z
  .object({ death_cause: FamilyAnswerDisplay.optional(), death_illness: FamilyAnswerDisplay.optional() })
  .strict();
export type FamilyAnswersDisplay = z.infer<typeof FamilyAnswersDisplay>;

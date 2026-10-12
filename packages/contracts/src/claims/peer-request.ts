// The NEIGHBOURS' ANSWER SCREENS — the member's and the helpline's request / response shapes (Story 6.27a PM11, PM12;
// `2026-10-10-311`). The questionnaire ENGINE lives in `@twt/domain` (`questionnaires/` — F30: domain cannot import
// contracts); this file mirrors ONLY the wire shape the app renders, pinned to the domain by a test-only lockstep
// (`tests/claims-peer-request.test.ts`) — ⛔ never an import of `@twt/domain` here (the RN bundle boundary).
//
//   · GET  /api/v1/p/:pariwarId/member/peer-requests?limit=                       — the session member's OPEN requests
//   · GET  /api/v1/p/:pariwarId/member/peer-requests/:pingId                      — one request: the questionnaire + answers
//   · PUT  /api/v1/p/:pariwarId/member/peer-requests/:pingId/answers/:questionKey — the auto-save (idempotent by value)
//   · POST /api/v1/p/:pariwarId/member/peer-requests/:pingId/submit               — locks the reply
//   · the helpline's twins under /api/v1/p/:pariwarId/admin/claims/helpline/…     (PM12 — 6.3's chain + step-up)
//
// ⭐ The question WORDS come from the server, resolved in en AND hi (a new version needs ⛔ no app release); ONLY the
// chrome is in the app's catalog. ⛔ No claim, ⛔ no family, ⛔ no amount anywhere — the member's NAME only.
// ⭐ A request the Trust has ⛔ not texted (`send_outcome IS DISTINCT FROM 'accepted'`) is a 404 on EVERY route — the same
// answer as "not yours / unknown / another Pariwar" (one indistinguishable answer).

import { z } from 'zod';

/** The domain's `QUESTION_KINDS` (lockstep). */
export const PEER_REQUEST_QUESTION_KINDS = ['single', 'multi', 'date', 'yes_no'] as const;

/** The 409 codes (PM8 / PM7 (d)) and the 422 / 409 save codes. */
export const PEER_REQUEST_NO_LONGER_OPEN_CODE = 'peer_request.no_longer_open' as const;
export const PEER_REQUEST_SUBMITTED_CODE = 'peer_request.submitted' as const;
export const PEER_REQUEST_INVALID_ANSWER_CODE = 'peer_request.invalid_answer' as const;
export const PEER_REQUEST_STALE_CODE = 'peer_request.stale' as const;

/** The list cap (PM11 — at most five requests are ever open for one member about one death; forced pagination). */
export const PEER_REQUEST_LIST_MAX = 5;

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z][a-z0-9_]*$/;

/** Words in both languages, resolved on the server. */
export const PeerRequestWords = z.object({ en: z.string(), hi: z.string() });
export type PeerRequestWords = z.infer<typeof PeerRequestWords>;

export const PeerRequestOption = z.object({
  code: z.string(),
  words: PeerRequestWords,
  exclusive: z.boolean(),
});

export const PeerRequestQuestion = z.object({
  key: z.string(),
  kind: z.enum(PEER_REQUEST_QUESTION_KINDS),
  words: PeerRequestWords,
  options: z.array(PeerRequestOption),
  optional: z.boolean(),
  showIf: z.object({ key: z.string(), anyOf: z.array(z.string()) }).nullable(),
});
export type PeerRequestQuestion = z.infer<typeof PeerRequestQuestion>;

/** The PINNED version's SERVED definition (a `'pending'` question is ⛔ never on the wire). */
export const PeerRequestQuestionnaire = z.object({
  versionId: z.string(),
  pages: z.array(z.object({ questions: z.array(PeerRequestQuestion) })),
  closingNote: PeerRequestWords,
  thankYou: PeerRequestWords,
});
export type PeerRequestQuestionnaire = z.infer<typeof PeerRequestQuestionnaire>;

/** An answer: option codes, or a calendar date for a `date` question. */
export const PeerRequestAnswerValue = z.union([
  z.object({ codes: z.array(z.string().regex(KEY)).min(1).max(20) }).strict(),
  z.object({ date: z.string().regex(CALENDAR_DATE) }).strict(),
]);
export type PeerRequestAnswerValue = z.infer<typeof PeerRequestAnswerValue>;

/** One LIVE answer, as its owner (the neighbour, or the operator recording them) sees it. */
export const PeerRequestLiveAnswer = z.object({
  questionKey: z.string(),
  value: z.union([PeerRequestAnswerValue, z.object({ unavailable: z.literal(true) }).strict()]),
  savedAt: z.string(),
});
export type PeerRequestLiveAnswer = z.infer<typeof PeerRequestLiveAnswer>;

/** One OPEN request on the list. `askedOn` = the IST date the text was accepted. */
export const PeerRequestListItem = z.object({
  pingId: z.string().uuid(),
  memberName: z.string(),
  askedOn: z.string(),
});
export type PeerRequestListItem = z.infer<typeof PeerRequestListItem>;

export const PeerRequestListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(PEER_REQUEST_LIST_MAX).default(PEER_REQUEST_LIST_MAX),
});
export const PeerRequestListResponse = z.object({ items: z.array(PeerRequestListItem) });
export type PeerRequestListResponse = z.infer<typeof PeerRequestListResponse>;

export const PeerRequestDetailResponse = z.object({
  pingId: z.string().uuid(),
  memberName: z.string(),
  questionnaire: PeerRequestQuestionnaire,
  answers: z.array(PeerRequestLiveAnswer),
  submitted: z.boolean(),
});
export type PeerRequestDetailResponse = z.infer<typeof PeerRequestDetailResponse>;

export const PeerRequestSaveAnswerRequest = z.object({ value: PeerRequestAnswerValue }).strict();
export type PeerRequestSaveAnswerRequest = z.infer<typeof PeerRequestSaveAnswerRequest>;

/** The save's reply: every live answer after the save (dependants superseded in the same transaction drop out). */
export const PeerRequestSaveAnswerResponse = z.object({ answers: z.array(PeerRequestLiveAnswer) });
export type PeerRequestSaveAnswerResponse = z.infer<typeof PeerRequestSaveAnswerResponse>;

export const PeerRequestSubmitResponse = z.object({ submitted: z.literal(true) });
export type PeerRequestSubmitResponse = z.infer<typeof PeerRequestSubmitResponse>;

export const PeerRequestPathParams = z.object({ pariwarId: z.string().uuid(), pingId: z.string().uuid() });
export const PeerRequestAnswerPathParams = PeerRequestPathParams.extend({ questionKey: z.string().regex(KEY).max(64) });

/** The helpline's list (PM12) — the caller's requests, each with its own detail (ONLY that neighbour's answers — PM25 (b)). */
export const HelplinePeerRequestListResponse = z.object({ items: z.array(PeerRequestDetailResponse) });
export type HelplinePeerRequestListResponse = z.infer<typeof HelplinePeerRequestListResponse>;

// packages/contracts/src/members/workplace.ts
//
// WHERE EACH MEMBER WORKS — the transport DTOs (Story 6.36a, Task 4; AC3, AC3b, AC4; `2026-10-14-330` SW2–SW9).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// Plain primitives + `.strict()`; NO `@twt/domain` import; NO `.openapi()` (the life-events posture — openapi/v1.yaml is
// unchanged). The posting BODY is a discriminated union on `choice` — `PostingUpdateRequest` (life-events/posting.ts) IS
// `WorkplacePostingRequest`.
//
// ── Two layers of refusal (AC4) ───────────────────────────────────────────────────────
// A SHAPE failure (an unknown `choice`, a non-uuid id, a date not `YYYY-MM-DD`, an empty district) answers 400
// `request.validation`. The HANDLER's domain refusals answer 422 with ONE code per family (`WORKPLACE_REFUSAL_CODES`) —
// so the typed name's rule (1–120 characters, ⛔ a run of seven digits in any script) and a calendar-impossible date are
// ⛔ checked here: the schema only bounds their size.
//
// ── PII posture ───────────────────────────────────────────────────────────────────────
// A workplace and a district are Tier 3 plaintext (architecture §2.7 — "School"). The typed name of an *"isn't listed"*
// answer is member-authored: it reaches the member's OWN history and export, ⛔ never an event, an audit line or a log.
// ⛔ Never on a public page or in the directory (AC8 — `workplace-never-public.test.ts`).

import { z } from 'zod';

import { Cursor } from '../_common/pagination.js';
import { LifeEventsSummaryResponse } from '../life-events/summary.js';

/** ⚠ LOCKSTEP with `WORKPLACE_KINDS` (`@twt/domain` schema/workplaces.ts) and 0161's CHECK. */
export const WorkplaceKindWire = z.enum(['school', 'office']);
export type WorkplaceKindWire = z.output<typeof WorkplaceKindWire>;

/** ⚠ LOCKSTEP with `WORKPLACE_REQUEST_STATES` (`@twt/domain` schema/workplace_requests.ts) and 0161's CHECK. */
export const WorkplaceRequestStateWire = z.enum(['pending', 'suggested', 'confirmed', 'withdrawn', 'closed']);
export type WorkplaceRequestStateWire = z.output<typeof WorkplaceRequestStateWire>;

/** The handler's domain refusals (422) — ONE code per family. ⚠ LOCKSTEP with `WORKPLACE_REFUSAL_CODES` (@twt/domain). */
export const WORKPLACE_REFUSAL_CODES = [
  'workplace.not_found',
  'workplace.district_not_found',
  'workplace.start_date_invalid',
  'workplace.typed_name_invalid',
  'workplace.choice_unavailable',
] as const;
export type WorkplaceRefusalCode = (typeof WORKPLACE_REFUSAL_CODES)[number];

/** `YYYY-MM-DD` — the shape only; a calendar-impossible date is the handler's 422 (`workplace.start_date_invalid`). */
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date as YYYY-MM-DD');
const District = z.string().trim().min(1).max(200);
const PariwarRef = z.string().trim().min(1).max(200);
/** The typed text's SIZE bound only — its rule (1–120, ⛔ seven digits) is the handler's 422. */
const TypedText = z.string().max(1000);

// ── The posting write (AC4) ───────────────────────────────────────────────────────────

/** A listed school or office — the posting's district is the WORKPLACE's (SW5). */
export const WorkplacePostingChoiceWorkplace = z
  .object({
    choice: z.literal('workplace'),
    workplaceId: z.string().uuid(),
    startedOn: IsoDate,
    pariwarRef: PariwarRef.optional(),
  })
  .strict();

/** *"My workplace isn't listed"* — the member types it under a LISTED district (SW9). */
export const WorkplacePostingChoiceNotListed = z
  .object({
    choice: z.literal('not_listed'),
    district: District,
    typedName: TypedText,
    typedPlace: TypedText.optional(),
    startedOn: IsoDate,
  })
  .strict();

/** *"I have retired"* — `startedOn` is the RETIREMENT date; the row keeps Epic 4's meaning (SW6). */
export const WorkplacePostingChoiceRetired = z
  .object({
    choice: z.literal('retired'),
    district: District,
    startedOn: IsoDate,
    pariwarRef: PariwarRef.optional(),
  })
  .strict();

/** ONLY in a Pariwar with ⛔ no list yet — today's free-text district box (SW7). */
export const WorkplacePostingChoiceDistrictOnly = z
  .object({
    choice: z.literal('district_only'),
    district: District,
    isRetirement: z.boolean().optional(),
    startedOn: IsoDate.optional(),
    pariwarRef: PariwarRef.optional(),
  })
  .strict();

/** `POST /api/v1/member/life-events/posting` — requires an `Idempotency-Key` header. */
export const WorkplacePostingRequest = z.discriminatedUnion('choice', [
  WorkplacePostingChoiceWorkplace,
  WorkplacePostingChoiceNotListed,
  WorkplacePostingChoiceRetired,
  WorkplacePostingChoiceDistrictOnly,
]);
export type WorkplacePostingRequest = z.output<typeof WorkplacePostingRequest>;
export type WorkplacePostingChoice = WorkplacePostingRequest['choice'];

// ── The reads (AC3, AC3b) ─────────────────────────────────────────────────────────────

/** `GET …/workplaces/districts` — the page-size bound (the forced-pagination guard). A Pariwar has a few dozen districts. */
export const WORKPLACE_DISTRICTS_PAGE_CAP = 200;
export const WorkplaceDistrictsQuery = z
  .object({ limit: z.coerce.number().int().positive().max(WORKPLACE_DISTRICTS_PAGE_CAP).optional() })
  .strict();
export type WorkplaceDistrictsQuery = z.output<typeof WorkplaceDistrictsQuery>;

/**
 * The Pariwar's LISTED district spellings, A–Z. `hasList: false` ⇒ ⛔ import yet — the app shows today's free-text district
 * box and sends `district_only` (SW7). ⛔ Ever a second page (the cap exceeds any state's district count).
 */
export const WorkplaceDistrictsResponse = z
  .object({
    items: z.array(z.object({ district: z.string() }).strict()),
    nextCursor: Cursor.nullable(),
    hasMore: z.boolean(),
    hasList: z.boolean(),
  })
  .strict();
export type WorkplaceDistrictsResponse = z.output<typeof WorkplaceDistrictsResponse>;

export const WORKPLACE_SEARCH_PAGE_CAP = 50;
/** The search text's bound — the FRONT door; the domain's `WORKPLACE_SEARCH_TEXT_MAX` is its twin (an api spec asserts they agree). */
export const WORKPLACE_SEARCH_TEXT_MAX_WIRE = 100;
/**
 * The search cursor's bound. It carries `[name, workplace_id]` base64url-encoded. The WORST case is a 200-code-point name of
 * C0 control characters (JSON-escaped to SIX bytes each — the import refuses every `\p{Cc}`, a staff-added name — 6.36c —
 * must too) plus a UUID: ~1,660 characters; an astral name (4 bytes each) ~1,120. 1000 let the server mint a cursor its own
 * contract refused (review 2026-10-15). A contracts test pins both cases under this bound.
 */
export const WORKPLACE_SEARCH_CURSOR_MAX = 1800;

/** `GET …/workplaces?district=&kind=&q=&limit=&cursor=` — the picker's server-side search (SW4). */
export const WorkplaceSearchQuery = z
  .object({
    district: District,
    kind: WorkplaceKindWire,
    q: z.string().max(WORKPLACE_SEARCH_TEXT_MAX_WIRE).optional(),
    limit: z.coerce.number().int().positive().max(WORKPLACE_SEARCH_PAGE_CAP).optional(),
    cursor: Cursor.max(WORKPLACE_SEARCH_CURSOR_MAX).optional(),
  })
  .strict();
export type WorkplaceSearchQuery = z.output<typeof WorkplaceSearchQuery>;

export const WorkplaceSummaryWire = z
  .object({
    workplaceId: z.string().uuid(),
    kind: WorkplaceKindWire,
    name: z.string(),
    district: z.string(),
    villageName: z.string().nullable(),
    clusterName: z.string().nullable(),
  })
  .strict();
export type WorkplaceSummaryWire = z.output<typeof WorkplaceSummaryWire>;

export const WorkplaceSearchResponse = z
  .object({ items: z.array(WorkplaceSummaryWire), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type WorkplaceSearchResponse = z.output<typeof WorkplaceSearchResponse>;

export const POSTING_HISTORY_PAGE_CAP = 100;
/** `GET …/postings` — the member's OWN history, newest first. */
export const PostingHistoryQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(POSTING_HISTORY_PAGE_CAP).optional(),
    cursor: Cursor.max(1000).optional(),
  })
  .strict();
export type PostingHistoryQuery = z.output<typeof PostingHistoryQuery>;

export const PostingHistoryItemWire = z
  .object({
    postingId: z.string().uuid(),
    /** When the row was recorded (UTC ISO, µs). */
    recordedAt: z.string(),
    district: z.string(),
    /** The date the member started there, or retired; ⛔ on a legacy row. */
    startedOn: z.string().nullable(),
    isRetirement: z.boolean(),
    /** The listed school or office (even if since delisted). */
    workplace: z.object({ workplaceId: z.string().uuid(), kind: WorkplaceKindWire, name: z.string() }).strict().nullable(),
    /** An *"isn't listed"* answer — the member's OWN typed text, and where the Pariwar Admin's search stands. */
    request: z
      .object({
        requestId: z.string().uuid(),
        state: WorkplaceRequestStateWire,
        typedName: z.string().nullable(),
        typedPlace: z.string().nullable(),
        /** The Pariwar Admin's suggestion while `state = 'suggested'` (6.36c asks the member to confirm it). */
        suggested: z.object({ workplaceId: z.string().uuid(), name: z.string(), district: z.string() }).strict().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type PostingHistoryItemWire = z.output<typeof PostingHistoryItemWire>;

export const PostingHistoryResponse = z
  .object({ items: z.array(PostingHistoryItemWire), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type PostingHistoryResponse = z.output<typeof PostingHistoryResponse>;

// ── Story 6.36c — keeping the list full (AC2–AC4; `-330` SW9 A, `-342`) ─────────────────────────────────────────────
//
//   GET  /api/v1/p/:pariwarId/admin/workplaces                                    — the list (`workplace.manage` OR `.review`)
//   POST /api/v1/p/:pariwarId/admin/workplaces                                    — ADD (the Super Admin; step-up)
//   POST /api/v1/p/:pariwarId/admin/workplaces/:workplaceId/rename | /delist | /relist — a STAFF row only (step-up)
//   GET  /api/v1/p/:pariwarId/admin/workplace-requests                            — the queue (`workplace.review`)
//   POST /api/v1/p/:pariwarId/admin/workplace-requests/:requestId/suggest | /close — (step-up)
//   POST /api/v1/member/life-events/workplace-requests/:requestId/answer          — the MEMBER's "Yes" / "No"
// A suggestion decides ⛔ nothing — only the member's "Yes" writes a posting. The queue carries ⛔ member data.

/** The staff writes' refusals (the HTTP status is per ROUTE). ⚠ LOCKSTEP with `WORKPLACE_ADMIN_REFUSAL_CODES` (@twt/domain). */
export const WORKPLACE_ADMIN_REFUSAL_CODES = [
  'workplace.not_found',
  'workplace.district_not_found',
  'workplace.district_mismatch',
  'workplace.import_managed',
  'workplace.state_unchanged',
  'workplace.code_taken',
  'workplace.request_not_found',
  'workplace.request_closed',
] as const;
export type WorkplaceAdminRefusalCode = (typeof WORKPLACE_ADMIN_REFUSAL_CODES)[number];

/** The member's answer route's refusals. ⚠ LOCKSTEP with `WORKPLACE_ANSWER_REFUSAL_CODES` (@twt/domain). */
export const WORKPLACE_ANSWER_REFUSAL_CODES = [
  'workplace.request_not_found',
  'workplace.request_closed',
  'workplace.suggestion_stale',
  'workplace.start_date_invalid',
] as const;
export type WorkplaceAnswerRefusalCode = (typeof WORKPLACE_ANSWER_REFUSAL_CODES)[number];

/** The step-up action context of the Super Admin's list writes. */
export const WORKPLACE_MANAGE_STEP_UP_CONTEXT = 'workplace_manage';
/** The step-up action context of the Pariwar Admin's suggest / close. */
export const WORKPLACE_REVIEW_STEP_UP_CONTEXT = 'workplace_review';

const NO_CONTROL = /^[^\p{Cc}]*$/u;
/** A staff-entered name: trimmed, 1–200 code points, ⛔ a control character (the search cursor's bound depends on it). */
const StaffWorkplaceName = z
  .string()
  .trim()
  .min(1)
  .refine((s) => [...s].length <= 200, 'at most 200 characters')
  .refine((s) => NO_CONTROL.test(s), 'no control characters');
const StaffVillage = z
  .string()
  .trim()
  .refine((s) => [...s].length <= 120, 'at most 120 characters')
  .refine((s) => NO_CONTROL.test(s), 'no control characters');

export const WorkplaceSourceWire = z.enum(['import', 'staff']);
export const WorkplaceStatusWire = z.enum(['listed', 'delisted']);

export const ADMIN_WORKPLACES_PAGE_CAP = 100;
/** `GET …/admin/workplaces` — every filter applied IN SQL. */
export const AdminWorkplacesQuery = z
  .object({
    district: District.optional(),
    kind: WorkplaceKindWire.optional(),
    status: WorkplaceStatusWire.optional(),
    q: z.string().max(WORKPLACE_SEARCH_TEXT_MAX_WIRE).optional(),
    limit: z.coerce.number().int().positive().max(ADMIN_WORKPLACES_PAGE_CAP).optional(),
    cursor: Cursor.max(WORKPLACE_SEARCH_CURSOR_MAX).optional(),
  })
  .strict();
export type AdminWorkplacesQuery = z.output<typeof AdminWorkplacesQuery>;

export const AdminWorkplaceWire = z
  .object({
    workplaceId: z.string().uuid(),
    kind: WorkplaceKindWire,
    name: z.string(),
    district: z.string(),
    villageName: z.string().nullable(),
    blockCode: z.string().nullable(),
    udiseSchoolCode: z.string().nullable(),
    source: WorkplaceSourceWire,
    status: WorkplaceStatusWire,
  })
  .strict();
export type AdminWorkplaceWire = z.output<typeof AdminWorkplaceWire>;

export const AdminWorkplacesResponse = z
  .object({ items: z.array(AdminWorkplaceWire), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type AdminWorkplacesResponse = z.output<typeof AdminWorkplacesResponse>;

/** `POST …/admin/workplaces` — ADD an office, or a school the import missed (its UDISE code only for a school). */
export const AdminWorkplaceAddRequest = z
  .object({
    kind: WorkplaceKindWire,
    name: StaffWorkplaceName,
    district: District,
    villageName: StaffVillage.optional(),
    blockCode: z.string().regex(/^[0-9]{6}$/, 'six digits').optional(),
    udiseSchoolCode: z.string().regex(/^[0-9]{11}$/, 'eleven digits').optional(),
  })
  .strict()
  .refine((b) => b.kind === 'school' || b.udiseSchoolCode === undefined, { message: 'only a school has a UDISE code', path: ['udiseSchoolCode'] });
export type AdminWorkplaceAddRequest = z.output<typeof AdminWorkplaceAddRequest>;

/** `POST …/admin/workplaces/:workplaceId/rename`. */
export const AdminWorkplaceRenameRequest = z.object({ name: StaffWorkplaceName }).strict();
export type AdminWorkplaceRenameRequest = z.output<typeof AdminWorkplaceRenameRequest>;

export const AdminWorkplaceWriteResponse = z.object({ workplace: AdminWorkplaceWire }).strict();
export type AdminWorkplaceWriteResponse = z.output<typeof AdminWorkplaceWriteResponse>;

export const WORKPLACE_REQUESTS_PAGE_CAP = 100;
/** `GET …/admin/workplace-requests` — ONE state (`pending` by default), optionally ONE district. */
export const WorkplaceRequestQueueQuery = z
  .object({
    state: z.enum(['pending', 'suggested']).optional(),
    district: District.optional(),
    limit: z.coerce.number().int().positive().max(WORKPLACE_REQUESTS_PAGE_CAP).optional(),
    cursor: Cursor.max(200).optional(),
  })
  .strict();
export type WorkplaceRequestQueueQuery = z.output<typeof WorkplaceRequestQueueQuery>;

/** One request in the queue — ⛔ the member's name, mobile, id or any other member data (a test pins the key set). */
export const WorkplaceRequestQueueItemWire = z
  .object({
    requestId: z.string().uuid(),
    typedName: z.string().nullable(),
    typedPlace: z.string().nullable(),
    district: z.string(),
    startedOn: z.string(),
    createdAt: z.string(),
    state: z.enum(['pending', 'suggested']),
    /** The Pariwar's OTHER pending requests with the same typed name (case- and space-folded). */
    sameNameCount: z.number().int().nonnegative(),
    suggested: z.object({ workplaceId: z.string().uuid(), name: z.string(), district: z.string() }).strict().nullable(),
  })
  .strict();
export type WorkplaceRequestQueueItemWire = z.output<typeof WorkplaceRequestQueueItemWire>;

export const WorkplaceRequestQueueResponse = z
  .object({ items: z.array(WorkplaceRequestQueueItemWire), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type WorkplaceRequestQueueResponse = z.output<typeof WorkplaceRequestQueueResponse>;

/** `POST …/admin/workplace-requests/:requestId/suggest`. */
export const WorkplaceSuggestRequest = z.object({ workplaceId: z.string().uuid() }).strict();
export type WorkplaceSuggestRequest = z.output<typeof WorkplaceSuggestRequest>;

export const WorkplaceRequestWriteResponse = z
  .object({ requestId: z.string().uuid(), state: z.enum(['suggested', 'closed']) })
  .strict();
export type WorkplaceRequestWriteResponse = z.output<typeof WorkplaceRequestWriteResponse>;

/** `POST /api/v1/member/life-events/workplace-requests/:requestId/answer` — requires an `Idempotency-Key` header. */
export const WorkplaceAnswerRequest = z.object({ answer: z.enum(['yes', 'no']) }).strict();
export type WorkplaceAnswerRequest = z.output<typeof WorkplaceAnswerRequest>;

/**
 * The answer's ONE response — the route's 200, what the idempotency store records for BOTH kinds, and what a replay parses.
 * *"Yes"* carries the Life Events summary (the posting route's shape); *"No"* carries nothing more.
 */
export const WorkplaceAnswerResponse = z.discriminatedUnion('answer', [
  z.object({ answer: z.literal('yes'), summary: LifeEventsSummaryResponse }).strict(),
  z.object({ answer: z.literal('no') }).strict(),
]);
export type WorkplaceAnswerResponse = z.output<typeof WorkplaceAnswerResponse>;

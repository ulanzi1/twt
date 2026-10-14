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
/** `GET …/workplaces?district=&kind=&q=&limit=&cursor=` — the picker's server-side search (SW4). */
export const WorkplaceSearchQuery = z
  .object({
    district: District,
    kind: WorkplaceKindWire,
    q: z.string().max(100).optional(),
    limit: z.coerce.number().int().positive().max(WORKPLACE_SEARCH_PAGE_CAP).optional(),
    cursor: Cursor.max(1000).optional(),
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

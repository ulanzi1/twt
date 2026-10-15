// packages/contracts/src/members/known-people.ts
//
// PEOPLE WHO KNOW ME — the member transport DTOs (Story 6.36b, Task 3; 6.36a SW10–SW14; `-310` CF5 A).
//
// Routes (all member-session, per-member rate-limited; every write takes an `Idempotency-Key` but matching):
//   POST /api/v1/member/known-people/contact-matches            — the phone's numbers → the matched POSITIONS
//   POST /api/v1/member/known-people                            — ask one person (201 a new link; 200 the live one)
//   GET  /api/v1/member/known-people                            — the member's list + `freeSlots`
//   POST /api/v1/member/known-people/:linkId/remove             — remove one (the person is ⛔ told)
//   GET  /api/v1/member/known-people/requests                   — the requests naming the member
//   POST /api/v1/member/known-people/requests/:linkId/answer    — "Yes, I know them" / "No"
//   POST /api/v1/member/known-people/requests/:linkId/withdraw  — withdraw an acceptance
//
// ── Contracts discipline ─────────────────────────────────────────────────────────────────────
// Plain primitives + `.strict()`; ⛔ `@twt/domain` import. ⭐ ⛔ NO NUMBER ON ANY RESPONSE, ⛔ a member id: matching returns
// POSITIONS only; a link is addressed by its `linkId`. ⚠ The request schemas use length bounds, ⛔ enums or literals
// on a number field — a Zod enum issue echoes the RECEIVED value into the 400's `details.issues`.

import { z } from 'zod';

import { Cursor } from '../_common/pagination.js';

/** At most this many numbers in ONE matching request (6.36a SW12). ⚠ By-value twin: `CONTACT_MATCH_MAX_NUMBERS`. */
export const KNOWN_PEOPLE_MATCH_MAX_NUMBERS = 1000;
/** Each submitted entry ≤ 32 characters. ⚠ By-value twin: `CONTACT_MATCH_MAX_ENTRY_LENGTH`. */
export const KNOWN_PEOPLE_MATCH_MAX_ENTRY_LENGTH = 32;
/** At most three live named people. ⚠ By-value twin: `KNOWN_PEOPLE_MAX_LIVE`. */
export const KNOWN_PEOPLE_MAX_LIVE_WIRE = 3;

/**
 * `POST …/contact-matches` — the phone's numbers, normalised ON THE PHONE (the server re-normalises each; an entry that
 * does ⛔ not normalise simply does ⛔ not match). 1–1,000 entries; a longer list fails the schema (400).
 */
export const KnownPeopleContactMatchRequest = z
  .object({
    numbers: z.array(z.string().max(KNOWN_PEOPLE_MATCH_MAX_ENTRY_LENGTH)).min(1).max(KNOWN_PEOPLE_MATCH_MAX_NUMBERS),
  })
  .strict();
export type KnownPeopleContactMatchRequest = z.output<typeof KnownPeopleContactMatchRequest>;

/** The POSITIONS (0-based, ascending) of the submitted entries that are an eligible member — ⛔ an id, a name or a count. */
export const KnownPeopleContactMatchResponse = z.object({ matched: z.array(z.number().int().nonnegative()) }).strict();
export type KnownPeopleContactMatchResponse = z.output<typeof KnownPeopleContactMatchResponse>;

/** How the person was found (SW11 / SW13). */
export const KnownPeopleFoundByWire = z.enum(['contacts', 'picker', 'typed']);
export type KnownPeopleFoundByWire = z.output<typeof KnownPeopleFoundByWire>;

/** `POST /api/v1/member/known-people` — ask the member behind `mobile` (⛔ stored). */
export const KnownPersonAskRequest = z
  .object({
    mobile: z.string().min(1).max(KNOWN_PEOPLE_MATCH_MAX_ENTRY_LENGTH),
    foundBy: KnownPeopleFoundByWire,
  })
  .strict();
export type KnownPersonAskRequest = z.output<typeof KnownPersonAskRequest>;

/** What the namer's list shows per link (6.36a SW14). */
export const KnownPersonLabelWire = z.enum(['asked', 'accepted', 'not_accepted', 'unavailable']);
export type KnownPersonLabelWire = z.output<typeof KnownPersonLabelWire>;

/**
 * One link on the NAMER's list. `name` is the named member's registered name (the member-to-member form) ONLY for
 * `accepted` — `null` otherwise (an `asked` link shows the name the member SAVED, kept on the phone; `unavailable` is ⛔
 * named, ⛔ why).
 */
export const KnownPersonView = z
  .object({
    linkId: z.string().uuid(),
    label: KnownPersonLabelWire,
    name: z.string().nullable(),
    askedAt: z.string().datetime(),
  })
  .strict();
export type KnownPersonView = z.output<typeof KnownPersonView>;

/** `POST /api/v1/member/known-people` — the link (201 new; 200 the live one already there). */
export const KnownPersonAskResponse = z.object({ link: KnownPersonView }).strict();
export type KnownPersonAskResponse = z.output<typeof KnownPersonAskResponse>;

/**
 * The two lists' page-size bound. ⚠ By-value twins (held equal by `apps/api/tests/unit/known-people-lockstep.test.ts` and
 * the app's `known-people-requests-pages.test.ts`): the domain's `KNOWN_PEOPLE_HISTORY_LIMIT.cap` /
 * `KNOWN_PEOPLE_REQUESTS_LIMIT.cap`, and the app's `KNOWN_PEOPLE_LIST_HISTORY_LIMIT` (its saved-name prune relies on it).
 */
export const KNOWN_PEOPLE_LIST_LIMIT_MAX = 50;

/**
 * `GET /api/v1/member/known-people?limit=` — the bounded `limit` every list declares (the forced-pagination invariant). On
 * the namer's list it bounds the ENDED links shown (`not_accepted`, newest first); every LIVE link is always listed — at
 * most three — and counted in `freeSlots` (review 2026-10-15 R2).
 */
export const KnownPeopleListQuery = z.object({ limit: z.coerce.number().int().positive().max(KNOWN_PEOPLE_LIST_LIMIT_MAX).optional() }).strict();
export type KnownPeopleListQuery = z.output<typeof KnownPeopleListQuery>;

/** `GET /api/v1/member/known-people` — the namer's list and the free slots (0–3). */
export const MyKnownPeopleResponse = z
  .object({
    items: z.array(KnownPersonView),
    freeSlots: z.number().int().min(0).max(KNOWN_PEOPLE_MAX_LIVE_WIRE),
  })
  .strict();
export type MyKnownPeopleResponse = z.output<typeof MyKnownPeopleResponse>;

/**
 * One request naming the member: `asked` (open — the home card) or `accepted` (kept in the list — the withdraw entry).
 * `name` = the NAMER's registered name (the member-to-member form); `null` when it cannot be resolved.
 */
export const KnownPeopleRequestView = z
  .object({
    linkId: z.string().uuid(),
    state: z.enum(['asked', 'accepted']),
    name: z.string().nullable(),
    askedAt: z.string().datetime(),
  })
  .strict();
export type KnownPeopleRequestView = z.output<typeof KnownPeopleRequestView>;

/**
 * The requests cursor's bound. It carries `[open | accepted, asked_at (µs), link_id]` base64url-encoded — ~110 characters;
 * a contracts test pins a real one under this bound.
 */
export const KNOWN_PEOPLE_REQUESTS_CURSOR_MAX = 200;

/**
 * `GET /api/v1/member/known-people/requests?limit=&cursor=` — page by page (review 2026-10-15 R3: accepted links have ⛔
 * per-member cap, so every one must be reachable for its withdraw control). `cursor` is the previous page's `nextCursor`.
 */
export const KnownPeopleRequestsQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(KNOWN_PEOPLE_LIST_LIMIT_MAX).optional(),
    cursor: Cursor.max(KNOWN_PEOPLE_REQUESTS_CURSOR_MAX).optional(),
  })
  .strict();
export type KnownPeopleRequestsQuery = z.output<typeof KnownPeopleRequestsQuery>;

/** `GET /api/v1/member/known-people/requests` — OPEN asks first (answerable), then accepted ones, each newest first. */
export const KnownPeopleRequestsResponse = z
  .object({ items: z.array(KnownPeopleRequestView), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type KnownPeopleRequestsResponse = z.output<typeof KnownPeopleRequestsResponse>;

/** `POST …/requests/:linkId/answer` — "Yes, I know them" ⇒ `accept`; "No" ⇒ `decline`. */
export const KnownPeopleAnswerRequest = z.object({ answer: z.enum(['accept', 'decline']) }).strict();
export type KnownPeopleAnswerRequest = z.output<typeof KnownPeopleAnswerRequest>;

/** The path parameter of the link routes. */
export const KnownPeopleLinkParams = z.object({ linkId: z.string().uuid() }).strict();
export type KnownPeopleLinkParams = z.output<typeof KnownPeopleLinkParams>;

/** Every link write's result — the link and its new state. */
export const KnownPeopleWriteResponse = z
  .object({
    linkId: z.string().uuid(),
    state: z.enum(['accepted', 'declined', 'removed', 'withdrawn']),
  })
  .strict();
export type KnownPeopleWriteResponse = z.output<typeof KnownPeopleWriteResponse>;

/**
 * The ONE error code per refusal family (AC3–AC10). ⚠ `not_a_member` is ONE code for not-a-member, erased, withdrawn,
 * reported-dead and another Pariwar's (indistinguishable); `not_available` is ONE code for every non-`active` caller.
 */
export const KNOWN_PEOPLE_ERROR_CODES = {
  notAvailable: 'known_people.not_available',
  notAMember: 'known_people.not_a_member',
  self: 'known_people.self',
  limitReached: 'known_people.limit_reached',
  cannotAskNow: 'known_people.cannot_ask_now',
  requestClosed: 'known_people.request_closed',
  notFound: 'known_people.not_found',
  dailyLimit: 'known_people.daily_limit',
  monthlyLimit: 'known_people.monthly_limit',
  busy: 'known_people.busy',
  cursorInvalid: 'known_people.cursor_invalid',
  idempotencyKeyRequired: 'known_people.idempotency_key_required',
  idempotencyInProgress: 'known_people.idempotency_in_progress',
} as const;
export type KnownPeopleErrorCode = (typeof KNOWN_PEOPLE_ERROR_CODES)[keyof typeof KNOWN_PEOPLE_ERROR_CODES];

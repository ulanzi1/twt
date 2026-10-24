// packages/contracts/src/nominee/member-link.ts
//
// A NOMINEE WHO IS ALSO A MEMBER — the transport DTOs (Story 6.36e, Task 3; AC2, AC4; `2026-10-24-396` Q1 A / Q2 A,
// `2026-10-24-397` NE1–NE14).
//
// Routes (all member-session; the answer takes an `Idempotency-Key`):
//   POST /api/v1/member/life-events/nominees                      — the declare: each entry MAY carry a `memberLink`
//   GET  /api/v1/member/life-events/nominee-links                 — the declarer's marks (one per rank at most)
//   GET  /api/v1/member/nominee-links/requests                    — the marks naming the member
//   POST /api/v1/member/nominee-links/requests/:linkId/answer     — "Yes, that's me" / "No, that's not me"
//
// ── Contracts discipline ─────────────────────────────────────────────────────────────────────
// Plain primitives + `.strict()`; ⛔ `@twt/domain` import. ⭐ ⛔ NUMBER ON ANY RESPONSE, ⛔ a member id: a mark is addressed
// by its `linkId`; the server resolves a NEW mark's number to a member (⛔ a member id from the client — NE2). The
// declarer's marks are their OWN read (V5) — `NomineeStatusResponse` is read by the claim flow and stays NON-PII.

import { z } from 'zod';

import { Cursor } from '../_common/pagination.js';
import { MobileNumber } from '../_common/primitives.js';

/** How the nominee-member was found (NE3) — the 6.36b values. */
export const NomineeLinkFoundByWire = z.enum(['contacts', 'picker', 'typed']);
export type NomineeLinkFoundByWire = z.output<typeof NomineeLinkFoundByWire>;

/**
 * One declare entry's mark (NE2): a NEW mark carries the member's NUMBER (the server resolves it — ⛔ stored); a KEEP carries
 * a live link of this declarer (its answer and `asked_at` are carried — the nominee is ⛔ re-asked on a plain re-save). Absent
 * ⇒ the rank carries no mark (a live one on it ENDS). Accepted on the Life Events route ONLY — the signup route answers 400
 * `nominee.link_not_available` (NE4).
 */
export const NomineeMemberLink = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('new'), mobile: MobileNumber, foundBy: NomineeLinkFoundByWire }).strict(),
  z.object({ kind: z.literal('keep'), linkId: z.string().uuid() }).strict(),
]);
export type NomineeMemberLink = z.output<typeof NomineeMemberLink>;

// ── The declarer's marks (AC2) ───────────────────────────────────────────────────────────────

/** What the declarer sees per marked rank (NE6): asked, confirmed, or "said it is not them". */
export const NomineeLinkLabelWire = z.enum(['asked', 'confirmed', 'not_me']);
export type NomineeLinkLabelWire = z.output<typeof NomineeLinkLabelWire>;

/**
 * One LIVE mark on a rank's current version. `name` is the marked member's registered name (the member-to-member form) ONLY
 * when `confirmed` (`-309`) — `null` otherwise, and when it cannot be resolved.
 */
export const NomineeLinkView = z
  .object({
    rank: z.union([z.literal(1), z.literal(2)]),
    linkId: z.string().uuid(),
    label: NomineeLinkLabelWire,
    name: z.string().nullable(),
  })
  .strict();
export type NomineeLinkView = z.output<typeof NomineeLinkView>;

/** `GET /api/v1/member/life-events/nominee-links` — the declarer's marks, rank-ordered (0–2). */
export const NomineeLinksView = z.object({ links: z.array(NomineeLinkView).max(2) }).strict();
export type NomineeLinksView = z.output<typeof NomineeLinksView>;

// ── The marked member's side (AC4) ───────────────────────────────────────────────────────────

/**
 * One mark naming the member: open (`answer: null` — the home card) or answered (kept in the list while it stands). `name` =
 * the DECLARER's registered name (the member-to-member form); `null` when it cannot be resolved.
 */
export const NomineeLinkRequestView = z
  .object({
    linkId: z.string().uuid(),
    answer: z.enum(['confirmed', 'not_me']).nullable(),
    name: z.string().nullable(),
    askedAt: z.string().datetime(),
  })
  .strict();
export type NomineeLinkRequestView = z.output<typeof NomineeLinkRequestView>;

/** The requests page-size bound. ⚠ By-value twin: the domain's `NOMINEE_LINK_REQUESTS_LIMIT.cap`. */
export const NOMINEE_LINK_REQUESTS_LIMIT_MAX = 50;

/**
 * The requests cursor's bound. It carries `[open | answered, asked_at (µs), link_id]` base64url-encoded — ~110 characters; a
 * contracts test pins a real one under this bound.
 */
export const NOMINEE_LINK_REQUESTS_CURSOR_MAX = 200;

/** `GET /api/v1/member/nominee-links/requests?limit=&cursor=` — `cursor` is the previous page's `nextCursor`. */
export const NomineeLinkRequestsQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(NOMINEE_LINK_REQUESTS_LIMIT_MAX).optional(),
    cursor: Cursor.max(NOMINEE_LINK_REQUESTS_CURSOR_MAX).optional(),
  })
  .strict();
export type NomineeLinkRequestsQuery = z.output<typeof NomineeLinkRequestsQuery>;

/** `GET /api/v1/member/nominee-links/requests` — OPEN marks first (answerable), then answered ones, each newest first. */
export const NomineeLinkRequestsResponse = z
  .object({ items: z.array(NomineeLinkRequestView), nextCursor: Cursor.nullable(), hasMore: z.boolean() })
  .strict();
export type NomineeLinkRequestsResponse = z.output<typeof NomineeLinkRequestsResponse>;

/** The path parameter of the answer route. */
export const NomineeLinkParams = z.object({ linkId: z.string().uuid() }).strict();
export type NomineeLinkParams = z.output<typeof NomineeLinkParams>;

/** `POST …/requests/:linkId/answer` — "Yes, that's me" ⇒ `yes`; "No, that's not me" ⇒ `not_me`. ONE answer (NE6). */
export const NomineeLinkAnswerRequest = z.object({ answer: z.enum(['yes', 'not_me']) }).strict();
export type NomineeLinkAnswerRequest = z.output<typeof NomineeLinkAnswerRequest>;

/** The answer's result — the mark and the answer recorded. */
export const NomineeLinkAnswerResponse = z
  .object({ linkId: z.string().uuid(), answer: z.enum(['confirmed', 'not_me']) })
  .strict();
export type NomineeLinkAnswerResponse = z.output<typeof NomineeLinkAnswerResponse>;

/**
 * The ONE error code per refusal family (AC3, AC4). ⚠ `linkNotFound` is ONE code for every unresolvable mark — ⛔ a member,
 * erased, withdrawn, reported dead, another Pariwar's, the declarer — AND for a declarer the caller gate refuses (TR7):
 * indistinguishable. `linkNotAvailable` is the SIGNUP route's answer to any mark (NE4).
 */
export const NOMINEE_LINK_ERROR_CODES = {
  linkNotAvailable: 'nominee.link_not_available',
  linkNotFound: 'nominee.link_not_found',
  linkDuplicate: 'nominee.link_duplicate',
  linkStale: 'nominee.link_stale',
  linkDailyLimit: 'nominee.link_daily_limit',
  notAvailable: 'nominee_link.not_available',
  notFound: 'nominee_link.not_found',
  requestClosed: 'nominee_link.request_closed',
  cursorInvalid: 'nominee_link.cursor_invalid',
  idempotencyKeyRequired: 'nominee_link.idempotency_key_required',
  idempotencyInProgress: 'nominee_link.idempotency_in_progress',
} as const;
export type NomineeLinkErrorCode = (typeof NOMINEE_LINK_ERROR_CODES)[keyof typeof NOMINEE_LINK_ERROR_CODES];

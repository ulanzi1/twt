// Field-worker transport DTOs — Story 13.1 (Task 7; QE9, QE22; AC8).
//
// Pure Zod, `.strict()`, snake_case wire. ⛔ `@twt/domain` import (the bundle boundary).
//
// ── THE REQUEST IS SHAPE-ONLY (QE9) ──────────────────────────────────────────────────────────────
// Types, `.strict()` and GENEROUS max lengths as DoS bounds — ⛔ a copy of the content rules. A Zod failure is 400
// `request.validation`, raised in the validation phase BEFORE the preHandler hooks, so a content rule here would answer an
// unauthenticated caller with 400 instead of 401 / 403 / 404. The CONTENT rules (the name's NFC / length / characters,
// `normalizeMobile`, a LISTED district) run in the handler, after the guards, and answer 422.
// ⚠ `district` is the gate's target (`requirePermissionHook` at `dimension: 'district'`) — compared BYTE FOR BYTE; ⛔ trimmed
// or normalised anywhere (TR12).
//
// ── THE RESPONSE CARRIES NO CODE (QE22) ──────────────────────────────────────────────────────────
// The worker's attribution code is allocated in the same transaction but is read only after approval (Story 13.1a's audited
// read — `FieldWorkerCodeResponse` below, the ONLY schema with a `code` key — and Story 13.1b's SMS) — ⛔ a `code` key, ⛔ any
// name or mobile (I8) in the registration's 201.

import { z } from 'zod';

import { Cursor } from '../_common/pagination.js';
import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import {
  FieldWorkerCodeSmsStatus,
  FieldWorkerEventType,
  FieldWorkerKycStatus,
  FieldWorkerMoveEscalationCause,
  FieldWorkerMoveOpenedAtEnd,
  FieldWorkerMoveRefusalReason,
  FieldWorkerMoveRequestEventType,
  FieldWorkerMoveRequestState,
  FieldWorkerMoveSupersedeCause,
  FieldWorkerNoticeKind,
  FieldWorkerPostReason,
  FieldWorkerReasonCode,
  FieldWorkerState,
  FieldWorkerSuspendReason,
  FieldWorkerTerminateReason,
} from './enums.js';

/** Register a field worker (Idempotency-Key header required). The id is SERVER-minted. */
export const RegisterFieldWorkerRequest = z
  .object({
    /** The worker's name — content-checked in the handler (NFC, trimmed, 1–120 characters). Tier-1 at rest. */
    name: z.string().max(1_000),
    /** The worker's mobile — `normalizeMobile` in the handler (an Indian mobile). Tier-1 at rest. */
    mobile: z.string().max(64),
    /** The REPORTING district — whose District Admin manages the worker (QE17); a LISTED district of the Pariwar. */
    district: z.string().max(200),
  })
  .strict();
export type RegisterFieldWorkerRequest = z.output<typeof RegisterFieldWorkerRequest>;

/** `POST …/field-workers` — 201. The state and KYC status come from the genesis RETURN value (12.2 RB1), ⛔ literals. */
export const RegisterFieldWorkerResponse = z
  .object({
    field_worker_id: UuidString,
    district: z.string(),
    current_state: FieldWorkerState,
    kyc_status: FieldWorkerKycStatus,
  })
  .strict();
export type RegisterFieldWorkerResponse = z.output<typeof RegisterFieldWorkerResponse>;

// ── Story 13.1a — the approval, the by-hand code read, the reads the screens need (AD5) ──────────────────────────────────
// ⛔ A name, a mobile or a code in any schema except where named: the list item carries the decrypted NAME (AD9 — ⛔ a mobile);
// the identity adds the full `mobile`; `FieldWorkerCodeResponse` alone carries the `code` (⛔ `attributionCode` — the reach fence).

/** The path of a per-worker route. */
export const FieldWorkerParams = z.object({ pariwarId: z.string().uuid(), fieldWorkerId: z.string().uuid() }).strict();
export type FieldWorkerParams = z.output<typeof FieldWorkerParams>;

/** `POST …/field-workers/:fieldWorkerId/approve` — the body is `{}` (a bodyless POST is a 400 in Fastify, TR16); Idempotency-Key header. */
export const ApproveFieldWorkerRequest = z.object({}).strict();
export type ApproveFieldWorkerRequest = z.output<typeof ApproveFieldWorkerRequest>;

/** 200 — from the SECOND command's return value (13.1 RB1): `active` / `completed`. */
export const ApproveFieldWorkerResponse = z
  .object({
    field_worker_id: UuidString,
    district: z.string(),
    current_state: FieldWorkerState,
    kyc_status: FieldWorkerKycStatus,
  })
  .strict();
export type ApproveFieldWorkerResponse = z.output<typeof ApproveFieldWorkerResponse>;

/** `GET …/field-workers/:fieldWorkerId/code` — 200, `Cache-Control: no-store`. The key is `code` (AD5). */
export const FieldWorkerCodeResponse = z
  .object({
    field_worker_id: UuidString,
    /** The worker's six-digit attribution code, to be read out to them (AD13). */
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();
export type FieldWorkerCodeResponse = z.output<typeof FieldWorkerCodeResponse>;

/** The NUL character — a Postgres text parameter cannot carry it (22021 ⇒ a 500); built, ⛔ written as an escape. */
const NUL = String.fromCharCode(0);

/**
 * `GET …/field-workers` query (AD5, AC6). `state` REQUIRED; `district` optional — the gate's target, compared byte for byte
 * (⛔ trimmed), a NUL refused here (400 `request.validation`); `limit` 1–25 (default 20 — querystring values are strings,
 * hence `coerce`; `maximum: 25` is what `forced-pagination.spec.ts` reads); `cursor` opaque (decoded strictly in the handler).
 */
export const FieldWorkerListQuery = z
  .object({
    state: FieldWorkerState,
    district: z
      .string()
      .min(1)
      .max(200)
      .refine((d) => !d.includes(NUL), 'district must not contain NUL')
      .optional(),
    cursor: Cursor.optional(),
    limit: z.coerce.number().int().min(1).max(25).optional(),
  })
  .strict();
export type FieldWorkerListQuery = z.output<typeof FieldWorkerListQuery>;

/** One worker in the list — the NAME decrypted for the officer (AD9); ⛔ a mobile. */
export const FieldWorkerListItem = z
  .object({
    field_worker_id: UuidString,
    name: z.string(),
    district: z.string(),
    current_state: FieldWorkerState,
    kyc_status: FieldWorkerKycStatus,
    registered_by_display: z.string(),
    created_at: Iso8601Datetime,
    /** Story 13.1b (AD12) — the code text, as of this read; `null` ⇒ no row (not yet approved, or approved before the story). ⛔ Its detail. */
    code_sms_status: FieldWorkerCodeSmsStatus.nullable(),
  })
  .strict();
export type FieldWorkerListItem = z.output<typeof FieldWorkerListItem>;

/** 200 — a keyset page (`next_cursor` null on the last page), `Cache-Control: no-store`. */
export const FieldWorkerListResponse = z.object({ items: z.array(FieldWorkerListItem), next_cursor: z.string().nullable() }).strict();
export type FieldWorkerListResponse = z.output<typeof FieldWorkerListResponse>;

/** `GET …/field-workers/:fieldWorkerId` — the list item plus the full normalised `mobile` and the approver (`-447` item 2). */
export const FieldWorkerIdentityResponse = FieldWorkerListItem.extend({
  mobile: z.string(),
  approved_by_display: z.string().nullable(),
}).strict();
export type FieldWorkerIdentityResponse = z.output<typeof FieldWorkerIdentityResponse>;

/** `GET …/field-workers/districts` — the Pariwar's RECORDED districts, sorted, exact values; truncated past 200 (AC8). */
export const FieldWorkerDistrictsResponse = z.object({ districts: z.array(z.string()), districts_truncated: z.boolean() }).strict();
export type FieldWorkerDistrictsResponse = z.output<typeof FieldWorkerDistrictsResponse>;

// ── Story 13.1c — move, suspend, reactivate, end, and the worker's log (AD6, AD7) ──────────────────────────────────────────
// SHAPE-only requests (QE9): a reason outside the act's own list, an unknown key or a malformed date is 400 `request.validation`
// in the validation phase; a district that is not LISTED and an `ended_on` outside the IST bounds are the domain's 422s. ⛔ A name,
// a mobile or a code anywhere (I6). Each write takes an `Idempotency-Key` header.

/** A district on the wire: non-empty, ≤ 200, ⛔ a NUL (22021 ⇒ a 500) — compared BYTE FOR BYTE, ⛔ trimmed (TR12). */
const WireDistrict = z
  .string()
  .min(1)
  .max(200)
  .refine((d) => !d.includes(NUL), 'district must not contain NUL');

/** `POST …/:fieldWorkerId/move` — `from_district` is the district the admin's screen SHOWED (13.1 D7: refused 409 if stale). */
export const MoveFieldWorkerRequest = z
  .object({ from_district: WireDistrict, to_district: WireDistrict, reason_code: FieldWorkerPostReason })
  .strict();
export type MoveFieldWorkerRequest = z.output<typeof MoveFieldWorkerRequest>;

/** `POST …/:fieldWorkerId/suspend`. */
export const SuspendFieldWorkerRequest = z.object({ reason_code: FieldWorkerSuspendReason }).strict();
export type SuspendFieldWorkerRequest = z.output<typeof SuspendFieldWorkerRequest>;

/** `POST …/:fieldWorkerId/reactivate` — the body is `{}` (a bodyless POST is a 400 in Fastify, TR5). */
export const ReactivateFieldWorkerRequest = z.object({}).strict();
export type ReactivateFieldWorkerRequest = z.output<typeof ReactivateFieldWorkerRequest>;

/** `POST …/:fieldWorkerId/terminate` — `ended_on` the last day (for `died`, the date of death), `YYYY-MM-DD`; a real date in the IST bounds is the domain's 422. */
export const TerminateFieldWorkerRequest = z
  .object({ reason_code: FieldWorkerTerminateReason, ended_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
  .strict();
export type TerminateFieldWorkerRequest = z.output<typeof TerminateFieldWorkerRequest>;

/** 200 for all four writes — the worker as the act left it. ⛔ A name, a mobile or a code. */
export const FieldWorkerLifecycleResult = z
  .object({
    field_worker_id: UuidString,
    district: z.string(),
    current_state: FieldWorkerState,
    state_reason_code: FieldWorkerReasonCode.nullable(),
    ended_on: z.string().nullable(),
  })
  .strict();
export type FieldWorkerLifecycleResult = z.output<typeof FieldWorkerLifecycleResult>;

/** The log's page cap (AD7) — the domain's `LIST_FIELD_WORKER_EVENTS_MAX_LIMIT`, bound by the contracts sync-guard test (review R2-11). */
export const FIELD_WORKER_LOG_MAX_LIMIT = 100;

/**
 * `GET …/:fieldWorkerId/log` query. `after` — the last `event_version` seen (0 or absent: from the start). `limit` 1–100 (default 50):
 * an OVER-CAP value is CLAMPED to 100 before validation, never an error (AC8) — so the declared `maximum` (what
 * `forced-pagination.spec.ts` reads) is the most a page can hold; a non-integer or a value under 1 is still 400.
 */
export const FieldWorkerLogQuery = z
  .object({
    // `max` = the domain's `Number.isSafeInteger` guard: an `after` above it would reach `listFieldWorkerEvents` as a RangeError, a 500 (review CR8).
    after: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    limit: z
      .preprocess((v) => {
        // EVERY spelling of an over-cap whole number clamps — whatever `Number()` itself reads as one: '1000', '1000.0', '1e3', '+1000',
        // '0x3E8', 'Infinity', and a digit string too long for a double (review CR13). A fraction, zero, a negative, an empty string or
        // text `Number()` cannot read falls through to the strict schema (400).
        const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
        const wholeOrInfinite = typeof n === 'number' && (Number.isInteger(n) || n === Number.POSITIVE_INFINITY);
        return wholeOrInfinite && n > FIELD_WORKER_LOG_MAX_LIMIT ? FIELD_WORKER_LOG_MAX_LIMIT : v;
      }, z.coerce.number().int().min(1).max(FIELD_WORKER_LOG_MAX_LIMIT))
      .optional(),
  })
  .strict();
export type FieldWorkerLogQuery = z.output<typeof FieldWorkerLogQuery>;

/**
 * One event of the worker's stream (AD7). Fields an event does not carry are `null`. `actor.display_name` is the officer's CURRENT
 * name (`null` when none is recorded — ⛔ an email); `role`, `permission_key`, `grant` and `target_district` come from the event's
 * authorization snapshot.
 */
export const FieldWorkerLogItem = z
  .object({
    event_version: z.number().int().positive(),
    event_type: FieldWorkerEventType,
    occurred_at: Iso8601Datetime,
    actor: z.object({ user_id: UuidString.nullable(), display_name: z.string().nullable(), role: z.string().nullable() }).strict(),
    permission_key: z.string().nullable(),
    grant: z.object({ dimension: z.string(), value: z.string().nullable() }).strict().nullable(),
    target_district: z.string().nullable(),
    reason_code: FieldWorkerReasonCode.nullable(),
    from_district: z.string().nullable(),
    to_district: z.string().nullable(),
    ended_on: z.string().nullable(),
  })
  .strict();
export type FieldWorkerLogItem = z.output<typeof FieldWorkerLogItem>;

/** 200 — a page in `event_version` order; `next_after` is the `after` of the next page (`null` on the last). */
export const FieldWorkerLog = z.object({ items: z.array(FieldWorkerLogItem), next_after: z.number().int().nullable() }).strict();
export type FieldWorkerLog = z.output<typeof FieldWorkerLog>;

// ── Story 13.1d — a move request between two District Admins, and the officers' notices (`2026-11-08-458` AD6, AD9, AD10; `-460`) ──
// SHAPE-only requests (QE9). ⛔ A mobile or a code anywhere (I6). The worker's NAME appears ONLY in the list item and the detail's
// `worker` block — both decrypted behind an audit line (AD10; `-460`). The detail's work history carries dates, districts and the
// current state's name — ⛔ a reason, ⛔ an officer's name (`-460` item 1). Each write takes an `Idempotency-Key` header.

/** An over-cap whole-number `limit` is CLAMPED to `max` before validation (the `FieldWorkerLogQuery` shape — AD6), never an error. */
const clampedLimit = (max: number) =>
  z
    .preprocess((v) => {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      const wholeOrInfinite = typeof n === 'number' && (Number.isInteger(n) || n === Number.POSITIVE_INFINITY);
      return wholeOrInfinite && n > max ? max : v;
    }, z.coerce.number().int().min(1).max(max))
    .optional();

/** The page cap of both lists (AD6) — the domain's `PAGE_MOVE_REQUESTS_MAX_LIMIT` / `PAGE_NOTICES_MAX_LIMIT`, bound by the sync-guard. */
export const FIELD_WORKER_MOVE_REQUEST_LIST_MAX_LIMIT = 100;

/** The path of a per-request route. */
export const FieldWorkerMoveRequestParams = z.object({ pariwarId: z.string().uuid(), moveRequestId: z.string().uuid() }).strict();
export type FieldWorkerMoveRequestParams = z.output<typeof FieldWorkerMoveRequestParams>;

/**
 * `POST …/:fieldWorkerId/move-requests` — `from_district` is the worker's district as the screen SHOWED it (a stale one is 409);
 * the officer must hold one of the two ends (the gate's target is the end they hold).
 */
export const OpenFieldWorkerMoveRequestRequest = z.object({ from_district: WireDistrict, to_district: WireDistrict }).strict();
export type OpenFieldWorkerMoveRequestRequest = z.output<typeof OpenFieldWorkerMoveRequestRequest>;

/** `POST …/move-requests/:moveRequestId/{accept,withdraw,close}` — the body is `{}` (a bodyless POST is a 400 in Fastify, TR4). */
export const FieldWorkerMoveRequestActRequest = z.object({}).strict();
export type FieldWorkerMoveRequestActRequest = z.output<typeof FieldWorkerMoveRequestActRequest>;

/** `POST …/move-requests/:moveRequestId/refuse` — a reason from the fixed list (AD7); free text is a 400. */
export const RefuseFieldWorkerMoveRequestRequest = z.object({ reason_code: FieldWorkerMoveRefusalReason }).strict();
export type RefuseFieldWorkerMoveRequestRequest = z.output<typeof RefuseFieldWorkerMoveRequestRequest>;

/** 201 / 200 for every write — the request as the act left it, and the worker's district after it. ⛔ A name. */
export const FieldWorkerMoveRequestResult = z
  .object({
    move_request_id: UuidString,
    field_worker_id: UuidString,
    state: FieldWorkerMoveRequestState,
    from_district: z.string(),
    to_district: z.string(),
    counterpart_district: z.string(),
    /** Where the worker reports after this act — `to_district` after an acceptance, else unchanged. */
    worker_district: z.string(),
  })
  .strict();
export type FieldWorkerMoveRequestResult = z.output<typeof FieldWorkerMoveRequestResult>;

/**
 * `GET …/field-workers/move-requests` query. `state` REQUIRED (`open` | `closed`); `district` optional — a District Admin names one of
 * theirs (the requests with it at EITHER end); with none, the whole Pariwar (a Pariwar grant only). `limit` 1–100 (default 50; an over-cap
 * value is clamped); `cursor` opaque.
 */
export const FieldWorkerMoveRequestListQuery = z
  .object({
    state: z.enum(['open', 'closed']),
    district: WireDistrict.optional(),
    cursor: Cursor.optional(),
    limit: clampedLimit(FIELD_WORKER_MOVE_REQUEST_LIST_MAX_LIMIT),
  })
  .strict();
export type FieldWorkerMoveRequestListQuery = z.output<typeof FieldWorkerMoveRequestListQuery>;

/** One request in a list — the worker's NAME decrypted (AD10, audited a page at a time); the opener's CURRENT display name or null. */
export const FieldWorkerMoveRequestItem = z
  .object({
    move_request_id: UuidString,
    field_worker_id: UuidString,
    name: z.string(),
    from_district: z.string(),
    to_district: z.string(),
    opened_at_end: FieldWorkerMoveOpenedAtEnd,
    counterpart_district: z.string(),
    state: FieldWorkerMoveRequestState,
    refusal_reason: FieldWorkerMoveRefusalReason.nullable(),
    escalation_cause: FieldWorkerMoveEscalationCause.nullable(),
    supersede_cause: FieldWorkerMoveSupersedeCause.nullable(),
    opened_by: UuidString,
    opened_by_display: z.string().nullable(),
    opened_at: Iso8601Datetime,
    answered_at: Iso8601Datetime.nullable(),
  })
  .strict();
export type FieldWorkerMoveRequestItem = z.output<typeof FieldWorkerMoveRequestItem>;

/** 200 — a keyset page (`next_cursor` null on the last), `Cache-Control: no-store`. */
export const FieldWorkerMoveRequestPage = z.object({ items: z.array(FieldWorkerMoveRequestItem), next_cursor: z.string().nullable() }).strict();
export type FieldWorkerMoveRequestPage = z.output<typeof FieldWorkerMoveRequestPage>;

/** An IST calendar day, `YYYY-MM-DD`. */
const IstDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * `-460` — the worker on a request, as one request's detail shows them: the name, the current state's NAME, and a work history of DATES
 * and DISTRICTS (⛔ a reason, ⛔ an officer's name). `members_onboarded` is `null` until Story 13.8 can count it ("Not counted yet").
 */
export const FieldWorkerMoveRequestWorker = z
  .object({
    field_worker_id: UuidString,
    name: z.string(),
    current_state: FieldWorkerState,
    registered_on: IstDay.nullable(),
    active_since: IstDay.nullable(),
    districts: z.array(z.object({ district: z.string(), from: IstDay, to: IstDay.nullable() }).strict()),
    suspensions: z.array(z.object({ from: IstDay, to: IstDay.nullable() }).strict()),
    /** True when the history stopped at its cap. */
    history_truncated: z.boolean(),
    members_onboarded: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type FieldWorkerMoveRequestWorker = z.output<typeof FieldWorkerMoveRequestWorker>;

/** One event of a request's stream — codes only (⛔ an officer's name). */
export const FieldWorkerMoveRequestEvent = z
  .object({
    event_version: z.number().int().positive(),
    event_type: FieldWorkerMoveRequestEventType,
    occurred_at: Iso8601Datetime,
    refusal_reason: FieldWorkerMoveRefusalReason.nullable(),
    cause: z.string().nullable(),
  })
  .strict();
export type FieldWorkerMoveRequestEvent = z.output<typeof FieldWorkerMoveRequestEvent>;

/** `GET …/move-requests/:moveRequestId` — the request, its events in order, and the worker (`-460`; ONE audit line per view). */
export const FieldWorkerMoveRequestDetail = z
  .object({ request: FieldWorkerMoveRequestItem, events: z.array(FieldWorkerMoveRequestEvent), worker: FieldWorkerMoveRequestWorker })
  .strict();
export type FieldWorkerMoveRequestDetail = z.output<typeof FieldWorkerMoveRequestDetail>;

/** `GET …/field-workers/notices` query — the officer's OWN notices; `limit` 1–100 (default 50; clamped); `cursor` opaque. */
export const FieldWorkerNoticeListQuery = z.object({ cursor: Cursor.optional(), limit: clampedLimit(FIELD_WORKER_MOVE_REQUEST_LIST_MAX_LIMIT) }).strict();
export type FieldWorkerNoticeListQuery = z.output<typeof FieldWorkerNoticeListQuery>;

/** One notice — ids, districts and codes (⛔ a name; the screen shows the worker's name only through the audited request reads). */
export const FieldWorkerNoticeItem = z
  .object({
    notice_id: UuidString,
    kind: FieldWorkerNoticeKind,
    field_worker_id: UuidString,
    move_request_id: UuidString.nullable(),
    from_district: z.string(),
    to_district: z.string(),
    refusal_reason: FieldWorkerMoveRefusalReason.nullable(),
    created_at: Iso8601Datetime,
    seen_at: Iso8601Datetime.nullable(),
  })
  .strict();
export type FieldWorkerNoticeItem = z.output<typeof FieldWorkerNoticeItem>;

/** 200 — a keyset page of the officer's own notices, `Cache-Control: no-store`. */
export const FieldWorkerNoticePage = z.object({ items: z.array(FieldWorkerNoticeItem), next_cursor: z.string().nullable() }).strict();
export type FieldWorkerNoticePage = z.output<typeof FieldWorkerNoticePage>;

/** `POST …/field-workers/notices/seen` — 1–100 of the officer's notice ids; another officer's ids are ignored (no error). → 204. */
export const MarkFieldWorkerNoticesSeenRequest = z.object({ notice_ids: z.array(UuidString).min(1).max(100) }).strict();
export type MarkFieldWorkerNoticesSeenRequest = z.output<typeof MarkFieldWorkerNoticesSeenRequest>;

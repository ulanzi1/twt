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
import { FieldWorkerKycStatus, FieldWorkerState } from './enums.js';

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

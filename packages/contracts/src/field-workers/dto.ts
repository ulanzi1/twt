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
// read, Story 13.1b's SMS) — ⛔ a `code` key, ⛔ any name or mobile (I8).

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
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

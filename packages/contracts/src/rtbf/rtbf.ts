// packages/contracts/src/rtbf/rtbf.ts
//
// The member-initiated RTBF (Right-To-Be-Forgotten) transport DTOs (Story 3.12, Task 3) — the
// `POST /api/v1/member/rtbf` confirm request + status response. RTBF anonymizes every member-PII field
// (soft-delete: the member row + history are retained at `state = anonymized`) — FR-96 / DPDPA.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports `encryption` → `node:async_hooks`). So this uses plain primitives + `Iso8601Datetime`.
// ALL objects `.strict()` (the withdrawal/nominee/data-export directory discipline). Match the
// withdrawal/nominee/data-export openapi posture: NO `.openapi()` (keeps `v1.yaml` byte-stable + dodges
// the `encryption → node:async_hooks` barrel import) — the RTBF path is NOT added to v1.yaml.
//
// ── PII discipline (R1 — non-negotiable) ────────────────────────────────────────────────────────────
// RTBF takes NO input (there is nothing to collect — no reason, no free text). The request is an EMPTY
// strict object. The RESPONSE echoes only the terminal `state` + the anonymization instant — it NEVER
// round-trips any cleared PII (that would defeat the entire point). No token, no PII, ever.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * `POST /api/v1/member/rtbf` — confirm RTBF anonymization. RTBF takes NO input (unlike withdrawal,
 * there is no optional reason to collect — the member is exercising a right, not giving feedback). An
 * EMPTY strict object: any stray field is rejected (defense-in-depth against a client leaking data).
 */
export const RtbfConfirmRequest = z.object({}).strict();
export type RtbfConfirmRequest = z.output<typeof RtbfConfirmRequest>;

/**
 * The RTBF confirm response — the terminal `anonymized` state + the anonymization instant the mobile
 * client renders on the dignified "your data has been anonymized" confirmation. `state` is always
 * `anonymized` (the terminal state 3.12 closes at). NO cleared PII is echoed (R1).
 */
export const RtbfStatusResponse = z
  .object({
    state: z.literal('anonymized'),
    anonymizedAt: Iso8601Datetime,
  })
  .strict();
export type RtbfStatusResponse = z.output<typeof RtbfStatusResponse>;

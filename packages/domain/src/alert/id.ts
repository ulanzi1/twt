// Deterministic alert_id (UUIDv5) — Story 8.1 (Task 4; AC2).
//
// `alert_id = deriveAlertId(cycle_id)` — a PURE function of the cycle id, so the
// cycle → alert mapping needs no lookup table and the cycle-open trigger is idempotent
// BY CONSTRUCTION: a redelivered `cycle.frozen` recomputes the identical `alert_id`,
// re-appends the `alert.frozen` genesis, loses the `(stream_id, event_version=0)`
// optimistic-concurrency race, and no-ops (no second alert — AC2). One alert per cycle
// (`alert_id` 1:1 with `cycle_id`); `claim_id`/`pool_index` distinguish the N pools
// WITHIN the alert (architecture's (alert_id, claim_id) → pool_id model).
//
// This is the `derivePoolId` idempotency mechanism reused verbatim (pool/spawn.ts:86-123,
// [[project_pool_spawn_saga_atomicity]]): UUIDv5 = SHA-1 over the pinned namespace bytes
// concatenated with the canonical name, shaped to version 5 + the RFC-4122 variant. The
// only difference is the name (just `cycle_id`, since there is exactly one alert per cycle)
// and the namespace constant.

import { createHash } from 'node:crypto';

import { type AlertId, alertId } from '../ids/index.js';

/**
 * The PINNED namespace UUID for deterministic alert_id derivation. This is part of the
 * alert stream's REPLAY IDENTITY — NEVER change it (a change would make every replayed
 * cycle derive a different alert id, re-routing the (member_id, alert_id) `tr=` binding
 * for already-issued references). Any fixed UUID works as a UUIDv5 namespace; this value
 * is arbitrary but permanent — and DISTINCT from POOL_ID_NAMESPACE_UUID so an alert id
 * and a pool id derived from the same cycle can never collide.
 */
export const ALERT_ID_NAMESPACE_UUID = 'd4f1a7c8-6b23-4e90-9a1f-2c5d8e0b3f47';

const NAMESPACE_BYTES = Buffer.from(ALERT_ID_NAMESPACE_UUID.replace(/-/g, ''), 'hex');

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Derive an alert's id DETERMINISTICALLY as UUIDv5 over the pinned namespace + the
 * canonical `cycle_id`. A redelivery reproduces the identical stream id — no read
 * round-trip, no TOCTOU window. Since `alerts.alert_id` has no DB default (caller-minted),
 * this makes alert_id a pure function of the cycle id, so a re-triggered cycle-open targets
 * the SAME stream (and the genesis version-0 race makes it a no-op). The `alerts.cycle_id`
 * UNIQUE index remains the structural backstop.
 */
export function deriveAlertId(cycleId: string): AlertId {
  const name = Buffer.from(cycleId, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([NAMESPACE_BYTES, name]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  return alertId(bytesToUuid(bytes));
}

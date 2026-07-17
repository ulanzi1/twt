// Cycle event vocabulary + Zod payload schemas — Story 7.3 (Task 2; AC2/AC4).
//
// The `cycle.*` events are the CYCLE-level write vocabulary the pool spawn saga emits on
// the CYCLE stream (stream_id = cycle_id = cycle_freeze_commits.commit_id — there is NO
// `cycles` table; the cycle boundary IS the freeze-commit id). They are DISTINCT from the
// `pool.*` events (events.ts), which live on each pool's own stream (stream_id = pool_id).
//
// ── Why these live under packages/domain/src/pool/ ────────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts)
// imports these schemas. An event-derived-state appender must therefore live at/below
// domain. They sit in the `pool/` module (not a sibling `cycle/`) for TWO reasons: (1) the
// spawn saga (spawn.ts) is the sole emitter and lives here, and (2) the pool-engine CI
// gates walk `packages/domain/src/pool` RECURSIVELY — a sibling `cycle/` directory would
// be silently unscanned (the recurring gate-scope trap). Keeping cycle events in-tree keeps
// them covered with no SCAN_DIRS edit.
//
// ── The atomic commit-point event: cycle.frozen ───────────────────────────────
// `cycle.frozen` is emitted EXACTLY ONCE, at the moment the saga confirms all N child pools
// committed (the last-child-finalizes decision — spawn.ts). It is the single commit-point
// consumers gate on: replaying the cycle stream BEFORE it → the cycle reads unspawned;
// replaying THROUGH it → fully spawned (AC2). Epic 8 consumes it for the cycle-open trigger,
// so the payload shape is a FROZEN downstream contract — extend additively only.
//
// ── cycle.spawn.aborted is RETRYABLE, NOT terminal (load-bearing — ratified) ───
// It records that a GIVEN spawn attempt failed and why — an audit/diagnostic breadcrumb
// (AC4), NOT a terminal cycle state. The cycle stays in its unspawned-but-replay-safe state
// and a subsequent saga run picks up forward (idempotent recovery). A cycle stream may
// therefore carry MULTIPLE `cycle.spawn.aborted` events followed by a successful
// `cycle.frozen` — the expected, healthy shape, not a contradiction. No code path may treat
// its presence as "this cycle can no longer spawn" (contrast a truly terminal event). If a
// cycle reducer is ever authored, `cycle.spawn.aborted` MUST be identity (a no-op on state),
// exactly like the pool reducer's forward-compat default.
//
// `.strict()` everywhere: an unknown key is a defect, not silently tolerated.

import { z } from 'zod';

/**
 * The trustee attestation `cycle.frozen` carries — WHO committed the cycle-freeze that
 * triggered the spawn + when. Sourced server-side from `cycle_freeze_commits` (the durable
 * commit record); NEVER client-supplied. NON-PII controlled-staff attribution (the R5
 * decision-time display snapshot).
 */
export const CycleFreezeAttestationSchema = z
  .object({
    actor_id: z.string().min(1),
    actor_display: z.string().min(1),
    committed_at: z.string().min(1),
  })
  .strict();
export type CycleFreezeAttestation = z.infer<typeof CycleFreezeAttestationSchema>;

/**
 * `cycle.frozen` → the atomic commit-point event (emitted exactly once). Carries the cycle
 * identity, the pool count N, the spawned pools' ids + canonical identifiers (the audit /
 * regulator-traceable set — AC4), and the trustee attestation. `pool_ids` and
 * `pool_canonical_identifiers` MUST each have exactly `pool_count` entries — a mismatch would
 * mean the finalizer's view of the cycle disagrees with N (the invariant Epic 8 relies on).
 */
export const CycleFrozenPayloadSchema = z
  .object({
    cycle_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    // N — the number of pools spawned in this cycle (one per approved claim). Strictly
    // positive: a cycle with no approved claims never triggers a spawn.
    pool_count: z.number().int().positive(),
    // The spawned pools' stream ids, in pool_index order.
    pool_ids: z.array(z.string().uuid()),
    // The spawned pools' `P-YYYY-MM-###` canonical identifiers, in pool_index order.
    pool_canonical_identifiers: z.array(z.string().min(1)),
    attestation: CycleFreezeAttestationSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.pool_ids.length !== v.pool_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pool_ids length ${v.pool_ids.length} must equal pool_count ${v.pool_count}`,
        path: ['pool_ids'],
      });
    }
    if (v.pool_canonical_identifiers.length !== v.pool_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pool_canonical_identifiers length ${v.pool_canonical_identifiers.length} must equal pool_count ${v.pool_count}`,
        path: ['pool_canonical_identifiers'],
      });
    }
  });
export type CycleFrozenPayload = z.infer<typeof CycleFrozenPayloadSchema>;

/**
 * `cycle.spawn.aborted` → a retryable diagnostic breadcrumb (NOT terminal — see the header).
 * Records the cycle + a human-readable `reason` for one failed spawn attempt. NON-PII.
 */
export const CycleSpawnAbortedPayloadSchema = z
  .object({
    cycle_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    reason: z.string().min(1),
  })
  .strict();
export type CycleSpawnAbortedPayload = z.infer<typeof CycleSpawnAbortedPayloadSchema>;

/**
 * `cycle.spawn.started` → the durable "parent job started" marker (AC4). Emitted ONCE, in the
 * SAME transaction as a freshly-computed plan (never on the idempotent-replay path — a parent
 * retry after a failed/never-recorded plan never durably reached this point, so it cannot
 * duplicate this event). Gives AC4's audit trail a queryable element instead of relying on a
 * console line. A cycle stream's expected shape is therefore `cycle.spawn.started`, zero or more
 * `cycle.spawn.aborted`, then `cycle.frozen`.
 */
export const CycleSpawnStartedPayloadSchema = z
  .object({
    cycle_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    // N — the planned pool count (one per approved claim).
    pool_count: z.number().int().positive(),
  })
  .strict();
export type CycleSpawnStartedPayload = z.infer<typeof CycleSpawnStartedPayloadSchema>;

// ── The cycle-event vocabulary + the type→schema map (single source) ──────────

export const CYCLE_EVENT_TYPES = ['cycle.spawn.started', 'cycle.frozen', 'cycle.spawn.aborted'] as const;

/** The dotted `cycle.*` event-type literal union. */
export type CycleEventType = (typeof CYCLE_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the cycle events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the spawn saga (spawn.ts) both consume it. The
 * `satisfies` keeps it exhaustive — adding a `CycleEventType` without a schema is a compile
 * error.
 */
export const CYCLE_EVENT_PAYLOAD_SCHEMAS = {
  'cycle.spawn.started': CycleSpawnStartedPayloadSchema,
  'cycle.frozen': CycleFrozenPayloadSchema,
  'cycle.spawn.aborted': CycleSpawnAbortedPayloadSchema,
} as const satisfies Record<CycleEventType, z.ZodTypeAny>;

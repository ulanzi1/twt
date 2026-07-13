// Pool-spawn TRIGGER port — Story 6.13 (Task 6, AC6 seam; D-E).
//
// The cycle-freeze COMMIT (AC5) fires this hook POST-COMMIT, once, with the committed set — the pool-spawn
// TRIGGER Epic 7's Pool Engine (Stories 7.1/7.2) will consume. At 6.13 it is a SEAM ONLY: production wires
// the console placeholder; tests inject a capturing fake. It carries the durable payload the Epic-7 pool
// binding needs (pariwar_id, commit_id, the frozen {claim_case_id, deceased_member_id} set, the trustee
// attestation) — the `@twt/contracts` `PoolSpawnTriggerPayload`.
//
// ⚠ POST-COMMIT + BEST-EFFORT (AC6, other suggestion #1). The domain `commitCycleFreeze` writer does the
// DB work ONLY; the HANDLER fires this hook AFTER that tx has COMMITTED. A failed/slow trigger must NEVER
// roll back a durably-committed freeze; the `cycle_freeze_commits.trigger_delivered` flag makes the fire
// idempotent + redelivery self-healing. A throw here is swallowed (never fails the committed freeze) — the
// exact `ShepherdAssignedNotificationHook` / channels `dispatch()` seam shape
// ([[project_channels_no_live_dispatch_yet]]). This MUST NOT build or assume a live Pool Engine.
//
// ── ONE definition, the apps/jobs deps graph (the shepherd hook precedent) ──────────────────
// Like the shepherd hook, the port lives in the apps/jobs (pure, apps/api-facing) barrel; the apps/api
// commit handler imports THIS port + the payload type from @twt/contracts. Epic 7 replaces the console
// stub with the real pool-spawn producer.

import type { PoolSpawnTriggerPayload } from '@twt/contracts';

/** The injectable pool-spawn trigger seam (a sibling of `ShepherdAssignedNotificationHook`). Fired
 *  post-commit, best-effort; MAY be async (the handler awaits it, but swallows any rejection). */
export type PoolSpawnTrigger = (payload: PoolSpawnTriggerPayload) => void | Promise<void>;

/**
 * The default inert trigger: one structured `console.info` line (the `consoleShepherdAssignedNotificationHook`
 * analogue). Used in production/dev wiring until Epic 7 replaces it with the real pool-spawn producer;
 * tests inject a capturing fake. NON-PII coordinates only (the member-id join key the pool binding needs).
 * Never throws.
 */
export const consolePoolSpawnTrigger: PoolSpawnTrigger = (payload) => {
  try {
    console.info(
      '[pool-spawn-trigger]',
      JSON.stringify({
        pariwarId: payload.pariwar_id,
        commitId: payload.commit_id,
        frozenClaimCount: payload.frozen_claims.length,
        attestationActorId: payload.attestation.actor_id,
      }),
    );
  } catch {
    // A best-effort trigger seam must never take down the committed freeze path.
  }
};

/** A capturing fake for tests — records every fired payload; never throws. */
export interface CapturingPoolSpawnTrigger {
  readonly trigger: PoolSpawnTrigger;
  readonly payloads: PoolSpawnTriggerPayload[];
}

export function createCapturingPoolSpawnTrigger(): CapturingPoolSpawnTrigger {
  const payloads: PoolSpawnTriggerPayload[] = [];
  return {
    payloads,
    trigger: (payload) => {
      payloads.push(payload);
    },
  };
}

/** A throwing fake for tests — asserts the handler swallows a trigger failure without rolling back the
 *  committed freeze (AC6). Never used in production. */
export function createThrowingPoolSpawnTrigger(): PoolSpawnTrigger {
  return () => {
    throw new Error('[pool-spawn-trigger] simulated trigger failure');
  };
}

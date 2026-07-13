// packages/contracts/src/pools/pool-spawn-trigger.ts
//
// The pool-spawn TRIGGER SEAM — Story 6.13 (Task 1; AC6, D-E). The FIRST contract to land in
// `packages/contracts/src/pools/` (the directory was README + .gitkeep only; substantive Pool-Engine
// contracts land at Epic 7 Stories 7.1/7.2/7.3+). This is the injectable seam the cycle-freeze COMMIT
// (AC5) fires POST-COMMIT, once, with the committed set — the pool-spawn TRIGGER Epic 7's Pool Engine
// will consume. Like the channels `dispatch()` seam, the trigger is AUTHORED + EMITTED here with NO live
// consumer yet ([[project_channels_no_live_dispatch_yet]]).
//
// ── The seam discipline (mirrors ShepherdAssignedNotificationHook / dispatch()) ─────────────
// The CONTRACT (this payload) lives here; the injectable PORT (the `PoolSpawnTrigger` function type +
// the console stub + the capturing fake) lives in apps/jobs (the assignment-side deps graph, exactly the
// shepherd hook shape). The commit HANDLER imports the port from @twt/jobs and this payload type from
// @twt/contracts. NO live Pool Engine, state machine, or snapshot surface is built or assumed here.
//
// ── Contracts discipline (the claims/* precedent) ───────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). All `.strict()`. This
// is an INTERNAL seam (no HTTP endpoint) → NO `.openapi()` registration; openapi/v1.yaml stays
// byte-identical (the same posture as notifications/ + alerts/ seams).

import { z } from 'zod';

/** ONE frozen claim in the committed set — the claim's stream id + the deceased member it is filed against
 *  (the pool-binding join key Epic 7 needs). NON-PII coordinates only. */
export const FrozenClaimRef = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
  })
  .strict();
export type FrozenClaimRef = z.output<typeof FrozenClaimRef>;

/** The trustee attestation the commit carries (who committed the freeze + when). `actor_display` is the
 *  R5 decision-time SNAPSHOT (server-resolved, never client-supplied). NON-PII controlled-staff attribution. */
export const TrusteeAttestation = z
  .object({
    actor_id: z.string(),
    actor_display: z.string(),
    committed_at: z.string(),
  })
  .strict();
export type TrusteeAttestation = z.output<typeof TrusteeAttestation>;

/**
 * The pool-spawn trigger payload (AC6). Carried ONCE, post-commit, from the cycle-freeze COMMIT to the
 * (v1: stub) `PoolSpawnTrigger` port: the tenant, the durable `commit_id` (the idempotency + handoff
 * anchor), the frozen `{claim_case_id, deceased_member_id}` set, and the trustee attestation. NON-PII
 * only — no deceased/nominee PII beyond the member-id join key the pool binding needs. All `.strict()`.
 */
export const PoolSpawnTriggerPayload = z
  .object({
    pariwar_id: z.string().uuid(),
    commit_id: z.string().uuid(),
    frozen_claims: z.array(FrozenClaimRef),
    attestation: TrusteeAttestation,
  })
  .strict();
export type PoolSpawnTriggerPayload = z.output<typeof PoolSpawnTriggerPayload>;

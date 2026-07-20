// packages/contracts/src/pool-onboarding/tutorial.ts
//
// Transport contract for the member pool-engine onboarding-tutorial outcome event — Story 7.10
// (Task 5; AC4). ONE member-session-gated endpoint:
//   · POST /api/v1/member/pool-onboarding-tutorial — record the member-level completion/skip outcome.
//
// The outcome is recorded server-side as a member-level action via the audit log (D1 — NOT the
// events_log stream) so analytics can query it; completion and skip are DISTINCT outcomes. The client
// fires this best-effort / fire-and-forget — the app's MMKV flag is the authoritative first-entry
// suppressor, so a failed POST never blocks the tutorial's dismissal nor re-shows it. The route returns
// 204 (no body); this file carries only the request shape. A contracts SOURCE file MUST NOT import
// `@twt/domain` (browser-bundle rule) — plain `z` only. ALL objects `.strict()`.

import { z } from 'zod';

/** The two distinct tutorial outcomes (AC4). `completed` = finished on Screen 3; `skipped` = confirmed skip. */
export const PoolOnboardingOutcomeSchema = z.enum(['completed', 'skipped']);
export type PoolOnboardingOutcomeSchema = z.output<typeof PoolOnboardingOutcomeSchema>;

/** POST /api/v1/member/pool-onboarding-tutorial request body — the recorded outcome. */
export const PoolOnboardingOutcomeRequest = z
  .object({
    outcome: PoolOnboardingOutcomeSchema,
  })
  .strict();
export type PoolOnboardingOutcomeRequest = z.output<typeof PoolOnboardingOutcomeRequest>;

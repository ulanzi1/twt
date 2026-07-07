// Degraded-mode composition read-seam — Story 5.8 (Task 5; AC5).
//
// The thin READ-seam the (future) live fan-out feeds into `evaluateDegradedModeBridge` (the `@twt/channels`
// pure primitive): does an active degraded-mode declaration exist for the Pariwar at instant `at`? This is a
// BUILDING BLOCK ONLY — there is still NO live `dispatch` call site ([[project_channels_no_live_dispatch_yet]]),
// and this does NOT construct a live fan-out that calls `evaluateDegradedModeBridge` + `dispatch` together.
// Whoever wires the live fan-out (the story that first drives a real dispatch) composes this ahead of
// `evaluateCostOptimization` and, when bridged, force-sends SMS + skips cost-suppression for that alert. This
// is app-composition wiring, NOT a change to `dispatch` / the frozen `ChannelProvider` port /
// `CANONICAL_CHANNEL_LADDER` / `DeliveryResolver`.

import { degradedMode, type Db } from '@twt/domain';
import type { ids } from '@twt/domain';

type PariwarId = ids.PariwarId;

/** What the degraded-mode read-seam needs: a scoped Db (the declaration read runs under RLS). */
export interface DegradedModeCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the active-declaration read. */
  readonly db: Db;
}

/**
 * Resolve whether degraded mode is ACTIVE for a Pariwar at instant `at` (Story 5.8 AC5) — a thin wrapper
 * over the pure-domain `getActiveDegradedMode` accessor, reduced to a boolean (the shape
 * `evaluateDegradedModeBridge` injects as `degradedModeActive`). RLS scopes the read to the Pariwar. Returns
 * `false` when there is no active declaration (⇒ the bridge does not fire; the normal ladder + cost-opt
 * apply).
 *
 * ── Frozen-shape discipline ([[project_channels_no_live_dispatch_yet]]) ──────────────────────────────────
 * A reusable composition READ — it does NOT modify `DeliveryResolver` / `dispatch` / `ChannelProvider` /
 * `CANONICAL_CHANNEL_LADDER`, and there is still NO live `dispatch` call site.
 */
export async function resolveDegradedModeActive(
  deps: DegradedModeCompositionDeps,
  pariwarId: PariwarId,
  at: Date,
): Promise<boolean> {
  const active = await degradedMode.getActiveDegradedMode(deps.db, pariwarId, at);
  return active !== null;
}

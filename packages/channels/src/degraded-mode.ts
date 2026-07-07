// Pariwar-degraded-mode cycle-open SMS bridge — the pure bypass-decision primitive (Story 5.8, AC2).
//
// dispatch.ts explicitly RESERVES the degraded-mode SMS bridge as an EXTERNAL WRAPPER (dispatch.ts L4-7):
// "cost-optimization (5.7) and the degraded-mode SMS bridge (5.8) WRAP `dispatch`, they do not live inside
// it." This module honours that to the letter — it is a pure, deterministically-testable decision function
// that returns a BRIDGE decision. It is the SIBLING of Story 5.7's `cost-optimization.ts` POLICY primitive:
// 5.7 SUPPRESSES the paid channels on recent engagement; 5.8 FORCES SMS for cycle-open under degraded mode
// — and 5.8 WINS over 5.7's suppression when both apply to a cycle-open alert. It does NOT change `dispatch`
// / `ChannelProvider` / `CANONICAL_CHANNEL_LADDER` / `DeliveryResolver` / `render.ts`, does NOT repurpose
// the frozen `LifecycleSuppressionHook` (a DISTINCT member-state/frozen-account boundary), and introduces
// NO live `dispatch` call site ([[project_channels_no_live_dispatch_yet]]) — the (future) live fan-out
// drives it (force-send SMS + skip cost-suppression for cycle-open) at the site that first drives a real
// `dispatch` fan-out.
//
// ── Direct-to-SMS bridge: cycle-open ONLY (the AR-20 carve-out) ──────────────────────────────────────────
// When BRIDGED, SMS is force-sent to EVERY eligible member regardless of in-app engagement AND regardless of
// the normal channel-tier fallback ladder — it does NOT wait for push/WA to fail (that is the whole point of
// a "bridge" during infrastructure degradation). The bridged `channels` are EXACTLY `['sms']`
// (`DEGRADED_MODE_BRIDGE_CHANNELS`). This is the AR-20 cycle-open + time-critical carve-out to RA-29's "no
// bulk SMS" — narrow to cycle-open (`alert_published`) under an explicit trustee declaration. It is DISTINCT
// from bulk-alert SMS (banned per RA-29) — do NOT widen it to other categories or make it a general
// bulk-SMS path. The primitive never re-sequences `CANONICAL_CHANNEL_LADDER` and never changes `dispatch`'s
// public shape.
//
// ── Composition with cost-optimization (5.7) is a FUTURE-fan-out concern (AC5) ──────────────────────────
// The future live fan-out composes this primitive AHEAD of `evaluateCostOptimization`: when
// `evaluateDegradedModeBridge` returns `bridged: true`, that fan-out bypasses cost-optimization suppression
// for that alert (epics.md L4272). This module does NOT perform that composition and does NOT invoke either
// primitive — it MUST NOT import or call `evaluateCostOptimization`, and owns NO ordering between them. Both
// stay pure and independently testable. The only obligation here is that the primitive's SHAPE (a standalone
// `bridged` decision) lets the future fan-out sequence them; wiring that sequence is the live-fan-out story's
// job.

import type { AlertCategory } from '@twt/contracts';
import type { Channel } from './provider.js';

/**
 * Cycle-open maps to the `alert_published` category (per the AC + alerts/alert.ts enum) — the broadcast /
 * announcement category `dispatch.ts` already treats as the cycle-open trigger. The bridge keys on it.
 */
export const CYCLE_OPEN_CATEGORY = 'alert_published' as const;

/**
 * The bridged channel set: EXACTLY `['sms']`. A `const` tuple so the direct-to-SMS target is statically
 * visible. The bridge bypasses BOTH cost-opt suppression AND the normal tier ladder — it never fans out to
 * push / WA / telegram (those are the normal ladder's job).
 */
export const DEGRADED_MODE_BRIDGE_CHANNELS = ['sms'] as const;

/**
 * The reason a cycle-open alert was NOT bridged — a machine-readable code so the audit / observability layer
 * can attribute WHY the bridge did (not) fire.
 *   · `no_active_declaration`   — no active degraded-mode declaration for the Pariwar (the fail-safe default).
 *   · `category_not_cycle_open` — the alert is not a cycle-open (`alert_published`) alert.
 */
export type DegradedModeNonBridgeReason = 'no_active_declaration' | 'category_not_cycle_open';

/** The reason a cycle-open alert WAS bridged to SMS. */
export type DegradedModeBridgeReason = 'degraded_mode_cycle_open';

/** The inputs to the pure decision (AC2) — every impure value is INJECTED (no clock / DB / IO of its own). */
export interface DegradedModeBridgeInput {
  /** The alert's category (only cycle-open = `alert_published` bridges). */
  readonly category: AlertCategory;
  /**
   * Whether an active degraded-mode declaration exists for the Pariwar — resolved by the composition seam
   * (`resolveDegradedModeActive`), exactly as 5.7 injects `toggleEnabled`. The primitive never reads the DB.
   */
  readonly degradedModeActive: boolean;
}

/**
 * The decision the primitive returns. Either NOT bridged (carrying a machine-readable non-bridge `reason`),
 * or bridged (carrying the exact direct-to-SMS `channels` + the bridge `reason`). Discriminated on `bridged`
 * (mirror `CostOptimizationDecision`).
 */
export type DegradedModeBridgeDecision =
  | { readonly bridged: false; readonly reason: DegradedModeNonBridgeReason }
  | {
      readonly bridged: true;
      readonly channels: readonly Channel[];
      readonly reason: DegradedModeBridgeReason;
    };

/**
 * Evaluate the degraded-mode cycle-open SMS-bridge decision — a PURE function (AC2).
 *
 * ── Decision order (LOAD-BEARING) ────────────────────────────────────────────────────────────────────────
 *   1. `!degradedModeActive`            → NOT bridged (`no_active_declaration`). The fail-safe default:
 *                                         without an active declaration the normal ladder + cost-opt apply.
 *   2. `category !== 'alert_published'` → NOT bridged (`category_not_cycle_open`). The bridge is the
 *                                         cycle-open-ONLY carve-out (RA-29): it never widens to other
 *                                         categories.
 *      otherwise                        → BRIDGE to SMS (`DEGRADED_MODE_BRIDGE_CHANNELS`).
 */
export function evaluateDegradedModeBridge(
  input: DegradedModeBridgeInput,
): DegradedModeBridgeDecision {
  // (1) No active degraded-mode declaration — the fail-safe default (the normal ladder + cost-opt apply).
  if (!input.degradedModeActive) {
    return { bridged: false, reason: 'no_active_declaration' };
  }
  // (2) Only cycle-open (`alert_published`) bridges — the AR-20 carve-out, never a general bulk-SMS path.
  if (input.category !== CYCLE_OPEN_CATEGORY) {
    return { bridged: false, reason: 'category_not_cycle_open' };
  }
  // Active declaration + cycle-open — bridge direct to SMS (bypasses cost-opt suppression AND the tier ladder).
  return {
    bridged: true,
    channels: [...DEGRADED_MODE_BRIDGE_CHANNELS],
    reason: 'degraded_mode_cycle_open',
  };
}

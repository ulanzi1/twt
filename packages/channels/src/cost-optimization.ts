// In-app-engagement cost-optimization policy primitive — Story 5.7 (AC1, AC2, AC3, AC5).
//
// dispatch.ts explicitly RESERVES cost-optimization as an EXTERNAL WRAPPER (dispatch.ts L4-7, L14-17):
// "cost-optimization (5.7) and the degraded-mode SMS bridge (5.8) WRAP `dispatch`, they do not live inside
// it." This module honours that to the letter — it is a pure, deterministically-testable POLICY primitive
// that returns a suppression DECISION. It is the POLICY sibling of Story 5.6's `cascade.ts` RETRY primitive:
// both WRAP the dispatch seam, neither lives inside it. It does NOT change `dispatch` / `ChannelProvider` /
// `CANONICAL_CHANNEL_LADDER` / `DeliveryResolver` / `render.ts`, does NOT repurpose the frozen
// `LifecycleSuppressionHook` (a DISTINCT member-state/frozen-account boundary), and introduces NO live
// `dispatch` call site ([[project_channels_no_live_dispatch_yet]]) — the (future) live fan-out drives it by
// omitting the suppressed cost-channels' targets, at the site that first drives a real `dispatch` fan-out.
//
// ── What it provides ───────────────────────────────────────────────────────────────────────────────────
//   (a) A PURE decision function `evaluateCostOptimization(input)` — every impure input (`now`, the toggle,
//       the engagement timestamp, the per-category window override) is INJECTED; the function has no clock /
//       DB / IO of its own (mirrors cascade.ts's injected sleep). Given the toggle ON, a non-time-critical
//       alert, and a member whose last in-app engagement is WITHIN the category's staleness window, it
//       suppresses the two PAID cost channels; otherwise it does NOT suppress (full delivery).
//   (b) The per-category staleness-window config (a static typed `const` map + a reader) — mirror
//       sms-dlt-registry.ts's per-`AlertCategory` const-map shape.
//   (c) A PII-free suppression-reason record + a best-effort audit-emit helper (`auditCostSuppression`) that
//       writes ONE audit line via the frozen `AuditPort`.
//
// ── Suppressed channels: the two PAID cost channels ONLY ─────────────────────────────────────────────────
// Suppression targets EXACTLY `['whatsapp', 'sms']` (the `COST_OPTIMIZED_CHANNELS` tuple). IN-APP PUSH IS
// NEVER SUPPRESSED — the policy "suppresses WA and SMS while still firing in-app push" (push is free +
// universal, RA-29). The Telegram side-channel is a FREE fire-and-forget mirror out of the ladder — never a
// cost-optimization target (mirror cascade.ts's "Telegram is INDEPENDENT" carve-out). The primitive never
// re-sequences `CANONICAL_CHANNEL_LADDER` and never changes `dispatch`'s public shape.
//
// ── The four spec tensions this v1 resolves (architecture §3.4 vs epic AC) ───────────────────────────────
//   1. Engagement signal — architecture's ideal is per-notification engagement; no read-receipt substrate
//      exists yet, so v1 pins the coarse app-open proxy (`member_device_tokens.last_seen_at`, arch §3.4
//      L1911-1913). Per-notification engagement is a later refinement (deferred-work.md).
//   2. Suppressed channels — the epic AC ("suppresses WA and SMS") is the committed acceptance surface;
//      architecture prose's singular "WA" is illustrative shorthand for "the paid cost channels" (SMS is the
//      MORE expensive channel). v1 suppresses BOTH.
//   3. Default window — 6 HOURS (architecture §3.4 L2080, committed + "tunable in Category 5 Observability");
//      the epic's illustrative "30 min" maps to the `deadline_reminder` per-category override.
//   4. Toggle wiring — the per-Pariwar FR-58C flag subsystem lands at Epic 10; here the toggle is an INPUT
//      the composition seam resolves (default OFF = fail-safe: suppress nothing ⇒ full reach).

import { canonicalJsonStringify } from '@twt/domain';

import { sha256Hex, type AuditPort } from './audit.js';
import type { AlertCategory } from '@twt/contracts';
import type { Channel } from './provider.js';

/**
 * The two PAID cost channels the policy may suppress (AC1 #2). Push is NEVER in this tuple (free + universal
 * — always fires); Telegram is NEVER in it (free fire-and-forget mirror, out of the ladder — independent,
 * exactly as the cascade leaves it). A `const` tuple so the suppressed set is statically visible.
 */
export const COST_OPTIMIZED_CHANNELS = ['whatsapp', 'sms'] as const;

/**
 * The DEFAULT staleness window: 6 HOURS. This is the ARCHITECTURE-COMMITTED value (architecture.md §3.4
 * L2080: "within the optimization staleness window (default 6 hours; tunable in Category 5 Observability)").
 * Plain milliseconds so a later durable/observability config adapter is thin (mirror cascade.ts's plain
 * backoff numbers).
 */
export const DEFAULT_STALENESS_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Per-category staleness-window OVERRIDES (AC2). Encodes the epic's intent — "shorter for `deadline_reminder`,
 * longer for `contribution_confirmed`" (epics.md L2213): `deadline_reminder` = the epic's illustrative 30 min
 * (a near-term nudge decays fast); `contribution_confirmed` = longer (a receipt stays relevant for a day).
 *
 * These per-category VALUES are a v1 PRODUCT-POLICY DEFAULT, NOT an architecture mandate (exactly like Story
 * 5.6's DLT-registry category set) — tunable via Category 5 Observability. The reader (`stalenessWindowFor`)
 * and the primitive both take an injectable override map so a later config source overrides them WITHOUT
 * editing this primitive. A category with no explicit override falls back to `DEFAULT_STALENESS_WINDOW_MS`.
 * Typed as a partial map over the full 9-value `AlertCategory` enum so the absence of an override is static.
 */
export const STALENESS_WINDOW_BY_CATEGORY: Readonly<Partial<Record<AlertCategory, number>>> = {
  deadline_reminder: 30 * 60 * 1000, // 30 min — shorter (a near-term deadline nudge decays fast).
  contribution_confirmed: 12 * 60 * 60 * 1000, // 12 h — longer (a contribution receipt stays relevant).
};

/**
 * Resolve the staleness window (ms) for a category: the per-category override if present, else the 6-hour
 * default. `overrides` defaults to `STALENESS_WINDOW_BY_CATEGORY` but is injectable (a later config source
 * passes its own map — the map REPLACES the default, mirroring how cascade.ts's `backoffMs` replaces its
 * default schedule).
 */
export function stalenessWindowFor(
  category: AlertCategory,
  overrides: Readonly<Partial<Record<AlertCategory, number>>> = STALENESS_WINDOW_BY_CATEGORY,
): number {
  return overrides[category] ?? DEFAULT_STALENESS_WINDOW_MS;
}

/**
 * The reason a NON-time-critical alert was NOT cost-suppressed — a machine-readable code so the audit /
 * observability layer can attribute WHY a member got the full paid fan-out.
 *   · `time_critical`        — the alert bypassed suppression (the AR-18 override; checked FIRST).
 *   · `toggle_off`           — the per-Pariwar cost-optimization toggle is OFF (the fail-safe default).
 *   · `no_engagement_signal` — the member has no last-engagement timestamp (fail toward reach).
 *   · `no_recent_engagement` — the member's last engagement is OUTSIDE the window (or clock-skew future).
 */
export type CostNonSuppressionReason =
  | 'time_critical'
  | 'toggle_off'
  | 'no_engagement_signal'
  | 'no_recent_engagement';

/**
 * The PII-FREE suppression-reason record (AC5) — the substrate the audit line + a later cost-attribution /
 * behavioral-analysis read consume to examine whether the policy is well-calibrated. Timestamps + category +
 * config numbers ONLY — NEVER a mobile / name / device token / rendered message (same posture as the
 * dispatch line's ID-only payload digest; no `hashRendered` — no member-facing content is rendered here).
 */
export interface CostSuppressionReason {
  /** The alert category whose window governed the decision. */
  readonly category: AlertCategory;
  /** The member's last in-app-engagement timestamp (ISO-8601) that fell within the window. */
  readonly lastEngagementAt: string;
  /** The staleness window (ms) applied for the category. */
  readonly stalenessWindowMs: number;
  /** The computed age `now − lastEngagementAt` (ms) — inside the window ⇒ suppressed. */
  readonly ageMs: number;
}

/** The inputs to the pure decision (AC1) — every impure value is INJECTED (no clock / DB / IO of its own). */
export interface CostOptimizationInput {
  /** The alert's category (keys the per-category window). */
  readonly category: AlertCategory;
  /** `alert.time_critical` — the AR-18 override; when true, suppression is bypassed entirely (checked FIRST). */
  readonly timeCritical: boolean;
  /** The per-Pariwar cost-optimization toggle state (FR-58C-gated; resolved by the composition seam). */
  readonly toggleEnabled: boolean;
  /** The member's last in-app-engagement timestamp, or `null` when there is no engagement signal. */
  readonly lastEngagementAt: Date | null;
  /** The evaluation instant — INJECTED (tests pass a fixed `Date`; never a real clock in the primitive). */
  readonly now: Date;
  /** Optional per-category window override map (a later config source injects its own; defaults applied otherwise). */
  readonly windowMsByCategory?: Readonly<Partial<Record<AlertCategory, number>>>;
}

/**
 * The decision the primitive returns. Either NOT suppressed (full delivery — carrying a machine-readable
 * non-suppression `reason`), or suppressed (carrying the exact suppressed cost `channels` + the PII-free
 * `CostSuppressionReason` record).
 */
export type CostOptimizationDecision =
  | { readonly suppressed: false; readonly reason: CostNonSuppressionReason }
  | { readonly suppressed: true; readonly channels: readonly Channel[]; readonly reason: CostSuppressionReason };

/**
 * Evaluate the cost-optimization suppression decision — a PURE function (AC1, AC2, AC3).
 *
 * ── Decision order (LOAD-BEARING — AC3: time-critical can never be cost-suppressed) ──────────────────────
 *   1. `timeCritical`            → NOT suppressed (`time_critical`). Checked FIRST so no combination of
 *                                  toggle/engagement state can ever cost-suppress a time-critical alert.
 *   2. `!toggleEnabled`          → NOT suppressed (`toggle_off`). OFF is the fail-safe: suppress nothing.
 *   3. `lastEngagementAt == null`→ NOT suppressed (`no_engagement_signal`). No signal ⇒ fail toward reach.
 *   4. `ageMs = now − lastEngagementAt`; if `ageMs` is `NaN` (an invalid Date) OR `ageMs < 0` (clock-skew
 *                                  future stamp) OR `ageMs > window` → NOT suppressed (`no_recent_engagement`).
 *                                  At the EXACT boundary (`ageMs === window`) ⇒ suppress (window is inclusive).
 *      otherwise                  → SUPPRESS the two paid cost channels (`COST_OPTIMIZED_CHANNELS`).
 */
export function evaluateCostOptimization(input: CostOptimizationInput): CostOptimizationDecision {
  // (1) The AR-18 time-critical override — bypass suppression entirely, before any toggle/window check.
  if (input.timeCritical) {
    return { suppressed: false, reason: 'time_critical' };
  }
  // (2) The per-Pariwar toggle is OFF — the fail-safe default (suppress nothing ⇒ full reach).
  if (!input.toggleEnabled) {
    return { suppressed: false, reason: 'toggle_off' };
  }
  // (3) No engagement signal — never suppress a member we have no app-open timestamp for (fail toward reach).
  if (input.lastEngagementAt == null) {
    return { suppressed: false, reason: 'no_engagement_signal' };
  }

  // (4) Compare the engagement age against the category's window.
  const window = stalenessWindowFor(input.category, input.windowMsByCategory);
  const ageMs = input.now.getTime() - input.lastEngagementAt.getTime();
  // A future-dated engagement stamp (`ageMs < 0`, clock skew) or an invalid Date (`ageMs` is `NaN`) must
  // NEVER suppress; an out-of-window one (`ageMs > window`) likewise means the member has not engaged
  // recently ⇒ full delivery.
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > window) {
    return { suppressed: false, reason: 'no_recent_engagement' };
  }

  // Recent in-app engagement within the window — suppress the two PAID cost channels (push always fires).
  return {
    suppressed: true,
    channels: [...COST_OPTIMIZED_CHANNELS],
    reason: {
      category: input.category,
      lastEngagementAt: input.lastEngagementAt.toISOString(),
      stalenessWindowMs: window,
      ageMs,
    },
  };
}

/** The identifiers a suppression audit line carries alongside its PII-free `CostSuppressionReason`. */
export interface CostSuppressionAuditInput {
  /** Tenant scope (UUID). */
  readonly pariwarId: string;
  /** The suppressed member (UUID — non-PII; a raw mobile/name/token is NOT). */
  readonly memberId: string;
  /** The alert whose paid fan-out was suppressed (UUID — also the trace id). */
  readonly alertId: string;
  /** The PII-free reason record (category + timestamps + config numbers). */
  readonly reason: CostSuppressionReason;
}

/**
 * Emit ONE cost-suppression audit line via the frozen `AuditPort` (AC5) — BEST-EFFORT: an audit-write
 * failure NEVER poisons the caller (mirror dispatch.ts's `auditBestEffort`; `createAuditPort` also swallows,
 * this try/catch additionally guards a raw throwing port). Carries the category, the member's last-engagement
 * timestamp, the staleness window, and the computed age — all NON-PII (ids + timestamps + config numbers, the
 * same ID-only posture as the dispatch line; no `hashRendered` — nothing member-facing is rendered here).
 *
 * ── `AuditEntryInput` shape discipline (get it right the FIRST time) ─────────────────────────────────────
 * `AuditEntryInput` (packages/domain/src/audit/write.ts) is a `.strict()` Zod-validated interface with NO
 * optional fields beyond `traceId`: `actorId`/`actorRole` are `null` (a system action — mirror dispatch.ts),
 * and `requestPayloadHash` is a SHA-256 hex digest of the canonical-JSON reason (the schema regex-validates
 * it as 64 hex chars; NEVER the payload). Because the best-effort catch SWALLOWS write failures, a missing
 * required field (e.g. an omitted `requestPayloadHash`) would fail Zod validation and SILENTLY no-op every
 * call — hence the shape must be correct up front. `action: 'alert.cost_suppression'` satisfies the writer's
 * dotted-lowercase `^[a-z0-9_]+(\.[a-z0-9_]+)+$` pattern.
 *
 * ── Observability METRICS emission is DEFERRED (Category 5) ──────────────────────────────────────────────
 * Architecture §3.4 L2087 also names "per-Pariwar observability metrics" for suppression. The metrics
 * EMISSION transport is deferred to the observability epic (Category 5) — this helper shapes the reason
 * record so that emission is a thin later add. Do NOT wire a metrics transport here (mirror 5.6's
 * `onStalenessAlarm` console-stub deferral).
 */
export async function auditCostSuppression(audit: AuditPort, input: CostSuppressionAuditInput): Promise<void> {
  const { pariwarId, memberId, alertId, reason } = input;
  const requestPayloadHash = sha256Hex(canonicalJsonStringify(reason));
  const resourceLocator =
    `alert:${alertId};member:${memberId};category=${reason.category};` +
    `window_ms=${reason.stalenessWindowMs};last_engagement=${reason.lastEngagementAt};age_ms=${reason.ageMs}`;
  try {
    await audit({
      pariwarId,
      actorId: null,
      actorRole: null,
      action: 'alert.cost_suppression',
      resourceLocator,
      requestPayloadHash,
      responseStatus: 200,
      traceId: alertId,
    });
  } catch {
    // Swallow — a cost-suppression audit failure must never poison the caller (AI-4-3(d) best-effort).
  }
}

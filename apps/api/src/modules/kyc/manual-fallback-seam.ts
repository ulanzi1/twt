// FR-58C hard-mandatory DigiLocker seam — Story 3.3b (Task 4; AC3), WIRED at Story 10.8 (Task 9).
//
// THE SINGLE read-point for "is the manual KYC fallback available?". As of Story 10.8 this resolves
// through the feature-flag evaluator: the `kyc_manual_fallback` flag decides per cohort, falling back
// to `config.digilocker.manualFallbackEnabled` when no flag version is in force.
//
// This is the canonical FR-58C use case (PRD FR-58C consequence #1, epics.md:1663/1677) and the one
// consumer Story 10.8 wires end-to-end. It proves the whole chain — flag → cohort → evaluation →
// per-tenant behaviour change → no consumer code edit at flip time. The mobile UI reads
// `manualFallbackEnabled` off `/status`, so a flip changes the client's branch with no client change.
//
// ── THE POLARITY IS INVERTED, AND THAT IS THE WHOLE POINT ─────────────────────────────────────────
// The flag is named for the CUTOVER, not for the fallback: `kyc_manual_fallback` ENABLED means
// DigiLocker is hard-mandatory, so the manual fallback is HIDDEN. Read it as "the hard-mandatory
// cutover is on for this cohort."
//
// It is written this way deliberately. A flag should be named for the change it introduces, so the
// SAFE state is the one where the flag says nothing — and here that matters twice over:
//   · The flag's own `fallback_default` is `true` in the registry, so an unevaluable cohort rule
//     resolves to "cutover active = true"… which is why THIS function inverts it into "manual
//     available", making the degraded outcome the permissive one.
//   · A flag-subsystem failure, an unregistered key, or a malformed cohort rule can therefore never
//     silently make KYC mandatory for anyone. The failure mode is "more members can still complete
//     KYC than intended", never "members are locked out of joining."
// Making KYC mandatory must always be an explicit, audited, per-cohort act.
//
// ── Why this takes a Db rather than reading a cached global ───────────────────────────────────────
// Flag rows are tenant-scoped; the caller's scope tx is what makes RLS resolve the right override.
// The lookup itself is memoized (the short-TTL snapshot), so the per-request cost is a Map hit rather
// than a query — but the access observation stays OUTSIDE that cache (AC5c), which is why resolution
// goes through `resolveFlagAudited` rather than the raw lookup.

import { featureFlags } from '@twt/domain';
import type { ids } from '@twt/domain';

import type { AppDeps } from '../../context.js';

/** The flag key governing the FR-2 cutover. Admitted to the capability bar as a `member_flow`. */
export const KYC_MANUAL_FALLBACK_FLAG = 'kyc_manual_fallback';

/** The minimal Db surface the flag lookup needs — the caller's scope tx. */
type ScopedDb = Parameters<typeof featureFlags.resolveFlagAudited>[0];

/** What the evaluator needs about the member to resolve a cohort clause. Only the dimensions this
 *  call site can genuinely supply — an absent dimension simply does not match (a legitimate "not in
 *  that cohort", not an error), so supplying a placeholder would be strictly worse than omitting it. */
export interface ManualFallbackContext {
  pariwarId: ids.PariwarId;
  /** The member's lifecycle state, when the caller already has it in hand. */
  memberState?: string;
  /**
   * Best-effort observability for a flag-subsystem failure — the KYC flow degrades to the config
   * default either way (Story 4.8 posture), but a silent catch left an outage with zero
   * operational signal. Optional so existing call sites and tests are unaffected.
   */
  onError?: (err: unknown) => void;
}

/**
 * Resolve whether the manual KYC fallback is permitted (AC3 / Story 10.8 AC8).
 *
 * Returns `true` when manual entry is still offered.
 *
 * Resolution order:
 *   1. A PERSISTED flag version for this Pariwar (override ≻ global row). A decision of `enabled`
 *      means the hard-mandatory cutover is ON for this cohort ⇒ manual fallback is OFF.
 *   2. No persisted version anywhere ⇒ `config.digilocker.manualFallbackEnabled` (pre-10.8 behaviour).
 *
 * ⚠ STEP 2 KEYS OFF THE RESOLUTION *SOURCE*, NOT OFF A NULL DECISION — and that distinction is
 * load-bearing. A registered flag ALWAYS resolves: when no row exists anywhere, the registry answers
 * from its code-default tier (`source: 'default'`, state `off`). So "no version in force" never
 * surfaces as a null for a registered key, and a naive `decision.enabled` read would let the code
 * default silently OVERRIDE a deployment whose config had manual disabled — making
 * `config.digilocker.manualFallbackEnabled` dead configuration that still looks live. Deferring to
 * config on the `default` tier keeps every existing deployment's behaviour exactly as it was until
 * an operator makes a deliberate, audited flip.
 *
 * Never throws on a flag problem: a malformed cohort rule resolves to the flag's `fallback_default`
 * inside the evaluator, and a lookup failure degrades to the config default here. A KYC flow must not
 * break because a flag is misconfigured.
 */
export async function isManualFallbackEnabled(
  deps: AppDeps,
  db: ScopedDb,
  ctx: ManualFallbackContext,
): Promise<boolean> {
  const configDefault = deps.config.digilocker.manualFallbackEnabled;

  try {
    // Captured from the access observation, which fires OUTSIDE the cached lookup (AC5c) and so
    // reports the tier on a cache hit exactly as on a miss.
    let source: 'override' | 'global' | 'default' | null = null;

    const decision = await featureFlags.resolveFlagAudited(
      db,
      KYC_MANUAL_FALLBACK_FLAG,
      ctx.pariwarId,
      { pariwarId: ctx.pariwarId, ...(ctx.memberState ? { memberState: ctx.memberState } : {}) },
      deps.clock(),
      // The caller default if the key were ever unregistered. Expressed as "cutover active?", hence
      // the negation: `configDefault: true` ("manual available") means "cutover not active".
      !configDefault,
      { onAccess: (_d, s) => { source = s; } },
    );

    // Nothing has been authored for this flag anywhere — config still governs.
    if (source === null || source === 'default') return configDefault;

    // ⚠ THE INVERSION (see the header): cutover enabled ⇒ manual fallback hidden.
    return !decision.enabled;
  } catch (err) {
    // A flag-subsystem failure must never harden the KYC flow. Degrade to the config default — the
    // Story 4.8 posture: cache/flag participation is OPTIONAL, correctness is MANDATORY. Still
    // observe it: a silent catch here means a flag-store outage produces zero operational signal,
    // on top of there being no automatic health-signal/rollback (AC7 — deferred).
    ctx.onError?.(err);
    return configDefault;
  }
}

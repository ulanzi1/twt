// KYC provider registry + the FR-58C swap seam — Story 3.3a (Task 4; AC2/AC6),
// WIRED at Story 10.8 (Task 9).
//
// `getActiveKycProvider(ctx)` returns the active `KycProvider` bound to the request scope.
// As of Story 10.8 the selection resolves through the feature-flag evaluator: when the
// `kyc_provider_selection` flag is enabled for the request's cohort AND an alternate provider
// is registered, the alternate is used; otherwise the config default stands. Adding a new
// provider (e.g. a Setu/Surepass aggregator per §3.8) + setting `alternateProviderKey` + flipping
// the flag is the change; no KYC HANDLER changes (architectural-freeze row 13 / AR-43).
//
// ⚠ CORRECTED IN REVIEW PASS 4. This used to claim registering a provider and flipping the flag was
// "the WHOLE change; NO consumer code changes". That was false: `alternateProviderKey` is set
// nowhere today, so a flip alone selects nothing — a `deps.ts` edit is also required. The honest
// claim is the narrower one above: the KYC handlers need no change, the wiring does.
//
// ⚠ ONE HONEST LIMITATION, stated rather than papered over. The Story 10.8 cohort predicate is
// deliberately BOOLEAN (Decision 5 — a bounded declarative form, not an expression language, so
// determinism stays provable and a rule stays reviewable in a trustee-attested PR). A boolean can
// select between TWO providers — the configured default and one registered alternate — but it
// cannot NAME one among three or more. If a third provider is ever registered, the flag needs a
// value channel, which is a real extension to the predicate shape and belongs in its own reviewed
// story. Encoding a provider name into a cohort `values` array to dodge that would be exactly the
// expression-language creep Decision 5 rejects.
//
// The registry imports ONLY the `@twt/contracts` `KycProvider` port + the provider
// BUILDERS — never the DigiLocker transport directly (the import-boundary gate holds).

import type { KycProvider } from '@twt/contracts';
import { featureFlags } from '@twt/domain';

import type { KycProviderContext } from './context.js';

/** The flag key governing provider selection. Admitted to the capability bar as `provider_selection`. */
export const KYC_PROVIDER_SELECTION_FLAG = 'kyc_provider_selection';

/** A builder that binds a provider to the per-request scope (ctx). */
export type KycProviderBuilder = (ctx: KycProviderContext) => KycProvider;

/**
 * Thrown when a persisted transaction names a provider this deployment does not register — a
 * provider was removed, renamed, or the row predates a re-key. The transaction cannot be completed
 * by anyone: only the originating provider can verify its own OAuth state. The member's remedy is to
 * start a fresh KYC attempt, which is what the boundary tells them.
 */
export class KycProviderUnavailableError extends Error {
  public readonly name = 'KycProviderUnavailableError';
  public constructor(
    public readonly providerKey: string,
    public readonly registered: readonly string[],
  ) {
    super(
      `[kyc] transaction names provider '${providerKey}', which is not registered on this deploy ` +
        `(registered: ${registered.join(', ')}) — the transaction cannot be completed; re-initiate`,
    );
  }
}

export interface KycProviderRegistryConfig {
  /**
   * The DEFAULT provider key — a fixed value set at boot from config (DigiLocker when configured,
   * else `fixture`). Used whenever the selection flag is off, absent, or unresolvable.
   */
  readonly activeProviderKey: string;
  /**
   * The provider key selected when `kyc_provider_selection` is ENABLED for the request's cohort.
   * Undefined (the v1 state) means the flag has nothing to switch to, so the default always wins —
   * the flag is inert rather than dangerous. See the header's boolean-predicate limitation.
   */
  readonly alternateProviderKey?: string;
  /** Registered provider key → builder. A new provider registers an entry here. */
  readonly builders: Readonly<Record<string, KycProviderBuilder>>;
}

export interface KycProviderRegistry {
  /** Resolve the active provider for this request scope (flag-aware since Story 10.8). */
  getActiveKycProvider(ctx: KycProviderContext): Promise<KycProvider>;
  /**
   * Build a provider by its EXACT key, with NO flag resolution (Review Pass 4).
   *
   * ⚠ THIS IS THE CALLBACK/CONFIRM PATH and it is a correctness requirement, not a convenience. A
   * KYC transaction spans two requests: `initiate` mints provider-specific OAuth state, and
   * `callback` must hand that state back to the SAME provider. Re-resolving the flag on the second
   * leg meant a provider swap between the two — a flip, a version window closing, a cohort re-tag,
   * or merely the flag cache bucket rolling over — handed provider B provider A's `state`/`code`,
   * `verifyAndPullProfile` threw, and the member got `member_kyc.failure` with no recovery path.
   * `kyc_transactions.provider` exists precisely to pin this ("so an FR-58C provider swap needs no
   * ALTER TYPE") and was written but never read.
   */
  builderFor(key: string, ctx: KycProviderContext): KycProvider;
  /** The DEFAULT provider key (diagnostic / completion-note surface). */
  readonly activeProviderKey: string;
}

/**
 * Build the registry from the available provider builders + the active-provider selection.
 * The single selection point below is the FR-58C swap seam.
 */
export function createKycProviderRegistry(config: KycProviderRegistryConfig): KycProviderRegistry {
  // ⚠ VALIDATE THE ALTERNATE AT BOOT, not at first use (Review Pass 4). The default key is
  // boot-fixed, but `alternateProviderKey` used to be checked only when a flag flip selected it —
  // so a data-only flip to a key with no registered builder threw from inside `getActiveKycProvider`
  // OUTSIDE the try/catch, 500-ing every KYC initiate and callback for the whole cohort with
  // `ctx.onError` never firing. A misconfiguration should fail the process at startup, where an
  // operator sees it, rather than the member's signup.
  if (config.alternateProviderKey !== undefined && !config.builders[config.alternateProviderKey]) {
    throw new Error(
      `[kyc] alternateProviderKey '${config.alternateProviderKey}' has no registered builder — ` +
        `register it in \`builders\` or unset the alternate (registered: ${Object.keys(config.builders).join(', ')})`,
    );
  }
  return {
    activeProviderKey: config.activeProviderKey,
    builderFor(key: string, ctx: KycProviderContext): KycProvider {
      const builder = config.builders[key];
      if (!builder) {
        // ⚠ A row naming a provider this deploy no longer registers is genuinely UNSERVICEABLE:
        // provider A's OAuth `state`/`code` cannot be verified by provider B, so silently falling
        // back to the active provider would reproduce the very stranding this pinning prevents.
        // Throwing is correct — but it must be TYPED so the boundary can tell the member to
        // re-initiate rather than showing an anonymous 500.
        throw new KycProviderUnavailableError(key, Object.keys(config.builders));
      }
      return builder(ctx);
    },
    async getActiveKycProvider(ctx: KycProviderContext): Promise<KycProvider> {
      // ── FR-58C provider-swap seam (AC2/AC6) — LIVE since Story 10.8 ──────────────────────────
      // The flag read the 3.3a comment promised. `resolveFlagAudited` runs the memoized lookup and
      // fires the access observation OUTSIDE the cache (AC5c — an observer IS registered below since
      // Review Pass 4). A per-cohort `enabled` selects the registered alternate; everything else
      // keeps the config default.
      //
      // ⚠ INERT IN EVERY CURRENT DEPLOYMENT, stated plainly (Review Pass 4). `alternateProviderKey`
      // is set NOWHERE — not in `deps.ts`, not in `config.ts` — so the guard below is always false
      // and this flag lookup never executes in production. The seam is DECLARED, not live. It is
      // deliberately not wired: the only other registered builder today is the FIXTURE provider,
      // and pointing a production provider flip at a test double is worse than an honestly-inert
      // seam. Re-trigger: the story that registers a real AR-43 second vendor must set
      // `alternateProviderKey` AND add the enabled-path test (there is none today).
      let key = config.activeProviderKey;
      if (config.alternateProviderKey !== undefined) {
        try {
          const decision = await featureFlags.resolveFlagAudited(
            ctx.db,
            KYC_PROVIDER_SELECTION_FLAG,
            ctx.pariwarId,
            // The SAME cohort context the manual-fallback seam supplies — `memberState` included.
            // Passing a narrower context here meant a `member_state` cohort clause applied to one
            // KYC flag and silently never matched on the other (Review Pass 4).
            { pariwarId: ctx.pariwarId, ...(ctx.memberState ? { memberState: ctx.memberState } : {}) },
            // ⚠ The INJECTED clock, not `new Date()` (Review Pass 4). This was the only flag read in
            // the request evaluating windows against wall time: non-reproducible under a frozen
            // clock, inconsistent with every other read in the same request, and it re-bucketed the
            // flag cache key every second, making this lookup a near-permanent miss.
            ctx.now ?? new Date(),
            /* callerDefault when no version is in force */ false,
            // ⚠ AC5c's access observation, WIRED (Review Pass 4). This call passed no options at
            // all, so `onAccess`/`observe` never fired and the "audit fires on a cache HIT exactly
            // as on a miss" property had NO production observer at either wired consumer — it was
            // proven only by a unit test. The sink is best-effort and cannot throw into the caller.
            { onAccess: (d, source) => ctx.onAccess?.({ reason: d.reason, enabled: d.enabled }, source) },
          );
          if (decision.enabled) key = config.alternateProviderKey;
        } catch (err) {
          // A flag-subsystem failure must never fail KYC — degrade to the configured default
          // provider (the Story 4.8 posture: participation optional, correctness mandatory). Still
          // observe it: a silent catch here means a flag-store outage produces zero operational
          // signal, on top of there being no automatic health-signal/rollback (AC7 — deferred).
          ctx.onError?.(err);
        }
      }
      const builder = config.builders[key];
      if (!builder) {
        throw new Error(`[kyc] no KYC provider registered for active key '${key}'`);
      }
      return builder(ctx);
    },
  };
}

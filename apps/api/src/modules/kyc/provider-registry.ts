// KYC provider registry + the FR-58C swap seam — Story 3.3a (Task 4; AC2/AC6),
// WIRED at Story 10.8 (Task 9).
//
// `getActiveKycProvider(ctx)` returns the active `KycProvider` bound to the request scope.
// As of Story 10.8 the selection resolves through the feature-flag evaluator: when the
// `kyc_provider_selection` flag is enabled for the request's cohort AND an alternate provider
// is registered, the alternate is used; otherwise the config default stands. Adding a new
// provider (e.g. a Setu/Surepass aggregator per §3.8) + flipping the flag is the WHOLE change;
// NO consumer code changes (that is architectural-freeze row 13 / AR-43 realized).
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
  /** The DEFAULT provider key (diagnostic / completion-note surface). */
  readonly activeProviderKey: string;
}

/**
 * Build the registry from the available provider builders + the active-provider selection.
 * The single selection point below is the FR-58C swap seam.
 */
export function createKycProviderRegistry(config: KycProviderRegistryConfig): KycProviderRegistry {
  return {
    activeProviderKey: config.activeProviderKey,
    async getActiveKycProvider(ctx: KycProviderContext): Promise<KycProvider> {
      // ── FR-58C provider-swap seam (AC2/AC6) — LIVE since Story 10.8 ──────────────────────────
      // The flag read the 3.3a comment promised. `resolveFlagAudited` runs the memoized lookup and
      // fires the access observation OUTSIDE the cache (AC5c). A per-cohort `enabled` selects the
      // registered alternate; everything else keeps the config default.
      let key = config.activeProviderKey;
      if (config.alternateProviderKey !== undefined) {
        try {
          const decision = await featureFlags.resolveFlagAudited(
            ctx.db,
            KYC_PROVIDER_SELECTION_FLAG,
            ctx.pariwarId,
            { pariwarId: ctx.pariwarId },
            new Date(),
            /* callerDefault when no version is in force */ false,
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

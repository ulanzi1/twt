// KYC provider registry + the FR-58C swap seam — Story 3.3a (Task 4; AC2/AC6).
//
// `getActiveKycProvider(ctx)` returns the active `KycProvider` bound to the request scope.
// TODAY it returns the single registered provider (DigiLocker when configured, else the
// fixture). The FR-58C feature-flag infrastructure is NOT built yet (no
// `apps/api/src/modules/feature-flags/`) — this registry is the DOCUMENTED seam where a
// future one-line flag read selects among registered providers. Adding a new provider
// (e.g. a Setu/Surepass aggregator per §3.8) + flipping the flag is the WHOLE change;
// NO consumer code changes (that is architectural-freeze row 13 / AR-43 realized).
//
// The registry imports ONLY the `@twt/contracts` `KycProvider` port + the provider
// BUILDERS — never the DigiLocker transport directly (the import-boundary gate holds).

import type { KycProvider } from '@twt/contracts';

import type { KycProviderContext } from './context.js';

/** A builder that binds a provider to the per-request scope (ctx). */
export type KycProviderBuilder = (ctx: KycProviderContext) => KycProvider;

export interface KycProviderRegistryConfig {
  /**
   * The active provider key. TODAY a fixed value set at boot from config (DigiLocker
   * when configured, else `fixture`). The FR-58C flag flip would set this per-request.
   */
  readonly activeProviderKey: string;
  /** Registered provider key → builder. A new provider registers an entry here. */
  readonly builders: Readonly<Record<string, KycProviderBuilder>>;
}

export interface KycProviderRegistry {
  /** Resolve the active provider for this request scope. */
  getActiveKycProvider(ctx: KycProviderContext): KycProvider;
  /** The active provider key (diagnostic / completion-note surface). */
  readonly activeProviderKey: string;
}

/**
 * Build the registry from the available provider builders + the active-provider selection.
 * The single selection point below is the FR-58C swap seam.
 */
export function createKycProviderRegistry(config: KycProviderRegistryConfig): KycProviderRegistry {
  return {
    activeProviderKey: config.activeProviderKey,
    getActiveKycProvider(ctx: KycProviderContext): KycProvider {
      // ── FR-58C provider-swap seam (AC2/AC6) ──────────────────────────────────
      // TODAY: returns the single active provider. FUTURE: replace this constant read
      // with a one-line feature-flag read, e.g.
      //     const key = featureFlags.read('kyc_provider', ctx.pariwarId) ?? config.activeProviderKey;
      // selecting among `config.builders` — NO consumer code changes.
      const key = config.activeProviderKey;
      const builder = config.builders[key];
      if (!builder) {
        throw new Error(`[kyc] no KYC provider registered for active key '${key}'`);
      }
      return builder(ctx);
    },
  };
}

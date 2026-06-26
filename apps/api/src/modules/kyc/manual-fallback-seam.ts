// FR-58C hard-mandatory DigiLocker seam — Story 3.3b (Task 4; AC3).
//
// THE SINGLE config read-point for "is the manual KYC fallback available?". TODAY it
// resolves to the config default (`true` — manual is ALWAYS available, the safe default).
// The FR-58C hard-mandatory feature-flag INFRASTRUCTURE is NOT built (no flag store) — this
// mirrors the 3.3a provider-registry `activeProviderKey` seam: a future one-line flag read
// would replace the config read here, and flipping it `false` hides the manual CTA + shows
// the hard-mandatory copy block (the mobile UI reads `manualFallbackEnabled` off `/status`).

import type { AppDeps } from '../../context.js';

/**
 * Resolve whether the manual KYC fallback is permitted (AC3). The DOCUMENTED FR-58C seam —
 * see `config.digilocker.manualFallbackEnabled`. Surfaced on the `/status` (+ confirm/manual)
 * responses so the client branches its UI without any consumer-code change at flip time.
 */
export function isManualFallbackEnabled(deps: AppDeps): boolean {
  return deps.config.digilocker.manualFallbackEnabled;
}

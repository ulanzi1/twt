// The FlagHealthSignal port — Story 10.8 (AC7, Decision 6).
//
// AR-64 / Cross-Cutting #15 requires "canary → graduated cohorts + AUTOMATIC rollback on error-rate
// spike." Story 10.8 ships the first half for real (the five-state machine + an audited, manual,
// one-write `rolled_back` flip that takes effect on the next evaluation with zero consumer code
// change) and declares the second half ABSENT, deliberately and visibly.
//
// ── WHY THIS IS A DECLARED ABSENCE AND NOT AN IMPLEMENTATION ──────────────────────────────────────
// There is NO error-rate metrics substrate in this repo. Verified: there is no observability/metrics
// package, and the only two metric-shaped modules —
// `packages/validity-service/src/cache-observability.ts` and
// `packages/domain/src/claim/peer-mesh-metric-registry.ts` — are per-subsystem counters, neither of
// which emits an error RATE. AR-31's observability vendor is itself a deferred ADR.
//
// Building a synthetic error-rate pipeline inside a feature-flag story would be inventing a PRODUCER
// to satisfy a CONSUMER — the exact anti-pattern Story 5.6 rejected. Worse, a fake signal that
// AUTO-FLIPS production behaviour is more dangerous than an honest absence: it would create a
// rollback mechanism whose trigger nobody trusts, and the first false positive would teach operators
// to ignore it.
//
// So this port exists, is typed, and resolves to `{ available: false }` in v1 — the Story 8.4
// nominee-VPA discipline: an absent seam is FIRST-CLASS and explicit, never a silent omission and
// never a fabricated stub that returns plausible-looking numbers.
//
// ⚠ RE-TRIGGER: the AR-31 observability story. Recorded in deferred-work.md. Until then, AR-64 is
// KNOWINGLY PARTIALLY DELIVERED — the manual rollback path is what ships, and that is stated plainly
// in ADR-0036's offline-resilience/auditability sections rather than quietly closed.

/** An error-rate reading for one flag in one scope, over a window. The shape a real AR-31-backed
 *  implementation would return — declared now so the consumer contract is settled, not invented later. */
export interface FlagHealthReading {
  flagKey: string;
  pariwarId: string | null;
  /** Errors per request in `windowSeconds`, in [0, 1]. */
  errorRate: number;
  windowSeconds: number;
  observedAt: Date;
}

/**
 * The resolution of the health-signal port. `available: false` is the FIRST-CLASS v1 answer and
 * carries its reason, so a caller logging "auto-rollback unavailable" can say WHY without guessing.
 */
export type FlagHealthSignalResolution =
  | { available: true; read: (flagKey: string, pariwarId: string | null) => Promise<FlagHealthReading | null> }
  | { available: false; reason: string };

/**
 * Resolve the automatic-rollback health signal. Returns `{ available: false }` in v1 — see the
 * header. A caller MUST branch on `available` and MUST NOT synthesize a substitute reading: the
 * whole point of the declared absence is that no auto-rollback decision is made on invented data.
 */
export function resolveFlagHealthSignal(): FlagHealthSignalResolution {
  return {
    available: false,
    reason:
      'No error-rate metrics substrate exists in this repo (AR-31 observability vendor is a deferred ADR). ' +
      'AR-64 automatic rollback is knowingly un-built; the audited MANUAL rolled_back flip is the shipped ' +
      'rollback path (Story 10.8 Decision 6). Re-trigger: the AR-31 observability story.',
  };
}

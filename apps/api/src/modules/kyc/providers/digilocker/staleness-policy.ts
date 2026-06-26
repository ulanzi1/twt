// DigiLocker certificate staleness policy — Story 3.3a (Task 2/Task 3; AC7).
//
// The two-window staleness budget (architecture §2.8 L1611-1613 + §3.8 L2325-2331):
// the cert cache is refreshed by a daily pg-boss job (the cron registration is the
// 3.3b/ops seam). A refresh failure leaves the cached cert stale; the provider tolerates
// staleness up to a budget, then fails closed:
//   · within-budget → the cached cert is TRUSTED + a staleness ALARM fires (ops signal).
//   · past hard-limit → new verifications FAIL CLOSED → KycError(certificate_stale) →
//     (the consumer, Story 3.3b, routes the member to `pending-valid` manual fallback).
//
// ⚠ The VALUES live in ADR-0026 (`docs/adr/ADR-0026-digilocker-signature-policy.md`),
// authored at this story's closure (Task 7) — NOT invented here. The architecture
// explicitly DELEGATES the numbers to an ADR ("Staleness budget named in an ADR with
// two windows", §3.8 L2326). These named constants are the code's single read of those
// committed values; changing them is an ADR amendment, not a code edit.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Within-budget window (ADR-0026): a cached cert whose last successful refresh
 * (`fetched_at`) is within this many ms of now is TRUSTED, with a staleness alarm.
 * Value: 7 days (a full week of failed DAILY refreshes before the alarm escalates to a
 * hard stop) — committed in ADR-0026 §Decision.
 */
export const CERT_STALENESS_WITHIN_BUDGET_MS = 7 * DAY_MS;

/**
 * Hard-limit window (ADR-0026): past this many ms since the last successful refresh,
 * new verifications FAIL CLOSED (`certificate_stale`). Value: 30 days — committed in
 * ADR-0026 §Decision. Existing verified members are unaffected (only NEW verifications
 * fail closed, §3.8 L2331).
 */
export const CERT_STALENESS_HARD_LIMIT_MS = 30 * DAY_MS;

/** The disposition of a cached cert against the two-window budget. */
export type CertStaleness = 'fresh' | 'within-budget' | 'past-hard-limit';

/**
 * Classify a cached cert by how long since its last successful refresh (`fetchedAt`):
 *   · `fresh`            — within the within-budget window; trust silently.
 *   · `within-budget`    — past within-budget but before the hard limit; trust + ALARM.
 *   · `past-hard-limit`  — past the hard limit; fail closed (`certificate_stale`).
 *
 * Pure + clock-injected (`now`) so it is deterministically testable. A `fetchedAt` in
 * the future (clock skew) is treated as `fresh` (age clamps at 0).
 */
export function evaluateCertStaleness(fetchedAt: Date, now: Date): CertStaleness {
  const ageMs = Math.max(0, now.getTime() - fetchedAt.getTime());
  if (ageMs <= CERT_STALENESS_WITHIN_BUDGET_MS) return 'fresh';
  if (ageMs <= CERT_STALENESS_HARD_LIMIT_MS) return 'within-budget';
  return 'past-hard-limit';
}

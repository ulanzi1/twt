// `withCompensatingAudit` — the shared compensating-audit protocol (ADR-0030 / Epic 5
// retrospective AI-5-3). Closes the gap between two commit horizons: the intent audit
// line commits immediately via `writeAuditEntry`'s own service-pool transaction, while
// the caller's mutation typically runs on a still-open, rollback-capable transaction
// (a `scopeTx.tx` / `request.scopeTx.tx`) that can still roll back afterward. Without
// this, the audit ledger can claim a state transition that never durably landed.
//
// Extracted from four independently hand-rolled implementations
// (wa-opt-in/telegram-opt-in/terms/medical handlers) per ADR-0030 — this is now the
// SOLE sanctioned way to pair a mutation with a compensatable audit line; callers
// must not call `writeAuditEntry` directly for this shape (see
// `docs/adr/ADR-0030-compensating-audit-mechanization.md` §0/§1).
//
// Callers invoke this helper only after determining that an audit is required (a
// pre-check for an idempotent no-op path happens BEFORE calling this, not inside it —
// see the `degraded-mode.revoke` call site for the shape); once invoked, the helper
// always emits both the intent audit and, on failure, the compensating audit.

import type pg from 'pg';

import { writeAuditEntry, type AuditEntryInput } from './write.js';

/** The audit-intent fields for a compensatable write. The compensating line reuses
 *  every field verbatim except `action` (suffixed `_rolled_back`) and `responseStatus`
 *  (fixed at 500) — both owned by the helper, never caller-supplied, so the two
 *  audit lines can never drift apart. */
export type AuditIntentArgs = Omit<AuditEntryInput, 'responseStatus'>;

/**
 * Fire a best-effort `${action}_rolled_back` compensating line (status 500) for an
 * already-committed `auditIntent`, swallowing its own failure — the original error
 * (or the caller's alternate recovery path) must never be masked. Exported
 * separately from `withCompensatingAudit` for the one shape it doesn't cover: a
 * `mutate` that catches a SPECIFIC recoverable error itself and wants to settle the
 * chain (this attempt didn't durably transition anything) while still returning a
 * normal success to its own caller — see `telegram-opt-in.request()`'s concurrent
 * double-tap recovery for the worked example. `withCompensatingAudit` uses this
 * internally too, so BOTH exports are the sole callers of `writeAuditEntry` for a
 * compensatable write (the invariant the AI-5-3 AST gate enforces).
 */
export async function writeRolledBackAudit(pool: pg.Pool, auditIntent: AuditIntentArgs): Promise<void> {
  try {
    await writeAuditEntry(pool, {
      ...auditIntent,
      action: `${auditIntent.action}_rolled_back`,
      responseStatus: 500,
    });
  } catch {
    // swallow — the original error is the one the caller must see.
  }
}

/**
 * Write the intent audit line FIRST (own tx via `pool`, status 200), then run
 * `mutate` (given the intent audit's id, for callers that thread it into a domain
 * row — e.g. `consent.recordConsent({ auditId })`). On any failure, fire the
 * compensating line and rethrow the original error, never masked.
 */
export async function withCompensatingAudit<T>(
  pool: pg.Pool,
  args: { auditIntent: AuditIntentArgs; mutate: (intentAudit: { auditId: string }) => Promise<T> },
): Promise<T> {
  const intentRow = await writeAuditEntry(pool, { ...args.auditIntent, responseStatus: 200 });
  try {
    return await args.mutate({ auditId: intentRow.auditId });
  } catch (err) {
    await writeRolledBackAudit(pool, args.auditIntent);
    throw err;
  }
}

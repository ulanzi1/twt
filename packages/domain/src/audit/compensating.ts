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
 * Write the intent audit line FIRST (own tx via `pool`, status 200), then run
 * `mutate`. On any failure, fire a best-effort `${action}_rolled_back` compensating
 * line (status 500, its own swallowed try/catch) and rethrow the original error,
 * never masked.
 */
export async function withCompensatingAudit<T>(
  pool: pg.Pool,
  args: { auditIntent: AuditIntentArgs; mutate: () => Promise<T> },
): Promise<T> {
  await writeAuditEntry(pool, { ...args.auditIntent, responseStatus: 200 });
  try {
    return await args.mutate();
  } catch (err) {
    try {
      await writeAuditEntry(pool, {
        ...args.auditIntent,
        action: `${args.auditIntent.action}_rolled_back`,
        responseStatus: 500,
      });
    } catch {
      // swallow — the original error is the one the caller must see.
    }
    throw err;
  }
}

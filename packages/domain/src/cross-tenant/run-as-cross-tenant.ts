// Named cross-tenant operations helper — Story 1.6 substrate, re-keyed at Story
// 1.10 (D5-1.6 / D2-1.6 / D9-1.6).
//
// Architecture §1.2 line 736-740 + line 764-770: operations that legitimately
// span tenants are a single named code surface; every cross-tenant read writes
// an audit line capturing actor + reason + tenant set; a CI import-rule lint
// (Story 1.16a / deferred D1-1.6) forbids constructing service-role connections
// outside this module. This file is that single surface.
//
// ── Story 1.10 re-key (replaces the events_log placeholder) ───────────────────
// Story 1.6 emitted the cross-tenant audit event into events_log via a direct
// drizzle INSERT (a placeholder, to avoid the @twt/events↔@twt/domain cycle).
// Story 1.10 re-keys that emission onto the substantive tamper-evident
// `audit_log_entries` table via `writeAuditEntry` (same package — no cycle). The
// events_log placeholder INSERT is GONE. The CROSS_TENANT_SENTINEL_UUID lives on
// as the `audit_log_entries.pariwar_id` value for all cross-tenant audit rows.
//
// ── Two-transaction split + outcome audit (W1-CR1.6, CR-P1-1.10) ─────────────
// Three-step protocol:
//   (1) Pre-audit (responseStatus 102 — Processing): commits FIRST so the record
//       that access was authorized is durable before any RLS-bypassed work.
//       Fails CLOSED: if this write fails, the operation never runs.
//   (2) The RLS-bypassed operation runs in its own transaction.
//   (3) Outcome audit (responseStatus 200 or 500): best-effort commit after fn()
//       resolves. Records the actual result. Never suppresses the operation error.
//
// 102 means "access authorized, operation commencing" — NOT that it succeeded.
// This closes the gap where a hardcoded 200 pre-audit would record success for
// an operation that never executed (e.g. pool.connect() fails between steps 1→2).
//
// ⚠ Requires a `servicePool` (DD-3): in production a BYPASSRLS `twt_service`-login
// pool; in dev/CI the same superuser pool as `pool`. `SET LOCAL row_security =
// off` (below) likewise needs superuser/BYPASSRLS — do NOT invoke against Cloud
// SQL without service-pool separation.
//
// ⚠ Commits its own transactions — cannot be rolled back by setupLiveDb's
// per-test ROLLBACK. Tests that call it accept row accumulation at the sentinel
// audit stream (assert `>= 1`, not `=== 1`).

import { createHash } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';

import { writeAuditEntry } from '../audit/write.js';
import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import * as schema from '../schema/index.js';

/** Well-known sentinel UUID for the cross-tenant audit tenant marker. */
const CROSS_TENANT_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

export interface CrossTenantContext {
  /**
   * Free-form reason emitted in the audit line. Examples: 'super-admin audit
   * dashboard query', 'matcher cron — multi-Pariwar batch', 'helpline triage
   * routing'. Auditors filter cross-tenant audit lines by reason to characterise
   * access patterns.
   */
  reason: string;
  /**
   * The actor performing the operation. NULL = system/SIE per architecture
   * §1.14 line 1262-1268.
   */
  actorId: string | null;
  /**
   * Optional explicit tenant set when known. When invoked from a batch job
   * processing N Pariwars, passing the full list makes the audit line richer
   * than the default unbounded marker.
   */
  pariwarIds?: string[];
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Single named call-site for cross-tenant operations (architecture §1.2 line
 * 736-740). Writes a durable audit line FIRST (own advisory-lock tx), then opens
 * a transaction, sets `row_security = off` for its lifetime, runs the callback
 * against an RLS-bypassed Drizzle handle, and commits.
 *
 * @param pool        the app/cross-tenant pool the RLS-bypassed operation runs on
 * @param servicePool the BYPASSRLS service pool the audit writer runs on (DD-3)
 */
export async function runAsCrossTenant<T>(
  pool: pg.Pool,
  servicePool: pg.Pool,
  ctx: CrossTenantContext,
  fn: (db: Db, client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pariwarIds = ctx.pariwarIds ?? ['<unbounded>'];

  // P5: guard against silent mid-content truncation — throw early so the caller
  // knows to reduce the pariwarIds list or shorten the reason string.
  const resourceLocator = `cross_tenant:[${pariwarIds.join(',')}] ${ctx.reason}`;
  if (resourceLocator.length > 1024) {
    throw new Error(
      `runAsCrossTenant: resourceLocator would be ${resourceLocator.length} chars (max 1024) — reduce pariwarIds count or shorten reason`,
    );
  }

  const requestPayloadHash = sha256Hex(
    canonicalJsonStringify({
      reason: ctx.reason,
      pariwar_ids: pariwarIds,
      emitted_by: 'packages/domain/src/cross-tenant/run-as-cross-tenant.ts',
    }),
  );

  // Shared fields for the pre-audit and outcome audit (same action, same locator).
  const auditBase = {
    pariwarId: CROSS_TENANT_SENTINEL_UUID,
    actorId: ctx.actorId,
    actorRole: null as null,
    action: 'audit.cross_tenant_access',
    resourceLocator,
    requestPayloadHash,
    traceId: null as null,
  };

  // (1) Pre-audit: access authorized, operation commencing (responseStatus 102).
  // Fails closed: a write error here aborts before any RLS-bypassed work.
  await writeAuditEntry(servicePool, { ...auditBase, responseStatus: 102 });

  // (2) The RLS-bypassed operation, in its own transaction.
  const client = await pool.connect();
  let fnError: unknown;
  let result: T | undefined;
  let responseStatus = 500;
  try {
    await client.query('BEGIN');
    // Bypass every RLS policy for the duration of this transaction. Combined
    // with the application role's NOBYPASSRLS attribute (migration 0002
    // self-test), this is the ONLY path that can read cross-tenant rows.
    // row_security = off is a per-transaction toggle; FORCE ROW LEVEL SECURITY
    // does NOT override it (the documented escape hatch for legitimate
    // cross-tenant tooling).
    await client.query('SET LOCAL row_security = off');
    const tx = drizzle(client, { schema }) as unknown as Db;
    result = await fn(tx, client);
    await client.query('COMMIT');
    responseStatus = 200;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    fnError = err;
  } finally {
    client.release();
  }

  // (3) Outcome audit: 200 = operation succeeded; 500 = operation threw.
  // Best-effort — .catch ensures this never suppresses the operation's own error.
  await writeAuditEntry(servicePool, { ...auditBase, responseStatus }).catch(() => undefined);

  if (fnError !== undefined) throw fnError;
  return result as T;
}

// Exported so callers needing the sentinel for assertions/queries (and the
// Story 1.6 integration tests) don't hardcode the literal.
export { CROSS_TENANT_SENTINEL_UUID };

// Named cross-tenant operations helper — Story 1.6 substrate.
//
// Architecture §1.2 line 736-740 + line 764-770: operations that legitimately
// span tenants are a single named code surface; every cross-tenant read writes
// an audit line capturing actor + reason + tenant set; a CI import-rule lint
// (Story 1.16a / deferred D1-1.6) forbids constructing service-role connections
// outside this module. This file is that single surface.
//
// ⚠ Audit-emission layering note (deviation from the Story 1.6 AC-4 sample):
// the AC-4 sample emitted the audit event via `@twt/events.appendEvent`. That
// would make @twt/domain depend on @twt/events, but @twt/events ALREADY depends
// on @twt/domain (for `Db` + `schema`) — the reverse edge is both a layering
// inversion AND a turbo task-graph cycle (verified at dev-time). @twt/domain
// owns the events_log table, so this helper emits the audit event with a direct
// drizzle INSERT into its own schema instead. The audit row shape is identical
// to what appendEvent would have written; Story 1.10 re-wires this to the
// substantive audit_log_entries table (deferred D5-1.6).

import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';

import type { Db } from '../db.js';
import * as schema from '../schema/index.js';

/** Well-known sentinel UUID for the cross-tenant audit stream + tenant marker. */
const CROSS_TENANT_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

export interface CrossTenantContext {
  /**
   * Free-form reason emitted in the audit event. Examples: 'super-admin audit
   * dashboard query', 'matcher cron — multi-Pariwar batch', 'helpline triage
   * routing'. Future auditors filter audit lines by reason to characterise
   * cross-tenant access patterns.
   */
  reason: string;
  /**
   * The actor performing the operation. NULL = system/SIE per architecture
   * §1.14 line 1262-1268 (the Story 1.3 events_log column semantic).
   */
  actorId: string | null;
  /**
   * Optional explicit tenant set when known. When invoked from a batch job
   * processing N Pariwars, passing the full list makes the audit line richer
   * than the default unbounded marker.
   */
  pariwarIds?: string[];
}

/**
 * Single named call-site for cross-tenant operations (architecture §1.2 line
 * 736-740). Opens a transaction, sets `row_security = off` for its lifetime,
 * runs the callback against an RLS-bypassed Drizzle handle, emits an audit
 * event, and commits.
 *
 * ⚠ `SET LOCAL row_security = off` requires superuser or BYPASSRLS privilege.
 * In local Docker + CI, `twt_dev_app = POSTGRES_USER = implicit superuser`, so
 * this works. Against Cloud SQL production, a separate service-pool with
 * BYPASSRLS credentials is required (deferred D9-1.6 / Story 1.10). Do NOT
 * invoke against Cloud SQL without service-pool separation.
 *
 * ⚠ Commits its own transaction — cannot be rolled back by setupLiveDb's
 * per-test ROLLBACK. Tests that call it accept row accumulation at the sentinel
 * audit stream (assert `>= 1`, not `=== 1`).
 */
export async function runAsCrossTenant<T>(
  pool: pg.Pool,
  ctx: CrossTenantContext,
  fn: (db: Db, client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bypass every RLS policy for the duration of this transaction. Combined
    // with the application role's NOBYPASSRLS attribute (migration 0002
    // self-test), this is the ONLY path that can read cross-tenant rows.
    // row_security = off is a per-transaction toggle; FORCE ROW LEVEL SECURITY
    // on events_log does NOT override it (FORCE makes RLS apply to the table
    // owner; the off toggle is the documented escape hatch for legitimate
    // cross-tenant tooling).
    await client.query('SET LOCAL row_security = off');
    const tx = drizzle(client, { schema }) as unknown as Db;
    const result = await fn(tx, client);

    // Emit the audit-trail event into events_log (Story 1.10 substitutes the
    // substantive audit_log_entries row — deferred D5-1.6). Each call mints its
    // own random stream_id so the UNIQUE (stream_id, event_version) constraint
    // is never contested between concurrent callers (review P1 — the prior
    // MAX-query approach raced on the shared sentinel stream under concurrent
    // calls). The sentinel pariwarId marks the row as a cross-tenant audit event
    // for consumers filtering by that column.
    await tx.insert(schema.eventsLog).values({
      streamId: randomUUID(),
      eventType: 'audit.cross_tenant_access',
      payload: {
        reason: ctx.reason,
        pariwar_ids: ctx.pariwarIds ?? ['<unbounded>'],
        emitted_by: 'packages/domain/src/cross-tenant/run-as-cross-tenant.ts',
        invocation_time_iso: new Date().toISOString(),
      },
      eventVersion: 1,
      actorId: ctx.actorId,
      pariwarId: CROSS_TENANT_SENTINEL_UUID,
    });

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

// Exported so callers needing the sentinel for assertions/queries (and the
// Story 1.6 integration tests) don't hardcode the literal.
export { CROSS_TENANT_SENTINEL_UUID };

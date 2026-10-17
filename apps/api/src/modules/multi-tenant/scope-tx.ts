// Per-request scope transaction lifecycle (Story 1.9, AC-6, Task 3.2).
//
// THE NAMED OWNER of the `SET LOCAL app.pariwar_id` invariant. `db.ts` warns that
// `SET LOCAL` outside a transaction leaks scope to the next pooled request — so the
// tx is opened HERE before `setPariwarScope`, and `assertPariwarScopeSet` is called
// immediately after as the loud fail-closed confirmation (which doubles as the
// W9-CR1.6 runtime guard: if a future edit drops the BEGIN, `SET LOCAL` no-ops and
// the read-back throws). The caller (scope-resolution middleware) opens the tx; the
// multi-tenant lifecycle hook closes it (COMMIT on a 2xx/3xx response, ROLLBACK
// otherwise) and always releases the client.

import { assertPariwarScopeSet, bindScopedDb, setPariwarScope } from '@twt/domain';
import type pg from 'pg';

import type { AppDeps } from '../../context.js';
import type { ScopeTx } from '../../types.js';

/**
 * Check out a client, BEGIN, `setPariwarScope` INSIDE the tx, assert it took, and
 * return the scope-bound handle. `setPariwarScope` re-parses `pariwarId` as a
 * strict UUID (throws `InvalidPariwarScopeError` on a bad value) — a second,
 * independent guard at the boundary (§1.2 "Session-variable re-parse"). On any
 * failure the client is rolled back + released so no half-open tx leaks.
 */
/**
 * The request role (architecture §1.2 two-role model). The scope tx runs as
 * `twt_app` explicitly so RLS applies regardless of the connection's login role:
 * in production the login role is already a `twt_app` member (so this is a no-op
 * strengthening); in local Docker/CI the login role is a superuser that would
 * otherwise BYPASS RLS — `SET LOCAL ROLE` sheds it so the policies are exercised
 * faithfully (the per-tx scope is reset on COMMIT/ROLLBACK — no role leak).
 */
const REQUEST_ROLE = 'twt_app';

export async function openScopeTx(deps: AppDeps, pariwarId: string): Promise<ScopeTx> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${REQUEST_ROLE}`); // run the request as twt_app (RLS applies)
    await setPariwarScope(client, pariwarId); // strict-UUID re-parse + SET LOCAL
    // Loud fail-closed confirmation + W9-CR1.6 tx-active guard (no-op SET LOCAL
    // outside a tx → empty read-back → throws PariwarScopeMissingError).
    await assertPariwarScopeSet(client);
    return {
      client,
      tx: bindScopedDb(client),
      pariwarId,
      scopeSet: true,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    throw err;
  }
}

/**
 * COMMIT (or ROLLBACK) the scope tx and release the client.
 *
 * ⚠ [Review][Patch] 2026-10-15 (Story 6.36a's review, BigDev: fix it now) — a FAILED COMMIT is RETHROWN. Until then every
 * COMMIT error (a deadlock or lock timeout at commit, a serialization failure, a dropped connection) was swallowed as *"a
 * broken connection on close"*, so every scope-tx handler answered 200 for a write that never landed — and an idempotent
 * route then recorded a replay saying "saved" for a row that is ⛔ there. The client is still released on every path; a
 * ROLLBACK failure stays non-fatal (there is nothing to lose); a second close of an already-closed tx is a no-op (the
 * provisioning route rolls back in its catch after a commit attempt — ⛔ a double release). ⚠ The no-op is keyed on
 * `closed`, ⛔ on `scopeSet`: the helpline write clears `scopeSet` FIRST and then closes (its COMMIT must still run).
 */
export async function closeScopeTx(scopeTx: ScopeTx, commit: boolean): Promise<void> {
  if (scopeTx.closed) return; // already closed (a caller's ROLLBACK after its own failed COMMIT)
  scopeTx.closed = true;
  scopeTx.scopeSet = false;
  try {
    await scopeTx.client.query(commit ? 'COMMIT' : 'ROLLBACK');
  } catch (err) {
    if (commit) throw err; // the write did ⛔ land — the caller must ⛔ report success
    // A ROLLBACK that fails on a broken connection is non-fatal — the client is destroyed on release.
  } finally {
    scopeTx.client.release();
  }
}

/**
 * Story 6.37b (DR7, I4; `2026-10-17-347`) — ONE transaction on a GLOBAL table (⛔ Pariwar: MSG91's delivery-report inbox)
 * as `twt_app` — `openScopeTx`'s shape WITHOUT `setPariwarScope` (a Pariwar-less write cannot use it). BEGIN → `SET LOCAL
 * ROLE twt_app` → `fn` → COMMIT; a FAILED COMMIT is RETHROWN as `closeScopeTx` does (⛔ a 2xx for a write that never
 * landed); any throw rolls back. The client is always released.
 *
 * DELIBERATE: no tenant scope is set for the authenticated provider's global, minimised report inbox. The callback
 * still runs as `twt_app`, so tenant-table RLS remains enforced. Re-examine this exception before using this helper
 * for another table, retaining member data in the inbox, or introducing tenant-specific provider accounts.
 */
export async function runGlobalAppTx<T>(pool: AppDeps['pool'], fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${REQUEST_ROLE}`);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

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

/** COMMIT (or ROLLBACK) the scope tx and release the client. Never throws. */
export async function closeScopeTx(scopeTx: ScopeTx, commit: boolean): Promise<void> {
  try {
    await scopeTx.client.query(commit ? 'COMMIT' : 'ROLLBACK');
  } catch {
    // A broken connection on close is non-fatal — the client is destroyed on release.
  } finally {
    scopeTx.scopeSet = false;
    scopeTx.client.release();
  }
}

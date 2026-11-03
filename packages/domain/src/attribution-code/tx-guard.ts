// The transaction-bound scope guard — Story 13.2 (Task 3a; AT8 v2 i). MODULE-PRIVATE: exported for the module's own files,
// ⛔ re-exported from `index.ts` (the export pin, tests/attribution-code/exports.test.ts).
//
// Every exported DB function of the module takes ONE checked-out `pg.PoolClient` — ⛔ a Drizzle `Db`, which may be pool-bound
// (`createDb().db` and `bindScopedDb(client)` share one type), so the scope check could run on one connection and the query on
// another. Order inside every function: PURE argument checks (⛔ statement) → THIS guard → the module's own SQL, all on the same
// `client`. ⛔ "Simplify" the scope-equality check away (TR4): a member handler opens its own scoped tx from whatever string it
// passes (G9a); only this check ties the lookup's Pariwar to the transaction's.

import type pg from 'pg';

import { assertPariwarScopeSet } from '../db.js';
import { pgSqlstateOf } from '../marketplace/errors.js';
import { AttributionCodeRequiresTransactionError, AttributionPariwarScopeMismatchError } from './errors.js';

/** "SAVEPOINT can only be used in transaction blocks" — the ONE probe error mapped; any other is rethrown (e.g. `25P02`). */
const NO_ACTIVE_SQL_TRANSACTION = '25P01';

/**
 * Prove `client` is one connection, inside a transaction block, scoped to `pariwarId`.
 *
 * @throws AttributionCodeRequiresTransactionError a `pg.Pool` (anything without `release`), or ⛔ `BEGIN` on the client.
 * @throws PariwarScopeMissingError / InvalidPariwarScopeError (from `assertPariwarScopeSet`) — scope unset / not a UUID.
 * @throws AttributionPariwarScopeMismatchError the scope is another Pariwar.
 */
export async function assertTxBoundScope(client: pg.PoolClient, pariwarId: string): Promise<void> {
  // (1) DUCK-TYPED — ⛔ `instanceof pg.Pool`: a VALUE import of `pg` is lint-banned outside `**/db.ts`.
  if (typeof (client as { release?: unknown }).release !== 'function') {
    throw new AttributionCodeRequiresTransactionError('not_a_client');
  }
  // (2) Inside a transaction block? Outside one Postgres refuses a SAVEPOINT with 25P01 — so a session-level
  // `SET app.pariwar_id` on a pooled connection cannot satisfy (3) without a BEGIN.
  try {
    await client.query('SAVEPOINT attribution_code_tx_guard');
  } catch (err) {
    if (pgSqlstateOf(err) === NO_ACTIVE_SQL_TRANSACTION) {
      throw new AttributionCodeRequiresTransactionError('no_transaction');
    }
    throw err;
  }
  await client.query('RELEASE SAVEPOINT attribution_code_tx_guard');
  // (3) The scope on THIS connection, then equality (lower-cased — a raw-string cast could differ in case).
  const scoped = await assertPariwarScopeSet(client);
  if (scoped.toLowerCase() !== pariwarId.toLowerCase()) {
    throw new AttributionPariwarScopeMismatchError(pariwarId, scoped);
  }
}

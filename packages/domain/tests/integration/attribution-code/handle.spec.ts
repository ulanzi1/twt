// The TRANSACTION-BOUND HANDLE rule — live-DB (Story 13.2, Task 6.1; AC7 / AC8; AT8 v2 i). For EACH exported DB function of the
// module: a `pg.Pool` ⇒ AttributionCodeRequiresTransactionError; a checked-out client with ⛔ BEGIN — even after a session-level
// `SET app.pariwar_id` — ⇒ AttributionCodeRequiresTransactionError (the SAVEPOINT probe); the scoped tx client ⇒ succeeds.
// ⚠ `setupLiveDb` keeps its pool private ⇒ this spec opens its OWN pool for the Pool and no-BEGIN legs, and DESTROYS the client
// it leaked a session GUC onto (`release(true)`) — ⛔ returned to a pool.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId, userId as toUserId } from '../../../src/ids/index.js';
import { attributionCode } from '../../../src/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { caught } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);

/** Each exported DB function, called with `handle` (cast past the type — the type test proves it does ⛔ compile). */
const CALLS: ReadonlyArray<[string, (handle: pg.PoolClient) => Promise<unknown>]> = [
  ['allocateAttributionCode', (h) => attributionCode.allocateAttributionCode(h, { pariwarId: A, fieldWorkerId: toFieldWorkerId(randomUUID()) })],
  ['resolveAttribution', (h) => attributionCode.resolveAttribution(h, { code: '482913', pariwarId: A, asOf: 'now' })],
  ['readAttributionCodeForFieldWorker', (h) => attributionCode.readAttributionCodeForFieldWorker(h, { pariwarId: A, fieldWorkerId: toFieldWorkerId(randomUUID()) })],
  ['flagAllocationExhausted', (h) => attributionCode.flagAllocationExhausted(h, { pariwarId: A, attempts: 8, actorId: toUserId(randomUUID()), actorDisplay: 'Asha Verma' })],
  ['listAllocationFlags', (h) => attributionCode.listAllocationFlags(h, { pariwarId: A })],
];

describe.skipIf(!hasDatabase)('transaction-bound handle (AT8 v2 i)', () => {
  setupLiveDb();
  let pool: pg.Pool | null = null;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('the function list covers every exported DB function of the namespace', () => {
    const fns = Object.entries(attributionCode)
      .filter(([k, v]) => typeof v === 'function' && !/Error$/.test(k))
      .map(([k]) => k)
      .filter((k) => !['generateAttributionCode', 'isDenylistedAttributionCode'].includes(k));
    expect(fns.sort()).toEqual(CALLS.map(([n]) => n).sort());
  });

  for (const [name, call] of CALLS) {
    it(`${name}: a pg.Pool ⇒ AttributionCodeRequiresTransactionError (not_a_client)`, async () => {
      const err = await caught(() => call(pool! as unknown as pg.PoolClient));
      expect(err).toBeInstanceOf(attributionCode.AttributionCodeRequiresTransactionError);
      expect(err).toMatchObject({ reason: 'not_a_client' });
    });

    it(`${name}: a client with ⛔ BEGIN, even after a session-level SET app.pariwar_id ⇒ AttributionCodeRequiresTransactionError (no_transaction)`, async () => {
      const c = await pool!.connect();
      try {
        await c.query(`SET app.pariwar_id = '${PARIWAR_A}'`);
        const err = await caught(() => call(c));
        expect(err).toBeInstanceOf(attributionCode.AttributionCodeRequiresTransactionError);
        expect(err).toMatchObject({ reason: 'no_transaction' });
      } finally {
        await c.query('RESET app.pariwar_id');
        c.release(true); // DESTROY — ⛔ a connection with a leaked session GUC back in a pool
      }
    });

    it(`${name}: the scoped tx client ⇒ succeeds`, async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(call(client)).resolves.not.toThrow();
    });
  }

  it('an ALREADY-ABORTED transaction: the probe error (25P02) is rethrown unchanged — ⛔ mapped to "no transaction"', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query('SAVEPOINT abort_me');
    await client.query('SELECT 1/0').catch(() => undefined);
    const err = await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: 'now' }));
    expect(err).not.toBeInstanceOf(attributionCode.AttributionCodeRequiresTransactionError);
    expect((err as { code?: string }).code).toBe('25P02');
    await client.query('ROLLBACK TO SAVEPOINT abort_me');
  });
});

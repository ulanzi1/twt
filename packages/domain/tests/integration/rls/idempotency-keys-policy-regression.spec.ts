// idempotency_keys RLS policy-regression integration tests — Story 1.12 (Task 7, DD-2).
//
// idempotency_keys is a GLOBAL, WRITABLE carve-out — the inverse of a SCOPED table
// like role_grants. There is NO pariwar_id dimension; the policy is a permissive ALL
// `USING(true) WITH CHECK(true)` TO twt_app, so any twt_app session may read AND
// write every key (callers namespace keys; isolation is a key-naming convention,
// not a row predicate). These assertions cover:
//   (a) USING(true): a twt_app session (no scope set) reads a globally-seeded key;
//   (b) WITH CHECK(true): a twt_app session INSERTs, UPDATEs, and DELETEs;
//   (c) ENABLE + FORCE RLS are both on (Story 1.6 regime-consistency).
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation
// (setupLiveDb); enforcement assertions `SET LOCAL ROLE twt_app` (enterAppRoleNoScope)
// to shed the Docker/CI superuser before asserting policy behaviour. No pariwar scope
// is set — the global carve-out does not depend on app.pariwar_id.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope } from '../_helpers.js';

async function seedKey(
  client: import('pg').PoolClient,
  key: string,
  status: 'pending' | 'completed' = 'pending',
): Promise<void> {
  // Seeded as the Docker superuser (BEFORE entering app role) so the row lands
  // regardless of policy; afterEach ROLLBACK (setupLiveDb) reverts it.
  await client.query(
    `INSERT INTO idempotency_keys (key, status, created_at, expires_at)
     VALUES ($1, $2, now(), now() + interval '60 seconds')`,
    [key, status],
  );
}

describe.skipIf(!hasDatabase)(
  'idempotency_keys RLS policy regression (global writable carve-out)',
  () => {
    setupLiveDb();

    it('(a) USING(true): a twt_app session reads any key (global — no tenant scope)', async () => {
      const { client } = getTx();
      const key = `rls:read:${randomUUID()}`;
      await seedKey(client, key);
      await enterAppRoleNoScope(client); // shed superuser, set NO scope

      const { rows } = await client.query('SELECT key FROM idempotency_keys WHERE key = $1', [key]);
      expect(rows).toHaveLength(1);
    });

    it('(b) WITH CHECK(true): a twt_app session INSERTs, UPDATEs, and DELETEs', async () => {
      const { client } = getTx();
      const key = `rls:write:${randomUUID()}`;
      await enterAppRoleNoScope(client);

      // INSERT under twt_app (WITH CHECK(true) admits it).
      await client.query(
        `INSERT INTO idempotency_keys (key, status, created_at, expires_at)
       VALUES ($1, 'pending', now(), now() + interval '60 seconds')`,
        [key],
      );

      const updated = await client.query(
        `UPDATE idempotency_keys SET status = 'completed', result = '{"ok":true}'::jsonb, completed_at = now() WHERE key = $1`,
        [key],
      );
      expect(updated.rowCount).toBe(1);

      const deleted = await client.query('DELETE FROM idempotency_keys WHERE key = $1', [key]);
      expect(deleted.rowCount).toBe(1);
    });

    it('FORCE RLS: idempotency_keys has rowsecurity AND forcerowsecurity enabled', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'idempotency_keys'`,
      );
      expect(rows[0]?.relrowsecurity).toBe(true);
      expect(rows[0]?.relforcerowsecurity).toBe(true);
    });
  },
);

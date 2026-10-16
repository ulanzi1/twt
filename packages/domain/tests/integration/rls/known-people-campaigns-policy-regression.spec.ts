// Migration 0164 — a Pariwar Admin's people-who-know-me campaigns (Story 6.36c, Task 1.1; AC7). Live DB; per-test
// ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the CHECKs: the window (at most 30 days INCLUSIVE — `ends_on - starts_on <= 29`, RV6; ⛔ an end before the start);
//     an end is dated AND attributed, or neither;
//   · the column grant: `twt_app` may change only the end's two columns; ⛔ DELETE;
//   · RLS: per-command policies, FORCE, a cross-tenant reader sees nothing, the fail-closed probe, WITH CHECK;
//   · the indexes (code review round 2): the `UNIQUE (pariwar_id, campaign_id)` and 0165's list index.
// The writer's overlap rule (the Pariwar advisory lock) is `tests/integration/member/known-people-campaigns.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

async function attempt(client: Client, text: string, params: unknown[] = []): Promise<{ code: string | null }> {
  await client.query('SAVEPOINT probe');
  try {
    await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    return { code: (err as { code?: string }).code ?? 'unknown' };
  }
}

const INSERT = `INSERT INTO known_people_campaigns (campaign_id, pariwar_id, started_by_actor_id, starts_on, ends_on, ended_at, ended_by_actor_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7)`;

function params(
  c: { pariwarId?: string; startsOn?: string; endsOn?: string; endedAt?: Date | null; endedBy?: string | null },
  id = randomUUID(),
): unknown[] {
  return [id, c.pariwarId ?? PARIWAR_A, randomUUID(), c.startsOn ?? '2026-11-01', c.endsOn ?? '2026-11-10', c.endedAt ?? null, c.endedBy ?? null];
}

describe.skipIf(!hasDatabase)('0164 — known_people_campaigns', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the window: at most 30 days INCLUSIVE; ⛔ an end before the start; a one-day campaign is allowed', async () => {
    const { client } = getTx();
    expect((await attempt(client, INSERT, params({ startsOn: '2026-11-01', endsOn: '2026-11-30' }))).code).toBeNull(); // 30 days
    expect((await attempt(client, INSERT, params({ startsOn: '2026-11-01', endsOn: '2026-12-01' }))).code).toBe('23514'); // 31
    expect((await attempt(client, INSERT, params({ startsOn: '2026-11-02', endsOn: '2026-11-01' }))).code).toBe('23514');
    expect((await attempt(client, INSERT, params({ startsOn: '2026-11-01', endsOn: '2026-11-01' }))).code).toBeNull();
  });

  it('an end is dated AND attributed, or neither', async () => {
    const { client } = getTx();
    expect((await attempt(client, INSERT, params({ endedAt: new Date() }))).code).toBe('23514');
    expect((await attempt(client, INSERT, params({ endedBy: randomUUID() }))).code).toBe('23514');
    expect((await attempt(client, INSERT, params({ endedAt: new Date(), endedBy: randomUUID() }))).code).toBeNull();
  });

  it('the column grant: twt_app changes ONLY the end; ⛔ DELETE / TRUNCATE', async () => {
    const { client } = getTx();
    const id = randomUUID();
    await client.query(INSERT, params({}, id));
    await client.query('SAVEPOINT scope');
    await enterAppScope(client, PARIWAR_A);
    for (const set of [`starts_on = '2026-11-02'`, `ends_on = '2026-11-09'`, `started_by_actor_id = gen_random_uuid()`, `pariwar_id = gen_random_uuid()`, `created_at = now()`]) {
      expect((await attempt(client, `UPDATE known_people_campaigns SET ${set} WHERE campaign_id = $1`, [id])).code, set).toBe('42501');
    }
    const end = await client.query(`UPDATE known_people_campaigns SET ended_at = now(), ended_by_actor_id = gen_random_uuid() WHERE campaign_id = $1`, [id]);
    expect(end.rowCount).toBe(1);
    expect((await attempt(client, `DELETE FROM known_people_campaigns WHERE campaign_id = $1`, [id])).code).toBe('42501');
    await client.query('ROLLBACK TO SAVEPOINT scope');
    const del = await client.query(
      `SELECT has_table_privilege('twt_app', 'known_people_campaigns', 'DELETE') AS d, has_table_privilege('twt_app', 'known_people_campaigns', 'TRUNCATE') AS t`,
    );
    expect(del.rows[0]).toEqual({ d: false, t: false });
  });

  it('RLS is ENABLED + FORCED; per-command policies; ⛔ FK', async () => {
    const { client } = getTx();
    const { rows } = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'known_people_campaigns'`);
    expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query(`SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'known_people_campaigns'::regclass ORDER BY polname`);
    expect(pol.rows.map((r) => `${r.polname}:${r.polcmd}`)).toEqual([
      'known_people_campaigns_tenant_isolation_insert:a',
      'known_people_campaigns_tenant_isolation_select:r',
      'known_people_campaigns_tenant_isolation_update:w',
    ]);
    const fks = await client.query(`SELECT 1 FROM pg_constraint WHERE contype = 'f' AND conrelid = 'known_people_campaigns'::regclass`);
    expect(fks.rows).toHaveLength(0);
  });

  it('the indexes (family 5 — code review round 2): `UNIQUE (pariwar_id, campaign_id)`; the list index on its sort (0165); ⛔ 0164\'s `ends_on` index', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'known_people_campaigns' ORDER BY indexname`,
    );
    expect(rows.map((r) => r.indexname)).toEqual([
      'known_people_campaigns_pariwar_campaign_uq',
      'known_people_campaigns_pariwar_created_idx',
      'known_people_campaigns_pkey',
    ]);
    const def = (n: string) => rows.find((r) => r.indexname === n)!.indexdef;
    expect(def('known_people_campaigns_pariwar_created_idx')).toMatch(/USING btree \(pariwar_id, created_at DESC, campaign_id DESC\)$/);
    expect(def('known_people_campaigns_pariwar_campaign_uq')).toMatch(/^CREATE UNIQUE INDEX .* USING btree \(pariwar_id, campaign_id\)$/);
    const uq = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'known_people_campaigns'::regclass AND contype = 'u'`,
    );
    expect(uq.rows.map((r) => r.def)).toEqual(['UNIQUE (pariwar_id, campaign_id)']);
  });

  it('a cross-tenant reader sees nothing; the unscoped probe sees nothing; WITH CHECK refuses another Pariwar', async () => {
    const { client } = getTx();
    const id = randomUUID();
    await client.query(INSERT, params({}, id));
    await client.query('SAVEPOINT scope');
    await enterAppScope(client, PARIWAR_B);
    expect((await client.query(`SELECT 1 FROM known_people_campaigns WHERE campaign_id = $1`, [id])).rows).toHaveLength(0);
    const upd = await client.query(`UPDATE known_people_campaigns SET ended_at = now(), ended_by_actor_id = gen_random_uuid() WHERE campaign_id = $1`, [id]);
    expect(upd.rowCount).toBe(0);
    expect((await attempt(client, INSERT, params({ pariwarId: PARIWAR_A }))).code).toBe('42501');
    await client.query('ROLLBACK TO SAVEPOINT scope');
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM known_people_campaigns WHERE campaign_id = $1`, [id])).rows).toHaveLength(0);
  });
});

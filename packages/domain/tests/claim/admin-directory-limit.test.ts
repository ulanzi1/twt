// The admin directory's bound — Story 6.19b (fifth-pass review, K3). BEHAVIOUR, ⛔ not source text: a fake `Db` that
// records the fetched bound and returns that many of N active holders. Exactly 50 holders ⇒ all 50, ⛔ not truncated;
// 51 ⇒ the first 50 and `truncated`. (The live 50 / 51 legs are the integration suite's.)

import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import { ADMIN_DIRECTORY_LIMIT, listAdminsByRole } from '../../src/claim/admin-directory.js';
import type { PariwarId } from '../../src/ids/index.js';

const PARIWAR = '00000000-0000-4000-8000-000000000001' as PariwarId;

/** A query-builder stand-in: every builder step chains; `.limit(n)` resolves the first `n` of `holders`. */
function fakeDb(holders: number): { readonly db: Db; readonly limits: number[] } {
  const limits: number[] = [];
  const rows = Array.from({ length: holders }, (_, i) => ({
    userId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    displayName: `Admin ${i}`,
  }));
  const chain: Record<string, unknown> = {};
  for (const step of ['selectDistinct', 'from', 'innerJoin', 'where', 'orderBy']) chain[step] = () => chain;
  chain.limit = (n: number) => {
    limits.push(n);
    return Promise.resolve(rows.slice(0, n));
  };
  return { db: chain as unknown as Db, limits };
}

describe('listAdminsByRole — the 50-holder bound', () => {
  it('fetches ONE MORE than it returns', async () => {
    const { db, limits } = fakeDb(0);
    await listAdminsByRole(db, PARIWAR, 'pariwar_admin');
    expect(limits).toEqual([ADMIN_DIRECTORY_LIMIT + 1]);
  });

  it('exactly 50 holders ⇒ all 50, ⛔ not truncated', async () => {
    const { db } = fakeDb(50);
    const res = await listAdminsByRole(db, PARIWAR, 'pariwar_admin');
    expect(res.entries).toHaveLength(50);
    expect(res.truncated).toBe(false);
  });

  it('51 holders ⇒ the first 50 and `truncated`', async () => {
    const { db } = fakeDb(51);
    const res = await listAdminsByRole(db, PARIWAR, 'pariwar_admin');
    expect(res.entries).toHaveLength(50);
    expect(res.entries.at(-1)?.displayName).toBe('Admin 49');
    expect(res.truncated).toBe(true);
  });

  it('49 holders ⇒ all 49, ⛔ not truncated', async () => {
    const { db } = fakeDb(49);
    const res = await listAdminsByRole(db, PARIWAR, 'district_admin', { dimension: 'district', value: null });
    expect(res.entries).toHaveLength(49);
    expect(res.truncated).toBe(false);
  });
});

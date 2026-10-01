// The ADMIN DIRECTORY's bound — live DB (Story 6.19b, Task 6; AC4; fifth-pass review, 2026-10-01). `listAdminsByRole`
// returns at most `ADMIN_DIRECTORY_LIMIT` (50) holders and sets `truncated` ONLY when MORE exist: it fetches one extra
// row to tell "exactly 50" (⛔ truncated — the old `>= 50` cried wolf) from "51 or more" (truncated — the sweep alarms).
// ⭐ Through the REAL query (`role_grants ⋈ users`, the filters, the ordering, the fetched bound) — the unit test pins
// the same behaviour on a fake `Db`; this one proves the SQL the fake stands in for.
// Per-test ROLLBACK (`setupLiveDb`); each test seeds a FRESH Pariwar id (⛔ `pariwar_id` has no FK), so ⛔ no committed
// grant of another spec can count towards the bound.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ADMIN_DIRECTORY_LIMIT, listAdminsByRole } from '../../../src/claim/index.js';
import { pariwarId as toPariwarId, userId as toUserId } from '../../../src/ids/index.js';
import type { PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

/** One staff user + one grant (as the superuser, before entering app scope). Returns the user id. */
async function seedHolder(
  tx: Tx,
  pariwarId: PariwarId,
  opts: {
    readonly status?: 'active' | 'suspended';
    readonly displayName?: string | null;
    readonly scope?: 'pariwar' | 'state';
    readonly role?: 'pariwar_admin' | 'district_admin';
  } = {},
): Promise<string> {
  const id = randomUUID();
  await tx.insert(schema.users).values({
    id: toUserId(id),
    identityType: 'admin',
    status: opts.status ?? 'active',
    displayName: opts.displayName === undefined ? `Pariwar Admin ${id.slice(0, 8)}` : opts.displayName,
  });
  await tx.insert(schema.roleGrants).values({
    userId: toUserId(id),
    pariwarId,
    role: opts.role ?? 'pariwar_admin',
    scopeDimension: opts.scope ?? 'pariwar',
    scopeValue: opts.scope === 'state' ? 'Bihar' : pariwarId,
  });
  return id;
}

/** `n` qualifying Pariwar Admins, plus DECOYS the filters must drop (so they can ⛔ never push the count over). */
async function seedPariwar(tx: Tx, n: number): Promise<{ readonly pariwarId: PariwarId; readonly holders: string[] }> {
  const pariwarId = toPariwarId(randomUUID());
  const holders: string[] = [];
  for (let i = 0; i < n; i++) holders.push(await seedHolder(tx, pariwarId));
  await seedHolder(tx, pariwarId, { status: 'suspended' });
  await seedHolder(tx, pariwarId, { displayName: '  ' });
  await seedHolder(tx, pariwarId, { scope: 'state' });
  await seedHolder(tx, pariwarId, { role: 'district_admin' });
  await seedHolder(tx, toPariwarId(randomUUID())); // another Pariwar's
  return { pariwarId, holders: holders.sort() };
}

describe.skipIf(!hasDatabase)('the admin directory — the 50-holder bound (`truncated` only past it)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the bound is 50', () => {
    expect(ADMIN_DIRECTORY_LIMIT).toBe(50);
  });

  it('⭐ EXACTLY 50 active Pariwar-wide holders ⇒ all 50, ⛔ not truncated', async () => {
    const { tx, client } = getTx();
    const { pariwarId, holders } = await seedPariwar(tx, 50);
    await enterAppScope(client, pariwarId);
    const r = await listAdminsByRole(tx, pariwarId, 'pariwar_admin');
    expect(r.truncated).toBe(false);
    expect(r.entries.map((e) => e.userId)).toEqual(holders);
  });

  it('⭐ 51 holders ⇒ the FIRST 50 by user id (⛔ the 51st), truncated', async () => {
    const { tx, client } = getTx();
    const { pariwarId, holders } = await seedPariwar(tx, 51);
    await enterAppScope(client, pariwarId);
    const r = await listAdminsByRole(tx, pariwarId, 'pariwar_admin');
    expect(r.truncated).toBe(true);
    expect(r.entries).toHaveLength(50);
    expect(r.entries.map((e) => e.userId)).toEqual(holders.slice(0, 50));
  });
});

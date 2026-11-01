// Story 12.2 (`2026-11-01-433` QE3 (A); AC1, AC3 domain leg) — the per-Pariwar partner registry: `createPartner`,
// `listPartnersForPariwar` (A–Z by lower(display_name_en)), `getPartner` (tenant-isolated), and the case-insensitive
// English-name unique. Live DB, one rolled-back transaction per test, each in a FRESH `randomUUID()` Pariwar (there is
// ⛔ `pariwars` table, so any UUID is a tenant) — own-committing specs commit partners under PARIWAR_A (TR20).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId, partnerId as toPartnerId } from '../../../src/ids/index.js';
import { uniqueViolationConstraint } from '../../../src/marketplace/errors.js';
import {
  PARTNER_NAME_EN_UNIQUE_CONSTRAINT,
  createPartner,
  getPartner,
  listPartnersForPariwar,
  parsePartnerDisplayNames,
} from '../../../src/marketplace/partners.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

async function register(client: pg.PoolClient, pariwar: string, en: string, hi = 'साझेदार') {
  const names = parsePartnerDisplayNames({ displayNameEn: en, displayNameHi: hi });
  return createPartner(client, {
    ...names,
    pariwarId: toPariwarId(pariwar),
    partnerId: toPartnerId(randomUUID()),
    actorId: randomUUID(),
    auditId: randomUUID(),
  });
}

describe.skipIf(!hasDatabase)('marketplace partners (Story 12.2 AC3)', () => {
  setupLiveDb();

  it('createPartner stores the parsed names, the actor and the audit id; getPartner reads it back', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    const actorId = randomUUID();
    const auditId = randomUUID();
    const id = toPartnerId(randomUUID());
    const row = await createPartner(client, {
      ...parsePartnerDisplayNames({ displayNameEn: ' LIC ', displayNameHi: ' एलआईसी ' }),
      pariwarId: toPariwarId(p),
      partnerId: id,
      actorId,
      auditId,
    });
    expect(row).toMatchObject({ partnerId: id, pariwarId: p, displayNameEn: 'LIC', displayNameHi: 'एलआईसी', createdByActorId: actorId, auditId });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(await getPartner(bindScopedDb(client), toPariwarId(p), id)).toEqual(row);
  });

  it('lists A–Z by lower(display_name_en), case-insensitively (⛔ byte order), and only this Pariwar', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const other = randomUUID();
    await enterAppScope(client, other);
    const foreign = await register(client, other, 'Aardvark Bank');
    await enterAppScope(client, p);
    const b = await register(client, p, 'beta Insurance');
    const a = await register(client, p, 'Alpha Bank');
    const c = await register(client, p, 'Gamma camp');
    const rows = await listPartnersForPariwar(bindScopedDb(client), toPariwarId(p));
    expect(rows.map((r) => r.partnerId)).toEqual([a.partnerId, b.partnerId, c.partnerId]);
    expect(rows.some((r) => r.partnerId === foreign.partnerId)).toBe(false);
    // limit is clamped (⛔ LIMIT 0 / -1 = all rows).
    expect(await listPartnersForPariwar(bindScopedDb(client), toPariwarId(p), { limit: 2 })).toHaveLength(2);
    expect(await listPartnersForPariwar(bindScopedDb(client), toPariwarId(p), { limit: -1 })).toHaveLength(1);
  });

  it('another Pariwar’s partner reads as null under twt_app (RLS — the explicit predicate is the RLS-bypassed test below)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const other = randomUUID();
    await enterAppScope(client, other);
    const foreign = await register(client, other, 'HDFC');
    await enterAppScope(client, p);
    const db = bindScopedDb(client);
    expect(await getPartner(db, toPariwarId(p), foreign.partnerId)).toBeNull();
    expect(await getPartner(db, toPariwarId(other), foreign.partnerId)).toBeNull(); // RLS hides it under scope p
  });

  // 12.2 code review round 2 (RP37): under twt_app, RLS alone hides the other Pariwar's row, so the explicit
  // `pariwar_id` predicate in getPartner / listPartnersForPariwar could be deleted with the suite green. Here RLS is
  // BYPASSED (the test's own superuser — the jobs login's shape): only the predicate is left to refuse.
  it('RP37: getPartner and listPartnersForPariwar keep their explicit pariwar_id predicate with RLS bypassed', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const other = randomUUID();
    await enterAppScope(client, other);
    const foreign = await register(client, other, 'Aardvark Bank');
    await enterAppScope(client, p);
    const own = await register(client, p, 'Beta Bank');

    await client.query('RESET ROLE');
    const bypass = await client.query<{ bypass: boolean }>(
      'SELECT (rolsuper OR rolbypassrls) AS bypass FROM pg_roles WHERE rolname = current_user',
    );
    expect(bypass.rows[0]!.bypass, 'the test role must bypass RLS, or this leg isolates nothing').toBe(true);

    const db = bindScopedDb(client);
    expect(await getPartner(db, toPariwarId(p), foreign.partnerId)).toBeNull();
    expect(await getPartner(db, toPariwarId(other), own.partnerId)).toBeNull();
    expect((await getPartner(db, toPariwarId(other), foreign.partnerId))?.partnerId).toBe(foreign.partnerId); // positive control
    expect((await listPartnersForPariwar(db, toPariwarId(p))).map((r) => r.partnerId)).toEqual([own.partnerId]);
  });

  it('"LIC" then "lic" in ONE Pariwar → 23505 marketplace_partners_pariwar_name_en_unique; another Pariwar may reuse it', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await register(client, p, 'LIC');
    await client.query('SAVEPOINT dup');
    let caught: unknown;
    try {
      await register(client, p, 'lic');
    } catch (e) {
      caught = e;
    }
    await client.query('ROLLBACK TO SAVEPOINT dup');
    expect(PARTNER_NAME_EN_UNIQUE_CONSTRAINT).toBe('marketplace_partners_pariwar_name_en_unique');
    expect(uniqueViolationConstraint(caught)).toBe(PARTNER_NAME_EN_UNIQUE_CONSTRAINT);

    const other = randomUUID();
    await enterAppScope(client, other);
    await expect(register(client, other, 'LIC')).resolves.toMatchObject({ displayNameEn: 'LIC' });
  });
});

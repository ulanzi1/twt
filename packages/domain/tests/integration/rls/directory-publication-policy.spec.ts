// `pariwar_directory_publication` migration/RLS policy-regression — code review, Story 11a.3
// (2026-08-21, D3).
//
// Live DB only. Mirrors `public-name-presentation-policy.spec.ts` exactly — same SYMMETRIC
// coverage every sibling config table gets (the 6.15 review lesson): cross-tenant SELECT
// isolation, the connection-level fail-closed probe, the FORCE-RLS catalog guard, and the
// one-row-per-Pariwar unique (23505) — plus a live proof that the kill switch flips and flips
// back through the real governed write path.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  UngovernedDirectoryPublicationChangeError,
  getDirectoryPublicationRow,
  resolveDirectoryPublicationEnabled,
  setDirectoryPublicationEnabled,
} from '../../../src/member/directory-publication.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** A well-formed governed write — including an actual `super_admin` grant carrying the key. */
function governed(pariwarId: string, enabled: boolean) {
  return {
    pariwarId: pariwarId as never,
    enabled,
    changedByActor: randomUUID() as never,
    changedByDisplay: 'Kalpana Bharti',
    rationale: 'Trustee Panel direction, code review 2026-08-21 D3.',
    auditId: randomUUID(),
    actorGrants: [
      { pariwarId, role: 'super_admin', scopeDimension: 'global' as const, scopeValue: null },
    ],
  };
}

describe.skipIf(!hasDatabase)('pariwar_directory_publication — RLS + governed write', () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
      ['pariwar_directory_publication'],
    );
    expect(rls.rows).toHaveLength(1);
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
    expect(rls.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('an UNSET scope reads zero rows (the Story 1.6 closed-failure construct)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setDirectoryPublicationEnabled(tx, governed(PARIWAR_A, false));

    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await getDirectoryPublicationRow(tx, PARIWAR_A as never)).toBeNull();
  });

  it("⛔ a Pariwar cannot read ANOTHER Pariwar's flag (cross-tenant isolation)", async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setDirectoryPublicationEnabled(tx, governed(PARIWAR_A, false));

    await enterAppScope(client, PARIWAR_B);
    expect(await getDirectoryPublicationRow(tx, PARIWAR_A as never)).toBeNull();
  });

  it('enforces ONE row per Pariwar (23505 on a raw duplicate insert)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarDirectoryPublication).values({ pariwarId: PARIWAR_A as never });
    await expect(
      tx.insert(schema.pariwarDirectoryPublication).values({ pariwarId: PARIWAR_A as never }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('an ABSENT row resolves to ENABLED — ⛔ not to a fail-closed shield', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await resolveDirectoryPublicationEnabled(tx, PARIWAR_A as never)).toBe(true);
  });

  it('the DB column default is `true` (the shipped posture, at the schema level too)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const [row] = await tx
      .insert(schema.pariwarDirectoryPublication)
      .values({ pariwarId: PARIWAR_A as never })
      .returning();
    expect(row?.enabled).toBe(true);
  });

  it('⭐ THE FLIP IS REAL AND REVERSIBLE — persisted, and the resolver follows', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    expect(await resolveDirectoryPublicationEnabled(tx, PARIWAR_A as never)).toBe(true);

    await setDirectoryPublicationEnabled(tx, governed(PARIWAR_A, false));
    expect(await resolveDirectoryPublicationEnabled(tx, PARIWAR_A as never)).toBe(false);

    // ⛔ Not a one-way ratchet.
    await setDirectoryPublicationEnabled(tx, governed(PARIWAR_A, true));
    expect(await resolveDirectoryPublicationEnabled(tx, PARIWAR_A as never)).toBe(true);

    // And the upsert stayed one row, not three.
    const rows = await tx.select().from(schema.pariwarDirectoryPublication);
    expect(rows.filter((r) => r.pariwarId === PARIWAR_A)).toHaveLength(1);
  });

  it('the governed write RECORDS who, why, and the audit anchor', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const input = governed(PARIWAR_A, false);
    const row = await setDirectoryPublicationEnabled(tx, input);
    expect(row.changedByActor).toBe(input.changedByActor);
    expect(row.changedByDisplay).toBe('Kalpana Bharti');
    expect(row.rationale).toMatch(/2026-08-21/);
    expect(row.auditId).toBe(input.auditId);
  });

  it('NEGATIVE CONTROL — ⛔ refuses a change with NO rationale (it is a governed act)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, { ...governed(PARIWAR_A, false), rationale: '  ' }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses a change with NO audit anchor', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, { ...governed(PARIWAR_A, false), auditId: null }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses an attributed change with no actor display name', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, { ...governed(PARIWAR_A, false), changedByDisplay: null }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses an attributed change with NO actor grants', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, { ...governed(PARIWAR_A, false), actorGrants: [] }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses an actor holding EVERY other pariwar-dimension key but not this one (pariwar_admin)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, {
        ...governed(PARIWAR_A, false),
        actorGrants: [
          { pariwarId: PARIWAR_A, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A },
        ],
      }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses a null-actor write that carries a non-null display name', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, {
        pariwarId: PARIWAR_A as never,
        enabled: false,
        changedByActor: null,
        changedByDisplay: 'Kalpana Bharti',
        rationale: 'Seed data for a fresh Pariwar.',
        auditId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(UngovernedDirectoryPublicationChangeError);
  });

  it('a `super_admin` grant authorises the change (the positive case the negative controls contrast against)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, governed(PARIWAR_A, false)),
    ).resolves.toBeDefined();
  });

  it('a system/seed write (changedByActor: null) skips the permission check — no actor to authorize', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDirectoryPublicationEnabled(tx, {
        pariwarId: PARIWAR_A as never,
        enabled: false,
        changedByActor: null,
        changedByDisplay: null,
        rationale: 'Seed data for a fresh Pariwar.',
        auditId: randomUUID(),
      }),
    ).resolves.toBeDefined();
  });
});

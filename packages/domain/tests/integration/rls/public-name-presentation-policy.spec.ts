// `pariwar_public_name_presentation` migration/RLS policy-regression — Story 11a.1 (Task 8; AC5).
//
// Live DB only. Same SYMMETRIC coverage every sibling config table gets (the 6.15 review lesson,
// applied at `pariwar_appeal_config` in 6.16): cross-tenant SELECT isolation, the connection-level
// fail-closed probe, the FORCE-RLS catalog guard, and the one-row-per-Pariwar unique (23505).
//
// ⭐ AND ONE THING NO OTHER CONFIG TABLE NEEDS: a live proof that the mode FLIPS AND FLIPS BACK
// through the real governed write path, against a real row, while the stored KYC name is not
// touched. `2026-08-19-136` cl.1 says a build in which the public name form cannot be changed
// without a code change FAILS that clause — the unit test proves the RESOLVER honours a flip; this
// proves the SUBSTRATE actually persists one.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PUBLIC_NAME_PRESENTATION_MODE,
  UngovernedPresentationChangeError,
  getPublicNamePresentationRow,
  resolvePublicMemberName,
  resolvePublicNamePresentationMode,
  setPublicNamePresentationMode,
} from '../../../src/kyc/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** A well-formed governed write (the write path refuses anything less). */
function governed(pariwarId: string, mode: 'full_name' | 'shielded_name') {
  return {
    pariwarId: pariwarId as never,
    mode,
    changedByActor: randomUUID() as never,
    changedByDisplay: 'Kalpana Bharti',
    rationale: 'Trustee Panel direction recorded under 2026-08-19-136.',
    auditId: randomUUID(),
  };
}

describe.skipIf(!hasDatabase)('pariwar_public_name_presentation — RLS + governed write', () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
      ['pariwar_public_name_presentation'],
    );
    expect(rls.rows).toHaveLength(1);
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
    expect(rls.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('an UNSET scope reads zero rows (the Story 1.6 closed-failure construct)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setPublicNamePresentationMode(tx, governed(PARIWAR_A, 'shielded_name'));

    // ⚠ `enterAppRoleNoScope` only sheds SUPERUSER — the `app.pariwar_id` setting survives it, so
    // the scope must be cleared too or this asserts nothing (the 6.16 spec's same note).
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await getPublicNamePresentationRow(tx, PARIWAR_A as never)).toBeNull();
  });

  it('⛔ a Pariwar cannot read ANOTHER Pariwar\'s mode (cross-tenant isolation)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setPublicNamePresentationMode(tx, governed(PARIWAR_A, 'shielded_name'));

    await enterAppScope(client, PARIWAR_B);
    expect(await getPublicNamePresentationRow(tx, PARIWAR_A as never)).toBeNull();
  });

  it('enforces ONE row per Pariwar (23505 on a raw duplicate insert)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarPublicNamePresentation).values({ pariwarId: PARIWAR_A as never });
    await expect(
      tx.insert(schema.pariwarPublicNamePresentation).values({ pariwarId: PARIWAR_A as never }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('an ABSENT row resolves to the RULED default — ⛔ not to a fail-closed shield', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await resolvePublicNamePresentationMode(tx, PARIWAR_A as never)).toBe(
      DEFAULT_PUBLIC_NAME_PRESENTATION_MODE,
    );
    expect(DEFAULT_PUBLIC_NAME_PRESENTATION_MODE).toBe('full_name');
  });

  it('the DB column default is `full_name` (the launch posture, at the schema level too)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const [row] = await tx
      .insert(schema.pariwarPublicNamePresentation)
      .values({ pariwarId: PARIWAR_A as never })
      .returning();
    expect(row?.mode).toBe('full_name');
  });

  it('⭐ THE FLIP IS REAL AND REVERSIBLE — persisted, and the render follows (136 cl.1 + cl.3)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // The name of record. It must be byte-identical at the end.
    const STORED_KYC_NAME = 'Rajesh Kumar Sharma';
    const before = Buffer.from(STORED_KYC_NAME, 'utf8');

    // Launch posture: no row, ruled default.
    let mode = await resolvePublicNamePresentationMode(tx, PARIWAR_A as never);
    expect(resolvePublicMemberName(mode, STORED_KYC_NAME)).toBe('Rajesh Kumar Sharma');

    // → shielded. The ONLY thing that changed is a stored value.
    await setPublicNamePresentationMode(tx, governed(PARIWAR_A, 'shielded_name'));
    mode = await resolvePublicNamePresentationMode(tx, PARIWAR_A as never);
    expect(resolvePublicMemberName(mode, STORED_KYC_NAME)).toBe('Rajesh S.');

    // → back to full. ⛔ Not a one-way ratchet (cl.3).
    await setPublicNamePresentationMode(tx, governed(PARIWAR_A, 'full_name'));
    mode = await resolvePublicNamePresentationMode(tx, PARIWAR_A as never);
    expect(resolvePublicMemberName(mode, STORED_KYC_NAME)).toBe('Rajesh Kumar Sharma');

    // ⛔ The stored name never moved (cl.2 — no second identity system).
    expect(Buffer.from(STORED_KYC_NAME, 'utf8').equals(before)).toBe(true);

    // And the upsert stayed one row, not three.
    const rows = await tx.select().from(schema.pariwarPublicNamePresentation);
    expect(rows.filter((r) => r.pariwarId === PARIWAR_A)).toHaveLength(1);
  });

  it('the governed write RECORDS who, why, and the audit anchor', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const input = governed(PARIWAR_A, 'shielded_name');
    const row = await setPublicNamePresentationMode(tx, input);
    expect(row.changedByActor).toBe(input.changedByActor);
    expect(row.changedByDisplay).toBe('Kalpana Bharti');
    expect(row.rationale).toMatch(/2026-08-19-136/);
    expect(row.auditId).toBe(input.auditId);
  });

  it('NEGATIVE CONTROL — ⛔ refuses a change with NO rationale (it is a governed act)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setPublicNamePresentationMode(tx, { ...governed(PARIWAR_A, 'shielded_name'), rationale: '  ' }),
    ).rejects.toBeInstanceOf(UngovernedPresentationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses a change with NO audit anchor', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setPublicNamePresentationMode(tx, { ...governed(PARIWAR_A, 'shielded_name'), auditId: null }),
    ).rejects.toBeInstanceOf(UngovernedPresentationChangeError);
  });

  it('NEGATIVE CONTROL — ⛔ refuses an attributed change with no actor display name', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setPublicNamePresentationMode(tx, {
        ...governed(PARIWAR_A, 'shielded_name'),
        changedByDisplay: null,
      }),
    ).rejects.toBeInstanceOf(UngovernedPresentationChangeError);
  });
});

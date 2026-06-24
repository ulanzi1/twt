// consent_records RLS policy-regression — Story 2.7 (Task 2). Mirrors
// terms-and-conditions-policy-regression: positive (allowed query returns expected
// rows) + negative (forbidden query empty / raises) assertions for the
// tenant-isolation policies, the connection-level fail-closed probe, and the
// FORCE-RLS catalog regression guard. Live DB only.

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedConsentRecord,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('consent_records RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A consent rows', async () => {
    const { tx, client } = getTx();
    await seedConsentRecord(tx, PARIWAR_A);
    await seedConsentRecord(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.consentRecords);
    expect(rows).not.toHaveLength(0); // guard: RLS returning empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A consent rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    await seedConsentRecord(tx, PARIWAR_A);
    await seedConsentRecord(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.consentRecords);
    expect(rows).not.toHaveLength(0); // B's own seeded row is visible
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.consentRecords)
      .values({
        subjectId: '77777777-7777-7777-7777-777777777777',
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        consentType: 'marketing',
        grantedViaActor: 'member_self',
        consentPayload: {},
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedConsentRecord(tx, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.consentRecords);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: consent_records has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'consent_records'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});

// `pariwar_nominee_bank_masking_schedule` migration/RLS policy-regression — Story 11b.3a,
// SECOND-PASS code review (2026-09-03), load-bearing-invariant checklist family 5.
//
// ⭐⭐ WHY THIS FILE EXISTS. `claim/nominee-bank-masking-policy.ts` states that it is the THIRD
// application of the 11a.1 accountability shape — after `kyc/presentation-policy.ts` and
// `member/directory-publication.ts`. Both of those ship a dedicated policy-regression spec whose
// first two tests are the FORCE-RLS catalog guard and the Story 1.6 unset-scope closed-failure
// construct. This table shipped with neither, and its own integration spec
// (`../claim/nominee-bank-masking-schedule.spec.ts`) asserts behaviour through the accessors:
// cross-tenant reads and the setting CHECK, but ⛔ never the DB-level backstops directly.
//
// ⛔ THE GAP WAS NOT THEORETICAL. `getNomineeBankMaskingHead` takes `.limit(1)` with ⛔ no `ORDER BY`
// and is deterministic ONLY because the partial unique index guarantees at most one open head; the
// write path reasons from that index in prose ("a half-applied pair is a constraint violation, not a
// silent partial state"). Drop the index and two open heads coexist: the console shows a setting the
// Trust did not choose and the PUBLIC resolver can pick the other — serving a FULL ACCOUNT NUMBER on
// a Pariwar that configured `permanent`. Every pre-existing test stays green through that, because
// none of them ever creates two open heads.
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — never inferred through a higher-level accessor, which is
// the whole point of family 5 (*"never only inferred through higher-level tests"*).
//
// Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { setNomineeBankMaskingSchedule } from '../../../src/claim/nominee-bank-masking-policy.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const TABLE = 'pariwar_nominee_bank_masking_schedule';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** A well-formed governed write — including an actual `super_admin` grant carrying the key. */
function governed(pariwarId: string, effectiveFrom: Date) {
  return {
    pariwarId: pariwarId as never,
    setting: { mode: 'after_days' as const, maskAfterDays: 30 },
    effectiveFrom,
    changedByActor: randomUUID() as never,
    changedByDisplay: 'Kalpana Bharti',
    rationale: 'Policy-regression fixture, second-pass code review 2026-09-03.',
    auditId: randomUUID(),
    actorGrants: [
      { pariwarId, role: 'super_admin', scopeDimension: 'global' as const, scopeValue: null },
    ],
  };
}

/** A raw row, bypassing the accessor — this file tests the DB, not the write path. */
function rawRow(pariwarId: string, version: number, from: Date, until: Date | null) {
  return {
    pariwarId: pariwarId as never,
    version,
    maskingMode: 'after_days' as const,
    maskAfterDays: 30,
    effectiveFrom: from,
    effectiveUntil: until,
    changedByActor: null,
    changedByDisplay: null,
    rationale: 'raw fixture',
    auditId: randomUUID(),
  };
}

describe.skipIf(!hasDatabase)(`${TABLE} — RLS + DB-level backstops`, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
      [TABLE],
    );
    expect(rls.rows).toHaveLength(1);
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
    // ⛔ FORCE, ⛔ not merely ENABLE: without it the table owner bypasses every policy below.
    expect(rls.rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('an UNSET scope reads zero rows (the Story 1.6 closed-failure construct)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setNomineeBankMaskingSchedule(tx, governed(PARIWAR_A, new Date()));

    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.pariwarNomineeBankMaskingSchedule);
    expect(rows).toEqual([]);
  });

  it("⛔ a Pariwar cannot read ANOTHER Pariwar's schedule (cross-tenant SELECT isolation)", async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setNomineeBankMaskingSchedule(tx, governed(PARIWAR_A, new Date()));

    await enterAppScope(client, PARIWAR_B);
    const rows = await tx.select().from(schema.pariwarNomineeBankMaskingSchedule);
    expect(rows).toEqual([]);
  });

  it("⛔ a Pariwar cannot WRITE another Pariwar's schedule (the RLS withCheck negative)", async () => {
    // ⚠ The negative half of a SYMMETRIC policy. A read-only assertion would pass even if the write
    // policy's WITH CHECK had been dropped — and a tenant able to INSERT another tenant's masking
    // window can un-mask that tenant's bank details.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      tx
        .insert(schema.pariwarNomineeBankMaskingSchedule)
        .values(rawRow(PARIWAR_B, 1, new Date(), null)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ enforces AT MOST ONE OPEN HEAD per Pariwar (23505 on a second `effective_until IS NULL`)', async () => {
    // ⛔⛔ THE LOAD-BEARING ONE. `getNomineeBankMaskingHead` takes `.limit(1)` with NO `ORDER BY`, so
    // its determinism IS this index. Two open heads ⇒ the admin console and the public resolver can
    // disagree about which setting is in force, and on a `permanent` Pariwar the losing branch serves
    // a full account number.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();
    await tx
      .insert(schema.pariwarNomineeBankMaskingSchedule)
      .values(rawRow(PARIWAR_A, 1, now, null));
    await expect(
      tx
        .insert(schema.pariwarNomineeBankMaskingSchedule)
        .values(rawRow(PARIWAR_A, 2, new Date(now.getTime() + 1000), null)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('enforces a (pariwar_id, version) pair allocated exactly once (23505)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();
    // The first is CLOSED, so the open-head index above is not what rejects the second.
    await tx
      .insert(schema.pariwarNomineeBankMaskingSchedule)
      .values(rawRow(PARIWAR_A, 1, now, new Date(now.getTime() + 1000)));
    await expect(
      tx
        .insert(schema.pariwarNomineeBankMaskingSchedule)
        .values(rawRow(PARIWAR_A, 1, now, new Date(now.getTime() + 2000))),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⭐ the window may not be INVERTED — `…_window_not_inverted` (23514)', async () => {
    // Added to the migration by the FIRST review pass and asserted nowhere until now.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const from = new Date();
    await expect(
      tx
        .insert(schema.pariwarNomineeBankMaskingSchedule)
        .values(rawRow(PARIWAR_A, 1, from, new Date(from.getTime() - 5000))),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⭐ …but a ZERO-WIDTH `[T, T)` window is LEGAL — `>=`, ⛔ not `>`', () => {
    // ⚠ The other side of the same constraint, and it is ⛔ not pedantry: the close-head step sets
    // `effective_until = effective_from` of the superseding row, so a supersession at the same
    // instant produces exactly this window. A `>` constraint would make an ordinary rapid re-config
    // fail. The resolver's `effective_until > asOf` predicate never matches it, so it is harmless.
    return (async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const t = new Date();
      await expect(
        tx.insert(schema.pariwarNomineeBankMaskingSchedule).values(rawRow(PARIWAR_A, 1, t, t)),
      ).resolves.not.toThrow();
    })();
  });

  it('⛔ DELETE is not granted to the app role — a governance record is never discarded', async () => {
    const { client } = getTx();
    const grants = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_name = $1 AND grantee = 'twt_app'`,
      [TABLE],
    );
    const privileges = grants.rows.map((r) => r.privilege_type);
    expect(privileges).toContain('SELECT');
    expect(privileges).toContain('INSERT');
    expect(privileges).toContain('UPDATE');
    // ⭐ The absence IS the assertion — changing the setting closes a head and inserts a new one, so
    // every prior window survives in the trail.
    expect(privileges).not.toContain('DELETE');
  });
});

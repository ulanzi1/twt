// `data_exports` RLS + constraint policy-regression — Story 10.21 (AC5 / AC15).
//
// ⚠ WHY THIS FILE DID NOT EXIST BEFORE. 23 tables carry a `<table>-policy-regression.spec.ts` under
// this directory and `data_exports` — which holds the member's WHOLE assembled dossier as one Tier-1
// envelope ciphertext — was not among them. Story 10.21 extends the table, so it now gets one.
//
// ⭐ WHAT THIS ASSERTS THAT A ROUTE TEST CANNOT. Route-level tests exercise the handler's own scoping
// and therefore prove only that the handler does what the handler does. These assertions run
// DIRECTLY against the migration: the RLS policies, the `requested_via` CHECK, the `helpdesk_ticket_id`
// FK, and the `data_exports_one_pending_per_member` partial unique index. If a later migration drops
// or weakens any of them, the route tests would still pass and this file is what fails.
//
// ⚠ THE PARTIAL UNIQUE INDEX IS PRE-EXISTING BUT NOW LOAD-BEARING. Story 10.21's off-portal enqueue
// maps its `23505` onto a typed 409, so the story's behaviour DEPENDS on that index existing and being
// partial (`WHERE status = 'pending'`). Pre-existing ≠ covered: nothing in the tree asserted it before.
// ⛔ Do not delete these assertions on the grounds that the index is "not this story's".

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedMember } from '../_helpers.js';

/** Insert a `data_exports` row as the SUPERUSER (RLS-bypassing), for cross-tenant fixtures. */
async function seedExportAsSuperuser(
  client: { query: (q: string, v?: unknown[]) => Promise<{ rows: { export_id: string }[] }> },
  pariwarId: string,
  memberId: string,
  status = 'ready',
): Promise<string> {
  await client.query('RESET ROLE');
  const { rows } = await client.query(
    `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
     VALUES ($1, $2, $3, now()) RETURNING export_id`,
    [memberId, pariwarId, status],
  );
  return rows[0]!.export_id;
}

describe.skipIf(!hasDatabase)('data_exports RLS + constraint policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A export rows', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    await seedExportAsSuperuser(client as never, PARIWAR_A, aMember as string);
    await seedExportAsSuperuser(client as never, PARIWAR_B, bMember as string);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.dataExports);
    // ⛔ Guard: an empty result would make `every()` pass vacuously and prove nothing.
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A export rows (symmetric)', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    await seedExportAsSuperuser(client as never, PARIWAR_A, aMember as string);
    await seedExportAsSuperuser(client as never, PARIWAR_B, bMember as string);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.dataExports);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
  });

  it('⭐ AC5 — an operator scoped to A cannot CREATE an export row for a member of B (42501)', async () => {
    // ⭐ THE ASSERTION AC4's ROUTE TEST CANNOT WITNESS. The route resolves the tenant from the session
    // and therefore can never attempt this; only a direct write can. The
    // `WITH CHECK (pariwar_id = current_setting('app.pariwar_id'))` write policy is what refuses it,
    // and this is the proof that the refusal comes from the DATABASE, not from handler discipline.
    const { tx, client } = getTx();
    const bMember = await seedMember(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.dataExports)
      .values({
        memberId: bMember as never,
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        status: 'pending',
        requestedAt: new Date(),
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it("negative: scope A cannot UPDATE another tenant's export row (invisible, not raising)", async () => {
    const { tx, client } = getTx();
    const bMember = await seedMember(tx, PARIWAR_B);
    const bExportId = await seedExportAsSuperuser(client as never, PARIWAR_B, bMember as string, 'ready');
    await enterAppScope(client, PARIWAR_A);

    // The USING predicate makes B's row invisible to A's UPDATE — it matches nothing rather than
    // raising. Silently expiring another tenant's export would be a severe, invisible failure.
    await tx
      .update(schema.dataExports)
      .set({ status: 'expired' })
      .where(eq(schema.dataExports.exportId, bExportId as never));

    // ⛔ Verify as the SUPERUSER, not under scope A: A's own SELECT is filtered by the same USING
    // predicate, so reading from inside A's scope returns zero rows and passes whether or not the
    // UPDATE landed.
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ status: string }>(
      'SELECT status FROM data_exports WHERE export_id = $1',
      [bExportId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('ready');
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await seedExportAsSuperuser(client as never, PARIWAR_A, aMember as string);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.dataExports);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: data_exports has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'data_exports'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.relrowsecurity).toBe(true);
    // ⛔ FORCE matters: without it the TABLE OWNER bypasses RLS entirely, and the owner is the role
    // migrations run as.
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  // ── Story 10.21's new DB-level constraints (AC5) ────────────────────────────────────────────────

  it('⭐ CHECK: `requested_via` rejects any value outside the two-value union', async () => {
    // ⛔ This column is DELIBERATELY constrained at the DB, unlike `status` / `failed_reason` which are
    // app-layer enums. `requested_via` gates a PII-DISCLOSURE path: an unconstrained column lets a
    // mis-set 'member_portal' DISGUISE an off-portal build in every audit query that filters on it.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');

    const err = await client
      .query(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, requested_via)
         VALUES ($1, $2, 'pending', now(), 'sneaky_channel')`,
        [aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('23514'); // check_violation
    expect((err as { constraint?: string }).constraint).toBe('data_exports_requested_via_check');
  });

  it('CHECK: both legitimate `requested_via` values are accepted', async () => {
    const { tx, client } = getTx();
    const m1 = await seedMember(tx, PARIWAR_A);
    const m2 = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');
    for (const [member, via] of [
      [m1, 'member_portal'],
      [m2, 'off_portal_admin'],
    ] as const) {
      await client.query(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, requested_via)
         VALUES ($1, $2, 'ready', now(), $3)`,
        [member, PARIWAR_A, via],
      );
    }
    const { rows } = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM data_exports WHERE member_id IN ($1, $2)`,
      [m1, m2],
    );
    expect(rows[0]?.n).toBe('2');
  });

  it('DEFAULT: an insert omitting `requested_via` records `member_portal`', async () => {
    // The member self-service path never names a channel, and must keep not naming one. The default
    // states a FACT about every pre-0103 row rather than guessing.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');
    await client.query(
      `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
       VALUES ($1, $2, 'pending', now())`,
      [aMember, PARIWAR_A],
    );
    const { rows } = await client.query<{ requested_via: string }>(
      'SELECT requested_via FROM data_exports WHERE member_id = $1',
      [aMember],
    );
    expect(rows[0]?.requested_via).toBe('member_portal');
  });

  it('⭐ FK: `helpdesk_ticket_id` rejects a ticket id that does not exist', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');

    const err = await client
      .query(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, requested_via, helpdesk_ticket_id)
         VALUES ($1, $2, 'pending', now(), 'off_portal_admin', $3)`,
        [aMember, PARIWAR_A, randomUUID()],
      )
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('23503'); // foreign_key_violation
    expect((err as { constraint?: string }).constraint).toBe('data_exports_helpdesk_ticket_id_fk');
  });

  it('⭐ AC15 — the partial unique index permits many non-pending rows but ONE pending row', async () => {
    // ⚠ BEHAVIOURALLY LOAD-BEARING for Story 10.21: the off-portal enqueue maps this index's 23505
    // onto a typed 409 naming the existing pending export. If the index were dropped, or widened to
    // cover every status, the story's collision rule would silently stop working — the route would
    // create a second row instead of refusing.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');

    // PARTIAL: several non-pending rows for one member are fine.
    for (const status of ['ready', 'consumed', 'expired', 'failed']) {
      await client.query(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
         VALUES ($1, $2, $3, now())`,
        [aMember, PARIWAR_A, status],
      );
    }

    // UNIQUE on the pending subset: the first pending row inserts…
    await client.query(
      `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
       VALUES ($1, $2, 'pending', now())`,
      [aMember, PARIWAR_A],
    );
    // …and the second is refused.
    const err = await client
      .query(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, requested_via)
         VALUES ($1, $2, 'pending', now(), 'off_portal_admin')`,
        [aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('23505');
    expect((err as { constraint?: string }).constraint).toBe('data_exports_one_pending_per_member');
  });
});

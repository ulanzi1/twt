// member_moderation_actions RLS + DB-backstop policy-regression tests — Story 10.10 (review finding).
//
// Story 10.10 shipped a correct-looking migration `0091` — tenant RLS on SELECT + INSERT, ENABLE +
// FORCE, an append-only GRANT posture, an FK to `members`, a tenant-scoped index, and the
// load-bearing `member_moderation_actions_rejoin_iff_terminate` CHECK whose own header calls it
// "the STRUCTURAL half of the invariant … impossible on EVERY write path including a raw SQL one".
// NONE of it was asserted by any test at any level: there was no entry here, while every sibling
// tenant-isolated table (`alerts`, `pools`, `claims`, `consent_records`, `feature_flag_versions`,
// `report_exports`, `pool_names`, `role_grants`, …) ships one. A policy typo, a dropped FORCE, an
// accidental UPDATE grant or a dropped CHECK would all have shipped green (AI-6-5 family 5).
//
// This table is the STRICTEST posture on the surface, so the negative cases matter more than usual:
//   (a) owning Pariwar reads its own decision rows;
//   (b) cross-Pariwar SELECT returns 0 rows — the leak invariant. A leak here exposes one tenant's
//       moderation decisions (who was suspended, on what ground, by whom) to another;
//   (c) cross-Pariwar INSERT is blocked (withCheck → 42501);
//   (d) APPEND-ONLY: DELETE is refused outright — no GRANT and no policy (a recorded moderation
//       decision is immutable);
//   (d2) the ONE permitted UPDATE (migration 0092's DPDPA rationale scrub) works IN scope and
//        cannot reach another tenant's rows;
//   (e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed);
//   (f) ENABLE + FORCE RLS are both on;
//   (g) the rejoin_iff_terminate CHECK holds on BOTH directions, asserted against the DB itself
//       rather than inferred through the API's typed errors;
//   (h) the FK to `members` rejects an orphan decision row.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb).
// Seeds run as the Docker superuser (RLS bypassed) BEFORE entering app scope; enforcement assertions
// `SET LOCAL ROLE twt_app` to shed superuser (see _helpers.ts).

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { MemberId, PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const ACTOR = '99999999-9999-9999-9999-999999999999';

/** A member row is required by the FK — seeded superuser-side before scope is entered. */
async function seedMember(
  tx: ReturnType<typeof getTx>['tx'],
  pariwarId: PariwarId,
  memberId: string,
): Promise<MemberId> {
  await tx
    .insert(schema.members)
    // `state_event_version` is projector-written and has no default — the sibling members spec
    // seeds it explicitly for the same reason.
    .values({ memberId: memberId as MemberId, pariwarId, state: 'active', stateEventVersion: 1 })
    .onConflictDoNothing();
  return memberId as MemberId;
}

function actionValues(
  pariwarId: PariwarId,
  memberId: MemberId,
  over: Partial<typeof schema.memberModerationActions.$inferInsert> = {},
): typeof schema.memberModerationActions.$inferInsert {
  return {
    pariwarId,
    memberId,
    action: 'suspend',
    reasonCode: 'r14-forgery',
    rationaleCiphertext: 'enc:v1:fake-envelope-for-rls-test',
    actorId: ACTOR,
    actorDisplay: 'Trustee One',
    rejoinPermittedAt: null,
    actedAt: new Date('2026-08-03T00:00:00.000Z'),
    ...over,
  };
}

const MEMBER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMBER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe.skipIf(!hasDatabase)('member_moderation_actions RLS policy regression (scoped, append-only)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN moderation decision rows', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_A, a));
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_B, b));
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.memberModerationActions);
    // Membership, not count — the shared DB accumulates rows across runs
    // ([[project_live_db_test_gotchas]]).
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.memberId === a)).toBe(true);
  });

  it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s moderation decisions', async () => {
    const { tx, client } = getTx();
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_B, b));
    await enterAppScope(client, PARIWAR_A);

    // An explicit WHERE for B must STILL return nothing. A leak here would disclose that a member
    // of another Pariwar was suspended or terminated, and on what governance ground.
    const bRows = await tx
      .select()
      .from(schema.memberModerationActions)
      .where(eq(schema.memberModerationActions.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);
  });

  it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
    const { tx, client } = getTx();
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.memberModerationActions)
      .values(actionValues(PARIWAR_B, b))
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('(d) APPEND-ONLY: DELETE is refused even for the owning Pariwar', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_A, a));
    await enterAppScope(client, PARIWAR_A);

    // No DELETE grant and no DELETE policy — a recorded moderation decision is immutable. This is
    // what stops a tenant from erasing the evidence of its own governance actions.
    const err = await tx
      .delete(schema.memberModerationActions)
      .where(eq(schema.memberModerationActions.pariwarId, PARIWAR_A))
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });

  it('(d2) the ONE permitted UPDATE — the 0092 RTBF rationale scrub — works in scope, and only in scope', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_A, a));
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_B, b));
    await enterAppScope(client, PARIWAR_A);

    // In-scope: the DPDPA scrub must be possible at all. Before migration 0092 this table was
    // SELECT+INSERT-only, which made a Tier-1 PII column structurally UN-erasable.
    const scrubbed = await tx
      .update(schema.memberModerationActions)
      .set({ rationaleCiphertext: 'enc:v1:anonymized-sentinel' })
      .where(
        and(
          eq(schema.memberModerationActions.pariwarId, PARIWAR_A),
          eq(schema.memberModerationActions.memberId, a),
        ),
      )
      .returning();
    expect(scrubbed.length).toBeGreaterThan(0);

    // Cross-tenant: an RTBF in A can never reach B's rows.
    const crossed = await tx
      .update(schema.memberModerationActions)
      .set({ rationaleCiphertext: 'enc:v1:should-never-land' })
      .where(eq(schema.memberModerationActions.pariwarId, PARIWAR_B))
      .returning();
    expect(crossed).toHaveLength(0);
  });

  it('(e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    await tx.insert(schema.memberModerationActions).values(actionValues(PARIWAR_A, a));
    // Shed superuser, do NOT set scope: nullif('','') → NULL → no match → 0 rows (closed-failure).
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.memberModerationActions);
    expect(rows).toHaveLength(0);

    const err = await tx
      .insert(schema.memberModerationActions)
      .values(actionValues(PARIWAR_A, a))
      .catch((e: unknown) => e);
    expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
  });

  it('(f) FORCE RLS: member_moderation_actions has rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE relname = 'member_moderation_actions'`,
    );
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('(g) DB BACKSTOP: the rejoin_iff_terminate CHECK holds in BOTH directions', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);

    // ⚠ Each expected failure runs inside a raw SAVEPOINT. A CHECK violation ABORTS the enclosing
    // transaction, so without this the second assertion would see `25P02` (in-failed-transaction)
    // rather than the `23514` it is actually testing — and the third could not run at all. Same
    // reason the domain's retry-on-23505 path uses raw SAVEPOINTs rather than `db.transaction()`
    // ([[project_domain_limit_clamp_and_savepoint_retry]]).
    async function expectCheckViolation(
      values: typeof schema.memberModerationActions.$inferInsert,
      label: string,
    ): Promise<void> {
      await client.query(`SAVEPOINT check_probe`);
      const err = await tx
        .insert(schema.memberModerationActions)
        .values(values)
        .catch((e: unknown) => e);
      await client.query(`ROLLBACK TO SAVEPOINT check_probe`);
      expect((err as { cause?: { code?: string } }).cause?.code, label).toBe('23514');
    }

    // A terminate WITHOUT a rejoin instant — the FR-6 lock silently absent. Asserted against the
    // DB, not inferred through the API's typed errors, because the CHECK's whole claim is that it
    // holds on EVERY write path including a raw SQL one.
    await expectCheckViolation(
      actionValues(PARIWAR_A, a, { action: 'terminate', rejoinPermittedAt: null }),
      'terminate without rejoin_permitted_at must violate the CHECK',
    );

    // …and the converse: a suspend that carries a rejoin instant it has no business carrying.
    await expectCheckViolation(
      actionValues(PARIWAR_A, a, {
        action: 'suspend',
        rejoinPermittedAt: new Date('2027-08-03T00:00:00.000Z'),
      }),
      'suspend WITH rejoin_permitted_at must violate the CHECK',
    );

    // The legal shape still inserts — the CHECK is not merely rejecting everything.
    const ok = await tx
      .insert(schema.memberModerationActions)
      .values(
        actionValues(PARIWAR_A, a, {
          action: 'terminate',
          rejoinPermittedAt: new Date('2027-08-03T00:00:00.000Z'),
        }),
      )
      .returning();
    expect(ok).toHaveLength(1);
  });

  it('(h) DB BACKSTOP: the members FK rejects a decision row for a nonexistent member', async () => {
    const { tx } = getTx();
    const orphan = await tx
      .insert(schema.memberModerationActions)
      .values(actionValues(PARIWAR_A, '00000000-0000-4000-8000-000000000000' as MemberId))
      .catch((e: unknown) => e);
    expect((orphan as { cause?: { code?: string } }).cause?.code).toBe('23503');
  });
});

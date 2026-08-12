// member_moderation_grounds RLS + DB-backstop policy-regression tests — Story 10.20 (AC5, AC9).
//
// The sibling `member-moderation-actions-policy-regression.spec.ts` exists because Story 10.10
// shipped a correct-LOOKING migration that no test asserted at any level. `0099` adds a second table
// with the same strict posture plus three constraints of its own, so it gets the same treatment
// rather than inheriting the sibling's coverage by proximity — a policy typo, a dropped FORCE, an
// accidental UPDATE grant, a dropped partial unique index or a dropped evidence CHECK would all ship
// green otherwise (AI-6-5 family 5).
//
// This table's posture is the STRICTEST on the surface, so the negative cases carry the weight:
//   (a) owning Pariwar reads its own grounds;
//   (b) cross-Pariwar SELECT returns 0 rows — a leak here discloses the GROUNDS on which another
//       tenant's member was moderated;
//   (c) cross-Pariwar INSERT is blocked (withCheck → 42501);
//   (d) APPEND-ONLY: UPDATE of a governance column and DELETE are both refused outright;
//   (d2) the ONE permitted UPDATE — the DPDPA note scrub (AC11) — works IN scope and cannot reach
//        another tenant's rows;
//   (e) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed);
//   (f) ENABLE + FORCE RLS are both on;
//   (g) ⭐ the ONE-PRIMARY partial unique index bites (23505), asserted against the DB itself rather
//       than inferred through the API's typed 409 — the index is the BACKSTOP, and a backstop that
//       has never been seen to fire has not been shown to have teeth;
//   (h) the evidence-shape CHECK bites, including the case array-ness and the cap cannot catch;
//   (i) the FK to `member_moderation_actions` rejects an orphan ground.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb).

import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { MemberId, ModerationActionId, PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const ACTOR = '99999999-9999-9999-9999-999999999999';
const MEMBER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMBER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function seedMember(
  tx: ReturnType<typeof getTx>['tx'],
  pariwarId: PariwarId,
  memberId: string,
): Promise<MemberId> {
  await tx
    .insert(schema.members)
    .values({ memberId: memberId as MemberId, pariwarId, state: 'active', stateEventVersion: 1 })
    .onConflictDoNothing();
  return memberId as MemberId;
}

/** Seed an action (grounds hang off it via FK) — superuser-side, before scope is entered. */
async function seedAction(
  tx: ReturnType<typeof getTx>['tx'],
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<ModerationActionId> {
  const rows = await tx
    .insert(schema.memberModerationActions)
    .values({
      pariwarId,
      memberId,
      action: 'suspend',
      reasonCode: 'r14-forgery',
      decisionNoteCiphertext: 'enc:v1:fake-envelope-for-rls-test',
      actorId: ACTOR,
      actorDisplay: 'Trustee One',
      rejoinPermittedAt: null,
      actedAt: new Date('2026-08-03T00:00:00.000Z'),
    })
    .returning({ id: schema.memberModerationActions.moderationActionId });
  return rows[0]!.id;
}

function groundValues(
  pariwarId: PariwarId,
  memberId: MemberId,
  moderationActionId: ModerationActionId,
  over: Partial<typeof schema.memberModerationGrounds.$inferInsert> = {},
): typeof schema.memberModerationGrounds.$inferInsert {
  return {
    moderationActionId,
    pariwarId,
    memberId,
    code: 'r14-forgery',
    isPrimary: false,
    addedBy: ACTOR,
    addedByDisplay: 'Trustee One',
    addedAt: new Date('2026-08-03T00:00:00.000Z'),
    ...over,
  };
}

const codeOf = (err: unknown): string | undefined =>
  (err as { cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;

describe.skipIf(!hasDatabase)('member_moderation_grounds RLS policy regression (scoped, append-only)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN grounds', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    const actionB = await seedAction(tx, PARIWAR_B, b);
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_A, a, actionA));
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_B, b, actionB));
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.memberModerationGrounds);
    // Membership, not count — the shared DB accumulates rows across runs.
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.memberId === a)).toBe(true);
  });

  it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s grounds', async () => {
    const { tx, client } = getTx();
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    const actionB = await seedAction(tx, PARIWAR_B, b);
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_B, b, actionB));
    await enterAppScope(client, PARIWAR_A);

    // An explicit WHERE for B must STILL return nothing. A leak here discloses the GROUNDS on which
    // another Pariwar's member was moderated — including any later findings appended to the case.
    const bRows = await tx
      .select()
      .from(schema.memberModerationGrounds)
      .where(eq(schema.memberModerationGrounds.pariwarId, PARIWAR_B));
    expect(bRows).toHaveLength(0);
  });

  it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
    const { tx, client } = getTx();
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    const actionB = await seedAction(tx, PARIWAR_B, b);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_B, b, actionB))
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('42501');
  });

  it('(d) APPEND-ONLY: UPDATE of a governance column and DELETE are both refused', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_A, a, actionA));
    await enterAppScope(client, PARIWAR_A);

    // ⛔ "Never UPDATEd, never DELETEd" is a GRANT, not a convention. A rule only the application
    // respects would not make this table append-only at all.
    // ⚠ ONE PROBE PER TEST. A failed statement aborts the transaction, so a second probe in the same
    // `it()` reports `25P02` ("current transaction is aborted") and the assertion would be about
    // Postgres's error recovery rather than about the grant. `setupLiveDb` gives each test its own
    // BEGIN/ROLLBACK, so splitting is the cheapest correct answer here (the API-side spec, which
    // shares one connection across probes, uses SAVEPOINTs for the same reason).
    const updErr = await tx
      .update(schema.memberModerationGrounds)
      .set({ code: 'concealment-confirmed' })
      .where(eq(schema.memberModerationGrounds.moderationActionId, actionA))
      .catch((e: unknown) => e);
    expect(codeOf(updErr)).toBe('42501');
  });

  it('(d′) APPEND-ONLY: DELETE is refused outright — a recorded ground is immutable', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_A, a, actionA));
    await enterAppScope(client, PARIWAR_A);

    const delErr = await tx
      .delete(schema.memberModerationGrounds)
      .where(eq(schema.memberModerationGrounds.moderationActionId, actionA))
      .catch((e: unknown) => e);
    expect(codeOf(delErr)).toBe('42501');
  });

  it('(d2) the ONE permitted UPDATE — the DPDPA note scrub — works in scope and cannot cross tenants', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const b = await seedMember(tx, PARIWAR_B, MEMBER_B);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    const actionB = await seedAction(tx, PARIWAR_B, b);
    await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { noteCiphertext: 'enc:v1:note-a' }));
    await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_B, b, actionB, { noteCiphertext: 'enc:v1:note-b' }));
    await enterAppScope(client, PARIWAR_A);

    // The AC11 scrub — the ONE reason this table grants any UPDATE at all.
    const scrubbed = await tx
      .update(schema.memberModerationGrounds)
      .set({ noteCiphertext: null })
      .where(eq(schema.memberModerationGrounds.memberId, a))
      .returning({ id: schema.memberModerationGrounds.groundId });
    expect(scrubbed.length).toBeGreaterThan(0);

    // ⛔ And it must not reach another tenant's row: zero rows updated, not an error and not a scrub.
    const crossTenant = await tx
      .update(schema.memberModerationGrounds)
      .set({ noteCiphertext: null })
      .where(eq(schema.memberModerationGrounds.memberId, b))
      .returning({ id: schema.memberModerationGrounds.groundId });
    expect(crossTenant).toHaveLength(0);
  });

  it('(e) fail-closed: an UNSET-scope session reads zero rows and cannot write', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await tx.insert(schema.memberModerationGrounds).values(groundValues(PARIWAR_A, a, actionA));
    await enterAppRoleNoScope(client);

    // `current_setting('app.pariwar_id', true)` is NULL, so the policy predicate is NULL ⇒ no rows.
    expect(await tx.select().from(schema.memberModerationGrounds)).toHaveLength(0);
    const err = await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA))
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('42501');
  });

  it('(f) RLS is ENABLED and FORCED — a dropped FORCE would exempt the table owner', async () => {
    const { tx } = getTx();
    const rows = await tx.execute(
      sql`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'member_moderation_grounds'`,
    );
    const row = (rows as unknown as { rows: { relrowsecurity: boolean; relforcerowsecurity: boolean }[] }).rows[0];
    expect(row?.relrowsecurity).toBe(true);
    expect(row?.relforcerowsecurity).toBe(true);
  });

  it('⭐ (g) the ONE-PRIMARY partial unique index bites — a second primary raises 23505', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await enterAppScope(client, PARIWAR_A);

    await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { isPrimary: true }));
    const err = await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { isPrimary: true }))
      .catch((e: unknown) => e);
    // The index is the BACKSTOP; the route's typed 409 is the INTERFACE. This asserts the backstop
    // directly, because a backstop inferred only through the API has not been shown to have teeth.
    expect(codeOf(err)).toBe('23505');
  });

  it('⭐ (g′) the index is PARTIAL — two SUPPORTING grounds on one action are accepted', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await enterAppScope(client, PARIWAR_A);

    // ⚠ Without this the (g) assertion would pass on a PLAIN unique index too — which would forbid
    // supporting grounds entirely and break the whole append-only model. The pair is what pins the
    // `WHERE is_primary` predicate.
    await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { isPrimary: true }));
    await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { code: 'concealment-confirmed' }));
    const rows = await tx
      .insert(schema.memberModerationGrounds)
      .values(groundValues(PARIWAR_A, a, actionA, { code: 'helpdesk-escalated-abuse' }))
      .returning({ id: schema.memberModerationGrounds.groundId });
    expect(rows).toHaveLength(1);
  });

  it('(h) the evidence CHECKs bite — including the case array-ness and the cap CANNOT catch', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await enterAppScope(client, PARIWAR_A);

    // ⭐ THE RESIDUAL THE SHAPE CHECK EXISTS TO CLOSE: this is an ARRAY, and it is WITHIN the cap.
    // Only the per-entry shape check rejects it — and without that check, free-text evidence would
    // be storable by any raw-SQL writer.
    const prose = await tx
      .insert(schema.memberModerationGrounds)
      .values(
        groundValues(PARIWAR_A, a, actionA, {
          evidenceRefs: [{ kind: 'complaint', ref: 'a full sentence of prose about the member' }] as never,
        }),
      )
      .catch((e: unknown) => e);
    expect(codeOf(prose)).toBe('23514');
  });

  it('(h′) the legal evidence shape is ACCEPTED — the constraint bounds evidence, it does not forbid it', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    const actionA = await seedAction(tx, PARIWAR_A, a);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx
      .insert(schema.memberModerationGrounds)
      .values(
        groundValues(PARIWAR_A, a, actionA, {
          evidenceRefs: [{ kind: 'helpdesk-ticket', ref: 'HD-2026-0007' }],
        }),
      )
      .returning({ id: schema.memberModerationGrounds.groundId });
    expect(rows).toHaveLength(1);
  });

  it('(i) the FK rejects an ORPHAN ground — one that names no moderation action', async () => {
    const { tx, client } = getTx();
    const a = await seedMember(tx, PARIWAR_A, MEMBER_A);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.memberModerationGrounds)
      .values(
        groundValues(PARIWAR_A, a, '00000000-0000-4000-8000-000000000000' as ModerationActionId),
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23503');
  });
});

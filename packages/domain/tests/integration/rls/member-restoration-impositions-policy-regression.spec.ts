// member_restoration_impositions RLS + DB-backstop policy-regression tests — Story 10.23 (review
// finding).
//
// The story cites `member-moderation-actions-policy-regression.spec.ts` as this table's template
// (migration 0097's own header: "Mirror `0091` clause for clause") but did not carry forward that
// precedent's OWN dedicated RLS spec — the table's `AC1 — APPEND-ONLY` test in
// `restoration-discipline.spec.ts` covers same-tenant UPDATE/DELETE refusal, but nothing asserted
// cross-Pariwar SELECT/INSERT isolation, the fail-closed unset-scope posture, ENABLE+FORCE, or the
// members FK's orphan rejection — exactly the class of gap the moderation precedent's own header
// warns a missing spec lets ship silently (AI-6-5 family 3/5).
//
// Unlike `member_moderation_actions`, this table has NO UPDATE grant at all (D5: no PII, no RTBF
// scrub leg needed) — so there is no analog to the moderation spec's (d2) in-scope-UPDATE case here;
// same-tenant UPDATE/DELETE refusal is already covered in `restoration-discipline.spec.ts` and is not
// duplicated below.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK isolation (setupLiveDb).
// Seeds run as the Docker superuser (RLS bypassed) BEFORE entering app scope; enforcement assertions
// `SET LOCAL ROLE twt_app` to shed superuser (see _helpers.ts).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, type MemberId, type PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedMember } from '../_helpers.js';

const R7D = 'niy.contribution-discipline.r7-d';

function impositionValues(
  pariwarId: PariwarId,
  memberId: MemberId,
  over: Partial<typeof schema.memberRestorationImpositions.$inferInsert> = {},
): typeof schema.memberRestorationImpositions.$inferInsert {
  return {
    pariwarId,
    memberId,
    clauseId: R7D,
    clauseVersionId: randomUUID(),
    policyClauseVersionId: randomUUID(),
    lockInMonths: 3,
    concurrencyRule: 'max_over_live',
    episodeKey: 'no-record|skips:0',
    imposedAt: new Date('2026-08-01T00:00:00.000Z'),
    expiresAt: new Date('2026-11-01T00:00:00.000Z'),
    ...over,
  };
}

describe.skipIf(!hasDatabase)(
  'member_restoration_impositions RLS policy regression (scoped, append-only, no UPDATE grant)',
  () => {
    setupLiveDb();

    it('(a) positive: owning Pariwar A reads its OWN impositions', async () => {
      const { tx, client } = getTx();
      const a = toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
      const b = toMemberId(await seedMember(tx, PARIWAR_B, { state: 'active' }));
      await tx.insert(schema.memberRestorationImpositions).values(impositionValues(PARIWAR_A, a));
      await tx.insert(schema.memberRestorationImpositions).values(impositionValues(PARIWAR_B, b));
      await enterAppScope(client, PARIWAR_A);

      const rows = await tx.select().from(schema.memberRestorationImpositions);
      // Membership, not count — the shared DB accumulates rows across runs
      // ([[project_live_db_test_gotchas]]).
      expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
      expect(rows.some((r) => r.memberId === a)).toBe(true);
    });

    it('(b) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B’s impositions', async () => {
      const { tx, client } = getTx();
      const b = toMemberId(await seedMember(tx, PARIWAR_B, { state: 'active' }));
      await tx.insert(schema.memberRestorationImpositions).values(impositionValues(PARIWAR_B, b));
      await enterAppScope(client, PARIWAR_A);

      // An explicit WHERE for B must STILL return nothing. A leak here would disclose that a member
      // of another Pariwar has a live restoration lock-in, and under which clause.
      const bRows = await tx
        .select()
        .from(schema.memberRestorationImpositions)
        .where(eq(schema.memberRestorationImpositions.pariwarId, PARIWAR_B));
      expect(bRows).toHaveLength(0);
    });

    it('(c) write-isolation: an A session INSERT for Pariwar B is blocked (withCheck → 42501)', async () => {
      const { tx, client } = getTx();
      const b = toMemberId(await seedMember(tx, PARIWAR_B, { state: 'active' }));
      await enterAppScope(client, PARIWAR_A);

      const err = await tx
        .insert(schema.memberRestorationImpositions)
        .values(impositionValues(PARIWAR_B, b))
        .catch((e: unknown) => e);
      const cause = (err as { cause?: { code?: string; message?: string } }).cause;
      expect(cause?.code).toBe('42501');
      expect(cause?.message ?? '').toMatch(/row-level security/i);
    });

    it('(d) unset-scope session: SELECT returns 0 rows AND write is blocked (fail-closed)', async () => {
      const { tx, client } = getTx();
      const a = toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
      await tx.insert(schema.memberRestorationImpositions).values(impositionValues(PARIWAR_A, a));
      // Shed superuser, do NOT set scope: nullif('','') → NULL → no match → 0 rows (closed-failure).
      await enterAppRoleNoScope(client);

      const rows = await tx.select().from(schema.memberRestorationImpositions);
      expect(rows).toHaveLength(0);

      const err = await tx
        .insert(schema.memberRestorationImpositions)
        .values(impositionValues(PARIWAR_A, a))
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
    });

    it('(e) FORCE RLS: member_restoration_impositions has rowsecurity AND forcerowsecurity enabled', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class
          WHERE relname = 'member_restoration_impositions'`,
      );
      expect(rows[0]?.relrowsecurity).toBe(true);
      expect(rows[0]?.relforcerowsecurity).toBe(true);
    });

    it('(f) DB BACKSTOP: the members FK rejects an imposition row for a nonexistent member', async () => {
      const { tx } = getTx();
      const orphan = await tx
        .insert(schema.memberRestorationImpositions)
        .values(
          impositionValues(PARIWAR_A, '00000000-0000-4000-8000-000000000000' as MemberId),
        )
        .catch((e: unknown) => e);
      expect((orphan as { cause?: { code?: string } }).cause?.code).toBe('23503');
    });

    it('(g) twt_service gets SELECT only — no INSERT grant, matching AC2\'s "writer runs on twt_app" posture', async () => {
      // Migration 0097's own header: granting INSERT to twt_service would create a path by which a
      // lock-in could be imposed with NO tenant scope set. Asserted against the grant itself, not
      // inferred from the app's own call sites always using twt_app.
      const { client } = getTx();
      const { rows } = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants
          WHERE table_name = 'member_restoration_impositions' AND grantee = 'twt_service'`,
      );
      const privileges = rows.map((r) => r.privilege_type).sort();
      expect(privileges).toEqual(['SELECT']);
    });
  },
);

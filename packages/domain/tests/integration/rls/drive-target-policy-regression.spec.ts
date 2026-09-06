// `pariwar_drive_target_schedule` + `pariwar_drive_target_visibility` migration/RLS
// policy-regression — Story 11b.13 (Task 5), load-bearing-invariant checklist family 5.
//
// ⭐⭐ WHY THIS FILE EXISTS, SEPARATELY FROM `../pool/drive-target.spec.ts`. That spec asserts
// behaviour THROUGH the accessors. This one asserts the **CONSTRAINTS AND POLICIES DIRECTLY** —
// which is family 5's whole point (*"never only inferred through higher-level tests"*), and it is a
// gap that shipped on the named precedent and had to be closed by a second review pass rather than
// written up front.
//
// ⛔ THE GAP IS ⛔ NOT THEORETICAL HERE EITHER:
//   · `getDriveTargetHead` takes `.limit(1)` with ⛔ NO `ORDER BY`. Its determinism IS the partial
//     unique index. Drop the index and two open heads coexist ⇒ the console shows one target while
//     the resolver picks another, and `2026-09-05-201`'s `expectedVersion` guard compares against
//     whichever head Postgres happened to return. Every accessor-level test stays green through
//     that, because none of them ever creates two open heads.
//   · `pariwar_drive_target_visibility_member_ge_public` is the DB half of a **DISCLOSURE** rule
//     (`2026-09-04-189` cl.3). If it were dropped, only the handler would stand between the
//     unauthenticated public and seeing more than a member of the Pariwar sees.
//
// ⚠⛔ AND THE FAIL-CLOSED DIRECTION IS ASSERTED, ⛔ not assumed: an UNSET scope must read zero rows,
// and for the VISIBILITY record zero rows means **HIDDEN FROM EVERYONE** (`-190` cl.7(b)) — ⛔ the
// deliberate OPPOSITE of `pariwar_nominee_bank_masking_schedule`, where the Panel ruled the same
// zero-row state resolves to **PUBLISH** (`2026-09-02-179` cl.1, `D8-default` FAIL-OPEN). That
// contrast is exactly the *"RLS scope failure is INDISTINGUISHABLE from 'nothing configured'"*
// reactivation precondition recorded as UNRESOLVED on the masking control — ⭐ here both land on
// non-disclosure, and this file is where that is proven rather than claimed.
//
// Live DB only.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { MAX_DRIVE_TARGET_INR } from '../../../src/pool/drive-target.js';
import { resolveDriveTargetVisibility } from '../../../src/pool/drive-target-policy.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const SCHEDULE_TABLE = 'pariwar_drive_target_schedule';
const VISIBILITY_TABLE = 'pariwar_drive_target_visibility';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** A raw schedule row, bypassing the accessor — this file tests the DB, ⛔ not the write path. */
function rawSchedule(pariwarId: string, version: number, from: Date, until: Date | null) {
  return {
    pariwarId: pariwarId as never,
    version,
    targetInr: 500_000,
    effectiveFrom: from,
    effectiveUntil: until,
    changedByActor: null,
    changedByDisplay: null,
    rationale: 'raw fixture',
    auditId: randomUUID(),
  };
}

/** A raw visibility row, likewise bypassing the accessor. */
function rawVisibility(pariwarId: string, members: boolean, publicly: boolean) {
  return {
    pariwarId: pariwarId as never,
    revealToMembers: members,
    revealToPublic: publicly,
    changedByActor: null,
    changedByDisplay: null,
    rationale: 'raw fixture',
    auditId: randomUUID(),
  };
}

describe.skipIf(!hasDatabase)('drive-target tables — RLS + DB-level backstops', () => {
  setupLiveDb();

  it.each([SCHEDULE_TABLE, VISIBILITY_TABLE])(
    '%s has FORCE ROW LEVEL SECURITY enabled (the catalog guard)',
    async (table) => {
      const { client } = getTx();
      const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        [table],
      );
      expect(rls.rows).toHaveLength(1);
      expect(rls.rows[0]?.relrowsecurity).toBe(true);
      // ⛔ FORCE, ⛔ not merely ENABLE: without it the table owner bypasses every policy below.
      expect(rls.rows[0]?.relforcerowsecurity).toBe(true);
    },
  );

  it.each([SCHEDULE_TABLE, VISIBILITY_TABLE])(
    '%s grants the app role SELECT/INSERT/UPDATE but ⛔ NOT DELETE — a governance record is not discarded',
    async (table) => {
      const { client } = getTx();
      const grants = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants
          WHERE table_name = $1 AND grantee = 'twt_app'`,
        [table],
      );
      const privileges = grants.rows.map((r) => r.privilege_type).sort();
      // ⭐ MEMBERSHIP assertion with explicit values — ⛔ never a bare count.
      expect(privileges).toEqual(['INSERT', 'SELECT', 'UPDATE']);
      expect(privileges).not.toContain('DELETE');
    },
  );

  it('an UNSET scope reads zero SCHEDULE rows (the Story 1.6 closed-failure construct)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarDriveTargetSchedule).values(rawSchedule(PARIWAR_A, 1, new Date(), null));

    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.pariwarDriveTargetSchedule);
    expect(rows).toEqual([]);
  });

  it('⭐⭐ an UNSET scope reads zero VISIBILITY rows, and that resolves to HIDDEN — ⛔ never to disclosure', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // A Pariwar that HAS revealed publicly.
    await tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, true, true));

    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    const rows = await tx.select().from(schema.pariwarDriveTargetVisibility);
    expect(rows).toEqual([]);
    // ⭐⭐ THE PROPERTY THE MASKING CONTROL DOES ⛔ NOT HAVE. There an infrastructure scope failure is
    // indistinguishable from "nothing configured" and resolves to PUBLISH (`D8-default` FAIL-OPEN,
    // and that indistinguishability is recorded as an unresolved reactivation precondition). ⇒ here
    // both land on NON-DISCLOSURE, and this assertion is what keeps it that way.
    expect(await resolveDriveTargetVisibility(tx, PARIWAR_A)).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
  });

  it("⛔ a Pariwar cannot read ANOTHER Pariwar's target (cross-tenant SELECT isolation)", async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarDriveTargetSchedule).values(rawSchedule(PARIWAR_A, 1, new Date(), null));
    await tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, true, true));

    await enterAppScope(client, PARIWAR_B);
    expect(await tx.select().from(schema.pariwarDriveTargetSchedule)).toEqual([]);
    expect(await tx.select().from(schema.pariwarDriveTargetVisibility)).toEqual([]);
  });

  // ⚠⛔ THE TWO withCheck NEGATIVES ARE SEPARATE TESTS, ⛔ NOT TWO ASSERTIONS IN ONE. A failed
  // statement ABORTS the enclosing transaction, so a second probe in the same tx fails with `25P02`
  // ("current transaction is aborted") and carries ⛔ NOT the `42501` being asserted — which reads as
  // a genuine RLS failure while proving nothing. ⛔ Do not merge these back together.

  it("⛔ a Pariwar cannot WRITE another Pariwar's TARGET (the RLS withCheck negative)", async () => {
    // ⚠ The negative half of a SYMMETRIC policy. A read-only assertion would pass even if the write
    // policy's WITH CHECK had been dropped.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      tx.insert(schema.pariwarDriveTargetSchedule).values(rawSchedule(PARIWAR_B, 1, new Date(), null)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it("⛔⛔ a Pariwar cannot WRITE another Pariwar's REVEAL — the one that publishes a hidden figure", async () => {
    // ⛔⛔ THE CONSEQUENTIAL HALF: a tenant able to INSERT another tenant's VISIBILITY row can
    // publish that tenant's target to the unauthenticated internet — a disclosure act reserved to
    // `super_admin` (`-190` cl.7(c)), bypassed entirely by a missing WITH CHECK.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_B, true, true)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ enforces AT MOST ONE OPEN HEAD per Pariwar (23505 on a second `effective_until IS NULL`)', async () => {
    // ⛔⛔ THE LOAD-BEARING ONE. `getDriveTargetHead` takes `.limit(1)` with NO `ORDER BY`, so its
    // determinism IS this index — and `2026-09-05-201`'s `expectedVersion` guard compares against
    // whatever it returns. Two open heads ⇒ the lost-update guard itself becomes non-deterministic.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();
    await tx.insert(schema.pariwarDriveTargetSchedule).values(rawSchedule(PARIWAR_A, 1, now, null));
    await expect(
      tx
        .insert(schema.pariwarDriveTargetSchedule)
        .values(rawSchedule(PARIWAR_A, 2, new Date(now.getTime() + 1000), null)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('enforces a (pariwar_id, version) pair allocated exactly once (23505)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();
    // The first is CLOSED, so the open-head index above is not what rejects the second.
    await tx
      .insert(schema.pariwarDriveTargetSchedule)
      .values(rawSchedule(PARIWAR_A, 1, now, new Date(now.getTime() + 1000)));
    await expect(
      tx
        .insert(schema.pariwarDriveTargetSchedule)
        .values(rawSchedule(PARIWAR_A, 1, now, new Date(now.getTime() + 2000))),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('enforces ONE visibility row per Pariwar (23505)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, true, false));
    await expect(
      tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, false, false)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⭐ the window may not be INVERTED — `…_window_not_inverted` (23514)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const from = new Date();
    await expect(
      tx
        .insert(schema.pariwarDriveTargetSchedule)
        .values(rawSchedule(PARIWAR_A, 1, from, new Date(from.getTime() - 5000))),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⭐ …but a ZERO-WIDTH `[T, T)` window is LEGAL — `>=`, ⛔ not `>`', async () => {
    // ⚠ The other side of the same constraint, and ⛔ not pedantry: the close-head step sets
    // `effective_until = effective_from` of the superseding row, so a supersession at the SAME
    // instant produces exactly this window. A `>` constraint would make an ordinary rapid
    // re-configuration fail. The resolver's `effective_until > asOf` predicate never matches it.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const t = new Date();
    const rows = await tx
      .insert(schema.pariwarDriveTargetSchedule)
      .values(rawSchedule(PARIWAR_A, 1, t, t))
      .returning();
    expect(rows[0]?.effectiveUntil?.toISOString()).toBe(t.toISOString());
  });

  it('⭐⭐ THE DB CEILING **IS** `MAX_DRIVE_TARGET_INR` — the "KEEP IN SYNC" obligation, MECHANIZED', async () => {
    // ⚠⛔ THE GAP THIS CLOSES (code review Pass 2, all three layers). The ceiling lives in FOUR
    // artifacts: this constant, the hand-authored literal in migration `0115` (which is FROZEN and
    // deliberately never regenerated), a third literal in `@twt/contracts`, and the drizzle
    // declaration — which alone derives it. Four comments say "keep IN SYNC" and ⛔ nothing enforced
    // it. Every ceiling test asserted rejection ABOVE a HARD-CODED `100_000_001`, so raising
    // `MAX_DRIVE_TARGET_INR` left the applied DB CHECK stale while every suite stayed green — and a
    // value the app now accepts would die at Postgres as a bare `23514`, which is ⛔ not in the
    // error-mapping registry ⇒ the opaque 500 that `2026-09-05-201` exists to prevent. ⭐ That is
    // this story's own named failure mode, reproduced by the discipline meant to avoid it.
    // ⇒ ask the DATABASE what its bound actually is.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const def = await tx.execute(sql`
      SELECT pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conname = 'pariwar_drive_target_schedule_target_max'
    `);
    const row = (def as unknown as { rows: { def: string }[] }).rows[0];
    expect(row?.def).toBeDefined();
    expect(row?.def).toContain(String(MAX_DRIVE_TARGET_INR));
  });

  it('⭐ the ceiling ACCEPTS its own boundary value — the CHECK is `<=`, ⛔ not `<`', async () => {
    // ⚠ Every other ceiling assertion tests rejection ABOVE the bound, so a DB CHECK that had been
    // narrowed to `< MAX` (or to a lower number entirely) would pass all of them. This is the
    // accept-at-the-boundary half.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const rows = await tx
      .insert(schema.pariwarDriveTargetSchedule)
      .values({
        ...rawSchedule(PARIWAR_A, 1, new Date(), null),
        targetInr: MAX_DRIVE_TARGET_INR,
      })
      .returning();
    expect(Number(rows[0]?.targetInr)).toBe(MAX_DRIVE_TARGET_INR);
  });

  it.each([
    ['zero', 0, '23514'],
    ['negative', -1, '23514'],
    // ⭐ DERIVED from the constant (Pass 2) — ⛔ no longer the hard-coded `100_000_001` that stayed
    // green against a stale DB bound.
    ['above the ceiling', MAX_DRIVE_TARGET_INR + 1, '23514'],
  ])('⭐ the money CHECKs are REAL at the DB — a %s target is rejected', async (_l, value, code) => {
    // ⭐ Asserted DIRECTLY, ⛔ never inferred through the accessor — `pools.fixed_amount` is the
    // counter-example: a bare `integer NOT NULL` whose app-side guard is the ONLY guard.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      tx
        .insert(schema.pariwarDriveTargetSchedule)
        .values({ ...rawSchedule(PARIWAR_A, 1, new Date(), null), targetInr: value }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === code);
  });

  it('⭐⭐ `member ≥ public` is a DB FACT — public-revealed-while-member-hidden is rejected (23514)', async () => {
    // ⛔ The one refused combination of the four (`2026-09-04-189` cl.3, `-195` cl.1). AC4 requires
    // it ENFORCED, and this is the layer that survives a handler being refactored.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, false, true)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⭐ …and it also bites on UPDATE, ⛔ not only on INSERT', async () => {
    // ⚠ A CHECK applies to both, but the failure that matters operationally is an UPDATE: a Pariwar
    // already revealed to members and the public, whose member reveal is then withdrawn while the
    // public one stands. ⛔ Asserted rather than assumed.
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await tx.insert(schema.pariwarDriveTargetVisibility).values(rawVisibility(PARIWAR_A, true, true));
    await expect(
      tx.update(schema.pariwarDriveTargetVisibility).set({ revealToMembers: false }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it.each([
    ['both hidden', false, false],
    ['members only', true, false],
    ['both revealed', true, true],
  ])('the other three combinations are accepted at the DB — %s', async (_l, members, publicly) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const rows = await tx
      .insert(schema.pariwarDriveTargetVisibility)
      .values(rawVisibility(PARIWAR_A, members, publicly))
      .returning();
    expect(rows[0]?.revealToMembers).toBe(members);
    expect(rows[0]?.revealToPublic).toBe(publicly);
  });

  it('⛔ the SCHEDULE table carries ⛔ NO reveal-flag column (D2, asserted against the catalog)', async () => {
    // ⭐⭐ THE STRUCTURAL GUARANTEE, ASSERTED AS A DB FACT. AC3's "a `pariwar_admin` target change
    // leaves both flags byte-unchanged" is TRUE BY CONSTRUCTION only while this holds. A future
    // "simplification" that merges the two records back together fails HERE, loudly, rather than
    // silently re-creating the authority collapse D2 was ruled to prevent.
    const { client } = getTx();
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [SCHEDULE_TABLE],
    );
    const names = cols.rows.map((r) => r.column_name);
    expect(names).not.toContain('reveal_to_members');
    expect(names).not.toContain('reveal_to_public');
    // ⭐ And the mirror image: the visibility table carries NO target column, so a reveal can never
    // change what is being revealed.
    const visCols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [VISIBILITY_TABLE],
    );
    expect(visCols.rows.map((r) => r.column_name)).not.toContain('target_inr');
  });
});

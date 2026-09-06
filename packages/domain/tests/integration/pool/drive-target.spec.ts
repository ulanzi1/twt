// The per-Pariwar DRIVE TARGET — live-DB integration (Story 11b.13, Tasks 2/3/5; AC1-AC4).
//
// Governance of record: `2026-09-04-190` cl.7 (Trustee-ratified) · `-191` cl.4 · `-189` cl.3 ·
// `2026-09-05-201` (the concurrency controls) · `2026-09-06-203` (the keys and the records).
//
// ⚠⛔ **THIS STORY BUILDS A CONTROL WITH ⛔ NO VISIBLE OUTPUT** (Trap 3): the target is rendered
// nowhere, and Story 11b.14 is its first consumer. ⇒ **these tests are the ONLY proof it works.**
// There is nothing to look at.
//
// What is proven here, and ⛔ nothing a pure test already covers (`tests/pool/drive-target.test.ts`
// owns the bounds and the `member ≥ public` predicate):
//   · (a) HIDDEN IS THE DEFAULT — a Pariwar with no configuration reveals the target to NOBODY, and
//        a newly SET target is HIDDEN. ⛔ Setting is ⛔ never revealing (cl.7(b), AC4).
//   · (b) THE VERSIONED SHAPE — a second change CLOSES the head and inserts `version + 1`; the
//        partial unique refuses a second open head; the prior windows survive as a TRAIL (AC1).
//   · (c) THE WINDOW RESOLVER returns the row IN FORCE at `asOf`, ⛔ not merely the newest.
//   · (d) THE MONEY CHECKS ARE REAL, at the accessor AND at the DB: non-integer, negative, **ZERO**
//        and absurd values are rejected. ⚠ `0` is a REJECTION case, ⛔ not a boundary pass (Trap 4).
//   · (e) `pariwar_admin` CAN set and ⛔ CANNOT reveal (AC3's regression guard); `super_admin` can do
//        both; `district_admin` / `state_trustee` can do neither.
//   · (f) ⭐⭐ A `pariwar_admin` TARGET CHANGE LEAVES BOTH FLAGS **BYTE-UNCHANGED** (AC3 / D2).
//   · (g) `2026-09-05-201`'s `expectedVersion` — a stale value gets the REGISTERED conflict, ⛔ never
//        a silent overwrite and ⛔ never a bare `23505`.
//   · (h) `member ≥ public` is REFUSED at the accessor AND by the DB CHECK (AC4).
//   · (i) the governance refusals are the ACCESSOR's — no rationale, no anchor, no display name.
//   · (j) TENANT ISOLATION — PARIWAR_B's target is invisible under PARIWAR_A's scope.
//
// Heeds [[project_live_db_test_gotchas]]: asserts MEMBERSHIP / explicit values (⛔ never bare counts
// over a shared tenant), ⛔ never regenerates an applied migration, ⛔ never DROPs a schema.

import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { userId as toUserId } from '../../../src/ids/index.js';
import {
  DRIVE_TARGET_PERMISSION_KEY,
  DRIVE_TARGET_VISIBILITY_PERMISSION_KEY,
  DriveTargetInvalidError,
  DriveTargetVersionConflictError,
  DriveTargetVisibilityInvalidError,
  MAX_DRIVE_TARGET_INR,
  UngovernedDriveTargetChangeError,
  getDriveTargetHead,
  resolveDriveTargetVisibility,
  resolveEffectiveDriveTargetInr,
  setDriveTargetSchedule,
  setDriveTargetVisibility,
} from '../../../src/pool/index.js';
import type { EffectiveGrant } from '../../../src/rbac/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const T0 = new Date('2026-06-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (n: number) => new Date(T0.getTime() + n * DAY_MS);

const ACTOR = toUserId('55555555-5555-5555-5555-555555555555');
const DISPLAY = 'Test Admin';

/**
 * A `pariwar_admin` grant — the role `2026-09-04-190` cl.7(a) names as the SETTER.
 *
 * ⚠ Neither key is listed here, and that is the MECHANISM rather than a shortcut: `hasPermission`
 * resolves a ROLE to its seeded bundle. ⇒ these grants carry `pariwar.manage_drive_target` only
 * because `roles.ts` grants it, so a test that "granted" the key directly would still pass if the
 * bundle edit were reverted. ⭐ The same property is what makes the REVEAL denial below meaningful.
 */
function pariwarAdminGrants(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'pariwar_admin', pariwarId, scopeDimension: 'pariwar', scopeValue: pariwarId }];
}

/** A `super_admin` grant — carries BOTH keys, and only because `PERMISSION_CATALOG.keys` does. */
function superAdminGrants(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'super_admin', pariwarId, scopeDimension: 'global', scopeValue: null }];
}

/** A `district_admin` grant — INERT on a pariwar-dimension key in both directions. */
function districtAdminGrants(pariwarId: string): EffectiveGrant[] {
  return [
    { role: 'district_admin', pariwarId, scopeDimension: 'district', scopeValue: randomUUID() },
  ];
}

/** A `state_trustee` grant — inert for the mirror-image reason (a broader ceiling). */
function stateTrusteeGrants(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'state_trustee', pariwarId, scopeDimension: 'state', scopeValue: randomUUID() }];
}

/**
 * Run a statement expected to violate a DB constraint, and return the constraint NAME.
 *
 * ⚠ TWO gotchas, both load-bearing (carried from the masking spec, ⛔ not re-learned):
 *   (1) the constraint name is on `err.cause`, ⛔ not on the drizzle wrapper's own message — so
 *       `rejects.toThrow(/constraint_name/)` would ⛔ never match and the probe would be vacuous
 *       ([[project_domain_limit_clamp_and_savepoint_retry]]);
 *   (2) a failed statement ABORTS the enclosing transaction, so a second probe in the same tx would
 *       fail with *"current transaction is aborted"* carrying ⛔ NO constraint — a PASS-shaped
 *       `undefined` that silently makes every probe after the first meaningless.
 *   ⇒ each probe runs inside its own raw SAVEPOINT.
 */
let probeSeq = 0;
async function constraintOf(
  client: { query: (q: string) => Promise<unknown> },
  run: () => Promise<unknown>,
): Promise<string | undefined> {
  const sp = `probe_${String((probeSeq += 1))}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    await run();
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return undefined;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    return (err as { cause?: { constraint?: string } }).cause?.constraint;
  }
}

/** The minimum governed target write, with everything the accessor refuses to skip. */
function targetInput(overrides: Partial<Parameters<typeof setDriveTargetSchedule>[1]> = {}) {
  return {
    pariwarId: PARIWAR_A,
    targetInr: 500_000,
    expectedVersion: null as number | null,
    effectiveFrom: at(0),
    changedByActor: ACTOR,
    changedByDisplay: DISPLAY,
    rationale: 'Trustee resolution of 6 September — this Pariwar aims to raise ₹5,00,000 per drive.',
    auditId: randomUUID(),
    actorGrants: pariwarAdminGrants(PARIWAR_A),
    ...overrides,
  };
}

/** The minimum governed reveal write. */
function visibilityInput(
  overrides: Partial<Parameters<typeof setDriveTargetVisibility>[1]> = {},
) {
  return {
    pariwarId: PARIWAR_A,
    visibility: { revealToMembers: true, revealToPublic: false },
    changedByActor: ACTOR,
    changedByDisplay: DISPLAY,
    rationale: 'Trust decision — members of this Pariwar may see the target.',
    auditId: randomUUID(),
    actorGrants: superAdminGrants(PARIWAR_A),
    now: at(0),
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('per-Pariwar drive target (PARIWAR_A scope)', () => {
  setupLiveDb();

  // ── (a) HIDDEN IS THE DEFAULT, AND SETTING IS NEVER REVEALING (AC4) ───────────────────────────

  it('a Pariwar with no configuration has NO target and reveals it to NOBODY', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // ⭐ `null` is a first-class ABSENCE — Story 11b.14's ruled "⛔ no target ⇒ ⛔ no bar".
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(1))).toBeNull();
    expect(await getDriveTargetHead(tx, PARIWAR_A)).toBeNull();
    // ⭐⭐ FAIL-CLOSED — cl.7(b). ⚠ The deliberate OPPOSITE of the masking schedule's `D8-default`
    // FAIL-OPEN: an absent row here lands on NON-DISCLOSURE.
    expect(await resolveDriveTargetVisibility(tx, PARIWAR_A)).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
  });

  it('a newly SET target is HIDDEN — setting is ⛔ never revealing (cl.7(b), AC4)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await setDriveTargetSchedule(tx, targetInput());

    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(1))).toBe(500_000);
    // ⭐ The target exists and is still invisible to everyone. The setter CANNOT have created a
    // visibility row — the flags are not columns on the table it writes (D2).
    expect(await resolveDriveTargetVisibility(tx, PARIWAR_A)).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
    const rows = await tx
      .select()
      .from(schema.pariwarDriveTargetVisibility)
      .where(eq(schema.pariwarDriveTargetVisibility.pariwarId, PARIWAR_A));
    expect(rows).toEqual([]);
  });

  // ── (b)(c) THE VERSIONED EFFECTIVE-WINDOW SHAPE (AC1) ─────────────────────────────────────────

  it('a second change CLOSES the head and inserts version + 1, and the prior window SURVIVES', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const first = await setDriveTargetSchedule(tx, targetInput());
    expect(first.version).toBe(1);
    expect(first.effectiveUntil).toBeNull();

    const second = await setDriveTargetSchedule(
      tx,
      targetInput({ targetInr: 750_000, expectedVersion: 1, effectiveFrom: at(10) }),
    );
    expect(second.version).toBe(2);
    expect(second.effectiveUntil).toBeNull();

    // ⭐ THE TRAIL: both rows survive; the first is CLOSED at exactly the second's start instant.
    const all = await tx
      .select()
      .from(schema.pariwarDriveTargetSchedule)
      .where(eq(schema.pariwarDriveTargetSchedule.pariwarId, PARIWAR_A))
      .orderBy(asc(schema.pariwarDriveTargetSchedule.version));
    expect(all.map((r) => r.version)).toEqual([1, 2]);
    expect(all.map((r) => r.targetInr)).toEqual([500_000, 750_000]);
    expect(all[0]?.effectiveUntil?.toISOString()).toBe(at(10).toISOString());
    expect(all[1]?.effectiveUntil).toBeNull();
    // ⛔ AND THE OLD RATIONALE IS NOT OVERWRITTEN — the change trail AC2 requires.
    expect(all[0]?.rationale).not.toBeNull();
  });

  it('the resolver returns the row IN FORCE at asOf, ⛔ not merely the newest', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await setDriveTargetSchedule(tx, targetInput());
    await setDriveTargetSchedule(
      tx,
      targetInput({ targetInr: 750_000, expectedVersion: 1, effectiveFrom: at(10) }),
    );

    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(5))).toBe(500_000);
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(20))).toBe(750_000);
    // Before the first window opens there is no target in force at all.
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(-1))).toBeNull();
  });

  it('the partial unique REFUSES a second open head (a raw insert bypassing the accessor)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await setDriveTargetSchedule(tx, targetInput());

    // ⛔ The accessor closes the head; this bypasses it deliberately, to prove the DB — not the
    // accessor — is what makes "one currently-in-force row per Pariwar" true.
    expect(
      await constraintOf(client, () =>
        tx.insert(schema.pariwarDriveTargetSchedule).values({
          pariwarId: PARIWAR_A,
          version: 99,
          targetInr: 111,
          effectiveFrom: at(5),
          effectiveUntil: null,
        }),
      ),
    ).toBe('pariwar_drive_target_schedule_pariwar_current_uq');
  });

  // ── (d) IT IS MONEY — VALIDATED LIKE MONEY, AND `0` IS A REJECTION (Trap 4) ───────────────────

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['non-integer', 500.5],
    ['above the ceiling', MAX_DRIVE_TARGET_INR + 1],
  ])('the accessor REJECTS a %s target', async (_label, value) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(setDriveTargetSchedule(tx, targetInput({ targetInr: value }))).rejects.toThrow(
      DriveTargetInvalidError,
    );
  });

  it('⭐ `0` is a REJECTION, ⛔ not a boundary pass — and 1 is the smallest legal target', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // ⛔⛔ A ₹0 target is a DIVISION BY ZERO for Story 11b.14's meter, and it is a DIFFERENT state
    // from "no target set" (the ABSENCE of a row). A `>= 0` bound would have collapsed the two.
    await expect(setDriveTargetSchedule(tx, targetInput({ targetInr: 0 }))).rejects.toThrow(
      DriveTargetInvalidError,
    );
    const row = await setDriveTargetSchedule(tx, targetInput({ targetInr: 1 }));
    expect(row.targetInr).toBe(1);
  });

  it('the DB CHECKs are REAL — a raw insert of 0, of a negative, and of an absurd target all fail', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // ⭐ The accessor is not the only guard. `pools.fixed_amount` carries NO check at all; this
    // table is modelled on `pool_fixed_amount_schedule`, which does.
    for (const [value, constraint] of [
      [0, 'pariwar_drive_target_schedule_target_positive'],
      [-5, 'pariwar_drive_target_schedule_target_positive'],
      [MAX_DRIVE_TARGET_INR + 1, 'pariwar_drive_target_schedule_target_max'],
    ] as const) {
      expect(
        await constraintOf(client, () =>
          tx.insert(schema.pariwarDriveTargetSchedule).values({
            pariwarId: PARIWAR_A,
            version: 1,
            targetInr: value,
            effectiveFrom: at(0),
            effectiveUntil: null,
          }),
        ),
      ).toBe(constraint);
    }
    // ⭐ And the inverted-window guard, on the same table.
    expect(
      await constraintOf(client, () =>
        tx.insert(schema.pariwarDriveTargetSchedule).values({
          pariwarId: PARIWAR_A,
          version: 1,
          targetInr: 500,
          effectiveFrom: at(10),
          effectiveUntil: at(5),
        }),
      ),
    ).toBe('pariwar_drive_target_schedule_window_not_inverted');
  });

  // ── (e)(f) THE AUTHORITY SPLIT (AC2, AC3) ─────────────────────────────────────────────────────

  it('`pariwar_admin` CAN set the target', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await setDriveTargetSchedule(
      tx,
      targetInput({ actorGrants: pariwarAdminGrants(PARIWAR_A) }),
    );
    expect(row.targetInr).toBe(500_000);
  });

  it('⭐⭐ `pariwar_admin` ⛔ CANNOT reveal — AC3\'s regression guard', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // ⛔⛔ THE REGRESSION THIS EXISTS TO PREVENT: the write key quietly carrying the reveal.
    // `2026-09-04-190` cl.7(c) reserves the disclosure act to the Trust.
    await expect(
      setDriveTargetVisibility(
        tx,
        visibilityInput({ actorGrants: pariwarAdminGrants(PARIWAR_A) }),
      ),
    ).rejects.toThrow(UngovernedDriveTargetChangeError);
    // And nothing was written.
    expect(await resolveDriveTargetVisibility(tx, PARIWAR_A)).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
  });

  it('`super_admin` can do BOTH', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await setDriveTargetSchedule(tx, targetInput({ actorGrants: superAdminGrants(PARIWAR_A) }));
    const vis = await setDriveTargetVisibility(tx, visibilityInput());
    expect(vis.revealToMembers).toBe(true);
    expect(vis.revealToPublic).toBe(false);
  });

  it.each([
    ['district_admin', districtAdminGrants],
    ['state_trustee', stateTrusteeGrants],
  ])('%s can do NEITHER — inert in both directions', async (_role, grantsFn) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDriveTargetSchedule(tx, targetInput({ actorGrants: grantsFn(PARIWAR_A) })),
    ).rejects.toThrow(UngovernedDriveTargetChangeError);
    await expect(
      setDriveTargetVisibility(tx, visibilityInput({ actorGrants: grantsFn(PARIWAR_A) })),
    ).rejects.toThrow(UngovernedDriveTargetChangeError);
  });

  it('⭐⭐ a `pariwar_admin` TARGET change leaves BOTH reveal flags BYTE-UNCHANGED (AC3 / D2)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // The Trust reveals to members (and only the Trust can).
    const before = await setDriveTargetVisibility(tx, visibilityInput());
    // Then a Pariwar Admin changes the target, twice.
    await setDriveTargetSchedule(tx, targetInput());
    await setDriveTargetSchedule(
      tx,
      targetInput({ targetInr: 900_000, expectedVersion: 1, effectiveFrom: at(10) }),
    );

    const after = await tx
      .select()
      .from(schema.pariwarDriveTargetVisibility)
      .where(eq(schema.pariwarDriveTargetVisibility.pariwarId, PARIWAR_A));
    expect(after).toHaveLength(1);
    const row = after[0];
    // ⭐ BYTE-UNCHANGED — flags, attribution, rationale, anchor and `updated_at` all identical.
    // ⚠ This is TRUE BY CONSTRUCTION (the setter cannot name a flag column), ⛔ not by discipline —
    // the assertion is what would catch someone merging the two records back together.
    expect(row?.revealToMembers).toBe(before.revealToMembers);
    expect(row?.revealToPublic).toBe(before.revealToPublic);
    expect(row?.rationale).toBe(before.rationale);
    expect(row?.changedByActor).toBe(before.changedByActor);
    expect(row?.changedByDisplay).toBe(before.changedByDisplay);
    expect(row?.auditId).toBe(before.auditId);
    expect(row?.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());
  });

  // ── (g) `2026-09-05-201`'s LOST-UPDATE GUARD ──────────────────────────────────────────────────

  it('⭐⭐ a STALE `expectedVersion` gets the registered conflict — ⛔ never a silent overwrite', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await setDriveTargetSchedule(tx, targetInput());
    // Admin B raced ahead.
    await setDriveTargetSchedule(
      tx,
      targetInput({ targetInr: 750_000, expectedVersion: 1, effectiveFrom: at(10) }),
    );

    // Admin A still holds the version-1 view and submits.
    await expect(
      setDriveTargetSchedule(
        tx,
        targetInput({ targetInr: 100_000, expectedVersion: 1, effectiveFrom: at(20) }),
      ),
    ).rejects.toThrow(DriveTargetVersionConflictError);

    // ⭐⭐ AND B'S CHANGE STANDS — this is the whole finding of `2026-09-05-201`: the advisory lock
    // converts a race into a QUEUE in which both writers succeed and the second never learns the
    // first happened. ⛔ Without this guard A's ₹1,00,000 would be version 3, with A's rationale
    // recorded as the justification for silently reverting B.
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(30))).toBe(750_000);
    const head = await getDriveTargetHead(tx, PARIWAR_A);
    expect(head?.version).toBe(2);
  });

  it('`expectedVersion: null` is the LEGITIMATE first write, and is REFUSED once a head exists', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // ⭐ `null` is a REAL value — "I believe there is no schedule yet" — which makes the FIRST write
    // safe too when two admins configure a fresh Pariwar at once.
    await setDriveTargetSchedule(tx, targetInput({ expectedVersion: null }));
    await expect(
      setDriveTargetSchedule(tx, targetInput({ expectedVersion: null, effectiveFrom: at(5) })),
    ).rejects.toThrow(DriveTargetVersionConflictError);
  });

  // ── (h) `member ≥ public` (AC4) ───────────────────────────────────────────────────────────────

  it('⭐⭐ public-revealed-while-member-hidden is REFUSED at the accessor', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDriveTargetVisibility(
        tx,
        visibilityInput({ visibility: { revealToMembers: false, revealToPublic: true } }),
      ),
    ).rejects.toThrow(DriveTargetVisibilityInvalidError);
  });

  it('⭐ …and by the DB CHECK — a raw insert bypassing the accessor also fails', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // ⚠ Family 5: an app rule on a disclosure boundary owes a constraint that mirrors it. ⛔ The
    // handler is not the only thing standing between the public and more than a member sees.
    expect(
      await constraintOf(client, () =>
        tx.insert(schema.pariwarDriveTargetVisibility).values({
          pariwarId: PARIWAR_A,
          revealToMembers: false,
          revealToPublic: true,
        }),
      ),
    ).toBe('pariwar_drive_target_visibility_member_ge_public');
  });

  it('the other THREE combinations are all expressible — the switches are INDEPENDENT (AC3)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    for (const visibility of [
      { revealToMembers: false, revealToPublic: false },
      { revealToMembers: true, revealToPublic: false },
      { revealToMembers: true, revealToPublic: true },
    ]) {
      const row = await setDriveTargetVisibility(tx, visibilityInput({ visibility }));
      expect({
        revealToMembers: row.revealToMembers,
        revealToPublic: row.revealToPublic,
      }).toEqual(visibility);
    }
    // ⭐ And it moves in EVERY direction — a public reveal can be withdrawn.
    const back = await setDriveTargetVisibility(
      tx,
      visibilityInput({ visibility: { revealToMembers: false, revealToPublic: false } }),
    );
    expect(back.revealToPublic).toBe(false);
  });

  it('the reveal setter ⛔ CANNOT touch the target — the mirror-image guarantee', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await setDriveTargetSchedule(tx, targetInput());
    await setDriveTargetVisibility(tx, visibilityInput());
    await setDriveTargetVisibility(
      tx,
      visibilityInput({ visibility: { revealToMembers: true, revealToPublic: true } }),
    );

    // The figure is untouched, and so is its version chain.
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_A, at(1))).toBe(500_000);
    expect((await getDriveTargetHead(tx, PARIWAR_A))?.version).toBe(1);
  });

  // ── (i) THE GOVERNANCE REFUSALS ARE THE ACCESSOR'S ────────────────────────────────────────────

  it.each([
    ['a blank rationale', { rationale: '   ' }],
    ['no audit anchor', { auditId: null }],
    ['an attributed change with no display name', { changedByDisplay: '' }],
    ['a system write carrying a human display name', { changedByActor: null }],
    ['grants that do not carry the key', { actorGrants: [] as EffectiveGrant[] }],
  ])('the TARGET write refuses %s', async (_label, overrides) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDriveTargetSchedule(tx, targetInput(overrides)),
    ).rejects.toThrow(UngovernedDriveTargetChangeError);
  });

  it.each([
    ['a blank rationale', { rationale: '' }],
    ['no audit anchor', { auditId: null }],
    ['an attributed change with no display name', { changedByDisplay: '' }],
    ['grants that do not carry the key', { actorGrants: [] as EffectiveGrant[] }],
  ])('the REVEAL write refuses %s', async (_label, overrides) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      setDriveTargetVisibility(tx, visibilityInput(overrides)),
    ).rejects.toThrow(UngovernedDriveTargetChangeError);
  });

  it('the permission keys are the CATALOG\'s strings, ⛔ not re-typed literals', () => {
    expect(DRIVE_TARGET_PERMISSION_KEY).toBe('pariwar.manage_drive_target');
    expect(DRIVE_TARGET_VISIBILITY_PERMISSION_KEY).toBe('pariwar.manage_drive_target_visibility');
  });

  // ── (j) TENANT ISOLATION ──────────────────────────────────────────────────────────────────────

  it('PARIWAR_B\'s target and reveal posture are INVISIBLE under PARIWAR_A\'s scope', async () => {
    const { tx, client } = getTx();

    // Seed B as superuser (RLS bypassed), BEFORE entering app scope.
    await tx.insert(schema.pariwarDriveTargetSchedule).values({
      pariwarId: PARIWAR_B,
      version: 1,
      targetInr: 42_000,
      effectiveFrom: at(0),
      effectiveUntil: null,
    });
    await tx.insert(schema.pariwarDriveTargetVisibility).values({
      pariwarId: PARIWAR_B,
      revealToMembers: true,
      revealToPublic: true,
    });

    await enterAppScope(client, PARIWAR_A);

    // ⭐ Membership assertions, ⛔ never counts over the shared fixture.
    expect(await resolveEffectiveDriveTargetInr(tx, PARIWAR_B, at(1))).toBeNull();
    // ⭐⭐ AND B'S REVEAL DOES NOT LEAK ACROSS: an out-of-scope read lands on the FAIL-CLOSED
    // default, ⛔ never on B's `revealToPublic: true`.
    expect(await resolveDriveTargetVisibility(tx, PARIWAR_B)).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
    const visible = await tx
      .select({ pariwarId: schema.pariwarDriveTargetSchedule.pariwarId })
      .from(schema.pariwarDriveTargetSchedule)
      .where(eq(schema.pariwarDriveTargetSchedule.pariwarId, PARIWAR_B));
    expect(visible).toEqual([]);
  });

  it('an ADJACENT-tenant head does not satisfy this tenant\'s open-head guard', async () => {
    const { tx, client } = getTx();
    await tx.insert(schema.pariwarDriveTargetSchedule).values({
      pariwarId: PARIWAR_B,
      version: 1,
      targetInr: 42_000,
      effectiveFrom: at(0),
      effectiveUntil: null,
    });
    await enterAppScope(client, PARIWAR_A);
    // A's first write is still version 1 — the version chain is PER PARIWAR.
    const row = await setDriveTargetSchedule(tx, targetInput());
    expect(row.version).toBe(1);
    const mine = await tx
      .select()
      .from(schema.pariwarDriveTargetSchedule)
      .where(
        and(
          eq(schema.pariwarDriveTargetSchedule.pariwarId, PARIWAR_A),
          eq(schema.pariwarDriveTargetSchedule.version, 1),
        ),
      );
    expect(mine.map((r) => r.targetInr)).toEqual([500_000]);
  });
});

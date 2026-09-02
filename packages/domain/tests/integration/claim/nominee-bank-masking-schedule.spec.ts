// The per-Pariwar nominee-bank MASKING SCHEDULE — live-DB integration (Story 11b.3a, Task 1; AC3).
//
// The DB shell of the effective-dated masking schedule, against real Postgres under PARIWAR_A inside
// the per-test BEGIN/ROLLBACK envelope. What is proven here, and ⛔ nothing that a pure test already
// covers (`tests/claim/nominee-bank-masking.test.ts` owns the projection and the predicate):
//   · (a) FAIL-OPEN — a Pariwar with NO row resolves to `null`, ⛔ never to a masked default
//        (`D8-default`, `2026-09-02-179` cl.1; cl.10(b) forbids the code assuming immediate masking).
//   · (b) all THREE ruled settings round-trip through the DB, ⛔ including `after_days: 0`.
//   · (c) REVERSIBILITY (cl.10(c)) — the head closes and a new one opens, in EVERY direction, and the
//        prior windows SURVIVE as a trail.
//   · (d) the window resolver — the row IN FORCE at `asOf`, ⛔ not merely the newest.
//   · (e) the DB CHECK is REAL, in BOTH directions: a `permanent` row carrying a day count and an
//        `after_days` row carrying NULL are both rejected by Postgres.
//   · (f) the governance refusals are the ACCESSOR's, ⛔ not the route's — no rationale, no anchor,
//        no grant.
//   · (g) TENANT ISOLATION — PARIWAR_B's schedule is invisible under PARIWAR_A's scope.
//
// Heeds [[project_live_db_test_gotchas]]: asserts MEMBERSHIP / explicit values (⛔ never bare counts
// over a shared tenant), ⛔ never regenerates an applied migration, ⛔ never DROPs a schema; seeds
// under superuser then reads back under app scope.

import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  NOMINEE_BANK_MASKING_PERMISSION_KEY,
  UngovernedNomineeBankMaskingChangeError,
  getNomineeBankMaskingHead,
  resolveEffectiveNomineeBankMasking,
  setNomineeBankMaskingSchedule,
} from '../../../src/claim/index.js';
import { userId as toUserId } from '../../../src/ids/index.js';
import type { EffectiveGrant } from '../../../src/rbac/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const T0 = new Date('2026-06-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (n: number) => new Date(T0.getTime() + n * DAY_MS);

/**
 * A `super_admin` grant — the ONLY holder of the minted key (`2026-09-02-178`).
 *
 * ⚠ The key is ⛔ NOT listed here, and that is the mechanism rather than a shortcut: `hasPermission`
 * resolves a ROLE to its bundle, and `super_admin`'s bundle is derived FROM `PERMISSION_CATALOG.keys`.
 * ⇒ this grant carries the key only because the catalog does — so a test that "grants" it directly
 * would pass even if `2026-09-02-183` cl.1's mint were reverted.
 */
function grantsFor(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'super_admin', pariwarId, scopeDimension: 'global', scopeValue: null }];
}

/**
 * A `pariwar_admin` grant — the role `2026-09-02-178` **FORECLOSED**.
 *
 * ⭐ Its denial below is the ruling's teeth: granting this key to `pariwar_admin` "for symmetry" with
 * every other pariwar-dimension content key is the *"reverse a ratified ruling by way of a catalog
 * edit"* move, and this assertion is what would fail if someone made it.
 */
function pariwarAdminGrants(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'pariwar_admin', pariwarId, scopeDimension: 'pariwar', scopeValue: pariwarId }];
}

const ACTOR = toUserId('55555555-5555-5555-5555-555555555555');

describe.skipIf(!hasDatabase)('nominee-bank masking schedule (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('(a) ⭐ FAIL-OPEN — a Pariwar with NO schedule row resolves to `null`, ⛔ never to masked', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // ⛔ NOT an assertion about a count: it asks the resolver the question the render path asks.
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(9999))).toBeNull();
    expect(await getNomineeBankMaskingHead(tx, PARIWAR_A)).toBeNull();
  });

  it('(b) all THREE ruled settings round-trip — including `after_days: 0`', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const grants = grantsFor(PARIWAR_A);

    const write = (setting: Parameters<typeof setNomineeBankMaskingSchedule>[1]['setting'], from: Date) =>
      setNomineeBankMaskingSchedule(tx, {
        pariwarId: PARIWAR_A,
        setting,
        effectiveFrom: from,
        changedByActor: ACTOR,
        changedByDisplay: 'Trustee One',
        rationale: 'ratified window',
        auditId: randomUUID(),
        actorGrants: grants,
      });

    await write({ mode: 'after_days', maskAfterDays: 30 }, at(0));
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(1))).toEqual({
      mode: 'after_days',
      maskAfterDays: 30,
    });

    // ⭐ ZERO IS A VALUE AN ADMIN CHOSE (cl.10(b)) — it must survive the round trip as itself, ⛔ not
    // be normalised into "no setting" by a falsy check anywhere on the path.
    await write({ mode: 'after_days', maskAfterDays: 0 }, at(2));
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(3))).toEqual({
      mode: 'after_days',
      maskAfterDays: 0,
    });

    await write({ mode: 'permanent' }, at(4));
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(5))).toEqual({
      mode: 'permanent',
    });
  });

  it('(c) ⭐ REVERSIBLE IN EVERY DIRECTION, and the prior windows SURVIVE (cl.10(c))', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const grants = grantsFor(PARIWAR_A);
    const write = (setting: Parameters<typeof setNomineeBankMaskingSchedule>[1]['setting'], from: Date) =>
      setNomineeBankMaskingSchedule(tx, {
        pariwarId: PARIWAR_A,
        setting,
        effectiveFrom: from,
        changedByActor: ACTOR,
        changedByDisplay: 'Trustee One',
        rationale: 'ratified window',
        auditId: randomUUID(),
        actorGrants: grants,
      });

    await write({ mode: 'permanent' }, at(0));
    // ⛔ There is no "already masked, cannot unmask" branch — a permanent Pariwar returns to a window.
    const back = await write({ mode: 'after_days', maskAfterDays: 30 }, at(10));
    expect(back.maskingMode).toBe('after_days');
    expect(back.version).toBe(2);
    expect(back.effectiveUntil).toBeNull();

    const rows = await tx
      .select({
        version: schema.pariwarNomineeBankMaskingSchedule.version,
        mode: schema.pariwarNomineeBankMaskingSchedule.maskingMode,
        until: schema.pariwarNomineeBankMaskingSchedule.effectiveUntil,
      })
      .from(schema.pariwarNomineeBankMaskingSchedule)
      .where(eq(schema.pariwarNomineeBankMaskingSchedule.pariwarId, PARIWAR_A))
      .orderBy(asc(schema.pariwarNomineeBankMaskingSchedule.version));
    // ⭐ MEMBERSHIP + explicit values: the superseded window is CLOSED, ⛔ not deleted — a governance
    // trail, which is the whole reason this is a schedule and not a mutable config row.
    expect(rows.map((r) => [r.version, r.mode, r.until === null])).toEqual([
      [1, 'permanent', false],
      [2, 'after_days', true],
    ]);
    expect(rows[0]!.until?.toISOString()).toBe(at(10).toISOString());
  });

  it('(d) the resolver returns the row IN FORCE at `asOf`, ⛔ not merely the newest', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const grants = grantsFor(PARIWAR_A);
    await setNomineeBankMaskingSchedule(tx, {
      pariwarId: PARIWAR_A,
      setting: { mode: 'after_days', maskAfterDays: 30 },
      effectiveFrom: at(0),
      changedByActor: ACTOR,
      changedByDisplay: 'Trustee One',
      rationale: 'first window',
      auditId: randomUUID(),
      actorGrants: grants,
    });
    await setNomineeBankMaskingSchedule(tx, {
      pariwarId: PARIWAR_A,
      setting: { mode: 'permanent' },
      effectiveFrom: at(10),
      changedByActor: ACTOR,
      changedByDisplay: 'Trustee One',
      rationale: 'tightened',
      auditId: randomUUID(),
      actorGrants: grants,
    });

    // Before the supersession instant the FIRST window still governs.
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(5))).toEqual({
      mode: 'after_days',
      maskAfterDays: 30,
    });
    // At and after it, the second does. `[from, until)` — the boundary belongs to the NEW window.
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(10))).toEqual({
      mode: 'permanent',
    });
    // ⭐ And BEFORE the first window opens there is nothing in force ⇒ FAIL-OPEN, not the newest row.
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(-1))).toBeNull();
  });

  it('(e) ⛔ the DB CHECK is REAL, in BOTH directions', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // ⚠ TWO gotchas, both load-bearing for this probe:
    //   (1) the constraint NAME is on `err.cause`, ⛔ not on the drizzle wrapper's own message — the
    //       same shape as the `23505`-on-`err.cause.code` case
    //       ([[project_domain_limit_clamp_and_savepoint_retry]]);
    //   (2) a failed statement ABORTS the enclosing transaction, so a second probe in the same tx
    //       would fail with "current transaction is aborted" and carry ⛔ NO constraint — a
    //       false PASS-shaped `undefined` that silently makes every probe after the first vacuous.
    //       ⇒ each probe runs inside its own raw SAVEPOINT.
    let probe = 0;
    const constraintOf = async (run: () => Promise<unknown>): Promise<string | undefined> => {
      const sp = `probe_${String((probe += 1))}`;
      await client.query(`SAVEPOINT ${sp}`);
      try {
        await run();
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        return undefined;
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        return (err as { cause?: { constraint?: string } }).cause?.constraint;
      }
    };

    // A 'permanent' row carrying a day count.
    expect(
      await constraintOf(() =>
        tx.insert(schema.pariwarNomineeBankMaskingSchedule).values({
          pariwarId: PARIWAR_A,
          version: 1,
          maskingMode: 'permanent',
          maskAfterDays: 7,
          effectiveFrom: at(0),
        }),
      ),
    ).toBe('pariwar_nominee_bank_masking_schedule_setting_check');

    // An 'after_days' row carrying NULL.
    expect(
      await constraintOf(() =>
        tx.insert(schema.pariwarNomineeBankMaskingSchedule).values({
          pariwarId: PARIWAR_A,
          version: 2,
          maskingMode: 'after_days',
          maskAfterDays: null,
          effectiveFrom: at(0),
        }),
      ),
    ).toBe('pariwar_nominee_bank_masking_schedule_setting_check');

    // ⭐ And the DATA-SANITY ceiling bites too — an admin typo of a nine-digit day count must not
    // become de-facto permanence entered by accident.
    expect(
      await constraintOf(() =>
        tx.insert(schema.pariwarNomineeBankMaskingSchedule).values({
          pariwarId: PARIWAR_A,
          version: 3,
          maskingMode: 'after_days',
          maskAfterDays: 999_999_999,
          effectiveFrom: at(0),
        }),
      ),
    ).toBe('pariwar_nominee_bank_masking_schedule_setting_check');
  });

  it('(f) the governance refusals are the ACCESSOR\'s — no rationale, no anchor, no grant', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const base = {
      pariwarId: PARIWAR_A,
      setting: { mode: 'permanent' } as const,
      effectiveFrom: at(0),
      changedByActor: ACTOR,
      changedByDisplay: 'Trustee One',
      rationale: 'ratified window',
      auditId: randomUUID(),
      actorGrants: grantsFor(PARIWAR_A),
    };
    await expect(
      setNomineeBankMaskingSchedule(tx, { ...base, rationale: '   ' }),
    ).rejects.toThrow(UngovernedNomineeBankMaskingChangeError);
    await expect(setNomineeBankMaskingSchedule(tx, { ...base, auditId: null })).rejects.toThrow(
      /audit anchor/,
    );
    await expect(
      setNomineeBankMaskingSchedule(tx, { ...base, changedByDisplay: '' }),
    ).rejects.toThrow(/display name/);
    // ⭐ THE DENIAL PATH: an actor whose grants do NOT carry the minted key.
    await expect(setNomineeBankMaskingSchedule(tx, { ...base, actorGrants: [] })).rejects.toThrow(
      new RegExp(NOMINEE_BANK_MASKING_PERMISSION_KEY.replace('.', '\\.')),
    );
    // ⭐⭐ AND `pariwar_admin` IS DENIED — the ruling's teeth. `2026-09-02-178` FORECLOSED it, and
    // granting it "for symmetry" with every other pariwar-dimension content key is the "reverse a
    // ratified ruling by way of a catalog edit" move. ⛔ This assertion is what fails if someone does.
    await expect(
      setNomineeBankMaskingSchedule(tx, { ...base, actorGrants: pariwarAdminGrants(PARIWAR_A) }),
    ).rejects.toThrow(UngovernedNomineeBankMaskingChangeError);
    // ⛔ And nothing was written by any of the four refusals.
    expect(await getNomineeBankMaskingHead(tx, PARIWAR_A)).toBeNull();
  });

  it('(g) TENANT ISOLATION — PARIWAR_B\'s schedule is invisible under PARIWAR_A\'s scope', async () => {
    const { client, tx } = getTx();
    // Seed B's row as superuser (RLS bypassed), then read back under A's app scope.
    await tx.insert(schema.pariwarNomineeBankMaskingSchedule).values({
      pariwarId: PARIWAR_B,
      version: 1,
      maskingMode: 'permanent',
      maskAfterDays: null,
      effectiveFrom: at(0),
      rationale: 'B only',
      auditId: randomUUID(),
    });
    await enterAppScope(client, PARIWAR_A);
    expect(await resolveEffectiveNomineeBankMasking(tx, PARIWAR_A, at(1))).toBeNull();
    // ⭐ MEMBERSHIP, ⛔ not a count: A's scope sees no row belonging to B.
    const visible = await tx
      .select({ pariwarId: schema.pariwarNomineeBankMaskingSchedule.pariwarId })
      .from(schema.pariwarNomineeBankMaskingSchedule)
      .where(
        and(
          eq(schema.pariwarNomineeBankMaskingSchedule.maskingMode, 'permanent'),
          eq(schema.pariwarNomineeBankMaskingSchedule.pariwarId, PARIWAR_B),
        ),
      );
    expect(visible).toEqual([]);
  });
});

// AC7 — THE TARGET AND A MEMBER'S OBLIGATION ⛔ NEVER TOUCH (Story 11b.13, Task 5).
//
// Governance of record: the story's policy-meaning note (AI-10-1, CONFIRMED BigDev 2026-08-18) —
// ⛔ **THIS STORY INTRODUCES ⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT.**
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ WHY THIS FILE EXISTS AT ALL, GIVEN THE TARGET IS OBVIOUSLY UNRELATED
// ══════════════════════════════════════════════════════════════════════════════════════════════
// The target is a **PRESENTATION DENOMINATOR**. A member's obligation is `pools.fixed_amount`. ⇒ the
// two are unrelated **today**, and this file's job is to make that a PINNED FACT rather than an
// observation about the current code.
//
// ⚠ The failure mode it guards is ⛔ not a bug someone would write on purpose. It is the one
// AI-10-1 exists to catch: a *"reasonable"* later change — *"the drive is short of target, so raise
// what each member owes"*, or *"cap the collection at the target"* — that quietly turns a **display
// figure** into a **financial obligation** without anyone ruling that it should be one. A target
// that silently became an obligation would be the AI-10-1 shape exactly.
//
// ⇒ what is asserted is a STRUCTURAL and a BEHAVIOURAL half:
//   · (a) STRUCTURAL — `pool/fixed-amount.ts`, the module that decides what a member owes, does
//        ⛔ NOT reference the drive target in any form. A source-level assertion, because a
//        behavioural test can only sample the inputs it happens to try.
//   · (b) BEHAVIOURAL — `getEffectiveFixedAmount` returns the IDENTICAL amount with the target
//        **unset**, **set** and **changed**, including a target far larger and far smaller than the
//        obligation.
//   · (c) AND THE REVERSE DIRECTION — `pools.fixed_amount` is UNTOUCHED by a target write.
//
// Live DB only.

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { userId as toUserId } from '../../../src/ids/index.js';
import {
  getEffectiveFixedAmount,
  setDriveTargetSchedule,
} from '../../../src/pool/index.js';
import type { EffectiveGrant } from '../../../src/rbac/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const T0 = new Date('2026-06-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (n: number) => new Date(T0.getTime() + n * DAY_MS);

const ACTOR = toUserId('55555555-5555-5555-5555-555555555555');
const OBLIGATION_INR = 500;

function pariwarAdminGrants(pariwarId: string): EffectiveGrant[] {
  return [{ role: 'pariwar_admin', pariwarId, scopeDimension: 'pariwar', scopeValue: pariwarId }];
}

function targetInput(targetInr: number, expectedVersion: number | null, effectiveFrom: Date) {
  return {
    pariwarId: PARIWAR_A,
    targetInr,
    expectedVersion,
    effectiveFrom,
    changedByActor: ACTOR,
    changedByDisplay: 'Test Admin',
    rationale: 'AC7 isolation fixture.',
    auditId: randomUUID(),
    actorGrants: pariwarAdminGrants(PARIWAR_A),
  };
}

describe('AC7 — the drive target and a member\'s obligation never touch', () => {
  // ── (a) THE STRUCTURAL HALF — no live DB needed, and it must run regardless ────────────────────

  it('⭐⭐ `pool/fixed-amount.ts` references the drive target ⛔ NOWHERE', () => {
    // ⚠ A SOURCE assertion, ⛔ not a behavioural one, and deliberately so: a behavioural test can
    // only sample the inputs it happens to try, whereas the property AC7 needs is that the
    // obligation path CANNOT read the target at all. This fails loudly the moment someone wires the
    // two together — which is the *"reasonable"* change AI-10-1 exists to catch.
    const src = readFileSync(
      fileURLToPath(new URL('../../../src/pool/fixed-amount.ts', import.meta.url)),
      'utf8',
    );
    for (const forbidden of [
      'driveTarget',
      'drive-target',
      'DriveTarget',
      'pariwar_drive_target',
      'targetInr',
      'target_inr',
    ]) {
      expect(src).not.toContain(forbidden);
    }
  });

  it('⭐ …and neither does the assignment path (`pool/assign.ts`)', () => {
    // cl.7's target governs presentation. ⛔ It must not reach who is assigned to a pool either —
    // "who is assigned" is one of the three things AC7 names alongside "what a member owes".
    const src = readFileSync(
      fileURLToPath(new URL('../../../src/pool/assign.ts', import.meta.url)),
      'utf8',
    );
    for (const forbidden of ['driveTarget', 'drive-target', 'DriveTarget', 'targetInr']) {
      expect(src).not.toContain(forbidden);
    }
  });

  // ── (b)(c) THE BEHAVIOURAL HALF ───────────────────────────────────────────────────────────────

  describe.skipIf(!hasDatabase)('with a live database', () => {
    setupLiveDb();

    /** Seed the Pariwar's obligation schedule — what a member actually owes. */
    async function seedObligation(tx: Awaited<ReturnType<typeof getTx>>['tx']): Promise<void> {
      await tx.insert(schema.poolFixedAmountSchedule).values({
        pariwarId: PARIWAR_A,
        version: 1,
        fixedAmount: OBLIGATION_INR,
        effectiveFrom: at(-30),
        effectiveUntil: null,
        changeType: 'standard',
        createdByActor: ACTOR,
      });
    }

    it('⭐⭐ the obligation is IDENTICAL with the target unset, set, and changed', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await seedObligation(tx);

      // 1 — TARGET UNSET.
      const unset = await getEffectiveFixedAmount(tx, PARIWAR_A, at(0));
      expect(unset).toBe(OBLIGATION_INR);

      // 2 — TARGET SET, and deliberately FAR LARGER than the obligation. ⚠ If anything anywhere
      // conflated the two, a ₹5,00,000 target beside a ₹500 obligation is where it would show.
      await setDriveTargetSchedule(tx, targetInput(500_000, null, at(1)));
      expect(await getEffectiveFixedAmount(tx, PARIWAR_A, at(2))).toBe(OBLIGATION_INR);

      // 3 — TARGET CHANGED, now to a value BELOW the obligation. ⚠ The mirror case: a "cap the
      // collection at the target" change would clamp the obligation to 100 here.
      await setDriveTargetSchedule(tx, targetInput(100, 1, at(3)));
      expect(await getEffectiveFixedAmount(tx, PARIWAR_A, at(4))).toBe(OBLIGATION_INR);

      // 4 — and at every instant across the whole window, ⛔ not merely at the end.
      for (const day of [0, 1, 2, 3, 4, 10]) {
        expect(await getEffectiveFixedAmount(tx, PARIWAR_A, at(day))).toBe(OBLIGATION_INR);
      }
    });

    it('⭐ `pool_fixed_amount_schedule` is BYTE-UNCHANGED by a target write (the reverse direction)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await seedObligation(tx);

      const before = await tx.select().from(schema.poolFixedAmountSchedule);
      await setDriveTargetSchedule(tx, targetInput(500_000, null, at(1)));
      await setDriveTargetSchedule(tx, targetInput(900_000, 1, at(2)));
      const after = await tx.select().from(schema.poolFixedAmountSchedule);

      // ⛔ Not merely "the amount is the same" — the whole obligation record, including its version
      // chain and its own effective window, is untouched. AC7's *"`pools.fixed_amount` is
      // untouched"*, made checkable.
      expect(after).toEqual(before);
    });

    it('⭐ an unset target does ⛔ NOT break the obligation path — absence is not an error there', async () => {
      // ⚠ The two modules have OPPOSITE absence semantics and that is deliberate:
      // `getEffectiveFixedAmount` THROWS on an unconfigured Pariwar (an unset contribution amount
      // has no safe answer), while `resolveEffectiveDriveTargetInr` returns `null` (an unset target
      // has a ruled answer — Story 11b.14's "⛔ no target ⇒ ⛔ no bar"). ⛔ Neither may acquire the
      // other's behaviour by "consistency".
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await seedObligation(tx);
      // No target has been set at all, and the obligation resolves fine.
      expect(await getEffectiveFixedAmount(tx, PARIWAR_A, at(0))).toBe(OBLIGATION_INR);
    });
  });
});

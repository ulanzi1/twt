// Confirmed-contributor read — live-DB integration (Story 8.3, Task 5/Task 7; AC1/AC2/AC4).
//
// The load-bearing invariant, exercised against real Postgres under PARIWAR_A inside the per-test
// BEGIN/ROLLBACK envelope: `listConfirmedContributorsForPool` sources EXCLUSIVELY from
// `contribution.confirmed` — a yellow / self-attested (`contribution.utr-attested`, Story 8.4's intent)
// event must NEVER appear in the confirmed list. Yellow is introduced by 8.4, but the guard must exist —
// and genuinely bite — BEFORE it can be violated ([[feedback_gate_scope_semantic_coverage]]).
//
// ── Why we seed events_log directly ─────────────────────────────────────────────────────────────────────
// Epic 9 owns the `contribution.confirmed` producer and is unbuilt (D2), so there is no producer to drive.
// We hand-craft the events (the forward read↔producer payload contract: { poolId, memberId }) to prove the
// query's confirmed-only filter + pool scope + tenant isolation. Own-committing writers accumulate rows, so
// we assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import * as schema from '../../../src/schema/index.js';
import {
  computePendingAggregate,
  listConfirmedContributorsForPool,
} from '../../../src/contribution/read.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  cycleFreezeCommitId as toCycleId,
  memberId as toMemberId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent, seedPool } from '../_helpers.js';

/** Seed a `contribution.confirmed` event scoping a member's confirmed contribution to a pool. */
async function seedConfirmed(tx: Db, pariwarId: string, poolId: string, memberId: string): Promise<void> {
  await seedEvent(tx, pariwarId, {
    eventType: 'contribution.confirmed',
    payload: { poolId, memberId },
  });
}

describe.skipIf(!hasDatabase)('listConfirmedContributorsForPool — confirmed-only (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function seedPoolForCycle(tx: Db): Promise<{ cycleId: string; poolId: string }> {
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId });
    const poolId = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId,
      poolIndex: 0,
      poolCanonicalIdentifier: `P-2026-07-${Math.floor(Math.random() * 900 + 100)}`,
    });
    return { cycleId, poolId };
  }

  it('D2: legitimately EMPTY when no confirmed event exists (Epic 9 producer unbuilt)', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    expect(confirmed).toEqual([]);
  });

  it('includes a member carried by a `contribution.confirmed` event scoped to the pool', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    const memberA = randomUUID();
    const memberB = randomUUID();
    await seedConfirmed(tx, PARIWAR_A, poolId, memberA);
    await seedConfirmed(tx, PARIWAR_A, poolId, memberB);
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    const ids = confirmed.map((c) => c.memberId);
    expect(ids).toContain(memberA);
    expect(ids).toContain(memberB);
  });

  it('AC1/AC4 (the teeth): a yellow `contribution.utr-attested` event does NOT appear in the confirmed list', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    const confirmedMember = randomUUID();
    const yellowMember = randomUUID();
    const alertId = randomUUID();
    await seedConfirmed(tx, PARIWAR_A, poolId, confirmedMember);
    await enterAppScope(client, PARIWAR_A);
    // Seed the yellow claim via Story 8.4's REAL producer (attestContributionUtr + the real schema) — the
    // invariant now bites against the actual producer, not a hand-crafted stub (Story 8.4, AC4). Same pool,
    // but NOT confirmed money.
    const tr = deriveContributionReference({
      memberId: toMemberId(yellowMember),
      alertId: toAlertId(alertId),
    });
    await attestContributionUtr(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      poolId: toPoolId(poolId),
      memberId: toMemberId(yellowMember),
      tr,
      utr: '123456789012',
      actorId: yellowMember,
    });

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    const ids = confirmed.map((c) => c.memberId);
    expect(ids).toContain(confirmedMember);
    // The load-bearing assertion — yellow is structurally excluded (the query filters `contribution.confirmed`).
    expect(ids).not.toContain(yellowMember);
  });

  it('scopes to the pool: a confirmed event on a DIFFERENT pool does not leak into this pool’s list', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    const otherPoolId = randomUUID();
    const mineMember = randomUUID();
    const otherMember = randomUUID();
    await seedConfirmed(tx, PARIWAR_A, poolId, mineMember);
    await seedConfirmed(tx, PARIWAR_A, otherPoolId, otherMember);
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    const ids = confirmed.map((c) => c.memberId);
    expect(ids).toContain(mineMember);
    expect(ids).not.toContain(otherMember);
  });

  it('de-duplicates: a member re-confirmed twice appears once', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    const member = randomUUID();
    await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    expect(confirmed.filter((c) => c.memberId === member)).toHaveLength(1);
  });

  it('cross-tenant: a confirmed event under PARIWAR_B does NOT resolve under a PARIWAR_A read', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const memberB = randomUUID();
    // Seed the confirmed event under PARIWAR_B.
    await seedConfirmed(tx, PARIWAR_B, poolId, memberB);
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(randomUUID()),
      poolId: toPoolId(poolId),
    });
    expect(confirmed.map((c) => c.memberId)).not.toContain(memberB);
  });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐⭐ Story 11b.3 (AC9) — THE ORDER IS THE **EARLIEST LIVE CONFIRMATION'S `event_version`**
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⚠ THIS REPLACED A SORT; IT DID ⛔ NOT ADD A MISSING ONE. From Story 8.3 (`afce9e0`) through 9.5
  // (`318f88b`) this read ended `liveMemberIds.sort()` — `member_id` ASCENDING — which is ⛔ EXACTLY
  // the key a PII-shielded public surface must not order by. The `deferred-work.md` item claiming the
  // read "carries ⛔ NO `ORDER BY` at all" was FALSE when it was filed; it is amended in place.
  //
  // ⛔ THE FIXTURES BELOW DELIBERATELY MAKE `event_version` ORDER **DISAGREE** WITH `member_id` ORDER.
  // A fixture where the two coincide would pass under either implementation and prove nothing.

  it('⭐ orders by the confirmation `event_version` — ⛔ NOT by member_id', async () => {
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    // ⚠ Chosen so `member_id` ASC is the EXACT REVERSE of confirmation order: `aaa…` confirms LAST.
    const first = `fff${randomUUID().slice(3)}`;
    const second = `999${randomUUID().slice(3)}`;
    const third = `111${randomUUID().slice(3)}`;
    const streamId = randomUUID();
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: first },
      eventVersion: 1,
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: second },
      eventVersion: 2,
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: third },
      eventVersion: 3,
    });
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    const ids = confirmed.map((c) => c.memberId);
    expect(ids).toEqual([first, second, third]);
    // ⛔ THE NEGATIVE HALF, ASSERTED: the result is NOT `member_id` ascending. Without this the
    // assertion above would still pass on a fixture whose two orderings happened to agree.
    expect(ids).not.toEqual([...ids].sort());
  });

  it('⭐ a member RE-CONFIRMED after a reversal sorts by the RE-confirmation, ⛔ not the reversed one', async () => {
    // ⚠ The sort key is the earliest **LIVE** confirmation. A reversed confirmation is ⛔ not a moment
    // at which the member was confirmed, so it cannot be their key — otherwise a member whose first
    // attempt was walked back would sort ahead of everyone confirmed before their real one.
    const { client, tx } = getTx();
    const { cycleId, poolId } = await seedPoolForCycle(tx);
    // ⚠ Chosen so `member_id` ASC is the EXACT REVERSE of the expected order: under the OLD
    // `member_id` sort this case would return `[reConfirmed, steady]`. ⛔ A pair of bare
    // `randomUUID()`s would make the control a COIN FLIP — passing half the time against a
    // regressed implementation, which is worse than no control.
    const reConfirmed = `111${randomUUID().slice(3)}`;
    const steady = `fff${randomUUID().slice(3)}`;
    const streamId = randomUUID();

    const reversedEventId = randomUUID();
    await tx.insert(schema.eventsLog).values({
      eventId: reversedEventId,
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: reConfirmed },
      eventVersion: 1,
      pariwarId: PARIWAR_A,
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'reconciliation.confirmation-reversed',
      payload: { poolId, reversedConfirmedEventId: reversedEventId },
      eventVersion: 2,
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: steady },
      eventVersion: 3,
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId,
      eventType: 'contribution.confirmed',
      payload: { poolId, memberId: reConfirmed },
      eventVersion: 4,
    });
    await enterAppScope(client, PARIWAR_A);

    const confirmed = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    // ⭐ `steady` (v3) precedes `reConfirmed` (v4). ⛔ If the reversed v1 had been used as the key,
    // `reConfirmed` would sort FIRST — the exact defect this case pins.
    const ids = confirmed.map((c) => c.memberId);
    expect(ids).toEqual([steady, reConfirmed]);
    // ⛔ AND the negative half: this is NOT `member_id` ascending either.
    expect(ids).not.toEqual([...ids].sort());
  });

  it('AC2/D3: the pending denominator is the roster; 0 confirmed ⇒ pendingCount == rosterSize, 100%', () => {
    // The pending aggregate is pure (roster − confirmed), unit-covered in read.test.ts; here we pin the
    // 0-confirmed-today boundary that this surface renders now (D2).
    expect(computePendingAggregate({ rosterSize: 48, confirmedCount: 0 })).toEqual({
      pendingCount: 48,
      pendingPercentage: 100,
    });
  });
});

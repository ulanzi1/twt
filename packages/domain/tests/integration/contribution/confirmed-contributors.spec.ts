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
import {
  computePendingAggregate,
  listConfirmedContributorsForPool,
} from '../../../src/contribution/read.js';
import {
  cycleFreezeCommitId as toCycleId,
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
    await seedConfirmed(tx, PARIWAR_A, poolId, confirmedMember);
    // A hand-crafted yellow/self-attested event (Story 8.4's intent) — same pool, but NOT confirmed money.
    await seedEvent(tx, PARIWAR_A, {
      eventType: 'contribution.utr-attested',
      payload: { poolId, memberId: yellowMember },
    });
    await enterAppScope(client, PARIWAR_A);

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

  it('AC2/D3: the pending denominator is the roster; 0 confirmed ⇒ pendingCount == rosterSize, 100%', () => {
    // The pending aggregate is pure (roster − confirmed), unit-covered in read.test.ts; here we pin the
    // 0-confirmed-today boundary that this surface renders now (D2).
    expect(computePendingAggregate({ rosterSize: 48, confirmedCount: 0 })).toEqual({
      pendingCount: 48,
      pendingPercentage: 100,
    });
  });
});

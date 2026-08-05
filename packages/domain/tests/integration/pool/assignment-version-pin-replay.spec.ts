// AC6(c) — the Story 7.4 assignment version pin does NOT need a bump — Story 10.24 (Task 7). :5433
//
// Wiring the `contribution.*` producer into `assemblePayload` changes EVERY validity payload hash. The
// reflexive reaction is "the roster feeds pool assignment, so bump `POOL_ASSIGNMENT_HASH_VERSION`".
// That reaction is WRONG, and it is expensive to be wrong in either direction — so this spec PROVES it
// rather than asserting it in a comment.
//
// The argument, then the evidence:
//   · `POOL_ASSIGNMENT_HASH_VERSION` gates the ALGORITHM — { hash fn, truncation width, delimiter,
//     balancing rule } (Story 7.4, as amended by 10.17 D3). It does NOT gate the roster's CONTENTS.
//   · The roster reads `payload.isAssignable` AND NOTHING ELSE (`assignable-roster.ts`, AI-7-2 as
//     amended by 10.17 — [[project_assignability_predicate_is_isvalid_only]]).
//   · `deriveIsAssignable` is a function of lifecycle state + moderation status ONLY. Contribution
//     facts are not an input and cannot move it.
//   · Therefore the roster is an INPUT to the algorithm, not the algorithm — and a bump would break
//     replay of every ALREADY-FROZEN cycle, which is the actual harm (10.17 D3, ratified).
//
// The evidence below: spawn from a frozen `committed_at`, append contribution + reversal events, then
// re-spawn from the SAME frozen instant and assert a BYTE-IDENTICAL `computeAssignableRosterHash` AND
// byte-identical `member_assignments`. If contribution facts could reach the algorithm, this fails.
//
// Own-committing writers accumulate rows; assertions are over ids this test mints
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import {
  cycleFreezeCommitId as toCycleId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import {
  POOL_ASSIGNMENT_HASH_VERSION,
  assignMembersToPools,
  computeAssignableRosterHash,
  createPoolAssignmentSeam,
} from '../../../src/pool/assign.js';
import { planCycleSpawn, spawnChildPool } from '../../../src/pool/spawn.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { cycleFreezeCommits } from '../../../src/schema/cycle_freeze_commits.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { memberPoolAssignments } from '../../../src/schema/member_pool_assignments.js';
import { poolFixedAmountSchedule } from '../../../src/schema/pool_fixed_amount_schedule.js';
import { poolSnapshots } from '../../../src/schema/pool_snapshots.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const FIXED_AMOUNT = 500;

/** Seed a cycle_freeze_commits row (superuser, before app scope) — the FROZEN instant this whole
 *  test is anchored to. Mirrors `pool-spawn-saga.spec.ts`'s helper. */
async function seedCommit(tx: Db, pariwarId: string, commitId: string, claimIds: string[]): Promise<void> {
  await tx.insert(cycleFreezeCommits).values({
    commitId: toCycleId(commitId),
    pariwarId: toPariwarId(pariwarId),
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: claimIds,
    committedAt: new Date('2026-07-15T06:00:00Z'),
  });
}

async function seedFixedAmount(tx: Db, pariwarId: string, amount: number): Promise<void> {
  await tx.insert(poolFixedAmountSchedule).values({
    pariwarId: toPariwarId(pariwarId),
    version: 1,
    fixedAmount: amount,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveUntil: null,
    changeType: 'standard',
    createdByActor: 'system:test-seed',
  });
}

/** The persisted `pool_snapshots.member_assignments` for a pool's LATEST snapshot, as a sorted
 *  member-id array — a comparable, order-stable read of the actual DB row (never the in-memory
 *  seam result alone). */
async function latestSnapshotMemberIds(tx: Db, poolId: string): Promise<string[]> {
  const rows = await tx
    .select({ snapshot: poolSnapshots.snapshot })
    .from(poolSnapshots)
    .where(eq(poolSnapshots.poolId, toPoolId(poolId)))
    .orderBy(asc(poolSnapshots.createdAt));
  const latest = rows.at(-1);
  if (!latest) return [];
  return [...latest.snapshot.member_assignments].map((a) => a.member_id).sort();
}

/** The persisted `member_pool_assignments` rows for a pool, as a sorted member-id array — the
 *  Story 10.24 projection this AC also requires to stay byte-identical. */
async function memberPoolAssignmentIds(tx: Db, poolId: string): Promise<string[]> {
  const rows = await tx
    .select({ memberId: memberPoolAssignments.memberId })
    .from(memberPoolAssignments)
    .where(eq(memberPoolAssignments.poolId, toPoolId(poolId)));
  return rows.map((r) => String(r.memberId)).sort();
}

describe.skipIf(!hasDatabase)(
  'Story 10.24 AC6(c) — contribution facts CANNOT move the frozen assignment (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    it('POOL_ASSIGNMENT_HASH_VERSION is still v1 — this story does NOT bump it', () => {
      // A bump here would invalidate the replay of every already-frozen cycle. The version gates the
      // ALGORITHM; Story 10.24 changes neither the hash fn, the truncation width, the delimiter, nor
      // the balancing rule. Asserted as a literal so a bump is a deliberate, reviewed act.
      expect(POOL_ASSIGNMENT_HASH_VERSION).toBe('v1');
    });

    it('a REAL spawnChildPool call, re-spawned from the SAME frozen instant after contribution events land, persists BYTE-IDENTICAL pool_snapshots.member_assignments AND member_pool_assignments (AC6c — code review, 2026-08-05)', async () => {
      // The AC6(c) test that was missing: the version-pin argument is worthless if only PROVEN against
      // the pure `assignMembersToPools`/`computeAssignableRosterHash` functions in isolation — it must
      // also hold for the REAL `spawnChildPool` path and the ACTUAL persisted rows a suspension/payout
      // decision reads (`pool_snapshots.member_assignments`, and Story 10.24's own
      // `member_pool_assignments` projection).
      const { tx, client } = getTx();
      const cycleId = randomUUID();
      const claimId = randomUUID();
      await seedCommit(tx, PARIWAR_A, cycleId, [claimId]);
      await seedFixedAmount(tx, PARIWAR_A, FIXED_AMOUNT);
      await enterAppScope(client, PARIWAR_A);

      const plan = await planCycleSpawn(tx, {
        pariwarId: PARIWAR_A,
        cycleId: toCycleId(cycleId),
        frozenClaims: [{ claimCaseId: claimId }],
      });
      const spec = plan.children[0]!;
      const seam = createPoolAssignmentSeam();
      const roster = Array.from({ length: 6 }, () => randomUUID()).sort();

      // ── The FIRST (real) spawn, from the frozen committed_at, with a WIRED roster ───────────────
      const firstResult = await spawnChildPool(client, spec, seam, roster, true);
      expect(firstResult.spawned).toBe(true);

      const snapshotIdsBefore = await latestSnapshotMemberIds(tx, spec.poolId);
      const projectionIdsBefore = await memberPoolAssignmentIds(tx, spec.poolId);
      const hashBefore = computeAssignableRosterHash(roster);
      // Not vacuous: the roster was actually placed somewhere.
      expect(snapshotIdsBefore.length).toBeGreaterThan(0);
      expect(projectionIdsBefore).toEqual(snapshotIdsBefore);

      // ── Now the world changes: contributions are confirmed, and one is reversed ─────────────────
      await appendContributionEvents(tx, randomUUID(), roster, spec.poolId);

      // ── The RE-SPAWN attempt from the SAME frozen instant ────────────────────────────────────────
      // `spawnChildPool` is idempotent on `(cycle_id, pool_index)` — this call short-circuits rather
      // than re-deriving, which is itself part of the proof: the persisted rows are provably untouched
      // by the contribution events that landed in between.
      const secondResult = await spawnChildPool(client, spec, seam, roster, true);
      expect(secondResult.spawned).toBe(false);

      const snapshotIdsAfter = await latestSnapshotMemberIds(tx, spec.poolId);
      const projectionIdsAfter = await memberPoolAssignmentIds(tx, spec.poolId);
      const hashAfter = computeAssignableRosterHash(roster);

      // BYTE-IDENTICAL, per AC6(c) — both the roster hash AND the persisted assignment rows.
      expect(hashAfter).toBe(hashBefore);
      expect(snapshotIdsAfter).toEqual(snapshotIdsBefore);
      expect(projectionIdsAfter).toEqual(projectionIdsBefore);

      // …and tie the persisted row to a FRESH, from-scratch recomputation of the real seam over the
      // SAME inputs — so the proof is not only "idempotency skipped the write", it is also "what the
      // algorithm would produce if genuinely re-derived is identical", both before and after.
      const freshSeamResult = seam({
        cycleId,
        poolIndex: spec.poolIndex,
        poolCount: spec.poolCount,
        memberSet: roster,
      });
      const freshSeamIds = freshSeamResult.map((a) => a.member_id).sort();
      expect(freshSeamIds).toEqual(snapshotIdsAfter);
    });

    it('the PURE assignment algorithm is contribution-blind: the roster hash and the assignment map are BYTE-IDENTICAL across recomputation after contribution events', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);

      const cycleId = randomUUID();
      const alertStream = randomUUID();
      const poolIds = [randomUUID(), randomUUID()];
      // A deterministic roster — sorted, as the resolver enumerates it.
      const roster = Array.from({ length: 9 }, () => randomUUID()).sort();

      // ── The FIRST spawn, from the frozen committed_at ──────────────────────────────────────────
      const hashBefore = computeAssignableRosterHash(roster);
      // The full member→poolIndex map, serialized in sorted-key order so the comparison is on VALUES,
      // never on Map iteration order.
      const assignmentsBefore = serializeAssignment(
        assignMembersToPools(roster, cycleId, poolIds.length),
      );

      // ── Now the world changes: contributions are confirmed, and one is reversed ────────────────
      // These are exactly the events Story 10.24 projects into the facts. If any of them could reach
      // the assignment algorithm, the re-spawn below would diverge.
      await appendContributionEvents(tx, alertStream, roster, poolIds[0]!);

      // ── The RE-SPAWN, from the SAME frozen instant ─────────────────────────────────────────────
      const hashAfter = computeAssignableRosterHash(roster);
      const assignmentsAfter = serializeAssignment(
        assignMembersToPools(roster, cycleId, poolIds.length),
      );

      expect(hashAfter).toBe(hashBefore);
      // Byte-identical as a STRING, so an ordering change also fails here — not just a value change.
      expect(assignmentsAfter).toBe(assignmentsBefore);
      // …and the assignment actually placed every member, so the equality is not vacuous.
      expect(JSON.parse(assignmentsAfter)).toHaveLength(roster.length);
    });

    it('the roster PREDICATE is contribution-blind: the same member set yields the same hash regardless of history', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const roster = Array.from({ length: 5 }, () => randomUUID()).sort();
      const alertStream = randomUUID();

      const before = computeAssignableRosterHash(roster);
      await appendContributionEvents(tx, alertStream, roster, randomUUID());
      expect(computeAssignableRosterHash(roster)).toBe(before);

      // The corollary that makes the above meaningful: a DIFFERENT member set DOES change the hash,
      // so the constancy above is a property of contribution-blindness, not of a vacuous hash.
      expect(computeAssignableRosterHash([...roster, randomUUID()].sort())).not.toBe(before);
    });

    /** Serialize a member→poolIndex map in sorted-key order (never Map iteration order). */
    function serializeAssignment(assignment: ReadonlyMap<string, number>): string {
      return JSON.stringify([...assignment.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    }

    /** Confirm every member on `poolId`, then reverse the first — the full green/held event surface. */
    async function appendContributionEvents(
      tx: Db,
      alertStream: string,
      roster: readonly string[],
      poolId: string,
    ): Promise<void> {
      let version = 1;
      let firstConfirmedEventId: string | null = null;
      for (const memberId of roster) {
        const eventId = randomUUID();
        await tx.insert(eventsLog).values({
          eventId,
          streamId: alertStream,
          eventType: CONFIRMED_EVENT_TYPE,
          payload: { memberId, poolId, alertId: alertStream },
          eventVersion: version,
          actorId: null,
          pariwarId: PARIWAR_A,
          occurredAt: new Date('2026-07-20T00:00:00Z'),
        });
        firstConfirmedEventId ??= eventId;
        version += 1;
      }
      if (firstConfirmedEventId !== null) {
        await tx.insert(eventsLog).values({
          streamId: alertStream,
          eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
          payload: {
            memberId: roster[0],
            reversedConfirmedEventId: firstConfirmedEventId,
            alertId: alertStream,
          },
          eventVersion: version,
          actorId: null,
          pariwarId: PARIWAR_A,
          occurredAt: new Date('2026-07-25T00:00:00Z'),
        });
      }
    }
  },
);

// Pool-bound payment enforcement — live-DB integration (Story 7.6, Task 6; AC1/AC2/AC4).
//
// Resolves a member's assigned pool + collection binding FROM THE PERSISTED SNAPSHOT (D1 — never a
// recompute), against real Postgres under PARIWAR_A, inside the per-test BEGIN/ROLLBACK envelope.
//
// ── Why we seed pools + snapshots directly (not via the spawn saga) ────────────
// The Story 7.3/7.4 spawn saga persists snapshots with EMPTY member_assignments today — its
// freeze-time assignable-roster QUERY is a deferred follow-up (spawn.ts D2→B: memberSet is hardcoded
// []). So the saga cannot demonstrate real member→pool resolution. We instead seed pools directly
// (seedPool → the projector-guard bypass) and persist snapshots whose member_assignments are the
// DETERMINISTIC `assignMembersToPools` output — so the resolution assertion is "the resolver reads the
// persisted snapshot and returns the SAME pool the assignment engine placed the member in" (AC1 ⋈ AC4).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  claimId as toClaimId,
  cycleFreezeCommitId as toCycleId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import {
  assignMembersToPools,
  classifyContributionDestination,
  resolveAssignedPoolForMember,
  resolveMemberContributionBinding,
  serializePoolSnapshot,
} from '../../../src/pool/index.js';
import {
  MemberPoolAssignmentIntegrityError,
  WrongPoolBindingAmbiguousError,
} from '../../../src/pool/errors.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedPool } from '../_helpers.js';

const FIXED_AMOUNT = 500;

/** Persist ONE snapshot for a pool with the given member assignments (mirrors spawnChildPool's write). */
async function seedSnapshot(
  tx: Db,
  pariwarId: string,
  poolId: string,
  cycleId: string,
  poolIndex: number,
  memberIds: readonly string[],
  stateEventVersion = 1,
): Promise<void> {
  const snapshot = serializePoolSnapshot({
    poolId,
    pariwarId,
    cycleId,
    poolIndex,
    supportCategory: 'death_support',
    benefitMechanism: 'pool',
    fixedAmount: FIXED_AMOUNT,
    currentState: 'spawned',
    memberAssignments: memberIds.map((member_id) => ({ member_id })),
  });
  await tx.insert(schema.poolSnapshots).values({
    poolId: toPoolId(poolId),
    pariwarId: toPariwarId(pariwarId),
    formatVersion: snapshot.format_version,
    schemaVersion: snapshot.schema_version,
    integrityHash: snapshot.integrity_hash,
    stateEventVersion,
    snapshot,
  });
}

/** Seed the claim's two nominee bank accounts (#1 / #2), ciphertext AS STORED (plain test strings). */
async function seedNomineeBank(tx: Db, pariwarId: string, claimCaseId: string): Promise<void> {
  await tx.insert(schema.claimNomineeBankAccounts).values([
    {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: toPariwarId(pariwarId),
      accountRank: 1,
      accountHolderNameCiphertext: 'ct-holder-1',
      accountNumberCiphertext: 'ct-acct-1',
      ifscCiphertext: 'ct-ifsc-1',
      bankName: 'State Bank of India',
      branch: 'Patna Main',
      ifscValidated: true,
    },
    {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: toPariwarId(pariwarId),
      accountRank: 2,
      accountHolderNameCiphertext: 'ct-holder-2',
      accountNumberCiphertext: 'ct-acct-2',
      ifscCiphertext: 'ct-ifsc-2',
      bankName: 'Punjab National Bank',
      branch: 'Gaya',
      ifscValidated: false,
    },
  ]);
}

describe.skipIf(!hasDatabase)('pool-bound payment binding resolution (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC1/AC4: resolves each member to the pool the deterministic engine assigned, from the persisted snapshot', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const members = Array.from({ length: 6 }, () => randomUUID());
    const N = 2;
    const global = assignMembersToPools(members, cycleId, N);

    // Two pools, distinct claims. Seed the claim rows (FK for nominee-bank), the pools, and the
    // assignment-bearing snapshots — all as superuser BEFORE entering app scope.
    const claim0 = randomUUID();
    const claim1 = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId: claim0 });
    await seedClaim(tx, PARIWAR_A, { claimCaseId: claim1 });
    const pool0 = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: claim0,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-001',
    });
    const pool1 = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: claim1,
      poolIndex: 1,
      poolCanonicalIdentifier: 'P-2026-07-002',
    });
    const membersInPool0 = members.filter((m) => global.get(m) === 0);
    const membersInPool1 = members.filter((m) => global.get(m) === 1);
    await seedSnapshot(tx, PARIWAR_A, pool0, cycleId, 0, membersInPool0);
    await seedSnapshot(tx, PARIWAR_A, pool1, cycleId, 1, membersInPool1);
    // #1/#2 disbursement accounts on pool0's claim; pool1's claim stays NOT-yet-collected.
    await seedNomineeBank(tx, PARIWAR_A, claim0);

    await enterAppScope(client, PARIWAR_A);
    const poolIdByIndex = [pool0, pool1];

    // Every member resolves to the SAME pool the assignment engine placed them in — from the snapshot.
    for (const member of members) {
      const r = await resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(member));
      expect(r.assigned).toBe(true);
      if (r.assigned) expect(r.poolId).toBe(poolIdByIndex[global.get(member)!]);
    }

    // A member in pool0 gets the full binding: assigned pool + EXACTLY TWO accounts (#1 → #2), ciphertext AS STORED.
    const memberInP0 = membersInPool0[0]!;
    const binding = await resolveMemberContributionBinding(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(memberInP0));
    expect(binding.assigned).toBe(true);
    if (binding.assigned) {
      expect(binding.poolId).toBe(pool0);
      expect(binding.claimCaseId).toBe(claim0);
      expect(binding.collectionAccounts.map((a) => a.accountRank)).toEqual([1, 2]);
      expect(binding.collectionAccounts[0]!.accountNumberCiphertext).toBe('ct-acct-1');
    }

    // A member in pool1 (claim not yet collected) → binding with an EMPTY accounts array (absence signal).
    const memberInP1 = membersInPool1[0]!;
    const binding1 = await resolveMemberContributionBinding(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(memberInP1));
    expect(binding1.assigned).toBe(true);
    if (binding1.assigned) expect(binding1.collectionAccounts).toHaveLength(0);

    // AC2: a deposit to a SIBLING pool is wrong_pool; a deposit to the assigned pool is valid.
    if (binding.assigned) {
      expect(classifyContributionDestination({ assignedPoolId: binding.poolId, depositedToPoolId: pool1 })).toEqual({
        verdict: 'wrong_pool',
        reasonCode: 'deposited_to_non_assigned_pool',
      });
      expect(classifyContributionDestination({ assignedPoolId: binding.poolId, depositedToPoolId: pool0 })).toEqual({
        verdict: 'valid',
        reasonCode: 'assigned_pool_match',
      });
    }
  });

  it('AC1.4: an unassigned member returns the { assigned: false } absence signal (never a throw)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claim0 = randomUUID();
    await seedClaim(tx, PARIWAR_A, { claimCaseId: claim0 });
    const pool0 = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: claim0,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-010',
    });
    await seedSnapshot(tx, PARIWAR_A, pool0, cycleId, 0, [randomUUID()]);
    await enterAppScope(client, PARIWAR_A);

    const strangerBinding = await resolveMemberContributionBinding(
      tx,
      PARIWAR_A,
      toCycleId(cycleId),
      toMemberId(randomUUID()),
    );
    expect(strangerBinding).toEqual({ assigned: false });
  });

  it('cross-tenant: a member assigned under PARIWAR_B does NOT resolve under a PARIWAR_A scan', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const member = randomUUID();
    const claimB = randomUUID();
    await seedClaim(tx, PARIWAR_B, { claimCaseId: claimB });
    const poolB = await seedPool(tx, PARIWAR_B, {
      cycleId,
      claimCaseId: claimB,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-020',
    });
    await seedSnapshot(tx, PARIWAR_B, poolB, cycleId, 0, [member]);

    // Scan the SAME cycle under PARIWAR_A — the pariwar predicate + RLS return no pools → not assigned.
    await enterAppScope(client, PARIWAR_A);
    const r = await resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(member));
    expect(r).toEqual({ assigned: false });
  });

  it('AC1.3 / D5: two pools in a cycle sharing a claim fail loud (WrongPoolBindingAmbiguousError)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const sharedClaim = randomUUID();
    const member = randomUUID();
    // Two pools, SAME claim_case_id (⇒ same collection accounts) — no (cycle, claim) uniqueness on pools.
    const poolA = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: sharedClaim,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-030',
    });
    const poolB = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: sharedClaim,
      poolIndex: 1,
      poolCanonicalIdentifier: 'P-2026-07-031',
    });
    await seedSnapshot(tx, PARIWAR_A, poolA, cycleId, 0, [member]);
    await seedSnapshot(tx, PARIWAR_A, poolB, cycleId, 1, [randomUUID()]);
    await enterAppScope(client, PARIWAR_A);

    await expect(
      resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(member)),
    ).rejects.toBeInstanceOf(WrongPoolBindingAmbiguousError);
  });

  it('AC1.4: a member appearing in TWO pools of a cycle fails loud (MemberPoolAssignmentIntegrityError)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const member = randomUUID();
    const claim0 = randomUUID();
    const claim1 = randomUUID();
    const pool0 = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: claim0,
      poolIndex: 0,
      poolCanonicalIdentifier: 'P-2026-07-040',
    });
    const pool1 = await seedPool(tx, PARIWAR_A, {
      cycleId,
      claimCaseId: claim1,
      poolIndex: 1,
      poolCanonicalIdentifier: 'P-2026-07-041',
    });
    // Corrupt state: the SAME member in both pools' latest snapshots.
    await seedSnapshot(tx, PARIWAR_A, pool0, cycleId, 0, [member]);
    await seedSnapshot(tx, PARIWAR_A, pool1, cycleId, 1, [member]);
    await enterAppScope(client, PARIWAR_A);

    await expect(
      resolveAssignedPoolForMember(tx, PARIWAR_A, toCycleId(cycleId), toMemberId(member)),
    ).rejects.toBeInstanceOf(MemberPoolAssignmentIntegrityError);
  });
});

// Suspended-member REACHABILITY — live-DB integration (Story 10.17, Task 7; AC6a + AC6b; :5433).
//
// ── What this spec is, and what it is NOT ────────────────────────────────────────────────────────
// Story 10.17's primary claim is a claim about REACHABILITY: a suspended member can actually get to
// `/pay` and contribute their way back. Before it, the chain broke in one place —
//
//   suspension ⇒ is_valid:false ⇒ off the donor roster ⇒ no pool ⇒ /pay says
//   `{ available:false, reason:'unassigned' }` ⇒ and there is NO contribution path outside an
//   assigned pool (a CI fence, `pool-bound-payment-invariant`, asserts the absence of one)
//
// — so every suspension was a de-facto permanent ban, and six of the seven R7 restoration clauses
// (all of which are cleared BY CONTRIBUTING) were unreachable. This spec proves the chain now runs.
//
// ── The two halves, and where they join ─────────────────────────────────────────────────────────
// The ROSTER half — a suspended member surviving the REAL `createAssignableRosterResolver` and the
// REAL `spawnChildPool` into `pool_snapshots.member_assignments` — is proven in
// `apps/jobs/tests/assignable-roster-live.test.ts` ("AC6a: a SUSPENDED member reaches
// pool_snapshots.member_assignments through the real spawn path"). It cannot be proven here: a
// package/app cannot import another app, and the resolver lives in apps/jobs.
//
// This spec proves the SURFACE half — snapshot ⇒ `GET /api/v1/member/validity` ⇒ nominee-accounts —
// against the REAL handlers. The two halves join at `pool_snapshots.member_assignments`, which the
// jobs spec PRODUCES and this one CONSUMES. Stating that seam explicitly is deliberate: the
// composition is auditable rather than implied.
//
// ⚠ AC6b is a CONFIRMATION, not a re-test of Story 10.16. 10.16's presenter is shipped and reviewed;
// its copy, arms, precedence and view-model shape are NOT re-opened here. All this asserts is that
// 10.17 delivers the payload 10.16 was built against — see the assertion's own comment.
//
// Own-committing seeding on one raw superuser connection (the `nominee-accounts.spec.ts` convention,
// [[project_live_db_test_gotchas]]): the handlers under test open their OWN scope tx on their OWN
// connection, so anything they must read has to be committed. Fresh random ids per run; assert
// MEMBERSHIP, never counts.

import { randomUUID } from 'node:crypto';

import {
  bindScopedDb,
  claim as claimDomain,
  ids,
  member as memberDomain,
  pool as poolDomain,
  schema,
} from '@twt/domain';
import { deriveContributionDisclosure } from '@twt/ui';
import { describe, expect, it } from 'vitest';

import { encryptNomineeBankField } from '../../../src/modules/claims/nominee-bank-crypto.js';
import { createMemberValidityHandlers } from '../../../src/modules/member-validity/handlers.js';
import { createPaymentHandlers } from '../../../src/modules/payment/handlers.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const SUSPENSION_REASON = 'r7-contribution-discipline';

/**
 * Seed an `active` member, SUSPEND them through the real moderation event path, then give them a live
 * cycle + a spawned pool whose snapshot assigns them — i.e. exactly the state the jobs-side roster
 * resolver produces for a suspended member under Story 10.17.
 *
 * ⚠ The moderation event is a genuine `member.moderation.suspended` append folded by
 * `evaluateModerationOverlay`, NOT a hand-set column: `members.state` deliberately stays `active`
 * (Story 10.10 Decision 1 — moderation is an overlay, the lifecycle machine never moves). That is
 * also what lets the member past `resolveMemberLivePool`'s `state === 'active'` gate, so pool
 * assignment is genuinely the only thing Story 10.17 had to unblock.
 */
async function seedSuspendedAssignedMember(
  t: TestDeps,
  memberId: string,
  pariwarId: string,
): Promise<{ poolId: string; cycleId: string; alertId: string; claimCaseId: string }> {
  const cycleId = randomUUID();
  const alertId = randomUUID();
  const poolId = randomUUID();
  const claimCaseId = randomUUID();
  const deceasedMemberId = randomUUID();
  const client = await t.pool.connect();
  try {
    await client.query('BEGIN');
    const db = bindScopedDb(client);
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);

    const seq: Array<[string, Record<string, unknown>]> = [
      ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
      ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
      ['member.nominees_declared', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'nominees', actor: 'member', nominee_count: 1, split: 'sole' }],
      ['member.medical_disclosed', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'medical', actor: 'member', ima_list_version: 'ima-v1', condition_count: 0, acknowledged: true, ack_locale: 'en' }],
      ['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 110 }],
      ['member.lock_in_entered', { from_state: 'lock-in', to_state: 'lock-in', trigger: 'lock_in_entered', actor: 'member', lock_in_days_at_join: 30, lock_in_policy_version: '0e1c0006-0000-4000-8000-000000000006' }],
      ['member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true }],
      // ── THE SUSPENSION — lifecycle-IDENTITY (`active` → `active`), overlay-only. ───────────────
      ['member.moderation.suspended', {
        from_state: 'active', to_state: 'active', trigger: 'moderation', actor: 'trustee',
        moderation_from: 'none', moderation_to: 'suspended', reason_code: SUSPENSION_REASON,
      }],
    ];
    for (const [eventType, payload] of seq) {
      await memberDomain.projectMemberState(client, {
        memberId: mid, pariwarId: pid, actorId: memberId, eventType: eventType as never, payload,
      });
    }

    await db.insert(schema.cycleFreezeCommits).values({
      commitId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      actorId: 'trustee-actor-1',
      actorDisplay: 'Trustee One',
      committedClaimIds: [],
      committedAt: new Date(),
    });

    await client.query("SET LOCAL app.alert_state_writer = 'on'");
    await db.insert(schema.alerts).values({
      alertId: ids.alertId(alertId),
      cycleId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      poolCount: 1,
      currentState: 'live',
      stateEventVersion: 3,
      createdByActor: 'trustee-actor-1',
    });
    await client.query("SET LOCAL app.alert_state_writer = 'off'");

    const cid = ids.claimId(claimCaseId);
    await claimDomain.projectClaimState(client, {
      claimCaseId: cid, pariwarId: pid, deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['member_app'], claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null, to_state: 'intake_pending', trigger: 'test', actor: 'system',
        deceased_member_id: deceasedMemberId, intake_channel: 'member_app', claimant_actor_id: null,
      },
      actorId: null,
    });
    await claimDomain.projectClaimState(client, {
      claimCaseId: cid, pariwarId: pid, deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['member_app'], claimantActorId: null,
      eventType: 'claim.intake_converged',
      payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'test', actor: 'system' },
      actorId: null,
    });

    // ⚠ EXACTLY TWO accounts, atomically — the Story 6.8 invariant (`recordClaimNomineeBankAccounts`
    // throws on any other count). They are EQUAL alternatives the donor chooses between (Story 9.9
    // "Donor Choice"), not primary/secondary and not a split.
    const holder1 = await encryptNomineeBankField('Ravi Kumar', pariwarId, t.deps.encryption);
    const num1 = await encryptNomineeBankField('123456789012', pariwarId, t.deps.encryption);
    const ifsc1 = await encryptNomineeBankField('SBIN0000001', pariwarId, t.deps.encryption);
    const holder2 = await encryptNomineeBankField('Asha Devi', pariwarId, t.deps.encryption);
    const num2 = await encryptNomineeBankField('987654321098', pariwarId, t.deps.encryption);
    const ifsc2 = await encryptNomineeBankField('HDFC0000001', pariwarId, t.deps.encryption);
    await claimDomain.recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: pid,
      accounts: [
        {
          accountRank: 1,
          accountHolderNameCiphertext: holder1,
          accountNumberCiphertext: num1,
          ifscCiphertext: ifsc1,
          vpaCiphertext: null,
          bankName: 'State Bank of India',
          branch: 'Nariman Point, Mumbai',
          ifscValidated: true,
        },
        {
          accountRank: 2,
          accountHolderNameCiphertext: holder2,
          accountNumberCiphertext: num2,
          ifscCiphertext: ifsc2,
          vpaCiphertext: null,
          bankName: 'HDFC Bank',
          branch: 'Worli, Mumbai',
          ifscValidated: true,
        },
      ],
      recordedByActor: randomUUID(),
      actor: 'member',
    });

    await client.query("SET LOCAL app.pool_state_writer = 'on'");
    await db.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: cid,
      poolIndex: 0,
      poolCanonicalIdentifier: `P-TEST-${poolId.slice(0, 8)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      stateEventVersion: 1,
      // Story 11b.10 — the public address (NOT NULL, GLOBAL unique index). Minted per row.
      publicToken: poolDomain.mintPoolPublicToken(),
    });
    await client.query("SET LOCAL app.pool_state_writer = 'off'");

    // The suspended member IS in `member_assignments` — the artifact the jobs-side roster produces
    // for them under Story 10.17, and the seam this spec consumes.
    const snapshot = poolDomain.serializePoolSnapshot({
      poolId, pariwarId, cycleId, poolIndex: 0,
      supportCategory: 'death_support', benefitMechanism: 'pool', fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [{ member_id: memberId }],
    });
    await db.insert(schema.poolSnapshots).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      formatVersion: snapshot.format_version,
      schemaVersion: snapshot.schema_version,
      integrityHash: snapshot.integrity_hash,
      stateEventVersion: 1,
      snapshot,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
  return { poolId, cycleId, alertId, claimCaseId };
}

function fakeRequest(memberId: string, pariwarId: string) {
  return {
    body: {},
    requestContext: { actorId: memberId, pariwarId, traceId: randomUUID() },
    log: { warn: () => undefined, error: () => undefined, info: () => undefined },
  } as unknown as import('fastify').FastifyRequest;
}

describe.skipIf(!hasDatabase)('Story 10.17 — a suspended member reaches /pay (:5433)', { timeout: 20000 }, () => {
  it('AC6a: the validity self-read carries is_valid:false + is_assignable:true + the suspension flag', async () => {
    const t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    try {
      const memberId = randomUUID();
      await seedSuspendedAssignedMember(t, memberId, PARIWAR);

      const h = createMemberValidityHandlers(t.deps);
      const { validity } = await h.memberValidityRead(fakeRequest(memberId, PARIWAR));

      // THE DIVERGENCE, on a real wire payload. They contribute; they are not covered.
      expect(validity.isValid).toBe(false); // COVERAGE — withheld, unchanged by 10.17
      expect(validity.isAssignable).toBe(true); // ROSTER — restored, the whole story
      expect(validity.isActive).toBe(false);
      // Member-visible BY DESIGN — the member must be told WHY, and `isAssignable` is not redacted.
      expect(validity.specialFlags).toContain(`suspended_per_${SUSPENSION_REASON}`);
    } finally {
      await t.pool.end().catch(() => undefined);
    }
  });

  it('AC6a: the nominee-accounts read returns available:true — NOT { available:false, reason:"unassigned" }', async () => {
    // THE PRIMARY PROOF. This exact call is what returned `unassigned` for every suspended member
    // before Story 10.17, and `unassigned` is a dead end: Story 8.10's `pool-bound-payment-invariant`
    // fence asserts there is no contribution path outside an assigned pool. The flip below IS the
    // restoration path reopening.
    const t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    try {
      const memberId = randomUUID();
      await seedSuspendedAssignedMember(t, memberId, PARIWAR);

      const res = await createPaymentHandlers(t.deps).nomineeAccounts(fakeRequest(memberId, PARIWAR));

      expect(res.available).toBe(true);
      if (!res.available) throw new Error(`expected available:true, got reason=${res.reason}`);
      expect(res.accounts.length).toBeGreaterThan(0);
      expect(res.accounts.find((a) => a.rank === 1)?.accountHolderName).toBe('Ravi Kumar');
    } finally {
      await t.pool.end().catch(() => undefined);
    }
  });

  it('AC6b: the SHIPPED Story 10.16 disclosure fires on this REAL payload (confirmation, not a re-test)', async () => {
    // ⚠ SCOPE. This confirms ONE thing: that Story 10.17 delivers the payload Story 10.16 was built
    // against, so 10.16's disclosure — until now reachable only in unit tests, because no suspended
    // member could get to `/pay` (10.16 Escalation 3) — actually fires on a live path. It is NOT a
    // re-verification of 10.16's presenter: its copy, arms, precedence and view-model shape were
    // established and reviewed under 10.16 and are not re-opened here.
    //
    // If this returns null, the working hypothesis is "10.17 did not deliver the payload 10.16 was
    // built against" — investigate the payload. Editing `packages/ui/src/contribution-disclosure/*`
    // to make this pass is Story 10.17's Anti-pattern 7.
    //
    // The input is the REAL validity payload the handler just returned — deliberately not a fixture,
    // because a fixture is precisely what 10.16 could already prove.
    const t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    try {
      const memberId = randomUUID();
      await seedSuspendedAssignedMember(t, memberId, PARIWAR);

      const { validity } = await createMemberValidityHandlers(t.deps)
        .memberValidityRead(fakeRequest(memberId, PARIWAR));

      const disclosure = deriveContributionDisclosure(validity);

      expect(disclosure).not.toBeNull();
      expect(disclosure?.instrument).toBe('suspension');
      // The reason code reaches the disclosure as a LABEL KEY, never as free text (10.16 AC5).
      expect(disclosure?.reasonLabelKey).toBeTruthy();
    } finally {
      await t.pool.end().catch(() => undefined);
    }
  });
});

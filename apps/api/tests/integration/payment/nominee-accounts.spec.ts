// Donor-facing nominee-accounts read — live-DB integration (Story 9.9, AC1/AC6; review finding).
//
// The DB-free unit suite (`apps/api/tests/unit/payment-nominee-accounts.test.ts`) mocks
// `decryptNomineeBankFieldSoft` wholesale, so the REAL Tier-1 decrypt round-trip (encrypt with the
// fake-KMS test deps → store → read back → decrypt) and the REAL fail-soft sentinel path (a genuinely
// corrupted envelope failing `decryptTier1`) are never exercised end-to-end. This spec closes that gap:
// it drives a real claim through the projector, records a real encrypted + one deliberately corrupted
// nominee-bank account row, and asserts the handler degrades the bad field to the distinct sentinel —
// never a 500 — while the good fields decrypt correctly.
//
// Seeding is COMMITTED (the `self-verify/upload-core.spec.ts` / domain `_helpers.ts` own-committing
// convention, [[project_live_db_test_gotchas]]): the handler under test opens its OWN scope tx (its own
// pool connection), so anything it must read has to be visible across connections, i.e. committed —
// an uncommitted write on a separate outer transaction is invisible to it (read-committed isolation).
// Every id is a fresh random UUID per run, so accumulated rows never collide; assert membership, not
// counts. Nothing is deleted afterward — matches the existing self-verify seed-helper precedent.

import { randomUUID } from 'node:crypto';

import { bindScopedDb, claim as claimDomain, ids, member as memberDomain, pool as poolDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { encryptNomineeBankField, NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '../../../src/modules/claims/nominee-bank-crypto.js';
import { createPaymentHandlers } from '../../../src/modules/payment/handlers.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

/**
 * Seed a member all the way to `active`, ONE live cycle + spawned pool assigning the member (mirrors
 * self-verify/upload-core.spec.ts's `seedActiveLivePoolMember`), a real `claims` row (driven through the
 * projector to `intake_converged`, a nominee-bank-collectable state), AND the claim's two nominee bank
 * accounts — one fully valid (encrypted with the REAL fake-KMS test deps), one with a deliberately
 * CORRUPTED ciphertext field (not a parseable envelope) to exercise the genuine decrypt-failure path.
 * Everything commits on one raw superuser connection (RLS/trigger-guard bypass, the domain `_helpers.ts`
 * convention) so the handler under test — which opens its own connection — can see it.
 */
async function seedLivePoolMemberWithNomineeAccounts(
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

    // The real claim row (nominee-bank collection needs a genuine FK target + a collectable state).
    const cid = ids.claimId(claimCaseId);
    await claimDomain.projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null,
        to_state: 'intake_pending',
        trigger: 'test',
        actor: 'system',
        deceased_member_id: deceasedMemberId,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      },
      actorId: null,
    });
    await claimDomain.projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.intake_converged',
      payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'test', actor: 'system' },
      actorId: null,
    });

    // Account #1: every field genuinely encrypted with the test fake-KMS (a real round-trip). Account #2's
    // account-number ciphertext is DELIBERATELY corrupted (not a parseable envelope) — a real bad/legacy
    // row, not a mocked failure.
    const holder1 = await encryptNomineeBankField('Ravi Kumar', pariwarId, t.deps.encryption);
    const num1 = await encryptNomineeBankField('123456789012', pariwarId, t.deps.encryption);
    const ifsc1 = await encryptNomineeBankField('SBIN0000001', pariwarId, t.deps.encryption);
    const holder2 = await encryptNomineeBankField('Asha Devi', pariwarId, t.deps.encryption);
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
          accountNumberCiphertext: 'not-a-parseable-envelope',
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
    });
    await client.query("SET LOCAL app.pool_state_writer = 'off'");

    const snapshot = poolDomain.serializePoolSnapshot({
      poolId,
      pariwarId,
      cycleId,
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
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

describe.skipIf(!hasDatabase)('nominee-accounts read — real Tier-1 decrypt round-trip (:5433)', { timeout: 20000 }, () => {
  it('AC6: a genuinely corrupted envelope degrades to the distinct sentinel, never a 500 — good fields still decrypt', async () => {
    const t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    try {
      const memberId = randomUUID();
      await seedLivePoolMemberWithNomineeAccounts(t, memberId, PARIWAR);

      const h = createPaymentHandlers(t.deps);
      const res = await h.nomineeAccounts(fakeRequest(memberId, PARIWAR));

      expect(res.available).toBe(true);
      if (!res.available) throw new Error(`expected available:true, got reason=${res.reason}`);
      expect(res.accounts).toHaveLength(2);

      // Account #1 — every field decrypted for real (not a mock).
      const acc1 = res.accounts.find((a) => a.rank === 1)!;
      expect(acc1.accountHolderName).toBe('Ravi Kumar');
      expect(acc1.accountNumber).toBe('123456789012');
      expect(acc1.ifsc).toBe('SBIN0000001');

      // Account #2 — the corrupted field degrades to the DISTINCT sentinel; the OTHER fields on the same
      // account still decrypt fine (one bad field never fails the whole account/read — AC6).
      const acc2 = res.accounts.find((a) => a.rank === 2)!;
      expect(acc2.accountHolderName).toBe('Asha Devi');
      expect(acc2.accountNumber).toBe(NOMINEE_BANK_DECRYPT_FAILED_SENTINEL);
      expect(acc2.ifsc).toBe('HDFC0000001');
    } finally {
      await t.pool.end().catch(() => undefined);
    }
  });
});

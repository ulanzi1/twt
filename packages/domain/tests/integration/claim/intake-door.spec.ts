// The claim DOOR — live DB (:5433). Story 6.38 (Task 3.5; N4, N5, N6, DL6, DL7).
//
//   · the full table: every lifecycle state × every moderation status (9 × 3 = 27) — exactly five refusals, in N6's order;
//   · `tryConverge` refuses BEFORE any write (⛔ claim, ⛔ attempt, ⛔ claim event — N5), and mints for an open member;
//   · once per death (N4): a member with a STANDING report meets ⛔ door; a member whose only claim was released by an
//     innocence finding meets it again.
// States are reached through REAL event sequences on the member's own stream (the door reads the unbounded replay).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ClaimIntakeRefusedError,
  resolveClaimIntakeDoor,
  tryConverge,
  type ClaimIntakeRefusalReason,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type MemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { MEMBER_LIFECYCLE_STATES, type MemberLifecycleState } from '../../../src/schema/members.js';
import { MODERATION_STATUSES, type ModerationStatus } from '../../../src/member/moderation/status.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedEvent } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

type Tx = ReturnType<typeof getTx>['tx'];

const verified = { kyc_verified: true };

/** The event sequence that replays to each lifecycle state. */
const PATH: Record<MemberLifecycleState, ReadonlyArray<readonly [string, unknown]>> = {
  'pending-kyc': [['member.signup_initiated', {}]],
  'pending-fee': [['member.signup_initiated', {}], ['member.kyc_completed', {}]],
  'pending-valid': [
    ['member.signup_initiated', {}], ['member.kyc_manual_fallback', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', { kyc_verified: false }],
  ],
  'lock-in': [['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}]],
  active: [
    ['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', verified],
  ],
  'active-in-grace': [
    ['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', verified], ['member.grace_entered', {}],
  ],
  'lapsed-unpaid': [
    ['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', verified], ['member.grace_entered', {}], ['member.grace_expired', {}],
  ],
  withdrawn: [
    ['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', verified], ['member.withdrawal_completed', {}],
  ],
  anonymized: [
    ['member.signup_initiated', {}], ['member.kyc_completed', {}], ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', verified], ['member.withdrawal_completed', {}], ['member.rtbf_anonymized', {}],
  ],
};

const MODERATION: Record<ModerationStatus, readonly string[]> = {
  none: [],
  suspended: ['member.moderation.suspended'],
  terminated: ['member.moderation.suspended', 'member.moderation.terminated'],
};

async function seedMemberAt(tx: Tx, state: MemberLifecycleState, moderation: ModerationStatus = 'none'): Promise<MemberId> {
  const mid = toMemberId(randomUUID());
  const events = [...PATH[state], ...MODERATION[moderation].map((t) => [t, { reason_code: 'conduct', actor: 'trustee' }] as const)];
  let v = 0;
  for (const [eventType, payload] of events) {
    v += 1;
    await seedEvent(tx, PARIWAR_A, { streamId: mid, eventType, payload, eventVersion: v });
  }
  return mid;
}

/** N6, in order. */
function expected(state: MemberLifecycleState, moderation: ModerationStatus): ClaimIntakeRefusalReason | null {
  if (state === 'anonymized') return 'erased';
  if (moderation === 'terminated') return 'removed';
  if (state === 'withdrawn') return 'left';
  if (state === 'pending-kyc') return 'not_joined';
  if (state === 'pending-fee') return 'not_paid';
  return null;
}

const intake = (mid: MemberId, auditId = randomUUID()) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: 'helpline' as const,
  actor: 'operator' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId,
});


describe.skipIf(!hasDatabase)('Story 6.38 — the claim door (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  const table = MEMBER_LIFECYCLE_STATES.flatMap((state) => MODERATION_STATUSES.map((m) => [state, m] as const));

  it('the table covers 9 × 3 = 27 cells, exactly five refusal kinds appear', () => {
    expect(table).toHaveLength(27);
    expect(new Set(table.map(([s, m]) => expected(s, m)).filter((r) => r !== null))).toEqual(
      new Set(['erased', 'removed', 'left', 'not_joined', 'not_paid']),
    );
  });

  it.each(table)('lifecycle `%s` × moderation `%s`', async (state, moderation) => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, state, moderation);
    await enterAppScope(client, PARIWAR_A);
    const door = await resolveClaimIntakeDoor(tx, mid);
    const want = expected(state, moderation);
    expect(door).toEqual(want === null ? { kind: 'open' } : { kind: 'refused', reason: want });
  });

  it('⭐ policy meaning — a member REMOVED and then RESTORED on appeal was ⛔ removed at the first report: the door is open', async () => {
    // `-423` Q3 B refuses a family when the person "had been removed". An appeal ruled `allowed` DIRECTS a restore (§8.8): the
    // overlay folds back to `none`, so the person is no longer removed. A door keyed on "was EVER terminated" would refuse that
    // family as `removed` and nothing else would notice — the 27-cell table has no restored cell, because `restored` is an
    // EVENT, ⛔ a standing.
    const { client, tx } = getTx();
    const midRemoved = toMemberId(randomUUID());
    const midRestored = toMemberId(randomUUID());
    for (const [mid, tail] of [
      [midRemoved, ['member.moderation.suspended', 'member.moderation.terminated']],
      [midRestored, ['member.moderation.suspended', 'member.moderation.terminated', 'member.moderation.restored']],
    ] as const) {
      let v = 0;
      for (const [eventType, payload] of [
        ...PATH.active,
        ...tail.map((t) => [t, { reason_code: 'conduct', actor: 'trustee' }] as const),
      ]) {
        v += 1;
        await seedEvent(tx, PARIWAR_A, { streamId: mid, eventType, payload, eventVersion: v });
      }
    }
    await enterAppScope(client, PARIWAR_A);
    // Control: without the restore the same history IS refused — so the open door below can only be the restore.
    expect(await resolveClaimIntakeDoor(tx, midRemoved)).toEqual({ kind: 'refused', reason: 'removed' });
    expect(await resolveClaimIntakeDoor(tx, midRestored)).toEqual({ kind: 'open' });
  });

  it('⭐ N5 — `tryConverge` refuses BEFORE any write: ⛔ claim, ⛔ attempt, ⛔ claim event', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'pending-kyc');
    await enterAppScope(client, PARIWAR_A);
    const before = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM events_log');
    const err = await tryConverge(client, intake(mid)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClaimIntakeRefusedError);
    expect((err as ClaimIntakeRefusedError).reason).toBe('not_joined');
    const claims = await client.query('SELECT 1 FROM claims WHERE deceased_member_id = $1', [mid]);
    const attempts = await client.query('SELECT 1 FROM intake_attempts WHERE deceased_member_id = $1', [mid]);
    const after = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM events_log');
    expect(claims.rowCount).toBe(0);
    expect(attempts.rowCount).toBe(0);
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });

  it('✅ an open member (lock-in — a typed-in identity, `-424` Q1 (a) C "filed") is minted as today', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    let v = 0;
    for (const t of ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid']) {
      v += 1;
      await seedEvent(tx, PARIWAR_A, { streamId: mid, eventType: t, payload: {}, eventVersion: v });
    }
    await enterAppScope(client, PARIWAR_A);
    const r = await tryConverge(client, intake(mid));
    expect(r.minted).toBe(true);
  });

  it('⭐ N4 — once per death: a STANDING report ⇒ ⛔ door, even for a member terminated since', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'active', 'terminated');
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, intakeChannels: ['helpline'], currentState: 'intake_converged' });
    await enterAppScope(client, PARIWAR_A);
    // Same channel as the standing claim ⇒ the idempotent leg, unchanged.
    const r = await tryConverge(client, intake(mid));
    expect(r.minted).toBe(false);
  });

  it('⭐ AC8 — a TERMINAL standing claim (`denied`) for a member TERMINATED since ⇒ ⛔ door: the mint guards decide — it mints', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'active', 'terminated');
    await enterAppScope(client, PARIWAR_A);
    await claimAt(client, PARIWAR_A, mid, 'denied');
    const r = await tryConverge(client, intake(mid));
    expect(r.minted).toBe(true);
  });

  it('⭐ AC8 — the death already PAID (`settled`) for a member WITHDRAWN since ⇒ ⛔ door: minted and CLOSED in the mint (6.28 H(ii))', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'withdrawn');
    await enterAppScope(client, PARIWAR_A);
    await claimAt(client, PARIWAR_A, mid, 'settled');
    const r = await tryConverge(client, intake(mid));
    expect(r.minted).toBe(true);
    expect(r.state).toBe('closed');
  });

  it('⭐ AC8 — cross-channel on a standing OPEN claim for a member terminated since ⇒ `pending`, ⛔ door', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'active', 'terminated');
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, intakeChannels: ['member_app'], currentState: 'intake_converged' });
    await enterAppScope(client, PARIWAR_A);
    const r = await tryConverge(client, intake(mid));
    expect(r.convergencePending).toBe(true);
  });

  it('⭐ N4 — a member whose ONLY claim was released by an innocence finding meets the door again', async () => {
    const { client, tx } = getTx();
    const mid = await seedMemberAt(tx, 'withdrawn');
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'denied' });
    await tx.insert(schema.claimNomineeFindings).values({
      findingId: randomUUID() as never,
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      kind: 'member_found_innocent',
      rank: null,
      recordedByActorId: 'investigator',
      recordedByDisplay: 'Investigator',
    });
    await enterAppScope(client, PARIWAR_A);
    const err = await tryConverge(client, intake(mid)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClaimIntakeRefusedError);
    expect((err as ClaimIntakeRefusedError).reason).toBe('left');
  });
});

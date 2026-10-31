// Story 6.38 — the shared live-DB fixture for "a death is reported" (the claim row + its `claim.intake_initiated`), the
// forced claim state and the innocence finding that releases it. Copied from `nominee/nominee-lock.spec.ts`'s helpers so the
// erasure, withdrawal, Life Events, medical and export specs all seed the SAME way. Not a `.spec.ts`.
//
// ⚠ `fileClaim` writes through `projectClaimState` — it BYPASSES `tryConverge` and therefore the claim door: these are the
// death reports the gates under test READ, ⛔ the intake under test.

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';

import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import type { TestDeps } from './_setup.js';

type Json = Record<string, unknown>;

export async function inScope<T>(
  t: TestDeps,
  pariwarId: string,
  fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>,
): Promise<T> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const out = await fn(scopeTx);
    await closeScopeTx(scopeTx, true);
    return out;
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** File a claim for `deceasedMemberId` in `pariwarId` (the claim row + `claim.intake_initiated`). Committed. */
export async function fileClaim(t: TestDeps, pariwarId: string, deceasedMemberId: string): Promise<string> {
  const claimCaseId = randomUUID();
  await inScope(t, pariwarId, async (s) => {
    await claim.projectClaimState(s.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['helpline'],
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null,
        to_state: 'intake_pending',
        trigger: 'seed',
        actor: 'system',
        deceased_member_id: deceasedMemberId,
        intake_channel: 'helpline',
        claimant_actor_id: null,
      },
      actorId: null,
    });
  });
  return claimCaseId;
}

/** Force the claim row's state (superuser + the projector's own session guard). */
export async function forceClaimState(t: TestDeps, claimCaseId: string, state: string): Promise<void> {
  const c = await t.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL app.claim_state_writer = 'on'");
    await c.query('UPDATE claims SET current_state = $1 WHERE claim_case_id = $2', [state, claimCaseId]);
    await c.query('COMMIT');
  } catch (err) {
    // ⛔ Never hand an ABORTED transaction back to the pool.
    await c.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}

/** Release the claim by an innocence finding (`-238` cl.1) — TEST-SEEDED: its producer is row 6-22, unbuilt. */
export async function findInnocent(t: TestDeps, pariwarId: string, claimCaseId: string): Promise<void> {
  await inScope(t, pariwarId, (s) =>
    claim.recordMemberInnocenceFinding(s.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      findingId: ids.claimNomineeFindingId(randomUUID()),
      actorId: randomUUID(),
      actorDisplay: 'Investigating Trustee',
      actor: 'trustee',
    }),
  );
}

export type SeedLifecycleState =
  | 'pending-kyc'
  | 'pending-fee'
  | 'pending-valid'
  | 'lock-in'
  | 'active'
  | 'active-in-grace'
  | 'lapsed-unpaid'
  | 'withdrawn'
  | 'anonymized';

const audit = (from: string | null, to: string, trigger: string, actor: 'member' | 'system', extra: Json = {}): Json => ({
  from_state: from,
  to_state: to,
  trigger,
  actor,
  ...extra,
});

/**
 * Seed a member walked through REAL events (the projector, committed) to `to` — `manual: true` takes the typed-in-identity
 * route (`member.kyc_manual_fallback` — `self_declared`) instead of DigiLocker — then, optionally, the moderation overlay.
 * ⚠ `anonymized` appends the event only (⛔ `anonymizeMember`) — the door and the locks read the replay.
 */
export async function seedMemberAt(
  t: TestDeps,
  to: SeedLifecycleState,
  opts: { pariwarId?: string; manual?: boolean; moderation?: 'suspended' | 'terminated' } = {},
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = opts.pariwarId ?? randomUUID();
  await inScope(t, pariwarId, async (s) => {
    const step = (eventType: string, payload: Json, actorId: string | null = memberId) =>
      memberDomain.projectMemberState(s.client, {
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        eventType: eventType as never,
        payload: payload as never,
        actorId,
      });
    await step('member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
    if (to === 'pending-kyc') return;
    if (opts.manual) {
      await step('member.kyc_manual_fallback', audit('pending-kyc', 'pending-fee', 'kyc_manual', 'member', { reason: 'manual_fallback' }));
    } else {
      await step('member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
    }
    if (to === 'pending-fee') return;
    await step('member.vyawastha_shulk_paid', audit('pending-fee', 'lock-in', 'fee_paid', 'member', { utr: 'UTR-638', amount_inr: 110 }));
    if (to === 'lock-in') return;
    if (to === 'pending-valid') {
      await step('member.lock_in_expired', audit('lock-in', 'pending-valid', 'lock_in_expired', 'system', { kyc_verified: false }), null);
      return;
    }
    await step('member.lock_in_expired', audit('lock-in', 'active', 'lock_in_expired', 'system', { kyc_verified: true }), null);
    if (to === 'active') return;
    if (to === 'active-in-grace' || to === 'lapsed-unpaid') {
      await step('member.grace_entered', audit('active', 'active-in-grace', 'grace_entered', 'system'), null);
      if (to === 'lapsed-unpaid') {
        await step('member.grace_expired', audit('active-in-grace', 'lapsed-unpaid', 'grace_expired', 'system'), null);
      }
      return;
    }
    await step('member.withdrawal_completed', audit('active', 'withdrawn', 'voluntary_withdrawal', 'member'));
    if (to === 'anonymized') {
      await step('member.rtbf_anonymized', audit('withdrawn', 'anonymized', 'rtbf_request', 'member'));
    }
  });
  if (opts.moderation === 'suspended') await moderate(t, pariwarId, memberId, ['member.moderation.suspended']);
  if (opts.moderation === 'terminated') await terminate(t, pariwarId, memberId);
  return { memberId, pariwarId };
}

/** `active`, optionally on to `withdrawn` and / or TERMINATED — the shape most of the 6.38 specs need. */
export async function seedLifecycleMember(
  t: TestDeps,
  opts: { pariwarId?: string; withdraw?: boolean; terminate?: boolean } = {},
): Promise<{ memberId: string; pariwarId: string }> {
  return seedMemberAt(t, opts.withdraw ? 'withdrawn' : 'active', {
    ...(opts.pariwarId !== undefined ? { pariwarId: opts.pariwarId } : {}),
    ...(opts.terminate ? { moderation: 'terminated' as const } : {}),
  });
}

async function moderate(t: TestDeps, pariwarId: string, memberId: string, eventTypes: readonly string[]): Promise<void> {
  for (const [i, eventType] of eventTypes.entries()) {
    await t.pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
       SELECT $1, $2, $3::jsonb, COALESCE(max(event_version), 0) + 1, now() - make_interval(days => $5), $4
         FROM events_log WHERE stream_id = $1`,
      [memberId, eventType, JSON.stringify({ reason_code: 'conduct', actor: 'trustee' }), pariwarId, eventTypes.length - i],
    );
  }
}

/**
 * Terminate a member through the moderation overlay: `suspended` THEN `terminated` (`nextModerationStatus` refuses
 * `terminate` from `none` — the `member-data-rights/delivery-and-correction.spec.ts` fixture's note). Appended to the
 * member's own stream at the next versions, superuser, committed.
 */
export async function terminate(t: TestDeps, pariwarId: string, memberId: string): Promise<void> {
  await moderate(t, pariwarId, memberId, ['member.moderation.suspended', 'member.moderation.terminated']);
}

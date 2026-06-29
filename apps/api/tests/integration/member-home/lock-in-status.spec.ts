// Member home lock-in-status read — E2E (live DB :5433) — Story 3.7 (Task 3; AC1/AC2/AC4).
//
// Drives GET /api/v1/member/lock-in-status through `app.inject`:
//   · Headline (AC1/AC2): a member seeded through to `lock-in` (signup_initiated → kyc_manual_fallback
//     → nominees_declared → medical_disclosed → vyawastha_shulk_paid → lock_in_entered, the marker
//     carrying the FR-8 snapshot) → state 'lock-in' + a lockIn block with daysRemaining 30, lockInDays
//     30, the niy.lock-in.policy clauseId + the snapshotted clauseVersion, and unlockDate = enteredAt+30d.
//   · Non-lock-in (AC1/AC3 self-suppression): a pending-kyc member → state 'pending-kyc', lockIn null.
//   · Auth: no session → 401.
//
// Member creation is the signup flow (3.6a); this harness SEEDS the event stream directly (committed,
// superuser bypasses RLS) via projectMemberState — the same pattern as the 3.6b vyawastha-shulk spec.
// Assert MEMBERSHIP not counts (own-committing writers accumulate rows).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
type Json = Record<string, unknown>;

const POLICY_VERSION = '0e1c0006-0000-4000-8000-000000000006';

/** Seed a member all the way to `lock-in`, the lock_in_entered marker carrying the FR-8 snapshot. */
async function seedLockedInMember(
  t: TestApp,
  lockInDays = 30,
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    const seq: Array<[string, Json]> = [
      ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
      ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
      ['member.nominees_declared', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'nominees', actor: 'member', nominee_count: 1, split: 'sole' }],
      ['member.medical_disclosed', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'medical', actor: 'member', ima_list_version: 'ima-v1', condition_count: 0, acknowledged: true, ack_locale: 'en' }],
      ['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 110 }],
      ['member.lock_in_entered', { from_state: 'lock-in', to_state: 'lock-in', trigger: 'lock_in_entered', actor: 'member', lock_in_days_at_join: lockInDays, lock_in_policy_version: POLICY_VERSION }],
    ];
    for (const [eventType, payload] of seq) {
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: eventType as never, actorId: memberId, payload,
      });
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed a member in `pending-kyc` (signup_initiated only) — the non-lock-in case. */
async function seedPendingKycMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId), pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  url: string,
  opts: { token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method: 'GET',
    url,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

const URL = '/api/v1/member/lock-in-status';

describe.skipIf(!hasDatabase)('Member home lock-in-status — E2E (:5433)', () => {
  it('Headline: a lock-in member → state lock-in + the clock figures (AC1/AC2)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedLockedInMember(t);
      const res = await inject(t, URL, { token: token(t, memberId, pariwarId) });

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('lock-in');
      const lockIn = res.body.lockIn as Json;
      expect(lockIn).not.toBeNull();
      expect(lockIn.daysRemaining).toBeGreaterThanOrEqual(30)
      expect(lockIn.daysRemaining).toBeLessThanOrEqual(31)
      expect(lockIn.lockInDays).toBe(30);
      expect(lockIn.clauseId).toBe('niy.lock-in.policy');
      expect(lockIn.clauseVersion).toBe(POLICY_VERSION);

      // unlockDate = enteredAt + 30 days (server, leap-safe).
      const enteredAt = new Date(String(lockIn.enteredAt)).getTime();
      const unlockDate = new Date(String(lockIn.unlockDate)).getTime();
      expect(Math.round((unlockDate - enteredAt) / MS_PER_DAY)).toBe(30);
    } finally {
      await teardown(t);
    }
  });

  it('a non-lock-in member → lockIn null, state echoed (AC1/AC3 self-suppression)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedPendingKycMember(t);
      const res = await inject(t, URL, { token: token(t, memberId, pariwarId) });

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('pending-kyc');
      expect(res.body.lockIn).toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('no session → 401', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, URL);
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});

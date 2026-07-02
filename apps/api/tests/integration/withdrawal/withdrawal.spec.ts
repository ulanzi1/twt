// Voluntary withdrawal E2E (live DB :5433) — Story 3.10 (Task 10; AC1/AC4/AC5).
//
// Drives the withdrawal confirm route through `app.inject`:
//   · STEP-UP gated ('withdrawal'): 403 auth.step_up_required WITHOUT elevation; passes WITH a matching
//     'withdrawal' elevation; a 'nominee_change' elevation does NOT satisfy it (cross-context isolation).
//   · on confirm: emits member.withdrawal_completed (right type, auditShape-only payload, NO reason PII
//     in the event); state → withdrawn; the reason free-text is Tier-1-encrypted at rest, NEVER echoed
//     in the response, NEVER in the event payload, NEVER in the audit context; the audit context carries
//     reason_code (bounded enum) but NEVER reason_text.
//   · terminal-state discipline: an already-withdrawn member cannot re-withdraw (withdrawal.invalid_state).
//
// Member creation is Story 3.6 (R2) — the harness SEEDS an ACTIVE member (events_log + members row)
// committed so the request handler (separate scope tx) + the FK → members both see the row.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

/** Seed an ACTIVE member (signup → kyc_completed → shulk_paid → lock_in_expired verified), committed. */
async function seedActiveMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    const project = (eventType: string, payload: Json) =>
      memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid,
        pariwarId: pid,
        eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
        actorId: memberId,
        payload,
      });
    await project('member.signup_initiated', {
      from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member',
    });
    await project('member.kyc_completed', {
      from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc', actor: 'member',
    });
    await project('member.vyawastha_shulk_paid', {
      from_state: 'pending-fee', to_state: 'lock-in', trigger: 'fee_paid', actor: 'member',
      utr: 'UTR123', amount_inr: 110,
    });
    await project('member.lock_in_expired', {
      from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system',
      kyc_verified: true,
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

async function elevate(t: TestApp, memberId: string, actionContext: string): Promise<void> {
  await memberAuthRepo.insertElevation(t.deps.pool, {
    memberId,
    actionContext,
    elevatedUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
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

async function eventRows(t: TestApp, memberId: string, type: string): Promise<{ payload: Json }[]> {
  const res = await t.pool.query<{ payload: Json }>(
    `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = $2 ORDER BY event_version`,
    [memberId, type],
  );
  return res.rows;
}

async function memberState(t: TestApp, memberId: string): Promise<string | undefined> {
  const st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
  return st.rows[0]?.state;
}

const URL = '/api/v1/member/withdrawal';
const SECRET_REASON = 'moving-abroad-permanently-xyz';

describe.skipIf(!hasDatabase)('Voluntary withdrawal — E2E (:5433)', () => {
  it('AC1c: confirm requires a withdrawal step-up — 403 without; a nominee_change elevation does NOT satisfy', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedActiveMember(t);
      const tok = token(t, memberId, pariwarId);

      const blocked = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(blocked.status).toBe(403);
      expect(String((blocked.body.error as Json)?.code)).toBe('auth.step_up_required');

      // A DIFFERENT context does NOT satisfy the withdrawal gate (cross-context isolation).
      await elevate(t, memberId, 'nominee_change');
      const stillBlocked = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(stillBlocked.status).toBe(403);
      // The state is untouched by a blocked attempt.
      expect(await memberState(t, memberId)).toBe('active');
    } finally {
      await teardown(t);
    }
  });

  it('AC1/AC4/AC5: with a withdrawal elevation → state=withdrawn, event auditShape-only, reason PII shielded', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedActiveMember(t);
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'withdrawal');

      const res = await inject(t, 'POST', URL, {
        payload: { reasonCode: 'relocation', reasonText: SECRET_REASON },
        token: tok,
      });
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('withdrawn');
      expect(typeof res.body.rejoinPermittedAt).toBe('string');
      // The response NEVER echoes the free-text reason (R1).
      expect(JSON.stringify(res.body)).not.toContain(SECRET_REASON);

      // State advanced to withdrawn.
      expect(await memberState(t, memberId)).toBe('withdrawn');

      // The event is the transition with an auditShape-ONLY payload — NO reason of any kind.
      const events = await eventRows(t, memberId, 'member.withdrawal_completed');
      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({
        from_state: 'active', to_state: 'withdrawn', actor: 'member',
      });
      const eventStr = JSON.stringify(events);
      expect(eventStr).not.toContain(SECRET_REASON);
      expect(eventStr).not.toContain('relocation');

      // The reason free-text is Tier-1 ENCRYPTED at rest; reason_code is stored plainly.
      const row = await t.pool.query<{ reason_code: string; reason_text_ciphertext: string }>(
        `SELECT reason_code, reason_text_ciphertext FROM member_withdrawals WHERE member_id = $1`,
        [memberId],
      );
      expect(row.rows[0]?.reason_code).toBe('relocation');
      expect(row.rows[0]?.reason_text_ciphertext).not.toContain(SECRET_REASON);
      expect(row.rows[0]?.reason_text_ciphertext).toMatch(/^enc:/);

      // The audit line carries reason_code but NEVER the free-text reason.
      const audits = t.auditSink.ofType('member_withdrawal.completed');
      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain(SECRET_REASON);
      expect(JSON.stringify(audits)).toContain('relocation');
    } finally {
      await teardown(t);
    }
  });

  it('allows a withdrawal with no reason (both fields optional)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedActiveMember(t);
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'withdrawal');

      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('withdrawn');
      const row = await t.pool.query<{ reason_code: string | null; reason_text_ciphertext: string | null }>(
        `SELECT reason_code, reason_text_ciphertext FROM member_withdrawals WHERE member_id = $1`,
        [memberId],
      );
      expect(row.rows[0]?.reason_code).toBeNull();
      expect(row.rows[0]?.reason_text_ciphertext).toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('AC5: an already-withdrawn member cannot re-withdraw (withdrawal.invalid_state)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedActiveMember(t);
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'withdrawal');

      const first = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(first.status).toBe(200);

      // A second withdrawal is rejected at the withdrawable-state guard.
      await elevate(t, memberId, 'withdrawal');
      const second = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(second.status).toBe(409);
      expect(String((second.body.error as Json)?.code)).toBe('withdrawal.invalid_state');
    } finally {
      await teardown(t);
    }
  });

  it('AC5: a pre-active member (pending-fee) cannot withdraw (invalid_state — reducer would no-op)', async () => {
    const t = await createTestApp();
    try {
      // Seed a member only up to pending-fee (not active).
      const memberId = randomUUID();
      const pariwarId = randomUUID();
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      });
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: 'member.kyc_completed', actorId: memberId,
        payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc', actor: 'member' },
      });
      await closeScopeTx(scopeTx, true);

      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'withdrawal');
      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('withdrawal.invalid_state');
      expect(await memberState(t, memberId)).toBe('pending-fee');
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', URL, { payload: {} });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});

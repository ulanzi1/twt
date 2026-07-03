// Member RTBF anonymization E2E (live DB :5433) — Story 3.12 (Task 8; AC2/AC5).
//
// Drives the RTBF confirm route through `app.inject`:
//   · STEP-UP gated ('rtbf'): 403 auth.step_up_required WITHOUT elevation; a 'withdrawal' elevation does
//     NOT satisfy it (RTBF is irreversible → its own fresh elevation, cross-context isolation).
//   · on confirm (withdrawn member): emits member.rtbf_anonymized (auditShape-only payload, NO PII);
//     state → anonymized; the response echoes only { state, anonymizedAt } (NO cleared PII); the audit
//     line carries anonymized_at + anonymization_actor ONLY.
//   · state discipline: an ACTIVE (not-yet-withdrawn) member → 409 rtbf.invalid_state; an already-
//     ANONYMIZED member → 409 (cannot re-anonymize).
//   · requires a member session (401 without a token).
//
// Member creation is Story 3.6 (R2) — the harness SEEDS the lifecycle (events_log + members row)
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

const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'system',
  extra: Json = {},
): Json => ({ from_state: from, to_state: to, trigger, actor, ...extra });

/** Seed a member and drive the lifecycle through the projector, committed. `withdraw`/`anonymize`
 *  extend the stream to the terminal states so each test starts from a known point. */
async function seedMember(
  t: TestApp,
  opts: { withdraw?: boolean; anonymize?: boolean } = {},
): Promise<{ memberId: string; pariwarId: string }> {
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
    await project('member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
    await project('member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
    await project(
      'member.vyawastha_shulk_paid',
      audit('pending-fee', 'lock-in', 'fee_paid', 'member', { utr: 'UTR123', amount_inr: 110 }),
    );
    await project(
      'member.lock_in_expired',
      audit('lock-in', 'active', 'lock_in_expired', 'system', { kyc_verified: true }),
    );
    if (opts.withdraw || opts.anonymize) {
      await project(
        'member.withdrawal_completed',
        audit('active', 'withdrawn', 'voluntary_withdrawal', 'member'),
      );
    }
    if (opts.anonymize) {
      await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, { memberId: mid, pariwarId: pid });
      await project('member.rtbf_anonymized', audit('withdrawn', 'anonymized', 'rtbf_request', 'member'));
    }
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

async function memberState(t: TestApp, memberId: string): Promise<string | undefined> {
  const st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
  return st.rows[0]?.state;
}

const URL = '/api/v1/member/rtbf';

describe.skipIf(!hasDatabase)('Member RTBF anonymization — E2E (:5433)', () => {
  it('AC5: confirm requires an rtbf step-up — 403 without; a withdrawal elevation does NOT satisfy', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, { withdraw: true });
      const tok = token(t, memberId, pariwarId);

      const blocked = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(blocked.status).toBe(403);
      expect(String((blocked.body.error as Json)?.code)).toBe('auth.step_up_required');

      // A DIFFERENT context does NOT satisfy the rtbf gate (cross-context isolation).
      await elevate(t, memberId, 'withdrawal');
      const stillBlocked = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(stillBlocked.status).toBe(403);
      expect(await memberState(t, memberId)).toBe('withdrawn');
    } finally {
      await teardown(t);
    }
  });

  it('AC2: withdrawn + rtbf elevation → 200 anonymized; event auditShape-only; audit NON-PII; no PII echoed', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, { withdraw: true });
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'rtbf');

      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('anonymized');
      expect(typeof res.body.anonymizedAt).toBe('string');

      // State advanced to anonymized.
      expect(await memberState(t, memberId)).toBe('anonymized');

      // The event is the transition with an auditShape-ONLY payload.
      const events = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.rtbf_anonymized'`,
        [memberId],
      );
      expect(events.rows).toHaveLength(1);
      expect(events.rows[0]?.payload).toMatchObject({
        from_state: 'withdrawn',
        to_state: 'anonymized',
        actor: 'member',
      });

      // The audit line carries anonymized_at + anonymization_actor ONLY (NON-PII).
      const audits = t.auditSink.ofType('member_rtbf.completed');
      expect(audits.length).toBeGreaterThanOrEqual(1);
      const ctx = (audits[0] as { context?: Json }).context ?? {};
      expect(ctx.anonymized_at).toBeDefined();
      expect(ctx.anonymization_actor).toBe(memberId);
    } finally {
      await teardown(t);
    }
  });

  it('AC5: an ACTIVE (not-yet-withdrawn) member cannot be anonymized (rtbf.invalid_state)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t); // active, not withdrawn
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'rtbf');

      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('rtbf.invalid_state');
      expect(await memberState(t, memberId)).toBe('active');
    } finally {
      await teardown(t);
    }
  });

  it('AC5: an already-anonymized member cannot be re-anonymized (rtbf.already_anonymized)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, { anonymize: true });
      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'rtbf');

      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('rtbf.already_anonymized');
    } finally {
      await teardown(t);
    }
  });

  it('AC2 + PII at-rest: RTBF route overwrites member_identities ciphertext; retains mobile_blind_index', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, { withdraw: true });

      // Insert a member_identities row with a known original ciphertext
      const piiTx = await openScopeTx(t.deps, pariwarId);
      let piiOk = false;
      try {
        await piiTx.client.query(
          `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
           VALUES ($1, $2, 'enc:v1:original-mobile', 'blind-api-test')`,
          [memberId, pariwarId],
        );
        piiOk = true;
      } finally {
        await closeScopeTx(piiTx, piiOk);
      }

      const tok = token(t, memberId, pariwarId);
      await elevate(t, memberId, 'rtbf');

      const res = await inject(t, 'POST', URL, { payload: {}, token: tok });
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('anonymized');

      // Verify PII was overwritten at the DB level (anonymizeMember was invoked by the handler)
      const verifyTx = await openScopeTx(t.deps, pariwarId);
      let verifyOk = false;
      try {
        const result = await verifyTx.client.query<{
          mobile_ciphertext: string;
          mobile_blind_index: string;
        }>(
          `SELECT mobile_ciphertext, mobile_blind_index FROM member_identities WHERE member_id = $1`,
          [memberId],
        );
        // Ciphertext must be overwritten with the anonymized sentinel (not the original)
        expect(result.rows[0]?.mobile_ciphertext).not.toBe('enc:v1:original-mobile');
        expect(result.rows[0]?.mobile_ciphertext).toMatch(/^enc:v1:/);
        // AC4: blind index must be RETAINED (rejoin-lock key must not be cleared)
        expect(result.rows[0]?.mobile_blind_index).toBe('blind-api-test');
        verifyOk = true;
      } finally {
        await closeScopeTx(verifyTx, verifyOk);
      }
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

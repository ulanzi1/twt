// KYC signup-step E2E (live DB :5433) — Story 3.3b (Task 7; AC1/AC2/AC5).
//
// Drives the FULL surface through `app.inject` with the FIXTURE provider (never the live
// DigiLocker API): the PUBLIC state-correlated callback → member confirm (emits
// member.kyc_completed → pending-fee), the manual fallback (emits member.kyc_manual_fallback
// → pending-fee + an encrypted self_declared profile), the pending-kyc guard, idempotent
// re-confirm, and cross-tenant RLS on member_kyc_profiles.
//
// Member creation is Story 3.6 (R2) — the harness SEEDS a pending-kyc member (events_log
// signup_initiated) + a member session token + (for the DigiLocker path) a kyc_transaction.

import { randomUUID } from 'node:crypto';

import { ids, kyc, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

/**
 * Seed a pending-kyc member the way Story 3.6 will: project member.signup_initiated so BOTH
 * the events_log stream AND the `members` row exist (the member_kyc_profiles FK → members
 * requires the row). Committed so the request handlers (separate scope tx) see it.
 */
async function seedPendingKycMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.signup_initiated',
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      actorId: memberId,
    });
    await closeScopeTx(scopeTx, true); // COMMIT
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/**
 * Seed a pending kyc_transaction (the callback-correlation row).
 *
 * ⚠ `provider` is 'fixture' — the key this suite actually REGISTERS (see `_setup.ts`). It used to
 * seed 'digilocker' while registering only `fixture`, a mismatch that was invisible because the
 * callback ignored the recorded provider and re-resolved the active one. Now that the callback PINS
 * to the transaction's own provider (Review Pass 4 — so a provider flip mid-flow cannot strand a
 * member holding provider A's OAuth state), a seed naming an unregistered provider is correctly
 * refused with `kyc.provider_unavailable`.
 */
async function seedTransaction(t: TestApp, memberId: string, pariwarId: string): Promise<{ transactionId: string; state: string }> {
  const state = `state-${randomUUID()}`;
  const res = await t.pool.query<{ transaction_id: string }>(
    `INSERT INTO kyc_transactions
       (member_id, pariwar_id, provider, intent, state, code_verifier, redirect_uri, status, expires_at)
       VALUES ($1, $2, 'fixture', 'signup', $3, 'verifier', 'https://app.twt.local/kyc/callback', 'pending', now() + interval '15 min')
       RETURNING transaction_id`,
    [memberId, pariwarId, state],
  );
  return { transactionId: res.rows[0]!.transaction_id, state };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
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

async function eventTypes(t: TestApp, memberId: string): Promise<string[]> {
  const res = await t.pool.query<{ event_type: string }>(
    `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
    [memberId],
  );
  return res.rows.map((r) => r.event_type);
}

describe.skipIf(!hasDatabase)('KYC signup step — E2E with the fixture provider (:5433)', () => {
  it('AC1 DigiLocker: callback persists the profile, confirm emits member.kyc_completed → pending-fee', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedPendingKycMember(t);
      const { transactionId, state } = await seedTransaction(t, memberId, pariwarId);

      // PUBLIC callback (no token) — verify+pull (fixture) + persist awaiting confirm.
      const cb = await inject(t, 'POST', '/api/v1/kyc/callback', { payload: { state, code: 'auth-code' } });
      expect(cb.status).toBe(200);
      expect(cb.body.verificationStrength).toBe('aadhaar_kyc');
      expect(cb.body.photoPresent).toBe(false); // the fixture returns no photo
      expect(typeof cb.body.name).toBe('string');

      // The profile persisted (source digilocker), but NO kyc_completed yet (awaits confirm).
      const afterCb = await t.pool.query<{ source: string }>(
        `SELECT source FROM member_kyc_profiles WHERE member_id = $1`,
        [memberId],
      );
      expect(afterCb.rows[0]?.source).toBe('digilocker');
      expect(await eventTypes(t, memberId)).toEqual(['member.signup_initiated']);

      // Member confirms → emits member.kyc_completed (pending-kyc → pending-fee).
      const confirm = await inject(t, 'POST', '/api/v1/member/kyc/confirm', {
        payload: { transactionId },
        token: token(t, memberId, pariwarId),
      });
      expect(confirm.status).toBe(200);
      expect(confirm.body.lifecycleState).toBe('pending-fee');
      expect(confirm.body.memberKycState).toBe('digilocker_verified');
      expect(confirm.body.manualFallbackEnabled).toBe(true);
      expect(await eventTypes(t, memberId)).toEqual(['member.signup_initiated', 'member.kyc_completed']);

      // members.state projected to pending-fee.
      const st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
      expect(st.rows[0]?.state).toBe('pending-fee');

      // Idempotent re-confirm — no second member.kyc_completed.
      const reconfirm = await inject(t, 'POST', '/api/v1/member/kyc/confirm', {
        payload: { transactionId },
        token: token(t, memberId, pariwarId),
      });
      expect(reconfirm.status).toBe(200);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.kyc_completed').length).toBe(1);

      // Audit emitted (masked-Aadhaar / transactionId only — no PII).
      // member_kyc.verified = callback (verify+persist); member_kyc.confirmed = confirm step.
      expect(t.auditSink.ofType('member_kyc.verified').length).toBeGreaterThanOrEqual(1);
      expect(t.auditSink.ofType('member_kyc.confirmed').length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain('Fixture Member');
    } finally {
      await teardown(t);
    }
  });

  it('AC1/AC5 manual fallback: emits member.kyc_manual_fallback + an encrypted self_declared profile', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedPendingKycMember(t);

      const manual = await inject(t, 'POST', '/api/v1/member/kyc/manual', {
        payload: { name: 'Asha Devi', dob: '1990-01-01' },
        token: token(t, memberId, pariwarId),
      });
      expect(manual.status).toBe(200);
      expect(manual.body.lifecycleState).toBe('pending-fee');
      expect(manual.body.memberKycState).toBe('manual_pending');
      expect(await eventTypes(t, memberId)).toContain('member.kyc_manual_fallback');

      // The manual fallback event carries a REQUIRED reason (R1 / KycManualFallbackPayloadSchema).
      const ev = await t.pool.query<{ payload: { reason?: string; to_state?: string } }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.kyc_manual_fallback'`,
        [memberId],
      );
      expect(ev.rows[0]?.payload.reason).toBeTruthy();
      expect(ev.rows[0]?.payload.to_state).toBe('pending-fee');

      // The profile is self_declared, NOT trustee-verified, NO masked-Aadhaar; name is encrypted.
      const prof = await t.pool.query<{
        source: string;
        verification_strength: string;
        trustee_verified: boolean;
        aadhaar_masked_id: string | null;
        name_ciphertext: string;
      }>(
        `SELECT source, verification_strength, trustee_verified, aadhaar_masked_id, name_ciphertext
           FROM member_kyc_profiles WHERE member_id = $1`,
        [memberId],
      );
      expect(prof.rows[0]?.source).toBe('manual');
      expect(prof.rows[0]?.verification_strength).toBe('self_declared');
      expect(prof.rows[0]?.trustee_verified).toBe(false);
      expect(prof.rows[0]?.aadhaar_masked_id).toBeNull();
      expect(prof.rows[0]?.name_ciphertext).not.toContain('Asha'); // Tier-1 encrypted at rest
    } finally {
      await teardown(t);
    }
  });

  it('rejects the KYC step for a member who is not pending-kyc (409)', async () => {
    const t = await createTestApp();
    try {
      const memberId = randomUUID();
      const pariwarId = randomUUID();
      // Seed past-KYC: signup_initiated + kyc_manual_fallback → pending-fee.
      await t.pool.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id) VALUES
           ($1,'member.signup_initiated','{}'::jsonb,1, now()-interval '2 day',$2),
           ($1,'member.kyc_manual_fallback','{}'::jsonb,2, now()-interval '1 day',$2)`,
        [memberId, pariwarId],
      );
      const manual = await inject(t, 'POST', '/api/v1/member/kyc/manual', {
        payload: { name: 'Asha Devi', dob: '1990-01-01' },
        token: token(t, memberId, pariwarId),
      });
      expect(manual.status).toBe(409);
      expect(String(manual.body.error && (manual.body.error as Json).code)).toContain('kyc');
    } finally {
      await teardown(t);
    }
  });

  it('callback 404s for an unknown OAuth state', async () => {
    const t = await createTestApp();
    try {
      const cb = await inject(t, 'POST', '/api/v1/kyc/callback', {
        payload: { state: 'no-such-state', code: 'c' },
      });
      expect(cb.status).toBe(404);
    } finally {
      await teardown(t);
    }
  });

  it('cross-tenant RLS: a member_kyc_profiles row is invisible under a DIFFERENT pariwar scope', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedPendingKycMember(t);
      await inject(t, 'POST', '/api/v1/member/kyc/manual', {
        payload: { name: 'Asha Devi', dob: '1990-01-01' },
        token: token(t, memberId, pariwarId),
      });

      // Under the OWNING pariwar scope (twt_app role) — the row is visible.
      const ownScope = await openScopeTx(t.deps, pariwarId);
      try {
        const own = await ownScope.client.query(`SELECT 1 FROM member_kyc_profiles WHERE member_id = $1`, [memberId]);
        expect(own.rowCount).toBe(1);
        const viaAccessor = await kyc.getMemberKycProfile(ownScope.tx, ids.pariwarId(pariwarId), ids.memberId(memberId));
        expect(viaAccessor).not.toBeNull();
      } finally {
        await closeScopeTx(ownScope, false);
      }

      // Under a DIFFERENT pariwar scope — RLS hides the row entirely (0 rows even raw).
      const otherScope = await openScopeTx(t.deps, randomUUID());
      try {
        const other = await otherScope.client.query(`SELECT 1 FROM member_kyc_profiles WHERE member_id = $1`, [memberId]);
        expect(other.rowCount).toBe(0);
      } finally {
        await closeScopeTx(otherScope, false);
      }
    } finally {
      await teardown(t);
    }
  });
});

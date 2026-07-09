// Member-app claim-filing E2E (live DB :5433) — Story 6.2 (Task 9; AC2/AC3/AC5/AC6).
//
// Drives the full Ravi-mode intake surface through `app.inject`:
//   · handover-trust OTP send → verify (nominee-mobile-targeted; existence-defended; the
//     verify records the claim_handover elevation the intake route requires);
//   · relationship-confirm → intake: exactly ONE claim.intake_initiated on the claim stream,
//     projecting intake_pending, carrying deceased_member_id (snake_case) — and the merged
//     Story 3.1 account-frozen overlay now reads FROZEN (the load-bearing seam, driven end-to-
//     end per /verify discipline, not just a unit assert);
//   · idempotency (AC3): a second intake returns the SAME claim, NO second event, NO second freeze;
//   · handover-trust gate (AC3 ordering): intake WITHOUT a verified handover OTP ⇒ 403;
//   · PII discipline: no nominee name/mobile in the claim payload OR the audit context;
//   · the member-session guard (no token ⇒ 401).
//
// Member creation is Story 3.6 — the harness SEEDS a member (events_log + members row) + a
// session token, then declares a nominee via the real route so the handover OTP has a target.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

/** Seed a member in `pending-fee` (signup_initiated → kyc_manual_fallback), committed so the
 * request handlers (separate scope tx) see the row (the nominee-declare.spec.ts precedent). */
async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
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

/** Declare a primary nominee via the real route so the handover OTP has a target. */
async function declareNominee(t: TestApp, memberId: string, pariwarId: string, mobile: string): Promise<void> {
  const res = await inject(t, 'POST', '/api/v1/member/nominees', {
    payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile }] },
    token: token(t, memberId, pariwarId),
  });
  expect(res.status).toBe(200);
}

/** Run the handover OTP send → verify legs and return the established-trust session token. */
async function establishHandoverTrust(t: TestApp, memberId: string, pariwarId: string): Promise<void> {
  const tok = token(t, memberId, pariwarId);
  const send = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: tok });
  expect(send.status).toBe(200);
  expect(send.body).toMatchObject({ sent: true });
  const code = t.stepUpDelivery.last?.code;
  expect(code).toMatch(/^\d{6}$/);
  const verify = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
    payload: { code }, token: tok,
  });
  expect(verify.status).toBe(200);
  expect(verify.body).toMatchObject({ verified: true });
}

describe.skipIf(!hasDatabase)('Member-app claim filing — E2E (:5433)', () => {
  it('AC2/AC3/AC6: handover-trust → intake → intake_converged (Story 6.4 ICP auto-converge) + account FROZEN + idempotent, no PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '+91 98765 43210');

      // AC2 — handover-trust OTP to the NOMINEE's mobile (masked hint; last-4 = 3210).
      const send = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', {
        payload: {}, token: token(t, memberId, pariwarId),
      });
      expect(send.status).toBe(200);
      expect(send.body.sent).toBe(true);
      expect(send.body.nomineeMobileMasked).toBe('+91·····3210');
      // The delivery targeted the nominee's E.164 via the `login` variant (resolved mobile).
      expect(t.stepUpDelivery.last?.intent).toBe('login');
      const code = t.stepUpDelivery.last?.code as string;

      const verify = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
        payload: { code }, token: token(t, memberId, pariwarId),
      });
      expect(verify.body).toMatchObject({ verified: true });

      // Account NOT yet frozen — no claim event before intake.
      const before = await memberDomain.getMemberAccountOverlay(t.deps.db, ids.memberId(memberId), new Date());
      expect(before.accountFrozen).toBe(false);

      // AC3 — relationship-confirm → intake.
      const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
        payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
      });
      expect(intake.status).toBe(200);
      // Story 6.4: a lone intake now AUTO-CONVERGES — the ICP emits claim.intake_converged
      // immediately, so the response/persisted state is intake_converged (was intake_pending).
      expect(intake.body.state).toBe('intake_converged');
      expect(intake.body.convergencePending).toBe(false);
      const claimCaseId = intake.body.claimCaseId as string;
      expect(claimCaseId).toMatch(/^[0-9a-f-]{36}$/);

      // The lone-intake stream is [intake_initiated, intake_converged] — the freeze fires on the
      // FIRST (intake_initiated, carrying the pinned seam), convergence is the SECOND (Story 6.4).
      const events = await t.pool.query<{ event_type: string; payload: Json }>(
        `SELECT event_type, payload FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
        [claimCaseId],
      );
      expect(events.rows.map((r) => r.event_type)).toEqual([
        'claim.intake_initiated',
        'claim.intake_converged',
      ]);
      expect(events.rows[0]?.payload).toMatchObject({
        deceased_member_id: memberId,
        intake_channel: 'member_app',
        claimant_actor_id: null,
        to_state: 'intake_pending',
        from_state: null,
        actor: 'member',
      });

      // The claims projection: intake_pending, deceased = member, v1 null-claimant, member_app channel.
      const claimRow = await t.pool.query<{
        current_state: string; deceased_member_id: string; claimant_actor_id: string | null; intake_channels: string;
      }>(
        // `intake_channels::text` — pg has no built-in parser for a custom enum-array OID, so
        // select the canonical literal form and assert on it (the single-channel invariant).
        `SELECT current_state, deceased_member_id, claimant_actor_id, intake_channels::text FROM claims WHERE claim_case_id = $1`,
        [claimCaseId],
      );
      expect(claimRow.rows[0]).toMatchObject({
        current_state: 'intake_converged',
        deceased_member_id: memberId,
        claimant_actor_id: null,
      });
      expect(claimRow.rows[0]?.intake_channels).toBe('{member_app}');

      // ── THE LOAD-BEARING SEAM: the deceased's account now reads FROZEN (driven end-to-end). ──
      const overlay = await memberDomain.getMemberAccountOverlay(t.deps.db, ids.memberId(memberId), new Date());
      expect(overlay.accountFrozen).toBe(true);
      expect(overlay.frozenSince).not.toBeNull();

      // AC3 idempotency: a second intake returns the SAME claim, NO second event, NO second freeze.
      const retry = await inject(t, 'POST', '/api/v1/member/claims/intake', {
        payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
      });
      expect(retry.status).toBe(200);
      expect(retry.body.claimCaseId).toBe(claimCaseId);
      const again = await t.pool.query(
        `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.intake_initiated'`,
        [claimCaseId],
      );
      expect((again.rows[0] as { n: number }).n).toBe(1);
      expect(t.auditSink.ofType('member_claim.intake_idempotent').length).toBeGreaterThanOrEqual(1);

      // AC6 PII: no nominee name/mobile anywhere in the claim payload OR the audit context.
      const payloadStr = JSON.stringify(events.rows);
      expect(payloadStr).not.toContain('Asha');
      expect(payloadStr).not.toContain('9876543210');
      const auditStr = JSON.stringify(t.auditSink.events);
      expect(auditStr).not.toContain('Asha');
      expect(auditStr).not.toContain('9876543210');
      expect(t.auditSink.ofType('member_claim.intake_initiated').length).toBe(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC3 ordering: intake WITHOUT a verified handover OTP ⇒ 403 (unverified handover must not freeze)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      // No handover OTP verified → the step-up gate rejects.
      const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
        payload: { relationship: 'child' }, token: token(t, memberId, pariwarId),
      });
      expect(intake.status).toBe(403);
      // No claim, no freeze.
      const overlay = await memberDomain.getMemberAccountOverlay(t.deps.db, ids.memberId(memberId), new Date());
      expect(overlay.accountFrozen).toBe(false);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: a wrong handover OTP ⇒ verified:false (dignified) + a failure audit line', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: token(t, memberId, pariwarId) });
      const verify = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
        payload: { code: '000000' }, token: token(t, memberId, pariwarId),
      });
      expect(verify.body).toMatchObject({ verified: false });
      expect(t.auditSink.ofType('member_claim.handover_otp_failure').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC2 existence-defense: no nominee ⇒ sent:true with an empty mask (routes to helpline)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const send = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', {
        payload: {}, token: token(t, memberId, pariwarId),
      });
      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: true, nomineeMobileMasked: '' });
      // Nothing delivered.
      expect(t.stepUpDelivery.deliveries.length).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC2 secrets: the handover OTP is stored as a HASH only — the plaintext code is never persisted', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: token(t, memberId, pariwarId) });
      const code = t.stepUpDelivery.last?.code as string;
      // The OTP row is keyed on the synthetic `handover:<memberId>` pool key; it stores only the hash.
      const rows = await t.pool.query<{ otp_hash: string; mobile_blind_index: string }>(
        `SELECT otp_hash, mobile_blind_index FROM member_auth_otps WHERE mobile_blind_index = $1`,
        [`handover:${memberId}`],
      );
      expect(rows.rows.length).toBe(1);
      expect(rows.rows[0]?.otp_hash).not.toBe(code);
      expect(rows.rows[0]?.otp_hash).not.toContain(code);
    } finally {
      await teardown(t);
    }
  });

  it('AC2 anti-brute-force: the handover OTP is attempt-capped (burned server-side after the cap)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: token(t, memberId, pariwarId) });
      const realCode = t.stepUpDelivery.last?.code as string;
      // Exhaust the 5-attempt cap with wrong codes (the cap burns the OTP).
      for (let i = 0; i < 5; i++) {
        const wrong = String((Number(realCode) + i + 1) % 1_000_000).padStart(6, '0');
        const res = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
          payload: { code: wrong }, token: token(t, memberId, pariwarId),
        });
        expect(res.body).toMatchObject({ verified: false });
      }
      // Assert the burn directly against the DB row rather than firing a 6th HTTP verify call —
      // a 6th call would ALSO trip the review-added per-window verify-throttle (a SEPARATE
      // control from the attempt-cap this test targets; see the dedicated throttle test below).
      const rows = await t.pool.query<{ attempts: number; consumed_at: string | null }>(
        `SELECT attempts, consumed_at FROM member_auth_otps WHERE mobile_blind_index = $1`,
        [`handover:${memberId}`],
      );
      expect(rows.rows[0]?.attempts).toBeGreaterThanOrEqual(5);
      expect(rows.rows[0]?.consumed_at).not.toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('review fix: handover-otp/verify has its OWN throttle, independent of the send budget', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: token(t, memberId, pariwarId) });
      const realCode = t.stepUpDelivery.last?.code as string;

      // Burn the verify-throttle's window (otpPerPhoneMax = 5 calls) with wrong codes.
      for (let i = 0; i < 5; i++) {
        const wrong = String((Number(realCode) + i + 1) % 1_000_000).padStart(6, '0');
        const res = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
          payload: { code: wrong }, token: token(t, memberId, pariwarId),
        });
        expect(res.status).toBe(200);
      }
      // The 6th verify call in this window is throttled even with the REAL code — closing the
      // review-flagged gap where a resend used to reset the per-code attempt-cap counter,
      // allowing far more than otpPerPhoneMax total guesses per window.
      const sixth = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', {
        payload: { code: realCode }, token: token(t, memberId, pariwarId),
      });
      expect(sixth.status).toBe(429);
      expect(sixth.body).toMatchObject({ error: { code: 'rate_limit.exceeded' } });

      // The SEND budget is unaffected — an independent bucket, so a fresh send still succeeds.
      const freshSend = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', {
        payload: {}, token: token(t, memberId, pariwarId),
      });
      expect(freshSend.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('AC6: the member-session guard rejects an unauthenticated intake (401)', async () => {
    const t = await createTestApp();
    try {
      const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
        payload: { relationship: 'spouse' },
      });
      expect(intake.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('AC3 concurrency: two SIMULTANEOUS intake calls for the same death mint exactly ONE claim', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await establishHandoverTrust(t, memberId, pariwarId);

      // Fire both requests concurrently (not sequentially) so the tx-scoped advisory lock —
      // not just the route-level dedup read — is actually exercised: a double-tap or network
      // retry racing at the SAME instant is the scenario the lock exists to serialize.
      const [first, second] = await Promise.all([
        inject(t, 'POST', '/api/v1/member/claims/intake', {
          payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
        }),
        inject(t, 'POST', '/api/v1/member/claims/intake', {
          payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
        }),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.claimCaseId).toBe(second.body.claimCaseId);

      const claimCaseId = first.body.claimCaseId as string;
      const events = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.intake_initiated'`,
        [claimCaseId],
      );
      expect((events.rows[0] as { n: number }).n).toBe(1);

      // Exactly one freeze — the deceased's account overlay must not be affected by the race.
      const overlay = await memberDomain.getMemberAccountOverlay(t.deps.db, ids.memberId(memberId), new Date());
      expect(overlay.accountFrozen).toBe(true);
    } finally {
      await teardown(t);
    }
  });

  it('establishHandoverTrust helper drives a clean send→verify (smoke)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      await declareNominee(t, memberId, pariwarId, '9876543210');
      await establishHandoverTrust(t, memberId, pariwarId);
      const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
        payload: { relationship: 'sibling' }, token: token(t, memberId, pariwarId),
      });
      expect(intake.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });
});

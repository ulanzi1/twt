// Member mobile+OTP auth — integration suite (Story 3.2, AC-1 + AC-2). DB-gated
// (twt-test-pg :5433); skips without DATABASE_URL.
//
// Covers: the full login flow (request → verify → JWT session + 90d refresh + 2
// trusted devices), enumeration defense, per-phone rate-limit trip, wrong-OTP +
// attempt-cap, the 3rd-device-drops-oldest cap (R6), refresh rotation + reuse
// detection, the member step-up gate end-to-end (synthetic probe), the withdrawn
// block (Story 3.1 accessor), multi-Pariwar select (R2), the signup-continuation
// seam (R5), and the suspension cascade.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { revokeAllMemberSessions } from '../../src/modules/auth/member/member-auth.repo.js';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from './_setup.js';

type Json = Record<string, unknown>;

function randomMobile(): string {
  // Valid Indian mobile: first digit 6-9, then 9 digits.
  let n = String(6 + Math.floor(Math.random() * 4));
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

async function seedPassport(t: TestApp, pariwarId: string, name: string): Promise<void> {
  await t.pool.query(
    `INSERT INTO pariwar_passport
       (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, $2, $3, $4, $5, 'hi')
     ON CONFLICT (pariwar_id) DO NOTHING`,
    [pariwarId, name, name, `${name} Trust`, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
  );
}

async function seedMember(
  t: TestApp,
  opts: { mobile: string; pariwarId?: string; pariwarName?: string },
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = opts.pariwarId ?? randomUUID();
  const blindIndex = await mobileBlindIndex(opts.mobile, t.deps.encryption);
  const ciphertext = await encryptMobile(normalizeMobile(opts.mobile) as string, t.deps.encryption);
  await seedPassport(t, pariwarId, opts.pariwarName ?? 'Test Pariwar');
  await t.pool.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
    [memberId, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
       VALUES ($1, $2, $3, $4)`,
    [memberId, pariwarId, ciphertext, blindIndex],
  );
  return { memberId, pariwarId };
}

/** Append member events_log rows (PK-ordered) so getMemberStateAt replays a state. */
async function seedEvents(
  t: TestApp,
  memberId: string,
  pariwarId: string,
  events: { type: string; payload?: Json }[],
): Promise<void> {
  let v = 1;
  for (const e of events) {
    await t.pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
         VALUES ($1, $2, $3, $4, now() - interval '1 day', $5)`,
      [memberId, e.type, JSON.stringify(e.payload ?? {}), v++, pariwarId],
    );
  }
}

async function post(app: TestApp['app'], url: string, payload: Json, token?: string): Promise<{ status: number; body: Json }> {
  const res = await app.inject({
    method: 'POST',
    url,
    payload,
    headers: { origin: 'http://localhost:3001', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  let body: Json = {};
  try { body = res.json(); } catch { body = {}; }
  return { status: res.statusCode, body };
}

const BASE = '/api/v1/member/auth';

async function requestAndGetCode(t: TestApp, mobile: string): Promise<string> {
  const r = await post(t.app, `${BASE}/otp/request`, { mobile });
  expect(r.status).toBe(200);
  expect(r.body.sent).toBe(true);
  const code = t.stepUpDelivery.last?.code;
  expect(code).toBeDefined();
  return code as string;
}

describe.skipIf(!hasDatabase)('member mobile+OTP auth (AC-1/AC-2, DB)', () => {
  it('AC1: full login flow → JWT session + refresh + trusted device + audit', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);

      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'device-A', deviceLabel: 'Pixel' });
      expect(v.status).toBe(200);
      expect(v.body.sessionType).toBe('full_session');
      expect(typeof v.body.accessToken).toBe('string');
      expect(typeof v.body.refreshToken).toBe('string');
      expect(v.body.deviceId).toBe('device-A');

      // Audit: send + consume + device.bound emitted; no plaintext mobile in context.
      expect(t.auditSink.ofType('member_login.otp_send').length).toBe(1);
      expect(t.auditSink.ofType('member_login.otp_consume').length).toBe(1);
      expect(t.auditSink.ofType('member_device.bound').length).toBe(1);
      const sendCtx = t.auditSink.ofType('member_login.otp_send')[0]?.context as Json;
      expect(String(sendCtx['masked_mobile'])).toContain('·····');
      expect(JSON.stringify(t.auditSink.events)).not.toContain(normalizeMobile(mobile));
    } finally {
      await teardown(t);
    }
  });

  it('AC1: /otp/request is enumeration-safe (same shape for unknown mobile)', async () => {
    const t = await createTestApp();
    try {
      const r = await post(t.app, `${BASE}/otp/request`, { mobile: randomMobile() });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ sent: true, expiresInSeconds: expect.any(Number) });
    } finally {
      await teardown(t);
    }
  });

  it('R5: verifying with no member yields a signup_continuation token', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const code = await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'device-X' });
      expect(v.status).toBe(200);
      expect(v.body.sessionType).toBe('signup_continuation');
      expect(typeof v.body.signupContinuationToken).toBe('string');
    } finally {
      await teardown(t);
    }
  });

  it('AC1: wrong OTP is rejected (401) and audited', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: '000000', deviceId: 'd' });
      expect(v.status).toBe(401);
      expect(t.auditSink.ofType('member_login.failure').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC1: per-phone OTP send throttle trips at 5/15min → 429 + audit', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      for (let i = 0; i < 5; i++) {
        const r = await post(t.app, `${BASE}/otp/request`, { mobile });
        expect(r.status).toBe(200);
      }
      const sixth = await post(t.app, `${BASE}/otp/request`, { mobile });
      expect(sixth.status).toBe(429);
      expect(t.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC1/R6: binding a 3rd device drops the oldest + reports droppedDevice + audit', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      for (const dev of ['dev-1', 'dev-2']) {
        const code = await requestAndGetCode(t, mobile);
        const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: dev, deviceLabel: dev });
        expect(v.status).toBe(200);
        expect(v.body.droppedDevice).toBeUndefined();
      }
      // 3rd device → drops oldest (dev-1).
      const code = await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'dev-3', deviceLabel: 'dev-3' });
      expect(v.status).toBe(200);
      expect((v.body.droppedDevice as Json | undefined)?.deviceId).toBe('dev-1');
      expect(t.auditSink.ofType('member_device.dropped').length).toBe(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC1: refresh rotates the token; reusing the old token revokes the chain', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd1' });
      const refresh1 = login.body.refreshToken as string;

      const r1 = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh1 });
      expect(r1.status).toBe(200);
      const refresh2 = r1.body.refreshToken as string;
      expect(refresh2).not.toBe(refresh1);

      // Replaying the now-rotated refresh1 = reuse → revoke + 401.
      const reuse = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh1 });
      expect(reuse.status).toBe(401);
      expect(t.auditSink.ofType('member_session.reuse_revoke').length).toBe(1);

      // The chain (incl. refresh2) is now revoked.
      const after = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh2 });
      expect(after.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: member step-up gate — probe 403 without elevation, 200 after request→verify, wrong context still 403', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      const access = login.body.accessToken as string;

      // No elevation yet → gated probe 403.
      const probe1 = await post(t.app, `${BASE}/step-up/protected-probe`, {}, access);
      expect(probe1.status).toBe(403);
      expect((probe1.body.error as Json).code).toBe('auth.step_up_required');

      // Request + verify step-up for the probe's action_context ('member.demo').
      const sreq = await post(t.app, `${BASE}/step-up/request`, { actionContext: 'member.demo' }, access);
      expect(sreq.status).toBe(200);
      const stepCode = t.stepUpDelivery.last?.code as string;
      const sver = await post(t.app, `${BASE}/step-up/verify`, { otp: stepCode }, access);
      expect(sver.status).toBe(200);
      expect(sver.body.elevated).toBe(true);
      expect(t.auditSink.ofType('member_step_up.consume').length).toBe(1);
      // PR-Patch-2 (P20): the step-up consume audit carries the HMAC otp_audit_tag.
      const consumeCtx = t.auditSink.ofType('member_step_up.consume')[0]?.context as Json;
      expect(typeof consumeCtx['otp_audit_tag']).toBe('string');

      // Now the probe passes.
      const probe2 = await post(t.app, `${BASE}/step-up/protected-probe`, {}, access);
      expect(probe2.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: an elevation for action A does NOT satisfy a gate on action B', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      const access = login.body.accessToken as string;
      // Elevate for a DIFFERENT action than the probe's ('member.demo').
      await post(t.app, `${BASE}/step-up/request`, { actionContext: 'member.other' }, access);
      const stepCode = t.stepUpDelivery.last?.code as string;
      await post(t.app, `${BASE}/step-up/verify`, { otp: stepCode }, access);
      const probe = await post(t.app, `${BASE}/step-up/protected-probe`, {}, access);
      expect(probe.status).toBe(403);
    } finally {
      await teardown(t);
    }
  });

  it('blocks a withdrawn member (403, Story 3.1 accessor)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const { memberId, pariwarId } = await seedMember(t, { mobile });
      await seedEvents(t, memberId, pariwarId, [
        { type: 'member.kyc_completed' },
        { type: 'member.vyawastha_shulk_paid' },
        { type: 'member.lock_in_expired', payload: { kyc_verified: true } },
        { type: 'member.withdrawal_completed' },
      ]);
      const code = await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      expect(v.status).toBe(403);
      expect((v.body.error as Json).code).toBe('auth.member_withdrawn');
    } finally {
      await teardown(t);
    }
  });

  it('R2: multi-Pariwar membership → pariwar_select → select-pariwar issues the session', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const a = await seedMember(t, { mobile, pariwarName: 'Pariwar A' });
      const b = await seedMember(t, { mobile, pariwarName: 'Pariwar B' });
      const code = await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      expect(v.status).toBe(200);
      expect(v.body.sessionType).toBe('pariwar_select');
      const memberships = v.body.memberships as Json[];
      expect(memberships.length).toBe(2);
      const selectToken = v.body.selectToken as string;

      const chosen = await post(t.app, `${BASE}/otp/select-pariwar`, { selectToken, pariwarId: b.pariwarId });
      expect(chosen.status).toBe(200);
      expect(chosen.body.sessionType).toBe('full_session');
      expect(chosen.body.pariwarId).toBe(b.pariwarId);
      void a;
    } finally {
      await teardown(t);
    }
  });

  it('P25: logout revokes the device chain (refresh fails after)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd1' });
      const access = login.body.accessToken as string;
      const refresh = login.body.refreshToken as string;

      // Logout with the access token → revokes the device chain.
      const out = await t.app.inject({
        method: 'POST',
        url: `${BASE}/logout`,
        headers: { origin: 'http://localhost:3001', authorization: `Bearer ${access}` },
      });
      expect(out.statusCode).toBe(204);
      expect(t.auditSink.ofType('member_session.logout').length).toBe(1);

      // The refresh token from the revoked chain now fails.
      const after = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh });
      expect(after.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('§2.4: suspension cascade revokes all sessions (refresh fails after)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const { memberId } = await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      const refresh = login.body.refreshToken as string;

      const removed = await revokeAllMemberSessions(t.pool, memberId);
      expect(removed).toBeGreaterThanOrEqual(1);

      const after = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh });
      expect(after.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('PR-Patch-10: a pariwar_select token is single-use (replay → 401)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const a = await seedMember(t, { mobile, pariwarName: 'Pariwar A' });
      const b = await seedMember(t, { mobile, pariwarName: 'Pariwar B' });
      const code = await requestAndGetCode(t, mobile);
      const v = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      expect(v.body.sessionType).toBe('pariwar_select');
      const selectToken = v.body.selectToken as string;

      const first = await post(t.app, `${BASE}/otp/select-pariwar`, { selectToken, pariwarId: b.pariwarId });
      expect(first.status).toBe(200);
      // Replaying the SAME (now-consumed) token is rejected.
      const replay = await post(t.app, `${BASE}/otp/select-pariwar`, { selectToken, pariwarId: a.pariwarId });
      expect(replay.status).toBe(401);
      expect((replay.body.error as Json).code).toBe('auth.select_token_consumed');
    } finally {
      await teardown(t);
    }
  });

  it('PR-Patch-9: refresh is blocked + chain revoked after the member is withdrawn', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const { memberId, pariwarId } = await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd1' });
      const refresh1 = login.body.refreshToken as string;

      // While active, refresh works (and rotates).
      const ok = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh1 });
      expect(ok.status).toBe(200);
      const refresh2 = ok.body.refreshToken as string;

      // Withdraw the member (events replay to 'withdrawn').
      await seedEvents(t, memberId, pariwarId, [
        { type: 'member.kyc_completed' },
        { type: 'member.vyawastha_shulk_paid' },
        { type: 'member.lock_in_expired', payload: { kyc_verified: true } },
        { type: 'member.withdrawal_completed' },
      ]);

      const blocked = await post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh2 });
      expect(blocked.status).toBe(403);
      expect((blocked.body.error as Json).code).toBe('auth.member_withdrawn');
      expect(t.auditSink.ofType('member_session.revoked').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('PR-Patch-1: step-up OTP send is throttled per-member (6th → 429)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });
      const code = await requestAndGetCode(t, mobile);
      const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd' });
      const access = login.body.accessToken as string;

      for (let i = 0; i < 5; i++) {
        const r = await post(t.app, `${BASE}/step-up/request`, { actionContext: 'member.demo' }, access);
        expect(r.status).toBe(200);
      }
      const sixth = await post(t.app, `${BASE}/step-up/request`, { actionContext: 'member.demo' }, access);
      expect(sixth.status).toBe(429);
    } finally {
      await teardown(t);
    }
  });

  it('PR-Patch-11: concurrent refresh of the same token keeps the chain alive (no reuse revoke)', async () => {
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, { mobile });

      // ⚠ THE RACE MUST ACTUALLY HAPPEN, so establish it rather than assume it (2026-08-04).
      // `rotateRefresh` classifies by what it READ: a request whose SELECT already sees `rotated_at`
      // set is a sequential replay-after-rotation and CORRECTLY revokes the chain
      // (member-auth.service.ts:174-186). The benign-concurrent branch is only reached when BOTH
      // requests read BEFORE either commits its rotation. On a loaded CI runner `Promise.all` does
      // not guarantee that — request A can complete end-to-end before B's SELECT, at which point the
      // revoke is the RIGHT behaviour and the assertion below fails through no fault of the code.
      // Observed twice in Actions as `expected 1 to be +0` (runs 30876911014, 30893199390),
      // including under `--concurrency=1`.
      //
      // The sibling flag-flip-concurrency.spec.ts pins its race with a barrier because it owns both
      // connections; here the race is inside the HTTP handlers and `TestDepsOverrides` exposes no
      // pool seam to wrap, so instead: retry until a genuine overlap occurs, then assert strictly.
      // This does NOT weaken the test — a real regression (benign concurrency always revoking) never
      // produces an overlap and fails on the last attempt with the diagnostic below.
      const MAX_ATTEMPTS = 5;
      let raced: { winner: Awaited<ReturnType<typeof post>>; attempt: number } | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS && raced === null; attempt++) {
        const code = await requestAndGetCode(t, mobile);
        const login = await post(t.app, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'd1' });
        const refresh = login.body.refreshToken as string;
        const revokesBefore = t.auditSink.ofType('member_session.reuse_revoke').length;

        // Two refreshes of the SAME token fired together (double-tap on flaky network).
        const [a, b] = await Promise.all([
          post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh }),
          post(t.app, `${BASE}/token/refresh`, { refreshToken: refresh }),
        ]);
        // Exactly one winner either way — this half is scheduling-independent and always asserted.
        expect([a.status, b.status].sort()).toEqual([200, 401]);

        if (t.auditSink.ofType('member_session.reuse_revoke').length === revokesBefore) {
          // No revoke ⇒ the reads genuinely interleaved ⇒ this is the case under test.
          raced = { winner: a.status === 200 ? a : b, attempt };
        }
        // Otherwise the requests serialized; the revoke was correct. Re-login and try again.
      }

      expect(
        raced,
        `no genuine concurrent interleave in ${MAX_ATTEMPTS} attempts — every double-tap serialized, ` +
          `so the benign-concurrent branch was never exercised. If this persists, the PR-Patch-11 ` +
          `grace-window branch may be unreachable (a real regression), not merely a slow runner.`,
      ).not.toBeNull();

      // The benign concurrent loser must NOT have revoked the chain — the winner's freshly-issued
      // token still works, proving the chain survived the double-tap intact.
      const again = await post(t.app, `${BASE}/token/refresh`, {
        refreshToken: raced!.winner.body.refreshToken as string,
      });
      expect(again.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('PR-Patch-7/AC1: the per-IP ceiling trips independently of the per-phone budget', async () => {
    // The shared test env sets a huge per-IP ceiling (so inject() calls don't trip it);
    // override it LOW here (as rate-limit.spec.ts does) to exercise the per-IP layer.
    const t = await createTestApp({ env: { LOGIN_RATE_MAX: '5' } });
    try {
      // Distinct mobiles → each has its own per-phone bucket (never trips at 5), so the
      // only ceiling that can trip is the per-IP MEMBER_OTP_IP_RATE (loginRateMax/min).
      let tripped = false;
      for (let i = 0; i < t.deps.config.loginRateMax + 2; i++) {
        const r = await post(t.app, `${BASE}/otp/request`, { mobile: randomMobile() });
        if (r.status === 429) { tripped = true; break; }
      }
      expect(tripped).toBe(true);
    } finally {
      await teardown(t);
    }
  });
});

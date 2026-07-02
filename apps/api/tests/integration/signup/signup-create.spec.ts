// First-signup member creation E2E (live DB :5433) — Story 3.6a (Task 8; AC1, AC2, AC5).
//
// The headline tests of the story: the long-deferred reachability. Drives the real seam end-to-end
// through `app.inject`:
//   · /otp/request → /otp/verify (no member → signup_continuation token) → /signup/create →
//     asserts ONE member.signup_initiated event (from_state: null → pending-kyc), a members row in
//     pending-kyc, a member_identities row (encrypted mobile round-trips; mobile_blind_index
//     matches), and a FULL session (access + refresh) returned.
//   · jti single-use: a SECOND /signup/create with the same token → 409 signup_continuation_consumed;
//     a validly-signed token whose row is missing/expired → 401 signup_continuation_expired; a
//     mobile that does not match the token sub → 401 signup_mobile_mismatch.
//   · duplicate signup: a /signup/create for a mobile that already has a member in the default
//     Pariwar → 409 member_already_exists (no second member, no second event).
//   · E2E reachability (the headline): after /signup/create, drive /kyc (manual fallback) →
//     pending-fee with the SAME session token (proves the wizard chain works without re-seeding).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertSignupContinuation } from '../../../src/modules/auth/member/member-auth.repo.js';
import { signSignupContinuation } from '../../../src/modules/auth/member/tokens.js';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;

// The v1 default/launch Pariwar (D1) — the env override below points signup-create at it.
const DEFAULT_PARIWAR = '00000000-0000-0000-0000-0000000a6a01';
const SIGNUP_TTL_MS = 30 * 60 * 1000;
const BASE = '/api/v1/member/auth';

function randomMobile(): string {
  let n = String(6 + Math.floor(Math.random() * 4));
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

/** A test app whose default signup Pariwar is DEFAULT_PARIWAR. */
function signupApp(): Promise<TestApp> {
  return createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: DEFAULT_PARIWAR } });
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
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

/** Request + verify an OTP for a brand-new mobile → the signup_continuation token (R5). */
async function continuationViaOtp(t: TestApp, mobile: string): Promise<string> {
  const req = await inject(t, 'POST', `${BASE}/otp/request`, { payload: { mobile } });
  expect(req.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  expect(code).toBeDefined();
  const verify = await inject(t, 'POST', `${BASE}/otp/verify`, { payload: { mobile, otp: code, deviceId: 'device-A' } });
  expect(verify.status).toBe(200);
  expect(verify.body.sessionType).toBe('signup_continuation');
  return verify.body.signupContinuationToken as string;
}

/** Mint a signup_continuation token + its single-use row directly (for cases /otp/verify won't yield). */
async function mintContinuation(
  t: TestApp,
  mobile: string,
  opts: { insertRow?: boolean; ttlMs?: number } = {},
): Promise<string> {
  const blindIndex = (await mobileBlindIndex(mobile, t.deps.encryption)) as string;
  const jti = randomUUID();
  const ttlMs = opts.ttlMs ?? SIGNUP_TTL_MS;
  if (opts.insertRow !== false) {
    await insertSignupContinuation(t.deps.pool, {
      jti,
      mobileBlindIndex: blindIndex,
      expiresAt: new Date(Date.now() + ttlMs),
    });
  }
  return signSignupContinuation(t.app, { mobileBlindIndex: blindIndex, jti }, ttlMs);
}

async function eventTypes(t: TestApp, memberId: string): Promise<string[]> {
  const res = await t.pool.query<{ event_type: string }>(
    `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
    [memberId],
  );
  return res.rows.map((r) => r.event_type);
}

describe.skipIf(!hasDatabase)('First-signup member creation — E2E (:5433)', () => {
  it('AC1: OTP → continuation → /signup/create mints the member (pending-kyc) + identity + full session', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const token = await continuationViaOtp(t, mobile);

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A', deviceLabel: 'Pixel' },
        token,
      });
      expect(res.status).toBe(200);
      // Full session shape (identical to a returning single-membership login).
      expect(res.body.sessionType).toBe('full_session');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.pariwarId).toBe(DEFAULT_PARIWAR);
      const memberId = res.body.memberId as string;
      expect(memberId).toMatch(/^[0-9a-f-]{36}$/);

      // ONE member.signup_initiated event (from_state: null → pending-kyc), and ONLY that event.
      const events = await eventTypes(t, memberId);
      expect(events).toEqual(['member.signup_initiated']);
      const ev = await t.pool.query<{ payload: Json; actor_id: string | null; pariwar_id: string }>(
        `SELECT payload, actor_id, pariwar_id FROM events_log WHERE stream_id = $1`,
        [memberId],
      );
      expect(ev.rows[0]?.payload).toMatchObject({
        from_state: null,
        to_state: 'pending-kyc',
        trigger: 'signup',
        actor: 'member',
      });
      expect(ev.rows[0]?.actor_id).toBe(memberId);
      expect(ev.rows[0]?.pariwar_id).toBe(DEFAULT_PARIWAR);

      // members row in pending-kyc, in the default Pariwar.
      const m = await t.pool.query<{ state: string; pariwar_id: string }>(
        `SELECT state, pariwar_id FROM members WHERE member_id = $1`,
        [memberId],
      );
      expect(m.rows[0]?.state).toBe('pending-kyc');
      expect(m.rows[0]?.pariwar_id).toBe(DEFAULT_PARIWAR);

      // member_identities row: encrypted mobile round-trips; mobile_blind_index matches.
      const expectedBlind = await mobileBlindIndex(mobile, t.deps.encryption);
      const idRow = await t.pool.query<{ mobile_ciphertext: string; mobile_blind_index: string; pariwar_id: string }>(
        `SELECT mobile_ciphertext, mobile_blind_index, pariwar_id FROM member_identities WHERE member_id = $1`,
        [memberId],
      );
      expect(idRow.rows).toHaveLength(1);
      expect(idRow.rows[0]?.mobile_blind_index).toBe(expectedBlind);
      expect(idRow.rows[0]?.pariwar_id).toBe(DEFAULT_PARIWAR);
      // The ciphertext is an envelope (NOT plaintext); it never contains the raw digits.
      expect(idRow.rows[0]?.mobile_ciphertext).not.toContain(normalizeMobile(mobile) as string);

      // The creation was audited (masked-mobile only — never plaintext).
      expect(t.auditSink.ofType('member_signup.created').length).toBe(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain(normalizeMobile(mobile) as string);
    } finally {
      await teardown(t);
    }
  });

  it('AC1(c): a second /signup/create with the same token → 409 signup_continuation_consumed (one member, one event)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const token = await continuationViaOtp(t, mobile);

      const first = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(first.status).toBe(200);
      const memberId = first.body.memberId as string;

      const replay = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(replay.status).toBe(409);
      expect(String((replay.body.error as Json)?.code)).toBe('auth.signup_continuation_consumed');

      // Still exactly ONE member + ONE signup_initiated event for the mobile.
      const expectedBlind = await mobileBlindIndex(mobile, t.deps.encryption);
      const members = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM member_identities WHERE mobile_blind_index = $1`,
        [expectedBlind],
      );
      expect(members.rows[0]?.n).toBe(1);
      expect(await eventTypes(t, memberId)).toEqual(['member.signup_initiated']);
    } finally {
      await teardown(t);
    }
  });

  it('AC1(c): a validly-signed token whose row is missing/expired → 401 signup_continuation_expired', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      // Sign a fresh token but DO NOT insert the continuation row (jti unknown to the table).
      const token = await mintContinuation(t, mobile, { insertRow: false });

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(401);
      expect(String((res.body.error as Json)?.code)).toBe('auth.signup_continuation_expired');
    } finally {
      await teardown(t);
    }
  });

  it('AC1(a): an expired (or malformed) continuation token → 401', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      // Negative TTL → an already-expired JWT (the verify rejects it before the row is consulted).
      const token = await mintContinuation(t, mobile, { ttlMs: -1000 });

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('AC1(b): a mobile that does not match the token sub → 401 signup_mobile_mismatch', async () => {
    const t = await signupApp();
    try {
      const mobileA = randomMobile();
      let mobileB = randomMobile();
      while (mobileB === mobileA) mobileB = randomMobile();
      // The token is bound to mobileA's blind index; the body claims mobileB.
      const token = await mintContinuation(t, mobileA);

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile: mobileB, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(401);
      expect(String((res.body.error as Json)?.code)).toBe('auth.signup_mobile_mismatch');
    } finally {
      await teardown(t);
    }
  });

  it('AC2: a duplicate signup for a mobile already in the default Pariwar → 409 member_already_exists (no 2nd member)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const blindIndex = (await mobileBlindIndex(mobile, t.deps.encryption)) as string;
      const ciphertext = await encryptMobile(normalizeMobile(mobile) as string, t.deps.encryption);
      const existingMemberId = randomUUID();
      // Seed an existing member for this mobile IN THE DEFAULT PARIWAR (committed; superuser bypass).
      await t.pool.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
        [existingMemberId, DEFAULT_PARIWAR],
      );
      await t.pool.query(
        `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
           VALUES ($1, $2, $3, $4)`,
        [existingMemberId, DEFAULT_PARIWAR, ciphertext, blindIndex],
      );

      const token = await mintContinuation(t, mobile);
      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('auth.member_already_exists');

      // Still exactly ONE member_identities row for the mobile (no second member created).
      const n = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM member_identities WHERE mobile_blind_index = $1`,
        [blindIndex],
      );
      expect(n.rows[0]?.n).toBe(1);
    } finally {
      await teardown(t);
    }
  });

  // ── Story 3.10 — 12-month rejoin lock at signup ────────────────────────────────────────────────
  /** Seed a WITHDRAWN member for `mobile` in the default Pariwar, with a member_withdrawals row whose
   * rejoin window is future (locked) or past (deferred). Committed (superuser bypass). */
  async function seedWithdrawnMember(
    t: TestApp,
    mobile: string,
    opts: { rejoinInFuture: boolean; withdrawnAt?: Date },
  ): Promise<{ memberId: string; withdrawnAt: Date; rejoinPermittedAt: Date }> {
    const blindIndex = (await mobileBlindIndex(mobile, t.deps.encryption)) as string;
    const ciphertext = await encryptMobile(normalizeMobile(mobile) as string, t.deps.encryption);
    const memberId = randomUUID();
    const withdrawnAt = opts.withdrawnAt ?? new Date('2026-01-01T00:00:00Z');
    const rejoinPermittedAt = opts.rejoinInFuture
      ? new Date(Date.now() + 200 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    await t.pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'withdrawn', 5)`,
      [memberId, DEFAULT_PARIWAR],
    );
    await t.pool.query(
      `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
         VALUES ($1, $2, $3, $4)`,
      [memberId, DEFAULT_PARIWAR, ciphertext, blindIndex],
    );
    await t.pool.query(
      `INSERT INTO member_withdrawals (member_id, pariwar_id, withdrawn_at, rejoin_permitted_at)
         VALUES ($1, $2, $3, $4)`,
      [memberId, DEFAULT_PARIWAR, withdrawnAt.toISOString(), rejoinPermittedAt.toISOString()],
    );
    return { memberId, withdrawnAt, rejoinPermittedAt };
  }

  it('AC3: a withdrawn member INSIDE the 12-month window → 403 auth.rejoin_locked with the dates', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const { withdrawnAt, rejoinPermittedAt } = await seedWithdrawnMember(t, mobile, {
        rejoinInFuture: true,
      });
      const token = await mintContinuation(t, mobile);

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(403);
      const err = res.body.error as Json;
      expect(String(err?.code)).toBe('auth.rejoin_locked');
      // The dignified date copy fields are carried in details (AC3).
      const details = err?.details as Json;
      expect(details?.rejoin_permitted_at).toBe(rejoinPermittedAt.toISOString());
      expect(details?.withdrawn_at).toBe(withdrawnAt.toISOString());
      // Audited as a rejoin block (masked mobile only — never plaintext).
      expect(t.auditSink.ofType('member_withdrawal.rejoin_blocked').length).toBe(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain(normalizeMobile(mobile) as string);
    } finally {
      await teardown(t);
    }
  });

  it('AC3 (DEFERRED): a withdrawn member PAST the window → still 409 member_already_exists (post-window rejoin out of scope)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      await seedWithdrawnMember(t, mobile, { rejoinInFuture: false });
      const token = await mintContinuation(t, mobile);

      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      // The post-12-month reactivation path (arch §1.14 withdrawn → pending-fee) is DEFERRED for v1;
      // the current behavior is the unchanged 409 (documented in Completion Notes + deferred-work.md).
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('auth.member_already_exists');
    } finally {
      await teardown(t);
    }
  });

  it('503 when the default signup Pariwar is unconfigured (no token burned)', async () => {
    // No DEFAULT_SIGNUP_PARIWAR_ID override → defaultSignupPariwarId is null.
    const t = await createTestApp();
    try {
      const mobile = randomMobile();
      const token = await mintContinuation(t, mobile);
      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(res.status).toBe(503);
      expect(String((res.body.error as Json)?.code)).toBe('auth.signup_pariwar_unconfigured');
    } finally {
      await teardown(t);
    }
  });

  it('the request requires a continuation bearer (401 without a token)', async () => {
    const t = await signupApp();
    try {
      const res = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile: randomMobile(), deviceId: 'device-A' },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('E2E reachability (the headline): signup-create → KYC manual fallback → pending-fee with the SAME session', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const token = await continuationViaOtp(t, mobile);
      const created = await inject(t, 'POST', `${BASE}/signup/create`, {
        payload: { mobile, deviceId: 'device-A' },
        token,
      });
      expect(created.status).toBe(200);
      const sessionToken = created.body.accessToken as string;
      const memberId = created.body.memberId as string;

      // Drive the 3.3b KYC manual fallback with the SAME session — no re-seeding, no second OTP.
      const kyc = await inject(t, 'POST', '/api/v1/member/kyc/manual', {
        payload: { name: 'Asha Devi', dob: '1990-01-01' },
        token: sessionToken,
      });
      expect(kyc.status).toBe(200);
      expect(kyc.body.lifecycleState).toBe('pending-fee');

      // The member's stream now carries BOTH events, in order.
      expect(await eventTypes(t, memberId)).toEqual([
        'member.signup_initiated',
        'member.kyc_manual_fallback',
      ]);
    } finally {
      await teardown(t);
    }
  });
});

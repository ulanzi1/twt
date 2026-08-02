// Moderation → auth effects — E2E (Story 10.10, Task 4; AC6, AC7; :5433).
//
// The two auth-surface consequences of a moderation decision, both of which are easy to get
// backwards:
//
//   AC6 — the SUSPENSION CASCADE revokes every session, but does NOT block login.
//     `architecture.md:1433-1434` mandates the revocation and `member-auth.service.ts:198-201` named
//     `revokeAllMemberSessions` as the seam "which a later epic wires". This is that epic. But the
//     obvious next move — adding `suspended`/`terminated` to the `withdrawn || anonymized` login
//     block-list — is WRONG (Decision 6): `ux-design-specification.md:1890-1896` commits the member
//     to a dignified prose explanation with an appeal CTA reachable "from every failure state", and
//     a member who cannot log in can never read it. Enforcement is `is_valid`, not a locked door.
//     ⚠ A suspended member logging in LOOKS like a bug. It is the requirement. The pinning test
//     below exists to defend it from a future reviewer's well-meaning "fix".
//
//   AC7 — TERMINATION extends the FR-56 → FR-6 12-month rejoin lock, and RESTORE clears it.
//     A SECOND, independent lock alongside Story 3.10's withdrawal lock. No fake `member_withdrawals`
//     row is ever written: termination is not voluntary and must not masquerade as withdrawal. The
//     guard reads the CURRENT overlay standing, so a restore lifts the block — a guard keyed on the
//     mere EXISTENCE of a historical terminate row would lock a restored member out forever.
//
// Mirrors the shipped Story 3.10 rejoin-lock section of `signup/signup-create.spec.ts` (same
// DEFAULT_PARIWAR + `mintContinuation` shape). Own-committing seeds; fresh random mobile per test.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertSignupContinuation } from '../../../src/modules/auth/member/member-auth.repo.js';
import { signSignupContinuation } from '../../../src/modules/auth/member/tokens.js';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;

const DEFAULT_PARIWAR = '00000000-0000-0000-0000-0000000a6a01';
const SIGNUP_TTL_MS = 30 * 60 * 1000;
const BASE = '/api/v1/member/auth';

function randomMobile(): string {
  let n = String(6 + Math.floor(Math.random() * 4));
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function signupApp(): Promise<TestApp> {
  return createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: DEFAULT_PARIWAR } });
}

async function post(t: TestApp, url: string, payload: Json, token?: string): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method: 'POST',
    url,
    payload,
    headers: { origin: 'http://localhost:3001', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json() as Json;
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function mintContinuation(t: TestApp, mobile: string): Promise<string> {
  const blindIndex = (await mobileBlindIndex(mobile, t.deps.encryption)) as string;
  const jti = randomUUID();
  await insertSignupContinuation(t.deps.pool, {
    jti,
    mobileBlindIndex: blindIndex,
    expiresAt: new Date(Date.now() + SIGNUP_TTL_MS),
  });
  return signSignupContinuation(t.app, { mobileBlindIndex: blindIndex, jti }, SIGNUP_TTL_MS);
}

/** Seed an ACTIVE member with a login identity, in DEFAULT_PARIWAR. Committed. */
async function seedMember(t: TestApp, mobile: string, pariwarId = DEFAULT_PARIWAR): Promise<string> {
  const memberId = randomUUID();
  const blindIndex = await mobileBlindIndex(mobile, t.deps.encryption);
  const ciphertext = await encryptMobile(normalizeMobile(mobile) as string, t.deps.encryption);
  await t.pool.query(
    `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar', 'Test Pariwar', 'Test Trust', $2, 'hi')
     ON CONFLICT (pariwar_id) DO NOTHING`,
    [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
  );
  await t.pool.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
    [memberId, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
       VALUES ($1, $2, $3, $4)`,
    [memberId, pariwarId, ciphertext, blindIndex],
  );
  // The event chain that replays to `active` (the login gate reads getMemberStateAt, not the column).
  const events: Array<[string, Json]> = [
    ['member.signup_initiated', {}],
    ['member.kyc_completed', {}],
    ['member.vyawastha_shulk_paid', {}],
    ['member.lock_in_expired', { kyc_verified: true }],
  ];
  let v = 1;
  for (const [type, payload] of events) {
    await t.pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
         VALUES ($1, $2, $3, $4, now() - interval '1 day', $5)`,
      [memberId, type, JSON.stringify(payload), v++, pariwarId],
    );
    }
  return memberId;
}

/**
 * Append a moderation action the way the real write path does — the events_log event AND the
 * `member_moderation_actions` decision row. Written directly (not via the API) so this spec stays
 * focused on the AUTH consequences; the API write path itself is covered in `member-moderation.spec.ts`.
 */
async function recordModeration(
  t: TestApp,
  memberId: string,
  version: number,
  action: 'suspend' | 'terminate' | 'restore',
  reasonCode: string,
  opts: { rejoinPermittedAt?: Date | null; pariwarId?: string } = {},
): Promise<void> {
  const pariwarId = opts.pariwarId ?? DEFAULT_PARIWAR;
  const eventType =
    action === 'suspend'
      ? 'member.moderation.suspended'
      : action === 'terminate'
        ? 'member.moderation.terminated'
        : 'member.moderation.restored';
  await t.pool.query(
    `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
       VALUES ($1, $2, $3, $4, now() - interval '1 hour', $5)`,
    [memberId, eventType, JSON.stringify({ reason_code: reasonCode }), version, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO member_moderation_actions
       (pariwar_id, member_id, action, reason_code, rationale_ciphertext, actor_id, actor_display, rejoin_permitted_at, acted_at)
       VALUES ($1, $2, $3, $4, 'enc:v1:test', $5, 'A Trustee', $6, now() - interval '1 hour' + ($7 || ' seconds')::interval)`,
    [
      pariwarId,
      memberId,
      action,
      reasonCode,
      randomUUID(),
      action === 'terminate' ? (opts.rejoinPermittedAt ?? new Date(Date.now() + 300 * 24 * 60 * 60 * 1000)).toISOString() : null,
      String(version),
    ],
  );
}

describe.skipIf(!hasDatabase)('moderation → auth effects (live DB) (:5433)', () => {
  // ── AC6 — the cascade revokes sessions; login is NOT blocked ─────────────────────────────────

  it('AC6: the cascade deletes EVERY refresh chain + trusted-device binding for the member', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);

      // Log in on TWO devices — the cascade must clear both, not just the newest.
      for (const deviceId of ['device-A', 'device-B']) {
        const req = await post(t, `${BASE}/otp/request`, { mobile });
        expect(req.status).toBe(200);
        const code = t.stepUpDelivery.last?.code as string;
        const ver = await post(t, `${BASE}/otp/verify`, { mobile, otp: code, deviceId });
        expect(ver.status).toBe(200);
      }

      const liveTokens = async (): Promise<number> =>
        (
          await t.pool.query<{ n: number }>(
            `SELECT count(*)::int AS n FROM member_refresh_tokens WHERE member_id = $1 AND revoked_at IS NULL`,
            [memberId],
          )
        ).rows[0]?.n ?? 0;
      const devices = async (): Promise<number> =>
        (
          await t.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM member_trusted_devices WHERE member_id = $1`, [memberId])
        ).rows[0]?.n ?? 0;

      expect(await liveTokens()).toBeGreaterThan(0);
      expect(await devices()).toBeGreaterThan(0);

      // The cascade, exactly as the moderation handler invokes it.
      const { revokeAllMemberSessions } = await import('../../../src/modules/auth/member/member-auth.repo.js');
      await revokeAllMemberSessions(t.deps.pool, memberId);

      expect(await liveTokens()).toBe(0);
      // Trusted-device bindings go too — a DELIBERATE call, not an inherited default: leaving them
      // would silently consume the moderated member's max-2 device budget while forcing re-auth.
      expect(await devices()).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC6/Decision 6: a SUSPENDED member can STILL log in — this is the requirement, not a bug', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery');

      const req = await post(t, `${BASE}/otp/request`, { mobile });
      expect(req.status).toBe(200);
      const code = t.stepUpDelivery.last?.code as string;
      const ver = await post(t, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'device-after-suspend' });

      // ⚠ 200, deliberately. The member MUST be able to sign in to read the dignified explanation
      // and reach the appeal CTA. Their standing is enforced by `is_valid` (false — see the
      // validity-service integration spec), NOT by a locked door.
      expect(ver.status).toBe(200);
      expect(ver.body.sessionType).toBe('full_session');
    } finally {
      await teardown(t);
    }
  });

  it('AC6/Decision 6: a TERMINATED member can still log in too (the appeal path stays open)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery');
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery');

      const req = await post(t, `${BASE}/otp/request`, { mobile });
      expect(req.status).toBe(200);
      const code = t.stepUpDelivery.last?.code as string;
      const ver = await post(t, `${BASE}/otp/verify`, { mobile, otp: code, deviceId: 'device-after-terminate' });
      expect(ver.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  // ── AC7 — the 12-month rejoin lock, and the restore that clears it ──────────────────────────

  it('AC7: a TERMINATED identity inside its window → 403 auth.rejoin_locked carrying the dates', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);
      const rejoinPermittedAt = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery');
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery', { rejoinPermittedAt });

      const token = await mintContinuation(t, mobile);
      const res = await post(t, `${BASE}/signup/create`, { mobile, deviceId: 'device-A' }, token);

      expect(res.status).toBe(403);
      const err = res.body.error as Json;
      expect(String(err?.code)).toBe('auth.rejoin_locked');
      expect((err?.details as Json)?.rejoin_permitted_at).toBe(rejoinPermittedAt.toISOString());
      // The block is audited with the MASKED mobile only — never plaintext.
      expect(JSON.stringify(t.auditSink.events)).not.toContain(normalizeMobile(mobile) as string);

      // ⚠ No fake withdrawal row was written: termination is not voluntary and must not masquerade
      // as withdrawal (which would also corrupt the FR-6 withdrawal reporting).
      const w = await t.pool.query(`SELECT 1 FROM member_withdrawals WHERE member_id = $1`, [memberId]);
      expect(w.rowCount).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC7: a RESTORE clears the block — the guard reads the CURRENT standing, not the history', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery');
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery');
      // …then restored. The historical terminate row REMAINS (the table is append-only), so a guard
      // keyed on its mere existence would lock this member out forever. It must key on the LATEST
      // action instead.
      await recordModeration(t, memberId, 7, 'restore', 'moderation-error');

      const token = await mintContinuation(t, mobile);
      const res = await post(t, `${BASE}/signup/create`, { mobile, deviceId: 'device-A' }, token);

      // NOT 403 rejoin_locked. It is the ordinary duplicate-identity 409 — the member already exists
      // and was restored, so there is nothing to rejoin.
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('auth.member_already_exists');
    } finally {
      await teardown(t);
    }
  });

  it('AC7: a merely SUSPENDED identity is NOT rejoin-locked (only termination locks)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile);
      await recordModeration(t, memberId, 5, 'suspend', 'r7-contribution-discipline');

      const token = await mintContinuation(t, mobile);
      const res = await post(t, `${BASE}/signup/create`, { mobile, deviceId: 'device-A' }, token);
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('auth.member_already_exists');
    } finally {
      await teardown(t);
    }
  });

  it('AC7: an UNMODERATED member is completely unaffected (the Story 3.10 behaviour is intact)', async () => {
    const t = await signupApp();
    try {
      const mobile = randomMobile();
      await seedMember(t, mobile);
      const token = await mintContinuation(t, mobile);
      const res = await post(t, `${BASE}/signup/create`, { mobile, deviceId: 'device-A' }, token);
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('auth.member_already_exists');
    } finally {
      await teardown(t);
    }
  });
});

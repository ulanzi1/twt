// Story 3.13a — the member's "could not confirm" notice — E2E (live DB) (Task 2; AC3, DL5, N3).
//
// Drives GET /api/v1/member/identity-check-notice through `app.inject`:
//   · ⛔ session → 401 `auth.session_required`; an ADMIN's cookie session → 401 `auth.session_required` (the guard reads a
//     bearer JWT only, F16);
//   · a member session → 200 `{ notice: { reason } }` / `{ notice: null }`, the member being the SESSION's (two members,
//     one Pariwar);
//   · the body's key set is EXACTLY `notice` / `reason`, and ⛔ the note or the recorder's display name (both seeded with
//     markers) appears anywhere in the serialized body.
// Seeding commits (the projector + 3.13's writer, in the member's own fresh Pariwar) — assert membership, ⛔ counts.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as adminAuthService from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const URL = '/api/v1/member/identity-check-notice';
const NOTE_MARKER = `NOTE-MARKER-${randomUUID()}`;
const RECORDER_MARKER = `Recorder Marker ${randomUUID().slice(0, 8)}`;
type Json = Record<string, unknown>;
type Client = ReturnType<typeof makeClient>;

async function inScope<T>(t: TestApp, pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
  const s = await openScopeTx(t.deps, pariwarId);
  try {
    const out = await fn(s);
    await closeScopeTx(s, true);
    return out;
  } catch (err) {
    await closeScopeTx(s, false);
    throw err;
  }
}

/** A paid, typed-in member (`lock-in`, `self_declared`, unverified) — the projector's own arms + a KYC row. */
async function seedMember(t: TestApp, pariwarId: string): Promise<string> {
  const memberId = randomUUID();
  await inScope(t, pariwarId, async (s) => {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    const ev = (eventType: string, payload: Json) =>
      memberDomain.projectMemberState(s.client, { memberId: mid, pariwarId: pid, eventType: eventType as never, payload: payload as never, actorId: memberId });
    await ev('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
    await ev('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual_fallback', actor: 'member', reason: 'fixture' });
    await ev('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr: `UTR-${randomUUID()}`, amount_inr: 100 });
    await s.client.query(
      `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source, trustee_verified)
       VALUES ($1, $2, 'enc:v1:name', 'enc:v1:dob', 'self_declared', 'manual', false)`,
      [memberId, pariwarId],
    );
  });
  return memberId;
}

/** Record a `not_confirmed` through 3.13's writer — the note and the recorder carry the markers this file searches for. */
async function recordNotConfirmed(
  t: TestApp,
  pariwarId: string,
  memberId: string,
  reason: 'details_do_not_match' | 'member_not_reached',
): Promise<void> {
  await inScope(t, pariwarId, (s) =>
    memberDomain.recordIdentityValidation(s.client, {
      pariwarId: ids.pariwarId(pariwarId),
      memberId: ids.memberId(memberId),
      outcome: 'not_confirmed',
      evidenceKind: reason === 'member_not_reached' ? null : 'photo_id_in_person',
      documentKind: reason === 'member_not_reached' ? null : 'voter_id',
      notConfirmedReason: reason,
      noteCiphertext: `enc:v1:${NOTE_MARKER}`,
      actorId: randomUUID(),
      actorDisplay: RECORDER_MARKER,
    }),
  );
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function get(t: TestApp, opts: { token?: string } = {}): Promise<{ status: number; body: Json; raw: string }> {
  const res = await t.app.inject({
    method: 'GET',
    url: URL,
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body, raw: res.body };
}

/** Every key in a parsed JSON value, recursively (the key-set assertion). */
function allKeys(v: unknown): string[] {
  if (v === null || typeof v !== 'object') return [];
  return Object.entries(v as Json).flatMap(([k, x]) => [k, ...allKeys(x)]);
}

describe.skipIf(!hasDatabase)('Story 3.13a — GET /api/v1/member/identity-check-notice — E2E', { timeout: 30000 }, () => {
  it('⛔ session → 401 `auth.session_required`', async () => {
    const t = await createTestApp();
    try {
      const res = await get(t);
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).toContain('auth.session_required');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ a member session: `{ notice: { reason } }` for the SESSION\'s member; a neighbour in the same Pariwar with ⛔ row gets `{ notice: null }`', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const told = await seedMember(t, pariwarId);
      const neighbour = await seedMember(t, pariwarId);
      await recordNotConfirmed(t, pariwarId, told, 'details_do_not_match');

      const mine = await get(t, { token: token(t, told, pariwarId) });
      expect(mine.status).toBe(200);
      expect(mine.body).toEqual({ notice: { reason: 'details_do_not_match' } });

      const theirs = await get(t, { token: token(t, neighbour, pariwarId) });
      expect(theirs.status).toBe(200);
      expect(theirs.body).toEqual({ notice: null });

      // Each member sees their OWN reason once both have one.
      await recordNotConfirmed(t, pariwarId, neighbour, 'member_not_reached');
      expect((await get(t, { token: token(t, neighbour, pariwarId) })).body).toEqual({ notice: { reason: 'member_not_reached' } });
      expect((await get(t, { token: token(t, told, pariwarId) })).body).toEqual({ notice: { reason: 'details_do_not_match' } });
    } finally {
      await teardown(t);
    }
  });

  it('⭐ N3 — the key set is EXACTLY `notice` / `reason`; ⛔ the note, ⛔ the recorder\'s name anywhere in the body (with the control that both were stored)', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = await seedMember(t, pariwarId);
      await recordNotConfirmed(t, pariwarId, memberId, 'details_do_not_match');
      const stored = await inScope(t, pariwarId, (s) =>
        s.client.query<{ note_ciphertext: string; decided_by_display: string }>(
          `SELECT note_ciphertext, decided_by_display FROM member_identity_validations WHERE member_id = $1 AND superseded_at IS NULL`,
          [memberId],
        ),
      );
      expect(stored.rows[0]!.note_ciphertext).toContain(NOTE_MARKER); // the control
      expect(stored.rows[0]!.decided_by_display).toBe(RECORDER_MARKER);

      const res = await get(t, { token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(200);
      expect(allKeys(res.body).sort()).toEqual(['notice', 'reason']);
      expect(res.raw).not.toContain(NOTE_MARKER);
      expect(res.raw).not.toContain(RECORDER_MARKER);
      expect(res.raw).not.toMatch(/ciphertext|decided|validation|evidence|document/i);
    } finally {
      await teardown(t);
    }
  });

  it('a member staff later confirm ⇒ `{ notice: null }`', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = await seedMember(t, pariwarId);
      await recordNotConfirmed(t, pariwarId, memberId, 'details_do_not_match');
      expect((await get(t, { token: token(t, memberId, pariwarId) })).body).toEqual({ notice: { reason: 'details_do_not_match' } });
      await inScope(t, pariwarId, (s) =>
        memberDomain.recordIdentityValidation(s.client, {
          pariwarId: ids.pariwarId(pariwarId),
          memberId: ids.memberId(memberId),
          outcome: 'confirmed',
          evidenceKind: 'photo_id_in_person',
          documentKind: 'voter_id',
          notConfirmedReason: null,
          noteCiphertext: null,
          actorId: randomUUID(),
          actorDisplay: RECORDER_MARKER,
        }),
      );
      expect((await get(t, { token: token(t, memberId, pariwarId) })).body).toEqual({ notice: null });
    } finally {
      await teardown(t);
    }
  });

  it('an ADMIN\'s cookie session (⛔ bearer token) → 401 `auth.session_required` (the control: the same client is authenticated as an admin)', async () => {
    const fakeWebauthn = new FakeWebAuthnProvider();
    const t = await createTestApp({ webauthn: fakeWebauthn });
    let userId: string | undefined;
    try {
      // `authenticateAdmin` — copied from `device-token.spec.ts` (it is ⛔ exported there).
      const email = `admin-${randomUUID()}@example.test`;
      const password = 'CorrectHorseBatteryStaple9';
      userId = await adminAuthService.createAdminAccount(t.deps, { email, password });
      const client: Client = makeClient(t.app);
      fakeWebauthn.nextRegistration = {
        verified: true,
        credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
      };
      const credentialId = fakeWebauthn.nextRegistration.credential!.id;
      const enrollToken = adminAuthService.mintEnrollmentToken(t.deps, userId);
      await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enrollToken } });
      await client.inject({
        method: 'POST',
        url: '/api/v1/auth/passkey/register/verify',
        payload: { response: { id: 'browser' }, enrollmentToken: enrollToken },
      });
      fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
      await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
      await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
      const verify = await client.inject({
        method: 'POST',
        url: '/api/v1/auth/passkey/authenticate/verify',
        payload: { response: { id: credentialId } },
      });
      expect(verify.statusCode).toBe(200); // the control: an authenticated admin session

      const res = await client.inject({ method: 'GET', url: URL });
      expect(res.statusCode).toBe(401);
      expect(res.body).toContain('auth.session_required');
    } finally {
      if (userId !== undefined) {
        await t.pool.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = $1`, [userId]);
      }
      await teardown(t);
    }
  });
});

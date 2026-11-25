// Story 3.13 — staff check a typed-in identity in life, over HTTP (Task 3.5; AC8, AC8a, AC9, AC10, AC12; DL4–DL9, DL11,
// DL13). Real routes, real sessions, real Postgres (the story's own container), each test minting its own Pariwar.
//
// ⚠ ⛔ CI gate scans `apps/api/src/modules/identity-checks/` (F7b): the per-route chain tests below (⛔ session → 401, a
// member's session → refused, an admin without the key → 403) are the ONLY guard of the human-actor chain (Trap 12).
// ⚠ The role loops read `rbac.defaultRoleBundles` — ⛔ a hand list — so a 14th role is tested the day it is added.

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids, member as memberDomain, rbac } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { encryptIdentityCheckNote } from '../../../src/modules/identity-checks/crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

/** PLANTED values — each must appear in ⛔ audit line (the number above all — `-328`'s rule). */
const MOBILE_DIGITS = '9876501234';
const MOBILE = `+91${MOBILE_DIGITS}`;
const NAME = 'ZZ-PLANTED-TYPED-IN-NAME';
const DOB = '1971-03-09';
const NOTE = 'ZZ-PLANTED-STAFF-NOTE';

const ALLOWED_CHECK = ['district_admin', 'pariwar_admin', 'super_admin'];
const ALLOWED_REVEAL = ['district_admin', 'helpline_operator', 'pariwar_admin', 'super_admin', 'verifier'];

describe.skipIf(!hasDatabase)('Story 3.13 — the identity check surface — E2E', { timeout: 60000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(displayName: string | null): Promise<{ client: Client; userId: string }> {
    const email = `ic-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (displayName !== null) await service.setAdminDisplayName(deps, userId, displayName);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function actor(pariwarId: string, role: string, dim: string, value: string | null, name = 'Asha (Staff)') {
    const { client, userId } = await authenticate(name);
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dim, value],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  /** A paid, typed-in member (`lock-in`) with an encrypted KYC row and mobile, posted in `district` (or unposted). */
  async function seedMember(pariwarId: string, district: string | null, opts: { kyc?: 'typed_in' | 'digilocker' } = {}) {
    const memberId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const ev = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(s.client, { memberId: mid, pariwarId: pid, eventType: eventType as never, payload: payload as never, actorId: memberId });
      await ev('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      await ev('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual_fallback', actor: 'member', reason: 'fixture' });
      await ev('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr: `UTR-${randomUUID()}`, amount_inr: 100 });
      const [strength, source] = opts.kyc === 'digilocker' ? ['aadhaar_kyc', 'digilocker'] : ['self_declared', 'manual'];
      await s.client.query(
        `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source, trustee_verified)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [
          memberId,
          pariwarId,
          await encryption.encryptKycField(NAME, pariwarId, deps.encryption),
          await encryption.encryptKycField(DOB, pariwarId, deps.encryption),
          strength,
          source,
        ],
      );
      await s.client.query(
        `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`,
        [memberId, pariwarId, await encryption.encryptMobile(MOBILE, deps.encryption), `bi-${randomUUID()}`],
      );
      if (district !== null) {
        await s.client.query(
          `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now() - interval '1 minute')`,
          [memberId, pariwarId, district],
        );
      }
    });
    return memberId;
  }

  async function world() {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const memberId = await seedMember(pariwarId, district);
    return { pariwarId, district, memberId };
  }
  type World = Awaited<ReturnType<typeof world>>;

  /** File a claim for the member's death (the intake event only — a STANDING death report). */
  async function fileClaim(w: { pariwarId: string; memberId: string }) {
    await inScope(w.pariwarId, (s) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(randomUUID()),
        pariwarId: ids.pariwarId(w.pariwarId),
        deceasedMemberId: ids.memberId(w.memberId),
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated' as never,
        payload: { from_state: null, to_state: 'intake_pending', trigger: 'seed', actor: 'system', deceased_member_id: w.memberId, intake_channel: 'helpline', claimant_actor_id: null } as never,
        actorId: null,
      }),
    );
  }

  /** A grant at each role's own ceiling, so a role is refused for lacking the KEY — ⛔ for a scope it cannot hold. */
  const grantFor = (w: World, role: string, ceiling: string): [string, string | null] =>
    ceiling === 'district'
      ? ['district', w.district]
      : ceiling === 'global'
        ? ['global', null]
        : ceiling === 'pariwar'
          ? ['pariwar', w.pariwarId]
          : ceiling === 'block'
            ? ['block', `B-${randomUUID().slice(0, 8)}`]
            : ceiling === 'state'
              ? ['state', `S-${randomUUID().slice(0, 8)}`]
              : ['self', randomUUID()];

  const base = (w: { pariwarId: string }) => `/api/v1/p/${w.pariwarId}/admin/members`;
  const detailUrl = (w: { pariwarId: string }, memberId: string) => `${base(w)}/${memberId}/identity-check`;
  const revealUrl = (w: { pariwarId: string }, memberId: string) => `${base(w)}/${memberId}/identity-check/mobile`;
  const queueUrl = (w: { pariwarId: string }) => `${base(w)}/identity-checks`;
  const j = (r: { json(): unknown }) => r.json() as Json;
  const errCode = (b: Json) => String((b.error as Json | undefined)?.code);
  const audits = (type: string, memberId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.member_id === memberId.toLowerCase());
  const confirmBody = { outcome: 'confirmed', evidence_kind: 'photo_id_in_person', document_kind: 'voter_id' };
  const post = (client: Client, url: string, payload: Json, key: string | null = randomUUID()) =>
    client.inject({ method: 'POST', url, payload, headers: key === null ? {} : { 'idempotency-key': key } });
  const validations = async (memberId: string) =>
    (await td.pool.query(`SELECT * FROM member_identity_validations WHERE member_id = $1`, [memberId])).rows;
  const flag = async (memberId: string) =>
    (await td.pool.query<{ trustee_verified: boolean }>(`SELECT trustee_verified FROM member_kyc_profiles WHERE member_id = $1`, [memberId])).rows[0]!
      .trustee_verified;

  // ── AC12 — the human-actor chain on EVERY route ──────────────────────────────────────────────────────────────────

  it.each([
    ['GET', 'queue'],
    ['GET', 'detail'],
    ['POST', 'record'],
    ['POST', 'reveal'],
  ] as const)('⭐ AC12 — %s %s: ⛔ session → 401; a member session → refused; an admin without the key → 403', async (method, route) => {
    const w = await world();
    const url = route === 'queue' ? queueUrl(w) : route === 'reveal' ? revealUrl(w, w.memberId) : detailUrl(w, w.memberId);
    const payload = route === 'record' ? confirmBody : undefined;
    const headers = route === 'record' ? { 'idempotency-key': randomUUID() } : {};
    const anon = await app.inject({ method, url, ...(payload ? { payload } : {}), headers });
    expect(anon.statusCode, anon.body).toBe(401);
    const memberToken = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
    const asMember = await app.inject({ method, url, ...(payload ? { payload } : {}), headers: { ...headers, authorization: `Bearer ${memberToken}` } });
    expect([401, 403], asMember.body).toContain(asMember.statusCode);
    const { client } = await actor(w.pariwarId, 'auditor', 'pariwar', w.pariwarId);
    const keyless = await client.inject({ method, url, ...(payload ? { payload } : {}), headers });
    expect(keyless.statusCode, keyless.body).toBe(403);
    // The control: a District Admin of the member's district passes the same chain.
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const allowed = await da.inject({ method, url, ...(payload ? { payload } : {}), headers: route === 'record' ? { 'idempotency-key': randomUUID() } : {} });
    expect([200, 201], allowed.body).toContain(allowed.statusCode);
    expect(await validations(w.memberId)).toHaveLength(route === 'record' ? 1 : 0);
  });

  // ── AC8 — who checks (`member.validate_identity`) ───────────────────────────────────────────────────────────────

  it('⭐ AC8 — the check key over ALL 13 bundles (the detail): DA of the district, PA, super admin → 200; every other role → 403', async () => {
    const w = await world();
    expect(rbac.defaultRoleBundles).toHaveLength(13);
    const seen: string[] = [];
    for (const b of rbac.defaultRoleBundles) {
      const [dim, value] = grantFor(w, b.role, b.scopeCeiling);
      const { client } = await actor(w.pariwarId, b.role, dim, value);
      const res = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
      if (res.statusCode === 200) seen.push(b.role);
      else expect(res.statusCode, `${b.role}: ${res.body}`).toBe(403);
    }
    expect(seen.sort()).toEqual(ALLOWED_CHECK);
  });

  it('⭐ AC8 — a DA of ANOTHER district → 403; a DA for an UNPOSTED member → 403; a PA for the unposted member → 200 + 201 (the F7a trap)', async () => {
    const w = await world();
    const unposted = await seedMember(w.pariwarId, null);
    const { client: other } = await actor(w.pariwarId, 'district_admin', 'district', `D-other-${randomUUID().slice(0, 6)}`);
    expect((await other.inject({ method: 'GET', url: detailUrl(w, w.memberId) })).statusCode).toBe(403);
    expect((await post(other, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(403);
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    expect((await da.inject({ method: 'GET', url: detailUrl(w, unposted) })).statusCode).toBe(403);
    expect((await post(da, detailUrl(w, unposted), confirmBody)).statusCode).toBe(403);
    expect(await validations(unposted)).toHaveLength(0);
    const { client: pa } = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    expect((await pa.inject({ method: 'GET', url: detailUrl(w, unposted) })).statusCode).toBe(200);
    const rec = await post(pa, detailUrl(w, unposted), confirmBody);
    expect(rec.statusCode, rec.body).toBe(201);
    expect(await flag(unposted)).toBe(true);
  });

  it('⭐ AC8 — the queue: a DA sees only their district; a PA sees every district AND the unposted member; ⛔ a client district is read', async () => {
    const w = await world();
    const other = await seedMember(w.pariwarId, `D-two-${randomUUID().slice(0, 6)}`);
    const unposted = await seedMember(w.pariwarId, null);
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const daRes = await da.inject({ method: 'GET', url: queueUrl(w) });
    expect(daRes.statusCode, daRes.body).toBe(200);
    expect((j(daRes).entries as Json[]).map((e) => e.member_id)).toEqual([w.memberId]);
    expect(j(daRes).can_check).toBe(true);
    const { client: pa } = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    const paRes = await pa.inject({ method: 'GET', url: queueUrl(w) });
    expect(new Set((j(paRes).entries as Json[]).map((e) => e.member_id))).toEqual(new Set([w.memberId, other, unposted]));
    // ⛔ A client-supplied district or dimension: the querystring is strict.
    expect((await da.inject({ method: 'GET', url: `${queueUrl(w)}?district=${encodeURIComponent('D-two')}` })).statusCode).toBe(400);
    expect((await da.inject({ method: 'GET', url: `${queueUrl(w)}?dimension=pariwar` })).statusCode).toBe(400);
  });

  // ── AC8a — the number reveal (`member.reveal_mobile_for_identity_check`) ──────────────────────────────────────────

  it('⭐ AC8a — the reveal over ALL 13 bundles: DA, PA, verifier, helpline, super admin → 200 with the FULL number; every other (incl. field_worker, block_admin) → 403', async () => {
    const w = await world();
    const seen: string[] = [];
    for (const b of rbac.defaultRoleBundles) {
      const [dim, value] = grantFor(w, b.role, b.scopeCeiling);
      const { client } = await actor(w.pariwarId, b.role, dim, value);
      const res = await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
      if (res.statusCode === 200) {
        seen.push(b.role);
        expect(j(res)).toEqual({ mobile: MOBILE });
      } else expect(res.statusCode, `${b.role}: ${res.body}`).toBe(403);
    }
    expect(seen.sort()).toEqual(ALLOWED_REVEAL);
  });

  it('⭐ AC8a — EVERY press writes ONE `member_mobile_shown` line with ⛔ the number; two presses ⇒ two lines; a verifier of another district → 403', async () => {
    const w = await world();
    const { client, userId } = await actor(w.pariwarId, 'verifier', 'district', w.district);
    expect((await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(200);
    expect((await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(200);
    const lines = audits('admin_identity_check.member_mobile_shown', w.memberId);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ actorId: userId });
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain(MOBILE_DIGITS);
    expect(serialized).not.toContain(MOBILE_DIGITS.slice(-4) + '"');
    const { client: away } = await actor(w.pariwarId, 'verifier', 'district', `D-away-${randomUUID().slice(0, 6)}`);
    expect((await away.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(403);
  });

  it('⭐ AC8a — "for this purpose": refused 409 `not_eligible` once confirmed (the control beside it), and `death_reported` under a standing report', async () => {
    const w = await world();
    const control = await seedMember(w.pariwarId, w.district);
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    expect((await post(da, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(201);
    const after = await da.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
    expect(after.statusCode).toBe(409);
    expect(errCode(j(after))).toBe('identity_validation.not_eligible');
    expect((await da.inject({ method: 'POST', url: revealUrl(w, control) })).statusCode).toBe(200);
    await fileClaim({ pariwarId: w.pariwarId, memberId: control });
    const dead = await da.inject({ method: 'POST', url: revealUrl(w, control) });
    expect(dead.statusCode).toBe(409);
    expect(errCode(j(dead))).toBe('identity_validation.death_reported');
    expect(audits('admin_identity_check.member_mobile_reveal_rejected', control).map((e) => (e.context as Json).reason)).toEqual(['death_reported']);
    expect(JSON.stringify(td.auditSink.ofType('admin_identity_check.member_mobile_reveal_rejected'))).not.toContain(MOBILE_DIGITS);
  });

  it('AC8a — a verifier / helpline operator reads the QUEUE (can_check false) but ⛔ the detail and ⛔ the record (403)', async () => {
    const w = await world();
    for (const [role, dim, value] of [
      ['verifier', 'district', w.district],
      ['helpline_operator', 'pariwar', w.pariwarId],
    ] as const) {
      const { client } = await actor(w.pariwarId, role, dim, value);
      const q = await client.inject({ method: 'GET', url: queueUrl(w) });
      expect(q.statusCode, q.body).toBe(200);
      expect(j(q)).toMatchObject({ can_check: false });
      expect((j(q).entries as Json[]).map((e) => e.member_id)).toContain(w.memberId);
      expect((await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) })).statusCode).toBe(403);
      expect((await post(client, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(403);
    }
    expect(await validations(w.memberId)).toHaveLength(0);
  });

  // ── AC9 — the request vocabulary ──────────────────────────────────────────────────────────────────────────────

  it.each([
    ['a number-like field', { ...confirmBody, document_number: '1234 5678 9012' }],
    ['an Aadhaar number', { ...confirmBody, aadhaar_number: '123456789012' }],
    ['an upload', { ...confirmBody, image: 'data:image/jpeg;base64,AAAA' }],
    ['`not_confirmed` without a note', { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached' }],
    ['`confirmed` with a reason', { ...confirmBody, not_confirmed_reason: 'details_do_not_match' }],
    ['an unknown document kind', { ...confirmBody, document_kind: 'ration_card' }],
  ])('⭐ AC9 — %s → 400, ⛔ row', async (_label, payload) => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const res = await post(client, detailUrl(w, w.memberId), payload as Json);
    expect(res.statusCode, res.body).toBe(400);
    expect(await validations(w.memberId)).toHaveLength(0);
  });

  // ── AC10 — the detail and the queue ──────────────────────────────────────────────────────────────────────────

  it('⭐ AC10 — the detail: the decrypted identity, the MASKED mobile (⛔ full number), ONLY the live note, ONE audit line with ⛔ identity in it', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Asha (District Admin)');
    const first = await post(client, detailUrl(w, w.memberId), { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', note: 'ZZ-OLD-NOTE' });
    expect(first.statusCode, first.body).toBe(201);
    expect(
      (await post(client, detailUrl(w, w.memberId), { outcome: 'not_confirmed', not_confirmed_reason: 'no_document_shown', evidence_kind: 'photo_id_video_call', note: NOTE })).statusCode,
    ).toBe(201);
    const res = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(res.statusCode, res.body).toBe(200);
    const d = j(res);
    expect(d).toMatchObject({
      member_id: w.memberId,
      state: 'lock-in',
      kyc_source: 'manual',
      identity: { name: NAME, date_of_birth: DOB, photo: null },
      masked_mobile: `+91·····${MOBILE_DIGITS.slice(-4)}`,
      posting: { district: w.district, workplace_name: null },
      death_reported: false,
      eligible: true,
    });
    expect(res.body).not.toContain(MOBILE_DIGITS);
    expect(res.body).not.toContain('ZZ-OLD-NOTE');
    const history = d.history as Json[];
    expect(history.map((h) => [h.not_confirmed_reason, h.live, h.note, h.decided_by_display])).toEqual([
      ['no_document_shown', true, NOTE, 'Asha (District Admin)'],
      ['member_not_reached', false, null, 'Asha (District Admin)'],
    ]);
    const reads = audits('admin_identity_check.identity_check_read', w.memberId);
    expect(reads).toHaveLength(1);
    const line = JSON.stringify(reads);
    for (const planted of [NAME, DOB, NOTE, MOBILE_DIGITS]) expect(line).not.toContain(planted);
    expect(JSON.stringify(td.auditSink.ofType('admin_identity_check.identity_check_recorded'))).not.toContain(NOTE);
  });

  it('AC10 — the queue over HTTP: ⛔ name / mobile; the `limit` is bounded (> 200 → 400); a confirmed member leaves it', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const q = await client.inject({ method: 'GET', url: queueUrl(w) });
    expect(q.statusCode).toBe(200);
    expect(q.body).not.toContain(NAME);
    expect(q.body).not.toContain(MOBILE_DIGITS.slice(-4));
    expect((j(q).entries as Json[])[0]).toMatchObject({ member_id: w.memberId, short_member_id: w.memberId.replace(/-/g, '').slice(0, 8), state: 'lock-in', district: w.district, latest_outcome: null, attempt_count: 0 });
    expect((await client.inject({ method: 'GET', url: `${queueUrl(w)}?limit=201` })).statusCode).toBe(400);
    expect((await post(client, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(201);
    expect((j(await client.inject({ method: 'GET', url: queueUrl(w) })).entries as Json[])).toEqual([]);
  });

  // ── The record — idempotency, refusals, death lock ───────────────────────────────────────────────────────────

  it('⭐ AC12 — POST without `Idempotency-Key` → 400; a replay returns the recorded result (200) and writes nothing new', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const none = await post(client, detailUrl(w, w.memberId), confirmBody, null);
    expect(none.statusCode).toBe(400);
    expect(errCode(j(none))).toBe('identity_validation.idempotency_key_required');
    const key = randomUUID();
    const first = await post(client, detailUrl(w, w.memberId), confirmBody, key);
    expect(first.statusCode, first.body).toBe(201);
    const replay = await post(client, detailUrl(w, w.memberId), confirmBody, key);
    expect(replay.statusCode).toBe(200);
    expect(j(replay)).toEqual(j(first));
    expect(await validations(w.memberId)).toHaveLength(1);
    expect(audits('admin_identity_check.identity_check_recorded', w.memberId)).toHaveLength(1);
    expect(j(first)).toMatchObject({ outcome: 'confirmed', state: 'lock-in', kyc_completed: false, superseded_validation_id: null });
  });

  it('DL4 / DL5 — a DigiLocker member → 409 `not_eligible`; a standing death report → 409 `death_reported` and the detail hides the form; each audited `_rejected`', async () => {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const digi = await seedMember(pariwarId, district, { kyc: 'digilocker' });
    const dead = await seedMember(pariwarId, district);
    await fileClaim({ pariwarId, memberId: dead });
    const { client } = await actor(pariwarId, 'district_admin', 'district', district);
    const a = await post(client, detailUrl({ pariwarId }, digi), confirmBody);
    expect(a.statusCode).toBe(409);
    expect(errCode(j(a))).toBe('identity_validation.not_eligible');
    const b = await post(client, detailUrl({ pariwarId }, dead), confirmBody);
    expect(b.statusCode).toBe(409);
    expect(errCode(j(b))).toBe('identity_validation.death_reported');
    expect(await flag(dead)).toBe(false);
    expect(await validations(dead)).toHaveLength(0);
    const d = j(await client.inject({ method: 'GET', url: detailUrl({ pariwarId }, dead) }));
    expect(d).toMatchObject({ death_reported: true, eligible: false });
    expect(audits('admin_identity_check.identity_check_rejected', dead).map((e) => (e.context as Json).reason)).toEqual(['death_reported']);
    expect(audits('admin_identity_check.identity_check_rejected', digi).map((e) => (e.context as Json).reason)).toEqual(['not_eligible']);
  });

  it('the stored note is the encrypted one (⛔ plaintext in the row)', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    expect((await post(client, detailUrl(w, w.memberId), { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', note: NOTE })).statusCode).toBe(201);
    const [row] = await validations(w.memberId);
    expect(String(row.note_ciphertext)).toMatch(/^enc:/);
    expect(String(row.note_ciphertext)).not.toContain(NOTE);
    // The helper round-trips (the control that the stored form is this module's).
    expect(await encryptIdentityCheckNote('x', w.pariwarId, deps.encryption)).toMatch(/^enc:/);
  });
});

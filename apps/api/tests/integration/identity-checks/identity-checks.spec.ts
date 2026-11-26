// Story 3.13 — staff check a typed-in identity in life, over HTTP (Task 3.5; AC8, AC8a, AC9, AC10, AC12; DL4–DL9, DL11,
// DL13). Real routes, real sessions, real Postgres (the story's own container), each test minting its own Pariwar.
//
// ⚠ ⛔ CI gate scans `apps/api/src/modules/identity-checks/` (F7b): the per-route chain tests below (⛔ session → 401, a
// member's session → refused, an admin without the key → 403) are the ONLY guard of the human-actor chain (Trap 12).
// ⚠ The role loops read `rbac.defaultRoleBundles` — ⛔ a hand list — so a 14th role is tested the day it is added.

import { createHash, randomUUID } from 'node:crypto';

import { canonicalJsonStringify, claim, encryption, ids, member as memberDomain, rbac } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { authEventToAuditInput, createAuditLogSink } from '../../../src/audit/audit-log-sink.js';
import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import * as mobileIndex from '../../../src/modules/auth/shared/mobile-index.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { encryptIdentityCheckNote } from '../../../src/modules/identity-checks/crypto.js';
import * as kycCrypto from '../../../src/modules/kyc/kyc-crypto.js';
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

  async function actor(pariwarId: string, role: string, dim: string, value: string | null, name: string | null = 'Asha (Staff)') {
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
  /**
   * ⭐ The PERSISTED line of a DISCLOSURE (`-504` item 2): the detail's view and the number's showing are written through
   * `writeAuditEntry` (awaited), ⛔ the in-memory sink — so these are asserted off `audit_log_entries` (append-only; member ids
   * are random per test, so a row is keyed by action + the member's locator).
   */
  const persisted = async (type: string, memberId: string) =>
    (
      await td.pool.query(
        `SELECT actor_id, pariwar_id, action, resource_locator, request_payload_hash, response_status
           FROM audit_log_entries WHERE action = $1 AND resource_locator = $2 ORDER BY seq`,
        [type, `member:${memberId.toLowerCase()}`],
      )
    ).rows as Json[];
  /**
   * ⭐ The persisted row has NO context column — only `request_payload_hash` = sha256 of the canonical JSON of the context. A
   * "no number / name / note in the line" proof therefore pins the hash of the EXACT expected context: put the number into the
   * context and the hash changes (a `JSON.stringify(row)` search could never fail — it only ever held a hash).
   */
  const contextHash = (context: Json) => createHash('sha256').update(canonicalJsonStringify(context), 'utf8').digest('hex');
  /** Make the audit store refuse for one call — the failure injection for "a disclosure is audited FIRST". */
  async function withAuditWriteFailing<T>(fn: () => Promise<T>): Promise<T> {
    const real = deps.servicePool;
    (deps as { servicePool: unknown }).servicePool = {
      query: () => Promise.reject(new Error('audit store down')),
      connect: () => Promise.reject(new Error('audit store down')),
    };
    try {
      return await fn();
    } finally {
      (deps as { servicePool: unknown }).servicePool = real;
    }
  }
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
    const headers: Record<string, string> = route === 'record' ? { 'idempotency-key': randomUUID() } : {};
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
    const allowed = await da.inject({ method, url, ...(payload ? { payload } : {}), headers: route === 'record' ? { 'idempotency-key': randomUUID() } : ({} as Record<string, string>) });
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

  it('⭐ AC8a — EVERY press writes ONE PERSISTED `member_mobile_shown` row with ⛔ the number; two presses ⇒ two rows; a verifier of another district → 403', async () => {
    const w = await world();
    const { client, userId } = await actor(w.pariwarId, 'verifier', 'district', w.district);
    expect((await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(200);
    expect((await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(200);
    const lines = await persisted('admin_identity_check.member_mobile_shown', w.memberId);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ actor_id: userId, pariwar_id: w.pariwarId, response_status: 200 });
    // The context is EXACTLY the member id — ⛔ the number, ⛔ a name (the hash of that one-key object, twice).
    expect(lines.map((l) => l.request_payload_hash)).toEqual(Array(2).fill(contextHash({ member_id: w.memberId.toLowerCase() })));
    const { client: away } = await actor(w.pariwarId, 'verifier', 'district', `D-away-${randomUUID().slice(0, 6)}`);
    expect((await away.inject({ method: 'POST', url: revealUrl(w, w.memberId) })).statusCode).toBe(403);
  });

  it('⭐ AC8a / `-504` item 4 — "for this purpose": refused 409 `not_eligible` once confirmed (the control beside it), and under a standing death report the SAME generic refusal — ⛔ the claim named — while the audit line keeps `death_reported`', async () => {
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
    // ⭐ The reveal key's holders (DA, PA, verifier, helpline) are ⛔ told a claim stands: the same code AND words as `after`.
    expect(errCode(j(dead))).toBe('identity_validation.not_eligible');
    expect((j(dead).error as Json).message).toBe((j(after).error as Json).message);
    expect(dead.body).not.toMatch(/died|death|claim/i);
    expect(audits('admin_identity_check.member_mobile_reveal_rejected', control).map((e) => (e.context as Json).reason)).toEqual(['death_reported']);
    expect(JSON.stringify(td.auditSink.ofType('admin_identity_check.member_mobile_reveal_rejected'))).not.toContain(MOBILE_DIGITS);
  });

  it('⭐ R3-P26 / `-505` item 2 — the real reason of a refused number press is RECOVERED from the PERSISTED row: the captured line is written through the PRODUCTION sink (`createAuditLogSink`) into `audit_log_entries`, its `request_payload_hash` is read back, and hashing each candidate over the CLOSED reason list finds `death_reported` — and only it', async () => {
    const w = await world();
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    await fileClaim(w);
    const dead = await da.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
    expect(errCode(j(dead))).toBe('identity_validation.not_eligible');
    const [line] = audits('admin_identity_check.member_mobile_reveal_rejected', w.memberId);
    expect(line).toBeDefined();
    // The integration harness wires the in-memory `CapturingAuditSink` as `deps.auditSink` (so best-effort lines never reach
    // the DB in tests). The captured event is therefore emitted AGAIN through the REAL production sink — `createAuditLogSink`
    // on the test service pool, the same factory `createDeps` (`src/deps.ts`) wires in production — so the row below is written by the
    // production path (`authEventToAuditInput` → `writeAuditEntry`), ⛔ a re-implementation.
    const type = 'admin_identity_check.member_mobile_reveal_rejected';
    expect(await persisted(type, w.memberId)).toHaveLength(0); // the control: nothing persisted before the real sink runs
    createAuditLogSink(deps.servicePool).emit(line!);
    // The sink is fire-and-forget (`void writeAuditEntry(…)`): wait for ITS row to land.
    const rows = await vi.waitFor(
      async () => {
        const r = await persisted(type, w.memberId);
        expect(r).toHaveLength(1);
        return r;
      },
      { timeout: 10_000, interval: 50 },
    );
    const row = rows[0]!;
    expect(row).not.toHaveProperty('context'); // ⛔ context column: the hash is all there is
    expect(row.resource_locator).toBe(`member:${w.memberId.toLowerCase()}`);
    const stored = String(row.request_payload_hash);
    // The stored hash is the one the sink's own mapping computes for this line (the persisted value, ⛔ just our arithmetic).
    expect(stored).toBe(authEventToAuditInput(line!).requestPayloadHash);
    const CLOSED = ['not_found', 'invalid_shape', 'not_eligible', 'death_reported', 'concurrent', 'mobile_unavailable', 'mobile_unreadable', 'audit_unavailable'];
    const recovered = CLOSED.filter((reason) => contextHash({ member_id: w.memberId.toLowerCase(), reason }) === stored);
    expect(recovered).toEqual(['death_reported']);
    // The control: the generic answer's reason does NOT match — the stored hash tells the two apart.
    expect(contextHash({ member_id: w.memberId.toLowerCase(), reason: 'not_eligible' })).not.toBe(stored);
  });

  it('⭐ R3-P12 — a number that EXISTS but cannot be decrypted is a typed 503 `identity_validation.mobile_unreadable` with ⛔ a number and ⛔ a "shown" row; the rejected line\'s reason is the bounded `mobile_unreadable`; the control press is a 200', async () => {
    const w = await world();
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const spy = vi.spyOn(mobileIndex, 'decryptMobile').mockRejectedValueOnce(Object.assign(new Error('kms down'), { name: 'KmsError' }));
    try {
      const res = await da.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
      expect(res.statusCode, res.body).toBe(503);
      expect(errCode(j(res))).toBe('identity_validation.mobile_unreadable');
      expect(res.body).not.toContain(MOBILE_DIGITS);
      expect(res.body).not.toContain('kms down');
    } finally {
      spy.mockRestore();
    }
    expect(await persisted('admin_identity_check.member_mobile_shown', w.memberId)).toHaveLength(0);
    expect(audits('admin_identity_check.member_mobile_reveal_rejected', w.memberId).map((e) => (e.context as Json).reason)).toEqual(['mobile_unreadable']);
    const ok = await da.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(j(ok).mobile).toBe(MOBILE);
  });

  it('⭐ R3-P11 — the QUEUE is `no-store` too (staff-only member metadata), for a District Admin and for a Pariwar Admin', async () => {
    const w = await world();
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const full = await da.inject({ method: 'GET', url: queueUrl(w) });
    expect(full.statusCode, full.body).toBe(200);
    expect((j(full).entries as Json[]).map((e) => e.member_id)).toContain(w.memberId);
    expect(full.headers['cache-control']).toBe('no-store');
    const { client: pa } = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    expect((await pa.inject({ method: 'GET', url: queueUrl(w) })).headers['cache-control']).toBe('no-store');
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
    const reads = await persisted('admin_identity_check.identity_check_read', w.memberId);
    expect(reads).toHaveLength(1);
    // The context is EXACTLY these ids and flags — ⛔ the name, ⛔ the date of birth, ⛔ the note, ⛔ the number.
    expect(reads[0]!.request_payload_hash).toBe(
      contextHash({
        member_id: w.memberId.toLowerCase(),
        identity_opened: true,
        live_validation_id: history.find((h) => h.live)!.validation_id,
        eligible: true,
        death_reported: false,
      }),
    );
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

  // ── Code review 2026-11-26 — the patches (`-504`) ───────────────────────────────────────────────────────────────

  it('⭐ P1 / item 2 — a disclosure is audited FIRST: when its audit line cannot be written the detail and the number are a 503 with ⛔ the data and ⛔ a row; the control passes, persists ONE row each, and is `no-store`', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const failedDetail = await withAuditWriteFailing(() => client.inject({ method: 'GET', url: detailUrl(w, w.memberId) }));
    expect(failedDetail.statusCode, failedDetail.body).toBe(503);
    expect(errCode(j(failedDetail))).toBe('identity_validation.audit_unavailable');
    for (const planted of [NAME, DOB, MOBILE_DIGITS]) expect(failedDetail.body).not.toContain(planted);
    const failedReveal = await withAuditWriteFailing(() => client.inject({ method: 'POST', url: revealUrl(w, w.memberId) }));
    expect(failedReveal.statusCode, failedReveal.body).toBe(503);
    expect(errCode(j(failedReveal))).toBe('identity_validation.audit_unavailable');
    expect(failedReveal.body).not.toContain(MOBILE_DIGITS);
    expect(await persisted('admin_identity_check.identity_check_read', w.memberId)).toHaveLength(0);
    expect(await persisted('admin_identity_check.member_mobile_shown', w.memberId)).toHaveLength(0);
    // The control: the same two calls once the store is back — each writes ONE persisted row, and neither is cacheable (P12).
    const detail = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.headers['cache-control']).toBe('no-store');
    const reveal = await client.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
    expect(reveal.statusCode, reveal.body).toBe(200);
    expect(reveal.headers['cache-control']).toBe('no-store');
    expect(await persisted('admin_identity_check.identity_check_read', w.memberId)).toHaveLength(1);
    expect(await persisted('admin_identity_check.member_mobile_shown', w.memberId)).toHaveLength(1);
  });

  it('⭐ P2 / item 1 — a typed-in field that exists but cannot be decrypted fails the detail (503 `identity_unreadable`, ⛔ a blank beside a live form, ⛔ audit row); the control with the field restored reads', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const foreign = (value: string) => encryption.encryptKycField(value, randomUUID(), deps.encryption); // AAD of another Pariwar ⇒ ⛔ readable here
    const good = (await td.pool.query<{ name_ciphertext: string; photo_ciphertext: string | null }>(`SELECT name_ciphertext, photo_ciphertext FROM member_kyc_profiles WHERE member_id = $1`, [w.memberId])).rows[0]!;
    await td.pool.query(`UPDATE member_kyc_profiles SET name_ciphertext = $2 WHERE member_id = $1`, [w.memberId, await foreign(NAME)]);
    const noName = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(noName.statusCode, noName.body).toBe(503);
    expect(errCode(j(noName))).toBe('identity_validation.identity_unreadable');
    expect(noName.body).not.toContain(DOB);
    // A PHOTO that exists must decrypt too (a missing photo is fine — the control below has none).
    await td.pool.query(`UPDATE member_kyc_profiles SET name_ciphertext = $2, photo_ciphertext = $3 WHERE member_id = $1`, [w.memberId, good.name_ciphertext, await foreign('data:image/png;base64,AAAA')]);
    const noPhoto = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(noPhoto.statusCode, noPhoto.body).toBe(503);
    expect(errCode(j(noPhoto))).toBe('identity_validation.identity_unreadable');
    expect(await persisted('admin_identity_check.identity_check_read', w.memberId)).toHaveLength(0);
    await td.pool.query(`UPDATE member_kyc_profiles SET photo_ciphertext = $2 WHERE member_id = $1`, [w.memberId, good.photo_ciphertext]);
    const ok = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(j(ok).identity).toMatchObject({ name: NAME, date_of_birth: DOB });
  });

  it('⭐ P3 / item 1 — the identity is shown ONLY while a check is awaited: a confirmed, a DigiLocker and a death-claimed member get `identity: null` (history, posting and the death banner stay); the control shows it', async () => {
    const w = await world();
    const digi = await seedMember(w.pariwarId, w.district, { kyc: 'digilocker' });
    const dead = await seedMember(w.pariwarId, w.district);
    await fileClaim({ pariwarId: w.pariwarId, memberId: dead });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const control = await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) });
    expect(j(control).identity).toMatchObject({ name: NAME, date_of_birth: DOB });
    expect(j(control).masked_mobile).toBe(`+91·····${MOBILE_DIGITS.slice(-4)}`);
    expect(j(control).eligible).toBe(true);
    expect((await post(client, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(201);
    for (const [label, id] of [['confirmed', w.memberId], ['DigiLocker', digi], ['death-claimed', dead]] as const) {
      const res = await client.inject({ method: 'GET', url: detailUrl(w, id) });
      expect(res.statusCode, `${label}: ${res.body}`).toBe(200);
      expect(j(res).identity, label).toBeNull();
      expect(j(res).eligible, label).toBe(false);
      expect(res.body, label).not.toContain(NAME);
      expect(res.body, label).not.toContain(DOB);
      expect(j(res).posting, label).toMatchObject({ district: w.district });
      expect(j(res).masked_mobile, label).toBeNull();
    }
    expect(j(await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) })).history as Json[]).toHaveLength(1);
    expect(j(await client.inject({ method: 'GET', url: detailUrl(w, dead) })).death_reported).toBe(true);
  });

  it('⭐ D2 / item 3 — the queue leaves out a member with a standing death claim (the claim module\'s one predicate); the control member stays', async () => {
    const w = await world();
    const dead = await seedMember(w.pariwarId, w.district);
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const { client: pa } = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    const ids_ = async (c: Client) => new Set((j(await c.inject({ method: 'GET', url: queueUrl(w) })).entries as Json[]).map((e) => e.member_id));
    expect(await ids_(da)).toEqual(new Set([w.memberId, dead]));
    await fileClaim({ pariwarId: w.pariwarId, memberId: dead });
    expect(await ids_(da)).toEqual(new Set([w.memberId]));
    expect(await ids_(pa)).toEqual(new Set([w.memberId]));
  });

  it('⭐ P4 / P11 — `has_more` is true exactly while another page follows; an `offset` beyond the ceiling is a 400, ⛔ a 500', async () => {
    const w = await world();
    const second = await seedMember(w.pariwarId, w.district);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const page = async (qs: string) => j(await client.inject({ method: 'GET', url: `${queueUrl(w)}?${qs}` }));
    const one = await page('limit=1');
    expect(one.entries as Json[]).toHaveLength(1);
    expect(one.has_more).toBe(true);
    const two = await page('limit=1&offset=1');
    expect(two.entries as Json[]).toHaveLength(1);
    expect(two.has_more).toBe(false);
    expect(new Set([...(one.entries as Json[]), ...(two.entries as Json[])].map((e) => e.member_id))).toEqual(new Set([w.memberId, second]));
    expect((await page('limit=2')).has_more).toBe(false);
    expect((await page('')).has_more).toBe(false);
    for (const offset of ['1000001', '99999999999999999999']) {
      const res = await client.inject({ method: 'GET', url: `${queueUrl(w)}?offset=${offset}` });
      expect(res.statusCode, res.body).toBe(400);
    }
  });

  it('⭐ P6 / family 2 — two staff acts racing on ONE member over two connections: two confirmations ⇒ exactly one 201 and one 409, ONE live row, ONE marker event; two not-confirmed ⇒ BOTH land (the intake key serialises them: two 201s, two rows, two markers) and the older is superseded by the newer; one key twice ⇒ one write', async () => {
    const markers = async (memberId: string) =>
      Number(((await td.pool.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'member.identity_validation_recorded'`, [memberId])).rows[0] as { n: number }).n);
    const live = async (memberId: string) => (await validations(memberId)).filter((r) => r.superseded_at === null);

    const w = await world();
    const { client: a } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Asha (First)');
    const { client: b } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Bela (Second)');
    const [x, y] = await Promise.all([post(a, detailUrl(w, w.memberId), confirmBody), post(b, detailUrl(w, w.memberId), confirmBody)]);
    expect([x.statusCode, y.statusCode].sort(), `${x.body} ${y.body}`).toEqual([201, 409]);
    expect(errCode(j(x.statusCode === 409 ? x : y))).toMatch(/^identity_validation\.(not_eligible|concurrent)$/);
    expect(await validations(w.memberId)).toHaveLength(1);
    expect(await live(w.memberId)).toHaveLength(1);
    expect(await flag(w.memberId)).toBe(true);
    expect(await markers(w.memberId)).toBe(1);

    const w2 = await world();
    const { client: c } = await actor(w2.pariwarId, 'district_admin', 'district', w2.district);
    const { client: d } = await actor(w2.pariwarId, 'district_admin', 'district', w2.district);
    const nc = { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', note: 'ZZ race' };
    const [p, q] = await Promise.all([post(c, detailUrl(w2, w2.memberId), nc), post(d, detailUrl(w2, w2.memberId), nc)]);
    // ⭐ (code review R3-P21) BOTH land: the claim-intake key taken FIRST serialises the two acts, so neither can lose a race —
    // ⛔ "201 or 409, at least one landed", which passed if one always failed.
    expect([p.statusCode, q.statusCode], `${p.body} ${q.body}`).toEqual([201, 201]);
    const rows = await validations(w2.memberId);
    expect(rows).toHaveLength(2);
    const liveRows = rows.filter((r) => r.superseded_at === null);
    expect(liveRows).toHaveLength(1);
    const older = rows.find((r) => r.superseded_at !== null)!;
    // The superseded act is the one the live act replaced (its id is the live act's `superseded_validation_id` in the response).
    const supersededIds = [j(p), j(q)].map((b) => b.superseded_validation_id).filter((v) => v !== null);
    expect(supersededIds).toEqual([older.validation_id]);
    expect([j(p).validation_id, j(q).validation_id]).toContain(liveRows[0]!.validation_id);
    expect(await markers(w2.memberId)).toBe(2);

    const w3 = await world();
    const { client: e } = await actor(w3.pariwarId, 'district_admin', 'district', w3.district);
    const key = randomUUID();
    const [r1, r2] = await Promise.all([post(e, detailUrl(w3, w3.memberId), confirmBody, key), post(e, detailUrl(w3, w3.memberId), confirmBody, key)]);
    expect([r1.statusCode, r2.statusCode].filter((s) => s === 201), `${r1.body} ${r2.body}`).toHaveLength(1);
    expect([200, 409]).toContain([r1.statusCode, r2.statusCode].find((s) => s !== 201));
    expect(await validations(w3.memberId)).toHaveLength(1);
    expect(await markers(w3.memberId)).toBe(1);
  });

  it('⭐ P7 / families 3 + 12(a) — a member of ANOTHER Pariwar named under this Pariwar\'s path is ⛔ reachable: detail, record and reveal deny (PA → 404, DA → 403), ⛔ row, ⛔ flag, ⛔ identity in a body; the control member is reached', async () => {
    const w = await world();
    const foreign = await world();
    const { client: pa } = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    const { client: da } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    for (const [label, c, status] of [['PA', pa, 404], ['DA', da, 403]] as const) {
      const bodies = [
        await c.inject({ method: 'GET', url: detailUrl(w, foreign.memberId) }),
        await post(c, detailUrl(w, foreign.memberId), confirmBody),
        await c.inject({ method: 'POST', url: revealUrl(w, foreign.memberId) }),
      ];
      for (const res of bodies) {
        expect(res.statusCode, `${label}: ${res.body}`).toBe(status);
        for (const planted of [NAME, DOB, MOBILE_DIGITS]) expect(res.body).not.toContain(planted);
      }
    }
    expect(await validations(foreign.memberId)).toHaveLength(0);
    expect(await flag(foreign.memberId)).toBe(false);
    expect((await pa.inject({ method: 'GET', url: detailUrl(w, w.memberId) })).statusCode).toBe(200);
  });

  it('⭐ P7 — a TERMINATED member is refused at every route (detail shows no identity, record 409, number 409) and is not in the queue; the control member is', async () => {
    const w = await world();
    const terminated = await seedMember(w.pariwarId, w.district);
    await inScope(w.pariwarId, async (s) => {
      const v = Number(((await s.client.query(`SELECT max(event_version)::int AS v FROM events_log WHERE stream_id = $1`, [terminated])).rows[0] as { v: number }).v);
      for (const [i, type] of ['member.moderation.suspended', 'member.moderation.terminated'].entries()) {
        await s.client.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id) VALUES ($1, $2, '{}'::jsonb, $3, NULL, $4)`,
          [terminated, type, v + 1 + i, w.pariwarId],
        );
      }
    });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const detail = j(await client.inject({ method: 'GET', url: detailUrl(w, terminated) }));
    expect(detail).toMatchObject({ identity: null, eligible: false });
    const rec = await post(client, detailUrl(w, terminated), confirmBody);
    expect(rec.statusCode, rec.body).toBe(409);
    expect(errCode(j(rec))).toBe('identity_validation.not_eligible');
    const rev = await client.inject({ method: 'POST', url: revealUrl(w, terminated) });
    expect(rev.statusCode, rev.body).toBe(409);
    expect(errCode(j(rev))).toBe('identity_validation.not_eligible');
    expect(await validations(terminated)).toHaveLength(0);
    expect(await flag(terminated)).toBe(false);
    const q = new Set((j(await client.inject({ method: 'GET', url: queueUrl(w) })).entries as Json[]).map((e) => e.member_id));
    expect(q).toEqual(new Set([w.memberId]));
  });

  it('⭐ P8 / family 8 — a staff user with NO display name cannot record (409 `admin.display_name_missing`, ⛔ row, ⛔ flag); the control with a name records', async () => {
    const w = await world();
    const { client: nameless } = await actor(w.pariwarId, 'district_admin', 'district', w.district, null);
    const res = await post(nameless, detailUrl(w, w.memberId), confirmBody);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('admin.display_name_missing');
    expect(await validations(w.memberId)).toHaveLength(0);
    expect(await flag(w.memberId)).toBe(false);
    const { client: named } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    expect((await post(named, detailUrl(w, w.memberId), confirmBody)).statusCode).toBe(201);
  });

  it('⭐ P8 / AC10 (the spy) — the QUEUE decrypts nothing (⛔ a Tier-1 decrypt on a list); the detail does (the control that the spy sees decrypts)', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const decryptKyc = vi.spyOn(kycCrypto, 'decryptKycField');
    const decryptMobile = vi.spyOn(mobileIndex, 'decryptMobile');
    try {
      expect((await client.inject({ method: 'GET', url: queueUrl(w) })).statusCode).toBe(200);
      expect(decryptKyc).not.toHaveBeenCalled();
      expect(decryptMobile).not.toHaveBeenCalled();
      expect((await client.inject({ method: 'GET', url: detailUrl(w, w.memberId) })).statusCode).toBe(200);
      expect(decryptKyc).toHaveBeenCalled();
      expect(decryptMobile).toHaveBeenCalled();
    } finally {
      decryptKyc.mockRestore();
      decryptMobile.mockRestore();
    }
  });

  // ── Code review round 2 (adversarial review of the patches) ────────────────────────────────────────────────────

  const intakeKey = (pariwarId: string, memberId: string) =>
    BigInt(`0x${createHash('sha256').update(`${pariwarId.toLowerCase()}:${memberId.toLowerCase()}`).digest('hex').slice(0, 15)}`);
  async function waitUntilBlockedOn(key: bigint): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const r = await td.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND classid = $1::bigint::oid AND objid = $2::bigint::oid`,
        [(key >> 32n).toString(), (key & 0xffffffffn).toString()],
      );
      if (r.rows[0]!.n > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('the record never blocked on the claim-intake key — is the lock still taken FIRST?');
  }

  it('⭐ P6 / family 2 — a record that ARRIVES while a death claim is being filed waits on the claim-intake key and decides AFTER the claim lands: `death_reported`, ⛔ row, ⛔ flag; the control without a claim in flight records', async () => {
    const w = await world();
    const control = await seedMember(w.pariwarId, w.district);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const holder = await td.pool.connect();
    try {
      // "The claim intake": holds the key for (pariwar, member) while the claim is filed.
      await holder.query('BEGIN');
      await holder.query('SELECT pg_advisory_xact_lock($1)', [intakeKey(w.pariwarId, w.memberId).toString()]);
      const pending = post(client, detailUrl(w, w.memberId), confirmBody); // must BLOCK on the held key
      await waitUntilBlockedOn(intakeKey(w.pariwarId, w.memberId));
      await fileClaim({ pariwarId: w.pariwarId, memberId: w.memberId }); // lands (committed, another connection) while the record waits
      await holder.query('COMMIT');
      const res = await pending;
      expect(res.statusCode, res.body).toBe(409);
      expect(errCode(j(res))).toBe('identity_validation.death_reported');
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }
    expect(await validations(w.memberId)).toHaveLength(0);
    expect(await flag(w.memberId)).toBe(false);
    expect((await post(client, detailUrl(w, control), confirmBody)).statusCode).toBe(201);
  });

  it('⭐ P6 — the number press takes the SAME key FIRST: held by a claim being filed, it waits and then answers the generic refusal; ⛔ number, ⛔ `member_mobile_shown` row', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const holder = await td.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT pg_advisory_xact_lock($1)', [intakeKey(w.pariwarId, w.memberId).toString()]);
      const pending = client.inject({ method: 'POST', url: revealUrl(w, w.memberId) });
      await waitUntilBlockedOn(intakeKey(w.pariwarId, w.memberId));
      await fileClaim({ pariwarId: w.pariwarId, memberId: w.memberId });
      await holder.query('COMMIT');
      const res = await pending;
      expect(res.statusCode, res.body).toBe(409);
      expect(errCode(j(res))).toBe('identity_validation.not_eligible');
      expect(res.body).not.toContain(MOBILE_DIGITS);
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }
    expect(await persisted('admin_identity_check.member_mobile_shown', w.memberId)).toHaveLength(0);
  });

  it('⭐ P13 / families 2 + 8 — a `recordResult` failure AFTER the commit still writes the audit line and answers 201 (⛔ a 500, ⛔ a lost line); the idempotency key stays `pending`, so a replay is ⛔ re-run', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    expect(deps.pool).toBe(td.pool);
    // Fail ONLY the keyed store's "completed" write — every other statement (the act's own transaction) runs for real.
    const realConnect = td.pool.connect.bind(td.pool) as (cb?: unknown) => Promise<import('pg').PoolClient>;
    const wrapped = async (): Promise<import('pg').PoolClient> => {
      const c = await realConnect();
      const realQuery = c.query.bind(c) as (...a: unknown[]) => unknown;
      (c as unknown as { query: (...a: unknown[]) => unknown }).query = (...args: unknown[]) => {
        const text = typeof args[0] === 'string' ? args[0] : '';
        if (text.includes("SET status = 'completed'")) return Promise.reject(new Error('store down'));
        return realQuery(...args);
      };
      const realRelease = c.release.bind(c);
      c.release = ((err?: Error | boolean) => {
        (c as unknown as { query: unknown }).query = realQuery;
        return realRelease(err);
      }) as typeof c.release;
      return c;
    };
    const spy = vi.spyOn(td.pool, 'connect').mockImplementation(((cb?: unknown) => (typeof cb === 'function' ? realConnect(cb) : wrapped())) as never);
    const key = randomUUID();
    td.auditSink.events.length = 0;
    try {
      const res = await post(client, detailUrl(w, w.memberId), confirmBody, key);
      expect(res.statusCode, res.body).toBe(201);
    } finally {
      spy.mockRestore();
    }
    // The store write DID fail (the key is still `pending` — ⛔ a vacuous pass); the act and its audit line landed.
    const keyRow = await td.pool.query<{ status: string }>('SELECT status FROM idempotency_keys WHERE key LIKE $1', [`%:${key}`]);
    expect(keyRow.rows.map((r) => r.status)).toEqual(['pending']);
    expect(await validations(w.memberId)).toHaveLength(1);
    expect(await flag(w.memberId)).toBe(true);
    expect(audits('admin_identity_check.identity_check_recorded', w.memberId)).toHaveLength(1);
  });

  it('⭐ P7 / family 1 — an ANONYMIZED member is refused at every route (detail: ⛔ identity, ⛔ number; record and number 409) and is not in the queue; two acts pin `attempt_count` 2', async () => {
    const w = await world();
    const anon = await seedMember(w.pariwarId, w.district);
    await inScope(w.pariwarId, async (s) => {
      await memberDomain.projectMemberState(s.client, {
        memberId: ids.memberId(anon),
        pariwarId: ids.pariwarId(w.pariwarId),
        eventType: 'member.rtbf_anonymized' as never,
        payload: { from_state: 'lock-in', to_state: 'anonymized', trigger: 'rtbf_anonymized', actor: 'system' } as never,
        actorId: null,
      });
    });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const detail = j(await client.inject({ method: 'GET', url: detailUrl(w, anon) }));
    expect(detail).toMatchObject({ state: 'anonymized', identity: null, masked_mobile: null, eligible: false });
    const rec = await post(client, detailUrl(w, anon), confirmBody);
    expect(rec.statusCode, rec.body).toBe(409);
    expect(errCode(j(rec))).toBe('identity_validation.not_eligible');
    const rev = await client.inject({ method: 'POST', url: revealUrl(w, anon) });
    expect(rev.statusCode, rev.body).toBe(409);
    expect(await validations(anon)).toHaveLength(0);
    expect(new Set((j(await client.inject({ method: 'GET', url: queueUrl(w) })).entries as Json[]).map((e) => e.member_id))).toEqual(new Set([w.memberId]));
    // `attempt_count` counts every act, superseded ones included.
    const nc = { outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', note: 'ZZ again' };
    expect((await post(client, detailUrl(w, w.memberId), nc)).statusCode).toBe(201);
    expect((await post(client, detailUrl(w, w.memberId), nc)).statusCode).toBe(201);
    const entry = (j(await client.inject({ method: 'GET', url: queueUrl(w) })).entries as Json[]).find((e) => e.member_id === w.memberId);
    expect(entry).toMatchObject({ attempt_count: 2, latest_outcome: 'not_confirmed' });
  });
});

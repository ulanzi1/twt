// The claim CONTACT RECORD over HTTP — Story 6.19a (Task 4; AC1, AC8a, AC9a, AC11a). Live DB (:5433).
//
// What this file proves that the domain spec cannot: the ROUTES — the member session and ownership, the helpline's
// `claim.file` + step-up chain, the two admin reads' keys (presence under `claim.view_nominee_name_check` at the
// deceased's district; plaintext under `claim.file`), the translation of every writer refusal to its stable
// `claim_contact.<code>`, the audit unit (W10: ONE intent line + `emitAuthAudit` events; the consent's `audit_id` =
// the intent line), the REAL envelope crypto (a planted value is decrypted back by the read-back), and that ⛔ no
// planted plaintext reaches an event, an audit line, an auth-audit event, a consent payload or an error body.
// ⚠ LOGS: the server's logger is OFF under `nodeEnv === 'test'` (server.ts), so a runtime log check here would be
// vacuous. The one log call on these routes (the read-back's decrypt-failure warn) is pinned by source below to
// carry only the error and the claim id.
//
// Every tenant is a fresh `randomUUID()` (committed writes accumulate on the shared DB — assert membership).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Json = Record<string, unknown>;
type Client = ReturnType<typeof makeClient>;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const DISTRICT = 'Kanpur Nagar';

// ⭐ REAL-PLAINTEXT SENTINELS — each distinctive enough that a substring hit is a real leak.
const SENTINEL = {
  claimantName: 'Sentinelclaimant Zqxwname',
  claimantMobile: '9812347650',
  claimantAddress: 'Sentinel House 77, Zqxw Lane, Kanpur',
  nomineeAddress: 'Sentinel Nominee Villa 42, Zqxw Road',
} as const;

describe.skipIf(!hasDatabase)('claim contact record — routes (Story 6.19a)', { timeout: 20000 }, () => {
  let t: TestApp;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
  });

  afterAll(async () => {
    const c = await t.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  });

  // ── member helpers (the dpdpa-consent.spec.ts precedent — the REAL filing path) ───────────────────────────
  const memberToken = (memberId: string, pariwarId: string) =>
    signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);

  async function inject(method: 'GET' | 'POST', url: string, opts: { payload?: Json; token?: string } = {}) {
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
    return { status: res.statusCode, body, raw: res.body };
  }

  async function seedMember(opts: { district?: boolean } = {}): Promise<{ memberId: string; pariwarId: string }> {
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
    if (opts.district !== false) {
      await t.pool.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, DISTRICT],
      );
    }
    return { memberId, pariwarId };
  }

  /** The REAL filing path: declare a nominee, the handover OTP, the intake → `intake_converged`. */
  async function fileClaim(): Promise<{ memberId: string; pariwarId: string; claimCaseId: string }> {
    const { memberId, pariwarId } = await seedMember();
    const tok = memberToken(memberId, pariwarId);
    const declare = await inject('POST', '/api/v1/member/nominees', {
      payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
      token: tok,
    });
    expect(declare.status).toBe(200);
    expect((await inject('POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: tok })).status).toBe(200);
    const code = t.stepUpDelivery.last?.code as string;
    expect((await inject('POST', '/api/v1/member/claims/handover-otp/verify', { payload: { code }, token: tok })).body).toMatchObject({ verified: true });
    const intake = await inject('POST', '/api/v1/member/claims/intake', { payload: { relationship: 'spouse' }, token: tok });
    expect(intake.status).toBe(200);
    return { memberId, pariwarId, claimCaseId: intake.body.claimCaseId as string };
  }

  /** Force a claim's state (the projector is the only writer — a fixture). */
  async function forceState(claimCaseId: string, state: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.claim_state_writer = 'on'");
      await c.query('UPDATE claims SET current_state = $2 WHERE claim_case_id = $1', [claimCaseId, state]);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }

  const memberUrl = (claimCaseId: string) => `/api/v1/member/claims/${claimCaseId}/contact`;
  const adminUrl = (pariwarId: string, claimCaseId: string) => `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/contact`;

  // ── admin helpers (the dpdpa-consent-helpline.spec.ts precedent) ─────────────────────────────────────────
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `cc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(t.deps, { email, password });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const enrollToken = service.mintEnrollmentToken(t.deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enrollToken } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enrollToken } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dimension: 'pariwar' | 'district' = 'pariwar'): Promise<void> {
    await t.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dimension, dimension === 'pariwar' ? pariwarId : DISTRICT],
    );
  }

  async function operator(pariwarId: string, opts: { elevate?: boolean } = {}): Promise<Client> {
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'helpline_operator');
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    if (opts.elevate !== false) {
      const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_file' } });
      expect(req.statusCode).toBe(200);
      const code = t.adminStepUpDelivery.last?.code as string;
      expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } })).statusCode).toBe(200);
    }
    return client;
  }

  async function projectedVersionId(pariwarId: string, memberId: string): Promise<string> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      const [p] = await (await import('@twt/domain')).nominee.getProjectedNomineeVersions(scopeTx.tx, ids.pariwarId(pariwarId), ids.memberId(memberId));
      return p!.versionId as string;
    } finally {
      await closeScopeTx(scopeTx, true);
    }
  }

  // ── MEMBER ───────────────────────────────────────────────────────────────────────────────────────────────
  describe('the member route', () => {
    it('⭐ 201 — the full record by RANK; ⭐ W10: ONE intent line, the consent’s audit_id IS it, and the two emitAuthAudit events', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const res = await inject('POST', memberUrl(claimCaseId), {
        payload: { locale: 'hi', nominees: [{ rank: 1, address: 'House 1, Kanpur' }], claimantNomineeRank: 1, agreed: true },
        token: memberToken(memberId, pariwarId),
      });
      expect(res.status, res.raw).toBe(201);
      expect(res.body).toEqual({ recorded: true, claimantSide: 'nominee', agreementRecorded: true });
      const intents = await t.pool.query<{ audit_id: string; resource_locator: string }>(
        `SELECT audit_id, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'claim.contact_recorded'`,
        [pariwarId],
      );
      expect(intents.rows).toHaveLength(1);
      expect(intents.rows[0]!.resource_locator).toBe(`claim:${claimCaseId.toLowerCase()}`);
      const consent = await t.pool.query<{ audit_id: string; consent_type: string; subject_id: string }>(
        `SELECT cr.audit_id, cr.consent_type, cr.subject_id FROM claim_contacts cc JOIN consent_records cr ON cr.consent_id = cc.agreement_consent_id WHERE cc.claim_case_id = $1`,
        [claimCaseId],
      );
      expect(consent.rows[0]).toMatchObject({ audit_id: intents.rows[0]!.audit_id, consent_type: 'claim_contact_agreement', subject_id: memberId });
      const events = t.auditSink.events.filter((e) => e.resourceLocator === `claim:${claimCaseId.toLowerCase()}`).map((e) => e.type);
      expect(events).toEqual(expect.arrayContaining(['member_claim.contact_recorded', 'claim_contact.agreement_recorded']));
      // ⛔ Recording the agreement emits ⛔ no `claim.dpdpa_consent_recorded` (AC10).
      const dpdpa = await t.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.dpdpa_consent_recorded'`, [claimCaseId]);
      expect(dpdpa.rows).toHaveLength(0);
    });

    it('⛔ no session → 401; another member’s claim → 404 (⛔ never a 403 oracle); the contract’s own 400s', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const body = { locale: 'hi', nominees: [{ rank: 1, address: 'A' }], claimantNomineeRank: 1, agreed: true };
      expect((await inject('POST', memberUrl(claimCaseId), { payload: body })).status).toBe(401);
      const other = await seedMember();
      expect((await inject('POST', memberUrl(claimCaseId), { payload: body, token: memberToken(other.memberId, pariwarId) })).status).toBe(404);
      // A cross-Pariwar member token (their own session, another tenant's claim id) → 404.
      expect((await inject('POST', memberUrl(claimCaseId), { payload: body, token: memberToken(other.memberId, other.pariwarId) })).status).toBe(404);
      const noAgreement = await inject('POST', memberUrl(claimCaseId), { payload: { ...body, agreed: false }, token: memberToken(memberId, pariwarId) });
      expect(noAgreement.status).toBe(400);
      expect((noAgreement.body.error as Json).code).toBe('request.validation');
    });

    it('the writer’s 400 — `claim_contact.nominee_set_mismatch` (ranks other than the family sees); and 409 `not_writable` once verified', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const tok = memberToken(memberId, pariwarId);
      const mismatch = await inject('POST', memberUrl(claimCaseId), {
        payload: { locale: 'hi', nominees: [{ rank: 1, address: 'A' }, { rank: 2, address: 'B' }], claimantNomineeRank: 1, agreed: true },
        token: tok,
      });
      expect(mismatch.status).toBe(400);
      expect((mismatch.body.error as Json).code).toBe('claim_contact.nominee_set_mismatch');
      await forceState(claimCaseId, 'verifier_approved');
      const closed = await inject('POST', memberUrl(claimCaseId), {
        payload: { locale: 'hi', nominees: [{ rank: 1, address: 'A' }], claimantNomineeRank: 1, agreed: true },
        token: tok,
      });
      expect(closed.status).toBe(409);
      expect((closed.body.error as Json).code).toBe('claim_contact.not_writable');
    });

    it('⭐ a member with ⛔ no declared nominee submits zero ranks + the claimant block and can finish (201)', async () => {
      const { memberId, pariwarId } = await seedMember();
      const claimCaseId = ids.claimId(randomUUID());
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      const base = { claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(memberId), intakeChannels: ['member_app'] as const, claimantActorId: null, actorId: null };
      try {
        await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.intake_initiated', payload: { from_state: null, to_state: 'intake_pending', trigger: 'seed', actor: 'member', deceased_member_id: memberId, intake_channel: 'member_app', claimant_actor_id: null } });
        await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.intake_converged', payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'member' } });
        await closeScopeTx(scopeTx, true);
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
      const res = await inject('POST', memberUrl(claimCaseId), {
        payload: { locale: 'en', nominees: [], claimant: { name: 'Ravi Kumar', mobile: '9876543210', address: 'Kanpur' }, agreed: true },
        token: memberToken(memberId, pariwarId),
      });
      expect(res.status, res.raw).toBe(201);
      expect(res.body).toMatchObject({ claimantSide: 'claimant' });
    });
  });

  // ── HELPLINE + the two ADMIN READS ──────────────────────────────────────────────────────────────────────
  describe('the helpline write and the admin reads', () => {
    it('⛔ no session → 401 on all three admin routes; the write needs the operator’s OWN step-up (403 → then 201)', async () => {
      const { pariwarId, claimCaseId } = await fileClaim();
      const anon = makeClient(t.app);
      expect((await anon.inject({ method: 'GET', url: adminUrl(pariwarId, claimCaseId) })).statusCode).toBe(401);
      expect((await anon.inject({ method: 'GET', url: `${adminUrl(pariwarId, claimCaseId)}/details` })).statusCode).toBe(401);
      expect((await anon.inject({ method: 'POST', url: adminUrl(pariwarId, claimCaseId), payload: { locale: 'hi', agreed: true } })).statusCode).toBe(401);
      const op = await operator(pariwarId, { elevate: false });
      const noStepUp = await op.inject({ method: 'POST', url: adminUrl(pariwarId, claimCaseId), payload: { locale: 'hi', agreed: true } });
      expect(noStepUp.statusCode).toBe(403);
      expect(noStepUp.json<{ error: { code: string } }>().error.code).toBe('auth.step_up_required');
    });

    it('⭐ the creating write’s 400s, each its own code — agreement_required, claimant_required, address_required, nominee_set_mismatch', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const v = await projectedVersionId(pariwarId, memberId);
      const op = await operator(pariwarId);
      const post = (payload: Json) => op.inject({ method: 'POST', url: adminUrl(pariwarId, claimCaseId), payload });
      const code = (r: Awaited<ReturnType<typeof post>>) => r.json<{ error: { code: string } }>().error.code;
      const r1 = await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, address: 'A' }], claimantNomineeVersionId: v });
      expect([r1.statusCode, code(r1)]).toEqual([400, 'claim_contact.agreement_required']);
      const r2 = await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, address: 'A' }], agreed: true });
      expect([r2.statusCode, code(r2)]).toEqual([400, 'claim_contact.claimant_required']);
      const r3 = await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, relationship: 'son' }], claimant: { name: 'X', mobile: '9876543210', address: 'Y' }, agreed: true });
      expect([r3.statusCode, code(r3)]).toEqual([400, 'claim_contact.address_required']);
      const r4 = await post({ locale: 'hi', nominees: [{ nomineeVersionId: randomUUID(), address: 'A' }], claimantNomineeVersionId: v, agreed: true });
      expect([r4.statusCode, code(r4)]).toEqual([400, 'claim_contact.nominee_set_mismatch']);
    });

    it('⭐ 201 + the presence view (⛔ no value); the plaintext read-back DECRYPTS the real envelope under `claim.file` and is audited; a district reader of presence is refused the plaintext', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const v = await projectedVersionId(pariwarId, memberId);
      const op = await operator(pariwarId);
      const res = await op.inject({
        method: 'POST',
        url: adminUrl(pariwarId, claimCaseId),
        payload: { locale: 'hi', nominees: [{ nomineeVersionId: v, address: SENTINEL.nomineeAddress }], claimantNomineeVersionId: v, agreed: true },
      });
      expect(res.statusCode, res.body).toBe(201);
      const body = res.json<{ presence: Json; agreementRecorded: boolean }>();
      expect(body.agreementRecorded).toBe(true);
      // Undetermined ⇒ the allowed versions are the PROJECTED ones, and the record is complete against them.
      expect(body.presence).toMatchObject({ recorded: true, determination: 'not_effective', claimantSide: 'nominee', agreement: 'live', missing: null });
      expect(res.body).not.toContain(SENTINEL.nomineeAddress);

      const presence = await op.inject({ method: 'GET', url: adminUrl(pariwarId, claimCaseId) });
      expect(presence.statusCode).toBe(200);
      expect(presence.body).not.toContain(SENTINEL.nomineeAddress);
      expect(presence.json<{ nominees: Json[] }>().nominees[0]).toMatchObject({ nomineeVersionId: v, addressPresent: true, row: 'own' });

      const details = await op.inject({ method: 'GET', url: `${adminUrl(pariwarId, claimCaseId)}/details` });
      expect(details.statusCode).toBe(200);
      expect(details.json<{ nominees: Array<{ address: string }> }>().nominees[0]!.address).toBe(SENTINEL.nomineeAddress);
      const readLine = t.auditSink.ofType('admin_claim.contact_details_read').filter((e) => e.resourceLocator === `claim:${claimCaseId.toLowerCase()}`);
      expect(readLine).toHaveLength(1);
      expect(readLine[0]!.context).toMatchObject({ fields_decrypted: 1 });

      // A District Admin holds the presence key (at the deceased's district) — ⛔ never the plaintext.
      const da = await authenticate();
      await grant(da.userId, pariwarId, 'district_admin', 'district');
      await da.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      expect((await da.client.inject({ method: 'GET', url: adminUrl(pariwarId, claimCaseId) })).statusCode).toBe(200);
      expect((await da.client.inject({ method: 'GET', url: `${adminUrl(pariwarId, claimCaseId)}/details` })).statusCode).toBe(403);
    });

    it('⛔ cross-Pariwar: an operator of ANOTHER Pariwar is refused on every route', async () => {
      const { pariwarId, claimCaseId } = await fileClaim();
      const otherPariwar = randomUUID();
      const { client, userId } = await authenticate();
      await grant(userId, otherPariwar, 'helpline_operator');
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId: otherPariwar } });
      for (const [method, url] of [
        ['GET', adminUrl(pariwarId, claimCaseId)],
        ['GET', `${adminUrl(pariwarId, claimCaseId)}/details`],
        ['POST', adminUrl(pariwarId, claimCaseId)],
      ] as const) {
        const res = await client.inject({ method, url, ...(method === 'POST' ? { payload: { locale: 'hi', agreed: true } } : {}) });
        expect([401, 403, 404], `${method} ${url}`).toContain(res.statusCode);
      }
    });

    it('⭐ the 409s — `add_only` (a set value, after verification) with the row unchanged, `awaiting_determination`, `not_writable`', async () => {
      const { memberId, pariwarId, claimCaseId } = await fileClaim();
      const v = await projectedVersionId(pariwarId, memberId);
      const op = await operator(pariwarId);
      const post = (payload: Json) => op.inject({ method: 'POST', url: adminUrl(pariwarId, claimCaseId), payload });
      expect((await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, address: 'Original' }], claimantNomineeVersionId: v, agreed: true })).statusCode).toBe(201);
      await forceState(claimCaseId, 'verifier_approved');
      const before = await t.pool.query<{ address_ciphertext: string }>(`SELECT address_ciphertext FROM claim_contact_nominees WHERE claim_case_id = $1`, [claimCaseId]);
      const addOnly = await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, address: 'Different' }] });
      expect([addOnly.statusCode, addOnly.json<{ error: { code: string } }>().error.code]).toEqual([409, 'claim_contact.add_only']);
      const after = await t.pool.query<{ address_ciphertext: string }>(`SELECT address_ciphertext FROM claim_contact_nominees WHERE claim_case_id = $1`, [claimCaseId]);
      expect(after.rows).toEqual(before.rows);
      // ⭐ An IDENTICAL retry is ⛔ not an overwrite (the stored envelope is decrypted to compare).
      expect((await post({ locale: 'hi', nominees: [{ nomineeVersionId: v, address: 'Original' }] })).statusCode).toBe(201);
      // The claim is UNDETERMINED here, so every stored claimant version reads as ⛔ not effective.
      const awaiting = await post({ locale: 'hi', claimantNomineeVersionId: v });
      expect([awaiting.statusCode, awaiting.json<{ error: { code: string } }>().error.code]).toEqual([409, 'claim_contact.awaiting_determination']);
      await forceState(claimCaseId, 'settled');
      const closed = await post({ locale: 'hi', agreed: true });
      expect([closed.statusCode, closed.json<{ error: { code: string } }>().error.code]).toEqual([409, 'claim_contact.not_writable']);
    });
  });

  // ── AC9a — the planted plaintext is found in ⛔ none of these ────────────────────────────────────────────
  it('⭐⭐ AC9a — a planted claimant name, mobile, address and nominee address appear in ⛔ no event, audit line, auth-audit event, consent payload or error body', async () => {
    const { memberId, pariwarId, claimCaseId } = await fileClaim();
    const tok = memberToken(memberId, pariwarId);
    const ok = await inject('POST', memberUrl(claimCaseId), {
      payload: {
        locale: 'en',
        nominees: [{ rank: 1, address: SENTINEL.nomineeAddress, relationship: 'son' }],
        claimant: { name: SENTINEL.claimantName, mobile: SENTINEL.claimantMobile, address: SENTINEL.claimantAddress },
        agreed: true,
      },
      token: tok,
    });
    expect(ok.status, ok.raw).toBe(201);
    // Refused writes' bodies — the contract 400 and a writer 409.
    const refusedBodies: string[] = [];
    refusedBodies.push(
      (await inject('POST', memberUrl(claimCaseId), { payload: { locale: 'en', nominees: [{ rank: 1, address: SENTINEL.nomineeAddress }], claimant: { name: SENTINEL.claimantName, mobile: 'bad', address: SENTINEL.claimantAddress }, agreed: true }, token: tok })).raw,
    );
    await forceState(claimCaseId, 'verifier_approved');
    refusedBodies.push(
      (await inject('POST', memberUrl(claimCaseId), { payload: { locale: 'en', nominees: [{ rank: 1, address: SENTINEL.nomineeAddress, relationship: 'son' }], claimant: { name: SENTINEL.claimantName, mobile: SENTINEL.claimantMobile, address: SENTINEL.claimantAddress }, agreed: true }, token: tok })).raw,
    );

    const haystacks: string[] = [...refusedBodies];
    haystacks.push(JSON.stringify((await t.pool.query(`SELECT payload FROM events_log WHERE stream_id = $1 OR stream_id = $2`, [claimCaseId, memberId])).rows));
    haystacks.push(JSON.stringify((await t.pool.query(`SELECT * FROM audit_log_entries WHERE pariwar_id = $1`, [pariwarId])).rows));
    haystacks.push(JSON.stringify((await t.pool.query(`SELECT consent_payload FROM consent_records WHERE pariwar_id = $1`, [pariwarId])).rows));
    haystacks.push(JSON.stringify(t.auditSink.events));
    // ⭐ NON-VACUITY: the values ARE stored — as ciphertext, ⛔ never as plaintext.
    const stored = JSON.stringify((await t.pool.query(`SELECT * FROM claim_contacts cc JOIN claim_contact_nominees n USING (contact_id) WHERE cc.claim_case_id = $1`, [claimCaseId])).rows);
    expect(stored).toContain('enc:v1:');
    haystacks.push(stored);
    for (const secret of Object.values(SENTINEL)) {
      for (const h of haystacks) expect(h).not.toContain(secret);
    }
  });

  it('the one log call on these routes carries only the error and the claim id (source pin — the test logger is off)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../../src/modules/claims/claims.contact.handlers.ts'), 'utf8');
    const logs = src.match(/request\.log\.\w+\([^;]*;/g) ?? [];
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatch(/request\.log\.warn\(\{ err, claimCaseId \}/);
  });
});

// The District Admin's CALL RECORD over HTTP (Story 6.37c, Task 6; AC7; LD10, LD11). Both surfaces —
// `…/correction/calls` and `…/certificate-reminders/calls` — behind key (1) `claim.record_correction_letter`: 201 + the
// DTO; the MANDATORY `Idempotency-Key` (400 without; a replay under the same key returns the FIRST result — ONE row —
// whatever its body); a missing display name ⇒ 409 `admin.display_name_missing` and the key RELEASED (a retry
// succeeds); a `reached` call with nobody answering ⇒ 400; 403 for a role without the key and outside the district;
// the number reveal behind a FRESH step-up (`contact_call_number`) — the CURRENT number, `no-store`, ONE audit line per
// reveal, ⛔ the number in any audit line; ⭐ LD11 — a nominee refused while `CLAIM_NOMINEE_CALLS_CLEARED` is unset and
// allowed when it is `1`, read through `loadConfig(env)` (a second app).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { encryptClaimContactField } from '../../../src/modules/claims/claim-contact-crypto.js';
import { encryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
const DISTRICT = 'Kanpur Nagar';
const CLAIMANT_MOBILE = '9876501234';
const NOMINEE_MOBILE = '9812345678';
const todayIst = (): string => claim.istDateOf(new Date());
const errCode = (res: { json: () => unknown }): string => (res.json() as { error: { code: string } }).error.code;

describe.skipIf(!hasDatabase)('Story 6.37c — the call record, over HTTP', { timeout: 30000 }, () => {
  /** The default app (nominee calls ⛔ cleared) and a second app whose env clears them. */
  let t: TestApp;
  let cleared: TestApp;
  let fakeWebauthn: FakeWebAuthnProvider;
  let fakeWebauthnCleared: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    fakeWebauthnCleared = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
    cleared = await createTestApp({ webauthn: fakeWebauthnCleared, env: { CLAIM_NOMINEE_CALLS_CLEARED: '1' } });
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
    await teardown(cleared);
    await teardown(t);
  });

  async function authenticate(app: TestApp, webauthn: FakeWebAuthnProvider): Promise<{ client: Client; userId: string }> {
    const email = `call-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(app.deps, { email, password });
    createdUserIds.push(userId);
    await app.pool.query(`UPDATE users SET display_name = 'District Admin One' WHERE id = $1`, [userId]);
    const credentialId = `cred-${userId}`;
    webauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    webauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app.app);
    const enrollToken = service.mintEnrollmentToken(app.deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enrollToken } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enrollToken } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function staff(
    pariwarId: string,
    o: { role?: string; district?: string; app?: TestApp } = {},
  ): Promise<{ client: Client; userId: string }> {
    const app = o.app ?? t;
    const role = o.role ?? 'district_admin';
    const { client, userId } = await authenticate(app, app === t ? fakeWebauthn : fakeWebauthnCleared);
    await app.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, role === 'district_admin' ? 'district' : 'pariwar', role === 'district_admin' ? (o.district ?? DISTRICT) : pariwarId],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  async function elevate(app: TestApp, client: Client, context: string): Promise<void> {
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: context } })).statusCode).toBe(200);
    const code = app.adminStepUpDelivery.last?.code as string;
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } })).statusCode).toBe(200);
  }

  /**
   * A claim being checked (verifier_approved), the deceased posted in DISTRICT, a determination + contact record
   * (the name-check fixture). `claimant` (default) makes the claimant NONE of the nominees — the claimant BLOCK, with a
   * REAL mobile envelope; else the one person is the nominee the claimant is.
   */
  async function seededClaim(pariwarId: string, opts: { claimant?: boolean } = {}) {
    const cid = ids.claimId(randomUUID());
    const mid = ids.memberId(randomUUID());
    const pid = ids.pariwarId(pariwarId);
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(scopeTx.client, {
          claimCaseId: cid, pariwarId: pid, deceasedMemberId: mid, intakeChannels: ['helpline'], claimantActorId: null,
          eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra }, actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(mid), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    await t.pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1) ON CONFLICT DO NOTHING`,
      [mid, pariwarId],
    );
    await t.pool.query(
      `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
      [mid, pariwarId, DISTRICT],
    );
    await seedNomineeNameCheck(t.deps, pariwarId, String(cid));
    // A REAL nominee mobile envelope (the fixture's is a placeholder) — under `session_replication_role = 'replica'`
    // (the declaration history's append-only trigger), the correction-closure spec's precedent.
    const nomineeMobile = await encryptNomineeField(NOMINEE_MOBILE, pariwarId, t.deps.encryption);
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('UPDATE member_nominee_versions SET mobile_ciphertext = $3 WHERE pariwar_id = $1 AND member_id = $2', [pariwarId, mid, nomineeMobile]);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
    if (opts.claimant !== false) {
      const enc = async (v: string) => encryptClaimContactField(v, pariwarId, t.deps.encryption);
      await t.pool.query(
        `UPDATE claim_contacts SET claimant_nominee_version_id = NULL, claimant_name_ciphertext = $2, claimant_mobile_ciphertext = $3,
           claimant_address_ciphertext = $4 WHERE claim_case_id = $1`,
        [cid, await enc('Claimant Sentinel'), await enc(CLAIMANT_MOBILE), await enc('Claimant House 1')],
      );
    }
    const scope = await openScopeTx(t.deps, pariwarId);
    let nomineeKey = '';
    try {
      nomineeKey = (await claim.readCorrectionRecipients(scope.tx, pid, cid)).people.find((p) => p.role === 'nominee')!.personKey;
      await closeScopeTx(scope, true);
    } catch (err) {
      await closeScopeTx(scope, false);
      throw err;
    }
    return { claimCaseId: String(cid), nomineeKey };
  }

  const surfaces = [
    { name: 'correction', path: 'correction', recorded: 'admin_claim_correction.call_recorded', revealed: 'admin_claim_correction.call_number_revealed' },
    {
      name: 'certificate',
      path: 'certificate-reminders',
      recorded: 'admin_claim_certificate_reminder.call_recorded',
      revealed: 'admin_claim_certificate_reminder.call_number_revealed',
    },
  ] as const;
  const base = (pariwarId: string, claimCaseId: string, path: string) => `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/${path}`;
  const body = (over: Record<string, unknown> = {}) => ({ person_key: 'claimant', called_on: todayIst(), answered_by: 'the_person', outcome: 'reached', ...over });
  const rows = async (claimCaseId: string) =>
    (await t.pool.query<{ chase: string; outcome: string }>('SELECT chase, outcome FROM claim_contact_calls WHERE claim_case_id = $1', [claimCaseId])).rows;

  for (const s of surfaces) {
    it(`⭐ ${s.name} — 201 + the DTO; the SAME Idempotency-Key replayed (with ANOTHER body) ⇒ the FIRST result, ONE row; ⛔ key ⇒ 400`, async () => {
      const pariwarId = randomUUID();
      const { claimCaseId } = await seededClaim(pariwarId);
      const { client: da } = await staff(pariwarId);
      const url = `${base(pariwarId, claimCaseId, s.path)}/calls`;
      t.auditSink.events.length = 0;
      const key = `k-${randomUUID()}`;
      const first = await da.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': key } });
      expect(first.statusCode, first.body).toBe(201);
      const dto = first.json();
      expect(dto).toMatchObject({ person_key: 'claimant', chase: s.name, called_on: todayIst(), answered_by: 'the_person', outcome: 'reached', recorded_by: 'District Admin One' });
      const replay = await da.inject({
        method: 'POST',
        url,
        payload: body({ answered_by: 'nobody', outcome: 'not_reached' }),
        headers: { 'idempotency-key': key },
      });
      expect(replay.statusCode).toBe(200);
      expect(replay.json()).toEqual(dto);
      expect(await rows(claimCaseId)).toEqual([{ chase: s.name, outcome: 'reached' }]);
      const missing = await da.inject({ method: 'POST', url, payload: body() });
      expect(missing.statusCode).toBe(400);
      expect(errCode(missing)).toBe('contact_call.idempotency_key_required');
      const audits = t.auditSink.events.filter((e) => e.type === s.recorded);
      expect(audits).toHaveLength(1);
      expect(audits[0]!.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
      // ⛔ A number or a name in any audit line.
      expect(JSON.stringify(t.auditSink.events)).not.toContain(CLAIMANT_MOBILE);
      expect(JSON.stringify(t.auditSink.events)).not.toContain('Claimant Sentinel');
    });
  }

  it('Review P27 — an Idempotency-Key at the 200-char bound is accepted; at 201 chars ⇒ 400 contact_call.idempotency_key_too_long', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seededClaim(pariwarId);
    const { client: da } = await staff(pariwarId);
    const url = `${base(pariwarId, claimCaseId, 'correction')}/calls`;
    const atBound = await da.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': 'k'.repeat(200) } });
    expect(atBound.statusCode, atBound.body).toBe(201);
    const overBound = await da.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': 'k'.repeat(201) } });
    expect(overBound.statusCode).toBe(400);
    expect(errCode(overBound)).toBe('contact_call.idempotency_key_too_long');
  });

  it('⛔ `reached` with nobody / someone else answering ⇒ 400 (⛔ row); a call date in the future ⇒ 400 contact_call.called_on_in_future', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seededClaim(pariwarId);
    const { client: da } = await staff(pariwarId);
    const url = `${base(pariwarId, claimCaseId, 'correction')}/calls`;
    for (const answered of ['nobody', 'someone_else']) {
      const res = await da.inject({ method: 'POST', url, payload: body({ answered_by: answered }), headers: { 'idempotency-key': randomUUID() } });
      expect(res.statusCode).toBe(400);
      // Review P18 — the domain's OWN refusal (⛔ a schema `.refine()`, which Fastify's validator would otherwise
      // run first and mask behind a generic code).
      expect(errCode(res)).toBe('contact_call.reached_needs_answer');
    }
    const future = claim.istDateOf(new Date(Date.now() + 2 * 86_400_000));
    const res = await da.inject({ method: 'POST', url, payload: body({ called_on: future }), headers: { 'idempotency-key': randomUUID() } });
    expect(res.statusCode).toBe(400);
    expect(errCode(res)).toBe('contact_call.called_on_in_future');
    expect(await rows(claimCaseId)).toEqual([]);
  });

  it('⛔ a missing display name ⇒ 409 admin.display_name_missing (⛔ fallback, ⛔ row) — and the key is RELEASED: the same key then succeeds', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seededClaim(pariwarId);
    const { client: da, userId } = await staff(pariwarId);
    await t.pool.query('UPDATE users SET display_name = NULL WHERE id = $1', [userId]);
    const url = `${base(pariwarId, claimCaseId, 'correction')}/calls`;
    const key = randomUUID();
    const res = await da.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': key } });
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('admin.display_name_missing');
    expect(await rows(claimCaseId)).toEqual([]);
    await t.pool.query(`UPDATE users SET display_name = 'District Admin One' WHERE id = $1`, [userId]);
    expect((await da.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': key } })).statusCode).toBe(201);
  });

  it('⛔ 403 — a role without key (1) (a helpline operator) and a District Admin of ANOTHER district, on both surfaces (⛔ row)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seededClaim(pariwarId);
    const { client: op } = await staff(pariwarId, { role: 'helpline_operator' });
    const { client: elsewhere } = await staff(pariwarId, { district: 'Lucknow' });
    for (const s of surfaces) {
      const url = `${base(pariwarId, claimCaseId, s.path)}/calls`;
      for (const who of [op, elsewhere]) {
        expect((await who.inject({ method: 'POST', url, payload: body(), headers: { 'idempotency-key': randomUUID() } })).statusCode).toBe(403);
        expect((await who.inject({ method: 'GET', url: `${url}/number?person_key=claimant` })).statusCode).toBe(403);
      }
    }
    expect(await rows(claimCaseId)).toEqual([]);
  });

  for (const s of surfaces) {
    it(`⭐ ${s.name} — the number: 403 without the FRESH step-up; with it the CURRENT number (no-store), ONE audit line PER reveal, ⛔ the number in it`, async () => {
      const pariwarId = randomUUID();
      const { claimCaseId } = await seededClaim(pariwarId);
      const { client: da } = await staff(pariwarId);
      const url = `${base(pariwarId, claimCaseId, s.path)}/calls/number?person_key=claimant`;
      const cold = await da.inject({ method: 'GET', url });
      expect(cold.statusCode).toBe(403);
      expect(cold.body).not.toContain(CLAIMANT_MOBILE);
      await elevate(t, da, 'contact_call_number');
      t.auditSink.events.length = 0;
      for (let i = 0; i < 2; i += 1) {
        const res = await da.inject({ method: 'GET', url });
        expect(res.statusCode, res.body).toBe(200);
        expect(res.json()).toEqual({ person_key: 'claimant', number: `+91${CLAIMANT_MOBILE}` });
        expect(res.headers['cache-control']).toBe('no-store');
      }
      const reveals = t.auditSink.events.filter((e) => e.type === s.revealed);
      expect(reveals).toHaveLength(2);
      expect(JSON.stringify(t.auditSink.events)).not.toContain(CLAIMANT_MOBILE);
      // After a change to the claimant's mobile, the reveal shows the NEW number.
      await t.pool.query('UPDATE claim_contacts SET claimant_mobile_ciphertext = $2 WHERE claim_case_id = $1', [
        claimCaseId,
        await encryptClaimContactField('9123456780', pariwarId, t.deps.encryption),
      ]);
      expect((await da.inject({ method: 'GET', url })).json()).toEqual({ person_key: 'claimant', number: '+919123456780' });
    });
  }

  it('⭐ LD11 — a NOMINEE is refused (409 contact_call.nominee_calls_not_cleared — the record AND the reveal) while CLAIM_NOMINEE_CALLS_CLEARED is unset; with it `1` (read through loadConfig) both are allowed', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, nomineeKey } = await seededClaim(pariwarId, { claimant: false });
    expect(t.deps.config.claimNomineeCallsCleared).toBe(false);
    expect(cleared.deps.config.claimNomineeCallsCleared).toBe(true);
    const url = `${base(pariwarId, claimCaseId, 'correction')}/calls`;
    const { client: off } = await staff(pariwarId);
    const refused = await off.inject({ method: 'POST', url, payload: body({ person_key: nomineeKey }), headers: { 'idempotency-key': randomUUID() } });
    expect(refused.statusCode).toBe(409);
    expect(errCode(refused)).toBe('contact_call.nominee_calls_not_cleared');
    await elevate(t, off, 'contact_call_number');
    const hidden = await off.inject({ method: 'GET', url: `${url}/number?person_key=${encodeURIComponent(nomineeKey)}` });
    expect(hidden.statusCode).toBe(409);
    expect(errCode(hidden)).toBe('contact_call.nominee_calls_not_cleared');

    const { client: on } = await staff(pariwarId, { app: cleared });
    const ok = await on.inject({ method: 'POST', url, payload: body({ person_key: nomineeKey }), headers: { 'idempotency-key': randomUUID() } });
    expect(ok.statusCode, ok.body).toBe(201);
    await elevate(cleared, on, 'contact_call_number');
    const shown = await on.inject({ method: 'GET', url: `${url}/number?person_key=${encodeURIComponent(nomineeKey)}` });
    expect(shown.statusCode, shown.body).toBe(200);
    expect(shown.json()).toEqual({ person_key: nomineeKey, number: `+91${NOMINEE_MOBILE}` });
  });
});

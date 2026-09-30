// The correction-return CHASE — the District Admin's routes over HTTP (Story 6.19b; AC5, AC9b, AC16, AC11b "keys",
// "the mark", "letters"). Keys (1) `claim.record_correction_letter` and (7) `claim.change_correction_must_act`: the
// happy paths, the 409s, cross-Pariwar and non-human denial, the step-up on the address, one audit line per reveal,
// and ⭐ AC9b — a planted tracking number, screenshot marker and address appear in ⛔ no audit line and ⛔ no error body.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { encryptClaimContactField } from '../../../src/modules/claims/claim-contact-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
const DISTRICT = 'Kanpur Nagar';
const SENTINEL = {
  tracking: 'TRKSENTINEL9Q2Z',
  address: 'Sentinel Letter House 19, Zqxw Road',
  screenshot: 'SCREENSHOT-SENTINEL-BYTES',
  note: 'the bank misspelt the name, staff must fix it zqxw',
} as const;

function multipart(bytes: Buffer, contentType: string, deliveredOn?: string): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const parts: Buffer[] = [];
  if (deliveredOn !== undefined) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="delivered_on"\r\n\r\n${deliveredOn}\r\n`));
  }
  parts.push(
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.png"\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { body: Buffer.concat(parts), ct: `multipart/form-data; boundary=${boundary}` };
}

describe.skipIf(!hasDatabase)('the correction chase — District Admin routes (Story 6.19b)', { timeout: 20000 }, () => {
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

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `chase-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(t.deps, { email, password });
    createdUserIds.push(userId);
    await t.pool.query(`UPDATE users SET display_name = 'District Admin One' WHERE id = $1`, [userId]);
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

  async function staff(pariwarId: string, role = 'district_admin'): Promise<Client> {
    const { client, userId } = await authenticate();
    await t.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, role === 'district_admin' ? 'district' : 'pariwar', role === 'district_admin' ? DISTRICT : pariwarId],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return client;
  }

  async function elevate(client: Client, context: string): Promise<void> {
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: context } })).statusCode).toBe(200);
    const code = t.adminStepUpDelivery.last?.code as string;
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } })).statusCode).toBe(200);
  }

  /** A returned, family-marked claim whose one nominee is letter-eligible (`no_target` on day 1), with a REAL address. */
  async function returnedClaim(pariwarId: string, opts: { eligible?: boolean; mark?: boolean } = {}) {
    const cid = ids.claimId(randomUUID());
    const mid = ids.memberId(randomUUID());
    const pid = ids.pariwarId(pariwarId);
    let scopeTx = await openScopeTx(t.deps, pariwarId);
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
    const address = await encryptClaimContactField(SENTINEL.address, pariwarId, t.deps.encryption);
    await t.pool.query('UPDATE claim_contact_nominees SET address_ciphertext = $2 WHERE claim_case_id = $1', [cid, address]);

    scopeTx = await openScopeTx(t.deps, pariwarId);
    let personKey = '';
    let runId: string | null = null;
    try {
      await claim.returnToDistrictAdmin(scopeTx.client, {
        claimCaseId: cid, pariwarId: pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:note',
        actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', actor: 'trustee',
      });
      if (opts.mark !== false) {
        const w = await claim.writeCorrectionMark(scopeTx.client, {
          pariwarId: pid, claimCaseId: cid, mustAct: 'family', actorId: randomUUID(), actorDisplay: 'Pariwar Admin One',
          setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true,
        });
        runId = w.openedRun!.runId;
        personKey = (await claim.readCorrectionRecipients(scopeTx.tx, pid, cid)).people[0]!.personKey;
        if (opts.eligible !== false) {
          await claim.insertFinalCorrectionReminder(scopeTx.tx, {
            pariwarId: pid, claimCaseId: cid, runId, slotDay: 1, sentOn: '2026-09-01', recipientKey: personKey,
            purpose: 'family_sms', subjectKey: '', outcome: 'no_target',
          });
        }
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { claimCaseId: String(cid), personKey, runId };
  }

  const base = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/correction`;
  const errCode = (res: { json: () => unknown }) => (res.json() as { error?: { code?: string } }).error?.code;

  it('⭐ key (7) — the District Admin changes who must act (201, a staff run), then the same value is 409 must_act.unchanged; the note is Tier-1', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    t.auditSink.events.length = 0;
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: SENTINEL.note } });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json()).toMatchObject({ must_act: 'staff', opened_run: { kind: 'staff' } });
    const again = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'again' } });
    expect(again.statusCode).toBe(409);
    expect(errCode(again)).toBe('must_act.unchanged');
    const noNote = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'family', note: '  ' } });
    expect(noNote.statusCode).toBe(400);
    const marks = await t.pool.query<{ note_ciphertext: string; set_by_role: string }>(
      'SELECT note_ciphertext, set_by_role FROM claim_correction_marks WHERE claim_case_id = $1 AND NOT is_return_mark',
      [claimCaseId],
    );
    expect(marks.rows).toHaveLength(1);
    expect(marks.rows[0]!.set_by_role).toBe('district_admin');
    expect(marks.rows[0]!.note_ciphertext).not.toContain('zqxw');
    const line = t.auditSink.events.find((e) => e.type === 'admin_claim_correction.must_act_changed');
    expect(line?.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
    expect(JSON.stringify(t.auditSink.events)).not.toContain('zqxw');
  });

  it('⛔ key (7) — ⛔ no live return ⇒ 409 must_act.no_live_return', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId, { mark: false });
    await t.pool.query('UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE claim_case_id = $1', [claimCaseId]);
    const da = await staff(pariwarId);
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'family', note: 'n' } });
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('must_act.no_live_return');
  });

  it('⛔ keys (1) and (7) — CROSS-PARIWAR: a District Admin of B is refused on a claim of A (⛔ no write)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarA);
    const daB = await staff(pariwarB);
    const mustAct = await daB.inject({ method: 'POST', url: `${base(pariwarB, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' } });
    expect([403, 404]).toContain(mustAct.statusCode);
    const letter = await daB.inject({
      method: 'POST', url: `${base(pariwarB, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: '2026-09-02', tracking_number: 'T1' },
    });
    expect([403, 404]).toContain(letter.statusCode);
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
  });

  it('⛔ keys (1) and (7) — NON-HUMAN / wrong role: ⛔ no admin session ⇒ 401; a helpline operator (⛔ neither key) ⇒ 403', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const anon = await t.app.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' }, headers: { origin: 'http://localhost:3001' } });
    expect([401, 403]).toContain(anon.statusCode);
    const op = await staff(pariwarId, 'helpline_operator');
    expect((await op.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' } })).statusCode).toBe(403);
    expect(
      (await op.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: '2026-09-02', tracking_number: 'T' } })).statusCode,
    ).toBe(403);
  });

  it('⭐ key (1) — a letter, its delivery + screenshot, the signed read; ⛔ a person ⛔ not eligible ⇒ 409; a third letter ⇒ 409 limit_reached', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    t.auditSink.events.length = 0;
    const rec = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: '2026-09-02', tracking_number: SENTINEL.tracking },
    });
    expect(rec.statusCode, rec.body).toBe(201);
    const letter = rec.json() as { letter_id: string; sequence: number; delivered_on: string | null; overdue: boolean };
    expect(letter).toMatchObject({ sequence: 1, delivered_on: null, has_screenshot: false });
    expect(rec.body).not.toContain(SENTINEL.tracking);
    const stored = await t.pool.query<{ tracking_number_ciphertext: string; recorded_by_display: string }>(
      'SELECT tracking_number_ciphertext, recorded_by_display FROM claim_correction_letters WHERE letter_id = $1',
      [letter.letter_id],
    );
    expect(stored.rows[0]!.tracking_number_ciphertext).not.toContain(SENTINEL.tracking);
    expect(stored.rows[0]!.recorded_by_display).toBe('District Admin One');

    // The delivery — 43 days after posting: ACCEPTED and flagged overdue (⛔ never refused, `-250` #3).
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(SENTINEL.screenshot)]);
    const bad = multipart(png, 'application/pdf', '2026-10-15');
    const refused = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letter.letter_id}/delivery`, payload: bad.body, headers: { 'content-type': bad.ct } });
    expect(refused.statusCode).toBe(415);
    const mp = multipart(png, 'image/png', '2026-10-15');
    const del = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letter.letter_id}/delivery`, payload: mp.body, headers: { 'content-type': mp.ct } });
    expect(del.statusCode, del.body).toBe(201);
    expect(del.json()).toMatchObject({ delivered_on: '2026-10-15', overdue: true, has_screenshot: true });
    const shot = await da.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/${letter.letter_id}/screenshot` });
    expect(shot.statusCode).toBe(200);
    expect(shot.json()).toMatchObject({ expires_in_seconds: 300 });

    // A second letter is allowed, a third is refused.
    const second = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: '2026-10-20', tracking_number: 'T2' } });
    expect(second.statusCode).toBe(201);
    const third = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: '2026-10-21', tracking_number: 'T3' } });
    expect(third.statusCode).toBe(409);
    expect(errCode(third)).toBe('correction_letter.limit_reached');

    const types = t.auditSink.events.filter((e) => e.resourceLocator === `claim:${claimCaseId.toLowerCase()}`).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining([
      'admin_claim_correction.letter_recorded',
      'admin_claim_correction.letter_delivery_recorded',
      'admin_claim_correction.letter_screenshot_read',
    ]));
    // ⭐ AC9b — ⛔ no tracking number and ⛔ no screenshot content in any audit line or error body.
    const surfaces = JSON.stringify(t.auditSink.events) + refused.body + third.body;
    expect(surfaces).not.toContain(SENTINEL.tracking);
    expect(surfaces).not.toContain(SENTINEL.screenshot);
  });

  it('⛔ key (1) — ⛔ not letter-eligible ⇒ 409 correction_letter.not_letter_eligible', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId, { eligible: false });
    const da = await staff(pariwarId);
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: '2026-09-02', tracking_number: 'T' } });
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('correction_letter.not_letter_eligible');
  });

  it('⭐ AC16 / D28 — the bank status reports beingChecked for a STAFF case (and after a switch), ⛔ never for a family case', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId, { eligible: false });
    const op = await staff(pariwarId, 'helpline_operator');
    const status = async () => (await op.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/nominee-bank` })).json() as { correctionNeeded: boolean; beingChecked: boolean };
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: false });
    const da = await staff(pariwarId);
    expect((await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'our mistake' } })).statusCode).toBe(201);
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: true });
  });

  it('⭐ key (1) + STEP-UP — the letter form\'s address: 403 without the step-up; with it, the plaintext, and ONE audit line PER reveal', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const url = `${base(pariwarId, claimCaseId)}/letters/address?person_key=${encodeURIComponent(personKey)}`;
    const cold = await da.inject({ method: 'GET', url });
    expect(cold.statusCode).toBe(403);
    expect(cold.body).not.toContain(SENTINEL.address);
    await elevate(da, 'correction_letter_address');
    t.auditSink.events.length = 0;
    for (let i = 0; i < 2; i += 1) {
      const res = await da.inject({ method: 'GET', url });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toEqual({ person_key: personKey, address: SENTINEL.address });
    }
    const reveals = t.auditSink.events.filter((e) => e.type === 'admin_claim_correction.letter_address_revealed');
    expect(reveals).toHaveLength(2);
    expect(reveals[0]!.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
    // ⭐ AC9b — the address is in ⛔ no audit line.
    expect(JSON.stringify(t.auditSink.events)).not.toContain(SENTINEL.address);
  });
});

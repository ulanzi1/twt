// The correction-return CHASE — the District Admin's routes over HTTP (Story 6.19b; AC5, AC9b, AC16, AC11b "keys",
// "the mark", "letters"). Keys (1) `claim.record_correction_letter` and (7) `claim.change_correction_must_act`: the
// happy paths, the 409s, cross-Pariwar and non-human denial, the step-up on the address, one audit line per reveal,
// and ⭐ AC9b — a planted tracking number, screenshot marker and address appear in ⛔ no audit line, ⛔ no error body
// and ⛔ no request-log line (the test app CAPTURES the Fastify logger's output for that leg).
// ⚠ Dates are RELATIVE to today (IST): the routes refuse a letter date later than today, and the writer refuses a
// posting before the run's day 0 — so each seeded run is back-dated (`RUN_AGE_DAYS`) to leave room for a past letter.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { CLAIM_DOCUMENT_MAX_BYTES } from '@twt/contracts';
import { claim, cycleCalendar, ids } from '@twt/domain';
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
/** How far back each seeded run's day 0 is moved, so a letter can be posted and delivered in the past. */
const RUN_AGE_DAYS = 60;
const todayIst = (): string => cycleCalendar.istDateOf(new Date());
const daysFromToday = (n: number): string => cycleCalendar.addCalendarDays(todayIst(), n);

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
  // ⭐ AC9b's log leg — every request-logger line this suite's app writes.
  const logLines: string[] = [];
  const logStream = new Writable({
    write(chunk: Buffer | string, _enc, cb) {
      logLines.push(chunk.toString());
      cb();
    },
  });

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn, logStream });
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

  /** A returned, family-marked claim whose one nominee is letter-eligible (`no_target` on day 1), with a REAL address.
   * The family run's day 0 is back-dated `RUN_AGE_DAYS` (returned as `day0`). */
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
    const day0 = daysFromToday(-RUN_AGE_DAYS);
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
            pariwarId: pid, claimCaseId: cid, runId, slotDay: 1, sentOn: cycleCalendar.addCalendarDays(day0, 1), recipientKey: personKey,
            purpose: 'family_sms', subjectKey: '', outcome: 'no_target',
          });
        }
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    // TEST-ONLY back-date (`twt_app` holds ⛔ no UPDATE on `day0`; the suite's pool login does).
    if (runId !== null) await t.pool.query('UPDATE claim_correction_runs SET day0 = $2::date WHERE run_id = $1', [runId, day0]);
    return { claimCaseId: String(cid), personKey, runId, day0 };
  }

  /** Record a District Admin name check through the REAL writer, over the claim's CURRENT account stamps. */
  async function recordCheck(pariwarId: string, claimCaseId: string, verdicts: readonly ('matches' | 'does_not_match')[]): Promise<void> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    let ok = false;
    try {
      const stamps = await scopeTx.client.query<{ account_rank: number; updated_at: Date }>(
        'SELECT account_rank, updated_at FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2 ORDER BY account_rank',
        [pariwarId, claimCaseId],
      );
      const token = (await claim.getEffectiveNomineeDeclaration(scopeTx.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId))).token;
      await claim.recordNomineeNameCheck(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        nomineeDeclarationToken: token,
        accounts: stamps.rows.map((row, i) => ({
          accountRank: row.account_rank as 1 | 2,
          accountUpdatedAt: new Date(row.updated_at).toISOString(),
          verdict: verdicts[i]!,
          clericalReason: null,
        })),
        actorId: randomUUID(),
        actorDisplay: 'District Admin One',
        actor: 'operator',
      });
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /** A posted letter through the route; returns its id. */
  async function postLetter(da: Client, pariwarId: string, claimCaseId: string, personKey: string, postedOn: string, tracking = 'T1') {
    const res = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: postedOn, tracking_number: tracking },
    });
    expect(res.statusCode, res.body).toBe(201);
    return (res.json() as { letter_id: string }).letter_id;
  }

  const png = (marker: string = SENTINEL.screenshot) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(marker)]);
  async function deliver(da: Client, pariwarId: string, claimCaseId: string, letterId: string, bytes: Buffer, deliveredOn?: string, ct = 'image/png') {
    const mp = multipart(bytes, ct, deliveredOn);
    return da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/delivery`, payload: mp.body, headers: { 'content-type': mp.ct } });
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

  it('⛔ keys (1) and (7) — CROSS-PARIWAR: a District Admin of B is refused (403, the district gate fails closed) on a claim of A (⛔ no write)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarA);
    const daB = await staff(pariwarB);
    const mustAct = await daB.inject({ method: 'POST', url: `${base(pariwarB, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' } });
    expect(mustAct.statusCode).toBe(403);
    const letter = await daB.inject({
      method: 'POST', url: `${base(pariwarB, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'T1' },
    });
    expect(letter.statusCode).toBe(403);
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
  });

  it('⛔ IDOR — a FOREIGN claim (another Pariwar) on delivery / screenshot / address is 403; a FOREIGN letter or person (another claim of the SAME Pariwar) is 404 / 404 / 409', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    // Claim A1 holds a delivered letter (a screenshot); claim A2 is a sibling in the same Pariwar.
    const a1 = await returnedClaim(pariwarA);
    const a2 = await returnedClaim(pariwarA);
    const da = await staff(pariwarA);
    const letterA1 = await postLetter(da, pariwarA, a1.claimCaseId, a1.personKey, daysFromToday(-10));
    expect((await deliver(da, pariwarA, a1.claimCaseId, letterA1, png(), daysFromToday(-2))).statusCode).toBe(201);
    const keysBefore = t.claimDocumentStorage.store.size;

    // ⛔ Another Pariwar's District Admin, through THEIR Pariwar's URL: the claim resolves ⛔ no district ⇒ 403.
    const daB = await staff(pariwarB);
    await elevate(daB, 'correction_letter_address');
    const bDelivery = await deliver(daB, pariwarB, a1.claimCaseId, letterA1, png(), daysFromToday(-1));
    expect(bDelivery.statusCode).toBe(403);
    const bShot = await daB.inject({ method: 'GET', url: `${base(pariwarB, a1.claimCaseId)}/letters/${letterA1}/screenshot` });
    expect(bShot.statusCode).toBe(403);
    const bAddress = await daB.inject({ method: 'GET', url: `${base(pariwarB, a1.claimCaseId)}/letters/address?person_key=${encodeURIComponent(a1.personKey)}` });
    expect(bAddress.statusCode).toBe(403);
    expect(bAddress.body).not.toContain(SENTINEL.address);

    // ⛔ The SAME Pariwar's District Admin, A1's letter under A2's URL: the letter is ⛔ not A2's.
    const crossDelivery = await deliver(da, pariwarA, a2.claimCaseId, letterA1, png(), daysFromToday(-1));
    expect(crossDelivery.statusCode).toBe(404);
    expect(errCode(crossDelivery)).toBe('correction_letter.not_found');
    const crossShot = await da.inject({ method: 'GET', url: `${base(pariwarA, a2.claimCaseId)}/letters/${letterA1}/screenshot` });
    expect(crossShot.statusCode).toBe(404);
    expect(errCode(crossShot)).toBe('correction_letter.no_screenshot');
    expect(crossShot.body).not.toContain('memory://');
    // A1's person under A2's URL — ⛔ not one of A2's people.
    await elevate(da, 'correction_letter_address');
    const crossAddress = await da.inject({ method: 'GET', url: `${base(pariwarA, a2.claimCaseId)}/letters/address?person_key=${encodeURIComponent(a1.personKey)}` });
    expect(crossAddress.statusCode).toBe(409);
    expect(errCode(crossAddress)).toBe('correction_letter.not_letter_eligible');
    expect(crossAddress.body).not.toContain(SENTINEL.address);
    // ⛔ Nothing stored by any refused upload.
    expect(t.claimDocumentStorage.store.size).toBe(keysBefore);
  });

  it('⛔ keys (1) and (7) — NON-HUMAN / wrong role: ⛔ no admin session ⇒ 401; a helpline operator (⛔ neither key) ⇒ 403', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const anon = await t.app.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' }, headers: { origin: 'http://localhost:3001' } });
    expect([401, 403]).toContain(anon.statusCode);
    const op = await staff(pariwarId, 'helpline_operator');
    expect((await op.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'n' } })).statusCode).toBe(403);
    expect(
      (await op.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'T' } })).statusCode,
    ).toBe(403);
  });

  it('⭐ key (1) — a letter, its delivery + screenshot, the signed read (no-store); a second letter after the first\'s delivery; a third ⇒ 409 limit_reached', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    t.auditSink.events.length = 0;
    const logFrom = logLines.length;
    const rec = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: daysFromToday(-50), tracking_number: SENTINEL.tracking },
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

    // The delivery — 45 days after posting: ACCEPTED and flagged overdue (⛔ never refused, `-250` #3). The path's
    // letter id is UPPER-cased: the storage key and the audit line carry the canonical lower-case id.
    const refused = await deliver(da, pariwarId, claimCaseId, letter.letter_id, png(), daysFromToday(-5), 'application/pdf');
    expect(refused.statusCode).toBe(415);
    const del = await deliver(da, pariwarId, claimCaseId, letter.letter_id.toUpperCase(), png(), daysFromToday(-5));
    expect(del.statusCode, del.body).toBe(201);
    expect(del.json()).toMatchObject({ delivered_on: daysFromToday(-5), overdue: true, has_screenshot: true });
    const keys = [...t.claimDocumentStorage.store.keys()].filter((k) => k.includes(`/claim/${claimCaseId.toLowerCase()}/correction-letter/`));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain(`/correction-letter/${letter.letter_id.toLowerCase()}/`);
    const shot = await da.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/${letter.letter_id}/screenshot` });
    expect(shot.statusCode).toBe(200);
    expect(shot.json()).toMatchObject({ expires_in_seconds: 300 });
    // ⛔ A signed read URL is never cached.
    expect(shot.headers['cache-control']).toBe('no-store');

    // A second letter is allowed (the first is delivered), a third is refused.
    const second = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: daysFromToday(-3), tracking_number: 'T2' } });
    expect(second.statusCode, second.body).toBe(201);
    const third = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: daysFromToday(-2), tracking_number: 'T3' } });
    expect(third.statusCode).toBe(409);
    expect(errCode(third)).toBe('correction_letter.limit_reached');

    const lines = t.auditSink.events.filter((e) => e.resourceLocator === `claim:${claimCaseId.toLowerCase()}`);
    expect(lines.map((e) => e.type)).toEqual(expect.arrayContaining([
      'admin_claim_correction.letter_recorded',
      'admin_claim_correction.letter_delivery_recorded',
      'admin_claim_correction.letter_screenshot_read',
    ]));
    const deliveryLine = lines.find((e) => e.type === 'admin_claim_correction.letter_delivery_recorded');
    expect(deliveryLine?.context).toMatchObject({ letter_id: letter.letter_id.toLowerCase() });
    // ⭐ AC9b — ⛔ no tracking number and ⛔ no screenshot content in any audit line, error body or request-log line.
    const logs = logLines.slice(logFrom).join('\n');
    expect(logs, 'non-vacuity: the request logger captured this test\'s requests').toContain('correction/letters');
    const surfaces = JSON.stringify(t.auditSink.events) + refused.body + third.body + logs;
    expect(surfaces).not.toContain(SENTINEL.tracking);
    expect(surfaces).not.toContain(SENTINEL.screenshot);
  });

  it('⛔ key (1) — `-231` D: a second letter while the first has ⛔ no recorded delivery ⇒ 409 correction_letter.first_not_delivered', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    await postLetter(da, pariwarId, claimCaseId, personKey, daysFromToday(-20));
    const second = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: daysFromToday(-1), tracking_number: 'T2' } });
    expect(second.statusCode).toBe(409);
    expect(errCode(second)).toBe('correction_letter.first_not_delivered');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(1);
  });

  it('⛔ key (1) — the letter dates: posted before the run\'s day 0 ⇒ 409 posted_before_run; posted or delivered LATER than today ⇒ 400 date_in_future', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey, day0 } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const early = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: cycleCalendar.addCalendarDays(day0, -1), tracking_number: 'T' },
    });
    expect(early.statusCode).toBe(409);
    expect(errCode(early)).toBe('correction_letter.posted_before_run');
    const future = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: daysFromToday(1), tracking_number: 'T' },
    });
    expect(future.statusCode).toBe(400);
    expect(errCode(future)).toBe('correction_letter.date_in_future');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);

    const letterId = await postLetter(da, pariwarId, claimCaseId, personKey, todayIst());
    const before = t.claimDocumentStorage.store.size;
    const futureDelivery = await deliver(da, pariwarId, claimCaseId, letterId, png(), daysFromToday(1));
    expect(futureDelivery.statusCode).toBe(400);
    expect(errCode(futureDelivery)).toBe('correction_letter.date_in_future');
    expect(t.claimDocumentStorage.store.size, 'the date is refused BEFORE the bytes are stored').toBe(before);
  });

  it('⛔ key (1) — the upload\'s edges: oversize ⇒ 413, empty ⇒ 400, a missing / impossible delivered_on ⇒ 400, a delivery before the posting ⇒ 400 (the orphan deleted), a second delivery ⇒ 409', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const letterId = await postLetter(da, pariwarId, claimCaseId, personKey, daysFromToday(-10));
    const prefix = `/claim/${claimCaseId.toLowerCase()}/correction-letter/`;
    const stored = () => [...t.claimDocumentStorage.store.keys()].filter((k) => k.includes(prefix));

    const oversize = await deliver(da, pariwarId, claimCaseId, letterId, Buffer.alloc(CLAIM_DOCUMENT_MAX_BYTES + 1, 0x41), daysFromToday(-2));
    expect(oversize.statusCode).toBe(413);
    expect(errCode(oversize)).toBe('correction_letter.too_large');
    const empty = await deliver(da, pariwarId, claimCaseId, letterId, Buffer.alloc(0), daysFromToday(-2));
    expect(empty.statusCode).toBe(400);
    expect(errCode(empty)).toBe('correction_letter.empty');
    const missing = await deliver(da, pariwarId, claimCaseId, letterId, png());
    expect(missing.statusCode).toBe(400);
    expect(errCode(missing)).toBe('correction_letter.delivered_on_required');
    const impossible = await deliver(da, pariwarId, claimCaseId, letterId, png(), '2026-02-30');
    expect(impossible.statusCode).toBe(400);
    expect(errCode(impossible)).toBe('correction_letter.delivered_on_required');
    expect(stored(), 'every refusal above lands BEFORE the put').toHaveLength(0);

    // The writer's refusal comes AFTER the put — the orphan is deleted.
    const beforePosting = await deliver(da, pariwarId, claimCaseId, letterId, png(), daysFromToday(-11));
    expect(beforePosting.statusCode).toBe(400);
    expect(errCode(beforePosting)).toBe('correction_letter.delivered_before_posted');
    expect(stored(), 'the screenshot of a refused delivery is deleted').toHaveLength(0);

    expect((await deliver(da, pariwarId, claimCaseId, letterId, png(), daysFromToday(-2))).statusCode).toBe(201);
    const again = await deliver(da, pariwarId, claimCaseId, letterId, png(), daysFromToday(-1));
    expect(again.statusCode).toBe(409);
    expect(errCode(again)).toBe('correction_letter.already_delivered');
    expect(stored()).toHaveLength(1);
  });

  it('⛔ key (1) — ⛔ not letter-eligible ⇒ 409 correction_letter.not_letter_eligible', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId, { eligible: false });
    const da = await staff(pariwarId);
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'T' } });
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('correction_letter.not_letter_eligible');
  });

  it('⭐ AC16 / D28 — the bank status reports beingChecked for a STAFF case (after a switch); a FAMILY case whose part is ⛔ not done reads false', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId, { eligible: false });
    const op = await staff(pariwarId, 'helpline_operator');
    const status = async () => (await op.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/nominee-bank` })).json() as { correctionNeeded: boolean; beingChecked: boolean };
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: false });
    const da = await staff(pariwarId);
    expect((await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: 'our mistake' } })).statusCode).toBe(201);
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: true });
  });

  it('⭐ `-268` §2 — a FAMILY case whose part is DONE (every account rewritten after the return) reads beingChecked; a staff `does_not_match` after the rewrite turns it back off', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId, { eligible: false });
    const op = await staff(pariwarId, 'helpline_operator');
    const status = async () => (await op.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/nominee-bank` })).json() as { correctionNeeded: boolean; beingChecked: boolean };
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: false });
    // The family's rewrite — TEST-ONLY: both accounts stamped AFTER the (committed) return.
    await t.pool.query('UPDATE claim_nominee_bank_accounts SET updated_at = clock_timestamp() WHERE claim_case_id = $1', [claimCaseId]);
    expect(await status(), 'family mark + the family\'s part done ⇒ "we are checking"').toMatchObject({ correctionNeeded: true, beingChecked: true });
    // A staff check AFTER the rewrite that still finds a mismatch ⇒ the family's part is ⛔ not done any more.
    await recordCheck(pariwarId, claimCaseId, ['matches', 'does_not_match']);
    expect(await status()).toMatchObject({ correctionNeeded: true, beingChecked: false });
  });

  it('⭐ the Pariwar Admin\'s ESCALATED filter — scans past the caller\'s page, slices to `limit`, and decrypts + audits ONLY the returned rows', async () => {
    const pariwarId = randomUUID();
    // Oldest → newest: A (escalated), B (escalated), C (⛔ not). The queue is newest-first.
    const a = await returnedClaim(pariwarId);
    const b = await returnedClaim(pariwarId);
    const c = await returnedClaim(pariwarId);
    for (const x of [a, b]) {
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      let ok = false;
      try {
        await claim.insertFinalCorrectionReminder(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarId), claimCaseId: ids.claimId(x.claimCaseId), runId: x.runId!, slotDay: 14,
          sentOn: todayIst(), recipientKey: `staff:${randomUUID()}`, purpose: 'escalation', subjectKey: x.personKey, outcome: 'recorded',
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    }
    const da = await staff(pariwarId);
    const queue = async (qs: string) => {
      t.auditSink.events.length = 0;
      const res = await da.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction${qs}` });
      expect(res.statusCode, res.body).toBe(200);
      const items = (res.json() as { items: { claim_case_id: string; correction_chase: { escalated: boolean } }[] }).items;
      const noteLines = t.auditSink.events
        .filter((e) => e.type === 'admin_nominee_name_check.queue_note_read')
        .map((e) => e.resourceLocator);
      return { ids: items.map((i) => i.claim_case_id), items, noteLines };
    };

    // The unfiltered page of one is C — the escalations are both OUTSIDE it.
    expect((await queue('?limit=1')).ids).toEqual([c.claimCaseId]);
    // ⭐ The filter still finds them, and slices AFTER filtering.
    const one = await queue('?escalated=true&limit=1');
    expect(one.ids).toEqual([b.claimCaseId]);
    expect(one.items[0]!.correction_chase.escalated).toBe(true);
    // ⛔ ONE note line — for the row returned, ⛔ not for A (filtered out by the page) or C (by the filter).
    expect(one.noteLines).toEqual([`claim:${b.claimCaseId.toLowerCase()}`]);
    const both = await queue('?escalated=true');
    expect(both.ids).toEqual([b.claimCaseId, a.claimCaseId]);
    expect([...both.noteLines].sort()).toEqual([`claim:${a.claimCaseId.toLowerCase()}`, `claim:${b.claimCaseId.toLowerCase()}`].sort());
    // Unfiltered, every row is returned — and every row's note is audited.
    expect((await queue('')).noteLines).toHaveLength(3);
  });

  it('⭐ key (1) + STEP-UP — the letter form\'s address: 403 without the step-up; with it, the plaintext (no-store), and ONE audit line PER reveal', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const url = `${base(pariwarId, claimCaseId)}/letters/address?person_key=${encodeURIComponent(personKey)}`;
    const cold = await da.inject({ method: 'GET', url });
    expect(cold.statusCode).toBe(403);
    expect(cold.body).not.toContain(SENTINEL.address);
    await elevate(da, 'correction_letter_address');
    t.auditSink.events.length = 0;
    const logFrom = logLines.length;
    for (let i = 0; i < 2; i += 1) {
      const res = await da.inject({ method: 'GET', url });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toEqual({ person_key: personKey, address: SENTINEL.address });
      // ⛔ A Tier-1 read is never cached.
      expect(res.headers['cache-control']).toBe('no-store');
    }
    const reveals = t.auditSink.events.filter((e) => e.type === 'admin_claim_correction.letter_address_revealed');
    expect(reveals).toHaveLength(2);
    expect(reveals[0]!.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
    // ⭐ AC9b — the address is in ⛔ no audit line and ⛔ no request-log line.
    expect(JSON.stringify(t.auditSink.events)).not.toContain(SENTINEL.address);
    const logs = logLines.slice(logFrom).join('\n');
    expect(logs, 'non-vacuity: the request logger captured the reveals').toContain('letters/address');
    expect(logs).not.toContain(SENTINEL.address);
  });

  it('⭐ AC9b — the must-act note is in ⛔ no request-log line', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const logFrom = logLines.length;
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: SENTINEL.note } });
    expect(res.statusCode).toBe(201);
    const logs = logLines.slice(logFrom).join('\n');
    expect(logs).toContain('correction/must-act');
    expect(logs).not.toContain('zqxw');
  });
});

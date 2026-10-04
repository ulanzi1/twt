// The REPLACEMENT-CERTIFICATE reminder over HTTP (Story 6.19d; AC4, AC5, AC8; `2026-10-03-276` CR6, CR9, CR11). Key (1)
// on every route: the list (gated by `resolveQueueScopeStash` + `requirePermissionHook` + the per-row district filter),
// the ONE letter per person per claim (`-275` Q1 A) and per NUMBER (CR6), every refusal's code, the delivery + screenshot,
// BOTH step-ups, cross-Pariwar and non-human denial, the audit locator, and the list's row set (an owed letter on an
// ENDED run is listed; a paused run on `approved` with ⛔ no owed letter is hidden). ⭐ REAL envelopes (6.19b slice trap
// S5): the nominee mobiles and the address are encrypted under the app's own KMS deps. The domain specs prove the order of
// every refusal and the races; this suite proves the WIRING.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, encryption, ids, nominee, schema, bindScopedDb } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { MEMBER_NOMINEE_FIELD_CLASS } from '../../../src/context.js';
import { encryptClaimContactField } from '../../../src/modules/claims/claim-contact-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Role = 'district_admin' | 'pariwar_admin' | 'helpline_operator';
const DISTRICT = 'Kanpur Nagar';
const SENTINEL_ADDRESS = 'Sentinel Certificate House 9, Qzwx Lane';
const todayIst = (): string => cycleCalendar.istDateOf(new Date());
const daysFromToday = (n: number): string => cycleCalendar.addCalendarDays(todayIst(), n);
const errCode = (res: { json: () => unknown }): string | undefined => (res.json() as { error?: { code?: string } }).error?.code;

function multipart(bytes: Buffer, contentType: string, deliveredOn: string): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  return {
    body: Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="delivered_on"\r\n\r\n${deliveredOn}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.png"\r\nContent-Type: ${contentType}\r\n\r\n`),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    ct: `multipart/form-data; boundary=${boundary}`,
  };
}

describe.skipIf(!hasDatabase)('the certificate reminder — routes (Story 6.19d)', { timeout: 30000 }, () => {
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

  async function authenticate(display: string): Promise<{ client: Client; userId: string }> {
    const email = `certificate-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(t.deps, { email, password });
    createdUserIds.push(userId);
    await t.pool.query('UPDATE users SET display_name = $2 WHERE id = $1', [userId, display]);
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

  async function staff(pariwarId: string, role: Role, district: string = DISTRICT): Promise<{ client: Client; userId: string }> {
    const { client, userId } = await authenticate(`${role} ${randomUUID().slice(0, 8)}`);
    const [dimension, value] = role === 'district_admin' ? ['district', district] : ['pariwar', pariwarId];
    await t.pool.query(
      'INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)',
      [userId, pariwarId, role, dimension, value],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  async function elevate(client: Client, context: string): Promise<void> {
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: context } })).statusCode).toBe(200);
    const code = t.adminStepUpDelivery.last?.code as string;
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } })).statusCode).toBe(200);
  }

  async function asReplica(fn: (c: import('pg').PoolClient) => Promise<void>): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await fn(c);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  }

  /**
   * A claim being CHECKED with a REJECTED certificate, N nominees (REAL mobile envelopes) on a contact record (a REAL
   * address), the deceased posted at `DISTRICT`, an OPEN `rejected` run — and, per `deadFor`, each such person's CURRENT
   * number found dead on day 1 (letter-eligible).
   */
  async function certificateClaim(pariwarId: string, opts: { mobiles?: readonly string[]; deadFor?: 'all' | 'first' | 'none' } = {}) {
    const cid = ids.claimId(randomUUID());
    const mid = ids.memberId(randomUUID());
    const pid = ids.pariwarId(pariwarId);
    const mobiles = opts.mobiles ?? ['+919812345678'];
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
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1) ON CONFLICT DO NOTHING`, [mid, pariwarId]);
    await t.pool.query('INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())', [mid, pariwarId, DISTRICT]);

    const address = await encryptClaimContactField(SENTINEL_ADDRESS, pariwarId, t.deps.encryption);
    scopeTx = await openScopeTx(t.deps, pariwarId);
    let people: claim.CertificatePerson[] = [];
    let runId = '';
    try {
      const db = bindScopedDb(scopeTx.client);
      const { ranks } = nominee.deriveNomineeSplit(mobiles.length);
      const rows = await Promise.all(
        mobiles.map(async (m, i) => ({
          rank: ranks[i]!.rank,
          splitPct: ranks[i]!.splitPct,
          relationship: i === 0 ? 'spouse' : 'son',
          nameCiphertext: 'enc:v1:nominee-name',
          mobileCiphertext: encryption.serializeEnvelope(
            await encryption.encryptTier1(Buffer.from(m, 'utf-8'), { pariwarId, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, t.deps.encryption.kms, t.deps.encryption.kekRef),
          ),
          addressCiphertext: null,
        })),
      );
      await nominee.replaceMemberNominees(db, { memberId: mid, pariwarId: pid, nominees: rows });
      const plan = nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(db, pid, mid), rows.map((r) => r.rank));
      const appended = await nominee.appendMemberDeclarationVersions(db, {
        memberId: mid, pariwarId: pid, plan, nominees: rows, recordedAt: new Date('2026-01-05T06:00:00.000Z'), eventVersion: null,
      });
      const versions = appended.map((a: { versionId: string }) => a.versionId as string);
      const [agreement] = await db
        .insert(schema.consentRecords)
        .values({
          subjectId: mid, pariwarId: pid, consentType: 'claim_contact_agreement', consentArtifactRef: cid, grantedViaActor: 'member_self',
          consentPayload: { checkboxTextShown: 'fixture', locale: 'en' }, grantedAt: new Date(Date.now() - 60_000),
        } as never)
        .returning({ consentId: schema.consentRecords.consentId });
      const [contact] = await db
        .insert(schema.claimContacts)
        .values({
          claimCaseId: cid, pariwarId: pid, deceasedMemberId: mid, claimantNomineeVersionId: versions[0] as never,
          agreementConsentId: agreement!.consentId, contactLocale: 'hi', recordedByActor: 'fixture', recordedVia: 'helpline',
        })
        .returning({ contactId: schema.claimContacts.contactId });
      for (const v of versions) {
        await db.insert(schema.claimContactNominees).values({
          contactId: contact!.contactId, claimCaseId: cid, pariwarId: pid, nomineeVersionId: v as never, addressCiphertext: address, relationship: null,
        });
      }
      const docId = randomUUID();
      const uploadId = randomUUID();
      const key = `pariwar/${pid}/claim/${cid}/death_certificate/${docId}/${uploadId}`;
      await db.insert(schema.claimDocuments).values({
        claimDocumentId: docId as never, claimCaseId: cid, pariwarId: pid, documentType: 'death_certificate', storageObjectKey: key,
        contentType: 'application/pdf', byteSize: 1024, parityOutcome: 'match', parityFlags: {}, ocrConfidence: 0.9, verifierReviewRequired: false,
      });
      await db.insert(schema.claimDeathCertificateUploads).values({
        uploadId: uploadId as never, claimCaseId: cid, pariwarId: pid, deceasedMemberId: mid, claimDocumentId: docId as never, storageObjectKey: key,
        contentType: 'application/pdf', byteSize: 1024, channel: 'helpline', uploadedByActorId: null, uploadedAt: new Date(),
        parityOutcome: 'match', parityFlags: {}, ocrConfidence: 0.9,
      });
      await claim.recordDeathCertificateReview(scopeTx.client, {
        claimCaseId: cid, pariwarId: pid, verdict: 'rejected', certificateToken: uploadId, acceptedDate: null, acceptedDateCiphertext: null,
        rejectionReason: 'no_date_of_death', noteCiphertext: 'enc:v1:review-note', expectedLiveReviewId: null, actorId: randomUUID(),
        actorDisplay: 'Test District Admin', actor: 'operator',
      } as never);
      const facts = await claim.readCertificatePlanFacts(scopeTx.tx, pid, cid);
      const planned = claim.planCertificateRun(facts!, todayIst());
      if (planned.kind !== 'open') throw new Error(`fixture: expected an open plan, got ${planned.kind}`);
      await claim.lockCertificateClaim(scopeTx.tx, pid, cid);
      const opened = await claim.openCertificateRun(scopeTx.client, { pariwarId: pid, claimCaseId: cid, plan: planned, today: todayIst() });
      if (opened.status !== 'opened') throw new Error('fixture: run not opened');
      runId = opened.run.runId;
      people = [...(await claim.readCertificateRecipients(scopeTx.tx, pid, cid)).people];
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    const dead = opts.deadFor ?? 'all';
    const targets = dead === 'all' ? people : dead === 'first' ? people.slice(0, 1) : [];
    for (const [i, p] of targets.entries()) {
      const hash = await claim.currentCorrectionNumberHash(p.mobileCiphertext, p.mobileSource, pariwarId, t.deps.encryption);
      await t.pool.query(
        `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_version_id, recipient_number_hash)
         VALUES ($1, $2, $3, $4, $5, $6, 'family_sms', 'rejected_invalid_number', $7, $8)`,
        [runId, cid, pariwarId, 1 + i, todayIst(), p.personKey, p.versionId, hash],
      );
    }
    return { claimCaseId: String(cid), people, runId };
  }

  const base = (pariwarId: string, claimCaseId: string) => `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/certificate-reminders`;
  const listUrl = (pariwarId: string) => `/api/v1/p/${pariwarId}/admin/certificate-reminders`;
  const post = (client: Client, pariwarId: string, claimCaseId: string, personKey: string, extra: Record<string, unknown> = {}) =>
    client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'EE123456789IN', ...extra },
    });

  it('⭐ the LIST — the District Admin sees the claim by short reference, each person by POSITION and role (⛔ no name), their state; another district sees ⛔ none of it', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, people } = await certificateClaim(pariwarId, { mobiles: ['+919812345678', '+919898989898'], deadFor: 'first' });
    const da = await staff(pariwarId, 'district_admin');
    t.auditSink.events.length = 0;
    const list = await da.client.inject({ method: 'GET', url: `${listUrl(pariwarId)}?limit=20` });
    expect(list.statusCode, list.body).toBe(200);
    const item = (list.json() as { items: { claim_case_id: string }[] }).items.find((i) => i.claim_case_id === claimCaseId) as Record<string, unknown>;
    expect(item).toMatchObject({
      short_reference: claim.claimShortReference(claimCaseId),
      cause: 'rejected',
      run_state: 'open',
      run_day: 0,
      next_reminder_on: daysFromToday(1),
      cannot_remind: null,
    });
    const listed = item['people'] as { person_key: string; position: string; role: string; sms_state: string; letter_eligible: boolean }[];
    expect(listed.map((p) => [p.position, p.role])).toEqual([['A', 'nominee'], ['B', 'nominee']]);
    expect(listed.find((p) => p.person_key === people[0]!.personKey)).toMatchObject({ sms_state: 'number_not_working', letter_eligible: true });
    expect(list.body).not.toContain('Qzwx');
    expect(t.auditSink.events.some((e) => e.type === 'admin_claim_certificate_reminder.list_read')).toBe(true);

    const elsewhere = await staff(pariwarId, 'district_admin', 'Lucknow');
    const theirs = await elsewhere.client.inject({ method: 'GET', url: listUrl(pariwarId) });
    expect(theirs.statusCode, theirs.body).toBe(200);
    expect((theirs.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id)).not.toContain(claimCaseId);
    // Key (1)'s denial for a role without it (the gate, ⛔ an empty 200).
    const op = await staff(pariwarId, 'helpline_operator');
    expect((await op.client.inject({ method: 'GET', url: listUrl(pariwarId) })).statusCode).toBe(403);
  });

  it('⭐ code review round 2 — `truncated` is SET when the page `limit` drops a visible claim (⛔ only the scan cap before), clear when nothing is dropped', async () => {
    const pariwarId = randomUUID();
    const first = await certificateClaim(pariwarId);
    const second = await certificateClaim(pariwarId);
    const da = await staff(pariwarId, 'district_admin');
    const cut = await da.client.inject({ method: 'GET', url: `${listUrl(pariwarId)}?limit=1` });
    expect(cut.statusCode, cut.body).toBe(200);
    expect(cut.json()).toMatchObject({ truncated: true });
    expect((cut.json() as { items: unknown[] }).items).toHaveLength(1);
    const whole = await da.client.inject({ method: 'GET', url: `${listUrl(pariwarId)}?limit=20` });
    expect(whole.json()).toMatchObject({ truncated: false });
    expect((whole.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id)).toEqual(
      expect.arrayContaining([first.claimCaseId, second.claimCaseId]),
    );
  });

  it('⭐ the ONE letter (CR9) — the address behind a FRESH step-up, recorded once (`-275` Q1 A), delivered once with a screenshot behind the SAME step-up; every audit line names the claim', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, people } = await certificateClaim(pariwarId);
    const personKey = people[0]!.personKey;
    const da = await staff(pariwarId, 'district_admin');
    t.auditSink.events.length = 0;

    const addressUrl = `${base(pariwarId, claimCaseId)}/letters/address?person_key=${encodeURIComponent(personKey)}`;
    const unelevated = await da.client.inject({ method: 'GET', url: addressUrl });
    expect(unelevated.statusCode).toBe(403);
    expect(errCode(unelevated)).toBe('auth.step_up_required');
    await elevate(da.client, 'certificate_letter_address');
    const address = await da.client.inject({ method: 'GET', url: addressUrl });
    expect(address.statusCode, address.body).toBe(200);
    expect(address.json()).toEqual({ person_key: personKey, address: SENTINEL_ADDRESS });
    expect(address.headers['cache-control']).toBe('no-store');

    const future = await post(da.client, pariwarId, claimCaseId, personKey, { posted_on: daysFromToday(1) });
    expect(future.statusCode).toBe(400);
    expect(errCode(future)).toBe('certificate_letter.date_in_future');
    const posted = await post(da.client, pariwarId, claimCaseId, personKey);
    expect(posted.statusCode, posted.body).toBe(201);
    const letterId = (posted.json() as { letter_id: string }).letter_id;
    expect(posted.json()).toMatchObject({ person_key: personKey, posted_on: todayIst(), delivered_on: null, overdue: false, has_screenshot: false });
    const noShotYet = await da.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/screenshot` });
    expect(noShotYet.statusCode, noShotYet.body).toBe(404);
    expect(errCode(noShotYet)).toBe('certificate_letter.no_screenshot');
    const second = await post(da.client, pariwarId, claimCaseId, personKey);
    expect(errCode(second)).toBe('certificate_letter.already_recorded');
    const stored = await t.pool.query<{ tracking_number_ciphertext: string }>('SELECT tracking_number_ciphertext FROM claim_certificate_reminder_letters WHERE letter_id = $1', [letterId]);
    expect(stored.rows[0]!.tracking_number_ciphertext.startsWith('enc:v1:')).toBe(true);
    expect(stored.rows[0]!.tracking_number_ciphertext).not.toContain('EE123456789IN');

    // ⭐ The orphan-cleanup compensating action (code review round 2 — the earlier `already_delivered` probe was
    // refused by the handler's pre-check BEFORE any upload, so it could not fail). `delivered_before_posted` is the
    // DOMAIN's refusal, AFTER the screenshot is already in storage: the upload must happen AND be deleted again.
    const storeSizeBeforeOrphan = t.claimDocumentStorage.store.size;
    const putSpy = vi.spyOn(t.claimDocumentStorage, 'put');
    // `delete` is OPTIONAL on the port type; the in-memory store always has it.
    const deleteSpy = vi.spyOn(t.claimDocumentStorage as Required<typeof t.claimDocumentStorage>, 'delete');
    const before = multipart(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('proof')]), 'image/png', daysFromToday(-1));
    const early = await da.client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/delivery`, payload: before.body, headers: { 'content-type': before.ct } });
    expect(errCode(early)).toBe('certificate_letter.delivered_before_posted');
    expect(putSpy, 'the screenshot was uploaded before the refused write').toHaveBeenCalledTimes(1);
    const orphanKey = putSpy.mock.calls[0]![0];
    expect(orphanKey).toContain(`/certificate-letter/${letterId}/`);
    expect(deleteSpy).toHaveBeenCalledWith(orphanKey);
    expect(t.claimDocumentStorage.store.has(orphanKey), 'the orphaned upload must be deleted, not left behind').toBe(false);
    expect(t.claimDocumentStorage.store.size).toBe(storeSizeBeforeOrphan);
    putSpy.mockRestore();
    deleteSpy.mockRestore();
    const mp = multipart(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('proof')]), 'image/png', todayIst());
    const delivered = await da.client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/delivery`, payload: mp.body, headers: { 'content-type': mp.ct } });
    expect(delivered.statusCode, delivered.body).toBe(201);
    expect(delivered.json()).toMatchObject({ letter_id: letterId, delivered_on: todayIst(), has_screenshot: true });
    const keys = await t.pool.query<{ screenshot_storage_key: string }>('SELECT screenshot_storage_key FROM claim_certificate_reminder_letters WHERE letter_id = $1', [letterId]);
    expect(keys.rows[0]!.screenshot_storage_key).toContain(`/certificate-letter/${letterId}/`);
    // A second delivery is refused by the handler's pre-check BEFORE any upload — ⛔ nothing reaches storage.
    const storeSizeBeforeAgain = t.claimDocumentStorage.store.size;
    const mp2 = multipart(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png', todayIst());
    const again = await da.client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/delivery`, payload: mp2.body, headers: { 'content-type': mp2.ct } });
    expect(errCode(again)).toBe('certificate_letter.already_delivered');
    expect(t.claimDocumentStorage.store.size).toBe(storeSizeBeforeAgain);

    const other = await staff(pariwarId, 'district_admin');
    const unelevatedShot = await other.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/screenshot` });
    expect(unelevatedShot.statusCode).toBe(403);
    expect(errCode(unelevatedShot)).toBe('auth.step_up_required');
    const shot = await da.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/${letterId}/screenshot` });
    expect(shot.statusCode, shot.body).toBe(200);

    for (const type of [
      'admin_claim_certificate_reminder.letter_address_revealed',
      'admin_claim_certificate_reminder.letter_recorded',
      'admin_claim_certificate_reminder.letter_delivery_recorded',
      'admin_claim_certificate_reminder.letter_screenshot_read',
    ]) {
      expect(t.auditSink.events.find((e) => e.type === type)?.resourceLocator, type).toBe(`claim:${claimCaseId.toLowerCase()}`);
    }
    expect(JSON.stringify(t.auditSink.events)).not.toContain('Qzwx');
    expect(JSON.stringify(t.auditSink.events)).not.toContain('EE123456789IN');
  });

  it('⛔ the refusals — a person whose number was ⛔ never found dead is `not_letter_eligible`; a SECOND person at the SAME number is `already_recorded` (CR6)', async () => {
    const pariwarId = randomUUID();
    const da = await staff(pariwarId, 'district_admin');
    const a = await certificateClaim(pariwarId, { mobiles: ['+919812345678', '+919898989898'], deadFor: 'first' });
    const notDead = await post(da.client, pariwarId, a.claimCaseId, a.people[1]!.personKey);
    expect(errCode(notDead)).toBe('certificate_letter.not_letter_eligible');
    const same = await certificateClaim(pariwarId, { mobiles: ['+919811111111', '+919811111111'], deadFor: 'all' });
    expect((await post(da.client, pariwarId, same.claimCaseId, same.people[0]!.personKey)).statusCode).toBe(201);
    const twin = await post(da.client, pariwarId, same.claimCaseId, same.people[1]!.personKey);
    expect(errCode(twin)).toBe('certificate_letter.already_recorded');
  });

  it('⭐ the list\'s ROW SET — an owed letter on an ENDED run is listed; a paused run on `approved` with ⛔ no owed letter is hidden', async () => {
    const pariwarId = randomUUID();
    const da = await staff(pariwarId, 'district_admin');
    const owed = await certificateClaim(pariwarId);
    await t.pool.query(`UPDATE claim_certificate_reminder_runs SET ended_at = now(), end_reason = 'certificate_received' WHERE run_id = $1`, [owed.runId]);
    const quiet = await certificateClaim(pariwarId, { deadFor: 'none' });
    await asReplica(async (c) => {
      await c.query(`UPDATE claims SET current_state = 'approved' WHERE claim_case_id = $1`, [quiet.claimCaseId]);
    });
    const list = await da.client.inject({ method: 'GET', url: listUrl(pariwarId) });
    expect(list.statusCode, list.body).toBe(200);
    const items = (list.json() as { items: { claim_case_id: string; run_state: string }[] }).items;
    expect(items.find((i) => i.claim_case_id === owed.claimCaseId)).toMatchObject({ run_state: 'ended' });
    expect(items.map((i) => i.claim_case_id)).not.toContain(quiet.claimCaseId);
  });

  it('⛔ CROSS-PARIWAR — a District Admin of B is refused on a claim of A, and ⛔ nothing is written', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const { claimCaseId, people } = await certificateClaim(pariwarA);
    const daB = await staff(pariwarB, 'district_admin');
    const res = await post(daB.client, pariwarB, claimCaseId, people[0]!.personKey);
    // Pinned to the ONE deterministic code (6.19c's review lesson — ⛔ a tolerated `[403, 404]`): the claim of A resolves
    // ⛔ no district in B's scope, so the district gate fails CLOSED.
    expect(res.statusCode, res.body).toBe(403);
    expect(errCode(res)).toBe('authz.forbidden');
    expect((await t.pool.query('SELECT 1 FROM claim_certificate_reminder_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
    const list = await daB.client.inject({ method: 'GET', url: listUrl(pariwarB) });
    expect((list.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id)).not.toContain(claimCaseId);
  });

  it('⛔ every route — NON-HUMAN: ⛔ no admin session ⇒ 401/403 (⛔ never a 2xx)', async () => {
    const pariwarId = randomUUID();
    const c = randomUUID();
    const d = randomUUID();
    const routes: { method: 'GET' | 'POST'; url: string; payload?: unknown }[] = [
      { method: 'GET', url: listUrl(pariwarId) },
      { method: 'POST', url: `${base(pariwarId, c)}/letters`, payload: { person_key: 'claimant', posted_on: todayIst(), tracking_number: 'T' } },
      { method: 'POST', url: `${base(pariwarId, c)}/letters/${d}/delivery`, payload: {} },
      { method: 'GET', url: `${base(pariwarId, c)}/letters/address?person_key=claimant` },
      { method: 'GET', url: `${base(pariwarId, c)}/letters/${d}/screenshot` },
    ];
    for (const r of routes) {
      const res = await t.app.inject({ method: r.method, url: r.url, ...(r.payload !== undefined ? { payload: r.payload as object } : {}), headers: { origin: 'http://localhost:3001' } });
      expect([401, 403], `${r.method} ${r.url}`).toContain(res.statusCode);
    }
  });
});

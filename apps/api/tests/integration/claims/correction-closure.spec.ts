// The correction CLOSURE over HTTP (Story 6.19c; AC6, AC7, AC8c, AC9c, AC14, AC15, AC17, AC11c "Keys", "the closure
// letter", "Re-file"). Keys (2) request, (3) decide, (4)/(5) the Super Admin, (6) re-file confirmation, (8) "no correction
// needed", (1) the closure letter — the happy paths, the stable 409s, CROSS-PARIWAR and NON-HUMAN denial, keys (4)/(5)
// refused to a `pariwar_admin`, the audit locator, and ⭐ AC9c — a planted note sentinel appears in ⛔ no audit line, ⛔ no
// error body and ⛔ no request-log line (the test app captures the Fastify logger's output, 6.19b's `logStream`).
// The domain specs prove the ORDER of every refusal and the races; this suite proves the WIRING.
// ⚠ The clock is REAL: a closable claim's whole correction timeline (accounts → name check → return → mark → run → the
// day-1 rows) is back-dated `AGE_DAYS`, in order, so today is day `AGE_DAYS` of its family run (≥ 90) — 6.19b's
// `backdateTimeline` shape, ⛔ never a run older than its own return.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { claim, cycleCalendar, encryption, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { MEMBER_NOMINEE_FIELD_CLASS } from '../../../src/context.js';
import { encryptClaimContactField } from '../../../src/modules/claims/claim-contact-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Role = 'district_admin' | 'pariwar_admin' | 'super_admin' | 'helpline_operator';
const DISTRICT = 'Kanpur Nagar';
const SENTINEL = {
  note: 'closure sentinel note zqxw the family never replied',
  address: 'Sentinel Closure House 7, Zqxw Lane',
} as const;
/** Today is this day of the back-dated family run — past the 90 days (`too_early` ⛔ applies). */
const AGE_DAYS = 96;
const todayIst = (): string => cycleCalendar.istDateOf(new Date());
const daysFromToday = (n: number): string => cycleCalendar.addCalendarDays(todayIst(), n);

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

describe.skipIf(!hasDatabase)('the correction closure — routes (Story 6.19c)', { timeout: 30000 }, () => {
  let t: TestApp;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];
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

  async function authenticate(display: string): Promise<{ client: Client; userId: string }> {
    const email = `closure-${randomUUID()}@example.test`;
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

  /** A signed-in staff member holding `role` in `pariwarId` (a District Admin at `DISTRICT`, a Super Admin globally). */
  async function staff(pariwarId: string, role: Role): Promise<{ client: Client; userId: string }> {
    const { client, userId } = await authenticate(`${role} ${userId8()}`);
    const [dimension, value] =
      role === 'district_admin' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await t.pool.query(
      'INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)',
      [userId, pariwarId, role, dimension, value],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }
  const userId8 = () => randomUUID().slice(0, 8);

  async function elevate(client: Client, context: string): Promise<void> {
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: context } })).statusCode).toBe(200);
    const code = t.adminStepUpDelivery.last?.code as string;
    expect((await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } })).statusCode).toBe(200);
  }

  async function logsSince(from: number): Promise<string> {
    await new Promise(setImmediate);
    return logLines.slice(from).join('\n');
  }

  /**
   * A returned claim (verifier_approved, two accounts, a passing check, a determination, a contact record whose claimant
   * IS the one nominee, a REAL mobile and address), marked `mustAct` at the return.
   *   · `reach` — `sms`: an ACCEPTED family SMS to the person's CURRENT number on day 1 (D22 reached); `letter`: the
   *     CURRENT number is dead (`rejected_invalid_number` on day 1) and a correction letter was posted and DELIVERED (reached by letter — a
   *     closure then OWES a closure letter, `-274` 2); `none`: nothing.
   *   · `aged` (default true) — the timeline back-dated `AGE_DAYS`; `false` leaves today = day 0 (`too_early`).
   */
  async function returnedClaim(
    pariwarId: string,
    opts: { mustAct?: 'family' | 'staff'; reach?: 'sms' | 'letter' | 'none'; aged?: boolean; unreadableMobile?: boolean } = {},
  ) {
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
      'INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())',
      [mid, pariwarId, DISTRICT],
    );
    await seedNomineeNameCheck(t.deps, pariwarId, String(cid));
    // A REAL mobile envelope on the effective version (the production hash) and a REAL address (the letter form).
    const mobile = encryption.serializeEnvelope(
      await encryption.encryptTier1(
        Buffer.from('+919812345678', 'utf-8'),
        { pariwarId, fieldClass: MEMBER_NOMINEE_FIELD_CLASS },
        t.deps.encryption.kms,
        t.deps.encryption.kekRef,
      ),
    );
    if (opts.unreadableMobile !== true) {
      await asReplica(async (c) => {
        await c.query('UPDATE member_nominee_versions SET mobile_ciphertext = $3 WHERE pariwar_id = $1 AND member_id = $2', [pariwarId, mid, mobile]);
      });
    }
    const address = await encryptClaimContactField(SENTINEL.address, pariwarId, t.deps.encryption);
    await t.pool.query('UPDATE claim_contact_nominees SET address_ciphertext = $2 WHERE claim_case_id = $1', [cid, address]);

    scopeTx = await openScopeTx(t.deps, pariwarId);
    let runId = '';
    let person: claim.CorrectionPerson;
    try {
      await claim.returnToDistrictAdmin(scopeTx.client, {
        claimCaseId: cid, pariwarId: pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:return-note',
        actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', actor: 'trustee',
      });
      const w = await claim.writeCorrectionMark(scopeTx.client, {
        pariwarId: pid, claimCaseId: cid, mustAct: opts.mustAct ?? 'family', actorId: randomUUID(), actorDisplay: 'Pariwar Admin One',
        setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: claim.noCorrectionHold,
      });
      runId = w.openedRun!.runId;
      const recipients = await claim.readCorrectionRecipients(scopeTx.tx, pid, cid);
      expect(recipients.people, 'the fixture binds ONE person (the claimant is the nominee)').toHaveLength(1);
      person = recipients.people[0]!;
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    const age = opts.aged === false ? 0 : AGE_DAYS;
    if (age > 0) await backdate(String(cid), age);
    const day0 = daysFromToday(-age);
    const reach = opts.unreadableMobile === true ? 'none' : (opts.reach ?? 'sms');
    if (reach === 'none') return { claimCaseId: String(cid), memberId: String(mid), personKey: person!.personKey, runId, day0 };
    const hash = await claim.currentCorrectionNumberHash(person!.mobileCiphertext, person!.mobileSource, pariwarId, t.deps.encryption);
    if (reach === 'sms') {
      await finalRow(String(cid), runId, person!.personKey, person!.versionId, cycleCalendar.addCalendarDays(day0, 1), 'accepted', hash);
    } else if (reach === 'letter') {
      // The CURRENT number found dead on day 1 (⭐ its hash — a `no_target` beside a real current number would read as a
      // number added LATER, ⛔ a dead one), then a letter posted and delivered.
      await finalRow(String(cid), runId, person!.personKey, person!.versionId, cycleCalendar.addCalendarDays(day0, 1), 'rejected_invalid_number', hash);
      scopeTx = await openScopeTx(t.deps, pariwarId);
      try {
        const letter = await claim.recordCorrectionLetter(scopeTx.client, {
          pariwarId: pid, claimCaseId: cid, personKey: person!.personKey, postedOn: cycleCalendar.addCalendarDays(day0, 5),
          trackingNumberCiphertext: 'enc:v1:tracking', actorId: randomUUID(), actorDisplay: 'District Admin One', crypto: t.deps.encryption,
        });
        await claim.recordCorrectionLetterDelivery(scopeTx.client, {
          pariwarId: pid, claimCaseId: cid, letterId: letter.letterId, deliveredOn: cycleCalendar.addCalendarDays(day0, 10),
          screenshotStorageKey: `pariwar/${pariwarId}/claim/${cid}/correction-letter/${letter.letterId}/x`, screenshotContentType: 'image/png',
          screenshotSizeBytes: 10, actorId: randomUUID(), actorDisplay: 'District Admin One',
        });
        await closeScopeTx(scopeTx, true);
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    }
    return { claimCaseId: String(cid), memberId: String(mid), personKey: person!.personKey, runId, day0 };
  }

  /** TEST-ONLY: run `fn` on the suite's pool login with triggers off (`member_nominee_versions` / `events_log` are append-only). */
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
   * TEST-ONLY: move the claim's correction timeline `days` into the past — EVERY instant by the same amount (6.19b's
   * `backdateTimeline`), so the order the real writers produced is kept, the return's IST date stays the run's day 0 and
   * the name check stays CURRENT (its per-account stamps move with the accounts).
   */
  async function backdate(claimCaseId: string, days: number): Promise<void> {
    const age = `${days} days`;
    await asReplica(async (c) => {
      await c.query('UPDATE claim_nominee_bank_accounts SET updated_at = updated_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      await c.query(
        `UPDATE events_log e
            SET occurred_at = e.occurred_at - $2::interval,
                payload = jsonb_set(
                  e.payload,
                  '{accounts}',
                  (SELECT jsonb_agg(
                            jsonb_set(
                              a.elem,
                              '{account_updated_at}',
                              to_jsonb(to_char(((a.elem ->> 'account_updated_at')::timestamptz - $2::interval) AT TIME ZONE 'UTC',
                                               'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
                            )
                            ORDER BY a.ord
                          )
                     FROM jsonb_array_elements(e.payload -> 'accounts') WITH ORDINALITY AS a(elem, ord))
                )
          WHERE e.stream_id = $1 AND e.event_type = 'claim.nominee_name_checked'`,
        [claimCaseId, age],
      );
      await c.query('UPDATE claim_state_trustee_decisions SET decided_at = decided_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      await c.query('UPDATE claim_correction_marks SET set_at = set_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      await c.query(
        'UPDATE claim_correction_runs SET day0 = day0 - $2::int, opened_at = opened_at - $3::interval WHERE claim_case_id = $1',
        [claimCaseId, days, age],
      );
    });
  }

  /** A FINAL family-SMS row on `sentOn` (slot 1), naming the version it reached and — for an accept — the number's hash. */
  async function finalRow(
    claimCaseId: string,
    runId: string,
    personKey: string,
    versionId: string | null,
    sentOn: string,
    outcome: 'accepted' | 'rejected_invalid_number',
    hash: string | null,
  ): Promise<void> {
    await t.pool.query(
      `INSERT INTO claim_correction_reminders
         (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, subject_key, outcome,
          recipient_version_id, recipient_number_hash, created_at, updated_at)
       SELECT $1, $2, c.pariwar_id, 1, $3::date, $4, 'family_sms', '', $5, $6, $7, $3::date + time '05:00', $3::date + time '05:00'
         FROM claims c WHERE c.claim_case_id = $2`,
      [runId, claimCaseId, sentOn, personKey, outcome, versionId, hash],
    );
  }

  /** Record a passing District Admin name check NOW, through the real writer (D27's approve needs one after the record). */
  async function recordPassingCheck(pariwarId: string, claimCaseId: string): Promise<void> {
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
        accounts: stamps.rows.map((row) => ({
          accountRank: row.account_rank as 1 | 2,
          accountUpdatedAt: new Date(row.updated_at).toISOString(),
          verdict: 'matches' as const,
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

  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/correction`;
  const errCode = (res: { json: () => unknown }) => (res.json() as { error?: { code?: string } }).error?.code;
  const errDetails = (res: { json: () => unknown }) => (res.json() as { error?: { details?: unknown } }).error?.details;

  it('⭐ the declined path end to end — request (key 2) → queue column → Pariwar Admin decline (key 3) → the HOLD → the Super Admin (keys 5, 4) reviews, directs, the directee responds, and the claim is CLOSED; ⛔ the note in no log, audit line or plaintext column', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId, 'district_admin');
    const pa = await staff(pariwarId, 'pariwar_admin');
    const sa = await staff(pariwarId, 'super_admin');
    t.auditSink.events.length = 0;
    const logFrom = logLines.length;

    // The queue says a request would pass (⛔ no blocker).
    let queue = await da.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction` });
    expect(queue.statusCode, queue.body).toBe(200);
    type QueueRow = { claim_case_id: string; correction_closure: { state: string | null; blocker: string | null; family_run_day: number } };
    let row = (queue.json() as { items: QueueRow[] }).items.find((i) => i.claim_case_id === claimCaseId)!;
    expect(row.correction_closure).toMatchObject({ state: null, blocker: null, family_run_day: AGE_DAYS });

    // (2) the request.
    const requested = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: SENTINEL.note } });
    expect(requested.statusCode, requested.body).toBe(201);
    expect(requested.json()).toMatchObject({ state: 'requested', origin: 'declined_closure' });
    const again = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: 'again' } });
    expect(again.statusCode).toBe(409);
    expect(errCode(again)).toBe('closure.request_pending');
    queue = await da.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction` });
    row = (queue.json() as { items: QueueRow[] }).items.find((i) => i.claim_case_id === claimCaseId)!;
    expect(row.correction_closure).toMatchObject({ state: 'requested', blocker: 'request_pending' });

    // (3) the Pariwar Admin's queue shows the request with its note decrypted; a decline without a note is a 400.
    const paQueue = await pa.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-queue?limit=50` });
    expect(paQueue.statusCode, paQueue.body).toBe(200);
    const item = (paQueue.json() as { items: { claim_case_id: string; kind: string; note: unknown }[] }).items.find((i) => i.claim_case_id === claimCaseId);
    expect(item).toMatchObject({ kind: 'closure_request', note: { state: 'readable', value: SENTINEL.note } });
    const bare = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/decision`, payload: { decision: 'decline' } });
    expect(bare.statusCode).toBe(400);
    const declined = await pa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/decision`, payload: { decision: 'decline', note: 'reached only once — the Super Admin should look' },
    });
    expect(declined.statusCode, declined.body).toBe(201);
    expect(declined.json()).toMatchObject({ closure: { state: 'escalated' } });

    // ⭐ The HOLD — D27's approve is refused while held (`-273` §4), before anything else.
    const d27 = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/no-correction-needed/approve`, payload: {} });
    expect(d27.statusCode).toBe(409);
    expect(errCode(d27)).toBe('cycle_freeze.escalated');

    // Keys (4)/(5) are the Super Admin's ONLY.
    expect((await pa.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/escalations` })).statusCode).toBe(403);
    expect((await pa.client.inject({ method: 'GET', url: `${claimBase(pariwarId, claimCaseId)}/escalation` })).statusCode).toBe(403);
    expect(
      (await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/decision`, payload: { decision: 'close', reason: 'family_silent_after_reached', note: 'n' } })).statusCode,
    ).toBe(403);

    const escalations = await sa.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/escalations?limit=10` });
    expect(escalations.statusCode, escalations.body).toBe(200);
    expect((escalations.json() as { items: { claim_case_id: string; origin: string }[] }).items).toContainEqual(
      expect.objectContaining({ claim_case_id: claimCaseId, origin: 'declined_closure' }),
    );
    const detail = await sa.client.inject({ method: 'GET', url: `${claimBase(pariwarId, claimCaseId)}/escalation` });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.headers['cache-control']).toBe('no-store');
    expect(detail.json()).toMatchObject({
      request_note: { state: 'readable', value: SENTINEL.note },
      pariwar_decision_note: { state: 'readable' },
      approve_path: 'name_waived_251',
      name_check_state: 'passing',
    });

    // (5) the hold under review, then a direction to the District Admin — who must HOLD that role here.
    const review = await sa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/review`, payload: { note: 'looking' } });
    expect(review.statusCode, review.body).toBe(201);
    const twice = await sa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/review`, payload: { note: 'again' } });
    expect(errCode(twice)).toBe('closure.already_under_review');
    const wrongRole = await sa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/directions`,
      payload: { directed_to_actor: pa.userId, directed_to_role: 'district_admin', kind: 'other', text: 'call the family' },
    });
    expect(wrongRole.statusCode).toBe(409);
    expect(errCode(wrongRole)).toBe('direction.directee_role_invalid');
    const directed = await sa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/directions`,
      payload: { directed_to_actor: da.userId, directed_to_role: 'district_admin', kind: 'other', text: 'call the family once more' },
    });
    expect(directed.statusCode, directed.body).toBe(201);
    const directionId = (directed.json() as { direction: { direction_id: string } }).direction.direction_id;

    // The directee's inbox; ⛔ another District Admin may respond; the directee does, once.
    const inbox = await da.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/directions/mine` });
    expect(inbox.statusCode, inbox.body).toBe(200);
    expect((inbox.json() as { items: { direction: { direction_id: string; text: unknown } }[] }).items).toContainEqual(
      expect.objectContaining({ direction: expect.objectContaining({ direction_id: directionId, text: { state: 'readable', value: 'call the family once more' } }) }),
    );
    const other = await staff(pariwarId, 'district_admin');
    const stranger = await other.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/directions/${directionId}/response`, payload: { response: 'not mine' },
    });
    expect(stranger.statusCode).toBe(403);
    expect(errCode(stranger)).toBe('direction.not_directee');
    const responded = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/directions/${directionId}/response`, payload: { response: 'called — no answer' },
    });
    expect(responded.statusCode, responded.body).toBe(201);
    const answered = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/directions/${directionId}/response`, payload: { response: 'again' },
    });
    expect(errCode(answered)).toBe('direction.answered');

    // (4) a reason from another decision's set is a 400; then the CLOSE.
    const badReason = await sa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/decision`, payload: { decision: 'close', reason: 'details_verified', note: 'n' },
    });
    expect(badReason.statusCode).toBe(400);
    const closed = await sa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/escalation/decision`,
      payload: { decision: 'close', reason: 'family_silent_after_reached', note: 'reached and silent for 96 days' },
    });
    expect(closed.statusCode, closed.body).toBe(201);
    expect(closed.json()).toMatchObject({ claim_state: 'denied', closure: { state: 'closed', super_admin_decision: 'closed', name_highlight: null } });
    const events = await t.pool.query<{ event_type: string }>('SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version', [claimCaseId]);
    expect(events.rows.map((r) => r.event_type)).toContain('claim.denied_no_appeal');

    // ⭐ AC9c — every line names the claim; ⛔ the note anywhere but its ciphertext column.
    for (const type of [
      'admin_claim_correction.closure_requested',
      'admin_claim_correction.closure_declined',
      'admin_claim_correction.closure_under_review',
      'admin_claim_correction.direction_recorded',
      'admin_claim_correction.direction_responded',
      'admin_claim_correction.super_admin_decided',
      'admin_claim_correction.escalation_read',
    ]) {
      expect(t.auditSink.events.find((e) => e.type === type)?.resourceLocator, type).toBe(`claim:${claimCaseId.toLowerCase()}`);
    }
    expect(JSON.stringify(t.auditSink.events)).not.toContain('zqxw');
    const stored = await t.pool.query<{ request_note_ciphertext: string }>(
      'SELECT request_note_ciphertext FROM claim_correction_closures WHERE claim_case_id = $1',
      [claimCaseId],
    );
    expect(stored.rows[0]!.request_note_ciphertext).not.toContain('zqxw');
    expect(await logsSince(logFrom)).not.toContain('zqxw');
  });

  it('⭐ the Pariwar Admin APPROVES (key 3) — the D1 chain (`denied_no_appeal`); the appeal status reads closed_no_response with ⛔ no affordance; the helpline re-file needs a confirmation (key 6): 409 → confirmed → minted', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, memberId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId, 'district_admin');
    const pa = await staff(pariwarId, 'pariwar_admin');
    expect((await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: 'silent' } })).statusCode).toBe(201);
    const approved = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/decision`, payload: { decision: 'approve' } });
    expect(approved.statusCode, approved.body).toBe(201);
    expect(approved.json()).toMatchObject({ claim_state: 'denied', closure: { state: 'closed', closure_letter_person_keys: [] } });
    const decision = await t.pool.query<{ reason_code: string }>(
      "SELECT reason_code FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND outcome = 'denied'",
      [claimCaseId],
    );
    expect(decision.rows.map((r) => r.reason_code)).toEqual(['other']);

    // AC15 — the helpline's intake for the same death is refused until a confirmation is recorded.
    const op = await staff(pariwarId, 'helpline_operator');
    await elevate(op.client, 'claim_file');
    const intake = () =>
      op.client.inject({
        method: 'POST', url: `/api/v1/p/${pariwarId}/admin/claims/intake`,
        payload: { deceasedMemberId: memberId, relationship: 'spouse', identityReadBackConfirmed: true, lookupMethod: 'memberId' },
      });
    const refused = await intake();
    expect(refused.statusCode, refused.body).toBe(409);
    expect(errCode(refused)).toBe('claim.refile_requires_confirmation');
    expect(errDetails(refused)).toEqual({ closed_claim_case_id: claimCaseId.toLowerCase() });
    const noNote = await op.client.inject({ method: 'POST', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/refile-confirmation`, payload: { note: ' ' } });
    expect(noNote.statusCode).toBe(400);
    const confirmed = await op.client.inject({
      method: 'POST', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/refile-confirmation`, payload: { note: 'the son called back' },
    });
    expect(confirmed.statusCode, confirmed.body).toBe(201);
    expect(confirmed.json()).toMatchObject({ closed_claim_case_id: claimCaseId.toLowerCase(), via: 'helpline' });
    const twice = await op.client.inject({
      method: 'POST', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/refile-confirmation`, payload: { note: 'again' },
    });
    expect(errCode(twice)).toBe('refile_confirmation.already_confirmed');
    await elevate(op.client, 'claim_file');
    const minted = await intake();
    expect(minted.statusCode, minted.body).toBe(200);
    expect(minted.json()).toMatchObject({ created: true });
    const consumed = await t.pool.query<{ consumed_by_claim_case_id: string | null }>(
      'SELECT consumed_by_claim_case_id FROM claim_refile_confirmations WHERE closed_claim_case_id = $1',
      [claimCaseId],
    );
    expect(consumed.rows[0]!.consumed_by_claim_case_id).toBe((minted.json() as { claimCaseId: string }).claimCaseId);
    expect(t.auditSink.events.find((e) => e.type === 'admin_claim_refile.confirmed')?.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
  });

  it('⛔ the request\'s refusals on the wire, in plain words — too_early (day 0), not_family_action (a staff mark), not_reached (a count and the roles, ⛔ a person)', async () => {
    const pariwarId = randomUUID();
    const da = await staff(pariwarId, 'district_admin');
    const fresh = await returnedClaim(pariwarId, { aged: false });
    const early = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, fresh.claimCaseId)}/closure/request`, payload: { note: 'n' } });
    expect(early.statusCode).toBe(409);
    expect(errCode(early)).toBe('closure.too_early');
    expect(early.body).toContain('Too early');
    const staffCase = await returnedClaim(pariwarId, { mustAct: 'staff' });
    const staffMust = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, staffCase.claimCaseId)}/closure/request`, payload: { note: 'n' } });
    expect(errCode(staffMust)).toBe('closure.not_family_action');
    const silent = await returnedClaim(pariwarId, { reach: 'none' });
    const unreached = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, silent.claimCaseId)}/closure/request`, payload: { note: 'n' } });
    expect(errCode(unreached)).toBe('closure.not_reached');
    expect(errDetails(unreached)).toEqual({ count: 1, roles: ['nominee'] });
    expect((await t.pool.query('SELECT 1 FROM claim_correction_closures WHERE claim_case_id = ANY($1)', [[fresh.claimCaseId, staffCase.claimCaseId, silent.claimCaseId]])).rows).toHaveLength(0);
  });

  it('⛔ a person\'s current number cannot be hashed (an unreadable envelope) ⇒ the queue row reads blocker number_unverified (⛔ a 500, ⛔ "not reached") and the request is a RETRYABLE 503 closure.number_unverified', async () => {
    const pariwarId = randomUUID();
    const da = await staff(pariwarId, 'district_admin');
    const { claimCaseId } = await returnedClaim(pariwarId, { unreadableMobile: true });
    const queue = await da.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction` });
    expect(queue.statusCode, queue.body).toBe(200);
    const row = (queue.json() as { items: { claim_case_id: string; correction_closure: { blocker: string | null } }[] }).items.find(
      (i) => i.claim_case_id === claimCaseId,
    );
    expect(row?.correction_closure.blocker).toBe('number_unverified');
    const res = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: 'n' } });
    expect(res.statusCode).toBe(503);
    expect(errCode(res)).toBe('closure.number_unverified');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_closures WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
  });

  it('⭐ D27 — "no correction needed" (key 8) → the approve refuses without a check AFTER the record (closure.check_required), then approves through the full gate; the keep (`-260` G2) states who must act', async () => {
    const pariwarId = randomUUID();
    const da = await staff(pariwarId, 'district_admin');
    const pa = await staff(pariwarId, 'pariwar_admin');
    const a = await returnedClaim(pariwarId, { aged: false });
    const recorded = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, a.claimCaseId)}/no-correction-needed`, payload: { note: SENTINEL.note } });
    expect(recorded.statusCode, recorded.body).toBe(201);
    expect(recorded.json()).toMatchObject({ must_act: 'staff' });
    const paQueue = await pa.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-queue` });
    expect((paQueue.json() as { items: { claim_case_id: string; kind: string; checked_after_record: boolean }[] }).items).toContainEqual(
      expect.objectContaining({ claim_case_id: a.claimCaseId, kind: 'no_correction_needed', checked_after_record: false }),
    );
    const early = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, a.claimCaseId)}/no-correction-needed/approve`, payload: {} });
    expect(errCode(early)).toBe('closure.check_required');
    await recordPassingCheck(pariwarId, a.claimCaseId);
    const approved = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, a.claimCaseId)}/no-correction-needed/approve`, payload: {} });
    expect(approved.statusCode, approved.body).toBe(201);
    expect(approved.json()).toMatchObject({ claim_state: 'state_trustee_approved', closure: null });

    const b = await returnedClaim(pariwarId, { aged: false });
    const noRecord = await pa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, b.claimCaseId)}/no-correction-needed/keep`, payload: { must_act: 'family', note: 'n' },
    });
    expect(errCode(noRecord)).toBe('closure.no_record');
    expect((await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, b.claimCaseId)}/no-correction-needed`, payload: { note: 'fine as is' } })).statusCode).toBe(201);
    const kept = await pa.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, b.claimCaseId)}/no-correction-needed/keep`, payload: { must_act: 'family', note: 'the family must fix the bank name' },
    });
    expect(kept.statusCode, kept.body).toBe(201);
    expect(kept.json()).toMatchObject({ must_act: 'family', opened_run: { kind: 'family' } });
    expect(JSON.stringify(t.auditSink.events)).not.toContain('zqxw');
  });

  it('⭐ the CLOSURE LETTER (`-274` 2, key 1) — a person reached only by a delivered letter (number dead) is OWED one: listed, recorded once, the address behind the step-up, the delivery + screenshot', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId, { reach: 'letter' });
    const da = await staff(pariwarId, 'district_admin');
    const pa = await staff(pariwarId, 'pariwar_admin');
    // ⛔ Before the closure there is nothing to send.
    const early = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'CL1' },
    });
    expect(errCode(early)).toBe('closure_letter.no_closure');
    expect((await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: 'silent' } })).statusCode).toBe(201);
    const closed = await pa.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/decision`, payload: { decision: 'approve' } });
    expect(closed.statusCode, closed.body).toBe(201);
    expect(closed.json()).toMatchObject({ closure: { closure_letter_person_keys: [personKey] } });

    const owed = await da.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-letters?limit=20` });
    expect(owed.statusCode, owed.body).toBe(200);
    expect((owed.json() as { items: { claim_case_id: string; people: { person_key: string; letter: unknown }[] }[] }).items).toContainEqual(
      expect.objectContaining({ claim_case_id: claimCaseId, people: [{ person_key: personKey, letter: null }] }),
    );
    // A District Admin of ANOTHER district sees ⛔ none of it.
    const elsewhere = await authenticate('District Admin Elsewhere');
    await t.pool.query(
      "INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'district_admin', 'district', 'Lucknow')",
      [elsewhere.userId, pariwarId],
    );
    await elsewhere.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    const theirs = await elsewhere.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-letters` });
    expect(theirs.statusCode, theirs.body).toBe(200);
    expect((theirs.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id)).not.toContain(claimCaseId);

    const addressUrl = `${claimBase(pariwarId, claimCaseId)}/closure-letters/address?person_key=${encodeURIComponent(personKey)}`;
    expect((await da.client.inject({ method: 'GET', url: addressUrl })).statusCode).toBe(403);
    await elevate(da.client, 'closure_letter_address');
    const address = await da.client.inject({ method: 'GET', url: addressUrl });
    expect(address.statusCode, address.body).toBe(200);
    expect(address.json()).toEqual({ person_key: personKey, address: SENTINEL.address });
    expect(address.headers['cache-control']).toBe('no-store');

    const posted = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'CL1' },
    });
    expect(posted.statusCode, posted.body).toBe(201);
    const letterId = (posted.json() as { letter_id: string }).letter_id;
    const second = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'CL2' },
    });
    expect(errCode(second)).toBe('closure_letter.already_recorded');
    const mp = multipart(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('proof')]), 'image/png', todayIst());
    const delivered = await da.client.inject({
      method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters/${letterId}/delivery`, payload: mp.body, headers: { 'content-type': mp.ct },
    });
    expect(delivered.statusCode, delivered.body).toBe(201);
    expect(delivered.json()).toMatchObject({ letter_id: letterId, delivered_on: todayIst(), overdue: false, has_screenshot: true });
    const keys = await t.pool.query<{ screenshot_storage_key: string }>('SELECT screenshot_storage_key FROM claim_closure_letters WHERE letter_id = $1', [letterId]);
    expect(keys.rows[0]!.screenshot_storage_key).toContain(`/closure-letter/${letterId}/`);
    const shot = await da.client.inject({ method: 'GET', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters/${letterId}/screenshot` });
    expect(shot.statusCode, shot.body).toBe(200);
    // Key (1)'s denial for a role without it.
    const op = await staff(pariwarId, 'helpline_operator');
    expect(
      (await op.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure-letters`, payload: { person_key: personKey, posted_on: todayIst(), tracking_number: 'X' } })).statusCode,
    ).toBe(403);
  });

  it('⛔ keys (2), (3), (6), (8) — CROSS-PARIWAR: staff of B are refused on a claim of A, and ⛔ nothing is written', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarA);
    const daB = await staff(pariwarB, 'district_admin');
    const paB = await staff(pariwarB, 'pariwar_admin');
    const opB = await staff(pariwarB, 'helpline_operator');
    expect((await daB.client.inject({ method: 'POST', url: `${claimBase(pariwarB, claimCaseId)}/closure/request`, payload: { note: 'n' } })).statusCode).toBe(403);
    expect((await daB.client.inject({ method: 'POST', url: `${claimBase(pariwarB, claimCaseId)}/no-correction-needed`, payload: { note: 'n' } })).statusCode).toBe(403);
    const decide = await paB.client.inject({ method: 'POST', url: `${claimBase(pariwarB, claimCaseId)}/closure/decision`, payload: { decision: 'approve' } });
    expect([403, 404]).toContain(decide.statusCode);
    const refile = await opB.client.inject({ method: 'POST', url: `/api/v1/p/${pariwarB}/admin/claims/${claimCaseId}/refile-confirmation`, payload: { note: 'n' } });
    expect([403, 404]).toContain(refile.statusCode);
    expect((await t.pool.query('SELECT 1 FROM claim_correction_closures WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
    expect((await t.pool.query('SELECT 1 FROM claim_correction_no_correction_records WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
    expect((await t.pool.query('SELECT 1 FROM claim_refile_confirmations WHERE closed_claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
  });

  it('⛔ every new route — NON-HUMAN: ⛔ no admin session ⇒ 401/403 (⛔ never a 2xx)', async () => {
    const pariwarId = randomUUID();
    const c = randomUUID();
    const d = randomUUID();
    const routes: { method: 'GET' | 'POST'; url: string; payload?: unknown }[] = [
      { method: 'POST', url: `${claimBase(pariwarId, c)}/closure/request`, payload: { note: 'n' } },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/closure/decision`, payload: { decision: 'approve' } },
      { method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-queue` },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/no-correction-needed`, payload: { note: 'n' } },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/no-correction-needed/approve`, payload: {} },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/no-correction-needed/keep`, payload: { must_act: 'family', note: 'n' } },
      { method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/closure-letters` },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/closure-letters`, payload: { person_key: 'claimant', posted_on: todayIst(), tracking_number: 'T' } },
      { method: 'GET', url: `${claimBase(pariwarId, c)}/closure-letters/address?person_key=claimant` },
      { method: 'GET', url: `${claimBase(pariwarId, c)}/closure-letters/${d}/screenshot` },
      { method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/escalations` },
      { method: 'GET', url: `${claimBase(pariwarId, c)}/escalation` },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/escalation/review`, payload: { note: 'n' } },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/escalation/directions`, payload: { directed_to_actor: d, directed_to_role: 'district_admin', kind: 'other', text: 't' } },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/escalation/decision`, payload: { decision: 'close', reason: 'family_silent_after_reached', note: 'n' } },
      { method: 'GET', url: `/api/v1/p/${pariwarId}/admin/correction/directions/mine` },
      { method: 'POST', url: `${claimBase(pariwarId, c)}/directions/${d}/response`, payload: { response: 'r' } },
      { method: 'POST', url: `/api/v1/p/${pariwarId}/admin/claims/${c}/refile-confirmation`, payload: { note: 'n' } },
    ];
    for (const r of routes) {
      const res = await t.app.inject({ method: r.method, url: r.url, ...(r.payload !== undefined ? { payload: r.payload as object } : {}), headers: { origin: 'http://localhost:3001' } });
      expect([401, 403], `${r.method} ${r.url}`).toContain(res.statusCode);
    }
  });

  it('⭐ AC9c — an over-long note made of the sentinel is a 400 naming the field, and the sentinel is in ⛔ no error body and ⛔ no log line', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId, 'district_admin');
    const logFrom = logLines.length;
    const overLong = SENTINEL.note.repeat(30);
    expect(overLong.length).toBeGreaterThan(1000);
    const invalid = await da.client.inject({ method: 'POST', url: `${claimBase(pariwarId, claimCaseId)}/closure/request`, payload: { note: overLong } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body).toContain('note');
    expect(invalid.body).not.toContain('zqxw');
    const logs = await logsSince(logFrom);
    expect(logs).toContain('closure/request');
    expect(logs).not.toContain('zqxw');
  });
});

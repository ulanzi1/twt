// The correction-return CHASE — the District Admin's routes over HTTP (Story 6.19b; AC5, AC9b, AC16, AC11b "keys",
// "the mark", "letters"). Keys (1) `claim.record_correction_letter` and (7) `claim.change_correction_must_act`: the
// happy paths, the 409s, cross-Pariwar and non-human denial, the step-up on the address, one audit line per reveal,
// and ⭐ AC9b — a planted tracking number, screenshot marker and address appear in ⛔ no audit line, ⛔ no error body
// and ⛔ no request-log line (the test app CAPTURES the Fastify logger's output for that leg).
// ⚠ Dates are RELATIVE to today (IST): the routes refuse a letter date later than today, and the writer refuses a
// posting before the live RETURN's IST date (J5) — so each seeded claim's WHOLE correction timeline (the accounts, the
// name check, the return, its mark, the run's day 0) is back-dated `RUN_AGE_DAYS`, in order, to leave room for a past
// letter (⛔ never a run older than its own return — the impossible state the fourth review pass found).
// ⚠ "Future" dates are TWO days ahead (⛔ one): `today` is computed before the request, so a one-day lead could be
// "today" again across IST midnight.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { CLAIM_DOCUMENT_MAX_BYTES } from '@twt/contracts';
import { claim, cycleCalendar, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS } from '../../../src/context.js';
import { encryptClaimContactField } from '../../../src/modules/claims/claim-contact-crypto.js';
import { encryptTrusteeRationale } from '../../../src/modules/claims/state-trustee-decision-crypto.js';
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

  /**
   * ⭐ AC9b — the request-log lines written since `from`, read a TICK after the response: Fastify writes the
   * "request completed" line from the response's own hooks, which may land after `inject` resolves.
   */
  async function logsSince(from: number): Promise<string> {
    await new Promise(setImmediate);
    return logLines.slice(from).join('\n');
  }

  /** The parsed request-logger lines since `from` whose message contains `fragment` (a non-JSON line is skipped). */
  async function logEntriesSince(from: number, fragment: string): Promise<Record<string, unknown>[]> {
    await new Promise(setImmediate);
    const entries: Record<string, unknown>[] = [];
    for (const line of logLines.slice(from).join('').split('\n')) {
      if (line.trim() === '') continue;
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        if (typeof entry['msg'] === 'string' && entry['msg'].includes(fragment)) entries.push(entry);
      } catch {
        // ⛔ Not a JSON log line — not one of the logger's.
      }
    }
    return entries;
  }

  /**
   * A returned, family-marked claim whose one nominee is letter-eligible (`no_target` on day 1), with a REAL address.
   * The WHOLE timeline is back-dated `RUN_AGE_DAYS` (see the header); `day0` (returned) is the run's day 0 = the
   * return's IST date.
   *   · `rationale` — the return's note as a REAL Tier-1 envelope (default: an undecryptable placeholder).
   *   · `versionStamped` (default true) — the `no_target` row names the version it reached (`recipient_version_id`),
   *     as the child's row does, so the letter precondition has ⛔ no reason to hash the number. `false` leaves it
   *     null ⇒ the number "may have moved" ⇒ it is hashed — and the fixture's mobile is an undecryptable placeholder
   *     envelope, so the hash FAILS (the J1 fail-closed leg).
   */
  async function returnedClaim(
    pariwarId: string,
    opts: { eligible?: boolean; mark?: boolean; rationale?: string; versionStamped?: boolean } = {},
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
      `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
      [mid, pariwarId, DISTRICT],
    );
    await seedNomineeNameCheck(t.deps, pariwarId, String(cid));
    const address = await encryptClaimContactField(SENTINEL.address, pariwarId, t.deps.encryption);
    await t.pool.query('UPDATE claim_contact_nominees SET address_ciphertext = $2 WHERE claim_case_id = $1', [cid, address]);

    const rationaleCiphertext =
      opts.rationale === undefined ? 'enc:v1:note' : await encryptTrusteeRationale(opts.rationale, pariwarId, t.deps.encryption);
    scopeTx = await openScopeTx(t.deps, pariwarId);
    let personKey = '';
    let versionId: string | null = null;
    let runId: string | null = null;
    try {
      await claim.returnToDistrictAdmin(scopeTx.client, {
        claimCaseId: cid, pariwarId: pid, reasonCode: 'other', rationaleCiphertext,
        actorId: randomUUID(), actorDisplay: 'Pariwar Admin One', actor: 'trustee',
      });
      if (opts.mark !== false) {
        const w = await claim.writeCorrectionMark(scopeTx.client, {
          pariwarId: pid, claimCaseId: cid, mustAct: 'family', actorId: randomUUID(), actorDisplay: 'Pariwar Admin One',
          setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: claim.noCorrectionHold,
        });
        runId = w.openedRun!.runId;
        const person = (await claim.readCorrectionRecipients(scopeTx.tx, pid, cid)).people[0]!;
        personKey = person.personKey;
        versionId = person.versionId;
        if (opts.eligible !== false) {
          // The day-1 slot of the run as it WILL be once back-dated (day 0 = today − RUN_AGE_DAYS).
          await claim.insertFinalCorrectionReminder(scopeTx.tx, {
            pariwarId: pid, claimCaseId: cid, runId, slotDay: 1, sentOn: daysFromToday(1 - RUN_AGE_DAYS), recipientKey: personKey,
            purpose: 'family_sms', subjectKey: '', outcome: 'no_target',
          });
        }
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    await backdateTimeline(pariwarId, String(cid), opts.eligible !== false && opts.versionStamped !== false ? versionId : null);
    const day0 =
      runId === null
        ? daysFromToday(-RUN_AGE_DAYS)
        : (await t.pool.query<{ day0: string }>('SELECT day0::text AS day0 FROM claim_correction_runs WHERE run_id = $1', [runId])).rows[0]!.day0;
    return { claimCaseId: String(cid), personKey, runId, day0 };
  }

  /**
   * TEST-ONLY: move the claim's correction timeline `RUN_AGE_DAYS` into the past — EVERY instant by the same amount,
   * so the order the real writers produced (accounts → name check → return → mark → run → day-1 row) is kept and the
   * return's IST date stays the run's day 0. One transaction under `session_replication_role = 'replica'` (the
   * `events_log` append-only trigger; ⛔ `twt_app` holds no UPDATE on these columns — the suite's pool login does).
   * `stampVersionId` — the `no_target` row's `recipient_version_id` (see `returnedClaim`).
   * ⭐ The name check's own per-account stamps (`accounts[].account_updated_at`, its staleness token) move WITH the
   * accounts — otherwise every back-dated check reads STALE against the moved `updated_at` (an impossible state the
   * fifth review pass found). Asserted: the check is current before AND after.
   */
  async function backdateTimeline(pariwarId: string, claimCaseId: string, stampVersionId: string | null): Promise<void> {
    expect(await nameCheckIsCurrent(pariwarId, claimCaseId), 'the seeded check is current before the move').toBe(true);
    const c = await t.pool.connect();
    const age = `${RUN_AGE_DAYS} days`;
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const accounts = await c.query('UPDATE claim_nominee_bank_accounts SET updated_at = updated_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      expect(accounts.rowCount, 'the seeded accounts moved').toBeGreaterThanOrEqual(1);
      // The check's instant AND each account stamp it recorded, by the SAME interval as the accounts (the stamp is a
      // `Date.toISOString()` — millisecond precision, UTC — and is written back in that exact shape).
      const checks = await c.query(
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
      expect(checks.rowCount, 'the seeded name check moved').toBeGreaterThanOrEqual(1);
      const ret = await c.query('UPDATE claim_state_trustee_decisions SET decided_at = decided_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      expect(ret.rowCount, 'the return moved').toBe(1);
      await c.query('UPDATE claim_correction_marks SET set_at = set_at - $2::interval WHERE claim_case_id = $1', [claimCaseId, age]);
      await c.query(
        'UPDATE claim_correction_runs SET day0 = day0 - $2::int, opened_at = opened_at - $3::interval WHERE claim_case_id = $1',
        [claimCaseId, RUN_AGE_DAYS, age],
      );
      // The day-1 row was written NOW for a slot 59 days ago — its instants follow its `sent_on`.
      await c.query(
        `UPDATE claim_correction_reminders
            SET created_at = created_at - $2::interval, updated_at = updated_at - $2::interval,
                recipient_version_id = COALESCE($3::uuid, recipient_version_id)
          WHERE claim_case_id = $1`,
        [claimCaseId, `${RUN_AGE_DAYS - 1} days`, stampVersionId],
      );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
    expect(await nameCheckIsCurrent(pariwarId, claimCaseId), 'the back-dated check is STILL current').toBe(true);
  }

  /** Is the claim's latest name check current against its LIVE account stamps and declaration (the read the routes use)? */
  async function nameCheckIsCurrent(pariwarId: string, claimCaseId: string): Promise<boolean> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      const pid = ids.pariwarId(pariwarId);
      const cid = ids.claimId(claimCaseId);
      const recorded = await claim.getLatestNomineeNameCheck(scopeTx.tx, pid, cid);
      if (recorded === null) return false;
      const accounts = await claim.getClaimNomineeBankAccountsCiphertext(scopeTx.tx, pid, cid);
      const token = (await claim.getEffectiveNomineeDeclaration(scopeTx.tx, pid, cid)).token;
      return claim.isNomineeNameCheckCurrent(
        recorded,
        accounts.map((a) => ({ accountRank: a.accountRank, updatedAt: a.updatedAt })),
        token,
      );
    } finally {
      await closeScopeTx(scopeTx, true);
    }
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

    // ⭐ AC9b's failure legs, each CARRYING the sentinel — run while a second letter is still ALLOWED (Story 6.19c, Task 0a:
    // the read-only refusals run BEFORE the encryption, so once the person is at the cap a request 409s before KMS): a payload the schema rejects BECAUSE OF the sentinel's own
    // field (an over-long tracking number made of it — 400; the validation error must ⛔ not echo the field), and a
    // forced 500 (the tracking number's encryption fails — the error line must ⛔ not carry the request body).
    const overLong = SENTINEL.tracking.repeat(5);
    expect(overLong.length, 'the tracking number itself fails the schema').toBeGreaterThan(64);
    const invalidFrom = logLines.length;
    const invalid = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: daysFromToday(-1), tracking_number: overLong },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body, 'the 400 names the failing field').toContain('tracking_number');
    expect(invalid.body).not.toContain(SENTINEL.tracking);
    expect(await logsSince(invalidFrom)).not.toContain(SENTINEL.tracking);
    const kmsFault = vi.spyOn(t.deps.encryption.kms, 'encryptDek').mockRejectedValueOnce(new Error('test: forced KMS failure'));
    let forced: Awaited<ReturnType<Client['inject']>>;
    try {
      forced = await da.inject({
        method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
        payload: { person_key: personKey, posted_on: daysFromToday(-1), tracking_number: SENTINEL.tracking },
      });
    } finally {
      kmsFault.mockRestore();
    }
    expect(forced.statusCode, forced.body).toBe(500);

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
    const logs = await logsSince(logFrom);
    expect(logs, 'non-vacuity: the request logger captured this test\'s requests').toContain('correction/letters');
    expect(logs, 'non-vacuity: the forced 500 was logged').toContain('test: forced KMS failure');
    const surfaces = JSON.stringify(t.auditSink.events) + refused.body + third.body + invalid.body + forced.body + logs;
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

  it('⛔ key (1) — `-231` D\'s chronology: a second letter posted BEFORE the first\'s delivery date ⇒ 409 posted_before_first_delivery; ON that date it is accepted', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const first = await postLetter(da, pariwarId, claimCaseId, personKey, daysFromToday(-20));
    expect((await deliver(da, pariwarId, claimCaseId, first, png(), daysFromToday(-10))).statusCode).toBe(201);
    const backDated = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: daysFromToday(-11), tracking_number: 'T2' },
    });
    expect(backDated.statusCode).toBe(409);
    expect(errCode(backDated)).toBe('correction_letter.posted_before_first_delivery');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(1);
    // The boundary: posted ON the first letter's delivery date is ⛔ not before it.
    await postLetter(da, pariwarId, claimCaseId, personKey, daysFromToday(-10), 'T2');
  });

  it('⛔ keys (1) — J1: the person\'s current number cannot be hashed (an unreadable mobile envelope) ⇒ the letter AND the address are 503 correction_letter.number_unverified (⛔ no row, ⛔ no reveal); the queue still shows the row and logs it', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, personKey } = await returnedClaim(pariwarId, { versionStamped: false });
    const da = await staff(pariwarId);
    const logFrom = logLines.length;
    const rec = await da.inject({
      method: 'POST', url: `${base(pariwarId, claimCaseId)}/letters`,
      payload: { person_key: personKey, posted_on: daysFromToday(-5), tracking_number: SENTINEL.tracking },
    });
    expect(rec.statusCode, rec.body).toBe(503);
    expect(errCode(rec)).toBe('correction_letter.number_unverified');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);
    // ⭐ The 503 leaves a SERVER trace — a warn line naming the claim, the person key and the route (ids only).
    const recordWarn = await logEntriesSince(logFrom, 'refusing with 503 number_unverified');
    expect(recordWarn.map((e) => [e['claimCaseId'], e['personKey'], e['route']])).toEqual([[claimCaseId, personKey, 'record_letter']]);
    const addressFrom = logLines.length;

    await elevate(da, 'correction_letter_address');
    t.auditSink.events.length = 0;
    const address = await da.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/letters/address?person_key=${encodeURIComponent(personKey)}` });
    expect(address.statusCode).toBe(503);
    expect(errCode(address)).toBe('correction_letter.number_unverified');
    expect(address.body).not.toContain(SENTINEL.address);
    expect(t.auditSink.events.filter((e) => e.type === 'admin_claim_correction.letter_address_revealed')).toHaveLength(0);
    const addressWarn = await logEntriesSince(addressFrom, 'refusing with 503 number_unverified');
    expect(addressWarn.map((e) => [e['claimCaseId'], e['personKey'], e['route']])).toEqual([[claimCaseId, personKey, 'letter_address']]);

    // J2 — the queue degrades the ROW, ⛔ never the page: 200, the row listed, one warn line naming the claim alone.
    // ⭐ A FRESH `queueFrom`, and the assertion is on the warn line ITSELF (its message + its `claimCaseId` field) —
    // ⛔ never "the claim id appears somewhere in the logs", which the request URL alone would satisfy.
    const queueFrom = logLines.length;
    const queue = await da.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction` });
    expect(queue.statusCode, queue.body).toBe(200);
    expect((queue.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id)).toContain(claimCaseId);
    const queueWarn = await logEntriesSince(queueFrom, "current number could not be hashed; their status reads the old number's history");
    expect(queueWarn.map((e) => e['claimCaseId'])).toEqual([claimCaseId]);
    expect(queueWarn[0]!['level'], 'a warn line').toBe(40);
    const logs = await logsSince(logFrom);
    expect(logs).not.toContain(SENTINEL.tracking);
    expect(logs).not.toContain(SENTINEL.address);
  });

  it('⛔ key (1) — the letter dates: posted before the RETURN\'s IST date ⇒ 409 posted_before_run (ON it is accepted); posted or delivered LATER than today ⇒ 400 date_in_future', async () => {
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
      payload: { person_key: personKey, posted_on: daysFromToday(2), tracking_number: 'T' },
    });
    expect(future.statusCode).toBe(400);
    expect(errCode(future)).toBe('correction_letter.date_in_future');
    expect((await t.pool.query('SELECT 1 FROM claim_correction_letters WHERE claim_case_id = $1', [claimCaseId])).rows).toHaveLength(0);

    // ⭐ J5 — the floor is the return's IST date (= this run's day 0 here): a letter posted ON it is accepted.
    const returnedOn = (
      await t.pool.query<{ d: string }>(
        `SELECT (decided_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d FROM claim_state_trustee_decisions WHERE claim_case_id = $1`,
        [claimCaseId],
      )
    ).rows[0]!.d;
    expect(returnedOn, 'the fixture keeps the return and the run on one day').toBe(day0);
    const letterId = await postLetter(da, pariwarId, claimCaseId, personKey, returnedOn);
    const before = t.claimDocumentStorage.store.size;
    const futureDelivery = await deliver(da, pariwarId, claimCaseId, letterId, png(), daysFromToday(2));
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
    // Oldest → newest: A (escalated), B (escalated), C (⛔ not). The queue is newest-first. Each return note is a REAL
    // envelope, so its decrypt is observable (the KMS unwrap under the trustee-decision field class).
    const a = await returnedClaim(pariwarId, { rationale: 'return note a' });
    const b = await returnedClaim(pariwarId, { rationale: 'return note b' });
    const c = await returnedClaim(pariwarId, { rationale: 'return note c' });
    for (const x of [a, b]) {
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      let ok = false;
      try {
        await claim.insertFinalCorrectionReminder(scopeTx.tx, {
          // The escalation's slot is day 14 of the (back-dated) run — its `sent_on` is THAT day, ⛔ not today.
          pariwarId: ids.pariwarId(pariwarId), claimCaseId: ids.claimId(x.claimCaseId), runId: x.runId!, slotDay: 14,
          sentOn: cycleCalendar.addCalendarDays(x.day0, 14), recipientKey: `staff:${randomUUID()}`, purpose: 'escalation', subjectKey: x.personKey, outcome: 'recorded',
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    }
    const da = await staff(pariwarId);
    // ⭐ The note DECRYPTS, counted at the KMS seam: every `decryptTier1` fires `auditHook('decryptDek', …, ctx)` once.
    const kms = t.deps.encryption.kms;
    const queue = async (qs: string) => {
      t.auditSink.events.length = 0;
      let noteDecrypts = 0;
      const previousHook = kms.auditHook;
      kms.auditHook = (op, kekRef, ctx) => {
        if (op === 'decryptDek' && ctx.fieldClass === CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS && ctx.pariwarId === pariwarId) noteDecrypts += 1;
        previousHook?.(op, kekRef, ctx);
      };
      let res: Awaited<ReturnType<Client['inject']>>;
      try {
        res = await da.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction${qs}` });
      } finally {
        kms.auditHook = previousHook;
      }
      expect(res.statusCode, res.body).toBe(200);
      const items = (res.json() as {
        items: { claim_case_id: string; return_note: { state: string } | null; correction_chase: { escalated: boolean } }[];
      }).items;
      // Every returned row's note was READ (non-vacuity for the count below).
      expect(items.map((i) => i.return_note?.state)).toEqual(items.map(() => 'readable'));
      const noteLines = t.auditSink.events
        .filter((e) => e.type === 'admin_nominee_name_check.queue_note_read')
        .map((e) => e.resourceLocator);
      return { ids: items.map((i) => i.claim_case_id), items, noteLines, noteDecrypts };
    };

    // The unfiltered page of one is C — the escalations are both OUTSIDE it.
    expect((await queue('?limit=1')).ids).toEqual([c.claimCaseId]);
    // ⭐ The filter still finds them, and slices AFTER filtering.
    const one = await queue('?escalated=true&limit=1');
    expect(one.ids).toEqual([b.claimCaseId]);
    expect(one.items[0]!.correction_chase.escalated).toBe(true);
    // ⛔ ONE note line — for the row returned, ⛔ not for A (filtered out by the page) or C (by the filter).
    expect(one.noteLines).toEqual([`claim:${b.claimCaseId.toLowerCase()}`]);
    // ⛔ ONE note decrypt — the scan's filtered-out rows are ⛔ never decrypted.
    expect(one.noteDecrypts).toBe(1);
    const both = await queue('?escalated=true');
    expect(both.ids).toEqual([b.claimCaseId, a.claimCaseId]);
    expect([...both.noteLines].sort()).toEqual([`claim:${a.claimCaseId.toLowerCase()}`, `claim:${b.claimCaseId.toLowerCase()}`].sort());
    expect(both.noteDecrypts).toBe(2);
    // Unfiltered, every row is returned — and every row's note is decrypted once and audited.
    const all = await queue('');
    expect(all.noteLines).toHaveLength(3);
    expect(all.noteDecrypts).toBe(3);
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
    const logs = await logsSince(logFrom);
    expect(logs, 'non-vacuity: the request logger captured the reveals').toContain('letters/address');
    expect(logs).not.toContain(SENTINEL.address);
  });

  it('⭐ AC9b — the must-act note is in ⛔ no request-log line and ⛔ no error body (an accepted change AND a payload the schema rejects BECAUSE OF the note)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await returnedClaim(pariwarId);
    const da = await staff(pariwarId);
    const logFrom = logLines.length;
    const res = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'staff', note: SENTINEL.note } });
    expect(res.statusCode).toBe(201);
    // ⭐ The sentinel IS the failing field: an over-long note made of it (the cap is 500 characters).
    const overLong = SENTINEL.note.repeat(11);
    expect(overLong.length, 'the note itself fails the schema').toBeGreaterThan(500);
    const invalid = await da.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/must-act`, payload: { must_act: 'family', note: overLong } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body, 'the 400 names the failing field').toContain('note');
    expect(invalid.body).not.toContain('zqxw');
    const logs = await logsSince(logFrom);
    expect(logs).toContain('correction/must-act');
    expect(logs).not.toContain('zqxw');
  });

  it('⭐ the queue\'s `run.ended_on` — an ENDED run (⛔ no open one) reads open: false and its ended IST date, computed by SQL (⛔ no domain helper)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, runId } = await returnedClaim(pariwarId);
    // TEST-ONLY: end the run two days after it opened (the back-dated timeline keeps that in the past).
    await t.pool.query(
      `UPDATE claim_correction_runs SET ended_at = opened_at + interval '2 days', end_reason = 'decided' WHERE run_id = $1`,
      [runId],
    );
    const expected = (
      await t.pool.query<{ d: string }>(
        `SELECT (ended_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d FROM claim_correction_runs WHERE run_id = $1`,
        [runId],
      )
    ).rows[0]!.d;
    const da = await staff(pariwarId);
    const queue = await da.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/under-correction` });
    expect(queue.statusCode, queue.body).toBe(200);
    const item = (queue.json() as {
      items: { claim_case_id: string; correction_chase: { run: { open: boolean; ended_on: string | null } | null } }[];
    }).items.find((i) => i.claim_case_id === claimCaseId);
    expect(item?.correction_chase.run).toMatchObject({ open: false, ended_on: expected });
    expect(expected, 'non-vacuity: the ended date is not today').not.toBe(todayIst());
  });
});

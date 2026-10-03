// The claim-correction CLOSURE sweep and the closure-notice child against the live DB (Story 6.19c; AC6, AC14, AC17;
// AC11c "Jobs"). Own-committing (the sweep reads COMMITTED rows across tenants), an INJECTED clock, a fake SMS gateway
// and a capturing queue. ⭐ ISOLATED: every sweep runs with `pariwarAllowlist` = this suite's own random Pariwar, so
// its far-future clocks never touch another suite's claims. Assertions key on OUR claim ids (membership).
//
//   · the District Admin's closure reminders on the family run's days 90–96, then the day-97 escalation ONCE — and
//     ⛔ while a request is pending, the claim corrected, or the claim held;
//   · the staff case's day-90 escalation ROW and its Super Admin reminder; the 30-day reminder from the ESCALATION date
//     (⛔ moved by a direction run opened mid-review); the directee's day-7-then-weekly reminder; two directions to one
//     admin on one day ⇒ two rows;
//   · the closure notice — recorded DUE in the approving transaction, sent ONCE per recipient (⛔ again on a later
//     day), ⛔ to a known-dead number (a closure letter is owed instead), the outbox DONE;
//   · the closure-letter chase from the closure date: day 7, daily to 12, the Pariwar Admin on day 13.

import { randomUUID } from 'node:crypto';

import type { SmsAppClient, SmsGatewayMessage } from '@twt/channels';
import { bindScopedDb, claim, cycleCalendar, ids, withPariwarScope, type Db } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { runClosureNoticeChild, runCorrectionClosureSweep, type ClosureNoticePayload } from '../src/scheduler/claim-correction-closure.js';
import type { ClaimCorrectionReminderDeps } from '../src/scheduler/claim-correction-reminders.js';
import { cleanupClaims, encryptField, onOwnTx, seedReturnedClaim, type SeedReturnedClaimOptions } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const HELPLINE = '+911800123456';
const enc = buildJobsEncryptionDeps('claim-correction-closure-live-pepper');
const tenAmIst = (date: string) => new Date(Date.parse(`${date}T10:00:00+05:30`));
const day = (day0: string, n: number) => cycleCalendar.addCalendarDays(day0, n);

describe.skipIf(!hasDatabase)('Story 6.19c — the claim-correction closure sweep (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const staffUsers: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-correction-closure-live] idle client error:', err.message));
  });
  afterAll(async () => {
    try {
      await cleanupClaims(pool, claims, members, { userIds: staffUsers });
    } finally {
      await pool.end();
    }
  });

  interface Harness {
    deps: ClaimCorrectionReminderDeps;
    enqueued: { queue: string; data: JobEnvelope<unknown> }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    setNow: (d: Date) => void;
  }
  function harness(): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    let now = new Date();
    const smsAppClient: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return Promise.resolve(`gw-${randomUUID()}`);
        },
      }),
    };
    const deps: ClaimCorrectionReminderDeps = {
      pool,
      encryption: enc,
      smsAppClient,
      resolveConfig: (key) =>
        Promise.resolve(
          key.startsWith('sms.dlt.template_id.claim_correction.') ? 'TPL-1' : key === `sms.claim_correction.helpline_number.${PARIWAR}` ? HELPLINE : null,
        ),
      push: { audit: () => Promise.resolve(), hashRendered: () => Promise.resolve('a'.repeat(64)) },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [PARIWAR],
    };
    return { deps, enqueued, sent, alarms, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<unknown> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runCorrectionClosureSweep>[1];

  async function seed(opts: SeedReturnedClaimOptions = {}) {
    const s = await seedReturnedClaim(pool, PARIWAR, enc, opts);
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    const { rows } = await pool.query<{ day0: string; run_id: string }>(
      "SELECT to_char(day0, 'YYYY-MM-DD') AS day0, run_id FROM claim_correction_runs WHERE claim_case_id = $1 ORDER BY opened_at LIMIT 1",
      [s.claimCaseId],
    );
    return { ...s, day0: rows[0]!.day0, runId: rows[0]!.run_id };
  }
  async function rowsOf(cid: string, purposes: readonly string[]) {
    const { rows } = await pool.query<{ purpose: string; recipient_key: string; subject_key: string; sent_on: string; late: boolean; outcome: string }>(
      `SELECT purpose, recipient_key, subject_key, to_char(sent_on, 'YYYY-MM-DD') AS sent_on, late, outcome FROM claim_correction_reminders
        WHERE claim_case_id = $1 AND purpose = ANY($2::text[]) ORDER BY sent_on, purpose, recipient_key`,
      [cid, purposes],
    );
    return rows;
  }
  async function staffUser(displayName: string): Promise<string> {
    const id = randomUUID();
    await pool.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', $2)`, [id, displayName]);
    staffUsers.push(id);
    return id;
  }
  async function shepherd(claimCaseId: string): Promise<string> {
    const da = await staffUser('Closure DA');
    await pool.query(
      `INSERT INTO claim_shepherd_assignments (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason)
       VALUES ($1, $2, $3, 'Closure DA', 'initial')`,
      [claimCaseId, PARIWAR, da],
    );
    return da;
  }
  let pariwarAdmin: string | null = null;
  async function thePariwarAdmin(): Promise<string> {
    if (pariwarAdmin !== null) return pariwarAdmin;
    const pa = await staffUser('Closure PA');
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'pariwar_admin', 'pariwar', NULL)`,
      [pa, PARIWAR],
    );
    pariwarAdmin = pa;
    return pa;
  }
  let superAdmin: string | null = null;
  async function theSuperAdmin(): Promise<string> {
    if (superAdmin !== null) return superAdmin;
    const sa = await staffUser('Closure SA');
    // A GLOBAL grant lives under ANOTHER Pariwar id — the sweep must still find it (`listSuperAdmins`).
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'super_admin', 'global', NULL)`,
      [sa, randomUUID()],
    );
    superAdmin = sa;
    return sa;
  }

  /** The person reached: an `accepted` family SMS to their CURRENT number on run day 1. */
  async function reach(s: Awaited<ReturnType<typeof seed>>, outcome: 'accepted' | 'rejected_invalid_number' = 'accepted') {
    await onOwnTx(pool, PARIWAR, async (client) => {
      const db = bindScopedDb(client);
      const pid = ids.pariwarId(PARIWAR);
      const person = (await claim.readCorrectionRecipients(db, pid, ids.claimId(s.claimCaseId))).people[0]!;
      const c = await claim.claimCorrectionReminder(db, {
        pariwarId: pid, claimCaseId: ids.claimId(s.claimCaseId), runId: s.runId, slotDay: 1, recipientKey: person.personKey,
        purpose: 'family_sms', subjectKey: '', sentOn: day(s.day0, 1), late: false, jobId: 'j', now: new Date(),
      });
      if (c.status !== 'claimed') throw new Error('claim');
      await claim.finaliseCorrectionReminder(db, {
        pariwarId: pid, reminderId: c.reminderId, jobId: 'j', outcome, recipientVersionId: person.versionId,
        recipientNumberHash: await claim.currentCorrectionNumberHash(person.mobileCiphertext, person.mobileSource, PARIWAR, enc),
      });
    });
  }
  const act = <T>(fn: (client: pg.PoolClient) => Promise<T>) => onOwnTx(pool, PARIWAR, fn);
  const request = (s: Awaited<ReturnType<typeof seed>>, n = 95) =>
    act((client) =>
      claim.requestCorrectionClosure(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), actorId: randomUUID(), actorDisplay: 'DA',
        now: tenAmIst(day(s.day0, n)), noteCiphertext: 'enc:v1:r', crypto: enc,
      }),
    );
  const approve = (s: Awaited<ReturnType<typeof seed>>, n = 96) =>
    act((client) =>
      claim.decideCorrectionClosure(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), actorId: randomUUID(), actorDisplay: 'PA',
        now: tenAmIst(day(s.day0, n)), decision: 'approve', noteCiphertext: null, decisionRationaleCiphertext: 'enc:v1:x', crypto: enc,
      }),
    );
  const decline = (s: Awaited<ReturnType<typeof seed>>, n = 96) =>
    act((client) =>
      claim.decideCorrectionClosure(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), actorId: randomUUID(), actorDisplay: 'PA',
        now: tenAmIst(day(s.day0, n)), decision: 'decline', noteCiphertext: 'enc:v1:d',
      }),
    );
  const sweepOn = async (h: Harness, date: string) => {
    h.setNow(tenAmIst(date));
    return runCorrectionClosureSweep(h.deps, boss(h));
  };

  it('⭐ the District Admin\'s closure reminders on family-run days 90–96, then ONE day-97 escalation to the Pariwar Admin — ⛔ a decision', async () => {
    const s = await seed();
    const da = await shepherd(s.claimCaseId);
    const pa = await thePariwarAdmin();
    const h = harness();
    await sweepOn(h, day(s.day0, 89));
    expect(await rowsOf(s.claimCaseId, ['closure_due', 'closure_escalation'])).toEqual([]);
    for (const n of [90, 92, 96, 97, 99]) await sweepOn(h, day(s.day0, n));
    const rows = await rowsOf(s.claimCaseId, ['closure_due', 'closure_escalation']);
    expect(rows.filter((r) => r.purpose === 'closure_due').map((r) => [r.sent_on, r.recipient_key])).toEqual([
      [day(s.day0, 90), `staff:${da}`],
      [day(s.day0, 92), `staff:${da}`],
      [day(s.day0, 96), `staff:${da}`],
    ]);
    expect(rows.filter((r) => r.purpose === 'closure_escalation').map((r) => [r.sent_on, r.recipient_key])).toEqual([[day(s.day0, 97), `staff:${pa}`]]);
    // ⛔ The job decided nothing.
    expect((await pool.query('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [s.claimCaseId])).rows[0]).toEqual({ s: 'verifier_approved' });
    expect((await pool.query('SELECT count(*)::int AS n FROM claim_correction_closures WHERE claim_case_id = $1', [s.claimCaseId])).rows[0]).toEqual({ n: 0 });
    // ⭐ Pushes enqueued for the staff who got a row.
    expect(h.enqueued.some((e) => e.queue === 'claim.correction.staff_push' && (e.data.payload as { userId: string }).userId === da)).toBe(true);
  });

  it('⭐ the closure reminders STOP: a request pending, the claim escalated — ⛔ a row on those days', async () => {
    const s = await seed();
    await shepherd(s.claimCaseId);
    await reach(s);
    await request(s, 90);
    const h = harness();
    await sweepOn(h, day(s.day0, 91));
    expect(await rowsOf(s.claimCaseId, ['closure_due', 'closure_escalation'])).toEqual([]);
    await decline(s, 92);
    await sweepOn(h, day(s.day0, 97));
    expect(await rowsOf(s.claimCaseId, ['closure_due', 'closure_escalation'])).toEqual([]);
  });

  it('⭐ the staff case at day 90: the escalation ROW + the Super Admin reminder; the 30-day reminder counts from the ESCALATION date (⛔ moved by a direction run); the directee\'s day 7 then weekly; two directions to one admin on one day ⇒ two rows', async () => {
    const s = await seed({ mustAct: 'staff' });
    await shepherd(s.claimCaseId);
    const sa = await theSuperAdmin();
    const h = harness();
    const r = await sweepOn(h, day(s.day0, 90));
    expect(r.staffCasesEscalated).toBe(1);
    const [row] = (await pool.query('SELECT closure_id, origin, state FROM claim_correction_closures WHERE claim_case_id = $1', [s.claimCaseId])).rows;
    expect(row).toMatchObject({ origin: 'staff_case', state: 'escalated' });
    const esc = await rowsOf(s.claimCaseId, ['staff_case_escalation']);
    expect(esc.some((x) => x.recipient_key === `staff:${sa}` && x.sent_on === day(s.day0, 90))).toBe(true);
    // Two directions to ONE admin on ONE day (day 100), and a switch to `family` + a RESTART run mid-review.
    const da = randomUUID();
    for (const kind of ['other', 'other'] as const) {
      await act((client) =>
        claim.recordClosureDirection(client, {
          pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), actorId: sa, actorDisplay: 'SA',
          now: tenAmIst(day(s.day0, 100)), directedToActor: da, directedToRole: 'district_admin', kind, textCiphertext: 'enc:v1:d',
        }),
      );
    }
    await act((client) =>
      claim.writeCorrectionMark(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), mustAct: 'family', actorId: da, actorDisplay: 'DA',
        setByRole: 'district_admin', noteCiphertext: 'enc:v1:n', now: tenAmIst(day(s.day0, 101)), hold: claim.isCorrectionClaimHeld,
      }),
    );
    await act((client) =>
      claim.recordClosureDirection(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), actorId: sa, actorDisplay: 'SA',
        now: tenAmIst(day(s.day0, 102)), directedToActor: da, directedToRole: 'district_admin', kind: 'restart_family_reminders', textCiphertext: 'enc:v1:r',
      }),
    );
    for (const n of [107, 114, 120, 121, 150]) await sweepOn(h, day(s.day0, n));
    const review = await rowsOf(s.claimCaseId, ['review_reminder']);
    expect(review.filter((x) => x.recipient_key === `staff:${sa}`).map((x) => x.sent_on)).toEqual([day(s.day0, 120), day(s.day0, 150)]);
    const directee = await rowsOf(s.claimCaseId, ['direction_reminder']);
    // Day 107: the two day-100 directions (two rows — distinct subjects); day 114: those two again AND the day-102 one's
    // first (it is due on 109 — caught up once, `late`).
    expect(directee.filter((x) => x.sent_on === day(s.day0, 107))).toHaveLength(2);
    expect(directee.filter((x) => x.sent_on === day(s.day0, 114))).toHaveLength(3);
    expect(new Set(directee.map((x) => x.subject_key)).size).toBe(3);
  });

  it('⭐ the closure notice: recorded DUE at the closure, ONE child per recipient, sent ONCE (⛔ again on a later day), the outbox DONE', async () => {
    const s = await seed({ contactLocale: 'en' });
    await reach(s);
    await request(s);
    const closed = await approve(s);
    expect(closed.closure.closureNoticePersonKeys).toHaveLength(1);
    const h = harness();
    await sweepOn(h, day(s.day0, 97));
    const notices = h.enqueued.filter((e) => e.queue === 'claim.correction.closure_notice');
    expect(notices).toHaveLength(1);
    const out = await runClosureNoticeChild(h.deps, notices[0]!.data as JobEnvelope<ClosureNoticePayload>, 'job-n1');
    expect(out).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.body).toContain(claim.claimShortReference(s.claimCaseId));
    expect(h.sent[0]!.body).toContain(HELPLINE);
    // A redelivered child is a no-op; the next day's sweep enqueues nothing.
    expect(await runClosureNoticeChild(h.deps, notices[0]!.data as JobEnvelope<ClosureNoticePayload>, 'job-n2')).toMatchObject({ status: 'noop' });
    await sweepOn(h, day(s.day0, 98));
    expect(h.enqueued.filter((e) => e.queue === 'claim.correction.closure_notice')).toHaveLength(1);
    const [row] = (await pool.query('SELECT closure_notice_done_at FROM claim_correction_closures WHERE claim_case_id = $1', [s.claimCaseId])).rows;
    expect(row.closure_notice_done_at).not.toBeNull();
    expect(await rowsOf(s.claimCaseId, ['closure_notice'])).toEqual([expect.objectContaining({ outcome: 'accepted' })]);
  });

  it('⭐ `-274` 2 — ⛔ a text to a known-dead number: a closure LETTER is owed and CHASED from the closure date (day 7, daily to 12, the Pariwar Admin on day 13)', async () => {
    const s = await seed();
    const da = await shepherd(s.claimCaseId);
    const pa = await thePariwarAdmin();
    await reach(s, 'rejected_invalid_number');
    const personKey = (await withPariwarScope(pool, PARIWAR, (db: Db) => claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId))))
      .people[0]!.personKey;
    const l = await act((client) =>
      claim.recordCorrectionLetter(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), personKey, postedOn: day(s.day0, 2),
        trackingNumberCiphertext: 'enc:v1:t', actorId: da, actorDisplay: 'DA', crypto: enc,
      }),
    );
    await act((client) =>
      claim.recordCorrectionLetterDelivery(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), letterId: l.letterId, deliveredOn: day(s.day0, 4),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: da, actorDisplay: 'DA',
      }),
    );
    await request(s);
    const closed = await approve(s);
    expect(closed.closure).toMatchObject({ closureNoticePersonKeys: [], closureLetterPersonKeys: [personKey] });
    const closedOn = cycleCalendar.istDateOf(closed.closure.closedAt!);
    const h = harness();
    for (const n of [6, 7, 9, 12, 13, 14]) await sweepOn(h, day(closedOn, n));
    expect(h.enqueued.filter((e) => e.queue === 'claim.correction.closure_notice')).toEqual([]);
    expect(h.sent).toEqual([]);
    const rows = await rowsOf(s.claimCaseId, ['closure_letter_chase', 'closure_letter_escalation']);
    expect(rows.filter((r) => r.purpose === 'closure_letter_chase').map((r) => [r.sent_on, r.recipient_key])).toEqual([
      [day(closedOn, 7), `staff:${da}`],
      [day(closedOn, 9), `staff:${da}`],
      [day(closedOn, 12), `staff:${da}`],
    ]);
    expect(rows.filter((r) => r.purpose === 'closure_letter_escalation').map((r) => [r.sent_on, r.recipient_key])).toEqual([[day(closedOn, 13), `staff:${pa}`]]);
  });

  // ⚠ These two LAST: each leaves a closure in the (B) scan (an un-done outbox / a letter in its window) that an
  // earlier test's sweep of this Pariwar would otherwise pick up.
  it('⭐ code review (2026-10-03, second pass) — a LOST finalise CAS after a real send reports `skipped`, ALARMS, and still completes the outbox', async () => {
    const s = await seed({ contactLocale: 'en' });
    await reach(s);
    await request(s);
    await approve(s);
    const h = harness();
    await sweepOn(h, day(s.day0, 97));
    const notices = h.enqueued.filter((e) => e.queue === 'claim.correction.closure_notice');
    expect(notices).toHaveLength(1);
    // While the SMS is in flight, ANOTHER invocation takes the row over (its `claimed_by_job` moves) — the CAS loses.
    const racing: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({
        send: async (m) => {
          h.sent.push(m);
          await pool.query(
            `UPDATE claim_correction_reminders SET claimed_by_job = 'another-job' WHERE claim_case_id = $1 AND purpose = 'closure_notice'`,
            [s.claimCaseId],
          );
          return `gw-${randomUUID()}`;
        },
      }),
    };
    const out = await runClosureNoticeChild({ ...h.deps, smsAppClient: racing }, notices[0]!.data as JobEnvelope<ClosureNoticePayload>, 'job-lost');
    expect(out).toEqual({ status: 'skipped', reason: 'moved_before_finalise' });
    expect(h.sent).toHaveLength(1);
    expect(h.alarms.some((a) => a.includes('moved on before its finalise'))).toBe(true);
    // The row is still the OTHER invocation's — this attempt wrote ⛔ its outcome.
    expect(await rowsOf(s.claimCaseId, ['closure_notice'])).toEqual([expect.objectContaining({ outcome: 'attempting' })]);
  });

  it('⭐ code review (2026-10-03, second pass) — the (B) scan cutoff is an IST-midnight INSTANT: a closure at 00:30 IST on day D is still swept on D+14', async () => {
    // Under a UTC session the old `$1::date - 14` cutoff was 05:30 IST — a closure between IST midnight and 05:30 on the
    // cutoff day fell out of the scan a day early, and its once-only late catch-up (the day-13 escalation) never wrote.
    const s = await seed();
    const da = await shepherd(s.claimCaseId);
    const pa = await thePariwarAdmin();
    await reach(s, 'rejected_invalid_number');
    const personKey = (await withPariwarScope(pool, PARIWAR, (db: Db) => claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId))))
      .people[0]!.personKey;
    const l = await act((client) =>
      claim.recordCorrectionLetter(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), personKey, postedOn: day(s.day0, 2),
        trackingNumberCiphertext: 'enc:v1:t', actorId: da, actorDisplay: 'DA', crypto: enc,
      }),
    );
    await act((client) =>
      claim.recordCorrectionLetterDelivery(client, {
        pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(s.claimCaseId), letterId: l.letterId, deliveredOn: day(s.day0, 4),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: da, actorDisplay: 'DA',
      }),
    );
    await request(s);
    const closed = await approve(s);
    const closedOn = cycleCalendar.istDateOf(closed.closure.closedAt!);
    await pool.query(`UPDATE claim_correction_closures SET closed_at = $2 WHERE closure_id = $1`, [
      closed.closure.closureId,
      new Date(Date.parse(`${closedOn}T00:30:00+05:30`)),
    ]);
    const h = harness();
    await sweepOn(h, day(closedOn, 14));
    const rows = await rowsOf(s.claimCaseId, ['closure_letter_escalation']);
    expect(rows.map((r) => [r.sent_on, r.recipient_key, r.late])).toEqual([[day(closedOn, 14), `staff:${pa}`, true]]);
  });

  it('⭐ code review (2026-10-03, open item) — the `no_target` path: a LOST finalise CAS reports `skipped`, ALARMS, writes ⛔ its outcome', async () => {
    const s = await seed({ contactLocale: 'en' });
    await reach(s);
    await request(s);
    await approve(s);
    const person = (await withPariwarScope(pool, PARIWAR, (db: Db) => claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId))))
      .people[0]!;
    const h = harness();
    await sweepOn(h, day(s.day0, 97));
    const notices = h.enqueued.filter((e) => e.queue === 'claim.correction.closure_notice' && (e.data.payload as ClosureNoticePayload).claimCaseId === s.claimCaseId);
    expect(notices).toHaveLength(1);
    // After the closure, the person's stored number stops being sendable (it decrypts to a value that ⛔ normalises),
    // PLANTED RAW: the state a 6.20 correction to a bad number would leave.
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('UPDATE member_nominee_versions SET mobile_ciphertext = $2 WHERE version_id = $1', [
        person.versionId,
        await encryptField('12345', PARIWAR, 'member_nominee', enc),
      ]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    // The race: while the child decrypts that number, ANOTHER invocation takes the row over — the CAS then loses.
    let raced = false;
    const kms = new Proxy(enc.kms, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver) as unknown;
        if (prop !== 'decryptDek' || typeof v !== 'function') return v;
        return async (...args: unknown[]) => {
          if (!raced) {
            raced = true;
            await pool.query(
              `UPDATE claim_correction_reminders SET claimed_by_job = 'another-job' WHERE claim_case_id = $1 AND purpose = 'closure_notice'`,
              [s.claimCaseId],
            );
          }
          return (v as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });
    const out = await runClosureNoticeChild({ ...h.deps, encryption: { ...enc, kms } }, notices[0]!.data as JobEnvelope<ClosureNoticePayload>, 'job-nt');
    expect(raced).toBe(true);
    expect(out).toEqual({ status: 'skipped', reason: 'moved_before_finalise' });
    expect(h.sent).toEqual([]);
    expect(h.alarms.some((a) => a.includes('moved on before its no_target finalise'))).toBe(true);
    expect(await rowsOf(s.claimCaseId, ['closure_notice'])).toEqual([expect.objectContaining({ outcome: 'attempting' })]);
  });
});

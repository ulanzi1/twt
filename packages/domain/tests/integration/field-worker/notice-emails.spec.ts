// Story 13.1g — the move-notice EMAIL's domain half against the LIVE database (Task 2.3; AC3, AC4; decision `2026-11-12-463` AD2-AD6;
// ADR-0045). The selector (the Q-2 rule's two branches and its exception), Q4 (who may still be emailed), the claiming transaction
// (`begun` / `skipped` / `expired` / `already_final` / `held_by_other`), the park and the give-up, and the detail grammar's lockstep with
// 0206. ⭐ Every notice is written by 13.1d's REAL commands (open / accept / refuse / escalate / a direct move / an ending), so the
// recipient set under test is the shipped one. A fresh Pariwar per test; per-test ROLLBACK. The claim runs as `twt_app` in the notice's
// scope (0206's column grants are exercised — TR9); the cross-Pariwar leg runs as the superuser (RLS off: the explicit `pariwar_id`
// predicate is what holds, G18). The race of two claims needs committed rows on two connections — the jobs live test.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { postFieldWorker, terminateFieldWorker } from '../../../src/field-worker/commands.js';
import {
  acceptFieldWorkerMoveRequest,
  escalateStaleMoveRequest,
  openFieldWorkerMoveRequest,
  refuseFieldWorkerMoveRequest,
} from '../../../src/field-worker/move-request-commands.js';
import {
  FIELD_WORKER_NOTICE_EMAIL_LEASE_MS,
  FIELD_WORKER_NOTICE_EMAIL_PARKED_BY,
  beginFieldWorkerNoticeEmail,
  expireExhaustedFieldWorkerNoticeEmails,
  fieldWorkerNoticeEmailDetail,
  fieldWorkerNoticeEmailReclaimCutoff,
  finaliseFieldWorkerNoticeEmail,
  isFieldWorkerNoticeEmailDetail,
  parkHeldFieldWorkerNoticeEmails,
  selectDueFieldWorkerNoticeEmails,
} from '../../../src/field-worker/notice-email.js';
import { bindScopedDb } from '../../../src/db.js';
import { fieldWorkerMoveRequestId as toRequestId, pariwarId as toPariwarId, type FieldWorkerId, type PariwarId } from '../../../src/ids/index.js';
import { authorize } from '../../../src/rbac/check.js';
import { FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN } from '../../../src/schema/field_worker_notice_emails.js';
import { FIELD_WORKER_NOTICE_KINDS } from '../../../src/schema/field_worker_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { actAuthorization, grantAuthorization, registerReal } from './_fixtures.js';

type Client = pg.PoolClient;

/** The officers of one test's fresh Pariwar — every one ACTIVE with an admin login (Q4's positive case). */
interface Cast {
  P: PariwarId;
  daPatna: string;
  daGaya: string;
  daGaya2: string;
  daNalanda: string;
  pa: string;
}

/** As the superuser: a user (status), an admin login unless `credentials: false`, and one grant. */
async function officer(
  c: Client,
  P: string,
  grant: { role: string; dimension: string; value: string | null },
  o: { credentials?: boolean } = {},
): Promise<string> {
  const id = randomUUID();
  await c.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active')`, [id]);
  if (o.credentials !== false) {
    await c.query(`INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, 'enc:v1:x', $2, 'hash')`, [id, `bidx-131g-${id}`]);
  }
  await c.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [id, P, grant.role, grant.dimension, grant.value]);
  return id;
}
const DA = (d: string) => ({ role: 'district_admin', dimension: 'district', value: d });

async function seedCast(c: Client): Promise<Cast> {
  const P = toPariwarId(randomUUID());
  return {
    P,
    daPatna: await officer(c, P, DA('Patna')),
    daGaya: await officer(c, P, DA('Gaya')),
    daGaya2: await officer(c, P, DA('Gaya')),
    daNalanda: await officer(c, P, DA('Nalanda')),
    pa: await officer(c, P, { role: 'pariwar_admin', dimension: 'pariwar', value: P }),
  };
}

const da = (district: string) => ({ role: 'district_admin' as const, district });
const auth = (key: string, grant: Parameters<typeof grantAuthorization>[1], P: string, district: string, actorId: string) => {
  const a = grantAuthorization(key, grant, P, district, actorId);
  if (a === null) throw new Error(`the real check refused ${key} at ${district}`);
  return a;
};
const base = (P: PariwarId, actorId: string) => ({ pariwarId: P, auditId: randomUUID(), actor: 'operator' as const, actorId });

/** 13.1d's REAL open, Patna → `to`, by `by` at the `from` end. */
async function open(c: Client, cast: Cast, worker: FieldWorkerId, o: { by?: string; to?: string; authorization?: ReturnType<typeof auth> } = {}) {
  const id = toRequestId(randomUUID());
  const by = o.by ?? cast.daPatna;
  await openFieldWorkerMoveRequest(c, {
    ...base(cast.P, by),
    moveRequestId: id,
    fieldWorkerId: worker,
    fromDistrict: 'Patna',
    toDistrict: o.to ?? 'Gaya',
    authorization: o.authorization ?? auth('field_worker.request_move', da('Patna'), cast.P, 'Patna', by),
  });
  return id;
}
const answer = (cast: Cast, id: ReturnType<typeof toRequestId>, by: string, district = 'Gaya') => ({
  ...base(cast.P, by),
  moveRequestId: id,
  authorization: auth('field_worker.answer_move_request', da(district), cast.P, district, by),
});

interface NoticeRow {
  notice_id: string;
  recipient_user_id: string;
  kind: string;
}
async function noticesOf(c: Client, P: string): Promise<NoticeRow[]> {
  return (
    await c.query<NoticeRow>(`SELECT notice_id, recipient_user_id, kind FROM field_worker_notices WHERE pariwar_id = $1 ORDER BY created_at, notice_id`, [P])
  ).rows;
}
async function emailRow(c: Client, noticeId: string) {
  return (
    await c.query<{ outcome: string; detail: string | null; attempt_count: number; may_have_sent: boolean; claimed_by_job: string | null; aging_since: Date }>(
      `SELECT outcome, detail, attempt_count, may_have_sent, claimed_by_job, aging_since FROM field_worker_notice_emails WHERE notice_id = $1`,
      [noticeId],
    )
  ).rows[0];
}
/** The DATABASE clock ([[project_ist_vs_utc_test_date_window]]). */
async function dbNow(c: Client): Promise<Date> {
  return (await c.query<{ n: Date }>('SELECT now() AS n')).rows[0]!.n;
}
async function istToday(c: Client): Promise<string> {
  return (await c.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date)::text AS d")).rows[0]!.d;
}
/** As the superuser, triggers off (the notices' guard refuses a `created_at` change for EVERY role), then back into the scope. */
async function asOwner<T>(c: Client, P: string, fn: () => Promise<T>): Promise<T> {
  await c.query('RESET ROLE');
  await c.query("SET LOCAL session_replication_role = 'replica'");
  try {
    return await fn();
  } finally {
    await c.query("SET LOCAL session_replication_role = 'origin'");
    await enterAppScope(c, P);
  }
}

describe.skipIf(!hasDatabase)('Story 13.1g — the move-notice email (domain, live DB)', { timeout: 30000 }, () => {
  setupLiveDb();
  let c: Client;
  let cast: Cast;
  let worker: FieldWorkerId;
  let now: Date;
  const begin = (noticeId: string, jobId = 'job-1', at?: Date) => beginFieldWorkerNoticeEmail(c, { pariwarId: cast.P, noticeId, jobId, now: at ?? now });
  const due = async (o: { after?: string | null; limit?: number; allow?: string[] } = {}) =>
    (await selectDueFieldWorkerNoticeEmails(c, { after: o.after ?? null, limit: o.limit ?? 100, now, allow: o.allow ?? [cast.P] })).due;

  beforeEach(async () => {
    c = getTx().client;
    cast = await seedCast(c);
    await enterAppScope(c, cast.P);
    worker = await registerReal(c, cast.P, { district: 'Patna' });
    now = await dbNow(c);
  });

  it('the detail builder emits ONLY the 0206 grammar, for every kind (lockstep with the CHECK pattern); the parked marker is 6.25\'s', () => {
    const built = [
      fieldWorkerNoticeEmailDetail({ kind: 'not_eligible' }),
      fieldWorkerNoticeEmailDetail({ kind: 'transient', name: 'timeout' }),
      fieldWorkerNoticeEmailDetail({ kind: 'transient', name: 'user@example.com said no' }),
      fieldWorkerNoticeEmailDetail({ kind: 'held', name: 'AccountSuspendedException' }),
      fieldWorkerNoticeEmailDetail({ kind: 'pre_call', step: 'render_failed' }),
      fieldWorkerNoticeEmailDetail({ kind: 'rejected', http: 400, name: 'MessageRejected' }),
      fieldWorkerNoticeEmailDetail({ kind: 'error', reason: 'invalid_address' }),
      fieldWorkerNoticeEmailDetail({ kind: 'exhausted_three_days' }),
      fieldWorkerNoticeEmailDetail({ kind: 'recheck_not_eligible' }),
    ];
    for (const d of built) expect(isFieldWorkerNoticeEmailDetail(d), d).toBe(true);
    expect(built.join(' ')).not.toContain('@');
    expect(isFieldWorkerNoticeEmailDetail('no_approver')).toBe(false);
    expect(FIELD_WORKER_NOTICE_EMAIL_PARKED_BY).toBe('sweep:held');
    expect(FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN).toContain('skipped:not_eligible');
  });

  describe('AC3 — selection (the Q-2 rule)', () => {
    it('a notice with ⛔ email row is due — SEEN or not (Q-2 B); a FINAL row is not; ids only, keyset on notice_id', async () => {
      await open(c, cast, worker);
      const [a, b] = await noticesOf(c, cast.P);
      expect(new Set([a!.recipient_user_id, b!.recipient_user_id])).toEqual(new Set([cast.daGaya, cast.daGaya2]));
      await c.query('UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1', [a!.notice_id]); // the officer glanced
      const ids = [a!.notice_id, b!.notice_id].sort();
      expect((await due()).map((d) => [d.noticeId, d.pariwarId, d.hasAttemptingRow])).toEqual(ids.map((id) => [id, cast.P, false]));
      // Keyset: one per page, in notice_id order, then nothing.
      const p1 = await selectDueFieldWorkerNoticeEmails(c, { after: null, limit: 1, now, allow: [cast.P] });
      expect(p1.due.map((d) => d.noticeId)).toEqual([ids[0]]);
      const p2 = await selectDueFieldWorkerNoticeEmails(c, { after: p1.last, limit: 1, now, allow: [cast.P] });
      expect(p2.due.map((d) => d.noticeId)).toEqual([ids[1]]);
      expect((await selectDueFieldWorkerNoticeEmails(c, { after: p2.last, limit: 1, now, allow: [cast.P] })).due).toEqual([]);
      // A final row takes its notice out.
      expect((await begin(ids[0]!)).kind).toBe('begun');
      expect(await finaliseFieldWorkerNoticeEmail(bindScopedDb(c), { pariwarId: cast.P, noticeId: ids[0]!, jobId: 'job-1', outcome: 'accepted', providerMessageId: 'm-1' })).toEqual({
        mayHaveSent: false,
      });
      expect((await due()).map((d) => d.noticeId)).toEqual([ids[1]]);
    });

    it('the Q-2 rule\'s exception (i): a notice created BEFORE the cutoff, with ⛔ row, is ⛔ due — ever; one created at the cutoff IS', async () => {
      await open(c, cast, worker);
      const [a, b] = await noticesOf(c, cast.P);
      const cutoff = fieldWorkerNoticeEmailReclaimCutoff(now);
      await asOwner(c, cast.P, async () => {
        await c.query(`UPDATE field_worker_notices SET created_at = $2::timestamptz - interval '1 microsecond' WHERE notice_id = $1`, [a!.notice_id, cutoff]);
        await c.query(`UPDATE field_worker_notices SET created_at = $2::timestamptz WHERE notice_id = $1`, [b!.notice_id, cutoff]);
      });
      expect((await due()).map((d) => d.noticeId)).toEqual([b!.notice_id]);
      // The cutoff is 00:00 IST of (today − 2): a notice ONE day old is still due.
      expect(cutoff.getTime()).toBeLessThan(now.getTime() - 2 * 24 * 3600 * 1000 + 1);
      expect(cutoff.getTime()).toBeGreaterThan(now.getTime() - 3 * 24 * 3600 * 1000);
    });

    it('an `attempting` row IS due whatever its notice\'s age or `seen_at` (a parked row is re-claimed after a hold); `allow` confines both branches', async () => {
      await open(c, cast, worker);
      const [a, b] = await noticesOf(c, cast.P);
      expect((await begin(a!.notice_id)).kind).toBe('begun');
      await asOwner(c, cast.P, async () => {
        await c.query(`UPDATE field_worker_notices SET created_at = now() - interval '10 days', seen_at = now() WHERE notice_id = $1`, [a!.notice_id]);
        await c.query(`UPDATE field_worker_notice_emails SET claimed_by_job = $2, parked_at = now() WHERE notice_id = $1`, [a!.notice_id, FIELD_WORKER_NOTICE_EMAIL_PARKED_BY]);
      });
      expect((await due()).map((d) => [d.noticeId, d.hasAttemptingRow]).sort()).toEqual(
        [
          [a!.notice_id, true],
          [b!.notice_id, false],
        ].sort(),
      );
      // Another Pariwar's notices are out of an allow-list that does not name it.
      expect(await due({ allow: [randomUUID()] })).toEqual([]);
    });
  });

  describe('AC4 — the claim and its re-check (Q4)', () => {
    it('a fresh eligible notice → `begun` (the notice row\'s recipient and kind); the own job re-claims; another job inside the lease → `held_by_other`; a final row → `already_final`', async () => {
      await open(c, cast, worker);
      const [n] = await noticesOf(c, cast.P);
      await c.query('UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1', [n!.notice_id]); // SEEN before the claim — still begun
      const first = await begin(n!.notice_id);
      expect(first).toMatchObject({ kind: 'begun', noticeId: n!.notice_id, recipientUserId: n!.recipient_user_id, noticeKind: 'move_request_opened', attemptCount: 1, mayHaveSent: false });
      expect(await emailRow(c, n!.notice_id)).toMatchObject({ outcome: 'attempting', claimed_by_job: 'job-1', attempt_count: 1 });
      expect(await begin(n!.notice_id, 'job-2')).toEqual({ kind: 'held_by_other' });
      // The own job's retry: attempt 2; a claim with ⛔ detail recorded (it may have reached the provider) ⇒ may_have_sent.
      expect(await begin(n!.notice_id, 'job-1')).toMatchObject({ kind: 'begun', attemptCount: 2, mayHaveSent: true });
      // Past the lease another job takes it.
      expect(await begin(n!.notice_id, 'job-3', new Date(now.getTime() + FIELD_WORKER_NOTICE_EMAIL_LEASE_MS + 1000))).toMatchObject({ kind: 'begun', attemptCount: 3 });
      expect(await finaliseFieldWorkerNoticeEmail(bindScopedDb(c), { pariwarId: cast.P, noticeId: n!.notice_id, jobId: 'job-1', outcome: 'accepted' })).toBeNull(); // ⛔ the holder
      expect(await finaliseFieldWorkerNoticeEmail(bindScopedDb(c), { pariwarId: cast.P, noticeId: n!.notice_id, jobId: 'job-3', outcome: 'accepted' })).toEqual({ mayHaveSent: true });
      expect(await begin(n!.notice_id, 'job-4')).toEqual({ kind: 'already_final' });
      // ⛔ The email path wrote the notice: `seen_at` is the officer's, unchanged by any of it.
      expect((await c.query('SELECT seen_at IS NOT NULL AS seen FROM field_worker_notices WHERE notice_id = $1', [n!.notice_id])).rows[0]).toEqual({ seen: true });
    });

    it('⭐ a positive leg per kind\'s recipient set, written by 13.1d\'s REAL commands — every kind is claimable', async () => {
      // opened → the Gaya DAs; accepted → the opener.
      const r1 = await open(c, cast, worker);
      await acceptFieldWorkerMoveRequest(c, answer(cast, r1, cast.daGaya));
      // refused → the opener + refused_admin → the PA (the worker is now in Gaya; ask Gaya → Patna back? No: a NEW worker in Patna).
      const w2 = await registerReal(c, cast.P, { district: 'Patna' });
      const r2 = await open(c, cast, w2);
      await refuseFieldWorkerMoveRequest(c, { ...answer(cast, r2, cast.daGaya), refusalReason: 'no_capacity' });
      // escalated → the PA (and the opener).
      const w3 = await registerReal(c, cast.P, { district: 'Patna' });
      const r3 = await open(c, cast, w3);
      // Age it past 7 days — as the owner, its write guard off (the 13.1d precedent backdates the same column).
      await asOwner(c, cast.P, () => c.query("UPDATE field_worker_move_requests SET opened_at = now() - interval '7 days 1 minute' WHERE move_request_id = $1", [r3]));
      expect(await escalateStaleMoveRequest(c, { pariwarId: cast.P, moveRequestId: r3, auditId: randomUUID() })).not.toBeNull();
      // superseded (B2) + moved_by_pariwar_admin: a request Patna → Gaya, then the PA moves the worker Patna → Nalanda.
      const w4 = await registerReal(c, cast.P, { district: 'Patna' });
      await open(c, cast, w4);
      await postFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: w4, toDistrict: 'Nalanda', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: actAuthorization('field_worker.move', cast.P, 'Nalanda', cast.pa) });
      const all = await noticesOf(c, cast.P);
      expect(new Set(all.map((n) => n.kind))).toEqual(new Set(FIELD_WORKER_NOTICE_KINDS));
      for (const n of all) {
        const r = await begin(n.notice_id);
        expect(r, `${n.kind} → ${n.recipient_user_id}`).toMatchObject({ kind: 'begun', recipientUserId: n.recipient_user_id, noticeKind: n.kind });
      }
    });

    it('Q4 negatives → `skipped` / `skipped:not_eligible`, nothing to send: suspended, disabled, ⛔ login, the grant revoked, a THIRD district, a stale-scoped Pariwar Admin, a PA grant replaced by a state one', async () => {
      const w = [worker, ...(await Promise.all([0, 1, 2, 3].map(() => registerReal(c, cast.P, { district: 'Patna' }))))];
      // Each officer below is given a Gaya grant, told of an open (13.1d's writer), then made ineligible.
      const make = async (o: { credentials?: boolean } = {}) => (await asOwner(c, cast.P, () => officer(c, cast.P, DA('Gaya'), o)));
      const suspended = await make();
      const disabled = await make();
      const noLogin = await make({ credentials: false });
      const revoked = await make();
      const moved = await make();
      await open(c, cast, w[0]!);
      await asOwner(c, cast.P, async () => {
        await c.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [suspended]);
        await c.query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [disabled]);
        await c.query(`DELETE FROM role_grants WHERE user_id = $1`, [revoked]);
        await c.query(`UPDATE role_grants SET scope_value = 'Nalanda' WHERE user_id = $1`, [moved]); // now a District Admin of a THIRD district
      });
      // A Pariwar Admin whose `pariwar` grant names ANOTHER Pariwar (13.1d's helper admits it), and one whose grant is later replaced by a state one.
      const stalePa = await asOwner(c, cast.P, () => officer(c, cast.P, { role: 'pariwar_admin', dimension: 'pariwar', value: randomUUID() }));
      const replacedPa = await asOwner(c, cast.P, () => officer(c, cast.P, { role: 'pariwar_admin', dimension: 'pariwar', value: cast.P }));
      const r = await open(c, cast, w[1]!);
      await refuseFieldWorkerMoveRequest(c, { ...answer(cast, r, cast.daGaya), refusalReason: 'other' });
      await asOwner(c, cast.P, () => c.query(`UPDATE role_grants SET scope_dimension = 'state', scope_value = 'Bihar' WHERE user_id = $1`, [replacedPa]));
      const all = await noticesOf(c, cast.P);
      const negatives = [suspended, disabled, noLogin, revoked, moved, stalePa, replacedPa];
      for (const who of negatives) {
        const n = all.filter((x) => x.recipient_user_id === who);
        expect(n.length, who).toBeGreaterThan(0); // 13.1d's writer DID tell them in-app
        for (const x of n) {
          expect(await begin(x.notice_id), `${x.kind} → ${who}`).toEqual({ kind: 'skipped' });
          expect(await emailRow(c, x.notice_id)).toMatchObject({ outcome: 'skipped', detail: 'skipped:not_eligible', attempt_count: 1 });
          expect(await begin(x.notice_id, 'job-2')).toEqual({ kind: 'already_final' }); // a skipped row sends nothing, ever
        }
      }
      // CONTROL — the eligible officers of the same acts are begun.
      for (const x of all.filter((n) => !negatives.includes(n.recipient_user_id))) expect((await begin(x.notice_id)).kind).toBe('begun');
    });

    it('a `super_admin` opener is ⛔ emailed (⛔ `global` branch) — its accepted notice is `skipped`; the console still has it', async () => {
      const su = await asOwner(c, cast.P, () => officer(c, cast.P, { role: 'super_admin', dimension: 'global', value: null }));
      const authorization = authorize({
        actorId: su,
        grants: [{ pariwarId: cast.P, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        key: 'field_worker.request_move',
        resource: { dimension: 'district', value: 'Patna', pariwarId: cast.P },
      });
      expect(authorization).not.toBeNull();
      const id = await open(c, cast, worker, { by: su, authorization: authorization! });
      await acceptFieldWorkerMoveRequest(c, answer(cast, id, cast.daGaya));
      const accepted = (await noticesOf(c, cast.P)).filter((n) => n.kind === 'move_request_accepted');
      expect(accepted.map((n) => n.recipient_user_id)).toEqual([su]);
      expect(await begin(accepted[0]!.notice_id)).toEqual({ kind: 'skipped' });
    });

    it('the re-check failing on a RE-claim ⇒ `expired` / `error` / `exhausted:recheck_not_eligible`, may_have_sent', async () => {
      await open(c, cast, worker);
      const n = (await noticesOf(c, cast.P)).find((x) => x.recipient_user_id === cast.daGaya)!;
      expect((await begin(n.notice_id)).kind).toBe('begun');
      await asOwner(c, cast.P, () => c.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [cast.daGaya]));
      const later = new Date(now.getTime() + FIELD_WORKER_NOTICE_EMAIL_LEASE_MS + 1000);
      expect(await begin(n.notice_id, 'job-2', later)).toEqual({ kind: 'expired', detail: 'exhausted:recheck_not_eligible' });
      expect(await emailRow(c, n.notice_id)).toMatchObject({ outcome: 'error', detail: 'exhausted:recheck_not_eligible', may_have_sent: true });
    });

    it('I7 / G18 — as the superuser (RLS off), a notice of Pariwar A claimed with Pariwar B\'s id finds NOTHING and writes nothing', async () => {
      await open(c, cast, worker);
      const [n] = await noticesOf(c, cast.P);
      await c.query('RESET ROLE');
      const other = toPariwarId(randomUUID());
      await expect(beginFieldWorkerNoticeEmail(c, { pariwarId: other, noticeId: n!.notice_id, jobId: 'job-1', now })).rejects.toThrow(/is missing under Pariwar/);
      expect(await emailRow(c, n!.notice_id)).toBeUndefined();
    });
  });

  describe('the park and the give-up (the Q-2 rule\'s exception (ii))', () => {
    it('a HELD run parks a stale `attempting` row; its re-claim credits ONLY the parked time to `aging_since`', async () => {
      await open(c, cast, worker);
      const [n] = await noticesOf(c, cast.P);
      const claimedAt = new Date(now.getTime() - FIELD_WORKER_NOTICE_EMAIL_LEASE_MS - 60_000);
      expect((await begin(n!.notice_id, 'job-1', claimedAt)).kind).toBe('begun');
      const before = (await emailRow(c, n!.notice_id))!.aging_since;
      await c.query('RESET ROLE');
      expect(await parkHeldFieldWorkerNoticeEmails(c, { now, allow: [cast.P] })).toBe(1);
      expect(await parkHeldFieldWorkerNoticeEmails(c, { now, allow: [cast.P] })).toBe(0); // already parked
      await enterAppScope(c, cast.P);
      expect(await emailRow(c, n!.notice_id)).toMatchObject({ claimed_by_job: FIELD_WORKER_NOTICE_EMAIL_PARKED_BY });
      const reclaim = new Date(now.getTime() + 3_600_000);
      expect(await begin(n!.notice_id, 'job-2', reclaim)).toMatchObject({ kind: 'begun', attemptCount: 2 });
      const after = (await emailRow(c, n!.notice_id))!.aging_since;
      expect(after.getTime() - before.getTime()).toBe(3_600_000); // exactly the hour it sat parked
    });

    it('an un-parked `attempting` row aging from before the cutoff is given up `error` / `exhausted:attempting_three_days`; a parked one is ⛔; `allow` confines it', async () => {
      await open(c, cast, worker);
      const [a, b] = await noticesOf(c, cast.P);
      const old = new Date(now.getTime() - 4 * 24 * 3600 * 1000);
      expect((await begin(a!.notice_id, 'job-1', old)).kind).toBe('begun');
      expect((await begin(b!.notice_id, 'job-1', old)).kind).toBe('begun');
      await asOwner(c, cast.P, async () => {
        await c.query(`UPDATE field_worker_notice_emails SET aging_since = $2 WHERE notice_id = ANY($1::uuid[])`, [[a!.notice_id, b!.notice_id], old]);
        await c.query(`UPDATE field_worker_notice_emails SET claimed_by_job = $2, parked_at = now() WHERE notice_id = $1`, [b!.notice_id, FIELD_WORKER_NOTICE_EMAIL_PARKED_BY]);
      });
      await c.query('RESET ROLE');
      const cutoff = fieldWorkerNoticeEmailReclaimCutoff(now);
      expect(await expireExhaustedFieldWorkerNoticeEmails(c, { cutoff, now, allow: [randomUUID()] })).toEqual([]);
      expect(await expireExhaustedFieldWorkerNoticeEmails(c, { cutoff, now, allow: [cast.P] })).toEqual([{ noticeId: a!.notice_id, pariwarId: cast.P }]);
      expect(await emailRow(c, a!.notice_id)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days', may_have_sent: true });
      expect(await emailRow(c, b!.notice_id)).toMatchObject({ outcome: 'attempting', claimed_by_job: FIELD_WORKER_NOTICE_EMAIL_PARKED_BY });
      // Given up ⇒ never sent again: ⛔ due, and a claim finds it final.
      await enterAppScope(c, cast.P);
      expect((await due()).map((d) => d.noticeId)).toEqual([b!.notice_id]);
      expect(await begin(a!.notice_id, 'job-9')).toEqual({ kind: 'already_final' });
    });
  });

  it('an ending supersedes the request — its `move_request_superseded` notices are claimable like any other (AD9: ⛔ held, ⛔ dated)', async () => {
    await open(c, cast, worker);
    await terminateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'left_voluntarily', endedOn: await istToday(c), authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) });
    const sup = (await noticesOf(c, cast.P)).filter((n) => n.kind === 'move_request_superseded');
    expect(sup.length).toBeGreaterThan(0);
    for (const n of sup) expect((await begin(n.notice_id)).kind).toBe('begun');
  });
});

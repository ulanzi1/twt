// Migration 0187 — the memorial take-down's three tables: `memorial_takedown_requests`, `memorial_takedown_outcomes`,
// `memorial_takedown_approver_emails` (Story 11b.4a, Task 2.3; `-412` MP7 / MP8 / MP10 / MP11 / MP14; AI-6-5 family 5).
//   · structure — ENABLE + FORCE on all three; per-command policies (requests / outcomes SELECT + INSERT only — append-only; the
//     outbox SELECT + INSERT + UPDATE — 6.25's leg); the privilege matrix (⛔ DELETE, ⛔ TRUNCATE anywhere; the outbox's INSERT and
//     UPDATE narrowed to 6.25's EXACT column sets); every CHECK, unique constraint and index BY NAME.
//   · RLS — positive, the leak invariant, write isolation (42501), fail-closed with ⛔ scope.
//   · the foreign keys — the request's two composite FKs (the shown version is THIS Pariwar's and THIS pool's); the outcome's and
//     the outbox's composite FK to the request; the outbox recipient FK.
//   · every CHECK with a violating row naming the ONE constraint it trips, beside a legal row of the same shape — incl. MP14 (b)'s
//     bounds on `first_contact_at` and the stored `due_at`; the outbox's `detail` vocabulary pinned to the TS constant.
//   · the outbox's finished-row trigger (0153 / 0154's, mirrored) — a finished row is frozen even for the superuser;
//     `may_have_sent` never goes back; `aging_since` moves only forward and only on a parked row.
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK (setupLiveDb); seeds as the superuser before scope.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN,
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_OUTCOMES,
} from '../../../src/schema/memorial_takedown_approver_emails.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim, seedMember, seedPool, seedUser } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const REQUESTS = 'memorial_takedown_requests';
const OUTCOMES = 'memorial_takedown_outcomes';
const EMAILS = 'memorial_takedown_approver_emails';
const TABLES = [REQUESTS, OUTCOMES, EMAILS] as const;

interface Outcome {
  code: string | null;
  message: string;
  rowCount: number;
}

async function attempt(client: Client, text: string, params: unknown[] = []): Promise<Outcome> {
  await client.query('SAVEPOINT probe');
  try {
    const r = await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null, message: '', rowCount: r.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    const e = err as { code?: string; message?: string };
    return { code: e.code ?? 'unknown', message: e.message ?? '', rowCount: 0 };
  }
}

function ins(client: Client, table: string, row: Record<string, unknown>): Promise<Outcome> {
  const keys = Object.keys(row);
  return attempt(client, `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map((k) => row[k]));
}

/** A probe that must SUCCEED, rolled back so the next probe starts from the same state. */
async function insOk(client: Client, table: string, row: Record<string, unknown>): Promise<void> {
  await client.query('SAVEPOINT ok');
  const out = await ins(client, table, row);
  expect(out.code, out.message).toBeNull();
  await client.query('ROLLBACK TO SAVEPOINT ok');
}

function expectConstraint(o: Outcome, code: string, constraint: string): void {
  expect(o.code, `${constraint}: ${o.message}`).toBe(code);
  expect(o.message, `expected "${constraint}" in: ${o.message}`).toContain(`"${constraint}"`);
}
const expectCheck = (o: Outcome, c: string) => expectConstraint(o, '23514', c);

interface World {
  readonly pariwarId: string;
  readonly poolId: string;
  readonly submissionId: string;
  readonly otherPoolSubmissionId: string;
  readonly requestId: string;
  readonly userId: string;
}

/** As the superuser: a deceased member's drive with ONE version, a second drive's version, a request on the first, a staff user. */
async function seedWorld(pariwarId: string): Promise<World> {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, pariwarId, { state: 'active' });
  const sub = async (): Promise<{ poolId: string; submissionId: string }> => {
    const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: memberId });
    const poolId = randomUUID();
    await seedPool(tx, pariwarId, { poolId, claimCaseId, poolCanonicalIdentifier: `P-2026-10-${poolId.slice(0, 8)}` });
    const submissionId = randomUUID();
    await client.query(
      `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, body_ciphertext,
         authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref)
       VALUES ($1, $2, $3, $4, $5, 'enc:v1:body', '2026-10-25.v3-pending-hi-review', 'hi', 'latest', $6)`,
      [submissionId, pariwarId, poolId, claimCaseId, memberId, randomUUID()],
    );
    return { poolId, submissionId };
  };
  const a = await sub();
  const b = await sub();
  const userId = await seedUser(tx);
  const requestId = randomUUID();
  await client.query(
    `INSERT INTO ${REQUESTS} (request_id, pariwar_id, pool_id, submission_id, handover_nominee_ref, verified_by, first_contact_at, due_at, actor_id, actor_display)
     VALUES ($1, $2, $3, $4, $5, 'called_back', date_trunc('second', now()) - interval '1 day', date_trunc('second', now()) - interval '1 day' + interval '168 hours', $6, 'Helpline Operator')`,
    [requestId, pariwarId, a.poolId, a.submissionId, randomUUID(), userId],
  );
  return { pariwarId, poolId: a.poolId, submissionId: a.submissionId, otherPoolSubmissionId: b.submissionId, requestId, userId };
}

/** A legal request row for `w` (⛔ inserted): first contact 2 days ago, due 7 days later. */
function requestRow(w: World, over: Record<string, unknown> = {}): Record<string, unknown> {
  const first = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  first.setMilliseconds(0);
  return {
    pariwar_id: w.pariwarId,
    pool_id: w.poolId,
    submission_id: w.submissionId,
    handover_nominee_ref: randomUUID(),
    verified_by: 'called_back',
    first_contact_at: first,
    due_at: new Date(first.getTime() + 168 * 3600 * 1000),
    actor_id: w.userId,
    actor_display: 'Helpline Operator',
    ...over,
  };
}

const outcomeRow = (w: World, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  request_id: w.requestId,
  pariwar_id: w.pariwarId,
  outcome: 'taken_down',
  actor_id: w.userId,
  actor_display: 'Helpline Operator',
  ...over,
});

const emailRow = (w: World, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  pariwar_id: w.pariwarId,
  request_id: w.requestId,
  recipient_user_id: w.userId,
  outcome: 'attempting',
  claimed_at: new Date(),
  claimed_by_job: 'job-1',
  ...over,
});

async function checkNames(client: Client, table: string): Promise<string[]> {
  const { rows } = await client.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'c' ORDER BY conname`,
    [table],
  );
  return rows.map((r) => r.conname);
}

describe.skipIf(!hasDatabase)('0187 — the memorial take-down tables: RLS, FKs, CHECKs, grants, the outbox trigger', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('structure', () => {
    it.each(TABLES)('(a) FORCE RLS: %s has relrowsecurity AND relforcerowsecurity', async (table) => {
      const { rows } = await getTx().client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relkind = 'r'`,
        [table],
      );
      expect(rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
    });

    it.each([
      [REQUESTS, ['INSERT', 'SELECT']],
      [OUTCOMES, ['INSERT', 'SELECT']],
      [EMAILS, ['INSERT', 'SELECT', 'UPDATE']],
    ] as const)('(b) policies: %s has exactly %j for twt_app, keyed on app.pariwar_id — ⛔ DELETE, ⛔ ALL', async (table, cmds) => {
      const { rows } = await getTx().client.query<{ policyname: string; cmd: string; permissive: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT policyname, cmd, permissive, array_to_string(roles, ',') AS roles, qual, with_check FROM pg_policies WHERE tablename = $1 ORDER BY cmd`,
        [table],
      );
      expect(rows.map((r) => r.cmd)).toEqual([...cmds]);
      for (const r of rows) {
        expect(r.permissive).toBe('PERMISSIVE');
        expect(r.roles).toBe('twt_app');
        expect(r.policyname).toBe(`${table}_tenant_isolation_${r.cmd.toLowerCase()}`);
        expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toContain('app.pariwar_id');
      }
    });

    it('(c) privileges: requests and outcomes are append-only (SELECT + INSERT); the outbox is 6.25\'s column-narrowed INSERT / UPDATE; ⛔ DELETE or TRUNCATE anywhere', async () => {
      const { client } = getTx();
      const priv = async (t: string, p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege('twt_app', $1, $2) AS ok`, [t, p])).rows[0]!.ok;
      const cols = async (t: string, p: string) =>
        (
          await client.query<{ attname: string }>(
            `SELECT attname FROM pg_attribute WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped
               AND has_column_privilege('twt_app', attrelid, attnum, $2) ORDER BY attname`,
            [t, p],
          )
        ).rows.map((r) => r.attname);
      for (const t of [REQUESTS, OUTCOMES]) {
        expect(await priv(t, 'SELECT')).toBe(true);
        expect(await priv(t, 'INSERT')).toBe(true);
        expect(await cols(t, 'UPDATE')).toEqual([]);
      }
      for (const t of TABLES) {
        expect(await priv(t, 'DELETE')).toBe(false);
        expect(await priv(t, 'TRUNCATE')).toBe(false);
        expect(await priv(t, 'UPDATE')).toBe(false);
      }
      expect(await priv(EMAILS, 'SELECT')).toBe(true);
      expect(await priv(EMAILS, 'INSERT')).toBe(false);
      expect(await cols(EMAILS, 'INSERT')).toEqual(['claimed_at', 'claimed_by_job', 'detail', 'outcome', 'pariwar_id', 'recipient_user_id', 'request_id']);
      expect(await cols(EMAILS, 'UPDATE')).toEqual([
        'aging_since',
        'attempt_count',
        'claimed_at',
        'claimed_by_job',
        'detail',
        'first_detail',
        'may_have_sent',
        'outcome',
        'parked_at',
        'provider_message_id',
        'updated_at',
      ]);
    });

    it('(d) every CHECK, the unique constraints and the indexes exist BY NAME; the outbox outcome CHECK is the TS set; the detail CHECKs carry the TS pattern', async () => {
      const { client } = getTx();
      expect(await checkNames(client, REQUESTS)).toEqual([
        'memorial_takedown_requests_actor_display_check',
        'memorial_takedown_requests_due_check',
        'memorial_takedown_requests_first_contact_check',
        'memorial_takedown_requests_verified_by_check',
      ]);
      expect(await checkNames(client, OUTCOMES)).toEqual(['memorial_takedown_outcomes_actor_display_check']);
      expect(await checkNames(client, EMAILS)).toEqual([
        'memorial_takedown_approver_emails_attempt_count_check',
        'memorial_takedown_approver_emails_attempting_claimed_check',
        'memorial_takedown_approver_emails_detail_length_check',
        'memorial_takedown_approver_emails_detail_vocabulary_check',
        'memorial_takedown_approver_emails_first_detail_length_check',
        'memorial_takedown_approver_emails_first_detail_vocabulary_check',
        'memorial_takedown_approver_emails_no_target_recipient_check',
        'memorial_takedown_approver_emails_outcome_check',
        'memorial_takedown_approver_emails_parked_check',
      ]);
      const def = async (name: string) =>
        (await client.query<{ d: string }>(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = $1`, [name])).rows[0]?.d ?? '';
      for (const n of ['memorial_takedown_approver_emails_detail_vocabulary_check', 'memorial_takedown_approver_emails_first_detail_vocabulary_check']) {
        expect(await def(n)).toContain(`'${MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN}'`);
      }
      const outcomeDef = await def('memorial_takedown_approver_emails_outcome_check');
      expect([...outcomeDef.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort()).toEqual([...MEMORIAL_TAKEDOWN_APPROVER_EMAIL_OUTCOMES].sort());
      expect(await def('memorial_takedown_approver_emails_request_recipient_uq')).toMatch(/UNIQUE NULLS NOT DISTINCT \(pariwar_id, request_id, recipient_user_id\)/);
      expect(await def('memorial_takedown_requests_pariwar_request_uq')).toMatch(/UNIQUE \(pariwar_id, request_id\)/);
      const idx = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = ANY ($1::text[])`,
        [[REQUESTS, EMAILS, 'memorial_withdrawals']],
      );
      const ix = (n: string) => idx.rows.find((r) => r.indexname === n)?.indexdef ?? '';
      expect(ix('memorial_takedown_requests_pool_idx')).toContain('(pariwar_id, pool_id)');
      expect(ix('memorial_takedown_requests_received_idx')).toContain('(pariwar_id, received_at)');
      expect(ix('memorial_withdrawals_takedown_request_idx')).toMatch(/\(pariwar_id, takedown_request_id\) WHERE \(takedown_request_id IS NOT NULL\)/);
      expect(ix('memorial_takedown_approver_emails_attempting_idx')).toMatch(/\(aging_since, claimed_at\) WHERE \(outcome = 'attempting'::text\)/);
      const enumValues = await client.query<{ v: string }>(`SELECT unnest(enum_range(NULL::memorial_takedown_outcome))::text AS v`);
      expect(enumValues.rows.map((r) => r.v)).toEqual(['taken_down', 'kept', 'superseded']);
    });
  });

  describe('RLS', () => {
    it('(e) positive + the leak invariant: A reads its own rows in all three tables and ZERO of B\'s, even with an explicit WHERE', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      const b = await seedWorld(PARIWAR_B);
      for (const w of [a, b]) {
        await client.query(`INSERT INTO ${OUTCOMES} (request_id, pariwar_id, outcome, actor_id, actor_display) VALUES ($1, $2, 'taken_down', $3, 'Op')`, [w.requestId, w.pariwarId, w.userId]);
        await client.query(`INSERT INTO ${EMAILS} (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job) VALUES ($1, $2, $3, 'attempting', now(), 'j')`, [w.pariwarId, w.requestId, w.userId]);
      }
      await enterAppScope(client, PARIWAR_A);
      for (const t of TABLES) {
        const own = await client.query<{ request_id: string }>(`SELECT request_id FROM ${t}`);
        expect(own.rows.map((r) => r.request_id)).toContain(a.requestId);
        expect(own.rows.map((r) => r.request_id)).not.toContain(b.requestId);
        const forced = await client.query(`SELECT 1 FROM ${t} WHERE pariwar_id = $1`, [PARIWAR_B]);
        expect(forced.rowCount).toBe(0);
      }
    });

    it('(f) write isolation: an A session cannot INSERT a B row in any table (42501); the same row for A inserts', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      const b = await seedWorld(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      expect((await ins(client, REQUESTS, requestRow(b))).code).toBe('42501');
      expect((await ins(client, OUTCOMES, outcomeRow(b))).code).toBe('42501');
      expect((await ins(client, EMAILS, emailRow(b))).code).toBe('42501');
      await insOk(client, REQUESTS, requestRow(a));
      await insOk(client, OUTCOMES, outcomeRow(a));
      await insOk(client, EMAILS, emailRow(a));
    });

    it('(g) fail-closed: with NO scope every SELECT returns 0 rows and every INSERT is refused', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      await enterAppRoleNoScope(client);
      for (const t of TABLES) expect((await client.query(`SELECT 1 FROM ${t}`)).rowCount).toBe(0);
      expect((await ins(client, REQUESTS, requestRow(a))).code).toBe('42501');
      expect((await ins(client, OUTCOMES, outcomeRow(a))).code).toBe('42501');
      expect((await ins(client, EMAILS, emailRow(a))).code).toBe('42501');
    });

    it('(h) append-only: the app role may ⛔ UPDATE or DELETE a request or an outcome, and may ⛔ DELETE an outbox row', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      await client.query(`INSERT INTO ${OUTCOMES} (request_id, pariwar_id, outcome, actor_id, actor_display) VALUES ($1, $2, 'kept', $3, 'Op')`, [a.requestId, PARIWAR_A, a.userId]);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, `UPDATE ${REQUESTS} SET due_at = due_at WHERE request_id = $1`, [a.requestId])).code).toBe('42501');
      expect((await attempt(client, `UPDATE ${OUTCOMES} SET outcome = 'taken_down' WHERE request_id = $1`, [a.requestId])).code).toBe('42501');
      for (const t of TABLES) expect((await attempt(client, `DELETE FROM ${t} WHERE request_id = $1`, [a.requestId])).code).toBe('42501');
    });
  });

  describe('the foreign keys', () => {
    it('(i) a request names a version of THIS Pariwar and THIS pool; an outcome / an outbox row needs a request of the SAME Pariwar; ONE outcome per request', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      const b = await seedWorld(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      expectConstraint(await ins(client, REQUESTS, requestRow(a, { submission_id: a.otherPoolSubmissionId })), '23503', 'memorial_takedown_requests_pool_submission_fk');
      expectConstraint(await ins(client, REQUESTS, requestRow(a, { submission_id: b.submissionId, pool_id: b.poolId })), '23503', 'memorial_takedown_requests_submission_fk');
      expectConstraint(await ins(client, OUTCOMES, outcomeRow(a, { request_id: b.requestId })), '23503', 'memorial_takedown_outcomes_request_fk');
      expectConstraint(await ins(client, EMAILS, emailRow(a, { request_id: randomUUID() })), '23503', 'memorial_takedown_approver_emails_request_fk');
      expectConstraint(await ins(client, EMAILS, emailRow(a, { recipient_user_id: randomUUID() })), '23503', 'memorial_takedown_approver_emails_recipient_user_fk');
      expect((await ins(client, OUTCOMES, outcomeRow(a))).code).toBeNull();
      expectConstraint(await ins(client, OUTCOMES, outcomeRow(a, { outcome: 'kept' })), '23505', 'memorial_takedown_outcomes_pkey');
    });
  });

  describe('the CHECK constraints (each violating row names the ONE constraint it trips)', () => {
    it('(j) requests: verified_by is `called_back`; MP14 (b) — first contact before the recording and at most 7 days before it; due = first contact + 7 days; a display name', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expectCheck(await ins(client, REQUESTS, requestRow(a, { verified_by: 'otp' })), 'memorial_takedown_requests_verified_by_check');
      const future = new Date(Date.now() + 3600 * 1000);
      expectCheck(
        await ins(client, REQUESTS, requestRow(a, { first_contact_at: future, due_at: new Date(future.getTime() + 168 * 3600 * 1000) })),
        'memorial_takedown_requests_first_contact_check',
      );
      const eightDays = new Date(Date.now() - 8 * 24 * 3600 * 1000);
      expectCheck(
        await ins(client, REQUESTS, requestRow(a, { first_contact_at: eightDays, due_at: new Date(eightDays.getTime() + 168 * 3600 * 1000) })),
        'memorial_takedown_requests_first_contact_check',
      );
      const row = requestRow(a);
      expectCheck(
        await ins(client, REQUESTS, { ...row, due_at: new Date((row['due_at'] as Date).getTime() + 1000) }),
        'memorial_takedown_requests_due_check',
      );
      expectCheck(await ins(client, REQUESTS, requestRow(a, { actor_display: '  ' })), 'memorial_takedown_requests_actor_display_check');
      // Legal: a first contact 6 days 23 hours ago, and one a moment ago.
      const edge = new Date(Date.now() - (7 * 24 - 1) * 3600 * 1000);
      edge.setMilliseconds(0);
      await insOk(client, REQUESTS, requestRow(a, { first_contact_at: edge, due_at: new Date(edge.getTime() + 168 * 3600 * 1000) }));
      await insOk(client, REQUESTS, requestRow(a));
    });

    it('(k) outcomes: the enum and a display name', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await ins(client, OUTCOMES, outcomeRow(a, { outcome: 'removed' }))).code).toBe('22P02');
      expectCheck(await ins(client, OUTCOMES, outcomeRow(a, { actor_display: '' })), 'memorial_takedown_outcomes_actor_display_check');
      for (const outcome of ['taken_down', 'kept', 'superseded']) await insOk(client, OUTCOMES, outcomeRow(a, { outcome }));
    });

    it('(l) the outbox: outcome set, `no_target` iff ⛔ recipient, attempt count, a claimed `attempting` row, the detail vocabulary + length, the parked pair; ONE row per (request, recipient) — NULLs ⛔ distinct', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expectCheck(await ins(client, EMAILS, emailRow(a, { outcome: 'delivered' })), 'memorial_takedown_approver_emails_outcome_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { outcome: 'no_target', claimed_at: null, claimed_by_job: null })), 'memorial_takedown_approver_emails_no_target_recipient_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { recipient_user_id: null, outcome: 'accepted' })), 'memorial_takedown_approver_emails_no_target_recipient_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { claimed_by_job: null })), 'memorial_takedown_approver_emails_attempting_claimed_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { detail: 'the provider said user@example.com bounced' })), 'memorial_takedown_approver_emails_detail_vocabulary_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { detail: 'no_pariwar_admin' })), 'memorial_takedown_approver_emails_detail_vocabulary_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { claimed_by_job: 'sweep:held' })), 'memorial_takedown_approver_emails_parked_check');
      for (const detail of ['no_approver', 'transient:timeout', 'held:AccountSuspendedException', 'rejected:400:MessageRejected', 'error:no_address', 'exhausted:attempting_three_days', 'exhausted:recheck_recipient_not_eligible']) {
        await insOk(client, EMAILS, emailRow(a, { detail }));
      }
      await insOk(client, EMAILS, emailRow(a, { recipient_user_id: null, outcome: 'no_target', claimed_at: null, claimed_by_job: null, detail: 'no_approver' }));
      expect((await ins(client, EMAILS, emailRow(a))).code).toBeNull();
      expectConstraint(await ins(client, EMAILS, emailRow(a, { outcome: 'accepted' })), '23505', 'memorial_takedown_approver_emails_request_recipient_uq');
      expect((await ins(client, EMAILS, emailRow(a, { recipient_user_id: null, outcome: 'no_target', claimed_at: null, claimed_by_job: null }))).code).toBeNull();
      expectConstraint(
        await ins(client, EMAILS, emailRow(a, { recipient_user_id: null, outcome: 'no_target', claimed_at: null, claimed_by_job: null })),
        '23505',
        'memorial_takedown_approver_emails_request_recipient_uq',
      );
    });

    it('(l2) the outbox, as the superuser: attempt count ≥ 1, an over-long `detail` / `first_detail`, an off-vocabulary `first_detail` — each violating row names the ONE constraint it trips', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      // ⚠ NO `enterAppScope`: `attempt_count` and `first_detail` are ⛔ in `twt_app`'s INSERT column set (probe (c)) — under the app role these
      // rows would stop at 42501, before their CHECK. The superuser path is 6.25's (its probes insert the same columns).
      expectCheck(await ins(client, EMAILS, emailRow(a, { attempt_count: 0 })), 'memorial_takedown_approver_emails_attempt_count_check');
      // PG checks CHECKs in NAME order: the length CHECKs precede the vocabulary ones ⇒ an over-long value reports length; a short
      // off-vocabulary one reports the vocabulary (the `detail` vocabulary probes are in (l)).
      expectCheck(await ins(client, EMAILS, emailRow(a, { detail: 'x'.repeat(201) })), 'memorial_takedown_approver_emails_detail_length_check');
      expectCheck(await ins(client, EMAILS, emailRow(a, { first_detail: 'x'.repeat(201) })), 'memorial_takedown_approver_emails_first_detail_length_check');
      expectCheck(
        await ins(client, EMAILS, emailRow(a, { first_detail: 'Message rejected: a@b.in' })),
        'memorial_takedown_approver_emails_first_detail_vocabulary_check',
      );
      expectCheck(await ins(client, EMAILS, emailRow(a, { first_detail: 'no_pariwar_admin' })), 'memorial_takedown_approver_emails_first_detail_vocabulary_check');
      // Legal rows of the same shape: a second attempt that kept its first detail, the longest names the grammar admits.
      await insOk(client, EMAILS, emailRow(a, { attempt_count: 2, first_detail: 'transient:timeout', detail: 'held:AccountSuspendedException' }));
      await insOk(client, EMAILS, emailRow(a, { detail: `rejected:599:${'A'.repeat(64)}`, first_detail: `held:${'b'.repeat(64)}` }));
    });
  });

  describe('the outbox trigger (0153 / 0154 mirrored)', () => {
    it('(m) a FINISHED row is frozen — even for the superuser; `may_have_sent` never goes back; `aging_since` moves only forward and only on a parked row', async () => {
      const { client } = getTx();
      const a = await seedWorld(PARIWAR_A);
      const finished = await client.query<{ notice_id: string }>(
        `INSERT INTO ${EMAILS} (pariwar_id, request_id, recipient_user_id, outcome, detail) VALUES ($1, $2, $3, 'accepted', NULL) RETURNING notice_id`,
        [PARIWAR_A, a.requestId, a.userId],
      );
      const frozen = await attempt(client, `UPDATE ${EMAILS} SET detail = 'no_approver' WHERE notice_id = $1`, [finished.rows[0]!.notice_id]);
      expect(frozen.code).toBe('23000');
      expect(frozen.message).toMatch(/a finished row \(accepted\) is never updated/);
      const other = await seedUser(getTx().tx);
      const live = await client.query<{ notice_id: string }>(
        `INSERT INTO ${EMAILS} (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job, may_have_sent) VALUES ($1, $2, $3, 'attempting', now(), 'j', true) RETURNING notice_id`,
        [PARIWAR_A, a.requestId, other],
      );
      const id = live.rows[0]!.notice_id;
      expect((await attempt(client, `UPDATE ${EMAILS} SET may_have_sent = false WHERE notice_id = $1`, [id])).message).toMatch(/may_have_sent is set TRUE, never back/);
      expect((await attempt(client, `UPDATE ${EMAILS} SET aging_since = aging_since + interval '1 hour' WHERE notice_id = $1`, [id])).message).toMatch(/aging_since moves only forward/);
      // Parked: forward is admitted, backward is not.
      expect((await attempt(client, `UPDATE ${EMAILS} SET claimed_by_job = 'sweep:held', parked_at = now() WHERE notice_id = $1`, [id])).code).toBeNull();
      expect((await attempt(client, `UPDATE ${EMAILS} SET aging_since = aging_since + interval '1 hour', claimed_by_job = 'j2', parked_at = NULL WHERE notice_id = $1`, [id])).code).toBeNull();
      expect((await attempt(client, `UPDATE ${EMAILS} SET claimed_by_job = 'sweep:held', parked_at = now() WHERE notice_id = $1`, [id])).code).toBeNull();
      expect((await attempt(client, `UPDATE ${EMAILS} SET aging_since = aging_since - interval '1 hour' WHERE notice_id = $1`, [id])).message).toMatch(/aging_since moves only forward/);
    });
  });
});

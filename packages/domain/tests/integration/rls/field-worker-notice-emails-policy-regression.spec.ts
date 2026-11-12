// Migration 0206 — `field_worker_notice_emails`, the email of a Story 13.1d notice (Story 13.1g, Task 1.3; decision `2026-11-12-463` AD2;
// ADR-0045). Mirrors memorial-takedown-policy-regression's outbox legs:
//   · structure — the columns (⛔ default on `notice_id`, ⛔ recipient column); ENABLE + FORCE; SELECT + INSERT + UPDATE policies for
//     `twt_app` (⛔ DELETE, ⛔ ALL); the privilege matrix — the INSERT column set NAMES `notice_id` (AD2: 0187's list, copied, would refuse
//     every claim 42501, and the superuser live tests would never see it), UPDATE 0187's set; ⛔ DELETE / TRUNCATE; every CHECK, the FK and
//     the attempting index BY NAME; the outcome CHECK = the TS tuple; the detail CHECKs carry the TS pattern.
//   · RLS — positive, the leak invariant, write isolation (42501), fail-closed with ⛔ scope.
//   · the FK — `(pariwar_id, notice_id)` to the notice: a notice of ANOTHER Pariwar, or none, is refused; ONE row per notice (the PK).
//   · every CHECK with a violating row naming the ONE constraint it trips, beside a legal row of the same shape.
//   · the trigger — a finished row frozen even for the superuser; `may_have_sent` never back; `aging_since` forward only, on a parked row.
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK (setupLiveDb); seeds as the superuser before scope.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN, FIELD_WORKER_NOTICE_EMAIL_OUTCOMES } from '../../../src/schema/field_worker_notice_emails.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { GUARD_OFF, GUARD_ON, RAW_INSERT_SQL, rawInsertParams } from '../field-worker/_fixtures.js';

type Client = pg.PoolClient;

const EMAILS = 'field_worker_notice_emails';

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

function ins(client: Client, row: Record<string, unknown>): Promise<Outcome> {
  const keys = Object.keys(row);
  return attempt(client, `INSERT INTO ${EMAILS} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map((k) => row[k]));
}

/** A probe that must SUCCEED, rolled back so the next probe starts from the same state. */
async function insOk(client: Client, row: Record<string, unknown>): Promise<void> {
  await client.query('SAVEPOINT ok');
  const out = await ins(client, row);
  expect(out.code, out.message).toBeNull();
  await client.query('ROLLBACK TO SAVEPOINT ok');
}

function expectConstraint(o: Outcome, code: string, constraint: string): void {
  expect(o.code, `${constraint}: ${o.message}`).toBe(code);
  expect(o.message, `expected "${constraint}" in: ${o.message}`).toContain(`"${constraint}"`);
}
const expectCheck = (o: Outcome, c: string) => expectConstraint(o, '23514', c);

/** As the superuser: a worker (raw, guarded) in `pariwarId` and TWO direct-move notices on it (no request); returns their ids. */
async function seedNotices(client: Client, pariwarId: string): Promise<{ noticeId: string; otherNoticeId: string }> {
  const workerId = randomUUID();
  await client.query(GUARD_ON);
  await client.query(RAW_INSERT_SQL, rawInsertParams(workerId, pariwarId));
  await client.query(GUARD_OFF);
  const notice = async () =>
    (
      await client.query<{ notice_id: string }>(
        `INSERT INTO field_worker_notices (pariwar_id, recipient_user_id, kind, field_worker_id, from_district, to_district)
         VALUES ($1, $2, 'moved_by_pariwar_admin', $3, 'Patna', 'Gaya') RETURNING notice_id`,
        [pariwarId, randomUUID(), workerId],
      )
    ).rows[0]!.notice_id;
  return { noticeId: await notice(), otherNoticeId: await notice() };
}

const emailRow = (pariwarId: string, noticeId: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  notice_id: noticeId,
  pariwar_id: pariwarId,
  outcome: 'attempting',
  claimed_at: new Date(),
  claimed_by_job: 'job-1',
  ...over,
});

describe.skipIf(!hasDatabase)('0206 — field_worker_notice_emails: RLS, the FK, CHECKs, grants, the trigger (Story 13.1g AD2)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('structure', () => {
    it('(a) the columns, types and NOT NULLs; ⛔ default on `notice_id` (it IS the notice id); ⛔ a recipient column', async () => {
      const { client } = getTx();
      const r = await client.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null }>(
        `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [EMAILS],
      );
      expect(r.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
        ['notice_id', 'uuid', 'NO'],
        ['pariwar_id', 'uuid', 'NO'],
        ['outcome', 'text', 'NO'],
        ['provider_message_id', 'text', 'YES'],
        ['detail', 'text', 'YES'],
        ['first_detail', 'text', 'YES'],
        ['attempt_count', 'int4', 'NO'],
        ['may_have_sent', 'bool', 'NO'],
        ['claimed_at', 'timestamptz', 'YES'],
        ['claimed_by_job', 'text', 'YES'],
        ['created_at', 'timestamptz', 'NO'],
        ['aging_since', 'timestamptz', 'NO'],
        ['parked_at', 'timestamptz', 'YES'],
        ['updated_at', 'timestamptz', 'NO'],
      ]);
      expect(r.rows.find((c) => c.column_name === 'notice_id')!.column_default).toBeNull();
    });

    it('(b) FORCE RLS; policies SELECT + INSERT + UPDATE for twt_app keyed on app.pariwar_id — ⛔ DELETE, ⛔ ALL', async () => {
      const { client } = getTx();
      const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relkind = 'r'`,
        [EMAILS],
      );
      expect(rel.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
      const { rows } = await client.query<{ policyname: string; cmd: string; permissive: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT policyname, cmd, permissive, array_to_string(roles, ',') AS roles, qual, with_check FROM pg_policies WHERE tablename = $1 ORDER BY cmd`,
        [EMAILS],
      );
      expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
      for (const r of rows) {
        expect(r.permissive).toBe('PERMISSIVE');
        expect(r.roles).toBe('twt_app');
        expect(r.policyname).toBe(`${EMAILS}_tenant_isolation_${r.cmd.toLowerCase()}`);
        expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toContain('app.pariwar_id');
      }
    });

    it('(c) privileges: SELECT; INSERT on EXACTLY six columns INCLUDING `notice_id`; UPDATE on 0187\'s eleven; ⛔ DELETE, ⛔ TRUNCATE; ⛔ the jobs role', async () => {
      const { client } = getTx();
      const priv = async (role: string, p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege($1, $2, $3) AS ok`, [role, EMAILS, p])).rows[0]!.ok;
      const cols = async (p: string) =>
        (
          await client.query<{ attname: string }>(
            `SELECT attname FROM pg_attribute WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped
               AND has_column_privilege('twt_app', attrelid, attnum, $2) ORDER BY attname`,
            [EMAILS, p],
          )
        ).rows.map((r) => r.attname);
      expect(await priv('twt_app', 'SELECT')).toBe(true);
      for (const p of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) expect(await priv('twt_app', p)).toBe(false);
      expect(await cols('INSERT')).toEqual(['claimed_at', 'claimed_by_job', 'detail', 'notice_id', 'outcome', 'pariwar_id']);
      expect(await cols('UPDATE')).toEqual([
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
      // AD13 — ⛔ a grant to the jobs role here (Row 26's posture; Row 24 (b)'s identity reads).
      for (const p of ['SELECT', 'INSERT', 'UPDATE']) expect(await priv('twt_service', p)).toBe(false);
    });

    it('(d) every CHECK, the FK and the index BY NAME; the outcome CHECK is the TS tuple; the detail CHECKs carry the TS pattern', async () => {
      const { client } = getTx();
      const con = await client.query<{ conname: string; contype: string; def: string }>(
        `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = $1::regclass ORDER BY conname`,
        [EMAILS],
      );
      expect(con.rows.map((c) => [c.conname, c.contype])).toEqual([
        ['field_worker_notice_emails_attempt_count_check', 'c'],
        ['field_worker_notice_emails_attempting_claimed_check', 'c'],
        ['field_worker_notice_emails_detail_length_check', 'c'],
        ['field_worker_notice_emails_detail_vocabulary_check', 'c'],
        ['field_worker_notice_emails_first_detail_length_check', 'c'],
        ['field_worker_notice_emails_first_detail_vocabulary_check', 'c'],
        ['field_worker_notice_emails_notice_fk', 'f'],
        ['field_worker_notice_emails_outcome_check', 'c'],
        ['field_worker_notice_emails_parked_check', 'c'],
        ['field_worker_notice_emails_pkey', 'p'],
        ['field_worker_notice_emails_skipped_detail_check', 'c'],
      ]);
      const def = (n: string): string => con.rows.find((c) => c.conname === n)!.def;
      for (const n of ['field_worker_notice_emails_detail_vocabulary_check', 'field_worker_notice_emails_first_detail_vocabulary_check']) {
        expect(def(n)).toContain(`'${FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN}'`);
      }
      expect([...def('field_worker_notice_emails_outcome_check').matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1])).toEqual([
        ...FIELD_WORKER_NOTICE_EMAIL_OUTCOMES,
      ]);
      expect(def('field_worker_notice_emails_notice_fk')).toBe(
        'FOREIGN KEY (pariwar_id, notice_id) REFERENCES field_worker_notices(pariwar_id, notice_id)',
      );
      expect(def('field_worker_notice_emails_pkey')).toBe('PRIMARY KEY (notice_id)');
      const idx = await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`, [
        EMAILS,
      ]);
      expect(idx.rows.map((r) => r.indexname)).toEqual(['field_worker_notice_emails_attempting_idx', 'field_worker_notice_emails_pkey']);
      expect(idx.rows[0]!.indexdef).toMatch(/\(aging_since, claimed_at\) WHERE \(outcome = 'attempting'::text\)/);
      const trg = await client.query<{ tgname: string }>(`SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal`, [EMAILS]);
      expect(trg.rows.map((r) => r.tgname)).toEqual(['field_worker_notice_emails_guard_update']);
    });
  });

  describe('RLS', () => {
    it('(e) positive + the leak invariant: A reads its own row and ZERO of B\'s, even with an explicit WHERE', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      const b = await seedNotices(client, PARIWAR_B);
      await client.query(`INSERT INTO ${EMAILS} (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job) VALUES ($1, $2, 'attempting', now(), 'j')`, [a.noticeId, PARIWAR_A]);
      await client.query(`INSERT INTO ${EMAILS} (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job) VALUES ($1, $2, 'attempting', now(), 'j')`, [b.noticeId, PARIWAR_B]);
      await enterAppScope(client, PARIWAR_A);
      const own = await client.query<{ notice_id: string }>(`SELECT notice_id FROM ${EMAILS}`);
      expect(own.rows.map((r) => r.notice_id)).toContain(a.noticeId);
      expect(own.rows.map((r) => r.notice_id)).not.toContain(b.noticeId);
      expect((await client.query(`SELECT 1 FROM ${EMAILS} WHERE pariwar_id = $1`, [PARIWAR_B])).rowCount).toBe(0);
      // An UPDATE cannot reach B's row either.
      expect((await attempt(client, `UPDATE ${EMAILS} SET detail = 'held:x' WHERE notice_id = $1`, [b.noticeId])).rowCount).toBe(0);
    });

    it('(f) write isolation: an A session cannot INSERT a B row (42501); the same shape for A inserts — as `twt_app`, so the column grant admits it', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      const b = await seedNotices(client, PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      expect((await ins(client, emailRow(PARIWAR_B, b.noticeId))).code).toBe('42501');
      await insOk(client, emailRow(PARIWAR_A, a.noticeId));
      await insOk(client, emailRow(PARIWAR_A, a.noticeId, { outcome: 'skipped', detail: 'skipped:not_eligible', claimed_at: null, claimed_by_job: null }));
      // A column outside the INSERT grant is refused (the superuser path is (l2)'s).
      expect((await ins(client, emailRow(PARIWAR_A, a.noticeId, { attempt_count: 2 }))).code).toBe('42501');
    });

    it('(g) fail-closed: with NO scope a SELECT returns 0 rows and an INSERT is refused; ⛔ DELETE in scope', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      await client.query(`INSERT INTO ${EMAILS} (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job) VALUES ($1, $2, 'attempting', now(), 'j')`, [a.noticeId, PARIWAR_A]);
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM ${EMAILS}`)).rowCount).toBe(0);
      expect((await ins(client, emailRow(PARIWAR_A, a.otherNoticeId))).code).toBe('42501');
      await client.query('RESET ROLE');
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, `DELETE FROM ${EMAILS} WHERE notice_id = $1`, [a.noticeId])).code).toBe('42501');
    });
  });

  describe('the foreign key and the primary key', () => {
    it('(h) a row needs a notice of the SAME Pariwar; ONE row per notice, ever', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      const b = await seedNotices(client, PARIWAR_B);
      expectConstraint(await ins(client, emailRow(PARIWAR_A, randomUUID())), '23503', 'field_worker_notice_emails_notice_fk');
      expectConstraint(await ins(client, emailRow(PARIWAR_A, b.noticeId)), '23503', 'field_worker_notice_emails_notice_fk');
      expect((await ins(client, emailRow(PARIWAR_A, a.noticeId))).code).toBeNull();
      expectConstraint(await ins(client, emailRow(PARIWAR_A, a.noticeId, { outcome: 'accepted' })), '23505', 'field_worker_notice_emails_pkey');
    });
  });

  describe('the CHECK constraints (each violating row names the ONE constraint it trips)', () => {
    it('(i) outcome set; `skipped` iff a `skipped:` detail; a claimed `attempting` row; the detail vocabulary; the parked pair', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const row = (over: Record<string, unknown>) => emailRow(PARIWAR_A, a.noticeId, over);
      expectCheck(await ins(client, row({ outcome: 'delivered' })), 'field_worker_notice_emails_outcome_check');
      expectCheck(await ins(client, row({ outcome: 'no_target', claimed_at: null, claimed_by_job: null })), 'field_worker_notice_emails_outcome_check');
      expectCheck(await ins(client, row({ outcome: 'skipped', detail: null, claimed_at: null, claimed_by_job: null })), 'field_worker_notice_emails_skipped_detail_check');
      expectCheck(await ins(client, row({ outcome: 'skipped', detail: 'error:no_address', claimed_at: null, claimed_by_job: null })), 'field_worker_notice_emails_skipped_detail_check');
      expectCheck(await ins(client, row({ outcome: 'error', detail: 'skipped:not_eligible' })), 'field_worker_notice_emails_skipped_detail_check');
      expectCheck(await ins(client, row({ claimed_by_job: null })), 'field_worker_notice_emails_attempting_claimed_check');
      expectCheck(await ins(client, row({ detail: 'the provider said user@example.com bounced' })), 'field_worker_notice_emails_detail_vocabulary_check');
      expectCheck(await ins(client, row({ detail: 'no_approver' })), 'field_worker_notice_emails_detail_vocabulary_check');
      expectCheck(await ins(client, row({ detail: 'exhausted:recheck_recipient_not_eligible' })), 'field_worker_notice_emails_detail_vocabulary_check');
      expectCheck(await ins(client, row({ claimed_by_job: 'sweep:held' })), 'field_worker_notice_emails_parked_check');
      for (const detail of [
        'transient:timeout',
        'held:AccountSuspendedException',
        'rejected:400:MessageRejected',
        'error:no_address',
        'error:invalid_address',
        'exhausted:attempting_three_days',
        'exhausted:recheck_not_eligible',
      ]) {
        await insOk(client, row({ detail }));
      }
      await insOk(client, row({ outcome: 'skipped', detail: 'skipped:not_eligible', claimed_at: null, claimed_by_job: null }));
      await insOk(client, row({ outcome: 'error', detail: 'exhausted:recheck_not_eligible' }));
    });

    it('(i2) as the superuser: attempt count ≥ 1, an over-long `detail` / `first_detail`, an off-vocabulary `first_detail`', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      // ⚠ NO `enterAppScope`: `attempt_count` and `first_detail` are ⛔ in `twt_app`'s INSERT column set (probe (c)).
      const row = (over: Record<string, unknown>) => emailRow(PARIWAR_A, a.noticeId, over);
      expectCheck(await ins(client, row({ attempt_count: 0 })), 'field_worker_notice_emails_attempt_count_check');
      expectCheck(await ins(client, row({ detail: 'x'.repeat(201) })), 'field_worker_notice_emails_detail_length_check');
      expectCheck(await ins(client, row({ first_detail: 'x'.repeat(201) })), 'field_worker_notice_emails_first_detail_length_check');
      expectCheck(await ins(client, row({ first_detail: 'Message rejected: a@b.in' })), 'field_worker_notice_emails_first_detail_vocabulary_check');
      await insOk(client, row({ attempt_count: 2, first_detail: 'transient:timeout', detail: 'held:AccountSuspendedException' }));
      await insOk(client, row({ detail: `rejected:599:${'A'.repeat(64)}`, first_detail: `held:${'b'.repeat(64)}` }));
    });
  });

  describe('the trigger (0187 mirrored)', () => {
    it('(j) a FINISHED row is frozen — even for the superuser; `may_have_sent` never goes back; `aging_since` moves only forward and only on a parked row', async () => {
      const { client } = getTx();
      const a = await seedNotices(client, PARIWAR_A);
      await client.query(`INSERT INTO ${EMAILS} (notice_id, pariwar_id, outcome) VALUES ($1, $2, 'accepted')`, [a.noticeId, PARIWAR_A]);
      const frozen = await attempt(client, `UPDATE ${EMAILS} SET provider_message_id = 'x' WHERE notice_id = $1`, [a.noticeId]);
      expect(frozen.code).toBe('23000');
      expect(frozen.message).toMatch(/a finished row \(accepted\) is never updated/);
      const id = a.otherNoticeId;
      await client.query(
        `INSERT INTO ${EMAILS} (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job, may_have_sent) VALUES ($1, $2, 'attempting', now(), 'j', true)`,
        [id, PARIWAR_A],
      );
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

// claim_certificate_reminder_runs, claim_certificate_reminders, claim_certificate_reminder_letters — migrations
// 0137–0139 + RLS policy regression (Story 6.19d, Task 1; AC1, AC4, AC8). Mirrors claim-correction-closure-policy-
// regression: positive / negative RLS, the connection-level fail-closed probe, the FORCE-RLS catalog guard, ⛔ no DELETE
// for `twt_app`, per-command policies, cross-tenant WITH CHECK, every FK (23503), the column-narrowed UPDATE grants —
// PLUS these migrations' own integrity: ONE open run per claim, ONE run per rejected upload (Trap 4), ONE `missing` run
// per claim, the anchor pair, ⛔ `replacement_reminder` (Trap 7), the subject-key pin, the staff day key WITH `purpose`,
// ⭐ ONE letter per person per CLAIM across runs (`-275` Q1 A), and the DB ↔ TS CHECK lockstep. Each constraint asserted
// by its NAME, each with a POSITIVE counterpart. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_REMINDER_OUTCOMES,
  CERTIFICATE_REMINDER_PURPOSES,
  CERTIFICATE_RUN_CAUSES,
  CERTIFICATE_RUN_END_REASONS,
} from '../../../src/schema/claim_certificate_reminder.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClaim,
  seedDeathCertificate,
  seedRejectedDeathCertificate,
} from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** As the superuser: a claim being checked, its rejected certificate, an open `rejected` run, a reminder and a letter. */
async function seedCertificateWait(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'verifier_review' });
  const reviewId = await seedRejectedDeathCertificate(client, { pariwarId, claimCaseId });
  const { rows } = await client.query<{ upload_id: string }>(
    `SELECT upload_id FROM claim_death_certificate_reviews WHERE review_id = $1`,
    [reviewId],
  );
  const uploadId = rows[0]!.upload_id;
  const runId = randomUUID();
  await client.query(
    `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, anchor_upload_id, anchor_review_id, day0)
     VALUES ($1, $2, $3, 'rejected', $4, $5, '2026-10-01')`,
    [runId, claimCaseId, pariwarId, uploadId, reviewId],
  );
  const reminderId = randomUUID();
  await client.query(
    `INSERT INTO claim_certificate_reminders (reminder_id, run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
     VALUES ($1, $2, $3, $4, 1, '2026-10-02', 'nominee:v1', 'family_sms', 'accepted')`,
    [reminderId, runId, claimCaseId, pariwarId],
  );
  const letterId = randomUUID();
  await client.query(
    `INSERT INTO claim_certificate_reminder_letters (letter_id, run_id, claim_case_id, pariwar_id, person_key, posted_on,
       tracking_number_ciphertext, recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, 'nominee:v1', '2026-10-10', 'enc:v1:t', 'da', 'District Admin')`,
    [letterId, runId, claimCaseId, pariwarId],
  );
  return { claimCaseId, reviewId, uploadId, runId, reminderId, letterId };
}

type Seeded = Awaited<ReturnType<typeof seedCertificateWait>>;

const TABLES = ['claim_certificate_reminder_runs', 'claim_certificate_reminders', 'claim_certificate_reminder_letters'] as const;
type Table = (typeof TABLES)[number];

/** A VALID row of each table for `s` (raw column names) — every one INSERTable on top of the seed. */
const validRow: Record<Table, (s: Seeded, pariwarId?: string) => Record<string, unknown>> = {
  // An ENDED `missing` run (the seeded `rejected` run is the claim's one open run).
  claim_certificate_reminder_runs: (s, pariwarId = PARIWAR_A) => ({
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    cause: 'missing',
    day0: '2026-09-01',
    ended_at: '2026-10-01T04:30:00.000Z',
    end_reason: 'superseded',
  }),
  claim_certificate_reminders: (s, pariwarId = PARIWAR_A) => ({
    run_id: s.runId,
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    slot_day: 2,
    sent_on: '2026-10-03',
    recipient_key: 'nominee:v1',
    purpose: 'family_sms',
    outcome: 'accepted',
  }),
  claim_certificate_reminder_letters: (s, pariwarId = PARIWAR_A) => ({
    run_id: s.runId,
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    person_key: 'claimant',
    posted_on: '2026-10-11',
    tracking_number_ciphertext: 'enc:v1:t',
    recorded_by_actor: 'da',
    recorded_by_display: 'District Admin',
  }),
};

const ID_COL: Record<Table, string> = {
  claim_certificate_reminder_runs: 'run_id',
  claim_certificate_reminders: 'reminder_id',
  claim_certificate_reminder_letters: 'letter_id',
};
const idOf = (table: Table, s: Seeded): string =>
  ({ claim_certificate_reminder_runs: s.runId, claim_certificate_reminders: s.reminderId, claim_certificate_reminder_letters: s.letterId })[table];
/** A no-op UPDATE through a GRANTED column. */
const TOUCH: Record<Table, string> = {
  claim_certificate_reminder_runs: 'ended_at = ended_at',
  claim_certificate_reminders: 'updated_at = now()',
  claim_certificate_reminder_letters: 'updated_at = now()',
};

function insertRow(client: Client, table: Table, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

/** A positive write inside its own savepoint (rolled back) — proves the row is accepted without leaving it. */
async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const UNIQUE = (constraint: string) => ({ code: '23505', constraint });
const FK = (constraint: string) => ({ code: '23503', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

/** The quoted values of a CHECK's `IN (…)` list, as the catalog prints it. */
async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [conname],
  );
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
}

describe.skipIf(!hasDatabase)('the certificate reminder — migrations 0137–0139 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  for (const table of TABLES) {
    it(`positive + negative: ${table} under scope A shows only A rows, and scope B only B rows`, async () => {
      const { client } = getTx();
      await seedCertificateWait(client, PARIWAR_A);
      await seedCertificateWait(client, PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${table}`);
      expect(a.rows.length).toBeGreaterThan(0);
      expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
      await enterAppScope(client, PARIWAR_B);
      const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${table}`);
      expect(b.rows.length).toBeGreaterThan(0);
      expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
    });

    it(`connection-level fail-closed: the app role with no scope sees ⛔ no ${table} row`, async () => {
      const { client } = getTx();
      await seedCertificateWait(client, PARIWAR_A);
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM ${table}`)).rows).toHaveLength(0);
    });

    it(`FORCE RLS: ${table} has rowsecurity AND forcerowsecurity`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
    });

    it(`⛔ no DELETE for twt_app on ${table}`, async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => client.query(`DELETE FROM ${table} WHERE ${ID_COL[table]} = $1`, [idOf(table, s)]), DENIED);
    });

    it(`the policies are per-command — ⛔ no FOR ALL and ⛔ no DELETE policy on ${table}`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ cmd: string }>(
        `SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`,
        [table],
      );
      expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    });

    it(`cross-tenant INSERT: under scope A, a ${table} row carrying Pariwar B is refused by WITH CHECK (42501)`, async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => insertRow(client, table, validRow[table](s, PARIWAR_B)), {
        code: '42501',
        message: expect.stringMatching(/row-level security/),
      });
      expect((await insertRow(client, table, validRow[table](s, PARIWAR_A))).rowCount).toBe(1);
    });

    it(`cross-tenant UPDATE on ${table}: B's row is INVISIBLE under scope A, and ⛔ no row can be moved to B`, async () => {
      const { client } = getTx();
      const a = await seedCertificateWait(client, PARIWAR_A);
      const b = await seedCertificateWait(client, PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      expect((await client.query(`UPDATE ${table} SET ${TOUCH[table]} WHERE ${ID_COL[table]} = $1`, [idOf(table, b)])).rowCount).toBe(0);
      expect((await client.query(`UPDATE ${table} SET ${TOUCH[table]} WHERE ${ID_COL[table]} = $1`, [idOf(table, a)])).rowCount).toBe(1);
      await expectPgError(client, () => client.query(`UPDATE ${table} SET pariwar_id = $2 WHERE ${ID_COL[table]} = $1`, [idOf(table, a), PARIWAR_B]), DENIED);
      const { rows } = await client.query<{ qual: string | null; with_check: string | null }>(
        `SELECT qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 AND cmd = 'UPDATE'`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.with_check).toBe(rows[0]!.qual);
    });
  }

  it('the only deletion is the ON DELETE cascade from claims — every new table follows the claim', async () => {
    const { client } = getTx();
    const s = await seedCertificateWait(client, PARIWAR_A);
    const counts = async () =>
      (
        await client.query(
          `SELECT (SELECT count(*) FROM claim_certificate_reminder_runs WHERE claim_case_id = $1)::int AS r,
                  (SELECT count(*) FROM claim_certificate_reminders WHERE claim_case_id = $1)::int AS m,
                  (SELECT count(*) FROM claim_certificate_reminder_letters WHERE claim_case_id = $1)::int AS l`,
          [s.claimCaseId],
        )
      ).rows[0];
    expect(await counts()).toEqual({ r: 1, m: 1, l: 1 });
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(await counts()).toEqual({ r: 0, m: 0, l: 0 });
  });

  describe('FKs (23503)', () => {
    const cases: readonly { readonly table: Table; readonly column: string; readonly constraint: string; readonly row?: (s: Seeded, client: Client) => Record<string, unknown> | Promise<Record<string, unknown>> }[] = [
      { table: 'claim_certificate_reminder_runs', column: 'claim_case_id', constraint: 'claim_certificate_reminder_runs_claim_case_id_fk' },
      {
        table: 'claim_certificate_reminder_runs',
        column: 'anchor_upload_id',
        constraint: 'claim_certificate_reminder_runs_anchor_upload_id_fk',
        row: (s) => ({ ...validRow.claim_certificate_reminder_runs(s), cause: 'rejected', anchor_upload_id: s.uploadId, anchor_review_id: s.reviewId }),
      },
      {
        table: 'claim_certificate_reminder_runs',
        column: 'anchor_review_id',
        constraint: 'claim_certificate_reminder_runs_anchor_review_id_fk',
        // A DIFFERENT upload, so the one-run-per-upload UNIQUE does ⛔ not fire first.
        row: async (s, client) => ({
          ...validRow.claim_certificate_reminder_runs(s),
          cause: 'rejected',
          anchor_upload_id: (await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: s.claimCaseId })).uploadId,
          anchor_review_id: s.reviewId,
        }),
      },
      { table: 'claim_certificate_reminders', column: 'run_id', constraint: 'claim_certificate_reminders_run_id_fk' },
      { table: 'claim_certificate_reminders', column: 'claim_case_id', constraint: 'claim_certificate_reminders_claim_case_id_fk' },
      { table: 'claim_certificate_reminders', column: 'recipient_version_id', constraint: 'claim_certificate_reminders_recipient_version_id_fk' },
      { table: 'claim_certificate_reminder_letters', column: 'run_id', constraint: 'claim_certificate_reminder_letters_run_id_fk' },
      { table: 'claim_certificate_reminder_letters', column: 'claim_case_id', constraint: 'claim_certificate_reminder_letters_claim_case_id_fk' },
    ];
    for (const c of cases) {
      it(`${c.table}.${c.column} is a foreign key`, async () => {
        const { client } = getTx();
        const s = await seedCertificateWait(client, PARIWAR_A);
        const row = c.row ? await c.row(s, client) : validRow[c.table](s);
        await expectPgError(client, () => insertRow(client, c.table, { ...row, [c.column]: randomUUID() }), FK(c.constraint));
      });
    }
  });

  describe('column-narrowed UPDATE grants — identity is ⛔ never rewritten', () => {
    it('a run: only `ended_at` / `end_reason` (⛔ never re-dated — `-275` Q2)', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`day0 = '2026-01-01'`, `cause = 'missing'`, `anchor_upload_id = NULL`, `claim_case_id = claim_case_id`]) {
        await expectPgError(client, () => client.query(`UPDATE claim_certificate_reminder_runs SET ${set} WHERE run_id = $1`, [s.runId]), DENIED);
      }
      await expectAccepted(client, () =>
        client.query(`UPDATE claim_certificate_reminder_runs SET ended_at = now(), end_reason = 'certificate_received' WHERE run_id = $1`, [s.runId]),
      );
    });

    it('a reminder: the compare-and-set columns only', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`slot_day = 5`, `sent_on = '2026-01-01'`, `recipient_key = 'claimant'`, `purpose = 'letter_chase'`, `late = true`, `delivered_at = now()`]) {
        await expectPgError(client, () => client.query(`UPDATE claim_certificate_reminders SET ${set} WHERE reminder_id = $1`, [s.reminderId]), DENIED);
      }
      await expectAccepted(client, () =>
        client.query(`UPDATE claim_certificate_reminders SET outcome = 'error', detail = 'x', attempt_count = 2 WHERE reminder_id = $1`, [s.reminderId]),
      );
    });

    it('a letter: the delivery columns only', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`posted_on = '2026-01-01'`, `person_key = 'claimant'`, `tracking_number_ciphertext = 'x'`, `run_id = run_id`]) {
        await expectPgError(client, () => client.query(`UPDATE claim_certificate_reminder_letters SET ${set} WHERE letter_id = $1`, [s.letterId]), DENIED);
      }
    });
  });

  describe('0137 — the runs', () => {
    it('⭐ LOCKSTEP — the cause and end-reason CHECKs name EXACTLY the TS vocabularies', async () => {
      const { client } = getTx();
      expect(await checkValues(client, 'claim_certificate_reminder_runs_cause_check')).toEqual([...CERTIFICATE_RUN_CAUSES].sort());
      expect(await checkValues(client, 'claim_certificate_reminder_runs_end_reason_check')).toEqual([...CERTIFICATE_RUN_END_REASONS].sort());
    });

    it('the cause, end-reason and ended-pair CHECKs', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminder_runs(s);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, cause: 'late' }), CHECK('claim_certificate_reminder_runs_cause_check'));
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, end_reason: 'day_90' }), CHECK('claim_certificate_reminder_runs_end_reason_check'));
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, end_reason: null }), CHECK('claim_certificate_reminder_runs_ended_pair_check'));
      await expectAccepted(client, () => insertRow(client, 'claim_certificate_reminder_runs', row));
    });

    it('the anchor pair: a `rejected` run carries BOTH anchors, a `missing` run NEITHER', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminder_runs(s);
      const anchor = CHECK('claim_certificate_reminder_runs_anchor_check');
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, cause: 'rejected' }), anchor);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, cause: 'rejected', anchor_upload_id: s.uploadId }), anchor);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', { ...row, anchor_upload_id: s.uploadId, anchor_review_id: s.reviewId }), anchor);
    });

    it('⭐ ONE open run per claim — a second open run is refused; an ended one is accepted', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const open = { ...validRow.claim_certificate_reminder_runs(s), ended_at: null, end_reason: null };
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', open), UNIQUE('claim_certificate_reminder_runs_one_open_per_claim_uq'));
      await client.query(`UPDATE claim_certificate_reminder_runs SET ended_at = now(), end_reason = 'superseded' WHERE run_id = $1`, [s.runId]);
      await expectAccepted(client, () => insertRow(client, 'claim_certificate_reminder_runs', open));
    });

    it('⭐ Trap 4 — ONE run per rejected upload (a re-review never restarts); a DIFFERENT upload is a new run (`-260` G5)', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const ended = { claim_case_id: s.claimCaseId, pariwar_id: PARIWAR_A, cause: 'rejected', day0: '2026-10-05', ended_at: '2026-10-06T04:30:00Z', end_reason: 'superseded' };
      await expectPgError(
        client,
        () => insertRow(client, 'claim_certificate_reminder_runs', { ...ended, anchor_upload_id: s.uploadId, anchor_review_id: s.reviewId }),
        UNIQUE('claim_certificate_reminder_runs_rejected_upload_uq'),
      );
      const second = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: s.claimCaseId });
      await expectAccepted(client, () =>
        insertRow(client, 'claim_certificate_reminder_runs', { ...ended, anchor_upload_id: second.uploadId, anchor_review_id: s.reviewId }),
      );
    });

    it('⭐ at most ONE `missing` run per claim, ever — even when both are ended', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminder_runs(s);
      await insertRow(client, 'claim_certificate_reminder_runs', row);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_runs', row), UNIQUE('claim_certificate_reminder_runs_missing_uq'));
    });
  });

  describe('0138 — the reminder record', () => {
    it('⭐ LOCKSTEP — the purpose and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
      const { client } = getTx();
      expect(await checkValues(client, 'claim_certificate_reminders_purpose_check')).toEqual([...CERTIFICATE_REMINDER_PURPOSES].sort());
      expect(await checkValues(client, 'claim_certificate_reminders_outcome_check')).toEqual([...CERTIFICATE_REMINDER_OUTCOMES].sort());
    });

    it('⛔ Trap 7 — `replacement_reminder` is 6.19b\'s reserved value, ⛔ never a purpose here; ⛔ `delivered` is ⛔ not an outcome', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminders(s);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminders', { ...row, purpose: 'replacement_reminder' }), CHECK('claim_certificate_reminders_purpose_check'));
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminders', { ...row, outcome: 'delivered' }), CHECK('claim_certificate_reminders_outcome_check'));
    });

    it('slot day ≥ 0, attempt count ≥ 1, a non-blank recipient, a claimed `attempting` row, and a delivery time only on an accept', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminders(s);
      const ins = (over: Record<string, unknown>) => () => insertRow(client, 'claim_certificate_reminders', { ...row, ...over });
      await expectPgError(client, ins({ slot_day: -1 }), CHECK('claim_certificate_reminders_slot_day_check'));
      await expectPgError(client, ins({ attempt_count: 0 }), CHECK('claim_certificate_reminders_attempt_count_check'));
      await expectPgError(client, ins({ recipient_key: '  ' }), CHECK('claim_certificate_reminders_recipient_key_check'));
      await expectPgError(client, ins({ outcome: 'attempting' }), CHECK('claim_certificate_reminders_attempting_claimed_check'));
      await expectPgError(client, ins({ outcome: 'error', delivered_at: '2026-10-03T05:00:00Z' }), CHECK('claim_certificate_reminders_delivered_only_accepted_check'));
      await expectAccepted(client, ins({ outcome: 'attempting', claimed_at: '2026-10-03T04:30:00Z', recipient_number_hash: 'h' }));
    });

    it('the subject key: a family row names ⛔ no subject, a staff row ALWAYS names the chased person', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminders(s);
      const subject = CHECK('claim_certificate_reminders_subject_key_check');
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminders', { ...row, subject_key: 'nominee:v1' }), subject);
      const staff = { ...row, recipient_key: 'staff:u1', purpose: 'letter_chase', outcome: 'recorded' };
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminders', staff), subject);
      await expectAccepted(client, () => insertRow(client, 'claim_certificate_reminders', { ...staff, subject_key: 'nominee:v1' }));
    });

    it('⭐ THE dedup key — ONE row per (run, slot, recipient, purpose, subject)', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await expectPgError(
        client,
        () => insertRow(client, 'claim_certificate_reminders', { ...validRow.claim_certificate_reminders(s), slot_day: 1 }),
        UNIQUE('claim_certificate_reminders_slot_uq'),
      );
    });

    it('⭐ CR10 — ONE staff row per (claim, recipient, person, PURPOSE, day) across runs; a chase AND an escalation the same morning both land (0130)', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const chase = { ...validRow.claim_certificate_reminders(s), slot_day: 7, sent_on: '2026-10-08', recipient_key: 'staff:u1', purpose: 'letter_chase', subject_key: 'nominee:v1', outcome: 'recorded' };
      await insertRow(client, 'claim_certificate_reminders', chase);
      await expectAccepted(client, () => insertRow(client, 'claim_certificate_reminders', { ...chase, purpose: 'letter_escalation' }));
      // Another run, the same staff member + person + purpose + day ⇒ refused by the day key.
      const { rows } = await client.query<{ run_id: string }>(
        `INSERT INTO claim_certificate_reminder_runs (claim_case_id, pariwar_id, cause, day0, ended_at, end_reason)
         VALUES ($1, $2, 'missing', '2026-09-01', now(), 'superseded') RETURNING run_id`,
        [s.claimCaseId, PARIWAR_A],
      );
      await expectPgError(
        client,
        () => insertRow(client, 'claim_certificate_reminders', { ...chase, run_id: rows[0]!.run_id }),
        UNIQUE('claim_certificate_reminders_staff_day_uq'),
      );
    });
  });

  describe('0139 — the letters', () => {
    it('⭐ `-275` Q1 A — ONE letter per person per CLAIM, even recorded in a LATER run', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      await client.query(`UPDATE claim_certificate_reminder_runs SET ended_at = now(), end_reason = 'superseded' WHERE run_id = $1`, [s.runId]);
      const second = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: s.claimCaseId });
      const { rows } = await client.query<{ run_id: string }>(
        `INSERT INTO claim_certificate_reminder_runs (claim_case_id, pariwar_id, cause, anchor_upload_id, anchor_review_id, day0)
         VALUES ($1, $2, 'rejected', $3, $4, '2026-10-20') RETURNING run_id`,
        [s.claimCaseId, PARIWAR_A, second.uploadId, s.reviewId],
      );
      const row = { ...validRow.claim_certificate_reminder_letters(s), run_id: rows[0]!.run_id };
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_letters', { ...row, person_key: 'nominee:v1' }), UNIQUE('claim_certificate_reminder_letters_person_uq'));
      await expectAccepted(client, () => insertRow(client, 'claim_certificate_reminder_letters', row));
    });

    it('a non-blank person and recorder; a delivery all-or-nothing and ⛔ never before posting', async () => {
      const { client } = getTx();
      const s = await seedCertificateWait(client, PARIWAR_A);
      const row = validRow.claim_certificate_reminder_letters(s);
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_letters', { ...row, person_key: ' ' }), CHECK('claim_certificate_reminder_letters_person_key_check'));
      await expectPgError(client, () => insertRow(client, 'claim_certificate_reminder_letters', { ...row, recorded_by_display: '' }), CHECK('claim_certificate_reminder_letters_recorded_by_check'));
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_certificate_reminder_letters SET delivered_on = '2026-10-15' WHERE letter_id = $1`, [s.letterId]),
        CHECK('claim_certificate_reminder_letters_delivery_complete_check'),
      );
      const deliver = (on: string) =>
        client.query(
          `UPDATE claim_certificate_reminder_letters SET delivered_on = $2, screenshot_storage_key = 'k', screenshot_content_type = 'image/png',
             screenshot_size_bytes = 1, delivery_recorded_by_actor = 'da', delivery_recorded_by_display = 'D', delivery_recorded_at = now()
           WHERE letter_id = $1`,
          [s.letterId, on],
        );
      await expectPgError(client, () => deliver('2026-10-09'), CHECK('claim_certificate_reminder_letters_delivered_after_posted_check'));
      await expectAccepted(client, () => deliver('2026-10-15'));
    });
  });
});

// claim_correction_{marks,runs,reminders,letters} — migrations 0126–0130 + RLS policy regression (Story 6.19b,
// Task 1). Mirrors claim-contact-policy-regression: positive / negative RLS, the connection-level fail-closed probe,
// the FORCE-RLS catalog guard, ⛔ no DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, every FK
// (23503) — PLUS these migrations' own integrity: the marks are APPEND-ONLY (⛔ no UPDATE), a run's / a reminder's /
// a letter's UPDATE is narrowed by COLUMN grant, ONE open run per claim, ONE return mark per return, the reminder's
// five-part UNIQUE with `subject_key` NOT NULL (⛔ a nullable column would void it), the D34 day keys (the letter-chase
// key carries `purpose` since 0130), and every CHECK — each asserted by its CONSTRAINT NAME (⛔ a bare SQLSTATE proves
// only that SOME constraint fired) and each with a POSITIVE counterpart (⛔ a refusal alone may be vacuous).
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim, seedNomineeDeclaration } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** As the superuser: a claim, a return row, a mark, a run, a reminder and a letter in `pariwarId`. */
async function seedChase(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const decisionId = randomUUID();
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
     VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin')`,
    [decisionId, claimCaseId, pariwarId],
  );
  const markId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_marks (mark_id, claim_case_id, pariwar_id, return_decision_id, must_act, is_return_mark, set_by_actor, set_by_actor_display, set_by_role)
     VALUES ($1, $2, $3, $4, 'family', true, 'trustee', 'Pariwar Admin', 'pariwar_admin')`,
    [markId, claimCaseId, pariwarId, decisionId],
  );
  const runId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0)
     VALUES ($1, $2, $3, $4, 'family', $5, '2026-11-01')`,
    [runId, claimCaseId, pariwarId, decisionId, markId],
  );
  const reminderId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_reminders (reminder_id, run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
     VALUES ($1, $2, $3, $4, 1, '2026-11-02', 'nominee:v1', 'family_sms', 'accepted')`,
    [reminderId, runId, claimCaseId, pariwarId],
  );
  const letterId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_letters (letter_id, run_id, claim_case_id, pariwar_id, person_key, sequence, posted_on, tracking_number_ciphertext, recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, 'nominee:v1', 1, '2026-11-03', 'enc:v1:t', 'da', 'District Admin')`,
    [letterId, runId, claimCaseId, pariwarId],
  );
  return { claimCaseId, decisionId, markId, runId, reminderId, letterId };
}

type Seeded = Awaited<ReturnType<typeof seedChase>>;

const TABLES = ['claim_correction_marks', 'claim_correction_runs', 'claim_correction_reminders', 'claim_correction_letters'] as const;
type Table = (typeof TABLES)[number];

/** A VALID row of each table for `s` (raw column names), so one override reaches Postgres un-typed. ⚠ The run is
 *  inserted ENDED so the one-open-run UNIQUE stays out of the way of every other assertion. */
const validRow: Record<Table, (s: Seeded, pariwarId?: string) => Record<string, unknown>> = {
  claim_correction_marks: (s, pariwarId = PARIWAR_A) => ({
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    return_decision_id: s.decisionId,
    must_act: 'staff',
    is_return_mark: false,
    set_by_actor: 'da',
    set_by_actor_display: 'District Admin',
    set_by_role: 'district_admin',
    note_ciphertext: 'enc:v1:n',
  }),
  claim_correction_runs: (s, pariwarId = PARIWAR_A) => ({
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    return_decision_id: s.decisionId,
    kind: 'staff',
    // ⛔ No FK on `anchor_id` (a direction is 6.19c's table) — a random id is accepted by design.
    anchor_id: randomUUID(),
    day0: '2026-11-02',
    ended_at: '2026-11-03T00:00:00.000Z',
    end_reason: 'superseded',
  }),
  claim_correction_reminders: (s, pariwarId = PARIWAR_A) => ({
    run_id: s.runId,
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    slot_day: 2,
    sent_on: '2026-11-03',
    recipient_key: 'nominee:v1',
    purpose: 'family_sms',
    outcome: 'accepted',
  }),
  claim_correction_letters: (s, pariwarId = PARIWAR_A) => ({
    run_id: s.runId,
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    person_key: 'nominee:v2',
    sequence: 1,
    posted_on: '2026-11-03',
    tracking_number_ciphertext: 'enc:v1:t',
    recorded_by_actor: 'da',
    recorded_by_display: 'District Admin',
  }),
};

/** Raw INSERT of one row (column names as given). */
function insertRow(client: Client, table: Table, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

/** A COMPLETE delivery block (D6 — all-or-nothing). */
const DELIVERY = {
  delivered_on: '2026-11-10',
  screenshot_storage_key: 'k',
  screenshot_content_type: 'image/png',
  screenshot_size_bytes: 1,
  delivery_recorded_by_actor: 'da',
  delivery_recorded_by_display: 'District Admin',
  delivery_recorded_at: '2026-11-10T06:00:00.000Z',
};

/**
 * Expect a Postgres error WITHOUT aborting the test's transaction (a savepoint around the attempt). `expected` is the
 * SQLSTATE alone, or the SQLSTATE plus the `constraint` / `column` the error must name.
 */
async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly column?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const UNIQUE = (constraint: string) => ({ code: '23505', constraint });
const FK = (constraint: string) => ({ code: '23503', constraint });

describe.skipIf(!hasDatabase)('the correction chase — migrations 0126–0130 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  for (const table of TABLES) {
    it(`positive + negative: ${table} under scope A shows only A rows, and scope B only B rows`, async () => {
      const { client } = getTx();
      await seedChase(client, PARIWAR_A);
      await seedChase(client, PARIWAR_B);
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
      await seedChase(client, PARIWAR_A);
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
      const seeded = await seedChase(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => client.query(`DELETE FROM ${table} WHERE claim_case_id = $1`, [seeded.claimCaseId]), {
        code: '42501',
        message: expect.stringMatching(/permission denied/),
      });
    });

    it(`the policies are per-command — ⛔ no FOR ALL and ⛔ no DELETE policy on ${table}`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ cmd: string }>(
        `SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`,
        [table],
      );
      expect(rows.length).toBeGreaterThan(0); // ⛔ an empty list would pass every `not.toContain` below
      const cmds = rows.map((r) => r.cmd).sort();
      expect(cmds).not.toContain('ALL');
      expect(cmds).not.toContain('DELETE');
      expect(cmds).toEqual(table === 'claim_correction_marks' ? ['INSERT', 'SELECT'] : ['INSERT', 'SELECT', 'UPDATE']);
    });

    it(`cross-tenant INSERT: under scope A, a ${table} row carrying Pariwar B is refused by WITH CHECK (42501)`, async () => {
      const { client } = getTx();
      const s = await seedChase(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => insertRow(client, table, validRow[table](s, PARIWAR_B)), {
        code: '42501',
        message: expect.stringMatching(/row-level security/),
      });
      // ⭐ The positive counterpart — the SAME row carrying the scope's own Pariwar is accepted (⛔ the refusal is
      // about the tenant, not the row).
      expect((await insertRow(client, table, validRow[table](s, PARIWAR_A))).rowCount).toBe(1);
    });

    if (table !== 'claim_correction_marks') {
      it(`cross-tenant UPDATE on ${table}: B's row is INVISIBLE under scope A (0 rows), and ⛔ no row can be moved to B`, async () => {
        const { client } = getTx();
        const a = await seedChase(client, PARIWAR_A);
        const b = await seedChase(client, PARIWAR_B);
        const idCol = { claim_correction_runs: 'run_id', claim_correction_reminders: 'reminder_id', claim_correction_letters: 'letter_id' }[table];
        const id = (s: Seeded) => ({ claim_correction_runs: s.runId, claim_correction_reminders: s.reminderId, claim_correction_letters: s.letterId })[table];
        const touch = { claim_correction_runs: 'end_reason = end_reason', claim_correction_reminders: 'updated_at = now()', claim_correction_letters: 'updated_at = now()' }[table];
        await enterAppScope(client, PARIWAR_A);
        // USING — another Pariwar's row is ⛔ never reached.
        expect((await client.query(`UPDATE ${table} SET ${touch} WHERE ${idCol} = $1`, [id(b)])).rowCount).toBe(0);
        // …while A's own row is (the positive counterpart).
        expect((await client.query(`UPDATE ${table} SET ${touch} WHERE ${idCol} = $1`, [id(a)])).rowCount).toBe(1);
        // ⚠ The UPDATE policy's WITH CHECK is UNREACHABLE through `twt_app`: the column grant refuses a write to
        // `pariwar_id` FIRST (privilege, ⛔ not RLS). Both layers are pinned — the privilege here, the policy's
        // WITH CHECK in the catalog below — so the day a grant widens, the policy still holds the tenant.
        await expectPgError(client, () => client.query(`UPDATE ${table} SET pariwar_id = $2 WHERE ${idCol} = $1`, [id(a), PARIWAR_B]), {
          code: '42501',
          message: expect.stringMatching(/permission denied/),
        });
        const { rows } = await client.query<{ qual: string | null; with_check: string | null }>(
          `SELECT qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 AND cmd = 'UPDATE'`,
          [table],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]!.with_check).not.toBeNull();
        expect(rows[0]!.with_check).toBe(rows[0]!.qual);
      });
    }
  }

  it('the only deletion is the ON DELETE cascade from claims — all four tables follow the claim', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const counts = async () =>
      (
        await client.query(
          `SELECT (SELECT count(*) FROM claim_correction_marks WHERE claim_case_id = $1)::int AS m,
                  (SELECT count(*) FROM claim_correction_runs WHERE claim_case_id = $1)::int AS r,
                  (SELECT count(*) FROM claim_correction_reminders WHERE claim_case_id = $1)::int AS rem,
                  (SELECT count(*) FROM claim_correction_letters WHERE claim_case_id = $1)::int AS l`,
          [s.claimCaseId],
        )
      ).rows[0];
    // ⭐ The pre-count — every table HAS the claim's row (⛔ a cascade proven against tables that were already empty).
    expect(await counts()).toEqual({ m: 1, r: 1, rem: 1, l: 1 });
    // As the superuser (the fixture owner) — a spec cleanup / a hard delete of the claim itself.
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(await counts()).toEqual({ m: 0, r: 0, rem: 0, l: 0 });
  });

  // ── FKs (23503) — one violation per test, each by its constraint name ─────────────────────────────────────────
  describe('FKs (23503)', () => {
    const cases: readonly { readonly table: Table; readonly column: string; readonly constraint: string }[] = [
      { table: 'claim_correction_marks', column: 'claim_case_id', constraint: 'claim_correction_marks_claim_case_id_claims_claim_case_id_fk' },
      { table: 'claim_correction_marks', column: 'return_decision_id', constraint: 'claim_correction_marks_return_decision_id_fk' },
      { table: 'claim_correction_runs', column: 'claim_case_id', constraint: 'claim_correction_runs_claim_case_id_claims_claim_case_id_fk' },
      { table: 'claim_correction_runs', column: 'return_decision_id', constraint: 'claim_correction_runs_return_decision_id_fk' },
      { table: 'claim_correction_reminders', column: 'run_id', constraint: 'claim_correction_reminders_run_id_fk' },
      { table: 'claim_correction_reminders', column: 'claim_case_id', constraint: 'claim_correction_reminders_claim_case_id_claims_claim_case_id_f' }, // ⚠ Postgres truncates identifiers to 63 bytes — the migration's declared name ends `_fk`
      { table: 'claim_correction_reminders', column: 'recipient_version_id', constraint: 'claim_correction_reminders_recipient_version_id_fk' },
      { table: 'claim_correction_letters', column: 'run_id', constraint: 'claim_correction_letters_run_id_fk' },
      { table: 'claim_correction_letters', column: 'claim_case_id', constraint: 'claim_correction_letters_claim_case_id_claims_claim_case_id_fk' },
    ];
    for (const c of cases) {
      it(`${c.table}.${c.column} is a foreign key`, async () => {
        const { client } = getTx();
        const s = await seedChase(client, PARIWAR_A);
        await expectPgError(client, () => insertRow(client, c.table, { ...validRow[c.table](s), [c.column]: randomUUID() }), FK(c.constraint));
      });
    }

    it('✅ a reminder\'s recipient_version_id naming a REAL nominee version is accepted (the FK\'s positive counterpart)', async () => {
      const { client, tx } = getTx();
      const s = await seedChase(client, PARIWAR_A);
      const [version] = await seedNomineeDeclaration(tx, PARIWAR_A, randomUUID());
      expect(
        (await insertRow(client, 'claim_correction_reminders', { ...validRow.claim_correction_reminders(s), recipient_version_id: version!.versionId })).rowCount,
      ).toBe(1);
    });
  });

  // ── Append-only + column-narrowed UPDATE grants (42501) ─────────────────────────────────────────────────────────
  it('⭐ the marks are APPEND-ONLY — ⛔ no UPDATE for twt_app', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    for (const col of ['mark_id', 'must_act', 'note_ciphertext']) {
      await expectPgError(client, () => client.query(`UPDATE claim_correction_marks SET ${col} = ${col} WHERE mark_id = $1`, [s.markId]), {
        code: '42501',
        message: expect.stringMatching(/permission denied/),
      });
    }
  });

  it('⭐ a run\'s UPDATE is narrowed to ENDING it — its identity, kind and day 0 are ⛔ never rewritten', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    for (const col of ['run_id', 'kind', 'day0', 'claim_case_id', 'pariwar_id', 'return_decision_id', 'anchor_id', 'opened_at']) {
      await expectPgError(client, () => client.query(`UPDATE claim_correction_runs SET ${col} = ${col} WHERE run_id = $1`, [s.runId]), {
        code: '42501',
        message: expect.stringMatching(/permission denied/),
      });
    }
    const ended = await client.query(`UPDATE claim_correction_runs SET ended_at = now(), end_reason = 'decided' WHERE run_id = $1`, [s.runId]);
    expect(ended.rowCount).toBe(1);
  });

  it('⭐ a reminder\'s UPDATE is narrowed to the compare-and-set / finalise columns — its slot identity and `delivered_at` are ⛔ never written by twt_app', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    // ⭐ `delivered_at` is ⛔ not granted: no delivery signal exists in v1 (T1), so ⛔ no app path can claim one.
    for (const col of ['reminder_id', 'run_id', 'claim_case_id', 'pariwar_id', 'slot_day', 'sent_on', 'recipient_key', 'purpose', 'subject_key', 'late', 'delivered_at', 'created_at']) {
      await expectPgError(client, () => client.query(`UPDATE claim_correction_reminders SET ${col} = ${col} WHERE reminder_id = $1`, [s.reminderId]), {
        code: '42501',
        message: expect.stringMatching(/permission denied/),
      });
    }
    // The positive counterpart — every GRANTED column in one statement.
    const ok = await client.query(
      `UPDATE claim_correction_reminders
          SET outcome = 'error', provider_message_id = 'gw', detail = 'd', first_detail = 'f', recipient_version_id = NULL,
              recipient_number_hash = 'h', attempt_count = 2, claimed_at = now(), claimed_by_job = 'j', updated_at = now()
        WHERE reminder_id = $1`,
      [s.reminderId],
    );
    expect(ok.rowCount).toBe(1);
  });

  it('⭐ a letter\'s UPDATE is narrowed to its DELIVERY columns — who / what / when it was posted is ⛔ never rewritten', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    for (const col of ['letter_id', 'run_id', 'claim_case_id', 'pariwar_id', 'person_key', 'sequence', 'posted_on', 'tracking_number_ciphertext', 'recorded_by_actor', 'recorded_by_display', 'created_at']) {
      await expectPgError(client, () => client.query(`UPDATE claim_correction_letters SET ${col} = ${col} WHERE letter_id = $1`, [s.letterId]), {
        code: '42501',
        message: expect.stringMatching(/permission denied/),
      });
    }
    const ok = await client.query(
      `UPDATE claim_correction_letters
          SET delivered_on = $2, screenshot_storage_key = $3, screenshot_content_type = $4, screenshot_size_bytes = $5,
              delivery_recorded_by_actor = $6, delivery_recorded_by_display = $7, delivery_recorded_at = $8, updated_at = now()
        WHERE letter_id = $1`,
      [s.letterId, ...Object.values(DELIVERY)],
    );
    expect(ok.rowCount).toBe(1);
  });

  // ── Uniqueness (23505) ──────────────────────────────────────────────────────────────────────────────────────────
  it('⭐ `-267` §1 — ONE open run per claim (the partial UNIQUE); an ENDED second run is accepted', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const open = { ...validRow.claim_correction_runs(s), ended_at: null, end_reason: null };
    await expectPgError(client, () => insertRow(client, 'claim_correction_runs', open), UNIQUE('claim_correction_runs_one_open_per_claim_uq'));
    expect((await insertRow(client, 'claim_correction_runs', validRow.claim_correction_runs(s))).rowCount).toBe(1);
  });

  it('⭐ ONE return mark per return (`return_mark_uq`); further NON-return marks of the same return are accepted', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await expectPgError(
      client,
      () => insertRow(client, 'claim_correction_marks', { ...validRow.claim_correction_marks(s), is_return_mark: true, note_ciphertext: null }),
      UNIQUE('claim_correction_marks_return_mark_uq'),
    );
    expect((await insertRow(client, 'claim_correction_marks', validRow.claim_correction_marks(s))).rowCount).toBe(1);
    expect((await insertRow(client, 'claim_correction_marks', validRow.claim_correction_marks(s))).rowCount).toBe(1);
  });

  it('⭐ the reminder\'s five-part UNIQUE holds with the default subject_key \'\' (⛔ a NULL is refused — it would void it)', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const dup = { ...validRow.claim_correction_reminders(s), slot_day: 1, sent_on: '2026-11-02' };
    await expectPgError(client, () => insertRow(client, 'claim_correction_reminders', dup), UNIQUE('claim_correction_reminders_slot_uq'));
    await expectPgError(
      client,
      () => insertRow(client, 'claim_correction_reminders', { ...validRow.claim_correction_reminders(s), subject_key: null }),
      { code: '23502', column: 'subject_key' },
    );
    // The positive counterpart — the same slot for ANOTHER subject is a different row.
    expect((await insertRow(client, 'claim_correction_reminders', { ...dup, subject_key: 'claimant' })).rowCount).toBe(1);
  });

  // ⚠ `person_sequence_uq` is a PER-RUN BACKSTOP only — ⛔ the rule. The rule (≤ 2 per person per RETURN, epoch-blind)
  // is the writer's, under the trustee lock (`-273` §2, Story 6.19c Task 0a — recorded, ⛔ widened).
  it('⭐ a letter: the per-RUN backstop `person_sequence_uq` (one row per run, person, sequence — ⛔ the per-RETURN rule, which is the writer\'s); another person\'s first letter is accepted', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await expectPgError(
      client,
      () => insertRow(client, 'claim_correction_letters', { ...validRow.claim_correction_letters(s), person_key: 'nominee:v1' }),
      UNIQUE('claim_correction_letters_person_sequence_uq'),
    );
    expect((await insertRow(client, 'claim_correction_letters', validRow.claim_correction_letters(s))).rowCount).toBe(1);
  });

  describe('⭐ D34 — the day keys hold ACROSS RUNS (a real second run of the same claim)', () => {
    /** End the seeded run and open a SECOND run of the same claim and return — the same-day mark-switch shape. */
    async function secondRun(client: Client, s: Seeded): Promise<string> {
      await client.query(`UPDATE claim_correction_runs SET ended_at = now(), end_reason = 'mark_changed' WHERE run_id = $1`, [s.runId]);
      const runId = randomUUID();
      await client.query(
        `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0)
         VALUES ($1, $2, $3, $4, 'staff', $5, '2026-11-02')`,
        [runId, s.claimCaseId, PARIWAR_A, s.decisionId, randomUUID()],
      );
      return runId;
    }

    const staffRow = (s: Seeded, runId: string, purpose: string, over: Record<string, unknown> = {}) => ({
      ...validRow.claim_correction_reminders(s),
      run_id: runId,
      slot_day: 3,
      sent_on: '2026-11-04',
      recipient_key: 'staff:u1',
      purpose,
      outcome: purpose === 'staff_push' ? 'accepted' : 'recorded',
      ...over,
    });

    for (const [purpose, constraint] of [
      ['staff_push', 'claim_correction_reminders_staff_push_day_uq'],
      ['staff_reminder', 'claim_correction_reminders_staff_reminder_day_uq'],
    ] as const) {
      it(`ONE ${purpose} per (claim, staff member, IST day), whichever run it was keyed on`, async () => {
        const { client } = getTx();
        const s = await seedChase(client, PARIWAR_A);
        await insertRow(client, 'claim_correction_reminders', staffRow(s, s.runId, purpose));
        const run2 = await secondRun(client, s);
        // A DIFFERENT run and slot — only the day key can refuse it.
        await expectPgError(client, () => insertRow(client, 'claim_correction_reminders', staffRow(s, run2, purpose, { slot_day: 0 })), UNIQUE(constraint));
        // The positive counterparts — the next day, and another staff member the same day.
        expect((await insertRow(client, 'claim_correction_reminders', staffRow(s, run2, purpose, { sent_on: '2026-11-05' }))).rowCount).toBe(1);
        expect((await insertRow(client, 'claim_correction_reminders', staffRow(s, run2, purpose, { recipient_key: 'staff:u2' }))).rowCount).toBe(1);
      });
    }

    it('⭐ 0130 — the letter-chase day key: the SAME purpose for one person on one day ⇒ refused across runs; a DIFFERENT purpose the same day ⇒ BOTH accepted', async () => {
      const { client } = getTx();
      const s = await seedChase(client, PARIWAR_A);
      const chase = (runId: string, purpose: string, over: Record<string, unknown> = {}) =>
        staffRow(s, runId, purpose, { slot_day: 13, sent_on: '2026-11-14', subject_key: 'nominee:v1', ...over });
      await insertRow(client, 'claim_correction_reminders', chase(s.runId, 'letter_chase'));
      // ⭐ A District Admin who is also a Pariwar Admin: the escalation for the SAME person on the SAME day is a
      // DIFFERENT row (before 0130 the key had ⛔ no `purpose` and silently dropped it).
      expect((await insertRow(client, 'claim_correction_reminders', chase(s.runId, 'escalation'))).rowCount).toBe(1);
      expect((await insertRow(client, 'claim_correction_reminders', chase(s.runId, 'letter_second_due'))).rowCount).toBe(1);
      const run2 = await secondRun(client, s);
      for (const purpose of ['letter_chase', 'escalation', 'letter_second_due']) {
        await expectPgError(
          client,
          () => insertRow(client, 'claim_correction_reminders', chase(run2, purpose)),
          UNIQUE('claim_correction_reminders_letter_chase_day_uq'),
        );
      }
      // Another chased person the same day is a different row.
      expect((await insertRow(client, 'claim_correction_reminders', chase(run2, 'letter_chase', { subject_key: 'claimant' }))).rowCount).toBe(1);
    });
  });

  // ── CHECKs (23514) — each by name, each with its positive counterpart ──────────────────────────────────────────
  describe('CHECKs (23514)', () => {
    interface CheckCase {
      readonly title: string;
      readonly table: Table;
      /** The override that violates the constraint. */
      readonly bad: Record<string, unknown>;
      /** The nearest override that is ACCEPTED. */
      readonly good: Record<string, unknown>;
      /** Run before the positive leg (as the superuser), when the seed itself stands in its way. */
      readonly prepare?: (client: Client, s: Seeded) => Promise<unknown>;
      readonly constraint: string;
    }
    const cases: readonly CheckCase[] = [
      // marks
      { title: 'must_act ∈ {family, staff}', table: 'claim_correction_marks', bad: { must_act: 'nobody' }, good: { must_act: 'family' }, constraint: 'claim_correction_marks_must_act_check' },
      { title: 'set_by_role admits super_admin (`-270`) and ⛔ an unknown role', table: 'claim_correction_marks', bad: { set_by_role: 'verifier' }, good: { set_by_role: 'super_admin' }, constraint: 'claim_correction_marks_set_by_role_check' },
      { title: 'set_by_actor is non-blank', table: 'claim_correction_marks', bad: { set_by_actor: '  ' }, good: { set_by_actor: 'x' }, constraint: 'claim_correction_marks_set_by_actor_check' },
      { title: 'set_by_actor_display is non-blank', table: 'claim_correction_marks', bad: { set_by_actor_display: ' ' }, good: { set_by_actor_display: 'Y' }, constraint: 'claim_correction_marks_set_by_actor_display_check' },
      {
        title: '⭐ a NON-return mark needs a note (D25) — the note_required_check',
        table: 'claim_correction_marks',
        bad: { is_return_mark: false, note_ciphertext: null },
        good: { is_return_mark: false, note_ciphertext: 'enc:v1:n' },
        constraint: 'claim_correction_marks_note_required_check',
      },
      // runs
      { title: 'a run\'s kind ∈ {family, staff, direction}', table: 'claim_correction_runs', bad: { kind: 'closure' }, good: { kind: 'direction' }, constraint: 'claim_correction_runs_kind_check' },
      {
        title: '⭐ `-267` §3 — ⛔ NO `resubmitted` end reason (resubmission PAUSES a run)',
        table: 'claim_correction_runs',
        bad: { end_reason: 'resubmitted' },
        good: { end_reason: 'day_90' },
        constraint: 'claim_correction_runs_end_reason_check',
      },
      { title: 'an ended run has a reason (ended_at without end_reason)', table: 'claim_correction_runs', bad: { end_reason: null }, good: { end_reason: 'decided' }, constraint: 'claim_correction_runs_ended_pair_check' },
      {
        title: 'an open run has ⛔ no reason (end_reason without ended_at); a TRUE open run (both null) is accepted',
        table: 'claim_correction_runs',
        bad: { ended_at: null },
        good: { ended_at: null, end_reason: null },
        // ⭐ The seeded run is OPEN — end it first, so the positive leg's open run is ⛔ refused by the one-open-run
        // UNIQUE instead of being accepted by the CHECK under test.
        prepare: (client, s) => client.query(`UPDATE claim_correction_runs SET ended_at = now(), end_reason = 'superseded' WHERE run_id = $1`, [s.runId]),
        constraint: 'claim_correction_runs_ended_pair_check',
      },
      // reminders
      { title: 'purpose is checked', table: 'claim_correction_reminders', bad: { purpose: 'sms' }, good: { purpose: 'replacement_reminder' }, constraint: 'claim_correction_reminders_purpose_check' },
      { title: '`delivered` is ⛔ not an outcome (T1)', table: 'claim_correction_reminders', bad: { outcome: 'delivered' }, good: { outcome: 'rejected_unreachable' }, constraint: 'claim_correction_reminders_outcome_check' },
      { title: 'slot_day ≥ 0', table: 'claim_correction_reminders', bad: { slot_day: -1 }, good: { slot_day: 0 }, constraint: 'claim_correction_reminders_slot_day_check' },
      { title: 'attempt_count ≥ 1', table: 'claim_correction_reminders', bad: { attempt_count: 0 }, good: { attempt_count: 1 }, constraint: 'claim_correction_reminders_attempt_count_check' },
      { title: 'recipient_key is non-blank', table: 'claim_correction_reminders', bad: { recipient_key: ' ' }, good: { recipient_key: 'claimant' }, constraint: 'claim_correction_reminders_recipient_key_check' },
      {
        title: 'an `attempting` row says WHEN it was claimed',
        table: 'claim_correction_reminders',
        bad: { outcome: 'attempting' },
        good: { outcome: 'attempting', claimed_at: '2026-11-03T04:30:00.000Z', claimed_by_job: 'j' },
        constraint: 'claim_correction_reminders_attempting_claimed_check',
      },
      {
        title: '⭐ T1 — delivered_at only on an ACCEPTED row',
        table: 'claim_correction_reminders',
        bad: { outcome: 'rejected_invalid_number', delivered_at: '2026-11-03T05:00:00.000Z' },
        good: { outcome: 'accepted', delivered_at: '2026-11-03T05:00:00.000Z' },
        constraint: 'claim_correction_reminders_delivered_only_accepted_check',
      },
      // letters
      { title: 'sequence ∈ {1, 2}', table: 'claim_correction_letters', bad: { sequence: 3 }, good: { sequence: 2 }, constraint: 'claim_correction_letters_sequence_check' },
      { title: 'person_key is non-blank', table: 'claim_correction_letters', bad: { person_key: ' ' }, good: { person_key: 'claimant' }, constraint: 'claim_correction_letters_person_key_check' },
      { title: 'recorded_by_actor is non-blank', table: 'claim_correction_letters', bad: { recorded_by_actor: ' ' }, good: { recorded_by_actor: 'x' }, constraint: 'claim_correction_letters_recorded_by_check' },
      { title: 'recorded_by_display is non-blank', table: 'claim_correction_letters', bad: { recorded_by_display: ' ' }, good: { recorded_by_display: 'Y' }, constraint: 'claim_correction_letters_recorded_by_check' },
      {
        title: '⭐ D6 — a delivery is all-or-nothing (a date ⛔ without its screenshot)',
        table: 'claim_correction_letters',
        bad: { delivered_on: '2026-11-10' },
        good: DELIVERY,
        constraint: 'claim_correction_letters_delivery_all_or_nothing_check',
      },
      {
        title: '⭐ D6 — a screenshot ⛔ without its attribution is refused too',
        table: 'claim_correction_letters',
        bad: { ...DELIVERY, delivery_recorded_by_display: null },
        good: DELIVERY,
        constraint: 'claim_correction_letters_delivery_all_or_nothing_check',
      },
      {
        title: 'a letter is ⛔ never delivered before it was posted (on the posting day is accepted)',
        table: 'claim_correction_letters',
        bad: { ...DELIVERY, delivered_on: '2026-11-02' },
        good: { ...DELIVERY, delivered_on: '2026-11-03' },
        constraint: 'claim_correction_letters_delivered_after_posted_check',
      },
    ];

    for (const c of cases) {
      it(`${c.table}: ${c.title}`, async () => {
        const { client } = getTx();
        const s = await seedChase(client, PARIWAR_A);
        await expectPgError(client, () => insertRow(client, c.table, { ...validRow[c.table](s), ...c.bad }), CHECK(c.constraint));
        await c.prepare?.(client, s);
        expect((await insertRow(client, c.table, { ...validRow[c.table](s), ...c.good })).rowCount).toBe(1);
      });
    }

    it('✅ the RETURN\'s own mark carries ⛔ no note and is accepted (the note_required_check\'s other positive leg)', async () => {
      const { client } = getTx();
      const s = await seedChase(client, PARIWAR_A);
      const { rows } = await client.query<{ is_return_mark: boolean; note_ciphertext: string | null }>(
        'SELECT is_return_mark, note_ciphertext FROM claim_correction_marks WHERE mark_id = $1',
        [s.markId],
      );
      expect(rows).toEqual([{ is_return_mark: true, note_ciphertext: null }]);
    });

    it('a delivery UPDATE is held to the same CHECKs — a partial delivery and a pre-posting date are refused, a complete one accepted', async () => {
      const { client } = getTx();
      const s = await seedChase(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_letters SET delivered_on = '2026-11-10' WHERE letter_id = $1`, [s.letterId]),
        CHECK('claim_correction_letters_delivery_all_or_nothing_check'),
      );
      const deliver = (deliveredOn: string) =>
        client.query(
          `UPDATE claim_correction_letters
              SET delivered_on = $2, screenshot_storage_key = 'k', screenshot_content_type = 'image/png', screenshot_size_bytes = 1,
                  delivery_recorded_by_actor = 'da', delivery_recorded_by_display = 'District Admin', delivery_recorded_at = now()
            WHERE letter_id = $1`,
          [s.letterId, deliveredOn],
        );
      await expectPgError(client, () => deliver('2026-11-01'), CHECK('claim_correction_letters_delivered_after_posted_check'));
      expect((await deliver('2026-11-20')).rowCount).toBe(1);
    });
  });
});

// claim_correction_{marks,runs,reminders,letters} — migrations 0126–0129 + RLS policy regression (Story 6.19b,
// Task 1). Mirrors claim-contact-policy-regression: positive / negative RLS, the connection-level fail-closed probe,
// the FORCE-RLS catalog guard, ⛔ no DELETE for `twt_app`, per-command policies — PLUS these migrations' own
// integrity: the marks are APPEND-ONLY (⛔ no UPDATE), a run's UPDATE is narrowed to ending it (column grant), ONE
// open run per claim, the reminder's five-part UNIQUE with `subject_key` NOT NULL (⛔ a nullable column would void it),
// the D34 day keys, `delivered_at` only on an accepted row, and a letter's delivery all-or-nothing + ≤ 2 per person.
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

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
  await client.query(
    `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
     VALUES ($1, $2, $3, 1, '2026-11-02', 'nominee:v1', 'family_sms', 'accepted')`,
    [runId, claimCaseId, pariwarId],
  );
  const letterId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_letters (letter_id, run_id, claim_case_id, pariwar_id, person_key, sequence, posted_on, tracking_number_ciphertext, recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, 'nominee:v1', 1, '2026-11-03', 'enc:v1:t', 'da', 'District Admin')`,
    [letterId, runId, claimCaseId, pariwarId],
  );
  return { claimCaseId, decisionId, markId, runId, letterId };
}

const TABLES = ['claim_correction_marks', 'claim_correction_runs', 'claim_correction_reminders', 'claim_correction_letters'] as const;

/** Expect a Postgres error with `code` WITHOUT aborting the test's transaction (a savepoint around the attempt). */
async function expectPgError(client: Client, run: () => Promise<unknown>, code: string): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject({ code });
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

describe.skipIf(!hasDatabase)('the correction chase — migrations 0126–0129 + RLS policy regression', { timeout: 20000 }, () => {
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
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
    });

    it(`⛔ no DELETE for twt_app on ${table}`, async () => {
      const { client } = getTx();
      const seeded = await seedChase(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => client.query(`DELETE FROM ${table} WHERE claim_case_id = $1`, [seeded.claimCaseId]), '42501');
    });

    it(`the policies are per-command — ⛔ no FOR ALL and ⛔ no DELETE policy on ${table}`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE tablename = $1`, [table]);
      const cmds = rows.map((r) => r.cmd).sort();
      expect(cmds).not.toContain('ALL');
      expect(cmds).not.toContain('DELETE');
      expect(cmds).toEqual(table === 'claim_correction_marks' ? ['INSERT', 'SELECT'] : ['INSERT', 'SELECT', 'UPDATE']);
    });
  }

  it('⭐ the marks are APPEND-ONLY — ⛔ no UPDATE for twt_app', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`UPDATE claim_correction_marks SET must_act = 'staff' WHERE mark_id = $1`, [s.markId]), '42501');
  });

  it('⭐ a run\'s UPDATE is narrowed to ENDING it — its kind and day 0 are ⛔ never rewritten', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`UPDATE claim_correction_runs SET kind = 'staff' WHERE run_id = $1`, [s.runId]), '42501');
    await expectPgError(client, () => client.query(`UPDATE claim_correction_runs SET day0 = '2026-12-01' WHERE run_id = $1`, [s.runId]), '42501');
    const ended = await client.query(`UPDATE claim_correction_runs SET ended_at = now(), end_reason = 'decided' WHERE run_id = $1`, [s.runId]);
    expect(ended.rowCount).toBe(1);
  });

  it('⭐ `-267` §1 — ONE open run per claim (the partial UNIQUE); an ended pair needs both columns', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    await expectPgError(client, () => client.query(
        `INSERT INTO claim_correction_runs (claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0) VALUES ($1, $2, $3, 'staff', $4, '2026-11-02')`,
        [s.claimCaseId, PARIWAR_A, s.decisionId, randomUUID()],
      ), '23505');
    await expectPgError(client, () => client.query(`UPDATE claim_correction_runs SET ended_at = now() WHERE run_id = $1`, [s.runId]), '23514');
    await expectPgError(client, () => client.query(`UPDATE claim_correction_runs SET end_reason = 'resubmitted', ended_at = now() WHERE run_id = $1`, [s.runId]), '23514');
  });

  it('⭐ the reminder\'s UNIQUE holds with the default subject_key \'\' (⛔ a NULL would void it), and delivered_at only on accepted', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const insert = (extra = '') =>
      client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome${extra ? ', subject_key' : ''})
         VALUES ($1, $2, $3, 1, '2026-11-02', 'nominee:v1', 'family_sms', 'accepted'${extra ? ', $4' : ''})`,
        extra ? [s.runId, s.claimCaseId, PARIWAR_A, extra] : [s.runId, s.claimCaseId, PARIWAR_A],
      );
    await expectPgError(client, () => insert(), '23505');
    await expectPgError(client, () => client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, subject_key)
         VALUES ($1, $2, $3, 2, '2026-11-03', 'x', 'family_sms', 'accepted', NULL)`,
        [s.runId, s.claimCaseId, PARIWAR_A],
      ), '23502');
    await expectPgError(client, () => client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, delivered_at)
         VALUES ($1, $2, $3, 3, '2026-11-04', 'nominee:v1', 'family_sms', 'rejected_invalid_number', now())`,
        [s.runId, s.claimCaseId, PARIWAR_A],
      ), '23514');
    await expectPgError(client, () => client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
         VALUES ($1, $2, $3, 4, '2026-11-05', 'nominee:v1', 'family_sms', 'delivered')`,
        [s.runId, s.claimCaseId, PARIWAR_A],
      ), '23514');
    await expectPgError(client, () => client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
         VALUES ($1, $2, $3, 5, '2026-11-06', 'nominee:v1', 'family_sms', 'attempting')`,
        [s.runId, s.claimCaseId, PARIWAR_A],
      ), '23514');
  });

  it('⭐ D34 — ONE staff push per (claim, staff member, IST day), across runs', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const push = (slot: number) =>
      client.query(
        `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome)
         VALUES ($1, $2, $3, $4, '2026-11-02', 'staff:u1', 'staff_push', 'accepted')`,
        [s.runId, s.claimCaseId, PARIWAR_A, slot],
      );
    await push(1);
    await expectPgError(client, () => push(2), '23505');
  });

  it('⭐ a letter: ≤ 2 per person per run (sequence ∈ {1,2}, UNIQUE), delivery all-or-nothing and ⛔ before posting', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const letter = (seq: number) =>
      client.query(
        `INSERT INTO claim_correction_letters (run_id, claim_case_id, pariwar_id, person_key, sequence, posted_on, tracking_number_ciphertext, recorded_by_actor, recorded_by_display)
         VALUES ($1, $2, $3, 'nominee:v1', $4, '2026-11-03', 'enc:v1:t', 'da', 'District Admin')`,
        [s.runId, s.claimCaseId, PARIWAR_A, seq],
      );
    await expectPgError(client, () => letter(1), '23505');
    await expectPgError(client, () => letter(3), '23514');
    await expectPgError(client, () => client.query(`UPDATE claim_correction_letters SET delivered_on = '2026-11-10' WHERE letter_id = $1`, [s.letterId]), '23514');
    await expectPgError(client, () => client.query(
        `UPDATE claim_correction_letters SET delivered_on = '2026-11-01', screenshot_storage_key = 'k', screenshot_content_type = 'image/png', screenshot_size_bytes = 1,
           delivery_recorded_by_actor = 'da', delivery_recorded_by_display = 'District Admin', delivery_recorded_at = now() WHERE letter_id = $1`,
        [s.letterId],
      ), '23514');
  });

  it('`set_by_role` admits super_admin (`-270`) and ⛔ an unknown role', async () => {
    const { client } = getTx();
    const s = await seedChase(client, PARIWAR_A);
    const mark = (role: string) =>
      client.query(
        `INSERT INTO claim_correction_marks (claim_case_id, pariwar_id, return_decision_id, must_act, set_by_actor, set_by_actor_display, set_by_role, note_ciphertext)
         VALUES ($1, $2, $3, 'staff', 'sa', 'Super Admin', $4, 'enc:v1:n')`,
        [s.claimCaseId, PARIWAR_A, s.decisionId, role],
      );
    await mark('super_admin');
    await expectPgError(client, () => mark('verifier'), '23514');
  });
});

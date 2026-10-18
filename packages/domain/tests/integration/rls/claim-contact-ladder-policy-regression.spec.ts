// claim_contact_ladders + the send tables' 0169 purposes — migration 0169 + RLS policy regression (Story 6.37c, Task 1;
// AC8; LD2, LD9, I5). Positive / negative tenant RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the
// per-command policies G-a chose (SELECT / INSERT / UPDATE — ⛔ FOR ALL, ⛔ DELETE), EXACTLY the grants (SELECT, INSERT,
// the step / state / escalation UPDATE columns — ⛔ identity, ⛔ DELETE), cross-tenant WITH CHECK, the claim FK, every
// CHECK by NAME with a POSITIVE counterpart, ⭐ ONE running ladder per (claim, chase, person) and ⭐ a row the origin of
// at most ONE ladder, ever; then 0169's send-table half: `ladder_sms` / `ladder_escalation` on BOTH send tables, the
// certificate purpose ↔ outcome pairing, and the new per-ladder partial UNIQUEs. Live DB only; per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CONTACT_LADDER_CHASES, CONTACT_LADDER_STATES } from '../../../src/schema/claim_contact_ladders.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'claim_contact_ladders';

const validRow = (claimCaseId: string, pariwarId: string = PARIWAR_A, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  claim_case_id: claimCaseId,
  chase: 'correction',
  run_id: randomUUID(),
  return_decision_id: randomUUID(),
  person_key: 'claimant',
  recipient_number_hash: 'h-number-a',
  origin_row_id: randomUUID(),
  origin_sent_on: '2026-10-01',
  whatsapp_step: 'skipped:whatsapp_not_built',
  sms2_due_on: '2026-10-03',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>, table: string = T) {
  const cols = Object.keys(v);
  return client.query<{ ladder_id?: string }>(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    Object.values(v),
  );
}

async function seed(client: Client, pariwarId: string = PARIWAR_A): Promise<{ claimCaseId: string; ladderId: string }> {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const { rows } = await insertRow(client, validRow(claimCaseId, pariwarId));
  return { claimCaseId, ladderId: rows[0]!.ladder_id! };
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

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const UNIQUE = (constraint: string) => ({ code: '23505', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
}

const ENDED = { state: 'ended_stopped', ended_at: '2026-10-05T04:30:00.000Z', end_detail: 'stopped:run_ended' };

describe.skipIf(!hasDatabase)('claim_contact_ladders — migration 0169 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, under scope B only B rows', async () => {
    const { client } = getTx();
    await seed(client, PARIWAR_A);
    await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    await seed(client);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${T}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [T],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
  });

  it('⭐ G-a — the policies are EXACTLY SELECT / INSERT / UPDATE to twt_app, tenant-keyed (⛔ FOR ALL, ⛔ DELETE)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [T],
    );
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
    for (const r of rows) expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toMatch(/pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid/);
    const update = rows.find((r) => r.cmd === 'UPDATE')!;
    expect(update.with_check).toBe(update.qual);
  });

  it('⭐ G-a — the grants are EXACTLY SELECT + INSERT, and UPDATE on the step / state / escalation columns only', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(table.rows.map((r) => r.privilege_type)).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE' ORDER BY 1`,
      [T],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(
      [
        'concluded_on',
        'conclude_on',
        'end_detail',
        'ended_at',
        'escalated_on',
        'sms2_on',
        'sms2_row_id',
        'sms2_state',
        'sms3_due_on',
        'sms3_on',
        'sms3_row_id',
        'sms3_state',
        'state',
        'updated_at',
      ].sort(),
    );
  });

  it('⛔ DELETE for twt_app; ⛔ an identity column rewritten (42501); a step and state move ARE writable', async () => {
    const { client } = getTx();
    const { ladderId } = await seed(client);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE ladder_id = $1`, [ladderId]), DENIED);
    for (const set of [
      `chase = 'certificate'`,
      `person_key = 'nominee:x'`,
      `recipient_number_hash = 'other'`,
      `origin_row_id = gen_random_uuid()`,
      `origin_sent_on = origin_sent_on`,
      `run_id = run_id`,
      `return_decision_id = return_decision_id`,
      `whatsapp_step = 'pending'`,
      `sms2_due_on = sms2_due_on`,
      `pariwar_id = pariwar_id`,
      `claim_case_id = claim_case_id`,
      `created_at = now()`,
    ]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE ladder_id = $1`, [ladderId]), DENIED);
    }
    await expectAccepted(client, () =>
      client.query(
        `UPDATE ${T} SET sms2_state = 'sent', sms2_on = '2026-10-03', sms2_row_id = gen_random_uuid(), sms3_due_on = '2026-10-05',
           updated_at = clock_timestamp() WHERE ladder_id = $1`,
        [ladderId],
      ),
    );
    await expectAccepted(client, () =>
      client.query(
        `UPDATE ${T} SET state = 'ended_delivered', ended_at = clock_timestamp(), end_detail = 'delivered' WHERE ladder_id = $1`,
        [ladderId],
      ),
    );
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501); A\'s is accepted', async () => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, validRow(claimCaseId, PARIWAR_A))).rowCount).toBe(1);
  });

  it('cross-tenant UPDATE: B\'s row is INVISIBLE under scope A', async () => {
    const { client } = getTx();
    const a = await seed(client, PARIWAR_A);
    const b = await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${T} SET updated_at = clock_timestamp() WHERE ladder_id = $1`, [b.ladderId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${T} SET updated_at = clock_timestamp() WHERE ladder_id = $1`, [a.ladderId])).rowCount).toBe(1);
  });

  it('the claim FK refuses a ladder on ⛔ claim (23503)', async () => {
    const { client } = getTx();
    await expectPgError(client, () => insertRow(client, validRow(randomUUID())), { code: '23503', constraint: 'claim_contact_ladders_claim_case_id_fk' });
  });

  it('⭐ I5 — ONE running ladder per (claim, chase, person): a second running row is refused (23505); an ENDED one, another chase or another person are accepted', async () => {
    const { client } = getTx();
    const { claimCaseId } = await seed(client);
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId)), UNIQUE('claim_contact_ladders_running_uq'));
    await expectAccepted(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, ENDED)));
    await expectAccepted(client, () =>
      insertRow(client, validRow(claimCaseId, PARIWAR_A, { chase: 'certificate', return_decision_id: null })),
    );
    await expectAccepted(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, { person_key: 'nominee:other' })));
  });

  it('⭐ LD5 — a send row is the origin of at most ONE ladder, EVER — even when the first is ENDED (23505); the same id under the other chase is another row', async () => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    const origin = randomUUID();
    await insertRow(client, validRow(claimCaseId, PARIWAR_A, { origin_row_id: origin, ...ENDED }));
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, { origin_row_id: origin })), UNIQUE('claim_contact_ladders_origin_uq'));
    await expectAccepted(client, () =>
      insertRow(client, validRow(claimCaseId, PARIWAR_A, { origin_row_id: origin, chase: 'certificate', return_decision_id: null })),
    );
  });

  it('⭐ LOCKSTEP — the chase and state CHECKs name EXACTLY the TS vocabularies', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'claim_contact_ladders_chase_check')).toEqual([...CONTACT_LADDER_CHASES].sort());
    expect(await checkValues(client, 'claim_contact_ladders_state_check')).toEqual([...CONTACT_LADDER_STATES].sort());
  });

  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['claim_contact_ladders_chase_check', { chase: 'peer_mesh', return_decision_id: null }, { chase: 'certificate', return_decision_id: null }],
    ['claim_contact_ladders_return_pair_check', { return_decision_id: null }, { return_decision_id: randomUUID() }],
    ['claim_contact_ladders_return_pair_check', { chase: 'certificate' }, { chase: 'certificate', return_decision_id: null }],
    ['claim_contact_ladders_person_key_check', { person_key: '  ' }, { person_key: 'nominee:abc' }],
    ['claim_contact_ladders_number_hash_check', { recipient_number_hash: ' ' }, { recipient_number_hash: 'h' }],
    ['claim_contact_ladders_whatsapp_step_check', { whatsapp_step: 'sent' }, { whatsapp_step: 'skipped:nominee_no_whatsapp' }],
    // Review P5 — the shared `skipped:[a-z_]{1,48}` grammar's own boundaries: 49 chars refuses, 48 accepts; a digit
    // or uppercase character in the suffix refuses.
    ['claim_contact_ladders_whatsapp_step_check', { whatsapp_step: `skipped:${'a'.repeat(49)}` }, { whatsapp_step: `skipped:${'a'.repeat(48)}` }],
    ['claim_contact_ladders_whatsapp_step_check', { whatsapp_step: 'skipped:Not_Lowercase' }, { whatsapp_step: 'skipped:not_lowercase' }],
    ['claim_contact_ladders_whatsapp_step_check', { whatsapp_step: 'skipped:has_a_digit_9' }, { whatsapp_step: 'skipped:has_no_digit' }],
    ['claim_contact_ladders_sms2_state_check', { sms2_state: 'delivered', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05' }, { sms2_state: 'satisfied', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05' }],
    ['claim_contact_ladders_sms2_on_pair_check', { sms2_state: 'sent' }, { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID() }],
    ['claim_contact_ladders_sms2_on_pair_check', { sms3_due_on: '2026-10-05' }, { sms3_due_on: null }],
    // Review P3 — `sms<N>_row_id` is REQUIRED once `sent`, ⛔ otherwise (except `satisfied`, which may carry EITHER).
    [
      'claim_contact_ladders_sms2_row_id_check',
      { sms2_row_id: randomUUID() },
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID() },
    ],
    [
      'claim_contact_ladders_sms2_row_id_check',
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: null },
      { sms2_state: 'satisfied', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: null },
    ],
    [
      'claim_contact_ladders_sms3_row_id_check',
      {
        sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(),
        sms3_state: 'sent', sms3_on: '2026-10-05', conclude_on: '2026-10-09', sms3_row_id: null,
      },
      {
        sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(),
        sms3_state: 'sent', sms3_on: '2026-10-05', conclude_on: '2026-10-09', sms3_row_id: randomUUID(),
      },
    ],
    [
      'claim_contact_ladders_sms3_state_check',
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(), sms3_state: 'x', sms3_on: '2026-10-05', conclude_on: '2026-10-09' },
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(), sms3_state: 'skipped:past_horizon', sms3_on: '2026-10-05', conclude_on: '2026-10-09' },
    ],
    [
      'claim_contact_ladders_sms3_on_pair_check',
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(), sms3_state: 'sent', sms3_on: '2026-10-05', sms3_row_id: randomUUID() },
      { sms2_state: 'sent', sms2_on: '2026-10-03', sms3_due_on: '2026-10-05', sms2_row_id: randomUUID(), sms3_state: 'sent', sms3_on: '2026-10-05', sms3_row_id: randomUUID(), conclude_on: '2026-10-09' },
    ],
    ['claim_contact_ladders_step_order_check', { sms2_due_on: '2026-10-01' }, { sms2_due_on: '2026-10-02' }],
    ['claim_contact_ladders_state_check', { state: 'paused', ended_at: '2026-10-05T04:30:00.000Z' }, { state: 'ended_call', ended_at: '2026-10-05T04:30:00.000Z' }],
    ['claim_contact_ladders_ended_pair_check', { state: 'ended_delivered' }, { state: 'ended_delivered', ended_at: '2026-10-05T04:30:00.000Z' }],
    ['claim_contact_ladders_ended_pair_check', { ended_at: '2026-10-05T04:30:00.000Z' }, { ended_at: null }],
    [
      'claim_contact_ladders_concluded_pair_check',
      { state: 'concluded_undelivered', ended_at: '2026-10-09T04:30:00.000Z' },
      { state: 'concluded_undelivered', ended_at: '2026-10-09T04:30:00.000Z', concluded_on: '2026-10-09' },
    ],
    [
      'claim_contact_ladders_escalated_check',
      { escalated_on: '2026-10-09' },
      { state: 'concluded_undelivered', ended_at: '2026-10-09T04:30:00.000Z', concluded_on: '2026-10-09', escalated_on: '2026-10-09' },
    ],
    ['claim_contact_ladders_end_detail_check', { end_detail: 'stopped:run_ended' }, { ...ENDED }],
    ['claim_contact_ladders_end_detail_check', { ...ENDED, end_detail: 'Stopped Because' }, { ...ENDED, end_detail: 'stopped:not_a_recipient' }],
  ])('%s refuses %j and accepts %j', async (constraint, bad, good) => {
    const { client } = getTx();
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, validRow(claimCaseId, PARIWAR_A, good)));
  });
});

// ── 0169's send-table half ─────────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('0169 — the send tables gain `ladder_sms` / `ladder_escalation`', { timeout: 20000 }, () => {
  setupLiveDb();

  /** As the superuser: a claim with a correction return + family run, and a certificate run. */
  async function seedRuns(client: Client) {
    const { tx } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A);
    const decisionId = randomUUID();
    await client.query(
      `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin')`,
      [decisionId, claimCaseId, PARIWAR_A],
    );
    const correctionRunId = randomUUID();
    await client.query(
      `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0)
       VALUES ($1, $2, $3, $4, 'family', $5, '2026-10-01')`,
      [correctionRunId, claimCaseId, PARIWAR_A, decisionId, randomUUID()],
    );
    const certificateRunId = randomUUID();
    await client.query(
      `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, $3, 'missing', '2026-10-01')`,
      [certificateRunId, claimCaseId, PARIWAR_A],
    );
    return { claimCaseId, correctionRunId, certificateRunId };
  }

  const sendRow = (runId: string, claimCaseId: string, over: Record<string, unknown>): Record<string, unknown> => ({
    run_id: runId,
    claim_case_id: claimCaseId,
    pariwar_id: PARIWAR_A,
    slot_day: 3,
    sent_on: '2026-10-04',
    recipient_key: 'claimant',
    purpose: 'ladder_sms',
    subject_key: 'ladder:00000000-0000-4000-8000-000000000001:2',
    outcome: 'accepted',
    ...over,
  });

  it.each([['claim_correction_reminders'], ['claim_certificate_reminders']])(
    '%s — a `ladder_sms` and a `ladder_escalation` row are accepted; ⭐ ONE row per (claim, subject) for the ladder purposes (23505), whatever the run / slot / recipient',
    async (table) => {
      const { client } = getTx();
      const s = await seedRuns(client);
      const runId = table === 'claim_correction_reminders' ? s.correctionRunId : s.certificateRunId;
      await insertRow(client, sendRow(runId, s.claimCaseId, {}), table);
      await expectPgError(
        client,
        () => insertRow(client, sendRow(runId, s.claimCaseId, { slot_day: 5, recipient_key: 'nominee:x' }), table),
        UNIQUE(`${table}_ladder_uq`),
      );
      const esc = { purpose: 'ladder_escalation', subject_key: 'ladder:00000000-0000-4000-8000-000000000001', recipient_key: 'staff:da', outcome: 'recorded' };
      await insertRow(client, sendRow(runId, s.claimCaseId, esc), table);
      await expectPgError(client, () => insertRow(client, sendRow(runId, s.claimCaseId, { ...esc, slot_day: 9 }), table), UNIQUE(`${table}_ladder_uq`));
      // Another step of the same ladder is another row.
      await expectAccepted(client, () => insertRow(client, sendRow(runId, s.claimCaseId, { subject_key: 'ladder:00000000-0000-4000-8000-000000000001:3' }), table));
    },
  );

  it('⭐ 0169 replaced 0141 — `ladder_sms` takes the FAMILY outcomes, `ladder_escalation` the STAFF ones (both ways refused)', async () => {
    const { client } = getTx();
    const s = await seedRuns(client);
    const T2 = 'claim_certificate_reminders';
    const c = 'claim_certificate_reminders_purpose_outcome_check';
    await expectPgError(client, () => insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { outcome: 'recorded' }), T2), CHECK(c));
    await expectPgError(
      client,
      () => insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { purpose: 'ladder_escalation', subject_key: 'ladder:e', outcome: 'accepted' }), T2),
      CHECK(c),
    );
    await expectAccepted(client, () =>
      insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { purpose: 'ladder_escalation', subject_key: 'ladder:e', outcome: 'no_target' }), T2),
    );
    for (const outcome of ['rejected_unreachable', 'skipped_superseded', 'error', 'no_target']) {
      await expectAccepted(client, () => insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { outcome }), T2));
    }
    // The family purpose is unchanged (⛔ `recorded`), and a ladder row must name its subject (0138's pin).
    await expectPgError(
      client,
      () => insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { purpose: 'family_sms', subject_key: '', outcome: 'recorded' }), T2),
      CHECK(c),
    );
    await expectPgError(
      client,
      () => insertRow(client, sendRow(s.certificateRunId, s.claimCaseId, { subject_key: '' }), T2),
      CHECK('claim_certificate_reminders_subject_key_check'),
    );
  });

  it('`delivered_at` stays ⛔ granted on BOTH send tables (LD14 (d) — the seam unused)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.column_privileges
        WHERE grantee = 'twt_app' AND column_name = 'delivered_at' AND privilege_type = 'UPDATE'
          AND table_name IN ('claim_correction_reminders', 'claim_certificate_reminders')`,
    );
    expect(rows).toHaveLength(0);
  });
});

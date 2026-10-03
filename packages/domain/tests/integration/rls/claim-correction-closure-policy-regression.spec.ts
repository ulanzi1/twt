// claim_correction_{closures,directions}, claim_refile_confirmations, claim_closure_letters — migrations 0131–0135 +
// RLS policy regression (Story 6.19c, Task 1; AC11c "Migrations"). Mirrors claim-correction-chase-policy-regression:
// positive / negative RLS, the connection-level fail-closed probe, the FORCE-RLS catalog guard, ⛔ no DELETE for
// `twt_app`, per-command policies, cross-tenant WITH CHECK, every FK (23503), the column-narrowed UPDATE grants — PLUS
// these migrations' own integrity: ONE live closures row per RETURN (a `lapsed` row ⛔ blocks nothing), the request /
// decision / review / outbox CHECKs, ⭐ a STAFF-ORIGIN row ⛔ never closed (`-274` 1a), ONE unconsumed re-file
// confirmation per closed claim, ONE closure letter per person per closure, and 0135's purposes: the CHECK in LOCKSTEP
// with `CORRECTION_REMINDER_PURPOSES`, the per-day key and the closure notice's ONCE key. Each constraint asserted by its
// NAME, each with a POSITIVE counterpart. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CORRECTION_REMINDER_PURPOSES } from '../../../src/schema/claim_correction_chase.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** As the superuser: a claim, its return, a family run, and one row of each new table in `pariwarId`. */
async function seedClosure(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const decisionId = randomUUID();
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
     VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin')`,
    [decisionId, claimCaseId, pariwarId],
  );
  const runId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0, ended_at, end_reason)
     VALUES ($1, $2, $3, $4, 'family', $5, '2026-08-01', '2026-10-30T00:00:00Z', 'day_90')`,
    [runId, claimCaseId, pariwarId, decisionId, randomUUID()],
  );
  const closureId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_closures (closure_id, claim_case_id, pariwar_id, return_decision_id, origin, state, request_family_run_id,
       requested_by_actor, requested_by_display, request_note_ciphertext, requested_at, pariwar_decision, pariwar_decided_by_actor,
       pariwar_decided_by_display, pariwar_decision_note_ciphertext, pariwar_decided_at, escalated_at)
     VALUES ($1, $2, $3, $4, 'declined_closure', 'escalated', $5, 'da', 'District Admin', 'enc:v1:r', now(), 'declined', 'pa',
       'Pariwar Admin', 'enc:v1:d', now(), now())`,
    [closureId, claimCaseId, pariwarId, decisionId, runId],
  );
  // A SPARE, superseded return of the same claim — the free slot a test's own closures row lands on.
  const spareReturn = randomUUID();
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display, superseded_at)
     VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin', now())`,
    [spareReturn, claimCaseId, pariwarId],
  );
  const directionId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_directions (direction_id, closure_id, claim_case_id, pariwar_id, directed_to_actor, directed_to_role, kind,
       text_ciphertext, created_by_actor, created_by_display)
     VALUES ($1, $2, $3, $4, 'da', 'district_admin', 'other', 'enc:v1:t', 'sa', 'Super Admin')`,
    [directionId, closureId, claimCaseId, pariwarId],
  );
  // A SECOND claim of the same death, closed — a re-file confirmation names it; and a closure letter on it.
  const closedClaim = await seedClaim(tx, pariwarId);
  const closedReturn = randomUUID();
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display, superseded_at)
     VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin', now())`,
    [closedReturn, closedClaim, pariwarId],
  );
  const closedRun = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0, ended_at, end_reason)
     VALUES ($1, $2, $3, $4, 'family', $5, '2026-08-01', '2026-10-30T00:00:00Z', 'day_90')`,
    [closedRun, closedClaim, pariwarId, closedReturn, randomUUID()],
  );
  const closedClosureId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_closures (closure_id, claim_case_id, pariwar_id, return_decision_id, origin, state, request_family_run_id,
       requested_by_actor, requested_by_display, request_note_ciphertext, requested_at, pariwar_decision, pariwar_decided_by_actor,
       pariwar_decided_by_display, pariwar_decided_at, closed_at, closure_notice_run_id, closure_notice_due_at, closure_letter_person_keys)
     VALUES ($1, $2, $3, $4, 'declined_closure', 'closed', $5, 'da', 'District Admin', 'enc:v1:r', now(), 'approved', 'pa',
       'Pariwar Admin', now(), now(), $5, now(), '{nominee:v1}')`,
    [closedClosureId, closedClaim, pariwarId, closedReturn, closedRun],
  );
  const confirmationId = randomUUID();
  await client.query(
    `INSERT INTO claim_refile_confirmations (confirmation_id, pariwar_id, deceased_member_id, closed_claim_case_id, closure_id, via,
       confirmed_by_actor, confirmed_by_display, note_ciphertext)
     VALUES ($1, $2, $3, $4, $5, 'helpline', 'op', 'Helpline Operator', 'enc:v1:n')`,
    [confirmationId, pariwarId, randomUUID(), closedClaim, closedClosureId],
  );
  const letterId = randomUUID();
  await client.query(
    `INSERT INTO claim_closure_letters (letter_id, closure_id, claim_case_id, pariwar_id, person_key, posted_on, tracking_number_ciphertext,
       recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, 'nominee:v1', '2026-11-03', 'enc:v1:t', 'da', 'District Admin')`,
    [letterId, closedClosureId, closedClaim, pariwarId],
  );
  return { claimCaseId, decisionId, spareReturn, runId, closureId, directionId, closedClaim, closedReturn, closedRun, closedClosureId, confirmationId, letterId };
}

type Seeded = Awaited<ReturnType<typeof seedClosure>>;

const TABLES = ['claim_correction_closures', 'claim_correction_directions', 'claim_refile_confirmations', 'claim_closure_letters'] as const;
type Table = (typeof TABLES)[number];

/** A VALID row of each table for `s` (raw column names) — every one INSERTable on top of the seed. */
const validRow: Record<Table, (s: Seeded, pariwarId?: string) => Record<string, unknown>> = {
  // A STAFF-CASE escalation on the SPARE return of the seeded claim (the seeded declined row holds the first return).
  claim_correction_closures: (s, pariwarId = PARIWAR_A) => ({
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    return_decision_id: s.spareReturn,
    origin: 'staff_case',
    state: 'escalated',
    escalated_at: '2026-11-01T00:00:00.000Z',
  }),
  claim_correction_directions: (s, pariwarId = PARIWAR_A) => ({
    closure_id: s.closureId,
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    directed_to_actor: 'pa',
    directed_to_role: 'pariwar_admin',
    kind: 'restart_family_reminders',
    text_ciphertext: 'enc:v1:t',
    created_by_actor: 'sa',
    created_by_display: 'Super Admin',
  }),
  // A CONSUMED confirmation (the seeded one is the one open per claim).
  claim_refile_confirmations: (s, pariwarId = PARIWAR_A) => ({
    pariwar_id: pariwarId,
    deceased_member_id: randomUUID(),
    closed_claim_case_id: s.closedClaim,
    closure_id: s.closedClosureId,
    via: 'district_admin',
    confirmed_by_actor: 'da',
    confirmed_by_display: 'District Admin',
    note_ciphertext: 'enc:v1:n',
    consumed_by_claim_case_id: s.claimCaseId,
    consumed_at: '2026-11-05T00:00:00.000Z',
  }),
  claim_closure_letters: (s, pariwarId = PARIWAR_A) => ({
    closure_id: s.closedClosureId,
    claim_case_id: s.closedClaim,
    pariwar_id: pariwarId,
    person_key: 'claimant',
    posted_on: '2026-11-04',
    tracking_number_ciphertext: 'enc:v1:t',
    recorded_by_actor: 'da',
    recorded_by_display: 'District Admin',
  }),
};

const ID_COL: Record<Table, string> = {
  claim_correction_closures: 'closure_id',
  claim_correction_directions: 'direction_id',
  claim_refile_confirmations: 'confirmation_id',
  claim_closure_letters: 'letter_id',
};
const idOf = (table: Table, s: Seeded): string =>
  ({ claim_correction_closures: s.closureId, claim_correction_directions: s.directionId, claim_refile_confirmations: s.confirmationId, claim_closure_letters: s.letterId })[table];
/** A no-op UPDATE through a GRANTED column. */
const TOUCH: Record<Table, string> = {
  claim_correction_closures: 'updated_at = now()',
  claim_correction_directions: 'updated_at = now()',
  claim_refile_confirmations: 'consumed_at = consumed_at',
  claim_closure_letters: 'updated_at = now()',
};

function insertRow(client: Client, table: Table | 'claim_correction_reminders' | 'claim_correction_no_correction_records', v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly column?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

/** A positive insert inside its own savepoint (rolled back) — proves the row is accepted without leaving it. */
async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const UNIQUE = (constraint: string) => ({ code: '23505', constraint });
const FK = (constraint: string) => ({ code: '23503', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

describe.skipIf(!hasDatabase)('the correction closure — migrations 0131–0135 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  for (const table of TABLES) {
    it(`positive + negative: ${table} under scope A shows only A rows, and scope B only B rows`, async () => {
      const { client } = getTx();
      await seedClosure(client, PARIWAR_A);
      await seedClosure(client, PARIWAR_B);
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
      await seedClosure(client, PARIWAR_A);
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
      const s = await seedClosure(client, PARIWAR_A);
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
      const s = await seedClosure(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectPgError(client, () => insertRow(client, table, validRow[table](s, PARIWAR_B)), {
        code: '42501',
        message: expect.stringMatching(/row-level security/),
      });
      expect((await insertRow(client, table, validRow[table](s, PARIWAR_A))).rowCount).toBe(1);
    });

    it(`cross-tenant UPDATE on ${table}: B's row is INVISIBLE under scope A, and ⛔ no row can be moved to B`, async () => {
      const { client } = getTx();
      const a = await seedClosure(client, PARIWAR_A);
      const b = await seedClosure(client, PARIWAR_B);
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
    const s = await seedClosure(client, PARIWAR_A);
    const counts = async () =>
      (
        await client.query(
          `SELECT (SELECT count(*) FROM claim_correction_closures WHERE claim_case_id = ANY($1))::int AS c,
                  (SELECT count(*) FROM claim_correction_directions WHERE claim_case_id = ANY($1))::int AS d,
                  (SELECT count(*) FROM claim_refile_confirmations WHERE closed_claim_case_id = ANY($1))::int AS r,
                  (SELECT count(*) FROM claim_closure_letters WHERE claim_case_id = ANY($1))::int AS l`,
          [[s.claimCaseId, s.closedClaim]],
        )
      ).rows[0];
    expect(await counts()).toEqual({ c: 2, d: 1, r: 1, l: 1 });
    await client.query(`DELETE FROM claims WHERE claim_case_id = ANY($1)`, [[s.claimCaseId, s.closedClaim]]);
    expect(await counts()).toEqual({ c: 0, d: 0, r: 0, l: 0 });
  });

  describe('FKs (23503)', () => {
    const cases: readonly { readonly table: Table; readonly column: string; readonly constraint: string }[] = [
      { table: 'claim_correction_closures', column: 'claim_case_id', constraint: 'claim_correction_closures_claim_case_id_claims_claim_case_id_fk' },
      { table: 'claim_correction_closures', column: 'return_decision_id', constraint: 'claim_correction_closures_return_decision_id_fk' },
      { table: 'claim_correction_directions', column: 'closure_id', constraint: 'claim_correction_directions_closure_id_fk' },
      { table: 'claim_correction_directions', column: 'claim_case_id', constraint: 'claim_correction_directions_claim_case_id_claims_claim_case_id_' }, // ⚠ truncated to 63 bytes
      { table: 'claim_correction_directions', column: 'opened_run_id', constraint: 'claim_correction_directions_opened_run_id_fk' },
      { table: 'claim_refile_confirmations', column: 'closed_claim_case_id', constraint: 'claim_refile_confirmations_closed_claim_case_id_fk' },
      { table: 'claim_refile_confirmations', column: 'closure_id', constraint: 'claim_refile_confirmations_closure_id_fk' },
      { table: 'claim_refile_confirmations', column: 'consumed_by_claim_case_id', constraint: 'claim_refile_confirmations_consumed_by_claim_case_id_fk' },
      { table: 'claim_closure_letters', column: 'closure_id', constraint: 'claim_closure_letters_closure_id_fk' },
      { table: 'claim_closure_letters', column: 'claim_case_id', constraint: 'claim_closure_letters_claim_case_id_claims_claim_case_id_fk' },
    ];
    for (const c of cases) {
      it(`${c.table}.${c.column} is a foreign key`, async () => {
        const { client } = getTx();
        const s = await seedClosure(client, PARIWAR_A);
        const row = c.column === 'opened_run_id' ? { ...validRow[c.table](s), kind: 'restart_family_reminders' } : validRow[c.table](s);
        await expectPgError(client, () => insertRow(client, c.table, { ...row, [c.column]: randomUUID() }), FK(c.constraint));
      });
    }

    it('claim_correction_closures.request_family_run_id / closure_notice_run_id are foreign keys to the runs', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_closures SET closure_notice_run_id = $2 WHERE closure_id = $1`, [s.closedClosureId, randomUUID()]),
        FK('claim_correction_closures_closure_notice_run_id_fk'),
      );
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_closures SET request_family_run_id = $2 WHERE closure_id = $1`, [s.closureId, randomUUID()]),
        FK('claim_correction_closures_request_family_run_id_fk'),
      );
    });
  });

  describe('column-narrowed UPDATE grants (42501)', () => {
    const frozen: Record<Table, readonly string[]> = {
      claim_correction_closures: ['closure_id', 'claim_case_id', 'pariwar_id', 'return_decision_id', 'origin', 'request_family_run_id', 'requested_by_actor', 'requested_by_display', 'request_note_ciphertext', 'requested_at', 'created_at'],
      claim_correction_directions: ['direction_id', 'closure_id', 'claim_case_id', 'directed_to_actor', 'directed_to_role', 'kind', 'text_ciphertext', 'created_by_actor', 'created_by_display', 'created_at'],
      claim_refile_confirmations: ['confirmation_id', 'deceased_member_id', 'closed_claim_case_id', 'closure_id', 'via', 'confirmed_by_actor', 'confirmed_by_display', 'note_ciphertext', 'created_at'],
      claim_closure_letters: ['letter_id', 'closure_id', 'claim_case_id', 'person_key', 'posted_on', 'tracking_number_ciphertext', 'recorded_by_actor', 'recorded_by_display', 'created_at'],
    };
    for (const table of TABLES) {
      it(`⭐ ${table}: its identity columns are ⛔ never rewritten by twt_app; a granted column is`, async () => {
        const { client } = getTx();
        const s = await seedClosure(client, PARIWAR_A);
        await enterAppScope(client, PARIWAR_A);
        for (const col of frozen[table]) {
          await expectPgError(client, () => client.query(`UPDATE ${table} SET ${col} = ${col} WHERE ${ID_COL[table]} = $1`, [idOf(table, s)]), DENIED);
        }
        expect((await client.query(`UPDATE ${table} SET ${TOUCH[table]} WHERE ${ID_COL[table]} = $1`, [idOf(table, s)])).rowCount).toBe(1);
      });
    }
  });

  describe('0131 — the closures row', () => {
    it('⭐ `-273` §3b — ONE live row per RETURN; a `lapsed` row ⛔ blocks a new one; another return is a different row', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const staffCase = { claim_case_id: s.claimCaseId, pariwar_id: PARIWAR_A, return_decision_id: s.decisionId, origin: 'staff_case', state: 'escalated', escalated_at: 'now()' };
      await expectPgError(client, () => insertRow(client, 'claim_correction_closures', { ...staffCase, escalated_at: '2026-11-01T00:00:00Z' }), UNIQUE('claim_correction_closures_one_live_per_return_uq'));
      // The seeded row LAPSES (a requested row only) — first back to `requested`, then lapsed.
      await client.query(
        `UPDATE claim_correction_closures SET state = 'requested', pariwar_decision = NULL, pariwar_decided_by_actor = NULL, pariwar_decided_by_display = NULL,
           pariwar_decision_note_ciphertext = NULL, pariwar_decided_at = NULL, escalated_at = NULL WHERE closure_id = $1`,
        [s.closureId],
      );
      await client.query(`UPDATE claim_correction_closures SET state = 'lapsed', lapsed_at = now() WHERE closure_id = $1`, [s.closureId]);
      expect((await insertRow(client, 'claim_correction_closures', { ...staffCase, escalated_at: '2026-11-01T00:00:00Z' })).rowCount).toBe(1);
    });

    const checks: readonly { readonly title: string; readonly set: string; readonly constraint: string; readonly ok?: string }[] = [
      { title: 'origin is checked', set: `origin = 'other'`, constraint: 'claim_correction_closures_origin_check' },
      { title: 'state is checked', set: `state = 'paused'`, constraint: 'claim_correction_closures_state_check' },
      { title: 'a declined-closure row keeps its request', set: `request_note_ciphertext = NULL`, constraint: 'claim_correction_closures_request_by_origin_check' },
      { title: '`lapsed` ⇔ `lapsed_at`', set: `lapsed_at = now()`, constraint: 'claim_correction_closures_lapsed_pair_check' },
      { title: 'a DECLINE carries its required note', set: `pariwar_decision_note_ciphertext = NULL`, constraint: 'claim_correction_closures_pariwar_decision_check' },
      { title: 'an escalated row carries its escalation date', set: `escalated_at = NULL`, constraint: 'claim_correction_closures_escalation_check' },
      { title: 'a review is all-or-nothing', set: `under_review_since = now()`, constraint: 'claim_correction_closures_review_check' },
      { title: '`under_review` needs `under_review_since`', set: `state = 'under_review'`, constraint: 'claim_correction_closures_under_review_state_check' },
      {
        title: 'a Super Admin decision needs its note and a reason paired with it',
        set: `state = 'refused', super_admin_decision = 'refused', super_admin_reason = 'family_silent_after_reached', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now()`,
        constraint: 'claim_correction_closures_super_admin_decision_check',
        ok: `state = 'refused', super_admin_decision = 'refused', super_admin_reason = 'claim_not_payable', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now()`,
      },
      {
        title: 'the terminal state follows its decision',
        set: `state = 'approved'`,
        constraint: 'claim_correction_closures_terminal_state_check',
      },
      {
        title: 'an approval records its name-check facts',
        set: `state = 'approved', super_admin_decision = 'approved', super_admin_reason = 'other', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now()`,
        constraint: 'claim_correction_closures_approval_facts_check',
        // Code review patch (2026-10-02): the reason stays `'other'` (a VALID `approved` reason, same as the
        // `set` above) — isolating this to the actual fix (the missing `name_check_waived`/`approval_name_check_state`
        // columns), matching every sibling entry's discipline of holding one variable constant between bad/ok.
        ok: `state = 'approved', super_admin_decision = 'approved', super_admin_reason = 'other', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now(), name_check_waived = true, approval_name_check_state = 'does_not_match'`,
      },
      {
        title: 'a closed row carries its closure date and notice outbox',
        set: `state = 'closed', super_admin_decision = 'closed', super_admin_reason = 'family_silent_after_reached', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now()`,
        constraint: 'claim_correction_closures_closed_outbox_check',
        ok: `state = 'closed', super_admin_decision = 'closed', super_admin_reason = 'family_silent_after_reached', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now(), closed_at = now(), closure_notice_due_at = now()`,
      },
    ];
    for (const c of checks) {
      it(`${c.title} (${c.constraint})`, async () => {
        const { client } = getTx();
        const s = await seedClosure(client, PARIWAR_A);
        await expectPgError(client, () => client.query(`UPDATE claim_correction_closures SET ${c.set} WHERE closure_id = $1`, [s.closureId]), CHECK(c.constraint));
        if (c.ok !== undefined) {
          await expectAccepted(client, () => client.query(`UPDATE claim_correction_closures SET ${c.ok} WHERE closure_id = $1`, [s.closureId]));
        }
      });
    }

    it('⭐ code review Decision 9 (2026-10-02) — `claim_correction_closures_approval_facts_check` also accepts `never_checked` and `stale` (the highlight\'s OTHER wording), ⛔ only `does_not_match` was exercised before', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const approved = (approvalState: string) =>
        `state = 'approved', super_admin_decision = 'approved', super_admin_reason = 'name_difference_accepted', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now(), name_check_waived = true, approval_name_check_state = '${approvalState}'`;
      await expectAccepted(client, () => client.query(`UPDATE claim_correction_closures SET ${approved('never_checked')} WHERE closure_id = $1`, [s.closureId]));
      await expectAccepted(client, () => client.query(`UPDATE claim_correction_closures SET ${approved('stale')} WHERE closure_id = $1`, [s.closureId]));
    });

    it('⭐⛔ `-274` 1a — a STAFF-ORIGIN row is NEVER closed (`..._staff_case_never_closed_check`), whatever the reason; its refusal / approval are accepted', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const { rows } = await insertRow(client, 'claim_correction_closures', validRow.claim_correction_closures(s)).then(() =>
        client.query<{ closure_id: string }>(`SELECT closure_id FROM claim_correction_closures WHERE return_decision_id = $1`, [s.spareReturn]),
      );
      const id = rows[0]!.closure_id;
      const decided = (decision: string, reason: string, extra = '') =>
        `state = '${decision}', super_admin_decision = '${decision}', super_admin_reason = '${reason}', super_admin_decided_by_actor = 'sa', super_admin_decided_by_display = 'Super Admin', super_admin_note_ciphertext = 'enc:v1:n', super_admin_decided_at = now()${extra}`;
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_closures SET ${decided('closed', 'family_silent_after_reached', ', closed_at = now(), closure_notice_due_at = now()')} WHERE closure_id = $1`, [id]),
        CHECK('claim_correction_closures_staff_case_never_closed_check'),
      );
      await expectAccepted(client, () => client.query(`UPDATE claim_correction_closures SET ${decided('refused', 'claim_not_payable')} WHERE closure_id = $1`, [id]));
      await expectAccepted(client, () =>
        client.query(`UPDATE claim_correction_closures SET ${decided('approved', 'details_verified', ", name_check_waived = false, approval_name_check_state = 'passing'")} WHERE closure_id = $1`, [id]),
      );
      // ⛔ A staff case carries ⛔ no request and ⛔ no Pariwar Admin decision.
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_closures SET pariwar_decision = 'declined', pariwar_decided_by_actor = 'pa', pariwar_decided_by_display = 'P', pariwar_decision_note_ciphertext = 'x', pariwar_decided_at = now() WHERE closure_id = $1`, [id]),
        CHECK('claim_correction_closures_request_by_origin_check'),
      );
    });
  });

  describe('0132–0134 — directions, re-file confirmations, closure letters', () => {
    it('a direction: role and kind are checked; only a restart opens a run; the response is all-or-nothing', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const base = validRow.claim_correction_directions(s);
      await expectPgError(client, () => insertRow(client, 'claim_correction_directions', { ...base, directed_to_role: 'super_admin' }), CHECK('claim_correction_directions_role_check'));
      await expectPgError(client, () => insertRow(client, 'claim_correction_directions', { ...base, kind: 'close' }), CHECK('claim_correction_directions_kind_check'));
      await expectPgError(client, () => insertRow(client, 'claim_correction_directions', { ...base, kind: 'other', opened_run_id: s.runId }), CHECK('claim_correction_directions_run_by_kind_check'));
      await expectAccepted(client, () => insertRow(client, 'claim_correction_directions', { ...base, opened_run_id: s.runId }));
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_correction_directions SET response_ciphertext = 'x' WHERE direction_id = $1`, [s.directionId]),
        CHECK('claim_correction_directions_response_check'),
      );
      await expectAccepted(client, () =>
        client.query(
          `UPDATE claim_correction_directions SET response_ciphertext = 'x', responded_at = now(), responded_by_actor = 'da', responded_by_display = 'D' WHERE direction_id = $1`,
          [s.directionId],
        ),
      );
    });

    it('⭐ a re-file confirmation: ONE unconsumed per closed claim; a consumed one is a different row; ⛔ consumed by the claim it re-opens', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const open = { ...validRow.claim_refile_confirmations(s), consumed_by_claim_case_id: null, consumed_at: null };
      await expectPgError(client, () => insertRow(client, 'claim_refile_confirmations', open), UNIQUE('claim_refile_confirmations_one_open_per_claim_uq'));
      await expectAccepted(client, () => insertRow(client, 'claim_refile_confirmations', validRow.claim_refile_confirmations(s)));
      await expectPgError(client, () => insertRow(client, 'claim_refile_confirmations', { ...open, via: 'member' }), CHECK('claim_refile_confirmations_via_check'));
      await expectPgError(
        client,
        () => insertRow(client, 'claim_refile_confirmations', { ...validRow.claim_refile_confirmations(s), consumed_at: null }),
        CHECK('claim_refile_confirmations_consumed_pair_check'),
      );
      await expectPgError(
        client,
        () => insertRow(client, 'claim_refile_confirmations', { ...validRow.claim_refile_confirmations(s), consumed_by_claim_case_id: s.closedClaim }),
        CHECK('claim_refile_confirmations_consumed_by_new_claim_check'),
      );
    });

    it('⭐ `-274` 2 — ONE closure letter per person per closure; the delivery is all-or-nothing and ⛔ before the posting', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const row = validRow.claim_closure_letters(s);
      await expectPgError(client, () => insertRow(client, 'claim_closure_letters', { ...row, person_key: 'nominee:v1' }), UNIQUE('claim_closure_letters_person_uq'));
      await expectAccepted(client, () => insertRow(client, 'claim_closure_letters', row));
      await expectPgError(
        client,
        () => client.query(`UPDATE claim_closure_letters SET delivered_on = '2026-11-10' WHERE letter_id = $1`, [s.letterId]),
        CHECK('claim_closure_letters_delivery_all_or_nothing_check'),
      );
      const deliver = (on: string) =>
        client.query(
          `UPDATE claim_closure_letters SET delivered_on = $2, screenshot_storage_key = 'k', screenshot_content_type = 'image/png', screenshot_size_bytes = 1,
             delivery_recorded_by_actor = 'da', delivery_recorded_by_display = 'D', delivery_recorded_at = now() WHERE letter_id = $1`,
          [s.letterId, on],
        );
      await expectPgError(client, () => deliver('2026-11-01'), CHECK('claim_closure_letters_delivered_after_posted_check'));
      await expectAccepted(client, () => deliver('2026-11-10'));
    });
  });

  describe('0135 — the 6.19c reminder purposes', () => {
    it('⭐ LOCKSTEP — the purpose CHECK names EXACTLY `CORRECTION_REMINDER_PURPOSES` (⛔ one more, ⛔ one fewer)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_correction_reminders_purpose_check'`,
      );
      expect(rows).toHaveLength(1);
      const inDb = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
      expect(inDb).toEqual([...CORRECTION_REMINDER_PURPOSES].sort());
    });

    const reminder = (s: Seeded, over: Record<string, unknown>) => ({
      run_id: s.runId,
      claim_case_id: s.claimCaseId,
      pariwar_id: PARIWAR_A,
      slot_day: 92,
      sent_on: '2026-11-01',
      recipient_key: 'staff:u1',
      outcome: 'recorded',
      ...over,
    });

    it('⭐ a 6.19c staff reminder: ONE per (claim, recipient, subject, purpose, day) across runs; another purpose or subject the same day is a different row', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      await insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'closure_due' }));
      await expectPgError(
        client,
        () => insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'closure_due', run_id: s.closedRun, slot_day: 93 })),
        UNIQUE('claim_correction_reminders_closure_day_uq'),
      );
      await expectAccepted(client, () => insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'closure_escalation' })));
      // Two directions to ONE admin on ONE day (`-273` §6) — distinct subjects.
      await insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'direction_reminder', subject_key: 'direction:a' }));
      await expectAccepted(client, () =>
        insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'direction_reminder', subject_key: 'direction:b', slot_day: 94 })),
      );
    });

    it('⭐ `-273` §5 — the closure notice ONCE per closure per recipient, ⛔ per day', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      const notice = (over: Record<string, unknown>) =>
        reminder(s, { purpose: 'closure_notice', recipient_key: 'nominee:v1', outcome: 'accepted', ...over });
      await insertRow(client, 'claim_correction_reminders', notice({}));
      await expectPgError(
        client,
        () => insertRow(client, 'claim_correction_reminders', notice({ sent_on: '2026-11-02', slot_day: 93 })),
        UNIQUE('claim_correction_reminders_closure_notice_uq'),
      );
      await expectAccepted(client, () => insertRow(client, 'claim_correction_reminders', notice({ recipient_key: 'claimant' })));
    });

    it('a purpose outside the vocabulary is refused (the positive counterparts above are each NEW value)', async () => {
      const { client } = getTx();
      const s = await seedClosure(client, PARIWAR_A);
      await expectPgError(
        client,
        () => insertRow(client, 'claim_correction_reminders', reminder(s, { purpose: 'closure_reminder' })),
        CHECK('claim_correction_reminders_purpose_check'),
      );
      for (const purpose of ['staff_case_escalation', 'review_reminder', 'closure_letter_chase', 'closure_letter_escalation']) {
        await expectAccepted(client, () => insertRow(client, 'claim_correction_reminders', reminder(s, { purpose, subject_key: purpose })));
      }
    });
  });
});

// ── claim_correction_no_correction_records — migration 0136 + RLS policy regression (code review Decision 8,
// 2026-10-02). ⚠ NOT folded into the generic `TABLES` loop above: this table's grant is SELECT + INSERT ONLY (⛔ no
// UPDATE at all, unlike its four siblings, per 0136's own "append-only, as the marks" note), so the loop's
// UPDATE-command assumptions (TOUCH, the UPDATE-policy's qual=with_check check) don't apply. A dedicated, smaller
// block instead, asserting the SAME family-5 invariants by NAME: RLS + FORCE, per-command policies, cross-tenant
// SELECT/INSERT, the one CHECK (`claim_correction_no_correction_records_recorded_by_check`), the `mark_id` UNIQUE
// (`claim_correction_no_correction_records_mark_uq`), ⛔ no DELETE, ⛔ no UPDATE (not merely RLS-denied — ungranted).
describe.skipIf(!hasDatabase)('claim_correction_no_correction_records — migration 0136 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  /** As the superuser: a claim, its return, a `staff` mark consumed by one record, and a SPARE unused mark. */
  async function seedRecord(client: Client, pariwarId: string) {
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
      `INSERT INTO claim_correction_marks (mark_id, claim_case_id, pariwar_id, return_decision_id, must_act, set_by_actor, set_by_actor_display, set_by_role, note_ciphertext)
       VALUES ($1, $2, $3, $4, 'staff', 'da', 'District Admin', 'district_admin', 'enc:v1:mark')`,
      [markId, claimCaseId, pariwarId, decisionId],
    );
    const recordId = randomUUID();
    await client.query(
      `INSERT INTO claim_correction_no_correction_records (record_id, claim_case_id, pariwar_id, return_decision_id, mark_id, note_ciphertext, recorded_by_actor, recorded_by_display)
       VALUES ($1, $2, $3, $4, $5, 'enc:v1:n', 'da', 'District Admin')`,
      [recordId, claimCaseId, pariwarId, decisionId, markId],
    );
    // A SPARE, unused mark on the SAME claim/return — the free slot a test's own record lands on (mirrors
    // `seedClosure`'s spare return above).
    const spareMarkId = randomUUID();
    await client.query(
      `INSERT INTO claim_correction_marks (mark_id, claim_case_id, pariwar_id, return_decision_id, must_act, set_by_actor, set_by_actor_display, set_by_role, note_ciphertext)
       VALUES ($1, $2, $3, $4, 'staff', 'da', 'District Admin', 'district_admin', 'enc:v1:mark')`,
      [spareMarkId, claimCaseId, pariwarId, decisionId],
    );
    return { claimCaseId, decisionId, markId, recordId, spareMarkId };
  }

  type SeededRecord = Awaited<ReturnType<typeof seedRecord>>;
  const TABLE = 'claim_correction_no_correction_records';
  const validRow = (s: SeededRecord, pariwarId = PARIWAR_A) => ({
    record_id: randomUUID(),
    claim_case_id: s.claimCaseId,
    pariwar_id: pariwarId,
    return_decision_id: s.decisionId,
    mark_id: s.spareMarkId,
    note_ciphertext: 'enc:v1:n2',
    recorded_by_actor: 'da2',
    recorded_by_display: 'District Admin Two',
  });

  it('positive + negative: scope A shows only A rows, and scope B only B rows', async () => {
    const { client } = getTx();
    await seedRecord(client, PARIWAR_A);
    await seedRecord(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    await seedRecord(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity are both on', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
  });

  it('the policies are per-command, SELECT + INSERT ONLY — ⛔ no FOR ALL, ⛔ no UPDATE policy, ⛔ no DELETE policy', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string }>(
      `SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`,
      [TABLE],
    );
    expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT']);
  });

  it('⛔ no DELETE for twt_app', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE record_id = $1`, [s.recordId]), DENIED);
  });

  it('⛔ no UPDATE for twt_app — ungranted, ⛔ not merely RLS-denied (true append-only)', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET note_ciphertext = note_ciphertext WHERE record_id = $1`, [s.recordId]), DENIED);
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501)', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, TABLE, validRow(s, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, TABLE, validRow(s, PARIWAR_A))).rowCount).toBe(1);
  });

  it(`the one CHECK — ${'claim_correction_no_correction_records_recorded_by_check'}: a blank actor or display is refused; both non-blank is accepted`, async () => {
    const { client } = getTx();
    const s = await seedRecord(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(
      client,
      () => insertRow(client, TABLE, { ...validRow(s), recorded_by_actor: '  ' }),
      CHECK('claim_correction_no_correction_records_recorded_by_check'),
    );
    await expectPgError(
      client,
      () => insertRow(client, TABLE, { ...validRow(s), recorded_by_display: '' }),
      CHECK('claim_correction_no_correction_records_recorded_by_check'),
    );
    await expectAccepted(client, () => insertRow(client, TABLE, validRow(s)));
  });

  it('ONE record per mark — `claim_correction_no_correction_records_mark_uq`: a second record on the SAME mark is refused', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    // The seed's own `markId` already carries a record (`s.recordId`) — a second one on it is the UNIQUE violation.
    await expectPgError(
      client,
      () => insertRow(client, TABLE, { ...validRow(s), mark_id: s.markId }),
      UNIQUE('claim_correction_no_correction_records_mark_uq'),
    );
    // The SPARE mark (`s.spareMarkId`) carries ⛔ no record yet — a fresh one on it is accepted.
    await expectAccepted(client, () => insertRow(client, TABLE, validRow(s)));
  });

  // Code review (2026-10-03, second pass): the title said "the only deletion is the cascade from claims" — the DDL
  // also cascades from the record's RETURN and its MARK. All three are asserted; twt_app still deletes ⛔ nothing.
  it('the only deletions are the ON DELETE cascades — from the claim, from its return, from its mark', async () => {
    const { client } = getTx();
    const count = async (claimCaseId: string) =>
      (await client.query(`SELECT count(*)::int AS n FROM ${TABLE} WHERE claim_case_id = $1`, [claimCaseId])).rows[0]!.n as number;
    const byClaim = await seedRecord(client, PARIWAR_A);
    expect(await count(byClaim.claimCaseId)).toBe(1);
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [byClaim.claimCaseId]);
    expect(await count(byClaim.claimCaseId)).toBe(0);
    const byMark = await seedRecord(client, PARIWAR_A);
    await client.query(`DELETE FROM claim_correction_marks WHERE mark_id = $1`, [byMark.markId]);
    expect(await count(byMark.claimCaseId)).toBe(0);
    const byReturn = await seedRecord(client, PARIWAR_A);
    await client.query(`DELETE FROM claim_state_trustee_decisions WHERE decision_id = $1`, [byReturn.decisionId]);
    expect(await count(byReturn.claimCaseId)).toBe(0);
  });

  describe('FKs (23503) — code review (2026-10-03, second pass)', () => {
    for (const [column, constraint] of [
      ['claim_case_id', 'claim_correction_no_correction_records_claim_case_id_fk'],
      ['return_decision_id', 'claim_correction_no_correction_records_return_decision_id_fk'],
      ['mark_id', 'claim_correction_no_correction_records_mark_id_fk'],
    ] as const) {
      it(`${TABLE}.${column} is a foreign key`, async () => {
        const { client } = getTx();
        const s = await seedRecord(client, PARIWAR_A);
        await expectPgError(client, () => insertRow(client, TABLE, { ...validRow(s), [column]: randomUUID() }), FK(constraint));
      });
    }
  });

  it('the tenant-scoped indexes exist — `..._pariwar_claim_idx` (pariwar_id, claim_case_id) and `..._return_idx`', async () => {
    const { client } = getTx();
    const idx = (
      await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`, [TABLE])
    ).rows;
    const def = (name: string) => idx.find((i) => i.indexname === name)?.indexdef ?? '';
    expect(def('claim_correction_no_correction_records_pariwar_claim_idx')).toMatch(/\(pariwar_id, claim_case_id\)/);
    expect(def('claim_correction_no_correction_records_return_idx')).toMatch(/\(return_decision_id, recorded_at\)/);
  });
});

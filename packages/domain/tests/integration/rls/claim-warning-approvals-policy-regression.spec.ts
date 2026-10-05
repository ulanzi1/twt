// claim_warning_approvals — migration 0143 + RLS policy regression (Story 6.23a, Task 1; NW13; AC8). Positive / negative
// RLS, the fail-closed probe, FORCE, per-command policies, cross-tenant WITH CHECK, ⛔ no DELETE for `twt_app` — PLUS this
// table's own shape: the composite reason FK (⛔ another Pariwar's reason), a cascade from `claims` passing through BOTH
// FKs, IN SCOPE the note's UPDATE succeeds (the per-command UPDATE policy — `-279` A12), ⛔ an UPDATE of any other column
// (the jsonb compare — Trap 17(b)), the step ⇔ note, step ⇔ decision, generic ⇔ NULL `reason_id` and `cardinality >= 1`
// CHECKs, the TRUNCATE trigger binding (Trap 17(c)) and the DB ↔ TS `step` lockstep. Live DB; per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CLAIM_WARNING_APPROVAL_STEPS } from '../../../src/schema/claim_warning_approvals.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** As the superuser: a claim, its live approved verifier decision, one stored reason and one approval record. */
async function seedRecord(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const deceasedMemberId = randomUUID();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'verifier_approved', deceasedMemberId });
  const decisionId = randomUUID();
  await client.query(
    `INSERT INTO claim_verifier_decisions (decision_id, claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
     VALUES ($1, $2, $3, 'approved', 'r5_d_natural_death', 'enc:v1:why', 'da', 'District Admin')`,
    [decisionId, claimCaseId, pariwarId],
  );
  const reasonId = randomUUID();
  const reasonCode = `awr_${randomUUID().slice(0, 8)}`;
  await client.query(
    `INSERT INTO approval_warning_reasons (reason_id, pariwar_id, code, label_en, when_to_use, created_by_actor, created_by_display)
     VALUES ($1, $2, $3, 'A reason', 'When to use it', 'sa', 'Super Admin')`,
    [reasonId, pariwarId, reasonCode],
  );
  const recordId = await insertRecord(client, { pariwarId, claimCaseId, deceasedMemberId, decisionId, reasonId, reasonCode });
  return { claimCaseId, deceasedMemberId, decisionId, reasonId, reasonCode, recordId };
}

type Seeded = Awaited<ReturnType<typeof seedRecord>>;

async function insertRecord(
  client: Client,
  v: {
    pariwarId: string;
    claimCaseId: string;
    deceasedMemberId: string;
    decisionId: string | null;
    reasonId: string | null;
    reasonCode: string;
    step?: string;
    note?: string | null;
    keys?: string[];
  },
): Promise<string> {
  const recordId = randomUUID();
  await client.query(
    `INSERT INTO claim_warning_approvals (record_id, pariwar_id, claim_case_id, deceased_member_id, step, verifier_decision_id,
       reason_code, reason_id, covered_keys, note_ciphertext, recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'da', 'District Admin')`,
    [
      recordId,
      v.pariwarId,
      v.claimCaseId,
      v.deceasedMemberId,
      v.step ?? 'district_admin_approval',
      v.decisionId,
      v.reasonCode,
      v.reasonId,
      v.keys ?? [`post_death_version:${randomUUID()}`],
      v.note === undefined ? null : v.note,
    ],
  );
  return recordId;
}

const base = (s: Seeded, pariwarId: string) => ({
  pariwarId,
  claimCaseId: s.claimCaseId,
  deceasedMemberId: s.deceasedMemberId,
  decisionId: s.decisionId,
  reasonId: s.reasonId,
  reasonCode: s.reasonCode,
});

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const APPEND_ONLY = { code: '23000' };

describe.skipIf(!hasDatabase)('claim_warning_approvals — migration 0143 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: scope A shows only A rows, scope B only B rows', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const sa = await seedRecord(client, a);
    const sb = await seedRecord(client, b);
    await enterAppScope(client, a);
    const ra = await client.query<{ record_id: string }>('SELECT record_id FROM claim_warning_approvals WHERE record_id = ANY($1)', [[sa.recordId, sb.recordId]]);
    expect(ra.rows.map((r) => r.record_id)).toEqual([sa.recordId]);
    await enterAppScope(client, b);
    const rb = await client.query<{ record_id: string }>('SELECT record_id FROM claim_warning_approvals WHERE record_id = ANY($1)', [[sa.recordId, sb.recordId]]);
    expect(rb.rows.map((r) => r.record_id)).toEqual([sb.recordId]);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, randomUUID());
    await enterAppRoleNoScope(client);
    expect((await client.query('SELECT 1 FROM claim_warning_approvals WHERE record_id = $1', [s.recordId])).rows).toHaveLength(0);
  });

  it('FORCE RLS + per-command policies (SELECT / INSERT / UPDATE — ⛔ no DELETE, ⛔ no FOR ALL)', async () => {
    const { client } = getTx();
    const cls = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_warning_approvals'`);
    expect(cls.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query<{ cmd: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, qual, with_check FROM pg_policies WHERE tablename = 'claim_warning_approvals'`,
    );
    expect(pol.rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const upd = pol.rows.find((r) => r.cmd === 'UPDATE')!;
    expect(upd.with_check).toBe(upd.qual);
  });

  it('cross-tenant INSERT is refused by WITH CHECK; an in-scope INSERT passes', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    await enterAppScope(client, a);
    await expectPgError(client, () => insertRecord(client, base(s, randomUUID())), { code: '42501', message: expect.stringMatching(/row-level security/) });
    await insertRecord(client, base(s, a));
  });

  it('the composite FK refuses ANOTHER Pariwar\'s reason (23503)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const sa = await seedRecord(client, a);
    const sb = await seedRecord(client, b);
    await expectPgError(client, () => insertRecord(client, { ...base(sa, a), reasonId: sb.reasonId, reasonCode: sb.reasonCode }), {
      code: '23503',
      constraint: 'claim_warning_approvals_reason_fk',
    });
  });

  // Code review 2026-10-05 (re-review) — the headline fix of that pass (claim_case_id / verifier_decision_id
  // made COMPOSITE FKs, mirroring reason_fk, so a row can ⛔ never point at another Pariwar's claim or
  // decision) had no test of its own; these two mirror the reason_fk test above exactly.
  it('the composite FK refuses ANOTHER Pariwar\'s claim (23503)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const sa = await seedRecord(client, a);
    const sb = await seedRecord(client, b);
    await expectPgError(client, () => insertRecord(client, { ...base(sa, a), claimCaseId: sb.claimCaseId }), {
      code: '23503',
      constraint: 'claim_warning_approvals_claim_case_fk',
    });
  });

  it('the composite FK refuses ANOTHER Pariwar\'s verifier decision (23503)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const sa = await seedRecord(client, a);
    const sb = await seedRecord(client, b);
    await expectPgError(client, () => insertRecord(client, { ...base(sa, a), decisionId: sb.decisionId }), {
      code: '23503',
      constraint: 'claim_warning_approvals_verifier_decision_fk',
    });
  });

  it('⛔ no direct DELETE — for twt_app (grant) and for ANY role (trigger)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    await expectPgError(client, () => client.query('DELETE FROM claim_warning_approvals WHERE record_id = $1', [s.recordId]), APPEND_ONLY);
    await enterAppScope(client, a);
    await expectPgError(client, () => client.query('DELETE FROM claim_warning_approvals WHERE record_id = $1', [s.recordId]), DENIED);
  });

  it('a cascade from `claims` still passes — through both the claim and the decision FK (Trap 17(a))', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, randomUUID());
    await client.query('DELETE FROM claims WHERE claim_case_id = $1', [s.claimCaseId]);
    expect((await client.query('SELECT 1 FROM claim_warning_approvals WHERE record_id = $1', [s.recordId])).rows).toHaveLength(0);
    // The decision FK alone: a record whose decision row is deleted inside a cascade from ANOTHER claim's delete is
    // unreachable by construction — so prove the FK's action directly.
    const { rows } = await client.query<{ confdeltype: string }>(
      `SELECT confdeltype FROM pg_constraint WHERE conname = 'claim_warning_approvals_verifier_decision_fk'`,
    );
    expect(rows[0]!.confdeltype).toBe('c');
  });

  it('⭐ IN SCOPE the note\'s RTBF UPDATE succeeds (1 row — the UPDATE policy exists); every other column is refused', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    const lateId = await insertRecord(client, { ...base(s, a), step: 'district_admin_late_reason', note: 'enc:v1:late-note' });
    await enterAppScope(client, a);
    const res = await client.query(`UPDATE claim_warning_approvals SET note_ciphertext = '[erased]' WHERE record_id = $1`, [lateId]);
    expect(res.rowCount).toBe(1);
    for (const col of ['reason_code', 'covered_keys', 'step', 'recorded_by_display', 'pariwar_id']) {
      await expectPgError(client, () => client.query(`UPDATE claim_warning_approvals SET ${col} = ${col} WHERE record_id = $1`, [lateId]), DENIED);
    }
  });

  it('⛔ an UPDATE of any column but the note — for EVERY role (the jsonb compare)', async () => {
    const { client } = getTx();
    const s = await seedRecord(client, randomUUID());
    await expectPgError(client, () => client.query(`UPDATE claim_warning_approvals SET covered_keys = '{x}' WHERE record_id = $1`, [s.recordId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`UPDATE claim_warning_approvals SET recorded_by_display = 'other' WHERE record_id = $1`, [s.recordId]), APPEND_ONLY);
  });

  it('the CHECKs: step, step ⇔ note, step ⇔ decision, generic ⇔ NULL reason_id, ≥ 1 key', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    const b = base(s, a);
    await expectPgError(client, () => insertRecord(client, { ...b, step: 'r9_vote', decisionId: null }), CHECK('claim_warning_approvals_step_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, note: 'enc:v1:x' }), CHECK('claim_warning_approvals_step_note_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, step: 'district_admin_late_reason', note: null }), CHECK('claim_warning_approvals_step_note_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, decisionId: null }), CHECK('claim_warning_approvals_step_decision_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, reasonId: null }), CHECK('claim_warning_approvals_generic_reason_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, reasonCode: 'warnings_reviewed' }), CHECK('claim_warning_approvals_generic_reason_check'));
    await expectPgError(client, () => insertRecord(client, { ...b, keys: [] }), CHECK('claim_warning_approvals_covered_keys_check'));
    // The generic: a NULL reason_id with its code.
    await insertRecord(client, { ...b, reasonId: null, reasonCode: 'warnings_reviewed' });
  });

  it('DB ↔ TS lockstep: the `step` values', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_warning_approvals_step_check'`,
    );
    const values = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
    expect(values).toEqual([...CLAIM_WARNING_APPROVAL_STEPS].sort());
  });

  it('⛔ TRUNCATE — the trigger binding, and the function refuses on a temp twin (Trap 17(c))', async () => {
    const { client } = getTx();
    const { rows } = await client.query(
      `SELECT t.tgenabled, t.tgtype, p.proname AS fn FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'claim_warning_approvals'::regclass AND t.tgname = 'claim_warning_approvals_no_truncate'`,
    );
    expect(rows).toEqual([{ tgenabled: 'O', tgtype: 34, fn: 'claim_warning_approvals_reject_mutation' }]);
    await client.query('CREATE TEMP TABLE cwa_truncate_twin (id int) ON COMMIT DROP');
    await client.query('TRUNCATE cwa_truncate_twin');
    await client.query(
      'CREATE TRIGGER cwa_truncate_twin_no_truncate BEFORE TRUNCATE ON cwa_truncate_twin EXECUTE FUNCTION claim_warning_approvals_reject_mutation()',
    );
    await expect(client.query('TRUNCATE cwa_truncate_twin')).rejects.toMatchObject(APPEND_ONLY);
  });
});

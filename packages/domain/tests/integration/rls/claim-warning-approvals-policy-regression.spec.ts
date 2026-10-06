// claim_warning_approvals — migration 0143 + RLS policy regression (Story 6.23a, Task 1; NW13; AC8). Positive / negative
// RLS, the fail-closed probe, FORCE, per-command policies, cross-tenant WITH CHECK, ⛔ no DELETE for `twt_app` — PLUS this
// table's own shape: the composite reason FK (⛔ another Pariwar's reason), a cascade from `claims` passing through BOTH
// FKs, IN SCOPE the note's UPDATE succeeds (the per-command UPDATE policy — `-279` A12), ⛔ an UPDATE of any other column
// (the jsonb compare — Trap 17(b)), the step ⇔ note, step ⇔ decision, generic ⇔ NULL `reason_id` and `cardinality >= 1`
// CHECKs, the TRUNCATE trigger binding (Trap 17(c)) and the DB ↔ TS `step` lockstep. Live DB; per-test ROLLBACK.
// Story 6.23b (migration 0144; EA1, Trap 10, RD1; AC1): the five LATER steps, each accepting EXACTLY its own FK set, the
// three COMPOSITE FKs (⛔ another Pariwar's trustee decision / R9 vote / closure), the new columns append-only, the cascade
// from `claims` through them, and ⛔ no DEFERRABLE constraint (RD14).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CLAIM_WARNING_APPROVAL_STEPS } from '../../../src/schema/claim_warning_approvals.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, seedClaim, seedClauseVersion } from '../_helpers.js';

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
    trusteeDecisionId?: string | null;
    r9VoteId?: string | null;
    closureId?: string | null;
  },
): Promise<string> {
  const recordId = randomUUID();
  await client.query(
    `INSERT INTO claim_warning_approvals (record_id, pariwar_id, claim_case_id, deceased_member_id, step, verifier_decision_id,
       reason_code, reason_id, covered_keys, note_ciphertext, recorded_by_actor, recorded_by_display,
       trustee_decision_id, r9_vote_id, closure_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'da', 'District Admin', $11, $12, $13)`,
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
      v.trusteeDecisionId ?? null,
      v.r9VoteId ?? null,
      v.closureId ?? null,
    ],
  );
  return recordId;
}

/**
 * As the superuser: one parent row for each of 0144's three new FKs, on `claimCaseId` — a trustee decision, an R9
 * session + vote (and its clause version), and a correction closure (on its own return + family run).
 */
async function seedLaterParents(client: Client, pariwarId: string, claimCaseId: string) {
  const { tx } = getTx();
  const trusteeDecisionId = randomUUID();
  await client.query(
    `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
     VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin')`,
    [trusteeDecisionId, claimCaseId, pariwarId],
  );
  const clauseVersionId = await seedClauseVersion(tx, pariwarId, { clauseId: 'niy.special-death.r9' });
  const sessionId = randomUUID();
  await client.query(
    `INSERT INTO claim_r9_voting_sessions (session_id, claim_case_id, pariwar_id, clause_id, clause_version_id, rule_code, voting_requirement,
       panel_actor_ids, quorum_required, opened_by_actor, opened_display)
     VALUES ($1, $2, $3, 'niy.special-death.r9', $4, 'R9', 'majority', ARRAY['v1'], 1, 'pa', 'Pariwar Admin')`,
    [sessionId, claimCaseId, pariwarId, clauseVersionId],
  );
  const r9VoteId = randomUUID();
  await client.query(
    `INSERT INTO claim_r9_votes (vote_id, session_id, claim_case_id, pariwar_id, voter_actor_id, voter_display, vote, rationale_ciphertext, clause_version_id)
     VALUES ($1, $2, $3, $4, 'v1', 'Voter', 'approve', 'enc:v1:why', $5)`,
    [r9VoteId, sessionId, claimCaseId, pariwarId, clauseVersionId],
  );
  const runId = randomUUID();
  // Code review 2026-10-06 (Trap 16): relative to `now()`, as the sibling spec files do — a hardcoded past date
  // bit-rots the moment "today" catches up to it. The 90-day gap between `day0` and `ended_at` is preserved.
  await client.query(
    `INSERT INTO claim_correction_runs (run_id, claim_case_id, pariwar_id, return_decision_id, kind, anchor_id, day0, ended_at, end_reason)
     VALUES ($1, $2, $3, $4, 'family', $5, (now() - interval '95 days')::date, now() - interval '5 days', 'day_90')`,
    [runId, claimCaseId, pariwarId, trusteeDecisionId, randomUUID()],
  );
  const closureId = randomUUID();
  await client.query(
    `INSERT INTO claim_correction_closures (closure_id, claim_case_id, pariwar_id, return_decision_id, origin, state, request_family_run_id,
       requested_by_actor, requested_by_display, request_note_ciphertext, requested_at, pariwar_decision, pariwar_decided_by_actor,
       pariwar_decided_by_display, pariwar_decision_note_ciphertext, pariwar_decided_at, escalated_at)
     VALUES ($1, $2, $3, $4, 'declined_closure', 'escalated', $5, 'da', 'District Admin', 'enc:v1:r', now(), 'declined', 'pa',
       'Pariwar Admin', 'enc:v1:d', now(), now())`,
    [closureId, claimCaseId, pariwarId, trusteeDecisionId, runId],
  );
  return { trusteeDecisionId, r9VoteId, closureId };
}

type LaterParents = Awaited<ReturnType<typeof seedLaterParents>>;

/** 0144's coherence CHECK — EXACTLY each step's own FK set (EA1; `-279` A10 for `super_admin_approval`). */
const STEP_FK_SET: Record<string, readonly ('trusteeDecisionId' | 'r9VoteId' | 'closureId')[]> = {
  district_admin_approval: [],
  district_admin_late_reason: [],
  escalation_resolution: ['trusteeDecisionId'],
  final_vote: ['trusteeDecisionId'],
  no_correction_approval: ['trusteeDecisionId'],
  r9_vote: ['r9VoteId'],
  super_admin_approval: ['closureId', 'trusteeDecisionId'],
};

/** A later step's row (⛔ no verifier decision, ⛔ no note) carrying exactly `fks` of the parents. */
const laterRow = (s: Seeded, pariwarId: string, step: string, p: LaterParents, fks: readonly string[]) => ({
  ...base(s, pariwarId),
  step,
  decisionId: step.startsWith('district_admin_') ? s.decisionId : null,
  note: step === 'district_admin_late_reason' ? 'enc:v1:late' : null,
  trusteeDecisionId: fks.includes('trusteeDecisionId') ? p.trusteeDecisionId : null,
  r9VoteId: fks.includes('r9VoteId') ? p.r9VoteId : null,
  closureId: fks.includes('closureId') ? p.closureId : null,
});

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
    // 6.23b RD21(a): `r9_vote` is a VALID step since 0144 (its FK set is proved below) — a still-invalid value here.
    await expectPgError(client, () => insertRecord(client, { ...b, step: 'not_a_step', decisionId: null }), CHECK('claim_warning_approvals_step_check'));
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
    const values = [...rows[0]!.def.matchAll(/'([a-z0-9_]+)'::text/g)].map((m) => m[1]!).sort();
    expect(values).toEqual([...CLAIM_WARNING_APPROVAL_STEPS].sort());
  });

  it('⭐ 0144 (6.23b): each step accepts EXACTLY its own FK set and refuses every other combination', async () => {
    const { client } = getTx();
    const ALL = ['trusteeDecisionId', 'r9VoteId', 'closureId'] as const;
    const combos = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => ALL.filter((_, i) => m & (1 << i)));
    expect(Object.keys(STEP_FK_SET).sort()).toEqual([...CLAIM_WARNING_APPROVAL_STEPS].sort());
    for (const [step, own] of Object.entries(STEP_FK_SET)) {
      // Migration 0145 (code review 2026-10-06): one record per approval EVENT — a fresh PARIWAR + CLAIM (and so a
      // fresh set of parents) per step, so two different steps' single successful insert below never share a
      // trustee_decision_id / r9_vote_id / closure_id (a second `correction_return`-phase trustee decision on the
      // SAME claim would itself collide with the pre-existing one-live-per-phase uniqueness, and `seedLaterParents`'
      // clause-version seed is pariwar-scoped, so re-running it for the SAME pariwar collides too).
      const a = randomUUID();
      const s = await seedRecord(client, a);
      const p = await seedLaterParents(client, a, s.claimCaseId);
      for (const fks of combos) {
        const exact = fks.length === own.length && own.every((f) => fks.includes(f));
        if (exact) {
          await insertRecord(client, laterRow(s, a, step, p, fks));
        } else {
          await expectPgError(client, () => insertRecord(client, laterRow(s, a, step, p, fks)), CHECK('claim_warning_approvals_later_step_fk_check'));
        }
      }
    }
  });

  it('⭐ 0144: a later step carries ⛔ no verifier decision and ⛔ no note (0143\'s CHECKs hold unchanged)', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    const p = await seedLaterParents(client, a, s.claimCaseId);
    const row = laterRow(s, a, 'final_vote', p, ['trusteeDecisionId']);
    await expectPgError(client, () => insertRecord(client, { ...row, decisionId: s.decisionId }), CHECK('claim_warning_approvals_step_decision_check'));
    await expectPgError(client, () => insertRecord(client, { ...row, note: 'enc:v1:x' }), CHECK('claim_warning_approvals_step_note_check'));
  });

  it('⭐ 0144: the COMPOSITE FKs refuse ANOTHER Pariwar\'s trustee decision, R9 vote and closure (23503)', async () => {
    const { client } = getTx();
    const [a, b] = [randomUUID(), randomUUID()];
    const sa = await seedRecord(client, a);
    const pa = await seedLaterParents(client, a, sa.claimCaseId);
    const sb = await seedRecord(client, b);
    const pb = await seedLaterParents(client, b, sb.claimCaseId);
    await expectPgError(client, () => insertRecord(client, { ...laterRow(sa, a, 'final_vote', pa, ['trusteeDecisionId']), trusteeDecisionId: pb.trusteeDecisionId }), {
      code: '23503',
      constraint: 'claim_warning_approvals_trustee_decision_fk',
    });
    await expectPgError(client, () => insertRecord(client, { ...laterRow(sa, a, 'r9_vote', pa, ['r9VoteId']), r9VoteId: pb.r9VoteId }), {
      code: '23503',
      constraint: 'claim_warning_approvals_r9_vote_fk',
    });
    await expectPgError(
      client,
      () => insertRecord(client, { ...laterRow(sa, a, 'super_admin_approval', pa, ['closureId', 'trusteeDecisionId']), closureId: pb.closureId }),
      { code: '23503', constraint: 'claim_warning_approvals_closure_fk' },
    );
  });

  it('⭐ 0144: the new columns are append-only too (the jsonb compare — ⛔ no trigger edit) and ⛔ not granted for UPDATE', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    const p = await seedLaterParents(client, a, s.claimCaseId);
    const id = await insertRecord(client, laterRow(s, a, 'final_vote', p, ['trusteeDecisionId']));
    const otherDecision = randomUUID();
    await client.query(
      `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display, superseded_at)
       VALUES ($1, $2, $3, 'correction_return', 'returned_for_correction', 'other', 'trustee', 'Pariwar Admin', now())`,
      [otherDecision, s.claimCaseId, a],
    );
    await expectPgError(
      client,
      () => client.query('UPDATE claim_warning_approvals SET trustee_decision_id = $2 WHERE record_id = $1', [id, otherDecision]),
      APPEND_ONLY,
    );
    await enterAppScope(client, a);
    for (const col of ['trustee_decision_id', 'r9_vote_id', 'closure_id']) {
      await expectPgError(client, () => client.query(`UPDATE claim_warning_approvals SET ${col} = ${col} WHERE record_id = $1`, [id]), DENIED);
    }
  });

  it('⭐ 0144: a cascade from `claims` still deletes later rows; each new FK is ON DELETE CASCADE with an index', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const s = await seedRecord(client, a);
    const p = await seedLaterParents(client, a, s.claimCaseId);
    // Migration 0145 (code review 2026-10-06): `final_vote` and `super_admin_approval` each need their OWN
    // trustee_decision_id — one record per approval event. A second `correction_return`-phase decision on the SAME
    // claim would collide with the pre-existing one-live-per-phase uniqueness, so this one uses a different phase
    // (`escalation_resolution` — the real-life phase `super_admin_approval`'s own writer, `decideEscalatedClosure`, uses).
    const trusteeDecisionId2 = randomUUID();
    await client.query(
      `INSERT INTO claim_state_trustee_decisions (decision_id, claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, $3, 'escalation_resolution', 'approved', 'other', 'trustee', 'Pariwar Admin')`,
      [trusteeDecisionId2, s.claimCaseId, a],
    );
    const ids = [
      await insertRecord(client, laterRow(s, a, 'final_vote', p, ['trusteeDecisionId'])),
      await insertRecord(client, laterRow(s, a, 'r9_vote', p, ['r9VoteId'])),
      await insertRecord(
        client,
        laterRow(s, a, 'super_admin_approval', { ...p, trusteeDecisionId: trusteeDecisionId2 }, ['closureId', 'trusteeDecisionId']),
      ),
    ];
    await client.query('DELETE FROM claims WHERE claim_case_id = $1', [s.claimCaseId]);
    expect((await client.query('SELECT 1 FROM claim_warning_approvals WHERE record_id = ANY($1)', [ids])).rows).toHaveLength(0);
    const fks = await client.query<{ conname: string; confdeltype: string; cols: string }>(
      `SELECT conname, confdeltype, pg_get_constraintdef(oid) AS cols FROM pg_constraint
        WHERE conname IN ('claim_warning_approvals_trustee_decision_fk', 'claim_warning_approvals_r9_vote_fk', 'claim_warning_approvals_closure_fk')
        ORDER BY conname`,
    );
    expect(fks.rows.map((r) => [r.conname, r.confdeltype])).toEqual([
      ['claim_warning_approvals_closure_fk', 'c'],
      ['claim_warning_approvals_r9_vote_fk', 'c'],
      ['claim_warning_approvals_trustee_decision_fk', 'c'],
    ]);
    for (const r of fks.rows) expect(r.cols).toMatch(/^FOREIGN KEY \(pariwar_id, /);
    const idx = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'claim_warning_approvals' AND indexname IN
        ('claim_warning_approvals_trustee_decision_idx', 'claim_warning_approvals_r9_vote_idx', 'claim_warning_approvals_closure_idx')`,
    );
    expect(idx.rows).toHaveLength(3);
  });

  it('⛔ 0144 adds no DEFERRABLE constraint and no constraint trigger (RD14 — `closeScopeTx` swallows a COMMIT error)', async () => {
    const { client } = getTx();
    const def = await client.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'claim_warning_approvals'::regclass AND condeferrable`,
    );
    expect(def.rows).toEqual([]);
    const trg = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'claim_warning_approvals'::regclass AND tgconstraint <> 0 AND NOT tgisinternal`,
    );
    expect(trg.rows).toEqual([]);
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

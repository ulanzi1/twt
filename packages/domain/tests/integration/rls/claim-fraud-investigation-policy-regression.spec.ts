// Migrations 0196 + 0197 + 0198 — the guilty member finding, the fraud investigation STEPS table, and the step-to-finding tie:
// RLS + DB-level backstops (Story 6.22, Task 1.3 / AC1; DL1, DL2; N1, N2; code review 2026-11-02 RA5).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through the finding writers. Each backstop the writers
// reason from ("one investigation per claim, ever"; "two outcomes only") gets its own red here.
//
// ⭐ The load-bearing ones:
//   · at most ONE member finding per claim, of EITHER kind (0196's widened partial unique index — N2);
//   · the rank coherence CHECK keeps 0119's `IS NOT NULL` (a NULL-rank disqualification is still refused);
//   · each step at most once per claim, and at most ONE found step of either kind (N1);
//   · a found step points at ITS OWN claim's finding, of ITS OWN kind (0198's composite FK on a generated `finding_kind`);
//   · the steps' coherence CHECK is NULL-safe (a found step without its finding or proof of life is refused);
//   · the steps are append-only for EVERY role, the table owner included — only the note may be scrubbed, and only the
//     `claims` cascade deletes (it runs through BOTH tables).
//
// Live DB only; each test runs in its own rolled-back transaction.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  lockTruncateSetNowait,
  seedClaim,
  seedMember,
} from '../_helpers.js';

const STEPS = 'claim_fraud_investigation_steps';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** The violated constraint's NAME — a leg must be refused by ITS constraint, ⛔ a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
}

/** Seed a member + a claim naming them (as the superuser), then enter PARIWAR_A's app scope. */
async function seedClaimInScope() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
  await enterAppScope(client, PARIWAR_A);
  return { tx, client, memberId, claimCaseId };
}

function finding(
  claimCaseId: string,
  over: Partial<typeof schema.claimNomineeFindings.$inferInsert> = {},
): typeof schema.claimNomineeFindings.$inferInsert {
  return {
    findingId: randomUUID() as never,
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    kind: 'member_found_innocent',
    rank: null,
    recordedByActorId: randomUUID(),
    recordedByDisplay: 'Test District Admin',
    ...over,
  };
}

function step(
  claimCaseId: string,
  memberId: string,
  over: Partial<schema.ClaimFraudInvestigationStepInsert> = {},
): schema.ClaimFraudInvestigationStepInsert {
  return {
    stepId: randomUUID() as never,
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: memberId as never,
    step: 'flagged',
    findingId: null,
    aliveConfirmation: null,
    noteCiphertext: 'enc:v1:note',
    actorId: randomUUID(),
    actorDisplay: 'Test Helpline Operator',
    ...over,
  };
}

/** A flag + an innocent finding + its found step — the shape the finding writer leaves. */
async function seedFoundInnocent() {
  const s = await seedClaimInScope();
  await s.tx.insert(schema.claimFraudInvestigationSteps).values(step(s.claimCaseId, s.memberId));
  const [f] = await s.tx.insert(schema.claimNomineeFindings).values(finding(s.claimCaseId)).returning();
  const [found] = await s.tx
    .insert(schema.claimFraudInvestigationSteps)
    .values(
      step(s.claimCaseId, s.memberId, {
        step: 'found_innocent',
        findingId: f!.findingId,
        aliveConfirmation: 'in_person',
        actorDisplay: 'Test District Admin',
      }),
    )
    .returning();
  return { ...s, findingId: f!.findingId, foundStepId: found!.stepId };
}

/** Run `attempt` under a savepoint and return the error it raised (or `undefined`). */
async function failure(client: ReturnType<typeof getTx>['client'], attempt: () => Promise<unknown>): Promise<unknown> {
  await client.query('SAVEPOINT leg');
  const err = await attempt().then(
    () => undefined,
    (e: unknown) => e,
  );
  await client.query('ROLLBACK TO SAVEPOINT leg');
  return err;
}

describe.skipIf(!hasDatabase)('migrations 0196 + 0197 + 0198 — the guilty finding + the fraud investigation steps: RLS + DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled on the steps table (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      'SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1',
      [STEPS],
    );
    expect(rls.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });

  it('⛔ no FOR ALL / DELETE policy — exactly SELECT, INSERT, UPDATE', async () => {
    const { client } = getTx();
    const pols = await client.query<{ cmd: string }>('SELECT cmd FROM pg_policies WHERE tablename = $1', [STEPS]);
    expect(pols.rows.map((p) => p.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
  });

  it('⭐ visible in-scope, ZERO rows cross-tenant, ZERO rows with an unset scope', async () => {
    const { client, claimCaseId } = await seedFoundInnocent();
    const count = () =>
      client.query<{ n: number }>(`SELECT count(*) AS n FROM ${STEPS} WHERE claim_case_id = $1`, [claimCaseId]).then((r) => Number(r.rows[0]!.n));
    expect(await count()).toBe(2);
    await enterAppScope(client, PARIWAR_B);
    expect(await count()).toBe(0);
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await count()).toBe(0);
  });

  it("⛔ a step stamped with ANOTHER Pariwar's id is refused by the WITH CHECK (42501)", async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const err = await failure(client, () => tx.insert(schema.claimFraudInvestigationSteps).values(step(claimCaseId, memberId, { pariwarId: PARIWAR_B })));
    expect(pgCode(err)).toBe('42501');
  });

  it('every FOREIGN KEY refuses an orphan (23503)', async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const ghost = randomUUID();
    const legs: [string, () => Promise<unknown>][] = [
      ['step → claim', () => tx.insert(schema.claimFraudInvestigationSteps).values(step(ghost, memberId))],
      [
        'step → finding',
        () =>
          tx
            .insert(schema.claimFraudInvestigationSteps)
            .values(step(claimCaseId, memberId, { step: 'found_innocent', findingId: ghost as never, aliveConfirmation: 'in_person' })),
      ],
    ];
    for (const [label, attempt] of legs) expect(pgCode(await failure(client, attempt)), label).toBe('23503');
  });

  it('⭐ every CHECK refuses by its OWN name (23514) — the findings kind / rank and the NULL-safe step coherence', async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const [f] = await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId)).returning();
    const s = (over: Partial<schema.ClaimFraudInvestigationStepInsert>) =>
      tx.insert(schema.claimFraudInvestigationSteps).values(step(claimCaseId, memberId, over));
    const fnd = (over: Partial<typeof schema.claimNomineeFindings.$inferInsert>) =>
      tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId, over));
    // An unknown step breaks the coherence CHECK too, and Postgres reports whichever it evaluates first — so that one leg
    // accepts either name (both are this table's own CHECKs).
    const legs: [string, string | readonly string[], () => Promise<unknown>][] = [
      ['finding: unknown kind', 'claim_nominee_findings_kind_check', () => fnd({ kind: 'member_found_inconclusive' as never })],
      ['finding: guilty WITH a rank', 'claim_nominee_findings_rank_coherence_check', () => fnd({ kind: 'member_found_guilty', rank: 1 })],
      ['finding: innocent WITH a rank', 'claim_nominee_findings_rank_coherence_check', () => fnd({ kind: 'member_found_innocent', rank: 2 })],
      // 0119's `IS NOT NULL`, kept by 0196 — without it `FALSE OR NULL` = NULL passes.
      ['finding: disqualified with a NULL rank', 'claim_nominee_findings_rank_coherence_check', () => fnd({ kind: 'nominee_disqualified', rank: null })],
      ['step: unknown step', ['claim_fraud_investigation_steps_step_check', 'claim_fraud_investigation_steps_coherence_check'], () => s({ step: 'withdrawn' as never })],
      ['step: unknown proof of life', 'claim_fraud_investigation_steps_alive_confirmation_check', () => s({ step: 'found_innocent', findingId: f!.findingId, aliveConfirmation: 'phone_call' as never })],
      ['step: blank display', 'claim_fraud_investigation_steps_display_check', () => s({ actorDisplay: '  ' })],
      ['flag WITH a finding', 'claim_fraud_investigation_steps_coherence_check', () => s({ findingId: f!.findingId })],
      ['flag WITH a proof of life', 'claim_fraud_investigation_steps_coherence_check', () => s({ aliveConfirmation: 'video_call' })],
      ['found without its finding', 'claim_fraud_investigation_steps_coherence_check', () => s({ step: 'found_innocent', aliveConfirmation: 'in_person' })],
      ['found without a proof of life', 'claim_fraud_investigation_steps_coherence_check', () => s({ step: 'found_guilty', findingId: f!.findingId })],
    ];
    for (const [label, name, attempt] of legs) {
      const err = await failure(client, attempt);
      expect(pgCode(err), label).toBe('23514');
      expect(typeof name === 'string' ? [name] : name, label).toContain(pgConstraint(err));
    }
  });

  it('⭐ N2 — at most ONE member finding per claim, of EITHER kind (23505); disqualifications are untouched', async () => {
    const { tx, client, claimCaseId } = await seedClaimInScope();
    await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId, { kind: 'member_found_guilty' }));
    for (const kind of ['member_found_innocent', 'member_found_guilty'] as const) {
      const err = await failure(client, () => tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId, { kind })));
      expect(pgCode(err), kind).toBe('23505');
      expect(pgConstraint(err), kind).toBe('claim_nominee_findings_one_member_finding_per_claim_uq');
    }
    // A disqualification beside a member finding is a different index's business.
    await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId, { kind: 'nominee_disqualified', rank: 1 }));
  });

  it('⭐ N1 — each step at most once per claim, and at most ONE found step of either kind (23505)', async () => {
    const { tx, client, claimCaseId, memberId } = await seedFoundInnocent();
    const again = await failure(client, () => tx.insert(schema.claimFraudInvestigationSteps).values(step(claimCaseId, memberId)));
    expect(pgCode(again)).toBe('23505');
    expect(pgConstraint(again)).toBe('claim_fraud_investigation_steps_one_step_per_claim_uq');
    // A guilty finding row cannot be written beside the innocent one (0196) — so plant the found_guilty step on a
    // DIFFERENT claim's guilty finding to reach the steps' own index. (Since 0198 that row also violates the composite FK, but
    // a unique violation is raised at the insert and the FK is checked at the end of the statement — so the INDEX is what
    // refuses it here. The index is also reached with the FK out of the way, in the 0198 test below.)
    const other = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
    const [g] = await tx.insert(schema.claimNomineeFindings).values(finding(other, { kind: 'member_found_guilty' })).returning();
    const both = await failure(client, () =>
      tx
        .insert(schema.claimFraudInvestigationSteps)
        .values(step(claimCaseId, memberId, { step: 'found_guilty', findingId: g!.findingId, aliveConfirmation: 'video_call' })),
    );
    expect(pgCode(both)).toBe('23505');
    expect(pgConstraint(both)).toBe('claim_fraud_investigation_steps_one_finding_per_claim_uq');
  });

  it('⭐ 0198 — a found step points at ITS OWN claim\'s finding (23503): another claim\'s finding is refused, and its own is accepted', async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const other = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
    const [foreign] = await tx.insert(schema.claimNomineeFindings).values(finding(other)).returning();
    const [own] = await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId)).returning();
    const foundStep = (findingId: string) => step(claimCaseId, memberId, { step: 'found_innocent', findingId: findingId as never, aliveConfirmation: 'in_person' });

    const refused = await failure(client, () => tx.insert(schema.claimFraudInvestigationSteps).values(foundStep(foreign!.findingId)));
    expect(pgCode(refused)).toBe('23503');
    expect(pgConstraint(refused)).toBe('claim_fraud_investigation_steps_finding_claim_kind_fk');
    // The control: the same step on its OWN claim's finding goes in — else the refusal above could be any FK.
    const accepted = await tx.insert(schema.claimFraudInvestigationSteps).values(foundStep(own!.findingId)).returning();
    expect(accepted).toHaveLength(1);
  });

  it('⭐ 0198 — a found step points at a finding of ITS OWN KIND (23503): found_innocent on a guilty finding is refused; found_guilty on it is accepted', async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const [guilty] = await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId, { kind: 'member_found_guilty' })).returning();
    const foundStep = (kind: 'found_innocent' | 'found_guilty') =>
      step(claimCaseId, memberId, { step: kind, findingId: guilty!.findingId, aliveConfirmation: 'in_person' });

    const refused = await failure(client, () => tx.insert(schema.claimFraudInvestigationSteps).values(foundStep('found_innocent')));
    expect(pgCode(refused)).toBe('23503');
    expect(pgConstraint(refused)).toBe('claim_fraud_investigation_steps_finding_claim_kind_fk');
    const [accepted] = await tx.insert(schema.claimFraudInvestigationSteps).values(foundStep('found_guilty')).returning();
    expect(accepted!.findingKind).toBe('member_found_guilty');
  });

  it('⭐ RA12 — the TS tuple and the SQL CHECK name the SAME proofs of life: every `FRAUD_ALIVE_CONFIRMATIONS` value is accepted, one outside it is refused by the CHECK (23514)', async () => {
    // The tuple, `@twt/contracts`' z.enum (lockstep-tested there) and 0197's CHECK list are three copies; a Panel ruling on Q9
    // that changes the set must change all three, and this is the leg that reaches the database.
    for (const value of schema.FRAUD_ALIVE_CONFIRMATIONS) {
      const { client } = getTx();
      await client.query('RESET ROLE');
      const { tx, claimCaseId, memberId } = await seedClaimInScope();
      const [f] = await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId)).returning();
      const [row] = await tx
        .insert(schema.claimFraudInvestigationSteps)
        .values(step(claimCaseId, memberId, { step: 'found_innocent', findingId: f!.findingId, aliveConfirmation: value }))
        .returning();
      expect(row!.aliveConfirmation, value).toBe(value);
    }
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const [f] = await tx.insert(schema.claimNomineeFindings).values(finding(claimCaseId)).returning();
    const err = await failure(client, () =>
      tx
        .insert(schema.claimFraudInvestigationSteps)
        .values(step(claimCaseId, memberId, { step: 'found_innocent', findingId: f!.findingId, aliveConfirmation: 'phone_call' as never })),
    );
    expect(pgCode(err)).toBe('23514');
    expect(pgConstraint(err)).toBe('claim_fraud_investigation_steps_alive_confirmation_check');

    // The OTHER direction (code review PD12 (c)): everything above shows the CHECK admits each tuple value and refuses ONE stranger; a
    // CHECK that also admitted `video_chat` would pass it. The constraint holds nothing but the proof-of-life list, so its literals,
    // read from the catalog, must be exactly the tuple.
    const { rows } = await getTx().client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_fraud_investigation_steps_alive_confirmation_check' AND conrelid = '${STEPS}'::regclass`,
    );
    expect(rows).toHaveLength(1);
    const literals = [...rows[0]!.def.matchAll(/'([^']+)'/g)].map((m) => m[1]!).sort();
    expect(literals).toEqual([...schema.FRAUD_ALIVE_CONFIRMATIONS].sort());
  });

  it('0198 — `finding_kind` is GENERATED from `step`: NULL for a flag, never writable (428C9)', async () => {
    const { tx, client, claimCaseId, memberId } = await seedClaimInScope();
    const [flag] = await tx.insert(schema.claimFraudInvestigationSteps).values(step(claimCaseId, memberId)).returning();
    expect(flag!.findingKind).toBeNull();
    const err = await failure(client, () =>
      client.query(
        `INSERT INTO ${STEPS} (step_id, claim_case_id, pariwar_id, deceased_member_id, step, note_ciphertext, actor_id, actor_display, finding_kind)
         VALUES ($1, $2, $3, $4, 'flagged', 'enc:v1:note', 'a', 'A', 'member_found_innocent')`,
        [randomUUID(), claimCaseId, PARIWAR_A, memberId],
      ),
    );
    expect(pgCode(err)).toBe('428C9');
  });

  it('0198 — the steps\' own one-found-step-per-claim index refuses a second found step (23505) where no foreign key stands in front of it — on a TEMP CLONE', async () => {
    // The composite FK refuses a mismatched second found step first (23503, above), so the index is reached only without it. ⚠ (code review
    // PD11) That is done on a `pg_temp` CLONE, ⛔ by dropping the FK on the shared table: `ALTER TABLE … DROP CONSTRAINT` holds ACCESS
    // EXCLUSIVE on the steps (and SHARE ROW EXCLUSIVE on the findings) until the harness rolls back, in a database other specs share (the
    // house precedent for test-only DDL is `_inspection-discrepancy-fixtures.ts`). `LIKE … INCLUDING ALL` copies the columns, the generated
    // `finding_kind`, the CHECKs and the unique indexes (under new names) — and NOT the foreign keys or the triggers.
    const { client } = getTx();
    await client.query('RESET ROLE');
    await client.query(`CREATE TEMP TABLE fraud_steps_clone (LIKE ${STEPS} INCLUDING ALL)`);
    const insert = (claim: string, stepName: string, findingId: string) =>
      client.query(
        `INSERT INTO pg_temp.fraud_steps_clone (step_id, claim_case_id, pariwar_id, deceased_member_id, step, finding_id, alive_confirmation, note_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, $3, $4, $5, $6, 'video_call', 'enc:v1:note', 'a', 'A')`,
        [randomUUID(), claim, PARIWAR_A, randomUUID(), stepName, findingId],
      );
    const claimA = randomUUID();
    await insert(claimA, 'found_innocent', randomUUID());
    // The CONTROL: a found step of ANOTHER claim is accepted — so the refusal below is about the SAME claim, ⛔ the clone being unusable.
    await insert(randomUUID(), 'found_guilty', randomUUID());
    // A different `step` value, so the (claim, step) index does not apply: only the partial one-finding-per-claim index can refuse this.
    const err = await failure(client, () => insert(claimA, 'found_guilty', randomUUID()));
    expect(pgCode(err)).toBe('23505');
  });

  it('⛔ twt_app cannot UPDATE any step column but the note (column-level grant, 42501); the note can be scrubbed', async () => {
    const { tx, client, foundStepId } = await seedFoundInnocent();
    const byId = eq(schema.claimFraudInvestigationSteps.stepId, foundStepId);
    const legs: [string, () => Promise<unknown>][] = [
      ['step', () => tx.update(schema.claimFraudInvestigationSteps).set({ step: 'found_guilty' }).where(byId)],
      ['alive_confirmation', () => tx.update(schema.claimFraudInvestigationSteps).set({ aliveConfirmation: 'video_call' }).where(byId)],
      ['actor_display', () => tx.update(schema.claimFraudInvestigationSteps).set({ actorDisplay: 'Someone Else' }).where(byId)],
      ['acted_at', () => tx.update(schema.claimFraudInvestigationSteps).set({ actedAt: new Date(0) }).where(byId)],
    ];
    for (const [label, attempt] of legs) expect(pgCode(await failure(client, attempt)), label).toBe('42501');
    const scrubbed = await tx.update(schema.claimFraudInvestigationSteps).set({ noteCiphertext: '[anonymized]' }).where(byId).returning();
    expect(scrubbed.map((r) => r.noteCiphertext)).toEqual(['[anonymized]']);
  });

  it('⛔ twt_app holds no DELETE on the steps (42501)', async () => {
    const { tx, client, foundStepId } = await seedFoundInnocent();
    const err = await failure(client, () => tx.delete(schema.claimFraudInvestigationSteps).where(eq(schema.claimFraudInvestigationSteps.stepId, foundStepId)));
    expect(pgCode(err)).toBe('42501');
  });

  it('⭐⭐ the append-only TRIGGER refuses the table OWNER too — every frozen column, and DELETE (23000); the note passes', async () => {
    const { client, foundStepId } = await seedFoundInnocent();
    await client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the table
    const frozen: [string, string][] = [
      ['step_id', 'step_id = gen_random_uuid()'],
      ['claim_case_id', 'claim_case_id = gen_random_uuid()'],
      ['pariwar_id', 'pariwar_id = gen_random_uuid()'],
      ['deceased_member_id', 'deceased_member_id = gen_random_uuid()'],
      ['step', "step = 'found_guilty'"],
      ['finding_id', 'finding_id = NULL'],
      ['alive_confirmation', "alive_confirmation = 'video_call'"],
      ['actor_id', "actor_id = 'someone-else'"],
      ['actor_display', "actor_display = 'Someone Else'"],
      ['acted_at', "acted_at = acted_at - interval '1 day'"],
    ];
    for (const [label, set] of frozen) {
      const err = await failure(client, () => client.query(`UPDATE ${STEPS} SET ${set} WHERE step_id = $1`, [foundStepId]));
      expect(pgCode(err), label).toBe('23000');
    }
    const del = await failure(client, () => client.query(`DELETE FROM ${STEPS} WHERE step_id = $1`, [foundStepId]));
    expect(pgCode(del)).toBe('23000');
    await client.query(`UPDATE ${STEPS} SET note_ciphertext = '[anonymized]' WHERE step_id = $1`, [foundStepId]);
  });

  it('⛔ TRUNCATE is refused (23000)', { timeout: 60000 }, async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT tr');
    expect(await lockTruncateSetNowait(client, STEPS, { attempts: 300 })).toContain(STEPS);
    const err = await client.query(`TRUNCATE ${STEPS}`).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(pgCode(err)).toBe('23000');
    await client.query('ROLLBACK TO SAVEPOINT tr');
  });

  it('the `claims` ON DELETE cascade removes the steps AND the findings (pg_trigger_depth > 1; the finding FK is NO ACTION)', async () => {
    const { client, claimCaseId } = await seedFoundInnocent();
    await client.query('RESET ROLE');
    await client.query('DELETE FROM claims WHERE claim_case_id = $1', [claimCaseId]);
    for (const t of [STEPS, 'claim_nominee_findings']) {
      const left = await client.query(`SELECT 1 FROM ${t} WHERE claim_case_id = $1`, [claimCaseId]);
      expect(left.rows, t).toEqual([]);
    }
  });
});

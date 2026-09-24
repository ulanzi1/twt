// The `-239` refusal's two downstream effects — live DB (:5433). Story 6.20 (Task 4 / Task 9; D14,
// AC13, T17; AC11 (v), (vi)).
//
//   (v)  ⭐ THE GROUND INSPECTION IS INHERITED: a claim refused with `post_death_nominee_change` has a
//        COMPLETED inspection; the true nominee's refile derives it as its source. ⛔ A claim denied for
//        ANY OTHER reason passes nothing on (the non-vacuity sibling).
//   (vi) ⚠ THE REFILE-DURING-APPEAL TRAP (T17): once the refused claim is at `appeal_stage_1`, a refile
//        inside ±30 days CONVERGES onto it — asserted as TODAY'S BEHAVIOUR, ⛔ never as a defect — and the
//        shipped AUTHORIZED OVERRIDE mints a distinct claim that still inherits (v).
// The refile path is the REAL `tryConverge` / `overrideIntakeAttempt`, so the claim ids and `created_at`
// ordering are production's.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { eq, sql } from 'drizzle-orm';

import {
  ClaimDecisionConflictError,
  ClaimDecisionNotRevisableError,
  PostDeathRefusalUngroundedError,
  adjudicateClaim,
  reviseDecision,
  getConvergenceCandidate,
  getInheritedGroundInspectionSource,
  listNomineeRefusals,
  overrideIntakeAttempt,
  tryConverge,
} from '../../../src/claim/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedNomineeDeclaration, seedNomineeDetermination } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const intake = (mid: MemberId, channel: schema.ClaimIntakeChannel, auditId: string) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId,
});

async function forceState(client: Client, claimCaseId: string, state: string) {
  await client.query('RESET ROLE');
  await client.query("SET LOCAL app.claim_state_writer = 'on'");
  await client.query('UPDATE claims SET current_state = $1 WHERE claim_case_id = $2', [state, claimCaseId]);
  await client.query("SET LOCAL app.claim_state_writer = 'off'");
  await enterAppScope(client, PARIWAR_A);
}

async function refuse(tx: Tx, claimCaseId: ClaimId, reasonCode: 'post_death_nominee_change' | 'other') {
  await tx.insert(schema.claimVerifierDecisions).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    outcome: 'denied',
    reasonCode,
    rationaleCiphertext: 'enc:v1:rationale',
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
  });
}

async function completedInspection(tx: Tx, claimCaseId: ClaimId) {
  await tx.insert(schema.claimGroundInspections).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    district: 'Patna',
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: randomUUID(),
    scheduledAt: new Date('2026-05-01T06:00:00.000Z'),
    status: 'completed',
    completedAt: new Date('2026-05-02T06:00:00.000Z'),
  });
}

describe.skipIf(!hasDatabase)('Story 6.20 — the `-239` refusal: inheritance + the refile trap (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ AC11(v) — the true nominee\'s REFILE inherits the refused claim\'s completed inspection', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'a1'));
    const refusedId = toClaimId(refused.claimCaseId);
    await completedInspection(tx, refusedId);
    await refuse(tx, refusedId, 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'denied');

    // A `denied` claim is terminal, so the refile is a FRESH claim (the path D17 assumes).
    const refile = await tryConverge(client, intake(mid, 'member_app', 'a2'));
    expect(refile.claimCaseId).not.toBe(refused.claimCaseId);

    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBe(refused.claimCaseId);
    // ⛔ The refused claim does not inherit from itself (or from its successor).
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, refusedId)).toBeNull();
    // The Pariwar Admin's READ surface lists the refusal.
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).toContain(refused.claimCaseId);
  });

  it('⛔ AC11(v) sibling — a claim denied for ANY OTHER reason passes NOTHING on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const denied = await tryConverge(client, intake(mid, 'member_app', 'b1'));
    await completedInspection(tx, toClaimId(denied.claimCaseId));
    await refuse(tx, toClaimId(denied.claimCaseId), 'other');
    await forceState(client, denied.claimCaseId, 'denied');
    const refile = await tryConverge(client, intake(mid, 'member_app', 'b2'));
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBeNull();
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).not.toContain(denied.claimCaseId);
  });

  it('⛔ a `-239` refusal with ⛔ no COMPLETED inspection has nothing to pass on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'c1'));
    await refuse(tx, toClaimId(refused.claimCaseId), 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'denied');
    const refile = await tryConverge(client, intake(mid, 'member_app', 'c2'));
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBeNull();
  });

  it('⚠⚠ AC11(vi) / T17 — during the refuser\'s APPEAL a refile CONVERGES onto the refused claim (today\'s behaviour); the OVERRIDE mints a distinct claim that still inherits', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'd1'));
    const refusedId = toClaimId(refused.claimCaseId);
    await completedInspection(tx, refusedId);
    await refuse(tx, refusedId, 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'appeal_stage_1');

    // ⚠ `appeal_stage_1` is ⛔ not terminal, so inside ±30 days the refused claim IS the candidate …
    const candidate = await getConvergenceCandidate(tx, PARIWAR_A, mid, new Date(Date.now() - 30 * 86_400_000));
    expect(candidate?.claimCaseId).toBe(refused.claimCaseId);
    // … and a cross-channel refile lands as an attempt PENDING against it (⛔ a new claim is NOT minted).
    const refile = await tryConverge(client, intake(mid, 'helpline', 'd2'));
    expect(refile.claimCaseId).toBe(refused.claimCaseId);
    expect(refile.intakeAttemptId).toBeTruthy();

    // ⭐ The remedy is the SHIPPED authorized override, ⛔ never a new convergence rule.
    const ov = await overrideIntakeAttempt(client, {
      intakeAttemptId: refile.intakeAttemptId!,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannel: 'helpline',
      againstClaimCaseId: refusedId,
      reason: 'true nominee refile during the refuser\'s appeal (`-239`)',
      actor: 'operator',
      claimantActorId: null,
      decidedByActor: randomUUID(),
      auditId: 'd3',
    });
    expect(ov.newClaimCaseId).not.toBe(refused.claimCaseId);
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(ov.newClaimCaseId))).toBe(refused.claimCaseId);
  });

  // ── Code review 2026-09-24 ──────────────────────────────────────────────────────────────────────
  it('⭐⭐ AC4 — the `-239` refusal through the REAL `adjudicateClaim` needs a determination with a DISCARDED version', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    await tx.insert(schema.members).values({ memberId: mid, pariwarId: PARIWAR_A, state: 'active', stateEventVersion: 1 });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-01-10T06:00:00.000Z'), ensureMember: false });
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_review');
    const deny = () =>
      adjudicateClaim(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        outcome: 'denied',
        reasonCode: 'post_death_nominee_change',
        rationaleCiphertext: 'enc:v1:rationale',
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
    const ungrounded = (err: unknown) => err instanceof PostDeathRefusalUngroundedError;

    // (1) No determination at all ⇒ refused.
    await client.query('SAVEPOINT a');
    await expect(deny()).rejects.toSatisfy(ungrounded);
    await client.query('ROLLBACK TO SAVEPOINT a');
    // (2) A determination where EVERYTHING stands ⇒ still refused (no suspicion was ever recorded).
    await seedNomineeDetermination(client, PARIWAR_A, cid);
    await client.query('SAVEPOINT b');
    await expect(deny()).rejects.toSatisfy(ungrounded);
    await client.query('ROLLBACK TO SAVEPOINT b');
    // (3) A post-death version the District Admin DISCARDED ⇒ the refusal is recorded (non-vacuity).
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    await seedNomineeDetermination(client, PARIWAR_A, cid, {
      certificateDate: '2026-05-01',
      marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? 'stands' : 'discarded' })),
    });
    await expect(deny()).resolves.toMatchObject({ decision: { outcome: 'denied', reasonCode: 'post_death_nominee_change' } });
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).toContain(cid);
  });

  // ── Code review 2026-09-24b — the grounding guard's own predicate, its SECOND call site, and its ORDER ──
  it('⭐⭐ the `-239` grounding reads only the LIVE determination, guards `reviseDecision` too, and yields to the state / live-decision guards', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    await tx.insert(schema.members).values({ memberId: mid, pariwarId: PARIWAR_A, state: 'active', stateEventVersion: 1 });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-01-10T06:00:00.000Z'), ensureMember: false });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_review');
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    const discardPostDeath = () =>
      seedNomineeDetermination(client, PARIWAR_A, cid, {
        certificateDate: '2026-05-01',
        marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? 'stands' : 'discarded' })),
      });
    const base = {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      outcome: 'denied' as const,
      reasonCode: 'post_death_nominee_change' as const,
      rationaleCiphertext: 'enc:v1:rationale',
      actorId: randomUUID(),
      actorDisplay: 'Anita (District Admin)',
      actor: 'operator' as const,
    };
    const ungrounded = (err: unknown) => err instanceof PostDeathRefusalUngroundedError;

    // (1) A SUPERSEDED determination that discarded, under a LIVE one where everything stands ⇒ ⛔ not grounded.
    await discardPostDeath();
    await seedNomineeDetermination(client, PARIWAR_A, cid);
    await expect(adjudicateClaim(client, base)).rejects.toSatisfy(ungrounded);

    // (2) ORDER — a revision OUTSIDE its window is refused for THAT reason, ⛔ not "record the determination".
    await expect(reviseDecision(client, base)).rejects.toBeInstanceOf(ClaimDecisionNotRevisableError);

    // (3) Grounded (a LIVE discard) ⇒ the refusal is recorded; the claim is now `denied` with a live decision.
    await discardPostDeath();
    await expect(adjudicateClaim(client, base)).resolves.toMatchObject({ decision: { reasonCode: 'post_death_nominee_change' } });

    // (4) Take the grounding away (a correction superseded the determination) ⇒ nothing is live.
    await tx.execute(
      sql`UPDATE nominee_determinations SET superseded_at = now(), superseded_reason = 'correction_applied'
           WHERE claim_case_id = ${cid} AND superseded_at IS NULL`,
    );
    // ORDER — a second adjudication meets the LIVE decision first (⛔ not "ungrounded", which would not help) …
    await expect(adjudicateClaim(client, base)).rejects.toBeInstanceOf(ClaimDecisionConflictError);
    // … and the SECOND call site: a revision inside its window is refused as ungrounded.
    await expect(reviseDecision(client, base)).rejects.toSatisfy(ungrounded);
  });

  it('⛔ a SUPERSEDED `-239` refusal is ⛔ not listed and passes ⛔ nothing on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'e1'));
    const refusedId = toClaimId(refused.claimCaseId);
    await completedInspection(tx, refusedId);
    await refuse(tx, refusedId, 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'denied');
    await tx
      .update(schema.claimVerifierDecisions)
      .set({ supersededAt: new Date() })
      .where(eq(schema.claimVerifierDecisions.claimCaseId, refusedId));
    const refile = await tryConverge(client, intake(mid, 'member_app', 'e2'));
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBeNull();
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).not.toContain(refused.claimCaseId);
  });

  it('⭐ a TIE on `created_at` resolves to ONE deterministic source (the higher claim id) — on every call', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    // Two `-239`-refused claims for one death, each with a completed inspection, minted in ONE transaction
    // (so `created_at` is EQUAL — `now()` is the transaction's start), and a refile after them.
    const ids = [toClaimId(randomUUID()), toClaimId(randomUUID())].sort() as [ClaimId, ClaimId];
    for (const id of ids) {
      await driveClaimTo(client, PARIWAR_A, id, mid, 'intake_pending');
      await completedInspection(tx, id);
      await refuse(tx, id, 'post_death_nominee_change');
    }
    const refile = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, refile, mid, 'intake_pending');
    const created = await tx.execute<{ n: number }>(
      sql`SELECT count(DISTINCT created_at)::int AS n FROM claims WHERE claim_case_id IN (${ids[0]}, ${ids[1]}, ${refile})`,
    );
    expect(created.rows[0]!.n).toBe(1); // the premise: a genuine tie
    // ⭐ EXACTLY the higher id (`ORDER BY … claim_case_id DESC`) — the ids are lower-case hex, so the string
    // sort above IS uuid order. (Code review 2026-09-24b: `toContain` accepted either, and repeat reads in one
    // transaction reuse one plan, so dropping the tiebreak stayed green.)
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, refile)).toBe(ids[1]);
  });
});

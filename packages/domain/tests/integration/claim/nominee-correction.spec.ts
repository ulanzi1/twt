// The genuine-mistake CORRECTION — raise, District Admin step, Pariwar Admin step — live DB (:5433).
// Story 6.20 (Task 5 / Task 9; D7; AC7, AC11 (i), (vii)).
//
// Every ruled clause the correction enforces has a red here AND a non-vacuous green beside it:
//   · `-237` cl.2 — a target nominee whose relationship is `other` is refused AT THE RAISE, before either
//     approval; the SAME raise with a KNOWN relationship is accepted (so the refusal is ⛔ not vacuous);
//   · `-236` Z — first District Admin, then Pariwar Admin, two DIFFERENT people, a note at each; a decline
//     at either step stops it and the declaration stays as it was;
//   · invariant 5 — the applied version inherits the target's `effective_at` (and `split_pct`);
//   · D7 — an applied correction SUPERSEDES the live determination, so AC5's 409 fires again until the
//     District Admin redetermines;
//   · `-242` c.2 (D7) — outside `NOMINEE_NAME_CHECK_RECORDABLE_STATES` the raise is a typed 409, while the
//     SAME raise inside the window succeeds.
//
// Members are seeded through the REAL member projector (a correction's apply appends to the member
// stream, which a raw `members` row would not have).

import { randomUUID } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  NomineeCorrectionRefusedError,
  NomineeDeterminationRequiredError,
  recordNomineeDisqualificationFinding,
  assertNomineeNameCheckForApproval,
  decideNomineeCorrectionAsDistrictAdmin,
  decideNomineeCorrectionAsPariwarAdmin,
  getEffectiveNomineeDeclaration,
  raiseNomineeCorrection,
  type RaiseNomineeCorrectionInput,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import { projectMemberState } from '../../../src/member/project.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

const DECLARED_AT = new Date('2026-01-10T06:00:00.000Z');
const DA = randomUUID();
const PA = randomUUID();

type Tx = ReturnType<typeof getTx>['tx'];

async function setup(
  opts: { relationship?: string; state?: 'verification_in_progress' | 'intake_pending'; nominees?: { relationship: string }[] } = {},
) {
  const { client, tx } = getTx();
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await projectMemberState(client, {
    memberId: mid,
    pariwarId: PARIWAR_A,
    eventType: 'member.signup_initiated',
    payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    actorId: mid,
  });
  await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
    nominees: opts.nominees ?? [{ relationship: opts.relationship ?? 'spouse' }],
    declaredAt: DECLARED_AT,
    ensureMember: false,
  });
  await driveClaimTo(client, PARIWAR_A, cid, mid, opts.state ?? 'verification_in_progress');
  if ((opts.state ?? 'verification_in_progress') !== 'intake_pending') {
    await seedNomineeDetermination(client, PARIWAR_A, cid);
  }
  return { client, tx, cid, mid };
}

function raise(cid: ClaimId, over: Partial<RaiseNomineeCorrectionInput> = {}): RaiseNomineeCorrectionInput {
  return {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    rank: 1,
    proposedNameCiphertext: 'enc:v1:rani-devi',
    proposedRelationship: 'spouse',
    proposedMobileCiphertext: 'enc:v1:mobile',
    proposedAddressCiphertext: null,
    raiseNoteCiphertext: 'enc:v1:married-name',
    raisedVia: 'helpline',
    raisedByActorId: randomUUID(),
    ...over,
  };
}

function refusedWith(reason: string) {
  return (err: unknown) => err instanceof NomineeCorrectionRefusedError && err.reason === reason;
}

const step = (cid: ClaimId, correctionId: string, actorId: string, outcome: 'approve' | 'decline' = 'approve') => ({
  correctionId: correctionId as never,
  claimCaseId: cid,
  pariwarId: PARIWAR_A,
  outcome,
  noteCiphertext: 'enc:v1:step-note',
  actorId,
  actorDisplay: actorId === DA ? 'Anita (District Admin)' : 'Kalpana (Pariwar Admin)',
});

async function liveDetermination(tx: Tx, cid: ClaimId) {
  return tx
    .select()
    .from(schema.nomineeDeterminations)
    .where(and(eq(schema.nomineeDeterminations.claimCaseId, cid), isNull(schema.nomineeDeterminations.supersededAt)));
}

describe.skipIf(!hasDatabase)('Story 6.20 — the nominee correction (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC11(i) — `other` forecloses, at the RAISE ────────────────────────────────────────────────
  it('⭐⭐ AC11(i) — a target nominee whose relationship is `other` is refused AT THE RAISE (`-237` cl.2)', async () => {
    const { client, tx, cid } = await setup({ relationship: 'other' });
    await expect(raiseNomineeCorrection(client, raise(cid))).rejects.toSatisfy(refusedWith('relationship_other'));
    // ⛔ never "dropped at approval time": nothing was raised at all.
    expect(await tx.select().from(schema.nomineeCorrections).where(eq(schema.nomineeCorrections.claimCaseId, cid))).toEqual([]);
  });

  it('⭐ AC11(i) sibling — the SAME raise against a KNOWN relationship is accepted (the refusal is ⛔ not vacuous)', async () => {
    const { client, cid } = await setup({ relationship: 'spouse' });
    const res = await raiseNomineeCorrection(client, raise(cid));
    expect(res.correctionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('⛔ a PROPOSED relationship of `other` is refused too — an ENGINEERING READING of `-237` cl.2, ⛔ not a ratified rule (BigDev 2026-09-24)', async () => {
    const { client, cid } = await setup();
    await expect(raiseNomineeCorrection(client, raise(cid, { proposedRelationship: 'other' }))).rejects.toSatisfy(
      refusedWith('relationship_other'),
    );
  });

  it('⭐ the worked example — "Rani Kumari → Rani Devi" (a married name) with a DIFFERENT known relationship is SHOWN, ⛔ never blocked', async () => {
    const { client, cid } = await setup({ relationship: 'daughter_in_law' });
    const res = await raiseNomineeCorrection(client, raise(cid, { proposedRelationship: 'spouse' }));
    expect(res.correctionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  // ── AC11(vii) — the state window on the RAISE ────────────────────────────────────────────────
  it('⭐⭐ AC11(vii) — OUTSIDE the recordable window the raise is a typed 409; INSIDE it the same raise succeeds', async () => {
    const outside = await setup({ state: 'intake_pending' });
    await expect(raiseNomineeCorrection(outside.client, raise(outside.cid))).rejects.toSatisfy(
      refusedWith('outside_state_window'),
    );
    const inside = await setup();
    const res = await raiseNomineeCorrection(inside.client, raise(inside.cid));
    expect(res.correctionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  // ── The target ────────────────────────────────────────────────────────────────────────────────
  it('⛔ a correction of a DISCARDED (non-standing) version is refused', async () => {
    const { client, tx, cid, mid } = await setup();
    // A post-death version the determination discards …
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    await seedNomineeDetermination(client, PARIWAR_A, cid, {
      certificateDate: '2026-05-01',
      marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? 'stands' : 'discarded' })),
    });
    const discarded = versions.find((v) => v.versionNo === 2)!;
    await expect(
      raiseNomineeCorrection(client, raise(cid, { targetVersionId: discarded.versionId })),
    ).rejects.toSatisfy(refusedWith('target_not_standing'));
  });

  it('⛔ with NO live determination nothing stands, so nothing can be corrected', async () => {
    const { client, cid, tx } = await setup();
    await tx
      .update(schema.nomineeDeterminations)
      .set({ supersededAt: new Date(), supersededReason: 'redetermined' })
      .where(eq(schema.nomineeDeterminations.claimCaseId, cid));
    await expect(raiseNomineeCorrection(client, raise(cid))).rejects.toSatisfy(refusedWith('no_standing_version'));
  });

  it('⛔ a correction on a claim that does not exist is NOT FOUND (`claim_not_found` → 404; before any claim the change is free)', async () => {
    const { client } = await setup();
    await expect(raiseNomineeCorrection(client, raise(toClaimId(randomUUID())))).rejects.toSatisfy(
      refusedWith('claim_not_found'),
    );
  });

  it('⛔ ONE open correction per claim + rank', async () => {
    const { client, cid } = await setup();
    await raiseNomineeCorrection(client, raise(cid));
    await expect(raiseNomineeCorrection(client, raise(cid))).rejects.toSatisfy(refusedWith('open_correction_exists'));
  });

  // ── The two steps ─────────────────────────────────────────────────────────────────────────────
  it('⭐⭐ `-236` Z — DA then PA, two DIFFERENT people: the SAME person on both steps is refused', async () => {
    const { client, cid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    await expect(decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, DA))).rejects.toSatisfy(
      refusedWith('same_approver'),
    );
  });

  it('⛔ the PA cannot act before the DA (the step is conditional)', async () => {
    const { client, cid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await expect(decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA))).rejects.toSatisfy(
      refusedWith('step_conflict'),
    );
  });

  it('⭐ a DECLINE at the District Admin step STOPS it, and the declaration stays as it was', async () => {
    const { client, tx, cid, mid } = await setup();
    const before = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    expect((await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA, 'decline'))).step).toBe('declined');
    await expect(decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA))).rejects.toSatisfy(
      refusedWith('step_conflict'),
    );
    expect(await listNomineeDeclarationVersions(tx, PARIWAR_A, mid)).toHaveLength(before.length);
    expect(await liveDetermination(tx, cid)).toHaveLength(1);
  });

  it('⭐ a DECLINE at the Pariwar Admin step stops it too', async () => {
    const { client, tx, cid, mid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    const res = await decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA, 'decline'));
    expect(res).toEqual({ step: 'declined', appliedVersionId: null });
    expect(await listNomineeDeclarationVersions(tx, PARIWAR_A, mid)).toHaveLength(1);
  });

  it('⭐⭐ an APPROVED correction applies: a `correction` version INHERITING effective_at + split_pct, the projection updated', async () => {
    const { client, tx, cid, mid } = await setup();
    const [target] = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    const res = await decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA));
    expect(res.step).toBe('applied');

    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    const applied = versions.find((v) => v.versionId === res.appliedVersionId)!;
    expect(applied).toMatchObject({
      rank: 1,
      versionNo: 2,
      source: 'correction',
      kind: 'declared',
      correctsVersionId: target!.versionId,
      splitPct: target!.splitPct,
      relationship: 'spouse',
      nameCiphertext: 'enc:v1:rani-devi',
    });
    // ⭐ invariant 5 — positioned where the corrected version was, though recorded now.
    expect(applied.effectiveAt.toISOString()).toBe(target!.effectiveAt.toISOString());
    expect(applied.recordedAt.getTime()).toBeGreaterThan(target!.recordedAt.getTime());
    // D16 — the projection is the LATEST version, i.e. the corrected nominee.
    const [proj] = await tx.select().from(schema.memberNominees).where(eq(schema.memberNominees.memberId, mid));
    expect(proj!.nameCiphertext).toBe('enc:v1:rani-devi');
    // AC1 — the member stream records it, `source: 'correction'`, ⛔ no PII.
    const ev = await tx
      .select()
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.streamId, mid), eq(schema.eventsLog.eventType, 'member.nominees_declared')));
    expect(ev.at(-1)!.payload).toMatchObject({ source: 'correction', versions: [{ rank: 1, version_no: 2, kind: 'declared' }] });
    expect(JSON.stringify(ev.at(-1)!.payload)).not.toContain('rani');
  });

  it('⭐⭐ correction-then-determination ordering: the applied correction SUPERSEDES the determination, and AC5\'s 409 fires again', async () => {
    const { client, tx, cid, mid } = await setup();
    await driveOnToReview(client, cid, mid);
    await seedNomineeNameCheck(client, PARIWAR_A, cid); // determined + checked
    await assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid); // approvable

    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    await decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA));

    expect(await liveDetermination(tx, cid)).toEqual([]);
    const superseded = await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, cid));
    expect(superseded.map((d) => d.supersededReason)).toEqual(['correction_applied']);
    await expect(assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid)).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeDeterminationRequiredError && err.reason === 'never_determined',
    );

    // ⭐ The District Admin redetermines — the correction STANDS (its inherited position is pre-death),
    // and it is the effective nominee.
    await seedNomineeDetermination(client, PARIWAR_A, cid);
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.status).toBe('effective');
    expect(e.entries.map((x) => x.versionNo)).toEqual([2]);
  });

  // ── Code review 2026-09-24 ──────────────────────────────────────────────────────────────────────
  it('⭐⭐ CC2 — the person who RAISED a correction can decide it at ⛔ neither step', async () => {
    const { client, cid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid, { raisedByActorId: DA }));
    await expect(decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA))).rejects.toSatisfy(
      refusedWith('raiser_cannot_approve'),
    );
    // A DIFFERENT District Admin approves; the raiser still cannot take step 2.
    const otherDa = randomUUID();
    await decideNomineeCorrectionAsDistrictAdmin(client, { ...step(cid, correctionId, otherDa), actorDisplay: 'Meena (District Admin)' });
    const raiser2 = await setup();
    const r2 = await raiseNomineeCorrection(raiser2.client, raise(raiser2.cid, { raisedByActorId: PA }));
    await decideNomineeCorrectionAsDistrictAdmin(raiser2.client, step(raiser2.cid, r2.correctionId, DA));
    await expect(decideNomineeCorrectionAsPariwarAdmin(raiser2.client, step(raiser2.cid, r2.correctionId, PA))).rejects.toSatisfy(
      refusedWith('raiser_cannot_approve'),
    );
  });

  it('⭐⭐ a correction of a rank VACATED after the death is ⛔ NOT re-inserted into the projection (BigDev 2026-09-24, option b) — the splits stay coherent', async () => {
    // Before the death: {1: spouse 75, 2: son 25}. After it: a 2→1 change (rank 1 v2 at 100, rank 2 tombstone).
    const { client, tx, cid, mid } = await setup({ nominees: [{ relationship: 'spouse' }, { relationship: 'son' }] });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [{ relationship: 'spouse' }],
      declaredAt: new Date('2026-06-01T06:00:00.000Z'),
      ensureMember: false,
    });
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    await seedNomineeDetermination(client, PARIWAR_A, cid, {
      certificateDate: '2026-05-01',
      marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? 'stands' : 'discarded' })),
    });
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid, { rank: 2, proposedRelationship: 'son' }));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    const res = await decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA));
    expect(res.step).toBe('applied');

    // The projection is still the member's OWN last declaration: rank 1 alone, at 100 — ⛔ no 125%.
    const proj = await tx.select().from(schema.memberNominees).where(eq(schema.memberNominees.memberId, mid));
    expect(proj.map((r) => [r.rank, r.splitPct])).toEqual([[1, 100]]);
    // The correction lives in the version history …
    const applied = (await listNomineeDeclarationVersions(tx, PARIWAR_A, mid)).find((v) => v.versionId === res.appliedVersionId)!;
    expect(applied).toMatchObject({ rank: 2, source: 'correction', splitPct: 25 });
    // … and the member event describes the UNCHANGED projection.
    const ev = await tx
      .select()
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.streamId, mid), eq(schema.eventsLog.eventType, 'member.nominees_declared')));
    expect(ev.at(-1)!.payload).toMatchObject({ source: 'correction', nominee_count: 1, split: 'sole' });
  });

  it('⛔ the Pariwar Admin cannot apply a correction whose target STOPPED standing after step 1 (a redetermination moved it)', async () => {
    const { client, tx, cid, mid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA));
    // A newer PRE-death version (Feb) — it, not v1, is now the rank's standing version once redetermined.
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-02-01T06:00:00.000Z'), ensureMember: false });
    await seedNomineeDetermination(client, PARIWAR_A, cid, {
      certificateDate: '2026-05-01',
      marks: (await listNomineeDeclarationVersions(tx, PARIWAR_A, mid)).map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
    });
    await expect(decideNomineeCorrectionAsPariwarAdmin(client, step(cid, correctionId, PA))).rejects.toSatisfy(
      refusedWith('target_not_standing'),
    );
  });

  it('⭐ outside the window an APPROVAL is refused, while a DECLINE is still allowed', async () => {
    const { client, tx, cid } = await setup();
    const { correctionId } = await raiseNomineeCorrection(client, raise(cid));
    await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'on'"));
    await tx.execute(sql`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = ${cid}`);
    await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'off'"));
    await expect(decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA))).rejects.toSatisfy(
      refusedWith('outside_state_window'),
    );
    expect((await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA, 'decline'))).step).toBe('declined');
  });

  it('⛔ a step on a correction that is not on this claim is NOT FOUND (→ 404)', async () => {
    const { client, cid } = await setup();
    await expect(decideNomineeCorrectionAsDistrictAdmin(client, step(cid, randomUUID(), DA))).rejects.toSatisfy(refusedWith('not_found'));
    // …including a real correction addressed through a DIFFERENT claim (family 12(a)).
    const other = await setup();
    const { correctionId } = await raiseNomineeCorrection(other.client, raise(other.cid));
    await expect(decideNomineeCorrectionAsDistrictAdmin(client, step(cid, correctionId, DA))).rejects.toSatisfy(refusedWith('not_found'));
  });

  it('⭐ after a DECLINE the rank is free for a NEW request (the one-open rule counts open requests only)', async () => {
    const { client, cid } = await setup();
    const first = await raiseNomineeCorrection(client, raise(cid));
    await decideNomineeCorrectionAsDistrictAdmin(client, step(cid, first.correctionId, DA, 'decline'));
    const second = await raiseNomineeCorrection(client, raise(cid));
    expect(second.correctionId).not.toBe(first.correctionId);
  });

  it('⭐ D17(c) — after rank 1 is DISQUALIFIED the survivor is corrected by the rank it was DECLARED at', async () => {
    const { client, tx, cid } = await setup({ nominees: [{ relationship: 'spouse' }, { relationship: 'son' }] });
    await recordNomineeDisqualificationFinding(bindScopedDb(client), {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      findingId: randomUUID() as never,
      actorId: randomUUID(),
      actorDisplay: 'Investigator',
      rank: 1,
    });
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.declaredRank])).toEqual([[1, 2]]);
    // The survivor sits at effective rank 1, but it is corrected as the rank it was declared at — 2.
    await expect(raiseNomineeCorrection(client, raise(cid, { rank: 1 }))).rejects.toSatisfy(refusedWith('no_standing_version'));
    const res = await raiseNomineeCorrection(client, raise(cid, { rank: 2, proposedRelationship: 'son' }));
    expect(res.correctionId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

async function driveOnToReview(client: ReturnType<typeof getTx>['client'], cid: ClaimId, mid: MemberId) {
  const { projectClaimState } = await import('../../../src/claim/project.js');
  await projectClaimState(client, {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    deceasedMemberId: mid,
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: 'claim.verifier_reviewing',
    payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 'test', actor: 'system' },
    actorId: null,
  });
}

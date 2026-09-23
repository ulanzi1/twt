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

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  NomineeCorrectionRefusedError,
  NomineeDeterminationRequiredError,
  assertNomineeNameCheckForApproval,
  decideNomineeCorrectionAsDistrictAdmin,
  decideNomineeCorrectionAsPariwarAdmin,
  getEffectiveNomineeDeclaration,
  raiseNomineeCorrection,
  type RaiseNomineeCorrectionInput,
} from '../../../src/claim/index.js';
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

async function setup(opts: { relationship?: string; state?: 'verification_in_progress' | 'intake_pending' } = {}) {
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
    nominees: [{ relationship: opts.relationship ?? 'spouse' }],
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

  it('⛔ a PROPOSED relationship of `other` is refused too', async () => {
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

  it('⛔ a correction on a claim that does not exist is refused (before any claim the change is free)', async () => {
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

// Story 6.18 — TENANT ISOLATION for the name check (Task 7, checklist family 3).
//
// ⚠⚠ WHY THIS FILE EXISTS. `grep -c PARIWAR_B` over this story's two live specs returned **0**:
// every one of them seeds, reads and writes inside a single Pariwar, so ⛔ nothing asserted that a
// neighbouring Pariwar cannot reach a claim's name check, its verdicts, or its correction queue.
// The review bullet said so directly: *"checklist family 3 — no cross-Pariwar denial test in the
// domain leg."* This closes the DOMAIN half.
//
// ⭐⭐ THE DISTINCTION THIS SPEC IS BUILT AROUND, because the repo's existing cross-Pariwar tests
// only make half of it. There are TWO independent defences, and they fail differently:
//
//   (a) THE EXPLICIT PREDICATE — every accessor takes a `pariwarId` and puts it in the WHERE.
//       Tested by staying scoped to A and asking for B's data. If the predicate were dropped, this
//       catches it. ⛔ But it proves ⛔ NOTHING about RLS: the session is still A, so the rows were
//       readable all along and only the query excluded them.
//
//   (b) ROW-LEVEL SECURITY — the policy on the table itself. Tested by switching the SESSION SCOPE
//       to B and then asking for A's data **with A's own id as the predicate**. The predicate is now
//       "correct" and must still return nothing, because the rows are ⛔ not visible to this session
//       at all. ⭐ This is what "tenant isolation" actually means, and it is the leg that survives a
//       caller who passes the wrong id — which is the realistic bug.
//
// ⇒ Every read below is asserted BOTH ways, and each is preceded by a positive control in Pariwar A,
//   because an assertion that something is empty is worthless if the seed silently did nothing
//   ([[project_live_db_test_gotchas]] — assert membership, and prove the fixture reached the branch).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  getLatestNomineeNameCheck,
  listClaimsUnderCorrection,
  projectClaimState,
  recordNomineeNameCheck,
  returnToDistrictAdmin,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember, seedNomineeNameCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const DISTRICT_ADMIN = '77777777-7777-7777-7777-777777777777';
const TRUSTEE = '88888888-8888-8888-8888-888888888888';

const returnInput = (claimCaseId: ClaimId, pariwarId: typeof PARIWAR_A | typeof PARIWAR_B) => ({
  claimCaseId,
  pariwarId,
  reasonCode: 'other' as const,
  rationaleCiphertext: 'enc:v1:cross-tenant-attempt',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

async function driveToApproved(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  pariwarId: string,
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: pariwarId as never,
      deceasedMemberId,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
}

describe.skipIf(!hasDatabase)("Story 6.18 — a neighbouring Pariwar cannot reach this claim's name check", () => {
  setupLiveDb();

  /** Seed a claim in Pariwar A with two accounts and a recorded, passing check. */
  async function seedCheckedClaimInA(): Promise<{ cid: ClaimId; mid: MemberId }> {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await driveToApproved(client, cid, mid, PARIWAR_A);
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    return { cid, mid };
  }

  it('⭐⭐ the name-check READ is denied BOTH ways — by the predicate AND by RLS', async () => {
    const { client, tx } = getTx();
    const { cid } = await seedCheckedClaimInA();

    // ── POSITIVE CONTROL — the fixture actually produced a check. Without this, every "null"
    //    below would be satisfied by a seed that silently did nothing.
    const own = await getLatestNomineeNameCheck(tx, PARIWAR_A, cid);
    expect(own, 'the fixture did not record a check — the denials below would be vacuous').not.toBeNull();
    expect(own?.accounts).toHaveLength(2);

    // ── (a) THE EXPLICIT PREDICATE — still scoped to A, but asking for B's data.
    expect(await getLatestNomineeNameCheck(tx, PARIWAR_B, cid)).toBeNull();

    // ── (b) RLS — now scoped to B, asking for A's data with A's OWN id as the predicate.
    //    ⭐ The predicate is "correct" here; only the row-level policy stands between the caller
    //    and another tenant's verdicts. This is the leg that survives a caller passing a wrong id.
    await enterAppScope(client, PARIWAR_B);
    expect(
      await getLatestNomineeNameCheck(tx, PARIWAR_A, cid),
      "a Pariwar B session read Pariwar A's name check — RLS is not holding",
    ).toBeNull();
  });

  it('⭐ a Pariwar B session cannot RECORD a check on a Pariwar A claim, and writes nothing', async () => {
    const { client, tx } = getTx();
    const { cid } = await seedCheckedClaimInA();

    const before = await getLatestNomineeNameCheck(tx, PARIWAR_A, cid);
    expect(before).not.toBeNull();

    await enterAppScope(client, PARIWAR_B);
    await expect(
      recordNomineeNameCheck(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A, // ⚠ the RIGHT id, from the WRONG session — the realistic bug shape.
        nomineeDeclarationToken: 'whatever',
        accounts: [
          { accountRank: 1, accountUpdatedAt: new Date().toISOString(), verdict: 'matches', clericalReason: null },
          { accountRank: 2, accountUpdatedAt: new Date().toISOString(), verdict: 'matches', clericalReason: null },
        ],
        actorId: DISTRICT_ADMIN,
        actorDisplay: 'Intruder (District Admin)',
        actor: 'operator',
      }),
      'a Pariwar B session recorded a check on a Pariwar A claim',
    ).rejects.toThrow();

    // ⭐ And the claim is untouched — a rejection that still wrote would be worse than no guard.
    await enterAppScope(client, PARIWAR_A);
    const after = await getLatestNomineeNameCheck(tx, PARIWAR_A, cid);
    expect(after?.checkedAt).toEqual(before?.checkedAt);

    const events = await tx
      .select({ t: schema.eventsLog.eventType })
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)));
    expect(events.filter((e) => e.t === 'claim.nominee_name_checked')).toHaveLength(1);
  });

  it('⭐ a Pariwar B session cannot RETURN a Pariwar A claim (AC11)', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaimInA();

    await enterAppScope(client, PARIWAR_B);
    // Both shapes are refused: the honest cross-tenant call, and the wrong-session-right-id one.
    await expect(returnToDistrictAdmin(client, returnInput(cid, PARIWAR_B))).rejects.toThrow();
    await expect(returnToDistrictAdmin(client, returnInput(cid, PARIWAR_A))).rejects.toThrow();
  });

  it('⭐ the correction QUEUE is per-tenant — B never sees A\'s returned claim', async () => {
    const { client, tx } = getTx();
    const { cid } = await seedCheckedClaimInA();

    // Put A's claim into the queue for real, so "B sees nothing" is a denial and ⛔ not an
    // empty database.
    await enterAppScope(client, PARIWAR_A);
    await returnToDistrictAdmin(client, returnInput(cid, PARIWAR_A));

    const aRows = await listClaimsUnderCorrection(tx, PARIWAR_A);
    expect(
      aRows.map((r) => String(r.claimCaseId)),
      'the claim never reached the correction queue — the denial below would be vacuous',
    ).toContain(String(cid));

    // ── (a) predicate, and ── (b) RLS, exactly as above.
    expect((await listClaimsUnderCorrection(tx, PARIWAR_B)).map((r) => String(r.claimCaseId))).not.toContain(
      String(cid),
    );

    await enterAppScope(client, PARIWAR_B);
    expect(
      (await listClaimsUnderCorrection(tx, PARIWAR_A)).map((r) => String(r.claimCaseId)),
      "a Pariwar B session listed a Pariwar A claim in the correction queue",
    ).not.toContain(String(cid));
  });
});

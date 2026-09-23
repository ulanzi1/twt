// AC5 site F — the BULK path — live DB (:5433). Story 6.20 (Task 3 / Task 9; AC5, AC11 bulk-path spec).
//
// ⭐ `readNomineeNameCheckFlagsBulk` serves the District Admin's CORRECTION QUEUE **and** the State
// Trustee's CYCLE-FREEZE pending list — the highest-stakes screen. It now derives currency from the
// EFFECTIVE as-at-death declaration (the bulk accessor, ONE query), so a NEW DETERMINATION must flip the
// flag on BOTH lists. Without this spec the highest-stakes surface is untested (`-236` consequence 4).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getCycleFreezePending, listClaimsUnderCorrection } from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

async function approvedClaim() {
  const { client, tx } = getTx();
  const pariwarId = PARIWAR_A;
  await enterAppScope(client, pariwarId);
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await tx.insert(schema.members).values({ memberId: mid, pariwarId, state: 'active', stateEventVersion: 1 });
  await driveClaimTo(client, pariwarId, cid, mid, 'verifier_approved');
  return { client, tx, cid, mid };
}

describe.skipIf(!hasDatabase)('Story 6.20 — a determination flips the BULK name-check flags (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ the District Admin\'s CORRECTION QUEUE: a current `does_not_match` claim LEAVES it on a redetermination', async () => {
    const { client, tx, cid } = await approvedClaim();
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });
    const before = (await listClaimsUnderCorrection(tx, PARIWAR_A)).map((r) => String(r.claimCaseId));
    expect(before, 'the claim never reached the queue — the flip below would be vacuous').toContain(String(cid));

    await seedNomineeDetermination(client, PARIWAR_A, cid); // a NEW determination ⇒ the check is stale
    const after = (await listClaimsUnderCorrection(tx, PARIWAR_A)).map((r) => String(r.claimCaseId));
    expect(after).not.toContain(String(cid));
  });

  it('⭐⭐ the State Trustee\'s CYCLE-FREEZE list: an approved name difference is no longer shown once the check is stale', async () => {
    const { client, tx, cid } = await approvedClaim();
    await seedNomineeNameCheck(client, PARIWAR_A, cid, {
      verdicts: ['clerical_difference', 'matches'],
      clericalReasons: ['initial', null],
    });
    const find = async () =>
      [...(await getCycleFreezePending(tx, PARIWAR_A)).readyToFreeze].find((c) => String(c.claimCaseId) === String(cid));
    const before = await find();
    expect(before, 'the claim is not on the ready list — the flip below would be vacuous').toBeDefined();
    expect(before!.nameDifferenceReasons).toEqual(['initial']);

    await seedNomineeDetermination(client, PARIWAR_A, cid);
    expect((await find())!.nameDifferenceReasons).toEqual([]);
  });
});

// "A death is reported and stands" — live DB (:5433). Story 6.38 (Task 1.3; N1, DL1, AC1).
//
// `isDeathReportStanding` = a `claims` row for the member as the deceased, in ANY state, that ⛔ no
// `member_found_innocent` finding has released (`2026-10-30-423` reading 1; `2026-09-21-238` cl.1). The finding is seeded
// as a RAW row: `recordMemberInnocenceFinding` replays the claim stream, and a `seedClaim` row has ⛔ events.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isDeathReportStanding, isNomineeDeclarationLocked } from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type MemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

async function innocent(tx: Tx, pariwarId: string, claimCaseId: string) {
  await tx.insert(schema.claimNomineeFindings).values({
    findingId: randomUUID() as never,
    claimCaseId: toClaimId(claimCaseId),
    pariwarId: pariwarId as never,
    kind: 'member_found_innocent',
    rank: null,
    recordedByActorId: 'investigator',
    recordedByDisplay: 'Investigator',
  });
}

async function both(tx: Tx, mid: MemberId) {
  const standing = await isDeathReportStanding(tx, PARIWAR_A, mid);
  // DL1: the nominee lock DELEGATES — byte-identical behaviour.
  expect(await isNomineeDeclarationLocked(tx, PARIWAR_A, mid)).toBe(standing);
  return standing;
}

describe.skipIf(!hasDatabase)('Story 6.38 — isDeathReportStanding (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⛔ claim ⇒ false', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, toMemberId(randomUUID()))).toBe(false);
  });

  it.each(['intake_pending', 'denied', 'closed', 'settled'] as const)('a claim in `%s` ⇒ true', async (currentState) => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState });
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, mid)).toBe(true);
  });

  it('a claim + its `member_found_innocent` finding ⇒ false (the release — DL4)', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'denied' });
    await innocent(tx, PARIWAR_A, cid);
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, mid)).toBe(false);
  });

  it('two claims, ONE released ⇒ true', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const released = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'closed' });
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'intake_pending' });
    await innocent(tx, PARIWAR_A, released);
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, mid)).toBe(true);
  });

  it('a claim in ANOTHER Pariwar ⇒ false (tenant-scoped)', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_B, { deceasedMemberId: mid });
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, mid)).toBe(false);
  });

  it('⭐ a claim in ANOTHER Pariwar ⇒ false ON THE PREDICATE\'S OWN — with RLS out of the way (the explicit `c.pariwar_id` filter)', async () => {
    // The case above runs as the app role, where RLS hides the other Pariwar's row whether or not the predicate filters on it —
    // so it cannot tell a predicate that dropped its own tenant filter. Here the connection is the SUPERUSER (⛔ `enterAppScope`):
    // RLS does not apply, and only `c.pariwar_id = …` keeps the other Pariwar's claim out.
    const { tx } = getTx();
    const mid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_B, { deceasedMemberId: mid });
    // Control: this connection SEES the claim in its own Pariwar — so the miss below is the filter, not an empty read.
    expect(await isDeathReportStanding(tx, PARIWAR_B, mid)).toBe(true);
    expect(await isDeathReportStanding(tx, PARIWAR_A, mid)).toBe(false);
  });

  it('⛔ a `nominee_disqualified` finding does ⛔ release', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'denied' });
    await tx.insert(schema.claimNomineeFindings).values({
      findingId: randomUUID() as never,
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      kind: 'nominee_disqualified',
      rank: 1,
      recordedByActorId: 'investigator',
      recordedByDisplay: 'Investigator',
    });
    await enterAppScope(client, PARIWAR_A);
    expect(await both(tx, mid)).toBe(true);
  });
});

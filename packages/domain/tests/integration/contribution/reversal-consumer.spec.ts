// Reversal-consumer reads — live-DB integration (Story 9.5, Task 4; AC1/AC3/AC4).
//
// The consistency proof for the ONLY un-confirm path: a `reconciliation.confirmation-reversed` event
// (Story 9.4 Decision D1; Story 9.8 is the producer) backs a confirmation OUT of every confirmed-reading
// surface, and a subsequent fresh `contribution.confirmed` re-greens the member. Exercised against real
// Postgres under PARIWAR_A inside the per-test BEGIN/ROLLBACK envelope.
//
// The load-bearing property is the PER-CONFIRMATION EVENT-ID CHAIN (Dev Notes "Reversal semantics"): a
// member is live-confirmed iff they hold ≥1 `contribution.confirmed` event id NOT named by any reversal's
// `reversedConfirmedEventId` — NOT "any reversal for (member, pool) ⇒ held forever". So a reversal naming
// C1 leaves a live C2 green (monotonic re-confirm), and a reversal naming an id the member never held
// cannot un-confirm anything.
//
// ── Why we seed events_log directly ─────────────────────────────────────────────────────────────────────
// The attested (yellow) event has a real producer (Story 8.4's `attestContributionUtr`), but the
// `contribution.confirmed` producer is Story 9.4's matcher (not driven here) and the reversal producer is
// Story 9.8 (unbuilt). We hand-craft the confirmed + reversal events to the forward payload contract, with
// an EXPLICIT `eventId` on each confirmation so the reversal can name it. Own-committing writers accumulate
// rows, so we assert MEMBERSHIP + the per-row status, NOT list counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  getMemberAttestedContribution,
  listMemberContributionHistory,
} from '../../../src/contribution/history.js';
import {
  CONFIRMED_EVENT_TYPE,
  listActedMemberIdsForPool,
  listConfirmedContributorsForPool,
} from '../../../src/contribution/read.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  cycleFreezeCommitId as toCycleId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedAlert } from '../_helpers.js';

/** Seed a `contribution.confirmed` with an EXPLICIT event id (so a reversal can name it). Returns the id. */
async function seedConfirmed(
  tx: Db,
  pariwarId: string,
  poolId: string,
  memberId: string,
): Promise<string> {
  const eventId = randomUUID();
  await tx.insert(eventsLog).values({
    eventId,
    streamId: randomUUID(),
    eventType: CONFIRMED_EVENT_TYPE,
    payload: { poolId, memberId },
    eventVersion: 1,
    pariwarId,
  });
  return eventId;
}

/** Seed a `reconciliation.confirmation-reversed` naming a specific confirmed event id (Story 9.4 D1). */
async function seedReversal(
  tx: Db,
  pariwarId: string,
  { poolId, memberId, reversedConfirmedEventId }: { poolId: string; memberId: string; reversedConfirmedEventId: string },
): Promise<void> {
  await tx.insert(eventsLog).values({
    streamId: randomUUID(),
    eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
    payload: { poolId, memberId, reversedConfirmedEventId },
    eventVersion: 1,
    pariwarId,
  });
}

/** Seed a member's real yellow attestation on an alert stream (Story 8.4's producer). Returns the event id. */
async function seedAttestation(
  client: import('pg').PoolClient,
  pariwarId: string,
  { alertId, poolId, memberId, utr }: { alertId: string; poolId: string; memberId: string; utr: string },
): Promise<string> {
  const tr = deriveContributionReference({ memberId: toMemberId(memberId), alertId: toAlertId(alertId) });
  const result = await attestContributionUtr(client, {
    pariwarId: toPariwarId(pariwarId),
    alertId: toAlertId(alertId),
    poolId: toPoolId(poolId),
    memberId: toMemberId(memberId),
    tr,
    utr,
    actorId: memberId,
  });
  return result.eventId;
}

const CYCLE = () => toCycleId(randomUUID());

describe.skipIf(!hasDatabase)('reversal-consumer reads — confirm → reverse → re-confirm (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('THE CHAIN (contributor list): confirmed lists the member; reversal drops them; a fresh confirmation re-lists', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const member = randomUUID();
    const read = () =>
      listConfirmedContributorsForPool(tx, { pariwarId: PARIWAR_A, cycleId: CYCLE(), poolId: toPoolId(poolId) });

    // (1) A confirmation → the member lists (the 9.4 flip, re-asserted at the read layer).
    const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await enterAppScope(client, PARIWAR_A);
    expect((await read()).map((c) => c.memberId)).toContain(member);

    // (2) A reversal naming C1 → the member DROPS off (all their confirmations are now reversed).
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
    expect((await read()).map((c) => c.memberId)).not.toContain(member);

    // (3) A NEW confirmation (new event id) → RE-GREEN (monotonic re-confirm; the reversal did not poison them).
    await seedConfirmed(tx, PARIWAR_A, poolId, member);
    expect((await read()).map((c) => c.memberId)).toContain(member);
  });

  it('THE CHAIN (Yogdaan Bahi row): green → held → re-green for the member’s own passbook row', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const alertId = randomUUID();
    const member = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const contributionId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    const rowStatus = async () => {
      const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
      return history.find((r) => r.contributionId === contributionId)?.status;
    };

    // (1) A confirmation → green.
    const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await enterAppScope(client, PARIWAR_A);
    expect(await rowStatus()).toBe('green');

    // (2) A reversal naming C1 → HELD (confirmed earlier, all reversed) — NOT red, NOT yellow.
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
    expect(await rowStatus()).toBe('held');

    // (3) A NEW confirmation → re-green.
    await seedConfirmed(tx, PARIWAR_A, poolId, member);
    expect(await rowStatus()).toBe('green');
  });

  it('PER-EVENT-ID: a reversal naming C1 leaves a LIVE C2 green (not "any reversal ⇒ held")', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const member = randomUUID();
    const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await seedConfirmed(tx, PARIWAR_A, poolId, member); // C2 — a second, independent confirmation
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
    await enterAppScope(client, PARIWAR_A);

    // C2 is un-reversed → the member is still live-confirmed (green / listed).
    const listed = await listConfirmedContributorsForPool(tx, { pariwarId: PARIWAR_A, cycleId: CYCLE(), poolId: toPoolId(poolId) });
    expect(listed.map((c) => c.memberId)).toContain(member);
  });

  it('DEFENSIVE: a reversal naming an id the member never held cannot un-confirm them', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const member = randomUUID();
    await seedConfirmed(tx, PARIWAR_A, poolId, member);
    // A reversal naming a stray id (never a confirmation this member holds) — must be ignored.
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: randomUUID() });
    await enterAppScope(client, PARIWAR_A);

    const listed = await listConfirmedContributorsForPool(tx, { pariwarId: PARIWAR_A, cycleId: CYCLE(), poolId: toPoolId(poolId) });
    expect(listed.map((c) => c.memberId)).toContain(member);
  });

  it('listActedMemberIdsForPool: the reversal backs out the `confirmed` set but never the `attested` set (8.8 D2)', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const alertId = randomUUID();
    const member = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    // The member both self-attested (yellow) AND was confirmed — then the confirmation is reversed.
    await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
    await enterAppScope(client, PARIWAR_A);

    const acted = await listActedMemberIdsForPool(tx, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      poolId: toPoolId(poolId),
    });
    // Confirmed set drops the member (all confirmations reversed); the attested set is untouched (a
    // reversal walks back a CONFIRMATION, not the member's own yellow claim).
    expect(acted.confirmed).not.toContain(member);
    expect(acted.attested).toContain(member);
  });

  it('getMemberAttestedContribution: the single-row Note read resolves `held` after a reversal', async () => {
    const { client, tx } = getTx();
    const poolId = randomUUID();
    const alertId = randomUUID();
    const member = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const contributionId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
    await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
    await enterAppScope(client, PARIWAR_A);

    const row = await getMemberAttestedContribution(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      contributionId,
    });
    expect(row?.status).toBe('held');
  });
});

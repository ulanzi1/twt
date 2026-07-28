// Pending-match members read — live-DB integration (Story 9.10, Task 1; AC1/AC7).
//
// `listPendingMatchMembersForPool` is the honest data source for the 4h/24h retry-reminder sweep: which
// pool members have self-attested (yellow) but the matcher has NOT yet resolved them (neither a live
// `contribution.confirmed` nor a `contribution.reconciliation-mismatch`)? Exercised against real Postgres,
// mirroring the reversal-consumer.spec.ts + acted-member-ids.spec.ts patterns (own-committing writers
// accumulate rows across a run, so we assert membership, never counts — [[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { listPendingMatchMembersForPool, CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent, seedPool } from '../_helpers.js';

/** Seed a member's real yellow attestation on the alert stream (Story 8.4's producer). */
async function seedAttested(
  client: Parameters<typeof attestContributionUtr>[0],
  pariwarId: string,
  alertId: string,
  poolId: string,
  memberId: string,
  utr = '123456789012',
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

/** Seed a `contribution.confirmed` event with an EXPLICIT event id (so a reversal can name it). */
async function seedConfirmed(tx: Db, pariwarId: string, poolId: string, memberId: string): Promise<string> {
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

/** Seed a `contribution.reconciliation-mismatch` event (Epic 9's forward contract). */
async function seedMismatch(tx: Db, pariwarId: string, poolId: string, memberId: string): Promise<void> {
  await seedEvent(tx, pariwarId, {
    eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
    payload: { poolId, memberId },
  });
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

async function seedPoolForCycle(tx: Db, pariwarId: string): Promise<{ poolId: string }> {
  const cycleId = randomUUID();
  const claimCaseId = randomUUID();
  await seedClaim(tx, pariwarId, { claimCaseId });
  const poolId = await seedPool(tx, pariwarId, {
    cycleId,
    claimCaseId,
    poolIndex: 0,
    poolCanonicalIdentifier: `P-2026-07-${Math.floor(Math.random() * 900 + 100)}`,
  });
  return { poolId };
}

describe.skipIf(!hasDatabase)(
  'listPendingMatchMembersForPool — the honest pending-match source (Story 9.10 AC1/AC7)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    it('legitimately EMPTY when no attestation exists', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(randomUUID()),
        poolId: toPoolId(poolId),
      });
      expect(pending).toEqual([]);
    });

    it('attested-only → PRESENT, carrying the attestation instant', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      const row = pending.find((p) => p.memberId === member);
      expect(row).toBeDefined();
      expect(row?.oldestUnresolvedAttestedAt).toBeInstanceOf(Date);
    });

    it('attested + confirmed → ABSENT (resolved green, structurally excluded)', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);
      await seedConfirmed(tx, PARIWAR_A, poolId, member);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).not.toContain(member);
    });

    it('attested + mismatch → ABSENT (resolved red, structurally excluded)', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);
      await seedMismatch(tx, PARIWAR_A, poolId, member);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).not.toContain(member);
    });

    it('attested + confirmed-then-REVERSED → PRESENT again (the reversal returns the member to pending)', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);
      const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
      await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).toContain(member);
    });

    it('a LIVE second confirmation after a reversal of the first → ABSENT again (re-green, not stuck pending)', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);
      const c1 = await seedConfirmed(tx, PARIWAR_A, poolId, member);
      await seedReversal(tx, PARIWAR_A, { poolId, memberId: member, reversedConfirmedEventId: c1 });
      await seedConfirmed(tx, PARIWAR_A, poolId, member);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).not.toContain(member);
    });

    it('scopes to the pool: an attestation on a DIFFERENT pool (same alert) does not leak in', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx, PARIWAR_A);
      const otherPoolId = randomUUID();
      const alertId = randomUUID();
      const member = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, otherPoolId, member);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).not.toContain(member);
    });

    it('cross-tenant: a PARIWAR_B attestation does NOT resolve under a PARIWAR_A read', async () => {
      const { client, tx } = getTx();
      const poolId = randomUUID();
      const alertId = randomUUID();
      const memberB = randomUUID();
      await seedAttested(client, PARIWAR_B, alertId, poolId, memberB);
      await enterAppScope(client, PARIWAR_A);

      const pending = await listPendingMatchMembersForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(pending.map((p) => p.memberId)).not.toContain(memberB);
    });
  },
);

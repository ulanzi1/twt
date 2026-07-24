// Reminder-suppression read — live-DB integration (Story 8.8, Task 6; AC2/D3).
//
// `listActedMemberIdsForPool` is the input to the deadline-reminder suppression decision: it returns
// the CONFIRMED (green) and ATTESTED (yellow) member sets SEPARATELY, on real Postgres, exercising the
// dual-event-type OR query (a `contribution.confirmed` pool-scoped event vs. a `contribution.utr-attested`
// event scoped to the ALERT stream). This is the kind of raw-SQL, JSON-path, multi-event-type logic most
// likely to have a subtle bug — flagged during code review as untested and added here.
//
// ── Why we seed events_log directly for confirmed, but the REAL producer for attested ─────────────────
// Epic 9 owns `contribution.confirmed` and is unbuilt, so confirmed rows are hand-crafted (the forward
// read↔producer payload contract: { poolId, memberId }) — mirroring confirmed-contributors.spec.ts.
// Attested rows go through Story 8.4's real `attestContributionUtr` producer, so the invariant bites
// against the actual event shape, not a hand-built stub.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { listActedMemberIdsForPool } from '../../../src/contribution/read.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent, seedPool } from '../_helpers.js';

/** Seed a `contribution.confirmed` event scoping a member's confirmed contribution to a pool. */
async function seedConfirmed(tx: Db, pariwarId: string, poolId: string, memberId: string): Promise<void> {
  await seedEvent(tx, pariwarId, {
    eventType: 'contribution.confirmed',
    payload: { poolId, memberId },
  });
}

describe.skipIf(!hasDatabase)(
  'listActedMemberIdsForPool — confirmed + attested, kept DISTINCT (PARIWAR_A scope)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    async function seedPoolForCycle(tx: Db): Promise<{ poolId: string }> {
      const cycleId = randomUUID();
      const claimCaseId = randomUUID();
      await seedClaim(tx, PARIWAR_A, { claimCaseId });
      const poolId = await seedPool(tx, PARIWAR_A, {
        cycleId,
        claimCaseId,
        poolIndex: 0,
        poolCanonicalIdentifier: `P-2026-07-${Math.floor(Math.random() * 900 + 100)}`,
      });
      return { poolId };
    }

    async function seedAttested(
      client: Parameters<typeof attestContributionUtr>[0],
      pariwarId: string,
      alertId: string,
      poolId: string,
      memberId: string,
    ): Promise<void> {
      const tr = deriveContributionReference({ memberId: toMemberId(memberId), alertId: toAlertId(alertId) });
      await attestContributionUtr(client, {
        pariwarId: toPariwarId(pariwarId),
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
        memberId: toMemberId(memberId),
        tr,
        utr: '123456789012',
        actorId: memberId,
      });
    }

    it('legitimately EMPTY when neither a confirmed nor an attested event exists', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      await enterAppScope(client, PARIWAR_A);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(randomUUID()),
        poolId: toPoolId(poolId),
      });
      expect(acted).toEqual({ confirmed: [], attested: [] });
    });

    it('a `contribution.confirmed` event lands the member in `confirmed`, never `attested`', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      const member = randomUUID();
      await seedConfirmed(tx, PARIWAR_A, poolId, member);
      await enterAppScope(client, PARIWAR_A);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(randomUUID()),
        poolId: toPoolId(poolId),
      });
      expect(acted.confirmed).toContain(member);
      expect(acted.attested).not.toContain(member);
    });

    it('a `contribution.utr-attested` event scoped to THIS alert lands the member in `attested`, never `confirmed`', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      const member = randomUUID();
      const alertId = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(acted.attested).toContain(member);
      expect(acted.confirmed).not.toContain(member);
    });

    it('a member with BOTH a confirmed event and an attested event appears in BOTH sets — the read does not merge them', async () => {
      // Merging/collapsing is the CALLER's job (Group 1's resolveReminderSuppressions: confirmed wins).
      // This read must return the raw, unmerged truth.
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      const member = randomUUID();
      const alertId = randomUUID();
      await seedConfirmed(tx, PARIWAR_A, poolId, member);
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, alertId, poolId, member);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
      });
      expect(acted.confirmed).toContain(member);
      expect(acted.attested).toContain(member);
    });

    it('an attested event on a DIFFERENT alert (different stream) does not leak into this alert\'s attested set', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      const member = randomUUID();
      const otherAlertId = randomUUID();
      const thisAlertId = randomUUID();
      await enterAppScope(client, PARIWAR_A);
      await seedAttested(client, PARIWAR_A, otherAlertId, poolId, member);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(thisAlertId),
        poolId: toPoolId(poolId),
      });
      expect(acted.attested).not.toContain(member);
    });

    it('scopes to the pool: a confirmed event on a DIFFERENT pool does not leak into this pool\'s set', async () => {
      const { client, tx } = getTx();
      const { poolId } = await seedPoolForCycle(tx);
      const otherPoolId = randomUUID();
      const mineMember = randomUUID();
      const otherMember = randomUUID();
      await seedConfirmed(tx, PARIWAR_A, poolId, mineMember);
      await seedConfirmed(tx, PARIWAR_A, otherPoolId, otherMember);
      await enterAppScope(client, PARIWAR_A);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(randomUUID()),
        poolId: toPoolId(poolId),
      });
      expect(acted.confirmed).toContain(mineMember);
      expect(acted.confirmed).not.toContain(otherMember);
    });

    it('cross-tenant: a confirmed event under PARIWAR_B does NOT resolve under a PARIWAR_A read', async () => {
      const { client, tx } = getTx();
      const poolId = randomUUID();
      const memberB = randomUUID();
      await seedConfirmed(tx, PARIWAR_B, poolId, memberB);
      await enterAppScope(client, PARIWAR_A);

      const acted = await listActedMemberIdsForPool(tx, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(randomUUID()),
        poolId: toPoolId(poolId),
      });
      expect(acted.confirmed).not.toContain(memberB);
    });
  },
);

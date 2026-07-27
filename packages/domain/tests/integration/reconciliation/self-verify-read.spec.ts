// Member self-verify recovery READ + AC4 evidence-inertness — live-DB integration (Story 9.7, Task 4/7).
//
// Proves, against real Postgres inside the per-test BEGIN/ROLLBACK envelope:
//   (1) the read derives the recovery lifecycle from events_log — default → uploaded → resolved — and the
//       mismatch reason surfaces for the surface's empathy copy (AC1/AC2);
//   (2) member-scope isolation (FR-12A / D1) — one member's mismatch never leaks into another's state;
//   (3) AC4 (load-bearing) — appending the self-verify screenshot event is PURE EVIDENCE INTAKE: it emits
//       NO `contribution.confirmed`, mutates NO verdict, and the member stays `red`/`mismatch` after the
//       upload; only a subsequent trustee/matcher `contribution.confirmed` moves them to `resolved`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { attestContributionUtr } from '../../../src/contribution/write.js';
import { appendReconciliationMismatch } from '../../../src/reconciliation/matcher-write.js';
import { appendConfirmedContribution } from '../../../src/reconciliation/matcher-write.js';
import { appendSelfVerifyScreenshotUploaded } from '../../../src/reconciliation/self-verify-write.js';
import { resolveMemberSelfVerifyState } from '../../../src/contribution/self-verify.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedAlert, seedPool } from '../_helpers.js';

const FIXED_INR = 1000;

async function seedAttestation(
  client: import('pg').PoolClient,
  { alertId, poolId, memberId, utr }: { alertId: string; poolId: string; memberId: string; utr: string },
): Promise<void> {
  const tr = deriveContributionReference({ memberId: toMemberId(memberId), alertId: toAlertId(alertId) });
  await attestContributionUtr(client, {
    pariwarId: PARIWAR_A,
    alertId: toAlertId(alertId),
    poolId: toPoolId(poolId),
    memberId: toMemberId(memberId),
    tr,
    utr,
    actorId: memberId,
  });
}

describe.skipIf(!hasDatabase)('member self-verify recovery read (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('AC1/AC2 — derives default → uploaded → resolved, and the mismatch reason surfaces', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000001';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await enterAppScope(client, PARIWAR_A);

    const scope = { pariwarId: PARIWAR_A, memberId: toMemberId(member), poolId: toPoolId(poolId) };

    // No verdict yet — neutral (a still-verifying yellow member: no mismatch, default lifecycle).
    expect(await resolveMemberSelfVerifyState(tx, scope)).toEqual({
      mismatch: false,
      reason: null,
      screenshotUploaded: false,
      status: 'default',
    });

    // A wrong_pool mismatch lands (the 9.4 matcher's red verdict) — now red, default lifecycle, reason set.
    await appendReconciliationMismatch(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      payload: {
        poolId,
        memberId: member,
        alertId,
        utr,
        reason: 'wrong_pool',
        bankStatementEntryId: randomUUID(),
        detectedAt: '2026-07-11T09:00:00.000Z',
        matcherRun: 'test-run',
      },
    });
    expect(await resolveMemberSelfVerifyState(tx, scope)).toEqual({
      mismatch: true,
      reason: 'wrong_pool',
      screenshotUploaded: false,
      status: 'default',
    });

    // The member uploads a self-verify screenshot — lifecycle advances to `uploaded`; STILL red (AC4).
    await appendSelfVerifyScreenshotUploaded(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      actorId: member,
      payload: {
        poolId,
        memberId: member,
        alertId,
        objectKey: `pariwar/${PARIWAR_A}/pool/${poolId}/${randomUUID()}`,
        mismatchReason: 'wrong_pool',
        contentType: 'image/jpeg',
        uploadedAt: '2026-07-11T10:00:00.000Z',
      },
    });
    expect(await resolveMemberSelfVerifyState(tx, scope)).toEqual({
      mismatch: true,
      reason: 'wrong_pool',
      screenshotUploaded: true,
      status: 'uploaded',
    });
  });

  it('AC4 (load-bearing) — the screenshot upload emits NO contribution.confirmed and never greens the member', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000002';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await appendReconciliationMismatch(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      payload: {
        poolId, memberId: member, alertId, utr, reason: 'amount_mismatch',
        bankStatementEntryId: randomUUID(), detectedAt: '2026-07-11T09:00:00.000Z', matcherRun: 'test-run',
      },
    });
    await enterAppScope(client, PARIWAR_A);
    const scope = { pariwarId: PARIWAR_A, memberId: toMemberId(member), poolId: toPoolId(poolId) };

    // Upload two screenshots — evidence only.
    for (let i = 0; i < 2; i += 1) {
      await appendSelfVerifyScreenshotUploaded(client, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        actorId: member,
        payload: {
          poolId, memberId: member, alertId,
          objectKey: `pariwar/${PARIWAR_A}/pool/${poolId}/${randomUUID()}`,
          mismatchReason: 'amount_mismatch', contentType: 'application/pdf',
          uploadedAt: `2026-07-11T1${i}:00:00.000Z`,
        },
      });
    }

    // NO contribution.confirmed exists for (member, pool) — the upload path never adjudicated.
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM events_log WHERE event_type = 'contribution.confirmed'
         AND payload->>'poolId' = $1 AND payload->>'memberId' = $2`,
      [poolId, member],
    );
    expect(rows[0].n).toBe(0);

    // Still red/mismatch after the uploads (only the lifecycle moved to `uploaded`).
    expect(await resolveMemberSelfVerifyState(tx, scope)).toMatchObject({ mismatch: true, status: 'uploaded' });

    // Only a subsequent trustee/matcher confirmation flips it to resolved (and clears the mismatch flag).
    await appendConfirmedContribution(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      payload: {
        poolId, memberId: member, alertId, utr, confirmedAt: '2026-07-12T09:00:00.000Z',
        matchProvenance: {
          bankStatementEntryId: randomUUID(), idempotencyKey: `k:${member}`, matcherRun: 'test-run',
          senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
        },
      },
    });
    expect(await resolveMemberSelfVerifyState(tx, scope)).toMatchObject({
      mismatch: false,
      reason: null,
      status: 'resolved',
    });
  });

  it('D1 — member-scope isolation: one member\'s mismatch never leaks into another member\'s state', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const memberA = randomUUID();
    const memberB = randomUUID();
    await seedAttestation(client, { alertId, poolId, memberId: memberA, utr: '100000000003' });
    await appendReconciliationMismatch(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      payload: {
        poolId, memberId: memberA, alertId, utr: '100000000003', reason: 'wrong_pool',
        bankStatementEntryId: randomUUID(), detectedAt: '2026-07-11T09:00:00.000Z', matcherRun: 'test-run',
      },
    });
    await enterAppScope(client, PARIWAR_A);

    expect(await resolveMemberSelfVerifyState(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(memberA), poolId: toPoolId(poolId) })).toMatchObject({ mismatch: true });
    // Member B — same pool, no verdict of their own → neutral, never A's red.
    expect(await resolveMemberSelfVerifyState(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(memberB), poolId: toPoolId(poolId) })).toEqual({
      mismatch: false,
      reason: null,
      screenshotUploaded: false,
      status: 'default',
    });
  });
});

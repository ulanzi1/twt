// Member contribution-history read — live-DB integration (Story 8.6, Task 1; AC1/AC2).
//
// `listMemberContributionHistory` against real Postgres under PARIWAR_A inside the per-test
// BEGIN/ROLLBACK envelope. Two things are exercised: (1) the read is HARD-SCOPED to the caller's own
// `memberId` + tenant (D1 — it never lists another member's or another Pariwar's rows), and (2) the
// four-state status is derived structurally — green derives EXCLUSIVELY from `contribution.confirmed`,
// red from `contribution.reconciliation-mismatch`, else yellow (alert open) / grey (alert closed).
//
// ── Why we seed events_log directly ─────────────────────────────────────────────────────────────────────
// The attested (yellow) event has a real producer (Story 8.4's `attestContributionUtr`), but green/red are
// Epic 9's producers and are unbuilt (D3) — so the verdict events are hand-crafted to the forward payload
// contract ({ memberId, poolId }). Own-committing writers accumulate rows, so we assert MEMBERSHIP + the
// per-row status, NOT list counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  CONTRIBUTION_MISMATCH_EVENT_TYPE,
  listMemberContributionHistory,
} from '../../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedAlert, seedEvent } from '../_helpers.js';

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

/** Seed an Epic-9 reconciliation VERDICT event (confirmed=green / mismatch=red) for (member, pool). */
async function seedVerdict(
  tx: Db,
  pariwarId: string,
  eventType: typeof CONFIRMED_EVENT_TYPE | typeof CONTRIBUTION_MISMATCH_EVENT_TYPE,
  poolId: string,
  memberId: string,
): Promise<void> {
  await seedEvent(tx, pariwarId, { eventType, payload: { poolId, memberId } });
}

describe.skipIf(!hasDatabase)('listMemberContributionHistory — member self-view (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('D2: legitimately EMPTY when the member has attested nothing', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const history = await listMemberContributionHistory(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
    });
    expect(history).toEqual([]);
  });

  it('lists the member’s OWN attested contribution (membership, not counts)', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    const row = history.find((r) => r.contributionId === eventId);
    expect(row).toBeDefined();
    expect(row?.poolId).toBe(poolId);
    expect(row?.utr).toBe('123456789012');
  });

  it('D1 member-scope: another member’s attested contribution does NOT appear', async () => {
    const { client, tx } = getTx();
    const me = randomUUID();
    const other = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: me, utr: '111111111111' });
    await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: other, utr: '222222222222' });
    await enterAppScope(client, PARIWAR_A);

    const mine = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(me) });
    expect(mine.every((r) => r.utr !== '222222222222')).toBe(true);
    expect(mine.some((r) => r.utr === '111111111111')).toBe(true);
  });

  it('status yellow: attested + alert live (told-us-they-paid, verifying)', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.contributionId === eventId)?.status).toBe('yellow');
  });

  it('status green: a `contribution.confirmed` verdict for (member, pool) → green', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    await seedVerdict(tx, PARIWAR_A, CONFIRMED_EVENT_TYPE, poolId, member);
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.contributionId === eventId)?.status).toBe('green');
  });

  it('THE GUARD: a confirmed verdict for a DIFFERENT member does NOT turn this member’s row green', async () => {
    const { client, tx } = getTx();
    const me = randomUUID();
    const other = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: me, utr: '123456789012' });
    // Someone else in the SAME pool is confirmed — must not leak green onto MY row (member-scoped verdict).
    await seedVerdict(tx, PARIWAR_A, CONFIRMED_EVENT_TYPE, poolId, other);
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(me) });
    expect(history.find((r) => r.contributionId === eventId)?.status).toBe('yellow');
  });

  it('status red: a `contribution.reconciliation-mismatch` verdict for (member, pool) → red', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    await seedVerdict(tx, PARIWAR_A, CONTRIBUTION_MISMATCH_EVENT_TYPE, poolId, member);
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.contributionId === eventId)?.status).toBe('red');
  });

  it('status grey: attested + alert closed with no verdict (on record, unreconciled)', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'closed' });
    const eventId = await seedAttestation(client, PARIWAR_A, { alertId, poolId, memberId: member, utr: '123456789012' });
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.contributionId === eventId)?.status).toBe('grey');
  });

  it('newest-first: rows are ordered by attestation instant DESC', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId, currentState: 'live' });
    // Seed two attested events directly with EXPLICIT occurred_at (the producer would tie them at now()).
    const older = randomUUID();
    const newer = randomUUID();
    const tr = (m: string) => deriveContributionReference({ memberId: toMemberId(m), alertId: toAlertId(alertId) });
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventVersion: 10,
      eventType: 'contribution.utr-attested',
      occurredAt: new Date('2026-06-01T00:00:00Z'),
      payload: { actor: 'member', trigger: 'contribution.utr_attested', poolId, memberId: member, tr: tr(older), utr: '100000000001', attestation_only: true },
    });
    await seedEvent(tx, PARIWAR_A, {
      streamId: alertId,
      eventVersion: 11,
      eventType: 'contribution.utr-attested',
      occurredAt: new Date('2026-06-20T00:00:00Z'),
      payload: { actor: 'member', trigger: 'contribution.utr_attested', poolId, memberId: member, tr: tr(newer), utr: '100000000002', attestation_only: true },
    });
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    const idxNewer = history.findIndex((r) => r.utr === '100000000002');
    const idxOlder = history.findIndex((r) => r.utr === '100000000001');
    expect(idxNewer).toBeGreaterThanOrEqual(0);
    expect(idxOlder).toBeGreaterThan(idxNewer); // newer appears before older
  });

  it('cross-tenant: a PARIWAR_B attestation does NOT resolve under a PARIWAR_A read', async () => {
    const { client, tx } = getTx();
    const member = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    await seedAlert(tx, PARIWAR_B, { alertId, currentState: 'live' });
    await seedAttestation(client, PARIWAR_B, { alertId, poolId, memberId: member, utr: '123456789012' });
    await enterAppScope(client, PARIWAR_A);

    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history).toEqual([]);
  });
});

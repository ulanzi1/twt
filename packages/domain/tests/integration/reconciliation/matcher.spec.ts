// UTR matcher pipeline — live-DB integration (Story 9.4, Task 6; AC3/AC5/AC6). The HEADLINE proof: a real
// matcher run flips a seeded member's contribution status yellow → green at the READ layer, with ZERO
// changes to the Story 8.3 contributor list + the Story 8.6 Yogdaan Bahi (they were the forward contract),
// plus the monotonic-confirmation invariant (the pre-read no-op + the append-only DB rejecting a mutation)
// and the wrong-pool non-remap (AC6).
//
// Runs the DOMAIN half of the matcher against real Postgres inside the per-test BEGIN/ROLLBACK envelope: the
// input reads (listCyclePools / listAlertAttestations / listEntriesForPools / listExistingVerdictKeys), the
// pure matchPool, and the verdict writers (appendConfirmedContribution / appendReconciliationMismatch). The
// apps/jobs worker's own-committing orchestration is covered by its control-flow suite; here we prove the
// data path end-to-end at the read layer.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  getCycleAlert,
  hasConfirmedContribution,
  listAlertAttestations,
  listConfirmedEntryIds,
  listCyclePools,
  listExistingVerdictKeys,
  resolveAlertLiveWindow,
  verdictKey,
} from '../../../src/reconciliation/matcher-reads.js';
import { listEntriesForPools, persistStatementEntries } from '../../../src/reconciliation/entries.js';
import { matchPool } from '../../../src/reconciliation/matcher.js';
import {
  appendConfirmedContribution,
  appendReconciliationMismatch,
} from '../../../src/reconciliation/matcher-write.js';
import { attestContributionUtr } from '../../../src/contribution/write.js';
import { listConfirmedContributorsForPool } from '../../../src/contribution/read.js';
import { listMemberContributionHistory } from '../../../src/contribution/history.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import { bankStatementEntries } from '../../../src/schema/bank_statement_entries.js';
import {
  alertId as toAlertId,
  cycleFreezeCommitId as toCycleId,
  claimId as toClaimId,
  memberId as toMemberId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedAlert, seedPool } from '../_helpers.js';

const FIXED_INR = 1000;
const AMOUNT_PAISE = FIXED_INR * 100;

/** Seed a member's real yellow attestation (Story 8.4's producer) on the alert stream. Returns the tr. */
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

/** Seed a persisted bank_statement_entries row directly (bypassing the re-parse — the worker's Phase 2). */
async function seedEntry(
  tx: Db,
  { entryId, poolId, utr, amount, claimCaseId }: { entryId: string; poolId: string; utr: string; amount: number; claimCaseId: string },
): Promise<void> {
  await tx.insert(bankStatementEntries).values({
    entryId: entryId as never,
    pariwarId: PARIWAR_A,
    poolId: toPoolId(poolId),
    statementEventId: randomUUID(),
    claimCaseId: toClaimId(claimCaseId),
    bankCode: 'sbi',
    transactionIdUtr: utr,
    senderVpa: null,
    amount,
    transactionDate: '2026-07-10',
    entryType: 'credit',
    sourceAccount: null,
    parserVersion: 'sbi@1',
  });
}

/** Run the domain matcher pipeline for a cycle exactly as the worker does (reads → matchPool → emit). */
async function runMatcherOnce(
  tx: Db,
  client: import('pg').PoolClient,
  cycleId: string,
): Promise<{ confirmed: number; mismatched: number; noop: number }> {
  const alert = await getCycleAlert(tx, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId) });
  if (!alert || alert.currentState !== 'live') return { confirmed: 0, mismatched: 0, noop: 0 };
  const pools = await listCyclePools(tx, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId) });
  const attestations = await listAlertAttestations(tx, { pariwarId: PARIWAR_A, alertId: alert.alertId });
  const entries = await listEntriesForPools(tx, { pariwarId: PARIWAR_A, poolIds: pools.map((p) => p.poolId) });
  const existing = await listExistingVerdictKeys(tx, { pariwarId: PARIWAR_A, alertId: alert.alertId });
  const claimedEntryIds = new Set(await listConfirmedEntryIds(tx, { pariwarId: PARIWAR_A, alertId: alert.alertId }));
  const window = await resolveAlertLiveWindow(tx, { pariwarId: PARIWAR_A, alertId: alert.alertId });

  let confirmed = 0;
  let mismatched = 0;
  let noop = 0;
  for (const p of pools) {
    const result = matchPool({
      poolId: p.poolId,
      attestations: attestations.filter((a) => a.poolId === p.poolId),
      entries,
      fixedAmount: p.fixedAmount,
      window,
      claimedEntryIds,
    });
    for (const c of result.confirmations) claimedEntryIds.add(c.entryId);
    for (const c of result.confirmations) {
      if (existing.confirmed.has(verdictKey(c.poolId, c.memberId))) { noop += 1; continue; }
      if (await hasConfirmedContribution(tx, { pariwarId: PARIWAR_A, poolId: c.poolId, memberId: c.memberId })) { noop += 1; continue; }
      await appendConfirmedContribution(client, {
        pariwarId: PARIWAR_A,
        alertId: alert.alertId,
        payload: {
          poolId: c.poolId,
          memberId: c.memberId,
          alertId: c.alertId,
          utr: c.utr,
          confirmedAt: '2026-07-11T09:00:00.000Z',
          matchProvenance: {
            bankStatementEntryId: c.entryId,
            idempotencyKey: `k:${c.memberId}:${c.entryId}`,
            matcherRun: 'test-run',
            senderVpaCheck: c.senderVpaCheck,
          },
        },
      });
      confirmed += 1;
    }
    for (const m of result.mismatches) {
      if (m.reason !== 'wrong_pool' && m.reason !== 'amount_mismatch' && m.reason !== 'entry_already_claimed') continue; // the emittable set (no premature no_statement_entry)
      if (existing.confirmed.has(verdictKey(m.poolId, m.memberId))) { noop += 1; continue; }
      if (existing.mismatched.has(verdictKey(m.poolId, m.memberId, m.reason))) { noop += 1; continue; }
      await appendReconciliationMismatch(client, {
        pariwarId: PARIWAR_A,
        alertId: alert.alertId,
        payload: {
          poolId: m.poolId,
          memberId: m.memberId,
          alertId: m.alertId,
          utr: m.utr,
          reason: m.reason,
          bankStatementEntryId: m.entryId,
          detectedAt: '2026-07-11T09:00:00.000Z',
          matcherRun: 'test-run',
        },
      });
      mismatched += 1;
    }
  }
  return { confirmed, mismatched, noop };
}

describe.skipIf(!hasDatabase)('UTR matcher — live-DB pipeline (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('AC3 — a real match flips the member yellow → green at BOTH read surfaces (zero read changes)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000001';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId, utr, amount: AMOUNT_PAISE, claimCaseId });

    // BEFORE — yellow (attested, not confirmed).
    await enterAppScope(client, PARIWAR_A);
    const beforeHistory = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(beforeHistory.find((r) => r.poolId === poolId)?.status).toBe('yellow');
    const beforeContributors = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    expect(beforeContributors.some((c) => c.memberId === member)).toBe(false);

    // RUN the matcher.
    const stats = await runMatcherOnce(tx, client, cycleId);
    expect(stats).toMatchObject({ confirmed: 1, mismatched: 0 });

    // AFTER — green, with ZERO changes to those reads.
    const afterHistory = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(afterHistory.find((r) => r.poolId === poolId)?.status).toBe('green');
    const afterContributors = await listConfirmedContributorsForPool(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      poolId: toPoolId(poolId),
    });
    expect(afterContributors.some((c) => c.memberId === member)).toBe(true);
  });

  it('AC5a — a re-run over an already-confirmed member is an idempotent NO-OP (no second confirm)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000002';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId, utr, amount: AMOUNT_PAISE, claimCaseId });
    await enterAppScope(client, PARIWAR_A);

    const first = await runMatcherOnce(tx, client, cycleId);
    expect(first.confirmed).toBe(1);
    const second = await runMatcherOnce(tx, client, cycleId);
    expect(second.confirmed).toBe(0);
    expect(second.noop).toBeGreaterThanOrEqual(1);

    // Exactly ONE confirmed event exists for (member, pool).
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM events_log WHERE event_type = 'contribution.confirmed'
         AND payload->>'poolId' = $1 AND payload->>'memberId' = $2`,
      [poolId, member],
    );
    expect(rows[0].n).toBe(1);
  });

  it('AC5c — the append-only events_log rejects a direct un-confirm mutation (structural)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000003';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId, utr, amount: AMOUNT_PAISE, claimCaseId });
    await enterAppScope(client, PARIWAR_A);
    await runMatcherOnce(tx, client, cycleId);

    // A direct UPDATE that would "un-confirm" the event must fail at the DB (Story 1.3 immutability trigger).
    await expect(
      client.query(
        `UPDATE events_log SET event_type = 'contribution.reconciliation-mismatch'
           WHERE event_type = 'contribution.confirmed' AND payload->>'memberId' = $1`,
        [member],
      ),
    ).rejects.toThrow();
  });

  it('AC6 — a wrong-pool deposit is a mismatch (red), never a silent remap / confirm', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimA = randomUUID();
    const claimB = randomUUID();
    const poolA = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId: claimA, poolIndex: 0, fixedAmount: FIXED_INR, currentState: 'live' });
    const poolB = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId: claimB, poolIndex: 1, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live', poolCount: 2 });
    const member = randomUUID();
    const utr = '100000000004';
    // The member is assigned to pool A but the matching deposit landed in pool B's statement.
    await seedAttestation(client, { alertId, poolId: poolA, memberId: member, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId: poolB, utr, amount: AMOUNT_PAISE, claimCaseId: claimB });
    await enterAppScope(client, PARIWAR_A);

    const stats = await runMatcherOnce(tx, client, cycleId);
    expect(stats).toMatchObject({ confirmed: 0, mismatched: 1 });

    // No confirmation for the member; a mismatch (red) exists on pool A (the assigned pool), NOT a remap to B.
    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.poolId === poolA)?.status).toBe('red');
    const contributorsA = await listConfirmedContributorsForPool(tx, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolId: toPoolId(poolA) });
    const contributorsB = await listConfirmedContributorsForPool(tx, { pariwarId: PARIWAR_A, cycleId: toCycleId(cycleId), poolId: toPoolId(poolB) });
    expect(contributorsA.some((c) => c.memberId === member)).toBe(false);
    expect(contributorsB.some((c) => c.memberId === member)).toBe(false);
  });

  it('a UTR-less / no-matching-entry attestation stays PENDING (yellow) — no premature red', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    await seedAttestation(client, { alertId, poolId, memberId: member, utr: '100000000005' });
    // No matching entry seeded — the deposit simply hasn't been reconciled yet.
    await enterAppScope(client, PARIWAR_A);

    const stats = await runMatcherOnce(tx, client, cycleId);
    expect(stats).toMatchObject({ confirmed: 0, mismatched: 0 });
    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.poolId === poolId)?.status).toBe('yellow');
  });

  it('Task 2/AC4 — persistStatementEntries is idempotent on the deterministic entry_id (replay-safe)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);

    const entryId = randomUUID();
    const row = {
      entryId: entryId as never,
      pariwarId: PARIWAR_A,
      poolId: toPoolId(poolId),
      statementEventId: randomUUID(),
      claimCaseId: toClaimId(claimCaseId),
      bankCode: 'sbi',
      transactionIdUtr: '100000000007',
      senderVpa: null,
      amount: AMOUNT_PAISE,
      transactionDate: '2026-07-10',
      entryType: 'credit',
      sourceAccount: null,
      parserVersion: 'sbi@1',
    };
    const first = await persistStatementEntries(tx, [row]);
    const second = await persistStatementEntries(tx, [row]); // a re-parse reproduces the identical id
    expect(first).toBe(1);
    expect(second).toBe(0); // ON CONFLICT DO NOTHING — no duplicate

    const entries = await listEntriesForPools(tx, { pariwarId: PARIWAR_A, poolIds: [toPoolId(poolId)] });
    expect(entries.filter((e) => e.entryId === entryId)).toHaveLength(1);
  });

  it('AC2 — an amount mismatch (₹900 into a ₹1000 pool) is red, never confirmed', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const member = randomUUID();
    const utr = '100000000006';
    await seedAttestation(client, { alertId, poolId, memberId: member, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId, utr, amount: 90_000, claimCaseId }); // ₹900
    await enterAppScope(client, PARIWAR_A);

    const stats = await runMatcherOnce(tx, client, cycleId);
    expect(stats).toMatchObject({ confirmed: 0, mismatched: 1 });
    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(member) });
    expect(history.find((r) => r.poolId === poolId)?.status).toBe('red');
  });

  it('Patch (code review) — an entry confirmed on tick 1 can never back a DIFFERENT member\'s confirmation on tick 2', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = await seedPool(tx, PARIWAR_A, { cycleId, claimCaseId, fixedAmount: FIXED_INR, currentState: 'live' });
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    const memberOne = randomUUID();
    const memberTwo = randomUUID();
    const utr = '100000000008';
    await seedAttestation(client, { alertId, poolId, memberId: memberOne, utr });
    await seedEntry(tx, { entryId: randomUUID(), poolId, utr, amount: AMOUNT_PAISE, claimCaseId });
    await enterAppScope(client, PARIWAR_A);

    const first = await runMatcherOnce(tx, client, cycleId);
    expect(first).toMatchObject({ confirmed: 1, mismatched: 0 });

    // A SECOND member now attests the IDENTICAL utr (a duplicate/forwarded UTR) on a LATER tick.
    await seedAttestation(client, { alertId, poolId, memberId: memberTwo, utr });
    const second = await runMatcherOnce(tx, client, cycleId);

    expect(second).toMatchObject({ confirmed: 0, mismatched: 1 }); // NEVER a second confirmation for the same entry.
    const history = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(memberTwo) });
    expect(history.find((r) => r.poolId === poolId)?.status).toBe('red');
    // memberOne's original confirmation is untouched (monotonic — never reverted).
    const historyOne = await listMemberContributionHistory(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(memberOne) });
    expect(historyOne.find((r) => r.poolId === poolId)?.status).toBe('green');
  });

  it('Patch (code review) — resolveAlertLiveWindow resolves the AC2 window from the alert\'s own lifecycle events', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const alertId = await seedAlert(tx, PARIWAR_A, { cycleId, currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);

    // No lifecycle events yet — unbounded on both sides.
    const empty = await resolveAlertLiveWindow(tx, { pariwarId: PARIWAR_A, alertId: toAlertId(alertId) });
    expect(empty).toEqual({});

    await client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
       VALUES ($1, 'alert.live', '{}'::jsonb, 101, NULL, $2, $3)`,
      [alertId, PARIWAR_A, '2026-07-01T00:00:00.000Z'],
    );
    const openOnly = await resolveAlertLiveWindow(tx, { pariwarId: PARIWAR_A, alertId: toAlertId(alertId) });
    expect(openOnly).toEqual({ startInclusive: '2026-07-01T00:00:00.000Z' });

    await client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
       VALUES ($1, 'alert.closed', '{}'::jsonb, 102, NULL, $2, $3)`,
      [alertId, PARIWAR_A, '2026-07-15T00:00:00.000Z'],
    );
    const closed = await resolveAlertLiveWindow(tx, { pariwarId: PARIWAR_A, alertId: toAlertId(alertId) });
    expect(closed).toEqual({ startInclusive: '2026-07-01T00:00:00.000Z', endInclusive: '2026-07-15T00:00:00.000Z' });
  });
});

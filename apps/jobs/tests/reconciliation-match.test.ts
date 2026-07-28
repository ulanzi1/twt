// Reconciliation matcher worker — orchestration unit tests (Story 9.4, Task 3/5/6; AC1/AC5/AC8).
//
// WHY mocks, not live-DB: this suite verifies the worker's CONTROL FLOW + emission POLICY + AR-45 failure
// isolation — the DB-backed match/emit/read semantics are the load-bearing live suite in
// packages/domain/tests/integration/reconciliation/matcher.spec.ts (the yellow→green flip, monotonic no-op,
// append-only rejection, wrong-pool→red). Here: the enqueue envelope/singletonKey, the live-alert recovery
// sweep, and the worker's re-parse→persist→match→emit pipeline with the pure matchPool intact.

import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { withPariwarScopeMock, getCycleAlertMock, listCyclePoolsMock, listPoolStatementUploadsMock, listAlertAttestationsMock, listExistingVerdictKeysMock, listConfirmedEntryIdsMock, resolveAlertLiveWindowMock, persistStatementEntriesMock, listEntriesForPoolsMock, hasConfirmedContributionMock, appendConfirmedMock, appendMismatchMock, createKeyedStoreMock, parseStatementMock, getBytesMock } =
  vi.hoisted(() => ({
    withPariwarScopeMock: vi.fn(),
    getCycleAlertMock: vi.fn(),
    listCyclePoolsMock: vi.fn(),
    listPoolStatementUploadsMock: vi.fn(),
    listAlertAttestationsMock: vi.fn(),
    listExistingVerdictKeysMock: vi.fn(),
    listConfirmedEntryIdsMock: vi.fn(),
    resolveAlertLiveWindowMock: vi.fn(),
    persistStatementEntriesMock: vi.fn(),
    listEntriesForPoolsMock: vi.fn(),
    hasConfirmedContributionMock: vi.fn(),
    appendConfirmedMock: vi.fn(),
    appendMismatchMock: vi.fn(),
    createKeyedStoreMock: vi.fn(),
    parseStatementMock: vi.fn(),
    getBytesMock: vi.fn(),
  }));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope: withPariwarScopeMock,
    idempotency: { ...actual.idempotency, createKeyedStore: createKeyedStoreMock },
    reconciliation: {
      ...actual.reconciliation,
      // matchPool + verdictKey + mapParsedEntriesToRows stay REAL (pure) — only the DB fns are mocked.
      getCycleAlert: getCycleAlertMock,
      listCyclePools: listCyclePoolsMock,
      listPoolStatementUploads: listPoolStatementUploadsMock,
      listAlertAttestations: listAlertAttestationsMock,
      listExistingVerdictKeys: listExistingVerdictKeysMock,
      listConfirmedEntryIds: listConfirmedEntryIdsMock,
      resolveAlertLiveWindow: resolveAlertLiveWindowMock,
      persistStatementEntries: persistStatementEntriesMock,
      listEntriesForPools: listEntriesForPoolsMock,
      hasConfirmedContribution: hasConfirmedContributionMock,
      appendConfirmedContribution: appendConfirmedMock,
      appendReconciliationMismatch: appendMismatchMock,
    },
  };
});

vi.mock('@twt/bank-parsers', () => ({ parseStatement: parseStatementMock }));

import {
  DEFAULT_MATCHER_SWEEP_LIMIT,
  enqueueReconciliationMatch,
  registerReconciliationMatchWorkers,
  runReconciliationMatch,
  runReconciliationMatchSweep,
  type ReconciliationMatchDeps,
} from '../src/matcher/matcher-worker.js';
import { ResilientCall } from '../src/matcher/resilience.js';
import { QUEUE_NAMES, type JobEnvelope } from '@twt/queue';

const POOL_ID = '00000000-0000-4000-8000-0000000000a1';
const ALERT_ID = '00000000-0000-4000-8000-0000000000e1';
const CYCLE_ID = '00000000-0000-4000-8000-0000000000c1';
const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';

function envelope(cycleId = CYCLE_ID, pariwarId: string | null = PARIWAR_ID): JobEnvelope<{ cycleId: string }> {
  return { requestId: randomUUID(), pariwarId, actorId: null, traceId: 'trace-x', payload: { cycleId } };
}

function fakeStore(claim: 'acquired' | 'already_claimed' = 'acquired') {
  return {
    claim: vi.fn().mockResolvedValue(claim),
    recordResult: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    getResult: vi.fn().mockResolvedValue(null),
  };
}

function baseDeps(over: Partial<ReconciliationMatchDeps> = {}): ReconciliationMatchDeps {
  return {
    pool: {} as ReconciliationMatchDeps['pool'],
    bankStatementStorage: { getBytes: getBytesMock } as unknown as ReconciliationMatchDeps['bankStatementStorage'],
    onAlarm: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // withPariwarScope just invokes the callback with a dummy db/client.
  withPariwarScopeMock.mockImplementation(
    async (_pool: unknown, _pariwarId: unknown, fn: (db: unknown, client: unknown) => unknown) => fn({}, {}),
  );
  createKeyedStoreMock.mockReturnValue(fakeStore('acquired'));
  getCycleAlertMock.mockResolvedValue({ alertId: ALERT_ID, currentState: 'live' });
  listCyclePoolsMock.mockResolvedValue([
    { poolId: POOL_ID, claimCaseId: randomUUID(), fixedAmount: 1000, poolCanonicalIdentifier: 'P-001' },
  ]);
  listPoolStatementUploadsMock.mockResolvedValue([]);
  listAlertAttestationsMock.mockResolvedValue([]);
  listExistingVerdictKeysMock.mockResolvedValue({ confirmed: new Set<string>(), mismatched: new Set<string>() });
  listConfirmedEntryIdsMock.mockResolvedValue(new Set<string>());
  resolveAlertLiveWindowMock.mockResolvedValue({});
  listEntriesForPoolsMock.mockResolvedValue([]);
  persistStatementEntriesMock.mockResolvedValue(0);
  hasConfirmedContributionMock.mockResolvedValue(false);
  appendConfirmedMock.mockResolvedValue('confirmed-event-id');
  appendMismatchMock.mockResolvedValue('mismatch-event-id');
});

describe('enqueueReconciliationMatch', () => {
  it('builds the RECONCILIATION_MATCH envelope with singletonKey = cycle_id', async () => {
    const send = vi.fn().mockResolvedValue('job-id');
    await enqueueReconciliationMatch({ send }, { cycleId: CYCLE_ID, pariwarId: PARIWAR_ID, requestId: 'r', actorId: null, traceId: 't' });
    expect(send).toHaveBeenCalledWith(
      QUEUE_NAMES.RECONCILIATION_MATCH,
      expect.objectContaining({ pariwarId: PARIWAR_ID, payload: { cycleId: CYCLE_ID } }),
      { singletonKey: CYCLE_ID },
    );
  });
});

describe('runReconciliationMatch — control flow', () => {
  it('is a no-op when the cycle alert is not live (AC1 cron scope)', async () => {
    getCycleAlertMock.mockResolvedValue({ alertId: ALERT_ID, currentState: 'published' });
    const result = await runReconciliationMatch(baseDeps(), envelope());
    expect(result.live).toBe(false);
    expect(appendConfirmedMock).not.toHaveBeenCalled();
  });

  it('throws on a missing pariwarId (a real defect — pg-boss retries/DLQs)', async () => {
    await expect(runReconciliationMatch(baseDeps(), envelope(CYCLE_ID, null))).rejects.toThrow(/missing pariwarId/);
  });

  it('re-parses + persists a parsed upload, then confirms a matching attestation (green)', async () => {
    listPoolStatementUploadsMock.mockResolvedValue([
      { statementEventId: randomUUID(), poolId: POOL_ID, claimCaseId: randomUUID(), bankCode: 'sbi', objectKey: 'k1', parsed: true },
    ]);
    getBytesMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    parseStatementMock.mockReturnValue({ entries: [], rejected: [] });
    persistStatementEntriesMock.mockResolvedValue(1);
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-1', memberId: 'm1', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr1', utr: '100000000001' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);

    const result = await runReconciliationMatch(baseDeps(), envelope());

    expect(getBytesMock).toHaveBeenCalledWith('k1');
    expect(parseStatementMock).toHaveBeenCalled();
    expect(persistStatementEntriesMock).toHaveBeenCalled();
    expect(appendConfirmedMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ live: true, confirmed: 1, mismatched: 0 });
  });

  it('emits a wrong-pool mismatch (red) but never a no_statement_entry (pending stays yellow)', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-w', memberId: 'mw', poolId: POOL_ID, alertId: ALERT_ID, tr: 'trw', utr: '100000000002' },
      { attestationEventId: 'att-p', memberId: 'mp', poolId: POOL_ID, alertId: ALERT_ID, tr: 'trp', utr: '100000000009' }, // no entry → pending
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      // wrong pool: entry provenance pool differs from the attestation's assigned pool
      { entryId: 'ew', poolId: '00000000-0000-4000-8000-0000000000b2', transactionIdUtr: '100000000002', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);

    const result = await runReconciliationMatch(baseDeps(), envelope());
    expect(result).toMatchObject({ confirmed: 0, mismatched: 1 });
    expect(appendMismatchMock).toHaveBeenCalledTimes(1);
    // The pending (no-entry) member produced no event at all.
    expect(appendConfirmedMock).not.toHaveBeenCalled();
  });

  it('Story 9.11 (AC1/AC7) — an OVER deposit is a red amount_mismatch, ZERO confirmations, carrying the amounts', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-o', memberId: 'mo', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tro', utr: '100000000003' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      // correct pool, but ₹1,100 (110,000 paise) against the ₹1,000 (100,000 paise) fixed amount ⇒ over.
      { entryId: 'eo', poolId: POOL_ID, transactionIdUtr: '100000000003', amount: 110_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);

    const result = await runReconciliationMatch(baseDeps(), envelope());

    // Never green — the amount branch short-circuits before the confirmation append (the 9.5 invariant).
    expect(appendConfirmedMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ confirmed: 0, mismatched: 1 });
    expect(appendMismatchMock).toHaveBeenCalledTimes(1);
    // The committed mismatch payload carries the durable over/under fact (deposited > expected ⇒ over).
    const payload = appendMismatchMock.mock.calls[0]![1].payload;
    expect(payload).toMatchObject({
      reason: 'amount_mismatch',
      depositedAmountPaise: 110_000,
      expectedAmountPaise: 100_000,
    });
  });

  it('Story 9.11 (AC1) — a wrong-pool mismatch payload carries NEITHER amount (no comparison was made)', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-w', memberId: 'mw', poolId: POOL_ID, alertId: ALERT_ID, tr: 'trw', utr: '100000000004' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'ew', poolId: '00000000-0000-4000-8000-0000000000b2', transactionIdUtr: '100000000004', amount: 110_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);

    await runReconciliationMatch(baseDeps(), envelope());
    const payload = appendMismatchMock.mock.calls[0]![1].payload;
    expect(payload.reason).toBe('wrong_pool');
    expect(payload.depositedAmountPaise).toBeUndefined();
    expect(payload.expectedAmountPaise).toBeUndefined();
  });

  it('AC5a — an already-confirmed member is a monotonic no-op (no re-emit)', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-1', memberId: 'm1', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr1', utr: '100000000001' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    listExistingVerdictKeysMock.mockResolvedValue({ confirmed: new Set([`${POOL_ID}:m1`]), mismatched: new Set<string>() });

    const result = await runReconciliationMatch(baseDeps(), envelope());
    expect(appendConfirmedMock).not.toHaveBeenCalled();
    expect(result.noop).toBeGreaterThanOrEqual(1);
  });

  it('AC8 — a storage outage on a blob defers it (no re-parse, no crash), never fails the run', async () => {
    listPoolStatementUploadsMock.mockResolvedValue([
      { statementEventId: randomUUID(), poolId: POOL_ID, claimCaseId: randomUUID(), bankCode: 'sbi', objectKey: 'k-down', parsed: true },
    ]);
    // A ResilientCall wired to fail fast (1 attempt, no real backoff), driven by an always-throwing getBytes.
    getBytesMock.mockRejectedValue(new Error('gcs down'));
    const storageCall = new ResilientCall('bank-statement-storage', { attempts: 1, sleep: async () => undefined });
    const onAlarm = vi.fn();

    const result = await runReconciliationMatch(baseDeps({ storageCall, onAlarm }), envelope());

    expect(parseStatementMock).not.toHaveBeenCalled();
    expect(persistStatementEntriesMock).not.toHaveBeenCalled();
    expect(onAlarm).toHaveBeenCalledWith(expect.stringMatching(/blob fetch failed/));
    expect(result.live).toBe(true); // the run completes (deferred to the next tick), never crashes.
  });

  it('D6 — enqueues the confirmed-notify seam best-effort; a failed enqueue never fails the confirm', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-1', memberId: 'm1', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr1', utr: '100000000001' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    const enqueueConfirmedNotify = vi.fn().mockRejectedValue(new Error('queue down'));
    const onAlarm = vi.fn();

    const result = await runReconciliationMatch(baseDeps({ enqueueConfirmedNotify, onAlarm }), envelope());

    expect(enqueueConfirmedNotify).toHaveBeenCalledWith(expect.objectContaining({ memberId: 'm1', amountPaise: 100_000 }));
    expect(result.confirmed).toBe(1); // the confirm still succeeded despite the enqueue failure.
    expect(onAlarm).toHaveBeenCalledWith(expect.stringMatching(/confirmed-notify enqueue failed/));
  });

  it('Story 9.7 — enqueues the MISMATCH-notify seam best-effort; a failed enqueue never fails the verdict', async () => {
    // A wrong-pool mismatch (the emittable red path), plus a rejecting mismatch-notify enqueue.
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-w', memberId: 'mw', poolId: POOL_ID, alertId: ALERT_ID, tr: 'trw', utr: '100000000002' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'ew', poolId: '00000000-0000-4000-8000-0000000000b2', transactionIdUtr: '100000000002', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    const enqueueMismatchNotify = vi.fn().mockRejectedValue(new Error('queue down'));
    const onAlarm = vi.fn();

    const result = await runReconciliationMatch(baseDeps({ enqueueMismatchNotify, onAlarm }), envelope());

    // The push fired post-commit with the machine reason-code — and the mismatch verdict still succeeded.
    expect(enqueueMismatchNotify).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'mw', poolId: POOL_ID, reason: 'wrong_pool' }),
    );
    expect(result.mismatched).toBe(1);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringMatching(/mismatch-notify enqueue failed/));
  });

  it('Story 9.7 — omitting enqueueMismatchNotify simply skips the push (tests/observers)', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-w', memberId: 'mw', poolId: POOL_ID, alertId: ALERT_ID, tr: 'trw', utr: '100000000002' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'ew', poolId: '00000000-0000-4000-8000-0000000000b2', transactionIdUtr: '100000000002', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    const result = await runReconciliationMatch(baseDeps(), envelope());
    expect(result.mismatched).toBe(1); // no push wired ⇒ no throw, verdict still emitted.
  });

  it('Patch (code review) — an entry already bound to a PRIOR tick\'s confirmation never backs a second member', async () => {
    // A different member now attests the SAME utr as a prior tick's already-confirmed entry.
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-2', memberId: 'm2', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr2', utr: '100000000001' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    listConfirmedEntryIdsMock.mockResolvedValue(new Set(['e1'])); // a prior tick already confirmed m1 against e1.

    const result = await runReconciliationMatch(baseDeps(), envelope());

    expect(appendConfirmedMock).not.toHaveBeenCalled();
    expect(appendMismatchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ payload: expect.objectContaining({ memberId: 'm2', reason: 'entry_already_claimed' }) }),
    );
    expect(result).toMatchObject({ confirmed: 0, mismatched: 1 });
  });

  it('Patch (code review) — the AC2 timestamp window is wired from the alert\'s own live-window bounds', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-1', memberId: 'm1', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr1', utr: '100000000001' },
    ]);
    // The entry's transaction_date is BEFORE the alert went live — outside the resolved window.
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-06-01', senderVpa: null, entryType: 'credit' },
    ]);
    resolveAlertLiveWindowMock.mockResolvedValue({ startInclusive: '2026-07-01T00:00:00.000Z' });

    const result = await runReconciliationMatch(baseDeps(), envelope());

    expect(appendConfirmedMock).not.toHaveBeenCalled(); // out-of-window → no_statement_entry (pending, not emitted).
    expect(result).toMatchObject({ confirmed: 0, mismatched: 0 });
  });

  it('Patch (code review) — a claim() failure is isolated to that verdict, never crashes the whole run', async () => {
    listAlertAttestationsMock.mockResolvedValue([
      { attestationEventId: 'att-1', memberId: 'm1', poolId: POOL_ID, alertId: ALERT_ID, tr: 'tr1', utr: '100000000001' },
    ]);
    listEntriesForPoolsMock.mockResolvedValue([
      { entryId: 'e1', poolId: POOL_ID, transactionIdUtr: '100000000001', amount: 100_000, transactionDate: '2026-07-10', senderVpa: null, entryType: 'credit' },
    ]);
    createKeyedStoreMock.mockReturnValue({
      claim: vi.fn().mockRejectedValue(new Error('keyed-store DB blip')),
      recordResult: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      getResult: vi.fn().mockResolvedValue(null),
    });
    const onAlarm = vi.fn();

    const result = await runReconciliationMatch(baseDeps({ onAlarm }), envelope());

    expect(result).toMatchObject({ live: true }); // never crashes the whole run.
    expect(appendConfirmedMock).not.toHaveBeenCalled();
    expect(onAlarm).toHaveBeenCalledWith(expect.stringMatching(/claim failed/));
  });
});

describe('runReconciliationMatchSweep', () => {
  it('re-enqueues one job per live alert (cross-tenant scan)', async () => {
    const send = vi.fn().mockResolvedValue('job-id');
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ cycle_id: CYCLE_ID, pariwar_id: PARIWAR_ID }] }) };
    const reEnqueued = await runReconciliationMatchSweep(baseDeps({ pool: pool as unknown as ReconciliationMatchDeps['pool'] }), { send });
    expect(reEnqueued).toBe(1);
    expect(send).toHaveBeenCalledWith(QUEUE_NAMES.RECONCILIATION_MATCH, expect.anything(), { singletonKey: CYCLE_ID });
  });

  it('alarms (non-silently) when the batch cap is hit', async () => {
    const send = vi.fn().mockResolvedValue('job-id');
    const rows = Array.from({ length: DEFAULT_MATCHER_SWEEP_LIMIT }, () => ({ cycle_id: randomUUID(), pariwar_id: PARIWAR_ID }));
    const pool = { query: vi.fn().mockResolvedValue({ rows }) };
    const onAlarm = vi.fn();
    await runReconciliationMatchSweep(baseDeps({ pool: pool as unknown as ReconciliationMatchDeps['pool'], onAlarm }), { send });
    expect(onAlarm).toHaveBeenCalledWith(expect.stringMatching(/batch cap/));
  });
});

describe('registerReconciliationMatchWorkers', () => {
  it('creates both queues + schedules the sweep cron', async () => {
    const boss = {
      createQueue: vi.fn().mockResolvedValue(undefined),
      work: vi.fn().mockResolvedValue(undefined),
      schedule: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
    };
    await registerReconciliationMatchWorkers(boss as never, baseDeps(), { sweepCron: '0 */4 * * *' });
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUE_NAMES.RECONCILIATION_MATCH);
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUE_NAMES.RECONCILIATION_MATCH_SWEEP);
    expect(boss.schedule).toHaveBeenCalledWith(QUEUE_NAMES.RECONCILIATION_MATCH_SWEEP, '0 */4 * * *', {}, { tz: 'Asia/Kolkata' });
  });
});

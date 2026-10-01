// The claim-correction sweep's and child's CONTROL paths, DB-free (Story 6.19b, fourth- and fifth-pass reviews): the
// keyset paging past page 1 + the hard run bound + its probe (and a bound BELOW the page size, which clamps the page),
// a cursor run deleted mid-tick, the wall-clock budget, the refused EMPTY / production allowlist, D26's `limit + 1`
// probe, the plan's scope-transaction timeouts (skipped + ONE aggregated alarm), the I6 hash alarm aggregated per
// tick, K2's second-letter branches, the stale child's own-row expiry (J8), the child's
// `CorrectionNumberHashUnavailableError` → transient (alarmed on the first and the final attempt only), K4's
// `expiredAttempt` alarm, and the sweep job's stated pg-boss options. ⭐ The domain is MOCKED at the seams the sweep
// and the child call (`withPariwarScope` runs the callback on a fake client; the claim helpers are spies) — the SQL is
// the real module's, answered by a fake pool keyed on the statement. The live suite covers the same paths against
// Postgres.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  withPariwarScope: vi.fn(),
  acquireCorrectionChaseLock: vi.fn(),
  readCorrectionRun: vi.fn(),
  readCorrectionReminder: vi.fn(),
  expireOwnCorrectionReminder: vi.fn(),
  skipCorrectionReminder: vi.fn(),
  beginCorrectionFamilySend: vi.fn(),
  // planRun's reads and writes (the K2 / I6 / timeout legs below).
  getLiveCorrectionReturn: vi.fn(),
  endCorrectionRun: vi.fn(),
  readCorrectionClaimRow: vi.fn(),
  resolveClaimCorrectionState: vi.fn(),
  readFamilyPartDoneAt: vi.fn(),
  getLiveShepherd: vi.fn(),
  readRunStaffRows: vi.fn(),
  readRunFamilyRows: vi.fn(),
  readReturnLetterTrackStaffRows: vi.fn(),
  readCorrectionRecipients: vi.fn(),
  readReturnPersonStates: vi.fn(),
  insertFinalCorrectionReminder: vi.fn(),
  listAdminsByRole: vi.fn(),
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope: h.withPariwarScope,
    claim: {
      ...actual.claim,
      acquireCorrectionChaseLock: h.acquireCorrectionChaseLock,
      readCorrectionRun: h.readCorrectionRun,
      readCorrectionReminder: h.readCorrectionReminder,
      expireOwnCorrectionReminder: h.expireOwnCorrectionReminder,
      skipCorrectionReminder: h.skipCorrectionReminder,
      beginCorrectionFamilySend: h.beginCorrectionFamilySend,
      getLiveCorrectionReturn: h.getLiveCorrectionReturn,
      endCorrectionRun: h.endCorrectionRun,
      readCorrectionClaimRow: h.readCorrectionClaimRow,
      resolveClaimCorrectionState: h.resolveClaimCorrectionState,
      readFamilyPartDoneAt: h.readFamilyPartDoneAt,
      getLiveShepherd: h.getLiveShepherd,
      readRunStaffRows: h.readRunStaffRows,
      readRunFamilyRows: h.readRunFamilyRows,
      readReturnLetterTrackStaffRows: h.readReturnLetterTrackStaffRows,
      readCorrectionRecipients: h.readCorrectionRecipients,
      readReturnPersonStates: h.readReturnPersonStates,
      insertFinalCorrectionReminder: h.insertFinalCorrectionReminder,
      listAdminsByRole: h.listAdminsByRole,
    },
  };
});

// Imported AFTER vi.mock so the module wires against the mocked surface above.
import { claim } from '@twt/domain';
import { QUEUE_NAMES, type JobEnvelope } from '@twt/queue';
import type pg from 'pg';

import {
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  ClaimCorrectionTransientError,
  DEFAULT_CORRECTION_SWEEP_BUDGET_MS,
  registerClaimCorrectionReminderWorkers,
  runCorrectionFamilySmsChild,
  runCorrectionReminderSweep,
  type ClaimCorrectionReminderDeps,
  type CorrectionFamilySmsPayload,
} from '../src/scheduler/claim-correction-reminders.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const CLAIM = '22222222-2222-4222-8222-222222222222';
const RUN = '33333333-3333-4333-8333-333333333333';

interface FakeRun {
  readonly run_id: string;
  readonly claim_case_id: string;
  readonly pariwar_id: string;
}

const runs = (n: number): FakeRun[] =>
  Array.from({ length: n }, (_, i) => ({
    run_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    claim_case_id: `aaaaaaaa-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    pariwar_id: PARIWAR,
  }));

/**
 * A fake BYPASSRLS pool: the sweep's raw statements, answered by their text. Records every call. `deleted` holds the
 * run ids deleted "mid-tick" — like the server's NULL row comparison, a page after a deleted cursor is EMPTY.
 */
function fakePool(open: readonly FakeRun[], markChanged: readonly FakeRun[] = [], deleted: Set<string> = new Set()) {
  const calls: { sql: string; params: readonly unknown[] }[] = [];
  const query = vi.fn((sql: string, params: readonly unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes('UPDATE claim_correction_reminders')) return Promise.resolve({ rows: [] });
    if (sql.includes('count(*)::int AS n')) return Promise.resolve({ rows: [{ n: 0 }] });
    if (sql.includes("end_reason = 'mark_changed'")) {
      return Promise.resolve({ rows: markChanged.slice(0, params[1] as number) });
    }
    if (sql.includes('AS present')) {
      const id = params[0] as string;
      return Promise.resolve({ rows: [{ present: open.some((r) => r.run_id === id) && !deleted.has(id) }] });
    }
    if (sql.includes('FROM claim_correction_runs r')) {
      // The keyset: the page after the cursor RUN ID (the server compares its `opened_at`; here the array order is it).
      const after = params[0] as string | null;
      const size = params[1] as number;
      if (after !== null && deleted.has(after)) return Promise.resolve({ rows: [] });
      const live = open.filter((r) => !deleted.has(r.run_id));
      const from = after === null ? 0 : live.findIndex((r) => r.run_id === after) + 1;
      return Promise.resolve({ rows: live.slice(from, from + size) });
    }
    return Promise.reject(new Error(`unexpected statement: ${sql}`));
  });
  return { pool: { query } as unknown as pg.Pool, calls, query };
}

function deps(pool: pg.Pool, overrides: Partial<ClaimCorrectionReminderDeps> = {}) {
  const alarms: string[] = [];
  const d: ClaimCorrectionReminderDeps = {
    pool,
    encryption: {} as never,
    smsAppClient: {
      isConfigured: () => true,
      messaging: () => {
        throw new Error('the gateway must not be reached on these paths');
      },
    },
    resolveConfig: () => Promise.reject(new Error('config must not be read on these paths')),
    push: { audit: () => Promise.resolve(), hashRendered: () => Promise.resolve('a'.repeat(64)) },
    now: () => new Date('2026-10-05T04:30:00.000Z'), // 10:00 IST
    onAlarm: (m) => alarms.push(m),
    ...overrides,
  };
  return { deps: d, alarms };
}

const boss = { send: vi.fn(() => Promise.resolve('job')) } as unknown as Parameters<typeof runCorrectionReminderSweep>[1];

/** The claim ids planRun locked — ONE per run planned (the D26 marker path takes ⛔ no lock). */
const planned = (): string[] => h.acquireCorrectionChaseLock.mock.calls.map((c) => c[2] as string);

/** Every statement the plan's fake scope client ran (`SET LOCAL …`, the D30 / today's-rows reads). */
let scopeStatements: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  scopeStatements = [];
  h.withPariwarScope.mockImplementation((_pool: unknown, _pid: string, fn: (db: unknown, client: unknown) => unknown) =>
    Promise.resolve(
      fn(
        {},
        {
          query: (sql: string) => {
            scopeStatements.push(sql);
            return Promise.resolve({ rows: [] });
          },
        },
      ),
    ),
  );
  h.acquireCorrectionChaseLock.mockResolvedValue(undefined);
  h.readCorrectionRun.mockResolvedValue(null); // ⇒ planRun returns idle after the lock
});

describe('the sweep — keyset paging, the hard bound, the budget', () => {
  it('⭐ runLimit 2, maxRuns 3, FIVE open runs: the first three planned ONCE each, the bound ALARMED (probe)', async () => {
    const open = runs(5);
    const { pool, calls } = fakePool(open);
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 3 });
    const result = await runCorrectionReminderSweep(d, boss);
    expect(result.scannedRuns).toBe(3);
    expect(planned()).toEqual(open.slice(0, 3).map((r) => r.claim_case_id));
    const pages = calls.filter((c) => c.sql.includes('FROM claim_correction_runs r'));
    // Page 1 (no cursor, 2), page 2 (after run 2, the 1 left under the bound), then the 1-row probe after run 3.
    expect(pages.map((c) => [c.params[0], c.params[1]])).toEqual([
      [null, 2],
      [open[1]!.run_id, 1],
      [open[2]!.run_id, 1],
    ]);
    expect(alarms.filter((a) => a.includes('hard bound of 3'))).toHaveLength(1);
  });

  it('⭐ runLimit 2, ample bound: EVERY run planned exactly once across pages, ⛔ no alarm', async () => {
    const open = runs(5);
    const { pool } = fakePool(open);
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 100 });
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(5);
    expect(planned()).toEqual(open.map((r) => r.claim_case_id));
    expect(alarms).toEqual([]);
  });

  it('⭐ the keyset cursor is compared SERVER-SIDE — ⛔ no `opened_at::text` round-trip', async () => {
    const { pool, calls } = fakePool(runs(3));
    await runCorrectionReminderSweep(deps(pool, { runLimit: 2 }).deps, boss);
    const page = calls.find((c) => c.sql.includes('FROM claim_correction_runs r'))!.sql;
    expect(page).not.toContain('::text');
    expect(page).toContain('(SELECT c.opened_at, c.run_id FROM claim_correction_runs c WHERE c.run_id = $1::uuid)');
  });

  it('⭐ the WALL-CLOCK budget stops paging between runs and ALARMS (⛔ the bound probe then)', async () => {
    const open = runs(5);
    const { pool, calls } = fakePool(open);
    let t = 0;
    const { deps: d, alarms } = deps(pool, {
      runLimit: 2,
      maxRuns: 100,
      sweepBudgetMs: 25,
      elapsedClockMs: () => (t += 10), // start = 10; the checks see 10, 20, 30 ms elapsed
    });
    const result = await runCorrectionReminderSweep(d, boss);
    expect(result).toMatchObject({ scannedRuns: 2, budgetExhausted: true });
    expect(planned()).toEqual(open.slice(0, 2).map((r) => r.claim_case_id));
    expect(alarms.filter((a) => a.includes('budget'))).toHaveLength(1);
    expect(alarms.some((a) => a.includes('hard bound'))).toBe(false);
    // ⛔ No probe page after a budget stop (page 1, then page 2 whose first run tripped the budget).
    expect(calls.filter((c) => c.sql.includes('FROM claim_correction_runs r'))).toHaveLength(2);
  });

  it('the default budget sits UNDER the job\'s pg-boss expiry (a long tick is ⛔ never expired while it runs)', () => {
    expect(DEFAULT_CORRECTION_SWEEP_BUDGET_MS).toBeLessThan(CORRECTION_SWEEP_EXPIRE_SECONDS * 1000);
    expect(CORRECTION_SWEEP_EXPIRE_SECONDS).toBeGreaterThan(15 * 60); // ⛔ pg-boss's 15-minute default
    expect(CORRECTION_SWEEP_EXPIRE_SECONDS).toBeLessThan(24 * 60 * 60); // pg-boss refuses ≥ 24 h
  });

  it('⭐ a bound BELOW the page size CLAMPS the page (⛔ never raises the bound): runLimit 5, maxRuns 2 ⇒ 2 planned + the bound alarm', async () => {
    const open = runs(4);
    const { pool, calls } = fakePool(open);
    const { deps: d, alarms } = deps(pool, { runLimit: 5, maxRuns: 2 });
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(2);
    expect(planned()).toEqual(open.slice(0, 2).map((r) => r.claim_case_id));
    const pages = calls.filter((c) => c.sql.includes('FROM claim_correction_runs r'));
    expect(pages.map((c) => [c.params[0], c.params[1]])).toEqual([
      [null, 2],
      [open[1]!.run_id, 1], // the probe
    ]);
    expect(alarms.filter((a) => a.includes('hard bound of 2'))).toHaveLength(1);
  });

  it('⭐ a cursor run DELETED mid-tick ⇒ the empty page is ⛔ read as "exhausted": the scan stops and ALARMS', async () => {
    const open = runs(5);
    const deleted = new Set<string>();
    const { pool } = fakePool(open, [], deleted);
    // Delete run 2 (page 1's last row — the cursor) while it is being planned.
    h.acquireCorrectionChaseLock.mockImplementation((_c: unknown, _p: string, claimCaseId: string) => {
      if (claimCaseId === open[1]!.claim_case_id) deleted.add(open[1]!.run_id);
      return Promise.resolve();
    });
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 100 });
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(2);
    expect(alarms.filter((a) => a.includes('DELETED mid-tick') && a.includes(open[1]!.run_id))).toHaveLength(1);
    expect(alarms.some((a) => a.includes('hard bound'))).toBe(false);
  });

  it('an EMPTY page after an EXISTING cursor is exhaustion — ⛔ no alarm (4 runs, runLimit 2)', async () => {
    const { pool, calls } = fakePool(runs(4));
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 100 });
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(4);
    expect(calls.filter((c) => c.sql.includes('AS present'))).toHaveLength(1);
    expect(alarms).toEqual([]);
  });

  it('⛔ a SET `pariwarAllowlist` under NODE_ENV=production is REFUSED — ⛔ no statement runs, and it alarms', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { pool, query } = fakePool(runs(2));
    const { deps: d, alarms } = deps(pool, { pariwarAllowlist: [PARIWAR] });
    expect(await runCorrectionReminderSweep(d, boss)).toMatchObject({ scannedRuns: 0, finalisedStuck: 0 });
    expect(query).not.toHaveBeenCalled();
    expect(alarms).toEqual([expect.stringContaining('REFUSED')]);
    expect(alarms[0]).toContain('production');
  });

  it('production WITHOUT an allowlist sweeps every tenant (the refusal is about the allowlist alone)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { pool } = fakePool(runs(2));
    const { deps: d, alarms } = deps(pool);
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(2);
    expect(alarms).toEqual([]);
  });

  it('⛔ an EMPTY `pariwarAllowlist` is REFUSED — ⛔ no statement runs, and it alarms', async () => {
    const { pool, query } = fakePool(runs(2));
    const { deps: d, alarms } = deps(pool, { pariwarAllowlist: [] });
    expect(await runCorrectionReminderSweep(d, boss)).toMatchObject({ scannedRuns: 0, finalisedStuck: 0 });
    expect(query).not.toHaveBeenCalled();
    expect(alarms).toEqual([expect.stringContaining('REFUSED')]);
  });
});

describe('the sweep — D26\'s marker scan probe (`LIMIT limit + 1`)', () => {
  it('exactly `limit` mark-changed runs ⇒ all processed, ⛔ no alarm', async () => {
    const { pool, calls } = fakePool([], runs(2));
    const { deps: d, alarms } = deps(pool, { runLimit: 2 });
    await runCorrectionReminderSweep(d, boss);
    expect(calls.find((c) => c.sql.includes("end_reason = 'mark_changed'"))!.params[1]).toBe(3);
    expect(h.readCorrectionRun).toHaveBeenCalledTimes(2);
    expect(alarms.some((a) => a.includes('D26'))).toBe(false);
  });

  it('`limit + 1` ⇒ only `limit` processed (the extra row is a probe) and the cap ALARMED', async () => {
    const { pool } = fakePool([], runs(3));
    const { deps: d, alarms } = deps(pool, { runLimit: 2 });
    await runCorrectionReminderSweep(d, boss);
    expect(h.readCorrectionRun).toHaveBeenCalledTimes(2);
    expect(alarms.filter((a) => a.includes('D26 marker scan hit'))).toHaveLength(1);
  });
});

describe('the child — the stale path (J8) and the re-check\'s hash failure', () => {
  const envelope = (sentOn: string): JobEnvelope<CorrectionFamilySmsPayload> => ({
    pariwarId: PARIWAR,
    requestId: 'r',
    actorId: null,
    traceId: 't',
    payload: { runId: RUN, claimCaseId: CLAIM, slotDay: 4, personKey: 'nominee:1', sentOn, late: false },
  });

  it('⭐ J8 — THIS job\'s own `attempting` row from an earlier IST day ⇒ expired `error` (exhausted:crossed_midnight) + alarm, ⛔ never `skipped_superseded`, ⛔ no send', async () => {
    h.readCorrectionReminder.mockResolvedValue({ reminderId: 'rem-1', outcome: 'attempting', claimedByJob: 'job-1' });
    h.expireOwnCorrectionReminder.mockResolvedValue(true);
    const { deps: d, alarms } = deps(fakePool([]).pool);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.expireOwnCorrectionReminder).toHaveBeenCalledWith(expect.anything(), {
      pariwarId: PARIWAR,
      reminderId: 'rem-1',
      jobId: 'job-1',
      detail: 'exhausted:crossed_midnight',
    });
    expect(h.skipCorrectionReminder).not.toHaveBeenCalled();
    expect(h.beginCorrectionFamilySend).not.toHaveBeenCalled();
    expect(alarms).toEqual([expect.stringContaining('exhausted:crossed_midnight')]);
    expect(alarms[0]).toContain(RUN);
  });

  it('a stale child whose slot row is ANOTHER job\'s (or none) touches ⛔ nothing and ⛔ never alarms', async () => {
    const { deps: d, alarms } = deps(fakePool([]).pool);
    h.readCorrectionReminder.mockResolvedValueOnce({ reminderId: 'rem-1', outcome: 'attempting', claimedByJob: 'job-2' });
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    h.readCorrectionReminder.mockResolvedValueOnce(null);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.expireOwnCorrectionReminder).not.toHaveBeenCalled();
    expect(h.skipCorrectionReminder).not.toHaveBeenCalled();
    expect(alarms).toEqual([]);
  });

  it('⭐ the re-check could ⛔ not hash the current number (`CorrectionNumberHashUnavailableError`) ⇒ TRANSIENT + alarm, ⛔ no send', async () => {
    h.beginCorrectionFamilySend.mockRejectedValue(new claim.CorrectionNumberHashUnavailableError(CLAIM, RUN));
    const { deps: d, alarms } = deps(fakePool([]).pool);
    await expect(runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).rejects.toBeInstanceOf(
      ClaimCorrectionTransientError,
    );
    expect(alarms).toEqual([expect.stringContaining('could not be hashed')]);
    // The begin ran ONCE (one scope tx), and ⛔ nothing after it did.
    expect(h.withPariwarScope).toHaveBeenCalledTimes(1);
  });

  it('the re-check hash failure on a MIDDLE retry ⇒ transient, ⛔ no alarm; on the FINAL attempt ⇒ transient + a giving-up alarm', async () => {
    h.beginCorrectionFamilySend.mockRejectedValue(new claim.CorrectionNumberHashUnavailableError(CLAIM, RUN));
    const { deps: d, alarms } = deps(fakePool([]).pool);
    await expect(
      runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1', { retryCount: 1, retryLimit: CHILD_RETRY_LIMIT }),
    ).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(alarms).toEqual([]);
    await expect(
      runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1', { retryCount: CHILD_RETRY_LIMIT, retryLimit: CHILD_RETRY_LIMIT }),
    ).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(alarms).toEqual([expect.stringContaining('FINAL attempt')]);
    expect(alarms[0]).toContain(CLAIM);
  });

  it('⭐ K4 — a re-check that now fails on a retry of an attempt that already ran (`expiredAttempt`) ⇒ skipped AND alarmed (ids only)', async () => {
    h.beginCorrectionFamilySend.mockResolvedValue({ kind: 'skipped', reason: 'letter_delivered', expiredAttempt: true });
    const { deps: d, alarms } = deps(fakePool([]).pool);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).toEqual({ status: 'skipped', reason: 'letter_delivered' });
    expect(alarms).toEqual([expect.stringContaining('exhausted:recheck_letter_delivered')]);
    expect(alarms[0]).toContain(RUN);
  });

  it('a plain re-check skip (⛔ no earlier attempt) is ⛔ never alarmed', async () => {
    h.beginCorrectionFamilySend.mockResolvedValue({ kind: 'skipped', reason: 'run_ended' });
    const { deps: d, alarms } = deps(fakePool([]).pool);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).toEqual({ status: 'skipped', reason: 'run_ended' });
    expect(alarms).toEqual([]);
  });

  it('any OTHER begin failure propagates as-is (⛔ never relabelled transient)', async () => {
    const boom = new Error('db down');
    h.beginCorrectionFamilySend.mockRejectedValue(boom);
    const { deps: d, alarms } = deps(fakePool([]).pool);
    await expect(runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).rejects.toBe(boom);
    expect(alarms).toEqual([]);
  });
});

describe('planRun — its scope-transaction timeouts, the I6 aggregate and K2\'s second-letter branches', () => {
  // `now` is 2026-10-05 10:00 IST (the deps above) ⇒ today = 2026-10-05.
  const TODAY = '2026-10-05';
  const PERSON = 'nominee:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const DA = '55555555-5555-4555-8555-555555555555';

  /** One OPEN family run on `day0`, its live return decided on `returnedOn` (IST noon), ONE person delivered on `deliveredOn`. */
  function familyRun(o: { day0: string; returnedOn: string; deliveredOn: string; hashFailed?: boolean }) {
    h.readCorrectionRun.mockImplementation((_db: unknown, _p: string, runId: string) =>
      Promise.resolve({ runId, claimCaseId: CLAIM, returnDecisionId: 'dec-1', kind: 'family', day0: o.day0, endedAt: null }),
    );
    h.getLiveCorrectionReturn.mockResolvedValue({ decisionId: 'dec-1', decidedAt: new Date(`${o.returnedOn}T12:00:00+05:30`) });
    h.readCorrectionClaimRow.mockResolvedValue({ deceasedMemberId: '44444444-4444-4444-8444-444444444444', currentState: 'verifier_approved' });
    h.resolveClaimCorrectionState.mockResolvedValue({ resubmitted: false });
    h.readFamilyPartDoneAt.mockResolvedValue(null);
    h.getLiveShepherd.mockResolvedValue({ shepherdActorId: DA });
    h.readRunStaffRows.mockResolvedValue([]);
    h.readRunFamilyRows.mockResolvedValue([]);
    h.readReturnLetterTrackStaffRows.mockResolvedValue([]);
    h.readCorrectionRecipients.mockResolvedValue({ cannotRemind: null, people: [{ personKey: PERSON }] });
    h.readReturnPersonStates.mockResolvedValue([
      {
        person: { personKey: PERSON },
        // Found dead TODAY (⇒ ⛔ no chase / escalation yet) and delivered (⇒ ⛔ no SMS, D21 stops the DA reminder) —
        // ONE letter in the return (⛔ capped), the first delivered on `deliveredOn`.
        track: { foundDeadOn: TODAY, deadKind: 'dead', letterDelivered: true, firstDeliveredOn: o.deliveredOn, reset: false, epochRows: [] },
        lettersInReturn: 1,
        firstDeliveredInReturnOn: o.deliveredOn,
        ...(o.hashFailed === true ? { hashFailed: true } : {}),
      },
    ]);
    h.insertFinalCorrectionReminder.mockResolvedValue(true);
    h.listAdminsByRole.mockResolvedValue({ entries: [], truncated: false });
  }
  const secondLetterWrites = () =>
    h.insertFinalCorrectionReminder.mock.calls.map((c) => c[1] as Record<string, unknown>).filter((r) => r['purpose'] === 'letter_second_due');

  it('⭐ the plan bounds its OWN transaction FIRST — `SET LOCAL lock_timeout` + `statement_timeout`, before the trustee lock', async () => {
    const order: string[] = [];
    h.withPariwarScope.mockImplementation((_pool: unknown, _pid: string, fn: (db: unknown, client: unknown) => unknown) =>
      Promise.resolve(fn({}, { query: (sql: string) => (order.push(sql), Promise.resolve({ rows: [] })) })),
    );
    h.acquireCorrectionChaseLock.mockImplementation(() => (order.push('LOCK'), Promise.resolve()));
    await runCorrectionReminderSweep(deps(fakePool(runs(1)).pool).deps, boss);
    expect(order.slice(0, 3)).toEqual(["SET LOCAL lock_timeout = '30s'", "SET LOCAL statement_timeout = '120s'", 'LOCK']);
  });

  it('⭐ a plan that hits lock_timeout (55P03) or statement_timeout (57014, wrapped in a `cause`) is SKIPPED — the tick goes on, ONE aggregated alarm', async () => {
    const open = runs(4);
    h.acquireCorrectionChaseLock.mockImplementation((_c: unknown, _p: string, claimCaseId: string) => {
      if (claimCaseId === open[0]!.claim_case_id) {
        return Promise.reject(Object.assign(new Error('canceling statement due to lock timeout'), { code: '55P03' }));
      }
      if (claimCaseId === open[2]!.claim_case_id) {
        return Promise.reject(new Error('query failed', { cause: Object.assign(new Error('statement timeout'), { code: '57014' }) }));
      }
      return Promise.resolve();
    });
    const { deps: d, alarms } = deps(fakePool(open).pool);
    const result = await runCorrectionReminderSweep(d, boss);
    expect(result).toMatchObject({ scannedRuns: 4, timedOutRuns: 2 });
    expect(planned()).toEqual(open.map((r) => r.claim_case_id)); // every run was still attempted
    const timeoutAlarms = alarms.filter((a) => a.includes('lock_timeout'));
    expect(timeoutAlarms).toHaveLength(1);
    expect(timeoutAlarms[0]).toContain('2 run(s)');
    expect(timeoutAlarms[0]).toContain(open[0]!.claim_case_id);
    expect(timeoutAlarms[0]).toContain(open[2]!.claim_case_id);
    expect(alarms.some((a) => a.includes('failed —'))).toBe(false); // ⛔ no per-run "failed" alarm for a timeout
  });

  it('any OTHER plan failure keeps its own per-run alarm (⛔ never counted as a timeout)', async () => {
    h.acquireCorrectionChaseLock.mockRejectedValue(Object.assign(new Error('boom'), { code: '23505' }));
    const { deps: d, alarms } = deps(fakePool(runs(1)).pool);
    expect(await runCorrectionReminderSweep(d, boss)).toMatchObject({ timedOutRuns: 0 });
    expect(alarms.filter((a) => a.includes('failed —'))).toHaveLength(1);
  });

  it('⭐ I6 — the hash failures of a whole tick are ONE alarm (count + up to five claim ids), ⛔ one per person per run', async () => {
    familyRun({ day0: '2026-10-04', returnedOn: '2026-10-04', deliveredOn: '2026-10-04', hashFailed: true });
    const open = runs(7);
    const { deps: d, alarms } = deps(fakePool(open).pool);
    await runCorrectionReminderSweep(d, boss);
    const hashAlarms = alarms.filter((a) => a.includes('could not be hashed'));
    expect(hashAlarms).toHaveLength(1);
    expect(hashAlarms[0]).toContain('7 person(s) on 7 claim(s)');
    expect(hashAlarms[0]).toContain(open[4]!.claim_case_id);
    expect(hashAlarms[0]).not.toContain(open[5]!.claim_case_id);
    expect(hashAlarms[0]).toContain('(+2 more)');
  });

  it('⭐ K2 — a delivery ON/AFTER the return whose + 30 falls BEFORE this run ⇒ a real `recorded` reminder, `late`, at TODAY\'s slot — ⛔ no marker, ⛔ no alarm', async () => {
    // Run 3 opened 2026-10-04 (day 1 today); the return was 2026-08-20; the letter (posted in run 1) delivered 08-25.
    familyRun({ day0: '2026-10-04', returnedOn: '2026-08-20', deliveredOn: '2026-08-25' });
    const { deps: d, alarms } = deps(fakePool(runs(1)).pool);
    await runCorrectionReminderSweep(d, boss);
    expect(secondLetterWrites()).toEqual([
      expect.objectContaining({ slotDay: 1, late: true, outcome: 'recorded', detail: null, recipientKey: `staff:${DA}`, subjectKey: PERSON }),
    ]);
    expect(alarms).toEqual([]);
  });

  it('⭐ K2 — slot 0 (the run\'s day 0) is a VALID slot: written there, ⛔ never rejected', async () => {
    // Delivered 2026-09-04 ⇒ due 2026-10-04 = run day 0.
    familyRun({ day0: '2026-10-04', returnedOn: '2026-08-20', deliveredOn: '2026-09-04' });
    const { deps: d, alarms } = deps(fakePool(runs(1)).pool);
    await runCorrectionReminderSweep(d, boss);
    expect(secondLetterWrites()).toEqual([expect.objectContaining({ slotDay: 0, late: true, outcome: 'recorded' })]);
    expect(alarms).toEqual([]);
  });

  it('⭐ K2 — ONLY a delivery BEFORE the return\'s IST date keeps the `delivery_before_run` marker + ONE alarm', async () => {
    familyRun({ day0: '2026-10-04', returnedOn: '2026-08-20', deliveredOn: '2026-08-19' });
    const { deps: d, alarms } = deps(fakePool(runs(1)).pool);
    await runCorrectionReminderSweep(d, boss);
    expect(secondLetterWrites()).toEqual([
      expect.objectContaining({ slotDay: 1, outcome: 'skipped_superseded', detail: 'delivery_before_run' }),
    ]);
    expect(alarms.filter((a) => a.includes('second-letter'))).toHaveLength(1);
    expect(alarms[0]).toContain('BEFORE the return (2026-08-20)');
  });
});

describe('registration — the sweep job\'s stated pg-boss options', () => {
  it('⭐ the sweep queue AND its schedule carry the explicit expiry (the schedule\'s options reach an existing queue)', async () => {
    const createQueue = vi.fn(() => Promise.resolve());
    const schedule = vi.fn(() => Promise.resolve());
    const fakeBoss = { createQueue, schedule, work: vi.fn(() => Promise.resolve('w')) };
    await registerClaimCorrectionReminderWorkers(fakeBoss as never, deps(fakePool([]).pool).deps);
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, {
      expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS,
    });
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, expect.any(String), {}, {
      tz: CLAIM_CORRECTION_TZ,
      ...CORRECTION_SWEEP_RETRY,
      expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS,
    });
  });

  it('⭐ the family-SMS worker asks pg-boss for its metadata and hands the child its retry count', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<unknown>>();
    const work = vi.fn((name: string, a: unknown, b?: unknown) => {
      handlers.set(name, (typeof a === 'function' ? a : b) as (jobs: unknown[]) => Promise<unknown>);
      return Promise.resolve('w');
    });
    const fakeBoss = { createQueue: vi.fn(() => Promise.resolve()), schedule: vi.fn(() => Promise.resolve()), work };
    await registerClaimCorrectionReminderWorkers(fakeBoss as never, deps(fakePool([]).pool).deps);
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS, { includeMetadata: true }, expect.any(Function));
    // A MIDDLE retry of a re-check hash failure: ⛔ no alarm (the retry count reached the child).
    h.beginCorrectionFamilySend.mockRejectedValue(new claim.CorrectionNumberHashUnavailableError(CLAIM, RUN));
    const alarms: string[] = [];
    const fresh = deps(fakePool([]).pool, { onAlarm: (m) => alarms.push(m) }).deps;
    handlers.clear();
    await registerClaimCorrectionReminderWorkers(fakeBoss as never, fresh);
    const job = {
      id: 'job-9',
      data: {
        pariwarId: PARIWAR,
        requestId: 'r',
        actorId: null,
        traceId: 't',
        payload: { runId: RUN, claimCaseId: CLAIM, slotDay: 4, personKey: 'nominee:1', sentOn: '2026-10-05', late: false },
      },
      retryCount: 2,
      retryLimit: CHILD_RETRY_LIMIT,
    };
    await expect(handlers.get(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS)!([job])).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(alarms).toEqual([]);
  });
});

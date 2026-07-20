// Cycle-open alert trigger — orchestration unit tests (Story 8.1, Task 8; AC3/AC4/AC6).
//
// WHY fakes/mocks, not live-DB: this suite verifies CONTROL FLOW ONLY — the worker scopes +
// delegates to alert.openCycleAlert, the enqueue helper constructs the right envelope/singletonKey,
// and the recovery sweep re-enqueues the frozen-but-unminted cycles the scan returns. The DB-backed
// behavior (the mint firing, alerts.current_state = live, redelivery no-op, the tr= binding) is the
// load-bearing AC6 de-risk suite in packages/domain/tests/integration/alert/. No DATABASE_URL here.

import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openCycleAlertMock, withPariwarScopeMock } = vi.hoisted(() => ({
  openCycleAlertMock: vi.fn(),
  withPariwarScopeMock: vi.fn(),
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    alert: { ...actual.alert, openCycleAlert: openCycleAlertMock },
    withPariwarScope: withPariwarScopeMock,
  };
});

import {
  DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT,
  enqueueCycleOpenAlert,
  registerCycleOpenAlertWorkers,
  runCycleOpenAlert,
  runCycleOpenAlertSweep,
  type CycleOpenAlertDeps,
  type CycleOpenAlertPayload,
} from '../src/scheduler/cycle-open-alert.js';
import { QUEUE_NAMES, type JobEnvelope, type QueueClient } from '@twt/queue';

function makeDeps(overrides: Partial<CycleOpenAlertDeps> = {}): CycleOpenAlertDeps {
  return {
    pool: { query: vi.fn() } as unknown as CycleOpenAlertDeps['pool'],
    onAlarm: vi.fn(),
    ...overrides,
  };
}

function makeFakeBoss(): { send: ReturnType<typeof vi.fn> } {
  return { send: vi.fn().mockResolvedValue('job-id') };
}

function envelope(cycleId: string, pariwarId: string | null): JobEnvelope<CycleOpenAlertPayload> {
  return { requestId: randomUUID(), pariwarId, actorId: null, traceId: randomUUID(), payload: { cycleId } };
}

beforeEach(() => {
  vi.resetAllMocks();
  withPariwarScopeMock.mockImplementation(
    async (_pool: unknown, _pariwarId: unknown, fn: (db: unknown, client: unknown) => unknown) => fn({}, {}),
  );
});

describe('runCycleOpenAlert — the mint worker body', () => {
  it('scopes to the envelope pariwar and delegates to alert.openCycleAlert', async () => {
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    openCycleAlertMock.mockResolvedValue({ alertId: 'a-1', minted: true, state: 'live', timeCritical: false });

    const result = await runCycleOpenAlert(makeDeps(), envelope(cycleId, pariwarId));

    expect(withPariwarScopeMock).toHaveBeenCalledWith(expect.anything(), pariwarId, expect.any(Function));
    expect(openCycleAlertMock).toHaveBeenCalledWith(expect.anything(), { cycleId });
    expect(result).toEqual({ cycleId, alertId: 'a-1', minted: true, state: 'live', timeCritical: false });
  });

  it('surfaces the idempotent no-op result (minted: false) unchanged', async () => {
    const cycleId = randomUUID();
    openCycleAlertMock.mockResolvedValue({ alertId: 'a-2', minted: false, state: 'live', timeCritical: true });

    const result = await runCycleOpenAlert(makeDeps(), envelope(cycleId, randomUUID()));

    expect(result.minted).toBe(false);
    expect(result.timeCritical).toBe(true);
  });

  it('throws (→ pg-boss retry/DLQ) when the envelope has no pariwarId', async () => {
    const onAlarm = vi.fn();
    await expect(runCycleOpenAlert(makeDeps({ onAlarm }), envelope(randomUUID(), null))).rejects.toThrow(
      /missing pariwarId/,
    );
    expect(openCycleAlertMock).not.toHaveBeenCalled();
  });
});

describe('enqueueCycleOpenAlert — envelope + singletonKey construction', () => {
  it('sends onto CYCLE_OPEN_ALERT with cycle_id as the singletonKey (at-least-once dedup)', async () => {
    const boss = makeFakeBoss();
    const cycleId = randomUUID();
    const pariwarId = randomUUID();
    await enqueueCycleOpenAlert(boss, { cycleId, pariwarId, requestId: 'r', actorId: null, traceId: 't' });

    expect(boss.send).toHaveBeenCalledWith(
      QUEUE_NAMES.CYCLE_OPEN_ALERT,
      { requestId: 'r', pariwarId, actorId: null, traceId: 't', payload: { cycleId } },
      { singletonKey: cycleId },
    );
  });
});

describe('runCycleOpenAlertSweep — the recovery sweep (D4)', () => {
  it('re-enqueues each frozen-but-unminted cycle the scan returns', async () => {
    const c0 = randomUUID();
    const c1 = randomUUID();
    const p0 = randomUUID();
    const p1 = randomUUID();
    const query = vi.fn().mockResolvedValue({
      rows: [
        { cycle_id: c0, pariwar_id: p0 },
        { cycle_id: c1, pariwar_id: p1 },
      ],
    });
    const boss = makeFakeBoss();

    const count = await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never }), boss);

    expect(count).toBe(2);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/LEFT JOIN alerts[\s\S]*ORDER BY e\.occurred_at ASC/),
      [DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT],
    );
    expect(boss.send).toHaveBeenCalledTimes(2);
    expect(boss.send).toHaveBeenCalledWith(
      QUEUE_NAMES.CYCLE_OPEN_ALERT,
      expect.objectContaining({ pariwarId: p0, payload: { cycleId: c0 } }),
      { singletonKey: c0 },
    );
  });

  it('is a clean no-op when nothing is frozen-but-unminted', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const boss = makeFakeBoss();
    const count = await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never }), boss);
    expect(count).toBe(0);
    expect(boss.send).not.toHaveBeenCalled();
  });

  it('alarms (never silently) when the batch cap is hit — more cycles remain', async () => {
    const rows = [{ cycle_id: randomUUID(), pariwar_id: randomUUID() }];
    const query = vi.fn().mockResolvedValue({ rows });
    const onAlarm = vi.fn();
    const boss = makeFakeBoss();
    await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never, onAlarm, sweepLimit: 1 }), boss);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('batch cap'));
  });

  it('a 0 or negative sweepLimit is clamped to 1, never a misleading alarm or a malformed LIMIT', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const boss = makeFakeBoss();

    await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never, sweepLimit: 0 }), boss);
    expect(query).toHaveBeenCalledWith(expect.any(String), [1]);

    await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never, sweepLimit: -5 }), boss);
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [1]);
  });

  it('one failed re-enqueue does not abort the whole sweep', async () => {
    const c0 = randomUUID();
    const c1 = randomUUID();
    const query = vi.fn().mockResolvedValue({
      rows: [
        { cycle_id: c0, pariwar_id: randomUUID() },
        { cycle_id: c1, pariwar_id: randomUUID() },
      ],
    });
    const send = vi.fn().mockRejectedValueOnce(new Error('boss down')).mockResolvedValue('ok');
    const onAlarm = vi.fn();
    const count = await runCycleOpenAlertSweep(makeDeps({ pool: { query } as never, onAlarm }), { send });
    expect(count).toBe(1); // the return counts SUCCESSFUL re-enqueues only — one of the two failed
    expect(send).toHaveBeenCalledTimes(2);
    expect(onAlarm).toHaveBeenCalledWith(expect.stringContaining('failed to re-enqueue'));
  });
});

describe('registerCycleOpenAlertWorkers — queue + worker + sweep-cron wiring', () => {
  it('creates both queues, registers both workers, and schedules the recovery sweep', async () => {
    const boss = {
      createQueue: vi.fn().mockResolvedValue(undefined),
      work: vi.fn().mockResolvedValue('sub'),
      schedule: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueueClient;

    await registerCycleOpenAlertWorkers(boss, makeDeps());

    expect(boss.createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CYCLE_OPEN_ALERT);
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CYCLE_OPEN_ALERT_SWEEP);
    expect(boss.schedule).toHaveBeenCalledWith(
      QUEUE_NAMES.CYCLE_OPEN_ALERT_SWEEP,
      expect.any(String),
      {},
      expect.objectContaining({ tz: expect.any(String) }),
    );
  });
});

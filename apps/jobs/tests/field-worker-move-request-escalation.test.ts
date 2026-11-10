// Story 13.1d (AD8 (a)) — the escalation sweep's tick outcomes, DB-free: the Row 26 refusal, an escalation, a row no longer due (its
// twin, counted skipped), a failing row (alarmed, the next row still runs), the bound alarm, and a failed scan.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { codeOnly } from './_code-only.js';

const state = vi.hoisted(() => ({
  crossTenant: true,
  rows: [] as Array<{ pariwarId: string; moveRequestId: string }>,
  escalate: vi.fn(),
  scanError: null as Error | null,
  audited: [] as Array<{ pariwarId: unknown; actorId: unknown; actorRole: unknown; action: unknown; resourceLocator: unknown }>,
  /** The Pariwar each row's scope transaction was opened for, in order (CR34). */
  scoped: [] as string[],
}));

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    smsDelivery: { ...actual.smsDelivery, canReadAcrossPariwars: async () => state.crossTenant },
    fieldWorker: {
      ...actual.fieldWorker,
      findStaleMoveRequests: async () => {
        if (state.scanError) throw state.scanError;
        return state.rows;
      },
      escalateStaleMoveRequest: (...args: unknown[]) => state.escalate(...args),
    },
    withPariwarScope: async (_pool: unknown, p: string, fn: (db: unknown, client: unknown) => Promise<unknown>) => {
      state.scoped.push(p);
      return fn({}, {});
    },
    audit: {
      ...actual.audit,
      withCompensatingAudit: async (_pool: unknown, o: { auditIntent: (typeof state.audited)[number]; mutate: (x: { auditId: string }) => Promise<unknown> }) => {
        state.audited.push(o.auditIntent);
        return o.mutate({ auditId: '00000000-0000-4000-8000-000000000001' });
      },
    },
  };
});

const {
  runFieldWorkerMoveRequestEscalationTick,
  registerFieldWorkerMoveRequestEscalationCron,
  DEFAULT_FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON,
  FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ,
} = await import('../src/scheduler/field-worker-move-request-escalation.js');
const { QUEUE_NAMES } = await import('@twt/queue');

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const R = (n: number, pariwarId = P1) => ({ pariwarId, moveRequestId: `00000000-0000-4000-8000-00000000000${String(n)}` });

describe('runFieldWorkerMoveRequestEscalationTick (Story 13.1d AD8 (a))', () => {
  let alarms: string[];
  const deps = () => ({ pool: {} as never, onAlarm: (m: string) => alarms.push(m) });
  beforeEach(() => {
    alarms = [];
    state.crossTenant = true;
    state.rows = [];
    state.scanError = null;
    state.audited = [];
    state.scoped = [];
    state.escalate.mockReset();
  });

  it('⭐ an RLS-bound login: ONE `rls_bound_role` alarm, nothing scanned or escalated', async () => {
    state.crossTenant = false;
    state.rows = [R(1)];
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toEqual({ refused: true, scanned: 0, escalated: 0, skipped: 0, failed: 0 });
    expect(alarms).toEqual([expect.stringContaining('field_worker_move_request.rls_bound_role')]);
    expect(state.escalate).not.toHaveBeenCalled();
  });

  it('each row: ONE system audit line (actor null, role system, the escalated action) then the escalation; a row no longer due is skipped; a failing one is alarmed and the next runs', async () => {
    state.rows = [R(1), R(2), R(3)];
    state.escalate
      .mockResolvedValueOnce({ state: 'escalated' })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { name: 'FieldWorkerMoveRequestPersistError' }));
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toEqual({ refused: false, scanned: 3, escalated: 1, skipped: 1, failed: 1 });
    expect(state.audited).toHaveLength(3);
    for (const [i, a] of state.audited.entries()) {
      expect(a).toMatchObject({ actorId: null, actorRole: 'system', action: 'field_worker_move_request.escalated', resourceLocator: `field_worker_move_request/${R(i + 1).moveRequestId}` });
    }
    expect(alarms).toEqual([expect.stringContaining('a row failed (FieldWorkerMoveRequestPersistError)')]);
  });

  it('the bound hit is alarmed; a failed scan is alarmed and escalates nothing', async () => {
    state.rows = [R(1), R(2)];
    state.escalate.mockResolvedValue({ state: 'escalated' });
    await runFieldWorkerMoveRequestEscalationTick({ ...deps(), limit: 2 });
    expect(alarms).toEqual([expect.stringContaining('the tick reached its bound (2)')]);
    expect(alarms[0]).toContain('there may be more');
    expect(alarms[0]).toContain('unless the rows at the head keep failing');
    alarms = [];
    state.scanError = new Error('down');
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toMatchObject({ scanned: 0, escalated: 0 });
    expect(alarms).toEqual([expect.stringContaining('field_worker_move_request.sweep_failed:Error')]);
  });

  // CR33 — pg's `DatabaseError.name` is `error`: the alarm must carry the SQLSTATE, or a missing grant (42501) reads like any fault.
  it('a failing row and a failed scan are alarmed with their SQLSTATE class — from `code` (pg) or `sqlstate` (a persist error), else the name', async () => {
    state.rows = [R(1), R(2), R(3)];
    state.escalate
      .mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: '42501' }))
      .mockRejectedValueOnce(Object.assign(new Error('persist'), { name: 'FieldWorkerMoveRequestPersistError', sqlstate: '23514' }))
      .mockRejectedValueOnce(Object.assign(new Error('plain'), { name: 'Boom' }));
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toMatchObject({ failed: 3 });
    expect(alarms).toEqual([
      expect.stringContaining('a row failed (code:42501)'),
      expect.stringContaining('a row failed (code:23514)'),
      expect.stringContaining('a row failed (Boom)'),
    ]);
    alarms = [];
    state.scanError = Object.assign(new Error('terminating connection'), { code: '57P01' });
    await runFieldWorkerMoveRequestEscalationTick(deps());
    expect(alarms).toEqual([expect.stringContaining('field_worker_move_request.sweep_failed:code:57P01')]);
  });

  // CR34 — the sweep is CROSS-TENANT: every row opens ITS OWN Pariwar's scope and the command and the audit intent carry that Pariwar.
  it('rows of two Pariwars: each is scoped, escalated and audited under its OWN Pariwar — ⛔ the first row’s', async () => {
    state.rows = [R(1, P1), R(2, P2), R(3, P1), R(4, P2)];
    state.escalate.mockResolvedValue({ state: 'escalated' });
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toMatchObject({ scanned: 4, escalated: 4 });
    expect(state.scoped).toEqual([P1, P2, P1, P2]);
    expect(state.audited.map((a) => a.pariwarId)).toEqual([P1, P2, P1, P2]);
    expect(state.escalate.mock.calls.map((c) => (c[1] as { pariwarId: string; moveRequestId: string }).pariwarId)).toEqual([P1, P2, P1, P2]);
    expect(state.escalate.mock.calls.map((c) => (c[1] as { moveRequestId: string }).moveRequestId)).toEqual(state.rows.map((r) => r.moveRequestId));
  });
});

// CR36 — AD8 (a)'s pinned wiring ("cron '17 * * * *' Asia/Kolkata, localConcurrency 1, its OWN pool (max 2 beside the shared one)") was pinned by
// nothing; this is the shape of the 13.1b sweep's pins (`field-worker-code-sms.test.ts`, "registration and boot wiring").
describe('registration and boot wiring (AD8 (a))', () => {
  beforeEach(() => {
    state.crossTenant = true;
    state.rows = [];
    state.scanError = null;
    state.audited = [];
    state.scoped = [];
    state.escalate.mockReset();
  });

  const bossWith = () => {
    const createQueue = vi.fn<(name: string) => Promise<void>>(() => Promise.resolve());
    const work = vi.fn<(name: string, opts: unknown, handler: unknown) => Promise<string>>(() => Promise.resolve('worker-id'));
    const schedule = vi.fn<(name: string, cron: string, data: unknown, opts: unknown) => Promise<void>>(() => Promise.resolve());
    return { createQueue, work, schedule, boss: { createQueue, work, schedule } as unknown as Parameters<typeof registerFieldWorkerMoveRequestEscalationCron>[0] };
  };

  it('⭐ creates the queue, works it ONE tick at a time, schedules hourly at :17 in IST, and the handler runs ONE real tick counting the delivered jobs', async () => {
    const { boss, createQueue, work, schedule } = bossWith();
    await registerFieldWorkerMoveRequestEscalationCron(boss, { pool: {} as never, onAlarm: () => undefined });
    expect(DEFAULT_FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON).toBe('17 * * * *');
    expect(FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ).toBe('Asia/Kolkata');
    expect(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION).toBe('field_worker.move_request_escalation');
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION);
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION, { localConcurrency: 1 }, expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION, '17 * * * *', {}, { tz: 'Asia/Kolkata' });
    // The handler is the tick, not a stub: a delivered batch of two jobs runs ONE tick over the due row and counts both jobs.
    state.rows = [R(1)];
    state.escalate.mockResolvedValue({ state: 'escalated' });
    const handler = work.mock.calls[0]![2] as (jobs: unknown[]) => Promise<unknown>;
    await expect(handler([{}, {}])).resolves.toEqual({ jobs: 2, refused: false, scanned: 1, escalated: 1, skipped: 0, failed: 0 });
    expect(state.escalate).toHaveBeenCalledTimes(1);
  });

  it('a cron and a zone other than the defaults reach the schedule as given', async () => {
    const { boss, schedule } = bossWith();
    await registerFieldWorkerMoveRequestEscalationCron(boss, { pool: {} as never }, { cron: '*/5 * * * *', tz: 'UTC' });
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_MOVE_REQUEST_ESCALATION, '*/5 * * * *', {}, { tz: 'UTC' });
  });

  it('⭐ boot.ts gives the sweep its OWN max:2 pool (⛔ the shared one), ends it at BOTH shutdown sites, checks the cron shape, and registers it with that pool, its cron and its zone', () => {
    // CODE only, whitespace-normalised: a comment can neither satisfy these nor trip them, and a reformat that keeps the tokens does not break them.
    const boot = codeOnly(readFileSync(fileURLToPath(new URL('../src/boot.ts', import.meta.url)), 'utf-8')).replace(/\s+/g, ' ');
    expect(boot).toMatch(/const \{ pool: fieldWorkerMoveRequestEscalationPool \} = createDb\( ?connectionString, \{ max: 2, logger: false \} ?\)/);
    expect(boot.match(/fieldWorkerMoveRequestEscalationPool ?\.end\(\)/g)).toHaveLength(2);
    expect(boot).toMatch(/FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON must be a 5-field cron expression/);
    expect(boot).toMatch(
      /const FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON = process\.env\[['"]FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON['"]\] \?\? DEFAULT_FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON/,
    );
    const at = boot.indexOf('await registerFieldWorkerMoveRequestEscalationCron(');
    expect(at, 'the cron is registered in boot').toBeGreaterThan(-1);
    const tzAt = boot.indexOf('tz: FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ', at);
    expect(tzAt, 'the registration call is delimited by its options').toBeGreaterThan(at);
    const call = boot.slice(at, tzAt + 'tz: FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ'.length);
    for (const part of ['pool: fieldWorkerMoveRequestEscalationPool', 'cron: FIELD_WORKER_MOVE_REQUEST_ESCALATION_CRON', 'tz: FIELD_WORKER_MOVE_REQUEST_ESCALATION_TZ']) {
      expect(call, part).toContain(part);
    }
  });
});

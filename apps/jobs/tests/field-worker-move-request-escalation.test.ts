// Story 13.1d (AD8 (a)) — the escalation sweep's tick outcomes, DB-free: the Row 26 refusal, an escalation, a row no longer due (its
// twin, counted skipped), a failing row (alarmed, the next row still runs), the bound alarm, and a failed scan.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  crossTenant: true,
  rows: [] as Array<{ pariwarId: string; moveRequestId: string }>,
  escalate: vi.fn(),
  scanError: null as Error | null,
  audited: [] as Array<{ actorId: unknown; actorRole: unknown; action: unknown; resourceLocator: unknown }>,
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
    withPariwarScope: async (_pool: unknown, _p: string, fn: (db: unknown, client: unknown) => Promise<unknown>) => fn({}, {}),
    audit: {
      ...actual.audit,
      withCompensatingAudit: async (_pool: unknown, o: { auditIntent: (typeof state.audited)[number]; mutate: (x: { auditId: string }) => Promise<unknown> }) => {
        state.audited.push(o.auditIntent);
        return o.mutate({ auditId: '00000000-0000-4000-8000-000000000001' });
      },
    },
  };
});

const { runFieldWorkerMoveRequestEscalationTick } = await import('../src/scheduler/field-worker-move-request-escalation.js');

const R = (n: number) => ({ pariwarId: '11111111-1111-4111-8111-111111111111', moveRequestId: `00000000-0000-4000-8000-00000000000${String(n)}` });

describe('runFieldWorkerMoveRequestEscalationTick (Story 13.1d AD8 (a))', () => {
  let alarms: string[];
  const deps = () => ({ pool: {} as never, onAlarm: (m: string) => alarms.push(m) });
  beforeEach(() => {
    alarms = [];
    state.crossTenant = true;
    state.rows = [];
    state.scanError = null;
    state.audited = [];
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
    expect(alarms).toEqual([expect.stringContaining("the tick's bound (2) was hit")]);
    alarms = [];
    state.scanError = new Error('down');
    expect(await runFieldWorkerMoveRequestEscalationTick(deps())).toMatchObject({ scanned: 0, escalated: 0 });
    expect(alarms).toEqual([expect.stringContaining('field_worker_move_request.sweep_failed:Error')]);
  });
});

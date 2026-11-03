// Story 13.1 — the registration route when NO code can be allocated (AC8 (i); QE9; I11). Live DB, own-committing.
//
// Its own file: `vi.mock` is FILE-WIDE. The door module is mocked through `importActual` — `allocateAttributionCodeForRequest`
// rejects ONCE with the door's re-exported `AttributionCodeAllocationExhaustedError`; `flagAllocationExhaustedForRequest` is a
// SPY over the REAL wrapper, so a flag row is really COMMITTED (append-only — the harness cleans it under replica mode). The
// mock path is the door's own file, which the reach fence does not scan; the door forwards ⛔ test seam, by design.
//   · the flag wrapper is called once with the thrown `.attempts`; exactly ONE flag row; ⛔ worker, event or code row; 503;
//     the `field_worker.registered` intent and its `_rolled_back` line;
//   · a second leg makes the flag wrapper REJECT — still 503 (a failing flag write never replaces the exhaustion).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as door from '../../../src/modules/field-worker/attribution-code-access.js';
import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, type Harness } from './_registration-harness.js';

vi.mock('../../../src/modules/field-worker/attribution-code-access.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modules/field-worker/attribution-code-access.js')>();
  return {
    ...actual,
    allocateAttributionCodeForRequest: vi.fn(actual.allocateAttributionCodeForRequest),
    flagAllocationExhaustedForRequest: vi.fn(actual.flagAllocationExhaustedForRequest),
  };
});

const NAME = 'Exhausted Recognisable-Worker';
const MOBILE_DIGITS = '9812345670';

describe.skipIf(!hasDatabase)('Story 13.1 — registration when the code space is exhausted (AC8 (i))', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const allocate = vi.mocked(door.allocateAttributionCodeForRequest);
  const flag = vi.mocked(door.flagAllocationExhaustedForRequest);

  async function state(p: string) {
    const n = async (sql: string) => (await h.td.pool.query(sql, [p])).rows;
    return {
      workers: await n('SELECT 1 FROM field_workers WHERE pariwar_id = $1'),
      events: await n("SELECT 1 FROM events_log WHERE pariwar_id = $1 AND event_type LIKE 'field_worker.%'"),
      codes: await n('SELECT 1 FROM field_worker_attribution_codes WHERE pariwar_id = $1'),
      flags: (await n('SELECT attempts, actor_display FROM attribution_code_allocation_flags WHERE pariwar_id = $1')) as { attempts: number; actor_display: string }[],
      audit: ((await n("SELECT action, row_to_json(a)::text AS t FROM audit_log_entries a WHERE pariwar_id = $1 AND action LIKE 'field_worker.registered%' ORDER BY seq")) as {
        action: string;
        t: string;
      }[]),
    };
  }

  it('exhaustion ⇒ the flag wrapper is called once with the thrown attempts, ONE flag row is committed, nothing else survives, 503 + the _rolled_back line', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    allocate.mockRejectedValueOnce(new door.AttributionCodeAllocationExhaustedError(p, 8));
    flag.mockClear();
    const r = await h.register(client, p, { name: NAME, mobile: MOBILE_DIGITS, district: 'Patna' }, randomUUID());
    expect(r.statusCode, r.body).toBe(503);
    expect(errOf(r).code).toBe('field_worker.code_allocation_exhausted');
    expect(flag).toHaveBeenCalledTimes(1);
    expect(flag.mock.calls[0]![2]).toEqual({ attempts: 8 });
    const s = await state(p);
    expect(s.workers).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.codes).toEqual([]);
    expect(s.flags).toEqual([{ attempts: 8, actor_display: 'Asha Verma' }]);
    expect(s.audit.map((a) => a.action)).toEqual(['field_worker.registered', 'field_worker.registered_rolled_back']);
    // AC13 on the 503: neither the body nor the _rolled_back row carries the name or the mobile.
    for (const text of [r.body, ...s.audit.map((a) => a.t)]) {
      expect(text).not.toContain('Recognisable');
      expect(text).not.toContain(MOBILE_DIGITS);
    }
  });

  it('the flag write itself FAILS ⇒ still 503 field_worker.code_allocation_exhausted (the original error is rethrown), no flag row', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    allocate.mockRejectedValueOnce(new door.AttributionCodeAllocationExhaustedError(p, 8));
    flag.mockRejectedValueOnce(new Error('flag write failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const r = await h.register(client, p, { name: NAME, mobile: '9812345671', district: 'Patna' }, randomUUID());
      expect(r.statusCode, r.body).toBe(503);
      expect(errOf(r).code).toBe('field_worker.code_allocation_exhausted');
      expect(consoleError.mock.calls.some((c) => c[0] === '[field-worker] exhaustion flag failed')).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
    const s = await state(p);
    expect(s.flags).toEqual([]);
    expect([s.workers.length, s.events.length, s.codes.length]).toEqual([0, 0, 0]);
  });

  it('CONTROL: with the door un-mocked for the call, the same route registers (201) — the mock, not the route, made the 503', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const { client } = await h.actor(p, 'pariwar_admin', 'pariwar', p);
    const r = await h.register(client, p, { name: NAME, mobile: '9812345672', district: 'Patna' }, randomUUID());
    expect(r.statusCode, r.body).toBe(201);
    expect((await state(p)).codes).toHaveLength(1);
  });
});

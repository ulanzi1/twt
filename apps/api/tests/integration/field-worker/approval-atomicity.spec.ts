// Story 13.1a — AC3 (a) / I2 / TR4: the approval is BOTH events or NEITHER. A FILE-WIDE `@twt/domain` mock makes the SECOND command
// (`activateFieldWorker`) throw on demand AFTER the REAL first command (`recordFieldWorkerKycCompleted`) has appended its event in the
// open transaction — the one failure the HTTP surface cannot force otherwise. Live DB, own-committing (the harness cleans up).
// Asserted with the REASON and a CONTROL (a rollback assertion alone is vacuous): the forced error surfaces as the 500, both intent
// lines have their `_rolled_back` twins, nothing persisted, and the SAME worker then approves cleanly with the switch off.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const failSecond = vi.hoisted(() => ({ on: false, calls: 0 }));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      activateFieldWorker: vi.fn(async (...args: Parameters<typeof actual.fieldWorker.activateFieldWorker>) => {
        failSecond.calls += 1;
        if (failSecond.on) throw new Error('forced: the second approval command failed');
        return actual.fieldWorker.activateFieldWorker(...args);
      }),
    },
  };
});

const { hasDatabase } = await import('../_setup.js');
const { createHarness, json } = await import('./_registration-harness.js');
type Harness = Awaited<ReturnType<typeof createHarness>>;

describe.skipIf(!hasDatabase)('Story 13.1a — the approval is atomic (AC3 a; TR4)', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  it('a failure of activateFieldWorker AFTER kyc_completed was appended ⇒ 500; NEITHER event persists; the row is unchanged; BOTH intent lines have their twins — CONTROL: the same worker then approves', async () => {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Approver');
    const id = await h.registered(admin.client, p, { name: 'Atomic Test-Worker', mobile: '+919876512345', district: 'Patna' });

    failSecond.on = true;
    const callsBefore = failSecond.calls;
    const r = await h.approve(admin.client, p, id, randomUUID());
    failSecond.on = false;
    expect(r.statusCode, r.body).toBe(500);
    expect(failSecond.calls).toBe(callsBefore + 1); // the REASON: the second command was reached and threw

    const ev = await h.td.pool.query<{ event_type: string }>('SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id]);
    expect(ev.rows.map((e) => e.event_type)).toEqual(['field_worker.registered']);
    const row = await h.td.pool.query('SELECT current_state, kyc_status, state_event_version::int AS v, approved_by_display FROM field_workers WHERE field_worker_id = $1', [id]);
    expect(row.rows[0]).toEqual({ current_state: 'pending_kyc', kyc_status: 'pending', v: 1, approved_by_display: null });
    const lines = await h.td.pool.query<{ action: string; response_status: number }>(
      "SELECT action, response_status FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 AND action NOT LIKE 'field_worker.registered%' ORDER BY seq",
      [p, `field_worker/${id}`],
    );
    expect(lines.rows.map((l) => l.action).sort()).toEqual(
      ['field_worker.activated', 'field_worker.activated_rolled_back', 'field_worker.kyc_completed', 'field_worker.kyc_completed_rolled_back'].sort(),
    );

    // CONTROL — a fresh key, the switch off: the same worker approves, so the empty stream above was the rollback, not a broken row.
    const ok = await h.approve(admin.client, p, id, randomUUID());
    expect(ok.statusCode, ok.body).toBe(200);
    expect(json(ok)).toMatchObject({ current_state: 'active', kyc_status: 'completed' });
  });
});

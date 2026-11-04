// Story 13.1a — `GET /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/code` through HTTP (AC5; AD7, AD8; I1, I5; decision `-447`
// item 1 — review R2 / R3). Live DB, own-committing (the harness cleans up).
//
// Two FILE-WIDE mocks, both PASS-THROUGH unless a leg switches them:
//   · the door's `readAttributionCodeForRequest` is a spy over the real function — "the door was NOT called" is meaningful only
//     because the happy leg proves the same spy IS called (Testing standards);
//   · `@twt/domain`'s `audit.withCompensatingAudit` can be made to FAIL its intent write (nothing may be released) or to PAUSE
//     between the intent line and `mutate` (the R3 leg: a suspend must wait on the row lock until the code has been read).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  failIntent: false,
  pause: null as null | (() => Promise<void>),
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (pool: Parameters<typeof actual.audit.withCompensatingAudit>[0], args: Parameters<typeof actual.audit.withCompensatingAudit>[1]) => {
        if (args.auditIntent.action === 'field_worker.code_read') {
          if (hooks.failIntent) throw new Error('forced: the audit intent write failed');
          if (hooks.pause !== null) {
            const pause = hooks.pause;
            return actual.audit.withCompensatingAudit(pool, {
              ...args,
              mutate: async (ctx) => {
                await pause();
                return args.mutate(ctx);
              },
            });
          }
        }
        return actual.audit.withCompensatingAudit(pool, args);
      }),
    },
  };
});
vi.mock('../../../src/modules/field-worker/attribution-code-access.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modules/field-worker/attribution-code-access.js')>();
  return { ...actual, readAttributionCodeForRequest: vi.fn(actual.readAttributionCodeForRequest) };
});

const { fieldWorker, ids } = await import('@twt/domain');
const { hasDatabase } = await import('../_setup.js');
const { moveTestFieldWorker } = await import('../_field-worker-fixture.js');
const { readAttributionCodeForRequest } = await import('../../../src/modules/field-worker/attribution-code-access.js');
const { createHarness, errOf, json } = await import('./_registration-harness.js');
type Harness = Awaited<ReturnType<typeof createHarness>>;

const doorSpy = vi.mocked(readAttributionCodeForRequest);
const NAME = 'Codeholder Unusual-Surname';
const MOBILE_DIGITS = '9876523456';

describe.skipIf(!hasDatabase)('Story 13.1a — read a field worker’s code by hand (AC5)', { timeout: 60_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const codeLines = (p: string, id: string) =>
    h.td.pool
      .query<{ action: string; actor_id: string; actor_role: string; resource_locator: string }>(
        "SELECT action, actor_id, actor_role, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 AND resource_locator = $2 AND action LIKE 'field_worker.code_read%' ORDER BY seq",
        [p, `field_worker/${id}`],
      )
      .then((r) => r.rows);
  const storedCode = (id: string) =>
    h.td.pool.query<{ code: string }>('SELECT code FROM field_worker_attribution_codes WHERE field_worker_id = $1', [id]).then((r) => r.rows[0]!.code);

  /** A Pariwar (Patna, Gaya listed), a Pariwar Admin, and one worker — approved unless `pending`. */
  async function activeWorker(opts: { pending?: boolean; district?: string } = {}) {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Approver');
    const id = await h.registered(admin.client, p, { name: NAME, mobile: `+91${MOBILE_DIGITS}`, district: opts.district ?? 'Patna' });
    if (!opts.pending) expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    return { p, admin, id };
  }

  async function ownerTx(fn: (c: import('pg').PoolClient) => Promise<void>): Promise<void> {
    const c = await h.td.pool.connect();
    try {
      await c.query('BEGIN');
      await fn(c);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }

  async function waitForLockWaiter(pattern: string): Promise<void> {
    for (let i = 0; i < 100; i += 1) {
      const r = await h.td.pool.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE $1", [pattern]);
      if ((r.rows[0] as { n: number }).n > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`no backend waited on a lock for ${pattern}`);
  }

  it('an ACTIVE worker: 200 { field_worker_id, code } with no-store; EXACTLY ONE code_read line naming the actor and role, written before the read; the door IS called; the code is in no audit row and no log', async () => {
    const { p, admin, id } = await activeWorker();
    doorSpy.mockClear();
    const r = await h.code(admin.client, p, id);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    const code = await storedCode(id);
    expect(json(r)).toEqual({ field_worker_id: id, code });
    expect(doorSpy).toHaveBeenCalledTimes(1);
    expect(await codeLines(p, id)).toEqual([{ action: 'field_worker.code_read', actor_id: admin.userId, actor_role: 'pariwar_admin', resource_locator: `field_worker/${id}` }]);
    const audit = await h.td.pool.query('SELECT row_to_json(a)::text AS t FROM audit_log_entries a WHERE pariwar_id = $1', [p]);
    const sweep = audit.rows.map((x) => x.t as string).join('\n') + h.logs();
    expect(sweep).not.toContain(code);
    expect(sweep).not.toContain(NAME);
    expect(sweep).not.toContain(MOBILE_DIGITS);
  });

  it('pending_kyc, suspended, terminated ⇒ 409 field_worker.code_not_available (details.current_state), NO audit line and NO door call', async () => {
    for (const state of ['pending_kyc', 'suspended', 'terminated'] as const) {
      const { p, admin, id } = await activeWorker({ pending: state === 'pending_kyc' });
      const base = { pariwarId: ids.pariwarId(p), fieldWorkerId: ids.fieldWorkerId(id), actor: 'operator' as const, actorId: admin.userId, auditId: randomUUID() };
      if (state === 'suspended') await ownerTx((c) => fieldWorker.suspendFieldWorker(c, { ...base, reasonCode: 'under_review' }).then(() => undefined));
      if (state === 'terminated') {
        await ownerTx(async (c) => {
          const today = (await c.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
          await fieldWorker.terminateFieldWorker(c, { ...base, reasonCode: 'inactive', endedOn: today });
        });
      }
      doorSpy.mockClear();
      const r = await h.code(admin.client, p, id);
      expect(r.statusCode, `${state}: ${r.body}`).toBe(409);
      const body = JSON.parse(r.body) as { error: { code: string; details?: { current_state?: string } } };
      expect(body.error.code).toBe('field_worker.code_not_available');
      expect(body.error.details?.current_state).toBe(state);
      expect(doorSpy).not.toHaveBeenCalled();
      expect(await codeLines(p, id)).toEqual([]);
    }
  });

  it('if the audit write fails, the code is NOT released (and the door is not read)', async () => {
    const { p, admin, id } = await activeWorker();
    doorSpy.mockClear();
    hooks.failIntent = true;
    try {
      const r = await h.code(admin.client, p, id);
      expect(r.statusCode).toBe(500);
      expect(r.body).not.toContain(await storedCode(id));
    } finally {
      hooks.failIntent = false;
    }
    expect(doorSpy).not.toHaveBeenCalled();
  });

  it('an ACTIVE worker the door returns null for ⇒ 500 (an integrity fault — never a made-up code)', async () => {
    const { p, admin, id } = await activeWorker();
    doorSpy.mockResolvedValueOnce(null);
    const r = await h.code(admin.client, p, id);
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toMatch(/"code":"\d{6}"/);
  });

  it('the holders: a District Admin of the worker’s district, a Pariwar Admin, a super_admin ⇒ 200; a District Admin of another district, a caller without the key ⇒ 403; unknown / other-Pariwar ⇒ the same 403', async () => {
    const { p, admin, id } = await activeWorker();
    const daOwn = await h.actor(p, 'district_admin', 'district', 'Patna');
    const daOther = await h.actor(p, 'district_admin', 'district', 'Gaya');
    const sa = await h.actor(p, 'super_admin', 'global', null);
    const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
    for (const c of [daOwn.client, admin.client, sa.client]) expect((await h.code(c, p, id)).statusCode).toBe(200);
    expect((await h.code(daOwn.client, p, id)).headers['cache-control']).toBe('no-store');
    expect(await codeLines(p, id)).toHaveLength(4);
    const lines = await codeLines(p, id);
    expect(lines.map((l) => l.actor_role)).toEqual(['district_admin', 'pariwar_admin', 'super_admin', 'district_admin']);
    for (const c of [daOther.client, helpline.client]) expect((await h.code(c, p, id)).statusCode).toBe(403);
    const other = await activeWorker();
    const unknown = await h.code(admin.client, p, randomUUID());
    const foreign = await h.code(admin.client, p, other.id);
    expect([unknown.statusCode, foreign.statusCode]).toEqual([403, 403]);
    expect(errOf(foreign).code).toBe(errOf(unknown).code);
  });

  it('R3 — a SUSPEND that commits while the request waits on the FOR SHARE lock is seen: 409 code_not_available, no line, no door call', async () => {
    const { p, admin, id } = await activeWorker();
    const suspender = await h.td.pool.connect();
    doorSpy.mockClear();
    try {
      await suspender.query('BEGIN');
      await fieldWorker.suspendFieldWorker(suspender, {
        pariwarId: ids.pariwarId(p),
        fieldWorkerId: ids.fieldWorkerId(id),
        actor: 'operator',
        actorId: admin.userId,
        auditId: randomUUID(),
        reasonCode: 'under_review',
      }); // holds FOR UPDATE until COMMIT
      const pending = h.code(admin.client, p, id);
      await waitForLockWaiter('%from "field_workers"%for share%');
      await suspender.query('COMMIT');
      const r = await pending;
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.code_not_available');
    } finally {
      suspender.release();
    }
    expect(doorSpy).not.toHaveBeenCalled();
    expect(await codeLines(p, id)).toEqual([]);
  });

  it('R3 — the lock is HELD from the active check through the audit line to the door read: a suspend started meanwhile WAITS, and the code is read first', async () => {
    const { p, admin, id } = await activeWorker();
    let suspended: Promise<unknown> | null = null;
    const suspender = await h.td.pool.connect();
    hooks.pause = async () => {
      // Inside `mutate` — the intent line is written, the door not yet read. A suspend now must block on the row.
      await suspender.query('BEGIN');
      suspended = fieldWorker.suspendFieldWorker(suspender, {
        pariwarId: ids.pariwarId(p),
        fieldWorkerId: ids.fieldWorkerId(id),
        actor: 'operator',
        actorId: admin.userId,
        auditId: randomUUID(),
        reasonCode: 'under_review',
      });
      await waitForLockWaiter('%FROM field_workers WHERE field_worker_id%FOR UPDATE%');
    };
    try {
      const r = await h.code(admin.client, p, id);
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)['code']).toBe(await storedCode(id));
      await suspended;
      await suspender.query('COMMIT');
    } finally {
      hooks.pause = null;
      suspender.release();
    }
    const state = await h.td.pool.query('SELECT current_state FROM field_workers WHERE field_worker_id = $1', [id]);
    expect(state.rows[0]).toEqual({ current_state: 'suspended' });
  });

  it('R2 — a MOVE that commits while the request waits on the lock ⇒ 409 field_worker.authorization_stale (the gate passed on the old district), no line, no door call', async () => {
    const { p, id } = await activeWorker();
    const daPatna = await h.actor(p, 'district_admin', 'district', 'Patna');
    const mover = await h.td.pool.connect();
    doorSpy.mockClear();
    try {
      await mover.query('BEGIN');
      await moveTestFieldWorker(mover, p, ids.fieldWorkerId(id), 'Gaya');
      const pending = h.code(daPatna.client, p, id);
      await waitForLockWaiter('%from "field_workers"%for share%');
      await mover.query('COMMIT');
      const r = await pending;
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.authorization_stale');
    } finally {
      mover.release();
    }
    expect(doorSpy).not.toHaveBeenCalled();
    expect(await codeLines(p, id)).toEqual([]);
  });
});

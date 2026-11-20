// Story 13.1f (AC9 (b), (d), (e), (f); AD11; G20; code review round 2 R2C-11) — the guarantees of the SHOWN NUMBER that the happy-path leg in
// `undo-appeal.spec.ts` ("a number held by ENDED records -> 409 ...") cannot show, because each needs something that leg does not have:
//   (b) a number with BOTH an ended record and a live holder - the live holder must answer FIRST;
//   (d) the key service is called to SEAL only - never to decrypt - on every leg of the route;
//   (e) a retry of the first submit under the SAME Idempotency-Key writes a second disclosure line (a refusal is never stored for replay - G20);
//   (f) the disclosure audit write FAILING -> 500, no `details`, nothing disclosed, no worker created.
// (f) needs a file-wide mock of `@twt/domain` (the 13.1a `code-read.spec.ts` / 13.1d `move-request-reads-audit.spec.ts` shape: the REAL
// `withCompensatingAudit`, handed a pool that cannot connect for ONE action), so this lives apart from the 600-line HTTP spec. Live DB,
// OWN-COMMITTING; a fresh Pariwar per test. Every leg has a CONTROL that proves the thing it relies on (the spy, the injection) is live.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ breakAudit: null as null | string }));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (pool: Parameters<typeof actual.audit.withCompensatingAudit>[0], args: Parameters<typeof actual.audit.withCompensatingAudit>[1]) => {
        // The REAL wrapper on a pool that cannot connect: `writeAuditEntry` throws inside it, so what the leg proves is the wrapper's own
        // order (intent first, `mutate` - which builds the 409 - never reached), not a mock that throws before calling it.
        const downPool = { connect: async () => { throw new Error('forced: the audit pool is down'); } } as unknown as typeof pool;
        return actual.audit.withCompensatingAudit(hooks.breakAudit === args.auditIntent.action ? downPool : pool, args);
      }),
    },
  };
});

const { hasDatabase } = await import('../_setup.js');
const { createHarness, errOf, json } = await import('./_registration-harness.js');
type Harness = Awaited<ReturnType<typeof createHarness>>;
type Client = Awaited<ReturnType<Harness['actor']>>['client'];

const NAME = 'Shown Unusual-Surname';
const SHOWN = 'field_worker.previous_endings_shown';
const randomMobile = () => `+9198765${String(10000 + Math.floor(Math.random() * 89999)).padStart(5, '0')}`;

describe.skipIf(!hasDatabase)('Story 13.1f — the shown number: the guarantees the happy path cannot show (AC9 (b), (d), (e), (f))', { timeout: 120_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const istDay = async () => (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
  const shownLines = (p: string) => q<{ n: number }>('SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2', [p, SHOWN]).then((r) => r[0]!.n);
  const workers = (p: string) => q<{ n: number }>('SELECT count(*)::int AS n FROM field_workers WHERE pariwar_id = $1', [p]).then((r) => r[0]!.n);

  interface World {
    p: string;
    pa: { client: Client; userId: string };
    da: { client: Client; userId: string };
  }
  async function world(): Promise<World> {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    return {
      p,
      pa: await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin'),
      da: await h.actor(p, 'district_admin', 'district', 'Patna', 'Asha District-Admin'),
    };
  }
  /** Register (the officer has seen any earlier ending), approve: an ACTIVE worker. */
  async function activeWorker(w: World, mobile: string): Promise<string> {
    const id = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true });
    expect((await h.approve(w.pa.client, w.p, id)).statusCode).toBe(200);
    return id;
  }
  async function end(w: World, id: string): Promise<void> {
    const r = await h.terminate(w.pa.client, w.p, id, { reason_code: 'left_voluntarily', ended_on: await istDay() });
    expect(r.statusCode, r.body).toBe(200);
  }
  const details = (r: Awaited<ReturnType<Harness['register']>>) => (errOf(r) as unknown as { details?: { previous_endings?: Array<{ field_worker_id: string }> } }).details;

  it('(b) a number held by an ENDED record AND a live worker answers 409 mobile_already_registered FIRST - no ended list, no disclosure line; CONTROL: once the live one ends too, the same request is shown BOTH', async () => {
    const w = await world();
    const mobile = randomMobile();
    const first = await activeWorker(w, mobile);
    await end(w, first);
    const second = await activeWorker(w, mobile); // the live holder (registered with previous_endings_seen, as the officer saw the ending)
    const r = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('field_worker.mobile_already_registered');
    expect(r.body).not.toContain(first);
    expect(r.body).not.toContain('previous_endings');
    expect(await shownLines(w.p), 'a live holder wrote a disclosure line').toBe(0);
    // CONTROL - with no live holder the SAME request discloses (so the 409 above is the live check, not a missing ended record).
    await end(w, second);
    const shown = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
    expect(shown.statusCode, shown.body).toBe(409);
    expect(errOf(shown).code).toBe('field_worker.number_previously_ended');
    expect(details(shown)!.previous_endings!.map((e) => e.field_worker_id).sort()).toEqual([first, second].sort());
    expect(await shownLines(w.p)).toBe(1);
  });

  it('(e) a retry of the FIRST submit under the SAME Idempotency-Key writes a SECOND disclosure line (G20: a refusal is never stored, so it is never replayed unrecorded); CONTROL: the 409s agree', async () => {
    const w = await world();
    const mobile = randomMobile();
    const old = await activeWorker(w, mobile);
    await end(w, old);
    const key = randomUUID();
    const body = { name: NAME, mobile, district: 'Patna' };
    const first = await h.register(w.da.client, w.p, body, key);
    expect(first.statusCode, first.body).toBe(409);
    expect(await shownLines(w.p)).toBe(1);
    const retry = await h.register(w.da.client, w.p, body, key);
    expect(retry.statusCode, retry.body).toBe(409);
    expect(errOf(retry).code).toBe('field_worker.number_previously_ended');
    expect(details(retry)).toEqual(details(first)); // CONTROL - the same answer, regenerated
    expect(await shownLines(w.p), 'the retry was replayed from the idempotency store - the second disclosure went unrecorded').toBe(2);
  });

  it('(f) the disclosure audit write FAILING -> 500, NO details, the ended record not named, no worker created, no line; CONTROL: with the pool up the same request discloses and writes its line', async () => {
    const w = await world();
    const mobile = randomMobile();
    const old = await activeWorker(w, mobile);
    await end(w, old);
    const workersBefore = await workers(w.p);
    hooks.breakAudit = SHOWN;
    try {
      const r = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
      expect(r.statusCode, r.body).toBe(500);
      expect(details(r)).toBeUndefined();
      expect(r.body).not.toContain(old);
      expect(r.body).not.toContain('previous_endings');
      expect(r.body).not.toContain('number_previously_ended');
    } finally {
      hooks.breakAudit = null;
    }
    expect(await shownLines(w.p)).toBe(0); // no intent line was written, so nothing was disclosed
    expect(await workers(w.p)).toBe(workersBefore);
    // CONTROL - the pool up: the same request discloses, AFTER its line.
    const ok = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
    expect(ok.statusCode, ok.body).toBe(409);
    expect(details(ok)!.previous_endings!.map((e) => e.field_worker_id)).toEqual([old]);
    expect(await shownLines(w.p)).toBe(1);
  });

  it('(d) the key service is called to SEAL only: across the 409, the re-submission and the LINKED registration it seals (encryptDek) and NEVER decrypts (decryptDek)', async () => {
    const w = await world();
    const mobile = randomMobile();
    const old = await activeWorker(w, mobile);
    await end(w, old);
    const kms = h.deps.encryption.kms;
    // Pass-through spies (no mockImplementation): the real key service still runs. Installed AFTER the setup above, which may decrypt for its own reasons.
    const decrypt = vi.spyOn(kms, 'decryptDek');
    const encrypt = vi.spyOn(kms, 'encryptDek');
    try {
      const shown = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
      expect(shown.statusCode, shown.body).toBe(409);
      expect(encrypt, 'CONTROL - the spy is live: sealing the submitted name and mobile calls the key service').toHaveBeenCalled();
      const sealedByShown = encrypt.mock.calls.length;
      const linked = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: old });
      expect(linked.statusCode, linked.body).toBe(201);
      expect(encrypt.mock.calls.length, 'the linked registration sealed nothing').toBeGreaterThan(sealedByShown);
      expect(json(linked)['field_worker_id']).toBeTypeOf('string');
      expect(decrypt, 'the route decrypted something (a name or mobile of an earlier record?)').not.toHaveBeenCalled();
    } finally {
      decrypt.mockRestore();
      encrypt.mockRestore();
    }
  });
});

// Story 13.1a — the list, the identity and the districts reads through HTTP (AC6, AC7, AC8; AD4, AD7, AD9, AD10; decision `-447`
// items 1, 3, 4, 5). Live DB, own-committing (the harness cleans up). Workers are registered THROUGH THE ROUTE, so their name and
// mobile are real envelopes under the test encryption (⛔ `_field-worker-fixture.ts`'s `'enc:v1:fixture-name'`, which is not an
// envelope and answers 500 `field_worker.identity_unreadable` — corrected by review R13).
//
// A FILE-WIDE `@twt/domain` mock, PASS-THROUGH unless a leg sets a hook: `fieldWorker.getFieldWorker` (the per-worker gate's loader)
// can run a callback AFTER it returns — the R2 leg commits a move there; `fieldWorker.pageFieldWorkersForPariwar` is a spy (a bad
// cursor must run no page SQL); `audit.withCompensatingAudit` records when a read's `mutate` starts (the line is written by then).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  afterLoad: null as null | (() => Promise<void>),
  order: [] as string[],
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      getFieldWorker: vi.fn(async (...args: Parameters<typeof actual.fieldWorker.getFieldWorker>) => {
        const out = await actual.fieldWorker.getFieldWorker(...args);
        if (hooks.afterLoad !== null) {
          const run = hooks.afterLoad;
          hooks.afterLoad = null;
          await run();
        }
        return out;
      }),
      pageFieldWorkersForPariwar: vi.fn(actual.fieldWorker.pageFieldWorkersForPariwar),
    },
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (pool: Parameters<typeof actual.audit.withCompensatingAudit>[0], args: Parameters<typeof actual.audit.withCompensatingAudit>[1]) =>
        actual.audit.withCompensatingAudit(pool, {
          ...args,
          mutate: async (ctx) => {
            hooks.order.push(`mutate:${args.auditIntent.action}`);
            return args.mutate(ctx);
          },
        }),
      ),
    },
  };
});

const { fieldWorker, ids } = await import('@twt/domain');
const { hasDatabase, makeClient } = await import('../_setup.js');
const { moveTestFieldWorker } = await import('../_field-worker-fixture.js');
const { createHarness, errOf, json } = await import('./_registration-harness.js');
type Harness = Awaited<ReturnType<typeof createHarness>>;

const pageSpy = vi.mocked(fieldWorker.pageFieldWorkersForPariwar);

describe.skipIf(!hasDatabase)('Story 13.1a — the field-worker reads (AC6, AC7, AC8)', { timeout: 90_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const lines = (p: string, action: string) =>
    h.td.pool
      .query<{ actor_id: string; actor_role: string; resource_locator: string }>(
        'SELECT actor_id, actor_role, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2 ORDER BY seq',
        [p, action],
      )
      .then((r) => r.rows);

  async function pariwar(districts: string[] = ['Patna', 'Gaya']) {
    const p = h.freshPariwar();
    await h.listDistrict(p, ...districts);
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Approver');
    return { p, admin };
  }
  let mobileSeq = 0;
  const nextMobile = (): string => `+9198765${String(40000 + (mobileSeq += 1)).padStart(5, '0')}`;
  const reg = (h0: Harness, c: Awaited<ReturnType<typeof pariwar>>['admin']['client'], p: string, name: string, district = 'Patna') =>
    h0.registered(c, p, { name, mobile: nextMobile(), district });

  /** Corrupt a stored name (replica mode — the 0201 trigger makes the identity immutable). */
  async function setStoredName(id: string, value: string): Promise<void> {
    const c = await h.td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('UPDATE field_workers SET name_ciphertext = $2 WHERE field_worker_id = $1', [id, value]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }
  /** A well-formed envelope whose ciphertext was altered: it parses, its key unwraps, AES-GCM authentication fails (R8). */
  function tampered(envelope: string): string {
    const body = JSON.parse(Buffer.from(envelope.slice('enc:v1:'.length), 'base64').toString('utf-8')) as Record<string, string>;
    const ct = Buffer.from(body['ciphertext']!, 'base64');
    ct[0] = ct[0]! ^ 0xff;
    return 'enc:v1:' + Buffer.from(JSON.stringify({ ...body, ciphertext: ct.toString('base64') }), 'utf-8').toString('base64');
  }

  describe('the list (AC6)', () => {
    it('the gate (AD4 b): a Pariwar Admin with and without a district; a District Admin only WITH a district they hold — else 403', async () => {
      const { p, admin } = await pariwar();
      await reg(h, admin.client, p, 'Asha Patna-Worker');
      const da = await h.actor(p, 'district_admin', 'district', 'Patna');
      expect((await h.list(admin.client, p, { state: 'pending_kyc' })).statusCode).toBe(200);
      expect((await h.list(admin.client, p, { state: 'pending_kyc', district: 'Gaya' })).statusCode).toBe(200);
      expect((await h.list(da.client, p, { state: 'pending_kyc', district: 'Patna' })).statusCode).toBe(200);
      expect((await h.list(da.client, p, { state: 'pending_kyc' })).statusCode).toBe(403);
      expect((await h.list(da.client, p, { state: 'pending_kyc', district: 'Gaya' })).statusCode).toBe(403);
      expect((await h.list(da.client, p, { state: 'pending_kyc', district: 'patna' })).statusCode).toBe(403); // byte for byte
      const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
      expect((await h.list(helpline.client, p, { state: 'pending_kyc' })).statusCode).toBe(403);
    });

    it('items carry the DECRYPTED name and NO mobile, newest first; no-store; `limit` as a string; one list_viewed line whose locator names the page’s ids', async () => {
      const { p, admin } = await pariwar();
      const first = await reg(h, admin.client, p, 'Bharat First-Worker');
      const second = await reg(h, admin.client, p, 'Chitra Second-Worker');
      const r = await h.list(admin.client, p, { state: 'pending_kyc', limit: '20' });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.headers['cache-control']).toBe('no-store');
      const out = json(r) as { items: Record<string, unknown>[]; next_cursor: string | null };
      expect(out.next_cursor).toBeNull();
      // Registered in two transactions — distinct stamps — so newest first is `second`.
      expect(out.items.map((i) => [i['field_worker_id'], i['name']])).toEqual([
        [second, 'Chitra Second-Worker'],
        [first, 'Bharat First-Worker'],
      ]);
      expect(out.items[0]).toMatchObject({ district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending', registered_by_display: 'Meera Approver' });
      expect(out.items.every((i) => !('mobile' in i))).toBe(true);
      expect(r.body).not.toMatch(/\+91/);
      const l = await lines(p, 'field_worker.list_viewed');
      expect(l).toEqual([{ actor_id: admin.userId, actor_role: 'pariwar_admin', resource_locator: `field_workers/${second},${first}` }]);
      // ⛔ A name in any audit field.
      const audit = await h.td.pool.query('SELECT row_to_json(a)::text AS t FROM audit_log_entries a WHERE pariwar_id = $1', [p]);
      expect(audit.rows.map((x) => x.t as string).join('\n')).not.toMatch(/Bharat|Chitra/);
    });

    it('the line is written BEFORE the first decrypt (the read’s mutate starts, then the KMS is called)', async () => {
      const { p, admin } = await pariwar();
      await reg(h, admin.client, p, 'Order Check-Worker');
      hooks.order.length = 0;
      const kms = h.deps.encryption.kms;
      const spy = vi.spyOn(kms, 'decryptDek').mockImplementation(async function (this: unknown, ...args: Parameters<typeof kms.decryptDek>) {
        hooks.order.push('decrypt');
        spy.mockRestore();
        return kms.decryptDek(...args);
      });
      try {
        expect((await h.list(admin.client, p, { state: 'pending_kyc' })).statusCode).toBe(200);
      } finally {
        spy.mockRestore();
      }
      const at = hooks.order.indexOf('mutate:field_worker.list_viewed');
      expect(at).toBeGreaterThanOrEqual(0);
      expect(hooks.order.indexOf('decrypt')).toBeGreaterThan(at);
    });

    it('the cursor walks every row exactly once with a registration BETWEEN pages; two pages write two lines with their own ids', async () => {
      const { p, admin } = await pariwar();
      const made: string[] = [];
      for (let i = 0; i < 5; i += 1) made.push(await reg(h, admin.client, p, `Walker Number-${i}`));
      const page1 = json(await h.list(admin.client, p, { state: 'pending_kyc', limit: '2' })) as { items: { field_worker_id: string }[]; next_cursor: string };
      const late = await reg(h, admin.client, p, 'Late Arrival-Worker');
      const seen = page1.items.map((i) => i.field_worker_id);
      let cursor: string | null = page1.next_cursor;
      while (cursor !== null) {
        const page = json(await h.list(admin.client, p, { state: 'pending_kyc', limit: '2', cursor })) as { items: { field_worker_id: string }[]; next_cursor: string | null };
        seen.push(...page.items.map((i) => i.field_worker_id));
        cursor = page.next_cursor;
      }
      expect(seen).toEqual([...made].reverse());
      expect(seen).not.toContain(late); // newer than the cursor — it heads the NEXT first page, never a duplicate or a gap
      const l = await lines(p, 'field_worker.list_viewed');
      expect(l).toHaveLength(3);
      expect(l[0]!.resource_locator).toBe(`field_workers/${made[4]},${made[3]}`);
      expect(l[1]!.resource_locator).toBe(`field_workers/${made[2]},${made[1]}`);
    });

    it('R7 — two CONCURRENT pages by two officers with overlapping ids each get their own line naming exactly what each saw; a changed result set changes the next line', async () => {
      const { p, admin } = await pariwar();
      const a = await reg(h, admin.client, p, 'Overlap Worker-A');
      const b = await reg(h, admin.client, p, 'Overlap Worker-B');
      const da = await h.actor(p, 'district_admin', 'district', 'Patna');
      const [r1, r2] = await Promise.all([
        h.list(admin.client, p, { state: 'pending_kyc' }),
        h.list(da.client, p, { state: 'pending_kyc', district: 'Patna' }),
      ]);
      expect([r1.statusCode, r2.statusCode]).toEqual([200, 200]);
      const first = await lines(p, 'field_worker.list_viewed');
      expect(first.map((l) => [l.actor_id, l.resource_locator]).sort()).toEqual(
        [
          [admin.userId, `field_workers/${b},${a}`],
          [da.userId, `field_workers/${b},${a}`],
        ].sort(),
      );
      const c = await reg(h, admin.client, p, 'Overlap Worker-C');
      expect((await h.list(da.client, p, { state: 'pending_kyc', district: 'Patna' })).statusCode).toBe(200);
      const after = await lines(p, 'field_worker.list_viewed');
      expect(after[after.length - 1]).toEqual({ actor_id: da.userId, actor_role: 'district_admin', resource_locator: `field_workers/${c},${b},${a}` });
    });

    it('400s BEFORE any page SQL:a forged / truncated / wrong-shape cursor ⇒ field_worker.cursor_invalid; a NUL or empty district, a bad state or limit ⇒ request.validation', async () => {
      const { p, admin } = await pariwar();
      pageSpy.mockClear();
      const valid = fieldWorker.encodeFieldWorkerCursor({ createdAtExact: '2026-11-04 10:00:00+00', fieldWorkerId: ids.fieldWorkerId(randomUUID()) });
      for (const cursor of ['not-a-cursor', valid.slice(0, -2), Buffer.from(JSON.stringify({ c: 'x', m: 'y' })).toString('base64url')]) {
        const r = await h.list(admin.client, p, { state: 'active', cursor });
        expect(r.statusCode, cursor).toBe(400);
        expect(errOf(r).code).toBe('field_worker.cursor_invalid');
      }
      expect(pageSpy).not.toHaveBeenCalled();
      for (const query of [
        { state: 'active', district: `Pat${String.fromCharCode(0)}na` },
        { state: 'active', district: '' },
        { state: 'approved' },
        { state: 'active', limit: '26' },
        {},
      ]) {
        const r = await h.list(admin.client, p, query as Record<string, string>);
        expect(r.statusCode, JSON.stringify(query)).toBe(400);
        expect(errOf(r).code).toBe('request.validation');
      }
      expect(pageSpy).not.toHaveBeenCalled();
      // CONTROL — a valid request does run the page read (so "not called" above is meaningful).
      expect((await h.list(admin.client, p, { state: 'active' })).statusCode).toBe(200);
      expect(pageSpy).toHaveBeenCalledTimes(1);
    });

    it('a key-service fault on ONE row fails the WHOLE page with 503 (no partial names); an unparseable or tampered stored name ⇒ 500 field_worker.identity_unreadable', async () => {
      const { p, admin } = await pariwar();
      const ids3: string[] = [];
      for (let i = 0; i < 3; i += 1) ids3.push(await reg(h, admin.client, p, `Faulty Page-${i}`));
      const kms = h.deps.encryption.kms;
      let n = 0;
      const real = kms.decryptDek.bind(kms);
      const spy = vi.spyOn(kms, 'decryptDek').mockImplementation(async (...args: Parameters<typeof kms.decryptDek>) => {
        n += 1;
        if (n === 2) throw new Error('kms unavailable');
        return real(...args);
      });
      try {
        const r = await h.list(admin.client, p, { state: 'pending_kyc' });
        expect(r.statusCode, r.body).toBe(503);
        expect(errOf(r).code).toBe('field_worker.decrypt_unavailable');
        expect(r.body).not.toMatch(/Faulty/);
      } finally {
        spy.mockRestore();
      }
      const stored = (await h.td.pool.query<{ name_ciphertext: string }>('SELECT name_ciphertext FROM field_workers WHERE field_worker_id = $1', [ids3[1]])).rows[0]!.name_ciphertext;
      for (const bad of ['enc:v1:fixture-name', tampered(stored)]) {
        await setStoredName(ids3[1]!, bad);
        const r = await h.list(admin.client, p, { state: 'pending_kyc' });
        expect(r.statusCode, r.body).toBe(500);
        expect(errOf(r).code).toBe('field_worker.identity_unreadable');
        expect(r.body).not.toMatch(/Faulty/);
      }
    });
  });

  describe('the identity (AC7)', () => {
    it('the list item plus the FULL mobile and the approver; no-store; one identity_viewed line; a District Admin of the district passes, of another fails; unknown / other-Pariwar ⇒ the same 403', async () => {
      const { p, admin } = await pariwar();
      const id = await h.registered(admin.client, p, { name: 'Dinesh Identity-Worker', mobile: '+91 98765 47777', district: 'Patna' });
      expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
      const da = await h.actor(p, 'district_admin', 'district', 'Patna');
      const daOther = await h.actor(p, 'district_admin', 'district', 'Gaya');
      const r = await h.identity(da.client, p, id);
      expect(r.statusCode, r.body).toBe(200);
      expect(r.headers['cache-control']).toBe('no-store');
      expect(json(r)).toMatchObject({
        field_worker_id: id,
        name: 'Dinesh Identity-Worker',
        mobile: '+919876547777',
        district: 'Patna',
        current_state: 'active',
        approved_by_display: 'Meera Approver',
      });
      expect(await lines(p, 'field_worker.identity_viewed')).toEqual([{ actor_id: da.userId, actor_role: 'district_admin', resource_locator: `field_worker/${id}` }]);
      expect((await h.identity(daOther.client, p, id)).statusCode).toBe(403);
      const other = await pariwar();
      const foreignId = await reg(h, other.admin.client, other.p, 'Foreign Pariwar-Worker');
      const unknown = await h.identity(admin.client, p, randomUUID());
      const foreign = await h.identity(admin.client, p, foreignId);
      expect([unknown.statusCode, foreign.statusCode]).toEqual([403, 403]);
      expect(errOf(foreign).code).toBe(errOf(unknown).code);
    });

    it('a key-service fault ⇒ 503; a tampered stored name ⇒ 500 identity_unreadable — never a blank name', async () => {
      const { p, admin } = await pariwar();
      const id = await reg(h, admin.client, p, 'Faulty Identity-Worker');
      const kms = h.deps.encryption.kms;
      const spy = vi.spyOn(kms, 'decryptDek').mockRejectedValueOnce(new Error('kms unavailable'));
      try {
        const r = await h.identity(admin.client, p, id);
        expect(r.statusCode).toBe(503);
        expect(errOf(r).code).toBe('field_worker.decrypt_unavailable');
      } finally {
        spy.mockRestore();
      }
      const stored = (await h.td.pool.query<{ name_ciphertext: string }>('SELECT name_ciphertext FROM field_workers WHERE field_worker_id = $1', [id])).rows[0]!.name_ciphertext;
      await setStoredName(id, tampered(stored));
      const r = await h.identity(admin.client, p, id);
      expect(r.statusCode).toBe(500);
      expect(errOf(r).code).toBe('field_worker.identity_unreadable');
    });

    it('R2 — a MOVE committed between the gate’s loader and the read ⇒ 409 field_worker.authorization_stale, no line, nothing decrypted', async () => {
      const { p, admin } = await pariwar();
      const id = await reg(h, admin.client, p, 'Moving Identity-Worker');
      const da = await h.actor(p, 'district_admin', 'district', 'Patna');
      hooks.afterLoad = async () => {
        const c = await h.td.pool.connect();
        try {
          await c.query('BEGIN');
          await moveTestFieldWorker(c, p, ids.fieldWorkerId(id), 'Gaya');
          await c.query('COMMIT');
        } finally {
          c.release();
        }
      };
      const r = await h.identity(da.client, p, id);
      expect(hooks.afterLoad).toBeNull(); // the hook ran — the loader saw Patna, then the move committed
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('field_worker.authorization_stale');
      expect(r.body).not.toMatch(/Moving/);
      expect(await lines(p, 'field_worker.identity_viewed')).toEqual([]);
    });
  });

  describe('the districts (AC8)', () => {
    it('no tree: the listed districts, sorted, exact; no key needed (a helpline operator with a grant); no grant ⇒ 404; no session ⇒ 401', async () => {
      const { p, admin } = await pariwar(['Patna', 'Gaya', 'gaya']);
      const r = await h.districts(admin.client, p);
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toEqual({ districts: ['Gaya', 'Patna', 'gaya'], districts_truncated: false });
      const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
      expect((await h.districts(helpline.client, p)).statusCode).toBe(200);
      const stranger = await h.actor(h.freshPariwar(), 'pariwar_admin', 'pariwar', randomUUID());
      expect((await h.districts(stranger.client, p)).statusCode).toBe(404);
      expect((await h.districts(makeClient(h.app), p)).statusCode).toBe(401);
    });

    it('more than 200 listed ⇒ the first 200 and districts_truncated; a district beyond them still registers (exact typed value, `-447` item 5)', async () => {
      const names = Array.from({ length: 205 }, (_v, i) => `D${String(i).padStart(3, '0')}`);
      const { p, admin } = await pariwar(names);
      const r = json(await h.districts(admin.client, p)) as { districts: string[]; districts_truncated: boolean };
      expect(r.districts_truncated).toBe(true);
      expect(r.districts).toHaveLength(200);
      expect(r.districts).not.toContain('D204');
      const reg204 = await h.register(admin.client, p, { name: 'Beyond Two-Hundred', mobile: nextMobile(), district: 'D204' });
      expect(reg204.statusCode, reg204.body).toBe(201);
    });

    it('a tree in force: its district nodes only', async () => {
      const { p, admin } = await pariwar(['Listed Only']);
      await h.seedTree(p, [
        { dimension: 'state', value: 'Bihar' },
        { dimension: 'district', value: 'Patna', parent: 'Bihar' },
        { dimension: 'district', value: 'Gaya', parent: 'Bihar' },
      ]);
      expect(json(await h.districts(admin.client, p))).toEqual({ districts: ['Gaya', 'Patna'], districts_truncated: false });
    });
  });
});

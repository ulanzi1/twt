// Story 13.1f (AC15; AD13; AC5 (f); code review round 2, R2C-10) — the three appeal READS over HTTP: the default page size (20), the cap (25 - an
// over-cap `limit` is CLAMPED, not refused), the keyset walk, `Cache-Control: no-store`, the hostile cursor (400 `cursor_invalid`, never a 500, no
// audit line), and the two gate branches the first version left unproved. The caps are only provable with 26 or more rows, so each page read has its
// OWN dataset (the sibling suites seed a full page the same way) - a fresh Pariwar per test; live DB; own-committing.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase } from '../_setup.js';
import { createHarness, errOf, json, type Client, type Harness, type Json } from './_registration-harness.js';

const ROWS = 26; // one more than the cap
const DEFAULT_LIMIT = 20; // AC15 (a), (c)
const CAP = 25;

describe.skipIf(!hasDatabase)('Story 13.1f — the appeal reads: defaults, the cap, the cursor, no-store and the gate (AC15, AC5 (f))', { timeout: 300_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const istDay = async () => (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
  const auditCount = (p: string, action: string) =>
    q<{ n: number }>("SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1 AND split_part(action, '_rolled_back', 1) = $2", [p, action]).then((r) => r[0]!.n);
  const mobileOf = (i: number) => `+9198768${String(10000 + i).padStart(5, '0')}`;

  interface World {
    p: string;
    pa: { client: Client; userId: string };
    pa2: { client: Client; userId: string };
    da: { client: Client; userId: string };
    tp: { client: Client; userId: string };
  }
  async function world(): Promise<World> {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    return {
      p,
      pa: await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin'),
      pa2: await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Ravi Pariwar-Admin'),
      da: await h.actor(p, 'district_admin', 'district', 'Patna', 'Asha District-Admin'),
      tp: await h.actor(p, 'trustee_panel', 'pariwar', p, 'Dev Trustee'),
    };
  }
  /** A worker of Patna, registered, approved and ENDED by the District Admin (so the Pariwar Admin hears the appeal). Returns the id and the ending's version. */
  async function endedWorker(w: World, i: number): Promise<{ id: string; v: number }> {
    const id = await h.registered(w.pa.client, w.p, { name: `Page Worker-${String(i).padStart(2, '0')}`, mobile: mobileOf(i), district: 'Patna' });
    expect((await h.approve(w.pa.client, w.p, id)).statusCode).toBe(200);
    const r = await h.terminate(w.da.client, w.p, id, { reason_code: 'inactive', ended_on: await istDay() });
    expect(r.statusCode, r.body).toBe(200);
    return { id, v: Number(json(r)['state_event_version']) };
  }
  const lodgeBody = async (v: number): Promise<Json> => ({ expected_ending_version: v, received_on: await istDay(), received_via: 'phone' });
  const lodge = (w: World, id: string, v: number) => lodgeBody(v).then((b) => h.lodgeAppeal(w.pa.client, w.p, id, b));

  type Page = { items: Array<Record<string, unknown>>; next_cursor: string | null };
  const page = (r: { statusCode: number; body: string }): Page => {
    expect(r.statusCode, r.body).toBe(200);
    return json(r) as unknown as Page;
  };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');

  /**
   * The same four proofs for a read that pages by cursor: the default size, the clamp (an over-cap `limit` is accepted and answers the cap), an exact cap,
   * and a cursor walk that meets every row exactly once - each with `no-store`.
   */
  async function provePaging(read: (query?: Record<string, string>) => Promise<{ statusCode: number; body: string; headers: Record<string, unknown> }>, idOf: (item: Record<string, unknown>) => string) {
    const first = await read();
    expect(first.headers['cache-control'], 'the default page').toBe('no-store');
    const p1 = page(first);
    expect(p1.items, 'the DEFAULT page size').toHaveLength(DEFAULT_LIMIT);
    expect(p1.next_cursor, 'a full default page of a longer list carries a cursor').toBeTypeOf('string');
    const over = await read({ limit: '100' });
    expect(over.headers['cache-control'], 'the clamped page').toBe('no-store');
    expect(page(over).items, 'an OVER-cap limit is clamped to the cap, never refused and never honoured').toHaveLength(CAP);
    expect(page(await read({ limit: String(CAP) })).items, 'the cap itself').toHaveLength(CAP);
    expect(page(await read({ limit: '1' })).items, 'a limit of one').toHaveLength(1);
    // The walk: pages of 20 then 6, every id once, and the last page has no cursor.
    const seen: string[] = p1.items.map(idOf);
    let cursor = p1.next_cursor;
    let pages = 1;
    while (cursor !== null) {
      const next = page(await read({ cursor }));
      seen.push(...next.items.map(idOf));
      cursor = next.next_cursor;
      pages += 1;
      expect(pages, 'the walk does not end').toBeLessThan(10);
    }
    expect(pages).toBe(2);
    expect(seen).toHaveLength(ROWS);
    expect(new Set(seen).size, 'a row was met twice or skipped').toBe(ROWS);
  }

  it('the ELIGIBLE list: default 20, an over-cap limit clamped to 25, the cursor walk meets all 26 once, no-store', async () => {
    const w = await world();
    for (let i = 0; i < ROWS; i += 1) await endedWorker(w, i);
    await provePaging((query) => h.listEligible(w.pa.client, w.p, query), (i) => String(i['field_worker_id']));
  });

  it('the appeal LIST: default 20, an over-cap limit clamped to 25, the cursor walk meets all 26 once, no-store', async () => {
    const w = await world();
    for (let i = 0; i < ROWS; i += 1) {
      const { id, v } = await endedWorker(w, i);
      expect((await lodge(w, id, v)).statusCode).toBe(201);
    }
    await provePaging((query) => h.listAppeals(w.pa.client, w.p, query), (i) => String(i['appeal_id']));
  });

  it('the PER-WORKER read: default 20 and a clamp of 25 over a worker with 26 appeals (lodged and withdrawn), no-store', async () => {
    const w = await world();
    const { id, v } = await endedWorker(w, 0);
    for (let i = 0; i < ROWS; i += 1) {
      const lodged = await lodge(w, id, v);
      expect(lodged.statusCode, `lodge ${String(i)}: ${lodged.body}`).toBe(201);
      const withdrawn = await h.withdrawAppeal(w.pa2.client, w.p, String(json(lodged)['appeal_id']), { decided_on: await istDay() });
      expect(withdrawn.statusCode, `withdraw ${String(i)}: ${withdrawn.body}`).toBe(200);
    }
    const dflt = await h.appealsOf(w.pa.client, w.p, id);
    expect(dflt.headers['cache-control']).toBe('no-store');
    expect(page(dflt).items, 'the DEFAULT size').toHaveLength(DEFAULT_LIMIT);
    const over = await h.appealsOf(w.pa.client, w.p, id, { limit: '100' });
    expect(over.headers['cache-control']).toBe('no-store');
    expect(page(over).items, 'an OVER-cap limit is clamped to the cap').toHaveLength(CAP);
    expect(page(await h.appealsOf(w.pa.client, w.p, id, { limit: '3' })).items).toHaveLength(3);
    expect(new Set(page(over).items.map((i) => String(i['appeal_id']))).size, 'a duplicated appeal on the page').toBe(CAP);
  });

  it('a hostile cursor on the list and the eligible list → 400 field_worker.cursor_invalid - never a 500, never a page, never an audit line; CONTROL: the real cursor walks', async () => {
    const w = await world();
    const lodged: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const { id, v } = await endedWorker(w, i);
      if (i < 2) {
        expect((await lodge(w, id, v)).statusCode).toBe(201); // two appeals for the list...
        lodged.push(id);
      } // ...and two ended workers WITHOUT one for the eligible list
    }
    const listCursor = page(await h.listAppeals(w.pa.client, w.p, { limit: '1' })).next_cursor!;
    const eligibleCursor = page(await h.listEligible(w.pa.client, w.p, { limit: '1' })).next_cursor!;
    expect(listCursor).toBeTypeOf('string');
    expect(eligibleCursor).toBeTypeOf('string');
    const uuid = randomUUID();
    const forged: Array<[string, string]> = [
      ['not base64url', 'not-a-cursor!'],
      ['a truncated real cursor', eligibleCursor.slice(0, -2)],
      ['the wrong keys', b64({ c: 'x', m: 'y' })],
      ['a canonical encoding of an IMPOSSIBLE date (the 30th of February)', b64({ c: '2026-02-30 00:00:00+00', w: uuid })],
      ['a canonical encoding of month 13', b64({ c: '2026-13-01 00:00:00+00', w: uuid })],
      ['an upper-case id', b64({ c: '2026-11-01 00:00:00+00', w: uuid.toUpperCase() })],
    ];
    const reads: Array<[string, (query: Record<string, string>) => ReturnType<Harness['listAppeals']>, string]> = [
      ['list', (query) => h.listAppeals(w.pa.client, w.p, query), 'field_worker.ending_appeal_list_viewed'],
      ['eligible', (query) => h.listEligible(w.pa.client, w.p, query), 'field_worker.ending_appeal_candidates_viewed'],
    ];
    for (const [name, read, action] of reads) {
      const lines = await auditCount(w.p, action);
      for (const [label, cursor] of forged) {
        const r = await read({ cursor });
        expect(r.statusCode, `${name} / ${label}: ${r.body}`).toBe(400);
        expect(errOf(r).code, `${name} / ${label}`).toBe('field_worker.cursor_invalid');
      }
      expect(await auditCount(w.p, action), `${name}: a refused cursor wrote an audit line`).toBe(lines);
    }
    // The eligible list's OWN extra check: its cursor position is an `ended_on` DATE, so a real timestamp with a time of day is refused there - and
    // the SAME cursor is a legitimate position for the appeal list (a `created_at`), which is the control that the refusal is the eligible list's.
    const timeOfDay = b64({ c: '2026-11-05 10:11:12.123456+00', w: uuid });
    const e = await h.listEligible(w.pa.client, w.p, { cursor: timeOfDay });
    expect(e.statusCode, e.body).toBe(400);
    expect(errOf(e).code).toBe('field_worker.cursor_invalid');
    expect((await h.listAppeals(w.pa.client, w.p, { cursor: timeOfDay })).statusCode).toBe(200);
    // CONTROL - the REAL cursors walk to the next page.
    expect(page(await h.listAppeals(w.pa.client, w.p, { cursor: listCursor })).items).toHaveLength(1);
    expect(page(await h.listEligible(w.pa.client, w.p, { cursor: eligibleCursor })).items).toHaveLength(1);
  });

  it('AC15 (b): the eligible list WITHOUT `district` is a 403 for a District Admin (their key sits on a district) - with their district, a 200; a Pariwar Admin needs neither', async () => {
    const w = await world();
    const { id } = await endedWorker(w, 0);
    const refused = await h.listEligible(w.da.client, w.p);
    expect(refused.statusCode, refused.body).toBe(403);
    expect(errOf(refused).code).toBe('authz.forbidden');
    expect(refused.body).not.toContain(id);
    const own = await h.listEligible(w.da.client, w.p, { district: 'Patna' }); // CONTROL
    expect(own.statusCode, own.body).toBe(200);
    expect(page(await h.listEligible(w.pa.client, w.p)).items.map((i) => i['field_worker_id'])).toEqual([id]);
  });

  it('AC5 (f): a lodge on a worker who is NOT terminated — a trustee AND a Pariwar Admin reach the command and get 409 illegal_transition (the dispatcher’s no-hearer branch), a District Admin 403; no line', async () => {
    const w = await world();
    const id = await h.registered(w.pa.client, w.p, { name: 'Live Worker-00', mobile: mobileOf(0), district: 'Patna' });
    expect((await h.approve(w.pa.client, w.p, id)).statusCode).toBe(200); // ACTIVE: there is no ending, so there is no hearer to match
    const body = await lodgeBody(2);
    for (const [label, client] of [['a trustee', w.tp.client], ['a Pariwar Admin', w.pa.client]] as const) {
      const r = await h.lodgeAppeal(client, w.p, id, body);
      expect(r.statusCode, `${label}: ${r.body}`).toBe(409);
      expect(errOf(r).code, label).toBe('field_worker.illegal_transition');
    }
    const da = await h.lodgeAppeal(w.da.client, w.p, id, body); // holds neither hear key
    expect(da.statusCode, da.body).toBe(403);
    expect(await auditCount(w.p, 'field_worker_ending_appeal.lodged'), 'a lodge on a live worker wrote a line').toBe(0);
  });
});

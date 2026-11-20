// Story 13.1f — the undo, the appeal record, the shown number and the link, through HTTP (AC1–AC3, AC5–AC10, AC15, AC17's actor legs;
// decision `2026-11-16-464`; the Panel's `2026-11-17-465`, Q6 B). Live DB, own-committing (each request commits); every refusal asserts
// the status AND the code, and every "no audit line" leg is counted BEFORE the request with a CONTROL that the same path writes one.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getCollectedRoutes } from '../../../src/route-registry.js';
import { hasDatabase, makeClient } from '../_setup.js';
import { createHarness, errOf, json, type Client, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Undo Distinctive-Surname';
const randomMobile = () => `+9198766${String(10000 + Math.floor(Math.random() * 89999)).padStart(5, '0')}`;

describe.skipIf(!hasDatabase)('Story 13.1f — the undo, the appeal record, the shown number and the link (HTTP)', { timeout: 120_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const istDay = async (offset = 0) => (await q<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + $1::int)::text AS d", [offset]))[0]!.d;
  const version = async (id: string) => Number((await q<{ v: string }>('SELECT state_event_version::text AS v FROM field_workers WHERE field_worker_id = $1', [id]))[0]!.v);
  const row = (id: string) => q<Record<string, unknown>>('SELECT current_state, state_reason_code, ended_on::text AS ended_on, previous_field_worker_id FROM field_workers WHERE field_worker_id = $1', [id]).then((r) => r[0]!);
  const lastEvent = (id: string) =>
    q<{ event_type: string; payload: Json }>('SELECT event_type, payload FROM events_log WHERE stream_id = $1 ORDER BY event_version DESC LIMIT 1', [id]).then((r) => r[0]!);
  const auditCount = (p: string, action: string) =>
    q<{ n: number }>("SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1 AND split_part(action, '_rolled_back', 1) = $2", [p, action]).then((r) => r[0]!.n);

  interface World {
    p: string;
    pa: { client: Client; userId: string };
    pa2: { client: Client; userId: string };
    da: { client: Client; userId: string };
    daGaya: { client: Client; userId: string };
    tp: { client: Client; userId: string };
    tp2: { client: Client; userId: string };
    sa: { client: Client; userId: string };
  }
  async function world(): Promise<World> {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    return {
      p,
      pa: await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin'),
      pa2: await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Ravi Pariwar-Admin'),
      da: await h.actor(p, 'district_admin', 'district', 'Patna', 'Asha District-Admin'),
      daGaya: await h.actor(p, 'district_admin', 'district', 'Gaya', 'Gita District-Admin'),
      tp: await h.actor(p, 'trustee_panel', 'pariwar', p, 'Dev Trustee'),
      tp2: await h.actor(p, 'trustee_panel', 'pariwar', p, 'Kiran Trustee'),
      sa: await h.actor(p, 'super_admin', 'global', null, 'Sam Super-Admin'),
    };
  }
  async function activeWorker(w: World, mobile = randomMobile(), district = 'Patna'): Promise<string> {
    const id = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district });
    expect((await h.approve(w.pa.client, w.p, id)).statusCode).toBe(200);
    return id;
  }
  async function end(w: World, id: string, by: Client, reason = 'inactive'): Promise<number> {
    const r = await h.terminate(by, w.p, id, { reason_code: reason, ended_on: await istDay() });
    expect(r.statusCode, r.body).toBe(200);
    expect(json(r)['state_event_version']).toBe(await version(id)); // G24 — the act's version
    return Number(json(r)['state_event_version']);
  }
  const lodgeBody = async (v: number): Promise<Json> => ({ expected_ending_version: v, received_on: await istDay(), received_via: 'phone' });

  describe('AC1 / AC3 / AC8 — the undo', () => {
    it('a Pariwar Admin undoes a mistaken ending: 200 with the restored state, the undo’s version, ended_on null; ONE `field_worker.ending_undone` line; a District Admin → 403; not terminated → 409, no line', async () => {
      const w = await world();
      const id = await activeWorker(w);
      expect(errOf(await h.undoEnding(w.pa.client, w.p, id, 3)).code).toBe('field_worker.illegal_transition');
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(0);
      const v = await end(w, id, w.da.client);
      const forbidden = await h.undoEnding(w.da.client, w.p, id, v);
      expect(forbidden.statusCode).toBe(403);
      expect(errOf(forbidden).code).toBe('authz.forbidden');
      const r = await h.undoEnding(w.pa.client, w.p, id, v);
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toEqual({ field_worker_id: id, district: 'Patna', current_state: 'active', state_reason_code: null, ended_on: null, state_event_version: v + 1 });
      expect(r.body).not.toContain(NAME);
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(1);
      expect((await lastEvent(id)).payload).toMatchObject({ cause: 'mistake', undone_ending_version: v, actor: 'operator' });
      // AC1 (c) — the by-hand code read works again.
      expect((await h.code(w.pa.client, w.p, id)).statusCode).toBe(200);
    });

    // Review R3-19 (checklist family 3) — `undo-ending` was the one 13.1f write with no per-route denial set over HTTP: a swapped key or a dropped
    // hook on THIS route would pass every other route's tests. The `lifecycle.spec.ts` "Denial and holders, per route" set, for the undo.
    it('R3-19 denial: no session ⇒ 401; another Pariwar’s admin ⇒ 404; a role without the key ⇒ 403; a District Admin (of this district and of another) ⇒ 403; another Pariwar’s worker id ⇒ the unknown-worker 403 — each with NO event and NO line; CONTROL: the Pariwar Admin ⇒ 200', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client);
      const events = async () => Number((await q<{ n: string }>('SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1', [id]))[0]!.n);
      const denied = async (c: Client, status: number, target = id, p = w.p): Promise<Json> => {
        const before = { events: await events(), lines: await auditCount(w.p, 'field_worker.ending_undone') };
        const r = await h.undoEnding(c, p, target, v);
        expect(r.statusCode, r.body).toBe(status);
        expect(await events()).toBe(before.events);
        expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(before.lines);
        return errOf(r);
      };
      await denied(makeClient(h.app), 401);
      await denied((await h.actor(h.freshPariwar(), 'pariwar_admin', 'pariwar', randomUUID())).client, 404);
      await denied((await h.actor(w.p, 'helpline_operator', 'pariwar', w.p)).client, 403);
      await denied(w.da.client, 403);
      await denied(w.daGaya.client, 403);
      // Another Pariwar's REAL worker under THIS Pariwar's path: the same 403 as an id nobody holds, and that worker untouched.
      const other = await world();
      const foreignId = await activeWorker(other);
      const foreignV = await end(other, foreignId, other.pa.client);
      const foreign = await h.undoEnding(w.pa.client, w.p, foreignId, foreignV);
      const unknown = await h.undoEnding(w.pa.client, w.p, randomUUID(), v);
      expect(foreign.statusCode, foreign.body).toBe(403);
      expect(unknown.statusCode, unknown.body).toBe(403);
      expect(errOf(foreign).code).toBe(errOf(unknown).code);
      expect((await row(foreignId)).current_state).toBe('terminated');
      expect(await auditCount(other.p, 'field_worker.ending_undone')).toBe(0);
      // CONTROL - the same undo by the right officer is not refused for being in the wrong place.
      expect((await h.undoEnding(w.pa.client, w.p, id, v)).statusCode).toBe(200);
    });

    it('AC3 — undone and ended again: the old version → 409 ending_changed, no line; the log shows the ending AND the undo', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v1 = await end(w, id, w.da.client);
      expect((await h.undoEnding(w.pa.client, w.p, id, v1)).statusCode).toBe(200);
      const v2 = await end(w, id, w.da.client);
      const before = await auditCount(w.p, 'field_worker.ending_undone');
      const stale = await h.undoEnding(w.pa2.client, w.p, id, v1);
      expect(stale.statusCode).toBe(409);
      expect(errOf(stale).code).toBe('field_worker.ending_changed');
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(before);
      const log = json(await h.log(w.pa.client, w.p, id)) as { items: Array<{ event_type: string; cause: string | null; to_state: string | null }> };
      expect(log.items.map((e) => e.event_type)).toContain('field_worker.ending_undone');
      expect(log.items.find((e) => e.event_type === 'field_worker.ending_undone')).toMatchObject({ cause: 'mistake', to_state: 'active' });
      expect((await h.undoEnding(w.pa.client, w.p, id, v2)).statusCode).toBe(200);
    });

    it('AC2 — the number registered again: 409 number_registered_again on the PRE-READ, no line; CONTROL: that registration ended, the undo succeeds', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      const v = await end(w, old, w.pa.client, 'registered_in_error');
      const newer = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true });
      const blocked = await h.undoEnding(w.pa.client, w.p, old, v);
      expect(blocked.statusCode).toBe(409);
      expect(errOf(blocked).code).toBe('field_worker.number_registered_again');
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(0);
      await end(w, newer, w.pa.client, 'registered_in_error');
      expect((await h.undoEnding(w.pa.client, w.p, old, v)).statusCode).toBe(200);
    });

    it('⭐ `-465` Q6 B — after the PANEL heard and refused the appeal, the slip undo → 409 appeal_refused_by_panel on the PRE-READ, no line; a super admin too', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client); // a Pariwar Admin's ending — heard by the Panel
      const lodged = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v));
      expect(lodged.statusCode, lodged.body).toBe(201);
      const refused = await h.decideAppeal(w.tp2.client, w.p, String(json(lodged)['appeal_id']), { outcome: 'refused', decided_on: await istDay() });
      expect(refused.statusCode, refused.body).toBe(200);
      for (const c of [w.pa2.client, w.sa.client]) {
        const r = await h.undoEnding(c, w.p, id, v);
        expect(r.statusCode).toBe(409);
        expect(errOf(r).code).toBe('field_worker.appeal_refused_by_panel');
      }
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(0);
      expect((await row(id)).current_state).toBe('terminated');
    });

    it('AC8 — a slip undone while an appeal is open closes it as superseded; `-465` CONTROL: a refusal heard by the Pariwar Admin does not bar the slip', async () => {
      const w = await world();
      const a = await activeWorker(w);
      const va = await end(w, a, w.pa.client);
      const open = json(await h.lodgeAppeal(w.tp.client, w.p, a, await lodgeBody(va)));
      expect((await h.undoEnding(w.pa2.client, w.p, a, va)).statusCode).toBe(200);
      expect((json(await h.appealsOf(w.pa.client, w.p, a)) as { items: Json[] }).items[0]).toMatchObject({ appeal_id: open['appeal_id'], state: 'superseded' });
      const b = await activeWorker(w);
      const vb = await end(w, b, w.da.client); // a District Admin's ending — heard by the Pariwar Admin
      const lodged = json(await h.lodgeAppeal(w.pa.client, w.p, b, await lodgeBody(vb)));
      expect((await h.decideAppeal(w.pa2.client, w.p, String(lodged['appeal_id']), { outcome: 'refused', decided_on: await istDay() })).statusCode).toBe(200);
      expect((await h.undoEnding(w.pa.client, w.p, b, vb)).statusCode).toBe(200);
    });
  });

  describe('TR8 — idempotency: a replay returns the first 200; the key is namespaced by the worker id', () => {
    it('the same key twice on one undo → the same 200, ONE line; the same key on ANOTHER worker → that worker’s own act, not a replay', async () => {
      const w = await world();
      const a = await activeWorker(w);
      const b = await activeWorker(w);
      const va = await end(w, a, w.pa.client);
      const vb = await end(w, b, w.pa.client);
      const key = randomUUID();
      const first = await h.undoEnding(w.pa.client, w.p, a, va, key);
      const replay = await h.undoEnding(w.pa.client, w.p, a, va, key);
      expect(first.statusCode, first.body).toBe(200);
      expect(replay.statusCode).toBe(200);
      expect(json(replay)).toEqual(json(first));
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(1);
      const other = await h.undoEnding(w.pa.client, w.p, b, vb, key);
      expect(other.statusCode, other.body).toBe(200);
      expect(json(other)['field_worker_id']).toBe(b);
      expect(await auditCount(w.p, 'field_worker.ending_undone')).toBe(2);
      // An appeal lodge: the same, with the worker id in its namespace.
      const c = await activeWorker(w);
      const vc = await end(w, c, w.pa.client);
      const lk = randomUUID();
      const l1 = await h.lodgeAppeal(w.tp.client, w.p, c, await lodgeBody(vc), lk);
      const l2 = await h.lodgeAppeal(w.tp.client, w.p, c, await lodgeBody(vc), lk);
      expect(l1.statusCode, l1.body).toBe(201);
      expect(json(l2)['appeal_id']).toBe(json(l1)['appeal_id']);
    });
  });

  describe('AC7 — the hearer is fixed at the ending', () => {
    it('a District Admin → pariwar_admin; a Pariwar Admin, a dual-role officer (snapshot role district_admin) and a super admin → trustee_panel', async () => {
      const w = await world();
      const dual = await h.actor(w.p, 'district_admin', 'district', 'Patna', 'Dual Officer');
      await h.addGrant(dual.userId, w.p, 'pariwar_admin', 'pariwar', w.p);
      for (const [c, heard, role] of [
        [w.da.client, 'pariwar_admin', 'district_admin'],
        [w.pa.client, 'trustee_panel', 'pariwar_admin'],
        [dual.client, 'trustee_panel', 'district_admin'],
        [w.sa.client, 'trustee_panel', 'super_admin'],
      ] as const) {
        const id = await activeWorker(w);
        await end(w, id, c);
        const ev = await lastEvent(id);
        expect(ev.payload['appeal_heard_by'], role).toBe(heard);
        expect((ev.payload['authorization'] as { role: string }).role).toBe(role);
      }
    });
  });

  describe('AC5 / AC6 — lodging and deciding', () => {
    it('a Panel-heard ending: a Pariwar Admin → 403; a super admin → 409 appeal_wrong_hearer (pre-read, no line); a trustee → 201 under `_as_panel`, actor trustee, no name', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client);
      expect((await h.lodgeAppeal(w.pa2.client, w.p, id, await lodgeBody(v))).statusCode).toBe(403);
      const sa = await h.lodgeAppeal(w.sa.client, w.p, id, await lodgeBody(v));
      expect(sa.statusCode).toBe(409);
      expect(errOf(sa).code).toBe('field_worker.appeal_wrong_hearer');
      expect(await auditCount(w.p, 'field_worker_ending_appeal.lodged')).toBe(0);
      const ok = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v));
      expect(ok.statusCode, ok.body).toBe(201);
      expect(json(ok)).toMatchObject({ field_worker_id: id, ending_event_version: v, state: 'open', heard_by: 'trustee_panel', decided_on: null, lodged_by: { user_id: w.tp.userId, display_name: 'Dev Trustee' } });
      expect(ok.body).not.toContain(NAME);
      expect(await auditCount(w.p, 'field_worker_ending_appeal.lodged')).toBe(1);
      const ev = await lastEvent(String(json(ok)['appeal_id']));
      expect(ev.payload).toMatchObject({ actor: 'trustee' });
      const again = await h.lodgeAppeal(w.tp2.client, w.p, id, await lodgeBody(v));
      expect(errOf(again).code).toBe('field_worker.appeal_open');
    });

    it('a District-Admin-heard ending: a trustee → 403; a Pariwar Admin lodges; ALLOWED → 200 { appeal, worker } restored, ONE `.allowed` line; a later lodge → 409 illegal_transition', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.da.client);
      expect((await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v))).statusCode).toBe(403);
      const lodged = await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v));
      expect(lodged.statusCode, lodged.body).toBe(201);
      const appealId = String(json(lodged)['appeal_id']);
      expect((await h.decideAppeal(w.tp.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() })).statusCode).toBe(403);
      const allowed = await h.decideAppeal(w.pa2.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() });
      expect(allowed.statusCode, allowed.body).toBe(200);
      expect(json(allowed)).toMatchObject({ appeal: { appeal_id: appealId, state: 'allowed' }, worker: { field_worker_id: id, current_state: 'active', ended_on: null } });
      expect(await auditCount(w.p, 'field_worker_ending_appeal.allowed')).toBe(1);
      expect(errOf(await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v + 1))).code).toBe('field_worker.illegal_transition');
    });

    it('a super admin may hear a Pariwar-Admin-heard appeal (`-465` Q4 (c) A); the ender cannot decide or withdraw (409); withdrawn → a new one may be lodged', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.da.client);
      const first = String(json(await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      const withdrawn = await h.withdrawAppeal(w.sa.client, w.p, first, { decided_on: await istDay() });
      expect(withdrawn.statusCode, withdrawn.body).toBe(200);
      expect(json(withdrawn)['state']).toBe('withdrawn');
      const second = await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v));
      expect(second.statusCode).toBe(201);
      // The ender here is the District Admin; made a Pariwar Admin later, they still never decide (AD9 (3)).
      await h.addGrant(w.da.userId, w.p, 'pariwar_admin', 'pariwar', w.p);
      const byEnder = await h.decideAppeal(w.da.client, w.p, String(json(second)['appeal_id']), { outcome: 'refused', decided_on: await istDay() });
      expect(byEnder.statusCode).toBe(409);
      expect(errOf(byEnder).code).toBe('field_worker.appeal_decider_is_ender');
    });

    it('a missing worker / appeal and another Pariwar’s REAL ids → 403, never 404; a bad date → 422', async () => {
      const w = await world();
      const other = await world();
      const id = await activeWorker(other);
      const v = await end(other, id, other.pa.client);
      const foreign = String(json(await h.lodgeAppeal(other.tp.client, other.p, id, await lodgeBody(v)))['appeal_id']);
      expect((await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v))).statusCode).toBe(403);
      expect((await h.lodgeAppeal(w.tp.client, w.p, randomUUID(), await lodgeBody(v))).statusCode).toBe(403);
      for (const appealId of [foreign, randomUUID()]) {
        expect((await h.decideAppeal(w.tp.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay() })).statusCode).toBe(403);
        expect((await h.withdrawAppeal(w.tp.client, w.p, appealId, { decided_on: await istDay() })).statusCode).toBe(403);
      }
      const late = await h.lodgeAppeal(other.tp2.client, other.p, id, { ...(await lodgeBody(v)), received_on: await istDay(1) });
      expect(late.statusCode).toBe(409); // one is already open — the open check answers before the dates
      const bad = await h.decideAppeal(other.tp2.client, other.p, foreign, { outcome: 'refused', decided_on: await istDay(1) });
      expect(bad.statusCode).toBe(422);
      expect(errOf(bad).code).toBe('field_worker.appeal_date_invalid');
    });
  });

  // Code review round 2, R2B-16: the AC5 / AC6 legs the first version left out - each is a gate or a pre-read the HANDLER owns, which the domain
  // commands do not make redundant (they would still refuse, but with the intent line and its `_rolled_back` twin instead of NO line).
  describe('R2B-16 — AC5 (g), AC6 (h), AC6 (b), AC6 (d): the gates and pre-reads of lodge, decide and withdraw', () => {
    it('AC5 (g): a District Admin lodges nothing - 403 on a Panel-heard AND on a Pariwar-Admin-heard ending; no line; CONTROL: the hearer lodges', async () => {
      const w = await world();
      const a = await activeWorker(w);
      const b = await activeWorker(w);
      const va = await end(w, a, w.pa.client); // heard by the Panel
      const vb = await end(w, b, w.da.client); // heard by the Pariwar Admin
      for (const [id, v] of [[a, va], [b, vb]] as const) {
        const r = await h.lodgeAppeal(w.da.client, w.p, id, await lodgeBody(v));
        expect(r.statusCode, r.body).toBe(403);
        expect(errOf(r).code).toBe('authz.forbidden');
      }
      expect(await auditCount(w.p, 'field_worker_ending_appeal.lodged')).toBe(0);
      expect((await h.lodgeAppeal(w.tp.client, w.p, a, await lodgeBody(va))).statusCode).toBe(201); // CONTROL
      expect((await h.lodgeAppeal(w.pa.client, w.p, b, await lodgeBody(vb))).statusCode).toBe(201);
    });

    it('AC6 (h): on a PANEL-heard appeal a Pariwar Admin cannot decide or withdraw (403) and a super admin is refused 409 appeal_wrong_hearer - on the PRE-READ, no audit line; CONTROL: the trustee decides', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client);
      const appealId = String(json(await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      const decided = async () => (await auditCount(w.p, 'field_worker_ending_appeal.refused')) + (await auditCount(w.p, 'field_worker_ending_appeal.withdrawn')) + (await auditCount(w.p, 'field_worker_ending_appeal.allowed'));
      const before = await decided();
      for (const outcome of ['refused', 'allowed'] as const) {
        expect((await h.decideAppeal(w.pa2.client, w.p, appealId, { outcome, decided_on: await istDay() })).statusCode, `PA ${outcome}`).toBe(403);
        const sa = await h.decideAppeal(w.sa.client, w.p, appealId, { outcome, decided_on: await istDay() });
        expect(sa.statusCode, `SA ${outcome}`).toBe(409);
        expect(errOf(sa).code).toBe('field_worker.appeal_wrong_hearer');
      }
      expect((await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: await istDay() })).statusCode).toBe(403);
      const saW = await h.withdrawAppeal(w.sa.client, w.p, appealId, { decided_on: await istDay() });
      expect(saW.statusCode).toBe(409);
      expect(errOf(saW).code).toBe('field_worker.appeal_wrong_hearer');
      expect(await decided()).toBe(before); // NO line, intent or twin, from any of the six refusals
      expect((await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay() })).statusCode).toBe(200); // CONTROL
      expect(await decided()).toBe(before + 1);
    });

    it('AC6 (b): an ALLOWED decision while the number is live again → 409 number_registered_again on the PRE-READ, no line, the appeal stays open; CONTROL: that registration ended, the same decision succeeds', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      const v = await end(w, old, w.pa.client, 'registered_in_error');
      const appealId = String(json(await h.lodgeAppeal(w.tp.client, w.p, old, await lodgeBody(v)))['appeal_id']);
      const newer = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true });
      const blocked = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() });
      expect(blocked.statusCode, blocked.body).toBe(409);
      expect(errOf(blocked).code).toBe('field_worker.number_registered_again');
      expect(await auditCount(w.p, 'field_worker_ending_appeal.allowed')).toBe(0);
      expect((await row(old)).current_state).toBe('terminated');
      // A REFUSAL is not the number's business: it goes through while the number is live (the check is the allowed decision's alone).
      const other = await activeWorker(w);
      const vo = await end(w, other, w.pa.client);
      const second = String(json(await h.lodgeAppeal(w.tp.client, w.p, other, await lodgeBody(vo)))['appeal_id']);
      expect((await h.decideAppeal(w.tp2.client, w.p, second, { outcome: 'refused', decided_on: await istDay() })).statusCode).toBe(200);
      await end(w, newer, w.pa.client, 'registered_in_error');
      const ok = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() });
      expect(ok.statusCode, ok.body).toBe(200);
      expect((await row(old)).current_state).toBe('active'); // restored as they were: the worker was approved (active) before the ending
      expect(await auditCount(w.p, 'field_worker_ending_appeal.allowed')).toBe(1);
    });

    it('AC6 (d): the ender never WITHDRAWS either (409 appeal_decider_is_ender) - the same rule as decide; CONTROL: another officer withdraws it', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.da.client); // a District Admin's ending - the Pariwar Admin hears it
      const appealId = String(json(await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      await h.addGrant(w.da.userId, w.p, 'pariwar_admin', 'pariwar', w.p); // the ender may now hear it - and still never decides or withdraws
      const byEnder = await h.withdrawAppeal(w.da.client, w.p, appealId, { decided_on: await istDay() });
      expect(byEnder.statusCode, byEnder.body).toBe(409);
      expect(errOf(byEnder).code).toBe('field_worker.appeal_decider_is_ender');
      const other = await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: await istDay() });
      expect(other.statusCode, other.body).toBe(200);
      expect(json(other)['state']).toBe('withdrawn');
    });
  });

  // Code review round 2, R2C-3: the PURE date shape is judged on the handlers' pre-read (no intent line, no `_rolled_back` twin - I7, the CR12 precedent on
  // terminate's `ended_on`); the IST BOUNDS stay the command's, so a future date still costs the pair. The two together prove there is ONE judge of the bounds.
  describe('R2C-3 — a malformed date is refused on the pre-read (no line); a future date still reaches the command (the pair)', () => {
    const MALFORMED = ['2026-02-30', 'abc', '2026-13-01'] as const;
    const appealState = (id: string) => q<{ state: string }>('SELECT state FROM field_worker_ending_appeals WHERE appeal_id = $1', [id]).then((r) => r[0]!.state);

    it('lodge: a malformed received_on → 422 appeal_date_invalid, NO line, NO appeal row; a FUTURE one → 422 WITH the pair; CONTROL: a real date lodges', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client); // Panel-heard
      const lodged = () => auditCount(w.p, 'field_worker_ending_appeal.lodged');
      for (const bad of MALFORMED) {
        const r = await h.lodgeAppeal(w.tp.client, w.p, id, { ...(await lodgeBody(v)), received_on: bad });
        expect(r.statusCode, `${bad}: ${r.body}`).toBe(422);
        expect(errOf(r).code, bad).toBe('field_worker.appeal_date_invalid');
      }
      expect(await lodged(), 'a malformed date wrote an audit line').toBe(0);
      expect(await q('SELECT 1 FROM field_worker_ending_appeals WHERE field_worker_id = $1', [id])).toHaveLength(0);
      const future = await h.lodgeAppeal(w.tp.client, w.p, id, { ...(await lodgeBody(v)), received_on: await istDay(1) });
      expect(future.statusCode, future.body).toBe(422);
      expect(errOf(future).code).toBe('field_worker.appeal_date_invalid');
      expect(await lodged(), 'a FUTURE date is the command\'s bound: the intent line and its twin').toBe(2);
      const ok = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v)); // CONTROL
      expect(ok.statusCode, ok.body).toBe(201);
      expect(await lodged()).toBe(3);
    });

    it('decide: a malformed decided_on (refused AND allowed) → 422, NO line, the appeal stays open; a FUTURE one → 422 WITH the pair; CONTROL: a real date decides', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client);
      const appealId = String(json(await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      const refused = () => auditCount(w.p, 'field_worker_ending_appeal.refused');
      const allowed = () => auditCount(w.p, 'field_worker_ending_appeal.allowed');
      for (const outcome of ['refused', 'allowed'] as const) {
        for (const bad of MALFORMED) {
          const r = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome, decided_on: bad });
          expect(r.statusCode, `${outcome} ${bad}: ${r.body}`).toBe(422);
          expect(errOf(r).code, `${outcome} ${bad}`).toBe('field_worker.appeal_date_invalid');
        }
      }
      expect([await refused(), await allowed()], 'a malformed date wrote an audit line').toEqual([0, 0]);
      expect(await appealState(appealId)).toBe('open');
      const future = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay(1) });
      expect(future.statusCode, future.body).toBe(422);
      expect(await refused(), 'a FUTURE date is the command\'s bound: the intent line and its twin').toBe(2);
      expect(await appealState(appealId)).toBe('open');
      const ok = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay() }); // CONTROL
      expect(ok.statusCode, ok.body).toBe(200);
      expect(await appealState(appealId)).toBe('refused');
    });

    // Review R3-21 — the order: the pure shape BEFORE the number check. With the number live again, an allowed decision's malformed date
    // answered 409 number_registered_again (the officer fixed that, then met the 422).
    it('R3-21 decide: an ALLOWED decision with a malformed date while the number is live again → 422 appeal_date_invalid, ⛔ 409; CONTROL: a real date → 409 number_registered_again', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      const v = await end(w, old, w.pa.client, 'registered_in_error');
      const appealId = String(json(await h.lodgeAppeal(w.tp.client, w.p, old, await lodgeBody(v)))['appeal_id']);
      await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true });
      const bad = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'allowed', decided_on: '2026-02-30' });
      expect(bad.statusCode, bad.body).toBe(422);
      expect(errOf(bad).code).toBe('field_worker.appeal_date_invalid');
      const real = await h.decideAppeal(w.tp2.client, w.p, appealId, { outcome: 'allowed', decided_on: await istDay() }); // CONTROL
      expect(real.statusCode, real.body).toBe(409);
      expect(errOf(real).code).toBe('field_worker.number_registered_again');
      expect(await auditCount(w.p, 'field_worker_ending_appeal.allowed')).toBe(0);
    });

    it('withdraw: a malformed decided_on → 422, NO line, the appeal stays open; a FUTURE one → 422 WITH the pair; CONTROL: a real date withdraws', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.da.client); // Pariwar-Admin-heard
      const appealId = String(json(await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      const withdrawn = () => auditCount(w.p, 'field_worker_ending_appeal.withdrawn');
      for (const bad of MALFORMED) {
        const r = await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: bad });
        expect(r.statusCode, `${bad}: ${r.body}`).toBe(422);
        expect(errOf(r).code, bad).toBe('field_worker.appeal_date_invalid');
      }
      expect(await withdrawn(), 'a malformed date wrote an audit line').toBe(0);
      expect(await appealState(appealId)).toBe('open');
      const future = await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: await istDay(1) });
      expect(future.statusCode, future.body).toBe(422);
      expect(await withdrawn(), 'a FUTURE date is the command\'s bound: the intent line and its twin').toBe(2);
      const ok = await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: await istDay() }); // CONTROL
      expect(ok.statusCode, ok.body).toBe(200);
      expect(await appealState(appealId)).toBe('withdrawn');
    });
  });

  describe('AC15 — the reads', () => {
    it('the list: ONE audit line a page naming its workers (names present); an EMPTY page writes none; a trustee sees only Panel-heard appeals; a District Admin needs `district`', async () => {
      const w = await world();
      const empty = await h.listAppeals(w.pa.client, w.p);
      expect(json(empty)).toEqual({ items: [], next_cursor: null });
      expect(await auditCount(w.p, 'field_worker.ending_appeal_list_viewed')).toBe(0);
      const a = await activeWorker(w);
      const b = await activeWorker(w);
      await h.lodgeAppeal(w.tp.client, w.p, a, await lodgeBody(await end(w, a, w.pa.client)));
      await h.lodgeAppeal(w.pa.client, w.p, b, await lodgeBody(await end(w, b, w.da.client)));
      const all = json(await h.listAppeals(w.pa.client, w.p)) as { items: Array<{ field_worker_id: string; name: string }> };
      expect(all.items.map((i) => i.field_worker_id).sort()).toEqual([a, b].sort());
      expect(all.items.every((i) => i.name === NAME)).toBe(true);
      expect(await auditCount(w.p, 'field_worker.ending_appeal_list_viewed')).toBe(1);
      const panel = json(await h.listAppeals(w.tp.client, w.p)) as { items: Array<{ field_worker_id: string }> };
      expect(panel.items.map((i) => i.field_worker_id)).toEqual([a]);
      expect((await h.listAppeals(w.da.client, w.p)).statusCode).toBe(403);
      expect((await h.listAppeals(w.da.client, w.p, { district: 'Patna' })).statusCode).toBe(200);
      expect((json(await h.appealsOf(w.tp.client, w.p, b)) as { items: Json[] }).items).toEqual([]); // the trustee-only rule, per worker
    });

    it('the eligible list: a trustee sees Panel-heard endings only, a super admin Pariwar-Admin-heard only; each carries the version and hearer, no mobile; one line a page', async () => {
      const w = await world();
      const a = await activeWorker(w);
      const b = await activeWorker(w);
      const va = await end(w, a, w.pa.client);
      await end(w, b, w.da.client);
      const forPanel = json(await h.listEligible(w.tp.client, w.p)) as { items: Array<Record<string, unknown>> };
      expect(forPanel.items.map((i) => i['field_worker_id'])).toEqual([a]);
      expect(forPanel.items[0]).toMatchObject({ ending_event_version: va, heard_by: 'trustee_panel', display_name: NAME });
      expect(JSON.stringify(forPanel)).not.toMatch(/\+91|mobile/);
      const forSa = json(await h.listEligible(w.sa.client, w.p)) as { items: Array<Record<string, unknown>> };
      expect(forSa.items.map((i) => i['field_worker_id'])).toEqual([b]);
      expect(await auditCount(w.p, 'field_worker.ending_appeal_candidates_viewed')).toBe(2);
      expect(json(await h.listEligible(w.da.client, w.p, { district: 'Patna' }))).toEqual({ items: [], next_cursor: null });
      expect(await auditCount(w.p, 'field_worker.ending_appeal_candidates_viewed')).toBe(2);
    });
  });

  describe('AC9 / AC10 — the shown number and the link', () => {
    it('a number held by ENDED records → 409 with their id, date and reason (another district too), ONE audit line, no name or district; a live holder answers first; re-submitted with previous_endings_seen → 201', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile, 'Gaya');
      const live = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna' });
      expect(errOf(live).code).toBe('field_worker.mobile_already_registered');
      await end(w, old, w.pa.client, 'left_voluntarily');
      const shown = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna' });
      expect(shown.statusCode).toBe(409);
      expect(errOf(shown).code).toBe('field_worker.number_previously_ended');
      expect((errOf(shown) as unknown as { details: Json }).details).toEqual({ previous_endings: [{ field_worker_id: old, ended_on: await istDay(), reason_code: 'left_voluntarily' }] });
      for (const secret of [NAME, 'Gaya', mobile.slice(3)]) expect(shown.body).not.toContain(secret);
      expect(await auditCount(w.p, 'field_worker.previous_endings_shown')).toBe(1);
      const ok = await h.register(w.da.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true });
      expect(ok.statusCode, ok.body).toBe(201);
      expect(await auditCount(w.p, 'field_worker.previous_endings_shown')).toBe(1);
    });

    it('the link: link_to a shown record → 201, the column and the genesis payload carry it; link_to without previous_endings_seen → 400; a live or another number’s record → 422 link_invalid', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      const otherLive = await activeWorker(w);
      expect((await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', link_to: old })).statusCode).toBe(400);
      await end(w, old, w.pa.client, 'left_voluntarily');
      const registeredLines = await auditCount(w.p, 'field_worker.registered');
      const wrong = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: otherLive });
      expect(wrong.statusCode).toBe(422);
      expect(errOf(wrong).code).toBe('field_worker.link_invalid');
      // Code review round 2, R2C-4: `link_invalid` is a PRE-READ refusal (AD12) - no intent line, no `_rolled_back` twin.
      expect(await auditCount(w.p, 'field_worker.registered'), 'a refused link wrote an audit line').toBe(registeredLines);
      const linked = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: old });
      expect(linked.statusCode, linked.body).toBe(201);
      const id = String(json(linked)['field_worker_id']);
      expect((await row(id)).previous_field_worker_id).toBe(old);
      const log = json(await h.log(w.pa.client, w.p, id)) as { items: Array<{ event_type: string; previous_field_worker_id: string | null }> };
      expect(log.items[0]).toMatchObject({ event_type: 'field_worker.registered', previous_field_worker_id: old });
      // `log?record=` — the earlier record's stream for an officer who may read it; a record not in the chain → a BARE 403.
      const earlier = json(await h.log(w.pa.client, w.p, id, { record: old })) as { items: Array<{ event_type: string }> };
      expect(earlier.items.at(-1)!.event_type).toBe('field_worker.terminated');
      const notInChain = await h.log(w.pa.client, w.p, id, { record: otherLive });
      expect(notInChain.statusCode).toBe(403);
      expect((errOf(notInChain) as unknown as { details?: unknown }).details).toBeUndefined();
    });

    it('`log?record=` for a District Admin of the new worker’s district whose earlier record lies in ANOTHER district → a bare 403 (no details)', async () => {
      const w = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile, 'Gaya');
      await end(w, old, w.pa.client, 'left_voluntarily');
      const id = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: old });
      expect((await h.log(w.da.client, w.p, id)).statusCode).toBe(200); // CONTROL — their own worker's log
      const r = await h.log(w.da.client, w.p, id, { record: old });
      expect(r.statusCode).toBe(403);
      expect((errOf(r) as unknown as { details?: unknown }).details).toBeUndefined();
      expect((await h.log(w.daGaya.client, w.p, old)).statusCode).toBe(200); // the Gaya officer reads it directly
    });
  });

  // Code review round 2, R2C-5: the link and the per-worker reads, against the ids a refusal must name correctly. The first version's only "wrong
  // record" was a LIVE worker of a DIFFERENT number, so deleting the number comparison, or the Pariwar predicate, left every leg green.
  describe('R2C-5 — AC10 (a), AC10 (c), AC15 (f): the link and the reads against real ids of another number, another Pariwar and nobody', () => {
    const workerCount = async (p: string) => (await q<{ n: number }>('SELECT count(*)::int AS n FROM field_workers WHERE pariwar_id = $1', [p]))[0]!.n;

    it('AC10 (a): link_to a TERMINATED record of another number, an unknown id, or another Pariwar’s terminated record of THE SAME number → 422 link_invalid, no worker, no line; CONTROL: the right record links', async () => {
      const w = await world();
      const other = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      await end(w, old, w.pa.client, 'left_voluntarily');
      const elsewhere = await activeWorker(w); // terminated, but a DIFFERENT number - only the number comparison can refuse it
      await end(w, elsewhere, w.pa.client, 'left_voluntarily');
      const foreign = await activeWorker(other, mobile); // another Pariwar's, terminated, the SAME number - only the Pariwar predicate can refuse it
      await end(other, foreign, other.pa.client, 'left_voluntarily');
      const lines = await auditCount(w.p, 'field_worker.registered');
      const before = await workerCount(w.p);
      for (const [label, linkTo] of [
        ['a terminated record of another number', elsewhere],
        ['an unknown id', randomUUID()],
        ['another Pariwar’s terminated record of the same number', foreign],
      ] as const) {
        const r = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: linkTo });
        expect(r.statusCode, `${label}: ${r.body}`).toBe(422);
        expect(errOf(r).code, label).toBe('field_worker.link_invalid');
      }
      expect(await workerCount(w.p), 'a refused link created a worker').toBe(before);
      expect(await auditCount(w.p, 'field_worker.registered'), 'a refused link wrote an audit line (R2C-4: a pre-read refusal)').toBe(lines);
      // CONTROL - the right record links, and writes its one line.
      const ok = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: old });
      expect(ok.statusCode, ok.body).toBe(201);
      expect((await row(String(json(ok)['field_worker_id']))).previous_field_worker_id).toBe(old);
      expect(await auditCount(w.p, 'field_worker.registered')).toBe(lines + 1);
    });

    it('AC10 (c): ANOTHER Pariwar’s real worker id as `log?record=` → a bare 403 (no details); CONTROL: this worker’s linked earlier record reads', async () => {
      const w = await world();
      const other = await world();
      const mobile = randomMobile();
      const old = await activeWorker(w, mobile);
      await end(w, old, w.pa.client, 'left_voluntarily');
      const id = await h.registered(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: old });
      const foreign = await activeWorker(other, mobile);
      await end(other, foreign, other.pa.client, 'left_voluntarily');
      const r = await h.log(w.pa.client, w.p, id, { record: foreign });
      expect(r.statusCode, r.body).toBe(403);
      expect(errOf(r).code).toBe('authz.forbidden');
      expect((errOf(r) as unknown as { details?: unknown }).details).toBeUndefined();
      const earlier = await h.log(w.pa.client, w.p, id, { record: old }); // CONTROL
      expect(earlier.statusCode, earlier.body).toBe(200);
    });

    it('AC15 (f): ANOTHER Pariwar’s real worker id on the per-worker appeals read → 403, though it has an appeal to leak; CONTROL: this Pariwar’s own ended worker answers 200', async () => {
      const w = await world();
      const other = await world();
      const foreign = await activeWorker(other);
      const vf = await end(other, foreign, other.pa.client);
      expect((await h.lodgeAppeal(other.tp.client, other.p, foreign, await lodgeBody(vf))).statusCode).toBe(201);
      const own = await activeWorker(w);
      const vo = await end(w, own, w.pa.client);
      expect((await h.lodgeAppeal(w.tp.client, w.p, own, await lodgeBody(vo))).statusCode).toBe(201);
      const r = await h.appealsOf(w.pa.client, w.p, foreign);
      expect(r.statusCode, r.body).toBe(403);
      expect(r.body).not.toContain(foreign);
      const mine = await h.appealsOf(w.tp.client, w.p, own); // CONTROL
      expect(mine.statusCode, mine.body).toBe(200);
      expect((json(mine) as { items: Json[] }).items).toHaveLength(1);
    });
  });

  // Code review round 2, R2C-9: the lodge, decide and withdraw PRE-READS the handlers own. Each is a refusal with its OWN code and NO audit line; deleting
  // one turns it into the domain command's refusal under the lock, which answers the same code with an intent line AND its `_rolled_back` twin.
  describe('R2C-9 — the pre-reads of lodge, decide and withdraw: ending_changed, appeal_already_decided and appeal_not_open, each with NO line', () => {
    const appealRows = (id: string) => q('SELECT 1 FROM field_worker_ending_appeals WHERE field_worker_id = $1', [id]);

    it('lodge with the OLD ending version (undone, then ended again) → 409 ending_changed, no appeal, no line; CONTROL: the current version lodges', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v1 = await end(w, id, w.pa.client); // Panel-heard
      expect((await h.undoEnding(w.pa2.client, w.p, id, v1)).statusCode).toBe(200);
      const v2 = await end(w, id, w.pa.client);
      expect(v2, 'the second ending must be a NEW version, or the leg proves nothing').toBeGreaterThan(v1);
      const lodged = () => auditCount(w.p, 'field_worker_ending_appeal.lodged');
      const stale = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v1));
      expect(stale.statusCode, stale.body).toBe(409);
      expect(errOf(stale).code).toBe('field_worker.ending_changed');
      expect(await lodged(), 'a stale version wrote an audit line').toBe(0);
      expect(await appealRows(id)).toHaveLength(0);
      const ok = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v2)); // CONTROL
      expect(ok.statusCode, ok.body).toBe(201);
      expect(await lodged()).toBe(1);
    });

    it('lodge after the Panel REFUSED an appeal on this ending → 409 appeal_already_decided, no second appeal, no new line; CONTROL: the first lodge and the refusal each wrote theirs', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.pa.client);
      const first = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v));
      expect(first.statusCode, first.body).toBe(201);
      const refused = await h.decideAppeal(w.tp2.client, w.p, String(json(first)['appeal_id']), { outcome: 'refused', decided_on: await istDay() });
      expect(refused.statusCode, refused.body).toBe(200);
      const lodged = () => auditCount(w.p, 'field_worker_ending_appeal.lodged');
      expect([await lodged(), await auditCount(w.p, 'field_worker_ending_appeal.refused')]).toEqual([1, 1]); // CONTROL
      const again = await h.lodgeAppeal(w.tp.client, w.p, id, await lodgeBody(v));
      expect(again.statusCode, again.body).toBe(409);
      expect(errOf(again).code).toBe('field_worker.appeal_already_decided');
      expect(await lodged(), 'a lodge after a refusal wrote an audit line').toBe(1);
      expect(await appealRows(id)).toHaveLength(1);
    });

    it('decide (refused AND allowed) and withdraw on a CLOSED appeal → 409 appeal_not_open carrying its state, no line; CONTROL: the closing decision wrote its one line', async () => {
      const w = await world();
      const id = await activeWorker(w);
      const v = await end(w, id, w.da.client); // Pariwar-Admin-heard
      const appealId = String(json(await h.lodgeAppeal(w.pa.client, w.p, id, await lodgeBody(v)))['appeal_id']);
      const closed = await h.decideAppeal(w.pa2.client, w.p, appealId, { outcome: 'refused', decided_on: await istDay() });
      expect(closed.statusCode, closed.body).toBe(200);
      const lines = async () => [
        await auditCount(w.p, 'field_worker_ending_appeal.refused'),
        await auditCount(w.p, 'field_worker_ending_appeal.allowed'),
        await auditCount(w.p, 'field_worker_ending_appeal.withdrawn'),
      ];
      expect(await lines()).toEqual([1, 0, 0]); // CONTROL
      for (const outcome of ['refused', 'allowed'] as const) {
        const r = await h.decideAppeal(w.pa2.client, w.p, appealId, { outcome, decided_on: await istDay() });
        expect(r.statusCode, `${outcome}: ${r.body}`).toBe(409);
        expect(errOf(r).code, outcome).toBe('field_worker.appeal_not_open');
        expect((errOf(r) as unknown as { details?: unknown }).details, outcome).toEqual({ state: 'refused' });
      }
      const withdrawn = await h.withdrawAppeal(w.pa2.client, w.p, appealId, { decided_on: await istDay() });
      expect(withdrawn.statusCode, withdrawn.body).toBe(409);
      expect(errOf(withdrawn).code).toBe('field_worker.appeal_not_open');
      expect(await lines(), 'a closed appeal cost an audit line').toEqual([1, 0, 0]);
    });
  });

  describe('AC13 — the route table (13.1d AC7 (d), CR20)', () => {
    it('the three new GETs declare the module’s ONE shared `read` rate limit (object identity); the four new writes declare none', () => {
      const routes = getCollectedRoutes(h.app);
      const base = '/api/v1/p/:pariwarId/field-workers';
      const cfg = (method: string, url: string) => {
        const r = routes.find((x) => x.method === method && x.url === url);
        expect(r, `route not found: ${method} ${url}`).toBeDefined();
        return (r!.config as { rateLimit?: unknown } | undefined)?.rateLimit;
      };
      const read = cfg('GET', base);
      // Review R2C-6 - without this an ABSENT limit makes `toBe(undefined)` below pass for all three GETs (the test could not fail).
      expect(read, 'the module `read` rate limit is not declared on `GET /field-workers`').toBeDefined();
      for (const url of [`${base}/ending-appeals`, `${base}/ending-appeals/eligible`, `${base}/:fieldWorkerId/ending-appeals`]) expect(cfg('GET', url), url).toBe(read);
      for (const [m, url] of [
        ['POST', `${base}/:fieldWorkerId/undo-ending`],
        ['POST', `${base}/:fieldWorkerId/ending-appeals`],
        ['POST', `${base}/ending-appeals/:appealId/decide`],
        ['POST', `${base}/ending-appeals/:appealId/withdraw`],
      ] as const) expect(cfg(m, url), url).toBeUndefined();
    });

    // Review R2C-6 - AD13 and Task 5.1 order the appeal record's STATIC routes before every `/:fieldWorkerId` route (13.1d's convention). A
    // static segment beats a parametric one in find-my-way whatever the order, so this is a convention test: it keeps the order VISIBLE.
    it('the four static `ending-appeals` routes are registered BEFORE the first `/:fieldWorkerId` route (AD13, Task 5.1)', () => {
      const base = '/api/v1/p/:pariwarId/field-workers';
      // ⚠ Fastify exposes a HEAD twin of every GET (registered right after it); the convention is about the routes the module declares.
      const urls = getCollectedRoutes(h.app)
        .filter((r) => r.method !== 'HEAD')
        .map((r) => `${r.method} ${r.url}`)
        .filter((u) => u.split(' ')[1]!.startsWith(base));
      const firstParametric = urls.findIndex((u) => u.split(' ')[1]!.startsWith(`${base}/:fieldWorkerId`));
      expect(firstParametric, 'no per-worker route found').toBeGreaterThan(-1);
      const statics = urls.map((u, i) => ({ u, i })).filter(({ u }) => u.split(' ')[1]!.startsWith(`${base}/ending-appeals`));
      // Non-vacuity: all four static routes exist (so an emptied filter cannot pass the loop below).
      expect(statics.map(({ u }) => u).sort()).toEqual(
        [
          `GET ${base}/ending-appeals`,
          `GET ${base}/ending-appeals/eligible`,
          `POST ${base}/ending-appeals/:appealId/decide`,
          `POST ${base}/ending-appeals/:appealId/withdraw`,
        ].sort(),
      );
      for (const { u, i } of statics) expect(i, `${u} is registered after the first per-worker route (${urls[firstParametric]})`).toBeLessThan(firstParametric);
    });
  });
});

// Story 13.1f — the undo, the appeal record, the shown number and the link, through HTTP (AC1–AC3, AC5–AC10, AC15, AC17's actor legs;
// decision `2026-11-16-464`; the Panel's `2026-11-17-465`, Q6 B). Live DB, own-committing (each request commits); every refusal asserts
// the status AND the code, and every "no audit line" leg is counted BEFORE the request with a CONTROL that the same path writes one.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getCollectedRoutes } from '../../../src/route-registry.js';
import { hasDatabase } from '../_setup.js';
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
      const wrong = await h.register(w.pa.client, w.p, { name: NAME, mobile, district: 'Patna', previous_endings_seen: true, link_to: otherLive });
      expect(wrong.statusCode).toBe(422);
      expect(errOf(wrong).code).toBe('field_worker.link_invalid');
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

  describe('AC13 — the route table (13.1d AC7 (d), CR20)', () => {
    it('the three new GETs declare the module’s ONE shared `read` rate limit (object identity); the five new writes declare none', () => {
      const routes = getCollectedRoutes(h.app);
      const base = '/api/v1/p/:pariwarId/field-workers';
      const cfg = (method: string, url: string) => {
        const r = routes.find((x) => x.method === method && x.url === url);
        expect(r, `route not found: ${method} ${url}`).toBeDefined();
        return (r!.config as { rateLimit?: unknown } | undefined)?.rateLimit;
      };
      const read = cfg('GET', base);
      for (const url of [`${base}/ending-appeals`, `${base}/ending-appeals/eligible`, `${base}/:fieldWorkerId/ending-appeals`]) expect(cfg('GET', url), url).toBe(read);
      for (const [m, url] of [
        ['POST', `${base}/:fieldWorkerId/undo-ending`],
        ['POST', `${base}/:fieldWorkerId/ending-appeals`],
        ['POST', `${base}/ending-appeals/:appealId/decide`],
        ['POST', `${base}/ending-appeals/:appealId/withdraw`],
      ] as const) expect(cfg(m, url), url).toBeUndefined();
    });
  });
});

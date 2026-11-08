// Story 13.1c — the lifecycle acts through HTTP: move (AC1), suspend (AC4), reactivate (AC5), terminate (AC6), and the idempotency of
// each (13.1a TR6). Live DB, OWN-COMMITTING (the route commits inside `mutate`): a fresh Pariwar per test, assertions by our own ids
// (⛔ counts of anything shared), cleanup under replica mode (the harness). The races (AC2, AC6 (b)) are `move-race.spec.ts` and
// `terminate-race.spec.ts`; the log (AC8) `log.spec.ts`. A refusal on the PRE-READ writes NO audit line (I7) — asserted by reading
// the worker's own lines, with a control that a committed act writes exactly one.

import { randomUUID } from 'node:crypto';

import { fieldWorker } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { payloadHash } from '../../../src/modules/field-worker/write-support.js';
import { hasDatabase, makeClient } from '../_setup.js';
import { createHarness, errOf, json, type Client, type Harness, type Json } from './_registration-harness.js';

const NAME = 'Lifecycle Distinctive-Surname';
const MOBILE_DIGITS = '9876502345';
const LIFECYCLE_ACTIONS = ['field_worker.posted', 'field_worker.suspended', 'field_worker.reactivated', 'field_worker.terminated'];

describe.skipIf(!hasDatabase)('Story 13.1c — move, suspend, reactivate and end a field worker through HTTP', { timeout: 90_000 }, () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  const q = <T>(sql: string, params: unknown[]) => h.td.pool.query(sql, params).then((r) => r.rows as T[]);
  const events = (id: string) =>
    q<{ event_type: string; payload: Json; actor_id: string }>('SELECT event_type, payload, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id]);
  /** The worker's lifecycle audit lines (and their twins), in order — ⛔ the registration's or the approval's. */
  const lines = (p: string, id: string) =>
    q<{ id: string; action: string; actor_id: string; actor_role: string; request_payload_hash: string }>(
      `SELECT audit_id AS id, action, actor_id, actor_role, request_payload_hash FROM audit_log_entries
        WHERE pariwar_id = $1 AND resource_locator = $2 AND split_part(action, '_rolled_back', 1) = ANY($3) ORDER BY seq`,
      [p, `field_worker/${id}`, LIFECYCLE_ACTIONS],
    );
  const row = (id: string) =>
    q<{ current_state: string; state_reason_code: string | null; district: string; ended_on: string | null; audit_id: string }>(
      'SELECT current_state, state_reason_code, district, ended_on::text AS ended_on, audit_id FROM field_workers WHERE field_worker_id = $1',
      [id],
    ).then((r) => r[0]!);
  const codeOf = (id: string) => q<{ code: string; field_worker_id: string }>('SELECT code, field_worker_id FROM field_worker_attribution_codes WHERE field_worker_id = $1', [id]);
  const smsRows = (id: string) => q<{ outcome: string; attempt_count: number }>('SELECT outcome, attempt_count FROM field_worker_code_sms_sends WHERE field_worker_id = $1', [id]);
  const istToday = async () => (await q<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d", []))[0]!.d;
  const istTomorrow = async () => (await q<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::text AS d", []))[0]!.d;

  /** A Pariwar with Patna, Gaya and Nalanda listed, a Pariwar Admin, and one worker registered in Patna — approved unless `pending`. */
  async function setup(o: { pending?: boolean; mobile?: string } = {}) {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya', 'Nalanda');
    const admin = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const id = await h.registered(admin.client, p, { name: NAME, mobile: o.mobile ?? `+91${MOBILE_DIGITS}`, district: 'Patna' });
    if (!o.pending) expect((await h.approve(admin.client, p, id)).statusCode).toBe(200);
    return { p, admin, id };
  }

  /** Every 200 here: the five keys, and ⛔ a name, a mobile or a code anywhere in the body (I6 — an absence assertion on a 200, TR7). */
  async function expectCleanResult(r: { statusCode: number; body: string }, id: string, expected: Json): Promise<void> {
    expect(r.statusCode, r.body).toBe(200);
    expect(json(r)).toEqual({ field_worker_id: id, ...expected });
    const code = (await codeOf(id))[0]?.code;
    for (const secret of [NAME, MOBILE_DIGITS, code ?? 'no-code']) expect(r.body).not.toContain(secret);
  }

  /** A refusal on the pre-read: the code, NO new event and NO lifecycle audit line — counted BEFORE `send` runs (⛔ after: vacuous). */
  async function expectRefused(send: () => Promise<{ statusCode: number; body: string }>, p: string, id: string, status: number, code: string): Promise<void> {
    const before = { events: (await events(id)).length, lines: (await lines(p, id)).length };
    const r = await send();
    expect(r.statusCode, r.body).toBe(status);
    expect(errOf(r).code).toBe(code);
    expect((await events(id)).length).toBe(before.events);
    expect((await lines(p, id)).length).toBe(before.lines);
  }

  /**
   * A refusal only the COMMAND can make (the IST bounds of `ended_on` are judged in SQL, inside `mutate` — TR2): the code, NO new
   * event, and the act's intent line plus its `_rolled_back` twin.
   */
  async function expectRefusedInMutate(send: () => Promise<{ statusCode: number; body: string }>, p: string, id: string, status: number, code: string, action: string): Promise<void> {
    const before = { events: (await events(id)).length, lines: (await lines(p, id)).map((l) => l.action) };
    const r = await send();
    expect(r.statusCode, r.body).toBe(status);
    expect(errOf(r).code).toBe(code);
    expect((await events(id)).length).toBe(before.events);
    expect((await lines(p, id)).map((l) => l.action)).toEqual([...before.lines, action, `${action}_rolled_back`]);
  }

  /** `hashShape` is the act's canonical audit-hash input beyond the worker id (AD6): the line carries EXACTLY that hash (review CR15). */
  async function expectOneAct(p: string, id: string, actorId: string, action: string, key: string, role: string, hashShape: Json): Promise<void> {
    const l = await lines(p, id);
    expect(l.map((x) => x.action)).toEqual([action]);
    expect(l[0]).toMatchObject({ actor_id: actorId, actor_role: role });
    expect(l[0]!.request_payload_hash).toBe(payloadHash({ field_worker_id: id, ...hashShape }));
    const ev = (await events(id)).at(-1)!;
    expect(ev.event_type).toBe(action);
    expect(ev.actor_id).toBe(actorId);
    expect((ev.payload['authorization'] as Json)['permission_key']).toBe(key);
    expect((ev.payload['authorization'] as Json)['role']).toBe(role);
    // The row's `audit_id` is the MOST RECENT transition's audit line (project.ts) — this act's intent line.
    expect((await row(id)).audit_id).toBe(l[0]!.id);
  }

  // ── AC1 — a Pariwar Admin moves a worker directly ──

  it('AC1: a Pariwar Admin moves an active worker Patna → Gaya: 200; ONE field_worker.posted event (both districts, the reason, the field_worker.move snapshot) and ONE field_worker.posted audit line; the code, its row and the code-text row unchanged', async () => {
    const { p, admin, id } = await setup();
    const code = await codeOf(id);
    const sms = await smsRows(id);
    const r = await h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' });
    await expectCleanResult(r, id, { district: 'Gaya', current_state: 'active', state_reason_code: null, ended_on: null });
    await expectOneAct(p, id, admin.userId, 'field_worker.posted', 'field_worker.move', 'pariwar_admin', { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' });
    expect((await events(id)).at(-1)!.payload).toMatchObject({ from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned', authorization: { target: { value: 'Patna' } } });
    expect(await codeOf(id)).toEqual(code);
    expect(await smsRows(id)).toEqual(sms);
    expect((await row(id)).district).toBe('Gaya');
  });

  it('AC1 (a): a SUSPENDED worker moved stays suspended with the same reason; a WAITING worker can be moved too', async () => {
    const { p, admin, id } = await setup();
    expect((await h.suspend(admin.client, p, id, { reason_code: 'at_worker_request' })).statusCode).toBe(200);
    const r = await h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Nalanda', reason_code: 'at_worker_request' });
    await expectCleanResult(r, id, { district: 'Nalanda', current_state: 'suspended', state_reason_code: 'at_worker_request', ended_on: null });
    expect(await row(id)).toMatchObject({ current_state: 'suspended', state_reason_code: 'at_worker_request', district: 'Nalanda' });
    const waiting = await setup({ pending: true });
    const w = await h.move(waiting.admin.client, waiting.p, waiting.id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' });
    await expectCleanResult(w, waiting.id, { district: 'Gaya', current_state: 'pending_kyc', state_reason_code: null, ended_on: null });
  });

  it('AC1 (b): a District Admin of EITHER district ⇒ 403 (the move is the Pariwar Admin’s); ⛔ an event or a line', async () => {
    const { p, id } = await setup();
    for (const district of ['Patna', 'Gaya']) {
      const da = await h.actor(p, 'district_admin', 'district', district);
      await expectRefused(() => h.move(da.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }), p, id, 403, 'authz.forbidden');
    }
  });

  it('AC1 (c), AC2: the same district ⇒ 409 district_unchanged; an unlisted one ⇒ 422 district_unknown; a stale from_district ⇒ 409 authorization_stale; an ended worker ⇒ 409 illegal_transition — each with NO event and NO line', async () => {
    const { p, admin, id } = await setup();
    const move = (b: Json) => h.move(admin.client, p, id, { reason_code: 'reassigned', ...b });
    await expectRefused(() => move({ from_district: 'Patna', to_district: 'Patna' }), p, id, 409, 'field_worker.district_unchanged');
    await expectRefused(() => move({ from_district: 'Patna', to_district: 'Atlantis' }), p, id, 422, 'field_worker.district_unknown');
    await expectRefused(() => move({ from_district: 'Gaya', to_district: 'Nalanda' }), p, id, 409, 'field_worker.authorization_stale');
    // CONTROL — the same act with the right source writes ONE line.
    expect((await move({ from_district: 'Patna', to_district: 'Gaya' })).statusCode).toBe(200);
    expect((await lines(p, id)).map((l) => l.action)).toEqual(['field_worker.posted']);
    expect((await h.terminate(admin.client, p, id, { reason_code: 'left_voluntarily', ended_on: await istToday() })).statusCode).toBe(200);
    await expectRefused(() => move({ from_district: 'Gaya', to_district: 'Nalanda' }), p, id, 409, 'field_worker.illegal_transition');
  });

  it('AC1 (d), AC6 (f): a reason outside the act’s own list, an unknown key or a malformed ended_on ⇒ 400 request.validation, with no event and no line', async () => {
    const { p, admin, id } = await setup();
    const bad: [string, (c: Client) => ReturnType<Harness['move']>][] = [
      ['move with a suspension reason', (c) => h.move(c, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'under_review' })],
      ['suspend with an ending reason', (c) => h.suspend(c, p, id, { reason_code: 'inactive' })],
      ['terminate with a labelling reason', (c) => h.terminate(c, p, id, { reason_code: 'conduct', ended_on: '2026-11-01' })],
      ['terminate with a malformed ended_on', (c) => h.terminate(c, p, id, { reason_code: 'inactive', ended_on: '01-11-2026' })],
      ['reactivate with a key', (c) => h.reactivate(c, p, id, randomUUID(), JSON.stringify({ reason_code: 'under_review' }))],
    ];
    for (const [label, run] of bad) await expectRefused(() => run(admin.client), p, id, 400, 'request.validation').catch((e: unknown) => {
      throw new Error(`${label}: ${String(e)}`);
    });
  });

  // ── AC4 — suspending ──

  it('AC4: a District Admin of the worker’s CURRENT district, and a Pariwar Admin, suspend an active worker: 200; one field_worker.suspended event with the field_worker.suspend snapshot; one line naming the officer and role', async () => {
    const one = await setup();
    const da = await h.actor(one.p, 'district_admin', 'district', 'Patna', 'Ravi District-Admin');
    const r = await h.suspend(da.client, one.p, one.id, { reason_code: 'under_review' });
    await expectCleanResult(r, one.id, { district: 'Patna', current_state: 'suspended', state_reason_code: 'under_review', ended_on: null });
    await expectOneAct(one.p, one.id, da.userId, 'field_worker.suspended', 'field_worker.suspend', 'district_admin', { reason_code: 'under_review' });
    const two = await setup();
    await expectCleanResult(await h.suspend(two.admin.client, two.p, two.id, { reason_code: 'at_worker_request' }), two.id, {
      district: 'Patna',
      current_state: 'suspended',
      state_reason_code: 'at_worker_request',
      ended_on: null,
    });
    await expectOneAct(two.p, two.id, two.admin.userId, 'field_worker.suspended', 'field_worker.suspend', 'pariwar_admin', { reason_code: 'at_worker_request' });
  });

  it('AC4 (a): a District Admin of ANOTHER district ⇒ 403; one who held the worker’s OLD district before a move ⇒ 403', async () => {
    const { p, admin, id } = await setup();
    const gaya = await h.actor(p, 'district_admin', 'district', 'Gaya');
    const patna = await h.actor(p, 'district_admin', 'district', 'Patna');
    await expectRefused(() => h.suspend(gaya.client, p, id, { reason_code: 'under_review' }), p, id, 403, 'authz.forbidden');
    expect((await h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Nalanda', reason_code: 'reassigned' })).statusCode).toBe(200);
    const today = await istToday();
    // Each refusal names its code and leaves no event and no line (the log is a GET: it writes neither).
    await expectRefused(() => h.suspend(patna.client, p, id, { reason_code: 'under_review' }), p, id, 403, 'authz.forbidden');
    await expectRefused(() => h.terminate(patna.client, p, id, { reason_code: 'inactive', ended_on: today }), p, id, 403, 'authz.forbidden');
    const logged = await h.log(patna.client, p, id);
    expect(logged.statusCode, logged.body).toBe(403);
    expect(errOf(logged).code).toBe('authz.forbidden');
  });

  it('AC4 (b): a waiting, a suspended or an ended worker ⇒ 409 illegal_transition with NO line', async () => {
    const waiting = await setup({ pending: true });
    await expectRefused(() => h.suspend(waiting.admin.client, waiting.p, waiting.id, { reason_code: 'under_review' }), waiting.p, waiting.id, 409, 'field_worker.illegal_transition');
    const { p, admin, id } = await setup();
    expect((await h.suspend(admin.client, p, id, { reason_code: 'under_review' })).statusCode).toBe(200);
    await expectRefused(() => h.suspend(admin.client, p, id, { reason_code: 'under_review' }), p, id, 409, 'field_worker.illegal_transition');
    expect((await h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: await istToday() })).statusCode).toBe(200);
    await expectRefused(() => h.suspend(admin.client, p, id, { reason_code: 'under_review' }), p, id, 409, 'field_worker.illegal_transition');
  });

  it('AC4 (c), AC5: suspended ⇒ acceptsNewAttributions false and the by-hand read 409 code_not_available; reactivated (`{}`) ⇒ active, reason cleared, the read works again, and NO second code text', async () => {
    const { p, admin, id } = await setup();
    const smsBefore = await smsRows(id);
    expect(smsBefore).toHaveLength(1);
    expect((await h.suspend(admin.client, p, id, { reason_code: 'under_review' })).statusCode).toBe(200);
    expect(fieldWorker.acceptsNewAttributions((await row(id)).current_state as 'suspended')).toBe(false);
    const blocked = await h.code(admin.client, p, id);
    expect(blocked.statusCode, blocked.body).toBe(409);
    expect(errOf(blocked).code).toBe('field_worker.code_not_available');
    const r = await h.reactivate(admin.client, p, id);
    await expectCleanResult(r, id, { district: 'Patna', current_state: 'active', state_reason_code: null, ended_on: null });
    expect((await lines(p, id)).map((l) => l.action)).toEqual(['field_worker.suspended', 'field_worker.reactivated']);
    // The reactivation's audit hash input is the worker id alone (AD6; review CR15), and the row's audit_id is that line.
    const reactivation = (await lines(p, id))[1]!;
    expect(reactivation.request_payload_hash).toBe(payloadHash({ field_worker_id: id }));
    expect((await row(id)).audit_id).toBe(reactivation.id);
    expect(((await events(id)).at(-1)!.payload['authorization'] as Json)['permission_key']).toBe('field_worker.reactivate');
    expect(fieldWorker.acceptsNewAttributions((await row(id)).current_state as 'active')).toBe(true);
    expect((await h.code(admin.client, p, id)).statusCode).toBe(200);
    expect(await smsRows(id)).toEqual(smsBefore);
    // A non-suspended worker ⇒ 409, no line.
    await expectRefused(() => h.reactivate(admin.client, p, id), p, id, 409, 'field_worker.illegal_transition');
  });

  // ── AC6 — ending ──

  it('AC6: a District Admin of the current district ends an active worker (left_voluntarily, today IST): 200; one field_worker.terminated event and line; (e) acceptsNewAttributions false, the read 409, the code row and the worker id unchanged', async () => {
    const { p, id } = await setup();
    const da = await h.actor(p, 'district_admin', 'district', 'Patna', 'Ravi District-Admin');
    const code = await codeOf(id);
    const today = await istToday();
    const r = await h.terminate(da.client, p, id, { reason_code: 'left_voluntarily', ended_on: today });
    await expectCleanResult(r, id, { district: 'Patna', current_state: 'terminated', state_reason_code: 'left_voluntarily', ended_on: today });
    await expectOneAct(p, id, da.userId, 'field_worker.terminated', 'field_worker.terminate', 'district_admin', { reason_code: 'left_voluntarily', ended_on: today });
    expect(await row(id)).toMatchObject({ current_state: 'terminated', state_reason_code: 'left_voluntarily', ended_on: today });
    expect(fieldWorker.acceptsNewAttributions('terminated')).toBe(false);
    const read = await h.code(da.client, p, id);
    expect(read.statusCode).toBe(409);
    expect(errOf(read).code).toBe('field_worker.code_not_available');
    expect(await codeOf(id)).toEqual(code);
  });

  it('AC6 (a): the same mobile can be registered again — a WAITING worker ended registered_in_error, and an ACTIVE one ended left_voluntarily', async () => {
    for (const [pending, reason] of [[true, 'registered_in_error'], [false, 'left_voluntarily']] as const) {
      const mobile = `+9198765${String(10000 + Math.floor(Math.random() * 89999)).padStart(5, '0')}`;
      const { p, admin, id } = await setup({ pending, mobile });
      const again = await h.register(admin.client, p, { name: NAME, mobile, district: 'Patna' });
      expect(again.statusCode, again.body).toBe(409);
      expect(errOf(again).code).toBe('field_worker.mobile_already_registered');
      expect((await h.terminate(admin.client, p, id, { reason_code: reason, ended_on: await istToday() })).statusCode).toBe(200);
      const fresh = await h.register(admin.client, p, { name: NAME, mobile, district: 'Patna' });
      expect(fresh.statusCode, fresh.body).toBe(201);
      expect(json(fresh)['field_worker_id']).not.toBe(id);
    }
  });

  it('AC6 (c), (g): a future ended_on, or one before the registration day (IST) ⇒ 422 ended_on_invalid, no event (judged by the command: the intent and its twin); `died` with today as the date of death ⇒ terminated / died / ended_on (migrations 0203 + 0204), a future date of death ⇒ 422', async () => {
    const { p, admin, id } = await setup();
    const tomorrow = await istTomorrow();
    await expectRefusedInMutate(() => h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: tomorrow }), p, id, 422, 'field_worker.ended_on_invalid', 'field_worker.terminated');
    await expectRefusedInMutate(() => h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: '2020-01-01' }), p, id, 422, 'field_worker.ended_on_invalid', 'field_worker.terminated');
    await expectRefusedInMutate(() => h.terminate(admin.client, p, id, { reason_code: 'died', ended_on: tomorrow }), p, id, 422, 'field_worker.ended_on_invalid', 'field_worker.terminated');
    // Review CR12 - a date that is not a real calendar day is a PURE refusal, judged before the wrapper: 422, no event, and NO line at
    // all (⛔ the intent-and-twin pair the IST bounds above write). A worker already ended still answers 409 first (legality precedes it).
    for (const ended_on of ['2026-02-30', '2026-13-45', '2026-00-10']) {
      await expectRefused(() => h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on }), p, id, 422, 'field_worker.ended_on_invalid');
    }
    const today = await istToday();
    const r = await h.terminate(admin.client, p, id, { reason_code: 'died', ended_on: today });
    await expectCleanResult(r, id, { district: 'Patna', current_state: 'terminated', state_reason_code: 'died', ended_on: today });
    expect(await row(id)).toMatchObject({ current_state: 'terminated', state_reason_code: 'died', ended_on: today });
    expect((await events(id)).at(-1)!.payload).toMatchObject({ reason_code: 'died', ended_on: today, trigger: 'field_worker.terminate:died' });
  });

  it('AC6 (d), I4: every act on an ended worker ⇒ 409 illegal_transition, ⛔ an event or a line; a waiting and a suspended worker CAN be ended', async () => {
    const waiting = await setup({ pending: true });
    const { p, admin, id } = await setup();
    // ONE read for the whole test, AFTER both workers exist: a request and its expected body must agree on the day, and a day read
    // before a registration could fall before it if midnight IST passed between.
    const today = await istToday();
    await expectCleanResult(
      await h.terminate(waiting.admin.client, waiting.p, waiting.id, { reason_code: 'registered_in_error', ended_on: today }),
      waiting.id,
      { district: 'Patna', current_state: 'terminated', state_reason_code: 'registered_in_error', ended_on: today },
    );
    expect((await h.suspend(admin.client, p, id, { reason_code: 'under_review' })).statusCode).toBe(200);
    expect((await h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: today })).statusCode).toBe(200);
    for (const run of [
      () => h.move(admin.client, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }),
      () => h.suspend(admin.client, p, id, { reason_code: 'under_review' }),
      () => h.reactivate(admin.client, p, id),
      () => h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: today }),
      // Legality precedes the date check (review CR12): an ended worker answers 409 even for a date that is not a real day.
      () => h.terminate(admin.client, p, id, { reason_code: 'inactive', ended_on: '2026-02-30' }),
    ]) {
      await expectRefused(() => run(), p, id, 409, 'field_worker.illegal_transition');
    }
  });

  // ── Denial and holders, per route (checklist family 3; Task 4.2) ──
  // The four writes share one per-worker gate factory, but a swapped key or a dropped hook on ONE route would pass every other
  // route's tests - so each route gets the approval route's legs (`approval.spec.ts` AC2 (c)): no session, no grant here, a role
  // without the key, a District Admin of another district, and another Pariwar's worker id; then the holders (review CR11).

  type ActRoute = {
    name: string;
    start: 'active' | 'suspended';
    /** A District Admin of the worker's own district holds the key (AD5); `move` is the Pariwar Admin's alone (`-443` Q1 A). */
    districtAdminHolds: boolean;
    send: (c: Client, p: string, id: string, today: string) => ReturnType<Harness['move']>;
  };
  const ACT_ROUTES: ActRoute[] = [
    { name: 'move', start: 'active', districtAdminHolds: false, send: (c, p, id) => h.move(c, p, id, { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }) },
    { name: 'suspend', start: 'active', districtAdminHolds: true, send: (c, p, id) => h.suspend(c, p, id, { reason_code: 'under_review' }) },
    { name: 'reactivate', start: 'suspended', districtAdminHolds: true, send: (c, p, id) => h.reactivate(c, p, id) },
    { name: 'terminate', start: 'active', districtAdminHolds: true, send: (c, p, id, today) => h.terminate(c, p, id, { reason_code: 'inactive', ended_on: today }) },
  ];

  async function setupAt(start: 'active' | 'suspended') {
    const s = await setup();
    if (start === 'suspended') expect((await h.suspend(s.admin.client, s.p, s.id, { reason_code: 'under_review' })).statusCode).toBe(200);
    return s;
  }

  /** A denial: the status, and the worker's stream and lifecycle lines exactly as they were (counted BEFORE `send` runs). */
  async function expectDenied(send: () => Promise<{ statusCode: number; body: string }>, p: string, id: string, status: number): Promise<void> {
    const before = { events: (await events(id)).length, lines: (await lines(p, id)).length };
    const r = await send();
    expect(r.statusCode, r.body).toBe(status);
    expect((await events(id)).length).toBe(before.events);
    expect((await lines(p, id)).length).toBe(before.lines);
  }

  it.each(ACT_ROUTES)(
    'denial, $name: no session ⇒ 401; no grant in this Pariwar (another Pariwar’s admin) ⇒ 404; a role without the key ⇒ 403; a District Admin of another district ⇒ 403; another Pariwar’s worker id ⇒ the unknown-worker 403 — each with NO event and NO line',
    async (route) => {
      const { p, admin, id } = await setupAt(route.start);
      const today = await istToday(); // after the registration: a day read first could fall before it across midnight IST
      await expectDenied(() => route.send(makeClient(h.app), p, id, today), p, id, 401);
      const stranger = await h.actor(h.freshPariwar(), 'pariwar_admin', 'pariwar', randomUUID());
      await expectDenied(() => route.send(stranger.client, p, id, today), p, id, 404);
      const helpline = await h.actor(p, 'helpline_operator', 'pariwar', p);
      await expectDenied(() => route.send(helpline.client, p, id, today), p, id, 403);
      const gaya = await h.actor(p, 'district_admin', 'district', 'Gaya');
      await expectDenied(() => route.send(gaya.client, p, id, today), p, id, 403);
      if (!route.districtAdminHolds) {
        const patna = await h.actor(p, 'district_admin', 'district', 'Patna');
        await expectDenied(() => route.send(patna.client, p, id, today), p, id, 403);
      }
      // Another Pariwar's worker id under THIS Pariwar's path: the same 403 as an id nobody holds, and the other Pariwar's stream untouched.
      const other = await setupAt(route.start);
      const foreign = await route.send(admin.client, p, other.id, today);
      const unknown = await route.send(admin.client, p, randomUUID(), today);
      expect(foreign.statusCode, foreign.body).toBe(403);
      expect(unknown.statusCode, unknown.body).toBe(403);
      expect(errOf(foreign).code).toBe(errOf(unknown).code);
      await expectDenied(() => route.send(admin.client, p, other.id, today), other.p, other.id, 403);
      // CONTROL - the same act by the right officer is not refused for being in the wrong place.
      expect((await route.send(admin.client, p, id, today)).statusCode).toBe(200);
    },
  );

  it.each(ACT_ROUTES)(
    'holders, $name: a Pariwar Admin and a super_admin (derived) ⇒ 200, and a District Admin of the worker’s own district too where the bundle has the key — the event records WHICH role acted',
    async (route) => {
      const roles: [string, (p: string) => Promise<{ client: Client }>][] = [
        ['pariwar_admin', (p) => h.actor(p, 'pariwar_admin', 'pariwar', p, 'Holder Pariwar-Admin')],
        ['super_admin', (p) => h.actor(p, 'super_admin', 'global', null)],
        ...(route.districtAdminHolds ? ([['district_admin', (p: string) => h.actor(p, 'district_admin', 'district', 'Patna', 'Holder District-Admin')]] as [string, (p: string) => Promise<{ client: Client }>][]) : []),
      ];
      for (const [role, make] of roles) {
        const { p, id } = await setupAt(route.start);
        const today = await istToday(); // after THIS worker's registration (midnight IST)
        const r = await route.send((await make(p)).client, p, id, today);
        expect(r.statusCode, `${route.name} by ${role}: ${r.body}`).toBe(200);
        expect(((await events(id)).at(-1)!.payload['authorization'] as Json)['role'], `${route.name} by ${role}`).toBe(role);
      }
    },
  );

  // ── Idempotency (13.1a TR6) ──

  it('the same Idempotency-Key replays the recorded 200 (ONE event, ONE line); the same key on ANOTHER worker is a different namespace', async () => {
    const { p, admin, id } = await setup();
    const key = randomUUID();
    const first = await h.suspend(admin.client, p, id, { reason_code: 'under_review' }, key);
    const replay = await h.suspend(admin.client, p, id, { reason_code: 'under_review' }, key);
    expect(first.statusCode).toBe(200);
    expect(replay.statusCode).toBe(200);
    expect(json(replay)).toEqual(json(first));
    expect((await lines(p, id)).map((l) => l.action)).toEqual(['field_worker.suspended']);
    expect((await events(id)).filter((e) => e.event_type === 'field_worker.suspended')).toHaveLength(1);
    // Another worker in the same Pariwar, the same key: its own act, ⛔ the first one's 200.
    const other = await h.registered(admin.client, p, { name: NAME, mobile: '+919876509999', district: 'Patna' });
    expect((await h.approve(admin.client, p, other)).statusCode).toBe(200);
    const second = await h.suspend(admin.client, p, other, { reason_code: 'under_review' }, key);
    expect(second.statusCode).toBe(200);
    expect(json(second)['field_worker_id']).toBe(other);
    expect((await row(other)).current_state).toBe('suspended');
    // No key ⇒ 400.
    await expectRefused(() => h.reactivate(admin.client, p, id, null), p, id, 400, 'field_worker.idempotency_key_required');
  });
});

// Story 13.1f — the appeal record against the live DB (AC5, AC6, AC7's legacy leg, AC16, AC17's domain legs; AD7–AD9, AD17; decision
// `2026-11-16-464`, the Panel's `2026-11-17-465`). Per-test ROLLBACK, as twt_app under a FRESH Pariwar's scope (RLS live); the table's
// backstops (AC16) run as the OWNER below the projector. Every refusal: its typed error AND a control. The races (two connections) are
// the API's race spec; the HTTP gate, the 403s and the audit lines are the API's specs.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { allowFieldWorkerEndingAppeal, terminateFieldWorker, undoFieldWorkerEnding } from '../../../src/field-worker/commands.js';
import {
  FIELD_WORKER_APPEALS_PER_ENDING,
  lodgeFieldWorkerEndingAppeal,
  refuseFieldWorkerEndingAppeal,
  withdrawFieldWorkerEndingAppeal,
} from '../../../src/field-worker/ending-appeal-commands.js';
import { projectEndingAppealLodged } from '../../../src/field-worker/ending-appeal-project.js';
import { listFieldWorkerEndingAppealsOf, pageFieldWorkerEndingAppeals } from '../../../src/field-worker/ending-appeal-read.js';
import {
  FieldWorkerAppealAlreadyDecidedError,
  FieldWorkerAppealDateInvalidError,
  FieldWorkerAppealDeciderIsEnderError,
  FieldWorkerAppealMissingError,
  FieldWorkerAppealNotOpenError,
  FieldWorkerAppealOpenError,
  FieldWorkerAppealWrongHearerError,
  FieldWorkerEndingChangedError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerNumberRegisteredAgainError,
  FieldWorkerProjectorInputError,
} from '../../../src/field-worker/errors.js';
import { FieldWorkerTerminatedPayloadSchema } from '../../../src/field-worker/events.js';
import { getCurrentFieldWorkerEnding, pageAppealEligibleFieldWorkers } from '../../../src/field-worker/read.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  fieldWorkerEndingAppealId as toAppealId,
  pariwarId as toPariwarId,
  type FieldWorkerEndingAppealId,
  type FieldWorkerId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedRoleGrant, seedUser } from '../_helpers.js';
import { GUARD_OFF, GUARD_ON, actAuthorization, caught, expectRowMatchesStream, grantAuthorization, pgErrorOf, registerReal, streamTypes } from './_fixtures.js';

interface Cast {
  P: PariwarId;
  daPatna: string;
  pa: string;
  pa2: string;
  tp: string;
  tp2: string;
  dual: string;
  sa: string;
}

async function seedCast(): Promise<Cast> {
  const { tx } = getTx();
  const P = toPariwarId(randomUUID());
  const daPatna = await seedRoleGrant(tx, P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' });
  const pa = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  const pa2 = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  const tp = await seedRoleGrant(tx, P, { role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P });
  const tp2 = await seedRoleGrant(tx, P, { role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P });
  // The dual-role officer: a Pariwar Admin who also sits as the Panel (AC5 (h), AC6 (d)).
  const dual = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  await seedRoleGrant(tx, P, { userId: dual, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P });
  const sa = await seedUser(tx);
  return { P, daPatna, pa, pa2, tp, tp2, dual, sa };
}

type Grant = Parameters<typeof grantAuthorization>[1];
const PA: Grant = { role: 'pariwar_admin' };
const TP: Grant = { role: 'trustee_panel' };
const SA: Grant = { role: 'super_admin' };
const auth = (key: string, grant: Grant, P: string, actorId: string, district = 'Patna') => {
  const a = grantAuthorization(key, grant, P, district, actorId);
  if (a === null) throw new Error(`the real check refused ${key} for ${grant.role}`);
  return a;
};
const PANEL_KEY = 'field_worker.hear_ending_appeal_as_panel';
const PA_KEY = 'field_worker.hear_ending_appeal';
const base = (P: PariwarId, actorId: string, actor: 'operator' | 'trustee') => ({ pariwarId: P, auditId: randomUUID(), actor, actorId });

async function istDay(c: pg.PoolClient, offsetDays = 0): Promise<string> {
  return (await c.query<{ d: string }>(`SELECT (((now() AT TIME ZONE 'Asia/Kolkata')::date) + $1::int)::text AS d`, [offsetDays])).rows[0]!.d;
}
async function workerRow(c: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (await c.query('SELECT current_state, state_event_version, ended_on::text AS ended_on FROM field_workers WHERE field_worker_id = $1', [id])).rows[0] as Record<string, unknown>;
}
async function appealRow(c: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (
    await c.query(
      `SELECT state, heard_by, ending_event_version, received_on::text AS received_on, received_via, lodged_by_user_id, ended_by_user_id,
              decided_by_user_id, decided_on::text AS decided_on, audit_id FROM field_worker_ending_appeals WHERE appeal_id = $1`,
      [id],
    )
  ).rows[0] as Record<string, unknown>;
}
async function payloadsOf(c: pg.PoolClient, id: string): Promise<Array<{ type: string; payload: Record<string, unknown>; actor_id: string }>> {
  return (
    await c.query<{ type: string; payload: Record<string, unknown>; actor_id: string }>(
      'SELECT event_type AS type, payload, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version',
      [id],
    )
  ).rows;
}

describe.skipIf(!hasDatabase)('Story 13.1f — the appeal record (live DB)', () => {
  setupLiveDb();
  let cast: Cast;
  let c: pg.PoolClient;
  let worker: FieldWorkerId;

  beforeEach(async () => {
    cast = await seedCast();
    c = getTx().client;
    await enterAppScope(c, cast.P);
    worker = await registerReal(c, cast.P, { district: 'Patna' });
  });

  /** End `worker` by `by`, the hearer as the terminate route would fix it (AD8). */
  async function end(by: string, heardBy: 'pariwar_admin' | 'trustee_panel', id: FieldWorkerId = worker): Promise<number> {
    await terminateFieldWorker(c, {
      ...base(cast.P, by, 'operator'),
      fieldWorkerId: id,
      reasonCode: 'inactive',
      endedOn: await istDay(c),
      authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', by),
      appealHeardBy: heardBy,
    });
    return Number((await workerRow(c, id)).state_event_version);
  }
  const panelEnding = () => end(cast.pa, 'trustee_panel');
  const paEnding = () => end(cast.daPatna, 'pariwar_admin');

  type LodgeOverrides = Partial<Parameters<typeof lodgeFieldWorkerEndingAppeal>[1]>;
  async function lodge(v: number, as: 'panel' | 'pa' | 'sa', o: LodgeOverrides = {}): Promise<FieldWorkerEndingAppealId> {
    const appealId = toAppealId(randomUUID());
    const by = as === 'panel' ? cast.tp : as === 'pa' ? cast.pa2 : cast.sa;
    const authorization =
      as === 'panel' ? auth(PANEL_KEY, TP, cast.P, by) : as === 'pa' ? auth(PA_KEY, PA, cast.P, by) : auth(PANEL_KEY, SA, cast.P, by);
    await lodgeFieldWorkerEndingAppeal(c, {
      ...base(cast.P, by, as === 'pa' ? 'operator' : 'trustee'),
      fieldWorkerId: worker,
      appealId,
      expectedEndingVersion: v,
      receivedOn: await istDay(c),
      receivedVia: 'phone',
      authorization,
      ...o,
    });
    return appealId;
  }
  async function decision(appealId: FieldWorkerEndingAppealId, as: 'panel' | 'pa' | 'sa-panel' | 'sa-pa', by?: string, decidedOn?: string) {
    const who = by ?? (as === 'panel' ? cast.tp2 : as === 'pa' ? cast.pa2 : cast.sa);
    const authorization =
      as === 'panel'
        ? auth(PANEL_KEY, TP, cast.P, who)
        : as === 'pa'
          ? auth(PA_KEY, PA, cast.P, who)
          : as === 'sa-panel'
            ? auth(PANEL_KEY, SA, cast.P, who)
            : auth(PA_KEY, SA, cast.P, who);
    return {
      ...base(cast.P, who, as === 'pa' || as === 'sa-pa' ? ('operator' as const) : ('trustee' as const)),
      appealId,
      decidedOn: decidedOn ?? (await istDay(c)),
      authorization,
    };
  }

  describe('AC5 — lodging', () => {
    it('a Panel-heard ending: the trustee lodges under `_as_panel`; one `lodged` event signed with that key, actor trustee; heard_by, the ending and the ender copied', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      expect(await appealRow(c, appealId)).toMatchObject({
        state: 'open',
        heard_by: 'trustee_panel',
        ending_event_version: String(v),
        received_via: 'phone',
        lodged_by_user_id: cast.tp,
        ended_by_user_id: cast.pa,
        decided_by_user_id: null,
        decided_on: null,
      });
      const [ev] = await payloadsOf(c, appealId);
      expect(ev!.type).toBe('field_worker_ending_appeal.lodged');
      expect(ev!.payload).toMatchObject({ actor: 'trustee', heard_by: 'trustee_panel', ending_event_version: v });
      expect((ev!.payload['authorization'] as { permission_key: string }).permission_key).toBe(PANEL_KEY);
      expect(ev!.actor_id).toBe(cast.tp);
      expect(JSON.stringify(ev!.payload)).not.toMatch(/name|mobile|code/); // I6 — no name, mobile or code in the payload
    });

    it('(a) a District Admin’s ending is heard by the Pariwar Admin: an `_as_panel` lodge → WrongHearer; CONTROL: the Pariwar Admin’s key lodges', async () => {
      const v = await paEnding();
      expect(await caught(() => lodge(v, 'panel'))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      const id = await lodge(v, 'pa');
      expect((await appealRow(c, id)).heard_by).toBe('pariwar_admin');
    });

    it('(b) a Pariwar Admin’s ending is heard by the Panel: the Pariwar Admin’s key → WrongHearer; a super admin’s `_as_panel` (a global grant) → WrongHearer; CONTROL: a trustee lodges', async () => {
      const v = await panelEnding();
      expect(await caught(() => lodge(v, 'pa'))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      expect(await caught(() => lodge(v, 'sa'))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      await lodge(v, 'panel');
    });

    it('(c) a second appeal while one is open → AppealOpen; the partial unique’s 23505 BY NAME is the backstop — a row planted through the projector, without the worker lock', async () => {
      const v = await panelEnding();
      const first = await lodge(v, 'panel');
      expect(await caught(() => lodge(v, 'panel'))).toBeInstanceOf(FieldWorkerAppealOpenError);
      const [ev] = await payloadsOf(c, first);
      expect(
        await caught(() =>
          projectEndingAppealLodged(c, { pariwarId: cast.P, appealId: toAppealId(randomUUID()), payload: ev!.payload, actorId: cast.tp, endedByUserId: cast.pa, auditId: randomUUID() }),
        ),
      ).toBeInstanceOf(FieldWorkerAppealOpenError);
      expect((await c.query('SELECT count(*)::int AS n FROM field_worker_ending_appeals WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ n: 1 });
    });

    it(`(d) one appeal per ending (${String(FIELD_WORKER_APPEALS_PER_ENDING)}): after a REFUSED one → AlreadyDecided; after a WITHDRAWN one → lodged; after an ALLOWED one → IllegalTransition`, async () => {
      const v = await panelEnding();
      const w = await lodge(v, 'panel');
      await withdrawFieldWorkerEndingAppeal(c, await decision(w, 'panel'));
      const r = await lodge(v, 'panel'); // a withdrawn one counts for nothing
      await refuseFieldWorkerEndingAppeal(c, await decision(r, 'panel'));
      expect(await caught(() => lodge(v, 'panel'))).toBeInstanceOf(FieldWorkerAppealAlreadyDecidedError);
      // allowed: a fresh worker
      worker = await registerReal(c, cast.P, { district: 'Patna' });
      const v2 = await panelEnding();
      const a = await lodge(v2, 'panel');
      await allowFieldWorkerEndingAppeal(c, await decision(a, 'panel'));
      expect(await caught(() => lodge(v2, 'panel'))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
    });

    it('(e) received_on after today or before the registration day (IST, from the DB) → AppealDateInvalid; malformed → AppealDateInvalid; CONTROL: today lodges', async () => {
      const v = await panelEnding();
      expect(await caught(() => lodge(v, 'panel', { receivedOn: '' }))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
      expect(await caught(() => lodge(v, 'panel', { receivedOn: '2026-02-30' }))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
      expect(await caught(async () => lodge(v, 'panel', { receivedOn: await istDay(c, 1) }))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
      expect(await caught(async () => lodge(v, 'panel', { receivedOn: await istDay(c, -1) }))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
      await lodge(v, 'panel');
    });

    it('(f) a worker who is not terminated → IllegalTransition, for either key; a stale version → EndingChanged; a channel outside the two → refused', async () => {
      expect(await caught(() => lodge(2, 'panel'))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
      expect(await caught(() => lodge(2, 'pa'))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
      const v = await panelEnding();
      expect(await caught(() => lodge(v + 1, 'panel'))).toBeInstanceOf(FieldWorkerEndingChangedError);
      expect(await caught(() => lodge(v, 'panel', { receivedVia: 'email' }))).toBeInstanceOf(FieldWorkerProjectorInputError);
      await lodge(v, 'panel'); // CONTROL
    });

    it('(h) the ender MAY lodge: the dual-role officer ends (heard by the Panel) and lodges as the Panel — lodged_by = ended_by = the ender', async () => {
      const v = await end(cast.dual, 'trustee_panel');
      const appealId = toAppealId(randomUUID());
      await lodgeFieldWorkerEndingAppeal(c, {
        ...base(cast.P, cast.dual, 'trustee'),
        fieldWorkerId: worker,
        appealId,
        expectedEndingVersion: v,
        receivedOn: await istDay(c),
        receivedVia: 'in_person',
        authorization: auth(PANEL_KEY, TP, cast.P, cast.dual),
      });
      expect(await appealRow(c, appealId)).toMatchObject({ lodged_by_user_id: cast.dual, ended_by_user_id: cast.dual });
    });

    it('(j) the IN-LOCK hearer, not a caller’s: the command takes no heardBy — an `_as_panel` authorization on a Pariwar-Admin-heard ending → WrongHearer; CONTROL: `hear_ending_appeal` lodges', async () => {
      const v = await paEnding();
      expect(await caught(() => lodge(v, 'panel'))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      await lodge(v, 'pa');
    });

    it('AC17: a non-human actor, a literal (unverified) authorization, a wrong key, the wrong actor kind → refused before any SQL', async () => {
      const v = await panelEnding();
      expect(await caught(() => lodge(v, 'panel', { actor: 'system' as 'trustee' }))).toBeInstanceOf(FieldWorkerProjectorInputError);
      const literal = { ...auth(PANEL_KEY, TP, cast.P, cast.tp) };
      expect(await caught(() => lodge(v, 'panel', { authorization: literal }))).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(await caught(() => lodge(v, 'panel', { authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.tp) }))).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
      expect(await caught(() => lodge(v, 'panel', { actor: 'operator' }))).toBeInstanceOf(FieldWorkerProjectorInputError); // `_as_panel` with operator
      expect(await caught(() => lodge(v, 'pa', { actor: 'trustee' }))).toBeInstanceOf(FieldWorkerProjectorInputError); // trustee with the PA key
      expect((await c.query('SELECT count(*)::int AS n FROM field_worker_ending_appeals WHERE field_worker_id = $1', [worker])).rows[0]).toEqual({ n: 0 });
      await lodge(v, 'panel'); // CONTROL
    });
  });

  describe('AC6 — deciding and withdrawing', () => {
    it('(a) ALLOWED: one transaction — ending_undone (appeal_allowed, the appeal id, the hear key, actor trustee) and `allowed`, both carrying ONE audit id; the worker restored; row = fold', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      const d = await decision(appealId, 'panel');
      const r = await allowFieldWorkerEndingAppeal(c, d);
      expect(r.worker).toMatchObject({ state: 'pending_kyc', reasonCode: null, endedOn: null, fieldWorkerId: worker });
      expect(await appealRow(c, appealId)).toMatchObject({ state: 'allowed', decided_by_user_id: cast.tp2, audit_id: d.auditId });
      const undone = (await payloadsOf(c, worker)).at(-1)!;
      expect(undone.type).toBe('field_worker.ending_undone');
      expect(undone.payload).toMatchObject({ cause: 'appeal_allowed', appeal_id: appealId, actor: 'trustee' });
      expect((undone.payload['authorization'] as { permission_key: string }).permission_key).toBe(PANEL_KEY);
      const audits = (await c.query<{ audit_id: string }>("SELECT audit_id FROM field_workers WHERE field_worker_id = $1", [worker])).rows[0]!.audit_id;
      expect(audits).toBe(d.auditId);
      await expectRowMatchesStream(c, worker);
    });

    it('(b) the number is live again: the allowed decision → NumberRegisteredAgain and the appeal stays OPEN; CONTROL: that registration ended, the same decision succeeds', async () => {
      const index = `idx-${randomUUID()}`;
      worker = await registerReal(c, cast.P, { district: 'Patna', mobileBlindIndex: index });
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      const newer = await registerReal(c, cast.P, { district: 'Patna', mobileBlindIndex: index });
      await c.query('SAVEPOINT s');
      expect(await caught(async () => allowFieldWorkerEndingAppeal(c, await decision(appealId, 'panel')))).toBeInstanceOf(FieldWorkerNumberRegisteredAgainError);
      await c.query('ROLLBACK TO SAVEPOINT s');
      expect((await appealRow(c, appealId)).state).toBe('open');
      await end(cast.pa, 'trustee_panel', newer);
      await allowFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
      expect((await appealRow(c, appealId)).state).toBe('allowed');
    });

    it('(c) REFUSED: the worker stays ended; decided_on and the decider recorded; (e) a closed appeal → NotOpen', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      await refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
      expect(await appealRow(c, appealId)).toMatchObject({ state: 'refused', decided_by_user_id: cast.tp2, decided_on: await istDay(c) });
      expect((await workerRow(c, worker)).current_state).toBe('terminated');
      expect(await caught(async () => refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'panel')))).toBeInstanceOf(FieldWorkerAppealNotOpenError);
      expect(await caught(async () => allowFieldWorkerEndingAppeal(c, await decision(appealId, 'panel')))).toBeInstanceOf(FieldWorkerAppealNotOpenError);
      expect(await caught(async () => withdrawFieldWorkerEndingAppeal(c, await decision(appealId, 'panel')))).toBeInstanceOf(FieldWorkerAppealNotOpenError);
    });

    it('(d) / (j) the ENDER never decides or withdraws: the dual-role officer ended (heard by the Panel) → DeciderIsEnder on allow, refuse and withdraw; the appeal stays open; CONTROL: another trustee decides', async () => {
      const v = await end(cast.dual, 'trustee_panel');
      const appealId = await lodge(v, 'panel');
      for (const act of [allowFieldWorkerEndingAppeal, refuseFieldWorkerEndingAppeal, withdrawFieldWorkerEndingAppeal]) {
        expect(await caught(async () => act(c, await decision(appealId, 'panel', cast.dual)))).toBeInstanceOf(FieldWorkerAppealDeciderIsEnderError);
      }
      expect((await appealRow(c, appealId)).state).toBe('open');
      await refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
    });

    it('(f) WITHDRAWN: closed, decided_on recorded; a new appeal may be lodged', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      await withdrawFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
      expect((await appealRow(c, appealId)).state).toBe('withdrawn');
      await lodge(v, 'panel');
    });

    it('(g) decided_on after today, or before received_on, or malformed → AppealDateInvalid; CONTROL: today decides', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      for (const d of [await istDay(c, 1), await istDay(c, -1), 'x']) {
        expect(await caught(async () => refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'panel', undefined, d)))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
      }
      await refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
    });

    it('(h) wrong hearers: the Pariwar Admin’s key on a Panel-heard appeal → WrongHearer; a super admin’s `_as_panel` → WrongHearer; a super admin on a Pariwar-Admin-heard appeal → allowed (note Q4 (c) — `-465` A)', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      expect(await caught(async () => refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'pa')))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      expect(await caught(async () => refuseFieldWorkerEndingAppeal(c, await decision(appealId, 'sa-panel')))).toBeInstanceOf(FieldWorkerAppealWrongHearerError);
      worker = await registerReal(c, cast.P, { district: 'Patna' });
      const v2 = await paEnding();
      const paHeard = await lodge(v2, 'pa');
      await allowFieldWorkerEndingAppeal(c, await decision(paHeard, 'sa-pa'));
      expect((await appealRow(c, paHeard)).state).toBe('allowed');
      expect((await payloadsOf(c, worker)).at(-1)!.payload).toMatchObject({ actor: 'operator', cause: 'appeal_allowed' });
    });

    it('(l) another Pariwar’s appeal id, and an unknown one → AppealMissing', async () => {
      const v = await panelEnding();
      const appealId = await lodge(v, 'panel');
      expect(await caught(async () => refuseFieldWorkerEndingAppeal(c, await decision(toAppealId(randomUUID()), 'panel')))).toBeInstanceOf(FieldWorkerAppealMissingError);
      const other = toPariwarId(randomUUID());
      await c.query('RESET ROLE');
      const otherTp = await seedRoleGrant(getTx().tx, other, { role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: other });
      await enterAppScope(c, other);
      expect(
        await caught(async () =>
          refuseFieldWorkerEndingAppeal(c, { ...base(other, otherTp, 'trustee'), appealId, decidedOn: await istDay(c), authorization: auth(PANEL_KEY, TP, other, otherTp) }),
        ),
      ).toBeInstanceOf(FieldWorkerAppealMissingError);
    });
  });

  describe('AC7 — a legacy terminated event without appeal_heard_by', () => {
    it('planted by raw SQL as the OWNER: it PARSES with the terminated schema, is read as trustee_panel (AD17), and the Panel lodges', async () => {
      // A real terminate's authorization, minus the hearer — taken from a real ending on a scratch worker, rolled back.
      await enterAppScope(c, cast.P);
      await c.query('SAVEPOINT real');
      await end(cast.pa, 'trustee_panel');
      const real = (await payloadsOf(c, worker)).at(-1)!.payload;
      await c.query('ROLLBACK TO SAVEPOINT real');
      await c.query('RESET ROLE');
      const legacy: Record<string, unknown> = { ...real };
      delete legacy['appeal_heard_by'];
      expect(FieldWorkerTerminatedPayloadSchema.safeParse(legacy).success).toBe(true);
      await c.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id) VALUES ($1, 'field_worker.terminated', $2, 2, $3, $4)`,
        [worker, JSON.stringify(legacy), cast.pa, cast.P],
      );
      await c.query(GUARD_ON);
      await c.query("UPDATE field_workers SET current_state = 'terminated', state_reason_code = 'inactive', ended_on = $2::date, state_event_version = 2 WHERE field_worker_id = $1", [
        worker,
        legacy['ended_on'],
      ]);
      await c.query(GUARD_OFF);
      await enterAppScope(c, cast.P);
      expect(await getCurrentFieldWorkerEnding(bindScopedDb(c), cast.P, worker)).toMatchObject({ heardBy: 'trustee_panel', endedByUserId: cast.pa, endingVersion: 2 });
      const appealId = await lodge(2, 'panel');
      expect((await appealRow(c, appealId)).heard_by).toBe('trustee_panel');
    });

    it('terminateFieldWorker without appealHeardBy is refused (the command requires it; the schema keeps it optional)', async () => {
      expect(
        await caught(async () =>
          terminateFieldWorker(c, {
            ...base(cast.P, cast.pa, 'operator'),
            fieldWorkerId: worker,
            reasonCode: 'inactive',
            endedOn: await istDay(c),
            authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa),
          } as Parameters<typeof terminateFieldWorker>[1]),
        ),
      ).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered']);
    });
  });

  describe('AC15 (domain) — the reads', () => {
    it('the list and the per-worker read honour the heardBy filter uniformly; the eligible list: only a terminated worker whose CURRENT ending has no open or refused appeal, of a hearer given', async () => {
      const v = await panelEnding();
      const db = bindScopedDb(c);
      let page = await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: ['trustee_panel'] });
      expect(page.items.map((x) => x.fieldWorkerId)).toEqual([worker]);
      expect(page.items[0]).toMatchObject({ endingEventVersion: v, heardBy: 'trustee_panel', district: 'Patna' });
      expect((await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: ['pariwar_admin'] })).items).toEqual([]);
      expect((await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: [] })).items).toEqual([]);
      const appealId = await lodge(v, 'panel');
      page = await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: ['trustee_panel'] });
      expect(page.items).toEqual([]); // an open appeal: not eligible
      expect((await listFieldWorkerEndingAppealsOf(db, cast.P, worker, { heardBy: 'trustee_panel' })).map((x) => x.appealId)).toEqual([appealId]);
      expect(await listFieldWorkerEndingAppealsOf(db, cast.P, worker, { heardBy: 'pariwar_admin' })).toEqual([]);
      const list = await pageFieldWorkerEndingAppeals(db, cast.P, { heardBy: 'trustee_panel' });
      expect(list.items.map((x) => x.appealId)).toEqual([appealId]);
      expect((await pageFieldWorkerEndingAppeals(db, cast.P, { heardBy: 'pariwar_admin' })).items).toEqual([]);
      await withdrawFieldWorkerEndingAppeal(c, await decision(appealId, 'panel'));
      expect((await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: ['trustee_panel'] })).items.map((x) => x.fieldWorkerId)).toEqual([worker]);
      // An undone worker is not eligible (no current ending).
      await undoFieldWorkerEnding(c, { ...base(cast.P, cast.pa, 'operator'), fieldWorkerId: worker, expectedEndingVersion: v, authorization: actAuthorization('field_worker.undo_ending', cast.P, 'Patna', cast.pa) });
      expect((await pageAppealEligibleFieldWorkers(db, cast.P, { hearers: ['trustee_panel', 'pariwar_admin'] })).items).toEqual([]);
    });
  });

  describe('AC16 — the appeal table’s backstops (as the OWNER, below the projector)', () => {
    const WRITER_ON = "SET LOCAL app.field_worker_ending_appeal_writer = 'on'";
    const WRITER_OFF = "SET LOCAL app.field_worker_ending_appeal_writer = 'off'";
    const PREFIX = 'field_worker_ending_appeals direct write rejected';

    async function plantOpen(): Promise<string> {
      const v = await panelEnding();
      const id = await lodge(v, 'panel');
      await c.query('RESET ROLE');
      return id;
    }
    async function expectRefused(sql: string, params: unknown[], code: string, fragment: string): Promise<void> {
      const e = await pgErrorOf(async () => {
        await c.query('SAVEPOINT b');
        try {
          await c.query(sql, params);
        } finally {
          await c.query('ROLLBACK TO SAVEPOINT b');
        }
      });
      expect(e.code, sql).toBe(code);
      if (code === 'P0001') expect(e.message).toContain(PREFIX);
      expect(code === 'P0001' ? e.message : (e.constraint ?? e.message), sql).toContain(fragment);
    }

    it('the guard: an unguarded INSERT / UPDATE is refused; a lodging INSERT must be open / version 1 / no decision; open -> open is refused; each FINAL state is frozen; the version strictly increases', async () => {
      const id = await plantOpen();
      await expectRefused("UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = received_on, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1", [id], 'P0001', 'only the appeal projector may update');
      await c.query(WRITER_ON);
      await expectRefused('UPDATE field_worker_ending_appeals SET state_event_version = 2 WHERE appeal_id = $1', [id], 'P0001', 'an open appeal only moves to');
      await expectRefused("UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = received_on, decided_by_user_id = gen_random_uuid(), state_event_version = 1 WHERE appeal_id = $1", [id], 'P0001', 'state_event_version must strictly increase');
      for (const final of ['allowed', 'refused', 'withdrawn', 'superseded']) {
        await c.query('SAVEPOINT f');
        await c.query(`UPDATE field_worker_ending_appeals SET state = '${final}', decided_on = received_on, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1`, [id]);
        await expectRefused("UPDATE field_worker_ending_appeals SET updated_at = now(), state_event_version = 3 WHERE appeal_id = $1", [id], 'P0001', 'a final appeal');
        await c.query('ROLLBACK TO SAVEPOINT f');
      }
      await c.query(WRITER_OFF);
      await expectRefused(
        `INSERT INTO field_worker_ending_appeals (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via, lodged_by_user_id, ended_by_user_id, state_event_version, audit_id)
         VALUES (gen_random_uuid(), $1, $2, 2, 'open', 'trustee_panel', current_date, 'phone', gen_random_uuid(), gen_random_uuid(), 1, gen_random_uuid())`,
        [cast.P, worker],
        'P0001',
        'only the appeal projector may create',
      );
      await c.query(WRITER_ON);
      await expectRefused(
        `INSERT INTO field_worker_ending_appeals (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via, lodged_by_user_id, ended_by_user_id, decided_by_user_id, decided_on, state_event_version, audit_id)
         VALUES (gen_random_uuid(), $1, $2, 2, 'refused', 'trustee_panel', current_date, 'phone', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), current_date, 1, gen_random_uuid())`,
        [cast.P, worker],
        'P0001',
        'a lodging INSERT must be open',
      );
    });

    it('each immutable column is refused on change (rule (b)), as the projector would write it', async () => {
      const id = await plantOpen();
      await c.query(WRITER_ON);
      for (const set of [
        'pariwar_id = gen_random_uuid()',
        'field_worker_id = gen_random_uuid()',
        'ending_event_version = 3',
        "heard_by = 'pariwar_admin'",
        'received_on = received_on - 1',
        "received_via = 'in_person'",
        'lodged_by_user_id = gen_random_uuid()',
        'ended_by_user_id = gen_random_uuid()',
      ]) {
        await expectRefused(`UPDATE field_worker_ending_appeals SET ${set}, state = 'withdrawn', decided_on = current_date + 1, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1`, [id], 'P0001', 'identity is immutable');
      }
    });

    it('the CHECKs fire 23514 BY NAME; a NULL ender or lodger fails 23502; CONTROL: a legal close passes', async () => {
      const id = await plantOpen();
      const ender = (await appealRow(c, id)).ended_by_user_id as string;
      await c.query(WRITER_ON);
      await expectRefused("UPDATE field_worker_ending_appeals SET state = 'refused', decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1", [id], '23514', 'field_worker_ending_appeals_open_decided_on');
      await expectRefused("UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = received_on, state_event_version = 2 WHERE appeal_id = $1", [id], '23514', 'field_worker_ending_appeals_open_decided_by');
      await expectRefused("UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = received_on - 1, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1", [id], '23514', 'field_worker_ending_appeals_decided_after_received');
      for (const s of ['allowed', 'refused', 'withdrawn']) {
        await expectRefused(`UPDATE field_worker_ending_appeals SET state = '${s}', decided_on = received_on, decided_by_user_id = $2, state_event_version = 2 WHERE appeal_id = $1`, [id, ender], '23514', 'field_worker_ending_appeals_decider_not_ender');
      }
      // A superseded row's decider is the undoer — it may be the ender.
      await c.query('SAVEPOINT ok');
      await c.query("UPDATE field_worker_ending_appeals SET state = 'superseded', decided_on = received_on, decided_by_user_id = $2, state_event_version = 2 WHERE appeal_id = $1", [id, ender]);
      await c.query('ROLLBACK TO SAVEPOINT ok');
      for (const col of ['ended_by_user_id', 'lodged_by_user_id']) {
        await expectRefused(
          `INSERT INTO field_worker_ending_appeals (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via, lodged_by_user_id, ended_by_user_id, state_event_version, audit_id)
           VALUES (gen_random_uuid(), $1, $2, 2, 'open', 'trustee_panel', current_date, 'phone', ${col === 'lodged_by_user_id' ? 'NULL' : 'gen_random_uuid()'}, ${col === 'ended_by_user_id' ? 'NULL' : 'gen_random_uuid()'}, 1, gen_random_uuid())`,
          [cast.P, worker],
          '23502',
          col,
        );
      }
      await c.query("UPDATE field_worker_ending_appeals SET state = 'refused', decided_on = received_on, decided_by_user_id = gen_random_uuid(), state_event_version = 2 WHERE appeal_id = $1", [id]);
    });

    it('DELETE and TRUNCATE are refused AS THE OWNER (P0001 — never as twt_app, where the missing GRANT answers 42501 first)', async () => {
      const id = await plantOpen();
      await expectRefused('DELETE FROM field_worker_ending_appeals WHERE appeal_id = $1', [id], 'P0001', 'an appeal is never deleted');
      await expectRefused('TRUNCATE field_worker_ending_appeals', [], 'P0001', 'an appeal is never deleted');
      await enterAppScope(c, cast.P);
      await expectRefused('DELETE FROM field_worker_ending_appeals WHERE appeal_id = $1', [id], '42501', 'permission denied');
    });

    it('the composite FKs: 23503 BY NAME for another Pariwar’s worker and an unknown one (the appeal), and for previous_field_worker_id', async () => {
      await plantOpen();
      const otherP = randomUUID();
      const foreign = randomUUID();
      await c.query(GUARD_ON);
      await c.query(
        `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id, registered_by_display, current_state, state_event_version, kyc_status, district, audit_id)
         VALUES ($1, $2, 'enc:v1:n', 'enc:v1:m', $3, gen_random_uuid(), 'X', 'pending_kyc', 1, 'pending', 'Patna', gen_random_uuid())`,
        [foreign, otherP, `idx-${randomUUID()}`],
      );
      await c.query(WRITER_ON);
      for (const fw of [foreign, randomUUID()]) {
        await expectRefused(
          `INSERT INTO field_worker_ending_appeals (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via, lodged_by_user_id, ended_by_user_id, state_event_version, audit_id)
           VALUES (gen_random_uuid(), $1, $2, 2, 'open', 'trustee_panel', current_date, 'phone', gen_random_uuid(), gen_random_uuid(), 1, gen_random_uuid())`,
          [cast.P, fw],
          '23503',
          'field_worker_ending_appeals_worker_fk',
        );
      }
      for (const prev of [foreign, randomUUID()]) {
        await expectRefused(
          `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id, registered_by_display, current_state, state_event_version, kyc_status, district, audit_id, previous_field_worker_id)
           VALUES (gen_random_uuid(), $1, 'enc:v1:n', 'enc:v1:m', $2, gen_random_uuid(), 'X', 'pending_kyc', 1, 'pending', 'Patna', gen_random_uuid(), $3)`,
          [cast.P, `idx-${randomUUID()}`, prev],
          '23503',
          'field_workers_previous_fk',
        );
      }
    });
  });
});

// Story 6.36c (Task 3.1, 3.4; AC2–AC4) — the staff list, the Pariwar Admin's queue and suggestion, and the MEMBER's answer,
// against live Postgres, per-test ROLLBACK, as `twt_app` in scope (the seeds as the superuser).
//   · the list: filters IN SQL (district, kind, status, q — escaped), A–Z keyset pages, ⛔ another Pariwar's rows;
//   · add: a LISTED district only (⛔ retired, ⛔ unknown), the UDISE code ⛔ held by either source, trimmed, the actor
//     in the row, `source = 'staff'`;
//   · rename / delist / relist: STAFF rows only (`import_managed`), `state_unchanged`, `not_found` for another Pariwar's;
//   · the queue: one state, one district, newest first, the same-name count (case- and space-folded, ⛔ itself, ⛔ an erased
//     name), the key set carries ⛔ member data; a STALE suggestion is listed under `pending` (`staleSuggestion`), ⛔ under
//     `suggested`; ⛔ a withdrawn / anonymized member's request (listed or counted) — code review round 2;
//   · suggest / close: every refusal; the suggestion columns; a close keeps them; a STALE suggestion is replaced in one tx, a
//     valid one stays `request_closed`; the member's history reads a stale one as pending (code review round 2);
//   · relist: the district must be LISTED (code review round 2);
//   · the answer: another member's request is the SAME 404; ⛔ `suggested` ⇒ closed; "No" NULLs and re-queues; "Yes"
//     confirms FIRST, then ONE posting naming the WORKPLACE (⛔ the request), ⛔ withdrawing this request but every other
//     open one; a stale suggestion goes back to `pending`; the start-date re-check; a `workplaceId` ⛔ the stored
//     suggestion ⇒ `suggestion_changed`, ⛔ state change (code review round 2).
// The two-connection races are `workplace-admin-concurrency.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { MemberId, PariwarId } from '../../../src/ids/index.js';
import {
  addStaffWorkplace,
  answerWorkplaceSuggestion,
  closeWorkplaceRequest,
  listWorkplaceRequestsForReview,
  listWorkplacesForAdmin,
  renameStaffWorkplace,
  setStaffWorkplaceListed,
  suggestWorkplaceForRequest,
  WorkplaceAdminRefusedError,
  WorkplaceAnswerRefusedError,
} from '../../../src/member/workplace-admin.js';
import { insertWorkplaceRequest, listMemberPostingHistory, WorkplaceCursorInvalidError } from '../../../src/member/workplace.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';
import { seedWorkplaceList, type SeededList } from './_workplace-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
const ACTOR = '0a0a0a0a-0000-4000-8000-000000000001';
const NOW = new Date();

const LIST = {
  districts: ['Gaya', 'Patna', 'Old Patna'],
  retired: ['Old Patna'],
  workplaces: [
    { name: 'GMS RAMPUR', district: 'Patna', village: 'Rampur' },
    { name: 'UPS RAMPUR TOLA', district: 'Patna' },
    { name: 'GMS GAYA', district: 'Gaya' },
    { name: 'CLOSED SCHOOL', district: 'Patna', status: 'delisted' as const },
    { name: 'DEO OFFICE PATNA', district: 'Patna', kind: 'office' as const },
    { name: '100% OFFICE', district: 'Patna', kind: 'office' as const },
  ],
};

async function refusal(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    if (err instanceof WorkplaceAdminRefusedError || err instanceof WorkplaceAnswerRefusedError) return err.code;
    throw err;
  }
  throw new Error('expected a refusal');
}

async function setup(): Promise<{ list: SeededList; p: PariwarId; client: Client }> {
  const { client } = getTx();
  const list = await seedWorkplaceList(client, LIST);
  return { list, p: toPariwarId(list.pariwarId), client };
}

/** A `pending` request of `memberId` (as the superuser — the guard creates it pending), created `agoMs` ago. */
async function rawRequest(client: Client, pariwarId: string, memberId: string, o: { typedName?: string | null; district?: string; agoMs?: number; startedOn?: string } = {}): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, typed_place, started_on, created_at)
     VALUES ($1, $2, $3, $4, $5, 'Rampur', $6, now() - make_interval(secs => $7::double precision / 1000))`,
    [id, pariwarId, memberId, o.district ?? 'Patna', o.typedName === undefined ? 'Primary School Rampur' : o.typedName, o.startedOn ?? '2020-06-01', o.agoMs ?? 0],
  );
  return id;
}

/** A posting seeded RAW with an explicit `created_at` (the writer's `now()` ties inside one transaction). */
async function rawPosting(client: Client, pariwarId: string, memberId: string, o: { workplaceId?: string | null; requestId?: string | null; district?: string; agoDays: number; startedOn?: string | null; isRetirement?: boolean }): Promise<void> {
  await client.query(
    `INSERT INTO member_postings (pariwar_id, member_id, district, workplace_id, workplace_request_id, started_on, is_retirement, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now() - make_interval(days => $8::int))`,
    [pariwarId, memberId, o.district ?? 'Patna', o.workplaceId ?? null, o.requestId ?? null, o.startedOn ?? null, o.isRetirement ?? false, o.agoDays],
  );
}

async function requestRow(client: Client, id: string) {
  const { rows } = await client.query<{ state: string; suggested_workplace_id: string | null; suggested_by_actor_id: string | null; suggested_at: Date | null; resolved_at: Date | null; district: string }>(
    `SELECT state, suggested_workplace_id, suggested_by_actor_id, suggested_at, resolved_at, district FROM workplace_requests WHERE request_id = $1`,
    [id],
  );
  return rows[0]!;
}

async function member(pariwarId: string, state: 'active' | 'withdrawn' | 'anonymized' = 'active'): Promise<MemberId> {
  return toMemberId(await seedMember(getTx().tx, pariwarId, { state }));
}

/** Store `workplace` as the request's suggestion (as the superuser — the guard's own move). */
async function storeSuggestion(client: Client, requestId: string, workplaceId: string): Promise<void> {
  await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [
    requestId,
    workplaceId,
    ACTOR,
  ]);
}

describe.skipIf(!hasDatabase)('Story 6.36c — the workplace list, the queue and the answer (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the staff list (AC2)', () => {
    it('filters IN SQL: status (default listed), district, kind, q (escaped); A–Z; ⛔ another Pariwar', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const other = await seedWorkplaceList(client, { districts: ['Patna'], workplaces: [{ name: 'GMS RAMPUR', district: 'Patna' }] });
      await enterAppScope(client, list.pariwarId);
      const names = async (o: Parameters<typeof listWorkplacesForAdmin>[1]) => (await listWorkplacesForAdmin(tx, o)).items.map((i) => i.name);
      expect(await names({ pariwarId: p })).toEqual(['100% OFFICE', 'DEO OFFICE PATNA', 'GMS GAYA', 'GMS RAMPUR', 'UPS RAMPUR TOLA']);
      expect(await names({ pariwarId: p, status: 'delisted' })).toEqual(['CLOSED SCHOOL']);
      expect(await names({ pariwarId: p, district: 'Gaya' })).toEqual(['GMS GAYA']);
      expect(await names({ pariwarId: p, kind: 'office' })).toEqual(['100% OFFICE', 'DEO OFFICE PATNA']);
      expect(await names({ pariwarId: p, q: 'rampur' })).toEqual(['GMS RAMPUR', 'UPS RAMPUR TOLA']);
      expect(await names({ pariwarId: p, q: '%' })).toEqual(['100% OFFICE']);
      // ⛔ another Pariwar's rows — by the explicit pariwar_id (RLS also refuses them).
      expect(await names({ pariwarId: toPariwarId(other.pariwarId) })).toEqual([]);
      const first = (await listWorkplacesForAdmin(tx, { pariwarId: p, q: 'GMS RAMPUR' })).items[0]!;
      expect(first).toEqual({
        workplaceId: list.ids['GMS RAMPUR'],
        kind: 'school',
        name: 'GMS RAMPUR',
        district: 'Patna',
        villageName: 'Rampur',
        blockCode: expect.stringMatching(/^[0-9]{6}$/),
        udiseSchoolCode: expect.stringMatching(/^[0-9]{11}$/),
        source: 'import',
        status: 'listed',
      });
    });

    it('keyset pages: ⛔ gap, ⛔ overlap; a forged cursor is refused', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      await enterAppScope(client, list.pariwarId);
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i += 1) {
        const page = await listWorkplacesForAdmin(tx, { pariwarId: p, limit: 2, cursor });
        seen.push(...page.items.map((x) => x.name));
        if (!page.hasMore) break;
        cursor = page.nextCursor!;
      }
      expect(seen).toEqual(['100% OFFICE', 'DEO OFFICE PATNA', 'GMS GAYA', 'GMS RAMPUR', 'UPS RAMPUR TOLA']);
      await expect(listWorkplacesForAdmin(tx, { pariwarId: p, cursor: 'nope' })).rejects.toBeInstanceOf(WorkplaceCursorInvalidError);
      await expect(listWorkplacesForAdmin(tx, { pariwarId: p, cursor: Buffer.from(JSON.stringify(['a', 'not-a-uuid'])).toString('base64url') })).rejects.toBeInstanceOf(
        WorkplaceCursorInvalidError,
      );
    });
  });

  describe('add (AC2)', () => {
    it('a LISTED district only; trimmed; source staff; the actor in the row', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      await enterAppScope(client, list.pariwarId);
      expect(await refusal(addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'office', name: 'BEO Office', district: 'Old Patna' }))).toBe('workplace.district_not_found');
      expect(await refusal(addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'office', name: 'BEO Office', district: 'Nalanda' }))).toBe('workplace.district_not_found');
      const added = await addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'office', name: '  BEO Office Danapur  ', district: 'Patna', villageName: ' Danapur ', blockCode: '102801' });
      expect(added).toMatchObject({ kind: 'office', name: 'BEO Office Danapur', district: 'Patna', villageName: 'Danapur', blockCode: '102801', udiseSchoolCode: null, source: 'staff', status: 'listed' });
      const { rows } = await client.query(`SELECT created_by_actor_id FROM workplaces WHERE workplace_id = $1`, [added.workplaceId]);
      expect(rows[0]).toEqual({ created_by_actor_id: ACTOR });
    });

    it('a school: its UDISE code ⛔ already held by the Pariwar (either source); an office never carries one', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      await enterAppScope(client, list.pariwarId);
      const imported = (await listWorkplacesForAdmin(tx, { pariwarId: p, q: 'GMS GAYA' })).items[0]!;
      expect(await refusal(addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'school', name: 'X', district: 'Patna', udiseSchoolCode: imported.udiseSchoolCode! }))).toBe('workplace.code_taken');
      const s = await addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'school', name: 'Missing School', district: 'Patna', udiseSchoolCode: '10289999999' });
      expect(s.udiseSchoolCode).toBe('10289999999');
      expect(await refusal(addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'school', name: 'Y', district: 'Gaya', udiseSchoolCode: '10289999999' }))).toBe('workplace.code_taken');
      const o = await addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'office', name: 'Z Office', district: 'Patna', udiseSchoolCode: '10288888888' });
      expect(o.udiseSchoolCode).toBeNull();
    });

    it('⛔ blank, too long or a control character — refused before any write', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      await enterAppScope(client, list.pariwarId);
      for (const name of ['   ', 'x'.repeat(201), 'Bad\u0007Name']) {
        await expect(addStaffWorkplace(tx, { pariwarId: p, actorId: ACTOR, kind: 'office', name, district: 'Patna' })).rejects.toBeInstanceOf(TypeError);
      }
    });
  });

  describe('rename / delist / relist (AC2 — STAFF rows only, RV3)', () => {
    it('a staff row: rename (trimmed), delist, relist; the same state twice ⇒ state_unchanged', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      await enterAppScope(client, list.pariwarId);
      const office = list.ids['DEO OFFICE PATNA']!;
      expect((await renameStaffWorkplace(tx, { pariwarId: p, workplaceId: office, name: ' DEO Office, Patna ' })).name).toBe('DEO Office, Patna');
      expect((await setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: office, listed: false })).status).toBe('delisted');
      expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: office, listed: false }))).toBe('workplace.state_unchanged');
      expect((await setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: office, listed: true })).status).toBe('listed');
      expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: office, listed: true }))).toBe('workplace.state_unchanged');
    });

    it('relist: the district must be LISTED, as for an add (code review round 2) — a retired spelling ⇒ district_not_found, ⛔ written', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const office = randomUUID();
      await client.query(
        `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, source, status, created_by_actor_id) VALUES ($1, $2, 'office', 'OLD OFFICE', 'Old Patna', 'staff', 'delisted', $3)`,
        [office, list.pariwarId, ACTOR],
      );
      await enterAppScope(client, list.pariwarId);
      expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: office, listed: true }))).toBe('workplace.district_not_found');
      const { rows } = await client.query(`SELECT status FROM workplaces WHERE workplace_id = $1`, [office]);
      expect(rows[0]).toEqual({ status: 'delisted' });
      // An already-listed row is still `state_unchanged`; a listed district relists (the leg above).
      expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: list.ids['DEO OFFICE PATNA']!, listed: true }))).toBe('workplace.state_unchanged');
    });

    it('an IMPORTED row ⇒ import_managed (every write); an unknown or another Pariwar’s id ⇒ not_found', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const other = await seedWorkplaceList(client, { districts: ['Patna'], workplaces: [{ name: 'THEIR OFFICE', district: 'Patna', kind: 'office' }] });
      await enterAppScope(client, list.pariwarId);
      const school = list.ids['GMS RAMPUR']!;
      expect(await refusal(renameStaffWorkplace(tx, { pariwarId: p, workplaceId: school, name: 'Renamed' }))).toBe('workplace.import_managed');
      expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: school, listed: false }))).toBe('workplace.import_managed');
      for (const id of [randomUUID(), other.ids['THEIR OFFICE']!, 'not-a-uuid']) {
        expect(await refusal(renameStaffWorkplace(tx, { pariwarId: p, workplaceId: id, name: 'X' }))).toBe('workplace.not_found');
        expect(await refusal(setStaffWorkplaceListed(tx, { pariwarId: p, workplaceId: id, listed: false }))).toBe('workplace.not_found');
      }
    });
  });

  describe('the queue (AC3)', () => {
    it('one state, one district, newest first; the same-name count is folded, ⛔ itself, ⛔ an erased name; ⛔ member data', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const [a, b, c, d] = [await member(list.pariwarId), await member(list.pariwarId), await member(list.pariwarId), await member(list.pariwarId)];
      const r1 = await rawRequest(client, list.pariwarId, a, { typedName: 'Primary School  Rampur', agoMs: 4000 });
      const r2 = await rawRequest(client, list.pariwarId, b, { typedName: ' primary school rampur ', agoMs: 3000 });
      const r3 = await rawRequest(client, list.pariwarId, c, { typedName: 'GMS Gaya Road', district: 'Gaya', agoMs: 2000 });
      const r4 = await rawRequest(client, list.pariwarId, d, { typedName: 'PRIMARY SCHOOL RAMPUR', agoMs: 1000 });
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [
        r4,
        list.ids['GMS RAMPUR'],
        ACTOR,
      ]);
      await enterAppScope(client, list.pariwarId);
      const pending = await listWorkplaceRequestsForReview(tx, { pariwarId: p });
      expect(pending.items.map((i) => i.requestId)).toEqual([r3, r2, r1]);
      // r1 / r2 count each other (r4 is ⛔ pending ⇒ ⛔ counted); r3 nothing.
      expect(pending.items.map((i) => i.sameNameCount)).toEqual([0, 1, 1]);
      expect(Object.keys(pending.items[0]!).sort()).toEqual(
        ['createdAt', 'district', 'requestId', 'sameNameCount', 'staleSuggestion', 'startedOn', 'state', 'suggested', 'typedName', 'typedPlace'].sort(),
      );
      expect(pending.items[1]).toMatchObject({ typedName: ' primary school rampur ', typedPlace: 'Rampur', district: 'Patna', startedOn: '2020-06-01', state: 'pending', suggested: null, staleSuggestion: false });
      expect((await listWorkplaceRequestsForReview(tx, { pariwarId: p, district: 'Gaya' })).items.map((i) => i.requestId)).toEqual([r3]);
      const suggested = await listWorkplaceRequestsForReview(tx, { pariwarId: p, state: 'suggested' });
      expect(suggested.items).toHaveLength(1);
      expect(suggested.items[0]).toMatchObject({ requestId: r4, state: 'suggested', sameNameCount: 2, suggested: { workplaceId: list.ids['GMS RAMPUR'], name: 'GMS RAMPUR', district: 'Patna' }, staleSuggestion: false });
      // A page of one — the µs cursor walks every row once.
      const page1 = await listWorkplaceRequestsForReview(tx, { pariwarId: p, limit: 1 });
      const page2 = await listWorkplaceRequestsForReview(tx, { pariwarId: p, limit: 1, cursor: page1.nextCursor! });
      expect([page1.items[0]!.requestId, page2.items[0]!.requestId]).toEqual([r3, r2]);
    });

    it('an erased typed name counts 0 and is counted by ⛔ one', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const [a, b] = [await member(list.pariwarId), await member(list.pariwarId)];
      const r1 = await rawRequest(client, list.pariwarId, a, { typedName: 'Same School', agoMs: 2000 });
      const r2 = await rawRequest(client, list.pariwarId, b, { typedName: 'Same School', agoMs: 1000 });
      await client.query(`UPDATE workplace_requests SET typed_name = NULL WHERE request_id = $1`, [r2]);
      await enterAppScope(client, list.pariwarId);
      const items = (await listWorkplaceRequestsForReview(tx, { pariwarId: p })).items;
      expect(items.map((i) => [i.requestId, i.sameNameCount])).toEqual([
        [r2, 0],
        [r1, 0],
      ]);
    });

    it('a STALE suggestion (delisted, moved, or its district delisted) is listed under pending — `suggested: null`, `staleSuggestion: true` — ⛔ under suggested; it counts as pending (code review round 2)', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const [a, b] = [await member(list.pariwarId), await member(list.pariwarId)];
      const stale = await rawRequest(client, list.pariwarId, a, { typedName: 'Same School', agoMs: 2000 });
      const other = await rawRequest(client, list.pariwarId, b, { typedName: 'same  school', agoMs: 1000 });
      await storeSuggestion(client, stale, list.ids['DEO OFFICE PATNA']!);
      const tabs = async () => {
        await enterAppScope(client, list.pariwarId);
        const out = {
          pending: (await listWorkplaceRequestsForReview(tx, { pariwarId: p })).items,
          suggested: (await listWorkplaceRequestsForReview(tx, { pariwarId: p, state: 'suggested' })).items,
        };
        await client.query('RESET ROLE');
        return out;
      };
      // VALID: under suggested only; ⛔ counted by the pending one.
      let t = await tabs();
      expect(t.pending.map((i) => [i.requestId, i.sameNameCount])).toEqual([[other, 0]]);
      expect(t.suggested).toEqual([expect.objectContaining({ requestId: stale, state: 'suggested', staleSuggestion: false, suggested: expect.objectContaining({ name: 'DEO OFFICE PATNA' }) })]);
      for (const [label, spoil, restore] of [
        ['delisted', `UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, `UPDATE workplaces SET status = 'listed' WHERE workplace_id = $1`],
        ['moved', `UPDATE workplaces SET district = 'Gaya' WHERE workplace_id = $1`, `UPDATE workplaces SET district = 'Patna' WHERE workplace_id = $1`],
        [
          'district delisted',
          `UPDATE workplace_districts SET status = 'retired' WHERE district = 'Patna' AND pariwar_id = (SELECT pariwar_id FROM workplaces WHERE workplace_id = $1)`,
          `UPDATE workplace_districts SET status = 'listed' WHERE district = 'Patna' AND pariwar_id = (SELECT pariwar_id FROM workplaces WHERE workplace_id = $1)`,
        ],
      ] as const) {
        await client.query(spoil, [list.ids['DEO OFFICE PATNA']]);
        t = await tabs();
        expect(t.suggested, label).toEqual([]);
        expect(t.pending.map((i) => i.requestId), label).toEqual([other, stale]);
        expect(t.pending[1], label).toMatchObject({ state: 'pending', suggested: null, staleSuggestion: true, sameNameCount: 1 });
        expect(t.pending[0], label).toMatchObject({ staleSuggestion: false, sameNameCount: 1 });
        await client.query(restore, [list.ids['DEO OFFICE PATNA']]);
      }
      // The ROW is untouched — staleness is read, ⛔ written.
      expect(await requestRow(client, stale)).toMatchObject({ state: 'suggested', suggested_workplace_id: list.ids['DEO OFFICE PATNA'] });
    });

    it('⛔ a withdrawn or anonymized member’s request — ⛔ listed, ⛔ counted; ⛔ member data in the item (code review round 2)', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const live = await member(list.pariwarId);
      const [gone, erased] = [await member(list.pariwarId, 'withdrawn'), await member(list.pariwarId, 'anonymized')];
      const r = await rawRequest(client, list.pariwarId, live, { typedName: 'Same School', agoMs: 3000 });
      const rGone = await rawRequest(client, list.pariwarId, gone, { typedName: 'Same School', agoMs: 2000 });
      const rErased = await rawRequest(client, list.pariwarId, erased, { typedName: 'Same School', agoMs: 1000 });
      const rGoneSuggested = await rawRequest(client, list.pariwarId, gone, { typedName: 'Other School', agoMs: 500 });
      await storeSuggestion(client, rGoneSuggested, list.ids['GMS RAMPUR']!);
      await enterAppScope(client, list.pariwarId);
      const pending = (await listWorkplaceRequestsForReview(tx, { pariwarId: p })).items;
      expect(pending.map((i) => [i.requestId, i.sameNameCount])).toEqual([[r, 0]]);
      expect((await listWorkplaceRequestsForReview(tx, { pariwarId: p, state: 'suggested' })).items).toEqual([]);
      expect(JSON.stringify(pending)).not.toContain(live);
      // The rows are still there — only the queue leaves them out.
      expect((await requestRow(client, rGone)).state).toBe('pending');
      expect((await requestRow(client, rErased)).state).toBe('pending');
    });
  });

  describe('suggest / close (AC3)', () => {
    it('suggest: the workplace LISTED here (⛔ delisted, ⛔ unknown, ⛔ another Pariwar’s), the request pending, the SAME district', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const other = await seedWorkplaceList(client, { districts: ['Patna'], workplaces: [{ name: 'THEIRS', district: 'Patna' }] });
      const m = await member(list.pariwarId);
      const r = await rawRequest(client, list.pariwarId, m);
      await enterAppScope(client, list.pariwarId);
      const s = (workplaceId: string, requestId = r) => suggestWorkplaceForRequest(tx, { pariwarId: p, requestId, workplaceId, actorId: ACTOR });
      for (const w of [list.ids['CLOSED SCHOOL']!, randomUUID(), other.ids['THEIRS']!, 'x']) expect(await refusal(s(w))).toBe('workplace.not_found');
      expect(await refusal(s(list.ids['GMS RAMPUR']!, randomUUID()))).toBe('workplace.request_not_found');
      expect(await refusal(s(list.ids['GMS GAYA']!))).toBe('workplace.district_mismatch');
      expect(await s(list.ids['GMS RAMPUR']!)).toEqual({ requestId: r, workplaceId: list.ids['GMS RAMPUR'], district: 'Patna' });
      const row = await requestRow(client, r);
      expect(row).toMatchObject({ state: 'suggested', suggested_workplace_id: list.ids['GMS RAMPUR'], suggested_by_actor_id: ACTOR });
      expect(row.suggested_at).not.toBeNull();
      // ⛔ A second suggestion on a suggested request whose suggestion is still VALID — W4's boundary (code review round 2
      // keeps it): it goes back through `pending` first, which only the member's "No" or a stale answer does.
      expect(await refusal(s(list.ids['UPS RAMPUR TOLA']!))).toBe('workplace.request_closed');
      expect(await requestRow(client, r)).toMatchObject({ state: 'suggested', suggested_workplace_id: list.ids['GMS RAMPUR'] });
    });

    it('a STALE suggestion is replaced in ONE call (code review round 2 — RV11 at read time): back to pending (NULLed), then the new one with ITS actor; the refusals still apply', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const m = await member(list.pariwarId);
      const r = await rawRequest(client, list.pariwarId, m);
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() - interval '1 day' WHERE request_id = $1`, [
        r,
        list.ids['DEO OFFICE PATNA'],
        '0a0a0a0a-0000-4000-8000-0000000000ee',
      ]);
      await client.query(`UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, [list.ids['DEO OFFICE PATNA']]);
      await enterAppScope(client, list.pariwarId);
      const s = (workplaceId: string) => suggestWorkplaceForRequest(tx, { pariwarId: p, requestId: r, workplaceId, actorId: ACTOR });
      // A refusal of the NEW workplace leaves the stale row as it was (⛔ a half-done replace).
      expect(await refusal(s(list.ids['GMS GAYA']!))).toBe('workplace.district_mismatch');
      expect(await refusal(s(list.ids['CLOSED SCHOOL']!))).toBe('workplace.not_found');
      expect(await requestRow(client, r)).toMatchObject({ state: 'suggested', suggested_workplace_id: list.ids['DEO OFFICE PATNA'] });
      expect(await s(list.ids['GMS RAMPUR']!)).toEqual({ requestId: r, workplaceId: list.ids['GMS RAMPUR'], district: 'Patna' });
      const row = await requestRow(client, r);
      expect(row).toMatchObject({ state: 'suggested', suggested_workplace_id: list.ids['GMS RAMPUR'], suggested_by_actor_id: ACTOR, resolved_at: null });
      expect(Date.now() - row.suggested_at!.getTime()).toBeLessThan(60 * 60 * 1000);
      // Now VALID again ⇒ a further suggestion is refused (W4).
      expect(await refusal(s(list.ids['UPS RAMPUR TOLA']!))).toBe('workplace.request_closed');
      // It reads as suggested everywhere again.
      expect((await listWorkplaceRequestsForReview(tx, { pariwarId: p, state: 'suggested' })).items.map((i) => i.requestId)).toEqual([r]);
    });

    it('the member’s history reads a STALE suggestion as pending with ⛔ suggestion; a valid one as suggested (code review round 2)', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await rawRequest(client, list.pariwarId, me);
      await rawPosting(client, list.pariwarId, me, { requestId: r, agoDays: 1, startedOn: '2020-06-01' });
      await storeSuggestion(client, r, list.ids['DEO OFFICE PATNA']!);
      const historyRequest = async () => {
        await enterAppScope(client, list.pariwarId);
        const page = await listMemberPostingHistory(tx, p, me);
        await client.query('RESET ROLE');
        return page.items[0]!.request;
      };
      expect(await historyRequest()).toMatchObject({
        requestId: r,
        state: 'suggested',
        suggested: { workplaceId: list.ids['DEO OFFICE PATNA'], name: 'DEO OFFICE PATNA', district: 'Patna' },
      });
      await client.query(`UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, [list.ids['DEO OFFICE PATNA']]);
      expect(await historyRequest()).toMatchObject({ requestId: r, state: 'pending', suggested: null, typedName: 'Primary School Rampur' });
      await client.query(`UPDATE workplaces SET status = 'listed', district = 'Gaya' WHERE workplace_id = $1`, [list.ids['DEO OFFICE PATNA']]);
      expect(await historyRequest()).toMatchObject({ state: 'pending', suggested: null });
    });

    it('close: pending or suggested ⇒ closed (the suggestion kept); a final one ⇒ request_closed; unknown ⇒ request_not_found', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const [a, b] = [await member(list.pariwarId), await member(list.pariwarId)];
      const r1 = await rawRequest(client, list.pariwarId, a);
      const r2 = await rawRequest(client, list.pariwarId, b);
      await enterAppScope(client, list.pariwarId);
      await suggestWorkplaceForRequest(tx, { pariwarId: p, requestId: r2, workplaceId: list.ids['GMS RAMPUR']!, actorId: ACTOR });
      expect(await closeWorkplaceRequest(tx, { pariwarId: p, requestId: r1 })).toEqual({ requestId: r1, district: 'Patna' });
      await closeWorkplaceRequest(tx, { pariwarId: p, requestId: r2 });
      expect(await requestRow(client, r1)).toMatchObject({ state: 'closed', suggested_workplace_id: null });
      expect(await requestRow(client, r2)).toMatchObject({ state: 'closed', suggested_workplace_id: list.ids['GMS RAMPUR'], suggested_by_actor_id: ACTOR });
      expect(await refusal(closeWorkplaceRequest(tx, { pariwarId: p, requestId: r1 }))).toBe('workplace.request_closed');
      expect(await refusal(closeWorkplaceRequest(tx, { pariwarId: p, requestId: randomUUID() }))).toBe('workplace.request_not_found');
    });
  });

  describe('the member answers (AC4)', () => {
    async function suggested(client: Client, list: SeededList, m: MemberId, workplace = 'GMS RAMPUR'): Promise<string> {
      const r = await rawRequest(client, list.pariwarId, m);
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [
        r,
        list.ids[workplace],
        ACTOR,
      ]);
      return r;
    }

    it('another member’s request and an unknown id are the SAME request_not_found; a request ⛔ suggested ⇒ request_closed', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const [me, other] = [await member(list.pariwarId), await member(list.pariwarId)];
      const theirs = await suggested(client, list, other);
      const mine = await rawRequest(client, list.pariwarId, me);
      await enterAppScope(client, list.pariwarId);
      const ans = (requestId: string, answer: 'yes' | 'no') =>
        answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId, answer, workplaceId: list.ids['GMS RAMPUR']!, now: NOW });
      for (const answer of ['yes', 'no'] as const) {
        expect(await refusal(ans(theirs, answer))).toBe('workplace.request_not_found');
        expect(await refusal(ans(randomUUID(), answer))).toBe('workplace.request_not_found');
        expect(await refusal(ans(mine, answer))).toBe('workplace.request_closed');
      }
      expect((await requestRow(client, theirs)).state).toBe('suggested');
    });

    it('"No" ⇒ pending, the suggestion NULLed; it reappears in the queue; ⛔ a posting', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await suggested(client, list, me);
      await enterAppScope(client, list.pariwarId);
      expect(await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'no', workplaceId: list.ids['GMS RAMPUR']!, now: NOW })).toEqual({ kind: 'declined' });
      expect(await requestRow(client, r)).toMatchObject({ state: 'pending', suggested_workplace_id: null, suggested_by_actor_id: null, suggested_at: null, resolved_at: null });
      expect((await listWorkplaceRequestsForReview(tx, { pariwarId: p })).items.map((i) => i.requestId)).toEqual([r]);
      const { rows } = await client.query(`SELECT 1 FROM member_postings WHERE member_id = $1`, [me]);
      expect(rows).toHaveLength(0);
    });

    it('"Yes" ⇒ confirmed FIRST, then ONE posting naming the WORKPLACE (⛔ the request) with the request’s date; ⛔ this request withdrawn, every OTHER open one is', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const older = await rawRequest(client, list.pariwarId, me, { agoMs: 5000 });
      const r = await suggested(client, list, me);
      await rawPosting(client, list.pariwarId, me, { requestId: r, agoDays: 2, startedOn: '2020-06-01' });
      await enterAppScope(client, list.pariwarId);
      const out = await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'yes', workplaceId: list.ids['GMS RAMPUR']!, now: NOW });
      expect(out).toEqual({ kind: 'confirmed', posting: { workplaceId: list.ids['GMS RAMPUR'], workplaceKind: 'school', district: 'Patna', startedOn: '2020-06-01' } });
      expect(await requestRow(client, r)).toMatchObject({ state: 'confirmed', suggested_workplace_id: list.ids['GMS RAMPUR'] });
      expect((await requestRow(client, older)).state).toBe('withdrawn');
      const { rows } = await client.query(
        `SELECT workplace_id, workplace_request_id, district, to_char(started_on, 'YYYY-MM-DD') AS started_on FROM member_postings WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [me],
      );
      expect(rows[0]).toEqual({ workplace_id: list.ids['GMS RAMPUR'], workplace_request_id: null, district: 'Patna', started_on: '2020-06-01' });
    });

    it('a STALE suggestion (the workplace delisted since) ⇒ back to pending, NULLed — ⛔ a posting', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await suggested(client, list, me, 'DEO OFFICE PATNA');
      await client.query(`UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, [list.ids['DEO OFFICE PATNA']]);
      await enterAppScope(client, list.pariwarId);
      expect(await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'yes', workplaceId: list.ids['DEO OFFICE PATNA']!, now: NOW })).toEqual({ kind: 'stale' });
      expect(await requestRow(client, r)).toMatchObject({ state: 'pending', suggested_workplace_id: null, suggested_by_actor_id: null });
      const { rows } = await client.query(`SELECT 1 FROM member_postings WHERE member_id = $1`, [me]);
      expect(rows).toHaveLength(0);
    });

    it('a STALE suggestion (the workplace moved to another district) ⇒ back to pending', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await suggested(client, list, me, 'DEO OFFICE PATNA');
      await client.query(`UPDATE workplaces SET district = 'Gaya' WHERE workplace_id = $1`, [list.ids['DEO OFFICE PATNA']]);
      await enterAppScope(client, list.pariwarId);
      expect(await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'yes', workplaceId: list.ids['DEO OFFICE PATNA']!, now: NOW })).toEqual({ kind: 'stale' });
      expect((await requestRow(client, r)).state).toBe('pending');
    });

    it('the start date re-check: a request dated before the member’s latest recorded start ⇒ start_date_invalid, ⛔ written', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await suggested(client, list, me);
      await rawPosting(client, list.pariwarId, me, { agoDays: 1, startedOn: '2024-01-01' }); // RAW — ⛔ the writer's withdraw step
      await enterAppScope(client, list.pariwarId);
      expect(await refusal(answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'yes', workplaceId: list.ids['GMS RAMPUR']!, now: NOW }))).toBe(
        'workplace.start_date_invalid',
      );
    });

    it('a request created through 6.36a’s writer can be suggested and confirmed end to end', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      await enterAppScope(client, list.pariwarId);
      const req = await insertWorkplaceRequest(tx, { pariwarId: p, memberId: me, district: 'Patna', typedName: 'Rampur Middle School', startedOn: '2019-04-01' });
      await suggestWorkplaceForRequest(tx, { pariwarId: p, requestId: req.requestId, workplaceId: list.ids['UPS RAMPUR TOLA']!, actorId: ACTOR });
      const out = await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: req.requestId, answer: 'yes', workplaceId: list.ids['UPS RAMPUR TOLA']!, now: NOW });
      expect(out.kind).toBe('confirmed');
      // A confirmed request is FINAL — a second answer ⇒ request_closed.
      expect(
        await refusal(answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: req.requestId, answer: 'no', workplaceId: list.ids['UPS RAMPUR TOLA']!, now: NOW })),
      ).toBe('workplace.request_closed');
    });

    it('the answer names the workplace the member was SHOWN (code review round 2): another id ⇒ suggestion_changed, for "Yes" AND "No" — ⛔ state change, ⛔ a posting', async () => {
      const { client, tx } = getTx();
      const { list, p } = await setup();
      const me = await member(list.pariwarId);
      const r = await suggested(client, list, me, 'UPS RAMPUR TOLA');
      await enterAppScope(client, list.pariwarId);
      const before = await requestRow(client, r);
      for (const answer of ['yes', 'no'] as const) {
        for (const workplaceId of [list.ids['GMS RAMPUR']!, randomUUID()]) {
          expect(await refusal(answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer, workplaceId, now: NOW })), `${answer} ${workplaceId}`).toBe(
            'workplace.suggestion_changed',
          );
        }
      }
      expect(await requestRow(client, r)).toEqual(before);
      const { rows } = await client.query(`SELECT 1 FROM member_postings WHERE member_id = $1`, [me]);
      expect(rows).toHaveLength(0);
      // The SHOWN id in upper case is the same workplace (the wire accepts either case).
      const out = await answerWorkplaceSuggestion(tx, { pariwarId: p, memberId: me, requestId: r, answer: 'yes', workplaceId: list.ids['UPS RAMPUR TOLA']!.toUpperCase(), now: NOW });
      expect(out.kind).toBe('confirmed');
    });
  });
});

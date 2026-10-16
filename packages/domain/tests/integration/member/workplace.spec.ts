// Story 6.36a (Task 2; AC3, AC3b, AC4, AC7, AC9) — the workplace module against live Postgres, per-test ROLLBACK, as
// `twt_app` in scope.
//   · the reads: the LISTED districts (a retired spelling ⛔ never; empty with ⛔ no import); the search — case-insensitive,
//     by name OR village, `%` / `_` / `\` literal, ⛔ delisted, ⛔ another kind / district / Pariwar, keyset pages with ⛔ gap
//     or overlap; the locks (a retired district ⇒ ⛔ workplace);
//   · the writer: `insertWorkplaceRequest` refuses a phone number in any script; `insertMemberPosting` writes the three new
//     columns and ENDS the member's older open request — ⛔ its own, ⛔ `exceptRequestId`, ⛔ a final one, ⛔ another
//     member's;
//   · the history: newest first, the workplace (even delisted) and the request (its suggestion while `suggested`), a µs-exact
//     cursor; `latestPostingStartedOn` skips legacy rows;
//   · ⭐ AC9 on REAL rows: `anonymizeMember` NULLs the typed text in every state, closes an open request, and survives a
//     second run (the guard refuses a no-op write — the WHERE must skip it); the export lists postings + requests.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { assembleMemberExport } from '../../../src/data-export/index.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../../../src/encryption/kms-provider.js';
import { memberId as toMemberId, pariwarId as toPariwarId, workplaceId as toWorkplaceId } from '../../../src/ids/index.js';
import { anonymizeMember } from '../../../src/member/anonymize.js';
import { insertMemberPosting } from '../../../src/member/posting.js';
import {
  getListedWorkplace,
  insertWorkplaceRequest,
  latestPostingStartedOn,
  listMemberPostingHistory,
  listWorkplaceDistricts,
  lockListedDistrict,
  lockListedWorkplace,
  pariwarHasWorkplaceList,
  searchWorkplaces,
  WorkplaceCursorInvalidError,
  WorkplaceWriteRefusedError,
} from '../../../src/member/workplace.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';
import { seedWorkplaceList, type SeededList } from './_workplace-fixtures.js';

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
  return { kms, kekRef: { resourceName: 'fake:workplace-spec-kek' } };
}

const LIST = {
  districts: ['Gaya', 'Patna', 'West Champaran', 'Old Patna'],
  retired: ['Old Patna'],
  workplaces: [
    { name: 'GMS RAMPUR', district: 'Patna', village: 'Rampur', cluster: 'Danapur' },
    { name: 'UPS RAMPUR TOLA', district: 'Patna', village: 'Bakhtiyarpur' },
    { name: 'PS BANKIPUR', district: 'Patna', village: 'Rampur Kalan' },
    { name: '100% LITERACY SCHOOL', district: 'Patna' },
    { name: 'NEW_HORIZON SCHOOL', district: 'Patna' },
    { name: 'BACK\\SLASH SCHOOL', district: 'Patna' },
    { name: 'CLOSED SCHOOL', district: 'Patna', status: 'delisted' as const },
    { name: 'GMS GAYA', district: 'Gaya' },
    { name: 'DEO OFFICE PATNA', district: 'Patna', kind: 'office' as const },
    { name: 'GMS OLD PATNA', district: 'Old Patna' },
  ],
};

async function scoped(list: SeededList): Promise<void> {
  await enterAppScope(getTx().client, list.pariwarId);
}

describe.skipIf(!hasDatabase)('Story 6.36a — the workplace module (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the reads (AC3)', () => {
    it('the LISTED districts A–Z (⛔ a retired spelling); ⛔ any in a Pariwar with no import; hasList reads any row', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const empty = randomUUID();
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      expect(await listWorkplaceDistricts(tx, p)).toEqual(['Gaya', 'Patna', 'West Champaran']);
      expect(await pariwarHasWorkplaceList(tx, p)).toBe(true);
      await enterAppScope(client, empty);
      expect(await listWorkplaceDistricts(tx, toPariwarId(empty))).toEqual([]);
      expect(await pariwarHasWorkplaceList(tx, toPariwarId(empty))).toBe(false);
    });

    it('the search: case-insensitive, by name OR village, ⛔ delisted / another kind / another district', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      const names = async (q: string, kind: 'school' | 'office' = 'school', district = 'Patna') =>
        (await searchWorkplaces(tx, { pariwarId: p, district, kind, q })).items.map((i) => i.name);
      expect(await names('rampur')).toEqual(['GMS RAMPUR', 'PS BANKIPUR', 'UPS RAMPUR TOLA']); // PS BANKIPUR by its village
      expect(await names('closed')).toEqual([]);
      expect(await names('gaya')).toEqual([]);
      expect(await names('office')).toEqual([]);
      expect(await names('office', 'office')).toEqual(['DEO OFFICE PATNA']);
      expect(await names('', 'school', 'Gaya')).toEqual(['GMS GAYA']);
      const first = (await searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', q: 'GMS RAMPUR' })).items[0]!;
      expect(first).toEqual({
        workplaceId: list.ids['GMS RAMPUR'],
        kind: 'school',
        name: 'GMS RAMPUR',
        district: 'Patna',
        villageName: 'Rampur',
        clusterName: 'Danapur',
      });
    });

    it('the search input is ESCAPED: % _ and \\ match only themselves', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      const names = async (q: string) => (await searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', q })).items.map((i) => i.name);
      expect(await names('%')).toEqual(['100% LITERACY SCHOOL']);
      expect(await names('_')).toEqual(['NEW_HORIZON SCHOOL']);
      expect(await names('\\')).toEqual(['BACK\\SLASH SCHOOL']);
    });

    it("⛔ another Pariwar's rows — by RLS AND by the explicit pariwar_id", async () => {
      const { client, tx } = getTx();
      const a = await seedWorkplaceList(client, LIST);
      const b = await seedWorkplaceList(client, LIST);
      await scoped(a);
      // In A's scope asking for B: RLS hides B's rows.
      expect((await searchWorkplaces(tx, { pariwarId: toPariwarId(b.pariwarId), district: 'Patna', kind: 'school' })).items).toEqual([]);
      expect(await getListedWorkplace(tx, toPariwarId(a.pariwarId), b.ids['GMS RAMPUR']!)).toBeNull();
      expect(await getListedWorkplace(tx, toPariwarId(a.pariwarId), a.ids['CLOSED SCHOOL']!)).toBeNull();
      expect(await getListedWorkplace(tx, toPariwarId(a.pariwarId), 'not-a-uuid')).toBeNull();
      expect((await getListedWorkplace(tx, toPariwarId(a.pariwarId), a.ids['GMS RAMPUR']!))?.name).toBe('GMS RAMPUR');
    });

    it('keyset pages: limit 2 walks every listed school once, in order; a forged cursor is refused', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i += 1) {
        const page = await searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', limit: 2, cursor });
        seen.push(...page.items.map((x) => x.name));
        expect(page.hasMore).toBe(page.nextCursor !== null);
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
      const all = (await searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', limit: 50 })).items.map((x) => x.name);
      expect(seen).toEqual(all);
      expect(all).toHaveLength(6);
      await expect(searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', cursor: 'bm90LWpzb24' })).rejects.toBeInstanceOf(
        WorkplaceCursorInvalidError,
      );
      await expect(
        searchWorkplaces(tx, { pariwarId: p, district: 'Patna', kind: 'school', cursor: Buffer.from('["a","x"]').toString('base64url') }),
      ).rejects.toBeInstanceOf(WorkplaceCursorInvalidError);
    });

    it('the locks: a listed district → true; a retired / unknown one → false; a workplace in a retired district → null', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      expect(await lockListedDistrict(tx, p, 'Patna')).toBe(true);
      expect(await lockListedDistrict(tx, p, 'Old Patna')).toBe(false);
      expect(await lockListedDistrict(tx, p, 'patna')).toBe(false); // byte-for-byte — ⛔ normalised (SF13)
      expect(await lockListedWorkplace(tx, p, list.ids['GMS OLD PATNA']!)).toBeNull();
      expect((await lockListedWorkplace(tx, p, list.ids['GMS GAYA']!))?.district).toBe('Gaya');
    });
  });

  describe('the writer (AC4, AC7)', () => {
    it('insertWorkplaceRequest trims, stores a blank place as NULL, and refuses a phone number in ANY script', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = toMemberId(await seedMember(tx, list.pariwarId, { state: 'active' }));
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      const row = await insertWorkplaceRequest(tx, { pariwarId: p, memberId: m, district: 'Patna', typedName: '  मध्य विद्यालय रामपुर ', typedPlace: '   ', startedOn: '2019-04-01' });
      expect(row).toMatchObject({ typedName: 'मध्य विद्यालय रामपुर', typedPlace: null, state: 'pending', startedOn: '2019-04-01', district: 'Patna' });
      for (const typedName of ['Call ९८७६५४३२१०', '', 'x'.repeat(121)]) {
        await expect(insertWorkplaceRequest(tx, { pariwarId: p, memberId: m, district: 'Patna', typedName, startedOn: '2019-04-01' })).rejects.toMatchObject({
          code: 'workplace.typed_name_invalid',
        });
      }
      await expect(
        insertWorkplaceRequest(tx, { pariwarId: p, memberId: m, district: 'Patna', typedName: 'OK', typedPlace: 'ward ９８７６５４３', startedOn: '2019-04-01' }),
      ).rejects.toBeInstanceOf(WorkplaceWriteRefusedError);
    });

    it('insertMemberPosting writes the new columns and ENDS the older open requests — ⛔ its own, ⛔ exceptRequestId, ⛔ final ones, ⛔ another member\'s', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = toMemberId(await seedMember(tx, list.pariwarId, { state: 'active' }));
      const other = toMemberId(await seedMember(tx, list.pariwarId, { state: 'active' }));
      await scoped(list);
      const p = toPariwarId(list.pariwarId);
      const req = (memberId = m) => insertWorkplaceRequest(tx, { pariwarId: p, memberId, district: 'Patna', typedName: 'Some School', startedOn: '2018-01-01' });
      const older = await req();
      const suggested = await req();
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = gen_random_uuid(), suggested_at = now() WHERE request_id = $1`, [
        suggested.requestId,
        list.ids['GMS RAMPUR'],
      ]);
      const finalOne = await req();
      await client.query(`UPDATE workplace_requests SET state = 'closed', resolved_at = now() WHERE request_id = $1`, [finalOne.requestId]);
      const confirming = await req();
      const othersOpen = await req(other);
      const own = await req();
      const posting = await insertMemberPosting(tx, {
        memberId: m,
        pariwarId: p,
        district: 'Patna',
        workplaceRequestId: own.requestId,
        startedOn: '2018-01-01',
        exceptRequestId: confirming.requestId,
      });
      expect(posting).toMatchObject({ workplaceRequestId: own.requestId, workplaceId: null, startedOn: '2018-01-01', isRetirement: false });
      const { rows } = await client.query<{ request_id: string; state: string; resolved: boolean }>(
        `SELECT request_id, state, resolved_at IS NOT NULL AS resolved FROM workplace_requests WHERE pariwar_id = $1`,
        [list.pariwarId],
      );
      const state = (id: string) => rows.find((r) => r.request_id === id)?.state;
      expect(state(older.requestId)).toBe('withdrawn');
      expect(state(suggested.requestId)).toBe('withdrawn');
      expect(state(finalOne.requestId)).toBe('closed');
      expect(state(confirming.requestId)).toBe('pending');
      expect(state(own.requestId)).toBe('pending');
      expect(state(othersOpen.requestId)).toBe('pending');
      // A workplace posting (SW5 — the caller passes the workplace's district) ends the member's last open requests.
      const w = await insertMemberPosting(tx, { memberId: m, pariwarId: p, district: 'Patna', workplaceId: toWorkplaceId(list.ids['GMS RAMPUR']!), startedOn: '2020-01-01' });
      expect(w.workplaceId).toBe(list.ids['GMS RAMPUR']);
      const after = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM workplace_requests WHERE member_id = $1 AND state IN ('pending', 'suggested')`,
        [m],
      );
      expect(after.rows[0]!.n).toBe('0');
    });
  });

  describe('the history (AC3b)', () => {
    it('newest first; the workplace (even delisted) and the request (its suggestion while suggested); a µs-exact cursor', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await seedMember(tx, list.pariwarId, { state: 'active' });
      const reqId = randomUUID();
      await client.query(
        `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, typed_place, started_on) VALUES ($1, $2, $3, 'Patna', 'Village School', 'Rampur', '2021-07-01')`,
        [reqId, list.pariwarId, m],
      );
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = gen_random_uuid(), suggested_at = now() WHERE request_id = $1`, [
        reqId,
        list.ids['UPS RAMPUR TOLA'],
      ]);
      const ins = (cols: string, vals: string, params: unknown[]) =>
        client.query(`INSERT INTO member_postings (pariwar_id, member_id, ${cols}) VALUES ($1, $2, ${vals})`, [list.pariwarId, m, ...params]);
      // Two rows ONE MICROSECOND apart — a millisecond cursor would skip the second.
      await ins('district, created_at', `'Free Text District', '2020-01-01 00:00:00.000001+00'`, []);
      await ins('district, workplace_id, started_on, created_at', `'Patna', $3, '2019-06-01', '2020-01-01 00:00:00.000002+00'`, [list.ids['CLOSED SCHOOL']]);
      await ins('district, workplace_request_id, started_on, created_at', `'Patna', $3, '2021-07-01', '2021-08-01 10:00:00+00'`, [reqId]);
      await ins('district, is_retirement, started_on, created_at', `'Patna', true, '2025-03-31', '2025-04-01 10:00:00+00'`, []);
      await enterAppScope(client, list.pariwarId);
      const p = toPariwarId(list.pariwarId);
      const all = await listMemberPostingHistory(tx, p, toMemberId(m));
      expect(all.items.map((i) => [i.district, i.isRetirement, i.startedOn, i.workplace?.name ?? null, i.request?.state ?? null])).toEqual([
        ['Patna', true, '2025-03-31', null, null],
        ['Patna', false, '2021-07-01', null, 'suggested'],
        ['Patna', false, '2019-06-01', 'CLOSED SCHOOL', null],
        ['Free Text District', false, null, null, null],
      ]);
      expect(all.items[1]!.request).toEqual({
        requestId: reqId,
        state: 'suggested',
        typedName: 'Village School',
        typedPlace: 'Rampur',
        suggested: { workplaceId: list.ids['UPS RAMPUR TOLA'], name: 'UPS RAMPUR TOLA', district: 'Patna' },
      });
      expect(all.hasMore).toBe(false);
      // Paged one at a time, the walk is the same list.
      const walked: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 6; i += 1) {
        const page = await listMemberPostingHistory(tx, p, toMemberId(m), { limit: 1, cursor });
        walked.push(...page.items.map((x) => x.postingId));
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
      expect(walked).toEqual(all.items.map((x) => x.postingId));
      expect(await latestPostingStartedOn(tx, p, toMemberId(m))).toBe('2025-03-31');
    });

    it('a forged cursor that passes the shape but is calendar-impossible is WorkplaceCursorInvalidError — ⛔ a pg 22008 (review R2-4)', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await seedMember(tx, list.pariwarId, { state: 'active' });
      await enterAppScope(client, list.pariwarId);
      const id = randomUUID();
      const forged = (recordedAt: string) => Buffer.from(JSON.stringify([recordedAt, id])).toString('base64url');
      for (const at of ['2026-13-01T00:00:00.000000Z', '2023-02-30T00:00:00.000000Z', '2026-01-01T24:00:00.000000Z', '2026-01-01T25:61:61.000000Z', '0000-01-01T00:00:00.000000Z' /* ⛔ a Postgres year */]) {
        await expect(listMemberPostingHistory(tx, toPariwarId(list.pariwarId), toMemberId(m), { cursor: forged(at) }), at).rejects.toBeInstanceOf(
          WorkplaceCursorInvalidError,
        );
      }
      // A real instant still reads (an empty page for a member with ⛔ rows).
      const page = await listMemberPostingHistory(tx, toPariwarId(list.pariwarId), toMemberId(m), { cursor: forged('2024-02-29T23:59:59.999999Z') });
      expect(page).toEqual({ items: [], hasMore: false, nextCursor: null });
    });

    it('latestPostingStartedOn skips a newer legacy row with ⛔ start date', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await seedMember(tx, list.pariwarId, { state: 'active' });
      await client.query(
        `INSERT INTO member_postings (pariwar_id, member_id, district, started_on, created_at) VALUES ($1, $2, 'Patna', '2015-01-01', '2016-01-01+00'), ($1, $2, 'Patna', NULL, '2017-01-01+00')`,
        [list.pariwarId, m],
      );
      await scoped(list);
      expect(await latestPostingStartedOn(tx, toPariwarId(list.pariwarId), toMemberId(m))).toBe('2015-01-01');
      const nobody = toMemberId(randomUUID());
      expect(await latestPostingStartedOn(tx, toPariwarId(list.pariwarId), nobody)).toBeNull();
    });
  });

  describe('⭐ AC9 — erasure and export on real rows', () => {
    it('anonymizeMember NULLs the typed text in EVERY state, closes the open ones — and a SECOND run passes (⛔ a no-op write)', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await seedMember(tx, list.pariwarId, { state: 'withdrawn' });
      const keep = await seedMember(tx, list.pariwarId, { state: 'active' });
      const ids: Record<string, string> = {};
      for (const state of ['pending', 'suggested', 'confirmed', 'withdrawn', 'closed']) {
        const id = randomUUID();
        ids[state] = id;
        await client.query(
          `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, typed_place, started_on) VALUES ($1, $2, $3, 'Patna', 'Typed School', 'Typed Place', '2020-01-01')`,
          [id, list.pariwarId, m],
        );
        if (state === 'suggested' || state === 'confirmed') {
          await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = gen_random_uuid(), suggested_at = now() WHERE request_id = $1`, [id, list.ids['GMS RAMPUR']]);
        }
        if (state !== 'pending' && state !== 'suggested') {
          await client.query(`UPDATE workplace_requests SET state = $2, resolved_at = now() WHERE request_id = $1`, [id, state]);
        }
      }
      const keptId = randomUUID();
      await client.query(
        `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'Someone Else', '2020-01-01')`,
        [keptId, list.pariwarId, keep],
      );
      await client.query(`INSERT INTO member_postings (pariwar_id, member_id, district, workplace_request_id, started_on) VALUES ($1, $2, 'Patna', $3, '2020-01-01')`, [
        list.pariwarId,
        m,
        ids['pending'],
      ]);
      await enterAppScope(client, list.pariwarId);
      const { kms, kekRef } = fakeKms();
      const run = () => anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(m), pariwarId: toPariwarId(list.pariwarId) });
      await run();
      const { rows } = await client.query<{ request_id: string; state: string; typed_name: string | null; typed_place: string | null; resolved: boolean }>(
        `SELECT request_id, state, typed_name, typed_place, resolved_at IS NOT NULL AS resolved FROM workplace_requests WHERE member_id = $1`,
        [m],
      );
      const by = (s: string) => rows.find((r) => r.request_id === ids[s]);
      expect(rows.every((r) => r.typed_name === null && r.typed_place === null && r.resolved)).toBe(true);
      expect(by('pending')?.state).toBe('closed');
      expect(by('suggested')?.state).toBe('closed');
      expect(by('confirmed')?.state).toBe('confirmed');
      expect(by('withdrawn')?.state).toBe('withdrawn');
      expect(by('closed')?.state).toBe('closed');
      // The posting row is KEPT (non-PII Tier 3).
      expect((await client.query(`SELECT 1 FROM member_postings WHERE member_id = $1`, [m])).rowCount).toBe(1);
      // ⛔ Another member's request.
      expect((await client.query<{ typed_name: string }>(`SELECT typed_name FROM workplace_requests WHERE request_id = $1`, [keptId])).rows[0]!.typed_name).toBe('Someone Else');
      // A second erasure (e.g. a retried RTBF) must ⛔ fail on the already-scrubbed rows.
      await expect(run()).resolves.toBeUndefined();
    });

    it('the export lists each posting with its workplace, the not-listed flag and the start date — and every request', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await seedMember(tx, list.pariwarId, { state: 'active', stateEventVersion: 4 });
      const reqId = randomUUID();
      await client.query(
        `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'My Village School', '2021-07-01')`,
        [reqId, list.pariwarId, m],
      );
      await client.query(
        `INSERT INTO member_postings (pariwar_id, member_id, district, workplace_id, started_on, created_at) VALUES ($1, $2, 'Patna', $3, '2019-06-01', '2020-01-01+00')`,
        [list.pariwarId, m, list.ids['GMS RAMPUR']],
      );
      await client.query(
        `INSERT INTO member_postings (pariwar_id, member_id, district, workplace_request_id, started_on, created_at) VALUES ($1, $2, 'Patna', $3, '2021-07-01', '2021-08-01+00')`,
        [list.pariwarId, m, reqId],
      );
      await enterAppScope(client, list.pariwarId);
      const { kms, kekRef } = fakeKms();
      const sections = await assembleMemberExport(tx, { kms, kekRef }, { exportId: randomUUID(), memberId: toMemberId(m), pariwarId: toPariwarId(list.pariwarId), now: new Date('2026-10-14T10:00:00Z') });
      const profile = sections['profile.json'] as { postings: unknown[]; workplaceRequests: unknown[] };
      expect(profile.postings).toEqual([
        { district: 'Patna', pariwarRef: null, isRetirement: false, recordedAt: '2020-01-01T00:00:00.000Z', workplace: { name: 'GMS RAMPUR', kind: 'school' }, notListed: false, startedOn: '2019-06-01' },
        { district: 'Patna', pariwarRef: null, isRetirement: false, recordedAt: '2021-08-01T00:00:00.000Z', workplace: null, notListed: true, startedOn: '2021-07-01' },
      ]);
      expect(profile.workplaceRequests).toEqual([
        { district: 'Patna', typedName: 'My Village School', typedPlace: null, startedOn: '2021-07-01', state: 'pending', recordedAt: expect.any(String), resolvedAt: null },
      ]);
    });
  });
});

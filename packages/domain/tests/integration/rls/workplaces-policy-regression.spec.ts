// Migration 0161 — where each member works: `workplace_import_batches`, `workplace_districts`, `workplaces`,
// `workplace_requests` and three new `member_postings` columns (Story 6.36a, Task 1; AC1). Live DB; per-test ROLLBACK. Every
// refusal runs under a SAVEPOINT so one test can assert several.
//   · the catalog: every member FK SINGLE-COLUMN (SF14), every other FK composite on `pariwar_id`; ⛔ no DEFERRABLE
//     constraint; the CHECKs' vocabularies LOCKSTEP with the schema constants;
//   · grants: SELECT + INSERT + the exact column-UPDATE set per table; ⛔ DELETE / TRUNCATE anywhere; `member_postings` stays
//     SELECT + INSERT (append-only);
//   · the batch guard (created running; `finished` FINAL), the rename row carries ⛔ no source fields;
//   · the workplace CHECKs (an office has ⛔ no code; an imported row is a school with a code and a batch) and the district FK;
//   · THE REQUEST GUARD: created `pending`; the state machine; the identity columns frozen; the ERASURE ARM on a row in EACH
//     state (alone, and with an open request's move to `closed`); the RENAME ARM (open rows only, `district` alone);
//   · `member_postings`: at most one of the two workplace columns; a retirement names ⛔ neither; `started_on` ≥ 1950;
//     another Pariwar's workplace refused by the composite FK;
//   · RLS: ENABLED + FORCED, per-command policies (⛔ DELETE, ⛔ FOR ALL), cross-tenant reads see nothing, a cross-tenant
//     insert is refused, the unscoped probe sees nothing; in scope, `twt_app` runs the erasure scrub and the rename.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { WORKPLACE_DISTRICT_STATUSES } from '../../../src/schema/workplace_districts.js';
import { WORKPLACE_IMPORT_BATCH_STATUSES } from '../../../src/schema/workplace_import_batches.js';
import { WORKPLACE_REQUEST_STATES } from '../../../src/schema/workplace_requests.js';
import { WORKPLACE_KINDS, WORKPLACE_SOURCES, WORKPLACE_STATUSES } from '../../../src/schema/workplaces.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, seedMember } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLES = ['workplace_import_batches', 'workplace_districts', 'workplaces', 'workplace_requests'] as const;

/** Run `text` under a SAVEPOINT; return the SQLSTATE (or null on success) and roll the savepoint back on failure. */
async function attempt(client: Client, text: string, params: unknown[] = []): Promise<{ code: string | null; message: string; rowCount: number }> {
  await client.query('SAVEPOINT probe');
  try {
    const r = await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null, message: '', rowCount: r.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    const e = err as { code?: string; message?: string };
    return { code: e.code ?? 'unknown', message: e.message ?? '', rowCount: 0 };
  }
}

interface Listed {
  readonly pariwarId: string;
  readonly batchId: string;
  readonly schoolId: string;
  readonly officeId: string;
}

/** As the superuser: ONE finished-shape batch (left running), two listed spellings, one imported school, one staff office. */
async function seedList(client: Client, pariwarId: string = randomUUID()): Promise<Listed> {
  const batchId = randomUUID();
  await client.query(
    `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
     VALUES ($1, $2, 'IDP', 'https://example.test/udise', '2026-10-14', 'ODC-BY-1.0', 'Contains information from UDISE', '10')`,
    [batchId, pariwarId],
  );
  for (const d of ['Patna', 'Gaya']) {
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, source_batch_id) VALUES ($1, $2, $3)`, [pariwarId, d, batchId]);
  }
  const schoolId = randomUUID();
  await client.query(
    `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, block_code, udise_school_code, source, import_batch_id)
     VALUES ($1, $2, 'school', 'GMS PATNA CITY', 'Patna', '102801', '10280100101', 'import', $3)`,
    [schoolId, pariwarId, batchId],
  );
  const officeId = randomUUID();
  await client.query(
    `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, source) VALUES ($1, $2, 'office', 'DEO Office Gaya', 'Gaya', 'staff')`,
    [officeId, pariwarId],
  );
  return { pariwarId, batchId, schoolId, officeId };
}

/** As the superuser: a `pending` request of a fresh member. */
async function seedRequest(client: Client, l: Listed, memberId?: string): Promise<{ requestId: string; memberId: string }> {
  const { tx } = getTx();
  const m = memberId ?? (await seedMember(tx, l.pariwarId, { state: 'active' }));
  const requestId = randomUUID();
  await client.query(
    `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, typed_place, started_on)
     VALUES ($1, $2, $3, 'Patna', 'Primary School Rampur', 'Rampur', '2020-06-01')`,
    [requestId, l.pariwarId, m],
  );
  return { requestId, memberId: m };
}

/** Move a seeded request into `state` through the guard's own moves. */
async function moveTo(client: Client, l: Listed, requestId: string, state: string): Promise<void> {
  const suggest = `UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_at = now() WHERE request_id = $1`;
  if (state === 'pending') return;
  if (state === 'suggested' || state === 'confirmed') await client.query(suggest, [requestId, l.schoolId]);
  if (state === 'confirmed') await client.query(`UPDATE workplace_requests SET state = 'confirmed', resolved_at = now() WHERE request_id = $1`, [requestId]);
  if (state === 'withdrawn' || state === 'closed') {
    await client.query(`UPDATE workplace_requests SET state = $2, resolved_at = now() WHERE request_id = $1`, [requestId, state]);
  }
}

const GUARD = '23000';

describe.skipIf(!hasDatabase)('0161 — the workplace tables', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the catalog', () => {
    it('member FKs SINGLE-COLUMN (SF14); every other FK composite on pariwar_id; ⛔ no DEFERRABLE constraint', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string; deferrable: boolean }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def, condeferrable AS deferrable FROM pg_constraint
          WHERE conrelid IN ('workplace_import_batches'::regclass, 'workplace_districts'::regclass, 'workplaces'::regclass,
                             'workplace_requests'::regclass, 'member_postings'::regclass)`,
      );
      const def = (n: string) => rows.find((r) => r.conname === n)?.def ?? `<missing ${n}>`;
      expect(def('workplace_requests_member_id_members_member_id_fk')).toBe('FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE');
      expect(def('workplace_requests_district_fk')).toBe('FOREIGN KEY (pariwar_id, district) REFERENCES workplace_districts(pariwar_id, district)');
      expect(def('workplace_requests_suggested_workplace_fk')).toBe(
        'FOREIGN KEY (pariwar_id, suggested_workplace_id) REFERENCES workplaces(pariwar_id, workplace_id)',
      );
      expect(def('workplaces_district_fk')).toBe('FOREIGN KEY (pariwar_id, district) REFERENCES workplace_districts(pariwar_id, district)');
      expect(def('workplaces_import_batch_fk')).toBe('FOREIGN KEY (pariwar_id, import_batch_id) REFERENCES workplace_import_batches(pariwar_id, batch_id)');
      expect(def('workplace_districts_source_batch_fk')).toBe(
        'FOREIGN KEY (pariwar_id, source_batch_id) REFERENCES workplace_import_batches(pariwar_id, batch_id)',
      );
      expect(def('member_postings_workplace_fk')).toBe('FOREIGN KEY (pariwar_id, workplace_id) REFERENCES workplaces(pariwar_id, workplace_id)');
      expect(def('member_postings_workplace_request_fk')).toBe(
        'FOREIGN KEY (pariwar_id, workplace_request_id) REFERENCES workplace_requests(pariwar_id, request_id)',
      );
      expect(def('workplaces_pariwar_udise_uq')).toBe('UNIQUE (pariwar_id, udise_school_code)');
      expect(def('workplaces_pariwar_workplace_uq')).toBe('UNIQUE (pariwar_id, workplace_id)');
      expect(def('workplace_requests_pariwar_request_uq')).toBe('UNIQUE (pariwar_id, request_id)');
      expect(def('workplace_districts_pariwar_id_district_pk')).toBe('PRIMARY KEY (pariwar_id, district)');
      expect(rows.filter((r) => r.deferrable)).toEqual([]);
    });

    it("the CHECKs' vocabularies are LOCKSTEP with the schema constants", async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype = 'c' AND conname = ANY($1)`,
        [['workplaces_kind_check', 'workplaces_source_check', 'workplaces_status_check', 'workplace_requests_state_check', 'workplace_districts_status_check', 'workplace_import_batches_status_check']],
      );
      const values = (n: string) => [...(rows.find((r) => r.conname === n)?.def ?? '').matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect(values('workplaces_kind_check')).toEqual([...WORKPLACE_KINDS]);
      expect(values('workplaces_source_check')).toEqual([...WORKPLACE_SOURCES]);
      expect(values('workplaces_status_check')).toEqual([...WORKPLACE_STATUSES]);
      expect(values('workplace_requests_state_check')).toEqual([...WORKPLACE_REQUEST_STATES]);
      expect(values('workplace_districts_status_check')).toEqual([...WORKPLACE_DISTRICT_STATUSES]);
      expect(values('workplace_import_batches_status_check')).toEqual([...WORKPLACE_IMPORT_BATCH_STATUSES]);
    });

    it('grants: SELECT + INSERT + the exact column-UPDATE set; ⛔ DELETE / TRUNCATE / table-wide UPDATE; member_postings SELECT + INSERT only', async () => {
      const { client } = getTx();
      const priv = async (t: string, p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege('twt_app', $1, $2) AS ok`, [t, p])).rows[0]!.ok;
      for (const t of TABLES) {
        expect(await priv(t, 'SELECT'), t).toBe(true);
        expect(await priv(t, 'INSERT'), t).toBe(true);
        expect(await priv(t, 'UPDATE'), t).toBe(false);
        expect(await priv(t, 'DELETE'), t).toBe(false);
        expect(await priv(t, 'TRUNCATE'), t).toBe(false);
      }
      expect(await priv('member_postings', 'SELECT')).toBe(true);
      expect(await priv('member_postings', 'INSERT')).toBe(true);
      expect(await priv('member_postings', 'UPDATE')).toBe(false);
      expect(await priv('member_postings', 'DELETE')).toBe(false);
      const { rows } = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.column_privileges
          WHERE grantee = 'twt_app' AND privilege_type = 'UPDATE' AND table_name = ANY($1) ORDER BY table_name, column_name`,
        [[...TABLES, 'member_postings']],
      );
      const cols = (t: string) => rows.filter((r) => r.table_name === t).map((r) => r.column_name);
      expect(cols('workplace_import_batches')).toEqual([
        'districts_retired', 'finished_at', 'rows_delisted', 'rows_duplicate', 'rows_inserted', 'rows_read', 'rows_refused',
        'rows_relisted', 'rows_skipped_staff', 'rows_updated', 'status',
      ]);
      expect(cols('workplace_districts')).toEqual(['source_batch_id', 'status', 'updated_at']);
      // ⛔ Never `kind`, the code, `source` or `pariwar_id`.
      expect(cols('workplaces')).toEqual([
        'block_code', 'cluster_name', 'district', 'import_batch_id', 'name', 'pincode', 'status', 'updated_at', 'village_name',
      ]);
      expect(cols('workplace_requests')).toEqual([
        'district', 'resolved_at', 'state', 'suggested_at', 'suggested_by_actor_id', 'suggested_workplace_id', 'typed_name', 'typed_place',
      ]);
      expect(cols('member_postings')).toEqual([]);
    });

    it('the indexes (checklist 5): the picker path, the member\'s own requests, and the PARTIAL open-requests index with its predicate', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('workplaces', 'workplace_requests')`,
      );
      const names = rows.map((r) => r.indexname);
      expect(names).toContain('workplaces_pariwar_district_kind_status_idx');
      expect(names).toContain('workplace_requests_pariwar_member_idx');
      expect(names).toContain('workplace_requests_open_idx');
      const def = (n: string) => rows.find((r) => r.indexname === n)?.indexdef ?? `<missing ${n}>`;
      expect(def('workplaces_pariwar_district_kind_status_idx')).toMatch(/USING btree \(pariwar_id, district, kind, status\)$/);
      expect(def('workplace_requests_pariwar_member_idx')).toMatch(/USING btree \(pariwar_id, member_id\)$/);
      const open = def('workplace_requests_open_idx');
      expect(open).toMatch(/USING btree \(pariwar_id, district\) WHERE /);
      expect(open).toContain("'pending'");
      expect(open).toContain("'suggested'");
      expect(open).not.toContain("'withdrawn'");
    });

    it('the triggers: the batch guard and the request guard (BEFORE INSERT OR UPDATE, ROW, enabled)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ tgname: string; fn: string; tgtype: number; tgenabled: string }>(
        `SELECT t.tgname, p.proname AS fn, t.tgtype, t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
          WHERE NOT t.tgisinternal AND t.tgrelid = ANY(ARRAY['workplace_import_batches'::regclass, 'workplace_requests'::regclass,
                                                            'workplaces'::regclass, 'workplace_districts'::regclass])
          ORDER BY t.tgname`,
      );
      // `tgtype` = ROW 1 | BEFORE 2 | INSERT 4 | UPDATE 16 ⇒ 23.
      expect(rows.map((r) => `${r.tgname}→${r.fn}:${r.tgtype}:${r.tgenabled}`)).toEqual([
        'workplace_import_batches_guard→workplace_import_batches_guard:23:O',
        'workplace_requests_guard→workplace_requests_guard:23:O',
      ]);
    });
  });

  describe('the batches', () => {
    it('a batch is created running; a finished batch is FINAL; finishing needs every count', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const finishedInsert = await attempt(
        client,
        `INSERT INTO workplace_import_batches (pariwar_id, source_name, status, finished_at, rows_read, rows_inserted, rows_updated, rows_delisted,
           rows_relisted, rows_refused, rows_duplicate, rows_skipped_staff, districts_retired)
         VALUES ($1, 'rename', 'finished', clock_timestamp(), 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
        [l.pariwarId],
      );
      expect(finishedInsert.code).toBe(GUARD);
      expect((await attempt(client, `UPDATE workplace_import_batches SET status = 'finished', finished_at = clock_timestamp() WHERE batch_id = $1`, [l.batchId])).code).toBe('23514');
      const finish = `UPDATE workplace_import_batches SET status = 'finished', finished_at = clock_timestamp(), rows_read = 3, rows_inserted = 1,
        rows_updated = 0, rows_delisted = 0, rows_relisted = 0, rows_refused = 1, rows_duplicate = 1, rows_skipped_staff = 0, districts_retired = 0
        WHERE batch_id = $1`;
      expect((await attempt(client, finish, [l.batchId])).code).toBeNull();
      const again = await attempt(client, `UPDATE workplace_import_batches SET rows_read = 4 WHERE batch_id = $1`, [l.batchId]);
      expect(again.code).toBe(GUARD);
      expect(again.message).toMatch(/a finished batch is final/);
    });

    it('a rename row carries ⛔ no source fields; every other row carries all five (23514)', async () => {
      const { client } = getTx();
      const p = randomUUID();
      expect((await attempt(client, `INSERT INTO workplace_import_batches (pariwar_id, source_name) VALUES ($1, 'rename')`, [p])).code).toBeNull();
      expect((await attempt(client, `INSERT INTO workplace_import_batches (pariwar_id, source_name, licence) VALUES ($1, 'rename', 'ODC-BY-1.0')`, [p])).code).toBe('23514');
      expect((await attempt(client, `INSERT INTO workplace_import_batches (pariwar_id, source_name) VALUES ($1, 'IDP')`, [p])).code).toBe('23514');
      const badState = await attempt(
        client,
        `INSERT INTO workplace_import_batches (pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
         VALUES ($1, 'IDP', 'https://x.test', '2026-10-14', 'ODC-BY-1.0', 'A', '1')`,
        [p],
      );
      expect(badState.code).toBe('23514');
    });
  });

  describe('the workplaces', () => {
    it('an office has ⛔ no code; an imported row is a school with a code and a batch; the district must be a spelling of the list', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const ins = (cols: string, vals: string, params: unknown[]) =>
        attempt(client, `INSERT INTO workplaces (pariwar_id, ${cols}) VALUES ($1, ${vals})`, [l.pariwarId, ...params]);
      expect((await ins('kind, name, district, source, udise_school_code', `'office', 'X', 'Patna', 'staff', '10280100102'`, [])).code).toBe('23514');
      expect((await ins('kind, name, district, source, udise_school_code, import_batch_id', `'office', 'X', 'Patna', 'import', NULL, $2`, [l.batchId])).code).toBe('23514');
      expect((await ins('kind, name, district, source, udise_school_code', `'school', 'X', 'Patna', 'import', '10280100103'`, [])).code).toBe('23514');
      expect((await ins('kind, name, district, source', `'school', 'X', 'Patna', 'staff'`, [])).code).toBeNull();
      expect((await ins('kind, name, district, source', `'school', 'X', 'Muzaffarpur', 'staff'`, [])).code).toBe('23503');
      expect((await ins('kind, name, district, source', `'school', '   ', 'Patna', 'staff'`, [])).code).toBe('23514');
      expect((await ins('kind, name, district, source, pincode', `'school', 'X', 'Patna', 'staff', '8000'`, [])).code).toBe('23514');
      // The code is unique per Pariwar.
      expect((await ins('kind, name, district, source, udise_school_code, import_batch_id', `'school', 'Y', 'Gaya', 'import', '10280100101', $2`, [l.batchId])).code).toBe('23505');
      // Another Pariwar MAY hold the same code.
      const other = await seedList(client);
      expect(other.schoolId).not.toBe(l.schoolId);
    });

    it('a district spelling is stored trimmed — a surrounding space is ⛔ a second spelling (23514)', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      expect((await attempt(client, `INSERT INTO workplace_districts (pariwar_id, district) VALUES ($1, ' Patna')`, [l.pariwarId])).code).toBe('23514');
      expect((await attempt(client, `INSERT INTO workplace_districts (pariwar_id, district) VALUES ($1, 'patna')`, [l.pariwarId])).code).toBeNull();
    });

    it("in scope, twt_app ⛔ cannot rewrite a workplace's kind, code, source or Pariwar (42501)", async () => {
      const { client } = getTx();
      const l = await seedList(client);
      await enterAppScope(client, l.pariwarId);
      for (const set of [`kind = 'office'`, `udise_school_code = '10280100109'`, `source = 'staff'`, `pariwar_id = '${randomUUID()}'`]) {
        expect((await attempt(client, `UPDATE workplaces SET ${set} WHERE workplace_id = $1`, [l.schoolId])).code, set).toBe('42501');
      }
      expect((await attempt(client, `UPDATE workplaces SET status = 'delisted', updated_at = now() WHERE workplace_id = $1`, [l.schoolId])).rowCount).toBe(1);
      expect((await attempt(client, `DELETE FROM workplaces WHERE workplace_id = $1`, [l.schoolId])).code).toBe('42501');
    });
  });

  describe('the request guard', () => {
    it('a request is created pending, with nothing suggested', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const { tx } = getTx();
      const m = await seedMember(tx, l.pariwarId, { state: 'active' });
      for (const extra of [
        [`state`, `'suggested'`],
        [`resolved_at`, `now()`],
        [`suggested_workplace_id`, `'${l.schoolId}'`],
      ] as const) {
        const r = await attempt(
          client,
          `INSERT INTO workplace_requests (pariwar_id, member_id, district, typed_name, started_on, ${extra[0]}) VALUES ($1, $2, 'Patna', 'X', '2020-01-01', ${extra[1]})`,
          [l.pariwarId, m],
        );
        expect([GUARD, '23514'], extra[0]).toContain(r.code);
      }
      // ⛔ No CHECK requires the typed text (AC9).
      expect((await attempt(client, `INSERT INTO workplace_requests (pariwar_id, member_id, district, started_on) VALUES ($1, $2, 'Patna', '2020-01-01')`, [l.pariwarId, m])).code).toBeNull();
    });

    it('the typed text: ≤ 120, ⛔ blank, ⛔ a run of seven digits; the start date ≥ 1950-01-01 (23514)', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const { tx } = getTx();
      const m = await seedMember(tx, l.pariwarId, { state: 'active' });
      const ins = (name: string | null, place: string | null, started = '2020-01-01') =>
        attempt(client, `INSERT INTO workplace_requests (pariwar_id, member_id, district, typed_name, typed_place, started_on) VALUES ($1, $2, 'Patna', $3, $4, $5)`, [
          l.pariwarId, m, name, place, started,
        ]);
      expect((await ins('x'.repeat(120), 'y'.repeat(120))).code).toBeNull();
      expect((await ins('x'.repeat(121), null)).code).toBe('23514');
      expect((await ins('x', 'y'.repeat(121))).code).toBe('23514');
      expect((await ins('   ', null)).code).toBe('23514');
      expect((await ins('Call 9876543', null)).code).toBe('23514');
      expect((await ins('School 123456', null)).code).toBeNull();
      expect((await ins('X', 'ward 9876543210')).code).toBe('23514');
      expect((await ins('X', null, '1949-12-31')).code).toBe('23514');
    });

    it('the state machine: the allowed moves pass; confirmed / withdrawn / closed are FINAL; a skipped move is refused', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const move = (id: string, state: string, extra = '') =>
        attempt(client, `UPDATE workplace_requests SET state = $2${extra} WHERE request_id = $1`, [id, state]);
      const resolved = `, resolved_at = now()`;
      const suggested = `, suggested_workplace_id = '${l.schoolId}', suggested_at = now()`;
      // pending → confirmed is ⛔ a move.
      const a = await seedRequest(client, l);
      expect((await move(a.requestId, 'confirmed', resolved)).code).toBe(GUARD);
      expect((await move(a.requestId, 'suggested', suggested)).code).toBeNull();
      expect((await move(a.requestId, 'pending', `, suggested_workplace_id = NULL, suggested_at = NULL`)).code).toBeNull();
      expect((await move(a.requestId, 'suggested', suggested)).code).toBeNull();
      expect((await move(a.requestId, 'confirmed', resolved)).code).toBeNull();
      for (const s of ['pending', 'suggested', 'withdrawn', 'closed']) {
        expect((await move(a.requestId, s, s === 'pending' || s === 'suggested' ? `, resolved_at = NULL` : '')).code, `confirmed → ${s}`).toBe(GUARD);
      }
      for (const final of ['withdrawn', 'closed']) {
        const r = await seedRequest(client, l);
        expect((await move(r.requestId, final, resolved)).code).toBeNull();
        expect((await move(r.requestId, 'pending', `, resolved_at = NULL`)).code, `${final} → pending`).toBe(GUARD);
      }
      // A suggested request needs its workplace and its time (the CHECK); a final one needs resolved_at (⇔).
      const b = await seedRequest(client, l);
      expect((await move(b.requestId, 'suggested')).code).toBe('23514');
      expect((await move(b.requestId, 'withdrawn')).code).toBe('23514');
      // The suggestion changes only on a move into `suggested` (or back to `pending`).
      expect((await move(b.requestId, 'withdrawn', `${resolved}, suggested_workplace_id = '${l.officeId}'`)).code).toBe(GUARD);
    });

    it('the identity columns never change (member, started_on, created_at, pariwar)', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const r = await seedRequest(client, l);
      const { tx } = getTx();
      const other = await seedMember(tx, l.pariwarId, { state: 'active' });
      for (const set of [`member_id = '${other}'`, `started_on = '2021-01-01'`, `created_at = created_at - interval '1 day'`, `typed_name = 'Another School'`]) {
        expect((await attempt(client, `UPDATE workplace_requests SET ${set} WHERE request_id = $1`, [r.requestId])).code, set).toBe(GUARD);
      }
      // A no-op state "move" with nothing erased is ⛔ a change either.
      expect((await attempt(client, `UPDATE workplace_requests SET state = 'pending' WHERE request_id = $1`, [r.requestId])).code).toBe(GUARD);
    });

    it('THE ERASURE ARM — the typed text → NULL in EVERY state, alone; with an open request, together with its move to closed', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      for (const state of WORKPLACE_REQUEST_STATES) {
        const r = await seedRequest(client, l);
        await moveTo(client, l, r.requestId, state);
        const alone = await attempt(client, `UPDATE workplace_requests SET typed_name = NULL, typed_place = NULL WHERE request_id = $1`, [r.requestId]);
        expect(alone.code, `${state}: erase alone`).toBeNull();
        const r2 = await seedRequest(client, l);
        await moveTo(client, l, r2.requestId, state);
        const open = state === 'pending' || state === 'suggested';
        const close = await attempt(
          client,
          // ⚠ `clock_timestamp()`, ⛔ `now()`: inside one test transaction `now()` equals the seeded `resolved_at`, so a
          // re-close of a `closed` row would read as "nothing but the erasure changed" and prove nothing.
          `UPDATE workplace_requests SET typed_name = NULL, typed_place = NULL, state = 'closed', resolved_at = clock_timestamp() WHERE request_id = $1`,
          [r2.requestId],
        );
        expect(close.code, `${state}: erase + close`).toBe(open ? null : GUARD);
        if (open) {
          const r3 = await seedRequest(client, l);
          await moveTo(client, l, r3.requestId, state);
          const elsewhere = await attempt(
            client,
            `UPDATE workplace_requests SET typed_name = NULL, state = 'withdrawn', resolved_at = now() WHERE request_id = $1`,
            [r3.requestId],
          );
          expect(elsewhere.code, `${state}: erase + withdraw`).toBe(GUARD);
          // Erasing one field alone is the arm too.
          expect((await attempt(client, `UPDATE workplace_requests SET typed_place = NULL WHERE request_id = $1`, [r3.requestId])).code).toBeNull();
        }
      }
    });

    it('THE RENAME ARM — district ALONE moves on a pending / suggested request; ⛔ on a final one; ⛔ with another column', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      for (const state of WORKPLACE_REQUEST_STATES) {
        const r = await seedRequest(client, l);
        await moveTo(client, l, r.requestId, state);
        const open = state === 'pending' || state === 'suggested';
        const res = await attempt(client, `UPDATE workplace_requests SET district = 'Gaya' WHERE request_id = $1`, [r.requestId]);
        expect(res.code, state).toBe(open ? null : GUARD);
      }
      const r = await seedRequest(client, l);
      const both = await attempt(client, `UPDATE workplace_requests SET district = 'Gaya', state = 'closed', resolved_at = now() WHERE request_id = $1`, [r.requestId]);
      expect(both.code).toBe(GUARD);
      // The new spelling must be one of the list's (the FK).
      expect((await attempt(client, `UPDATE workplace_requests SET district = 'Nalanda' WHERE request_id = $1`, [r.requestId])).code).toBe('23503');
    });
  });

  describe('member_postings — the three new columns', () => {
    it('at most one of the two; a retirement names ⛔ neither; started_on ≥ 1950; another Pariwar\'s workplace refused (23503)', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const r = await seedRequest(client, l);
      const ins = (cols: string, vals: string, params: unknown[] = []) =>
        attempt(client, `INSERT INTO member_postings (pariwar_id, member_id, district, ${cols}) VALUES ($1, $2, 'Patna', ${vals})`, [
          l.pariwarId, r.memberId, ...params,
        ]);
      expect((await ins('workplace_id, started_on', '$3, $4', [l.schoolId, '2019-07-01'])).code).toBeNull();
      expect((await ins('workplace_request_id, started_on', '$3, $4', [r.requestId, '2019-07-01'])).code).toBeNull();
      expect((await ins('workplace_id, workplace_request_id', '$3, $4', [l.schoolId, r.requestId])).code).toBe('23514');
      expect((await ins('is_retirement, workplace_id', 'true, $3', [l.schoolId])).code).toBe('23514');
      expect((await ins('is_retirement, started_on', 'true, $3', ['2024-03-31'])).code).toBeNull();
      expect((await ins('started_on', '$3', ['1949-12-31'])).code).toBe('23514');
      // A legacy, district-only row (⛔ no backfill) still writes.
      expect((await attempt(client, `INSERT INTO member_postings (pariwar_id, member_id, district) VALUES ($1, $2, 'Free Text')`, [l.pariwarId, r.memberId])).code).toBeNull();
      const other = await seedList(client);
      expect((await ins('workplace_id', '$3', [other.schoolId])).code).toBe('23503');
    });
  });

  describe('RLS', () => {
    it('RLS is ENABLED + FORCED; per-command policies (⛔ DELETE, ⛔ FOR ALL) carrying the ONE scope expression', async () => {
      const { client } = getTx();
      for (const t of TABLES) {
        const { rows } = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`, [t]);
        expect(rows[0], t).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
        const pol = await client.query<{ polname: string; polcmd: string }>(
          `SELECT polname, polcmd FROM pg_policy WHERE polrelid = $1::regclass ORDER BY polname`,
          [t],
        );
        expect(pol.rows.map((r) => `${r.polname}:${r.polcmd}`)).toEqual([
          `${t}_tenant_isolation_insert:a`,
          `${t}_tenant_isolation_select:r`,
          `${t}_tenant_isolation_update:w`,
        ]);
      }
      const { rows } = await client.query<{ tablename: string; cmd: string; permissive: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT tablename, cmd, permissive, array_to_string(roles, ',') AS roles, qual, with_check FROM pg_policies WHERE tablename = ANY($1)`,
        [[...TABLES]],
      );
      expect(rows).toHaveLength(12);
      const scope = /^\(?pariwar_id = \(?NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)?::uuid\)?$/;
      for (const r of rows) {
        expect(`${r.permissive}:${r.roles}`).toBe('PERMISSIVE:twt_app');
        const clauses = { SELECT: [r.qual], INSERT: [r.with_check], UPDATE: [r.qual, r.with_check] }[r.cmd as 'SELECT' | 'INSERT' | 'UPDATE'];
        for (const c of clauses) expect(c, `${r.tablename}:${r.cmd}`).toMatch(scope);
      }
    });

    it('a cross-tenant reader sees nothing; a cross-tenant insert is refused; the unscoped probe sees nothing', async () => {
      const { client } = getTx();
      const a = await seedList(client);
      const ra = await seedRequest(client, a);
      const b = await seedList(client);
      await enterAppScope(client, b.pariwarId);
      for (const t of TABLES) {
        const { rows } = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${t} WHERE pariwar_id = $1`, [a.pariwarId]);
        expect(rows[0]!.n, t).toBe('0');
      }
      expect((await client.query(`SELECT 1 FROM workplace_requests WHERE request_id = $1`, [ra.requestId])).rowCount).toBe(0);
      const cross = await attempt(client, `INSERT INTO workplace_districts (pariwar_id, district) VALUES ($1, 'Nalanda')`, [a.pariwarId]);
      expect(cross.code).toBe('42501');
      const crossWp = await attempt(client, `INSERT INTO workplaces (pariwar_id, kind, name, district, source) VALUES ($1, 'office', 'X', 'Patna', 'staff')`, [a.pariwarId]);
      expect(crossWp.code).toBe('42501');
      // The UPDATE leg matches 0 rows of another tenant.
      expect((await attempt(client, `UPDATE workplaces SET status = 'delisted' WHERE workplace_id = $1`, [a.schoolId])).rowCount).toBe(0);
      await client.query('RESET ROLE');
      // `SET LOCAL app.pariwar_id` outlives the role change — clear it, or the "unscoped" probe is still B's scope.
      await client.query(`SELECT set_config('app.pariwar_id', '', true)`);
      await enterAppRoleNoScope(client);
      for (const t of TABLES) {
        const { rows } = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${t}`);
        expect(rows[0]!.n, t).toBe('0');
      }
    });

    it('IN SCOPE, twt_app runs the erasure scrub and the rename (the UPDATE policy + the column grants)', async () => {
      const { client } = getTx();
      const l = await seedList(client);
      const r = await seedRequest(client, l);
      const done = await seedRequest(client, l);
      await moveTo(client, l, done.requestId, 'confirmed');
      await enterAppScope(client, l.pariwarId);
      const scrubOpen = await client.query(
        `UPDATE workplace_requests SET typed_name = NULL, typed_place = NULL, state = 'closed', resolved_at = now() WHERE request_id = $1`,
        [r.requestId],
      );
      expect(scrubOpen.rowCount).toBe(1);
      const scrubDone = await client.query(`UPDATE workplace_requests SET typed_name = NULL, typed_place = NULL WHERE request_id = $1`, [done.requestId]);
      expect(scrubDone.rowCount).toBe(1);
      const open = await seedRequestAsApp(client, l, r.memberId);
      expect((await client.query(`UPDATE workplace_requests SET district = 'Gaya' WHERE request_id = $1`, [open])).rowCount).toBe(1);
      expect((await client.query(`UPDATE workplace_districts SET status = 'retired', updated_at = now() WHERE pariwar_id = $1 AND district = 'Patna'`, [l.pariwarId])).rowCount).toBe(1);
      expect((await attempt(client, `DELETE FROM workplace_requests WHERE request_id = $1`, [open])).code).toBe('42501');
      expect((await attempt(client, `DELETE FROM workplace_districts WHERE pariwar_id = $1`, [l.pariwarId])).code).toBe('42501');
    });
  });
});

/** In scope as twt_app: a pending request (the INSERT policy + grant). */
async function seedRequestAsApp(client: Client, l: Listed, memberId: string): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'Middle School', '2018-04-01')`,
    [id, l.pariwarId, memberId],
  );
  return id;
}

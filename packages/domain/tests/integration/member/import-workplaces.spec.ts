// Story 6.36a (Task 3; AC2) — the workplace-list import and the district rename, against live Postgres on the committed
// fixture (`tests/fixtures/workplaces-fixture.csv` — 35 rows: 18 PATNA + 12 GAYA schools; a duplicate code; a malformed
// code; a row with ⛔ name; another state's row; a quoted name with a comma). Per-test ROLLBACK, as `twt_app` in scope.
// ⚠ ⛔ Never the real IDP file here or in CI.
//   · the first run's counts and rows; a SECOND identical run changes 0 rows;
//   · an unmapped district refuses the WHOLE run (⛔ a batch, ⛔ a spelling);
//   · a corrected map moves a school's district; a delisting (only within the file's districts) and a re-listing;
//   · a staff office untouched; a staff school sharing a code KEPT (counted); a one-district file changes ⛔ the other;
//   · the rename: `<old>` retired and ⛔ offered, every workplace + open request moved, closed / confirmed requests and
//     postings keep `<old>`, the count of postings left on `<old>`, the batch row (⛔ source fields);
//   · a stale map naming a retired spelling refused; the same map with `--relist-district` lists it again;
//   · a run that reads ⛔ a school of the state (header-only; the wrong `--state`) is refused — ⛔ a batch row, ⛔ a
//     spelling, the Pariwar still has ⛔ list (review 2026-10-15);
//   · the CLI: `--dry-run` prints the counts and writes ⛔ nothing; a refused run exits 1; a bad source VALUE exits 1
//     BEFORE the file is read.

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { listWorkplaceDistricts, pariwarHasWorkplaceList } from '../../../src/member/workplace.js';
import {
  csvObjects,
  IDP_REQUIRED_COLUMNS,
  IDP_UDISE_ATTRIBUTION,
  parseCsv,
  renameWorkplaceDistrict,
  runWorkplaceImport,
  WorkplaceImportRefusedError,
} from '../../../src/member/workplace-import.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(here, '../../fixtures/workplaces-fixture.csv');
const FIXTURE_MAP = path.resolve(here, '../../fixtures/workplaces-fixture-district-map.csv');
const PKG = path.resolve(here, '../../..');

const SOURCE = {
  name: 'UDISE – Basic Details of Schools (fixture)',
  url: 'https://ckan.indiadataportal.com/dataset/udise',
  retrievedOn: '2026-10-14',
  licence: 'ODC-BY-1.0',
  attribution: IDP_UDISE_ATTRIBUTION,
};

/** The fixture's rows, optionally filtered / rewritten. */
async function fixtureRows(edit?: (rows: Record<string, string>[]) => Record<string, string>[]): Promise<AsyncIterable<Record<string, string>>> {
  const rows: Record<string, string>[] = [];
  for await (const r of csvObjects(parseCsv(createReadStream(FIXTURE, { encoding: 'utf8' })), IDP_REQUIRED_COLUMNS)) rows.push(r);
  return Readable.from(edit ? edit(rows) : rows);
}

async function mapOf(entries: Record<string, string>): Promise<Map<string, string>> {
  return new Map(Object.entries(entries));
}

const FULL_MAP = { PATNA: 'Patna', GAYA: 'Gaya' };

async function importAs(
  db: Db,
  pariwarId: string,
  opts: { map?: Record<string, string>; edit?: (rows: Record<string, string>[]) => Record<string, string>[]; relist?: string[]; state?: string } = {},
) {
  return runWorkplaceImport(db, {
    pariwarId: toPariwarId(pariwarId),
    stateCode: opts.state ?? '10',
    rows: await fixtureRows(opts.edit),
    districtMap: await mapOf(opts.map ?? FULL_MAP),
    relistDistricts: opts.relist ?? [],
    source: SOURCE,
  });
}

interface WRow {
  workplace_id: string;
  name: string;
  district: string;
  status: string;
  source: string;
  udise_school_code: string | null;
  block_code: string | null;
  pincode: string | null;
  village_name: string | null;
  import_batch_id: string | null;
  updated_at: Date;
}

async function workplacesOf(pariwarId: string): Promise<WRow[]> {
  const { rows } = await getTx().client.query<WRow>(`SELECT * FROM workplaces WHERE pariwar_id = $1 ORDER BY name, workplace_id`, [pariwarId]);
  return rows;
}

const byCode = (rows: WRow[], code: string) => rows.find((r) => r.udise_school_code === code);

describe.skipIf(!hasDatabase)('Story 6.36a — the workplace import and the district rename (live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('the first run: the counts, the rows (first of a duplicate code; a quoted name; a bad PIN → NULL; the block code), the spellings, the batch', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    const c = await importAs(tx, p);
    expect(c).toMatchObject({
      rowsRead: 35,
      rowsOtherState: 1,
      rowsInserted: 31,
      rowsUpdated: 0,
      rowsDelisted: 0,
      rowsRelisted: 0,
      rowsRefused: 2,
      rowsDuplicate: 1,
      rowsSkippedStaff: 0,
      districtsRetired: 0,
      districtsAdded: 2,
    });
    const rows = await workplacesOf(p);
    expect(rows).toHaveLength(31);
    expect(rows.every((r) => r.source === 'import' && r.status === 'listed' && r.import_batch_id === c.batchId)).toBe(true);
    expect(byCode(rows, '10280000101')).toMatchObject({ name: 'GMS RAMPUR', district: 'Patna', block_code: '102800', pincode: '801503', village_name: 'RAMPUR' });
    expect(byCode(rows, '10280000160')).toMatchObject({ name: 'GOVT. MIDDLE SCHOOL "NEW", DIGHA', pincode: null });
    expect(byCode(rows, '09170000101')).toBeUndefined();
    expect(await listWorkplaceDistricts(tx, toPariwarId(p))).toEqual(['Gaya', 'Patna']);
    const { rows: batches } = await client.query(`SELECT * FROM workplace_import_batches WHERE pariwar_id = $1`, [p]);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      status: 'finished',
      source_name: SOURCE.name,
      source_url: SOURCE.url,
      licence: 'ODC-BY-1.0',
      attribution: IDP_UDISE_ATTRIBUTION,
      state_code: '10',
      rows_read: 35,
      rows_inserted: 31,
      rows_refused: 2,
      rows_duplicate: 1,
      districts_retired: 0,
    });
  });

  it('a SECOND identical run changes 0 rows (⛔ a rewrite of an unchanged school)', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await importAs(tx, p);
    const before = await workplacesOf(p);
    const c = await importAs(tx, p);
    expect(c).toMatchObject({ rowsInserted: 0, rowsUpdated: 0, rowsDelisted: 0, rowsRelisted: 0, rowsSkippedStaff: 0, districtsAdded: 0 });
    expect(await workplacesOf(p)).toEqual(before);
  });

  it('an UNMAPPED district refuses the WHOLE run — ⛔ a batch row, ⛔ a spelling, ⛔ a school', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await expect(importAs(tx, p, { map: { PATNA: 'Patna' } })).rejects.toThrow(/no spelling for "GAYA"/);
    for (const t of ['workplace_import_batches', 'workplace_districts', 'workplaces']) {
      expect((await client.query(`SELECT 1 FROM ${t} WHERE pariwar_id = $1`, [p])).rowCount, t).toBe(0);
    }
  });

  it('a run that reads ⛔ a school of the state is REFUSED — a header-only file, or the wrong --state — ⛔ a batch row, ⛔ a spelling; the Pariwar still has ⛔ list', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await expect(importAs(tx, p, { edit: () => [] })).rejects.toThrow(/no school of state "10" was read \(rows read 0, other state 0, refused 0\) — nothing was written/);
    // Every row of the fixture is "another state" under --state 11 (the malformed-code row falls back to its `state_code` column — 10).
    await expect(importAs(tx, p, { state: '11' })).rejects.toThrow(/no school of state "11" was read \(rows read 35, other state 35, refused 0\)/);
    // Under --state 09 the one Lucknow row IS in state — and its district is unmapped, which refuses first.
    await expect(importAs(tx, p, { state: '09' })).rejects.toThrow(/no spelling for "LUCKNOW"/);
    for (const t of ['workplace_import_batches', 'workplace_districts', 'workplaces']) {
      expect((await client.query(`SELECT 1 FROM ${t} WHERE pariwar_id = $1`, [p])).rowCount, t).toBe(0);
    }
    expect(await listWorkplaceDistricts(tx, toPariwarId(p))).toEqual([]);
    expect(await pariwarHasWorkplaceList(tx, toPariwarId(p))).toBe(false);
  });

  it('a corrected map MOVES the schools to the new spelling (the old spelling stays listed — ⛔ an import retires one)', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await importAs(tx, p, { map: { PATNA: 'Patna', GAYA: 'Gya' } });
    const c = await importAs(tx, p, { map: FULL_MAP });
    expect(c).toMatchObject({ rowsUpdated: 12, rowsInserted: 0, rowsDelisted: 0, districtsAdded: 1 });
    const rows = await workplacesOf(p);
    expect(rows.filter((r) => r.district === 'Gaya')).toHaveLength(12);
    expect(rows.filter((r) => r.district === 'Gya')).toHaveLength(0);
    expect(await listWorkplaceDistricts(tx, toPariwarId(p))).toEqual(['Gaya', 'Gya', 'Patna']);
  });

  it('a school missing from a later file is DELISTED (⛔ deleted); present again, it is RE-LISTED; a staff office is untouched', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await importAs(tx, p);
    const officeId = randomUUID();
    await client.query(`INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, source) VALUES ($1, $2, 'office', 'DEO OFFICE PATNA', 'Patna', 'staff')`, [officeId, p]);
    const gone = new Set(['10280000101', '10280000102']);
    const c = await importAs(tx, p, { edit: (rows) => rows.filter((r) => !gone.has(r['udise_school_code']!)) });
    expect(c).toMatchObject({ rowsDelisted: 2, rowsInserted: 0, rowsUpdated: 0 });
    let rows = await workplacesOf(p);
    expect(rows.filter((r) => r.status === 'delisted').map((r) => r.udise_school_code).sort()).toEqual([...gone].sort());
    expect(rows).toHaveLength(32);
    const again = await importAs(tx, p);
    expect(again).toMatchObject({ rowsRelisted: 2, rowsDelisted: 0, rowsInserted: 0, rowsUpdated: 0 });
    rows = await workplacesOf(p);
    expect(rows.filter((r) => r.status === 'delisted')).toEqual([]);
    expect(rows.find((r) => r.workplace_id === officeId)).toMatchObject({ status: 'listed', source: 'staff', district: 'Patna', import_batch_id: null });
  });

  it('a staff school sharing a code is KEPT and counted (⛔ ever overwritten by an import)', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district) VALUES ($1, 'Patna')`, [p]);
    await client.query(
      `INSERT INTO workplaces (pariwar_id, kind, name, district, source, udise_school_code) VALUES ($1, 'school', 'Rampur School (added by the Super Admin)', 'Patna', 'staff', '10280000101')`,
      [p],
    );
    await enterAppScope(client, p);
    const c = await importAs(tx, p);
    expect(c).toMatchObject({ rowsInserted: 30, rowsSkippedStaff: 1 });
    expect(byCode(await workplacesOf(p), '10280000101')).toMatchObject({ name: 'Rampur School (added by the Super Admin)', source: 'staff', import_batch_id: null });
    // A later run with that code missing ⛔ delists the staff row.
    const later = await importAs(tx, p, { edit: (rows) => rows.filter((r) => r['udise_school_code'] !== '10280000101') });
    expect(later.rowsDelisted).toBe(0);
    expect(byCode(await workplacesOf(p), '10280000101')?.status).toBe('listed');
  });

  it('a ONE-DISTRICT file changes ⛔ the other district — ⛔ its spelling, ⛔ a school', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await importAs(tx, p);
    const patnaBefore = (await workplacesOf(p)).filter((r) => r.district === 'Patna');
    const spellingBefore = (await client.query(`SELECT * FROM workplace_districts WHERE pariwar_id = $1 AND district = 'Patna'`, [p])).rows;
    const c = await importAs(tx, p, { map: { GAYA: 'Gaya' }, edit: (rows) => rows.filter((r) => r['district_name'] === 'GAYA') });
    expect(c).toMatchObject({ rowsRead: 12, rowsDelisted: 0, rowsInserted: 0, rowsUpdated: 0 });
    expect((await workplacesOf(p)).filter((r) => r.district === 'Patna')).toEqual(patnaBefore);
    expect((await client.query(`SELECT * FROM workplace_districts WHERE pariwar_id = $1 AND district = 'Patna'`, [p])).rows).toEqual(spellingBefore);
  });

  it('THE RENAME: <old> retired and ⛔ offered; every workplace and OPEN request moved; closed / confirmed requests and postings keep <old>', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    const m = await seedMember(tx, p, { state: 'active' });
    await enterAppScope(client, p);
    await importAs(tx, p);
    const officeId = randomUUID();
    await client.query(`INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, source) VALUES ($1, $2, 'office', 'DEO OFFICE PATNA', 'Patna', 'staff')`, [officeId, p]);
    const school = byCode(await workplacesOf(p), '10280000101')!;
    const req = async (state: string): Promise<string> => {
      const id = randomUUID();
      await client.query(`INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'A School', '2020-01-01')`, [id, p, m]);
      if (state === 'suggested' || state === 'confirmed') {
        await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_at = now() WHERE request_id = $1`, [id, school.workplace_id]);
      }
      if (state === 'confirmed' || state === 'closed') {
        await client.query(`UPDATE workplace_requests SET state = $2, resolved_at = now() WHERE request_id = $1`, [id, state]);
      }
      return id;
    };
    const pending = await req('pending');
    const suggested = await req('suggested');
    const confirmed = await req('confirmed');
    const closed = await req('closed');
    await client.query(`INSERT INTO member_postings (pariwar_id, member_id, district, workplace_id, started_on) VALUES ($1, $2, 'Patna', $3, '2019-01-01')`, [p, m, school.workplace_id]);
    await client.query(`INSERT INTO member_postings (pariwar_id, member_id, district) VALUES ($1, $2, 'Patna')`, [p, m]);

    const r = await renameWorkplaceDistrict(tx, { pariwarId: toPariwarId(p), from: 'Patna', to: 'Patna Sadar' });
    expect(r).toMatchObject({ workplacesMoved: 20, requestsMoved: 2, postingsOnOld: 2 });
    expect(await listWorkplaceDistricts(tx, toPariwarId(p))).toEqual(['Gaya', 'Patna Sadar']);
    const statuses = (await client.query<{ district: string; status: string }>(`SELECT district, status FROM workplace_districts WHERE pariwar_id = $1 ORDER BY district`, [p])).rows;
    expect(statuses).toEqual([
      { district: 'Gaya', status: 'listed' },
      { district: 'Patna', status: 'retired' },
      { district: 'Patna Sadar', status: 'listed' },
    ]);
    const rows = await workplacesOf(p);
    expect(rows.filter((x) => x.district === 'Patna')).toEqual([]);
    expect(rows.find((x) => x.workplace_id === officeId)?.district).toBe('Patna Sadar');
    const reqDistrict = async (id: string) =>
      (await client.query<{ district: string }>(`SELECT district FROM workplace_requests WHERE request_id = $1`, [id])).rows[0]!.district;
    expect(await reqDistrict(pending)).toBe('Patna Sadar');
    expect(await reqDistrict(suggested)).toBe('Patna Sadar');
    expect(await reqDistrict(confirmed)).toBe('Patna');
    expect(await reqDistrict(closed)).toBe('Patna');
    const postings = (await client.query<{ district: string }>(`SELECT district FROM member_postings WHERE member_id = $1`, [m])).rows;
    expect(postings.map((x) => x.district)).toEqual(['Patna', 'Patna']);
    const { rows: batch } = await client.query(`SELECT * FROM workplace_import_batches WHERE batch_id = $1`, [r.batchId]);
    expect(batch[0]).toMatchObject({
      source_name: 'rename',
      source_url: null,
      retrieved_on: null,
      licence: null,
      attribution: null,
      state_code: null,
      status: 'finished',
      districts_retired: 1,
      rows_updated: 20,
    });
    // ⛔ A second rename of the retired spelling.
    await expect(renameWorkplaceDistrict(tx, { pariwarId: toPariwarId(p), from: 'Patna', to: 'Patna City' })).rejects.toBeInstanceOf(WorkplaceImportRefusedError);
  });

  it('a STALE map naming a retired spelling is refused; with --relist-district it is listed again and its schools return', async () => {
    const { client, tx } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    await importAs(tx, p);
    await renameWorkplaceDistrict(tx, { pariwarId: toPariwarId(p), from: 'Patna', to: 'Patna Sadar' });
    const batchesBefore = (await client.query(`SELECT 1 FROM workplace_import_batches WHERE pariwar_id = $1`, [p])).rowCount;
    await expect(importAs(tx, p)).rejects.toThrow(/RETIRED spelling "Patna"/);
    expect((await client.query(`SELECT 1 FROM workplace_import_batches WHERE pariwar_id = $1`, [p])).rowCount).toBe(batchesBefore);
    await expect(importAs(tx, p, { relist: ['Nalanda'] })).rejects.toThrow(/not a spelling in the district map/);
    const c = await importAs(tx, p, { relist: ['Patna'] });
    expect(c).toMatchObject({ districtsRelisted: 1, rowsUpdated: 19, rowsDelisted: 0 });
    expect(await listWorkplaceDistricts(tx, toPariwarId(p))).toEqual(['Gaya', 'Patna', 'Patna Sadar']);
    expect((await workplacesOf(p)).filter((r) => r.district === 'Patna')).toHaveLength(19);
  });

  describe('the CLI', () => {
    const run = promisify(execFile);
    const cli = (args: string[]) =>
      run('npx', ['tsx', 'scripts/import-workplaces.ts', ...args], { cwd: PKG, env: { ...process.env, DATABASE_URL: DATABASE_URL! } }).then(
        (r) => ({ code: 0, out: r.stdout, err: r.stderr }),
        (e: { code: number; stdout: string; stderr: string }) => ({ code: e.code, out: e.stdout, err: e.stderr }),
      );
    const base = (p: string) => [
      '--pariwar', p, '--state', '10', '--file', FIXTURE, '--district-map', FIXTURE_MAP, '--source', SOURCE.name, '--url', SOURCE.url,
      '--retrieved', SOURCE.retrievedOn, '--licence', SOURCE.licence, '--attribution', SOURCE.attribution,
    ];

    it('--dry-run prints the same counts and writes NOTHING (a fresh Pariwar has ⛔ row afterwards, read on a separate connection)', async () => {
      const p = randomUUID();
      const r = await cli([...base(p), '--dry-run']);
      expect(r.code, r.err).toBe(0);
      expect(r.out).toMatch(/DRY RUN — nothing was written/);
      expect(r.out).toMatch(/rows read: 35 \(another state: 1\)/);
      expect(r.out).toMatch(/inserted: 31 {3}updated: 0 {3}re-listed: 0 {3}delisted: 0/);
      expect(r.out).toMatch(/refused: 2 {3}duplicate codes: 1 {3}kept staff rows: 0/);
      const probe = new pg.Client({ connectionString: DATABASE_URL });
      await probe.connect();
      try {
        for (const t of ['workplace_import_batches', 'workplace_districts', 'workplaces']) {
          expect((await probe.query(`SELECT 1 FROM ${t} WHERE pariwar_id = $1`, [p])).rowCount, t).toBe(0);
        }
      } finally {
        await probe.end();
      }
    });

    it('a refused run (an unmapped district) exits 1 with the reason, also under --dry-run; a bad argument exits 2', async () => {
      const p = randomUUID();
      const args = base(p);
      args[args.indexOf('--district-map') + 1] = path.resolve(here, '../../fixtures/workplaces-fixture-district-map-patna-only.csv');
      const r = await cli([...args, '--dry-run']);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/no spelling for "GAYA"/);
      const bad = await cli(['--pariwar', 'nope']);
      expect(bad.code).toBe(2);
    });

    it('a header-only file exits 1 ("no school of state") and writes NOTHING; a bad source VALUE exits 1 BEFORE the file is read', async () => {
      const p = randomUUID();
      const args = base(p);
      args[args.indexOf('--file') + 1] = path.resolve(here, '../../fixtures/workplaces-fixture-header-only.csv');
      const empty = await cli(args);
      expect(empty.code).toBe(1);
      expect(empty.err).toMatch(/no school of state "10" was read \(rows read 0, other state 0, refused 0\) — nothing was written/);
      const probe = new pg.Client({ connectionString: DATABASE_URL });
      await probe.connect();
      try {
        for (const t of ['workplace_import_batches', 'workplace_districts']) {
          expect((await probe.query(`SELECT 1 FROM ${t} WHERE pariwar_id = $1`, [p])).rowCount, t).toBe(0);
        }
      } finally {
        await probe.end();
      }
      // The value checks precede the read: the file does ⛔ exist, and the refusal names the argument, ⛔ ENOENT.
      const withFile = (file: string, flag: string, value: string) => {
        const a = base(p);
        a[a.indexOf('--file') + 1] = file;
        a[a.indexOf(flag) + 1] = value;
        return a;
      };
      const missing = path.resolve(here, '../../fixtures/does-not-exist.csv');
      const date = await cli(withFile(missing, '--retrieved', '2026-02-30'));
      expect(date.code).toBe(1);
      expect(date.err).toMatch(/refused — --retrieved "2026-02-30" is not a calendar date/);
      const reserved = await cli(withFile(missing, '--source', 'rename'));
      expect(reserved.code).toBe(1);
      expect(reserved.err).toMatch(/refused — --source "rename" is reserved/);
      const long = await cli(withFile(missing, '--source', 'x'.repeat(201)));
      expect(long.code).toBe(1);
      expect(long.err).toMatch(/refused — --source must be 1–200 characters/);
      const blank = await cli(withFile(missing, '--licence', '   '));
      expect(blank.code).toBe(1);
      expect(blank.err).toMatch(/refused — --licence must not be blank/);
    });
  });
});

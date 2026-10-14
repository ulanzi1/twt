// Story 6.36a (Task 3) — the import tool's CSV reader, district-map reader and the pure READ phase of the import
// (`readWorkplaceImportFile` — review 2026-10-15: the file is read BEFORE the transaction opens). DB-free.

import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  csvObjects,
  IDP_REQUIRED_COLUMNS,
  parseCsv,
  readDistrictMap,
  readWorkplaceImportFile,
  WorkplaceImportRefusedError,
} from '../../src/member/workplace-import.js';

async function all<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

/** Feed `text` in chunks of `size` characters (a record boundary may fall anywhere). */
function chunked(text: string, size: number): AsyncIterable<string> {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return Readable.from(parts);
}

describe('parseCsv', () => {
  it('reads quoted fields with commas, "" escapes and line breaks; CRLF and LF; drops a BOM — at ANY chunk boundary', async () => {
    const text = '﻿a,b,c\r\n1,"x, ""y""",3\n"multi\nline",,"end"\n';
    for (const size of [1, 2, 3, 5, 64]) {
      expect(await all(parseCsv(chunked(text, size)))).toEqual([
        ['a', 'b', 'c'],
        ['1', 'x, "y"', '3'],
        ['multi\nline', '', 'end'],
      ]);
    }
  });

  it('a lone CR (classic-Mac endings) ends a record — the same rows as the LF file, at ANY chunk boundary; a CR inside quotes is kept', async () => {
    const lf = 'a,b,c\n1,"x, ""y""",3\n"multi\nline",,"end"\n\n4,5,6\n';
    const expected = await all(parseCsv(chunked(lf, 64)));
    const cr = lf.replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, '\r'); // every UNQUOTED LF → CR
    expect(cr.split('\n')).toHaveLength(2); // only the QUOTED LF survives the rewrite
    for (const size of [1, 2, 3, 5, 64]) {
      expect(await all(parseCsv(chunked(cr, size)))).toEqual(expected);
    }
    // CRLF, LF and CR mixed in one file — and a CRLF split across a chunk boundary is ONE record end.
    expect(await all(parseCsv(chunked('a,b\r\n1,2\r3,4\n5,6\r\n', 1)))).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ]);
    expect(await all(parseCsv(chunked('"a\rb",c\r1,2', 3)))).toEqual([
      ['a\rb', 'c'],
      ['1', '2'],
    ]);
  });

  it('a last record with ⛔ trailing newline is still read; an empty quoted field is empty', async () => {
    expect(await all(parseCsv(chunked('a,b\n"",2', 4)))).toEqual([
      ['a', 'b'],
      ['', '2'],
    ]);
  });

  it('Buffer chunks: a multi-byte character split across two chunks is reassembled (⛔ mojibake)', async () => {
    const bytes = Buffer.from('name\nमध्य विद्यालय\n', 'utf8');
    for (const size of [1, 2, 5]) {
      const parts: Buffer[] = [];
      for (let i = 0; i < bytes.length; i += size) parts.push(bytes.subarray(i, i + size));
      expect(await all(parseCsv(Readable.from(parts)))).toEqual([['name'], ['मध्य विद्यालय']]);
    }
  });

  it('refuses a file that ends inside a quoted field', async () => {
    await expect(all(parseCsv(chunked('a,b\n"open,2\n', 3)))).rejects.toBeInstanceOf(WorkplaceImportRefusedError);
  });
});

describe('csvObjects', () => {
  it('keys each row by the header; skips a blank line; refuses a missing required column', async () => {
    const rows = await all(csvObjects(parseCsv(chunked('x,y\n1,2\n\n3\n', 2)), ['x']));
    expect(rows).toEqual([
      { x: '1', y: '2' },
      { x: '3', y: '' },
    ]);
    await expect(all(csvObjects(parseCsv(chunked('x,y\n1,2\n', 8)), ['udise_school_code']))).rejects.toThrow(/no column "udise_school_code"/);
  });
});

describe('readWorkplaceImportFile (the pure read phase)', () => {
  const HEADER = 'district_name,school_name,udise_school_code,cluster_name,village_name,pincode\n';
  const MAP = new Map([['PATNA', 'Patna']]);
  const read = (csv: string, stateCode = '10') =>
    readWorkplaceImportFile({ stateCode, rows: csvObjects(parseCsv(chunked(csv, 16)), IDP_REQUIRED_COLUMNS), districtMap: MAP, relistDistricts: [] });

  it('refuses a file with ⛔ a school of the state — header-only, or every row another state — naming the counts', async () => {
    await expect(read(HEADER)).rejects.toThrow(/no school of state "10" was read \(rows read 0, other state 0, refused 0\) — nothing was written/);
    await expect(read(`${HEADER}PATNA,GMS RAMPUR,09280000101,,,\n`)).rejects.toThrow(/no school of state "10" was read \(rows read 1, other state 1, refused 0\)/);
    await expect(read(`${HEADER}PATNA,GMS RAMPUR,10280000101,,,\n`, '09')).rejects.toThrow(/no school of state "09"/);
    await expect(read(`${HEADER}PATNA,,10280000101,,,\n`)).rejects.toThrow(/\(rows read 1, other state 0, refused 1\)/);
  });

  it('refuses a row whose cluster or village name is over 200 characters (counted, ⛔ fatal; its code is still PRESENT)', async () => {
    const long = 'क'.repeat(201);
    const ok = 'क'.repeat(200);
    const file = await read(
      `${HEADER}PATNA,GMS RAMPUR,10280000101,${long},RAMPUR,801503\nPATNA,GMS DIGHA,10280000102,DIGHA,${long},801503\nPATNA,GMS PATNA,10280000103,${ok},${ok},801503\n`,
    );
    expect(file).toMatchObject({ rowsRead: 3, rowsOtherState: 0, rowsRefused: 2, rowsDuplicate: 0 });
    expect([...file.schools.keys()]).toEqual(['10280000103']);
    expect(file.schools.get('10280000103')).toMatchObject({ clusterName: ok, villageName: ok, district: 'Patna', blockCode: '102800', pincode: '801503' });
    expect([...file.presentCodes].sort()).toEqual(['10280000101', '10280000102', '10280000103']);
  });

  it('an unmapped district refuses before the zero-school check', async () => {
    await expect(read(`${HEADER}GAYA,GMS BODHGAYA,10350000101,,,\n`)).rejects.toThrow(/no spelling for "GAYA"/);
  });
});

describe('readDistrictMap', () => {
  it('maps each file district (trimmed) to the Pariwar spelling (trimmed)', async () => {
    const map = await readDistrictMap(parseCsv(chunked('file_district,pariwar_district\n PATNA , Patna \nGAYA,Gaya\nPATNA,Patna\n', 7)));
    expect([...map]).toEqual([
      ['PATNA', 'Patna'],
      ['GAYA', 'Gaya'],
    ]);
  });

  it('refuses a district mapped twice, an incomplete row, an empty map and a wrong header', async () => {
    await expect(readDistrictMap(parseCsv(chunked('file_district,pariwar_district\nPATNA,Patna\nPATNA,Patna City\n', 9)))).rejects.toThrow(/maps "PATNA" twice/);
    await expect(readDistrictMap(parseCsv(chunked('file_district,pariwar_district\nPATNA,\n', 9)))).rejects.toThrow(/incomplete row/);
    await expect(readDistrictMap(parseCsv(chunked('file_district,pariwar_district\n', 9)))).rejects.toThrow(/empty/);
    await expect(readDistrictMap(parseCsv(chunked('from,to\nPATNA,Patna\n', 9)))).rejects.toThrow(/no column/);
  });
});

// Story 6.36a (Task 3) — the import tool's CSV reader and district-map reader. DB-free.

import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { csvObjects, parseCsv, readDistrictMap, WorkplaceImportRefusedError } from '../../src/member/workplace-import.js';

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

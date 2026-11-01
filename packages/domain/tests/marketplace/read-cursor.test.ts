// Story 12.2 (`2026-11-01-433` QE16 as AMENDED by BigDev — the STRICT base64url decode; AC8; TR19, TR24, TR25) —
// `encodeModuleCursor` / `decodeModuleCursor`. DB-free.
//
// Every malformed vector must throw `ModuleCursorInvalidError` IN JS, so it can never reach a `::timestamptz` / `::uuid`
// cast on the hook's read transaction (a cast failure aborts it and answers 500).

import { describe, expect, it } from 'vitest';

import { ModuleCursorInvalidError } from '../../src/marketplace/errors.js';
import { MODULE_CURSOR_MAX_LENGTH, decodeModuleCursor, encodeModuleCursor } from '../../src/marketplace/read.js';
import type { ModuleId } from '../../src/ids/index.js';

const M = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const C = '2026-11-01 05:30:00.123456+00';
const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64url');
const raw = (bytes: number[]): string => Buffer.from(bytes).toString('base64url');
const good = b64(JSON.stringify({ c: C, m: M }));

function expectInvalid(s: unknown): void {
  expect(() => decodeModuleCursor(s)).toThrow(ModuleCursorInvalidError);
}

describe('encodeModuleCursor → decodeModuleCursor round-trips', () => {
  it.each([
    ['a 6-digit fraction', '2026-11-01 05:30:00.123456+00'],
    ['no fraction (Postgres omits a zero one)', '2026-11-01 05:30:00+00'],
    ['a +05:30 offset (a non-UTC session)', '2026-11-01 11:00:00.5+05:30'],
    ['a negative offset with seconds', '2026-11-01 00:00:00-03:30:15'],
  ])('%s', (_l, c) => {
    const cursor = { createdAtExact: c, moduleId: M as ModuleId };
    const s = encodeModuleCursor(cursor);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/); // no padding, URL-safe
    expect(decodeModuleCursor(s)).toEqual(cursor);
  });

  it('the canonical cursor decodes, and is well under the length bound', () => {
    expect(decodeModuleCursor(good)).toEqual({ createdAtExact: C, moduleId: M });
    expect(good.length).toBeLessThan(MODULE_CURSOR_MAX_LENGTH);
    expect(MODULE_CURSOR_MAX_LENGTH).toBe(256);
  });
});

describe('decodeModuleCursor refuses (ModuleCursorInvalidError)', () => {
  it.each([
    ['a non-string', 42],
    ['undefined', undefined],
    ['the empty string', ''],
    ['257 characters', 'A'.repeat(257)],
    ['bad base64 (not even the alphabet)', '!!!!'],
    ['a "+" (standard alphabet)', good.slice(0, 4) + '+' + good.slice(5)],
    ['a "/" (standard alphabet)', good.slice(0, 4) + '/' + good.slice(5)],
    ['"=" padding', b64('{"c":"2026-11-01 05:30:00+00","m":"6ba7b810-9dad-41d1-80b4-00c04fd430c8"}') + '='],
    ['an embedded space', good.slice(0, 8) + ' ' + good.slice(8)],
    ['an embedded newline', good.slice(0, 8) + '\n' + good.slice(8)],
    ['a "*"', good.slice(0, 8) + '*' + good.slice(8)],
    ['a length % 4 === 1 tail', 'AAAAA'],
    ['bad JSON', b64('{"c":')],
    ['JSON null', b64('null')],
    ['a JSON array', b64(JSON.stringify([C, M]))],
    ['a JSON number', b64('12345')],
    ['an extra key', b64(JSON.stringify({ c: C, m: M, x: 1 }))],
    ['a missing key', b64(JSON.stringify({ c: C }))],
    ['a duplicate "c" key', b64(`{"c":"2026-01-01 00:00:00+00","c":"${C}","m":"${M}"}`)],
    ['reordered keys', b64(JSON.stringify({ m: M, c: C }))],
    ['whitespace inside the JSON', b64(`{ "c": "${C}", "m": "${M}" }`)],
    ['an escape variant of the same text', b64(`{"c":"2026-11-01 05:30:00.123456+00","m":"6ba7b810-9dad-41d1-80b4-00c04fd430\\u0063\\u0038"}`)],
    ['a non-string c', b64(JSON.stringify({ c: 1, m: M }))],
    ['a non-string m', b64(JSON.stringify({ c: C, m: null }))],
    ["c: 'infinity'", b64(JSON.stringify({ c: 'infinity', m: M }))],
    ["c: 'now'", b64(JSON.stringify({ c: 'now', m: M }))],
    ["c: 'epoch'", b64(JSON.stringify({ c: 'epoch', m: M }))],
    ['c without an offset', b64(JSON.stringify({ c: '2026-11-01 05:30:00.123456', m: M }))],
    ['c in ISO "T" form', b64(JSON.stringify({ c: '2026-11-01T05:30:00Z', m: M }))],
    ['c with 7 fraction digits', b64(JSON.stringify({ c: '2026-11-01 05:30:00.1234567+00', m: M }))],
    ['month 13', b64(JSON.stringify({ c: '2026-13-01 00:00:00+00', m: M }))],
    ['February 30', b64(JSON.stringify({ c: '2026-02-30 00:00:00+00', m: M }))],
    ['February 29 in a non-leap year', b64(JSON.stringify({ c: '2027-02-29 00:00:00+00', m: M }))],
    ['day 00', b64(JSON.stringify({ c: '2026-01-00 00:00:00+00', m: M }))],
    ['hour 25', b64(JSON.stringify({ c: '2026-01-01 25:00:00+00', m: M }))],
    ['minute 60', b64(JSON.stringify({ c: '2026-01-01 00:60:00+00', m: M }))],
    ['offset +16', b64(JSON.stringify({ c: '2026-01-01 00:00:00+16', m: M }))],
    ['offset minutes 60', b64(JSON.stringify({ c: '2026-01-01 00:00:00+05:60', m: M }))],
    ['year 1999', b64(JSON.stringify({ c: '1999-12-31 23:59:59+00', m: M }))],
    ['an upper-case m', b64(JSON.stringify({ c: C, m: M.toUpperCase() }))],
    ['a non-UUID m', b64(JSON.stringify({ c: C, m: 'module-1' }))],
    ['an m with surrounding space', b64(JSON.stringify({ c: C, m: ` ${M}` }))],
  ])('%s', (_l, s) => {
    expectInvalid(s);
  });

  it('a non-canonical last character (non-zero trailing bits) is refused although Buffer decodes it', () => {
    // "YQ" is the canonical encoding of "a"; "YR" decodes to the same byte with non-zero trailing bits.
    expect(Buffer.from('YR', 'base64url').toString('utf8')).toBe('a');
    expectInvalid('YR');
    // …and on a real cursor: bump the last character within the same 6-bit group's unused bits.
    const last = good[good.length - 1]!;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const bumped = good.slice(0, -1) + alphabet[alphabet.indexOf(last) + 1];
    if (Buffer.from(bumped, 'base64url').equals(Buffer.from(good, 'base64url'))) expectInvalid(bumped);
  });

  it('bytes that are invalid UTF-8 are refused (⛔ silently replaced by U+FFFD)', () => {
    expectInvalid(raw([0x7b, 0x22, 0x63, 0x22, 0x3a, 0x22, 0xff, 0xfe, 0x22, 0x7d]));
    expectInvalid(raw([0xc3, 0x28]));
  });

  it('the strict rules never let a lenient Buffer decode through: junk between valid characters', () => {
    // Buffer.from skips "*" and decodes the rest — the alphabet check refuses it first.
    expect(Buffer.from('YW*Jj', 'base64url').toString('utf8')).toBe('abc');
    expectInvalid('YW*Jj');
  });
});

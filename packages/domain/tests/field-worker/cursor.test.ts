// Story 13.1a (AD10; AC6) — the field-worker list cursor, DB-free. `decodeFieldWorkerCursor` runs BEFORE any SQL (a failed
// `::timestamptz` / `::uuid` cast would abort the read transaction and answer 500), so every malformed shape is refused here,
// as `FieldWorkerCursorInvalidError`. The twin: `tests/marketplace/` module-cursor legs (`decodeModuleCursor`).

import { describe, expect, it } from 'vitest';

import { FieldWorkerCursorInvalidError } from '../../src/field-worker/errors.js';
import { decodeFieldWorkerCursor, encodeFieldWorkerCursor, pageFieldWorkersForPariwar } from '../../src/field-worker/read.js';
import { fieldWorkerId, pariwarId } from '../../src/ids/index.js';

const ID = fieldWorkerId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const STAMP = '2026-11-04 10:15:30.123456+00';
const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64url');

describe('encode / decode — the round trip', () => {
  it.each([STAMP, '2026-11-04 10:15:30+00', '2026-11-04 15:45:30.5+05:30', '2026-01-31 00:00:00.000001-03:30'])('round-trips %s exactly (µs kept as text)', (c) => {
    const cursor = encodeFieldWorkerCursor({ createdAtExact: c, fieldWorkerId: ID });
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeFieldWorkerCursor(cursor)).toEqual({ createdAtExact: c, fieldWorkerId: ID });
  });
});

describe('every malformed shape ⇒ FieldWorkerCursorInvalidError (the reason, ⛔ the cursor text)', () => {
  const valid = encodeFieldWorkerCursor({ createdAtExact: STAMP, fieldWorkerId: ID });
  it.each<[string, unknown, string]>([
    ['not a string', 42, 'length'],
    ['empty', '', 'length'],
    ['too long', 'A'.repeat(257), 'length'],
    ['standard base64 alphabet (+ /)', valid.replace(/-/g, '+').replace(/_/g, '/') + '+/', 'alphabet'],
    ['padding', `${valid}==`, 'alphabet'],
    ['a len % 4 === 1 tail', `${valid}A`.length % 4 === 1 ? `${valid}A` : `${valid}AA`, 'alphabet'],
    ['truncated', valid.slice(0, valid.length - 3), ''],
    ['not json', b64('not json'), 'not json'],
    ['an array', b64(JSON.stringify([STAMP, ID])), 'not an object'],
    ['the module key `m` (another list’s cursor)', b64(JSON.stringify({ c: STAMP, m: ID })), 'keys'],
    ['keys reordered', b64(JSON.stringify({ w: ID, c: STAMP })), 'keys'],
    ['an extra key', b64(JSON.stringify({ c: STAMP, w: ID, x: 1 })), 'keys'],
    ['a non-string id', b64(JSON.stringify({ c: STAMP, w: 7 })), 'field types'],
    ['whitespace in the json', b64(`{"c": "${STAMP}","w":"${ID}"}`), 'not canonical json'],
    ['a BOM before the json', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify({ c: STAMP, w: ID }))]).toString('base64url'), 'not json'],
    ['bad utf-8', Buffer.from([0x7b, 0xff, 0x7d]).toString('base64url'), 'not utf-8'],
    ['an impossible date', b64(JSON.stringify({ c: '2026-02-30 10:00:00+00', w: ID })), 'created_at'],
    ['`infinity`', b64(JSON.stringify({ c: 'infinity', w: ID })), 'created_at'],
    ['an upper-case uuid', b64(JSON.stringify({ c: STAMP, w: ID.toUpperCase() })), 'field worker id'],
    ['not a uuid', b64(JSON.stringify({ c: STAMP, w: 'x' })), 'field worker id'],
  ])('%s', (_label, input, reason) => {
    let err: unknown;
    try {
      decodeFieldWorkerCursor(input);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(FieldWorkerCursorInvalidError);
    if (reason !== '') expect((err as FieldWorkerCursorInvalidError).reason).toBe(reason);
    if (typeof input === 'string' && input.length > 8) expect((err as Error).message).not.toContain(input);
  });
});

describe('pageFieldWorkersForPariwar — refusals made BEFORE any statement', () => {
  it('a non-integer limit ⇒ RangeError, no statement sent (clampLimit(NaN) would drop the LIMIT)', async () => {
    const sent: unknown[] = [];
    const db = new Proxy({}, { get: (_t, prop) => (...args: unknown[]) => { sent.push([prop, args]); throw new Error('no SQL expected'); } });
    for (const limit of [NaN, 2.5, Infinity]) {
      await expect(pageFieldWorkersForPariwar(db as never, pariwarId('11111111-1111-1111-1111-111111111111'), { state: 'active', limit })).rejects.toBeInstanceOf(RangeError);
    }
    expect(sent).toEqual([]);
  });

  it('a district holding the NUL character ⇒ an empty page, no statement sent (Postgres cannot bind NUL in text: 22021 aborts the transaction — CR30)', async () => {
    const sent: unknown[] = [];
    const db = new Proxy({}, { get: (_t, prop) => (...args: unknown[]) => { sent.push([prop, args]); throw new Error('no SQL expected'); } });
    const nul = String.fromCharCode(0);
    for (const district of [nul, `Patna${nul}`, `${nul}Patna`, `Pa${nul}tna`]) {
      await expect(pageFieldWorkersForPariwar(db as never, pariwarId('11111111-1111-1111-1111-111111111111'), { state: 'active', district })).resolves.toEqual({ items: [], nextCursor: null });
    }
    expect(sent).toEqual([]);
  });
});

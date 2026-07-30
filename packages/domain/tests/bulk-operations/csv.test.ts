// Pure CSV serializer unit tests — Story 10.6 (Task 3/6; AC2, AC6, AC8).

import { describe, expect, it } from 'vitest';

import { toCsv } from '../../src/bulk-operations/csv.js';

describe('toCsv', () => {
  it('returns an empty string for an empty row set (no header-only ambiguity)', () => {
    expect(toCsv([])).toBe('');
  });

  it('emits a header row + one data row per input, CRLF-terminated', () => {
    const out = toCsv([{ id: '1', name: 'Alice' }]);
    expect(out).toBe('id,name\r\n1,Alice\r\n');
  });

  it('column order is the union of keys in first-seen order across heterogeneous rows', () => {
    const out = toCsv([{ a: '1', b: '2' }, { b: '3', c: '4' }]);
    expect(out).toBe('a,b,c\r\n1,2,\r\n,3,4\r\n');
  });

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ v: 'a,b' }])).toBe('v\r\n"a,b"\r\n');
  });

  it('quotes a field containing a double quote and doubles the interior quote', () => {
    expect(toCsv([{ v: 'say "hi"' }])).toBe('v\r\n"say ""hi"""\r\n');
  });

  it('quotes a field containing an embedded newline', () => {
    expect(toCsv([{ v: 'line1\nline2' }])).toBe('v\r\n"line1\nline2"\r\n');
  });

  it('quotes a field containing an embedded CR', () => {
    expect(toCsv([{ v: 'a\rb' }])).toBe('v\r\n"a\rb"\r\n');
  });

  it('does not quote a plain field', () => {
    expect(toCsv([{ v: 'plain' }])).toBe('v\r\nplain\r\n');
  });

  it('renders a missing key (from a heterogeneous row) as an empty field, not "undefined"', () => {
    const out = toCsv([{ a: '1' }, { a: '2', b: 'x' }]);
    expect(out).toBe('a,b\r\n1,\r\n2,x\r\n');
  });

  describe('formula-injection neutralization (Review Findings — OWASP CSV Injection)', () => {
    it.each([
      ['=SUM(A1:A9)', "'=SUM(A1:A9)"],
      ['+1+1', "'+1+1"],
      ['-2+3', "'-2+3"],
      ['@import', "'@import"],
    ])('prefixes a field starting with %j with a leading apostrophe', (input, expected) => {
      expect(toCsv([{ v: input }])).toBe(`v\r\n${expected}\r\n`);
    });

    it('does not alter a value where the trigger character is not the leading character', () => {
      expect(toCsv([{ v: 'total=5' }])).toBe('v\r\ntotal=5\r\n');
    });

    it('the neutralized value is still comma-quoted when it also needs RFC-4180 quoting', () => {
      expect(toCsv([{ v: '=A1,B1' }])).toBe('v\r\n"\'=A1,B1"\r\n');
    });
  });
});

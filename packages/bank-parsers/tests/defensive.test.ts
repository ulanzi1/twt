// Defensive / malicious-input tests — Story 9.2 (Task 3, AC5, parser-sandbox posture).
//
// The parser ingests potentially-untrusted input (forged/crafted statement — architecture
// §threat-model L1316). It MUST degrade gracefully (typed error or row-level skip-with-
// record) and NEVER crash the caller, and it MUST preserve raw cells verbatim (never
// interpret a formula-injection cell). These assert that directly (beyond the golden corpus).

import { describe, expect, it } from 'vitest';
import { parseStatement, BankStatementParseError } from '../src/index.js';

const HEADER = 'Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance';

function sbi(lines: string[]): string {
  return [HEADER, ...lines].join('\n');
}

describe('parser-sandbox posture — graceful degradation', () => {
  it('never crashes on an empty input', () => {
    expect(() => parseStatement('bihar', 'sbi', '')).not.toThrow();
    expect(parseStatement('bihar', 'sbi', '').entries).toHaveLength(0);
  });

  it('never crashes on a header-only input', () => {
    const res = parseStatement('bihar', 'sbi', HEADER);
    expect(res.entries).toHaveLength(0);
    expect(res.rejected).toHaveLength(0);
  });

  it('skips-with-record a malformed row, keeps the good rows (never a partial-crash)', () => {
    const res = parseStatement(
      'bihar',
      'sbi',
      sbi([
        '05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,,500.00,5000.00',
        'GARBAGE ROW WITH NO STRUCTURE',
        '06/01/2026,06/01/2026,UPI/CR/123456789099/SITA DEVI/sita@oksbi/y,123456789099,,500.00,5500.00',
      ]),
    );
    expect(res.entries).toHaveLength(2);
    expect(res.rejected.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves a formula-injection cell VERBATIM in raw_row + description (never interpreted)', () => {
    for (const prefix of ['=', '+', '-', '@']) {
      const payload = `${prefix}HYPERLINK("http://evil")`;
      const csvCell = `"${payload.replace(/"/g, '""')}"`; // CSV-double the inner quotes
      const res = parseStatement(
        'bihar',
        'sbi',
        sbi([`05/01/2026,05/01/2026,${csvCell},123456789012,,500.00,5000.00`]),
      );
      expect(res.entries[0]!.description).toBe(payload);
      expect(res.entries[0]!.raw_row).toContain(payload);
    }
  });

  it('handles a duplicate row → two entries with DISTINCT deterministic ids', () => {
    const row = '05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,,500.00,5000.00';
    const res = parseStatement('bihar', 'sbi', sbi([row, row]));
    expect(res.entries).toHaveLength(2);
    expect(res.entries[0]!.entry_id).not.toBe(res.entries[1]!.entry_id);
  });

  it('decodes a UTF-8 BOM input (Buffer) without a leading-BOM artifact in the first cell', () => {
    const csv = sbi(['05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,,500.00,5000.00']);
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv, 'utf8')]);
    const res = parseStatement('bihar', 'sbi', withBom);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]!.transaction_date).toBe('2026-01-05');
  });

  it('decodes a latin1 Buffer via the fallback heuristic', () => {
    const csv = sbi(['05/01/2026,05/01/2026,UPI/CR/123456789012/JOSÉ FERNANDES/jose@oksbi/x,123456789012,,500.00,5000.00']);
    const latin1 = Buffer.from(csv, 'latin1');
    const res = parseStatement('bihar', 'sbi', latin1);
    expect(res.entries[0]!.sender_name).toBe('JOSÉ FERNANDES');
  });

  it('is resource-bounded: an over-cap row count throws a typed BankStatementParseError (never an OOM/crash)', () => {
    const many = Array.from({ length: 100_002 }, (_, i) => {
      const dd = String((i % 28) + 1).padStart(2, '0');
      return `${dd}/01/2026,${dd}/01/2026,UPI/CR/123456789012/X/x@oksbi/x,123456789012,,1.00,1.00`;
    });
    expect(() => parseStatement('bihar', 'sbi', sbi(many))).toThrow(BankStatementParseError);
  });

  it('is deterministic: re-parsing the same bytes yields identical output', () => {
    const csv = sbi(['05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,,500.00,5000.00']);
    const a = parseStatement('bihar', 'sbi', csv);
    const b = parseStatement('bihar', 'sbi', csv);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('rejects (skip-with-record) a row whose Dr/Cr indicator is blank/unrecognized instead of silently booking a debit', () => {
    const boiHeader = 'Transaction Date,Particulars,Instrument ID,Amount,Dr/Cr,Balance';
    const res = parseStatement(
      'bihar',
      'boi',
      [boiHeader, '2026-01-05,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,500.00,??,5000.00'].join('\n'),
    );
    expect(res.entries).toHaveLength(0);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0]!.reason).toBe('ambiguous-direction');
  });

  it('rejects (skip-with-record) a row with both debit and credit cells populated instead of silently discarding the debit', () => {
    const res = parseStatement(
      'bihar',
      'sbi',
      sbi(['05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,500.00,500.00,5000.00']),
    );
    expect(res.entries).toHaveLength(0);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0]!.reason).toBe('ambiguous-amount');
  });

  it('rejects (skip-with-record) an impossible calendar date instead of passing it through as ISO', () => {
    const res = parseStatement(
      'bihar',
      'sbi',
      sbi(['30/02/2026,30/02/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/x,123456789012,,500.00,5000.00']),
    );
    expect(res.entries).toHaveLength(0);
    expect(res.rejected[0]!.reason).toBe('unparseable-date');
  });

  it('is resource-bounded on a STRING input too: an over-cap string throws a typed error instead of silently truncating', () => {
    const many = Array.from({ length: 100_002 }, (_, i) => {
      const dd = String((i % 28) + 1).padStart(2, '0');
      return `${dd}/01/2026,${dd}/01/2026,UPI/CR/123456789012/X/x@oksbi/x,123456789012,,1.00,1.00`;
    });
    const csv: string = sbi(many); // a `string`, not a Buffer — exercises the string decode path
    expect(() => parseStatement('bihar', 'sbi', csv)).toThrow(BankStatementParseError);
  });
});

// Story 9.2 (Task 1) — the canonical normalized-row schema unit tests. Pure + DB-free.
// Covers: the money helper's exact-paise arithmetic, the deterministic entry-id's replay
// identity, and the BankStatementEntry .strict() contract.

import { describe, expect, it } from 'vitest';
import {
  BankCode,
  BANK_CODES,
  BankStatementEntry,
  BankAmountParseError,
  parseInrToPaise,
  deriveBankStatementEntryId,
  type BankStatementEntry as BankStatementEntryT,
} from '../../src/bank-statement/index.js';

describe('BankCode authority', () => {
  it('ships exactly the 5 v1 codes', () => {
    expect(BANK_CODES).toEqual(['sbi', 'pnb', 'bob', 'boi', 'cooperative']);
  });
});

describe('parseInrToPaise — exact string→paise (no float)', () => {
  it.each([
    ['1000', 100000],
    ['1000.50', 100050],
    ['1000.5', 100050],
    ['1,000.50', 100050],
    ['1,00,000.00', 10000000], // Indian grouping
    ['₹ 1,000', 100000],
    ['Rs. 250.75', 25075],
    ['0.01', 1],
    ['0', 0],
    ['999999999.99', 99999999999], // large value, exact
    ['1,234.56 Cr', 123456], // trailing direction marker stripped
  ])('parses %s → %d paise', (raw, expected) => {
    expect(parseInrToPaise(raw)).toBe(expected);
  });

  it('never uses float multiplication (the 1000.50 IEEE-754 trap)', () => {
    // 1000.50 * 100 === 100050.00000000001 in IEEE-754 — assert the exact integer.
    expect(Number.isInteger(parseInrToPaise('1000.50'))).toBe(true);
    expect(parseInrToPaise('1000.50')).toBe(100050);
  });

  it.each(['', 'abc', '1.234', '1..2', '--5', '1,2,3.456'])(
    'throws BankAmountParseError on malformed %s',
    (raw) => {
      expect(() => parseInrToPaise(raw)).toThrow(BankAmountParseError);
    },
  );

  it('does NOT treat a bare leading decimal point as a stripped currency symbol (regression: `.50` must not silently become 5000 paise)', () => {
    expect(() => parseInrToPaise('.50')).toThrow(BankAmountParseError);
    expect(() => parseInrToPaise('.5')).toThrow(BankAmountParseError);
  });
});

describe('deriveBankStatementEntryId — deterministic UUIDv5 (replay identity)', () => {
  const input = {
    bankCode: 'sbi' as const,
    parserVersion: 'sbi@1',
    rowIndex: 0,
    rawRow: ['2026-01-01', 'UPI/123', '1000.00'],
  };

  it('is a valid UUID', () => {
    const id = deriveBankStatementEntryId(input);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('is stable across calls (same input → same id)', () => {
    expect(deriveBankStatementEntryId(input)).toBe(deriveBankStatementEntryId(input));
  });

  it('distinguishes byte-identical rows by rowIndex (duplicate-row case)', () => {
    const a = deriveBankStatementEntryId({ ...input, rowIndex: 0 });
    const b = deriveBankStatementEntryId({ ...input, rowIndex: 1 });
    expect(a).not.toBe(b);
  });

  it('changes when bank_code or parser_version changes', () => {
    const base = deriveBankStatementEntryId(input);
    expect(deriveBankStatementEntryId({ ...input, bankCode: 'pnb' })).not.toBe(base);
    expect(deriveBankStatementEntryId({ ...input, parserVersion: 'sbi@2' })).not.toBe(base);
  });

  it('rejects a non-integer / negative rowIndex', () => {
    expect(() => deriveBankStatementEntryId({ ...input, rowIndex: -1 })).toThrow();
    expect(() => deriveBankStatementEntryId({ ...input, rowIndex: 1.5 })).toThrow();
  });
});

describe('BankStatementEntry — .strict() canonical shape', () => {
  const valid: BankStatementEntryT = {
    entry_id: deriveBankStatementEntryId({
      bankCode: 'sbi',
      parserVersion: 'sbi@1',
      rowIndex: 0,
      rawRow: ['x'],
    }),
    bank_code: 'sbi',
    transaction_date: '2026-01-15',
    transaction_id_utr: '123456789012',
    sender_vpa: 'payer@okhdfcbank',
    sender_name: 'RAM KUMAR',
    amount: 100000,
    description: 'UPI/CR/123456789012/RAM KUMAR',
    entry_type: 'credit',
    running_balance: 500000,
    source_account: 'XXXX1234',
    raw_row: ['15/01/2026', 'UPI/CR/123456789012/RAM KUMAR', '1,000.00', '5,000.00'],
    parser_version: 'sbi@1',
  };

  it('accepts a well-formed entry', () => {
    expect(BankStatementEntry.parse(valid)).toBeTruthy();
  });

  it('accepts a datetime transaction_date', () => {
    expect(() => BankStatementEntry.parse({ ...valid, transaction_date: '2026-01-15T10:30:00' })).not.toThrow();
  });

  it('rejects a non-ISO transaction_date', () => {
    expect(() => BankStatementEntry.parse({ ...valid, transaction_date: '15/01/2026' })).toThrow();
  });

  it('accepts null UTR / VPA / sender_name / running_balance / source_account (charge & partial rows)', () => {
    expect(() =>
      BankStatementEntry.parse({
        ...valid,
        transaction_id_utr: null,
        sender_vpa: null,
        sender_name: null,
        running_balance: null,
        source_account: null,
        entry_type: 'charge',
      }),
    ).not.toThrow();
  });

  it('rejects a float amount (paise must be integer)', () => {
    expect(() => BankStatementEntry.parse({ ...valid, amount: 1000.5 })).toThrow();
  });

  it('rejects an unknown key (.strict())', () => {
    expect(() => BankStatementEntry.parse({ ...valid, surprise: 1 })).toThrow();
  });

  it('rejects an out-of-set bank_code', () => {
    expect(() => BankCode.parse('hdfc')).toThrow();
  });
});

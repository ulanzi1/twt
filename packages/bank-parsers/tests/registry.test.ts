// Registry dispatch test — Story 9.2 (Task 2, AC1).

import { describe, expect, it } from 'vitest';
import {
  parseStatement,
  isSupported,
  registeredPairs,
  UnsupportedBankError,
} from '../src/index.js';

const SBI_CSV = [
  'Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance',
  '05/01/2026,05/01/2026,UPI/CR/123456789012/RAM KUMAR/ram@oksbi/Contribution,123456789012,,"500.00","5000.00"',
].join('\n');

describe('registry dispatch (RE6-6)', () => {
  it('registers exactly the 5 bihar parsers', () => {
    const pairs = registeredPairs();
    expect(pairs).toHaveLength(5);
    expect(pairs.every((p) => p.pariwar === 'bihar')).toBe(true);
    expect(pairs.map((p) => p.bankCode).sort()).toEqual(['bob', 'boi', 'cooperative', 'pnb', 'sbi']);
  });

  it('dispatches a known (pariwar, bank) to its parser', () => {
    const res = parseStatement('bihar', 'sbi', SBI_CSV);
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]!.bank_code).toBe('sbi');
  });

  it('isSupported reflects the registry', () => {
    expect(isSupported('bihar', 'sbi')).toBe(true);
    expect(isSupported('bihar', 'hdfc')).toBe(false);
    expect(isSupported('rail', 'sbi')).toBe(false);
  });

  it('rejects an unknown bank with a helpdesk-routed UnsupportedBankError (AC1 — not a silent drop, not a crash)', () => {
    try {
      parseStatement('bihar', 'hdfc', SBI_CSV);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedBankError);
      const e = err as UnsupportedBankError;
      expect(e.helpdeskRouting).toBe(true);
      expect(e.code).toBe('UNSUPPORTED_BANK');
      expect(e.bankCode).toBe('hdfc');
      expect(e.message).toMatch(/helpdesk/);
    }
  });

  it('rejects an unknown pariwar (a future Rail-Parivar SBI is a distinct parser)', () => {
    expect(() => parseStatement('rail', 'sbi', SBI_CSV)).toThrow(UnsupportedBankError);
  });
});

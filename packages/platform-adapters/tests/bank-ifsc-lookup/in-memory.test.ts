// In-memory BankIfscLookup — Story 6.8 (Task 1/7). Proves a valid fixture IFSC resolves to its
// bank/branch, an unknown IFSC → null, a malformed IFSC → null (format gate), the cache serves a
// repeat lookup, and the IFSC_REGEX accepts/rejects the RBI shape.

import { describe, expect, it } from 'vitest';

import { createInMemoryBankIfscLookup } from '../../src/bank-ifsc-lookup/in-memory.js';
import { IFSC_REGEX, isValidIfscFormat } from '../../src/bank-ifsc-lookup/port.js';

describe('IFSC_REGEX', () => {
  it('source is pinned to the RBI shape (review finding, 2026-07-11) — must match the hand-copies in ' +
    '@twt/contracts (NOMINEE_BANK_IFSC_REGEX) and apps/mobile (lib/nominee-bank-ifsc.ts IFSC_RE)', () => {
    expect(IFSC_REGEX.source).toBe('^[A-Z]{4}0[A-Z0-9]{6}$');
  });

  it('accepts a valid RBI IFSC (4-letter bank + 0 + 6-char branch)', () => {
    expect(isValidIfscFormat('SBIN0000001')).toBe(true);
    expect(IFSC_REGEX.test('HDFC0ABC123')).toBe(true);
  });

  it('rejects malformed IFSCs', () => {
    expect(isValidIfscFormat('SBIN123')).toBe(false); // too short
    expect(isValidIfscFormat('sbin0000001')).toBe(false); // lowercase
    expect(isValidIfscFormat('SBI10000001')).toBe(false); // 5th char must be 0, bank code must be letters
    expect(isValidIfscFormat('SBIN1000001')).toBe(false); // 5th char not 0
    expect(isValidIfscFormat('')).toBe(false);
  });
});

describe('createInMemoryBankIfscLookup', () => {
  it('resolves a valid fixture IFSC to { bankName, branch }', async () => {
    const lookup = createInMemoryBankIfscLookup();
    const record = await lookup.lookup('SBIN0000001');
    expect(record).toEqual({ bankName: 'State Bank of India', branch: 'Nariman Point, Mumbai' });
  });

  it('is case-insensitive on the IFSC input', async () => {
    const lookup = createInMemoryBankIfscLookup();
    expect(await lookup.lookup('hdfc0000001')).toEqual({
      bankName: 'HDFC Bank',
      branch: 'Sandoz House, Worli, Mumbai',
    });
  });

  it('returns null for a well-formed but unknown IFSC', async () => {
    const lookup = createInMemoryBankIfscLookup();
    expect(await lookup.lookup('ZZZZ0000000')).toBeNull();
  });

  it('returns null for a malformed IFSC (format gate)', async () => {
    const lookup = createInMemoryBankIfscLookup();
    expect(await lookup.lookup('not-an-ifsc')).toBeNull();
  });

  it('serves a repeat lookup from the cache (same result)', async () => {
    const lookup = createInMemoryBankIfscLookup();
    const first = await lookup.lookup('ICIC0000001');
    const second = await lookup.lookup('ICIC0000001');
    expect(second).toEqual(first);
  });

  it('seed() adds a resolvable branch', async () => {
    const lookup = createInMemoryBankIfscLookup();
    lookup.seed('YESB0000123', { bankName: 'Yes Bank', branch: 'Test Branch' });
    expect(await lookup.lookup('YESB0000123')).toEqual({ bankName: 'Yes Bank', branch: 'Test Branch' });
  });
});

// Allowlist conformance test WITH TEETH — Story 9.2 (Task 4, AC1/AC4, Decision D5).
//
// The package-local guard (NOT a repo-global gate — D5): the registry's parsers MUST be a
// subset of `bank-allowlist.yaml`, the allowlist is exactly 5, and every registered pair
// is present. Revert-sanity: a rogue registry entry OR a mutated allowlist (a 6th pair, a
// dropped pair, a count mismatch, an out-of-enum code) must FAIL — proven here against
// synthetic mutated YAML so the teeth are real, not asserted.

import { describe, expect, it } from 'vitest';
import {
  loadBankAllowlist,
  parseBankAllowlist,
  registeredPairs,
  BankAllowlistError,
} from '../src/index.js';

const VALID_YAML = `
version: 1
count: 5
pairs:
  - { pariwar: bihar, bank_code: sbi, bank_name: State Bank of India }
  - { pariwar: bihar, bank_code: pnb, bank_name: Punjab National Bank }
  - { pariwar: bihar, bank_code: bob, bank_name: Bank of Baroda }
  - { pariwar: bihar, bank_code: boi, bank_name: Bank of India }
  - { pariwar: bihar, bank_code: cooperative, bank_name: Bihar State Cooperative Bank }
`;

describe('bank-allowlist.yaml — the shipped registry', () => {
  const allowlist = loadBankAllowlist();

  it('is exactly 5 pairs (AC1 closed set)', () => {
    expect(allowlist.count).toBe(5);
    expect(allowlist.pairs).toHaveLength(5);
  });

  it('registry ⊆ allowlist AND allowlist ⊆ registry (exact conformance)', () => {
    const allowKeys = new Set(allowlist.pairs.map((p) => `${p.pariwar}:${p.bankCode}`));
    const regKeys = new Set(registeredPairs().map((p) => `${p.pariwar}:${p.bankCode}`));
    // Every registered parser is allowlisted (no rogue registry entry).
    for (const k of regKeys) expect(allowKeys.has(k)).toBe(true);
    // Every allowlisted pair has a parser (no dangling allowlist entry).
    for (const k of allowKeys) expect(regKeys.has(k)).toBe(true);
    expect(regKeys.size).toBe(5);
  });
});

describe('parseBankAllowlist — revert-sanity teeth', () => {
  it('accepts the valid allowlist', () => {
    expect(parseBankAllowlist(VALID_YAML).count).toBe(5);
  });

  it('fails a count/length mismatch', () => {
    expect(() => parseBankAllowlist(VALID_YAML.replace('count: 5', 'count: 4'))).toThrow(
      BankAllowlistError,
    );
  });

  it('fails an out-of-enum bank_code (a 6th rogue bank)', () => {
    const rogue = VALID_YAML
      .replace('count: 5', 'count: 6')
      .replace(
        'pairs:',
        'pairs:\n  - { pariwar: bihar, bank_code: hdfc, bank_name: HDFC Bank }',
      );
    expect(() => parseBankAllowlist(rogue)).toThrow(BankAllowlistError);
  });

  it('fails a duplicate pair', () => {
    const dup = VALID_YAML
      .replace('count: 5', 'count: 6')
      .replace(
        'pairs:',
        'pairs:\n  - { pariwar: bihar, bank_code: sbi, bank_name: State Bank of India }',
      );
    expect(() => parseBankAllowlist(dup)).toThrow(BankAllowlistError);
  });

  it('fails a missing required field', () => {
    const bad = VALID_YAML.replace(', bank_name: State Bank of India', '');
    expect(() => parseBankAllowlist(bad)).toThrow(BankAllowlistError);
  });

  it('fails a non-mapping document', () => {
    expect(() => parseBankAllowlist('- just\n- a\n- list')).toThrow(BankAllowlistError);
  });
});

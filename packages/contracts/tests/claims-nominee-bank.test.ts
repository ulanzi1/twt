// Claim-time nominee-bank contract tests — Story 6.8 (Task 7).
//
// (1) DTO behaviour: strict, valid parse, reject unknown key, IFSC/account-number regex.
// (2) The request requires EXACTLY two accounts (v1 — no single-account partial).
// (3) The response is a NON-PII presence view (no account number / holder name / raw IFSC field).

import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  IfscLookupResponse,
  NOMINEE_BANK_IFSC_REGEX,
  NomineeBankAccountEntry,
  NomineeBankStatusResponse,
  RecordNomineeBankHelplineRequest,
  RecordNomineeBankRequest,
  RecordNomineeBankResponse,
} from '../src/claims/index.js';

const validAccount = {
  accountHolderName: 'Ravi Kumar',
  accountNumber: '123456789012',
  ifsc: 'SBIN0000001',
};

/** A second, DISTINCT valid account (different account number) for the two-account fixtures. */
const validAccount2 = {
  accountHolderName: 'Ravi Kumar',
  accountNumber: '987654321098',
  ifsc: 'HDFC0000001',
};

describe('nominee-bank DTOs (strict + shapes)', () => {
  it('all nominee-bank DTOs are .strict()', () => {
    assertStrict(NomineeBankAccountEntry);
    assertStrict(RecordNomineeBankRequest);
    assertStrict(IfscLookupResponse);
  });

  it('the IFSC wire regex matches the RBI format (pinned wire constant)', () => {
    expect(NOMINEE_BANK_IFSC_REGEX.source).toBe('^[A-Z]{4}0[A-Z0-9]{6}$');
    expect(NOMINEE_BANK_IFSC_REGEX.test('SBIN0000001')).toBe(true);
    expect(NOMINEE_BANK_IFSC_REGEX.test('sbin0000001')).toBe(false);
    expect(NOMINEE_BANK_IFSC_REGEX.test('SBIN1000001')).toBe(false); // 5th char must be 0
  });

  it('accepts a valid account entry, rejects a malformed IFSC / account number', () => {
    expect(() => NomineeBankAccountEntry.parse(validAccount)).not.toThrow();
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, ifsc: 'BADIFSC' })).toThrow();
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, accountNumber: '12' })).toThrow(); // too short
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, accountNumber: 'abcd12345' })).toThrow(); // non-digits
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, accountHolderName: '' })).toThrow();
  });

  it('has NO nomineeRank field (D1 — no nominee linkage)', () => {
    expect(() =>
      NomineeBankAccountEntry.parse({ ...validAccount, nomineeRank: 1 }),
    ).toThrow();
  });

  it('RecordNomineeBankRequest requires EXACTLY two accounts', () => {
    expect(() => RecordNomineeBankRequest.parse({ accounts: [validAccount, validAccount2] })).not.toThrow();
    expect(() => RecordNomineeBankRequest.parse({ accounts: [validAccount] })).toThrow();
    expect(() =>
      RecordNomineeBankRequest.parse({ accounts: [validAccount, validAccount2, validAccount2] }),
    ).toThrow();
    expect(() => RecordNomineeBankRequest.parse({ accounts: [] })).toThrow();
  });

  it('rejects two accounts sharing the same account number (review finding, 2026-07-11)', () => {
    expect(() => RecordNomineeBankRequest.parse({ accounts: [validAccount, validAccount] })).toThrow();
    // Different holder name / IFSC does not save it — the account number is what matters for the RBI cap.
    expect(() =>
      RecordNomineeBankRequest.parse({
        accounts: [validAccount, { ...validAccount, accountHolderName: 'Someone Else', ifsc: 'HDFC0000001' }],
      }),
    ).toThrow();
    expect(() =>
      RecordNomineeBankHelplineRequest.parse({ accounts: [validAccount, validAccount] }),
    ).toThrow();
  });

  it('the MEMBER request rejects correctionReason (nominee cannot correct — read-only after approval)', () => {
    expect(() =>
      RecordNomineeBankRequest.parse({ accounts: [validAccount, validAccount2], correctionReason: 'x' }),
    ).toThrow();
  });

  it('the HELPLINE request accepts an optional correctionReason (D3 tier-2 admin correction)', () => {
    expect(() =>
      RecordNomineeBankHelplineRequest.parse({ accounts: [validAccount, validAccount2] }),
    ).not.toThrow();
    const parsed = RecordNomineeBankHelplineRequest.parse({
      accounts: [validAccount, validAccount2],
      correctionReason: 'account #1 was closed by the bank',
    });
    expect(parsed.correctionReason).toBe('account #1 was closed by the bank');
    // An empty reason is rejected (min length 1 after trim).
    expect(() =>
      RecordNomineeBankHelplineRequest.parse({ accounts: [validAccount, validAccount2], correctionReason: '   ' }),
    ).toThrow();
  });

  it('RecordNomineeBankResponse is a NON-PII presence view (no account number / holder name / raw IFSC)', () => {
    const parsed = RecordNomineeBankResponse.parse({
      accounts: [
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true },
      ],
    });
    expect(parsed.accounts).toHaveLength(2);
    // A response carrying an account number / holder name / raw IFSC is rejected (.strict()).
    expect(() =>
      RecordNomineeBankResponse.parse({
        accounts: [
          { rank: 1, bankName: 'X', ifscValidated: true, holderNamePresent: true, accountNumber: '123' },
          { rank: 2, bankName: 'Y', ifscValidated: true, holderNamePresent: true },
        ],
      }),
    ).toThrow();
  });

  it('IfscLookupResponse carries only public bank/branch data', () => {
    expect(() =>
      IfscLookupResponse.parse({ ifsc: 'SBIN0000001', bankName: 'State Bank of India', branch: 'Nariman Point' }),
    ).not.toThrow();
  });

  it('IfscLookupResponse.branch is nullable (a future real-vendor adapter may not resolve a branch)', () => {
    expect(() =>
      IfscLookupResponse.parse({ ifsc: 'SBIN0000001', bankName: 'State Bank of India', branch: null }),
    ).not.toThrow();
  });

  it('NomineeBankStatusResponse (review finding, 2026-07-11): [] when nothing recorded, both accounts when it has', () => {
    expect(() => assertStrict(NomineeBankStatusResponse)).not.toThrow();
    expect(NomineeBankStatusResponse.parse({ accounts: [] }).accounts).toEqual([]);
    const parsed = NomineeBankStatusResponse.parse({
      accounts: [
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true },
      ],
    });
    expect(parsed.accounts).toHaveLength(2);
    // Same NON-PII presence view as RecordNomineeBankResponse — no account number / holder name / raw IFSC.
    expect(() =>
      NomineeBankStatusResponse.parse({
        accounts: [{ rank: 1, bankName: 'X', ifscValidated: true, holderNamePresent: true, accountNumber: '123' }],
      }),
    ).toThrow();
  });
});

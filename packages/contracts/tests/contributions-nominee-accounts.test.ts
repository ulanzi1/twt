// Story 9.9 — the donor-facing nominee-payment-destinations contract SHAPE test. Load-bearing invariants
// encoded as `.strict()` teeth (a future dev physically cannot regress them without this test going red):
//   1. EQUAL destinations: an account carries a `rank` IDENTITY but NO priority field — a `primary` /
//      `default` / `isPreferred` key is REJECTED by `.strict()` (the equal-choice invariant as a shape).
//   2. The VPA itself is never in the shape — only `vpaPresent: boolean` (the VPA plaintext never ships).
//   3. Absence is a first-class discriminated-union member on `available` (never a throw at the type level).

import { describe, expect, it } from 'vitest';

import {
  NomineeAccountsResponse,
  NomineeBankAccountView,
} from '../src/contributions/nominee-accounts.js';

const validAccount = {
  rank: 1,
  bankName: 'State Bank of India',
  accountHolderName: 'Sunita Devi',
  accountNumber: '123456789012',
  ifsc: 'SBIN0001234',
  vpaPresent: false,
};

describe('NomineeBankAccountView — EQUAL, no priority, no VPA leak', () => {
  it('accepts a full valid account (rank identity + bank label + decrypted coordinates)', () => {
    expect(NomineeBankAccountView.safeParse(validAccount).success).toBe(true);
  });

  it('REJECTS a `primary`/`default`/`isPreferred` priority field (the equal-choice invariant)', () => {
    for (const priorityKey of ['primary', 'default', 'isPreferred', 'preferred']) {
      const res = NomineeBankAccountView.safeParse({ ...validAccount, [priorityKey]: true });
      expect(res.success, `unexpected priority field '${priorityKey}' must be rejected`).toBe(false);
    }
  });

  it('REJECTS a raw `vpa` field — only `vpaPresent` is exposed (the VPA plaintext never ships)', () => {
    expect(NomineeBankAccountView.safeParse({ ...validAccount, vpa: 'nominee@okhdfc' }).success).toBe(false);
    // vpaPresent is required and boolean.
    const withoutFlag: Record<string, unknown> = { ...validAccount };
    delete withoutFlag.vpaPresent;
    expect(NomineeBankAccountView.safeParse(withoutFlag).success).toBe(false);
  });

  it('rank is only 1 or 2 (the Story 6.8 composite-PK identity)', () => {
    expect(NomineeBankAccountView.safeParse({ ...validAccount, rank: 3 }).success).toBe(false);
    expect(NomineeBankAccountView.safeParse({ ...validAccount, rank: 2 }).success).toBe(true);
  });
});

describe('NomineeAccountsResponse — the discriminated union on `available`', () => {
  it('accepts 1 or 2 EQUAL accounts on the available branch', () => {
    const one = NomineeAccountsResponse.safeParse({
      available: true,
      accounts: [validAccount],
      myContribution: 'none',
    });
    expect(one.success).toBe(true);
    const two = NomineeAccountsResponse.safeParse({
      available: true,
      accounts: [validAccount, { ...validAccount, rank: 2, bankName: 'ICICI Bank' }],
      myContribution: 'none',
    });
    expect(two.success).toBe(true);
  });

  it('REJECTS an empty accounts array on the available branch (empty ⇒ the unavailable branch)', () => {
    expect(
      NomineeAccountsResponse.safeParse({ available: true, accounts: [], myContribution: 'none' }).success,
    ).toBe(false);
  });

  it('REJECTS more than two accounts (the exactly-{1,2} account model)', () => {
    expect(
      NomineeAccountsResponse.safeParse({
        available: true,
        accounts: [validAccount, { ...validAccount, rank: 2 }, { ...validAccount, rank: 1 }],
        myContribution: 'none',
      }).success,
    ).toBe(false);
  });

  it('models absence as a first-class { available:false, reason } (never a throw)', () => {
    for (const reason of ['unassigned', 'accounts_not_collected']) {
      const res = NomineeAccountsResponse.safeParse({ available: false, reason, myContribution: 'none' });
      expect(res.success, `reason '${reason}' must parse`).toBe(true);
    }
    // A bogus reason is rejected.
    expect(
      NomineeAccountsResponse.safeParse({ available: false, reason: 'rbi_cap', myContribution: 'none' }).success,
    ).toBe(false);
  });

  it('carries myContribution on BOTH branches (the already-attested routing shortcut)', () => {
    expect(
      NomineeAccountsResponse.safeParse({
        available: false,
        reason: 'unassigned',
        myContribution: 'attested',
      }).success,
    ).toBe(true);
  });
});

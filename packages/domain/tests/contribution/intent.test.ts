// UPI Intent builder + nominee-VPA resolver — DB-free unit suite (Story 8.4, Task 2; AC1/AC2).
//
// The pure core: the `upi://pay` URL is server-authoritative + escaped + never contains undefined/empty
// pa/am (AC1), and the nominee-VPA resolver honestly returns ABSENT today (the D1 shipped v1 state) — a
// first-class fail-soft, never a fabricated VPA.

import { describe, expect, it } from 'vitest';

import {
  buildContributionUpiUrl,
  resolveNomineeVpa,
} from '../../src/contribution/intent.js';
import type { ClaimNomineeBankAccountRow } from '../../src/schema/claim_nominee_bank_accounts.js';

/** A minimal nominee bank-account row (Tier-1 ciphertext + non-PII rank) — NO vpa column exists (D1). */
function account(rank: 1 | 2): ClaimNomineeBankAccountRow {
  return {
    claimCaseId: '00000000-0000-0000-0000-000000000001',
    pariwarId: '00000000-0000-0000-0000-000000000002',
    accountRank: rank,
    accountHolderNameCiphertext: 'ct',
    accountNumberCiphertext: 'ct',
    ifscCiphertext: 'ct',
    ifscValidated: true,
    bankName: 'Test Bank',
    branch: 'Test Branch',
    createdAt: new Date(),
  } as unknown as ClaimNomineeBankAccountRow;
}

describe('buildContributionUpiUrl — server-authoritative + escaped (AC1)', () => {
  it('builds the pa/am/cu/tn/tr URL, escaping every component', () => {
    const url = buildContributionUpiUrl({
      vpa: 'nominee@okhdfc',
      amountInr: 310,
      tr: 'contrib-v1-abcdef',
      tn: 'Pool Karna — Sahyog Alert #78',
    });
    expect(url).toContain('pa=nominee%40okhdfc');
    expect(url).toContain('&am=310&cu=INR');
    expect(url).toContain('&tr=contrib-v1-abcdef');
    // The tn's spaces, em-dash and `#` are all escaped (an unescaped `#` truncates the URL).
    expect(url).toContain('&tn=Pool%20Karna');
    expect(url).toContain('%2378'); // the '#78' escaped
    expect(url.startsWith('upi://pay?')).toBe(true);
  });

  it('never contains undefined / empty pa / am — throws instead', () => {
    expect(() => buildContributionUpiUrl({ vpa: '', amountInr: 310, tr: 't', tn: 'n' })).toThrow();
    expect(() => buildContributionUpiUrl({ vpa: 'v', amountInr: 0, tr: 't', tn: 'n' })).toThrow();
    expect(() => buildContributionUpiUrl({ vpa: 'v', amountInr: 3.5, tr: 't', tn: 'n' })).toThrow();
    expect(() => buildContributionUpiUrl({ vpa: 'v', amountInr: -5, tr: 't', tn: 'n' })).toThrow();
    expect(() => buildContributionUpiUrl({ vpa: 'v', amountInr: 310, tr: '', tn: 'n' })).toThrow();
    expect(() => buildContributionUpiUrl({ vpa: 'v', amountInr: 310, tr: 't', tn: '' })).toThrow();
  });
});

describe('resolveNomineeVpa — honestly absent today (AC2 / D1)', () => {
  it('accounts_not_collected when no nominee bank accounts exist', () => {
    expect(resolveNomineeVpa({ collectionAccounts: [] })).toEqual({
      available: false,
      reason: 'accounts_not_collected',
    });
  });

  it('vpa_not_collected when accounts exist but carry no VPA (the shipped v1 state)', () => {
    expect(resolveNomineeVpa({ collectionAccounts: [account(1), account(2)] })).toEqual({
      available: false,
      reason: 'vpa_not_collected',
    });
  });

  it('lights up when a VPA field lands (forward-compat: the seam reads it, default #1)', () => {
    const withVpa = { ...account(1), vpa: 'nominee@okhdfc' } as unknown as ClaimNomineeBankAccountRow;
    const second = { ...account(2), vpa: 'nominee2@okaxis' } as unknown as ClaimNomineeBankAccountRow;
    expect(resolveNomineeVpa({ collectionAccounts: [withVpa, second] })).toEqual({
      available: true,
      vpa: 'nominee@okhdfc',
      account: 1,
    });
    expect(resolveNomineeVpa({ collectionAccounts: [withVpa, second], preferredAccount: 2 })).toEqual({
      available: true,
      vpa: 'nominee2@okaxis',
      account: 2,
    });
  });

  it('account_not_found (review finding) — NEVER silently substitutes a different account\'s VPA', () => {
    // Only account #1 was collected; the caller asked to switch to #2. The pre-fix code silently fell
    // back to collectionAccounts[0] (account #1) here; the fix surfaces a distinct, honest absence instead.
    const onlyOne = { ...account(1), vpa: 'nominee@okhdfc' } as unknown as ClaimNomineeBankAccountRow;
    expect(resolveNomineeVpa({ collectionAccounts: [onlyOne], preferredAccount: 2 })).toEqual({
      available: false,
      reason: 'account_not_found',
    });
    // The default (#1) still resolves normally when #1 IS present.
    expect(resolveNomineeVpa({ collectionAccounts: [onlyOne] })).toEqual({
      available: true,
      vpa: 'nominee@okhdfc',
      account: 1,
    });
  });
});

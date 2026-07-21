// Schema-shape test — the claim-time nominee-bank VPA column (Story 8.13, Task 1/7). DB-free.
//
// Asserts the substrate the whole slice hangs on: `vpa_ciphertext` exists, is NULLABLE (a nominee
// without a VPA is a first-class state — the write must succeed with a null VPA and it never gates
// the claim lifecycle), and carries the Tier-1 `piiColumn(1, 'claim_nominee_bank')` annotation the
// PII-shielding CI gate consumes (same field class as holder-name/account#/IFSC → symmetric
// encrypt-at-collection / decrypt-at-intent). The tier metadata rides on the Drizzle customType
// config (`col.config.fieldConfig`), the same shape `piiColumn` attaches.

import { describe, expect, it } from 'vitest';

import { claimNomineeBankAccounts } from '../../src/schema/claim_nominee_bank_accounts.js';

/** Read the Tier annotation piiColumn attaches to a Drizzle customType column. */
function piiConfigOf(col: unknown): { tier?: number; fieldClass?: string } {
  return (col as { config?: { fieldConfig?: { tier?: number; fieldClass?: string } } }).config?.fieldConfig ?? {};
}

describe('claim_nominee_bank_accounts.vpa_ciphertext (Story 8.13)', () => {
  const vpa = claimNomineeBankAccounts.vpaCiphertext;

  it('exists as a TEXT column named vpa_ciphertext', () => {
    expect(vpa).toBeDefined();
    expect(vpa.name).toBe('vpa_ciphertext');
    expect(vpa.getSQLType()).toBe('text');
  });

  it('is NULLABLE (a nominee without a VPA is a first-class state — never a frozen-gate)', () => {
    expect(vpa.notNull).toBe(false);
    expect(vpa.hasDefault).toBe(false);
  });

  it("carries the Tier-1 piiColumn(1, 'claim_nominee_bank') annotation — same field class as the other PII", () => {
    expect(piiConfigOf(vpa)).toEqual({ tier: 1, fieldClass: 'claim_nominee_bank' });
    // The same field class as the three original ciphertext columns → symmetric encrypt/decrypt.
    expect(piiConfigOf(claimNomineeBankAccounts.ifscCiphertext).fieldClass).toBe('claim_nominee_bank');
    expect(piiConfigOf(claimNomineeBankAccounts.ifscCiphertext).tier).toBe(1);
  });

  it('unlike the three required PII columns, the VPA is optional (their notNull is true)', () => {
    expect(claimNomineeBankAccounts.accountHolderNameCiphertext.notNull).toBe(true);
    expect(claimNomineeBankAccounts.accountNumberCiphertext.notNull).toBe(true);
    expect(claimNomineeBankAccounts.ifscCiphertext.notNull).toBe(true);
  });
});

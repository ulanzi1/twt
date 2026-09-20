// Schema-shape test — the filer's name-difference note column (Story 6.18, AC7). DB-free.
//
// Mirrors the Story 8.13 `claim-nominee-bank-vpa.test.ts` precedent exactly. Asserts the substrate
// the AC2 read and the AC7 filing forms hang on: `name_difference_note_ciphertext` exists, is
// NULLABLE (a note is never required — `2026-09-19-226` cl.2 lets a filer submit one, it does ⛔ not
// oblige them, and the District Admin still records a verdict with or without it), and carries the
// Tier-1 `piiColumn(1, 'claim_nominee_bank')` annotation the PII-shielding CI gate consumes — the
// same field class as holder-name/account#/IFSC/VPA, so the note encrypts and decrypts through the
// same `CLAIM_NOMINEE_BANK_FIELD_CLASS` context as its siblings (a cross-class call fails AAD
// validation rather than mis-decrypting silently).
//
// ⚠ ⛔ NO CI GATE SCANS `piiColumn`, so this test is the annotation's only guard (AC7 says so in
// terms). Removing the annotation must fail HERE or it fails nowhere.

import { describe, expect, it } from 'vitest';

import { claimNomineeBankAccounts } from '../../src/schema/claim_nominee_bank_accounts.js';

/** Read the Tier annotation piiColumn attaches to a Drizzle customType column. */
function piiConfigOf(col: unknown): { tier?: number; fieldClass?: string } {
  return (col as { config?: { fieldConfig?: { tier?: number; fieldClass?: string } } }).config?.fieldConfig ?? {};
}

describe('claim_nominee_bank_accounts.name_difference_note_ciphertext (Story 6.18)', () => {
  const note = claimNomineeBankAccounts.nameDifferenceNoteCiphertext;

  it('exists as a TEXT column named name_difference_note_ciphertext', () => {
    expect(note).toBeDefined();
    expect(note.name).toBe('name_difference_note_ciphertext');
    expect(note.getSQLType()).toBe('text');
  });

  it('is NULLABLE (a note is never required — cl.2 permits one, it does not oblige one)', () => {
    expect(note.notNull).toBe(false);
    expect(note.hasDefault).toBe(false);
  });

  it("carries the Tier-1 piiColumn(1, 'claim_nominee_bank') annotation — the same field class as its siblings", () => {
    expect(piiConfigOf(note)).toEqual({ tier: 1, fieldClass: 'claim_nominee_bank' });
    // Same field class as the holder name it annotates → one encryption context for both, which is
    // what lets the AC2 read decrypt the pair on one path.
    expect(piiConfigOf(claimNomineeBankAccounts.accountHolderNameCiphertext)).toEqual({
      tier: 1,
      fieldClass: 'claim_nominee_bank',
    });
  });

  it('is optional like the VPA, unlike the three required PII columns', () => {
    expect(claimNomineeBankAccounts.vpaCiphertext.notNull).toBe(false);
    expect(claimNomineeBankAccounts.accountHolderNameCiphertext.notNull).toBe(true);
    expect(claimNomineeBankAccounts.accountNumberCiphertext.notNull).toBe(true);
    expect(claimNomineeBankAccounts.ifscCiphertext.notNull).toBe(true);
  });
});

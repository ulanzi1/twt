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
  NOMINEE_BANK_VPA_REGEX,
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

  it('the VPA wire regex matches the NPCI handle@psp shape (pinned wire constant, Story 8.13)', () => {
    // Pinned .source — the mobile hand-copy (apps/mobile/lib/nominee-bank-vpa.ts's VPA_RE) pins the
    // identical literal string on its own side; if either drifts, its own test breaks (review finding,
    // the nominee-bank-ifsc.ts precedent).
    expect(NOMINEE_BANK_VPA_REGEX.source).toBe('^[A-Za-z0-9.\\-_]{2,256}@[A-Za-z][A-Za-z0-9.\\-_]{1,63}$');
    expect(NOMINEE_BANK_VPA_REGEX.test('nominee@okhdfc')).toBe(true);
    expect(NOMINEE_BANK_VPA_REGEX.test('ravi.kumar-1@oksbi')).toBe(true);
    expect(NOMINEE_BANK_VPA_REGEX.test('9876543210@ybl')).toBe(true);
    expect(NOMINEE_BANK_VPA_REGEX.test('noatsign')).toBe(false); // no @
    expect(NOMINEE_BANK_VPA_REGEX.test('a@1bank')).toBe(false); // PSP must start with a letter
    expect(NOMINEE_BANK_VPA_REGEX.test('@okhdfc')).toBe(false); // empty handle
    expect(NOMINEE_BANK_VPA_REGEX.test('x @okhdfc')).toBe(false); // whitespace not allowed
  });

  it('the entry accepts an OPTIONAL, format-valid vpa; absence is first-class; a bad vpa is rejected (Story 8.13)', () => {
    // Absent VPA is valid (optional, first-class).
    expect(NomineeBankAccountEntry.parse(validAccount).vpa).toBeUndefined();
    // A well-formed VPA is accepted + carried through.
    expect(NomineeBankAccountEntry.parse({ ...validAccount, vpa: 'nominee@okhdfc' }).vpa).toBe('nominee@okhdfc');
    // A malformed VPA is rejected (format-validated at the wire).
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, vpa: 'not-a-vpa' })).toThrow();
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, vpa: '' })).toThrow();
    // Incidental whitespace is trimmed before validation — consistent with accountHolderName (review finding).
    expect(NomineeBankAccountEntry.parse({ ...validAccount, vpa: '  nominee@okhdfc  ' }).vpa).toBe('nominee@okhdfc');
    // Whitespace-only collapses to empty and is still rejected, not silently accepted as "absent".
    expect(() => NomineeBankAccountEntry.parse({ ...validAccount, vpa: '   ' })).toThrow();
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
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: true },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      ],
    });
    expect(parsed.accounts).toHaveLength(2);
    // The presence view carries a NON-PII vpaPresent boolean (never the VPA itself) — Story 8.13.
    expect(parsed.accounts[0]?.vpaPresent).toBe(true);
    expect(parsed.accounts[1]?.vpaPresent).toBe(false);
    // A response carrying an account number / holder name / raw IFSC / raw VPA is rejected (.strict()).
    expect(() =>
      RecordNomineeBankResponse.parse({
        accounts: [
          { rank: 1, bankName: 'X', ifscValidated: true, holderNamePresent: true, vpaPresent: false, accountNumber: '123' },
          { rank: 2, bankName: 'Y', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
        ],
      }),
    ).toThrow();
    expect(() =>
      RecordNomineeBankResponse.parse({
        accounts: [
          { rank: 1, bankName: 'X', ifscValidated: true, holderNamePresent: true, vpaPresent: true, vpa: 'nominee@okhdfc' },
          { rank: 2, bankName: 'Y', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
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
    expect(
      NomineeBankStatusResponse.parse({ accounts: [], correctionNeeded: false, memberEditable: true }).accounts,
    ).toEqual([]);
    const parsed = NomineeBankStatusResponse.parse({
      // Story 6.18 (AC5) — `correctionNeeded` is REQUIRED, not optional: a filer must never be left
      // unsure whether their details need fixing because a producer forgot the field.
      correctionNeeded: false,
      memberEditable: true,
      accounts: [
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: true },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      ],
    });
    expect(parsed.accounts).toHaveLength(2);
    // Same NON-PII presence view as RecordNomineeBankResponse — no account number / holder name / raw IFSC.
    expect(() =>
      NomineeBankStatusResponse.parse({
        correctionNeeded: false,
        memberEditable: true,
        accounts: [{ rank: 1, bankName: 'X', ifscValidated: true, holderNamePresent: true, vpaPresent: false, accountNumber: '123' }],
      }),
    ).toThrow();
  });
});

// ── Story 6.18 (AC7) — THE NOTE'S LIMITS, AND `correctionNeeded`'s REQUIREDNESS ───────────────
//
// ⚠⚠ BOTH WERE CLAIMED AND ⛔ NEITHER WAS TESTED (code review 2026-09-22). `nameDifferenceNote`
// carries `.trim().min(1).max(500)` and ⛔ nothing exercised any of the three. And
// `correctionNeeded` is documented as REQUIRED on the presence view — but every parse in this file
// supplies it, so ⭐ making it `.optional()` would have kept the whole suite green.
describe('Story 6.18 (AC7) — the filer NOTE and its limits', () => {
  const NOTE_MAX = 500;

  it('⭐ the note is OPTIONAL — absence is first-class, ⛔ never a validation error', () => {
    // ⭐ `-226` cl.2 PERMITS a note; it does ⛔ not oblige one. A required note would have forced
    // every filer to explain a difference they may not have — on a death claim.
    expect(NomineeBankAccountEntry.safeParse(validAccount).success).toBe(true);
    expect(NomineeBankAccountEntry.safeParse({ ...validAccount, nameDifferenceNote: 'the bank shortened her name' }).success).toBe(true);
  });

  it('⚠ an EMPTY or whitespace-only note is refused — `.trim().min(1)`', () => {
    // ⚠ THE DISTINCTION THAT MATTERS: absent and blank are ⛔ NOT the same. Absent means "nothing
    // to explain". A blank string means the field was reached and left empty, which would show the
    // District Admin an empty note block where an explanation should be — worse than no note,
    // because it reads as an explanation that was withheld.
    for (const bad of ['', '   ', '\t\n ']) {
      expect(
        NomineeBankAccountEntry.safeParse({ ...validAccount, nameDifferenceNote: bad }).success,
        `a blank note (${JSON.stringify(bad)}) was accepted`,
      ).toBe(false);
    }
  });

  it('⭐ the note is bounded at exactly 500 — the boundary asserted on BOTH sides', () => {
    const at = 'x'.repeat(NOTE_MAX);
    const over = 'x'.repeat(NOTE_MAX + 1);
    expect(NomineeBankAccountEntry.safeParse({ ...validAccount, nameDifferenceNote: at }).success, 'exactly 500 was refused').toBe(true);
    expect(NomineeBankAccountEntry.safeParse({ ...validAccount, nameDifferenceNote: over }).success, '501 was accepted').toBe(false);
  });

  it('⭐ the note is TRIMMED, ⛔ not merely length-checked — surrounding space does not consume the budget', () => {
    // ⚠ A `.max()` without a `.trim()` would let 500 characters plus a trailing newline fail, which
    // a mobile keyboard adds for free. Parse and read the OUTPUT, ⛔ not just the success flag.
    const parsed = NomineeBankAccountEntry.parse({
      ...validAccount,
      nameDifferenceNote: `  the bank shortened her name  `,
    });
    expect(parsed.nameDifferenceNote).toBe('the bank shortened her name');
    // ⚠ 2026-09-22 (code review): this half used to check only `.safeParse(...).success`, weaker
    // than the pattern one line above — success alone cannot tell "the newline was trimmed away"
    // from "the newline was silently left un-trimmed but 501 characters happened to still pass some
    // other tolerance". Read the parsed OUTPUT and assert the trailing newline is really gone.
    const atBoundaryPlusNewline = NomineeBankAccountEntry.parse({
      ...validAccount,
      nameDifferenceNote: `${'x'.repeat(NOTE_MAX)}\n`,
    });
    expect(atBoundaryPlusNewline.nameDifferenceNote).toBe('x'.repeat(NOTE_MAX));
    expect(atBoundaryPlusNewline.nameDifferenceNote).not.toContain('\n');
  });

  it('⭐ an explicit `null` note is refused — the schema is `.optional()`, ⛔ not `.nullable()`', () => {
    // ⚠ 2026-09-22 (code review): the file above tests ABSENCE (`undefined`, by never supplying the
    // key at all) but never tests an explicit `null`, a common JSON idiom many clients send for "no
    // value". `.optional()` accepts a missing key but ⛔ not an explicit `null` — pinned here so the
    // behaviour cannot drift unnoticed, in either direction.
    expect(
      NomineeBankAccountEntry.safeParse({ ...validAccount, nameDifferenceNote: null }).success,
      'an explicit null was accepted — the schema is .optional(), not .nullable()',
    ).toBe(false);
  });

  it('⛔⛔ `correctionNeeded` is REQUIRED on the presence view — the claim, finally asserted', () => {
    // ⚠⚠ EVERY parse in this file supplies it, so `.optional()` would have kept the suite green —
    // and `correctionNeeded` is what the FILER-FACING banner reads (AC5). A response that could
    // omit it would leave a client rendering `undefined` as "nothing to correct", telling a family
    // their details are fine when the District Admin has said they are not.
    // ⚠ `NomineeBankStatusResponse` — the PRESENCE view (`GET …/nominee-bank`), ⛔ not
    // `RecordNomineeBankResponse` (the write echo, which carries ⛔ no such field). My first draft
    // asserted against the wrong one and was refused for an unrelated reason; read off the schema.
    const view = { accounts: [], correctionNeeded: false, memberEditable: true };
    expect(NomineeBankStatusResponse.safeParse(view).success, 'the complete view was refused').toBe(true);

    const without: Record<string, unknown> = { ...view };
    delete without['correctionNeeded'];
    expect(
      NomineeBankStatusResponse.safeParse(without).success,
      '`correctionNeeded` is OPTIONAL — a client could render undefined as "nothing to correct"',
    ).toBe(false);

    // ⭐ AND `memberEditable` TOO — the OTHER half of the pair, and conflating them produced a
    // cruel screen once already (the schema's own comment records it): a family told to correct
    // details they ⛔ cannot reach. Both required, ⛔ neither optional.
    const noEditable: Record<string, unknown> = { ...view };
    delete noEditable['memberEditable'];
    expect(NomineeBankStatusResponse.safeParse(noEditable).success).toBe(false);
  });
});

// Story 9.9 — the donor-facing nominee-payment-destinations contract SHAPE test. Load-bearing invariants
// encoded as `.strict()` teeth (a future dev physically cannot regress them without this test going red):
//   1. EQUAL destinations: an account carries a `rank` IDENTITY but NO priority field — a `primary` /
//      `default` / `isPreferred` key is REJECTED by `.strict()` (the equal-choice invariant as a shape).
//   2. ⚠⛔ **SUPERSEDED AT STORY 8.17 — `#decision-2026-09-10-212` cl.2 (Trustee-ratified, DR + KB).**
//      This invariant read *"The VPA itself is never in the shape — only `vpaPresent: boolean` (the VPA
//      plaintext never ships)"*, and the test below was named *"REJECTS a raw `vpa` field"*. cl.2 rules the
//      nominee's UPI ID ONTO the member's PAYMENT screen — applying `2026-09-04-191` cl.1, which had ALREADY
//      ruled the VPA *"shown to the logged-in member so they can make the contribution"* and was then read
//      narrowly for six days. ⇒ the donor view now carries an OPTIONAL `vpa`, and the test asserts the
//      OPPOSITE of what it used to. ⛔ Recorded as superseded, ⛔ never quietly rewritten as though it had
//      always said so ([[feedback_supersede_never_reinterpret]]).
//      ⭐ **WHAT SURVIVES UNCHANGED:** `vpaPresent` stays (non-PII, and 8.13 records a live reason to keep
//      it); the **claims** presence view (`claims/nominee-bank.ts`) still carries NO `vpa` — a DIFFERENT
//      type that happens to share this one's NAME, whose disclosure nobody has ruled (asserted below); and
//      the VPA still reaches NO audit line, event payload or log.
//   3. Absence is a first-class discriminated-union member on `available` (never a throw at the type level).

import { describe, expect, it } from 'vitest';

import { RecordNomineeBankResponse } from '../src/claims/nominee-bank.js';
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

  // ⚠⛔ THIS TEST ASSERTED THE OPPOSITE UNTIL STORY 8.17 — see the header. `-212` cl.2 rules the VPA onto
  // the member payment surface; the test is INVERTED under that authority, not deleted.
  it('ACCEPTS an optional `vpa` — the member payment surface (`-212` cl.2, applying `-191` cl.1)', () => {
    const res = NomineeBankAccountView.safeParse({ ...validAccount, vpa: 'nominee@okhdfc', vpaPresent: true });
    expect(res.success).toBe(true);
    expect(res.success && res.data.vpa).toBe('nominee@okhdfc');
  });

  it('`vpa` is OPTIONAL — absent parses, and the key stays ABSENT rather than becoming null (Trap 3)', () => {
    // A nominee who did not fill in the optional UPI-ID field is a FIRST-CLASS state, never an error:
    // `vpa_ciphertext` is nullable BY DESIGN. The screen omits the row; the wire omits the key.
    const res = NomineeBankAccountView.safeParse(validAccount);
    expect(res.success).toBe(true);
    expect(res.success && 'vpa' in res.data).toBe(false);
    // An explicit null is NOT the contract — absence is (the handler omits the key entirely).
    expect(NomineeBankAccountView.safeParse({ ...validAccount, vpa: null }).success).toBe(false);
  });

  it('`vpaPresent` is RETAINED and still required — 8.13 records a live reason to keep it', () => {
    const withoutFlag: Record<string, unknown> = { ...validAccount };
    delete withoutFlag.vpaPresent;
    expect(NomineeBankAccountView.safeParse(withoutFlag).success).toBe(false);
  });

  it('`.strict()` is KEPT — an unknown key is still rejected (the additive-field discipline)', () => {
    expect(NomineeBankAccountView.safeParse({ ...validAccount, vpaHandle: 'x@y' }).success).toBe(false);
  });

  it('rank is only 1 or 2 (the Story 6.8 composite-PK identity)', () => {
    expect(NomineeBankAccountView.safeParse({ ...validAccount, rank: 3 }).success).toBe(false);
    expect(NomineeBankAccountView.safeParse({ ...validAccount, rank: 2 }).success).toBe(true);
  });
});

// ⚠⛔⛔ TRAP 1 — THERE ARE TWO TYPES NAMED `NomineeBankAccountView`, AND ONLY ONE OF THEM WAS RULED ON.
// `-212` cl.2 puts the VPA on the MEMBER PAYMENT surface (the exported donor view above) and NOWHERE ELSE.
// The claims-side view — module-private in `claims/nominee-bank.ts`, seen by STAFF and the NOMINEE at claim
// time, reached through `RecordNomineeBankResponse` / `NomineeBankStatusResponse` — is a DIFFERENT type that
// merely shares the name. Both carry `vpaPresent`, so a grep for that field lands in BOTH. Putting the
// plaintext on the claims view would be a NEW disclosure NOBODY HAS RULED. This test is the fence.
describe('Trap 1 — the CLAIMS presence view still carries NO `vpa` (a different, UNRULED surface)', () => {
  const presenceAccount = {
    rank: 1 as const,
    bankName: 'State Bank of India',
    ifscValidated: true,
    holderNamePresent: true,
    vpaPresent: true,
  };

  it('REJECTS a raw `vpa` on the claims presence view — `-212` cl.2 does NOT reach this surface', () => {
    const res = RecordNomineeBankResponse.safeParse({
      accounts: [
        { ...presenceAccount, vpa: 'nominee@okhdfc' },
        { ...presenceAccount, rank: 2 as const, bankName: 'HDFC Bank', vpaPresent: false },
      ],
    });
    expect(res.success, 'the claims view must NOT gain `vpa` alongside the donor view').toBe(false);
  });

  it('still ACCEPTS the non-PII `vpaPresent` presence boolean it has carried since 8.13', () => {
    const res = RecordNomineeBankResponse.safeParse({
      accounts: [presenceAccount, { ...presenceAccount, rank: 2 as const, vpaPresent: false }],
    });
    expect(res.success).toBe(true);
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

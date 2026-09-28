// Story 6.19a (AC1, AC11a) — the claim CONTACT RECORD contracts: the two request shapes (the contract's half of
// the 400 partition — the writer owns the rest), the lockstep of the re-declared reason vocabulary with the
// domain, and the read DTOs parsing the decrypt-failed sentinel.

import { describe, expect, it } from 'vitest';

import { claim as claimDomain } from '@twt/domain';

import {
  ClaimContactDetailsResponse,
  ClaimContactRequiredReason,
  NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
  RecordHelplineClaimContactRequest,
  RecordMemberClaimContactRequest,
} from '../src/index.js';

const V1 = '0b6f4c5e-8e8f-4b3a-9f6e-2d1c3b4a5e6f';
const V2 = '1c7a5d6f-9f90-4c4b-8a7f-3e2d4c5b6a7b';
const block = { name: 'सुनीता देवी', mobile: '9876543210', address: '12, Station Road, Kanpur' };

describe('RecordMemberClaimContactRequest — the member’s FULL record', () => {
  const ok = (over: Record<string, unknown>) =>
    RecordMemberClaimContactRequest.safeParse({ locale: 'hi', nominees: [{ rank: 1, address: 'A' }], claimantNomineeRank: 1, agreed: true, ...over });

  it('accepts the claimant as one of the nominees', () => expect(ok({}).success).toBe(true));

  it('⭐ D9 — the claimant’s name is ⛔ not English-gated (a Hindi name passes)', () => {
    expect(
      ok({ claimantNomineeRank: undefined, claimant: block, nominees: [{ rank: 1, address: 'A', relationship: 'son' }] }).success,
    ).toBe(true);
  });

  it('⭐ no declared nominee: zero ranks + the claimant block is a valid body', () => {
    expect(ok({ nominees: [], claimantNomineeRank: undefined, claimant: block }).success).toBe(true);
  });

  it('the agreement is mandatory — `agreed: true` only', () => {
    expect(ok({ agreed: false }).success).toBe(false);
    expect(ok({ agreed: undefined }).success).toBe(false);
  });

  it('exactly one claimant side — never both, never neither', () => {
    expect(ok({ claimant: block, nominees: [{ rank: 1, address: 'A', relationship: 'son' }] }).success).toBe(false);
    expect(ok({ claimantNomineeRank: undefined }).success).toBe(false);
  });

  it('the claimant rank must be one of the submitted nominees', () => {
    expect(ok({ claimantNomineeRank: 2 }).success).toBe(false);
  });

  it('with the claimant block, a relationship per nominee is required; without it, ⛔ none is allowed', () => {
    expect(ok({ claimantNomineeRank: undefined, claimant: block }).success).toBe(false);
    expect(ok({ nominees: [{ rank: 1, address: 'A', relationship: 'son' }] }).success).toBe(false);
  });

  it('⭐ the relationship is the DERIVED nineteen — `other` is refused', () => {
    expect(
      ok({ claimantNomineeRank: undefined, claimant: block, nominees: [{ rank: 1, address: 'A', relationship: 'other' }] }).success,
    ).toBe(false);
  });

  it('INPUT validators: a blank address, a bad mobile, a duplicate rank are refused', () => {
    expect(ok({ nominees: [{ rank: 1, address: '   ' }] }).success).toBe(false);
    expect(ok({ claimantNomineeRank: undefined, claimant: { ...block, mobile: 'abc' }, nominees: [{ rank: 1, address: 'A', relationship: 'son' }] }).success).toBe(false);
    expect(ok({ nominees: [{ rank: 1, address: 'A' }, { rank: 1, address: 'B' }] }).success).toBe(false);
  });

  it('⛔ a member never names a version id (.strict())', () => {
    expect(ok({ claimantNomineeVersionId: V1 }).success).toBe(false);
  });
});

describe('RecordHelplineClaimContactRequest — the helpline’s PARTIAL write', () => {
  const parse = (body: Record<string, unknown>) => RecordHelplineClaimContactRequest.safeParse({ locale: 'en', ...body });

  it('⭐ W8 — `agreed: true` ALONE is a valid body', () => expect(parse({ agreed: true }).success).toBe(true));

  it('a relationship-only row, an address-only row, the claimant block alone, the claimant version alone', () => {
    expect(parse({ nominees: [{ nomineeVersionId: V1, relationship: 'brother_in_law' }] }).success).toBe(true);
    expect(parse({ nominees: [{ nomineeVersionId: V1, address: 'A' }] }).success).toBe(true);
    expect(parse({ claimant: block }).success).toBe(true);
    expect(parse({ claimantNomineeVersionId: V2 }).success).toBe(true);
  });

  it('refuses an empty body, both claimant sides, an empty row and a repeated version', () => {
    expect(parse({}).success).toBe(false);
    expect(parse({ claimant: block, claimantNomineeVersionId: V1 }).success).toBe(false);
    expect(parse({ nominees: [{ nomineeVersionId: V1 }] }).success).toBe(false);
    expect(parse({ nominees: [{ nomineeVersionId: V1, address: 'A' }, { nomineeVersionId: V1, address: 'B' }] }).success).toBe(false);
  });
});

describe('the vocabulary is in lockstep with the domain', () => {
  it('⭐ D14’s reasons, in precedence order', () => {
    expect(ClaimContactRequiredReason.options).toEqual([...claimDomain.CLAIM_CONTACT_REQUIRED_REASONS]);
  });
});

describe('the plaintext read-back parses the decrypt-failed sentinel (responses are PARSED)', () => {
  it('⭐ a sentinel in every text field parses', () => {
    expect(
      ClaimContactDetailsResponse.safeParse({
        claimCaseId: V1,
        nominees: [{ rank: 1, nomineeVersionId: V2, row: 'own', address: NOMINEE_BANK_DECRYPT_FAILED_SENTINEL, relationship: null }],
        claimantNomineeVersionId: null,
        claimant: {
          name: NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
          mobile: NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
          address: NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
        },
      }).success,
    ).toBe(true);
  });
});

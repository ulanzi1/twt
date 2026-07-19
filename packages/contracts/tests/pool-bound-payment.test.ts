// Pool-bound payment contracts — LOCKSTEP + strict-schema tests (Story 7.6).
//
// A contracts SOURCE file cannot import @twt/domain (turbo cycle), so the verdict + reason-code enums are
// RE-DECLARED in src/pools/pool-bound-payment.ts. THIS test is the anti-drift guard (the fixed-amount.ts
// precedent): it imports the domain tuples + the contracts z.enums and asserts value-alignment, pins the
// CLOSED helpdesk-action set, and the `.strict()` rejections of the binding DTO + the trustee-correction seam.

import { pool } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ContributionValidityReasonCode,
  ContributionValidityResult,
  ContributionValidityVerdict,
  HELPDESK_WRONG_POOL_ACTIONS,
  HelpdeskWrongPoolAction,
  MemberContributionBinding,
  MemberContributionBindingResult,
  TrusteeAttestableCorrectionRequest,
} from '../src/pools/pool-bound-payment.js';

describe('verdict + reason-code — domain ↔ contracts lockstep', () => {
  it('contracts ContributionValidityVerdict.options === domain CONTRIBUTION_VALIDITY_VERDICTS', () => {
    expect([...ContributionValidityVerdict.options].sort()).toEqual(
      [...pool.CONTRIBUTION_VALIDITY_VERDICTS].sort(),
    );
  });

  it('contracts ContributionValidityReasonCode.options === domain CONTRIBUTION_VALIDITY_REASON_CODES', () => {
    expect([...ContributionValidityReasonCode.options].sort()).toEqual(
      [...pool.CONTRIBUTION_VALIDITY_REASON_CODES].sort(),
    );
  });

  it('ships EXACTLY the two v1 verdicts (union open by design, no dead surface now)', () => {
    expect([...ContributionValidityVerdict.options]).toEqual(['valid', 'wrong_pool']);
  });
});

describe('ContributionValidityResult — verdict↔reason_code pairing (enforced, not just enumerated)', () => {
  it('accepts the two matched pairs', () => {
    expect(ContributionValidityResult.parse({ verdict: 'valid', reason_code: 'assigned_pool_match' }).verdict).toBe('valid');
    expect(
      ContributionValidityResult.parse({ verdict: 'wrong_pool', reason_code: 'deposited_to_non_assigned_pool' }).verdict,
    ).toBe('wrong_pool');
  });

  it('rejects a mismatched verdict/reason_code pair (a producer bug Epic 9 must never record)', () => {
    expect(ContributionValidityResult.safeParse({ verdict: 'valid', reason_code: 'deposited_to_non_assigned_pool' }).success).toBe(false);
    expect(ContributionValidityResult.safeParse({ verdict: 'wrong_pool', reason_code: 'assigned_pool_match' }).success).toBe(false);
  });
});

describe('HelpdeskWrongPoolAction — the CLOSED action set (AC3.10)', () => {
  it('is exactly the four allowed actions, and nothing else', () => {
    expect([...HelpdeskWrongPoolAction.options]).toEqual([
      'confirm_invalid_with_reason',
      'facilitate_offband_refund_logged',
      'document_family_conversation',
      'close_case_with_documented_outcome',
    ]);
  });

  it('exposes the runtime array in lockstep with the enum', () => {
    expect([...HELPDESK_WRONG_POOL_ACTIONS]).toEqual([...HelpdeskWrongPoolAction.options]);
  });

  it('rejects any unsafe remap/reassign action (cross-pool ops are unrepresentable)', () => {
    expect(HelpdeskWrongPoolAction.safeParse('move_payment_to_assigned_pool').success).toBe(false);
    expect(HelpdeskWrongPoolAction.safeParse('reassign_member').success).toBe(false);
  });
});

describe('MemberContributionBinding — strict binding DTO', () => {
  const validBinding = {
    assigned: true as const,
    pool_id: '44444444-4444-4444-8444-444444444444',
    claim_case_id: '55555555-5555-4555-8555-555555555555',
    pool_index: 0,
    pool_canonical_identifier: 'P-2026-07-001',
    collection_accounts: [
      {
        account_rank: 1 as const,
        account_holder_name_ciphertext: 'ct-holder-1',
        account_number_ciphertext: 'ct-acct-1',
        ifsc_ciphertext: 'ct-ifsc-1',
        bank_name: 'State Bank',
        branch: 'Patna Main',
        ifsc_validated: true,
      },
      {
        account_rank: 2 as const,
        account_holder_name_ciphertext: 'ct-holder-2',
        account_number_ciphertext: 'ct-acct-2',
        ifsc_ciphertext: 'ct-ifsc-2',
        bank_name: 'Punjab National Bank',
        branch: 'Gaya',
        ifsc_validated: false,
      },
    ],
  };

  it('accepts a well-formed binding (ciphertext as stored)', () => {
    expect(MemberContributionBinding.parse(validBinding).pool_index).toBe(0);
  });

  it('accepts an empty collection_accounts (not-yet-collected absence signal)', () => {
    expect(MemberContributionBinding.parse({ ...validBinding, collection_accounts: [] }).collection_accounts).toHaveLength(0);
  });

  it('rejects a smuggled unknown field (.strict())', () => {
    expect(MemberContributionBinding.safeParse({ ...validBinding, secret: 'x' }).success).toBe(false);
  });

  it('rejects an account_rank other than 1 or 2', () => {
    const bad = { ...validBinding, collection_accounts: [{ ...validBinding.collection_accounts[0], account_rank: 3 }] };
    expect(MemberContributionBinding.safeParse(bad).success).toBe(false);
  });

  it('rejects a length-1 collection_accounts (the refine boundary — must be 0 or exactly 2)', () => {
    const oneAccount = { ...validBinding, collection_accounts: [validBinding.collection_accounts[0]] };
    expect(MemberContributionBinding.safeParse(oneAccount).success).toBe(false);
  });

  it('the binding-result discriminated union accepts the { assigned: false } absence signal', () => {
    expect(MemberContributionBindingResult.parse({ assigned: false })).toEqual({ assigned: false });
  });
});

describe('TrusteeAttestableCorrectionRequest — the ≥2-trustee correction seam (AC3.11)', () => {
  const valid = {
    wrong_pool_contribution_ref: '66666666-6666-4666-8666-666666666666',
    documented_reason: 'family confirmed the correct pool off-band; trustees authorize the correction',
    attesting_trustee_ids: [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ],
  };

  it('accepts a well-formed correction (≥2 distinct trustees)', () => {
    expect(TrusteeAttestableCorrectionRequest.parse(valid).attesting_trustee_ids).toHaveLength(2);
  });

  it('rejects a lone-trustee correction (below the ≥2 floor)', () => {
    expect(
      TrusteeAttestableCorrectionRequest.safeParse({ ...valid, attesting_trustee_ids: [valid.attesting_trustee_ids[0]] })
        .success,
    ).toBe(false);
  });

  it('rejects duplicate trustee ids (inflated consensus)', () => {
    expect(
      TrusteeAttestableCorrectionRequest.safeParse({
        ...valid,
        attesting_trustee_ids: [valid.attesting_trustee_ids[0], valid.attesting_trustee_ids[0]],
      }).success,
    ).toBe(false);
  });

  it('rejects CASE-VARIANT duplicate trustee ids (uuid hex-case is not distinct consensus)', () => {
    // `z.string().uuid()` accepts upper/lower hex and does not canonicalize case, so the same trustee in
    // two cases must not clear the ≥2 floor. Use an id WITH hex letters so toUpperCase actually differs.
    const lower = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(
      TrusteeAttestableCorrectionRequest.safeParse({
        ...valid,
        attesting_trustee_ids: [lower, lower.toUpperCase()],
      }).success,
    ).toBe(false);
  });

  it('rejects a blank documented_reason', () => {
    expect(TrusteeAttestableCorrectionRequest.safeParse({ ...valid, documented_reason: '   ' }).success).toBe(false);
  });
});

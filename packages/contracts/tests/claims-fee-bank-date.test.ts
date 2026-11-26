// Story 6.39a (Task 3.1; DL3, DL10) — the bank date's vocabularies are DOMAIN-OWNED and MIRRORED in contracts; this pins
// each pair in lockstep (the 6.39 pattern), and the request's shape rules (TR5: a refusal echoes ⛔ input value).

import { claim, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FEE_BANK_DATE_LIST_FEE_DATE_SOURCES,
  FEE_BANK_DATE_REASON_CODES,
  MEMBERSHIP_CHECK_FEE_DATE_SOURCES,
  FEE_BANK_DATE_REFUSAL_REASONS,
  FEE_BANK_DATE_STEP_UP_CONTEXT,
  FeeBankDateListResponse,
  FeeBankDateRequest,
  feeBankDateRefusalReasonOf,
} from '../src/index.js';

const ID = '6b1f0b7e-2c56-4b55-9d0b-3a0a2b1c4d5e';
const body = (over: Record<string, unknown> = {}) => ({
  statement_reference: '123456789012',
  bank_credit_date: '2026-03-01',
  reason_code: 'recorded_late_by_member',
  note: 'SBI current account, March statement, line 14',
  expected_live_check_id: ID,
  expected_live_record_id: null,
  ...over,
});

describe('Story 6.39a — the bank-date vocabulary', () => {
  it('each contracts tuple equals the domain tuple, in order', () => {
    expect([...FEE_BANK_DATE_REASON_CODES]).toEqual([...schema.FEE_BANK_DATE_REASON_CODES]);
    expect([...FEE_BANK_DATE_REFUSAL_REASONS]).toEqual([...claim.FEE_BANK_DATE_REFUSAL_REASONS]);
    expect([...FEE_BANK_DATE_LIST_FEE_DATE_SOURCES]).toEqual([...schema.MEMBERSHIP_CHECK_FEE_DATE_SOURCES]);
    expect([...FEE_BANK_DATE_LIST_FEE_DATE_SOURCES]).toEqual([...MEMBERSHIP_CHECK_FEE_DATE_SOURCES]);
  });

  it('the step-up context is its own (⛔ a neighbour\'s — an elevation for one act never satisfies another)', () => {
    expect(FEE_BANK_DATE_STEP_UP_CONTEXT).toBe('fee_bank_date');
  });

  it('feeBankDateRefusalReasonOf reads only `fee_bank_date.<known reason>`', () => {
    expect(feeBankDateRefusalReasonOf('fee_bank_date.reference_mismatch')).toBe('reference_mismatch');
    expect(feeBankDateRefusalReasonOf('fee_bank_date.because')).toBeNull();
    expect(feeBankDateRefusalReasonOf('membership_check.stale')).toBeNull();
    expect(feeBankDateRefusalReasonOf(undefined)).toBeNull();
  });
});

describe('Story 6.39a — FeeBankDateRequest', () => {
  it('a well-formed body parses; the reference is TRIMMED before the shape check (DL10)', () => {
    expect(FeeBankDateRequest.parse(body({ statement_reference: ' 123456789012  ' })).statement_reference).toBe('123456789012');
    expect(FeeBankDateRequest.parse(body({ statement_reference: 'ABCDEFGHIJKLMNOPQRSTUV' })).statement_reference).toBe('ABCDEFGHIJKLMNOPQRSTUV');
  });

  it('refuses each malformed field; ⭐ the issue carries ⛔ input value (TR5)', () => {
    const planted = '98765432109';
    for (const over of [
      { statement_reference: planted }, // 11 digits
      { statement_reference: '' },
      { bank_credit_date: '2026-02-30' },
      { bank_credit_date: '01-03-2026' },
      { reason_code: 'because' },
      { note: '   ' },
      { expected_live_check_id: undefined },
      { expected_live_record_id: undefined },
      { extra: true },
    ]) {
      const r = FeeBankDateRequest.safeParse(body(over));
      expect(r.success, JSON.stringify(over)).toBe(false);
      expect(JSON.stringify(r.error?.issues)).not.toContain(planted);
    }
  });

  it('the list response carries ⛔ fee outcome, ⛔ name, ⛔ date of death (strict)', () => {
    const row = {
      claim_case_id: ID,
      latest_posting_district: 'Jaipur',
      recorded_fee_date: '2026-03-10',
      amount_inr: 110,
      reference_last4: '9012',
      fee_date_source: 'recorded',
      expected_live_check_id: ID,
      expected_live_record_id: null,
      live_record: null,
    };
    expect(FeeBankDateListResponse.safeParse({ held: [row], recorded: [], held_truncated: false, recorded_truncated: false }).success).toBe(true);
    for (const extra of [{ fee_outcome: 'after_death' }, { date_of_death: '2026-03-09' }, { name: 'X' }]) {
      expect(FeeBankDateListResponse.safeParse({ held: [{ ...row, ...extra }], recorded: [], held_truncated: false, recorded_truncated: false }).success).toBe(false);
    }
  });
});

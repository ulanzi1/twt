// Story 6.39a, Task 2.2 (DL6) — which fee date the membership check compares, and which bank-date record it considers.
// Pure; the live legs are in the API and domain integration specs (AC5).

import { describe, expect, it } from 'vitest';

import { chooseFeeDate, considerableFeeBankDate, type LiveFeeBankDate } from '../../src/claim/fee-bank-date-read.js';

const RECEIPT = '11111111-1111-4111-8111-111111111111';
const live = (over: Partial<LiveFeeBankDate> = {}): LiveFeeBankDate => ({
  recordId: '22222222-2222-4222-8222-222222222222' as never,
  feeReceiptId: RECEIPT as never,
  bankCreditDate: '2026-03-05',
  reasonCode: 'recorded_late_by_member',
  decidedByActorId: 'actor-1',
  decidedByDisplay: 'Finance Officer',
  decidedAt: new Date('2026-04-01T10:00:00Z'),
  ...over,
});

describe('chooseFeeDate (DL6 — the EARLIER of the two dates; TL4)', () => {
  // 2026-03-10T06:00Z is the 10th in India.
  const recordedPaidAt = new Date('2026-03-10T06:00:00Z');

  it('with ⛔ considered record ⇒ the recorded date, `recorded`', () => {
    expect(chooseFeeDate(recordedPaidAt, null)).toEqual({ feeDate: '2026-03-10', source: 'recorded' });
  });

  it('a bank date STRICTLY earlier ⇒ the bank date, `bank`', () => {
    expect(chooseFeeDate(recordedPaidAt, { bankCreditDate: '2026-03-05' })).toEqual({ feeDate: '2026-03-05', source: 'bank' });
  });

  it('⭐ a bank date LATER than the recorded one ⇒ the recorded date is KEPT (`recorded`) — a later bank date never counts against a family', () => {
    expect(chooseFeeDate(recordedPaidAt, { bankCreditDate: '2026-03-12' })).toEqual({ feeDate: '2026-03-10', source: 'recorded' });
  });

  it('the SAME day ⇒ `recorded` (`bank` only when strictly earlier)', () => {
    expect(chooseFeeDate(recordedPaidAt, { bankCreditDate: '2026-03-10' })).toEqual({ feeDate: '2026-03-10', source: 'recorded' });
  });

  it('the recorded date is the INDIAN calendar date of the instant (18:30Z on the 9th is the 10th)', () => {
    expect(chooseFeeDate(new Date('2026-03-09T18:30:00Z'), { bankCreditDate: '2026-03-09' })).toEqual({ feeDate: '2026-03-09', source: 'bank' });
  });
});

describe('considerableFeeBankDate (DL6 — only a record naming the JOINING payment is considered)', () => {
  it('⛔ live record ⇒ null', () => {
    expect(considerableFeeBankDate(null, RECEIPT)).toBeNull();
  });

  it('a record naming the joining payment is considered — ids compared lower-cased', () => {
    const r = live();
    expect(considerableFeeBankDate(r, RECEIPT.toUpperCase())).toBe(r);
  });

  it('⛔ a record naming ANOTHER payment is ignored (fail closed — the gate then waits)', () => {
    expect(considerableFeeBankDate(live({ feeReceiptId: '33333333-3333-4333-8333-333333333333' as never }), RECEIPT)).toBeNull();
  });
});

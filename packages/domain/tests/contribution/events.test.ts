// contribution.utr-attested payload schema — DB-free `.strict()` shape suite (Story 8.4, Task 1; AC3/AC4).
//
// The load-bearing invariant AS A SHAPE: the yellow event's payload REQUIRES `attestation_only: true` (a
// required literal — no downstream consumer can mistake a yellow claim for a confirmed one) AND REQUIRES a
// non-empty `utr` matching the shipped format (the field Story 9.4's matcher primary-reads). A `.strict()`
// parse must reject an unknown key, a missing/negated flag, a bad UTR, and a `tr` past the NPCI ceiling.

import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS,
  CONTRIBUTION_EVENT_TYPES,
  ContributionUtrAttestedPayloadSchema,
} from '../../src/contribution/events.js';
import { CONTRIBUTION_REF_MAX_LENGTH } from '../../src/pool/index.js';

const POOL_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';

/** A well-formed baseline payload (valid `tr` + a 12-digit UTR). */
function base(): Record<string, unknown> {
  return {
    actor: 'member',
    trigger: 'contribution.utr_attested',
    poolId: POOL_ID,
    memberId: MEMBER_ID,
    tr: 'contrib-v1-abcdefghijklmnop',
    utr: '123456789012',
    attestation_only: true,
  };
}

describe('ContributionUtrAttestedPayloadSchema — the yellow-not-green shape (AC3/AC4)', () => {
  it('accepts a well-formed member attestation', () => {
    expect(ContributionUtrAttestedPayloadSchema.parse(base())).toMatchObject({
      attestation_only: true,
      utr: '123456789012',
    });
  });

  it('REQUIRES attestation_only (a downstream reader can never mistake yellow for green)', () => {
    const withoutFlag = base();
    delete withoutFlag['attestation_only'];
    expect(() => ContributionUtrAttestedPayloadSchema.parse(withoutFlag)).toThrow();
  });

  it('REJECTS attestation_only: false (the flag is a required TRUE literal)', () => {
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), attestation_only: false })).toThrow();
  });

  it('REQUIRES a non-empty utr (Story 9.4 primary-matches this field)', () => {
    const withoutUtr = base();
    delete withoutUtr['utr'];
    expect(() => ContributionUtrAttestedPayloadSchema.parse(withoutUtr)).toThrow();
  });

  it('validates the UTR format (12-digit numeric OR 22-char alphanumeric)', () => {
    expect(ContributionUtrAttestedPayloadSchema.parse({ ...base(), utr: 'ABCDefgh1234567890ABCD' })).toBeTruthy();
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), utr: '12345' })).toThrow();
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), utr: 'not-a-utr!!' })).toThrow();
  });

  it('bounds tr by the NPCI ceiling (CONTRIBUTION_REF_MAX_LENGTH)', () => {
    const tooLong = 'x'.repeat(CONTRIBUTION_REF_MAX_LENGTH + 1);
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), tr: tooLong })).toThrow();
  });

  it('is `.strict()` — an unknown key is a defect', () => {
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), confirmed: true })).toThrow();
  });

  it('only a member self-attests (actor is a literal `member`)', () => {
    expect(() => ContributionUtrAttestedPayloadSchema.parse({ ...base(), actor: 'system' })).toThrow();
  });

  it('the event-type map is exhaustive and green is DELIBERATELY absent', () => {
    expect(CONTRIBUTION_EVENT_TYPES).toEqual(['contribution.utr-attested']);
    expect(Object.keys(CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS)).toEqual(['contribution.utr-attested']);
    expect(CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS).not.toHaveProperty('contribution.confirmed');
  });
});

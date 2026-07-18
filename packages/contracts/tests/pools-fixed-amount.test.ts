// Fixed-amount schedule contracts — LOCKSTEP + strict-schema tests (Story 7.5).
//
// A contracts SOURCE file cannot import @twt/domain (turbo cycle), so the change-type wire enum is
// RE-DECLARED in src/pools/fixed-amount.ts. THIS test is the anti-drift guard (the TcLegalReviewStatus
// / BenefitMechanism / ConsentType precedent): it imports the domain pgEnum + the contracts z.enum and
// asserts value-alignment, plus pins the `.strict()` rejection of smuggled fields.

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  POOL_FIXED_AMOUNT_MAX_INR,
  PoolFixedAmountChangeType,
  PoolFixedAmountEmergencyRequest,
  PoolFixedAmountScheduleRequest,
} from '../src/pools/fixed-amount.js';

describe('pool fixed-amount change_type — domain ↔ contracts lockstep', () => {
  it('domain pool_fixed_amount_change_type enumValues === contracts PoolFixedAmountChangeType.options', () => {
    expect([...schema.poolFixedAmountChangeTypeEnum.enumValues].sort()).toEqual(
      [...PoolFixedAmountChangeType.options].sort(),
    );
  });
});

describe('PoolFixedAmountScheduleRequest — strict validation', () => {
  it('accepts a well-formed standard-change body', () => {
    const parsed = PoolFixedAmountScheduleRequest.parse({
      fixed_amount: 600,
      effective_from: '2027-08-01T00:00:00.000Z',
    });
    expect(parsed.fixed_amount).toBe(600);
  });

  it('rejects a non-positive amount', () => {
    expect(
      PoolFixedAmountScheduleRequest.safeParse({ fixed_amount: 0, effective_from: '2027-08-01T00:00:00.000Z' }).success,
    ).toBe(false);
  });

  it('rejects an unknown (smuggled) field', () => {
    expect(
      PoolFixedAmountScheduleRequest.safeParse({
        fixed_amount: 600,
        effective_from: '2027-08-01T00:00:00.000Z',
        change_type: 'emergency', // the client never picks the discriminator
      }).success,
    ).toBe(false);
  });

  it('rejects an amount over the guard-rail ceiling', () => {
    expect(
      PoolFixedAmountScheduleRequest.safeParse({
        fixed_amount: POOL_FIXED_AMOUNT_MAX_INR + 1,
        effective_from: '2027-08-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('PoolFixedAmountEmergencyRequest — strict validation', () => {
  const valid = {
    fixed_amount: 650,
    effective_from: '2026-07-18T00:00:00.000Z',
    documented_reason: 'reserve adequacy — actuarial review',
    panel_actor_ids: [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ],
  };

  it('accepts a well-formed emergency body', () => {
    expect(PoolFixedAmountEmergencyRequest.parse(valid).panel_actor_ids).toHaveLength(2);
  });

  it('rejects a blank documented_reason', () => {
    expect(PoolFixedAmountEmergencyRequest.safeParse({ ...valid, documented_reason: '   ' }).success).toBe(false);
  });

  it('rejects an empty panel roster', () => {
    expect(PoolFixedAmountEmergencyRequest.safeParse({ ...valid, panel_actor_ids: [] }).success).toBe(false);
  });

  it('rejects a lone-actor panel (below the minimum panel size)', () => {
    expect(
      PoolFixedAmountEmergencyRequest.safeParse({ ...valid, panel_actor_ids: [valid.panel_actor_ids[0]] }).success,
    ).toBe(false);
  });

  it('rejects a panel with a duplicate actor id', () => {
    expect(
      PoolFixedAmountEmergencyRequest.safeParse({
        ...valid,
        panel_actor_ids: [valid.panel_actor_ids[0], valid.panel_actor_ids[0]],
      }).success,
    ).toBe(false);
  });

  it('rejects an amount over the guard-rail ceiling', () => {
    expect(
      PoolFixedAmountEmergencyRequest.safeParse({ ...valid, fixed_amount: POOL_FIXED_AMOUNT_MAX_INR + 1 }).success,
    ).toBe(false);
  });

  it('rejects a smuggled server-resolved display in the panel', () => {
    expect(
      PoolFixedAmountEmergencyRequest.safeParse({
        ...valid,
        panel: [{ actor_id: 'x', actor_display: 'X' }], // the server resolves displays, never the client
      }).success,
    ).toBe(false);
  });
});

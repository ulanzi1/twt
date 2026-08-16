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
  PoolFixedAmountEligibleAttestor,
  PoolFixedAmountEligibleAttestorsResponse,
  PoolFixedAmountEmergencyRequest,
  PoolFixedAmountScheduleRequest,
  PoolFixedAmountUpcomingChange,
  PoolFixedAmountView,
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

// ── Story 10.13 — the additive read shapes (AC2/AC4) ────────────────────────────────────────────

describe('PoolFixedAmountView.upcoming — Story 10.13 AC4', () => {
  const baseView = {
    pariwar_id: '11111111-1111-4111-8111-111111111111',
    effective_amount: 310,
    effective_version: 3,
    upcoming: null,
    schedule: [],
    schedule_has_more: false,
  };

  it('accepts a null upcoming (no future change scheduled)', () => {
    expect(PoolFixedAmountView.safeParse(baseView).success).toBe(true);
  });

  it('accepts a populated upcoming', () => {
    const parsed = PoolFixedAmountView.safeParse({
      ...baseView,
      upcoming: {
        version: 4,
        fixed_amount: 400,
        effective_from: '2027-08-16T00:00:00.000Z',
        change_type: 'standard',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('REQUIRES the field to be present — it is nullable, not optional', () => {
    // The distinction is load-bearing: an OPTIONAL field lets a handler that forgot to resolve the
    // upcoming change ship a view that silently omits it, which is exactly how the value hid before
    // Story 10.13 (the resolver existed; nothing on this surface called it). Nullable-and-required
    // forces every producer to answer the question.
    const { upcoming: _omitted, ...withoutUpcoming } = baseView;
    expect(PoolFixedAmountView.safeParse(withoutUpcoming).success).toBe(false);
  });

  it('rejects a smuggled effective_until on upcoming (.strict())', () => {
    // An entry not yet in force has no meaningful close, and history's shape must not leak in here.
    expect(
      PoolFixedAmountUpcomingChange.safeParse({
        version: 4,
        fixed_amount: 400,
        effective_from: '2027-08-16T00:00:00.000Z',
        change_type: 'standard',
        effective_until: null,
      }).success,
    ).toBe(false);
  });

  it('accepts change_type emergency — a future-dated emergency is still an upcoming change', () => {
    expect(
      PoolFixedAmountUpcomingChange.safeParse({
        version: 9,
        fixed_amount: 350,
        effective_from: '2027-01-01T00:00:00.000Z',
        change_type: 'emergency',
      }).success,
    ).toBe(true);
  });
});

describe('PoolFixedAmountEligibleAttestor — Story 10.13 AC2', () => {
  const attestor = {
    actor_id: '22222222-2222-4222-8222-222222222222',
    display_name: 'A. Trustee',
  };

  it('accepts an actor id + display name', () => {
    expect(PoolFixedAmountEligibleAttestor.safeParse(attestor).success).toBe(true);
  });

  it('rejects a blank display name', () => {
    // The directory excludes display-less key-holders at the source; this pins that a blank can never
    // reach the wire even if a producer regressed, because offering one guarantees a 409 on submit.
    expect(PoolFixedAmountEligibleAttestor.safeParse({ ...attestor, display_name: '' }).success).toBe(false);
  });

  it('rejects a smuggled role or grant field (.strict())', () => {
    // The picker needs a name and an id. Leaking WHICH role confers eligibility would turn a
    // convenience list into a grant-structure disclosure.
    expect(PoolFixedAmountEligibleAttestor.safeParse({ ...attestor, role: 'trustee_panel' }).success).toBe(false);
  });

  it('accepts an EMPTY attestor list — a real, renderable state', () => {
    // A Pariwar with fewer than two eligible attestors cannot form a panel at all. That must arrive as
    // a well-formed empty list the UI can explain, never as an error the trustee has to decode.
    expect(
      PoolFixedAmountEligibleAttestorsResponse.safeParse({
        pariwar_id: '11111111-1111-4111-8111-111111111111',
        attestors: [],
      }).success,
    ).toBe(true);
  });
});

// Feature-flag contracts — Story 10.8 (Task 6).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enums to the @twt/domain source tuples
// (contracts cannot import domain in SHIPPED files — the RN bundle boundary — so this test, which never
// ships, is the mechanical drift guard, per [[project_contracts_domain_bundle_boundary]]); (2) the
// `.strict()` behaviour + snake_case wire shape of the DTOs (a live wire-shape drift must fail).

import { featureFlags } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CohortDimension,
  CohortOperator,
  FeatureFlagFlipRequest,
  FeatureFlagInventoryEntry,
  FeatureFlagInventoryResponse,
  FeatureFlagState,
} from '../src/feature-flags/index.js';

describe('feature-flags contract ↔ domain sync-guard', () => {
  it('FeatureFlagState matches the domain FEATURE_FLAG_STATES tuple', () => {
    expect([...FeatureFlagState.options]).toEqual([...featureFlags.FEATURE_FLAG_STATES]);
  });

  it('CohortDimension matches the domain COHORT_DIMENSIONS tuple', () => {
    // Drift here is the dangerous kind: a dimension the API accepts but the evaluator does not know
    // would be persisted as a valid-looking rule and then fail CLOSED at every evaluation — a cohort
    // that silently never matches, with no error anywhere.
    expect([...CohortDimension.options]).toEqual([...featureFlags.COHORT_DIMENSIONS]);
  });

  it('CohortOperator matches the domain COHORT_OPERATORS tuple', () => {
    expect([...CohortOperator.options]).toEqual([...featureFlags.COHORT_OPERATORS]);
  });
});

describe('the no-secret-flags property is expressed in the CONTRACT (AC4)', () => {
  it('has no `hidden` / `internal` / `visibility` field on an inventory entry', () => {
    // The absence is load-bearing: a contract that could express "omit this one" invites a code path
    // to do so. `.strict()` means these are rejected rather than silently ignored.
    for (const field of ['hidden', 'internal', 'visibility', 'secret']) {
      const body = {
        flag_key: 'kyc_manual_fallback',
        description: 'x',
        state: 'off',
        source: 'default',
        flag_version: 1,
        cohort_definition: { clauses: [] },
        fallback_default: true,
        owner: 'kyc-desk',
        dead_by: '2027-06-30',
        effective_from: null,
        effective_until: null,
        last_flip_actor: null,
        rationale: null,
        [field]: true,
      };
      expect(() => FeatureFlagInventoryEntry.parse(body), field).toThrow();
    }
  });

  it('the inventory response carries a plain flags array with no filter/pagination envelope', () => {
    const parsed = FeatureFlagInventoryResponse.parse({ flags: [] });
    expect(parsed.flags).toEqual([]);
    expect(() => FeatureFlagInventoryResponse.parse({ flags: [], next_cursor: 'x' })).toThrow();
  });
});

describe('FeatureFlagFlipRequest strictness + wire shape', () => {
  const valid = {
    state: 'canary' as const,
    cohort_definition: { clauses: [{ dimension: 'district' as const, op: 'in' as const, values: ['patna'] }] },
    fallback_default: true,
    owner: 'kyc-desk',
    dead_by: '2027-06-30',
    rationale: 'staged DigiLocker cutover for the Patna pilot',
  };

  it('accepts a valid snake_case body', () => {
    const parsed = FeatureFlagFlipRequest.parse(valid);
    expect(parsed.state).toBe('canary');
    expect(parsed.cohort_definition.clauses[0]?.dimension).toBe('district');
  });

  it('⚠ REJECTS a missing or empty rationale — FR-58C requires actor + rationale on every change', () => {
    // Optional-in-practice is the failure mode: the field would be empty on exactly the hurried flips
    // that most need explaining.
    const withoutRationale: Record<string, unknown> = { ...valid };
    delete withoutRationale.rationale;
    expect(() => FeatureFlagFlipRequest.parse(withoutRationale)).toThrow();
    expect(() => FeatureFlagFlipRequest.parse({ ...valid, rationale: '' })).toThrow();
  });

  it('requires owner + dead_by (lifecycle accountability — a flag with no retirement date is debt)', () => {
    const noOwner: Record<string, unknown> = { ...valid };
    delete noOwner.owner;
    const noDeadBy: Record<string, unknown> = { ...valid };
    delete noDeadBy.dead_by;
    expect(() => FeatureFlagFlipRequest.parse(noOwner)).toThrow();
    expect(() => FeatureFlagFlipRequest.parse(noDeadBy)).toThrow();
  });

  it('rejects an unknown cohort dimension or operator at the WIRE, before it can be persisted', () => {
    expect(() =>
      FeatureFlagFlipRequest.parse({
        ...valid,
        cohort_definition: { clauses: [{ dimension: 'zodiac', op: 'in', values: ['leo'] }] },
      }),
    ).toThrow();
    expect(() =>
      FeatureFlagFlipRequest.parse({
        ...valid,
        cohort_definition: { clauses: [{ dimension: 'district', op: 'regex', values: ['p.*'] }] },
      }),
    ).toThrow();
  });

  it('rejects an empty clause values list and bounds the clause/value counts', () => {
    expect(() =>
      FeatureFlagFlipRequest.parse({ ...valid, cohort_definition: { clauses: [{ dimension: 'district', op: 'in', values: [] }] } }),
    ).toThrow();
    expect(() =>
      FeatureFlagFlipRequest.parse({
        ...valid,
        cohort_definition: {
          clauses: Array.from({ length: 21 }, () => ({ dimension: 'district' as const, op: 'in' as const, values: ['x'] })),
        },
      }),
    ).toThrow();
  });

  it('is .strict() — an unknown field is rejected, not silently dropped', () => {
    expect(() => FeatureFlagFlipRequest.parse({ ...valid, force: true })).toThrow();
  });

  it('bounds the rationale so it cannot become a free-text PII sink', () => {
    expect(() => FeatureFlagFlipRequest.parse({ ...valid, rationale: 'x'.repeat(501) })).toThrow();
  });
});

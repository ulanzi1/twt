/**
 * Shared test data + factory helpers used across P0 ASR scaffolds.
 *
 * RED-PHASE NOTE: this module is a forward-looking sketch. Once Story 1.1
 * (Turborepo bootstrap) lands, move these helpers into
 *   packages/domain/__tests__/_fixtures/  (deterministic factories)
 *   apps/api/__tests__/_fixtures/         (API seed helpers)
 * and update imports across the scaffolds accordingly.
 *
 * Dependencies (NOT yet installed):
 *   - @faker-js/faker
 *   - drizzle-orm + postgres (or pg)
 *   - @seontechnologies/playwright-utils  (for API/E2E scaffolds)
 *   - fast-check                          (for property-based scaffolds)
 *   - vitest                              (unit/component)
 *   - @playwright/test                    (E2E + API black box)
 *   - k6 (binary) or artillery            (load — for ASR-3 / ASR-4)
 */

import { faker } from '@faker-js/faker';

// ─── Pariwar / RLS fixtures ──────────────────────────────────────────────────

export type PariwarId = string & { readonly __brand: 'PariwarId' };

export const newPariwarId = (prefix: string): PariwarId =>
  `${prefix}-${faker.string.uuid()}` as PariwarId;

// ─── Member fixtures ────────────────────────────────────────────────────────

export type MemberSeed = {
  member_id: string;
  pariwar_id: PariwarId;
  first_name: string;
  last_name: string;
  district: string;
  joined_at: Date;
  lock_in_days_at_join: number;
};

export const newMemberSeed = (overrides: Partial<MemberSeed> = {}): MemberSeed => ({
  member_id: `m-${faker.string.uuid()}`,
  pariwar_id: overrides.pariwar_id ?? newPariwarId('bihar'),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  district: faker.helpers.arrayElement(['Vaishali', 'Patna', 'Gaya', 'Muzaffarpur']),
  joined_at: faker.date.past({ years: 2 }),
  lock_in_days_at_join: 30,
  ...overrides,
});

/** Deterministic 4L synthetic member generator (seeded). */
export function* synth4LMembers(
  pariwarId: PariwarId,
  count = 400_000,
  seed = 4242,
): Generator<MemberSeed> {
  faker.seed(seed);
  for (let i = 0; i < count; i++) {
    yield newMemberSeed({
      member_id: `m4L-${i.toString().padStart(7, '0')}`,
      pariwar_id: pariwarId,
    });
  }
}

// ─── Cycle / Pool fixtures ──────────────────────────────────────────────────

export type CycleId = string & { readonly __brand: 'CycleId' };

export const newCycleId = (yyyymm: string): CycleId => `cycle-${yyyymm}` as CycleId;

export const newPoolSnapshotInput = (memberCount: number, poolCount: number) => ({
  cycle_id: newCycleId('2026-06'),
  member_set_hash: faker.string.alphanumeric(64),
  fixed_amount_inr: 310,
  pool_count: poolCount,
  active_member_count: memberCount,
  rule_registry_version: 'v1.0.0',
});

// ─── Bank statement fixtures (per AR-41 normalized schema, B-2 blocker) ─────

export type NormalizedBankRecord = {
  datetime: string; // ISO 8601 UTC
  amount: number; // INR, integer paise
  sender_name: string;
  sender_VPA?: string;
  UTR: string;
  narration: string;
};

export const newBankRecord = (
  overrides: Partial<NormalizedBankRecord> = {},
): NormalizedBankRecord => ({
  datetime: faker.date.recent({ days: 15 }).toISOString(),
  amount: 31000, // ₹310.00 in paise
  sender_name: faker.person.fullName(),
  sender_VPA: `${faker.internet.username()}@upi`,
  UTR: faker.string.alphanumeric({ length: 22, casing: 'upper' }),
  narration: 'TWT contribution',
  ...overrides,
});

// ─── Tier-1 PII tokens (per FR-74 / SM-C5; used by ASR-8 scrape gate) ───────

export const TIER1_PII_TOKEN_ALLOWLIST_FORBIDDEN = [
  'mobile',
  'phone',
  'aadhaar',
  'dob',
  'date_of_birth',
  'address',
  'street',
  'pincode',
  'account_number',
  'bank_account',
  'ifsc',
  'email',
  'medical',
  'illness',
] as const;

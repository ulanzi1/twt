// Field-worker contracts — Story 13.1 (Task 7; AC8).
//
// TWO jobs: (1) the test-only sync-guard binding the re-declared wire tuples to the @twt/domain source tuples (contracts cannot
// import domain in SHIPPED files — the bundle boundary); (2) the request DTO is SHAPE-only and `.strict()` (QE9), and the
// 201 refuses a stray field — ⛔ a `code` (QE22).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_KYC_STATUSES,
  FIELD_WORKER_STATES,
  RegisterFieldWorkerRequest,
  RegisterFieldWorkerResponse,
} from '../src/field-workers/index.js';

describe('field-workers contract ↔ domain sync-guard', () => {
  it('the state and KYC tuples equal the domain tuples', () => {
    expect([...FIELD_WORKER_STATES]).toEqual([...schema.FIELD_WORKER_STATES]);
    expect([...FIELD_WORKER_KYC_STATUSES]).toEqual([...schema.FIELD_WORKER_KYC_STATUSES]);
  });
});

describe('RegisterFieldWorkerRequest — shape only (QE9)', () => {
  it('accepts content the HANDLER will refuse (an unlisted district, a bad mobile, a blank name) — those are 422s, not 400s', () => {
    expect(RegisterFieldWorkerRequest.safeParse({ name: '  ', mobile: 'abc', district: 'Nowhere ' }).success).toBe(true);
  });

  it('refuses a wrong type, an unknown key and an over-long value', () => {
    for (const bad of [
      { name: 1, mobile: '9876543210', district: 'Patna' },
      { name: 'A', mobile: '9876543210' },
      { name: 'A', mobile: '9876543210', district: 'Patna', extra: true },
      { name: 'A', mobile: '9876543210', district: 'Patna', code: '123456' },
      { name: 'x'.repeat(1_001), mobile: '9876543210', district: 'Patna' },
      { name: 'A', mobile: '9'.repeat(65), district: 'Patna' },
      { name: 'A', mobile: '9876543210', district: 'P'.repeat(201) },
    ]) {
      expect(RegisterFieldWorkerRequest.safeParse(bad).success, JSON.stringify(bad).slice(0, 60)).toBe(false);
    }
  });
});

describe('RegisterFieldWorkerResponse (QE22)', () => {
  const ok = { field_worker_id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8', district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' };

  it('parses the four keys and refuses a code, a name or a mobile', () => {
    expect(RegisterFieldWorkerResponse.safeParse(ok).success).toBe(true);
    for (const key of ['code', 'attribution_code', 'name', 'mobile']) {
      expect(RegisterFieldWorkerResponse.safeParse({ ...ok, [key]: 'x' }).success, key).toBe(false);
    }
  });
});

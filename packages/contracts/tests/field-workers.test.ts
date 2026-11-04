// Field-worker contracts — Story 13.1 (Task 7; AC8).
//
// TWO jobs: (1) the test-only sync-guard binding the re-declared wire tuples to the @twt/domain source tuples (contracts cannot
// import domain in SHIPPED files — the bundle boundary); (2) the request DTO is SHAPE-only and `.strict()` (QE9), and the
// 201 refuses a stray field — ⛔ a `code` (QE22).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ApproveFieldWorkerRequest,
  ApproveFieldWorkerResponse,
  FIELD_WORKER_KYC_STATUSES,
  FIELD_WORKER_STATES,
  FieldWorkerCodeResponse,
  FieldWorkerDistrictsResponse,
  FieldWorkerIdentityResponse,
  FieldWorkerListItem,
  FieldWorkerListQuery,
  FieldWorkerListResponse,
  FieldWorkerParams,
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

// ── Story 13.1a (AD5; AC12) — the five new routes' DTOs: `.strict()`, a `code` ONLY in `FieldWorkerCodeResponse`, a `mobile` ONLY
// in the identity (⛔ the list item), and the list query's bounds (`limit` 1–25 coerced from a string; a NUL district refused).
describe('Story 13.1a DTOs', () => {
  const ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
  const item = { field_worker_id: ID, name: 'Ramesh', district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending', registered_by_display: 'Asha Verma', created_at: '2026-11-04T10:15:30.123Z' };

  it('ApproveFieldWorkerRequest is `{}` strictly; the response carries the four keys and nothing else', () => {
    expect(ApproveFieldWorkerRequest.safeParse({}).success).toBe(true);
    expect(ApproveFieldWorkerRequest.safeParse({ field_worker_id: ID }).success).toBe(false);
    const ok = { field_worker_id: ID, district: 'Patna', current_state: 'active', kyc_status: 'completed' };
    expect(ApproveFieldWorkerResponse.safeParse(ok).success).toBe(true);
    for (const key of ['code', 'name', 'mobile', 'approved_by_display']) expect(ApproveFieldWorkerResponse.safeParse({ ...ok, [key]: 'x' }).success, key).toBe(false);
  });

  it('FieldWorkerCodeResponse: the key is `code`, six digits — ⛔ `attributionCode`, ⛔ a name or mobile', () => {
    expect(FieldWorkerCodeResponse.safeParse({ field_worker_id: ID, code: '042719' }).success).toBe(true);
    for (const code of ['42719', '0427190', 'abcdef', '04 2719']) expect(FieldWorkerCodeResponse.safeParse({ field_worker_id: ID, code }).success, code).toBe(false);
    expect(FieldWorkerCodeResponse.safeParse({ field_worker_id: ID, attributionCode: '042719' }).success).toBe(false);
    expect(FieldWorkerCodeResponse.safeParse({ field_worker_id: ID, code: '042719', name: 'x' }).success).toBe(false);
  });

  it('the list item carries the NAME and NO mobile, NO code; the identity adds `mobile` and `approved_by_display` only', () => {
    expect(FieldWorkerListItem.safeParse(item).success).toBe(true);
    for (const key of ['mobile', 'code', 'name_ciphertext', 'mobile_blind_index']) expect(FieldWorkerListItem.safeParse({ ...item, [key]: 'x' }).success, key).toBe(false);
    expect(FieldWorkerListResponse.safeParse({ items: [item], next_cursor: null }).success).toBe(true);
    expect(FieldWorkerListResponse.safeParse({ items: [item] }).success).toBe(false);
    const identity = { ...item, mobile: '+919876543210', approved_by_display: null };
    expect(FieldWorkerIdentityResponse.safeParse(identity).success).toBe(true);
    expect(FieldWorkerIdentityResponse.safeParse({ ...identity, code: '042719' }).success).toBe(false);
    expect(FieldWorkerIdentityResponse.safeParse(item).success).toBe(false); // the mobile is required there
  });

  it('FieldWorkerListQuery: state required; limit 1–25 coerced from a STRING; a NUL or empty district refused; strict', () => {
    expect(FieldWorkerListQuery.safeParse({ state: 'active', limit: '20' })).toMatchObject({ success: true, data: { limit: 20 } });
    expect(FieldWorkerListQuery.safeParse({ state: 'active', district: 'Patna ' })).toMatchObject({ success: true, data: { district: 'Patna ' } }); // ⛔ trimmed
    for (const bad of [
      {},
      { state: 'approved' },
      { state: 'active', limit: '26' },
      { state: 'active', limit: '0' },
      { state: 'active', limit: '2.5' },
      { state: 'active', district: '' },
      { state: 'active', district: `Pat${String.fromCharCode(0)}na` },
      { state: 'active', district: 'P'.repeat(201) },
      { state: 'active', cursor: '   ' },
      { state: 'active', offset: '20' },
    ]) {
      expect(FieldWorkerListQuery.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it('FieldWorkerDistrictsResponse and FieldWorkerParams are strict', () => {
    expect(FieldWorkerDistrictsResponse.safeParse({ districts: ['Gaya'], districts_truncated: false }).success).toBe(true);
    expect(FieldWorkerDistrictsResponse.safeParse({ districts: ['Gaya'] }).success).toBe(false);
    expect(FieldWorkerParams.safeParse({ pariwarId: ID, fieldWorkerId: ID }).success).toBe(true);
    expect(FieldWorkerParams.safeParse({ pariwarId: ID, fieldWorkerId: 'districts' }).success).toBe(false);
  });
});

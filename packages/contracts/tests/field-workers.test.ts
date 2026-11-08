// Field-worker contracts — Story 13.1 (Task 7; AC8).
//
// TWO jobs: (1) the test-only sync-guard binding the re-declared wire tuples to the @twt/domain source tuples (contracts cannot
// import domain in SHIPPED files — the bundle boundary); (2) the request DTO is SHAPE-only and `.strict()` (QE9), and the
// 201 refuses a stray field — ⛔ a `code` (QE22).

import { fieldWorker, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ApproveFieldWorkerRequest,
  ApproveFieldWorkerResponse,
  FIELD_WORKER_KYC_STATUSES,
  FIELD_WORKER_CODE_SMS_STATUSES,
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
  FIELD_WORKER_EVENT_TYPES,
  FIELD_WORKER_LOG_MAX_LIMIT,
  FIELD_WORKER_POST_REASONS,
  FIELD_WORKER_REASON_CODES,
  FIELD_WORKER_SUSPEND_REASONS,
  FIELD_WORKER_TERMINATE_REASONS,
  FieldWorkerLifecycleResult,
  FieldWorkerLog,
  FieldWorkerLogQuery,
  MoveFieldWorkerRequest,
  ReactivateFieldWorkerRequest,
  SuspendFieldWorkerRequest,
  TerminateFieldWorkerRequest,
} from '../src/field-workers/index.js';

describe('field-workers contract ↔ domain sync-guard', () => {
  it('the state and KYC tuples equal the domain tuples', () => {
    expect([...FIELD_WORKER_STATES]).toEqual([...schema.FIELD_WORKER_STATES]);
    expect([...FIELD_WORKER_KYC_STATUSES]).toEqual([...schema.FIELD_WORKER_KYC_STATUSES]);
    expect([...FIELD_WORKER_CODE_SMS_STATUSES]).toEqual([...schema.FIELD_WORKER_CODE_SMS_STATUSES]);
  });

  // Story 13.1c (Task 3.1) — the three reason tuples, the whole reason enum (in its Postgres order — `died` last) and the event types.
  it('the reason tuples and the event types equal the domain tuples (13.1c)', () => {
    expect([...FIELD_WORKER_REASON_CODES]).toEqual([...schema.FIELD_WORKER_REASON_CODES]);
    expect([...FIELD_WORKER_SUSPEND_REASONS]).toEqual([...fieldWorker.FIELD_WORKER_SUSPEND_REASONS]);
    expect([...FIELD_WORKER_TERMINATE_REASONS]).toEqual([...fieldWorker.FIELD_WORKER_TERMINATE_REASONS]);
    expect([...FIELD_WORKER_POST_REASONS]).toEqual([...fieldWorker.FIELD_WORKER_POST_REASONS]);
    expect([...FIELD_WORKER_EVENT_TYPES]).toEqual([...fieldWorker.FIELD_WORKER_EVENT_TYPES]);
  });

  // Review R2-11 — the log's page cap is re-declared too: the OpenAPI `maximum` (what `forced-pagination.spec.ts` reads) and the clamp
  // must be the most the domain serves, or a page silently holds fewer than the declared maximum.
  it('the log page cap equals the domain cap, and an over-cap limit clamps to it (13.1c)', () => {
    expect(FIELD_WORKER_LOG_MAX_LIMIT).toBe(fieldWorker.LIST_FIELD_WORKER_EVENTS_MAX_LIMIT);
    expect(FieldWorkerLogQuery.parse({ limit: '1000' }).limit).toBe(fieldWorker.LIST_FIELD_WORKER_EVENTS_MAX_LIMIT);
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
  const item = { field_worker_id: ID, name: 'Ramesh', district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending', registered_by_display: 'Asha Verma', created_at: '2026-11-04T10:15:30.123Z', code_sms_status: null };

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

  it('Story 13.1b (AD12) — `code_sms_status` is REQUIRED and nullable, inside the enum; `detail`, `provider_message_id` and `locale` are refused', () => {
    const without = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'code_sms_status')) as Partial<T>;
    expect(FieldWorkerListItem.safeParse(without(item)).success).toBe(false);
    for (const status of [...FIELD_WORKER_CODE_SMS_STATUSES, null]) {
      expect(FieldWorkerListItem.safeParse({ ...item, code_sms_status: status }).success, String(status)).toBe(true);
    }
    for (const status of ['accepted', 'error', 'due', '', 0]) {
      expect(FieldWorkerListItem.safeParse({ ...item, code_sms_status: status }).success, String(status)).toBe(false);
    }
    for (const key of ['detail', 'provider_message_id', 'locale']) expect(FieldWorkerListItem.safeParse({ ...item, [key]: 'x' }).success, key).toBe(false);
    const identity = { ...item, mobile: '+919876543210', approved_by_display: null };
    expect(FieldWorkerIdentityResponse.safeParse(without(identity)).success).toBe(false);
    expect(FieldWorkerIdentityResponse.safeParse({ ...identity, detail: 'x' }).success).toBe(false);
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

// ── Story 13.1c (AD6, AD7; AC6 (f), AC8, AC11) — the four writes and the log: shape-only, `.strict()`, each act's OWN reason list, and
// ⛔ a name, a mobile or a code in any response.
describe('Story 13.1c DTOs', () => {
  const ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
  const NUL = String.fromCharCode(0);

  it('move: both districts and a MOVE reason; a NUL or blank district, a suspension reason or an unknown key is refused', () => {
    expect(MoveFieldWorkerRequest.safeParse({ from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' }).success).toBe(true);
    // Shape only: an unlisted district passes (the domain's 422).
    expect(MoveFieldWorkerRequest.safeParse({ from_district: 'Patna ', to_district: 'Nowhere', reason_code: 'at_worker_request' }).success).toBe(true);
    for (const bad of [
      { from_district: 'Patna', to_district: 'Gaya', reason_code: 'under_review' },
      { to_district: 'Gaya', reason_code: 'reassigned' },
      { from_district: 'Patna', to_district: '', reason_code: 'reassigned' },
      { from_district: 'Patna', to_district: `Ga${NUL}ya`, reason_code: 'reassigned' },
      { from_district: 'P'.repeat(201), to_district: 'Gaya', reason_code: 'reassigned' },
      { from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned', field_worker_id: ID },
    ]) {
      expect(MoveFieldWorkerRequest.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it('suspend / reactivate / terminate take ONLY their own reasons; terminate takes the four (with died), ⛔ a labelling reason; reactivate is `{}`', () => {
    for (const r of ['under_review', 'at_worker_request']) expect(SuspendFieldWorkerRequest.safeParse({ reason_code: r }).success, r).toBe(true);
    for (const r of ['inactive', 'died', 'reassigned', 'conduct', undefined]) expect(SuspendFieldWorkerRequest.safeParse({ reason_code: r }).success, String(r)).toBe(false);
    for (const r of ['left_voluntarily', 'inactive', 'registered_in_error', 'died']) {
      expect(TerminateFieldWorkerRequest.safeParse({ reason_code: r, ended_on: '2026-11-07' }).success, r).toBe(true);
    }
    for (const r of ['conduct', 'conduct_concern', 'fraud_confirmed', 'under_review', 'reassigned']) {
      expect(TerminateFieldWorkerRequest.safeParse({ reason_code: r, ended_on: '2026-11-07' }).success, r).toBe(false);
    }
    // The SHAPE of ended_on only: 2026-02-30 passes here (the domain's 422); a malformed one is 400.
    expect(TerminateFieldWorkerRequest.safeParse({ reason_code: 'inactive', ended_on: '2026-02-30' }).success).toBe(true);
    for (const d of ['07-11-2026', '2026-11-07T00:00:00Z', '', undefined]) {
      expect(TerminateFieldWorkerRequest.safeParse({ reason_code: 'inactive', ended_on: d }).success, String(d)).toBe(false);
    }
    expect(ReactivateFieldWorkerRequest.safeParse({}).success).toBe(true);
    expect(ReactivateFieldWorkerRequest.safeParse({ reason_code: 'under_review' }).success).toBe(false);
  });

  it('the lifecycle result carries the five keys and refuses a code, a name or a mobile', () => {
    const ok = { field_worker_id: ID, district: 'Gaya', current_state: 'terminated', state_reason_code: 'died', ended_on: '2026-11-07' };
    expect(FieldWorkerLifecycleResult.safeParse(ok).success).toBe(true);
    expect(FieldWorkerLifecycleResult.safeParse({ ...ok, current_state: 'active', state_reason_code: null, ended_on: null }).success).toBe(true);
    for (const key of ['code', 'name', 'mobile']) expect(FieldWorkerLifecycleResult.safeParse({ ...ok, [key]: 'x' }).success, key).toBe(false);
  });

  it('the log query: `after` ≥ 0; `limit` 1–100, an OVER-CAP limit CLAMPED to 100 (never an error); a fraction, 0 or text is refused', () => {
    expect(FieldWorkerLogQuery.parse({})).toEqual({});
    expect(FieldWorkerLogQuery.parse({ after: '5', limit: '40' })).toEqual({ after: 5, limit: 40 });
    expect(FieldWorkerLogQuery.parse({ limit: '1000' })).toEqual({ limit: 100 });
    expect(FieldWorkerLogQuery.parse({ limit: 101 })).toEqual({ limit: 100 });
    // Every spelling of an over-cap whole number clamps - never an error (AC8; review CR13); the cap itself and values under it pass through.
    for (const spelling of ['1e3', '1000.0', '+1000', ' 1000 ', 'Infinity', '9'.repeat(400)]) {
      expect(FieldWorkerLogQuery.parse({ limit: spelling }), spelling).toEqual({ limit: 100 });
    }
    expect(FieldWorkerLogQuery.parse({ limit: '100' })).toEqual({ limit: 100 });
    expect(FieldWorkerLogQuery.parse({ limit: '99' })).toEqual({ limit: 99 });
    // The largest `after` the domain accepts (`Number.isSafeInteger`) passes; one past it, and an exponent form, are a 400 (review CR8).
    expect(FieldWorkerLogQuery.parse({ after: String(Number.MAX_SAFE_INTEGER) })).toEqual({ after: Number.MAX_SAFE_INTEGER });
    for (const bad of [
      { limit: '0' },
      { limit: '2.5' },
      { limit: '1000.5' },
      { limit: '-1000' },
      { limit: '' },
      { limit: 'all' },
      { after: '-1' },
      { after: 'x' },
      { after: '9007199254740992' },
      { after: '1e21' },
      { page: 'all' },
    ]) {
      expect(FieldWorkerLogQuery.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it('a log item: the eleven keys, every optional field nullable; ⛔ a name, a mobile or a code key; event_type from the seven', () => {
    const item = {
      event_version: 1,
      event_type: 'field_worker.registered',
      occurred_at: '2026-11-07T10:15:30.123Z',
      actor: { user_id: ID, display_name: null, role: 'district_admin' },
      permission_key: 'field_worker.register',
      grant: { dimension: 'district', value: 'Patna' },
      target_district: 'Patna',
      reason_code: null,
      from_district: null,
      to_district: null,
      ended_on: null,
    };
    expect(FieldWorkerLog.safeParse({ items: [item], next_after: null }).success).toBe(true);
    for (const key of ['code', 'name', 'mobile', 'payload']) expect(FieldWorkerLog.safeParse({ items: [{ ...item, [key]: 'x' }], next_after: null }).success, key).toBe(false);
    expect(FieldWorkerLog.safeParse({ items: [{ ...item, event_type: 'field_worker.moved' }], next_after: null }).success).toBe(false);
    expect(FieldWorkerLog.safeParse({ items: [{ ...item, actor: { ...item.actor, email: 'a@b.c' } }], next_after: null }).success).toBe(false);
  });
});

// ── Story 13.1d — the move request and the notices (`2026-11-08-458` AD6, AD7, AD9; `-460`) ──────────────────────────────────────
describe('Story 13.1d — contract ↔ domain sync-guard and DTO shapes', () => {
  it('every re-declared tuple equals its @twt/domain source, in order; the list cap is the domain’s', async () => {
    const c = await import('../src/field-workers/index.js');
    expect([...c.FIELD_WORKER_MOVE_REQUEST_STATES]).toEqual([...schema.FIELD_WORKER_MOVE_REQUEST_STATES]);
    expect([...c.FIELD_WORKER_MOVE_REFUSAL_REASONS]).toEqual([...schema.FIELD_WORKER_MOVE_REFUSAL_REASONS]);
    expect([...c.FIELD_WORKER_MOVE_ESCALATION_CAUSES]).toEqual([...schema.FIELD_WORKER_MOVE_ESCALATION_CAUSES]);
    expect([...c.FIELD_WORKER_MOVE_SUPERSEDE_CAUSES]).toEqual([...schema.FIELD_WORKER_MOVE_SUPERSEDE_CAUSES]);
    expect([...c.FIELD_WORKER_MOVE_OPENED_AT_ENDS]).toEqual([...schema.FIELD_WORKER_MOVE_OPENED_AT_ENDS]);
    expect([...c.FIELD_WORKER_NOTICE_KINDS]).toEqual([...schema.FIELD_WORKER_NOTICE_KINDS]);
    expect([...c.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES]).toEqual([...fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES]);
    expect(c.FIELD_WORKER_MOVE_REQUEST_LIST_MAX_LIMIT).toBe(fieldWorker.PAGE_MOVE_REQUESTS_MAX_LIMIT);
    expect(c.FIELD_WORKER_NOTICE_LIST_MAX_LIMIT).toBe(fieldWorker.PAGE_NOTICES_MAX_LIMIT);
    // ONE audit line a page names every worker on it: 25 ids and the prefix fit the 1,024-character locator.
    expect(`field_workers/${Array.from({ length: c.FIELD_WORKER_MOVE_REQUEST_LIST_MAX_LIMIT }, () => '7c9e6679-7425-40de-944b-e07fc1f90ae7').join(',')}`.length).toBeLessThanOrEqual(1024);
  });

  it('the requests are strict and shape-only; a refusal reason outside AD7 or free text is refused; an over-cap limit clamps', async () => {
    const c = await import('../src/field-workers/index.js');
    expect(c.OpenFieldWorkerMoveRequestRequest.safeParse({ from_district: 'Patna', to_district: 'Gaya' }).success).toBe(true);
    expect(c.OpenFieldWorkerMoveRequestRequest.safeParse({ from_district: 'Patna', to_district: 'Gaya', name: 'x' }).success).toBe(false);
    expect(c.FieldWorkerMoveRequestActRequest.safeParse({}).success).toBe(true);
    expect(c.FieldWorkerMoveRequestActRequest.safeParse({ note: 'x' }).success).toBe(false);
    expect(c.RefuseFieldWorkerMoveRequestRequest.safeParse({ reason_code: 'no_capacity' }).success).toBe(true);
    for (const r of ['busy', 'We are full', '']) expect(c.RefuseFieldWorkerMoveRequestRequest.safeParse({ reason_code: r }).success, r).toBe(false);
    expect(c.FieldWorkerMoveRequestListQuery.parse({ state: 'open', limit: '1000' }).limit).toBe(25);
    expect(c.FieldWorkerMoveRequestListQuery.safeParse({ state: 'open', limit: '0' }).success).toBe(false);
    expect(c.FieldWorkerMoveRequestListQuery.safeParse({ state: 'pending' }).success).toBe(false);
    expect(c.FieldWorkerNoticeListQuery.parse({ limit: '1e3' }).limit).toBe(100);
    expect(c.MarkFieldWorkerNoticesSeenRequest.safeParse({ notice_ids: [] }).success).toBe(false);
    expect(c.MarkFieldWorkerNoticesSeenRequest.safeParse({ notice_ids: Array.from({ length: 101 }, () => '7c9e6679-7425-40de-944b-e07fc1f90ae7') }).success).toBe(false);
  });

  it('`-460`: the detail’s worker block has NO reason, actor, mobile or code key — and members_onboarded is nullable', async () => {
    const c = await import('../src/field-workers/index.js');
    const keys = Object.keys(c.FieldWorkerMoveRequestWorker.shape);
    for (const banned of ['reason_code', 'state_reason_code', 'actor', 'mobile', 'code', 'registered_by_display', 'approved_by_display']) {
      expect(keys, banned).not.toContain(banned);
    }
    const w = {
      field_worker_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', name: 'A', current_state: 'active', registered_on: '2026-01-02', active_since: null,
      districts: [{ district: 'Patna', from: '2026-01-02', to: null }], suspensions: [], history_truncated: false, members_onboarded: null,
    };
    expect(c.FieldWorkerMoveRequestWorker.safeParse(w).success).toBe(true);
    expect(c.FieldWorkerMoveRequestWorker.safeParse({ ...w, suspensions: [{ from: '2026-02-01', to: null, reason: 'under_review' }] }).success).toBe(false);
    for (const schemaName of ['FieldWorkerMoveRequestResult', 'FieldWorkerNoticeItem', 'FieldWorkerMoveRequestEvent'] as const) {
      const k = Object.keys(c[schemaName].shape);
      expect(k, schemaName).not.toContain('name');
      expect(k, schemaName).not.toContain('mobile');
    }
  });
});

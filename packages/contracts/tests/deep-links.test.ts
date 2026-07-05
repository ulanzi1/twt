// Deep-link grammar contract tests — Story 5.2 (Task 6; AC4).
//
// (1) Per-category target derivation from alert_category + payload_data (the ids that exist TODAY).
// (2) `formatDeepLink` produces the canonical `twt://p/<pariwar>/<resource>[/<id>]` URI.
// (3) `parseDeepLink` round-trips (format ∘ parse === identity) + rejects non-grammar input.
// (4) `step_up_otp` has no push deep-link (null); `niyamavali_amended` targets the announcement feed.

import { describe, expect, it } from 'vitest';

import { Alert } from '../src/alerts/index.js';
import { deepLinkTargetForAlert, formatDeepLink, parseDeepLink } from '../src/deep-links/index.js';

const ALERT_ID = '11111111-1111-4111-8111-111111111111';
const PARIWAR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const POOL_ID = '44444444-4444-4444-8444-444444444444';
const CLAIM_ID = '55555555-5555-4555-8555-555555555555';
const TICKET_ID = '66666666-6666-4666-8666-666666666666';
const MODULE_ID = '77777777-7777-4777-8777-777777777777';

function alert(alert_category: string, payload_data: unknown): Alert {
  return Alert.parse({
    alert_id: ALERT_ID,
    pariwar_id: PARIWAR_ID,
    member_id: MEMBER_ID,
    alert_category,
    time_critical: false,
    provenance_refs: {},
    created_at: '2026-07-05T10:00:00.000Z',
    created_by_actor: 'system',
    payload_data,
  });
}

describe('deepLinkTargetForAlert (AC4 — derived from payload_data)', () => {
  it('maps each push category to its resource + id', () => {
    expect(deepLinkTargetForAlert(alert('alert_published', { title: 'T', body: 'B' }))).toEqual({
      pariwarId: PARIWAR_ID,
      resource: 'announcements',
      resourceId: ALERT_ID,
    });
    expect(
      deepLinkTargetForAlert(alert('deadline_reminder', { subject: 'S', deadline_at: '2026-07-05T10:00:00.000Z', deadline_display: 'soon' })),
    ).toEqual({ pariwarId: PARIWAR_ID, resource: 'renewals', resourceId: null });
    expect(
      deepLinkTargetForAlert(alert('contribution_confirmed', { pool_id: POOL_ID, amount_paise: 100, period_label: 'Jul' })),
    ).toEqual({ pariwarId: PARIWAR_ID, resource: 'contributions', resourceId: POOL_ID });
    expect(
      deepLinkTargetForAlert(alert('contribution_mismatch', { pool_id: POOL_ID, expected_paise: 100, actual_paise: 50 })),
    ).toMatchObject({ resource: 'contributions', resourceId: POOL_ID });
    expect(deepLinkTargetForAlert(alert('claim_status_change', { claim_id: CLAIM_ID, new_status: 'approved' }))).toMatchObject({
      resource: 'claims',
      resourceId: CLAIM_ID,
    });
    expect(deepLinkTargetForAlert(alert('helpdesk_reply', { ticket_id: TICKET_ID }))).toMatchObject({
      resource: 'tickets',
      resourceId: TICKET_ID,
    });
    expect(deepLinkTargetForAlert(alert('module_new', { module_id: MODULE_ID, module_title: 'M' }))).toMatchObject({
      resource: 'modules',
      resourceId: MODULE_ID,
    });
  });

  it('niyamavali_amended reaches push via the GENERAL announcement path (not an 8th FR-71 category)', () => {
    expect(
      deepLinkTargetForAlert(alert('niyamavali_amended', { clause_id: 'niy.retirement.x', amendment_summary: 'changed' })),
    ).toEqual({ pariwarId: PARIWAR_ID, resource: 'announcements', resourceId: ALERT_ID });
  });

  it('step_up_otp has no push deep-link (SMS transport, Story 5.9)', () => {
    expect(deepLinkTargetForAlert(alert('step_up_otp', { purpose: 'p', ttl_seconds: 60 }))).toBeNull();
  });
});

describe('formatDeepLink / parseDeepLink round-trip', () => {
  it('formats the canonical tenant-scoped URI', () => {
    expect(formatDeepLink({ pariwarId: PARIWAR_ID, resource: 'claims', resourceId: CLAIM_ID })).toBe(
      `twt://p/${PARIWAR_ID}/claims/${CLAIM_ID}`,
    );
    expect(formatDeepLink({ pariwarId: PARIWAR_ID, resource: 'renewals', resourceId: null })).toBe(
      `twt://p/${PARIWAR_ID}/renewals`,
    );
  });

  it('round-trips format ∘ parse for id and id-less targets', () => {
    for (const uri of [`twt://p/${PARIWAR_ID}/claims/${CLAIM_ID}`, `twt://p/${PARIWAR_ID}/renewals`]) {
      const parsed = parseDeepLink(uri);
      expect(parsed).not.toBeNull();
      expect(formatDeepLink(parsed!)).toBe(uri);
    }
  });

  it('rejects non-grammar input', () => {
    expect(parseDeepLink('https://evil.example/claims/x')).toBeNull();
    expect(parseDeepLink('twt://p/not-a-uuid/claims/x')).toBeNull();
    expect(parseDeepLink('twt://p/' + PARIWAR_ID + '/unknown-resource/x')).toBeNull();
    expect(parseDeepLink('twt://p/' + PARIWAR_ID + '/claims/x/extra/segments')).toBeNull();
  });

  it('URI-encodes a resourceId/pariwarId containing reserved characters instead of corrupting the URI (code-review fix)', () => {
    // A caller bypassing DeepLinkTarget.parse (e.g. constructing a literal) could hand formatDeepLink an
    // unencoded '/' — it must not shift the URI's segment structure.
    expect(formatDeepLink({ pariwarId: PARIWAR_ID, resource: 'claims', resourceId: 'abc/def' })).toBe(
      `twt://p/${PARIWAR_ID}/claims/abc%2Fdef`,
    );
  });
});

describe('deepLinkTargetForAlert fails safe on a missing runtime id (code-review fix)', () => {
  it('returns null instead of a literal "undefined" segment when a required payload id is falsy at runtime', () => {
    // Alert.parse's UuidString requirement makes this unreachable through normal construction — this
    // exercises the defensive guard directly for a caller that bypasses validation (e.g. render.ts's
    // `alert as Alert` cast), the exact scenario the guard exists for.
    const bypassed = {
      alert_id: ALERT_ID,
      pariwar_id: PARIWAR_ID,
      member_id: MEMBER_ID,
      alert_category: 'claim_status_change',
      time_critical: false,
      provenance_refs: {},
      created_at: '2026-07-05T10:00:00.000Z',
      created_by_actor: 'system',
      payload_data: { claim_id: '', new_status: 'approved' },
    } as unknown as Alert;
    expect(deepLinkTargetForAlert(bypassed)).toBeNull();
  });
});

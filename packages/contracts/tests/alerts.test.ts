// Alert channel-primitive contract tests — Story 5.1 (Task 1; AC1).
//
// (1) Each of the 9 categories parses a valid payload.
// (2) `.strict()` rejects an unknown top-level key.
// (3) The discriminated union rejects a WRONG-shape `payload_data` for a category (the wrong-category
//     payload is caught because the discriminant `alert_category` selects that category's payload schema).
// (4) An out-of-enum `alert_category` is rejected.

import { describe, expect, it } from 'vitest';

import { Alert, AlertCategory } from '../src/alerts/index.js';

const ALERT_ID = '11111111-1111-4111-8111-111111111111';
const PARIWAR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const POOL_ID = '44444444-4444-4444-8444-444444444444';
const CLAIM_ID = '55555555-5555-4555-8555-555555555555';
const TICKET_ID = '66666666-6666-4666-8666-666666666666';
const MODULE_ID = '77777777-7777-4777-8777-777777777777';
const CREATED_AT = '2026-07-05T10:00:00.000Z';

/** Common envelope for a variant with a given category + payload_data. */
function envelope(alert_category: string, payload_data: unknown): Record<string, unknown> {
  return {
    alert_id: ALERT_ID,
    pariwar_id: PARIWAR_ID,
    member_id: MEMBER_ID,
    alert_category,
    time_critical: false,
    provenance_refs: {},
    created_at: CREATED_AT,
    created_by_actor: 'system',
    payload_data,
  };
}

/** One valid payload_data per category. */
const VALID_PAYLOADS: Record<AlertCategory, unknown> = {
  alert_published: { title: 'Monsoon drive', body: 'Join us this Saturday.' },
  deadline_reminder: { subject: 'Renewal due', deadline_at: CREATED_AT, deadline_display: '5 July 2026, 3:30 PM IST' },
  contribution_confirmed: { pool_id: POOL_ID, amount_paise: 11000, period_label: 'Jul 2026' },
  contribution_mismatch: { pool_id: POOL_ID, expected_paise: 11000, actual_paise: 10000 },
  claim_status_change: { claim_id: CLAIM_ID, new_status: 'approved' },
  helpdesk_reply: { ticket_id: TICKET_ID },
  module_new: { module_id: MODULE_ID, module_title: 'Nominee basics' },
  step_up_otp: { purpose: 'withdrawal', ttl_seconds: 300 },
  niyamavali_amended: { clause_id: 'niy.retirement.eligibility', amendment_summary: 'Grace extended.' },
};

describe('Alert schema (AC1)', () => {
  it('parses a valid payload for each of the 9 categories', () => {
    for (const category of AlertCategory.options) {
      const parsed = Alert.safeParse(envelope(category, VALID_PAYLOADS[category]));
      expect(parsed.success, `${category} should parse`).toBe(true);
    }
  });

  it('exposes exactly the 9 categories', () => {
    expect(AlertCategory.options).toHaveLength(9);
  });

  it('rejects an unknown top-level key (.strict())', () => {
    const withExtra = { ...envelope('alert_published', VALID_PAYLOADS.alert_published), rogue: 'x' };
    expect(Alert.safeParse(withExtra).success).toBe(false);
  });

  it('rejects an unknown key inside payload_data (.strict())', () => {
    const badPayload = { ...(VALID_PAYLOADS.alert_published as object), rogue: 'x' };
    expect(Alert.safeParse(envelope('alert_published', badPayload)).success).toBe(false);
  });

  it('rejects a payload_data whose shape belongs to a DIFFERENT category', () => {
    // claim_status_change payload placed under contribution_confirmed → the discriminant selects the
    // contribution_confirmed schema, which rejects the claim shape.
    const mismatched = Alert.safeParse(
      envelope('contribution_confirmed', VALID_PAYLOADS.claim_status_change),
    );
    expect(mismatched.success).toBe(false);
  });

  it('rejects an out-of-enum alert_category', () => {
    expect(Alert.safeParse(envelope('not_a_category', { anything: true })).success).toBe(false);
  });

  it('rejects an unknown provenance_refs key (.strict())', () => {
    const payload = envelope('claim_status_change', VALID_PAYLOADS.claim_status_change);
    payload.provenance_refs = { claim_id: CLAIM_ID, rogue_ref: 'x' };
    expect(Alert.safeParse(payload).success).toBe(false);
  });

  it('rejects a paise amount beyond MAX_SAFE_INTEGER (no scientific-notation renders)', () => {
    // 1e21 is integer-valued (`.int()` alone accepts it) but renders as `₹1e+19` — the bound rejects it.
    const huge = envelope('contribution_confirmed', { pool_id: POOL_ID, amount_paise: 1e21, period_label: 'Jul 2026' });
    expect(Alert.safeParse(huge).success).toBe(false);
  });

  it('requires the producer-formatted deadline_display on deadline_reminder', () => {
    const missingDisplay = envelope('deadline_reminder', { subject: 'Renewal due', deadline_at: CREATED_AT });
    expect(Alert.safeParse(missingDisplay).success).toBe(false);
  });
});

// The self-verify screenshot-upload event schema fence — Story 9.7 (Task 1/7), DB-free.
//
// Proves the NEW `reconciliation.self-verify-screenshot-uploaded` event (Decision D2) is:
//   (1) `.strict()` — an unknown key is rejected (no silent PII leakage into the payload);
//   (2) exhaustively bound in `RECONCILIATION_EVENT_PAYLOAD_SCHEMAS` (the `satisfies` map) + the
//       `RECONCILIATION_EVENT_TYPES` union — the single source of truth the registry consumes;
//   (3) a `reconciliation.*` type, NOT a `contribution.*` one — it must stay clear of Story 8.10's
//       exactly-three-`contribution.*`-types fence (the 9.3 D6 precedent, verified not assumed).

import { describe, expect, it } from 'vitest';

import {
  RECONCILIATION_EVENT_PAYLOAD_SCHEMAS,
  RECONCILIATION_EVENT_TYPES,
  RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
  ReconciliationSelfVerifyScreenshotUploadedPayloadSchema,
} from '../../src/reconciliation/events.js';

const POOL_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const ALERT_ID = '33333333-3333-3333-3333-333333333333';

const VALID = {
  poolId: POOL_ID,
  memberId: MEMBER_ID,
  alertId: ALERT_ID,
  objectKey: 'pariwar/p/pool/x/abc',
  mismatchReason: 'wrong_pool' as const,
  contentType: 'image/jpeg',
  uploadedAt: '2026-07-27T10:00:00.000Z',
};

describe('reconciliation.self-verify-screenshot-uploaded payload (Story 9.7, AC3/AC4)', () => {
  it('round-trips a valid payload (with a live mismatch reason)', () => {
    expect(ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse(VALID)).toEqual(VALID);
  });

  it('accepts a NULL mismatchReason (the FR-32 "Trouble with UTR?" fallback has no live mismatch)', () => {
    const fallback = { ...VALID, mismatchReason: null };
    expect(ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse(fallback)).toEqual(fallback);
  });

  it('is .strict() — an unknown key is rejected (no free-text / PII leak into the payload)', () => {
    expect(() =>
      ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse({ ...VALID, note: 'paid via GPay' }),
    ).toThrow();
  });

  it('rejects a non-datetime uploadedAt, an empty objectKey, and a non-uuid scope key', () => {
    expect(() => ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse({ ...VALID, uploadedAt: 'today' })).toThrow();
    expect(() => ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse({ ...VALID, objectKey: '' })).toThrow();
    expect(() => ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse({ ...VALID, poolId: 'not-a-uuid' })).toThrow();
  });

  it('rejects an unknown mismatch reason (aligned with the contribution mismatch vocabulary)', () => {
    expect(() =>
      ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse({ ...VALID, mismatchReason: 'made_up' }),
    ).toThrow();
  });
});

describe('the event is bound exhaustively + is a reconciliation.* type (Story 8.10 fence discipline)', () => {
  it('is a member of RECONCILIATION_EVENT_TYPES', () => {
    expect(RECONCILIATION_EVENT_TYPES).toContain(RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE);
  });

  it('has a schema in the RECONCILIATION_EVENT_PAYLOAD_SCHEMAS satisfies-map', () => {
    expect(RECONCILIATION_EVENT_PAYLOAD_SCHEMAS[RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE]).toBe(
      ReconciliationSelfVerifyScreenshotUploadedPayloadSchema,
    );
  });

  it('is a reconciliation.* type, NOT a contribution.* one (dodges the 8.10 fence)', () => {
    expect(RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE.startsWith('reconciliation.')).toBe(true);
    expect(RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE.startsWith('contribution.')).toBe(false);
  });
});

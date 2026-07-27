// The trustee reject-verdict event schema fence — Story 9.8 (Task 1; Decision D1), DB-free.
//
// Proves the NEW `reconciliation.contribution-rejected` event is:
//   (1) `.strict()` — an unknown key is rejected (no free-text / PII leak into the payload);
//   (2) exhaustively bound in `RECONCILIATION_EVENT_PAYLOAD_SCHEMAS` + `RECONCILIATION_EVENT_TYPES`;
//   (3) a `reconciliation.*` type, NOT a `contribution.*` one — it MUST stay clear of Story 8.10's
//       exactly-three-`contribution.*`-types fence (Decision D1 — `invalid` is the outcome word, not an
//       event type; verified not assumed);
//   (4) carrying a bounded reject-family reason code + ≥1 attesting actor.

import { describe, expect, it } from 'vitest';

import {
  RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
  RECONCILIATION_EVENT_PAYLOAD_SCHEMAS,
  RECONCILIATION_EVENT_TYPES,
  ReconciliationContributionRejectedPayloadSchema,
} from '../../src/reconciliation/events.js';

const POOL_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const ALERT_ID = '33333333-3333-3333-3333-333333333333';

const VALID = {
  poolId: POOL_ID,
  memberId: MEMBER_ID,
  alertId: ALERT_ID,
  reasonCode: 'no_statement_entry' as const,
  attestedByActorIds: ['actor-1'],
  rejectedAt: '2026-07-27T10:00:00.000Z',
};

describe('reconciliation.contribution-rejected payload (Story 9.8, AC4, D1)', () => {
  it('round-trips a valid reject payload', () => {
    expect(ReconciliationContributionRejectedPayloadSchema.parse(VALID)).toEqual(VALID);
  });

  it('is .strict() — an unknown key is rejected (no rationale/PII leak into the payload)', () => {
    expect(() =>
      ReconciliationContributionRejectedPayloadSchema.parse({ ...VALID, rationale: 'looked fake' }),
    ).toThrow();
  });

  it('requires ≥1 attesting actor', () => {
    expect(() =>
      ReconciliationContributionRejectedPayloadSchema.parse({ ...VALID, attestedByActorIds: [] }),
    ).toThrow();
  });

  it('rejects a non-uuid scope key, a bad datetime, and an unknown reason code', () => {
    expect(() => ReconciliationContributionRejectedPayloadSchema.parse({ ...VALID, poolId: 'nope' })).toThrow();
    expect(() => ReconciliationContributionRejectedPayloadSchema.parse({ ...VALID, rejectedAt: 'today' })).toThrow();
    expect(() =>
      ReconciliationContributionRejectedPayloadSchema.parse({ ...VALID, reasonCode: 'made_up' }),
    ).toThrow();
  });
});

describe('the reject event is bound exhaustively + is a reconciliation.* type (Story 8.10 fence discipline)', () => {
  it('is a member of RECONCILIATION_EVENT_TYPES', () => {
    expect(RECONCILIATION_EVENT_TYPES).toContain(RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE);
  });

  it('has a schema in the RECONCILIATION_EVENT_PAYLOAD_SCHEMAS satisfies-map', () => {
    expect(RECONCILIATION_EVENT_PAYLOAD_SCHEMAS[RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE]).toBe(
      ReconciliationContributionRejectedPayloadSchema,
    );
  });

  it('is a reconciliation.* type, NOT a contribution.* one (dodges the 8.10 fence; D1)', () => {
    expect(RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE.startsWith('reconciliation.')).toBe(true);
    expect(RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE.startsWith('contribution.')).toBe(false);
  });
});

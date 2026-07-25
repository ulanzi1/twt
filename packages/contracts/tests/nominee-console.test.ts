// The Nominee Console read-model SHAPE test — Story 9.1 (Task 1/3/5). Decoy-teeth: a future dev cannot
// violate the honest-seam invariants without this test going red.
//
// Load-bearing assertions:
//   1. Self-suppression discriminator (AC1): the response is a discriminated union on `isNominee`;
//      `{ isNominee: false }` is the first-class absence signal the client renders as null.
//   2. The honest-seam invariant (AC1): the validated shape carries NO upload-queue field (9.3), NO
//      per-pool reconciliation-status/pill field (9.6), NO statement/UTR/matcher field — `.strict()`
//      rejects them. Those slots are first-class `{available:false}` placeholders, never a shape field here.
//   3. The takeover verdict is a server-authoritative projection (AC3): `takeover` carries ONLY
//      { eligible, daysSinceEngagement } — NO raw lastEngagedAt/threshold/clock field crosses the wire.

import { describe, expect, it } from 'vitest';

import {
  NomineeConsolePoolIdentity,
  NomineeConsoleResponse,
  NomineeConsoleTakeover,
  NonNomineeConsole,
  ValidatedNomineeConsole,
} from '../src/nominee-console/index.js';

const VALID_VALIDATED = {
  isNominee: true as const,
  pool: { letterCode: 'F', name: null, canonicalIdentifier: 'P-2026-07-001' },
  takeover: { eligible: false, daysSinceEngagement: 3 },
  poolOpenAtIso: '2026-07-01T00:00:00.000Z',
  lastUpdatedIso: '2026-07-04T09:30:00.000Z',
};

describe('AC1 — self-suppression discriminator on `isNominee`', () => {
  it('accepts the first-class absence signal { isNominee: false } and nothing else', () => {
    expect(NonNomineeConsole.parse({ isNominee: false })).toEqual({ isNominee: false });
    expect(() => NonNomineeConsole.parse({ isNominee: false, pool: {} })).toThrow();
  });

  it('the response is a discriminated union — both arms parse', () => {
    expect(NomineeConsoleResponse.parse({ isNominee: false })).toEqual({ isNominee: false });
    expect(NomineeConsoleResponse.parse(VALID_VALIDATED)).toEqual(VALID_VALIDATED);
  });
});

describe('AC1 — the honest-seam invariant (no unbuilt-surface field can exist)', () => {
  it('accepts the validated shape', () => {
    expect(ValidatedNomineeConsole.parse(VALID_VALIDATED)).toEqual(VALID_VALIDATED);
  });

  it('REJECTS a smuggled upload-queue field (Story 9.3 is a placeholder slot, not a shape field)', () => {
    expect(() =>
      ValidatedNomineeConsole.parse({ ...VALID_VALIDATED, uploadQueue: [] }),
    ).toThrow();
  });

  it('REJECTS a smuggled per-pool reconciliation-status/pill field (Story 9.6 is a placeholder slot)', () => {
    expect(() =>
      ValidatedNomineeConsole.parse({ ...VALID_VALIDATED, statusPill: 'yellow' }),
    ).toThrow();
    expect(() =>
      ValidatedNomineeConsole.parse({ ...VALID_VALIDATED, reconciliationStatus: 'yellow' }),
    ).toThrow();
  });

  it('REJECTS a smuggled statement/UTR/matcher field (9.2/9.4 territory)', () => {
    expect(() => ValidatedNomineeConsole.parse({ ...VALID_VALIDATED, utr: '123' })).toThrow();
    expect(() =>
      ValidatedNomineeConsole.parse({ ...VALID_VALIDATED, bankStatement: {} }),
    ).toThrow();
  });
});

describe('AC3 — the takeover verdict is a server-authoritative projection', () => {
  it('accepts ONLY { eligible, daysSinceEngagement }', () => {
    expect(NomineeConsoleTakeover.parse({ eligible: true, daysSinceEngagement: 7 })).toEqual({
      eligible: true,
      daysSinceEngagement: 7,
    });
  });

  it('REJECTS a raw lastEngagedAt / threshold / clock leak', () => {
    expect(() =>
      NomineeConsoleTakeover.parse({ eligible: true, daysSinceEngagement: 7, lastEngagedAt: null }),
    ).toThrow();
    expect(() =>
      NomineeConsoleTakeover.parse({ eligible: true, daysSinceEngagement: 7, thresholdDays: 7 }),
    ).toThrow();
  });

  it('daysSinceEngagement must be a non-negative integer', () => {
    expect(() => NomineeConsoleTakeover.parse({ eligible: false, daysSinceEngagement: -1 })).toThrow();
    expect(() => NomineeConsoleTakeover.parse({ eligible: false, daysSinceEngagement: 1.5 })).toThrow();
  });
});

describe('pool identity block', () => {
  it('accepts a curated name or null (letter-code launch fallback)', () => {
    expect(
      NomineeConsolePoolIdentity.parse({ letterCode: 'F', name: 'Yudhishthira', canonicalIdentifier: 'P-2026-07-001' }),
    ).toBeTruthy();
    expect(
      NomineeConsolePoolIdentity.parse({ letterCode: 'F', name: null, canonicalIdentifier: 'P-2026-07-001' }),
    ).toBeTruthy();
  });
});

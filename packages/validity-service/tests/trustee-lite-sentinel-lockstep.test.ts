// CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS lockstep — Story 10.11 review finding (2026-08-05).
//
// `packages/domain/src/trustee-lite/violator-flags.ts` re-declares
// `CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS = 'producer_unavailable'` as the short-circuit sentinel
// `deriveViolatorFlags` checks BEFORE it can mistake "producer unavailable" for "detection ran and
// found nobody". The real value is `@twt/validity-service`'s `CONTRIBUTION_UNAVAILABLE.status`
// (`payload.ts`) — `@twt/domain` cannot import `@twt/validity-service` (validity-service depends on
// domain, so the reverse import is a package cycle; the identical constraint the shipped
// `r7-clause-ids-lockstep.test.ts` documents for `R7_CLAUSE_IDS`). This package CAN import both, so
// the pin lives here: a drift in either constant fails this test instead of silently defeating the
// short-circuit (the domain check would stop firing, and a `producer_unavailable` payload would be
// treated as available).

import { trusteeLite } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { CONTRIBUTION_UNAVAILABLE } from '../src/payload.js';

describe('CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS ↔ the validity-service real sentinel', () => {
  it('the domain re-declaration matches the real CONTRIBUTION_UNAVAILABLE.status emitted by validity-service', () => {
    expect(trusteeLite.CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS).toBe(CONTRIBUTION_UNAVAILABLE.status);
  });

  it("deriveViolatorFlags' short-circuit actually fires on the real CONTRIBUTION_UNAVAILABLE payload shape", () => {
    const result = trusteeLite.deriveViolatorFlags({
      memberId: 'm-1',
      evaluatedAt: new Date().toISOString(),
      contributionHistorySummary: CONTRIBUTION_UNAVAILABLE,
      applicableNiyamavaliClauses: [],
    });
    expect(result).toEqual({ status: 'detection_unavailable', producer: CONTRIBUTION_UNAVAILABLE.producer });
  });
});

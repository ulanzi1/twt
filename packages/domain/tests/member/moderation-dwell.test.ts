// The dwell arithmetic + the immediate-termination exception guard — Story 10.20 (Task 6; AC8).
//
// Pure and DB-free. The live-DB half (the registry resolve, the in-tx precondition, the typed 409
// and the 503) is pinned in `apps/api/tests/integration/member-moderation/moderation-dwell.spec.ts`.
//
// ⚠ EVERY comparison here pins BOTH SIDES explicitly. A spec that pins the query instant and lets
// the seed default is the 2026-08-10 DATE-BOMB class ([[project_known_livedb_test_failures]] #12):
// it fails on a date rather than on a diff, and a baseline comparison can never see it coming.

import { describe, expect, it } from 'vitest';

import {
  assertImmediateTerminationReason,
  ESCALATION_PART_MIN_CHARS,
} from '../../src/member/moderation/escalation.js';
import {
  MODERATION_DWELL_POLICY_CLAUSE_ID,
  ModerationDwellPolicyPayloadSchema,
  isDwellElapsed,
  terminationAvailableAt,
} from '../../src/member/moderation/dwell.js';
import {
  ModerationEscalationNotApplicableError,
  ModerationEscalationRequiredError,
} from '../../src/member/moderation/errors.js';

const SUSPENDED_AT = new Date('2026-08-01T09:00:00.000Z');
const DWELL_DAYS = 7;
/** SUSPENDED_AT + 7 days, written out rather than computed — the test must not restate the code. */
const AVAILABLE_AT = new Date('2026-08-08T09:00:00.000Z');

describe('the dwell arithmetic (AC8)', () => {
  it('opens the ordinary path exactly `dwell_days` after the producing suspension', () => {
    expect(terminationAvailableAt(SUSPENDED_AT, DWELL_DAYS).toISOString()).toBe(
      AVAILABLE_AT.toISOString(),
    );
  });

  it('⭐ is CLOSED one millisecond before, and OPEN exactly at the instant — the boundary is inclusive', () => {
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, new Date(AVAILABLE_AT.getTime() - 1))).toBe(false);
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, AVAILABLE_AT)).toBe(true);
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, new Date(AVAILABLE_AT.getTime() + 1))).toBe(true);
  });

  it('is closed for the whole window, including the moment of suspension itself', () => {
    // The defect this closes, in one assertion: `epics.md:3857` — "two API calls seconds apart
    // terminate a member".
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, SUSPENDED_AT)).toBe(false);
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, new Date('2026-08-01T09:00:05.000Z'))).toBe(false);
    expect(isDwellElapsed(SUSPENDED_AT, DWELL_DAYS, new Date('2026-08-07T23:59:59.999Z'))).toBe(false);
  });

  it('crosses a month boundary and a DST-shifting date without drifting (it is elapsed time, not calendar)', () => {
    const lateOctober = new Date('2026-10-28T12:00:00.000Z');
    expect(terminationAvailableAt(lateOctober, DWELL_DAYS).toISOString()).toBe(
      '2026-11-04T12:00:00.000Z',
    );
  });
});

describe('the dwell policy is REGISTRY data, not a code constant (AC8, FR-7)', () => {
  it('the clause id is stable and — deliberately — free of the `lock-in` substring', () => {
    expect(MODERATION_DWELL_POLICY_CLAUSE_ID).toBe('niy.moderation.dwell');
    // ⛔ `@twt/ui`'s member-status presenter finds the JOIN lock-in clause by SUBSTRING. A colliding
    // id would hijack that panel and show a trustee the wrong clause on a member's record.
    expect(MODERATION_DWELL_POLICY_CLAUSE_ID).not.toContain('lock-in');
  });

  it('accepts the ratified payload and tolerates the structural seed keys', () => {
    const parsed = ModerationDwellPolicyPayloadSchema.safeParse({
      rule_code: 'MODERATION-DWELL',
      title_en: 'Dwell between suspension and termination',
      dwell_days: 7,
      provisional: true,
    });
    expect(parsed.success && parsed.data.dwell_days).toBe(7);
  });

  it('rejects a malformed duration — a bad payload resolves to null, never to a code default', () => {
    for (const bad of [{ dwell_days: -1 }, { dwell_days: 1.5 }, { dwell_days: '7' }, {}]) {
      expect(ModerationDwellPolicyPayloadSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('the immediate-termination exception reason (AC8, Q4.1)', () => {
  const REASON =
    'The forged documents are still circulating and each day of delay exposes further claims to the same fraud.';

  it('⭐ is OPTIONAL on a terminate — its ABSENCE is what selects the ordinary path', () => {
    // ⛔ Requiring it would eliminate the ordinary route entirely, which is the opposite of the
    // ruling: the dwell governs the ordinary path, the exception is the alternative to it.
    expect(assertImmediateTerminationReason('terminate', undefined)).toBeNull();
    expect(assertImmediateTerminationReason('terminate', '   ')).toBeNull();
  });

  it('returns the trimmed reason when the exception IS invoked', () => {
    expect(assertImmediateTerminationReason('terminate', `  ${REASON}  `)).toBe(REASON);
  });

  it('applies the substance floor — a recorded reason with no substance is not recorded', () => {
    try {
      assertImmediateTerminationReason('terminate', 'urgent');
      expect.unreachable('a one-word exception reason must not satisfy the floor');
    } catch (err) {
      expect(err).toBeInstanceOf(ModerationEscalationRequiredError);
      expect((err as ModerationEscalationRequiredError).part).toBe('immediate_termination_reason');
      expect((err as ModerationEscalationRequiredError).reason).toBe('too_short');
      expect((err as ModerationEscalationRequiredError).minChars).toBe(ESCALATION_PART_MIN_CHARS);
    }
  });

  it('is rejected on suspend and restore — it describes a termination that did not happen', () => {
    for (const action of ['suspend', 'restore'] as const) {
      expect(assertImmediateTerminationReason(action, undefined)).toBeNull();
      expect(() => assertImmediateTerminationReason(action, REASON)).toThrow(
        ModerationEscalationNotApplicableError,
      );
    }
  });
});

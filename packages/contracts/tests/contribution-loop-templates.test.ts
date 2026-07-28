// Contribution-loop copy contract — DB-free unit tests (Story 8.8, Task 8; AC2, AC4, AC5).
//
// Four things are worth pinning here, in descending order of how much they matter:
//   1. THE COHERENCE INVARIANT (AC2 / D2, load-bearing): for every deadline-reminder send day D, the
//      band the notification renders in EQUALS the band Story 8.2's `<ActiveContributionCard>` shows on
//      day D. This is the whole reason the band is DERIVED rather than read positionally off the epic's
//      four labels — a positional reading would push a "days remaining" nudge on day 10 and then show
//      "Your pool is open — contribute when you can" when the member opens the app.
//   2. The tone-gradient boundaries survived the move from `apps/mobile` (D1). Boundary behaviour IS
//      the contract, so it is asserted at every edge, not sampled.
//   3. The payload builders produce shapes `Alert.parse()` ACCEPTS for their category and REJECTS for
//      another — the producer-side guard that a wrong-shaped payload fails here, not deep inside
//      `dispatch` with a whole batch already in flight.
//   4. The cycle-day arithmetic is UTC-safe (fixed-ms add — never local-timezone `setDate`/`getDate`,
//      which would silently disagree with a server not running in UTC).
//   5. Every `notify.*` key the registries reference actually exists in BOTH locale JSON files — a typo
//      on either side would otherwise only surface as a loud `t()` throw in production.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { Alert } from '../src/alerts/alert.js';
import {
  CONTRIBUTION_CONFIRMED_TEMPLATE_KEYS,
  CONTRIBUTION_LOOP_TEMPLATE_KEYS,
  CYCLE_OPEN_TEMPLATE_KEYS,
  CYCLE_WINDOW_DAYS,
  ContributionConfirmedPayloadData,
  CycleOpenPayloadData,
  DEADLINE_REMINDER_SEND_DAYS,
  DeadlineReminderPayloadData,
  PENDING_MATCH_RETRY_TEMPLATE_KEYS,
  PendingMatchRetryPayloadData,
  buildContributionConfirmedPayloadData,
  buildCycleOpenPayloadData,
  buildDeadlineReminderPayloadData,
  buildPendingMatchRetryPayloadData,
  computeDaysRemaining,
  cycleDayFromCommittedAt,
  cycleDayFromDaysRemaining,
  isDeadlineReminderSendDay,
  selectToneGradientKey,
  templateBandFor,
  toneKeyForDaysRemaining,
} from '../src/alerts/contribution-loop-templates.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';
const ALERT = '33333333-3333-3333-3333-333333333333';
const POOL = '44444444-4444-4444-4444-444444444444';

function envelope() {
  return {
    alert_id: ALERT,
    pariwar_id: PARIWAR,
    member_id: MEMBER,
    time_critical: false,
    provenance_refs: { pool_id: POOL },
    created_at: '2026-07-23T00:00:00.000Z',
    created_by_actor: 'system',
  };
}

// ─── (1) THE COHERENCE INVARIANT (AC2 / D2) ────────────────────────────────────────────────────────

describe('AC2/D2 — the notification band equals the card band on every send day (coherence)', () => {
  for (const day of DEADLINE_REMINDER_SEND_DAYS) {
    it(`day ${String(day)}: templateBandFor === selectToneGradientKey (the shipped 8.2 authority)`, () => {
      expect(templateBandFor(day)).toBe(selectToneGradientKey(day));
    });
  }

  it('the ratified mapping is calm / calm / factual / closing — NOT the positional reading of the epic', () => {
    // The epic lists "calm / factual / gently urgent / last day" against days 5/10/13/14. Read
    // positionally that pairs day 10 with `factual`; the SHIPPED gradient puts day 10 in `calm`. The
    // derived mapping is the ratified one (D2) — this assertion is what would fail if someone
    // "corrected" the registry back to the positional reading.
    expect(DEADLINE_REMINDER_SEND_DAYS.map((d) => templateBandFor(d))).toEqual([
      'calm',
      'calm',
      'factual',
      'closing',
    ]);
  });

  it('every send day has its own DISTINCT copy keys — four sends, four messages', () => {
    const subjects = DEADLINE_REMINDER_SEND_DAYS.map((d) => CONTRIBUTION_LOOP_TEMPLATE_KEYS[d].subjectKey);
    expect(new Set(subjects).size).toBe(DEADLINE_REMINDER_SEND_DAYS.length);
    const displays = DEADLINE_REMINDER_SEND_DAYS.map((d) => CONTRIBUTION_LOOP_TEMPLATE_KEYS[d].displayKey);
    expect(new Set(displays).size).toBe(DEADLINE_REMINDER_SEND_DAYS.length);
  });

  it('every registry key lives under the `notify.` prefix in the scanned `contribution` namespace', () => {
    for (const day of DEADLINE_REMINDER_SEND_DAYS) {
      expect(CONTRIBUTION_LOOP_TEMPLATE_KEYS[day].subjectKey).toMatch(/^notify\./);
      expect(CONTRIBUTION_LOOP_TEMPLATE_KEYS[day].displayKey).toMatch(/^notify\./);
    }
  });

  it('no band key is literally "urgent" — the microcopy panic pattern bans the word even internally', () => {
    for (const day of DEADLINE_REMINDER_SEND_DAYS) {
      expect(templateBandFor(day)).not.toBe('urgent');
    }
  });

  it('templateBandFor throws a clear error for a cycle-day outside the registry, never a bare TypeError', () => {
    expect(() => templateBandFor(7 as never)).toThrow(/no contribution-loop template for cycle-day 7/);
  });
});

// ─── (2) the tone gradient survived the move from apps/mobile (D1) ─────────────────────────────────

describe('AC4/D1 — selectToneGradientKey boundaries (the contract, asserted at every edge)', () => {
  const cases: Array<[number, string]> = [
    [-1, 'calm'],
    [0, 'calm'],
    [4, 'calm'],
    [5, 'calm'],
    [10, 'calm'],
    [11, 'factual'],
    [13, 'factual'],
    [14, 'closing'],
    [15, 'closing'],
  ];
  for (const [day, band] of cases) {
    it(`cycle-day ${String(day)} → ${band}`, () => {
      expect(selectToneGradientKey(day)).toBe(band);
    });
  }

  it('cycleDayFromDaysRemaining clamps to [0, windowDays] for stale/over-run inputs', () => {
    expect(cycleDayFromDaysRemaining(15)).toBe(0);
    expect(cycleDayFromDaysRemaining(0)).toBe(CYCLE_WINDOW_DAYS);
    expect(cycleDayFromDaysRemaining(99)).toBe(0); // a stale over-large days-remaining
    expect(cycleDayFromDaysRemaining(-99)).toBe(CYCLE_WINDOW_DAYS); // an over-run window
  });

  it('toneKeyForDaysRemaining composes the two — the card path', () => {
    expect(toneKeyForDaysRemaining(15)).toBe('calm'); // day 0
    expect(toneKeyForDaysRemaining(2)).toBe('factual'); // day 13
    expect(toneKeyForDaysRemaining(1)).toBe('closing'); // day 14
    expect(toneKeyForDaysRemaining(0)).toBe('closing'); // day 15
  });

  it('isDeadlineReminderSendDay admits exactly the four cadence days', () => {
    for (let d = 0; d <= CYCLE_WINDOW_DAYS; d += 1) {
      expect(isDeadlineReminderSendDay(d)).toBe(
        (DEADLINE_REMINDER_SEND_DAYS as readonly number[]).includes(d),
      );
    }
  });
});

// ─── (3) the cycle-day arithmetic (D5 seam) ────────────────────────────────────────────────────────

describe('D5 — computeDaysRemaining is UTC-safe and clamps at both ends of the window', () => {
  it('counts down across a month boundary', () => {
    const committedAt = new Date('2026-01-25T00:00:00.000Z');
    // +15 days from 25 Jan is 9 Feb.
    expect(computeDaysRemaining(committedAt, new Date('2026-01-25T00:00:00.000Z'))).toBe(15);
    expect(computeDaysRemaining(committedAt, new Date('2026-02-09T00:00:00.000Z'))).toBe(0);
  });

  it('is leap-safe across 29 February', () => {
    const committedAt = new Date('2028-02-20T00:00:00.000Z'); // 2028 is a leap year
    expect(computeDaysRemaining(committedAt, new Date('2028-03-06T00:00:00.000Z'))).toBe(0);
  });

  it('clamps at 0 — a past-close cycle never reports negative days', () => {
    const committedAt = new Date('2026-01-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-06-01T00:00:00.000Z'))).toBe(0);
  });

  it('clamps at CYCLE_WINDOW_DAYS — `now` preceding `committedAt` (clock skew) never over-reports', () => {
    const committedAt = new Date('2026-07-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-06-01T00:00:00.000Z'))).toBe(CYCLE_WINDOW_DAYS);
  });

  it('is exact at a UTC midnight boundary regardless of local calendar arithmetic (the bug UTC-safety fixes)', () => {
    // Fixed-ms arithmetic (not local setDate/getDate) means the result is the same no matter what
    // timezone the process runs in — this instant is deliberately a few hours before UTC midnight,
    // which is exactly where a local-timezone `setDate` would have disagreed with UTC.
    const committedAt = new Date('2026-07-01T20:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-07-16T20:00:00.000Z'))).toBe(0);
    expect(computeDaysRemaining(committedAt, new Date('2026-07-16T19:59:59.999Z'))).toBe(1);
  });

  it('cycleDayFromCommittedAt walks 0 → 15 across the window (the sweep path)', () => {
    const committedAt = new Date('2026-07-01T00:00:00.000Z');
    expect(cycleDayFromCommittedAt(committedAt, new Date('2026-07-01T00:00:00.000Z'))).toBe(0);
    expect(cycleDayFromCommittedAt(committedAt, new Date('2026-07-06T00:00:00.000Z'))).toBe(5);
    expect(cycleDayFromCommittedAt(committedAt, new Date('2026-07-14T00:00:00.000Z'))).toBe(13);
    expect(cycleDayFromCommittedAt(committedAt, new Date('2026-07-15T00:00:00.000Z'))).toBe(14);
    expect(cycleDayFromCommittedAt(committedAt, new Date('2026-07-16T00:00:00.000Z'))).toBe(15);
  });
});

// ─── (4) the payload builders (AC5) ────────────────────────────────────────────────────────────────

describe('AC5 — the builders produce payloads Alert.parse accepts for THEIR category only', () => {
  it('cycle-open: accepted as `alert_published`', () => {
    const payload_data = buildCycleOpenPayloadData({ title: 'Your pool is open — Pool A', body: 'body' });
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'alert_published', payload_data }),
    ).not.toThrow();
  });

  it('cycle-open: REJECTED when handed to a different category (the wrong-shape guard)', () => {
    const payload_data = buildCycleOpenPayloadData({ title: 't', body: 'b' });
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'deadline_reminder', payload_data }),
    ).toThrow();
  });

  it('deadline reminder: accepted, and `deadline_at` is the ISO machine instant', () => {
    const deadlineAt = new Date('2026-08-05T18:30:00.000Z');
    const payload_data = buildDeadlineReminderPayloadData({
      subject: 'Pool A — your pool is open',
      deadlineAt,
      deadlineDisplay: '05-08-2026',
    });
    expect(payload_data.deadline_at).toBe(deadlineAt.toISOString());
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'deadline_reminder', payload_data }),
    ).not.toThrow();
  });

  it('deadline reminder: REJECTED when handed to `alert_published`', () => {
    const payload_data = buildDeadlineReminderPayloadData({
      subject: 's',
      deadlineAt: new Date('2026-08-05T00:00:00.000Z'),
      deadlineDisplay: 'd',
    });
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'alert_published', payload_data }),
    ).toThrow();
  });

  it('contribution confirmed: accepted as `contribution_confirmed`', () => {
    const payload_data = buildContributionConfirmedPayloadData({
      poolId: POOL,
      amountPaise: 110000,
      periodLabel: '2026-07 cycle',
    });
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'contribution_confirmed', payload_data }),
    ).not.toThrow();
  });

  it('a stray caller key can never reach the payload — the builders project, they do not spread', () => {
    // The builders name each field explicitly rather than spreading the caller's object, so an extra
    // property is DROPPED at the boundary instead of riding into the frozen payload. (That is stronger
    // than throwing: an accidental `{ ...poolRow }` at a call site cannot leak a DB column — e.g. a
    // ciphertext — into a member-facing alert.)
    const built = buildCycleOpenPayloadData({ title: 't', body: 'b', extra: 'leak' } as never);
    expect(Object.keys(built).sort()).toEqual(['body', 'title']);

    const confirmed = buildContributionConfirmedPayloadData({
      poolId: POOL,
      amountPaise: 1,
      periodLabel: 'p',
      extra: 'leak',
    } as never);
    expect(Object.keys(confirmed).sort()).toEqual(['amount_paise', 'period_label', 'pool_id']);
  });

  it('the exported schemas are `.strict()` — a hand-built payload with an extra key is rejected', () => {
    expect(() => CycleOpenPayloadData.parse({ title: 't', body: 'b', extra: 'x' })).toThrow();
    expect(() =>
      ContributionConfirmedPayloadData.parse({
        pool_id: POOL,
        amount_paise: 1,
        period_label: 'p',
        extra: 'x',
      }),
    ).toThrow();
    expect(() =>
      DeadlineReminderPayloadData.parse({
        subject: 's',
        deadline_at: '2026-08-05T00:00:00.000Z',
        deadline_display: 'd',
        extra: 'x',
      }),
    ).toThrow();
  });

  it('rejects an empty member-facing string rather than sending a blank push', () => {
    expect(() => buildCycleOpenPayloadData({ title: '', body: 'b' })).toThrow();
    expect(() =>
      buildDeadlineReminderPayloadData({
        subject: 's',
        deadlineAt: new Date('2026-08-05T00:00:00.000Z'),
        deadlineDisplay: '',
      }),
    ).toThrow();
  });

  it('rejects a non-uuid pool id rather than emitting a `contributions/undefined` deep link', () => {
    expect(() =>
      buildContributionConfirmedPayloadData({ poolId: 'not-a-uuid', amountPaise: 1, periodLabel: 'p' }),
    ).toThrow();
  });
});

// ─── (6) the pending-match RETRY payload (Story 9.10, AC2/AC3/AC4) ─────────────────────────────────

describe('Story 9.10 — the pending-match retry payload is a SIBLING deadline_reminder shape', () => {
  const now = new Date('2026-08-01T10:00:00.000Z');

  it('builds a payload `Alert.parse` accepts as `deadline_reminder`, carrying `pool_id`', () => {
    const payload_data = buildPendingMatchRetryPayloadData({
      subject: 'Pool A — we\'re still confirming your payment',
      display: 'Check status or retry',
      poolId: POOL,
      now,
    });
    expect(payload_data.pool_id).toBe(POOL);
    expect(payload_data.deadline_at).toBe(now.toISOString());
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'deadline_reminder', payload_data }),
    ).not.toThrow();
  });

  it('a day-N deadline_reminder payload (no pool_id) still parses — the field is optional, not required', () => {
    const dayN = buildDeadlineReminderPayloadData({
      subject: 's',
      deadlineAt: now,
      deadlineDisplay: 'd',
    });
    expect(dayN).not.toHaveProperty('pool_id');
    expect(() =>
      Alert.parse({ ...envelope(), alert_category: 'deadline_reminder', payload_data: dayN }),
    ).not.toThrow();
  });

  it('the exported schema is `.strict()` and requires a UUID pool_id', () => {
    expect(() =>
      PendingMatchRetryPayloadData.parse({
        subject: 's',
        deadline_at: now.toISOString(),
        deadline_display: 'd',
        pool_id: 'not-a-uuid',
      }),
    ).toThrow();
    expect(() =>
      PendingMatchRetryPayloadData.parse({
        subject: 's',
        deadline_at: now.toISOString(),
        deadline_display: 'd',
        pool_id: POOL,
        extra: 'x',
      }),
    ).toThrow();
  });

  it('rejects an empty subject/display rather than sending a blank push', () => {
    expect(() =>
      buildPendingMatchRetryPayloadData({ subject: '', display: 'd', poolId: POOL, now }),
    ).toThrow();
    expect(() =>
      buildPendingMatchRetryPayloadData({ subject: 's', display: '', poolId: POOL, now }),
    ).toThrow();
  });

  it('the two tiers have DISTINCT template keys', () => {
    expect(PENDING_MATCH_RETRY_TEMPLATE_KEYS.soft.subjectKey).not.toBe(
      PENDING_MATCH_RETRY_TEMPLATE_KEYS.escalated.subjectKey,
    );
    expect(PENDING_MATCH_RETRY_TEMPLATE_KEYS.soft.displayKey).not.toBe(
      PENDING_MATCH_RETRY_TEMPLATE_KEYS.escalated.displayKey,
    );
  });
});

// ─── (5) every referenced notify.* key exists in BOTH locale files ────────────────────────────────────
//
// `t()` throws loudly on a missing key at RENDER time — but "loud in production" is still a landmine
// this diff can catch at test time instead. A typo on either side of the TS-registry ↔ JSON-file
// boundary (e.g. `day_10` vs `day10`) would otherwise only surface the first time that specific
// send-day's reminder actually fires.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function readLocaleKeys(rel: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, rel), 'utf8')) as Record<string, string>;
}

describe('every registry-referenced notify.* key exists in both locale JSON files', () => {
  const en = readLocaleKeys('packages/i18n/locales/en/contribution.json');
  const hi = readLocaleKeys('packages/i18n/locales/hi/contribution.json');

  const allKeys = [
    ...DEADLINE_REMINDER_SEND_DAYS.flatMap((day) => [
      CONTRIBUTION_LOOP_TEMPLATE_KEYS[day].subjectKey,
      CONTRIBUTION_LOOP_TEMPLATE_KEYS[day].displayKey,
    ]),
    CYCLE_OPEN_TEMPLATE_KEYS.titleKey,
    CYCLE_OPEN_TEMPLATE_KEYS.bodyKey,
    CONTRIBUTION_CONFIRMED_TEMPLATE_KEYS.periodLabelKey,
    PENDING_MATCH_RETRY_TEMPLATE_KEYS.soft.subjectKey,
    PENDING_MATCH_RETRY_TEMPLATE_KEYS.soft.displayKey,
    PENDING_MATCH_RETRY_TEMPLATE_KEYS.escalated.subjectKey,
    PENDING_MATCH_RETRY_TEMPLATE_KEYS.escalated.displayKey,
  ];

  for (const key of allKeys) {
    it(`"${key}" resolves to a non-empty string in en`, () => {
      expect(typeof en[key]).toBe('string');
      expect(en[key]!.length).toBeGreaterThan(0);
    });

    it(`"${key}" resolves to a non-empty string in hi`, () => {
      expect(typeof hi[key]).toBe('string');
      expect(hi[key]!.length).toBeGreaterThan(0);
    });
  }
});

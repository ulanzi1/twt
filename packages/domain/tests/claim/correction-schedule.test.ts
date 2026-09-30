// The correction-reminder schedule — Story 6.19b (AC2, AC11b "schedule"). Pure: every slot of the Panel's table
// (`-250` #5) and its boundaries (day 1, 84, 89, 90); ⛔ nothing on day 0 of a return OR of a switch (`-260` G4); a
// return at 23:59 and 00:01 IST lands on different day 0s; the staff kind's day-12 escalation; D3's catch-up.

import { describe, expect, it } from 'vitest';

import {
  CORRECTION_REMINDER_DAYS,
  calendarDaysBetween,
  correctionCatchUp,
  correctionReminderSchedule,
  correctionRunDay,
  isCorrectionRunExpired,
  istDateOf,
} from '../../src/claim/correction-schedule.js';

const PANEL_DAYS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84];

describe('correctionReminderSchedule', () => {
  it('⭐ the family and direction kinds carry EXACTLY the Panel\'s days, dated from day 0', () => {
    for (const kind of ['family', 'direction'] as const) {
      const slots = correctionReminderSchedule(kind, '2026-10-01');
      expect(slots.map((s) => s.day)).toEqual(PANEL_DAYS);
      expect(slots.every((s) => s.kind === 'reminder')).toBe(true);
      expect(slots[0]).toEqual({ day: 1, date: '2026-10-02', kind: 'reminder' });
      expect(slots.at(-1)).toEqual({ day: 84, date: '2026-12-24', kind: 'reminder' });
    }
    expect([...CORRECTION_REMINDER_DAYS]).toEqual(PANEL_DAYS);
  });

  it('⛔ nothing on day 0 (G4) and ⛔ nothing on or after day 90 — the boundaries 1, 84, 89, 90', () => {
    const days = correctionReminderSchedule('family', '2026-10-01').map((s) => s.day);
    expect(days).not.toContain(0);
    expect(days).toContain(1);
    expect(days).toContain(84);
    expect(days).not.toContain(89);
    expect(days).not.toContain(90);
    expect(days.every((d) => d > 0 && d < 90)).toBe(true);
  });

  it('⭐ the staff kind also carries its day-12 ESCALATION slot (⛔ not a reminder day)', () => {
    const slots = correctionReminderSchedule('staff', '2026-10-01');
    expect(slots.filter((s) => s.kind === 'reminder').map((s) => s.day)).toEqual(PANEL_DAYS);
    expect(slots.filter((s) => s.kind === 'escalation')).toEqual([{ day: 12, date: '2026-10-13', kind: 'escalation' }]);
  });

  it('a return at 23:59 IST and one at 00:01 IST the next day land on DIFFERENT day 0s', () => {
    // 23:59 IST on 2026-10-01 = 18:29 UTC; 00:01 IST on 2026-10-02 = 18:31 UTC on 2026-10-01.
    expect(istDateOf(new Date('2026-10-01T18:29:00.000Z'))).toBe('2026-10-01');
    expect(istDateOf(new Date('2026-10-01T18:31:00.000Z'))).toBe('2026-10-02');
    // So the late-night return's first slot is the very next morning, and the after-midnight one's the morning after.
    expect(correctionReminderSchedule('family', istDateOf(new Date('2026-10-01T18:29:00.000Z')))[0]!.date).toBe('2026-10-02');
    expect(correctionReminderSchedule('family', istDateOf(new Date('2026-10-01T18:31:00.000Z')))[0]!.date).toBe('2026-10-03');
  });

  it('the run day, the day-90 horizon, and month / year boundaries', () => {
    expect(correctionRunDay('2026-10-01', '2026-10-01')).toBe(0);
    expect(correctionRunDay('2026-10-01', '2026-12-29')).toBe(89);
    expect(isCorrectionRunExpired('2026-10-01', '2026-12-29')).toBe(false);
    expect(isCorrectionRunExpired('2026-10-01', '2026-12-30')).toBe(true);
    expect(calendarDaysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(calendarDaysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('correctionCatchUp (D3)', () => {
  it('today\'s slot with ⛔ no record is sent, ⛔ not late', () => {
    expect(correctionCatchUp(PANEL_DAYS, new Set([1, 2]), 3)).toEqual({ send: { day: 3, late: false }, skip: [] });
  });

  it('⭐ after an outage: the LATEST missed slot once, flagged late; the older ones skipped — ⛔ no burst', () => {
    expect(correctionCatchUp(PANEL_DAYS, new Set([1, 2]), 9)).toEqual({ send: { day: 7, late: true }, skip: [3, 4, 5, 6] });
  });

  it('a slot already recorded ⇒ nothing (a second sweep the same day is a no-op)', () => {
    expect(correctionCatchUp(PANEL_DAYS, new Set([1, 2, 3]), 3)).toEqual({ send: null, skip: [] });
  });

  it('⛔ nothing before the first slot, and a non-slot day with the last slot recorded ⇒ nothing', () => {
    expect(correctionCatchUp(PANEL_DAYS, new Set(), 0)).toEqual({ send: null, skip: [] });
    expect(correctionCatchUp(PANEL_DAYS, new Set([1, 2, 3, 4, 5, 6, 7]), 9)).toEqual({ send: null, skip: [] });
  });
});

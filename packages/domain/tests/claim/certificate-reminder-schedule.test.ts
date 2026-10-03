// The certificate-reminder schedule — Story 6.19d (AC2; `2026-10-03-276` CR4). Pure: the 25 Panel days (`-250` #5's
// correction days IMPORTED, then `-260` G6's 120 / 150 / 180); ⛔ nothing on day 0; ⛔ nothing after day 180; day 180 IS
// sent (`> 180`, ⛔ never `>=`); the catch-up reused from 6.19b (`late` once, older slots skipped, ⛔ no burst); IST
// midnight edges.

import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_REMINDER_DAYS,
  CERTIFICATE_REMINDER_MONTHLY_DAYS,
  CERTIFICATE_RUN_HORIZON_DAYS,
  certificateCatchUp,
  certificateReminderSchedule,
  certificateRunDay,
  isCertificateRunPastHorizon,
} from '../../src/claim/certificate-reminder-schedule.js';
import { CORRECTION_REMINDER_DAYS, istDateOf } from '../../src/claim/correction-schedule.js';

const PANEL_DAYS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84, 120, 150, 180];

describe('certificateReminderSchedule', () => {
  it('⭐ EXACTLY the 25 Panel days — the correction days to 84, then 120, 150, 180 (`-260` G6)', () => {
    expect([...CERTIFICATE_REMINDER_DAYS]).toEqual(PANEL_DAYS);
    expect(CERTIFICATE_REMINDER_DAYS).toHaveLength(25);
    expect([...CERTIFICATE_REMINDER_MONTHLY_DAYS]).toEqual([120, 150, 180]);
    expect(CERTIFICATE_RUN_HORIZON_DAYS).toBe(180);
  });

  it('⭐ the correction days are IMPORTED, ⛔ never copied — the prefix IS `CORRECTION_REMINDER_DAYS`', () => {
    expect(CERTIFICATE_REMINDER_DAYS.slice(0, CORRECTION_REMINDER_DAYS.length)).toEqual([...CORRECTION_REMINDER_DAYS]);
  });

  it('dated from day 0 — day 1 is the NEXT morning, day 180 is the last', () => {
    const slots = certificateReminderSchedule('2026-10-01');
    expect(slots.map((s) => s.day)).toEqual(PANEL_DAYS);
    expect(slots[0]).toEqual({ day: 1, date: '2026-10-02' });
    expect(slots.find((s) => s.day === 84)).toEqual({ day: 84, date: '2026-12-24' });
    expect(slots.find((s) => s.day === 120)).toEqual({ day: 120, date: '2027-01-29' });
    expect(slots.at(-1)).toEqual({ day: 180, date: '2027-03-30' });
  });

  it('⛔ nothing on day 0 and ⛔ nothing after day 180 — and ⛔ nothing between 84 and 120 (the correction horizon is ⛔ not ours)', () => {
    const days = certificateReminderSchedule('2026-10-01').map((s) => s.day);
    expect(days).not.toContain(0);
    expect(days.every((d) => d >= 1 && d <= 180)).toBe(true);
    expect(days.filter((d) => d > 84 && d < 120)).toEqual([]);
  });
});

describe('the horizon — `runDay > 180` (⛔ never 6.19b\'s `>=` shape)', () => {
  it('⭐ day 180 is NOT past the horizon (its slot is sent); day 181 is', () => {
    expect(isCertificateRunPastHorizon(179)).toBe(false);
    expect(isCertificateRunPastHorizon(180)).toBe(false);
    expect(isCertificateRunPastHorizon(181)).toBe(true);
    expect(isCertificateRunPastHorizon(400)).toBe(true);
  });

  it('the run day is whole IST calendar days from day 0', () => {
    expect(certificateRunDay('2026-10-01', '2026-10-01')).toBe(0);
    expect(certificateRunDay('2026-10-01', '2027-03-30')).toBe(180);
    expect(certificateRunDay('2026-10-01', '2027-03-31')).toBe(181);
  });
});

describe('the catch-up — 6.19b\'s `correctionCatchUp`, reused over the certificate days', () => {
  it('today\'s slot due ⇒ sent, ⛔ not late', () => {
    expect(certificateCatchUp(new Set(), 1)).toEqual({ send: { day: 1, late: false }, skip: [] });
    expect(certificateCatchUp(new Set([1, 2, 3, 4, 5, 6, 7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84]), 120)).toEqual({
      send: { day: 120, late: false },
      skip: [],
    });
  });

  it('a missed sweep ⇒ the LATEST missed slot ONCE, `late`; the older missed ones skipped — ⛔ no burst', () => {
    expect(certificateCatchUp(new Set([1, 2]), 6)).toEqual({ send: { day: 6, late: false }, skip: [3, 4, 5] });
    expect(certificateCatchUp(new Set([1, 2]), 8)).toEqual({ send: { day: 7, late: true }, skip: [3, 4, 5, 6] });
  });

  it('⭐ a day between slots (day 100) ⇒ the day-84 slot caught up `late` once, ⛔ never a phantom slot', () => {
    const upTo77 = new Set([1, 2, 3, 4, 5, 6, 7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77]);
    expect(certificateCatchUp(upTo77, 100)).toEqual({ send: { day: 84, late: true }, skip: [] });
  });

  it('a latest due slot already recorded ⇒ nothing; day 0 ⇒ nothing', () => {
    expect(certificateCatchUp(new Set([1]), 1)).toEqual({ send: null, skip: [] });
    expect(certificateCatchUp(new Set(), 0)).toEqual({ send: null, skip: [] });
  });

  it('⭐ day 180 is sent on day 180 — the last slot', () => {
    const upTo150 = new Set(PANEL_DAYS.filter((d) => d <= 150));
    expect(certificateCatchUp(upTo150, 180)).toEqual({ send: { day: 180, late: false }, skip: [] });
  });
});

describe('IST midnight edges (day 0 is an IST calendar date)', () => {
  it('a rejection at 23:59 IST and one at 00:01 IST the next day land on different day 0s', () => {
    expect(istDateOf(new Date('2026-10-01T18:29:00Z'))).toBe('2026-10-01'); // 23:59 IST
    expect(istDateOf(new Date('2026-10-01T18:31:00Z'))).toBe('2026-10-02'); // 00:01 IST
    const late = certificateReminderSchedule(istDateOf(new Date('2026-10-01T18:29:00Z')));
    const early = certificateReminderSchedule(istDateOf(new Date('2026-10-01T18:31:00Z')));
    expect(late[0]!.date).toBe('2026-10-02');
    expect(early[0]!.date).toBe('2026-10-03');
  });
});

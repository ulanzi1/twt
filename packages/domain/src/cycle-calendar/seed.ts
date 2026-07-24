// The Bihar launch holiday-calendar SEED dataset — Story 8.9 (Task 1; AC1).
//
// The six named windows `epics.md:477` calls out (Chhath Puja, Holi, Diwali, Eid, Republic Day,
// Independence Day) for the canonical validation Pariwar's first curation year. It is a DEFAULT, not a
// truth: `seedHolidayCalendarYear` writes it only when a Pariwar has no curation for that year, so a
// trustee's corrections are never reverted.
//
// ⚠ CURATED DATA, VERIFY BEFORE THE YEAR OPENS. The lunar-calendar observances below (Chhath, Holi,
// Diwali, Eid) shift year to year and their locally-observed SPAN is a Pariwar decision, not an
// astronomical fact — Chhath in particular is observed across four days in Bihar with regional
// variation in which of them close banks and workplaces. These are indicative launch values; the
// trustee re-curates against the published Bihar government holiday list annually (AC1). Nothing in
// the resolver depends on these specific dates — they are rows, and the code is tested against its own
// frozen vectors, not against this dataset.
//
// Region-neutrality is preserved: this is the BIHAR seed for the launch Pariwar, exported as one named
// constant. A Rail Parivar or Bank Parivar seeds its own set through the same accessor (UX spec L1003).

import type { HolidayWindow } from './holiday-resolver.js';

/** The curation year {@link BIHAR_LAUNCH_HOLIDAY_WINDOWS} describes. */
export const BIHAR_LAUNCH_HOLIDAY_YEAR = 2026;

/**
 * Bihar's six launch holiday windows for {@link BIHAR_LAUNCH_HOLIDAY_YEAR}. Both bounds INCLUSIVE;
 * single-day national holidays have `startDate === endDate`. Ordered by start date for legibility.
 */
export const BIHAR_LAUNCH_HOLIDAY_WINDOWS: readonly HolidayWindow[] = [
  // Fixed-date national holidays — exact, no annual re-derivation needed.
  { label: 'Republic Day', startDate: '2026-01-26', endDate: '2026-01-26' },
  // Holika Dahan + Dhulandi. Bihar observes both days.
  { label: 'Holi', startDate: '2026-03-03', endDate: '2026-03-04' },
  // Eid al-Fitr — the observed date follows the moon sighting, so the window carries the adjacent day.
  { label: 'Eid', startDate: '2026-03-20', endDate: '2026-03-21' },
  { label: 'Independence Day', startDate: '2026-08-15', endDate: '2026-08-15' },
  // Diwali + Govardhan Puja.
  { label: 'Diwali', startDate: '2026-11-08', endDate: '2026-11-09' },
  // Chhath Puja — the four-day observance (Nahay Khay → Usha Arghya). The single most consequential
  // window for this trust: Bihar effectively stops, and a match landing inside it is normal life, not
  // a failure. This is the window UX-DR77 was written around.
  { label: 'Chhath Puja', startDate: '2026-11-13', endDate: '2026-11-16' },
] as const;

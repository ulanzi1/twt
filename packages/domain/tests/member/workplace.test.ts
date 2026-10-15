// Story 6.36a (Task 2) — the workplace module's PURE helpers. DB-free.
//   · `foldDigitsToAscii` — Devanagari, fullwidth, Bengali and mathematical digits fold to ASCII; letters are untouched;
//   · `hasSevenDigitRun` / `isValidTypedWorkplaceText` — 1–120 code points trimmed; VISIBLE (⛔ zero-width / marks only);
//     ⛔ a run of seven digits in ANY script, the separators BETWEEN digits removed first (SW9 — a phone number; review
//     2026-10-15, BigDev's option 1: `98765 43210` is a phone number too);
//   · `escapeLikePattern` — `%`, `_` and `\` are literal in an `ILIKE … ESCAPE '\'` pattern;
//   · `isValidStartDate` — a real date, ⛔ in the future (IST), ⛔ before 1950-01-01, ⛔ before the previous start (SW6).

import { describe, expect, it } from 'vitest';

import {
  escapeLikePattern,
  foldDigitsToAscii,
  hasSevenDigitRun,
  isCalendarDate,
  istToday,
  isValidStartDate,
  isValidTypedWorkplaceText,
  WORKPLACE_TYPED_TEXT_MAX,
} from '../../src/member/workplace.js';

describe('foldDigitsToAscii', () => {
  it('folds Devanagari, fullwidth, Bengali and mathematical digits; leaves letters and ASCII digits alone', () => {
    expect(foldDigitsToAscii('०१२३४५६७८९')).toBe('0123456789');
    expect(foldDigitsToAscii('０１２３４５６７８９')).toBe('0123456789');
    expect(foldDigitsToAscii('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
    expect(foldDigitsToAscii('𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗')).toBe('0123456789');
    expect(foldDigitsToAscii('मध्य विद्यालय 12')).toContain('12');
    expect(foldDigitsToAscii('GMS Rampur 4')).toBe('GMS Rampur 4');
  });
});

describe('isValidTypedWorkplaceText', () => {
  it('accepts a name up to 120 characters (code points, ⛔ UTF-16 units), trimmed', () => {
    expect(isValidTypedWorkplaceText('Primary School Rampur')).toBe(true);
    expect(isValidTypedWorkplaceText(`  ${'क'.repeat(WORKPLACE_TYPED_TEXT_MAX)}  `)).toBe(true);
    expect(isValidTypedWorkplaceText('𝟎'.repeat(3) + 'x'.repeat(117))).toBe(true);
    expect(isValidTypedWorkplaceText('x'.repeat(WORKPLACE_TYPED_TEXT_MAX + 1))).toBe(false);
  });

  it('refuses an empty or blank name', () => {
    expect(isValidTypedWorkplaceText('')).toBe(false);
    expect(isValidTypedWorkplaceText('   ')).toBe(false);
  });

  it('refuses a run of seven digits in ANY script — and accepts six', () => {
    expect(isValidTypedWorkplaceText('Call 9876543')).toBe(false);
    expect(isValidTypedWorkplaceText('फोन ९८७६५४३२१०')).toBe(false);
    expect(isValidTypedWorkplaceText('School ９８７６５４３')).toBe(false);
    expect(isValidTypedWorkplaceText('Mixed ९८7६5४3')).toBe(false);
    expect(isValidTypedWorkplaceText('UPS 123456')).toBe(true);
  });

  it('refuses seven digits split by a space, a hyphen or a dot (a phone number written the usual way) — ⛔ digits joined by other text', () => {
    // Was pinned VALID before the review (the literal "run" reading); BigDev chose to widen the rule (2026-10-15).
    expect(isValidTypedWorkplaceText('Ward 987 6543')).toBe(false);
    expect(isValidTypedWorkplaceText('98765 43210')).toBe(false);
    expect(isValidTypedWorkplaceText('98765-43210')).toBe(false);
    expect(isValidTypedWorkplaceText('९८७६५-४३२१०')).toBe(false);
    expect(isValidTypedWorkplaceText('98.76.54.321')).toBe(false);
    expect(isValidTypedWorkplaceText('Ward 12, Block 345')).toBe(true); // a comma is ⛔ a separator — 2 and 3, ⛔ 5 joined
    expect(isValidTypedWorkplaceText('School No. 123 456')).toBe(true); // six joined
    expect(hasSevenDigitRun('98765 43210')).toBe(true);
    expect(hasSevenDigitRun('98765 - 43210')).toBe(true);
    expect(hasSevenDigitRun('123 456')).toBe(false);
  });

  it('refuses a zero-width or marks-only name (⛔ visible) — and keeps a ZWNJ inside a Devanagari word', () => {
    expect(isValidTypedWorkplaceText('​')).toBe(false); // ZWSP
    expect(isValidTypedWorkplaceText('​‌')).toBe(false); // ZWSP + ZWNJ
    expect(isValidTypedWorkplaceText('्́̂')).toBe(false); // combining marks only
    expect(isValidTypedWorkplaceText('‍ ‌')).toBe(false); // format characters around a space
    expect(isValidTypedWorkplaceText('विद्‌यालय')).toBe(true); // ZWNJ inside a word
    expect(isValidTypedWorkplaceText('क्‍ष')).toBe(true); // ZWJ inside a conjunct
  });

  it('refuses the blank FILLERS that are letters or symbols by category (⛔ caught by \\p{Cf} / \\p{M}) — and a residue with ⛔ a letter or digit (review R2-5)', () => {
    expect(isValidTypedWorkplaceText('\u3164')).toBe(false); // \u3164 Hangul filler (Lo)
    expect(isValidTypedWorkplaceText('\u115F')).toBe(false); // Hangul choseong filler (Lo)
    expect(isValidTypedWorkplaceText('\u1160')).toBe(false); // Hangul jungseong filler (Lo)
    expect(isValidTypedWorkplaceText('\uFFA0')).toBe(false); // halfwidth Hangul filler (Lo)
    expect(isValidTypedWorkplaceText('\u2800')).toBe(false); // \u2800 braille blank (So)
    expect(isValidTypedWorkplaceText('\u3164 \u3164')).toBe(false); // fillers around a space
    expect(isValidTypedWorkplaceText('\u3164GMS\u3164')).toBe(true); // fillers around a real name — the name stands
    expect(isValidTypedWorkplaceText('---')).toBe(false); // punctuation alone
    expect(isValidTypedWorkplaceText('...')).toBe(false);
    expect(isValidTypedWorkplaceText('GMS RAMPUR')).toBe(true);
    expect(isValidTypedWorkplaceText('विद्यालय')).toBe(true);
    expect(isValidTypedWorkplaceText('Ward 12')).toBe(true);
  });
});

describe('escapeLikePattern', () => {
  it('escapes % _ and \\ (each becomes literal)', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
    expect(escapeLikePattern('Rampur')).toBe('Rampur');
  });
});

describe('the start-date rule (SW6)', () => {
  const NOW = new Date('2026-10-14T20:00:00Z'); // 2026-10-15 01:30 IST

  it('isCalendarDate refuses an impossible or malformed date', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2023-02-29')).toBe(false);
    expect(isCalendarDate('2023-13-01')).toBe(false);
    expect(isCalendarDate('15-10-2026')).toBe(false);
  });

  it('istToday is the IST calendar day (UTC 20:00 is already tomorrow in IST)', () => {
    expect(istToday(NOW)).toBe('2026-10-15');
    expect(istToday(new Date('2026-10-14T18:29:59Z'))).toBe('2026-10-14');
    expect(istToday(new Date('2026-10-14T18:30:00Z'))).toBe('2026-10-15');
  });

  it('accepts today (IST) and the floor; refuses tomorrow, before 1950-01-01, before the previous start', () => {
    expect(isValidStartDate('2026-10-15', NOW, null)).toBe(true);
    expect(isValidStartDate('2026-10-16', NOW, null)).toBe(false);
    expect(isValidStartDate('1950-01-01', NOW, null)).toBe(true);
    expect(isValidStartDate('1949-12-31', NOW, null)).toBe(false);
    expect(isValidStartDate('2020-06-01', NOW, '2020-06-01')).toBe(true);
    expect(isValidStartDate('2020-05-31', NOW, '2020-06-01')).toBe(false);
    expect(isValidStartDate('2023-02-30', NOW, null)).toBe(false);
  });
});

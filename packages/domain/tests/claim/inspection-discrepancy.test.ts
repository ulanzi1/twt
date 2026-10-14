// Story 6.27d (AC3; Task 2.1 / 2.2) — the inspector's discrepancy comparison, PURE: the rule table, the ONE per-answer
// predicate shared with 6.27b's warnings, and the ordered key list. DB-free.
//
// ⚠ 6.27b Trap 3 — the EQUAL-date leg is asserted FIRST: a fixture whose two sides use different index functions "differs"
// on every date, and every later leg would then pass for the wrong reason.

import { describe, expect, it } from 'vitest';

import { derivePeerReplyWarningKeys, type PeerReplyWarningAnswer } from '../../src/claim/approval-warnings.js';
import {
  deriveInspectionDiscrepancy,
  INSPECTION_DISCREPANCY_COMPARED_KEYS,
  INSPECTION_DISCREPANCY_RULES,
  peerAnswerDiffers,
  type PeerAnswerForComparison,
} from '../../src/claim/inspection-discrepancy.js';
import { addCalendarDays } from '../../src/cycle-calendar/holiday-resolver.js';
import { deathDateWindow } from '../../src/questionnaires/answers.js';
import {
  COMPARABLE_QUESTION_KEYS,
  HAS_DIED_CODES,
  PEER_MESH_RULED_QUESTION_KEYS,
  PEER_MESH_WARNING_QUESTION_KEYS,
} from '../../src/questionnaires/keys.js';
import { INSPECTION_DISCREPANCY_QUESTION_KEYS } from '../../src/schema/claim_ground_inspection_discrepancies.js';

/** ONE index function for BOTH sides (the shared field class's fixture twin). */
const ix = (date: string) => `ix:${date}`;
const dated = (date: string): PeerAnswerForComparison => ({ key: 'death_date', codes: null, window: deathDateWindow(date).map(ix) });
const hasDied = (code: string): PeerAnswerForComparison => ({ key: 'has_died', codes: [code], window: null });

describe('Story 6.27d — the rule table (Task 2.2)', () => {
  it('covers EVERY comparable key; compares ① / ② only; ③ / ④ are owed by row 6-32', () => {
    expect(Object.keys(INSPECTION_DISCREPANCY_RULES).sort()).toEqual([...COMPARABLE_QUESTION_KEYS].sort());
    expect(INSPECTION_DISCREPANCY_RULES).toEqual({
      has_died: 'compare',
      death_date: 'compare',
      death_cause: 'not_comparable',
      death_illness: 'not_comparable',
    });
  });

  it('the compared keys are DERIVED in `COMPARABLE_QUESTION_KEYS` order, and equal 6.27b\'s warning keys and the DB\'s (parity)', () => {
    expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual(['has_died', 'death_date']);
    expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual([...PEER_MESH_WARNING_QUESTION_KEYS]);
    expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual([...INSPECTION_DISCREPANCY_QUESTION_KEYS]);
  });
});

describe('Story 6.27d — ② the date (set membership of the family index in the neighbour\'s ±1-day window)', () => {
  const family = '2026-06-15';

  it('⭐ FIRST — an EQUAL date ⇒ ⛔ no difference', () => {
    expect(peerAnswerDiffers(dated(family), ix(family))).toBeNull();
    expect(deriveInspectionDiscrepancy({ answers: [dated(family)], familyDateIndex: ix(family) })).toEqual([]);
  });

  it('D ± 1 ⇒ ⛔ no difference; D ± 2 ⇒ `death_date`', () => {
    for (const d of [-1, 1]) expect(peerAnswerDiffers(dated(addCalendarDays(family, d)), ix(family)), `D${d}`).toBeNull();
    for (const d of [-2, 2, 30]) expect(peerAnswerDiffers(dated(addCalendarDays(family, d)), ix(family)), `D${d}`).toBe('death_date');
  });

  it('month end, year end and 29 February (calendar days, ⛔ 24-hour arithmetic)', () => {
    const cases: readonly [string, string, string | null][] = [
      ['2026-01-31', '2026-02-01', null],
      ['2026-01-31', '2026-02-02', 'death_date'],
      ['2025-12-31', '2026-01-01', null],
      ['2025-12-30', '2026-01-01', 'death_date'],
      ['2024-02-29', '2024-03-01', null],
      ['2024-02-28', '2024-03-01', 'death_date'],
      ['2024-02-29', '2024-02-27', 'death_date'],
    ];
    for (const [fam, neighbour, want] of cases) {
      expect(peerAnswerDiffers(dated(neighbour), ix(fam)), `${fam} vs ${neighbour}`).toBe(want);
    }
  });

  it('a neighbour\'s `unknown`, a NULL window (erased), a short window or a NULL family index ⇒ ⛔ not compared', () => {
    expect(peerAnswerDiffers({ key: 'death_date', codes: ['unknown'], window: null }, ix(family))).toBeNull();
    expect(peerAnswerDiffers({ key: 'death_date', codes: null, window: null }, ix(family))).toBeNull();
    expect(peerAnswerDiffers({ key: 'death_date', codes: null, window: [ix('2020-01-01')] }, ix(family))).toBeNull();
    expect(peerAnswerDiffers(dated('2020-01-01'), null)).toBeNull();
  });
});

describe('Story 6.27d — ① `has_died`', () => {
  it('exactly `not_died` ⇒ `has_died`; every other code (or a mixed list) ⇒ ⛔ no difference', () => {
    expect(peerAnswerDiffers(hasDied('not_died'), null)).toBe('has_died');
    for (const code of HAS_DIED_CODES.filter((c) => c !== 'not_died')) expect(peerAnswerDiffers(hasDied(code), null), code).toBeNull();
    expect(peerAnswerDiffers({ key: 'has_died', codes: ['not_died', 'died'], window: null }, null)).toBeNull();
    expect(peerAnswerDiffers({ key: 'has_died', codes: null, window: null }, null)).toBeNull();
  });
});

describe('Story 6.27d — `deriveInspectionDiscrepancy` (AC3)', () => {
  it('keys in the rule table\'s order, each ONCE, whatever the answers\' order or number — ⛔ no values, ⛔ no count', () => {
    const answers = [dated('2020-01-01'), hasDied('not_died'), dated('2019-01-01'), hasDied('not_died')];
    expect(deriveInspectionDiscrepancy({ answers, familyDateIndex: ix('2026-06-15') })).toEqual(['has_died', 'death_date']);
    expect(deriveInspectionDiscrepancy({ answers: [...answers].reverse(), familyDateIndex: ix('2026-06-15') })).toEqual(['has_died', 'death_date']);
    expect(deriveInspectionDiscrepancy({ answers: [], familyDateIndex: ix('2026-06-15') })).toEqual([]);
  });

  it('⛔ a `death_cause` / `death_illness` answer is ⛔ never a key — nor any other question, however shaped', () => {
    const familyDateIndex = ix('2026-06-15');
    const others = PEER_MESH_RULED_QUESTION_KEYS.filter((k) => INSPECTION_DISCREPANCY_RULES[k as keyof typeof INSPECTION_DISCREPANCY_RULES] !== 'compare');
    // ⭐ Code review round 2 (R2-18) — the loop must run: the two not-comparable keys are IN it, and so is a key no
    // questionnaire knows.
    expect(others).toEqual(expect.arrayContaining(['death_cause', 'death_illness']));
    for (const key of [...others, 'not_a_question']) {
      const shapes: PeerAnswerForComparison[] = [
        { key, codes: ['not_died'], window: null },
        { key, codes: null, window: deathDateWindow('2020-01-01').map(ix) },
        { key, codes: ['other'], window: null },
      ];
      expect(deriveInspectionDiscrepancy({ answers: shapes, familyDateIndex }), key).toEqual([]);
    }
  });
});

describe('Story 6.27d (Task 2.1) — ONE per-answer predicate, shared with 6.27b', () => {
  it('`derivePeerReplyWarningKeys` flags EXACTLY the answers `peerAnswerDiffers` reports, on the same reference', () => {
    const ref = ix('2026-06-15');
    const answers: PeerReplyWarningAnswer[] = [
      { id: 'a1', ...hasDied('not_died') },
      { id: 'a2', ...hasDied('died') },
      { id: 'a3', ...dated('2026-06-16') },
      { id: 'a4', ...dated('2026-06-18') },
      { id: 'a5', key: 'death_date', codes: ['unknown'], window: null },
      { id: 'a6', key: 'death_cause', codes: ['not_died'], window: null },
    ];
    const { flags } = derivePeerReplyWarningKeys({ answers, currentAcceptedDateIndex: ref });
    for (const a of answers) expect(flags.get(a.id), a.id).toBe(peerAnswerDiffers(a, ref) !== null);
    expect([...flags.entries()].filter(([, v]) => v).map(([k]) => k)).toEqual(['a1', 'a4']);
  });
});

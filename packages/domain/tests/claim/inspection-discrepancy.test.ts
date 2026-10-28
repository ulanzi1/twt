// Story 6.27d (AC3; Task 2.1 / 2.2) — the inspector's discrepancy comparison, PURE: the rule table, the ONE per-answer
// predicate shared with 6.27b's warnings, and the ordered key list. DB-free. ⭐ Story 6.32 (AC6): ③ cause / ④ illness flip to
// `'compare'` — by keyed CODE INDEX overlap (IQ6) — and 6.27b's warnings stay on ① / ② only.
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
  // ⭐ Story 6.32 (AC6 / AC11 — RED BY DESIGN): ③ / ④ were `'not_comparable'` ("owed by row 6-32"); now compared.
  it('covers EVERY comparable key; compares all four (③ / ④ since Story 6.32)', () => {
    expect(Object.keys(INSPECTION_DISCREPANCY_RULES).sort()).toEqual([...COMPARABLE_QUESTION_KEYS].sort());
    expect(INSPECTION_DISCREPANCY_RULES).toEqual({
      has_died: 'compare',
      death_date: 'compare',
      death_cause: 'compare',
      death_illness: 'compare',
    });
  });

  // ⭐ Story 6.32 (AC11): the old leg asserted the compared keys EQUAL 6.27b's warning keys — false BY DESIGN after the flip.
  // Rewritten (⛔ deleted): the warning keys are a SUBSET, and `derivePeerReplyWarningKeys` mints ONLY ① / ② (below).
  it('the compared keys are DERIVED in `COMPARABLE_QUESTION_KEYS` order, equal the DB\'s (parity), and CONTAIN 6.27b\'s warning keys', () => {
    expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual(['has_died', 'death_date', 'death_cause', 'death_illness']);
    expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual([...INSPECTION_DISCREPANCY_QUESTION_KEYS]);
    for (const k of PEER_MESH_WARNING_QUESTION_KEYS) expect(INSPECTION_DISCREPANCY_COMPARED_KEYS).toContain(k);
    expect([...PEER_MESH_WARNING_QUESTION_KEYS]).toEqual(['has_died', 'death_date']);
  });
});

describe('Story 6.27d — ② the date (set membership of the family index in the neighbour\'s ±1-day window)', () => {
  const family = '2026-06-15';

  it('⭐ FIRST — an EQUAL date ⇒ ⛔ no difference', () => {
    expect(peerAnswerDiffers(dated(family), ix(family))).toBeNull();
    expect(deriveInspectionDiscrepancy({ answers: [dated(family)], familyDateIndex: ix(family), familyCodeIndexes: {} })).toEqual([]);
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
    expect(deriveInspectionDiscrepancy({ answers, familyDateIndex: ix('2026-06-15'), familyCodeIndexes: {} })).toEqual(['has_died', 'death_date']);
    expect(deriveInspectionDiscrepancy({ answers: [...answers].reverse(), familyDateIndex: ix('2026-06-15'), familyCodeIndexes: {} })).toEqual(['has_died', 'death_date']);
    expect(deriveInspectionDiscrepancy({ answers: [], familyDateIndex: ix('2026-06-15'), familyCodeIndexes: {} })).toEqual([]);
  });

  // ⭐ Story 6.32 (AC6): ③ / ④ LEFT this leg (they are compared now); the three never-compared questions and an unknown key
  // stay ⛔ a key, however shaped — including with code indexes that share ⛔ index with the family's.
  it('⛔ `how_known` / `relationship` / `callback_consent` are ⛔ never a key — nor an unknown question, however shaped', () => {
    const familyDateIndex = ix('2026-06-15');
    const familyCodeIndexes = { death_cause: ['c:accident'], death_illness: ['i:tb'] };
    const others = PEER_MESH_RULED_QUESTION_KEYS.filter((k) => INSPECTION_DISCREPANCY_RULES[k as keyof typeof INSPECTION_DISCREPANCY_RULES] !== 'compare');
    // ⭐ Code review round 2 (R2-18) — the loop must run.
    expect(others).toEqual(['how_known', 'relationship', 'callback_consent']);
    for (const key of [...others, 'not_a_question']) {
      const shapes: PeerAnswerForComparison[] = [
        { key, codes: ['not_died'], window: null },
        { key, codes: null, window: deathDateWindow('2020-01-01').map(ix) },
        { key, codes: ['other'], window: null, codeIndexes: ['c:suicide'] },
      ];
      expect(deriveInspectionDiscrepancy({ answers: shapes, familyDateIndex, familyCodeIndexes }), key).toEqual([]);
    }
  });
});

describe('Story 6.32 (AC6; IQ6) — ③ / ④ — both DEFINITE and sharing ⛔ code index', () => {
  const cause = (...ixs: string[]): PeerAnswerForComparison => ({ key: 'death_cause', codes: null, window: null, codeIndexes: ixs });
  const illness = (...ixs: string[]): PeerAnswerForComparison => ({ key: 'death_illness', codes: null, window: null, codeIndexes: ixs });
  const dk = (key: 'death_cause' | 'death_illness'): PeerAnswerForComparison => ({ key, codes: null, window: null, codeIndexes: null });

  it('⭐ FIRST — the SAME single cause ⇒ ⛔ no difference (TR3: one index function on both sides)', () => {
    expect(peerAnswerDiffers(cause('c:accident'), null, { death_cause: ['c:accident'] })).toBeNull();
  });

  it.each([
    ['single, different', cause('c:suicide'), { death_cause: ['c:accident'] }, 'death_cause'],
    ['multi, disjoint', illness('i:tb', 'i:cancer'), { death_illness: ['i:diabetes'] }, 'death_illness'],
    ['multi, partial overlap ⇒ a MATCH (IQ6\'s cost)', illness('i:cancer', 'i:diabetes'), { death_illness: ['i:cancer'] }, null],
    ['multi, equal sets', illness('i:cancer', 'i:tb'), { death_illness: ['i:tb', 'i:cancer'] }, null],
    ['the neighbour said "I don\'t know" (NULL indexes)', dk('death_cause'), { death_cause: ['c:accident'] }, null],
    ['the family said "I don\'t know" (NULL indexes)', cause('c:accident'), { death_cause: null }, null],
    ['the family did ⛔ answer', cause('c:accident'), {}, null],
    ['the neighbour erased (NULL) and the family answered', { key: 'death_illness', codes: null, window: null }, { death_illness: ['i:tb'] }, null],
    ['an EMPTY index list on either side', cause(), { death_cause: ['c:accident'] }, null],
    ['the family\'s ILLNESS does not reach the neighbour\'s CAUSE', cause('c:old_age'), { death_illness: ['i:tb'] }, null],
  ] as const)('%s', (_label, answer, family, want) => {
    expect(peerAnswerDiffers(answer, null, family)).toBe(want);
  });

  it('`deriveInspectionDiscrepancy` lists ③ / ④ in rule order beside ① / ②, ONCE each — ⛔ values, ⛔ count', () => {
    const answers = [illness('i:tb'), cause('c:suicide'), hasDied('not_died'), cause('c:killed'), dated('2020-01-01')];
    expect(
      deriveInspectionDiscrepancy({ answers, familyDateIndex: ix('2026-06-15'), familyCodeIndexes: { death_cause: ['c:accident'], death_illness: ['i:cancer'] } }),
    ).toEqual(['has_died', 'death_date', 'death_cause', 'death_illness']);
    // a family with ⛔ ③ / ④ answers ⇒ only ① / ②
    expect(deriveInspectionDiscrepancy({ answers, familyDateIndex: ix('2026-06-15'), familyCodeIndexes: {} })).toEqual(['has_died', 'death_date']);
  });

  it('⭐ 6.27b\'s warnings ⛔ ever flag ③ / ④ — `derivePeerReplyWarningKeys` passes ⛔ family indexes (CF3 (b))', () => {
    const answers: PeerReplyWarningAnswer[] = [
      // (spread: 6.27b's answer type carries ⛔ code indexes at all — its SQL never selects them; a stray one is still inert)
      { id: 'c1', ...cause('c:suicide') },
      { id: 'c2', ...illness('i:tb') },
    ];
    const r = derivePeerReplyWarningKeys({ answers, currentAcceptedDateIndex: ix('2026-06-15') });
    expect(r.keys).toEqual([]);
    expect([...r.flags.values()]).toEqual([false, false]);
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

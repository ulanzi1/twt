// Story 11b.4 (code review R13) — the bidi class the reviewer screen shows visibly (AC9). Every direction control the
// reviewer could be misled by is in the class, the legitimate Indic joiners are NOT, and widening the class (it is a DISPLAY
// class) moves ⛔ no blank-detection or decision-validation outcome. Characters are built from code points, ⛔ never from
// literals: an invisible character written into a test file is itself invisible to the next reader.

import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_BIDI_CONTROLS,
  MEMORIAL_INVISIBLE_CHARS,
  isMemorialTextBlank,
  stripMemorialInvisibles,
  validateMemorialDecision,
} from '../src/index.js';

const ch = (cp: number): string => String.fromCodePoint(cp);
const run = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const hex = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/** LRE RLE PDF LRO RLO · LRI RLI FSI PDI */
const EMBEDDINGS_OVERRIDES_ISOLATES = [...run(0x202a, 0x202e), ...run(0x2066, 0x2069)];
/** LRM · RLM · ALM — the invisible direction MARKS */
const DIRECTION_MARKS = [0x200e, 0x200f, 0x061c];
const ALL_BIDI = [...EMBEDDINGS_OVERRIDES_ISOLATES, ...DIRECTION_MARKS];

describe('MEMORIAL_BIDI_CONTROLS (AC9 — every hidden direction control is made visible)', () => {
  it.each(ALL_BIDI.map((cp) => [hex(cp), cp] as const))('%s is in the class — and the answer is stable (no `g` flag)', (_label, cp) => {
    expect(MEMORIAL_BIDI_CONTROLS.global).toBe(false);
    const text = `a${ch(cp)}b`;
    // ⚠ The `/g` trap: the same answer twice in a row.
    expect(MEMORIAL_BIDI_CONTROLS.test(text)).toBe(true);
    expect(MEMORIAL_BIDI_CONTROLS.test(text)).toBe(true);
  });

  it('names the three direction marks the embedding range lacked: LRM, RLM, ALM', () => {
    for (const cp of DIRECTION_MARKS) expect(MEMORIAL_BIDI_CONTROLS.test(ch(cp)), hex(cp)).toBe(true);
  });

  it.each([
    ['ZWSP', 0x200b],
    ['ZWNJ (a legitimate Indic joiner)', 0x200c],
    ['ZWJ (a legitimate Indic joiner)', 0x200d],
    ['NNBSP', 0x202f],
    ['WORD JOINER', 0x2060],
    ['the code point just before LRI', 0x2065],
    ['DEVANAGARI DANDA', 0x0964],
    ['ARABIC LETTER ALEF', 0x0627],
    ['LATIN SMALL LETTER A', 0x0061],
  ])('%s is not in the class', (_label, cp) => {
    expect(MEMORIAL_BIDI_CONTROLS.test(ch(cp))).toBe(false);
  });

  it('ordinary Hindi, Latin and Urdu text carries none', () => {
    for (const text of ['माँ बहुत अच्छी थीं।\n\nहम उन्हें याद करते हैं॥', 'She was kind.', 'وہ بہت اچھی تھیں۔', '१२३ 123']) {
      expect(MEMORIAL_BIDI_CONTROLS.test(text), text).toBe(false);
    }
  });
});

describe('widening the class moves no blank-detection (it reads MEMORIAL_INVISIBLE_CHARS, not this class)', () => {
  it.each(ALL_BIDI.map((cp) => [hex(cp), cp] as const))('%s alone is blank; beside a letter the text is not', (_label, cp) => {
    const mark = ch(cp);
    expect(isMemorialTextBlank(mark)).toBe(true);
    expect(isMemorialTextBlank(`${mark}${mark}`)).toBe(true);
    expect(isMemorialTextBlank(`  ${mark}\n`)).toBe(true);
    expect(isMemorialTextBlank(`${mark}अ`)).toBe(false);
    expect(isMemorialTextBlank(`a${mark}`)).toBe(false);
  });

  it('LRM and RLM were already in the invisible class (stripped); ALM is a format character that is blank on its own', () => {
    expect(MEMORIAL_INVISIBLE_CHARS.test(ch(0x200e))).toBe(true);
    expect(MEMORIAL_INVISIBLE_CHARS.test(ch(0x200f))).toBe(true);
    expect(stripMemorialInvisibles(`a${ch(0x200e)}b${ch(0x200f)}c`)).toBe('abc');
    // ALM is not stripped (it is not in the invisible class) but is neither a letter, number, punctuation nor symbol.
    expect(stripMemorialInvisibles(ch(0x061c))).toBe(ch(0x061c));
    expect(isMemorialTextBlank(ch(0x061c))).toBe(true);
  });
});

describe('widening the class moves no decision validation (MA6)', () => {
  const body = `AB${ch(0x200f)}CD`;
  const subject = { body, altText: null, hasPhoto: false };
  const omit = (start: number, end: number) => ({
    action: 'approved_with_omissions' as const,
    omissions: [{ field: 'body' as const, start, end, reason: 'against_the_law' as const }],
  });

  it('a span holding only a direction mark has no visible words (span_blank), as before', () => {
    expect(validateMemorialDecision(omit(2, 3), subject)).toEqual({ ok: false, problem: 'span_blank' });
  });

  it('a span of visible words with a mark inside is accepted, as before', () => {
    expect(validateMemorialDecision(omit(0, 3), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(omit(2, 5), subject)).toEqual({ ok: true });
  });

  it('leaving out every visible word is still `nothing_left`', () => {
    expect(validateMemorialDecision(omit(0, 5), subject)).toEqual({ ok: false, problem: 'nothing_left' });
  });
});

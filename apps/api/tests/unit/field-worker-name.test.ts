// Story 13.1, review R6, R2-1 and R3-1 / R3-10 (QE9 as amended) — the worker-name CONTENT rule, DB-free. Every special character
// below is BUILT from its code point: ⛔ written as an escape, ⛔ pasted raw — an invisible character in this file's own source would
// be the defect it tests. The rule: NFC + trim, 1–120 code points, no control character, no unpaired surrogate, NO INVISIBLE OR
// CORRUPT CHARACTER — line and paragraph separators, private-use, format (`Cf`) and unassigned (`Cn`) code points, U+2800 and
// U+FFFD, and every default-ignorable code point (zero-width and filler characters, bidi controls, word joiner, soft hyphen, BOM,
// tag characters, variation selectors) — EXCEPT the five a real name carries (ZWNJ, ZWJ, LRM, RLM, ALM); no combining mark without
// a base; no run of 8+ combining marks; and at least one letter. No event renames a worker, so a name that gets in is sealed for good.

import { describe, expect, it } from 'vitest';

import { FIELD_WORKER_NAME_MAX_LENGTH, FIELD_WORKER_NAME_MAX_MARK_RUN, normalizeFieldWorkerName } from '../../src/modules/field-worker/handlers.js';

const cp = (...codePoints: number[]): string => String.fromCodePoint(...codePoints);
const hex = (c: number): string => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

const ZWSP = cp(0x200b);
const ZWJ = cp(0x200d);
const ZWNJ = cp(0x200c);
const LRM = cp(0x200e);
const RLM = cp(0x200f);
const HANGUL_FILLERS = [0x115f, 0x1160, 0x3164, 0xffa0];
/** The bidi embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069). */
const BIDI_CONTROLS = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
/** A name in Devanagari: consonants, a vowel sign and a virama. */
const HINDI = cp(0x935, 0x93f, 0x915, 0x94d, 0x930, 0x92e);
/** Invisible characters that survive `trim()` in the MIDDLE of a name (review R2-1) — one per class the rule must refuse. */
const INVISIBLE_INSIDE: ReadonlyArray<readonly [string, number]> = [
  ['the line separator U+2028 (Zl)', 0x2028],
  ['the paragraph separator U+2029 (Zp)', 0x2029],
  ['the zero-width space U+200B', 0x200b],
  ['the word joiner U+2060', 0x2060],
  ['the invisible times U+2062', 0x2062],
  ['the soft hyphen U+00AD', 0x00ad],
  ['the BOM / zero-width no-break space U+FEFF', 0xfeff],
  ['the combining grapheme joiner U+034F', 0x034f],
  ['the Mongolian vowel separator U+180E', 0x180e],
  ['a tag character U+E0041 (invisible ASCII)', 0xe0041],
  ['the tag cancel U+E007F', 0xe007f],
  ['a private-use code point U+E000', 0xe000],
  ['a variation selector U+FE0F', 0xfe0f],
  ['a variation selector supplement U+E0100', 0xe0100],
];

describe('normalizeFieldWorkerName — accepted', () => {
  it.each([
    ['a plain name', 'Vikram Singh', 'Vikram Singh'],
    ['a name in Devanagari', HINDI, HINDI],
    ['a single letter', 'A', 'A'],
    ['letters with a digit', 'R2 Singh', 'R2 Singh'],
    ['ZWNJ inside a name (real in Persian and Indic scripts) — the rule is NARROW', `Ra${ZWNJ}ni`, `Ra${ZWNJ}ni`],
    ['ZWJ inside a name (real in Indic scripts) — the rule is NARROW', `Ra${ZWJ}ni`, `Ra${ZWJ}ni`],
    ['LRM inside a name (a directional MARK, not an override)', `Asha${LRM}Rani`, `Asha${LRM}Rani`],
    ['RLM inside a name (a directional MARK, not an override)', `Asha${RLM}Rani`, `Asha${RLM}Rani`],
    ['trimmed', '  Asha Verma \t', 'Asha Verma'],
    ['NFC-composed', `Jose${cp(0x301)}`, `Jos${cp(0xe9)}`],
  ])('%s', (_label, raw, expected) => {
    expect(normalizeFieldWorkerName(raw)).toBe(expected);
  });

  it('the length bound counts CODE POINTS: 120 pass, 121 do not — for BMP and for astral letters alike', () => {
    expect(normalizeFieldWorkerName('a'.repeat(FIELD_WORKER_NAME_MAX_LENGTH))).not.toBeNull();
    expect(normalizeFieldWorkerName('a'.repeat(FIELD_WORKER_NAME_MAX_LENGTH + 1))).toBeNull();
    const astral = cp(0x1d504); // MATHEMATICAL FRAKTUR CAPITAL A — one letter, two UTF-16 units
    expect(normalizeFieldWorkerName(astral.repeat(FIELD_WORKER_NAME_MAX_LENGTH))).not.toBeNull();
    expect(normalizeFieldWorkerName(astral.repeat(FIELD_WORKER_NAME_MAX_LENGTH + 1))).toBeNull();
  });
});

describe('normalizeFieldWorkerName — refused', () => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['one zero-width space (it is not whitespace — trim keeps it)', ZWSP],
    ['zero-width spaces only', ZWSP.repeat(3)],
    ['ZWJ and ZWNJ only (allowed characters, but no letter)', `${ZWJ}${ZWNJ}`],
    ['the directional marks only', `${LRM}${RLM}`],
    ['digits only', '12345'],
    ['punctuation only', '---'],
    ['a combining mark only', cp(0x301)],
    ['a control character inside the name', `Asha${cp(9)}Verma`],
    ['NUL', `Asha${cp(0)}Verma`],
    ['an unpaired surrogate', `Asha${String.fromCharCode(0xd800)}`],
  ])('%s', (_label, raw) => {
    expect(normalizeFieldWorkerName(raw)).toBeNull();
  });

  // The Hangul fillers are LETTERS by Unicode category (\p{L}) — a bare "at least one letter" rule would let them through.
  it.each(HANGUL_FILLERS.map((c) => [hex(c), c] as const))('the Hangul filler %s alone — a letter by category that draws nothing', (_label, c) => {
    expect(normalizeFieldWorkerName(cp(c))).toBeNull();
    expect(normalizeFieldWorkerName(`${cp(c)}${ZWSP}${cp(c)}`)).toBeNull();
  });

  it.each(BIDI_CONTROLS.map((c) => [hex(c), c] as const))('the bidi control %s inside an otherwise valid name', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}Rani`)).toBeNull();
  });

  it('a bidi override at the EDGE is refused — trim does not strip it', () => {
    expect(normalizeFieldWorkerName(`${cp(0x202e)}Asha`)).toBeNull();
    expect(normalizeFieldWorkerName(`Asha${cp(0x202e)}`)).toBeNull();
  });
});

describe('normalizeFieldWorkerName — invisible characters in a name that HAS letters (review R2-1)', () => {
  it.each(INVISIBLE_INSIDE)('%s between letters is refused', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}Rani`)).toBeNull();
  });

  // Trailing: `trim()` strips JS whitespace and line terminators at the EDGES — U+2028, U+2029 and the BOM among them — so there
  // the name simply becomes the bare name; every other one survives `trim()` at the edge and is refused.
  const STRIPPED_BY_TRIM = new Set([0x2028, 0x2029, 0xfeff]);
  it.each(INVISIBLE_INSIDE.filter(([, c]) => !STRIPPED_BY_TRIM.has(c)))('%s trailing — one that trim() does not strip — is refused', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}`)).toBeNull();
  });

  it.each(INVISIBLE_INSIDE.filter(([, c]) => STRIPPED_BY_TRIM.has(c)))('%s trailing is stripped by trim(), so what is stored is the bare name', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}`)).toBe('Asha');
  });

  it('a hidden-ASCII payload in tag characters after a letter is refused', () => {
    const payload = cp(0xe0073, 0xe0065, 0xe0063, 0xe0072, 0xe0065, 0xe0074); // the tag-character spelling of "secret"
    expect(normalizeFieldWorkerName(`A${payload}`)).toBeNull();
  });

  // Review R3-8 — 1 + 119 is exactly 120 code points, INSIDE the bound: what refuses it is the invisible rule, not the length (the
  // bound itself is pinned by "the length bound counts CODE POINTS" above).
  it('a 120-code-point name that is all invisible but ONE letter is refused by the invisible rule (inside the length bound)', () => {
    expect(normalizeFieldWorkerName(`A${ZWSP.repeat(FIELD_WORKER_NAME_MAX_LENGTH - 1)}`)).toBeNull();
  });

  // CONTROLS: the allowed marks next to the refused ones, in one name — the rule refuses the right character, not the name's script.
  // (Review R4-15: each allowed mark sits BETWEEN two characters — the RLM that ended this control is moved inside.)
  it('a name with four of the allowed marks is accepted; the same name with one refused invisible added is not', () => {
    const real = `Ra${ZWNJ}ni${ZWJ}Sin${LRM}g${RLM}h`;
    expect(normalizeFieldWorkerName(real)).toBe(real);
    expect(normalizeFieldWorkerName(`${real}${ZWSP}`)).toBeNull();
  });
});

describe('normalizeFieldWorkerName — format, unassigned and corrupt code points, and orphaned or stacked marks (review R3-1, R3-10)', () => {
  /** One per class the R2-1 rule let through after a letter — each was ACCEPTED before R3-1 (replayed 2026-11-04). */
  const REFUSED_AFTER_A_LETTER: ReadonlyArray<readonly [string, number]> = [
    ['U+2800 BRAILLE PATTERN BLANK (a symbol that draws nothing)', 0x2800],
    ['U+FFFD REPLACEMENT CHARACTER (a mis-decoded name)', 0xfffd],
    ['U+FFFC OBJECT REPLACEMENT CHARACTER (a failed paste — review R4-3)', 0xfffc],
    ['U+FFF9 INTERLINEAR ANNOTATION ANCHOR (Cf, not default-ignorable)', 0xfff9],
    ['U+FFFB INTERLINEAR ANNOTATION TERMINATOR (Cf)', 0xfffb],
    ['U+0600 ARABIC NUMBER SIGN (Cf)', 0x0600],
    ['U+06DD ARABIC END OF AYAH (Cf)', 0x06dd],
    ['U+0378 (unassigned, Cn)', 0x0378],
    ['U+FDD0 (a noncharacter, Cn)', 0xfdd0],
    ['U+FFFE (a noncharacter, Cn)', 0xfffe],
  ];

  it.each(REFUSED_AFTER_A_LETTER)('%s between letters is refused', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}Rani`)).toBeNull();
  });

  it.each(REFUSED_AFTER_A_LETTER)('%s trailing is refused', (_label, c) => {
    expect(normalizeFieldWorkerName(`Asha${cp(c)}`)).toBeNull();
  });

  it('the interlinear annotation that hides text between its controls is refused', () => {
    expect(normalizeFieldWorkerName(`Asha${cp(0xfff9)}hidden${cp(0xfffa)}x${cp(0xfffb)}`)).toBeNull();
  });

  it('a combining mark with no base — at the start, or after a space — is refused', () => {
    expect(normalizeFieldWorkerName(`${cp(0x301)}Asha`)).toBeNull();
    expect(normalizeFieldWorkerName(`  ${cp(0x301)}Asha`)).toBeNull(); // trim leaves the mark at the start
    expect(normalizeFieldWorkerName(`Asha ${cp(0x301)}Rani`)).toBeNull();
  });

  // The cap counts marks AFTER NFC; `x` + U+0301 has no precomposed form, so every mark stays a mark (an `A` would absorb one).
  it(`${FIELD_WORKER_NAME_MAX_MARK_RUN} consecutive combining marks pass; ${FIELD_WORKER_NAME_MAX_MARK_RUN + 1} do not; the 119-mark Zalgo name does not`, () => {
    expect(FIELD_WORKER_NAME_MAX_MARK_RUN).toBe(7); // BigDev's "8 or more is refused" (R3-DN1), pinned as a literal
    expect(normalizeFieldWorkerName(`x${cp(0x301).repeat(7)}`)).not.toBeNull();
    expect(normalizeFieldWorkerName(`x${cp(0x301).repeat(8)}`)).toBeNull();
    expect(normalizeFieldWorkerName(`A${cp(0x301).repeat(119)}`)).toBeNull();
  });

  // Review R4-2 — the mark rules are judged WITHOUT the five allowed invisibles: one between marks, or before a mark, no longer hides it.
  it.each([
    ['ZWJ between runs of 7 marks', `x${`${cp(0x301).repeat(7)}${ZWJ}`.repeat(14)}`.slice(0, -1)],
    ['ZWNJ between two runs of 7', `x${cp(0x301).repeat(7)}${ZWNJ}${cp(0x301).repeat(7)}`],
    ['LRM between two runs of 4', `x${cp(0x301).repeat(4)}${LRM}${cp(0x301).repeat(4)}`],
    ['a mark after a space, behind a ZWJ', `Asha ${ZWJ}${cp(0x301)}Rani`],
    ['a mark at the start, behind an LRM', `${LRM}${cp(0x301)}Asha`],
  ])('%s is refused — the allowed invisible no longer hides the marks', (_label, raw) => {
    expect(normalizeFieldWorkerName(raw)).toBeNull();
  });

  // Review R4-15 (BigDev, R4-DN1 "1") — an allowed invisible sits BETWEEN two other characters: never first, never last, never two in a row.
  it.each([
    ['one letter + 119 ZWJ (reads "A")', `A${ZWJ.repeat(119)}`],
    ['one letter + 119 LRM', `A${LRM.repeat(119)}`],
    ['one letter + 119 ALM', `A${cp(0x61c).repeat(119)}`],
    ['a leading ZWNJ', `${ZWNJ}Asha`],
    ['a trailing RLM', `Asha${RLM}`],
    ['a trailing ZWJ NOT after a virama', `Asha${ZWJ}`],
    ['two in a row inside the name', `Ra${ZWNJ}${ZWJ}ni`],
    ['an LRM and an RLM side by side', `Asha${LRM}${RLM}Rani`],
  ])('%s is refused', (_label, raw) => {
    expect(normalizeFieldWorkerName(raw)).toBeNull();
  });

  // CONTROLS — real names the new rules must NOT refuse.
  it.each([
    ['ALM inside a right-to-left name (the Arabic twin of LRM / RLM)', `${cp(0x627, 0x645, 0x646, 0x61c, 0x629)}`],
    ['a Tibetan stacked syllable (three subjoined / vowel marks in a row): bsgrubs', cp(0xf56, 0xf66, 0xf92, 0xfb2, 0xf74, 0xf56, 0xf66)],
    ['Devanagari nukta + vowel sign + chandrabindu (three marks in a row)', `${HINDI} ${cp(0x915, 0x93c, 0x940, 0x901)}`],
    // Review R4-15's one exception: a FINAL ZWJ right after a virama is real text (legacy encodings of the Malayalam chillu and the Bengali khanda ta).
    ['a Hindi conjunct with virama + ZWJ inside the name (ka + virama + ZWJ + ssa)', cp(0x915, 0x94d, 0x200d, 0x937)],
    ['a Malayalam name ending in a legacy chillu — virama + ZWJ LAST (Ramesan)', cp(0xd30, 0xd2e, 0xd47, 0xd36, 0xd28, 0xd4d, 0x200d)],
    ['a Bengali word ending in a legacy khanda ta — virama + ZWJ LAST', cp(0x9b8, 0x9a4, 0x9cd, 0x200d)],
    ['a Vietnamese name typed DECOMPOSED (two marks on one base — NFC composes them, so it is stored composed)', `Nguy${cp(0x65, 0x302, 0x303)}n`],
  ])('%s is accepted', (_label, raw) => {
    expect(normalizeFieldWorkerName(raw)).toBe(raw.normalize('NFC'));
  });
});

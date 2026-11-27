// Story 6.39a (Task 3.1; DL3, DL10) — the bank date's vocabularies are DOMAIN-OWNED and MIRRORED in contracts; this pins
// each pair in lockstep (the 6.39 pattern), and the request's shape rules (TR5: a refusal echoes ⛔ input value).

import { claim, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FEE_BANK_DATE_LIST_FEE_DATE_SOURCES,
  FEE_BANK_DATE_REASON_CODES,
  MEMBERSHIP_CHECK_FEE_DATE_SOURCES,
  FEE_BANK_DATE_REFUSAL_REASONS,
  FEE_BANK_DATE_STEP_UP_CONTEXT,
  FeeBankDateListResponse,
  FeeBankDateRequest,
  STATEMENT_REFERENCE_RE,
  VYAWASTHA_SHULK_UTR_RE,
  VyawasthaShulkConfirmRequest,
  feeBankDateRefusalReasonOf,
  hasVisibleNoteCharacter,
} from '../src/index.js';

const ID = '6b1f0b7e-2c56-4b55-9d0b-3a0a2b1c4d5e';
const body = (over: Record<string, unknown> = {}) => ({
  statement_reference: '123456789012',
  bank_credit_date: '2026-03-01',
  reason_code: 'recorded_late_by_member',
  note: 'SBI current account, March statement, line 14',
  expected_live_check_id: ID,
  expected_live_record_id: null,
  ...over,
});

describe('Story 6.39a — the bank-date vocabulary', () => {
  it('each contracts tuple equals the domain tuple, in order', () => {
    expect([...FEE_BANK_DATE_REASON_CODES]).toEqual([...schema.FEE_BANK_DATE_REASON_CODES]);
    expect([...FEE_BANK_DATE_REFUSAL_REASONS]).toEqual([...claim.FEE_BANK_DATE_REFUSAL_REASONS]);
    expect([...FEE_BANK_DATE_LIST_FEE_DATE_SOURCES]).toEqual([...schema.MEMBERSHIP_CHECK_FEE_DATE_SOURCES]);
    expect([...FEE_BANK_DATE_LIST_FEE_DATE_SOURCES]).toEqual([...MEMBERSHIP_CHECK_FEE_DATE_SOURCES]);
  });

  it('the step-up context is its own (⛔ a neighbour\'s — an elevation for one act never satisfies another)', () => {
    expect(FEE_BANK_DATE_STEP_UP_CONTEXT).toBe('fee_bank_date');
  });

  it('feeBankDateRefusalReasonOf reads only `fee_bank_date.<known reason>`', () => {
    expect(feeBankDateRefusalReasonOf('fee_bank_date.reference_mismatch')).toBe('reference_mismatch');
    expect(feeBankDateRefusalReasonOf('fee_bank_date.because')).toBeNull();
    expect(feeBankDateRefusalReasonOf('membership_check.stale')).toBeNull();
    expect(feeBankDateRefusalReasonOf(undefined)).toBeNull();
  });
});

describe('Story 6.39a — FeeBankDateRequest', () => {
  it('a well-formed body parses; the reference is TRIMMED before the shape check (DL10)', () => {
    expect(FeeBankDateRequest.parse(body({ statement_reference: ' 123456789012  ' })).statement_reference).toBe('123456789012');
    expect(FeeBankDateRequest.parse(body({ statement_reference: 'ABCDEFGHIJKLMNOPQRSTUV' })).statement_reference).toBe('ABCDEFGHIJKLMNOPQRSTUV');
  });

  it('refuses each malformed field; ⭐ the issue carries ⛔ input value (TR5)', () => {
    const planted = '98765432109';
    for (const over of [
      { statement_reference: planted }, // 11 digits
      { statement_reference: '' },
      { bank_credit_date: '2026-02-30' },
      { bank_credit_date: '01-03-2026' },
      { reason_code: 'because' },
      { note: '   ' },
      { expected_live_check_id: undefined },
      { expected_live_record_id: undefined },
      { extra: true },
    ]) {
      const r = FeeBankDateRequest.safeParse(body(over));
      expect(r.success, JSON.stringify(over)).toBe(false);
      expect(JSON.stringify(r.error?.issues)).not.toContain(planted);
    }
  });

  it('the list response carries ⛔ fee outcome, ⛔ name, ⛔ date of death (strict)', () => {
    const row = {
      claim_case_id: ID,
      latest_posting_district: 'Jaipur',
      recorded_fee_date: '2026-03-10',
      amount_inr: 110,
      reference_last4: '9012',
      fee_date_source: 'recorded',
      expected_live_check_id: ID,
      expected_live_record_id: null,
      live_record: null,
    };
    expect(FeeBankDateListResponse.safeParse({ held: [row], recorded: [], held_truncated: false, recorded_truncated: false }).success).toBe(true);
    for (const extra of [{ fee_outcome: 'after_death' }, { date_of_death: '2026-03-09' }, { name: 'X' }]) {
      expect(FeeBankDateListResponse.safeParse({ held: [{ ...row, ...extra }], recorded: [], held_truncated: false, recorded_truncated: false }).success).toBe(false);
    }
  });
});

// ⚠ Every invisible character below is BUILT from its code point, never typed as a `\u` escape: some tools write an escape into
// a file as the RAW character, which would make this test unreadable and a no-op (memory: unicode escapes land raw).
const chr = (...codes: number[]) => String.fromCharCode(...codes);
const INVISIBLE_ONLY: readonly (readonly [string, string])[] = [
  ['a zero-width space', chr(0x200b)],
  ['a zero-width non-joiner and joiner', chr(0x200c, 0x200d)],
  ['a word joiner', chr(0x2060)],
  ['a byte-order mark', chr(0xfeff)],
  ['a soft hyphen', chr(0x00ad)],
  ['a Hangul filler (U+3164)', chr(0x3164)],
  ['the Hangul choseong and jungseong fillers', chr(0x115f, 0x1160)],
  ['a halfwidth Hangul filler', chr(0xffa0)],
  ['the blank braille pattern', chr(0x2800)],
  ['a bell and a null (control characters)', chr(0x07, 0x00)],
  // L4 — default-ignorable characters the first, hand-picked list did NOT name (built from code points, as above):
  ['a combining grapheme joiner', chr(0x034f)],
  ['the Khmer inherent vowels', chr(0x17b4, 0x17b5)],
  ['the Mongolian free variation selectors', chr(0x180b, 0x180c, 0x180d)],
  ['a variation selector (the emoji presentation selector)', chr(0xfe0f)],
  ['a variation selector from the supplementary plane (a surrogate pair)', String.fromCodePoint(0xe0100)],
  ['a tag character (a surrogate pair)', String.fromCodePoint(0xe0001)],
  // M1 — NOT default-ignorable and in no "invisible" class, yet they carry nothing a person can read: the deny-list let them through.
  ['a lone combining mark', chr(0x0301)],
  ['a private-use character', chr(0xe000)],
  // N8 — PERMANENT noncharacters (an unassigned code point such as U+0378 stops being unassigned the day Unicode gives it a meaning).
  ['a noncharacter (U+FDD0, permanently unassigned)', chr(0xfdd0)],
  ['the noncharacter U+FFFF', chr(0xffff)],
  ['a lone surrogate', chr(0xd800)],
  ['the object-replacement character', chr(0xfffc)],
  // N2 — blank glyphs in NO ignorable class (a symbol or a letter whose only fault is that it draws nothing): a short hand-kept list.
  ['the ideographic half fill space', chr(0x303f)],
  ['the musical symbol null notehead (a surrogate pair)', String.fromCodePoint(0x1d159)],
  ['the Egyptian hieroglyph full and half blanks (surrogate pairs)', String.fromCodePoint(0x13441, 0x13442)],
  [
    'a mix of all of them with ordinary whitespace',
    ` ${chr(0x200b)}\t${chr(0x3164)}\n${chr(0x2800)}  ${chr(0xfeff)}${chr(0x0301)}${chr(0xe000)}${chr(0xfdd0)}${chr(0xd800)}${chr(0xfffc)}${chr(0x303f)}${String.fromCodePoint(0x1d159, 0x13441)}`,
  ],
];

describe('Story 6.39a — the REQUIRED note carries a visible character (code review, second pass, K6)', () => {
  it.each(INVISIBLE_ONLY)('refuses a note made only of %s', (_label, note) => {
    expect(hasVisibleNoteCharacter(note)).toBe(false);
    const r = FeeBankDateRequest.safeParse(body({ note }));
    expect(r.success).toBe(false);
    // Only the note is refused (a character the trim strips is refused by `.min(1)` AND the rule — two issues, one field).
    expect(new Set(r.error?.issues.map((i) => i.path.join('.')))).toEqual(new Set(['note']));
  });

  it('⭐ the reason the rule exists: `String.prototype.trim` keeps every one of these but the byte-order mark (it is ECMAScript whitespace), so `.trim().min(1)` alone let them through', () => {
    const kept = INVISIBLE_ONLY.filter(([, note]) => note.trim().length > 0);
    expect(kept.map(([label]) => label)).toEqual(INVISIBLE_ONLY.map(([label]) => label).filter((label) => label !== 'a byte-order mark'));
  });

  it('accepts a note with ANY visible character, however short — "." and "x" are visible; whether a note is MEANINGFUL is not this rule\'s question', () => {
    for (const note of ['.', 'x', '1', 'SBI current account, March statement, line 14']) {
      expect(hasVisibleNoteCharacter(note), note).toBe(true);
      expect(FeeBankDateRequest.safeParse(body({ note })).success, note).toBe(true);
    }
  });

  it('⭐ N1 — REAL notes still pass, in any script and of any kind: words, digits, a danda, a currency sign, a check mark, an emoji sequence (the SYMBOL arm of the rule — a note that is only a rupee sign is a note)', () => {
    const real: readonly (readonly [string, string])[] = [
      ['a Hindi word', chr(0x092c, 0x0948, 0x0902, 0x0915)],
      ['a Gujarati word', chr(0x0a97, 0x0ac1, 0x0a9c, 0x0ab0, 0x0abe, 0x0aa4, 0x0ac0)],
      ['an Urdu word', chr(0x0628, 0x0646, 0x06a9)],
      ['Devanagari digits', chr(0x0967, 0x0968)],
      ['a Devanagari danda', chr(0x0964)],
      ['a rupee sign (a currency symbol — category Sc)', chr(0x20b9)],
      ['a plus sign (a math symbol — category Sm)', '+'],
      ['a check-mark emoji (category So)', chr(0x2705)],
      ['a ZWJ family emoji sequence', `${String.fromCodePoint(0x1f468)}${chr(0x200d)}${String.fromCodePoint(0x1f469)}${chr(0x200d)}${String.fromCodePoint(0x1f467)}`],
      ['a percent sign', '%'],
    ];
    for (const [label, note] of real) {
      expect(hasVisibleNoteCharacter(note), label).toBe(true);
      expect(FeeBankDateRequest.safeParse(body({ note })).success, label).toBe(true);
    }
  });

  it('accepts invisible characters AROUND or INSIDE visible ones — a joiner inside a Devanagari conjunct is ordinary text', () => {
    const conjunct = `${chr(0x0915)}${chr(0x094d)}${chr(0x200d)}${chr(0x0937)}`; // क + virama + ZWJ + ष
    for (const note of [conjunct, `${chr(0x200b)}x`, `x${chr(0x200b)}`, `${chr(0x3164)}bank${chr(0x2800)}`, `x${chr(0xfe0f)}`, `${chr(0x034f)}.`]) {
      expect(hasVisibleNoteCharacter(note)).toBe(true);
      expect(FeeBankDateRequest.safeParse(body({ note })).success).toBe(true);
    }
  });

  it('L4 / M2 / N4 — the rule is STATELESS: the answer to a note does not depend on the notes asked before it', () => {
    // A module-level `/g` regex used with `.test` carries `lastIndex` from one call to the next: after `x` (a match at index 0) the next
    // ONE-character note is searched from index 1 and answers `false`. So visible one-character notes in a row, then the same again.
    for (const note of ['x', 'y', 'z', 'x', 'x']) expect(hasVisibleNoteCharacter(note), note).toBe(true);
    // And an invisible note keeps answering `false` after visible ones, and a visible one `true` after invisible ones.
    const sequence: readonly (readonly [string, boolean])[] = [['x', true], [chr(0x200b), false], ['y', true], [chr(0x200b), false], [chr(0x200b), false], ['z', true]];
    for (const [note, visible] of sequence) expect(hasVisibleNoteCharacter(note), JSON.stringify(note)).toBe(visible);
  });

  it('the length cap and the trim still hold beside the new rule', () => {
    expect(FeeBankDateRequest.safeParse(body({ note: 'x'.repeat(2000) })).success).toBe(true);
    expect(FeeBankDateRequest.safeParse(body({ note: 'x'.repeat(2001) })).success).toBe(false);
    expect(FeeBankDateRequest.parse(body({ note: '  line 14  ' })).note).toBe('line 14');
  });
});

describe('Story 6.39a — the statement reference IS the receipt\'s reference rule (code review, second pass, K12)', () => {
  it('one constant — the bank-date request imports the payment confirm\'s, ⛔ a re-typed copy', () => {
    expect(STATEMENT_REFERENCE_RE).toBe(VYAWASTHA_SHULK_UTR_RE);
  });

  it('the two contracts accept and refuse the SAME references', () => {
    for (const ref of ['123456789012', 'ABCDEFGHIJKLMNOPQRSTUV', 'abcdefghij1234567890AB', '12345678901', '1234567890123', 'ABCDEFGHIJKLMNOPQRSTU', 'ABCDEFGHIJKLMNOPQRSTUVW', '12345678901a', 'ABCDEFGHIJKLMNOPQRSTU-', '']) {
      const receipt = VyawasthaShulkConfirmRequest.safeParse({ tr: 'tr-1', utr: ref }).success;
      const bank = FeeBankDateRequest.safeParse(body({ statement_reference: ref })).success;
      expect(bank, ref).toBe(receipt);
    }
  });
});

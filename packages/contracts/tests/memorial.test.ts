// Story 11b.4 — the family memorial's contracts: the by-value vocabularies pinned to the domain's (a TEST-ONLY domain
// import — tests never ship in a bundle), the blank / length rules (AC7), the paragraph ranges (AC11), the decision
// validator (MA6) and the no-edit input (AC6).

import { memorial as domainMemorial } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_BIDI_CONTROLS,
  MEMORIAL_INVISIBLE_CHARS,
  MEMORIAL_OMISSION_FIELDS,
  MEMORIAL_REVIEW_ACTIONS,
  MEMORIAL_REVIEW_REASONS,
  MEMORIAL_STATES,
  MEMORIAL_WITHDRAWAL_ACTORS,
  MemorialMemberView,
  MemorialReviewDecisionInput,
  MemorialWithdrawApprovalInput,
  isMemorialTextBlank,
  memorialCodePointLength,
  memorialParagraphRanges,
  validateMemorialDecision,
  type MemorialDecisionCandidate,
} from '../src/index.js';

describe('vocabularies — by value, EQUAL to the domain tuples that generate the pgEnums', () => {
  it.each([
    [MEMORIAL_REVIEW_ACTIONS, domainMemorial.MEMORIAL_REVIEW_ACTIONS],
    [MEMORIAL_REVIEW_REASONS, domainMemorial.MEMORIAL_REVIEW_REASONS],
    [MEMORIAL_WITHDRAWAL_ACTORS, domainMemorial.MEMORIAL_WITHDRAWAL_ACTORS],
    [MEMORIAL_OMISSION_FIELDS, domainMemorial.MEMORIAL_OMISSION_FIELDS],
    [MEMORIAL_STATES, domainMemorial.MEMORIAL_STATES],
  ])('%#', (wire, domain) => {
    expect([...wire]).toEqual([...domain]);
  });

  it('the four grounds and ⛔ no catch-all, ⛔ no family_asked (MA6, MA18)', () => {
    expect([...MEMORIAL_REVIEW_REASONS]).toEqual([
      'attacks_someone_named',
      'accuses_someone_of_wrongdoing',
      'against_the_law',
      'identifies_a_child',
    ]);
    expect([...MEMORIAL_WITHDRAWAL_ACTORS]).not.toContain('helpline');
  });
});

describe('blank and length (AC7)', () => {
  it.each([
    ['', true],
    ['   \n\t ', true],
    ['​​', true], // ZWSP only
    ['ㅤ', true], // HANGUL FILLER (Lo)
    ['ﾠ', true], // HALFWIDTH HANGUL FILLER (Lo) — added beyond the source class
    ['⠀', true],
    ['.', false],
    ['माँ', false],
    ['❤', false],
  ])('%j blank=%s', (text, blank) => {
    expect(isMemorialTextBlank(text)).toBe(blank);
    // ⚠ The `/g` trap: the same answer twice in a row.
    expect(isMemorialTextBlank(text)).toBe(blank);
  });

  it('the classes carry ⛔ no `g` flag (stateful under .test)', () => {
    expect(MEMORIAL_INVISIBLE_CHARS.global).toBe(false);
    expect(MEMORIAL_BIDI_CONTROLS.global).toBe(false);
    expect(MEMORIAL_BIDI_CONTROLS.test('a‮b')).toBe(true);
    expect(MEMORIAL_BIDI_CONTROLS.test('a‮b')).toBe(true);
  });

  it('length counts CODE POINTS, ⛔ UTF-16 units', () => {
    expect(memorialCodePointLength('😀😀')).toBe(2);
    expect('😀😀'.length).toBe(4);
    expect(memorialCodePointLength('नमस्ते')).toBe(6);
  });
});

describe('memorialParagraphRanges (AC11)', () => {
  it('splits on a blank line, CRLF-aware, ⛔ trimming nothing inside a paragraph', () => {
    const text = '  पहली पंक्ति\r\n\r\n*दूसरी*  ';
    const ranges = memorialParagraphRanges(text);
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(['  पहली पंक्ति', '*दूसरी*  ']);
  });

  it('a single line break is ⛔ a separator; a whitespace-only line is', () => {
    expect(memorialParagraphRanges('a\nb')).toEqual([{ start: 0, end: 3 }]);
    const t = 'a\n \t\nb';
    expect(memorialParagraphRanges(t).map((r) => t.slice(r.start, r.end))).toEqual(['a', 'b']);
  });

  it('an empty text has ⛔ no paragraph', () => {
    expect(memorialParagraphRanges('')).toEqual([]);
  });
});

describe('validateMemorialDecision (MA6)', () => {
  const body = 'पहला वाक्य। दूसरा वाक्य।\n\nतीसरा वाक्य।';
  const subject = { body, altText: 'माँ की फ़ोटो', hasPhoto: true };
  const span = (start: number, end: number, field: 'body' | 'altText' = 'body') =>
    ({ field, start, end, reason: 'attacks_someone_named' }) as const;
  const awo = (d: Partial<MemorialDecisionCandidate>): MemorialDecisionCandidate => ({ action: 'approved_with_omissions', ...d });
  const first = body.indexOf('दूसरा');
  const firstEnd = body.indexOf('\n');

  it('approved: nothing else', () => {
    expect(validateMemorialDecision({ action: 'approved' }, subject)).toEqual({ ok: true });
    expect(validateMemorialDecision({ action: 'approved', omissions: [span(0, 3)] }, subject).ok).toBe(false);
    expect(validateMemorialDecision({ action: 'approved', photoLeftOut: { reason: 'identifies_a_child' } }, subject).ok).toBe(false);
    expect(validateMemorialDecision({ action: 'approved', reasonCode: 'against_the_law' }, subject).ok).toBe(false);
  });

  it('not_approved: a reason, and ⛔ no omissions or photoLeftOut', () => {
    expect(validateMemorialDecision({ action: 'not_approved', reasonCode: 'against_the_law' }, subject)).toEqual({ ok: true });
    expect(validateMemorialDecision({ action: 'not_approved' }, subject).ok).toBe(false);
    expect(
      validateMemorialDecision({ action: 'not_approved', reasonCode: 'against_the_law', omissions: [span(0, 3)] }, subject).ok,
    ).toBe(false);
  });

  it('approved_with_omissions: ≥ 1 part, ⛔ reasonCode', () => {
    expect(validateMemorialDecision(awo({ omissions: [span(first, firstEnd)] }), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' } }), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(awo({}), subject)).toEqual({ ok: false, problem: 'action_shape' });
    expect(validateMemorialDecision(awo({ omissions: [span(first, firstEnd)], reasonCode: 'against_the_law' }), subject).ok).toBe(false);
  });

  // Ordering / range cases on an ASCII body, so every offset is a grapheme boundary and only the rule under test fires.
  const ascii = { body: 'alpha beta gamma\n\ndelta epsilon', altText: null, hasPhoto: false };
  it.each([
    ['empty', [span(3, 3)], 'span_empty'],
    ['out of range', [span(0, ascii.body.length + 1)], 'span_out_of_range'],
    ['negative', [span(-1, 2)], 'span_out_of_range'],
    ['unsorted', [span(6, 10), span(0, 5)], 'span_order'],
    ['overlapping', [span(0, 8), span(5, 10)], 'span_order'],
    ['touching', [span(0, 5), span(5, 10)], 'span_order'],
    ['across a blank line', [span(11, 23)], 'span_crosses_paragraph'],
  ] as const)('refuses %s', (_name, omissions, problem) => {
    expect(validateMemorialDecision(awo({ omissions }), ascii)).toEqual({ ok: false, problem });
  });

  it('refuses a Devanagari span across a blank line', () => {
    expect(validateMemorialDecision(awo({ omissions: [span(first, body.length)] }), subject)).toEqual({
      ok: false,
      problem: 'span_crosses_paragraph',
    });
  });

  it('refuses a whitespace-only span', () => {
    const t = 'एक  दो';
    expect(validateMemorialDecision(awo({ omissions: [span(2, 4)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: false,
      problem: 'span_blank',
    });
  });

  it('refuses a boundary inside a surrogate pair', () => {
    const t = 'a😀b c';
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
  });

  it('refuses a boundary inside a Devanagari conjunct', () => {
    const t = 'क्ष और';
    // `क्ष` is ONE grapheme cluster of three code units — cutting after `क्` splits it.
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
  });

  it('refuses a boundary inside a ZWJ sequence', () => {
    const family = '👨‍👩‍👧';
    const t = `${family} x`;
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
    expect(validateMemorialDecision(awo({ omissions: [span(0, family.length)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: true,
    });
  });

  it('refuses leaving ⛔ visible character of the body (that is not_approved)', () => {
    const t = 'केवल यह';
    expect(validateMemorialDecision(awo({ omissions: [span(0, t.length)] }), { body: t, altText: null, hasPhoto: false })).toEqual({
      ok: false,
      problem: 'nothing_left',
    });
  });

  it('the photo rules', () => {
    const noPhoto = { body, altText: null, hasPhoto: false };
    expect(validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' } }), noPhoto)).toEqual({
      ok: false,
      problem: 'photo_left_out_without_photo',
    });
    expect(
      validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' }, omissions: [span(0, 3, 'altText')] }), subject),
    ).toEqual({ ok: false, problem: 'alt_text_span_with_photo_left_out' });
    expect(validateMemorialDecision(awo({ omissions: [span(0, 3, 'altText')] }), noPhoto)).toEqual({
      ok: false,
      problem: 'alt_text_span_without_alt_text',
    });
    expect(validateMemorialDecision(awo({ omissions: [span(0, 3, 'altText')] }), subject)).toEqual({ ok: true });
  });
});

describe('the no-edit invariant is ABSENCE (AC6)', () => {
  it.each(['body', 'text', 'narrative'])('a decision posting `%s` is refused by the strict schema', (field) => {
    expect(MemorialReviewDecisionInput.safeParse({ action: 'approved', [field]: 'rewritten words' }).success).toBe(false);
  });

  it('withdraw-approval needs one of the four reasons, strictly', () => {
    expect(MemorialWithdrawApprovalInput.safeParse({ reasonCode: 'identifies_a_child' }).success).toBe(true);
    expect(MemorialWithdrawApprovalInput.safeParse({}).success).toBe(false);
    expect(MemorialWithdrawApprovalInput.safeParse({ reasonCode: 'family_asked' }).success).toBe(false);
  });

  it('the member view has ⛔ internal note and ⛔ photo key, and ⛔ wire key named `status` (AC10, MA8, MA10)', () => {
    const keys = Object.keys(MemorialMemberView.shape);
    for (const forbidden of ['internalNote', 'internalNoteCiphertext', 'photoObjectKey', 'status']) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys).toContain('memorialState');
  });
});

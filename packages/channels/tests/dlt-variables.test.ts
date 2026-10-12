// The typed-variable vocabulary — Story 6.34 (AC1; TV1 / TV13).
// DB-FREE unit tests: each shape rule with a passing and a failing case, and the two value predicates.

import { describe, expect, it } from 'vitest';

import {
  checkDltTemplateShape,
  DLT_TYPE_MAX_LENGTH,
  DLT_VAR,
  DLT_VARIABLE_TYPES,
  isDltCallbackNumber,
  isDltNumeric,
  type DltShapeRule,
  type DltSlot,
} from '../src/index.js';

const V = DLT_VAR;
const cbn = (name: string): DltSlot => ({ name, type: 'cbn', maxLength: 14, label: 'helpline' });
const alnum = (name: string, maxLength = 40): DltSlot => ({ name, type: 'alphanumeric', maxLength, label: name });
const rules = (text: string, slots: readonly DltSlot[]): DltShapeRule[] =>
  checkDltTemplateShape(text, slots).map((p) => p.rule);

describe('the vocabulary (TV1)', () => {
  it('has ONE marker and TRAI Annexure-I\'s six types with their ceilings', () => {
    expect(DLT_VAR).toBe('{#var#}');
    expect([...DLT_VARIABLE_TYPES]).toEqual(['numeric', 'alphanumeric', 'url', 'urlott', 'cbn', 'email']);
    expect(DLT_TYPE_MAX_LENGTH).toEqual({ numeric: 40, alphanumeric: 40, url: 120, urlott: 120, cbn: 14, email: 40 });
  });
});

describe('checkDltTemplateShape (TV1)', () => {
  it('passes a real-shaped two-variable template', () => {
    const text = `Claim ${V}: the bank details need correcting. Please call the helpline on ${V}.`;
    expect(checkDltTemplateShape(text, [alnum('reference', 8), cbn('helpline')])).toEqual([]);
  });

  it('fails a whole-body template (0 % fixed)', () => {
    expect(rules(V, [alnum('body')])).toEqual(['fixed_share']);
  });

  it('fails a slot count that differs from the marker count — both directions', () => {
    const text = `Your code ${V} is valid for five minutes only, please do not share it.`;
    expect(rules(text, [])).toContain('slot_count');
    expect(rules(text, [alnum('a', 6), alnum('b', 6)])).toContain('slot_count');
    expect(rules(text, [alnum('a', 6)])).toEqual([]);
  });

  it('fails a 4-variable template and passes a 3-variable one', () => {
    const three = `Dear ${V}, the claim for ${V} can be appealed until ${V}. This is a message from the Trust, thank you.`;
    expect(rules(three, [alnum('a', 8), alnum('b', 8), alnum('c', 8)])).toEqual([]);
    const four = `${three} Call ${V} for help with anything at all regarding this notice.`;
    expect(rules(four, [alnum('a', 8), alnum('b', 8), alnum('c', 8), cbn('d')])).toContain('too_many_variables');
  });

  it('fails two adjacent cbn slots separated by nothing, by a space, and by ", "', () => {
    const tail = ' is the number to call for anything about this message from the Trust today.';
    for (const sep of ['', ' ', ', ']) {
      expect(rules(`Call ${V}${sep}${V}${tail}`, [cbn('a'), cbn('b')])).toEqual(['adjacent_variables']);
    }
  });

  it('passes two cbn slots separated by a word, and two adjacent alphanumeric slots', () => {
    const tail = ' for anything about this message from the Trust today.';
    expect(rules(`Call ${V} or ${V}${tail}`, [cbn('a'), cbn('b')])).toEqual([]);
    expect(rules(`Name: ${V} ${V}${tail} Thank you for reading it.`, [alnum('first', 10), alnum('last', 10)])).toEqual([]);
  });

  it('fails a 29 %-fixed template and passes a 30 %-fixed one', () => {
    // 29 fixed characters + a 71-character slot = 29 %; 30 + 70 = 30 %.
    const fixed29 = `${'x'.repeat(29)}${V}`;
    expect(rules(fixed29, [{ name: 'n', type: 'url', maxLength: 71, label: 'link' }])).toEqual(['fixed_share']);
    const fixed30 = `${'x'.repeat(30)}${V}`;
    expect(rules(fixed30, [{ name: 'n', type: 'url', maxLength: 70, label: 'link' }])).toEqual([]);
  });

  it('fails a braced typed tag in the text (the Jio / Vi in-text form)', () => {
    const typed = '{#' + 'numeric' + '#}';
    const text = `${typed} is your login code. Valid 5 min. Do not share.`;
    const found = rules(text, []);
    expect(found).toContain('foreign_tag');
  });

  it('fails a duplicate slot name and a name with an upper-case letter', () => {
    const text = `Call ${V} or ${V} for anything about this message from the Trust today.`;
    expect(rules(text, [cbn('helpline'), cbn('helpline')])).toEqual(['duplicate_slot_name']);
    expect(rules(text, [cbn('Helpline'), cbn('other')])).toEqual(['slot_name']);
    expect(rules(text, [cbn('1st'), cbn('other')])).toEqual(['slot_name']);
  });

  it('fails a maxLength above the type ceiling, below 1, or not an integer', () => {
    const text = `Call ${V} for anything about this message from the Trust today, thank you.`;
    expect(rules(text, [{ ...cbn('h'), maxLength: 15 }])).toEqual(['slot_max_length']);
    expect(rules(text, [{ ...cbn('h'), maxLength: 0 }])).toEqual(['slot_max_length']);
    expect(rules(text, [{ ...cbn('h'), maxLength: 2.5 }])).toEqual(['slot_max_length']);
  });
});

describe('the value predicates (TV1 / TV5)', () => {
  it('isDltCallbackNumber: digits only, 3–14 — ⛔ "+", ⛔ spaces', () => {
    expect(isDltCallbackNumber('+911800123456')).toBe(false);
    expect(isDltCallbackNumber('1800 123456')).toBe(false);
    expect(isDltCallbackNumber('12')).toBe(false);
    expect(isDltCallbackNumber('123456789012345')).toBe(false);
    expect(isDltCallbackNumber('1800123456')).toBe(true);
    expect(isDltCallbackNumber('919876543210')).toBe(true);
    expect(isDltCallbackNumber('123')).toBe(true);
    expect(isDltCallbackNumber('12345678901234')).toBe(true);
  });

  it('isDltNumeric: digits only (leading zeros kept), at most 40', () => {
    expect(isDltNumeric('048213')).toBe(true);
    expect(isDltNumeric('04821a')).toBe(false);
    expect(isDltNumeric('')).toBe(false);
    expect(isDltNumeric('1'.repeat(40))).toBe(true);
    expect(isDltNumeric('1'.repeat(41))).toBe(false);
  });
});

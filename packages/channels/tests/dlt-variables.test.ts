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
  needsUnicode,
  substituteDltValues,
  toGatewayTemplate,
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

  it.each(['numeric ', ' numeric', 'numeric\t', 'var '])('fails a foreign braced tag containing whitespace: %j', (tagName) => {
    const tag = '{#' + tagName + '#}';
    expect(rules(`${tag} is your TWT login code. Valid 5 min. Do not share.`, [])).toEqual(['foreign_tag']);
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

  it('requires callback slots to hold at least three digits while allowing shorter non-callback slots', () => {
    const text = `Call ${V} for anything about this message from the Trust today, thank you.`;
    for (const maxLength of [1, 2]) {
      expect(checkDltTemplateShape(text, [{ ...cbn('h'), maxLength }])).toEqual([
        { rule: 'slot_max_length', message: `slot "h" declares maxLength ${maxLength} — a cbn variable holds 3 to 14` },
      ]);
    }
    expect(checkDltTemplateShape(text, [{ ...cbn('h'), maxLength: 3 }])).toEqual([]);
    expect(checkDltTemplateShape(text, [alnum('h', 1)])).toEqual([]);
    expect(checkDltTemplateShape(text, [{ name: 'h', type: 'numeric', maxLength: 1, label: 'code' }])).toEqual([]);
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

// Story 6.37 (MG3, MG5; AC5, AC6) — the named values sent to the gateway, the gateway's template form, the text's type.
describe('substituteDltValues (6.37 MG3)', () => {
  const text = `Claim ${V}: please call the helpline on ${V}. Your claim is still open.`;
  const slots = [alnum('reference', 8), cbn('helpline')];

  it('substitutes each value into its marker, in slot order', () => {
    const values = [
      { name: 'reference', value: 'AB12CD34' },
      { name: 'helpline', value: '1800123456' },
    ];
    expect(substituteDltValues(text, slots, values)).toBe(
      'Claim AB12CD34: please call the helpline on 1800123456. Your claim is still open.',
    );
  });

  it.each(['$&', "$'", '$`', '$1', V, '##helpline##', `${V}${V}`])(
    'inserts a value holding %s literally — substituted ONCE, left-to-right, never re-scanned',
    (hostile) => {
      const values = [
        { name: 'reference', value: hostile },
        { name: 'helpline', value: '1800123456' },
      ];
      expect(substituteDltValues(text, slots, values)).toBe(
        `Claim ${hostile}: please call the helpline on 1800123456. Your claim is still open.`,
      );
    },
  );

  it('throws on a value count that differs from the slots, on a name out of order, and on a marker / slot mismatch', () => {
    expect(() => substituteDltValues(text, slots, [{ name: 'reference', value: 'X' }])).toThrow(/2 slot/);
    expect(() =>
      substituteDltValues(text, slots, [
        { name: 'helpline', value: '1800123456' },
        { name: 'reference', value: 'AB12CD34' },
      ]),
    ).toThrow(/"helpline".*"reference"/);
    expect(() => substituteDltValues(`No marker here.`, [alnum('a')], [{ name: 'a', value: 'x' }])).toThrow(/0 variable marker/);
  });
});

describe('toGatewayTemplate (6.37 MG3, AC6)', () => {
  it('writes each marker as the wrapped slot name, in order — the MSG91 form by default', () => {
    const text = `${V} is your code. Call ${V}.`;
    expect(toGatewayTemplate(text, [alnum('otp', 6), cbn('helpline')])).toBe('##otp## is your code. Call ##helpline##.');
    expect(toGatewayTemplate(text, [alnum('otp', 6), cbn('helpline')], (n) => `<${n}>`)).toBe('<otp> is your code. Call <helpline>.');
  });

  it('throws when the marker count differs from the slots', () => {
    expect(() => toGatewayTemplate(`${V} and ${V}.`, [alnum('a')])).toThrow(/2 variable marker/);
  });
});

describe('needsUnicode (6.37 MG5, T11)', () => {
  it('is false for a text inside the GSM-7 default and extension tables', () => {
    expect(needsUnicode("Claim AB12: your family's claim is open. Call 1800123456.")).toBe(false);
    expect(needsUnicode('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./:;<=>?¡ÄÖÑÜ§¿äöñüà')).toBe(false);
    expect(needsUnicode('^{}\\[~]|€\f')).toBe(false);
  });

  it('is true for Devanagari, an em dash, a curly quote, and a character outside the BMP', () => {
    expect(needsUnicode('दावा')).toBe(true);
    expect(needsUnicode('questions: x — or call')).toBe(true);
    expect(needsUnicode('family\u2019s')).toBe(true);
    expect(needsUnicode('a 😀')).toBe(true);
    expect(needsUnicode('ç')).toBe(true);
  });
});

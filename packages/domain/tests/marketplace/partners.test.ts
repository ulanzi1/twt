// Story 12.2 (`2026-11-01-433` QE3, QE12, QE18; AC3) — the PURE `parsePartnerDisplayNames` pre-check. DB-free.
// Every refusal is `ModulePartnerNameInvalidError` with the WIRE path (`display_name_en` / `display_name_hi`).

import { describe, expect, it } from 'vitest';

import { ModulePartnerNameInvalidError } from '../../src/marketplace/errors.js';
import { parsePartnerDisplayNames } from '../../src/marketplace/partners.js';

const cp = (n: number): string => String.fromCodePoint(n);

function refusalPaths(input: { displayNameEn: unknown; displayNameHi: unknown }): string[] {
  try {
    parsePartnerDisplayNames(input);
  } catch (e) {
    expect(e).toBeInstanceOf(ModulePartnerNameInvalidError);
    return (e as ModulePartnerNameInvalidError).issues.map((i) => i.path.join('.'));
  }
  throw new Error('expected ModulePartnerNameInvalidError');
}

describe('parsePartnerDisplayNames (QE12)', () => {
  it('accepts and TRIMS a valid pair', () => {
    expect(parsePartnerDisplayNames({ displayNameEn: '  LIC  ', displayNameHi: ' एलआईसी ' })).toEqual({
      displayNameEn: 'LIC',
      displayNameHi: 'एलआईसी',
    });
  });

  it('accepts mixed Latin + Devanagari in Hindi, and 120 characters', () => {
    expect(parsePartnerDisplayNames({ displayNameEn: 'n'.repeat(120), displayNameHi: 'LIC टर्म प्लान' }).displayNameHi).toBe(
      'LIC टर्म प्लान',
    );
  });

  it.each([
    ['a Hindi name with no Devanagari', { displayNameEn: 'LIC', displayNameHi: 'LIC' }, ['display_name_hi']],
    ['a Hindi name that is Latin + a danda', { displayNameEn: 'LIC', displayNameHi: 'LIC ।' }, ['display_name_hi']],
    ['an English name over 120', { displayNameEn: 'n'.repeat(121), displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a Hindi name over 120', { displayNameEn: 'LIC', displayNameHi: 'क'.repeat(121) }, ['display_name_hi']],
    ['an empty English name', { displayNameEn: '   ', displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a blank-looking English name', { displayNameEn: '-.-', displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a line feed in a name', { displayNameEn: `L${cp(0x0a)}IC`, displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a bidi override', { displayNameEn: `L${cp(0x202e)}IC`, displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a zero-width space', { displayNameEn: 'LIC', displayNameHi: `एल${cp(0x200b)}आईसी` }, ['display_name_hi']],
    ['a C1 control', { displayNameEn: `L${cp(0x85)}IC`, displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['a non-string', { displayNameEn: 42, displayNameHi: 'एलआईसी' }, ['display_name_en']],
    ['both bad', { displayNameEn: '', displayNameHi: 'LIC' }, ['display_name_en', 'display_name_hi']],
  ])('refuses %s', (_l, input, paths) => {
    expect(refusalPaths(input).sort()).toEqual([...paths].sort());
  });

  it('ZWJ inside Devanagari is accepted', () => {
    expect(() => parsePartnerDisplayNames({ displayNameEn: 'LIC', displayNameHi: `क्${cp(0x200d)}ष` })).not.toThrow();
  });
});

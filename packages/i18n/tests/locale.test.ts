import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  getLocale,
  isLocale,
  LOCALES,
  parseAcceptLanguage,
} from '../src/locale.js';

describe('Locale primitives', () => {
  it('exposes both locales, Hindi-primary first', () => {
    expect(LOCALES).toEqual(['hi', 'en']);
    expect(DEFAULT_LOCALE).toBe('hi');
  });

  it('isLocale narrows valid + rejects invalid', () => {
    expect(isLocale('hi')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe('parseAcceptLanguage', () => {
  it('returns undefined for absent / unsupported headers', () => {
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
    expect(parseAcceptLanguage('')).toBeUndefined();
    expect(parseAcceptLanguage('fr-FR,de;q=0.8')).toBeUndefined();
  });

  it('picks the supported locale, honouring q-weights', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(parseAcceptLanguage('hi-IN,hi;q=0.9,en;q=0.8')).toBe('hi');
    // en outranks hi by q-weight even though hi appears later.
    expect(parseAcceptLanguage('fr;q=1.0,en;q=0.9,hi;q=0.5')).toBe('en');
    expect(parseAcceptLanguage('hi;q=0.4,en;q=0.3')).toBe('hi');
  });
});

describe('getLocale precedence', () => {
  it('rung 1 — sessionLocale wins over everything', () => {
    expect(
      getLocale({ sessionLocale: 'en', pariwarPassportLocale: 'hi', acceptLanguage: 'hi' }),
    ).toBe('en');
  });

  it('rung 2 — pariwarPassportLocale when no session', () => {
    expect(getLocale({ pariwarPassportLocale: 'en', acceptLanguage: 'hi' })).toBe('en');
  });

  it('rung 3 — Accept-Language when no session / passport', () => {
    expect(getLocale({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
  });

  it('rung 4 — Hindi fallback when all inputs absent', () => {
    expect(getLocale({})).toBe('hi');
  });

  it('skips malformed rungs without throwing', () => {
    expect(
      getLocale({ sessionLocale: 'fr' as never, pariwarPassportLocale: 'en' }),
    ).toBe('en');
    expect(getLocale({ acceptLanguage: 'fr-FR' })).toBe('hi');
  });
});

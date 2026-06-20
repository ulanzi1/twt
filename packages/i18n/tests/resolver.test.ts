import { describe, expect, it } from 'vitest';

import { t } from '../src/resolver.js';

describe('t() resolution', () => {
  it('resolves a key in the requested locale + namespace', () => {
    expect(t('welcome', undefined, { locale: 'en' })).toBe('Welcome');
    expect(t('welcome', undefined, { locale: 'hi' })).toBe('स्वागत है');
    expect(t('cancel', undefined, { locale: 'hi', namespace: 'common' })).toBe('रद्द करें');
  });

  it('defaults to Hindi (DEFAULT_LOCALE) + common namespace', () => {
    expect(t('welcome')).toBe('स्वागत है');
    expect(t('save')).toBe('सहेजें');
  });

  it('interpolates {varName} single-brace tokens', () => {
    expect(t('greeting', { name: 'Reena' }, { locale: 'en' })).toBe('Hello, Reena');
    expect(t('greeting', { name: 'रीना' }, { locale: 'hi' })).toBe('नमस्ते, रीना');
  });

  it('coerces numeric params to string', () => {
    // (uses a transient template via the public surface — greeting carries {name})
    expect(t('greeting', { name: 7 }, { locale: 'en' })).toBe('Hello, 7');
  });
});

describe('t() loud-by-default failures', () => {
  it('throws naming an unknown namespace', () => {
    expect(() => t('welcome', undefined, { namespace: 'nope' })).toThrow(/unknown namespace 'nope'/);
  });

  it('throws naming a missing key', () => {
    expect(() => t('does-not-exist', undefined, { locale: 'en' })).toThrow(
      /missing key 'does-not-exist' in 'en\/common'/,
    );
  });

  it('throws naming a missing interpolation param', () => {
    expect(() => t('greeting', {}, { locale: 'en' })).toThrow(/missing interpolation param 'name'/);
  });
});

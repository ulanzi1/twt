// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '../src/locale.js';
import { LocaleProvider, useLocale, useT } from '../src/react.js';

function provider(initialLocale?: 'hi' | 'en') {
  return ({ children }: { children: ReactNode }) =>
    createElement(LocaleProvider, { initialLocale, children });
}

describe('useLocale', () => {
  it('throws outside LocaleProvider', () => {
    expect(() => renderHook(() => useLocale())).toThrow(
      '[i18n] useLocale() must be used within a <LocaleProvider>',
    );
  });

  it('provides DEFAULT_LOCALE when no initialLocale given', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: provider() });
    expect(result.current.locale).toBe(DEFAULT_LOCALE);
  });

  it('provides the given initialLocale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: provider('en') });
    expect(result.current.locale).toBe('en');
  });

  it('updates locale via setLocale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: provider('en') });
    act(() => {
      result.current.setLocale('hi');
    });
    expect(result.current.locale).toBe('hi');
  });
});

describe('useT', () => {
  it('returns a translate function', () => {
    const { result } = renderHook(() => useT(), { wrapper: provider('en') });
    expect(typeof result.current).toBe('function');
  });

  it('translates a key using the context locale', () => {
    const { result } = renderHook(() => useT(), { wrapper: provider('en') });
    expect(result.current('welcome')).toBe('Welcome');
  });

  it('translates with interpolation params', () => {
    const { result } = renderHook(() => useT(), { wrapper: provider('en') });
    expect(result.current('greeting', { name: 'Reena' })).toBe('Hello, Reena');
  });

  it('reflects locale changes from the context', () => {
    const { result } = renderHook(() => ({ t: useT(), l: useLocale() }), {
      wrapper: provider('en'),
    });
    expect(result.current.t('welcome')).toBe('Welcome');
    act(() => {
      result.current.l.setLocale('hi');
    });
    expect(result.current.t('welcome')).toBe('स्वागत है');
  });

  it('allows per-call locale override', () => {
    const { result } = renderHook(() => useT(), { wrapper: provider('en') });
    expect(result.current('welcome', undefined, { locale: 'hi' })).toBe('स्वागत है');
  });
});

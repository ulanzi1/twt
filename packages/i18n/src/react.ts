// packages/i18n/src/react.ts
//
// The React client surface of `@twt/i18n` — the locale-toggle context + the
// locale-bound `useT()` hook (Story 2.1, AC1; carved into this subpath at Story
// 2.5). Reached via the `@twt/i18n/react` subpath export so the server-safe core
// (`t`, `getLocale`, numerals — the package root) loads without `react`.
//
// `react` is an OPTIONAL peer dep (see package.json) — only React hosts
// (`apps/admin` React 19 + Vite, `apps/mobile` RN + Tamagui, and Astro client
// islands when one is introduced) import this subpath. Astro SSR + Fastify import
// the package root and never pull React.

import { createContext, createElement, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_LOCALE, type Locale, type LocaleState } from './locale.js';
import { type BoundTranslate, t } from './resolver.js';

// A React CONTEXT (not a module-level singleton) — a singleton would break SSR and
// cause hydration mismatches in Astro (Story 2.5+). `null` sentinel = "no provider",
// so `useLocale()` can throw loudly rather than silently serve a wrong default.
const LocaleReactContext = createContext<LocaleState | null>(null);

/**
 * Wraps a React tree (works in both `apps/admin` React-19 web and `apps/mobile`
 * RN + Tamagui — both are React hosts). `initialLocale` is what the SERVER resolved
 * via `getLocale` (so SSR markup and the first client render agree → no hydration
 * mismatch); the client toggle then drives the in-memory state from there.
 */
export function LocaleProvider(props: {
  initialLocale?: Locale;
  children: ReactNode;
}): ReactNode {
  const [locale, setLocale] = useState<Locale>(props.initialLocale ?? DEFAULT_LOCALE);
  return createElement(
    LocaleReactContext.Provider,
    { value: { locale, setLocale } },
    props.children,
  );
}

/** Client hook: the active `Locale` + a setter. Throws if used outside a `LocaleProvider`. */
export function useLocale(): LocaleState {
  const state = useContext(LocaleReactContext);
  if (state === null) {
    throw new Error('[i18n] useLocale() must be used within a <LocaleProvider>');
  }
  return state;
}

/**
 * React hook: returns a `t` bound to the active `useLocale()` locale, so components
 * call `t('welcome')` without passing a locale. A per-call `options.locale` still wins
 * (e.g. rendering the non-active locale in a toggle preview). This is the AC's
 * "options.locale defaults to useLocale() result" realized for React hosts.
 */
export function useT(): BoundTranslate {
  const { locale } = useLocale();
  return (key, params, options) => t(key, params, { locale, ...options });
}

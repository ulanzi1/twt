// packages/i18n/src/resolver.ts
//
// The translation resolver `t()` (Story 2.1, AC1) — the FRAMEWORK-AGNOSTIC,
// server-safe core.
//
// `t()` never calls a React hook, so it is importable from `apps/api` (Fastify),
// Astro SSR, edge, and tests without React. Because a plain function cannot legally
// call `useLocale()`, the AC's "options.locale defaults to useLocale()" is realized
// by the React-bound `useT()` hook — which, from Story 2.5's `/react` subpath split,
// lives in `./react.ts` (reached via `@twt/i18n/react`) so importing the resolver
// never drags `react` into the module graph. `t()` itself defaults to
// `DEFAULT_LOCALE` (`hi`) so it never silently serves a wrong locale.
//
// Missing-key / missing-namespace / missing-interpolation-param are LOUD by default
// (throw, naming the offender) — the same strict loud-throw posture as the 1.17
// scripts/microcopy config parsing.

import { getCatalog } from './catalog.js';
import { DEFAULT_LOCALE } from './locale.js';
import type { Locale } from './locale.js';

/** Per-call resolver options. Both optional — see `t()` defaults. */
export interface TranslateOptions {
  /** Target locale. Defaults to `DEFAULT_LOCALE` (`hi`); `useT()` binds the context locale. */
  locale?: Locale;
  /** Domain to resolve the key in. Defaults to `'common'`. */
  namespace?: string;
}

/** Interpolation params: `{varName}` single-brace tokens map to these by name. */
export type TranslateParams = Record<string, string | number>;

const TOKEN = /\{(\w+)\}/g;

function interpolate(template: string, params: TranslateParams | undefined, where: string): string {
  return template.replace(TOKEN, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`[i18n] missing interpolation param '${name}' for ${where}`);
    }
    return String(value);
  });
}

/**
 * Resolve `key` to its `{locale}/{namespace}` translation, interpolating `params` via
 * `{varName}` single-brace tokens (e.g. `t('greeting', { name: 'Reena' })`).
 *
 * Defaults: `locale` → `DEFAULT_LOCALE` (`hi`), `namespace` → `'common'`.
 * Throws (loud-by-default) on an unknown namespace, an unknown key, or a `{token}`
 * with no matching param.
 */
export function t(key: string, params?: TranslateParams, options?: TranslateOptions): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const namespace = options?.namespace ?? 'common';

  const catalog = getCatalog(locale, namespace);
  if (!catalog) {
    throw new Error(`[i18n] unknown namespace '${namespace}' for locale '${locale}'`);
  }

  const template = catalog[key];
  if (template === undefined) {
    throw new Error(`[i18n] missing key '${key}' in '${locale}/${namespace}'`);
  }

  return interpolate(template, params, `'${locale}/${namespace}:${key}'`);
}

/**
 * The shape `useT()` returns — `t` pre-bound to the active context locale. The
 * `useT()` hook itself lives in `./react.ts` (the `@twt/i18n/react` subpath); this
 * type stays in the server-safe core so non-React callers can name the bound shape.
 */
export type BoundTranslate = (
  key: string,
  params?: TranslateParams,
  options?: TranslateOptions,
) => string;

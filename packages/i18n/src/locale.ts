// packages/i18n/src/locale.ts
//
// The Locale primitive + the locale-resolution surfaces (Story 2.1, AC1).
//
// `Locale` is defined LOCALLY here — i18n is a low-level shared package usable from
// edge / public / native contexts, so it deliberately does NOT import `@twt/domain`
// (the DB layer). The type is value-aligned with the domain `localeEnum`
// (`pgEnum('locale', ['hi','en'])`, packages/domain/src/schema/pariwar_passport.ts:54)
// but brand-aligned, not symbol-identical — the same precedent as `PariwarId` at
// Story 1.7. Member-visible surfaces default Hindi-primary (architectural-freeze
// row 10), which is why `hi` is the resolution fallback.
//
// Framework posture (AC1): `getLocale` takes a plain context object the CALLER
// assembles from its framework (Fastify request, Astro locals, …) — this module
// imports NO HTTP framework. The React context (`LocaleProvider` / `useLocale`) is
// the client toggle surface; `react` is an OPTIONAL peer dep (see package.json) so
// the server-safe pieces (`Locale`, `getLocale`) remain importable in contexts that
// have no React. See README "Server consumers" for the subpath-split re-trigger.

import { createContext, createElement, useContext, useState } from 'react';
import type { ReactNode } from 'react';

/** The two surface locales. `hi` = Hindi (Devanagari), `en` = English. */
export type Locale = 'hi' | 'en';

/** All supported locales, in canonical order (Hindi-primary first). */
export const LOCALES: readonly Locale[] = ['hi', 'en'];

/**
 * Platform fallback locale. Hindi-primary per architectural-freeze row 10 — every
 * member-visible surface defaults Hindi, and `getLocale` falls back here when no
 * caller signal is present.
 */
export const DEFAULT_LOCALE: Locale = 'hi';

/** Narrowing guard: is `value` one of the supported `Locale`s? */
export function isLocale(value: unknown): value is Locale {
  return value === 'hi' || value === 'en';
}

/**
 * Parse an `Accept-Language` header to a supported `Locale`, honouring q-weights.
 * Returns `undefined` when neither `hi` nor `en` is requested (the caller then
 * falls through to the `DEFAULT_LOCALE` fallback). Framework-agnostic: the caller
 * extracts the raw header string from its request and passes it in.
 */
export function parseAcceptLanguage(header: string | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: (tag ?? '').trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split('-')[0];
    if (primary === 'hi' || primary === 'en') return primary;
  }
  return undefined;
}

/**
 * The caller-assembled locale-resolution context. Each field is OPTIONAL; the caller
 * resolves these from its own framework and passes a plain object — this module never
 * imports Fastify/Astro/HTTP types (AC1 framework-agnostic constraint).
 */
export interface LocaleContext {
  /** The session's persisted locale, if the request is authenticated. Highest precedence. */
  sessionLocale?: Locale;
  /** The Pariwar-Passport `locale_default` for the active tenant. */
  pariwarPassportLocale?: Locale;
  /** The raw `Accept-Language` request header, parsed as a last signal before fallback. */
  acceptLanguage?: string;
}

/**
 * Server-side locale resolver (AC1). Applies the EXACT precedence:
 *   sessionLocale → pariwarPassportLocale → Accept-Language → Hindi (`hi`) fallback.
 * A field is only honoured when it is a valid `Locale` (a malformed/absent rung is
 * skipped, never throws).
 */
export function getLocale(ctx: LocaleContext): Locale {
  if (isLocale(ctx.sessionLocale)) return ctx.sessionLocale;
  if (isLocale(ctx.pariwarPassportLocale)) return ctx.pariwarPassportLocale;
  const fromHeader = parseAcceptLanguage(ctx.acceptLanguage);
  if (fromHeader) return fromHeader;
  return DEFAULT_LOCALE;
}

// ── Client-side React context (the locale toggle surface) ─────────────────────────

/** The value exposed by `useLocale()`: the active locale + a setter for the client toggle. */
export interface LocaleState {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

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
  return createElement(LocaleReactContext.Provider, { value: { locale, setLocale } }, props.children);
}

/** Client hook: the active `Locale` + a setter. Throws if used outside a `LocaleProvider`. */
export function useLocale(): LocaleState {
  const state = useContext(LocaleReactContext);
  if (state === null) {
    throw new Error('[i18n] useLocale() must be used within a <LocaleProvider>');
  }
  return state;
}

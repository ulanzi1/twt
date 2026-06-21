// packages/i18n/src/locale.ts
//
// The Locale primitive + the locale-resolution surfaces (Story 2.1, AC1).
//
// SERVER-SAFE CORE (Story 2.5 `/react` subpath split): this module imports NO
// `react` — the locale primitive, `parseAcceptLanguage`, and the server-side
// `getLocale` resolver load in any context (Fastify, Astro SSR, edge, native,
// tests) without dragging React into the module graph. The client locale-toggle
// context (`LocaleProvider` / `useLocale`) moved to `./react.ts`, reachable via
// the `@twt/i18n/react` subpath export. `apps/public` Astro SSR (the first
// non-React server consumer) was the documented re-trigger for this split.
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
// imports NO HTTP framework.

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

/** The value exposed by `useLocale()`: the active locale + a setter for the client toggle. */
export interface LocaleState {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

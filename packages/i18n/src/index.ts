// @twt/i18n — the centralized i18n utility + bilingual surface contract (Story 2.1).
//
// Enforces the architectural-freeze row-10 bilingual contract ONCE at the utility
// level: member-visible surfaces default Hindi-primary; admin surfaces default
// English-primary; every member-visible string carries Hindi parity, verified by the
// build-time `i18n:check-parity` CI gate.
//
// SERVER-SAFE ROOT (Story 2.5 `/react` subpath split): the package root imports NO
// `react`. The client locale-toggle hooks (`LocaleProvider` / `useLocale` / `useT`)
// live behind the `@twt/i18n/react` subpath export — import them from there in React
// hosts. This lets the first non-React server consumer (`apps/public` Astro SSR) and
// `apps/api` (Fastify) import the package without dragging React into the module
// graph. `react` remains an OPTIONAL peer dep used only by the `/react` subpath.
//
// See README.md for: the surface-classification convention, the `{varName}` resolver
// token syntax, the amendment-A2 numeral discipline, and the `/react` subpath split.

// Locale primitive + server-side resolution (no React).
export type { Locale, LocaleContext, LocaleState } from './locale.js';
export {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  parseAcceptLanguage,
  getLocale,
} from './locale.js';

// Translation resolver (server-safe `t`). The React-bound `useT` is in ./react.ts.
export type { TranslateOptions, TranslateParams, BoundTranslate } from './resolver.js';
export { t } from './resolver.js';

// Numeral + currency utilities (amendment-A2).
export { toHindiNumeral, toGregorianNumeral } from './number.js';
export { formatCurrency } from './currency.js';

// Surface classification.
export type { SurfaceClass, ClassificationConfig } from './classification.js';
export {
  DEFAULT_SURFACE_CLASS,
  parseClassificationConfig,
  resolveClassification,
  declareSurface,
  classifyNamespace,
  getSurfaceClass,
  registeredSurfaces,
} from './classification.js';

// Catalog (namespace introspection; the resolver's data source).
export type { Catalog } from './catalog.js';
export { KNOWN_NAMESPACES, getCatalog } from './catalog.js';

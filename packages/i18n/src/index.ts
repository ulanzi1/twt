// @twt/i18n — the centralized i18n utility + bilingual surface contract (Story 2.1).
//
// Enforces the architectural-freeze row-10 bilingual contract ONCE at the utility
// level: member-visible surfaces default Hindi-primary; admin surfaces default
// English-primary; every member-visible string carries Hindi parity, verified by the
// build-time `i18n:check-parity` CI gate. Framework-agnostic core (no HTTP framework
// imports); `react` is an OPTIONAL peer dep used only by the locale context hooks.
//
// See README.md for: the surface-classification convention, the `{varName}` resolver
// token syntax, the amendment-A2 numeral discipline, and the server-consumer subpath
// caveat.

// Locale primitive + resolution + the React locale-toggle context.
export type { Locale, LocaleContext, LocaleState } from './locale.js';
export {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  parseAcceptLanguage,
  getLocale,
  LocaleProvider,
  useLocale,
} from './locale.js';

// Translation resolver.
export type { TranslateOptions, TranslateParams, BoundTranslate } from './resolver.js';
export { t, useT } from './resolver.js';

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

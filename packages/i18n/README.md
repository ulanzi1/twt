# `@twt/i18n` — centralized i18n utility + bilingual surface contract

The **single home** for translation, locale resolution, surface classification, and
numeral/currency formatting across every TWT surface (Story 2.1). It enforces the
**architectural-freeze row-10 bilingual contract once, at the utility level**, instead
of re-litigating it per surface:

- **member-visible surfaces default Hindi-primary;**
- **admin surfaces default English-primary;**
- **every member-visible string carries Hindi parity, verified by a build-time CI gate.**

`packages/i18n` is **framework-agnostic** at its core — it imports no HTTP framework
(`getLocale` takes a plain context object the caller assembles). `react` is an
**optional peer dependency** used only by the client locale-toggle hooks.

## Locale primitive

`Locale = 'hi' | 'en'` is defined **locally** here (i18n is a low-level shared package
usable from edge / public / native contexts, so it does **not** import `@twt/domain`).
It is value-aligned with the domain `localeEnum` (`pgEnum('locale', ['hi','en'])`) but
brand-aligned, not symbol-identical — the `PariwarId`-at-1.7 precedent. `DEFAULT_LOCALE`
is `hi` (member surfaces are Hindi-primary; it is also `getLocale`'s fallback).

## Translation — `t()` and `useT()`

Translation keys live as data files at `locales/{hi,en}/{domain}.json` (AC2). `t()`
resolves a key, interpolating params via **`{varName}` single-brace tokens**:

```ts
import { t } from '@twt/i18n';

t('welcome', undefined, { locale: 'en' }); // "Welcome"
t('welcome'); // "स्वागत है"  (defaults: locale=hi, namespace='common')
t('greeting', { name: 'Reena' }, { locale: 'en' }); // "Hello, Reena"
```

- **Token syntax:** `{name}`, `{amount}` — single braces, `\w+` names. A token with no
  matching param throws (loud-by-default), as does an unknown key or namespace. This is
  the strict loud-throw posture of the 1.17 `scripts/microcopy` parsers.
- **Defaults:** `options.locale` → `DEFAULT_LOCALE` (`hi`); `options.namespace` → `'common'`.

### In React — bind the active locale with `useT()`

`t()` is a plain function and cannot call a hook, so the AC's "defaults to `useLocale()`
result" is realized by **`useT()`** — a hook that binds the active context locale:

```tsx
import { LocaleProvider, useT, useLocale, getLocale } from '@twt/i18n';

// Server resolves the locale and seeds the provider (no hydration mismatch):
const initialLocale = getLocale({ sessionLocale, pariwarPassportLocale, acceptLanguage });

function App() {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <Welcome />
    </LocaleProvider>
  );
}

function Welcome() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return <button onClick={() => setLocale(locale === 'hi' ? 'en' : 'hi')}>{t('welcome')}</button>;
}
```

`useLocale()` is a **React context** hook (not a module-level singleton — a singleton
breaks SSR and causes Astro hydration mismatches). It works in both `apps/admin`
(React 19 + Vite) and `apps/mobile` (React Native + Tamagui) — both are React hosts.

### Server-side locale resolution — `getLocale(ctx)`

```ts
getLocale({ sessionLocale, pariwarPassportLocale, acceptLanguage });
```

Precedence (AC1): `sessionLocale` → `pariwarPassportLocale` → parsed `Accept-Language`
→ **Hindi (`hi`) fallback**. The **caller** resolves these from its framework (Fastify
request, Astro locals, …) and passes a plain object — `getLocale` imports no HTTP type.

> **Server consumers (re-trigger).** The client hooks (`LocaleProvider` / `useLocale` /
> `useT`) are re-exported from the package root, so importing `@twt/i18n` pulls `react`
> into the module graph. At v1 there are no consumers, so this is inert. **When the first
> non-React server consumer (e.g. `apps/api` for API copy/locale layering) imports the
> package, split the React hooks into a `@twt/i18n/react` subpath export** so the
> server-safe core (`t`, `getLocale`, numerals) loads without `react`. Tracked in
> `deferred-work.md`.

## Surface classification (AC4)

Each **namespace (domain)** is either **member-facing** (Hindi-primary; must carry full
Hindi parity) or **admin-facing** (may ship English-only). Classification is
**declarative and keyed by namespace, NOT by a hardcoded app-path allow-list** — there
is **no `apps/member` directory**; the member app is `apps/mobile` (with `apps/public` to
follow). The persisted source of truth is **`locales/classification.json`**, read by both
the runtime registry and the build-time parity gate so the two never drift:

```jsonc
{
  "default": "member-facing", // freeze row 10: member surfaces are Hindi-primary
  "namespaces": {} // admin-facing overrides go here; empty at v1
}
```

- **Default = member-facing.** A namespace is parity-enforced unless explicitly declared
  admin-facing. `common` defaults member-facing and is parity-enforced **now** (teeth).
- **Declare on import** for runtime surfaces: `declareSurface('reports', 'admin-facing')`.
- **App → class mapping today:** `apps/admin` = admin-facing; `apps/mobile` (+ future
  `apps/public` member pages, `apps/member-web`) = member-facing.
- `namespaces` is empty at v1 (no admin-only namespace yet) — mirrors the `microcopy.yaml`
  empty `copy_globs` pattern: green-with-teeth + forward-compat.

## Build-time parity gate (AC3 / AC5)

`scripts/check-parity.ts` (pure core in `scripts/lib.ts`, the 1.17 lib-vs-check split)
asserts:

1. every key in `en/<ns>` has a **non-empty** `hi/<ns>` parity entry …
2. … for **member-facing** namespaces (they cannot ship a string missing Hindi);
3. **admin-facing** namespaces may ship English-only.

On a violation it **names the offending file + key** and exits non-zero:

```text
✗ locales/hi/common.json :: key 'teeth_probe' — member-facing namespace 'common' has key 'teeth_probe' in en/ but its Hindi parity entry is MISSING
```

```sh
pnpm --filter @twt/i18n i18n:check-parity   # run locally
pnpm i18n:check                              # turbo passthrough (the CI gate)
```

The `i18n-parity` CI job runs it; it is also registered in `scripts/ci-local.sh` (the
active merge gate while GitHub Actions is suspended).

### Adding a domain

1. Add the `{hi,en}/<domain>.json` pair (Hindi values must be real Devanagari).
2. Register it in `src/catalog.ts` (two import lines + two registry lines — explicit,
   no magic glob).
3. The parity gate then enforces Hindi parity on the new domain automatically. Declare it
   admin-facing in `classification.json` only if it is English-only by design.

## Numeral & currency utilities (AC6) — amendment-A2 discipline

```ts
import { toHindiNumeral, toGregorianNumeral, formatCurrency } from '@twt/i18n';

toHindiNumeral(2026); // "२०२६"
toGregorianNumeral('२०२६'); // "2026"
formatCurrency(4588000, 'en'); // "₹ 45,88,000"   (Indian lakh/crore grouping)
formatCurrency(4588000, 'hi'); // "₹ ४५,८८,०००"   (ceremonial only — see below)
```

**Amendment-A2 (operational vs ceremonial) — the documented contract these utilities
encode:**

- **Operational data → Gregorian + Latin numerals.** Every count, amount, date, UTR,
  ledger column, stat-strip value — **even on memorial pages** (`14,800 सहयोगियों`,
  `₹ 45,88,000`, `Born: 1962 · Passed: 2026`). Format operational currency with
  `formatCurrency(amount, 'en')` even inside a Hindi UI.
- **Ceremonial / memorial Devanagari _prose_ → Hindi numerals (०-९) permitted.** Reserved
  **exclusively** for memorial Devanagari narrative on the Shradhanjali surface (e.g.
  `३४ वर्षों की सेवा`). This is the only place `toHindiNumeral` / `formatCurrency(_, 'hi')`
  are appropriate.
- **Never mixed at the same hierarchy level** within one row/label/stat-value — one
  numeral system per element.
- **Components must consume these primitives, not hand-roll formatting** (the
  `scripts/microcopy` gate flags inline numeral formatting; `packages/i18n` is its
  sanctioned home).

## Scope (locked at create-story)

This story lands the binding epics ACs (AC1–AC5) **plus** the three named numeral/currency
functions (AC6, the `deferred-work.md` L22 re-trigger). The broader architecture §4328
modules — `date.ts`, `relative-time.ts`, `pluralize.ts`, `actor-class-register.ts`,
`per-pariwar/` string overlays — are **explicitly deferred** to their first consuming
surface (see `deferred-work.md`).

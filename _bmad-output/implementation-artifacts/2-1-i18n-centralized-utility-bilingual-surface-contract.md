# Story 2.1: i18n Centralized Utility (`packages/i18n`) + Bilingual Surface Contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder and every consumer epic that ships a member-facing surface,
I want a centralized i18n utility in `packages/i18n` that enforces the bilingual surface contract — member-visible surfaces default Hindi-primary; admin surfaces default English-primary; every member-visible string carries Hindi parity, verified by a CI gate,
so that the architectural-freeze bilingual contract (freeze-table row 10) is enforced once at the utility level, not re-litigated per surface.

## Acceptance Criteria

**AC1 — Resolver + locale hooks (epics.md L1415).**
Given AR-59 + FR-68 + FR-80 + architectural-freeze row 10, when `packages/i18n` is authored, then the utility exposes:
- `t(key, params, options)` — translation resolver with **locale** + **namespace (domain)** support; interpolates `params` using `{varName}` single-brace syntax (e.g. `{name}`, `{amount}`); `options: { locale?: Locale; namespace?: string }` (both optional — defaults to `useLocale()` result and `'common'` respectively).
- `useLocale()` — client-side React context hook returning the active `Locale` and a setter for the client toggle. Implemented as a React context + `useContext` hook so it works in both `apps/admin` (React 19 + Vite) and `apps/mobile` (React Native + Tamagui). Add `react` as a **peer** dep (not bundled) — do not pull a heavy i18n runtime (no `i18next`/`react-intl`); do **not** use a module-level singleton (breaks SSR and causes hydration issues in Astro Story 2.5+).
- `getLocale(ctx)` — server-side resolver typed as `getLocale(ctx: { sessionLocale?: Locale; pariwarPassportLocale?: Locale; acceptLanguage?: string }): Locale`, applying this **exact precedence**: `ctx.sessionLocale` → `ctx.pariwarPassportLocale` → parse `ctx.acceptLanguage` → **Hindi (`hi`) fallback**. The **caller** resolves these values from their framework (Fastify request, Astro locals, etc.) and passes them in as a plain object; `getLocale` does **not** import Fastify or any HTTP framework type — `packages/i18n` must remain framework-agnostic.

**AC2 — Per-domain locale storage (epics.md L1416).**
Translation keys are organized per domain in `packages/i18n/locales/{hi,en}/{domain}.json`.

**AC3 — Build-time parity validator (epics.md L1417).**
A build-time validator asserts all of:
1. every key present in `en/` has a Hindi parity entry in `hi/` (same key, non-empty value);
2. surfaces declared **member-facing** cannot ship a string missing Hindi;
3. surfaces declared **admin-facing** may ship English-only.

**AC4 — Surface-classification convention documented (epics.md L1418).**
The surface-classification convention is documented: member-facing surfaces default Hindi-first; admin-facing surfaces default English-first; **consumer surfaces declare their classification on import** (a classification registry, not a hardcoded app-path list — see Dev Notes "apps/member does not exist").

**AC5 — CI fails on missing Hindi parity (epics.md L1420-1422).**
Given a member-facing surface adds a new key only to `en/`, when CI runs the build-time validator, then CI **fails naming the missing Hindi parity entry** (file + key). The gate runs as a turbo task wired into `.github/workflows/ci.yml` **and** `scripts/ci-local.sh` (the active merge gate while GitHub Actions is suspended — see Dev Notes).

**AC6 — Numeral/currency utilities + amendment-A2 discipline (architecture.md §4328, UX-spec L691-698, deferred-work L22 re-trigger).**
`packages/i18n` lands the centralized numeral/currency formatting utilities that Story 1.17 forward-deferred to this story:
- `toHindiNumeral(n)` / `toGregorianNumeral(n)` — Devanagari ↔ Latin numeral conversion.
- `formatCurrency(amount, locale)` — `₹` rendering with locale-aware numerals + **Indian (lakh/crore) digit grouping**.
- The amendment-A2 operational-vs-ceremonial split is encoded as the documented contract for these utilities (operational data → Latin; ceremonial/memorial Devanagari prose → Hindi numerals permitted). See Dev Notes for the exact rule.
- The Story 1.17 microcopy gate's "inline numeral formatting outside the utility" note tightens: `packages/i18n` is the sanctioned home; the deferred-work numeral-utility leg flips **Resolved-via-deferral → Closed-by-edit**.

> **Scope boundary (locked at create-story — see Dev Notes "Scope decisions"):** AC1–AC5 are the binding epics ACs and are P0. AC6 is included because deferred-work.md L22 names *this* story as the explicit re-trigger and the 1.17 microcopy gate is waiting on it (honoring the project's "no un-gated commitment decays" discipline). The **broader** architecture §4328 modules (`date.ts`, `relative-time.ts`, `pluralize.ts`, `actor-class-register.ts`, `per-pariwar/` string overlays) remain **explicitly deferred** to their first consuming surface — do NOT build them here.

## Tasks / Subtasks

- [x] **Task 1 — Package scaffold + Locale type + resolver core (AC1, AC2)**
  - [x] Create the `src/` file layout matching architecture §4328: `src/locale.ts` (Locale type + `getLocale` + `LocaleProvider` + `useLocale`), `src/resolver.ts` (`t()`), `src/number.ts` (`toHindiNumeral` / `toGregorianNumeral`), `src/currency.ts` (`formatCurrency`), `src/classification.ts` (surface classification registry), `src/index.ts` (re-exports of all public API). Do **not** collapse into a single `index.ts` file.
  - [x] Replace the `packages/i18n` PR-1 stub (`src/index.ts` is `export {};`) with the real surface. Keep the existing `@twt/i18n` package.json conventions (`"type": "module"`, `"main": "./src/index.ts"`, `build`/`lint`/`typecheck`/`test`/`dev` scripts, `vitest`/`typescript`/`@types/node`/`@twt/eslint-config-twt` devDeps). Also add `"exports": { ".": "./src/index.ts" }` to match the `@twt/tokens` pattern — required for ESM workspace resolution. Existing `vitest.config.ts` and `eslint.config.js` are already present; keep them unchanged.
  - [x] Define `Locale = 'hi' | 'en'` **locally** in `packages/i18n` (`src/locale.ts`). Do NOT import `@twt/domain` (i18n is a low-level shared package usable from edge/public/native contexts; domain is the DB layer). The local type is value-aligned with `localeEnum = pgEnum('locale', ['hi','en'])` (`packages/domain/src/schema/pariwar_passport.ts:54`) but not symbol-identical — same brand-alignment precedent as `PariwarId` at Story 1.7.
  - [x] Implement `t(key, params, options)` in `src/resolver.ts`: resolve `locales/{locale}/{namespace}.json` → key; interpolate `params` using **`{varName}` single-brace syntax** (e.g. `"नमस्ते, {name}"` → `t('greeting', { name: 'Reena' })`) — document this token syntax in README; on missing key, behavior must be loud-by-default in dev (throw or return a flagged sentinel) — mirror the "strict loud-throw" posture of `scripts/microcopy/` config parsing (1.17). Type the function: `t(key: string, params?: Record<string, string | number>, options?: { locale?: Locale; namespace?: string }): string`.
  - [x] Implement `getLocale(ctx: { sessionLocale?: Locale; pariwarPassportLocale?: Locale; acceptLanguage?: string }): Locale` in `src/locale.ts` with the AC1 precedence chain; unit-test each precedence rung incl. the `hi` fallback when all inputs are absent/undefined.
  - [x] Implement `useLocale()` client hook in `src/locale.ts` as a **React context + hook** (`React.createContext<{ locale: Locale; setLocale: (l: Locale) => void }>` + `useContext`). Export `LocaleProvider` wrapper and `useLocale` hook. Add `react` as a **peer** dep in `package.json` (`"peerDependencies": { "react": ">=18" }`). This works across both `apps/admin` (React 19 web) and `apps/mobile` (RN + Tamagui) — both are React hosts. Do **not** use a module-level locale singleton (breaks SSR).
- [x] **Task 2 — Per-domain locale storage + seed (AC2)**
  - [x] Create `packages/i18n/locales/hi/` and `packages/i18n/locales/en/` with at least one real domain JSON each (e.g. `common.json`) proving the `{hi,en}/{domain}.json` shape and the resolver end-to-end. Hindi values must be real Devanagari, not placeholders.
- [x] **Task 3 — Surface-classification registry (AC4)**
  - [x] Implement the classification mechanism: consuming surfaces declare `member-facing` | `admin-facing` **on import** (a typed registry/config, NOT a hardcoded app-path allow-list — `apps/member` does not exist; see Dev Notes). At v1 there are no member consumers, so the registry initializes effectively empty (forward-compat, green-with-teeth — mirror the `microcopy.yaml` empty `copy_globs` pattern).
  - [x] Document the convention in `packages/i18n/README.md` (member-facing → Hindi-first; admin-facing → English-first; how a surface declares classification; which real apps map to which class today: `apps/admin` = admin-facing; `apps/mobile` + future `apps/public`/`apps/member-web` = member-facing).
- [x] **Task 4 — Build-time parity validator (AC3, AC5)**
  - [x] Author `packages/i18n/scripts/check-parity.ts` (pure verification core + impure entry, mirroring `packages/tokens/scripts/check-theme-determinism.ts` and `scripts/microcopy/` lib-vs-check split). It must: (1) assert every `en/<domain>` key has a non-empty `hi/<domain>` parity entry; (2) enforce the member-facing-cannot-ship-missing-Hindi rule against the classification registry; (3) allow admin-facing English-only.
  - [x] On failure, **name the offending file + key** (AC5). Exit non-zero. Green-with-teeth: prove teeth end-to-end (add an `en`-only key → exit 1 naming it → remove → exit 0, tree clean), exactly as 1.17 proved the microcopy/theme gates.
  - [x] Add `tsx` devDep to `packages/i18n/package.json` (the stub does not have it; the tokens gate added it the same way) and an `i18n:check-parity` package script (`tsx scripts/check-parity.ts`).
  - [x] Add unit tests (`vitest`) for the pure validator core (parity hit/miss, member-vs-admin classification, empty-registry no-op).
- [x] **Task 5 — Numeral/currency utilities (AC6)**
  - [x] Implement `toHindiNumeral(n)` / `toGregorianNumeral(n)` / `formatCurrency(amount, locale)` (Indian lakh/crore grouping; `₹`). Encode the amendment-A2 operational-vs-ceremonial contract in code comments + README + tests (operational → Latin; ceremonial Devanagari prose → Hindi numerals permitted; never mixed at the same hierarchy level).
  - [x] Tighten the Story 1.17 microcopy numeral note: confirm `packages/i18n` as the sanctioned home for numeral formatting; update `deferred-work.md` L22 leg to **Closed-by-edit** (and L24 broad-member-enforcement re-trigger if member `copy_globs` are touched — they are not at 2.1). Do NOT widen the microcopy gate's `copy_globs` here (no member surfaces yet).
  - [x] Unit-test conversions + currency grouping + the A2 register rule.
- [x] **Task 6 — CI wiring (AC5)**
  - [x] Add an `i18n:check-parity` task to `turbo.json` `tasks` (no `dependsOn`, `inputs` = `locales/**`, `scripts/**/*.ts`, `src/**/*.ts`, `package.json`, `../../pnpm-lock.yaml`; empty `outputs`) — mirror `tokens:check-theme-determinism`.
  - [x] Add a root passthrough script to root `package.json` (e.g. `"i18n:check": "turbo run i18n:check-parity"`), mirroring `tokens:check-theme`.
  - [x] Add an `i18n-parity` job to `.github/workflows/ci.yml`: insert it **between `tokens-theme-check:` (currently ending at line ~213) and `pii-scrape:` (currently at line ~214)**. Mirror the `tokens-theme-check` job structure: `needs: install`, `pnpm install --frozen-lockfile`, `pnpm turbo run i18n:check-parity`.
  - [x] Register the new job in `scripts/ci-local.sh`: insert `run "i18n-parity" "pnpm turbo run i18n:check-parity"` **immediately after the `tokens-theme-check` line (currently line 43)** and before `pii-scrape`. Update the header comment on line 13 from "13 static jobs" → "14 static jobs". **This is the actual merge gate** — GitHub Actions is suspended; `pnpm ci:local` is the gate (memory: CI Actions suspension + local mirror).
- [x] **Task 7 — Governance + verification**
  - [x] Author/extend an ADR if the resolver runtime choice or the Locale-type-locality decision is substantive (the create-story locked the locality + storage-shape decisions; record them where ADRs for substrate choices live — next ADR number = **ADR-0018** (current count is 135 rows after ADR-0017 added 2026-06-20); follow the 1.17/ADR-0016 brand-new-row precedent in `docs/knowledge-transfer/adr-index.md` Section A).
  - [x] Update `deferred-work.md`: numeral-utility leg (L22) → Closed-by-edit; add explicit deferrals (with re-triggers) for the architecture §4328 modules NOT built here (`date.ts`, `relative-time.ts`, `pluralize.ts`, `actor-class-register.ts`, `per-pariwar/` overlays) — each re-triggers at its first consuming surface. Apply [[feedback_closure_language_precision]].
  - [x] Update `.github/workflows/ci.yml` microcopy job comment (line 371): replace "inline locale formatting must route through packages/i18n **at Story 2.1**" with "packages/i18n is the sanctioned home for locale/numeral formatting (Story 2.1 landed)" — closing the forward-reference that was parked there at Story 1.17.
  - [x] Run `pnpm ci:local` green (lint/typecheck/build/test + all gates incl. the new `i18n-parity`). No live DB needed for this story.

### Review Findings

- [x] [Review][Patch] P1: `parseAcceptLanguage` doesn't filter `q=0` (RFC 9110 not-acceptable) tags — a header like `hi;q=0` means "never give me Hindi" but current code may still return `'hi'` [`packages/i18n/src/locale.ts:56`]
- [x] [Review][Patch] P2: `formatCurrency` produces garbage for amounts ≥ 1e21 — `toFixed(2)` switches to scientific notation, `groupIndian` then corrupts the output (e.g. `"1e,+21"`) [`packages/i18n/src/currency.ts:43`]
- [x] [Review][Patch] P3: `useT()` / `useLocale()` / `LocaleProvider` have no unit tests — the AC1 "defaults to `useLocale()` result" leg (realized by `useT()`) is untested; requires `@testing-library/react` `renderHook` setup [`packages/i18n/tests/`]
- [x] [Review][Patch] P4: ADR-0018 preamble entry and table row inserted before ADR-0017 instead of after — breaks the append-after-latest convention established by ADR-0016/0017; row-count chain reads 133→136→135→134 instead of monotone ascending [`docs/knowledge-transfer/adr-index.md:37,92`]
- [x] [Review][Patch] P5: ADR status summary table not updated after adding ADR-0018 — `drafted: 14` should be `drafted: 15`; `Total: 135` should be `Total: 136` [`docs/knowledge-transfer/adr-index.md:22,26`]
- [x] [Review][Patch] P6: ci.yml microcopy comment has spurious double closing paren `))` after the Task-7 edit — `(Story 2.1 landed))` has one unmatched `)` [`.github/workflows/ci.yml:398`]
- [x] [Review][Defer] D1: React import at module top level means any import of `@twt/i18n` (even `getLocale`, `t`) loads React in server/edge contexts — explicitly acknowledged in spec + README; `@twt/i18n/react` subpath split deferred to first non-React server consumer [`packages/i18n/src/locale.ts:20`] — deferred, pre-existing (by design, re-trigger in deferred-work.md)
- [x] [Review][Defer] D2: Parity gate only checks en→hi direction; orphaned hi-only keys (no English counterpart) are silently ignored [`packages/i18n/scripts/lib.ts:39-61`] — deferred, pre-existing (beyond AC3 scope)
- [x] [Review][Defer] D3: `toGregorianNumeral` indexOf returns -1 if a character matches `[०-९]` regex but isn't in HINDI_DIGITS array — impossible in current Unicode (U+0966–U+096F maps exactly); simple guard: `idx === -1 ? d : String(idx)` [`packages/i18n/src/number.ts:33`] — deferred, pre-existing (theoretical fragility)
- [x] [Review][Defer] D4: Module-level `registry` Map in `classification.ts` creates test-ordering sensitivity — `declareSurface` mutations persist across tests in the same Vitest worker; latent risk as test suite grows [`packages/i18n/src/classification.ts:77-78`] — deferred, pre-existing
- [x] [Review][Defer] D5: `useT()` returns a new closure on every render with no `useCallback` stabilization — causes unnecessary re-renders for children receiving it as a prop; performance concern only, no correctness impact [`packages/i18n/src/resolver.ts:82-84`] — deferred, pre-existing
- [x] [Review][Defer] D6: No escape mechanism for rendering a literal `{word}` token in a translation string — `{varName}` syntax is always interpolated; a template needing a literal brace has no supported workaround [`packages/i18n/src/resolver.ts:32`] — deferred, pre-existing (design choice for v1)
- [x] [Review][Defer] D7: Gate teeth proven manually only; no automated subprocess test asserting `check-parity.ts` exits 1 on a broken locale tree and 0 on a clean one — pure `lib.ts` core teeth are unit-tested; subprocess automation deferred [`packages/i18n/tests/`] — deferred, pre-existing

## Dev Notes

### Scope decisions (LOCKED at create-story)

1. **Locale storage shape = epics AC, not architecture §4328.** The binding AC (epics.md L1416) commits `locales/{hi,en}/{domain}.json` (data-file translation catalog). Architecture §4328 (architecture.md:4328-4340) sketches `src/strings/` + per-module formatters — that is the *broader vision* for the package, not the storage contract. **The AC wins for translation storage.** The §4328 *formatter modules* are additive and partially in scope (AC6) / partially deferred (Task 7).
2. **Numeral utilities (AC6) ARE in scope.** deferred-work.md L22 names "**Story 2.1 lands `packages/i18n`**" as the explicit re-trigger for `toHindiNumeral`/`toGregorianNumeral`/`formatCurrency`, and the 1.17 microcopy gate's inline-numeral check is forward-compat'd to "tighten once 2.1 lands the utility." Landing `packages/i18n` *without* them would fire the trigger unfulfilled — exactly the "un-gated commitment decays" failure the Epic 1 retro flagged. So they ship here, bounded to the three named functions.
3. **Broader §4328 modules are OUT of scope** (`date.ts`, `relative-time.ts`, `pluralize.ts`, `actor-class-register.ts`, `per-pariwar/`). No surface consumes them yet; building them now is premature plumbing. Defer with explicit per-surface re-triggers (Task 7).
4. **`i18n` does not depend on `@twt/domain`.** Define `Locale` locally; value-aligned with the domain `localeEnum`, brand-aligned not symbol-identical (PariwarId-at-1.7 precedent).

> If BigDev wants AC6 (numerals) carved back out into its own story, that is the one scope lever worth flagging — see the closing summary. Everything else is binding-AC or architecture-committed.

### ⚠️ `apps/member` does NOT exist — disaster-prevention note

The epics AC (L1418) literally says "`apps/member` defaults Hindi-first." **There is no `apps/member` directory.** Actual `apps/`: `admin`, `api`, `jobs`, `mobile`, `public`. The member-facing app is **`apps/mobile`** (Expo + RN + Tamagui, architecture.md:2472); `apps/public` (Astro SSR, lands Story 2.5) is also member-facing; `apps/member-web` is a *deferred future SSR split* (architecture.md:481-482), not present. **Do NOT create an `apps/member` directory.** Implement classification as a **registry surfaces declare on import** (AC4), so the rule is "by classification," not "by hardcoded path." Mapping today: `apps/admin` → admin-facing; `apps/mobile` (+ future `apps/public` member pages) → member-facing.

### Existing-code state (read before editing)

- `packages/i18n/src/index.ts` — current PR-1 placeholder: `export {};` (`packages/i18n/src/index.ts:1-4`). The header comment points here ("substantive content lands in downstream Epic 1 / 2+ stories"). Replace it.
- `packages/i18n/tests/smoke.test.ts` — trivial import smoke test; keep or absorb into real tests.
- `packages/i18n/package.json` — stub to extend: has `"type": "module"`, `"main": "./src/index.ts"`, standard scripts, `vitest`/`typescript`/`@types/node`/`@twt/eslint-config-twt` devDeps. Missing vs tokens: no `tsx` devDep, no `exports` field, no `peerDependencies`. All three are added in Task 1.
- `packages/i18n/vitest.config.ts`, `packages/i18n/eslint.config.js`, `packages/i18n/tsconfig.json` — already present (identical structure to tokens); keep unchanged.
- **Convention reference = `packages/tokens`** (Story 1.17, the most recent and most similar package): `"exports": { ".": "./src/index.ts" }` field + `scripts/` gate + turbo task + ci job + root passthrough + `tsx` devDep + `README.md` + `tests/`. Copy its shape for the parity gate. (`packages/tokens/package.json`, `packages/tokens/scripts/check-theme-determinism.ts`, `packages/tokens/tsconfig.json`.)
- `packages/domain/src/schema/pariwar_passport.ts:54,86` — `localeEnum = pgEnum('locale', ['hi','en'])` + `localeDefault` column; `packages/domain/src/pariwar-passport/write.ts:50` reads `localeDefault`. This is what `getLocale`'s "Pariwar-Passport `locale_default`" rung consumes (caller-supplied).

### Amendment-A2 numeral discipline (the rule AC6 encodes)

From UX-spec L1119-1127 + L1156-1158 + architecture.md:286-288:
- **Operational data → Gregorian + Latin numerals.** Yogdaan Bahi date/amount columns, Sahyog List, transaction tables, UTRs, search/filter inputs, member directory, Panchayat Noticeboard stat-strip **and its FR-19 celebration framing** (the earlier ceremonial carve-out for Noticeboard celebration is **closed** — all Latin). Even on memorial pages: standalone counts/amounts/dates are Latin (`14,800 सहयोगियों`, `₹ 45,88,000`, `Born: 1962 · Passed: 2026`).
- **Ceremonial/memorial Devanagari *prose* → Hindi numerals (०-९) permitted.** Reserved **exclusively** for memorial Devanagari narrative on the Shradhanjali surface (e.g. `३४ वर्षों की सेवा` embedded in prose), header memorial dates, ceremonial inscription text.
- **Never mixed at the same hierarchy level** within a single row/label/stat-value — one numeral system per element. Mixed-register *surfaces* are allowed only where the split is clean per-element.
- The utility provides the conversion + currency primitives; **components must consume them, not hand-roll formatting** (UX-spec L698). The microcopy gate already flags inline numeral formatting; `packages/i18n` is now the sanctioned home.

### CI gate pattern (follow exactly)

Two gate patterns exist in-repo: package-local turbo tasks (`db:check`, `contracts:check-*`, `crypto:check`, `tokens:check-theme-determinism`) and repo-root script gates (`friction`/`schema`/`benefit`/`microcopy`/`cadence`). The parity validator operates primarily on `packages/i18n/locales/**`, so it is **package-local** — model it on `tokens:check-theme-determinism` precisely: package script → `turbo.json` task → root passthrough → `ci.yml` job → `ci-local.sh` registration. ci.yml current jobs (in order): install, lint, typecheck, test, build, db-check, contracts-check, crypto-check, tokens-theme-check, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, cadence-check, integration-tests. Add `i18n-parity` alongside the static gates.

### Testing standards

- `vitest` (`vitest run --passWithNoTests` is the package `test` script). Pure-core + thin-impure split so the validator core is unit-testable without filesystem/CI (the 1.17 lib-vs-check pattern). Prove gate teeth end-to-end (en-only key → exit 1 naming it → fixed → exit 0, tree clean). No live DB required.

### Project Structure Notes

- New `src/` files (architecture §4328 file-per-concern layout):
  - `packages/i18n/src/locale.ts` — `Locale` type, `getLocale(ctx)`, `LocaleProvider`, `useLocale()`
  - `packages/i18n/src/resolver.ts` — `t(key, params, options)` with `{varName}` interpolation
  - `packages/i18n/src/number.ts` — `toHindiNumeral(n)`, `toGregorianNumeral(n)`
  - `packages/i18n/src/currency.ts` — `formatCurrency(amount, locale)` with lakh/crore grouping
  - `packages/i18n/src/classification.ts` — surface classification registry
  - `packages/i18n/src/index.ts` — re-exports of all public API (replaces `export {}` stub)
- New: `packages/i18n/locales/{hi,en}/*.json`, `packages/i18n/scripts/check-parity.ts`, `packages/i18n/README.md`
- Modified: `packages/i18n/package.json` (+`tsx` devDep, +`i18n:check-parity` script, +`exports` field, +`peerDependencies.react`), `turbo.json` (+task), root `package.json` (+passthrough), `.github/workflows/ci.yml` (+`i18n-parity` job between `tokens-theme-check` and `pii-scrape`, +microcopy comment update at line 371), `scripts/ci-local.sh` (+`i18n-parity` after `tokens-theme-check`, header "13"→"14" static jobs), `deferred-work.md` (closures + new deferrals), `docs/knowledge-transfer/adr-index.md` (+ADR-0018 slot if authored).
- **Unchanged:** `packages/i18n/vitest.config.ts`, `packages/i18n/eslint.config.js`, `packages/i18n/tsconfig.json`, `packages/i18n/tests/smoke.test.ts` (keep or absorb into real tests).
- **Variance from architecture §4328 (intentional, documented above):** storage shape is `locales/{hi,en}/{domain}.json` (AC) not `src/strings/`; only the three named formatters land, not the full §4328 module set.

### References

- Story + ACs: [Source: epics.md#Story-2.1 (L1405-1422)]; Epic 2 framing [Source: epics.md L1385-1403].
- Freeze row 10 (bilingual contract): [Source: epics.md L527] + Frozen-properties preamble L510-512.
- i18n-at-the-core principle: [Source: architecture.md L286-288]; package structure [Source: architecture.md L4328-4340]; API copy/locale layering [Source: architecture.md L1833-1834]; per-state copy + actor-class register [Source: architecture.md L2867-2870]; `apps/mobile` member app [Source: architecture.md L2472, L481-482, L525-537].
- UX i18n utilities + numeral discipline: [Source: ux-design-specification.md L691-698, L712-717, L1119-1127, L1156-1158].
- Pariwar-Passport locale: [Source: packages/domain/src/schema/pariwar_passport.ts:54,86].
- Deferred-work re-triggers: numeral utilities [Source: deferred-work.md L22]; broad member enforcement [Source: deferred-work.md L24]; 0.10/0.11 accessibility+register secondary-consumer notes [Source: deferred-work.md L640, L672].
- Gate/CI conventions: [Source: turbo.json], [Source: .github/workflows/ci.yml], [Source: scripts/ci-local.sh], [Source: package.json], [Source: packages/tokens/* (1.17 precedent)].
- Memory: [[project_ci_actions_suspension_local_mirror]] (ci:local is the gate), [[feedback_closure_language_precision]] (closed-by-edit vs resolved-via-deferral), [[feedback_record_unattested_no_backfill]] (un-gated commitments decay → re-commitments need a gate), [[feedback_architecture_vs_prd_boundary]] (Hindi-first posture = PRD policy; parity contract = architectural — freeze row 10 note).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — BMAD dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/i18n typecheck` — clean.
- `pnpm --filter @twt/i18n test` — 42 tests passed (7 files).
- `pnpm --filter @twt/i18n lint` — clean.
- Parity gate teeth proven end-to-end: injected an `en`-only key → `i18n:check-parity` exit 1 naming `locales/hi/common.json :: key 'teeth_probe' … MISSING` → key removed → exit 0, tree clean.
- `pnpm ci:local` — **PASSED, 15 static jobs green** (incl. the new `i18n-parity`); `integration-tests` SKIPPED (no live DB needed for this story).

### Completion Notes List

- **AC1** — `src/locale.ts`: `Locale` defined locally (no `@twt/domain` import; value-aligned with `localeEnum`, brand-aligned not symbol-identical). `getLocale(ctx)` precedence `sessionLocale → pariwarPassportLocale → Accept-Language → hi` (each rung unit-tested incl. the fallback + malformed-rung skip); framework-agnostic (plain caller-assembled context, no HTTP import). `useLocale`/`LocaleProvider` = React context + hook (no module singleton; SSR/hydration-safe), `react` an **optional** peer dep. `src/resolver.ts`: `t(key, params, options)` with `{varName}` single-brace interpolation, loud-by-default throws (unknown namespace/key, missing param); `useT()` binds the context locale (a plain function cannot call a hook — the AC's "defaults to useLocale()" realized via the hook).
- **AC2** — `locales/{hi,en}/common.json` (real Devanagari, full parity); `src/catalog.ts` static-import catalog (works in Node/Vite/Metro/Astro-SSR, no runtime `fs`, no `i18next`/`react-intl`).
- **AC3/AC5** — `scripts/lib.ts` (pure `checkParity`) + `scripts/check-parity.ts` (impure entry), the 1.17 lib-vs-check split. Asserts en→hi non-empty parity for member-facing namespaces; admin-facing may ship English-only. Names file+key, exits non-zero. Wired: `turbo.json` `i18n:check-parity` task → root `i18n:check` passthrough → `i18n-parity` ci.yml job (between `tokens-theme-check` and `pii-scrape`) → `scripts/ci-local.sh`.
- **AC4** — `src/classification.ts` + `locales/classification.json`: declarative, namespace-keyed registry (member-facing default per freeze row 10), NOT an app-path allow-list (`apps/member` does not exist). `declareSurface` on import (idempotent; conflict throws). Convention documented in `README.md`.
- **AC6** — `src/number.ts` (`toHindiNumeral`/`toGregorianNumeral`) + `src/currency.ts` (`formatCurrency`, hand-rolled Indian lakh/crore grouping, `₹`). Amendment-A2 operational-vs-ceremonial split encoded in comments + README + tests (`formatCurrency(_, 'en')` for operational figures even in a Hindi UI; `'hi'` reserved for ceremonial prose). `deferred-work.md` L22 leg flipped **Resolved-via-deferral → Closed-by-edit** + annotated inline; the `ci.yml` microcopy comment updated to name `packages/i18n` as the sanctioned home (Story 2.1 landed).
- **Governance (Task 7)** — ADR-0018 authored (`docs/adr/`) + Section A row + summary line + Section-A count (36→37) in `adr-index.md`. `deferred-work.md`: Story 2.1 section (Closed-by-edit deliverables + L22 closure + explicit deferrals for the broader §4328 modules `date.ts`/`relative-time.ts`/`pluralize.ts`/`actor-class-register.ts`/`per-pariwar/` and the `@twt/i18n/react` subpath split, each with a re-trigger).
- **Scope notes / variances** — (1) Storage shape follows the epics AC (`locales/{hi,en}/{domain}.json`), an intentional documented variance from architecture §4328 `src/strings/`. (2) `scripts/ci-local.sh` static-job header was stale: it read "13" although `cadence-check` (AI-1, post-create-story) had already made it 14; the story's "13→14" instruction was honored in spirit but the count was corrected to the **accurate 15** (i18n-parity = the 15th static job; integration-tests = 16th) per the project's accuracy-over-appearance discipline. (3) The React hooks are typecheck/lint-verified but not unit-tested (no React renderer dep added — none specified by the story; the pure/server-safe surface is fully tested at 42 cases). (4) `apps/member` deliberately NOT created. (5) microcopy `copy_globs` deliberately NOT widened (no member surface ships locale strings yet — the L24 re-trigger is intentionally not fired).

### File List

**New (`packages/i18n`):**
- `packages/i18n/src/locale.ts`
- `packages/i18n/src/resolver.ts`
- `packages/i18n/src/catalog.ts`
- `packages/i18n/src/number.ts`
- `packages/i18n/src/currency.ts`
- `packages/i18n/src/classification.ts`
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/hi/common.json`
- `packages/i18n/locales/classification.json`
- `packages/i18n/scripts/lib.ts`
- `packages/i18n/scripts/check-parity.ts`
- `packages/i18n/README.md`
- `packages/i18n/tests/locale.test.ts`
- `packages/i18n/tests/resolver.test.ts`
- `packages/i18n/tests/number.test.ts`
- `packages/i18n/tests/currency.test.ts`
- `packages/i18n/tests/classification.test.ts`
- `packages/i18n/tests/parity.test.ts`

**New (governance):**
- `docs/adr/ADR-0018-i18n-centralized-utility-bilingual-contract.md`

**Modified:**
- `packages/i18n/src/index.ts` (replaced the `export {}` stub with the full re-export surface)
- `packages/i18n/package.json` (+`exports`, +`peerDependencies.react` (optional), +`tsx`/`react`/`@types/react` devDeps, +`i18n:check-parity` script)
- `turbo.json` (+`i18n:check-parity` task)
- `package.json` (+`i18n:check` root passthrough)
- `.github/workflows/ci.yml` (+`i18n-parity` job; microcopy job comment updated to name `packages/i18n` as the sanctioned home)
- `scripts/ci-local.sh` (+`i18n-parity` run line; static-job count corrected to 15/16th)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 2.1 section + L22 inline closure annotation)
- `docs/knowledge-transfer/adr-index.md` (Section A ADR-0018 row + summary line + Section-A count 36→37)
- `pnpm-lock.yaml` (new i18n devDeps)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (2.1 → in-progress → review + ledger entry)

**Kept unchanged (per Dev Notes):** `packages/i18n/vitest.config.ts`, `packages/i18n/eslint.config.js`, `packages/i18n/tsconfig.json`, `packages/i18n/tests/smoke.test.ts`.

## Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Story 2.1 implemented: `packages/i18n` centralized i18n utility + bilingual surface contract. AC1–AC6 landed; `i18n-parity` CI gate wired (turbo + ci.yml + ci-local.sh), teeth proven end-to-end; ADR-0018 authored; `deferred-work.md` L22 numeral-utility leg Closed-by-edit + broader §4328 modules deferred. `pnpm ci:local` green (15 static jobs). Status → review. |

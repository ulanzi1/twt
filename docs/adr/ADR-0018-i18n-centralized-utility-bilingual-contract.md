# ADR-0018: `packages/i18n` centralized i18n utility + bilingual surface contract (Story 2.1)

> **Status:** drafted
> **Date:** 2026-06-20 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 2.1 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

The architectural-freeze table (epics.md L527, row 10) commits a **bilingual surface
property**: member-visible surfaces are Hindi-primary, admin surfaces English-primary,
and every member-visible string carries Hindi parity. Architecture commits i18n-at-the-core
(architecture.md L286-288) with a package sketch at §4328 (L4328-4340). Per
[[feedback_architecture_vs_adr_boundary]], the architecture/freeze table records the
*property*; this ADR records the *control mechanism* that enforces it once at the utility
level rather than re-litigating per surface. Per [[feedback_architecture_vs_prd_boundary]],
the Hindi-first *posture* is PRD/policy; the *parity contract* (every member string has a
Hindi entry, verified by a gate) is the architectural invariant this ADR's gate enforces.

Several decisions had to be made before authoring `packages/i18n`, and were **locked at
create-story**:

- **Storage shape** — the binding epics AC (L1416) commits `locales/{hi,en}/{domain}.json`
  (a data-file translation catalog); architecture §4328 sketches `src/strings/` + per-module
  formatters (the broader vision). These differ; one had to win for the storage contract.
- **`Locale` type locality** — `packages/i18n` must run in edge / public / native contexts,
  so depending on `@twt/domain` (the DB layer, which owns `localeEnum`) would be a layering
  violation.
- **Resolver runtime** — whether to adopt a heavyweight i18n runtime (`i18next` / `react-intl`)
  or hand-roll, and how the resolver loads catalogs across Node / Vite / Metro / Astro SSR
  without a filesystem dependency or a module-level singleton (which breaks SSR/hydration).
- **Surface classification** — how a surface declares member- vs admin-facing, given there is
  **no `apps/member` directory** (the member app is `apps/mobile`; `apps/public` follows at
  Story 2.5) — so a hardcoded app-path allow-list is wrong.
- **Parity gate mechanism + AC6 numeral scope** — where the gate lives in the in-repo gate
  taxonomy, and whether the numeral/currency utilities (the `deferred-work.md` L22 re-trigger)
  ship here.

Risk if undecided: each consuming surface re-implements bilingual handling inconsistently,
the freeze-row-10 invariant decays to developer memory (the exact "un-gated commitment decays"
failure the Epic 1 retrospective flagged), and the Story 1.17 microcopy gate's forward-reference
to "the i18n utility at Story 2.1" never resolves.

## Decision

**Author `packages/i18n` as a hand-rolled, framework-agnostic-core utility whose build-time
`i18n-parity` CI gate enforces the freeze-row-10 bilingual contract once, at the package
level.** The load-bearing choices:

1. **Storage shape = the epics AC, not §4328.** Translation keys live as data files at
   `locales/{hi,en}/{domain}.json` (AC2). Architecture §4328's `src/strings/` + per-module
   formatter sketch is the broader vision, not the storage contract — **the AC wins for
   translation storage.** This is a documented, intentional variance from §4328.

2. **`Locale = 'hi' | 'en'` defined locally** in `src/locale.ts`. `packages/i18n` does **not**
   import `@twt/domain`. The type is value-aligned with the domain `localeEnum`
   (`pgEnum('locale', ['hi','en'])`, packages/domain/src/schema/pariwar_passport.ts:54) but
   brand-aligned, not symbol-identical — the same precedent as `PariwarId` at Story 1.7.

3. **Hand-rolled resolver; no heavyweight i18n runtime.** `t(key, params, options)` interpolates
   `{varName}` single-brace tokens and is **loud-by-default** (throws naming the offending
   key / namespace / missing param — the 1.17 `scripts/microcopy` strict-parse posture). The
   catalog is built from **static JSON imports** (`src/catalog.ts`) — works unchanged in Node /
   Vite (web) / Metro (RN) / Astro SSR, no runtime `fs`, tree-shakeable, no `i18next`/`react-intl`.
   `t()` is the framework-agnostic, **server-safe** core (no React); the AC's "`options.locale`
   defaults to `useLocale()`" is realized by **`useT()`**, a React hook that binds the context
   locale (a plain function cannot legally call a hook).

4. **Locale resolution is split server vs client.** `getLocale(ctx)` (server) applies the exact
   precedence `sessionLocale → pariwarPassportLocale → Accept-Language → hi fallback` over a
   **plain caller-assembled context object** — it imports no HTTP framework type (the caller
   resolves values from Fastify/Astro and passes them in). `useLocale()` / `LocaleProvider`
   (client) are a **React context + hook**, never a module-level singleton (a singleton breaks
   SSR and causes Astro hydration mismatches). `react` is an **optional peer dependency**.

5. **Surface classification is declarative, keyed by namespace, not app-path.** The persisted
   source of truth is `locales/classification.json` (`default: member-facing` per freeze row 10;
   `namespaces: {}` admin-facing overrides). Both the runtime registry (`src/classification.ts`,
   `declareSurface` on import) and the build-time gate read it, so they cannot drift. Default =
   member-facing → a namespace is parity-enforced unless explicitly declared admin-facing. App→class
   mapping today: `apps/admin` = admin-facing; `apps/mobile` (+ future `apps/public` member pages)
   = member-facing.

6. **Parity gate = a package-local turbo task** (`i18n:check-parity`), modelled precisely on
   `tokens:check-theme-determinism`: pure core (`scripts/lib.ts`, unit-tested) + impure entry
   (`scripts/check-parity.ts`) → `turbo.json` task → root `i18n:check` passthrough → `i18n-parity`
   ci.yml job (between `tokens-theme-check` and `pii-scrape`) → `scripts/ci-local.sh` registration
   (the active merge gate while GitHub Actions is suspended — ADR-0017). The locale catalog is a
   single-workspace artifact → **no `fetch-depth: 0`**, not a repo-root script. On failure it names
   the offending **file + key** and exits non-zero. Green-with-teeth: `common` defaults member-facing
   and is parity-enforced now; teeth proven end-to-end.

7. **AC6 numeral/currency utilities ship here** (`toHindiNumeral` / `toGregorianNumeral` /
   `formatCurrency` with Indian lakh/crore grouping). `deferred-work.md` L22 named *this* story as
   the re-trigger; landing `packages/i18n` without them would fire the trigger unfulfilled. The
   **amendment-A2 operational-vs-ceremonial split** is encoded as the documented contract (operational
   data → Latin even on memorial pages; ceremonial Devanagari prose → Hindi numerals permitted; never
   mixed at one hierarchy level). The broader §4328 modules (`date.ts`, `relative-time.ts`,
   `pluralize.ts`, `actor-class-register.ts`, `per-pariwar/`) are **deferred to their first consuming
   surface** (`deferred-work.md`).

## Alternatives considered

- **Adopt `i18next` / `react-intl`** — Rejected. They pull a heavyweight runtime into edge/native
  bundles (against the UX-DR3 friction-budget posture) and impose their own catalog/loader model;
  the bilingual contract here is narrow (two locales, parity gate) and hand-rolling keeps the surface
  small, deterministic, and framework-agnostic. Re-visit if locale count or pluralization complexity
  grows materially.
- **Follow §4328 `src/strings/` storage** — Rejected for the *storage contract*: the binding epics AC
  commits the `locales/{hi,en}/{domain}.json` data-file shape. §4328's module sketch survives as the
  *formatter* vision (partially realized by AC6; the rest deferred).
- **Filesystem-read catalog at runtime** — Rejected: cannot run in browser/RN/edge. Static JSON imports
  work everywhere the package must. (The build-time gate, a Node script, does read `fs` — that is fine.)
- **Module-level locale singleton** — Rejected: breaks SSR and causes Astro hydration mismatches
  (Story 2.5+). A React context is used instead.
- **Hardcoded app-path classification (`apps/member` ⇒ Hindi-first)** — Rejected: `apps/member` does
  not exist; classification is declarative-by-namespace so the rule is "by classification," not "by path."
- **Import `@twt/domain` for `Locale`** — Rejected: layering violation (domain is the DB layer; i18n is
  a low-level shared package). Local brand-aligned type instead.
- **Repo-root script gate (like `microcopy`/`friction`)** — Deferred/rejected for this gate: the parity
  check operates on a single workspace's `locales/`, so a package-local turbo task is the honest home
  (the `tokens` precedent). Re-visit only if parity ever needs a cross-workspace scan.

## Consequences

- **Operational** — A new merge-gate obligation: `i18n-parity` runs in `ci.yml` and `ci:local`
  (static-job count corrected to 15 — the `ci-local.sh` header had drifted to a stale "13" after
  cadence-check (AI-1) landed as the 14th; i18n-parity is the 15th). Adding a translation domain is a
  3-step runbook (add the `{hi,en}/<domain>.json` pair → register two import lines in `src/catalog.ts`
  → the gate enforces parity automatically).
- **Security** — Neutral. No new external dependency, no PII surface; `react` is an optional peer.
- **Performance** — Friction-budget friendly: no heavyweight i18n runtime; static imports are
  tree-shakeable; numeral grouping is hand-rolled (no `Intl` data dependency), deterministic across
  Node / Hermes / edge.
- **Cost** — None.
- **Failure modes accepted** — (a) The client hooks are re-exported from the package root, so importing
  `@twt/i18n` pulls `react` into the graph; inert at v1 (no consumers), but a non-React server consumer
  (e.g. `apps/api`) will require a `@twt/i18n/react` subpath split (deferred, with re-trigger). (b) The
  `src/catalog.ts` static-import registry must be hand-updated per new domain (deliberate: explicit +
  reviewable over a magic glob). (c) The parity gate's teeth are scoped to declared namespaces; broad
  member-surface enforcement grows data-driven as Epic 2+ surfaces add `locales/**` (the L24 deferral).
- **Migration / pivot path** — If a heavyweight i18n runtime becomes warranted (locale count /
  pluralization growth), the `t()` seam + `locales/{hi,en}/{domain}.json` storage become that runtime's
  source-of-truth; the parity gate stays. Reverse via a successor ADR.

## References

- [Source: epics.md, Story 2.1 (L1405-1422)] — owning Story; ACs L1415-1422; Epic 2 framing L1385-1403
- [Source: epics.md L527 + L510-512] — architectural-freeze row 10 (bilingual contract) + Frozen-properties preamble
- [Source: architecture.md L286-288] — i18n-at-the-core principle; [Source: architecture.md L4328-4340] — §4328 package sketch (intentional variance documented); [Source: architecture.md L1833-1834] — API copy/locale layering; [Source: architecture.md L2867-2870] — per-state copy + actor-class register; [Source: architecture.md L2472, L481-482] — `apps/mobile` member app / deferred `apps/member-web`
- [Source: ux-design-specification.md L691-698, L712-717, L1119-1127, L1156-1158] — i18n utilities + amendment-A2 numeral discipline
- [Source: packages/domain/src/schema/pariwar_passport.ts:54,86] — `localeEnum` + `localeDefault` (value-alignment basis)
- [Source: deferred-work.md L22] — numeral-utility re-trigger (Closed by edit at this Story); [Source: deferred-work.md L24] — broad-member-enforcement re-trigger (not fired here)
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live Section A index row for this ADR
- Memory: [[feedback_architecture_vs_adr_boundary]] (ADR records control, architecture records property); [[feedback_architecture_vs_prd_boundary]] (Hindi-first = PRD policy; parity contract = architectural); [[feedback_closure_language_precision]] (Closed-by-edit vs Resolved-via-deferral); [[project_ci_actions_suspension_local_mirror]] (ci:local is the merge gate)

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-20 | (initial draft) | BigDev (Solo Builder) | Authored under Story 2.1 (i18n centralized utility + bilingual surface contract) closure |

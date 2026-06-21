# Story 2.5: Public Astro SSR Shell Foundation + Niyamavali Public Render with Version Diff `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any non-member visitor to twt.org,
I want to read the Niyamavali in Hindi or English with version diff history,
so that "is this trust real?" returns a credible answer before I consider signing up — and the AR-48 public Astro SSR shell foundation is initialized here for downstream public surfaces (Epic 11a, Epic 11b) to extend.

> **Seam discipline (read first).** This is the **first public, unauthenticated surface** in the system and the **first real app in `apps/public/`** (today it is a `tsc` placeholder stub — `src/index.ts` is `export {}`). Two things land together: **(1)** the **AR-48 public Astro SSR shell foundation** (cache-safe SSR, branded chrome, i18n toggle, design tokens, composition contract with an *empty* fragment registry), and **(2)** its **first consumer** — the Niyamavali public render with version + diff selectors reading the Story 2.3 registry. It does **NOT** build authenticated fragments (registry initialized empty; Epic 11a/11b populate it), does **NOT** stand up the `apps/api/src/modules/public-pages/` HTTP module (that is **empty until Epic 11b** — see Dev Notes §"Data path"), and does **NOT** interpret rule `payload` (Epic 4 owns rule semantics — freeze row 14). [Source: epics.md#Story-2.5 L1492-1521; architecture §"Cross-surface rendering policy" L498-545; deferred-work.md L200/L1022 "apps/api/src/modules/public-pages/ is empty until Epic 11b"]

> **This story carries three retrospective re-homed obligations** that the create-story analysis is required to encode (or they decay un-gated — [[feedback_record_unattested_no_backfill]]): the **P0-4 Empty/Skeleton/Error inventory** (Decision 2026-06-20-054, AI-3) and the **pii-scrape / friction-budget / microcopy teeth-activation** ACs (Decision 2026-06-20-055, AI-7). They appear as **AC6–AC9** below and gate review exactly like the epic ACs.

## Acceptance Criteria

> AC1–AC5 are verbatim-derived from epics.md L1494-1521 (Story 2.5), re-numbered for traceability. AC6–AC9 are the **binding obligations the create-story analysis surfaces** — each is a commitment a retrospective Decision explicitly re-homed *to this story* with a recorded re-trigger (`.decision-log.md`, `gate-inventory.md` Category C, `deferred-work.md`). They gate review exactly like the epic ACs.

**AC1 — The public Astro SSR shell foundation (`apps/public`).**
Given FR-79 + AR-48 (foundation initialized here per amended freeze table row 8) + UX-DR9, when the shell is authored, then a real **Astro 6 SSR** project lives in `apps/public/` with:
- **route-based SSR** (Astro file-system routing under `src/pages/`; `output: 'server'` via `@astrojs/node` standalone adapter);
- **cache-safe HTML output** — no per-user PII, no member-state, no session-derived branching can enter the cached HTML (the cache-safety guarantee is structural, not documented discipline — Dev Notes §"Cache-safe guarantee");
- the **composition contract documented** at `apps/public/COMPOSITION-CONTRACT.md` (or equivalent), naming which fragments are public-shell-rendered vs. authenticated-fragment; the **fragment registry is initialized EMPTY here** (Epic 11a + 11b populate it);
- the **auth boundary stays at the API** — Story 2.5 ships **zero authenticated fragments**, so no auth surface is introduced at the public page layer (the `apps/api/src/modules/public-pages/` module for authenticated fragments is Epic 11b).
- **AND** the shell consumes Story 1.7's Pariwar-Passport branding bundle for branded chrome (`getBrandingBundleCached` from `pariwar-passport/read.ts`, 60s staleness ceiling — Dev Notes §"Branding");
- **AND** the shell consumes Story 2.1's i18n utility for the Hindi/English toggle (server-side `getLocale` + `t`; see AC3 + Dev Notes §"i18n");
- **AND** the shell consumes Story 1.17's design tokens (`@twt/tokens` + `@twt/tokens/theme.css`, UX-DR9 — **NOT** `@twt/ui`, which is still an empty stub — Dev Notes §"Tokens").

**AC2 — The Niyamavali public render (the first shell consumer) with version + diff selectors.**
Given the Niyamavali public page consumer, when authored, then the page (route `src/pages/niyamavali.astro`):
- renders the **current effective clauses** for the Pariwar — resolved via `clause_id` + effective-date filter on the Story 2.3 registry (latest non-deprecated version effective at `now`, per `clause_id`; **a new domain read accessor is required** — Dev Notes §"Read accessor gap");
- each clause displays **title + `clause_id` (visible as a stable reference handle) + version + effective-date + structured-payload-rendered content** (the authoritative bilingual display contract crystallizes here — Dev Notes §"Bilingual display contract");
- a **version selector** reveals prior versions (`niyamavali.versionsOfClause`);
- a **diff selector** renders any two-version **structured-payload diff** (`niyamavali.computePayloadDiff`).

**AC3 — Fully server-rendered; works without JS; Hindi/English toggle is a server roundtrip.**
Given the Niyamavali public page, when rendered, then the page is **fully server-rendered** (no client-side hydration required for reading), the Hindi/English toggle is a **server roundtrip** (a link/form to the same route with a locale param — not a client island), and the page **works with JavaScript disabled** (verified in the integration/e2e render).

**AC4 — Cloudflare edge cache TTL respects the cache-safe contract.**
Given the public page, when served, then it sets cache headers making it **CDN/edge-cacheable** (e.g. `Cache-Control: public, max-age=…`/`s-maxage`) under standard public-cache semantics; no PII / member-state leak is possible because none is rendered (AC1 cache-safe guarantee). [Source: architecture §"Cache-safe public SSR guarantee" L514-523]

**AC5 — The PII scrape CI gate runs against this page's render (matrix empty → naked-PII leg active).**
Given the Story 1.16b PII scrape gate, when the gate inspects this page's rendered output, then the FR-74 matrix has **no entries yet** (Epic 11a populates it), so the **tier-leak** leg is a no-op against this page — **but** the page **is rendered in CI's test-environment public render** so the gate verifies on every PR going forward. **Binding consequence (AC6c):** the **naked-PII detection** leg (`detectNakedPii`) **is active regardless of matrix entries** and asserts the rendered Niyamavali HTML contains no naked phone/email/Aadhaar. [Source: epics.md L1512-1516; packages/contracts/src/public-pages/scrape.ts]

**AC6 — Binding (Decision 2026-06-20-055, AI-7): gate teeth-activation.** The three Epic-1-retro re-trigger obligations land here, each confirmed green:
- **(a) `pii-scrape` live-render activation.** The architecture-committed integration spec `tests/integration/public-pages/scrape-test.spec.ts` is authored; it imports the existing pure engine (`@twt/contracts` `evaluateSnapshot` / `detectNakedPii`) and feeds it the **real Niyamavali render HTML** (built from fixture clauses via the pure render module — Dev Notes §"Testable render"). The gate confirms **no tier leaks + no naked PII**. [Source: deferred-work.md D13-1.2 / D8-1.5 L200/L202/L1022; gate-inventory.md Category B row `pii-scrape`]
- **(b) `friction-budget` activation.** The Astro build emits the per-route page-weight manifest `apps/public/dist/page-weight.json` so the **already-declared** `apps/public` surface's `page_weight_bytes` metric (`friction-budget.yaml`) acquires teeth (was `null`/no-op). The `critical_render_path_ms` throttled-Lighthouse-CI harness is **either enabled OR explicitly deferred via a recorded decision** (Dev Notes §"Friction budget" — deferral is acceptable per Decision 055(b), but the deferral must be written down, not silent). [Source: friction-budget.yaml L41-65; deferred-work.md CR-D0-1.16a L1303]
- **(c) `microcopy` full member-surface scan activation.** `microcopy.yaml` `scope.copy_globs` is populated to cover the new `apps/public` member-facing surface (was `[]`), so the member-register vocabulary terms (`user`/`customer`/`donor` → canonical) + Devanagari-numeral discipline acquire teeth on this surface. Land **green-with-teeth** (fix real findings in-story; allow-list only genuinely-N/A cases with a reason). [Source: microcopy.yaml L13/L96; gate-inventory.md Category C `microcopy full member-register scan`]

**AC7 — Binding (Decision 2026-06-20-054, AI-3): the P0-4 Empty/Skeleton/Error inventory.**
Given architecture P0-4 gate (Empty/Skeleton/Error Inventory, `inventory-roster.md` Row 6) re-homed here, when Story 2.5 ships, then a **UX-led empty/skeleton/error-state inventory** is produced covering **every screen surface built in `apps/public` at this story** (the Niyamavali page + the shell's not-found/error routes); the artifact lives at `docs/ux/empty-skeleton-error-inventory.md` (no `<TBD>` cells for the 2.5 surfaces); **≥2-trustee ratification is recorded in `.decision-log.md`**; and `inventory-roster.md` Row 6 `current_status` flips `open` → `in-progress` (with a supersession marker — append-only roster discipline).
**AND** the inventory is understood as **partial at 2.5** (it covers `apps/public` Niyamavali + shell surfaces); it is extended at Epic 11a (Member Directory) and Epic 11b (per-claim + In Memoriam); Row 6 `closed` only when the full Phase-1 surface inventory is attested (Epic 11a completion). [Source: epics.md L1518-1521; .decision-log.md Decision 2026-06-20-054; inventory-roster.md Row 6 L89-101]

**AC8 — Binding: the Niyamavali public read crosses NO auth boundary and leaks no tenant data.**
Given the public render reads the Story 2.3 registry **without an authenticated session**, when it queries, then it runs under the **`twt_app` request role with `app.pariwar_id` set** (RLS enforced — the scope tx pattern, NOT a superuser bypass), reads **only** the resolved public Pariwar's clauses, and returns **only public-tier fields** (clause title / id / version / effective-date / rendered payload — never `authored_by_actor`, `audit_id`, or any operator-restricted column in the HTML). Cross-tenant isolation holds (the existing `clause-versions` RLS policy + the explicit `pariwarId` predicate). [Source: packages/domain/src/db.ts `withPariwarScope` L161; apps/api/.../scope-tx.ts `REQUEST_ROLE='twt_app'`; packages/domain/src/policies/clause-versions-rls.ts]

**AC9 — Binding: the contracts/browser-bundle boundary is not violated.**
Given `apps/public` builds with Vite (Astro), when any **client-shipped** code (an island, if introduced) needs a Niyamavali type, then it imports it from **`@twt/contracts`** (e.g. `ClauseVersionResponse`), **never from `@twt/domain`** (the domain root barrel re-exports `encryption` → `node:async_hooks`, which breaks the browser bundle). `@twt/domain` is imported **only in server-only modules** (`.astro` frontmatter / `src/lib/*.server.ts`) that never enter a client island's module graph. [Source: packages/contracts/src/rules/clause.ts L17-29 (the browser-bundle constraint, verbatim); architecture §"Astro component test carve-out" L3796]

## Tasks / Subtasks

> **Build order:** scaffold the Astro app (replace the stub) → wire monorepo/CI/Docker → tokens+i18n+branding shell → domain read accessor → testable pure render → the `.astro` page (version/diff selectors) → cache headers → scrape integration spec → gate activations (friction-budget manifest, microcopy globs) → empty/skeleton/error inventory → governance. **Read Dev Notes §"Data path" and §"Testable render" before writing any `.astro` file.**

- [x] **Task 1 — Replace the `apps/public` stub with a real Astro 6 SSR app (AC1).**
  - [x] Install Astro 6 + the Node SSR adapter into `apps/public`: `astro`, `@astrojs/node` (standalone mode). Pin to the current Astro 6.x; architecture commits "Astro 6 with server islands, view transitions, Vite 7." [Source: architecture L601]
  - [x] Author `apps/public/astro.config.mjs` with `output: 'server'`, `adapter: node({ mode: 'standalone' })`, and the Vite config needed to resolve workspace packages. Add `vite: { ssr: { noExternal: ['@twt/domain', '@twt/i18n', '@twt/contracts', '@twt/tokens'] } }` so workspace packages are **bundled into `dist/server/entry.mjs`** (NOT kept external). This is required for the Docker runtime stage (`COPY apps/public/dist ./apps/public/dist`) to work — if workspace packages were external they would be absent from the runtime image and the server would crash on import. **Do NOT use `ssr.external` for workspace packages** — that would break the standalone Docker image. Client-island bundles never see `@twt/domain` because `.astro` frontmatter and `*.server.ts` files are never part of island module graphs (AC9).
  - [x] Rewrite `apps/public/package.json` scripts to Astro's: `build: astro build`, `dev: astro dev`, `preview: astro preview`, keep `lint: eslint .`, `typecheck: astro check` (or `tsc --noEmit` with Astro types), `test: vitest run --passWithNoTests`. Remove the placeholder `main: ./src/index.ts` (Astro app has no library entry). Keep `@twt/eslint-config-twt`. [Source: apps/public/package.json (current stub)]
  - [x] Replace `apps/public/tsconfig.json` to extend Astro's strict tsconfig (`astro/tsconfigs/strict`) while keeping `../../tsconfig.base.json` alignment where compatible. Delete `apps/public/src/index.ts` (the `export {}` stub) and its `tests/smoke.test.ts` import-of-`../src/index` (replace with real tests — Task 6).
  - [x] `apps/public/eslint.config.js`: extend `@twt/eslint-config-twt`; add the Astro ESLint plugin/parser for `.astro` files if the shared config does not already cover them (verify `pnpm --filter @twt/public lint` is green — note the per-package cwd-relative glob rule, [[project_eslint_config_per_package_cwd]]).
  - [x] **`apps/public/Dockerfile`:** update the runtime stage from the placeholder `CMD ["node", "apps/public/dist/index.js"]` to run the Astro Node standalone server entry (`node apps/public/dist/server/entry.mjs`, per `@astrojs/node` standalone output). Keep the existing multi-stage `pnpm turbo run build --filter=@twt/public` build. The `deps` stage already copies `packages/{tokens,i18n,domain,contracts,ui}/package.json` — confirm all runtime-needed workspace deps are copied. [Source: apps/public/Dockerfile (current)]

- [x] **Task 2 — Wire the new Astro app into the monorepo + CI + turbo (AC1; AC6b).**
  - [x] `turbo.json`: the generic `build` task already lists `dist/**` + `build/**` outputs — confirm Astro's `dist/` is captured. Add no new global task unless the page-weight manifest emit (Task 8) needs one. `dev` is already `cache:false, persistent:true`. [Source: turbo.json L6-30]
  - [x] `pnpm-workspace.yaml` already globs `apps/*` — no change. Run `pnpm install` so the new Astro deps resolve in the lockfile (the `pii-scrape`/`db-check` turbo `inputs` include `../../pnpm-lock.yaml`).
  - [x] Run `pnpm ci:local` (mirrors all CI jobs — [[project_ci_actions_suspension_local_mirror]]) and confirm the new app passes **lint / typecheck / build / test**, and does not regress the 14+ jobs. Astro `.astro` files have **no co-located unit tests** (architecture carve-out L3796) — logic lives in `.ts` (Task 5) tested by vitest + the integration render (Task 6). [Source: .github/workflows/ci.yml jobs L37-449; scripts/ci-local.sh]
  - [x] **GitHub Actions is suspended** — the merge gate is `pnpm ci:local` reconciled green locally; integration tests need `DATABASE_URL` on `:5433` (the `twt-test-pg` Docker). [Source: [[project_ci_actions_suspension_local_mirror]]; [[project_live_db_test_gotchas]]]

- [x] **Task 3 — The shell: layout, branded chrome, design tokens, locale toggle (AC1, AC3).**
  - [x] `apps/public/src/layouts/PublicShell.astro` (or `BaseLayout.astro`) — the cache-safe shell: HTML skeleton, `<head>` (meta, `noindex` where Story 1.14 forced-pagination/noindex policy applies — confirm public Niyamavali is **indexable** per SEO intent), import `@twt/tokens/theme.css` for the Tailwind v4 `@theme` tokens (UX-DR9). [Source: packages/tokens/package.json `exports['./theme.css']`; architecture L2475 "minimal JS by default"]
  - [x] **Branded chrome (AC1):** resolve the active Pariwar (v1 single-tenant — Dev Notes §"Pariwar resolution") and read its branding bundle via `getBrandingBundleCached(pool, pariwarId)` from `packages/domain/src/pariwar-passport/read.ts` (L158 — the 60s cache-aside variant; use this for chrome renders, not the fresh-from-DB `getBrandingBundle`). **No `withPariwarScope` is needed** — the `pariwarPassportCrossReadableSelect` carve-out (`USING true`) makes branding readable by any `twt_app` session across Pariwars without scope-setting (see L1-9 of `pariwar-passport/read.ts`). Render the trust name/logo/colors from the bundle into the shell chrome. [Source: packages/domain/src/pariwar-passport/read.ts L8 ("the public Astro shell + admin chrome read branding"), L65 (getBrandingBundle), L158 (getBrandingBundleCached)]
  - [x] **Locale toggle (AC3):** server-side. `getLocale({ acceptLanguage, pariwarPassportLocale })` resolves the locale (no auth session on a public page → resolution falls through Pariwar-Passport `locale_default` → `Accept-Language` → Hindi fallback). The toggle is a link to the same route with a `?lang=hi|en` (or `/hi/…|/en/…`) param — a **server roundtrip**, NOT a client island. Member-facing surface ⇒ **Hindi-primary** default (bilingual surface contract). [Source: packages/i18n/src/index.ts `getLocale`; packages/i18n/README §"Server-side locale resolution"]
  - [x] **⚠ i18n `/react` subpath split (blocking for the Astro build):** `@twt/i18n` root re-exports the React hooks (`LocaleProvider`/`useLocale`/`useT`), so `import … from '@twt/i18n'` pulls `react` into the module graph. `apps/public` Astro SSR is **the first non-React server consumer** — the documented re-trigger. **Split the React hooks into a `@twt/i18n/react` subpath export** (`packages/i18n/package.json` `exports['./react']`) so the server-safe core (`t`, `getLocale`, numerals) loads without `react`; update the root barrel to stop re-exporting the React hooks. Re-run `pnpm --filter @twt/i18n test` + the consumers (`apps/admin`, `apps/mobile`) to confirm no break. [Source: packages/i18n/README §"Server consumers (re-trigger)" L82-88; deferred-work.md CR-D1-2.1 L1344 + L92]

- [x] **Task 4 — Domain: the "current effective clauses for a Pariwar" read accessor (AC2; AC8).** `packages/domain/src/niyamavali/read.ts`
  - [x] **Add `listEffectiveClauses(db, pariwarId, asOf?)`** — returns the **latest non-deprecated version effective at `asOf`** (default DB `now()`, DB-authoritative §1.11) **per `clause_id`** across the whole Pariwar. **No such accessor exists** — `read.ts` has `resolveByClauseId` (one clause) and `listClauses` (latest head per clause, **includes deprecated**, ignores effective-date). The public render needs the *effective set*. Model it on `resolveByClauseId`'s `isNull(deprecatedAt) + effectiveDate <= now()` predicate but grouped/distinct-on per `clause_id` taking the max `version`. [Source: packages/domain/src/niyamavali/read.ts L25-51 (resolveByClauseId), L107-120 (listClauses — NOT effective-filtered)]
  - [x] Reuse unchanged: `versionsOfClause(db, pariwarId, clauseId)` (version selector — read.ts L141) and `computePayloadDiff(prev, next)` (diff selector — diff.ts L91). **Do NOT reimplement diff/version logic.** [Source: packages/domain/src/niyamavali/{read.ts L141, diff.ts L91}]
  - [x] Unit + integration tests (live DB :5433): seed clauses with mixed effective-dates + a deprecated clause + multiple versions; assert `listEffectiveClauses` returns exactly the latest-effective-non-deprecated per `clause_id`. Own-committing writers accumulate rows → **assert membership, not exact counts** ([[project_live_db_test_gotchas]]). Add a cross-tenant assertion (a second Pariwar's clauses never appear).

- [x] **Task 5 — The testable pure render module (AC2, AC6a, AC9).** `apps/public/src/lib/niyamavali-render.ts` (server-only `.ts`, NOT `.astro`)
  - [x] A **pure function** `renderNiyamavaliClauses(clauses, opts: { locale }): RenderModel` (or returns an HTML-ready view model) — the **authoritative bilingual display contract** for the opaque structured payload (Dev Notes §"Bilingual display contract"). The payload is **opaque** (freeze row 14) — this is **display-field rendering** (title, `clause_id` handle, version, effective-date, and a readable key/value rendering of payload display fields like `title_en`/`title_hi`/`rule_code`), **NOT** rule interpretation. Deterministic (sorted keys), no PII fields. This supersedes the pragmatic `render-diff.ts` placeholder which explicitly deferred the authoritative contract to 2.5. [Source: apps/api/src/modules/rules/render-diff.ts header ("The authoritative bilingual display contract crystallizes at Story 2.5's public render"); deferred-work.md L24]
  - [x] A pure `renderDiff(versionA, versionB)` view adapter over `computePayloadDiff` for the diff selector's display.
  - [x] Types for any island come from `@twt/contracts` (`ClauseVersionResponse`) — **never `@twt/domain`** in client-reachable code (AC9). The render module is server-only and MAY import `@twt/domain` types; keep it out of any island graph.
  - [x] Co-located vitest unit tests for `renderNiyamavaliClauses` / `renderDiff` (Astro `.astro` files have no co-located tests — the logic lives here). Include a fixture asserting the output contains **no naked PII** as a unit-level smoke (the integration spec in Task 6 is the authoritative gate).

- [x] **Task 6 — The Niyamavali page + the PII scrape integration spec (AC2, AC3, AC4, AC5, AC6a).**
  - [x] `apps/public/src/pages/niyamavali.astro` — frontmatter (server) resolves the active Pariwar, opens an **unauthenticated `withPariwarScope`** read (Dev Notes §"Data path" + §"Cache-safe guarantee"), calls `listEffectiveClauses` (+ `versionsOfClause` when a `?clause=…&version=…` is selected, + `computePayloadDiff` when `?from=…&to=…` is selected), then renders via the Task 5 pure module. Version selector + diff selector are **server-roundtrip links/forms** (query params), no hydration (AC3). Page works with JS off.
  - [x] **Cache headers (AC4):** set `Cache-Control: public, max-age=…` (+ `s-maxage` for the edge) in the route response — cacheable because no PII/member-state is rendered. Document the chosen TTL in the composition contract. [Source: architecture L514-523]
  - [x] **Author `tests/integration/public-pages/scrape-test.spec.ts`** (the architecture-committed, D13-1.2 uncompromisable slot — currently **unpopulated**). It renders the Niyamavali page HTML (preferably from the Task 5 pure render over fixture clauses, so the spec needs **no** live Astro server; a live-DB render variant is acceptable if cleaner), constructs a `RenderSnapshot { surfaceId: 'niyamavali', viewerContext: 'public', html }`, runs `evaluateSnapshot(matrix, snapshot)` + `detectNakedPii(html)` from `@twt/contracts`, and **asserts no leaks + no naked PII**. The matrix is empty (tier-leak no-op) but `detectNakedPii` is active. [Source: packages/contracts/src/public-pages/scrape.ts (`evaluateSnapshot`, `detectNakedPii`, `RenderSnapshot`); architecture L4429; deferred-work.md D13-1.2 L1022]
  - [x] **Heed the known engine caveats** the dev must resolve when wiring real renders: (i) `RenderSnapshot` for non-public viewers must carry `fields` or the verdict silently passes (CR-D0-1.16b L1334) — for 2.5 only the `public` snapshot is needed; (ii) the phone regex false-positives on 10-digit non-phone strings (URL paths, ids) — keep fixture HTML free of accidental 10-digit runs, and refine the regex if a real match is spurious (CR-D1-1.16b L1336); (iii) the gate's `loadSnapshots()` is a hardcoded `[]` stub — the architecture-committed path is **this integration spec** importing the engine directly, not the gate's secondary path (CR-D2-1.16b L1338). [Source: deferred-work.md L1334-1338]

- [x] **Task 7 — Empty / skeleton / error states + the P0-4 inventory (AC1, AC7).**
  - [x] Build the shell's **empty / error / not-found** states: an empty-Niyamavali state ("no clauses published yet" — dignified, tone-guide register), a 404/not-found route, a 500/error route. (Skeleton/loading states are minimal — the page is server-rendered with no client fetch, so "skeleton" is largely N/A; record that rationale in the inventory rather than inventing a loading state.)
  - [x] **Author `docs/ux/empty-skeleton-error-inventory.md`** — the UX-led inventory covering **every `apps/public` screen surface built at 2.5** (Niyamavali page, not-found, error). No `<TBD>` cells for these surfaces. State explicitly it is **partial** (extended at Epic 11a/11b). [Source: .decision-log.md Decision 2026-06-20-054; inventory-roster.md Row 6 closure_criteria L95]
  - [x] **Record ≥2-trustee ratification in `.decision-log.md`** (a new dated Decision entry referencing this inventory) and **flip `inventory-roster.md` Row 6** `current_status` `open` → `in-progress` with a supersession marker (append-only roster discipline — never delete/paraphrase the verbatim row label; document in `notes`). [Source: inventory-roster.md L13 (verbatim-label rule), L100 (discharge path); [[feedback_closure_language_precision]]]

- [x] **Task 8 — Gate teeth-activation: friction-budget + microcopy (AC6b, AC6c).**
  - [x] **friction-budget:** emit `apps/public/dist/page-weight.json` from the Astro build (a small post-build step computing total transferred bytes per route — the surface is **already declared** in `friction-budget.yaml` with `manifest: apps/public/dist/page-weight.json`). Run `pnpm friction:check` and confirm the `page_weight_bytes` metric now has a real value under its ceiling. Consider restructuring the surface to per-route shape (`routes: { '/niyamavali': <bytes> }`) per CR-D0-1.16a, OR keep the aggregate and note the deferral. **Decide `critical_render_path_ms`: enable a throttled-Lighthouse-CI harness OR record an explicit deferral** (Decision 055(b) permits deferral, but it must be written). [Source: friction-budget.yaml L41-65; deferred-work.md CR-D0-1.16a L1303, AC-6 L218]
  - [x] **microcopy:** populate `microcopy.yaml` `scope.copy_globs` with the new `apps/public` member-facing copy globs (was `[]`). Run `pnpm microcopy:check`; fix real findings in-story (member-register vocabulary `user`/`customer`/`donor` → canonical; Devanagari-numeral discipline on ceremonial vs operational numbers); allow-list only genuinely-N/A cases each with a reason. Land **green-with-teeth**. [Source: microcopy.yaml L13/L96; gate-inventory.md Category C]

- [x] **Task 9 — Governance + bookkeeping.**
  - [x] `gate-inventory.md`: flip the `pii-scrape` row → **live-render ENFORCING** (Category B), and remove the `microcopy full member-register scan` + `pii-scrape live-render` rows from Category C (collected per Decision 055 open-follow-up). [Source: gate-inventory.md Category C L59-66; .decision-log.md Decision 2026-06-20-055 open-follow-ups]
  - [x] `deferred-work.md`: mark the re-triggered items **Closed by [edit]** (i18n `/react` split, D13-1.2 scrape spec, friction-budget per-route + critical-render-path disposition, D8-1.4 Astro Actions runtime **only if** a form/Action is added — the Niyamavali render is read-only, so likely **carried forward** to a public-form story; record honestly per [[feedback_closure_language_precision]]). Add any new deferrals (e.g. authenticated-fragment registry → Epic 11a/11b). [Source: deferred-work.md L24/L92/L200/L495/L1303-1338]
  - [x] If the Astro build / SSR / cache-safety guarantee or the unauthenticated-scope read pattern is a net-new architectural decision, draft an **ADR** (the cache-safety guarantee is "committed in an ADR" per architecture L518). Confirm with the architect whether a new ADR or an extension of an existing one is wanted. [Source: architecture L516-519]
  - [x] Update `sprint-status.yaml`: `2-5-…` → `review` at completion (one combined ledger COMMENT entry) — [[project_sprint_status_ledger]].

### Review Findings

- [x] [Review][Decision] `adr-ratification-consent-sheet-2026-06-21.md` edits bundled into this diff are unrelated to Story 2.5 — the diff fills in "Ratify — init: kp & dr" for 18 ADRs spanning Stories 1.2–2.4 (matching the prior commit's "ADR-0010 ratified... + cascade" trustee session), not anything produced by this story. **Resolved (BigDev):** split into its own commit, separate from the Story 2.5 commit — action at next commit step (staging, not a code patch).
- [x] [Review][Patch] Brand colors never reach most of the page [apps/public/src/layouts/PublicShell.astro:62-66] — `--brand-primary`/`--brand-accent` CSS custom properties are hardcoded to design-system defaults inside the global `:root` block, never wired to the computed `brandPrimary`/`brandAccent` values from `safeHex()`. Only the brand name color and footer border (set via inline `style=`) reflect the Pariwar's actual branding; the header border, lang-toggle active state, and generic anchor color always render the default. Defeats AC1's "branded chrome" for most elements. **Fixed:** moved the brand vars to a dedicated `set:html` style block (same idiom already used for `rootTokenCss()`) as the single source of truth; `safeHex()`'s existing fallback covers the no-branding case. Verified: typecheck/lint/tests green.
- [x] [Review][Patch] `friction-budget.yaml` ceiling comment overclaims [friction-budget.yaml:54] — `# 500 KiB total transferred` is misleading; `page_weight_bytes` only counts static `dist/client/` assets (CSS), not the dynamic SSR HTML response. The baseline comment on the next line already says "extracted CSS" correctly — just the ceiling comment's wording needs fixing to avoid implying full-page-weight enforcement. **Fixed:** reworded the ceiling comment to state what the metric actually measures.
- [x] [Review][Defer] `microcopy.yaml` `code_globs` doesn't cover `apps/public` source [microcopy.yaml] — deferred, pre-existing scope gap. No actual leak today (verified by grep — all visible copy in apps/public templates routes through `tr()`), but the gate's code-glob coverage is structurally incomplete for the new workspace going forward.

## Dev Notes

> The dev agent will have ONLY this file. Everything below is the load-bearing context that prevents the predictable failures on this story: scaffolding the Astro app over a stub, breaking the browser bundle by importing `@twt/domain`, pulling React into the SSR graph, missing the unauthenticated-RLS-scope read, and silently dropping the three re-homed gate obligations.

### Current state of `apps/public` (you are replacing a stub, not greenfield)
`apps/public` exists today as a **PR-1 placeholder TS package** (from Story 1.1 bootstrap): `src/index.ts` is `export {}`; `tests/smoke.test.ts` imports it; `package.json` builds with `tsc`; the `Dockerfile` runtime CMD is a placeholder (`node apps/public/dist/index.js`). **Preserve nothing of the stub's runtime** — replace `package.json` scripts, `tsconfig.json`, the `src/`, and the Dockerfile runtime stage with the Astro app. Keep the workspace name `@twt/public`, the `@twt/eslint-config-twt` dep, and the multi-stage Docker build skeleton. [Source: apps/public/* (read in full during analysis)]

### Data path — how Astro SSR gets Niyamavali data (the key architectural call)
**Recommended (and architecture-consistent for 2.5): read directly from `@twt/domain` in Astro SSR via an unauthenticated `withPariwarScope`.** Rationale:
- The `apps/api/src/modules/public-pages/` HTTP module is **explicitly empty until Epic 11b** (it exists for *authenticated fragments* crossing the auth boundary — deferred-work.md L200/L1022). Story 2.5 ships **zero authenticated fragments**, so there is no auth boundary to cross for public Niyamavali content.
- The existing `niyamavali` admin endpoints (`apps/api/src/modules/rules/`) all require `requireAdminSession` + RBAC (`niyamavali.amend`/`niyamavali.review`) — **not reusable** for a public, unauthenticated reader.
- Astro SSR runs in Node, so `@twt/domain` (and its `node:async_hooks` encryption import) loads fine **server-side**. The constraint is only on **client/island** bundles (AC9).
- Use the standalone helper `withPariwarScope(pool, pariwarId, async (db) => listEffectiveClauses(db, pariwarId))` from `@twt/domain` — it opens a tx, `SET LOCAL ROLE twt_app`, `SET LOCAL app.pariwar_id`, runs the callback under RLS, and tears down. `apps/public` gets its own DB pool (its own `DATABASE_URL`) per the per-workspace pool-isolation principle. [Source: packages/domain/src/db.ts `withPariwarScope` L161, `setPariwarScope` L107; apps/api/.../scope-tx.ts `REQUEST_ROLE='twt_app'`]
- **Security note for the dev:** the public renderer now holds DB creds. This is acceptable because (a) reads run under `twt_app` + RLS (no superuser bypass), (b) the render selects only public-tier fields, (c) the PII scrape gate (AC5/AC6a) is the structural backstop. **This data-path choice is the one open question flagged at the end of this story** — if the architect prefers a thin public read endpoint in `apps/api` instead (keeping DB creds out of the public renderer), that is a defensible alternative; do not silently invent a third path.

### Cache-safe guarantee (architecture-committed, structural — not discipline)
Public SSR output must be CDN-cacheable under public-cache semantics: **no member-conditional content, no session-derived branching, no PII**. The guarantee is enforced **structurally** (type system / build-time check / equivalent committed in an ADR), not by documentation. For 2.5 the structural enforcement is straightforward: the page reads **only** the public-tier Niyamavali fields and renders them; there is no session on a public route. Keep it that way — do not read auth state, do not branch on a member, do not render `authored_by_actor`/`audit_id`. The PII scrape integration spec (AC6a) is the regression guard. [Source: architecture §"Cache-safe public SSR guarantee" L514-523, §"Architecture commits the composition contract" L498-512]

### Read accessor gap (you must add `listEffectiveClauses`)
`packages/domain/src/niyamavali/read.ts` has `resolveByClauseId` (one clause, latest-non-deprecated-effective-at-now) and `listClauses` (latest head per clause, **includes deprecated, ignores effective-date** — built for the admin browse). **Neither returns "the current effective clause set for the whole Pariwar."** Add `listEffectiveClauses(db, pariwarId, asOf?)`. Default `asOf` to DB `now()` (DB-authoritative time §1.11 — never an app-server clock). [Source: read.ts L25-51, L107-120]

### Bilingual display contract (this story owns it)
Story 2.4's `apps/api/src/modules/rules/render-diff.ts` does a pragmatic display-field render and says verbatim: *"The authoritative bilingual display contract crystallizes at Story 2.5's public render."* The payload is **opaque** (freeze row 14 — Epic 4 owns rule semantics), so the render is **display-field rendering**, not interpretation. The Story 2.4 guided authoring form captured display fields `rule_code`, `title_en`, optional `title_hi` (+ workflow metadata). Your render reads those display fields by locale (Hindi-primary on this member-facing surface), plus title/`clause_id`/version/effective-date, and a deterministic readable key/value rendering of remaining display fields. Do **not** interpret rule logic. [Source: render-diff.ts header; deferred-work.md L24]

### i18n: server-safe core + the mandatory `/react` subpath split
`@twt/i18n` `t()` and `getLocale()` are framework-agnostic and server-safe (importable from Astro SSR). **But** the package **root** re-exports the React hooks, so any `import … from '@twt/i18n'` drags `react` into the graph. The README names `apps/public` Astro SSR as exactly the re-trigger for splitting the React hooks into `@twt/i18n/react`. **Do the split** (Task 3) — otherwise the Astro build pulls React in unnecessarily and risks SSR/hydration weirdness. Member-facing surface ⇒ **Hindi-primary** default; admin surfaces are English-primary (the bilingual surface contract — not relevant here but don't invert it). Translation keys live in `packages/i18n/locales/{hi,en}/{domain}.json`; add a `niyamavali` (or `public`) namespace if new member-facing copy is introduced (it must carry Hindi parity or `i18n:check-parity` fails). [Source: packages/i18n/src/index.ts; README §"Server consumers" L82-88; deferred-work.md L92/L1344]

### Tokens vs UI (consume `@twt/tokens`, NOT `@twt/ui`)
Story 1.17 shipped the design-system foundation in **`@twt/tokens`** (real: `color/font/space/border/tokens` + `renderThemeCss` + the generated `@twt/tokens/theme.css` Tailwind v4 `@theme` artifact). **`@twt/ui` is still an empty stub** (`export {}`). The epic AC's phrase "Story 1.17's `packages/ui` tokens + typography" resolves, in the shipped code, to **`@twt/tokens`**. Import `@twt/tokens/theme.css` into the shell layout for tokens/typography (UX-DR9). Do not wait on `@twt/ui`. [Source: packages/tokens/src/index.ts; packages/ui/src/index.ts (`export {}`)]

### Branding (Story 1.7 Pariwar-Passport)
`packages/domain/src/pariwar-passport/read.ts` explicitly anticipates "the public Astro shell … read branding for chrome" (L8-9). Use **`getBrandingBundleCached(pool, pariwarId)`** (L158) — the 60s cache-aside variant recommended for chrome renders. The fresh-from-DB variant is `getBrandingBundle(db, pariwarId)` (L65); use only if you need guaranteed freshness over a single scoped `db` connection. **Neither function requires `withPariwarScope`** — the `pariwarPassportCrossReadableSelect` RLS carve-out (`USING true`) lets any `twt_app` session read any Pariwar's passport without scope (L2-9). Pass a raw `pool` from `apps/public`'s own connection pool (not a scoped tx). [Source: pariwar-passport/read.ts L8, L65 (getBrandingBundle), L158 (getBrandingBundleCached)]

### Pariwar resolution (v1 single-tenant)
v1 is single-Pariwar (Bihar). `packages/domain/src/per-pariwar/bihar/` is the seed home. **Committed convention:** add a `PUBLIC_PARIWAR_ID` env var (the Bihar seed `pariwar_id` UUID). Add it to `turbo.json` `globalEnv` alongside the existing `PARIWAR_PROFILE` entry. Centralize resolution in `apps/public/src/lib/pariwar.server.ts`: `export const ACTIVE_PARIWAR_ID = (env('PUBLIC_PARIWAR_ID') ?? DEFAULT_BIHAR_PARIWAR_ID) as PariwarId`. **Do not hardcode the UUID in a `.astro` file or in more than one place.** Subdomain/path-based multi-Pariwar resolution is a later concern. [Source: packages/domain/src/per-pariwar/bihar/; turbo.json `globalEnv: ["PARIWAR_PROFILE"]` — add `"PUBLIC_PARIWAR_ID"` alongside it]

### Testable render (Astro component test carve-out)
Architecture: *".astro files do not have co-located unit tests; component logic moves to .ts modules (which have co-located tests); rendering tested via integration / e2e."* So keep all render logic in `apps/public/src/lib/*.ts` (Task 5), unit-tested by vitest; the `.astro` page is a thin wrapper; the PII scrape integration spec + (optional) Playwright e2e cover the rendered HTML. This is also what makes the scrape spec able to render HTML from fixtures **without** a live Astro server. [Source: architecture L3796, L4621-4623]

### PII scrape engine (already built — you wire it, don't rebuild it)
Story 1.16b shipped the pure engine in `@twt/contracts`: `evaluateSnapshot(matrix, snapshot)`, `evaluateSurfaceRender(...)`, `detectNakedPii(html)`, types `RenderSnapshot`/`SnapshotVerdict`/`Leak`/`PiiMatch`. The matrix (`packages/contracts/public-pages/public-vs-private-matrix.yaml`) is `surfaces: []` (Epic 11a populates) → tier-leak is a no-op for `niyamavali` until then; **`detectNakedPii` runs on any `public`-viewer HTML regardless of matrix entries** — that is your active assertion. The architecture-committed integration spec `tests/integration/public-pages/scrape-test.spec.ts` is the **canonical** live-render path (imports the engine directly); the gate's `loadSnapshots()` `[]` stub is the secondary path. [Source: packages/contracts/src/public-pages/scrape.ts; .../public-vs-private-matrix.yaml; scripts/check-pii-scrape.ts]

### The three re-homed obligations (do not silently drop — they decay un-gated)
1. **Empty/Skeleton/Error inventory** (Decision 054, AI-3) → AC7 / Task 7. Artifact + ≥2-trustee ratification + roster Row 6 flip. Epic 0's A-4 already slipped once (was meant for Story 1.17, never landed) — this is its gated re-home. [Source: .decision-log.md 2026-06-20-054; inventory-roster.md Row 6]
2. **Gate teeth-activation** (Decision 055, AI-7) → AC6 / Task 8. `pii-scrape` live-render + `friction-budget` page-weight manifest (+ critical-render-path disposition) + `microcopy` copy_globs. [Source: .decision-log.md 2026-06-20-055]
3. The meta-check (CR-D0-AI39, deferred-work.md L1360) is satisfied **by this file**: the named ACs are present (AC6/AC7). At code review, confirm they were actually implemented (not re-deferred). [Source: deferred-work.md L1360]

### Testing standards
- Co-located vitest unit tests for `src/lib/*.ts` (render module, config). Integration in `tests/integration/`; the scrape spec at `tests/integration/public-pages/scrape-test.spec.ts`. e2e (Playwright) optional for the JS-off render (AC3). [Source: architecture §"Test organization" L4619-4623]
- Live-DB suites need `DATABASE_URL` on `:5433` (`twt-test-pg`). **Never regenerate an applied migration; never `DROP SCHEMA` reset; assert membership not counts** ([[project_live_db_test_gotchas]]). Task 4's `listEffectiveClauses` integration test is the main DB-touching addition.
- Merge gate = `pnpm ci:local` green (GitHub Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Watch the `onSend`/header-timing class of bug if you add response-header hooks ([[project_fastify_onsend_doublesend]] — though Astro routes, not Fastify, set these here).

### Project Structure Notes
- New app surface lives entirely in `apps/public/` per architecture §Project Structure L4208-4226 (`astro.config.mjs`, `src/pages/`, `src/layouts/`, `src/components/`, `src/lib/`, `public/`). The directory tree already reserves `niyamavali.astro` (FR-79). [Source: architecture L4208-4226]
- §4.11 maps "Public Pages + PII (FR-74..80)" to `apps/public/` **+** `apps/api/src/modules/public-pages/`; the **API half is Epic 11b** (authenticated fragments) — Story 2.5 is the `apps/public/` half + the domain read. No new `apps/api` module is created here. [Source: architecture §4.11 L4529; deferred-work.md L200]
- Domain change is additive (`listEffectiveClauses` in `read.ts` + barrel) — no migration needed for the read (the Story 2.3 tables already exist). Migration is needed ONLY if you discover a missing index for the effective-set query; if so, generate ONCE + hand-supplement, never regenerate ([[project_live_db_test_gotchas]]).
- Variance: the epic AC names `@twt/ui`; the shipped consumable is `@twt/tokens` — documented above, not a conflict to re-litigate.

### References
- [Source: epics.md#Story-2.5 L1492-1521] — the five epic ACs (AC1–AC5 derivation).
- [Source: epics.md#Epic-2 L1385-1403] — Epic 2 framing, the Niyamavali seam (Epic 2 = shape + public render; Epic 4 = engine), freeze table row 8 (AR-48 foundation here) + row 14 (shape-vs-engine seam).
- [Source: architecture.md §"Cross-surface rendering policy" L498-545] — composition contract, cache-safe SSR guarantee, registry-declared fragments, auth boundary at API.
- [Source: architecture.md L557-601] — Astro 6 SSR scaffold; L2475 (`apps/public` = SEO SSR, minimal JS); L2553-2570 (Astro Actions forms — only if a form is added); L2685 (Astro file-system routing); L2811 (Astro Image); L2827 (Snapdragon-4 device target); L3796 (Astro component test carve-out); L4208-4226 (directory); L4429 (scrape-test slot); L4529 (§4.11 mapping).
- [Source: packages/domain/src/niyamavali/read.ts] — `resolveByClauseId` L25, `versionsOfClause` L141, `listClauses` L107 (the gap); diff.ts `computePayloadDiff` L91.
- [Source: packages/domain/src/db.ts] — `withPariwarScope` L161, `setPariwarScope` L107, `bindScopedDb` L147; apps/api/.../multi-tenant/scope-tx.ts (`openScopeTx`, `REQUEST_ROLE='twt_app'`).
- [Source: packages/domain/src/pariwar-passport/read.ts] — branding bundle reads (L8 names the public Astro shell).
- [Source: packages/contracts/src/public-pages/scrape.ts] — the PII scrape engine; public-vs-private-matrix.yaml (`surfaces: []`); scripts/check-pii-scrape.ts (`loadSnapshots()` `[]`).
- [Source: packages/contracts/src/rules/clause.ts L17-29] — the **browser-bundle constraint** (contracts must not import `@twt/domain`; apps/public/admin break otherwise).
- [Source: packages/i18n/src/index.ts + README §"Server consumers" L82-88] — server-safe `t`/`getLocale`; the `@twt/i18n/react` subpath split re-trigger.
- [Source: packages/tokens/src/index.ts + package.json `exports['./theme.css']`] — design tokens + Tailwind v4 theme; `@twt/ui` is an empty stub.
- [Source: .decision-log.md Decision 2026-06-20-054 (AI-3) + 2026-06-20-055 (AI-7)] — the re-homed inventory + gate-teeth obligations (AC6/AC7).
- [Source: _bmad-output/implementation-artifacts/gate-inventory.md Category B/C] — `pii-scrape` / `microcopy` / `friction-budget` re-trigger rows.
- [Source: docs/launch-gate-inventory/inventory-roster.md Row 6 L89-101] — P0-4 Empty/Skeleton/Error inventory closure path.
- [Source: friction-budget.yaml L41-65] — the pre-declared `apps/public` surface + `page-weight.json` manifest + `critical_render_path_ms` deferred metric.
- [Source: microcopy.yaml L13/L96] — `copy_globs: []` (populate for member surface).
- [Source: deferred-work.md] — re-triggers: L24 (display contract), L92/L1344 (i18n `/react` split), L200/L202/L1022 (scrape spec D13-1.2/D8-1.5), L495 (Astro Actions runtime — only if a form lands), L1303 (friction-budget per-route), L1334/L1336/L1338 (scrape engine caveats), L1360 (CR-D0-AI39 meta-check).
- [Source: apps/public/{package.json,Dockerfile,tsconfig.json,src/index.ts,tests/smoke.test.ts}] — the stub being replaced.
- [Source: .github/workflows/ci.yml + scripts/ci-local.sh] — the 14+ job gate ([[project_ci_actions_suspension_local_mirror]]).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — BMAD dev-story workflow.

### Debug Log References

- Merge gate: `pnpm ci:local` with `DATABASE_URL` on `:5433` → **16/16 jobs green** (lint, typecheck, build, test, db-check, contracts-determinism, crypto-check, tokens-theme-check, i18n-parity, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, cadence-check, integration-tests).
- `listEffectiveClauses` live-DB spec: 6/6 (membership-not-counts; cross-tenant isolation). Render module: 6/6. Scrape spec: 4/4 (incl. negative control). i18n suite after `/react` split: 51/51.
- Astro build: `js_bundle_bytes: 0` (zero hydrated islands), `page_weight_bytes: 4025` (extracted CSS). Live standalone server smoke: `GET /niyamavali` → 200, `Cache-Control: public, max-age=60, s-maxage=300`, `Vary: Accept-Language`, **zero `Set-Cookie`** (cache-safe verified); hi/en server-roundtrip toggle, version-history selector, and 404 (noindex) all confirmed.
- Fixes during dev: `defineConfig` from `astro/config` (not `astro`); test-fixture `Partial<ClauseVersionRow>` intersection re-branded `clauseId` (switched to an explicit fixture shape); `env.d.ts` triple-slash-reference eslint carve-out for `**/*.d.ts`; `per-user`→`per-visitor` comment hygiene for the microcopy member-register scan.

### Completion Notes List

- **All 9 tasks + AC1–AC9 implemented; `ci:local` 16/16 green.** First public unauthenticated surface (`apps/public`) replaced the `tsc` stub with a real Astro 6 Node-standalone SSR app; the public Niyamavali render reads the Story 2.3 registry via the new `listEffectiveClauses` accessor under an unauthenticated `withPublicScope` (twt_app + RLS, NOT a superuser bypass — AC8).
- **Cache-safety is structural (AC1/AC4):** no session read ⇒ zero `Set-Cookie` (verified on the live server); public-tier fields only; `js_bundle_bytes: 0` makes "works with JS disabled" structural (AC3); the PII scrape integration spec is the regression guard (AC5/AC6a) with a negative control proving teeth.
- **Three re-homed obligations all landed (not re-deferred — meta-check CR-D0-AI39 satisfied):** AC6 gate teeth — `friction-budget` member-public-web baselines committed + `critical_render_path_ms` deferral WRITTEN (Decision 055(b)); `microcopy` `copy_globs` populated with the `niyamavali` member copy (green-with-teeth); `pii-scrape` live-render ENFORCING. AC7 — the P0-4 empty/skeleton/error inventory authored (`docs/ux/empty-skeleton-error-inventory.md`, all 5 surfaces, no `<TBD>`, skeleton N/A-by-design recorded) + roster Row 6 `open`→`in-progress`.
- **INTEGRITY FLAG (read at review):** AC7's **≥2-trustee ratification** of the inventory is recorded **un-attested / pending** (Decision 2026-06-21-058 is `Solo-builder-author-committed`), per [[feedback_record_unattested_no_backfill]] — the dev workflow author-committed the artifact but did NOT fabricate a Trustee-Panel session. Row 6 is `in-progress` (NOT `closed` — which the story itself reserves for Epic 11a). **A reviewer must convene the Trustee Panel to ratify before treating AC7's ratification leg as complete.**
- **Documented variances (defensible, not re-litigated):** (1) tokens consumed as a `:root` block from `@twt/tokens` (the `@theme` Tailwind artifact needs a Tailwind pipeline this minimal-JS surface omits; values identical) — `@twt/ui` is still a stub; (2) the architecture-committed root `tests/integration/public-pages/scrape-test.spec.ts` slot is **realized inside the `@twt/public` workspace** (clean `@twt/*` + transitive-dep resolution + runs in the existing `test` CI job every PR) — root README points there.
- **One open architectural question (deferred to architect, ADR-0022 §3):** the data path reads public-tier Niyamavali directly from `@twt/domain` (the public renderer holds DB creds — acceptable under twt_app+RLS+public-tier-only+scrape-gate); the thin-`apps/api`-endpoint alternative is recorded, not silently chosen. ADR-0022 drafted (new-vs-extension confirmation is a review-time item).
- Governance bookkeeping complete: ADR-0022 + adr-index (counts 139→140, drafted 17→18); gate-inventory flips; deferred-work Story 2.5 section (Closed-by-edit vs Resolved-via-deferral honestly per [[feedback_closure_language_precision]]); `turbo.json` `globalEnv` += `PUBLIC_PARIWAR_ID`/`PUBLIC_SITE_ORIGIN`; `.gitignore` += `.astro/`.

### File List

**New — `apps/public` Astro app:**
- `apps/public/astro.config.mjs`
- `apps/public/COMPOSITION-CONTRACT.md`
- `apps/public/scripts/page-weight.mjs`
- `apps/public/src/env.d.ts`
- `apps/public/src/layouts/PublicShell.astro`
- `apps/public/src/lib/db.server.ts`
- `apps/public/src/lib/pariwar.server.ts`
- `apps/public/src/lib/theme.server.ts`
- `apps/public/src/lib/niyamavali-render.ts`
- `apps/public/src/pages/index.astro`
- `apps/public/src/pages/niyamavali.astro`
- `apps/public/src/pages/404.astro`
- `apps/public/src/pages/500.astro`
- `apps/public/tests/niyamavali-render.test.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`

**Modified — `apps/public` scaffold (replaced the stub):**
- `apps/public/package.json`, `apps/public/tsconfig.json`, `apps/public/eslint.config.js`, `apps/public/vitest.config.ts`, `apps/public/Dockerfile`
- `apps/public/src/index.ts` (deleted), `apps/public/tests/smoke.test.ts` (deleted)

**Domain (the read accessor):**
- `packages/domain/src/niyamavali/read.ts` (added `listEffectiveClauses`)
- `packages/domain/tests/integration/niyamavali/list-effective-clauses.spec.ts` (new)
- `packages/domain/tests/integration/_helpers.ts` (seed helper `deprecatedAt` option)

**i18n (`@twt/i18n/react` split + niyamavali namespace):**
- `packages/i18n/src/react.ts` (new), `packages/i18n/src/{locale,resolver,index,catalog}.ts`, `packages/i18n/package.json`, `packages/i18n/README.md`, `packages/i18n/tests/hooks.test.ts`
- `packages/i18n/locales/{en,hi}/niyamavali.json` (new)

**Gates + config:**
- `friction-budget.yaml`, `microcopy.yaml`, `turbo.json`, `.gitignore`

**Governance:**
- `docs/adr/ADR-0022-public-astro-ssr-shell-cache-safety.md` (new)
- `docs/ux/empty-skeleton-error-inventory.md` (new)
- `docs/knowledge-transfer/adr-index.md`, `docs/launch-gate-inventory/inventory-roster.md`, `.decision-log.md` (Decision 2026-06-21-058)
- `_bmad-output/implementation-artifacts/{gate-inventory.md,deferred-work.md,sprint-status.yaml}`
- `tests/integration/README.md`

### Change Log

| Date | Change |
| --- | --- |
| 2026-06-21 | Story 2.5 implemented: `apps/public` Astro 6 SSR shell (AR-48) + public Niyamavali render with version/diff selectors; `listEffectiveClauses` domain accessor; `@twt/i18n/react` subpath split; pure render module + PII scrape live-render spec; cache-safe SSR (verified zero `Set-Cookie`); gate teeth-activation (friction-budget baselines + microcopy member copy_globs + pii-scrape ENFORCING); P0-4 empty/skeleton/error inventory (≥2-trustee ratification un-attested-pending); ADR-0022 drafted; governance bookkeeping. `pnpm ci:local` 16/16 green. Status → review. |

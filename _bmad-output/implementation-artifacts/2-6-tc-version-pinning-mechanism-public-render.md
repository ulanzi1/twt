# Story 2.6: T&C Version-Pinning Mechanism + Public Render (Pending Legal Review per Story 0.13) `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Trustee Panel**,
I want **a T&C entity version-pinned to a specific Niyamavali version, with public render at `twt.org/terms`, marked "pending legal review" until the Story 0.13 engagement returns**,
so that **members can read the T&C and accept it at signup (Epic 3 consumer via Story 2.7 consent registry), and historical T&C versions remain recoverable for any past acceptance**.

## Context & boundaries (read first)

This is the **third public-surface / registry pairing in Epic 2** and it slots directly into the seam Story 2.5 built:

- **Story 2.3** built the Niyamavali registry PRIMITIVE (`clause_versions` + `niyamavali.*` accessors + tenant-isolated RLS).
- **Story 2.4** built the admin amendment WORKFLOW (`apps/api/src/modules/rules/`) with the **audit-or-throw publish** pattern.
- **Story 2.5** built the **public Astro SSR shell** (`apps/public`) + the public Niyamavali render, reading the registry directly from `@twt/domain` under an **unauthenticated `withPublicScope`** (`twt_app` + RLS, *not* a superuser bypass).

**Story 2.6 mirrors all three.** It is a vertical slice — new registry table + domain accessors + RLS + migration (mirror 2.3), trustee endpoints with audit-or-throw (mirror 2.4), and a new public page (`/terms`) on the *existing* shell (mirror 2.5). **You are not inventing patterns; you are following the ones already in the tree.** Cite them and match them.

**What is NOT in this story (scope fences):**
- **No rule-evaluation logic.** Niyamavali payload stays opaque (freeze row 14). The T&C only *references* clause versions by id; it never interprets them.
- **No consent recording.** Story 2.7 builds the consent registry; Epic 3 records acceptance. 2.6 only guarantees `tc_version_id` is a stable, recoverable handle that 2.7/Epic 3 will point at (epic AC3).
- **No dedicated `apps/admin` T&C screen.** Story 2.4 explicitly required the Niyamavali admin UI; the 2.6 ACs do **not** name a T&C admin screen, and a full admin editor UI is **explicitly deferred** (BigDev decision 2026-06-24). The trustee actions (create version, approve) are exposed as **`apps/api` endpoints** with audit logging; a placeholder T&C is **seeded** so `/terms` renders for the demoable closure. A polished `apps/admin` authoring/approval screen is a later story.

### Settled decisions (BigDev, 2026-06-24) — these are firm, not open
1. **Trustee API endpoints + audit logging + a seeded/demo T&C: in scope. Full admin editor UI: deferred.** (Tasks 6, 7 = API + audit; Task 7 = seed; no `apps/admin` work.)
2. **RBAC keys `tc.publish` + `tc.approve` introduced; `PERMISSION_CATALOG_VERSION` bumped 1→2.** (Task 5.)
3. **Markdown pipeline = `unified` + `rehype-sanitize`** (the recommended option). Sanitizer tests MUST explicitly cover `javascript:` (and `data:`) URL schemes (Task 2, AC3).
4. **Clause pinning uses a real link table, not a `text[]` column** — a junction table with FK referential integrity to `clause_versions`, replacing `pinned_to_clause_version_ids text[]`. This is a deliberate variance from the epic AC's literal `text[]` wording (epics.md L1532): semantically identical (the set of pinned clause versions) but FK-enforced. (Tasks 1, 3, 4.)

## Acceptance Criteria

Derived from epics.md §Story 2.6 (L1522–L1543); expanded for implementation precision. Source for AC1/AC4/AC5 = epic AC block 1; AC6 = block 2; AC8 = block 3.

1. **AC1 — `terms_and_conditions_versions` table + `terms_and_conditions_pinned_clauses` link table.** The main table carries: `tc_version_id` (uuid PK), `pariwar_id`, `version` (integer, monotonically increasing per Pariwar, `>= 1`), `body_markdown` (canonical content), `body_html_rendered` (precomputed sanitized HTML for cache-safe SSR), `effective_from`, `effective_until` (nullable), `legal_review_status` (enum `pending | under-review | reviewed-with-changes-required | approved | superseded`), `legal_reviewer_actor_id` (nullable; populated when `approved`), `audit_id`, plus authorship columns (`authored_by_actor` nullable, `authored_at` default now()). Clause pinning lives in a **junction table** `terms_and_conditions_pinned_clauses` (`tc_version_id` FK → `terms_and_conditions_versions`, `clause_version_id` FK → `clause_versions`, `pariwar_id` for RLS, PK `(tc_version_id, clause_version_id)`) — replacing the epic's literal `pinned_to_clause_version_ids text[]` with FK-enforced referential integrity (documented variance; see Dev Notes). DB columns snake_case; TS fields camelCase. Both tables tenant-isolated RLS (NOT cross-readable — mirror `clause_versions`). Migration generated once + hand-supplemented (GRANT + FORCE RLS + enum + invariant guard + the two FKs); **never regenerated**.

2. **AC2 — Domain accessors (mirror `niyamavali/read.ts` + `write.ts`).** Read: `getEffectiveTc(db, pariwarId, asOf?)` returns the single version where `effective_from <= asOf AND (effective_until IS NULL OR asOf < effective_until)` (newest if ambiguous), `asOf` defaulting to **DB `now()`** (§1.11 DB-authoritative time — never an app-server clock); `resolveByTcVersionId(db, pariwarId, tcVersionId)` (exact historical version); `latestTcVersion(db, pariwarId)` (head for version increment); `listTcVersions(db, pariwarId, {limit})` (forced-pagination, Story 1.14). Write: `createTcVersion(...)` (version = latest + 1; validates each pinned `clause_version_id` exists in the Pariwar), `approveTcVersion(...)`, `supersedeTcVersion(...)`. Every accessor takes explicit `pariwarId` (indexed predicate + cross-tenant defense-in-depth) alongside RLS.

3. **AC3 — `body_html_rendered` is precomputed & sanitized.** A pure markdown→HTML helper renders `body_markdown` to **sanitized** HTML at **write time** (consumed by `createTcVersion`), stored in `body_html_rendered`. Sanitization strips `<script>`, inline event handlers (`onerror=`, `onclick=`, …), and `javascript:`/`data:` URLs — defense-in-depth even though the author is a trustee, because the output is rendered **unauthenticated and edge-cached** (a stored XSS would be served to every visitor). A co-located unit test asserts those vectors are stripped and benign markdown (headings, lists, links, emphasis) survives.

4. **AC4 — Public `/terms` page (mirror `niyamavali.astro`).** A new `apps/public/src/pages/terms.astro` renders the current effective T&C version: fully server-rendered (no client island; works with JS disabled), Hindi/English toggle is a server roundtrip, edge-cacheable (`Cache-Control: public, max-age=60, s-maxage=300`, `Vary: Accept-Language`), **no session / no member-state / no PII** in the HTML. Renders `body_html_rendered` via Astro `set:html` (already sanitized). A dignified empty state shows when no T&C is published. `body_html_rendered` is rendered; `body_markdown` MAY be rendered; `legal_reviewer_actor_id`/`audit_id`/`authored_by_actor` are **never** rendered.

5. **AC5 — Provisional banner.** When `legal_review_status ∈ {pending, under-review}`, the page shows a banner with the **exact copy** "This T&C is provisional pending legal counsel review; revisions may follow before final publication" (English) + a Hindi-parity translation. When `approved`, the banner is absent. Banner-selection logic lives in a tested `.ts` lib module, not in the `.astro` frontmatter.

6. **AC6 — Approve transition (RBAC-gated, audit-logged).** A trustee endpoint marks a T&C `approved`: sets `legal_reviewer_actor_id` = the acting trustee, flips `legal_review_status` → `approved`, and **supersedes the prior currently-effective T&C** (sets its `effective_until` and `legal_review_status` → `superseded`). The transition emits a single audit line (action recorded via Story 1.10 `audit.writeAuditEntry`, **audit-or-throw**: audit written first, propagate-on-throw rolls back the scope tx). The superseded prior version remains queryable by `tc_version_id` for historical attestation.

7. **AC7 — Create-version endpoint (RBAC-gated, audit-or-throw).** A trustee endpoint creates a new T&C version pinned to a list of `clause_version_id`s (each validated to exist in the Pariwar). `version` = monotonic next per Pariwar; `legal_review_status` defaults to `pending`; `body_html_rendered` is the precomputed sanitized render of `body_markdown`. Audit-or-throw (mirror the publish path in `rules/index.ts`). The new RBAC permission key(s) gate the route; denial routes through the standard audited 403.

8. **AC8 — Stable recoverable handle (epic AC3).** `tc_version_id` is immutable and never reused; `resolveByTcVersionId` recovers any historical version exactly (the reference target Story 2.7's consent registry and Epic 3's acceptance flow will store). 2.6 does **not** record consent — it only proves the handle is durable and resolvable.

9. **AC9 — Gates stay green-with-teeth (do not let them decay).** `pii-scrape` integration spec extended to render `/terms` and assert no naked PII / tier leak; `microcopy.yaml` `copy_globs` += the `terms` locale files; `friction-budget.yaml`'s `member-public-web` baseline re-measured and updated to account for `/terms`'s static-asset contribution (the surface is a single whole-app aggregate, not per-route — see Task 9); the empty/skeleton/error inventory (`docs/ux/empty-skeleton-error-inventory.md`) extended to cover the `/terms` surface. `COMPOSITION-CONTRACT.md` public-surfaces table += `/terms`. Merge gate = `pnpm ci:local` green.

10. **AC10 — Transport contracts + lockstep.** `@twt/contracts` exposes the T&C DTOs (`TcVersionResponse`, `CreateTcVersionRequest`, `ApproveTcVersionRequest`, `TcLegalReviewStatusSchema`). The status `z.enum` is **lockstep-asserted** against the schema `pgEnum` in a contracts test (mirror the `BenefitMechanism` ↔ `benefit_mechanism` discipline). Contracts MUST NOT import `@twt/domain` (browser-bundle constraint). New endpoints register via `.openapi()` → `openapi/v1.yaml` changes (expected).

## Tasks / Subtasks

- [x] **Task 1 — Domain: schema + ids + RLS + migration** (AC: 1)
  - [x] Add `TcVersionId` brand + `tcVersionId()` smart constructor to `packages/domain/src/ids/index.ts` (UUID brand — reuse `uuidBrand`, mirror `ClauseVersionId` at L125-127). "Branding mandatory on a new id's first PR."
  - [x] Create `packages/domain/src/schema/terms_and_conditions_versions.ts` mirroring `clause_versions.ts` structure: `pgEnum('tc_legal_review_status', ['pending','under-review','reviewed-with-changes-required','approved','superseded'])`; the main-table columns in AC1 (NO `pinned_…` column — pins live in the link table); `check(version >= 1)`; `uniqueIndex(pariwar_id, version)`; `index(pariwar_id, effective_from desc)`; **partial unique** `(pariwar_id) WHERE effective_until IS NULL` to enforce "at most one open-ended current version" — declare it via `uniqueIndex(...).where(sql\`effective_until IS NULL\`)`, exactly mirroring `clause_drafts.ts`'s `clause_drafts_pariwar_clause_open_uq` (L141-143). drizzle-kit emits the partial predicate correctly from this builder — confirmed by migration `0015`'s own header, which lists that index among the drizzle-kit-GENERATED statements, not the hand-supplements. No hand-supplement needed for this index. Export `TcVersionRow` / `TcVersionInsert`.
  - [x] Create `packages/domain/src/schema/terms_and_conditions_pinned_clauses.ts` — the junction table: `tcVersionId` (uuid, `.references(() => termsAndConditionsVersions.tcVersionId, { onDelete: 'cascade' })`), `clauseVersionId` (uuid, `.references(() => clauseVersions.clauseVersionId)`, branded `ClauseVersionId`), `pariwarId` (uuid, RLS predicate column), `createdAt` (default now()); composite PK / `uniqueIndex(tc_version_id, clause_version_id)`; `index(pariwar_id, tc_version_id)`. Export `TcPinnedClauseRow` / `TcPinnedClauseInsert`. (The FK to `clause_versions` is the referential-integrity guard the `text[]` design lacked.)
  - [x] Add both tables to `packages/domain/src/schema/index.ts` barrel.
  - [x] Create RLS policies for BOTH tables (`policies/terms-and-conditions-versions-rls.ts` + `policies/terms-and-conditions-pinned-clauses-rls.ts`) mirroring `clause-versions-rls.ts` (tenant-isolation select + write, `for: 'all'`, `withCheck`; NOT cross-readable). Add both to `packages/domain/src/policies/index.ts`.
  - [x] Generate the migration ONCE: `pnpm --filter @twt/domain db:generate` → produces `0016_*.sql` (+ `meta/0016_snapshot.json`, `_journal.json` entry). Then **hand-supplement** (mirror the header banners in `0014`/`0015`): `GRANT SELECT, INSERT, UPDATE ON terms_and_conditions_versions TO twt_app` (NOT DELETE — a version is `superseded`, never row-deleted) + `GRANT SELECT, INSERT, DELETE ON terms_and_conditions_pinned_clauses TO twt_app` (link rows may be deleted if a draft's pin set is edited before publish — confirm against the write path; if pins are immutable-post-create, drop DELETE); `ALTER TABLE … FORCE ROW LEVEL SECURITY` on both; the `CREATE TYPE tc_legal_review_status` (drizzle emits from the pgEnum). The partial unique index (declared via `.where()` per Task 1 above) and the two FKs are also drizzle-kit-emitted — confirm both are present in the generated SQL rather than hand-writing them. Add the `⚠ DO NOT REGENERATE` banner. **NEVER regenerate after apply** (drizzle skips by journal `when`, not SQL hash → silently drops hand-supplements → 42P07). [[project_live_db_test_gotchas]]
  - [x] `pnpm --filter @twt/domain db:check` must pass (snapshot tracks both new tables + their policies).

- [x] **Task 2 — Domain: markdown→sanitized-HTML helper** (AC: 3)
  - [x] Add ONE pinned markdown renderer + sanitizer as a **direct** dependency of `@twt/domain` (today it has zero markdown deps). **Recommended:** the `unified` + `remark-parse` + `remark-rehype` + `rehype-sanitize` + `rehype-stringify` pipeline (already present transitively via Astro; `rehype-sanitize` is the purpose-built allowlist step). **Alternative:** `markdown-it` (`{ html: false }`) + `sanitize-html`. Pick one, pin the version, record the choice + allowlist in the ADR (Task 9).
  - [x] Create `packages/domain/src/terms-and-conditions/render-markdown.ts`: `renderTcMarkdown(markdown: string): string` — deterministic, returns sanitized HTML. No raw-HTML passthrough; strip `<script>`/event-handler attrs/`javascript:`+`data:` URLs.
  - [x] Co-located unit test (explicit cases): `<script>alert(1)</script>` removed; `<img src=x onerror=alert(1)>` event-handler stripped; **`[x](javascript:alert(1))` and `[x](data:text/html,…)` link hrefs neutralized**; an `<a href="javascript:…">` and `<img src="javascript:…">` in raw HTML neutralized; assert the allowlist keeps benign markdown (headings, lists, links to `http(s)`, emphasis, code). `rehype-sanitize`'s default schema already drops `javascript:`/`data:` and event handlers — the test pins that behavior so a future schema override can't silently regress it. (Pure module → unit-testable; do NOT put render logic in `.astro`.)

- [x] **Task 3 — Domain: T&C accessors module** (AC: 2, 6, 7, 8)
  - [x] Create `packages/domain/src/terms-and-conditions/{read,write,errors,index}.ts` mirroring `packages/domain/src/niyamavali/`.
  - [x] `read.ts`: `getEffectiveTc` (effective-window, DB `now()` default — mirror `resolveByClauseId`'s `asOf === undefined ? sql\`… <= now()\` : lte(...)` construction), `resolveByTcVersionId`, `latestTcVersion`, `listTcVersions` (forced-pagination ceiling), `listPinnedClauses(db, pariwarId, tcVersionId)` (the linked `clause_version_id`s for a T&C version — read from the junction table).
  - [x] `write.ts`: `createTcVersion` (version = `(latestTcVersion?.version ?? 0) + 1`; `body_html_rendered = renderTcMarkdown(body_markdown)`; accept caller-supplied `tcVersionId` + `auditId` like `createClause`'s NewClauseFields for the audit-first publish path; **insert the main row AND the `terms_and_conditions_pinned_clauses` link rows in the caller's tx — atomic**). Pin handling: keep a **typed pre-check** (`niyamavali.resolveByClauseVersionId(db, pariwarId, id)` must return a row → nicer error than a raw FK 23503) AND rely on the link FK as the hard guard; map a 23503 to a typed `TcPinnedClauseNotFoundError`. The pre-check ALSO enforces **same-Pariwar** pins (the FK alone permits any global `clause_version_id`; `resolveByClauseVersionId` returns a row only when `pariwar_id` matches — this is the cross-tenant guard, so it is NOT optional). `approveTcVersion` (status→approved + set `legal_reviewer_actor_id`); `supersedeTcVersion` (status→superseded + set `effective_until`). Run statements directly on the passed `db` (caller owns the tx — RLS scope is tx-scoped; mirror `niyamavali/write.ts` "Transaction contract").
  - [x] `errors.ts`: `TcVersionNotFoundError` + code, `TcStateError` (illegal transition, e.g. approving an already-superseded version) + code, `TcPinnedClauseNotFoundError` (a pin references a clause version absent / cross-tenant) + code — mirror `niyamavali/errors.ts`. Surface top-level from `@twt/domain` index (mirror the `ClauseNotFoundError` export) so the apps/api error-mapping middleware maps them to HTTP (the pin error → 409/422).
  - [x] Export `export * as termsAndConditions from './terms-and-conditions/index.js'` from `packages/domain/src/index.ts` (mirror the `niyamavali` namespace export).
  - [x] Integration spec (`packages/domain/tests/integration/terms-and-conditions/*.spec.ts`): effective-window selection; approve→supersede flips the prior; `resolveByTcVersionId` recovers a superseded version (AC8); cross-tenant isolation. **Assert membership, not counts** (own-committing writers accumulate rows) and never `DROP SCHEMA` reset. [[project_live_db_test_gotchas]] Needs `DATABASE_URL` on `:5433` (`twt-test-pg`).

- [x] **Task 4 — Contracts: T&C transport DTOs + lockstep** (AC: 10)
  - [x] Create `packages/contracts/src/terms-and-conditions/` (mirror `rules/`): `tc-version.ts` with `TcLegalReviewStatusSchema = z.enum([...])`, `TcVersionResponse` (includes `pinnedToClauseVersionIds: z.array(uuid)` — the wire shape stays a flat array; the API recomposes it from the link table via `listPinnedClauses`), `CreateTcVersionRequest` (`bodyMarkdown`, `pinnedToClauseVersionIds: z.array(uuid).min(1)`, `effectiveFrom` — the API decomposes the array into link rows), `ApproveTcVersionRequest`; `index.ts` barrel. Re-export from `packages/contracts/src/index.ts`. (The link table is an internal storage detail; the contract stays array-shaped so the wire/OpenAPI is unchanged by the storage choice.)
  - [x] **Lockstep test** (`packages/contracts/tests/...`): assert `TcLegalReviewStatusSchema.options` deep-equals the domain `tcLegalReviewStatusEnum.enumValues` (mirror `packages/contracts/tests/rules.test.ts` benefit-mechanism assertion — the legal import direction is contracts→domain).
  - [x] Register endpoint DTOs via `.openapi()` (mirror the Story 2.4 clause endpoints) and run the openapi emit; `openapi/v1.yaml` will change (expected). Contracts MUST NOT import `@twt/domain` (browser-bundle constraint — see `packages/contracts/src/rules/clause.ts` header).

- [x] **Task 5 — RBAC: permission keys + role grants** (AC: 6, 7)
  - [x] Append `tc.publish` + `tc.approve` to `SEED_PERMISSION_KEYS` in `packages/domain/src/rbac/permissions.ts` AND the contracts mirror `packages/contracts/src/rbac/permissions.ts` (keep lockstep). Bump `PERMISSION_CATALOG_VERSION` 1→2 per the file's stated convention. (Checked: the only existing reference, `packages/domain/tests/rbac/permissions.test.ts:45`, asserts `PERMISSION_CATALOG.catalogVersion === PERMISSION_CATALOG_VERSION` — a tautological self-comparison against the constant, not a literal-pinned value — so the bump requires no consumer update.)
  - [x] Grant in `packages/domain/src/rbac/roles.ts`: `pariwar_admin` += both keys; `state_trustee` += `tc.approve` (the "Trustee Panel" approves). Update `tests/rbac/roles.test.ts` referential-integrity expectations (every bundle key must be a catalog key).

- [x] **Task 6 — apps/api: T&C trustee module** (AC: 6, 7)
  - [x] Create `apps/api/src/modules/terms-and-conditions/index.ts` mirroring `apps/api/src/modules/rules/index.ts`: routes under `/api/v1/p/:pariwarId/terms`. `POST /versions` (create, key `tc.publish`), `POST /versions/:tcVersionId/approve` (key `tc.approve`). Neither AC6 nor AC7 names a read/list endpoint — do not add `GET /versions` routes speculatively (the story's own "no admin UI" scope fence applies here too); the public `/terms` page (Task 8) is the only required read path for this story. Chain the two write routes `[requireAdminSession, scopeResolutionHook, requirePermissionHook]`; rate-limits via `namedRateLimits`.
  - [x] **Audit-or-throw** (mirror `rules/index.ts` publish, L491-558): pre-generate `tcVersionId`; build a provenance digest (`canonicalJsonStringify` → sha256) committing to `pinned_to_clause_version_ids` + `tc_version_id` + `version` + transition; `audit.writeAuditEntry(deps.servicePool, {... action, resourceLocator: 'tc:version:<id>' ...})` FIRST; pass `auditId` into the domain write; a throw propagates → scope tx rolls back → no version/approval without an audit line. Approve route additionally calls `supersedeTcVersion` on the prior effective version inside the same tx.
  - [x] `responses.ts` mapper (`toTcVersionResponse(row, pinnedClauseVersionIds)`) — mirror `rules/responses.ts`; the handler fetches pins via `listPinnedClauses` and folds them into the array-shaped response.
  - [x] Register in `apps/api/src/server.ts` (`registerTermsModule(app, deps)` alongside `registerRulesModule` at ~L90).
  - [x] Route tests: create + approve happy path (audit row written, prior superseded); RBAC denial (audited 403); approve of a non-existent/already-superseded version → typed 4xx. Watch the `onSend`/header-timing class of bug if you add response-header hooks. [[project_fastify_onsend_doublesend]]

- [x] **Task 7 — Seed a placeholder T&C** (AC: 4, 5 — demoable closure)
  - [x] Provide a way for `/terms` to render in the demo: seed a placeholder T&C body (`legal_review_status: 'pending'`, `effective_from: now`, pinned to ≥1 existing Bihar clause version) via a one-shot script under `scripts/`. (`packages/domain/src/per-pariwar/bihar/` is currently an empty scaffold — only `.gitkeep` + README, no seed-code precedent to mirror — so `scripts/` is the lower-risk path absent further direction.) The placeholder validates the version-pin mechanism (epic demoable closure: "validates against a placeholder T&C body"). Lawyer-review content lands later per Story 0.13 and does NOT gate this story.

- [x] **Task 8 — apps/public: `/terms` page + i18n** (AC: 4, 5, 8)
  - [x] Create `apps/public/src/lib/tc-render.ts` (pure, unit-tested): given a `TcVersionRow | null`, produce the render model — `{ hasContent, html, version, effectiveFrom, pinnedClauseIds, showProvisionalBanner }` where `showProvisionalBanner = status === 'pending' || status === 'under-review'`. Add `renderTcHtml(model: TcRenderModel): string` mirroring `niyamavali-render.ts`'s `renderNiyamavaliHtml(model)` — composes the provisional banner (if `showProvisionalBanner`) + `body_html_rendered` + version/effective-date labels into the single HTML string both `terms.astro` (via `set:html`) and the Task 9 scrape spec consume (fixture-fed, no live server — same pattern as the existing `renderNiyamavaliHtml` import in `scrape-test.spec.ts`). Keep ALL logic here (Astro component-test carve-out: `.astro` files have no co-located unit tests).
  - [x] Create `apps/public/src/pages/terms.astro` mirroring `niyamavali.astro`: read via `withPublicScope((sdb) => termsAndConditions.getEffectiveTc(sdb, ACTIVE_PARIWAR_ID))`; branding via `passport.getPariwarPassportCached`; locale via `getLocale`; wrap in `PublicShell`; build the model with `tc-render.ts` and render via `renderTcHtml(model)` + `set:html` (banner-selection logic stays in `tc-render.ts`, not the frontmatter, per AC5); dignified empty state when null; cache headers exactly as `niyamavali.astro` (L101-102).
  - [x] Add `packages/i18n/locales/{hi,en}/terms.json` (namespace `terms`): `page_title`, `page_intro`, `provisional_banner` (exact English copy in `en`; Hindi parity in `hi`), `pinned_label`, `effective_label`, `empty_title`, `empty_body`. Every `en` key MUST have an `hi` parity entry or `i18n:check-parity` fails. (The PublicShell language-toggle labels read from the `niyamavali` namespace — that namespace is loaded, so no change is needed; do not invert the member-facing Hindi-primary default.)
  - [x] Unit test `tc-render.ts` (banner-by-status; empty model). Optional Playwright e2e for the JS-off render.

- [x] **Task 9 — Gates, composition contract, ADR, governance** (AC: 9, 10)
  - [x] `apps/public/tests/integration/public-pages/scrape-test.spec.ts`: add a `/terms` case — import `renderTcHtml` from `lib/tc-render.ts` (mirror the existing `renderNiyamavaliHtml` import; fixture-fed, no live server/DB) and assert `detectNakedPii` finds nothing + no tier leak (matrix is still `surfaces: []`, so tier-leak is a no-op; `detectNakedPii` is the active assertion). Confirm `legal_reviewer_actor_id`/`audit_id`/`authored_by_actor` never appear.
  - [x] `microcopy.yaml` `copy_globs` += `packages/i18n/locales/{hi,en}/terms.json`.
  - [x] `friction-budget.yaml`: `member-public-web` is a single whole-app aggregate (`page-weight.mjs` sums everything under `dist/client/`, not per-route) — there is no new per-route entry to add. Re-run `pnpm --filter @twt/public build && node apps/public/scripts/page-weight.mjs` after `/terms` lands and update the existing `member-public-web.page_weight_bytes` baseline value if it shifted (a baseline-value update is not a ceiling raise, so the file's "ceiling change needs its own PR" rule doesn't apply).
  - [x] `docs/ux/empty-skeleton-error-inventory.md`: add the `/terms` surface row(s) (empty state + error). Row 6 stays `in-progress` (closes at Epic 11a — do NOT flip to `closed`). If a fresh ratification is needed, record honestly as un-attested-pending; **do not fabricate a Trustee-Panel session**. [[feedback_record_unattested_no_backfill]]
  - [x] `apps/public/COMPOSITION-CONTRACT.md`: add `/terms` to the public-shell-rendered surfaces table (Tier `public`, `index,follow`).
  - [x] Draft an ADR (next number after ADR-0022) recording: T&C registry shape + the **clause-pinning link-table variance** (vs the epic's `text[]`, with the FK + cross-tenant dual-guard rationale) + the supersede-on-approve effective-window invariant + the **markdown-sanitizer choice (`unified` + `rehype-sanitize`) & allowlist** + RLS-not-cross-readable rationale (mirror ADR-0020 for `clause_versions`). Update `docs/knowledge-transfer/adr-index.md` counts.
  - [x] Update `_bmad-output/implementation-artifacts/sprint-status.yaml` (the workflow does the `ready-for-dev` flip; the dev flips to `in-progress`/`review` per the ledger convention).

- [x] **Task 10 — Merge gate** (AC: all)
  - [x] `pnpm ci:local` green with `DATABASE_URL` on `:5433`. GitHub Actions is suspended — local mirror is the gate. [[project_ci_actions_suspension_local_mirror]] Expect changes to: `db-check`, `contracts-determinism`/openapi, `i18n-parity`, `pii-scrape`, `friction-budget`, `microcopy`, `schema-diff`, `lint`, `typecheck`, `build`, `test`, `integration-tests`.

### Review Findings

> Group A — Domain core (schema, ids, RLS, migration, accessors). Code review 2026-06-24. 1 decision-needed · 7 patch · 5 defer · 6 dismissed.

- [x] [Review][Patch] **D1→P8 — `supersedeTcVersion` missing `auditId` field** — Add `auditId?: string | null` to `SupersedeTcVersionInput` and include it in the `.set()` call so the superseded row links to the approve-transition audit entry (same entry passed by the approve route). Decision (BigDev, 2026-06-24): option A — both the approved row (via P2) and the superseded row reference the same approve-event audit id; one event, two row updates, one audit record. [`packages/domain/src/terms-and-conditions/write.ts:225–253`]

- [x] [Review][Patch] **P1 — Concurrent `createTcVersion` → unmapped 500 on 23505** — Two concurrent requests for the same pariwarId both compute `nextVersion = N+1`; the second hits the `(pariwar_id, version)` unique index → Postgres 23505, which is unhandled (only 23503 is caught in the FK block). Same root cause applies to concurrent genesis creates via the partial-unique index. Map 23505 → a typed domain error (409). Mirror `niyamavali/write.ts` `ClauseIdConflictError` pattern. [`packages/domain/src/terms-and-conditions/write.ts:~107, ~133`]

- [x] [Review][Patch] **P2 — `approveTcVersion` missing `auditId` field** — `ApproveTcVersionInput` has no `auditId` and the `.set()` call does not write it. The approve-transition audit row is written by the route but never linked to the updated `terms_and_conditions_versions` row; the row retains its creation `audit_id`. Add `auditId?: string | null` to `ApproveTcVersionInput` and include it in the `.set()` call. [`packages/domain/src/terms-and-conditions/write.ts:170–175, 204–208`]

- [x] [Review][Patch] **P3 — Misleading "DELETE is legitimate" comment in pinned-clauses RLS** — Comment at `terms-and-conditions-pinned-clauses-rls.ts` L34–36 states "DELETE is legitimate here (a draft's pin set may be re-built before publish)". This contradicts the migration (`GRANT SELECT, INSERT` — no DELETE), the schema header (pins are insert-only, immutable post-create), and the story spec. The `for: 'all'` policy is correct (mirror pattern); only the comment is wrong. Fix to match actual grant and intent. [`packages/domain/src/policies/terms-and-conditions-pinned-clauses-rls.ts:34`]

- [x] [Review][Patch] **P4 — `createTcVersion` allows empty `pinnedClauseVersionIds` at domain level** — No minimum-length guard in the domain accessor; only the contracts layer enforces `z.array(uuid).min(1)`. A caller bypassing the HTTP route (integration tests, seed scripts, future internal callers) can create a T&C version with zero pins, violating AC7. Add a domain-level guard at the top of `createTcVersion`. [`packages/domain/src/terms-and-conditions/write.ts:~95`]

- [x] [Review][Patch] **P5 — `TcPinnedClauseNotFoundError` from FK catch carries `pins.join(',')` as `clauseVersionId`** — When 23503 is caught after the link-row batch insert, `new TcPinnedClauseNotFoundError(input.pariwarId, pins.join(','))` is thrown. The error response's `detail.clause_version_id` becomes a comma-separated UUID string — invalid UUID format, non-actionable for callers with multiple pins. Replace with a clear sentinel string like `'(fk-violation — specific id unknown; race between pre-check and insert)'`. [`packages/domain/src/terms-and-conditions/write.ts:~153`]

- [x] [Review][Patch] **P6 — `listTcVersions` has no upper-bound cap on `limit`** — `opts.limit ?? 50` uses the caller-supplied value verbatim. Story 1.14 "forced-pagination" intent implies a hard ceiling. `body_markdown` + `body_html_rendered` are unbounded text columns; a large limit can saturate the connection. Add `Math.min(opts.limit ?? 50, 200)` or mirror the ceiling from the existing pagination patterns in the codebase. [`packages/domain/src/terms-and-conditions/read.ts:~130`]

- [x] [Review][Patch] **P7 — `currentOpenTcVersion` lacks ORDER BY tiebreaker** — Relies entirely on the partial-unique index for the "at most one" invariant, but adds no tiebreaker for the data-corruption scenario where two open rows exist. Without `ORDER BY`, the result is non-deterministic. Add `.orderBy(desc(termsAndConditionsVersions.version))` as a deterministic fallback. [`packages/domain/src/terms-and-conditions/read.ts:~107`]

- [x] [Review][Defer] **W1 — `supersedeTcVersion` callable on staged (non-open) version** [`packages/domain/src/terms-and-conditions/write.ts:243`] — deferred, pre-existing; not reachable through the 2.6 route (route always passes `currentOpenTcVersion` result, filtered `effectiveUntil IS NULL`); a domain-level guard would be a future hardening story.

- [x] [Review][Defer] **W2 — `isForeignKeyViolation` `.cause` branch is likely dead code** [`packages/domain/src/terms-and-conditions/write.ts:~82`] — deferred, pre-existing; `.cause?.code` is not a standard node-postgres error shape; branch is harmless but never fires; cleanup can land in a future refactor.

- [x] [Review][Defer] **W3 — `renderTcMarkdown` should use async `process()` for future plugin safety** [`packages/domain/src/terms-and-conditions/render-markdown.ts:47`] — deferred, pre-existing; `processSync` throws if any plugin is async; current plugin set is synchronous; risk materialises only when a future async plugin is added; migrate to async in a future hardening story.

- [x] [Review][Defer] **W4 — Orphaned audit line possible on concurrent approve race** — deferred, out of Group A scope; the race between the `servicePool` audit commit and the `withPariwarScope` tx rollback is a route-level concern; flagged for Group D review.

- [x] [Review][Defer] **W5 — `reviewed-with-changes-required` absent from provisional banner set** — deferred, out of Group A scope; `PROVISIONAL_STATUSES` in `apps/public/src/lib/tc-render.ts` omits this status; latent until a future route writes it; flagged for Group E review.

> Group C — Contracts + OpenAPI (`packages/contracts/src/terms-and-conditions/`, `tests/terms-and-conditions.test.ts`, `scripts/emit-openapi.ts`, `openapi/v1.yaml`). Code review 2026-06-24. 0 decisions-needed · 1 patch · 7 defer · 8 dismissed.

- [x] [Review][Patch] **P18 — Missing 409 on `POST /terms/versions` in `emit-openapi.ts`** — The create route throws `TcVersionConflictError` → HTTP 409 on concurrent creates (mapped in the error-mapping middleware, registered as `TcVersionConflictError` in domain). The OpenAPI path registration only listed 400/401/403/422; the 409 was absent. Added `409: errorResponse('Concurrent T&C version creation conflict — retry the request')` and re-ran `contracts:emit-openapi` to regenerate `openapi/v1.yaml`. [`packages/contracts/scripts/emit-openapi.ts:836`]

- [x] [Review][Defer] **W18 — `TcVersionResponse.pinnedToClauseVersionIds` has no `minItems: 1` on the response schema** — Create enforces `.min(1)` at the request boundary; the response schema is intentionally permissive (mirrors the raw DB state). Defer to a future hardening story if the invariant needs to be tightened on the wire.

- [x] [Review][Defer] **W19 — `bodyMarkdown` has no `.max()` cap on `CreateTcVersionRequest`** — Unbounded markdown sent to `renderTcMarkdown` at write time. No production incident; defer until a content-size policy is established.

- [x] [Review][Defer] **W20 — `version: 0` / negative rejection on `TcVersionResponse` not tested** — `z.number().int().positive()` rejects it but no test pins this; a schema relaxation to `z.number().int()` would go undetected.

- [x] [Review][Defer] **W21 — Missing required-field rejection tests on `CreateTcVersionRequest`** — `bodyMarkdown` and `effectiveFrom` absence is not tested; accidental `.optional()` would pass.

- [x] [Review][Defer] **W22 — `confirm: 'true'` / `1` coercion rejection not tested on `ApproveTcVersionRequest`** — `z.literal(true)` rejects both but the edge case is untested; a `.coerce.boolean()` refactor would go undetected.

- [x] [Review][Defer] **W23 — Approve-specific invariants (`legalReviewStatus=approved`, `auditId≠null`, `effectiveUntil=null`, `legalReviewerActorId≠null`) not in contract test** — Covered by API integration test (P11); contract-level enforcement of the approve shape would need a discriminated response type.

- [x] [Review][Defer] **W24 — No ESLint `no-restricted-imports` guard enforcing `@twt/contracts/src` → no `@twt/domain`** — AC10 states contracts must not import domain; the boundary relies on discipline and the turbo cycle detection rather than a lint rule.

> Group B — Domain tests (`packages/domain/tests/terms-and-conditions/`, `tests/integration/terms-and-conditions/`, `tests/integration/rls/`, `tests/rbac/permissions.test.ts`). Code review 2026-06-24. 0 decisions-needed · 6 patch · 10 defer · 8 dismissed.

- [x] [Review][Patch] **P12 — Positive RLS SELECT assertions are vacuously true on empty rows** — `rows.every(r => r.pariwarId === PARIWAR_A)` passes on an empty array; if RLS were broken and returned zero rows, the positive assertion would silently green. Added `expect(rows).not.toHaveLength(0)` guard to both positive SELECT tests in the versions and pinned_clauses suites. [`packages/domain/tests/integration/rls/terms-and-conditions-policy-regression.spec.ts`]

- [x] [Review][Patch] **P13 — Double-approve (`approved → approve again`) → `TcStateError` branch untested** — `write.ts:215` has the guard but no test exercises it; removing it would silently allow a second trustee to overwrite `legalReviewerActorId` on an already-approved row. Added `'approveTcVersion on an already-approved version throws TcStateError'` test. [`packages/domain/tests/integration/terms-and-conditions/tc-registry.spec.ts`]

- [x] [Review][Patch] **P14 — Empty-pins domain guard (`write.ts:93`) untested** — `createTcVersion` with `pinnedClauseVersionIds: []` throws `TcPinnedClauseNotFoundError` via the P4 guard (added in Group A), but no test exercised this path; removing the guard would silently create pin-less T&C versions. Added `'createTcVersion rejects an empty pinnedClauseVersionIds array'` test. [`packages/domain/tests/integration/terms-and-conditions/tc-registry.spec.ts`]

- [x] [Review][Patch] **P15 — `PERMISSION_CATALOG_VERSION` assertion is a tautology** — `expect(PERMISSION_CATALOG.catalogVersion).toBe(PERMISSION_CATALOG_VERSION)` compares the constant to itself (same import); never catches a wrong literal value. Added `expect(PERMISSION_CATALOG_VERSION).toBe(2)` before the tautology to pin the literal. [`packages/domain/tests/rbac/permissions.test.ts:45`]

- [x] [Review][Patch] **P16 — `terms_and_conditions_pinned_clauses` INSERT withCheck 42501 not tested** — The RLS regression only tests the mismatched `pariwarId` path on the `versions` table; a broken `WITH CHECK` on `pinned_clauses` would go undetected. Added the parallel 42501 test for the link table. [`packages/domain/tests/integration/rls/terms-and-conditions-policy-regression.spec.ts`]

- [x] [Review][Patch] **P17 — `pinned_clauses` negative test missing symmetric `.every(B) = true` assertion** — The negative test only checks `some(A rows) = false`; an empty result (broken RLS returning nothing) satisfies this too. Added `expect(rows.every(r => r.pariwarId === PARIWAR_B)).toBe(true)` to confirm B's own rows ARE visible under scope B. [`packages/domain/tests/integration/rls/terms-and-conditions-policy-regression.spec.ts:133`]

- [x] [Review][Defer] **W8 — `supersedeTcVersion` on already-superseded version untested** — guard at `write.ts:271` but no test; second supersede would overwrite `effective_until` on the already-closed row.

- [x] [Review][Defer] **W9 — `approveTcVersion`/`supersedeTcVersion` on non-existent `tcVersionId` untested** — `TcVersionNotFoundError` path never exercised; if guard removed, generic `Error` thrown instead of typed 404.

- [x] [Review][Defer] **W10 — Cross-tenant `approveTcVersion`/`supersedeTcVersion` (B's version, A's scope) untested** — defense-in-depth `pariwarId` filter in `resolveByTcVersionId` is correct but untested as an isolation check.

- [x] [Review][Defer] **W11 — `getEffectiveTc` with explicit `asOf` (historical point-in-time) untested** — two separate code paths in `read.ts`; the `asOf`-provided branch is never exercised.

- [x] [Review][Defer] **W12 — `getEffectiveTc` returns null when no versions exist (empty-state) untested** — the public `/terms` page uses this result for its empty state.

- [x] [Review][Defer] **W13 — Genesis with future `effectiveFrom` not yet effective untested** — `getEffectiveTc` should return null for a future-dated open version; untested.

- [x] [Review][Defer] **W14 — `listTcVersions` 200-row cap untested** — `Math.min(limit ?? 50, 200)` cap added in P6 but never asserted.

- [x] [Review][Defer] **W15 — `listPinnedClauses` cross-tenant guard untested** — `pariwarId` predicate in `read.ts` is defense-in-depth; correct but untested.

- [x] [Review][Defer] **W16 — Per-Pariwar version counter independence untested** — test only creates within one Pariwar; a global counter bug would not be caught.

- [x] [Review][Defer] **W17 — `data:image/...` and `vbscript:` URI schemes not covered by render-markdown tests** — `rehype-sanitize` default schema should block these; coverage is narrower than AC3 warrants.

> Group D — API module (`apps/api/src/modules/terms-and-conditions/`, integration test). Code review 2026-06-24. 0 decisions-needed · 3 patch · 2 defer · 13 dismissed.

- [x] [Review][Patch] **P9 — Approve route discards `audit.writeAuditEntry` return — `auditId` never passed to domain writes** — The approve route calls `await audit.writeAuditEntry(...)` but does not capture the return value. Consequently neither `supersedeTcVersion` nor `approveTcVersion` receives an `auditId`, leaving both the superseded row and the newly-approved row with `audit_id = NULL` — breaking the audit chain the P2/P8 domain patches established. Fix: `const auditRow = await audit.writeAuditEntry(...)` and pass `auditRow.auditId` to both calls. [`apps/api/src/modules/terms-and-conditions/index.ts:184–206`]

- [x] [Review][Patch] **P10 — Create route embeds server-computed `version` in provenance hash; can diverge on concurrent creates** — The route calls `latestTcVersion` to pre-compute `version = N+1` for the SHA-256 provenance digest, but `createTcVersion` independently re-queries `nextVersion` inside the scope tx. Under READ COMMITTED, a concurrent create that commits between these two queries causes the winner's hash to embed a version number that mismatches the actual row version, making the audit record's provenance hash a lie. Fix: remove `version` from the provenance hash (it is a server-derived sequence number, not part of the client request). [`apps/api/src/modules/terms-and-conditions/index.ts:87–99`]

- [x] [Review][Patch] **P11 — Integration test never asserts `auditId` on approved/superseded rows** — The test asserts `v1.auditId` is a non-null UUID after create but does not check the approved row's `auditId` after the approve transition. This gap allowed P9 to go undetected. Fix: add `expect(approved1.json().auditId).toMatch(/^[0-9a-f-]{36}$/)` (and for `approved2`) after each approve assertion. [`apps/api/tests/integration/terms-and-conditions.spec.ts:179–191`]

- [x] [Review][Defer] **W6 — `actorId as string` cast in approve route inconsistent with create route's `?? null`** — `requireAdminSession` guarantees non-null `actorId`, so the cast is functionally correct; `legalReviewerActorId` requires a non-null string. But the inconsistency with the create route is confusing. Low risk; defer to a future cleanup.

- [x] [Review][Defer] **W7 — Cross-tenant pin (valid UUID, wrong Pariwar) not integration-tested** — The 422 test uses a random non-existent UUID, which exercises the domain pre-check but not the path where the UUID exists in another Pariwar. The two-guard system (pre-check + FK) is unit-tested at the domain level; the cross-tenant integration path is not covered. Defer to a future integration-test hardening story.

> Group E — Public surface (`apps/public/src/lib/tc-render.ts`, `apps/public/src/pages/terms.astro`, `apps/public/tests/tc-render.test.ts`, `apps/public/tests/integration/public-pages/scrape-test.spec.ts`, `packages/i18n/locales/{en,hi}/terms.json`). Code review 2026-06-24. 0 decisions-needed · 1 patch · 4 defer · 7 dismissed.

- [x] [Review][Patch] **P19 — `renderTcHtml` hardcodes `lang="en"` on the empty-state `<section>`** — The empty-state path produces `<section lang="en" class="tc tc-empty">`. When the page renders in Hindi (`locale='hi'`), this `lang` attribute overrides the outer `PublicShell`'s `html[lang="hi"]` for this section, causing screen readers to apply English phonology to Hindi copy (`emptyTitle`, `emptyBody`). Fix: remove `lang="en"` from the empty-state section — the `<html lang="...">` set by `PublicShell` is the authoritative language signal for the full page. [`apps/public/src/lib/tc-render.ts:99`]

- [x] [Review][Defer] **W25 — `Vary: Accept-Language` insufficient when locale is also controlled by `?lang=` query param** — The page toggles locale via `?lang=hi` / `?lang=en`, but the cache key only varies on the `Accept-Language` header. An edge CDN that strips query params and varies only on `Accept-Language` could serve a cached Hindi response to an `?lang=en` requester (or vice versa). Same gap exists on `niyamavali.astro` (same toggle pattern). Defer until CDN/edge configuration is established; mitigation: add `Vary: Accept-Language` + document that query-param locale must be handled at the CDN routing layer.

- [x] [Review][Defer] **W26 — `reviewed-with-changes-required` excluded from `PROVISIONAL_STATUSES` is a policy question** — A T&C in `reviewed-with-changes-required` state has been reviewed but flagged as needing changes; it is arguably more provisional than `under-review`, yet the banner copy says "provisional *pending* legal counsel review" (past tense for this state). The exclusion is intentional and encoded in tests. Defer to Story 0.13 legal review consultation for final policy decision.

- [x] [Review][Defer] **W27 — Scrape-test fixture `emptyBody` diverges from actual `en/terms.json`** — `scrape-test.spec.ts:127` uses `'The Terms & Conditions have not been published yet...'` but `locales/en/terms.json` says `'The Terms & Conditions for this family have not been published yet...'` (missing "for this family"). The scrape spec does not assert exact copy — it only asserts `detectNakedPii([]) → []` — so the test passes regardless. Low risk; if a future copy-drift guard is added, this would surface.

- [x] [Review][Defer] **W28 — Two separate `withPublicScope` calls (read + list-pins) leave a narrow TOCTOU window** — `getEffectiveTc` and `listPinnedClauses` open separate DB transactions. If a T&C version is approved/superseded between the two calls, the pinned clause lookup still returns the correct rows (pin rows are insert-only, never deleted). Not a correctness issue today; note that if pin mutability is introduced in a future story the two-call pattern becomes racy. Document as known.

> Group F — Cross-cutting (`packages/domain/migrations/0016_motionless_stone_men.sql`, `docs/adr/ADR-0023-tc-version-registry-pinning-public-render.md`, `docs/ux/empty-skeleton-error-inventory.md`, `friction-budget.yaml`). Code review 2026-06-24. 0 decisions-needed · 0 patches · 0 defers · 8 dismissed.

All Group F artifacts reviewed clean:
- Migration 0016: all required DDL present (CREATE TYPE + 2 TABLEs + ENABLE/FORCE RLS ×2 + 3 FKs + 4 indexes including the partial-unique `(pariwar_id) WHERE effective_until IS NULL` + 4 RLS policies). GRANT correct: SELECT/INSERT/UPDATE on versions (no DELETE — versions superseded not deleted); SELECT/INSERT on pinned_clauses (pins immutable post-create). DO NOT REGENERATE banner present. Two-policy structure (SELECT + ALL) mirrors the established clause_versions pattern. ✓
- ADR-0023: all 5 decisions documented (registry shape, link-table variance, effective-window invariant, markdown pipeline, RLS posture); references ADR-0020/0021/0022; status `drafted` (awaiting trustee ratification); consequences section covers RBAC, placeholder T&C, markdown deps, and all gate extensions. ✓
- Empty-skeleton-error inventory: Row 6 `/terms` section complete; empty state + provisional state documented; trustee ratification correctly recorded as un-attested-pending (no fabricated session per [[feedback_record_unattested_no_backfill]]); Row 6 stays `in-progress` (closure at Epic 11a). ✓
- Friction budget: `page_weight_bytes` baseline stays 3942 (not raised to 5219 measured — correctly applied the best-ever ratchet per [[project_friction_budget_baseline_ratchet]]). ✓

## Dev Notes

> The dev agent has ONLY this file. Everything below is load-bearing context that prevents the predictable failures on this story: reinventing the registry/render/audit patterns instead of mirroring them, breaking the public browser bundle, missing the unauthenticated-RLS-scope read, shipping an XSS via `body_html_rendered`, regenerating a migration, and letting the 2.5 gate obligations decay.

### This is three known patterns fused — mirror, don't invent
| Layer | Mirror this exactly | New file(s) |
| --- | --- | --- |
| Schema + RLS + migration | `clause_versions.ts`, `clause-versions-rls.ts`, migrations `0014`/`0015` | `schema/terms_and_conditions_versions.ts` + `schema/terms_and_conditions_pinned_clauses.ts` (link table), `policies/terms-and-conditions-versions-rls.ts` + `policies/terms-and-conditions-pinned-clauses-rls.ts`, `migrations/0016_*.sql` |
| Domain accessors + errors + ids | `niyamavali/{read,write,errors,index}.ts`, `ids/index.ts` | `terms-and-conditions/{read,write,errors,index,render-markdown}.ts`, `TcVersionId` brand |
| Contracts + lockstep | `rules/{clause,index}.ts`, benefit-mechanism lockstep test | `terms-and-conditions/{tc-version,index}.ts` |
| Admin/trustee API + audit-or-throw | `apps/api/src/modules/rules/index.ts` (publish path L438-584) | `apps/api/src/modules/terms-and-conditions/{index,responses}.ts` |
| Public render | `apps/public/src/pages/niyamavali.astro`, `lib/db.server.ts`, `PublicShell.astro` | `apps/public/src/pages/terms.astro`, `lib/tc-render.ts`, `locales/{hi,en}/terms.json` |

### Data path — the public read is `withPublicScope` (identical to 2.5)
`apps/public/src/lib/db.server.ts` already exports `withPublicScope(fn)`: `BEGIN` → `SET LOCAL ROLE twt_app` (shed superuser so RLS is genuinely enforced — **not** a superuser bypass) → `setPariwarScope(ACTIVE_PARIWAR_ID)` → run read → `ROLLBACK` (read-only render) → release. Use it verbatim for `getEffectiveTc`. Branding still comes from the cross-readable passport cache (no scope). `apps/public` owns its own pool. **Do not add an `apps/api` HTTP read path for the public T&C** — `apps/api/src/modules/public-pages/` stays empty until Epic 11b (authenticated fragments); the T&C is public-tier content with zero authenticated fragments, same as Niyamavali. [Source: `apps/public/src/lib/db.server.ts`; `COMPOSITION-CONTRACT.md` §"Data path"]

### `body_html_rendered` — precompute at WRITE, render at READ (the cache-safe call)
The AC says `body_html_rendered` is "precomputed for cache-safe SSR." This is deliberate: markdown→HTML runs **once, at write time** (in `createTcVersion`, server-side, behind auth), the sanitized HTML is stored, and the public page just emits it with `set:html`. The public renderer therefore needs **no markdown dependency** — keep markdown libs out of the `apps/public` graph entirely (and out of any client island). This is what makes the page cheap, deterministic, and cache-safe. **Security is non-negotiable:** the stored HTML is served unauthenticated and edge-cached, so a stored XSS would hit every visitor. Sanitize at write with an allowlist; unit-test the strip. [Source: epics.md L1532 "body_html_rendered (precomputed for cache-safe SSR)"; `niyamavali.astro` cache headers L100-102]

### §1.11 DB-authoritative time — never an app clock
`getEffectiveTc`'s `asOf` defaults to DB `now()`, exactly like `resolveByClauseId`/`listEffectiveClauses` (`asOf === undefined ? sql\`effective_from <= now()\` : lte(...)`). The effective-window predicate is `effective_from <= now() AND (effective_until IS NULL OR now() < effective_until)`. Do not read the app-server clock anywhere in the resolution. [Source: `niyamavali/read.ts` L31-36, L150-156]

### Effective-window invariant & supersede-on-approve
At most one "current" version per Pariwar. The clean structural guard is a **partial unique index** `(pariwar_id) WHERE effective_until IS NULL` — only one open-ended (currently-in-force) version may exist per Pariwar at a time. `approveTcVersion` + `supersedeTcVersion` run in one tx: the prior currently-effective version gets `effective_until = now()` + `legal_review_status = 'superseded'`, then the newly-approved version becomes the open-ended current one. Order the writes so the partial-unique constraint is never transiently violated (set the prior's `effective_until` BEFORE opening the new one, or rely on `DEFERRABLE` — simplest is: close prior first). The superseded row is never deleted (AC8 historical attestation). [Source: epics.md L1538 "prior pending T&C is marked superseded and remains queryable"]

### RLS posture — tenant-isolated, NOT cross-readable
Mirror `clause-versions-rls.ts` (tenant-isolation select + write), NOT the `pariwar_passport` cross-readable carve-out. The rationale is identical and already ratified in ADR-0020: each Pariwar's public site reads with `app.pariwar_id` set to that Pariwar, so a tenant-scoped SELECT already serves the public render; `pariwar_passport` stays the single positive exception to the Story 1.6 leak invariant. Use the exact closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` (unset scope → 0 rows, fail-closed). [Source: `policies/clause-versions-rls.ts` full file]

### Audit-or-throw (mirror the publish path precisely)
The approval/creation transitions are RBAC-gated, actor-attributed, audited writes — they belong behind authenticated `apps/api` routes (the audit needs `actorId` from the session). The append-only audit ledger cannot back-fill `audit_id`, so: write the audit line FIRST (`audit.writeAuditEntry(deps.servicePool, ...)`), pre-generate `tcVersionId` so the audit provenance hash references the exact id, then pass `auditId` into the domain write; a throw anywhere propagates → the scope tx rolls back → no version/approval without an audit line. This is exactly `rules/index.ts` L491-558. [Source: `apps/api/src/modules/rules/index.ts` L14-20, L491-558]

### Clause pinning via a link table (FK-enforced) — variance from the epic's `text[]`
The epic AC literally says `pinned_to_clause_version_ids text[]` (epics.md L1532). **We deviate deliberately** (BigDev 2026-06-24): pins live in a junction table `terms_and_conditions_pinned_clauses` so the reference to `clause_versions` carries a **real FK** — Postgres can't FK an array element, and the `text[]` design could silently hold a dangling/cross-tenant id. Semantically identical (a set of pinned clause versions), structurally stronger. **Two guards, both required:**
1. The **FK** (`clause_version_id` → `clause_versions.clause_version_id`) is the hard referential guard against a non-existent version.
2. The **domain pre-check** (`niyamavali.resolveByClauseVersionId(db, pariwarId, id)` returns a row) is the **cross-tenant guard** — the FK targets the global PK and would happily link a *different Pariwar's* clause version; `resolveByClauseVersionId` returns a row only when `pariwar_id` matches. Do not drop this for "the FK covers it" — it does not.

The pin set is written in the same tx as the main row (atomic). Record this variance in the ADR (Task 9). [Source: epics.md L1532; `clause_versions.ts` L117-121 (the `predecessor_clause_ids` text[] precedent we're NOT copying here); `niyamavali/read.ts` `resolveByClauseVersionId` L60-76]

### Permission keys + catalog version bump
Add `tc.publish` + `tc.approve` (canonical `<resource>.<action>` shape) to BOTH `packages/domain/src/rbac/permissions.ts` `SEED_PERMISSION_KEYS` and the contracts mirror `packages/contracts/src/rbac/permissions.ts`. The header says "Seed EXACTLY the keys the artifacts reference; do NOT manufacture keys for resources whose endpoints don't exist" — these two endpoints DO exist (Task 6), so the keys are grounded. Bump `PERMISSION_CATALOG_VERSION` (file convention: "Bumped when keys are added") — no consumer update is needed for the bump itself; the only existing reference (`tests/rbac/permissions.test.ts`) compares the catalog to the constant, not to a literal value. Super Admin auto-inherits (derives from the catalog). Grant `pariwar_admin` both; `state_trustee` gets `tc.approve`. Update `tests/rbac/roles.test.ts`. [Source: `rbac/permissions.ts` L73-91; `rbac/roles.ts` L70-148]

### i18n — Hindi-primary member surface, parity-gated
`/terms` is member-facing → Hindi-primary default (don't invert). New `terms` namespace lives at `packages/i18n/locales/{hi,en}/terms.json`; every `en` key needs an `hi` parity entry or `i18n:check-parity` fails. `@twt/i18n` root is server-safe (the `/react` split already shipped in 2.5) — Astro SSR imports the server-safe root (`import { getLocale, isLocale, t } from '@twt/i18n'`), exactly as `niyamavali.astro` L8. [Source: `niyamavali.astro` L8-9, L25-26; `packages/i18n/locales/*/niyamavali.json`; `microcopy.yaml` L94-103]

### Tokens / shell — already built, just consume
`PublicShell.astro` is the cache-safe chrome (reads no session). It takes `{ locale, title, description, trustName, branding, noindex? }`. The `terms.astro` page passes the same props `niyamavali.astro` does. Tokens are the `:root` block from `@twt/tokens` via `theme.server.ts` (the `@twt/ui` AC phrasing resolves to `@twt/tokens` — documented variance, not a conflict). Use the existing CSS custom properties (`--color-rule-heavy`, `--font-body-ledger`, `--space-block`, …). [Source: `PublicShell.astro` full file; `COMPOSITION-CONTRACT.md` §"Documented variances"]

### Astro component-test carve-out
`.astro` files have NO co-located unit tests; component logic moves to `.ts` modules (which have co-located tests); rendering is covered by integration/e2e. So `terms.astro` stays a thin wrapper; `lib/tc-render.ts` holds the testable logic; the scrape integration spec + optional Playwright cover the HTML. [Source: `2-5` Dev Notes §"Testable render"; architecture L3796]

### The 2.5 gate obligations continue here (don't let them decay un-gated)
Story 2.5 activated `pii-scrape` (live-render, ENFORCING), `microcopy` (`copy_globs` populated), `friction-budget` (baselines), and authored the P0-4 empty/skeleton/error inventory (Row 6 `in-progress`, ratified 2026-06-23 per Decision 2026-06-23-060). Adding a new public surface (`/terms`) means each of these must be EXTENDED to cover it (Task 9), not left behind. Un-gated obligations decay → keep each one gated. Row 6 stays `in-progress` (closes only at Epic 11a full-surface inventory). [[feedback_record_unattested_no_backfill]] [Source: `2-5` Completion Notes §three re-homed obligations]

### Testing standards
- Co-located vitest for `src/lib/*.ts` (tc-render, render-markdown) + domain accessors unit/integration. Integration DB suites need `DATABASE_URL` on `:5433` (`twt-test-pg`). **Never regenerate an applied migration; never `DROP SCHEMA` reset; assert membership not counts.** [[project_live_db_test_gotchas]]
- Merge gate = `pnpm ci:local` green (GitHub Actions suspended). [[project_ci_actions_suspension_local_mirror]]
- Watch `onSend`/header-timing if you add response-header hooks in the api routes. [[project_fastify_onsend_doublesend]]
- Per-package eslint cwd: any rule carve-out `files` glob must be cwd-relative role globs, not package-path globs; verify with `pnpm --filter <pkg> lint`. [[project_eslint_config_per_package_cwd]]

### Project Structure Notes
- Domain registry pairing (schema + RLS + accessors + migration) lands in `packages/domain` — additive, mirrors the 2.3 footprint. The migration is REQUIRED here (new table) — generate once + hand-supplement, never regenerate.
- Trustee API lands in a NEW `apps/api/src/modules/terms-and-conditions/` module (contrast 2.5, which added NO api module). Registered in `server.ts`.
- Public render lands in `apps/public` on the EXISTING shell — new page + lib + i18n namespace, no scaffold changes.
- Variance carried from 2.5 (not re-litigated): `@twt/ui` AC phrasing → `@twt/tokens`; the scrape spec lives inside the `@twt/public` workspace.

### References
- [Source: epics.md#Story-2.6 L1522-1543] — the 3 epic AC blocks (AC derivation); `[SURFACE]` label; "pending legal review until Story 0.13."
- [Source: epics.md#Epic-2 L1385-1403] — Epic 2 framing; the Niyamavali seam (shape+render here, engine in Epic 4); demoable closure ("T&C version-pin validates against a placeholder T&C body").
- [Source: epics.md#Story-0.4 L753-764] — the pending-legal-review pattern (comms templates marked "pending legal review" until 0.13); `docs/legal-counsel-engagement/` framework (Story 0.13).
- [Source: epics.md#Story-2.7 L1544-1563] — the consent registry that will store `tc_version_id` (forward consumer of AC8); NOT built here.
- [Source: packages/domain/src/schema/clause_versions.ts] — the table-shape pattern to mirror (pgEnum, branded ids, checks, unique/partial indexes, naming discipline).
- [Source: packages/domain/src/policies/clause-versions-rls.ts] — tenant-isolation RLS (NOT cross-readable); the fail-closed `nullif(...)` construct; ADR-0020 rationale.
- [Source: packages/domain/src/niyamavali/{read,write,index,errors}.ts] — accessor module shape; DB-now() effective predicate (read.ts L31-36, L150-156); direct-on-db tx contract; caller-supplied id/auditId (write.ts L62-71); `resolveByClauseVersionId` L60-76 (pin validation).
- [Source: packages/domain/src/ids/index.ts L117-163] — `ClauseVersionId` brand (mirror for `TcVersionId`); branding-mandatory discipline.
- [Source: packages/domain/migrations/0014_*.sql, 0015_*.sql headers] — generate-once + hand-supplement (GRANT + FORCE RLS + deferred triggers/indexes); the ⚠ DO-NOT-REGENERATE banner + 42P07 rationale.
- [Source: packages/domain/drizzle.config.ts] — schema globs (`src/schema/*.ts` + `src/policies/*-rls.ts` auto-picked); `db:generate`/`db:check` need no DB.
- [Source: apps/api/src/modules/rules/index.ts L14-20, L438-584] — scoped chain + audit-or-throw publish (the template for the trustee endpoints); `responses.ts` mapper pattern; `server.ts` L90 registration.
- [Source: apps/public/src/pages/niyamavali.astro] — the public render template (locale/branding/cache headers L100-102/view model/`PublicShell` props).
- [Source: apps/public/src/lib/db.server.ts] — `withPublicScope` (the unauthenticated RLS read).
- [Source: apps/public/src/layouts/PublicShell.astro] — cache-safe chrome props + token CSS; `safeHex` branding guard.
- [Source: apps/public/COMPOSITION-CONTRACT.md] — public-surface registry + cache-safe guarantee + data path (update for `/terms`).
- [Source: packages/contracts/src/rules/{clause,index}.ts] — DTO pattern + the browser-bundle constraint (no `@twt/domain` import) + `.openapi()` registration; benefit-mechanism lockstep precedent.
- [Source: packages/domain/src/rbac/{permissions,roles}.ts] — catalog append + version bump convention; role-bundle grants + referential test.
- [Source: friction-budget.yaml, microcopy.yaml L94-103, docs/ux/empty-skeleton-error-inventory.md] — the 2.5 gate artifacts to extend for `/terms`.
- [Source: _bmad-output/implementation-artifacts/2-5-*.md] — previous-story intelligence (data path, gate obligations, variances, file list).

### Decisions — all resolved (BigDev, 2026-06-24)
All three create-story questions are settled (see **Settled decisions** at the top of this story). For the record:
1. **Admin UI scope** → trustee API endpoints + audit logging + seeded/demo T&C **in scope**; full `apps/admin` editor UI **deferred**.
2. **Permission keys + catalog bump** → `tc.publish` + `tc.approve` introduced; `PERMISSION_CATALOG_VERSION` bumped 1→2 (grep for pinned consumers first).
3. **Markdown sanitizer** → `unified` + `rehype-sanitize` (keep). Plus two refinements folded into the tasks: (a) sanitizer tests MUST explicitly cover `javascript:`/`data:` URL schemes; (b) clause pinning uses a **link table** (FK referential integrity), not `text[]`.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (`claude-opus-4-8`) — bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/domain db:check` ✓ (snapshot tracks both new tables + 4 policies).
- Domain unit + live-DB integration: `tests/terms-and-conditions/render-markdown.test.ts` 9/9; `tests/integration/terms-and-conditions/tc-registry.spec.ts` 6/6; `tests/integration/rls/terms-and-conditions-policy-regression.spec.ts` 7/7; full domain suite 340 pass / 1 pre-existing skip.
- Contracts: `tests/terms-and-conditions.test.ts` 9/9; full 159 pass; `contracts:emit-openapi` + determinism ✓ (`openapi/v1.yaml` +211 lines).
- apps/api: route test `tests/integration/terms-and-conditions.spec.ts` 6/6; full apps/api 137 pass (niyamavali-workflow 9/9 — error-mapping intact).
- apps/public: `tc-render.test.ts` 10/10; scrape `/terms` leg + niyamavali 8/8; `astro check` 0 errors; build page_weight 5219 / 0 client JS.
- **`pnpm ci:local` PASSED — 16/16 jobs green** (incl. integration-tests, `DATABASE_URL` on :5433).

### Completion Notes List

✅ All 10 tasks complete; all ACs satisfied. Implemented as a vertical slice that **mirrors** three in-tree patterns (2.3 registry, 2.4 audit-or-throw, 2.5 public render) — no patterns invented.

Key implementation decisions / discoveries (beyond the story spec):
- **Effective-window lifecycle (the crux).** The partial-unique index `(pariwar_id) WHERE effective_until IS NULL` permits exactly one open-ended version. To satisfy AC4 (a *pending* genesis must render), AC6 (approve supersedes the prior currently-effective version), and the Dev Notes "close prior before opening the new" — `createTcVersion` **opens the genesis** (no open version yet) but **stages every subsequent version** (`effective_until = effective_from`, an empty window that is never effective) so the in-force version keeps rendering; approve closes the prior FIRST, then opens the target. Added an internal `currentOpenTcVersion` read accessor for the route to find the prior to supersede.
- **`permissions.test.ts` had a hard `toHaveLength(9)`** the validate-create-story pass missed (it noted only a tautological version assertion). Bumped to 11 + added a `tc.publish`/`tc.approve` catalog-membership assertion.
- **Seed script imports `@twt/domain` by relative source path** — a root `scripts/` file is outside the workspace symlink, so the `@twt/domain` specifier does not resolve (mirrors `packages/domain/scripts/migrate.ts`'s `../src/*` imports). Added `pnpm seed:tc`.
- **Public render shows the pinned-version COUNT, not the raw clause_version_id UUIDs** — a UUID's digit runs false-positive the FR-74 PII scanner's aadhaar pattern (caught by the scrape spec), and internal UUIDs have no value to a public reader. The ids stay in the model (the AC8 handle Story 2.7/Epic 3 consume).
- **⚠ The Task 9 friction-budget guidance was WRONG.** The story said "update the baseline if it shifted"; the gate's AC-1 `detectRaisedBaselines` **forbids an in-PR baseline *raise*** — the baseline-of-record is a best-ever ratchet that may only *decrease* in-PR. `/terms` raised the measured page-weight 3942→5219 (far under the 512000 ceiling), so the baseline correctly **stays at 3942** (the measured value floats under the ceiling; `evaluateMetric` only fails on measured>ceiling). Recorded honestly; not gamed.
- **Governance integrity:** the `/terms` empty/skeleton/error inventory row + ADR-0023 are author-committed; their ≥2-trustee ratification is carried **un-attested-pending** — no Trustee-Panel session fabricated ([[feedback_record_unattested_no_backfill]]).

Open items for the reviewer: ADR-0023 + the `/terms` inventory row await ≥2-trustee ratification; a separate rationale PR is the sanctioned path if the friction baseline-of-record is ever to be re-pegged to the new 5219.

### File List

**New — domain (`packages/domain`):**
- `src/schema/terms_and_conditions_versions.ts`
- `src/schema/terms_and_conditions_pinned_clauses.ts`
- `src/policies/terms-and-conditions-versions-rls.ts`
- `src/policies/terms-and-conditions-pinned-clauses-rls.ts`
- `src/terms-and-conditions/render-markdown.ts`
- `src/terms-and-conditions/read.ts`
- `src/terms-and-conditions/write.ts`
- `src/terms-and-conditions/errors.ts`
- `src/terms-and-conditions/index.ts`
- `migrations/0016_motionless_stone_men.sql` (+ `meta/0016_snapshot.json`, `meta/_journal.json` entry — generated)
- `tests/terms-and-conditions/render-markdown.test.ts`
- `tests/integration/terms-and-conditions/tc-registry.spec.ts`
- `tests/integration/rls/terms-and-conditions-policy-regression.spec.ts`

**New — contracts / api / public / i18n / scripts:**
- `packages/contracts/src/terms-and-conditions/tc-version.ts`
- `packages/contracts/src/terms-and-conditions/index.ts`
- `packages/contracts/tests/terms-and-conditions.test.ts`
- `apps/api/src/modules/terms-and-conditions/index.ts`
- `apps/api/src/modules/terms-and-conditions/responses.ts`
- `apps/api/tests/integration/terms-and-conditions.spec.ts`
- `apps/public/src/lib/tc-render.ts`
- `apps/public/src/pages/terms.astro`
- `apps/public/tests/tc-render.test.ts`
- `packages/i18n/locales/en/terms.json`, `packages/i18n/locales/hi/terms.json`
- `scripts/seed-placeholder-tc.ts`
- `docs/adr/ADR-0023-tc-version-registry-pinning-public-render.md`

**Modified:**
- `packages/domain/src/ids/index.ts` (TcVersionId brand)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/src/index.ts` (barrels + top-level error/namespace exports)
- `packages/domain/package.json` (unified + remark/rehype stack), `pnpm-lock.yaml`
- `packages/domain/src/rbac/permissions.ts`, `packages/domain/src/rbac/roles.ts`, `packages/domain/tests/rbac/permissions.test.ts`
- `packages/contracts/src/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`
- `apps/api/src/server.ts`, `apps/api/src/middleware/error-mapping/index.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`, `apps/public/COMPOSITION-CONTRACT.md`
- `packages/i18n/src/catalog.ts`
- `microcopy.yaml`, `friction-budget.yaml`
- `docs/ux/empty-skeleton-error-inventory.md`, `docs/knowledge-transfer/adr-index.md`
- `package.json` (`seed:tc` script)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Change |
| --- | --- |
| 2026-06-24 | **Story implemented (dev-story, Status → review).** All 10 tasks landed: domain registry (schema + ids + RLS + migration 0016) · markdown sanitizer · accessors + integration/RLS specs · contracts DTOs + lockstep + OpenAPI · RBAC keys + catalog bump · apps/api audit-or-throw trustee routes + tests · idempotent placeholder seed · `/terms` page + tc-render lib + i18n · gates/composition-contract/ADR-0023/inventory · `pnpm ci:local` 16/16 green. Two spec corrections recorded in Completion Notes (the `toHaveLength(9)` RBAC test; the friction-budget baseline-ratchet — the "update if shifted" guidance was wrong, baseline stays at best-ever 3942). |
| 2026-06-24 | Story 2.6 created (ready-for-dev): T&C version-pinning registry + sanitized precomputed render + trustee audit-or-throw endpoints + public `/terms` page on the 2.5 shell. Ultimate context-engine analysis completed — comprehensive developer guide created. |
| 2026-06-24 | Create-story decisions resolved (BigDev): admin editor UI deferred (API + audit + seed in scope); `tc.publish`/`tc.approve` + catalog bump confirmed; markdown = `unified` + `rehype-sanitize` with explicit `javascript:`/`data:` sanitizer tests; clause pinning switched from `text[]` to an FK-enforced link table (`terms_and_conditions_pinned_clauses`). Folded into ACs/Tasks/Dev Notes. |
| 2026-06-24 | Story validated against the live codebase (validate-create-story pass) — 6 fixes applied: (1) Task 1's claim that drizzle-kit can't emit the partial unique predicate was wrong per `clause_drafts.ts`/migration `0015` precedent — corrected to declare it via `.where()`, no hand-supplement needed; (2) Task 9's `friction-budget.yaml` instruction assumed a per-route baseline that doesn't exist (`member-public-web` is a single whole-app aggregate) — corrected to re-measure and update the existing baseline; (3) Task 8 was missing `renderTcHtml(model): string`, the pure HTML-composer the Task 9 scrape spec needs (mirroring `renderNiyamavaliHtml`) — added; (4) Task 6's speculative `GET /versions` routes had no AC backing and no permission key — removed per the story's own scope-fence discipline; (5) the "grep for pinned `PERMISSION_CATALOG_VERSION` consumers" caution was resolved — the only reference is a tautological self-comparison, no update needed; (6) Task 7's Bihar-seed-path option was noted as a currently-empty scaffold, making the `scripts/` path the lower-risk default. |

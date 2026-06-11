# ADR-0007: Pariwar-Passport data model v1 — cross-readable carve-out, runtime branding bundle, branded IDs, 60s freshness

> **Status:** drafted
> **Date:** 2026-06-11 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.7 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 1.7 lands the **first domain table after `events_log`** and the **first one deliberately not tenant-isolated on read**. The architecture pre-authorised exactly one such exception:

- **architecture §1.2 line 726-729** commits the *property*: "Pariwar-Passport tables are the explicit exception. Their RLS policies allow cross-Pariwar reads under named conditions; the policies live in `packages/domain/` alongside scoped-table policies and are reviewed together when the v2 cross-Pariwar UI lands." Step-2 Cross-Cutting #21 (line 337-340) marks it **[P0]**.
- **FR-63** commits the Pariwar-Passport entity (identity + branding); **FR-60** commits the branding bundle (runtime subset here, distinct from the build-time overlay).
- **architecture §1.10 line 1047-1048** commits the freshness property: "Static reference data cache — Pariwar config, 60s TTL with cache-aside, invalidated on trustee write."
- **architecture §Naming patterns line 3700-3708** commits branded cross-cutting domain IDs ("branding mandatory on first PR for new IDs").

Per [[feedback_architecture_vs_adr_boundary]], the architecture commits these *properties*; this ADR records the *controls* chosen to implement them. The decision deadline is Story 1.7 closure (this commit).

Risks if mis-decided: (a) the cross-readable SELECT carve-out, done wrong, silently weakens the Story 1.6 multi-tenant leak invariant for *scoped* tables (a P0 data-isolation failure); (b) encrypting a field the carve-out is meant to expose makes it useless to cross-tenant readers; (c) a missing `updated_at` refresh breaks the freshness marker silently.

## Decision

Author `pariwar_passport` in `packages/domain/` with a **read-cross / write-isolated** RLS asymmetry, a **runtime branding JSONB subset**, a **branded `PariwarId`**, and a **60s in-process freshness contract**. Load-bearing details:

1. **Table name (singular):** `pariwar_passport`, a deliberate exception to the snake_case-**plural** table convention (architecture §Naming patterns line 3664). The Passport is a 1:1 singleton identity document keyed by its owner; the singular reads as the document, not a collection. `pariwar_id` is BOTH the primary key AND the tenant key. (Alternative `pariwar_passports` is defensible; recorded as a conscious choice.)

2. **Column shape** (snake_case columns / camelCase Drizzle fields / snake_case JSONB keys):
   `pariwar_id uuid PK` (branded `PariwarId`), `display_name_en/hi text NOT NULL`, `legal_name text NOT NULL`, `trust_registration_id text NULL`, `branding_bundle jsonb NOT NULL`, `locale_default` (pgEnum `locale` = `hi | en`) `NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `created_by uuid NULL` (no FK — the admin users table lands Story 1.9+), `updated_at timestamptz NOT NULL DEFAULT now()`.

3. **Carve-out RLS** (`packages/domain/src/policies/pariwar-passport-rls.ts`, reviewed together with scoped policies per D3-1.6):
   - `pariwar_passport_cross_readable_select` — `FOR SELECT TO twt_app USING (true)`. The **named cross-readable condition**. This is the single place `twt_app` legitimately cross-reads without the `runAsCrossTenant` / `row_security = off` escape hatch.
   - `pariwar_passport_tenant_isolation_write` — `FOR ALL TO twt_app USING/WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid)`. Reuses Story 1.6's closed-failure construct — writes stay tenant-scoped; unset scope → NULL → blocked.
   - Migration `0003` `ENABLE` + `FORCE ROW LEVEL SECURITY`; grants `twt_app` **SELECT, INSERT, UPDATE** (NOT DELETE — a singleton identity document must not be deletable by the app role at v1; DELETE is withheld at the privilege layer even though the write policy is `FOR ALL`).

4. **`branding_bundle` JSONB shape (runtime subset only):** `{ logo_url, logo_url_dark?, primary_color, secondary_color, accent_color? }` — snake_case keys. This is FR-63's runtime branding read dynamically for chrome; it is **NOT** FR-60's build-time bundle (`packages/tokens/`, `packages/i18n/`, `apps/mobile/eas.json`), which is swapped per app build and lands with Story 1.15 / Epic 11a. Copy strings, app icons, and store metadata are build-time and stay out.

5. **PII-tier decision for `trust_registration_id` (D7-1.5): tier-3 (plaintext, public-by-nature).** Assessed against the FR-74 Public-vs-Private matrix as public registry data (org-level identity, not member PII). The cross-readable carve-out exists to *expose* the Passport, so a tier-2 blind-index / tier-1 envelope here would contradict the carve-out (encrypted bytes are useless to cross-tenant readers). Plain `text`, NOT annotated via `piiColumn()`. Nullable — not every Pariwar has a registration number recorded at provisioning.

6. **Branded IDs (`packages/domain/src/ids/`, AC-5):** `PariwarId = string & { __brand: 'PariwarId' }` plus the architecture-named cross-cutting set (`MemberId`, `ClaimId`, `PoolId`, `AlertId`, `ContributionId`), each with a UUID-validating smart constructor reusing the single exported `UUID_REGEX` from `db.ts`. The brand is compile-time only (no runtime wrapper). The contracts layer exposes `PariwarIdSchema = z.string().uuid().brand<'PariwarId'>()` whose brand **string** aligns with the domain brand (not symbol-identical — alignment by name is sufficient). The enforcing ESLint rule (`*Id` string types must be branded) is Story 1.16a — not built here.

7. **60s freshness (AC-3):** the DB row is source of truth; `getPariwarPassport` / `getBrandingBundle` are fresh-from-DB. `BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000` is the exported staleness ceiling. A minimal in-process `Map` cache-aside (`getPariwarPassportCached` + `readThroughBrandingCache`) honours the ceiling; `invalidatePariwarPassport(id)` is the invalidate-on-write seam the write path calls so a trustee write reflects immediately. `updated_at` (bumped by a BEFORE UPDATE trigger calling `now()`) is the stale-while-revalidate marker. **No Redis** — the distributed cache is a future trigger per §1.10 line 1077.

## Alternatives considered

- **`USING (is_public = true)` predicate instead of `USING (true)`** — Deferred (not rejected). The whole Passport is public identity at v1, so a per-row visibility flag adds a column and a policy branch with no consumer. If a future requirement needs partially-private Passport fields, revisit this ADR and add the predicate + column.
- **Encrypt `trust_registration_id` (tier-2 blind index)** — Rejected: it contradicts the cross-readable carve-out (the field would be opaque to the very readers the carve-out serves) and the FR-74 matrix classes it public. Revisit only if a Pariwar's registration number is reclassified sensitive.
- **Plural table name `pariwar_passports`** — Rejected (soft): defensible per the plural convention, but the singleton-identity-document reading is clearer; recorded as a conscious exception.
- **Symbol-identical Zod/TS brand (hard import of the domain brand into Zod)** — Rejected: it complicates the OpenAPI emit for no practical gain. Alignment by brand **name** is sufficient (the transport boundary applies the Zod brand on parse; domain code applies its own via the smart constructor).
- **Redis-backed distributed cache for freshness** — Deferred per architecture §1.10 line 1077 (future trigger). An in-process Map is the correct primitive for a layer with no rendering surface yet.
- **`now()` vs `clock_timestamp()` in the trigger** — Chose `now()` (transaction timestamp) per the architecture freshness-marker intent; across separate committed production writes it advances per commit. (Consequence: two writes in one transaction share an `updated_at` — irrelevant to the freshness contract.)

## Consequences

- **Operational** — Migration `0003` is forward-only and hand-supplemented (GRANT/FORCE/trigger) like `0002`; `DO NOT REGENERATE`. The `set_updated_at()` trigger function is a reusable utility (`CREATE OR REPLACE`).
- **Security** — The carve-out is a deliberate, named, [P0]-reviewed widening of read surface for ONE table. The adversarial leak suite (`cross-pariwar-leak.spec.ts`) now asserts `pariwar_passport` as the **expected cross-readable exception** while every scoped table still returns 0 rows cross-tenant. `pariwar_passport` must NEVER be added to the "must return 0 rows" set — that distinction is the load-bearing invariant. Writes remain tenant-isolated; DELETE is privilege-withheld.
- **Performance** — Point lookup by `pariwar_id` PK; no extra indexes (the PK covers it). The in-process cache bounds DB reads for hot branding paths to once per 60s per Pariwar per process.
- **Cost** — Negligible; no new infra (no Redis).
- **Failure modes accepted** — (a) a single-transaction insert+update yields equal `created_at`/`updated_at` (immaterial); (b) a not-found read is cached as `null` for up to 60s (bounded staleness, invalidated on write); (c) the in-process cache is per-process — multiple API instances each honour the 60s ceiling independently (acceptable until the Redis trigger).
- **Migration / pivot path** — A distributed cache (Redis) replaces the in-process Map when the §1.10 trigger fires (consumers must still honour `BRANDING_BUNDLE_MAX_STALENESS_MS`). A FK on `created_by` can be added retroactively once the admin users table lands (Story 1.9+). The `@twt/contracts/pariwar-passport` subpath export is wired when apps/api first consumes it (Story 1.9+).

## References

- [Source: architecture.md §1.2, lines 715-770 (carve-out 726-729)] — RLS + the cross-readable property
- [Source: architecture.md §1.7, lines 936-985] — per-tenant custom fields (NOT landed here; see deferral)
- [Source: architecture.md §1.10, lines 1040-1077 (branding 1047-1048; marker 1068-1070; Redis trigger 1077)] — freshness property
- [Source: architecture.md §Naming patterns, lines 3661-3728 (branded IDs 3700-3708; JSONB keys 3668)]
- [Source: architecture.md §Format patterns, lines 3824-3826] — `.strict()` contract default
- [Source: PRD/FR-63 (line 123), FR-60 (line 120), FR-74 PII Public-vs-Private matrix] — Passport + branding + PII classification
- [Source: epics.md, Story 1.7] — owning Story
- [Source: `.decision-log.md`, Decision 2026-06-11-043] — Story 1.7 substantive author-commit
- [Source: `docs/knowledge-transfer/adr-index.md`] — Section A live index row for this ADR
- [Source: deferred-work.md] — D3-1.6 (carve-out), D7-1.5 (Passport PII tier), D11-1.5 (branded `PariwarId` → `EncryptionContext`), D12-1.4 (branded IDs + primitives), W7-1.3 (UUID validation)
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary anchor
- Memory: [[feedback_closure_language_precision]] — closure-language anchor

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-11 | (initial draft) | Solo Builder (BigDev) | Authored at Story 1.7 closure (Pariwar-Passport data model + branding bundle); paired with Decision 2026-06-11-043 |

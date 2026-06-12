# Story 1.7: Pariwar-Passport Data Model + Branding Bundle

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin,
I want a **Pariwar-Passport** entity carrying the Pariwar's identity, configuration, and branding bundle,
so that per-Pariwar customization (display name, logos, colors, locale defaults) is registry-driven rather than hardcoded, and the public/admin chrome of every downstream surface renders branded by data — not by build-time constants alone.

This is a `[PRIMITIVE]` story (FR-63 + FR-60). It lands the **DB data model + RLS carve-out + branded-ID substrate + the read/freshness contract**. It does NOT build a member-facing or admin UI (UI is deferred to v2 per FR-63), and it does NOT build the apps/api HTTP route surface (that lands at Story 1.9+ scope-resolution middleware, D4-1.6). The deliverable is the substrate every later branded-chrome surface consumes.

## Acceptance Criteria

Derived from epics.md Story 1.7 (lines 1100–1115) + FR-63 (line 123) + FR-60 (line 120). The two epic BDD blocks are expanded into testable ACs.

**AC-1 — Schema shape (epic block 1).**
**Given** FR-63 Pariwar-Passport + FR-60 branding-bundle requirements
**When** the Pariwar-Passport data model is authored in `packages/domain/src/schema/`
**Then** the table carries (snake_case columns, camelCase Drizzle TS fields per architecture §Naming patterns L3663–3672):
- `pariwar_id` (uuid) — **primary key**, 1:1 with a Pariwar, AND the tenant key; typed as branded `PariwarId` at the TS layer
- `display_name_en` (text, NOT NULL)
- `display_name_hi` (text, NOT NULL)
- `legal_name` (text, NOT NULL)
- `trust_registration_id` (text) — see Dev Note "PII-tier decision" (D7-1.5) before choosing nullability/tier
- `branding_bundle` (jsonb, NOT NULL) — `{ logo URLs, primary/secondary colors, optional accent }`; JSONB keys snake_case per architecture §Naming patterns L3668
- `locale_default` (text, NOT NULL) — constrained to `hi | en` (CHECK constraint or pgEnum)
- `created_at` (timestamptz, NOT NULL, DEFAULT now())
- `created_by` (uuid, NULL allowed = system/SIE, per the `events_log.actor_id` precedent)
- `updated_at` (timestamptz, NOT NULL, DEFAULT now()) — **additive**, justified by AC-3 freshness (the cache freshness-timestamp / stale-while-revalidate marker per architecture §1.10 L1068–1070)

**AC-2 — Branding bundle consumable by downstream chrome (epic block 1, clause 2).**
**Given** the schema is authored
**When** a rendering surface needs the bundle
**Then** a typed read accessor + Zod transport contract exists such that Epic 11a public Astro shell and admin UI chrome (Story 1.9 onwards) can read `display_name_*`, `branding_bundle`, and `locale_default` for any Pariwar **without** going through the `runAsCrossTenant` row-security-off escape hatch — because the Passport SELECT policy is the **cross-Pariwar-readable carve-out** (architecture §1.2 L726–729; Step-2 Cross-Cutting #21 L337–340).

**AC-3 — 60-second freshness on branding update (epic block 2).**
**Given** a Pariwar's branding bundle is updated
**When** any rendering surface reads the bundle
**Then** the surface reflects the change within **60 seconds** — implemented as the architecture's "Static reference data cache — Pariwar config, 60s TTL with cache-aside, invalidated on trustee write" (§1.10 L1047–1048). At this primitive layer that means: a read path that is fresh-from-DB by default, an exported staleness-ceiling constant (`= 60_000` ms), and an invalidate-on-write seam, proven by a freshness-contract test. (No Redis — distributed cache is a future trigger per §1.10 L1077.)

**AC-4 — Cross-Pariwar carve-out RLS, write-isolated (D3-1.6).**
**Given** the architectural carve-out (§1.2 L726–729): Passport tables allow cross-Pariwar **reads** under named conditions, while **writes** stay tenant-scoped
**When** the RLS policies are authored in `packages/domain/src/policies/pariwar-passport-rls.ts`
**Then** the SELECT policy permits cross-Pariwar reads; the write policy (INSERT/UPDATE/DELETE) restricts mutation to the session's own `pariwar_id` (a Pariwar A admin cannot create/alter Pariwar B's passport)
**And** the adversarial cross-Pariwar leak suite is updated so the Passport is asserted as the **expected cross-readable exception** — it must NOT trip the "every cross-tenant read returns zero rows" invariant that governs scoped tables (Story 1.6).

**AC-5 — Branded ID substrate (D12-1.4 + D11-1.5 + W7-1.3).**
**Given** architecture §Naming patterns L3700–3708 ("branded types for cross-cutting domain IDs"; "branding mandatory on first PR for new IDs")
**When** `packages/domain/src/ids/` lands substantively (its declared landing Story)
**Then** branded `PariwarId` exists (plus the architecture-named cross-cutting set as the established pattern) and is used by the new Passport schema + contracts; the branded-ID implementation pattern is recorded (ADR or decision-log).

**AC-6 — Transport contracts + OpenAPI (D10-1.4 pariwar-passport slot).**
**Given** `packages/contracts/src/pariwar-passport/` (placeholder today)
**When** the transport Zod schemas are authored
**Then** every `z.object({...})` ends with `.strict()` (architecture §Format patterns L3824–3826); types are consumed via `@twt/contracts/pariwar-passport` (no shadowing `*.types.ts` in apps/api — anti-pattern #2); and `pnpm contracts:check-openapi-determinism` stays green after re-emit.

**AC-7 — ADR + migration discipline.**
**Given** the ADR slot `ADR-NNNN-pariwar-passport-data-model` (adr-index row; closure trigger = Story 1.7) + the policies/README migration discipline
**When** the migration lands
**Then** a new forward migration creates the table, ENABLEs + FORCEs RLS, GRANTs the group roles the privileges the carve-out needs, and the ADR is drafted; the landing-Story-map README rows for `src/ids/` and `src/per-pariwar/bihar/` are flipped to "landed".

**AC-8 — No regression.**
**Given** the Story 1.6 substrate (events_log RLS, db.ts helpers, live-DB CI job)
**When** the full pipeline runs (`pnpm turbo run lint typecheck test build` + `pnpm db:check` + `contracts:check-openapi-determinism`)
**Then** all prior suites stay green; the new integration suites run under the live-DB CI job; everything skips cleanly when `DATABASE_URL` is unset.

## Tasks / Subtasks

- [x] **Task 0 — Verify baseline + spike** (AC: all)
  - [x] 0.1 At HEAD, run `pnpm install --frozen-lockfile` then `pnpm turbo run lint typecheck test build` — confirm green (Story 1.6 baseline). Capture any anomaly in Completion Notes.
  - [x] 0.2 Bring up local Postgres (Docker `postgres:16-alpine`, host port 5433 per Story 1.6 Debug Log) and run the existing integration suites with `DATABASE_URL` set to confirm the live-DB substrate works before adding to it.
  - [x] 0.3 Read these files end-to-end before writing (they are the patterns you extend, not reinvent): `packages/domain/src/schema/events_log.ts`, `packages/domain/src/policies/events-log-rls.ts`, `packages/domain/src/policies/_roles.ts`, `packages/domain/src/db.ts`, `packages/domain/src/cross-tenant/run-as-cross-tenant.ts`, `packages/domain/src/encryption/column.ts` (piiColumn), `packages/domain/migrations/0002_events-log-rls.sql`, `packages/domain/tests/integration/rls/policy-regression.spec.ts`, `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`, `packages/domain/src/test-utils/integration-setup.ts`, `packages/contracts/src/_common/primitives.ts`.

- [x] **Task 1 — Branded ID substrate** (AC-5)
  - [x] 1.1 Author `packages/domain/src/ids/index.ts` (+ `ids/pariwar-id.ts` etc. if you prefer per-id files) with branded `PariwarId` at minimum, plus the architecture-named cross-cutting set (`MemberId`, `ClaimId`, `PoolId`, `AlertId`, `ContributionId`) following architecture §Naming patterns L3700–3704. Pattern: `type PariwarId = string & { readonly __brand: 'PariwarId' }` + a `pariwarId(s: string): PariwarId` smart constructor that validates UUID shape — import and reuse the already-exported `UUID_REGEX` constant from `src/db.ts` directly; do not re-declare it.
  - [x] 1.2 Use `PariwarId` in the new Passport schema + contracts.
  - [x] 1.3 (Optional, capture in Completion Notes) Resolve D11-1.5: substitute branded `PariwarId` into `EncryptionContext.pariwarId` (`packages/domain/src/encryption/kms-provider.ts`). Resolve D12-1.4: have `packages/contracts/src/_common/primitives.ts` expose a branded UUID variant (Zod `.brand<'PariwarId'>()`) consistent with the domain TS brand — see Dev Note "Branded-ID reconciliation". Resolve W7-1.3 if cheap. Skip the broad retroactive substitution into existing helpers if it balloons scope; capture what you deferred.
  - [x] 1.4 Record the branded-ID implementation pattern (fold into the Passport ADR, or a `.decision-log.md` entry). Note: the enforcing ESLint rule ("`*Id` string types must be branded") is Story 1.16a — do NOT build it here; follow the discipline.

- [x] **Task 2 — Pariwar-Passport schema** (AC-1)
  - [x] 2.1 Author `packages/domain/src/schema/pariwar_passport.ts` with the AC-1 columns. Mirror the `events_log.ts` documentation density + the snake_case-column / camelCase-field discipline. `pariwar_id` is the PK (1:1 with Pariwar). **`created_by` is an unconstrained `uuid` (nullable) — do NOT add a FK constraint; the admin users table does not exist until Story 1.9+. A FK can be added retroactively.**
  - [x] 2.2 Decide `trust_registration_id` nullability + PII tier per Dev Note "PII-tier decision (D7-1.5)"; if any column is PII-bearing, annotate via `piiColumn(tier, fieldClass)` from `@twt/domain` encryption (Story 1.5 primitive). Capture the tier decision in Completion Notes + the ADR.
  - [x] 2.3 Author the `branding_bundle` JSONB column with a typed shape (logo URLs, `primary`/`secondary`/optional `accent` colors); keep JSONB keys snake_case. The runtime-readable subset only — do NOT fold in the FR-60 build-time bundle (tokens/eas.json), see Dev Note "FR-60 vs FR-63 boundary".
  - [x] 2.4 Implement `locale_default` using a Drizzle `pgEnum('locale', ['hi', 'en'])` — idiomatic choice (gives TypeScript union type; drizzle-kit emits a `CREATE TYPE` statement). Do NOT use a raw CHECK string — pgEnum is the established Drizzle pattern. Add indexes only if a query pattern demands it; the PK covers point-lookup by `pariwar_id`.
  - [x] 2.5 Re-export the new table from `packages/domain/src/schema/index.ts` barrel.

- [x] **Task 3 — Carve-out RLS policies** (AC-4, D3-1.6)
  - [x] 3.1 Author `packages/domain/src/policies/pariwar-passport-rls.ts` using the standalone `pgPolicy(...).link(table)` pattern (matches `events-log-rls.ts`). Use these concrete names (following the `eventsLogTenantIsolation*` convention):
    - **`pariwarPassportCrossReadableSelect`** (`for: 'select'`): `using: sql\`true\`` — the named carve-out. `twt_app` can read any Passport row without scope set. Capture the rationale in a header comment: "SELECT deliberately cross-readable per architecture §1.2 L726–729 carve-out; NOT a policy bug."
    - **`pariwarPassportTenantIsolationWrite`** (`for: 'all'`): `using`/`withCheck: pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` — same closed-failure construct Story 1.6 proved (unset scope → NULL → blocked write). Bind both policies `to: appRole`.
  - [x] 3.2 Re-export from `packages/domain/src/policies/index.ts`. The drizzle-kit glob already matches `*-rls.ts` (drizzle.config.ts L48) — no config change needed.
  - [x] 3.3 Update `packages/domain/src/policies/README.md` "Forward pointers" → mark the Story 1.7 carve-out as landed.

- [x] **Task 4 — Migration** (AC-7)
  - [x] 4.1 `pnpm --filter @twt/domain db:generate --name pariwar-passport` to emit `0003_*.sql` + snapshot. Inspect the generated DDL (CREATE TABLE + CREATE POLICY from the pgPolicy links).
  - [x] 4.2 Hand-supplement the migration (mirror `0002_events-log-rls.sql`): `ALTER TABLE pariwar_passport ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`; `GRANT SELECT, INSERT, UPDATE` (+ DELETE only if the write policy covers it) on the table to `twt_app`. Keep DDL idempotent. **Also hand-supplement an `updated_at` auto-update trigger** — this column must change on every UPDATE or AC-3's freshness-timestamp is silently broken:
    ```sql
    CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

    CREATE TRIGGER pariwar_passport_set_updated_at
      BEFORE UPDATE ON pariwar_passport
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ```
    Update `migrations/meta/_journal.json` (idx → 3) with a trailing newline (review P7 precedent).
  - [x] 4.3 Apply against the local DB (`pnpm db:migrate`) and confirm `pnpm db:check` is clean.

- [x] **Task 5 — Read accessor + 60s freshness contract** (AC-2, AC-3)
  - [x] 5.1 Author `packages/domain/src/pariwar-passport/read.ts` exposing `getPariwarPassport(db, pariwarId): Promise<PariwarPassport | null>` and `getBrandingBundle(db, pariwarId)`, returning fresh-from-DB data. These rely on `pariwarPassportCrossReadableSelect` so they work cross-Pariwar — do NOT wrap them in `withPariwarScope` or `runAsCrossTenant`; a plain `db.select()` suffices.
  - [x] 5.2 In the same directory, author `packages/domain/src/pariwar-passport/write.ts` exposing `upsertPariwarPassport(db, data)` (or separate `insertPariwarPassport` / `updatePariwarPassport` as needed). This is the write path that calls `invalidatePariwarPassport`. **Keep the scope narrow** — no HTTP layer, no auth — just the Drizzle insert/update. (The open question is whether to co-locate with `read.ts` instead; choose whichever, but record it in Completion Notes. Either way, a separate logical boundary makes `invalidatePariwarPassport` easy to spot.)
  - [x] 5.3 Implement the freshness contract in `read.ts` (or a co-located `cache.ts`): export `BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000` and a minimal cache-aside wrapper with `invalidatePariwarPassport(pariwarId)`, backed by an in-process `Map<pariwarId, { value, fetchedAt }>`. Wire `write.ts` to call `invalidatePariwarPassport` after every successful INSERT/UPDATE so a trustee write reflects immediately; the TTL is the upper bound for any path that doesn't invalidate. See Dev Note "AC-3 — what 'within 60s' means at a primitive" — keep this minimal, no Redis.

- [x] **Task 6 — Transport contracts + OpenAPI** (AC-6)
  - [x] 6.1 Author `packages/contracts/src/pariwar-passport/*.ts` Zod schemas: the branding-bundle shape, the passport response shape, and (if you choose to register routes) the path contracts for `/api/v1/p/<pariwar_id>/passport/...` (tenant-scoped) + `/api/v1/global/passport/<pariwar_id>` (public read-only) per the dir README. Every object `.strict()`. Use `z.output<>`/`z.input<>` naming.
  - [x] 6.2 Decide whether to register OpenAPI **paths** now or only **components/schemas** — apps/api routes land at 1.9+, so registering schemas (components) is safe; registering a path is optional. Whatever you register, add it to `packages/contracts/scripts/emit-openapi.ts` registry, re-emit, and confirm `contracts:check-openapi-determinism` is byte-stable. Capture the choice in Completion Notes.
  - [x] 6.3 Update `packages/contracts/src/pariwar-passport/README.md` landing line → landed.

- [x] **Task 7 — Tests** (AC-2, AC-3, AC-4, AC-8)
  - [x] 7.1 First, add `seedPassport(tx, pariwarId, data?)` to `packages/domain/tests/integration/_helpers.ts` (follow the `seedEvent` pattern — insert a row as superuser before entering app scope, so ROLLBACK cleans it up). Then author `packages/domain/tests/integration/rls/pariwar-passport-policy-regression.spec.ts` reusing `setupLiveDb` + the updated `_helpers.ts`. Assert:
    - (a) owning Pariwar reads its own passport (use `enterAppScope(client, PARIWAR_A)`; rows ≥ 1)
    - (b) **carve-out** — Pariwar A session reads Pariwar B's passport (rows ≥ 1, the inverse of the events_log isolation test; this is the expected correct behavior)
    - (c) write-isolation — A session INSERT with `pariwar_id = PARIWAR_B` is blocked (`expect(insert).rejects`) — the `pariwarPassportTenantIsolationWrite` policy fires
    - (d) **unset session can SELECT** — use `enterAppRoleNoScope(client)` (sheds superuser without setting scope); the `pariwarPassportCrossReadableSelect` policy is `using: true` so SELECT returns rows even without scope set; assert rows ≥ 1 to confirm the carve-out is live, then assert write is still blocked
  - [x] 7.2 Update `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`: add the Passport as the **expected cross-readable exception** (positive assertion) and ensure it is NOT in the "must return 0 rows" set. This is the single highest-risk regression — a wrong assertion here either (i) green-lights a real leak on scoped tables or (ii) red-fails the legitimate carve-out.
  - [x] 7.3 Freshness-contract unit test for AC-3: a write followed by an invalidation reflects immediately; the TTL constant is `60_000`; stale-read bound holds.
  - [x] 7.4 Contracts test: every pariwar-passport object is `.strict()` (extend the existing strict/assignability tests) + OpenAPI determinism re-run.

- [x] **Task 8 — Docs + closeout** (AC-7, AC-8)
  - [x] 8.1 Draft `ADR-NNNN-pariwar-passport-data-model` in `docs/adr/` (record: table shape, the carve-out read-vs-write asymmetry + named SELECT condition, branding_bundle JSONB shape, locale enum, PII-tier decision for `trust_registration_id`, branded-ID pattern, 60s freshness mechanism). Flip the adr-index Section A row status `slot-reserved-pre-write` → `drafted`.
  - [x] 8.2 Flip landing-Story-map rows: `packages/domain/README.md` §10 (`src/ids/`, `src/per-pariwar/bihar/`), `packages/domain/src/ids/README.md`, `packages/domain/src/per-pariwar/bihar/README.md`. (If you do NOT land per-pariwar/bihar custom fields in this story, say so explicitly and leave its row — see Dev Note "Scope: per-pariwar custom fields".)
  - [x] 8.3 Add `.decision-log.md` entry for the Story 1.7 author-commit. Update `_bmad-output/implementation-artifacts/deferred-work.md`: mark D3-1.6 resolved; mark D7-1.5/D11-1.5/D12-1.4/W7-1.3 resolved or partially-resolved per what you actually did (per [[feedback_closure_language_precision]] — distinguish "Closed by [edit]" from "Resolved via explicit deferral" from "Not addressed").
  - [x] 8.4 Run the full gate (AC-8). Update this story's Status → `review`; fill in Dev Agent Record (Agent Model, Debug Log, Completion Notes, File List, Change Log).
  - [x] 8.5 Update `sprint-status.yaml`: `1-7-...` → `review`, refresh `last_updated`.

## Dev Notes

### What Story 1.7 substantively becomes

The **first domain table after `events_log`**, and the first one that is deliberately **not** tenant-isolated on read. Story 1.6 made `pariwar_id` a database-enforced isolation boundary; Story 1.7 carves the **one named exception** the architecture pre-authorized: a Pariwar's public identity + branding must be readable across tenants (so a multi-Pariwar admin, the public Astro shell, and branded chrome can render any Pariwar's name/logo/colors). The hard part is not the columns — it is getting the **read-cross / write-isolated** RLS asymmetry right and not letting it weaken the leak invariant for scoped tables. It also lands the **branded-ID substrate** (`packages/domain/src/ids/`, declared to land here by four upstream deferrals) and the **first substantive per-domain transport contract** (`packages/contracts/src/pariwar-passport/`).

### Baseline state (built by Stories 1.1–1.6; do not reinvent)

- **`packages/domain`** — Drizzle schema home. `src/schema/` has `_baseline.ts` (marker), `events_log.ts` (Story 1.3). `src/policies/` has `_roles.ts` (`appRole = twt_app`, `serviceRole = twt_service`, both `.existing()`), `events-log-rls.ts`, barrel `index.ts`. `src/db.ts` has `createDb`, `setPariwarScope` (UUID-guarded `SET LOCAL app.pariwar_id`, lowercased), `assertPariwarScopeSet`, `withPariwarScope`. `src/cross-tenant/run-as-cross-tenant.ts` is the `row_security = off` escape hatch (audited). `src/encryption/` (Story 1.5) has `piiColumn(tier, fieldClass)` + `encryptTier1`/`decryptTier1`/`blindIndex` service helpers + `tiers.ts` (`PII_TIER_1..3`). `src/ids/` + `src/per-pariwar/bihar/` are README-only placeholders **declared to land at Story 1.7**.
- **Migrations:** `0000_init-baseline`, `0001_events-log`, `0002_events-log-rls` (the template for ENABLE/FORCE RLS + GRANT + role DDL). Forward-only (architecture §1.8). drizzle-kit emits; RLS-enable/GRANT/role DDL is **hand-supplemented**.
- **Test substrate:** `src/test-utils/integration-setup.ts` (relocated from events in Story 1.6) provides `setupLiveDb` per-test transaction-rollback isolation; export type is `TxContext`. Integration tests are `tests/integration/**/*.spec.ts`, run under `pool: 'forks'`, gated on `DATABASE_URL` (turbo `test` task has `env:[DATABASE_URL]`), skip cleanly when unset. **CI `twt_dev_app` is a superuser + BYPASSRLS** → RLS-enforcement tests `SET LOCAL ROLE twt_app` to shed superuser. In production `twt_dev_app` is a non-superuser member of `twt_app`.
- **`packages/contracts`** — `_common/primitives.ts` has `UuidString = z.string().uuid()` (unbranded, explicitly waiting on Story 1.7). `pariwar-passport/` is `.gitkeep` + README. OpenAPI emitted by `scripts/emit-openapi.ts` (manual registry; only the `_meta/health` toy endpoint today) → `openapi/v1.yaml`; `check-openapi-determinism` asserts byte-identical re-emit. `@twt/contracts` already depends on `@twt/domain` (`workspace:*`), so contracts → domain imports are legal and cycle-free.
- **`apps/api`** is a skeleton (`src/index.ts` + smoke test) — **no HTTP framework, no modules dir populated yet**. This is why Story 1.7 stops at the domain/contracts substrate; the route surface + scope-resolution middleware are Story 1.9 (D4-1.6).

### Carve-out RLS design — the load-bearing nuance (AC-4, D3-1.6)

Architecture §1.2 L726–729: *"Pariwar-Passport tables are the explicit exception. Their RLS policies allow cross-Pariwar reads under named conditions; the policies live in `packages/domain/` alongside scoped-table policies and are reviewed together when the v2 cross-Pariwar UI lands."* Step-2 Cross-Cutting #21 (L337–340) marks it **[P0]**.

Concretely, contrast with `events_log` (fully isolated):

| Operation | `events_log` (scoped) | `pariwar_passport` (carve-out) |
|---|---|---|
| SELECT | `pariwar_id = <session scope>` | **cross-readable** (named condition; recommend `using: true`) |
| INSERT/UPDATE/DELETE | `pariwar_id = <session scope>` | **`pariwar_id = <session scope>`** (unchanged — write stays isolated) |

So the SELECT policy is the carve-out; the write policy reuses Story 1.6's exact closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. The whole point of the carve-out is that `twt_app` (the normal request role) can read passports cross-tenant **via a permissive SELECT policy** — NOT via `runAsCrossTenant` / `row_security = off`. Document this in the policy file header: the Passport is the single place `twt_app` legitimately cross-reads without the escape hatch. The exact "named condition" wording (e.g. `true` vs a predicate restricting to a `is_public` subset) is finalized in the ADR; recommend the simplest correct form and record the rationale. Per D3-1.6 the carve-out policies are **reviewed together with the scoped policies** — keep them in the same `policies/` dir with a clear header.

### AC-3 — what "within 60 seconds" means at a primitive layer

Architecture §1.10 (L1040–1077) names three caches; the branding bundle is the **"Static reference data cache — Pariwar config, 60s TTL with cache-aside, invalidated on trustee write"** (L1047–1048). Redis is explicitly a **future** trigger (L1077) — do not introduce it. There is no rendering surface or HTTP server yet, so a full end-to-end cache is premature. The right primitive deliverable: (1) a fresh-from-DB read accessor (the DB row is source of truth); (2) an exported staleness ceiling `BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000` that downstream caches must honor; (3) an `invalidatePariwarPassport(pariwarId)` seam the write path calls; (4) a freshness-contract test. Keep it minimal and in-process. The `updated_at` column (AC-1) is the freshness timestamp / stale-while-revalidate marker (§1.10 L1068–1070). **Cache placement decision:** co-locate the in-process `Map` cache + `BRANDING_BUNDLE_MAX_STALENESS_MS` constant in `read.ts` (or extract to `cache.ts` if it grows). Do NOT build a distributed cache — Redis is a future trigger per §1.10 L1077. Do not gold-plate a cache for consumers that do not exist yet.

### FR-60 (build-time bundle) vs FR-63 (runtime DB branding) — keep them distinct

FR-60's "single file/directory loadable at build time" = the **compile-time** overlay: `packages/tokens/src/per-pariwar/<id>/`, `packages/i18n/src/per-pariwar/<id>/`, `apps/mobile/eas.json` (architecture L4326, L4339, L4623). That is swapped per-app-build and lands with the provisioning/Astro-shell work (Story 1.15 / Epic 11a). FR-63's `branding_bundle` JSONB **column** is the **runtime** subset read dynamically for chrome. Story 1.7 owns the **runtime DB branding_bundle only**. Scope the JSONB to the epic-AC fields (logo URLs, primary/secondary/accent colors) — do not pull in copy strings / app icon / store metadata (those are build-time).

### PII-tier decision for `trust_registration_id` (D7-1.5)

deferred-work D7-1.5 says "per-Pariwar manifest tier-1 fields at Story 1.7" invoke `piiColumn(tier, fieldClass)`. The Passport is **org-level** identity, not member PII, so most fields (display names, colors, locale) are tier-3 (plaintext) and public by design (the carve-out makes them cross-readable). `legal_name` is public registry data. `trust_registration_id` is a government registration number — assess it against the FR-74 Public-vs-Private matrix (the canonical classification authority per `tiers.ts`). If it is public-by-nature (trust registration numbers often are), tier-3 is correct; if treated as sensitive, annotate via `piiColumn(2, 'trust_registration_id')` (blind-index, equality-lookup) — but note tier-2/1 fields cannot be plaintext in the cross-readable carve-out, which is a tension to resolve in the ADR. **Recommend tier-3 for v1** (org public identity) with the decision explicitly recorded; do not silently encrypt a field that the carve-out is meant to expose. Capture in Completion Notes + ADR either way.

### Branded-ID reconciliation (D12-1.4, D11-1.5, W7-1.3)

`packages/domain/src/ids/` holds **TS branded types** (`string & { __brand }`). `packages/contracts/` needs a Zod representation. Zod `.brand<'PariwarId'>()` produces a structurally-compatible branded output type. Keep one canonical brand name per ID. Recommended split: domain `ids/` owns the TS brand + smart constructor (UUID-validating); contracts `_common/primitives.ts` exposes `PariwarIdSchema = z.string().uuid().brand<'PariwarId'>()` whose `z.output<>` is assignable to the domain brand. Don't force a hard import of domain TS types into the Zod runtime if it complicates the openapi emit — alignment by brand string is sufficient. The broad retroactive substitution into existing helpers (events `loadEvents`/`appendEvent` W7-1.3, all `pariwarId: string` signatures) is **optional** — do `PariwarId` end-to-end in the new Passport code; substitute elsewhere only if it stays cheap, and capture what you deferred. "Branding mandatory on first PR for new IDs" (L3706) applies to the discipline; the **ESLint enforcement** is Story 1.16a — don't build it.

### Scope: per-pariwar custom fields (architecture §1.7 L936–985)

`src/per-pariwar/bihar/README.md` says Story 1.7 "lands the Pariwar-Passport-coupled custom fields." That is the JSONB per-tenant custom-field mechanism (GIN-indexed extension columns on members/claims/pools) — distinct from the Passport table. The epic Story 1.7 ACs do **not** require custom fields; the members/claims/pools tables those columns attach to don't exist until Epic 3/6/7. **Recommendation:** do NOT land substantive per-Pariwar custom fields in this story (no host tables yet). Land only the Passport + branding. Leave `per-pariwar/bihar/` as a placeholder (or land just the Bihar `manifest.ts` identity-envelope stub if it naturally couples to the Passport) and state the deferral explicitly in Completion Notes + deferred-work, rather than silently skipping (per [[feedback_closure_language_precision]]).

### Naming + table-name decision

Architecture §Naming patterns L3664: tables are `snake_case` **plural**. The Passport is 1:1 with a Pariwar (a singleton identity document). Recommend table name **`pariwar_passport`** (reads as the identity document, keyed by `pariwar_id` PK); acknowledge the plural convention and record the deliberate choice in the ADR + Completion Notes (the alternative `pariwar_passports` is defensible). The policy file is `pariwar-passport-rls.ts` regardless (kebab-case per dir convention). Raw SQL in migrations stays snake_case (§Naming L3674–3677 CI lint).

### Architecture-vs-epic alignment check

No substantive divergence. Two precisions: (1) the epic AC says branding is consumable by "Epic 11a public Astro shell and admin UI chrome (Story 1.9 onwards)" — those surfaces don't exist yet, so AC-2's deliverable is the **substrate** (carve-out read path + contract), not a live render. (2) The epic AC lists `branding_bundle (logo URLs, primary/secondary colors, optional accent)` — that is the runtime subset, narrower than FR-60's full build-time bundle (see boundary note). The `updated_at` column is an additive enhancement (not in the epic column list) justified by AC-3 freshness — flag as a deliberate add.

### Dev guardrails — what makes this implementation go smoothly

- **Extend, don't reinvent.** Copy the `events-log-rls.ts` standalone `pgPolicy(...).link()` pattern, the `0002` migration's ENABLE/FORCE/GRANT block, and the `setupLiveDb` + `SET LOCAL ROLE twt_app` test pattern. The closed-failure `nullif(current_setting('app.pariwar_id', true), '')::uuid` construct is proven — reuse it verbatim for the write policy.
- **The leak test is the tripwire.** The cross-pariwar-leak suite encodes a P0 invariant. Adding a cross-readable table is exactly the kind of change that can silently weaken it. Be surgical: the Passport is a *named positive exception*, asserted as cross-readable; every other table must still return 0 rows cross-tenant.
- **Don't invert package layers.** `@twt/domain` must not import `@twt/events` or `@twt/contracts` (turbo cycle — Story 1.6 hit this). Contracts → domain is the legal direction. The read accessor lives in domain; the Zod contract lives in contracts and may import domain `ids`.
- **Migration transactionality.** Follow the `0002` breakpoint precedent (W4-CR1.6 noted ENABLE-without-FORCE risk under per-statement autocommit) — keep ENABLE + FORCE together; verify after apply with a `pg_class` `relforcerowsecurity` check if you add a self-test.
- **`SET LOCAL` needs a transaction.** Any read accessor that sets scope must do so inside a tx (`withPariwarScope` is safe). But the carve-out SELECT doesn't *need* scope set (it's cross-readable) — note that in the accessor.

### Project Structure Notes

New files (relative to repo root):
```
packages/domain/src/
  ids/index.ts                              [NEW] branded PariwarId (+ named set) — flips placeholder
  schema/pariwar_passport.ts                [NEW] table def
  policies/pariwar-passport-rls.ts          [NEW] pariwarPassportCrossReadableSelect + pariwarPassportTenantIsolationWrite
  pariwar-passport/read.ts                  [NEW] getPariwarPassport, getBrandingBundle, in-process cache, BRANDING_BUNDLE_MAX_STALENESS_MS
  pariwar-passport/write.ts                 [NEW] upsertPariwarPassport; calls invalidatePariwarPassport
packages/domain/migrations/
  0003_pariwar-passport.sql                 [NEW] (generated + hand-supplemented)
  meta/0003_snapshot.json                   [NEW]
packages/domain/tests/integration/
  rls/pariwar-passport-policy-regression.spec.ts   [NEW]
packages/contracts/src/pariwar-passport/
  branding-bundle.ts, passport.ts (or similar)     [NEW] .strict() Zod
docs/adr/ADR-NNNN-pariwar-passport-data-model.md    [NEW]
```
Modified: `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts` (+ README), `packages/domain/src/ids/README.md`, `packages/domain/src/per-pariwar/bihar/README.md`, `packages/domain/README.md` (§10 map), `packages/domain/migrations/meta/_journal.json`, `packages/domain/tests/integration/_helpers.ts` (add `seedPassport`), `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`, `packages/contracts/src/pariwar-passport/README.md`, `packages/contracts/scripts/emit-openapi.ts` (+ `openapi/v1.yaml`), optionally `packages/contracts/src/_common/primitives.ts` + `packages/domain/src/encryption/kms-provider.ts`, `docs/knowledge-transfer/adr-index.md`, `.decision-log.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `sprint-status.yaml`, this story file.

drizzle-kit discovery: schema glob `./src/schema/*.ts` auto-picks `pariwar_passport.ts`; policy glob `./src/policies/*-rls.ts` auto-picks `pariwar-passport-rls.ts` — no `drizzle.config.ts` change.

### Testing standards summary

Integration tests: `packages/domain/tests/integration/**/*.spec.ts`, `pool: 'forks'`, reuse `setupLiveDb` (`TxContext`) + `tests/integration/_helpers.ts`, `SET LOCAL ROLE twt_app` to shed the CI superuser, gated on `DATABASE_URL`, must skip cleanly when unset. Each policy ships positive AND negative assertions (policies/README "Test discipline"). The carve-out adds an inverted positive (cross-read allowed) — be explicit that this is intentional. Unit tests for the freshness contract + the branded-ID smart constructor. Contracts: extend the `.strict()` + type-assignability tests; re-run OpenAPI determinism. Local Postgres: Docker `postgres:16-alpine` host port 5433 (host 5432 may be occupied — Story 1.6 Debug Log); CI uses 5432.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.7] (L1100–1115); FR-63 (L123), FR-60 (L120); Epic 1 framing (L968–984)
- [Source: architecture.md §1.2 RLS + carve-out] (L715–770, esp. L726–729 carve-out); Step-2 Cross-Cutting #16 + #21 (L320–321, L337–340)
- [Source: architecture.md §1.7 per-tenant custom fields] (L936–985); §1.10 caching (L1040–1077, branding = L1047–1048); §2.5 multi-Pariwar URL/users (L1455–1474)
- [Source: architecture.md §Naming patterns] (L3661–3728, branded IDs L3700–3708); §Format patterns `.strict()` (L3824–3826); module map §4.8 multi-Pariwar (L4524), branded IDs cross-cutting (L4538); dir tree (L4303, L4326, L4341–4360, L4376)
- [Source: deferred-work.md] D3-1.6 (carve-out RLS, trigger=Story 1.7), D7-1.5 (Passport PII tier), D11-1.5 (branded PariwarId→EncryptionContext), D12-1.4 (branded IDs + primitives upgrade), W7-1.3 (UUID validation)
- [Source: docs/knowledge-transfer/adr-index.md] `ADR-NNNN-pariwar-passport-data-model` (closure trigger = Story 1.7)
- [Source: Story 1.6 file] db.ts helpers, `events-log-rls.ts`, `0002` migration, test substrate, CI-superuser finding
- [Source: packages/contracts/src/pariwar-passport/README.md] endpoint shapes `/api/v1/p/<pariwar_id>/passport/...` + public `/api/v1/global/passport/<pariwar_id>`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (`claude-opus-4-8`) — bmad-dev-story workflow, Solo Builder (BigDev). Branch `story-1.7-pariwar-passport` off local `main` HEAD `1474194` (Story 1.6 / PR #12).

### Debug Log References

- **Baseline anomaly (Task 0.1):** `pnpm turbo run lint` was RED at HEAD `1474194` — `packages/domain/src/test-utils/integration-setup.ts:130` `catch (_err)` trips `@typescript-eslint/no-unused-vars` (`caughtErrors: 'all'`, no `caughtErrorsIgnorePattern` in the shared `@twt/eslint-config-twt`). Confirmed committed (`git show HEAD:…`) — genuinely pre-existing from Story 1.6. Fixed with an optional catch binding (`} catch {`); domain lint green after. Prerequisite for AC-8.
- **Local Postgres (Task 0.2):** Docker `postgres:16-alpine` on host port 5433 (`twt-test-pg`). `db:migrate` applied 0000–0002 then 0003; domain integration suites green (55 → 81 passed as Story 1.7 tests landed).
- **Trigger-test correctness:** Postgres `now()` is the transaction timestamp (frozen per-tx), so within the per-test BEGIN/ROLLBACK envelope `created_at == updated_at` — a strict greater-than across two writes is impossible. Reworked the `updated_at` test to prove the trigger FIRES by overriding a caller-supplied stale year-2000 value → reset to tx `now()`.
- **Branding typecheck:** `.$type<PariwarId>()` made Drizzle `eq(pariwar_passport.pariwar_id, …)` require a branded RHS; branded the shared test constants `PARIWAR_A/B/X/Y` (a `PariwarId` is assignable wherever a `string` is expected, so events_log call sites are unaffected). Branding working as intended.
- **`UUID_REGEX` export:** story Task 1.1's "already-exported `UUID_REGEX`" premise was inaccurate (module-private in `db.ts`); added `export` and reused it (one UUID-shape authority, no re-declaration).

### Completion Notes List

Substrate landed across Tasks 0–8 (all subtasks complete); full gate green (see Change Log). Key decisions recorded per the story's "capture in Completion Notes" asks:

- **Table name:** `pariwar_passport` (SINGULAR) — deliberate exception to the snake_case-plural convention (it's a 1:1 singleton identity document). Recorded in ADR-0007.
- **PII-tier (D7-1.5):** `trust_registration_id` = **tier-3 (plaintext, public-by-nature)**, NOT `piiColumn()`-annotated, nullable. The cross-readable carve-out exists to expose the Passport; encrypting a carve-out field would make it useless to cross-tenant readers. Assessed against the FR-74 matrix as public registry data.
- **Carve-out RLS:** SELECT `USING (true)` (cross-readable) + write `FOR ALL` tenant-scoped (Story 1.6 `nullif(...)::uuid` construct). Migration GRANTs SELECT/INSERT/UPDATE but **NOT DELETE** (singleton doc; DELETE withheld at the privilege layer). `updated_at` BEFORE UPDATE trigger added (AC-3 marker).
- **Freshness (AC-3):** in-process `Map` cache-aside + `BRANDING_BUNDLE_MAX_STALENESS_MS = 60_000` + `invalidatePariwarPassport` (called by `upsertPariwarPassport`). No Redis (future trigger §1.10 L1077). Cache co-located in `read.ts`; write path in a separate `write.ts` (keeps the invalidate call easy to spot).
- **Contracts/OpenAPI (AC-6):** registered `BrandingBundle` + `PariwarPassportResponse` as **components/schemas only** (no paths — apps/api routes are Story 1.9+). `PariwarIdSchema = z.string().uuid().brand<'PariwarId'>()` added to `_common/primitives.ts` (D12-1.4), brand-name-aligned (not symbol-identical) with the domain brand. Upsert/request contract + `@twt/contracts/pariwar-passport` subpath export deferred to Story 1.9 (D1-1.7). Determinism byte-stable.
- **Branded IDs (AC-5):** `PariwarId` + `MemberId`/`ClaimId`/`PoolId`/`AlertId`/`ContributionId` with UUID-validating smart constructors. Used end-to-end in the new Passport code.
- **Deferrals (per [[feedback_closure_language_precision]]):** D3-1.6 + D12-1.4 + `src/ids/` landing = **Closed by [edit]**. D7-1.5 = **partially Closed** (Passport leg done; member/claim/etc. legs deferred). D11-1.5 (brand → `EncryptionContext`) = **Resolved via explicit deferral** (ripples through 4 encryption sources + 4 test files; story authorises skipping). W7-1.3 (events UUID validation) = **UNBLOCKED but Not addressed** (`@twt/events` territory). Per-Pariwar custom fields (`per-pariwar/bihar/`) = **Resolved via explicit deferral** (no host members/claims/pools tables until Epic 3/6/7). New: D1-1.7..D6-1.7 recorded in deferred-work.md.
- **ADR:** ADR-0007 drafted; adr-index Section A row flipped → `drafted`; Decision 2026-06-11-043 logged.

### File List

**New:**
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/schema/pariwar_passport.ts`
- `packages/domain/src/policies/pariwar-passport-rls.ts`
- `packages/domain/src/pariwar-passport/read.ts`
- `packages/domain/src/pariwar-passport/write.ts`
- `packages/domain/src/pariwar-passport/index.ts`
- `packages/domain/migrations/0003_pariwar-passport.sql`
- `packages/domain/migrations/meta/0003_snapshot.json`
- `packages/domain/tests/ids/branded-ids.test.ts`
- `packages/domain/tests/pariwar-passport/freshness.test.ts`
- `packages/domain/tests/integration/rls/pariwar-passport-policy-regression.spec.ts`
- `packages/contracts/src/pariwar-passport/branding-bundle.ts`
- `packages/contracts/src/pariwar-passport/passport.ts`
- `packages/contracts/src/pariwar-passport/index.ts`
- `packages/contracts/tests/pariwar-passport.test.ts`
- `docs/adr/ADR-0007-pariwar-passport-data-model.md`

**Modified:**
- `packages/domain/src/db.ts` (export `UUID_REGEX`)
- `packages/domain/src/index.ts` (export `ids` + `passport` namespaces + `UUID_REGEX`)
- `packages/domain/src/schema/index.ts` (re-export `pariwar_passport`)
- `packages/domain/src/policies/index.ts` (re-export `pariwar-passport-rls`)
- `packages/domain/src/policies/README.md` (forward pointer → landed)
- `packages/domain/src/ids/README.md` (→ landed)
- `packages/domain/src/per-pariwar/bihar/README.md` (custom-fields deferral)
- `packages/domain/README.md` (§10 landing-map + dir tree)
- `packages/domain/migrations/meta/_journal.json` (idx → 3 + trailing newline)
- `packages/domain/src/test-utils/integration-setup.ts` (baseline lint fix — optional catch binding)
- `packages/domain/tests/integration/_helpers.ts` (add `seedPassport` + brand `PARIWAR_A/B/X/Y`)
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Passport = expected cross-readable exception)
- `packages/contracts/src/_common/primitives.ts` (add `PariwarIdSchema`)
- `packages/contracts/src/index.ts` (re-export `pariwar-passport`)
- `packages/contracts/src/pariwar-passport/README.md` (→ landed)
- `packages/contracts/scripts/emit-openapi.ts` (register `BrandingBundle` + `PariwarPassportResponse` components)
- `openapi/v1.yaml` (re-emitted — 4087 bytes)
- `docs/knowledge-transfer/adr-index.md` (ADR-0007 row → `drafted`; row-count + header summary)
- `.decision-log.md` (Decision 2026-06-11-043)
- `_bmad-output/implementation-artifacts/deferred-work.md` (D3-1.6/D7-1.5/D11-1.5/D12-1.4/W7 dispositions + Story 1.7 section D1-1.7..D6-1.7)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-7 → `review`)
- `_bmad-output/implementation-artifacts/1-7-pariwar-passport-data-model-branding-bundle.md` (this file)

**Removed:** `packages/domain/src/ids/.gitkeep`, `packages/contracts/src/pariwar-passport/.gitkeep`

### Change Log

| Date | Change |
| ---- | ------ |
| 2026-06-11 | Story 1.7 substantive author-commit (Tasks 0–8). Fixed pre-existing baseline lint anomaly (Story 1.6 `_err`). Landed: branded-ID substrate (`src/ids/`); `pariwar_passport` table + locale enum + `BrandingBundle`; cross-readable/write-isolated carve-out RLS (`pariwar-passport-rls.ts`); migration 0003 (ENABLE+FORCE RLS, GRANT-no-DELETE, `updated_at` trigger); read accessor + write path + 60s in-process freshness contract; first per-domain transport contracts + branded `PariwarIdSchema` + OpenAPI components; carve-out policy-regression + freshness + branded-ID + contracts tests; ADR-0007 drafted. **Gate:** `pnpm turbo run lint typecheck test build` 56/56 green; `db:check` + `contracts:check-openapi-determinism` green; live-DB (Postgres 16) `test --filter=@twt/domain --filter=@twt/events` → domain 81 passed/1 skipped + events 31 passed. Status → review. Decision 2026-06-11-043; deferred D3-1.6/D12-1.4 closed, D7-1.5 partial, D11-1.5/W7-1.3 deferred, D1-1.7..D6-1.7 added. |

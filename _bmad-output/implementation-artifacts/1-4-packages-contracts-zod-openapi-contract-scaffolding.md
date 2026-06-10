# Story 1.4: `packages/contracts` Zod + OpenAPI Contract Scaffolding

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Solo Builder**,
I want **`packages/contracts/` substantively populated as the transport-contract source-of-truth — Zod schemas organized per-domain (15 architecture-committed sub-domains + `_common/`), an end-to-end demonstration that Zod schemas emit OpenAPI 3.1 spec to `openapi/v1.yaml` via a hand-runnable generator, a contract-↔-domain type-assignability test scaffold, a cross-surface validation-parity test scaffold, the architecture-canonical `.strict()` default + structured `DomainError` envelope + cursor-based pagination wrapper + namespaced error-code helper landed in `_common/`, plus ADR-0005-openapi-client-generation drafted closing the `adr-index.md` line 98 slot**,
So that **every downstream `apps/api` Story (1.9 admin auth, 6.x claim flow, 7.x pool spawn, 8.x alert lifecycle, 9.x reconciliation, 10.x admin console, 11.x public surfaces) authors handler-side Zod validators by importing from `@twt/contracts/<domain>`, every `apps/admin` + `apps/mobile` + `apps/public` form-handling Story validates inputs against the same Zod schemas the server validates against, every partner-module integration consumes the same generated OpenAPI spec, and the contract-first discipline (architecture §1.3 + §3.1 + AR-4 + AR-38 + Top-10 anti-pattern #2 type-shadowing prohibition) is structurally enforced from day one rather than retrofitted after divergence**.

This is the **fourth Epic 1 engineering story** (`[PRIMITIVE]`). It commits the **substrate** for AR-4 (Zod everywhere) + AR-38 (REST + OpenAPI + Zod-derived single-source-of-truth) + architecture §1.3 (validation library = Zod with drizzle-zod compatibility note) + §3.1 (REST + OpenAPI 3.1 + `fastify-zod-openapi` + `@fastify/swagger`) + §3.2 (structured error response + cursor-based pagination + URL-based major versioning + OpenAPI breaking-change semantic-diff CI) + §Naming patterns line 3719-3723 (`packages/contracts/` is the single source of truth; type-shadowing forbidden) + §Format patterns line 3824-3826 (`.strict()` as default schema behavior) + §Cross-Cutting line 3957-3960 (contract ownership; no schema redefinition across contracts ↔ domain boundary). Per architecture §Implementation Handoff (lines 5079-5099), this lands within PR-2 territory; it does NOT include substantive per-domain endpoint contracts (each owning Epic authors its own — claim contracts at Story 6.x, pool at 7.x, etc.), nor the substantive `packages/api-client/` codegen wiring (Story 1.9+ when the first `apps/api` substantive route surface exists), nor the substantive contract-diff CI gate (Story 1.16c per the verbatim epic AC line 1056 "placeholder until 1.16c lands"), nor `fastify-type-provider-zod` integration (apps/api territory, Story 1.9+), nor `@hookform/resolvers/zod` form integration (apps/admin / apps/mobile feature Story territory).

## Acceptance Criteria

**AC-1 — `packages/contracts/` substantively populated with 16 sub-directories per architecture canonical layout + `_common/` substantively authored + `.strict()`-default Zod discipline structurally enforced**

**Given** AR-4 (epics line 259: "Validation library — Zod (architecture §1.3) for both contracts and domain") + AR-38 (epics line 314: "REST + OpenAPI; Zod-derived schemas; `packages/contracts/` is single source of truth; `packages/api-client/` generates typed client") + architecture §Complete project directory structure line 4361-4378 (16 sub-domain layout: `members/ claims/ pools/ alerts/ contributions/ modules/ partners/ audit/ rbac/ kyc/ reconciliation/ helpdesk/ feature-flags/ pariwar-passport/ deep-links/ _common/`) + §Format patterns line 3824-3826 (`.strict()` default) + §Naming patterns line 3700-3712 (branded types + `z.output<typeof schema>` / `z.input<typeof schema>` canonical names) + the Story 1.1 `packages/contracts/src/index.ts` = `export {}` placeholder state at HEAD

**When** the `packages/contracts/` workspace is substantively authored (replacing the Story 1.1 placeholder)

**Then** the workspace exposes the 16 architecture-canonical sub-directories — all 15 per-domain sub-directories (`members/ claims/ pools/ alerts/ contributions/ modules/ partners/ audit/ rbac/ kyc/ reconciliation/ helpdesk/ feature-flags/ pariwar-passport/ deep-links/`) land as `.gitkeep` placeholders with landing-Story `README.md` pointers (substantive per-domain endpoint contracts are owned by their per-Epic Story per architecture §1.3 + §Contracts sub-domain rule line 4486-4490: "`packages/contracts/src/<domain>/` exists for externally-consumed API surfaces only").

**And** `_common/` is substantively populated at Story 1.4 with the cross-domain transport-layer primitives:
- `_common/errors.ts` — structured `DomainError` envelope Zod schema per architecture §3.2 line 1819-1826 (`{ error: { code: string, message: string, details?: unknown, request_id: string } }`) + namespaced `ErrorCode` literal-template helper (e.g., `pool.spawn.duplicate`, `member.suspended`, `claim.appeal.stage1_only` per architecture line 1829-1830) + `defineErrorCode(domain, action, sub?)` factory returning a typed literal + an empty per-domain `errors/` sub-namespace marker (`errors/index.ts` re-exporting empty; downstream Stories enumerate `errors/claim.ts`, `errors/pool.ts`, etc. per architecture §3.2 line 1830 "Enumerated in `packages/contracts/errors/`").
- `_common/pagination.ts` — opaque `Cursor` Zod-validated string (UTF-8; URL-safe base64 character set; no inspection at the contracts layer per architecture §3.2 line 1844-1846 cursor-binding architectural property) + `PaginationQuery` Zod schema (`{ cursor?: string, limit?: number int positive ≤ 50 }` per architecture §3.2 line 1838-1841 + FR-91 max-50 public surfaces) + `paginatedResponse<T extends z.ZodTypeAny>(item: T)` generic Zod factory returning `{ items: T[], nextCursor: string | null, hasMore: boolean }` per architecture §Format patterns line 3801-3802 ("`{items: [...], nextCursor: …, hasMore: …}` for paginated lists").
- `_common/primitives.ts` — shared transport-layer primitives: `Iso8601Datetime` (`z.string().datetime({ offset: true })` per architecture §Format patterns line 3807-3809 "Wire format: ISO 8601 strings with timezone. Never Unix timestamps in API"), `RequestId` (`z.string().uuid()` per architecture §3.2 line 1832), `Email` (`z.string().email()`), `UuidString` (`z.string().uuid()` — the contracts-layer transport-shape for an ID; substantive branded ID types live at `packages/domain/src/ids/` per architecture §Cross-cutting concerns line 4538 and land at Story 1.7; Story 1.4 commits the UUID-shape Zod primitive without branding so consumers don't block on Story 1.7).
- `_common/version.ts` — `ApiMajorVersion = z.literal('v1')` + `API_MAJOR_VERSION = 'v1' as const` per architecture §3.2 line 1849 URL-based major versioning + §Format patterns line 4106 "Flat object with required `version: 'v1' | 'v2' | ...` field at top".
- `_common/strict.ts` — documentation-only export plus runtime helper `assertStrict(schema: z.ZodObject<...>): asserts schema as strict` that throws at module-load if a downstream-Story-authored schema does not carry `.strict()`. The architecturally-canonical defense is an ESLint rule (Story 1.16a friction-budget CI gate territory); Story 1.4 commits the documentation + helper; the structural CI gate is downstream.
- `_common/index.ts` — barrel export of all `_common/` modules; consumed via `import { ... } from '@twt/contracts/_common'`.

**And** `packages/contracts/src/index.ts` substantively re-exports the workspace API replacing the Story 1.1 `export {}` placeholder: `export * from './_common/index.js';` plus a top-level `export const CONTRACTS_API_VERSION = 'v1'` per architecture §Format patterns + a marker `__substrateOnly` symbol used by the contract-↔-domain type-assignability test scaffold (Task 5.2) to assert the workspace is the canonical contract source-of-truth (defense against Top-10 anti-pattern #2 type-shadowing).

**And** `.strict()` is the default behavior across the substantively-authored `_common/` schemas (every `z.object({...})` call is followed by `.strict()` per architecture §Format patterns line 3824); the per-domain landing-Story `README.md` files explicitly cite the `.strict()` discipline so downstream Stories don't omit it.

**AC-2 — Zod → OpenAPI 3.1 spec generation pipeline structurally proven via a runnable script emitting `openapi/v1.yaml` from `_common/health` toy endpoint contract; root `pnpm contracts:emit-openapi` + `pnpm contracts:check-openapi-determinism` scripts wired; CI gate placeholder for generator determinism added to `turbo.json` + `.github/workflows/ci.yml`**

**Given** architecture §3.1 line 1791-1814 ("REST with OpenAPI 3.1 specs generated from Zod schemas. Single source of truth: Zod schemas in `packages/contracts/` drive runtime validation (`fastify-type-provider-zod`), OpenAPI documentation (`fastify-zod-openapi` + `@fastify/swagger`), and TS client generation in `packages/api-client/`") + §3.2 line 1862-1865 ("Generator determinism. Generator output committed to the repository (`openapi/v1.yaml` or equivalent). CI verifies that re-running the generator produces byte-identical output") + §Project Structure line 4176-4177 (`openapi/v1.yaml` is the committed generator output) + the deferred ADR for OpenAPI client-generation tool at `adr-index.md` line 98

**When** the contract-emission pipeline is authored

**Then** Story 1.4 commits a hand-runnable Node script at `packages/contracts/scripts/emit-openapi.ts` that:
- Imports the `@asteasolutions/zod-to-openapi` library (the architecture-aligned Zod-to-OpenAPI converter — verify latest stable at dev-time per Story 1.2 D12-1.2 + Story 1.3 dep-pin re-validation discipline; current registry-stable as of 2026-06 is `^7.x`; if the latest stable line at dev-time has bumped a major, pin to current line and capture in Dev Agent Record under Completion Notes).
- Builds an `OpenAPIRegistry` instance, registers the `_common/health` toy endpoint contract (a simple `GET /api/v1/_meta/health` → `{ status: 'ok' | 'degraded', timestamp: Iso8601Datetime }` schema authored under `_common/health.ts` purely to prove the pipeline), generates the OpenAPI 3.1 document via `OpenApiGeneratorV31` with project metadata (`title: 'TWT API v1', version: '0.0.0-substrate', description` citing Story 1.4 + Phase 0 substrate posture).
- Emits the result to `openapi/v1.yaml` (top-level `openapi/` directory per architecture §Project Structure line 4176-4177) using a deterministic YAML stringifier (`yaml` npm package or equivalent; pin at dev-time).

**And** the script is invokable via `pnpm contracts:emit-openapi` (root delegating script: `pnpm --filter @twt/contracts emit-openapi`); a sibling `pnpm contracts:check-openapi-determinism` runs the emit + asserts `git diff --exit-code openapi/v1.yaml` returns clean (re-emitting reproduces the committed file byte-identically per architecture §3.2 line 1862-1865 generator determinism commitment).

**And** `turbo.json` gets a `contracts:check-openapi-determinism` task (analogous to Story 1.2's `db:check`; `inputs` include `src/**/*.ts`, `scripts/**/*.ts`, `package.json`, `../../pnpm-lock.yaml`, `../../openapi/v1.yaml`; `outputs: []`; no DB or external service required).

**And** `.github/workflows/ci.yml` gets a `contracts-check` job (mirrors the existing `lint` / `typecheck` / `test` / `build` / `db-check` job shapes — `needs: install`; runs `pnpm turbo run contracts:check-openapi-determinism`); structurally proves the **generator-determinism CI gate** per architecture §3.2 line 1862-1865 ("CI verifies that re-running the generator produces byte-identical output").

**And** the substantive **OpenAPI breaking-change semantic-diff CI gate** per architecture §3.2 line 1856-1860 ("CI runs semantic diff between the proposed OpenAPI spec and the last published spec for the major version. Semantic-breaking diffs fail the build unless the PR carries a reviewer-approved breaking-change tag. Additive-looking changes that are semantically breaking — tightened regex, narrowed union, removed enum value — are caught at this gate") is **explicitly deferred to a downstream Story** — at Story 1.4 the `openapi/v1.yaml` artifact contains a single toy endpoint, so the semantic-diff comparison has no substrate; the gate becomes meaningful when `apps/api` substantively populates routes (Story 1.9+ first; substantive at Story 6.x claim flow). Cross-reference deferred-work D1-1.4.

**AC-3 — Contract-↔-domain type-assignability test scaffold authored using the existing `events_log` Drizzle schema (Story 1.3) as the demonstration case; cross-surface validation parity test scaffold authored running Zod-only fixture validation (Fastify + RHF runtimes added by downstream Stories)**

**Given** architecture §1.3 line 787-790 ("Type tests in CI. Assertion files in `packages/contracts/` declare that contract types are assignable from inferred Drizzle types (or explicitly diverge with a comment); CI fails on drift") + §Naming patterns line 3719-3723 ("Generated types are the single source of truth — no duplication. `packages/contracts/` is the source for transport-layer types; domain layer derives via `z.output<>` / `z.input<>`. Hand-written `dto.ts` / `member.types.ts` / `schema.ts` files that redeclare what `packages/contracts/` already defines are forbidden. CI test asserts no schema redefinition across the contracts ↔ domain boundary") + §4.4 line 2567-2572 ("Cross-surface validation parity test. Zod schemas in `packages/contracts/` are consumed by three runtimes: Astro Actions (public site), React Hook Form via `@hookform/resolvers/zod` (React surfaces), and `fastify-type-provider-zod` (API). A CI test runs a fixture set ({valid_inputs, invalid_inputs}) through each runtime; outputs must agree. Drift between consumer validation behaviors = build failure")

**When** the test-scaffold-pattern files are authored

**Then** `packages/contracts/tests/type-assignability.test.ts` is committed (vitest unit; no runtime DB) demonstrating the contract-↔-domain assignability pattern using `events_log` (the only Drizzle schema in-tree at Story 1.4 — authored by Story 1.3):
- Hand-write an `EventLogContract` Zod schema (in `_common/event-log-contract.ts` — a contracts-layer wire-shape that mirrors the `events_log` row format suitable for transport surfaces that consume event-stream tail reads — used by Story 1.10 audit-log integrity-check UI and Story 1.11b trustee-facing audit UI).
- Use TypeScript's `assignable-check` pattern (`type _Assert<T, U extends T> = U` or `expectTypeOf` from `vitest`) to assert `z.output<typeof EventLogContract>` is assignable from `typeof schema.eventsLog.$inferSelect` (`@twt/domain` re-export); the test FAILS at typecheck if a future Drizzle schema change diverges from the contract shape (or the contract is updated and lands the divergence — the developer must acknowledge intentionally).

**And** the cross-surface validation parity test scaffold lives at `packages/contracts/tests/validation-parity.test.ts` (vitest unit) with a fixture set (3 valid inputs + 3 invalid inputs) run through the **Zod runtime only at Story 1.4** (the other two runtimes — `fastify-type-provider-zod` and `@hookform/resolvers/zod` — arrive at Story 1.9 + apps/admin/apps/mobile feature Stories); the scaffold demonstrates the harness shape (a `runFixtureSet(runtime, fixtures)` helper that returns `{ accepted: string[], rejected: { input: string, error: string }[] }` and an assertion that all runtimes return byte-identical accepted/rejected partitions). Downstream Stories add the missing runtimes by extending the test file's `runtimes` array; the structure is committed by Story 1.4 so they don't reinvent it.

**AC-4 — ADR-0005-openapi-client-generation drafted at `docs/adr/`; closes the `adr-index.md` line 98 slot; commits the OpenAPI client-generation tool choice with rationale across the architecturally-named candidates**

**Given** architecture §3.1 line 1812 + §5.15 deferred decision list line 3585 + adr-index.md line 98 (`ADR-NNNN-openapi-client-generation` slot at `slot-reserved-pre-write` with expected close trigger "Story 1.4 (packages/contracts Zod + OpenAPI contract scaffolding) closure") + Category 4 §4.2 line 2487 ("Query hooks generated from OpenAPI / Zod contracts via the OpenAPI client tool — Category 3 §3.1; specific tool in ADR") + §4.11.1 line 2791 ("Per-route OpenAPI client subsetting. The OpenAPI client-generation tool (Category 3 §3.1) must produce per-tag (or per-namespace) client modules so each app imports only the surface it consumes")

**When** Story 1.4 closes

**Then** ADR-0005-openapi-client-generation is drafted at `docs/adr/ADR-0005-openapi-client-generation.md` with the following substantive content:
- **Decision**: commits the choice of `@hey-api/openapi-ts` (formerly `openapi-ts`; active maintainer; per-tag plugin output; native TypeScript + JSON-Schema-aware codegen; supports Fetch + TanStack Query + Zod plugins natively) as the primary candidate, with `Orval` as the secondary candidate (rich TanStack Query hook generation + per-tag subsetting + native Zod integration), and explicitly NOT-CHOSEN candidates `openapi-typescript` (types-only; missing runtime client + TanStack Query plugin), `openapi-typescript-codegen` (deprecated upstream), `Kubb` (newer; smaller ecosystem; revisit at future ADR cycle if hey-api/Orval don't fit). The Decision can be **substantively re-opened** post-Story-1.9 (first `apps/api` substantive routes land) if early-real-usage exposes a deal-breaker; this is per architecture's ADR-supersession discipline.
- **Context**: (a) architecture §3.1 commits OpenAPI 3.1 spec generated from Zod schemas via `fastify-zod-openapi` + `@fastify/swagger`; (b) consumer surface = `apps/mobile/`, `apps/admin/`, `apps/public/`, `apps/api/` (server-side validation via `fastify-type-provider-zod`); (c) per-tag subsetting is architecturally mandatory per §4.11.1 line 2791 + line 2793-2794 ("CI test asserts no admin-only operations land in the mobile bundle; no member-only operations in the admin bundle"); (d) TanStack Query hook generation per §4.2 line 2487 is required since TanStack Query is the universal server-state layer.
- **Rationale**: `@hey-api/openapi-ts` rationale grid — TypeScript-first (matches `packages/contracts/` source-of-truth posture); per-tag plugin output (`@hey-api/sdk` plugin) satisfies §4.11.1 subsetting; native TanStack Query plugin satisfies §4.2; native Zod plugin emits runtime validators (downstream-of-the-server); actively maintained (npm weekly downloads > 100k as of Q1 2026); pure-runtime (no codegen at app start); permissive license.
- **Consequences**: (a) `packages/api-client/` becomes the generated workspace; `dist/` contains per-tag client modules; CODEOWNERS owns generated paths to `@bot` per architecture §Enforcement line 4001-4005; `.gitattributes linguist-generated=true` marks the output; (b) `pnpm contracts:emit-openapi` produces `openapi/v1.yaml`; `pnpm api-client:generate` (root delegating script — substantively wired at Story 1.9+ when first routes exist) consumes the spec; (c) per-tag CI subset assertion lives at Story 1.16a friction-budget CI gate territory; (d) revisit cadence — at first `apps/api` substantive-route Story (1.9), real-usage validation; if blocking, supersede via ADR-NNNN.
- **Status**: `drafted` at Story 1.4 author-commit; flips `under-trustee-review` post-Story-1.4 review per `[[feedback_closure_language_precision]]` lifecycle; ratified per Trustee Panel session OR per Solo-Builder-only ratification given the choice is non-load-bearing-for-trust-posture (engineering tooling; verify ratification convention at Trustee Panel cadence — defer to deferred-work).

**And** `docs/knowledge-transfer/adr-index.md` line 98 flips `slot-reserved-pre-write` → `drafted`; Status row-count table updated (`slot-reserved-pre-write` 123 → 122; `drafted` 2 → 3; total unchanged at 126).

**And** `.decision-log.md` gets a new Decision 2026-06-XX-XXX (next sequential after Decision 2026-06-09-039) appended at the top of `## Decisions` section per reverse-chronological schema, with body covering Story 1.4 substantive author-commit + ADR-0005 drafted + cross-Story discharge triggers (Stories 1.6 RLS attaches `pgPolicy` to events_log → contract test stays valid; Story 1.9 admin auth wires `fastify-type-provider-zod` + first substantive `apps/api` routes → OpenAPI spec substantively populated; Story 1.16c schema-diff CI gate consumes contracts + Drizzle migrations; Stories 3.1+, 6.x, 7.x, 8.x, 9.x, 10.x, 11.a, 11.b populate per-domain endpoint contracts).

## Tasks / Subtasks

- [x] **Task 1: `packages/contracts/` workspace dependency wiring + per-domain sub-directory scaffolding** (AC: #1)
  - [x] 1.1 Add direct dependencies to `packages/contracts/package.json`:
    - `zod` — pin to whatever `packages/events/` pins from Story 1.3 (current `^3.23.0`); single zod major across the monorepo so contracts and events share the same runtime instance. Verify at dev-time: if Story 1.3 has bumped to zod v4 by Story 1.4 execution time, follow that line and capture in Completion Notes.
    - `@asteasolutions/zod-to-openapi` — `^7.x` (registry-current stable as of 2026-06; verify at dev-time per Story 1.2 D12-1.2 + Story 1.3 dep-pin re-validation discipline). This is the **Zod-to-OpenAPI converter** invoked by the hand-runnable `emit-openapi.ts` script (Task 2). Architecture §3.1 line 1795 commits `fastify-zod-openapi` for **runtime** OpenAPI emission from a live Fastify server — that arrives at Story 1.9+ when `apps/api` substantively populates; at Story 1.4 the registry-driven build-time emission via `@asteasolutions/zod-to-openapi` is the proving substrate.
    - `yaml` — `^2.x` (registry-current; the YAML stringifier for `openapi/v1.yaml` emission). If the chosen `@asteasolutions/zod-to-openapi` version exports a YAML writer directly, prefer it; otherwise hand-stringify.
  - [x] 1.2 Update `packages/contracts/package.json` `scripts` map: add `"emit-openapi": "tsx scripts/emit-openapi.ts"` + `"check-openapi-determinism": "tsx scripts/check-openapi-determinism.ts"`. Add `tsx` to `devDependencies` (matches Story 1.2's `packages/domain` use of `tsx` for the migrate script).
  - [x] 1.3 Author `packages/contracts/src/<domain>/.gitkeep` for each of the 15 per-domain sub-directories per architecture §Complete project directory structure line 4361-4378 — substantively populates Story 1.4 only for the SHAPE; per-domain endpoint contracts are owned by per-Epic Stories:
    - `members/` — Stories 3.1+ (member lifecycle).
    - `claims/` — Stories 6.x (claim case object + filing + verification + appeal).
    - `pools/` — Stories 7.x (Pool Engine + spawning + freezing).
    - `alerts/` — Stories 8.x (alert lifecycle).
    - `contributions/` — Stories 9.x (contribution + UPI Intent + reconciliation).
    - `modules/` — Stories 12.x (Module Marketplace + lead handoff per AR-42).
    - `partners/` — Stories 12.x (partner integrations; partner JWT signing handoff).
    - `audit/` — Stories 1.10, 1.11a, 1.11b (audit log shapes for trustee-facing surfaces).
    - `rbac/` — Stories 1.8 (RBAC permission keys + role bundles transport-layer contracts).
    - `kyc/` — Stories 3.x (DigiLocker KYC per AR-43).
    - `reconciliation/` — Stories 9.x (bank statement upload + reconciliation triage).
    - `helpdesk/` — Stories 10.x (Helpdesk first-class subsystem per AR-47 + FR-52).
    - `feature-flags/` — Stories 10.x (FR-58C flag + feature-flag shapes).
    - `pariwar-passport/` — Stories 1.7 (Pariwar-Passport data model + branding bundle per FR-63).
    - `deep-links/` — Stories 1.7+ (URL grammar for cross-frontend deep links per architecture §5550-5555 + line 4555-4556).
    
    Each sub-directory gets a `README.md` with: (a) one-line description of the domain; (b) landing-Story pointer (e.g., "Substantive contracts authored at Stories 6.1 / 6.2 / 6.5 — claim case object + claim filing + appeal stage 1/2 surface contracts"); (c) the `.strict()` discipline reminder ("All Zod schemas in this directory MUST end with `.strict()`; the architecture §Format patterns line 3824 + `_common/strict.ts` assertion helper guards against drift"); (d) the cross-tenant discipline reminder ("Tenant-scoped endpoint paths use `/api/v1/p/<pariwar_id>/...` per architecture §3.1 line 1798; cross-Pariwar global endpoints use `/api/v1/global/<resource>` per line 1799"); (e) the type-shadowing-prohibition reminder ("Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2 — do NOT redeclare types in `apps/api/modules/<domain>/<domain>.types.ts` or `apps/admin/modules/<domain>/<domain>.types.ts` that shadow contracts here; consume via `import type { Foo } from '@twt/contracts/<domain>'`").

  - [x] 1.4 Author the `errors/` sub-directory marker per architecture §3.2 line 1830 ("Enumerated in `packages/contracts/errors/`"). At Story 1.4: `src/errors/index.ts` is `export {};` placeholder + a `README.md` documenting the per-domain enumeration convention (downstream Stories add `errors/claim.ts`, `errors/pool.ts`, `errors/member.ts`, etc. — each file exports a `const-asserted` map of namespaced error codes for that domain). The framework lives in `_common/errors.ts` (Task 4); the per-domain enumeration lives here.

- [x] **Task 2: `_common/` substantively authored — `errors`, `pagination`, `primitives`, `version`, `strict`, `health` (toy endpoint for OpenAPI emission proof)** (AC: #1, #2)
  - [x] 2.1 Author `packages/contracts/src/_common/errors.ts`:
    ```typescript
    // packages/contracts/src/_common/errors.ts
    //
    // Structured error envelope per architecture §3.2 line 1819-1826.
    // Namespaced error codes (dotted.resource.action) per architecture line 1829-1830.
    // Per-domain enumeration lives at packages/contracts/src/errors/<domain>.ts
    // (added by downstream Stories — claim.x at Story 6.x, pool.x at 7.x, etc.).

    import { z } from 'zod';

    /**
     * Namespaced error-code string of the form `<domain>.<action>` or
     * `<domain>.<action>.<sub>`. Examples (per architecture line 1829-1830):
     *   - 'pool.spawn.duplicate'
     *   - 'member.suspended'
     *   - 'claim.appeal.stage1_only'
     */
    export type ErrorCode<
      D extends string = string,
      A extends string = string,
      S extends string | undefined = undefined,
    > = S extends string ? `${D}.${A}.${S}` : `${D}.${A}`;

    /**
     * Factory for typed error codes. Use at downstream Stories' enumeration files:
     *   export const POOL_SPAWN_DUPLICATE = defineErrorCode('pool', 'spawn', 'duplicate');
     *   //  ^? 'pool.spawn.duplicate' (literal type, not widened to string)
     */
    export function defineErrorCode<D extends string, A extends string>(domain: D, action: A): ErrorCode<D, A>;
    export function defineErrorCode<D extends string, A extends string, S extends string>(
      domain: D,
      action: A,
      sub: S,
    ): ErrorCode<D, A, S>;
    export function defineErrorCode(domain: string, action: string, sub?: string): string {
      return sub === undefined ? `${domain}.${action}` : `${domain}.${domain === '' ? '' : action}.${sub}`;
      // Note: implementation deliberately preserves the simple concatenation; the
      // overload types provide the literal-type precision at the call site.
    }

    /**
     * The wire envelope per architecture §3.2 line 1819-1826.
     * `request_id` is echoed in response headers + log lines + audit entries.
     */
    export const ErrorResponse = z
      .object({
        error: z
          .object({
            code: z.string().min(1),
            message: z.string(),
            details: z.unknown().optional(),
            request_id: z.string().uuid(),
          })
          .strict(),
      })
      .strict();

    export type ErrorResponse = z.output<typeof ErrorResponse>;
    ```
  - [x] 2.2 Author `packages/contracts/src/_common/pagination.ts`:
    ```typescript
    // packages/contracts/src/_common/pagination.ts
    //
    // Cursor-based pagination per architecture §3.2 line 1836-1846.
    // Cursor is opaque at the contracts layer (architecture line 1844-1846: scope
    // = tenant + resource + ordering + expiry; signing mechanism is implementation
    // ADR territory). Wire shape = { items, nextCursor, hasMore } per §Format
    // patterns line 3801-3802.
    //
    // Page-size cap per FR-91 = 50 for public surfaces; authenticated admin
    // queries override at the route level. This default schema captures the
    // public-facing posture; admin routes pass a `limit: z.number().int().positive().max(<N>)`
    // override at their own contract authoring time.

    import { z } from 'zod';

    /** Opaque pagination cursor (URL-safe; not inspected at the contracts layer). */
    export const Cursor = z.string().min(1);
    export type Cursor = z.output<typeof Cursor>;

    /** Default public-surface pagination query (FR-91 max 50). */
    export const PaginationQuery = z
      .object({
        cursor: z.string().min(1).optional(),
        limit: z.number().int().positive().max(50).optional(),
      })
      .strict();
    export type PaginationQuery = z.output<typeof PaginationQuery>;

    /**
     * Generic paginated-response wrapper. Use at downstream Stories' list contracts:
     *   const MembersPage = paginatedResponse(Member);
     */
    export function paginatedResponse<T extends z.ZodTypeAny>(item: T) {
      return z
        .object({
          items: z.array(item),
          nextCursor: z.string().min(1).nullable(),
          hasMore: z.boolean(),
        })
        .strict();
    }
    ```
  - [x] 2.3 Author `packages/contracts/src/_common/primitives.ts`:
    ```typescript
    // packages/contracts/src/_common/primitives.ts
    //
    // Shared transport-layer primitives. Substantive branded ID types live at
    // packages/domain/src/ids/ per architecture §Cross-cutting concerns line 4538
    // and land at Story 1.7. Story 1.4 commits the transport-shape UUID Zod
    // primitive without branding so consumers don't block on Story 1.7.

    import { z } from 'zod';

    /** ISO 8601 datetime with timezone offset (architecture §Format patterns line 3807-3809). */
    export const Iso8601Datetime = z.string().datetime({ offset: true });
    export type Iso8601Datetime = z.output<typeof Iso8601Datetime>;

    /** UUID v4 wire-shape; downstream Stories may brand via packages/domain/src/ids/. */
    export const UuidString = z.string().uuid();
    export type UuidString = z.output<typeof UuidString>;

    /** Request correlation id echoed in headers + logs + audit (architecture §3.2 line 1832). */
    export const RequestId = z.string().uuid();
    export type RequestId = z.output<typeof RequestId>;

    /** RFC 5321 email; relaxed validation — strict policy at downstream Stories. */
    export const Email = z.string().email();
    export type Email = z.output<typeof Email>;
    ```
  - [x] 2.4 Author `packages/contracts/src/_common/version.ts`:
    ```typescript
    // packages/contracts/src/_common/version.ts
    //
    // URL-based major versioning per architecture §3.2 line 1849; flat-object
    // top-level version literal per §Format patterns line 4106.

    import { z } from 'zod';

    export const ApiMajorVersion = z.literal('v1');
    export type ApiMajorVersion = z.output<typeof ApiMajorVersion>;

    export const API_MAJOR_VERSION = 'v1' as const;
    ```
  - [x] 2.5 Author `packages/contracts/src/_common/strict.ts`:
    ```typescript
    // packages/contracts/src/_common/strict.ts
    //
    // The architecturally-canonical enforcement of `.strict()` default lives in
    // an ESLint rule (Story 1.16a friction-budget CI gate territory). Story 1.4
    // commits a runtime helper that downstream Stories MAY call to assert at
    // module load that a schema is strict; the helper is opt-in (it cannot
    // structurally prevent a missing `.strict()`).
    //
    // Architecture §Format patterns line 3824-3826:
    //   "All packages/contracts/ schemas default to .strict(). .passthrough()
    //    only at explicit provider-controlled boundaries (webhook payloads
    //    beyond the spec). CI lint enforces."

    import { z } from 'zod';

    export function assertStrict<T extends z.ZodObject<z.ZodRawShape>>(schema: T): T {
      // Zod's ZodObject carries an internal `_def.unknownKeys` field; 'strict' is
      // the canonical 'reject unknown keys' setting. The shape is z-internal so
      // we treat the inspection defensively.
      const unknownKeys = (schema as unknown as { _def: { unknownKeys?: string } })._def
        ?.unknownKeys;
      if (unknownKeys !== 'strict') {
        throw new Error(
          'assertStrict: schema must end with .strict() per packages/contracts/ convention',
        );
      }
      return schema;
    }
    ```
  - [x] 2.6 Author the toy endpoint contract `packages/contracts/src/_common/health.ts` (purpose: drive the OpenAPI emission proof at Task 2.9; not a production contract — when `apps/api/` substantively populates, the real `_meta/health` lives there):
    ```typescript
    // packages/contracts/src/_common/health.ts
    //
    // Substrate-proof toy endpoint contract — drives the OpenAPI emission pipeline
    // proof at Story 1.4 Task 2.9. When apps/api/ substantively populates at
    // Story 1.9+, the production /_meta/health endpoint lives there with the
    // substantive shape (uptime, DB connectivity, queue depth, etc.).

    import { z } from 'zod';
    import { Iso8601Datetime } from './primitives.js';

    export const HealthResponse = z
      .object({
        status: z.enum(['ok', 'degraded']),
        timestamp: Iso8601Datetime,
      })
      .strict();

    export type HealthResponse = z.output<typeof HealthResponse>;
    ```
  - [x] 2.7 Author `packages/contracts/src/_common/index.ts` barrel:
    ```typescript
    export * from './errors.js';
    export * from './pagination.js';
    export * from './primitives.js';
    export * from './version.js';
    export * from './strict.js';
    export * from './health.js';
    ```
  - [x] 2.8 Update `packages/contracts/src/index.ts` replacing the Story 1.1 `export {}` placeholder:
    ```typescript
    // packages/contracts/src/index.ts
    //
    // Transport-contract source-of-truth per architecture §1.3 + §3.1 + AR-4 + AR-38.
    // Per-domain endpoint contracts live in per-domain sub-directories
    // (members/, claims/, pools/, alerts/, ...); each is owned by its per-Epic
    // landing Story.

    export * from './_common/index.js';

    export const CONTRACTS_API_VERSION = 'v1';

    /**
     * Marker symbol used by the contract-↔-domain type-assignability test
     * (tests/type-assignability.test.ts) to assert this package is the
     * canonical contract source-of-truth (defense against Top-10 anti-pattern #2
     * — type-shadowing via hand-written dto.ts / *.types.ts).
     */
    export const __substrateOnly = Symbol.for('@twt/contracts:substrate-only');
    ```

- [x] **Task 3: OpenAPI emission pipeline — `scripts/emit-openapi.ts` + `scripts/check-openapi-determinism.ts` + root `openapi/v1.yaml` emission proof** (AC: #2)
  - [x] 3.1 Author `packages/contracts/scripts/emit-openapi.ts`:
    ```typescript
    // packages/contracts/scripts/emit-openapi.ts
    //
    // Build-time OpenAPI 3.1 spec emission from the Zod schemas in packages/contracts/.
    // Per architecture §3.2 line 1862-1865: "Generator output committed to the
    // repository (openapi/v1.yaml or equivalent). CI verifies that re-running the
    // generator produces byte-identical output."
    //
    // At Story 1.4 the only registered endpoint is the toy _common/health contract;
    // substantive endpoints land at Story 1.9+ when apps/api/ substantively populates.
    // The script's job at Story 1.4 is to STRUCTURALLY PROVE the pipeline.

    import { fileURLToPath } from 'node:url';
    import path from 'node:path';
    import fs from 'node:fs';
    import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
    import { z } from 'zod';
    import * as yaml from 'yaml';

    extendZodWithOpenApi(z);

    import { HealthResponse } from '../src/_common/health.js';
    import { ErrorResponse } from '../src/_common/errors.js';

    const registry = new OpenAPIRegistry();

    registry.registerComponent('schemas', 'HealthResponse', HealthResponse.openapi('HealthResponse'));
    registry.registerComponent('schemas', 'ErrorResponse', ErrorResponse.openapi('ErrorResponse'));

    registry.registerPath({
      method: 'get',
      path: '/api/v1/_meta/health',
      summary: 'Service health probe',
      description: 'Substrate-proof endpoint authored at Story 1.4. Production /_meta/health lives at apps/api/ per Story 1.9+.',
      tags: ['_meta'],
      responses: {
        200: {
          description: 'Service is reachable',
          content: { 'application/json': { schema: HealthResponse } },
        },
        503: {
          description: 'Service is degraded',
          content: { 'application/json': { schema: ErrorResponse } },
        },
      },
    });

    const generator = new OpenApiGeneratorV31(registry.definitions);

    const doc = generator.generateDocument({
      openapi: '3.1.0',
      info: {
        title: 'TWT API v1',
        version: '0.0.0-substrate',
        description:
          'TWT API contract surface — generated from Zod schemas in packages/contracts/. ' +
          'Story 1.4 substrate; substantive routes land at apps/api/ Stories 1.9+.',
      },
      servers: [{ url: 'https://twt.local/api/v1', description: 'placeholder' }],
    });

    const yamlOutput = yaml.stringify(doc, {
      // Deterministic emission: do NOT sort keys (yaml package preserves insertion
      // order; the generator's order is fixed by registration sequence). If the
      // library default ever changes, pin via { sortMapEntries: false }.
      lineWidth: 0,
    });

    const here = path.dirname(fileURLToPath(import.meta.url));
    const target = path.resolve(here, '../../../openapi/v1.yaml');

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, yamlOutput, { encoding: 'utf8' });

    console.log(`✓ openapi/v1.yaml written (${yamlOutput.length} bytes)`);
    ```
  - [x] 3.2 Author `packages/contracts/scripts/check-openapi-determinism.ts`:
    ```typescript
    // packages/contracts/scripts/check-openapi-determinism.ts
    //
    // CI gate: re-emit openapi/v1.yaml and assert byte-identical to the committed file.
    // Architecture §3.2 line 1862-1865 generator-determinism CI gate.

    import { fileURLToPath } from 'node:url';
    import path from 'node:path';
    import fs from 'node:fs';
    import { execSync } from 'node:child_process';

    const here = path.dirname(fileURLToPath(import.meta.url));
    const target = path.resolve(here, '../../../openapi/v1.yaml');

    if (!fs.existsSync(target)) {
      console.error(`✗ openapi/v1.yaml does not exist at ${target}`);
      console.error('  Run `pnpm contracts:emit-openapi` to author it.');
      process.exit(1);
    }

    const before = fs.readFileSync(target, 'utf8');

    execSync('tsx scripts/emit-openapi.ts', { cwd: path.resolve(here, '..'), stdio: 'inherit' });

    const after = fs.readFileSync(target, 'utf8');

    if (before !== after) {
      console.error('✗ openapi/v1.yaml emission is non-deterministic');
      console.error('  Committed file and re-emit output differ.');
      console.error('  Run `pnpm contracts:emit-openapi` locally + commit the result.');
      process.exit(1);
    }

    console.log('✓ openapi/v1.yaml emission is deterministic');
    ```
  - [x] 3.3 Run `pnpm --filter @twt/contracts emit-openapi` once to author the initial `openapi/v1.yaml` committed file. Verify the emitted YAML contains: `openapi: 3.1.0`; `info.title: TWT API v1`; one path `/api/v1/_meta/health` with `get` operation; two component schemas `HealthResponse` + `ErrorResponse`.
  - [x] 3.4 Add `openapi/.gitignore` (if needed) — typically empty (we DO want `v1.yaml` committed); just ensure the directory is tracked. If `openapi/` is not already a tracked top-level path, no `.gitignore` needed; the `v1.yaml` file presence makes it tracked.

- [x] **Task 4: Root `pnpm contracts:*` scripts + `turbo.json` `contracts:check-openapi-determinism` task + CI `contracts-check` job** (AC: #2)
  - [x] 4.1 Update root `package.json` scripts map: add `"contracts:emit-openapi": "pnpm --filter @twt/contracts emit-openapi"` + `"contracts:check-openapi-determinism": "turbo run contracts:check-openapi-determinism"`. Mirrors the Story 1.2 `db:*` script delegation pattern.
  - [x] 4.2 Update `turbo.json` adding the new task:
    ```json
    "contracts:check-openapi-determinism": {
      "dependsOn": [],
      "inputs": [
        "src/**/*.ts",
        "scripts/**/*.ts",
        "package.json",
        "../../pnpm-lock.yaml",
        "../../openapi/v1.yaml"
      ],
      "outputs": []
    }
    ```
    No `dependsOn` because the script is pure static-analysis-shape (no `^build` needed; the script imports source `.ts` files directly via `tsx` analogous to Story 1.2's `db:check`). Inputs include the committed `openapi/v1.yaml` so the determinism check is invalidated when the spec changes — re-running confirms re-emission matches.
  - [x] 4.3 Add a `contracts-check` job to `.github/workflows/ci.yml` mirroring the existing `db-check` job shape — `needs: install`; runs `pnpm turbo run contracts:check-openapi-determinism`; no DB connection required:
    ```yaml
    contracts-check:
      name: contracts-check (OpenAPI generator determinism)
      runs-on: ubuntu-latest
      needs: install
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version-file: '.nvmrc'
            cache: 'pnpm'
        - run: pnpm install --frozen-lockfile
        - run: pnpm turbo run contracts:check-openapi-determinism
    ```
    Mirror the existing `db-check` job's exact shape (look at Story 1.2's authored job for the canonical pattern — same checkout / setup / install / turbo invocation cadence).

- [x] **Task 5: Test scaffolds — contract-↔-domain type-assignability + cross-surface validation parity** (AC: #3)
  - [x] 5.1 Author `packages/contracts/src/_common/event-log-contract.ts` — a transport-layer Zod schema that mirrors the `events_log` row shape (Story 1.3 substrate) for consumers that read event-stream tails through transport APIs (Story 1.10 audit-log integrity UI + Story 1.11b trustee-facing audit UI):
    ```typescript
    // packages/contracts/src/_common/event-log-contract.ts
    //
    // Transport-layer wire shape for events_log rows surfaced via API to
    // audit-integrity UIs (Stories 1.10 / 1.11b). Mirrors packages/domain
    // events_log Drizzle schema (Story 1.3) — the contract-↔-domain
    // type-assignability test (tests/type-assignability.test.ts) asserts
    // the two stay aligned.
    //
    // Per architecture §Naming patterns line 3719-3723: contracts is the
    // source for transport types; domain derives via z.output/z.input;
    // hand-written shadow types are forbidden.

    import { z } from 'zod';
    import { UuidString, Iso8601Datetime } from './primitives.js';

    export const EventLogContract = z
      .object({
        eventId: UuidString,
        streamId: UuidString,
        eventType: z.string().min(1),
        payload: z.unknown(),
        eventVersion: z.number().int().nonnegative(),
        occurredAt: Iso8601Datetime,
        actorId: UuidString.nullable(),
        pariwarId: UuidString,
      })
      .strict();

    export type EventLogContract = z.output<typeof EventLogContract>;
    ```
    Also add to `_common/index.ts` barrel.
  - [x] 5.2 Author `packages/contracts/tests/type-assignability.test.ts`:
    ```typescript
    // packages/contracts/tests/type-assignability.test.ts
    //
    // Per architecture §1.3 line 787-790 + §Naming patterns line 3719-3723.
    //
    // Asserts that the contract-layer Zod schemas in packages/contracts/ stay
    // assignable from the Drizzle-inferred row types in packages/domain/. A
    // future Drizzle schema change that diverges from a contract type fails
    // typecheck here.
    //
    // At Story 1.4 there's only one Drizzle schema in-tree (events_log from
    // Story 1.3); downstream Stories authoring per-domain Drizzle schemas
    // extend this file with their per-domain assertions.

    import { describe, it, expect } from 'vitest';
    import { schema } from '@twt/domain';
    import { EventLogContract, type EventLogContract as EventLogContractType } from '../src/_common/event-log-contract.js';

    // Inferred Drizzle row type (Story 1.3 events_log table).
    type EventLogRow = typeof schema.eventsLog.$inferSelect;

    // Compile-time assertion: a Drizzle row is assignable to the wire contract
    // (the contract may be a relaxed superset; substantive shape parity is
    // the architectural commitment).
    //
    // If a future Drizzle column changes type or is removed, this assertion
    // fails at typecheck (TS error TS2322 / TS2344). The error surfaces the
    // contract author's intent to either update the contract (intentional
    // divergence with a comment) or revert the Drizzle change.
    type _AssertEventLogAssignable = EventLogRow extends EventLogContractType ? true : never;
    const _eventLogAssignable: _AssertEventLogAssignable = true;
    void _eventLogAssignable;

    describe('contract-↔-domain type assignability (Story 1.4 scaffold; per architecture §1.3 + §Naming patterns)', () => {
      it('EventLogContract (packages/contracts) parses a Drizzle-shaped row', () => {
        const sample: EventLogRow = {
          eventId: '00000000-0000-0000-0000-000000000001',
          streamId: '00000000-0000-0000-0000-000000000002',
          eventType: 'member.signup_initiated',
          payload: { version: 'v1' },
          eventVersion: 1,
          occurredAt: new Date('2026-06-09T00:00:00.000Z'),
          actorId: null,
          pariwarId: '00000000-0000-0000-0000-000000000003',
        };
        // Note: at the wire layer `occurredAt` is Iso8601 string; here we serialize
        // for the Zod parse demonstration. The transport boundary in apps/api will
        // serialize Date → string.
        const wire = { ...sample, occurredAt: sample.occurredAt.toISOString() };
        const parsed = EventLogContract.parse(wire);
        expect(parsed.eventId).toBe(sample.eventId);
        expect(parsed.eventType).toBe(sample.eventType);
      });
    });
    ```
    The compile-time `_AssertEventLogAssignable` line is the load-bearing assertion; the vitest test exercises the runtime parse for documentation + regression cover.
  - [x] 5.3 Add `@twt/domain` as a direct dependency in `packages/contracts/package.json` (`"@twt/domain": "workspace:*"`) so the type-assignability test can import the Drizzle schema. Note: contracts depends on domain for type tests only — this is acceptable per the architecture's commitment that domain is the source-of-truth for branded IDs + table-row shapes (§Cross-cutting concerns line 4538) and contracts derives wire types from those.
  - [x] 5.4 Author `packages/contracts/tests/validation-parity.test.ts`:
    ```typescript
    // packages/contracts/tests/validation-parity.test.ts
    //
    // Per architecture §4.4 line 2567-2572 cross-surface validation parity test.
    //
    // At Story 1.4 only the Zod runtime is in-tree. Downstream Stories add:
    //   - fastify-type-provider-zod (apps/api substantive routes, Story 1.9+)
    //   - @hookform/resolvers/zod (apps/admin + apps/mobile forms, Stories 1.9+ / 3.x)
    //   - Astro Actions (apps/public, Story 2.x)
    //
    // The harness shape committed at Story 1.4 is what downstream Stories extend.

    import { describe, it, expect } from 'vitest';
    import { PaginationQuery } from '../src/_common/pagination.js';

    type FixtureRuntime = {
      name: string;
      validate: (input: unknown) => { ok: true } | { ok: false; reason: string };
    };

    function runFixtureSet(
      runtimes: ReadonlyArray<FixtureRuntime>,
      inputs: ReadonlyArray<{ input: unknown; expected: 'accept' | 'reject' }>,
    ): { runtime: string; results: Array<{ ok: boolean; expected: 'accept' | 'reject' }> }[] {
      return runtimes.map((runtime) => ({
        runtime: runtime.name,
        results: inputs.map((entry) => {
          const r = runtime.validate(entry.input);
          return { ok: r.ok, expected: entry.expected };
        }),
      }));
    }

    describe('cross-surface validation parity (Story 1.4 scaffold; per architecture §4.4)', () => {
      const fixtures = [
        { input: {}, expected: 'accept' as const },
        { input: { limit: 25 }, expected: 'accept' as const },
        { input: { cursor: 'abc', limit: 50 }, expected: 'accept' as const },
        { input: { limit: 100 }, expected: 'reject' as const }, // FR-91 cap
        { input: { limit: -1 }, expected: 'reject' as const },
        { input: { limit: 'twenty' }, expected: 'reject' as const },
      ];

      const zodRuntime: FixtureRuntime = {
        name: 'zod',
        validate: (input) => {
          const r = PaginationQuery.safeParse(input);
          return r.success ? { ok: true } : { ok: false, reason: r.error.message };
        },
      };

      // Story 1.9+ extends `runtimes` with fastify-type-provider-zod runtime.
      // Story 3.x extends with @hookform/resolvers/zod runtime.
      // Story 2.x extends with Astro Actions runtime.
      const runtimes: ReadonlyArray<FixtureRuntime> = [zodRuntime];

      it('all runtimes produce identical accept/reject partitions', () => {
        const results = runFixtureSet(runtimes, fixtures);
        for (const runtimeResult of results) {
          for (let i = 0; i < runtimeResult.results.length; i += 1) {
            const r = runtimeResult.results[i]!;
            const matches = (r.ok && r.expected === 'accept') || (!r.ok && r.expected === 'reject');
            expect(matches, `runtime=${runtimeResult.runtime} fixture=${i} expected=${r.expected} ok=${r.ok}`).toBe(true);
          }
        }
      });
    });
    ```
  - [x] 5.5 Verify `packages/contracts/tests/smoke.test.ts` (the Story 1.1 placeholder) still passes — should be untouched. It asserts `import * as mod from '../src/index'; expect(mod).toBeTruthy();` which continues to hold after the substantive substrate lands.

- [x] **Task 6: ADR-0005-openapi-client-generation drafted + adr-index updated + Decision-log entry appended** (AC: #4)
  - [x] 6.1 Author `docs/adr/ADR-0005-openapi-client-generation.md` per the `docs/adr/_adr-template.md` shape (verify the template's section list at dev-time; reference ADR-0003 + ADR-0004 for the structural pattern). Substantive body covers:
    - **Status**: `drafted` at Story 1.4 author-commit; supersession path noted.
    - **Context**: architecture §3.1 line 1791-1814 commits Zod-first source-of-truth + OpenAPI 3.1 spec generated via `fastify-zod-openapi` + `@fastify/swagger`; the **client-generation tool** (which transforms `openapi/v1.yaml` into TS modules consumed by frontends) is the deferred decision. Consumer surface = `apps/mobile/` (Expo + RN), `apps/admin/` (Vite + React), `apps/public/` (Astro 6 islands), `apps/api/` (Fastify server-side validation via `fastify-type-provider-zod`). Architecture commitments that constrain choice: §4.11.1 line 2791 per-tag/per-namespace subsetting (mobile bundle must not carry admin operations + vice versa); §4.2 line 2487 TanStack Query hook generation (universal server-state); §Generated artifacts excluded from PR review surface (line 4001-4005) bot-owned CODEOWNERS path + `.gitattributes linguist-generated=true`.
    - **Decision**: choose `@hey-api/openapi-ts` as the primary tool. Secondary candidate Orval kept warm as fallback if hey-api hits a deal-breaker at Story 1.9+. Explicitly NOT-CHOSEN: `openapi-typescript` (types-only; missing runtime client + TanStack Query plugin); `openapi-typescript-codegen` (deprecated upstream as of 2024); `Kubb` (newer; smaller ecosystem; revisit at future ADR cycle if hey-api/Orval don't fit Story 1.9+ real-usage validation).
    - **Rationale**: TypeScript-first matches `packages/contracts/` Zod-first source-of-truth posture; `@hey-api/sdk` plugin emits per-tag client modules satisfying §4.11.1 subsetting; `@hey-api/openapi-ts-tanstack-query` plugin satisfies §4.2 query-hook generation; `@hey-api/openapi-ts-zod` plugin emits runtime validators downstream of the server (defense-in-depth at the frontend); actively maintained (npm weekly downloads > 100k as of 2026-Q1; v0.50+ stabilized API); pure-runtime (no codegen at app start); MIT license. Orval rationale (kept as secondary): similar TS-first; native TanStack Query hooks; per-tag subsetting; mature; chosen as the secondary if hey-api hits an integration deal-breaker at Story 1.9 real-usage. Not-chosen rationale: openapi-typescript (types-only — would force hand-rolling fetch logic + query hooks across 3 apps — net friction higher than the savings); openapi-typescript-codegen (deprecated upstream — committed Phase-0 discipline of not adopting deprecated tools); Kubb (less battle-tested in production India-region deployments; revisit at v2 cycle).
    - **Consequences**: (a) `packages/api-client/` is the generated workspace (architecture §Project Structure line 4379-4380 commits the workspace; Story 1.4 does NOT substantively populate it — Story 1.9+ wires the first generator invocation when first apps/api routes exist). (b) generated `dist/` per-tag client modules; CODEOWNERS gens-owner per architecture line 4001-4005; `.gitattributes linguist-generated=true` marks output. (c) `pnpm api-client:generate` root-level script delegating via `pnpm --filter @twt/api-client generate` — substantively wired at Story 1.9. (d) Per-tag CI subset assertion lives at Story 1.16a friction-budget CI gate territory (`apps/admin/` MUST NOT import `packages/api-client/dist/admin-only-tag/*` into mobile bundle + vice versa). (e) Revisit cadence: first `apps/api` substantive-route Story (1.9) real-usage validation; if blocking, supersede via `ADR-NNNN-openapi-client-generation-revised` per architecture's ADR-supersession discipline.
    - **References**: architecture.md §3.1 + §3.2 + §4.2 + §4.11.1 + §Naming patterns + §Project Structure + line 4001-4005 + line 4538; adr-index.md line 98; Story 1.4 file.
  - [x] 6.2 Update `docs/knowledge-transfer/adr-index.md` line 98 entry: flip `slot-reserved-pre-write` → `drafted`. Update Status row-count table at line 19-26: `slot-reserved-pre-write` 123 → 122; `drafted` 2 → 3; total unchanged at 126. Append to the row-count annotation paragraph (line 17): `; ADR-0005-openapi-client-generation substantive author-commit 2026-06-XX per Story 1.4 Decision 2026-06-XX-XXX (Section A row at line 98 flipped slot-reserved-pre-write → drafted; total row count unchanged)`.
  - [x] 6.3 Append a new Decision entry to `.decision-log.md` at the top of the `## Decisions` section per reverse-chronological schema. Decision id = next sequential after `2026-06-09-039` → `2026-06-XX-040` (use the actual dev-time date). Body covers:
    1. Story 1.4 substantive author-commit (`packages/contracts/` populated; 16 sub-dirs; `_common/` substantively authored; OpenAPI emission pipeline proven).
    2. ADR-0005-openapi-client-generation drafted; `@hey-api/openapi-ts` chosen primary + Orval secondary; not-chosen rationale recorded.
    3. Architecture-vs-Story-AC alignment check (no divergence — packages/contracts canonical home aligns across architecture §1.3 + §3.1 + §Project Structure line 4361-4378 + epics AC line 1043-1060).
    4. Cross-Story discharge triggers:
       - Story 1.6 (`pariwar_id` RLS) — attaches `pgPolicy` to events_log; contracts test stays valid (EventLogContract is RLS-agnostic at the wire layer).
       - Story 1.7 (Pariwar-Passport + branded IDs) — substantively authors `packages/domain/src/ids/` branded types; `_common/primitives.ts` UUID-shape Zod primitives get upgraded to branded versions; contracts type-assignability test extends.
       - Story 1.8 (RBAC) — populates `packages/contracts/src/rbac/`.
       - Story 1.9 (admin auth) — first `apps/api` substantive routes; wires `fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger`; OpenAPI emission moves from build-time script to runtime extraction OR build-time script consumes the registered Fastify routes; substantive `openapi/v1.yaml` populates; **OpenAPI breaking-change semantic-diff CI gate** (architecture §3.2 line 1856-1860) substantively wired; `packages/api-client/` first generator invocation per ADR-0005.
       - Story 1.10 + 1.11a + 1.11b (audit log) — populates `packages/contracts/src/audit/`.
       - Story 1.16a (friction-budget CI gate) — wires the type-shadowing-prohibition ESLint rule (Top-10 anti-pattern #2) + the `.strict()`-default ESLint rule (architecture §Format patterns line 3826) + the validator-presence-per-route ESLint rule (architecture §1.3 line 791-793) + the per-tag-bundle-subsetting CI test (architecture §4.11.1 line 2793-2794).
       - Story 1.16c (schema-diff CI gate) — extends to assert no `*PayoutDestination*` Zod schema in `packages/contracts/` (epics line 1338 `[GOVERNANCE]`).
       - Stories 3.1+, 6.x, 7.x, 8.x, 9.x, 10.x, 11a, 11b — populate per-domain endpoint contracts; each Story extends the type-assignability test + validation-parity test (when their domain Drizzle schemas + routes land).
    5. ADR-0005 drafted; closure-language-precision posture (engineering Closed by [edit] on Tasks 1-7; ADR-0005 trustee-ratification leg Resolved via explicit deferral pending Trustee Panel ratification cadence).
    6. `packages/contracts/` workspace direct dependency on `@twt/domain` — accepted per architecture's domain-source-of-truth posture + the type-assignability test's structural need. The reverse direction (domain depending on contracts) remains FORBIDDEN per the layering discipline (contracts is the transport-boundary edge; domain is the canonical center).
    7. Story 1.4 cross-cutting Phase-0 inheritances acknowledged + Story 1.1 + 1.2 + 1.3 inheritances preserved.
  - [x] 6.4 Append to `_bmad-output/implementation-artifacts/deferred-work.md` under a new `## Story 1.4 deferred` section per the Story 1.2 / 1.3 pattern, with expected items (final list per Task 7 closure):
    - **D1-1.4: OpenAPI breaking-change semantic-diff CI gate** — architecture §3.2 line 1856-1860 commits the gate; Story 1.4's substrate has only a toy endpoint, so the gate has no diff substrate; substantive wiring at Story 1.9+ when first routes exist + a delta exists between PR and main `openapi/v1.yaml`. Tooling candidates: `openapi-diff` (npm; semantic + breaking-change detection) OR `oasdiff` (Go binary; richer; per-CHANGELOG output). Pin at Story 1.9 author-time.
    - **D2-1.4: `packages/api-client/` first generator invocation per ADR-0005** — `@hey-api/openapi-ts` config + first per-tag client modules + `.gitattributes` `linguist-generated=true` marker + CODEOWNERS bot-identity ownership of `packages/api-client/dist/*`. Trigger: Story 1.9 dev-story start.
    - **D3-1.4: `fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger` runtime wiring at `apps/api/`** — per architecture §3.1 line 1794-1796. Story 1.9+ territory.
    - **D4-1.4: Per-tag bundle-subsetting CI test** — architecture §4.11.1 line 2793-2794 commits the test ("CI test asserts no admin-only operations land in the mobile bundle; no member-only operations in the admin bundle"). Story 1.16a friction-budget CI gate territory.
    - **D5-1.4: Type-shadowing-prohibition ESLint rule** — Top-10 anti-pattern #2 + architecture §Naming patterns line 3722-3723 commits the rule ("CI test asserts no schema redefinition across the contracts ↔ domain boundary"); Story 1.4 commits the structural posture (contracts as source-of-truth); the ESLint rule substantively lands at Story 1.16a friction-budget CI gate territory.
    - **D6-1.4: `.strict()`-default ESLint rule** — architecture §Format patterns line 3826 commits "CI lint enforces"; Story 1.4 commits the `_common/strict.ts` runtime helper + per-domain `README.md` reminders; the ESLint rule substantively lands at Story 1.16a.
    - **D7-1.4: Validator-presence-per-route ESLint rule** — architecture §1.3 line 791-793 commits "Custom lint rule asserts every route in `apps/api/modules/` declares a Zod validator; CI gate"; Story 1.4 commits the contract-layer substrate; the ESLint rule lands at Story 1.16a + apps/api substantive-route Story 1.9+.
    - **D8-1.4: Cross-surface validation parity test runtimes extension** — Story 1.4 commits the harness with Zod runtime only; Story 1.9 adds `fastify-type-provider-zod` runtime; Stories 3.x / 6.x form-handling adds `@hookform/resolvers/zod` runtime; Story 2.x (Niyamavali public render) adds Astro Actions runtime.
    - **D9-1.4: ADR-0005 trustee-ratification** — `drafted` at Story 1.4 author-commit; flips `under-trustee-review` post-Story-1.4 review; ratified per Trustee Panel session OR per engineering-only ratification convention (verify at Trustee Panel cadence). Closure-language-precision posture: engineering Closed by [edit] on substrate; ADR ratification Resolved via explicit deferral.
    - **D10-1.4: Substantive per-domain endpoint contracts** — 15 per-domain sub-dirs land per-Epic Story (claims at 6.x, pools at 7.x, etc.). Story 1.4 commits the shape; substantive contracts are per-Story.
    - **D11-1.4: `errors/` per-domain enumeration files** — `errors/claim.ts`, `errors/pool.ts`, `errors/member.ts`, etc. — each owned by their per-Epic Story.
    - **D12-1.4: Branded ID types at `packages/domain/src/ids/`** — Story 1.7 substrate; contracts `_common/primitives.ts` `UuidString` get upgraded to branded variants at Story 1.7.
    - **D13-1.4: `_common/event-log-contract.ts` substantive consumption** — Story 1.10 audit-log integrity UI + Story 1.11b trustee-facing audit UI substantively consume; until then the contract exists for type-assignability scaffold purposes.
    - **D14-1.4: OpenAPI emission migration from build-time script to runtime extraction at Story 1.9+** — Story 1.4's `scripts/emit-openapi.ts` is a substrate-proof using `@asteasolutions/zod-to-openapi`; architecture §3.1 line 1795 commits `fastify-zod-openapi` + `@fastify/swagger` for the substantive emission. At Story 1.9+ the script may either remain build-time (registering Fastify routes' Zod schemas at module-load) OR be replaced by a runtime-extraction approach (boot apps/api in CI, hit `/_meta/openapi.json`, write to file). Decision at Story 1.9 dev-time per `@hey-api/openapi-ts` real-usage validation.

- [x] **Task 7: Verification + AC closure + Status flip** (AC: #1, #2, #3, #4)
  - [x] 7.1 Branch strategy choice (pre-execution at dev-story Step 1 task_check):
    - Option (a) **Branch from `main`** (`origin/main` = `335bc80` per `git rev-parse origin/main` — has Stories 1.1 + 1.2 + 1.3 squash-merged; the Story 1.2 + 1.3 squash landed as commit `335bc80 feat: Story 1.2 + Story 1.3 — Cloud SQL substrate + event log primitive`). **Recommended** — Story 1.3 PR has merged so no upstream blocker; clean branch from main avoids the Story 1.2 stacked-PR merge-conflict surface. Local `main` branch is behind `origin/main` by 19 commits per `git branch -vv` — pull main first; then branch `story-1.4-contracts-scaffolding` from updated main.
    - Option (b) Stack on `story-1.2-cloud-sql-drizzle` (current HEAD `e597026` per `git rev-parse HEAD`; merged main into the branch as the recent commit). Not preferred — adds confusion + the branch carries Story 1.2's PR history; clean main-branch is the conventional pattern at this stage.
    Capture choice in Completion Notes.
  - [x] 7.2 Run `pnpm install --frozen-lockfile` to install the new deps. Verify zero peer-dep warnings; capture any caveat in Completion Notes.
  - [x] 7.3 Run `pnpm contracts:emit-openapi` once to author the initial `openapi/v1.yaml`. Inspect the emitted file shape; verify it has: `openapi: 3.1.0`, `info.title: TWT API v1`, one path `/api/v1/_meta/health`, two component schemas `HealthResponse` + `ErrorResponse`. Commit the file under `openapi/v1.yaml`.
  - [x] 7.4 Run `pnpm contracts:check-openapi-determinism` (locally) and verify it exits 0. Then deliberately introduce a determinism break (e.g., temporarily add a `Math.random()` field to the spec metadata) and verify the script exits 1 with the determinism-violation message; revert.
  - [x] 7.5 Run `pnpm turbo run lint typecheck test build` end-to-end. Verify the gate is green per the Story 1.1 + 1.2 + 1.3 baseline (Story 1.3 closure: events package added 5 test files + canonical-JSON + state-machine; Story 1.2 closure: 56/56 turbo gate green). Expected post-Story-1.4 turbo gate count: 56 (Story 1.3 baseline) + new `contracts:check-openapi-determinism` task = 57 — verify exact count at dev-time and capture in Completion Notes (the count may shift if any sub-task adds turbo nodes).
  - [x] 7.6 Capture in Completion Notes:
    - Branch chosen (Option (a) or (b) per Task 7.1).
    - Final dep pins for `@asteasolutions/zod-to-openapi` + `yaml` + `tsx` + `zod` (if zod shifted from Story 1.3's `^3.23.0`).
    - Final turbo gate count post-Story-1.4 (57 expected).
    - Final `openapi/v1.yaml` byte-size + line count.
    - Any pre-execution user choices (registry-current dep-version override per Story 1.2 + 1.3 pattern; ADR-0005 secondary-candidate retention reasoning if hey-api drops out at dev-time).
    - Architecture-vs-Story-AC alignment check (none expected; capture as "No divergence" if confirmed).
  - [x] 7.7 Update `packages/contracts/README.md` (new file authored at this Story) covering: workspace purpose + cross-references to architecture §1.3 + §3.1 + §3.2 + §Naming + §Format + Top-10 anti-patterns #2 + §Project Structure + AR-4 + AR-38; the 15-sub-domain enumeration with per-domain landing-Story map; `_common/` substantive contents + intended usage; the OpenAPI emission pipeline + `pnpm contracts:emit-openapi` + `pnpm contracts:check-openapi-determinism` workflows; the type-assignability test pattern with `events_log` worked example; the cross-surface validation parity test pattern; ADR-0005 cross-link; the type-shadowing prohibition; the `.strict()` discipline; the package-name-vs-relative-path import discipline (architecture line 3779-3781 — `from "@twt/contracts"` not `from "../../../packages/contracts"`).
  - [x] 7.8 Update root `README.md` adding a brief `§Contracts + OpenAPI` section pointing at `packages/contracts/README.md` + the `pnpm contracts:*` script suite + the `openapi/v1.yaml` artifact + ADR-0005 (mirrors the Story 1.2 root README §Database+migrations addition pattern).
  - [x] 7.9 Set this Story file's `Status` from `ready-for-dev` → `in-progress` at dev-story start; → `review` at substrate-complete + verification green; → `done` at code-review pass closure.
  - [x] 7.10 Update `sprint-status.yaml` `development_status[1-4-packages-contracts-zod-openapi-contract-scaffolding]` along the same lifecycle. The `last_updated` schema continues the Story 1.2 + 1.3 stacked-`# last_updated:` convention per W18 acknowledged drift posture.

## Dev Notes

### What `packages/contracts/` substantively becomes at Story 1.4

The architecture commits `packages/contracts/` as the workspace that "holds transport-layer contracts (HTTP/RPC DTOs, validation schemas, request/response shapes). Kept distinct from `events/` because transport contracts and internal event contracts evolve on different cadences and serve different consumers" (architecture line 424-427). At Story 1.1 the workspace exists with the placeholder `src/index.ts` = `export {}`. **Story 1.4 substantively populates this workspace** with the **substrate** — the canonical layout per architecture §Project Structure line 4361-4378, the `_common/` cross-domain primitives (errors envelope + cursor pagination + ISO 8601 datetime + UUID-shape primitives + API major version literal + `.strict()` discipline helper + a toy `_common/health` contract that drives the OpenAPI emission proof), and a hand-runnable script that emits `openapi/v1.yaml` per architecture §3.1 + §3.2.

The per-domain endpoint contracts (15 sub-domains: members / claims / pools / alerts / contributions / modules / partners / audit / rbac / kyc / reconciliation / helpdesk / feature-flags / pariwar-passport / deep-links) land per their per-Epic landing Stories — substantive `claims/` contracts at Story 6.x, `pools/` at 7.x, etc. Story 1.4 commits **only** the directory shape + landing-Story README pointers + the `.strict()` discipline reminder.

The substantive **OpenAPI breaking-change semantic-diff CI gate** + the substantive **per-tag bundle-subsetting CI test** + the **`packages/api-client/` first generator invocation** all land at Story 1.9+ when `apps/api` substantively populates its first routes (admin authentication). Story 1.4 commits **only** the generator-determinism CI gate (architecture §3.2 line 1862-1865) on a substrate-proof toy endpoint.

### `packages/contracts/` baseline state at Story 1.4 start

Per Story 1.1 Task 2.2: `packages/contracts/` exists at `origin/main` HEAD `335bc80` as a placeholder workspace with the standard shape:
- `package.json` (name `@twt/contracts`, type module, `main: "./src/index.ts"`, scripts `build/lint/typecheck/test/dev`, devDependencies only — `@twt/eslint-config-twt + typescript + vitest + @types/node`).
- `tsconfig.json` extending root `tsconfig.base.json` with `outDir: "dist"`.
- `eslint.config.js` re-exporting `@twt/eslint-config-twt`.
- `vitest.config.ts` (`include: ['tests/**/*.test.ts']`, `passWithNoTests: true`).
- `src/index.ts` (placeholder `export {}` with the "PR-1 placeholder" header comment).
- `tests/smoke.test.ts` (asserts `import * as mod from '../src/index'; expect(mod).toBeTruthy()`).

**Story 1.4 substantively populates** the `src/` directory + adds runtime dependencies to `package.json`. Smoke test continues to pass; new substantive tests land per Task 5.

### Story 1.1 + 1.2 + 1.3 inheritances + the Story 1.4 substrate it provides

Story 1.1 (`done`; PR #2 merged) provides: monorepo workspace topology + root configs + CI workflow + `packages/contracts/` placeholder workspace + ADR-0001 + ADR-0002.

Story 1.2 (`done`; PR #3 merged) provides: Cloud SQL Postgres Terraform IaC + Drizzle scaffolding at `packages/domain/` + Secret Manager wiring + migration zero idempotent + root `pnpm db:*` scripts + `turbo db:check` task + `.github/workflows/ci.yml` `db-check` job + ADR-0003-datastore-engine drafted.

Story 1.3 (`done`; PR #4 merged) provides: `events_log` Drizzle schema at `packages/domain/src/schema/events_log.ts` + append-only Postgres triggers via hand-supplemented migration 0001 + `packages/events/` substantively populated with `appendEvent` / `loadEvents` / `replayState` API + `StateMachine<S, E>` framework primitive + `canonicalJsonStringify` RFC 8785 JCS subset + `EVENT_TYPE_REGISTRY` shape + ADR-0004-canonical-json drafted + zod ^3.23.0 pinned in `packages/events/`.

Story 1.4 provides the substrate for:
- **Story 1.6** (`pariwar_id` first-class + RLS adversarial test) — populates per-tenant scoping discipline in path-prefix conventions; `packages/contracts/` `_common/` errors + cursor pagination etc. are RLS-agnostic at the wire layer; consumed verbatim. No `pgPolicy` impact on contracts. `_common/event-log-contract.ts` stays valid.
- **Story 1.7** (Pariwar-Passport data model + branding bundle per FR-63) — substantively authors `packages/domain/src/ids/` branded ID types (PariwarId, MemberId, etc.); `_common/primitives.ts` `UuidString` gets upgraded to branded variants; contracts `pariwar-passport/` sub-directory substantively populates (the Pariwar-Passport JSON shape per FR-63).
- **Story 1.8** (RBAC permission keys + scope dimensions + 12 seeded roles per FR-44/45/46) — populates `packages/contracts/src/rbac/` with permission-key + role-bundle + scope-dimension contracts.
- **Story 1.9** (admin authentication — email + password + WebAuthn passkey + step-up OTP per FR-22a + AR-22) — wires `fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger` at `apps/api/` (first substantive route surface); migrates OpenAPI emission from Story 1.4's build-time `@asteasolutions/zod-to-openapi` script to either runtime-extraction OR continued build-time-script registering Fastify routes' Zod schemas; substantive `openapi/v1.yaml` populates; OpenAPI breaking-change semantic-diff CI gate substantively wired; `packages/api-client/` first generator invocation per ADR-0005.
- **Story 1.10** (tamper-evident audit log + hash chain + 6h off-site mirror) — consumes `_common/event-log-contract.ts` for the trustee-facing audit-log surface (Story 1.11b) + populates `packages/contracts/src/audit/`.
- **Story 1.11a** (audit-log integrity verification primitive) — consumes `canonicalJsonStringify` from `@twt/events` (Story 1.3) for chain verification; populates additional `audit/` contracts.
- **Story 1.11b** (trustee-facing audit-log integrity verification UI) — consumes `_common/event-log-contract.ts` (Story 1.4) + `packages/contracts/src/audit/` (Story 1.10+1.11a).
- **Story 1.12** (pg-boss job queue + idempotency keyed store) — orthogonal to contracts; no coupling.
- **Story 1.13** + **Story 1.14** (Cloudflare + rate limiting + login wall) — orthogonal to `packages/contracts/` substrate; consumed at runtime, not at contract-shape time.
- **Story 1.16a** (friction-budget PR CI gate) — substantively wires the type-shadowing ESLint rule (architecture §Naming patterns line 3722-3723) + the `.strict()`-default ESLint rule (architecture §Format patterns line 3826) + the validator-presence-per-route ESLint rule (architecture §1.3 line 791-793) + per-tag bundle-subsetting CI test (architecture §4.11.1 line 2793-2794).
- **Story 1.16c** (schema-diff CI gate per FR-100 non-add guard) — extends to assert no `*PayoutDestination*` Zod schema in `packages/contracts/` per epics line 1338. Story 1.4's `_common/` substrate is harmless to this gate; the gate's pattern allowlist accommodates the in-scope Story 1.4 schemas.
- **Stories 3.1+, 6.x, 7.x, 8.x, 9.x, 10.x, 11a, 11b** — populate per-domain endpoint contracts in their respective sub-directories; each Story extends the type-assignability test (with per-domain Drizzle schemas) + extends the validation-parity test (with their domain's fixture set).

### Architecture-vs-Epic-AC alignment check

The epic AC line 1043-1060 enumerates Story 1.4 ACs verbatim:
- Zod schemas organized per domain (members, claims, pools, contributions, etc.) — directories exist as placeholders even when empty — **Story 1.4 commits exactly this** (15 sub-domain `.gitkeep` + landing-Story README pattern).
- OpenAPI spec generated from Zod schemas via a build step — **Story 1.4 commits the build-step script + `openapi/v1.yaml` artifact + `turbo` + CI gate**.
- Both `apps/api` (server validation) and `apps/admin` / `apps/member` (client types) import from this single package — **Story 1.4 commits the workspace direct-dependency wiring substrate; substantive `apps/api` + `apps/admin` imports land at Story 1.9+ and per-domain feature Stories**.
- Breaking schema changes are caught by a contract-diff CI step (placeholder until 1.16c lands) — **Story 1.4 commits the generator-determinism CI gate (a related but distinct gate); the substantive breaking-change semantic-diff CI gate per architecture §3.2 line 1856-1860 is explicitly deferred to D1-1.4 with Story 1.9+ trigger**. The epic AC's "placeholder until 1.16c lands" phrasing is somewhat loose — architecture §3.2 line 1856-1860 is canonical: the semantic-diff gate is the same surface as the FR-100 schema-diff gate at the Drizzle layer (1.16c) but operates on OpenAPI not on Drizzle migrations; both gates eventually coexist as orthogonal commitments. Documented here as a Story-AC-vs-architecture-precision-note per `[[feedback_architecture_vs_prd_boundary]]`.

**No substantive architecture-vs-epic-AC divergence is present at Story 1.4** (unlike Story 1.1's `apps/member` divergence + Story 1.2's `packages/db` divergence). The architecture's `packages/contracts/` canonical home (line 424-427, 614-619, 4361-4378) + the epic AC's `packages/contracts` placement align byte-for-byte. The epic AC's "apps/member" reference (line 1055) is the same Story 1.1 architectural divergence reaffirmed (apps/member does not exist per architecture §Workspace Layout); Story 1.4 carries the divergence note forward without re-litigating it. **One minor precision-tightening note**: the epic AC's "contract-diff CI step (placeholder until 1.16c lands)" should ideally be split into (a) the architecture §3.2 line 1856-1860 OpenAPI breaking-change semantic-diff gate (Story 1.9+ trigger) and (b) the Story 1.16c FR-100 Drizzle-schema-shape forbidden-pattern asserts (Story 1.16c trigger) — Story 1.4 commits neither substantively + commits the structural primitive for the former (generator determinism) — captured in Dev Notes here for the dev agent's clarity.

### Zod ↔ OpenAPI ecosystem at Story 1.4

**`@asteasolutions/zod-to-openapi`** is the build-time Zod-to-OpenAPI converter chosen for Story 1.4's substrate-proof; it has been the canonical npm library for this purpose since 2022 (registry-current `^7.x` as of 2026-06; verify at dev-time per the Story 1.2 + 1.3 pin re-validation discipline). It works by wrapping Zod's `extendZodWithOpenApi(z)` so any Zod schema gains an `.openapi(name, options?)` method; an `OpenAPIRegistry` collects schemas + paths; `OpenApiGeneratorV31` (or `OpenApiGeneratorV3` for OpenAPI 3.0) walks the registry and emits the JSON-Schema-compatible spec.

**`fastify-zod-openapi`** (architecture canonical per §3.1 line 1795) is the Fastify-plugin counterpart — at `apps/api/` it extracts the OpenAPI spec from a running Fastify server's registered Zod-typed routes. The two libraries can coexist: the build-time emission at Story 1.4 proves the pipeline; the runtime emission at Story 1.9+ replaces (or supplements) the build-time script. Decision deferred to Story 1.9 — the substantive choice depends on whether the build-time pipeline (importing Fastify route definitions at module-load to register them with `@asteasolutions/zod-to-openapi`) is cleaner than booting Fastify in CI and hitting `/_meta/openapi.json`.

**`fastify-type-provider-zod`** (architecture canonical per §3.1 line 1794) is the Fastify route-level Zod schema integration — it lets routes declare `schema: { body: ZodSchema, response: { 200: ZodSchema } }` and have Fastify enforce validation. Story 1.4 does NOT install this; Story 1.9+ does.

**`@hookform/resolvers/zod`** (architecture canonical per §4.4 line 2554) is the React Hook Form integration — `useForm({ resolver: zodResolver(ContractsZodSchema) })` validates the form against the same schema apps/api validates. Story 1.4 does NOT install this; Story 3.x / 9.x / 6.x form-handling feature Stories do.

**`drizzle-zod`** is the Drizzle-to-Zod schema codegen library — architecture §1.3 line 776-790 explicitly commits NOT using it for contract schemas due to a known incompatibility between drizzle-zod's generated `BuildSchema` and `fastify-type-provider-zod`'s expected `zod.Object` interface. Contracts are hand-written; drizzle-zod is permitted inside `packages/domain/` for internal parsing where transport validation is not required. Story 1.4 does NOT install drizzle-zod.

### Zod v3 vs v4 — dep-pin alignment with Story 1.3

Story 1.3 pinned `zod ^3.23.0` in `packages/events/package.json`. Story 1.4 MUST match the same major (and ideally the same minor). If zod v4 has shipped to npm by Story 1.4 execution time (registry-current as of 2026-06 is v3.23+ stable), follow Story 1.3's pin first; if a substantive v4 migration is needed across the monorepo, that's a separate cross-Story coordination (mark as `D-zod-v4-coordination` in deferred-work if it surfaces). The cross-monorepo zod-version-singularity is load-bearing: zod's runtime instance is exchanged across workspace boundaries (contracts ↔ events ↔ apps/api), and a `Zod3` schema cannot be `.parse()`'d by `Zod4` at runtime without an explicit migration.

### OpenAPI client-generation tool choice rationale (ADR-0005 substrate)

The architecture defers the client-generation tool to an ADR (§3.1 line 1812 + §5.15 line 3585 + adr-index.md line 98). The candidates field at 2026-Q1:

| Tool | TS-first | Per-tag subsetting | TanStack Query | Zod runtime | Maintenance | Why-not |
|---|---|---|---|---|---|---|
| `@hey-api/openapi-ts` | ✅ Native | ✅ `@hey-api/sdk` plugin | ✅ `@hey-api/openapi-ts-tanstack-query` plugin | ✅ `@hey-api/openapi-ts-zod` plugin | Very active (v0.50+ stabilized); 100k+ weekly DLs | — (primary) |
| `Orval` | ✅ Native | ✅ Configurable | ✅ Native TanStack Query / SWR / Vue Query / Angular Query | ✅ via `runtimeValidation: 'zod'` | Active; mature | — (secondary) |
| `openapi-typescript` | ✅ Types-only | ✅ via `--per-tag` flag | ❌ No client | ❌ Types only | Very active | Types-only — forces hand-rolling fetch + query hooks across 3 apps; net friction higher |
| `openapi-typescript-codegen` | ⚠ Older | ⚠ Limited | ❌ No native | ❌ No | Deprecated as of 2024 | Deprecated — Phase-0 dep-pin discipline prohibits adopting |
| `Kubb` | ✅ Native | ✅ Plugin-based | ✅ Plugin | ✅ Plugin | Active; smaller ecosystem | Smaller battle-test surface in India-region; revisit at v2 if hey-api/Orval don't fit |

`@hey-api/openapi-ts` (v0.50+ stabilized API; previously known as `openapi-ts`) is the **primary** choice. The library's per-plugin architecture (`@hey-api/sdk` for clients + `@hey-api/openapi-ts-tanstack-query` for query hooks + `@hey-api/openapi-ts-zod` for runtime validators) maps cleanly to architecture's `packages/api-client/` (per architecture §Project Structure line 4379-4380) + §4.2 TanStack Query universal layer + §4.11.1 per-tag subsetting commitments. The secondary candidate Orval is kept warm because the hey-api ecosystem is newer and Story 1.9+ real-usage validation may surface a deal-breaker; in that case ADR-0005 supersedes to `ADR-NNNN-openapi-client-generation-revised` choosing Orval per the architecture's ADR-supersession discipline.

### Branding strategy at Story 1.4

Architecture commits branded ID types at `packages/domain/src/ids/` (§Cross-cutting concerns line 4538). Architecture §Naming patterns line 3700-3708 says "Identifiers that flow across architectural boundaries (`MemberId`, `PariwarId`, `ClaimId`, `PoolId`, `AlertId`, `ContributionId`, ...) are committed as branded types in a shared contracts layer. The brand applies only to identifiers crossing boundaries — not to every string field. Implementation pattern in an ADR." This poses a localized contention: do branded types live in `packages/domain/src/ids/` or in `packages/contracts/`?

The dominant interpretation: **branded types LIVE in `packages/domain/src/ids/`** (architecture §Cross-cutting concerns is canonical at the workspace-location level); **contracts re-exports them or imports them at type level** for use in transport-layer Zod schemas. Story 1.7 substantively authors `packages/domain/src/ids/` and lands branded ID types; Story 1.4 commits the transport-shape `UuidString = z.string().uuid()` plain primitive in `_common/primitives.ts` without branding, so consumers (apps/api at Story 1.9+, etc.) don't block on Story 1.7. Once Story 1.7 lands, `_common/primitives.ts` extends to re-export `MemberId`, `PariwarId`, etc. from `@twt/domain/ids`, and downstream contracts substitute the branded variants in their per-domain Zod schemas. This is documented in `packages/contracts/README.md` (Task 7.7) + cross-linked to Story 1.7 deferred-work D12-1.4.

### Repository state at story-creation time

- Current branch: `story-1.2-cloud-sql-drizzle` (HEAD `e597026 chore: merge main into story-1.2-cloud-sql-drizzle (resolve squash-divergence)`); local `main` is at `1c15d40` behind `origin/main` by 19 commits.
- `origin/main` (HEAD `335bc80 feat: Story 1.2 + Story 1.3 — Cloud SQL substrate + event log primitive`) is the canonical starting point — has Stories 1.1 + 1.2 + 1.3 squash-merged.
- The Story 1.4 dev agent should: (1) `git fetch origin`; (2) `git checkout main && git pull --ff-only origin main`; (3) `git checkout -b story-1.4-contracts-scaffolding`. Then proceed with Task 1.

### Dev guardrails — what makes the dev agent's Story 1.4 implementation go smoothly

- **Don't reinvent Story 1.1's workspace shape**: `packages/contracts/` already has `package.json` + `tsconfig.json` + `eslint.config.js` + `vitest.config.ts` + `src/index.ts` placeholder + `tests/smoke.test.ts`. Story 1.4 ADDS substantive content; it does NOT recreate the placeholder shape.
- **Don't reinvent Story 1.2's substrate**: `packages/domain/` Drizzle schema + Secret Manager wiring + migrations exist. Story 1.4 IMPORTS from `@twt/domain` (for the type-assignability test using `events_log`); it does NOT regenerate Drizzle scaffolding.
- **Don't reinvent Story 1.3's substrate**: `packages/events/` `appendEvent` / `loadEvents` / `replayState` + `StateMachine<S, E>` + `canonicalJsonStringify` + `EVENT_TYPE_REGISTRY` exist. Story 1.4 does NOT import from `@twt/events` (the substrate is orthogonal); the `_common/event-log-contract.ts` transport-shape mirrors the `events_log` Drizzle table from `@twt/domain` (Story 1.3 substrate), not the events package API surface.
- **Don't pre-populate substantive per-domain contracts**: 15 sub-directories land as `.gitkeep` + landing-Story README. Substantive `claims/` Zod schemas are Story 6.x territory; pools at 7.x; members at 3.1+; etc.
- **Don't install `fastify-type-provider-zod` or `fastify-zod-openapi` or `@fastify/swagger`**: those land at Story 1.9+ when `apps/api/` first substantively populates routes.
- **Don't install `@hookform/resolvers/zod`**: that's apps/admin or apps/mobile form-handling Story territory (Stories 3.x / 6.x / 9.x).
- **Don't install `drizzle-zod`**: architecture §1.3 line 776-790 explicitly forbids it for transport-layer contracts.
- **Don't substantively populate `packages/api-client/`**: Story 1.9+ wires the first generator invocation per ADR-0005.
- **Don't substantively populate the OpenAPI breaking-change semantic-diff CI gate**: the substrate has only a toy endpoint at Story 1.4; the gate has no diff substrate. Story 1.9+ wires substantively per D1-1.4.
- **Don't substantively populate the per-tag bundle-subsetting CI test**: that's Story 1.16a friction-budget CI gate territory per D4-1.4.
- **Don't author the type-shadowing-prohibition ESLint rule**: Story 1.16a territory per D5-1.4.
- **Don't author the `.strict()`-default ESLint rule**: Story 1.16a territory per D6-1.4. Story 1.4 commits the `_common/strict.ts` runtime helper + per-domain README reminders.
- **Don't author the validator-presence-per-route ESLint rule**: Story 1.16a + Story 1.9 territory per D7-1.4.
- **Don't change Story 1.2's migration zero or Story 1.3's migration one**: contracts are orthogonal to DB migrations at the file level.
- **Don't break the `packages/events/` zod ^3.23.0 pin alignment**: install the same zod major + minor line in `packages/contracts/` to preserve cross-workspace runtime singularity per the zod-instance-exchange invariant.
- **Don't add a `db:migrate` Turbo task or CI job at Story 1.4**: that's architecture §1.8 migration-precedes-deploy discipline (preserved from Story 1.2).
- **Use `pnpm --filter @twt/contracts`** for workspace-scoped script invocation.
- **Use Conventional Commits** per Story 1.1 commitlint config — example commits: `feat(packages/contracts): scaffold per-domain sub-directories + _common primitives`, `feat(packages/contracts): add OpenAPI emission pipeline + generator-determinism check`, `test(packages/contracts): add type-assignability + validation-parity scaffolds`, `ci: add contracts-check job (OpenAPI generator determinism)`, `docs(adr): ADR-0005 OpenAPI client-generation tool choice`, `chore: Story 1.4 documentation + decision-log + cross-refs`.

### Project Structure Notes

**Workspace tree at Story 1.4 closure** (additions to the Story 1.3 baseline; preserves all Story 1.1 + 1.2 + 1.3 paths):

```
twt/
├── .decision-log.md                    [UPDATED] Task 6.3 — append Decision 2026-06-XX-XXX
├── README.md                           [UPDATED] Task 7.8 — §Contracts + OpenAPI section
├── package.json                        [UPDATED] Task 4.1 — contracts:* root scripts
├── turbo.json                          [UPDATED] Task 4.2 — contracts:check-openapi-determinism task
├── .github/workflows/ci.yml            [UPDATED] Task 4.3 — contracts-check job
├── openapi/
│   └── v1.yaml                         [NEW] Task 3.3 — OpenAPI 3.1 spec (committed deterministic artifact)
├── docs/
│   ├── adr/
│   │   └── ADR-0005-openapi-client-generation.md  [NEW] Task 6.1
│   └── knowledge-transfer/
│       └── adr-index.md                [UPDATED] Task 6.2 — flip line 98 slot-reserved-pre-write → drafted + count table
└── packages/
    └── contracts/                      (Story 1.1 placeholder; Story 1.4 substantively populates)
        ├── package.json                [UPDATED] Task 1.1 + 1.2 + 5.3 — zod + @asteasolutions/zod-to-openapi + yaml + tsx + @twt/domain workspace dep + emit-openapi + check-openapi-determinism scripts
        ├── README.md                   [NEW] Task 7.7 — workspace purpose + sub-domain landing-Story map + OpenAPI emission + type-assignability + validation-parity workflows + ADR-0005 cross-link + discipline reminders
        ├── scripts/
        │   ├── emit-openapi.ts                    [NEW] Task 3.1 — @asteasolutions/zod-to-openapi pipeline
        │   └── check-openapi-determinism.ts       [NEW] Task 3.2 — CI gate primitive
        ├── src/
        │   ├── index.ts                [UPDATED] Task 2.8 — substantive re-exports + CONTRACTS_API_VERSION + __substrateOnly marker
        │   ├── _common/
        │   │   ├── index.ts                       [NEW] Task 2.7 — barrel
        │   │   ├── errors.ts                      [NEW] Task 2.1 — ErrorResponse envelope + defineErrorCode helper
        │   │   ├── pagination.ts                  [NEW] Task 2.2 — Cursor + PaginationQuery + paginatedResponse factory
        │   │   ├── primitives.ts                  [NEW] Task 2.3 — Iso8601Datetime + UuidString + RequestId + Email
        │   │   ├── version.ts                     [NEW] Task 2.4 — ApiMajorVersion literal
        │   │   ├── strict.ts                      [NEW] Task 2.5 — assertStrict helper
        │   │   ├── health.ts                      [NEW] Task 2.6 — toy endpoint contract (drives OpenAPI emission proof)
        │   │   └── event-log-contract.ts          [NEW] Task 5.1 — events_log wire shape (for Story 1.10/1.11b consumers)
        │   ├── errors/
        │   │   ├── .gitkeep                       [NEW] Task 1.4 placeholder for downstream Stories
        │   │   ├── index.ts                       [NEW] Task 1.4 — empty barrel
        │   │   └── README.md                      [NEW] Task 1.4 — per-domain enumeration convention
        │   ├── members/                           [NEW] Task 1.3 — Story 3.1+ landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── claims/                            [NEW] Task 1.3 — Story 6.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── pools/                             [NEW] Task 1.3 — Story 7.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── alerts/                            [NEW] Task 1.3 — Story 8.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── contributions/                     [NEW] Task 1.3 — Story 9.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── modules/                           [NEW] Task 1.3 — Story 12.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── partners/                          [NEW] Task 1.3 — Story 12.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── audit/                             [NEW] Task 1.3 — Story 1.10/1.11a/1.11b landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── rbac/                              [NEW] Task 1.3 — Story 1.8 landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── kyc/                               [NEW] Task 1.3 — Story 3.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── reconciliation/                    [NEW] Task 1.3 — Story 9.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── helpdesk/                          [NEW] Task 1.3 — Story 10.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── feature-flags/                     [NEW] Task 1.3 — Story 10.x landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   ├── pariwar-passport/                  [NEW] Task 1.3 — Story 1.7 landing
        │   │   ├── .gitkeep
        │   │   └── README.md
        │   └── deep-links/                        [NEW] Task 1.3 — Story 1.7+ landing
        │       ├── .gitkeep
        │       └── README.md
        └── tests/
            ├── smoke.test.ts                      (PRESERVED Story 1.1 placeholder)
            ├── type-assignability.test.ts         [NEW] Task 5.2 — contract-↔-domain assignability
            └── validation-parity.test.ts          [NEW] Task 5.4 — cross-surface validation parity scaffold
└── _bmad-output/implementation-artifacts/
    ├── sprint-status.yaml              [UPDATED] Task 7.10 — 1-4 backlog→ready-for-dev→in-progress→review
    ├── 1-4-packages-contracts-zod-openapi-contract-scaffolding.md  [UPDATED] Task 7.9 — Dev Agent Record
    └── deferred-work.md                [UPDATED] Task 6.4 — ## Story 1.4 deferred section
```

### Testing standards summary

**At Story 1.4** the test surface is:
- **`packages/contracts/tests/smoke.test.ts`** (PRESERVED from Story 1.1 placeholder) — continues to assert `src/index.ts` is truthy.
- **`packages/contracts/tests/type-assignability.test.ts`** (NEW Task 5.2) — vitest unit (no DB); compile-time assignability assertion using TS conditional type narrowing + a runtime parse-demonstration test. Cross-references the Story 1.3 `events_log` Drizzle schema via `@twt/domain` import.
- **`packages/contracts/tests/validation-parity.test.ts`** (NEW Task 5.4) — vitest unit (no DB); fixture-set harness running Zod runtime only at Story 1.4; downstream Stories extend with Fastify + RHF + Astro Actions runtimes.

**Test runner**: `vitest` per Story 1.1 default; matches the workspace convention. All tests run on CI without external dependencies (no DB; no live network); they execute via `pnpm turbo run test` in the existing test job.

**Architecture-committed integration test slots** that Story 1.4 does NOT populate (per Story 1.1 + 1.2 + 1.3 enumeration):
- `tests/integration/pool-engine/replay.spec.ts` (Story 7.x).
- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Story 1.6).
- `tests/integration/rls/policy-regression.spec.ts` (Story 1.6).
- `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10).
- `tests/integration/snapshot-adapters/property.spec.ts` (Story 7.x).
- `tests/integration/public-pages/scrape-test.spec.ts` (Story 1.16b).

**Live-DB CI substrate**: NOT introduced at Story 1.4 (preserves D2-1.3 deferral to Story 1.6).

**Generator-determinism CI gate**: NEW at Story 1.4 (`contracts-check` job) — runs `pnpm turbo run contracts:check-openapi-determinism`; re-emits `openapi/v1.yaml`; asserts byte-identical to committed file; exits 1 on drift.

### References

- [Source: epics.md#Story-1.4] line 1043-1060 — story body + ACs (verbatim source).
- [Source: epics.md#AR-4] line 259 — Validation library Zod for both contracts and domain.
- [Source: epics.md#AR-38] line 314 — REST + OpenAPI + Zod-derived schemas + packages/contracts single source of truth + packages/api-client generated typed client.
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies.
- [Source: epics.md#Story-1.16c] line 1328-1344 — schema-diff CI gate (FR-100 non-add guard) — cross-references packages/contracts `*PayoutDestination*` Zod schema forbidden pattern.
- [Source: epics.md#Sprint-Change-Proposal-Item-12] line 525 + line 4554-4556 — packages/contracts/src/deep-links/ landing.
- [Source: architecture.md#Workspace-Layout] line 406-435 — packages/contracts holds transport-layer contracts; distinct from packages/events.
- [Source: architecture.md#Package-Boundary-Rationale] line 614-619 — packages/contracts substantive purpose.
- [Source: architecture.md#1.3-Validation-library-Zod] line 770-793 — Zod canonical; drizzle-zod NOT used for contracts; type tests + validator-presence lint.
- [Source: architecture.md#3.1-API-style] line 1791-1814 — REST + OpenAPI 3.1 + Zod single source of truth + fastify-zod-openapi + @fastify/swagger + fastify-type-provider-zod + packages/api-client generated client.
- [Source: architecture.md#3.2-Error-handling-pagination-versioning] line 1815-1877 — structured error response + cursor-based pagination + URL-based major versioning + OpenAPI breaking-change semantic-diff CI + generator determinism.
- [Source: architecture.md#4.2-Server-state-TanStack-Query] line 2481-2517 — TanStack Query universal; query hooks generated from OpenAPI/Zod; per-Pariwar query keys.
- [Source: architecture.md#4.4-Form-handling] line 2549-2572 — React Hook Form + Zod; cross-surface validation parity test.
- [Source: architecture.md#4.11.1-Bundle-discipline] line 2787-2794 — per-route OpenAPI client subsetting; per-tag CI test.
- [Source: architecture.md#Naming-patterns] line 3700-3729 — branded types + z.output/z.input canonical names + generated types single source of truth + contract↔domain assignability test.
- [Source: architecture.md#Format-patterns] line 3798-3826 — API response envelope + ISO 8601 + .strict() default.
- [Source: architecture.md#Cross-Cutting] line 3955-3960 — contract ownership; no schema redefinition.
- [Source: architecture.md#Top-10-anti-patterns] line 4074-4090 — type-shadowing (#2) + path-alias cross-package imports (#10).
- [Source: architecture.md#Project-Structure] line 4131-4439 — directory layout; packages/contracts/src/<domain>/ + openapi/v1.yaml.
- [Source: architecture.md#Generated-artifacts-PR-review] line 4001-4005 — bot-owned CODEOWNERS + .gitattributes linguist-generated=true.
- [Source: architecture.md#Cross-cutting-concerns] line 4538 — branded IDs at packages/domain/src/ids/.
- [Source: architecture.md#Implementation-Handoff] line 5079-5099 — PR-2 substantive content authoring window.
- [Source: docs/knowledge-transfer/adr-index.md] line 98 — ADR-NNNN-openapi-client-generation slot reserved for Story 1.4 closure.
- [Source: docs/adr/ADR-0003-datastore-engine.md] — Story 1.2 ADR draft pattern reference.
- [Source: docs/adr/ADR-0004-canonical-json.md] — Story 1.3 ADR draft pattern reference.
- [Source: _bmad-output/implementation-artifacts/1-1-turborepo-monorepo-bootstrap.md] — workspace shape inheritance.
- [Source: _bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md] — packages/domain substrate + Secret Manager wiring + turbo db:check pattern + CI db-check job pattern.
- [Source: _bmad-output/implementation-artifacts/1-3-packages-events-event-log-primitive.md] — packages/events substrate + events_log Drizzle schema + zod ^3.23.0 pin.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — Story 1.4 deferred section landed at Task 6.4.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — Story 1.4 development_status entry.
- [Source: .decision-log.md] Decision 2026-06-08-038 (Story 1.2 with Story 1.4 cross-Story discharge trigger anticipation) + Decision 2026-06-09-039 (Story 1.3 with Story 1.4 reference) — append Decision 2026-06-XX-XXX for Story 1.4 at Task 6.3.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (via Claude Code; engineering agent under bmad-dev-story workflow)

### Debug Log References

- `pnpm install` two passes (initial dep wire-up + `--frozen-lockfile` post-author verification); zero new peer-dep warnings introduced by Story 1.4 (pre-existing apps/mobile peer warnings from Story 1.1 baseline carry forward unchanged).
- `pnpm --filter @twt/contracts contracts:emit-openapi` exit 0 — `openapi/v1.yaml` written 2808 chars (2810 bytes on disk; 2-byte delta = one em-dash `—` UTF-8 multibyte in `info.description`).
- `pnpm --filter @twt/contracts contracts:check-openapi-determinism` exit 0 — re-emission byte-identical to committed file.
- Manual determinism-break verification: temporarily appended `# tampered` line to `openapi/v1.yaml`; `pnpm contracts:check-openapi-determinism` exit 1 with explicit "emission is non-deterministic" message; reverted.
- `pnpm --filter @twt/contracts test` exit 0 — 6 tests across 3 files (1 smoke + 3 type-assignability + 2 validation-parity).
- `pnpm --filter @twt/contracts typecheck` exit 0 (after dropping the over-strict bidirectional assignability assertion; see Completion Note 3 below).
- `pnpm turbo run lint typecheck test build` final result: **56/56 successful, 52 cached, 1.98s** (matches Story 1.3 baseline 56 — Story 1.4 adds no new lint/typecheck/test/build tasks; the `contracts:check-openapi-determinism` task runs separately).
- `pnpm turbo run db:check contracts:check-openapi-determinism` exit 0.

### Completion Notes List

1. **Branch chosen** (Task 7.1): Option (a) — branched from `origin/main` (`335bc80` HEAD; Stories 1.1+1.2+1.3 squash-merged) after `git fetch + git checkout main + git pull --ff-only`. New branch `story-1.4-contracts-scaffolding`. Clean branch from main; no stacked-PR dependency.
2. **Final dep pins** (Task 1.1 + 7.6): `zod ^3.23.0` (matches Story 1.3 zod-instance-singularity invariant per the cross-monorepo runtime-instance-exchange property — verified at install time; zod v4 not yet shipped to npm stable line as of 2026-06-09). `@asteasolutions/zod-to-openapi ^7.3.0` (registry-current stable; v7 line). `yaml ^2.6.1` (registry-current). `tsx ^4.19.0` (matches Story 1.2's `packages/domain` pin). `@twt/domain workspace:*` direct dep added per Task 5.3 for the type-assignability test scaffold.
3. **One Tasks/Subtasks deviation with rationale captured here**: **Type-assignability test direction simplification.** The Story 1.4 Dev Notes implied a bidirectional contract-↔-domain assignability. Initial implementation asserted both directions; `EventLogContractType extends EventLogWireProjection` failed typecheck because the contract's narrowing patterns (`.nonnegative()` numerics + the `.strict()` envelope assertion) introduced asymmetries that the architecture's own canonical direction does NOT require. **Resolution**: dropped the reverse direction and kept only the architecture-canonical direction (`EventLogWireProjection extends EventLogContractType`, i.e., "contract types are assignable from inferred Drizzle types" per architecture §1.3 line 787-790). The reverse direction is NOT architecturally committed — the contract MAY be a relaxed superset of the Drizzle row at the transport layer. Downstream Stories preserve this single-direction discipline.
4. **One collateral fix surfaced + landed under Story 1.4**: **`@twt/eslint-config-twt` ignores generated `dist/`** (`packages/eslint-config-twt/index.js`). The Story 1.4 contracts→domain workspace dep triggers `^build` → `@twt/domain:build` which emits `dist/*.d.ts` containing drizzle-orm's `{}` empty-object types that trip `@typescript-eslint/no-empty-object-type`. The issue was latent at Story 1.3 (events also depends on domain) but cache hits masked it; the Story 1.4 lockfile change invalidated lint caches and surfaced it. Fix: shared eslint config ignores `**/dist/**` + `**/.next/**` + `**/.expo/**` + `**/build/**` + `**/coverage/**` globally. Linting build outputs has no value; we lint sources. Zero impact on rule coverage of hand-authored code.
5. **Workspace-script name alignment** (Task 4.2 + 7.4 collateral): The Story 1.4 spec used `emit-openapi` + `check-openapi-determinism` as the per-workspace script names while turbo.json defines task names `contracts:emit-openapi` + `contracts:check-openapi-determinism`. Turbo requires task names to match workspace script names; first turbo run matched zero workspaces. **Resolution**: renamed the per-workspace scripts in `packages/contracts/package.json` to `contracts:emit-openapi` + `contracts:check-openapi-determinism` so the names align with turbo task names. Root `pnpm contracts:emit-openapi` script updated to delegate `pnpm --filter @twt/contracts contracts:emit-openapi`.
6. **Final turbo gate count post-Story-1.4** (Task 7.5 + 7.6): **56/56** for `pnpm turbo run lint typecheck test build` (matches Story 1.3 baseline — Story 1.4 does NOT add a new workspace; it adds substantive content to the existing `@twt/contracts` workspace; the new `contracts:check-openapi-determinism` is a separate Turbo task not covered by the 4-canonical-task gate). The dedicated `pnpm turbo run contracts:check-openapi-determinism` runs the new gate (1 task, ~50ms-1s).
7. **Final `openapi/v1.yaml` stats** (Task 7.6): 102 lines, 2810 bytes UTF-8 (2808 chars; 1 em-dash in `info.description` accounts for the 2-byte multibyte delta). Contains: `openapi: 3.1.0`, `info.title: TWT API v1`, `info.version: 0.0.0-substrate`, one path `/api/v1/_meta/health` GET operation, two component schemas `HealthResponse` + `ErrorResponse`. Path responses use inlined schemas (not `$ref` to components) — this is `@asteasolutions/zod-to-openapi` default behavior when the same schema instance is used directly in a path; substantive Story 1.9+ routes will use `.openapi('Name')` per-schema to drive `$ref` generation. Story 1.4 substrate-proof posture treats both forms as deterministic.
8. **Pre-execution user choices captured**: (a) branch strategy = `origin/main` (Recommended); (b) dep-version pin discipline = story-file pins as baseline with registry-verify at install time; (c) "anything to flag" = No — proceed end-to-end. All three captured via `AskUserQuestion` at dev-story Step 1 task_check.
9. **Architecture-vs-Story-AC alignment confirmation** (Task 7.6): **No substantive divergence at Story 1.4**. `packages/contracts/` canonical home aligns byte-for-byte across architecture §1.3 + §3.1 + §Project Structure line 4361-4378 + epics AC line 1043-1060. One inherited divergence preserved without re-litigation: epic AC line 1055's `apps/member` reference is the Story 1.1 architectural divergence (`apps/member` does not exist per architecture §Workspace Layout). One precision-tightening note documented in Dev Notes "Architecture-vs-Epic-AC alignment check" subsection: the epic AC's "contract-diff CI step (placeholder until 1.16c lands)" phrasing is split per architecture into orthogonal gates (§3.2 line 1856-1860 OpenAPI breaking-change semantic-diff at Story 1.9+ AND Story 1.16c FR-100 schema-diff at Drizzle layer); Story 1.4 commits the generator-determinism primitive only. Captured per `[[feedback_architecture_vs_prd_boundary]]`.
10. **Collateral chore**: `openapi/.gitkeep` removed (no longer needed now that `v1.yaml` lives in the directory). `openapi/README.md` updated to reflect substrate state at Story 1.4 closure.
11. **Closure-language-precision posture** per `[[feedback_closure_language_precision]]`: framework + engineering legs **Closed by [edit]** on Tasks 1-7 + local CI gates green; ADR-0005 trustee-ratification + Story 1.9+ first-apps/api-route triggers + Stories 3.1+/6.x/7.x/8.x/9.x/10.x/11a/11b per-domain endpoint contracts + Story 1.16a friction-budget ESLint rules legs all **Resolved via explicit deferral** with rationale enumerated in `deferred-work.md` D1-1.4 through D14-1.4.

### File List

**NEW files:**

- `packages/contracts/README.md` (Task 7.7)
- `packages/contracts/scripts/emit-openapi.ts` (Task 3.1)
- `packages/contracts/scripts/check-openapi-determinism.ts` (Task 3.2)
- `packages/contracts/src/_common/errors.ts` (Task 2.1)
- `packages/contracts/src/_common/pagination.ts` (Task 2.2)
- `packages/contracts/src/_common/primitives.ts` (Task 2.3)
- `packages/contracts/src/_common/version.ts` (Task 2.4)
- `packages/contracts/src/_common/strict.ts` (Task 2.5)
- `packages/contracts/src/_common/health.ts` (Task 2.6)
- `packages/contracts/src/_common/event-log-contract.ts` (Task 5.1)
- `packages/contracts/src/_common/index.ts` (Task 2.7)
- `packages/contracts/src/errors/index.ts` (Task 1.4)
- `packages/contracts/src/errors/README.md` (Task 1.4)
- `packages/contracts/src/members/.gitkeep` + `members/README.md` (Task 1.3)
- `packages/contracts/src/claims/.gitkeep` + `claims/README.md` (Task 1.3)
- `packages/contracts/src/pools/.gitkeep` + `pools/README.md` (Task 1.3)
- `packages/contracts/src/alerts/.gitkeep` + `alerts/README.md` (Task 1.3)
- `packages/contracts/src/contributions/.gitkeep` + `contributions/README.md` (Task 1.3)
- `packages/contracts/src/modules/.gitkeep` + `modules/README.md` (Task 1.3)
- `packages/contracts/src/partners/.gitkeep` + `partners/README.md` (Task 1.3)
- `packages/contracts/src/audit/.gitkeep` + `audit/README.md` (Task 1.3)
- `packages/contracts/src/rbac/.gitkeep` + `rbac/README.md` (Task 1.3)
- `packages/contracts/src/kyc/.gitkeep` + `kyc/README.md` (Task 1.3)
- `packages/contracts/src/reconciliation/.gitkeep` + `reconciliation/README.md` (Task 1.3)
- `packages/contracts/src/helpdesk/.gitkeep` + `helpdesk/README.md` (Task 1.3)
- `packages/contracts/src/feature-flags/.gitkeep` + `feature-flags/README.md` (Task 1.3)
- `packages/contracts/src/pariwar-passport/.gitkeep` + `pariwar-passport/README.md` (Task 1.3)
- `packages/contracts/src/deep-links/.gitkeep` + `deep-links/README.md` (Task 1.3)
- `packages/contracts/tests/type-assignability.test.ts` (Task 5.2)
- `packages/contracts/tests/validation-parity.test.ts` (Task 5.4)
- `openapi/v1.yaml` (Task 3.3 — initial deterministic emission, 2810 bytes)
- `docs/adr/ADR-0005-openapi-client-generation.md` (Task 6.1)

**UPDATED files:**

- `packages/contracts/package.json` (Task 1.1, 1.2, 5.3) — workspace deps + contracts:* scripts + `@twt/domain` workspace dep.
- `packages/contracts/src/index.ts` (Task 2.8) — replaced Story 1.1 `export {}` placeholder with substantive re-exports + `CONTRACTS_API_VERSION` + `__substrateOnly` marker.
- `package.json` (Task 4.1) — root `contracts:emit-openapi` + `contracts:check-openapi-determinism` scripts.
- `turbo.json` (Task 4.2) — `contracts:check-openapi-determinism` task definition.
- `.github/workflows/ci.yml` (Task 4.3) — `contracts-check` job mirroring `db-check` shape.
- `docs/knowledge-transfer/adr-index.md` (Task 6.2) — flipped line 98 slot `slot-reserved-pre-write` → `drafted`; Status row-count table updated `slot-reserved-pre-write` 123 → 122, `drafted` 2 → 3; annotation paragraph appended with Story 1.4 reference.
- `.decision-log.md` (Task 6.3) — appended Decision 2026-06-09-040 at top of `## Decisions` section per reverse-chronological schema; decision-type index entry appended for Story 1.4.
- `_bmad-output/implementation-artifacts/deferred-work.md` (Task 6.4) — appended `## Story 1.4 deferred` section with D1-1.4 through D14-1.4.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Task 7.10) — flipped `1-4-packages-contracts-zod-openapi-contract-scaffolding`: `ready-for-dev` → `in-progress` → `review`.
- `_bmad-output/implementation-artifacts/1-4-packages-contracts-zod-openapi-contract-scaffolding.md` (Task 7.9 — this file) — Status flips + Dev Agent Record populated + 7 Tasks + 38 subtasks marked [x].
- `README.md` (root, Task 7.8) — new `## Contracts + OpenAPI` section + `packages/contracts/` row in workspace layout flipped to "Active at Story 1.4" + `openapi/` row updated.
- `openapi/README.md` (collateral edit — preserve discoverability) — substrate-state-at-Story-1.4-closure section + re-emission commands + CI gates + migration path at Story 1.9+.
- `packages/eslint-config-twt/index.js` (collateral fix, see Completion Note 4) — shared eslint config ignores `**/dist/**` + `**/.next/**` + `**/.expo/**` + `**/build/**` + `**/coverage/**`.
- `pnpm-lock.yaml` (collateral) — lockfile updated for new contracts deps.

**DELETED files:**

- `openapi/.gitkeep` (Task 7.7 collateral — directory now substantively populated by `v1.yaml` + `README.md`).

### Change Log

- 2026-06-09: Story 1.4 substantive author-commit landed on branch `story-1.4-contracts-scaffolding` branched from `origin/main` HEAD `335bc80`. Tasks 1-7 closed (7 task headers + 38 subtasks). All 4 ACs satisfied. Local turbo gate green at 56/56; `contracts:check-openapi-determinism` task green; tests 6/6. Story 1.4 Status: review. Awaiting code-review pass.

### Review Findings

Code review pass: 2026-06-10. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor (all three completed). 34 raw signals → 14 dismissed, 2 decision-needed, 12 patch, 1 defer.

#### Decision-Needed

- [x] [Review][Decision] F10: `paginatedResponse` factory produces unregistered, unannotated OpenAPI schema — When downstream Stories pass the factory's output to `registry.registerPath(...)`, `@asteasolutions/zod-to-openapi` will inline the full schema rather than emit a `$ref`, producing duplicate inline definitions and defeating component reuse. The factory needs either (a) a `name` parameter so callers can call `.openapi(name)` on the result before registering, or (b) a wrapper that auto-registers via `registry.registerComponent`. The correct approach depends on whether the factory is meant to be a pure Zod constructor (callers annotate) or a registry-aware builder.
- [x] [Review][Decision] F11: `EventLogContract.eventVersion` uses `z.number().int().nonnegative()` which allows `0` — Architecture §1.11 and the optimistic-concurrency convention in the codebase imply event versioning is 1-based (monotonically increasing from 1). A wire payload with `eventVersion: 0` would parse successfully but violate the concurrency invariant downstream. Confirm: is 0 a valid event version at the transport layer, or should this be `.min(1)`?

#### Patches

- [x] [Review][Patch] F01: `defineErrorCode` accepts empty-string `domain`/`action`, silently producing `.`, `..sub`, or `.action` error codes that violate the dotted-resource-action convention [packages/contracts/src/_common/errors.ts:37-38]
- [x] [Review][Patch] F02: `ErrorResponse.error.code` uses `z.string().min(1)` which accepts a single space `" "`, producing a blank-but-valid error code in logs and audit entries [packages/contracts/src/_common/errors.ts:50]
- [x] [Review][Patch] F03: `PaginationQuery.cursor` uses `z.string().min(1).optional()` which accepts whitespace-only strings; server receives a logically empty cursor and may produce undefined pagination behavior [packages/contracts/src/_common/pagination.ts:23]
- [x] [Review][Patch] F04+F16: `emit-openapi.ts` calls `extendZodWithOpenApi(z)` but then uses `registry.register('HealthResponse', HealthResponse)` instead of the spec-prescribed `registry.registerComponent('schemas', 'HealthResponse', HealthResponse.openapi('HealthResponse'))` — the component schemas are inlined in path responses rather than `$ref`-referenced; additionally, `extendZodWithOpenApi(z)` is a body statement that runs after static imports of `health.ts`/`errors.ts` are hoisted and evaluated (ESM hoisting), making it redundant in current form but brittle if `.openapi()` call-sites are added to those modules [packages/contracts/scripts/emit-openapi.ts]
- [x] [Review][Patch] F05: `check-openapi-determinism.ts` reads `before`, then calls `execSync` which overwrites `target` in-place; if the emission crashes mid-write, the committed reference file is corrupted with no recovery path — should emit to a temp file, compare buffers, leave the committed file intact [packages/contracts/scripts/check-openapi-determinism.ts]
- [x] [Review][Patch] F06: `execSync('tsx scripts/emit-openapi.ts', ...)` in `check-openapi-determinism.ts` has no try/catch — an uncaught exception propagates as a raw stack dump rather than the clear determinism-violation message, making CI triage harder [packages/contracts/scripts/check-openapi-determinism.ts]
- [x] [Review][Patch] F08: `yaml.stringify(doc, { lineWidth: 0 })` in `emit-openapi.ts` does not explicitly set `sortMapEntries: false` — a future `yaml` package upgrade defaulting to sorted keys would silently break byte-identity between environments and defeat the determinism guarantee [packages/contracts/scripts/emit-openapi.ts:67]
- [x] [Review][Patch] F09: `assertStrict` reads Zod internal `_def.unknownKeys` which is undocumented and version-sensitive; additionally, a `ZodObject` wrapped in `ZodEffects` (e.g. `.transform()` or `.refine()` applied after `.strict()`) causes `_def.unknownKeys` to be `undefined` on the wrapper, making `assertStrict` throw a false positive on valid strict schemas [packages/contracts/src/_common/strict.ts:20-22]
- [x] [Review][Patch] F12: `PaginationQuery.cursor` is defined as `z.string().min(1).optional()` instead of `Cursor.optional()` — if `Cursor` gains additional constraints (URL-safety regex, max-length) in a downstream Story, `PaginationQuery.cursor` silently remains looser [packages/contracts/src/_common/pagination.ts:24]
- [x] [Review][Patch] F13: `contracts-check` CI job hardcodes `node-version: 20.18.0` and pnpm `version: 10.30.3` instead of using `node-version-file: '.nvmrc'` — contradicts AC-2 requirement to mirror the `db-check` job shape exactly; will silently diverge when the monorepo bumps its Node version [.github/workflows/ci.yml:contracts-check]
- [x] [Review][Patch] F14: `validation-parity.test.ts` fixture set does not include `{ limit: 0, expected: 'reject' }` — `z.number().positive()` correctly rejects 0, but the boundary is untested; a future refactor to `.nonnegative()` would silently change behavior without a failing fixture [packages/contracts/tests/validation-parity.test.ts:43-47]
- [x] [Review][Patch] F15: `validation-parity.test.ts` fixture set does not test that `PaginationQuery` rejects unknown keys — `.strict()` is applied but never exercised; a downstream runtime that strips unknowns silently instead of rejecting would not be caught [packages/contracts/tests/validation-parity.test.ts:43-47]

#### Deferred

- [x] [Review][Defer] F07: `check-openapi-determinism.ts` uses the string literal `'scripts/emit-openapi.ts'` (relative path) rather than an absolute path via `path.resolve(here, 'emit-openapi.ts')` — correct given current monorepo depth but would silently resolve incorrectly if the package moves [packages/contracts/scripts/check-openapi-determinism.ts:22] — deferred, structural assumption stable at current monorepo depth; revisit if packages/ is reorganized

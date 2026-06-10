# `@twt/contracts` — transport-contract source-of-truth

Zod schemas + generated OpenAPI 3.1 spec for every TWT REST surface. Per architecture §1.3 (validation library = Zod) + §3.1 (REST + OpenAPI 3.1 single source of truth via `fastify-zod-openapi` + `@fastify/swagger`) + §3.2 (structured error response + cursor pagination + URL-based major versioning + OpenAPI generator determinism + breaking-change semantic-diff CI) + §Naming patterns line 3700-3729 (branded types + `z.output<>` / `z.input<>` canonical names + generated types single source of truth) + §Format patterns line 3798-3826 (API response envelope + ISO 8601 + `.strict()` default) + §Cross-Cutting line 3957-3960 (contract ownership; no schema redefinition across the contracts ↔ domain boundary) + AR-4 (Zod everywhere) + AR-38 (REST + OpenAPI + Zod-derived single-source-of-truth + `packages/contracts/` single source of truth + `packages/api-client/` generated typed client) + Top-10 anti-pattern #2 (type-shadowing prohibition).

This workspace is **structurally enforced from day one** — handler-side Zod validators in `apps/api/` (Story 1.9+) import from `@twt/contracts/<domain>`; form-handling code in `apps/admin/` / `apps/mobile/` / `apps/public/` validates inputs against the same Zod schemas the server validates against (Stories 3.x / 6.x / 9.x); partner-module integrations consume the generated OpenAPI spec (Epic 12).

## Workspace layout

```
packages/contracts/
├── package.json                    # zod ^3.23.0 + @asteasolutions/zod-to-openapi ^7.3.0 + yaml ^2.6.1 + @twt/domain workspace dep
├── scripts/
│   ├── emit-openapi.ts             # build-time Zod → OpenAPI 3.1 emission
│   └── check-openapi-determinism.ts # CI gate: re-emit + assert byte-identical
├── src/
│   ├── index.ts                    # workspace API barrel + CONTRACTS_API_VERSION + __substrateOnly marker
│   ├── _common/                    # cross-domain transport primitives (Story 1.4)
│   │   ├── errors.ts               # ErrorResponse envelope + defineErrorCode helper
│   │   ├── pagination.ts           # Cursor + PaginationQuery + paginatedResponse factory
│   │   ├── primitives.ts           # Iso8601Datetime + UuidString + RequestId + Email
│   │   ├── version.ts              # ApiMajorVersion = z.literal('v1')
│   │   ├── strict.ts               # assertStrict runtime helper (.strict() discipline)
│   │   ├── health.ts               # toy endpoint contract — drives OpenAPI emission proof
│   │   ├── event-log-contract.ts   # transport wire shape for events_log (Stories 1.10 / 1.11b)
│   │   └── index.ts                # barrel
│   ├── errors/                     # per-domain error-code enumeration (per-domain Stories add files)
│   │   ├── index.ts                # empty barrel
│   │   └── README.md
│   ├── members/                    # Story 3.1+ (member lifecycle)
│   ├── claims/                     # Stories 6.x
│   ├── pools/                      # Stories 7.x
│   ├── alerts/                     # Stories 8.x
│   ├── contributions/              # Stories 9.x
│   ├── modules/                    # Stories 12.x
│   ├── partners/                   # Stories 12.x
│   ├── audit/                      # Stories 1.10 / 1.11a / 1.11b
│   ├── rbac/                       # Story 1.8
│   ├── kyc/                        # Stories 3.3+
│   ├── reconciliation/             # Stories 9.2 / 9.4
│   ├── helpdesk/                   # Stories 10.x
│   ├── feature-flags/              # Stories 10.x
│   ├── pariwar-passport/           # Story 1.7 (FR-63)
│   └── deep-links/                 # Story 1.7+ (URL grammar)
└── tests/
    ├── smoke.test.ts               # PR-1 placeholder (Story 1.1)
    ├── type-assignability.test.ts  # contract-↔-domain assignability (events_log worked example)
    └── validation-parity.test.ts   # cross-surface validation parity harness (Story 1.4 scaffold)
```

Substantive per-domain endpoint contracts land per their per-Epic Story per architecture §1.3 + §Contracts sub-domain rule line 4486-4490 (`packages/contracts/src/<domain>/` exists for externally-consumed API surfaces only).

## OpenAPI emission pipeline

The committed `openapi/v1.yaml` at the repository root is the **generator output** per architecture §Project Structure line 4176-4177. It is byte-identical-deterministic; CI verifies via the `contracts-check` job.

```sh
# Re-emit openapi/v1.yaml from packages/contracts/ Zod schemas
pnpm contracts:emit-openapi

# Verify the committed file matches a fresh re-emission
pnpm contracts:check-openapi-determinism
```

The emission pipeline uses `@asteasolutions/zod-to-openapi` (build-time) at Story 1.4 substrate posture; Story 1.9+ migrates to runtime extraction via `fastify-zod-openapi` + `@fastify/swagger` when `apps/api/` substantively populates routes (deferred-work D14-1.4).

The **OpenAPI breaking-change semantic-diff CI gate** per architecture §3.2 line 1856-1860 is deferred to Story 1.9+ — at Story 1.4 the spec contains only a toy endpoint, so the diff has no substrate (deferred-work D1-1.4). The **generator-determinism CI gate** per architecture §3.2 line 1862-1865 is wired at Story 1.4 via `pnpm turbo run contracts:check-openapi-determinism`.

## Type-assignability + validation-parity test patterns

Per architecture §1.3 line 787-790 ("Type tests in CI. Assertion files in `packages/contracts/` declare that contract types are assignable from inferred Drizzle types") + §4.4 line 2567-2572 ("Cross-surface validation parity test").

**`tests/type-assignability.test.ts`** asserts the contract-↔-domain alignment. The architecture-canonical direction is unidirectional: a Drizzle row (with transport-boundary `Date → Iso8601 string` serialization) MUST be assignable to the contract Zod schema's `z.output<>`. Story 1.4 commits the pattern with `events_log` (Story 1.3 substrate) as the worked example:

```typescript
type EventLogRow = typeof schema.eventsLog.$inferSelect;
type EventLogWireProjection = Omit<EventLogRow, 'occurredAt'> & { occurredAt: string };
type _Assert = EventLogWireProjection extends EventLogContractType ? true : never;
const _assert: _Assert = true;
```

A future Drizzle column change that diverges from a contract type fails at typecheck — surfacing the contract author's intent to either update the contract or revert the Drizzle change.

**`tests/validation-parity.test.ts`** runs a fixture set through every active runtime and asserts accept/reject partitions agree. Story 1.4 commits Zod runtime only; downstream Stories add runtimes:

- Story 1.9 adds `fastify-type-provider-zod` (apps/api substantive routes).
- Stories 3.x / 6.x / 9.x add `@hookform/resolvers/zod` (form handling).
- Story 2.x adds Astro Actions (apps/public).

## ADR-0005 — OpenAPI client-generation tool

`@hey-api/openapi-ts ^v0.50+` is the primary tool that transforms `openapi/v1.yaml` into TypeScript modules consumed by `packages/api-client/`. Orval is the secondary fallback. See [`docs/adr/ADR-0005-openapi-client-generation.md`](../../docs/adr/ADR-0005-openapi-client-generation.md) for the full rationale.

The first substantive `packages/api-client/` generator invocation lands at Story 1.9+ when `apps/api/` substantively populates routes (deferred-work D2-1.4).

## Discipline reminders

### `.strict()` default

Every `z.object({...})` in this workspace MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper offers `assertStrict(schema)` for opt-in defense at module load; the structural ESLint rule lands at Story 1.16a friction-budget CI gate territory (deferred-work D6-1.4).

```typescript
// Correct — strict by default
const MemberCreate = z.object({ name: z.string(), email: Email }).strict();

// Incorrect — passthrough leaks unknown keys to downstream consumers
const MemberCreate = z.object({ name: z.string(), email: Email });
```

`.passthrough()` is permitted only at explicit provider-controlled boundaries (webhook payloads beyond the spec).

### Type-shadowing prohibition (Top-10 anti-pattern #2)

Per architecture §Naming patterns line 3719-3723 + the Top-10 anti-patterns inventory: do **NOT** create hand-written `dto.ts` / `*.types.ts` files in `apps/api/modules/<domain>/` or `apps/admin/modules/<domain>/` that redeclare what this workspace already defines. Consume via the workspace package name (per the cross-workspace import discipline at architecture lines 3779-3781):

```typescript
// Correct — consume the source-of-truth
import { Member, type Member as MemberType } from '@twt/contracts/members';

// Incorrect — hand-written shadow type
// apps/api/modules/members/member.types.ts
// export type Member = { id: string; name: string; ... }; // FORBIDDEN
```

The structural ESLint rule lands at Story 1.16a (deferred-work D5-1.4). Story 1.4 commits the structural posture (`__substrateOnly` marker symbol in `src/index.ts` + per-domain `README.md` reminders).

### Cross-tenant URL grammar

Tenant-scoped endpoint paths use `/api/v1/p/<pariwar_id>/...` per architecture §3.1 line 1798. Cross-Pariwar global endpoints (RBAC catalog, Pariwar-Passport public read, partner integrations, helpline-level audit reads) use `/api/v1/global/<resource>` per line 1799. The grammar is enforced at `apps/api/` route registration (Story 1.9+); contracts authors document the intended scoping in per-domain `README.md` files.

### Branded ID types

Architecture commits branded ID types at `packages/domain/src/ids/` per §Cross-cutting concerns line 4538 — Story 1.7 substrate. Until Story 1.7 lands, `_common/primitives.ts` exposes `UuidString = z.string().uuid()` as the plain UUID wire-shape; downstream consumers (apps/api at Story 1.9+, etc.) don't block on Story 1.7. Once Story 1.7 lands, `_common/primitives.ts` upgrades to re-export `MemberId`, `PariwarId`, `ClaimId`, `PoolId`, etc. from `@twt/domain/ids` (deferred-work D12-1.4).

### Cross-workspace import discipline

Per architecture lines 3779-3781 — use the package name, not relative paths:

```typescript
// Correct
import { ErrorResponse } from '@twt/contracts/_common';

// Incorrect — caught by @twt/eslint-config-twt no-restricted-imports rule
import { ErrorResponse } from '../../../packages/contracts/src/_common/errors';
```

## References

- Architecture §1.3 (validation library), §3.1 (API style), §3.2 (error / pagination / versioning), §4.2 (TanStack Query), §4.4 (form handling + validation parity), §4.11.1 (bundle subsetting), §Naming patterns, §Format patterns, §Cross-Cutting, §Project Structure, §Generated artifacts, §Cross-cutting concerns.
- AR-4 (Zod everywhere) + AR-38 (REST + OpenAPI + Zod-derived single-source-of-truth).
- Top-10 anti-patterns inventory — #2 type-shadowing prohibition + #10 path-alias cross-package imports.
- [ADR-0005-openapi-client-generation](../../docs/adr/ADR-0005-openapi-client-generation.md) — `@hey-api/openapi-ts` primary + Orval secondary.
- Story 1.4 file: `_bmad-output/implementation-artifacts/1-4-packages-contracts-zod-openapi-contract-scaffolding.md`.
- Story 1.4 deferred-work: `_bmad-output/implementation-artifacts/deferred-work.md` § Story 1.4 deferred.
- Story 1.3 `@twt/events` `events_log` Drizzle table — type-assignability test worked example.

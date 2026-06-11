# Story 1.8: RBAC Permission-Keys + Scope-Dimensions + 12 Seeded Roles `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin,
I want a server-enforced RBAC model with permission-keys (`<resource>.<action>`), scope dimensions (the seeded-role-required set — see Dev Note "Scope-enum reconciliation"), and the 12 seeded roles from FR-46,
so that every privileged action in every epic is authorized server-side via a single coherent model.

## Acceptance Criteria

> **AC source map.** AC-1…AC-4 are the epic's two BDD blocks (epics.md L1123–1133), re-expressed with the canonical token/format reconciled against architecture §2.6 (divergences are called out inline and in Dev Notes — do **not** silently follow the epic's looser wording). AC-5…AC-7 are additive precisions required for the primitive to leave the system working end-to-end (per the workflow's "a story must leave the system working" rule), each justified inline.

**AC-1 — Permission-key model (`<resource>.<action>`).**
**Given** FR-44 + AR-26 (server-side enforcement)
**When** the RBAC primitive is authored (location per AC-1a)
**Then** permission keys follow the **`<resource>.<action>`** convention (e.g. `claim.approve`, `member.suspend`, `pariwar.provision`, `audit.export`, `audit.verify`) — this is the canonical form per architecture §2.6 L1479 and **all** grounded examples; it **reconciles** the epic's literal `verb.resource` wording (epics.md L1127), which is backwards relative to every concrete key in the artifacts. See Dev Note "Key-format reconciliation."
**And** keys are enumerated and **versioned** in a single registry; the catalog is **append-only / extensible** (most resources' endpoints land in later epics — the catalog grows per-epic, it is not exhaustive at 1.8). Seed it with the keys grounded in the artifacts (Dev Note "Permission-key seed catalog").

**AC-1a — Authoring location (reconciled).** The primitive is authored in **`packages/domain/src/rbac/`** (cohesive sub-module: `scope.ts`, `permissions.ts`, `roles.ts`, `check.ts`, `index.ts`), exported as `export * as rbac from './rbac/index.js'`. This **reconciles** the epic's `packages/rbac` shorthand (epics.md L1126) against architecture §2.6 L1481/L1483 + §3.13 L2420 (which place permissions/roles/grant-tuple **inside `packages/domain`**) and the established convention that every primitive lands under `packages/domain/src/<subdir>/` (ids, encryption, policies, pariwar-passport, cross-tenant). Do **not** create a new top-level `packages/rbac`. See Dev Note "Package-location reconciliation."

**AC-2 — Scope-dimension enum + `(dimension, value)` grant model.**
**Then** scope dimensions are an enum. The canonical set is the **superset the 12 seeded roles structurally require**: **`global | pariwar | state | district | block | self`** (ordered ceiling, high→low). This **reconciles two individually-incomplete sources** — architecture/FR-45 `block | district | state | pariwar | global` (omits `self`, needed by Field Worker / FR-53 `field_worker_self`) and the epic `national | state | district | pariwar | self` (omits `block`, needed by the Block Admin seeded role; uses `national` where the canonical token is `global`). See Dev Note "Scope-enum reconciliation" — this divergence **must** be ratified in the ADR + decision-log + a correct-course note; do not ship a set that cannot express a seeded role's scope.
**And** a grant is a **`(role, scopeDimension, scopeValue)`** tuple (e.g. `(DistrictAdmin, 'district', 'Patna')`), not a bare dimension — FR-45's worked example (Anita, District Admin scope=Patna, can approve Patna claims but **not** Vaishali; prd.md L754) requires the concrete node value, and enforcement is hierarchical **containment** of the action's target locator within the grant's `(dimension, value)`, not a flat enum compare.

**AC-3 — 12 seeded roles, declarative + editable.**
**Then** the 12 roles per FR-46 (Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator) are defined **declaratively** as named bundles, each = its `permission-key × scope` set (Dev Note "Seed role→permission matrix" gives the recommended v1 matrix).
**And** the seed is **editable** (FR-44: bundles editable by Super Admin) and **re-seedable / idempotent** (the Phase-0 `rbac-seed-reset` runbook depends on a deterministic re-runnable seed).
**And** the seed is treated as **provisional** pending **OQ-3** (Trustee Panel confirms/revises the 12-role set pre-launch; OQ-3 "Blocks: RBAC seed in production"). Do **not** hard-wire the bundles as immutable constants the admin path can never edit.

**AC-4 — Fail-closed enforcement guard.**
**Then** there is a **`requirePermission(key, scope, resourceLocator)`** guard (the epic's named entry point, epics.md L1129) that **fails-closed on any missing match** — absent grant, unknown key, scope mismatch, or unresolved locator all deny. It is backed by a pure, side-effect-free `hasPermission(grants, key, target)` predicate (architecture's `requires(user, permission_key, target)`, §2.6 L1489). The guard is **framework-agnostic** (returns/throws a typed result); the HTTP-middleware adapter that mounts it lands with the HTTP framework at **Story 1.9** (apps/api is a bare skeleton today — Dev Note "apps/api is not ready"). Authorization is the **second guard after RLS** (§2.6 L1492): RLS stops cross-tenant data leak; this stops in-tenant action by an under-privileged user.

**AC-5 — Structured 403 + audit seam (sink deferred to 1.10).**
**Given** a request to a permission-gated endpoint
**When** the requester's role does not carry the required permission-key at the required scope
**Then** the guard yields a **403** in the `ErrorResponse` envelope (the `packages/contracts/_common/errors.ts` shape from Story 1.4), carrying a structured denial `{ actorId, permissionKey, requiredScope, targetLocator }`.
**And** it exposes an **authorization-denied audit seam** (a typed denial value + an injectable sink hook) — the actual FR-47 tamper-evident audit-log **sink is Story 1.10**, NOT built here (epics.md L1133). Do not wire `events_log` or the audit chain; expose the seam abstractly.

**AC-6 — Transport contracts (`packages/contracts/src/rbac/`).**
**Then** `.strict()` Zod contracts land in `packages/contracts/src/rbac/` (the placeholder dir already reserved for Story 1.8 per deferred-work D10-1.4): the permission-key catalog shape, the role-bundle shape, the scope-dimension enum, and the grant-tuple shape. Register **components/schemas** in `scripts/emit-openapi.ts` and re-emit; `check-openapi-determinism` stays byte-stable. Endpoint **paths** are optional (apps/api routes are 1.9+) — registering schemas-only is the safe default (mirror Story 1.7). Honor the `rbac/README.md` discipline (tenant-scoped role admin `/api/v1/p/<pariwar_id>/rbac/...`; global catalog `/api/v1/global/rbac/permissions`; no type-shadowing in apps/api).

**AC-7 — Gate green + provenance.**
**Then** `pnpm turbo run lint typecheck test build` is green; if a grant-assignment table is landed (Task 5 decision), `db:migrate` applies clean and `db:check` is clean. ADR-0008 drafted, decision-log entry added, deferred-work dispositions recorded (per [[feedback_closure_language_precision]]), README landing-lines flipped, and `sprint-status.yaml` `1-8-…` → `review`.

## Tasks / Subtasks

- [x] **Task 0 — Verify baseline + read the files you extend** (AC: all)
  - [x] 0.1 At HEAD, `pnpm install --frozen-lockfile` then `pnpm turbo run lint typecheck test build` — confirm green (Story 1.7 baseline). Capture any anomaly in Completion Notes. (Story 1.7 found a pre-existing lint anomaly at its baseline — do the same check.)
  - [x] 0.2 Bring up local Postgres (Docker `postgres:16-alpine`, host port **5433** per Story 1.6/1.7 Debug Log) and run the existing integration suites with `DATABASE_URL` set, to confirm the live-DB substrate is green before adding to it.
  - [x] 0.3 Read these end-to-end before writing (the patterns you extend, not reinvent): `packages/domain/src/ids/index.ts` (branded-type + smart-constructor + typed-error pattern), `packages/domain/src/errors.ts` (domain error-class pattern), `packages/domain/src/index.ts` (namespace re-export pattern), `packages/domain/src/schema/pariwar_passport.ts` + `events_log.ts` (pgEnum, snake_case-column/camelCase-field, doc density), `packages/domain/src/policies/pariwar-passport-rls.ts` + `events-log-rls.ts` + `_roles.ts` (RLS + `appRole`/`serviceRole`), `packages/domain/src/db.ts` (`setPariwarScope`, `withPariwarScope`, `UUID_REGEX`), `packages/domain/migrations/0002_events-log-rls.sql` + `0003_pariwar-passport.sql` (ENABLE/FORCE RLS + GRANT hand-supplement), `packages/domain/src/test-utils/integration-setup.ts` + `tests/integration/_helpers.ts`, `packages/contracts/src/_common/primitives.ts` + `_common/errors.ts` (ErrorResponse envelope) + `pariwar-passport/*.ts` (the most recent `.strict()` contract precedent), `packages/contracts/scripts/emit-openapi.ts`, `packages/contracts/src/rbac/README.md`.

- [x] **Task 1 — Scope-dimension enum + reconciliation decision** (AC-2)
  - [x] 1.1 Author `packages/domain/src/rbac/scope.ts`: the `ScopeDimension` enum/union **`global | pariwar | state | district | block | self`** with the documented high→low ordering and a header comment that records the reconciliation (architecture/FR-45 omits `self`; epic omits `block` + uses `national`→canonical `global`). Reuse the `pgEnum`/union idiom from `pariwar_passport.ts`'s `locale` enum if you persist it.
  - [x] 1.2 Define the grant model as **`(role, scopeDimension, scopeValue)`** and a `targetLocator` type carrying the action's node (which Pariwar / state / district / block, or `self`/owner). Implement the **hierarchical containment** check `scopeContains(grant, targetLocator)` — a `state='Bihar'` grant contains `district='Patna'` (Patna ∈ Bihar) but not `district='X'` in another state; `global` contains everything; `self` contains only the actor's own records. Containment beyond `pariwar` (the geo tree state→district→block) needs a node-hierarchy resolver — for v1 keep the resolver an **injectable seam** (the canonical org tree lands with member/geo data in Epic 3); implement the dimension-ordering + same-branch checks now and stub the geo-tree lookup behind an interface. Record this seam as a deferral.
  - [x] 1.3 **Decision artifact:** record the scope-enum divergence (it diverges from BOTH source docs) in ADR-0008 + decision-log, and add a short correct-course note flagging that architecture §2.6 L1484 and epics.md L1127 each need a one-line patch to the canonical `global | pariwar | state | district | block | self`. Do not edit architecture.md/epics.md silently — surface for ratification.

- [x] **Task 2 — Permission-key catalog** (AC-1)
  - [x] 2.1 Author `packages/domain/src/rbac/permissions.ts`: a `PermissionKey` branded/validated string type enforcing the **`<resource>.<action>`** shape (lowercase, single dot, `[a-z_]+\.[a-z_]+`), with a smart constructor throwing a typed `InvalidPermissionKeyError` (mirror `InvalidBrandedIdError` in `ids/index.ts`).
  - [x] 2.2 Define the **versioned registry** `PERMISSION_CATALOG` (a `const` map/array carrying a `catalogVersion`), seeded with the grounded keys: `claim.approve`, `member.suspend`, `member.moderate`, `pariwar.amend_rule`, `pariwar.provision`, `niyamavali.amend`, `niyamavali.review`, `audit.export`, `audit.verify`. Document that the catalog is **append-only and grows per-epic** (do NOT invent keys for resources whose endpoints don't exist — under-specify deliberately; downstream stories add their keys). **Do not confuse event names** (`claim.approved`, `member.suspended`, `alert.published`, `niyamavali.amended` — past-tense, `packages/events` territory) with permission keys (imperative verb).
  - [x] 2.3 Re-export from `packages/domain/src/rbac/index.ts`.

- [x] **Task 3 — 12 seeded role bundles (declarative)** (AC-3)
  - [x] 3.1 Author `packages/domain/src/rbac/roles.ts`: the 12 named bundles per FR-46, each declared as `{ role, permissions: PermissionKey[], scopeCeiling: ScopeDimension }` using the recommended v1 matrix in Dev Note "Seed role→permission matrix". Every referenced permission key MUST exist in `PERMISSION_CATALOG` (add a unit test asserting referential integrity — no role references an unknown key).
  - [x] 3.2 Make the seed **editable + idempotent**: expose a `seedRoles()` / `defaultRoleBundles` that the admin path (Story 1.9+) and the `rbac-seed-reset` runbook can re-apply deterministically. Do not freeze the bundles as immutable — FR-44 requires Super-Admin editability; OQ-3 requires Trustee revisability pre-launch.
  - [x] 3.3 Mark the matrix **provisional pending OQ-3** in a header comment + ADR; do not treat the 12 names/permissions as final.

- [x] **Task 4 — Enforcement guard (fail-closed)** (AC-4, AC-5)
  - [x] 4.1 Author `packages/domain/src/rbac/check.ts`: the pure predicate `hasPermission(grants, key, targetLocator): boolean` (resolves the actor's effective grants → matches key → `scopeContains`). **Effective grants = union across the actor's Pariwar memberships, evaluated per active scope; cross-scope role inheritance forbidden by default** (architecture §3.13 L2416–2419). **Fail-closed**: unknown key, no grant, scope mismatch, or unresolved locator → `false`.
  - [x] 4.2 Author the framework-agnostic guard `requirePermission(key, scope, resourceLocator)` (the epic-named entry point) that calls `hasPermission` and, on deny, produces the structured **403** denial `{ actorId, permissionKey, requiredScope, targetLocator }` mapped to the `ErrorResponse` envelope (`@twt/contracts` `_common/errors.ts`). Add `AuthorizationDeniedError` to `packages/domain/src/errors.ts` (mirror the existing typed-error pattern). Keep it HTTP-framework-agnostic — no Express/Hono import; the middleware adapter is Story 1.9.
  - [x] 4.3 Expose the **audit seam**: an injectable `onAuthorizationDenied(denial)` hook (default no-op) so Story 1.10 can wire the FR-47 audit sink without changing this code. Do NOT build the audit log, hash chain, or `events_log` write here (epics.md L1133).

- [x] **Task 5 — Role-grant assignment table (DECISION — recommend land)** (AC-2, AC-7)
  - [x] 5.1 **Decision:** land a `role_grants` schema now vs defer to Story 1.9. **Recommended: land it now** (it is the substrate every downstream privileged endpoint reads, and landing schema-ahead-of-consumers is the established pattern — Story 1.7 landed `pariwar_passport` with no consumers). Record the choice + rationale in Completion Notes either way.
  - [x] 5.2 If landing: author `packages/domain/src/schema/role_grants.ts` — columns `(user_id uuid, pariwar_id PariwarId, role text/enum, scope_dimension enum, scope_value text NULL, created_at, created_by uuid NULL)`. **`user_id` and `created_by` are unconstrained `uuid` — NO FK** (the admin/users table does not exist until Story 1.9+; same precedent as `pariwar_passport.created_by`). The grant tuple is `(user_id, pariwar_id, role)` per architecture §3.13 L2420.
  - [x] 5.3 If landing: author `packages/domain/src/policies/role-grants-rls.ts` — `role_grants` is a **scoped** table (NOT a Passport-style carve-out): SELECT + write both tenant-isolated via the proven `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` closed-failure construct, bound `to: appRole`. Re-export from `policies/index.ts`. Then migration `0004_role-grants.sql`: `db:generate --name role-grants`, hand-supplement `ENABLE`+`FORCE ROW LEVEL SECURITY` + `GRANT SELECT,INSERT,UPDATE,DELETE` to `twt_app` (grants are mutable — DELETE included, unlike the Passport singleton), bump `meta/_journal.json` idx → 4 with trailing newline, `db:migrate`, confirm `db:check` clean.
  - [x] 5.4 If deferring: state it explicitly in Completion Notes + deferred-work (per [[feedback_closure_language_precision]]) and ensure `hasPermission` accepts an injected `grants` array so the table is a drop-in later.

- [x] **Task 6 — Transport contracts + OpenAPI** (AC-6)
  - [x] 6.1 Author `packages/contracts/src/rbac/*.ts` `.strict()` Zod: `PermissionKeySchema` (`<resource>.<action>` regex, brand-aligned with domain), `ScopeDimensionSchema` (enum), `RoleBundleSchema`, `RoleGrantSchema` (grant tuple), `PermissionCatalogSchema`. Reuse `PariwarIdSchema` from `_common/primitives.ts` (Story 1.7) for `pariwar_id`. Every object ends `.strict()`; use `z.output<>`/`z.input<>` naming.
  - [x] 6.2 Register **components/schemas** (not paths — apps/api routes are 1.9+) in `scripts/emit-openapi.ts`, re-emit `openapi/v1.yaml`, confirm `contracts:check-openapi-determinism` byte-stable. Re-export the dir from `packages/contracts/src/index.ts`; add the `@twt/contracts/rbac` subpath export if the package `exports` map needs it (mirror how `pariwar-passport` was wired). Capture the schemas-only-vs-paths choice in Completion Notes.
  - [x] 6.3 Flip `packages/contracts/src/rbac/README.md` landing line → landed; remove its `.gitkeep`.

- [x] **Task 7 — Tests** (AC-1…AC-6)
  - [x] 7.1 Unit (`packages/domain/tests/rbac/*.test.ts`): (a) **fail-closed** matrix — unknown key, no grant, scope mismatch, unresolved locator all → deny; (b) scope-containment — `global` ⊇ all; `state='Bihar'` ⊇ `district='Patna'` but ⊉ a district in another state (the Anita/Patna-vs-Vaishali case, prd.md L754); `self` ⊇ only owner records; (c) role-bundle **referential integrity** — every role's permission keys ∈ catalog; (d) **seed idempotency** — `seedRoles()` re-applied is a no-op/deterministic; (e) `PermissionKey` smart-constructor rejects non-`<resource>.<action>` strings.
  - [x] 7.2 If the grant table landed (Task 5): integration RLS test `packages/domain/tests/integration/rls/role-grants-policy-regression.spec.ts` (reuse `setupLiveDb` + `SET LOCAL ROLE twt_app`, `DATABASE_URL`-gated, skips cleanly when unset) — owning Pariwar reads/writes its grants; cross-Pariwar SELECT returns 0 rows; unset-scope write blocked. **Add `role_grants` to `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` as a scoped (must-return-0) table** — it is NOT a carve-out (contrast Passport). Add a `seedRoleGrant` helper to `_helpers.ts`.
  - [x] 7.3 Contracts (`packages/contracts/tests/rbac.test.ts`): every rbac object is `.strict()` + rejects unknown keys; permission-key regex; OpenAPI determinism re-run.

- [x] **Task 8 — Docs + closeout** (AC-7)
  - [x] 8.1 Draft `docs/adr/ADR-0008-rbac-permission-model.md` (record: `<resource>.<action>` convention + the epic `verb.resource` reconciliation; the reconciled scope enum + ordering + the two-source divergence; `(role, scopeDimension, scopeValue)` grant tuple + containment semantics + geo-tree seam; the v1 role→permission matrix + OQ-3 provisional status; fail-closed enforcement + audit-seam-not-sink boundary; `role_grants` land/defer decision). Add a new `docs/knowledge-transfer/adr-index.md` Section A row `ADR-0008-rbac-permission-model` as `drafted` (grow total row count by 1; follow the ADR-0004 precedent for a brand-new row) and update the header status-summary line.
  - [x] 8.2 `.decision-log.md`: add the Story 1.8 author-commit decision (next sequential id after `2026-06-11-043`). `_bmad-output/implementation-artifacts/deferred-work.md`: mark **D10-1.4 (rbac contracts)** Closed-by-edit for the rbac leg; record new D-items for the geo-tree containment seam, the audit-sink (→1.10), the HTTP-middleware adapter (→1.9), the `role_grants`-FK-to-users (→1.9), and (if deferred) the grant table — each tagged per [[feedback_closure_language_precision]].
  - [x] 8.3 Flip README landing lines: `packages/contracts/src/rbac/README.md`, `packages/domain/README.md` §10 landing-map + dir tree (add `src/rbac/`), `packages/domain/src/policies/README.md` (if `role-grants-rls.ts` landed).
  - [x] 8.4 Run the full gate (AC-7). Update this story's Status → `review`; fill in Dev Agent Record (Agent Model, Debug Log, Completion Notes, File List, Change Log).
  - [x] 8.5 Update `sprint-status.yaml`: `1-8-…` → `review`, refresh `last_updated`.

## Dev Notes

### What Story 1.8 substantively becomes

The **authorization substrate** — the second of the two guards on every privileged action (RLS is the first; Story 1.6 built it). Where Story 1.6/1.7 made `pariwar_id` a *data* boundary, Story 1.8 makes `(permission-key, scope)` an *action* boundary: it decides whether an authenticated, correctly-scoped user may perform a given verb on a given resource. It is a **pure-domain primitive** (catalog + role bundles + scope model + fail-closed check), plus the first `packages/contracts/src/rbac/` transport contracts, plus (recommended) the `role_grants` storage table. It deliberately stops short of the HTTP layer: apps/api has no framework yet (Story 1.9), and the FR-47 audit-log sink is Story 1.10. The hard part is **not** the enumeration — it is (1) getting the scope model right as `(dimension, value)` + hierarchical containment rather than a flat enum, and (2) reconciling three source-doc inconsistencies without silently picking a side.

### Three source-doc reconciliations you MUST surface (not silently resolve)

Per [[feedback_architecture_vs_prd_boundary]] (architecture commits structure; PRD commits policy) and [[feedback_closure_language_precision]], each of these is a genuine divergence — record the resolution in the ADR + decision-log, and (scope enum) raise a one-line correct-course patch against the source docs. Do not edit architecture.md/epics.md silently.

1. **Key-format reconciliation.** Epic says keys follow `verb.resource` (epics.md L1127) and the user story says "verb-on-resource" (L1120). But **every** concrete key in the artifacts is `<resource>.<action>`: `claim.approve`, `member.suspend`, `audit.export`, `pariwar.provision`, `niyamavali.amend`. Architecture §2.6 L1479 states `<resource>.<action>` explicitly. → Canonical: **`<resource>.<action>`**. The epic's literal token-order is an error; the *concept* (a verb acting on a resource) is preserved.

2. **Package-location reconciliation.** Epic says `packages/rbac` (L1126). Architecture §2.6 L1481/L1483 says `packages/domain/permissions/` + `packages/domain/roles/`; §3.13 L2420 puts the grant tuple in `packages/domain/permissions/`. The repo has **no** `packages/rbac`, and every primitive to date lives under `packages/domain/src/<subdir>/`. → Canonical: **`packages/domain/src/rbac/`** (one cohesive sub-module; architecture's two-dir phrasing is satisfied by `permissions.ts` + `roles.ts` files inside it). Architecture + existing convention win on module placement (consistent with the [[feedback_architecture_vs_adr_boundary]] discipline that architecture commits structure).

3. **Scope-enum reconciliation (the load-bearing one).** Two sources, each **structurally incomplete**:
   | Source | Enum | Missing |
   |---|---|---|
   | architecture §2.6 L1484 + FR-45 (prd.md L751) | `block \| district \| state \| pariwar \| global` | no `self` — but Field Worker (FR-46) / FR-53 `field_worker_self` needs it |
   | epic / user story (epics.md L1120, L1127) | `national \| state \| district \| pariwar \| self` | no `block` — but Block Admin (FR-46) needs it; `national` is the non-canonical spelling of `global` |

   A seeded role's scope must be expressible in the enum. Neither source can express all 12. → Canonical: the **union the roles require**: **`global | pariwar | state | district | block | self`**. Token decisions: `national` → **`global`** (matches architecture + FR-45); **keep `block`** (Block Admin); **add `self`** (Field Worker). Ordered ceiling high→low: `global > pariwar > state > district > block`, with `self` as the narrowest (own-records-only). This diverges from BOTH docs, so it needs explicit ratification — flag a correct-course note patching architecture §2.6 L1484 and epics.md L1127.

### Scope is `(dimension, value)` + containment — not a flat enum compare

FR-45's own example (prd.md L754) — *Anita, District Admin, scope=Patna, can approve Patna claims but not Vaishali* — proves a grant must carry the **node value** (`district='Patna'`), and enforcement is **hierarchical containment** of the action's `targetLocator` within `(dimension, value)`. A `state='Bihar'` grant contains every district/block in Bihar; `global` contains everything; `self` contains only the actor's own records. Containment across the geo tree (state→district→block) needs a canonical org hierarchy that **does not exist until Epic 3** (member/geo data). For v1: implement dimension-ordering + same-node/same-branch checks now; put the geo-tree resolver behind an **injectable interface seam** (default: only exact-node + `global`/`self` resolve; deeper containment returns deny until the resolver is supplied). Record the seam as a deferral — do not fake an org tree.

### Cross-Pariwar role composition (architecture §3.13 L2416–2421)

Role grants are scoped to a single Pariwar. A user's **effective role set = the union of grants across their Pariwar memberships, evaluated per active scope**; the active scope (the `/p/<pariwar_id>/` URL path, §2.5 L1451) selects which grants apply; **cross-scope role inheritance is forbidden by default**. The grant tuple is `(user_id, pariwar_id, role)` — *not* `(user_id, role)`. `hasPermission` must therefore filter grants by the active `pariwar_id` before matching the key, so a State-Trustee grant in Pariwar A never authorizes an action in Pariwar B.

### Permission-key seed catalog (grounded — do not invent beyond these)

Seed exactly the keys the artifacts reference, marked extensible:
`claim.approve`, `member.suspend`, `member.moderate`, `pariwar.amend_rule`, `pariwar.provision`, `niyamavali.amend`, `niyamavali.review`, `audit.export`, `audit.verify`.
The catalog is **append-only and grows per-epic** (claims keys at Epic 6, members at Epic 3, pools at Epic 7, audit at 1.10/1.11). Deliberately under-specify — do NOT manufacture keys for resources whose endpoints don't exist; that would create dead/wrong keys downstream code must then reconcile. **Distinguish from event names** (`claim.approved`, `member.suspended`, `alert.published`, `niyamavali.amended` — past-tense, these belong to `packages/events`, NOT the permission catalog).

### Seed role→permission matrix (recommended v1 — provisional pending OQ-3)

A grounded starting point (roles from FR-46; keys from the seed catalog; scope = the role's ceiling). It is intentionally sparse — most permissions don't exist yet. Refine in the ADR; mark provisional (OQ-3 Trustee ratification "Blocks RBAC seed in production").

| Role | Scope ceiling | Seed permissions (from the v1 catalog) |
|---|---|---|
| Super Admin | `global` | all catalog keys (cross-Pariwar; the only `global` role) |
| Pariwar Admin | `pariwar` | `pariwar.amend_rule`, `member.suspend`, `member.moderate`, `claim.approve`, `niyamavali.amend`, `niyamavali.review` |
| State Trustee | `state` | `claim.approve`, `member.suspend`, `niyamavali.review` |
| District Admin | `district` | `claim.approve`, `member.suspend` |
| Block Admin | `block` | `member.suspend` |
| Finance Officer | `pariwar` | (finance keys land Epic 7/9 — seed empty/with `claim.approve` per Trustee) |
| IT Cell | `pariwar` | `pariwar.provision` (provisioning ops; refine vs Super Admin at OQ-3) |
| Media/Comms | `pariwar` | (news/blog keys land Epic 1.x/10 — seed empty) |
| Field Worker | `self` | (dispatch keys land Epic 12; scope `self` = `field_worker_self`, FR-53) |
| Verifier | `district` | `member.moderate` (KYC/verify keys land Epic 3) |
| Auditor | `pariwar` | `audit.export`, `audit.verify` (the cross-cutting read role; FR-47/Story 1.11b gates the verify UI on `audit.verify`) |
| Helpline Operator | `pariwar` | (helpdesk keys land Epic 10 — seed empty) |

> Empty/sparse rows are correct at 1.8 — the catalog is the gating factor, and it grows per-epic. Do not pad rows with invented keys to look complete.

### apps/api is not ready — stop at the primitive (mirror Story 1.7)

`apps/api` is a bare skeleton (`src/index.ts` + smoke test only; no HTTP framework, no deps beyond build tooling). Story 1.7 stopped at the domain/contracts substrate for exactly this reason. Story 1.8 does the same: land the **framework-agnostic** `requirePermission`/`hasPermission` + contracts + (recommended) `role_grants` table. The **HTTP-middleware adapter** that mounts `requirePermission` on real routes, and the **scope-resolution middleware** that sets the active `pariwar_id`, are **Story 1.9** (which brings the framework + admin auth). Building an Express/Hono middleware now would couple this primitive to a framework not yet chosen — defer it (record as a D-item → 1.9).

### Baseline state (built by Stories 1.1–1.7; do not reinvent)

- **`packages/domain`** — `src/ids/index.ts` (branded `PariwarId`/`MemberId`/… + `uuidBrand` smart-constructor factory + `InvalidBrandedIdError`; reuse this exact pattern for `PermissionKey`). `src/errors.ts` (typed domain error classes with `name` field; add `AuthorizationDeniedError` here). `src/index.ts` (namespace re-exports `export * as ids/passport/policies/…` — add `export * as rbac`). `src/schema/` (`pariwar_passport.ts` — pgEnum `locale`, snake_case columns/camelCase fields, `.$type<PariwarId>()`, `created_by uuid` no-FK precedent). `src/policies/` (`_roles.ts` → `appRole`/`serviceRole` both `.existing()`; `events-log-rls.ts` scoped + `pariwar-passport-rls.ts` carve-out — `role_grants` is **scoped** like events_log, NOT a carve-out like Passport). `src/db.ts` (`UUID_REGEX`, `setPariwarScope`, `withPariwarScope`). `src/cross-tenant/run-as-cross-tenant.ts` (escape hatch — RBAC does NOT need it).
- **Migrations:** `0000_init-baseline` … `0003_pariwar-passport`. Forward-only (architecture §1.8). drizzle-kit emits CREATE TABLE/POLICY; ENABLE/FORCE RLS + GRANT + role DDL is **hand-supplemented** (template: `0002`/`0003`). Next migration = `0004_role-grants` (if landed).
- **Test substrate:** `src/test-utils/integration-setup.ts` → `setupLiveDb` per-test BEGIN/ROLLBACK (`TxContext`); `tests/integration/_helpers.ts` (`seedEvent`, `seedPassport`, branded `PARIWAR_A/B/X/Y`, `enterAppScope`, `enterAppRoleNoScope`). Integration tests `tests/integration/**/*.spec.ts`, `pool: 'forks'`, `DATABASE_URL`-gated (turbo `test` task `env:[DATABASE_URL]`), skip cleanly when unset. **CI `twt_dev_app` is superuser + BYPASSRLS** → RLS tests `SET LOCAL ROLE twt_app` to shed it. Local Postgres: Docker `postgres:16-alpine` host port **5433** (5432 may be occupied); CI uses 5432.
- **`packages/contracts`** — `_common/primitives.ts` has `PariwarIdSchema = z.string().uuid().brand<'PariwarId'>()` (Story 1.7); `_common/errors.ts` has the `ErrorResponse` envelope (Story 1.4 — reuse for the 403). `rbac/` is `.gitkeep` + README **reserved for Story 1.8** (per D10-1.4). OpenAPI emitted by `scripts/emit-openapi.ts` (manual registry); `check-openapi-determinism` asserts byte-identical re-emit. `@twt/contracts` depends on `@twt/domain` (`workspace:*`) — contracts→domain imports are legal; domain→contracts is **forbidden** (turbo cycle — Story 1.6 hit it). So the `ErrorResponse` *shape* may be referenced by the domain guard via a local type, not a hard import of `@twt/contracts`.

### Dev guardrails — what makes this go smoothly

- **Extend, don't reinvent.** Copy the `ids/index.ts` branded-type + smart-constructor + typed-error trio for `PermissionKey`. Copy the `events-log-rls.ts` scoped `pgPolicy(...).link()` + `nullif(current_setting('app.pariwar_id', true), '')::uuid` construct verbatim for `role_grants` (it's scoped, not a carve-out). Copy the `0002`/`0003` ENABLE/FORCE/GRANT block for the migration.
- **Fail-closed is the invariant.** Default-deny everywhere: unknown key, no grant, scope mismatch, unresolved locator, missing geo-resolver → deny. The unit-test matrix (Task 7.1a) is the tripwire; every "allow" path must be explicit.
- **The leak test is the tripwire (if grant table lands).** `role_grants` is **scoped** — add it to `cross-pariwar-leak.spec.ts` as a must-return-0 table. Do NOT mistake it for a Passport-style carve-out; cross-Pariwar grant reads are a real leak.
- **Don't invert package layers.** `@twt/domain` must not import `@twt/contracts` or `@twt/events`. The domain guard owns the error class; the contract owns the Zod envelope; alignment by shape, not by hard import.
- **`SET LOCAL` needs a transaction.** Any DB access setting scope must be inside a tx (`withPariwarScope`). The grant-read path is scoped, so it DOES need scope set (unlike the Passport carve-out).
- **Don't gold-plate.** No HTTP middleware, no audit sink, no Redis, no invented permission keys, no fabricated org tree. Build the primitive; seam the rest.

### Project Structure Notes

New files (relative to repo root):
```
packages/domain/src/rbac/
  scope.ts            [NEW] ScopeDimension enum + (dimension,value) + scopeContains + geo-resolver seam
  permissions.ts      [NEW] PermissionKey type + smart constructor + versioned PERMISSION_CATALOG
  roles.ts            [NEW] 12 declarative role bundles + seedRoles() (idempotent)
  check.ts            [NEW] hasPermission (pure) + requirePermission guard + audit seam
  index.ts            [NEW] barrel
packages/domain/src/schema/
  role_grants.ts      [NEW] (Task 5, recommended) (user_id,pariwar_id,role,scope_dimension,scope_value,…) no-FK
packages/domain/src/policies/
  role-grants-rls.ts  [NEW] (Task 5) scoped tenant-isolation (NOT a carve-out)
packages/domain/migrations/
  0004_role-grants.sql + meta/0004_snapshot.json   [NEW] (Task 5, generated + hand-supplemented)
packages/domain/tests/rbac/
  *.test.ts           [NEW] fail-closed matrix, scope containment, referential integrity, seed idempotency
packages/domain/tests/integration/rls/
  role-grants-policy-regression.spec.ts            [NEW] (Task 5)
packages/contracts/src/rbac/
  permissions.ts, roles.ts, scope.ts, index.ts     [NEW] .strict() Zod
docs/adr/ADR-0008-rbac-permission-model.md         [NEW]
```
Modified: `packages/domain/src/index.ts` (`export * as rbac`), `packages/domain/src/errors.ts` (`AuthorizationDeniedError`), `packages/domain/src/schema/index.ts` + `policies/index.ts` (+ READMEs) [if Task 5], `packages/domain/migrations/meta/_journal.json` (idx→4) [if Task 5], `packages/domain/tests/integration/_helpers.ts` (`seedRoleGrant`) + `multi-tenant/cross-pariwar-leak.spec.ts` (role_grants as scoped) [if Task 5], `packages/domain/README.md` (§10 map + dir tree), `packages/contracts/src/index.ts` (re-export rbac) + `package.json` exports (if subpath needed), `packages/contracts/src/rbac/README.md` (→ landed), `packages/contracts/scripts/emit-openapi.ts` (+ `openapi/v1.yaml`), `docs/knowledge-transfer/adr-index.md` (new ADR-0008 row + header), `.decision-log.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `sprint-status.yaml`, this story file.

drizzle-kit discovery: schema glob `./src/schema/*.ts` auto-picks `role_grants.ts`; policy glob `./src/policies/*-rls.ts` auto-picks `role-grants-rls.ts` — no `drizzle.config.ts` change.

### Testing standards summary

Unit tests `packages/domain/tests/rbac/**/*.test.ts` (vitest) — fail-closed matrix, scope containment (incl. the Anita/Patna-vs-Vaishali case), role→catalog referential integrity, seed idempotency, `PermissionKey` regex. Integration (if grant table lands): `tests/integration/rls/**`, `pool: 'forks'`, `setupLiveDb` + `SET LOCAL ROLE twt_app`, `DATABASE_URL`-gated, must skip cleanly when unset; positive AND negative assertions per the policies "Test discipline"; `role_grants` added to the cross-pariwar-leak suite as a **scoped (0-row)** table. Contracts: extend `.strict()` + assignability tests; re-run OpenAPI determinism. Local Postgres Docker `postgres:16-alpine` host port 5433; CI 5432.

### References

- [Source: epics.md#Story-1.8] (L1117–1133); FR-44/45/46 (L98–100); Epic 1 framing + FR/AR list (L968–984, esp. AR-26 L976); story-map row #9 (L526)
- [Source: prd.md] FR-44 (L740–747), FR-45 (L749–755, Anita example L754), FR-46 (L757–759), glossary "Default seeded roles (12)" (L162), OQ-3 (L1499), ASSUMPTION A-2 (L1521)
- [Source: architecture.md §2.6 RBAC enforcement] (L1476–1496 — `<resource>.<action>` L1479, `packages/domain/permissions|roles/` L1481/L1483, scope enum L1484, `requires(...)` L1489, RLS-then-authz L1492, no-silent-escalation L1495); §2.5 multi-Pariwar URL scope (L1451–1474); §3.13 cross-Pariwar role composition + grant tuple `(user_id, pariwar_id, role)` (L2406–2421); §3.13 identity_type extensibility (L2408–2412)
- [Source: deferred-work.md] D10-1.4 (rbac contracts → Story 1.8, L37); D9-1.6 (service-pool credential separation, L692)
- [Source: packages/contracts/src/rbac/README.md] endpoint shapes (`/api/v1/p/<pariwar_id>/rbac/...` tenant; `/api/v1/global/rbac/permissions` global) + `.strict()` + no-shadowing discipline
- [Source: Story 1.7 file] branded-ID + typed-error pattern, RLS scoped-vs-carve-out distinction, migration hand-supplement template, `setupLiveDb`/`_helpers.ts` test substrate, schemas-only OpenAPI registration, ADR/decision-log/deferred-work closeout choreography
- [Source: docs/knowledge-transfer/adr-index.md] next slot = `ADR-0008-rbac-permission-model` (last substantive = ADR-0007, Story 1.7); Phase-0 `rbac-seed-reset` runbook depends on a deterministic re-seedable bundle set

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow, YOLO autonomous run, 2026-06-11.

### Debug Log References

- **Baseline (Task 0.1/0.2):** `pnpm turbo run lint typecheck test build` green (56/56). Live-DB integration suite (Docker `postgres:16-alpine`, host port **5433**, `DATABASE_URL` set, `db:migrate` applied through 0003) green: 81 passed / 1 skipped (the KMS-gated column-transformer integration test). No pre-existing lint anomaly observed at this baseline (the Story 1.6 `integration-setup.ts` fix is already committed).
- **Migration 0004:** `db:generate --name role-grants` emitted `CREATE TYPE scope_dimension` + `CREATE TABLE role_grants` + ENABLE RLS + index + 2 policies and auto-bumped `meta/_journal.json` → idx 4. Hand-supplemented GRANT (SELECT/INSERT/UPDATE/**DELETE**) + FORCE RLS (DO-NOT-REGENERATE header + manual-rollback reference). `db:migrate` applied clean; `db:check` byte-stable ("Everything's fine"); verified `relrowsecurity=t relforcerowsecurity=t` and grants `DELETE,INSERT,SELECT,UPDATE` via psql.
- **Typecheck catch (self-corrected):** the first full-gate run flagged `tests/rbac/roles.test.ts` using `.push` on the `readonly PermissionKey[]` bundle field — which correctly confirmed the bundles are readonly. Rewrote the seed-isolation test to assert fresh-instance (reference-inequality) deep-copy instead of mutation. Re-ran: green.
- **Final gate (Task 8.4):** `pnpm turbo run lint typecheck test build` green (56/56) with `DATABASE_URL` set (live RLS tests executed, not skipped); `db:check` clean; `contracts:check-openapi-determinism` byte-stable (6200 bytes). Domain suite 149 passed / 1 skipped (16 files); contracts 33 passed (5 files); events 31 passed.

### Completion Notes List

**What landed (the authorization substrate — the SECOND guard after RLS):**
- **`packages/domain/src/rbac/`** — `scope.ts` (canonical `SCOPE_DIMENSIONS` + `ScopeDimension` union + `scopeContains` hierarchical containment + injectable `GeoTreeResolver` seam with fail-closed `denyDeeperGeoResolver` default), `permissions.ts` (branded `PermissionKey` + smart constructor + `InvalidPermissionKeyError` + versioned append-only `PERMISSION_CATALOG` seeded with the 9 grounded keys + `isCatalogKey`), `roles.ts` (12 declarative `defaultRoleBundles` + idempotent deep-copy `seedRoles()` + `bundleForRole`), `check.ts` (pure `hasPermission` + epic-named `requirePermission` guard + non-throwing `checkPermission` + `onAuthorizationDenied` audit seam), `index.ts` barrel.
- **`packages/domain/src/errors.ts`** — `AuthorizationDeniedError` (+ `AuthorizationDenial` + `ErrorResponseShape` + `AUTHORIZATION_DENIED_CODE = 'authz.forbidden'` + `toErrorResponse(requestId)`). Domain-local envelope shape — NO `@twt/contracts` import (avoids the turbo cycle; alignment by shape).
- **`role_grants` table (Task 5 — LANDED)** — `schema/role_grants.ts` (surrogate `id` PK, `user_id`/`created_by` no-FK uuid, `pariwar_id` branded, `role` **text not enum**, `scope_dimension` pgEnum derived from `SCOPE_DIMENSIONS`, `scope_value` nullable, `(pariwar_id, user_id)` index), `policies/role-grants-rls.ts` (SCOPED tenant-isolation — NOT a carve-out), migration `0004_role-grants.sql`.
- **`packages/contracts/src/rbac/`** — `scope.ts`/`permissions.ts`/`roles.ts`/`index.ts`, all `.strict()`; registered as 5 OpenAPI `components/schemas` (no paths — apps/api routes are 1.9+); `.gitkeep` removed; README flipped to landed.

**Decisions made autonomously (recorded in ADR-0008 + Decision 2026-06-11-044):**
- **Task 5 — LAND the `role_grants` table now** (recommended). It is the substrate every downstream privileged endpoint reads; landing schema-ahead-of-consumers is the established pattern (Story 1.7 landed `pariwar_passport` with no consumers). `hasPermission` also accepts an injected `grants` array, so consumers are decoupled from the table regardless (Task 5.4's drop-in property is satisfied; the defer-path was not taken).
- **Task 6 — schemas-only OpenAPI registration** (no paths), mirroring Story 1.7. No `@twt/contracts/rbac` subpath export wired (mirror how pariwar-passport was wired — root re-export only).
- **`role` column = `text`, not pgEnum** — the 12-role set is provisional pending OQ-3 + editable (FR-44); referential integrity is enforced at the domain/seed layer (unit test). `scope_dimension` IS a pgEnum (canonical/ratified).
- **DELETE granted on `role_grants`** (unlike the Passport singleton) — grants are mutable/revocable (FR-44).

**Three source-doc reconciliations surfaced (NOT silently resolved):** key-format `verb.resource`→`<resource>.<action>`; package-location `packages/rbac`→`packages/domain/src/rbac/`; scope-enum (load-bearing) — the UNION `global | pariwar | state | district | block | self`. The scope-enum + key-format divergences need a **correct-course one-line patch** against architecture §2.6 L1484 + epics.md L1127 — recorded in ADR-0008, Decision 2026-06-11-044, and the deferred-work correct-course note. Architecture.md/epics.md were NOT edited from within the dev-story (per the architecture-vs-PRD boundary discipline).

**Deferred (Resolved via explicit deferral — see deferred-work.md Story 1.8 section):** geo-tree containment resolver (→ Epic 3); FR-47 audit sink (→ 1.10); HTTP-middleware + scope-resolution adapter (→ 1.9); `role_grants` FK to users (→ 1.9+); `role` pgEnum + DB constraint (post-OQ-3); OQ-3 matrix ratification; ADR-0008 trustee ratification. **Closed by [edit]:** D10-1.4 rbac-contracts leg.

**Acceptance-criteria status:** AC-1 (key model + versioned append-only catalog) ✓; AC-2 (scope enum + `(role, scopeDimension, scopeValue)` + containment) ✓; AC-3 (12 declarative editable re-seedable provisional bundles) ✓; AC-4 (fail-closed `requirePermission`/`hasPermission`, framework-agnostic) ✓; AC-5 (structured 403 + audit seam, sink deferred to 1.10) ✓; AC-6 (`.strict()` contracts + OpenAPI schemas + determinism) ✓; AC-7 (gate green + `db:migrate`/`db:check` clean + ADR/decision-log/deferred-work/READMEs + sprint-status → review) ✓.

### File List

**New — domain RBAC primitive:**
- `packages/domain/src/rbac/scope.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/rbac/check.ts`
- `packages/domain/src/rbac/index.ts`

**New — `role_grants` storage substrate (Task 5):**
- `packages/domain/src/schema/role_grants.ts`
- `packages/domain/src/policies/role-grants-rls.ts`
- `packages/domain/migrations/0004_role-grants.sql`
- `packages/domain/migrations/meta/0004_snapshot.json`

**New — transport contracts (Task 6):**
- `packages/contracts/src/rbac/scope.ts`
- `packages/contracts/src/rbac/permissions.ts`
- `packages/contracts/src/rbac/roles.ts`
- `packages/contracts/src/rbac/index.ts`

**New — tests (Task 7):**
- `packages/domain/tests/rbac/scope.test.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/domain/tests/rbac/check.test.ts`
- `packages/domain/tests/integration/rls/role-grants-policy-regression.spec.ts`
- `packages/contracts/tests/rbac.test.ts`

**New — docs:**
- `docs/adr/ADR-0008-rbac-permission-model.md`

**Modified:**
- `packages/domain/src/index.ts` (`export * as rbac` + authorization error exports)
- `packages/domain/src/errors.ts` (`AuthorizationDeniedError` + denial/envelope types)
- `packages/domain/src/schema/index.ts` (re-export `role_grants`)
- `packages/domain/src/policies/index.ts` (re-export `role-grants-rls`)
- `packages/domain/migrations/meta/_journal.json` (idx → 4)
- `packages/domain/tests/integration/_helpers.ts` (`seedRoleGrant` helper)
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (`role_grants` as a scoped must-return-0 table)
- `packages/domain/README.md` (§1 dir tree + §10 landing map)
- `packages/domain/src/policies/README.md` (Story 1.8 forward pointer)
- `packages/contracts/src/index.ts` (re-export `rbac`)
- `packages/contracts/scripts/emit-openapi.ts` (register 5 rbac component schemas)
- `packages/contracts/src/rbac/README.md` (flipped → landed)
- `openapi/v1.yaml` (re-emitted with rbac components)
- `docs/adr/ADR-0008-rbac-permission-model.md` (new; listed above)
- `docs/knowledge-transfer/adr-index.md` (new Section A ADR-0008 row + status summary 126 → 127)
- `.decision-log.md` (Decision 2026-06-11-044)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 1.8 section + D10-1.4 rbac-leg closure)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (`1-8-…` → review)
- `_bmad-output/implementation-artifacts/1-8-rbac-permission-keys-scope-dimensions-12-seeded-roles.md` (this file — Status, checkboxes, Dev Agent Record)

**Deleted:**
- `packages/contracts/src/rbac/.gitkeep`

### Change Log

| Date | Change |
|---|---|
| 2026-06-11 | Story 1.8 substantive author-commit — RBAC permission model v1: `packages/domain/src/rbac/` primitive (catalog + scope model + 12 role bundles + fail-closed `requirePermission`/`hasPermission` + audit seam), `role_grants` scoped table + RLS migration 0004, `packages/contracts/src/rbac/` `.strict()` contracts + 5 OpenAPI component schemas, ADR-0008 drafted, Decision 2026-06-11-044, deferred-work dispositions, READMEs + adr-index flipped. Full gate green (lint/typecheck/test/build + db:migrate/db:check + OpenAPI determinism). Status → review. |

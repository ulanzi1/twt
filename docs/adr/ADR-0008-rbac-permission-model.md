# ADR-0008: RBAC permission model v1 — `<resource>.<action>` keys, reconciled scope enum, `(role, scope)` grant tuple + containment, 12 seeded roles, fail-closed guard

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.8 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); OQ-3 resolved in-session (see Consequences); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 1.8 lands the **authorization substrate** — the SECOND of the two guards on every privileged action (RLS is the first; Story 1.6 built it). Where Story 1.6/1.7 made `pariwar_id` a *data* boundary, Story 1.8 makes `(permission-key, scope)` an *action* boundary: it decides whether an authenticated, correctly-scoped user may perform a given verb on a given resource.

- **FR-44 / FR-45 / FR-46 + AR-26** commit server-side RBAC: permission keys, scope dimensions, the 12 seeded roles, server-side enforcement.
- **architecture §2.6 (L1476-1496)** commits the *properties*: `<resource>.<action>` keys (L1479), `requires(user, permission_key, target)` (L1489), RLS-then-authz ordering (L1492), no-silent-escalation (L1495).
- **architecture §3.13 (L2406-2421)** commits the grant tuple `(user_id, pariwar_id, role)` + cross-Pariwar composition (effective grants = union across memberships, per active scope; cross-scope inheritance forbidden).

Per [[feedback_architecture_vs_prd_boundary]] (architecture commits structure/state; PRD commits policy/eligibility) and [[feedback_architecture_vs_adr_boundary]] (architecture commits properties; ADRs commit controls), the source docs commit the properties; this ADR records the controls chosen. The decision deadline is Story 1.8 closure (this commit).

**Three source-doc inconsistencies** had to be reconciled — surfaced, not silently resolved, per [[feedback_closure_language_precision]]. The scope-enum one is load-bearing: a seeded role's scope must be expressible in the enum, and *neither* source enum can express all 12 roles.

Risks if mis-decided: (a) a flat scope-enum compare (instead of `(dimension, value)` + containment) cannot express FR-45's own worked example and would silently over- or under-authorize; (b) hard-wiring the 12 bundles as immutable constants violates FR-44 editability + the OQ-3 Trustee-revisability gate; (c) any non-fail-closed path in the guard is a privilege-escalation hole; (d) shipping a scope set that cannot express a seeded role's scope is a latent correctness bug.

## Decision

Author the RBAC primitive in **`packages/domain/src/rbac/`** (`scope.ts`, `permissions.ts`, `roles.ts`, `check.ts`, `index.ts`), the transport contracts in **`packages/contracts/src/rbac/`**, and land the **`role_grants`** storage table + scoped RLS. Load-bearing details:

1. **Key format = `<resource>.<action>` (KEY-FORMAT reconciliation).** Permission keys are lowercase `<resource>.<action>` (`claim.approve`, `member.suspend`, `pariwar.provision`, `audit.export`, `audit.verify`) — the canonical form per architecture §2.6 L1479 and **every** concrete key in the artifacts. This **reconciles** the epic's literal `verb.resource` wording (epics.md L1127), whose token-order is backwards relative to all grounded examples; the *concept* (a verb acting on a resource) is preserved. A branded `PermissionKey` + smart constructor (`PERMISSION_KEY_REGEX = /^[a-z_]+\.[a-z_]+$/`) enforce the shape; keys are distinct from past-tense **event names** (`claim.approved`, … — `packages/events` territory). → **correct-course note** flags epics.md L1127 for a one-line patch.

2. **Package location = `packages/domain/src/rbac/` (PACKAGE-LOCATION reconciliation).** One cohesive sub-module. This **reconciles** the epic's `packages/rbac` shorthand (epics.md L1126, which does not exist) against architecture §2.6 L1481/L1483 + §3.13 L2420 (which place permissions/roles/grant-tuple **inside `packages/domain`**) and the established convention that every prior primitive lives under `packages/domain/src/<subdir>/`. The architecture's two-dir phrasing (`permissions/` + `roles/`) is satisfied by `permissions.ts` + `roles.ts` files inside `rbac/`. No top-level `packages/rbac` is created.

3. **Scope enum = `global | pariwar | state | district | block | self` (SCOPE-ENUM reconciliation — the load-bearing one).** The canonical set is the **UNION the 12 seeded roles structurally require**, ordered ceiling high→low (`global > pariwar > state > district > block`, with `self` narrowest). It **reconciles two individually-incomplete sources**:

   | Source | Enum | Missing |
   |---|---|---|
   | architecture §2.6 L1484 + FR-45 (prd L751) | `block \| district \| state \| pariwar \| global` | no `self` (Field Worker / FR-53 `field_worker_self`) |
   | epic / user story (epics.md L1120, L1127) | `national \| state \| district \| pariwar \| self` | no `block` (Block Admin); `national` ≠ canonical `global` |

   Token decisions: `national` → **`global`**; **keep `block`** (Block Admin); **add `self`** (Field Worker). This diverges from BOTH docs, so it needs explicit ratification → **correct-course note** patching architecture §2.6 L1484 + epics.md L1127. The enum is committed both as the domain `ScopeDimension` union and the `scope_dimension` pgEnum, derived from one canonical `SCOPE_DIMENSIONS` tuple so they cannot drift.

4. **Scope is `(dimension, value)` + hierarchical CONTAINMENT — not a flat enum compare.** A grant carries the concrete node value (`(DistrictAdmin, 'district', 'Patna')`); enforcement is containment of the action's `targetLocator` within `(dimension, value)`. FR-45's worked example (Anita, District Admin scope=Patna, can approve Patna claims but NOT Vaishali; prd.md L754) requires this. `scopeContains(grant, target, resolver)`: `global` ⊇ everything; an exact same-dimension node matches on value (the Anita case is pure exact-match — no geo tree needed); a `pariwar` ceiling ⊇ every in-tenant geo/self target; `self` ⊇ only the matching-owner self target; a strictly-narrower geo target (state→district) defers to an **injectable geo-tree resolver**. The canonical org tree lands with member/geo data in **Epic 3**, so the **default resolver denies deeper containment** (fail-closed) until one is supplied — a recorded deferral (geo-tree containment seam → Epic 3), not a faked org tree.

5. **Cross-Pariwar composition (architecture §3.13 L2416-2421).** The grant tuple is `(user_id, pariwar_id, role)` — *not* `(user_id, role)`. A user's effective role set = the union of grants across their Pariwar memberships, evaluated per active scope; the active `pariwarId` (the `/p/<pariwar_id>/` path) selects which grants apply; **cross-scope inheritance is forbidden by default**. `hasPermission` filters grants by the active `pariwarId` before matching the key, so a State-Trustee grant in Pariwar A never authorizes an action in Pariwar B. The sole exception is a `global`-scoped grant (Super Admin, the only global role), which applies cross-Pariwar by design.

6. **12 seeded role bundles — declarative, editable, idempotent, PROVISIONAL pending OQ-3.** Each role (FR-46) = `{ role, permissions: PermissionKey[], scopeCeiling }` (`defaultRoleBundles`), exposed as data via `seedRoles()` (a deterministic deep-copy, re-runnable by the admin path at Story 1.9+ and the `rbac-seed-reset` runbook). NOT frozen behind a gate the admin path can never edit (FR-44 Super-Admin editability; OQ-3 Trustee revisability "Blocks: RBAC seed in production"). The v1 matrix is intentionally **sparse** — most permissions don't exist yet (the catalog grows per-epic); empty rows (Finance Officer, Media/Comms, Field Worker, Helpline Operator) are correct, not gaps. Referential integrity (every bundle key ∈ `PERMISSION_CATALOG`) is asserted by a unit test. The catalog is **versioned + append-only**, seeded with the 9 grounded keys only (no invented keys for endpoints that don't exist).

7. **`role` column = `text`, NOT a pgEnum.** The `role_grants.role` column is plain `text`. The 12-role *set* is provisional pending OQ-3 and editable (FR-44), so a `text` column lets the set change without an enum migration; referential integrity to the declared bundles is enforced at the seed/domain layer, not the DB. (Contrast `scope_dimension`, which IS a pgEnum — canonical and ratified here, so an enum is safe.)

8. **Fail-closed enforcement guard + audit-seam (not sink).** `hasPermission(grants, key, target)` is a pure, side-effect-free predicate; `requirePermission(...)` is the epic-named guard that throws a typed `AuthorizationDeniedError` on deny. Default-deny on EVERY uncertain path: unknown/malformed key (not in `PERMISSION_CATALOG`), no grant, unknown role, role-lacks-key, cross-Pariwar scope, exact-node mismatch, unresolved locator, missing geo-resolver. On deny the guard yields a **403** carrying `{ actorId, permissionKey, requiredScope, targetLocator }` mapped to the `ErrorResponse` envelope (referenced by domain-local SHAPE, not a hard `@twt/contracts` import — domain must not import contracts), and fires an **injectable `onAuthorizationDenied` audit seam** (default no-op). The **FR-47 audit-log sink is Story 1.10**, NOT built here — only the seam is exposed. The guard is **framework-agnostic** (no Express/Hono import); the HTTP-middleware adapter + scope-resolution middleware land at **Story 1.9** (apps/api has no framework yet).

9. **`role_grants` table landed now (land-vs-defer decision: LAND).** `packages/domain/src/schema/role_grants.ts` — `(id uuid PK, user_id uuid, pariwar_id PariwarId, role text, scope_dimension scope_dimension, scope_value text NULL, created_at, created_by uuid NULL)`, `user_id` + `created_by` unconstrained `uuid` (NO FK — the admin/users table lands Story 1.9+; same precedent as `pariwar_passport.created_by`). It is the substrate every downstream privileged endpoint reads, and landing schema-ahead-of-consumers is the established pattern (Story 1.7 landed `pariwar_passport` with no consumers). A **SCOPED** table (NOT a Passport-style carve-out): `policies/role-grants-rls.ts` keys SELECT + write on `pariwar_id` via Story 1.6's `nullif(current_setting('app.pariwar_id', true), '')::uuid` closed-failure construct. Migration `0004_role-grants.sql` `ENABLE` + `FORCE ROW LEVEL SECURITY`; grants `twt_app` **SELECT, INSERT, UPDATE, DELETE** — DELETE **included** (grants are mutable/revocable, FR-44), unlike the Passport singleton which withholds it. Cross-Pariwar grant reads are a real leak, so `role_grants` is added to the adversarial `cross-pariwar-leak.spec.ts` as a **must-return-0** table.

## Alternatives considered

- **Flat scope-enum compare (rank-only, no node value).** Rejected: cannot express FR-45's own example (district=Patna must reject Vaishali). The `(dimension, value)` + containment model is the minimum that satisfies the worked example.
- **`role` as a pgEnum of the 12 names.** Rejected for v1: the set is provisional pending OQ-3 and editable (FR-44); an enum would force a migration on every Trustee revision. Chose `text` + domain-layer referential integrity. Revisit if the set freezes post-OQ-3.
- **Fabricate a v1 geo/org tree for deep containment.** Rejected: the canonical org tree is member/geo data that lands in Epic 3. Chose an injectable resolver seam with a fail-closed default (deny-deeper). "Don't fake an org tree."
- **Build the HTTP middleware adapter now.** Deferred to Story 1.9: apps/api has no framework chosen yet; building Express/Hono middleware now would couple this primitive to a framework not yet selected (mirror Story 1.7 stopping at the substrate).
- **Wire the FR-47 audit sink here.** Rejected (epics.md L1133): only the seam is exposed; the tamper-evident audit log + hash chain is Story 1.10.
- **Create `packages/rbac` (the epic's shorthand).** Rejected: architecture + every prior primitive place this under `packages/domain/src/<subdir>/`.
- **Defer the `role_grants` table to Story 1.9.** Rejected (chose LAND): it is the substrate downstream endpoints read; landing schema-ahead-of-consumers is the established pattern. `hasPermission` still accepts an injected `grants` array, so consumers are decoupled from the table either way.
- **Hard-import the contracts `ErrorResponse` into the domain guard.** Rejected: `@twt/domain` must not import `@twt/contracts` (turbo cycle). Alignment by domain-local SHAPE; the HTTP adapter maps to the real envelope at Story 1.9.

## Consequences

- **Operational** — Migration `0004` is forward-only and hand-supplemented (GRANT/FORCE) like `0002`/`0003`; `DO NOT REGENERATE`. The manual inverse is documented in the migration header for operator reference (the forward-only project still benefits from a recorded rollback path). `db:check` stays clean; the snapshot records only the table-shape view.
- **Security** — Fail-closed is the invariant; the unit-test matrix is the tripwire. `role_grants` is a scoped table asserted at 0 rows cross-tenant by the adversarial leak suite (a wrong assertion would either green-light a leak or red-fail a legitimate read). DELETE is privilege-granted because grants are revocable.
- **Provisional status — OQ-3 RESOLVED 2026-06-21.** The 12-role matrix was provisional pending **OQ-3** (Trustee confirm/revise pre-launch, "Blocks RBAC seed in production"). The Trustee Panel resolved OQ-3 at the 2026-06-21 session (Decision 2026-06-21-059 amendment B): the 12-role catalogue is **approved**; the seed permission matrix is **approved subject to implementation of the trustee-approved amendments** (a gated pre-production-seed follow-up, NOT yet implemented); future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are ratified when their feature sets ship. The bundles remain data, editable by Super Admin (FR-44); the set may still evolve under that approval, so the `text`-column choice (Decision #7) stands.
- **Deferred seams** — geo-tree containment resolver (→ Epic 3); FR-47 audit sink (→ Story 1.10); HTTP-middleware + scope-resolution adapter (→ Story 1.9); `role_grants` FK to the users table (→ Story 1.9+).
- **Cost / performance** — Pure-domain check (no I/O). The `role_grants` read path is a single indexed lookup (`(pariwar_id, user_id)`); no new infra.
- **Migration / pivot path** — A real geo resolver drops into `scopeContains` behind the existing interface; the audit sink drops into `onAuthorizationDenied`; a FK on `user_id`/`created_by` is added retroactively once the users table lands; `role` can flip to a pgEnum if the role set freezes post-OQ-3.

## References

- [Source: epics.md, Story 1.8 (L1117-1133)] — owning Story; FR-44/45/46 (L98-100); AR-26 (L976)
- [Source: prd.md] — FR-44 (L740-747), FR-45 (L749-755, Anita example L754), FR-46 (L757-759), OQ-3 (L1499), ASSUMPTION A-2 (L1521)
- [Source: architecture.md §2.6 (L1476-1496)] — `<resource>.<action>` L1479, package placement L1481/L1483, scope enum L1484, `requires(...)` L1489, RLS-then-authz L1492, no-silent-escalation L1495
- [Source: architecture.md §2.5 (L1451-1474)] — multi-Pariwar URL scope; §3.13 (L2406-2421) — cross-Pariwar composition + grant tuple `(user_id, pariwar_id, role)`
- [Source: `.decision-log.md`, Decision 2026-06-11-044] — Story 1.8 substantive author-commit
- [Source: `docs/knowledge-transfer/adr-index.md`] — Section A live index row for this ADR
- [Source: deferred-work.md] — D10-1.4 (rbac contracts leg, Closed-by-edit) + new Story 1.8 D-items (geo-tree seam, audit sink, HTTP adapter, role_grants FK)
- Memory: [[feedback_architecture_vs_adr_boundary]], [[feedback_architecture_vs_prd_boundary]], [[feedback_closure_language_precision]] — discipline anchors

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session (trustee judgment; continuation of the ADR-0010 session). **OQ-3 resolved** (Decision 2026-06-21-059 amendment B): 12-role catalogue approved; seed matrix approved subject to trustee-approved amendments; future-role permissions ratified per feature-set ship. `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-11 | (initial draft) | Solo Builder (BigDev) | Authored at Story 1.8 closure (RBAC permission model v1); paired with Decision 2026-06-11-044 |

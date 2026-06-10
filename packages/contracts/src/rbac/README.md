# `packages/contracts/src/rbac/`

Transport-layer contracts for **RBAC** — permission keys, role bundles, scope dimensions (per-Pariwar / global / per-module), 12 seeded roles per FR-44 / FR-45 / FR-46.

## Landing Story

Substantive contracts authored at **Story 1.8** — RBAC permission keys + scope dimensions + 12 seeded roles per epics Epic 1. The seed-roles enumeration + permission-key namespace lands here; consumers at `apps/admin/` (role-management UI) + `apps/api/` (route-level RBAC middleware) import.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** RBAC endpoints are tenant-scoped for per-Pariwar role admin: `/api/v1/p/<pariwar_id>/rbac/...`. The seeded permission-key catalog itself is global metadata: `/api/v1/global/rbac/permissions`.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/rbac/rbac.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/rbac'`.

// Barrel for the RBAC authorization primitive — Story 1.8 substrate.
//
// The SECOND guard on every privileged action (RLS is the first, Story 1.6).
// Consumed via the top-level `rbac.*` namespace re-export in
// packages/domain/src/index.ts (`export * as rbac from './rbac/index.js'`). One
// cohesive sub-module per architecture §2.6 — `permissions.ts` + `roles.ts` satisfy
// the architecture's two-dir phrasing (`packages/domain/permissions|roles/`) as
// files inside one `src/rbac/` directory; `packages/rbac` (the epic's shorthand,
// epics.md L1126) is NOT created. See ADR-0008 "Package-location reconciliation".
//
//   scope.ts       — ScopeDimension enum + (dimension,value) + scopeContains + geo seam
//   permissions.ts — PermissionKey type + smart constructor + versioned catalog
//   roles.ts       — the declarative role bundles + idempotent seedRoles()
//   check.ts       — hasPermission (pure) + requirePermission guard + audit seam

export * from './scope.js';
export * from './permissions.js';
export * from './roles.js';
export * from './check.js';

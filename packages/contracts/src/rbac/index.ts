// packages/contracts/src/rbac/index.ts
//
// Barrel for the RBAC transport contracts (Story 1.8, AC-6). Re-exported from the
// package root (packages/contracts/src/index.ts) so consumers import from
// `@twt/contracts`. A `@twt/contracts/rbac` subpath export is NOT wired (no
// apps/api consumer until Story 1.9+; mirrors how pariwar-passport was wired) —
// adding an `exports` map entry then is trivial.
//
// Endpoint discipline (rbac/README.md): tenant-scoped role admin at
// `/api/v1/p/<pariwar_id>/rbac/...`; the global permission-key catalog at
// `/api/v1/global/rbac/permissions`; no type-shadowing in apps/api (consume these
// shapes, do not redeclare). Paths land with apps/api routes at Story 1.9+; this
// story registers components/schemas only.

export * from './scope.js';
export * from './permissions.js';
export * from './roles.js';

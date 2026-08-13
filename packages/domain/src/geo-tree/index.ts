// Barrel for the geo-tree module — Story 1.18.
//
// Re-exported from @twt/domain as the `geoTree` namespace (see ../index.ts) so consumers call
// `geoTree.loadGeoTree(...)` / `geoTree.createGeoTreeResolver(...)` / `geoTree.createGeoTreeVersion(...)`.
// Mirrors the `helpdesk/` module shape, which is where the versioned-registry posture comes from.
//
// ── ⛔ WHY THIS LIVES OUTSIDE `rbac/` ────────────────────────────────────────────────────────────
// `packages/domain/src/rbac` is a `governance_boundary.yaml` PROHIBITED ROOT (prohibition (d): a
// flag-conditioned permission check is a privilege escalation with a config-shaped switch on it).
// Keeping the DB-reading loader out of `rbac/` preserves that root's cleanliness — `rbac/` defines
// the catalog and the pure predicate and reads nothing.
//
// The PURE resolver factory could have lived in `rbac/` (it reads nothing), but is kept here with
// its loader so the module is one readable unit and so `rbac/` gains no dependency on a schema
// table. ⭐ `packages/domain/src/geo-tree` is ITSELF admitted to `governance_boundary.yaml`'s
// prohibited list under the same prohibition (d) — a resolver that a feature flag could weaken is a
// privilege escalation with a config-shaped switch on it, and the resolver's answers ARE
// authorization decisions. The admission is deliberate and recorded, because a passing scan over an
// UNLISTED root proves the root is unlisted, not that the behaviour is admissible (the gate's own
// README, `:169-174`).
//
// ── The split that matters ──────────────────────────────────────────────────────────────────────
//   `resolver.ts`  PURE + SYNCHRONOUS. No DB, no clock, no I/O. `hasPermission` depends on this.
//   `registry.ts`  The ONLY DB-touching file. Runs once per request, never per permission check.
//   `document.ts`  PURE write-time validation.
//   `errors.ts`    Typed errors; the 409 seam.

// The pure resolver + the in-memory tree it closes over (AC1, AC2). Import `createGeoTreeResolver`
// wherever a `GeoTreeResolver` is injected; import nothing from `registry.ts` into a predicate.
export * from './resolver.js';
// Write-time document validation (cycles, rank inversions, dangling parents, duplicates).
// ⛔ Structural only — it cannot reject a factually wrong edge. See the module header.
export * from './document.js';
// The versioned per-Pariwar registry: the per-request loader, the in-force resolve, publish/amend.
// ⭐ NO code default — `loadGeoTree` returns `null` for a Pariwar with no published tree.
export * from './registry.js';
// The typed domain errors (document-invalid / version-conflict / effective-at-out-of-order).
export * from './errors.js';

// Barrel for the member-geo module — Story 1.19.
//
// Re-exported from @twt/domain as the `memberGeo` namespace (see ../index.ts) so consumers call
// `memberGeo.resolveMemberGeoNode(...)` / `memberGeo.districtsBeneathState(...)`.
//
// ── ⛔ WHY THIS ROOT IS **NOT** ON `governance_boundary.yaml`'s PROHIBITED LIST ─────────────────
// `packages/domain/src/geo-tree` IS listed (prohibition (d) — *"the resolver's answers ARE
// authorization decisions"*), and `packages/domain/src/rbac` is listed too. This module is
// DELIBERATELY NOT admitted, and the non-admission is RECORDED rather than left to a passing scan
// (Decision `2026-08-13-103`, D1):
//
//   A member-attribution read is **not an authorization decision today**. It answers *"which
//   audience is this member in"*, which no permission check consults. Folding it under a
//   prohibition it does not earn would make the prohibition MEAN LESS, not more.
//
// ⚠ *A green scan over an UNLISTED root proves the root is unlisted, not that the behaviour is
// admissible* — the gate's own README (`:169-174`), and the exact lesson Story 1.18's AC7 paid for.
// Which is why the answer is written down in BOTH directions.
//
// ── ⭐ THE RE-TRIGGER — STANDING, AND MECHANIZED ELSEWHERE ──────────────────────────────────────
// **The first authorization or routing consumer of `resolveMemberGeoNode` requires reassessment.**
// At that moment a flag that could weaken this read becomes a config-shaped privilege switch, and
// this root must be admitted. The two named triggers are recorded in their OWN `epics.md` sections,
// because a marker pointing at a story whose text never mentions the obligation is how an inherited
// deferral goes unnoticed:
//   · **Story 6.17** — the block-dimension ground-inspection gate, but ⛔ ONLY on its AC1
//     derive-via-1.19 arm (its AC1 offers a genuine either/or).
//   · **Story 10.4** — `helpdesk_tickets.member_scope_context` geo enrichment.

// The primitive, its pure half, and the audience-selection district-set read.
export * from './resolve.js';
// The typed-absence contract (a LEAF module — see its header on the import-cycle trap).
export * from './types.js';

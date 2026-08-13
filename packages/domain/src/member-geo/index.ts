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
// this root must be admitted. The named triggers are recorded in their OWN `epics.md` sections,
// because a marker pointing at a story whose text never mentions the obligation is how an inherited
// deferral goes unnoticed:
//   · ✅ **Story 6.17 — EVALUATED 2026-08-13; DID NOT FIRE. Discharged, not pending.** ⛔ The bullet
//     is kept rather than deleted: a deleted trigger is indistinguishable from a forgotten one.
//     6.17's AC1 offered a genuine either/or, and it resolved to the COLUMN arm (Decision
//     `2026-08-13-104`, D1) — `claim_ground_inspections` gained a `block text` supplied at schedule
//     time. The derive-via-1.19 arm was closed on evidence, not preference: `liftDistrictThroughTree`
//     types `block` PERMANENTLY absent (`no-member-attribute` — ancestry walks UP, block sits BELOW
//     district), no member block attribute exists at any layer, and even if one did it would be the
//     WRONG VALUE, because an inspection's jurisdiction is the SITE's and not the member's. ⇒ the
//     story creates NO authorization consumer of `resolveMemberGeoNode`, the obligation does not
//     bind, and this root stays off the prohibited list. ⛔ Note what a green `governance-boundary`
//     run proved about that: nothing. The root is unlisted, so the scan was always going to pass —
//     which is exactly why the non-firing is written HERE and in the decision log instead.
//   · ⭐ **Story 10.4** — `helpdesk_tickets.member_scope_context` geo enrichment. **THE SOLE
//     STANDING TRIGGER.** ⛔ Do not read the discharge above as discharging this one.

// The primitive, its pure half, and the audience-selection district-set read.
export * from './resolve.js';
// The typed-absence contract (a LEAF module — see its header on the import-cycle trap).
export * from './types.js';

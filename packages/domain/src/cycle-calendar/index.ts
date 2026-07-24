// Barrel for the calendar-aware close-of-cycle substrate — Story 8.9.
// Re-exported from @twt/domain as the `cycleCalendar` namespace (see ../index.ts), so consumers call
// `cycleCalendar.reconciliationTailDeadline(...)`. Mirrors the `closeOfCycle` namespace re-export.
//
// ── Why this namespace is NOT under pool/ (AC6, gate hygiene) ───────────────────────────────────────
// The pool SUPPORT-CATEGORY invariant gate walks `packages/domain/src/pool` recursively
// (scripts/pool-support-category-invariant/check.ts, SCAN_DIRS). A calendar module placed there would
// be scanned by a gate whose subject — hardcoded support-category branches — it has nothing to do with:
// a false-scan, not coverage ([[feedback_gate_scope_semantic_coverage]]). Placement here keeps each
// gate's scope semantically honest. (The pool STATE-invariant gate scans all of packages/domain/src
// regardless of directory; it is a non-issue here because this namespace never writes
// `pools.current_state` — placement has nothing to do with that one.)
//
// ── The seam split ──────────────────────────────────────────────────────────────────────────────────
// This ships the TAIL SUBSTRATE, not a live consumer: Epic 9's matcher-tail scheduler and Epic 11b
// Story 11b.3's Sahyog Vivran auto-publish gate are the first callers. The cross-package contract shape
// they receive lives in `@twt/contracts` (alerts/reconciliation-tail.ts) — the resolver stays here
// because contracts must never import anything pg-touching ([[project_contracts_domain_bundle_boundary]]).

export * from './holiday-resolver.js';
export * from './read.js';
export * from './seed.js';

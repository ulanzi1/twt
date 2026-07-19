// Barrel for the close-of-cycle template-driven framing policy — Story 7.8.
// Re-exported from @twt/domain as the `closeOfCycle` namespace (see ../index.ts) so
// consumers call `closeOfCycle.selectCloseOfCycleFraming(...)` /
// `closeOfCycle.classifyCycleOutcome(...)`. Mirrors the `toneReview` namespace re-export.
//
// A PURE governance primitive (no DB/HTTP/clock): the outcome→template DECISION seam Epic 8
// (Panchayat Noticeboard) / Epic 11b (Sahyog Vivran, FR-77) / Story 8.9 render from. It ships
// the decision, NOT the surfaces — the templates live in @twt/i18n's `close-of-cycle`
// namespace; the two-layer tone enforcement lives in the `microcopy` gate + tone-review.

export * from './framing.js';

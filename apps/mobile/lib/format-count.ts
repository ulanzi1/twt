// The Latin-numeral count formatter (Story 0.14 → relocated here by Story 11a.5, Task 3 / Trap 6).
//
// ⭐ THIS IS THE LATIN-NUMERAL DISCIPLINE, not a convenience wrapper. `ux-design-specification.md:1161`
// (v4 amendment): standalone counts and dates render in LATIN numerals with Indian digit grouping —
// operational AND celebration framing alike. Hindi numerals are reserved EXCLUSIVELY for memorial
// Devanagari prose on Shradhanjali.
//
// It moved out of `components/panchayat/sample-data.ts` when that mixed module was deleted (its fixtures
// published five invented deceased-member names — Decision 2026-08-22-152, D3(a)). The FIXTURES went; this
// BEHAVIOUR did not, and it deliberately stayed in the RENDER layer rather than moving into `@twt/ui`:
// the presenter emits raw numbers and formatting happens at the display boundary (the `pool-progress`
// "NO numeral formatting … the render layer applies `formatInr`" rule).
//
// ⚠ It currently has no call site. That is the honest consequence of D3(a): the two sections that counted
// things — the operational stat line and the recent-closings list — have NO PRODUCER (no aggregate
// member/district read model and no close-of-cycle (FR-19) read model exist, and no story owns either), so
// they render nothing. This helper is kept, tested and routed so the producer story inherits the
// discipline instead of re-deriving it.

/** Format a count in Latin numerals with Indian digit grouping (`51204` → `51,204`). */
export function formatCount(n: number): string {
  return n.toLocaleString('en-IN')
}

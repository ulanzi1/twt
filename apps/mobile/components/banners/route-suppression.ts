// `<BannerHost>`'s FIFTH self-suppression condition — Story 11a.5 (Task 3; Decision 2026-08-22-152 D7(a)).
//
// ⚠ THIS IS THE ONE STORY-10.9-OWNED BEHAVIOUR STORY 11a.5 ADDS, and it is exactly one condition.
//
// ── The bug it fixes (Trap 3b) ──────────────────────────────────────────────────────────────────────
// `<BannerHost>` mounts in `app/(tabs)/_layout.tsx` — ABOVE EVERY authenticated tab, the panchayat tab
// included — and renders the single server-resolved winning banner. The Panchayat Noticeboard consumes
// that SAME winner as a notice row (D1(a)). So on the panchayat tab a member would see ONE BANNER, TWICE,
// ON ONE SCREEN: once as ambient chrome at the top, once as a noticeboard row. Neither instance is wrong
// on its own; the PAIR is, on a surface whose whole design premise is quietness.
//
// ── Why the suppression lives HERE and not in the presenter ─────────────────────────────────────────
// `<BannerHost>` already owns four self-suppression conditions (no session / loading / error / nothing
// visible), so this is a fifth in the component that already owns the question. The presenter cannot own
// it: by construction (Trap 1) it cannot know what another component is rendering.
//
// ⚠ Accepted cost: `<BannerHost>` gains ROUTE AWARENESS — a real, small coupling, taken deliberately.
//
// ⛔ NOTHING ELSE in `<BannerHost>` moves — not `SEVERITY_TOKENS`, not the dismiss path, not the query,
// not the `banner-strip` testID, not the mount point.
//
// ⚠ The regression net must assert BOTH halves — suppressed on panchayat AND STILL PRESENT on every other
// tab. The second half is what catches an over-firing suppression.

/**
 * The route segment of the surface that renders the banner itself. `app/(tabs)/panchayat.tsx` → the
 * `useSegments()` tuple `['(tabs)', 'panchayat']`.
 */
export const NOTICEBOARD_ROUTE_SEGMENT = 'panchayat'

/**
 * Does the currently-focused route render the banner itself? Matches the LAST segment exactly, so a
 * nested route pushed from the noticeboard (which does not render the strip) still gets the ambient
 * banner, and no unrelated route whose path merely contains the word is suppressed.
 */
export function isBannerRenderedByRoute(segments: readonly string[]): boolean {
  return segments[segments.length - 1] === NOTICEBOARD_ROUTE_SEGMENT
}

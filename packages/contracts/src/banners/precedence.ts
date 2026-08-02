// Pure banner COLLISION RESOLVER — Story 10.9 (AC5, Load-Bearing Decision 3).
//
// ── WHY THIS LIVES IN @twt/contracts AND NOT @twt/domain ─────────────────────────────────────
// `resolveVisibleBanners` and `deriveBannerDisplayState` were relocated from `packages/domain` to
// `packages/contracts` because they are pure, read-time PRESENTATION POLICY shared by both the
// API/domain layer and the browser-based admin UI. Keeping them in Domain would violate the browser
// bundle boundary; duplicating them would violate the single-implementation requirement of AC5.
//
// (Concretely: `apps/admin` cannot import `@twt/domain` — it drags in `pg`, `drizzle` and
// `@google-cloud/kms`, the same boundary [[project_contracts_domain_bundle_boundary]] enforces for
// the RN bundle — and `@twt/domain` cannot import `@twt/contracts` either, because contracts already
// depends on domain for its test-only sync-guards, so that edge would be a hard cycle. Contracts is
// the only package `apps/api` and `apps/admin` can BOTH reach.)
//
// Closes a gap the PRD left open and the adversarial review named: prd.md FR-58B says banners show
// "one at a time per surface" but never says WHICH one, and
// `prds/prd-TWT-2026-05-22/review-adversarial.md:238` calls out that the collision between a
// "scheduled maintenance" banner and an "urgent helpdesk redirect" is unspecified.
//
// ── ONE resolver, TWO consumers (the AC5 requirement) ────────────────────────────────────────
// `apps/api` resolves the member surface server-side so every client agrees on the winner; the
// `apps/admin` editor calls the SAME function to compute its visibility verdict, splicing the draft
// into the live candidate set. It lives in @twt/contracts rather than @twt/domain because that is
// the only package BOTH can import — see the display-state.ts header for the full boundary
// reasoning. There is deliberately no second implementation anywhere.
//
// ── "One at a time per surface" bounds each MODE, not the surface's total ────────────────────
// A member can legitimately see a banner strip AND a popup at the same moment. The two display
// modes are resolved in SEPARATE, INDEPENDENT LANES: a winning popup never suppresses the banner,
// and a winning banner never suppresses the popup. Each lane yields AT MOST ONE row.
//
// ── The comparator is TOTAL, and that is the whole point ─────────────────────────────────────
//   1. `severity`   — `critical ≻ warning ≻ info` (an urgent helpline redirect must beat a
//      maintenance notice; severity already carries the operator's urgency intent, which is why
//      there is no separate authored `priority` integer — Decision 3's rejected alternative).
//   2. `valid_from` DESC — of two equal-severity notices the most recently ACTIVATED is the live one.
//   3. `banner_id`  ASC — the final tiebreak. A total order must never tie.
//
// Leaving the choice to `ORDER BY` in a query would make it depend on plan/iteration order —
// non-replayable, and exactly the failure mode Story 10.1's routing-determinism AC and Story 4.6's
// rule-order AC exist to prevent. Hash-map iteration order, ARRAY INPUT ORDER, clock ties and
// parallel execution cannot vary this outcome (the shuffled-input CI test is the teeth).
//
// PURE + DB-free + dependency-free. `now` is INJECTED (never `new Date()` here).
//
// ⚠ `severity` here is an ELIGIBILITY/SELECTION order. Do NOT confuse it with the niyamavali
// `precedence` field, which is PROVENANCE ([[project_niyamavali_precedence_is_provenance]]).

import { isBannerInWindow } from './display-state.js';
import type { BannerDisplayMode, BannerSeverity, BannerStatus } from './enums.js';

/**
 * Most-severe-FIRST rank (the in-repo `HELPDESK_SEVERITY_ORDER` convention, helpdesk/sla.ts:24-28).
 * A LOWER rank wins. Exported so tests and the admin verdict UI can name the deciding rule.
 */
export const BANNER_SEVERITY_ORDER: readonly BannerSeverity[] = ['critical', 'warning', 'info'];

/** The rank of a severity in the comparator (0 = most severe). Total over the enum. */
export function bannerSeverityRank(severity: BannerSeverity): number {
  const i = BANNER_SEVERITY_ORDER.indexOf(severity);
  // An unknown value can only mean the enum grew without updating the order — rank it LAST rather
  // than throwing, so a resolver can never take down a member read (fail-soft), and the missing arm
  // surfaces as "never wins" rather than as a 500.
  return i === -1 ? BANNER_SEVERITY_ORDER.length : i;
}

/**
 * The minimal row shape the comparator reads. STRUCTURAL on purpose: a persisted domain `BannerRow`
 * (camelCase) satisfies it directly, and so does an unsaved admin draft.
 */
export interface BannerCandidate {
  bannerId: string;
  severity: BannerSeverity;
  displayMode: BannerDisplayMode;
  validFrom: Date;
  validUntil: Date;
  status: BannerStatus;
}

/**
 * The TOTAL comparator: severity rank ASC → `valid_from` DESC → `banner_id` ASC. Returns <0 when `a`
 * wins. Exported for the determinism tests and for the admin visibility-verdict UI, which must name
 * the deciding rule rather than re-implement it.
 */
export function compareBannerPrecedence(a: BannerCandidate, b: BannerCandidate): number {
  const bySeverity = bannerSeverityRank(a.severity) - bannerSeverityRank(b.severity);
  if (bySeverity !== 0) return bySeverity;

  // Most recently activated wins → DESC on valid_from.
  const byRecency = b.validFrom.getTime() - a.validFrom.getTime();
  if (byRecency !== 0) return byRecency;

  // The total tiebreak. String compare on the UUID text — stable, replayable, never equal for two
  // distinct rows.
  return a.bannerId < b.bannerId ? -1 : a.bannerId > b.bannerId ? 1 : 0;
}

/** Which lane (if any) each display mode is resolved in. One winner per lane. */
export interface ResolvedBanners<T extends BannerCandidate = BannerCandidate> {
  /** The winning `display_mode = 'banner'` row, or null. */
  banner: T | null;
  /** The winning `display_mode = 'popup'` row, or null. INDEPENDENT of `banner`. */
  popup: T | null;
}

/** Pick the single winner of one lane, or null when the lane is empty. */
function winnerOf<T extends BannerCandidate>(rows: readonly T[], mode: BannerDisplayMode): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.displayMode !== mode) continue;
    if (best === null || compareBannerPrecedence(row, best) < 0) best = row;
  }
  return best;
}

/**
 * PURE: from a candidate set, return AT MOST ONE `banner` and AT MOST ONE `popup` visible at `now`.
 *
 * Candidates are first filtered on the WINDOW + STATUS axes (`status = 'published' ∧ valid_from <=
 * now < valid_until` — `isBannerInWindow`), then each display mode is resolved INDEPENDENTLY by
 * `compareBannerPrecedence`. Both returned fields may be non-null at once (AC5): a popup never
 * suppresses the banner and vice-versa.
 *
 * AUDIENCE and per-member DISMISSAL are NOT applied here — the member read applies them before
 * calling this, so the resolver stays a pure precedence function with one job. That is also what
 * lets the admin console reuse it verbatim for the AC5 visibility verdict: splice a draft into the
 * published candidate set as if it were published, and read off the winner.
 *
 * A single `reduce`-free scan means array input order cannot leak into the result: the comparator is
 * total, so the minimum is unique and order-independent. The input array is never mutated.
 */
export function resolveVisibleBanners<T extends BannerCandidate>(
  candidates: readonly T[],
  now: Date,
): ResolvedBanners<T> {
  const inWindow = candidates.filter((c) => isBannerInWindow(c, now));
  return {
    banner: winnerOf(inWindow, 'banner'),
    popup: winnerOf(inWindow, 'popup'),
  };
}

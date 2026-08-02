// Pure banner DISPLAY-STATE derivation — Story 10.9 (AC2).
//
// ── WHY THIS LIVES IN @twt/contracts AND NOT @twt/domain ─────────────────────────────────────
// `resolveVisibleBanners` and `deriveBannerDisplayState` were relocated from `packages/domain` to
// `packages/contracts` because they are pure, read-time PRESENTATION POLICY shared by both the
// API/domain layer and the browser-based admin UI. Keeping them in Domain would violate the browser
// bundle boundary; duplicating them would violate the single-implementation requirement of AC5.
//
// In detail: this is read-time presentation policy with THREE consumers: `apps/api` (which stamps
// `display_state` onto every admin DTO), `apps/admin` (whose live preview must distinguish
// `scheduled` from `live`, and whose AC5 visibility verdict calls the resolver next door), and the
// precedence resolver itself. `apps/admin` is a BROWSER bundle and cannot import `@twt/domain` —
// that package pulls in `pg`, `drizzle` and `@google-cloud/kms` (the same class of boundary
// [[project_contracts_domain_bundle_boundary]] enforces for the RN bundle) — and `@twt/domain`
// cannot import `@twt/contracts` either, because contracts already depends on domain for its
// test-only sync-guards, so that edge would be a hard cycle.
//
// So the pure, DB-free, dependency-free half of the banner rules lives HERE, where every consumer
// can reach it, and there is exactly ONE implementation — which is what AC5's "never a second,
// re-implemented comparison" actually requires. @twt/domain keeps the DATA and the WRITE invariants
// (the legality reducer, the tone gate, the content-hash revision rule, the accessors). The
// `banner_status` VALUE domain is still owned by the domain pgEnum and pinned here by the
// sync-guard test.
//
// `draft | scheduled | live | expired | retracted` is a DERIVATION over stored fields, NEVER a
// persisted column (the 8.6 [[project_yogdaan_status_derivation_convention]] discipline). The stored
// `status` carries only the three authored values; `scheduled`, `live` and `expired` are what the
// read-time WINDOW says about a `published` row at a given `now`.
//
// Why not a column: there is no scheduler (Decision 2). A stored `expired` would be wrong for
// exactly as long as a sweep lagged — and there is no sweep. A banner "auto-archives" (FR-58B)
// because the clock moved, not because anything ran.
//
// ── The two boundary conventions, pinned ─────────────────────────────────────────────────────
// `valid_from` is INCLUSIVE and `valid_until` is EXCLUSIVE: `valid_from <= now < valid_until`.
// At exactly `valid_from` the banner IS live; at exactly `valid_until` it is already expired.
//
// `now` is INJECTED — never `new Date()` inside this module — so every boundary is unit-testable and
// the derivation is deterministic across replays.

import type { BannerDisplayState, BannerStatus } from './enums.js';

/**
 * The minimal row shape the derivation reads. Structural, so a persisted domain `BannerRow`
 * (camelCase) satisfies it directly AND an unsaved admin draft can be derived before it is saved.
 */
export interface BannerDisplayInput {
  status: BannerStatus;
  validFrom: Date;
  validUntil: Date;
}

/**
 * PURE: what an admin (or a preview) should see this banner as, at `now`.
 *
 *   · `retracted` — terminal; the window is irrelevant.
 *   · `draft`     — never published; the window is irrelevant (a draft is invisible to members even
 *                   inside its window — the member read filters on `status = 'published'`).
 *   · published ∧ `now <  valid_from`  → `scheduled`
 *   · published ∧ `valid_from <= now < valid_until` → `live`
 *   · published ∧ `now >= valid_until` → `expired`
 *
 * ⚠ `scheduled` and `live` are the pair admins routinely confuse ("visible now" vs "visible
 * tomorrow"), which is why the admin preview gives `scheduled` its own muted treatment (Task 6).
 */
export function deriveBannerDisplayState(row: BannerDisplayInput, now: Date): BannerDisplayState {
  switch (row.status) {
    case 'retracted':
      return 'retracted';
    case 'draft':
      return 'draft';
    case 'published': {
      const t = now.getTime();
      if (t < row.validFrom.getTime()) return 'scheduled';
      if (t < row.validUntil.getTime()) return 'live';
      return 'expired';
    }
    default: {
      // Exhaustiveness guard — a new stored status must add its own arm (the domain audience.ts
      // pattern at [[project_story_validate_footguns]]).
      const _exhaustive: never = row.status;
      throw new Error(`deriveBannerDisplayState: unhandled banner status '${String(_exhaustive)}'`);
    }
  }
}

/**
 * Is this row member-visible at `now` on the WINDOW + STATUS axes alone? Exactly
 * `deriveBannerDisplayState(row, now) === 'live'`, named for the read paths that ask the question
 * directly. Audience and per-member dismissal are SEPARATE predicates layered on top by the member
 * read — this is deliberately not a whole-visibility answer.
 */
export function isBannerInWindow(row: BannerDisplayInput, now: Date): boolean {
  return deriveBannerDisplayState(row, now) === 'live';
}

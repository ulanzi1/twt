// Pure banner status-legality helper — Story 10.9 (AC1).
//
// The `nextPostStatus` (10.5) / `nextTicketState` (10.4) precedent: a PURE reducer naming the LEGAL
// transitions so the API layer can reject an illegal one (e.g. `publish` a retracted banner) with a
// typed 409 BEFORE any write. DB-free → unit-tested exhaustively over every legal AND illegal arm.
// The DB `banner_status` enum only constrains the VALUE domain; THIS function is the authority on
// which moves are allowed.
//
// The tone-review gate, the bilingual requirement, the popup-dismissible invariant and the window
// check are SEPARATE concerns layered on top by the write path — this helper is purely structural.

import type { BannerStatus } from '../schema/banners.js';

/**
 * The lifecycle ACTIONS a banner transition may request. Distinct from the STATUS values: an action
 * is the verb the handler dispatches; `nextBannerStatus` maps (currentStatus, action) → the
 * resulting status, or `null` when the action is illegal from that status.
 *   · `publish` — draft → published
 *   · `retract` — draft → retracted (a DISCARD of an unpublished draft) OR published → retracted
 */
export const BANNER_ACTIONS = ['publish', 'retract'] as const;
export type BannerAction = (typeof BANNER_ACTIONS)[number];

/**
 * The legal (status, action) → next-status map. Every arm not present here is ILLEGAL and returns
 * `null` (fail-closed).
 *
 * Note `retract` is legal from BOTH `draft` and `published`: retracting a draft is the DISCARD path
 * (a draft that will never go out), and retracting a published banner is the pull-it-down path.
 * `retracted` is TERMINAL — there is deliberately no un-retract (re-surfacing a pulled banner is a
 * new banner, so the dismissal history of the old one cannot silently apply to new copy).
 */
const LEGAL_TRANSITIONS: Readonly<Record<BannerStatus, Partial<Record<BannerAction, BannerStatus>>>> = {
  draft: { publish: 'published', retract: 'retracted' },
  published: { retract: 'retracted' },
  retracted: {},
};

/**
 * PURE legality reducer: the status a banner reaches when `action` is applied from `status`, or
 * `null` when the action is illegal from that status. The API guard calls this pre-write and 409s on
 * `null` (the 10.4 `nextTicketState` / 10.5 `nextPostStatus` "reducer guard" discipline).
 */
export function nextBannerStatus(status: BannerStatus, action: BannerAction): BannerStatus | null {
  return LEGAL_TRANSITIONS[status][action] ?? null;
}

/** Is `action` legal from `status`? Thin boolean wrapper over `nextBannerStatus`. */
export function isLegalBannerTransition(status: BannerStatus, action: BannerAction): boolean {
  return nextBannerStatus(status, action) !== null;
}

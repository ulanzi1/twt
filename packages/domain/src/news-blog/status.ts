// Pure News/Blog status-legality helper — Story 10.5 (AC2).
//
// The `nextTicketState` precedent (10.4 helpdesk): a PURE reducer that names the LEGAL transitions
// so the API layer can reject an illegal transition (e.g. `approve` a `draft`, `publish` a
// `submitted`) with a typed 409 BEFORE any write. DB-free → unit-tested exhaustively (every legal
// AND illegal arm). The DB `news_post_status` enum only constrains the VALUE domain; THIS function
// is the transition authority.
//
// author≠reviewer + tone-review-gate are SEPARATE concerns layered on top by the write path — this
// helper is purely about which (status, action) pairs are structurally legal.

import type { NewsPostStatus } from '../schema/news_posts.js';

/**
 * The lifecycle ACTIONS a post transition may request. Distinct from the STATUS values: an action
 * is the verb the handler dispatches; `nextPostStatus` maps (currentStatus, action) → the resulting
 * status, or `null` when the action is illegal from that status.
 *   · `submit`   — draft → submitted
 *   · `approve`  — submitted → approved
 *   · `schedule` — approved → scheduled
 *   · `publish`  — approved → published (immediate) OR scheduled → published (worker fire)
 */
export const NEWS_POST_ACTIONS = ['submit', 'approve', 'schedule', 'publish'] as const;
export type NewsPostAction = (typeof NEWS_POST_ACTIONS)[number];

/**
 * The legal (status, action) → next-status map. Every arm not present here is ILLEGAL and returns
 * `null` (fail-closed). Note `publish` is legal from BOTH `approved` (immediate publish) and
 * `scheduled` (the pg-boss worker's fire-time transition) — a `scheduled` post that is re-published
 * or fires resolves to `published`.
 */
const LEGAL_TRANSITIONS: Readonly<Record<NewsPostStatus, Partial<Record<NewsPostAction, NewsPostStatus>>>> = {
  draft: { submit: 'submitted' },
  submitted: { approve: 'approved' },
  approved: { schedule: 'scheduled', publish: 'published' },
  scheduled: { publish: 'published' },
  published: {},
};

/**
 * PURE legality reducer: the status a post reaches when `action` is applied from `status`, or `null`
 * when the action is illegal from that status. The API guard calls this pre-write and 409s on
 * `null` (the 10.4 `nextTicketState` "reducer/emitter guard" discipline).
 */
export function nextPostStatus(status: NewsPostStatus, action: NewsPostAction): NewsPostStatus | null {
  return LEGAL_TRANSITIONS[status][action] ?? null;
}

/** Is `action` legal from `status`? Thin boolean wrapper over `nextPostStatus`. */
export function isLegalPostTransition(status: NewsPostStatus, action: NewsPostAction): boolean {
  return nextPostStatus(status, action) !== null;
}

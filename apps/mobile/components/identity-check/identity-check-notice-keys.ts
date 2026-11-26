// "We could not confirm your identity yet" — which line the card shows, BY THE REASON (Story 3.13a; DL3; `2026-11-26-508` Q2 (ii)).
// Pure (⛔ React, ⛔ native) — the words' test imports it without the native primitives.

import type { IdentityCheckNotConfirmedReason } from '@twt/contracts'

/**
 * DL3 / PQ1 (b) (ii) (`-508`) — the "how to arrange it" line, BY THE REASON. ONE table, pinned by a literal in a test: a ruling
 * that changes it changes this map and the words together.
 */
export const IDENTITY_CHECK_HOW_KEY_BY_REASON = {
  details_do_not_match: 'identity_check.notice.how_details',
  photo_does_not_match: 'identity_check.notice.how',
  no_document_shown: 'identity_check.notice.how',
  member_not_reached: 'identity_check.notice.how_not_reached',
} as const satisfies Record<IdentityCheckNotConfirmedReason, string>

/** One full sentence per reason (⛔ a `{reason}` interpolation — `t()` throws on a missing param, and Hindi word order differs). */
export const IDENTITY_CHECK_REASON_KEY_BY_REASON = {
  details_do_not_match: 'identity_check.notice.reason.details_do_not_match',
  photo_does_not_match: 'identity_check.notice.reason.photo_does_not_match',
  no_document_shown: 'identity_check.notice.reason.no_document_shown',
  member_not_reached: 'identity_check.notice.reason.member_not_reached',
} as const satisfies Record<IdentityCheckNotConfirmedReason, string>

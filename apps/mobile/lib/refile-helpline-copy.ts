// The RE-FILE "please call the helpline" state's copy keys — Story 6.19c (AC15, `-273` §9). PURE (zero imports) so the
// real-`t()` test resolves every key in BOTH locales in node ([[feedback_stub_must_call_not_transcribe]]).
//
// Reached two ways, ONE state: the claim-entry gate (`refile_requires_confirmation` on the filed claim's fresh read) and
// the wizard's submit (a `409 claim.refile_requires_confirmation` — a phone without the filed-claim pointer: a
// helpline-filed claim, another device). ⛔ Never the wizard (it would only 409), ⛔ never a bare error. The copy states
// WHY the closure track exists (no response reached the bank-detail correction) — that category is the whole reason this
// screen is shown — but ⛔ no case-specific note or date from the closed claim is disclosed. Clarified 2026-10-02 (code
// review, Decision 2): the copy was human-reviewed and accepted as written (commit `45449354`); this comment was stale.

export const REFILE_HELPLINE_COPY = {
  title: 'refile.title',
  body: 'refile.body',
  call: 'refile.call',
  back: 'refile.back',
} as const

export type RefileHelplineCopyKey = (typeof REFILE_HELPLINE_COPY)[keyof typeof REFILE_HELPLINE_COPY]

/** The wizard submit's 409 code that routes to this state (the API's `claim.refile_requires_confirmation`). */
export const REFILE_REQUIRES_CONFIRMATION_CODE = 'claim.refile_requires_confirmation'

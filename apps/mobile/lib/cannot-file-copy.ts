// The "a claim cannot be filed" state's copy keys — Story 6.38 (DL10; `2026-10-30-423` Q3 B, `2026-10-31-424` Q3 B). PURE
// (zero imports) so the real-`t()` test resolves every key in BOTH locales in node ([[feedback_stub_must_call_not_transcribe]]).
//
// Reached from the wizard's submit only (`relationship.tsx`, the 409 `claim.intake_refused`): when the death was first made known the
// person was ⛔ a member of the Trust. ⭐ The body carries ONE general reason for every case — *"the person was not a member
// of the Trust when they died"* — ⛔ which of the five it was (and the member route's 409 carries ⛔ reason at all — N7).
// "Call the helpline" is a route to a QUESTION, ⛔ an appeal: the helpline is refused by the same door.

export const CANNOT_FILE_COPY = {
  title: 'cannot_file.title',
  body: 'cannot_file.body',
  call: 'cannot_file.call',
  back: 'cannot_file.back',
} as const

export type CannotFileCopyKey = (typeof CANNOT_FILE_COPY)[keyof typeof CANNOT_FILE_COPY]

/** The wizard submit's 409 code that routes to this state (the API's `claim.intake_refused`; checked against `@twt/contracts` in the test). */
export const CLAIM_INTAKE_REFUSED_CODE = 'claim.intake_refused'

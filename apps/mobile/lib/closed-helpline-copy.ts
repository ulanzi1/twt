// The CLOSED claim's "please call the helpline" copy keys — Story 6.24a (`2026-10-07-292` RF12). PURE (zero imports) so
// the real-`t()` test resolves every key in BOTH locales in node ([[feedback_stub_must_call_not_transcribe]]).
//
// Reached from the claim-entry gate when the filed claim's fresh read carries `claim_closed` — the claim was closed
// because another claim for the same death won its appeal. The words say ONLY that the claim is closed and to call the
// helpline: ⛔ no reason, ⛔ no mention of the other claim, ⛔ no name, ⛔ "suspicion" or "changed after the death".

export const CLOSED_HELPLINE_COPY = {
  title: 'closed.title',
  body: 'closed.body',
  call: 'closed.call',
  back: 'closed.back',
} as const

export type ClosedHelplineCopyKey = (typeof CLOSED_HELPLINE_COPY)[keyof typeof CLOSED_HELPLINE_COPY]

// Story 11b.4 (AC7) — every Send refusal maps to ONE Pattern-4 `memorial` key (what happened · what to do · helpline).
// ⛔ "Error / Invalid / Failed"; ⛔ a refusal ever clears the draft. Codes the family cannot cause from this app
// (an unknown field, a duplicate) fall to the gentle generic line.

export function memorialSendRefusalKey(code: string): string {
  switch (code) {
    case 'memorial.body_blank':
      return 'send.body_blank'
    case 'memorial.body_too_long':
      return 'send.body_too_long'
    case 'memorial.alt_text_required':
      return 'send.alt_text_required'
    case 'memorial.alt_text_too_long':
      return 'send.alt_text_too_long'
    case 'memorial.photo_type':
      return 'send.photo_type'
    case 'memorial.photo_unreadable':
      return 'send.photo_unreadable'
    case 'memorial.photo_too_large':
      return 'send.photo_too_large'
    case 'memorial.photo_conflict':
      return 'send.photo_conflict'
    case 'memorial.no_previous_photo':
      return 'send.no_previous_photo'
    case 'memorial.already_reviewed':
      return 'send.already_reviewed'
    case 'memorial.authorisation_outdated':
      return 'send.authorisation_outdated'
    case 'memorial.nominee_unresolved':
      return 'send.nominee_unresolved'
    case 'memorial.try_again':
      return 'send.try_again'
    // Story 11b.5a (KL8) — the family list could not be read (the app never sends one the server refuses: a malformed client).
    case 'memorial.kinship_invalid':
      return 'send.kinship_invalid'
    // Y — defensive: only an OLDER server answers this (the key now lives on the submission row). The key is kept (a Send
    // never drops it on a refusal), so the next press replays or lands under it.
    case 'memorial.idempotency_in_progress':
      return 'send.try_again'
    default:
      return 'send.generic'
  }
}

/**
 * The reason copy for a part left out / a refusal / a withdrawn approval (MA6's four grounds). Story 11b.5a (KL16, copy 4.3) —
 * when the version carried the guardian declaration (`guardianDeclaration`), `identifies_a_child` reads as a child the
 * family's confirmation cannot cover, ⛔ the plain "names or shows a child".
 * RP20 — `guardianDeclaration` is REQUIRED (no default): a call site that forgets it would quietly show the plain wording KL16
 * forbids, so the type checker must find it.
 */
export function memorialReasonKey(reason: string, guardianDeclaration: boolean): string {
  if (guardianDeclaration && reason === 'identifies_a_child') return 'outcome.reason_child_undeclared'
  return `reason.${reason}`
}

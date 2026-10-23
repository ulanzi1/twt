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
    default:
      return 'send.generic'
  }
}

/** The reason copy for a part left out / a refusal / a withdrawn approval (MA6's four grounds). */
export function memorialReasonKey(reason: string): string {
  return `reason.${reason}`
}

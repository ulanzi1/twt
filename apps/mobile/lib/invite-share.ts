// The invite — ONE share sheet per tap, with the member's OWN editable message (Story 6.36c, Task 6.4; RV5; `-309` item 5).
//
// ⭐ ONE helper, two callers: 6.36b's find screen (*"Not members yet — invite"*) and 6.36c's home card (b). The message is
// `known_people.invite.*` (the caller passes `useKnownPeopleT()`'s `t` — card (b) lives in `components/workplace/` with
// `workplace` copy, but the MESSAGE is the people-who-know-me namespace's). The Trust's name comes from config
// (`configuredTrustName()` — ⛔ `null` ⇒ the `_no_name` copy). ⛔ A link: no app / store link exists in config. ⛔ The Trust
// sends anything; ⛔ "invite all" (Apple 5.1.2(v)); ⛔ anything about a non-member sent to the Trust.

import { Share } from 'react-native'

export type KnownPeopleT = (key: string, params?: Record<string, string | number>) => string

/** The message text the share sheet opens with. */
export function inviteMessage(t: KnownPeopleT, trustName: string | null): string {
  return trustName === null ? t('invite.message_no_name') : t('invite.message', { trust_name: trustName })
}

/** Open ONE share sheet with the invite. Closing the sheet is ⛔ an error. */
export async function shareInvite(t: KnownPeopleT, trustName: string | null): Promise<void> {
  try {
    await Share.share({ message: inviteMessage(t, trustName) })
  } catch {
    // the member closed the share sheet
  }
}

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

/** The share sheet this helper has open, if any — the in-flight guard below (code review round 2). */
let open: Promise<void> | null = null

async function openSheet(t: KnownPeopleT, trustName: string | null): Promise<void> {
  try {
    await Share.share({ message: inviteMessage(t, trustName) })
  } catch {
    // the member closed the share sheet
  }
}

/**
 * How long the in-flight guard may hold at most (fix-diff review): `Share.share` that never settles (a sheet the OS
 * dropped without telling us) would otherwise leave the invite dead for the whole app process.
 */
export const INVITE_SHARE_GUARD_MS = 30_000

/**
 * Open ONE share sheet with the invite. Closing the sheet is ⛔ an error.
 * ⚠ Code review round 2 — ONE sheet per tap: a second tap (or the other caller) while a sheet is still opening / open
 * gets the SAME promise back, ⛔ a second `Share.share` — a double tap used to stack two sheets. Module-level, so it
 * guards both callers (the find screen and home card (b)) with ONE rule. The guard is released when the sheet settles
 * or, at the latest, after `INVITE_SHARE_GUARD_MS` (fix-diff review — the returned promise resolves then too, so ⛔ a
 * caller hangs), and only by the call that set it; release is always a later tick, so ⛔ before it is set.
 */
export function shareInvite(t: KnownPeopleT, trustName: string | null): Promise<void> {
  if (open !== null) return open
  const guarded: Promise<void> = new Promise<void>((resolve) => {
    const release = () => {
      clearTimeout(bound)
      if (open === guarded) open = null
      resolve()
    }
    const bound = setTimeout(release, INVITE_SHARE_GUARD_MS)
    void openSheet(t, trustName).then(release)
  })
  open = guarded
  return guarded
}

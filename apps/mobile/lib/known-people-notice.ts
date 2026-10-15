// People who know me — the find screen's SUCCESS, handed to the people screen (Story 6.36b review round 2, P2;
// checklist 13 (d)). The find screen goes BACK the moment its asks land, so a message it set itself was never shown or
// spoken (`setMessage(...)` then `router.back()`). It PARKS the words here instead, and the people screen TAKES them when
// it regains focus (`useFocusEffect`, after the running interactions — ⚠ whether that is late enough for VoiceOver on a
// native-stack pop is a DEVICE question, FD-4; ⛔ claimed solved). A parked notice is dropped on an account change
// (`clearKnownPeopleNotices`, called with the other member caches) and goes stale after `NOTICE_TTL_MS` — ⛔ an "Asked."
// spoken to the next member, or long after. ⛔ Stored anywhere but memory — the words name ⛔ nobody.

/** A parked notice is shown only if the people screen takes it within this long. */
export const NOTICE_TTL_MS = 30_000

let pending: { readonly text: string; readonly at: number } | null = null

/** The find screen: these words should be shown and spoken on the people screen, once it is focused again. */
export function handKnownPeopleNotice(text: string, now: number = Date.now()): void {
  pending = { text, at: now }
}

/** The people screen, on focus: the parked words (once), or `null` — ⛔ a stale one. */
export function takeKnownPeopleNotice(now: number = Date.now()): string | null {
  const parked = pending
  pending = null
  if (parked === null || now - parked.at > NOTICE_TTL_MS) return null
  return parked.text
}

/** An account change (sign-in, sign-out, a terminated / rejected refresh): drop any parked notice. */
export function clearKnownPeopleNotices(): void {
  pending = null
}

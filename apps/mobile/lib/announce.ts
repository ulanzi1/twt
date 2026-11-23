// Story 3.15b (DL3, DL4) — the ONE place in apps/mobile that calls `AccessibilityInfo.announceForAccessibility` /
// `announceForAccessibilityWithOptions`. Every direct announcement goes through `announce()`, so a repeat of the same
// text is sent as different text on Android and TalkBack speaks it again (V4 — see `announce-repeat.ts`). The ESLint
// fence in `apps/mobile/eslint.config.mjs` bars the two methods everywhere else (DL5).
//
// Platform guards stay at the call sites (`if (Platform.OS === 'ios') announce(…)`) — this helper does not replace them.
// `Platform.OS` is read on EVERY call, ⛔ captured once: render tests switch the mocked platform per leg.
//
// ⛔ `AnnouncedText`'s live region: on Android it never calls this API, so its repeats are not covered here.

import { AccessibilityInfo, Platform } from 'react-native'

import { distinctAnnouncement } from './announce-repeat'

/** Announce `text` to the screen reader; `options` (e.g. `{ queue: true }`) are forwarded unchanged. */
export function announce(text: string, options?: { queue?: boolean }): void {
  const distinct = distinctAnnouncement(text, Platform.OS)
  if (options !== undefined) {
    AccessibilityInfo.announceForAccessibilityWithOptions(distinct, options)
  } else {
    AccessibilityInfo.announceForAccessibility(distinct)
  }
}

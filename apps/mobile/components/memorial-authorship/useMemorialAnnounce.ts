// Story 11b.4 (AC13 / checklist family 13 (d), R5) — a state that APPEARS on a memorial screen is SPOKEN, not only drawn.
//
// `accessibilityLiveRegion` is Android-only, and a bare label on a container is never announced; a family using VoiceOver
// who presses Send would otherwise hear nothing of the refusal, of the nominee's code being asked for, or of the Withdraw
// that worked. The repo's ONE plan applies (`announcementPlan`, `lib/death-certificate-announce.ts`; precedent
// `(claim)/certificate-replacement.tsx`):
//   · a line that carries its OWN live region is announced here on iOS ONLY (both ⇒ TalkBack speaks it twice);
//   · a state change with no live region beside it (a line swapped in place) is announced on BOTH platforms.
// Focus is never moved. Keyed on the TEXT, never on `t` ([[project_uset_fresh_closure_memo_trap]]).
// The live-region VALUE is never hard-coded on a line either: the plan decides it by `kind` (an error the family must act
// on is `assertive`, a status line `polite`), and this hook RETURNS it for the line it announces — the line's element
// passes the returned value as its `accessibilityLiveRegion`. `memorialLiveRegion(kind)` is the same value for a line that
// is not announced through the hook (a counter that updates as the family types).

import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

import { announcementPlan, type AnnouncementKind } from '../../lib/death-certificate-announce'

export type MemorialLiveRegion = 'polite' | 'assertive'

/** The `accessibilityLiveRegion` value for a line of this `kind`, from the repo's one announcement plan. */
export function memorialLiveRegion(kind: AnnouncementKind = 'status'): MemorialLiveRegion {
  return announcementPlan(Platform.OS, kind).liveRegion
}

export function useMemorialAnnounce(
  text: string | null,
  opts: {
    /** The line carries `accessibilityLiveRegion` itself (Android speaks it) ⇒ announce here on iOS only. */
    readonly hasLiveRegion: boolean
    readonly kind?: AnnouncementKind
    /** The screen reader reads the first render itself — announce only what CHANGES afterwards. */
    readonly skipInitial?: boolean
  },
): MemorialLiveRegion {
  const skip = useRef(opts.skipInitial === true)
  const { hasLiveRegion, kind = 'status' } = opts
  useEffect(() => {
    if (skip.current) {
      skip.current = false
      return
    }
    if (!text) return
    if (hasLiveRegion && !announcementPlan(Platform.OS, kind).iosAnnounce) return
    AccessibilityInfo.announceForAccessibility(text)
  }, [text, hasLiveRegion, kind])
  return memorialLiveRegion(kind)
}

/**
 * T8 — a length counter that goes OVER the limit: the crossing is announced ONCE, as an error (the plan's `error` kind), on
 * both platforms — ⛔ on every keystroke past the limit (an assertive counter interrupted TalkBack on every character). The
 * text announced is the over-limit line AT THE CROSSING; it is held while the text stays over, and released when it comes
 * back under, so the next crossing is announced again. The counter line itself stays a POLITE status (its own live region).
 * ⚠ On Android the polite counter also reads the new line at that moment (once, at the crossing) — device check, Row 41 (h).
 * V8 — the INITIAL state is ⛔ a crossing: the first state seen once `ready` (the screen has read its saved draft — a draft
 * restored already over the limit, or a pushed second Write showing it) is taken as the baseline and NOT announced (the
 * screen reader reads the screen on arrival; the box's hint carries the line). Only a crossing after that is announced.
 */
export function useMemorialOverLimitAnnounce(overText: string | null, ready: boolean = true): void {
  // The over-limit line held since the crossing (or since the baseline); `silent` ⇔ it was already over at the baseline.
  const crossing = useRef<string | null>(null)
  const baselined = useRef(false)
  const silent = useRef(false)
  if (ready && !baselined.current) {
    baselined.current = true
    crossing.current = overText
    silent.current = overText !== null
  } else if (ready) {
    if (overText === null) {
      crossing.current = null
      silent.current = false
    } else if (crossing.current === null) crossing.current = overText
  }
  useMemorialAnnounce(silent.current ? null : crossing.current, { hasLiveRegion: false, kind: 'error' })
}

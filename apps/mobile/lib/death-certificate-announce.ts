// PURE accessibility-announcement plan — Story 6.21b (D2, AC2; V2, BW-C1).
//
// The 6.18 review's pattern (`nominee-review.tsx`, code review 2026-09-23/2026-09-23b): a bare
// `accessibilityLiveRegion` on Android is silent on iOS VoiceOver, so the outcome is ALSO spoken via
// `AccessibilityInfo.announceForAccessibility` — but ONLY on iOS, or TalkBack speaks it twice.

export interface AnnouncementPlan {
  /** Android: the outcome `Text` carries this live-region value. */
  readonly liveRegion: 'polite' | 'assertive'
  /** iOS ONLY: call `AccessibilityInfo.announceForAccessibility(message)` when true. */
  readonly iosAnnounce: boolean
}

/** What is being announced: an ordinary status line (`polite`) or a failure the family must act on
 *  (`assertive`). */
export type AnnouncementKind = 'status' | 'error'

/** `(platform, kind) → liveRegion | iosAnnounce` — pure, so the "unguarded ⇒ TalkBack speaks it twice"
 *  regression (2026-09-23b) can be pinned without a render harness. The screen reads BOTH fields from
 *  here — ⛔ never a hard-coded live-region value ([[feedback_stub_must_call_not_transcribe]]). */
export function announcementPlan(platform: 'ios' | 'android' | string, kind: AnnouncementKind = 'status'): AnnouncementPlan {
  return {
    liveRegion: kind === 'error' ? 'assertive' : 'polite',
    iosAnnounce: platform === 'ios',
  }
}

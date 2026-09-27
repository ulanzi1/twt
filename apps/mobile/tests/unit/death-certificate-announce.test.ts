// PURE accessibility-announcement plan — Story 6.21b (D2, AC2; V2, BW-C1). Pins the double-speak
// regression (code review 2026-09-23b): iOS announces via `AccessibilityInfo`, Android does NOT (its
// `Text` carries the live region instead — the caller applies that separately).

import { describe, expect, it } from 'vitest'

import { announcementPlan } from '../../lib/death-certificate-announce'

describe('announcementPlan', () => {
  it('iOS: announces via AccessibilityInfo (the Android live region alone is silent on VoiceOver)', () => {
    expect(announcementPlan('ios')).toEqual({ liveRegion: 'polite', iosAnnounce: true })
  })

  it('Android: does NOT also call AccessibilityInfo.announceForAccessibility — TalkBack would speak it twice', () => {
    expect(announcementPlan('android')).toEqual({ liveRegion: 'polite', iosAnnounce: false })
  })

  it('any other platform string defaults to the Android (no double-announce) posture', () => {
    expect(announcementPlan('web').iosAnnounce).toBe(false)
  })

  it('an ERROR is assertive on both platforms; a status line is polite (the screen reads liveRegion from HERE)', () => {
    expect(announcementPlan('android', 'error')).toEqual({ liveRegion: 'assertive', iosAnnounce: false })
    expect(announcementPlan('ios', 'error')).toEqual({ liveRegion: 'assertive', iosAnnounce: true })
    expect(announcementPlan('android', 'status').liveRegion).toBe('polite')
  })
})

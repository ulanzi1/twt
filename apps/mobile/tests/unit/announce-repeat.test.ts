// Story 3.15b (AC 2; DL2, DL3) — the PURE per-text repeat counter behind `lib/announce.ts`.
//
// A unit test shows only the TEXT that would be SENT — never what TalkBack speaks
// ([[project_talkback_drops_identical_announcement]]); the device sweep (AC 6) is the proof it is spoken.

import { beforeEach, describe, expect, it } from 'vitest'

import { distinctAnnouncement, resetAnnouncementRepeats } from '../../lib/announce-repeat'

const NBSP = String.fromCharCode(0xa0)

describe('distinctAnnouncement (Story 3.15b)', () => {
  beforeEach(() => {
    resetAnnouncementRepeats()
  })

  it('on android the first send is the text exactly; the 2nd and 3rd carry 1 and 2 trailing no-break spaces', () => {
    expect(distinctAnnouncement('Code sent', 'android')).toBe('Code sent')
    expect(distinctAnnouncement('Code sent', 'android')).toBe(`Code sent${NBSP}`)
    expect(distinctAnnouncement('Code sent', 'android')).toBe(`Code sent${NBSP}${NBSP}`)
  })

  it('counts two different texts separately', () => {
    expect(distinctAnnouncement('A', 'android')).toBe('A')
    expect(distinctAnnouncement('B', 'android')).toBe('B')
    expect(distinctAnnouncement('A', 'android')).toBe(`A${NBSP}`)
    expect(distinctAnnouncement('B', 'android')).toBe(`B${NBSP}`)
    expect(distinctAnnouncement('C', 'android')).toBe('C')
  })

  it('returns the text unchanged on ios, every time (DL2)', () => {
    expect(distinctAnnouncement('Code sent', 'ios')).toBe('Code sent')
    expect(distinctAnnouncement('Code sent', 'ios')).toBe('Code sent')
    expect(distinctAnnouncement('Code sent', 'ios')).toBe('Code sent')
  })

  it('an ios send does not advance the android count', () => {
    expect(distinctAnnouncement('X', 'ios')).toBe('X')
    expect(distinctAnnouncement('X', 'android')).toBe('X')
    expect(distinctAnnouncement('X', 'ios')).toBe('X')
    expect(distinctAnnouncement('X', 'android')).toBe(`X${NBSP}`)
  })

  it('resetAnnouncementRepeats() returns the next send to the plain text', () => {
    distinctAnnouncement('Saved', 'android')
    expect(distinctAnnouncement('Saved', 'android')).toBe(`Saved${NBSP}`)
    resetAnnouncementRepeats()
    expect(distinctAnnouncement('Saved', 'android')).toBe('Saved')
  })
})

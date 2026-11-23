// Story 3.15b (AC 2, AC 5; DL3, DL6) — the thin sender every direct announcement in apps/mobile goes through.
//
// A unit test shows only the TEXT that is SENT, never what TalkBack speaks
// ([[project_talkback_drops_identical_announcement]]).

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  announce: vi.fn<(text: string) => void>(),
  announceWithOptions: vi.fn<(text: string, options: unknown) => void>(),
  os: 'android' as string,
}))

vi.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: mock.announce,
    announceForAccessibilityWithOptions: mock.announceWithOptions,
  },
  Platform: {
    get OS() {
      return mock.os
    },
  },
}))

import { announce } from '../../lib/announce'

const NBSP = String.fromCharCode(0xa0)

beforeEach(() => {
  mock.announce.mockReset()
  mock.announceWithOptions.mockReset()
  mock.os = 'android'
})

describe('announce (Story 3.15b)', () => {
  it('calls announceForAccessibility with the text when no options are given', () => {
    announce('Saved')
    expect(mock.announce.mock.calls).toEqual([['Saved']])
    expect(mock.announceWithOptions).not.toHaveBeenCalled()
  })

  it('calls announceForAccessibilityWithOptions with the options forwarded unchanged (F8)', () => {
    const options = { queue: true }
    announce('Wait', options)
    expect(mock.announceWithOptions.mock.calls).toEqual([['Wait', { queue: true }]])
    expect(mock.announceWithOptions.mock.calls[0]?.[1]).toBe(options)
    expect(mock.announce).not.toHaveBeenCalled()
  })

  it('on android a repeat is sent as different text (one more trailing no-break space)', () => {
    announce('Saved')
    announce('Saved')
    announce('Saved', { queue: true })
    expect(mock.announce.mock.calls).toEqual([['Saved'], [`Saved${NBSP}`]])
    expect(mock.announceWithOptions.mock.calls).toEqual([[`Saved${NBSP}${NBSP}`, { queue: true }]])
  })

  it('reads Platform.OS on EVERY call (8 render tests switch it per leg — F5)', () => {
    mock.os = 'ios'
    announce('Saved')
    announce('Saved')
    mock.os = 'android'
    announce('Saved')
    announce('Saved')
    expect(mock.announce.mock.calls).toEqual([['Saved'], ['Saved'], ['Saved'], [`Saved${NBSP}`]])
  })

  // DL6 — the setup file resets the per-text counter before EVERY test. These two legs each send the same text and expect the
  // PLAIN text first: without `tests/unit/setup-announce-repeat.ts` the second leg sees the count the first one left.
  it('harness reset (1 of 2): a first send of a text is the plain text', () => {
    announce('Harness reset probe')
    expect(mock.announce.mock.calls).toEqual([['Harness reset probe']])
  })

  it('harness reset (2 of 2): the same text in a LATER test is the plain text again', () => {
    announce('Harness reset probe')
    expect(mock.announce.mock.calls).toEqual([['Harness reset probe']])
  })
})

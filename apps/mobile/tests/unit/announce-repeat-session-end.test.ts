// @vitest-environment jsdom
// Story 3.15b code review P1 — the per-text announcement counter (`lib/announce-repeat.ts`) keeps every announced string as a key on
// Android, and some keys hold ANOTHER member's name (`nominees.tsx`: `form.marked` with `{ name }`). `session-context.tsx` clears every
// other module-level store of that kind at each session boundary, so the counter must be cleared at the same four places: a signed-out
// phone does not carry the last account's names (or counts) in memory for the rest of the app process.
// EXECUTED against the REAL `SessionProvider` (the `announcement-channels-signout` harness): each leg sends a text twice (the second
// is SENT with a trailing no-break space), crosses ONE session boundary, and expects the next send to be the plain text again.
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NBSP } from './announce-text'

type Stored = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; memberId: string; pariwarId: string }

const mock = vi.hoisted(() => ({
  stored: null as Stored | null,
  rejected: null as (() => void) | null,
  terminated: null as ((notice: unknown) => void) | null,
  /** The server logout; a leg replaces it with a held promise to keep `signOut` suspended mid-way. */
  logoutImpl: (async () => undefined) as () => Promise<void>,
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
}))
vi.mock('../../lib/member-api', () => ({ memberAuth: { logout: () => mock.logoutImpl() } }))
vi.mock('../../lib/session', () => ({
  loadSession: async () => mock.stored,
  saveSession: async (s: Stored) => {
    mock.stored = s
  },
  clearSession: async () => {
    mock.stored = null
  },
  setRefreshRejectedHandler: (h: (() => void) | null) => {
    mock.rejected = h
  },
  setTerminatedDuringRefreshHandler: (h: ((notice: unknown) => void) | null) => {
    mock.terminated = h
  },
}))
vi.mock('../../lib/app-language', () => ({ syncAppLanguage: async () => undefined }))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key, useLocale: () => ({ locale: 'en', setLocale: () => undefined }) }))
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
  Linking: { openURL: async () => undefined },
  AccessibilityInfo: { announceForAccessibility: () => undefined },
  Platform: { OS: 'android' },
}))
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))
vi.mock('tamagui', () => ({ Text: () => null, YStack: () => null, Button: () => null }))

import { distinctAnnouncement, resetAnnouncementRepeats } from '../../lib/announce-repeat'
import { queryClient } from '../../lib/query-client'
import { SessionProvider, useSession } from '../../lib/session-context'

const P = '00000000-0000-4000-8000-0000000000aa'
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const stored = (memberId: string): Stored => ({ accessToken: `at-${memberId}`, accessTokenExpiresAt: '2026-11-23T12:00:00.000Z', refreshToken: `rt-${memberId}`, memberId, pariwarId: P })
const full = (memberId: string) => ({ sessionType: 'full_session' as const, deviceId: 'd-1', ...stored(memberId) })

/** The text a member's name lands in (nominees.tsx `form.marked`) — the shape that matters for the leak. */
const LINE = 'Marked Sita Devi as a nominee'

const ctx: { current: ReturnType<typeof useSession> | null } = { current: null }
function Probe(): ReactNode {
  ctx.current = useSession()
  return null
}
const app = () => render(createElement(QueryClientProvider, { client: queryClient }, createElement(SessionProvider, null, createElement(Probe))))

/** Send LINE twice on android: the repeat carries a no-break space, so the counter holds this text. */
function sendTwice(): void {
  expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  expect(distinctAnnouncement(LINE, 'android')).toBe(`${LINE}${NBSP}`)
}

beforeEach(async () => {
  // Local, ⛔ leaning on the vitest setup file (`setup-announce-repeat.ts`): every leg here starts from an EMPTY counter.
  resetAnnouncementRepeats()
  ctx.current = null // a leg must drive THIS test's provider, ⛔ a previous one's stale closure
  mock.stored = stored(A)
  mock.rejected = null
  mock.terminated = null
  mock.logoutImpl = async () => undefined
  queryClient.clear()
  app()
  await waitFor(() => expect(ctx.current?.session?.memberId).toBe(A))
})
afterEach(() => {
  cleanup()
  queryClient.clear()
})

describe('every session boundary clears the announcement counter (code review P1)', () => {
  it('signOut', async () => {
    sendTwice()
    await act(() => ctx.current!.signOut())
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  })

  it('signOut — a screen that is still mounted announces while the server logout is in flight: that send does not survive', async () => {
    // `signOut` clears at its START (with the other stores) and the session ends only after two awaits; the screens stay mounted
    // meanwhile, so a name-bearing line announced in that window would re-seed the counter after the first clear.
    let release: () => void = () => undefined
    mock.logoutImpl = () => new Promise<void>((r) => { release = r })
    let done: Promise<void> = Promise.resolve()
    await act(async () => {
      done = ctx.current!.signOut()
    })
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE) // sent during the hold: the counter holds this text again
    await act(async () => {
      release()
      await done
    })
    expect(ctx.current!.session).toBeNull()
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  })

  it('signIn over a session that is still present (the only way a sign-in is a boundary of its own); the next account starts at the plain text', async () => {
    sendTwice()
    await act(() => ctx.current!.signIn(full(B)))
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  })

  it('a refresh refused with a 4xx (the reactive clear)', () => {
    sendTwice()
    expect(mock.rejected).not.toBeNull()
    act(() => mock.rejected!())
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  })

  it('a termination found during a refresh', () => {
    sendTwice()
    expect(mock.terminated).not.toBeNull()
    act(() => mock.terminated!({}))
    expect(distinctAnnouncement(LINE, 'android')).toBe(LINE)
  })

  it('control — with no session boundary the counter keeps counting (the clear is not constant)', () => {
    sendTwice()
    expect(distinctAnnouncement(LINE, 'android')).toBe(`${LINE}${NBSP}${NBSP}`)
  })
})

// @vitest-environment jsdom
// Story 5.14 code review G3-P2 (`2026-10-29-419` item 5; FS11) — the member read is ALSO refetched when the app returns to the
// foreground (AppState `active`) and when its screen gains focus: the home tab mounts once per app process and the app's query client
// ⛔ refetches on focus, so a mount-only read left a switched-off link on screen for days. EXECUTED against a REAL `QueryClient`
// ([[project_tanstack_refetch_rejoins_hung_fetch]] — mocked hooks hid TanStack behaviour before); only the transport, the session, the
// AppState listener and the navigator's focus are stubbed.
import { createElement, useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Links = { whatsappChannelUrl: string | null; telegramChannelUrl: string | null }

const mock = vi.hoisted(() => ({
  session: { memberId: 'm-1', pariwarId: 'p-1' } as { memberId: string; pariwarId: string } | null,
  get: vi.fn<() => Promise<Links>>(),
  appState: new Set<(state: string) => void>(),
  focus: new Set<() => void>(),
}))

vi.mock('../../lib/member-api', () => ({ memberAuth: { getAnnouncementChannels: () => mock.get() } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session, isLoading: false }) }))
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_type: 'change', fn: (state: string) => void) => {
      mock.appState.add(fn)
      return { remove: () => void mock.appState.delete(fn) }
    },
  },
}))
// The navigator's focus: the callback runs when the screen gains focus — on mount, and again on each `focus()` below.
vi.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    useEffect(() => {
      mock.focus.add(cb)
      cb()
      return () => void mock.focus.delete(cb)
    }, [cb])
  },
}))

import { announcementChannelsKey, useAnnouncementChannelsQuery } from '../../components/announcement-channels/useAnnouncementChannelsQuery'

const ON: Links = { whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va', telegramChannelUrl: null }
const OFF: Links = { whatsappChannelUrl: null, telegramChannelUrl: null }
const foreground = (state = 'active') => act(() => { for (const fn of mock.appState) fn(state) })
const focus = () => act(() => { for (const fn of mock.focus) fn() })

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, refetchOnReconnect: false } } }) // the app's posture
  mock.session = { memberId: 'm-1', pariwarId: 'p-1' }
  mock.get.mockReset()
  mock.appState.clear()
  mock.focus.clear()
})
afterEach(() => {
  cleanup()
  client.clear()
})

describe('the member read refetches on foreground and on focus (G3-P2, `-419` item 5)', () => {
  it('⭐ a switch-off made while the app was in the background is seen when it returns to the foreground — ⛔ only on `active`', async () => {
    mock.get.mockResolvedValueOnce(ON).mockResolvedValueOnce(OFF)
    const { result } = renderHook(() => useAnnouncementChannelsQuery(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(ON))
    expect(mock.get).toHaveBeenCalledTimes(1) // the mount and the initial focus share ONE fetch
    foreground('background')
    foreground('inactive')
    expect(mock.get).toHaveBeenCalledTimes(1)
    foreground('active')
    await waitFor(() => expect(result.current.data).toEqual(OFF))
    expect(mock.get).toHaveBeenCalledTimes(2)
  })

  it('⭐ a corrected link is seen when the screen gains focus again (the home tab is ⛔ remounted)', async () => {
    const fixed: Links = { whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb', telegramChannelUrl: null }
    mock.get.mockResolvedValueOnce(ON).mockResolvedValueOnce(fixed)
    const { result } = renderHook(() => useAnnouncementChannelsQuery(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(ON))
    await focus()
    await waitFor(() => expect(result.current.data).toEqual(fixed))
    expect(mock.get).toHaveBeenCalledTimes(2)
  })

  it('the card and the entry on ONE home screen JOIN one refetch (`cancelRefetch: false`) — ⛔ two reads, ⛔ one cancelled', async () => {
    mock.get.mockResolvedValueOnce(ON)
    const { result } = renderHook(() => [useAnnouncementChannelsQuery(), useAnnouncementChannelsQuery()] as const, { wrapper })
    await waitFor(() => expect(result.current[0].data).toEqual(ON))
    expect(mock.get).toHaveBeenCalledTimes(1)
    let settle: (v: Links) => void = () => undefined
    mock.get.mockReturnValueOnce(new Promise<Links>((r) => { settle = r }))
    await foreground('active')
    expect(mock.get).toHaveBeenCalledTimes(2)
    await act(async () => settle(OFF))
    await waitFor(() => expect(result.current[1].data).toEqual(OFF))
    expect(result.current[0].data).toEqual(OFF)
    expect(mock.get).toHaveBeenCalledTimes(2)
  })

  it('⛔ a read with no session (disabled) — v5 `refetch` ignores `enabled`, so the hook guards it', async () => {
    mock.session = null
    const { result } = renderHook(() => useAnnouncementChannelsQuery(), { wrapper })
    await foreground('active')
    await focus()
    expect(mock.get).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('the listener is removed when the consumer unmounts, and is keyed per (Pariwar, member)', async () => {
    mock.get.mockResolvedValue(ON)
    const { result, unmount } = renderHook(() => useAnnouncementChannelsQuery(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(ON))
    expect(client.getQueryData(announcementChannelsKey('p-1', 'm-1'))).toEqual(ON)
    unmount()
    expect(mock.appState.size).toBe(0)
    expect(mock.focus.size).toBe(0)
  })
})

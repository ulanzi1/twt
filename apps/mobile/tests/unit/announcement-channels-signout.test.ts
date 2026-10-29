// @vitest-environment jsdom
// Story 5.14 code review G3-P9 (AC8; `2026-10-29-417` FS10 (a), FS11 (a)) — AC8's named sign-out test, EXECUTED: the REAL
// `SessionProvider` runs its own `signOut`, and the next account is RENDERED. Its first render shows ⛔ cached links (the member read
// is removed from the app's REAL query client), and ⛔ dismissal is carried (sign-out clears it — so the same account is asked once
// more after signing back in: FS10 (a)'s accepted cost). Real: the provider, the query client, the member read hook, the card and the
// dismissal store (over an in-memory MMKV). Stubbed: the transport (`member-api`), SecureStore (`lib/session`), the language sync,
// and the native / navigator / tamagui primitives (the 6.36c harness).
import '@testing-library/jest-dom/vitest'
import { createElement, useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Links = { whatsappChannelUrl: string | null; telegramChannelUrl: string | null }
type Stored = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; memberId: string; pariwarId: string }

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  stored: null as Stored | null,
  get: vi.fn<() => Promise<Links>>(),
  logout: vi.fn<() => Promise<void>>(),
  setLocale: (): void => undefined,
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('../../lib/member-api', () => ({ memberAuth: { getAnnouncementChannels: () => mock.get(), logout: () => mock.logout() } }))
vi.mock('../../lib/session', () => ({
  loadSession: async () => mock.stored,
  saveSession: async (s: Stored) => { mock.stored = s },
  clearSession: async () => { mock.stored = null },
  setRefreshRejectedHandler: () => undefined,
  setTerminatedDuringRefreshHandler: () => undefined,
}))
vi.mock('../../lib/app-language', () => ({ syncAppLanguage: async () => undefined }))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key, useLocale: () => ({ locale: 'en', setLocale: mock.setLocale }) }))
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
  Linking: { openURL: async () => undefined },
  AccessibilityInfo: { announceForAccessibility: () => undefined },
  Platform: { OS: 'android' },
}))
vi.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    useEffect(() => cb(), [cb])
  },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => createElement('div', { 'data-testid': testID }, children)
  return {
    Text: container,
    YStack: container,
    Button: (p: { children: React.ReactNode; onPress?: () => void; testID?: string; accessibilityLabel?: string }) =>
      createElement('button', { onClick: p.onPress, 'data-testid': p.testID, 'aria-label': p.accessibilityLabel }, p.children),
  }
})

import { announcementChannelsKey } from '../../components/announcement-channels/useAnnouncementChannelsQuery'
import { AnnouncementChannelsCard } from '../../components/home/AnnouncementChannelsCard'
import { announcementCardDismissedKey } from '../../lib/announcement-channels-dismissal'
import { queryClient } from '../../lib/query-client'
import { SessionProvider, useSession } from '../../lib/session-context'

const P = '00000000-0000-4000-8000-0000000000aa'
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const LINKS_A: Links = { whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va', telegramChannelUrl: null }
const LINKS_B: Links = { whatsappChannelUrl: null, telegramChannelUrl: 'https://t.me/twt_bihar_notices' }
const stored = (memberId: string): Stored => ({ accessToken: `at-${memberId}`, accessTokenExpiresAt: '2026-10-29T12:00:00.000Z', refreshToken: `rt-${memberId}`, memberId, pariwarId: P })
const full = (memberId: string) => ({ sessionType: 'full_session' as const, deviceId: 'd-1', ...stored(memberId) })

const ctx: { current: ReturnType<typeof useSession> | null } = { current: null }
/** The root guard's shape: home (and its card) renders only while a session exists. */
function Home(): ReactNode {
  const session = useSession()
  ctx.current = session
  return session.session === null ? null : createElement(AnnouncementChannelsCard)
}
const app = () =>
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(SessionProvider, null, createElement(Home))))
const announcementQueries = () => queryClient.getQueryCache().findAll({ queryKey: ['announcement-channels'] })

beforeEach(() => {
  mock.store.clear()
  mock.stored = stored(A)
  mock.get.mockReset()
  mock.logout.mockReset()
  mock.logout.mockResolvedValue(undefined)
  queryClient.clear()
})
afterEach(() => {
  cleanup()
  queryClient.clear()
})

describe('AC8 — sign-out through the real SessionProvider, then the next account (G3-P9)', () => {
  it('⭐ the next account\'s first render has ⛔ cached links and ⛔ carried dismissal; the same account is asked once more', async () => {
    mock.get.mockResolvedValueOnce(LINKS_A)
    app()
    expect(await screen.findByText('announcementChannels.card_title')).toBeInTheDocument()
    expect(queryClient.getQueryData(announcementChannelsKey(P, A))).toEqual(LINKS_A)
    fireEvent.click(screen.getByRole('button', { name: 'announcementChannels.not_now' }))
    expect(screen.queryByText('announcementChannels.card_title')).toBeNull()
    expect(mock.store.has(announcementCardDismissedKey(A))).toBe(true)

    await act(() => ctx.current!.signOut())
    expect(mock.logout).toHaveBeenCalledTimes(1)
    expect(ctx.current!.session).toBeNull()
    expect(announcementQueries()).toHaveLength(0) // the member read is gone from the app's query client
    expect(mock.store.has(announcementCardDismissedKey(A))).toBe(false) // and the card's dismissal from the phone

    // The next account (B): its read is HELD, so its first render can only show what the cache carried — nothing.
    let settleB: (v: Links) => void = () => undefined
    mock.get.mockReturnValueOnce(new Promise<Links>((r) => { settleB = r }))
    await act(() => ctx.current!.signIn(full(B)))
    expect(ctx.current!.session?.memberId).toBe(B)
    expect(screen.queryByText('announcementChannels.card_title')).toBeNull()
    expect(screen.queryByText('announcementChannels.body_whatsapp')).toBeNull()
    expect(queryClient.getQueryData(announcementChannelsKey(P, A))).toBeUndefined()
    expect(mock.get).toHaveBeenCalledTimes(2)
    await act(async () => settleB(LINKS_B))
    expect(await screen.findByText('announcementChannels.body_telegram')).toBeInTheDocument() // B's own links, B's own ask
    expect(screen.queryByTestId('announcement-join-whatsapp')).toBeNull()

    // A signs back in on the same phone: the dismissal went with the sign-out ⇒ A is asked once more (FS10 (a)'s cost line).
    await act(() => ctx.current!.signOut())
    expect(mock.store.has(announcementCardDismissedKey(B))).toBe(false)
    mock.get.mockResolvedValueOnce(LINKS_A)
    await act(() => ctx.current!.signIn(full(A)))
    await waitFor(() => expect(screen.getByText('announcementChannels.body_whatsapp')).toBeInTheDocument())
  })
})

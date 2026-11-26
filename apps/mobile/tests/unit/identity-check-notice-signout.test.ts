// @vitest-environment jsdom
// Story 3.13a (Task 3; AC4, DL6, N6) — sign-out through the REAL `SessionProvider`, then the next account: the notice is REMOVED from
// the app's REAL query client (spied — the hook's `gcTime: 0` would otherwise hide a missing removal,
// [[project_query_gctime_blinds_removal_tests]]) and the next account's first render shows ⛔ the previous member's reason. Stubbed:
// the transport, SecureStore (`lib/session`), the language sync, and the native / navigator / tamagui primitives (the 5.14 harness).
import '@testing-library/jest-dom/vitest'
import { createElement, useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Notice = { notice: { reason: string } | null }
type Stored = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; memberId: string; pariwarId: string }

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  stored: null as Stored | null,
  get: vi.fn<() => Promise<Notice>>(),
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
vi.mock('../../lib/member-api', () => ({ memberAuth: { memberIdentityCheckNotice: () => mock.get(), logout: () => mock.logout() } }))
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
  useRouter: () => ({ push: () => undefined }),
  useFocusEffect: (cb: () => void) => {
    useEffect(() => cb(), [cb])
  },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return {
    Text: container,
    YStack: container,
    Button: (p: { children: React.ReactNode; onPress?: () => void; testID?: string; accessibilityLabel?: string }) =>
      createElement('button', { onClick: p.onPress, 'data-testid': p.testID, 'aria-label': p.accessibilityLabel }, p.children),
  }
})

import { IdentityCheckNoticeCard } from '../../components/identity-check/IdentityCheckNoticeCard'
import { identityCheckNoticeKey } from '../../components/identity-check/useIdentityCheckNoticeQuery'
import { queryClient } from '../../lib/query-client'
import { SessionProvider, useSession } from '../../lib/session-context'

const P = '00000000-0000-4000-8000-0000000000aa'
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const stored = (memberId: string): Stored => ({ accessToken: `at-${memberId}`, accessTokenExpiresAt: '2026-11-26T12:00:00.000Z', refreshToken: `rt-${memberId}`, memberId, pariwarId: P })
const full = (memberId: string) => ({ sessionType: 'full_session' as const, deviceId: 'd-1', ...stored(memberId) })

const ctx: { current: ReturnType<typeof useSession> | null } = { current: null }
function Home(): ReactNode {
  const session = useSession()
  ctx.current = session
  return session.session === null ? null : createElement(IdentityCheckNoticeCard)
}
const app = () =>
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(SessionProvider, null, createElement(Home))))

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
  vi.restoreAllMocks()
  queryClient.clear()
})

describe('Story 3.13a — sign-out through the real SessionProvider, then the next account (N6)', () => {
  it('⭐ the sign-out REMOVES the notice query (spied), and the next account\'s first render shows ⛔ the previous member\'s reason', async () => {
    mock.get.mockResolvedValueOnce({ notice: { reason: 'details_do_not_match' } })
    app()
    expect(await screen.findByText('identity_check.notice.reason.details_do_not_match')).toBeInTheDocument()
    expect(queryClient.getQueryData(identityCheckNoticeKey(P, A))).toEqual({ notice: { reason: 'details_do_not_match' } })

    const removed = vi.spyOn(queryClient, 'removeQueries')
    await act(() => ctx.current!.signOut())
    expect(mock.logout).toHaveBeenCalledTimes(1)
    expect(removed).toHaveBeenCalledWith({ queryKey: ['identity-check-notice'] })
    expect(queryClient.getQueryCache().findAll({ queryKey: ['identity-check-notice'] })).toHaveLength(0)

    // The next account (B): its read is HELD, so its first render can only show what the cache carried — nothing.
    let settleB: (v: Notice) => void = () => undefined
    mock.get.mockReturnValueOnce(new Promise<Notice>((r) => { settleB = r }))
    await act(() => ctx.current!.signIn(full(B)))
    expect(ctx.current!.session?.memberId).toBe(B)
    expect(screen.queryByTestId('identity-check-notice-card')).toBeNull()
    expect(queryClient.getQueryData(identityCheckNoticeKey(P, A))).toBeUndefined()
    await act(async () => settleB({ notice: { reason: 'member_not_reached' } }))
    expect(await screen.findByText('identity_check.notice.reason.member_not_reached')).toBeInTheDocument() // B's own reason
    await waitFor(() => expect(screen.queryByText('identity_check.notice.reason.details_do_not_match')).toBeNull())
  })
})

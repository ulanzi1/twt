// @vitest-environment jsdom
// Story 3.13a (Task 3; AC4, DL1, DL3, DL6, DL7, DL10) — "We could not confirm your identity yet": the home card and its read,
// EXECUTED against a REAL `QueryClient` (production `retry: 1`; ⛔ refetch on window focus / reconnect) and the REAL
// `t()` in BOTH locales ([[feedback_stub_must_call_not_transcribe]]). Stubbed: the transport, the session, the AppState listener,
// the navigator's focus and the tamagui primitives (the mock FORWARDS `accessibilityLabel` / `accessibilityRole` — #71 (d)).
// Native layout, Hindi wrapping and a real TalkBack still need the device pass (AC9 — a go-live leg).
import '@testing-library/jest-dom/vitest'
import { createElement, useEffect } from 'react'
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t as realT } from '@twt/i18n'

type Notice = { notice: { reason: string } | null }

const mock = vi.hoisted(() => ({
  session: { memberId: 'm-1', pariwarId: 'p-1' } as { memberId: string; pariwarId: string } | null,
  get: vi.fn<() => Promise<Notice>>(),
  appState: new Set<(state: string) => void>(),
  focus: new Set<() => void>(),
  push: vi.fn(),
  locale: 'en' as 'en' | 'hi',
}))

vi.mock('../../lib/member-api', () => ({ memberAuth: { memberIdentityCheckNotice: () => mock.get() } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session, isLoading: false }) }))
vi.mock('@twt/i18n/react', async () => {
  const { t } = await import('@twt/i18n')
  return { useT: () => (key: string, params?: Record<string, unknown>) => t(key, params as never, { locale: mock.locale, namespace: 'common' }) }
})
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_type: 'change', fn: (state: string) => void) => {
      mock.appState.add(fn)
      return { remove: () => void mock.appState.delete(fn) }
    },
  },
}))
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mock.push }),
  useFocusEffect: (cb: () => void) => {
    useEffect(() => {
      mock.focus.add(cb)
      cb()
      return () => void mock.focus.delete(cb)
    }, [cb])
  },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => createElement('div', { 'data-testid': testID }, children)
  return {
    Text: ({ children }: { children?: React.ReactNode }) => createElement('p', null, children),
    YStack: container,
    Button: (p: { children: React.ReactNode; onPress?: () => void; testID?: string; accessibilityLabel?: string; accessibilityRole?: string }) =>
      createElement('button', { onClick: p.onPress, 'data-testid': p.testID, 'aria-label': p.accessibilityLabel, 'data-role': p.accessibilityRole }, p.children),
  }
})

import { IDENTITY_CHECK_HELP_HREF, IdentityCheckNoticeCard } from '../../components/identity-check/IdentityCheckNoticeCard'
import {
  IDENTITY_CHECK_NOTICE_CACHE_OPTIONS,
  clearIdentityCheckNoticeCache,
  identityCheckNoticeKey,
} from '../../components/identity-check/useIdentityCheckNoticeQuery'
import { PEER_REQUEST_DEHYDRATE_OPTIONS } from '../../components/peer-request/peer-request-cache'
import { CALL_TIMEOUT_MS } from '../../lib/with-timeout'

/** ⭐ The reason → how-key map AS RULED (`-508` Q2 (ii)) — a LITERAL, ⛔ read back from the export. */
const HOW_KEY = {
  details_do_not_match: 'identity_check.notice.how_details',
  photo_does_not_match: 'identity_check.notice.how',
  no_document_shown: 'identity_check.notice.how',
  member_not_reached: 'identity_check.notice.how_not_reached',
} as const
const REASONS = Object.keys(HOW_KEY) as (keyof typeof HOW_KEY)[]
const HOW_KEYS = ['identity_check.notice.how', 'identity_check.notice.how_not_reached', 'identity_check.notice.how_details'] as const
const tr = (key: string, locale: 'en' | 'hi') => realT(key, undefined, { locale, namespace: 'common' })

const notice = (reason: string): Notice => ({ notice: { reason } })
const NONE: Notice = { notice: null }
const held = () => {
  let settle: (v: Notice) => void = () => undefined
  let fail: (e: unknown) => void = () => undefined
  const p = new Promise<Notice>((res, rej) => {
    settle = res
    fail = rej
  })
  return { p, settle, fail }
}
const foreground = (state = 'active') => act(() => { for (const fn of mock.appState) fn(state) })
const focus = () => act(() => { for (const fn of mock.focus) fn() })

let client: QueryClient
const app = () =>
  render(createElement(QueryClientProvider, { client }, createElement(IdentityCheckNoticeCard)))
const card = () => screen.queryByTestId('identity-check-notice-card')

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, refetchOnReconnect: false } } })
  mock.session = { memberId: 'm-1', pariwarId: 'p-1' }
  mock.get.mockReset()
  mock.appState.clear()
  mock.focus.clear()
  mock.push.mockClear()
  mock.locale = 'en'
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  client.clear()
})

describe('<IdentityCheckNoticeCard> renders NOTHING unless a SUCCESSFUL read carries a notice (DL6)', () => {
  it('while loading (the read held open), then the card once it settles with a notice (the control)', async () => {
    const h = held()
    mock.get.mockReturnValueOnce(h.p)
    const { container } = app()
    expect(container).toBeEmptyDOMElement()
    await act(async () => h.settle(notice('photo_does_not_match')))
    await waitFor(() => expect(card()).not.toBeNull())
  })

  it('on an error, and on `notice: null`', async () => {
    mock.get.mockRejectedValueOnce(new Error('503'))
    const a = app()
    await waitFor(() => expect(client.getQueryState(identityCheckNoticeKey('p-1', 'm-1'))?.status).toBe('error'))
    expect(a.container).toBeEmptyDOMElement()
    a.unmount()
    mock.get.mockResolvedValueOnce(NONE)
    const b = app()
    await waitFor(() => expect(client.getQueryState(identityCheckNoticeKey('p-1', 'm-1'))?.status).toBe('success'))
    expect(b.container).toBeEmptyDOMElement()
  })

  it('⭐ the STALE-DATA leg — a re-read that FAILS after a success with a notice hides the card (TanStack keeps the old data; mutation: a guard on `data?.notice` alone)', async () => {
    mock.get.mockResolvedValueOnce(notice('details_do_not_match'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    const h = held()
    mock.get.mockReturnValueOnce(h.p)
    await focus()
    expect(card()).not.toBeNull() // in flight with data: still `success`
    await act(async () => h.fail(new Error('network')))
    await waitFor(() => expect(card()).toBeNull())
    expect(client.getQueryState(identityCheckNoticeKey('p-1', 'm-1'))?.status).toBe('error')
    expect(client.getQueryData(identityCheckNoticeKey('p-1', 'm-1'))).toEqual(notice('details_do_not_match')) // the data is KEPT
  })

  it('⭐ a re-read that HANGS past `CALL_TIMEOUT_MS` hides it despite the production client default `retry: 1`', async () => {
    expect(client.getDefaultOptions().queries?.retry).toBe(1)
    mock.get.mockResolvedValueOnce(notice('no_document_shown'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mock.get.mockReturnValueOnce(new Promise<Notice>(() => undefined))
    await foreground('active')
    // TanStack notifies on a `setTimeout(0)` — faked too — so each step drains a few fake ticks.
    const drain = async () => {
      for (let i = 0; i < 5; i += 1) {
        await act(async () => {
          await Promise.resolve()
          vi.advanceTimersByTime(1)
        })
      }
    }
    await act(async () => {
      vi.advanceTimersByTime(CALL_TIMEOUT_MS - 10)
    })
    await drain()
    expect(card()).not.toBeNull() // the control: ⛔ hidden before the bound (5 ms short of it)
    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    await drain()
    expect(client.getQueryState(identityCheckNoticeKey('p-1', 'm-1'))?.status).toBe('error')
    expect(card()).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(CALL_TIMEOUT_MS * 2)
    })
    await drain()
    expect(mock.get).toHaveBeenCalledTimes(2) // mount + one re-read; ⛔ retry after the deadline
  })
})

describe('the words — the REAL `t()`, each reason, both locales (DL3, DL7)', () => {
  for (const locale of ['en', 'hi'] as const) {
    for (const reason of REASONS) {
      it(`[${locale}] ${reason}: the title, exactly ONE reason line (its own), exactly ONE how line (the map's), the action words; ONE button whose label carries all four`, async () => {
        mock.locale = locale
        mock.get.mockResolvedValueOnce(notice(reason))
        app()
        await waitFor(() => expect(card()).not.toBeNull())
        const text = card()!.textContent!
        const title = tr('identity_check.notice.title', locale)
        const reasonLine = tr(`identity_check.notice.reason.${reason}`, locale)
        const how = tr(HOW_KEY[reason], locale)
        const action = tr('identity_check.notice.ask_help', locale)
        expect(screen.getByText(title)).toBeInTheDocument()
        expect(screen.getByText(reasonLine)).toBeInTheDocument()
        expect(screen.getByText(how)).toBeInTheDocument()
        expect(screen.getByText(action)).toBeInTheDocument()
        for (const other of REASONS.filter((r) => r !== reason)) {
          expect(text).not.toContain(tr(`identity_check.notice.reason.${other}`, locale))
        }
        for (const otherHow of HOW_KEYS.filter((k) => k !== HOW_KEY[reason])) {
          expect(screen.queryByText(tr(otherHow, locale))).toBeNull()
        }
        // DL10 — the whole card is ONE button; its label REPLACES the children for TalkBack (read once).
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(1)
        expect(buttons[0]).toHaveAttribute('data-role', 'button')
        expect(buttons[0]).toHaveAttribute('aria-label', `${title}. ${reasonLine} ${how} ${action}`)
      })
    }
  }

  it('the two locales are DISTINCT (the real `t()` is called — a key stub would make them equal)', () => {
    for (const key of ['identity_check.notice.title', ...HOW_KEYS]) expect(tr(key, 'hi')).not.toBe(tr(key, 'en'))
  })
})

describe('the re-read removes the card — mount, home-tab focus, AppState `active` (N6)', () => {
  it('⭐ on MOUNT: a fresh mount re-reads (⛔ the cached notice) and a `null` shows nothing in the tick it settles', async () => {
    mock.get.mockResolvedValueOnce(notice('photo_does_not_match'))
    const first = app()
    await waitFor(() => expect(card()).not.toBeNull())
    first.unmount()
    // `gcTime: 0` — the notice is removed from the client once nothing observes it (⛔ kept for the next mount).
    await waitFor(() => expect(client.getQueryCache().find({ queryKey: identityCheckNoticeKey('p-1', 'm-1') })).toBeUndefined())
    const h = held()
    mock.get.mockReturnValueOnce(h.p)
    const second = app()
    expect(second.container).toBeEmptyDOMElement() // gcTime 0 — ⛔ the old notice on the new mount
    await act(async () => h.settle(NONE))
    await waitFor(() => expect(client.getQueryState(identityCheckNoticeKey('p-1', 'm-1'))?.status).toBe('success'))
    expect(card()).toBeNull()
    expect(mock.get).toHaveBeenCalledTimes(2)
  })

  it('⭐ on home-tab FOCUS: staff confirmed meanwhile ⇒ gone in the tick the re-read settles (the home tab is ⛔ remounted)', async () => {
    mock.get.mockResolvedValueOnce(notice('details_do_not_match'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    const h = held()
    mock.get.mockReturnValueOnce(h.p)
    await focus()
    expect(mock.get).toHaveBeenCalledTimes(2)
    expect(card()).not.toBeNull() // the control: shown while the re-read is in flight
    await act(async () => h.settle(NONE))
    await waitFor(() => expect(card()).toBeNull())
  })

  it('⭐ on AppState `active` (⛔ on `background` / `inactive`): gone in the tick the re-read settles', async () => {
    mock.get.mockResolvedValueOnce(notice('member_not_reached'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    await foreground('background')
    await foreground('inactive')
    expect(mock.get).toHaveBeenCalledTimes(1)
    const h = held()
    mock.get.mockReturnValueOnce(h.p)
    await foreground('active')
    expect(mock.get).toHaveBeenCalledTimes(2)
    expect(card()).not.toBeNull() // the control: shown while the re-read is in flight
    await act(async () => h.settle(NONE))
    await waitFor(() => expect(card()).toBeNull())
  })

  it('a later NEW reason replaces the old one on the next re-read', async () => {
    mock.get.mockResolvedValueOnce(notice('no_document_shown')).mockResolvedValueOnce(notice('member_not_reached'))
    app()
    await waitFor(() => expect(screen.getByText(tr('identity_check.notice.reason.no_document_shown', 'en'))).toBeInTheDocument())
    await focus()
    await waitFor(() => expect(screen.getByText(tr('identity_check.notice.reason.member_not_reached', 'en'))).toBeInTheDocument())
    expect(screen.queryByText(tr('identity_check.notice.reason.no_document_shown', 'en'))).toBeNull()
  })

  it('⛔ a read with no session (disabled) — ⛔ refetched on focus or foreground', async () => {
    mock.session = null
    const { container } = app()
    await foreground('active')
    await focus()
    expect(mock.get).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the cache (N6, F7) and the action (DL8)', () => {
  it('⭐ `{ gcTime: 0, staleTime: 0 }`, keyed by (pariwarId, memberId); the app\'s dehydration filter keeps it OUT of the phone\'s storage (with the control that a default query is kept)', async () => {
    expect(IDENTITY_CHECK_NOTICE_CACHE_OPTIONS).toEqual({ gcTime: 0, staleTime: 0 })
    expect(identityCheckNoticeKey('p-1', 'm-1')).toEqual(['identity-check-notice', 'v1', 'p-1', 'm-1'])
    mock.get.mockResolvedValueOnce(notice('details_do_not_match'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    const q = client.getQueryCache().find({ queryKey: identityCheckNoticeKey('p-1', 'm-1') })!
    expect(q.options.gcTime).toBe(0)
    client.setQueryData(['some-default-query'], { x: 1 })
    const kept = dehydrate(client, PEER_REQUEST_DEHYDRATE_OPTIONS).queries.map((x) => x.queryKey[0])
    expect(kept).toContain('some-default-query') // the control
    expect(kept).not.toContain('identity-check-notice')
  })

  it('`clearIdentityCheckNoticeCache` removes every notice query (spied — `gcTime` would hide a missing removal)', async () => {
    mock.get.mockResolvedValueOnce(notice('details_do_not_match'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    const spy = vi.spyOn(client, 'removeQueries')
    clearIdentityCheckNoticeCache(client)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['identity-check-notice'] })
    expect(client.getQueryCache().findAll({ queryKey: ['identity-check-notice'] })).toHaveLength(0)
  })

  it('⭐ pressing the card opens the help form with `kyc-trouble` preselected', async () => {
    mock.get.mockResolvedValueOnce(notice('photo_does_not_match'))
    app()
    await waitFor(() => expect(card()).not.toBeNull())
    fireEvent.click(card()!)
    expect(mock.push).toHaveBeenCalledWith({ pathname: '/(helpdesk)/new', params: { category: 'kyc-trouble' } })
    expect(IDENTITY_CHECK_HELP_HREF).toEqual({ pathname: '/(helpdesk)/new', params: { category: 'kyc-trouble' } })
  })
})


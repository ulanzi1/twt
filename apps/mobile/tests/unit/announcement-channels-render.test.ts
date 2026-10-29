// @vitest-environment jsdom
// Story 5.14 (Task 7; AC8, AC9; `2026-10-29-417` FS9–FS12; I7) — the ONE calm ask: the home card, the settings entry and the screen,
// EXECUTED with React DOM and mocked native primitives (the 6.36c harness): the real components, the real dismissal store (over an
// in-memory MMKV) and the real body chooser run. Native layout, Hindi wrapping and a real screen reader still need a device
// ([[feedback_record_unattested_no_backfill]]).
// Code review group 3: G3-P1 (link_error SPOKEN once per failure), G3-P3 ("Not now" accessible), G3-P4 (held data + isError ⇒ nothing),
// G3-P5 (the screen's Spinner), G3-P6 (the screen's open dismisses the card), G3-P7 (a throwing MMKV write; `onOpened` outside the try).
// Fix-diff review: FM-1 (a card mounted beneath the screen re-reads its dismissal on focus), FM-2 (link_error spoken where it is set —
// ⛔ on reappearance — and cleared by a later read), FM-3 (an `onOpened` throw is caught and logged at the call site).
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  query: { data: undefined } as { data: unknown; isError?: boolean; isLoading?: boolean; dataUpdatedAt?: number },
  memberId: 'm-1',
  failWrites: false,
  openURL: vi.fn<(url: string) => Promise<void>>(),
  announce: vi.fn<(text: string) => void>(),
  push: vi.fn(),
  focus: new Set<() => void>(),
}))

vi.mock('../../components/announcement-channels/useAnnouncementChannelsQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/announcement-channels/useAnnouncementChannelsQuery')>()
  return { ...actual, useAnnouncementChannelsQuery: () => mock.query }
})
vi.mock('../../lib/member-api', () => ({ memberAuth: {} }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: mock.memberId, pariwarId: 'p-1' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (mock.failWrites) throw new Error('mmkv write failed')
      mock.store.set(k, v)
    },
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
// The navigator's focus: the callback runs on mount, and again on each `focus()` below (FM-1).
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    useRouter: () => ({ push: mock.push }),
    Stack: { Screen: () => null },
    useFocusEffect: (cb: () => void) => {
      useEffect(() => {
        mock.focus.add(cb)
        cb()
        return () => void mock.focus.delete(cb)
      }, [cb])
    },
  }
})
vi.mock('react-native', () => ({
  Linking: { openURL: mock.openURL },
  ScrollView: ({ children }: { children?: React.ReactNode }) => children,
  AccessibilityInfo: { announceForAccessibility: mock.announce },
  Platform: { OS: 'android' },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, testID, accessibilityRole }: { children?: React.ReactNode; testID?: string; accessibilityRole?: string }) =>
    createElement('div', { 'data-testid': testID, 'data-role': accessibilityRole }, children)
  return {
    Text: container,
    Paragraph: container,
    H2: container,
    YStack: container,
    Spinner: ({ testID }: { testID?: string }) => createElement('div', { 'data-testid': testID }),
    Button: (p: { children: React.ReactNode; onPress?: () => void; testID?: string; accessible?: boolean; accessibilityRole?: string; accessibilityLabel?: string; disabled?: boolean }) =>
      createElement(
        'button',
        { onClick: p.onPress, 'data-testid': p.testID, 'data-accessible': String(p.accessible), 'data-role': p.accessibilityRole, 'aria-label': p.accessibilityLabel, disabled: p.disabled },
        p.children,
      ),
  }
})

import AnnouncementChannelsScreen from '../../app/(settings)/announcement-channels'
import { ChannelLinkButtons, openChannelLink } from '../../components/announcement-channels/ChannelLinkButtons'
import { AnnouncementChannelsCard } from '../../components/home/AnnouncementChannelsCard'
import { AnnouncementChannelsEntry } from '../../components/notifications/AnnouncementChannelsEntry'
import { announcementCardDismissedKey } from '../../lib/announcement-channels-dismissal'

const WA = 'https://whatsapp.com/channel/0029Va'
const TG = 'https://t.me/twt_bihar_notices'
const links = (whatsappChannelUrl: string | null, telegramChannelUrl: string | null, dataUpdatedAt = 1) =>
  ({ data: { whatsappChannelUrl, telegramChannelUrl }, isError: false, dataUpdatedAt })
const focus = () => act(() => { for (const fn of mock.focus) fn() })
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

beforeEach(() => {
  mock.store.clear()
  mock.memberId = 'm-1'
  mock.failWrites = false
  mock.openURL.mockReset()
  mock.openURL.mockResolvedValue(undefined)
  mock.announce.mockClear()
  mock.push.mockClear()
  mock.focus.clear()
})
afterEach(cleanup)

describe('<AnnouncementChannelsCard> (AC8)', () => {
  it('renders NOTHING while loading, on error, when both links are null (the channels off), or once dismissed', () => {
    // G3-P4 — `{ data, isError: true }`: a FAILED refetch keeps the held links; they are ⛔ shown.
    for (const q of [{ data: undefined }, { data: undefined, isError: true }, { ...links(WA, TG), isError: true }, links(null, null)]) {
      mock.query = q
      const { container, unmount } = render(createElement(AnnouncementChannelsCard))
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
    mock.store.set(announcementCardDismissedKey('m-1'), '2026-10-29T00:00:00.000Z')
    mock.query = links(WA, TG)
    expect(render(createElement(AnnouncementChannelsCard)).container).toBeEmptyDOMElement()
  })

  it('⭐ I7 — the body names only the channels with a link; one equal button per link, each an accessible LINK with its label', () => {
    for (const [q, body, ids] of [
      [links(WA, TG), 'announcementChannels.body_both', ['announcement-join-whatsapp', 'announcement-join-telegram']],
      [links(WA, null), 'announcementChannels.body_whatsapp', ['announcement-join-whatsapp']],
      [links(null, TG), 'announcementChannels.body_telegram', ['announcement-join-telegram']],
    ] as const) {
      mock.query = q
      const { unmount } = render(createElement(AnnouncementChannelsCard))
      expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
      expect(screen.getByText(body)).toBeInTheDocument()
      const joins = screen.getAllByRole('button').filter((b) => b.getAttribute('data-testid')?.startsWith('announcement-join-'))
      expect(joins.map((b) => b.getAttribute('data-testid'))).toEqual(ids)
      for (const b of joins) {
        expect(b).toHaveAttribute('data-accessible', 'true')
        expect(b).toHaveAttribute('data-role', 'link')
        expect(b.getAttribute('aria-label')).toMatch(/^announcementChannels\.join_(whatsapp|telegram)$/)
      }
      // G3-P3 — "Not now" is an accessibility element (its role and label reach the screen reader).
      const notNow = screen.getByRole('button', { name: 'announcementChannels.not_now' })
      expect(notNow).toHaveAttribute('data-accessible', 'true')
      expect(notNow).toHaveAttribute('data-role', 'button')
      unmount()
    }
  })

  it('⭐ FS10 — "Not now" hides it at once and FOR GOOD on this phone for this account; another account on the phone is asked once too', () => {
    mock.query = links(WA, TG)
    const { container, unmount } = render(createElement(AnnouncementChannelsCard))
    fireEvent.click(screen.getByRole('button', { name: 'announcementChannels.not_now' }))
    expect(container).toBeEmptyDOMElement()
    unmount()
    expect(render(createElement(AnnouncementChannelsCard)).container).toBeEmptyDOMElement()
    cleanup()
    mock.memberId = 'm-2'
    render(createElement(AnnouncementChannelsCard))
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
  })

  it('⭐ a join button dismisses only AFTER openURL resolves; a REJECTED openURL shows link_error and keeps the card', async () => {
    mock.query = links(WA, TG)
    let resolveOpen: () => void = () => undefined
    mock.openURL.mockImplementationOnce((url) => {
      expect(url).toBe(TG)
      return new Promise<void>((r) => { resolveOpen = r })
    })
    const { container } = render(createElement(AnnouncementChannelsCard))
    fireEvent.click(screen.getByTestId('announcement-join-telegram'))
    await flush()
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument() // still pending: ⛔ dismissed yet
    resolveOpen()
    await flush()
    expect(container).toBeEmptyDOMElement()
    cleanup()
    mock.store.clear()
    mock.openURL.mockRejectedValueOnce(new Error('no handler'))
    render(createElement(AnnouncementChannelsCard))
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(screen.getByTestId('announcement-link-error')).toHaveTextContent('announcementChannels.link_error')
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
    expect(mock.store.size).toBe(0)
  })

  it('⭐ G3-P1 — link_error is SPOKEN once per failure, a REPEAT failure (the same words) included; ⛔ on a re-render', async () => {
    mock.query = links(WA, TG)
    mock.openURL.mockRejectedValue(new Error('no handler'))
    const { rerender } = render(createElement(AnnouncementChannelsCard))
    expect(mock.announce).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(mock.announce.mock.calls).toEqual([['announcementChannels.link_error']])
    expect(screen.getByTestId('announcement-link-error')).toHaveAttribute('data-role', 'alert')
    rerender(createElement(AnnouncementChannelsCard))
    expect(mock.announce).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('announcement-join-telegram'))
    await flush()
    expect(mock.announce).toHaveBeenCalledTimes(2)
    expect(screen.getAllByTestId('announcement-link-error')).toHaveLength(1)
  })

  it('⭐ G3-P7 — "Not now" hides the card at once even when the MMKV write THROWS', () => {
    mock.query = links(WA, TG)
    mock.failWrites = true
    const { container } = render(createElement(AnnouncementChannelsCard))
    fireEvent.click(screen.getByRole('button', { name: 'announcementChannels.not_now' }))
    expect(container).toBeEmptyDOMElement()
    expect(mock.store.size).toBe(0) // nothing persisted: a later mount may show it once more (FS10 (a)'s accepted cost)
  })

  it('⭐ FM-2 — ⛔ a stale link_error is announced or shown when the card reappears after hiding on isError', async () => {
    mock.query = links(WA, TG)
    mock.openURL.mockRejectedValueOnce(new Error('no handler'))
    const { container, rerender } = render(createElement(AnnouncementChannelsCard))
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(mock.announce).toHaveBeenCalledTimes(1)
    mock.query = { ...links(WA, TG), isError: true } // a failed refetch: the card hides (G3-P4)
    rerender(createElement(AnnouncementChannelsCard))
    expect(container).toBeEmptyDOMElement()
    mock.query = links(WA, TG, 2) // the read recovers
    rerender(createElement(AnnouncementChannelsCard))
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
    expect(screen.queryByTestId('announcement-link-error')).toBeNull()
    expect(mock.announce).toHaveBeenCalledTimes(1) // ⛔ re-announced with no tap
  })

  it('⭐ FM-2 — the error line belongs to the read it failed on: a corrected link clears it (card and screen)', async () => {
    for (const surface of [AnnouncementChannelsCard, AnnouncementChannelsScreen]) {
      mock.query = links(WA, null)
      mock.openURL.mockRejectedValueOnce(new Error('no handler'))
      const { rerender } = render(createElement(surface))
      fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
      await flush()
      expect(screen.getByTestId('announcement-link-error')).toBeInTheDocument()
      rerender(createElement(surface)) // the same read: the line stays
      expect(screen.getByTestId('announcement-link-error')).toBeInTheDocument()
      mock.query = links('https://whatsapp.com/channel/0029Vb', null, 2)
      rerender(createElement(surface))
      expect(screen.getByTestId('announcement-join-whatsapp')).toBeInTheDocument()
      expect(screen.queryByTestId('announcement-link-error')).toBeNull()
      cleanup()
    }
    expect(mock.announce).toHaveBeenCalledTimes(2) // once per failure, ⛔ again on the new read
  })

  it('⭐ FM-3 — an `onOpened` throw is caught at the call site and LOGGED (⛔ the link), ⛔ link_error, ⛔ an unhandled rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const onFailed = vi.fn()
    render(createElement(ChannelLinkButtons, { links: links(WA, null).data, onOpened: () => { throw new Error('boom') }, onFailed }))
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(onFailed).not.toHaveBeenCalled()
    expect(warn.mock.calls).toEqual([['[announcement-channels] after-open step failed: boom']])
    expect(String(warn.mock.calls[0])).not.toContain(WA)
    warn.mockRestore()
  })

  it('⭐ G3-P7 — `onOpened` runs OUTSIDE the openURL try: its throw is ⛔ reported as a link that could not open', async () => {
    const onFailed = vi.fn()
    const boom = new Error('onOpened threw')
    await expect(openChannelLink(WA, () => { throw boom }, onFailed, () => Promise.resolve())).rejects.toBe(boom)
    expect(onFailed).not.toHaveBeenCalled()
    const onOpened = vi.fn()
    await openChannelLink(WA, onOpened, onFailed, () => Promise.reject(new Error('no handler')))
    expect(onOpened).not.toHaveBeenCalled()
    expect(onFailed).toHaveBeenCalledTimes(1)
  })
})

describe('<AnnouncementChannelsEntry> and the screen (AC9)', () => {
  it('the entry shows only while a link exists (whatever the card\'s dismissal) and opens the screen', () => {
    mock.query = links(null, null)
    expect(render(createElement(AnnouncementChannelsEntry)).container).toBeEmptyDOMElement()
    cleanup()
    mock.store.set(announcementCardDismissedKey('m-1'), 'x')
    mock.query = links(WA, null)
    render(createElement(AnnouncementChannelsEntry))
    const entry = screen.getByRole('button', { name: 'announcementChannels.entry_label' })
    expect(entry).toHaveAttribute('data-accessible', 'true')
    fireEvent.click(entry)
    expect(mock.push).toHaveBeenCalledWith('/(settings)/announcement-channels')
    cleanup()
    // G3-P4 — a failed refetch's held link is ⛔ offered.
    mock.query = { ...links(WA, null), isError: true }
    expect(render(createElement(AnnouncementChannelsEntry)).container).toBeEmptyDOMElement()
  })

  it('the screen shows the title, the body variant and the join buttons; a failed open shows link_error', async () => {
    mock.query = links(WA, TG)
    mock.openURL.mockRejectedValueOnce(new Error('no handler'))
    render(createElement(AnnouncementChannelsScreen))
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
    expect(screen.getByText('announcementChannels.body_both')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'announcementChannels.not_now' })).toBeNull()
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(screen.getByTestId('announcement-link-error')).toBeInTheDocument()
    cleanup()
    mock.query = links(null, null)
    render(createElement(AnnouncementChannelsScreen))
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('⭐ G3-P5 / G3-P4 — a Spinner while the first read is in flight; the title alone (⛔ a held link) after a failed refetch', () => {
    // The real in-flight shape ([[project_tanstack_refetch_resets_pending_without_data]]).
    mock.query = { data: undefined, isError: false, isLoading: true }
    render(createElement(AnnouncementChannelsScreen))
    expect(screen.getByTestId('announcement-channels-loading')).toBeInTheDocument()
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
    cleanup()
    mock.query = { ...links(WA, TG), isError: true }
    render(createElement(AnnouncementChannelsScreen))
    expect(screen.getByText('announcementChannels.card_title')).toBeInTheDocument()
    expect(screen.queryByText('announcementChannels.body_both')).toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByTestId('announcement-channels-loading')).toBeNull()
  })

  it('⭐ G3-P6 — a successful open from the screen writes the SAME dismissal as the card (FS10); a failed one ⛔ writes it', async () => {
    mock.query = links(WA, TG)
    mock.openURL.mockRejectedValueOnce(new Error('no handler'))
    render(createElement(AnnouncementChannelsScreen))
    fireEvent.click(screen.getByTestId('announcement-join-whatsapp'))
    await flush()
    expect(mock.store.size).toBe(0)
    expect(mock.announce).toHaveBeenCalledTimes(1) // G3-P1 on the screen too
    fireEvent.click(screen.getByTestId('announcement-join-telegram'))
    await flush()
    expect([...mock.store.keys()]).toEqual([announcementCardDismissedKey('m-1')])
    expect(screen.queryByTestId('announcement-link-error')).toBeNull()
    cleanup()
    render(createElement(AnnouncementChannelsCard))
    expect(screen.queryByText('announcementChannels.card_title')).toBeNull()
  })

  it('⭐ FM-1 — a home card that STAYS MOUNTED beneath the screen is hidden when home regains focus after an open there', async () => {
    mock.query = links(WA, TG)
    render(
      createElement(
        'div',
        null,
        createElement('div', { 'data-testid': 'home' }, createElement(AnnouncementChannelsCard)),
        createElement('div', { 'data-testid': 'settings' }, createElement(AnnouncementChannelsScreen)),
      ),
    )
    const home = screen.getByTestId('home')
    expect(within(home).getByText('announcementChannels.card_title')).toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId('settings')).getByTestId('announcement-join-telegram'))
    await flush()
    expect(mock.store.has(announcementCardDismissedKey('m-1'))).toBe(true)
    // The same query data (structural sharing) ⇒ nothing re-renders the card until home is focused again.
    expect(within(home).getByText('announcementChannels.card_title')).toBeInTheDocument()
    await focus()
    expect(home).toBeEmptyDOMElement()
  })
})

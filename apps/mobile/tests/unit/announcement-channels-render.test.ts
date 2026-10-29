// @vitest-environment jsdom
// Story 5.14 (Task 7; AC8, AC9; `2026-10-29-417` FS9–FS12; I7) — the ONE calm ask: the home card, the settings entry and the screen,
// EXECUTED with React DOM and mocked native primitives (the 6.36c harness): the real components, the real dismissal store (over an
// in-memory MMKV) and the real body chooser run. Native layout, Hindi wrapping and a real screen reader still need a device
// ([[feedback_record_unattested_no_backfill]]).
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  query: { data: undefined } as { data: unknown; isError?: boolean },
  memberId: 'm-1',
  openURL: vi.fn<(url: string) => Promise<void>>(),
  push: vi.fn(),
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
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mock.push }), Stack: { Screen: () => null } }))
vi.mock('react-native', () => ({ Linking: { openURL: mock.openURL }, ScrollView: ({ children }: { children?: React.ReactNode }) => children }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, testID, accessibilityRole }: { children?: React.ReactNode; testID?: string; accessibilityRole?: string }) =>
    createElement('div', { 'data-testid': testID, 'data-role': accessibilityRole }, children)
  return {
    Text: container,
    Paragraph: container,
    H2: container,
    YStack: container,
    Button: (p: { children: React.ReactNode; onPress?: () => void; testID?: string; accessible?: boolean; accessibilityRole?: string; accessibilityLabel?: string; disabled?: boolean }) =>
      createElement(
        'button',
        { onClick: p.onPress, 'data-testid': p.testID, 'data-accessible': String(p.accessible), 'data-role': p.accessibilityRole, 'aria-label': p.accessibilityLabel, disabled: p.disabled },
        p.children,
      ),
  }
})

import AnnouncementChannelsScreen from '../../app/(settings)/announcement-channels'
import { AnnouncementChannelsCard } from '../../components/home/AnnouncementChannelsCard'
import { AnnouncementChannelsEntry } from '../../components/notifications/AnnouncementChannelsEntry'
import { announcementCardDismissedKey } from '../../lib/announcement-channels-dismissal'

const WA = 'https://whatsapp.com/channel/0029Va'
const TG = 'https://t.me/twt_bihar_notices'
const links = (whatsappChannelUrl: string | null, telegramChannelUrl: string | null) => ({ data: { whatsappChannelUrl, telegramChannelUrl }, isError: false })
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

beforeEach(() => {
  mock.store.clear()
  mock.memberId = 'm-1'
  mock.openURL.mockReset()
  mock.openURL.mockResolvedValue(undefined)
  mock.push.mockClear()
})
afterEach(cleanup)

describe('<AnnouncementChannelsCard> (AC8)', () => {
  it('renders NOTHING while loading, on error, when both links are null (the channels off), or once dismissed', () => {
    for (const q of [{ data: undefined }, { data: undefined, isError: true }, links(null, null)]) {
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
      expect(screen.getByRole('button', { name: 'announcementChannels.not_now' })).toBeInTheDocument()
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
})

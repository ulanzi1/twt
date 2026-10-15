// @vitest-environment jsdom
// Story 6.36b review round 2 — the FIND screen, EXECUTED with React DOM and mocked native primitives (the
// `known-people-screen-render` harness; ⛔ it had no render test, so FD-4's "announcements proven in jsdom" never reached
// it): the real handlers and branches run; native layout and an actual screen reader still need a device
// ([[feedback_record_unattested_no_backfill]]).
//   · P2 — every outcome is SHOWN AND SPOKEN (the announce call on iOS); the contacts path's success is HANDED to the
//     people screen as the find screen goes back;
//   · P8 — the slots wait for the namer's list (⛔ "You have named three people" while it loads); a partial failure
//     unticks the ones already asked;
//   · P10 — a picked contact with ⛔ Indian mobile, and a search that matches nobody, each SAY so;
//   · P11 — a busy button keeps its accessible name; P12 — ⛔ a saved name written after the screen has gone.
import '@testing-library/jest-dom/vitest'
import { createElement, Fragment } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  announce: vi.fn(),
  ask: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  handed: vi.fn(),
  read: vi.fn(),
  pick: vi.fn(),
  shareMore: vi.fn(),
  match: vi.fn(),
  platform: 'ios',
  mine: null as unknown,
}))

class FakeApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({
  useMyKnownPeopleQuery: () => mock.mine,
  useKnownPeopleWrites: () => ({ ask: { mutateAsync: mock.ask }, refresh: mock.refresh }),
  errorCodeOf: (e: unknown) => (e instanceof FakeApiError ? e.code : undefined),
}))
vi.mock('../../lib/known-people-contacts', () => ({
  readContactsForMatching: mock.read,
  pickOneContact: mock.pick,
  shareMoreContacts: mock.shareMore,
}))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: { contactMatches: mock.match } }))
vi.mock('../../lib/known-people-notice', () => ({ handKnownPeopleNotice: mock.handed }))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ back: mock.back, push: vi.fn() }) }))
vi.mock('../../lib/known-people-i18n', () => ({
  useKnownPeopleT: () => (key: string, params?: Record<string, unknown>) =>
    params?.['name'] ? `${key}:${String(params['name'])}` : params?.['count'] !== undefined ? `${key}:${String(params['count'])}` : key,
}))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => 'k' }))
vi.mock('../../lib/trust-name', () => ({ configuredTrustName: () => null }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: {
      get OS() {
        return mock.platform
      },
    },
    Share: { share: vi.fn(async () => ({})) },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('@shopify/flash-list', async () => {
  const { createElement } = await import('react')
  return {
    FlashList: ({ data, renderItem, keyExtractor, extraData }: { data: unknown[]; renderItem: (a: { item: unknown; index: number }) => React.ReactNode; keyExtractor: (i: unknown) => string; extraData?: unknown }) =>
      createElement(
        'div',
        { 'data-testid': 'flash-list', 'data-extra': extraData === undefined ? undefined : JSON.stringify(extraData, (_k, v: unknown) => (v instanceof Set ? [...v] : v)) },
        data.map((item, index) => createElement(Fragment, { key: keyExtractor(item) }, renderItem({ item, index }))),
      ),
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole }: { children?: React.ReactNode; accessibilityRole?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined }, children)
  return {
    H2: container, H3: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Input: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: { target: { value: string } }) => onChangeText(e.target.value) }),
    Button: ({ children, onPress, disabled, accessibilityLabel, accessibilityRole, accessibilityState }: {
      children: React.ReactNode
      onPress?: () => void
      disabled?: boolean
      accessibilityLabel?: string
      accessibilityRole?: string
      accessibilityState?: { checked?: boolean }
    }) =>
      createElement(
        'button',
        {
          onClick: onPress,
          disabled,
          'aria-label': accessibilityLabel,
          role: accessibilityRole === 'checkbox' ? 'checkbox' : undefined,
          'aria-checked': accessibilityRole === 'checkbox' ? Boolean(accessibilityState?.checked) : undefined,
        },
        children,
      ),
  }
})

import KnownPeopleFindScreen from '../../app/(life-events)/known-people-find'
import { clearSavedNames, loadSavedNames } from '../../lib/known-people-saved-names'

const entry = (savedName: string, digit: string) => ({ key: `+9198765432${digit}0`, savedName, number: `+9198765432${digit}0` })
const CHECKED = [entry('Meena', '1'), entry('Ravi', '2'), entry('Sita', '3')]

function mineQuery(data: unknown, over: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, isFetching: false, error: null, errorUpdatedAt: 0, refetch: vi.fn(), ...over }
}

beforeEach(() => {
  mock.store.clear()
  mock.platform = 'ios'
  mock.mine = mineQuery({ items: [], freeSlots: 3 })
  mock.read.mockResolvedValue({ kind: 'read', access: 'all', prepared: { checked: CHECKED, truncated: false } })
  mock.match.mockResolvedValue({ matched: [0, 1] })
  mock.ask.mockImplementation(async (v: { mobile: string }) => ({ link: { linkId: `link-${v.mobile}`, label: 'asked', name: null, askedAt: '2026-10-15T00:00:00.000Z' } }))
  mock.refresh.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function toMatches(): Promise<void> {
  render(createElement(KnownPeopleFindScreen))
  await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
  await screen.findByText('find.matches_heading')
}

describe('P2 — every outcome is shown AND spoken', () => {
  it('the matches phase is announced; the contacts path\'s success is HANDED to the people screen as it goes back', async () => {
    await toMatches()
    expect(mock.announce).toHaveBeenCalledWith('find.checking')
    // the real count, and the slots as they stood when the matches appeared (ONE announcement — round 5)
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 find.select_hint:3')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.handed).toHaveBeenCalledWith('find.sent') // ⛔ a message set on a screen that is going away
    expect(mock.ask).toHaveBeenCalledWith({ mobile: CHECKED[0]!.number, foundBy: 'contacts', idempotencyKey: 'k' })
  })

  it('no matches is announced too', async () => {
    mock.match.mockResolvedValue({ matched: [] })
    await toMatches()
    expect(screen.getByText('find.no_matches')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('find.no_matches')
  })

  it('a refused check is SPOKEN as an alert (⛔ a bare role="alert")', async () => {
    mock.match.mockRejectedValue(new FakeApiError(429, 'known_people.daily_limit'))
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.daily_limit')
    expect(mock.announce).toHaveBeenCalledWith('error.daily_limit')
  })

  it('a denied permission says so (spoken) and offers the iOS picker', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    expect(await screen.findByText('find.permission_denied')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('find.permission_denied')
    expect(screen.getByRole('button', { name: 'action.choose_contact' })).toBeInTheDocument()
  })

  it('"We checked 1,000" and "Only the contacts you shared" are spoken IN the phase\'s ONE announcement (iOS interrupts a second)', async () => {
    mock.read.mockResolvedValue({ kind: 'read', access: 'limited', prepared: { checked: CHECKED, truncated: true } })
    await toMatches()
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 find.checked_limit find.limited_access find.select_hint:3')
    expect(mock.announce).not.toHaveBeenCalledWith('find.checked_limit') // ⛔ a separate call that would cut the count off
    expect(screen.getByText('find.checked_limit')).toBeInTheDocument()
    expect(screen.getByText('find.limited_access')).toBeInTheDocument()
  })
})

describe('P8 — the slots', () => {
  it('while the namer\'s list loads: a spinner — ⛔ "You have named three people", and ⛔ a tick taken (the boxes are disabled)', async () => {
    mock.mine = mineQuery(undefined, { isLoading: true })
    await toMatches()
    expect(screen.queryByText('list.full')).toBeNull()
    expect(screen.getAllByText('spinner').length).toBeGreaterThan(0)
    const box = screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' })
    expect(box).toBeDisabled()
    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-checked', 'false')
  })

  it('a failed list says so with a Retry; a denied one says "not available"', async () => {
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3 })
    await toMatches()
    expect(screen.getByText('error.load')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument()
    cleanup()
    mock.mine = mineQuery({ items: [], freeSlots: 0, denied: true })
    await toMatches()
    expect(screen.getByText('error.not_available')).toBeInTheDocument()
    expect(screen.queryByText('list.full')).toBeNull()
  })

  it('a partial failure UNTICKS the ones already asked (⛔ a second ask spent on them); a limit STOP drops every tick, and speaks the refusal', async () => {
    mock.ask.mockImplementation(async (v: { mobile: string }) => {
      if (v.mobile === CHECKED[1]!.number) throw new FakeApiError(409, 'known_people.limit_reached')
      return { link: { linkId: 'l-meena', label: 'asked', name: null, askedAt: '2026-10-15T00:00:00.000Z' } }
    })
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    // the message says BOTH what landed and what was refused (⛔ the refusal alone, as if nothing had been asked)
    expect(await screen.findByRole('alert')).toHaveTextContent('find.sent error.limit_reached')
    expect(mock.announce).toHaveBeenCalledWith('find.sent error.limit_reached')
    expect(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' })).toHaveAttribute('aria-checked', 'false')
    // ⭐ round 4 supersedes "Ravi stays ticked": `limit_reached` STOPS the send and drops every tick (it cannot be asked now)
    expect(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' })).toHaveAttribute('aria-checked', 'false')
    expect(mock.back).not.toHaveBeenCalled()
    expect(loadSavedNames('m')).toEqual({ 'l-meena': 'Meena' })
  })
})

describe('P10 / P11 / P12', () => {
  it('P10 — a search that matches nobody SAYS so, outside the list', async () => {
    await toMatches()
    await userEvent.type(screen.getByRole('textbox', { name: 'find.search' }), 'zzz')
    expect(screen.getByText('find.no_search_results')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0) // ⛔ the matches list (the invite list is a separate one)
    await userEvent.clear(screen.getByRole('textbox', { name: 'find.search' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(2) // a positive control — the list comes back
  })

  it('P10 — a picked contact with ⛔ Indian mobile SAYS so (⛔ a silent tap)', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    mock.pick.mockResolvedValue({ checked: [], truncated: false })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await userEvent.click(await screen.findByRole('button', { name: 'action.choose_contact' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('find.no_mobile')
    expect(mock.announce).toHaveBeenCalledWith('find.no_mobile')
    expect(mock.ask).not.toHaveBeenCalled()
  })

  it('P11 — "Ask them" keeps its accessible name while busy (its text is a spinner)', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementation(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l1', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    const busy = screen.getByRole('button', { name: 'find.send' })
    expect(busy).toHaveTextContent('spinner')
    expect(busy).toBeDisabled()
    finish()
    await waitFor(() => expect(mock.back).toHaveBeenCalled())
  })

  it('P12 — an ask that lands after a SIGN-OUT (the saved names cleared) writes ⛔ saved name back', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementation(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l-late', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    clearSavedNames() // the sign-out (or a rejected refresh), while the ask is in flight
    finish()
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled())
    expect(loadSavedNames('m')).toEqual({})
  })

  it('P12 — an ask that lands after an ordinary BACK still keeps its saved name; the gone screen ⛔ navigates or hands a notice', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementation(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l-back', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    cleanup() // Back — the screen unmounted with the ask still in flight
    finish()
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSavedNames('m')).toEqual({ 'l-back': 'Meena' })
    expect(mock.back).not.toHaveBeenCalled() // ⛔ a pop of whatever is on top now
    expect(mock.handed).not.toHaveBeenCalled()
  })

  it('a person ALREADY on the list (a 200 accepted / unavailable) is ⛔ "Asked." — nothing new was asked; ⛔ back', async () => {
    mock.ask.mockResolvedValue({ link: { linkId: 'l-old', label: 'accepted', name: 'Meena K.', askedAt: 'x' } })
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByText('find.already_listed')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('find.already_listed')
    expect(mock.back).not.toHaveBeenCalled()
    expect(mock.handed).not.toHaveBeenCalled()
    expect(loadSavedNames('m')).toEqual({}) // ⛔ a saved name over a registered one
    expect(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' })).toHaveAttribute('aria-checked', 'false')
  })

  it('P10 — the empty-search line is SPOKEN', async () => {
    await toMatches()
    await userEvent.type(screen.getByRole('textbox', { name: 'find.search' }), 'zzz')
    expect(mock.announce).toHaveBeenCalledWith('find.no_search_results')
  })
})

describe('fix-diff review round 2', () => {
  it('a reply for a link that ENDED meanwhile (not_accepted) says "changed" — ⛔ "Asked." or "already on your list"', async () => {
    mock.ask.mockResolvedValue({ link: { linkId: 'l-gone', label: 'not_accepted', name: null, askedAt: 'x' } })
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.changed')
    expect(mock.back).not.toHaveBeenCalled()
  })

  it('"Ask them" is disabled once more are ticked than the free slots (a reload lowered them) — ⛔ asks spent on a sure refusal', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 2 })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    expect(screen.getByRole('button', { name: 'find.send' })).toBeEnabled()
    mock.mine = mineQuery({ items: [], freeSlots: 1 })
    view.rerender(createElement(KnownPeopleFindScreen))
    expect(screen.getByRole('button', { name: 'find.send' })).toBeDisabled()
  })

  it('a failed namer\'s list is spoken IN the phase\'s one announcement — ⛔ a second announcing line in that commit', async () => {
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3 })
    await toMatches()
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 error.load')
    expect(mock.announce).not.toHaveBeenCalledWith('error.load')
    expect(screen.getByText('error.load')).toBeInTheDocument()
  })

  it('Back mid-send STOPS the loop — ⛔ asks spent on outcomes nobody will see', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l1', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    cleanup() // Back, with the first ask in flight
    finish()
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled())
    expect(mock.ask).toHaveBeenCalledTimes(1)
  })

  it('a SIGN-OUT mid-send stops the loop, and ⛔ notice is handed or Back taken for the old account', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l1', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    clearSavedNames() // the sign-out
    finish()
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled())
    expect(mock.ask).toHaveBeenCalledTimes(1)
    expect(mock.handed).not.toHaveBeenCalled()
    expect(mock.back).not.toHaveBeenCalled()
  })

  it('the outcome is ⛔ held behind the lists\' reload (a reload that never settles still lets the success land)', async () => {
    mock.refresh.mockReturnValue(new Promise(() => undefined)) // a reload that never settles
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.handed).toHaveBeenCalledWith('find.sent')
  })
})

describe('fix-diff review round 3', () => {
  it('a re-check starts UNFILTERED (the search is reset — ⛔ an empty-search line in the phase\'s commit)', async () => {
    mock.read.mockResolvedValue({ kind: 'read', access: 'limited', prepared: { checked: CHECKED, truncated: false } })
    mock.shareMore.mockResolvedValue(true)
    await toMatches()
    await userEvent.type(screen.getByRole('textbox', { name: 'find.search' }), 'zzz')
    expect(screen.getByText('find.no_search_results')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'find.add_more' }))
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(2))
    expect(screen.getByRole('textbox', { name: 'find.search' })).toHaveValue('')
  })

  it('a limit_reached refusal STOPS the send — ⛔ more asks spent on a sure refusal', async () => {
    mock.match.mockResolvedValue({ matched: [0, 1, 2] })
    mock.ask.mockRejectedValue(new FakeApiError(409, 'known_people.limit_reached'))
    await toMatches()
    for (const n of ['Meena', 'Ravi', 'Sita']) await userEvent.click(screen.getByRole('checkbox', { name: `find.not_selected_a11y:${n}` }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.limit_reached')
    expect(mock.ask).toHaveBeenCalledTimes(1)
  })

  it('more ticks than free slots (a reload lowered them): "Ask them" is disabled AND the reason is spoken', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 2 })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    mock.announce.mockClear()
    mock.mine = mineQuery({ items: [], freeSlots: 1 })
    view.rerender(createElement(KnownPeopleFindScreen))
    expect(screen.getByRole('button', { name: 'find.send' })).toBeDisabled()
    expect(mock.announce).toHaveBeenCalledWith('find.too_many:1') // says WHY — ⛔ the bare hint (round 4)
  })

  it('an account change while the screen STAYS mounted ends the busy state — ⛔ a spinner for ever; ⛔ notice, ⛔ back', async () => {
    let finish: () => void = () => undefined
    mock.ask.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l1', label: 'asked', name: null, askedAt: 'x' } }))))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    clearSavedNames() // a rejected refresh — the screen is still mounted
    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'find.send' })).not.toHaveTextContent('spinner'))
    expect(mock.handed).not.toHaveBeenCalled()
    expect(mock.back).not.toHaveBeenCalled()
  })

  it('the picker: a failing picker SAYS so; its outcome is ⛔ held behind the reload', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    mock.pick.mockRejectedValueOnce(new Error('picker unavailable'))
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await userEvent.click(await screen.findByRole('button', { name: 'action.choose_contact' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.generic')
    mock.refresh.mockReturnValue(new Promise(() => undefined)) // a reload that never settles
    mock.pick.mockResolvedValueOnce({ checked: [entry('Ravi', '2')], truncated: false })
    await userEvent.click(screen.getByRole('button', { name: 'action.choose_contact' }))
    expect(await screen.findByText('find.sent')).toBeInTheDocument()
  })

  it('a slots-list Retry that fails AGAIN is spoken again', async () => {
    const refetch = vi.fn(async () => ({ isError: true }))
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3, refetch })
    await toMatches()
    mock.announce.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('error.load'))
  })
})

describe('fix-diff review round 4', () => {
  it('a daily_limit refusal STOPS the send too, and every untried tick is dropped', async () => {
    mock.match.mockResolvedValue({ matched: [0, 1, 2] })
    mock.ask.mockRejectedValue(new FakeApiError(429, 'known_people.daily_limit'))
    await toMatches()
    for (const n of ['Meena', 'Ravi', 'Sita']) await userEvent.click(screen.getByRole('checkbox', { name: `find.not_selected_a11y:${n}` }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.daily_limit')
    expect(mock.ask).toHaveBeenCalledTimes(1)
    for (const n of ['Meena', 'Ravi', 'Sita']) expect(screen.getByRole('checkbox', { name: `find.not_selected_a11y:${n}` })).toHaveAttribute('aria-checked', 'false')
  })

  it('an UNticked box at the cap is disabled — ⛔ a tap that silently does nothing', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 1 })
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    expect(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'find.selected_a11y:Meena' })).toBeEnabled() // it can still be unticked
  })

  it('"Share more contacts" is disabled while a send is running', async () => {
    mock.read.mockResolvedValue({ kind: 'read', access: 'limited', prepared: { checked: CHECKED, truncated: false } })
    mock.ask.mockImplementation(() => new Promise(() => undefined)) // in flight
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(screen.getByRole('button', { name: 'find.add_more' })).toBeDisabled()
  })

  it('the picker: a SIGN-OUT while it is open, or between two numbers, asks ⛔ further and speaks nothing', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    let resolvePick: (v: unknown) => void = () => undefined
    mock.pick.mockImplementationOnce(() => new Promise((r) => (resolvePick = r)))
    await userEvent.click(await screen.findByRole('button', { name: 'action.choose_contact' }))
    clearSavedNames() // the sign-out, while the picker is open
    resolvePick({ checked: [entry('Ravi', '2')], truncated: false })
    await waitFor(() => expect(screen.getByRole('button', { name: 'action.choose_contact' })).not.toHaveTextContent('spinner'))
    expect(mock.ask).not.toHaveBeenCalled()
    // a contact with TWO numbers: the first is ⛔ a member; a sign-out during that ask stops the second
    let finish: () => void = () => undefined
    mock.pick.mockResolvedValueOnce({ checked: [entry('Ravi', '2'), entry('Ravi', '3')], truncated: false })
    mock.ask.mockImplementationOnce(() => new Promise((_, reject) => (finish = () => reject(new FakeApiError(404, 'known_people.not_a_member')))))
    await userEvent.click(screen.getByRole('button', { name: 'action.choose_contact' }))
    clearSavedNames()
    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'action.choose_contact' })).not.toHaveTextContent('spinner'))
    expect(mock.ask).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a typed ask that lands after a sign-out speaks ⛔ outcome', async () => {
    mock.platform = 'android'
    mock.read.mockResolvedValue({ kind: 'denied' })
    let finish: () => void = () => undefined
    mock.ask.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve({ link: { linkId: 'l1', label: 'asked', name: null, askedAt: 'x' } }))))
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await userEvent.type(await screen.findByRole('textbox', { name: 'type.label' }), '9876543210')
    await userEvent.click(screen.getByRole('button', { name: 'type.submit' }))
    clearSavedNames()
    finish()
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled())
    expect(screen.queryByText('find.sent')).toBeNull()
  })

  it('the slots Retry STAYS (busy, disabled) while it runs, and a SUCCESS speaks the slots hint it brings', async () => {
    let settle: (v: unknown) => void = () => undefined
    const refetch = vi.fn(() => new Promise((r) => (settle = r)))
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3, refetch })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    // TanStack's REAL shape (round 6): a refetch of a list with ⛔ data resets it to `pending` — ⛔ `isError`
    mock.mine = mineQuery(undefined, { isError: false, isLoading: true, isFetching: true, errorUpdatedAt: 3, refetch })
    view.rerender(createElement(KnownPeopleFindScreen))
    // round 5 supersedes "a spinner": the Retry STAYS, busy and disabled (⛔ a second tap; ⛔ the focus taken away)
    expect(screen.getByRole('button', { name: 'retry' })).toBeDisabled()
    mock.announce.mockClear()
    settle({ isError: false, data: { items: [], freeSlots: 2 } })
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('find.select_hint:2'))
    // … and the success re-render does ⛔ re-announce the phase over that hint (the slots were captured at entry)
    mock.mine = mineQuery({ items: [], freeSlots: 2 }, { refetch })
    view.rerender(createElement(KnownPeopleFindScreen))
    await new Promise((r) => setTimeout(r, 0))
    expect(mock.announce.mock.calls.map(([text]) => text)).toEqual(['find.select_hint:2'])
  })
})

describe('fix-diff review round 5', () => {
  it('a NON-stopping refusal keeps its tick (only what was asked is unticked)', async () => {
    mock.ask.mockImplementation(async (v: { mobile: string }) => {
      if (v.mobile === CHECKED[1]!.number) throw new FakeApiError(409, 'known_people.cannot_ask_now')
      return { link: { linkId: 'l-m', label: 'asked', name: null, askedAt: 'x' } }
    })
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('find.sent error.cannot_ask_now')
    expect(mock.ask).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox', { name: 'find.selected_a11y:Ravi' })).toHaveAttribute('aria-checked', 'true')
  })

  it('a not_available refusal STOPS the send', async () => {
    mock.match.mockResolvedValue({ matched: [0, 1, 2] })
    mock.ask.mockRejectedValue(new FakeApiError(403, 'known_people.not_available'))
    await toMatches()
    for (const n of ['Meena', 'Ravi', 'Sita']) await userEvent.click(screen.getByRole('checkbox', { name: `find.not_selected_a11y:${n}` }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.not_available')
    expect(mock.ask).toHaveBeenCalledTimes(1)
  })

  it('every box is disabled while a send runs (a tick then was never asked)', async () => {
    mock.ask.mockImplementation(() => new Promise(() => undefined))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled()
  })

  it('the over-selection line is ⛔ spoken while an outcome line is showing (it would cut it off); shown as text', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 2 })
    mock.ask.mockImplementation(async (v: { mobile: string }) => {
      if (v.mobile === CHECKED[0]!.number) throw new FakeApiError(409, 'known_people.cannot_ask_now')
      return { link: { linkId: 'l-r', label: 'asked', name: null, askedAt: 'x' } }
    })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.cannot_ask_now') // the outcome line
    mock.announce.mockClear()
    mock.mine = mineQuery({ items: [], freeSlots: 0 }) // the reload lands: Meena is still ticked, ⛔ slot left
    view.rerender(createElement(KnownPeopleFindScreen))
    expect(screen.getByText('list.full')).toBeInTheDocument()
    expect(mock.announce).not.toHaveBeenCalledWith('list.full')
  })

  it('the matches list is given its ticks, slots and busy state as `extraData` (FlashList re-renders a cell only then)', async () => {
    await toMatches()
    const list = screen.getAllByTestId('flash-list')[0]!
    expect(list.getAttribute('data-extra')).toContain('"freeSlots":3')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    expect(screen.getAllByTestId('flash-list')[0]!.getAttribute('data-extra')).toContain(CHECKED[0]!.key)
  })
})

describe('fix-diff review round 6', () => {
  it('slots still LOADING when the matches appear are spoken when they first SETTLE (an error, a refusal, or the hint)', async () => {
    // round 7: the slots' words ALONE when they settle — ⛔ the whole phase again (its count was spoken at entry)
    for (const [settled, words] of [
      [mineQuery(undefined, { isError: true, errorUpdatedAt: 4 }), 'error.load'],
      [mineQuery({ items: [], freeSlots: 0, denied: true }), 'error.not_available'],
      [mineQuery({ items: [], freeSlots: 2 }), 'find.select_hint:2'],
    ] as const) {
      mock.mine = mineQuery(undefined, { isLoading: true, isFetching: true })
      const view = render(createElement(KnownPeopleFindScreen))
      await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
      await screen.findByText('find.matches_heading')
      expect(mock.announce).toHaveBeenLastCalledWith('find.matches_count:2')
      mock.mine = settled
      view.rerender(createElement(KnownPeopleFindScreen))
      await waitFor(() => expect(mock.announce).toHaveBeenLastCalledWith(words))
      // … ONCE: a later change is shown, ⛔ spoken
      mock.announce.mockClear()
      mock.mine = mineQuery({ items: [], freeSlots: 1 })
      view.rerender(createElement(KnownPeopleFindScreen))
      expect(mock.announce).not.toHaveBeenCalled()
      cleanup()
      mock.announce.mockClear()
    }
  })

  it('a failed RELOAD with old data at entry is spoken with the hint, and its Retry is offered', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 3 }, { isError: true, errorUpdatedAt: 5 })
    await toMatches()
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 find.select_hint:3 error.load')
    expect(screen.getByText('find.select_hint:3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'retry' })).toBeEnabled()
  })

  it('a Retry that settles after a SIGN-OUT, or after an outcome was spoken, says ⛔ nothing', async () => {
    let settle: (v: unknown) => void = () => undefined
    const refetch = vi.fn(() => new Promise((r) => (settle = r)))
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3, refetch })
    await toMatches()
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    clearSavedNames() // the sign-out
    mock.announce.mockClear()
    settle({ isError: true })
    await new Promise((r) => setTimeout(r, 0))
    expect(mock.announce).not.toHaveBeenCalled()
  })

  it('`busy` reaches the list (`extraData`) while a send runs', async () => {
    mock.ask.mockImplementation(() => new Promise(() => undefined))
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(screen.getAllByTestId('flash-list')[0]!.getAttribute('data-extra')).toContain('"busy":true')
  })

  it('the picker: an account change while it was open silences its no-mobile and failure messages', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    mock.pick.mockImplementationOnce(async () => {
      clearSavedNames() // signed out while the picker was open
      return { checked: [], truncated: false }
    })
    await userEvent.click(await screen.findByRole('button', { name: 'action.choose_contact' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'action.choose_contact' })).toBeEnabled())
    mock.pick.mockImplementationOnce(async () => {
      clearSavedNames()
      throw new Error('picker unavailable')
    })
    await userEvent.click(screen.getByRole('button', { name: 'action.choose_contact' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'action.choose_contact' })).toBeEnabled())
    expect(screen.queryByText('find.no_mobile')).toBeNull()
    expect(screen.queryByText('error.generic')).toBeNull()
    expect(mock.ask).not.toHaveBeenCalled()
  })

  it('the slots at entry come from the list AS IT STANDS when the matches arrive (⛔ as it stood when the check began)', async () => {
    mock.mine = mineQuery(undefined, { isLoading: true, isFetching: true })
    let resolveMatch: (v: unknown) => void = () => undefined
    mock.match.mockImplementationOnce(() => new Promise((r) => (resolveMatch = r)))
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await waitFor(() => expect(mock.match).toHaveBeenCalled())
    mock.mine = mineQuery({ items: [], freeSlots: 3 }) // the list loaded while the check was out
    view.rerender(createElement(KnownPeopleFindScreen))
    resolveMatch({ matched: [0, 1] })
    await screen.findByText('find.matches_heading')
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 find.select_hint:3')
    // ⛔ read from the list as it stood when the check BEGAN (loading — the count alone, then a late "settle" line)
    expect(mock.announce).not.toHaveBeenCalledWith('find.matches_count:2')
  })
})

describe('fix-diff review round 7', () => {
  /** Render the matches with a namer's list that FAILED (no data); returns the Retry's settle and the view. */
  async function failedListWithPendingRetry() {
    let settle: (v: unknown) => void = () => undefined
    const refetch = vi.fn(() => new Promise((r) => (settle = r)))
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 3, refetch })
    mock.read.mockResolvedValue({ kind: 'read', access: 'limited', prepared: { checked: CHECKED, truncated: false } })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    return { settle: (v: unknown) => settle(v), view, refetch }
  }

  /** The matches with OLD data whose reload FAILED (ticks and sends still possible), and a Retry pending. */
  async function staleListWithPendingRetry() {
    let settle: (v: unknown) => void = () => undefined
    const refetch = vi.fn(() => new Promise((r) => (settle = r)))
    mock.mine = mineQuery({ items: [], freeSlots: 3 }, { isError: true, errorUpdatedAt: 5, refetch })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    return { settle: (v: unknown) => settle(v) }
  }

  it('a Retry that settles after an OUTCOME was spoken (a send ended meanwhile) says nothing', async () => {
    const { settle } = await staleListWithPendingRetry()
    mock.ask.mockRejectedValue(new FakeApiError(409, 'known_people.cannot_ask_now')) // ⛔ a stopper — the send ends
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.cannot_ask_now') // the outcome, spoken
    mock.announce.mockClear()
    settle({ isError: false, data: { items: [], freeSlots: 3 } })
    await new Promise((r) => setTimeout(r, 0))
    expect(mock.announce).not.toHaveBeenCalled()
  })

  it('a Retry that settles while a send RUNS says nothing', async () => {
    const { settle } = await staleListWithPendingRetry()
    mock.ask.mockImplementation(() => new Promise(() => undefined)) // the send stays in flight
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    mock.announce.mockClear()
    settle({ isError: false, data: { items: [], freeSlots: 3 } })
    await new Promise((r) => setTimeout(r, 0))
    expect(mock.announce).not.toHaveBeenCalled()
  })

  it('a Retry that settles with nothing said since speaks its outcome (a positive control); "Share more" waits for it', async () => {
    mock.read.mockResolvedValue({ kind: 'read', access: 'limited', prepared: { checked: CHECKED, truncated: false } })
    const { settle } = await staleListWithPendingRetry()
    expect(screen.getByRole('button', { name: 'find.add_more' })).toBeDisabled() // ⛔ a re-check under a running Retry
    mock.announce.mockClear()
    settle({ isError: true })
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('error.load'))
  })

  it('a Retry can be pressed AGAIN after one fails (the busy state ends)', async () => {
    const { settle, refetch } = await failedListWithPendingRetry()
    settle({ isError: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'retry' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('a Retry success into "more ticked than the slots" is spoken ONCE (by the over-selection line)', async () => {
    let settle: (v: unknown) => void = () => undefined
    const refetch = vi.fn(() => new Promise((r) => (settle = r)))
    mock.mine = mineQuery({ items: [], freeSlots: 3 }, { isError: true, errorUpdatedAt: 5, refetch })
    const view = render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    await screen.findByText('find.matches_heading')
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    mock.announce.mockClear()
    settle({ isError: false, data: { items: [], freeSlots: 1 } })
    await new Promise((r) => setTimeout(r, 0))
    mock.mine = mineQuery({ items: [], freeSlots: 1 }, { refetch })
    view.rerender(createElement(KnownPeopleFindScreen))
    expect(mock.announce.mock.calls.filter(([text]) => text === 'find.too_many:1')).toHaveLength(1)
  })

  it('the picker: a no-mobile contact picked AFTER a sign-out is ⛔ spoken (pinned before any other tap)', async () => {
    mock.read.mockResolvedValue({ kind: 'denied' })
    render(createElement(KnownPeopleFindScreen))
    await userEvent.click(screen.getByRole('button', { name: 'note.continue' }))
    mock.pick.mockImplementationOnce(async () => {
      clearSavedNames()
      return { checked: [], truncated: false }
    })
    mock.announce.mockClear()
    await userEvent.click(await screen.findByRole('button', { name: 'action.choose_contact' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'action.choose_contact' })).toBeEnabled())
    expect(screen.queryByText('find.no_mobile')).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith('find.no_mobile')
  })

  it('a send that asked some and found others already listed says "some were already on your list" — ⛔ "nothing new was asked"', async () => {
    mock.ask.mockImplementation(async (v: { mobile: string }) =>
      v.mobile === CHECKED[0]!.number
        ? { link: { linkId: 'l-new', label: 'asked', name: null, askedAt: 'x' } }
        : { link: { linkId: 'l-old', label: 'accepted', name: 'Ravi K.', askedAt: 'x' } },
    )
    await toMatches()
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Meena' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'find.not_selected_a11y:Ravi' }))
    await userEvent.click(screen.getByRole('button', { name: 'find.send' }))
    expect(await screen.findByText('find.sent find.some_listed')).toBeInTheDocument()
  })

  it('a refused list that also failed to reload speaks the refusal ALONE (it is shown without a Retry)', async () => {
    mock.mine = mineQuery({ items: [], freeSlots: 0, denied: true }, { isError: true, errorUpdatedAt: 6 })
    await toMatches()
    expect(mock.announce).toHaveBeenCalledWith('find.matches_count:2 error.not_available')
    expect(screen.queryByRole('button', { name: 'retry' })).toBeNull()
  })
})

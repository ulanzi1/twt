// @vitest-environment jsdom
// Story 6.36e (fix-diff review 2026-10-24) — the FIND screen, EXECUTED with React DOM and mocked native primitives (the REAL `t()`,
// the REAL `AnnouncedText`, the REAL `withReadTimeout`; MOCKED: `react-native`, `tamagui` (plain elements), `expo-router`, the
// i18n hook (it calls the real `t()`), the contacts reader, the API wrapper, the session, `lib/mmkv`, `lib/trust-name` — layout,
// the system prompt and a screen reader still need a device):
//   · the note offers an affirmative DECLINE (*Don't read my contacts* ⇒ the picker, ⛔ the permission prompt) and SAYS what appeared —
//     ONCE: the words are ⛔ spoken again whenever a message clears (round 3);
//   · a check that found SOMEONE offers *"Not in this list?"* (the nominee may sign in on a number the member never saved), every
//     button on it at least 48 dp;
//   · a daily limit and a check that finds nobody leave the picker open — ⛔ a dead end; "not available for your account" is a note
//     with ⛔ way on (a mark would be refused at save);
//   · ⭐ round 3 — a check that FAILS (a 503, busy, a stall past the read bound) returns to the NOTE, where *Continue* tries again and
//     *Don't read my contacts* is still one tap away; ⛔ a fallback whose only controls cannot re-run the check;
//   · the in-flight guard: a double tap makes ONE call, and it is released after a failure; leaving the screen mid-check and coming
//     back does ⛔ spend a second one (the RAW call is shared per form session, stores its own result, and a first check shows what the
//     session already holds) — and neither does a retry after the read bound gave up on a request that cannot be aborted (round 4);
//   · a match response that arrives after the form session was cleared returns the screen to the note — ⛔ the spinner, ⛔ stored;
//   · iOS limited access: *Share more* re-checks; a refused RE-check leaves the matches on screen and says why; a *Share more* that
//     rejects is ⛔ an unhandled rejection.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@twt/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  announce: vi.fn(),
  back: vi.fn(),
  read: vi.fn(),
  pick: vi.fn(),
  share: vi.fn(),
  match: vi.fn(),
}))

vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ rank: '1' }),
  useRouter: () => ({ back: mock.back }),
}))
vi.mock('../../lib/nominee-link-i18n', async () => {
  const { t } = await import('@twt/i18n')
  return { useNomineeLinkT: () => (key: string, params?: Record<string, string | number>) => t(key, params, { locale: 'en', namespace: 'nominee_link' }) }
})
vi.mock('../../lib/known-people-contacts', () => ({
  readContactsForMatching: mock.read,
  pickOneContact: mock.pick,
  shareMoreContacts: mock.share,
}))
vi.mock('../../lib/nominee-links-api', () => ({ nomineeLinksApi: {}, matchContactsForNominee: mock.match }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} })) // the sibling hook module (`withReadTimeout`) imports it
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/trust-name', () => ({ configuredTrustName: () => 'Example Trust' }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, testID }: { children?: React.ReactNode; accessibilityRole?: string; testID?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'data-testid': testID }, children)
  return {
    H2: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Input: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: { target: { value: string } }) => onChangeText(e.target.value) }),
    Button: ({ children, onPress, disabled, accessibilityLabel, height }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string; height?: number }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel, 'data-height': height }, children),
  }
})

import NomineeLinkFindScreen from '../../app/(life-events)/nominee-link-find'
import { KNOWN_PEOPLE_READ_TIMEOUT_MS } from '../../components/known-people/useKnownPeopleQueries'
import { clearNomineeLinkSession, nomineeLinkSessionMatches } from '../../lib/nominee-links'

const contact = { key: '+919876500001', savedName: 'Meena from school', number: '+919876500001' }
const readOk = (access: 'full' | 'limited' = 'full') => ({ kind: 'read', access, prepared: { checked: [contact], truncated: false } })
const btn = (name: RegExp | string) => screen.getByRole('button', { name })
const flush = () => act(async () => undefined)

beforeEach(() => {
  clearNomineeLinkSession()
  mock.read.mockResolvedValue(readOk())
  mock.match.mockResolvedValue({ matched: [0] })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('the find screen — the note', () => {
  it('*Don\'t read my contacts* opens the picker WITHOUT reading them — and SAYS what appeared', async () => {
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn("Don't read my contacts"))
    expect(btn('Choose a contact')).toBeInTheDocument()
    expect(mock.read).not.toHaveBeenCalled()
    expect(mock.match).not.toHaveBeenCalled()
    expect(mock.announce).toHaveBeenCalledWith('Choose a contact') // the focused button vanished: ⛔ in silence
  })

  it('⭐ round 3 — the fallback is SPOKEN once, on the way in: a message that appears and clears beside it does ⛔ re-speak it', async () => {
    mock.pick.mockResolvedValue({ checked: [] }) // a contact with no mobile: "that contact has no mobile number"
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn("Don't read my contacts"))
    const spoken = () => mock.announce.mock.calls.filter(([text]) => text === 'Choose a contact').length
    expect(spoken()).toBe(1)
    await userEvent.click(btn('Choose a contact'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(btn('Choose a contact')) // clears the message first, then shows it again
    await flush()
    expect(spoken()).toBe(1) // the old condition (`message === null`) spoke it again each time the message cleared
  })
})

describe('the find screen — a check that found someone', () => {
  it('offers *Not in this list?* ⇒ the picker; the contact list is ⛔ the only way', async () => {
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(mock.match).toHaveBeenCalledWith(['+919876500001'])
    await userEvent.click(btn('Not in this list? Add them another way'))
    expect(btn('Choose a contact')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Meena from school/ })).toBeNull()
  })

  it('a check that finds NOBODY leaves the picker open beside the sentence', async () => {
    mock.match.mockResolvedValue({ matched: [] })
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    expect(await screen.findByTestId('nominee-find-no-matches')).toBeInTheDocument()
    expect(btn('Choose a contact')).toBeInTheDocument()
  })

  it('the screen SAYS the count in the right number — "1 of your contacts is a TWT member." / "2 of your contacts are TWT members." (`find.matches_count_one` is selected by the caller)', async () => {
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await screen.findByRole('button', { name: /^Meena from school/ })
    expect(mock.announce).toHaveBeenCalledWith('1 of your contacts is a TWT member.')
    cleanup()
    clearNomineeLinkSession()
    const second = { key: '+919876500002', savedName: 'Ravi from work', number: '+919876500002' }
    mock.read.mockResolvedValue({ kind: 'read', access: 'full', prepared: { checked: [contact, second], truncated: false } })
    mock.match.mockResolvedValue({ matched: [0, 1] })
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await screen.findByRole('button', { name: /^Ravi from work/ })
    expect(mock.announce).toHaveBeenCalledWith('2 of your contacts are TWT members.')
  })

  it.each([['full', 2], ['limited', 3]] as const)('every control on the matches is at least 48 dp (%s access) — the way for a nominee on an unsaved number, and iOS *Share more*, included', async (access, count) => {
    mock.read.mockResolvedValue(readOk(access))
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await screen.findByRole('button', { name: /^Meena from school/ })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(count) // not in this list + the pick (+ share more under limited access): none escapes the assertion
    // a button with no `height` has no attribute: `Number(null)` is 0, so an unsized control fails here
    expect(buttons.map((b) => Number(b.getAttribute('data-height'))).every((h) => h >= 48)).toBe(true)
    expect(Number(btn('Not in this list? Add them another way').getAttribute('data-height'))).toBe(48)
    if (access === 'limited') expect(Number(btn('Share more contacts').getAttribute('data-height'))).toBe(48)
  })
})

describe('the find screen — a refusal, a late answer, a stall', () => {
  it('a daily limit says so AND leaves the picker open (the match counter is ⛔ spent by it)', async () => {
    mock.match.mockRejectedValue(new ApiError(429, 'known_people.daily_limit', 'limit'))
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    expect(await screen.findByRole('alert')).toHaveTextContent('You have checked your contacts three times today. Try again tomorrow.')
    expect(btn('Choose a contact')).toBeInTheDocument()
  })

  it('"not available for your account" leaves a note with ⛔ way on — the save would refuse a mark too', async () => {
    mock.match.mockRejectedValue(new ApiError(403, 'known_people.not_available', 'no'))
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Finding a member is not available for your account.')
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.queryByRole('button', { name: "Don't read my contacts" })).toBeNull() // the decline leads to a mark that is refused at save
    expect(screen.queryByRole('button', { name: 'Choose a contact' })).toBeNull()
  })

  it.each([
    ['a 503', new ApiError(503, 'http.503', 'down'), 'Something went wrong. Try again.'],
    ['busy', new ApiError(503, 'known_people.busy', 'busy'), undefined],
  ])('⭐ %s returns to the NOTE — *Continue* tries again (and succeeds), *Don\'t read my contacts* stays one tap away', async (_name, failure, text) => {
    mock.match.mockRejectedValueOnce(failure).mockResolvedValueOnce({ matched: [0] })
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    const alert = await screen.findByRole('alert')
    if (text !== undefined) expect(alert).toHaveTextContent(text)
    expect(btn('Continue')).toBeInTheDocument()
    expect(btn("Don't read my contacts")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose a contact' })).toBeNull() // ⛔ the fallback is NOT where a failure leaves the member
    await userEvent.click(btn('Continue'))
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(mock.match).toHaveBeenCalledTimes(2) // … and the in-flight guard was RELEASED by the failure
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('⭐ a match response that arrives after the form session was CLEARED returns the screen to the note — ⛔ the spinner', async () => {
    let resolveMatch!: (v: { matched: number[] }) => void
    mock.match.mockReturnValue(new Promise((r) => (resolveMatch = r)))
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    expect(await screen.findByText('spinner')).toBeInTheDocument()
    clearNomineeLinkSession() // the form unmounted / the account changed while the call was in flight
    resolveMatch({ matched: [0] })
    await waitFor(() => expect(btn('Continue')).toBeInTheDocument())
    expect(screen.queryByText('spinner')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Meena from school/ })).toBeNull() // ⛔ shown
    expect(nomineeLinkSessionMatches()).toBeNull() // ⛔ stored — the guard sits BEFORE the store (a refill of a session it has left)
  })

  it('⭐ a match call that NEVER settles fails at the read bound — back on the note; *Continue* ATTACHES to the call still running (⛔ a second charge)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mock.match.mockReturnValue(new Promise(() => undefined))
    render(createElement(NomineeLinkFindScreen))
    fireEvent.click(btn('Continue'))
    await flush()
    expect(screen.getByText('spinner')).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS + 200)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
    expect(mock.match).toHaveBeenCalledTimes(1)
    fireEvent.click(btn('Continue')) // the request was never aborted: a second call would be a second charge
    await flush()
    await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS + 200)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
    expect(mock.match).toHaveBeenCalledTimes(1)
  })

  it('⭐ round 4 — the abandoned call LANDS late: the session holds its matches, and *Continue* shows them at once — ⛔ a second metered call', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let landLate!: (v: { matched: number[] }) => void
    mock.match.mockReturnValue(new Promise((r) => (landLate = r)))
    render(createElement(NomineeLinkFindScreen))
    fireEvent.click(btn('Continue'))
    await flush()
    await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS + 200)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
    landLate({ matched: [0] }) // the server answered after the bound
    await flush()
    expect(nomineeLinkSessionMatches()?.matched).toHaveLength(1) // stored by the CALL, though the caller had given up on it
    fireEvent.click(btn('Continue'))
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(mock.match).toHaveBeenCalledTimes(1)
    expect(mock.read).toHaveBeenCalledTimes(1) // ⛔ the contacts are read again either
  })
})

describe('the find screen — one check at a time', () => {
  it('⭐ a DOUBLE TAP on *Continue* makes ONE contacts read and ONE metered call', async () => {
    let resolveMatch!: (v: { matched: number[] }) => void
    mock.match.mockReturnValue(new Promise((r) => (resolveMatch = r)))
    render(createElement(NomineeLinkFindScreen))
    const cont = btn('Continue')
    // both taps land before the screen re-renders (the button is still there for the second one)
    await act(async () => {
      cont.click()
      cont.click()
    })
    expect(mock.read).toHaveBeenCalledTimes(1)
    resolveMatch({ matched: [0] })
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(mock.match).toHaveBeenCalledTimes(1)
  })

  it('⭐ leaving the screen MID-check and coming back attaches to the call in flight — ⛔ a second one off the shared daily budget', async () => {
    let resolveMatch!: (v: { matched: number[] }) => void
    mock.match.mockReturnValue(new Promise((r) => (resolveMatch = r)))
    const first = render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await flush()
    expect(mock.match).toHaveBeenCalledTimes(1)
    first.unmount() // back to the form; the call cannot be aborted
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue')) // the session holds ⛔ matches yet, so the note asks again
    await flush()
    expect(mock.match).toHaveBeenCalledTimes(1) // attached, ⛔ a second request
    resolveMatch({ matched: [0] })
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
  })

  it('⭐ round 4 — leaving mid-check and coming back AFTER it settled: the new screen shows what the session holds on *Continue* — ⛔ a second charge', async () => {
    let resolveMatch!: (v: { matched: number[] }) => void
    mock.match.mockReturnValue(new Promise((r) => (resolveMatch = r)))
    const first = render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await flush()
    first.unmount()
    render(createElement(NomineeLinkFindScreen)) // mounted on the note: the session had nothing yet
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    resolveMatch({ matched: [0] }) // the first call settles while the member reads the note — in no screen's hands
    await flush()
    expect(nomineeLinkSessionMatches()?.matched).toHaveLength(1)
    await userEvent.click(btn('Continue'))
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(mock.match).toHaveBeenCalledTimes(1) // the in-flight slot was empty by then: only the session could stop a second call
    expect(mock.read).toHaveBeenCalledTimes(1)
  })
})

describe('the find screen — iOS limited access', () => {
  it('⭐ *Share more contacts* re-checks; a RE-check that is refused leaves the matches on screen and says why — ⛔ the fallback', async () => {
    mock.read.mockResolvedValue(readOk('limited'))
    mock.share.mockResolvedValue(true)
    mock.match.mockResolvedValueOnce({ matched: [0] }).mockRejectedValueOnce(new ApiError(429, 'known_people.daily_limit', 'limit'))
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await userEvent.click(await screen.findByRole('button', { name: 'Share more contacts' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You have checked your contacts three times today. Try again tomorrow.')
    expect(mock.match).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: /^Meena from school/ })).toBeInTheDocument() // still there to pick
    expect(screen.queryByRole('button', { name: 'Choose a contact' })).toBeNull()
  })

  it('a *Share more contacts* that succeeds re-checks (the second metered call) and shows the new list', async () => {
    mock.read.mockResolvedValue(readOk('limited'))
    mock.share.mockResolvedValue(true)
    mock.match.mockResolvedValue({ matched: [0] })
    render(createElement(NomineeLinkFindScreen))
    await userEvent.click(btn('Continue'))
    await userEvent.click(await screen.findByRole('button', { name: 'Share more contacts' }))
    await flush()
    expect(mock.match).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('*Share more contacts* that REJECTS is ⛔ an unhandled rejection; the matches stay', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      mock.read.mockResolvedValue(readOk('limited'))
      mock.share.mockRejectedValue(new Error('picker failed'))
      render(createElement(NomineeLinkFindScreen))
      await userEvent.click(btn('Continue'))
      await userEvent.click(await screen.findByRole('button', { name: 'Share more contacts' }))
      await flush()
      await new Promise((r) => setTimeout(r, 20))
      expect(unhandled).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /^Meena from school/ })).toBeInTheDocument()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})

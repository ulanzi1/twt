// @vitest-environment jsdom
// Story 6.36f (Task 4; AC6; MK8, MK9; `2026-10-26-407`) — the NOMINEES SCREEN's marks-only mode, EXECUTED with React DOM and mocked
// native primitives (the 6.36e render-harness shape). MOCKED: `react-native` (+ `announceForAccessibility`), `tamagui` (plain
// elements), `expo-router` (the focus effect runs on mount and on demand), `@twt/i18n/react` (the common `useT` echoes keys), the
// API wrapper (+ its step-up request / verify), the draft store (an in-memory map), the resume affordance (one *Continue draft*
// button), the session, the two query hooks, `lib/mmkv`. REAL: the `nominee_link` translator (`t()` — a forgotten token THROWS),
// `AnnouncedText`, `lib/nominee-links.ts`, the shared mark control, the step-up gate (code review 2026-10-27, S4 — it was mocked to
// run the call, so the OTP footer never rendered), TanStack Query (the status read). Layout, TalkBack and VoiceOver still need a device ([[feedback_record_unattested_no_backfill]]):
//   · the entry card shows ONLY for a saved declaration with a basis per rank and (a live mark OR the right to find) — ⛔ for an
//     `active-in-grace` member with ⛔ mark; tapping it UNMOUNTS the form;
//   · marks mode: one block per rank — label + relationship from `ranks` — with its current mark; *Save marks* disabled until a mark
//     differs (its hint shown); *Remove mark* SAYS so outside the blocks; the save sends the marks body (⛔ a detail) and announces
//     *Marks saved.* BEFORE it leaves; ⛔ a draft written;
//   · a pick lands on the marks record and shows the pre-save disclosure (`form.will_ask` — `-396` Q2 A);
//   · a 409 `marks_stale` reloads the marks, starts over from them and says why; `marks_no_declaration` returns to the form;
//   · "Change names or numbers instead" remounts the full form.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const L1 = '11111111-1111-4111-8111-111111111111'
const L2 = '22222222-2222-4222-8222-222222222222'
const RANKS = [
  { rank: 1, versionNo: 3, relationship: 'spouse' },
  { rank: 2, versionNo: 1, relationship: 'son' },
]

const mock = vi.hoisted(() => ({
  announce: vi.fn(),
  back: vi.fn(),
  push: vi.fn(),
  saveDraft: vi.fn(),
  status: vi.fn(),
  saveMarks: vi.fn(),
  saveFull: vi.fn(),
  stepUpRequest: vi.fn(),
  stepUpVerify: vi.fn(),
  drafts: new Map<string, unknown>(),
  setLinks: null as null | ((next: { ranks: unknown[]; links: unknown[] }) => void),
  refetchFails: false,
  focus: null as null | (() => void),
  canFind: true,
  links: null as null | { ranks: unknown[]; links: unknown[] },
  nextLinks: null as null | { ranks: unknown[]; links: unknown[] },
  refetches: 0,
  refetchWait: null as null | Promise<void>,
}))

vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' }, // `AnnouncedText` SPEAKS on iOS (Android: a live region); *Marks saved.* is announced on both
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({ back: mock.back, push: mock.push }),
    useFocusEffect: (cb: () => void) => {
      mock.focus = cb
      useEffect(() => cb(), [])
    },
  }
})
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
vi.mock('../../lib/nominee-link-i18n', async () => {
  const { t } = await import('@twt/i18n')
  return { useNomineeLinkT: () => (key: string, params?: Record<string, string | number>) => t(key, params, { locale: 'en', namespace: 'nominee_link' }) }
})
vi.mock('../../lib/member-api', () => ({
  memberAuth: {
    nomineesStatus: mock.status,
    lifeEventsUpdateNomineeMarks: mock.saveMarks,
    lifeEventsUpdateNominees: mock.saveFull,
    stepUpRequest: mock.stepUpRequest,
    stepUpVerify: mock.stepUpVerify,
  },
}))
vi.mock('../../components/life-events/draft-store', () => ({
  loadDraft: (_member: string, key: string) => mock.drafts.get(key) ?? null,
  saveDraft: mock.saveDraft,
  clearDraft: (_member: string, key: string) => void mock.drafts.delete(key),
}))
vi.mock('../../components/life-events/SaveAndResumeAffordance', async () => {
  const { createElement } = await import('react')
  return { SaveAndResumeAffordance: ({ onContinue }: { onContinue: () => void }) => createElement('button', { onClick: onContinue }, 'Continue draft') }
})
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({ useKnownPeoplePromptsQuery: () => ({ data: { canNamePeople: mock.canFind } }) }))
vi.mock('../../components/nominee-links/useNomineeLinkQueries', async (importActual) => {
  const actual = await importActual<typeof import('../../components/nominee-links/useNomineeLinkQueries')>()
  const { useState } = await import('react')
  return {
    errorCodeOf: actual.errorCodeOf,
    useNomineeLinksQuery: () => {
      const [data, setData] = useState(mock.links)
      mock.setLinks = setData // a refetch the screen did ⛔ ask for (S3)
      return {
        data,
        isError: false,
        errorUpdatedAt: 0,
        refetch: async () => {
          mock.refetches += 1
          if (mock.refetchWait) await mock.refetchWait
          if (mock.refetchFails) return { data, isError: true } // TanStack keeps the old data on a failed refetch
          const next = mock.nextLinks ?? data
          setData(next)
          return { data: next, isError: false }
        },
      }
    },
  }
})
vi.mock('../../lib/nominee-links-api', () => ({ nomineeLinksApi: {}, matchContactsForNominee: vi.fn() })) // the real hook module's imports
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  // `data-live` ⇒ an Android live region (TalkBack re-reads one when the screen re-renders — the device run's D1).
  const container = ({ children, accessibilityRole, testID, accessibilityLiveRegion }: { children?: React.ReactNode; accessibilityRole?: string; testID?: string; accessibilityLiveRegion?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'data-testid': testID, 'data-live': accessibilityLiveRegion }, children)
  return {
    H2: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Input: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: { target: { value: string } }) => onChangeText(e.target.value) }),
    // `data-height` is the GUARANTEED height (a `minH` where the button may grow); `data-own-text` ⇒ the caller renders the label's
    // Text (`noTextWrap`) — Tamagui's own wrapper Text is one line.
    Button: ({ children, onPress, disabled, accessibilityLabel, height, minH, noTextWrap }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string; height?: number | string; minH?: number; noTextWrap?: boolean }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel, 'data-height': minH ?? height, 'data-own-text': noTextWrap ? 'true' : undefined }, children),
  }
})

import LifeEventsNomineesScreen from '../../app/(life-events)/nominees'
import { clearNomineeLinkSession, handNomineeLinkPick } from '../../lib/nominee-links'

const status = (n: number) => ({
  nominees: Array.from({ length: n }, (_, i) => ({ rank: i + 1, relationship: i === 0 ? 'spouse' : 'son', splitPct: n === 1 ? 100 : i === 0 ? 75 : 25, mobilePresent: true, addressPresent: false })),
  locked: false,
})
const btn = (name: RegExp | string) => screen.getByRole('button', { name })

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(createElement(QueryClientProvider, { client }, createElement(LifeEventsNomineesScreen)))
}

async function openMarks() {
  renderScreen()
  await userEvent.click(await screen.findByRole('button', { name: 'Member marks' }))
}

beforeEach(() => {
  clearNomineeLinkSession()
  mock.canFind = true
  mock.links = { ranks: RANKS, links: [{ rank: 2, linkId: L2, label: 'confirmed', name: 'Ravi K.' }] }
  mock.nextLinks = null
  mock.refetches = 0
  mock.refetchWait = null
  mock.refetchFails = false
  mock.drafts.clear()
  mock.saveDraft.mockImplementation((_member: string, key: string, value: unknown) => void mock.drafts.set(key, value))
  mock.stepUpVerify.mockResolvedValue(undefined)
  mock.status.mockResolvedValue(status(2))
  mock.saveMarks.mockResolvedValue(status(2))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Story 6.36f — the entry card', () => {
  it('shows above the form for a saved declaration with a basis per rank; tapping it UNMOUNTS the form and says where the member is', async () => {
    renderScreen()
    expect(await screen.findByText('Only changing a member mark? Do it here without typing your nominees again.')).toBeInTheDocument()
    expect(btn('nominees.submit')).toBeInTheDocument() // the full form, below the card
    await userEvent.click(btn('Member marks'))
    expect(screen.queryByRole('button', { name: 'nominees.submit' })).toBeNull()
    expect(screen.getByTestId('nominee-marks-mode')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('Member marks')
  })

  it('⛔ card for an `active-in-grace` member with ⛔ mark (⛔ may find); ⛔ card when a rank has ⛔ basis; ⛔ card with ⛔ declaration', async () => {
    mock.canFind = false
    mock.links = { ranks: RANKS, links: [] }
    renderScreen()
    await screen.findByRole('button', { name: 'nominees.submit' })
    expect(screen.queryByTestId('nominee-marks-entry')).toBeNull()
    cleanup()
    mock.canFind = true
    mock.links = { ranks: [RANKS[0]], links: [] } // two nominees, one basis (pre-0119 data)
    renderScreen()
    await screen.findByRole('button', { name: 'nominees.submit' })
    expect(screen.queryByTestId('nominee-marks-entry')).toBeNull()
    cleanup()
    mock.links = { ranks: [], links: [] }
    mock.status.mockResolvedValue(status(0))
    renderScreen()
    await screen.findByRole('button', { name: 'nominees.submit' })
    expect(screen.queryByTestId('nominee-marks-entry')).toBeNull()
  })

  it('a member who may ⛔ find but HAS a mark still gets the card (to remove it)', async () => {
    mock.canFind = false
    renderScreen()
    expect(await screen.findByTestId('nominee-marks-entry')).toBeInTheDocument()
  })
})

describe('Story 6.36f — marks mode', () => {
  it('one block per rank — its label + relationship from `ranks` — with its current mark; *Save marks* disabled until a mark differs', async () => {
    await openMarks()
    expect(screen.getByTestId('nominee-marks-rank-1')).toHaveTextContent('nominees.primary_label · nominees.relationship_spouse')
    expect(screen.getByTestId('nominee-marks-rank-2')).toHaveTextContent('nominees.secondary_label · nominees.relationship_son')
    expect(screen.getByTestId('nominee-mark-1')).toHaveTextContent('Ravi K.')
    expect(btn('Save marks')).toBeDisabled()
    expect(screen.getByText('Change a mark first.')).toBeInTheDocument()
    expect(screen.queryByTestId('nominee-mark-question-1')).toBeNull() // ⛔ the V3 question — nothing is editable
  })

  it('*Remove mark* SAYS so (outside the blocks), enables the save; the save sends each rank + its versionNo (⛔ a detail), announces *Marks saved.* BEFORE it leaves; ⛔ a draft', async () => {
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    const removed = screen.getByText('Mark removed.')
    expect(screen.getByTestId('nominee-marks-rank-2')).not.toContainElement(removed)
    expect(mock.announce).toHaveBeenCalledWith('Mark removed.')
    await userEvent.click(btn('Save marks'))
    await waitFor(() => expect(mock.back).toHaveBeenCalled())
    expect(mock.saveMarks).toHaveBeenCalledWith({
      marks: [
        { rank: 1, versionNo: 3, memberLink: null },
        { rank: 2, versionNo: 1, memberLink: null },
      ],
    })
    const saved = mock.announce.mock.invocationCallOrder[mock.announce.mock.calls.findIndex(([x]) => x === 'Marks saved.')]!
    expect(saved).toBeLessThan(mock.back.mock.invocationCallOrder[0]!)
    expect(mock.saveDraft).not.toHaveBeenCalled()
  })

  it('a PICK lands on the marks record and shows the pre-save disclosure (`-396` Q2 A); the save sends the `new` mark', async () => {
    await openMarks()
    handNomineeLinkPick(1, { kind: 'new', mobile: '9876500001', foundBy: 'picker', savedName: 'Meena' })
    act(() => mock.focus!())
    expect(screen.getByTestId('nominee-mark-0')).toHaveTextContent('When you save, Meena will see your name in the app')
    await userEvent.click(btn('Save marks'))
    await waitFor(() => expect(mock.saveMarks).toHaveBeenCalled())
    expect(mock.saveMarks.mock.calls[0]![0]).toEqual({
      marks: [
        { rank: 1, versionNo: 3, memberLink: { kind: 'new', mobile: '9876500001', foundBy: 'picker' } },
        { rank: 2, versionNo: 1, memberLink: { kind: 'keep', linkId: L2 } },
      ],
    })
  })

  it('a 409 `marks_stale` reloads the marks, starts over from them and says why', async () => {
    mock.saveMarks.mockRejectedValue(new ApiError(409, 'nominee.marks_stale', 'x'))
    mock.nextLinks = { ranks: [{ rank: 1, versionNo: 4, relationship: 'spouse' }], links: [] }
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(await screen.findByText('Your nominees changed since you opened this screen. Check the marks again, then save.')).toBeInTheDocument()
    expect(mock.refetches).toBe(1)
    expect(screen.queryByTestId('nominee-marks-rank-2')).toBeNull() // the RELOADED basis — one rank now
    expect(btn('Save marks')).toBeDisabled() // started over: ⛔ a change carried across the reload
    expect(mock.back).not.toHaveBeenCalled()
  })

  it('a 409 `marks_no_declaration` returns to the FULL form and says why', async () => {
    mock.saveMarks.mockRejectedValue(new ApiError(409, 'nominee.marks_no_declaration', 'x'))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(await screen.findByText('Save your nominees first, then you can mark a member.')).toBeInTheDocument()
    expect(btn('nominees.submit')).toBeInTheDocument()
    expect(screen.queryByTestId('nominee-marks-mode')).toBeNull()
  })

  it('"Change names or numbers instead" remounts the FULL form (⛔ a draft written)', async () => {
    await openMarks()
    await userEvent.click(btn('Change names or numbers instead'))
    expect(btn('nominees.submit')).toBeInTheDocument()
    expect(screen.queryByTestId('nominee-marks-mode')).toBeNull()
    expect(mock.saveDraft).not.toHaveBeenCalled()
  })

  it('R1 — cannot return to the full form during a marks save or its success refetch', async () => {
    let finishSave!: (value: unknown) => void
    let finishRefetch!: () => void
    mock.saveMarks.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve }))
    mock.refetchWait = new Promise<void>((resolve) => { finishRefetch = resolve })
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(btn('Change names or numbers instead')).toBeDisabled()
    await userEvent.click(btn('Change names or numbers instead'))
    expect(screen.queryByRole('button', { name: 'nominees.submit' })).toBeNull()
    expect(mock.saveDraft).not.toHaveBeenCalled()

    await act(async () => finishSave(status(2)))
    await waitFor(() => expect(mock.refetches).toBe(1))
    expect(btn('Change names or numbers instead')).toBeDisabled()
    expect(mock.back).not.toHaveBeenCalled()
    await act(async () => finishRefetch())
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.saveDraft).not.toHaveBeenCalled()
  })

  it('R1 — returning to the full form becomes available again after a save refusal', async () => {
    let refuseSave!: (reason: unknown) => void
    mock.saveMarks.mockImplementationOnce(() => new Promise((_resolve, reject) => { refuseSave = reject }))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(btn('Change names or numbers instead')).toBeDisabled()
    await act(async () => refuseSave(new ApiError(422, 'nominee.link_not_found', 'x')))
    await waitFor(() => expect(btn('Change names or numbers instead')).toBeEnabled())
    await userEvent.click(btn('Change names or numbers instead'))
    expect(btn('nominees.submit')).toBeInTheDocument()
    expect(mock.back).not.toHaveBeenCalled()
  })

  // ── The AC7 device run's findings (2026-10-27) ──────────────────────────────────────────────────────────────────────
  it('device run D1 — *"Mark removed."* is SPOKEN ONCE, ⛔ a live region (TalkBack re-read one at the *Save marks* press, cleared or not), and leaves when the save starts', async () => {
    let finishSave!: (value: unknown) => void
    mock.saveMarks.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve }))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    const removed = screen.getByText('Mark removed.')
    expect(removed).not.toHaveAttribute('data-live')
    expect(mock.announce.mock.calls.filter(([x]) => x === 'Mark removed.')).toHaveLength(1)
    await userEvent.click(btn('Save marks'))
    expect(screen.queryByText('Mark removed.')).toBeNull()
    expect(mock.announce.mock.calls.filter(([x]) => x === 'Mark removed.')).toHaveLength(1)
    await act(async () => finishSave(status(2)))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
  })

  it('device run D2 — a pick is SPOKEN, ⛔ shown above rank 1: its only visible line is the picked rank\'s own label; each pick speaks', async () => {
    await openMarks()
    handNomineeLinkPick(2, { kind: 'new', mobile: '9876500003', foundBy: 'typed' })
    act(() => mock.focus!())
    const lines = screen.getAllByText('Marked as a member')
    expect(lines).toHaveLength(1)
    expect(screen.getByTestId('nominee-marks-rank-2')).toContainElement(lines[0]!)
    expect(mock.announce).toHaveBeenCalledWith('Marked as a member')
    mock.announce.mockClear()
    handNomineeLinkPick(1, { kind: 'new', mobile: '9876500002', foundBy: 'typed' }) // the SAME words, a second pick
    act(() => mock.focus!())
    expect(mock.announce).toHaveBeenCalledWith('Marked as a member')
    expect(screen.getByTestId('nominee-marks-rank-1')).toHaveTextContent('Marked as a member')
  })

  it('device run D3 — *Find…* renders its OWN label Text (Tamagui\'s wrapper is one line; `ellipsis={false}` was inert on the device) and keeps its 48 dp floor', async () => {
    mock.links = { ranks: RANKS, links: [] }
    await openMarks()
    const find = btn(/^Is this nominee a TWT member\? Find them in your contacts — nominees.secondary_label/)
    expect(find).toHaveAttribute('data-own-text', 'true')
    expect(find).toHaveTextContent('Is this nominee a TWT member? Find them in your contacts')
    expect(Number(find.getAttribute('data-height'))).toBeGreaterThanOrEqual(48)
  })
})

// ── Code review 2026-10-27 (second full review) — S1–S4 ──────────────────────────────────────────────────────────────────────
describe('Story 6.36f — code review 2026-10-27', () => {
  const TWO_MARKS = { ranks: RANKS, links: [{ rank: 1, linkId: L1, label: 'confirmed', name: 'Asha D.' }, { rank: 2, linkId: L2, label: 'confirmed', name: 'Ravi K.' }] }

  it('S1 — "Change names or numbers instead" offers *Continue draft* again for what was typed before the switch (the form still remounts fresh)', async () => {
    renderScreen()
    await userEvent.type((await screen.findAllByRole('textbox', { name: 'nominees.name' }))[0]!, 'Asha')
    expect(screen.queryByRole('button', { name: 'Continue draft' })).toBeNull()
    await userEvent.click(btn('Member marks'))
    await userEvent.click(btn('Change names or numbers instead'))
    expect(screen.getAllByRole('textbox', { name: 'nominees.name' })[0]).toHaveValue('') // MK8: remounted from `freshForms()`
    await userEvent.click(btn('Continue draft'))
    expect(screen.getAllByRole('textbox', { name: 'nominees.name' })[0]).toHaveValue('Asha')
  })

  it('S1 — a marks save still CLEARS the stored draft (MK8 — the SAME `invalidateAndLeave()`)', async () => {
    renderScreen()
    await userEvent.type((await screen.findAllByRole('textbox', { name: 'nominees.name' }))[0]!, 'Asha')
    expect(mock.drafts.has('nominees')).toBe(true)
    await userEvent.click(btn('Member marks'))
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.drafts.has('nominees')).toBe(false)
  })

  it('S1 — ⛔ *Continue draft* after the switch when ⛔ named draft is stored', async () => {
    await openMarks()
    await userEvent.click(btn('Change names or numbers instead'))
    expect(btn('nominees.submit')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue draft' })).toBeNull()
  })

  it('S2 — every mark control is disabled while the save runs: a removal is ⛔ spoken-but-unsent, and ⛔ find screen opens under the save', async () => {
    let finishSave!: (value: unknown) => void
    mock.saveMarks.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve }))
    mock.links = TWO_MARKS
    await openMarks()
    await userEvent.click(within(screen.getByTestId('nominee-mark-1')).getByRole('button', { name: /^Remove mark/ }))
    await userEvent.click(btn('Save marks'))
    for (const b of within(screen.getByTestId('nominee-marks-mode')).getAllByRole('button', { name: /— nominees\.(primary|secondary)_label$/ })) {
      expect(b).toBeDisabled()
    }
    await userEvent.click(within(screen.getByTestId('nominee-mark-0')).getByRole('button', { name: /^Remove mark/ }))
    await userEvent.click(within(screen.getByTestId('nominee-mark-0')).getByRole('button', { name: /^Pick a different member/ }))
    expect(mock.announce.mock.calls.filter(([x]) => x === 'Mark removed.')).toHaveLength(1)
    expect(mock.push).not.toHaveBeenCalled()
    await act(async () => finishSave(status(2)))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.saveMarks).toHaveBeenCalledWith({
      marks: [
        { rank: 1, versionNo: 3, memberLink: { kind: 'keep', linkId: L1 } },
        { rank: 2, versionNo: 1, memberLink: null },
      ],
    })
  })

  it('S2 — the controls come back after a refusal', async () => {
    mock.saveMarks.mockRejectedValueOnce(new ApiError(422, 'nominee.link_not_found', 'x'))
    mock.links = TWO_MARKS
    await openMarks()
    await userEvent.click(within(screen.getByTestId('nominee-mark-1')).getByRole('button', { name: /^Remove mark/ }))
    await userEvent.click(btn('Save marks'))
    await waitFor(() => expect(within(screen.getByTestId('nominee-mark-0')).getByRole('button', { name: /^Remove mark/ })).toBeEnabled())
  })

  it('S2 — a pick for a rank the basis does ⛔ have is dropped SILENTLY (⛔ "Marked as a member" for nothing)', async () => {
    mock.status.mockResolvedValue(status(1))
    mock.links = { ranks: [RANKS[0]], links: [] }
    await openMarks()
    handNomineeLinkPick(2, { kind: 'new', mobile: '9876500003', foundBy: 'typed' })
    act(() => mock.focus!())
    expect(mock.announce).not.toHaveBeenCalledWith('Marked as a member')
    expect(btn('Save marks')).toBeDisabled()
  })

  it('S3 — the entry card is disabled while a FULL save runs', async () => {
    let finishFull!: (value: unknown) => void
    mock.saveFull.mockImplementationOnce(() => new Promise((resolve) => { finishFull = resolve }))
    mock.links = { ranks: RANKS, links: [] }
    renderScreen()
    await userEvent.type(await screen.findByRole('textbox', { name: 'nominees.name' }), 'Asha')
    await userEvent.click(btn('nominees.relationship_spouse'))
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.mobile' }), '9876500009')
    await userEvent.click(btn('nominees.submit'))
    await waitFor(() => expect(mock.saveFull).toHaveBeenCalled())
    expect(btn('Member marks')).toBeDisabled()
    await userEvent.click(btn('Member marks'))
    expect(screen.queryByTestId('nominee-marks-mode')).toBeNull()
    await act(async () => finishFull(status(1)))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
  })

  it('S3 — the mode keeps the BASIS it started from: a later links refetch ⛔ re-pairs its `versionNo`s with the older record', async () => {
    await openMarks()
    act(() => mock.setLinks!({ ranks: [{ rank: 1, versionNo: 9, relationship: 'mother' }, { rank: 2, versionNo: 9, relationship: 'son' }], links: [] }))
    expect(screen.getByTestId('nominee-marks-rank-1')).toHaveTextContent('nominees.relationship_spouse') // still the started basis
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    await waitFor(() => expect(mock.saveMarks).toHaveBeenCalled())
    expect(mock.saveMarks.mock.calls[0]![0]).toEqual({
      marks: [
        { rank: 1, versionNo: 3, memberLink: null },
        { rank: 2, versionNo: 1, memberLink: null },
      ],
    })
  })

  it('S4 — a step-up in marks mode: the footer\'s Verify re-sends the SAME marks body (⛔ the full save) and leaves', async () => {
    mock.saveMarks.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x'))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    await userEvent.type(await screen.findByRole('textbox', { name: 'lifeEvents.step_up_required' }), '123456')
    await userEvent.click(btn('auth.verify'))
    await waitFor(() => expect(mock.back).toHaveBeenCalledTimes(1))
    expect(mock.stepUpRequest).toHaveBeenCalledWith('nominee_change')
    expect(mock.stepUpVerify).toHaveBeenCalledWith('123456')
    expect(mock.saveMarks).toHaveBeenCalledTimes(2)
    expect(mock.saveMarks.mock.calls[1]![0]).toEqual(mock.saveMarks.mock.calls[0]![0])
    expect(mock.saveFull).not.toHaveBeenCalled()
    expect(mock.announce).toHaveBeenCalledWith('Marks saved.')
  })

  it('S4 — a 409 `locked_claim_filed` in marks mode shows the LOCKED state', async () => {
    mock.saveMarks.mockRejectedValue(new ApiError(409, 'nominee.locked_claim_filed', 'x'))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(await screen.findByTestId('nominees-locked')).toBeInTheDocument()
    expect(mock.back).not.toHaveBeenCalled()
  })

  it('S4 — a 409 `link_stale` in marks mode reloads the marks, starts over and says so; a FAILED reload says it did not reload', async () => {
    mock.saveMarks.mockRejectedValue(new ApiError(409, 'nominee.link_stale', 'x'))
    await openMarks()
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(await screen.findByText('Your member marks changed since this screen opened. They have been reloaded — please save again.')).toBeInTheDocument()
    expect(mock.refetches).toBe(1)
    expect(btn('Save marks')).toBeDisabled() // started over from the reload
    mock.refetchFails = true
    await userEvent.click(btn(/^Remove mark/))
    await userEvent.click(btn('Save marks'))
    expect(await screen.findByText('Your member marks changed since this screen opened, but they could not be reloaded. Check your connection and save again.')).toBeInTheDocument()
    expect(btn('Save marks')).toBeEnabled() // ⛔ restarted over the old data — the member's change is still there
  })
})

// @vitest-environment jsdom
// Story 6.36f (Task 4; AC6; MK8, MK9; `2026-10-26-407`) — the NOMINEES SCREEN's marks-only mode, EXECUTED with React DOM and mocked
// native primitives (the 6.36e render-harness shape). MOCKED: `react-native` (+ `announceForAccessibility`), `tamagui` (plain
// elements), `expo-router` (the focus effect runs on mount and on demand), `@twt/i18n/react` (the common `useT` echoes keys), the
// API wrapper, the step-up gate (it runs the call), the draft store, the session, the two query hooks, `lib/mmkv`. REAL: the
// `nominee_link` translator (`t()` — a forgotten token THROWS), `AnnouncedText`, `lib/nominee-links.ts`, the shared mark control,
// TanStack Query (the status read). Layout, TalkBack and VoiceOver still need a device ([[feedback_record_unattested_no_backfill]]):
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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  memberAuth: { nomineesStatus: mock.status, lifeEventsUpdateNomineeMarks: mock.saveMarks, lifeEventsUpdateNominees: vi.fn() },
}))
vi.mock('../../components/life-events/useStepUpGate', () => ({
  useStepUpGate: () => ({ needsOtp: false, otp: '', setOtp: vi.fn(), reset: vi.fn(), guard: (fn: () => Promise<unknown>) => fn(), verifyAndRetry: (fn: () => Promise<unknown>) => fn() }),
}))
vi.mock('../../components/life-events/draft-store', () => ({ loadDraft: () => null, saveDraft: mock.saveDraft, clearDraft: vi.fn() }))
vi.mock('../../components/life-events/SaveAndResumeAffordance', () => ({ SaveAndResumeAffordance: () => null }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({ useKnownPeoplePromptsQuery: () => ({ data: { canNamePeople: mock.canFind } }) }))
vi.mock('../../components/nominee-links/useNomineeLinkQueries', async (importActual) => {
  const actual = await importActual<typeof import('../../components/nominee-links/useNomineeLinkQueries')>()
  const { useState } = await import('react')
  return {
    errorCodeOf: actual.errorCodeOf,
    useNomineeLinksQuery: () => {
      const [data, setData] = useState(mock.links)
      return {
        data,
        isError: false,
        errorUpdatedAt: 0,
        refetch: async () => {
          mock.refetches += 1
          if (mock.refetchWait) await mock.refetchWait
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
})

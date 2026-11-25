// @vitest-environment jsdom
// Story 6.36c code review round 2 — Life Events → Workplace (`app/(life-events)/posting.tsx`) EXECUTED with React DOM and
// mocked native primitives (the `home-prompt-cards-render` harness): the real screen, the real confirm question and its
// real outcome line run; the prompts / history queries and the picker are stubbed. Native layout and a real screen reader
// still need a device ([[feedback_record_unattested_no_backfill]]).
//   · "I have been transferred" is DISABLED while the suggestion's answer is in flight (round 1's guard, ⛔ tested until
//     now) and enabled again once it settles;
//   · the outcome line OUTLIVES the question on this screen too: the prompts DATA changes after the answer (the refetch
//     that unmounts the question) and the line is still there, spoken ONCE; pressing "I have been transferred" is moving
//     on, and clears it.
// Story 3.15d (S2, DL1): the "Show more" failure line is spoken ONCE per time it is SET, on both platforms — the history mock is now
// MUTABLE (it carries `errorUpdateCount`, the per-failure signal), `Platform.OS` is a getter, the workplace `t` is a NEW function per
// render and locale-DISTINCT after a switch, and tamagui records `testID` / `color` / `fontSize` and forwards `accessibilityLiveRegion`.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NBSP, sentAs } from './announce-text'

const mock = vi.hoisted(() => ({
  history: null as unknown,
  os: 'ios' as 'ios' | 'android',
  locale: 'en',
  prompts: null as unknown,
  answer: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  announce: vi.fn(),
  keys: 0,
}))

vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({ useKnownPeoplePromptsQuery: () => mock.prompts }))
vi.mock('../../components/workplace/useWorkplaceQueries', () => ({
  usePostingHistoryQuery: () => mock.history,
  workplaceKeys: { all: ['workplace'] },
}))
vi.mock('../../components/workplace/WorkplacePicker', async () => {
  const { createElement } = await import('react')
  return {
    WorkplacePicker: ({ onCancel }: { onCancel: () => void }) =>
      createElement('div', null, 'the picker', createElement('button', { onClick: onCancel }, 'cancel the picker')),
  }
})
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mock.invalidate }) }))
vi.mock('../../lib/member-api', () => ({ memberAuth: { answerWorkplaceSuggestion: mock.answer } }))
const echo = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).map(String).join(',')}` : key)
// In `en` the words are the echo every existing assertion reads; in another locale `<locale>:<echo>` — locale-DISTINCT, and a NEW function
// each call (as the real hook is), so a switch changes the words AND `t`'s identity.
vi.mock('../../lib/workplace-i18n', () => ({
  useWorkplaceT: () => (key: string, params?: Record<string, unknown>) => (mock.locale === 'en' ? echo(key, params) : `${mock.locale}:${echo(key, params)}`),
}))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => `key-${(mock.keys += 1)}` }))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
    Platform: {
      get OS() {
        return mock.os
      },
    },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, accessibilityLiveRegion, testID, color, fontSize }: {
    children?: React.ReactNode; accessibilityRole?: string; accessibilityLiveRegion?: string; testID?: string; color?: string; fontSize?: string
  }) =>
    createElement(
      'div',
      { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'aria-live': accessibilityLiveRegion, 'data-testid': testID, 'data-color': color, 'data-font-size': fontSize },
      children,
    )
  return {
    Text: container,
    XStack: container,
    YStack: container,
    H2: container,
    H4: container,
    Spinner: () => null,
    Button: ({ children, onPress, disabled }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) =>
      createElement('button', { onClick: onPress, disabled }, children),
  }
})

import WorkplaceScreen from '../../app/(life-events)/posting'
import { clearAnswerKeys } from '../../components/workplace/suggestion-answer-key-cache'

const NONE = { noWorkplace: true, hasWorkplace: false, suggestedWorkplace: null, transferReview: false, replaceNeeded: false, canNamePeople: false, campaign: null }
const SUGGESTION = { requestId: 'r-1', workplaceId: 'w-1', name: 'GMS RAMPUR', district: 'Patna' }
const ok = (data: unknown) => ({ data, isError: false })
const baseHistory = () => ({
  data: { pages: [{ items: [] }] },
  isPending: false,
  isError: false,
  isFetching: false,
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  errorUpdateCount: 0,
  refetch: vi.fn(),
  fetchNextPage: vi.fn(),
})

beforeEach(() => {
  mock.history = baseHistory()
  mock.os = 'ios'
  mock.locale = 'en'
  mock.keys = 0
  for (const f of [mock.answer, mock.invalidate, mock.announce]) f.mockClear()
  mock.answer.mockReset()
  clearAnswerKeys()
})
afterEach(cleanup)

const transferred = () => screen.getByText('transferred').closest('button')!

describe('the Workplace screen and the confirm question (code review round 2)', () => {
  it('"I have been transferred" is DISABLED while the answer is in flight; a press does nothing; enabled once it settles', async () => {
    let settle: (v: unknown) => void = () => undefined
    mock.answer.mockImplementation(() => new Promise((resolve) => (settle = resolve)))
    mock.prompts = ok({ ...NONE, noWorkplace: false, suggestedWorkplace: SUGGESTION })
    render(createElement(WorkplaceScreen))
    expect(transferred()).not.toBeDisabled()

    act(() => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    expect(transferred()).toBeDisabled()
    fireEvent.click(transferred())
    expect(screen.queryByText('the picker')).toBeNull() // ⛔ a second, concurrent posting write

    await act(async () => {
      settle({ answer: 'yes' })
      await Promise.resolve()
    })
    expect(transferred()).not.toBeDisabled()
    await userEvent.click(transferred())
    expect(screen.getByText('the picker')).toBeInTheDocument()
  })

  it('the outcome line OUTLIVES the question: the prompts change after a "Yes", the line stays (spoken once); "I have been transferred" clears it', async () => {
    mock.answer.mockResolvedValue({ answer: 'yes' })
    mock.prompts = ok({ ...NONE, noWorkplace: false, suggestedWorkplace: SUGGESTION })
    const { rerender } = render(createElement(WorkplaceScreen))
    await userEvent.click(screen.getByText('question.yes'))
    expect(mock.answer).toHaveBeenCalledWith('r-1', 'yes', 'w-1', 'key-1')
    expect(await screen.findByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()

    // The refetch the answer triggered: the suggestion is resolved, so the question goes away.
    mock.prompts = ok({ ...NONE, noWorkplace: false, hasWorkplace: true })
    rerender(createElement(WorkplaceScreen))
    expect(screen.queryByText('question.text:GMS RAMPUR,Patna')).toBeNull()
    expect(screen.getByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()
    expect(mock.announce.mock.calls.filter((c) => c[0] === 'question.saved_yes:GMS RAMPUR')).toHaveLength(1)

    // Moving on: the picker opens; backing out of it does ⛔ bring the old line back.
    await userEvent.click(transferred())
    await userEvent.click(screen.getByText('cancel the picker'))
    expect(screen.getByText('transferred')).toBeInTheDocument()
    expect(screen.queryByText('question.saved_yes:GMS RAMPUR')).toBeNull()
  })
})

// ── Story 3.15d, S2 (DL1, AC 2) — the "Show more" failure line, spoken ONCE per time it is SET, on BOTH platforms ──
// 3.15c-dev Y1: as `AnnouncedText` a Retry that failed AGAIN (the flag stays true through the retry, the words are the same, the line
// stays mounted) was sent NOTHING. The signal is the query's `errorUpdateCount` (proved against the real hooks in
// `workplace-query-error-signal.test.ts`); the line and its effect live in a CHILD rendered inside the `hasNextPage &&
// isFetchNextPageError` branch, so a page-1 refetch failure (which moves the same count) unmounts it — the structure is the answer.
// Counts are RUNNING TOTALS BY TEXT; every positive is awaited, every "nothing more" is asserted after a flush.
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const sentOf = (text: string) => sentAs(mock.announce.mock.calls, text)
const sends = (os: string, text: string, n: number) => Array.from({ length: n }, (_, k) => text + (os === 'android' ? NBSP.repeat(k) : ''))
const ROW = { postingId: 'p-1', isRetirement: false, startedOn: null, district: 'Patna', workplace: { name: 'GMS RAMPUR', kind: 'school' }, request: null }
const withRows = (over: Record<string, unknown>) => ({ ...baseHistory(), data: { pages: [{ items: [ROW] }] }, hasNextPage: true, ...over })
const showMoreOk = () => withRows({})
const showMoreFailed = (count: number) => withRows({ isError: true, isFetchNextPageError: true, errorUpdateCount: count })
/** A failed REFETCH of page 1: `fetchMeta` is cleared, so the flag is false — and the count moves all the same. */
const pageOneFailed = (count: number) => withRows({ isError: true, isFetchNextPageError: false, isFetching: false, errorUpdateCount: count })
const WORDS = 'history_error'

for (const os of ['ios', 'android'] as const) {
  describe(`S2 — the Show-more error line (${os})`, () => {
    beforeEach(() => {
      mock.os = os
      mock.prompts = ok(NONE)
    })
    const show = (h: unknown) => {
      mock.history = h
      return render(createElement(WorkplaceScreen))
    }
    const again = (view: ReturnType<typeof render>, h: unknown) => {
      mock.history = h
      view.rerender(createElement(WorkplaceScreen))
    }

    it('(a) Show more fails (the line mounts: spoken once), Retry fails AGAIN (the count moves, the SAME words) ⇒ spoken again; (e) nothing before the failure', async () => {
      const view = show(showMoreOk())
      await flush()
      expect(sentOf(WORDS)).toHaveLength(0)
      again(view, showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      again(view, showMoreFailed(2))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(2))
      expect(sentOf(WORDS)).toEqual(sends(os, WORDS, 2))
    })

    it('(e) a view that MOUNTS holding the error speaks it once', async () => {
      show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(b) a re-render beside the standing line sends nothing more; (d) role alert, ⛔ live region, testID, the look', async () => {
      const view = show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      const line = screen.getByTestId('posting-history-more-error')
      expect(line).toHaveAttribute('role', 'alert')
      expect(line).not.toHaveAttribute('aria-live')
      expect(line).toHaveAttribute('data-color', '#C0392B')
      expect(line).toHaveAttribute('data-font-size', '$2')
      again(view, showMoreFailed(1))
      again(view, showMoreFailed(1))
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(c) the line CLEARED (Show more succeeds) speaks nothing', async () => {
      const view = show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      again(view, showMoreOk())
      await flush()
      expect(screen.queryByTestId('posting-history-more-error')).toBeNull()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(f) a LOCALE SWITCH while the line stands sends nothing more (the line itself shows the new words)', async () => {
      const view = show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.locale = 'hi'
      again(view, showMoreFailed(1)) // `useWorkplaceT()` is a NEW function now, the words are `hi:…`
      await flush()
      expect(screen.getByTestId('posting-history-more-error')).toHaveTextContent(`hi:${WORDS}`)
      expect(sentOf(WORDS)).toHaveLength(1)
      expect(sentOf(`hi:${WORDS}`)).toHaveLength(0)
    })

    it('a PAGE-1 refetch failure moves the same count but does ⛔ speak the Show-more line — its own line is the other one (running totals per platform)', async () => {
      const view = show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1)) // the Show-more line's own mount: 1 on BOTH platforms
      again(view, pageOneFailed(2))
      await flush()
      // The page-1 line is still `AnnouncedText` (same words): its mount adds 1 on iOS (an announce) and ⛔ on Android (a live region,
      // which jsdom cannot hear) — a Show-more child that spoke here as well would make this 3 / 2.
      expect(sentOf(WORDS)).toHaveLength(os === 'ios' ? 2 : 1)
      expect(screen.queryByTestId('posting-history-more-error')).toBeNull()
      expect(screen.getAllByRole('alert')).toHaveLength(1)
    })

    it('a return from the picker (`transferring`) re-speaks a standing line ONCE — the child remounts, as the AnnouncedText did', async () => {
      show(showMoreFailed(1))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      await userEvent.click(transferred())
      expect(screen.getByText('the picker')).toBeInTheDocument()
      await userEvent.click(screen.getByText('cancel the picker'))
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(2))
      await flush()
      expect(sentOf(WORDS)).toEqual(sends(os, WORDS, 2))
    })
  })
}

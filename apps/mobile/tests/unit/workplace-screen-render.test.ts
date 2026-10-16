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
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  prompts: null as unknown,
  answer: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  announce: vi.fn(),
  keys: 0,
}))

vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({ useKnownPeoplePromptsQuery: () => mock.prompts }))
vi.mock('../../components/workplace/useWorkplaceQueries', () => ({
  usePostingHistoryQuery: () => ({
    data: { pages: [{ items: [] }] },
    isPending: false,
    isError: false,
    isFetching: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
  }),
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
vi.mock('../../lib/workplace-i18n', () => ({ useWorkplaceT: () => echo }))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => `key-${(mock.keys += 1)}` }))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
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

beforeEach(() => {
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

// @vitest-environment jsdom
// Story 6.36c fix-review — `WorkplaceSuggestionQuestion` EXECUTED with React DOM and mocked native primitives (the
// `home-prompt-cards-render` harness), rendered DIRECTLY (⛔ through `HomePromptCards`) so each test owns its own
// `requestId` against the REAL shared cache (`components/workplace/suggestion-answer-key-cache.ts`) — ⛔ a mock of it:
//   · "Saving…" shows on the PRESSED button ONLY — the other keeps its own label (the regression the fix-round fixed:
//     it used to show on "Yes" regardless of which button was pressed);
//   · `answered` locks BOTH buttons once a press lands 200 — a resend is ⛔;
//   · two rapid presses on the SAME button, before the first's promise settles, call the API ONCE (the synchronous
//     `inFlight` ref guard — a React re-render has ⛔ necessarily applied between them);
//   · two independent mounts of the SAME suggestion share ONE Idempotency-Key for the same press — the shared cache
//     is actually wired in, ⛔ merely present.
import '@testing-library/jest-dom/vitest'
import { createElement, Fragment } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  answer: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  announce: vi.fn(),
  keys: 0,
}))

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mock.invalidate }) }))
vi.mock('../../lib/member-api', () => ({ memberAuth: { answerWorkplaceSuggestion: mock.answer } }))
const echo = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).map(String).join(',')}` : key)
vi.mock('../../lib/workplace-i18n', () => ({ useWorkplaceT: () => echo }))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => `key-${(mock.keys += 1)}` }))
// `./useWorkplaceQueries` (its `workplaceKeys.all`) imports `useSession` at module level — unused by this component's
// OWN hooks, but still evaluated, and the real module reaches expo-secure-store (`__DEV__` ⛔ defined under vitest).
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibility: mock.announce } }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return {
    Text: container,
    XStack: container,
    YStack: container,
    Button: ({ children, onPress, disabled }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) =>
      createElement('button', { onClick: onPress, disabled }, children),
  }
})

import { WorkplaceSuggestionQuestion, type SuggestedWorkplace } from '../../components/workplace/WorkplaceSuggestionQuestion'

const suggestion = (over: Partial<SuggestedWorkplace> = {}): SuggestedWorkplace => ({
  requestId: 'r-1',
  workplaceId: 'w-1',
  name: 'GMS RAMPUR',
  district: 'Patna',
  ...over,
})

beforeEach(() => {
  mock.keys = 0
  for (const f of [mock.answer, mock.invalidate, mock.announce]) f.mockClear()
  mock.answer.mockReset()
})
afterEach(cleanup)

describe('"Saving…" is per-button (fix-review — it used to show on "Yes" regardless of which button was pressed)', () => {
  it('pressing "No" shows "Saving…" on No; "Yes" keeps its own label; both buttons are disabled while it is in flight', async () => {
    let resolveAnswer: (v: unknown) => void = () => undefined
    mock.answer.mockImplementation(() => new Promise((resolve) => (resolveAnswer = resolve)))
    render(createElement(WorkplaceSuggestionQuestion, { suggestion: suggestion({ requestId: 'r-saving' }) }))

    act(() => {
      fireEvent.click(screen.getByText('question.no'))
    })

    expect(screen.getByText('question.yes')).toBeInTheDocument() // unchanged — ⛔ "Saving…"
    expect(screen.queryByText('question.no')).toBeNull() // replaced by the busy label
    expect(screen.getByText('question.saving')).toBeInTheDocument()
    expect(screen.getByText('question.yes')).toBeDisabled()
    expect(screen.getByText('question.saving')).toBeDisabled()

    await act(async () => {
      resolveAnswer({ answer: 'no' })
      await Promise.resolve()
    })
  })
})

describe('the resend lock (`answered`) — fix-review', () => {
  it('once a press lands 200, both buttons stay disabled and a second press never calls the API again', async () => {
    mock.answer.mockResolvedValue({ answer: 'yes' })
    render(createElement(WorkplaceSuggestionQuestion, { suggestion: suggestion({ requestId: 'r-resend' }) }))

    await userEvent.click(screen.getByText('question.yes'))
    expect(await screen.findByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()
    expect(screen.getByText('question.yes')).toBeDisabled()
    expect(screen.getByText('question.no')).toBeDisabled()

    fireEvent.click(screen.getByText('question.yes')) // a disabled <button> swallows the click itself
    fireEvent.click(screen.getByText('question.no'))
    expect(mock.answer).toHaveBeenCalledTimes(1)
  })
})

describe('the fast double-tap guard (`inFlight` ref) — fix-review', () => {
  it('two rapid presses on the SAME button, before the first settles, call the API only ONCE', () => {
    mock.answer.mockImplementation(() => new Promise(() => undefined)) // never settles within this test
    render(createElement(WorkplaceSuggestionQuestion, { suggestion: suggestion({ requestId: 'r-doubletap' }) }))

    act(() => {
      // Both fire in the SAME tick — React has ⛔ necessarily re-rendered `disabled` between them; only the
      // synchronous `inFlight` ref can stop the second one.
      fireEvent.click(screen.getByText('question.yes'))
      fireEvent.click(screen.getByText('question.yes'))
    })

    expect(mock.answer).toHaveBeenCalledTimes(1)
  })
})

describe('the Idempotency-Key is SHARED across mounts of the SAME suggestion — fix-review', () => {
  it('two independent mounts, both pressing "Yes", send the SAME key — the shared cache is wired in, ⛔ merely present', async () => {
    mock.answer.mockResolvedValue({ answer: 'yes' })
    const s = suggestion({ requestId: 'r-shared' })
    render(
      createElement(
        Fragment,
        null,
        createElement(WorkplaceSuggestionQuestion, { suggestion: s }),
        createElement(WorkplaceSuggestionQuestion, { suggestion: s }),
      ),
    )
    const yesButtons = screen.getAllByText('question.yes')
    expect(yesButtons).toHaveLength(2)

    act(() => {
      // Both presses, same tick — before either mount's `answer()` has awaited its call.
      fireEvent.click(yesButtons[0]!)
      fireEvent.click(yesButtons[1]!)
    })

    expect(mock.answer).toHaveBeenCalledTimes(2)
    const [callA, callB] = mock.answer.mock.calls
    expect(callA![2]).toBe(callB![2]) // the SAME Idempotency-Key
    expect(callA![2]).toBe('key-1') // minted ONCE — the second mount reused it, ⛔ minting its own

    await screen.findAllByText('question.saved_yes:GMS RAMPUR') // let both presses settle before cleanup
  })
})

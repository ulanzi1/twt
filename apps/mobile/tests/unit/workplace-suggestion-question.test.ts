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
// ⚠ Code review round 2 — the outcome line is the PARENT's now (`onOutcome`), so each test renders the question inside
// a small host that shows it through the REAL `<SuggestionOutcomeLine>` (⛔ a transcription of it); and:
//   · a HUNG answer POST is bounded (`ANSWER_TIMEOUT_MS`, fake timers): at the bound the generic "could not save" line
//     shows (spoken), the SAME answer is enabled again, `onBusyChange(false)` reaches the parent, and the retry re-sends
//     the SAME key (idempotent);
//   · (fix-diff review) until that abandoned POST settles the OTHER answer is DISABLED (⛔ two concurrent opposite
//     answers from one mount — W7); when it settles, its REAL outcome replaces the timeout line (200 ⇒ saved; a refusal
//     ⇒ its own words; a transport error ⇒ ⛔ line) — but ⛔ a NEWER outcome is overwritten;
//   · the answer sends the SHOWN `workplaceId`.
import '@testing-library/jest-dom/vitest'
import { createElement, Fragment, useState } from 'react'
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

import {
  SuggestionOutcomeLine,
  WorkplaceSuggestionQuestion,
  type SuggestedWorkplace,
  type SuggestionOutcome,
} from '../../components/workplace/WorkplaceSuggestionQuestion'
import { clearAnswerKeys } from '../../components/workplace/suggestion-answer-key-cache'
import { ANSWER_TIMEOUT_MS } from '../../lib/workplace'

/** A parent, as Home / the Workplace screen are: it holds the outcome line and renders it with the REAL component. */
function Host({ s, onBusyChange }: { s: SuggestedWorkplace; onBusyChange?: (busy: boolean) => void }) {
  const [outcome, setOutcome] = useState<SuggestionOutcome | null>(null)
  return createElement(
    Fragment,
    null,
    createElement(WorkplaceSuggestionQuestion, { suggestion: s, onOutcome: setOutcome, ...(onBusyChange ? { onBusyChange } : {}) }),
    outcome !== null ? createElement(SuggestionOutcomeLine, { outcome }) : null,
  )
}

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
  clearAnswerKeys()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('"Saving…" is per-button (fix-review — it used to show on "Yes" regardless of which button was pressed)', () => {
  it('pressing "No" shows "Saving…" on No; "Yes" keeps its own label; both buttons are disabled while it is in flight', async () => {
    let resolveAnswer: (v: unknown) => void = () => undefined
    mock.answer.mockImplementation(() => new Promise((resolve) => (resolveAnswer = resolve)))
    render(createElement(Host, { s: suggestion({ requestId: 'r-saving' }) }))

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
    render(createElement(Host, { s: suggestion({ requestId: 'r-resend' }) }))

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
    render(createElement(Host, { s: suggestion({ requestId: 'r-doubletap' }) }))

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
        createElement(Host, { s }),
        createElement(Host, { s }),
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
    expect(callA![3]).toBe(callB![3]) // the SAME Idempotency-Key
    expect(callA![3]).toBe('key-1') // minted ONCE — the second mount reused it, ⛔ minting its own
    expect(callA![2]).toBe('w-1') // the SHOWN workplace travels with the answer (code review round 2)

    await screen.findAllByText('question.saved_yes:GMS RAMPUR') // let both presses settle before cleanup
  })
})

describe('a HUNG answer POST is bounded — code review round 2', () => {
  it('at ANSWER_TIMEOUT_MS: the "could not save" line (spoken), busy released, the parent told; the retry re-sends the SAME key', async () => {
    vi.useFakeTimers()
    mock.answer.mockImplementationOnce(() => new Promise(() => undefined)) // never settles — the transport has ⛔ timeout
    mock.answer.mockResolvedValueOnce({ answer: 'yes' })
    const busy: boolean[] = []
    render(createElement(Host, { s: suggestion({ requestId: 'r-hung' }), onBusyChange: (b: boolean) => busy.push(b) }))

    act(() => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    expect(screen.getByText('question.saving')).toBeDisabled()
    expect(busy).toEqual([true])

    await act(async () => {
      vi.advanceTimersByTime(ANSWER_TIMEOUT_MS - 1)
    })
    expect(screen.getByText('question.saving')).toBeInTheDocument() // ⛔ before the bound

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText('error_generic')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('error_generic')
    expect(screen.getByText('question.yes')).not.toBeDisabled()
    // Fix-diff review — the abandoned "Yes" is still out: "No" stays disabled (it would mint a FRESH key).
    expect(screen.getByText('question.no')).toBeDisabled()
    expect(busy).toEqual([true, false])

    await act(async () => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    expect(mock.answer.mock.calls.map((c) => c[3])).toEqual(['key-1', 'key-1']) // the kept key — idempotent
    expect(screen.getByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()
  })
})

describe('the abandoned (timed-out) POST — fix-diff review', () => {
  /** Press `answer`, let it time out; return the hung write's settle functions. */
  async function pressAndTimeOut(answer: 'yes' | 'no', requestId: string) {
    let resolveWrite: (v: unknown) => void = () => undefined
    let rejectWrite: (e: unknown) => void = () => undefined
    mock.answer.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          resolveWrite = resolve
          rejectWrite = reject
        }),
    )
    render(createElement(Host, { s: suggestion({ requestId }) }))
    act(() => {
      fireEvent.click(screen.getByText(`question.${answer}`))
    })
    await act(async () => {
      vi.advanceTimersByTime(ANSWER_TIMEOUT_MS)
    })
    expect(screen.getByText('error_generic')).toBeInTheDocument()
    return { resolveWrite: (v: unknown) => resolveWrite(v), rejectWrite: (e: unknown) => rejectWrite(e) }
  }
  const flush = () =>
    act(async () => {
      for (let i = 0; i < 5; i += 1) await Promise.resolve()
    })

  it('the OTHER answer is DISABLED until the abandoned POST settles — a press of it sends nothing; then it is free again', async () => {
    vi.useFakeTimers()
    const w = await pressAndTimeOut('yes', 'r-ab-other')
    const no = screen.getByText('question.no')
    expect(no).toBeDisabled()
    fireEvent.click(no)
    expect(mock.answer).toHaveBeenCalledTimes(1) // ⛔ a concurrent opposite answer
    w.rejectWrite(new Error('network'))
    await flush()
    expect(screen.getByText('question.no')).not.toBeDisabled()
  })

  it('a late 200 replaces the "could not save" line with the saved line (spoken), and locks both buttons', async () => {
    vi.useFakeTimers()
    const w = await pressAndTimeOut('yes', 'r-ab-200')
    w.resolveWrite({ answer: 'yes' })
    await flush()
    expect(screen.queryByText('error_generic')).toBeNull()
    expect(screen.getByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('question.saved_yes:GMS RAMPUR')
    expect(screen.getByText('question.yes')).toBeDisabled()
    expect(screen.getByText('question.no')).toBeDisabled()
  })

  it('a late REFUSAL reads its own words; a late transport error drops the line', async () => {
    vi.useFakeTimers()
    const a = await pressAndTimeOut('no', 'r-ab-refused')
    a.rejectWrite(Object.assign(new Error('closed'), { status: 409, code: 'workplace.request_closed' }))
    await flush()
    expect(screen.queryByText('error_generic')).toBeNull()
    expect(screen.getByText('refusal.request_closed')).toBeInTheDocument()
    cleanup()

    const b = await pressAndTimeOut('no', 'r-ab-network')
    b.rejectWrite(new Error('network'))
    await flush()
    expect(screen.queryByText('error_generic')).toBeNull()
    expect(screen.queryByText(/^refusal\./)).toBeNull()
  })

  it('⛔ a NEWER outcome is overwritten: the same answer retried (same key) and refused, then the abandoned POST lands', async () => {
    vi.useFakeTimers()
    const w = await pressAndTimeOut('yes', 'r-ab-newer')
    mock.answer.mockRejectedValueOnce(Object.assign(new Error('in progress'), { status: 409, code: 'life_events.idempotency_in_progress' }))
    await act(async () => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    await flush()
    expect(mock.answer.mock.calls.map((c) => c[3])).toEqual(['key-1', 'key-1']) // the SAME key
    expect(screen.getByText('refusal.in_progress')).toBeInTheDocument()
    w.resolveWrite({ answer: 'yes' })
    await flush()
    expect(screen.getByText('refusal.in_progress')).toBeInTheDocument() // the newer line stays
    expect(screen.queryByText('question.saved_yes:GMS RAMPUR')).toBeNull()
  })
})

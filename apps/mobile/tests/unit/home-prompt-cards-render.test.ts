// @vitest-environment jsdom
// Story 6.36c (Task 6.6; AC4, AC6) — the home's reminder cards and the confirm question, EXECUTED with React DOM and mocked
// native primitives (the 6.36b render harness): the real container, cards, dismissals and answer handler run; native
// layout and a real screen reader still need a device ([[feedback_record_unattested_no_backfill]]).
//   · ONE card at a time, in order; "Not now" hides it (MMKV) and shows the next; ⛔ a card on load / error;
//   · (b) "Invite" opens ONE share sheet; "Add people who know you" ONLY for a member who may name people;
//   · the answer: Yes ⇒ the route with a key, the prompts / history / summary refetched, the confirmation spoken; No;
//     a 409 stale and a 409 closed each read their own words; a retry of the same press reuses its key.
// ⚠ Code review round 2:
//   · the outcome line OUTLIVES the question: the prompts DATA changes after the answer (`mock.prompts` + a re-render —
//     the refetch that unmounts the question) and the line is still there, spoken ONCE, ABOVE the next card;
//   · "spoken" asserts `announce` (⛔ only that the text is on screen); the prompts invalidation's predicate is run
//     against a REAL `knownPeoplePromptsKey(…)` and a non-matching key;
//   · "Not now" is DISABLED while an answer is in flight (⛔ an enabled no-op); the suggestion's "Not now" is
//     session-only (⛔ MMKV) and cleared by `clearSessionSuggestionDismissals` (sign-out);
//   · a failed BACKGROUND refetch (data kept) still shows the cards; the answer sends the SHOWN `workplaceId`; a 409
//     `suggestion_changed` reads its own words; the lost-200 "No", then none, then the same workplace again mints a
//     FRESH key (the prompts-driven eviction is wired in, ⛔ merely present).
// ⚠ Fix-diff review — `useFocusEffect` is a CONTROLLABLE mock (`mock.blur()` / `mock.focus()`): an outcome that arrives
//   while Home is blurred is dropped (⛔ shown, ⛔ spoken), and the line is cleared on blur AND on focus gain.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  prompts: null as unknown,
  answer: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  share: vi.fn(async () => ({})),
  push: vi.fn(),
  announce: vi.fn(),
  keys: 0,
  // The controllable focus (fix-diff review): `blur()` runs the focus effect's cleanup, `focus()` runs it again.
  blur: () => undefined as void,
  focus: () => undefined as void,
}))

class FakeApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({ useKnownPeoplePromptsQuery: () => mock.prompts }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mock.invalidate }) }))
vi.mock('../../lib/member-api', () => ({ memberAuth: { answerWorkplaceSuggestion: mock.answer } }))
// `useFocusEffect` — Home's focus tracking. ⛔ A no-op (fix-diff review): the screen mounts FOCUSED (the effect runs,
// as expo-router runs it), and `mock.blur()` / `mock.focus()` drive what a navigator would.
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    useRouter: () => ({ push: mock.push }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(() => {
        let cleanup = effect()
        mock.blur = () => {
          if (typeof cleanup === 'function') cleanup()
          cleanup = undefined
        }
        mock.focus = () => {
          cleanup = effect()
        }
        return () => {
          if (typeof cleanup === 'function') cleanup()
        }
      }, [effect])
    },
  }
})
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
const echo = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).map(String).join(',')}` : key)
vi.mock('../../lib/workplace-i18n', () => ({ useWorkplaceT: () => echo }))
vi.mock('../../lib/known-people-i18n', () => ({ useKnownPeopleT: () => echo }))
vi.mock('../../lib/trust-name', () => ({ configuredTrustName: () => null }))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => `key-${(mock.keys += 1)}` }))
vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('react-native', () => ({ Share: { share: mock.share }, Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibility: mock.announce } }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return {
    Text: container,
    XStack: container,
    YStack: container,
    Button: ({ children, onPress, disabled }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) => createElement('button', { onClick: onPress, disabled }, children),
  }
})

import { HomePromptCards } from '../../components/home/HomePromptCards'
import { knownPeopleListKey, knownPeoplePromptsKey } from '../../components/known-people/known-people-cache'
import { clearAnswerKeys } from '../../components/workplace/suggestion-answer-key-cache'
import { clearSessionSuggestionDismissals, homeCardDismissalsKey } from '../../lib/home-card-dismissals'

const NONE = { noWorkplace: false, hasWorkplace: false, suggestedWorkplace: null, transferReview: false, replaceNeeded: false, canNamePeople: false, campaign: null }
const SUGGESTION = { requestId: 'r-1', workplaceId: 'w-1', name: 'GMS RAMPUR', district: 'Patna' }
const ok = (data: unknown) => ({ data, isError: false })

beforeEach(() => {
  mock.store.clear()
  mock.keys = 0
  for (const f of [mock.answer, mock.invalidate, mock.share, mock.push, mock.announce]) f.mockClear()
  mock.answer.mockReset()
  // The two module-level stores (sign-out clears them in the app) — ⛔ leaking between tests (code review round 2).
  clearSessionSuggestionDismissals()
  clearAnswerKeys()
})
afterEach(cleanup)

describe('<HomePromptCards> (AC6; RV7)', () => {
  it('⛔ a card while loading, on an error, or with no flag', () => {
    for (const q of [{ data: undefined, isError: false }, { data: undefined, isError: true }, ok(NONE)]) {
      mock.prompts = q
      const { container, unmount } = render(createElement(HomePromptCards))
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('code review round 2 — a failed BACKGROUND refetch (the data kept) still shows the card', () => {
    mock.prompts = { data: { ...NONE, hasWorkplace: true }, isError: true }
    render(createElement(HomePromptCards))
    expect(screen.getByText('card.invite_title')).toBeInTheDocument()
  })

  it('ONE card at a time, in order; "Not now" stores the dismissal and shows the next', async () => {
    mock.prompts = ok({ ...NONE, replaceNeeded: true, transferReview: true, hasWorkplace: true, canNamePeople: true })
    render(createElement(HomePromptCards))
    expect(screen.getByText('card.replace_title')).toBeInTheDocument()
    expect(screen.queryByText('card.transfer_title')).toBeNull()
    await userEvent.click(screen.getByText('card.dismiss'))
    expect(JSON.parse(mock.store.get(homeCardDismissalsKey('m'))!)).toHaveProperty('replace')
    expect(screen.getByText('card.transfer_title')).toBeInTheDocument()
    await userEvent.click(screen.getByText('card.dismiss'))
    expect(screen.getByText('card.invite_title')).toBeInTheDocument()
  })

  it('(a) opens the Workplace screen; (e) the people screen', async () => {
    mock.prompts = ok({ ...NONE, noWorkplace: true })
    const a = render(createElement(HomePromptCards))
    await userEvent.click(screen.getAllByText('card.add_action').at(-1)!)
    expect(mock.push).toHaveBeenLastCalledWith('/(life-events)/posting')
    a.unmount()
    mock.prompts = ok({ ...NONE, replaceNeeded: true })
    render(createElement(HomePromptCards))
    await userEvent.click(screen.getByText('card.open'))
    expect(mock.push).toHaveBeenLastCalledWith('/(life-events)/known-people')
  })

  it('(b) "Invite" opens ONE share sheet; "Add people who know you" ONLY when the member may name people', async () => {
    mock.prompts = ok({ ...NONE, hasWorkplace: true, canNamePeople: false })
    const a = render(createElement(HomePromptCards))
    expect(screen.queryByText('card.add_people')).toBeNull()
    await userEvent.click(screen.getByText('card.invite_action'))
    expect(mock.share).toHaveBeenCalledTimes(1)
    expect(mock.share).toHaveBeenCalledWith({ message: 'invite.message_no_name' })
    a.unmount()
    mock.prompts = ok({ ...NONE, hasWorkplace: true, canNamePeople: true })
    render(createElement(HomePromptCards))
    expect(screen.getByText('card.add_people')).toBeInTheDocument()
  })
})

describe('the confirm question (AC4)', () => {
  const showSuggestion = () => {
    mock.prompts = ok({ ...NONE, noWorkplace: true, suggestedWorkplace: SUGGESTION })
    return render(createElement(HomePromptCards))
  }

  it('asks the question with the name and the district; ⛔ "Add your workplace" while it is open', () => {
    showSuggestion()
    expect(screen.getByText('question.text:GMS RAMPUR,Patna')).toBeInTheDocument()
    expect(screen.queryByText('card.add_title')).toBeNull()
  })

  it('"Yes" ⇒ the route with the key minted when SHOWN; the prompts, history and summary refetched; the confirmation spoken', async () => {
    mock.answer.mockResolvedValue({ answer: 'yes', summary: {} })
    showSuggestion()
    await userEvent.click(screen.getByText('question.yes'))
    // Code review round 2 — the SHOWN workplace travels with the answer.
    expect(mock.answer).toHaveBeenCalledWith('r-1', 'yes', 'w-1', 'key-1')
    expect(await screen.findByText('question.saved_yes:GMS RAMPUR')).toBeInTheDocument()
    // SPOKEN — ⛔ only on screen (code review round 2).
    expect(mock.announce).toHaveBeenCalledWith('question.saved_yes:GMS RAMPUR')
    expect(mock.invalidate).toHaveBeenCalledWith({ queryKey: ['workplace'] })
    expect(mock.invalidate).toHaveBeenCalledWith({ queryKey: ['member', 'life-events'] })
    // The prompts invalidation — its predicate run against a REAL prompts key and a non-matching one (round 2).
    const call = mock.invalidate.mock.calls.find((c) => typeof (c as unknown[])[0] === 'object' && 'predicate' in ((c as unknown[])[0] as object))
    expect(call).toBeDefined()
    const predicate = ((call as unknown[])[0] as { predicate: (q: { queryKey: readonly unknown[] }) => boolean }).predicate
    expect(predicate({ queryKey: knownPeoplePromptsKey('p', 'm') })).toBe(true)
    expect(predicate({ queryKey: knownPeopleListKey('p', 'm') })).toBe(false)
    expect(predicate({ queryKey: ['workplace'] })).toBe(false)
  })

  it('"No" ⇒ the route; the thank-you line', async () => {
    mock.answer.mockResolvedValue({ answer: 'no' })
    showSuggestion()
    await userEvent.click(screen.getByText('question.no'))
    expect(mock.answer).toHaveBeenCalledWith('r-1', 'no', 'w-1', 'key-1')
    expect(await screen.findByText('question.saved_no')).toBeInTheDocument()
  })

  it('a 409 stale and a 409 closed read their own words; a retry of the same press reuses its key, the other answer mints a new one', async () => {
    mock.answer.mockRejectedValueOnce(new FakeApiError(409, 'workplace.suggestion_stale'))
    mock.answer.mockRejectedValueOnce(new FakeApiError(409, 'workplace.request_closed'))
    mock.answer.mockResolvedValueOnce({ answer: 'no' })
    showSuggestion()
    await userEvent.click(screen.getByText('question.yes'))
    expect(await screen.findByText('refusal.suggestion_stale')).toBeInTheDocument()
    await userEvent.click(screen.getByText('question.yes'))
    expect(await screen.findByText('refusal.request_closed')).toBeInTheDocument()
    await act(async () => {
      await userEvent.click(screen.getByText('question.no'))
    })
    expect(mock.answer.mock.calls.map((c) => c[3])).toEqual(['key-1', 'key-1', 'key-2'])
  })

  it('code review round 2 — the outcome line OUTLIVES the question: the prompts change after a "No", the line stays (spoken once) ABOVE the next card', async () => {
    mock.answer.mockResolvedValue({ answer: 'no' })
    const { rerender } = showSuggestion()
    await userEvent.click(screen.getByText('question.no'))
    expect(await screen.findByText('question.saved_no')).toBeInTheDocument()
    // The refetch the answer triggered: ⛔ a suggestion any more, so (a) "Add your workplace" now applies.
    mock.prompts = ok({ ...NONE, noWorkplace: true })
    rerender(createElement(HomePromptCards))
    expect(screen.queryByText('question.text:GMS RAMPUR,Patna')).toBeNull() // the question is gone…
    const line = screen.getByText('question.saved_no') // …its line is not
    const next = screen.getByText('card.add_title')
    // ABOVE the next card (document order), ⛔ replaced by it.
    expect(line.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Spoken exactly ONCE — the line was ⛔ remounted by the card change.
    expect(mock.announce.mock.calls.filter((c) => c[0] === 'question.saved_no')).toHaveLength(1)
    // "Not now" on the next card is moving on — the line goes with it.
    await userEvent.click(screen.getByText('card.dismiss'))
    expect(screen.queryByText('question.saved_no')).toBeNull()
  })

  it('code review round 2 — "Not now" is DISABLED while the answer is in flight; a press does nothing; it is enabled again once it settles', async () => {
    let refuse: (e: unknown) => void = () => undefined
    mock.answer.mockImplementation(() => new Promise((_resolve, reject) => (refuse = reject)))
    showSuggestion()
    act(() => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    const notNow = screen.getByText('card.dismiss').closest('button')!
    expect(notNow).toBeDisabled()
    fireEvent.click(notNow)
    expect(screen.getByText('question.text:GMS RAMPUR,Patna')).toBeInTheDocument() // ⛔ dismissed
    // REJECTS (fix-diff review: it used to RESOLVE with the error, so the leg ran the success path).
    await act(async () => {
      refuse(new FakeApiError(409, 'workplace.suggestion_stale'))
      await Promise.resolve()
    })
    expect(screen.getByText('refusal.suggestion_stale')).toBeInTheDocument()
    expect(screen.getByText('card.dismiss').closest('button')!).not.toBeDisabled()
  })

  it('code review round 2 — the suggestion\'s "Not now" is SESSION-only: ⛔ MMKV, kept across a remount, gone after the sign-out clear', async () => {
    showSuggestion()
    await userEvent.click(screen.getByText('card.dismiss'))
    expect(screen.queryByText('card.suggestion_title')).toBeNull()
    expect(mock.store.get(homeCardDismissalsKey('m'))).toBeUndefined() // ⛔ the 30-day store
    cleanup()
    showSuggestion()
    expect(screen.queryByText('card.suggestion_title')).toBeNull() // the same app session
    cleanup()
    clearSessionSuggestionDismissals() // what sign-out runs
    showSuggestion()
    expect(screen.getByText('card.suggestion_title')).toBeInTheDocument()
  })

  it('code review round 2 — a 409 suggestion_changed reads its own words', async () => {
    mock.answer.mockRejectedValueOnce(new FakeApiError(409, 'workplace.suggestion_changed'))
    showSuggestion()
    await userEvent.click(screen.getByText('question.yes'))
    expect(await screen.findByText('refusal.suggestion_changed')).toBeInTheDocument()
  })

  it('code review round 2 — the lost-200 "No", then no suggestion, then the SAME workplace again: the new "No" carries a FRESH key', async () => {
    mock.answer.mockRejectedValueOnce(new Error('network')) // the server applied it; the 200 was lost
    mock.answer.mockResolvedValueOnce({ answer: 'no' })
    const { rerender } = showSuggestion()
    await userEvent.click(screen.getByText('question.no'))
    expect(await screen.findByText('error_generic')).toBeInTheDocument()
    mock.prompts = ok({ ...NONE, noWorkplace: true }) // the refetch: none
    rerender(createElement(HomePromptCards))
    mock.prompts = ok({ ...NONE, noWorkplace: true, suggestedWorkplace: SUGGESTION }) // re-suggested, the same workplace
    rerender(createElement(HomePromptCards))
    await userEvent.click(screen.getByText('question.no'))
    expect(mock.answer.mock.calls.map((c) => c[3])).toEqual(['key-1', 'key-2']) // ⛔ the replayed 'key-1'
  })

  it('fix-diff review — an outcome that arrives while Home is BLURRED is dropped (⛔ shown, ⛔ spoken); the line clears on blur and on refocus', async () => {
    let resolveFirst: (v: unknown) => void = () => undefined
    mock.answer.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    mock.answer.mockRejectedValueOnce(new FakeApiError(409, 'workplace.suggestion_stale'))
    showSuggestion()

    // (1) A press still out when the member LEAVES Home: its outcome lands while blurred.
    act(() => {
      fireEvent.click(screen.getByText('question.yes'))
    })
    act(() => mock.blur())
    await act(async () => {
      resolveFirst({ answer: 'yes' })
      for (let i = 0; i < 3; i += 1) await Promise.resolve()
    })
    expect(screen.queryByText('question.saved_yes:GMS RAMPUR')).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith('question.saved_yes:GMS RAMPUR')
    act(() => mock.focus())
    expect(screen.queryByText('question.saved_yes:GMS RAMPUR')).toBeNull() // ⛔ waiting on the return either
    cleanup()

    // (2) A line shown while focused is cleared on blur — and stays cleared on refocus.
    clearAnswerKeys()
    showSuggestion()
    await userEvent.click(screen.getByText('question.yes'))
    expect(await screen.findByText('refusal.suggestion_stale')).toBeInTheDocument()
    act(() => mock.blur())
    expect(screen.queryByText('refusal.suggestion_stale')).toBeNull()
    act(() => mock.focus())
    expect(screen.queryByText('refusal.suggestion_stale')).toBeNull()
  })
})

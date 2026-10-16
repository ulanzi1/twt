// Story 6.36c fix-review — `components/workplace/suggestion-answer-key-cache.ts`, the suggestion answer's
// Idempotency-Key state SHARED across every mount of the SAME suggestion. Node-only: the module itself is React-free,
// wrapping `lib/workplace.ts`'s `freshAnswerKeyState` / `answerKeyFor` / `answerKeySettled` (covered on their own in
// `home-cards.test.ts`) in a `Map<requestId, …>`.
//   · two get-or-creates for the SAME (requestId, workplaceId) share ONE state — a retry of the same answer still
//     reuses its key, now through the shared cache;
//   · a different `workplaceId` for the same `requestId` (a re-suggestion) is unrelated to the stale entry — a fresh
//     key is minted, ⛔ the old one reused;
//   · `evictAnswerKey` forgets a resolved `requestId` — the NEXT get-or-create mints a genuinely fresh key;
//   · a FAILED attempt's entry is kept (⛔ evicted) — the retry-reuse semantics still work through the shared cache.

import { describe, expect, it } from 'vitest'

import { evictAnswerKey, getOrCreateAnswerKeyState, setAnswerKeyState } from '../../components/workplace/suggestion-answer-key-cache'
import { answerKeyFor, answerKeySettled } from '../../lib/workplace'

describe('getOrCreateAnswerKeyState (shared across mounts)', () => {
  it('two get-or-creates for the SAME requestId share one state — a retry of the same answer reuses its key', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-1', 'w-1', mint) // fresh — mints k1
    const pressed = answerKeyFor(first, 'yes', mint)
    expect(pressed.key).toBe('k1')
    setAnswerKeyState('r-1', 'w-1', pressed.state)

    // A SECOND get-or-create for the same (requestId, workplaceId) — a second mount of the SAME suggestion — sees
    // the first mount's state, ⛔ a fresh one.
    const second = getOrCreateAnswerKeyState('r-1', 'w-1', mint)
    const retry = answerKeyFor(second, 'yes', mint) // a retry of the same ('yes') press
    expect(retry.key).toBe('k1') // reused — ⛔ a new mint
  })

  it('a different workplaceId for the same requestId is a fresh suggestion — the stale entry is evicted', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-2', 'w-1', mint) // k1
    setAnswerKeyState('r-2', 'w-1', answerKeyFor(first, 'yes', mint).state)

    // The SAME requestId, re-suggested against a DIFFERENT workplace — unrelated to the stale 'w-1' entry.
    const fresh = getOrCreateAnswerKeyState('r-2', 'w-2', mint)
    expect(fresh.shownKey).toBe('k2') // a NEW key, ⛔ the stale one
    expect(fresh.last).toBeNull()

    // The eviction is real, ⛔ cosmetic — a THIRD call for the same (requestId, 'w-2') now shares the fresh state.
    const again = getOrCreateAnswerKeyState('r-2', 'w-2', mint)
    expect(again.shownKey).toBe('k2')
  })

  it('evictAnswerKey removes the entry — a later get-or-create mints a genuinely fresh key', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-3', 'w-1', mint) // k1
    setAnswerKeyState('r-3', 'w-1', answerKeyFor(first, 'yes', mint).state)

    evictAnswerKey('r-3') // the answer landed 200 — nothing should reuse that key again

    const after = getOrCreateAnswerKeyState('r-3', 'w-1', mint)
    expect(after.shownKey).toBe('k2') // fresh — ⛔ the evicted 'k1'
    expect(after.last).toBeNull()
  })

  it('a FAILED attempt is kept (⛔ evicted) — the retry-reuse semantics still work through the shared cache', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-4', 'w-1', mint) // k1
    const failed = answerKeyFor(first, 'yes', mint)
    setAnswerKeyState('r-4', 'w-1', answerKeySettled(failed.state, false)) // 200 ⛔ landed

    // ⛔ evicted — a later get-or-create for the SAME requestId still sees the failed press.
    const after = getOrCreateAnswerKeyState('r-4', 'w-1', mint)
    const retry = answerKeyFor(after, 'yes', mint)
    expect(retry.key).toBe('k1') // reused — the failed press's key, ⛔ a fresh mint

    // The OTHER answer still mints anew (`answerKeyFor`'s own semantics — unaffected by living in the shared cache).
    const other = answerKeyFor(after, 'no', mint)
    expect(other.key).toBe('k2')
  })
})

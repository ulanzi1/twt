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
// ⚠ Code review round 2:
//   · the lost-200 "No", then the prompts show NONE (`evictAnswerKeysExcept(null)`), then a re-suggestion of the SAME
//     workplace: a FRESH key (⛔ the old `{ answer: 'no' }` replayed for 24 h); the suggestion still shown is kept;
//   · a late sibling FAILURE does ⛔ resurrect an entry a 200 evicted (`updateAnswerKeyStateIfPresent`);
//   · `evictAnswerKey` spares a re-suggestion's entry for a DIFFERENT workplace; `clearAnswerKeys` (sign-out).

import { describe, expect, it } from 'vitest'

import {
  clearAnswerKeys,
  evictAnswerKey,
  evictAnswerKeysExcept,
  getOrCreateAnswerKeyState,
  setAnswerKeyState,
  updateAnswerKeyStateIfPresent,
} from '../../components/workplace/suggestion-answer-key-cache'
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

    evictAnswerKey('r-3', 'w-1') // the answer landed 200 — nothing should reuse that key again

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

describe('the cache follows the PROMPTS — code review round 2', () => {
  it('the lost-200 "No", then none, then the SAME workplace re-suggested ⇒ a FRESH key; the suggestion still shown is kept', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const shown = getOrCreateAnswerKeyState('r-10', 'w-1', mint) // k1
    const no = answerKeyFor(shown, 'no', mint)
    expect(no.key).toBe('k1')
    // The "No" landed on the server but its 200 was LOST — the client records a failure (`ok: false`).
    setAnswerKeyState('r-10', 'w-1', answerKeySettled(no.state, false))
    // Another suggestion, still shown, is ⛔ touched by an eviction that keeps it.
    getOrCreateAnswerKeyState('r-11', 'w-9', mint) // k2
    evictAnswerKeysExcept({ requestId: 'r-11', workplaceId: 'w-9' })
    expect(getOrCreateAnswerKeyState('r-11', 'w-9', mint).shownKey).toBe('k2') // kept

    // The prompts now show NONE.
    evictAnswerKeysExcept(null)
    // …then the SAME workplace is suggested again for the same request.
    const again = getOrCreateAnswerKeyState('r-10', 'w-1', mint)
    const secondNo = answerKeyFor(again, 'no', mint)
    expect(secondNo.key).not.toBe('k1') // ⛔ the replayed old key
    expect(secondNo.key).toBe('k3')
  })

  it('a different suggestion shown ⇒ every other entry is dropped', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    getOrCreateAnswerKeyState('r-12', 'w-1', mint) // k1
    evictAnswerKeysExcept({ requestId: 'r-12', workplaceId: 'w-2' }) // the same request, re-suggested elsewhere
    expect(getOrCreateAnswerKeyState('r-12', 'w-1', mint).shownKey).toBe('k2') // ⛔ the old k1
  })

  it('a late sibling FAILURE does ⛔ resurrect an entry its sibling\'s 200 evicted', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-13', 'w-1', mint) // k1
    const pressed = answerKeyFor(first, 'yes', mint)
    setAnswerKeyState('r-13', 'w-1', pressed.state)
    // Mount A's 200 lands — evicted.
    evictAnswerKey('r-13', 'w-1')
    // Mount B's press of the same key then FAILS (late) — its catch must ⛔ write the dead key back.
    updateAnswerKeyStateIfPresent('r-13', 'w-1', answerKeySettled(pressed.state, false))
    const next = getOrCreateAnswerKeyState('r-13', 'w-1', mint)
    expect(next.shownKey).toBe('k2') // fresh — ⛔ the resurrected k1
    expect(next.last).toBeNull()
  })

  it('a failure DOES update an entry that is still there (the retry still reuses its key)', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    const first = getOrCreateAnswerKeyState('r-14', 'w-1', mint)
    const pressed = answerKeyFor(first, 'yes', mint)
    setAnswerKeyState('r-14', 'w-1', pressed.state)
    updateAnswerKeyStateIfPresent('r-14', 'w-1', answerKeySettled(pressed.state, false))
    expect(answerKeyFor(getOrCreateAnswerKeyState('r-14', 'w-1', mint), 'yes', mint).key).toBe('k1')
    // ⛔ for another workplace under the same request: that entry is not this press's.
    updateAnswerKeyStateIfPresent('r-14', 'w-2', answerKeySettled(pressed.state, true))
    expect(getOrCreateAnswerKeyState('r-14', 'w-1', mint).last?.ok).toBe(false)
  })

  it('evictAnswerKey spares a re-suggestion of a DIFFERENT workplace; clearAnswerKeys forgets everything', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    getOrCreateAnswerKeyState('r-15', 'w-2', mint) // k1 — the re-suggestion now shown
    evictAnswerKey('r-15', 'w-1') // a LATE 200 for the old workplace
    expect(getOrCreateAnswerKeyState('r-15', 'w-2', mint).shownKey).toBe('k1') // kept
    clearAnswerKeys()
    expect(getOrCreateAnswerKeyState('r-15', 'w-2', mint).shownKey).toBe('k2')
  })
})

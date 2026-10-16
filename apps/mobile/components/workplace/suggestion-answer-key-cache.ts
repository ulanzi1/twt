// The suggestion answer's Idempotency-Key, SHARED across every mount of the SAME suggestion (Story 6.36c fix-review).
//
// `WorkplaceSuggestionQuestion` used to keep its key state in a per-component `useRef` (`AnswerKeyState` —
// `lib/workplace.ts`'s `freshAnswerKeyState` / `answerKeyFor` / `answerKeySettled`). But the SAME suggestion (the same
// `requestId`) can be mounted TWICE at once — on the home card AND at the top of the Workplace screen — and two
// `useRef`s each mint their OWN key for what is the same logical press: a "Yes" on one screen and a "Yes" on the other,
// pressed close together, would carry two DIFFERENT Idempotency-Keys instead of de-duplicating to one.
//
// This module generalizes that same state to be SHARED: a tiny `Map<requestId, …>` that every mount reads and writes
// through (synchronously, before its own `await`), so a second mount's press sees the first mount's in-flight (or
// just-failed) state and reuses its key exactly as `answerKeyFor` already intends for a single mount — ⛔ its
// retry/failure semantics are changed here, only WHERE the state lives.
//
// A re-suggestion keeps its `requestId` (`lib/home-cards.ts`'s comment on the dismissal key), so each entry also carries
// the `workplaceId` it was created for: a mount that shows a DIFFERENT `workplaceId` for the same `requestId` (the
// prompts refetched to a new suggestion) is treated as unrelated — a fresh state, not the stale one of the suggestion
// that just closed. An entry is also evicted once its answer lands 200 (`evictAnswerKey`) — the request is resolved;
// nothing should reuse that key again.
//
// ⚠ Code review round 2 — the cache must follow the PROMPTS, ⛔ only the 200s it happens to see:
//   · `evictAnswerKeysExcept(current)` runs whenever the prompts data changes (`useEvictStaleAnswerKeys`, called by
//     both screens that read the prompts): every entry that is ⛔ the suggestion the prompts show NOW is dropped. Path
//     it closes: a "No" lands but its 200 is LOST (the entry stays `ok: false`), the prompts then show no suggestion,
//     and a re-suggestion of the SAME workplace within 24 h would have replayed the old `{ answer: 'no' }` key — the
//     server answers from its idempotency record and nothing happens. Now the "none" read evicts it, so the
//     re-suggestion mints a FRESH key.
//   · a failure records its state through `updateAnswerKeyStateIfPresent` — ⛔ `setAnswerKeyState` — so a sibling
//     mount's late failure cannot RESURRECT an entry that a 200 (or the eviction above) already removed.
//   · `evictAnswerKey` evicts only the entry for the SAME `(requestId, workplaceId)`: a late 200 for W1 must ⛔ drop a
//     re-suggestion's W2 entry under the same `requestId`.
//   · `clearAnswerKeys()` — sign-out (`lib/session-context.tsx`).

import { freshAnswerKeyState, type AnswerKeyState } from '../../lib/workplace'

interface CachedAnswerKey {
  readonly workplaceId: string
  readonly state: AnswerKeyState
}

const cache = new Map<string, CachedAnswerKey>()

/** The shared state for `(requestId, workplaceId)` — freshly minted (via `mint`) the first time either is seen. */
export function getOrCreateAnswerKeyState(requestId: string, workplaceId: string, mint: () => string): AnswerKeyState {
  const existing = cache.get(requestId)
  if (existing !== undefined && existing.workplaceId === workplaceId) return existing.state
  const fresh = freshAnswerKeyState(mint)
  cache.set(requestId, { workplaceId, state: fresh })
  return fresh
}

/** Record a new state for `(requestId, workplaceId)` — every other mount of the SAME suggestion reads it next. */
export function setAnswerKeyState(requestId: string, workplaceId: string, state: AnswerKeyState): void {
  cache.set(requestId, { workplaceId, state })
}

/**
 * Record `state` ONLY if `(requestId, workplaceId)` still has an entry (code review round 2) — the failure path. ⛔ A
 * resurrection: a sibling mount's 200, or a prompts read that no longer shows this suggestion, may have evicted it
 * while this press was in flight; writing it back would hand a dead key to the next showing.
 */
export function updateAnswerKeyStateIfPresent(requestId: string, workplaceId: string, state: AnswerKeyState): void {
  const existing = cache.get(requestId)
  if (existing === undefined || existing.workplaceId !== workplaceId) return
  cache.set(requestId, { workplaceId, state })
}

/** Forget `(requestId, workplaceId)`'s state — its answer landed 200; nothing should reuse that key again. */
export function evictAnswerKey(requestId: string, workplaceId: string): void {
  // Code review round 2 — ⛔ an entry for a DIFFERENT workplace under the same `requestId` (a re-suggestion).
  if (cache.get(requestId)?.workplaceId === workplaceId) cache.delete(requestId)
}

/**
 * Keep ONLY the entry for the suggestion the prompts show now (`null` — none: drop everything). Called whenever the
 * prompts data changes (code review round 2, header above).
 */
export function evictAnswerKeysExcept(current: { readonly requestId: string; readonly workplaceId: string } | null): void {
  for (const [requestId, entry] of [...cache]) {
    if (current === null || requestId !== current.requestId || entry.workplaceId !== current.workplaceId) cache.delete(requestId)
  }
}

/** Forget every entry — sign-out (code review round 2; `lib/session-context.tsx`). */
export function clearAnswerKeys(): void {
  cache.clear()
}

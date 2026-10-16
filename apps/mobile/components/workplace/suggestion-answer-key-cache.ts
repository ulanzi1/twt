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

/** Forget `requestId`'s state — its answer landed 200; nothing should reuse that key again. */
export function evictAnswerKey(requestId: string): void {
  cache.delete(requestId)
}

// The personal-event ASSERTION mutation — Story 10.26 (Task 5; AC7).
//
// ONE write, and deliberately no read hook: the ratified Niyamavali §3.1 says the assertion "grants
// no restoration relief and carries no consequence of its own", so there is nothing to poll and
// nothing to check back on. A `useMyAssertionsQuery` here would invite the member to look for a
// decision that will never come (AC1).
//
// The `Idempotency-Key` is minted ONCE PER HOOK INSTANCE — cached in a ref on first use, not
// regenerated per call — and rides a HEADER, so a genuine retry (React Query's own, or the member
// pressing Submit again after `mutation.isError`) replays the SAME key and the server's idempotency
// store returns the ORIGINAL record instead of writing a second assertion. ⚠ [Review 2026-08-06] An
// earlier revision called `newIdempotencyKey()` inline inside `mutationFn`, so every attempt — including
// a user-initiated resubmit after a lost response — minted a fresh key and silently defeated the
// dedup this comment already claimed. Fixed by hoisting the key into a `useRef`.
//
// On success the member's validity query is invalidated: R7(G) now applies, so their own record gains
// the `memberStatus.rule.rule.no_exemption` explanation the story exists to produce. The cache row
// server-side is already gone by then — migration `0036`'s `member.%` trigger evicted it on append —
// so the refetch recomputes rather than serving a payload missing the seventh fact.

import type { PersonalEventKind } from '@twt/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { personalEventApi } from '../../lib/personal-event-api'

/** A UUID for the idempotency key. `crypto.randomUUID` is available in Hermes via expo-crypto's polyfill. */
function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function usePersonalEventAssertion(pariwarId: string | undefined) {
  const qc = useQueryClient()
  // Cached for the lifetime of this hook instance (the open form) — every attempt, including a
  // user-initiated resubmit after a failure, reuses the SAME key so the server dedupes it.
  const idempotencyKeyRef = useRef<string | null>(null)
  return useMutation({
    mutationFn: (input: { kind: PersonalEventKind }) => {
      idempotencyKeyRef.current ??= newIdempotencyKey()
      return personalEventApi.recordPersonalEvent(
        pariwarId as string,
        { kind: input.kind },
        { idempotencyKey: idempotencyKeyRef.current },
      )
    },
    onSuccess: () => {
      // The member's own record now carries R7(G)'s explanation.
      void qc.invalidateQueries({ queryKey: ['member', 'validity'] })
    },
  })
}

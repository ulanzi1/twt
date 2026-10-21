// The shared bounded-call helper — Story 5.10 (SB10, Decision 2026-10-21-375 decision 10).
//
// Moved from `app/(settings)/notifications.tsx` (Story 5.12 P1) with its body unchanged apart from the export and a
// domain-neutral rejection message; the WhatsApp signup step is its second consumer. Three older local helpers
// (`withAnswerTimeout`, `withReadTimeout`, `boundClaimEntryRead`) are ⛔ migrated here.

/** A call that never settles must not freeze the screen: the api-client transport has no timeout. */
export const CALL_TIMEOUT_MS = 15_000

/** Settles with `promise`, or rejects once `ms` pass; the original rejection passes through and the timer is cleared on settle. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('call timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

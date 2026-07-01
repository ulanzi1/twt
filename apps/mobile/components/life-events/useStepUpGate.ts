// Member step-up gate — mobile driver (Story 3.9, Task 8).
//
// The nominee + medical Life Events UPDATE routes are step-up-gated server-side. On a miss the API
// returns HTTP 403 with `error.code === 'auth.step_up_required'` (serialized by http-errors.ts).
// This hook drives the member through the request → verify → retry loop:
//   1. `guard(fn)` runs the mutation. If it throws the step-up-required error, it requests a step-up
//      OTP (`stepUpRequest(actionContext)`) and flips `needsOtp` on — the screen reveals the OTP input.
//   2. `verifyAndRetry(fn)` verifies the entered OTP (`stepUpVerify`), then re-runs the SAME mutation
//      (now elevated). On success it clears the OTP state.
//
// CRITICAL: key on the error CODE, not the bare 403 (a plain 403 could be a wrong-role / wrong-pariwar
// forbidden — those must NOT route into the step-up flow). Uses DISTINCT action contexts per caller
// ('nominee_change' / 'medical_change') so an elevation for one does not satisfy the other.

import { useState } from 'react'

import { ApiError } from '@twt/api-client'

import { memberAuth } from '../../lib/member-api'

/** Is this the structured step-up-required error (NOT a generic 403)? */
export function isStepUpRequired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code === 'auth.step_up_required'
}

export interface StepUpGate {
  /** True once a step-up OTP has been requested and we're awaiting the member's code. */
  needsOtp: boolean
  otp: string
  setOtp: (v: string) => void
  /**
   * Run a mutation. Returns its result on success. If the server demands step-up, requests an OTP,
   * flips `needsOtp` on, and returns `undefined` (the screen then shows the OTP input). Re-throws any
   * OTHER error (the caller surfaces its dignified message).
   */
  guard: <T>(fn: () => Promise<T>) => Promise<T | undefined>
  /** Verify the entered OTP, then re-run the mutation (now elevated). Clears OTP state on success. */
  verifyAndRetry: <T>(fn: () => Promise<T>) => Promise<T>
  /** Abandon the step-up prompt (member cancels). */
  reset: () => void
}

export function useStepUpGate(actionContext: string): StepUpGate {
  const [needsOtp, setNeedsOtp] = useState(false)
  const [otp, setOtp] = useState('')

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn()
    } catch (err) {
      if (isStepUpRequired(err)) {
        await memberAuth.stepUpRequest(actionContext)
        setNeedsOtp(true)
        return undefined
      }
      throw err
    }
  }

  async function verifyAndRetry<T>(fn: () => Promise<T>): Promise<T> {
    await memberAuth.stepUpVerify(otp.trim())
    try {
      const result = await fn()
      setNeedsOtp(false)
      setOtp('')
      return result
    } catch (err) {
      // The OTP was already consumed; clear the stale code so the member gets a fresh
      // input if they retry. needsOtp stays true — the step-up prompt stays visible.
      setOtp('')
      throw err
    }
  }

  function reset(): void {
    setNeedsOtp(false)
    setOtp('')
  }

  return { needsOtp, otp, setOtp, guard, verifyAndRetry, reset }
}

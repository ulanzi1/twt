// The shared bounded-call helper — Story 5.10 (SB10, `-375` decision 10; AC10). Moved from the WhatsApp notifications screen
// (Story 5.12 P1) with its body unchanged: the api-client transport has no timeout, so a call that never settles must not
// freeze a screen.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

afterEach(() => {
  vi.useRealTimers()
})

describe('withTimeout', () => {
  it('CALL_TIMEOUT_MS is the 15 s the WhatsApp screen has always used', () => {
    expect(CALL_TIMEOUT_MS).toBe(15_000)
  })

  it('resolves with the value of a call that settles in time, and clears its timer', async () => {
    vi.useFakeTimers()
    const result = withTimeout(Promise.resolve('ok'), 1000)
    await expect(result).resolves.toBe('ok')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('passes the original rejection through, and clears its timer', async () => {
    vi.useFakeTimers()
    const original = new Error('refused')
    const result = withTimeout(Promise.reject(original), 1000)
    await expect(result).rejects.toBe(original)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects once the bound passes for a call that never settles — and not before', async () => {
    vi.useFakeTimers()
    let settled: 'pending' | 'rejected' = 'pending'
    const result = withTimeout(new Promise<never>(() => {}), 1000)
    result.catch(() => {
      settled = 'rejected'
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(settled).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe('rejected')
    await expect(result).rejects.toThrow('call timed out')
  })
})

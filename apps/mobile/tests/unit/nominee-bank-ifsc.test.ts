// IFSC regex hand-copy consistency — Story 6.8 review fix (2026-07-11).
//
// The RBI IFSC shape is hand-copied in three places (contracts can't import platform-adapters, and
// mobile can't depend on platform-adapters either — see `lib/nominee-bank-ifsc.ts`). Each copy pins
// its own `.source` to the literal RBI shape string; if any one drifts, its own test breaks. See the
// matching pin in packages/platform-adapters/tests/bank-ifsc-lookup/in-memory.test.ts and
// packages/contracts/tests/claims-nominee-bank.test.ts.

import { describe, expect, it } from 'vitest'

import { IFSC_RE } from '../../lib/nominee-bank-ifsc'

describe('IFSC_RE', () => {
  it('source is pinned to the RBI shape shared with @twt/contracts + @twt/platform-adapters', () => {
    expect(IFSC_RE.source).toBe('^[A-Z]{4}0[A-Z0-9]{6}$')
  })
})

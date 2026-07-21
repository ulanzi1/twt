// VPA regex hand-copy consistency — Story 8.13 review finding.
//
// The NPCI UPI VPA shape is hand-copied in two places (contracts can't import platform-adapters,
// and mobile can't depend on contracts either — see `lib/nominee-bank-vpa.ts`). This pins the
// mobile copy's `.source` to the literal shape string shared with `@twt/contracts`'s
// `NOMINEE_BANK_VPA_REGEX` (`packages/contracts/tests/claims-nominee-bank.test.ts` pins the other
// side); if either one drifts, its own test breaks — the `nominee-bank-ifsc.ts` precedent.

import { describe, expect, it } from 'vitest'

import { VPA_RE } from '../../lib/nominee-bank-vpa'

describe('VPA_RE', () => {
  it('source is pinned to the NPCI UPI VPA shape shared with @twt/contracts', () => {
    expect(VPA_RE.source).toBe('^[A-Za-z0-9.\\-_]{2,256}@[A-Za-z][A-Za-z0-9.\\-_]{1,63}$')
  })
})

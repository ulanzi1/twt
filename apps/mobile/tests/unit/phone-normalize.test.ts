// Story 6.36b (Task 4) — the PHONE half of the phone ↔ server normalisation parity: `normalizeMobileOnPhone` gives exactly
// the `phone` answer of every case in the shared fixture, which equals the `server` answer wherever the server accepts
// (the server half is `packages/domain/tests/encryption/mobile-normalize-parity.test.ts`).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { foldDigits, normalizeMobileOnPhone } from '../../lib/phone-normalize'

const FIXTURE = join(__dirname, '..', '..', '..', '..', 'packages', 'contracts', 'tests', 'fixtures', 'mobile-normalize-cases.json')
const { cases } = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { cases: { input: string; server: string | null; phone: string | null }[] }

describe('normalizeMobileOnPhone — the shared fixture (phone half)', () => {
  it.each(cases.map((c) => [c.input, c.phone] as const))('%j ⇒ %j', (input, phone) => {
    expect(normalizeMobileOnPhone(input)).toBe(phone)
  })

  it('agrees with the server on EVERY case the server accepts', () => {
    const accepted = cases.filter((c) => c.server !== null)
    expect(accepted.length).toBeGreaterThan(5)
    for (const c of accepted) expect(normalizeMobileOnPhone(c.input)).toBe(c.server)
  })

  it('takes the phone-only forms the server refuses: 0091…, +91 (0)…, +910…, Indic and full-width digits', () => {
    const phoneOnly = cases.filter((c) => c.server === null && c.phone !== null).map((c) => c.input)
    expect(phoneOnly).toEqual(expect.arrayContaining(['00919876543210', '+91 (0) 98765 43210', '+910 9876543210', '९८७६५४३२१०']))
  })

  it('foldDigits: Devanagari / Bengali / Gujarati / full-width digits → ASCII; other characters kept', () => {
    expect(foldDigits('+९१ ९८७६५')).toBe('+91 98765')
    expect(foldDigits('০৯৮')).toBe('098')
    expect(foldDigits('૯૮')).toBe('98')
    expect(foldDigits('９８')).toBe('98')
    expect(foldDigits('Ravi (work)')).toBe('Ravi (work)')
  })
})

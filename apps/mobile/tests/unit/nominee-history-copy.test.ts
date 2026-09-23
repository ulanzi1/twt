// Story 6.20 (AC8, AC12) — the member copy resolves through the REAL t(), in BOTH locales, and the
// picker's code list IS the contracts enum.
//
// ⭐ `t()` THROWS on a missing key, so every assertion below is a question put to the resolver, ⛔ not a
// restatement of the answer ([[feedback_stub_must_call_not_transcribe]]). The relationship keys are
// built exactly as `NomineeForm.tsx` builds them — `nominees.relationship_${code}` — so a code that
// would produce an unresolvable key (e.g. `niece/nephew`) fails HERE.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ApiError } from '@twt/api-client'
import { NOMINEE_RELATIONSHIP_CODES } from '@twt/contracts'
import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { correctionErrorKey } from '../../lib/nominee-correction'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')

const LOCALES = ['en', 'hi'] as const

const NEW_KEYS = [
  'nominees.relationship_other_warning',
  'nominees.changes_stop_notice',
  'nominees.locked_title',
  'nominees.locked_body',
  'nominees.locked_correction_cta',
  'nominee_correction.title',
  'nominee_correction.intro',
  'nominee_correction.rank_label',
  'nominee_correction.rank_primary',
  'nominee_correction.rank_secondary',
  'nominee_correction.note_label',
  'nominee_correction.note_help',
  'nominee_correction.note_required',
  'nominee_correction.submit',
  'nominee_correction.submitted_title',
  'nominee_correction.submitted_body',
  'nominee_correction.error_other',
  'nominee_correction.error_not_open',
  'nominee_correction.error_generic',
  'nominee_correction.no_claim',
] as const

describe('Story 6.20 member copy resolves through the REAL t() — both locales', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] all FIFTEEN relationship labels resolve, built the way the picker builds them`, () => {
      expect(NOMINEE_RELATIONSHIP_CODES).toHaveLength(15)
      for (const code of NOMINEE_RELATIONSHIP_CODES) {
        const value = t(`nominees.relationship_${code}`, undefined, { locale })
        expect(value.trim().length, `${locale} :: ${code}`).toBeGreaterThan(0)
      }
    })

    it(`[${locale}] every new 6.20 key resolves — ⛔ no throw, ⛔ no empty string`, () => {
      for (const key of NEW_KEYS) {
        expect(t(key, undefined, { locale }).trim().length, `${locale} :: ${key}`).toBeGreaterThan(0)
      }
    })

    it(`[${locale}] ⛔ the retired five-value codes no longer resolve (child / parent / sibling)`, () => {
      for (const code of ['child', 'parent', 'sibling']) {
        expect(() => t(`nominees.relationship_${code}`, undefined, { locale })).toThrow()
      }
    })
  }

  it('⭐ the Hindi labels are the member\'s words, ⛔ never a transliteration of the snake_case codes', () => {
    for (const code of NOMINEE_RELATIONSHIP_CODES) {
      const hi = t(`nominees.relationship_${code}`, undefined, { locale: 'hi' })
      expect(hi).not.toMatch(/_/)
      expect(hi).not.toBe(code)
    }
  })
})

describe('Story 6.20 — the pickers take their codes from the contracts enum', () => {
  it('⭐ NomineeForm IMPORTS the fifteen codes (⛔ never a re-spelled local list)', () => {
    const src = read('apps/mobile/components/life-events/NomineeForm.tsx')
    expect(src).toContain('NOMINEE_RELATIONSHIP_CODES')
    expect(src).not.toMatch(/\['spouse',\s*'child'/)
  })

  it('⭐ the CORRECTION picker offers only KNOWN relationships (`other` forecloses — `-237` cl.2)', () => {
    const src = read('apps/mobile/app/(life-events)/nominee-correction.tsx')
    expect(src).toContain('KNOWN_RELATIONSHIPS.map')
    expect(src).not.toMatch(/\bRELATIONSHIPS\.map/)
  })
})

describe('correctionErrorKey — the refusal copy', () => {
  it('`other` gets its own message; a 404 is "no claim"; any other 409 is "not open"; anything else generic', () => {
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.relationship_other', 'x'))).toBe('nominee_correction.error_other')
    expect(correctionErrorKey(new ApiError(404, 'nominee_correction.claim_not_found', 'x'))).toBe('nominee_correction.no_claim')
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.outside_state_window', 'x'))).toBe('nominee_correction.error_not_open')
    expect(correctionErrorKey(new Error('boom'))).toBe('nominee_correction.error_generic')
  })
})

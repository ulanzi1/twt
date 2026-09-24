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
  'nominee_correction.error_try_again',
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

  it('⭐ the Hindi uncle / aunt / cousin labels cover what the English ones cover (a narrower label pushes a Hindi member to `other`, which forecloses correction)', () => {
    const uncle = t('nominees.relationship_uncle', undefined, { locale: 'hi' })
    for (const word of ['चाचा', 'ताऊ', 'मामा', 'फूफा', 'मौसा']) expect(uncle).toContain(word)
    const aunt = t('nominees.relationship_aunt', undefined, { locale: 'hi' })
    for (const word of ['चाची', 'ताई', 'मामी', 'बुआ', 'मौसी']) expect(aunt).toContain(word)
    const cousin = t('nominees.relationship_cousin', undefined, { locale: 'hi' })
    for (const word of ['चचेरे', 'ममेरे', 'फुफेरे', 'मौसेरे']) expect(cousin).toContain(word)
  })

  it('⭐ the locked copy does ⛔ not tell a LIVING member the lock is permanent (`-234` X / `-238`)', () => {
    for (const locale of LOCALES) {
      const body = t('nominees.locked_body', undefined, { locale })
      expect(body).not.toMatch(/no longer be changed/i)
    }
    expect(t('nominees.locked_body', undefined, { locale: 'en' })).toMatch(/helpline/i)
  })

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
    // An actual import statement — ⛔ a comment or a string mentioning the name does not satisfy it.
    expect(src).toMatch(/import\s*\{[^}]*\bNOMINEE_RELATIONSHIP_CODES\b[^}]*\}\s*from\s*'@twt\/contracts'/)
    // ⛔ No retired code survives as a quoted literal, in either quote style.
    expect(src).not.toMatch(/['"](child|parent|sibling)['"]/)
  })

  it('⭐ the CORRECTION picker offers only KNOWN relationships (target: `-237` cl.2; proposal: an ENGINEERING READING of it, ⛔ not a ratified rule — BigDev 2026-09-24)', () => {
    const src = read('apps/mobile/app/(life-events)/nominee-correction.tsx')
    expect(src).toContain('KNOWN_RELATIONSHIPS.map')
    expect(src).not.toMatch(/\bRELATIONSHIPS\.map/)
  })
})

describe('Story 6.20 — the claim nominee-review screen labels a DECLARED nominee\'s relationship', () => {
  // Regression (code review 2026-09-24): it resolved `relationship.${code}` in the `claim` namespace, which
  // holds only the FIVE claimant codes — `t()` throws on a missing key, so 13 of 15 values crashed it.
  it('⭐ every nominee code resolves through the key the screen builds, in both locales', () => {
    const src = read('apps/mobile/app/(claim)/nominee-review.tsx')
    expect(src).toContain('tCommon(`nominees.relationship_${n.relationship}`)')
    expect(src).not.toMatch(/\bt\(`relationship\.\$\{n\.relationship\}`\)/)
    for (const locale of LOCALES) {
      for (const code of NOMINEE_RELATIONSHIP_CODES) {
        expect(() => t(`nominees.relationship_${code}`, undefined, { locale })).not.toThrow()
      }
    }
  })

  it('⭐ proof the old key WAS broken: the claim namespace has no key for most nominee codes', () => {
    expect(() => t('relationship.mother', undefined, { locale: 'en', namespace: 'claim' })).toThrow()
  })
})

describe('Story 6.20 — the correction screen finds the claim and guards the step-up', () => {
  it('⭐ falls back to the FILED-claim pointer once the draft is cleared at acknowledgement', () => {
    const src = read('apps/mobile/app/(life-events)/nominee-correction.tsx')
    expect(src).toMatch(/loadClaimDraft\(memberId\)\.claimCaseId \?\? getFiledClaimCaseId\(memberId\)/)
  })

  it('⭐ the submit is disabled while the code prompt is open, and the prompt can be cancelled', () => {
    const src = read('apps/mobile/app/(life-events)/nominee-correction.tsx')
    expect(src).toContain('disabled={busy || stepUp.needsOtp}')
    expect(src).toContain('onPress={stepUp.reset}')
  })

  it('⭐ family 13(a) — neither the done screen nor the locked screen groups its Button away', () => {
    // The container's OWN opening tag — ⛔ never a match spanning into a comment.
    const tagOf = (src: string, testId: string): string => {
      const m = src.match(new RegExp(`<YStack[^>]*testID="${testId}"[^>]*>`))
      expect(m, testId).not.toBeNull()
      return m![0]
    }
    expect(tagOf(read('apps/mobile/app/(life-events)/nominee-correction.tsx'), 'nominee-correction-done')).not.toContain('accessible')
    expect(tagOf(read('apps/mobile/app/(life-events)/nominees.tsx'), 'nominees-locked')).not.toContain('accessible')
  })
})

describe('correctionErrorKey — the refusal copy', () => {
  it('`other` gets its own message; a 404 is "no claim"; any other 409 is "not open"; anything else generic', () => {
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.relationship_other', 'x'))).toBe('nominee_correction.error_other')
    expect(correctionErrorKey(new ApiError(404, 'nominee_correction.claim_not_found', 'x'))).toBe('nominee_correction.no_claim')
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.outside_state_window', 'x'))).toBe('nominee_correction.error_not_open')
    expect(correctionErrorKey(new Error('boom'))).toBe('nominee_correction.error_generic')
  })

  it('⭐ a wrong step-up code says so; a same-moment conflict says "try again" (⛔ not "call the helpline")', () => {
    expect(correctionErrorKey(new ApiError(401, 'auth.step_up_failed', 'x'))).toBe('auth.otp_error_invalid')
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.concurrent', 'x'))).toBe('nominee_correction.error_try_again')
    expect(correctionErrorKey(new ApiError(409, 'nominee_correction.version_conflict', 'x'))).toBe('nominee_correction.error_try_again')
    // Every key it returns resolves.
    for (const locale of LOCALES) expect(() => t('auth.otp_error_invalid', undefined, { locale })).not.toThrow()
  })
})

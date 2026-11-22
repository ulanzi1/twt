// Story 12.5b (Task 8; AC12; `2026-11-22-489` QE14; `-486` R5) — the partner's-own-page notice through the REAL `t()`
// ([[feedback_stub_must_call_not_transcribe]]): the `marketplace` namespace is registered (an unregistered one THROWS at render —
// TR32), both locales interpolate the partner's name in both places, and the English is the Panel's sentence VERBATIM but for it.

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

/** `-486` R5 as relayed, `[partner]` the only variable part. */
const PANEL = (partner: string): string =>
  `You are being directed to ${partner}'s page, where ${partner} may ask for your contact information.`

describe('partnerForm.notice — the real t() (AC12)', () => {
  it('en: the Panel\'s sentence, verbatim, with the partner\'s name in both places', () => {
    expect(t('partnerForm.notice', { partner: 'LIC' }, { namespace: 'marketplace', locale: 'en' })).toBe(PANEL('LIC'))
  })

  it('hi: both places carry the partner\'s Hindi name; ⛔ a stray brace; ⛔ the English', () => {
    const out = t('partnerForm.notice', { partner: 'एलआईसी' }, { namespace: 'marketplace', locale: 'hi' })
    expect(out.split('एलआईसी')).toHaveLength(3)
    expect(out).not.toMatch(/[{}]/)
    expect(out).not.toMatch(/[A-Za-z]/)
    expect(out.endsWith('।')).toBe(true)
  })

  it('a missing partner name is an error, ⛔ a sentence with a hole in it', () => {
    // Review R2P5: it is the MISSING-VARIABLE error (not a wrong namespace or a typo'd key), proved by naming the variable — and the
    // same call with the variable succeeds.
    expect(() => t('partnerForm.notice', {}, { namespace: 'marketplace', locale: 'en' })).toThrow(/missing interpolation param 'partner' for 'en\/marketplace:partnerForm.notice'/)
    expect(() => t('partnerForm.notice', { partner: 'LIC' }, { namespace: 'marketplace', locale: 'en' })).not.toThrow()
  })
})

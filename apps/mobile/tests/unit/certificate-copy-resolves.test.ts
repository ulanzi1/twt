// Story 6.21b (AC3) — the death-certificate notice copy resolves through the REAL `t()`, in BOTH
// locales, driven by the PURE view function (`certificateNoticeCopy`) over every status × every
// reason. ⛔ `t()` throws on a missing key — a question put to the resolver, never a restatement of
// the answer ([[feedback_stub_must_call_not_transcribe]]; the `nominee-name-copy-resolves.test.ts`
// pattern — BW-C1: no render harness exists, so the pure key-selection function stands in for it).

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { certificateNoticeCopy, type CertificateNoticeView } from '../../lib/death-certificate-view'

const LOCALES = ['en', 'hi'] as const

const STATUSES: CertificateNoticeView['status'][] = ['not_needed', 'missing', 'awaiting_review', 'accepted', 'replacement_requested']
const REASONS: CertificateNoticeView['replacementReason'][] = [null, 'unclear_date', 'future_date']
const REASSURANCES: CertificateNoticeView['reassurance'][] = [null, 'not_refused', 'still_open']

function resolveAll(view: CertificateNoticeView, locale: (typeof LOCALES)[number]): void {
  const copy = certificateNoticeCopy(view)
  for (const key of [copy.titleKey, copy.bodyKey, copy.reassuranceKey, copy.uploadLabelKey, copy.helplineLabelKey]) {
    if (key === null) continue
    const value = t(key, undefined, { locale, namespace: 'claim' })
    expect(value.trim().length, `${locale}/claim :: ${key}`).toBeGreaterThan(0)
  }
}

describe('Story 6.21b — every certificate.* key the pure view function can select resolves, both locales', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every status × every reassurance resolves`, () => {
      for (const status of STATUSES) {
        for (const reassurance of REASSURANCES) {
          resolveAll({ status, replacementReason: null, reassurance, uploadAllowed: true }, locale)
          resolveAll({ status, replacementReason: null, reassurance, uploadAllowed: false }, locale)
        }
      }
    })

    it(`[${locale}] replacement_requested × every reason resolves`, () => {
      for (const reason of REASONS) {
        resolveAll({ status: 'replacement_requested', replacementReason: reason, reassurance: 'not_refused', uploadAllowed: true }, locale)
      }
    })

    it(`[${locale}] the certificate.replacement_helpline key resolves (the tappable helpline line)`, () => {
      const value = t('certificate.replacement_helpline', undefined, { locale, namespace: 'claim' })
      expect(value.trim().length).toBeGreaterThan(0)
    })
  }

  it('⭐⭐ the future_date case NEVER shows replacement_body, and the unclear_date case NEVER shows _body_future', () => {
    const future = certificateNoticeCopy({ status: 'replacement_requested', replacementReason: 'future_date', reassurance: null, uploadAllowed: true })
    expect(future.bodyKey).toBe('certificate.replacement_body_future')
    expect(future.bodyKey).not.toBe('certificate.replacement_body')

    const unclear = certificateNoticeCopy({ status: 'replacement_requested', replacementReason: 'unclear_date', reassurance: null, uploadAllowed: true })
    expect(unclear.bodyKey).toBe('certificate.replacement_body')
    expect(unclear.bodyKey).not.toBe('certificate.replacement_body_future')
  })

  it('⭐⭐ a reversed claim NEVER shows certificate.not_refused, and no status but replacement_requested shows either reassurance line', () => {
    const reversed = certificateNoticeCopy({ status: 'replacement_requested', replacementReason: 'unclear_date', reassurance: 'still_open', uploadAllowed: true })
    expect(reversed.reassuranceKey).toBe('certificate.still_open')
    expect(reversed.reassuranceKey).not.toBe('certificate.not_refused')

    for (const status of STATUSES.filter((s) => s !== 'replacement_requested')) {
      const copy = certificateNoticeCopy({ status, replacementReason: null, reassurance: null, uploadAllowed: true })
      expect(copy.reassuranceKey, status).toBeNull()
    }
  })

  it('⭐⭐ BigDev\'s replacement_helpline wording is UNCHANGED, and the two locales genuinely differ', () => {
    const en = t('certificate.replacement_helpline', undefined, { locale: 'en', namespace: 'claim' })
    const hi = t('certificate.replacement_helpline', undefined, { locale: 'hi', namespace: 'claim' })
    expect(en).toBe("If you can't upload it, call the helpline and we will help you.")
    expect(hi).not.toBe(en)
  })

  it('⭐⭐ the mechanism actually WORKS — t() really does throw on a missing key', () => {
    expect(() => t('certificate.__does_not_exist__', undefined, { locale: 'en', namespace: 'claim' })).toThrow(
      "[i18n] missing key 'certificate.__does_not_exist__' in 'en/claim'",
    )
  })
})

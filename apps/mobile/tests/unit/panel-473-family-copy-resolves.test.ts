// Story 6.39 (`2026-11-21-473` Q3 B and Q4 B; built `-474` items 4–5) — the family's two new lines resolve through the
// REAL `t()`, in BOTH locales, WORD FOR WORD as approved ([[feedback_stub_must_call_not_transcribe]] — no render
// harness exists, so the pure view's key stands in for the screen), and each is reached from its view's key.

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { REFUSED_NOT_MEMBER_KEY, deriveAppealView } from '../../lib/appeal-status'
import { IDENTITY_WAIT_KEY, certificateNoticeCopy } from '../../lib/death-certificate-view'

const claimT = (key: string, locale: 'en' | 'hi') => t(key, undefined, { locale, namespace: 'claim' })

// `-474` item 4 / item 5 — the approved words.
const APPROVED = {
  en: {
    refused:
      'This claim was not approved: the person was not a member of the Trust when they died. If you believe that was a mistake, you can ask us to look at it again.',
    identityWait: 'We need to confirm a few details before this claim can go ahead. Our staff will contact you.',
  },
  hi: {
    refused:
      'यह दावा स्वीकृत नहीं हुआ, क्योंकि मृत्यु के समय वे ट्रस्ट के सदस्य नहीं थे। यदि आपको लगता है कि यह भूल थी, तो आप हमसे इसे फिर से देखने के लिए कह सकते हैं।',
    identityWait: 'इस दावे के आगे बढ़ने से पहले हमें कुछ विवरणों की पुष्टि करनी है। हमारे कर्मचारी आपसे संपर्क करेंगे।',
  },
} as const

describe('Story 6.39 — the family is told (`-473` Q3 B, Q4 B)', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] Q3 B — the appeal card's line for a refusal for a fee ⛔ paid before the death is the approved words`, () => {
      const view = deriveAppealView({
        claim_state: 'denied',
        can_initiate: true,
        appeal_status: null,
        current_stage: null,
        appeal_exhausted: false,
        closed_no_response: false,
        refusal_reason: 'not_a_member_when_died',
      })
      expect(view.eligibleKey).toBe(REFUSED_NOT_MEMBER_KEY)
      expect(claimT(view.eligibleKey, locale)).toBe(APPROVED[locale].refused)
    })

    it(`[${locale}] Q4 B — the line beneath "accepted" while the identity waits is the approved words`, () => {
      const copy = certificateNoticeCopy({ status: 'accepted', replacementReason: null, reassurance: null, uploadAllowed: false, identityCheckWaiting: true })
      expect(copy.reassuranceKey).toBe(IDENTITY_WAIT_KEY)
      expect(claimT(copy.reassuranceKey!, locale)).toBe(APPROVED[locale].identityWait)
      // "accepted" itself is unchanged.
      expect(claimT(copy.bodyKey!, locale).trim().length).toBeGreaterThan(0)
    })
  }

  it('⛔ the reason CODE, the word "fee" or a date reaches either line — the door\'s general reason only', () => {
    const all = (['en', 'hi'] as const).flatMap((l) => [claimT(REFUSED_NOT_MEMBER_KEY, l), claimT(IDENTITY_WAIT_KEY, l)]).join(' ')
    expect(all).not.toMatch(/fee_paid_after_death|joining fee|fee|identity_not_confirmed|\d/i)
    expect(all).not.toMatch(/शुल्क/)
  })
})

// Canonical claim-time DPDPA consent copy — Story 6.9 (Task 4; AC2, D2 / the medical precedent).
//
// `checkboxTextShown` is EVIDENCE of what the family agreed to, so it must be the trust's approved,
// canonical copy — NOT whatever a client sends. The client submits only the `locale` + which boxes;
// the server resolves the canonical copy for that locale HERE and writes THAT into
// `consent_payload.checkboxTextShown` (a tampered client therefore cannot persist non-approved text).
// This mirrors `medicalDomain.ackTextForLocale(...)` — the medical.handlers.ts precedent.
//
// ⚠ SINGLE SOURCE per locale (Dev Notes "consent-copy integrity"): the mobile step's displayed
// checkbox copy (packages/i18n/locales/{en,hi}/claim.json `dpdpa.*`) MUST be kept identical to the
// text below — the mobile string is what the family reads, this is the evidence copy persisted. If a
// future need for a formal consent-copy VERSION id on the row emerges, that is a small additive
// follow-up (a versioned artifact), NOT an expansion of this story.

import type { DpdpaConsentLocale, DpdpaConsentType } from '@twt/contracts';

/**
 * The canonical, approved consent copy per (consent type × locale). Grief-register / dignified
 * (UX §7). Kept in lockstep with the mobile `dpdpa.*` i18n keys (en + hi).
 */
const DPDPA_CONSENT_COPY: Record<DpdpaConsentType, Record<DpdpaConsentLocale, string>> = {
  claim_time_dpdpa: {
    en: 'I consent to the Trust processing the deceased member’s, my, and the nominees’ personal information as needed to verify and settle this claim.',
    hi: 'मैं ट्रस्ट को इस दावे की जाँच और निपटान के लिए दिवंगत सदस्य की, मेरी और नामितों की व्यक्तिगत जानकारी संसाधित करने की सहमति देता/देती हूँ।',
  },
  sahyog_vivran_publication: {
    en: 'I consent to publishing the contributor list and verifier names on the deceased member’s Sahyog Vivran (contribution transparency) page. You may decline this without affecting the claim.',
    hi: 'मैं दिवंगत सदस्य के सहयोग विवरण (योगदान पारदर्शिता) पृष्ठ पर योगदानकर्ता सूची और सत्यापनकर्ताओं के नाम प्रकाशित करने की सहमति देता/देती हूँ। आप इसे अस्वीकार कर सकते हैं, इससे दावे पर कोई असर नहीं होगा।',
  },
  in_memoriam_listing: {
    en: 'I consent to the deceased member appearing in the In Memoriam remembrance listing. You may decline this without affecting the claim.',
    hi: 'मैं दिवंगत सदस्य को स्मृति-शेष (In Memoriam) सूची में शामिल करने की सहमति देता/देती हूँ। आप इसे अस्वीकार कर सकते हैं, इससे दावे पर कोई असर नहीं होगा।',
  },
  // Story 11b.1 (D4(b) / D10) — the FOURTH box. It authorises the deceased member's NAME on the
  // PUBLIC Sahyog Drive pool index, and NOTHING else: the drive itself (its code, district, close
  // date and confirmed contribution count) is published regardless, so declining removes a NAME,
  // never a DRIVE from the public record.
  // ⭐ It carries the SAME declinability sentence as its two siblings, in BOTH locales, and that is
  // not stylistic: Niyamavali §4.4 + Part 10 + Trust Deed cl.15(c) forbid default opt-in, so the box
  // is unchecked by default and sits OUTSIDE the `.refine()` that forces claimTimeDpdpa. A consent
  // that cannot be refused is not consent.
  sahyog_drive_publication: {
    en: 'I consent to publishing the deceased member’s name on the public Sahyog Drive record of the drive held in their memory. You may decline this without affecting the claim.',
    hi: 'मैं दिवंगत सदस्य के नाम को उनकी स्मृति में चलाए गए सहयोग अभियान के सार्वजनिक रिकॉर्ड में प्रकाशित करने की सहमति देता/देती हूँ। आप इसे अस्वीकार कर सकते हैं, इससे दावे पर कोई असर नहीं होगा।',
  },
};

/** Resolve the trust's canonical consent copy for a given type + locale (the evidence text). */
export function resolveDpdpaConsentCopy(
  consentType: DpdpaConsentType,
  locale: DpdpaConsentLocale,
): string {
  return DPDPA_CONSENT_COPY[consentType][locale];
}

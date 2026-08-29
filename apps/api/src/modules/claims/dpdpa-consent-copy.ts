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
 * (UX §7).
 *
 * ⛔⛔ THIS IS THE **EVIDENCE** COPY, ⛔ NOT THE UI LABELS — and Story 11b.9 made the distinction
 * load-bearing, so read it before touching either. There are TWO different things called "copy":
 *   · UI LABELS — the checkbox text a family reads, in `packages/i18n/locales/{en,hi}/claim.json`.
 *     ⛔ The three publication ones were REMOVED with their boxes (`2026-08-28-162` cl.2).
 *   · ⭐ THIS MAP — the server-resolved copy recorded AGAINST EACH WRITTEN ROW. It is what makes a
 *     HISTORICAL row explicable ("what exactly did this family agree to?"), and it is read back
 *     TODAY by `dpdpa-consent-helpline.spec.ts`. ⛔ IT STAYS, IN FULL.
 *
 * ⛔⛔ AND IT IS `Record`-TOTAL OVER `DpdpaConsentType`, WHICH IS PRESERVED BY RULING — so deleting
 * the three retired entries is a TYPECHECK FAILURE, and the tempting fix (deleting the enum values
 * to make the Record legal again) is ⛔ EXACTLY the deletion `2026-08-28-160` cl.5 forbids.
 * ⚠ Recognise that failure when you meet it; ⛔ do not "resolve" it downward.
 *
 * ⚠ The two sides were byte-identical by design (Story 6.9 — one source per locale) and
 * `apps/api/tests/unit/dpdpa-consent-copy.test.ts` asserts the type→key mapping. Since 11b.9 only
 * `claim_time_dpdpa` has a live UI label; the other three entries are evidence-only.
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
  // ⛔ RETIRED AS A CAPTURE SURFACE, PRESERVED AS EVIDENCE — Story 11b.9. Its box left the claim
  // screen (`2026-08-28-162` cl.2) and the render gate it fed was DE-AUTHORISED (`-160` cl.3-5):
  // the authority for publishing a deceased member's name is the MEMBER'S OWN accepted versioned
  // T&C. ⇒ ⛔ no new row of this type is ever written; this text explains the ones already there.
  //
  // ⚠⛔ THE CLAIM THAT STOOD HERE IS FALSIFIED, AND IS RECORDED RATHER THAN DELETED. It read that
  // *"Niyamavali §4.4 + Part 10 + Trust Deed cl.15(c) forbid default opt-in"*, which is why the box
  // was declinable. ⛔ (i) That mechanism is SUPERSEDED — `-160` cl.3 rests publication on a
  // CONDITION OF MEMBERSHIP, and cl.6 removed the family's decline path ON PURPOSE; the family gets
  // ⛔ no veto over the member's own name. ⛔ (ii) Neither authority is RATIFIED: the Trust Deed is
  // an unexecuted, agent-drafted draft (`2026-08-28-164` cl.1) and the Niyamavali sits in the SAME
  // corpus and category (`2026-08-28-167`) — DESIGN REFERENCES, ⛔ not binding instruments.
  // ⚠ Citing the Trust's INTENDED model is fine; citing it AS THOUGH IT BINDS is the defect. ⛔ And
  // ⛔ no Niyamavali amendment is owed or routed — there is no ratified instrument to amend.
  //
  // ⚠ Still true, and the reason the text below reads as it does: it authorised the NAME and
  // NOTHING else — the drive's code, district, close date and confirmed count publish regardless.
  // ⭐ The replacement basis keeps that property exactly (11b.9 AC5).
  // ⚠ The declinability sentence is INSIDE this string, which is why it left the UI when the label
  // key was removed. ⛔ It stays HERE: this is what the family actually saw and agreed to.
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

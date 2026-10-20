// The filer's AGREEMENT TO BE CONTACTED — every version of its words, kept (Story 6.19a, D15; Story 6.37d WS2).
//
// A `claim_contact_agreement` row records `consent_payload.copyVersion`; this registry is what that id MEANS — the
// text shown and whether it names WhatsApp. It lives in the DOMAIN so the WhatsApp basis reader (`-357` G3) and
// the jobs can read it; `apps/api/src/modules/claims/claim-contact-copy.ts` re-exports it for the write.
//
// ⛔ Never edit a version in place — a row must always be explicable by the text its version names. A change to
// the words mints a NEW version; a Hindi review that ACCEPTS the words flips that version's `hiReviewed` (in the
// commit that closes roster Row 36 (a)). A review that CHANGES them mints the next version.
//
// ⚠⭐ GO-LIVE GATED — PENDING STORY 0.13 (counsel's M; launch-gate row 18). Every id carries the marker until
// counsel's approved text replaces it.

/** The two languages the agreement is shown in (the domain's own type — `packages/domain` has ⛔ `@twt/contracts`). */
export type ClaimContactAgreementLocale = 'en' | 'hi';

export interface ClaimContactAgreementVersion {
  readonly en: string;
  readonly hi: string;
  /** The words name WhatsApp — `-357`: a claimant gets WhatsApp only on an agreement that names it. */
  readonly namesWhatsapp: boolean;
  /** The Hindi was reviewed by a person (G3: *"English and reviewed Hindi"*). */
  readonly hiReviewed: boolean;
}

export const CLAIM_CONTACT_AGREEMENT_VERSIONS: Readonly<Record<string, ClaimContactAgreementVersion>> = {
  // v1 — Story 6.19a's words, VERBATIM (evidence for every row written under it). Texts and post only, and it
  // names the nominees.
  '2026-09-28.v1-pending-story-0.13': {
    en: 'I agree that the Trust may contact the nominees and the claimant named here, by text message and by post, about this claim.',
    hi: 'मैं सहमति देता/देती हूँ कि ट्रस्ट इस दावे के बारे में यहाँ दिए गए नॉमिनी और दावेदार से टेक्स्ट संदेश और डाक द्वारा संपर्क कर सकता है।',
    namesWhatsapp: false,
    hiReviewed: false,
  },
  // v2 — `2026-10-20-367` decision 2 (first person; the claimant is whoever files — decision 17), without
  // "or any other means of communication that may appear in future" (removed by `2026-10-20-368` Q2 A). The
  // Hindi is agent-drafted and ⛔ yet human-reviewed (roster Row 36 (a)).
  '2026-10-20.v2-pending-story-0.13': {
    en: 'I agree that the Trust may contact me by text message, WhatsApp, phone call or post, about this claim.',
    hi: 'मैं सहमति देता/देती हूँ कि ट्रस्ट इस दावे के बारे में मुझसे टेक्स्ट संदेश, व्हाट्सएप, फ़ोन कॉल या डाक द्वारा संपर्क कर सकता है।',
    namesWhatsapp: true,
    hiReviewed: false,
  },
};

/** The version recorded on every NEW `claim_contact_agreement` row. */
export const CLAIM_CONTACT_AGREEMENT_COPY_VERSION = '2026-10-20.v2-pending-story-0.13';

/** The version a recorded id names — `undefined` for an id this registry does not know (read it as ⛔ eligible). */
export function claimContactAgreementVersion(copyVersion: unknown): ClaimContactAgreementVersion | undefined {
  if (typeof copyVersion !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(CLAIM_CONTACT_AGREEMENT_VERSIONS, copyVersion)
    ? CLAIM_CONTACT_AGREEMENT_VERSIONS[copyVersion]
    : undefined;
}

/** The CURRENT agreement copy for a locale (the evidence text a new row records). */
export function resolveClaimContactAgreementCopy(locale: ClaimContactAgreementLocale): string {
  return CLAIM_CONTACT_AGREEMENT_VERSIONS[CLAIM_CONTACT_AGREEMENT_COPY_VERSION]![locale];
}

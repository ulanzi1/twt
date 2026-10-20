// The filer's AGREEMENT TO BE CONTACTED — the canonical, versioned copy (Story 6.19a, D15; `2026-09-27-253` cl.1).
//
// `checkboxTextShown` is EVIDENCE of what the filer agreed to, so it is the Trust's copy resolved HERE — ⛔ never
// whatever a client sends (the `dpdpa-consent-copy.ts` precedent). The client submits `agreed: true` + `locale`;
// the server writes THIS text, and its version, into `consent_payload`.
//
// ⚠ BYTE-IDENTICAL with `packages/i18n/locales/{en,hi}/claim.json` `contact.agreement` — the member app shows
// that key and the helpline card reads it aloud (the SAME copy, AC1). `apps/api/tests/unit/claim-contact-copy.test.ts`
// pins the two equal.
//
// Story 6.37d (WS2 (ii)): the versions now live in the DOMAIN registry
// (`packages/domain/src/claim/claim-contact-agreement-copy.ts`) so the WhatsApp basis reader can read what a
// recorded version names; this module re-exports it, and the api's imports are unchanged.
//
// ⚠⭐ GO-LIVE GATED — PENDING STORY 0.13 (counsel's M: whether the filer may agree for the nominees and the
// claimant, whether the agreement may be a condition of approval, whether it must be withdrawable; launch-gate
// row 18). The version string carries the marker so every row written before counsel's return is identifiable.

import type { ClaimContactLocale } from '@twt/contracts';
import { claim } from '@twt/domain';

/** The version recorded on every `claim_contact_agreement` row. Bump it (⛔ never edit in place) when the copy
 *  changes — a row must always be explicable by the text its version names. */
export const CLAIM_CONTACT_AGREEMENT_COPY_VERSION: string = claim.CLAIM_CONTACT_AGREEMENT_COPY_VERSION;

/** The canonical agreement copy for a locale (the evidence text). */
export function resolveClaimContactAgreementCopy(locale: ClaimContactLocale): string {
  return claim.resolveClaimContactAgreementCopy(locale);
}

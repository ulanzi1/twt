// packages/contracts/src/claims/dpdpa-consent.ts
//
// Claim-time DPDPA consent transport DTOs (Story 6.9 — CONSUMER of the Story 2.7 consent registry).
// The request/response wire shapes for the three granular, independent, explicit-opt-in consents
// captured on BOTH the member-app (Ravi-mode) wizard step and the helpline (operator) read-back:
//   · POST /api/v1/member/claims/:claimCaseId/dpdpa-consent               → record (member-app)
//   · GET  /api/v1/member/claims/:claimCaseId/dpdpa-consent               → presence view (member-app)
//   · POST /api/v1/member/claims/:claimCaseId/dpdpa-consent/revoke        → revoke (member-app)
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent   → record (helpline)
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/dpdpa-consent/revoke → revoke (helpline)
//
// ── Contracts discipline (the nominee-bank.ts precedent) ───────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). The three
// claim-time consent-type literals are RE-DECLARED here as a wire enum, value-aligned with the
// domain `consent_type` pgEnum subset (Story 2.7 + the two Story 6.9 additives). ALL objects `.strict()`.
//
// ── Consent-copy integrity (D2 / the medical precedent) ────────────────────────────────
// The request carries ONLY the box selections + the `locale` (a constrained ['en','hi'] enum — the
// MedicalAckLocale precedent, never an arbitrary string). It does NOT carry `checkboxTextShown`: the
// SERVER resolves the canonical/versioned consent copy for the locale (a tampered client therefore
// cannot persist non-approved evidence copy). Responses are a NON-PII presence view (which types are
// currently granted) — no checkbox text, no subject identity.

import { z } from 'zod';

/**
 * D3a POLICY — the SINGLE source of truth for whether the claim-time trust-processing consent (a)
 * is required to proceed. Currently `true` — the RECOMMENDED default, un-attested-pending a Story
 * 0.13 legal counsel determination (see the story's Dev Notes / Dev Agent Record), NOT a settled
 * rule. Code review gap-closure (2026-07-11): this used to be re-implemented independently at TWO
 * enforcement points — this file's `.refine()` below AND apps/api's
 * `claims.dpdpa-consent.handlers.ts` server-side re-check — which could silently drift if one was
 * updated without the other. BOTH now call THIS function, so a future counsel-driven policy change
 * (e.g. making (a) optional, or splitting it into a separate informed-not-consented notice) is a
 * ONE-LINE edit here that automatically applies everywhere, not a two-site coordination problem.
 */
export function isDpdpaProcessingConsentSatisfied(claimTimeDpdpa: boolean): boolean {
  return claimTimeDpdpa === true;
}

/**
 * The locale the consent UI was rendered in — a constrained enum (the MedicalAckLocale /
 * MemberTermsLocale precedent), NEVER an arbitrary `z.string()`. The server resolves the canonical
 * consent copy for this locale (consent-copy integrity, D2).
 */
export const DpdpaConsentLocale = z.enum(['en', 'hi']);
export type DpdpaConsentLocale = z.output<typeof DpdpaConsentLocale>;

/**
 * The three claim-time DPDPA consent types (the `consent_type` pgEnum subset Story 6.9 captures):
 *   · claim_time_dpdpa           — the trust's processing of deceased + claimant + nominee PII (a);
 *   · sahyog_vivran_publication  — contributor-list + verifier-name publication on Sahyog Vivran (b);
 *   · in_memoriam_listing        — In Memoriam appearance (c).
 * Value-aligned with the domain `consent_type` pgEnum (contracts cannot import domain).
 */
export const DpdpaConsentType = z.enum([
  'claim_time_dpdpa',
  'sahyog_vivran_publication',
  'in_memoriam_listing',
]);
export type DpdpaConsentType = z.output<typeof DpdpaConsentType>;

/**
 * The two PUBLICATION (public-transparency) consents — the only types revocable via 6.9's revoke
 * path (D7): a family later withdraws Sahyog Vivran / In Memoriam publication and Epic 11b takes the
 * page down on the next render check. The trust-processing consent (a) is not a publication opt-in
 * and is not revoked here.
 */
export const DpdpaRevocableConsentType = z.enum(['sahyog_vivran_publication', 'in_memoriam_listing']);
export type DpdpaRevocableConsentType = z.output<typeof DpdpaRevocableConsentType>;

/**
 * `POST …/dpdpa-consent` — the three independent box selections + the locale. Per-type booleans (all
 * UNCHECKED by default in the UI — explicit opt-in, UX-DR2). The `.refine()` enforces the D3a default
 * — (a) `claimTimeDpdpa` must be `true` to advance (you cannot file a claim while forbidding
 * processing of its own PII); this is the un-attested-pending Story 0.13 legal rule, structured as a
 * SINGLE guard so a counsel answer that (a) must also be optional is a one-line flip. The request does
 * NOT carry `checkboxTextShown` (the server resolves the canonical copy — consent-copy integrity).
 */
export const RecordDpdpaConsentRequest = z
  .object({
    claimTimeDpdpa: z.boolean(),
    sahyogVivranPublication: z.boolean(),
    inMemoriamListing: z.boolean(),
    locale: DpdpaConsentLocale,
  })
  .strict()
  .refine((v) => isDpdpaProcessingConsentSatisfied(v.claimTimeDpdpa), {
    // D3a recommended default (un-attested-pending Story 0.13 counsel): processing consent is required
    // to proceed. A clean client-side error; the server re-enforces the SAME `isDpdpaProcessingConsentSatisfied`
    // check as the authoritative guard (see that function's docstring — one shared policy, not two).
    message: 'claim-time DPDPA processing consent is required to proceed',
    path: ['claimTimeDpdpa'],
  });
export type RecordDpdpaConsentRequest = z.output<typeof RecordDpdpaConsentRequest>;

/**
 * The NON-PII presence view returned after recording (and by the GET status) — which of the three
 * consent types are CURRENTLY granted for this claim's deceased member (the 6.8 presence-flag
 * precedent). No checkbox text, no subject id, no timestamps — just the granted subset.
 */
export const DpdpaConsentStatusResponse = z
  .object({
    granted: z.array(DpdpaConsentType),
  })
  .strict();
export type DpdpaConsentStatusResponse = z.output<typeof DpdpaConsentStatusResponse>;

/** Alias for the record response — identical NON-PII presence view (which types are now granted). */
export const RecordDpdpaConsentResponse = DpdpaConsentStatusResponse;
export type RecordDpdpaConsentResponse = z.output<typeof RecordDpdpaConsentResponse>;

/**
 * `POST …/dpdpa-consent/revoke` — withdraw one PUBLICATION consent (D7). The `reason` is REQUIRED
 * (stored on the `consent_records` row via `revokeConsent`; NON-PII operator/member justification).
 * Only the two publication types are revocable here (the trust-processing consent is not a takedown
 * target). The row is never deleted — historical proof preserved (AC3).
 */
export const RevokeDpdpaConsentRequest = z
  .object({
    consentType: DpdpaRevocableConsentType,
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type RevokeDpdpaConsentRequest = z.output<typeof RevokeDpdpaConsentRequest>;

/** The NON-PII response after a revoke — the remaining granted subset (so the UI can re-render). */
export const RevokeDpdpaConsentResponse = DpdpaConsentStatusResponse;
export type RevokeDpdpaConsentResponse = z.output<typeof RevokeDpdpaConsentResponse>;

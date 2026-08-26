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
 * The FOUR claim-time DPDPA consent types (the `consent_type` pgEnum subset Story 6.9 captures):
 *   · claim_time_dpdpa           — the trust's processing of deceased + claimant + nominee PII (a);
 *   · sahyog_vivran_publication  — contributor-list + verifier-name publication on Sahyog Vivran (b);
 *   · in_memoriam_listing        — In Memoriam appearance (c);
 *   · sahyog_drive_publication   — the deceased member's NAME on the public Sahyog Drive pool index
 *     (d) — Story 11b.1 / D4(b) / Decision 2026-08-24-159 cl.6.
 * Value-aligned with the domain `consent_type` pgEnum (contracts cannot import domain).
 *
 * ⭐⛔ WHY (d) IS CAPTURED HERE RATHER THAN AT PUBLICATION TIME — D4(b)'s whole ground, and it is a
 * ONE-WAY DOOR: consent is RECORDABLE only in the five PRE-ADJUDICATION claim states, while pools
 * spawn one per APPROVED claim. ⇒ by the time a pool is listable on Sahyog Drive, the window to ask
 * has ALREADY SHUT. A claim filed before this value existed is PERMANENTLY UNASKABLE and its pool can
 * never carry a name. Minted pre-launch, that cohort is empty by construction.
 * ⚠ (d) gates the NAME, NEVER the ROW: an unconsented pool still renders in full on 11b.1's index.
 */
export const DpdpaConsentType = z.enum([
  'claim_time_dpdpa',
  'sahyog_vivran_publication',
  'in_memoriam_listing',
  'sahyog_drive_publication',
]);
export type DpdpaConsentType = z.output<typeof DpdpaConsentType>;

/**
 * The THREE PUBLICATION (public-transparency) consents — the only types revocable via 6.9's revoke
 * path (D7): a family later withdraws Sahyog Vivran / In Memoriam / Sahyog Drive publication and
 * Epic 11b takes the page down on the next render check. The trust-processing consent (a) is not a
 * publication opt-in and is not revoked here.
 *
 * ⚠ REVOCATION IS OPEN AT ANY CLAIM STATE — including AFTER settlement (6.9 AC3's whole point is a
 * post-settlement takedown). So a family may withdraw the deceased member's name from the public
 * Sahyog Drive at any time, and the next render drops it.
 * ⛔ BUT IT IS NOT IMMEDIATE, and 11b.1 states that on the surface: at `s-maxage=300` a revoked
 * consent keeps being served from every warm PoP, per page number, for up to five minutes. Direct SQL
 * is NOT the operational fallback.
 * ⚠ Note the deliberate ASYMMETRY with GRANTING — recorded observationally at Decision 2026-08-24-159
 * cl.6 and NOT fixed here: granting closes at adjudication, revocation never does.
 */
export const DpdpaRevocableConsentType = z.enum([
  'sahyog_vivran_publication',
  'in_memoriam_listing',
  'sahyog_drive_publication',
]);
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
    // Story 11b.1 (D4(b) / AC12) — the FOURTH box. ⛔ It is deliberately OUTSIDE the `.refine()`
    // below: the refine forces `claimTimeDpdpa` only, and extending it to this box would make the
    // publication consent compulsory, which Niyamavali §4.4, Part 10 and Trust Deed cl.15(c) each
    // forbid. ⚠ REQUIRED-not-optional on the wire on purpose (matching its three siblings): an
    // optional field would let a client that never RENDERED the box submit a body indistinguishable
    // from one where the family saw it and declined.
    sahyogDrivePublication: z.boolean(),
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

// The claimant's WhatsApp BASIS — `-357` G3 at send time (Story 6.37d AC2; WS3).
//
// `-357`: WhatsApp may carry the delivery ladder's reminder to the CLAIMANT only, *"on the claim's filing
// agreement (naming WhatsApp …)"*; G3: *"a claim filed under the old wording keeps SMS, calls and post only"*.
// This reads the claim's CURRENT agreement (`claim_contacts.agreement_consent_id` — WS3: the newest agreement the
// claimant gave) and says whether it is a basis for WhatsApp: ⛔ revoked, a version this registry KNOWS that names
// WhatsApp, and — when the claimant agreed in Hindi — that version's Hindi reviewed by a person. Anything else
// is a reason, and every unknown fails CLOSED (a payload with ⛔ `copyVersion` is the old wording).
//
// ⚠ `readClaimContactAgreementState` (`claim-contact-check.ts`) is UNCHANGED and still decides the nominees'
// texts and letters, the approval gate and the closure letter (`-355` d16 — they read `live` / `revoked` only).
// This module is read by the WhatsApp step and the helpline's earlier-wording line ONLY.
// ⚠ T17: the Hindi check reads the AGREEMENT's locale (the words the claimant saw) — ⛔ the claim's
// `contact_locale` (the language the reminders are written in).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claimContacts } from '../schema/claim_contacts.js';
import { consentRecords } from '../schema/consent_records.js';
import { claimContactAgreementVersion } from './claim-contact-agreement-copy.js';

export type ClaimantWhatsappBasisReason = 'not_live' | 'old_wording' | 'unknown_version' | 'hindi_not_reviewed' | 'claimant_changed';

export type ClaimantWhatsappBasis =
  | { readonly eligible: true; readonly copyVersion: string }
  | { readonly eligible: false; readonly reason: ClaimantWhatsappBasisReason };

/** The agreement row as the reader sees it — `null` when ⛔ row of type `claim_contact_agreement` exists. */
export interface ClaimContactAgreementFact {
  readonly revoked: boolean;
  readonly payload: unknown;
}

/** PURE — the basis verdict for one agreement row. */
export function evaluateClaimantWhatsappBasis(fact: ClaimContactAgreementFact | null): ClaimantWhatsappBasis {
  if (fact === null || fact.revoked) return { eligible: false, reason: 'not_live' };
  const payload = (typeof fact.payload === 'object' && fact.payload !== null ? fact.payload : {}) as Record<string, unknown>;
  const copyVersion = payload['copyVersion'];
  if (copyVersion === undefined || copyVersion === null) return { eligible: false, reason: 'old_wording' };
  const version = claimContactAgreementVersion(copyVersion);
  if (version === undefined) return { eligible: false, reason: 'unknown_version' };
  if (!version.namesWhatsapp) return { eligible: false, reason: 'old_wording' };
  // Any locale but `en` must have a reviewed Hindi — an unrecorded locale fails closed with the Hindi reason.
  if (payload['locale'] !== 'en' && !version.hiReviewed) return { eligible: false, reason: 'hindi_not_reviewed' };
  return { eligible: true, copyVersion: copyVersion as string };
}

/** Read one agreement row by its id (⛔ ever by subject — D15). Tenant-scoped (RLS + the explicit predicate). */
export async function readClaimContactAgreementFact(
  db: Db,
  pariwarId: PariwarId,
  agreementConsentId: string,
): Promise<ClaimContactAgreementFact | null> {
  const [row] = await db
    .select({
      revokedAt: consentRecords.revokedAt,
      consentType: consentRecords.consentType,
      payload: consentRecords.consentPayload,
    })
    .from(consentRecords)
    .where(and(eq(consentRecords.pariwarId, pariwarId), eq(consentRecords.consentId, agreementConsentId as never)))
    .limit(1);
  if (!row || row.consentType !== 'claim_contact_agreement') return null;
  return { revoked: row.revokedAt !== null, payload: row.payload };
}

/** The claim's WhatsApp basis, read through its CURRENT agreement (WS3) at the moment of asking. */
export async function readClaimantWhatsappBasis(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimantWhatsappBasis> {
  const [contact] = await db
    .select({
      agreementConsentId: claimContacts.agreementConsentId,
      claimantGeneration: claimContacts.claimantGeneration,
      agreementClaimantGeneration: claimContacts.agreementClaimantGeneration,
    })
    .from(claimContacts)
    .where(and(eq(claimContacts.pariwarId, pariwarId), eq(claimContacts.claimCaseId, claimCaseId)))
    .limit(1);
  if (!contact) return { eligible: false, reason: 'not_live' };
  // Review R3 (2026-10-20) — the live agreement is PER CLAIM, ⛔ per claimant (W6 can swap the claimant side without a
  // fresh `agreed` tick). `agreementClaimantGeneration` behind the CURRENT `claimantGeneration` means the live agreement
  // was given by a claimant this claim no longer has; fail until a fresh affirmative agreement catches it up.
  if (contact.agreementClaimantGeneration !== contact.claimantGeneration) {
    return { eligible: false, reason: 'claimant_changed' };
  }
  return evaluateClaimantWhatsappBasis(
    await readClaimContactAgreementFact(db, pariwarId, contact.agreementConsentId as string),
  );
}

/** Does the agreement row name WhatsApp (a KNOWN version that names it)? — the helpline's earlier-wording line. */
export async function agreementOnFileNamesWhatsapp(
  db: Db,
  pariwarId: PariwarId,
  agreementConsentId: string,
): Promise<boolean> {
  const fact = await readClaimContactAgreementFact(db, pariwarId, agreementConsentId);
  if (fact === null) return false;
  const payload = (typeof fact.payload === 'object' && fact.payload !== null ? fact.payload : {}) as Record<string, unknown>;
  return claimContactAgreementVersion(payload['copyVersion'])?.namesWhatsapp === true;
}

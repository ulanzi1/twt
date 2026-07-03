// Member RTBF field-level anonymization core — Story 3.12 (Task 1; AC1, AC2, AC4).
//
// The PURE mutation core behind the DPDPA Right-To-Be-Forgotten soft-delete (FR-96). It is the
// INVERSE of `data-export/assemble.ts` (Story 3.11): assemble READS + DECRYPTS every member-PII
// column; this OVERWRITES every one of those same columns with a fixed anonymized sentinel (or NULLs
// the nullable ones). Same table set, same field-class encryption contexts — kept deliberately in the
// SAME shape so no PII surface is missed (assemble is the authoritative checklist).
//
// ── Soft-delete, NOT row-delete (architecture §2.12) ───────────────────────────────────────────────
// The member row is RETAINED (the caller projects `withdrawn → anonymized`); the event stream is
// RETAINED (the caller APPENDS `member.rtbf_anonymized`, never mutates); contribution / payment /
// consent history is RETAINED. Only PII *fields* are overwritten/nulled here. This is what keeps
// Epic 7 pool-engine audit-reproducibility intact through an RTBF.
//
// ── CRITICAL GUARDRAIL — RETAIN `member_identities.mobile_blind_index` (AC4) ────────────────────────
// The 12-month rejoin lock (Story 3.10 AC3) keys on `mobile_blind_index` (a one-way deterministic
// HMAC, NOT a displayable value — `resolveMembersByMobile` WHERE mi.mobile_blind_index = $1). Clearing
// it would silently break the rejoin lock. So we overwrite ONLY the displayable `mobile_ciphertext`
// and LEAVE `mobile_blind_index` (+ the `member_withdrawals` rejoin columns) untouched.
//
// ── Domain-layer crypto (same shape as assemble.ts) ────────────────────────────────────────────────
// Unlike every other domain WRITE accessor (which takes pre-serialized ciphertext strings), this must
// encrypt one sentinel under FIVE distinct field-class contexts across many tables — passing 5+
// pre-encrypted values in would be unwieldy. So it takes `enc: { kms, kekRef }` and encrypts the
// sentinel INTERNALLY, exactly as assemble.ts calls `decryptTier1` internally. The `FIELD_CLASS_*`
// constants + `MEMBER_IDENTITY_NAMESPACE` are declared module-locally (domain cannot import
// apps/api/src/context.ts — the package boundary), duplicated BY VALUE from assemble.ts / context.ts.
//
// Every write runs under the caller's RLS scope-tx (tenant-isolated). Naming: DB snake_case, TS
// camelCase. NO HTTP / audit / event emission here — the route orchestrates (mirrors assemble.ts).

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import { encryptTier1, serializeEnvelope } from '../encryption/envelope.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberAddresses } from '../schema/member_addresses.js';
import { memberIdentities } from '../schema/member_identities.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberMedicalDisclosures } from '../schema/member_medical_disclosures.js';
import { memberNominees } from '../schema/member_nominees.js';
import { memberWithdrawals } from '../schema/member_withdrawals.js';

/** The KMS material the sentinel-encrypt uses. The caller (the RTBF handler) threads its `{ kms, kekRef }`
 *  here — the SAME `ExportEncryption` shape assemble.ts uses for the inverse decrypt. */
export interface AnonymizeEncryption {
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
}

export interface AnonymizeMemberParams {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
}

/**
 * The fixed non-PII marker every NOT-NULL Tier-1 PII column is overwritten with. A stable, bounded
 * sentinel — never member data, so it is safe past the PII-scrape CI gate. Nullable columns are set to
 * NULL instead (there is no round-trip requirement once the member is anonymized).
 */
export const ANONYMIZED_SENTINEL = '[anonymized]';

// Field-class literals — mirror the `piiColumn(1, '<class>')` annotations on the source schemas (same
// package) + the parallel constants in assemble.ts / apps/api context.ts. Kept module-local so this
// module has NO cross-app dependency.
const FIELD_CLASS_KYC = 'member_kyc';
const FIELD_CLASS_NOMINEE = 'member_nominee';
const FIELD_CLASS_MEDICAL = 'member_medical';
const FIELD_CLASS_ADDRESS = 'member_address';
const FIELD_CLASS_MOBILE = 'member_mobile';

// The member mobile Tier-1 envelope keys on this fixed sentinel namespace (login runs pre-scope — see
// apps/api context.ts MEMBER_IDENTITY_NAMESPACE + assemble.ts), NOT the member's real pariwarId.
// Duplicated here by value because domain cannot import apps/api.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

/**
 * Encrypt the anonymized sentinel under one field-class context → a serialized `enc:v1:…` envelope.
 * A FRESH DEK/IV per call (encryptTier1 is non-deterministic), so each sentinel ciphertext differs at
 * rest even for the same plaintext — the exact inverse of assemble.ts's `decryptField`.
 */
async function encSentinel(
  pariwarId: string,
  fieldClass: string,
  enc: AnonymizeEncryption,
): Promise<string> {
  const ct = await encryptTier1(
    Buffer.from(ANONYMIZED_SENTINEL, 'utf-8'),
    { pariwarId, fieldClass },
    enc.kms,
    enc.kekRef,
  );
  return serializeEnvelope(ct);
}

/**
 * Field-level anonymize EVERY member-PII column for a `withdrawn` member (RTBF soft-delete). Overwrites
 * each NOT-NULL Tier-1 ciphertext with the anonymized sentinel and NULLs each nullable PII column,
 * across `member_identities` / `member_kyc_profiles` / `member_addresses` / `member_nominees` /
 * `member_medical_disclosures` / `member_withdrawals`. RETAINS `mobile_blind_index` (AC4 rejoin key),
 * the `member_withdrawals` rejoin columns + `reason_code` (non-PII), and every non-PII / history row
 * (`member_postings.district`, `member_attribution`, payments, consents, events).
 *
 * Runs under the caller's RLS scope-tx (tenant-isolated). Does NOT touch `members.state` or the event
 * stream — the caller projects `member.rtbf_anonymized` (`withdrawn → anonymized`) in the SAME tx.
 */
export async function anonymizeMember(
  client: Db,
  enc: AnonymizeEncryption,
  params: AnonymizeMemberParams,
): Promise<void> {
  const { memberId, pariwarId } = params;

  // ── member_identities ── overwrite the displayable mobile; RETAIN mobile_blind_index (AC4). ────────
  await client
    .update(memberIdentities)
    .set({ mobileCiphertext: await encSentinel(MEMBER_IDENTITY_NAMESPACE, FIELD_CLASS_MOBILE, enc) })
    .where(eq(memberIdentities.memberId, memberId));

  // ── member_kyc_profiles ── name/dob → sentinel (NOT NULL); photo/aadhaar_masked_id → NULL. ─────────
  await client
    .update(memberKycProfiles)
    .set({
      nameCiphertext: await encSentinel(pariwarId, FIELD_CLASS_KYC, enc),
      dobCiphertext: await encSentinel(pariwarId, FIELD_CLASS_KYC, enc),
      photoCiphertext: null,
      aadhaarMaskedId: null,
    })
    .where(eq(memberKycProfiles.memberId, memberId));

  // ── member_addresses ── ALL history rows: address_line → sentinel (NOT NULL). ──────────────────────
  await client
    .update(memberAddresses)
    .set({ addressLineCiphertext: await encSentinel(pariwarId, FIELD_CLASS_ADDRESS, enc) })
    .where(eq(memberAddresses.memberId, memberId));

  // ── member_nominees ── ALL rows: name/mobile → sentinel (NOT NULL); address → NULL. ────────────────
  await client
    .update(memberNominees)
    .set({
      nameCiphertext: await encSentinel(pariwarId, FIELD_CLASS_NOMINEE, enc),
      mobileCiphertext: await encSentinel(pariwarId, FIELD_CLASS_NOMINEE, enc),
      addressCiphertext: null,
    })
    .where(eq(memberNominees.memberId, memberId));

  // ── member_medical_disclosures ── ALL rows: conditions → sentinel (NOT NULL); context → NULL. ──────
  await client
    .update(memberMedicalDisclosures)
    .set({
      disclosedConditionsCiphertext: await encSentinel(pariwarId, FIELD_CLASS_MEDICAL, enc),
      additionalContextCiphertext: null,
    })
    .where(eq(memberMedicalDisclosures.memberId, memberId));

  // ── member_withdrawals ── free-text reason → NULL; reason_code + rejoin columns RETAINED (AC4). ────
  await client
    .update(memberWithdrawals)
    .set({ reasonTextCiphertext: null })
    .where(eq(memberWithdrawals.memberId, memberId));
}

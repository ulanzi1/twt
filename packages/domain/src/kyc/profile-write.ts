// member_kyc_profiles write accessor — Story 3.3b (Task 1).
//
// The confirm/manual write: one profile per member → UPSERT on `member_id`. TENANT-scoped
// (RLS `withCheck` enforces the caller's `app.pariwar_id` matches `pariwarId`); runs its
// statement DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside the
// `SET LOCAL app.pariwar_id` transaction (the kyc_transactions/consent write precedent).
//
// ── Encryption is an APP-LAYER concern (the handler does it) ───────────────────────────
// This accessor takes ALREADY-SERIALIZED Tier-1 envelope ciphertext (`*Ciphertext` fields)
// + the Tier-3 plaintext masked Aadhaar — it NEVER encrypts. The route encrypts under the
// member's real `pariwarId` context and passes ciphertext in (the 3.2 identity-write +
// email-index precedent). NO HTTP, NO audit, NO event emission here — the route orchestrates.

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { KycTransactionId, MemberId, PariwarId } from '../ids/index.js';
import { KYC_STAFF_CHECKABLE_STRENGTHS } from './identity-verified.js';
import {
  type MemberKycProfileRow,
  type MemberKycSource,
  type MemberKycVerificationStrength,
  memberKycProfiles,
} from '../schema/member_kyc_profiles.js';

export interface UpsertMemberKycProfileInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** Tier-1 envelope ciphertext (serialized) of the name. */
  nameCiphertext: string;
  /** Tier-1 envelope ciphertext (serialized) of the date-of-birth. */
  dobCiphertext: string;
  /** Tier-1 envelope ciphertext (serialized) of the photo data-URI; null when absent. */
  photoCiphertext?: string | null;
  /** Tier-3 plaintext masked Aadhaar (last-4); null for the manual path. */
  aadhaarMaskedId?: string | null;
  verificationStrength: MemberKycVerificationStrength;
  source: MemberKycSource;
  /** Manual records await trustee verification (default false). */
  trusteeVerified?: boolean;
  /** The originating DigiLocker transaction; null for manual. */
  kycTransactionId?: KycTransactionId | null;
}

/**
 * Insert-or-update a member's KYC profile (one per member; conflict key = `member_id`).
 * On conflict it overwrites the profile columns and bumps `updated_at` (a re-pull or a
 * manual re-submit replaces the prior record). Returns the upserted row. Tenant-scoped.
 */
export async function upsertMemberKycProfile(
  db: Db,
  input: UpsertMemberKycProfileInput,
): Promise<MemberKycProfileRow> {
  const values = {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    nameCiphertext: input.nameCiphertext,
    dobCiphertext: input.dobCiphertext,
    photoCiphertext: input.photoCiphertext ?? null,
    aadhaarMaskedId: input.aadhaarMaskedId ?? null,
    verificationStrength: input.verificationStrength,
    source: input.source,
    trusteeVerified: input.trusteeVerified ?? false,
    kycTransactionId: input.kycTransactionId ?? null,
  };
  const upserted = await db
    .insert(memberKycProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: memberKycProfiles.memberId,
      set: {
        nameCiphertext: values.nameCiphertext,
        dobCiphertext: values.dobCiphertext,
        photoCiphertext: values.photoCiphertext,
        aadhaarMaskedId: values.aadhaarMaskedId,
        verificationStrength: values.verificationStrength,
        source: values.source,
        trusteeVerified: values.trusteeVerified,
        kycTransactionId: values.kycTransactionId,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  const row = upserted[0];
  if (!row) {
    throw new Error('[upsertMemberKycProfile] upsert returned no row — check session scope');
  }
  return row;
}

/**
 * ⭐ Story 3.13 (DL2, N2) — staff CONFIRMED a typed-in identity: flip `trustee_verified` false → true, and ONLY that
 * (+ `updated_at`). ⛔ Through `upsertMemberKycProfile` — that rewrites the identity ciphertexts (the latest-wins store
 * `-424` Q2 (b)'s addition warns about; Trap 1). Conditional: the row must be in this Pariwar, of a staff-checkable
 * strength (N1a — the DERIVED list is bound, ⛔ a literal) and still unverified. Returns `false` when ⛔ row matched —
 * the caller refuses `identity_validation.not_eligible` and rolls the whole transaction back. Runs on the caller's
 * scoped transaction (⛔ its own).
 */
export async function markKycTrusteeVerified(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId },
): Promise<boolean> {
  const updated = await db
    .update(memberKycProfiles)
    .set({ trusteeVerified: true, updatedAt: sql`now()` })
    .where(
      and(
        eq(memberKycProfiles.pariwarId, input.pariwarId),
        eq(memberKycProfiles.memberId, input.memberId),
        inArray(memberKycProfiles.verificationStrength, [...KYC_STAFF_CHECKABLE_STRENGTHS]),
        eq(memberKycProfiles.trusteeVerified, false),
      ),
    )
    .returning({ memberId: memberKycProfiles.memberId });
  return updated.length === 1;
}

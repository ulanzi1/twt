// `member_kyc_profiles` — the verified/declared member KYC profile (Story 3.3b, Task 1).
//
// The FIRST member-PII table after 3.2's `member_identities`, and the persistence the
// 3.3b KYC SURFACE writes: a DigiLocker pull's `KycProfile` (confirmed) OR a manual-
// fallback self-declaration, one row per member. `members` stays the PII-FREE lifecycle
// anchor (Story 3.1); the KYC profile lands HERE so DigiLocker results persist and manual
// entries are trustee-verifiable later (Epic 4 flips `trustee_verified`).
//
// TENANT-ISOLATED (mirrors `member_identities` / `members`, NOT the global identity-auth
// carve-out). A KYC profile belongs to exactly one member in exactly one Pariwar; the in-
// scope confirm/manual write + the status read run under that Pariwar's `app.pariwar_id`.
// RLS in policies/member-kyc-profiles-rls.ts.
//
// ── PII discipline (Dev Notes §"Member KYC profile — PII discipline") ─────────────────
//   · name / dob / photo  → Tier-1 envelope ciphertext (`piiColumn(1, …)`). The photo is
//     the mapper's `data:image/jpeg;base64,…` string stored AS Tier-1 ciphertext — there
//     is no object/blob store in the stack (out of scope); base64-as-Tier-1-text is the
//     confirmed v1 path. NEVER logged; NEVER echoed back (the summary uses a presence flag).
//   · aadhaar_masked_id   → Tier-3 plaintext (`piiColumn(3, …)`): already masked to last-4
//     at the provider boundary, so it carries no full identifier. NULLABLE — only a
//     DigiLocker pull yields it; the manual path (name/dob/photo only) has none.
// The `piiColumn(tier, fieldClass)` annotations feed the Story 1.16b PII-shielding CI gate.
//
// ── verification_strength / source are pgEnums (value-aligned with contracts) ─────────
// `verification_strength` value-aligns with the contracts `KycVerificationStrength`
// (`aadhaar_kyc` for a DigiLocker pull; `self_declared` for the manual fallback;
// `unverified` is the additive-headroom baseline). `source` records WHICH path wrote the
// row (`digilocker` | `manual`). These are stable, low-churn label sets → pgEnums (unlike
// `kyc_transactions.provider`/`intent`/`status`, which stay `text` for the FR-58C swap seam).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_identities.ts / kyc_transactions.ts.

import { boolean, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { KycTransactionId, MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

/** How strongly identity was verified — value-aligned with contracts `KycVerificationStrength`. */
export const MEMBER_KYC_VERIFICATION_STRENGTHS = [
  'aadhaar_kyc',
  'self_declared',
  'unverified',
] as const;
export const memberKycVerificationStrengthEnum = pgEnum(
  'member_kyc_verification_strength',
  MEMBER_KYC_VERIFICATION_STRENGTHS,
);
export type MemberKycVerificationStrength = (typeof MEMBER_KYC_VERIFICATION_STRENGTHS)[number];

/** Which KYC path wrote the profile. */
export const MEMBER_KYC_SOURCES = ['digilocker', 'manual'] as const;
export const memberKycSourceEnum = pgEnum('member_kyc_source', MEMBER_KYC_SOURCES);
export type MemberKycSource = (typeof MEMBER_KYC_SOURCES)[number];

export const memberKycProfiles = pgTable('member_kyc_profiles', {
  // One profile per member (PK = member_id). FK → members.member_id keeps referential
  // integrity; the in-scope upsert runs under the member's Pariwar so the FK check sees
  // the row (same RLS family). RTBF (Story 3.12) deletes via cascade.
  memberId: uuid('member_id')
    .$type<MemberId>()
    .primaryKey()
    .references(() => members.memberId, { onDelete: 'cascade' }),

  // Multi-tenant scope (RLS predicate column; branded).
  pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

  // Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the verified/declared name.
  nameCiphertext: piiColumn(1, 'member_kyc')('name_ciphertext').notNull(),

  // Tier-1 envelope ciphertext of the date-of-birth (the eAadhaar's string form).
  dobCiphertext: piiColumn(1, 'member_kyc')('dob_ciphertext').notNull(),

  // Tier-1 envelope ciphertext of the photo (the mapper's base64 `data:` URI). NULLABLE —
  // the manual path's photo is optional; a DigiLocker pull always carries one.
  photoCiphertext: piiColumn(1, 'member_kyc')('photo_ciphertext'),

  // Tier-3 plaintext masked Aadhaar (last-4 only, masked at the provider boundary).
  // NULLABLE — only a DigiLocker pull yields it; the manual path has no Aadhaar number.
  aadhaarMaskedId: piiColumn(3, 'member_kyc')('aadhaar_masked_id'),

  // How strongly verified — `aadhaar_kyc` (DigiLocker) | `self_declared` (manual).
  verificationStrength: memberKycVerificationStrengthEnum('verification_strength').notNull(),

  // Which path wrote this row — `digilocker` | `manual`.
  source: memberKycSourceEnum('source').notNull(),

  // Manual records await trustee verification (Epic 4/trustee surface flips this true
  // and emits `member.kyc_completed` from pending-valid → active). DigiLocker rows are
  // already cryptographically verified; they are NOT trustee-gated.
  trusteeVerified: boolean('trustee_verified').notNull().default(false),

  // The DigiLocker `kyc_transactions` row this profile came from; NULL for manual.
  // Plain uuid + `$type` hint (no FK — mirrors kyc_transactions.member_id's posture).
  kycTransactionId: uuid('kyc_transaction_id').$type<KycTransactionId>(),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type MemberKycProfileRow = typeof memberKycProfiles.$inferSelect;
export type MemberKycProfileInsert = typeof memberKycProfiles.$inferInsert;

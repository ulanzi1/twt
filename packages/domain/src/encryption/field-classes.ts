// Member PII field-class + namespace constants — RELOCATED here by Story 8.8 (Task 1).
//
// These constants were declared in `apps/api/src/context.ts` and consumed by the apps/api crypto
// helpers. Story 8.8 (the stack's first live `dispatch()` fan-out) runs those same helpers from
// `apps/jobs`, which CANNOT import `apps/api` — `apps/api` already depends on `@twt/jobs`
// (apps/api/package.json), so the reverse edge is a turbo cycle. The encryption CONTEXT a field is
// written under must be byte-identical to the context it is read under, so a by-value duplicate in
// `apps/jobs` would be a silent-drift hazard on Tier-1 PII (contrast `apps/jobs/src/deps.ts`, where a
// by-value parallel was genuinely forced because KMS *construction* reads process env).
//
// `apps/api/src/context.ts` RE-EXPORTS every constant below, so no apps/api call site changed. This
// module is the single authority; do not re-declare these values anywhere.

/**
 * The fixed namespace the admin-identity blind index + Tier-1 encryption context key on. Admin
 * identity is GLOBAL, not Pariwar-scoped (Reconciliation R2) — login runs before any
 * `app.pariwar_id` is set — but the encryption substrate's `blindIndex`/`EncryptionContext` require a
 * `pariwarId` namespace. The admin family binds to the nil-UUID sentinel so admin blind indexes are
 * stable + never collide with a real tenant's. Recorded in ADR-0009.
 */
export const ADMIN_GLOBAL_NAMESPACE = '00000000-0000-0000-0000-000000000000';

/**
 * The fixed namespace the member mobile-number blind index + Tier-1 encryption context key on (Story
 * 3.2, Task 1 + Reconciliation R2). Member login runs BEFORE `app.pariwar_id` is known — the person
 * types a mobile and we don't yet know which Pariwar(s) they belong to — so (mirroring the
 * admin-email pattern) the mobile blind index is computed under this fixed nil-style sentinel, NOT a
 * real tenant. It MUST be distinct from {@link ADMIN_GLOBAL_NAMESPACE} (…000) so a numeric admin
 * email and a mobile can never collide on the same blind index.
 */
export const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

/** Field-class namespace for the member mobile blind index (HMAC input prefix). */
export const MEMBER_MOBILE_FIELD_CLASS = 'member_mobile';

/**
 * Field-class namespace for the member KYC-profile Tier-1 envelope (Story 3.3b). Unlike the
 * admin-email / member-mobile families (which key on a fixed global sentinel because their lookup runs
 * pre-scope), the KYC profile is a TENANT table — its encryption context keys on the member's REAL
 * `pariwarId`. Matches the `piiColumn(…, 'member_kyc')` field-class annotation on the
 * `member_kyc_profiles` Tier-1 columns.
 */
export const MEMBER_KYC_FIELD_CLASS = 'member_kyc';

/**
 * Field-class namespace for the push DEVICE-TOKEN Tier-1 envelope + blind index (Story 5.2). Device
 * tokens are Tier-1 PII (architecture §3.4 L1937). Unlike the admin-email / member-mobile families
 * (fixed global sentinel because their lookup runs pre-scope), `member_device_tokens` is a TENANT
 * table — its encryption context keys on the owning principal's `pariwar_id` (a member's REAL
 * Pariwar; for an ADMIN principal, the {@link ADMIN_GLOBAL_NAMESPACE} nil-UUID sentinel, matching the
 * admin-identity family). The write (registration route) + the read (delivery resolver) MUST bind the
 * SAME (pariwarId, fieldClass) — a mismatched context throws at decrypt time rather than silently
 * succeeding.
 */
export const MEMBER_DEVICE_TOKEN_FIELD_CLASS = 'member_device_token';

/**
 * Field-class namespace for the member NOMINEE Tier-1 envelope (Story 3.4) — RELOCATED here by Story 6.19b (Task 4).
 * `member_nominees` / `member_nominee_versions` are TENANT tables — the context keys on the member's REAL
 * `pariwarId`. Matches the `piiColumn(1, 'member_nominee')` annotation. ⭐ Relocated because 6.19b's correction
 * reminders decrypt a nominee version's `mobile_ciphertext` in `apps/jobs`, which cannot import `apps/api` (the
 * 8.8 precedent above); `apps/api/src/context.ts` re-exports it, so ⛔ no apps/api call site changed.
 */
export const MEMBER_NOMINEE_FIELD_CLASS = 'member_nominee';

/**
 * The claim CONTACT RECORD Tier-1 field class (Story 6.19a, D5) — RELOCATED here by Story 6.19b (Task 4), for the
 * same reason: the reminder job decrypts the claimant block's mobile. Keys on the claim's REAL `pariwarId`; matches
 * `piiColumn(1, 'claim_contact')`. `apps/api/src/context.ts` re-exports it.
 */
export const CLAIM_CONTACT_FIELD_CLASS = 'claim_contact';

/**
 * ⭐ NEW (Story 6.19b, AC3; `2026-09-29-271` §1) — the keyed-hash class of the E.164 number a correction SMS went to
 * (`claim_correction_reminders.recipient_number_hash`), bound to the claim's REAL `pariwarId`. It lets 6.19c's
 * "reached" (D22) compare an accept against the person's CURRENT number without ever storing a number.
 * ⛔ DELIBERATELY ⛔ NOT `MEMBER_MOBILE_FIELD_CLASS` under `MEMBER_IDENTITY_NAMESPACE`: that hash IS
 * `member_identities.mobile_blind_index`, the login key — using it here would make every reminder row joinable to a
 * member's identity. A distinct class under a real tenant keeps the two hash spaces disjoint.
 */
export const CLAIM_CONTACT_MOBILE_FIELD_CLASS = 'claim_contact_mobile';

/**
 * Envelope-encryption + blind-index key material for the member PII families. Structurally identical
 * to `apps/api`'s `EncryptionDeps` and `apps/jobs`'s `JobsEncryptionDeps` (both are
 * `{ kms, kekRef, hmacKeyRef }` over these same domain types), so BOTH apps pass their own bundle
 * here without an adapter and without a new abstraction.
 */
export interface FieldCryptoDeps {
  readonly kms: import('./kms-provider.js').KmsProvider;
  readonly kekRef: import('./kms-provider.js').KmsKeyRef;
  readonly hmacKeyRef: import('./kms-provider.js').KmsKeyRef;
}

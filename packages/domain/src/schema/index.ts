// Schema barrel — re-exports per-domain Drizzle table definitions.
//
// At Story 1.2 closure this barrel only re-exports the empty _baseline schema.
// Substantive table definitions land downstream:
//   - Story 1.3 packages/events event-log primitive
//   - Story 1.5 envelope encryption column transformers
//   - Story 1.6 RLS pgPolicy + pariwar_id
//   - Story 1.7 Pariwar-Passport
//   - Story 1.10 audit log hot tier
//   - Story 1.12 pg-boss schema isolation
//   - Story 3.1+ members + lifecycle
//   - Story 4.x rules
//   - Story 7.x pools
//   - Story 9.x reconciliation
export * from './_baseline.js';
export * from './events_log.js';
// Story 1.10 — tamper-evident audit log (hash chain + 6h off-site mirror).
export * from './audit_log_entries.js';
// Story 1.11a — audit-log integrity-verification verdict ledger.
export * from './audit_integrity_checks.js';
// Story 1.11b — append-only acknowledgement ledger for failed integrity checks.
export * from './audit_integrity_acknowledgements.js';
// Story 1.12 — idempotency keyed store (mutable GLOBAL table; pg-boss substrate).
export * from './idempotency_keys.js';
export * from './pariwar_passport.js';
export * from './role_grants.js';
// Story 2.3 — Niyamavali rule registry: versioned clause registry + the
// append-only amendment-with-diff ledger (the FR-7 rule-registry shape).
export * from './clause_versions.js';
export * from './niyamavali_amendments.js';
// Story 2.4 — the server-persisted Niyamavali draft store (the central net-new
// design; pre-publish pending content + content-bound tone-review sign-off).
export * from './clause_drafts.js';
// Story 2.6 — the T&C version registry: version-pinned Terms & Conditions +
// the FK-enforced clause-pinning junction table (the AC8 recoverable handle).
export * from './terms_and_conditions_versions.js';
export * from './terms_and_conditions_pinned_clauses.js';
// Story 2.7 — the consent registry: granular, revocable, version-resolvable consent
// records (UX-DR2 primitive; Epic 3/6 record consent by touching only recordConsent).
export * from './consent_records.js';
// Story 3.1 — member lifecycle anchor (members table + member_lifecycle_state
// pgEnum). `members.state` is a replay-derived cache, not the source of truth —
// guarded by the DB trigger (migration) + the member-state-invariant CI gate.
export * from './members.js';
// Story 3.2 — member mobile+OTP auth substrate. `member_identities` is tenant-
// isolated (mobile Tier-1 envelope + blind index; the members table stays PII-free);
// the OTP / refresh-token / trusted-device / step-up-elevation / signup-continuation
// tables are the GLOBAL member-identity/auth carve-out (pre-scope, mobile/bearer-keyed).
export * from './member_identities.js';
export * from './member_auth_otps.js';
export * from './member_refresh_tokens.js';
export * from './member_trusted_devices.js';
export * from './member_step_up_elevations.js';
export * from './member_signup_continuations.js';
// Story 3.2 patch PR-Patch-10 — single-use multi-Pariwar scope-select registry.
export * from './member_pariwar_selects.js';
// Story 3.2 patch P31 — Postgres-backed OTP send rate-bucket table.
export * from './otp_rate_buckets.js';
// Story 3.3a — DigiLocker KYC provider substrate. `digilocker_public_certs` is a GLOBAL
// issuer-cert cache (no tenant dimension; member-auth carve-out posture);
// `kyc_transactions` is tenant-isolated provider OAuth/PKCE state (stores NO eAadhaar PII).
export * from './digilocker_public_certs.js';
export * from './kyc_transactions.js';
// Story 3.3b — member KYC profile persistence (tenant-isolated; name/dob/photo Tier-1
// envelope, masked-Aadhaar Tier-3). The first member-PII table after member_identities.
export * from './member_kyc_profiles.js';
// Story 3.4 — member nominee declaration (tenant-isolated; name/mobile/address Tier-1
// envelope, relationship Tier-3 plaintext). Composite PK (member_id, rank); 1–2 rows per
// member, latest-wins (delete-then-insert); FK cascade for RTBF (Story 3.12).
export * from './member_nominees.js';
// Story 3.5 — member medical disclosure (tenant-isolated; condition codes + free-text Tier-1
// envelope). Per-disclosure PK (disclosure_id) — APPEND-ONLY history (NOT latest-wins; Epic 4
// walks the full history); FK cascade to members for RTBF (Story 3.12) + FK to consent_records.
export * from './member_medical_disclosures.js';
// Story 3.6b — signup ₹110 Vyawastha Shulk receipt (tenant-isolated; append-only, AR-67 indefinite
// retention; `tr` UNIQUE idempotency key) + the Reference Code port-seam capture (tenant-isolated, no
// field-worker FK — D2). FK cascade to members for RTBF (Story 3.12).
export * from './vyawastha_shulk_receipts.js';
export * from './member_attribution.js';
// Story 3.9 — Life Events history tables (tenant-isolated; APPEND-ONLY, "prior value preserved").
// member_addresses: address line Tier-1 envelope; per-row address_id. member_postings: district
// plaintext (non-PII geographic) + is_retirement flag (Epic 4 Story 4.5 retirement anchor);
// per-row posting_id. Both FK cascade to members for RTBF (Story 3.12).
export * from './member_addresses.js';
export * from './member_postings.js';
// Story 3.10 — member_withdrawals (tenant-isolated; SINGLE-ROW-per-member withdrawal record + 12-month
// rejoin lock). reason_text Tier-1 envelope, reason_code + aadhaar_hmac seam non-PII; GRANTs UPDATE
// (NOT append-only) for the aadhaar_hmac backfill + RTBF. FK cascade to members for RTBF (Story 3.12).
export * from './member_withdrawals.js';
// Story 1.9 — global identity + admin-auth tables (carve-out family, R2).
export * from './users.js';
export * from './admin_credentials.js';
export * from './webauthn_credentials.js';
export * from './recovery_codes.js';
export * from './admin_sessions.js';
export * from './step_up_otps.js';

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
// Story 5.6 — Postgres-backed per-MEMBER transactional-SMS send rate-bucket table. Mirrors otp_rate_buckets
// but keyed per member and DELIBERATELY SEPARATE — an alert-SMS flood must never drain the OTP send budget.
export * from './sms_rate_buckets.js';
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
// Story 3.11 — data_exports (tenant-isolated; one row per DPDPA data-portability export request). The
// whole ZIP artifact Tier-1 envelope-encrypted at rest (artifact_ciphertext); status/failed_reason
// non-PII. GRANTs UPDATE (status transitions + artifact write + TTL-vacuum zeroing). FK cascade to
// members for RTBF (Story 3.12).
export * from './data_exports.js';
// Story 4.7 — member_search_projection: the AR-65 admin member-search compound read model (a
// denormalized NON-PII read store: lifecycle state + nominee summary + D2 producer_unavailable
// sentinels). Write-owned EXCLUSIVELY by the member projector (member/project.ts); guarded by a
// write-rejection trigger (migration) + the extended member-state-invariant CI gate. NOT the FR-12A
// validity cache (that is Story 4.8's materialized view).
export * from './member_search_projection.js';
// Story 4.8 — the FR-12A per-cohort validity cache substrate: `member_validity_cache` (the Postgres
// cache-aside store for the full unredacted MemberValidityPayload, keyed by the AC1 composite; TTL +
// per-cohort epoch + per-member trigger make stale validity structurally impossible) +
// `cohort_invalidation_epochs` (the transactional per-cohort invalidation counter, D2-A/D4-A).
export * from './member_validity_cache.js';
export * from './cohort_invalidation_epochs.js';
// Story 5.2 — member_device_tokens: the per-member / per-admin push device-token registration substrate
// (tenant-isolated; token → Tier-1 ciphertext + a blind index for dedup/lookup/audit). Backs the `push`
// channel (FCM/APNs). App-open rebuild marks siblings stale; unrecoverable Firebase token errors mark
// invalid; a Class C cleanup job prunes stale/invalid. member_id FK cascade for RTBF (Story 3.12).
export * from './member_device_tokens.js';
// Story 5.3 — the per-Pariwar WhatsApp Business config substrate: `pariwar_wa_config` (1:1 singleton — the
// FR-72 admin toggle + display number + Meta phone_number_id/waba_id + access-token-secret NAME pointer +
// pinned Graph API version; tenant-isolated RLS) + `pariwar_wa_templates` (per-(pariwar, alert_category)
// UTILITY template name/language/approval_status; a category with no `approved` row is not WA-eligible).
export * from './pariwar_wa_config.js';
export * from './pariwar_wa_templates.js';
// Story 5.3 — the per-send WA delivery-status substrate (keyed by Meta wamid; tenant-isolated). 5.3 ships
// the persistence seam + mapMetaStatus; Story 5.4's webhook receiver consumes them.
export * from './whatsapp_send_status.js';
// Story 5.4 — member WA opt-in state-machine substrate: `member_wa_opt_in` (the five-state operational
// lifecycle PENDING|ACTIVE|REVOKED|BLOCKED_BY_META|EXPIRED_24H_WINDOW + verification_phrase partial-unique
// match token + mobile_blind_index match key + 24h window; tenant-isolated inline RLS) + the §3.11 webhook
// queue `wa_inbound_webhook_events` (raw Meta inbound payloads persisted by the ingress primitive, drained
// by the apps/jobs worker; tenant-isolated inline RLS).
export * from './member_wa_opt_in.js';
export * from './wa_inbound_webhook_events.js';
// Story 5.5 — member Telegram opt-in state-machine substrate: `pariwar_telegram_config` (1:1 singleton —
// the FR-58C v1 `enabled` toggle + bot username + bot-token/webhook-secret-token NAME pointers;
// tenant-isolated RLS) + `member_telegram_opt_in` (the five-state operational lifecycle
// PENDING|ACTIVE|REVOKED|BLOCKED|EXPIRED + verification_code partial-unique match token + captured chat_id;
// NO mobile blind index, NO window; tenant-isolated inline RLS) + the §3.11 webhook queue
// `telegram_inbound_webhook_events` (raw Telegram inbound updates persisted by the ingress primitive, drained
// by the apps/jobs worker; tenant-isolated inline RLS).
export * from './pariwar_telegram_config.js';
export * from './member_telegram_opt_in.js';
export * from './telegram_inbound_webhook_events.js';
// Story 5.8 — the per-Pariwar degraded-mode declaration substrate: `pariwar_degraded_mode_declarations`
// (tenant-isolated; a trustee-declared degraded-mode window — mode CHECK IN('cycle_open_sms_bridge'),
// effective_from + nullable expires_at/revoked_at, declared_by/revoked_by actor, reason). "Active" is a
// COMPUTED predicate (revoked_at IS NULL AND effective_from<=at AND (expires_at IS NULL OR expires_at>at)),
// never a stored boolean; single-active-per-Pariwar is enforced by the app transaction (advisory lock +
// auto-revoke-on-declare), NOT a DB constraint. Backs the AR-20 cycle-open SMS bridge.
export * from './pariwar_degraded_mode_declarations.js';
// Story 6.1 — claim case lifecycle anchor (claims table + claim_lifecycle_state +
// claim_intake_channel pgEnums). `claims.current_state` is a replay-derived cache,
// not the source of truth — guarded by the DB trigger (migration) + the
// claim-state-invariant CI gate. Death-support nominee claims ONLY (§1.9/§1.13:
// no payout_destination_id / accident / reserve columns). Twin of Story 3.1.
export * from './claims.js';
// Story 6.4 — ICP substrate: `intake_attempts` (the dedup ledger — one row per intake attempt;
// attempt_status is a PLAIN projected column, NOT an event-sourced cache) + `convergence_overrides`
// (the AC4 append-only "do not converge" ledger). Both tenant-isolated (mirror claims); no state trigger.
export * from './intake_attempts.js';
export * from './convergence_overrides.js';
// Story 6.5 — `claim_documents`: the death-cert OCR + parity metadata table (tenant-isolated;
// the FIRST object-storage consumer — stores the GCS object key + Tier-1 extracted-field
// ciphertext + NON-PII parity outcome/flags, NEVER the document bytes). One row per
// (claim, document_type); the OCR parity job is the sole writer.
export * from './claim_documents.js';
// Story 6.6 — peer-mesh deterministic 5-nearest selection: `claim_peer_mesh_selections`
// (ONE row per claim — the audit-replay source: candidate snapshot + ordered output +
// metric identity; immutable selection, mutable outcome/window) + `claim_peer_mesh_pings`
// (ONE delivery-neutral ping intent per selected member — Decision D1: recorded, not
// dispatched). Both tenant-isolated (mirror claims); no state trigger (outcome is a plain column).
export * from './claim_peer_mesh_selections.js';
export * from './claim_peer_mesh_pings.js';
// Story 6.7 — ground inspection: `claim_ground_inspections` (ONE row per ASSIGNMENT — the
// scheduling + structured findings (non-PII jsonb) + Tier-1 ciphertext for location/family
// contact/notes; separate per-assignment status machine, NO active-uniqueness — D5) + the child
// `claim_ground_inspection_photos` (MANY per assignment — object key + non-PII metadata + encrypted
// caption; Decision D2, NOT a claim_documents row). Both tenant-isolated (mirror claims); no state trigger.
export * from './claim_ground_inspections.js';
export * from './claim_ground_inspection_photos.js';
// Story 1.9 — global identity + admin-auth tables (carve-out family, R2).
export * from './users.js';
export * from './admin_credentials.js';
export * from './webauthn_credentials.js';
export * from './recovery_codes.js';
export * from './admin_sessions.js';
export * from './step_up_otps.js';

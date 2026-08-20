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
export * from './data_export_delivery_grants.js';
export * from './member_data_rights_corrections.js';
// Story 10.7 — report_exports (tenant-isolated; one row per ADMIN/trustee report-export request). The
// serialized CSV/JSON artifact Tier-1 envelope-encrypted at rest (artifact_ciphertext); status/
// failed_reason/params_hash non-PII. GRANTs UPDATE (status transitions + artifact write + TTL-vacuum
// zeroing). ⚠ ACTOR-scoped (requested_by_actor_id) — NO member FK (the admin analog of data_exports).
export * from './report_exports.js';
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
// Story 6.8 — claim-time nominee bank: `claim_nominee_bank_accounts` (ONE row per disbursement
// account, ranked #1/#2 on the composite PK (claim_case_id, account_rank); Tier-1 ciphertext for
// holder name / account number / IFSC; bank_name/branch Tier-3 plaintext). A claim-scoped dual-
// account disbursement channel (D1) — NOT nominee-linked, NOT the 75/25 split. Tenant-isolated
// (mirror claims); annotation-only, no state trigger.
export * from './claim_nominee_bank_accounts.js';
// Story 6.11 — verifier DECISION-METADATA store: `claim_verifier_decisions` (ONE row per adjudication
// decision — outcome/reason_code + Tier-1 rationale ciphertext + actor_display snapshot + supersession
// linkage; partial-unique one-live-per-claim invariant). The DECISION-METADATA authority (AC0) — NOT a
// projection of claim state; state stays on the claim.verifier_* events. Tenant-isolated (mirror claims).
export * from './claim_verifier_decisions.js';
// Story 6.12 — shepherd ASSIGNMENT-METADATA store: `claim_shepherd_assignments` (ONE row per shepherd
// assignment — shepherd_actor_id + display/contact snapshot (R1) + assignment_reason + supersession
// linkage; partial-unique one-live-per-claim invariant). The ASSIGNMENT-METADATA authority (AC0) — NOT a
// projection of claim state; state stays on the claim.shepherd_assigned IDENTITY-annotation event.
// Tenant-isolated (mirror claims). Also lands `users.contact_phone` / `users.contact_whatsapp` (R1).
export * from './claim_shepherd_assignments.js';
// Story 6.13 — State-Trustee cycle-freeze DECISION-METADATA store: `claim_state_trustee_decisions` (ONE
// row per PHASE — frozen_vote | commit | escalation_resolution | routing — outcome/reason_code + Tier-1
// rationale ciphertext + actor_display snapshot; partial-unique one-live-per-(claim,phase) invariant). The
// DECISION-METADATA authority (AC0) — NOT a projection of claim state; state stays on the paired
// claim.state_trustee_* / claim.approved / claim.verifier_* events. Tenant-isolated (mirror claims).
export * from './claim_state_trustee_decisions.js';
// Story 6.13 — the durable cycle-freeze COMMIT record: `cycle_freeze_commits` (client-generated commit_id
// idempotency key + actor_display snapshot + committed claim-id set + trigger_delivered flag). The AC5
// audit/idempotency anchor + the Epic-7 pool-spawn (AC6) handoff payload. Tenant-isolated (mirror claims).
export * from './cycle_freeze_commits.js';
// Story 6.14 — R9 special-case voting: `claim_r9_voting_sessions` (the panel — clause snapshot +
// voting_requirement + IMMUTABLE panel roster + quorum + computed outcome; the finalize anchor) +
// `claim_r9_votes` (per-vote provenance — vote + Tier-1 rationale ciphertext + per-vote clause-version
// snapshot; one live vote per panelist, revisable until finalize). The panel/decision-metadata authority
// (AC0) — NOT a projection of claim state; state stays on the paired claim.r9_outcome event.
export * from './claim_r9_voting_sessions.js';
export * from './claim_r9_votes.js';
// Story 6.15 — verifier concealment-linkage assessment: `claim_concealment_assessments` (the human-supplied
// `claim.concealed_ima_condition_linked` fact — tri-state kind + Tier-1 note + actor snapshot; one live row
// per claim, revisable). The AUTHORITATIVE current/read model the tri-state concealment producer reads;
// NOT a projection of claim state (the paired claim.concealment_assessed event is an identity annotation).
export * from './claim_concealment_assessments.js';
// Story 6.16 — internal 3-stage appeal: `claim_appeals` (the SINGLE appeal-journey anchor per claim, D-F —
// unconditional unique on claim_case_id) + `claim_appeal_decisions` (per-stage decision-metadata; mirrors
// claim_verifier_decisions with `stage` in the uniqueness key) + `claim_appeal_panel_sessions` /
// `claim_appeal_panel_votes` (the Stage-2 State-Trustee panel — the R9 pattern MINUS the clause registry) +
// `pariwar_appeal_config` (the D-G legal-review go-live gate + the D-H per-stage SLA durations). The
// decision/panel/journey authorities — NOT projections of claim state; state stays on the paired
// claim.appeal_* events (+ the new claim.reversed publish hook, D-A).
export * from './claim_appeals.js';
export * from './claim_appeal_decisions.js';
export * from './claim_appeal_panel_sessions.js';
export * from './claim_appeal_panel_votes.js';
export * from './pariwar_appeal_config.js';
// Story 11a.1 (AC5) — `pariwar_public_name_presentation`: the per-Pariwar public-name presentation
// MODE (full_name | shielded_name). One row per Pariwar; an absent row means the RULED default
// (full_name), ⛔ not a fail-closed shield. ⛔ Holds a MODE, never a name.
export * from './pariwar_public_name_presentation.js';
// Story 1.9 — global identity + admin-auth tables (carve-out family, R2).
export * from './users.js';
export * from './admin_credentials.js';
export * from './webauthn_credentials.js';
export * from './recovery_codes.js';
export * from './admin_sessions.js';
export * from './step_up_otps.js';
// Story 7.1 — pool lifecycle anchor (pools table + pool_lifecycle_state +
// pool_support_category pgEnums). `pools.current_state` is a replay-derived cache,
// not the source of truth — guarded by the DB trigger (migration 0071) + the
// pool-state-invariant CI gate. `support_category` v1 = death_support ONLY (AC4;
// _daan reserved for v2). Twin of Story 3.1 members / Story 6.1 claims.
export * from './pools.js';
// Story 8.1 — alert lifecycle anchor (alerts table + alert_lifecycle_state pgEnum).
// `alerts.current_state` is a replay-derived cache, not the source of truth — guarded
// by the DB trigger (migration 0078) + the alert-state-invariant CI gate. One alert per
// contribution cycle (alert_id = deriveAlertId(cycle_id), 1:1 with the cycle; UNIQUE on
// cycle_id). The FOURTH event-derived-state primitive (twin of members/claims/pools).
export * from './alerts.js';
// Story 7.1 (Task 6) — the HOT snapshot tier: `pool_snapshots` (one serialized snapshot
// per row; append-only history for the last 12–18 months, §1.6). A plain append table
// (NOT a state cache — no write-rejection trigger). Tenant-isolated (mirror pools).
export * from './pool_snapshots.js';
// Story 7.2 (Task 3) — the per-(pariwar, YYYY-MM) monotonic counter behind the canonical
// `P-YYYY-MM-###` allocator (the cohort_invalidation_epochs transactional-counter shape).
export * from './pool_canonical_counters.js';
// Story 7.2 (Task 5) — the per-Pariwar curated pool-name registry (the
// pariwar_wa_templates ordered-list precedent). A CAPABILITY: TWT-Bihar seeds ZERO rows
// at launch (the UX amendment vetoed the culture-name overlay), so its pools display
// letter codes; a future tenant may populate it only after the governance review.
export * from './pool_names.js';
// Story 7.5 — the per-Pariwar effective-dated fixed-amount schedule (retires the
// POOL_SPAWN_FIXED_AMOUNT_INR env constant; the terms_and_conditions_versions
// effective-window precedent) + the append-only immutable Emergency Adjustment Record
// (the R9-equivalent-posture trustee attestation, its own never-updated table).
export * from './pool_fixed_amount_schedule.js';
export * from './pool_fixed_amount_emergency_attestations.js';
// Story 8.9 — the per-Pariwar, trustee-curated holiday-window registry (the DATA half of
// UX-DR77). Effective-dated by YEAR (a SET of windows per curation year, unlike the 0075
// instant-window schedule); IST calendar-date bounds, both INCLUSIVE. Read by the pure
// `cycleCalendar` resolver to compute the calendar-aware RECONCILIATION TAIL — it never
// moves FR-22's hard Day-15 contribution close.
export * from './pariwar_holiday_calendar.js';
// Story 9.4 — the persisted normalized bank-statement rows the UTR matcher reads (Decision D4). The
// matcher re-parses the Story 9.3 blob (byte-identical replay) and idempotently upserts entries keyed on
// the deterministic entry_id; pool_id is the denormalized provenance the wrong-pool check reads. Tier-1-
// adjacent (RLS-isolated, never logged); a minimal matcher-read column set (ADR-0034).
export * from './bank_statement_entries.js';
// Story 10.1 — the Helpdesk primitive substrate: `helpdesk_tickets` (the FIFTH event-derived-state
// primitive — projector-only current_state, guarded by the DB trigger (migration 0084) + the
// helpdesk-state-invariant CI gate; helpdesk_category + helpdesk_ticket_state + helpdesk_created_via
// pgEnums) + `helpdesk_routing_policy_versions` (the versioned per-Pariwar routing-policy registry —
// clause_versions immutability posture; per-Pariwar overrides only, the default v1 is code data).
export * from './helpdesk_tickets.js';
export * from './helpdesk_routing_policy_versions.js';
// Story 10.5 — the News/Blog `[SURFACE]` data model: `news_posts`. UNLIKE the event-derived-state
// primitives above, a News/Blog post is MUTABLE content with a PLAIN `status` column (Decision 1) —
// NO projector, NO state-writer trigger, NO CI state-invariant gate, NO events_log stream. Two
// pgEnums (news_audience_scope + news_post_status) + a `channels` text[] on the real delivery set.
export * from './news_posts.js';
// Story 10.9 — the Banner/Popup `[SURFACE]` data model: `banners` (MUTABLE `status` column, the
// direct 10.5 Decision 1 inheritance — NO projector, NO state-writer trigger, NO CI state-invariant
// gate, NO events_log stream; four pgEnums: banner_display_mode / banner_severity / banner_status /
// banner_audience_scope) + `banner_dismissals` (the FIRST durable per-member acknowledgement table).
// ⚠ `valid_from`/`valid_until` are a pure READ-TIME window (Decision 2): nothing flips a status at
// activation or expiry, and `scheduled`/`live`/`expired` are DERIVED, never stored.
export * from './banners.js';
// Story 10.15 — the Survey/Poll `[SURFACE]` data model: `surveys` (MUTABLE `status` column, the same
// 10.5 D1 / 10.9 D1 inheritance — NO projector, NO state-writer trigger, NO CI state-invariant gate,
// NO events_log stream; three pgEnums: survey_status / survey_audience_scope / survey_question_type)
// + `survey_responses` (attributed at rest by PK necessity, identity-stripped at the READ boundary).
// ⚠ `valid_from`/`valid_until` are a pure READ-TIME window: nothing flips a status at open or expiry.
// ⚠ `response_threshold` is FR-58's "quorum threshold" RENAMED and it GATES NOTHING — a survey is
// ADVISORY and has no governance effect (LBD-1); read the schema file header before touching it.
export * from './surveys.js';
// Story 10.8 — the feature-flag `[PRIMITIVE]`: `feature_flag_versions` (immutable, versioned,
// tenant-scoped, audit-anchored rows + the feature_flag_state pgEnum). Like the routing-policy
// registry above and UNLIKE the five event-derived-state primitives, `state` is an AUTHORED column
// on a version row — NO projector, NO state-writer trigger, NO state-invariant gate (Decision 3).
// ⚠ `pariwar_id` is NULLABLE here (NULL = the cross-readable GLOBAL row) — the one deliberate
// deviation from the sibling tenant tables; see the schema header for its three forced carve-outs.
export * from './feature_flag_versions.js';
// Story 10.10 — the member-moderation `[SURFACE]` data model: `member_moderation_actions`, the
// APPEND-ONLY moderation DECISION RECORD (+ the moderation_action / moderation_reason_code pgEnums,
// both generated FROM the domain tuples so DB and TS vocabulary cannot drift).
// ⚠ This is NOT the moderation status. The status is DERIVED by folding the `member.moderation.*`
// events on the member's own stream (Decision 1) — there is deliberately no mutable status column,
// no projector, no state-writer trigger, and `MEMBER_LIFECYCLE_STATES` is UNCHANGED. This table
// carries only what a plaintext-JSONB event payload may not: the Tier-1 rationale ciphertext, the
// actor display snapshot, and the FR-6 rejoin-lock instant.
export * from './member_moderation_actions.js';
// Story 10.20 — `member_moderation_grounds`, the APPEND-ONLY grounds attached to a decision. A later
// finding ATTACHES to the original action; it never rewrites it. Exactly one PRIMARY per action is
// the DB's job (a PARTIAL UNIQUE index) and "at least one" is the writer's — and because the grant
// posture is SELECT/INSERT plus ONE column-level UPDATE for the RTBF note scrub, the primary ground
// is structurally IMMUTABLE: supersede is a SUPPORTING-ground operation, by construction.
// ⚠ `member_id` is denormalized here on purpose (the RTBF scrub queries on that axis, and every
// other scrub in anonymize.ts has the same shape) — see the schema header.
export * from './member_moderation_grounds.js';
// Story 10.22 — `member_moderation_appeals`, the Niyamavali §8.8 appeal RECORD (Decision
// `2026-08-15-121`). ⛔ A RECORD, NOT a second moderation write path: an allowed appeal DIRECTS a
// restore through the existing path, and nothing here moves the moderation overlay. Keyed to the
// moderation ACT, not the member, with a PARTIAL unique index (`WHERE status = 'open'`) because §8.8
// permits re-filing after a determination. ⛔ Not Epic 6's claim appeal — distinct journey, distinct id.
export * from './member_moderation_appeals.js';
// Story 10.23 — the restoration-discipline instrument: `member_restoration_impositions`, the
// APPEND-ONLY record of a §3.1 R7 lock-in. The SECOND governance overlay's table.
// ⚠ NOT the restoration status — that is DERIVED by folding `member.restoration_discipline.*` events
// (AC1), and expiry in particular is derived at read from `expires_at` (AC4), so there is no status
// column a stale row could contradict. It exists because VERSION PINNING IS NOT DERIVABLE (D1): the
// duration in force at imposition must survive a Trustee re-tune, which is FR-8's whole point.
// ⚠ NO PII column, no actor, no Tier-1 byte (D5) — imposition is automatic and the clause id is the
// reason — so append-only holds absolutely, with no RTBF UPDATE carve-out of the 0092 kind.
export * from './member_restoration_impositions.js';
// Story 10.24 — the contribution-fact PROJECTION substrate (D1): `member_contribution_ledger` (one row
// per `contribution.confirmed` event, its reversal folded into a NULLABLE, TIME-BEARING `reversed_at`)
// + `member_pool_assignments` (one row per (member, pool) at freeze). Together they make the five
// `contribution.*` facts answerable AT ANY INSTANT as bounded aggregates, closing the producer gap
// Story 4.2 deferred to "Epic 8/9" ([[project_r7_fact_producer_unbuilt]]).
// ⚠ Both are PLAIN append projections — NOT event-derived state caches. No `current_state`, no
// projector-exclusivity trigger, no state-invariant gate (mirror `pool_snapshots`). They are
// maintained by TWO DIFFERENT mechanisms on purpose (D3 — an events_log trigger for the ledger, an
// explicit writer in `pool/spawn.ts` for the assignments); the mechanism is an implementation detail
// and the two are held OBSERVATIONALLY EQUIVALENT by one shared invariant test.
export * from './member_contribution_ledger.js';
export * from './member_pool_assignments.js';
// Story 10.24 round-2 review (Decision 2) — the COVERAGE WATERMARK for the two projections above.
// One row per Pariwar, written by the backfill; its existence is what makes `producer_unavailable`
// reachable at all. Without it the producer cannot tell "no rows because nothing happened" from "no
// rows because nothing was projected", and an un-run backfill fabricates a clean record for every
// member. ⚖ "Unknown projection state must never fabricate a clean member" (2026-08-05).
export * from './contribution_projection_coverage.js';
// Story 10.12 — the per-Pariwar custom-field `[PRIMITIVE]`: `pariwar_custom_field_definitions`, an
// append-only VERSIONED registry of tenant-authored field shapes, keyed by the
// `(pariwar_id, host_entity, field_key, version)` pin. ⚠ NOT event-derived state and NOT a mutable
// [SURFACE]: it is the `clause_versions` / routing-policy / feature-flag immutability posture — the
// row IS the record, so there is no event, no projector and no `current_state`.
// ⚠ It is also a DECLARED DEVIATION from architecture §1.7, which names a code file
// (`per-pariwar/<id>/schema-v<n>.ts`) as the medium. See the schema header, ADR-0037 and ESCALATION 1.
export * from './pariwar_custom_field_definitions.js';
// Story 1.18 — the versioned per-Pariwar organizational-tree registry behind `scopeContains`'
// geo-tree resolver seam. Same immutability posture as `helpdesk_routing_policy_versions` /
// `clause_versions` (append a version, never mutate a prior row except its forward pointer).
// ⭐ THE ONE DIVERGENCE: there is NO code default. A Pariwar with no row has NO tree, the loader
// returns `null`, no resolver is passed, and `denyDeeperGeoResolver` applies — today's behaviour,
// byte-identical, by construction (ADR-0038 / Decision 2026-08-12-102). ⛔ An authorization INPUT,
// not reference data: tenant RLS + the adversarial cross-Pariwar must-return-0 set.
export * from './geo_tree_versions.js';

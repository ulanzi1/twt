// Branded ID types — Story 1.7 substantive landing (AC-5).
//
// Architecture §Naming patterns line 3700-3708: "branded types for cross-cutting
// domain IDs" so a `MemberId` can never be silently passed where a `ClaimId` is
// expected. "Branding mandatory on first PR for new IDs" (line 3706) is the
// discipline; the *enforcing* ESLint rule (`*Id` string types must be branded)
// is Story 1.16a — it is NOT built here. This file is the discipline's substrate:
// the canonical brand definitions + UUID-validating smart constructors.
//
// The brand is a compile-time-only phantom property (`__brand`). At runtime a
// `PariwarId` IS a plain string — the constructor merely validates UUID shape and
// returns the same value cast to the branded type. There is no runtime wrapper
// object, so branded IDs serialize/compare exactly like strings (safe for JSONB,
// pg uuid columns, Zod transport, and `===`).
//
// UUID validation reuses the single `UUID_REGEX` already defined (and now
// exported) in `../db.js` — the same matcher `setPariwarScope` guards on — so
// there is exactly one UUID-shape authority in @twt/domain (no re-declaration).
// The constructor lowercases before returning so branded IDs are always in the
// same canonical form as Postgres uuid-column output, keeping cache keys and
// invalidation keys consistent regardless of the caller's input casing.

import { UUID_REGEX } from '../db.js';

/**
 * Phantom-branded string. `Brand<'PariwarId'>` and `Brand<'MemberId'>` are
 * mutually non-assignable at the type level despite both being `string` at
 * runtime. The `__brand` property never exists on the value — it is a
 * type-system marker only.
 */
export type Brand<B extends string> = string & { readonly __brand: B };

/** Thrown when a branded-ID smart constructor receives a non-UUID string. */
export class InvalidBrandedIdError extends Error {
  constructor(
    public readonly brand: string,
    public readonly received: string,
  ) {
    super(`[ids] ${brand} must be a UUID; received ${JSON.stringify(received)}`);
    this.name = 'InvalidBrandedIdError';
  }
}

/**
 * Thrown when the `clauseId` smart constructor receives a string that does not
 * match the AC2 `niy.<section>.<clause>[.<subclause>]` slug format. Mirrors
 * `InvalidBrandedIdError` (brand + received for diagnostics) but is a DISTINCT
 * type — a `ClauseId` is the first branded id that is NOT a UUID (Story 2.3), so
 * the "must be a UUID" message would be misleading. The format authority is
 * `CLAUSE_ID_REGEX` below.
 */
export class InvalidClauseIdError extends Error {
  constructor(public readonly received: string) {
    super(
      `[ids] ClauseId must match niy.<section>.<clause>[.<subclause>] ` +
        `(lowercase kebab-with-dots); received ${JSON.stringify(received)}`,
    );
    this.name = 'InvalidClauseIdError';
  }
}

/**
 * Factory that produces a UUID-validating smart constructor for a given brand.
 * The returned function validates with the shared `UUID_REGEX` and throws
 * `InvalidBrandedIdError` on failure — a typed, defense-in-depth guard against an
 * upstream bug handing an attacker-controlled or malformed value into a domain ID
 * (mirrors the `setPariwarScope` posture). The value is NOT mutated (no
 * lowercasing) — Postgres normalises `uuid` columns on store; callers that need a
 * canonical form should normalise explicitly.
 */
function uuidBrand<B extends string>(brand: B): (value: string) => Brand<B> {
  return (value: string): Brand<B> => {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidBrandedIdError(brand, value);
    }
    return value.toLowerCase() as Brand<B>;
  };
}

// ── Cross-cutting domain IDs (architecture §Naming patterns line 3700-3704) ──
// PariwarId is the one Story 1.7 substantively consumes (Passport PK + tenant
// key); the rest are committed now as the established pattern so downstream
// per-Epic Stories (members 3.x, claims 6.x, pools 7.x, alerts 8.x,
// contributions 9.x) import the brand rather than re-declaring it.

export type PariwarId = Brand<'PariwarId'>;
export type MemberId = Brand<'MemberId'>;
export type ClaimId = Brand<'ClaimId'>;
export type PoolId = Brand<'PoolId'>;
export type AlertId = Brand<'AlertId'>;
export type ContributionId = Brand<'ContributionId'>;
/**
 * The global identity id (Story 1.9, §3.13). Keyed to the human, NOT a Pariwar —
 * a person can admin multiple Pariwars (the `role_grants (user_id, pariwar_id,
 * role)` join carries the tenancy). Branding is mandatory on a new ID's first PR
 * (§Naming L3706); this is that PR for `UserId`.
 */
export type UserId = Brand<'UserId'>;

/** Smart constructor: validates UUID shape, returns a branded `PariwarId`. */
export const pariwarId = uuidBrand('PariwarId');
/** Smart constructor: validates UUID shape, returns a branded `MemberId`. */
export const memberId = uuidBrand('MemberId');
/** Smart constructor: validates UUID shape, returns a branded `ClaimId`. */
export const claimId = uuidBrand('ClaimId');
/** Smart constructor: validates UUID shape, returns a branded `PoolId`. */
export const poolId = uuidBrand('PoolId');
/** Smart constructor: validates UUID shape, returns a branded `AlertId`. */
export const alertId = uuidBrand('AlertId');
/** Smart constructor: validates UUID shape, returns a branded `ContributionId`. */
export const contributionId = uuidBrand('ContributionId');
/** Smart constructor: validates UUID shape, returns a branded `UserId`. */
export const userId = uuidBrand('UserId');

// ── Niyamavali rule-registry IDs (Story 2.3, AC1/AC2/AC7) ────────────────────
// Two NEW branded ids land here per the §Naming "branding mandatory on a new
// ID's first PR" discipline (L3700-3708): `ClauseVersionId` (a UUID row address)
// and `ClauseId` (the FIRST non-UUID branded id in the codebase — a stable,
// trustee-allocated, human-readable slug that survives amendment/version history).

/**
 * Per-row address of a clause version (`clause_versions.clause_version_id`). It
 * IS a UUID, so it reuses the shared `uuidBrand` validator — unlike `ClauseId`.
 */
export type ClauseVersionId = Brand<'ClauseVersionId'>;
/** Smart constructor: validates UUID shape, returns a branded `ClauseVersionId`. */
export const clauseVersionId = uuidBrand('ClauseVersionId');

/**
 * The stable, human-readable clause identifier (AC2). NOT a UUID — it is the
 * `niy.<section>.<clause>[.<subclause>]` slug, allocated by the trustee at
 * clause-create time (AC3), immutable across amendment / deprecation / version
 * increment, and never reused. Because it is not a UUID it has a bespoke
 * format-validating constructor (`clauseId` below), not `uuidBrand`.
 */
export type ClauseId = Brand<'ClauseId'>;

/**
 * AC2 format authority for `ClauseId`: `niy.<section-slug>.<clause-slug>` with an
 * OPTIONAL `.<subclause-slug>`. Each slug segment is lowercase kebab —
 * `[a-z0-9]+` groups joined by single hyphens (no leading/trailing/double
 * hyphen, no uppercase). Examples: `niy.contribution-discipline.r7-a`,
 * `niy.ninety-percent-rule.r8`, `niy.special-death.r9-suicide-murder`.
 *
 * Exported so the transport contract (`@twt/contracts` `ClauseIdSchema`) imports
 * the SAME pattern rather than re-declaring it — one regex authority, no drift
 * (contracts → domain is the legal import direction).
 */
export const CLAUSE_ID_REGEX =
  /^niy\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/**
 * Smart constructor: validates the AC2 slug format, returns a branded `ClauseId`.
 * Throws `InvalidClauseIdError` (typed, mirrors `InvalidBrandedIdError`) on a
 * malformed slug. The value is returned UNCHANGED — the regex already constrains
 * it to lowercase, so no normalisation is applied (AC2: the slug is lowercase by
 * construction).
 */
export function clauseId(value: string): ClauseId {
  if (!CLAUSE_ID_REGEX.test(value)) {
    throw new InvalidClauseIdError(value);
  }
  return value as ClauseId;
}

// ── Niyamavali draft-store id (Story 2.4, Task 1) ────────────────────────────
// The server-persisted draft row address (`clause_drafts.draft_id`). A UUID row
// address (unlike `ClauseId`), so it reuses the shared `uuidBrand` validator. The
// draft store is the central net-new design of Story 2.4 (ADR-0021): a clause's
// pending content lives here until publish mints the immutable `clause_versions`
// row — the non-author reviewer loads the draft by this id.

/** Per-row address of a Niyamavali clause draft (`clause_drafts.draft_id`). */
export type ClauseDraftId = Brand<'ClauseDraftId'>;
/** Smart constructor: validates UUID shape, returns a branded `ClauseDraftId`. */
export const clauseDraftId = uuidBrand('ClauseDraftId');

// ── T&C version-registry id (Story 2.6, Task 1) ──────────────────────────────
// Per-row address of a Terms & Conditions version (`terms_and_conditions_versions
// .tc_version_id`). A UUID row address (mirror `ClauseVersionId`), so it reuses the
// shared `uuidBrand` validator. This is the AC8 "stable recoverable handle": it is
// immutable, never reused, and is the reference target Story 2.7's consent registry
// + Epic 3's acceptance flow will store. Branding mandatory on a new id's first PR.

/** Per-row address of a T&C version (`terms_and_conditions_versions.tc_version_id`). */
export type TcVersionId = Brand<'TcVersionId'>;
/** Smart constructor: validates UUID shape, returns a branded `TcVersionId`. */
export const tcVersionId = uuidBrand('TcVersionId');

// ── Consent-registry id (Story 2.7, Task 1) ──────────────────────────────────
// Per-row address of a consent record (`consent_records.consent_id`). A UUID row
// address (mirror `TcVersionId`), so it reuses the shared `uuidBrand` validator.
// Each consent transaction (grant) mints a NEW `ConsentId` — grant→revoke→re-grant
// produces distinct rows over time (no unique constraint on (subject, type)), and
// `consentExists(..., validAt?)` resolves the one valid at the queried instant.
// Branding mandatory on a new id's first PR (§Naming L3700-3708).
//
// NOTE: `subject_id` (the member-or-pre-member-applicant id) is deliberately NOT
// branded — it is POLYMORPHIC (no single owning entity; the `members` table does
// not exist until Epic 3) and has no FK. A brand implies a single owning entity,
// which would mis-describe this column. See schema/consent_records.ts header.

/** Per-row address of a consent record (`consent_records.consent_id`). */
export type ConsentId = Brand<'ConsentId'>;
/** Smart constructor: validates UUID shape, returns a branded `ConsentId`. */
export const consentId = uuidBrand('ConsentId');

// ── KYC provider-abstraction ids (Story 3.3a, Task 3) ────────────────────────
// Two NEW branded ids land here per the §Naming "branding mandatory on a new ID's
// first PR" discipline (L3700-3708): `KycTransactionId` (the per-row address of a
// provider KYC transaction — OAuth `state`/PKCE-verifier holder) and `DigiLockerCertId`
// (the per-row address of a cached issuer public certificate). Both are UUID row
// addresses, so both reuse the shared `uuidBrand` validator.
//
// NOTE: `kyc_transactions.member_id` is deliberately NOT branded to a single owner via
// a FK — like consent's `subject_id` it is written for a member-or-pre-member-applicant
// (signup mints the member id as the event-stream id at Story 3.6); it carries the
// `MemberId` brand as a `$type` hint only (no FK to the RLS-forced `members`).

/** Per-row address of a provider KYC transaction (`kyc_transactions.transaction_id`). */
export type KycTransactionId = Brand<'KycTransactionId'>;
/** Smart constructor: validates UUID shape, returns a branded `KycTransactionId`. */
export const kycTransactionId = uuidBrand('KycTransactionId');

/** Per-row address of a cached DigiLocker issuer cert (`digilocker_public_certs.cert_id`). */
export type DigiLockerCertId = Brand<'DigiLockerCertId'>;
/** Smart constructor: validates UUID shape, returns a branded `DigiLockerCertId`. */
export const digilockerCertId = uuidBrand('DigiLockerCertId');

// ── Medical-disclosure id (Story 3.5, Task 1) ────────────────────────────────
// Per-row address of a member medical disclosure (`member_medical_disclosures
// .disclosure_id`). A UUID row address (mirror `ConsentId`), so it reuses the
// shared `uuidBrand` validator. Unlike `member_nominees`' composite (member_id,
// rank) latest-wins PK, the disclosure table is APPEND-ONLY history: every submit
// mints a NEW `MedicalDisclosureId`, and Epic 4 concealment evaluation walks the
// full per-member history. Branding mandatory on a new id's first PR (§Naming
// L3700-3708).

/** Per-row address of a member medical disclosure (`member_medical_disclosures.disclosure_id`). */
export type MedicalDisclosureId = Brand<'MedicalDisclosureId'>;
/** Smart constructor: validates UUID shape, returns a branded `MedicalDisclosureId`. */
export const medicalDisclosureId = uuidBrand('MedicalDisclosureId');

// ── Signup-fee receipt + attribution ids (Story 3.6b, Task 2) ────────────────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR"
// discipline (L3700-3708): `VyawasthaShulkReceiptId` (the per-row address of an
// indefinitely-retained ₹110 signup-fee receipt, AR-67) and `MemberAttributionId`
// (the per-row address of the Reference Code port-seam capture — D2, no field-worker
// FK). Both are UUID row addresses, so both reuse the shared `uuidBrand` validator.

/** Per-row address of a Vyawastha Shulk receipt (`vyawastha_shulk_receipts.receipt_id`). */
export type VyawasthaShulkReceiptId = Brand<'VyawasthaShulkReceiptId'>;
/** Smart constructor: validates UUID shape, returns a branded `VyawasthaShulkReceiptId`. */
export const vyawasthaShulkReceiptId = uuidBrand('VyawasthaShulkReceiptId');

// ── Data-export id (Story 3.11, Task 1) ──────────────────────────────────────
// NEW branded id per the §Naming "branding mandatory on a new ID's first PR"
// discipline (L3700-3708): `DataExportId` is the per-row address of a member's
// DPDPA data-portability export request (`data_exports.export_id`) — the handle
// the request/status/download API routes key on. A UUID row address, so it reuses
// the shared `uuidBrand` validator.

/** Per-row address of a member data-export request (`data_exports.export_id`). */
export type DataExportId = Brand<'DataExportId'>;
/** Smart constructor: validates UUID shape, returns a branded `DataExportId`. */
export const dataExportId = uuidBrand('DataExportId');

/** Per-row address of a member attribution capture (`member_attribution.attribution_id`). */
export type MemberAttributionId = Brand<'MemberAttributionId'>;
/** Smart constructor: validates UUID shape, returns a branded `MemberAttributionId`. */
export const memberAttributionId = uuidBrand('MemberAttributionId');

// ── Life Events history ids (Story 3.9, Task 2/3) ─────────────────────────────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR"
// discipline (L3700-3708): `AddressId` (per-row address of a member's Tier-1-encrypted
// address history) + `PostingId` (per-row address of a member's posting/transfer history).
// Both tables are APPEND-ONLY (mirror member_medical_disclosures) — every Life Events update
// mints a NEW row so the prior value is preserved (AC1 "prior value preserved"). Both ids are
// UUID row addresses, so both reuse the shared `uuidBrand` validator.

/** Per-row address of a member address-history row (`member_addresses.address_id`). */
export type AddressId = Brand<'AddressId'>;
/** Smart constructor: validates UUID shape, returns a branded `AddressId`. */
export const addressId = uuidBrand('AddressId');

/** Per-row address of a member posting-history row (`member_postings.posting_id`). */
export type PostingId = Brand<'PostingId'>;
/** Smart constructor: validates UUID shape, returns a branded `PostingId`. */
export const postingId = uuidBrand('PostingId');

// ── Device-token id (Story 5.2, Task 3) ───────────────────────────────────────
// NEW branded id per the §Naming "branding mandatory on a new ID's first PR" discipline
// (L3700-3708): `DeviceTokenId` is the per-row address of a member/admin push device-token
// registration (`member_device_tokens.token_id`) — the FCM/APNs token itself is Tier-1 PII
// (encrypted), so the row is keyed by this opaque UUID, never by the token. A UUID row address,
// so it reuses the shared `uuidBrand` validator.

/** Per-row address of a push device-token registration (`member_device_tokens.token_id`). */
export type DeviceTokenId = Brand<'DeviceTokenId'>;
/** Smart constructor: validates UUID shape, returns a branded `DeviceTokenId`. */
export const deviceTokenId = uuidBrand('DeviceTokenId');

// ── WhatsApp per-category template id (Story 5.3, Task 1) ──────────────────────
// NEW branded id per the §Naming "branding mandatory on a new ID's first PR" discipline
// (L3700-3708): `WaTemplateId` is the per-row address of a per-(pariwar, alert_category) WA
// UTILITY template mapping (`pariwar_wa_templates.template_id`). The row's natural key is
// (pariwar_id, alert_category) — enforced by a UNIQUE — but the row is addressed by this opaque
// UUID (mirrors member_device_tokens keying by token_id). A UUID row address → shared validator.

/** Per-row address of a per-category WA template mapping (`pariwar_wa_templates.template_id`). */
export type WaTemplateId = Brand<'WaTemplateId'>;
/** Smart constructor: validates UUID shape, returns a branded `WaTemplateId`. */
export const waTemplateId = uuidBrand('WaTemplateId');

// ── Member WA opt-in + inbound-webhook-event ids (Story 5.4, Task 3/4) ─────────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR" discipline
// (L3700-3708): `MemberWaOptInId` is the per-row address of a member WhatsApp opt-in state-machine row
// (`member_wa_opt_in.opt_in_id`); `WaInboundWebhookEventId` is the per-row address of a persisted Meta
// inbound-webhook event on the §3.11 webhook queue (`wa_inbound_webhook_events.event_id`). Both are UUID
// row addresses, so both reuse the shared `uuidBrand` validator.
//
// NOTE: `member_wa_opt_in.member_id` is deliberately NOT FK-branded to a single owner — like consent's
// `subject_id` it is a polymorphic member reference (the members cross-reference lives in Epic 3); it
// carries the `MemberId` brand as a `$type` hint only (no FK to the RLS-forced `members`).

/** Per-row address of a member WA opt-in state-machine row (`member_wa_opt_in.opt_in_id`). */
export type MemberWaOptInId = Brand<'MemberWaOptInId'>;
/** Smart constructor: validates UUID shape, returns a branded `MemberWaOptInId`. */
export const memberWaOptInId = uuidBrand('MemberWaOptInId');

/** Per-row address of a persisted Meta inbound-webhook event (`wa_inbound_webhook_events.event_id`). */
export type WaInboundWebhookEventId = Brand<'WaInboundWebhookEventId'>;
/** Smart constructor: validates UUID shape, returns a branded `WaInboundWebhookEventId`. */
export const waInboundWebhookEventId = uuidBrand('WaInboundWebhookEventId');

// ── Member Telegram opt-in + inbound-webhook-event ids (Story 5.5, Task 2) ─────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR" discipline
// (L3700-3708), mirroring the WA opt-in ids: `MemberTelegramOptInId` is the per-row address of a member
// Telegram opt-in state-machine row (`member_telegram_opt_in.opt_in_id`); `TelegramInboundWebhookEventId` is
// the per-row address of a persisted Telegram inbound-update event on the §3.11 webhook queue
// (`telegram_inbound_webhook_events.event_id`). Both are UUID row addresses, so both reuse the shared
// `uuidBrand` validator. As with WA, `member_telegram_opt_in.member_id` is NOT FK-branded (polymorphic
// member reference — the MemberId brand is a `$type` hint only, no FK to the RLS-forced `members`).

/** Per-row address of a member Telegram opt-in state-machine row (`member_telegram_opt_in.opt_in_id`). */
export type MemberTelegramOptInId = Brand<'MemberTelegramOptInId'>;
/** Smart constructor: validates UUID shape, returns a branded `MemberTelegramOptInId`. */
export const memberTelegramOptInId = uuidBrand('MemberTelegramOptInId');

/** Per-row address of a persisted Telegram inbound-webhook event (`telegram_inbound_webhook_events.event_id`). */
export type TelegramInboundWebhookEventId = Brand<'TelegramInboundWebhookEventId'>;
/** Smart constructor: validates UUID shape, returns a branded `TelegramInboundWebhookEventId`. */
export const telegramInboundWebhookEventId = uuidBrand('TelegramInboundWebhookEventId');

// ── Intake-attempt id (Story 6.4, Task 2) ─────────────────────────────────────
// NEW branded id per the §Naming "branding mandatory on a new ID's first PR" discipline
// (L3700-3708): `IntakeAttemptId` is the per-row address of an ICP intake attempt
// (`intake_attempts.intake_attempt_id`). This is the TEMPORARY / channel-originating id
// that AC7 forbids downstream flows from ever using as a lookup key — the canonical
// `ClaimId` is the ONLY id that persists past convergence. A UUID row address, so it
// reuses the shared `uuidBrand` validator. The `superseded_by_claim_case_id` column on
// the same table is `$type<ClaimId>()` (reuse the existing ClaimId brand — same canonical id).

/** Per-row address of an ICP intake attempt (`intake_attempts.intake_attempt_id`). */
export type IntakeAttemptId = Brand<'IntakeAttemptId'>;
/** Smart constructor: validates UUID shape, returns a branded `IntakeAttemptId`. */
export const intakeAttemptId = uuidBrand('IntakeAttemptId');

// ── Claim-document id (Story 6.5, Task 2) ─────────────────────────────────────
// NEW branded id per the §Naming "branding mandatory on a new ID's first PR" discipline.
// `ClaimDocumentId` is the per-row address of an uploaded claim document
// (`claim_documents.claim_document_id`) AND the caller-facing upload handle (the GCS object
// key is never exposed to the client — the id is). A UUID row address; reuses `uuidBrand`.

/** Per-row address of a claim document (`claim_documents.claim_document_id`). */
export type ClaimDocumentId = Brand<'ClaimDocumentId'>;
/** Smart constructor: validates UUID shape, returns a branded `ClaimDocumentId`. */
export const claimDocumentId = uuidBrand('ClaimDocumentId');

// ── Peer-mesh selection + ping-intent ids (Story 6.6, Task 1/3) ───────────────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR"
// discipline (L3700-3708). `PeerMeshSelectionId` is the per-row address of a
// deterministic peer-mesh selection (`claim_peer_mesh_selections.selection_id`) — the
// audit-replay anchor that the ping intents + the window-expiry fallback key off.
// `PeerMeshPingId` is the per-row address of a delivery-neutral ping intent
// (`claim_peer_mesh_pings.ping_id`), ONE per selected member (Decision D1 — recorded,
// not dispatched). Both are UUID row addresses, so both reuse the shared `uuidBrand`
// validator. `claim_case_id` / `member_id` columns on those tables reuse the existing
// `ClaimId` / `MemberId` brands (same canonical ids — never re-declared).

/** Per-row address of a peer-mesh selection (`claim_peer_mesh_selections.selection_id`). */
export type PeerMeshSelectionId = Brand<'PeerMeshSelectionId'>;
/** Smart constructor: validates UUID shape, returns a branded `PeerMeshSelectionId`. */
export const peerMeshSelectionId = uuidBrand('PeerMeshSelectionId');

/** Per-row address of a peer-mesh ping intent (`claim_peer_mesh_pings.ping_id`). */
export type PeerMeshPingId = Brand<'PeerMeshPingId'>;
/** Smart constructor: validates UUID shape, returns a branded `PeerMeshPingId`. */
export const peerMeshPingId = uuidBrand('PeerMeshPingId');

// ── Ground-inspection assignment + photo ids (Story 6.7, Task 3) ──────────────
// Two NEW branded ids per the §Naming "branding mandatory on a new ID's first PR"
// discipline (L3700-3708). `GroundInspectionId` is the per-row address of a ground-inspection
// ASSIGNMENT (`claim_ground_inspections.ground_inspection_id`) — the addressable unit (a claim
// may hold MANY, D5); every mutating verb (reschedule/findings/complete/refusal/photo) addresses
// it by this id under a row lock, never a read-side "latest row". `GroundInspectionPhotoId` is the
// per-row address of one uploaded inspection photo (`claim_ground_inspection_photos.photo_id`),
// MANY per assignment. Both are UUID row addresses, so both reuse the shared `uuidBrand` validator.
// `claim_case_id` / `pariwar_id` on those tables reuse the existing `ClaimId` / `PariwarId` brands.

/** Per-row address of a ground-inspection assignment (`claim_ground_inspections.ground_inspection_id`). */
export type GroundInspectionId = Brand<'GroundInspectionId'>;
/** Smart constructor: validates UUID shape, returns a branded `GroundInspectionId`. */
export const groundInspectionId = uuidBrand('GroundInspectionId');

/** Per-row address of a ground-inspection photo (`claim_ground_inspection_photos.photo_id`). */
export type GroundInspectionPhotoId = Brand<'GroundInspectionPhotoId'>;
/** Smart constructor: validates UUID shape, returns a branded `GroundInspectionPhotoId`. */
export const groundInspectionPhotoId = uuidBrand('GroundInspectionPhotoId');

// ── Verifier-decision id (Story 6.11, Task 1) ─────────────────────────────────
// The per-row address of one verifier adjudication decision
// (`claim_verifier_decisions.decision_id`) — the DECISION-METADATA authority row (AC0). A claim
// may hold MANY decision rows over its life (revisions supersede prior rows, D-E); each row is
// addressed by this id (a revision names its predecessor via `supersedes_decision_id`). A UUID row
// address, so it reuses the shared `uuidBrand` validator; `claim_case_id` / `pariwar_id` reuse the
// existing `ClaimId` / `PariwarId` brands.

/** Per-row address of a verifier decision (`claim_verifier_decisions.decision_id`). */
export type VerifierDecisionId = Brand<'VerifierDecisionId'>;
/** Smart constructor: validates UUID shape, returns a branded `VerifierDecisionId`. */
export const verifierDecisionId = uuidBrand('VerifierDecisionId');

// ── Shepherd-assignment id (Story 6.12, Task 1) ───────────────────────────────
// The per-row address of one shepherd assignment (`claim_shepherd_assignments.assignment_id`) — the
// ASSIGNMENT-METADATA authority row (AC0). A claim may hold MANY assignment rows over its life
// (reassignments supersede prior rows, D-E); each row is addressed by this id (a reassignment names its
// predecessor via `supersedes_assignment_id`, the AC5 back-reference that also rides the event timeline).
// A UUID row address, so it reuses the shared `uuidBrand` validator; `claim_case_id` / `pariwar_id` reuse
// the existing `ClaimId` / `PariwarId` brands.

/** Per-row address of a shepherd assignment (`claim_shepherd_assignments.assignment_id`). */
export type ShepherdAssignmentId = Brand<'ShepherdAssignmentId'>;
/** Smart constructor: validates UUID shape, returns a branded `ShepherdAssignmentId`. */
export const shepherdAssignmentId = uuidBrand('ShepherdAssignmentId');

// ── State-Trustee decision id + cycle-freeze commit id (Story 6.13, Task 2) ────
// `TrusteeDecisionId` is the per-row address of one State-Trustee cycle-freeze decision
// (`claim_state_trustee_decisions.decision_id`) — the DECISION-METADATA authority row (AC0). A claim
// accrues MANY rows across the flow (a frozen vote, then a commit; an escalation resolution; a routing
// exclusion) — one live row per phase (D-F). `CycleFreezeCommitId` is the durable commit record's id
// (`cycle_freeze_commits.commit_id`) — CLIENT-GENERATED (the AC5 idempotency key that lets a client
// safely retry a commit) and the Epic-7 pool-spawn handoff anchor. Both are UUID row addresses, so they
// reuse the shared `uuidBrand` validator; `claim_case_id` / `pariwar_id` reuse `ClaimId` / `PariwarId`.

/** Per-row address of a State-Trustee decision (`claim_state_trustee_decisions.decision_id`). */
export type TrusteeDecisionId = Brand<'TrusteeDecisionId'>;
/** Smart constructor: validates UUID shape, returns a branded `TrusteeDecisionId`. */
export const trusteeDecisionId = uuidBrand('TrusteeDecisionId');

/** The durable cycle-freeze commit record's id (`cycle_freeze_commits.commit_id`); client-generated (AC5). */
export type CycleFreezeCommitId = Brand<'CycleFreezeCommitId'>;
/** Smart constructor: validates UUID shape, returns a branded `CycleFreezeCommitId`. */
export const cycleFreezeCommitId = uuidBrand('CycleFreezeCommitId');

// ── R9 special-case voting ids (Story 6.14, Task 2) ────────────────────────────
// `R9VotingSessionId` is the per-row address of one R9 voting panel session
// (`claim_r9_voting_sessions.session_id`) — the panel + clause-snapshot + outcome anchor (D-D). At most
// one non-superseded session per claim (open OR finalized). `R9VoteId` is the per-row address of one
// individual R9 vote (`claim_r9_votes.vote_id`) — one live vote per panelist per session, revisable (each
// revision supersedes the prior via `supersedes_vote_id`) until finalize. Both are UUID row addresses, so
// they reuse the shared `uuidBrand` validator; `claim_case_id` / `pariwar_id` reuse `ClaimId` / `PariwarId`.

/** Per-row address of an R9 voting session (`claim_r9_voting_sessions.session_id`). */
export type R9VotingSessionId = Brand<'R9VotingSessionId'>;
/** Smart constructor: validates UUID shape, returns a branded `R9VotingSessionId`. */
export const r9VotingSessionId = uuidBrand('R9VotingSessionId');

/** Per-row address of an individual R9 vote (`claim_r9_votes.vote_id`). */
export type R9VoteId = Brand<'R9VoteId'>;
/** Smart constructor: validates UUID shape, returns a branded `R9VoteId`. */
export const r9VoteId = uuidBrand('R9VoteId');

// ── Verifier concealment-linkage assessment id (Story 6.15, Task 1) ────────────
// `ConcealmentAssessmentId` is the per-row address of one verifier concealment-linkage assessment
// (`claim_concealment_assessments.assessment_id`) — the human-supplied `claim.concealed_ima_condition_linked`
// fact (D-D). At most one live (non-superseded) assessment per claim; revisable (each revision supersedes
// the prior via `supersedes_assessment_id`). A UUID row address, so it reuses the shared `uuidBrand`
// validator; `claim_case_id` / `pariwar_id` reuse `ClaimId` / `PariwarId`.

/** Per-row address of a verifier concealment-linkage assessment (`claim_concealment_assessments.assessment_id`). */
export type ConcealmentAssessmentId = Brand<'ConcealmentAssessmentId'>;
/** Smart constructor: validates UUID shape, returns a branded `ConcealmentAssessmentId`. */
export const concealmentAssessmentId = uuidBrand('ConcealmentAssessmentId');

// ── Internal 3-stage appeal ids (Story 6.16, Task 1) ───────────────────────────
// Four NEW branded ids per the §Naming "branding mandatory on a new ID's first PR" discipline (L3700-3708):
// `AppealId` is the per-row address of one claim's SINGLE appeal journey anchor (`claim_appeals.appeal_id`)
// — exactly one per claim, ever (D-F unconditional unique on claim_case_id). `AppealDecisionId` is the
// per-row address of one per-stage single/panel decision-metadata row (`claim_appeal_decisions
// .appeal_decision_id`) — mirrors VerifierDecisionId. `AppealPanelSessionId` / `AppealPanelVoteId` are the
// Stage-2 panel session + per-vote addresses (`claim_appeal_panel_sessions.session_id` /
// `claim_appeal_panel_votes.vote_id`) — mirror R9VotingSessionId / R9VoteId. All UUID row addresses, so all
// reuse the shared `uuidBrand` validator; `claim_case_id` / `pariwar_id` reuse `ClaimId` / `PariwarId`.

/** Per-row address of a claim's single appeal-journey anchor (`claim_appeals.appeal_id`). */
export type AppealId = Brand<'AppealId'>;
/** Smart constructor: validates UUID shape, returns a branded `AppealId`. */
export const appealId = uuidBrand('AppealId');

/** Per-row address of one per-stage appeal decision (`claim_appeal_decisions.appeal_decision_id`). */
export type AppealDecisionId = Brand<'AppealDecisionId'>;
/** Smart constructor: validates UUID shape, returns a branded `AppealDecisionId`. */
export const appealDecisionId = uuidBrand('AppealDecisionId');

/** Per-row address of a Stage-2 appeal panel session (`claim_appeal_panel_sessions.session_id`). */
export type AppealPanelSessionId = Brand<'AppealPanelSessionId'>;
/** Smart constructor: validates UUID shape, returns a branded `AppealPanelSessionId`. */
export const appealPanelSessionId = uuidBrand('AppealPanelSessionId');

/** Per-row address of an individual Stage-2 appeal panel vote (`claim_appeal_panel_votes.vote_id`). */
export type AppealPanelVoteId = Brand<'AppealPanelVoteId'>;
/** Smart constructor: validates UUID shape, returns a branded `AppealPanelVoteId`. */
export const appealPanelVoteId = uuidBrand('AppealPanelVoteId');

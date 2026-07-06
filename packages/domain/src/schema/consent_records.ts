// `consent_records` table — Story 2.7 substrate (the consent registry).
//
// The FOURTH and final Epic-2 substrate landing — and, unlike 2.3–2.6, a PURE
// `[PRIMITIVE]`: a granular, revocable consent registry with NO surface layer (no
// apps/api route, no apps/admin/apps/public UI, no member copy). This table owns
// the consent registry SHAPE: every consent transaction is one row, independently
// auditable, revocable, and resolvable to the specific artifact version consented
// to. It mirrors `terms_and_conditions_versions.ts` (pgEnum, branded id, FK-to-audit,
// nullable audit_id, naming discipline) — do NOT invent a new shape.
//
// Consumers (built later, NOT here):
//   · Epic 3 records `tc_acceptance` / `medical_disclosure_ack` / `nominee_share_split`
//     at signup (consumes `recordConsent`).
//   · Epic 6 records `claim_time_dpdpa` at claim time ("Story 2.7's primitive is the
//     only API touched").
//   · Epic 5 / 11b consume `consentExists(...)` as the canonical "did this member have
//     valid X consent at time Y?" gate.
//
// ── subject_id: polymorphic, NO FK, NO brand (the one real shape decision) ────
// `subject_id` is "member OR pre-member applicant id" (epics.md L1554). It is NOT
// FK-able: the `members` table is built in Epic 3 (it does not exist yet), and a
// pre-member applicant id is minted at signup-initiate before any member row
// exists. So `subject_id` is a plain `uuid NOT NULL` with NO FK and NO branded type
// (a brand implies a single owning entity; this column is intentionally
// polymorphic). Referential integrity for the subject is the consumer's concern
// (Epic 3 ties applicant→member). Do NOT add a `members` FK "to be safe" — it would
// not compile (no table) and would wrongly forbid pre-member consents.
//
// ── Revoke is a MUTATE, never a DELETE (compliance invariant) ─────────────────
// Revocation sets `revoked_at` + `revocation_reason` + `revoked_audit_id` on the
// existing row; the row is NEVER deleted (DPDPA "historical proof preserved",
// epics.md L1559). A deleted row would make a pre-revocation `consentExists(...,
// pastTimestamp)` wrongly return false (AC3 requires it return true). Hence the
// migration GRANT is SELECT, INSERT, UPDATE — NOT DELETE.
//
// ── The two variance columns (vs the epic's literal column list) ──────────────
// `revocation_reason` + `revoked_audit_id` are a DELIBERATE variance from epics.md
// L1554 (which names only `audit_id` + `revoked_at`): `revokeConsent(consent_id,
// reason)` takes a reason and the revoke transition needs its OWN audit line, so
// the row carries a durable on-row link for BOTH transitions (grant carries
// `audit_id` + `granted_at`; revoke carries `revoked_audit_id` + `revocation_reason`
// + `revoked_at`). Keeps "every consent transaction is independently auditable"
// literally true on the row. Recorded in ADR-0024.
//
// ── consent_payload: internal-only jsonb (PII note) ───────────────────────────
// Holds operational context (checkbox text shown, locale at consent time, IP,
// user-agent). It is NEVER publicly rendered (the registry is audit/admin-queried)
// and is not a Tier-1 PII column under AR-12, so it is stored clear jsonb. The
// `ConsentPayload` type documents the shape consumers SHOULD populate; the jsonb
// stays permissive.
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors clause_versions / terms_and_conditions_
// versions): NOT cross-readable. A member's consents are read under that Pariwar's
// `app.pariwar_id`. RLS in policies/consent-records-rls.ts (ADR-0020 posture).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural (a collection of consent rows).

import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ConsentId, PariwarId } from '../ids/index.js';
import { auditLogEntries } from './audit_log_entries.js';

/**
 * The category of consent a row records (AC1). The AC1-listed SEVEN values ONLY:
 *   · `tc_acceptance`           — Epic 3 signup T&C acceptance
 *   · `dpdpa_data_processing`   — DPDPA processing consent
 *   · `dpdpa_data_sharing`      — DPDPA sharing consent
 *   · `marketing`               — marketing opt-in (no versioned artifact → ref null)
 *   · `medical_disclosure_ack`  — Epic 3 medical-disclosure acknowledgement
 *   · `nominee_share_split`     — Epic 3 nominee share-split acknowledgement
 *   · `claim_time_dpdpa`        — Epic 6 claim-time DPDPA consent
 *
 * New consent types (e.g. `whatsapp_opt_in` Epic 5, `sahyog_vivran_publication` /
 * `in_memoriam_listing` Epic 11b, `module_lead_handoff` Epic 12) are added by their
 * OWN consumer epic via an additive `ALTER TYPE … ADD VALUE` migration. Do NOT seed
 * types for surfaces that do not exist yet.
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` `ConsentTypeSchema` z.enum: the literal list
 * is DUPLICATED there because `@twt/domain` must NOT import `@twt/contracts` (turbo
 * cycle). Drift is prevented by an equality assertion in the contracts test
 * comparing this pgEnum's `.enumValues` to the schema's `.options` (the legal import
 * direction is contracts→domain) — mirror the `tc_legal_review_status` ↔
 * `TcLegalReviewStatusSchema` discipline. `pgEnum` (not a raw CHECK) yields a
 * `CREATE TYPE` in the migration.
 */
export const consentTypeEnum = pgEnum('consent_type', [
  'tc_acceptance',
  'dpdpa_data_processing',
  'dpdpa_data_sharing',
  'marketing',
  'medical_disclosure_ack',
  'nominee_share_split',
  'claim_time_dpdpa',
  // Story 5.4 — member WhatsApp opt-in consent (the Epic-5 additive named in the
  // schema header). Recorded on the PENDING→ACTIVE inbound-webhook match; revoked on
  // member/STOP/Meta-block/admin opt-out. APPENDED at the END — never reorder an
  // existing pgEnum (stored ordinals). Added by an `ALTER TYPE … ADD VALUE` migration
  // in its OWN file (that DDL cannot run in a tx / be used in the same tx it is added).
  'whatsapp_opt_in',
]);

/**
 * How a consent was granted (AC1): `member_self` (the member acted directly),
 * `staff_assisted` (a staff actor recorded it on the member's behalf), or
 * `inherited` (carried forward from a prior consent context). Also a `pgEnum` →
 * `CREATE TYPE` + DB-level guard, also lockstep-asserted against the contracts
 * `ConsentGrantedViaSchema` z.enum.
 */
export const consentGrantedViaEnum = pgEnum('consent_granted_via', [
  'member_self',
  'staff_assisted',
  'inherited',
]);

/**
 * The documented shape of `consent_payload` — operational context a consumer SHOULD
 * populate at consent time. The jsonb column stays permissive (an open index
 * signature) so a consumer can attach extra context, but the named fields keep
 * population consistent. NEVER place Tier-1 PII here (see schema header) — checkbox
 * text / locale / IP / UA do not warrant Story 1.5 envelope-encryption.
 */
export interface ConsentPayload {
  /** The exact checkbox/consent text shown to the subject at consent time. */
  checkboxTextShown?: string;
  /** The locale the consent UI was rendered in (e.g. 'hi' | 'en'). */
  locale?: string;
  /** The originating IP (operational context, not Tier-1 PII). */
  ip?: string;
  /** The originating user-agent string. */
  userAgent?: string;
  [k: string]: unknown;
}

export const consentRecords = pgTable(
  'consent_records',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded
    // `ConsentId`. A NEW id is minted per grant — multiple rows over time are by
    // design (no unique constraint on (subject_id, consent_type); AC3).
    consentId: uuid('consent_id').defaultRandom().primaryKey().$type<ConsentId>(),

    // The member-or-pre-member-applicant id. POLYMORPHIC: NO FK (the members table
    // is Epic 3 — it does not exist yet), NO brand (a brand implies a single owning
    // entity; this column is intentionally polymorphic). See schema header.
    subjectId: uuid('subject_id').notNull(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The consent category (see consentTypeEnum) — the 7 AC1 values.
    consentType: consentTypeEnum('consent_type').notNull(),

    // Reference to the specific artifact version consented to — e.g. a
    // `tc_version_id` or `clause_version_id`. NULLABLE: consents with no versioned
    // artifact (such as `marketing`) carry null. No FK (the ref is polymorphic
    // across artifact tables); resolution is the consumer's concern.
    consentArtifactRef: text('consent_artifact_ref'),

    // DB-authoritative grant time (architecture §1.11). Default now(). The lower
    // bound of the `consentExists` validity window.
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // DB-authoritative revoke time (architecture §1.11). NULL = currently valid.
    // Set by `revokeConsent` (a mutate, never a row-delete). The upper bound of the
    // `consentExists` validity window.
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),

    // How the consent was granted (see consentGrantedViaEnum).
    grantedViaActor: consentGrantedViaEnum('granted_via_actor').notNull(),

    // Operational context (checkbox text shown, locale, IP, user-agent). Internal-
    // only, never publicly rendered. Permissive jsonb typed via `ConsentPayload`.
    consentPayload: jsonb('consent_payload').$type<ConsentPayload>().notNull(),

    // FK → the Story 1.10 audit line for the GRANT transition. The consumer route
    // (Epic 3/6) writes the audit line FIRST then threads its id in (audit-or-throw);
    // 2.7 has no route, so its accessors merely ACCEPT a caller-supplied id. NULLABLE
    // (the domain tests pass null; a real chained audit line is a consumer concern).
    auditId: uuid('audit_id').references(() => auditLogEntries.auditId),

    // ── Variance columns (vs the epic's literal audit_id + revoked_at) ──────────
    // Recorded on the REVOKE transition so the row is symmetric — both transitions
    // carry a durable on-row audit link. See schema header + ADR-0024.

    // The caller-supplied reason for revocation (`revokeConsent(consent_id, reason)`).
    revocationReason: text('revocation_reason'),

    // FK → the Story 1.10 audit line for the REVOKE transition (its OWN audit line,
    // distinct from the grant `audit_id`). NULLABLE for the same reason as `audit_id`.
    revokedAuditId: uuid('revoked_audit_id').references(() => auditLogEntries.auditId),
  },
  (t) => [
    // The `consentExists` / `listConsents` lookup key (AC1): resolve a subject's
    // consents of a given type within a Pariwar. NOT unique — grant→revoke→re-grant
    // produces multiple rows over time by design (AC3).
    index('consent_records_pariwar_subject_type_idx').on(
      t.pariwarId,
      t.subjectId,
      t.consentType,
    ),
  ],
);

// Inferred row types for the accessor read/write paths (terms_and_conditions
// _versions precedent).
export type ConsentRecordRow = typeof consentRecords.$inferSelect;
export type ConsentRecordInsert = typeof consentRecords.$inferInsert;

/** The consent-category literal union (`tc_acceptance` | … | `claim_time_dpdpa`). */
export type ConsentType = (typeof consentTypeEnum.enumValues)[number];
/** The grant-channel literal union (`member_self` | `staff_assisted` | `inherited`). */
export type ConsentGrantedVia = (typeof consentGrantedViaEnum.enumValues)[number];

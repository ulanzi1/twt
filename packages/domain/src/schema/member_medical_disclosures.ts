// `member_medical_disclosures` — the member's medical-disclosure history (Story 3.5, Task 1).
//
// The THIRD member-PII table (after 3.3b's `member_kyc_profiles` + 3.4's `member_nominees`),
// and the persistence the medical-disclosure SURFACE writes. The member discloses any
// IMA-listed pre-existing illnesses + an explicit concealment-denial acknowledgment; the
// selected condition codes + free-text additional context land HERE Tier-1-encrypted, while
// the `member.medical_disclosed` event records only the non-PII audit (count + ima_list_version
// + ack) on the stream (R1).
//
// ── APPEND-ONLY history — NOT latest-wins (the key structural difference from 3.4) ────────
// `member_nominees` is latest-wins (delete-then-insert; the current row-set is the effective
// declaration). Medical disclosures are the OPPOSITE: APPEND-ONLY. Epic 4 concealment
// evaluation walks the FULL disclosure history (epics L1715, L1956) — every disclosure is
// preserved with its `ima_list_version` + timestamp. So the PK is a PER-DISCLOSURE
// `disclosure_id` (a NEW row per submit, multiple rows over time by design) — NOT a composite
// (member_id, …) latest-wins key. The migration GRANT is SELECT + INSERT only (no UPDATE, no
// DELETE beyond the FK cascade — immutable history, mirror the consent-records "no DELETE"
// rationale). See Dev Notes §R2.
//
// TENANT-ISOLATED (mirrors `member_nominees` / `members`, NOT the global identity-auth
// carve-out). A disclosure belongs to exactly one member in exactly one Pariwar; the in-scope
// submit write + the history read run under that Pariwar's `app.pariwar_id`. RLS in
// policies/member-medical-disclosures-rls.ts. Every access is in-scope — there is NO pre-scope
// path (the submit/status routes are fully member-session-gated).
//
// ── PII discipline (Dev Notes §"Medical field sensitivity") ──────────────────────────────
//   · disclosed_conditions (array of selected IMA codes) / additional_context (free-text) →
//     Tier-1 envelope ciphertext (`piiColumn(1, 'member_medical')`). Health data about the
//     member; never searched/deduped, so plain Tier-1 ciphertext (architecture §2.7 lists
//     medical disclosures as Tier-1). `additional_context` is NULLABLE (optional). The
//     conditions array is ALWAYS encrypted (encrypt `[]` when zero selected) so the column is
//     non-null and round-trips. NEVER logged; NEVER echoed back (the summary uses presence/count).
//   · condition_count → NON-PII metadata (a count, not which conditions — mirrors 3.4
//     `nominee_count`; safe in the column + the event payload).
//   · ima_list_version / acknowledgment_text_locale / acknowledged_at → NON-PII (safe in
//     table + event).
// The `piiColumn(tier, fieldClass)` annotations feed the Story 1.16b PII-shielding CI gate.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_nominees.ts.

import { index, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type {
  ClauseVersionId,
  ConsentId,
  MedicalDisclosureId,
  MemberId,
  PariwarId,
} from '../ids/index.js';
import { consentRecords } from './consent_records.js';
import { members } from './members.js';

export const memberMedicalDisclosures = pgTable(
  'member_medical_disclosures',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded
    // `MedicalDisclosureId`. A NEW id per disclosure — multiple rows over time are BY DESIGN
    // (append-only history; cf. member_nominees' composite (member_id, rank) latest-wins PK).
    disclosureId: uuid('disclosure_id')
      .defaultRandom()
      .primaryKey()
      .$type<MedicalDisclosureId>(),

    // The disclosing member. FK → members.member_id keeps referential integrity; the in-scope
    // submit write runs under the member's Pariwar so the FK check sees the row (same RLS
    // family). RTBF (Story 3.12) deletes via cascade. NOT `.primaryKey()` — the PK is disclosure_id.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The resolved `niy.medical.ima-list` clause_version_id the member saw (NON-PII; held as
    // `text` exactly like `consent_records.consent_artifact_ref` holds a clause_version_id).
    imaListVersion: text('ima_list_version').notNull(),

    // Tier-1 ciphertext of the canonical-JSON array of selected condition codes. ALWAYS
    // non-null — encrypt `[]` when zero selected so the column round-trips (R5).
    disclosedConditionsCiphertext: piiColumn(1, 'member_medical')(
      'disclosed_conditions_ciphertext',
    ).notNull(),

    // Tier-1 ciphertext of the optional free-text additional context. NULLABLE.
    additionalContextCiphertext: piiColumn(1, 'member_medical')(
      'additional_context_ciphertext',
    ),

    // NON-PII count (0..N) for summary/audit/event (mirrors 3.4 nominee_count — a count is
    // metadata, not health data; see Dev Notes §"Medical field sensitivity").
    conditionCount: smallint('condition_count').notNull(),

    // DB-authoritative ack instant (§1.11).
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // Which locale the ack text was shown in ('hi' | 'en'). NON-PII. The value set is
    // constrained in the contract, NOT at the DB (the kyc_transactions.status "text for the
    // swap seam" posture).
    acknowledgmentTextLocale: text('acknowledgment_text_locale').notNull(),

    // The `niy.concealment.r14` version acknowledged (self-contained provenance on the row;
    // ALSO stored in consent_records.consent_artifact_ref). No FK — clause_versions is
    // tenant-scoped and the ref is resolved at write time (mirror the consent registry's
    // "no FK on consent_artifact_ref" decision).
    clauseVersionId: uuid('clause_version_id').notNull().$type<ClauseVersionId>(),

    // FK link disclosure → the consent row created in the SAME tx (insert consent FIRST, then
    // the disclosure carries its id). References consent_records.consent_id.
    consentId: uuid('consent_id')
      .notNull()
      .$type<ConsentId>()
      .references(() => consentRecords.consentId),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The history-read lookup key (walk a member's disclosures within a Pariwar).
    index('member_medical_disclosures_pariwar_member_idx').on(t.pariwarId, t.memberId),
  ],
);

export type MemberMedicalDisclosureRow = typeof memberMedicalDisclosures.$inferSelect;
export type MemberMedicalDisclosureInsert = typeof memberMedicalDisclosures.$inferInsert;

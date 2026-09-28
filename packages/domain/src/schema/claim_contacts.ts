// `claim_contacts` + `claim_contact_nominees` — the claim's CONTACT RECORD (Story 6.19a, Task 1; AC1; the 6.19
// shared spec's D5 / D15 / D16, committed in `2026-09-28-265`; the write rules are 6.19a AC1's W1–W10).
//
// ONE parent row per claim (UNIQUE `claim_case_id`) and one child row per (contact, nominee VERSION) — UNIQUE
// `(contact_id, nominee_version_id)`. ⭐ A child binds to a `member_nominee_versions` row, ⛔ never to a rank or
// to the effective declaration: that is `undetermined` at filing (T12), so the approval check (D14) resolves
// the EFFECTIVE versions' rows at approval, through the correction chain (W4a). Rows for versions that prove
// ⛔ not effective stay, unused. ⛔ The declaration is never edited (`-233`) — the address lives here.
//
// ── The claimant side (W6) ──────────────────────────────────────────────────────────────────────────────────
// Exactly ONE of: `claimantNomineeVersionId` (the claimant IS one of the nominees), or the claimant block
// (name, mobile, address — all three). A CHECK is the truth; every writer clears the other side in the same
// statement.
//
// ── The agreement (D15) ─────────────────────────────────────────────────────────────────────────────────────
// `agreementConsentId` → the `claim_contact_agreement` consent row recorded in the SAME transaction. ⭐ The
// agreement is PER CLAIM and is read ONLY through this column — ⛔ never by subject (`consent_records` has no
// claim column; a refiled claim for the same death gives it again, `-261` C3).
//
// ── PII (T8; shared spec invariant 9) ───────────────────────────────────────────────────────────────────────
//   · the claimant's name / mobile / address and each nominee's address → Tier-1 envelope ciphertext
//     (`piiColumn(1, 'claim_contact')`), encrypted in the API handler BEFORE insert; read back only through the
//     gated, audited plaintext admin read (6.19a AC8a (ii)). ⛔ Never logged, echoed, or put in an event,
//     audit line or error body. ⛔ No mobile blind index.
//   · `relationship` (the claimant's relationship to that nominee) → plain text, ⛔ not Tier-1 — a label, like
//     `member_nominees.relationship` (D16, our call). Its values are the contracts' `ClaimantNomineeRelationship`.
//   ⚠ ⛔ NO RTBF path reaches either table yet — recorded in `deferred-work.md`, ⛔ not fixed (the `-243` posture
//   for claim tables).
//
// TENANT-ISOLATED; RLS in policies/claim-contact-rls.ts. `twt_app` holds SELECT / INSERT / UPDATE — ⛔ no DELETE
// (W4: a write never deletes a row it does not carry).

import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, ConsentId, MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';
import { consentRecords } from './consent_records.js';
import { memberNomineeVersions } from './member_nominee_versions.js';

/** The copy the filer was shown and the SMS language (W9). ⚠ LOCKSTEP with migration 0125's CHECK. */
export const CLAIM_CONTACT_LOCALES = ['hi', 'en'] as const;
export type ClaimContactLocale = (typeof CLAIM_CONTACT_LOCALES)[number];

/** The surface of the CREATING write (W9). ⚠ LOCKSTEP with migration 0125's CHECK. */
export const CLAIM_CONTACT_RECORDED_VIA = ['member_app', 'helpline'] as const;
export type ClaimContactRecordedVia = (typeof CLAIM_CONTACT_RECORDED_VIA)[number];

export const claimContacts = pgTable(
  'claim_contacts',
  {
    contactId: uuid('contact_id').defaultRandom().primaryKey(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The claim's deceased member — the `consent_records` subject of the agreement.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The claimant IS this nominee version (W1 / W2) — or null, and the claimant block is set.
    claimantNomineeVersionId: uuid('claimant_nominee_version_id')
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),

    // ── The claimant block — Tier-1 ciphertext, all three or none (the CHECK) ──
    // D9 — the claimant's NAME is ⛔ not English-gated: `-227` cl.9 scoped the English-script rule to the two
    // names the name check compares, and UX-DR57 requires bilingual input.
    claimantNameCiphertext: piiColumn(1, 'claim_contact')('claimant_name_ciphertext'),
    claimantMobileCiphertext: piiColumn(1, 'claim_contact')('claimant_mobile_ciphertext'),
    claimantAddressCiphertext: piiColumn(1, 'claim_contact')('claimant_address_ciphertext'),

    // D15 — the per-claim agreement.
    agreementConsentId: uuid('agreement_consent_id')
      .notNull()
      .$type<ConsentId>()
      .references(() => consentRecords.consentId),

    contactLocale: text('contact_locale').notNull().default('hi').$type<ClaimContactLocale>(),

    // Set by the CREATING write only (W9); every later write's actor and surface go in its audit event.
    recordedByActor: text('recorded_by_actor').notNull(),
    recordedVia: text('recorded_via').notNull().$type<ClaimContactRecordedVia>(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('claim_contacts_claim_case_id_uq').on(t.claimCaseId),
    index('claim_contacts_pariwar_id_idx').on(t.pariwarId),
    index('claim_contacts_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    index('claim_contacts_agreement_consent_id_idx').on(t.agreementConsentId),
    check('claim_contacts_contact_locale_check', sql`${t.contactLocale} IN ('hi', 'en')`),
    check('claim_contacts_recorded_via_check', sql`${t.recordedVia} IN ('member_app', 'helpline')`),
    check('claim_contacts_recorded_by_actor_check', sql`length(btrim(${t.recordedByActor})) > 0`),
    check(
      'claim_contacts_one_claimant_side_check',
      sql`(${t.claimantNomineeVersionId} IS NOT NULL AND ${t.claimantNameCiphertext} IS NULL AND ${t.claimantMobileCiphertext} IS NULL AND ${t.claimantAddressCiphertext} IS NULL) OR (${t.claimantNomineeVersionId} IS NULL AND ${t.claimantNameCiphertext} IS NOT NULL AND ${t.claimantMobileCiphertext} IS NOT NULL AND ${t.claimantAddressCiphertext} IS NOT NULL)`,
    ),
  ],
);

export type ClaimContactRow = typeof claimContacts.$inferSelect;
export type ClaimContactInsert = typeof claimContacts.$inferInsert;

export const claimContactNominees = pgTable(
  'claim_contact_nominees',
  {
    contactNomineeId: uuid('contact_nominee_id').defaultRandom().primaryKey(),

    contactId: uuid('contact_id')
      .notNull()
      .references(() => claimContacts.contactId, { onDelete: 'cascade' }),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    nomineeVersionId: uuid('nominee_version_id')
      .notNull()
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),

    // Tier-1 — required when the row is created (W7).
    addressCiphertext: piiColumn(1, 'claim_contact')('address_ciphertext').notNull(),

    // D16 — the claimant's relationship to THIS nominee, when the claimant is none of them. Plain text.
    relationship: text('relationship'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('claim_contact_nominees_contact_version_uq').on(t.contactId, t.nomineeVersionId),
    index('claim_contact_nominees_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_contact_nominees_nominee_version_id_idx').on(t.nomineeVersionId),
    check('claim_contact_nominees_relationship_check', sql`${t.relationship} IS NULL OR length(btrim(${t.relationship})) > 0`),
  ],
);

export type ClaimContactNomineeRow = typeof claimContactNominees.$inferSelect;
export type ClaimContactNomineeInsert = typeof claimContactNominees.$inferInsert;

// `nominee_determinations` + `nominee_determination_items` — the District Admin's record of WHICH
// nominee-declaration versions STAND for one claim (Story 6.20, Task 1; D4, D6, D15, D17; AC4).
//
// `2026-09-20-235` Y: *"District admin decides changed after death against death certificate date …
// A change done before a day of death will be assumed to be done by member, everything else will be
// discarded."* ⇒ the District Admin enters the CERTIFICATE DATE and marks each version `stands` or
// `discarded`; the writer VALIDATES the marks against D6's rule and refuses an inconsistent set — a
// guard, ⛔ never a default, ⛔ never applied by the system (invariant 1).
//
// ⛔ A NEW TABLE, NOT `claim_verifier_decisions` / `claim_state_trustee_decisions` / the R9 votes (T6):
// `getOriginalDeciderActorIds` unions actors from those three into the appeal reviewer-conflict set, so
// a determination row there would silently disqualify the District Admin from reviewing an appeal.
//
// ── Shape ────────────────────────────────────────────────────────────────────────────────────────
//   · At most ONE LIVE determination per claim (the partial-unique index `WHERE superseded_at IS
//     NULL`). A redetermination — or a correction applied while one is live (D7) — supersedes it with
//     the conditional `UPDATE … WHERE determination_id AND superseded_at IS NULL` (0 rows ⇒ 409).
//   · `watermark_rank{1,2}_version_no` — each rank's highest `version_no` at the moment the District
//     Admin read the timeline (D17). A write against a stale watermark is a 409.
//   · Items: one row per version the determination judged, `stands` | `discarded`. A version with NO
//     item does ⛔ not stand (fail-closed, D5).
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────
//   · certificate_date_ciphertext → Tier-1: the death date the District Admin read off the certificate
//     (`YYYY-MM-DD`). A date of death is sensitive personal data; it is decrypted only in the
//     authorized timeline read and ⛔ never enters an event, a log or an audit line.
//   · note_ciphertext → Tier-1, REQUIRED: the District Admin's reasoning.
//   · decided_by_display → controlled STAFF data, snapshotted at decision time, ⛔ never email-derived
//     ([[project_admin_display_name_attribution]]).
// Both ciphertext columns carry a column-level UPDATE grant for the DPDPA-RTBF scrub (D11).

import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type {
  ClaimId,
  DeathCertificateReviewId,
  MemberId,
  NomineeDeterminationId,
  NomineeVersionId,
  PariwarId,
} from '../ids/index.js';
import { claimDeathCertificateReviews } from './claim_death_certificate_reviews.js';
import { claims } from './claims.js';
import { memberNomineeVersions } from './member_nominee_versions.js';

/** A determination item's mark (`-235` Y). ⛔ No third value — the District Admin decides one way. */
export const NOMINEE_DETERMINATION_MARKS = ['stands', 'discarded'] as const;
export type NomineeDeterminationMark = (typeof NOMINEE_DETERMINATION_MARKS)[number];

/** Why a determination stopped being live. */
export const NOMINEE_DETERMINATION_SUPERSESSION_REASONS = ['redetermined', 'correction_applied'] as const;
export type NomineeDeterminationSupersessionReason =
  (typeof NOMINEE_DETERMINATION_SUPERSESSION_REASONS)[number];

export const nomineeDeterminations = pgTable(
  'nominee_determinations',
  {
    determinationId: uuid('determination_id')
      .defaultRandom()
      .primaryKey()
      .$type<NomineeDeterminationId>(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased member (the `claims.deceased_member_id` cache — ⛔ no FK, like `claims`). The RTBF
    // scrub keys on it.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // Tier-1 — the certificate date the District Admin entered (`YYYY-MM-DD`, D4).
    certificateDateCiphertext: piiColumn(1, 'nominee_determination')(
      'certificate_date_ciphertext',
    ).notNull(),
    // Tier-1 — the REQUIRED note.
    noteCiphertext: piiColumn(1, 'nominee_determination')('note_ciphertext').notNull(),

    // D17 — each rank's highest version_no at read time (NULL when that rank had no version at all).
    watermarkRank1VersionNo: integer('watermark_rank1_version_no'),
    watermarkRank2VersionNo: integer('watermark_rank2_version_no'),

    decidedByActorId: text('decided_by_actor_id').notNull(),
    decidedByDisplay: text('decided_by_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // NULL = the LIVE determination for this claim.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
    supersededReason: text('superseded_reason').$type<NomineeDeterminationSupersessionReason>(),

    // The live determination this one replaced (null on a first determination). Self-FK.
    supersedesDeterminationId: uuid('supersedes_determination_id')
      .$type<NomineeDeterminationId>()
      .references((): AnyPgColumn => nomineeDeterminations.determinationId),

    // Story 6.21a D8 (0122) — the ACCEPTED death-certificate review whose date is this determination's
    // cutoff. Set at INSERT only (⛔ no UPDATE grant). NULLABLE: 0119-era rows exist in dev/test databases
    // (⛔ no backfill); a NULL is `determination_stale` at the approval gate (D7), ⛔ never a pass.
    // ON DELETE SET NULL.
    deathCertificateReviewId: uuid('death_certificate_review_id')
      .$type<DeathCertificateReviewId>()
      .references(() => claimDeathCertificateReviews.reviewId, { onDelete: 'set null' }),
  },
  (t) => [
    index('nominee_determinations_pariwar_id_idx').on(t.pariwarId),
    index('nominee_determinations_claim_case_id_idx').on(t.claimCaseId),
    index('nominee_determinations_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    index('nominee_determinations_death_certificate_review_id_idx').on(t.deathCertificateReviewId),
    // D4 — at most ONE live determination per claim (the supersession backstop).
    uniqueIndex('nominee_determinations_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type NomineeDeterminationRow = typeof nomineeDeterminations.$inferSelect;
export type NomineeDeterminationInsert = typeof nomineeDeterminations.$inferInsert;

export const nomineeDeterminationItems = pgTable(
  'nominee_determination_items',
  {
    determinationId: uuid('determination_id')
      .notNull()
      .$type<NomineeDeterminationId>()
      .references(() => nomineeDeterminations.determinationId, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
      .notNull()
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    mark: text('mark').notNull().$type<NomineeDeterminationMark>(),
  },
  (t) => [
    primaryKey({ columns: [t.determinationId, t.versionId] }),
    index('nominee_determination_items_version_id_idx').on(t.versionId),
  ],
);

export type NomineeDeterminationItemRow = typeof nomineeDeterminationItems.$inferSelect;

// `nominee_corrections` — a GENUINE-MISTAKE correction to a locked nominee declaration (Story 6.20,
// Task 1 / Task 5; D7; AC7).
//
// `2026-09-20-234` W: *"Allow geniune mistake … Only if we know the relation we can allow geniune
// mistake."* · `2026-09-20-236` Z: *"correction requires approval by both, first District Admin then
// Pariwar Admin."* · `2026-09-21-237` cl.2: *"if `other` is selected … no correction will be allowed."*
//
// ⚠⚠ NOT 6.18's "correction". `CorrectionQueueRoute` / `correction-queue-read.ts` is a CLAIM returned
// for BANK-DETAIL correction (`-227` cl.10). THIS is a NOMINEE DECLARATION correction — a different
// subject, table and approval shape (D7). The two ⛔ never merge.
//
// ── ONE row, a `step` column ─────────────────────────────────────────────────────────────────────
//   `da_pending` → `pa_pending` → `applied`, or → `declined` at either step. Each step is a conditional
//   `UPDATE … WHERE correction_id AND step = …` (0 rows ⇒ 409). The two approvers must be DIFFERENT
//   people — enforced in the writer AND by `nominee_corrections_distinct_approvers_check`. Each step
//   carries a snapshotted display name and a REQUIRED note (`-237` cl.4, CC3).
//   The Pariwar Admin's approval APPLIES the change: a new version with `source = 'correction'`,
//   `effective_at` and `split_pct` inherited from `target_version_id` (invariant 5, D17(b)), and the
//   `member_nominees` projection updated — one transaction.
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────
//   · proposed_{name,mobile,address}_ciphertext → Tier-1 (the corrected nominee's details).
//   · raise_note / da_note / pa_note _ciphertext → Tier-1 free text.
//   · proposed_relationship → Tier-3 plaintext (the contracts enum constrains it).
//   · *_display → controlled STAFF data snapshotted at the act.
// Every ciphertext column carries a column-level UPDATE grant for the DPDPA-RTBF scrub (D11).

import { sql } from 'drizzle-orm';
import { index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type {
  ClaimId,
  MemberId,
  NomineeCorrectionId,
  NomineeVersionId,
  PariwarId,
} from '../ids/index.js';
import { claims } from './claims.js';
import { memberNomineeVersions } from './member_nominee_versions.js';
import { members } from './members.js';

/** The correction's single state column (D7). */
export const NOMINEE_CORRECTION_STEPS = ['da_pending', 'pa_pending', 'applied', 'declined'] as const;
export type NomineeCorrectionStep = (typeof NOMINEE_CORRECTION_STEPS)[number];

/** Through which channel the correction was raised (CC2 — ⛔ never the District Admin alone). */
export const NOMINEE_CORRECTION_CHANNELS = ['helpline', 'member_app'] as const;
export type NomineeCorrectionChannel = (typeof NOMINEE_CORRECTION_CHANNELS)[number];

/** Which step's approver declined (NULL unless `step = 'declined'`). */
export const NOMINEE_CORRECTION_DECLINE_STEPS = ['district_admin', 'pariwar_admin'] as const;
export type NomineeCorrectionDeclineStep = (typeof NOMINEE_CORRECTION_DECLINE_STEPS)[number];

export const nomineeCorrections = pgTable(
  'nominee_corrections',
  {
    correctionId: uuid('correction_id').defaultRandom().primaryKey().$type<NomineeCorrectionId>(),

    // The claim the correction is tied to — the District Admin's district is derived from it (D7).
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The member whose declaration is corrected (the deceased). FK: the version chain it writes into
    // is keyed on it.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    rank: smallint('rank').notNull(),

    // The rank's STANDING version at raise time (a discarded / superseded target is refused, D7).
    targetVersionId: uuid('target_version_id')
      .notNull()
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),

    proposedNameCiphertext: piiColumn(1, 'nominee_correction')('proposed_name_ciphertext').notNull(),
    proposedRelationship: text('proposed_relationship').notNull(),
    proposedMobileCiphertext: piiColumn(1, 'nominee_correction')('proposed_mobile_ciphertext').notNull(),
    proposedAddressCiphertext: piiColumn(1, 'nominee_correction')('proposed_address_ciphertext'),

    raisedVia: text('raised_via').notNull().$type<NomineeCorrectionChannel>(),
    raisedByActorId: text('raised_by_actor_id').notNull(),
    raiseNoteCiphertext: piiColumn(1, 'nominee_correction')('raise_note_ciphertext').notNull(),
    raisedAt: timestamp('raised_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    step: text('step').notNull().$type<NomineeCorrectionStep>(),

    daActorId: text('da_actor_id'),
    daDisplay: text('da_display'),
    daNoteCiphertext: piiColumn(1, 'nominee_correction')('da_note_ciphertext'),
    daDecidedAt: timestamp('da_decided_at', { withTimezone: true, mode: 'date' }),

    paActorId: text('pa_actor_id'),
    paDisplay: text('pa_display'),
    paNoteCiphertext: piiColumn(1, 'nominee_correction')('pa_note_ciphertext'),
    paDecidedAt: timestamp('pa_decided_at', { withTimezone: true, mode: 'date' }),

    declinedAtStep: text('declined_at_step').$type<NomineeCorrectionDeclineStep>(),

    // The `source = 'correction'` version the PA's approval wrote.
    appliedVersionId: uuid('applied_version_id')
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),
  },
  (t) => [
    index('nominee_corrections_pariwar_id_idx').on(t.pariwarId),
    index('nominee_corrections_claim_case_id_idx').on(t.claimCaseId),
    index('nominee_corrections_member_idx').on(t.pariwarId, t.memberId),
    // One OPEN correction per claim + rank — a second raise while one is pending is a 409.
    uniqueIndex('nominee_corrections_one_open_per_claim_rank_uq')
      .on(t.claimCaseId, t.rank)
      .where(sql`step IN ('da_pending', 'pa_pending')`),
  ],
);

export type NomineeCorrectionRow = typeof nomineeCorrections.$inferSelect;
export type NomineeCorrectionInsert = typeof nomineeCorrections.$inferInsert;

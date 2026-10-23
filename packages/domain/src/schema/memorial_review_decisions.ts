// `memorial_review_decisions` — the Trust's ONE decision on a memorial version (Story 11b.4, migration 0181;
// `#decision-2026-10-24-398` MA6 / MA7 / MA15).
//
// ONE row per submission (the PK), written once under the pool-keyed advisory lock (MA9). A wrong decision is cured by
// the family's next version or, after an approval, by the Trust withdrawing it (MA16) — ⛔ never by overwriting.
//
// ⛔ The family's text is ⛔ never copied here: `omissions` holds ONLY `{ field, start, end, reason }` spans — `[start,
// end)` UTF-16 offsets into the VERBATIM field (MA6) — and `photo_left_out_reason` the photo's. The verbatim body stays
// in `memorial_submissions`; the as-approved view is RECONSTRUCTED (`@twt/ui` `reconstructMemorial` — AC5).
//
// APPEND-ONLY save MA15's column grant on `internal_note_ciphertext` (Tier-1, the reviewer's optional note — ⛔ never
// shown to the family, read back in the reviewer's history view). `actor_display` is the reviewer's stored display name
// snapshot (staff data, ⛔ never email-derived — [[project_admin_display_name_attribution]]).

import { sql } from 'drizzle-orm';
import { foreignKey, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { MEMORIAL_FIELD_CLASS } from '../encryption/field-classes.js';
import { piiColumn } from '../encryption/column.js';
import type { PariwarId } from '../ids/index.js';
import { MEMORIAL_REVIEW_ACTIONS, MEMORIAL_REVIEW_REASONS, type MemorialOmission } from '../memorial/vocab.js';
import { memorialSubmissions } from './memorial_submissions.js';

export const memorialReviewActionEnum = pgEnum('memorial_review_action', MEMORIAL_REVIEW_ACTIONS);
export const memorialReviewReasonEnum = pgEnum('memorial_review_reason', MEMORIAL_REVIEW_REASONS);

export const memorialReviewDecisions = pgTable(
  'memorial_review_decisions',
  {
    submissionId: uuid('submission_id').primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    action: memorialReviewActionEnum('action').notNull(),
    // `'[]'` for `approved` / `not_approved` — ⛔ never NULL (MA6). Shape backstopped by `memorial_omissions_valid`.
    omissions: jsonb('omissions')
      .$type<MemorialOmission[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // NULL = the photo was kept (or there was none).
    photoLeftOutReason: memorialReviewReasonEnum('photo_left_out_reason'),
    // `not_approved` only.
    reasonCode: memorialReviewReasonEnum('reason_code'),
    internalNoteCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('internal_note_ciphertext'),
    actorId: uuid('actor_id').notNull(),
    actorDisplay: text('actor_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'memorial_review_decisions_submission_fk',
      columns: [t.pariwarId, t.submissionId],
      foreignColumns: [memorialSubmissions.pariwarId, memorialSubmissions.submissionId],
    }),
  ],
);

export type MemorialReviewDecisionRow = typeof memorialReviewDecisions.$inferSelect;
export type MemorialReviewDecisionInsert = typeof memorialReviewDecisions.$inferInsert;

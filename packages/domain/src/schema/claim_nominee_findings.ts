// `claim_nominee_findings` — the INVESTIGATION FINDINGS Story 6.20 consumes as INPUT (Story 6.20,
// Task 1; AC2's release route, D17(c)'s disqualified primary).
//
// ⚠⚠ THE PRODUCER OF THESE ROWS IS ROW `6-22` (the fraud register), AND IT IS ⛔ NOT BUILT. Until it
// lands this table has ⛔ NO production writer — `2026-09-21-241` §6 requires the story to say so:
//   · `member_found_innocent` — `-238` cl.1: a claim filed against a LIVING member, the investigation
//     finds the member innocent ⇒ the nominee lock that claim created is RELEASED (AC2). The guilty
//     arm (termination, blacklist) is ⛔ not 6.20's.
//   · `nominee_disqualified` — `-240` cl.4: one of two nominees is involved in a fraud ⇒ the other is
//     paid the whole amount. The effective accessor removes the disqualified rank and RE-RANKS the
//     survivor to rank 1 at 100% (D17(c)). ⛔ Never a District Admin determination mark.
// The domain writers exist so `6-22` has an interface to call and so AC11(ii)/(iv) can drive the arms
// with a test-seeded finding.
//
// ⛔ No PII: ids, a bounded kind, a rank, a snapshotted STAFF display name. Append-only (SELECT +
// INSERT); a finding is ⛔ never edited.

import { sql } from 'drizzle-orm';
import { index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, ClaimNomineeFindingId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const CLAIM_NOMINEE_FINDING_KINDS = ['member_found_innocent', 'nominee_disqualified'] as const;
export type ClaimNomineeFindingKind = (typeof CLAIM_NOMINEE_FINDING_KINDS)[number];

export const claimNomineeFindings = pgTable(
  'claim_nominee_findings',
  {
    // Supplied by the finding's producer (6-22) — ⛔ no default.
    findingId: uuid('finding_id').primaryKey().$type<ClaimNomineeFindingId>(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    kind: text('kind').notNull().$type<ClaimNomineeFindingKind>(),
    // Set iff kind = 'nominee_disqualified'.
    rank: smallint('rank'),
    recordedByActorId: text('recorded_by_actor_id').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_nominee_findings_pariwar_id_idx').on(t.pariwarId),
    index('claim_nominee_findings_claim_case_id_idx').on(t.claimCaseId),
    uniqueIndex('claim_nominee_findings_one_innocence_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`kind = 'member_found_innocent'`),
    uniqueIndex('claim_nominee_findings_one_disqualification_per_rank_uq')
      .on(t.claimCaseId, t.rank)
      .where(sql`kind = 'nominee_disqualified'`),
  ],
);

export type ClaimNomineeFindingRow = typeof claimNomineeFindings.$inferSelect;

// `claim_nominee_findings` — the INVESTIGATION FINDINGS Story 6.20 consumes as INPUT (Story 6.20,
// Task 1; AC2's release route, D17(c)'s disqualified primary).
//
// ⭐ THE MEMBER FINDINGS' PRODUCER IS STORY 6.22 (`2026-11-01-438`): the District Admin's finding on a
// flagged claim (`claim/fraud-investigation-persist.ts` `recordFraudFinding`, through the writers in
// `claim/nominee-lock.ts`). The DISQUALIFICATION producer is row `6-22c` and is ⛔ built — until it
// lands `nominee_disqualified` has ⛔ production writer (`2026-09-21-241` §6):
//   · `member_found_innocent` — `-238` cl.1: a claim filed against a LIVING member, the investigation
//     finds the member innocent ⇒ every death lock that claim created is RELEASED (6.20 AC2, 6.38).
//   · `member_found_guilty` — `-238` cl.4 (Story 6.22, migration 0196): the member took part. It
//     releases ⛔ lock (the leaf reads the innocent kind only — a DECLARED narrowing pending the
//     Panel's Q1, `-438` item 6). Termination and the ban are row `6-22d`'s.
//   · `nominee_disqualified` — `-240` cl.4: one of two nominees is involved in a fraud ⇒ the other is
//     paid the whole amount. The effective accessor removes the disqualified rank and RE-RANKS the
//     survivor to rank 1 at 100% (D17(c)). ⛔ Never a District Admin determination mark.
// At most ONE member finding per claim, of EITHER kind (0196 — `MEMBER_FINDING_UNIQUE_PREDICATE`).
//
// ⛔ No PII: ids, a bounded kind, a rank, a snapshotted STAFF display name. Append-only (SELECT +
// INSERT); a finding is ⛔ never edited.

import { sql } from 'drizzle-orm';
import { index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, ClaimNomineeFindingId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const CLAIM_NOMINEE_FINDING_KINDS = ['member_found_innocent', 'member_found_guilty', 'nominee_disqualified'] as const;
export type ClaimNomineeFindingKind = (typeof CLAIM_NOMINEE_FINDING_KINDS)[number];

/**
 * The partial unique index's predicate — ONE member finding per claim, innocent OR guilty (0196; N2). Raw and
 * UNQUALIFIED so Postgres infers the index from a writer's `onConflictDoNothing({ target, where })`; spelled byte for
 * byte as the migration's `WHERE`. ⛔ Restate it elsewhere — the member-finding writers import this.
 */
export const MEMBER_FINDING_UNIQUE_PREDICATE = sql`kind IN ('member_found_innocent', 'member_found_guilty')`;

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
    // Set iff kind = 'nominee_disqualified' (the 0196 CHECK keeps `IS NOT NULL` on that arm).
    rank: smallint('rank'),
    recordedByActorId: text('recorded_by_actor_id').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_nominee_findings_pariwar_id_idx').on(t.pariwarId),
    index('claim_nominee_findings_claim_case_id_idx').on(t.claimCaseId),
    uniqueIndex('claim_nominee_findings_one_member_finding_per_claim_uq')
      .on(t.claimCaseId)
      .where(MEMBER_FINDING_UNIQUE_PREDICATE),
    uniqueIndex('claim_nominee_findings_one_disqualification_per_rank_uq')
      .on(t.claimCaseId, t.rank)
      .where(sql`kind = 'nominee_disqualified'`),
  ],
);

export type ClaimNomineeFindingRow = typeof claimNomineeFindings.$inferSelect;

// `claim_appeal_panel_votes` — the per-vote Stage-2 appeal provenance store (Story 6.16, Task 1; D-B).
//
// Mirrors `claim_r9_votes` (Story 6.14) MINUS the clause-version snapshot — an appeal panel has no clause.
// One row per individual panelist vote. A panelist may REVISE their live vote until finalize: the revision
// atomically supersedes the prior live row (`superseded_at = now()`) and inserts a fresh one with
// `supersedes_vote_id` pointing back — the transcript keeps BOTH, the tally counts only the LIVE row. One
// LIVE vote per panelist per session (the partial-unique below).
//
// ── PII discipline (AC3/AC10) ───────────────────────────────────────────────────────────────────
//   · rationale_ciphertext — arbitrary trustee free-text → Tier-1 envelope ciphertext (`piiColumn(1,
//     'appeal_vote')`). REQUIRED (NOT NULL) — rationale is mandatory for EVERY vote (AC3). Decrypt only AFTER
//     authorization at the route. NO index (never a filter dimension).
//   · voter_display — controlled staff-attribution DISPLAY string (R5), plaintext, a decision-time SNAPSHOT.
//   · session_id / claim_case_id / pariwar_id / voter_actor_id / vote / cast_at → NON-PII.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_r9_votes`). RLS in policies/claim-appeal-panel-votes-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { appealPanelVoteEnum } from '../claim/appeal.js';
import { piiColumn } from '../encryption/column.js';
import type { AppealPanelSessionId, AppealPanelVoteId, ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';
import { claimAppealPanelSessions } from './claim_appeal_panel_sessions.js';

export const claimAppealPanelVotes = pgTable(
  'claim_appeal_panel_votes',
  {
    // Per-vote id (the addressable unit). Branded AppealPanelVoteId.
    voteId: uuid('vote_id').defaultRandom().primaryKey().$type<AppealPanelVoteId>(),

    // The session this vote belongs to (FK → sessions; branded AppealPanelSessionId). ON DELETE CASCADE.
    sessionId: uuid('session_id')
      .notNull()
      .$type<AppealPanelSessionId>()
      .references(() => claimAppealPanelSessions.sessionId, { onDelete: 'cascade' }),

    // The claim (denormalized for the votes-by-trustee scan + a defense-in-depth FK; branded ClaimId).
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The voting panelist (an actor id, not a name → non-PII). MUST be a member of the session's immutable
    // panel_actor_ids — enforced in the write path (AC3), not the column. The query/join key.
    voterActorId: text('voter_actor_id').notNull(),
    voterDisplay: text('voter_display').notNull(),

    // The vote (reverse | deny).
    vote: appealPanelVoteEnum('vote').notNull(),

    // ── PII — Tier-1 envelope ciphertext ── The brief per-vote rationale free-text. REQUIRED for EVERY vote
    //    (AC3) — NOT NULL. NO index (never a filter).
    rationaleCiphertext: piiColumn(1, 'appeal_vote')('rationale_ciphertext').notNull(),

    castAt: timestamp('cast_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The prior live vote this one superseded on a revision (null on a first vote). Self-FK.
    supersedesVoteId: uuid('supersedes_vote_id')
      .$type<AppealPanelVoteId>()
      .references((): AnyPgColumn => claimAppealPanelVotes.voteId),

    // NULL = the LIVE/current vote for this panelist in this session (the partial-unique keys off this).
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_appeal_panel_votes_pariwar_id_idx').on(t.pariwarId),
    // The per-session live-votes read (the panel model + the finalize tally).
    index('claim_appeal_panel_votes_session_id_idx').on(t.sessionId),
    // The votes-by-trustee scan — actor + Pariwar, time-ordered.
    index('claim_appeal_panel_votes_voter_actor_id_idx').on(t.pariwarId, t.voterActorId, t.castAt),
    // At most ONE live vote per panelist per session (the revise atomic-supersession backstop).
    uniqueIndex('claim_appeal_panel_votes_one_live_per_voter_uq')
      .on(t.sessionId, t.voterActorId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimAppealPanelVoteRow = typeof claimAppealPanelVotes.$inferSelect;
export type ClaimAppealPanelVoteInsert = typeof claimAppealPanelVotes.$inferInsert;

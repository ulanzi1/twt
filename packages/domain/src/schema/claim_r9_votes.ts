// `claim_r9_votes` — the per-vote R9 provenance store (Story 6.14, Task 2; D-D).
//
// One row per individual panelist vote (the epic's "the audit trail shows each individual vote separately").
// A panelist may REVISE their live vote until finalize: the revision atomically supersedes the prior live
// row (`superseded_at = now()`) and inserts a fresh one with `supersedes_vote_id` pointing back — the
// transcript keeps BOTH, the tally counts only the LIVE (non-superseded) row. One LIVE vote per panelist per
// session (the partial-unique below). Each vote copies the session's `clause_version_id` snapshot (the
// epic's "rule-version snapshot persists with the vote").
//
// ── PII discipline (AC3/AC10) ─────────────────────────────────────────────────────────────────
//   · rationale_ciphertext — arbitrary trustee free-text (can reference member facts) → Tier-1 envelope
//     ciphertext (`piiColumn(1, 'r9_vote')`). REQUIRED (NOT NULL) — rationale is mandatory for EVERY vote
//     (AC3). Encrypt-before-insert in the route; the accessor returns ciphertext AS STORED; decrypt only
//     AFTER authorization at the route, with the decrypt-FAILURE-distinct sentinel (never blank-collapsed —
//     the 6.13 review lesson). NO index on this column (never a filter/search dimension).
//   · voter_display — controlled staff-attribution DISPLAY string (R5), plaintext, a decision-time SNAPSHOT.
//   · session_id / claim_case_id / pariwar_id / voter_actor_id / vote / clause_version_id / cast_at → NON-PII.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_r9_voting_sessions`). RLS in policies/claim-r9-votes-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { r9VoteEnum } from '../claim/r9-voting.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimId, ClauseVersionId, PariwarId, R9VoteId, R9VotingSessionId } from '../ids/index.js';
import { claims } from './claims.js';
import { claimR9VotingSessions } from './claim_r9_voting_sessions.js';
import { clauseVersions } from './clause_versions.js';

export const claimR9Votes = pgTable(
  'claim_r9_votes',
  {
    // Per-vote id (the addressable unit). Branded R9VoteId.
    voteId: uuid('vote_id').defaultRandom().primaryKey().$type<R9VoteId>(),

    // The session this vote belongs to (FK → sessions; branded R9VotingSessionId). ON DELETE CASCADE.
    sessionId: uuid('session_id')
      .notNull()
      .$type<R9VotingSessionId>()
      .references(() => claimR9VotingSessions.sessionId, { onDelete: 'cascade' }),

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
    // The cast-time SNAPSHOT of the voter's users.display_name (R5). REQUIRED — resolved server-side FIRST,
    // fail-closed on absence (no fallback). Plaintext controlled staff-attribution personal data.
    voterDisplay: text('voter_display').notNull(),

    // The vote (approve | deny).
    vote: r9VoteEnum('vote').notNull(),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED; decrypt at the route
    //    AFTER authorization only) ── The brief per-vote rationale free-text. REQUIRED for EVERY vote (AC3) —
    //    NOT NULL is the backstop behind the contract + write-path non-empty checks. NO index (never a filter).
    rationaleCiphertext: piiColumn(1, 'r9_vote')('rationale_ciphertext').notNull(),

    // The per-vote rule-version snapshot COPIED from the session at cast time (the epic's "rule-version
    // snapshot persists with the vote"). Branded ClauseVersionId. FK → clause_versions (added via migration
    // 0066, code review 2026-07-14 — 0063 already applied).
    clauseVersionId: uuid('clause_version_id')
      .notNull()
      .$type<ClauseVersionId>()
      .references(() => clauseVersions.clauseVersionId),

    castAt: timestamp('cast_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The prior live vote this one superseded on a revision (null on a first vote). Self-FK — the
    // AnyPgColumn return annotation breaks the circular type inference on a self-reference.
    supersedesVoteId: uuid('supersedes_vote_id')
      .$type<R9VoteId>()
      .references((): AnyPgColumn => claimR9Votes.voteId),

    // NULL = the LIVE/current vote for this panelist in this session (the partial-unique keys off this). A
    // superseded (revised) row stays in the transcript for audit.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_r9_votes_pariwar_id_idx').on(t.pariwarId),
    // The per-session live-votes read (the panel model + the finalize tally).
    index('claim_r9_votes_session_id_idx').on(t.sessionId),
    // The votes-by-trustee scan (AC8) — actor + Pariwar, time-ordered.
    index('claim_r9_votes_voter_actor_id_idx').on(t.pariwarId, t.voterActorId, t.castAt),
    // AC3/#5 — at most ONE live vote per panelist per session (the revise atomic-supersession backstop).
    uniqueIndex('claim_r9_votes_one_live_per_voter_uq')
      .on(t.sessionId, t.voterActorId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimR9VoteRow = typeof claimR9Votes.$inferSelect;
export type ClaimR9VoteInsert = typeof claimR9Votes.$inferInsert;

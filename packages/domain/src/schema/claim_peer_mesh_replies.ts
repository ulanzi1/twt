// `claim_peer_mesh_replies` + `claim_peer_mesh_reply_answers` — the neighbours' answers (Story 6.27a, migration 0156; PM7 (a)).
//
// · A REPLY is ONE per ping: the questionnaire version pinned at its FIRST save, `started_at`, and `submitted_at`
//   (forward-only — 0156's trigger refuses clearing or moving it). ⛔ No PII (ids only).
// · An ANSWER row is APPEND-ONLY: the LIVE answer is `superseded_at IS NULL` (one per question per reply — a partial
//   UNIQUE); an edit stamps the old row FIRST, then inserts the new live row. Plaintext `value_codes` for a non-sensitive
//   question, a Tier-1 `value_ciphertext` (`PEER_MESH_ANSWER_FIELD_CLASS`) for a sensitive one (the date, the cause, the
//   illness); the date's THREE keyed window indexes (D − 1, D, D + 1) so 6.27b's warning compares WITHOUT a decrypt.
//   *"I don't know the date"* = `value_codes = ['unknown']` (⛔ no ciphertext, ⛔ no indexes). The `answer_id` is 6.27b's
//   warning SUBJECT. 0156's trigger admits ONLY an insert / a supersede while the reply is open AND the claim is in the
//   answer window, and the erasure arm (0143's form).
// RLS in `policies/claim-peer-mesh-replies-rls.ts`.

import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshAnswerId, PeerMeshPingId, PeerMeshReplyId, PeerMeshSelectionId } from '../ids/index.js';

/** Story 6.27a — the answers' Tier-1 field class. ⚠ By-value twins: `member/anonymize.ts`, `apps/api/src/context.ts`. */
export const PEER_MESH_ANSWER_FIELD_CLASS = 'peer_mesh_answer';

/** How an answer was saved. ⚠ LOCKSTEP with 0156's `saved_via` CHECK. */
export const PEER_MESH_ANSWER_SAVED_VIA = ['member_app', 'helpline'] as const;
export type PeerMeshAnswerSavedVia = (typeof PEER_MESH_ANSWER_SAVED_VIA)[number];

export const claimPeerMeshReplies = pgTable(
  'claim_peer_mesh_replies',
  {
    replyId: uuid('reply_id').defaultRandom().primaryKey().$type<PeerMeshReplyId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    selectionId: uuid('selection_id').notNull().$type<PeerMeshSelectionId>(),
    pingId: uuid('ping_id').notNull().$type<PeerMeshPingId>(),
    /** The neighbour (the ping's member). */
    responderMemberId: uuid('responder_member_id').notNull().$type<MemberId>(),
    /** `<kind>.v<n>` — pinned at the first save (PM23 (c)). */
    questionnaireVersionId: text('questionnaire_version_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** Set ONCE by Submit; ⛔ never cleared (0156's trigger). */
    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    unique('claim_peer_mesh_replies_ping_uq').on(t.pingId),
    unique('claim_peer_mesh_replies_pariwar_reply_uq').on(t.pariwarId, t.replyId),
    index('claim_peer_mesh_replies_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export const claimPeerMeshReplyAnswers = pgTable(
  'claim_peer_mesh_reply_answers',
  {
    answerId: uuid('answer_id').defaultRandom().primaryKey().$type<PeerMeshAnswerId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    replyId: uuid('reply_id').notNull().$type<PeerMeshReplyId>(),
    questionKey: text('question_key').notNull(),
    /** Plaintext option codes — a NON-sensitive question, or *"I don't know the date"*. */
    valueCodes: text('value_codes').array(),
    /** A sensitive answer (the date, the cause's / the illness's codes as JSON), Tier-1. ⛔ Never in an event, log or audit. */
    valueCiphertext: piiColumn(1, PEER_MESH_ANSWER_FIELD_CLASS)('value_ciphertext'),
    /** The date question ONLY: the keyed indexes of D − 1, D, D + 1 (`DEATH_DATE_INDEX_FIELD_CLASS`). */
    deathDateWindowIndexes: text('death_date_window_indexes').array(),
    savedVia: text('saved_via').notNull().$type<PeerMeshAnswerSavedVia>(),
    /** The neighbour (app) or the operator (helpline). */
    savedByActorId: text('saved_by_actor_id').notNull(),
    savedAt: timestamp('saved_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    uniqueIndex('claim_peer_mesh_reply_answers_live_uq').on(t.pariwarId, t.replyId, t.questionKey).where(sql`superseded_at IS NULL`),
    index('claim_peer_mesh_reply_answers_live_reply_idx').on(t.pariwarId, t.replyId).where(sql`superseded_at IS NULL`),
    index('claim_peer_mesh_reply_answers_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export type ClaimPeerMeshReplyRow = typeof claimPeerMeshReplies.$inferSelect;
export type ClaimPeerMeshReplyAnswerRow = typeof claimPeerMeshReplyAnswers.$inferSelect;

// `claim_peer_mesh_pings` — the delivery-neutral ping-intent record (Story 6.6, Task 3; AC3).
//
// ONE row per selected member per selection (the `(selection_id, member_id)` UNIQUE is
// the idempotency anchor). This is the CONCRETE ARTIFACT the later dispatch-composition
// story reads to know WHO to actually send to — "recorded" means a persisted row, not an
// in-memory object the job discards.
//
// ── Decision D1 — delivery-neutral, NOT dispatched (6.6) ──────────────────────
// 6.6 owns "an intent was CONSTRUCTED for member X" — NOT delivery state. 6.6 added NO dispatch-status
// columns; those were the dispatch-composition story's to add via its OWN migration. ⭐ Story 6.27a (PM18,
// re-pin 2026-10-12): 6.6's *"There is still NO live `dispatch()` caller anywhere"* is STALE —
// `contribution-notify.ts` and `claim-correction-reminders.ts` call it. And these texts do ⛔ not go through
// `dispatch()` at all: 6.27c sends ONE claim SMS per ping through the claim send core (PM2).
// ⭐ Migration 0156 (Story 6.27a PM4 [a]) adds the DELIVERY RECORD on THIS row — `send_outcome IS NULL` means
// "⛔ not yet begun"; once-ever is a compare-and-set from NULL (6.27c's writers); a finished outcome is frozen by
// 0156's trigger; `twt_app` may UPDATE ONLY these columns (REVOKE + column GRANT — 6.6's identity columns are
// ⛔ never rewritten). The `detail` grammar is 6.27c's (here only the length).
//
// ── Decision D2 — no AlertCategory binding ────────────────────────────────────
// `message_key` is a plain VERSIONED copy-template key, NOT a value from the frozen 9-value
// `AlertCategory` union (which 6.6 does not edit). The dispatch-composition story maps
// `message_key` → whatever category it lands on.
//
// TENANT-ISOLATED (mirrors the selections table). RLS in the SAME policy file
// (policies/claim-peer-mesh-selections-rls.ts). NO PII: opaque member id + a copy-template
// key + a timestamp — no message body, no member contact info.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, PeerMeshPingId, PeerMeshSelectionId } from '../ids/index.js';
import { claimPeerMeshSelections } from './claim_peer_mesh_selections.js';

/** The default versioned copy-template key for a peer-mesh verification-request ping. */
export const PEER_MESH_MESSAGE_KEY = 'peer_mesh_verification_request_v1';

/**
 * Story 6.27a (PM4) — the send outcomes a ping's text may record: 0138's vocabulary EXCEPT `recorded` (meaningless for a
 * text). ⚠ LOCKSTEP with 0156's `claim_peer_mesh_pings_send_outcome_check`.
 */
export const PEER_MESH_SEND_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
  'error',
  'skipped_superseded',
] as const;
export type PeerMeshSendOutcome = (typeof PEER_MESH_SEND_OUTCOMES)[number];

/** Story 6.27a (PM22) — why the text's language was chosen. ⚠ LOCKSTEP with 0156's `locale_source` CHECK. */
export const PEER_MESH_LOCALE_SOURCES = ['pariwar_default'] as const;
export type PeerMeshLocaleSource = (typeof PEER_MESH_LOCALE_SOURCES)[number];

export const claimPeerMeshPings = pgTable(
  'claim_peer_mesh_pings',
  {
    // Per-row ping-intent id (server-side gen_random_uuid()). Branded PeerMeshPingId.
    pingId: uuid('ping_id').defaultRandom().primaryKey().$type<PeerMeshPingId>(),

    // The selection this intent belongs to. FK → claim_peer_mesh_selections (cascade:
    // deleting a selection sweeps its intents).
    selectionId: uuid('selection_id')
      .notNull()
      .$type<PeerMeshSelectionId>()
      .references(() => claimPeerMeshSelections.selectionId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded) — same construct as the
    // selections table so a cross-tenant reader sees nothing on EITHER table.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The ping target (a selected member). Opaque id — non-PII.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // A versioned copy-template key (NOT an AlertCategory — Decision D2). Default set here
    // so the bulk-insert accessor need not repeat it.
    messageKey: text('message_key').notNull().default(PEER_MESH_MESSAGE_KEY),

    constructedAt: timestamp('constructed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // ── Story 6.27a (migration 0156, PM4 [a]) — the delivery record; written ONLY by 6.27c's writers ──
    /** NULL = ⛔ not yet begun (the member was ⛔ never texted). */
    sendOutcome: text('send_outcome').$type<PeerMeshSendOutcome>(),
    /** 0 until begin; ≥ 1 after (`(send_outcome IS NULL) = (attempt_count = 0)`). */
    attemptCount: integer('attempt_count').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    claimedByJob: text('claimed_by_job'),
    /** The give-up's anchor — moves only forward (0156's trigger). */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }),
    parkedAt: timestamp('parked_at', { withTimezone: true, mode: 'date' }),
    /** ≤ 200 characters; the grammar is 6.27c's. ⛔ Never PII, ⛔ never the link code. */
    detail: text('detail'),
    firstDetail: text('first_detail'),
    providerMessageId: text('provider_message_id'),
    /** A KEYED hash of the number texted. ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    sendUpdatedAt: timestamp('send_updated_at', { withTimezone: true, mode: 'date' }),
    /** Why the text's language was chosen (PM22). */
    localeSource: text('locale_source').$type<PeerMeshLocaleSource>(),
    /** The 12-character base62 code in the text's link (PM21 (a)) — written ONCE; ⛔ never logged. */
    linkCode: text('link_code').unique('claim_peer_mesh_pings_link_code_uq'),
  },
  (t) => [
    // One intent per member per selection — the idempotency anchor (a re-run of the select
    // job inserts nothing new; still exactly 5 rows, never 10).
    unique('claim_peer_mesh_pings_selection_member_uq').on(t.selectionId, t.memberId),
    unique('claim_peer_mesh_pings_owner_uq').on(t.pariwarId, t.pingId, t.selectionId, t.memberId),
    foreignKey({ name: 'claim_peer_mesh_pings_selection_owner_fk', columns: [t.pariwarId, t.selectionId], foreignColumns: [claimPeerMeshSelections.pariwarId, claimPeerMeshSelections.selectionId] }).onDelete('cascade'),
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_peer_mesh_pings_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type ClaimPeerMeshPingRow = typeof claimPeerMeshPings.$inferSelect;
export type ClaimPeerMeshPingInsert = typeof claimPeerMeshPings.$inferInsert;

// `claim_peer_mesh_pings` — the delivery-neutral ping-intent record (Story 6.6, Task 3; AC3).
//
// ONE row per selected member per selection (the `(selection_id, member_id)` UNIQUE is
// the idempotency anchor). This is the CONCRETE ARTIFACT the later dispatch-composition
// story reads to know WHO to actually send to — "recorded" means a persisted row, not an
// in-memory object the job discards.
//
// ── Decision D1 — delivery-neutral, NOT dispatched ────────────────────────────
// 6.6 owns "an intent was CONSTRUCTED for member X" — NOT delivery state. There is still
// NO live `dispatch()` caller anywhere (the frozen @twt/channels surface must not change),
// so this table intentionally has NO dispatch-status columns (`dispatched_at`, `channel`,
// delivery-result, …). Those are the dispatch-composition story's to add via its OWN
// migration when it wires live multi-target fan-out.
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

import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, PeerMeshPingId, PeerMeshSelectionId } from '../ids/index.js';
import { claimPeerMeshSelections } from './claim_peer_mesh_selections.js';

/** The default versioned copy-template key for a peer-mesh verification-request ping. */
export const PEER_MESH_MESSAGE_KEY = 'peer_mesh_verification_request_v1';

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
  },
  (t) => [
    // One intent per member per selection — the idempotency anchor (a re-run of the select
    // job inserts nothing new; still exactly 5 rows, never 10).
    unique('claim_peer_mesh_pings_selection_member_uq').on(t.selectionId, t.memberId),
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_peer_mesh_pings_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type ClaimPeerMeshPingRow = typeof claimPeerMeshPings.$inferSelect;
export type ClaimPeerMeshPingInsert = typeof claimPeerMeshPings.$inferInsert;

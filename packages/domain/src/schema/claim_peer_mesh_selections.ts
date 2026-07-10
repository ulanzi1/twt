// `claim_peer_mesh_selections` — the deterministic peer-mesh selection record (Story 6.6, Task 3).
//
// ONE row per claim (the `claim_case_id` UNIQUE is the idempotency anchor). It is the
// AUDIT-REPLAY SOURCE for AC2/AC5: it persists the exact candidate SNAPSHOT captured at
// selection time + the ordered output + the metric identity, so a later replay re-runs
// the pure `selectPeerMesh` on the PERSISTED snapshot and gets a BYTE-IDENTICAL result —
// never depending on live (mutable) membership.
//
// ── Immutable selection, mutable disposition ──────────────────────────────────
// The snapshot + `selected_member_ids` + `metric_id`/`metric_version` are IMMUTABLE once
// written (the audit record — rewriting them would corrupt replay). ONLY `outcome` and
// `response_window_expires_at` are mutable: the AR-61 window-expiry job sets the outcome,
// and an operator may extend the window / skip the mesh. Those are plain non-`state`
// column writes (NOT an event-sourced cache), so they need no projector guard — unlike
// `claims.current_state`, whose write-rejection trigger stays the sole authority for the
// claim's lifecycle state (this table never touches it).
//
// TENANT-ISOLATED (mirrors `claims` / `claim_documents`). RLS in
// policies/claim-peer-mesh-selections-rls.ts. NO PII: opaque member ids + plaintext
// district + created_at only (Dev Notes "PII posture").
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ClaimId, MemberId, PariwarId, PeerMeshSelectionId } from '../ids/index.js';
import { claims } from './claims.js';

/**
 * The disposition of a peer-mesh selection (AC6). `pending` on creation; the window-expiry
 * job resolves it to `sufficient` (≥3 responses) or `insufficient_responses_fallback`
 * (<3 → ground-inspection-primary); an operator may `skipped` it with a documented reason.
 * NEVER an auto-deny — insufficient response is a SIGNAL, not an adjudication (PRD §4.6).
 */
export const PEER_MESH_OUTCOMES = [
  'pending',
  'sufficient',
  'insufficient_responses_fallback',
  'skipped',
] as const;

/** pgEnum (`CREATE TYPE peer_mesh_outcome`) derived from the one tuple. */
export const peerMeshOutcomeEnum = pgEnum('peer_mesh_outcome', PEER_MESH_OUTCOMES);

/** The peer-mesh outcome literal union — derived from the same tuple (no drift). */
export type PeerMeshOutcome = (typeof PEER_MESH_OUTCOMES)[number];

/**
 * One persisted candidate-snapshot row (the audit-replay input). Non-PII: opaque member
 * id + plaintext district + `created_at` as an ISO-8601 string (jsonb has no Date type —
 * the accessor reconstructs a `Date` for the pure engine on replay).
 */
export interface PeerMeshCandidateSnapshotRow {
  readonly memberId: string;
  readonly district: string | null;
  readonly createdAt: string;
}

export const claimPeerMeshSelections = pgTable(
  'claim_peer_mesh_selections',
  {
    // Per-row selection id (server-side gen_random_uuid()). Branded PeerMeshSelectionId.
    selectionId: uuid('selection_id').defaultRandom().primaryKey().$type<PeerMeshSelectionId>(),

    // The claim this selection is for == the events_log stream_id. FK → claims (cascade
    // for cleanup). UNIQUE below (one selection per claim — the idempotency anchor).
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased this claim is filed against (excluded from their own mesh).
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The deceased's comparator reference point AT SELECTION TIME (district + createdAt) —
    // persisted alongside `candidateSnapshot` so replay NEVER re-derives it live (AC2/AC5:
    // a later `member_postings` row for the deceased must not change a past selection's
    // replay result). `deceasedDistrict` mirrors candidate district nullability.
    deceasedDistrict: text('deceased_district'),
    deceasedCreatedAt: timestamp('deceased_created_at', { withTimezone: true, mode: 'date' }).notNull(),

    // The metric identity the selection ran under — persisted so replay resolves the SAME
    // ranking (a later metric bump does not retroactively change this selection's result).
    metricId: text('metric_id').notNull(),
    metricVersion: integer('metric_version').notNull(),

    // The ORDERED output (≤5 member ids). Order is load-bearing (the total-order ranking).
    selectedMemberIds: uuid('selected_member_ids').array().notNull().$type<MemberId[]>(),

    // The FROZEN candidate set (the audit-replay source). IMMUTABLE once written.
    candidateSnapshot: jsonb('candidate_snapshot').notNull().$type<PeerMeshCandidateSnapshotRow[]>(),

    // When the response window closes (AR-61). MUTABLE (an operator may extend it).
    responseWindowExpiresAt: timestamp('response_window_expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),

    // The disposition (AC6). MUTABLE (window-expiry job / operator skip). Default `pending`.
    outcome: peerMeshOutcomeEnum('outcome').notNull().default('pending'),

    // Free-text operator reason when `outcome = 'skipped'` (documented-reason affordance,
    // AC6). NULL otherwise. Non-PII (an operational note, not member data).
    skipReason: text('skip_reason'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // One selection per claim — the idempotency anchor (a re-run finds the existing row).
    unique('claim_peer_mesh_selections_claim_case_id_uq').on(t.claimCaseId),
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_peer_mesh_selections_pariwar_id_idx').on(t.pariwarId),
    // "5 nearest" is a hard invariant (AC1/AC3) — bound it at the schema layer, not just in
    // the event-payload Zod schema. 0 is legal (the zero-candidate `skipped` disposition
    // persists an empty selection — see peer-mesh-persist.ts).
    check('claim_peer_mesh_selections_selected_member_ids_max5', sql`cardinality(${t.selectedMemberIds}) <= 5`),
  ],
);

export type ClaimPeerMeshSelectionRow = typeof claimPeerMeshSelections.$inferSelect;
export type ClaimPeerMeshSelectionInsert = typeof claimPeerMeshSelections.$inferInsert;

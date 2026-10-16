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
// district + created_at only (Dev Notes "PII posture"); Story 6.36 adds workplace ids (Tier 3) and booleans —
// ⛔ never a date of death.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import {
  boolean,
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

import type { ClaimId, MemberId, PariwarId, PeerMeshSelectionId, WorkplaceId } from '../ids/index.js';
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
 * One persisted `district_cohort_v1` candidate-snapshot row (the audit-replay input). Non-PII: opaque member
 * id + plaintext district + `created_at` as an ISO-8601 string (jsonb has no Date type —
 * the accessor reconstructs a `Date` for the pure engine on replay).
 */
export interface PeerMeshDistrictSnapshotRow {
  readonly memberId: string;
  readonly district: string | null;
  readonly createdAt: string;
}

/**
 * Story 6.36 (AC2; I7) — where a `workplace_named_v1` candidate came from. ⚠ LOCKSTEP with
 * `PeerMeshCandidateGroup` (`claim/peer-mesh-metric-registry.ts`).
 */
export type PeerMeshSnapshotGroup = 'workplace_previous' | 'workplace_current' | 'named';

/**
 * Story 6.36 (AC2; I7) — one persisted `workplace_named_v1` candidate-snapshot row. `settled` is FROZEN here (the
 * run's earliest `created_at` was 90 days or more before the cut) so a replay rebuilds the ranking from the PERSISTED
 * snapshot alone — ⛔ a live re-read of the postings.
 */
export interface PeerMeshGroupedSnapshotRow {
  readonly memberId: string;
  readonly group: PeerMeshSnapshotGroup;
  readonly settled: boolean;
}

/** One persisted candidate-snapshot row — its shape is the selection's `metric_id`'s (6.6's or 6.36's). */
export type PeerMeshCandidateSnapshotRow = PeerMeshDistrictSnapshotRow | PeerMeshGroupedSnapshotRow;

/**
 * Story 6.36 (SW24) — where the selected people came from. ⚠ LOCKSTEP with 0163's `…_source_check` on BOTH tables.
 * NULL for a `district_cohort_v1` selection and for a `workplace_named_v1` selection that chose nobody.
 */
export const PEER_MESH_SOURCES = ['workplace', 'named_by_member'] as const;
export type PeerMeshSource = (typeof PEER_MESH_SOURCES)[number];

/** Story 6.36 (AC1) — the stored ranking is the winning group's FIRST this-many (0163's `…_ranked_max500`). */
export const PEER_MESH_RANKED_MAX = 500;

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

    // ── Story 6.36 (0163; `2026-10-14-330` SW20–SW24, `-331` SC1 A) — the `workplace_named_v1` record ──────────────
    // ⚠ For `workplace_named_v1` the 6.6 columns `deceased_district` / `deceased_created_at` are still written (the
    // latter is NOT NULL) from `getPeerMeshDeceasedAttributes`, and are read by NOTHING in the grouped metric or its
    // replay. Filled for `workplace_named_v1` (0163's scoped CHECKs); NULL on every `district_cohort_v1` row (⛔ backfill).
    // IMMUTABLE by grant (0163 narrows `twt_app`'s UPDATE to `outcome` / `response_window_expires_at` / `skip_reason`).
    /** Where the selected came from; NULL when nobody was chosen (a CHECK). */
    source: text('source').$type<PeerMeshSource>(),
    /** Whether the previous workplace counted (the current run began < 90 days before the filing date — SW21). */
    previousWorkplaceCounted: boolean('previous_workplace_counted'),
    /** The staff line (SW20, `-331` SC1 A): the workplace or the named people changed in the 90 days before the filing. */
    recentChangeBeforeFiling: boolean('recent_change_before_filing'),
    /** The deceased's current workplace as of the cut (row 6-32 reads it). */
    deceasedWorkplaceId: uuid('deceased_workplace_id').$type<WorkplaceId>(),
    /**
     * The deceased's previous workplace as of the cut — stored whenever one exists, WHETHER OR NOT it counted (row 6-32
     * reads it); `previous_workplace_counted` says whether its people were in the group.
     */
    deceasedPreviousWorkplaceId: uuid('deceased_previous_workplace_id').$type<WorkplaceId>(),
    /** The winning group's ranking, truncated to {@link PEER_MESH_RANKED_MAX}; `selectedMemberIds` is its prefix (a trigger). */
    rankedMemberIds: uuid('ranked_member_ids').array().$type<MemberId[]>(),
    /**
     * `2026-10-16-340` call 1 — the ANCHOR claim: the claim whose filing `-339`'s cut is (the death's first filing not
     * lifted by an innocence finding; this claim itself when it is the first). Its id SALTS the ranking, so a refile ranks
     * the same pool the same way; stored so a replay ⛔ re-derives it from live claims (I7). Required for
     * `workplace_named_v1` (the "filled" CHECK); NULL on a legacy row. ⛔ FK and ⛔ check that it names this death — one
     * writer (the select job) sets it from `resolvePeerMeshFilingCut`, a READ COMMITTED read of the death's claims (⛔
     * locked: only the claim being selected for is); the stored value, ⛔ a re-derivation, is what replay uses.
     */
    anchorClaimCaseId: uuid('anchor_claim_case_id').$type<ClaimId>(),
  },
  (t) => [
    // One selection per claim — the idempotency anchor (a re-run finds the existing row).
    unique('claim_peer_mesh_selections_claim_case_id_uq').on(t.claimCaseId),
    unique('claim_peer_mesh_selections_tenant_selection_uq').on(t.pariwarId, t.selectionId),
    unique('claim_peer_mesh_selections_tenant_selection_claim_uq').on(t.pariwarId, t.selectionId, t.claimCaseId),
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_peer_mesh_selections_pariwar_id_idx').on(t.pariwarId),
    // "5 nearest" is a hard invariant (AC1/AC3) — bound it at the schema layer, not just in
    // the event-payload Zod schema. 0 is legal (the zero-candidate `skipped` disposition
    // persists an empty selection — see peer-mesh-persist.ts).
    check('claim_peer_mesh_selections_selected_member_ids_max5', sql`cardinality(${t.selectedMemberIds}) <= 5`),
    // Story 6.36 (0163) — ⚠ the two `workplace_named_v1` CHECKs are SCOPED to the new id (legacy rows stay valid).
    check('claim_peer_mesh_selections_source_check', sql`${t.source} IS NULL OR ${t.source} IN ('workplace', 'named_by_member')`),
    check('claim_peer_mesh_selections_ranked_max500', sql`${t.rankedMemberIds} IS NULL OR cardinality(${t.rankedMemberIds}) <= 500`),
    check(
      'claim_peer_mesh_selections_workplace_named_filled',
      sql`${t.metricId} <> 'workplace_named_v1' OR (${t.rankedMemberIds} IS NOT NULL AND ${t.previousWorkplaceCounted} IS NOT NULL AND ${t.recentChangeBeforeFiling} IS NOT NULL AND ${t.anchorClaimCaseId} IS NOT NULL)`,
    ),
    check(
      'claim_peer_mesh_selections_workplace_named_source',
      sql`${t.metricId} <> 'workplace_named_v1' OR ((${t.source} IS NULL) = (cardinality(${t.selectedMemberIds}) = 0))`,
    ),
  ],
);

export type ClaimPeerMeshSelectionRow = typeof claimPeerMeshSelections.$inferSelect;
export type ClaimPeerMeshSelectionInsert = typeof claimPeerMeshSelections.$inferInsert;

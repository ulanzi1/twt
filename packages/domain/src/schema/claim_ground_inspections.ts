// `claim_ground_inspections` — the ground-inspection ASSIGNMENT record (Story 6.7, Task 3).
//
// ONE row per ASSIGNMENT (D5/D6 — the addressable unit). A claim may hold MANY assignments,
// sequential or parallel, in the SAME or DIFFERENT districts (corroboration / additional
// evidence), so there is NO active-uniqueness of any kind (NOT `(claim_case_id)` and NOT
// `(claim_case_id, district)`): district is an AUTHORIZATION boundary, not an inspection
// identity. ⭐ Story 6.17 adds a NULLABLE `block` beside it and makes the authorization
// DIMENSION a property of the row (null ⇒ district gate, non-null ⇒ block gate) — it adds no
// uniqueness either, for the identical reason. Duplicate/accidental scheduling is controlled by request idempotency + operator
// visibility (Dev Notes "Schedule + reschedule idempotency"), never a DB uniqueness constraint.
//
// Each assignment carries its OWN lifecycle on `status` — a SEPARATE machine from the claim's
// `claims.current_state`. `scheduled` is the sole mutable state; the writers enforce the
// transition matrix under a `SELECT … FOR UPDATE` row lock. Ground inspection NEVER advances
// the claim's primary lifecycle state (it gathers during `verification_in_progress`, like the
// peer mesh); the two `claim.ground_inspection_scheduled` / `_completed` events are identity
// annotations emitted via `claim.projectClaimState` — this table has NO state trigger (`status`
// / `structured_findings` are ordinary tenant-isolated columns, the peer-mesh `outcome` posture).
//
// ── PII discipline (AR-12 / Story 1.5 / 1.16b gate) ───────────────────────────────────
//   · location_ciphertext (exact address/landmark/contact instructions/free-text site detail),
//     family_contact_ciphertext (phone), notes_ciphertext (free-text findings/refusal reason) →
//     Tier-1 envelope ciphertext (`piiColumn(1, 'ground_inspection')`). Encrypt-before-insert in
//     the route; the accessor returns ciphertext AS STORED. NEVER logged / echoed.
//   · district / block / inspection_stage / inspection_site_type / status / refusal_reason /
//     inspector_actor_id / scheduled_at / structured_findings → NON-PII (safe for the console + logs).
//
// TENANT-ISOLATED (mirrors `claims` / `claim_documents` / peer-mesh). RLS in
// policies/claim-ground-inspections-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { type AnyPgColumn, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

/**
 * The assignment lifecycle (D5/D6/AC4a). `scheduled` on creation (the sole mutable state);
 * `completed` (successful, ≥1 photo); `superseded` (a reschedule replaced it — D5); `photo_refused`
 * / `evidence_unavailable` (the AC4a refusal dispositions — NOT a successful completion). Every
 * non-`scheduled` state is TERMINAL/immutable (enforced by the writers under the row lock).
 */
export const GROUND_INSPECTION_STATUSES = [
  'scheduled',
  'completed',
  'superseded',
  'photo_refused',
  'evidence_unavailable',
] as const;
export const groundInspectionStatusEnum = pgEnum('ground_inspection_status', GROUND_INSPECTION_STATUSES);
export type GroundInspectionStatus = (typeof GROUND_INSPECTION_STATUSES)[number];

/** WHY the assignment was opened (D6) — non-PII operational metadata. */
export const GROUND_INSPECTION_STAGES = ['initial', 'corroboration', 'additional_evidence'] as const;
export const groundInspectionStageEnum = pgEnum('ground_inspection_stage', GROUND_INSPECTION_STAGES);
export type GroundInspectionStage = (typeof GROUND_INSPECTION_STAGES)[number];

/** WHAT/WHERE is being inspected (D6) — a SECOND bounded field, distinct from `stage`; non-PII.
 *  `other` REQUIRES a non-null `location_ciphertext` description (enforced in the writer/route). */
export const GROUND_INSPECTION_SITE_TYPES = [
  'family_residence',
  'current_residence',
  'permanent_residence',
  'workplace',
  'school_or_office',
  'incident_location',
  'other',
] as const;
export const groundInspectionSiteTypeEnum = pgEnum(
  'ground_inspection_site_type',
  GROUND_INSPECTION_SITE_TYPES,
);
export type GroundInspectionSiteType = (typeof GROUND_INSPECTION_SITE_TYPES)[number];

/**
 * The v1 CLOSED SET of refusal reasons (AC4a, #12). Paired to the disposition (enforced in the
 * writer): `family_refused_photography` ⇔ `photo_refused`; ALL FIVE others ⇔ `evidence_unavailable`.
 * `other_evidence_unavailable` is the escape hatch but the encrypted explanatory note stays
 * MANDATORY (never a bare "other"). Non-PII bounded reason (distinct from the free-text note).
 */
export const GROUND_INSPECTION_REFUSAL_REASONS = [
  'family_refused_photography',
  'premises_inaccessible',
  'responsible_person_absent',
  'site_no_longer_exists',
  'inspector_safety_risk',
  'other_evidence_unavailable',
] as const;
export const groundInspectionRefusalReasonEnum = pgEnum(
  'ground_inspection_refusal_reason',
  GROUND_INSPECTION_REFUSAL_REASONS,
);
export type GroundInspectionRefusalReason = (typeof GROUND_INSPECTION_REFUSAL_REASONS)[number];

export const claimGroundInspections = pgTable(
  'claim_ground_inspections',
  {
    // Per-assignment id (the addressable unit). Generated app-side by the writer (so the
    // idempotency-key row can bind scoped_key → id BEFORE the assignment insert); defaultRandom
    // is a fallback for bare inserts. Branded GroundInspectionId.
    groundInspectionId: uuid('ground_inspection_id').defaultRandom().primaryKey().$type<GroundInspectionId>(),

    // The claim this assignment is filed against (FK → claims; branded ClaimId == the
    // events_log stream_id). ON DELETE CASCADE mirrors claim_documents / peer-mesh.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The assignment's jurisdiction — the D6 AUTHORIZATION anchor. Structured, non-null,
    // plaintext non-PII (the member_postings.district posture). Supplied at schedule time;
    // the permission gate runs at `dimension: 'district'` against THIS value WHEN `block` IS NULL.
    district: text('district').notNull(),

    // The assignment's BLOCK-level jurisdiction — the Story 6.17 authorization anchor when present
    // (Decision `2026-08-13-104`, D2). Same class as `district`: structured, plaintext, NON-PII,
    // supplied at schedule time, and IMMUTABLE on reschedule (D3 — moving it would mint a
    // replacement in a node the actor was never checked against). ⛔ Compared BYTE-IDENTICALLY —
    // no trimming, no case-folding — because `geo-tree/resolver.ts` made that exact commitment for
    // that exact reason, and a module that case-folded while the tree did not would resolve
    // `Bihar ⊇ patna` but not `Patna ⊇ patna` within one request.
    //
    // ⭐ NULLABLE, AND THE NULLABILITY IS THE DESIGN — not a soft rollout. Two reasons, either
    // sufficient:
    //   (a) PRE-6.17 ROWS CANNOT BE BACKFILLED. A NOT NULL add demands a value for every existing
    //       row and no honest value exists; inventing one is exactly the reconstruction
    //       [[feedback_record_unattested_no_backfill]] forbids. ⛔ Never backfill this column.
    //   (b) THE GATE DIMENSION IS A PROPERTY OF THE ROW. `block == null` ⇒ the assignment
    //       authorizes at `dimension: 'district'`, byte-identically to Story 6.7. `block != null`
    //       ⇒ it authorizes at `dimension: 'block'`, which admits BOTH FR-40 actors: `block_admin`
    //       by exact-node match, and `district_admin` by district→block ancestry through Story
    //       1.18's resolver. An UNCONDITIONAL block gate would revoke `district_admin` in every
    //       Pariwar with no published tree — which, with no writer surface and no code default
    //       geography (ADR-0038), is every Pariwar — i.e. a total outage of the 6.7 surface.
    //
    // ⛔ NO FALLBACK (D6). A block-tagged row in a Pariwar with no resolvable tree DENIES
    // ancestry-based district access. Absence must deny, never widen: a grant-on-absence rule makes
    // the absence of data widen authorization and makes publishing a tree narrow it, inverting
    // ADR-0038's posture (*a wrong tree silently GRANTS authority; an absent one merely denies*).
    block: text('block'),

    // WHY (stage) + WHAT/WHERE (site type) — two separate bounded non-PII fields (D6).
    inspectionStage: groundInspectionStageEnum('inspection_stage').notNull(),
    inspectionSiteType: groundInspectionSiteTypeEnum('inspection_site_type').notNull(),

    // The assigned inspector (an actor id, not a name → non-PII). The evidence-authoring verbs
    // (complete/findings/photos/refusal) reject an acting actor ≠ this unless an override is held.
    inspectorActorId: text('inspector_actor_id').notNull(),

    scheduledAt: timestamp('scheduled_at', { withTimezone: true, mode: 'date' }).notNull(),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED) ──
    // The exact address / landmark / contact instructions / free-text site description. NULLABLE,
    // but REQUIRED (non-null) when inspection_site_type = 'other' (enforced in the writer/route).
    locationCiphertext: piiColumn(1, 'ground_inspection')('location_ciphertext'),
    // The family contact (phone). NULLABLE.
    familyContactCiphertext: piiColumn(1, 'ground_inspection')('family_contact_ciphertext'),
    // Free-text inspection notes / the mandatory refusal reason note. NULLABLE until completion,
    // but REQUIRED (non-null) for a `photo_refused` / `evidence_unavailable` disposition (AC4a).
    notesCiphertext: piiColumn(1, 'ground_inspection')('notes_ciphertext'),

    // Structured findings — a bounded non-PII enum map (e.g. { residence_confirmed: 'yes' }).
    // JSONB, never plaintext PII. Nullable until findings/completion.
    structuredFindings: jsonb('structured_findings'),

    // The assignment disposition (D5/D6/AC4a). Default `scheduled`.
    status: groundInspectionStatusEnum('status').notNull().default('scheduled'),

    // The bounded refusal reason (AC4a). NULL unless status ∈ {photo_refused, evidence_unavailable};
    // required + paired to the disposition (enforced in the writer, #12).
    refusalReason: groundInspectionRefusalReasonEnum('refusal_reason'),

    // The #4 reschedule back-reference: which assignment THIS one replaced (self-FK). NULL on a
    // fresh schedule. ON DELETE SET NULL so a claim-cascade delete has no self-referential ordering hazard.
    supersedesGroundInspectionId: uuid('supersedes_ground_inspection_id')
      .$type<GroundInspectionId>()
      .references((): AnyPgColumn => claimGroundInspections.groundInspectionId, { onDelete: 'set null' }),

    // The actor who scheduled/rescheduled (audit; non-PII actor id). Nullable.
    scheduledByActor: text('scheduled_by_actor'),

    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_ground_inspections_pariwar_id_idx').on(t.pariwarId),
    // The read accessor + aggregates filter by claim (and by claim+status). NON-unique — a claim
    // holds many assignments (D5); NO active-uniqueness of any kind.
    index('claim_ground_inspections_claim_case_id_idx').on(t.claimCaseId),
    index('claim_ground_inspections_claim_case_id_status_idx').on(t.claimCaseId, t.status),
  ],
);

export type ClaimGroundInspectionRow = typeof claimGroundInspections.$inferSelect;
export type ClaimGroundInspectionInsert = typeof claimGroundInspections.$inferInsert;

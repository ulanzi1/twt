// Ground-inspection persistence writers — Story 6.7 (Task 4). Transport-free.
//
// The write side of the ground-inspection substrate. Each assignment is the addressable unit
// (D5/D6): a claim may hold MANY (parallel/sequential, same or different district). The ONE
// concurrency primitive is the assignment ROW LOCK (`SELECT … FOR UPDATE` by ground_inspection_id):
// every mutating verb on an existing assignment takes it FIRST, asserts `status = 'scheduled'`
// (a terminal assignment is immutable → GroundInspectionNotActiveError), and only then mutates —
// so complete-vs-refuse-vs-reschedule-vs-photo on one assignment can never both win, and the
// photo-count checks are race-proof (counted while holding the parent lock).
//
//   · scheduleGroundInspection        — open a NEW assignment (idempotent, claim-key-first).
//   · rescheduleGroundInspection      — supersede a SPECIFIC assignment + open its replacement.
//   · recordGroundInspectionFindings  — update structured findings + free-text notes.
//   · addGroundInspectionPhoto        — append one photo row (bounded, under the parent lock).
//   · completeGroundInspection        — atomic {≥1-photo + row update + completed event}.
//   · recordGroundInspectionRefusal   — the AC4a photo-refused/evidence-unavailable disposition.
//
// The two events (`claim.ground_inspection_scheduled` / `_completed`) are IDENTITY annotations
// emitted ONLY via `claim.projectClaimState` (the sole `claims.current_state` writer). Every
// emission writer re-reads the claim's state INSIDE the scope-tx and rejects when it is not
// `verification_in_progress` (GroundInspectionClaimNotInVerificationError — the 6.6 lesson: an
// unconditional identity-event append onto a resolved claim is a false evidentiary fact).
//
// SCHEDULE/RESCHEDULE IDEMPOTENCY (the D5 substitute for a uniqueness constraint). With no DB
// uniqueness on the assignment, a retried POST must not mint a duplicate. The writer generates
// the assignment id app-side, then claims a scoped `idempotency_keys` row (`scoped_key → id`) as
// its FIRST write; the key's unique index is the serialization point. We use ON CONFLICT DO
// NOTHING (the established `idempotency_keys`/keyed-store + persistPeerMeshSelection posture) —
// it BLOCKS on a concurrent same-key INSERT and, once that commits, resolves to a 0-row no-op
// WITHOUT aborting the caller's tx (a plain INSERT would 23505-abort it, forcing a raw SAVEPOINT
// recovery — the story described that recovery, but ON CONFLICT DO NOTHING reaches the same
// serialization more cleanly and is what the rest of the codebase does with this table). The
// loser re-reads the bound id and returns the winner's assignment, persisting NOTHING (no
// assignment, no event). The key claim shares the caller's tx, so any later failure rolls it back
// too (no orphan key). See `[[project_domain_limit_clamp_and_savepoint_retry]]`.

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import {
  type ClaimId,
  type GroundInspectionId,
  type PariwarId,
  groundInspectionId as brandGroundInspectionId,
} from '../ids/index.js';
import { idempotencyKeys } from '../schema/idempotency_keys.js';
import {
  type ClaimGroundInspectionRow,
  type GroundInspectionRefusalReason,
  type GroundInspectionSiteType,
  type GroundInspectionStage,
  claimGroundInspections,
} from '../schema/claim_ground_inspections.js';
import {
  type ClaimGroundInspectionPhotoRow,
  claimGroundInspectionPhotos,
} from '../schema/claim_ground_inspection_photos.js';
import {
  GroundInspectionClaimNotInVerificationError,
  GroundInspectionNotActiveError,
  GroundInspectionPhotoRequiredError,
} from './errors.js';
import { getClaimCase } from './read.js';
import { projectClaimState } from './project.js';

/** Max photos per assignment (AC3) — a LOCKED named const, NOT a configurable registry. A byte
 *  cap bounds total payload independently; 20 is a generous storage-abuse boundary. */
export const MAX_GROUND_INSPECTION_PHOTOS = 20;

/** How long a schedule/reschedule idempotency binding is honoured on replay (a retry window;
 *  the assignment row itself persists indefinitely — this only dedups near-term retries). */
const IDEMPOTENCY_TTL = sql`now() + interval '7 days'`;

// ── Typed errors owned by this writer module (the not-found + validation guards; the three
//    core write-path guards live in errors.ts, mirroring how peer-mesh-persist.ts owns its
//    not-found/responder errors while the 6.6 verification guard also lives beside the writers). ──

/** Thrown when no assignment / claim row exists for the id a verb targets (tenant-scoped miss). */
export class GroundInspectionNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`[ground-inspection] no assignment/claim found for id ${id} in scope`);
    this.name = 'GroundInspectionNotFoundError';
  }
}

/** Thrown when `inspection_site_type = 'other'` is scheduled without a `location_ciphertext`
 *  description (AC1 — a bounded "other" with no encrypted detail is a defect). */
export class GroundInspectionSiteDetailRequiredError extends Error {
  constructor() {
    super(`[ground-inspection] inspection_site_type='other' requires a non-null location description`);
    this.name = 'GroundInspectionSiteDetailRequiredError';
  }
}

/** Thrown when a refusal's (disposition, reason) pair is invalid, or its mandatory encrypted
 *  note is absent (AC4a/#12 — the reason is a bounded closed set paired to the disposition, and
 *  every refusal carries a mandatory encrypted note, incl. `other_evidence_unavailable`). */
export class GroundInspectionRefusalReasonError extends Error {
  constructor(public readonly detail: string) {
    super(`[ground-inspection] invalid refusal disposition/reason: ${detail}`);
    this.name = 'GroundInspectionRefusalReasonError';
  }
}

/** Thrown when the acting actor is NOT the assigned inspector AND no supervisor override was
 *  supplied (D6 — evidence-authoring verbs are the inspector's, unless `claim.override_ground_inspection`). */
export class GroundInspectionInspectorMismatchError extends Error {
  constructor(
    public readonly groundInspectionId: string,
    public readonly actingActorId: string,
  ) {
    super(
      `[ground-inspection] actor ${actingActorId} is not the assigned inspector of ${groundInspectionId} and holds no override`,
    );
    this.name = 'GroundInspectionInspectorMismatchError';
  }
}

/** Thrown when a reschedule would move the assignment to a DIFFERENT district (review 1a). A
 *  reschedule is a same-district authority op — the district gate resolves from the target row,
 *  so allowing `district` to change would mint a replacement in a district the actor was never
 *  checked against (cross-district authz escalation). A different district is a new schedule. */
export class GroundInspectionDistrictImmutableError extends Error {
  constructor(
    public readonly groundInspectionId: string,
    public readonly currentDistrict: string,
    public readonly requestedDistrict: string,
  ) {
    super(
      `[ground-inspection] a reschedule cannot change district (${currentDistrict} → ${requestedDistrict}) for ${groundInspectionId}`,
    );
    this.name = 'GroundInspectionDistrictImmutableError';
  }
}

/** Thrown when a schedule/reschedule Idempotency-Key is replayed with a DIFFERENT material payload
 *  (review #3). The key binds `scoped_key → assignment_id`; silently returning the original on a
 *  changed district/inspector/stage/site/time would discard the operator's correction as a no-op. */
export class GroundInspectionIdempotencyMismatchError extends Error {
  constructor(
    public readonly groundInspectionId: string,
    public readonly field: string,
  ) {
    super(`[ground-inspection] Idempotency-Key replayed with a different ${field} than the original request`);
    this.name = 'GroundInspectionIdempotencyMismatchError';
  }
}

/** The disposition→reason pairing (AC4a v1 closed set). `photo_refused` pairs ONLY with
 *  `family_refused_photography`; `evidence_unavailable` pairs with any of the other five. */
const REFUSAL_REASONS_BY_DISPOSITION: Record<'photo_refused' | 'evidence_unavailable', readonly GroundInspectionRefusalReason[]> = {
  photo_refused: ['family_refused_photography'],
  evidence_unavailable: [
    'premises_inaccessible',
    'responsible_person_absent',
    'site_no_longer_exists',
    'inspector_safety_risk',
    'other_evidence_unavailable',
  ],
};

/** The supervisor-override marker (D6) — recorded, never inferred. The route verifies the
 *  `claim.override_ground_inspection` key, then passes this so the writer STAMPS who overrode. */
export interface GroundInspectionOverride {
  byActorId: string;
}

// ── Internal helpers (all run on the caller's scoped `db`, inside the caller's scope-tx) ──

/** Row-lock the target assignment (`SELECT … FOR UPDATE`) + assert it is still `scheduled`.
 *  The ONE concurrency primitive — serializes every terminal transition on one assignment. */
async function lockActiveAssignment(
  db: Db,
  pariwarId: PariwarId,
  groundInspectionId: GroundInspectionId,
): Promise<ClaimGroundInspectionRow> {
  const rows = await db
    .select()
    .from(claimGroundInspections)
    .where(
      and(
        eq(claimGroundInspections.pariwarId, pariwarId),
        eq(claimGroundInspections.groundInspectionId, groundInspectionId),
      ),
    )
    .for('update');
  const assignment = rows[0];
  if (!assignment) throw new GroundInspectionNotFoundError(groundInspectionId);
  if (assignment.status !== 'scheduled') {
    throw new GroundInspectionNotActiveError(groundInspectionId, assignment.status);
  }
  return assignment;
}

/** Re-read the claim's cached state INSIDE the tx + assert `verification_in_progress` (the
 *  write-path guard that makes the identity annotation semantically correct). */
async function assertClaimInVerification(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const claimRow = await getClaimCase(db, pariwarId, claimCaseId);
  if (!claimRow) throw new GroundInspectionNotFoundError(claimCaseId);
  if (claimRow.currentState !== 'verification_in_progress') {
    throw new GroundInspectionClaimNotInVerificationError(claimCaseId, claimRow.currentState);
  }
  return claimRow;
}

/** Authorize an evidence-authoring verb: acting actor === assigned inspector, OR an explicit
 *  supervisor override (D6). The route already verified the override permission key. */
function authorizeInspector(
  assignment: ClaimGroundInspectionRow,
  actingActorId: string,
  override?: GroundInspectionOverride,
): void {
  if (actingActorId === assignment.inspectorActorId) return;
  if (override) return;
  throw new GroundInspectionInspectorMismatchError(assignment.groundInspectionId, actingActorId);
}

/** Count an assignment's persisted photos (called while holding the parent row lock). */
async function countPhotos(db: Db, pariwarId: PariwarId, groundInspectionId: GroundInspectionId): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(claimGroundInspectionPhotos)
    .where(
      and(
        eq(claimGroundInspectionPhotos.pariwarId, pariwarId),
        eq(claimGroundInspectionPhotos.groundInspectionId, groundInspectionId),
      ),
    );
  return rows[0]?.value ?? 0;
}

/** The scoped idempotency key for schedule (per pariwar + claim + client key). */
function scheduleKey(pariwarId: PariwarId, claimCaseId: ClaimId, idempotencyKey: string): string {
  return `ground_inspection:schedule:${pariwarId}:${claimCaseId}:${idempotencyKey}`;
}

/** The scoped idempotency key for reschedule (per pariwar + target assignment + client key). */
function rescheduleKey(pariwarId: PariwarId, groundInspectionId: GroundInspectionId, idempotencyKey: string): string {
  return `ground_inspection:reschedule:${pariwarId}:${groundInspectionId}:${idempotencyKey}`;
}

/** Claim a scoped idempotency key bound to `boundId` as the FIRST write. Returns `'claimed'`
 *  (we own it — proceed) or `'replay'` (a prior request already bound it — return the bound row).
 *  ON CONFLICT DO NOTHING serializes concurrent same-key requests via the key's unique index. */
async function claimIdempotencyKey(db: Db, key: string, boundId: GroundInspectionId): Promise<'claimed' | 'replay'> {
  const inserted = await db
    .insert(idempotencyKeys)
    .values({ key, status: 'completed', result: { groundInspectionId: boundId }, expiresAt: IDEMPOTENCY_TTL })
    .onConflictDoNothing({ target: idempotencyKeys.key })
    .returning();
  return inserted[0] ? 'claimed' : 'replay';
}

/** Resolve the assignment a prior same-key request bound (the idempotent-replay return path). */
async function getBoundAssignment(db: Db, pariwarId: PariwarId, key: string): Promise<ClaimGroundInspectionRow> {
  const keyRows = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key)).limit(1);
  const bound = keyRows[0]?.result as { groundInspectionId?: string } | null | undefined;
  if (!bound?.groundInspectionId) {
    throw new Error(`[ground-inspection] idempotency key ${key} has no bound assignment id`);
  }
  const rows = await db
    .select()
    .from(claimGroundInspections)
    .where(
      and(
        eq(claimGroundInspections.pariwarId, pariwarId),
        eq(claimGroundInspections.groundInspectionId, bound.groundInspectionId as GroundInspectionId),
      ),
    )
    .limit(1);
  const assignment = rows[0];
  if (!assignment) throw new GroundInspectionNotFoundError(bound.groundInspectionId);
  return assignment;
}

/** The material scheduling attributes an idempotent replay must match (review #3). Compares only
 *  non-PII plaintext fields (the encrypted PII uses non-deterministic IVs and cannot be compared);
 *  a mismatch means the client reused a key for a genuinely different request → reject, never a
 *  silent no-op that discards the correction. */
function assertIdempotentReplayMatches(
  bound: ClaimGroundInspectionRow,
  input: {
    district: string;
    inspectionStage: GroundInspectionStage;
    inspectionSiteType: GroundInspectionSiteType;
    inspectorActorId: string;
    scheduledAt: Date;
  },
): void {
  const mismatch =
    bound.district !== input.district
      ? 'district'
      : bound.inspectionStage !== input.inspectionStage
        ? 'inspection stage'
        : bound.inspectionSiteType !== input.inspectionSiteType
          ? 'inspection site type'
          : bound.inspectorActorId !== input.inspectorActorId
            ? 'inspector'
            : bound.scheduledAt.getTime() !== input.scheduledAt.getTime()
              ? 'scheduled time'
              : null;
  if (mismatch) throw new GroundInspectionIdempotencyMismatchError(bound.groundInspectionId, mismatch);
}

// ── Public writers ────────────────────────────────────────────────────────────

export interface ScheduleGroundInspectionInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** The assignment's jurisdiction — the D6 authz anchor (non-PII plaintext, from the request body). */
  district: string;
  inspectionStage: GroundInspectionStage;
  inspectionSiteType: GroundInspectionSiteType;
  /** The assigned inspector (an actor id). */
  inspectorActorId: string;
  scheduledAt: Date;
  /** PII — ALREADY encrypted by the caller (route encrypts before insert). */
  locationCiphertext?: string | null;
  familyContactCiphertext?: string | null;
  notesCiphertext?: string | null;
  /** Bounded non-PII findings map (jsonb). */
  structuredFindings?: unknown;
  /** The acting admin who scheduled (audit). */
  scheduledByActor: string;
  /** The client-supplied Idempotency-Key (required by the route). */
  idempotencyKey: string;
  auditId?: string;
}

export interface ScheduleGroundInspectionResult {
  groundInspection: ClaimGroundInspectionRow;
  /** `false` on an idempotent replay (the assignment already existed; nothing was written). */
  created: boolean;
}

/**
 * Open a NEW ground-inspection assignment (AC1). Idempotent (claim-key-first). Guards the claim
 * state (`verification_in_progress`) + emits `claim.ground_inspection_scheduled` (identity,
 * `supersedes_ground_inspection_id: null`). NO claim-wide supersede — parallel assignments are legal.
 *
 * Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`); the caller owns the scope-tx.
 */
export async function scheduleGroundInspection(
  client: pg.PoolClient,
  input: ScheduleGroundInspectionInput,
): Promise<ScheduleGroundInspectionResult> {
  const db = bindScopedDb(client);

  if (input.inspectionSiteType === 'other' && (input.locationCiphertext == null || input.locationCiphertext === '')) {
    throw new GroundInspectionSiteDetailRequiredError();
  }

  const gid = brandGroundInspectionId(randomUUID());
  const key = scheduleKey(input.pariwarId, input.claimCaseId, input.idempotencyKey);

  // (a/b) Claim the scoped key BEFORE anything else. A replay returns the bound assignment,
  // persisting nothing (no assignment, no event) — the whole point of key-first (closes the
  // orphan-second-row race the lookup-then-insert order would allow).
  if ((await claimIdempotencyKey(db, key, gid)) === 'replay') {
    const bound = await getBoundAssignment(db, input.pariwarId, key);
    assertIdempotentReplayMatches(bound, input);
    return { groundInspection: bound, created: false };
  }

  // (c) Guard claim state — reject a schedule onto a resolved/pre-verification claim.
  const claimRow = await assertClaimInVerification(db, input.pariwarId, input.claimCaseId);

  // (d) Insert the assignment row (PII already encrypted by the caller).
  const inserted = await db
    .insert(claimGroundInspections)
    .values({
      groundInspectionId: gid,
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      district: input.district,
      inspectionStage: input.inspectionStage,
      inspectionSiteType: input.inspectionSiteType,
      inspectorActorId: input.inspectorActorId,
      scheduledAt: input.scheduledAt,
      locationCiphertext: input.locationCiphertext ?? null,
      familyContactCiphertext: input.familyContactCiphertext ?? null,
      notesCiphertext: input.notesCiphertext ?? null,
      structuredFindings: input.structuredFindings ?? null,
      status: 'scheduled',
      supersedesGroundInspectionId: null,
      scheduledByActor: input.scheduledByActor,
    })
    .returning();
  const assignment = inserted[0];
  if (!assignment) throw new Error('[scheduleGroundInspection] assignment insert returned no row');

  // (e) Emit the identity annotation event (the only claims.current_state writer).
  await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.ground_inspection_scheduled',
    payload: {
      from_state: 'verification_in_progress',
      to_state: 'verification_in_progress',
      trigger: 'admin_schedule_ground_inspection',
      actor: 'operator',
      ground_inspection_id: gid,
      district: input.district,
      inspector_actor_id: input.inspectorActorId,
      scheduled_at: input.scheduledAt.toISOString(),
      supersedes_ground_inspection_id: null,
    },
    actorId: input.scheduledByActor,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { groundInspection: assignment, created: true };
}

export interface RescheduleGroundInspectionInput {
  pariwarId: PariwarId;
  /** The specific assignment to supersede (addressed by id — never a read-side "latest row"). */
  groundInspectionId: GroundInspectionId;
  idempotencyKey: string;
  /** The replacement's attributes — MAY reassign a different inspector (D6 — reschedule is a
   *  district-AUTHORITY op, not an evidence-authoring one; no inspector guard). */
  district: string;
  inspectionStage: GroundInspectionStage;
  inspectionSiteType: GroundInspectionSiteType;
  inspectorActorId: string;
  scheduledAt: Date;
  locationCiphertext?: string | null;
  familyContactCiphertext?: string | null;
  notesCiphertext?: string | null;
  structuredFindings?: unknown;
  scheduledByActor: string;
  auditId?: string;
}

/**
 * Supersede a SPECIFIC assignment + open its replacement (D5 reschedule). One scope-tx: claim the
 * idempotency key (keyed to the target), row-lock the target + assert `scheduled`, set it
 * `superseded`, insert the replacement (its own id, possibly a new inspector), and emit
 * `claim.ground_inspection_scheduled` for the replacement with `supersedes_ground_inspection_id`
 * = the target id (the #4 event model — NO separate `superseded` event). A same-key replay returns
 * the replacement with no second supersede + no second event.
 */
export async function rescheduleGroundInspection(
  client: pg.PoolClient,
  input: RescheduleGroundInspectionInput,
): Promise<ScheduleGroundInspectionResult> {
  const db = bindScopedDb(client);

  if (input.inspectionSiteType === 'other' && (input.locationCiphertext == null || input.locationCiphertext === '')) {
    throw new GroundInspectionSiteDetailRequiredError();
  }

  const replacementGid = brandGroundInspectionId(randomUUID());
  const key = rescheduleKey(input.pariwarId, input.groundInspectionId, input.idempotencyKey);

  // Idempotency: a replay returns the already-bound replacement with NO further mutation and NO
  // second event (so a post-commit-timeout retry does NOT hit GroundInspectionNotActiveError on
  // the now-`superseded` target, and cannot mint an unintended extra assignment).
  if ((await claimIdempotencyKey(db, key, replacementGid)) === 'replay') {
    const bound = await getBoundAssignment(db, input.pariwarId, key);
    assertIdempotentReplayMatches(bound, input);
    return { groundInspection: bound, created: false };
  }

  // Row-lock the target + assert scheduled (reject a terminal target). District-authority op —
  // no inspector guard here (the route enforces the district permission only).
  const target = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);

  // (review 1a) A reschedule is a SAME-district authority op — the district gate resolves from the
  // target row, so the replacement MUST stay in the target's district. A different district was
  // never authorization-checked → reject (it is a new schedule, not a reschedule).
  if (input.district !== target.district) {
    throw new GroundInspectionDistrictImmutableError(input.groundInspectionId, target.district, input.district);
  }

  const claimRow = await assertClaimInVerification(db, input.pariwarId, target.claimCaseId);

  await db
    .update(claimGroundInspections)
    .set({ status: 'superseded', updatedAt: sql`now()` })
    .where(
      and(
        eq(claimGroundInspections.pariwarId, input.pariwarId),
        eq(claimGroundInspections.groundInspectionId, input.groundInspectionId),
      ),
    );

  const inserted = await db
    .insert(claimGroundInspections)
    .values({
      groundInspectionId: replacementGid,
      claimCaseId: target.claimCaseId,
      pariwarId: input.pariwarId,
      district: input.district,
      inspectionStage: input.inspectionStage,
      inspectionSiteType: input.inspectionSiteType,
      inspectorActorId: input.inspectorActorId,
      scheduledAt: input.scheduledAt,
      locationCiphertext: input.locationCiphertext ?? null,
      familyContactCiphertext: input.familyContactCiphertext ?? null,
      notesCiphertext: input.notesCiphertext ?? null,
      structuredFindings: input.structuredFindings ?? null,
      status: 'scheduled',
      supersedesGroundInspectionId: input.groundInspectionId,
      scheduledByActor: input.scheduledByActor,
    })
    .returning();
  const replacement = inserted[0];
  if (!replacement) throw new Error('[rescheduleGroundInspection] replacement insert returned no row');

  await projectClaimState(client, {
    claimCaseId: target.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.ground_inspection_scheduled',
    payload: {
      from_state: 'verification_in_progress',
      to_state: 'verification_in_progress',
      trigger: 'admin_reschedule_ground_inspection',
      actor: 'operator',
      ground_inspection_id: replacementGid,
      district: input.district,
      inspector_actor_id: input.inspectorActorId,
      scheduled_at: input.scheduledAt.toISOString(),
      supersedes_ground_inspection_id: input.groundInspectionId,
    },
    actorId: input.scheduledByActor,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { groundInspection: replacement, created: true };
}

export interface RecordGroundInspectionFindingsInput {
  pariwarId: PariwarId;
  groundInspectionId: GroundInspectionId;
  actingActorId: string;
  override?: GroundInspectionOverride;
  /** Bounded non-PII findings map (jsonb). */
  structuredFindings?: unknown;
  /** Free-text notes — PII, ALREADY encrypted by the caller. */
  notesCiphertext?: string | null;
}

/**
 * Record structured findings + free-text notes on a scheduled assignment (AC2). Row-lock +
 * `scheduled` assert + inspector-identity guard; a plain non-`state` UPDATE (no event, no claim
 * advance). Only the fields supplied are written (undefined leaves the column unchanged).
 */
export async function recordGroundInspectionFindings(
  client: pg.PoolClient,
  input: RecordGroundInspectionFindingsInput,
): Promise<ClaimGroundInspectionRow> {
  const db = bindScopedDb(client);
  const assignment = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);
  // (review 2a) Guard the claim state exactly like complete/refusal — findings must not be authored
  // once the claim has left `verification_in_progress` (e.g. a claim under verifier review or
  // already resolved whose assignment row is still `scheduled`).
  await assertClaimInVerification(db, input.pariwarId, assignment.claimCaseId);
  authorizeInspector(assignment, input.actingActorId, input.override);

  const rows = await db
    .update(claimGroundInspections)
    .set({
      ...(input.structuredFindings !== undefined ? { structuredFindings: input.structuredFindings } : {}),
      ...(input.notesCiphertext !== undefined ? { notesCiphertext: input.notesCiphertext } : {}),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(claimGroundInspections.pariwarId, input.pariwarId),
        eq(claimGroundInspections.groundInspectionId, input.groundInspectionId),
      ),
    )
    .returning();
  return rows[0]!;
}

export interface AddGroundInspectionPhotoInput {
  pariwarId: PariwarId;
  groundInspectionId: GroundInspectionId;
  actingActorId: string;
  override?: GroundInspectionOverride;
  /** The object key the CALLER already `put` the bytes under (put-then-persist). */
  storageObjectKey: string;
  contentType: string;
  byteSize: number;
  /** Free-text caption — PII, ALREADY encrypted by the caller (nullable). */
  captionCiphertext?: string | null;
}

/**
 * Append ONE photo row to a scheduled assignment (AC3). Under the PARENT row lock: assert
 * `scheduled` + inspector guard + count-then-insert so the max-count cap is race-proof (#7) —
 * reject the 21st (`MAX_GROUND_INSPECTION_PHOTOS`). The caller already `put` the bytes; if THIS
 * insert fails the route best-effort-deletes the object (orphan-safe — the route owns compensation).
 */
export async function addGroundInspectionPhoto(
  client: pg.PoolClient,
  input: AddGroundInspectionPhotoInput,
): Promise<ClaimGroundInspectionPhotoRow> {
  const db = bindScopedDb(client);
  const assignment = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);
  // (review 2a) Guard the claim state — a photo must not be attached once the claim has left
  // `verification_in_progress` (consistent with findings/complete/refusal).
  await assertClaimInVerification(db, input.pariwarId, assignment.claimCaseId);
  authorizeInspector(assignment, input.actingActorId, input.override);

  const existing = await countPhotos(db, input.pariwarId, input.groundInspectionId);
  if (existing >= MAX_GROUND_INSPECTION_PHOTOS) {
    throw new GroundInspectionPhotoLimitError(input.groundInspectionId, MAX_GROUND_INSPECTION_PHOTOS);
  }

  const rows = await db
    .insert(claimGroundInspectionPhotos)
    .values({
      groundInspectionId: input.groundInspectionId,
      pariwarId: input.pariwarId,
      storageObjectKey: input.storageObjectKey,
      contentType: input.contentType,
      byteSize: input.byteSize,
      captionCiphertext: input.captionCiphertext ?? null,
    })
    .returning();
  return rows[0]!;
}

/** Thrown when an assignment already holds `MAX_GROUND_INSPECTION_PHOTOS` (the 21st is rejected
 *  under the parent row lock). */
export class GroundInspectionPhotoLimitError extends Error {
  constructor(
    public readonly groundInspectionId: string,
    public readonly max: number,
  ) {
    super(`[ground-inspection] assignment ${groundInspectionId} already holds the max ${max} photos`);
    this.name = 'GroundInspectionPhotoLimitError';
  }
}

export interface CompleteGroundInspectionInput {
  pariwarId: PariwarId;
  groundInspectionId: GroundInspectionId;
  actingActorId: string;
  override?: GroundInspectionOverride;
  /** Final findings/notes to write alongside completion (optional). */
  structuredFindings?: unknown;
  notesCiphertext?: string | null;
  auditId?: string;
}

export interface CompleteGroundInspectionResult {
  groundInspection: ClaimGroundInspectionRow;
  photoCount: number;
}

/**
 * Complete an assignment (AC4) — atomic in ONE DB scope-tx: row-lock + `scheduled` assert; guard
 * claim state; inspector guard; verify ≥1 photo UNDER the lock (GroundInspectionPhotoRequiredError
 * if zero — D6 mandatory evidence); update the row (`completed`, `completed_at`, final findings/notes);
 * emit `claim.ground_inspection_completed`. Object storage is NOT in this tx (it only COUNTS durable
 * photo rows); the audit-sink line is the ROUTE's post-commit obligation, NOT a same-tx write.
 */
export async function completeGroundInspection(
  client: pg.PoolClient,
  input: CompleteGroundInspectionInput,
): Promise<CompleteGroundInspectionResult> {
  const db = bindScopedDb(client);
  const assignment = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);
  const claimRow = await assertClaimInVerification(db, input.pariwarId, assignment.claimCaseId);
  authorizeInspector(assignment, input.actingActorId, input.override);

  const photoCount = await countPhotos(db, input.pariwarId, input.groundInspectionId);
  if (photoCount < 1) throw new GroundInspectionPhotoRequiredError(input.groundInspectionId);

  const rows = await db
    .update(claimGroundInspections)
    .set({
      status: 'completed',
      completedAt: sql`now()`,
      ...(input.structuredFindings !== undefined ? { structuredFindings: input.structuredFindings } : {}),
      ...(input.notesCiphertext !== undefined ? { notesCiphertext: input.notesCiphertext } : {}),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(claimGroundInspections.pariwarId, input.pariwarId),
        eq(claimGroundInspections.groundInspectionId, input.groundInspectionId),
      ),
    )
    .returning();
  const completed = rows[0]!;

  await projectClaimState(client, {
    claimCaseId: assignment.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.ground_inspection_completed',
    payload: {
      from_state: 'verification_in_progress',
      to_state: 'verification_in_progress',
      trigger: 'admin_complete_ground_inspection',
      actor: 'operator',
      ground_inspection_id: input.groundInspectionId,
      photo_count: photoCount,
    },
    actorId: input.actingActorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { groundInspection: completed, photoCount };
}

export interface RecordGroundInspectionRefusalInput {
  pariwarId: PariwarId;
  groundInspectionId: GroundInspectionId;
  actingActorId: string;
  override?: GroundInspectionOverride;
  disposition: 'photo_refused' | 'evidence_unavailable';
  refusalReason: GroundInspectionRefusalReason;
  /** The MANDATORY encrypted reason note (AC4a) — ALREADY encrypted by the caller; non-empty. */
  notesCiphertext: string;
}

/**
 * Record the AC4a refusal disposition (`photo_refused` / `evidence_unavailable`). Row-lock +
 * `scheduled` assert; guard claim state; inspector guard; validate the (disposition, reason) pair
 * + require the mandatory encrypted note. Sets the disposition status; does NOT emit
 * `claim.ground_inspection_completed` and does NOT advance claim state — the verifier adjudicates
 * (D4). The claim is escalated via the readable disposition (AC5 accessor).
 */
export async function recordGroundInspectionRefusal(
  client: pg.PoolClient,
  input: RecordGroundInspectionRefusalInput,
): Promise<ClaimGroundInspectionRow> {
  const db = bindScopedDb(client);

  // Validate the (disposition, reason) pairing + the mandatory note BEFORE mutating.
  const allowed = REFUSAL_REASONS_BY_DISPOSITION[input.disposition];
  if (!allowed || !allowed.includes(input.refusalReason)) {
    throw new GroundInspectionRefusalReasonError(
      `reason '${input.refusalReason}' is not valid for disposition '${input.disposition}'`,
    );
  }
  if (input.notesCiphertext == null || input.notesCiphertext === '') {
    throw new GroundInspectionRefusalReasonError('a mandatory encrypted reason note is required');
  }

  const assignment = await lockActiveAssignment(db, input.pariwarId, input.groundInspectionId);
  await assertClaimInVerification(db, input.pariwarId, assignment.claimCaseId);
  authorizeInspector(assignment, input.actingActorId, input.override);

  const rows = await db
    .update(claimGroundInspections)
    .set({
      status: input.disposition,
      refusalReason: input.refusalReason,
      notesCiphertext: input.notesCiphertext,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(claimGroundInspections.pariwarId, input.pariwarId),
        eq(claimGroundInspections.groundInspectionId, input.groundInspectionId),
      ),
    )
    .returning();
  return rows[0]!;
}

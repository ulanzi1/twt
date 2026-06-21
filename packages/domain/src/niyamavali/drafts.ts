// Niyamavali draft-store accessors — Story 2.4 (Task 2; AC1, AC4, AC5).
//
// The server-persisted draft lifecycle (ADR-0021). A draft holds a clause's PENDING
// content until publish mints the immutable `clause_versions` row. The draft is
// server-persisted (not client-only) so a NON-AUTHOR reviewer can load the EXACT
// pending content (AC1d). State machine:
//
//   draft ──submit──▶ in_review ──signoff──▶ signed_off ──publish──▶ published
//     ▲                                          │
//     └────────────── edit (any change) ─────────┘   (edit clears the sign-off)
//   (any open state) ──discard──▶ discarded
//
// ── The sign-off is content-bound — but the gate is not (subtle) ─────────────
// `evaluateToneReviewGate` checks present / resource-bound / non-author, NOT the
// content hash. So a sign-off recorded against an OLD payload would still pass the
// gate if naively returned. CONTENT-BINDING IS THIS MODULE'S JOB:
//   · `updateDraft` clears the sign-off columns on ANY edit (re-review required);
//   · `resolveDraftSignoff` returns a sign-off ONLY when the draft is `signed_off`
//     AND `tone_review_content_hash === sha256(canonicalJson(CURRENT payload))`.
// Net effect: edit-after-signoff ⇒ publish 409s until a fresh non-author sign-off.
//
// ── Transaction contract ─────────────────────────────────────────────────────
// Mirrors write.ts: these run DIRECTLY on the passed `db` (the caller's scope tx),
// never opening their own transaction. RLS scope is transaction-scoped, so a scoped
// caller is already inside a tx. The explicit `pariwarId` predicate (alongside RLS)
// is defense-in-depth + matches the `(pariwar_id, …)` indexes.

import { createHash } from 'node:crypto';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import type { ClauseDraftId, ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import {
  type ClauseDraftOperation,
  type ClauseDraftRow,
  type ClauseDraftStatus,
  clauseDrafts,
} from '../schema/clause_drafts.js';
import type { ClausePayload, ClauseVersionInsert } from '../schema/clause_versions.js';
import type { AffectedMemberScope } from '../schema/niyamavali_amendments.js';
import type { ToneReviewSignoff } from '../tone-review/gate.js';
import { DraftNotFoundError, DraftSelfReviewError, DraftStateError } from './errors.js';
import { assertAffectedMemberScope } from './scope.js';

type BenefitMechanism = NonNullable<ClauseVersionInsert['benefitMechanism']>;

/** The OPEN (non-terminal) draft states — at most one such draft per clause (partial-unique). */
export const OPEN_DRAFT_STATES: readonly ClauseDraftStatus[] = ['draft', 'in_review', 'signed_off'];

/**
 * The canonical content hash binding a tone-review sign-off to an EXACT payload:
 * SHA-256 hex of the RFC-8785 canonical JSON of the payload (the same canonicalizer
 * the audit hash-chain + computePayloadDiff use). Deterministic + order-insensitive.
 */
export function draftContentHash(payload: ClausePayload): string {
  return createHash('sha256').update(canonicalJsonStringify(payload), 'utf8').digest('hex');
}

/**
 * The resource locator a draft's tone-review sign-off is bound to. Keyed to the
 * CLAUSE (not the draft row) so the gate's resource-bound check matches the publish
 * target regardless of which draft produced the sign-off.
 */
export function draftResourceLocator(clauseId: ClauseId): string {
  return `niyamavali:clause:${clauseId}`;
}

// ── create / read ────────────────────────────────────────────────────────────

export interface CreateDraftInput {
  pariwarId: PariwarId;
  clauseId: ClauseId;
  /** `create` (brand-new clause) | `amend` (existing clause). 2.4 surfaces only these. */
  operation: ClauseDraftOperation;
  payload: ClausePayload;
  effectiveDate: Date;
  benefitMechanism: BenefitMechanism;
  /** REQUIRED for `amend` (§1.10), forced null for `create`. Validated structurally. */
  affectedMemberScope?: AffectedMemberScope | null;
  /** The trustee authoring the draft (NOT NULL — a draft is always human-authored). */
  authoredByActor: string;
}

/**
 * Create a new draft at `status='draft'`. For `amend`, the affected-member scope is
 * REQUIRED + structurally validated (architecture §1.10); for `create` it is forced
 * null (a brand-new clause affects no prior member). The partial-unique index
 * rejects a second OPEN draft for the same clause (surfaced as a unique violation).
 */
export async function createDraft(db: Db, input: CreateDraftInput): Promise<ClauseDraftRow> {
  const scope =
    input.operation === 'amend' ? assertAffectedMemberScope(input.affectedMemberScope) : null;

  const inserted = await db
    .insert(clauseDrafts)
    .values({
      pariwarId: input.pariwarId,
      clauseId: input.clauseId,
      operation: input.operation,
      payload: input.payload,
      effectiveDate: input.effectiveDate,
      benefitMechanism: input.benefitMechanism,
      affectedMemberScope: scope,
      status: 'draft',
      authoredByActor: input.authoredByActor,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('[createDraft] insert returned no row — check session scope');
  return row;
}

/** Resolve a draft by id within the active Pariwar, or null. */
export async function getDraft(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
): Promise<ClauseDraftRow | null> {
  const rows = await db
    .select()
    .from(clauseDrafts)
    .where(and(eq(clauseDrafts.pariwarId, pariwarId), eq(clauseDrafts.draftId, draftId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve a draft or throw `DraftNotFoundError` (the route maps it → 404). */
export async function getDraftOrThrow(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
): Promise<ClauseDraftRow> {
  const draft = await getDraft(db, pariwarId, draftId);
  if (!draft) throw new DraftNotFoundError(pariwarId, draftId);
  return draft;
}

export interface ListDraftsOptions {
  status?: ClauseDraftStatus;
  /** Forced-pagination ceiling (Story 1.14). */
  limit?: number;
}

/** List drafts for the Pariwar, newest-first, optionally filtered by status. */
export async function listDrafts(
  db: Db,
  pariwarId: PariwarId,
  opts: ListDraftsOptions = {},
): Promise<ClauseDraftRow[]> {
  const predicate =
    opts.status === undefined
      ? eq(clauseDrafts.pariwarId, pariwarId)
      : and(eq(clauseDrafts.pariwarId, pariwarId), eq(clauseDrafts.status, opts.status));
  return db
    .select()
    .from(clauseDrafts)
    .where(predicate)
    .orderBy(desc(clauseDrafts.createdAt))
    .limit(opts.limit ?? 30);
}

// ── edit / lifecycle transitions ──────────────────────────────────────────────

export interface UpdateDraftPatch {
  payload?: ClausePayload;
  effectiveDate?: Date;
  benefitMechanism?: BenefitMechanism;
  affectedMemberScope?: AffectedMemberScope | null;
}

/**
 * Edit a non-published draft. ANY edit RESETS `status → 'draft'` and CLEARS the
 * sign-off columns (`tone_reviewed_by` / `tone_reviewed_at` /
 * `tone_review_content_hash`) — a content change invalidates a prior sign-off, so a
 * fresh non-author re-review is required (AC1d / Dev Notes §"content-bound"). For an
 * `amend` draft a supplied scope is re-validated. Rejects editing a
 * published/discarded draft with `DraftStateError`.
 */
export async function updateDraft(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
  patch: UpdateDraftPatch,
): Promise<ClauseDraftRow> {
  const draft = await getDraftOrThrow(db, pariwarId, draftId);
  if (draft.status === 'published' || draft.status === 'discarded') {
    throw new DraftStateError(
      draftId,
      draft.status,
      'a published or discarded draft cannot be edited',
    );
  }

  const scope =
    patch.affectedMemberScope !== undefined && patch.affectedMemberScope !== null
      ? assertAffectedMemberScope(patch.affectedMemberScope)
      : patch.affectedMemberScope; // null passes through (caller clearing it)

  const updated = await db
    .update(clauseDrafts)
    .set({
      ...(patch.payload !== undefined ? { payload: patch.payload } : {}),
      ...(patch.effectiveDate !== undefined ? { effectiveDate: patch.effectiveDate } : {}),
      ...(patch.benefitMechanism !== undefined ? { benefitMechanism: patch.benefitMechanism } : {}),
      ...(patch.affectedMemberScope !== undefined ? { affectedMemberScope: scope } : {}),
      // Any edit invalidates a prior sign-off → reset to draft + clear sign-off cols.
      status: 'draft',
      toneReviewedBy: null,
      toneReviewedAt: null,
      toneReviewContentHash: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clauseDrafts.pariwarId, pariwarId),
        eq(clauseDrafts.draftId, draftId),
        inArray(clauseDrafts.status, [...OPEN_DRAFT_STATES]),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new DraftStateError(
      draftId,
      draft.status,
      'draft changed state before the edit could be applied',
    );
  }
  return row;
}

/** Discard a draft (`→ discarded`). Idempotent-safe only from an open state. */
export async function discardDraft(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
): Promise<ClauseDraftRow> {
  const draft = await getDraftOrThrow(db, pariwarId, draftId);
  if (draft.status === 'published') {
    throw new DraftStateError(draftId, draft.status, 'a published draft cannot be discarded');
  }
  return setStatusIfCurrent(
    db,
    pariwarId,
    draftId,
    'discarded',
    [...OPEN_DRAFT_STATES],
    draft.status,
  );
}

/** Submit a draft for tone-review (`draft → in_review`). */
export async function submitForReview(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
): Promise<ClauseDraftRow> {
  const draft = await getDraftOrThrow(db, pariwarId, draftId);
  if (draft.status !== 'draft') {
    throw new DraftStateError(draftId, draft.status, "only a 'draft' may be submitted for review");
  }
  return setStatusIfCurrent(db, pariwarId, draftId, 'in_review', ['draft'], draft.status);
}

export interface RecordDraftSignoffInput {
  /** The NON-AUTHOR reviewer's actor id. */
  reviewedBy: string;
  /** SHA-256 hex of the canonical-JSON of the reviewed payload (`draftContentHash`). */
  contentHash: string;
  /** DB-authoritative sign-off instant (the route passes the DB clock). */
  reviewedAt: Date;
}

/**
 * Record a tone-review sign-off (`in_review → signed_off`), binding it to the EXACT
 * reviewed payload via `tone_review_content_hash`. Rejects a self-review
 * (`reviewedBy === authored_by_actor`) with `DraftSelfReviewError` — defense-in-depth
 * alongside the publish gate's non-author invariant. Requires the draft to be
 * `in_review`.
 */
export async function recordDraftSignoff(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
  input: RecordDraftSignoffInput,
): Promise<ClauseDraftRow> {
  const draft = await getDraftOrThrow(db, pariwarId, draftId);
  if (draft.authoredByActor === input.reviewedBy) {
    throw new DraftSelfReviewError(draftId);
  }
  if (draft.status !== 'in_review') {
    throw new DraftStateError(draftId, draft.status, "only an 'in_review' draft may be signed off");
  }

  const updated = await db
    .update(clauseDrafts)
    .set({
      status: 'signed_off',
      toneReviewedBy: input.reviewedBy,
      toneReviewedAt: input.reviewedAt,
      toneReviewContentHash: input.contentHash,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clauseDrafts.pariwarId, pariwarId),
        eq(clauseDrafts.draftId, draftId),
        eq(clauseDrafts.status, 'in_review'),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new DraftStateError(
      draftId,
      draft.status,
      'draft changed state before the sign-off could be recorded',
    );
  }
  return row;
}

/**
 * PURE content-binding decision: project a draft row into the framework-agnostic
 * `ToneReviewSignoff` the publish gate consumes — but ONLY when it is still valid:
 * the draft must be `signed_off`, carry a reviewer + stored hash, AND that stored
 * hash must equal `sha256(canonicalJson(CURRENT payload))`. A stale hash (payload
 * changed after sign-off — though `updateDraft` also clears it) or any non-signed-off
 * status returns `null`. THE GATE DOES NOT COMPARE HASHES — this content-binding is
 * intentionally the resolver's job (Dev Notes §"content-bound"). Pure + DB-free so it
 * is unit-testable without a live DB.
 */
export function signoffFromDraftRow(draft: ClauseDraftRow): ToneReviewSignoff | null {
  if (draft.status !== 'signed_off') return null;
  if (!draft.toneReviewedBy || !draft.toneReviewContentHash) return null;
  if (draft.toneReviewContentHash !== draftContentHash(draft.payload)) return null;

  return {
    reviewedBy: draft.toneReviewedBy,
    resourceLocator: draftResourceLocator(draft.clauseId),
    contentHash: draft.toneReviewContentHash,
    reviewedAt: draft.toneReviewedAt,
  };
}

/**
 * Resolve the recorded, still-valid tone-review sign-off for a draft (the gate's
 * `resolveSignoff` seam). Loads the draft then applies the pure `signoffFromDraftRow`
 * content-binding. Returns `null` (→ gate denies) when no valid sign-off exists.
 */
export async function resolveDraftSignoff(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
): Promise<ToneReviewSignoff | null> {
  const draft = await getDraft(db, pariwarId, draftId);
  if (!draft) return null;
  return signoffFromDraftRow(draft);
}

/**
 * Mark a draft published — the terminal transition the publish handler runs AFTER
 * the `clause_versions` row + audit line are written. Sets `status='published'`,
 * `published_clause_version_id`, and `audit_id`. Requires the draft to be
 * `signed_off` (publish only after a recorded sign-off — AC1e).
 */
export async function markDraftPublished(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
  clauseVersionId: ClauseVersionId,
  auditId: string,
): Promise<ClauseDraftRow> {
  const draft = await getDraftOrThrow(db, pariwarId, draftId);
  if (draft.status !== 'signed_off') {
    throw new DraftStateError(draftId, draft.status, "only a 'signed_off' draft may be published");
  }

  const updated = await db
    .update(clauseDrafts)
    .set({
      status: 'published',
      publishedClauseVersionId: clauseVersionId,
      auditId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clauseDrafts.pariwarId, pariwarId),
        eq(clauseDrafts.draftId, draftId),
        eq(clauseDrafts.status, 'signed_off'),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new DraftStateError(
      draftId,
      draft.status,
      'draft changed state before it could be marked published',
    );
  }
  return row;
}

/** Internal: guarded status transition (with updatedAt bump), returning the row. */
async function setStatusIfCurrent(
  db: Db,
  pariwarId: PariwarId,
  draftId: ClauseDraftId,
  status: ClauseDraftStatus,
  expectedStatuses: ClauseDraftStatus[],
  observedStatus: ClauseDraftStatus,
): Promise<ClauseDraftRow> {
  const updated = await db
    .update(clauseDrafts)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(clauseDrafts.pariwarId, pariwarId),
        eq(clauseDrafts.draftId, draftId),
        inArray(clauseDrafts.status, expectedStatuses),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new DraftStateError(
      draftId,
      observedStatus,
      `draft changed state before transition to '${status}' could be applied`,
    );
  }
  return row;
}

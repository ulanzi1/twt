// T&C registry write path — Story 2.6 (Task 3; AC2, AC3, AC6, AC7, AC8).
//
// create / approve / supersede. Mirrors `niyamavali/write.ts`: NO HTTP, NO auth
// (those are the Story 2.6 trustee route). The typed errors are the transport seams.
//
// ── Transaction contract ─────────────────────────────────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do NOT open
// their own transaction. Atomicity (createTcVersion writes the main row + N link
// rows; the approve route closes the prior then opens the target) comes from the
// CALLER's transaction, which is MANDATORY anyway: RLS scope (`SET LOCAL
// app.pariwar_id`) is transaction-scoped, so any scoped caller is already inside a
// transaction — `withPariwarScope` opens it on the route path; the per-test harness
// opens it in tests.
//
// ── Effective-window invariant (Dev Notes §"Effective-window invariant") ──────
// At most ONE open-ended (`effective_until IS NULL`) version per Pariwar, enforced
// by the partial-unique index. So:
//   · createTcVersion opens the GENESIS version (no open version exists yet) but
//     STAGES every subsequent version (effective_until = effective_from → an empty
//     window that is never "effective") so the in-force version keeps rendering and
//     the partial-unique constraint is not violated at create time.
//   · approve = supersede the prior currently-effective version (close it FIRST),
//     THEN open the target (effective_until = NULL) — the route orchestrates the
//     two single-purpose accessors in one tx in that order so the constraint is
//     never transiently violated.

import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClauseVersionId, PariwarId, TcVersionId } from '../ids/index.js';
import { resolveByClauseVersionId } from '../niyamavali/read.js';
import { termsAndConditionsPinnedClauses } from '../schema/terms_and_conditions_pinned_clauses.js';
import {
  type TcVersionRow,
  termsAndConditionsVersions,
} from '../schema/terms_and_conditions_versions.js';
import {
  TcPinnedClauseNotFoundError,
  TcStateError,
  TcVersionConflictError,
  TcVersionNotFoundError,
} from './errors.js';
import { resolveByTcVersionId } from './read.js';
import { renderTcMarkdown } from './render-markdown.js';

/** True iff `err` is a Postgres FK-violation (23503). */
function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string }).code === '23503';
}

/** True iff `err` is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string }).code === '23505';
}

// ── createTcVersion (AC2, AC3, AC7, AC8) ─────────────────────────────────────

export interface CreateTcVersionInput {
  pariwarId: PariwarId;
  /** Canonical T&C content. Rendered to sanitized HTML at write time (AC3). */
  bodyMarkdown: string;
  /** The clause versions this T&C pins (each validated to exist in the Pariwar). */
  pinnedClauseVersionIds: ClauseVersionId[];
  /** DB-authoritative effective instant of this version. */
  effectiveFrom: Date;
  authoredByActor?: string | null;
  auditId?: string | null;
  /**
   * Optional caller-supplied row address (defaults to DB gen_random_uuid()). The
   * audit-or-throw publish path PRE-GENERATES this so the audit line — written
   * FIRST — references the exact `tc_version_id` in its provenance (mirror
   * `createClause`'s NewClauseFields).
   */
  tcVersionId?: TcVersionId;
}

/**
 * Create a new T&C version pinned to a set of clause versions (AC7). `version` is
 * the monotonic next per Pariwar; `body_html_rendered` is the precomputed sanitized
 * render of `body_markdown` (AC3); `legal_review_status` defaults to `pending`. The
 * main row and the `terms_and_conditions_pinned_clauses` link rows are inserted in
 * the caller's tx (atomic).
 *
 * Pin validation is two guards (BOTH required — see the schema header): the domain
 * pre-check (`resolveByClauseVersionId` returns a row ONLY for a same-Pariwar
 * clause version → the cross-tenant guard) AND the link FK (the hard
 * referential guard, mapped from a racing 23503 to the same typed error).
 */
export async function createTcVersion(
  db: Db,
  input: CreateTcVersionInput,
): Promise<TcVersionRow> {
  if (input.pinnedClauseVersionIds.length === 0) {
    throw new TcPinnedClauseNotFoundError(
      input.pariwarId,
      '(none — at least one clause version must be pinned)',
    );
  }

  // Monotonic next version (head regardless of status/effective window).
  const headRows = await db
    .select({ version: termsAndConditionsVersions.version })
    .from(termsAndConditionsVersions)
    .where(eq(termsAndConditionsVersions.pariwarId, input.pariwarId))
    .orderBy(sql`${termsAndConditionsVersions.version} DESC`)
    .limit(1);
  const nextVersion = (headRows[0]?.version ?? 0) + 1;

  // Dedupe pins (the composite PK would 23505 on a duplicate within one version).
  const pins = [...new Set(input.pinnedClauseVersionIds)];

  // Cross-tenant pin pre-check: resolveByClauseVersionId returns a row only when the
  // clause version belongs to THIS Pariwar — the FK (global PK) cannot enforce this.
  for (const clauseVersionId of pins) {
    const clause = await resolveByClauseVersionId(db, input.pariwarId, clauseVersionId);
    if (!clause) throw new TcPinnedClauseNotFoundError(input.pariwarId, clauseVersionId);
  }

  // Genesis (open-ended) vs staged: at most one open-ended version per Pariwar.
  const openRows = await db
    .select({ tcVersionId: termsAndConditionsVersions.tcVersionId })
    .from(termsAndConditionsVersions)
    .where(
      and(
        eq(termsAndConditionsVersions.pariwarId, input.pariwarId),
        isNull(termsAndConditionsVersions.effectiveUntil),
      ),
    )
    .limit(1);
  // No open version → this is the genesis: open it (renders immediately, pending
  // review). An open version already exists → stage this one (empty window, never
  // effective) so the in-force version keeps rendering until approval opens this one.
  const effectiveUntil = openRows.length > 0 ? input.effectiveFrom : null;

  const bodyHtmlRendered = renderTcMarkdown(input.bodyMarkdown);

  let insertedVersions: TcVersionRow[];
  try {
    insertedVersions = await db
      .insert(termsAndConditionsVersions)
      .values({
        tcVersionId: input.tcVersionId ?? undefined,
        pariwarId: input.pariwarId,
        version: nextVersion,
        bodyMarkdown: input.bodyMarkdown,
        bodyHtmlRendered,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil,
        // legal_review_status defaults to 'pending' (schema default).
        authoredByActor: input.authoredByActor ?? null,
        auditId: input.auditId ?? null,
      })
      .returning();
  } catch (err) {
    // 23505 = concurrent create race on (pariwar_id, version) unique index or
    // (pariwar_id) WHERE effective_until IS NULL partial-unique index.
    if (isUniqueViolation(err)) throw new TcVersionConflictError(input.pariwarId);
    throw err;
  }
  const row = insertedVersions[0];
  if (!row) {
    throw new Error('[createTcVersion] version insert returned no row — check session scope');
  }

  if (pins.length > 0) {
    try {
      await db.insert(termsAndConditionsPinnedClauses).values(
        pins.map((clauseVersionId) => ({
          tcVersionId: row.tcVersionId,
          clauseVersionId,
          pariwarId: input.pariwarId,
        })),
      );
    } catch (err) {
      // The link FK is the hard guard against a clause version that vanished
      // between the pre-check and the insert (or any non-existent id).
      if (isForeignKeyViolation(err)) {
        throw new TcPinnedClauseNotFoundError(
          input.pariwarId,
          '(fk-violation — specific id unknown; race between pre-check and insert)',
        );
      }
      throw err;
    }
  }

  return row;
}

// ── approveTcVersion (AC6) ───────────────────────────────────────────────────

export interface ApproveTcVersionInput {
  pariwarId: PariwarId;
  tcVersionId: TcVersionId;
  /** The acting trustee — recorded in `legal_reviewer_actor_id` (AC6). */
  legalReviewerActorId: string;
  /** The approve-transition audit entry (written first by the route; stored on the row). */
  auditId?: string | null;
}

/**
 * Approve a T&C version (AC6): flip `legal_review_status` → `approved`, set
 * `legal_reviewer_actor_id`, and OPEN the version (`effective_until = NULL`) so it
 * becomes the currently-in-force one. The route MUST have already superseded the
 * prior open version in the same tx (close-prior-first) so the partial-unique
 * constraint is not violated when this opens the target. Rejects approving an
 * already-`approved` or `superseded` version (`TcStateError`).
 */
export async function approveTcVersion(
  db: Db,
  input: ApproveTcVersionInput,
): Promise<TcVersionRow> {
  const current = await resolveByTcVersionId(db, input.pariwarId, input.tcVersionId);
  if (!current) throw new TcVersionNotFoundError(input.pariwarId, input.tcVersionId);
  if (current.legalReviewStatus === 'approved') {
    throw new TcStateError(input.tcVersionId, current.legalReviewStatus, 'already approved');
  }
  if (current.legalReviewStatus === 'superseded') {
    throw new TcStateError(
      input.tcVersionId,
      current.legalReviewStatus,
      'cannot approve a superseded version',
    );
  }

  const updated = await db
    .update(termsAndConditionsVersions)
    .set({
      legalReviewStatus: 'approved',
      legalReviewerActorId: input.legalReviewerActorId,
      effectiveUntil: null,
      auditId: input.auditId ?? null,
    })
    .where(
      and(
        eq(termsAndConditionsVersions.pariwarId, input.pariwarId),
        eq(termsAndConditionsVersions.tcVersionId, input.tcVersionId),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new Error('[approveTcVersion] update returned no row — check session scope');
  }
  return row;
}

// ── supersedeTcVersion (AC6) ─────────────────────────────────────────────────

export interface SupersedeTcVersionInput {
  pariwarId: PariwarId;
  tcVersionId: TcVersionId;
  /** Defaults to DB now() (DB-authoritative time). */
  effectiveUntil?: Date;
  /** The approve-transition audit entry that caused this supersession (stored on the row). */
  auditId?: string | null;
}

/**
 * Supersede a T&C version (AC6): set `effective_until` (closing its window) and
 * flip `legal_review_status` → `superseded`. The superseded row is NEVER deleted —
 * it stays queryable by `tc_version_id` for AC8 historical attestation. Rejects
 * superseding an already-`superseded` version (`TcStateError`).
 */
export async function supersedeTcVersion(
  db: Db,
  input: SupersedeTcVersionInput,
): Promise<TcVersionRow> {
  const current = await resolveByTcVersionId(db, input.pariwarId, input.tcVersionId);
  if (!current) throw new TcVersionNotFoundError(input.pariwarId, input.tcVersionId);
  if (current.legalReviewStatus === 'superseded') {
    throw new TcStateError(input.tcVersionId, current.legalReviewStatus, 'already superseded');
  }

  const updated = await db
    .update(termsAndConditionsVersions)
    .set({
      legalReviewStatus: 'superseded',
      effectiveUntil: input.effectiveUntil ?? sql`now()`,
      auditId: input.auditId ?? null,
    })
    .where(
      and(
        eq(termsAndConditionsVersions.pariwarId, input.pariwarId),
        eq(termsAndConditionsVersions.tcVersionId, input.tcVersionId),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new Error('[supersedeTcVersion] update returned no row — check session scope');
  }
  return row;
}

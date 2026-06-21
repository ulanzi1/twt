// Niyamavali registry read accessors — Story 2.3 (Task 6; AC5, AC6, AC7).
//
// Dual resolution (AC7) + bidirectional lineage (AC5). All reads are
// tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes `pariwarId`
// explicitly — the explicit predicate matches the `(pariwar_id, …)` indexes and
// keeps each accessor self-contained. Mirrors the `pariwar-passport/read.ts`
// module shape (read / write / index split).

import { and, arrayOverlaps, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import { type ClauseVersionRow, clauseVersions } from '../schema/clause_versions.js';
import {
  type NiyamavaliAmendmentRow,
  niyamavaliAmendments,
} from '../schema/niyamavali_amendments.js';

/**
 * AC7 "current rule": the latest NON-deprecated version of a clause that is
 * effective at `asOf`. `asOf` defaults to DB `now()` (NOT an app-server clock —
 * §1.11 DB-authoritative time; any call-site `now()` leakage is a Story 2.4
 * concern). Returns null when no non-deprecated effective version exists.
 */
export async function resolveByClauseId(
  db: Db,
  pariwarId: PariwarId,
  clauseId: ClauseId,
  asOf?: Date,
): Promise<ClauseVersionRow | null> {
  // Default to DB now() when no explicit instant is supplied (DB-authoritative).
  const effectivePredicate =
    asOf === undefined
      ? sql`${clauseVersions.effectiveDate} <= now()`
      : lte(clauseVersions.effectiveDate, asOf);

  const rows = await db
    .select()
    .from(clauseVersions)
    .where(
      and(
        eq(clauseVersions.pariwarId, pariwarId),
        eq(clauseVersions.clauseId, clauseId),
        isNull(clauseVersions.deprecatedAt),
        effectivePredicate,
      ),
    )
    .orderBy(desc(clauseVersions.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * AC7 "rule as it was": the exact immutable historical version by its
 * `clause_version_id`. First-class alongside `resolveByClauseId`. Takes an
 * explicit `pariwarId` for defense-in-depth alongside RLS — consistent with
 * every other read accessor in this module and guards superuser / non-scoped
 * callers from cross-tenant reads.
 */
export async function resolveByClauseVersionId(
  db: Db,
  pariwarId: PariwarId,
  clauseVersionId: ClauseVersionId,
): Promise<ClauseVersionRow | null> {
  const rows = await db
    .select()
    .from(clauseVersions)
    .where(
      and(
        eq(clauseVersions.pariwarId, pariwarId),
        eq(clauseVersions.clauseVersionId, clauseVersionId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The latest version row of a clause REGARDLESS of deprecation/effective-date —
 * the structural "head" used by the amend/deprecate write paths + lineage. Not
 * the AC7 resolver (that filters non-deprecated/effective); this is the audit view.
 */
export async function latestVersionRow(
  db: Db,
  pariwarId: PariwarId,
  clauseId: ClauseId,
): Promise<ClauseVersionRow | null> {
  const rows = await db
    .select()
    .from(clauseVersions)
    .where(and(eq(clauseVersions.pariwarId, pariwarId), eq(clauseVersions.clauseId, clauseId)))
    .orderBy(desc(clauseVersions.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Story 2.4 — the admin "browse the registry / pick a clause to amend" read: the
 * LATEST version of every clause in the Pariwar, newest-first. The latest version of
 * a `clause_id` is its chain HEAD — the row with no successor (`superseded_by_version
 * IS NULL`); amendClause always points the prior version forward, so each `clause_id`
 * chain has exactly one such head (the max version). Deprecated clauses are INCLUDED
 * (their head row carries `deprecated_at`) so the registry browse is complete; the
 * caller filters by `deprecatedAt` when offering amend targets (amendClause rejects a
 * deprecated head). Forced-pagination ceiling (Story 1.14).
 */
export async function listClauses(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<ClauseVersionRow[]> {
  return db
    .select()
    .from(clauseVersions)
    .where(
      and(eq(clauseVersions.pariwarId, pariwarId), isNull(clauseVersions.supersededByVersion)),
    )
    .orderBy(desc(clauseVersions.authoredAt))
    .limit(opts.limit ?? 50);
}

/**
 * Story 2.5 (AC2/AC8) — the current EFFECTIVE clause set for an ENTIRE Pariwar:
 * the public-render read. For each `clause_id` in the Pariwar, returns the single
 * latest NON-deprecated version that is effective at `asOf` — the exact per-clause
 * predicate `resolveByClauseId` applies (`isNull(deprecatedAt) + effectiveDate <=
 * asOf`, max `version`), lifted to the whole-Pariwar set via `DISTINCT ON
 * (clause_id)` ordered `clause_id, version DESC`.
 *
 * `asOf` defaults to DB `now()` (DB-authoritative time §1.11 — NEVER an app-server
 * clock). A clause with no version effective at `asOf`, or whose only effective
 * version is deprecated, contributes NOTHING (it is simply absent) — mirroring
 * `resolveByClauseId` returning null for that clause. Rows come back ordered by
 * `clause_id` (the DISTINCT-ON leading order) → a stable, deterministic page the
 * public render consumes directly.
 *
 * Contrast `listClauses` (the admin browse: latest HEAD per clause, INCLUDES
 * deprecated, IGNORES effective-date) — this is the reader's "what is in force right
 * now" view. Tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes
 * `pariwarId` explicitly (the indexed predicate + cross-tenant defense-in-depth, the
 * module convention). No forced-pagination ceiling: the effective Niyamavali is the
 * full public rulebook and is rendered whole (the v1 body is small; a future ceiling
 * is a render-surface concern, not a data-read one).
 */
export async function listEffectiveClauses(
  db: Db,
  pariwarId: PariwarId,
  asOf?: Date,
): Promise<ClauseVersionRow[]> {
  // Default to DB now() when no explicit instant is supplied (DB-authoritative) —
  // identical predicate construction to resolveByClauseId.
  const effectivePredicate =
    asOf === undefined
      ? sql`${clauseVersions.effectiveDate} <= now()`
      : lte(clauseVersions.effectiveDate, asOf);

  return db
    .selectDistinctOn([clauseVersions.clauseId])
    .from(clauseVersions)
    .where(
      and(
        eq(clauseVersions.pariwarId, pariwarId),
        isNull(clauseVersions.deprecatedAt),
        effectivePredicate,
      ),
    )
    .orderBy(clauseVersions.clauseId, desc(clauseVersions.version));
}

/**
 * Story 2.4 — the time-ordered amendment ledger read (newest-first). Uses the
 * `(pariwar_id, created_at)` index added in migration 0015 (AC8 De4). Forced-
 * pagination ceiling (Story 1.14).
 */
export async function listAmendments(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<NiyamavaliAmendmentRow[]> {
  return db
    .select()
    .from(niyamavaliAmendments)
    .where(eq(niyamavaliAmendments.pariwarId, pariwarId))
    .orderBy(desc(niyamavaliAmendments.createdAt))
    .limit(opts.limit ?? 50);
}

/** All version rows of a clause, oldest→newest (the version chain / audit history). */
export async function versionsOfClause(
  db: Db,
  pariwarId: PariwarId,
  clauseId: ClauseId,
): Promise<ClauseVersionRow[]> {
  return db
    .select()
    .from(clauseVersions)
    .where(and(eq(clauseVersions.pariwarId, pariwarId), eq(clauseVersions.clauseId, clauseId)))
    .orderBy(clauseVersions.version);
}

/**
 * AC5 forward lineage — "which clauses descend from this one?" Rows whose
 * `predecessor_clause_ids` reference ANY of this clause's version-nodes are its
 * descendants; we return their DISTINCT clause_ids, excluding the queried clause
 * itself (same-clause amendment self-references are not cross-clause descent).
 */
export async function lineageForward(
  db: Db,
  pariwarId: PariwarId,
  clauseId: ClauseId,
): Promise<ClauseId[]> {
  const versions = await versionsOfClause(db, pariwarId, clauseId);
  const versionIds = versions.map((r) => r.clauseVersionId);
  if (versionIds.length === 0) return [];

  const rows = await db
    .select({ clauseId: clauseVersions.clauseId })
    .from(clauseVersions)
    .where(
      and(
        eq(clauseVersions.pariwarId, pariwarId),
        arrayOverlaps(clauseVersions.predecessorClauseIds, versionIds),
      ),
    );
  return [...new Set(rows.map((r) => r.clauseId))].filter((id) => id !== clauseId);
}

/**
 * AC5 backward lineage — "which clauses did this one originate from?" Collect the
 * predecessor version-nodes stored across this clause's rows, map them to their
 * DISTINCT clause_ids, excluding the queried clause itself (the same-clause
 * amendment predecessor maps back to the clause and is filtered out → only the
 * split/merge ancestors remain). The canonical "where did this rule come from?".
 */
export async function lineageBackward(
  db: Db,
  pariwarId: PariwarId,
  clauseId: ClauseId,
): Promise<ClauseId[]> {
  const rows = await db
    .select({ predecessors: clauseVersions.predecessorClauseIds })
    .from(clauseVersions)
    .where(and(eq(clauseVersions.pariwarId, pariwarId), eq(clauseVersions.clauseId, clauseId)));

  const predecessorVersionIds = [...new Set(rows.flatMap((r) => r.predecessors))];
  if (predecessorVersionIds.length === 0) return [];

  const predRows = await db
    .select({ clauseId: clauseVersions.clauseId })
    .from(clauseVersions)
    .where(
      and(
        eq(clauseVersions.pariwarId, pariwarId),
        inArray(clauseVersions.clauseVersionId, predecessorVersionIds),
      ),
    );
  return [...new Set(predRows.map((r) => r.clauseId))].filter((id) => id !== clauseId);
}

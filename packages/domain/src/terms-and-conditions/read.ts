// T&C registry read accessors — Story 2.6 (Task 3; AC2, AC4, AC8).
//
// All reads are tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes
// `pariwarId` explicitly — the explicit predicate matches the `(pariwar_id, …)`
// indexes and is cross-tenant defense-in-depth. Mirrors the `niyamavali/read.ts`
// module shape (read / write / errors / index split).

import { and, asc, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { ClauseVersionId, PariwarId, TcVersionId } from '../ids/index.js';
import { termsAndConditionsPinnedClauses } from '../schema/terms_and_conditions_pinned_clauses.js';
import {
  type TcVersionRow,
  termsAndConditionsVersions,
} from '../schema/terms_and_conditions_versions.js';

/**
 * AC4 "current effective T&C": the single version whose effective window contains
 * `asOf` — `effective_from <= asOf AND (effective_until IS NULL OR asOf <
 * effective_until)`, newest `effective_from` (then highest `version`) if ambiguous.
 * `asOf` defaults to DB `now()` (NOT an app-server clock — §1.11 DB-authoritative
 * time), exactly like `resolveByClauseId`/`listEffectiveClauses`. Returns null when
 * no version is effective at `asOf` (the public page renders its empty state).
 */
export async function getEffectiveTc(
  db: Db,
  pariwarId: PariwarId,
  asOf?: Date,
): Promise<TcVersionRow | null> {
  // Default to DB now() when no explicit instant is supplied (DB-authoritative) —
  // identical predicate construction to resolveByClauseId.
  const lowerBound =
    asOf === undefined
      ? sql`${termsAndConditionsVersions.effectiveFrom} <= now()`
      : lte(termsAndConditionsVersions.effectiveFrom, asOf);
  const upperBound =
    asOf === undefined
      ? sql`(${termsAndConditionsVersions.effectiveUntil} IS NULL OR now() < ${termsAndConditionsVersions.effectiveUntil})`
      : or(
          isNull(termsAndConditionsVersions.effectiveUntil),
          gt(termsAndConditionsVersions.effectiveUntil, asOf),
        );

  const rows = await db
    .select()
    .from(termsAndConditionsVersions)
    .where(and(eq(termsAndConditionsVersions.pariwarId, pariwarId), lowerBound, upperBound))
    .orderBy(desc(termsAndConditionsVersions.effectiveFrom), desc(termsAndConditionsVersions.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * AC8 "T&C as it was": the exact immutable historical version by its
 * `tc_version_id` — the stable recoverable handle Story 2.7's consent registry +
 * Epic 3's acceptance flow store. Takes an explicit `pariwarId` for
 * defense-in-depth alongside RLS (the module convention; guards non-scoped callers
 * from cross-tenant reads). Recovers a `superseded` version exactly.
 */
export async function resolveByTcVersionId(
  db: Db,
  pariwarId: PariwarId,
  tcVersionId: TcVersionId,
): Promise<TcVersionRow | null> {
  const rows = await db
    .select()
    .from(termsAndConditionsVersions)
    .where(
      and(
        eq(termsAndConditionsVersions.pariwarId, pariwarId),
        eq(termsAndConditionsVersions.tcVersionId, tcVersionId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The latest version row by `version` REGARDLESS of effective window / status —
 * the structural "head" the create path uses to compute the next monotonic
 * version (`(latest?.version ?? 0) + 1`). Not the AC4 effective resolver.
 */
export async function latestTcVersion(
  db: Db,
  pariwarId: PariwarId,
): Promise<TcVersionRow | null> {
  const rows = await db
    .select()
    .from(termsAndConditionsVersions)
    .where(eq(termsAndConditionsVersions.pariwarId, pariwarId))
    .orderBy(desc(termsAndConditionsVersions.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The currently OPEN-ENDED version (`effective_until IS NULL`) for the Pariwar, if
 * any — the single row guarded by the partial-unique index. Used by the create
 * path to decide genesis-vs-staged and by the approve route to find the prior
 * currently-effective version to supersede. Distinct from `getEffectiveTc` (which
 * additionally requires `effective_from <= now`): a freshly created genesis version
 * with a future `effective_from` is open-ended but not yet effective.
 */
export async function currentOpenTcVersion(
  db: Db,
  pariwarId: PariwarId,
): Promise<TcVersionRow | null> {
  const rows = await db
    .select()
    .from(termsAndConditionsVersions)
    .where(
      and(
        eq(termsAndConditionsVersions.pariwarId, pariwarId),
        isNull(termsAndConditionsVersions.effectiveUntil),
      ),
    )
    .orderBy(desc(termsAndConditionsVersions.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Story 1.14 forced-pagination list of versions for a Pariwar, newest `version`
 * first. (No trustee read endpoint ships in 2.6 — this is the audit/test read +
 * the substrate Story 2.7/Epic 3 will consume.)
 */
export async function listTcVersions(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<TcVersionRow[]> {
  return db
    .select()
    .from(termsAndConditionsVersions)
    .where(eq(termsAndConditionsVersions.pariwarId, pariwarId))
    .orderBy(desc(termsAndConditionsVersions.version))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

/**
 * The `clause_version_id`s pinned to a T&C version (AC1/AC2), read from the
 * junction table in insertion order. The API folds these into the flat
 * `pinnedToClauseVersionIds` array of the wire response (the link table is an
 * internal storage detail; the contract stays array-shaped).
 */
export async function listPinnedClauses(
  db: Db,
  pariwarId: PariwarId,
  tcVersionId: TcVersionId,
): Promise<ClauseVersionId[]> {
  const rows = await db
    .select({ clauseVersionId: termsAndConditionsPinnedClauses.clauseVersionId })
    .from(termsAndConditionsPinnedClauses)
    .where(
      and(
        eq(termsAndConditionsPinnedClauses.pariwarId, pariwarId),
        eq(termsAndConditionsPinnedClauses.tcVersionId, tcVersionId),
      ),
    )
    .orderBy(asc(termsAndConditionsPinnedClauses.createdAt));
  return rows.map((r) => r.clauseVersionId);
}

// Niyamavali registry write path — Story 2.3 (Task 6; AC3, AC4, AC5, AC6).
//
// create / amend / split / merge / deprecate. Mirrors the
// `pariwar-passport/write.ts` narrow-write posture: NO HTTP, NO auth (those are
// the Story 2.4 route). The typed `ClauseIdConflictError` is the 409 seam.
//
// ── Transaction contract ─────────────────────────────────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do NOT
// open their own transaction. Atomicity (amend writes three rows) comes from the
// CALLER's transaction, which is MANDATORY anyway: RLS scope (`SET LOCAL
// app.pariwar_id`) is transaction-scoped, so any scoped caller is already inside
// a transaction — `withPariwarScope` (db.ts) opens it on the route path; the
// per-test harness opens it in tests. A non-transactional caller would lose
// multi-row atomicity (and could not have set scope), so it is out of contract.
//
// ── Domain-level immutability guard (Dev Notes §"clause_versions is NOT fully
// append-only") ──────────────────────────────────────────────────────────────
// These functions NEVER UPDATE `payload` / `clause_id` / `version` on an existing
// row — amendments INSERT a new version; the only UPDATEs are
// `superseded_by_version` (amend) + `deprecated_at` (deprecate), the two
// legitimately-mutable columns. So historical immutability holds by construction
// at the domain layer. A column-restricted Postgres trigger guarding those three
// columns against UPDATE is deferred to Story 2.4 (deferred-work.md).

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { clauseId as assertClauseIdFormat } from '../ids/index.js';
import type { ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import {
  type ClausePayload,
  type ClauseVersionInsert,
  type ClauseVersionRow,
  clauseVersions,
} from '../schema/clause_versions.js';
import {
  type AffectedMemberScope,
  type NiyamavaliAmendmentRow,
  niyamavaliAmendments,
} from '../schema/niyamavali_amendments.js';
import { computePayloadDiff } from './diff.js';
import { ClauseIdConflictError, ClauseNotFoundError } from './errors.js';
import { latestVersionRow } from './read.js';
import { assertAffectedMemberScope } from './scope.js';

/** The benefit-mechanism discriminator value (`'pool' | 'reserve'`), from the schema. */
type BenefitMechanism = NonNullable<ClauseVersionInsert['benefitMechanism']>;

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

interface NewClauseFields {
  clauseId: ClauseId;
  effectiveDate: Date;
  payload: ClausePayload;
  benefitMechanism: BenefitMechanism;
  authoredByActor?: string | null;
  auditId?: string | null;
  /**
   * Optional caller-supplied row address. Defaults to the DB `gen_random_uuid()`.
   * The Story 2.4 audited publish path PRE-GENERATES this so the `audit_id`-bearing
   * audit line (written FIRST, before this insert — the amendment ledger is
   * append-only so its `audit_id` cannot be back-filled) can reference the exact
   * `clause_version_id` in its provenance (AC2). 2.3 call sites omit it.
   */
  clauseVersionId?: ClauseVersionId;
}

/**
 * Insert a clause's first version (version = 1) within the caller's transaction.
 * Validates the clause-id format, pre-checks per-Pariwar uniqueness (→ typed
 * `ClauseIdConflictError`), and maps a racing DB unique-violation to the same
 * typed error. Shared by createClause / splitClause / mergeClauses.
 */
async function insertClauseV1(
  db: Db,
  pariwarId: PariwarId,
  fields: NewClauseFields,
  predecessorClauseIds: ClauseVersionId[],
): Promise<ClauseVersionRow> {
  assertClauseIdFormat(fields.clauseId); // defense-in-depth (AC2 format)

  const existing = await latestVersionRow(db, pariwarId, fields.clauseId);
  if (existing) throw new ClauseIdConflictError(pariwarId, fields.clauseId);

  const inserted = await db
    .insert(clauseVersions)
    .values({
      // `undefined` → omitted → DB default gen_random_uuid() (2.3 behaviour);
      // a caller-supplied id (2.4 audited publish) is used verbatim.
      clauseVersionId: fields.clauseVersionId ?? undefined,
      clauseId: fields.clauseId,
      pariwarId,
      version: 1,
      effectiveDate: fields.effectiveDate,
      payload: fields.payload,
      benefitMechanism: fields.benefitMechanism,
      predecessorClauseIds,
      authoredByActor: fields.authoredByActor ?? null,
      auditId: fields.auditId ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error(
      `[insertClauseV1] insert returned no row for clause_id ${fields.clauseId} — check session scope`,
    );
  }
  return row;
}

// ── createClause (AC3) ───────────────────────────────────────────────────────

export interface CreateClauseInput extends NewClauseFields {
  pariwarId: PariwarId;
}

/**
 * Create a brand-new clause at version 1 with EMPTY predecessors (AC3). Validates
 * the `clause_id` format + per-Pariwar uniqueness; raises `ClauseIdConflictError`
 * (the 409 seam) if the `clause_id` is already allocated for the Pariwar.
 */
export async function createClause(db: Db, input: CreateClauseInput): Promise<ClauseVersionRow> {
  const { pariwarId, ...fields } = input;
  try {
    return await insertClauseV1(db, pariwarId, fields, []);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ClauseIdConflictError(pariwarId, input.clauseId);
    throw err;
  }
}

// ── amendClause (AC4) ────────────────────────────────────────────────────────

export interface AmendClauseInput {
  pariwarId: PariwarId;
  clauseId: ClauseId;
  /** The NEW payload (diffed against the prior version's payload). */
  payload: ClausePayload;
  /** The new version's effective instant (DB-authoritative point-in-time). */
  effectiveDate: Date;
  /** REQUIRED scope declaration (architecture §1.10) — validated before persist. */
  affectedMemberScope: AffectedMemberScope;
  /** Defaults to the prior version's mechanism when omitted. */
  benefitMechanism?: BenefitMechanism;
  authoredByActor?: string | null;
  auditId?: string | null;
  /**
   * Optional caller-supplied new-version row address (defaults to DB
   * gen_random_uuid()). The Story 2.4 audited publish PRE-GENERATES it so the
   * audit line — written first, then passed as `auditId` so the append-only
   * amendment row carries it at INSERT (AC5) — can reference the exact
   * `clause_version_id` (AC2). 2.3 call sites omit it.
   */
  clauseVersionId?: ClauseVersionId;
}

export interface AmendClauseResult {
  /** The newly inserted version row. */
  version: ClauseVersionRow;
  /** The amendment ledger row (diff + scope). */
  amendment: NiyamavaliAmendmentRow;
}

/**
 * Amend an existing clause (AC4): insert a new version (same `clause_id`,
 * `version + 1`, predecessor = the prior version's `clause_version_id`), point the
 * prior row's `superseded_by_version` at it, AND persist the structured-payload
 * diff as a `niyamavali_amendments` row carrying the validated affected-member
 * scope. All three writes are one transaction.
 */
export async function amendClause(db: Db, input: AmendClauseInput): Promise<AmendClauseResult> {
  const scope = assertAffectedMemberScope(input.affectedMemberScope); // §1.10 — reject malformed

  const prior = await latestVersionRow(db, input.pariwarId, input.clauseId);
  if (!prior) throw new ClauseNotFoundError(input.pariwarId, input.clauseId);
  if (prior.deprecatedAt) throw new ClauseNotFoundError(input.pariwarId, input.clauseId);

  const diff = computePayloadDiff(prior.payload, input.payload);

  const insertedVersions = await db
    .insert(clauseVersions)
    .values({
      clauseVersionId: input.clauseVersionId ?? undefined,
      clauseId: input.clauseId,
      pariwarId: input.pariwarId,
      version: prior.version + 1,
      effectiveDate: input.effectiveDate,
      payload: input.payload,
      benefitMechanism: input.benefitMechanism ?? prior.benefitMechanism,
      predecessorClauseIds: [prior.clauseVersionId],
      authoredByActor: input.authoredByActor ?? null,
      auditId: input.auditId ?? null,
    })
    .returning();
  const newVersion = insertedVersions[0];
  if (!newVersion) {
    throw new Error('[amendClause] version insert returned no row — check session scope');
  }

  // Point the prior version forward (AC4) — a legitimately-mutable column.
  const updatedPrior = await db
    .update(clauseVersions)
    .set({ supersededByVersion: newVersion.clauseVersionId })
    .where(eq(clauseVersions.clauseVersionId, prior.clauseVersionId))
    .returning();
  if (!updatedPrior[0]) {
    throw new Error('[amendClause] prior-version supersededByVersion UPDATE matched no row — check session scope');
  }

  const insertedAmendments = await db
    .insert(niyamavaliAmendments)
    .values({
      pariwarId: input.pariwarId,
      fromClauseVersionId: prior.clauseVersionId,
      toClauseVersionId: newVersion.clauseVersionId,
      diffDocument: diff,
      affectedMemberScope: scope,
      auditId: input.auditId ?? null,
    })
    .returning();
  const amendment = insertedAmendments[0];
  if (!amendment) {
    throw new Error('[amendClause] amendment insert returned no row — check session scope');
  }

  return { version: newVersion, amendment };
}

// ── splitClause / mergeClauses (AC5) ─────────────────────────────────────────

export interface SplitClauseInput {
  pariwarId: PariwarId;
  /** The clause being split (one → many). */
  sourceClauseId: ClauseId;
  /** The new clauses created from the split; each gets the source as predecessor. */
  newClauses: NewClauseFields[];
}

/**
 * Split one clause into many (AC5). Each new clause is created at version 1 with
 * `predecessor_clause_ids = [the source clause's latest clause_version_id]`. Atomic.
 */
export async function splitClause(db: Db, input: SplitClauseInput): Promise<ClauseVersionRow[]> {
  if (input.newClauses.length === 0) throw new Error('[splitClause] requires at least one new clause');

  const source = await latestVersionRow(db, input.pariwarId, input.sourceClauseId);
  if (!source) throw new ClauseNotFoundError(input.pariwarId, input.sourceClauseId);

  const created: ClauseVersionRow[] = [];
  for (const fields of input.newClauses) {
    try {
      created.push(await insertClauseV1(db, input.pariwarId, fields, [source.clauseVersionId]));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ClauseIdConflictError(input.pariwarId, fields.clauseId);
      throw err;
    }
  }
  return created;
}

export interface MergeClausesInput {
  pariwarId: PariwarId;
  /** The clauses being merged (many → one). */
  sourceClauseIds: ClauseId[];
  /** The single new clause produced by the merge. */
  newClause: NewClauseFields;
}

/**
 * Merge many clauses into one (AC5). The new clause is created at version 1 with
 * `predecessor_clause_ids = [each source clause's latest clause_version_id]`. Atomic.
 */
export async function mergeClauses(db: Db, input: MergeClausesInput): Promise<ClauseVersionRow> {
  if (input.sourceClauseIds.length === 0) throw new Error('[mergeClauses] requires at least one source clause');
  const uniqueSourceIds = [...new Set(input.sourceClauseIds)];
  if (uniqueSourceIds.length !== input.sourceClauseIds.length) {
    throw new Error('[mergeClauses] sourceClauseIds contains duplicates');
  }
  try {
    const predecessors: ClauseVersionId[] = [];
    for (const sourceClauseId of uniqueSourceIds) {
      const source = await latestVersionRow(db, input.pariwarId, sourceClauseId);
      if (!source) throw new ClauseNotFoundError(input.pariwarId, sourceClauseId);
      predecessors.push(source.clauseVersionId);
    }
    return await insertClauseV1(db, input.pariwarId, input.newClause, predecessors);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ClauseIdConflictError(input.pariwarId, input.newClause.clauseId);
    throw err;
  }
}

// ── deprecateClause (AC6) ────────────────────────────────────────────────────

export interface DeprecateClauseInput {
  pariwarId: PariwarId;
  clauseId: ClauseId;
  /** Defaults to DB now() (DB-authoritative time). */
  deprecatedAt?: Date;
}

/**
 * Deprecate a clause (AC6): set `deprecated_at` on the LATEST version row. The
 * `clause_id` is never reused (the create path rejects re-allocation) and remains
 * resolvable by `clause_version_id` (audit history preserved). Returns the updated
 * latest row.
 */
export async function deprecateClause(
  db: Db,
  input: DeprecateClauseInput,
): Promise<ClauseVersionRow> {
  const latest = await latestVersionRow(db, input.pariwarId, input.clauseId);
  if (!latest) throw new ClauseNotFoundError(input.pariwarId, input.clauseId);
  if (latest.deprecatedAt) {
    throw new Error(
      `[deprecateClause] clause_id '${input.clauseId}' is already deprecated — ` +
        `original deprecation timestamp must not be overwritten`,
    );
  }

  const updated = await db
    .update(clauseVersions)
    .set({ deprecatedAt: input.deprecatedAt ?? sql`now()` })
    .where(
      and(
        eq(clauseVersions.pariwarId, input.pariwarId),
        eq(clauseVersions.clauseVersionId, latest.clauseVersionId),
      ),
    )
    .returning();

  const row = updated[0];
  if (!row) {
    throw new Error('[deprecateClause] update returned no row — check session scope');
  }
  return row;
}

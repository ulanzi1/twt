// Versioned geo-tree registry — Story 1.18 (Task 3; AC1, AC2).
//
// The Story 2.3 `clause_versions` immutability posture (via its `helpdesk/registry.ts` twin)
// applied to geography: a tree update INSERTs a new version row; prior rows are never mutated
// except the `superseded_by_version` forward-pointer. NO HTTP, NO auth (Story 1.18 ships no writer
// surface at all); runs on the CALLER's transaction; the typed `GeoTreeVersionConflictError` is the
// 409 seam.
//
// ── ⭐ NO CODE DEFAULT — the one divergence from the routing-policy precedent ────────────────────
// `helpdesk/registry.ts` ships `DEFAULT_ROUTING_POLICY` and its overrides start at version 2. There
// is NO default geography (ADR-0038 / Decision `2026-08-12-102`), so a Pariwar's own versions start
// at **1**, and `loadGeoTree` returns **`null`** when no row exists. A `null` tree means the caller
// passes NO resolver, so `scopeContains` falls back to `denyDeeperGeoResolver` — today's behaviour,
// byte-identical, by construction. ⛔ Never invent a fallback tree here. A wrong tree silently
// GRANTS; an absent tree merely denies.
//
// ── ⛔ THIS IS THE ONLY FILE IN `geo-tree/` THAT TOUCHES A DATABASE ─────────────────────────────
// The resolver (`resolver.ts`) is pure and synchronous because `hasPermission` is (AC2). The split
// is the whole design: `loadGeoTree` runs ONCE PER REQUEST in the scope-resolution middleware,
// beside `request.scopeGrants`, and `createGeoTreeResolver` closes over the result. Do not merge
// these two modules, and do not import `Db` into `resolver.ts`.

import { and, desc, eq, lte, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { GeoTreeVersionId, PariwarId, UserId } from '../ids/index.js';
import {
  geoTreeVersions,
  type GeoTreeDocumentJson,
  type GeoTreeNodeJson,
  type GeoTreeVersionRow,
} from '../schema/geo_tree_versions.js';
import { assertValidGeoTreeDocument } from './document.js';
import { GeoTreeEffectiveAtOutOfOrderError, GeoTreeVersionConflictError } from './errors.js';
import { buildGeoTree, type LoadedGeoTree } from './resolver.js';

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). The 23505 lives on
 *  `err.cause.code` when the driver wraps it — [[project_domain_limit_clamp_and_savepoint_retry]]. */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/** The resolved in-force tree — the version + its document. `null` from `loadGeoTree` means the
 *  Pariwar has published NO tree, which is a first-class answer, not a degraded one. */
export interface GeoTreeInForce {
  version: number;
  document: GeoTreeDocumentJson;
}

/**
 * Resolve the tree document IN FORCE for a Pariwar at instant `at`. Returns the Pariwar's latest
 * version with `effective_at <= at`, or `null` if it has published none. Runs on the caller's
 * (scoped) transaction; RLS isolates to the Pariwar's own rows.
 */
export async function geoTreeVersionInForce(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<GeoTreeInForce | null> {
  const rows = await db
    .select({ version: geoTreeVersions.version, treeDocument: geoTreeVersions.treeDocument })
    .from(geoTreeVersions)
    .where(and(eq(geoTreeVersions.pariwarId, pariwarId), lte(geoTreeVersions.effectiveAt, at)))
    .orderBy(desc(geoTreeVersions.effectiveAt), desc(geoTreeVersions.version))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { version: row.version, document: row.treeDocument };
}

/**
 * ⭐ THE PER-REQUEST LOADER (AC2). Reads the in-force tree and materializes the in-memory structure
 * a pure resolver closes over. Returns `null` when the Pariwar has published no tree — the caller
 * then passes NO resolver and `denyDeeperGeoResolver` applies.
 *
 * ⛔ Call this ONCE PER REQUEST (in `apps/api/src/middleware/scope-resolution/`), never per
 * permission check. A permission check is a pure synchronous predicate and must not await anything.
 */
export async function loadGeoTree(
  db: Db,
  pariwarId: PariwarId,
  at: Date = new Date(),
): Promise<LoadedGeoTree | null> {
  const inForce = await geoTreeVersionInForce(db, pariwarId, at);
  if (!inForce) return null;
  return buildGeoTree(inForce.document);
}

/**
 * Reconstruct the exact tree document for a `(pariwarId, version)` — the replay/audit path. Returns
 * `null` if that version is absent. ⚠ Unlike `routingPolicyDocumentForVersion`, there is no
 * special-cased version 1: no code constant owns any version here.
 */
export async function geoTreeDocumentForVersion(
  db: Db,
  pariwarId: PariwarId,
  version: number,
): Promise<GeoTreeDocumentJson | null> {
  const rows = await db
    .select({ treeDocument: geoTreeVersions.treeDocument })
    .from(geoTreeVersions)
    .where(and(eq(geoTreeVersions.pariwarId, pariwarId), eq(geoTreeVersions.version, version)))
    .limit(1);
  return rows[0]?.treeDocument ?? null;
}

export interface CreateGeoTreeVersionInput {
  pariwarId: PariwarId;
  /** The flat node list (the caller-authored document body). The document's `version` is derived
   *  from the authoritative next version, never taken from the caller. */
  nodes: GeoTreeNodeJson[];
  /** The version's effective instant (DB-authoritative point-in-time). Defaults to DB `now()`. */
  effectiveAt?: Date;
  /** WHO authored it, or null for system. */
  authoredByActor?: UserId | null;
  /** The audit anchor for the write (the Story 2.4 pre-generate pattern). The audit LINE itself is
   *  the CALLER's obligation — the narrow-write posture. */
  auditId?: string | null;
  /** Optional caller-supplied row id (defaults to DB gen_random_uuid()). */
  id?: GeoTreeVersionId;
}

/**
 * Publish the next tree version for a Pariwar. Validates the document, INSERTs a new version row
 * (`version = (latest ?? 0) + 1`, so a Pariwar's FIRST tree is version 1) and points the prior
 * latest row's `superseded_by_version` forward — all in the caller's transaction. NEVER mutates a
 * prior row's `tree_document`/`version` (immutability by construction). Serves BOTH the
 * publish-first and the amend paths (append-only makes them identical).
 *
 * ⚠ PUBLISHING A TREE WIDENS AUTHORIZATION. A Pariwar publishing `Patna ∈ Bihar` thereby lets every
 * `state=Bihar` grant reach Patna-scoped targets. That is the intended capability and the reason
 * geography is DECLARED per tenant rather than assumed — but a caller wiring this to a surface owes
 * that surface an authorization gate and an audit line of its own. Story 1.18 ships no such
 * surface.
 *
 * @throws GeoTreeDocumentInvalidError on a malformed document (cycles, rank inversions, dangling
 *   parents, duplicates). ⛔ It CANNOT catch a factually wrong edge — see `document.ts`.
 * @throws GeoTreeEffectiveAtOutOfOrderError if `effectiveAt` precedes the Pariwar's latest version.
 * @throws GeoTreeVersionConflictError on a racing duplicate `(pariwar_id, version)` (the 409 seam).
 */
export async function createGeoTreeVersion(
  db: Db,
  input: CreateGeoTreeVersionInput,
): Promise<GeoTreeVersionRow> {
  // The Pariwar's current latest version + its effectiveAt (null → none yet).
  const priorRows = await db
    .select({ version: geoTreeVersions.version, effectiveAt: geoTreeVersions.effectiveAt })
    .from(geoTreeVersions)
    .where(eq(geoTreeVersions.pariwarId, input.pariwarId))
    .orderBy(desc(geoTreeVersions.version))
    .limit(1);
  const priorRow = priorRows[0];
  const priorVersion = priorRow?.version ?? null;
  const nextVersion = (priorVersion ?? 0) + 1;

  // Validate the document AS IT WILL BE STORED (with its authoritative version), so the stored
  // `version` field is covered by the same check as everything else.
  const document: GeoTreeDocumentJson = { version: nextVersion, nodes: input.nodes };
  assertValidGeoTreeDocument(document);

  // DB-authoritative "now" (never the application server's clock, which is subject to skew across
  // instances) — used both as the default `effectiveAt` and as the reference for the order check.
  const nowResult = await db.execute<{ now: Date }>(sql`select now() as now`);
  const dbNow = nowResult.rows[0]?.now ?? new Date();
  const effectiveAt = input.effectiveAt ?? dbNow;

  if (priorRow && effectiveAt.getTime() < priorRow.effectiveAt.getTime()) {
    throw new GeoTreeEffectiveAtOutOfOrderError(input.pariwarId, effectiveAt, priorRow.effectiveAt);
  }

  let inserted: GeoTreeVersionRow | undefined;
  try {
    const rows = await db
      .insert(geoTreeVersions)
      .values({
        id: input.id ?? undefined,
        pariwarId: input.pariwarId,
        version: nextVersion,
        effectiveAt,
        treeDocument: document,
        authoredByActor: input.authoredByActor ?? null,
        auditId: input.auditId ?? null,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) throw new GeoTreeVersionConflictError(input.pariwarId, nextVersion);
    throw err;
  }
  if (!inserted) {
    // Under RLS a missing scope silently filters the INSERT to 0 rows — surface it rather than
    // return a phantom (the `createRoutingPolicyVersion` precedent).
    throw new Error(
      '[createGeoTreeVersion] INSERT returned no row — check the tx has app.pariwar_id scope set',
    );
  }

  // Point the prior latest forward (the ONLY legitimately-mutable column).
  if (priorVersion !== null) {
    await db
      .update(geoTreeVersions)
      .set({ supersededByVersion: nextVersion })
      .where(
        and(
          eq(geoTreeVersions.pariwarId, input.pariwarId),
          eq(geoTreeVersions.version, priorVersion),
        ),
      );
  }

  return inserted;
}

/** The amend path is the SAME append-a-version operation as publish (append-only versioning makes
 *  them identical). Named separately for call-site intent — the `amendRoutingPolicyVersion` twin. */
export const amendGeoTreeVersion = createGeoTreeVersion;

/** Count a Pariwar's tree versions (test/diagnostic helper; own-committing suites assert
 *  membership, not counts — [[project_live_db_test_gotchas]]). */
export async function countGeoTreeVersions(db: Db, pariwarId: PariwarId): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(geoTreeVersions)
    .where(eq(geoTreeVersions.pariwarId, pariwarId));
  return rows[0]?.n ?? 0;
}

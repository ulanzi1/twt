// `geo_tree_versions` table — Story 1.18 (Task 3; AC1, AC7).
//
// The versioned, per-Pariwar organizational-tree registry — the Story 2.3 `clause_versions`
// immutability posture (via its `helpdesk_routing_policy_versions` twin) applied to geography. A
// tree update INSERTs a NEW version row; prior rows are NEVER mutated except the
// `superseded_by_version` forward-pointer.
//
// ── ⭐ THERE IS NO CODE DEFAULT. A Pariwar with no row has NO TREE ─────────────────────────────
// This is the ONE deliberate divergence from the `helpdesk_routing_policy_versions` precedent,
// which DOES ship a `DEFAULT_ROUTING_POLICY` code constant owning version 1. Geography ships
// nothing (ADR-0038 / Decision `2026-08-12-102`), on the asymmetry of the two failure modes:
//
//   · A WRONG tree silently GRANTS authority — no error, no log, no denial to notice.
//   · An ABSENT tree merely DENIES, visibly, as a 403.
//
// There is no universally-correct Indian state→district→block tree, and the tenant model puts each
// Pariwar ABOVE its geography, so a seeded guess is the one option that can make the system LESS
// safe than shipping nothing. Consequently a Pariwar's own versions start at **1** (not 2 — no code
// constant owns version 1 here), the loader returns `null` when no row exists, the caller passes no
// resolver, and `denyDeeperGeoResolver` applies. **Today's behaviour, byte-identical, by
// construction.**
//
// ── Why a DOCUMENT and not a row-per-node table ────────────────────────────────────────────────
// `hasPermission` is a PURE, side-effect-free predicate (ADR-0008 Decision 8) and
// `GeoTreeResolver.contains` is SYNCHRONOUS by interface (`rbac/scope.ts:161-163`), so the resolver
// cannot query. The tree must be in memory BEFORE the check. A `geo_nodes` row-per-node table
// models the same information faithfully but costs an N-query walk or a recursive CTE PER REQUEST;
// the single-document read is what makes purity cheap. ADR-0038 records the revisit trigger.
//
// ── ⛔ THIS TABLE IS AN AUTHORIZATION INPUT ────────────────────────────────────────────────────
// A leaked org tree is a leaked authorization input, so it carries tenant RLS
// (`policies/geo-tree-versions-rls.ts`) AND joins the adversarial cross-Pariwar must-return-0 set.
// Its module also sits under a `governance_boundary.yaml` prohibited root — no feature-flag
// evaluation may reach the resolver, the loader, or the injection site (prohibition (d): a
// flag-conditioned permission check is a privilege escalation with a config-shaped switch on it).
//
// JSONB inner keys are snake_case — the `clause_versions` / `helpdesk_routing_policy_versions`
// convention. ⚠ This table has NO `@twt/contracts` wire shape: Story 1.18 ships no writer surface
// and no route, so there is nothing to keep in sync yet. A future publishing surface owns that DTO.

import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { GeoTreeVersionId, PariwarId, UserId } from '../ids/index.js';

/**
 * The geo dimensions that can appear as a NODE in a published tree.
 *
 * ⛔ `pariwar` is deliberately absent, and its absence is load-bearing rather than an oversight:
 * `scopeContains` returns `true` for ANY pariwar-dimension grant at `rbac/scope.ts:236` — BEFORE
 * the resolver is consulted — so a pariwar node could never be reached, and putting one in the
 * document would create a second, contradicting answer to a question already settled upstream.
 * `global` and `self` are excluded for the same class of reason and are additionally excluded from
 * `GeoNode` BY TYPE (`rbac/scope.ts:149`); `self` is orthogonal to the geo tree by design
 * (`rbac/scope.ts:50-55`) — own records only, not a node in it.
 *
 * ⇒ The resolver therefore only ever sees three edge kinds: `state→district`, `state→block`,
 * `district→block`. That is the entire surface.
 */
export const GEO_TREE_NODE_DIMENSIONS = ['state', 'district', 'block'] as const;

/** A dimension a published geo-tree node may sit at. */
export type GeoTreeNodeDimension = (typeof GEO_TREE_NODE_DIMENSIONS)[number];

/**
 * One node in a published tree (JSONB, snake_case). A flat edge list with parent pointers, NOT a
 * nested structure — the resolver answers "is X beneath Y" by walking UP from the descendant, so
 * parent pointers are the direction actually read, and a flat list validates without recursion.
 *
 * `parent_dimension`/`parent_value` are both `null` for a root node (a `state`, ordinarily). They
 * move together: one null and one set is a malformed node and is rejected.
 *
 * ⚠ A node may sit directly under a grandparent — `{block, parent: state}` is legitimate, because
 * `scopeContains` genuinely asks `state ⊇ block` and a Pariwar whose administration skips the
 * district level should not be forced to invent one. The validator enforces STRICTLY BROADER by
 * `GEO_RANK`, not "exactly one level up".
 */
export interface GeoTreeNodeJson {
  dimension: GeoTreeNodeDimension;
  value: string;
  parent_dimension: GeoTreeNodeDimension | null;
  parent_value: string | null;
}

/**
 * A published tree document (JSONB) — the version pin + the flat node list. Mirrors the
 * `RoutingPolicyDocumentJson` shape deliberately: `version` is duplicated inside the document so a
 * document lifted out of its row still identifies itself.
 */
export interface GeoTreeDocumentJson {
  version: number;
  nodes: GeoTreeNodeJson[];
}

export const geoTreeVersions = pgTable(
  'geo_tree_versions',
  {
    // Per-row address (UUID). DB-defaulted, or PRE-GENERATED by an audited write (the Story 2.4
    // pattern). Branded `GeoTreeVersionId`. The exact-document replay pin.
    id: uuid('id').defaultRandom().primaryKey().$type<GeoTreeVersionId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`. Each Pariwar owns its OWN subtree —
    // `GEO_RANK` puts `pariwar: 1` ABOVE `state: 2`, so there is no cross-Pariwar national tree and
    // no cross-readable sentinel row.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonic per pariwar_id, starting at 1. ⚠ Starts at 1, NOT 2 — unlike routing policy, no
    // code constant owns version 1 (there is no default geography). The (pariwar_id, version)
    // unique index is the guard.
    version: integer('version').notNull(),

    // The version's effective instant — `geoTreeVersionInForce(pariwarId, at)` resolves the latest
    // row with effective_at <= at (DB-authoritative point-in-time).
    effectiveAt: timestamp('effective_at', { withTimezone: true, mode: 'date' }).notNull(),

    // The flat node list (opaque JSONB — the resolver interprets it, the table stores it).
    treeDocument: jsonb('tree_document').notNull().$type<GeoTreeDocumentJson>(),

    // WHO authored this version (NON-PII controlled-staff attribution); null = system/seed.
    authoredByActor: uuid('authored_by_actor').$type<UserId>(),

    // The audit line for the write. Nullable — a plain reference, not an FK.
    auditId: uuid('audit_id'),

    // The immutability forward-pointer (the ONLY legitimately-mutable column, clause_versions
    // twin): set on the PRIOR row when a new version is created. Points to the successor's
    // `version` int (self-referential within the same pariwar_id). Null = this is the latest.
    supersededByVersion: integer('superseded_by_version'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The per-Pariwar monotonic version guard (a duplicate version is a 23505, never an update).
    uniqueIndex('geo_tree_versions_pariwar_version_uq').on(t.pariwarId, t.version),
    // In-force resolution scans per (tenant, effective_at).
    index('geo_tree_versions_pariwar_effective_idx').on(t.pariwarId, t.effectiveAt),
  ],
);

export type GeoTreeVersionRow = typeof geoTreeVersions.$inferSelect;
export type GeoTreeVersionInsert = typeof geoTreeVersions.$inferInsert;

// Geo-tree document validation — Story 1.18 (Task 3).
//
// PURE. Runs at WRITE time, before a document is persisted, and collects EVERY reason rather than
// throwing on the first — a publisher fixing a tree wants the whole list.
//
// ── ⛔ WHAT VALIDATION CANNOT DO, STATED SO NOBODY ASSUMES OTHERWISE ────────────────────────────
// It rejects STRUCTURAL faults: malformed nodes, dangling parents, rank inversions, duplicates and
// cycles. It CANNOT reject a factually wrong edge — `Patna ∈ Kerala` is perfectly well-formed and
// will be accepted. That residual risk is accepted and recorded in ADR-0038; the mitigation is that
// publishing a tree is an explicit, versioned, append-only act, not an inferred one, and that
// publishing one WIDENS AUTHORIZATION (a Pariwar publishing `Patna ∈ Bihar` thereby lets every
// `state=Bihar` grant reach Patna-scoped targets).

import {
  GEO_TREE_NODE_DIMENSIONS,
  type GeoTreeDocumentJson,
  type GeoTreeNodeJson,
} from '../schema/geo_tree_versions.js';
import { GeoTreeDocumentInvalidError } from './errors.js';
import { GEO_TREE_NODE_RANK, isGeoTreeNodeDimension } from './resolver.js';

/** Node values are free `text`; this is a sanity ceiling against a typo'd absurd value, not policy.
 *  Mirrors the `MAX_TARGET_ROLE_LENGTH` posture in `helpdesk/registry.ts`. */
const MAX_NODE_VALUE_LENGTH = 128;

/** A sanity ceiling on document size. A Pariwar's own subtree is a district/block list, not a
 *  national gazetteer — and the document is read into memory ONCE PER REQUEST (AC2), so its size is
 *  a request-path cost. ADR-0038 records the revisit trigger if a tree ever outgrows this. */
const MAX_NODES = 5000;

/** The composite identity of a node, for duplicate detection. */
function identity(node: GeoTreeNodeJson): string {
  return `${node.dimension} ${node.value}`;
}

/**
 * Validate a caller-authored tree document. Returns the list of reasons it is invalid — EMPTY means
 * valid. PURE; no throw (see {@link assertValidGeoTreeDocument} for the throwing wrapper).
 *
 * The checks, in order:
 *
 *  1. **Size** — non-empty, within `MAX_NODES`.
 *  2. **Node shape** — a valid `dimension`, a non-empty `value` within the length ceiling, and
 *     `parent_dimension`/`parent_value` that move TOGETHER (one null and one set is malformed).
 *  3. **⭐ Uniqueness of `(dimension, value)` ACROSS THE WHOLE DOCUMENT.** This is STRONGER than
 *     "no duplicate values at the same dimension under one parent", and the strengthening is forced
 *     by the grant model rather than chosen for tidiness: a `GrantScope` carries only
 *     `(dimension, value)` and NO PATH (`rbac/scope.ts:131-134`), so two districts both named
 *     "Patna" under different states are INDISTINGUISHABLE to `scopeContains` — the model cannot
 *     express which one a grant means. Accepting such a document would make authorization depend on
 *     map insertion order. Rejecting it at write time is the only honest option; the alternative is
 *     a path-carrying grant model, which is freeze row 9.
 *  4. **Dangling parents** — a parent must exist as a node in the same document.
 *  5. **Rank** — a parent must be STRICTLY BROADER than its child by `GEO_TREE_NODE_RANK`. Note
 *     "strictly broader", NOT "exactly one level up": `{block, parent: state}` is legitimate,
 *     because a Pariwar whose administration skips the district level should not have to invent one.
 *  6. **Cycles** — an explicit walk. ⚠ Check (5) already makes a cycle structurally impossible
 *     (rank strictly decreases going up, and rank is bounded), so this is defence-in-depth against a
 *     future change to the dimension set, not a live second line of defence today. It is kept
 *     because the resolver's runtime bound is a HANG guard, not a correctness guard, and something
 *     should be asserting this property on purpose.
 */
export function validateGeoTreeDocument(document: GeoTreeDocumentJson): string[] {
  const reasons: string[] = [];
  const nodes = document.nodes;

  // (1) Size.
  if (!Array.isArray(nodes) || nodes.length === 0) {
    reasons.push('nodes must be a non-empty array');
    return reasons; // nothing further is meaningful
  }
  if (nodes.length > MAX_NODES) {
    reasons.push(`nodes must contain at most ${String(MAX_NODES)} entries (got ${String(nodes.length)})`);
  }
  if (!Number.isInteger(document.version) || document.version < 1) {
    reasons.push('version must be a positive integer');
  }

  // (2) Node shape + (3) uniqueness.
  const seen = new Set<string>();
  const present = new Set<string>();
  for (const [i, node] of nodes.entries()) {
    if (!isGeoTreeNodeDimension(node.dimension)) {
      reasons.push(
        `node[${String(i)}].dimension '${String(node.dimension)}' is not a geo-tree node dimension ` +
          `(expected one of ${GEO_TREE_NODE_DIMENSIONS.join(', ')} — 'pariwar' is answered before ` +
          'the resolver at rbac/scope.ts:236 and is deliberately not a node)',
      );
      continue;
    }
    if (typeof node.value !== 'string' || node.value.length === 0) {
      reasons.push(`node[${String(i)}].value must be a non-empty string`);
      continue;
    }
    if (node.value.length > MAX_NODE_VALUE_LENGTH) {
      reasons.push(`node[${String(i)}].value must be at most ${String(MAX_NODE_VALUE_LENGTH)} characters`);
    }
    // ⛔ No trimming, no case-folding, ANYWHERE — the resolver compares byte-identically to
    // `rbac/scope.ts:241`. But a value that is only whitespace is a typo, not a node.
    if (node.value.trim().length === 0) {
      reasons.push(`node[${String(i)}].value must not be blank`);
    }

    const hasDim = node.parent_dimension !== null && node.parent_dimension !== undefined;
    const hasVal = node.parent_value !== null && node.parent_value !== undefined;
    if (hasDim !== hasVal) {
      reasons.push(
        `node[${String(i)}] has parent_dimension ${hasDim ? 'set' : 'null'} but parent_value ` +
          `${hasVal ? 'set' : 'null'} — they must move together (both null = a root node)`,
      );
    }
    if (hasDim && !isGeoTreeNodeDimension(node.parent_dimension as string)) {
      reasons.push(
        `node[${String(i)}].parent_dimension '${String(node.parent_dimension)}' is not a geo-tree node dimension`,
      );
    }

    const id = identity(node);
    if (seen.has(id)) {
      reasons.push(
        `duplicate node '${node.dimension}=${node.value}' — (dimension, value) must be unique across ` +
          'the WHOLE document, because a grant carries only (dimension, value) and no path ' +
          '(rbac/scope.ts:131-134), so two same-named nodes are indistinguishable to scopeContains',
      );
    }
    seen.add(id);
    present.add(id);
  }

  // (4) Dangling parents + (5) rank.
  for (const [i, node] of nodes.entries()) {
    if (!isGeoTreeNodeDimension(node.dimension)) continue;
    if (node.parent_dimension === null || node.parent_value === null) continue;
    if (!isGeoTreeNodeDimension(node.parent_dimension)) continue;

    const parentId = `${node.parent_dimension} ${node.parent_value}`;
    if (!present.has(parentId)) {
      reasons.push(
        `node[${String(i)}] '${node.dimension}=${node.value}' names parent ` +
          `'${node.parent_dimension}=${node.parent_value}', which is not a node in this document`,
      );
    }
    if (GEO_TREE_NODE_RANK[node.parent_dimension] >= GEO_TREE_NODE_RANK[node.dimension]) {
      reasons.push(
        `node[${String(i)}] '${node.dimension}=${node.value}' has parent dimension ` +
          `'${node.parent_dimension}', which is not STRICTLY BROADER by geo rank — a parent must ` +
          'always be broader than its child',
      );
    }
  }

  // (6) Cycles.
  reasons.push(...findGeoTreeCycles(nodes));

  return reasons;
}

/**
 * Detect cycles in the parent graph. Exported so a test can assert the detector FIRES rather than
 * inferring it from an error list that also contains a rank complaint — check (5) makes every
 * constructible cycle also a rank violation, so a test that only asserted "invalid" would prove
 * nothing about this function.
 *
 * Iterative (never recursive) — an adversarial document must not blow the stack in a validator.
 */
export function findGeoTreeCycles(nodes: readonly GeoTreeNodeJson[]): string[] {
  const parentOf = new Map<string, string | null>();
  for (const node of nodes) {
    if (!isGeoTreeNodeDimension(node.dimension)) continue;
    const hasParent =
      node.parent_dimension !== null &&
      node.parent_value !== null &&
      isGeoTreeNodeDimension(node.parent_dimension);
    parentOf.set(
      identity(node),
      hasParent ? `${String(node.parent_dimension)} ${String(node.parent_value)}` : null,
    );
  }

  const reasons: string[] = [];
  const safe = new Set<string>(); // proven to terminate at a root
  for (const start of parentOf.keys()) {
    if (safe.has(start)) continue;
    const path: string[] = [];
    const onPath = new Set<string>();
    let cursor: string | null | undefined = start;

    while (cursor != null && parentOf.has(cursor)) {
      if (onPath.has(cursor)) {
        const cycle = path.slice(path.indexOf(cursor)).concat(cursor);
        reasons.push(`cycle detected in the parent graph: ${cycle.join(' → ')}`);
        break;
      }
      if (safe.has(cursor)) break;
      onPath.add(cursor);
      path.push(cursor);
      cursor = parentOf.get(cursor);
    }
    // Everything walked without hitting a cycle terminates at a root (or a dangling parent, which
    // check (4) reports separately) — remember it so the next start does not re-walk it.
    if (reasons.length === 0) for (const k of path) safe.add(k);
  }
  return reasons;
}

/** Throwing wrapper — the write path's guard. @throws GeoTreeDocumentInvalidError */
export function assertValidGeoTreeDocument(document: GeoTreeDocumentJson): void {
  const reasons = validateGeoTreeDocument(document);
  if (reasons.length > 0) throw new GeoTreeDocumentInvalidError(reasons);
}

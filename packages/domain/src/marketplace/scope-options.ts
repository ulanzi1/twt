// Module audience OPTIONS + the author-time scope-value check — Story 12.2 (`2026-11-01-433` QE5; AC4).
//
// ⭐ AMENDS `-429` C11 IN PART (recorded in `-433` A3). C11 reads: *"scope `values` are ⛔ validated against the
// Pariwar's geo tree in 12.1. The wizard picks them from the tree, and refuses `state` scope where there is no tree."*
// With ⛔ tree, 12.2 takes `district` values from the Pariwar's LISTED workplace districts — the same district-only
// spelling source the member resolver uses when there is ⛔ tree (`member-geo/resolve.ts`); `state` is still refused.
//
// Two halves:
//   1. OPTIONS (`listModuleScopeOptions` → the pure `buildModuleScopeOptions`) — what the wizard's picker offers. The
//      no-tree district list is CAPPED at 200 (`pageWorkplaceDistricts` — ⛔ a second page), reported honestly as
//      `districtsTruncated`; a value longer than `MAX_SCOPE_VALUE_LENGTH` (a tree node may be 128) is offered as
//      UNUSABLE, ⛔ truncated (a truncated value would match nobody — values match BYTE-FOR-BYTE).
//   2. THE CHECK (`assertScopeValuesRecorded`) — the 12.2 route's PRE-CHECK on the WRITE transaction, BEFORE the audit
//      wrapper (12.1 QE15's pre-check rule): every submitted value must be EXACTLY a recorded place — by exact
//      membership, ⛔ against the capped option list (so a listed district beyond the first 200 is accepted).
//
// ⚠ Values are compared BYTE-FOR-BYTE (⛔ trim, ⛔ case-fold, ⛔ Unicode normalisation) — 12.1's matching rule. A tree
// amended after authoring may orphan a value; the module is immutable, so the orphan reaches nobody (fail-closed —
// carried to 12.3). `parseModuleManifest` is UNCHANGED for every other caller (R3D1's scope-value leg for non-12.2
// callers — Resolved via explicit deferral).

import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import { geoTreeVersionInForce, type GeoTreeInForce } from '../geo-tree/registry.js';
import type { PariwarId } from '../ids/index.js';
import { pageWorkplaceDistricts } from '../member/workplace.js';
import { workplaceDistricts } from '../schema/workplace_districts.js';
import { ModuleScopeRequiresGeoTreeError, ModuleScopeValueUnknownError } from './errors.js';
import { MAX_SCOPE_VALUE_LENGTH, type ScopeFilterV1 } from './filters.js';

/** The no-tree district list's page — `pageWorkplaceDistricts`' own cap (⛔ a second page exists). */
const SCOPE_OPTION_DISTRICTS_LIMIT = 200;

/** Why a place is offered but cannot be chosen — the tuple the contracts sync-guard pins (12.2 review RB5). */
export const MODULE_SCOPE_OPTION_UNUSABLE_REASONS = ['too_long'] as const;
export type ModuleScopeOptionUnusableReason = (typeof MODULE_SCOPE_OPTION_UNUSABLE_REASONS)[number];

/** One place the picker offers. `state` is the district's parent state (a tree district only), else null. */
export interface ModuleScopeOption {
  readonly value: string;
  readonly state: string | null;
  readonly usable: boolean;
  readonly unusableReason: ModuleScopeOptionUnusableReason | null;
}

/** What the scope step of the wizard may offer (QE5). A single object — ⛔ a collection. */
export interface ModuleScopeOptions {
  /** The tree version the options came from, or null (⛔ tree in force). */
  readonly geoTreeVersion: number | null;
  /** The tree's `state` nodes — EMPTY with ⛔ tree, and for a districts-only tree. */
  readonly states: readonly ModuleScopeOption[];
  readonly districts: readonly ModuleScopeOption[];
  readonly districtSource: 'geo_tree' | 'workplace_districts';
  /** True when the no-tree list holds more listed districts than the page shows (the picker says so). */
  readonly districtsTruncated: boolean;
}

/** Byte-order (UTF-16 code unit) comparison — deterministic and locale-free, like the values themselves. */
function byValue(a: ModuleScopeOption, b: ModuleScopeOption): number {
  if (a.value === b.value) return (a.state ?? '') < (b.state ?? '') ? -1 : 1;
  return a.value < b.value ? -1 : 1;
}

function option(value: string, state: string | null): ModuleScopeOption {
  const tooLong = value.length > MAX_SCOPE_VALUE_LENGTH;
  return { value, state, usable: !tooLong, unusableReason: tooLong ? 'too_long' : null };
}

/**
 * PURE. The picker's options from the tree in force (or null) and the Pariwar's listed workplace districts (read only
 * when there is ⛔ tree). With a tree: its `state` nodes, and its `district` nodes with their parent state. With ⛔ tree:
 * ⛔ states, the listed districts (`state: null`), `districtsTruncated = hasMore`. With ⛔ tree AND ⛔ listed district,
 * both lists are empty — only `members-all` is authorable.
 */
export function buildModuleScopeOptions(
  tree: GeoTreeInForce | null,
  listedDistricts: { items: readonly string[]; hasMore: boolean },
): ModuleScopeOptions {
  if (tree !== null) {
    const nodes = tree.document.nodes;
    return {
      geoTreeVersion: tree.version,
      states: nodes.filter((n) => n.dimension === 'state').map((n) => option(n.value, null)).sort(byValue),
      districts: nodes
        .filter((n) => n.dimension === 'district')
        .map((n) => option(n.value, n.parent_dimension === 'state' ? n.parent_value : null))
        .sort(byValue),
      districtSource: 'geo_tree',
      districtsTruncated: false,
    };
  }
  return {
    geoTreeVersion: null,
    states: [],
    districts: listedDistricts.items.map((d) => option(d, null)),
    districtSource: 'workplace_districts',
    districtsTruncated: listedDistricts.hasMore,
  };
}

/**
 * The picker's options for this Pariwar at `at`: the tree in force, else the listed workplace districts. `at` — the
 * options GET passes the request clock the scope hook loaded its tree with; the write pre-check passes the WRITE
 * transaction's DB `now()` (TR3).
 */
export async function listModuleScopeOptions(db: Db, pariwarId: PariwarId, at: Date): Promise<ModuleScopeOptions> {
  const tree = await geoTreeVersionInForce(db, pariwarId, at);
  if (tree !== null) return buildModuleScopeOptions(tree, { items: [], hasMore: false });
  return buildModuleScopeOptions(null, await pageWorkplaceDistricts(db, pariwarId, { limit: SCOPE_OPTION_DISTRICTS_LIMIT }));
}

/**
 * Which of `values` are LISTED workplace districts of this Pariwar — an EXACT-membership read (one statement), ⛔ the
 * capped option page. `values` is a parsed scope list (1–200 unique values), so the result is bounded by it.
 */
export async function findListedWorkplaceDistricts(
  db: Db,
  pariwarId: PariwarId,
  values: readonly string[],
): Promise<Set<string>> {
  if (values.length === 0) return new Set();
  const rows = await db
    .select({ district: workplaceDistricts.district })
    .from(workplaceDistricts)
    .where(
      and(
        eq(workplaceDistricts.pariwarId, pariwarId),
        eq(workplaceDistricts.status, 'listed'),
        inArray(workplaceDistricts.district, [...values]),
      ),
    );
  return new Set(rows.map((r) => r.district));
}

/**
 * The author-time C11 check (QE5) — call it ONLY with a filter that already passed `ScopeFilterV1Schema.safeParse` (a
 * malformed one is left to `authorModule`'s manifest parse). `members-all` passes. `state` needs the tree in force to
 * carry a `state` node equal to each value (⛔ tree, or ⛔ state node at all → `ModuleScopeRequiresGeoTreeError`; a
 * missing value → `ModuleScopeValueUnknownError`). `district` needs each value to be a tree `district` node — or, with
 * ⛔ tree, a LISTED workplace district.
 *
 * @throws ModuleScopeRequiresGeoTreeError · ModuleScopeValueUnknownError (`values` = the offending ones, input order).
 */
export async function assertScopeValuesRecorded(
  db: Db,
  pariwarId: PariwarId,
  scopeFilter: ScopeFilterV1,
  at: Date,
): Promise<void> {
  if (scopeFilter.scope === 'members-all') return;
  const tree = await geoTreeVersionInForce(db, pariwarId, at);
  let recorded: Set<string>;
  if (scopeFilter.scope === 'state') {
    const states = (tree?.document.nodes ?? []).filter((n) => n.dimension === 'state');
    if (states.length === 0) throw new ModuleScopeRequiresGeoTreeError();
    recorded = new Set(states.map((n) => n.value));
  } else if (tree !== null) {
    recorded = new Set(tree.document.nodes.filter((n) => n.dimension === 'district').map((n) => n.value));
  } else {
    recorded = await findListedWorkplaceDistricts(db, pariwarId, scopeFilter.values);
  }
  const unknown = scopeFilter.values.filter((v) => !recorded.has(v));
  if (unknown.length > 0) throw new ModuleScopeValueUnknownError(scopeFilter.scope, unknown);
}

// Feature-flag READ accessors — Story 10.8 (Task 2; AC4).
//
// The inventory reads the "no secret flags" property (prd.md:892) rests on. The load-bearing
// structural choice is in `listEffectiveFlags`: it iterates the CODE REGISTRY (`FLAG_KEYS`) and
// resolves each key, rather than SELECTing whatever rows happen to exist.
//
// ⚠ That direction is the property, not a style preference. A row-driven listing would silently omit
// any flag that has no row yet — which is every flag until someone flips it, i.e. exactly the flags
// an operator most needs to see. Worse, "omitted because no row" and "deliberately hidden" would be
// indistinguishable from the outside. Registry-driven, there is no code path that can drop a
// registered flag from the inventory, and AC4's completeness test has something real to assert.
//
// There is deliberately NO `hidden`/`internal`/`visibility` field anywhere in this module or its
// table. A flag the inventory can omit is a secret flag.

import { and, desc, eq, isNull, or } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { featureFlagVersions, type FeatureFlagVersionRow } from '../schema/feature_flag_versions.js';
import { FLAG_DEFAULTS, FLAG_KEYS, flagVersionInForce, type FlagInForce } from './registry.js';

/** One inventory entry — the in-force resolution plus the static registry metadata a console renders. */
export interface FlagInventoryEntry extends FlagInForce {
  flagKey: string;
  /** The registry's one-line statement of the behaviour this flag toggles. */
  description: string;
}

/**
 * The COMPLETE effective flag inventory for a scope at an instant (AC4). Every registered flag
 * appears — resolved to its per-Pariwar override, else the global row, else the code default, with
 * `source` naming which tier answered (the console's provenance column).
 *
 * Pass `pariwarId: null` for the GLOBAL catalog view (`GET /api/v1/global/feature-flags`), which
 * skips the override tier by construction.
 */
export async function listEffectiveFlags(
  db: Db,
  pariwarId: PariwarId | null,
  at: Date,
): Promise<FlagInventoryEntry[]> {
  const entries: FlagInventoryEntry[] = [];
  // Sequential, not Promise.all: these run on the CALLER's transaction, and a pg transaction is a
  // single connection — concurrent statements on one tx client interleave badly. The registry is
  // tens of keys against an indexed table; this is not the latency that matters.
  for (const flagKey of FLAG_KEYS) {
    const inForce = await flagVersionInForce(db, flagKey, pariwarId, at);
    // Unreachable for a registered key (tier 3 always answers) — but a `continue` rather than a `!`
    // so a future registry/lookup divergence degrades to an omission we can see, not a crash.
    if (!inForce) continue;
    entries.push({
      ...inForce,
      flagKey,
      description: FLAG_DEFAULTS[flagKey]?.description ?? '',
    });
  }
  return entries;
}

/** Max version rows returned for a single flag's history view. */
const FLAG_HISTORY_LIMIT = 100;

/** One flag's version history plus whether the page exhausted it. */
export interface FlagVersionHistory {
  rows: FeatureFlagVersionRow[];
  /**
   * True when more rows exist beyond {@link FLAG_HISTORY_LIMIT}. ⚠ Without this the history view
   * TRUNCATED SILENTLY (Review Pass 2): the read behind AC1's "historical flag states are queryable"
   * dropped everything past row 100 with no signal, so an incomplete history was indistinguishable
   * from a complete one. A consumer that renders provenance must be able to say "there is more".
   */
  hasMore: boolean;
}

/**
 * The persisted version history for one flag within a scope, newest first (AC1's "historical flag
 * states are queryable for past evaluations"). Includes the scope's own rows AND — when reading as
 * a tenant — the global rows, since both tiers are part of what actually governed that tenant.
 *
 * ⚠ A TENANT READ INTERLEAVES TWO INDEPENDENT VERSION SEQUENCES. The tenant's own overrides and the
 * global rows are separate `version` counters that both start at 2, ordered here by `effective_from`.
 * That is correct for "what governed this tenant, in time order", but it means a busy GLOBAL catalog
 * can crowd a tenant's own overrides out of a single page. `hasMore` at least makes the truncation
 * visible; a cursor over the two sequences is the real fix if this ever gets deep.
 *
 * Note version 1 is NEVER in this list: it is the code default, not a row (see the registry header).
 */
export async function listFlagVersions(
  db: Db,
  flagKey: string,
  pariwarId: PariwarId | null,
): Promise<FlagVersionHistory> {
  const scopePredicate =
    pariwarId === null
      ? isNull(featureFlagVersions.pariwarId)
      : or(eq(featureFlagVersions.pariwarId, pariwarId), isNull(featureFlagVersions.pariwarId));

  // Fetch one MORE than the limit: if it comes back, the history is deeper than this page. Cheaper
  // and race-free compared with a separate COUNT, which could disagree with the page it describes.
  const probeLimit = FLAG_HISTORY_LIMIT + 1;
  const rows = await db
    .select()
    .from(featureFlagVersions)
    .where(and(eq(featureFlagVersions.flagKey, flagKey), scopePredicate))
    .orderBy(desc(featureFlagVersions.effectiveFrom), desc(featureFlagVersions.version))
    .limit(clampLimit(probeLimit, { default: probeLimit, cap: probeLimit }));

  return { rows: rows.slice(0, FLAG_HISTORY_LIMIT), hasMore: rows.length > FLAG_HISTORY_LIMIT };
}

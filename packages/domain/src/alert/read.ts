// Alert-lifecycle read accessors — Story 8.2 (Task 2; the first consumer of the 8.1 primitive).
//
// The `alerts` hot projection (Story 8.1) is written ONLY by the projector; these are the READ
// counterparts the Epic-8 surfaces consume. `listLiveAlertsForPariwar` is the My Pool card's entry
// point: "which contribution cycles are OPEN for this Pariwar right now?" — every alert whose cached
// `current_state = 'live'` (contributions accepted). A transport-free PRIMITIVE: NO HTTP, NO
// decryption — the apps/api boundary orchestrates those.
//
// ── Reads the cached `current_state` (the read-optimization projection) ────────────────────────────
// This reads `alerts.current_state`, the projector-maintained cache — it does NOT replay the alert
// stream. That is correct for a read surface (the 8.2 D2 "presentation, not lifecycle" rule): the
// card DISPLAYS the live state, it never derives or advances it. The projector + the DB trigger +
// the AST gate keep the cache honest (Story 8.1 AC5), so a `live` row is authoritative here.
//
// Ordered by `(cycle_id ASC)` for a stable, replay-deterministic candidate list — the My Pool
// handler layers the D7 soonest-closing tie-break on top (earliest `committed_at + window`), and a
// deterministic base order makes that tie-break total. Tenant-scoped by RLS + the explicit
// `pariwar_id` predicate (the members/pools read precedent). No user-controlled `.limit()` (the live
// set is one-per-open-cycle, bounded by the Pariwar's concurrent cycles), so no domain-invariants clamp.

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { AlertId, CycleFreezeCommitId, PariwarId } from '../ids/index.js';
import { alerts } from '../schema/alerts.js';

/** A live contribution-cycle alert — the identity + cycle boundary the My Pool card resolves against. */
export interface LiveAlertRef {
  readonly alertId: AlertId;
  readonly cycleId: CycleFreezeCommitId;
  /** N — the number of pools spawned in this cycle (from the `cycle.frozen` payload, cached on the row). */
  readonly poolCount: number;
}

/**
 * List the Pariwar's currently-`live` alerts — the open contribution cycles (AC1). Reads the cached
 * `alerts.current_state = 'live'` projection (Story 8.1), ordered `cycle_id ASC` for determinism.
 * Empty when no cycle is open (⇒ the My Pool card self-suppresses). Tenant-scoped (RLS + the explicit
 * `pariwar_id` predicate).
 */
export async function listLiveAlertsForPariwar(
  db: Db,
  pariwarId: PariwarId,
): Promise<LiveAlertRef[]> {
  const rows = await db
    .select({
      alertId: alerts.alertId,
      cycleId: alerts.cycleId,
      poolCount: alerts.poolCount,
    })
    .from(alerts)
    .where(and(eq(alerts.pariwarId, pariwarId), eq(alerts.currentState, 'live')))
    .orderBy(asc(alerts.cycleId));
  return rows;
}

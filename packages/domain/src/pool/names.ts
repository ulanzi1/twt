// Curated pool-name registry — the ordering/reservation service (Story 7.2, Task 5; AC5).
//
// The read/write half of `pool_names` (schema/pool_names.ts — read its header first: the
// registry is a CAPABILITY, and TWT-Bihar seeds ZERO rows at launch by product decision).
// `reserveNames` is what the Story 7.3 spawn saga calls to ask "give me this cycle's N
// display names, in order".
//
// ── The two zero-name outcomes are NOT the same thing (AC5 — load-bearing) ────
// This distinction is the whole reason the function is subtle, and getting it backwards
// would break TWT-Bihar's launch on its very first cycle freeze:
//
//   · OPT-OUT — the Pariwar has NO rows at all. It has never populated a name list and
//     does not intend to (TWT-Bihar). Returns `[]`. This is NOT an error: it is the
//     SIGNAL that the caller should display letter codes for every pool in the cycle (the
//     AC3/AC5 launch invariant). Throwing here would fail every TWT-Bihar cycle freeze.
//
//   · EXHAUSTION — the Pariwar HAS a list, but it is too short (or too little of it is
//     approved) for this cycle. Throws `PoolNameListExhaustedError`. This is a trustee
//     CONFIGURATION GAP: someone opted into names and then under-filled the list, so
//     silently falling back to letter codes would hide a half-configured tenant from the
//     people who could fix it. 7.3 surfaces it; the trustee extends the list.
//
// The discriminator is the TOTAL row count for the Pariwar (any status) — "did this tenant
// ever opt in?" — NOT the approved count, which cannot tell "never opted in" from "opted
// in, nothing approved yet" (the latter IS a configuration gap).
//
// ── Deterministic + replay-reproducible ──────────────────────────────────────
// Ordering is `position_in_ordered_list` ASC and nothing else — no `random()`, no clock,
// no insertion order, no `created_at` tiebreak needed (the `(pariwar_id, position)` UNIQUE
// makes position a total order). The same registry state + the same `count` returns the
// same names in the same order on every machine, forever — so a cycle's naming replays
// exactly, which is what the pool engine's audit-reproducibility rests on.
//
// ── Reservation is SELECTION, not consumption ────────────────────────────────
// Nothing is marked "used". There is deliberately nowhere to record it: the frozen 7.1
// surface stores no name on a pool (`pools` has no name column and the `pool.spawned`
// payload carries only `pool_canonical_identifier`), and 7.2 does not touch that contract.
// So names REPEAT across cycles — exactly as letter codes do (every cycle has a Pool A).
// "Exhaustion" is therefore per-CYCLE — "this cycle needs N names and the list approves
// fewer than N" — never a global running-out. If a future tenant needs a pool's assigned
// name recorded for replay, that is an OPTIONAL `pool_display_name` payload field and a
// 7.3+ decision on the event owner's turf.

import { createHash } from 'node:crypto';

import { and, asc, count as sqlCount, eq } from 'drizzle-orm';
import type pg from 'pg';

import { writeAuditEntry } from '../audit/write.js';
import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import type { PariwarId, PoolNameId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { poolNames } from '../schema/pool_names.js';

/**
 * The most names one reservation may request. A cycle spawns one pool per approved claim;
 * a Pariwar freezing more than this in a single month is not a real cycle, it is a bug or
 * a runaway caller — and an unbounded `count` would issue an unbounded query. Also the
 * clamp bound that satisfies the domain-accessor `.limit()` invariant (`count` is
 * validated against it BEFORE the query, so the clamp can never silently truncate a
 * legitimate request into a false exhaustion).
 */
export const MAX_POOL_NAME_RESERVATION = 500;

/** Thrown when a Pariwar HAS a name list but it approves fewer names than the cycle needs
 *  — a trustee configuration gap, not a launch default (see the header). Carries the
 *  numbers so 7.3 can tell the trustee exactly how many more names to add. */
export class PoolNameListExhaustedError extends Error {
  public readonly name = 'PoolNameListExhaustedError';
  public constructor(
    public readonly pariwarId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `pool name registry for pariwar ${pariwarId} is exhausted: ${String(requested)} name(s) requested, ` +
        `${String(available)} approved name(s) available — extend the curated list`,
    );
  }
}

/** Thrown on an out-of-contract `count`. */
export class PoolNameReservationRangeError extends Error {
  public readonly name = 'PoolNameReservationRangeError';
  public constructor(public readonly received: number) {
    super(
      `count must be an integer in [1, ${String(MAX_POOL_NAME_RESERVATION)}], received ${String(received)}`,
    );
  }
}

/**
 * One reserved name. Carries BOTH locales rather than a pre-picked string: reservation
 * happens at cycle freeze (a system context with no viewer), while display happens per
 * member (a locale context) — collapsing to one string here would bake the wrong locale in
 * for half a bilingual Pariwar. The caller hands the locale-appropriate name to
 * `resolvePoolDisplay({ pariwarCultureName })`.
 */
export interface PoolNameReservation {
  poolNameId: PoolNameId;
  positionInOrderedList: number;
  displayNameEn: string;
  displayNameHi: string;
}

export interface ReserveNamesInput {
  pariwarId: PariwarId;
  /** How many names this cycle needs (one per pool). */
  count: number;
}

/**
 * Reserve the next `count` approved names for a Pariwar, in `position_in_ordered_list`
 * order. Runs on the CALLER's transaction (Story 7.3 freezes the whole cycle in one tx);
 * never opens its own.
 *
 * @returns `[]` when the Pariwar has opted OUT (no rows at all — TWT-Bihar's launch
 *          configuration). The caller falls back to letter codes for every pool.
 * @returns `count` reservations, ordered by position, otherwise.
 * @throws  PoolNameListExhaustedError when the Pariwar HAS a list that approves fewer than
 *          `count` names (a trustee configuration gap — see the header).
 * @throws  PoolNameReservationRangeError on an out-of-contract `count`.
 */
export async function reserveNames(tx: Db, input: ReserveNamesInput): Promise<PoolNameReservation[]> {
  const { pariwarId, count } = input;
  if (!Number.isInteger(count) || count < 1 || count > MAX_POOL_NAME_RESERVATION) {
    throw new PoolNameReservationRangeError(count);
  }

  // (1) Opt-out probe: has this Pariwar EVER populated a list? Counts rows of ANY status
  //     — an all-`pending` list means "opted in, nothing approved yet", which is a
  //     configuration gap (exhaustion), not an opt-out.
  const totals = await tx
    .select({ total: sqlCount() })
    .from(poolNames)
    .where(eq(poolNames.pariwarId, pariwarId));
  const total = totals[0]?.total ?? 0;
  if (total === 0) return [];

  // (2) The Pariwar opted in — take the first `count` APPROVED names by position.
  //     `count` is already validated to [1, MAX], so the clamp is a defense-in-depth
  //     backstop that returns it unchanged (never a silent truncation → never a false
  //     exhaustion).
  const rows = await tx
    .select({
      poolNameId: poolNames.poolNameId,
      positionInOrderedList: poolNames.positionInOrderedList,
      displayNameEn: poolNames.displayNameEn,
      displayNameHi: poolNames.displayNameHi,
    })
    .from(poolNames)
    .where(and(eq(poolNames.pariwarId, pariwarId), eq(poolNames.approvalStatus, 'approved')))
    .orderBy(asc(poolNames.positionInOrderedList))
    .limit(clampLimit(count, { default: MAX_POOL_NAME_RESERVATION, cap: MAX_POOL_NAME_RESERVATION }));

  // (3) The list exists but is too short / too little approved — the trustee must extend it.
  if (rows.length < count) {
    throw new PoolNameListExhaustedError(pariwarId, count, rows.length);
  }
  return rows;
}

// ── The audit-logged mutation seam (AC5) ──────────────────────────────────────
// A THIN helper, not an admin surface: the trustee-facing screen for curating the list is
// a later trustee-tools story. This exists so that the FIRST write to the registry is
// already audited — a curated name reaching members is a governance-relevant act (the M-10
// review), so "who added this name, when" must be answerable from day one.

export interface AddPoolNameInput {
  pariwarId: PariwarId;
  positionInOrderedList: number;
  displayNameEn: string;
  displayNameHi: string;
  /** WHERE this name comes from + why it suits this Pariwar — the durable artifact of the
   *  governance review. */
  culturalLineageNote?: string | null;
  /** The trustee performing the mutation; NULL = system / SIE. */
  actorId: string | null;
  /** The actor's role at action time (audit attribution), or null for system. */
  actorRole?: string | null;
  traceId?: string | null;
}

/** The dotted audit action for a registry mutation. */
export const POOL_NAME_ADD_AUDIT_ACTION = 'pool_name.add';

/** SHA-256 hex of a canonical string. Local (the niyamavali/drafts.ts + validity-cache
 *  /store.ts idiom): the `sha256Hex` helpers in @twt/channels / @twt/niyamavali-engine live
 *  in packages that DEPEND on @twt/domain, so importing one would cycle. */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

/**
 * Insert one curated name (status `pending` — a name is INERT until approved) on the
 * caller's transaction, then append its audit line on the global chain.
 *
 * ⚠ Ordering + the two-connection reality: `writeAuditEntry` runs on the BYPASSRLS SERVICE
 * pool and commits on its OWN connection (the chain is global + advisory-lock serialized),
 * so it cannot join `tx`. The insert therefore runs first and the audit line second: if the
 * caller's tx later rolls back, an audit line survives for a mutation that did not land.
 * That asymmetry is deliberate — an over-recorded audit line is inspectable and harmless,
 * whereas the reverse (a name in the registry that no audit line explains) is exactly the
 * governance hole the M-10 review exists to prevent.
 *
 * @throws on a duplicate `(pariwar_id, position_in_ordered_list)` — positions are unique
 *         per Pariwar, so re-using a slot is a caller error, not an upsert.
 */
export async function addPoolName(
  tx: Db,
  servicePool: pg.Pool,
  input: AddPoolNameInput,
): Promise<PoolNameId> {
  const rows = await tx
    .insert(poolNames)
    .values({
      pariwarId: input.pariwarId,
      positionInOrderedList: input.positionInOrderedList,
      displayNameEn: input.displayNameEn,
      displayNameHi: input.displayNameHi,
      culturalLineageNote: input.culturalLineageNote ?? null,
      createdByActor: input.actorId,
    })
    .returning({ poolNameId: poolNames.poolNameId });

  const poolNameId = rows[0]?.poolNameId;
  if (poolNameId === undefined) {
    // Under RLS a missing scope silently filters the INSERT to 0 rows (the bumpCohortEpoch
    // precedent) — surface it rather than audit a write that never happened.
    throw new Error(
      '[addPoolName] INSERT returned no row — check the transaction has app.pariwar_id scope set',
    );
  }

  await writeAuditEntry(servicePool, {
    pariwarId: input.pariwarId,
    actorId: input.actorId,
    actorRole: input.actorRole ?? null,
    action: POOL_NAME_ADD_AUDIT_ACTION,
    resourceLocator: `pool_name/${poolNameId}`,
    // A DIGEST of the mutation's content, never the content itself (the writer's contract).
    // Includes `cultural_lineage_note` — the durable artifact of the M-10 governance review
    // — so that field cannot be edited post-hoc without invalidating the digest.
    requestPayloadHash: sha256Hex(
      canonicalJsonStringify({
        pariwar_id: input.pariwarId,
        position_in_ordered_list: input.positionInOrderedList,
        display_name_en: input.displayNameEn,
        display_name_hi: input.displayNameHi,
        cultural_lineage_note: input.culturalLineageNote ?? null,
      }),
    ),
    responseStatus: 201,
    traceId: input.traceId ?? null,
  });

  return poolNameId;
}

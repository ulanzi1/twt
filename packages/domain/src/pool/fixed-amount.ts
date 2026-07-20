// The effective-dated fixed-amount schedule — resolver + write paths. Story 7.5 (Task 2;
// AC1/AC3/AC4/AC5).
//
// The per-Pariwar `fixed_amount` schedule that RETIRES the boot-time POOL_SPAWN_FIXED_AMOUNT_INR
// env constant. Three surfaces:
//   · getEffectiveFixedAmount — the change_type-BLIND window resolver (mirrors getEffectiveTc). The
//     spawn saga reads it at the cycle-freeze committed_at, so each pool snapshots the amount in
//     force at the moment the cycle froze — deterministic + replay-safe.
//   · scheduleStandardChange — the 12-month-notice write (effective_from >= now()+365d, evaluated
//     against DB-authoritative now() — D6; no attestation; change_type='standard').
//   · applyEmergencyOverride — the emergency write (NO notice floor; change_type='emergency') that
//     ALSO writes an immutable Emergency Adjustment Record atomically (D3) — the schedule row and
//     its attestation are written together or not at all.
//
// ── Governance posture (D3) — equivalent to R9, WITHOUT the R9 voting lifecycle ──
// The emergency path records a step-up-gated trustee attestation and is auditable — the governance
// posture is EQUIVALENT to R9. It is deliberately NOT the R9 voting lifecycle (no session, no
// quorum, no per-vote encrypted rationale): a recorded, attestable sign-off, not a vote. Do NOT
// pull the R9 session/vote/quorum subsystem in here.
//
// ── Transaction contract (the terms-and-conditions/write.ts precedent) ─────────
// These accessors run their statements DIRECTLY on the passed `db` and do NOT open their own
// transaction. Atomicity — the standard/emergency close-prior-head + insert-new-head, and the
// emergency schedule-row + attestation pair — comes from the CALLER's transaction, which is
// MANDATORY anyway: RLS scope (SET LOCAL app.pariwar_id) is transaction-scoped, so any scoped
// caller is already inside a transaction (withPariwarScope opens it on the route/worker path; the
// per-test harness opens it in tests).
//
// ── Support-category-token-free (Story 7.5 Task 2; [[project_pool_primitive_substrate]]) ──
// This module is auto-scanned by the pool-support-category-invariant gate's recursive pool/ walk —
// it carries NO hardcoded support-category string branches (it never inspects support_category at all;
// the amount schedule is category-agnostic). v2 `_daan` activation stays a config change, not an edit here.

import { and, asc, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import {
  type PoolFixedAmountEmergencyAttestationRow,
  type PoolFixedAmountPanelMember,
  poolFixedAmountEmergencyAttestations,
} from '../schema/pool_fixed_amount_emergency_attestations.js';
import {
  type PoolFixedAmountScheduleRow,
  poolFixedAmountSchedule,
} from '../schema/pool_fixed_amount_schedule.js';
import {
  PoolFixedAmountAttestationRequiredError,
  PoolFixedAmountInvalidError,
  PoolFixedAmountNoticeTooShortError,
  PoolFixedAmountNotConfiguredError,
  PoolFixedAmountPanelDuplicateActorError,
  PoolFixedAmountPanelTooSmallError,
  PoolFixedAmountReasonRequiredError,
  PoolFixedAmountVersionConflictError,
  isFixedAmountUniqueViolation,
} from './errors.js';

// ── The window resolver — PURE core + DB shell (the getEffectiveTc precedent) ──

/** The 12-month notice floor, in days (D6). 365 calendar days = the standard-change cooling-off. */
export const FIXED_AMOUNT_NOTICE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Guard-rail ceiling on `fixed_amount` (1 crore INR) — review hardening. Mirrors the retired
 * `MAX_POOL_SPAWN_FIXED_AMOUNT_INR` boot-time guard: a misconfigured/fat-fingered trustee input (an
 * extra zero) must not silently snapshot an absurd per-pool contribution. Applies to BOTH write
 * paths (standard and emergency) — the emergency path bypasses the 365-day notice floor, never the
 * amount sanity bound.
 */
export const MAX_POOL_FIXED_AMOUNT_INR = 10_000_000;

/** Minimum distinct-actor size of an emergency attesting panel (review hardening) — a lone actor is
 *  not a "panel"; it lets a single admin be their own sole attester, undercutting the R9-equivalent
 *  governance posture (D3). Full trustee-grant verification of panel membership is deferred (needs a
 *  trustee directory / RBAC geo-scope resolver not built until Epic 3) — this is the mechanical floor. */
export const POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2;

/** The minimal window fields the pure selector reasons over (a schedule row provides them all). */
interface FixedAmountWindow {
  readonly effectiveFrom: Date;
  readonly effectiveUntil: Date | null;
  readonly version: number;
}

/**
 * PURE window selection (DB-free, unit-testable — the boundary semantics ARE the contract). The single
 * row whose effective window contains `asOf` — `effective_from <= asOf AND (effective_until IS NULL OR
 * asOf < effective_until)` — newest `effective_from` (then highest `version`) when several match.
 * `effective_from` INCLUSIVE, `effective_until` EXCLUSIVE. Returns `null` when none is effective.
 * change_type-BLIND (AC5). The DB resolver fetches the (small) per-Pariwar row set and delegates here,
 * so replay is a pure function of the immutable rows + the explicit `asOf`, never a SQL clock read.
 */
export function selectEffectiveFixedAmountRow<T extends FixedAmountWindow>(
  rows: readonly T[],
  asOf: Date,
): T | null {
  const t = asOf.getTime();
  let best: T | null = null;
  for (const row of rows) {
    const from = row.effectiveFrom.getTime();
    const until = row.effectiveUntil === null ? null : row.effectiveUntil.getTime();
    const inWindow = from <= t && (until === null || t < until);
    if (!inWindow) continue;
    if (
      best === null ||
      from > best.effectiveFrom.getTime() ||
      (from === best.effectiveFrom.getTime() && row.version > best.version)
    ) {
      best = row;
    }
  }
  return best;
}

/** PURE 12-month-notice check (DB-free, unit-testable): `effectiveFrom >= dbNow + 365 days`. `dbNow`
 *  MUST be the DB-authoritative instant (§1.11/D6 — the write path sources it from `SELECT now()`),
 *  never a JS clock, so a hostile trustee cannot shrink the cooling-off window via an app-server clock. */
export function meetsNoticeFloor(effectiveFrom: Date, dbNow: Date): boolean {
  return effectiveFrom.getTime() >= dbNow.getTime() + FIXED_AMOUNT_NOTICE_DAYS * DAY_MS;
}

/** Read the DB-authoritative `now()` (§1.11) — the single sanctioned "now" for the write floor + the
 *  admin "effective now" default. */
async function dbNow(db: Db): Promise<Date> {
  const res = await db.execute<{ now: unknown }>(sql`SELECT now() AS now`);
  const row = res.rows[0] as { now: unknown } | undefined;
  if (!row) throw new Error('[fixed-amount] SELECT now() returned no row — check session');
  // drizzle's raw execute may hand back the timestamptz as a Date OR an ISO string depending on the
  // driver's type-parser wiring — coerce to a Date either way (DB-authoritative instant, §1.11).
  return row.now instanceof Date ? row.now : new Date(row.now as string);
}

/**
 * The single schedule row effective at `asOf`. `asOf` defaults to DB `now()` (DB-authoritative,
 * §1.11), but the SPAWN path MUST pass `committed_at` explicitly so the snapshot is the amount
 * effective at the cycle-freeze instant, never a clock read. Returns `null` when no row is effective
 * (the admin GET renders "not configured"; the spawn path's throwing wrapper turns it into
 * PoolFixedAmountNotConfiguredError).
 *
 * Filters the window predicate IN SQL (`effective_from <= asOf AND (effective_until IS NULL OR asOf <
 * effective_until)`, `ORDER BY effective_from DESC, version DESC LIMIT 1`) rather than pulling the
 * Pariwar's full schedule history into JS — the hot spawn-time path stays O(1) rows regardless of how
 * many changes a Pariwar has accumulated over its lifetime. The window is non-overlapping by
 * construction (the partial-unique open-head index + `insertNewHead`'s close-then-insert mechanic), so
 * SQL-side filtering yields the identical result the pure {@link selectEffectiveFixedAmountRow}
 * selector would over the full row set — that selector stays exported + unit-tested as the boundary-
 * semantics CONTRACT (DB-free), even though the DB shell no longer routes through it.
 */
export async function resolveEffectiveFixedAmountRow(
  db: Db,
  pariwarId: PariwarId,
  asOf?: Date,
): Promise<PoolFixedAmountScheduleRow | null> {
  const at = asOf ?? (await dbNow(db));
  const rows = await db
    .select()
    .from(poolFixedAmountSchedule)
    .where(
      and(
        eq(poolFixedAmountSchedule.pariwarId, pariwarId),
        lte(poolFixedAmountSchedule.effectiveFrom, at),
        or(isNull(poolFixedAmountSchedule.effectiveUntil), gt(poolFixedAmountSchedule.effectiveUntil, at)),
      ),
    )
    .orderBy(desc(poolFixedAmountSchedule.effectiveFrom), desc(poolFixedAmountSchedule.version))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The effective `fixed_amount` (whole INR) at `asOf` — the SPAWN consumer entry point.
 * @throws PoolFixedAmountNotConfiguredError when no schedule entry is effective (fail loud — the
 *         PoolNameListExhaustedError philosophy; NOT a silent default). The saga passes
 *         `committed_at` as `asOf`; do NOT rely on the now() default on the spawn path.
 */
export async function getEffectiveFixedAmount(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<number> {
  const row = await resolveEffectiveFixedAmountRow(db, pariwarId, asOf);
  if (!row) {
    throw new PoolFixedAmountNotConfiguredError(pariwarId, asOf.toISOString());
  }
  return row.fixedAmount;
}

/**
 * The NEXT scheduled fixed-amount change that has not yet taken effect at `asOf` — the Story 8.2 AC6
 * "upcoming transition" source. Returns the earliest-starting row whose `effective_from` is strictly
 * in the FUTURE (`effective_from > asOf`), ordered `effective_from ASC, version ASC`; `null` when no
 * future change is scheduled. The My Pool card surfaces it gently ("from [date], contribution becomes
 * ₹X") — DISPLAY context only; the card's CURRENT amount stays the pool's SNAPSHOTTED `fixed_amount`
 * (D3), never this future value.
 *
 * This is deliberately DISTINCT from {@link resolveEffectiveFixedAmountRow} (the row effective NOW):
 * a read surface needs to look FORWARD, not resolve the current window. Per-Pariwar (the schedule is
 * a Pariwar-level record, not per-pool); RLS-scoped by the caller. O(1) rows (`ORDER BY … LIMIT 1`).
 */
export async function resolveUpcomingFixedAmountChange(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<PoolFixedAmountScheduleRow | null> {
  const rows = await db
    .select()
    .from(poolFixedAmountSchedule)
    .where(
      and(
        eq(poolFixedAmountSchedule.pariwarId, pariwarId),
        gt(poolFixedAmountSchedule.effectiveFrom, asOf),
      ),
    )
    .orderBy(asc(poolFixedAmountSchedule.effectiveFrom), asc(poolFixedAmountSchedule.version))
    .limit(1);
  return rows[0] ?? null;
}

// ── head-read helpers (the T&C latestTcVersion / currentOpenTcVersion precedent) ──

/** The latest row by `version` REGARDLESS of window — the head the write path bumps
 *  (`(latest?.version ?? 0) + 1`). Not the effective resolver. */
async function latestScheduleVersion(db: Db, pariwarId: PariwarId): Promise<number> {
  const rows = await db
    .select({ version: poolFixedAmountSchedule.version })
    .from(poolFixedAmountSchedule)
    .where(eq(poolFixedAmountSchedule.pariwarId, pariwarId))
    .orderBy(desc(poolFixedAmountSchedule.version))
    .limit(1);
  return rows[0]?.version ?? 0;
}

/**
 * Close the current open-ended head (`effective_until IS NULL`), if any. At-most-one open head
 * (partial-unique index), so this touches 0 or 1 rows; a genesis write touches 0. MUST run BEFORE
 * inserting the new open head so the partial-unique constraint is never transiently violated.
 *
 * The closing instant is `max(newEffectiveFrom, openHead.effectiveFrom)` — NOT unconditionally
 * `newEffectiveFrom` (review hardening). The emergency path is explicitly allowed an `effectiveFrom`
 * that precedes "now" (AC4), and the open head being closed may itself carry a FUTURE `effectiveFrom`
 * (a standard change already scheduled ahead under the 365-day notice). Blindly closing at
 * `newEffectiveFrom` in that case would set `effective_until < effective_from` on the row being
 * closed — an INVERTED, corrupted window. Closing at `max(...)` instead means: a head super­seded
 * before it ever took effect is closed at its OWN `effective_from` — a zero-width, permanently-
 * unreachable window (`effective_from === effective_until` can never satisfy `from <= asOf < until`)
 * — moot but well-formed, never inverted. The ordinary case (`newEffectiveFrom` after the open head's
 * `effectiveFrom`) is unaffected: `max(...)` degrades to the prior unconditional assignment.
 */
async function closeOpenHead(db: Db, pariwarId: PariwarId, newEffectiveFrom: Date): Promise<void> {
  const openRows = await db
    .select({ effectiveFrom: poolFixedAmountSchedule.effectiveFrom })
    .from(poolFixedAmountSchedule)
    .where(
      and(
        eq(poolFixedAmountSchedule.pariwarId, pariwarId),
        isNull(poolFixedAmountSchedule.effectiveUntil),
      ),
    )
    .limit(1);
  const open = openRows[0];
  if (!open) return;

  const closesAt =
    newEffectiveFrom.getTime() > open.effectiveFrom.getTime() ? newEffectiveFrom : open.effectiveFrom;

  await db
    .update(poolFixedAmountSchedule)
    .set({ effectiveUntil: closesAt })
    .where(
      and(
        eq(poolFixedAmountSchedule.pariwarId, pariwarId),
        isNull(poolFixedAmountSchedule.effectiveUntil),
      ),
    );
}

/** Validate a `fixed_amount`: a strictly-positive integer within the guard-rail ceiling
 *  ({@link MAX_POOL_FIXED_AMOUNT_INR}). Applies to every write path (standard, emergency, genesis). */
function assertPositiveAmount(fixedAmount: number): void {
  if (!Number.isInteger(fixedAmount) || fixedAmount <= 0 || fixedAmount > MAX_POOL_FIXED_AMOUNT_INR) {
    throw new PoolFixedAmountInvalidError(fixedAmount);
  }
}

// ── scheduleStandardChange (AC1) ──────────────────────────────────────────────

export interface ScheduleStandardChangeInput {
  readonly pariwarId: PariwarId;
  /** New amount (whole INR, strictly positive). */
  readonly fixedAmount: number;
  /** When the change comes into force — MUST be >= DB now() + 365 days (the 12-month notice). */
  readonly effectiveFrom: Date;
  /** The trustee/actor writing the change (snapshotted in created_by_actor). */
  readonly actorId: string;
  /** The audit line id (written FIRST by the route). */
  readonly auditId?: string | null;
}

/**
 * Append a STANDARD (12-month-notice) fixed-amount change. Validates the +365-day floor against
 * DB-authoritative `now()` (D6 — SQL-side comparison, NEVER a JS `Date`), and a positive integer
 * amount; allocates the next monotonic `version`; closes the prior open-ended head then inserts the
 * new open head; `change_type='standard'`.
 *
 * @throws PoolFixedAmountNoticeTooShortError on the floor violation.
 * @throws PoolFixedAmountInvalidError on a non-positive/non-integer amount.
 * @throws PoolFixedAmountVersionConflictError on a concurrent-write 23505 race.
 */
export async function scheduleStandardChange(
  db: Db,
  input: ScheduleStandardChangeInput,
): Promise<PoolFixedAmountScheduleRow> {
  assertPositiveAmount(input.fixedAmount);

  // DB-authoritative 365-day floor (D6). A trustee-controllable app-server clock would let a hostile
  // trustee shrink the cooling-off window (architecture L1311), so the floor is evaluated against the
  // DB's `now()` (sourced here), never a JS `new Date()`. The comparison itself is the pure helper.
  const now = await dbNow(db);
  if (!meetsNoticeFloor(input.effectiveFrom, now)) {
    throw new PoolFixedAmountNoticeTooShortError(input.effectiveFrom.toISOString());
  }

  return insertNewHead(db, {
    pariwarId: input.pariwarId,
    fixedAmount: input.fixedAmount,
    effectiveFrom: input.effectiveFrom,
    changeType: 'standard',
    actorId: input.actorId,
    auditId: input.auditId ?? null,
  });
}

// ── applyEmergencyOverride (AC3, AC4) ─────────────────────────────────────────

export interface ApplyEmergencyOverrideInput {
  readonly pariwarId: PariwarId;
  /** New amount (whole INR, strictly positive). */
  readonly fixedAmount: number;
  /** When the change comes into force — MAY be <= now() (the 365-day floor does NOT apply). */
  readonly effectiveFrom: Date;
  /** Policy/operational justification ONLY — never member-specific (D3). Non-empty. */
  readonly documentedReason: string;
  /** The attesting State-Trustee panel COMPOSITION — non-empty roster of {actor_id, actor_display}. */
  readonly panel: readonly PoolFixedAmountPanelMember[];
  /** The attesting actor + resolved R5 display snapshot (fail-closed on a missing display upstream). */
  readonly attestedByActor: string;
  readonly attestedDisplay: string;
  /** The audit line id (written FIRST by the route). */
  readonly auditId?: string | null;
}

export interface ApplyEmergencyOverrideResult {
  readonly schedule: PoolFixedAmountScheduleRow;
  readonly attestation: PoolFixedAmountEmergencyAttestationRow;
}

/**
 * Apply an EMERGENCY fixed-amount override in ONE (caller's) transaction: (a) the same
 * close-head + insert-new-head mechanics as the standard path but with NO 365-day floor and
 * `change_type='emergency'`; (b) the immutable Emergency Adjustment Record referencing the
 * just-written schedule `version`, denormalizing the amount, and recording the panel composition +
 * attestation metadata + documented reason. The schedule entry and its attestation are written
 * together or not at all — a `change_type:'emergency'` row without an attestation record is
 * impossible (the caller's tx rolls back both on any failure).
 *
 * @throws PoolFixedAmountReasonRequiredError on an empty documented_reason.
 * @throws PoolFixedAmountAttestationRequiredError on an empty panel.
 * @throws PoolFixedAmountPanelTooSmallError on a non-empty panel below {@link POOL_FIXED_AMOUNT_MIN_PANEL_SIZE}.
 * @throws PoolFixedAmountPanelDuplicateActorError when the same actor id appears more than once in the panel.
 * @throws PoolFixedAmountInvalidError on a non-positive/non-integer/over-ceiling amount.
 * @throws PoolFixedAmountVersionConflictError on a concurrent-write 23505 race.
 */
export async function applyEmergencyOverride(
  db: Db,
  input: ApplyEmergencyOverrideInput,
): Promise<ApplyEmergencyOverrideResult> {
  assertPositiveAmount(input.fixedAmount);
  if (input.documentedReason.trim().length === 0) {
    throw new PoolFixedAmountReasonRequiredError();
  }
  if (input.panel.length === 0) {
    throw new PoolFixedAmountAttestationRequiredError();
  }
  if (input.panel.length < POOL_FIXED_AMOUNT_MIN_PANEL_SIZE) {
    throw new PoolFixedAmountPanelTooSmallError(input.panel.length, POOL_FIXED_AMOUNT_MIN_PANEL_SIZE);
  }
  if (new Set(input.panel.map((m) => m.actor_id)).size !== input.panel.length) {
    throw new PoolFixedAmountPanelDuplicateActorError();
  }

  // (a) the emergency schedule entry — no floor check (AC4: effective_from may be <= now()).
  const schedule = await insertNewHead(db, {
    pariwarId: input.pariwarId,
    fixedAmount: input.fixedAmount,
    effectiveFrom: input.effectiveFrom,
    changeType: 'emergency',
    actorId: input.attestedByActor,
    auditId: input.auditId ?? null,
  });

  // (b) the immutable Emergency Adjustment Record — same tx (atomic pairing).
  let attestationRows: PoolFixedAmountEmergencyAttestationRow[];
  try {
    attestationRows = await db
      .insert(poolFixedAmountEmergencyAttestations)
      .values({
        pariwarId: input.pariwarId,
        scheduleVersion: schedule.version,
        fixedAmount: input.fixedAmount,
        panel: [...input.panel],
        attestedByActor: input.attestedByActor,
        attestedDisplay: input.attestedDisplay,
        documentedReason: input.documentedReason,
        auditId: input.auditId ?? null,
      })
      .returning();
  } catch (err) {
    if (isFixedAmountUniqueViolation(err)) throw new PoolFixedAmountVersionConflictError(input.pariwarId);
    throw err;
  }
  const attestation = attestationRows[0];
  if (!attestation) {
    throw new Error('[applyEmergencyOverride] attestation insert returned no row — check session scope');
  }

  return { schedule, attestation };
}

// ── the shared head-insert mechanic ───────────────────────────────────────────

interface InsertNewHeadInput {
  readonly pariwarId: PariwarId;
  readonly fixedAmount: number;
  readonly effectiveFrom: Date;
  readonly changeType: 'standard' | 'emergency';
  readonly actorId: string;
  readonly auditId: string | null;
}

/** Allocate the next version, close the prior open head, insert the new open head. Shared by both
 *  write paths (they differ only in the floor check + change_type + the emergency attestation). */
async function insertNewHead(
  db: Db,
  input: InsertNewHeadInput,
): Promise<PoolFixedAmountScheduleRow> {
  const nextVersion = (await latestScheduleVersion(db, input.pariwarId)) + 1;

  // Close the prior open head FIRST (0 or 1 rows) so the partial-unique open-head index is never
  // transiently violated when the new open head is inserted.
  await closeOpenHead(db, input.pariwarId, input.effectiveFrom);

  let rows: PoolFixedAmountScheduleRow[];
  try {
    rows = await db
      .insert(poolFixedAmountSchedule)
      .values({
        pariwarId: input.pariwarId,
        version: nextVersion,
        fixedAmount: input.fixedAmount,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: null,
        changeType: input.changeType,
        createdByActor: input.actorId,
        auditId: input.auditId,
      })
      .returning();
  } catch (err) {
    // 23505 on (pariwar_id, version) OR the partial-unique open-head index → a concurrent write
    // raced us (the caller re-reads + retries).
    if (isFixedAmountUniqueViolation(err)) throw new PoolFixedAmountVersionConflictError(input.pariwarId);
    throw err;
  }
  const row = rows[0];
  if (!row) {
    throw new Error('[insertNewHead] schedule insert returned no row — check session scope');
  }
  return row;
}

// ── genesis seed (D5) ─────────────────────────────────────────────────────────

/**
 * Seed the GENESIS schedule row for a Pariwar (version 1, `change_type='standard'`,
 * `effective_from = now()`, no notice floor) so a freshly-provisioned Pariwar always has an
 * effective amount and PoolFixedAmountNotConfiguredError never fires in practice (D5). Idempotent by
 * construction: skips the insert (returns the existing OLDEST row instead) whenever the Pariwar
 * already has ANY schedule row at all — not narrowly "already has version 1" (the (pariwar_id,
 * version) unique index is what actually enforces uniqueness of version 1 specifically; this guard is
 * the broader "don't seed a genesis row over an existing history" check, which is what the call sites
 * need). Used by Pariwar provisioning + test fixtures.
 */
export async function seedGenesisFixedAmount(
  db: Db,
  input: { pariwarId: PariwarId; fixedAmount: number; actorId?: string },
): Promise<PoolFixedAmountScheduleRow> {
  assertPositiveAmount(input.fixedAmount);
  const existing = await db
    .select()
    .from(poolFixedAmountSchedule)
    .where(eq(poolFixedAmountSchedule.pariwarId, input.pariwarId))
    .orderBy(asc(poolFixedAmountSchedule.version))
    .limit(1);
  if (existing[0]) return existing[0];

  const rows = await db
    .insert(poolFixedAmountSchedule)
    .values({
      pariwarId: input.pariwarId,
      version: 1,
      fixedAmount: input.fixedAmount,
      effectiveFrom: sql`now()`,
      effectiveUntil: null,
      changeType: 'standard',
      createdByActor: input.actorId ?? 'system:genesis-seed',
      auditId: null,
    })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('[seedGenesisFixedAmount] insert returned no row — check session scope');
  }
  return row;
}

// ── audit/admin reads ─────────────────────────────────────────────────────────

/** A capped list result that also reports whether older rows exist beyond the returned page (review
 *  hardening — a capped list with no signal that more exists silently looks like "the whole history"). */
export interface FixedAmountListPage<T> {
  readonly rows: readonly T[];
  /** `true` iff older rows exist beyond `rows` (the caller hit the page cap). */
  readonly hasMore: boolean;
}

/** `cap(200) + 1` — the fixed N+1 over-fetch ceiling {@link listFixedAmountSchedule} /
 *  {@link listEmergencyAttestations} use to detect `hasMore` without a separate COUNT query. Routed
 *  through `clampLimit` (rather than a bare `limit + 1`) so the domain-accessor-invariants gate's
 *  static scan — which only accepts a `.limit(...)` argument that is an integer literal or a literal
 *  `clampLimit(...)` call — can verify the over-fetch stays bounded; `limit` is itself already
 *  clamped to `[1, 200]`, so `limit + 1 ∈ [2, 201]` and this clamp is a structural no-op. */
const FIXED_AMOUNT_LIST_OVER_FETCH_CAP = 201;

/** The schedule for a Pariwar, newest `version` first, paginated (the audit/admin surface). Fetches
 *  one extra row beyond the requested page to detect `hasMore` without a separate COUNT query. */
export async function listFixedAmountSchedule(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<FixedAmountListPage<PoolFixedAmountScheduleRow>> {
  const limit = clampLimit(opts.limit, { default: 50, cap: 200 });
  const rows = await db
    .select()
    .from(poolFixedAmountSchedule)
    .where(eq(poolFixedAmountSchedule.pariwarId, pariwarId))
    .orderBy(desc(poolFixedAmountSchedule.version))
    .limit(
      clampLimit(limit + 1, {
        default: FIXED_AMOUNT_LIST_OVER_FETCH_CAP,
        cap: FIXED_AMOUNT_LIST_OVER_FETCH_CAP,
      }),
    );
  const hasMore = rows.length > limit;
  return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

/**
 * The immutable Emergency Adjustment Record for an emergency schedule `version` (write-once — no
 * mutating accessor exists). Returns `null` for a standard entry (no attestation) or an unknown
 * version.
 */
export async function getEmergencyAttestation(
  db: Db,
  pariwarId: PariwarId,
  scheduleVersion: number,
): Promise<PoolFixedAmountEmergencyAttestationRow | null> {
  const rows = await db
    .select()
    .from(poolFixedAmountEmergencyAttestations)
    .where(
      and(
        eq(poolFixedAmountEmergencyAttestations.pariwarId, pariwarId),
        eq(poolFixedAmountEmergencyAttestations.scheduleVersion, scheduleVersion),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Emergency attestation records for a Pariwar, newest `schedule_version` first, paginated
 *  (audit/admin). Same N+1 `hasMore` detection as {@link listFixedAmountSchedule}. */
export async function listEmergencyAttestations(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<FixedAmountListPage<PoolFixedAmountEmergencyAttestationRow>> {
  const limit = clampLimit(opts.limit, { default: 50, cap: 200 });
  const rows = await db
    .select()
    .from(poolFixedAmountEmergencyAttestations)
    .where(eq(poolFixedAmountEmergencyAttestations.pariwarId, pariwarId))
    .orderBy(desc(poolFixedAmountEmergencyAttestations.scheduleVersion))
    .limit(
      clampLimit(limit + 1, {
        default: FIXED_AMOUNT_LIST_OVER_FETCH_CAP,
        cap: FIXED_AMOUNT_LIST_OVER_FETCH_CAP,
      }),
    );
  const hasMore = rows.length > limit;
  return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

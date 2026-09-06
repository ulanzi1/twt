// Per-Pariwar DRIVE TARGET — the READ + the TWO GOVERNED WRITES (Story 11b.13, Task 3; AC1-AC4).
//
// Governance of record: `2026-09-04-190` **cl.7** (Trustee-ratified — Dhiraj Rahul + Kalpana
// Bharti) · `2026-09-04-191` **cl.4** (a RUPEE figure) · `2026-09-04-189` **cl.3** (*member ≥
// public*) · `2026-09-05-201` (the two concurrency controls, and why their ORDER is load-bearing) ·
// `2026-09-06-203` (the two keys and the two records).
//
// The pure bounds + predicate live in `drive-target.ts`; this module is the substrate accessor.
// Split for the usual reason: a surface that validates a target must not drag a database into its
// graph.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ TWO SETTERS, BECAUSE THERE ARE TWO GOVERNED ACTS UNDER TWO AUTHORITIES
// ══════════════════════════════════════════════════════════════════════════════════════════════
//   · {@link setDriveTargetSchedule}   — SET the figure.   `pariwar.manage_drive_target`
//                                        (`pariwar_admin` + `super_admin`). cl.7(a).
//   · {@link setDriveTargetVisibility} — REVEAL it.        `pariwar.manage_drive_target_visibility`
//                                        (⛔ `super_admin` ONLY). cl.7(c).
//
// ⭐⭐ `setDriveTargetSchedule` ⛔ CANNOT NAME A REVEAL FLAG — the flags are ⛔ not columns on the
// table it writes (D2, `-203` cl.5). ⇒ *"a `pariwar_admin` target change leaves both flags
// byte-unchanged"* is **TRUE BY CONSTRUCTION**, ⛔ not a discipline this file has to maintain. ⛔ Do
// ⛔ not "helpfully" add a visibility argument to the target setter.
//
// ⚠ AND SETTING IS ⛔ NEVER REVEALING (cl.7(b), AC4): a newly set target is HIDDEN, because the
// visibility record is a SEPARATE row this path never creates. An absent visibility row means
// hidden from everyone — the FAIL-CLOSED default, deliberately the OPPOSITE of the masking
// schedule's `D8-default` FAIL-OPEN.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ `2026-09-05-201`'s TWO CONTROLS — AND THE ORDER IS LOAD-BEARING
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `-201` was ruled on the STRUCTURALLY IDENTICAL masking control and is ⛔ still UNBUILT there.
// ⇒ *"follow the `/p/$pariwarId/nominee-bank-masking` precedent"* would copy a shape that has
// ALREADY been ruled defective. This path carries both controls from day one:
//
//   1. **`Idempotency-Key` — FIRST, opt-in.** Lives at the HTTP boundary
//      (`apps/api/src/modules/drive-target/handlers.ts`), reusing the shared keyed store.
//   2. **`expectedVersion` — SECOND, REQUIRED and `number | null`.** Enforced HERE. `null` means
//      *"I believe this Pariwar has no schedule yet"*, which makes the FIRST write safe too.
//
// ⚠⛔ REVERSED, THE TWO FIGHT EACH OTHER: a legitimate retry after a timeout carries the STALE
// version, `expectedVersion` fires, and the admin is told *"someone else changed this"* — ⛔ when
// the someone was THEMSELVES — driving a re-submit that manufactures the very duplicate the key
// exists to prevent. ⛔ Do ⛔ not reorder them. (Said again at the handler's call site, per `-201`
// cl.2's *"say so at the call site"*.)
//
// ⚠ THE ADVISORY LOCK STAYS. `-201` cl.6: it still prevents the bare `23505` → opaque 500 on the
// SERIALIZED path. ⭐ What it does ⛔ NOT do — and this is the whole finding — is prevent a silent
// overwrite: it converts a race into a QUEUE in which both writers succeed as N and N+1. That is
// `expectedVersion`'s job, ⛔ not the lock's. ⛔ Do not remove either believing the other covers it.
//
// ── Transaction contract (the masking / terms-and-conditions precedent) ─────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do ⛔ NOT open their own
// transaction. Atomicity for the close-head-then-insert-head pair comes from the CALLER's
// transaction, which is MANDATORY anyway: RLS scope (`SET LOCAL app.pariwar_id`) is
// transaction-scoped, so any scoped caller is already inside one.

import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import {
  type PariwarDriveTargetScheduleRow,
  pariwarDriveTargetSchedule,
} from '../schema/pariwar_drive_target_schedule.js';
import {
  type PariwarDriveTargetVisibilityRow,
  pariwarDriveTargetVisibility,
} from '../schema/pariwar_drive_target_visibility.js';
import {
  DEFAULT_DRIVE_TARGET_VISIBILITY,
  type DriveTargetVisibility,
  isRevealCombinationAllowed,
  isValidDriveTargetInr,
} from './drive-target.js';
import {
  DriveTargetInvalidError,
  DriveTargetVersionConflictError,
  DriveTargetVisibilityInvalidError,
  UngovernedDriveTargetChangeError,
} from './errors.js';

/**
 * The permission key that gates SETTING the target. Held by `pariwar_admin` + `super_admin`.
 *
 * ⭐ CROSS-REFERENCE, ⛔ NOT AN OVERLOAD: {@link DRIVE_TARGET_VISIBILITY_PERMISSION_KEY} is the same
 * CLASS under a DIFFERENT AUTHORITY (`-190` cl.7(c)) — ⛔ do not widen either to cover the other.
 * ⚠ And ⛔ do not conclude from this key's `pariwar_admin` grant that
 * `pariwar.manage_nominee_bank_masking` may gain one: that key's foreclosure stands, and the ground
 * for THIS grant is that setting a target discloses NOTHING (`-203` cl.3).
 */
export const DRIVE_TARGET_PERMISSION_KEY = 'pariwar.manage_drive_target';

/**
 * The permission key that gates REVEALING the target. ⛔ `super_admin` ONLY.
 *
 * ⭐ NARROWER than its sibling, and that is a RULING: cl.7(c) reserves the disclosure act to the
 * Trust. ⛔ Granting it to `pariwar_admin` would collapse the authority split that D1 minted two
 * keys and D2 built two tables to make structural.
 */
export const DRIVE_TARGET_VISIBILITY_PERMISSION_KEY = 'pariwar.manage_drive_target_visibility';

// ── READS ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The schedule row IN FORCE at `asOf`, or `null` when none is.
 *
 * ⭐ `null` means **NO TARGET**, which Story 11b.14's ruling makes **⛔ NO BAR** — ⛔ not a bar
 * against a guessed denominator and ⛔ not a division by zero. ⚠ It is a first-class ABSENCE, ⛔ not
 * an error: unlike `getEffectiveFixedAmount` (which throws, because an unset contribution amount has
 * no safe answer), an unset target has a ruled one.
 *
 * The window predicate is `effective_from <= asOf AND (effective_until IS NULL OR asOf <
 * effective_until)` — the `resolveEffectiveFixedAmountRow` / `getEffectiveTc` shape, unchanged.
 * O(1) rows (`ORDER BY … LIMIT 1`), driven by the `(pariwar_id, effective_from)` index.
 */
export async function resolveEffectiveDriveTargetRow(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<PariwarDriveTargetScheduleRow | null> {
  const rows = await db
    .select()
    .from(pariwarDriveTargetSchedule)
    .where(
      and(
        eq(pariwarDriveTargetSchedule.pariwarId, pariwarId),
        lte(pariwarDriveTargetSchedule.effectiveFrom, asOf),
        or(
          isNull(pariwarDriveTargetSchedule.effectiveUntil),
          gt(pariwarDriveTargetSchedule.effectiveUntil, asOf),
        ),
      ),
    )
    .orderBy(
      desc(pariwarDriveTargetSchedule.effectiveFrom),
      desc(pariwarDriveTargetSchedule.version),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The Pariwar's effective target at `asOf`, in whole rupees — or `null` when none is set.
 *
 * ⛔⛔ **STORY 11b.14 CONSUMES THIS SERVER-SIDE ONLY.** The value reaches a read model; it ⛔ NEVER
 * reaches a response body, a member surface or a public surface (cl.7(b), AC6). ⛔ Do not add a
 * caller that serialises the return value onto the wire.
 */
export async function resolveEffectiveDriveTargetInr(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<number | null> {
  const row = await resolveEffectiveDriveTargetRow(db, pariwarId, asOf);
  return row === null ? null : row.targetInr;
}

/**
 * The Pariwar's CURRENT open head — the row with `effective_until IS NULL`, or `null` when the
 * Pariwar has never set a target. The admin console's read, and the source of the `version` a
 * caller echoes back as `expectedVersion`.
 *
 * ⚠ DISTINCT from {@link resolveEffectiveDriveTargetRow}: this looks at the HEAD (what is
 * configured), the resolver at the WINDOW CONTAINING `asOf` (what is in force). They differ for a
 * head whose `effective_from` is in the future — which this write path cannot create (it always
 * takes the server's instant), but a future non-HTTP caller could.
 */
export async function getDriveTargetHead(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarDriveTargetScheduleRow | null> {
  const rows = await db
    .select()
    .from(pariwarDriveTargetSchedule)
    .where(
      and(
        eq(pariwarDriveTargetSchedule.pariwarId, pariwarId),
        isNull(pariwarDriveTargetSchedule.effectiveUntil),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The Pariwar's visibility row, or `null` when it has never been configured.
 *
 * ⚠ Prefer {@link resolveDriveTargetVisibility} on any read path that decides what to SHOW — it
 * resolves the absent row to the ruled default rather than leaving a `null` for a caller to
 * interpret, and a caller interpreting it is exactly how a fail-closed default becomes fail-open.
 */
export async function getDriveTargetVisibilityRow(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarDriveTargetVisibilityRow | null> {
  const rows = await db
    .select()
    .from(pariwarDriveTargetVisibility)
    .where(eq(pariwarDriveTargetVisibility.pariwarId, pariwarId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The Pariwar's reveal posture — the ruled default when no row exists.
 *
 * ⭐⭐ AN ABSENT ROW IS **HIDDEN FROM EVERYONE** (cl.7(b)) — FAIL-CLOSED. ⚠⛔ Deliberately the
 * OPPOSITE of `resolveEffectiveNomineeBankMasking`, whose `null` means NOT MASKED because the Panel
 * ruled `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1). ⛔ Do ⛔ not "align" the two on the strength
 * of their shared shape — see the schema header for why the two defaults point opposite ways.
 * ⇒ an RLS scope failure yielding zero rows lands on **non-disclosure**.
 */
export async function resolveDriveTargetVisibility(
  db: Db,
  pariwarId: PariwarId,
): Promise<DriveTargetVisibility> {
  const row = await getDriveTargetVisibilityRow(db, pariwarId);
  if (row === null) return DEFAULT_DRIVE_TARGET_VISIBILITY;
  return { revealToMembers: row.revealToMembers, revealToPublic: row.revealToPublic };
}

// ── THE GOVERNED WRITE: THE TARGET ──────────────────────────────────────────────────────────────

export interface SetDriveTargetInput {
  pariwarId: PariwarId;
  /** The new target, in WHOLE RUPEES. ⛔ Strictly positive — `0` is rejected, ⛔ never "unset". */
  targetInr: number;
  /**
   * ⭐⭐ `2026-09-05-201` cl.4 — **REQUIRED and `number | null`. ⛔ NOT optional.**
   *
   * The `version` of the open head the caller last saw. `null` is a REAL value meaning *"I believe
   * this Pariwar has no schedule yet"*, which makes the FIRST write safe too when two admins
   * configure a fresh Pariwar at once.
   * ⚠ Required rather than optional on purpose (the 10.8 lesson `-201` cites): a required property
   * turns an omission into a compile error at every call site, where an optional one turns it into
   * a silently unguarded write — the `actorGrants?:` hygiene defect that same review flagged.
   */
  expectedVersion: number | null;
  /**
   * When the new target comes into force, and the instant at which the prior head is closed.
   * ⚠ Injected rather than read from a clock so the close and the insert agree EXACTLY — a second
   * `new Date()` would leave a sub-millisecond window with no row in force.
   */
  effectiveFrom: Date;
  /**
   * WHO changed it. REQUIRED and explicit — `null` means a system/seed write and must be PASSED as
   * null, ⛔ never omitted (the 10.8 lesson).
   */
  changedByActor: UserId | null;
  /** The acting admin's `users.display_name`, SNAPSHOT at write time. Required and explicit. */
  changedByDisplay: string | null;
  /** WHY. ⛔ Non-empty for any actor-attributed change. */
  rationale: string;
  /** The pre-generated §1.5 audit anchor. ⛔ The audit LINE is the caller's obligation. */
  auditId: string | null;
  /**
   * The acting user's effective grants — REQUIRED (a non-empty grant carrying the key) whenever
   * `changedByActor` is non-null. Checked against {@link DRIVE_TARGET_PERMISSION_KEY} at
   * `dimension: 'pariwar'`. A system/seed write (`changedByActor: null`) has no actor to authorize.
   */
  actorGrants?: readonly EffectiveGrant[];
}

/**
 * Set the Pariwar's drive target: close the open head at `effectiveFrom`, insert the new head.
 *
 * ⛔⛔ **IT ⛔ CANNOT TOUCH A REVEAL FLAG** — they are not columns on this table (D2). Setting a
 * target therefore ⛔ never reveals it, and ⛔ never re-states or reverts a reveal the Trust made.
 *
 * ⛔ Refuses an actor-attributed change with no rationale, ANY change with no audit anchor, an
 * attributed change with no display name, a non-positive or non-integer target, and a stale
 * `expectedVersion`. All five are governance requirements, ⛔ not hygiene.
 *
 * ⚠ REQUIRES THE CALLER'S TRANSACTION — the close + insert are two statements and the partial
 * unique index on `(pariwar_id) WHERE effective_until IS NULL` means a half-applied pair is a
 * constraint violation. Every scoped caller is already inside one (RLS is transaction-scoped).
 */
export async function setDriveTargetSchedule(
  db: Db,
  input: SetDriveTargetInput,
): Promise<PariwarDriveTargetScheduleRow> {
  if (!isValidDriveTargetInr(input.targetInr)) {
    // The DB CHECKs are the backstop; this is the readable error an operator's 4xx is built from.
    // ⛔ `0` lands here — a division by zero for the meter, ⛔ not "unset".
    throw new DriveTargetInvalidError(input.targetInr);
  }
  if (input.rationale.trim() === '') {
    throw new UngovernedDriveTargetChangeError('a rationale');
  }
  // A system/seed write (actor null) still needs an anchor — an unattributed change to the figure
  // every drive in a Pariwar is measured against is exactly the one you would want to find in the
  // audit log.
  if (input.auditId === null || input.auditId === '') {
    throw new UngovernedDriveTargetChangeError('an audit anchor (auditId)');
  }
  if (input.changedByActor !== null && (input.changedByDisplay ?? '').trim() === '') {
    // Attribution without a name is attribution nobody can read. Controlled staff data snapshotted
    // at action time, ⛔ never email-derived ([[project_admin_display_name_attribution]]).
    throw new UngovernedDriveTargetChangeError("the actor's display name");
  }
  if (input.changedByActor === null && input.changedByDisplay !== null) {
    // A system/seed write attributed to no actor must not carry a human display name — that
    // combination reads as an attributed change from someone who did not make it (the 10.30 finding,
    // carried from the masking precedent).
    throw new UngovernedDriveTargetChangeError(
      'a null changedByDisplay for a null changedByActor (a system/seed write must not carry a human display name)',
    );
  }
  if (
    input.changedByActor !== null &&
    !hasPermission(input.actorGrants ?? [], DRIVE_TARGET_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: input.pariwarId,
      pariwarId: input.pariwarId,
    })
  ) {
    // `-190` cl.7(a): `pariwar_admin` + `super_admin`. ⛔ `district_admin` / `state_trustee` are
    // INERT in both directions and will land here. A null actor (system/seed) skips this; there is
    // no actor to authorize.
    throw new UngovernedDriveTargetChangeError(
      `the ${DRIVE_TARGET_PERMISSION_KEY} permission (the actor's grants do not carry it)`,
    );
  }

  // Serialize concurrent writers to THIS Pariwar's schedule BEFORE the close-head / max-version /
  // insert sequence — the `pool/fixed-amount.ts` + masking convention (`pg_advisory_xact_lock`
  // over `hashtext(pariwar_id)`; ⛔ do not introduce a different hash function).
  //
  // ⚠⛔ AND `2026-09-05-201`'s FINDING, STATED WHERE IT APPLIES: this lock does ⛔ NOT give
  // lost-update protection. It converts a write-write RACE into a QUEUE — both writers succeed, as
  // N and N+1, and the second never learns the first happened. On the masking control the lock was
  // added to fix a bare `23505` → opaque 500 and, in doing so, REMOVED the only collision that was
  // preventing a silent overwrite. ⇒ the lock and the `expectedVersion` check below are ⛔ NOT
  // alternatives; each covers what the other does not. ⛔ Do not remove either.
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.pariwarId}))`);

  const head = await getDriveTargetHead(db, input.pariwarId);
  const actualVersion = head?.version ?? null;

  // ⭐⭐ `-201` cl.4 — THE LOST-UPDATE GUARD, evaluated INSIDE the lock so the head it reads is the
  // one this write will supersede. `null` expected ⟺ `null` actual is the legitimate first write.
  // ⚠ THE `Idempotency-Key` CHECK HAPPENS **BEFORE** THIS, at the HTTP boundary — ⛔ never after.
  // Reversed, a legitimate retry after a timeout carries a stale version, fires this conflict, and
  // tells the admin "someone else changed this" when the someone was themselves — driving the
  // re-submit that manufactures the duplicate the key exists to prevent (`-201` cl.2).
  if (input.expectedVersion !== actualVersion) {
    throw new DriveTargetVersionConflictError(
      input.pariwarId,
      input.expectedVersion,
      actualVersion,
    );
  }

  // ⭐ CLAMP THE NEW WINDOW'S START TO THE OPEN HEAD'S — the masking module's second-pass finding,
  // carried rather than re-learned. The advisory lock serializes writers but does ⛔ NOT make their
  // CLOCKS agree: two API instances a second apart in NTP drift can produce an `effectiveFrom`
  // EARLIER than the open head's, and the close step below would then set
  // `effective_until < effective_from` on the prior row — violating
  // `…_window_not_inverted` with a bare `23514`, which is not in the error-mapping registry and
  // would surface as an opaque 500. ⭐ The CHECK is correct and stays; this clamps the input that
  // would violate it rather than relaxing the guard.
  // ⛔ NOT a silent correction of operator intent: `effectiveFrom` is ⛔ never caller-supplied (the
  // contract has no such field; the handler passes the server clock), so the only thing reconciled
  // here is clock skew between our own instances — ⛔ never a human's chosen instant.
  const effectiveFrom =
    head !== null && head.effectiveFrom.getTime() > input.effectiveFrom.getTime()
      ? head.effectiveFrom
      : input.effectiveFrom;

  // Close the prior open head AT the new row's `effective_from` — ⛔ never at a second `new Date()`.
  await db
    .update(pariwarDriveTargetSchedule)
    .set({ effectiveUntil: effectiveFrom })
    .where(
      and(
        eq(pariwarDriveTargetSchedule.pariwarId, input.pariwarId),
        isNull(pariwarDriveTargetSchedule.effectiveUntil),
      ),
    );

  // ⚠ The next version is derived from the MAX over the Pariwar's rows, ⛔ not from the closed head:
  // a Pariwar whose only rows are already-closed (a head closed by a superseding write that then
  // rolled back) would otherwise re-allocate a version the unique index has already taken.
  const maxRows = await db
    .select({ maxVersion: sql<number | string | null>`max(${pariwarDriveTargetSchedule.version})` })
    .from(pariwarDriveTargetSchedule)
    .where(eq(pariwarDriveTargetSchedule.pariwarId, input.pariwarId));
  // ⚠ `max()` over an integer column comes back as a NUMBER, but the null arm is real (no rows), and
  // the driver's typing is loose enough that a string would pass silently — coerce at this boundary
  // ([[project_contribution_fact_projection_substrate]]).
  const rawMax = maxRows[0]?.maxVersion ?? null;
  const nextVersion = rawMax === null ? 1 : Number(rawMax) + 1;

  const rows = await db
    .insert(pariwarDriveTargetSchedule)
    .values({
      pariwarId: input.pariwarId,
      version: nextVersion,
      targetInr: input.targetInr,
      // ⭐ THE CLAMPED value — the new head and the close instant must be the SAME instant, or the
      // zero-width supersession the CHECK deliberately allows becomes a gap with no row in force.
      effectiveFrom,
      effectiveUntil: null,
      changedByActor: input.changedByActor,
      changedByDisplay: input.changedByDisplay,
      rationale: input.rationale,
      auditId: input.auditId,
      // ⛔⛔ NOTE WHAT IS ABSENT AND CANNOT BE ADDED: there is ⛔ no `revealToMembers` /
      // `revealToPublic` here, because they are ⛔ not columns on this table. That is D2's whole
      // point — the authority split is a DB fact, ⛔ not a code review.
    })
    .returning();

  const row = rows[0];
  if (row === undefined) {
    throw new Error('drive-target schedule insert returned no row (unexpected)');
  }
  return row;
}

// ── THE GOVERNED WRITE: THE REVEAL ──────────────────────────────────────────────────────────────

export interface SetDriveTargetVisibilityInput {
  pariwarId: PariwarId;
  /** The two switches, as ONE value — so an ILLEGAL COMBINATION is checkable before any write. */
  visibility: DriveTargetVisibility;
  changedByActor: UserId | null;
  changedByDisplay: string | null;
  /** WHY. ⛔ Non-empty for any actor-attributed change — a disclosure decision is not a value swap. */
  rationale: string;
  auditId: string | null;
  /** Checked against {@link DRIVE_TARGET_VISIBILITY_PERMISSION_KEY} at `dimension: 'pariwar'`. */
  actorGrants?: readonly EffectiveGrant[];
  /** The write instant (`updated_at`). Injected, ⛔ never a clock read inside the accessor. */
  now: Date;
}

/**
 * Set the Pariwar's reveal switches — the `super_admin`-only disclosure act (cl.7(c)).
 *
 * ⛔⛔ **IT ⛔ CANNOT TOUCH THE TARGET.** The figure is not a column on this table (D2), so a reveal
 * ⛔ never changes what is being revealed — the mirror image of the guarantee on the setter above.
 *
 * ⭐ REFUSES public-revealed-while-member-hidden (`-189` cl.3) BEFORE the write; the DB CHECK
 * `pariwar_drive_target_visibility_member_ge_public` is the backstop. ⚠ ENFORCED, ⛔ not documented.
 *
 * ⚠ A PLAIN UPSERT, ⛔ not a schedule — this record has no version chain and no effective window
 * (`-203` cl.5, which also rules that it does ⛔ NOT inherit `expectedVersion`: there is no version
 * to compare). Its trail lives in the §1.5 audit chain, exactly as for the two sibling
 * `super_admin`-only disclosure controls (`pariwar_public_name_presentation` /
 * `pariwar_directory_publication`). ⛔ Do not infer a weaker posture — it is the SAME one.
 */
export async function setDriveTargetVisibility(
  db: Db,
  input: SetDriveTargetVisibilityInput,
): Promise<PariwarDriveTargetVisibilityRow> {
  if (!isRevealCombinationAllowed(input.visibility)) {
    throw new DriveTargetVisibilityInvalidError();
  }
  if (input.rationale.trim() === '') {
    throw new UngovernedDriveTargetChangeError('a rationale');
  }
  if (input.auditId === null || input.auditId === '') {
    throw new UngovernedDriveTargetChangeError('an audit anchor (auditId)');
  }
  if (input.changedByActor !== null && (input.changedByDisplay ?? '').trim() === '') {
    throw new UngovernedDriveTargetChangeError("the actor's display name");
  }
  if (input.changedByActor === null && input.changedByDisplay !== null) {
    throw new UngovernedDriveTargetChangeError(
      'a null changedByDisplay for a null changedByActor (a system/seed write must not carry a human display name)',
    );
  }
  if (
    input.changedByActor !== null &&
    !hasPermission(input.actorGrants ?? [], DRIVE_TARGET_VISIBILITY_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: input.pariwarId,
      pariwarId: input.pariwarId,
    })
  ) {
    // ⛔⛔ THIS IS THE DENIAL A `pariwar_admin` HITS, and it is the regression AC3 exists to prevent:
    // the write key must ⛔ never quietly carry the reveal. `-190` cl.7(c) reserves this to the
    // Trust; the key is `super_admin` ONLY.
    throw new UngovernedDriveTargetChangeError(
      `the ${DRIVE_TARGET_VISIBILITY_PERMISSION_KEY} permission (the actor's grants do not carry it — this is a super_admin-only disclosure act under 2026-09-04-190 cl.7(c))`,
    );
  }

  const rows = await db
    .insert(pariwarDriveTargetVisibility)
    .values({
      pariwarId: input.pariwarId,
      revealToMembers: input.visibility.revealToMembers,
      revealToPublic: input.visibility.revealToPublic,
      changedByActor: input.changedByActor,
      changedByDisplay: input.changedByDisplay,
      rationale: input.rationale,
      auditId: input.auditId,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: pariwarDriveTargetVisibility.pariwarId,
      set: {
        revealToMembers: input.visibility.revealToMembers,
        revealToPublic: input.visibility.revealToPublic,
        changedByActor: input.changedByActor,
        changedByDisplay: input.changedByDisplay,
        rationale: input.rationale,
        auditId: input.auditId,
        updatedAt: input.now,
        // ⛔ `createdAt` is deliberately NOT in the update set — it records when this Pariwar's
        // reveal posture was FIRST configured, which is a different fact from when it last changed.
      },
    })
    .returning();

  const row = rows[0];
  if (row === undefined) {
    throw new Error('drive-target visibility upsert returned no row (unexpected)');
  }
  return row;
}

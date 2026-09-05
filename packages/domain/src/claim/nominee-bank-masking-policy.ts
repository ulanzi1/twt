// Per-Pariwar nominee-bank MASKING SCHEDULE — READ + GOVERNED WRITE (Story 11b.3a, Task 1; AC3, AC5).
//
// Governance of record: `2026-08-28-160` **cl.10(b)–(d), (g)** (Trustee-ratified) ·
// `2026-09-02-178` (the knob is the **Trust's, centrally** — `super_admin`) · `2026-09-02-179` cl.1
// (`D8-default` **FAIL-OPEN**) · `2026-09-02-183` cl.1–3 (the key, minted).
//
// The PURE projection + predicate live in `nominee-bank-masking.ts`; this module is the substrate
// accessor. Split for the usual reason: the predicate must stay importable by any surface that
// renders a masked value without dragging a database into its graph.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ CHANGING THE SCHEDULE IS A GOVERNED ACT — THE 11a.1 ACCOUNTABILITY SHAPE, REUSED
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ REUSED, ⛔ NOT RE-INVENTED. `kyc/presentation-policy.ts` already enforces exactly this shape and
// `member/directory-publication.ts` already copies it once; this is its third application, and it is
// deliberately the SAME three enforcements — ⛔ none of which is a UI:
//   1. A dedicated permission key, `pariwar.manage_nominee_bank_masking`, granted to `super_admin`
//      ONLY (`2026-09-02-178`; minted at `2026-09-02-183` cl.1–3, catalog v39). ⛔ NOT
//      `pariwar_admin` — the Panel ruled cl.10(b)'s *"Trust-Admin controlled"* speaks to AUTHORITY
//      and means the TRUST. ⭐ `2026-08-19-136` cl.3's two-axis separation is FOLLOWED: per-Pariwar
//      in SCOPE, central in AUTHORITY.
//   2. A REQUIRED `rationale` + actor + display snapshot on the write. A change to how long the whole
//      internet can see a family's bank account number must ⛔ not be recordable as a bare value swap
//      (the `feature_flag.flip` precedent).
//   3. A §1.5 hash-chain audit line, anchored by a pre-generated `auditId`. Writing the LINE is the
//      CALLER's obligation (the 10.12 narrow-write posture); this module REFUSES the write without
//      its anchor rather than silently accepting an unanchored change.
//
// ⛔⛔ THIS PATH NEVER TOUCHES A BANK ROW. It writes a per-Pariwar SETTING. `2026-08-28-160`
// **cl.10(g)** keeps the complete details in the protected internal record, so masking is a
// PROJECTION applied at the API boundary — ⛔ never a deletion, ⛔ never an overwrite, ⛔ never a
// re-encrypt, and ⛔ never a column on `claim_nominee_bank_accounts` (cl.10(d), Trap 3).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐⛔⛔ STATUS AS OF STORY 11b.11 (2026-09-05) — **RETAINED, AND WITH ⛔ NO PUBLIC CONSUMER**
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-04-190` **cl.1** (Trustee-ratified) withdrew the nominee banking coordinates from the
// public Sahyog Vivran surface and `2026-09-04-191` **cl.1** withdrew the VPA. ⇒
// `pool/sahyog-vivran-read.ts` no longer calls `resolveEffectiveNomineeBankMasking` at all, and this
// schedule now governs ⛔ nothing that renders.
// ⛔⛔ **RETAINED IN TERMS** — `-190` **cl.4**, *"we may use it in future"*: this module, the
// `pariwar_nominee_bank_masking_schedule` table, `pariwar.manage_nominee_bank_masking`, the admin
// surface and every test SURVIVE. ⛔ Delete nothing.
// ⚠⛔ **AND ⛔ DO ⛔ NOT DESCRIBE IT AS A LIVE SAFEGUARD** — here, in a review, or on any
// Trustee-facing material — until it has a consumer again. ⭐ The three REACTIVATION PRECONDITIONS
// that must be met BEFORE it is re-pointed at any surface are recorded in full at the head of
// `nominee-bank-masking.ts`: **(a)** un-masking is RETROACTIVE and one PUT's blast radius is
// unbounded and unpreviewable; **(b)** RLS scope failure is INDISTINGUISHABLE from *"no window
// configured"* and resolves to PUBLISH — `2026-09-02-179` cl.1 ruled the POLICY default fail-open,
// ⛔ not INFRASTRUCTURE FAILURE, which ⛔ nobody ruled; **(c)** remediation is O(N) admin requests
// plus a five-minute cache floor, documented three times and mitigated zero.
// ⛔ They are **DORMANT, ⛔ NOT RESOLVED.** `D8-default` FAIL-OPEN is UNCHANGED (11b.11 AC7).
//
// ── ⭐ REVERSIBILITY IS STRUCTURAL, ⛔ not a promise (cl.10(c)) ────────────────────────────────────
// A change CLOSES the prior open head (`effective_until = effective_from` of the new row) and INSERTS
// a new head, the `terms_and_conditions_versions` supersede mechanic. ⇒ there is ⛔ no "already
// masked, cannot unmask" branch anywhere here and there must never be one, and every prior window
// survives in the trail.
// ⚠⛔ **REVERSIBILITY CUTS BOTH WAYS, AND THIS PARAGRAPH USED TO CELEBRATE ONLY ONE DIRECTION.**
// Reversing TOWARD disclosure is a **BULK DISCLOSURE EVENT**: the schedule resolves at the REQUEST
// instant, ⛔ never at a drive's close instant, so one PUT can re-publish an entire archive. ⭐ See
// precondition (a). ⛔ Recorded here because this is the paragraph a reader reaches first.
//
// ── Transaction contract (the terms-and-conditions/write.ts precedent) ───────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do ⛔ NOT open their own
// transaction. Atomicity for the close-head-then-insert-head pair comes from the CALLER's
// transaction, which is MANDATORY anyway: RLS scope (`SET LOCAL app.pariwar_id`) is
// transaction-scoped, so any scoped caller is already inside one.

import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import {
  type PariwarNomineeBankMaskingScheduleRow,
  pariwarNomineeBankMaskingSchedule,
} from '../schema/pariwar_nominee_bank_masking_schedule.js';
import {
  MAX_NOMINEE_BANK_MASK_AFTER_DAYS,
  type NomineeBankMaskingSetting,
} from './nominee-bank-masking.js';

/**
 * The permission key that gates a schedule change. Held by `super_admin` ONLY.
 *
 * ⭐ CROSS-REFERENCE, ⛔ NOT AN OVERLOAD: `pariwar.manage_public_name_presentation`
 * (`kyc/presentation-policy.ts`) is the same CLASS under the same AUTHORITY (`2026-09-02-178` cl.2)
 * — ⛔ but a different governed act, so it is a different key (`2026-09-02-183` cl.1). ⛔ Do not
 * widen either one to cover the other *"for symmetry"*.
 */
export const NOMINEE_BANK_MASKING_PERMISSION_KEY = 'pariwar.manage_nominee_bank_masking';

/** Map a stored row to the pure setting union. ⛔ The DB CHECK is what makes this total. */
export function settingFromRow(
  row: PariwarNomineeBankMaskingScheduleRow,
): NomineeBankMaskingSetting {
  if (row.maskingMode === 'permanent') return { mode: 'permanent' };
  if (row.maskAfterDays === null) {
    // Unreachable while `pariwar_nominee_bank_masking_schedule_setting_check` stands. ⛔ Loud rather
    // than defaulted: silently picking a side here is the one failure this control cannot afford.
    throw new Error(
      `[nominee-bank-masking] schedule row ${row.id} is mode 'after_days' with a NULL ` +
        `mask_after_days — the DB CHECK that forbids this is missing or was dropped. ` +
        `⛔ Do not "fix" this by defaulting; restore the constraint.`,
    );
  }
  return { mode: 'after_days', maskAfterDays: row.maskAfterDays };
}

/**
 * The schedule row IN FORCE at `asOf`, or `null` when none is.
 *
 * ⭐ `null` is the FAIL-OPEN state — `D8-default` (`2026-09-02-179` cl.1): a Pariwar with no window
 * keeps its nominee bank details VISIBLE until the Trust sets one. ⛔ Do ⛔ not turn a `null` into a
 * masked default anywhere downstream; cl.10(b) forbids the code assuming immediate masking.
 *
 * The window predicate is `effective_from <= asOf AND (effective_until IS NULL OR asOf <
 * effective_until)` — the `resolveEffectiveFixedAmountRow` / `getEffectiveTc` shape, unchanged.
 * O(1) rows (`ORDER BY … LIMIT 1`), driven by the `(pariwar_id, effective_from)` index.
 */
export async function resolveEffectiveNomineeBankMaskingRow(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<PariwarNomineeBankMaskingScheduleRow | null> {
  const rows = await db
    .select()
    .from(pariwarNomineeBankMaskingSchedule)
    .where(
      and(
        eq(pariwarNomineeBankMaskingSchedule.pariwarId, pariwarId),
        lte(pariwarNomineeBankMaskingSchedule.effectiveFrom, asOf),
        or(
          isNull(pariwarNomineeBankMaskingSchedule.effectiveUntil),
          gt(pariwarNomineeBankMaskingSchedule.effectiveUntil, asOf),
        ),
      ),
    )
    .orderBy(
      desc(pariwarNomineeBankMaskingSchedule.effectiveFrom),
      desc(pariwarNomineeBankMaskingSchedule.version),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The Pariwar's effective masking SETTING at `asOf` — the render path's entry point.
 *
 * ⭐ `null` ⇒ ⛔ NOT MASKED (FAIL-OPEN). ⛔ It does ⛔ not throw on an unconfigured Pariwar, and that
 * is the deliberate difference from `getEffectiveFixedAmount`, which DOES: an unset contribution
 * amount has no safe answer, whereas an unset masking window has a RULED one.
 */
export async function resolveEffectiveNomineeBankMasking(
  db: Db,
  pariwarId: PariwarId,
  asOf: Date,
): Promise<NomineeBankMaskingSetting | null> {
  const row = await resolveEffectiveNomineeBankMaskingRow(db, pariwarId, asOf);
  return row === null ? null : settingFromRow(row);
}

/**
 * The Pariwar's CURRENT open head — the row with `effective_until IS NULL`, or `null` when the
 * Pariwar has never configured a window. The admin console's read.
 *
 * ⚠ DISTINCT from {@link resolveEffectiveNomineeBankMaskingRow}: this looks at the HEAD (what is configured),
 * the resolver above at the WINDOW CONTAINING `asOf` (what is in force). They differ for a head whose
 * `effective_from` is in the future.
 */
export async function getNomineeBankMaskingHead(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarNomineeBankMaskingScheduleRow | null> {
  const rows = await db
    .select()
    .from(pariwarNomineeBankMaskingSchedule)
    .where(
      and(
        eq(pariwarNomineeBankMaskingSchedule.pariwarId, pariwarId),
        isNull(pariwarNomineeBankMaskingSchedule.effectiveUntil),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Thrown when a schedule change arrives without the governance record the ruling requires. */
export class UngovernedNomineeBankMaskingChangeError extends Error {
  constructor(missing: string) {
    super(
      `nominee-bank masking schedule change rejected — missing ${missing}. Changing how long a ` +
        `family's bank account number stays visible on an unauthenticated public page is a ` +
        `GOVERNED ACT (2026-08-28-160 cl.10, 2026-09-02-178), not a value swap. ⛔ Do not relax ` +
        `this check; record the change.`,
    );
    this.name = 'UngovernedNomineeBankMaskingChangeError';
  }
}

export interface SetNomineeBankMaskingInput {
  pariwarId: PariwarId;
  /** The new setting — cl.10(c)'s `0 days` / `N days` / `permanent`, as ONE value. */
  setting: NomineeBankMaskingSetting;
  /**
   * When the new setting comes into force, and the instant at which the prior head is closed.
   * ⚠ Injected rather than read from a clock so the close and the insert agree EXACTLY — a second
   * `new Date()` would leave a sub-millisecond window with no row in force, which under FAIL-OPEN
   * means a window in which a full account number is public.
   */
  effectiveFrom: Date;
  /**
   * WHO changed it. REQUIRED and explicit — `null` means a system/seed write and must be PASSED as
   * null, never omitted (the 10.8 lesson: a required property turns an omission into a compile error
   * at every call site).
   */
  changedByActor: UserId | null;
  /** The acting admin's `users.display_name`, SNAPSHOT at write time. Required and explicit. */
  changedByDisplay: string | null;
  /** WHY. ⛔ Non-empty for any actor-attributed change — see the class doc above. */
  rationale: string;
  /** The pre-generated §1.5 audit anchor. ⛔ The audit LINE is the caller's obligation. */
  auditId: string | null;
  /**
   * The acting user's effective grants — REQUIRED (a non-empty grant carrying the key) whenever
   * `changedByActor` is non-null. Checked against {@link NOMINEE_BANK_MASKING_PERMISSION_KEY} at
   * `dimension: 'pariwar'` before the write proceeds. A system/seed write (`changedByActor: null`)
   * has no actor to authorize — omit or pass `[]`.
   */
  actorGrants?: readonly EffectiveGrant[];
}

/**
 * Set the Pariwar's masking schedule: close the open head at `effectiveFrom`, insert the new head.
 *
 * ⭐ Moves in EVERY direction by construction (cl.10(c) — *"reversible and re-configurable"*). There
 * is ⛔ no "already masked, cannot unmask" branch, and a test asserts a `permanent` Pariwar can be
 * returned to `after_days: 30`.
 *
 * ⛔ Refuses an actor-attributed change that carries no rationale, and refuses ANY change with no
 * audit anchor. Both are governance requirements, ⛔ not hygiene: a change nobody can explain and a
 * change nobody can trace are the two ways this becomes a value swap.
 *
 * ⚠ REQUIRES THE CALLER'S TRANSACTION. The close + insert are two statements and the partial unique
 * index on `(pariwar_id) WHERE effective_until IS NULL` means a half-applied pair is a constraint
 * violation, not a silent partial state — but the caller's tx is what makes it atomic. Every scoped
 * caller is already inside one (RLS is transaction-scoped).
 */
export async function setNomineeBankMaskingSchedule(
  db: Db,
  input: SetNomineeBankMaskingInput,
): Promise<PariwarNomineeBankMaskingScheduleRow> {
  if (input.rationale.trim() === '') {
    throw new UngovernedNomineeBankMaskingChangeError('a rationale');
  }
  // A system/seed write (actor null) still needs an anchor — an unattributed change to what a public
  // page shows of a bank account is exactly the one you would most want to find in the audit log.
  if (input.auditId === null || input.auditId === '') {
    throw new UngovernedNomineeBankMaskingChangeError('an audit anchor (auditId)');
  }
  if (input.changedByActor !== null && (input.changedByDisplay ?? '').trim() === '') {
    // Attribution without a name is attribution nobody can read. The display name is controlled
    // staff data snapshotted at action time, ⛔ never email-derived.
    throw new UngovernedNomineeBankMaskingChangeError("the actor's display name");
  }
  if (input.changedByActor === null && input.changedByDisplay !== null) {
    // A system/seed write attributed to no actor must not also carry a human display name — that
    // combination reads as an attributed change from someone who did not make it (the 10.30 finding).
    throw new UngovernedNomineeBankMaskingChangeError(
      'a null changedByDisplay for a null changedByActor (a system/seed write must not carry a human display name)',
    );
  }
  if (
    input.changedByActor !== null &&
    !hasPermission(input.actorGrants ?? [], NOMINEE_BANK_MASKING_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: input.pariwarId,
      pariwarId: input.pariwarId,
    })
  ) {
    // `2026-09-02-178`: `super_admin` ONLY — ⛔ `pariwar_admin` does not hold this key, and granting
    // it "for symmetry" with the neighbouring tenant-content keys would reverse a ratified ruling by
    // way of a catalog edit. A null actor (system/seed write) skips this check; there is no actor.
    throw new UngovernedNomineeBankMaskingChangeError(
      `the ${NOMINEE_BANK_MASKING_PERMISSION_KEY} permission (the actor's grants do not carry it)`,
    );
  }
  const maskAfterDays = input.setting.mode === 'after_days' ? input.setting.maskAfterDays : null;
  if (
    maskAfterDays !== null &&
    (!Number.isInteger(maskAfterDays) ||
      maskAfterDays < 0 ||
      maskAfterDays > MAX_NOMINEE_BANK_MASK_AFTER_DAYS)
  ) {
    // The DB CHECK is the backstop; this is the readable error an operator's 400 is built from.
    throw new UngovernedNomineeBankMaskingChangeError(
      `a whole day count in 0…${String(MAX_NOMINEE_BANK_MASK_AFTER_DAYS)} (got ${String(maskAfterDays)})`,
    );
  }

  // Serialize concurrent writers to THIS Pariwar's schedule BEFORE the close-head / max-version /
  // insert sequence (review 2026-09-03). Without it two interleaved `super_admin` PUTs both read the
  // same `max(version)` and the loser hits `pariwar_nominee_bank_masking_schedule_pariwar_version_uq`
  // (or `…_pariwar_current_uq`) with a bare 23505 — which is not in the error-mapping registry, so
  // the caller sees an opaque 500 for a benign write-write race. Transaction-scoped, auto-released at
  // COMMIT/ROLLBACK; mirrors the `pg_advisory_xact_lock(hashtext(...))` convention in
  // `pool/fixed-amount.ts` — the `pool_fixed_amount_schedule` precedent the Panel named for this
  // table. ⛔ Do not introduce a different hash function.
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.pariwarId}))`);

  // ⭐ CLAMP THE NEW WINDOW'S START TO THE OPEN HEAD'S (second-pass review, 2026-09-03).
  //
  // ⚠ The advisory lock above serializes writers, but it does ⛔ NOT make their CLOCKS agree. Two API
  // instances a second apart in NTP drift can produce an `effectiveFrom` EARLIER than the open head's
  // `effective_from` written moments before. The close step below would then set
  // `effective_until < effective_from` on the prior row, violating migration 0113's
  // `…_window_not_inverted` CHECK with a bare `23514` — which is ⛔ not in the error-mapping registry
  // and therefore surfaces as an opaque 500, on a module whose header states in terms that
  // "⛔ NONE of them is a 500". ⭐ Note the CHECK itself is correct and stays: this clamps the input
  // that would violate it rather than relaxing the guard.
  //
  // ⛔ NOT a silent correction of operator intent: `effectiveFrom` is ⛔ never caller-supplied (the
  // contract has no such field; the handler passes the server clock), so the only thing being
  // reconciled here is clock skew between our own instances — never a human's chosen instant.
  const head = await getNomineeBankMaskingHead(db, input.pariwarId);
  const effectiveFrom =
    head !== null && head.effectiveFrom.getTime() > input.effectiveFrom.getTime()
      ? head.effectiveFrom
      : input.effectiveFrom;

  // Close the prior open head AT the new row's `effective_from` — ⛔ never at a second `new Date()`.
  // The partial unique index means an unclosed head would reject the insert below, so this is the
  // ordering the constraint requires rather than a convention.
  await db
    .update(pariwarNomineeBankMaskingSchedule)
    .set({ effectiveUntil: effectiveFrom })
    .where(
      and(
        eq(pariwarNomineeBankMaskingSchedule.pariwarId, input.pariwarId),
        isNull(pariwarNomineeBankMaskingSchedule.effectiveUntil),
      ),
    );

  // ⚠ The next version is derived from the MAX over the Pariwar's rows, ⛔ not from the closed head:
  // a Pariwar whose only rows are already-closed (a head closed by a superseding write that then
  // rolled back) would otherwise re-allocate a version the unique index has already taken.
  const maxRows = await db
    .select({ maxVersion: sql<number | string | null>`max(${pariwarNomineeBankMaskingSchedule.version})` })
    .from(pariwarNomineeBankMaskingSchedule)
    .where(eq(pariwarNomineeBankMaskingSchedule.pariwarId, input.pariwarId));
  // ⚠ `max()` over an integer column comes back as a NUMBER, but the null arm is real (no rows), and
  // the driver's typing is loose enough that a string would pass silently — coerce at this boundary.
  const rawMax = maxRows[0]?.maxVersion ?? null;
  const nextVersion = rawMax === null ? 1 : Number(rawMax) + 1;

  const rows = await db
    .insert(pariwarNomineeBankMaskingSchedule)
    .values({
      pariwarId: input.pariwarId,
      version: nextVersion,
      maskingMode: input.setting.mode,
      maskAfterDays,
      // ⭐ THE CLAMPED value — the new head and the close instant above must be the SAME instant, or
      // the zero-width supersession the CHECK deliberately allows becomes a gap with no row in force.
      effectiveFrom,
      effectiveUntil: null,
      changedByActor: input.changedByActor,
      changedByDisplay: input.changedByDisplay,
      rationale: input.rationale,
      auditId: input.auditId,
    })
    .returning();

  const row = rows[0];
  if (row === undefined) {
    throw new Error('nominee-bank masking schedule insert returned no row (unexpected)');
  }
  return row;
}

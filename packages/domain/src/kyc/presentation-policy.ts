// Per-Pariwar public-name presentation policy — READ + GOVERNED WRITE (Story 11a.1, Task 8; AC5).
//
// The pure resolver lives in `public-name.ts`; this module is the substrate accessor. Split for the
// usual reason: the resolver must stay importable by any surface that renders a name, including ones
// that already hold the mode, without dragging a database into their graph.
//
// ── ⛔ CHANGING THE MODE IS A GOVERNED ACT ──────────────────────────────────────────────────────
// `2026-08-19-136` cl.3 is explicit that this is not a casual Pariwar-Admin toggle. Three things
// enforce that, and none of them is a UI:
//   1. A dedicated permission key, `pariwar.manage_public_name_presentation`, granted to
//      super_admin ONLY — ⛔ deliberately NOT `pariwar_admin`, which holds every other
//      tenant-content key. That exclusion IS the ruling, expressed in the catalog.
//   2. A REQUIRED `rationale` + actor + display snapshot on the write. A change to how every
//      member's name appears on an unauthenticated page must not be recordable as a bare value swap
//      (the `feature_flag.flip` precedent).
//   3. A §1.5 hash-chain audit line, anchored by a pre-generated `auditId`. Writing the LINE is the
//      CALLER's obligation — the 10.12 narrow-write posture — and this module refuses the write
//      without its anchor rather than silently accepting an unanchored change.
// ⛔ NO self-serve admin toggle UI ships in this story (Story 11a.1 scope boundary).
//
// ⛔ THIS PATH NEVER WRITES A NAME. It writes a MODE. `member_kyc_profiles.name_ciphertext` is
// untouched by every function here — `-136` cl.2 forbids a second identity system, and the owed
// configurability test asserts the stored name is byte-identical across a flip and a flip back.

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import {
  pariwarPublicNamePresentation,
  type PariwarPublicNamePresentationRow,
} from '../schema/pariwar_public_name_presentation.js';
import {
  DEFAULT_PUBLIC_NAME_PRESENTATION_MODE,
  type PublicNamePresentationMode,
} from './public-name.js';

/** The permission key that gates a mode change. Held by super_admin / the Trustee Panel ONLY. */
export const PUBLIC_NAME_PRESENTATION_PERMISSION_KEY = 'pariwar.manage_public_name_presentation';

/** Read the Pariwar's stored config row, or `null` when none has ever been written. */
export async function getPublicNamePresentationRow(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarPublicNamePresentationRow | null> {
  const rows = await db
    .select()
    .from(pariwarPublicNamePresentation)
    .where(eq(pariwarPublicNamePresentation.pariwarId, pariwarId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the Pariwar's effective presentation mode — the value a render should read.
 *
 * ⚠ An absent row resolves to the RULED default (`full_name`), ⛔ not to a fail-closed shield. That
 * asymmetry with the rest of the codebase is deliberate and is argued at `public-name.ts`: shielding
 * on a missing row would silently contradict a ratified Panel ruling. What an absent row means is
 * "this Pariwar has not overridden the ruling", and the ruling is full names.
 */
export async function resolvePublicNamePresentationMode(
  db: Db,
  pariwarId: PariwarId,
): Promise<PublicNamePresentationMode> {
  const row = await getPublicNamePresentationRow(db, pariwarId);
  return row?.mode ?? DEFAULT_PUBLIC_NAME_PRESENTATION_MODE;
}

/** Thrown when a mode change arrives without the governance record the ruling requires. */
export class UngovernedPresentationChangeError extends Error {
  constructor(missing: string) {
    super(
      `public-name presentation mode change rejected — missing ${missing}. Changing how every ` +
        `member's name appears on an unauthenticated public page is a GOVERNED ACT ` +
        `(2026-08-19-136 cl.3), not a value swap. ⛔ Do not relax this check; record the change.`,
    );
    this.name = 'UngovernedPresentationChangeError';
  }
}

export interface SetPublicNamePresentationInput {
  pariwarId: PariwarId;
  mode: PublicNamePresentationMode;
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
   * `changedByActor` is non-null. Checked against `PUBLIC_NAME_PRESENTATION_PERMISSION_KEY` at
   * `dimension: 'pariwar'` before the write proceeds (code review 2026-08-20: the permission key
   * was in the catalog with the correct `pariwar_admin` exclusion, but nothing checked it). A
   * system/seed write (`changedByActor: null`) has no actor to authorize — omit or pass `[]`.
   */
  actorGrants?: readonly EffectiveGrant[];
}

/**
 * Set the Pariwar's public-name presentation mode (upsert on the unique `pariwar_id`).
 *
 * ⭐ Moves in BOTH directions by construction — there is no "already shielded, cannot unshield"
 * branch anywhere here, because `-136` cl.3 says this is not a one-way ratchet. A Pariwar that
 * shields may unshield under the same authority, and a test asserts it.
 *
 * ⛔ Refuses an actor-attributed change that carries no rationale, and refuses any change with no
 * audit anchor. Both are governance requirements, not hygiene: a change nobody can explain and a
 * change nobody can trace are the two ways this becomes a value swap.
 */
export async function setPublicNamePresentationMode(
  db: Db,
  input: SetPublicNamePresentationInput,
): Promise<PariwarPublicNamePresentationRow> {
  if (input.rationale.trim() === '') throw new UngovernedPresentationChangeError('a rationale');
  // A system/seed write (actor null) still needs an anchor — an unattributed change to a public
  // identity surface is exactly the one you would most want to find in the audit log later.
  if (input.auditId === null || input.auditId === '') {
    throw new UngovernedPresentationChangeError('an audit anchor (auditId)');
  }
  if (input.changedByActor !== null && (input.changedByDisplay ?? '').trim() === '') {
    // Attribution without a name is attribution nobody can read. The display name is controlled
    // staff data snapshotted at action time, never email-derived.
    throw new UngovernedPresentationChangeError("the actor's display name");
  }
  if (input.changedByActor === null && input.changedByDisplay !== null) {
    // A system/seed write attributed to no actor must not also carry a human display name — that
    // combination reads as an attributed change from someone who did not make it (code review
    // 2026-08-20).
    throw new UngovernedPresentationChangeError(
      'a null changedByDisplay for a null changedByActor (a system/seed write must not carry a human display name)',
    );
  }
  if (
    input.changedByActor !== null &&
    !hasPermission(input.actorGrants ?? [], PUBLIC_NAME_PRESENTATION_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: input.pariwarId,
      pariwarId: input.pariwarId,
    })
  ) {
    // `2026-08-19-136` cl.3: super_admin ONLY — ⛔ pariwar_admin does not hold this key. A null
    // actor (system/seed write) skips this check; there is no actor to authorize.
    throw new UngovernedPresentationChangeError(
      `the ${PUBLIC_NAME_PRESENTATION_PERMISSION_KEY} permission (the actor's grants do not carry it)`,
    );
  }

  const now = new Date();
  const values = {
    pariwarId: input.pariwarId,
    mode: input.mode,
    changedByActor: input.changedByActor,
    changedByDisplay: input.changedByDisplay,
    rationale: input.rationale,
    auditId: input.auditId,
    updatedAt: now,
  };

  const rows = await db
    .insert(pariwarPublicNamePresentation)
    .values(values)
    .onConflictDoUpdate({
      target: pariwarPublicNamePresentation.pariwarId,
      set: {
        mode: values.mode,
        changedByActor: values.changedByActor,
        changedByDisplay: values.changedByDisplay,
        rationale: values.rationale,
        auditId: values.auditId,
        updatedAt: now,
      },
    })
    .returning();

  const row = rows[0];
  if (row === undefined) {
    throw new Error('public-name presentation upsert returned no row (unexpected)');
  }
  return row;
}

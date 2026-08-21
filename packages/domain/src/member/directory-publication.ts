// Per-Pariwar directory-publication kill switch — READ + GOVERNED WRITE.
// Code review, Story 11a.3 (2026-08-21, D3).
//
// Mirrors `kyc/presentation-policy.ts` (Story 11a.1) exactly in shape and governance posture: a
// change to whether the public Member Directory serves a Pariwar's members AT ALL is at least as
// consequential as a change to how their names render, so it gets the same three enforcements:
//   1. A dedicated permission key, `pariwar.manage_directory_publication`, granted to
//      super_admin ONLY — this is a legal/privacy kill switch tied to DPDPA review status
//      (`-136` cl.5) and a pending Niyamavali amendment, not a tenant content preference.
//   2. A REQUIRED `rationale` + actor + display snapshot on the write.
//   3. A §1.5 hash-chain audit line, anchored by a pre-generated `auditId`. Writing the LINE is
//      the CALLER's obligation (the 10.12 narrow-write posture).
//
// ⛔ NO self-serve admin toggle UI ships with this patch — the mechanism ships ungated by UI, the
// same posture `pariwar_public_name_presentation` shipped under at Story 11a.1. A console surface
// is a future story if one is wanted; this closes the code-review finding (a kill switch exists
// and is enforced), not a product requirement for a self-service toggle.

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import { hasPermission, type EffectiveGrant } from '../rbac/index.js';
import {
  pariwarDirectoryPublication,
  type PariwarDirectoryPublicationRow,
} from '../schema/pariwar_directory_publication.js';

/** The permission key that gates a directory-publication change. Held by super_admin ONLY. */
export const DIRECTORY_PUBLICATION_PERMISSION_KEY = 'pariwar.manage_directory_publication';

/** Read the Pariwar's stored config row, or `null` when none has ever been written. */
export async function getDirectoryPublicationRow(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarDirectoryPublicationRow | null> {
  const rows = await db
    .select()
    .from(pariwarDirectoryPublication)
    .where(eq(pariwarDirectoryPublication.pariwarId, pariwarId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve whether the Pariwar's directory is currently published.
 *
 * ⚠ An absent row resolves to ENABLED, ⛔ never to a shield — mirroring
 * `resolvePublicNamePresentationMode`'s own asymmetry. An absent row means "this Pariwar has not
 * been individually disabled"; the directory being on is the existing shipped posture.
 */
export async function resolveDirectoryPublicationEnabled(
  db: Db,
  pariwarId: PariwarId,
): Promise<boolean> {
  const row = await getDirectoryPublicationRow(db, pariwarId);
  return row?.enabled ?? true;
}

/** Thrown when a directory-publication change arrives without the governance record it requires. */
export class UngovernedDirectoryPublicationChangeError extends Error {
  constructor(missing: string) {
    super(
      `directory-publication change rejected — missing ${missing}. Enabling or disabling a ` +
        `Pariwar's PUBLIC Member Directory is a GOVERNED ACT, not a value swap. ⛔ Do not relax ` +
        `this check; record the change.`,
    );
    this.name = 'UngovernedDirectoryPublicationChangeError';
  }
}

export interface SetDirectoryPublicationInput {
  pariwarId: PariwarId;
  enabled: boolean;
  /** WHO changed it. REQUIRED and explicit — `null` means a system/seed write. */
  changedByActor: UserId | null;
  /** The acting admin's `users.display_name`, SNAPSHOT at write time. Required and explicit. */
  changedByDisplay: string | null;
  /** WHY. ⛔ Non-empty for any actor-attributed change. */
  rationale: string;
  /** The pre-generated §1.5 audit anchor. ⛔ The audit LINE is the caller's obligation. */
  auditId: string | null;
  /**
   * The acting user's effective grants — REQUIRED (a non-empty grant carrying the key) whenever
   * `changedByActor` is non-null. Checked against `DIRECTORY_PUBLICATION_PERMISSION_KEY` at
   * `dimension: 'pariwar'` before the write proceeds. A system/seed write (`changedByActor: null`)
   * has no actor to authorize — omit or pass `[]`.
   */
  actorGrants?: readonly EffectiveGrant[];
}

/**
 * Set the Pariwar's directory-publication flag (upsert on the unique `pariwar_id`).
 *
 * ⭐ Moves in BOTH directions by construction, mirroring `setPublicNamePresentationMode` — a
 * disabled directory may be re-enabled under the same authority.
 *
 * ⛔ Refuses an actor-attributed change that carries no rationale, and refuses any change with no
 * audit anchor.
 */
export async function setDirectoryPublicationEnabled(
  db: Db,
  input: SetDirectoryPublicationInput,
): Promise<PariwarDirectoryPublicationRow> {
  if (input.rationale.trim() === '') {
    throw new UngovernedDirectoryPublicationChangeError('a rationale');
  }
  if (input.auditId === null || input.auditId === '') {
    throw new UngovernedDirectoryPublicationChangeError('an audit anchor (auditId)');
  }
  if (input.changedByActor !== null && (input.changedByDisplay ?? '').trim() === '') {
    throw new UngovernedDirectoryPublicationChangeError("the actor's display name");
  }
  if (input.changedByActor === null && input.changedByDisplay !== null) {
    throw new UngovernedDirectoryPublicationChangeError(
      'a null changedByDisplay for a null changedByActor (a system/seed write must not carry a human display name)',
    );
  }
  if (
    input.changedByActor !== null &&
    !hasPermission(input.actorGrants ?? [], DIRECTORY_PUBLICATION_PERMISSION_KEY, {
      dimension: 'pariwar',
      value: input.pariwarId,
      pariwarId: input.pariwarId,
    })
  ) {
    throw new UngovernedDirectoryPublicationChangeError(
      `the ${DIRECTORY_PUBLICATION_PERMISSION_KEY} permission (the actor's grants do not carry it)`,
    );
  }

  const now = new Date();
  const values = {
    pariwarId: input.pariwarId,
    enabled: input.enabled,
    changedByActor: input.changedByActor,
    changedByDisplay: input.changedByDisplay,
    rationale: input.rationale,
    auditId: input.auditId,
    updatedAt: now,
  };

  const rows = await db
    .insert(pariwarDirectoryPublication)
    .values(values)
    .onConflictDoUpdate({
      target: pariwarDirectoryPublication.pariwarId,
      set: {
        enabled: values.enabled,
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
    throw new Error('directory-publication upsert returned no row (unexpected)');
  }
  return row;
}

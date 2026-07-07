// Per-Pariwar degraded-mode declaration accessors — Story 5.8 (Task 1; AC1).
//
// A transport-free PRIMITIVE (mirror channel-config/wa-config.ts): NO HTTP, NO audit, NO encryption. Runs
// its statements DIRECTLY on the passed (scoped) `Db`, so an admin caller is already inside its
// `SET LOCAL app.pariwar_id` tx (RLS enforces the tenant match) — the member_device_token / wa-config
// accessor precedent. The declare/revoke audit lines are the consumer route's obligation (AC5).
//
// ── "Active" is a COMPUTED predicate, never a stored boolean (AC1 #2) ──────────────────────────────────
// A declaration is active for `pariwar_id` at instant `at` IFF
//   `revoked_at IS NULL AND effective_from <= at AND (expires_at IS NULL OR expires_at > at)`.
// A Pariwar has at most ONE active declaration at a time. The enforcement is the APPLICATION TRANSACTION
// inside `declareDegradedMode` — a transaction-scoped advisory lock keyed on `pariwarId` (serializing
// concurrent declares for the SAME Pariwar) + auto-revoke-then-insert. This is the CANONICAL enforcement,
// NOT a DB `EXCLUDE`/range-overlap constraint: a `gist` exclusion would enforce a STRONGER "no overlapping
// windows, ever" rule than this story defines — the app-level UPDATE-then-INSERT deliberately SUPERSEDES an
// overlapping declare (auto-revoke), rather than rejecting it. If race protection beyond the advisory lock
// is ever needed, extend the locking (e.g. also serialize revokes) — do NOT add a temporal exclusion
// constraint (AC1 #2, Dev Notes "Load-bearing constraints").

import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import {
  type PariwarDegradedModeDeclarationRow,
  pariwarDegradedModeDeclarations,
} from '../schema/pariwar_degraded_mode_declarations.js';

/** The fields a trustee declaration records (AC1's six recorded fields). */
export interface DeclareDegradedModeInput {
  readonly pariwarId: PariwarId;
  /** The degraded-mode kind (v1 `'cycle_open_sms_bridge'`). */
  readonly mode: string;
  /** The instant the declaration is active FROM (inclusive). */
  readonly effectiveFrom: Date;
  /** The instant it expires (exclusive), or null ⇒ open-ended until manual revocation. */
  readonly expiresAt: Date | null;
  /** The declaring admin (audit provenance). NULL = system/seed. */
  readonly declaredByActor: UserId | null;
  /** The trustee-authored justification (PII-free). */
  readonly reason: string;
}

/** The fields a manual revocation records. */
export interface RevokeDegradedModeInput {
  /** The specific declaration to revoke — revoke touches ONLY this row, never any other. */
  readonly declarationId: string;
  /** The revoking admin (audit provenance). NULL = system. */
  readonly revokedByActor: UserId | null;
  /** The instant of revocation. */
  readonly at: Date;
}

/**
 * Declare degraded mode for a Pariwar (AC1 #2) — within ONE transaction on the passed (scoped) `db`:
 *   (a) `SELECT pg_advisory_xact_lock(hashtext(pariwarId))` — a transaction-scoped advisory lock keyed on
 *       `pariwarId`, serializing concurrent `declareDegradedMode` calls for the SAME Pariwar (auto-released
 *       at COMMIT/ROLLBACK; a different Pariwar's declare is never blocked). Mirrors the
 *       `pg_advisory_xact_lock(hashtext(...))` convention in device-token/registration.ts +
 *       idempotency/keyed-store.ts (do NOT introduce a different hash function).
 *   (b) auto-revoke the currently-active declaration (if any) — sets `revoked_at = effectiveFrom`,
 *       `revoked_by_actor = declaredByActor`. This is the single-active-per-Pariwar enforcement.
 *   (c) INSERT the new declaration row.
 * Returns the inserted row. Runs on the caller's scope tx (RLS enforces the tenant).
 */
export async function declareDegradedMode(
  db: Db,
  input: DeclareDegradedModeInput,
): Promise<PariwarDegradedModeDeclarationRow> {
  // (a) Serialize concurrent declares for THIS same pariwarId (transaction-scoped; the caller's scope tx is
  // the transaction — mirrors device-token/registration.ts). Does not block other Pariwars.
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.pariwarId}))`);

  // (b) Auto-revoke the currently-active declaration for this Pariwar, if any (enforces single-active). The
  // active predicate is evaluated AT the new declaration's effective_from. pariwar_id is filtered
  // explicitly (RLS also scopes it); revoked_at is set to the superseding declaration's effective_from.
  await db
    .update(pariwarDegradedModeDeclarations)
    .set({ revokedAt: input.effectiveFrom, revokedByActor: input.declaredByActor })
    .where(
      and(
        eq(pariwarDegradedModeDeclarations.pariwarId, input.pariwarId),
        isNull(pariwarDegradedModeDeclarations.revokedAt),
        lte(pariwarDegradedModeDeclarations.effectiveFrom, input.effectiveFrom),
        or(
          isNull(pariwarDegradedModeDeclarations.expiresAt),
          gt(pariwarDegradedModeDeclarations.expiresAt, input.effectiveFrom),
        ),
      ),
    );

  // (c) Insert the new declaration.
  const [row] = await db
    .insert(pariwarDegradedModeDeclarations)
    .values({
      pariwarId: input.pariwarId,
      mode: input.mode,
      effectiveFrom: input.effectiveFrom,
      expiresAt: input.expiresAt,
      declaredByActor: input.declaredByActor,
      reason: input.reason,
    })
    .returning();
  if (!row) throw new Error('[degraded-mode] declareDegradedMode: INSERT returning produced no row');
  return row;
}

/**
 * Manually revoke a degraded-mode declaration (AC1 #2) — sets `revoked_at`/`revoked_by_actor` ONLY where
 * `id = declarationId AND revoked_at IS NULL`. IDEMPOTENT: revoking an already-revoked / expired row is a
 * no-op (0 rows updated), never an error. Revokes ONLY the row it's given — it does NOT search for or
 * revoke any other declaration. Runs on the caller's scope tx (RLS enforces the tenant).
 *
 * Returns whether a row was actually revoked by THIS call (`false` on a no-op — already revoked,
 * nonexistent, or invisible under the caller's RLS scope) — the audited caller (AC5) must not write a
 * "revoked" audit line when nothing was actually revoked (Review Finding: false-positive audit entries).
 */
export async function revokeDegradedMode(db: Db, input: RevokeDegradedModeInput): Promise<boolean> {
  const rows = await db
    .update(pariwarDegradedModeDeclarations)
    .set({ revokedAt: input.at, revokedByActor: input.revokedByActor })
    .where(
      and(
        eq(pariwarDegradedModeDeclarations.id, input.declarationId),
        isNull(pariwarDegradedModeDeclarations.revokedAt),
      ),
    )
    .returning({ id: pariwarDegradedModeDeclarations.id });
  return rows.length > 0;
}

/**
 * The single active declaration for a Pariwar at instant `at`, or null when none is active (AC1 #2). The
 * `ORDER BY effective_from DESC LIMIT 1` is a DEFENSIVE read-side guard only — the advisory-lock +
 * auto-revoke-on-declare in `declareDegradedMode` is what actually guarantees at most one qualifying row.
 * Tenant-scoped (RLS + the explicit pariwar_id predicate).
 *
 * `revoked_at` is checked TEMPORALLY (`IS NULL OR > at`), not merely for presence — `declareDegradedMode`
 * can auto-revoke a row by setting `revoked_at` to a FUTURE superseding declaration's `effective_from`, and
 * that row must keep reading as active for any `at` before that instant (Review Finding: a future-dated
 * auto-revoke was blanking out current coverage immediately instead of at its scheduled instant).
 */
export async function getActiveDegradedMode(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<PariwarDegradedModeDeclarationRow | null> {
  const rows = await db
    .select()
    .from(pariwarDegradedModeDeclarations)
    .where(
      and(
        eq(pariwarDegradedModeDeclarations.pariwarId, pariwarId),
        or(isNull(pariwarDegradedModeDeclarations.revokedAt), gt(pariwarDegradedModeDeclarations.revokedAt, at)),
        lte(pariwarDegradedModeDeclarations.effectiveFrom, at),
        or(
          isNull(pariwarDegradedModeDeclarations.expiresAt),
          gt(pariwarDegradedModeDeclarations.expiresAt, at),
        ),
      ),
    )
    .orderBy(desc(pariwarDegradedModeDeclarations.effectiveFrom))
    .limit(1);
  return rows[0] ?? null;
}

// The pool's PUBLIC ADDRESS TOKEN — Story 11b.10 (Task 1 + Task 2; AC1, AC2, D2).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⛔ THE TOKEN BOUNDS **DISCOVERY**, ⛔ NOT **AUTHORISATION** (D1, 2026-09-04)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// A Sahyog Vivran page answers **200 to anyone presenting a valid address** — ⛔ no member session,
// ⛔ no new auth surface, and ⛔ no branch on the reader's membership standing of any kind (⛔ no
// `members.state`, ⛔ no `is_valid`, ⛔ no moderation overlay). A token check is a check on the
// ADDRESS; a membership check would be a check on the PERSON, and only the first is authorised.
// ⇒ ⛔ NEVER present this value as a security boundary for the DATA it fronts. What it removes is
// the ability to COLLECT four decrypted Tier-1 bank fields by COUNTING — the sequential
// `P-YYYY-MM-###` walk — and ⛔ nothing more.
//
// ⚠⛔ AND THE PRICE OF D1 IS CARRIED HERE RATHER THAN HIDDEN: a link, once forwarded, is PERMANENT
// public access to that drive UNTIL ITS TOKEN IS ROTATED. That is exactly why D2 ruled the token
// ROTATABLE — {@link rotatePoolPublicToken} is the remedy, and ⛔ the two must not be separated.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ RANDOM — ⛔ NEVER DERIVED (D2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ Do ⛔ NOT derive this from `pool_id`, the canonical identifier, or ANY pool fact. Story 7.3's
// spawn saga mints a DETERMINISTIC UUIDv5 `pool_id` ([[project_pool_spawn_saga_atomicity]]) and the
// pull to "keep spawn reproducible" is real — ⛔ it is also exactly how the guessability this story
// exists to remove gets re-created. A derived token is additionally UNROTATABLE per drive: rotating
// the secret would invalidate EVERY link at once, and a per-pool salt IS stored randomness, so the
// "no storage" advantage evaporates precisely when it is needed.
//
// ⚠ THE CANONICAL IDENTIFIER IS ⛔ NOT REPLACED. `P-YYYY-MM-###` is RETAINED (`2026-09-03-184`
// cl.2) as the operational/audit key — Story 7.1's unique index, every audit line, the
// `resource_locator` on abuse records and the whole operator vocabulary key on it. This token
// governs the PUBLIC ADDRESS only, and it is an ADDITION, ⛔ never a replacement.
import { randomBytes } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { pools } from '../schema/pools.js';
import type { Db } from '../db.js';
import type { PariwarId, PoolId } from '../ids/index.js';

/**
 * 128 bits of CSPRNG entropy (D2's ruled shape), base64url-rendered ⇒ 22 characters, URL-safe with
 * ⛔ no padding and ⛔ no percent-encoding at any layer.
 *
 * ⚠ 16 BYTES IS THE RULED FIGURE, ⛔ not a tuning knob — it is what makes "cannot be derived by
 * counting" structural rather than a hope. ⛔ Do not shrink it for a prettier URL.
 */
export const POOL_PUBLIC_TOKEN_BYTES = 16;

/** The rendered length — asserted rather than assumed, so a shortening is a test failure. */
export const POOL_PUBLIC_TOKEN_LENGTH = 22;

/**
 * Mint ONE pool public-address token.
 *
 * ⛔ `randomBytes` — the CSPRNG — ⛔ never `Math.random()`, ⛔ never a hash of pool identity, and
 * ⛔ never a counter. See this module's header for why each of those is the defect.
 */
export function mintPoolPublicToken(): string {
  return randomBytes(POOL_PUBLIC_TOKEN_BYTES).toString('base64url');
}

/**
 * ROTATE one drive's public address (AC2, D2).
 *
 * ⭐⭐ THIS IS THE ONLY REMEDY D1 HAS. Under the open-link rule a forwarded link is permanent public
 * access to that drive, so the sole way to withdraw an address that spread further than intended is
 * to INVALIDATE THAT ONE DRIVE'S ADDRESS. ⇒ rotating here must touch EXACTLY one row: every other
 * drive's address is untouched, and `tests/` asserts that isolation rather than trusting it.
 *
 * ⚠ THE OLD ADDRESS DIES IMMEDIATELY IN THE DATABASE — ⛔ but ⛔ NOT AT THE EDGE. The drive page is
 * shared-cached at `s-maxage=300`, so the previously-rendered page keeps being served from every
 * warm PoP for up to FIVE MINUTES after a rotation. ⛔ Rotation is not an instantaneous kill switch,
 * and ⛔ direct SQL is not the operational fallback (the same rider `0113`'s header carries).
 *
 * ⭐⛔ **NO ROUTE AND NO PERMISSION KEY — DECIDED AND STATED, ⛔ not guessed** (Task 2). This ships
 * as a DOMAIN-FUNCTION-ONLY seam. An admin route would need a permission key, which moves
 * `PERMISSION_CATALOG_VERSION` 39 → 40 — a GOVERNANCE act in this repo (10.3 minted `helpdesk.create`
 * v22→23 as a story act, [[project_helpdesk_operator_surface_103]]) — and this story's Panel-ratified
 * scope is the ADDRESS and the PATH, ⛔ not an operator surface. ⇒ ⛔ do not add a route here; that
 * is a **routing note**, ⛔ never an edit.
 *
 * @returns the NEW token, or `null` when no such pool exists in this Pariwar (⛔ never a throw — the
 *          caller decides what a missing pool means).
 */
export async function rotatePoolPublicToken(
  db: Db,
  pariwarId: PariwarId,
  poolId: PoolId,
): Promise<string | null> {
  const nextToken = mintPoolPublicToken();
  // ⚠ `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps
  // the write correct if a caller ever passes a BYPASSRLS pool (the house posture on every pool read).
  // ⛔ The `pool_id` equality is what makes this SINGLE-ROW BY CONSTRUCTION: it is the primary key.
  const rows = await db
    .update(pools)
    .set({ publicToken: nextToken })
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.poolId, poolId)))
    .returning({ publicToken: pools.publicToken });
  return rows[0]?.publicToken ?? null;
}

/**
 * Read ONE pool's public-address token (AC4).
 *
 * ⭐⛔ THE TOKEN IS **SERVER-RETURNED**, and this is the read that makes that true for the member
 * app. `apps/mobile/lib/public-site.ts` already carries the discipline in terms for `clauseId`
 * (*"SERVER-returned … never hardcoded in the widget"*) — ⇒ the client ⛔ NEVER constructs a drive
 * address from `poolId` or the canonical identifier, which would re-create D2's guessability inside
 * the client.
 *
 * ⚠ A TARGETED SINGLE-ROW READ RATHER THAN A WIDENED BINDING TYPE, deliberately: `AssignedPoolRef`
 * / `PoolBindingCandidate` are shared across Epic 8 and Epic 9's contribution paths, and threading
 * one public-surface field through them would put this story's concern into every consumer of the
 * assignment binding. ⛔ Do not widen those types for this.
 *
 * @returns the token, or `null` when no such pool exists in this Pariwar. ⚠ `null` is ⛔ NOT an
 *          ordinary outcome for a live pool: the column is `NOT NULL` and the 0114 migration
 *          backfilled every existing row, so `null` here means the pool row is gone.
 */
export async function readPoolPublicToken(
  db: Db,
  pariwarId: PariwarId,
  poolId: PoolId,
): Promise<string | null> {
  const rows = await db
    .select({ publicToken: pools.publicToken })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.poolId, poolId)))
    .limit(1);
  return rows[0]?.publicToken ?? null;
}

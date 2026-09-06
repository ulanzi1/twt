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
import { createHash, randomBytes } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { writeAuditEntry } from '../audit/write.js';
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
 * Who is rotating, and the chain to append to (review 2026-09-04, family 8).
 *
 * ⭐ Shaped to match `addPoolName(tx, servicePool, input)` — its immediate neighbour in this module
 * and the house pattern for a tenant-scoped write that owes a GLOBAL audit line. ⛔ Do not invent a
 * second convention for the same problem.
 * ⛔ `actorId` is ⛔ NOT nullable here: an anonymous public visitor can read a drive page, but
 * ⛔ nobody rotates an address anonymously — a rotation is always somebody's act.
 */
export interface RotatePoolPublicTokenInput {
  readonly pariwarId: PariwarId;
  readonly poolId: PoolId;
  readonly actorId: string;
  readonly actorRole: string;
  readonly traceId?: string | null;
}

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
 * ⚠⭐ AND THE SAME WINDOW APPLIES TO THE **INDEX**, ⛔ not only to the drive page itself (review
 * 2026-09-04). `/sahyog` is shared-cached on the same terms and its rows now carry a `driveHref`
 * built from this token ⇒ for up to five minutes after a rotation every warm PoP keeps serving an
 * index whose links point at the WITHDRAWN address. ⇒ the page this story made linkable 404s from a
 * LINK, ⛔ not merely from somebody's stale bookmark. ⛔ Do not describe rotation as taking effect
 * "immediately" anywhere operator-facing without this rider; a purge of BOTH surfaces is what makes
 * it true, and ⛔ no purge hook exists today.
 *
 * ⭐⛔ **NO ROUTE AND NO PERMISSION KEY — DECIDED AND STATED, ⛔ not guessed** (Task 2). This ships
 * as a DOMAIN-FUNCTION-ONLY seam. An admin route would need a permission key, which moves
 * `PERMISSION_CATALOG_VERSION` **+1 from whatever it reads at the time** — a GOVERNANCE act in this
 * repo (10.3 minted `helpdesk.create` v22→23 as a story act,
 * [[project_helpdesk_operator_surface_103]]) — and this story's Panel-ratified
 * scope is the ADDRESS and the PATH, ⛔ not an operator surface. ⇒ ⛔ do not add a route here; that
 * is a **routing note**, ⛔ never an edit.
 * ⚠ *Corrected 2026-09-06 (Story 11b.13).* The clause above read *"moves `PERMISSION_CATALOG_VERSION`
 * 39 → 40"*. The **argument is unchanged**; only the literal was, and it had already been
 * **falsified**: Story 11b.13 took the counter **39 → 41** (Decision `2026-09-06-203`, TWO keys).
 * ⛔ A transcribed catalog number in prose goes stale the moment any story bumps it — ⭐ read
 * `rbac/permissions.ts` live, ⛔ never quote it here. This repo's *"prose that outlives the thing it
 * describes"* class (Story 11b.11 Trap 4).
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⭐⭐ IT IS AUDITED — AND THE ⛔ TWO THINGS IT DOES ⛔ NOT DO ARE STATED, ⛔ NOT OMITTED
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * (Review 2026-09-04, load-bearing-invariant family 8 — RULED by BigDev.) Rotation is a PRIVILEGED
 * MUTATION on a PUBLISHED address, and it was previously untraceable: no audit line, no event, and
 * ⛔ not even an `updated_at` bump (`pools.updatedAt` is `defaultNow()` with ⛔ no `$onUpdate` and
 * ⛔ no trigger). ⇒ after withdrawing a leaked link, ⛔ nothing anywhere recorded that a public
 * address changed, when, or on whose authority — on the ONE mutation an incident review exists to
 * ask about. That is now closed by an `audit_log_entries` line plus an explicit `updatedAt`.
 *
 * ⛔⛔ **(1) THE AUDIT WRITE CANNOT SHARE THE CALLER'S TRANSACTION, AND THAT IS THE SUBSTRATE'S
 * DESIGN, ⛔ not an oversight here.** {@link writeAuditEntry} takes a `pg.Pool`, opens its OWN
 * transaction and serializes every writer on a GLOBAL advisory lock (DD-2 / W8-CR1.6) because the
 * audit chain is a single hash-linked sequence across all tenants. ⇒ family 8's *"same tx"* clause
 * is ⛔ NOT CONSTRUCTIBLE for any writer in this system, and the honest consequence is recorded
 * rather than papered over: a crash between the row UPDATE and the audit append leaves a rotated
 * address with ⛔ no audit line. ⭐ The failure is ⛔ not silent — the append throws and the caller
 * sees it; ⛔ do ⛔ not wrap this in a try/catch that swallows it, which is what would make the gap
 * invisible. (`writeAppealReversalDisclosureAudit` swallows deliberately because a PAGE RENDER must
 * not fail for an audit; a ROTATION is the opposite case — the write is the point.)
 *
 * ⛔⛔ **(2) THERE IS ⛔ NO `events_log` APPEND, ⛔ DELIBERATELY.** `POOL_EVENT_TYPES` is a CLOSED
 * four-event lifecycle vocabulary with an exhaustive `satisfies` payload map, and `replayPoolState`
 * must stay TOTAL over it (family 1). Minting a `pool.address_rotated` event would put the address
 * INTO the replay-derived state — which migration `0114`'s header rules out in terms: *"it is an
 * ADDRESS, written once at spawn and changed only by an explicit rotation … ⛔ do not imply this
 * column is part of the replay-derived state cache."* ⇒ the audit line is the correct and
 * sufficient record here. ⛔ Do ⛔ not "complete the pair" by widening the lifecycle vocabulary.
 *
 * @returns the NEW token, or `null` when no such pool exists in this Pariwar (⛔ never a throw — the
 *          caller decides what a missing pool means). ⚠ When `null`, ⛔ NO audit line is written:
 *          nothing was mutated, so there is nothing to attest.
 */
export async function rotatePoolPublicToken(
  db: Db,
  servicePool: pg.Pool,
  input: RotatePoolPublicTokenInput,
): Promise<string | null> {
  const { pariwarId, poolId } = input;
  const nextToken = mintPoolPublicToken();
  // ⚠ `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps
  // the write correct if a caller ever passes a BYPASSRLS pool (the house posture on every pool read).
  // ⛔ The `pool_id` equality is what makes this SINGLE-ROW BY CONSTRUCTION: it is the primary key.
  const rows = await db
    .update(pools)
    // ⭐ `updatedAt` EXPLICITLY — the column has no `$onUpdate` and no DB trigger, so without this
    // line the row carries ⛔ no trace that its public address ever moved. `project.ts` sets it
    // explicitly on its DO-UPDATE arm for exactly this reason.
    .set({ publicToken: nextToken, updatedAt: new Date() })
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.poolId, poolId)))
    // ⭐⛔ THE CANONICAL IDENTIFIER, ⛔ NOT THE TOKEN, IS WHAT THE AUDIT LINE NAMES — `-184` cl.2 and
    // the same rule `handlers.ts` follows for the appeal-reversal disclosure. Writing a live public
    // ADDRESS into the durable audit chain would both leak it and make the record unjoinable to
    // every other audit line, which all key on `P-YYYY-MM-###`.
    .returning({
      publicToken: pools.publicToken,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
    });

  const rotated = rows[0];
  if (rotated === undefined) return null;

  await writeAuditEntry(servicePool, {
    pariwarId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'pool.public_address_rotated',
    resourceLocator: `pariwar/${pariwarId}/pools/${rotated.poolCanonicalIdentifier}`,
    // ⛔ THE TOKEN — OLD OR NEW — IS ⛔ NEVER IN THE PAYLOAD, hashed or otherwise. The hash covers
    // WHICH drive was re-addressed, ⛔ not what it was re-addressed TO; an address is a live secret
    // and the audit chain is durable, replicated and exported.
    requestPayloadHash: createHash('sha256')
      .update(JSON.stringify({ poolId, poolCanonicalIdentifier: rotated.poolCanonicalIdentifier }))
      .digest('hex'),
    responseStatus: 200,
    traceId: input.traceId ?? null,
  });

  return rotated.publicToken;
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
  // ⚠⛔ `|| null`, ⛔ NOT `?? null` (review 2026-09-04). `??` coalesces ⛔ only null/undefined, so an
  // EMPTY-STRING token — which `NOT NULL` permits and the unique index accepts — would flow out of
  // here as `''` and defeat EVERY `=== null` guard downstream. It would then reach
  // `AssignedContributionCard`'s `z.string().min(1)` and 500 `/member/active-contribution`, while
  // `/sahyog` caught the same row via its own `length > 0` check ⇒ two consumers disagreeing about
  // the same bad row. ⭐ Unreachable today (⛔ no writer emits `''`), and it stays unreachable only
  // by convention: family 5's CHECK constraint is DEFERRED (`deferred-work.md`, 2026-09-04), so
  // this coalesce is the one thing standing in for it. ⛔ Do not "tidy" it back to `??`.
  return rows[0]?.publicToken || null;
}

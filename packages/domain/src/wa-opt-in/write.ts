// Member WA opt-in write path — Story 5.4 (Task 3; AC1/AC3/AC4).
//
// State-machine transitions: createPendingOptIn (mint PENDING) / activateOptIn (PENDING→ACTIVE) /
// revokeOptIn (ACTIVE→REVOKED|BLOCKED_BY_META, PENDING→EXPIRED_24H_WINDOW) / endEveryWaYes (Story 5.12 — every withdrawal:
// ACTIVE→REVOKED|BLOCKED_BY_META + every open whatsapp_opt_in consent revoked). Mirror consent/write.ts:
// NO HTTP, NO audit-or-throw orchestration (the CONSUMER route/worker writes the audit line FIRST + threads
// the id — audit-or-throw). These accessors run DIRECTLY on the passed (scoped) `Db` and do NOT open their
// own transaction; RLS scope is transaction-scoped, so a scoped caller is already inside a tx.
//
// ── Audit-linkage is a CONSUMER obligation ─────────────────────────────────────────────────────────────
// The route/worker writes the Story 1.10 audit line FIRST (it needs the actor/session), then threads its id
// into the consent + opt-in rows in ONE scoped tx — a rollback leaves NO ACTIVE consent AND no ACTIVE state.
// These accessors merely ACCEPT a caller-supplied `consentId` (the ACTIVE back-reference); the audit id is
// carried on the consent row, never here.

import { and, eq, lt, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';

/** The two partial-unique indexes on `member_wa_opt_in` a PENDING insert can collide against. */
const PENDING_PHRASE_UQ = 'member_wa_opt_in_pending_phrase_uq';
const PENDING_MEMBER_UQ = 'member_wa_opt_in_pending_member_uq';

/**
 * Walk an error's `.cause` chain for a Postgres unique-violation (SQLSTATE 23505) and return its violated
 * constraint name, or null if this is not a unique-violation. drizzle wraps the raw pg error in a
 * `DrizzleQueryError` whose own `.code` is undefined — the SQLSTATE + `.constraint` live on `.cause` — so a
 * naive `err.code` check misses it.
 */
function uniqueViolationConstraint(err: unknown): string | null {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    const candidate = cur as { code?: string; constraint?: string };
    if (candidate.code === PG_UNIQUE_VIOLATION) return candidate.constraint ?? null;
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

import { revokeOpenConsentsOfType } from '../consent/write.js';
import type { Db } from '../db.js';
import type { ConsentId, MemberId, MemberWaOptInId, PariwarId } from '../ids/index.js';
import {
  type MemberWaOptInRow,
  type WaOptInState,
  memberWaOptIn,
} from '../schema/member_wa_opt_in.js';
import { WaOptInNotFoundError, WaOptInPendingExistsError, WaOptInStateError } from './errors.js';
import { generateVerificationPhrase } from './phrase.js';

/** The Postgres unique-violation SQLSTATE — the partial-unique (pariwar, phrase) index conflict. */
const PG_UNIQUE_VIOLATION = '23505';
/** Bounded regeneration attempts on a phrase collision before surfacing an error (collisions are ~never). */
const MAX_PHRASE_RETRIES = 5;

export interface CreatePendingOptInInput {
  pariwarId: PariwarId;
  memberId: MemberId;
  /** Deterministic HMAC of the member's mobile (computed at the apps/api boundary). */
  mobileBlindIndex: string;
  /**
   * The initial verification phrase. Optional — defaults to a fresh generated phrase. On a `23505`
   * partial-unique conflict the phrase is REGENERATED and re-inserted (the DB constraint is the wrong-member
   * -match backstop; app-level generation alone is insufficient).
   */
  verificationPhrase?: string;
}

/**
 * Mint a PENDING opt-in (AC1). Rejects a second PENDING for the same `(pariwar_id, member_id)` while one is
 * outstanding (`WaOptInPendingExistsError`) — a member re-tapping the toggle re-uses / re-issues, never
 * duplicates. On a `23505` verification-phrase collision (two members racing an identical phrase in a
 * Pariwar), regenerates the phrase and retries (bounded) — never surfaces the raw Postgres error. Returns
 * the inserted PENDING row.
 */
export async function createPendingOptIn(
  db: Db,
  input: CreatePendingOptInInput,
): Promise<MemberWaOptInRow> {
  // Guard: reject a second outstanding PENDING for this member (defense-in-depth; the route also pre-checks
  // via getOptInForMember to RE-USE the existing PENDING).
  const existing = await db
    .select()
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, input.pariwarId),
        eq(memberWaOptIn.memberId, input.memberId),
        eq(memberWaOptIn.state, 'PENDING'),
      ),
    )
    .limit(1);
  const outstanding = existing[0];
  if (outstanding) {
    throw new WaOptInPendingExistsError(
      input.pariwarId,
      outstanding.optInId,
      outstanding.verificationPhrase,
    );
  }

  let phrase = input.verificationPhrase ?? generateVerificationPhrase();
  for (let attempt = 0; attempt <= MAX_PHRASE_RETRIES; attempt += 1) {
    // Guard each attempt with an explicit SAVEPOINT (these accessors always run inside the caller's scope
    // tx — RLS requires it): a 23505 conflict rolls back ONLY to the savepoint, leaving the caller's tx
    // usable so the regenerated-phrase retry can proceed. A bare INSERT would poison the whole tx; a nested
    // `db.transaction()` would (wrongly) COMMIT the caller's tx early — hence raw SAVEPOINT SQL.
    await db.execute(sql`SAVEPOINT create_pending_opt_in`);
    try {
      const inserted = await db
        .insert(memberWaOptIn)
        .values({
          pariwarId: input.pariwarId,
          memberId: input.memberId,
          mobileBlindIndex: input.mobileBlindIndex,
          verificationPhrase: phrase,
          state: 'PENDING',
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new Error('[createPendingOptIn] insert returned no row — check session scope');
      }
      await db.execute(sql`RELEASE SAVEPOINT create_pending_opt_in`);
      return row;
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT create_pending_opt_in`);
      const constraint = uniqueViolationConstraint(err);

      // A concurrent mint for the same member won the race (the DB-enforced one-outstanding-PENDING-per-
      // -member backstop, migration 0044) — mirror the pre-check's re-use behavior instead of retrying.
      if (constraint === PENDING_MEMBER_UQ) {
        const outstanding = await db
          .select()
          .from(memberWaOptIn)
          .where(
            and(
              eq(memberWaOptIn.pariwarId, input.pariwarId),
              eq(memberWaOptIn.memberId, input.memberId),
              eq(memberWaOptIn.state, 'PENDING'),
            ),
          )
          .limit(1);
        const winner = outstanding[0];
        if (winner) {
          throw new WaOptInPendingExistsError(input.pariwarId, winner.optInId, winner.verificationPhrase);
        }
        // The winning row vanished between the conflict and this re-read (already transitioned) — surface
        // the original error rather than guessing.
        throw err;
      }

      // A partial-unique (pariwar_id, verification_phrase) WHERE state='PENDING' collision → regenerate + retry.
      if (constraint === PENDING_PHRASE_UQ && attempt < MAX_PHRASE_RETRIES) {
        phrase = generateVerificationPhrase();
        continue;
      }
      throw err;
    }
  }
  // Unreachable in practice (30^8 phrase space) — surfaced rather than looping forever.
  throw new Error('[createPendingOptIn] exhausted verification-phrase regeneration retries');
}

export interface ActivateOptInInput {
  pariwarId: PariwarId;
  optInId: MemberWaOptInId;
  /**
   * Meta's 24h free-form (customer-service) window end (now + 24h), set on the ACTIVE transition — ⛔ the opt-in's end: since
   * Story 5.12 (`-364` option A, reading (ii); LY2) a yes lasts until withdrawn and ⛔ thing gates on this column.
   */
  windowExpiresAt: Date;
  /** The consent_records row minted on ACTIVE (the registry is canonical; this is a back-reference). */
  consentId: ConsentId;
  /** DB-authoritative match instant override (defaults to DB now()). */
  matchedAt?: Date;
}

/**
 * Advance a PENDING opt-in to ACTIVE (AC3). Guarded: only a PENDING row transitions (an already-ACTIVE /
 * terminal row → `WaOptInStateError`, so a webhook replay can never re-activate). The UPDATE WHERE clause
 * pins `state = 'PENDING'` so a concurrent activation produces 0 rows → re-read → the correct typed error.
 * Returns the mutated row.
 */
export async function activateOptIn(db: Db, input: ActivateOptInInput): Promise<MemberWaOptInRow> {
  const updated = await db
    .update(memberWaOptIn)
    .set({
      state: 'ACTIVE',
      windowExpiresAt: input.windowExpiresAt,
      consentId: input.consentId,
      matchedAt: input.matchedAt ?? sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(memberWaOptIn.pariwarId, input.pariwarId),
        eq(memberWaOptIn.optInId, input.optInId),
        eq(memberWaOptIn.state, 'PENDING'),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    await assertRowExistsOrThrow(db, input.pariwarId, input.optInId);
    throw new WaOptInStateError(input.optInId, 'not PENDING — cannot activate');
  }
  return row;
}

/** The terminal states a `revokeOptIn` may drive an opt-in into. */
export type RevokeToState = Extract<WaOptInState, 'REVOKED' | 'BLOCKED_BY_META' | 'EXPIRED_24H_WINDOW'>;

export interface RevokeOptInInput {
  pariwarId: PariwarId;
  optInId: MemberWaOptInId;
  /** The terminal state to drive into: REVOKED (member/STOP/admin) | BLOCKED_BY_META (Meta) | EXPIRED_24H_WINDOW (stale-PENDING sweep). */
  toState: RevokeToState;
}

/**
 * Legal transitions (guarded — an illegal edge → `WaOptInStateError`):
 *   · REVOKED             ← ACTIVE (member/STOP/admin opt-out).
 *   · BLOCKED_BY_META     ← ACTIVE (Meta 131050 status callback).
 *   · EXPIRED_24H_WINDOW  ← PENDING ONLY (stale-TTL sweep — a request never confirmed). Story 5.12 (`-364` option A; LY3): ⛔
 *     ACTIVE → EXPIRED — a yes lasts until withdrawn; the trigger `member_wa_opt_in_no_active_expiry` (migration
 *     `member-wa-opt-in-lasting-yes`) refuses that edge in the database too.
 * The FROM-state predicate is pinned in the UPDATE WHERE so a concurrent transition yields 0 rows → the
 * correct typed error. A MUTATE, never a delete (compliance: the row is retained for the AC5 history).
 * The withdrawal paths call `endEveryWaYes` (ends every consent too); this by-id edge remains for the sweep and the tests.
 */
export async function revokeOptIn(db: Db, input: RevokeOptInInput): Promise<MemberWaOptInRow> {
  const legalFrom: WaOptInState = input.toState === 'EXPIRED_24H_WINDOW' ? 'PENDING' : 'ACTIVE';
  const fromPredicate = eq(memberWaOptIn.state, legalFrom);

  const updated = await db
    .update(memberWaOptIn)
    .set({ state: input.toState, updatedAt: sql`now()` })
    .where(
      and(
        eq(memberWaOptIn.pariwarId, input.pariwarId),
        eq(memberWaOptIn.optInId, input.optInId),
        fromPredicate,
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    await assertRowExistsOrThrow(db, input.pariwarId, input.optInId);
    throw new WaOptInStateError(
      input.optInId,
      `illegal transition to ${input.toState} from current state (expected ${legalFrom})`,
    );
  }
  return row;
}

export interface EndEveryWaYesInput {
  pariwarId: PariwarId;
  memberId: MemberId;
  /** REVOKED (member DELETE / admin / STOP) | BLOCKED_BY_META (Meta 131050 — LY8). */
  toState: Extract<WaOptInState, 'REVOKED' | 'BLOCKED_BY_META'>;
  /** Stored on every revoked consent row. */
  reason: string;
  /** The ONE withdrawal audit line, written FIRST by the caller — its id lands on every revoked consent row. */
  revokedAuditId: string | null;
}

export interface EndEveryWaYesResult {
  /** The ACTIVE row moved to `toState`, or null when the member had none. */
  movedOptInId: MemberWaOptInId | null;
  /** How many open `whatsapp_opt_in` consent rows were revoked. */
  consentsRevoked: number;
}

/**
 * ⭐ Story 5.12 (`-364` condition 4; LY5) — the ONE way a member's WhatsApp yes ends: moves the member's ACTIVE row (≤ 1 —
 * the partial UNIQUE `member_wa_opt_in_active_member_uq`; selected by `state = 'ACTIVE'`, ⛔ via `isOptInActive`) to
 * `toState` AND revokes EVERY open `whatsapp_opt_in` consent row of the member (each re-opt-in mints one — a withdrawal ends
 * them all, ⛔ only the newest). Runs in the CALLER's tx (⛔ opens one). Every withdrawal path calls it: member DELETE, admin
 * opt-out, STOP, Meta 131050. `{ movedOptInId: null, consentsRevoked: 0 }` is ⛔ an error — a lost race (another path ended
 * it first); the CALLER settles its audit line (LY5's compensating `_rolled_back` / the API's 409).
 */
export async function endEveryWaYes(db: Db, input: EndEveryWaYesInput): Promise<EndEveryWaYesResult> {
  const moved = await db
    .update(memberWaOptIn)
    .set({ state: input.toState, updatedAt: sql`now()` })
    .where(
      and(
        eq(memberWaOptIn.pariwarId, input.pariwarId),
        eq(memberWaOptIn.memberId, input.memberId),
        eq(memberWaOptIn.state, 'ACTIVE'),
      ),
    )
    .returning({ optInId: memberWaOptIn.optInId });
  const consentsRevoked = await revokeOpenConsentsOfType(db, {
    pariwarId: input.pariwarId,
    subjectId: input.memberId,
    consentType: 'whatsapp_opt_in',
    reason: input.reason,
    revokedAuditId: input.revokedAuditId,
  });
  return { movedOptInId: moved[0]?.optInId ?? null, consentsRevoked };
}

/** Re-read after a 0-row UPDATE to distinguish "row vanished" (404) from "wrong state" (409). */
async function assertRowExistsOrThrow(
  db: Db,
  pariwarId: PariwarId,
  optInId: MemberWaOptInId,
): Promise<void> {
  const rows = await db
    .select({ one: sql`1` })
    .from(memberWaOptIn)
    .where(and(eq(memberWaOptIn.pariwarId, pariwarId), eq(memberWaOptIn.optInId, optInId)))
    .limit(1);
  if (rows.length === 0) {
    throw new WaOptInNotFoundError(pariwarId, optInId);
  }
}

// ── System-expiry sweep reads (Task 5 — cross-tenant on the worker's BYPASSRLS service pool) ────────────
// These run WITHOUT a pariwar filter (the worker holds no scope tx; the service login is BYPASSRLS so it
// sees all tenants). Each returns rows carrying their pariwar_id so the worker can scope the per-row audit.

/**
 * Stale PENDING opt-ins that never received an inbound match within `ttlSeconds` (candidates for
 * PENDING→EXPIRED_24H_WINDOW — "a request never confirmed"). Cross-tenant; bounded by `limit`. Story 5.12 (LY3): the sweep's
 * only half — an ACTIVE opt-in never expires (the past-window read `listExpiredWindowOptIns` is gone).
 */
export async function listStalePendingOptIns(
  db: Db,
  ttlSeconds: number,
  limit: number,
): Promise<MemberWaOptInRow[]> {
  return db
    .select()
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.state, 'PENDING'),
        lt(memberWaOptIn.createdAt, sql`now() - make_interval(secs => ${ttlSeconds})`),
      ),
    )
    .limit(clampLimit(limit, { default: 200, cap: 500 }));
}

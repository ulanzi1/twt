// Member Telegram opt-in write path — Story 5.5 (Task 3; AC1/AC4/AC10).
//
// State-machine transitions: createPendingOptIn (mint PENDING) / activateOptIn (PENDING→ACTIVE, capturing the
// chat_id) / revokeOptIn (ACTIVE→REVOKED|BLOCKED, PENDING→EXPIRED). Mirror wa-opt-in/write.ts: NO HTTP, NO
// audit-or-throw orchestration (the CONSUMER route/worker writes the audit line FIRST + threads the id).
// These accessors run DIRECTLY on the passed (scoped) `Db` and do NOT open their own transaction; RLS scope
// is transaction-scoped, so a scoped caller is already inside a tx.
//
// ── Audit-linkage is a CONSUMER obligation ─────────────────────────────────────────────────────────────
// The route/worker writes the Story 1.10 audit line FIRST, then threads its id into the consent + opt-in rows
// in ONE scoped tx — a rollback leaves NO ACTIVE consent AND no ACTIVE state. These accessors merely ACCEPT a
// caller-supplied `consentId` (the ACTIVE back-reference); the audit id is carried on the consent row.

import { and, eq, lt, or, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { ConsentId, MemberId, MemberTelegramOptInId, PariwarId } from '../ids/index.js';
import {
  type MemberTelegramOptInRow,
  type TelegramOptInState,
  memberTelegramOptIn,
} from '../schema/member_telegram_opt_in.js';
import {
  TelegramOptInNotFoundError,
  TelegramOptInPendingExistsError,
  TelegramOptInStateError,
} from './errors.js';
import { generateVerificationCode } from './code.js';

/** The Postgres unique-violation SQLSTATE — the partial-unique index conflict. */
const PG_UNIQUE_VIOLATION = '23505';
/** The two partial-unique indexes on `member_telegram_opt_in` a PENDING insert can collide against. */
const PENDING_CODE_UQ = 'member_telegram_opt_in_pending_code_uq';
const PENDING_MEMBER_UQ = 'member_telegram_opt_in_pending_member_uq';
/** Bounded regeneration attempts on a code collision before surfacing an error (collisions are ~never). */
const MAX_CODE_RETRIES = 5;

/**
 * Walk an error's `.cause` chain for a Postgres unique-violation (SQLSTATE 23505) and return its violated
 * constraint name, or null. drizzle wraps the raw pg error in a `DrizzleQueryError` whose own `.code` is
 * undefined — the SQLSTATE + `.constraint` live on `.cause` — so a naive `err.code` check misses it.
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

export interface CreatePendingOptInInput {
  pariwarId: PariwarId;
  memberId: MemberId;
  /**
   * The initial verification code. Optional — defaults to a fresh generated code. On a `23505` partial-unique
   * conflict the code is REGENERATED and re-inserted (the DB constraint is the wrong-member-match backstop;
   * app-level generation alone is insufficient).
   */
  verificationCode?: string;
}

/**
 * Mint a PENDING opt-in (AC4). Rejects a second PENDING for the same `(pariwar_id, member_id)` while one is
 * outstanding (`TelegramOptInPendingExistsError`) — a member re-tapping the toggle re-uses / re-issues, never
 * duplicates. On a `23505` verification-code collision (two members racing an identical code in a Pariwar),
 * regenerates the code and retries (bounded) — never surfaces the raw Postgres error. Returns the inserted
 * PENDING row.
 */
export async function createPendingOptIn(
  db: Db,
  input: CreatePendingOptInInput,
): Promise<MemberTelegramOptInRow> {
  // Guard: reject a second outstanding PENDING for this member (defense-in-depth; the route also pre-checks
  // via getOptInForMember to RE-USE the existing PENDING).
  const existing = await db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, input.pariwarId),
        eq(memberTelegramOptIn.memberId, input.memberId),
        eq(memberTelegramOptIn.state, 'PENDING'),
      ),
    )
    .limit(1);
  const outstanding = existing[0];
  if (outstanding) {
    throw new TelegramOptInPendingExistsError(
      input.pariwarId,
      outstanding.optInId,
      outstanding.verificationCode,
    );
  }

  let code = input.verificationCode ?? generateVerificationCode();
  for (let attempt = 0; attempt <= MAX_CODE_RETRIES; attempt += 1) {
    // Guard each attempt with an explicit SAVEPOINT (these accessors always run inside the caller's scope tx
    // — RLS requires it): a 23505 conflict rolls back ONLY to the savepoint, leaving the caller's tx usable so
    // the regenerated-code retry can proceed. A bare INSERT would poison the whole tx; a nested
    // `db.transaction()` would (wrongly) COMMIT the caller's tx early — hence raw SAVEPOINT SQL.
    await db.execute(sql`SAVEPOINT create_pending_telegram_opt_in`);
    try {
      const inserted = await db
        .insert(memberTelegramOptIn)
        .values({
          pariwarId: input.pariwarId,
          memberId: input.memberId,
          verificationCode: code,
          state: 'PENDING',
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        throw new Error('[createPendingOptIn] insert returned no row — check session scope');
      }
      await db.execute(sql`RELEASE SAVEPOINT create_pending_telegram_opt_in`);
      return row;
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT create_pending_telegram_opt_in`);
      const constraint = uniqueViolationConstraint(err);

      // A concurrent mint for the same member won the race (the DB-enforced one-outstanding-PENDING-per-member
      // backstop) — mirror the pre-check's re-use behavior instead of retrying.
      if (constraint === PENDING_MEMBER_UQ) {
        const raced = await db
          .select()
          .from(memberTelegramOptIn)
          .where(
            and(
              eq(memberTelegramOptIn.pariwarId, input.pariwarId),
              eq(memberTelegramOptIn.memberId, input.memberId),
              eq(memberTelegramOptIn.state, 'PENDING'),
            ),
          )
          .limit(1);
        const winner = raced[0];
        if (winner) {
          throw new TelegramOptInPendingExistsError(input.pariwarId, winner.optInId, winner.verificationCode);
        }
        // The winning row vanished between the conflict and this re-read (already transitioned) — surface the
        // original error rather than guessing.
        throw err;
      }

      // A partial-unique (pariwar_id, verification_code) WHERE state='PENDING' collision → regenerate + retry.
      if (constraint === PENDING_CODE_UQ && attempt < MAX_CODE_RETRIES) {
        code = generateVerificationCode();
        continue;
      }
      throw err;
    }
  }
  // Unreachable in practice (30^8 code space) — surfaced rather than looping forever.
  throw new Error('[createPendingOptIn] exhausted verification-code regeneration retries');
}

export interface ActivateOptInInput {
  pariwarId: PariwarId;
  optInId: MemberTelegramOptInId;
  /** The opaque Telegram chat id captured on the ACTIVE transition (the delivery address). */
  chatId: string;
  /** The consent_records row minted on ACTIVE (the registry is canonical; this is a back-reference). */
  consentId: ConsentId;
  /** DB-authoritative match instant override (defaults to DB now()). */
  matchedAt?: Date;
}

/**
 * Advance a PENDING opt-in to ACTIVE (AC5), capturing the member's `chat_id`. Guarded: only a PENDING row
 * transitions (an already-ACTIVE / terminal row → `TelegramOptInStateError`, so a webhook replay can never
 * re-activate). The UPDATE WHERE clause pins `state = 'PENDING'` so a concurrent activation produces 0 rows →
 * re-read → the correct typed error. Returns the mutated row.
 */
export async function activateOptIn(
  db: Db,
  input: ActivateOptInInput,
): Promise<MemberTelegramOptInRow> {
  const updated = await db
    .update(memberTelegramOptIn)
    .set({
      state: 'ACTIVE',
      chatId: input.chatId,
      consentId: input.consentId,
      matchedAt: input.matchedAt ?? sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, input.pariwarId),
        eq(memberTelegramOptIn.optInId, input.optInId),
        eq(memberTelegramOptIn.state, 'PENDING'),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    await assertRowExistsOrThrow(db, input.pariwarId, input.optInId);
    throw new TelegramOptInStateError(input.optInId, 'not PENDING — cannot activate');
  }
  return row;
}

/** The terminal states a `revokeOptIn` may drive an opt-in into. */
export type RevokeToState = Extract<TelegramOptInState, 'REVOKED' | 'BLOCKED' | 'EXPIRED'>;

export interface RevokeOptInInput {
  pariwarId: PariwarId;
  optInId: MemberTelegramOptInId;
  /** The terminal state: REVOKED (member/`/stop`/admin) | BLOCKED (user blocked bot) | EXPIRED (stale sweep). */
  toState: RevokeToState;
}

/**
 * Legal transitions (guarded — an illegal edge → `TelegramOptInStateError`):
 *   · REVOKED  ← ACTIVE (member/`/stop`/admin opt-out).
 *   · BLOCKED  ← ACTIVE (the user blocked/kicked the bot — `my_chat_member`).
 *   · EXPIRED  ← PENDING (stale-TTL sweep). NO past-window sweep (there is no window).
 * The FROM-state predicate is pinned in the UPDATE WHERE so a concurrent transition yields 0 rows → the
 * correct typed error. A MUTATE, never a delete (compliance: the row is retained for the AC10 history).
 */
export async function revokeOptIn(db: Db, input: RevokeOptInInput): Promise<MemberTelegramOptInRow> {
  const legalFrom: TelegramOptInState[] = input.toState === 'EXPIRED' ? ['PENDING'] : ['ACTIVE'];

  const fromPredicate =
    legalFrom.length === 1
      ? eq(memberTelegramOptIn.state, legalFrom[0]!)
      : or(...legalFrom.map((s) => eq(memberTelegramOptIn.state, s)));

  const updated = await db
    .update(memberTelegramOptIn)
    .set({ state: input.toState, updatedAt: sql`now()` })
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, input.pariwarId),
        eq(memberTelegramOptIn.optInId, input.optInId),
        fromPredicate,
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    await assertRowExistsOrThrow(db, input.pariwarId, input.optInId);
    throw new TelegramOptInStateError(
      input.optInId,
      `illegal transition to ${input.toState} from current state (expected ${legalFrom.join(' | ')})`,
    );
  }
  return row;
}

/** Re-read after a 0-row UPDATE to distinguish "row vanished" (404) from "wrong state" (409). */
async function assertRowExistsOrThrow(
  db: Db,
  pariwarId: PariwarId,
  optInId: MemberTelegramOptInId,
): Promise<void> {
  const rows = await db
    .select({ one: sql`1` })
    .from(memberTelegramOptIn)
    .where(and(eq(memberTelegramOptIn.pariwarId, pariwarId), eq(memberTelegramOptIn.optInId, optInId)))
    .limit(1);
  if (rows.length === 0) {
    throw new TelegramOptInNotFoundError(pariwarId, optInId);
  }
}

// ── System-expiry sweep reads (Task 7 — cross-tenant on the worker's BYPASSRLS service pool) ─────────────
// Runs WITHOUT a pariwar filter (the worker holds no scope tx; the service login is BYPASSRLS so it sees all
// tenants). Returns rows carrying their pariwar_id so the worker can scope the per-row audit.

/**
 * Stale PENDING opt-ins that never received a `/start` match within `ttlSeconds` (candidates for
 * PENDING→EXPIRED). Cross-tenant; bounded by `limit`. (There is NO past-window sweep — Telegram has no window.)
 */
export async function listStalePendingOptIns(
  db: Db,
  ttlSeconds: number,
  limit: number,
): Promise<MemberTelegramOptInRow[]> {
  return db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.state, 'PENDING'),
        lt(memberTelegramOptIn.createdAt, sql`now() - make_interval(secs => ${ttlSeconds})`),
      ),
    )
    .limit(clampLimit(limit, { default: 200, cap: 500 }));
}

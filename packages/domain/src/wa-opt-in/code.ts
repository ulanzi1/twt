// The WhatsApp CODE for a member whose WhatsApp is on another phone — Story 5.13 (WC2, WC3, WC5, WC15–WC17; Decision
// 2026-10-21-374 option A, Trustee-ratified; build decisions in Decision 2026-10-21-376). The accessors over
// `member_wa_opt_in_codes` (migration 0178).
//
// ⭐ Every refusal is RETURNED (`{ ok: false, refusal }`), ⛔ thrown: the API decides a refusal BEFORE any audit wrapper (WC5 —
// a refusal thrown inside `withCompensatingAudit` would write an intent line + `_rolled_back` AND roll back a wrong attempt's
// increment, making tries unlimited). These accessors run DIRECTLY on the passed (scoped) `Db` and open ⛔ transaction; the
// caller holds `lockMemberWaYes` for every write (the counts are re-decided under it — WC1 step 2).
// ⛔ The code: the caller hashes it (`hashOtp` — apps/api; the domain cannot import the auth module) and compares hashes in
// constant time (`timingSafeHashCompare`); `findLiveCodes` RETURNS the hashes for that compare. ⛔ Separate file from the
// sha-pinned `read.ts` / `write.ts` (F14).

import { and, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, MemberWaOptInId, PariwarId } from '../ids/index.js';
import type { MemberLifecycleState } from '../schema/members.js';
import { memberWaOptIn } from '../schema/member_wa_opt_in.js';
import { type WaOptInCodeSendOutcome, memberWaOptInCodes } from '../schema/member_wa_opt_in_codes.js';

/** At most TWO counted sends per request (`-374` *"one code per request and one retry"*, BigDev's reading *"Both"*). ⚠ LOCKSTEP with 0178's `send_seq` CHECK. */
export const WA_OPT_IN_CODE_MAX_SENDS = 2;
/** At most TWO entry attempts per code. ⚠ LOCKSTEP with 0178's `attempts` CHECKs. */
export const WA_OPT_IN_CODE_MAX_ATTEMPTS = 2;
/** A code is valid 10 minutes by the DB clock — Meta's default delivery TTL for an authentication template (WC3). */
export const WA_OPT_IN_CODE_TTL_SECONDS = 600;
/** The wait before the next send (WC3). */
export const WA_OPT_IN_CODE_RESEND_WAIT_SECONDS = 60;
/** WC17 — the lifecycle states a member holds at the signup step (5.10 F7): the only ones a code is sent to. */
export const WA_OPT_IN_CODE_SIGNUP_STATES: readonly MemberLifecycleState[] = ['pending-kyc', 'pending-fee'];

/** The outcomes a code may still be typed against (it may have reached the member). */
const LIVE_OUTCOMES: readonly WaOptInCodeSendOutcome[] = ['sending', 'accepted', 'may_have_sent'];

export type WaOptInCodeSendRefusal =
  | 'channel_unavailable'
  | 'already_active'
  | 'not_pending'
  | 'not_signing_up'
  | 'yes_ended_before'
  | 'limit'
  | 'too_soon';

/** What the app is told about a request's codes (the mint's fields; every code error's details). */
export interface WaOptInCodeState {
  /** Counted sends still possible: `2 − (rows ⛔ released)`. */
  readonly codesRemaining: 0 | 1 | 2;
  /** A code that may still be typed exists (⛔ consumed, ⛔ invalidated, ⛔ expired, ⛔ released / refused). */
  readonly liveCode: boolean;
  /** The NEWEST live code: `accepted` ⇒ `'sent'`; `sending` / `may_have_sent` ⇒ `'uncertain'`; ⛔ live code ⇒ null. */
  readonly liveCodeDelivery: 'sent' | 'uncertain' | null;
  /**
   * Seconds before the next send may be claimed (WC3): `ceil(60 − (clock_timestamp() − created_at))` of the newest row that is
   * live-shaped (`sending` / `accepted` / `may_have_sent`) or `released` with a `rate_limited:*` detail, clamped to [0, 60];
   * null when ⛔ further send is possible or ⛔ wait applies.
   */
  readonly retryAfterSeconds: number | null;
}

export interface WaOptInPendingRequest {
  readonly optInId: MemberWaOptInId;
  readonly verificationPhrase: string;
}

export type CheckCodeSendResult =
  | { readonly ok: true; readonly pending: WaOptInPendingRequest; readonly codeState: WaOptInCodeState }
  | {
      readonly ok: false;
      readonly refusal: WaOptInCodeSendRefusal;
      /** The PENDING request, when one exists (the audit snapshot / error details read it). */
      readonly pending: WaOptInPendingRequest | null;
      /** The PENDING's code state, when one exists; null otherwise. */
      readonly codeState: WaOptInCodeState | null;
    };

/** The opt-in config fields the channel check reads (`pariwar_wa_config` — the caller's read). */
export interface WaOptInCodeChannelConfig {
  readonly enabled: boolean;
  readonly displayPhoneNumber: string | null;
}

/** The state of ⛔ request — the mint's fallback when the database reads themselves fail (WC4). */
export const WA_OPT_IN_CODE_STATE_NONE: WaOptInCodeState = { codesRemaining: 0, liveCode: false, liveCodeDelivery: null, retryAfterSeconds: null };

/** The member's PENDING request (≤ 1 — the partial UNIQUE `member_wa_opt_in_pending_member_uq`), or null. */
export async function getPendingOptInRequest(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<WaOptInPendingRequest | null> {
  const rows = await db
    .select({ optInId: memberWaOptIn.optInId, verificationPhrase: memberWaOptIn.verificationPhrase })
    .from(memberWaOptIn)
    .where(
      and(eq(memberWaOptIn.pariwarId, args.pariwarId), eq(memberWaOptIn.memberId, args.memberId), eq(memberWaOptIn.state, 'PENDING')),
    )
    .orderBy(desc(memberWaOptIn.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * WC15 — TRUE iff the member has EVER had a yes ended: ANY row in `REVOKED` or `BLOCKED_BY_META` (only `endEveryWaYes` /
 * `revokeOptIn` from ACTIVE write those two — Story 5.13 Debug Log (f)). ADR-0029's *"Re-opt-in after revoke requires a NEW
 * inbound message"* stands, so such a member is ⛔ offered a code.
 */
export async function hasEndedWaYes(db: Db, args: { pariwarId: PariwarId; memberId: MemberId }): Promise<boolean> {
  const rows = await db
    .select({ one: sql`1` })
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.memberId, args.memberId),
        inArray(memberWaOptIn.state, ['REVOKED', 'BLOCKED_BY_META']),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The request's code state (WC3, WC4) — ONE read over the request's rows. */
export async function getCodeState(db: Db, args: { pariwarId: PariwarId; optInId: MemberWaOptInId }): Promise<WaOptInCodeState> {
  const r = await db.execute<{ counted: number; live: number; newest_live_outcome: string | null; retry_after: number | null }>(sql`
    SELECT
      count(*) FILTER (WHERE send_outcome <> 'released')::int AS counted,
      count(*) FILTER (WHERE ${liveSql()})::int AS live,
      (SELECT c2.send_outcome FROM member_wa_opt_in_codes c2
        WHERE c2.pariwar_id = ${args.pariwarId} AND c2.opt_in_id = ${args.optInId}
          AND c2.send_outcome IN ('sending', 'accepted', 'may_have_sent') AND c2.consumed_at IS NULL AND c2.invalidated_at IS NULL
          AND c2.expires_at > now()
        ORDER BY c2.created_at DESC, c2.send_seq DESC LIMIT 1) AS newest_live_outcome,
      (SELECT ceil(${WA_OPT_IN_CODE_RESEND_WAIT_SECONDS}::numeric - extract(epoch FROM clock_timestamp() - max(c3.created_at)))::int
         FROM member_wa_opt_in_codes c3
        WHERE c3.pariwar_id = ${args.pariwarId} AND c3.opt_in_id = ${args.optInId}
          AND (c3.send_outcome IN ('sending', 'accepted', 'may_have_sent')
               OR (c3.send_outcome = 'released' AND c3.detail LIKE 'rate\\_limited:%'))) AS retry_after
    FROM member_wa_opt_in_codes
    WHERE pariwar_id = ${args.pariwarId} AND opt_in_id = ${args.optInId}`);
  const row = r.rows[0];
  const counted = Number(row?.counted ?? 0);
  const codesRemaining = Math.max(0, WA_OPT_IN_CODE_MAX_SENDS - counted) as 0 | 1 | 2;
  const live = Number(row?.live ?? 0) > 0;
  const newest = row?.newest_live_outcome ?? null;
  const rawWait = row?.retry_after === null || row?.retry_after === undefined ? 0 : Number(row.retry_after);
  const wait = Math.min(WA_OPT_IN_CODE_RESEND_WAIT_SECONDS, Math.max(0, rawWait));
  return {
    codesRemaining,
    liveCode: live,
    liveCodeDelivery: !live || newest === null ? null : newest === 'accepted' ? 'sent' : 'uncertain',
    retryAfterSeconds: codesRemaining === 0 || wait === 0 ? null : wait,
  };
}

/**
 * ⭐ May a code be sent now? (WC1 steps 0 and 2.) In ONE order, everywhere: `channel_unavailable` (WhatsApp ⛔ enabled, or ⛔
 * display number) → `already_active` / `not_pending` → `not_signing_up` (WC17 — `memberState` is the caller's
 * `getCurrentMemberState` read) → `yes_ended_before` (WC15) → `limit` → `too_soon` (the WC3 wait). Lock-free at step 0
 * (advisory); under the caller's `lockMemberWaYes` at step 2 (authoritative). RETURNS — ⛔ throws.
 */
export async function checkCodeSendAllowed(
  db: Db,
  args: {
    pariwarId: PariwarId;
    memberId: MemberId;
    memberState: MemberLifecycleState;
    config: WaOptInCodeChannelConfig | null;
  },
): Promise<CheckCodeSendResult> {
  const subject = { pariwarId: args.pariwarId, memberId: args.memberId };
  const pending = await getPendingOptInRequest(db, subject);
  const codeState = pending ? await getCodeState(db, { pariwarId: args.pariwarId, optInId: pending.optInId }) : null;
  const refuse = (refusal: WaOptInCodeSendRefusal): CheckCodeSendResult => ({ ok: false, refusal, pending, codeState });

  if (!args.config || !args.config.enabled || !args.config.displayPhoneNumber) return refuse('channel_unavailable');
  const active = await db
    .select({ one: sql`1` })
    .from(memberWaOptIn)
    .where(and(eq(memberWaOptIn.pariwarId, args.pariwarId), eq(memberWaOptIn.memberId, args.memberId), eq(memberWaOptIn.state, 'ACTIVE')))
    .limit(1);
  if (active.length > 0) return refuse('already_active');
  if (!pending || !codeState) return refuse('not_pending');
  if (!WA_OPT_IN_CODE_SIGNUP_STATES.includes(args.memberState)) return refuse('not_signing_up');
  if (await hasEndedWaYes(db, subject)) return refuse('yes_ended_before');
  if (codeState.codesRemaining === 0) return refuse('limit');
  if (codeState.retryAfterSeconds !== null) return refuse('too_soon');
  return { ok: true, pending, codeState };
}

export interface InsertCodeSlotResult {
  readonly codeId: string;
  readonly sendSeq: 1 | 2;
  /** Counted sends still possible AFTER this one. */
  readonly codesRemaining: 0 | 1;
}

/**
 * Claim a send (WC1 step 2 — inside `withCompensatingAudit(member.wa_opt_in_code_sent)`, under the caller's lock, AFTER
 * `checkCodeSendAllowed` said ok): a `sending` row with `send_seq` = the LOWEST of {1, 2} ⛔ held by a non-released row of the
 * request (⛔ "count + 1" — a slow send released after a later one took seq 2 frees seq 1), the hash, `created_at` and
 * `expires_at` from ONE `clock_timestamp()` (`expires_at − created_at` = exactly 10 minutes). ⛔ Free seq is unreachable under
 * the lock (the check refused `limit`) ⇒ an invariant breach, THROWN (the wrapper writes `_rolled_back`); the partial UNIQUE is
 * the database's half.
 */
export async function insertCodeSlot(
  db: Db,
  args: { pariwarId: PariwarId; optInId: MemberWaOptInId; memberId: MemberId; codeHash: string },
): Promise<InsertCodeSlotResult> {
  const r = await db.execute<{ code_id: string; send_seq: number }>(sql`
    WITH t AS (SELECT clock_timestamp() AS at),
    s AS (
      SELECT min(v.seq)::smallint AS seq FROM (VALUES (1), (2)) AS v(seq)
       WHERE v.seq NOT IN (
         SELECT send_seq FROM member_wa_opt_in_codes
          WHERE pariwar_id = ${args.pariwarId} AND opt_in_id = ${args.optInId} AND send_outcome <> 'released')
    )
    INSERT INTO member_wa_opt_in_codes (pariwar_id, opt_in_id, member_id, send_seq, code_hash, expires_at, created_at)
    SELECT ${args.pariwarId}, ${args.optInId}, ${args.memberId}, s.seq, ${args.codeHash},
           t.at + make_interval(secs => ${WA_OPT_IN_CODE_TTL_SECONDS}), t.at
      FROM t, s WHERE s.seq IS NOT NULL
    RETURNING code_id, send_seq`);
  const row = r.rows[0];
  if (!row) throw new Error('[insertCodeSlot] ⛔ free send seq for this request — the caller must hold lockMemberWaYes and check first');
  const state = await getCodeState(db, { pariwarId: args.pariwarId, optInId: args.optInId });
  return { codeId: row.code_id, sendSeq: Number(row.send_seq) as 1 | 2, codesRemaining: Math.min(1, state.codesRemaining) as 0 | 1 };
}

/** What Meta did with a claimed send (WC3's table). ⛔ `sending` — that is the claim. */
export type CodeSendOutcomeRecord =
  | { readonly outcome: 'accepted'; readonly providerMessageId: string }
  | { readonly outcome: 'may_have_sent' | 'refused' | 'released'; readonly detail: string };

/**
 * Record a claimed send's outcome (WC1 step 4) — `WHERE code_id = $1 AND send_outcome = 'sending'` (the trigger lets it move
 * once). ⛔ Invalidates the earlier code (WC16 (a) — both stay usable). Returns whether the row moved (false: already recorded).
 */
export async function recordCodeSendOutcome(
  db: Db,
  args: { pariwarId: PariwarId; codeId: string; record: CodeSendOutcomeRecord },
): Promise<boolean> {
  const set =
    args.record.outcome === 'accepted'
      ? { sendOutcome: 'accepted' as const, providerMessageId: args.record.providerMessageId }
      : { sendOutcome: args.record.outcome, detail: args.record.detail };
  const moved = await db
    .update(memberWaOptInCodes)
    .set(set)
    .where(
      and(
        eq(memberWaOptInCodes.pariwarId, args.pariwarId),
        eq(memberWaOptInCodes.codeId, args.codeId),
        eq(memberWaOptInCodes.sendOutcome, 'sending'),
      ),
    )
    .returning({ codeId: memberWaOptInCodes.codeId });
  return moved.length === 1;
}

export interface LiveCode {
  readonly codeId: string;
  readonly codeHash: string;
  readonly attempts: number;
}

/**
 * The request's LIVE codes (WC2, WC16 (a)): `send_outcome IN ('sending', 'accepted', 'may_have_sent')`, ⛔ consumed, ⛔
 * invalidated, ⛔ expired — at most two, newest first. RETURNS the hashes; the compare is the caller's (constant time, against
 * EVERY row — ⛔ early exit).
 */
export async function findLiveCodes(db: Db, args: { pariwarId: PariwarId; optInId: MemberWaOptInId }): Promise<LiveCode[]> {
  return db
    .select({ codeId: memberWaOptInCodes.codeId, codeHash: memberWaOptInCodes.codeHash, attempts: memberWaOptInCodes.attempts })
    .from(memberWaOptInCodes)
    .where(and(eq(memberWaOptInCodes.pariwarId, args.pariwarId), eq(memberWaOptInCodes.optInId, args.optInId), liveWhere()))
    .orderBy(desc(memberWaOptInCodes.createdAt), desc(memberWaOptInCodes.sendSeq))
    .limit(2); // ⚠ = WA_OPT_IN_CODE_MAX_SENDS (a literal for the domain-accessor clamp gate)
}

export interface WrongAttemptResult {
  /** The most tries any live code still has (0 ⇒ every code the member held is now dead). */
  readonly attemptsRemaining: 0 | 1;
  readonly codesRemaining: 0 | 1 | 2;
  readonly liveCode: boolean;
}

/**
 * A wrong (or no-live-code) attempt (WC5 step 3, inside `withCompensatingAudit(member.wa_opt_in_code_rejected)` whose `mutate`
 * RETURNS so the increment COMMITS): ONE statement over EVERY live row — a wrong guess is wrong for each code the member holds —
 * `attempts + 1`, and `invalidated_at` set on each that reaches 2 (two statements would trip the dead-after-two CHECK). A no-op
 * with ⛔ live code. ⚠ A still-`sending` row counts in `attemptsRemaining`; if it is later released the member was told of a try
 * on a code that never left (accepted — Story 5.13 Task 1.2).
 */
export async function recordWrongAttempt(
  db: Db,
  args: { pariwarId: PariwarId; optInId: MemberWaOptInId },
): Promise<WrongAttemptResult> {
  const updated = await db
    .update(memberWaOptInCodes)
    .set({
      attempts: sql`${memberWaOptInCodes.attempts} + 1`,
      invalidatedAt: sql`CASE WHEN ${memberWaOptInCodes.attempts} + 1 >= ${WA_OPT_IN_CODE_MAX_ATTEMPTS} THEN now() ELSE ${memberWaOptInCodes.invalidatedAt} END`,
    })
    .where(and(eq(memberWaOptInCodes.pariwarId, args.pariwarId), eq(memberWaOptInCodes.optInId, args.optInId), liveWhere()))
    .returning({ attempts: memberWaOptInCodes.attempts });
  const attemptsRemaining = Math.max(0, ...updated.map((u) => WA_OPT_IN_CODE_MAX_ATTEMPTS - u.attempts)) as 0 | 1;
  const state = await getCodeState(db, args);
  return { attemptsRemaining: Math.min(1, attemptsRemaining) as 0 | 1, codesRemaining: state.codesRemaining, liveCode: state.liveCode };
}

/**
 * Consume the matched code (WC5 step 2 — the correct-code `mutate`), atomically: `WHERE consumed_at IS NULL AND invalidated_at IS
 * NULL AND attempts < 2 AND expires_at > now()` (and a live outcome). Returns whether it was consumed (false ⇒ the caller throws
 * inside the wrapper — the whole activation rolls back).
 */
export async function consumeCode(db: Db, args: { pariwarId: PariwarId; codeId: string }): Promise<boolean> {
  const done = await db
    .update(memberWaOptInCodes)
    .set({ consumedAt: sql`now()` })
    .where(and(eq(memberWaOptInCodes.pariwarId, args.pariwarId), eq(memberWaOptInCodes.codeId, args.codeId), liveWhere()))
    .returning({ codeId: memberWaOptInCodes.codeId });
  return done.length === 1;
}

/** The live-code predicate (Drizzle) — ⚠ LOCKSTEP with `liveSql()` below. */
function liveWhere() {
  return and(
    inArray(memberWaOptInCodes.sendOutcome, [...LIVE_OUTCOMES]),
    isNull(memberWaOptInCodes.consumedAt),
    isNull(memberWaOptInCodes.invalidatedAt),
    lt(memberWaOptInCodes.attempts, WA_OPT_IN_CODE_MAX_ATTEMPTS),
    gt(memberWaOptInCodes.expiresAt, sql`now()`),
  );
}

/** The live-code predicate (raw SQL, unqualified columns) — ⚠ LOCKSTEP with `liveWhere()` above. */
function liveSql() {
  return sql`send_outcome IN ('sending', 'accepted', 'may_have_sent') AND consumed_at IS NULL AND invalidated_at IS NULL
    AND attempts < ${WA_OPT_IN_CODE_MAX_ATTEMPTS} AND expires_at > now()`;
}

// Member Telegram opt-in read accessors — Story 5.5 (Task 3; AC5/AC10).
//
// Tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly (defense-in-depth
// matching the (pariwar_id, …) indexes). Mirror wa-opt-in/read.ts. Runs statements DIRECTLY on the passed
// (scoped) `Db` — no own transaction. The cross-tenant `/stop`/block read (`getActiveOptInByChatId`) is used
// by the worker on the BYPASSRLS service pool.

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberTelegramOptInRow,
  memberTelegramOptIn,
} from '../schema/member_telegram_opt_in.js';

/**
 * The worker's PENDING-match query (AC5): resolve the single outstanding PENDING opt-in for
 * `(pariwar_id, verification_code)`, or null. The partial-unique index guarantees at most ONE PENDING row per
 * (pariwar, code). Unlike WhatsApp, the code ALONE is the match key — Telegram never shares the member's
 * phone, so there is no mobile blind index to cross-check.
 */
export async function matchPendingOptIn(
  db: Db,
  args: { pariwarId: PariwarId; verificationCode: string },
): Promise<MemberTelegramOptInRow | null> {
  const rows = await db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.verificationCode, args.verificationCode),
        eq(memberTelegramOptIn.state, 'PENDING'),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the most-recent ACTIVE opt-in for a `chat_id` (the `/stop` + block path — a `/stop` message or a
 * `my_chat_member` block carries no verification code, so it is scoped to the member's ACTIVE opt-in by the
 * captured chat id). Returns null when no ACTIVE opt-in has that chat id (⇒ a `/stop` is a no-op).
 */
export async function getActiveOptInByChatId(
  db: Db,
  args: { pariwarId: PariwarId; chatId: string },
): Promise<MemberTelegramOptInRow | null> {
  const rows = await db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.chatId, args.chatId),
        eq(memberTelegramOptIn.state, 'ACTIVE'),
      ),
    )
    .orderBy(desc(memberTelegramOptIn.matchedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve EVERY ACTIVE opt-in bound to a `chat_id` (there is no DB uniqueness constraint stopping more than
 * one member from ending up ACTIVE on the same chat, e.g. a shared device or a leaked verification code) — the
 * `/stop` + block path must revoke ALL of them, not just the most-recently-matched one, or an older binding
 * would silently keep receiving deliveries after the member believes they've opted out.
 */
export async function listActiveOptInsByChatId(
  db: Db,
  args: { pariwarId: PariwarId; chatId: string },
): Promise<MemberTelegramOptInRow[]> {
  return db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.chatId, args.chatId),
        eq(memberTelegramOptIn.state, 'ACTIVE'),
      ),
    )
    .orderBy(desc(memberTelegramOptIn.matchedAt));
}

/**
 * The member-status read (AC5/AC10) — the latest opt-in row for `(pariwar_id, member_id)`, newest
 * `created_at` first, or null when the member has never opted in. Drives the settings toggle state + the
 * confirmation / retry copy.
 */
export async function getOptInForMember(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<MemberTelegramOptInRow | null> {
  const rows = await db
    .select()
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.memberId, args.memberId),
      ),
    )
    .orderBy(desc(memberTelegramOptIn.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The dual-gate half (AC5): TRUE iff the member has an ACTIVE opt-in — `state = 'ACTIVE'`. Unlike WhatsApp
 * there is NO 24h window check: a Telegram bot may message a member who has `/start`-ed until they block/stop
 * it. This operational read is the delivery source of truth (the composition resolver gates on it) — NEVER a
 * consent-registry query (see the Story 5.5 "Consent vs. operational delivery state" invariant).
 */
export async function isOptInActive(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<boolean> {
  const rows = await db
    .select({ one: eq(memberTelegramOptIn.state, 'ACTIVE') })
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.memberId, args.memberId),
        eq(memberTelegramOptIn.state, 'ACTIVE'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * The captured `chat_id` for a member's ACTIVE opt-in — the delivery resolver's `SendTarget.address`. Returns
 * null when the member has no ACTIVE opt-in or (defensively) no chat id captured. Tenant-scoped.
 */
export async function getChatIdForMember(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<string | null> {
  const rows = await db
    .select({ chatId: memberTelegramOptIn.chatId })
    .from(memberTelegramOptIn)
    .where(
      and(
        eq(memberTelegramOptIn.pariwarId, args.pariwarId),
        eq(memberTelegramOptIn.memberId, args.memberId),
        eq(memberTelegramOptIn.state, 'ACTIVE'),
      ),
    )
    .orderBy(desc(memberTelegramOptIn.matchedAt))
    .limit(1);
  return rows[0]?.chatId ?? null;
}

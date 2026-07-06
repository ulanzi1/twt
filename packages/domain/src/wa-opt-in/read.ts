// Member WA opt-in read accessors — Story 5.4 (Task 3; AC1/AC3/AC6).
//
// Tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly (defense-in-depth
// matching the (pariwar_id, …) indexes). Mirror consent/read.ts. Runs statements DIRECTLY on the passed
// (scoped) `Db` — no own transaction.

import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberWaOptInRow,
  memberWaOptIn,
} from '../schema/member_wa_opt_in.js';
import { memberIdentities } from '../schema/member_identities.js';

/**
 * Read a member's stored `member_identities.mobile_blind_index` (the SAME deterministic HMAC the worker
 * recomputes from an inbound `from`). The member opt-in route uses this as the PENDING row's match key —
 * reading the stored value (rather than recomputing) guarantees the opt-in match key equals the member's
 * identity blind index. Tenant-scoped (RLS + the explicit pariwarId). Null when the member has no identity row.
 */
export async function getMemberMobileBlindIndex(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<string | null> {
  const rows = await db
    .select({ blindIndex: memberIdentities.mobileBlindIndex })
    .from(memberIdentities)
    .where(
      and(
        eq(memberIdentities.pariwarId, args.pariwarId),
        eq(memberIdentities.memberId, args.memberId),
      ),
    )
    .limit(1);
  return rows[0]?.blindIndex ?? null;
}

/**
 * The worker's PENDING-match query (AC3): resolve the single outstanding PENDING opt-in for
 * `(pariwar_id, mobile_blind_index, verification_phrase)`, or null. The partial-unique index guarantees at
 * most ONE PENDING row per (pariwar, phrase), so the phrase disambiguates even when several members share a
 * mobile-on-file mismatch (architecture §3.4). Both keys must match — the blind index alone is not enough
 * (the WA number may differ from the mobile-on-file; the phrase is the disambiguator).
 */
export async function matchPendingOptIn(
  db: Db,
  args: { pariwarId: PariwarId; mobileBlindIndex: string; verificationPhrase: string },
): Promise<MemberWaOptInRow | null> {
  const rows = await db
    .select()
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.mobileBlindIndex, args.mobileBlindIndex),
        eq(memberWaOptIn.verificationPhrase, args.verificationPhrase),
        eq(memberWaOptIn.state, 'PENDING'),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the most-recent ACTIVE opt-in for a member, matched by mobile blind index (the STOP-handling +
 * Meta-block path — a STOP / block carries no verification phrase, so it is scoped to the member's ACTIVE
 * opt-in, NOT phrase-matched). Returns null when the member has no ACTIVE opt-in (⇒ a STOP is a no-op).
 */
export async function getActiveOptInByMobile(
  db: Db,
  args: { pariwarId: PariwarId; mobileBlindIndex: string },
): Promise<MemberWaOptInRow | null> {
  const rows = await db
    .select()
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.mobileBlindIndex, args.mobileBlindIndex),
        eq(memberWaOptIn.state, 'ACTIVE'),
      ),
    )
    .orderBy(desc(memberWaOptIn.matchedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The member-status read (AC1) — the latest opt-in row for `(pariwar_id, member_id)`, newest `created_at`
 * first, or null when the member has never opted in. Drives the settings toggle state + the confirmation /
 * retry copy.
 */
export async function getOptInForMember(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<MemberWaOptInRow | null> {
  const rows = await db
    .select()
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.memberId, args.memberId),
      ),
    )
    .orderBy(desc(memberWaOptIn.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Read a member's Tier-1 mobile ciphertext (`member_identities.mobile_ciphertext`) — the composition WA
 * resolver decrypts it to the member's WhatsApp recipient number ONCE both dual gates pass (the decryption
 * happens in the app layer, never the domain). Tenant-scoped. Null when the member has no identity row.
 */
export async function getMemberMobileCiphertext(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId },
): Promise<string | null> {
  const rows = await db
    .select({ ciphertext: memberIdentities.mobileCiphertext })
    .from(memberIdentities)
    .where(
      and(
        eq(memberIdentities.pariwarId, args.pariwarId),
        eq(memberIdentities.memberId, args.memberId),
      ),
    )
    .limit(1);
  return rows[0]?.ciphertext ?? null;
}

/**
 * The AC6 dual-gate half: TRUE iff the member has an ACTIVE opt-in whose 24h window has not passed —
 * `state = 'ACTIVE' AND (window_expires_at IS NULL OR at < window_expires_at)`. `at` defaults to DB `now()`
 * (§1.11 DB-authoritative). The composition WA resolver consumes this alongside `consentExists`.
 */
export async function isOptInActive(
  db: Db,
  args: { pariwarId: PariwarId; memberId: MemberId; at?: Date },
): Promise<boolean> {
  const windowGuard =
    args.at === undefined
      ? sql`(${memberWaOptIn.windowExpiresAt} IS NULL OR now() < ${memberWaOptIn.windowExpiresAt})`
      : or(isNull(memberWaOptIn.windowExpiresAt), gt(memberWaOptIn.windowExpiresAt, args.at));

  const rows = await db
    .select({ one: sql`1` })
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.memberId, args.memberId),
        eq(memberWaOptIn.state, 'ACTIVE'),
        windowGuard,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

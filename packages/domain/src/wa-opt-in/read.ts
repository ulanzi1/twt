// Member WA opt-in read accessors — Story 5.4 (Task 3; AC1/AC3/AC6).
//
// Tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly (defense-in-depth
// matching the (pariwar_id, …) indexes). Mirror consent/read.ts. Runs statements DIRECTLY on the passed
// (scoped) `Db` — no own transaction.

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { consentExists } from '../consent/read.js';
import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { consentRecords } from '../schema/consent_records.js';
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
 * Resolve the most-recent ACTIVE opt-in matched by mobile blind index — the Meta-block path (a status carries no
 * verification phrase, so it is scoped to the ACTIVE opt-in, NOT phrase-matched). Returns null when the number has no
 * ACTIVE opt-in (⇒ a 131050 ends nothing). Story 5.12: a STOP no longer reads this — it ends the yes of every member
 * whose rows carry the number, any state (`listMemberIdsByOptInMobile`, LY6).
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
 * The AC6 dual-gate half: TRUE iff the member has an ACTIVE opt-in — `state = 'ACTIVE'`, ⛔ clock. Story 5.12 (`-364` option A,
 * Trustee-ratified; LY1): a yes lasts until the member takes it back (in the app, by STOP, or Meta's 131050), so
 * `window_expires_at` — Meta's free-form window end, ⛔ the opt-in's end (reading (ii)) — is ⛔ read here. The composition WA
 * resolver consumes this alongside the admin toggle; `isPeerMeshWaReminderOptedIn` alongside `consentExists`.
 */
export async function isOptInActive(db: Db, args: { pariwarId: PariwarId; memberId: MemberId }): Promise<boolean> {
  const rows = await db
    .select({ one: sql`1` })
    .from(memberWaOptIn)
    .where(
      and(
        eq(memberWaOptIn.pariwarId, args.pariwarId),
        eq(memberWaOptIn.memberId, args.memberId),
        eq(memberWaOptIn.state, 'ACTIVE'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * ⭐ Story 6.31 (WR3) — "has chosen WhatsApp messages from the Trust" for the peer-mesh WhatsApp reminder: the ONE read the
 * reminder calls. `isOptInActive` (the ratified dual gate's member half — ADR-0029, `-065`; `resolveWaTarget` reads it) AND
 * `consentExists(…, 'whatsapp_opt_in')` — a DEFENSIVE conjunct that can only narrow. 2026-10-21 Story 5.12 (`-364` option A) —
 * the 24-hour reach (6.31 F14) is GONE: `isOptInActive` has ⛔ clock, so a yes lasts until withdrawn; this composition is
 * unchanged. Condition 4 shipped too (every withdrawal ends EVERY open consent row — `endEveryWaYes`), so the conjunct no longer
 * counts a withdrawn yes — it stays, defensive.
 */
export async function isPeerMeshWaReminderOptedIn(db: Db, args: { pariwarId: PariwarId; memberId: MemberId }): Promise<boolean> {
  if (!(await isOptInActive(db, { pariwarId: args.pariwarId, memberId: args.memberId }))) return false;
  return consentExists(db, args.pariwarId, args.memberId, 'whatsapp_opt_in');
}

// ── Story 5.12 (`-364` conditions 3 + 4; LY4–LY6) — STATE reads, ⛔ through `isOptInActive` (T4) ─────────────

/**
 * The member's ACTIVE opt-in row (state only — ⛔ window), or null. ≤ 1 by the partial UNIQUE
 * `member_wa_opt_in_active_member_uq` (Story 5.12, LY4). The withdrawal paths read it for the audit snapshot.
 */
export async function getActiveOptInForMember(
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
        eq(memberWaOptIn.state, 'ACTIVE'),
      ),
    )
    .orderBy(desc(memberWaOptIn.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** TRUE iff the member has ANY `state = 'ACTIVE'` row — the mint guard's read (LY4; ⛔ the newest row only, ⛔ window). */
export async function hasActiveOptIn(db: Db, args: { pariwarId: PariwarId; memberId: MemberId }): Promise<boolean> {
  return (await getActiveOptInForMember(db, args)) !== null;
}

/**
 * TRUE iff a withdrawal has something to end (LY5 / LY7): an ACTIVE opt-in row, OR an open (`revoked_at IS NULL`)
 * `whatsapp_opt_in` consent row — the predicate `endEveryWaYes` acts on, so "nothing to end" here means it would end nothing.
 */
export async function hasAnythingToEnd(db: Db, args: { pariwarId: PariwarId; memberId: MemberId }): Promise<boolean> {
  if (await hasActiveOptIn(db, args)) return true;
  const open = await db
    .select({ one: sql`1` })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.pariwarId, args.pariwarId),
        eq(consentRecords.subjectId, args.memberId),
        eq(consentRecords.consentType, 'whatsapp_opt_in'),
        isNull(consentRecords.revokedAt),
      ),
    )
    .limit(1);
  return open.length > 0;
}

/**
 * Every member whose opt-in rows (ANY state) carry `mobileBlindIndex` in the Pariwar — the member STOP's lookup (LY6): a STOP
 * ends the yes of each, whatever their newest row's state. One member per number per Pariwar today (F10b — the identity's
 * unique blind index, ⛔ mobile-change writer); bounded regardless.
 */
export async function listMemberIdsByOptInMobile(
  db: Db,
  args: { pariwarId: PariwarId; mobileBlindIndex: string; limit?: number },
): Promise<MemberId[]> {
  const rows = await db
    .selectDistinct({ memberId: memberWaOptIn.memberId })
    .from(memberWaOptIn)
    .where(and(eq(memberWaOptIn.pariwarId, args.pariwarId), eq(memberWaOptIn.mobileBlindIndex, args.mobileBlindIndex)))
    .orderBy(memberWaOptIn.memberId)
    .limit(clampLimit(args.limit, { default: 50, cap: 200 }));
  return rows.map((r) => r.memberId);
}

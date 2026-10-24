// The NOMINEE MEMBER LINK — the domain (Story 6.36e, Task 2.1; `2026-10-24-397` NE2, NE5, NE6, NE10; `2026-10-24-396` Q1 A,
// Q2 A).
//
// A member declaring nominees in Life Events may MARK a nominee as a fellow member, found from their own contacts (or the
// iOS picker, or a typed number). The server resolves the number to an ELIGIBLE member of the declarer's Pariwar and records
// the member ACCOUNT on that rank's new version (`member_nominee_links`, 0181) — so 6.36d's exclusion keeps them out of the
// five even if they sign in on another number. The marked member is told IN THE APP and answers "that's me" / "not me";
// under Q1 A the mark counts WHATEVER they answer. This module holds:
//   · the charge (the caller gate + `nominee_link_resolve`, 4 a day — in its OWN short transaction BEFORE any HMAC: TR14);
//   · the resolution of HMAC'd numbers through 6.36b's `knownPersonEligibleSql` (NE5 — reused, ⛔ re-written);
//   · the declare's link writes: `FOR UPDATE` every live link → a PURE plan (carry / end / insert, NE2) → apply after the
//     versions are appended;
//   · the reads (the declarer's marks; the marked member's requests), the answer, the erasure arm and the export.
//
// ⛔ NO NUMBER, ⛔ NO NAME here: the functions take blind indexes and return member ids; the handler resolves registered
// names AFTER its transaction commits (the 6.36b `names.ts` pattern — ⛔ KMS under a lock).
// ⚠ TR13 — `member/lock-in-gate.ts` imports `nominee/`, so this module imports `../member/known-people.js` DIRECTLY, ⛔ the
// member barrel (a runtime init cycle `tsc` cannot see). ⛔ And ⛔ never `../claim/` (T5 — the claim lock is composed in the
// handler).

import { and, eq, or, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db.js';
import { memberId as toMemberId, nomineeLinkId, nomineeVersionId, type MemberId, type NomineeLinkId, type NomineeVersionId, type PariwarId } from '../ids/index.js';
import { chargeMemberCounter, isKnownPeopleCaller, knownPersonEligibleSql, namedByClaimSql } from '../member/known-people.js';
import { clampLimit } from '../pagination.js';
import type { MemberNomineeVersionRow } from '../schema/member_nominee_versions.js';
import {
  memberNomineeLinks,
  type NomineeLinkAnswer,
  type NomineeLinkEndReason,
  type NomineeLinkFoundBy,
  type NomineeLinkState,
} from '../schema/member_nominee_links.js';
import type { NomineeRank } from './declaration-history.js';

// ── The rules (NE5) ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** `kind:'new'` marks a member may resolve per IST day — two ranks, one retry each (NE5, V2). */
export const NOMINEE_LINK_RESOLVES_PER_DAY = 4;
/** The batch HMAC's audit purpose for the declare's link numbers (a house constant — `/^[a-z][a-z0-9_]{0,63}$/`). */
export const NOMINEE_LINK_RESOLVE_AUDIT_PURPOSE = 'nominee_link_resolve';
/** The marked member's requests: one page. */
export const NOMINEE_LINK_REQUESTS_LIMIT = { default: 50, cap: 50 } as const;

const asDate = (v: Date | string): Date => (v instanceof Date ? v : new Date(v));

// ── The charge (NE5, TR14) ──────────────────────────────────────────────────────────────────────────────────────────────

/** Why a mark was refused before any HMAC. `not_available` is answered as the SAME 422 as an unresolvable mark (TR7). */
export type NomineeLinkChargeRefusal = 'not_available' | 'daily_limit';

/**
 * Charge `marks` (the count of `kind:'new'` entries) — run it in its OWN SHORT scoped transaction BEFORE any HMAC; a refusal
 * leaves the counter as it was (the caller rolls back). Order: the caller gate (`isKnownPeopleCaller` — `active`, ⛔ named
 * by a claim as the deceased; ⛔ a counter is charged for anyone else) → `nominee_link_resolve` (4 a day, all-or-nothing).
 * ⛔ Called for a `keep` or a save without a mark (V11 — an `active-in-grace` member keeps today's right to save).
 */
export async function chargeNomineeLinkResolve(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId; marks: number },
): Promise<{ ok: true } | { ok: false; reason: NomineeLinkChargeRefusal }> {
  if (!(await isKnownPeopleCaller(db, input.pariwarId, input.memberId))) return { ok: false, reason: 'not_available' };
  if (!(await chargeMemberCounter(db, input.pariwarId, input.memberId, 'nominee_link_resolve', input.marks, NOMINEE_LINK_RESOLVES_PER_DAY))) {
    return { ok: false, reason: 'daily_limit' };
  }
  return { ok: true };
}

/** Thrown INSIDE the charging transaction so the scope rolls it back; caught outside. Carries ONLY the reason. */
export class NomineeLinkChargeRefused extends Error {
  constructor(readonly reason: NomineeLinkChargeRefusal) {
    super(`nominee_link charge refused: ${reason}`);
    this.name = 'NomineeLinkChargeRefused';
  }
}

// ── Resolution (NE5) ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Which of `indexes` (login blind indexes, computed OUTSIDE any transaction) belong to an ELIGIBLE member of the declarer's
 * Pariwar — `knownPersonEligibleSql` (`active` / `active-in-grace`, ⛔ the declarer, ⛔ named by a claim as the deceased).
 * Returns index → member id for the eligible ones only; every other index is ABSENT (⛔ a member, erased, withdrawn,
 * reported dead, another Pariwar, the declarer — ONE answer, TR7). Inside the declare's scope transaction. A read.
 */
export async function resolveNomineeLinkTargets(
  db: Db,
  input: { pariwarId: PariwarId; declarerMemberId: MemberId; indexes: readonly string[] },
): Promise<Map<string, MemberId>> {
  const out = new Map<string, MemberId>();
  if (input.indexes.length === 0) return out;
  const r = await db.execute<{ idx: string; member_id: string }>(sql`
    SELECT mi.mobile_blind_index AS idx, mi.member_id
      FROM member_identities mi
      JOIN members m ON m.member_id = mi.member_id AND m.pariwar_id = mi.pariwar_id
     WHERE mi.pariwar_id = ${input.pariwarId}
       AND mi.mobile_blind_index = ANY(${sql.param([...input.indexes])}::text[])
       AND ${knownPersonEligibleSql(sql`m`, input.declarerMemberId)}`);
  for (const row of r.rows) out.set(row.idx, toMemberId(row.member_id));
  return out;
}

// ── The declare's writes (NE2) ──────────────────────────────────────────────────────────────────────────────────────────

/** One LIVE link of the declarer, locked `FOR UPDATE` by {@link lockLiveNomineeLinks}. */
export interface LiveNomineeLink {
  readonly linkId: NomineeLinkId;
  readonly versionId: NomineeVersionId;
  readonly rank: NomineeRank;
  readonly nomineeMemberId: MemberId;
  /** Whether its version was its rank's HEAD (highest `version_no`) BEFORE this save. */
  readonly onHead: boolean;
}

/**
 * `SELECT … FOR UPDATE` EVERY live link of the declarer (any version, any rank) — AFTER `lockNomineeDeclarationForEdit` (the
 * D3 lock stays the transaction's FIRST lock) and BEFORE this save appends its versions (so `onHead` is the head BEFORE the
 * save). A marked member's answer racing this save waits on the row lock, then finds the row ended (⇒ `request_closed`) —
 * or committed first and is carried (AC3 — ⛔ an answer is lost).
 */
export async function lockLiveNomineeLinks(
  db: Db,
  input: { pariwarId: PariwarId; declarerMemberId: MemberId },
): Promise<LiveNomineeLink[]> {
  const r = await db.execute<{ link_id: string; version_id: string; rank: number; nominee_member_id: string; on_head: boolean }>(sql`
    SELECT l.link_id, l.version_id, l.rank, l.nominee_member_id,
           v.version_no = (SELECT max(h.version_no) FROM member_nominee_versions h
                            WHERE h.pariwar_id = l.pariwar_id AND h.member_id = l.declarer_member_id AND h.rank = l.rank) AS on_head
      FROM member_nominee_links l
      JOIN member_nominee_versions v ON v.version_id = l.version_id
     WHERE l.pariwar_id = ${input.pariwarId} AND l.declarer_member_id = ${input.declarerMemberId} AND l.state = 'live'
     ORDER BY l.rank, l.link_id
       FOR UPDATE OF l`);
  return r.rows.map((row) => ({
    linkId: nomineeLinkId(row.link_id),
    versionId: nomineeVersionId(row.version_id),
    rank: row.rank as NomineeRank,
    nomineeMemberId: toMemberId(row.nominee_member_id),
    onHead: row.on_head === true,
  }));
}

/** A submitted rank's mark, as the handler resolved it: a NEW mark (its member, or `null` when it did not resolve), a KEEP. */
export type SubmittedNomineeLink =
  | { readonly kind: 'new'; readonly nomineeMemberId: MemberId | null; readonly foundBy: NomineeLinkFoundBy }
  | { readonly kind: 'keep'; readonly linkId: string };

export interface PlannedNomineeLinkInsert {
  readonly rank: NomineeRank;
  readonly nomineeMemberId: MemberId;
  /** `null` for a NEW mark (a fresh `asked_at` and ⛔ answer); else the live link it carries (its answer and `asked_at` copied). */
  readonly carriedFrom: LiveNomineeLink | null;
  readonly foundBy: NomineeLinkFoundBy | null;
}

export interface PlannedNomineeLinkEnd {
  readonly linkId: NomineeLinkId;
  readonly rank: NomineeRank;
  readonly reason: Exclude<NomineeLinkEndReason, 'erased'>;
}

export type NomineeLinkPlan =
  | { readonly kind: 'plan'; readonly inserts: readonly PlannedNomineeLinkInsert[]; readonly ends: readonly PlannedNomineeLinkEnd[] }
  /** `not_found` — a new mark did not resolve (TR7: ONE answer); `stale` — a keep names ⛔ live link; `duplicate` — one member on both ranks. */
  | { readonly kind: 'refused'; readonly reason: 'not_found' | 'stale' | 'duplicate' };

/**
 * NE2 — PURE. `submitted` is every rank this save declares (each with its mark, or `null`); `live` the declarer's locked live
 * links. A `keep` must name one of them (on ANY rank — carried to the rank it is submitted on), else `stale`. The SAME member
 * on both ranks after resolution (two keeps of one link, a keep and a new on one member, two news on one member) ⇒
 * `duplicate`. Every live link NOT carried ENDS: `redeclared` when its rank is vacated or given another mark, or when it sat
 * on a version that was not its rank's head (a correction, an innocence-finding unlock); `removed_by_declarer` when its rank
 * is re-saved WITHOUT a mark. A `keep` does ⛔ re-run eligibility (the target was eligible when marked).
 */
export function planNomineeLinks(
  live: readonly LiveNomineeLink[],
  submitted: readonly { readonly rank: NomineeRank; readonly link: SubmittedNomineeLink | null }[],
): NomineeLinkPlan {
  for (const s of submitted) {
    if (s.link?.kind === 'new' && s.link.nomineeMemberId === null) return { kind: 'refused', reason: 'not_found' };
  }
  const liveById = new Map(live.map((l) => [l.linkId as string, l]));
  for (const s of submitted) {
    if (s.link?.kind === 'keep' && !liveById.has(s.link.linkId.toLowerCase())) return { kind: 'refused', reason: 'stale' };
  }
  const inserts: PlannedNomineeLinkInsert[] = [];
  for (const s of submitted) {
    if (s.link === null) continue;
    if (s.link.kind === 'new') {
      inserts.push({ rank: s.rank, nomineeMemberId: s.link.nomineeMemberId!, carriedFrom: null, foundBy: s.link.foundBy });
    } else {
      const from = liveById.get(s.link.linkId.toLowerCase())!;
      inserts.push({ rank: s.rank, nomineeMemberId: from.nomineeMemberId, carriedFrom: from, foundBy: null });
    }
  }
  if (new Set(inserts.map((i) => i.nomineeMemberId)).size !== inserts.length) return { kind: 'refused', reason: 'duplicate' };
  const carried = new Set(inserts.flatMap((i) => (i.carriedFrom === null ? [] : [i.carriedFrom.linkId as string])));
  const ends: PlannedNomineeLinkEnd[] = [];
  for (const l of live) {
    if (carried.has(l.linkId)) {
      ends.push({ linkId: l.linkId, rank: l.rank, reason: 'redeclared' });
      continue;
    }
    const resaved = submitted.find((s) => s.rank === l.rank);
    const reason = !l.onHead || resaved === undefined || resaved.link !== null ? 'redeclared' : 'removed_by_declarer';
    ends.push({ linkId: l.linkId, rank: l.rank, reason });
  }
  return { kind: 'plan', inserts, ends };
}

/** What a declare wrote — for its audit lines (ids and ranks only). */
export interface AppliedNomineeLinks {
  readonly asked: readonly { readonly linkId: NomineeLinkId; readonly rank: NomineeRank }[];
  readonly carried: readonly { readonly linkId: NomineeLinkId; readonly rank: NomineeRank }[];
  readonly ended: readonly { readonly linkId: NomineeLinkId; readonly rank: NomineeRank }[];
}

/**
 * Apply a plan AFTER `appendMemberDeclarationVersions` (the new rows reference its version ids), in the SAME transaction.
 * Ends first (dated `recordedAt` — the save's instant, the SAME as the new versions' `recorded_at`, so an as-of-cut read
 * never sees the old link end before its replacement exists), then the inserts: a NEW mark takes `asked_at = recordedAt`;
 * a CARRY copies the old row's nominee, `found_by`, `asked_at`, `answer` and `responded_at` IN SQL (µs kept) and points at
 * it. ⛔ Number, ⛔ name.
 */
export async function applyNomineeLinkPlan(
  db: Db,
  input: {
    pariwarId: PariwarId;
    declarerMemberId: MemberId;
    plan: Extract<NomineeLinkPlan, { kind: 'plan' }>;
    versions: readonly MemberNomineeVersionRow[];
    recordedAt: Date;
  },
): Promise<AppliedNomineeLinks> {
  const { pariwarId, declarerMemberId, plan, versions, recordedAt } = input;
  const ended: AppliedNomineeLinks['ended'][number][] = [];
  for (const e of plan.ends) {
    const r = await db.execute(sql`
      UPDATE member_nominee_links SET state = 'ended', ended_at = ${recordedAt}, end_reason = ${e.reason}
       WHERE pariwar_id = ${pariwarId} AND declarer_member_id = ${declarerMemberId} AND link_id = ${e.linkId} AND state = 'live'`);
    if (r.rowCount !== 1) throw new Error('[member-links] a locked live link did not end — check session scope');
    ended.push({ linkId: e.linkId, rank: e.rank });
  }
  const asked: AppliedNomineeLinks['asked'][number][] = [];
  const carried: AppliedNomineeLinks['carried'][number][] = [];
  for (const i of plan.inserts) {
    const version = versions.find((v) => v.rank === i.rank && v.kind === 'declared');
    if (!version) throw new Error(`[member-links] rank ${i.rank} has no declared version in this save`);
    if (i.carriedFrom === null) {
      const r = await db.execute<{ link_id: string }>(sql`
        INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, asked_at)
        VALUES (${pariwarId}, ${declarerMemberId}, ${version.versionId}, ${i.rank}, ${i.nomineeMemberId}, ${i.foundBy}, ${recordedAt})
        RETURNING link_id`);
      asked.push({ linkId: nomineeLinkId(r.rows[0]!.link_id), rank: i.rank });
    } else {
      const r = await db.execute<{ link_id: string }>(sql`
        INSERT INTO member_nominee_links
          (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, carried_from_link_id, answer, asked_at, responded_at)
        SELECT o.pariwar_id, o.declarer_member_id, ${version.versionId}, ${i.rank}, o.nominee_member_id, o.found_by, o.link_id,
               o.answer, o.asked_at, o.responded_at
          FROM member_nominee_links o
         WHERE o.pariwar_id = ${pariwarId} AND o.link_id = ${i.carriedFrom.linkId}
        RETURNING link_id`);
      if (!r.rows[0]) throw new Error('[member-links] the carried link vanished — check session scope');
      carried.push({ linkId: nomineeLinkId(r.rows[0].link_id), rank: i.rank });
    }
  }
  return { asked, carried, ended };
}

// ── The exclusion's read (NE7) ─────────────────────────────────────────────────────────────────────────────────────────

/** One link as the exclusion reads it — the version it hangs off, the marked member, and when (if ever) it ended. */
export interface NomineeLinkOfVersion {
  readonly versionId: NomineeVersionId;
  readonly nomineeMemberId: MemberId;
  readonly endedAt: Date | null;
}

/** Every link (ANY state) hung off these versions — 6.36d's exclusion picks the ones that count as of the cut. DB only. */
export async function listNomineeLinksOfVersions(
  db: Db,
  pariwarId: PariwarId,
  versionIds: readonly NomineeVersionId[],
): Promise<NomineeLinkOfVersion[]> {
  if (versionIds.length === 0) return [];
  const r = await db.execute<{ version_id: string; nominee_member_id: string; ended_at: Date | string | null }>(sql`
    SELECT version_id, nominee_member_id, ended_at FROM member_nominee_links
     WHERE pariwar_id = ${pariwarId} AND version_id = ANY(${sql.param([...versionIds])}::uuid[])
     ORDER BY version_id, link_id`);
  return r.rows.map((row) => ({
    versionId: nomineeVersionId(row.version_id),
    nomineeMemberId: toMemberId(row.nominee_member_id),
    endedAt: row.ended_at === null ? null : asDate(row.ended_at),
  }));
}

// ── The declarer's marks (AC2) ──────────────────────────────────────────────────────────────────────────────────────────

/** What the declarer's screen shows per marked rank — `asked` until the marked member answers. */
export type NomineeLinkLabel = 'asked' | NomineeLinkAnswer;

export interface DeclarerNomineeLink {
  readonly rank: NomineeRank;
  readonly linkId: NomineeLinkId;
  readonly label: NomineeLinkLabel;
  /** The marked member — the handler resolves the registered name ONLY when `label = 'confirmed'` (`-309`). */
  readonly nomineeMemberId: MemberId;
}

/** The declarer's LIVE links on their ranks' HEAD versions, rank-ordered (one per rank at most). A read. */
export async function listNomineeLinksForDeclarer(
  db: Db,
  input: { pariwarId: PariwarId; declarerMemberId: MemberId },
): Promise<DeclarerNomineeLink[]> {
  const r = await db.execute<{ link_id: string; rank: number; answer: NomineeLinkAnswer | null; nominee_member_id: string }>(sql`
    SELECT l.link_id, l.rank, l.answer, l.nominee_member_id
      FROM member_nominee_links l
      JOIN member_nominee_versions v ON v.version_id = l.version_id
     WHERE l.pariwar_id = ${input.pariwarId} AND l.declarer_member_id = ${input.declarerMemberId} AND l.state = 'live'
       AND v.version_no = (SELECT max(h.version_no) FROM member_nominee_versions h
                            WHERE h.pariwar_id = l.pariwar_id AND h.member_id = l.declarer_member_id AND h.rank = l.rank)
     ORDER BY l.rank`);
  return r.rows.map((row) => ({
    rank: row.rank as NomineeRank,
    linkId: nomineeLinkId(row.link_id),
    label: row.answer ?? 'asked',
    nomineeMemberId: toMemberId(row.nominee_member_id),
  }));
}

// ── The marked member's side (AC4, NE6) ─────────────────────────────────────────────────────────────────────────────────

/**
 * Who may read and answer the requests naming them (NE6, V13): an `active` or `active-in-grace` member (`m`) whom ⛔ claim (in
 * any state) names as the deceased — the target side of 6.36b's rule, so a member who could be MARKED can always answer.
 */
export function nomineeLinkAnswererSql(m: SQL): SQL {
  return sql`(${m}.state IN ('active', 'active-in-grace') AND NOT ${namedByClaimSql(sql`${m}.pariwar_id`, sql`${m}.member_id`)})`;
}

/** {@link nomineeLinkAnswererSql} for one member — the routes' ONE gate. */
export async function isNomineeLinkAnswerer(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<boolean> {
  const r = await db.execute<{ ok: boolean }>(
    sql`SELECT true AS ok FROM members m WHERE m.pariwar_id = ${pariwarId} AND m.member_id = ${memberId} AND ${nomineeLinkAnswererSql(sql`m`)}`,
  );
  return r.rows.length === 1;
}

export interface NomineeLinkRequest {
  readonly linkId: NomineeLinkId;
  /** `null` — open (the home card); else the member's answer (kept in the list). */
  readonly answer: NomineeLinkAnswer | null;
  /** The declarer — the handler resolves the registered name from it (⛔ ever on the wire). */
  readonly declarerMemberId: MemberId;
  readonly askedAt: Date;
}

export interface NomineeLinkRequestsPage {
  readonly items: readonly NomineeLinkRequest[];
  readonly hasMore: boolean;
  /** Opaque — the next page's `cursor`; `null` on the last page. */
  readonly nextCursor: string | null;
}

/** A malformed page cursor (a client bug or tampering — the route answers 400). Carries ⛔ the value. */
export class NomineeLinkCursorInvalidError extends Error {
  public constructor() {
    super('[member-links] the page cursor is not one this server issued');
    this.name = 'NomineeLinkCursorInvalidError';
  }
}

/** A cursor's `asked_at` — UTC, ALWAYS six fractional digits (µs — compared in SQL, exactly). */
const CURSOR_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const CURSOR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `true` for a REAL instant on or after 1970 — a forged value that reached the `::timestamptz` cast would 500 (22008). */
function isCursorInstant(value: string): boolean {
  if (!CURSOR_AT_RE.test(value) || Number(value.slice(0, 4)) < 1970) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === `${value.slice(0, 23)}Z`;
}

function encodeRequestsCursor(open: boolean, askedAtUs: string, linkId: string): string {
  return Buffer.from(JSON.stringify([open ? 'open' : 'answered', askedAtUs, linkId]), 'utf8').toString('base64url');
}

function decodeRequestsCursor(cursor: string): { open: boolean; askedAt: string; linkId: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new NomineeLinkCursorInvalidError();
  }
  if (!Array.isArray(parsed) || parsed.length !== 3 || !parsed.every((p) => typeof p === 'string')) throw new NomineeLinkCursorInvalidError();
  const [kind, askedAt, linkId] = parsed as [string, string, string];
  if ((kind !== 'open' && kind !== 'answered') || !isCursorInstant(askedAt) || !CURSOR_ID_RE.test(linkId)) {
    throw new NomineeLinkCursorInvalidError();
  }
  return { open: kind === 'open', askedAt, linkId };
}

/**
 * The LIVE links naming the member, PAGE BY PAGE — unanswered first (the home card reads the first page), then answered,
 * each newest first: a keyset over `(answer IS NULL, asked_at, link_id)` DESC, `clampLimit`ed. ⛔ An ended or erased link;
 * ⛔ a link whose DECLARER a claim names as the deceased (V13 — the card would ask about a dead member's choice). A
 * malformed `cursor` ⇒ `NomineeLinkCursorInvalidError`. A read.
 */
export async function listNomineeLinkRequests(
  db: Db,
  input: { pariwarId: PariwarId; nomineeMemberId: MemberId; limit?: number | undefined; cursor?: string | undefined },
): Promise<NomineeLinkRequestsPage> {
  const limit = clampLimit(input.limit, NOMINEE_LINK_REQUESTS_LIMIT);
  let after = sql``;
  if (input.cursor !== undefined) {
    const c = decodeRequestsCursor(input.cursor);
    after = sql`AND (answer IS NULL, asked_at, link_id) < (${c.open}::boolean, ${c.askedAt}::timestamptz, ${c.linkId}::uuid)`;
  }
  const r = await db.execute<{
    link_id: string;
    answer: NomineeLinkAnswer | null;
    declarer_member_id: string;
    asked_at: Date | string;
    asked_at_us: string;
  }>(sql`
    SELECT link_id, answer, declarer_member_id, asked_at,
           to_char(asked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS asked_at_us
      FROM member_nominee_links
     WHERE pariwar_id = ${input.pariwarId} AND nominee_member_id = ${input.nomineeMemberId} AND state = 'live'
       AND NOT ${namedByClaimSql(sql`member_nominee_links.pariwar_id`, sql`member_nominee_links.declarer_member_id`)}
       ${after}
     ORDER BY (answer IS NULL) DESC, asked_at DESC, link_id DESC
     LIMIT ${limit + 1}`);
  const hasMore = r.rows.length > limit;
  const rows = r.rows.slice(0, limit);
  const last = rows[rows.length - 1];
  return {
    items: rows.map((row) => ({
      linkId: nomineeLinkId(row.link_id),
      answer: row.answer,
      declarerMemberId: toMemberId(row.declarer_member_id),
      askedAt: asDate(row.asked_at),
    })),
    hasMore,
    nextCursor: hasMore && last ? encodeRequestsCursor(last.answer === null, last.asked_at_us, last.link_id) : null,
  };
}

export type AnswerNomineeLinkResult =
  | { readonly kind: 'done'; readonly linkId: NomineeLinkId; readonly rank: NomineeRank; readonly answer: NomineeLinkAnswer }
  | { readonly kind: 'refused'; readonly reason: 'not_available' | 'not_found' | 'request_closed' };

/**
 * The marked member answers ONCE: `confirmed` ("Yes, that's me") or `not_me`, dated by the DB clock. The UPDATE is
 * `WHERE state = 'live' AND answer IS NULL` and ⛔ a declarer named by a claim as the deceased — 0 rows ⇒ `request_closed`
 * (a second answer, an ended link, a dead declarer — V13), or `not_found` when the link is ⛔ the member's. Under Q1 A the
 * answer changes ⛔ who is asked (NE7). ⛔ Lapse, ⛔ withdrawal (NE6).
 */
export async function answerNomineeLinkRequest(
  db: Db,
  input: { pariwarId: PariwarId; nomineeMemberId: MemberId; linkId: NomineeLinkId; answer: NomineeLinkAnswer },
): Promise<AnswerNomineeLinkResult> {
  const { pariwarId, nomineeMemberId, linkId, answer } = input;
  if (!(await isNomineeLinkAnswerer(db, pariwarId, nomineeMemberId))) return { kind: 'refused', reason: 'not_available' };
  const r = await db.execute<{ link_id: string; rank: number; answer: NomineeLinkAnswer }>(sql`
    UPDATE member_nominee_links SET answer = ${answer}, responded_at = clock_timestamp()
     WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND nominee_member_id = ${nomineeMemberId}
       AND state = 'live' AND answer IS NULL
       AND NOT ${namedByClaimSql(sql`member_nominee_links.pariwar_id`, sql`member_nominee_links.declarer_member_id`)}
    RETURNING link_id, rank, answer`);
  const row = r.rows[0];
  if (row) return { kind: 'done', linkId: nomineeLinkId(row.link_id), rank: row.rank as NomineeRank, answer: row.answer };
  const exists = await db.execute(sql`
    SELECT 1 FROM member_nominee_links WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND nominee_member_id = ${nomineeMemberId}`);
  return { kind: 'refused', reason: exists.rows.length === 0 ? 'not_found' : 'request_closed' };
}

// ── Erasure and export (NE10) ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * The erasure arm (`anonymizeMember`): every LIVE link where the member is the DECLARER or the NOMINEE becomes `erased` — ⛔
 * deleted. An already-ended row keeps its write-once end (V21); an answered row keeps its answer (V1). ONE statement.
 */
export async function eraseNomineeLinks(db: Db, input: { pariwarId: PariwarId; memberId: MemberId }): Promise<void> {
  // The builder form (⛔ raw SQL) so the rtbf statement pin (`tests/member/rtbf-anonymize.test.ts`) captures it by table.
  await db
    .update(memberNomineeLinks)
    .set({ state: 'erased', endedAt: sql`clock_timestamp()`, endReason: 'erased' })
    .where(
      and(
        eq(memberNomineeLinks.pariwarId, input.pariwarId),
        or(eq(memberNomineeLinks.declarerMemberId, input.memberId), eq(memberNomineeLinks.nomineeMemberId, input.memberId)),
        eq(memberNomineeLinks.state, 'live'),
      ),
    );
}

export interface NomineeLinkExportRow {
  readonly rank: NomineeRank;
  /** The version the link hangs off — joinable to the export's `nomineeHistory[]` by `(rank, versionNo)`. */
  readonly versionNo: number;
  readonly state: NomineeLinkState;
  readonly answer: NomineeLinkAnswer | null;
  readonly askedAt: Date;
  /** The OTHER member of the link (the marked member for `marked`, the declarer for `namedBy`) — the name source. */
  readonly otherMemberId: MemberId;
}

/** The data export's two lists (NE10): the marks the member MADE (every row, any state) and the marks NAMING them. */
export async function getNomineeLinksForExport(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId },
): Promise<{ marked: NomineeLinkExportRow[]; namedBy: NomineeLinkExportRow[] }> {
  const r = await db.execute<{
    rank: number;
    version_no: number;
    state: NomineeLinkState;
    answer: NomineeLinkAnswer | null;
    asked_at: Date | string;
    declarer_member_id: string;
    nominee_member_id: string;
  }>(sql`
    SELECT l.rank, v.version_no, l.state, l.answer, l.asked_at, l.declarer_member_id, l.nominee_member_id
      FROM member_nominee_links l
      JOIN member_nominee_versions v ON v.version_id = l.version_id
     WHERE l.pariwar_id = ${input.pariwarId}
       AND (l.declarer_member_id = ${input.memberId} OR l.nominee_member_id = ${input.memberId})
     ORDER BY l.asked_at, l.rank, v.version_no, l.link_id`); // one save's marks share `asked_at`: by rank, ⛔ by a random id
  const marked: NomineeLinkExportRow[] = [];
  const namedBy: NomineeLinkExportRow[] = [];
  for (const row of r.rows) {
    const asDeclarer = row.declarer_member_id === input.memberId;
    const out: NomineeLinkExportRow = {
      rank: row.rank as NomineeRank,
      versionNo: row.version_no,
      state: row.state,
      answer: row.answer,
      askedAt: asDate(row.asked_at),
      otherMemberId: toMemberId(asDeclarer ? row.nominee_member_id : row.declarer_member_id),
    };
    (asDeclarer ? marked : namedBy).push(out);
  }
  return { marked, namedBy };
}

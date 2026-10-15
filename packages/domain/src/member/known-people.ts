// PEOPLE WHO KNOW ME — the domain (Story 6.36b, Task 2; 6.36a SW10–SW14, SW17, I4–I6; `-310` CF4 A (2), CF5 A; `-309`).
//
// A member names up to THREE other `active` members of their Pariwar — found from the phone's contacts (or the iOS picker,
// or a typed number) — and each named member says yes or no in the app. Only ACCEPTED ones count (6.36 reads them to
// choose who is asked when no colleague can be). This module holds:
//   · the ONE eligibility predicate for matching AND asking (`knownPersonEligibleSql`) — ⛔ the selection's (6.36 SW23
//     adds the identity row and the claimant): two named functions so neither drifts into the other;
//   · the counters (IST days; charged in a short transaction BEFORE any HMAC — a refused request costs ⛔ no KMS call);
//   · matching: the positions of the caller's numbers that are an eligible member of the CALLER'S Pariwar — ⛔ an id, ⛔ a
//     name, ⛔ a count beyond the positions; ⛔ nothing written but the counters;
//   · the writers — ask (under the namer's advisory lock: lapse stale asks, the re-ask rule, the three-live cap, insert),
//     answer, remove, withdraw — and the two lists, with the derived labels;
//   · the erasure arm (`eraseKnownPeopleLinks`, called by `anonymizeMember`) and the export reads.
//
// ⭐ ⛔ NO NUMBER ANYWHERE (I4): the functions here take blind indexes (or canonical numbers to HMAC), ⛔ never store,
// return or log a number; the domain errors carry ⛔ no value. Names are ⛔ never read here — the handler resolves the
// registered names AFTER the read transaction commits (⛔ no KMS under a lock).
// ⭐ The namer's lock is `member_known_people_lock_namer` (0162) — the SAME function 0162's backstop trigger calls, so the
// key cannot drift. ⛔ Never a `FOR UPDATE` on `members` (two members naming each other would deadlock against the
// insert's FK check — 40P01).

import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import { mobileBlindIndexMany, normalizeMobile } from '../encryption/member-fields.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { knownPersonLinkId, memberId as toMemberId, type KnownPersonLinkId, type MemberId, type PariwarId } from '../ids/index.js';
import { memberKnownPeople, type KnownPeopleFoundBy, type KnownPeopleLinkState } from '../schema/member_known_people.js';
import type { MemberDailyCounter } from '../schema/member_daily_counters.js';

// ── The rules (6.36a SW10 / SW12) ────────────────────────────────────────────────────────────────────────────────────

/** At most this many LIVE (asked within 30 days, or accepted) named people per member (I6). */
export const KNOWN_PEOPLE_MAX_LIVE = 3;
/** A request lapses this many days after `asked_at` (its `ended_at` = `asked_at` + 30 days). */
export const KNOWN_PEOPLE_ANSWER_WINDOW_DAYS = 30;
/** A declined, lapsed or withdrawn link may be asked again only from its `ended_at` + 60 days (⛔ a removed one). */
export const KNOWN_PEOPLE_REASK_AFTER_DAYS = 60;
/** The namer sees *"Not accepted"* for this many days after the link ended, then ⛔ not at all. */
export const KNOWN_PEOPLE_NOT_ACCEPTED_SHOWN_DAYS = 30;
/** At most this many numbers in ONE matching request. */
export const CONTACT_MATCH_MAX_NUMBERS = 1000;
/** Each number ≤ 32 characters on the wire. */
export const CONTACT_MATCH_MAX_ENTRY_LENGTH = 32;
/** Matching requests per member per IST day. */
export const CONTACT_MATCH_REQUESTS_PER_DAY = 3;
/** Numbers matched per member per rolling 30 IST days. */
export const CONTACT_MATCH_NUMBERS_PER_30_DAYS = 2000;
/** Numbers matched per Pariwar per IST day. */
export const CONTACT_MATCH_PARIWAR_NUMBERS_PER_DAY = 100_000;
/** Asks (name requests) per member per IST day. */
export const KNOWN_PEOPLE_ASKS_PER_DAY = 10;
/** The namer's list: how many ENDED links (`not_accepted`) it shows — ⛔ a bound on the live ones (review 2026-10-15 R2). */
export const KNOWN_PEOPLE_HISTORY_LIMIT = { default: 50, cap: 50 } as const;
/** The requests naming the member: one page (review 2026-10-15 R3 — every link reachable by its cursor). */
export const KNOWN_PEOPLE_REQUESTS_LIMIT = { default: 50, cap: 50 } as const;
/** The batch HMAC line's purpose (rides the KMS audit line's row key). */
export const CONTACT_MATCH_AUDIT_PURPOSE = 'contact_match';
/** A single ask's HMAC is one number — audited through the SAME batch path, so it carries a purpose too. */
export const KNOWN_PEOPLE_ASK_AUDIT_PURPOSE = 'known_people_ask';

/** The IST day, by the DB's clock. ⛔ Never the UTC date. */
const IST_TODAY = sql`(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date`;

// ── The ONE eligibility predicate for matching and asking ───────────────────────────────────────────────────────────

/**
 * ONE predicate for who may be MATCHED or ASKED (I5): an `active` member (`m` — a `members` row in the caller's scope) ·
 * ⛔ a claim (in any state) naming them as the deceased · ⛔ the caller. An erased (`anonymized`), withdrawn or
 * pending member is ⛔ never `active`; erasure RETAINS the blind index, so this join is what keeps an erased member out
 * (SF9). ⚠ ⛔ NOT the selection's predicate (6.36 SW23 adds the identity row and the claimant) — keep them two.
 */
export function knownPersonEligibleSql(m: SQL, callerMemberId: MemberId): SQL {
  return sql`(${m}.state = 'active'
    AND ${m}.member_id <> ${callerMemberId}
    AND NOT EXISTS (SELECT 1 FROM claims kp_c WHERE kp_c.pariwar_id = ${m}.pariwar_id AND kp_c.deceased_member_id = ${m}.member_id))`;
}

/** Only an `active` member may match, ask, answer or read (6.36a SW10; AC10). */
export async function isActiveMember(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<boolean> {
  const r = await db.execute<{ ok: boolean }>(
    sql`SELECT true AS ok FROM members WHERE pariwar_id = ${pariwarId} AND member_id = ${memberId} AND state = 'active'`,
  );
  return r.rows.length === 1;
}

// ── Counters ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Take the namer's advisory lock (0162's ONE lock function — the backstop takes the same key). Transaction-scoped. */
export async function lockKnownPeopleNamer(db: Db, namerMemberId: MemberId): Promise<void> {
  await db.execute(sql`SELECT member_known_people_lock_namer(${namerMemberId})`);
}

/** Atomically add `n` to a member's IST-day counter if the result stays ≤ `cap`. `false` ⇒ refused (the row unchanged). */
async function chargeMemberCounter(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  counter: MemberDailyCounter,
  n: number,
  cap: number,
): Promise<boolean> {
  const r = await db.execute<{ count: number }>(sql`
    INSERT INTO member_daily_counters AS c (pariwar_id, member_id, counter, day, count)
      SELECT ${pariwarId}, ${memberId}, ${counter}, ${IST_TODAY}, ${n}::int WHERE ${n}::int <= ${cap}::int
    ON CONFLICT (pariwar_id, member_id, counter, day) DO UPDATE SET count = c.count + EXCLUDED.count
      WHERE c.count + EXCLUDED.count <= ${cap}::int
    RETURNING count`);
  return r.rows.length === 1;
}

async function chargePariwarNumbers(db: Db, pariwarId: PariwarId, n: number): Promise<boolean> {
  const r = await db.execute<{ count: number }>(sql`
    INSERT INTO pariwar_daily_counters AS c (pariwar_id, counter, day, count)
      SELECT ${pariwarId}, 'contact_match_numbers', ${IST_TODAY}, ${n}::int WHERE ${n}::int <= ${CONTACT_MATCH_PARIWAR_NUMBERS_PER_DAY}::int
    ON CONFLICT (pariwar_id, counter, day) DO UPDATE SET count = c.count + EXCLUDED.count
      WHERE c.count + EXCLUDED.count <= ${CONTACT_MATCH_PARIWAR_NUMBERS_PER_DAY}::int
    RETURNING count`);
  return r.rows.length === 1;
}

/** Why a request was refused before any HMAC. Each maps to ONE code (`known_people.*`). */
export type KnownPeopleRefusal = 'not_available' | 'daily_limit' | 'monthly_limit' | 'busy';

/**
 * Charge a matching request — run it in a SHORT scoped transaction BEFORE any HMAC; a refusal leaves EVERY counter as it
 * was (the caller rolls the transaction back). Order: the caller must be `active` (⛔ a counter is charged for a
 * non-active caller) → the request counter (3 a day) → the namer's lock, then the rolling 30-day numbers sum (2,000) →
 * the Pariwar's numbers (100,000 a day). `numbers` is the count of DISTINCT normalised numbers (each costs one HMAC).
 */
export async function chargeContactMatch(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId; numbers: number },
): Promise<{ ok: true } | { ok: false; reason: KnownPeopleRefusal }> {
  const { pariwarId, memberId, numbers } = input;
  if (!(await isActiveMember(db, pariwarId, memberId))) return { ok: false, reason: 'not_available' };
  if (!(await chargeMemberCounter(db, pariwarId, memberId, 'contact_match_requests', 1, CONTACT_MATCH_REQUESTS_PER_DAY))) {
    return { ok: false, reason: 'daily_limit' };
  }
  if (numbers === 0) return { ok: true };
  await lockKnownPeopleNamer(db, memberId);
  const sum = await db.execute<{ total: string | number }>(sql`
    SELECT coalesce(sum(count), 0) AS total FROM member_daily_counters
     WHERE pariwar_id = ${pariwarId} AND member_id = ${memberId} AND counter = 'contact_match_numbers'
       AND day > ${IST_TODAY} - ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int`);
  if (Number(sum.rows[0]?.total ?? 0) + numbers > CONTACT_MATCH_NUMBERS_PER_30_DAYS) return { ok: false, reason: 'monthly_limit' };
  await chargeMemberCounter(db, pariwarId, memberId, 'contact_match_numbers', numbers, CONTACT_MATCH_NUMBERS_PER_30_DAYS);
  if (!(await chargePariwarNumbers(db, pariwarId, numbers))) return { ok: false, reason: 'busy' };
  return { ok: true };
}

/** Charge an ask (10 a day) — a short scoped transaction BEFORE the HMAC. The caller must be `active`. */
export async function chargeKnownPersonAsk(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId },
): Promise<{ ok: true } | { ok: false; reason: 'not_available' | 'daily_limit' }> {
  if (!(await isActiveMember(db, input.pariwarId, input.memberId))) return { ok: false, reason: 'not_available' };
  if (!(await chargeMemberCounter(db, input.pariwarId, input.memberId, 'known_people_ask', 1, KNOWN_PEOPLE_ASKS_PER_DAY))) {
    return { ok: false, reason: 'daily_limit' };
  }
  return { ok: true };
}

// ── Matching (AC3) ──────────────────────────────────────────────────────────────────────────────────────────────────

/** The entries that normalise, each with the position(s) it came from — distinct numbers only (one HMAC each). */
export interface NormalisedContactNumbers {
  /** Distinct canonical numbers (`+91XXXXXXXXXX`), in first-seen order. ⛔ Never logged. */
  readonly distinct: readonly string[];
  /** For each distinct number, the positions of the submitted entries that normalised to it. */
  readonly positions: readonly (readonly number[])[];
}

/** Re-normalise each submitted entry with `normalizeMobile` (an entry that does ⛔ not normalise simply does ⛔ not match). */
export function normaliseContactNumbers(entries: readonly string[]): NormalisedContactNumbers {
  const index = new Map<string, number>();
  const distinct: string[] = [];
  const positions: number[][] = [];
  entries.forEach((raw, i) => {
    const canonical = normalizeMobile(raw);
    if (canonical === null) return;
    const at = index.get(canonical);
    if (at === undefined) {
      index.set(canonical, distinct.length);
      distinct.push(canonical);
      positions.push([i]);
    } else {
      positions[at]!.push(i);
    }
  });
  return { distinct, positions };
}

/**
 * The blind indexes of the distinct numbers — the batch path: OUTSIDE any transaction, ≤ 8 KMS calls in flight per
 * process, ONE audit line (`kms.compute_hmac`, the caller's Pariwar, `contact_match:n=<count>`).
 */
export async function contactMatchIndexes(
  normalised: NormalisedContactNumbers,
  enc: FieldCryptoDeps,
  callerPariwarId: PariwarId,
): Promise<string[]> {
  return mobileBlindIndexMany(normalised.distinct, enc, { pariwarId: callerPariwarId, purpose: CONTACT_MATCH_AUDIT_PURPOSE });
}

/**
 * ONE query, inside the CALLER'S scope (RLS + the explicit `pariwar_id` — ⛔ the `servicePool` pre-scope lookup, which
 * crosses Pariwars, SF9 / I5): which of `indexes` belong to an ELIGIBLE member of the caller's Pariwar. Returns the
 * submitted POSITIONS that matched, ascending — ⛔ an id, ⛔ a name. Writes ⛔ nothing.
 */
export async function matchedContactPositions(
  db: Db,
  input: { pariwarId: PariwarId; callerMemberId: MemberId; normalised: NormalisedContactNumbers; indexes: readonly string[] },
): Promise<number[]> {
  const { pariwarId, callerMemberId, normalised, indexes } = input;
  if (indexes.length !== normalised.distinct.length) throw new Error('matchedContactPositions: one index per distinct number');
  if (indexes.length === 0) return [];
  const r = await db.execute<{ idx: string }>(sql`
    SELECT mi.mobile_blind_index AS idx
      FROM member_identities mi
      JOIN members m ON m.member_id = mi.member_id AND m.pariwar_id = mi.pariwar_id
     WHERE mi.pariwar_id = ${pariwarId}
       AND mi.mobile_blind_index = ANY(${sql.param([...indexes])}::text[])
       AND ${knownPersonEligibleSql(sql`m`, callerMemberId)}`);
  const hit = new Set(r.rows.map((row) => row.idx));
  const out: number[] = [];
  indexes.forEach((idx, d) => {
    if (hit.has(idx)) out.push(...normalised.positions[d]!);
  });
  return out.sort((a, b) => a - b);
}

/**
 * Thrown INSIDE a charging transaction so the caller's scope rolls it back (a refusal moves ⛔ no counter), and caught
 * outside it. Carries ONLY the reason — ⛔ a value.
 */
export class KnownPeopleChargeRefused extends Error {
  constructor(readonly reason: KnownPeopleRefusal) {
    super(`known_people charge refused: ${reason}`);
    this.name = 'KnownPeopleChargeRefused';
  }
}

/** Run `fn` in its OWN short transaction, scoped to the caller's Pariwar (the handler supplies it — ⛔ held across calls). */
export type InScope = <T>(fn: (db: Db) => Promise<T>) => Promise<T>;

export type MatchContactNumbersResult =
  | { readonly kind: 'matched'; readonly positions: number[]; readonly submitted: number; readonly checked: number }
  | { readonly kind: 'refused'; readonly reason: KnownPeopleRefusal };

/**
 * Contact matching end to end (AC3): normalise → CHARGE the counters in one short scoped transaction (a refusal costs ⛔
 * no KMS call) → the batch HMACs OUTSIDE any transaction (one audit line) → ONE scoped query → the matched POSITIONS.
 * `checked` is the number of distinct normalised numbers (each one HMAC). ⛔ Nothing is written but the counters.
 */
export async function matchContactNumbers(input: {
  pariwarId: PariwarId;
  callerMemberId: MemberId;
  numbers: readonly string[];
  enc: FieldCryptoDeps;
  inScope: InScope;
}): Promise<MatchContactNumbersResult> {
  const { pariwarId, callerMemberId, numbers, enc, inScope } = input;
  const normalised = normaliseContactNumbers(numbers);
  try {
    await inScope(async (db) => {
      const charged = await chargeContactMatch(db, { pariwarId, memberId: callerMemberId, numbers: normalised.distinct.length });
      // THROW so the scope ROLLS BACK — a refused request leaves every counter as it was.
      if (!charged.ok) throw new KnownPeopleChargeRefused(charged.reason);
    });
  } catch (err) {
    if (err instanceof KnownPeopleChargeRefused) return { kind: 'refused', reason: err.reason };
    throw err;
  }
  const indexes = await contactMatchIndexes(normalised, enc, pariwarId);
  const positions = await inScope((db) => matchedContactPositions(db, { pariwarId, callerMemberId, normalised, indexes }));
  return { kind: 'matched', positions, submitted: numbers.length, checked: normalised.distinct.length };
}

// ── Asking (AC5) ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface KnownPersonLink {
  readonly linkId: KnownPersonLinkId;
  readonly namedMemberId: MemberId;
  readonly state: KnownPeopleLinkState;
  readonly askedAt: Date;
}

export type AskKnownPersonResult =
  | { readonly kind: 'created'; readonly link: KnownPersonLink }
  | { readonly kind: 'existing'; readonly link: KnownPersonLink }
  | { readonly kind: 'refused'; readonly reason: 'not_available' | 'not_a_member' | 'self' | 'cannot_ask_now' | 'limit_reached' };

type LinkRow = {
  link_id: string;
  namer_member_id: string;
  named_member_id: string;
  state: KnownPeopleLinkState;
  asked_at: Date | string;
  responded_at: Date | string | null;
  ended_at: Date | string | null;
};

const asDate = (v: Date | string): Date => (v instanceof Date ? v : new Date(v));

function toLink(row: LinkRow): KnownPersonLink {
  return {
    linkId: knownPersonLinkId(row.link_id),
    namedMemberId: toMemberId(row.named_member_id),
    state: row.state,
    askedAt: asDate(row.asked_at),
  };
}

/**
 * Record the lapse of a member's stale `asked` links — dated `asked_at + 30 days` (⛔ the moment it is noticed). `as`:
 * the member's role. Lazy (⛔ no job): the writers call it first, so the backstop's count is exact.
 */
export async function lapseStaleKnownPeopleRequests(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId; as: 'namer' | 'named' | 'either' },
): Promise<number> {
  const who =
    input.as === 'namer'
      ? sql`namer_member_id = ${input.memberId}`
      : input.as === 'named'
        ? sql`named_member_id = ${input.memberId}`
        : sql`(namer_member_id = ${input.memberId} OR named_member_id = ${input.memberId})`;
  const r = await db.execute(sql`
    UPDATE member_known_people SET state = 'lapsed', ended_at = asked_at + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int)
     WHERE pariwar_id = ${input.pariwarId} AND ${who} AND state = 'asked'
       AND asked_at + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int) <= clock_timestamp()`);
  return r.rowCount ?? 0;
}

/**
 * Ask the member behind `namedIndex` (a mobile blind index, computed OUTSIDE the transaction) to accept. Run INSIDE the
 * namer's scoped transaction, AFTER `chargeKnownPersonAsk` committed. Steps: the caller is `active` → the namer's lock →
 * lapse the namer's stale asks → resolve the number (oneself ⇒ `self`; ⛔ an eligible member of THIS Pariwar ⇒
 * `not_a_member` — ONE answer for not-a-member, erased, withdrawn, reported-dead and another Pariwar's) → a LIVE link to
 * them ⇒ `existing` → the re-ask rule (the last DECLINED, LAPSED or WITHDRAWN link's `ended_at` + 60 days — ⛔ a removed
 * one) → the three-live cap → insert. ⛔ The number is never stored.
 */
export async function askKnownPerson(
  db: Db,
  input: { pariwarId: PariwarId; namerMemberId: MemberId; namedIndex: string | null; foundBy: KnownPeopleFoundBy },
): Promise<AskKnownPersonResult> {
  const { pariwarId, namerMemberId, namedIndex, foundBy } = input;
  if (!(await isActiveMember(db, pariwarId, namerMemberId))) return { kind: 'refused', reason: 'not_available' };
  await lockKnownPeopleNamer(db, namerMemberId);
  await lapseStaleKnownPeopleRequests(db, { pariwarId, memberId: namerMemberId, as: 'namer' });

  if (namedIndex === null) return { kind: 'refused', reason: 'not_a_member' };
  const self = await db.execute(sql`
    SELECT 1 FROM member_identities WHERE pariwar_id = ${pariwarId} AND member_id = ${namerMemberId} AND mobile_blind_index = ${namedIndex}`);
  if (self.rows.length > 0) return { kind: 'refused', reason: 'self' };
  const found = await db.execute<{ member_id: string }>(sql`
    SELECT m.member_id FROM member_identities mi
      JOIN members m ON m.member_id = mi.member_id AND m.pariwar_id = mi.pariwar_id
     WHERE mi.pariwar_id = ${pariwarId} AND mi.mobile_blind_index = ${namedIndex}
       AND ${knownPersonEligibleSql(sql`m`, namerMemberId)}`);
  const namedId = found.rows[0]?.member_id;
  if (namedId === undefined) return { kind: 'refused', reason: 'not_a_member' };
  const named = toMemberId(namedId);

  const live = await db.execute<LinkRow>(sql`
    SELECT * FROM member_known_people
     WHERE pariwar_id = ${pariwarId} AND namer_member_id = ${namerMemberId} AND named_member_id = ${named}
       AND state IN ('asked', 'accepted')`);
  if (live.rows[0]) return { kind: 'existing', link: toLink(live.rows[0]) };

  const cooldown = await db.execute(sql`
    SELECT 1 FROM member_known_people
     WHERE pariwar_id = ${pariwarId} AND namer_member_id = ${namerMemberId} AND named_member_id = ${named}
       AND state IN ('declined', 'lapsed', 'withdrawn')
       AND ended_at + make_interval(days => ${KNOWN_PEOPLE_REASK_AFTER_DAYS}::int) > clock_timestamp()`);
  if (cooldown.rows.length > 0) return { kind: 'refused', reason: 'cannot_ask_now' };

  const count = await db.execute<{ n: string | number }>(sql`
    SELECT count(*) AS n FROM member_known_people
     WHERE pariwar_id = ${pariwarId} AND namer_member_id = ${namerMemberId} AND state IN ('asked', 'accepted')`);
  if (Number(count.rows[0]?.n ?? 0) >= KNOWN_PEOPLE_MAX_LIVE) return { kind: 'refused', reason: 'limit_reached' };

  const ins = await db.execute<LinkRow>(sql`
    INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by)
    VALUES (${pariwarId}, ${namerMemberId}, ${named}, ${foundBy})
    RETURNING *`);
  return { kind: 'created', link: toLink(ins.rows[0]!) };
}

// ── The namer's list (AC7) ──────────────────────────────────────────────────────────────────────────────────────────

/** What the namer's list shows per link (the contract's label enum). */
export type KnownPersonLabel = 'asked' | 'accepted' | 'not_accepted' | 'unavailable';

export interface MyKnownPerson {
  readonly linkId: KnownPersonLinkId;
  readonly label: KnownPersonLabel;
  /** ONLY for `accepted` — the handler resolves the registered name from it (⛔ ever on the wire). */
  readonly namedMemberId: MemberId | null;
  readonly askedAt: Date;
}

export interface MyKnownPeople {
  readonly items: readonly MyKnownPerson[];
  readonly freeSlots: number;
}

/**
 * The namer's list. Per link (6.36a SW14):
 *   · `asked` (within 30 days of `asked_at`) — ⛔ a name (the app shows the name the member SAVED);
 *   · `accepted` — the registered name (resolved by the handler); `unavailable` when the named person has withdrawn from
 *     the Trust or had a claim filed for their death — ⛔ a name, ⛔ why (the two read the SAME), the slot kept; a late
 *     renewal (`active-in-grace`, `lapsed-unpaid`) is ⛔ never `unavailable`;
 *   · `not_accepted` — for 30 days from the link's end: at once after a decline or a withdrawal, at `asked_at` + 30 days
 *     after a lapse (an unrecorded stale `asked` row reads as lapsed) — then ⛔ not at all;
 *   · `removed` / `erased` — ⛔ shown (an erased person's row vanishes: they left the Trust — ⛔ never that they died).
 * `freeSlots` = 3 − (live `asked` + `accepted`, `unavailable` included). A read — ⛔ writes nothing.
 * ⭐ EVERY live link is listed and counted; `historyLimit` bounds ONLY the `not_accepted` rows (newest first). One
 * `LIMIT` over both once let ⛔ 50 newer declines push an older accepted link — and its Remove control — off the list and
 * miscount `freeSlots` (review 2026-10-15 R2). The live set needs ⛔ bound: the DB holds at most three per namer (0162's
 * backstop on INSERT; the guard lets ⛔ ended row return to `asked` / `accepted`).
 */
export async function listMyKnownPeople(
  db: Db,
  input: { pariwarId: PariwarId; namerMemberId: MemberId; historyLimit?: number | undefined },
): Promise<MyKnownPeople> {
  const { pariwarId, namerMemberId } = input;
  const historyLimit = clampLimit(input.historyLimit, KNOWN_PEOPLE_HISTORY_LIMIT);
  const window = sql`make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int)`;
  const shown = sql`make_interval(days => ${KNOWN_PEOPLE_NOT_ACCEPTED_SHOWN_DAYS}::int)`;
  const r = await db.execute<{
    link_id: string;
    named_member_id: string;
    asked_at: Date | string;
    label: KnownPersonLabel;
  }>(sql`
    WITH shown AS (
      SELECT k.link_id, k.named_member_id, k.asked_at,
        CASE
          WHEN k.state = 'asked' AND k.asked_at + ${window} > clock_timestamp() THEN 'asked'
          WHEN k.state = 'accepted' AND (m.state = 'withdrawn'
                OR EXISTS (SELECT 1 FROM claims c WHERE c.pariwar_id = k.pariwar_id AND c.deceased_member_id = k.named_member_id))
            THEN 'unavailable'
          WHEN k.state = 'accepted' THEN 'accepted'
          ELSE 'not_accepted'
        END AS label
        FROM member_known_people k
        JOIN members m ON m.member_id = k.named_member_id AND m.pariwar_id = k.pariwar_id
       WHERE k.pariwar_id = ${pariwarId} AND k.namer_member_id = ${namerMemberId}
         AND (
           k.state = 'accepted'
           OR (k.state = 'asked' AND k.asked_at + ${window} + ${shown} > clock_timestamp())
           OR (k.state IN ('declined', 'lapsed', 'withdrawn') AND k.ended_at + ${shown} > clock_timestamp())
         )
    )
    SELECT * FROM shown WHERE label <> 'not_accepted'
    UNION ALL
    (SELECT * FROM shown WHERE label = 'not_accepted' ORDER BY asked_at DESC, link_id LIMIT ${historyLimit})
    ORDER BY asked_at DESC, link_id`);
  const items: MyKnownPerson[] = r.rows.map((row) => ({
    linkId: knownPersonLinkId(row.link_id),
    label: row.label,
    namedMemberId: row.label === 'accepted' ? toMemberId(row.named_member_id) : null,
    askedAt: asDate(row.asked_at),
  }));
  const live = items.filter((i) => i.label !== 'not_accepted').length;
  return { items, freeSlots: Math.max(0, KNOWN_PEOPLE_MAX_LIVE - live) };
}

// ── The named member's requests (AC6, AC8) ──────────────────────────────────────────────────────────────────────────

export interface RequestNamingMe {
  readonly linkId: KnownPersonLinkId;
  /** `asked` — open, answerable (the home card); `accepted` — kept in the list (the withdraw entry). */
  readonly state: 'asked' | 'accepted';
  /** The namer — the handler resolves the registered name from it (⛔ ever on the wire). */
  readonly namerMemberId: MemberId;
  readonly askedAt: Date;
}

export interface RequestsNamingMePage {
  readonly items: readonly RequestNamingMe[];
  readonly hasMore: boolean;
  /** Opaque — the next page's `cursor`; `null` on the last page. */
  readonly nextCursor: string | null;
}

/** A malformed page cursor (a client bug or tampering — the route answers 400). Carries ⛔ the value. */
export class KnownPeopleCursorInvalidError extends Error {
  public constructor() {
    super('[known-people] the page cursor is not one this server issued');
    this.name = 'KnownPeopleCursorInvalidError';
  }
}

/** A cursor's `asked_at` — UTC, ALWAYS six fractional digits (µs — compared in SQL, exactly). */
const CURSOR_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const CURSOR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `true` for a REAL instant on or after 1970: the shape, then the millisecond part must survive a round trip through
 * `Date` (⛔ 30 February, ⛔ `T24:00` — `Date.parse` rolls both over) — a forged value that reached the `::timestamptz`
 * cast would die as a 22008, a 500 instead of the route's 400 (6.36a's posting cursor, review 2026-10-15 R2-4).
 */
function isCursorInstant(value: string): boolean {
  if (!CURSOR_AT_RE.test(value) || Number(value.slice(0, 4)) < 1970) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === `${value.slice(0, 23)}Z`;
}

function encodeRequestsCursor(open: boolean, askedAtUs: string, linkId: string): string {
  return Buffer.from(JSON.stringify([open ? 'open' : 'accepted', askedAtUs, linkId]), 'utf8').toString('base64url');
}

function decodeRequestsCursor(cursor: string): { open: boolean; askedAt: string; linkId: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new KnownPeopleCursorInvalidError();
  }
  if (!Array.isArray(parsed) || parsed.length !== 3 || !parsed.every((p) => typeof p === 'string')) throw new KnownPeopleCursorInvalidError();
  const [kind, askedAt, linkId] = parsed as [string, string, string];
  if ((kind !== 'open' && kind !== 'accepted') || !isCursorInstant(askedAt) || !CURSOR_ID_RE.test(linkId)) {
    throw new KnownPeopleCursorInvalidError();
  }
  return { open: kind === 'open', askedAt, linkId };
}

/**
 * The requests naming the member, PAGE BY PAGE: open `asked` ones (within 30 days of `asked_at`) and ACCEPTED ones. A
 * declined or lapsed request (an `asked` row past 30 days counts as lapsed), a removed, withdrawn or erased one ⛔ shown.
 * Order: OPEN asks first (answerable — the home card reads the first page), then accepted ones (the withdraw entry), each
 * newest first — a keyset over `(open, asked_at, link_id)` DESC, `clampLimit`ed. ⭐ Every link is reachable: accepted
 * links have ⛔ per-member cap, and a fixed first page hid the oldest ones' withdraw control (review 2026-10-15 R3).
 * A malformed `cursor` ⇒ `KnownPeopleCursorInvalidError`. A read.
 */
export async function listRequestsNamingMe(
  db: Db,
  input: { pariwarId: PariwarId; namedMemberId: MemberId; limit?: number | undefined; cursor?: string | undefined },
): Promise<RequestsNamingMePage> {
  const limit = clampLimit(input.limit, KNOWN_PEOPLE_REQUESTS_LIMIT);
  let after = sql``;
  if (input.cursor !== undefined) {
    const c = decodeRequestsCursor(input.cursor);
    after = sql`AND (state = 'asked', asked_at, link_id) < (${c.open}::boolean, ${c.askedAt}::timestamptz, ${c.linkId}::uuid)`;
  }
  const r = await db.execute<{
    link_id: string;
    state: 'asked' | 'accepted';
    namer_member_id: string;
    asked_at: Date | string;
    asked_at_us: string;
  }>(sql`
    SELECT link_id, state, namer_member_id, asked_at,
           to_char(asked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS asked_at_us
      FROM member_known_people
     WHERE pariwar_id = ${input.pariwarId} AND named_member_id = ${input.namedMemberId}
       AND (state = 'accepted'
         OR (state = 'asked' AND asked_at + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int) > clock_timestamp()))
       ${after}
     ORDER BY (state = 'asked') DESC, asked_at DESC, link_id DESC
     LIMIT ${limit + 1}`);
  const hasMore = r.rows.length > limit;
  const rows = r.rows.slice(0, limit);
  const last = rows[rows.length - 1];
  return {
    items: rows.map((row) => ({
      linkId: knownPersonLinkId(row.link_id),
      state: row.state,
      namerMemberId: toMemberId(row.namer_member_id),
      askedAt: asDate(row.asked_at),
    })),
    hasMore,
    nextCursor: hasMore && last ? encodeRequestsCursor(last.state === 'asked', last.asked_at_us, last.link_id) : null,
  };
}

// ── Answer, remove, withdraw ────────────────────────────────────────────────────────────────────────────────────────

export type KnownPersonWriteResult =
  | { readonly kind: 'done'; readonly state: KnownPeopleLinkState; readonly namerMemberId: MemberId; readonly namedMemberId: MemberId }
  | { readonly kind: 'refused'; readonly reason: 'not_available' | 'not_found' | 'request_closed' };

function done(row: LinkRow): KnownPersonWriteResult {
  return { kind: 'done', state: row.state, namerMemberId: toMemberId(row.namer_member_id), namedMemberId: toMemberId(row.named_member_id) };
}

/**
 * The named member answers: `accept` ⇒ `accepted`, `decline` ⇒ `declined` (both dated by the DB clock). A request past
 * `asked_at` + 30 days (lapsed, recorded or ⛔ not) or already answered ⇒ `request_closed`; ⛔ the member's ⇒ `not_found`.
 * An accept is live → live and is ⛔ never refused by the cap.
 */
export async function answerKnownPersonRequest(
  db: Db,
  input: { pariwarId: PariwarId; namedMemberId: MemberId; linkId: KnownPersonLinkId; answer: 'accept' | 'decline' },
): Promise<KnownPersonWriteResult> {
  const { pariwarId, namedMemberId, linkId, answer } = input;
  if (!(await isActiveMember(db, pariwarId, namedMemberId))) return { kind: 'refused', reason: 'not_available' };
  const set =
    answer === 'accept'
      ? sql`state = 'accepted', responded_at = clock_timestamp()`
      : sql`state = 'declined', responded_at = clock_timestamp(), ended_at = clock_timestamp()`;
  const r = await db.execute<LinkRow>(sql`
    UPDATE member_known_people SET ${set}
     WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND named_member_id = ${namedMemberId}
       AND state = 'asked' AND asked_at + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int) > clock_timestamp()
    RETURNING *`);
  if (r.rows[0]) return done(r.rows[0]);
  const exists = await db.execute(sql`
    SELECT 1 FROM member_known_people WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND named_member_id = ${namedMemberId}`);
  if (exists.rows.length === 0) return { kind: 'refused', reason: 'not_found' };
  await lapseStaleKnownPeopleRequests(db, { pariwarId, memberId: namedMemberId, as: 'named' });
  return { kind: 'refused', reason: 'request_closed' };
}

/**
 * The namer removes a LIVE link (`asked` within 30 days, or `accepted` — `unavailable` included) ⇒ `removed`. The named
 * member gets ⛔ no message (the link leaves their list — recorded, 6.36a SW14 (4)). Under the namer's lock. Anything
 * else (ended, stale, ⛔ the namer's) ⇒ `not_found`.
 */
export async function removeKnownPerson(
  db: Db,
  input: { pariwarId: PariwarId; namerMemberId: MemberId; linkId: KnownPersonLinkId },
): Promise<KnownPersonWriteResult> {
  const { pariwarId, namerMemberId, linkId } = input;
  if (!(await isActiveMember(db, pariwarId, namerMemberId))) return { kind: 'refused', reason: 'not_available' };
  await lockKnownPeopleNamer(db, namerMemberId);
  await lapseStaleKnownPeopleRequests(db, { pariwarId, memberId: namerMemberId, as: 'namer' });
  const r = await db.execute<LinkRow>(sql`
    UPDATE member_known_people SET state = 'removed', ended_at = clock_timestamp()
     WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND namer_member_id = ${namerMemberId} AND state IN ('asked', 'accepted')
    RETURNING *`);
  return r.rows[0] ? done(r.rows[0]) : { kind: 'refused', reason: 'not_found' };
}

/** The named member withdraws an ACCEPTED link ⇒ `withdrawn` (the namer then sees *"Not accepted"*). Else `not_found`. */
export async function withdrawKnownPerson(
  db: Db,
  input: { pariwarId: PariwarId; namedMemberId: MemberId; linkId: KnownPersonLinkId },
): Promise<KnownPersonWriteResult> {
  const { pariwarId, namedMemberId, linkId } = input;
  if (!(await isActiveMember(db, pariwarId, namedMemberId))) return { kind: 'refused', reason: 'not_available' };
  const r = await db.execute<LinkRow>(sql`
    UPDATE member_known_people SET state = 'withdrawn', ended_at = clock_timestamp()
     WHERE pariwar_id = ${pariwarId} AND link_id = ${linkId} AND named_member_id = ${namedMemberId} AND state = 'accepted'
    RETURNING *`);
  return r.rows[0] ? done(r.rows[0]) : { kind: 'refused', reason: 'not_found' };
}

// ── Erasure and export (AC12) ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The erasure arm (`anonymizeMember`): every LIVE link where the member is namer OR named ENDS — ⛔ deleted (the history is
 * kept, the ids opaque). ONE statement (the rtbf pin counts it): a stale `asked` row (past `asked_at` + 30 days) is recorded
 * `lapsed`, dated `asked_at + 30 days` — so 6.36's as-of reads never see an erasure where a lapse happened — and every other
 * live row becomes `erased`, dated now. The named person's row then vanishes from the namer's list (6.36a SW14 (3)).
 */
export async function eraseKnownPeopleLinks(db: Db, input: { pariwarId: PariwarId; memberId: MemberId }): Promise<void> {
  const stale = sql`(${memberKnownPeople.state} = 'asked' AND ${memberKnownPeople.askedAt} + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int) <= clock_timestamp())`;
  await db
    .update(memberKnownPeople)
    .set({
      state: sql`CASE WHEN ${stale} THEN 'lapsed' ELSE 'erased' END`,
      endedAt: sql`CASE WHEN ${stale} THEN ${memberKnownPeople.askedAt} + make_interval(days => ${KNOWN_PEOPLE_ANSWER_WINDOW_DAYS}::int) ELSE clock_timestamp() END`,
    })
    .where(
      and(
        eq(memberKnownPeople.pariwarId, input.pariwarId),
        or(eq(memberKnownPeople.namerMemberId, input.memberId), eq(memberKnownPeople.namedMemberId, input.memberId)),
        inArray(memberKnownPeople.state, ['asked', 'accepted']),
      ),
    );
}

export interface KnownPeopleExportRow {
  readonly linkId: KnownPersonLinkId;
  /** The OTHER member of the link. */
  readonly otherMemberId: MemberId;
  readonly state: KnownPeopleLinkState;
  readonly foundBy: KnownPeopleFoundBy;
  readonly askedAt: Date;
  readonly respondedAt: Date | null;
  readonly endedAt: Date | null;
}

/** The data export's two lists: the people the member NAMED, and the members who named THEM (every link, any state). */
export async function getKnownPeopleForExport(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId },
): Promise<{ named: KnownPeopleExportRow[]; namedBy: KnownPeopleExportRow[] }> {
  const r = await db.execute<LinkRow & { found_by: KnownPeopleFoundBy }>(sql`
    SELECT * FROM member_known_people
     WHERE pariwar_id = ${input.pariwarId} AND (namer_member_id = ${input.memberId} OR named_member_id = ${input.memberId})
     ORDER BY asked_at, link_id`);
  const named: KnownPeopleExportRow[] = [];
  const namedBy: KnownPeopleExportRow[] = [];
  for (const row of r.rows) {
    const asNamer = row.namer_member_id === input.memberId;
    const out: KnownPeopleExportRow = {
      linkId: knownPersonLinkId(row.link_id),
      otherMemberId: toMemberId(asNamer ? row.named_member_id : row.namer_member_id),
      state: row.state,
      foundBy: row.found_by,
      askedAt: asDate(row.asked_at),
      respondedAt: row.responded_at === null ? null : asDate(row.responded_at),
      endedAt: row.ended_at === null ? null : asDate(row.ended_at),
    };
    (asNamer ? named : namedBy).push(out);
  }
  return { named, namedBy };
}

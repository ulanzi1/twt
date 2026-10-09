// The SUSPICION NOTICES — the domain half of the once-ever texts of a `-239` suspicion refusal (Story 6.24b, Task 4;
// AC7b; `2026-10-07-292` RF11 / RF12, `2026-10-07-293` item 1 B, `2026-10-08-295` RB2, RB3, RB5, RB7, RB8, RB10, RB13,
// RB15, RB18). Transport-free; ⛔ nothing here decrypts (the jobs child does, AFTER the claiming commit).
//
// Three purposes, each ONCE per claim, EVER (0151's UNIQUE `(pariwar_id, claim_case_id, purpose)`):
//   (a) `suspicion_refusal`     — FQ7 B: RF1 STANDS on the claim ⇒ text the rank-1 nominee of its EFFECTIVE determination
//                                 (RF9's rule — the version's OWN mobile), in Hindi.
//   (b) `closed_after_appeal`   — `-291` Q2 B: the claim is `closed` by a `claim.closed` event whose trigger is
//                                 `suspicion_appeal_allowed` (⛔ never `current_state` alone — F25) ⇒ text the rank-1 nominee
//                                 of R's OWN live determination when effective, else of the reversed claim S's determination
//                                 AS OF R's closure (RB15), at the head of that entry's correction chain; ⛔ a claim the
//                                 post-death nominee's side filed (RB18); in Hindi.
//   (c) `refusal_appeal_notice` — `-293` item 1 B: RF1 stands, the appeal is `not_filed` (RB13 — within the 90 days, ⛔ an
//                                 appeal filed) ⇒ text the REFUSED filer (`readRefusedFilerRecipient` — RB7), in the claim's
//                                 `contact_locale`, with the last date to appeal (the SAME `readStandingSuspicionRefusals`
//                                 row's `appealUntil`).
//
// ⭐ THE DEDUP IS THE TABLE + THE CLAIM-ROW LOCK (a pg-boss `singletonKey` is a label only). `beginSuspicionNotice` locks the
// claim row, RE-CHECKS the purpose's predicate under it, resolves the recipient and claims the row — ONE transaction; the
// send happens after that commit. ⭐ RB10's ONE re-check rule, AS AMENDED BY `2026-10-09-297` §2: a FRESH claim whose
// re-check fails writes ⛔ no row (`not_due`); ANY existing `attempting` row — this job's, or another job's past the lease
// (taken over first) — becomes `error` / `exhausted:recheck_<reason>` (+ an alarm by the caller): a claiming commit
// happened, so a send MAY have — ⛔ never `skipped_superseded` (`detail` is written only by a TRANSIENT failure, so a NULL
// `detail` does ⛔ not prove nothing went); another job's row within the lease ⇒ `held_by_other`. ⚠ RB15's and RB18's `no_target` are ⛔ re-check
// failures — the predicate HELD; they FINISH the slot here (a `no_target` row) and the caller alarms once.
// ⭐ Every selector also returns a claim with an `attempting` row of that purpose (a crash left it) — bypassing the
// predicate — so its locked re-check runs and finishes it (⛔ stranded once its predicate turns false). A row still
// `attempting` three IST days after it was created is given up (`expireExhaustedSuspicionNotices`, RB3) — unless it was
// re-claimed within the send lease (a live child may be sending it; the next sweep takes it).
// ⚠ AT-LEAST-ONCE (6.19b's): a timeout or a crash after a gateway accept may produce a second text; `attempt_count` and
// `first_detail` record it. "Once ever" holds for FINISHED rows.
// ⭐ LOCKS (`-294` §1): ONLY the claim row (`FOR UPDATE`, `SET LOCAL lock_timeout`) — ⛔ no advisory key, ⛔ never a second
// claim's row, ⛔ never the intake lock ⇒ the sweep can only WAIT behind a writer, ⛔ never form a cycle.
// ⛔ NOTHING here writes a claim decision, event or state (invariant 7, AC9b).
//
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit `sn_` aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).
// ⚠ This is a WRITE module (⛔ an NW1 read module), so it may import `suspicion-refusal-persist.ts`'s trigger constant.

import { type SQL, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type pg from 'pg';

import { addCalendarDays, type CalendarDateString, istDateOf, istMidnightAt } from '../cycle-calendar/holiday-resolver.js';
import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { listNomineeDeclarationVersions } from '../nominee/declaration-history.js';
import { clampLimit } from '../pagination.js';
import type { SuspicionNoticePurpose } from '../schema/claim_suspicion_notices.js';
import { type ChainVersion, chainHeadOf } from './certificate-reminder.js';
import { correctionChainOf, readClaimContact } from './claim-contact-check.js';
import { CORRECTION_SEND_LEASE_MS } from './correction-reminder-record.js';
import type { CorrectionMobileSource } from './correction-crypto.js';
import {
  type EffectiveNomineeDeclaration,
  EffectiveNomineeDeclarationClaimNotFoundError,
  getEffectiveNomineeDeclaration,
  getEffectiveNomineeDeclarationAsOf,
} from './nominee-effective.js';
import {
  hasSuspicionRefusalAppealLimitPassed,
  isSuspicionRefusalStanding,
  readStandingSuspicionRefusals,
  standingSuspicionRefusalSql,
  suspicionChainStartedAtSql,
} from './suspicion-refusal.js';
import { SUSPICION_APPEAL_ALLOWED_TRIGGER } from './suspicion-refusal-persist.js';

/** The sweep's page size cap. */
export const SUSPICION_NOTICE_PAGE_CAP = 1000;
/** RB3 — a row still `attempting` this many IST calendar days after it was created is given up (`error`). */
export const SUSPICION_NOTICE_RECLAIM_DAYS = 3;
/** The claiming transaction's wait on the claim-row lock (`SET LOCAL`). */
export const SUSPICION_NOTICE_LOCK_TIMEOUT = '30s';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

const dialect = new PgDialect();

async function run<T extends pg.QueryResultRow>(q: Queryable, statement: SQL): Promise<T[]> {
  const { sql: text, params } = dialect.sqlToQuery(statement);
  const { rows } = await q.query<T>(text, params as unknown[]);
  return rows;
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ── The selectors (RB10) — cross-tenant, BYPASSRLS pool, keyset-paged on `claim_case_id`, clamped ──────────────────

/** One due claim. (c)'s chain start and clock are read for the TS 90-day filter only — ⛔ carried on the result. */
export interface DueSuspicionNotice {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  /** A crash left an `attempting` row of this purpose — the predicate, the 90 days and the prefilter were bypassed. */
  readonly hasAttemptingRow: boolean;
}

export interface DueSuspicionNoticePage {
  /** The due claims of this page, AFTER the TS filter (RB10's 90 days for (c)). */
  readonly due: readonly DueSuspicionNotice[];
  /** The UNFILTERED page's last claim id — the next page's cursor (`null` ⇒ an empty page). */
  readonly lastClaimCaseId: ClaimId | null;
  /** The UNFILTERED page's size — the caller's last-page test (`< limit` ⇒ done). */
  readonly scanned: number;
}

const noticeRowSql = (alias: string, purpose: SuspicionNoticePurpose, outcome: SQL) => sql`EXISTS (
  SELECT 1 FROM claim_suspicion_notices sn_n
   WHERE sn_n.pariwar_id = ${sql.raw(alias)}.pariwar_id
     AND sn_n.claim_case_id = ${sql.raw(alias)}.claim_case_id
     AND sn_n.purpose = ${purpose}
     AND ${outcome}
)`;

/** The closing event of a claim RF6 closed (`claim.closed`, trigger `suspicion_appeal_allowed`) — ⛔ never the state alone. */
const closedByAppealSql = (alias: string) => sql`EXISTS (
  SELECT 1 FROM events_log sn_e
   WHERE sn_e.pariwar_id = ${sql.raw(alias)}.pariwar_id
     AND sn_e.stream_id = ${sql.raw(alias)}.claim_case_id
     AND sn_e.event_type = 'claim.closed'
     AND sn_e.payload->>'trigger' = ${SUSPICION_APPEAL_ALLOWED_TRIGGER}
)`;

/**
 * ⭐ RB10 — the claims due a notice of `purpose`, one keyset page (cross-tenant — the BYPASSRLS pool only; `allow` (tests)
 * narrows it to some Pariwars). "Finished" = `outcome <> 'attempting'`; a claim with an `attempting` row is ALWAYS
 * returned. (c) is filtered in TS by `hasSuspicionRefusalAppealLimitPassed` (⛔ a SQL re-derivation of the 90 days); the
 * cursor and the last-page test see the UNFILTERED page.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The sweep has ⛔ no tenant to start from: it must find every Pariwar's due claims, and a per-tenant loop would first
 * need a cross-tenant read to enumerate the Pariwars (the same bypass). It RETURNS ids only (`pariwar_id`,
 * `claim_case_id`, a boolean); (c) also READS the claim's own `-239` chain start and the statement clock, for the TS
 * 90-day filter, and ⛔ returns them — ⛔ PII, ⛔ value from one tenant reaches another; every write that follows runs
 * in the child's own `withPariwarScope` transaction, under RLS, after a locked re-check. RE-EXAMINE when: the result
 * ever carries more than ids / flags, the read projects PII, a write is added on this pool, the pool loses BYPASSRLS,
 * or a per-tenant scheduler exists.
 */
export async function selectDueSuspicionNotices(
  q: Queryable,
  input: {
    readonly purpose: SuspicionNoticePurpose;
    readonly after: string | null;
    readonly limit: number;
    readonly allow: readonly string[] | null;
  },
): Promise<DueSuspicionNoticePage> {
  const size = clampLimit(input.limit, { default: SUSPICION_NOTICE_PAGE_CAP, cap: SUSPICION_NOTICE_PAGE_CAP });
  const finished = noticeRowSql('sn_c', input.purpose, sql`sn_n.outcome <> 'attempting'`);
  const predicate =
    input.purpose === 'suspicion_refusal'
      ? standingSuspicionRefusalSql('sn_c')
      : input.purpose === 'closed_after_appeal'
        ? sql`(sn_c.current_state = 'closed' AND ${closedByAppealSql('sn_c')})`
        : // (c) — RF1 stands AND (a PREFILTER only — the locked re-check decides) ⛔ appeal anchor of any status.
          sql`(${standingSuspicionRefusalSql('sn_c')} AND NOT EXISTS (
                SELECT 1 FROM claim_appeals sn_a
                 WHERE sn_a.pariwar_id = sn_c.pariwar_id AND sn_a.claim_case_id = sn_c.claim_case_id))`;
  const projections =
    input.purpose === 'refusal_appeal_notice'
      ? sql`, ${suspicionChainStartedAtSql(sql`sn_c.pariwar_id`, sql`sn_c.claim_case_id`)} AS chain_started_at, clock_timestamp() AS clock`
      : sql``;
  const after = input.after === null ? sql`` : sql` AND sn_c.claim_case_id > ${input.after}::uuid`;
  // ⚠ `sql.param` — a bare array in a Drizzle template is EXPANDED into one parameter per element.
  const allow = input.allow === null ? sql`` : sql` AND sn_c.pariwar_id = ANY(${sql.param([...input.allow])}::uuid[])`;
  // `sn_att` computes the `attempting`-row EXISTS ONCE per candidate claim (a LATERAL join, not a re-run subquery) —
  // the SELECT projection and the WHERE clause's OR both reference its `has_attempting` column.
  const rows = await run<{
    pariwar_id: string;
    claim_case_id: string;
    has_attempting: boolean;
    chain_started_at?: Date | string | null;
    clock?: Date | string;
  }>(
    q,
    sql`
      SELECT sn_c.pariwar_id, sn_c.claim_case_id, sn_att.has_attempting${projections}
        FROM claims sn_c
        CROSS JOIN LATERAL (
          SELECT EXISTS (
            SELECT 1 FROM claim_suspicion_notices sn_n
             WHERE sn_n.pariwar_id = sn_c.pariwar_id AND sn_n.claim_case_id = sn_c.claim_case_id
               AND sn_n.purpose = ${input.purpose} AND sn_n.outcome = 'attempting'
          ) AS has_attempting
        ) sn_att
       WHERE ((${predicate} AND NOT ${finished}) OR sn_att.has_attempting)${after}${allow}
       ORDER BY sn_c.claim_case_id ASC
       LIMIT ${sql.raw(String(size))}
    `,
  );
  const due: DueSuspicionNotice[] = [];
  for (const r of rows) {
    const row = { pariwarId: r.pariwar_id as PariwarId, claimCaseId: r.claim_case_id as ClaimId, hasAttemptingRow: r.has_attempting };
    if (input.purpose === 'refusal_appeal_notice' && !r.has_attempting) {
      // ⚠ A standing refusal past its 90 days is re-scanned daily (⛔ row is written for it) — cheap while refusals
      // are rare; recorded (RB10). A NULL chain start cannot accompany a standing refusal — skip it, the lock decides.
      if (r.chain_started_at === null || r.chain_started_at === undefined) continue;
      if (hasSuspicionRefusalAppealLimitPassed(toDate(r.chain_started_at), toDate(r.clock!))) continue;
    }
    due.push(row);
  }
  const last = rows.at(-1);
  return { due, lastClaimCaseId: last ? (last.claim_case_id as ClaimId) : null, scanned: rows.length };
}

// ── The give-up (RB3) ────────────────────────────────────────────────────────────────────────────────────────────

/** RB3 — rows created before this instant and still `attempting` are given up: 00:00 IST of (today − 2). */
export function suspicionNoticeReclaimCutoff(now: Date): Date {
  return istMidnightAt(addCalendarDays(istDateOf(now), -(SUSPICION_NOTICE_RECLAIM_DAYS - 1)));
}

/**
 * ⭐ RB3 — THE EXHAUSTED-ROW FINALISER: every row still `attempting` that was created before `cutoff` — and whose LAST claim
 * is older than the send lease — becomes `error` / `exhausted:attempting_three_days` (the transient detail kept in
 * `first_detail`). Returns the claims finalised, for the caller's alarm (ids only).
 *
 * ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ──
 * 6.19b's reasoning (`claim-correction-reminders.ts`): a time bound over EVERY tenant's rows; its predicate (`attempting`,
 * created before the cutoff, claimed before the lease) and its effect (→ `error`, the detail moved to `first_detail`) read
 * and write ⛔ nothing tenant-derived — ⛔ no PII, ⛔ no cross-row join; `allow` (tests) narrows it. ⚠ Unlike 6.19b's
 * one-day bound, a three-day-old row can be RE-CLAIMED today (every selector returns an `attempting` row), so a live child
 * may hold it ⇒ the lease guard (`claimed_at < now − CORRECTION_SEND_LEASE_MS`) leaves a row claimed within the lease to
 * that child's own compare-and-set. ⚠ The lease is 6.19b's constant (`correction-reminder-record.ts`) — a change THERE
 * moves this guard. It takes ⛔ no claim-row lock, so a child can lose to it two ways: a child past its claim loses
 * `finaliseSuspicionNotice`'s compare-and-set and ALARMS (*"moved on before its finalise"*); a child still in
 * `beginSuspicionNotice` loses its UPDATE (`rowCount` 0) and returns `already_final` SILENTLY — this statement's own
 * alarm (the caller's, ids) covers the row. RE-EXAMINE when: the statement ever writes a value derived from another row
 * or tenant, the pool loses BYPASSRLS, a per-tenant scheduler exists, or `CORRECTION_SEND_LEASE_MS` approaches the
 * reclaim horizon (or moves at all).
 */
export async function expireExhaustedSuspicionNotices(
  q: Queryable,
  input: { readonly cutoff: Date; readonly now: Date; readonly allow: readonly string[] | null },
): Promise<{ readonly claimCaseId: ClaimId; readonly purpose: SuspicionNoticePurpose }[]> {
  const { rows } = await q.query<{ claim_case_id: string; purpose: SuspicionNoticePurpose }>(
    `UPDATE claim_suspicion_notices
        SET outcome = 'error',
            first_detail = COALESCE(first_detail, detail),
            detail = 'exhausted:attempting_three_days',
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND created_at < $1 AND claimed_at < $3
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING claim_case_id, purpose`,
    [input.cutoff, input.allow === null ? null : [...input.allow], new Date(input.now.getTime() - CORRECTION_SEND_LEASE_MS)],
  );
  return rows.map((r) => ({ claimCaseId: r.claim_case_id as ClaimId, purpose: r.purpose }));
}

// ── The recipients (RF9 / RF11, RB7, RB15, RB18) ─────────────────────────────────────────────────────────────────

/** Who a notice goes to — ⛔ nothing decrypted. `unresolved` ⇒ the child records `no_target` with ⛔ no decrypt. */
export interface SuspicionNoticeRecipient {
  /** The nominee version whose number is used (`null` for a non-nominee claimant, or when unresolved). */
  readonly versionId: string | null;
  /** ⛔ Ciphertext AS STORED. */
  readonly mobileCiphertext: string | null;
  readonly source: CorrectionMobileSource;
  /** Why ⛔ recipient could be resolved — `not_effective` (a / b) or `no_contact_record` (c); `null` when resolved. */
  readonly unresolved: 'not_effective' | 'no_contact_record' | null;
}

interface VersionsOfDeath {
  readonly chain: ChainVersion[];
  readonly index: ReadonlyMap<string, string | null>;
  readonly mobileOf: ReadonlyMap<string, string | null>;
}

/** ONE read of the deceased's versions — the chain index, the `ChainVersion[]` and each version's mobile (RB7). */
async function readVersionsOfDeath(db: Db, pariwarId: PariwarId, deceasedMemberId: MemberId): Promise<VersionsOfDeath> {
  const rows = await listNomineeDeclarationVersions(db, pariwarId, deceasedMemberId);
  const chain: ChainVersion[] = rows.map((r) => ({
    versionId: r.versionId as string,
    correctsVersionId: (r.correctsVersionId as string | null) ?? null,
    versionNo: r.versionNo,
  }));
  return {
    chain,
    index: new Map(chain.map((v) => [v.versionId, v.correctsVersionId])),
    mobileOf: new Map(rows.map((r) => [r.versionId as string, (r.mobileCiphertext as string | null) ?? null])),
  };
}

/** RB7 — the HEAD of `versionId`'s correction chain, ROOT first (6.19d CR6's order): root = the last of the chain. */
function chainHeadThroughRoot(versionId: string, v: VersionsOfDeath): string {
  const root = correctionChainOf(versionId, v.index).at(-1) ?? versionId;
  return chainHeadOf(root, v.chain);
}

const rankOneOf = (d: EffectiveNomineeDeclaration): string | null =>
  d.status === 'effective' ? ((d.entries.find((e) => e.rank === 1)?.versionId as string | undefined) ?? null) : null;

const UNRESOLVED_NOMINEE: SuspicionNoticeRecipient = {
  versionId: null,
  mobileCiphertext: null,
  source: 'member_nominee',
  unresolved: 'not_effective',
};

/**
 * ⭐ `-293` item 1 B (RB7) — the REFUSED FILER of `claimCaseId`: a non-nominee claimant at their contact mobile; a
 * nominee-claimant at the mobile on the HEAD of the correction chain their linked version belongs to (a correction is the
 * SAME person's entry corrected — the post-death one in the Panel's scenario); ⛔ no contact record ⇒ unresolved. Locale =
 * the claim's own `contact_locale`. ⛔ Never `readCorrectionRecipients`; ⛔ no filing-agreement gate (`-293` names none).
 * It RETURNS ciphertext — so it lives here, ⛔ in the ref-only `suspicion-refusal.ts`.
 */
export async function readRefusedFilerRecipient(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ readonly recipient: SuspicionNoticeRecipient; readonly locale: 'hi' | 'en' }> {
  const { contact } = await readClaimContact(db, pariwarId, claimCaseId);
  if (contact === null) {
    return {
      recipient: { versionId: null, mobileCiphertext: null, source: 'claim_contact', unresolved: 'no_contact_record' },
      locale: 'hi',
    };
  }
  const locale = contact.contactLocale;
  if (contact.claimantNomineeVersionId === null) {
    return {
      recipient: { versionId: null, mobileCiphertext: contact.claimantMobileCiphertext ?? null, source: 'claim_contact', unresolved: null },
      locale,
    };
  }
  const versions = await readVersionsOfDeath(db, pariwarId, contact.deceasedMemberId as MemberId);
  const head = chainHeadThroughRoot(contact.claimantNomineeVersionId as string, versions);
  return {
    recipient: { versionId: head, mobileCiphertext: versions.mobileOf.get(head) ?? null, source: 'member_nominee', unresolved: null },
    locale,
  };
}

/** (b)'s closing event — the reversed claim and the instant (the LATEST such event of the stream). */
async function readClosingEvent(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ readonly occurredAt: string; readonly heldByClaimCaseId: ClaimId } | null> {
  // ⚠ The instant as its EXACT text (microseconds) — a JS `Date` would truncate it and miss a determination decided in
  // the same millisecond (`decided_at <= occurred_at`).
  const result = await db.execute<{ occurred_at: string; held_by: string | null }>(sql`
    SELECT to_char(sn_e.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at,
           sn_e.payload->>'held_by_claim_case_id' AS held_by
      FROM events_log sn_e
     WHERE sn_e.pariwar_id = ${pariwarId}
       AND sn_e.stream_id = ${claimCaseId}
       AND sn_e.event_type = 'claim.closed'
       AND sn_e.payload->>'trigger' = ${SUSPICION_APPEAL_ALLOWED_TRIGGER}
     ORDER BY sn_e.event_version DESC
     LIMIT 1
  `);
  const row = result.rows?.[0];
  if (!row || row.held_by === null) return null;
  return { occurredAt: row.occurred_at, heldByClaimCaseId: row.held_by as ClaimId };
}

/** The versions a determination marks `discarded`. */
async function discardedVersionsOf(db: Db, pariwarId: PariwarId, determinationId: string): Promise<Set<string>> {
  const result = await db.execute<{ version_id: string }>(sql`
    SELECT sn_i.version_id FROM nominee_determination_items sn_i
     WHERE sn_i.pariwar_id = ${pariwarId}
       AND sn_i.determination_id = ${determinationId}
       AND sn_i.mark = 'discarded'
  `);
  return new Set((result.rows ?? []).map((r) => r.version_id));
}

type ClosedRecipient =
  | { readonly kind: 'resolved'; readonly recipient: SuspicionNoticeRecipient }
  | { readonly kind: 'no_target'; readonly reason: SuspicionNoticeNoTargetReason };

/**
 * ⭐ (b)'s recipient (RB15, then RB18). RB15: R's OWN live determination when `effective`; else the reversed claim S's
 * determination AS OF R's `claim.closed` event (S's LIVE one can name the post-death nominee after a re-determination);
 * else `closed_no_determination`. RB18 — judged ONLY here, after RB15's source is chosen: R is EXCLUDED when its
 * claimant's linked version's correction chain (child → root) holds a version that determination marks `discarded`
 * (a claim the post-death nominee's side filed). The mobile is at the chain head of the rank-1 entry, ROOT first (RB7).
 */
async function resolveClosedRecipient(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId, deceasedMemberId: MemberId): Promise<ClosedRecipient> {
  let declaration = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  if (rankOneOf(declaration) === null) {
    const closing = await readClosingEvent(db, pariwarId, claimCaseId);
    if (closing === null) return { kind: 'no_target', reason: 'closed_no_determination' };
    try {
      declaration = await getEffectiveNomineeDeclarationAsOf(db, pariwarId, closing.heldByClaimCaseId, closing.occurredAt);
    } catch (err) {
      // S (the reversed claim) is gone from this Pariwar — same outcome as the `closing === null` branch above.
      if (err instanceof EffectiveNomineeDeclarationClaimNotFoundError) return { kind: 'no_target', reason: 'closed_no_determination' };
      throw err;
    }
  }
  const rankOne = rankOneOf(declaration);
  if (rankOne === null || declaration.determinationId === null) return { kind: 'no_target', reason: 'closed_no_determination' };

  const versions = await readVersionsOfDeath(db, pariwarId, deceasedMemberId);
  const { contact } = await readClaimContact(db, pariwarId, claimCaseId);
  if (contact !== null && contact.claimantNomineeVersionId !== null) {
    const discarded = await discardedVersionsOf(db, pariwarId, declaration.determinationId);
    const claimantChain = correctionChainOf(contact.claimantNomineeVersionId as string, versions.index);
    if (claimantChain.some((v) => discarded.has(v))) return { kind: 'no_target', reason: 'excluded_claimant' };
  }
  const head = chainHeadThroughRoot(rankOne, versions);
  return {
    kind: 'resolved',
    recipient: { versionId: head, mobileCiphertext: versions.mobileOf.get(head) ?? null, source: 'member_nominee', unresolved: null },
  };
}

/** (a)'s recipient — RF9's rule: the rank-1 version of the claim's EFFECTIVE determination, its OWN mobile. */
async function resolveRefusalRecipient(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<SuspicionNoticeRecipient> {
  const rankOne = rankOneOf(await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId));
  if (rankOne === null) return UNRESOLVED_NOMINEE;
  const rows = await db.execute<{ mobile_ciphertext: string | null }>(sql`
    SELECT sn_v.mobile_ciphertext FROM member_nominee_versions sn_v
     WHERE sn_v.pariwar_id = ${pariwarId} AND sn_v.version_id = ${rankOne}
  `);
  // A determination's rank-1 version always exists (`twt_app` has ⛔ no DELETE on the table) — a data fault (RB9).
  const row = rows.rows?.[0];
  if (!row) throw new Error(`[suspicion-notice] the rank-1 version ${rankOne} is missing`);
  return { versionId: rankOne, mobileCiphertext: row.mobile_ciphertext, source: 'member_nominee', unresolved: null };
}

// ── The claim + the locked re-check (RB10) ───────────────────────────────────────────────────────────────────────

/** Why the slot finished with ⛔ text though the predicate held (RB15, RB18) — the caller alarms once. */
export type SuspicionNoticeNoTargetReason = 'closed_no_determination' | 'excluded_claimant';

const NO_TARGET_DETAIL: Record<SuspicionNoticeNoTargetReason, string> = {
  closed_no_determination: 'no_target:closed_no_determination',
  excluded_claimant: 'excluded:claimant_discarded_version',
};

export type BeginSuspicionNoticeResult =
  | {
      readonly kind: 'begun';
      readonly noticeId: string;
      readonly attemptCount: number;
      readonly deceasedMemberId: MemberId;
      readonly recipient: SuspicionNoticeRecipient;
      readonly locale: 'hi' | 'en';
      /** (c) only — the last date to appeal, from the SAME row that decided `not_filed` (⛔ recomputed). */
      readonly appealUntil: CalendarDateString | null;
    }
  | { readonly kind: 'already_final' }
  | { readonly kind: 'held_by_other' }
  /** A FRESH claim whose locked re-check failed — ⛔ row written. */
  | { readonly kind: 'not_due' }
  /** An existing `attempting` row finished `error` by a failed re-check (`-297` §2) — `detail` as written; the caller alarms. */
  | { readonly kind: 'expired'; readonly detail: string }
  | { readonly kind: 'no_target'; readonly reason: SuspicionNoticeNoTargetReason };

interface NoticeRow {
  notice_id: string;
  outcome: string;
  detail: string | null;
  claimed_at: Date | string | null;
  claimed_by_job: string | null;
}

type Recheck =
  | { readonly ok: true; readonly appealUntil: CalendarDateString | null }
  | { readonly ok: false; readonly reason: string };

/** Re-check the purpose's predicate ON the locked transaction's client (the statement clock is AFTER the lock). */
async function recheck(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  claim: { readonly currentState: string; readonly deceasedMemberId: MemberId },
  purpose: SuspicionNoticePurpose,
): Promise<Recheck> {
  if (purpose === 'suspicion_refusal') {
    return (await isSuspicionRefusalStanding(db, pariwarId, claimCaseId))
      ? { ok: true, appealUntil: null }
      : { ok: false, reason: 'not_standing' };
  }
  if (purpose === 'closed_after_appeal') {
    const closedByAppeal = claim.currentState === 'closed' && (await readClosingEvent(db, pariwarId, claimCaseId)) !== null;
    return closedByAppeal ? { ok: true, appealUntil: null } : { ok: false, reason: 'not_closed_by_appeal' };
  }
  // (c) — 6.24a's ONE derivation (RB13): this claim's row → `not_filed` folds in the anchor AND the 90 days.
  // Both ids are lower-case (Postgres prints them so; the caller normalises its own — `beginSuspicionNotice`).
  const own = (await readStandingSuspicionRefusals(db, pariwarId, claim.deceasedMemberId)).find((r) => r.claimCaseId === claimCaseId);
  if (!own) return { ok: false, reason: 'not_standing' };
  if (own.appeal !== 'not_filed') return { ok: false, reason: `appeal_${own.appeal}` };
  return { ok: true, appealUntil: own.appealUntil };
}

/**
 * ⭐ THE CLAIMING TRANSACTION (RB10) — on the ONE client of the caller's scope transaction: lock the claim row, re-check
 * the predicate under it, resolve the recipient and claim (or finish) the row. ⛔ No KMS, ⛔ no decrypt here — the caller
 * COMMITS, then decrypts and sends. ⛔ Never catch a DB error inside this transaction (a failed statement aborts it and
 * the COMMIT would silently roll the claim back — RB5).
 */
export async function beginSuspicionNotice(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly purpose: SuspicionNoticePurpose;
    readonly jobId: string;
    readonly now: Date;
  },
): Promise<BeginSuspicionNoticeResult> {
  const db = bindScopedDb(client);
  const { pariwarId, purpose, jobId, now } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  await client.query(`SET LOCAL lock_timeout = '${SUSPICION_NOTICE_LOCK_TIMEOUT}'`);
  const locked = await client.query<{ current_state: string; deceased_member_id: string }>(
    `SELECT current_state::text AS current_state, deceased_member_id FROM claims
      WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE`,
    [pariwarId, claimCaseId],
  );
  const claimRow = locked.rows[0];
  // The selector read this claim moments ago under this same Pariwar; claims are ⛔ never deleted — a data fault (RB9's style).
  if (!claimRow) throw new Error(`[suspicion-notice] claim ${claimCaseId} is missing under Pariwar ${pariwarId}`);
  const claim = { currentState: claimRow.current_state, deceasedMemberId: claimRow.deceased_member_id as MemberId };

  const existing = (
    await client.query<NoticeRow>(
      `SELECT notice_id, outcome, detail, claimed_at, claimed_by_job FROM claim_suspicion_notices
        WHERE pariwar_id = $1 AND claim_case_id = $2 AND purpose = $3`,
      [pariwarId, claimCaseId, purpose],
    )
  ).rows[0];
  if (existing && existing.outcome !== 'attempting') return { kind: 'already_final' };
  if (existing) {
    const ownRetry = existing.claimed_by_job === jobId;
    const leaseExpired =
      existing.claimed_at !== null && toDate(existing.claimed_at).getTime() < now.getTime() - CORRECTION_SEND_LEASE_MS;
    if (!ownRetry && !leaseExpired) return { kind: 'held_by_other' };
  }

  const check = await recheck(db, pariwarId, claimCaseId, claim, purpose);
  if (!check.ok) {
    if (!existing) return { kind: 'not_due' };
    // RB10 as amended by `-297` §2 — an existing `attempting` row means a claiming commit happened, so a send MAY have:
    // ALWAYS `error`, ⛔ never `skipped_superseded` (a NULL `detail` does ⛔ not prove nothing went — a crash between the
    // gateway's accept and the finalise leaves it NULL).
    const detail = `exhausted:recheck_${check.reason}`;
    const expired = await client.query(
      `UPDATE claim_suspicion_notices
          SET outcome = 'error', first_detail = COALESCE(first_detail, detail), detail = $2,
              claimed_by_job = $3, claimed_at = $4, updated_at = clock_timestamp()
        WHERE notice_id = $1 AND outcome = 'attempting'`,
      [existing.notice_id, detail, jobId, now],
    );
    // The give-up (RB3) takes ⛔ claim-row lock, so it can finish the row between the SELECT above and this UPDATE.
    if ((expired.rowCount ?? 0) === 0) return { kind: 'already_final' };
    return { kind: 'expired', detail };
  }

  let recipient: SuspicionNoticeRecipient;
  let locale: 'hi' | 'en' = 'hi';
  if (purpose === 'suspicion_refusal') {
    recipient = await resolveRefusalRecipient(db, pariwarId, claimCaseId);
  } else if (purpose === 'closed_after_appeal') {
    const resolved = await resolveClosedRecipient(db, pariwarId, claimCaseId, claim.deceasedMemberId);
    if (resolved.kind === 'no_target') {
      // RB15 / RB18 — the predicate HELD; the slot FINISHES here (the claim's own INSERT … ON CONFLICT path).
      const detail = NO_TARGET_DETAIL[resolved.reason];
      if (existing) {
        const finished = await client.query(
          `UPDATE claim_suspicion_notices
              SET outcome = 'no_target', first_detail = COALESCE(first_detail, detail), detail = $2,
                  claimed_by_job = $3, claimed_at = $4, updated_at = clock_timestamp()
            WHERE notice_id = $1 AND outcome = 'attempting'`,
          [existing.notice_id, detail, jobId, now],
        );
        // Lost to the give-up (⛔ claim-row lock there) — the row is final already; ⛔ report an outcome ⛔ written.
        if ((finished.rowCount ?? 0) === 0) return { kind: 'already_final' };
      } else {
        const inserted = await client.query(
          `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, detail)
           VALUES ($1, $2, $3, 'no_target', $4)
           ON CONFLICT (pariwar_id, claim_case_id, purpose) DO NOTHING`,
          [pariwarId, claimCaseId, purpose, detail],
        );
        if ((inserted.rowCount ?? 0) === 0) return { kind: 'already_final' };
      }
      return { kind: 'no_target', reason: resolved.reason };
    }
    recipient = resolved.recipient;
  } else {
    const filer = await readRefusedFilerRecipient(db, pariwarId, claimCaseId);
    recipient = filer.recipient;
    locale = filer.locale;
  }

  // Claim the row — INSERT `attempting`, or re-claim the existing one (own retry at once; another job's past the lease).
  let claimed: { notice_id: string; attempt_count: number } | undefined;
  if (existing) {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number }>(
        `UPDATE claim_suspicion_notices
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1,
                first_detail = COALESCE(first_detail, detail), updated_at = clock_timestamp()
          WHERE notice_id = $1 AND outcome = 'attempting'
          RETURNING notice_id, attempt_count`,
        [existing.notice_id, now, jobId],
      )
    ).rows[0];
  } else {
    claimed = (
      await client.query<{ notice_id: string; attempt_count: number }>(
        `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, claimed_at, claimed_by_job)
         VALUES ($1, $2, $3, 'attempting', $4, $5)
         ON CONFLICT (pariwar_id, claim_case_id, purpose) DO NOTHING
         RETURNING notice_id, attempt_count`,
        [pariwarId, claimCaseId, purpose, now, jobId],
      )
    ).rows[0];
  }
  if (!claimed) return { kind: 'already_final' };
  return {
    kind: 'begun',
    noticeId: claimed.notice_id,
    attemptCount: claimed.attempt_count,
    deceasedMemberId: claim.deceasedMemberId,
    recipient,
    locale,
    appealUntil: check.appealUntil,
  };
}

// ── The compare-and-set and the transient note (6.19b's shapes) ──────────────────────────────────────────────────

/**
 * ⭐ THE COMPARE-AND-SET: `attempting` → final, only from `attempting` and only by the job holding the row. Returns
 * `false` when the row moved on (the finaliser, or a job that re-claimed it after the lease). ⛔ Never `delivered`.
 */
export async function finaliseSuspicionNotice(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly noticeId: string;
    readonly jobId: string;
    readonly outcome: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'no_target' | 'error';
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
    readonly recipientVersionId?: string | null;
    readonly recipientNumberHash?: string | null;
  },
): Promise<boolean> {
  const result = await db.execute<{ notice_id: string }>(sql`
    UPDATE claim_suspicion_notices
       SET outcome = ${input.outcome},
           provider_message_id = ${input.providerMessageId ?? null},
           detail = ${input.detail ?? null},
           recipient_version_id = ${input.recipientVersionId ?? null}::uuid,
           recipient_number_hash = ${input.recipientNumberHash ?? null},
           updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND notice_id = ${input.noticeId}::uuid
       AND outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
    RETURNING notice_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * A TRANSIENT failure: keep the row `attempting` (the retry re-claims it at once) and record the classified detail —
 * the re-claim moves it to `first_detail`. Returns `false` when the row moved on (the finaliser, or a job that
 * re-claimed it after the lease) — the note was a no-op, as `finaliseSuspicionNotice`'s compare-and-set reports.
 */
export async function noteSuspicionNoticeTransient(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly noticeId: string; readonly jobId: string; readonly detail: string },
): Promise<boolean> {
  const result = await db.execute<{ notice_id: string }>(sql`
    UPDATE claim_suspicion_notices
       SET detail = ${input.detail}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND notice_id = ${input.noticeId}::uuid
       AND outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
     RETURNING notice_id
  `);
  return (result.rows?.length ?? 0) > 0;
}

// Trustee-Lite signal normalization + ordering — Story 10.11 (Task 1; AC1/AC2/AC3).
//
// PURE. DB-free, clock-INJECTED, `Date.now()`-free — the `helpdesk/sla.ts` + `contribution/history.ts`
// `deriveContributionStatus` discipline, verbatim. Nothing in this namespace imports `Db`; the six
// reads run in `apps/api/src/modules/trustee-lite/`, and everything below is a total function over
// their already-materialized rows.
//
// ── This module owns NO state ─────────────────────────────────────────────────────────────────
// No `trustee_signals` table, no materialized view, no migration, no event type, no projector. Every
// row is a read-time LENS over a row a prior story already ships. The four source reads
// (`getCycleFreezePending` 6.13, `getR9VotingQueue` 6.14, `listOpenReconciliationCases` 9.8,
// `listModeratedMembersForPariwar` 10.10) are consumed AS SHIPPED — a diff touching their bodies is
// a finding. The fifth (`listOpenAppealCasesForPariwar`) is the ONE read 10.11 adds, in the existing
// 6.16 module (D5). There is no sixth: concealment is a FILTER over the cycle-freeze rows, not a
// query (D6) — `getCycleFreezePending` already resolves the real 6.15 producer in bulk and surfaces
// `concealmentFlags` per case. Writing a new concealment query is the wheel-reinvention this story
// most expects; do not.
//
// ── Concealment and cycle-freeze are LENSES, not a partition (D6) ─────────────────────────────
// A claim legitimately appears in BOTH sections. Do NOT dedupe: a trustee needs to see the claim in
// the freeze queue (it awaits a vote) AND under concealment (it carries a review flag); collapsing
// them hides one of the two reasons it needs attention.
//
// ── The two-tier order (AC2, D2) ──────────────────────────────────────────────────────────────
// `epics.md:3579` asks for deadline-proximity sorting and `epics.md:3587` then carves moderation out
// of it. Verified against live source: THREE MORE sources are equally undated —
// `CycleFreezePendingCase` (cycle-freeze-read.ts:50-63) has no temporal field, `R9QueueItem`
// (r9-voting-read.ts:38-48) has none, and concealment is a flag on a cycle-freeze row. Only
// reconciliation ships a `deadlineAt`, and only appeals can derive one. So the epic's carve-out is
// GENERALIZED rather than special-cased: dated rows first (ascending), undated rows after (age
// descending), ties total and deterministic. Fabricating a per-category deadline to make the sort
// look uniform was rejected — inventing governance data to satisfy a sort is the exact failure this
// codebase's "record un-attested, never backfill" discipline exists to prevent.

import type { CycleFreezePendingCase, CycleFreezePendingList } from '../claim/cycle-freeze-read.js';
import { CONCEALMENT_REVIEW_REQUIRED_FLAG } from '../claim/cycle-freeze-read.js';
import type { AppealStageSlaDays } from '../claim/appeal.js';
import { DEFAULT_APPEAL_STAGE_SLA_DAYS } from '../claim/appeal.js';
import type { OpenAppealCase } from '../claim/appeal-read.js';
import type { R9QueueItem } from '../claim/r9-voting-read.js';
import type { ModeratedMemberEntry } from '../member/moderation/read.js';
import type { ReconciliationCaseRow } from '../reconciliation/reconciliation-review-read.js';
import {
  SEVERITY_FORBIDDEN_CATEGORIES,
  TRUSTEE_SIGNAL_CATEGORIES,
  type TrusteeSignalCategory,
  type TrusteeSignalRow,
  type TrusteeSignalSeverity,
} from './types.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The "due soon" lead window for a trustee-attention item (AC3). DELIBERATELY NOT the helpdesk's
 * `SLA_DUE_SOON_WINDOW_MS` (4h): that is a quarter of a 24h first-response budget, whereas these
 * deadlines are multi-day (a 14-day Stage-1 appeal SLA, a calendar-aware reconciliation tail). 48h
 * is roughly "you have one more working day" on a governance worklist. Operations policy — the
 * severity VOCABULARY is reused from `sla.ts`; only the window is re-tuned for this cadence.
 */
export const TRUSTEE_DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

/** The declared-order index of a category — the AC2 tie-break's first key. */
function categoryRank(category: TrusteeSignalCategory): number {
  return TRUSTEE_SIGNAL_CATEGORIES.indexOf(category);
}

/**
 * Derive a row's severity band (AC3), reusing the `sla.ts` vocabulary: `breached` (past due) ≻
 * `due_soon` (within the lead window) ≻ `on_track`.
 *
 * Returns `null` — never a band — when:
 *   · the category is `moderation` or `violator_flag`. STRUCTURAL, checked FIRST so it holds even if
 *     such a row somehow carried a `deadlineAt`. `epics.md:3587`: *"a severity score on a moderation
 *     row would itself be a recommendation"* — and a recommendation is precisely what this surface
 *     must never make. A revert-sanity test proves the pin has teeth.
 *   · the row carries no `deadlineAt`. There is no timer to run, and "on_track" over an undated row
 *     would assert a reassurance the data cannot support.
 *
 * Every row in these lists is by construction OPEN (each source read selects only unresolved items),
 * so the `sla.ts` running/stopped distinction collapses: the timer is always running.
 */
export function deriveSignalSeverity(
  row: Pick<TrusteeSignalRow, 'category' | 'deadlineAt'>,
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalSeverity | null {
  if (SEVERITY_FORBIDDEN_CATEGORIES.has(row.category)) return null;
  if (row.deadlineAt === null) return null;
  const msRemaining = row.deadlineAt.getTime() - now.getTime();
  if (msRemaining < 0) return 'breached';
  if (msRemaining <= dueSoonWindowMs) return 'due_soon';
  return 'on_track';
}

/** `now - raisedAt` in ms, clamped at 0 (a future-dated instant is 0-aged, never negative). */
function ageOf(raisedAt: Date | null, now: Date): number | null {
  if (raisedAt === null) return null;
  return Math.max(0, now.getTime() - raisedAt.getTime());
}

/**
 * The two-tier trustee ordering (AC2). TOTAL and DETERMINISTIC — the same input always yields the
 * same output, and no two distinct rows ever compare equal.
 *
 *   1. Rows with a non-null `deadlineAt` come FIRST, ascending (soonest deadline first).
 *   2. Rows with `deadlineAt === null` come after, by AGE DESCENDING (longest-waiting first).
 *      A row whose source carries no instant at all (`ageMs === null` — cycle-freeze, R9,
 *      concealment) sorts after every aged row in this tier rather than being treated as age 0 in
 *      either direction; it is unknown-aged, not new and not old.
 *   3. Ties break on `(categoryRank, resourceId, sourceKey)`. `sourceKey` is load-bearing for
 *      TOTALITY, not decoration: two reconciliation cases on the same pool (a mismatch and a manual
 *      transcription) share both category and `resourceId`.
 *
 * Non-mutating — returns a new array; the caller's input order is irrelevant to the result.
 */
export function orderTrusteeSignals(rows: readonly TrusteeSignalRow[]): TrusteeSignalRow[] {
  return [...rows].sort((a, b) => {
    const aDated = a.deadlineAt !== null;
    const bDated = b.deadlineAt !== null;
    if (aDated !== bDated) return aDated ? -1 : 1;

    if (aDated && bDated) {
      const delta = a.deadlineAt!.getTime() - b.deadlineAt!.getTime();
      if (delta !== 0) return delta;
    } else {
      // Undated tier: age descending, with unknown age (null) last.
      const aAge = a.ageMs;
      const bAge = b.ageMs;
      if (aAge === null || bAge === null) {
        if (aAge !== bAge) return aAge === null ? 1 : -1;
      } else if (aAge !== bAge) {
        return bAge - aAge;
      }
    }

    const byCategory = categoryRank(a.category) - categoryRank(b.category);
    if (byCategory !== 0) return byCategory;
    if (a.resourceId !== b.resourceId) return a.resourceId < b.resourceId ? -1 : 1;
    if (a.sourceKey !== b.sourceKey) return a.sourceKey < b.sourceKey ? -1 : 1;
    return 0;
  });
}

/** Assemble one row, deriving `ageMs` + `severity` consistently (the single construction path). */
function buildRow(
  base: Omit<TrusteeSignalRow, 'ageMs' | 'severity'>,
  now: Date,
  dueSoonWindowMs: number,
): TrusteeSignalRow {
  return {
    ...base,
    ageMs: ageOf(base.raisedAt, now),
    severity: deriveSignalSeverity(base, now, dueSoonWindowMs),
  };
}

// ── Per-source normalizers (AC1) ─────────────────────────────────────────────────────────────

/** The three cycle-freeze buckets, flattened with their bucket recorded in the label + source key. */
type CycleFreezeBucket = 'ready_to_freeze' | 'escalated' | 'voted_pending_commit';

function eachCycleFreezeCase(
  list: CycleFreezePendingList,
): Array<{ bucket: CycleFreezeBucket; kase: CycleFreezePendingCase }> {
  return [
    ...list.readyToFreeze.map((kase) => ({ bucket: 'ready_to_freeze' as const, kase })),
    ...list.escalated.map((kase) => ({ bucket: 'escalated' as const, kase })),
    ...list.votedPendingCommit.map((kase) => ({ bucket: 'voted_pending_commit' as const, kase })),
  ];
}

/**
 * Story 6.13 → `cycle_freeze` rows. All three buckets flatten into the section; the bucket rides the
 * label + `sourceKey` so a trustee can tell "awaiting my vote" from "already voted, awaiting commit".
 * NO deadline and NO instant — `CycleFreezePendingCase` carries neither (D2), and AC1 forbids
 * changing the shipped read to add one.
 */
export function normalizeCycleFreezeSignals(
  list: CycleFreezePendingList,
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return eachCycleFreezeCase(list).map(({ bucket, kase }) =>
    buildRow(
      {
        category: 'cycle_freeze',
        sourceKey: `cycle_freeze:${bucket}:${kase.claimCaseId}`,
        resourceId: kase.claimCaseId,
        claimCaseId: kase.claimCaseId,
        // NON-PII only (AC8): the bucket, the machine state, the reason CODE. Never the rationale
        // (it is ciphertext as stored) and never a name — the canonical surface decrypts, not this.
        label: `${bucket} · ${kase.signalsSummary}${kase.verifierReasonCode ? ` · ${kase.verifierReasonCode}` : ''}${kase.routedToR9 ? ' · routed_to_r9' : ''}`,
        raisedAt: null,
        deadlineAt: null,
        crossLinkKind: 'cycle_freeze',
      },
      now,
      dueSoonWindowMs,
    ),
  );
}

/**
 * Story 6.15 → `concealment` rows. A FILTER over the SAME `getCycleFreezePending` result (D6), never
 * a second query: the read already ran `assessClaimConcealmentBulk` (one clamped assessment read for
 * the whole page + the R14 clause resolved once per Pariwar) and surfaced `concealmentFlags`. This
 * keeps the section's flag identical to the verifier console's by construction.
 *
 * Cross-links to the per-claim VERIFY surface (where a concealment flag is actually adjudicated), not
 * to the freeze queue.
 */
export function normalizeConcealmentSignals(
  list: CycleFreezePendingList,
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return eachCycleFreezeCase(list)
    .filter(({ kase }) => kase.concealmentFlags.includes(CONCEALMENT_REVIEW_REQUIRED_FLAG))
    .map(({ kase }) =>
      buildRow(
        {
          category: 'concealment',
          sourceKey: `concealment:${kase.claimCaseId}`,
          resourceId: kase.claimCaseId,
          claimCaseId: kase.claimCaseId,
          label: `${CONCEALMENT_REVIEW_REQUIRED_FLAG} · ${kase.currentState}`,
          raisedAt: null,
          deadlineAt: null,
          crossLinkKind: 'claim_verify',
        },
        now,
        dueSoonWindowMs,
      ),
    );
}

/**
 * Story 6.14 → `r9_voting` rows. `R9QueueItem` carries no temporal field (D2), so undated. The
 * routing actor's display IS a controlled non-PII snapshot (the R5 display convention), so it is
 * safe on the label; the reason code is a machine code.
 */
export function normalizeR9VotingSignals(
  items: readonly R9QueueItem[],
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return items.map((item) =>
    buildRow(
      {
        category: 'r9_voting',
        sourceKey: `r9_voting:${item.claimCaseId}`,
        resourceId: item.claimCaseId,
        claimCaseId: item.claimCaseId,
        label: `${item.sessionOpen ? 'session_open' : 'awaiting_session'}${item.routingReasonCode ? ` · ${item.routingReasonCode}` : ''} · routed by ${item.routingActorDisplay}`,
        raisedAt: null,
        deadlineAt: null,
        crossLinkKind: 'r9_voting',
      },
      now,
      dueSoonWindowMs,
    ),
  );
}

/**
 * Story 6.16 → `appeal` rows. One of only TWO dated categories: the deadline is DERIVED as
 * `stageEnteredAt + DEFAULT_APPEAL_STAGE_SLA_DAYS[stage]` (`claim/appeal.ts:180` — stage1:14,
 * stage2:21, stage3:14), and `raisedAt` is the same stage-entry instant.
 *
 * ⚠ That SLA is INDICATIVE ONLY (`appeal.ts:169-171`, D-E): a breach surfaces as a flag; it never
 * blocks, expires, or gates the claimant's right to initiate or continue an appeal. Rendering it as
 * a deadline here orders the TRUSTEE's worklist — it asserts nothing about the claimant's rights.
 *
 * `slaDays` is injectable because a Pariwar may carry a `pariwar_appeal_config` override; the caller
 * passes it if it has read one, and the v1 default applies otherwise.
 */
export function normalizeAppealSignals(
  cases: readonly OpenAppealCase[],
  now: Date,
  slaDays: AppealStageSlaDays = DEFAULT_APPEAL_STAGE_SLA_DAYS,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return cases.map((kase) => {
    const days = kase.stage === '1' ? slaDays.stage1 : kase.stage === '2' ? slaDays.stage2 : slaDays.stage3;
    const deadlineAt = new Date(kase.stageEnteredAt.getTime() + days * MS_PER_DAY);
    return buildRow(
      {
        category: 'appeal',
        sourceKey: `appeal:${kase.appealId}`,
        resourceId: kase.claimCaseId,
        claimCaseId: kase.claimCaseId,
        label: `stage_${kase.stage}${kase.initiatedOnBehalf ? ' · on_behalf' : ''}`,
        raisedAt: kase.stageEnteredAt,
        deadlineAt,
        crossLinkKind: 'claim_verify',
      },
      now,
      dueSoonWindowMs,
    );
  });
}

/**
 * Story 9.8 → `reconciliation` rows. The other dated category, and the only source that ships a REAL
 * `deadlineAt` (the calendar-aware reconciliation tail). It is legitimately NULLABLE — a case whose
 * cycle has no derivable tail carries none, and that row degrades into the undated tier exactly like
 * the four structurally-undated sources rather than being dropped or back-filled.
 *
 * `resourceId` is the pool (the reconciliation surface is pool-scoped); `memberId` rides the label
 * only when present, as an ID — no identity is resolved here (AC8).
 */
export function normalizeReconciliationSignals(
  rows: readonly ReconciliationCaseRow[],
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return rows.map((row) =>
    buildRow(
      {
        category: 'reconciliation',
        sourceKey: row.caseKey,
        resourceId: row.poolId,
        claimCaseId: null,
        label: `${row.caseType}${row.mismatchReason ? ` · ${row.mismatchReason}` : ''}${row.memberId ? ` · member ${row.memberId}` : ''}`,
        raisedAt: row.raisedAt,
        deadlineAt: row.deadlineAt,
        crossLinkKind: 'reconciliation_review',
      },
      now,
      dueSoonWindowMs,
    ),
  );
}

/**
 * Story 10.10 Decision 9 → `moderation` rows. `since` (the latest action instant) IS a real instant,
 * so these rows ARE aged and sort meaningfully in the undated tier — but they carry NO deadline and,
 * structurally, NO severity (AC3). `actorDisplay` is a controlled non-PII snapshot; `reasonCode` is
 * a frozen registry code. No rationale, ever — that is Tier-1 ciphertext behind its own route.
 */
export function normalizeModerationSignals(
  entries: readonly ModeratedMemberEntry[],
  now: Date,
  dueSoonWindowMs: number = TRUSTEE_DUE_SOON_WINDOW_MS,
): TrusteeSignalRow[] {
  return entries.map((entry) =>
    buildRow(
      {
        category: 'moderation',
        sourceKey: `moderation:${entry.memberId}`,
        resourceId: entry.memberId,
        claimCaseId: null,
        // Descriptive of the RECORD, never of what the trustee should do about it (AC5).
        label: `${entry.status} · ${entry.reasonCode} · by ${entry.actorDisplay}`,
        raisedAt: entry.since,
        deadlineAt: null,
        crossLinkKind: 'member_record',
      },
      now,
      dueSoonWindowMs,
    ),
  );
}

// ── The composed normalizer (AC1/AC6) ────────────────────────────────────────────────────────

/**
 * The already-materialized source rows, one OPTIONAL field per section.
 *
 * Optionality is load-bearing (AC6): the handler passes a source ONLY when the caller holds that
 * section's permission key, so an ABSENT input produces an ABSENT section — never a present-but-empty
 * one. An empty `r9_voting` array would tell an actor without `claim.r9_vote` that there are zero R9
 * cases, which is an existence oracle. Absent ≠ empty, all the way down.
 *
 * `cycleFreeze` and `concealment` take the SAME `CycleFreezePendingList` because they are two lenses
 * over one read (D6) — passing it twice costs no query and keeps the sections independently gated.
 */
export interface TrusteeSignalSources {
  readonly cycleFreeze?: CycleFreezePendingList;
  readonly concealment?: CycleFreezePendingList;
  readonly r9Voting?: readonly R9QueueItem[];
  readonly appeal?: readonly OpenAppealCase[];
  readonly reconciliation?: readonly ReconciliationCaseRow[];
  readonly moderation?: readonly ModeratedMemberEntry[];
}

/** The six normalized, independently-ordered sections. A missing key ≡ "not permitted" (AC6). */
export type TrusteeSignalSections = Partial<
  Record<Exclude<TrusteeSignalCategory, 'violator_flag'>, TrusteeSignalRow[]>
>;

export interface NormalizeTrusteeSignalsOptions {
  /** Per-Pariwar appeal SLA override; the v1 defaults apply when absent. */
  readonly appealSlaDays?: AppealStageSlaDays;
  readonly dueSoonWindowMs?: number;
}

/**
 * Normalize every SUPPLIED source into `TrusteeSignalRow`s and order each section by the AC2 two-tier
 * rule (AC1). PURE — `now` is injected, nothing here reads a clock or a database.
 *
 * Ordering is applied PER SECTION, not across the whole set: the category IS the "stage" grouping
 * `prd.md:876` asks to sort by, and `epics.md:3579`'s deadline-proximity is the WITHIN-group order.
 * The two artifacts agree once read that way.
 */
export function normalizeTrusteeSignals(
  sources: TrusteeSignalSources,
  now: Date,
  opts: NormalizeTrusteeSignalsOptions = {},
): TrusteeSignalSections {
  const window = opts.dueSoonWindowMs ?? TRUSTEE_DUE_SOON_WINDOW_MS;
  const sections: TrusteeSignalSections = {};

  if (sources.cycleFreeze !== undefined) {
    sections.cycle_freeze = orderTrusteeSignals(normalizeCycleFreezeSignals(sources.cycleFreeze, now, window));
  }
  if (sources.r9Voting !== undefined) {
    sections.r9_voting = orderTrusteeSignals(normalizeR9VotingSignals(sources.r9Voting, now, window));
  }
  if (sources.concealment !== undefined) {
    sections.concealment = orderTrusteeSignals(normalizeConcealmentSignals(sources.concealment, now, window));
  }
  if (sources.appeal !== undefined) {
    sections.appeal = orderTrusteeSignals(
      normalizeAppealSignals(sources.appeal, now, opts.appealSlaDays ?? DEFAULT_APPEAL_STAGE_SLA_DAYS, window),
    );
  }
  if (sources.reconciliation !== undefined) {
    sections.reconciliation = orderTrusteeSignals(
      normalizeReconciliationSignals(sources.reconciliation, now, window),
    );
  }
  if (sources.moderation !== undefined) {
    sections.moderation = orderTrusteeSignals(normalizeModerationSignals(sources.moderation, now, window));
  }

  return sections;
}

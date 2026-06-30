// Vyawastha Shulk renewal-status read accessor — Story 3.8 (Task 1; AC4/AC5).
//
// The canonical `vyawastha_shulk_status` payload Epic 4's Validity Service (FR-12A) will consume:
// `{ paidThrough, daysUntilGraceEnds, inRenewalGrace, graceRemainingDays }`. It composes two reads
// already present — `getMemberStateAt` (the replayed lifecycle state, the AUTHORITY for grace) +
// `getLatestReceipt` (the `validThrough` horizon) — at a caller-supplied `atTimestamp`, so the read is
// truthful AS-OF any historical instant (AC5: the future claim evaluator reads what was true at
// time-of-death). Domain reads `events_log`/receipts directly (no `@twt/events` import — same precedent
// as `getMemberStateAt`/`getLockInClock`; see read.ts header).
//
// ── Naming (load-bearing, Task 1 / Decision 2) ──────────────────────────────────────────────────────
// The internal field is `daysUntilGraceEnds`, NOT `daysUntilLapse` — it counts to the grace-end /
// lapse boundary (`validThrough + 91d`, the instant `lapsed-unpaid` begins per PRD FR-1A line 249).
// The WIRE field stays `days_until_lapse` (the FR-12A vocabulary, PRD line 252); the contract boundary
// (apps/api handler) maps the rename. The state — NOT raw date math — is the authority for grace:
// `inRenewalGrace = (state === 'active-in-grace')`, derived from the replayed `getMemberStateAt`.
//
// ── Leap-safe date math (Decision 2 / the 3.6b P9 fix) ──────────────────────────────────────────────
// The +91d boundary is computed with `setDate` (calendar-day arithmetic), NOT 91×fixed-ms — fixed-ms
// is a day short across a leap day for ~25% of cohorts. The remaining-days figure is `ceil`-clamped
// (the calm-time framing 3.7 established) so a member 0.5 days from the boundary reads "1 day", never 0.

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { getLatestReceiptAt } from '../payment/receipt-read.js';
import { getMemberStateAt } from './read.js';
import type { MemberLifecycleState } from './state.js';

/** Whole days in milliseconds — the divisor for the `ceil`-clamped remaining-days figures. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The grace window past `validThrough` before `lapsed-unpaid` begins (PRD FR-1A line 249: Day +91). */
const GRACE_END_OFFSET_DAYS = 91;

/**
 * The canonical renewal-status snapshot (domain camelCase; the contract maps it to the FR-12A wire
 * shape). `daysUntilGraceEnds`/`graceRemainingDays`/`paidThrough` are `null` when the member has never
 * paid (no receipt → no horizon). `daysUntilGraceEnds` is the days to the `validThrough + 91d` boundary
 * regardless of state; `graceRemainingDays` is the same figure but ONLY while actually in grace.
 */
export interface VyawasthaShulkRenewalStatus {
  /** Latest receipt `validThrough` (= `paid_at + 365d`), or null when never paid. */
  paidThrough: Date | null;
  /** Days (ceil, ≥0) until the grace-end/lapse boundary; null when never paid. */
  daysUntilGraceEnds: number | null;
  /** True iff the replayed state is `active-in-grace` (the state is the authority, not date math). */
  inRenewalGrace: boolean;
  /** `daysUntilGraceEnds` while in grace; null outside grace. */
  graceRemainingDays: number | null;
}

/** The pure derive seam's input — the replayed state + the latest `validThrough` (null = never paid). */
export interface VyawasthaShulkStatusInput {
  state: MemberLifecycleState;
  validThrough: Date | null;
}

/**
 * Compute the grace-end / lapse boundary `validThrough + 91 days`, leap-safe (`setDate`, NOT fixed-ms).
 */
function graceEndBoundary(validThrough: Date): Date {
  const boundary = new Date(validThrough);
  boundary.setDate(boundary.getDate() + GRACE_END_OFFSET_DAYS);
  return boundary;
}

/** `ceil`-clamped whole days from `atTimestamp` to `boundary` (never negative — clamped ≥0). */
function daysUntil(boundary: Date, atTimestamp: Date): number {
  const ms = boundary.getTime() - atTimestamp.getTime();
  return Math.max(0, Math.ceil(ms / MS_PER_DAY));
}

/**
 * Pure (DB-free): derive the renewal-status snapshot from the replayed state + the latest `validThrough`
 * at `atTimestamp`. Extracted as a unit-testable seam (mirrors `deriveLockInClock`/`replayMemberState`).
 * Grace membership comes from the STATE (`active-in-grace`), the day-counts from the `validThrough + 91d`
 * boundary; both `null` when the member never paid.
 */
export function deriveVyawasthaShulkStatus(
  input: VyawasthaShulkStatusInput,
  atTimestamp: Date,
): VyawasthaShulkRenewalStatus {
  if (input.validThrough === null) {
    return {
      paidThrough: null,
      daysUntilGraceEnds: null,
      inRenewalGrace: false,
      graceRemainingDays: null,
    };
  }
  const inRenewalGrace = input.state === 'active-in-grace';
  const daysUntilGraceEnds = daysUntil(graceEndBoundary(input.validThrough), atTimestamp);
  return {
    paidThrough: input.validThrough,
    daysUntilGraceEnds,
    inRenewalGrace,
    graceRemainingDays: inRenewalGrace ? daysUntilGraceEnds : null,
  };
}

/**
 * Read the member's canonical renewal status as of `atTimestamp` (AC4/AC5). Composes the replayed
 * lifecycle state (`getMemberStateAt` — stream_id is globally unique, not tenant-scoped) + the latest
 * receipt horizon (`getLatestReceipt` — tenant-scoped, takes `pariwarId`), then derives via the pure
 * seam. Computed live per request (no cache) → trivially within the FR-12A ≤60s freshness budget.
 */
export async function getVyawasthaShulkStatus(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<VyawasthaShulkRenewalStatus> {
  const state = await getMemberStateAt(db, memberId, atTimestamp);
  const latest = await getLatestReceiptAt(db, pariwarId, memberId, atTimestamp);
  return deriveVyawasthaShulkStatus(
    { state, validThrough: latest?.validThrough ?? null },
    atTimestamp,
  );
}

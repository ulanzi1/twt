// Member self-verify recovery READ — Story 9.7 (Task 4; AC1/AC2).
//
// "Does THIS member have an unresolved reconciliation MISMATCH on a given pool — what reason, has a
// self-verify screenshot already been uploaded, and where is the recovery in its lifecycle?" — the
// server-authoritative state that powers the `<SelfVerifySurface>` (default / uploaded / resolved) and
// the My Pool card's red-pill entry (AC1).
//
// ── A member SELF-view, hard-scoped to the caller's own memberId (FR-12A / history.ts D1) ─────────────
// Exactly the discipline `getMemberAttestedContribution` uses: the confirmed / mismatch / reversal
// lookups are EXACT event-type + (member, pool) payload-key matches — a yellow attestation (a different
// event type) can never satisfy any of them, and the read NEVER surfaces another member's state.
//
// ── It DERIVES; it never adjudicates (AC4, load-bearing) ──────────────────────────────────────────────
// This read is pure observation over `events_log`. It reuses the frozen 5-state derivation's building
// blocks ({@link hasLiveConfirmation}, `CONTRIBUTION_MISMATCH_EVENT_TYPE`) — it adds no state and re-tunes
// no precedence. `resolved` means a LIVE `contribution.confirmed` exists (the matcher or the Story 9.8
// trustee flow confirmed); a self-verify screenshot NEVER moves a member here on its own.

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId } from '../ids/index.js';
import {
  RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
  RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
} from '../reconciliation/events.js';
import { eventsLog } from '../schema/events_log.js';
import type { ContributionMismatchReason } from './events.js';
import { ContributionMismatchReasonSchema } from './events.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from './history.js';
import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
  hasLiveConfirmation,
  REVERSED_CONFIRMED_EVENT_ID_KEY,
} from './read.js';

/**
 * The self-verify recovery lifecycle state (UX §11 `<SelfVerifySurface>`):
 *   · `default`  — an unresolved mismatch (or a fallback entry), NO screenshot uploaded yet.
 *   · `uploaded` — a self-verify screenshot has been uploaded and is awaiting Story 9.8 staff review;
 *                  no LIVE confirmation has landed since.
 *   · `resolved` — a LIVE `contribution.confirmed` exists (the matcher / the 9.8 trustee flow confirmed).
 */
export const SELF_VERIFY_STATUSES = ['default', 'uploaded', 'resolved'] as const;
export type SelfVerifyStatus = (typeof SELF_VERIFY_STATUSES)[number];

/** The member self-verify recovery state for ONE (member, pool). */
export interface MemberSelfVerifyState {
  /** An UNRESOLVED reconciliation mismatch (red) exists for (member, pool) — a live mismatch, not confirmed. */
  readonly mismatch: boolean;
  /** The machine reason-code of that mismatch (latest), mapped to dignified empathy copy at the surface;
   *  `null` when there is no live mismatch (e.g. a "Trouble with UTR?" fallback on a still-verifying pool). */
  readonly reason: ContributionMismatchReason | null;
  /** A self-verify screenshot has been uploaded for (member, pool) at least once. */
  readonly screenshotUploaded: boolean;
  /** The recovery lifecycle state driving the surface (default / uploaded / resolved). */
  readonly status: SelfVerifyStatus;
}

/** A member with nothing on record for the pool — no mismatch, no upload, not resolved. */
const NEUTRAL: MemberSelfVerifyState = {
  mismatch: false,
  reason: null,
  screenshotUploaded: false,
  status: 'default',
};

/** Defensive upper bound on verdict/upload rows for one (member, pool) — a fixed guard, never a
 *  user-influenced page size (the history.ts `.limit(500)` literal precedent). The `.limit()` below uses
 *  the INTEGER LITERAL `500` (the domain-accessor-invariants forced-pagination gate accepts a literal for a
 *  fixed bound but flags a named-const reference); this exported constant MUST stay in sync with it. */
export const MAX_SELF_VERIFY_ROWS = 500;

/**
 * Resolve the member's self-verify recovery state for ONE pool (AC1/AC2). Hard-scoped to the caller's own
 * `memberId` (D1) + tenant. Batched event read (the history.ts precedent — one query, never per-row):
 *   · `resolved` iff a LIVE (non-reversed) `contribution.confirmed` exists for (member, pool);
 *   · else `uploaded` iff a `reconciliation.self-verify-screenshot-uploaded` exists (no later confirmation);
 *   · else `default`.
 * `mismatch` is true iff a `contribution.reconciliation-mismatch` exists AND the member is not live-confirmed
 * (a confirmation supersedes a stale mismatch); `reason` is that mismatch's latest reason-code.
 */
export async function resolveMemberSelfVerifyState(
  db: Db,
  { pariwarId, memberId, poolId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId; readonly poolId: PoolId },
): Promise<MemberSelfVerifyState> {
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      eventId: eventsLog.eventId,
      occurredAt: eventsLog.occurredAt,
      reason: sql<string | null>`${eventsLog.payload} ->> 'reason'`,
      reversedConfirmedEventId: sql<string | null>`${eventsLog.payload} ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY}`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        inArray(eventsLog.eventType, [
          CONFIRMED_EVENT_TYPE,
          CONTRIBUTION_MISMATCH_EVENT_TYPE,
          RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
          RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
        ]),
        // The member-scope guard (D1) — never another member's state — + the pool scope.
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_MEMBER_KEY} = ${memberId}`,
        sql`${eventsLog.payload} ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = ${poolId}`,
      ),
    )
    .orderBy(desc(eventsLog.occurredAt), desc(eventsLog.eventId))
    // Integer literal (NOT MAX_SELF_VERIFY_ROWS) — the forced-pagination invariant gate accepts a literal
    // for a fixed bound but flags a named-const reference. Keep this `500` in sync with the constant.
    .limit(500);

  if (rows.length === 0) return NEUTRAL;

  const confirmedEventIds: string[] = [];
  const reversedConfirmedEventIds = new Set<string>();
  let mismatchExists = false;
  let latestReason: ContributionMismatchReason | null = null;
  let screenshotUploaded = false;

  // Rows are newest-first, so the FIRST mismatch reason we see is the latest (occurred_at DESC).
  for (const r of rows) {
    switch (r.eventType) {
      case CONFIRMED_EVENT_TYPE:
        confirmedEventIds.push(r.eventId);
        break;
      case RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE:
        if (typeof r.reversedConfirmedEventId === 'string' && r.reversedConfirmedEventId.length > 0) {
          reversedConfirmedEventIds.add(r.reversedConfirmedEventId);
        }
        break;
      case CONTRIBUTION_MISMATCH_EVENT_TYPE: {
        mismatchExists = true;
        if (latestReason === null) {
          const parsed = ContributionMismatchReasonSchema.safeParse(r.reason);
          if (parsed.success) latestReason = parsed.data;
        }
        break;
      }
      case RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE:
        screenshotUploaded = true;
        break;
      default:
        break;
    }
  }

  const confirmed = hasLiveConfirmation(confirmedEventIds, reversedConfirmedEventIds);
  // A live confirmation supersedes a stale mismatch (the monotonic re-confirm — never permanently red).
  const mismatch = mismatchExists && !confirmed;

  const status: SelfVerifyStatus = confirmed ? 'resolved' : screenshotUploaded ? 'uploaded' : 'default';

  return {
    mismatch,
    reason: mismatch ? latestReason : null,
    screenshotUploaded,
    status,
  };
}

// `account-frozen` governance overlay — Story 3.1 (Task 6; AC5).
//
// `account-frozen` is a DERIVED governance overlay, ORTHOGONAL to the primary member
// lifecycle state machine. It is NOT a `member_lifecycle_state` enum label and is
// NEVER written to `members.state`. A member can be (e.g.) `active` AND `account-frozen`
// simultaneously; both are queryable independently and together. The overlay is
// event-derived and replay-safe:
//   · a `claim.intake_initiated` event with THIS member as the deceased subject
//     → account-frozen = true (since `occurred_at`),
//   · claim-case resolution (`claim.settled` / `claim.denied_no_appeal`, configurable
//     policy) → overlay removed.
// Load-bearing for Module Shelf suppression (Epic 12 Story 12.4) + future consumers.
//
// ── This is the SEAM, not the wiring (the claim event source is Story 6.1) ────
// Claim events live on CLAIM streams (one stream per claim, Story 6.x) and reference
// the deceased member via `payload.deceased_member_id`. Story 6.1 does NOT exist yet,
// so today the query below matches zero rows and the overlay is always not-frozen.
// The SEAM is fully built: `evaluateAccountOverlay` is the deterministic evaluator and
// `getMemberAccountOverlay` is the single query surface — Epic 6 / Epic 12 wire the
// claim source to THIS function and never re-implement claim-case-existence logic
// (AC5). The Story 6.1 contract this seam pins: a claim intake event of type
// `claim.intake_initiated` carrying `deceased_member_id` in its payload.

import { and, asc, inArray, lte, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';

/** The claim event that FREEZES the deceased member's account (Story 6.1 contract). */
export const ACCOUNT_FREEZE_EVENT_TYPE = 'claim.intake_initiated';

/** Claim-resolution events that REMOVE the overlay (configurable policy, Story 6.x). */
export const ACCOUNT_UNFREEZE_EVENT_TYPES = ['claim.settled', 'claim.denied_no_appeal'] as const;

/** The overlay-relevant claim event types (freeze + unfreeze). */
const OVERLAY_EVENT_TYPES = [ACCOUNT_FREEZE_EVENT_TYPE, ...ACCOUNT_UNFREEZE_EVENT_TYPES];

/** A minimal claim-lifecycle event the overlay evaluator folds over. */
export interface AccountOverlayEventInput {
  readonly type: string;
  readonly occurredAt: Date;
  /**
   * The claim stream (claim_case_id) this event belongs to (Story 6.4 — AGGREGATE overlay).
   * Optional: DB-free unit tests / single-claim callers may omit it, in which case all events
   * fold into ONE aggregate group (identical to the pre-6.4 last-wins behaviour). When present,
   * the evaluator folds per-claim and the account is frozen iff ANY claim stream is currently
   * frozen — so a single claim's settle/deny can never clear a freeze that ANOTHER claim (e.g. an
   * ICP-overridden separate case, Story 6.4) still needs.
   */
  readonly streamId?: string;
}

/** The derived overlay verdict. NOT a member lifecycle state. */
export interface AccountOverlay {
  /** True iff an active (unresolved) claim case names this member as the deceased. */
  accountFrozen: boolean;
  /** When the current freeze began (the freezing event's `occurred_at`), else null. */
  frozenSince: Date | null;
}

/** The sentinel group key for events with no `streamId` (single-claim / DB-free callers). */
const DEFAULT_STREAM_KEY = '__default__';

/**
 * Deterministic, replay-safe evaluator: fold an ORDERED list of overlay-relevant claim events
 * into the overlay verdict. Pure (no I/O, no clock). Exposed so Epic 6 / Epic 12 can evaluate
 * without re-implementing claim-existence logic.
 *
 * ── AGGREGATE over claim streams (Story 6.4) ──────────────────────────────────
 * Each claim stream is folded independently (a freeze sets that claim's overlay; a resolution
 * clears it; the last applicable event PER STREAM wins). The account is then frozen iff ANY
 * claim stream is currently frozen — the aggregate. `frozenSince` is the EARLIEST still-active
 * freeze instant (the account has been continuously frozen since then). This makes the freeze
 * correct when more than one claim exists for one deceased member (ICP override, Story 6.4): a
 * single claim's `settled`/`denied_no_appeal` no longer clears a freeze another claim still
 * needs. Events with no `streamId` fold into one group → identical to the pre-6.4 last-wins
 * behaviour (single-claim callers + DB-free unit tests are unaffected).
 */
export function evaluateAccountOverlay(
  events: readonly AccountOverlayEventInput[],
): AccountOverlay {
  // Per-claim last-wins fold (events arrive in a deterministic total order).
  const perStream = new Map<string, { frozen: boolean; since: Date | null }>();
  for (const e of events) {
    const key = e.streamId ?? DEFAULT_STREAM_KEY;
    if (e.type === ACCOUNT_FREEZE_EVENT_TYPE) {
      perStream.set(key, { frozen: true, since: e.occurredAt });
    } else if ((ACCOUNT_UNFREEZE_EVENT_TYPES as readonly string[]).includes(e.type)) {
      perStream.set(key, { frozen: false, since: null });
    }
  }

  // Aggregate: frozen iff ANY claim stream is currently frozen; frozenSince = earliest active.
  let accountFrozen = false;
  let frozenSince: Date | null = null;
  for (const s of perStream.values()) {
    if (s.frozen && s.since !== null) {
      accountFrozen = true;
      if (frozenSince === null || s.since < frozenSince) frozenSince = s.since;
    }
  }
  return { accountFrozen, frozenSince };
}

/**
 * The single query surface (AC5): the `account-frozen` overlay for a member as of
 * `atTimestamp`. Loads the overlay-relevant claim events naming this member as the
 * deceased (bounded by the instant), in a deterministic total order, then folds them.
 *
 * Ordered by (occurred_at, stream_id, event_version) for a stable total order across
 * potentially multiple claim streams (event_version is per-stream, so it cannot be the
 * sole key here — unlike the single-stream getMemberStateAt). Returns not-frozen today
 * (no claim source exists — Story 6.1); lights up unchanged when claim events land.
 */
export async function getMemberAccountOverlay(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<AccountOverlay> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(
      and(
        inArray(eventsLog.eventType, OVERLAY_EVENT_TYPES),
        sql`lower(${eventsLog.payload} ->> 'deceased_member_id') = lower(${memberId}::text)`,
        lte(eventsLog.occurredAt, atTimestamp),
      ),
    )
    .orderBy(asc(eventsLog.occurredAt), asc(eventsLog.streamId), asc(eventsLog.eventVersion));

  return evaluateAccountOverlay(
    // streamId (= claim_case_id) makes the fold AGGREGATE over multiple claims for one member
    // (Story 6.4): the freeze survives until the LAST associated claim reaches a terminal state.
    rows.map((r) => ({ type: r.eventType, occurredAt: r.occurredAt, streamId: r.streamId })),
  );
}

// The TERMINATION DWELL precondition — Story 10.20 (Task 6; AC8, WS-D).
//
// ── What this closes ────────────────────────────────────────────────────────────────────────────
// `epics.md:3857`, verbatim: *"`nextModerationStatus('suspended','terminate')` returns `'terminated'`
// unconditionally, so two API calls seconds apart terminate a member — and because the suspension
// notice is a best-effort post-commit job, termination can precede its own notice."*
//
// Niyamavali §8.5/§8.6 now say what the code did not. Decision `2026-08-12-099` (Q4) sets the
// parameters: **7 days**, sourced from the **versioned registry**, with elapsed dwell **satisfying**
// v1's opportunity-to-respond.
//
// ── ⭐ THE DWELL GOVERNS THE ORDINARY PATH ONLY — read this before changing anything here ────────
// The story originally specified dwell as an ABSOLUTE precondition on `terminate`. The Panel did not
// accept that framing (Q4.1), and was right not to: **principle 5 as adopted says termination
// *normally* follows suspension and principle 6 says notice and opportunity *normally* precede it.**
// Both carry an express exception. An absolute gate would have contradicted the very principles it
// was built to mechanize.
//
// ⇒ immediate termination REMAINS AVAILABLE where the authorised actor RECORDS THE REASON for
// invoking the exception (`immediate_termination_reason_ciphertext`, AC5 item 7).
// ⛔ Do not eliminate immediate termination merely because a 7-day dwell exists.
// ⛔ Invoking the exception does NOT forfeit the member's future right of appeal — that mechanism is
// Story 10.22's and is not narrowed by anything here.
//
// ── ⛔ WHY THIS IS NOT IN `nextModerationStatus` (D5) ───────────────────────────────────────────
// `nextModerationStatus` is pure, total and exhaustive; it takes no clock, no db and no policy.
// Putting dwell inside it would make it async, un-testable in isolation, and would fork the ONE
// place four call sites derive `legal_actions` from — the console's buttons would then disagree with
// the server. **A precondition is a caller's concern; legality is the reducer's.** The
// `suspended --terminate--> terminated` arm stays legal; what changes is WHEN it may be asked for.
//
// ── ⭐ `acted_at` IS THE PINNED BASE, AND THE ALTERNATIVE IS NAMED SO IT IS NOT PICKED BY ACCIDENT ─
// `getCurrentMemberModerationOverlay` is already read in-tx and already returns `since` — the
// producing event's `occurred_at`, which is the **DB** clock. It is the closer value to hand and it
// is the WRONG one: the dwell comparison's *now* is `deps.clock()`, the injected APP clock, so
// measuring against `since` compares two different clocks and the elapsed interval silently carries
// their skew. Both sides of the comparison come from the same clock, or the gate is un-testable
// ([[project_known_livedb_test_failures]] #12 — the date-bomb class: a spec that pins one side and
// lets the other default fails on a DATE, and a baseline comparison can never see it).

import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../../db.js';
import { clauseId, type ClauseId, type ClauseVersionId, type MemberId, type PariwarId } from '../../ids/index.js';
import { resolveByClauseId } from '../../niyamavali/read.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';

/**
 * The stable clause id for the moderation dwell policy.
 *
 * ⚠ It deliberately does NOT contain the substring `lock-in`, for the reason
 * `RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID` records at length: `@twt/ui`'s
 * `member-status/presenter.ts` finds the JOIN lock-in clause by SUBSTRING, and a colliding id would
 * hijack the admin panel's join-lock-in section. Pinned by test.
 */
export const MODERATION_DWELL_POLICY_CLAUSE_ID: ClauseId = clauseId('niy.moderation.dwell');

/**
 * The `niy.moderation.dwell` payload. `.passthrough()` tolerates the structural `rule_code` /
 * `title_en` / `provisional` keys every seeded clause carries — the registry payload is OPAQUE to
 * the niyamavali layer, and this resolver validates only the field it consumes.
 */
export const ModerationDwellPolicyPayloadSchema = z
  .object({
    /** ⚖ RATIFIED registry data (Decision `2026-08-12-099` Q4), never a code constant. */
    dwell_days: z.number().int().nonnegative().max(365),
  })
  .passthrough();
export type ModerationDwellPolicyPayload = z.output<typeof ModerationDwellPolicyPayloadSchema>;

/** The resolved dwell policy + the clause version it came from (the AC5 item-7 pin). */
export interface ResolvedModerationDwellPolicy {
  readonly dwellDays: number;
  readonly policyClauseVersionId: ClauseVersionId;
}

/**
 * Resolve the dwell policy in force for a Pariwar at `at`, or `null` when it is unprovisioned (or
 * its payload is malformed). `.safeParse` keeps a malformed payload non-throwing.
 *
 * ── ⛔ `null` MEANS DO NOT PERMIT THE ORDINARY TERMINATION ───────────────────────────────────────
 * ⛔ **`7` IS NEVER HARD-CODED AS A FALLBACK HERE.** Decision `2026-08-07-088` clause 2 is the
 * governing precedent: imposing under a code default is EXPLICITLY REJECTED, because it is not a
 * fallback but a sanction under a convention NO PARIWAR RATIFIED — an unratified sanction imposed by
 * a machine. The Trust runs versioned per-Pariwar rules (FR-7), and a decision must stay readable
 * against the dwell policy that actually governed it.
 *
 * ⚠ The safe direction here is to REFUSE, not to permit: an unprovisioned registry blocks the
 * ORDINARY path. It does NOT block the immediate-termination exception, which is a separate
 * governance route and is not conditioned on this clause existing.
 */
export async function resolveModerationDwellPolicy(
  db: Db,
  pariwarId: PariwarId,
  at?: Date,
): Promise<ResolvedModerationDwellPolicy | null> {
  const row = await resolveByClauseId(db, pariwarId, MODERATION_DWELL_POLICY_CLAUSE_ID, at);
  if (!row) return null;
  const parsed = ModerationDwellPolicyPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return { dwellDays: parsed.data.dwell_days, policyClauseVersionId: row.clauseVersionId };
}

/** Milliseconds in a day — the dwell is a plain elapsed-time interval, not a calendar month count. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When the ORDINARY termination path opens, given the producing suspension's `acted_at`.
 *
 * PURE and total, so the arithmetic is testable without a database. ⚠ Deliberately elapsed-time
 * rather than calendar arithmetic: `dwell_days` is a waiting period, not a membership-month count,
 * so there is no end-of-month clamping question to get wrong (contrast `addTwelveMonths`, which is
 * calendar arithmetic and does have one).
 */
export function terminationAvailableAt(suspensionActedAt: Date, dwellDays: number): Date {
  return new Date(suspensionActedAt.getTime() + dwellDays * MS_PER_DAY);
}

/**
 * Has the dwell elapsed at `now`?
 *
 * ⚠ BOTH SIDES MUST COME FROM THE SAME CLOCK. `now` is the injected app clock, and
 * `suspensionActedAt` is `member_moderation_actions.acted_at`, which the write path also sets from
 * that clock. Comparing against the overlay's `since` (the DB clock) instead would fold clock skew
 * into the interval — see the module header.
 */
export function isDwellElapsed(
  suspensionActedAt: Date,
  dwellDays: number,
  now: Date,
): boolean {
  return now.getTime() >= terminationAvailableAt(suspensionActedAt, dwellDays).getTime();
}

/**
 * The `acted_at` of the suspension that produced the member's CURRENT suspended standing.
 *
 * ⚠ IDENTIFIED BY STATUS, NOT BY AN ORDERING — and the distinction matters. The caller has already
 * established via the overlay that the member IS suspended; any later `restore` or `terminate` would
 * have moved that status, so the newest `suspend` row is necessarily the producing one. The
 * `ORDER BY` here is the mechanism for finding it, not an independent re-derivation of "latest".
 *
 * ⛔ `read.ts:190-197`'s `created_at` TIE-BREAK IS DELIBERATELY NOT IMPORTED. That tie-break exists
 * because the moderated-members list ranks rows across members where `acted_at` (injected, not
 * `DEFAULT now()`) can tie. Here there is nothing to rank: the row is already pinned by the status
 * the write path trusts, and importing a tie-break would imply this read decides something it does
 * not.
 *
 * MUST run on the SAME client as the write (the caller's scope tx) — read outside it, this is a
 * TOCTOU, exactly as the Story 10.19 Panel precondition documents.
 */
export async function getProducingSuspensionActedAt(
  db: Db,
  memberId: MemberId,
): Promise<Date | null> {
  const rows = await db
    .select({ actedAt: memberModerationActions.actedAt })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.memberId, memberId),
        eq(memberModerationActions.action, 'suspend'),
      ),
    )
    .orderBy(desc(memberModerationActions.actedAt))
    .limit(1);
  return rows[0]?.actedAt ?? null;
}

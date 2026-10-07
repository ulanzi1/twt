// Story 6.23b (Task 7; EA2–EA7, EA9; Traps 7, 15; RD4, RD12, RD15) — the LATER approvers' shared API pieces: ONE
// mapping of the warning refusals and the WAIT to each route's prefix (four translators call it — ⛔ never four copies
// of the words), the snake_case `approval_warnings` block and the reason options on the wire, and the raw SAVEPOINT the
// read surfaces run their warnings read under (a SQL error then rolls back ONLY that read — the scope tx stays usable,
// and the surface fails CLOSED: `available: false`, ⛔ never "no warnings").
// ⭐ Every message says the claim is ⛔ not refused; `details` carry codes and counts only — ⛔ never a name or a date.

import type { ApprovalWarningReasonOption, ApprovalWarningsSummary } from '@twt/contracts';
import { claim } from '@twt/domain';

import { ConflictError } from '../../http-errors.js';

/** Each route's own code prefix (Trap 7) — R9's is `r9_voting.` (RD5), ⛔ never `r9.`. */
export type LaterApprovalRoutePrefix = 'verifier_decision' | 'cycle_freeze' | 'r9_voting' | 'closure';

/** The WAIT's words (EA2 — `-277` Q3 B, `-279` A1). */
export function lateWarningWaitMessage(ownReasonExcluded: boolean, prefix: LaterApprovalRoutePrefix): string {
  const base =
    'This claim is waiting for the District Admin to record a reason for a warning that appeared after their approval. It is not refused.';
  if (!ownReasonExcluded) return base;
  // Code review round 2: at R9 finalize the excluded recorder may be an APPROVE VOTER, ⛔ not the finalizer — "a late reason
  // YOU recorded" was untrue to a finalizer who recorded nothing (the admin's `ownReasonExcludedR9` words, verbatim).
  if (prefix === 'r9_voting') {
    return `${base} A late reason recorded by an approve voter on this panel, or by the person finalizing it, cannot clear this approval — someone else who can approve claims here (the District Admin, another Pariwar Admin or the Super Admin) must record theirs.`;
  }
  return `${base} A late reason you recorded cannot clear your own approval — someone else who can approve claims here (the District Admin, another Pariwar Admin or the Super Admin) and who is not approving it themselves must record theirs.`;
}

/**
 * Map 6.23a's warning-reason refusals, the WAIT and R9's per-vote refusal to `<prefix>.<code>` 409s. Returns normally
 * when `err` is none of them (the caller's translator continues — and ends `throw err`, so an unmapped typed error would
 * be a 500). ⚠ `LateWarningReasonRefusedError` (NW14 — a late reason cannot be RECORDED) is ⛔ not mapped here: it is the
 * late-reason route's own, one word apart from `LateWarningReasonRequiredError` (the WAIT).
 */
export function translateLaterApprovalWarningError(err: unknown, prefix: LaterApprovalRoutePrefix): void {
  if (err instanceof claim.LateWarningReasonRequiredError) {
    throw new ConflictError(lateWarningWaitMessage(err.ownReasonExcluded, prefix), `${prefix}.late_warning_reason_required`, {
      kinds: [...err.kinds],
      uncovered_count: err.uncoveredCount,
      own_reason_excluded: err.ownReasonExcluded,
    });
  }
  if (err instanceof claim.ApprovalWarningReasonRequiredError) {
    throw new ConflictError(
      err.missing === 'reason'
        ? 'This claim shows a warning — choose a warning reason and write a note to approve it. The claim is not refused.'
        : 'A note is needed with the warning reason — write why you approve despite the warning. The claim is not refused.',
      `${prefix}.warning_reason_required`,
      { kinds: [...err.kinds], missing: err.missing },
    );
  }
  if (err instanceof claim.WarningReasonUngroundedError) {
    throw new ConflictError(
      'This claim shows no warning — approve it without a warning reason',
      `${prefix}.warning_reason_ungrounded`,
    );
  }
  if (err instanceof claim.WarningReasonUnavailableError) {
    throw new ConflictError(
      'That warning reason was replaced or is not on the list — please choose again',
      `${prefix}.warning_reason_unavailable`,
    );
  }
  if (err instanceof claim.R9ApproveVotesNeedWarningReasonError) {
    throw new ConflictError(
      'Some approve votes do not answer every warning now showing on this claim — each of those voters must revise their vote with a warning reason. The claim is not refused.',
      `${prefix}.approve_votes_need_warning_reason`,
      { vote_ids: [...err.voteIds], uncovered_count: err.uncoveredCount },
    );
  }
}

/**
 * RD15 — the audit's warning fields for a REFUSED approval: the kinds when the refusal knows them (`null` ⇒ OMITTED by
 * the caller — ⛔ never `[]`, which reads as "no warning showed"), the code the actor submitted, and for the WAIT its
 * `uncovered_count` + `own_reason_excluded`. `undefined` ⇔ the error is none of these.
 */
export function refusedApprovalWarningAudit(
  err: unknown,
  submittedCode: string | null,
): Record<string, unknown> | undefined {
  if (err instanceof claim.ApprovalWarningReasonRequiredError) {
    return { approval_warning_kinds: [...err.kinds], warning_reason_code: submittedCode };
  }
  // Code review 2026-10-06: every branch reports `submittedCode` — "the code the actor submitted" (above) — never
  // a field read back off the error itself, and never omitted.
  if (err instanceof claim.WarningReasonUnavailableError) return { warning_reason_code: submittedCode };
  if (err instanceof claim.WarningReasonUngroundedError) return { approval_warning_kinds: [], warning_reason_code: submittedCode };
  if (err instanceof claim.LateWarningReasonRequiredError) {
    return {
      approval_warning_kinds: [...err.kinds],
      warning_reason_code: submittedCode,
      uncovered_count: err.uncoveredCount,
      own_reason_excluded: err.ownReasonExcluded,
    };
  }
  if (err instanceof claim.R9ApproveVotesNeedWarningReasonError) {
    return { warning_reason_code: submittedCode, uncovered_count: err.uncoveredCount, vote_count: err.voteIds.length };
  }
  return undefined;
}

/** RD15 — an APPROVAL's audit fields: the kinds it was judged against (OMITTED when unknown) and the code sent. */
export function approvedWarningAudit(
  kinds: readonly string[] | undefined,
  submittedCode: string | null,
): Record<string, unknown> {
  return { ...(kinds !== undefined ? { approval_warning_kinds: [...kinds] } : {}), warning_reason_code: submittedCode };
}

/** Trap 15 — the block when the warnings could ⛔ not be read: Approve disabled, in its own words. */
export const UNAVAILABLE_APPROVAL_WARNINGS: ApprovalWarningsSummary = {
  available: false,
  kinds: [],
  post_death: 'awaiting_determination',
  waiting_for_district_admin: false,
  own_reason_excluded: false,
};

/** One claim's block, the WAIT judged for `approvingActorIds` (the viewer; on the R9 panel also every live approve voter). */
export function toApprovalWarningsSummary(
  warnings: Pick<claim.ClaimApprovalWarnings, 'keys' | 'kinds' | 'postDeath' | 'coverage'>,
  approvingActorIds: readonly string[],
): ApprovalWarningsSummary {
  const s = claim.summarizeApprovalWarningsFor(warnings, approvingActorIds);
  return {
    available: true,
    kinds: s.kinds,
    post_death: s.postDeath,
    waiting_for_district_admin: s.waitingForDistrictAdmin,
    own_reason_excluded: s.ownReasonExcluded,
  };
}

/** The reason options on the wire — 6.23a's camelCase option DTO, REUSED unchanged (RD4). */
export function toReasonOptionsDto(options: readonly claim.ApprovalWarningReasonOption[]): ApprovalWarningReasonOption[] {
  return options.map((o) => ({
    code: o.code,
    reasonId: o.reasonId,
    label: o.label,
    whenToUse: o.whenToUse,
    addedByDisplay: o.addedByDisplay,
    addedAt: o.addedAt?.toISOString() ?? null,
    replacesLabel: o.replacesLabel,
  }));
}

/** A plain SQL identifier — the only shape `underSavepoint` ever interpolates into a bare (unparameterized) statement. */
const SAVEPOINT_NAME_RE = /^[a-z_][a-z0-9_]*$/i;

/**
 * RD12 / Trap 15 — run a warnings read under a raw SAVEPOINT: on a SQL error ONLY the read rolls back and the scope tx
 * stays usable (an aborted tx 25P02s every later statement). Rethrows the read's error for the caller's fail-closed
 * `catch`.
 * ⚠ Code review follow-up 2026-10-06: a RELEASE/ROLLBACK SAVEPOINT failure is logged and swallowed rather than
 * propagated (so it can't mask the read's own error, or turn a successful read into "unavailable") — safe ONLY
 * because every current call site is read-only and sits BEFORE the surrounding scope tx's `closeScopeTx`. A future
 * caller that wraps a read-then-write in the same scope tx under this helper would need re-examination: a silently
 * aborted transaction here could make that later write fail with a confusing `25P02` instead of the real cause.
 */
export async function underSavepoint<T>(
  client: { query(text: string): Promise<unknown> },
  name: string,
  read: () => Promise<T>,
): Promise<T> {
  // Code review 2026-10-06 (P25): every call site today is a hardcoded literal, but this is exported for reuse —
  // a runtime guard, not just the doc comment, before `name` is interpolated into unparameterized SQL.
  if (!SAVEPOINT_NAME_RE.test(name)) throw new Error(`[later-approval-warnings] underSavepoint: not a plain SQL identifier: ${name}`);
  await client.query(`SAVEPOINT ${name}`);
  try {
    const value = await read();
    // Code review 2026-10-06 (P22): a RELEASE failure must not turn a successful read into "unavailable" —
    // log-and-ignore rather than let it propagate and be caught as if the read itself had failed.
    try {
      await client.query(`RELEASE SAVEPOINT ${name}`);
    } catch (releaseErr) {
      console.warn(`[later-approval-warnings] RELEASE SAVEPOINT ${name} failed after a successful read:`, releaseErr);
    }
    return value;
  } catch (err) {
    // Code review 2026-10-06 (P22): a ROLLBACK failure must not replace the read's own error — log-and-ignore so
    // callers always see the real cause of the degradation.
    try {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    } catch (rollbackErr) {
      console.warn(`[later-approval-warnings] ROLLBACK TO SAVEPOINT ${name} failed after a read error:`, rollbackErr);
    }
    throw err;
  }
}

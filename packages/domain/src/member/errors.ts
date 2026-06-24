// Member lifecycle typed domain errors — Story 3.1 (Task 7; AC3).
//
// `MemberStateDirectWriteError` is the application-layer counterpart to the DB
// write-rejection trigger (migration). The trigger RAISEs `ERRCODE = 'P0001'` with
// the message prefix `members.state direct write rejected` when any code path other
// than the projector tries to change `members.state`. A `BEFORE UPDATE` trigger that
// RAISEs aborts its own transaction, so it CANNOT durably write the P0 architectural-
// violation audit line — that is the job of the application boundary that CATCHES the
// trigger error (mirror how @twt/events appendEvent catches `23505` → ConcurrencyError).
//
// Surfaced at the @twt/domain top-level barrel (../index.ts) so the apps/api
// error-mapping middleware imports the class AND the code constant directly — it
// matches on the code constant, not the class instance (mirror ConsentNotFoundError /
// ConsentStateError). Story 3.1 has no route; it provides the typed error + the
// SQLSTATE/message detector so the future boundary (Story 3.6 signup) maps the trigger
// rejection → this error, emits the P0 audit line, and returns the right HTTP code.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for a rejected direct write to `members.state`. */
export const MEMBER_STATE_DIRECT_WRITE_CODE = 'member.state_direct_write_rejected';

/**
 * The trigger's RAISE message prefix. The detector matches on this because the
 * trigger uses the default `RAISE EXCEPTION` SQLSTATE `P0001` (`raise_exception`),
 * which — unlike `23505` (concurrency) or `23xxx` (integrity) — is generic, so the
 * message prefix is the discriminator. Keep IN SYNC with the trigger DDL in the
 * members migration.
 */
export const MEMBER_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'members.state direct write rejected';

/** The SQLSTATE the trigger RAISEs with (default `RAISE EXCEPTION` class). */
export const MEMBER_STATE_DIRECT_WRITE_SQLSTATE = 'P0001';

/**
 * Thrown by the application boundary when a write to `members.state` is rejected by
 * the DB trigger — i.e. a code path OTHER than the projector attempted to mutate the
 * replay-derived state cache (an architectural violation, AC3). The boundary emits a
 * P0 audit line alongside throwing this.
 */
export class MemberStateDirectWriteError extends Error {
  public readonly name = 'MemberStateDirectWriteError';
  public readonly code = MEMBER_STATE_DIRECT_WRITE_CODE;

  public constructor(public readonly detail: string) {
    super(`${MEMBER_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {},
        request_id: requestId,
      },
    };
  }
}

interface PgErrorLike {
  code?: string;
  message: string;
}

/**
 * Unwrap drizzle-orm's wrapped pg error (it nests the original on `.cause`) and read
 * the SQLSTATE `.code` + `.message`. Mirrors `extractPgError` in
 * packages/events/src/events-log.ts (kept local — domain cannot import @twt/events).
 */
function extractPgError(err: unknown): PgErrorLike | null {
  if (!(err instanceof Error)) return null;
  const causeRaw = (err as { cause?: unknown }).cause;
  const candidate = causeRaw !== undefined && causeRaw !== null ? causeRaw : err;
  if (typeof candidate !== 'object' || candidate === null) return null;
  const obj = candidate as { code?: unknown; message?: unknown };
  if (typeof obj.message !== 'string') return null;
  return {
    code: typeof obj.code === 'string' ? obj.code : undefined,
    message: obj.message,
  };
}

/**
 * True iff `err` is the `members.state` write-rejection raised by the DB trigger
 * (SQLSTATE `P0001` + the message prefix). The catching boundary uses this to map a
 * raw DB rejection → `MemberStateDirectWriteError`.
 */
export function isMemberStateDirectWriteError(err: unknown): boolean {
  const pgErr = extractPgError(err);
  return (
    pgErr !== null &&
    pgErr.code === MEMBER_STATE_DIRECT_WRITE_SQLSTATE &&
    pgErr.message.startsWith(MEMBER_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
  );
}

// ── Optimistic-concurrency on the member's event stream (projector) ───────────
// The projector appends the next event at `head_version + 1`; the events_log unique
// index `(stream_id, event_version)` is the backstop. A concurrent projector landing
// the same version raises `23505` → this typed error (mirror @twt/events
// ConcurrencyError, which domain cannot import). An EXPECTED failure — the caller
// re-reads and retries; NOT surfaced at the top-level barrel (member namespace only).

/** The events_log unique-index name for `(stream_id, event_version)`. Keep IN SYNC
 * with schema/events_log.ts. */
const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';

export class MemberStreamConcurrencyError extends Error {
  public readonly name = 'MemberStreamConcurrencyError';
  public constructor(
    public readonly memberId: string,
    public readonly attemptedVersion: number,
  ) {
    super(
      `member stream ${memberId} concurrency conflict appending event_version ${attemptedVersion}`,
    );
  }
}

/** True iff `err` is the events_log `(stream_id, event_version)` unique-violation. */
export function isMemberStreamVersionConflict(err: unknown): boolean {
  const pgErr = extractPgError(err);
  if (pgErr === null || pgErr.code !== '23505') return false;
  const constraint = (() => {
    if (!(err instanceof Error)) return undefined;
    const cause = (err as { cause?: unknown }).cause;
    const candidate = cause !== undefined && cause !== null ? cause : err;
    if (typeof candidate !== 'object' || candidate === null) return undefined;
    const c = (candidate as { constraint?: unknown }).constraint;
    return typeof c === 'string' ? c : undefined;
  })();
  return constraint === STREAM_VERSION_CONSTRAINT;
}

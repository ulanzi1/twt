// Module Marketplace typed domain errors — Story 12.1 (QE13). Twin of helpdesk/errors.ts + pool/errors.ts.
//
// Every failed guard throws ONE of these with no event appended and the row unchanged (AC5). The domain
// functions carry ⛔ HTTP; the 12.2 / 12.3 / 12.6 routes map them (⛔ API error-mapper entry in 12.1).
//
// Only the direct-write set (`ModuleStateDirectWriteError` + its code + its message prefix + its
// detector) is surfaced at the @twt/domain TOP level — the pool trio shape — so a future error-mapping
// middleware imports the class AND the code constant directly. Everything else is reached through the
// `marketplace` namespace.

import type { ZodError, ZodIssue } from 'zod';

import type { ErrorResponseShape } from '../errors.js';

// ── The DB trigger's direct-write rejection (I1 / I2 / I3) ─────────────────────────────────────────

/** Namespaced error code for a rejected direct write to `marketplace_modules`. */
export const MODULE_STATE_DIRECT_WRITE_CODE = 'module.state_direct_write_rejected';

/**
 * The trigger's RAISE message prefix (migration 0193). The trigger uses the default `RAISE EXCEPTION`
 * SQLSTATE `P0001`, which is generic, so the prefix is the discriminator. Keep IN SYNC with the trigger
 * DDL — every RAISE in `marketplace_modules_reject_unguarded_state_write()` starts with it.
 */
export const MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'marketplace_modules direct write rejected';

/** The SQLSTATE the trigger RAISEs with. */
const MODULE_STATE_DIRECT_WRITE_SQLSTATE = 'P0001';

/**
 * A write to `marketplace_modules` was rejected by the DB trigger: an unguarded INSERT / UPDATE, a
 * guarded write that changed an immutable content column, or a guarded write that broke I3. Reachable
 * from the projector only if the guard was not set — a bug. A BEFORE trigger that RAISEs aborts its own
 * statement, so it cannot write an audit line; the catching boundary owns that.
 */
export class ModuleStateDirectWriteError extends Error {
  public readonly name = 'ModuleStateDirectWriteError';
  public readonly code = MODULE_STATE_DIRECT_WRITE_CODE;

  public constructor(public readonly detail: string) {
    super(`${MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: ${stripDirectWritePrefix(detail)}`);
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
  constraint?: string;
  /** pg's `DatabaseError` always carries it (the server's required `S` field); a Node system error never does. */
  severity?: string;
}

/**
 * Walk an error's `.cause` chain (drizzle wraps the pg error, possibly more than once) and return the
 * first link carrying a string SQLSTATE `code` — or, with `pgShaped`, the first link that also carries pg's
 * `severity`, so a wrapper with its own string `code` does not hide the pg error below it (review R4-4). A local
 * copy of the `contribution/write.ts` `uniqueViolationConstraint` walker's SHAPE (G16) — that one is private and is
 * ⛔ refactored here.
 */
function findPgError(err: unknown, pgShaped = false): PgErrorLike | null {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur !== null && cur !== undefined; depth += 1) {
    if (typeof cur === 'object') {
      const c = cur as { code?: unknown; message?: unknown; constraint?: unknown; severity?: unknown };
      if (typeof c.code === 'string' && typeof c.message === 'string' && (!pgShaped || typeof c.severity === 'string')) {
        return {
          code: c.code,
          message: c.message,
          ...(typeof c.constraint === 'string' ? { constraint: c.constraint } : {}),
          ...(typeof c.severity === 'string' ? { severity: c.severity } : {}),
        };
      }
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Drop the trigger's own prefix (and the separator after it) from a RAISE message, so the class's message
 * carries the prefix ONCE — the trigger's messages already start with it.
 */
function stripDirectWritePrefix(detail: string): string {
  return detail.startsWith(MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
    ? detail.slice(MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX.length).replace(/^[\s:—-]+/, '')
    : detail;
}

/**
 * The text of the pg error on `err`'s cause chain — ⛔ the drizzle wrapper's own message, which is
 * `Failed query: <sql>` + `params: <every bound value>` (drizzle-orm ≥ 0.44). An error that leaves this
 * module as a `message` must carry the pg text only, never the bound manifest. With no pg error on the chain
 * it falls back to the INNERMOST error's message (a plain `Error`, a test double), for the same reason.
 */
export function pgMessageOf(err: unknown): string {
  const pgErr = findPgError(err);
  if (pgErr !== null) return pgErr.message;
  let innermost: unknown = err;
  for (let depth = 0; depth < 8; depth += 1) {
    const next = innermost instanceof Error ? (innermost as { cause?: unknown }).cause : undefined;
    if (!(next instanceof Error)) break;
    innermost = next;
  }
  return innermost instanceof Error ? innermost.message : String(innermost);
}

/**
 * The SQLSTATE of the pg error on `err`'s cause chain, or null. `findPgError` accepts any link with a string
 * `code`, so a Node system error would otherwise read as one: the walk takes the first pg-SHAPED link — a string
 * `severity` (review R3-5; the five-character test alone (RP8) still let `EPIPE` / `EPERM` / `EBUSY` through) — and
 * walks PAST a coded link without one (review R4-4); its code must be five upper-case alphanumerics.
 */
export function pgSqlstateOf(err: unknown): string | null {
  const code = findPgError(err, true)?.code;
  return code !== undefined && /^[0-9A-Z]{5}$/.test(code) ? code : null;
}

/** The violated constraint name of a 23505 anywhere on the cause chain, or null. */
export function uniqueViolationConstraint(err: unknown): string | null {
  const pgErr = findPgError(err);
  if (pgErr === null || pgErr.code !== '23505') return null;
  return pgErr.constraint ?? null;
}

/** True iff `err` is the `marketplace_modules` trigger rejection (SQLSTATE `P0001` + the prefix). */
export function isModuleStateDirectWriteError(err: unknown): boolean {
  const pgErr = findPgError(err);
  return (
    pgErr !== null &&
    pgErr.code === MODULE_STATE_DIRECT_WRITE_SQLSTATE &&
    pgErr.message.startsWith(MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
  );
}

// ── Constraint names the projector maps (QE8). Keep IN SYNC with schema/events_log.ts + migration 0193. ──

/** `events_log (stream_id, event_version)` — the stream-version backstop. */
export const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';
/** One `module.lead_submitted` per (module, member) — migration 0193. */
export const MODULE_LEAD_MEMBER_CONSTRAINT = 'module_lead_member_uq';
/**
 * A `lead_id` is globally unique across every `module.lead_submitted` — migration 0193. DELIBERATE (checklist
 * family 9): global, not per-Pariwar, because a lead id is a caller-minted idempotency key and a reuse is a
 * 23505 whichever tenant holds it. ⭐ RE-EXAMINE if Story 12.3 lets a CLIENT choose the `lead_id`: a reused id
 * would then be a cross-tenant collision oracle — derive it server-side, or key `(pariwar_id, lead_id)`.
 */
export const MODULE_LEAD_ID_CONSTRAINT = 'module_lead_id_uq';
/**
 * The `marketplace_modules` primary key — a genesis on an already-authored `module_id`. DELIBERATE (checklist
 * family 9, review R3-3): this key, like `STREAM_VERSION_CONSTRAINT`, ignores RLS, so a genesis under one Pariwar
 * with a `module_id` that exists under ANOTHER is `ModuleGenesisAlreadyExistsError` — an existence signal across
 * tenants. Accepted because the `module_id` is minted by the caller's own server code (QE15), never chosen by a
 * client. ⭐ RE-EXAMINE if Story 12.2 lets a CLIENT choose the `module_id`: derive it server-side, or the
 * "already exists" answer becomes a cross-tenant oracle (the `MODULE_LEAD_ID_CONSTRAINT` note, for `lead_id`).
 */
export const MODULE_PKEY_CONSTRAINT = 'marketplace_modules_pkey';

// ── Lifecycle + projector ──────────────────────────────────────────────────────────────────────────

/**
 * The requested transition does not apply to the module's current state (the reducer would return
 * `null` — QE6). `projectModuleTransition` refuses to append it. ⚠ A lead is a LEGAL same-state event
 * (`active → active`), so legality is `nextModuleState(...) !== null`, ⛔ `toState !== fromState` (TR1).
 */
export class ModuleIllegalTransitionError extends Error {
  public readonly name = 'ModuleIllegalTransitionError';
  public constructor(
    public readonly moduleId: string,
    public readonly fromState: string,
    public readonly eventType: string,
  ) {
    super(`event '${eventType}' does not apply to module ${moduleId} in state '${fromState}' — refusing to append`);
  }
}

/**
 * A `(stream_id, event_version)` conflict on a module TRANSITION. Under the row lock (I10) it is reachable only
 * when the locked row's version disagrees with the stream head (drift — the projector's head check), and drift
 * is deterministic. At genesis the same 23505 is `ModuleGenesisAlreadyExistsError`, ⛔ this class (review R3-12).
 * `submitModuleLead` retries it at most `MAX_LEAD_APPEND_ATTEMPTS` times before letting it propagate — a
 * backstop that re-reads the same drift; there is no repair path yet (review RVD2).
 */
export class ModuleStreamConcurrencyError extends Error {
  public readonly name = 'ModuleStreamConcurrencyError';
  public constructor(
    public readonly moduleId: string,
    public readonly attemptedVersion: number,
  ) {
    super(`module stream ${moduleId} concurrency conflict at event_version ${String(attemptedVersion)}`);
  }
}

/** True iff `err` is the `events_log (stream_id, event_version)` unique violation. */
export function isModuleStreamVersionConflict(err: unknown): boolean {
  return uniqueViolationConstraint(err) === STREAM_VERSION_CONSTRAINT;
}

/** A genesis on a non-empty stream / an already-authored `module_id` (TR2). Also what
 *  `projectModuleTransition` throws for `module.authored`. */
export class ModuleGenesisAlreadyExistsError extends Error {
  public readonly name = 'ModuleGenesisAlreadyExistsError';
  public constructor(public readonly moduleId: string) {
    super(`module ${moduleId} already has a genesis — module.authored is first-and-only`);
  }
}

/** A transition against a module that has no row in this Pariwar (never authored, or another tenant's). */
export class ModuleGenesisMissingError extends Error {
  public readonly name = 'ModuleGenesisMissingError';
  public constructor(public readonly moduleId: string) {
    super(`module ${moduleId} has no row in this Pariwar — a transition was requested before its genesis`);
  }
}

/**
 * The `marketplace_modules` row write itself failed or matched no row (a typed wrapper). The message carries
 * the pg text only (`pgMessageOf` — ⛔ drizzle's "Failed query … params", which would hold the bound manifest),
 * and `sqlstate` keeps the underlying SQLSTATE (40P01, 42501, 23514, …) readable without walking `.cause`.
 */
export class ModulePersistError extends Error {
  public readonly name = 'ModulePersistError';
  /** The SQLSTATE of the underlying pg failure, or null when the cause is not a pg error (e.g. a 0-row UPDATE). */
  public readonly sqlstate: string | null;
  public constructor(
    public readonly moduleId: string,
    public readonly cause: unknown,
  ) {
    super(`failed to persist module row ${moduleId}: ${pgMessageOf(cause)}`);
    this.sqlstate = pgSqlstateOf(cause);
  }
}

/**
 * The caller's inputs are inconsistent: an actor / actorId mismatch, a `member` actor on a non-lead event,
 * a lead whose actor is not the member (I11), `trustee_archived` under the `system` actor (RV8), flat inputs
 * that disagree with the payload, a TRANSITION payload that fails its schema, or a genesis payload that fails
 * its schema (a programming error — the manifest was already parsed) (review R3-8).
 */
export class ModuleProjectorInputError extends Error {
  public readonly name = 'ModuleProjectorInputError';
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** `parseModuleManifest` rejected its input. Wraps the ZodError (⛔ thrown bare). */
export class ModuleManifestInvalidError extends Error {
  public readonly name = 'ModuleManifestInvalidError';
  public readonly issues: readonly ZodIssue[];
  public constructor(public readonly zodError: ZodError) {
    super(
      `module manifest is invalid: ${zodError.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')}`,
    );
    this.issues = zodError.issues;
  }
}

/** The archive reason's own rule does not hold (QE6) — e.g. `valid_until_reached` before `valid_until`. */
export class ModuleArchiveReasonNotSatisfiedError extends Error {
  public readonly name = 'ModuleArchiveReasonNotSatisfiedError';
  public constructor(
    public readonly moduleId: string,
    public readonly reason: string,
    public readonly detail: string,
  ) {
    super(`module ${moduleId} cannot be archived for '${reason}': ${detail}`);
  }
}

// ── Lead + window refusals (QE6 / QE7 / QE8) ───────────────────────────────────────────────────────

/** A lead on a module that is not `active`. */
export class ModuleNotActiveError extends Error {
  public readonly name = 'ModuleNotActiveError';
  public constructor(
    public readonly moduleId: string,
    public readonly state: string,
  ) {
    super(`module ${moduleId} is '${state}', not active — it accepts no leads`);
  }
}

/** DB `now()` is outside the window a command requires (authoring, scheduling, activating, a lead). */
export class ModuleOutsideWindowError extends Error {
  public readonly name = 'ModuleOutsideWindowError';
  public constructor(
    public readonly moduleId: string,
    public readonly operation: string,
    public readonly now: Date,
    public readonly validFrom: Date,
    public readonly validUntil: Date,
  ) {
    super(
      `module ${moduleId}: '${operation}' refused at ${now.toISOString()} for the window ` +
        `[${validFrom.toISOString()}, ${validUntil.toISOString()})`,
    );
  }
}

/** A capped module has no places left. It stays `active` until an archive is emitted (QE7, C2). */
export class ModuleSlotsExhaustedError extends Error {
  public readonly name = 'ModuleSlotsExhaustedError';
  public constructor(public readonly moduleId: string) {
    super(`module ${moduleId} has no places left`);
  }
}

/** The member already registered interest in this module under a different `lead_id` (QE8 (iii)). */
export class ModuleLeadAlreadySubmittedError extends Error {
  public readonly name = 'ModuleLeadAlreadySubmittedError';
  public constructor(
    public readonly moduleId: string,
    public readonly memberId: string,
  ) {
    super(`member ${memberId} has already registered interest in module ${moduleId}`);
  }
}

/** The `lead_id` is already used — for a different member here, or on another module (QE8 (ii)). */
export class ModuleLeadDuplicateError extends Error {
  public readonly name = 'ModuleLeadDuplicateError';
  public constructor(
    public readonly moduleId: string,
    public readonly leadId: string,
  ) {
    super(`lead id ${leadId} is already used — refused on module ${moduleId}`);
  }
}

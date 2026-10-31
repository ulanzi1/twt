// Persisted-state projector — Story 12.1 (QE6–QE8, I1–I4, I10, I11). Twin of helpdesk/project.ts.
//
// THE ONLY LEGITIMATE WRITERS of `marketplace_modules` (allowlisted in scripts/marketplace-module-state-
// invariant by file + function name): `projectModuleGenesis` and `projectModuleTransition`. Each guarded
// write sits LEXICALLY in one of those two bodies — ⛔ an inner named arrow or helper — or the gate flags it.
//
// ⛔ Re-exported from marketplace/index.ts. The five commands (commands.ts) are the public write entry
// points: they take the row lock, check the guards against DB `now()`, and only then call these.
//
// ── Why it inserts into events_log directly (⛔ via @twt/events.appendEvent) ──────────────────────
// `@twt/events` depends on `@twt/domain` (the helpdesk/project.ts rationale). Domain OWNS `events_log`.
//
// ── ⚠ THE LOCK ORDER (I10, A1) — and why the helpdesk projector is ⛔ copied ────────────────────────
// The helpdesk projector replays the stream, APPENDS, then UPDATEs the row. Under a lead's row lock that
// order deadlocks (40P01) against an archive that appended first (TR12). Here every transition command
// takes `SELECT … FOR UPDATE` on the row FIRST and passes the locked row in as `lockedRow`; the projector
// does ⛔ replay — it checks the stream head equals the locked row's version, appends at version + 1, then
// UPDATEs. One order everywhere: row lock → events_log append → row UPDATE. Under the lock, a transition's
// version conflict is reachable only on drift, which the head check reports as `ModuleStreamConcurrencyError`;
// a genesis conflict is `ModuleGenesisAlreadyExistsError` (review R3-12).
//
// ── Transaction contract ───────────────────────────────────────────────────────────────────────────
// Called inside the caller's open transaction, with `SET LOCAL ROLE twt_app` + `setPariwarScope` done. The
// projector opens and commits ⛔ transaction. The genesis wraps itself in `SAVEPOINT module_genesis` so a
// refused genesis leaves the caller's transaction usable; the transition is wrapped by its command.

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import type { ZodError } from 'zod';

import { bindScopedDb } from '../db.js';
import type { ModuleId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import {
  MODULE_MANIFEST_SCHEMA_VERSION,
  marketplaceModules,
  type MarketplaceModuleArchiveReason,
  type MarketplaceModuleState,
} from '../schema/marketplace_modules.js';
import {
  MODULE_LEAD_ID_CONSTRAINT,
  MODULE_LEAD_MEMBER_CONSTRAINT,
  MODULE_PKEY_CONSTRAINT,
  ModuleGenesisAlreadyExistsError,
  ModuleIllegalTransitionError,
  ModuleLeadAlreadySubmittedError,
  ModuleLeadDuplicateError,
  ModulePersistError,
  ModuleProjectorInputError,
  ModuleStateDirectWriteError,
  ModuleStreamConcurrencyError,
  STREAM_VERSION_CONSTRAINT,
  isModuleStateDirectWriteError,
  pgMessageOf,
  uniqueViolationConstraint,
} from './errors.js';
import {
  MODULE_EVENT_PAYLOAD_SCHEMAS,
  ModuleAuthoredPayloadSchema,
  type ModuleAuthoredPayload,
  type ModuleEventActor,
  type ModuleEventType,
  type ModuleStaffActor,
} from './events.js';
import type { ModuleManifestV1 } from './filters.js';
import { nextModuleState } from './state.js';

/** The genesis savepoint name (the caller's transaction survives a refused genesis). */
const GENESIS_SAVEPOINT = 'module_genesis';

/**
 * The I11 actor check every projector and command runs first: `system` iff `actorId` is null, and
 * `member` only on a lead. Throws `ModuleProjectorInputError`.
 */
export function assertModuleActor(
  eventType: ModuleEventType,
  actor: ModuleEventActor,
  actorId: string | null,
): void {
  if ((actor === 'system') !== (actorId === null)) {
    throw new ModuleProjectorInputError(
      `[${eventType}] actor/actorId mismatch: actor='${actor}', actorId=${actorId === null ? 'null' : 'non-null'} — ` +
        `'system' requires a null actorId, every other actor a non-null one`,
    );
  }
  if (eventType === 'module.lead_submitted') {
    if (actor !== 'member') {
      throw new ModuleProjectorInputError(
        `[module.lead_submitted] actor must be 'member' (I11) — got '${actor}'; an operator-assisted lead is not supported (C13)`,
      );
    }
  } else if (actor === 'member') {
    throw new ModuleProjectorInputError(`[${eventType}] a member cannot author, schedule, activate or archive a module (I11)`);
  }
}

/** `ROLLBACK TO` + `RELEASE` a savepoint, swallowing a failure so it never masks the real error. */
export async function rollbackToSavepoint(client: pg.PoolClient, name: string): Promise<void> {
  try {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    await client.query(`RELEASE SAVEPOINT ${name}`);
  } catch {
    // the connection is gone or the transaction ended — the caller's own ROLLBACK cleans up.
  }
}

/**
 * Map a raw pg failure of a `module.*` append / row write to its typed error (QE8). A typed error passes
 * through; an unknown failure (42501 RLS, …) propagates unchanged. Exported for its unit spec only — the
 * barrel (`index.ts`) does not re-export `project.js`.
 */
export function mapModuleWriteError(
  err: unknown,
  moduleId: string,
  attemptedVersion: number,
  lead: { leadId: string; memberId: string } | null,
): unknown {
  switch (uniqueViolationConstraint(err)) {
    case STREAM_VERSION_CONSTRAINT:
      return new ModuleStreamConcurrencyError(moduleId, attemptedVersion);
    case MODULE_LEAD_MEMBER_CONSTRAINT:
      return new ModuleLeadAlreadySubmittedError(moduleId, lead?.memberId ?? '(unknown)');
    case MODULE_LEAD_ID_CONSTRAINT:
      return new ModuleLeadDuplicateError(moduleId, lead?.leadId ?? '(unknown)');
    default:
      break;
  }
  if (isModuleStateDirectWriteError(err)) {
    // The pg text, ⛔ the outer drizzle error's "Failed query … params" (RV2): this message can reach a client.
    return new ModuleStateDirectWriteError(pgMessageOf(err));
  }
  return err;
}

// ── Genesis ────────────────────────────────────────────────────────────────────────────────────────

export interface ProjectModuleGenesisInput {
  pariwarId: PariwarId;
  moduleId: ModuleId;
  /** An already-parsed manifest (`parseModuleManifest`). ONE object feeds both the payload and the row. */
  manifest: ModuleManifestV1;
  /** The caller's intent audit line (`withCompensatingAudit`'s id) — the row's first `audit_id`. */
  auditId: string;
  actor: ModuleStaffActor;
  actorId: string | null;
}

export interface ProjectModuleGenesisResult {
  eventId: string;
  eventVersion: 1;
  state: 'draft';
}

/**
 * Append `module.authored` (version 1) and INSERT the module row (`draft`), atomically, in the caller's
 * transaction — the seven steps of the story's "Exact signatures", inside `SAVEPOINT module_genesis`.
 *
 * @throws ModuleProjectorInputError        actor / actorId mismatch, a member actor, or a payload that fails its schema.
 * @throws ModuleGenesisAlreadyExistsError  the stream is non-empty, or a concurrent / cross-tenant genesis won (23505).
 * @throws ModulePersistError               the row INSERT failed for another reason (its `sqlstate` says which) or returned no row.
 * @throws ModuleStateDirectWriteError      the trigger refused the INSERT (only if the guard was not set — a bug).
 * (42501 — the scope ≠ `pariwarId` — propagates unchanged FROM THE `events_log` APPEND (step 4), which runs
 * first and carries the same Pariwar RLS check; a 42501 at the row INSERT itself would be a `ModulePersistError`
 * with `sqlstate` '42501'.)
 */
export async function projectModuleGenesis(
  client: pg.PoolClient,
  input: ProjectModuleGenesisInput,
): Promise<ProjectModuleGenesisResult> {
  // (1) Actor check (I11) — before any statement.
  assertModuleActor('module.authored', input.actor, input.actorId);

  await client.query(`SAVEPOINT ${GENESIS_SAVEPOINT}`);
  try {
    const db = bindScopedDb(client);

    // (2) The stream must be empty. RLS-scoped: a concurrent or cross-tenant collision is caught by the
    // 23505 of step 4 / 5 instead.
    const existing = await client.query('SELECT 1 FROM events_log WHERE stream_id = $1 LIMIT 1', [input.moduleId]);
    if (existing.rows.length > 0) throw new ModuleGenesisAlreadyExistsError(input.moduleId);

    // (3) Build + strict-parse the payload — the WHOLE manifest snapshot, from the SAME object the row
    // is written from below, so payload and row cannot disagree.
    const m = input.manifest;
    const payload: ModuleAuthoredPayload = {
      from_state: null,
      to_state: 'draft',
      trigger: 'module.author',
      actor: input.actor,
      module_id: input.moduleId,
      pariwar_id: input.pariwarId,
      manifest_schema_version: MODULE_MANIFEST_SCHEMA_VERSION,
      partner_id: m.partnerId,
      name_en: m.nameEn,
      name_hi: m.nameHi,
      description_en: m.descriptionEn,
      description_hi: m.descriptionHi,
      eligibility_filter: m.eligibilityFilter,
      scope_filter: m.scopeFilter,
      valid_from: m.validFrom.toISOString(),
      valid_until: m.validUntil.toISOString(),
      slot_capacity: m.slotCapacity,
      lead_handoff_url: m.leadHandoffUrl,
      lead_handoff_signing_key_secret_name: m.leadHandoffSigningKeySecretName,
      branding_bundle: m.brandingBundle,
    };
    const parsed = ModuleAuthoredPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      // A programming error: the manifest was already parsed by `parseModuleManifest`.
      throw new ModuleProjectorInputError('[module.authored] the genesis payload fails its schema', parsed.error);
    }

    // (4) Append the genesis at version 1.
    const appended = await db
      .insert(eventsLog)
      .values({
        streamId: input.moduleId,
        eventType: 'module.authored',
        payload,
        eventVersion: 1,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning({ eventId: eventsLog.eventId });
    const event = appended[0];
    if (!event) throw new ModulePersistError(input.moduleId, new Error('events_log insert returned no row'));

    // (5) INSERT the row under the trigger guard — the genesis shape I3 requires.
    await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
    try {
      let written: { moduleId: ModuleId }[];
      try {
        written = await db
          .insert(marketplaceModules)
          .values({
            moduleId: input.moduleId,
            pariwarId: input.pariwarId,
            partnerId: m.partnerId,
            nameEn: m.nameEn,
            nameHi: m.nameHi,
            descriptionEn: m.descriptionEn,
            descriptionHi: m.descriptionHi,
            eligibilityFilter: m.eligibilityFilter,
            scopeFilter: m.scopeFilter,
            validFrom: m.validFrom,
            validUntil: m.validUntil,
            slotCapacity: m.slotCapacity,
            leadHandoffUrl: m.leadHandoffUrl,
            leadHandoffSigningKeySecretName: m.leadHandoffSigningKeySecretName,
            brandingBundle: m.brandingBundle,
            manifestSchemaVersion: MODULE_MANIFEST_SCHEMA_VERSION,
            currentState: 'draft',
            stateEventVersion: 1,
            slotsRemaining: m.slotCapacity,
            archiveReason: null,
            auditId: input.auditId,
          })
          .returning({ moduleId: marketplaceModules.moduleId });
      } catch (err) {
        // A PK collision / a trigger refusal is mapped in step 6; anything else is a persist failure.
        const constraint = uniqueViolationConstraint(err);
        if (constraint === MODULE_PKEY_CONSTRAINT || isModuleStateDirectWriteError(err)) throw err;
        throw new ModulePersistError(input.moduleId, err);
      }
      if (written.length !== 1) {
        throw new ModulePersistError(input.moduleId, new Error(`expected 1 row inserted, got ${String(written.length)}`));
      }
    } finally {
      // Best-effort reset (tx-scoped anyway; swallow if the statement above aborted the transaction).
      try {
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
      } catch {
        // the transaction is aborted — the savepoint rollback below clears the guard.
      }
    }

    await client.query(`RELEASE SAVEPOINT ${GENESIS_SAVEPOINT}`);
    return { eventId: event.eventId, eventVersion: 1, state: 'draft' };
  } catch (err) {
    // ROLLBACK TO before mapping or rethrowing, so the caller's transaction stays usable.
    await rollbackToSavepoint(client, GENESIS_SAVEPOINT);
    // (6) Map errors. Both keys ignore RLS, so another Pariwar's `module_id` also lands here — DELIBERATE, with
    // its re-examination trigger on `MODULE_PKEY_CONSTRAINT` (errors.ts; checklist family 9, review R3-3).
    const constraint = uniqueViolationConstraint(err);
    if (constraint === STREAM_VERSION_CONSTRAINT || constraint === MODULE_PKEY_CONSTRAINT) {
      throw new ModuleGenesisAlreadyExistsError(input.moduleId);
    }
    throw mapModuleWriteError(err, input.moduleId, 1, null);
  }
}

// ── Transitions ────────────────────────────────────────────────────────────────────────────────────

/** A transition event type (the genesis is `projectModuleGenesis`'s). */
export type ModuleTransitionEventType = Exclude<ModuleEventType, 'module.authored'>;

/** The row the COMMAND locked with `SELECT … FOR UPDATE` before calling the projector (I10). */
export interface ModuleLockedRow {
  currentState: MarketplaceModuleState;
  stateEventVersion: number;
  slotsRemaining: number | null;
  slotCapacity: number | null;
}

export interface ProjectModuleTransitionInput {
  pariwarId: PariwarId;
  moduleId: ModuleId;
  eventType: ModuleTransitionEventType;
  /** The full payload the command built; cross-validated against `lockedRow` and strict-parsed here. */
  payload: unknown;
  /** This transition's audit line — becomes the row's `audit_id` (the MOST RECENT transition's). */
  auditId: string;
  actor: ModuleEventActor;
  actorId: string | null;
  lockedRow: ModuleLockedRow;
}

export interface ModuleTransitionResult {
  eventId: string;
  eventVersion: number;
  fromState: MarketplaceModuleState;
  state: MarketplaceModuleState;
}

function zodMessage(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/**
 * Append ONE transition event at `lockedRow.stateEventVersion + 1` and re-project the row's I1 columns,
 * in the caller's transaction. ⛔ It does NOT replay payloads and ⛔ takes the lock — the command did.
 *
 * @throws ModuleGenesisAlreadyExistsError  for `module.authored` (TR2).
 * @throws ModuleProjectorInputError        actor rules (I11), or a payload that disagrees with the locked row / its schema.
 * @throws ModuleStreamConcurrencyError     the stream head ≠ the locked version, or a 23505 on the version slot.
 * @throws ModuleIllegalTransitionError     `nextModuleState(from, type)` is null.
 * @throws ModuleLeadAlreadySubmittedError / ModuleLeadDuplicateError  a lead 23505 (the QE8 indexes).
 * @throws ModulePersistError               the row UPDATE failed or matched ≠ 1 row.
 */
export async function projectModuleTransition(
  client: pg.PoolClient,
  input: ProjectModuleTransitionInput,
): Promise<ModuleTransitionResult> {
  const eventType: string = input.eventType;
  if (eventType === 'module.authored') throw new ModuleGenesisAlreadyExistsError(input.moduleId);
  assertModuleActor(input.eventType, input.actor, input.actorId);

  const db = bindScopedDb(client);
  const { lockedRow } = input;

  // (1) The stream head must be the locked row's version (the row and the stream are written together).
  const head = await client.query<{ max: string | null }>(
    'SELECT max(event_version) AS max FROM events_log WHERE pariwar_id = $1 AND stream_id = $2',
    [input.pariwarId, input.moduleId],
  );
  const headVersion = head.rows[0]?.max === null || head.rows[0]?.max === undefined ? 0 : Number(head.rows[0].max);
  const nextVersion = lockedRow.stateEventVersion + 1;
  if (headVersion !== lockedRow.stateEventVersion) {
    throw new ModuleStreamConcurrencyError(input.moduleId, nextVersion);
  }

  // (2) Legality: ⚠ `!== null`, ⛔ `to !== from` — a lead is a legal same-state event (TR1).
  const fromState = lockedRow.currentState;
  const toState = nextModuleState(fromState, input.eventType);
  if (toState === null) throw new ModuleIllegalTransitionError(input.moduleId, fromState, input.eventType);

  // (3) Cross-validate the payload against the locked row (⛔ trusting a caller-supplied label).
  const p = (typeof input.payload === 'object' && input.payload !== null ? input.payload : {}) as Record<string, unknown>;
  if (p['from_state'] !== fromState || p['to_state'] !== toState) {
    throw new ModuleProjectorInputError(
      `[${input.eventType}] payload from_state/to_state (${String(p['from_state'])} → ${String(p['to_state'])}) ` +
        `disagree with the locked row (${fromState} → ${toState})`,
    );
  }
  if (p['actor'] !== input.actor) {
    throw new ModuleProjectorInputError(`[${input.eventType}] payload actor '${String(p['actor'])}' ≠ actor '${input.actor}'`);
  }
  let slotsRemaining = lockedRow.slotsRemaining;
  if (input.eventType === 'module.lead_submitted') {
    const expected = lockedRow.slotsRemaining === null ? null : lockedRow.slotsRemaining - 1;
    if (p['slots_remaining_after'] !== expected) {
      throw new ModuleProjectorInputError(
        `[module.lead_submitted] slots_remaining_after ${String(p['slots_remaining_after'])} ≠ expected ${String(expected)}`,
      );
    }
    // I11: the actor of a lead IS the member.
    if (input.actorId !== p['member_id']) {
      throw new ModuleProjectorInputError('[module.lead_submitted] actorId must equal payload member_id (I11)');
    }
    slotsRemaining = expected;
  }

  // (4) Strict-parse, then append at version + 1.
  const parsed = MODULE_EVENT_PAYLOAD_SCHEMAS[input.eventType].safeParse(input.payload);
  if (!parsed.success) {
    throw new ModuleProjectorInputError(`[${input.eventType}] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }
  const archiveReason: MarketplaceModuleArchiveReason | null =
    input.eventType === 'module.archived' ? (p['reason'] as MarketplaceModuleArchiveReason) : null;
  const lead =
    typeof p['lead_id'] === 'string' && typeof p['member_id'] === 'string'
      ? { leadId: p['lead_id'], memberId: p['member_id'] }
      : null;

  let eventId: string;
  try {
    const appended = await db
      .insert(eventsLog)
      .values({
        streamId: input.moduleId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning({ eventId: eventsLog.eventId });
    const event = appended[0];
    if (!event) throw new ModulePersistError(input.moduleId, new Error('events_log insert returned no row'));
    eventId = event.eventId;
  } catch (err) {
    throw mapModuleWriteError(err, input.moduleId, nextVersion, lead);
  }

  // (5) Re-project the I1 columns under the trigger guard.
  await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
  try {
    let updated: { moduleId: ModuleId }[];
    try {
      updated = await db
        .update(marketplaceModules)
        .set({
          currentState: toState,
          stateEventVersion: nextVersion,
          slotsRemaining,
          archiveReason,
          auditId: input.auditId,
          updatedAt: sql`now()`,
        })
        .where(and(eq(marketplaceModules.moduleId, input.moduleId), eq(marketplaceModules.pariwarId, input.pariwarId)))
        .returning({ moduleId: marketplaceModules.moduleId });
    } catch (err) {
      const mapped = mapModuleWriteError(err, input.moduleId, nextVersion, lead);
      throw mapped === err ? new ModulePersistError(input.moduleId, err) : mapped;
    }
    // A 0-row UPDATE does not throw — the event is already appended, so silence would leave the stream ahead
    // of the row with no signal (the helpdesk finding).
    if (updated.length !== 1) {
      throw new ModulePersistError(input.moduleId, new Error(`expected 1 row updated, got ${String(updated.length)}`));
    }
  } finally {
    try {
      await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
    } catch {
      // the transaction is aborted — the command's savepoint rollback clears the guard.
    }
  }

  return { eventId, eventVersion: nextVersion, fromState, state: toState };
}

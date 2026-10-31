// Module lifecycle commands — Story 12.1 (QE6, QE7, QE8, QE15; AC5, AC6). The PUBLIC write entry points.
//
// One command per event: `authorModule`, `scheduleModule`, `activateModule`, `submitModuleLead`,
// `archiveModule`, plus the read-only `checkModuleLeadAllowed` pre-check. Each writes ONLY through the
// projector (I1) and judges its guards against DB `now()` (⛔ `new Date()` — TR4).
//
// ⛔ PRODUCTION CALLER IN 12.1 (I6). The callers are Story 12.2's wizard (author / schedule / activate /
// archive), 12.3's lead route (pre-check + submit) and 12.6's sweep (archive). Each caller:
//   1. mints `moduleId` / `leadId`;
//   2. runs `checkModuleLeadAllowed` BEFORE the audit wrapper (a refused pre-check writes ⛔ audit line);
//   3. calls `audit.withCompensatingAudit(servicePool, { auditIntent, mutate: ({ auditId }) =>
//      marketplace.<command>(client, { …, auditId }) })` with `resourceLocator` `module/<id>`.
// ⛔ Domain function here calls `withCompensatingAudit` (G12) — pairing is the CALLER's. A refusal under
// the lock (a genuine race) therefore writes the intent line + `<action>_rolled_back`.
//
// ── ⚠ THE LOCK COMES FIRST (QE7, I10) ────────────────────────────────────────────────────────────────
// Every transition command runs `SELECT … FROM marketplace_modules WHERE module_id = $1 AND pariwar_id = $2
// FOR UPDATE` before any `events_log` read or append, checks its guards against the LOCKED row, then calls
// `projectModuleTransition(client, { …, lockedRow })`. One lock order everywhere — row lock → append → row
// UPDATE — so a lead racing an archive serialises on the row instead of deadlocking (40P01, TR12).
//
// ── ⚠ TR4 — `now()` is the TRANSACTION START ───────────────────────────────────────────────────────
// A lead that began before `valid_until` and waited on the row lock is judged at its start time. "An
// archive at `valid_until` and a lead at `valid_until` cannot both be legal" holds per instant (the window
// is half-open, `[valid_from, valid_until)`); across transactions, the lock serialises them.
//
// ── SAVEPOINT discipline ───────────────────────────────────────────────────────────────────────────
// Every command that WRITES wraps its statements in a SAVEPOINT and runs `ROLLBACK TO SAVEPOINT` on ANY
// error BEFORE rethrowing, so a refusal leaves the caller's transaction usable: `scheduleModule` /
// `activateModule` / `archiveModule` in `runLockedTransition`, `submitModuleLead` in its own loop, and
// `authorModule` through the genesis projector (`SAVEPOINT module_genesis`, which owns it). The read-only
// `checkModuleLeadAllowed` takes none. A 23505 aborts the transaction, so the lead's backstop retry is only
// possible inside a savepoint (TR3).

import { sql } from 'drizzle-orm';
import type pg from 'pg';

import type { Db } from '../db.js';
import type { MemberId, ModuleId, ModuleLeadId, PariwarId } from '../ids/index.js';
import type { MarketplaceModuleArchiveReason, MarketplaceModuleState } from '../schema/marketplace_modules.js';
import {
  ModuleArchiveReasonNotSatisfiedError,
  ModuleGenesisMissingError,
  ModuleIllegalTransitionError,
  ModuleLeadAlreadySubmittedError,
  ModuleLeadDuplicateError,
  ModuleNotActiveError,
  ModuleOutsideWindowError,
  ModuleProjectorInputError,
  ModuleSlotsExhaustedError,
  ModuleStreamConcurrencyError,
} from './errors.js';
import type {
  ModuleArchivedPayload,
  ModuleEventActor,
  ModuleLeadSubmittedPayload,
  ModuleStaffActor,
} from './events.js';
import { parseModuleManifest } from './filters.js';
import {
  assertModuleActor,
  projectModuleGenesis,
  projectModuleTransition,
  rollbackToSavepoint,
  type ModuleLockedRow,
  type ModuleTransitionEventType,
  type ModuleTransitionResult,
} from './project.js';
import { nextModuleState } from './state.js';

export type { ModuleTransitionResult } from './project.js';

/** The lead append is attempted at most this many times in TOTAL (QE7 backstop). */
export const MAX_LEAD_APPEND_ATTEMPTS = 3;

/** Backoff before the next lead attempt, `min(200, 10·2^attempt)` ms (attempt is 0-based). */
export function leadRetryBackoffMs(attempt: number): number {
  return Math.min(200, 10 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** What every command takes. `actor: 'system'` iff `actorId === null` (else `ModuleProjectorInputError`). */
export interface ModuleCommandBase {
  pariwarId: PariwarId;
  moduleId: ModuleId;
  /** REQUIRED — the caller's `withCompensatingAudit` intent id (QE15). */
  auditId: string;
  actor: ModuleEventActor;
  actorId: string | null;
}

/** The locked row plus the window the guards read. */
interface LockedModule extends ModuleLockedRow {
  validFrom: Date;
  validUntil: Date;
}

// A type alias (⛔ interface) so it satisfies drizzle `execute`'s `Record<string, unknown>` row constraint.
type LockedModuleRaw = {
  current_state: MarketplaceModuleState;
  state_event_version: string | number;
  slots_remaining: number | null;
  slot_capacity: number | null;
  // A raw `pg` client parses timestamptz to a Date; drizzle's `execute` hands back the string.
  valid_from: Date | string;
  valid_until: Date | string;
};

/** The row columns every lock / pre-check reads (one list, two readers). */
const MODULE_GUARD_COLUMNS = 'current_state, state_event_version, slots_remaining, slot_capacity, valid_from, valid_until';

function toLockedModule(r: LockedModuleRaw | undefined): LockedModule | null {
  if (!r) return null;
  return {
    currentState: r.current_state,
    stateEventVersion: Number(r.state_event_version),
    slotsRemaining: r.slots_remaining,
    slotCapacity: r.slot_capacity,
    validFrom: r.valid_from instanceof Date ? r.valid_from : new Date(r.valid_from),
    validUntil: r.valid_until instanceof Date ? r.valid_until : new Date(r.valid_until),
  };
}

/** `SELECT … FOR UPDATE` on the module row (QE7). Under twt_app this needs the UPDATE grant + policy (G15). */
async function lockModuleRow(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  moduleId: ModuleId,
): Promise<LockedModule | null> {
  const res = await client.query<LockedModuleRaw>(
    `SELECT ${MODULE_GUARD_COLUMNS} FROM marketplace_modules WHERE module_id = $1 AND pariwar_id = $2 FOR UPDATE`,
    [moduleId, pariwarId],
  );
  return toLockedModule(res.rows[0]);
}

/** DB time — the transaction's start instant (TR4). */
async function dbNow(client: pg.PoolClient): Promise<Date> {
  const res = await client.query<{ now: Date }>('SELECT now() AS now');
  const now = res.rows[0]?.now;
  if (!(now instanceof Date)) throw new Error('[marketplace] SELECT now() returned no Date');
  return now;
}

/** `[valid_from, valid_until)` — half-open (QE6). */
function inWindow(m: { validFrom: Date; validUntil: Date }, now: Date): boolean {
  return m.validFrom.getTime() <= now.getTime() && now.getTime() < m.validUntil.getTime();
}

// ── authorModule ───────────────────────────────────────────────────────────────────────────────────

/**
 * Author a module: `(none) → draft`. Runs (1) the actor check, (2) `parseModuleManifest`, (3) DB `now()`
 * and A5 — `valid_until > now()` (a past `valid_from` is fine), (4) `projectModuleGenesis`. Takes ⛔ row
 * lock: there is no row yet, and a race is decided by the 23505.
 *
 * @throws ModuleProjectorInputError / ModuleManifestInvalidError / ModuleOutsideWindowError /
 *         ModuleGenesisAlreadyExistsError (+ the projector's).
 */
export async function authorModule(
  client: pg.PoolClient,
  i: ModuleCommandBase & { manifest: unknown },
): Promise<{ eventId: string; eventVersion: 1; state: 'draft' }> {
  assertModuleActor('module.authored', i.actor, i.actorId);
  const manifest = parseModuleManifest(i.manifest);
  const now = await dbNow(client);
  if (!(manifest.validUntil.getTime() > now.getTime())) {
    throw new ModuleOutsideWindowError(i.moduleId, 'author', now, manifest.validFrom, manifest.validUntil);
  }
  return projectModuleGenesis(client, {
    pariwarId: i.pariwarId,
    moduleId: i.moduleId,
    manifest,
    auditId: i.auditId,
    actor: i.actor as ModuleStaffActor,
    actorId: i.actorId,
  });
}

// ── schedule / activate / archive — one shared shape ───────────────────────────────────────────────

const TRANSITION_SAVEPOINT = 'module_transition';

/**
 * Lock → legality → `guard(row, now)` → build the payload → project, inside one savepoint. Guard order
 * (QE6): row present (`ModuleGenesisMissingError`) → transition legal (`ModuleIllegalTransitionError`) →
 * the command's window / reason guard.
 */
async function runLockedTransition(
  client: pg.PoolClient,
  i: ModuleCommandBase,
  eventType: Exclude<ModuleTransitionEventType, 'module.lead_submitted'>,
  guard: (row: LockedModule, now: Date) => void,
  extraPayload: Record<string, unknown>,
  trigger: string,
): Promise<ModuleTransitionResult> {
  assertModuleActor(eventType, i.actor, i.actorId);
  await client.query(`SAVEPOINT ${TRANSITION_SAVEPOINT}`);
  try {
    const row = await lockModuleRow(client, i.pariwarId, i.moduleId);
    if (row === null) throw new ModuleGenesisMissingError(i.moduleId);
    const toState = nextModuleState(row.currentState, eventType);
    if (toState === null) throw new ModuleIllegalTransitionError(i.moduleId, row.currentState, eventType);
    guard(row, await dbNow(client));

    const result = await projectModuleTransition(client, {
      pariwarId: i.pariwarId,
      moduleId: i.moduleId,
      eventType,
      payload: { from_state: row.currentState, to_state: toState, trigger, actor: i.actor, ...extraPayload },
      auditId: i.auditId,
      actor: i.actor,
      actorId: i.actorId,
      lockedRow: row,
    });
    await client.query(`RELEASE SAVEPOINT ${TRANSITION_SAVEPOINT}`);
    return result;
  } catch (err) {
    await rollbackToSavepoint(client, TRANSITION_SAVEPOINT);
    throw err;
  }
}

/** `draft → scheduled`, only while `now() < valid_from`. @throws ModuleOutsideWindowError (+ the shared guards). */
export async function scheduleModule(client: pg.PoolClient, i: ModuleCommandBase): Promise<ModuleTransitionResult> {
  return runLockedTransition(
    client,
    i,
    'module.scheduled',
    (row, now) => {
      if (!(now.getTime() < row.validFrom.getTime())) {
        throw new ModuleOutsideWindowError(i.moduleId, 'schedule', now, row.validFrom, row.validUntil);
      }
    },
    {},
    'module.schedule',
  );
}

/** `draft | scheduled → active`, only while `valid_from ≤ now() < valid_until`. @throws ModuleOutsideWindowError. */
export async function activateModule(client: pg.PoolClient, i: ModuleCommandBase): Promise<ModuleTransitionResult> {
  return runLockedTransition(
    client,
    i,
    'module.activated',
    (row, now) => {
      if (!inWindow(row, now)) throw new ModuleOutsideWindowError(i.moduleId, 'activate', now, row.validFrom, row.validUntil);
    },
    {},
    'module.activate',
  );
}

/**
 * `draft | scheduled | active → archived` (terminal in 12.1). The reason's own rule (QE6):
 *   - `trustee_archived`        — from any non-archived state, ⛔ under the `system` actor (a person's decision);
 *   - `valid_until_reached`     — `now() ≥ valid_until`;
 *   - `slot_capacity_exhausted` — only when `active`, capped and `slots_remaining = 0`.
 * ⛔ Automatic archive at zero: a capped module stays `active` at 0 places until this is called (C2).
 *
 * @throws ModuleArchiveReasonNotSatisfiedError (+ the shared guards).
 */
export async function archiveModule(
  client: pg.PoolClient,
  i: ModuleCommandBase & { reason: MarketplaceModuleArchiveReason },
): Promise<ModuleTransitionResult & { reason: MarketplaceModuleArchiveReason }> {
  assertModuleActor('module.archived', i.actor, i.actorId);
  // Attribution (checklist family 8): `trustee_archived` is a person's decision, so it cannot be recorded under
  // the `system` actor (the sweep). The two AUTOMATIC reasons need no such rule — their guards below prove the
  // reason TRUE whoever calls. Checked before any statement, so it needs no savepoint.
  if (i.reason === 'trustee_archived' && i.actor === 'system') {
    throw new ModuleProjectorInputError(
      "[module.archived] reason 'trustee_archived' is a trustee's decision — it cannot be recorded under actor 'system'",
    );
  }
  const extra: Pick<ModuleArchivedPayload, 'reason'> = { reason: i.reason };
  const result = await runLockedTransition(
    client,
    i,
    'module.archived',
    (row, now) => {
      if (i.reason === 'valid_until_reached' && now.getTime() < row.validUntil.getTime()) {
        throw new ModuleArchiveReasonNotSatisfiedError(
          i.moduleId,
          i.reason,
          `now ${now.toISOString()} is before valid_until ${row.validUntil.toISOString()}`,
        );
      }
      if (
        i.reason === 'slot_capacity_exhausted' &&
        !(row.currentState === 'active' && row.slotCapacity !== null && row.slotsRemaining === 0)
      ) {
        throw new ModuleArchiveReasonNotSatisfiedError(
          i.moduleId,
          i.reason,
          `requires an active, capped module at 0 places — state '${row.currentState}', places ${String(row.slotsRemaining)}`,
        );
      }
    },
    extra,
    `module.archive:${i.reason}`,
  );
  return { ...result, reason: i.reason };
}

// ── Leads ──────────────────────────────────────────────────────────────────────────────────────────

/** Why a lead is refused, in QE7 order. */
export type ModuleLeadRefusal =
  | 'not_found'
  | 'not_active'
  | 'outside_window'
  | 'slots_exhausted'
  | 'duplicate_lead'
  | 'already_submitted';

interface ExistingLead {
  leadId: string;
  memberId: string;
  eventVersion: number;
  slotsRemainingAfter: number | null;
}

type LeadDecision =
  | { kind: 'refuse'; refusal: ModuleLeadRefusal }
  | { kind: 'replay'; lead: ExistingLead }
  | { kind: 'proceed' };

/**
 * The ONE lead decision both the pre-check and the locked command run (QE7 order, first failure wins):
 * 1 row present · 2 replay (same lead_id, same member) · 3 active · 4 in window · 5 a place left (when
 * capped) · 6 the lead_id is not another member's · 7 the member has no other lead on this module.
 */
function decideLead(
  row: LockedModule | null,
  existing: readonly ExistingLead[],
  now: Date,
  memberId: string,
  leadId: string,
): LeadDecision {
  if (row === null) return { kind: 'refuse', refusal: 'not_found' };
  const sameLead = existing.find((e) => e.leadId === leadId);
  if (sameLead && sameLead.memberId === memberId) return { kind: 'replay', lead: sameLead };
  if (row.currentState !== 'active') return { kind: 'refuse', refusal: 'not_active' };
  if (!inWindow(row, now)) return { kind: 'refuse', refusal: 'outside_window' };
  if (row.slotCapacity !== null && row.slotsRemaining === 0) return { kind: 'refuse', refusal: 'slots_exhausted' };
  if (sameLead) return { kind: 'refuse', refusal: 'duplicate_lead' };
  if (existing.some((e) => e.memberId === memberId)) return { kind: 'refuse', refusal: 'already_submitted' };
  return { kind: 'proceed' };
}

/**
 * THIS stream's leads matching the lead id OR the member (QE8). The JSON predicate is a Filter, bounded by
 * the `stream_id` index (G16); ⛔ cross-stream lookup (RLS hides other tenants — that case is the 23505).
 * `LIMIT 2`: at most one row per key can exist (the two unique indexes).
 */
const EXISTING_LEADS_SQL =
  'SELECT payload, event_version FROM events_log ' +
  "WHERE pariwar_id = $1 AND stream_id = $2 AND event_type = 'module.lead_submitted' " +
  "AND (payload->>'lead_id' = $3 OR payload->>'member_id' = $4) LIMIT 2";

function toExistingLeads(rows: readonly { payload: unknown; event_version: string | number }[]): ExistingLead[] {
  return rows.map((r) => {
    const p = (r.payload ?? {}) as Partial<ModuleLeadSubmittedPayload>;
    return {
      leadId: String(p.lead_id),
      memberId: String(p.member_id),
      eventVersion: Number(r.event_version),
      slotsRemainingAfter: typeof p.slots_remaining_after === 'number' ? p.slots_remaining_after : null,
    };
  });
}

/**
 * The read-only lead pre-check (QE15 step 2): the caller runs it BEFORE the audit wrapper, so a refusal
 * writes ⛔ audit line. Same decision as `submitModuleLead`, without the lock. `checkModuleLeadAllowed`
 * takes ⛔ actor — its caller passes the SESSION's member id as `memberId` (I11).
 * ⚠ Necessary, ⛔ sufficient: scope, eligibility, member state and grief suppression are 12.3's (C9).
 */
export async function checkModuleLeadAllowed(
  db: Db,
  a: { pariwarId: PariwarId; moduleId: ModuleId; memberId: MemberId; leadId: ModuleLeadId },
): Promise<{ ok: true; replayed: boolean } | { ok: false; refusal: ModuleLeadRefusal }> {
  const rowRes = await db.execute<LockedModuleRaw>(
    sql`SELECT ${sql.raw(MODULE_GUARD_COLUMNS)} FROM marketplace_modules
          WHERE module_id = ${a.moduleId} AND pariwar_id = ${a.pariwarId}`,
  );
  const row = toLockedModule(rowRes.rows[0]);
  const leadRes = await db.execute<{ payload: unknown; event_version: string | number }>(
    sql`SELECT payload, event_version FROM events_log
          WHERE pariwar_id = ${a.pariwarId} AND stream_id = ${a.moduleId} AND event_type = 'module.lead_submitted'
            AND (payload->>'lead_id' = ${a.leadId} OR payload->>'member_id' = ${a.memberId}) LIMIT 2`,
  );
  const nowRes = await db.execute<{ now: Date | string }>(sql`SELECT now() AS now`);
  const rawNow = nowRes.rows[0]?.now;
  const now = rawNow instanceof Date ? rawNow : new Date(String(rawNow));

  const decision = decideLead(row, toExistingLeads(leadRes.rows), now, a.memberId, a.leadId);
  if (decision.kind === 'refuse') return { ok: false, refusal: decision.refusal };
  return { ok: true, replayed: decision.kind === 'replay' };
}

/** Map a lead refusal to its typed error (QE13). */
function leadRefusalError(
  refusal: ModuleLeadRefusal,
  i: { moduleId: ModuleId; memberId: string; leadId: string },
  row: LockedModule | null,
  now: Date,
): Error {
  switch (refusal) {
    case 'not_found':
      return new ModuleGenesisMissingError(i.moduleId);
    case 'not_active':
      return new ModuleNotActiveError(i.moduleId, row?.currentState ?? 'unknown');
    case 'outside_window':
      return new ModuleOutsideWindowError(i.moduleId, 'lead', now, row?.validFrom ?? now, row?.validUntil ?? now);
    case 'slots_exhausted':
      return new ModuleSlotsExhaustedError(i.moduleId);
    case 'duplicate_lead':
      return new ModuleLeadDuplicateError(i.moduleId, i.leadId);
    case 'already_submitted':
      return new ModuleLeadAlreadySubmittedError(i.moduleId, i.memberId);
  }
}

const LEAD_SAVEPOINT = 'module_lead_append';

/**
 * Register the member's interest in an active module: `active → active`, taking one place when capped
 * (QE7, QE8). The actor IS the member (I11: `actor: 'member'` and `actorId === memberId`, checked FIRST,
 * before the lock). Then, per attempt, inside `SAVEPOINT module_lead_append`: lock the row, run the QE7
 * decision, and append. The identical call replayed returns `{ replayed: true }` with ⛔ event and ⛔
 * decrement. A `ModuleStreamConcurrencyError` is retried, `MAX_LEAD_APPEND_ATTEMPTS` attempts in total,
 * inside this ONE call (so one `auditId`); after the last it propagates. The lead path ⛔ replays the stream.
 *
 * @throws ModuleProjectorInputError (I11) · ModuleGenesisMissingError · ModuleNotActiveError ·
 *         ModuleOutsideWindowError · ModuleSlotsExhaustedError · ModuleLeadDuplicateError ·
 *         ModuleLeadAlreadySubmittedError · ModuleStreamConcurrencyError (after the last attempt).
 */
export async function submitModuleLead(
  client: pg.PoolClient,
  i: ModuleCommandBase & { leadId: ModuleLeadId; memberId: MemberId },
): Promise<
  | (ModuleTransitionResult & { replayed: false; slotsRemainingAfter: number | null })
  | { replayed: true; leadId: ModuleLeadId; eventVersion: number; slotsRemainingAfter: number | null }
> {
  assertModuleActor('module.lead_submitted', i.actor, i.actorId);
  if (i.actorId !== i.memberId) {
    throw new ModuleProjectorInputError(
      "[module.lead_submitted] actorId must equal memberId (I11) — a member registers only their OWN interest",
    );
  }

  for (let attempt = 0; ; attempt += 1) {
    await client.query(`SAVEPOINT ${LEAD_SAVEPOINT}`);
    try {
      // (1) The lock FIRST (I10) — re-issued each attempt.
      const row = await lockModuleRow(client, i.pariwarId, i.moduleId);
      const existingRes = await client.query<{ payload: unknown; event_version: string | number }>(EXISTING_LEADS_SQL, [
        i.pariwarId,
        i.moduleId,
        i.leadId,
        i.memberId,
      ]);
      const now = await dbNow(client);
      const decision = decideLead(row, toExistingLeads(existingRes.rows), now, i.memberId, i.leadId);

      if (decision.kind === 'replay') {
        await client.query(`RELEASE SAVEPOINT ${LEAD_SAVEPOINT}`);
        return {
          replayed: true,
          leadId: i.leadId,
          eventVersion: decision.lead.eventVersion,
          slotsRemainingAfter: decision.lead.slotsRemainingAfter,
        };
      }
      if (decision.kind === 'refuse' || row === null) {
        throw leadRefusalError(decision.kind === 'refuse' ? decision.refusal : 'not_found', i, row, now);
      }

      const slotsRemainingAfter = row.slotsRemaining === null ? null : row.slotsRemaining - 1;
      const payload: ModuleLeadSubmittedPayload = {
        lead_id: i.leadId,
        member_id: i.memberId,
        slots_remaining_after: slotsRemainingAfter,
        from_state: 'active',
        to_state: 'active',
        trigger: 'module.lead_submit',
        actor: 'member',
      };
      const result = await projectModuleTransition(client, {
        pariwarId: i.pariwarId,
        moduleId: i.moduleId,
        eventType: 'module.lead_submitted',
        payload,
        auditId: i.auditId,
        actor: i.actor,
        actorId: i.actorId,
        lockedRow: row,
      });
      await client.query(`RELEASE SAVEPOINT ${LEAD_SAVEPOINT}`);
      return { ...result, replayed: false, slotsRemainingAfter };
    } catch (err) {
      // ROLLBACK TO before retrying or rethrowing — a 23505 aborted the transaction (TR3).
      await rollbackToSavepoint(client, LEAD_SAVEPOINT);
      if (err instanceof ModuleStreamConcurrencyError && attempt + 1 < MAX_LEAD_APPEND_ATTEMPTS) {
        await sleep(leadRetryBackoffMs(attempt));
        continue;
      }
      throw err;
    }
  }
}

// Story 14.3 (decision `2026-11-20-467` DL4, DL8, DL9) — the breach register's accessors. Raw SQL on a `pg` pool / client: the two
// tables are GLOBAL (no Pariwar scope) and are reached only through the BYPASSRLS service pool, as 0188's bridge switch is.
//
// ⛔ ROW LOCKS. `twt_service` holds SELECT + INSERT on these tables and nothing else; Postgres requires an UPDATE privilege to take
// ANY row lock (`FOR UPDATE`, `FOR SHARE`, …), so a row lock here would fail 42501 in production while every test — run as a
// superuser — passed. Appends serialise on `pg_advisory_xact_lock(hashtext('breach_incident:' || id))` (the degraded-mode
// declaration's convention). Under that lock "nothing after `closed`" and "an extension is later than the current due time" cannot
// race, and `entry_seq` order is commit order.
// ⛔ The audit wrapper is never called from here — the handlers own it (the access-wrapper gate scans this directory).

import type pg from 'pg';

import { clampLimit } from '../pagination.js';
import {
  BREACH_DETECTION_SIGNAL_REF_MAX,
  BREACH_INCIDENT_TITLE_MAX,
  type BreachDetectionSource,
  type BreachEntryKind,
} from '../schema/breach_incidents.js';
import { MEMBER_LIFECYCLE_STATES } from '../schema/members.js';

import { breachBoardReportDueAt, breachExtensionGrantedUntil, isBreachIncidentClosed } from './rules.js';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BREACH_INCIDENT_LIST_LIMIT = { default: 20, cap: 100 } as const;
export const BREACH_SIGNAL_LIST_LIMIT = { default: 20, cap: 50 } as const;

export type BreachRegisterErrorCode =
  | 'breach.incident_not_found'
  | 'breach.incident_closed'
  | 'breach.extension_not_after_due'
  | 'breach.extension_invalid';

const STATUS: Record<BreachRegisterErrorCode, 400 | 404 | 409> = {
  'breach.incident_not_found': 404,
  'breach.incident_closed': 409,
  'breach.extension_not_after_due': 400,
  'breach.extension_invalid': 400,
};

/** A refused register write — `code` / `status` are the wire's; `details` carries ids and times only. */
export class BreachRegisterError extends Error {
  public override readonly name = 'BreachRegisterError';
  public readonly status: 400 | 404 | 409;
  constructor(
    public readonly code: BreachRegisterErrorCode,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`[breach] ${code}`);
    this.status = STATUS[code];
  }
}

export interface BreachIncident {
  readonly incidentId: string;
  readonly isRehearsal: boolean;
  readonly title: string;
  readonly becameAwareAt: Date;
  readonly openedAt: Date;
  readonly detectionSource: BreachDetectionSource;
  readonly detectionSignalRef: string | null;
  readonly openedBy: string;
  readonly openedByDisplay: string;
}

export interface BreachIncidentEntry {
  readonly entryId: string;
  /** `entry_seq` as a decimal string (a bigint identity) — compare with {@link compareBreachEntrySeq}, never lexically. */
  readonly entrySeq: string;
  readonly incidentId: string;
  readonly kind: BreachEntryKind;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly recordedAt: Date;
  readonly recordedBy: string;
  readonly recordedByDisplay: string;
}

export interface BreachIncidentWithEntries {
  readonly incident: BreachIncident;
  /** In `entry_seq` order. */
  readonly entries: readonly BreachIncidentEntry[];
}

interface IncidentRow {
  incident_id: string;
  is_rehearsal: boolean;
  title: string;
  became_aware_at: Date;
  opened_at: Date;
  detection_source: BreachDetectionSource;
  detection_signal_ref: string | null;
  opened_by: string;
  opened_by_display: string;
}

interface EntryRow {
  entry_id: string;
  entry_seq: string;
  incident_id: string;
  kind: BreachEntryKind;
  payload: Record<string, unknown>;
  recorded_at: Date;
  recorded_by: string;
  recorded_by_display: string;
}

const INCIDENT_COLS = `incident_id, is_rehearsal, title, became_aware_at, opened_at, detection_source, detection_signal_ref, opened_by, opened_by_display`;
const ENTRY_COLS = `entry_id, entry_seq::text AS entry_seq, incident_id, kind, payload, recorded_at, recorded_by, recorded_by_display`;

function toIncident(r: IncidentRow): BreachIncident {
  return {
    incidentId: r.incident_id,
    isRehearsal: r.is_rehearsal,
    title: r.title,
    becameAwareAt: r.became_aware_at,
    openedAt: r.opened_at,
    detectionSource: r.detection_source,
    detectionSignalRef: r.detection_signal_ref,
    openedBy: r.opened_by,
    openedByDisplay: r.opened_by_display,
  };
}

function toEntry(r: EntryRow): BreachIncidentEntry {
  return {
    entryId: r.entry_id,
    entrySeq: r.entry_seq,
    incidentId: r.incident_id,
    kind: r.kind,
    payload: r.payload,
    recordedAt: r.recorded_at,
    recordedBy: r.recorded_by,
    recordedByDisplay: r.recorded_by_display,
  };
}

/** Numeric order of two `entry_seq` strings. */
export function compareBreachEntrySeq(a: string, b: string): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function requireDisplay(actorDisplay: string): void {
  if (actorDisplay.trim() === '') {
    throw new Error("[breach] a breach register write needs the actor's display name (R5 attribution — never an id alone)");
  }
}

export interface OpenBreachIncidentInput {
  /** Generated by the caller BEFORE the audit intent (the audit locator embeds it). */
  readonly incidentId: string;
  readonly isRehearsal: boolean;
  /** 1–{@link BREACH_INCIDENT_TITLE_MAX} characters after trimming (the CHECK refuses otherwise). */
  readonly title: string;
  /** Must not be later than the DB's `now()` at insert (CHECK — a 23514 the handler maps to 400). */
  readonly becameAwareAt: Date;
  readonly detectionSource: BreachDetectionSource;
  /** Optional, ≤ {@link BREACH_DETECTION_SIGNAL_REF_MAX} — e.g. an `audit_integrity_checks.check_id`. */
  readonly detectionSignalRef?: string | null;
  readonly actorId: string;
  readonly actorDisplay: string;
  readonly auditId: string;
}

/**
 * Open an incident: ONE INSERT (auto-committed on a pool; inside the caller's transaction on a client). The new incident has no
 * entries yet. A CHECK violation (title bounds, awareness later than `now()`, an unknown source) surfaces as pg 23514.
 */
export async function openBreachIncident(db: Queryable, input: OpenBreachIncidentInput): Promise<BreachIncidentWithEntries> {
  requireDisplay(input.actorDisplay);
  const res = await db.query<IncidentRow>(
    `INSERT INTO breach_incidents
       (incident_id, is_rehearsal, title, became_aware_at, detection_source, detection_signal_ref, opened_by, opened_by_display, audit_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${INCIDENT_COLS}`,
    [
      input.incidentId,
      input.isRehearsal,
      input.title,
      input.becameAwareAt,
      input.detectionSource,
      input.detectionSignalRef ?? null,
      input.actorId,
      input.actorDisplay,
      input.auditId,
    ],
  );
  return { incident: toIncident(res.rows[0]!), entries: [] };
}

export interface AppendBreachEntryInput {
  /** Generated by the caller BEFORE the audit intent. */
  readonly entryId: string;
  readonly incidentId: string;
  readonly kind: BreachEntryKind;
  /** Already validated against the kind's strict contract shape by the caller. */
  readonly payload: Readonly<Record<string, unknown>>;
  readonly actorId: string;
  readonly actorDisplay: string;
  readonly auditId: string;
}

/** Append one entry in its OWN transaction on the passed (service) pool. See {@link appendBreachEntryInTx}. */
export async function appendBreachEntry(pool: pg.Pool, input: AppendBreachEntryInput): Promise<BreachIncidentWithEntries> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await appendBreachEntryInTx(client, input);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * {@link appendBreachEntry}'s body, on a client ALREADY inside a transaction (the caller owns BEGIN / COMMIT).
 * Order: read the incident (absent ⇒ `breach.incident_not_found`) → take the per-incident ADVISORY lock → read the entries →
 * refuse if closed (`breach.incident_closed`) → for an extension, refuse unless `grantedUntil` is later than the current due time
 * (`breach.extension_not_after_due`) → INSERT. Returns the incident with every entry, the new one last.
 */
export async function appendBreachEntryInTx(
  client: Pick<pg.PoolClient, 'query'>,
  input: AppendBreachEntryInput,
): Promise<BreachIncidentWithEntries> {
  requireDisplay(input.actorDisplay);
  if (!UUID_RE.test(input.incidentId)) throw new BreachRegisterError('breach.incident_not_found', { incidentId: input.incidentId });
  const found = await client.query<IncidentRow>(`SELECT ${INCIDENT_COLS} FROM breach_incidents WHERE incident_id = $1`, [input.incidentId]);
  const row = found.rows[0];
  if (!row) throw new BreachRegisterError('breach.incident_not_found', { incidentId: input.incidentId });
  const incident = toIncident(row);

  // Serialise appends to THIS incident (transaction-scoped; released at COMMIT / ROLLBACK). ⛔ A row lock — see the file header.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('breach_incident:' || $1::text))`, [input.incidentId]);

  const before = await client.query<EntryRow>(
    `SELECT ${ENTRY_COLS} FROM breach_incident_entries WHERE incident_id = $1 ORDER BY breach_incident_entries.entry_seq`,
    [input.incidentId],
  );
  const entries = before.rows.map(toEntry);
  if (isBreachIncidentClosed(entries)) throw new BreachRegisterError('breach.incident_closed', { incidentId: input.incidentId });
  if (input.kind === 'board_extension_recorded') {
    const until = breachExtensionGrantedUntil(input.payload);
    if (!until) throw new BreachRegisterError('breach.extension_invalid', { incidentId: input.incidentId });
    const due = breachBoardReportDueAt(incident.becameAwareAt, entries);
    if (until.getTime() <= due.getTime()) {
      throw new BreachRegisterError('breach.extension_not_after_due', {
        incidentId: input.incidentId,
        currentDueAt: due.toISOString(),
      });
    }
  }

  const inserted = await client.query<EntryRow>(
    `INSERT INTO breach_incident_entries (entry_id, incident_id, kind, payload, recorded_by, recorded_by_display, audit_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     RETURNING ${ENTRY_COLS}`,
    [input.entryId, input.incidentId, input.kind, JSON.stringify(input.payload), input.actorId, input.actorDisplay, input.auditId],
  );
  return { incident, entries: [...entries, toEntry(inserted.rows[0]!)] };
}

async function entriesOf(db: Queryable, incidentIds: readonly string[]): Promise<Map<string, BreachIncidentEntry[]>> {
  const byIncident = new Map<string, BreachIncidentEntry[]>(incidentIds.map((id) => [id, []]));
  if (incidentIds.length === 0) return byIncident;
  const res = await db.query<EntryRow>(
    `SELECT ${ENTRY_COLS} FROM breach_incident_entries WHERE incident_id = ANY($1::uuid[]) ORDER BY breach_incident_entries.entry_seq`,
    [incidentIds],
  );
  for (const r of res.rows) byIncident.get(r.incident_id)!.push(toEntry(r));
  return byIncident;
}

/** One incident with its entries in `entry_seq` order, or null. A malformed id is "not found", never a pg error. */
export async function readBreachIncident(db: Queryable, incidentId: string): Promise<BreachIncidentWithEntries | null> {
  if (!UUID_RE.test(incidentId)) return null;
  const found = await db.query<IncidentRow>(`SELECT ${INCIDENT_COLS} FROM breach_incidents WHERE incident_id = $1`, [incidentId]);
  const row = found.rows[0];
  if (!row) return null;
  const entries = await entriesOf(db, [row.incident_id]);
  return { incident: toIncident(row), entries: entries.get(row.incident_id)! };
}

/**
 * The newest incidents first (`opened_at`, then id), each with its entries. `limit` is CLAMPED here, explicitly — a raw `LIMIT` is
 * invisible to the domain-accessor gate, which only scans Drizzle `.limit(`.
 */
export async function listBreachIncidents(db: Queryable, limit?: number): Promise<BreachIncidentWithEntries[]> {
  const n = clampLimit(limit, BREACH_INCIDENT_LIST_LIMIT);
  const found = await db.query<IncidentRow>(
    `SELECT ${INCIDENT_COLS} FROM breach_incidents ORDER BY opened_at DESC, incident_id DESC LIMIT $1`,
    [n],
  );
  const entries = await entriesOf(db, found.rows.map((r) => r.incident_id));
  return found.rows.map((r) => ({ incident: toIncident(r), entries: entries.get(r.incident_id)! }));
}

/** A failed audit-chain check nobody has acknowledged — the one detection signal that persists today (Stories 1.10 / 1.11a). */
export interface BreachSignal {
  readonly checkId: string;
  readonly verifiedAt: Date;
  /** `first_broken_seq` as a decimal string, or null. */
  readonly firstBrokenSeq: string | null;
  readonly rowsVerified: number;
  readonly triggerSource: string;
  /** The incidents whose `detection_signal_ref` is this check's id, oldest first. Empty ⇒ not yet assessed in the register. */
  readonly incidentIds: readonly string[];
}

/**
 * "Signals to assess": every `audit_integrity_checks` row with `chain_valid = false` and no acknowledgement, newest first. READ
 * only — acknowledgement stays with the integrity page. Clamped explicitly (see {@link listBreachIncidents}).
 */
export async function listBreachSignals(db: Queryable, limit?: number): Promise<BreachSignal[]> {
  const n = clampLimit(limit, BREACH_SIGNAL_LIST_LIMIT);
  const res = await db.query<{
    check_id: string;
    verified_at: Date;
    first_broken_seq: string | null;
    rows_verified: number;
    trigger_source: string;
    incident_ids: string[];
  }>(
    `SELECT c.check_id, c.verified_at, c.first_broken_seq::text AS first_broken_seq, c.rows_verified, c.trigger_source,
            COALESCE(
              (SELECT array_agg(i.incident_id ORDER BY i.opened_at, i.incident_id)
                 FROM breach_incidents i WHERE i.detection_signal_ref = c.check_id::text),
              ARRAY[]::uuid[]
            ) AS incident_ids
       FROM audit_integrity_checks c
      WHERE c.chain_valid = false
        AND NOT EXISTS (SELECT 1 FROM audit_integrity_acknowledgements a WHERE a.check_id = c.check_id)
      ORDER BY c.verified_at DESC, c.check_id DESC
      LIMIT $1`,
    [n],
  );
  return res.rows.map((r) => ({
    checkId: r.check_id,
    verifiedAt: r.verified_at,
    firstBrokenSeq: r.first_broken_seq,
    rowsVerified: r.rows_verified,
    triggerSource: r.trigger_source,
    incidentIds: r.incident_ids,
  }));
}

type MemberLifecycleState = (typeof MEMBER_LIFECYCLE_STATES)[number];

/** The monthly review's input (DL9) — a count, never a threshold. */
export interface MembersOnRecord {
  readonly asOf: Date;
  /** Distinct Pariwars over the rows `total` counts. */
  readonly pariwarCount: number;
  /** Every member row EXCEPT `anonymized`. */
  readonly total: number;
  /** A count for EVERY lifecycle state, 0 when empty; `anonymized` stays visible here. */
  readonly byState: Readonly<Record<MemberLifecycleState, number>>;
}

/**
 * Members on record, trust-wide, in ONE statement (one snapshot). Reads `members.state` — a projector-written cache, good enough
 * for a monthly count. People who are not members (nominees, known people, claim contacts, workplace requests, field workers, the
 * memorial family list) are NOT counted; the runbook says so.
 */
export async function countMembersOnRecord(db: Queryable): Promise<MembersOnRecord> {
  const res = await db.query<{ as_of: Date; pariwar_count: number; by_state: Record<string, number> }>(
    `WITH by_state AS (SELECT state::text AS state, count(*)::int AS n FROM members GROUP BY state)
     SELECT clock_timestamp() AS as_of,
            (SELECT count(DISTINCT pariwar_id)::int FROM members WHERE state <> 'anonymized') AS pariwar_count,
            COALESCE((SELECT jsonb_object_agg(state, n) FROM by_state), '{}'::jsonb) AS by_state`,
  );
  const row = res.rows[0]!;
  const byState = Object.fromEntries(MEMBER_LIFECYCLE_STATES.map((s) => [s, row.by_state[s] ?? 0])) as Record<MemberLifecycleState, number>;
  const total = MEMBER_LIFECYCLE_STATES.filter((s) => s !== 'anonymized').reduce((sum, s) => sum + byState[s], 0);
  return { asOf: row.as_of, pariwarCount: row.pariwar_count, total, byState };
}

export { BREACH_DETECTION_SIGNAL_REF_MAX, BREACH_INCIDENT_TITLE_MAX };

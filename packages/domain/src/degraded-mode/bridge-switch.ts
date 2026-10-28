// The degraded-mode cycle-open SMS BRIDGE's Super Admin SWITCH — read and change. Story 5.8b (Task 2; AC12; `2026-10-28-415`
// FS17 (a); Panel `2026-10-28-414` Q1 A: *"build a switch that can be turned on/off by Superadmin, in case later we decide to
// turn it off"*). Migration 0188.
//
// ONE Trust-wide switch, created OFF. It gates only the bridge TEXT: when OFF the fan-out tries no text and the push → WhatsApp
// ladder runs exactly as before 5.8b. The declaration (5.8) is untouched — it still makes the cycle-open alert time-critical.
//
// Transport-free; ⛔ HTTP, ⛔ audit (the change endpoint's obligation — it passes the intent line's id in). GLOBAL tables, so both
// functions take a plain pool / client: the READ runs as any role that holds SELECT (`twt_app` sees the row through the
// `USING (true)` policy with or without a Pariwar scope); the CHANGE runs on the BYPASSRLS service pool (`twt_app` holds ⛔ write
// grant).

import type pg from 'pg';

/** What the switch says now, and the change that set it (null while it has never been changed — the migration's OFF). */
export interface DegradedBridgeSmsSwitchState {
  readonly enabled: boolean;
  readonly changedAt: Date | null;
  readonly changedByActor: string | null;
  /** The Super Admin's display name as it was when they changed it (review P2-2) — ⛔ re-read from `users`. */
  readonly changedByDisplay: string | null;
  readonly reason: string | null;
}

/** The longest reason the history CHECK admits (0188 — the declaration's bound). */
export const DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX = 500;

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

interface SwitchStateRow {
  enabled: boolean;
  changed_at: Date | null;
  changed_by_actor: string | null;
  changed_by_display: string | null;
  reason: string | null;
}

const READ_SQL = `SELECT s.enabled, c.changed_at, c.changed_by_actor, c.changed_by_display, c.reason
                    FROM degraded_bridge_sms_switch s
                    LEFT JOIN degraded_bridge_sms_switch_changes c ON c.change_id = s.last_change_id
                   WHERE s.id = 1`;

function toState(row: SwitchStateRow): DegradedBridgeSmsSwitchState {
  return {
    enabled: row.enabled,
    changedAt: row.changed_at,
    changedByActor: row.changed_by_actor,
    changedByDisplay: row.changed_by_display,
    reason: row.reason,
  };
}

/**
 * Read the switch. THROWS when the control row is missing (it cannot be deleted — 0188's trigger — so a missing row means the
 * migration has not run): ⛔ "absent ⇒ OFF" is ever inferred here; the caller decides what a failed read means.
 */
export async function readDegradedBridgeSmsSwitch(db: Queryable): Promise<DegradedBridgeSmsSwitchState> {
  const res = await db.query<SwitchStateRow>(READ_SQL);
  const row = res.rows[0];
  if (!row) throw new Error('[degraded-mode] degraded_bridge_sms_switch has no control row (migration 0188 not applied?)');
  return toState(row);
}

export interface SetDegradedBridgeSmsSwitchInput {
  readonly enabled: boolean;
  /** The Super Admin's session user id. */
  readonly actorId: string;
  /**
   * Their `users.display_name`, resolved SERVER-side by the caller before any write (review P2-2; R5 —
   * [[project_admin_display_name_attribution]]); REQUIRED, non-blank — refused here before the lock, and by the CHECK.
   */
  readonly actorDisplay: string;
  /** REQUIRED, non-blank, ≤ {@link DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX} (the CHECK refuses otherwise). */
  readonly reason: string;
  /** The audit intent line this change is written under — REQUIRED (the history column is NOT NULL; code review 2026-10-28
   *  (second pass)): the one writer runs inside `withCompensatingAudit`, which always has the intent line's id. */
  readonly auditId: string;
}

/**
 * Change the switch — in ONE transaction on the passed (BYPASSRLS service) pool: lock the control row, and ONLY if the state
 * differs, append a history row and point the control row at it (0188's trigger refuses any other UPDATE of the control row). `changed: false` ⇒ the switch already said this and NOTHING
 * was written (idempotent; the caller writes no audit line for it).
 */
export async function setDegradedBridgeSmsSwitch(
  pool: pg.Pool,
  input: SetDegradedBridgeSmsSwitchInput,
): Promise<{ readonly changed: boolean; readonly state: DegradedBridgeSmsSwitchState }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await setDegradedBridgeSmsSwitchInTx(client, input);
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
 * {@link setDegradedBridgeSmsSwitch}'s body, on a client ALREADY inside a transaction (the caller owns BEGIN / COMMIT — the
 * live-DB specs run it under their per-test rollback).
 */
export async function setDegradedBridgeSmsSwitchInTx(
  client: Pick<pg.PoolClient, 'query'>,
  input: SetDegradedBridgeSmsSwitchInput,
): Promise<{ readonly changed: boolean; readonly state: DegradedBridgeSmsSwitchState }> {
  if (input.actorDisplay.trim() === '') {
    throw new Error("[degraded-mode] a bridge switch change needs the actor's display name (R5 attribution — ⛔ an id alone)");
  }
  const locked = await client.query<{ enabled: boolean }>('SELECT enabled FROM degraded_bridge_sms_switch WHERE id = 1 FOR UPDATE');
  const current = locked.rows[0];
  if (!current) throw new Error('[degraded-mode] degraded_bridge_sms_switch has no control row (migration 0188 not applied?)');
  if (current.enabled === input.enabled) return { changed: false, state: await readDegradedBridgeSmsSwitch(client) };
  const inserted = await client.query<{ change_id: string }>(
    `INSERT INTO degraded_bridge_sms_switch_changes (enabled, changed_by_actor, changed_by_display, reason, audit_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING change_id`,
    [input.enabled, input.actorId, input.actorDisplay, input.reason, input.auditId],
  );
  await client.query(
    `UPDATE degraded_bridge_sms_switch SET enabled = $1, last_change_id = $2, updated_at = clock_timestamp() WHERE id = 1`,
    [input.enabled, inserted.rows[0]!.change_id],
  );
  return { changed: true, state: await readDegradedBridgeSmsSwitch(client) };
}

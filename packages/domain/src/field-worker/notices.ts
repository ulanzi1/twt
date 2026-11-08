// The officers' NOTICES of a field worker's move — Story 13.1d (decision `2026-11-08-458` AD9; the Panel's `-443` Q1 A: "Both District
// Admins are told by email and in the admin console, including when the Pariwar Admin moves a worker."; BigDev's Q-2 A: the Pariwar
// Admins are told of every refusal).
//
// ONE row per notice and recipient, written by the DECIDING act's command in its own transaction (the 13.1b outbox shape) — a notice
// whose act rolls back is never written, one whose act commits cannot be lost. CHANNEL-NEUTRAL: the in-app list reads it now; row
// `13-1g`'s email sends it later (Q-1 A). ⛔ Name, mobile or code (I6).
//
// RECIPIENTS are resolved IN the transaction from `role_grants` + `users.status = 'active'` — ⛔ a display-name filter (a recipient need
// not have one; `listAdminsByRole` requires it): District Admins of a district by an EXACT district grant (TR9: a District Admin holding a
// pariwar-dimension grant is not found — the role's grants are district grants), Pariwar Admins by a pariwar-dimension grant. The acting
// officer is ALWAYS excluded, and no officer gets two notices for one act (`writeFieldWorkerNotices` merges, the first kind winning). No
// recipient ⇒ no row.

import type pg from 'pg';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import type { FieldWorkerMoveRefusalReason } from '../schema/field_worker_move_requests.js';
import type { FieldWorkerNoticeKind } from '../schema/field_worker_notices.js';

export { FIELD_WORKER_NOTICE_KINDS, type FieldWorkerNoticeKind } from '../schema/field_worker_notices.js';

/** The active District Admins of `district` — by an EXACT district grant. Ordered, distinct. */
export async function districtAdminsOf(client: pg.PoolClient, pariwarId: PariwarId, district: string): Promise<string[]> {
  const r = await client.query<{ user_id: string }>(
    `SELECT DISTINCT g.user_id FROM role_grants g JOIN users u ON u.id = g.user_id
      WHERE g.pariwar_id = $1 AND g.role = 'district_admin' AND g.scope_dimension = 'district' AND g.scope_value = $2
        AND u.status = 'active'
      ORDER BY g.user_id`,
    [pariwarId, district],
  );
  return r.rows.map((x) => x.user_id);
}

/** The active Pariwar Admins of the Pariwar — by a pariwar-dimension grant. Ordered, distinct. */
export async function pariwarAdminsOf(client: pg.PoolClient, pariwarId: PariwarId): Promise<string[]> {
  const r = await client.query<{ user_id: string }>(
    `SELECT DISTINCT g.user_id FROM role_grants g JOIN users u ON u.id = g.user_id
      WHERE g.pariwar_id = $1 AND g.role = 'pariwar_admin' AND g.scope_dimension = 'pariwar'
        AND u.status = 'active'
      ORDER BY g.user_id`,
    [pariwarId],
  );
  return r.rows.map((x) => x.user_id);
}

/** What one act tells — the same facts for every recipient. */
export interface FieldWorkerNoticeFacts {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** NULL only for a direct move that superseded no request. */
  moveRequestId: FieldWorkerMoveRequestId | null;
  fromDistrict: string;
  toDistrict: string;
  /** `move_request_refused` only. */
  refusalReason?: FieldWorkerMoveRefusalReason;
}

/**
 * Write one act's notices: for each `[kind, recipients]` group, in order, one row per recipient — the ACTOR excluded (`actorId`; `null`
 * for the system), and an officer already told by an earlier group of this act skipped (one notice per recipient per act). Returns the
 * rows written as `[recipient, kind]`, in order.
 */
export async function writeFieldWorkerNotices(
  client: pg.PoolClient,
  facts: FieldWorkerNoticeFacts,
  groups: ReadonlyArray<readonly [FieldWorkerNoticeKind, readonly string[]]>,
  actorId: string | null,
): Promise<Array<[string, FieldWorkerNoticeKind]>> {
  const told = new Set<string>(actorId === null ? [] : [actorId]);
  const rows: Array<[string, FieldWorkerNoticeKind]> = [];
  for (const [kind, recipients] of groups) {
    for (const recipient of recipients) {
      if (told.has(recipient)) continue;
      told.add(recipient);
      rows.push([recipient, kind]);
    }
  }
  for (const [recipient, kind] of rows) {
    await client.query(
      `INSERT INTO field_worker_notices
         (pariwar_id, recipient_user_id, kind, field_worker_id, move_request_id, from_district, to_district, refusal_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        facts.pariwarId,
        recipient,
        kind,
        facts.fieldWorkerId,
        facts.moveRequestId,
        facts.fromDistrict,
        facts.toDistrict,
        kind === 'move_request_refused' ? (facts.refusalReason ?? null) : null,
      ],
    );
  }
  return rows;
}

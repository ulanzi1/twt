// Data-export row accessors — Story 3.11 (Task 2/Task 5 support).
//
// The tenant-scoped read/write accessors the API data-export routes + the jobs build worker use to
// drive the `data_exports` lifecycle (`pending → ready|failed → consumed|expired`). All run under the
// caller's RLS scope (the caller has set `app.pariwar_id`); the explicit `member_id` predicate is
// cross-tenant defense-in-depth alongside RLS. Mirrors the consent/nominee read-accessor shape.

import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { DataExportId, HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';
import {
  type DataExportRequestedVia,
  type DataExportRow,
  dataExports,
} from '../schema/data_exports.js';

/**
 * The single ACTIVE export for a member, if any — a `pending` row OR a `ready` row that is neither
 * consumed nor past its window. Backs the AC1 idempotency guard: a second request while one is in
 * flight returns THIS row rather than enqueuing a duplicate. Newest-first, LIMIT 1.
 */
export async function findActiveExport(
  client: Db,
  memberId: MemberId,
  now: Date,
): Promise<DataExportRow | null> {
  const rows = await client
    .select()
    .from(dataExports)
    .where(
      and(
        eq(dataExports.memberId, memberId),
        or(
          eq(dataExports.status, 'pending'),
          and(
            eq(dataExports.status, 'ready'),
            isNull(dataExports.consumedAt),
            gt(dataExports.expiresAt, now),
          ),
        ),
      ),
    )
    .orderBy(sql`${dataExports.createdAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

/** Insert a fresh `pending` export row. Returns the inserted row (with the generated `export_id`). */
export async function insertDataExport(
  client: Db,
  input: {
    memberId: MemberId;
    pariwarId: PariwarId;
    requestedAt: Date;
    /**
     * Story 10.21 — the originating channel. OMITTED for the member self-service path, which keeps
     * its shipped behaviour unchanged via the column DEFAULT `'member_portal'`. ⛔ Do not make this
     * required: the member caller must not have to name a channel it never had to name before.
     */
    requestedVia?: DataExportRequestedVia;
    /** The acting ADMIN, for an off-portal build only. NULL for member self-service. */
    requestedByActorId?: string | null;
    /**
     * The originating helpdesk ticket, for an off-portal build only. PROVENANCE ONLY — it records
     * WHICH REQUEST caused the build, never WHAT the build may see. ⛔ Nothing resolves subject scope
     * through this column; every fulfilment read keys on `member_id`.
     */
    helpdeskTicketId?: HelpdeskTicketId | null;
  },
): Promise<DataExportRow> {
  const [row] = await client
    .insert(dataExports)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      status: 'pending',
      requestedAt: input.requestedAt,
      // Spread-omitted rather than passed as undefined so the member path genuinely relies on the
      // column DEFAULT, keeping its behaviour identical to before Story 10.21.
      ...(input.requestedVia === undefined ? {} : { requestedVia: input.requestedVia }),
      ...(input.requestedByActorId === undefined ? {} : { requestedByActorId: input.requestedByActorId }),
      ...(input.helpdeskTicketId === undefined ? {} : { helpdeskTicketId: input.helpdeskTicketId }),
    })
    .returning();
  if (!row) throw new Error('insertDataExport: INSERT returning produced no row');
  return row;
}

/** Resolve THIS member's export by id (404 discipline — null when not theirs / not in scope). */
export async function getExportForMember(
  client: Db,
  exportId: DataExportId,
  memberId: MemberId,
): Promise<DataExportRow | null> {
  const rows = await client
    .select()
    .from(dataExports)
    .where(and(eq(dataExports.exportId, exportId), eq(dataExports.memberId, memberId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Stamp `consumed_at = now` + `status = 'consumed'` for a `ready`, unconsumed export — the ONE-TIME
 * guard (AC3). Conditional UPDATE (`WHERE consumed_at IS NULL`): a concurrent second download that
 * wins no row returned lost the race and must be told `410 consumed`. Returns TRUE iff THIS call won.
 */
export async function markExportConsumed(
  client: Db,
  exportId: DataExportId,
  memberId: MemberId,
  now: Date,
): Promise<boolean> {
  const rows = await client
    .update(dataExports)
    .set({ status: 'consumed', consumedAt: now })
    .where(
      and(
        eq(dataExports.exportId, exportId),
        eq(dataExports.memberId, memberId),
        isNull(dataExports.consumedAt),
      ),
    )
    .returning({ exportId: dataExports.exportId });
  return rows.length === 1;
}

/**
 * Mark an export `failed` with a bounded NON-PII reason code — the compensating write when the API
 * cannot enqueue the build job (the `pending` row would otherwise orphan; AC1 / Dev Notes §"First
 * API-side enqueue"). Scoped to `pending` rows only: guards against a late job-timeout retry
 * overwriting a `ready` or `consumed` row.
 */
export async function markExportFailed(
  client: Db,
  exportId: DataExportId,
  memberId: MemberId,
  reason: string,
): Promise<void> {
  await client
    .update(dataExports)
    .set({ status: 'failed', failedReason: reason })
    .where(
      and(
        eq(dataExports.exportId, exportId),
        eq(dataExports.memberId, memberId),
        eq(dataExports.status, 'pending'),
      ),
    );
}

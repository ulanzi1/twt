// Reports library — `report_exports` row accessors (Story 10.7, Task 2; AC2/AC5).
//
// The tenant-scoped read/write accessors the API report routes + the jobs build worker use to drive the
// `report_exports` lifecycle (`pending → ready|failed → consumed|expired`). Mirrors
// `data-export/store.ts` — but keyed on `requested_by_actor_id` (the ADMIN requestor), NOT `member_id`
// (the ⚠ actor-scoped-not-member-scoped difference from 3.11). All run under the caller's RLS scope
// (the caller has set `app.pariwar_id`); the explicit `requested_by_actor_id` predicate is
// cross-tenant defense-in-depth alongside RLS.

import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import type { PariwarId, ReportExportId } from '../ids/index.js';
import { reportExports } from '../schema/report_exports.js';
import type { ReportExportRow } from '../schema/report_exports.js';

export type { ReportExportRow };
import type { ReportFailureReasonCode } from './types.js';

/** The list-endpoint page size — a bounded read, not a paginated one (v1; AC2 console precedent). */
const REPORT_EXPORT_LIST_LIMIT = 50;

/**
 * The single ACTIVE export for `(actor, reportType, format, paramsHash)`, if any — a `pending` row OR a
 * `ready` row that is neither consumed nor past its window. Backs the AC2 idempotency guard: a second
 * request while one is in flight returns THIS row rather than enqueuing a duplicate. Newest-first, LIMIT
 * 1. `format` is part of the key (review finding): the same report in CSV vs JSON is two DISTINCT
 * artifacts, so it must NOT idempotently collapse to whichever was requested first — the unique index
 * carries `format` for the same reason.
 */
export async function findActiveReportExport(
  client: Db,
  requestedByActorId: string,
  reportType: string,
  format: string,
  paramsHash: string,
  now: Date,
): Promise<ReportExportRow | null> {
  const rows = await client
    .select()
    .from(reportExports)
    .where(
      and(
        eq(reportExports.requestedByActorId, requestedByActorId),
        eq(reportExports.reportType, reportType),
        eq(reportExports.format, format),
        eq(reportExports.paramsHash, paramsHash),
        or(
          eq(reportExports.status, 'pending'),
          and(
            eq(reportExports.status, 'ready'),
            isNull(reportExports.consumedAt),
            gt(reportExports.expiresAt, now),
          ),
        ),
      ),
    )
    .orderBy(sql`${reportExports.createdAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Expire a stale, past-window `ready` row for `(actor, reportType, format, paramsHash)` IN PLACE — the
 * application-layer reconciliation for the partial-unique index, which cannot carry the non-immutable
 * `expires_at > now()` freshness predicate (review finding). A re-request 23505s against a `ready` row
 * the hourly vacuum has not yet reaped, but `findActiveReportExport` cannot see it (its ready branch
 * requires a LIVE window), so the retry re-read would miss and the actor would be locked out until the
 * vacuum runs. Calling this on the 23505 retry frees the idempotency tuple so a fresh insert can proceed.
 * Returns the number of rows expired (0 or 1).
 */
export async function expireStaleReadyReportExport(
  client: Db,
  requestedByActorId: string,
  reportType: string,
  format: string,
  paramsHash: string,
  now: Date,
): Promise<number> {
  const rows = await client
    .update(reportExports)
    .set({ status: 'expired' })
    .where(
      and(
        eq(reportExports.requestedByActorId, requestedByActorId),
        eq(reportExports.reportType, reportType),
        eq(reportExports.format, format),
        eq(reportExports.paramsHash, paramsHash),
        eq(reportExports.status, 'ready'),
        isNull(reportExports.consumedAt),
        lte(reportExports.expiresAt, now),
      ),
    )
    .returning({ reportExportId: reportExports.reportExportId });
  return rows.length;
}

/** Insert a fresh `pending` report-export row. Returns the inserted row (with the generated id). */
export async function insertReportExport(
  client: Db,
  input: {
    pariwarId: PariwarId;
    requestedByActorId: string;
    reportType: string;
    format: string;
    paramsHash: string;
    requestedAt: Date;
  },
): Promise<ReportExportRow> {
  const [row] = await client
    .insert(reportExports)
    .values({
      pariwarId: input.pariwarId,
      requestedByActorId: input.requestedByActorId,
      reportType: input.reportType,
      format: input.format,
      paramsHash: input.paramsHash,
      status: 'pending',
      requestedAt: input.requestedAt,
    })
    .returning();
  if (!row) throw new Error('insertReportExport: INSERT returning produced no row');
  return row;
}

/**
 * List THIS actor's report exports, newest-first, bounded (the admin console's "your export list").
 * RLS + the explicit `requested_by_actor_id` predicate scope it to the caller's own tenant + requests.
 */
export async function listReportExportsForActor(
  client: Db,
  requestedByActorId: string,
): Promise<ReportExportRow[]> {
  return client
    .select()
    .from(reportExports)
    .where(eq(reportExports.requestedByActorId, requestedByActorId))
    .orderBy(desc(reportExports.requestedAt))
    // Fixed, non-caller-supplied bound, but routed through clampLimit to satisfy the domain
    // forced-pagination invariant ([[project_domain_limit_clamp_and_savepoint_retry]]) — a bare named
    // const reads as a "dynamic" limit to the accessor-invariants gate (verify-before-committing: the
    // gate was red on this line as shipped).
    .limit(clampLimit(REPORT_EXPORT_LIST_LIMIT, { default: REPORT_EXPORT_LIST_LIMIT, cap: REPORT_EXPORT_LIST_LIMIT }));
}

/** Resolve THIS actor's export by id (404 discipline — null when not theirs / not in scope). */
export async function getReportExportForActor(
  client: Db,
  reportExportId: ReportExportId,
  requestedByActorId: string,
): Promise<ReportExportRow | null> {
  const rows = await client
    .select()
    .from(reportExports)
    .where(
      and(
        eq(reportExports.reportExportId, reportExportId),
        eq(reportExports.requestedByActorId, requestedByActorId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Stamp `consumed_at = now` + `status = 'consumed'` for a `ready`, unconsumed export — the ONE-TIME
 * guard (AC5). Conditional UPDATE (`WHERE consumed_at IS NULL`): a concurrent second download that wins
 * no row lost the race and must be told `410 consumed`. Returns TRUE iff THIS call won.
 */
export async function markReportExportConsumed(
  client: Db,
  reportExportId: ReportExportId,
  requestedByActorId: string,
  now: Date,
): Promise<boolean> {
  const rows = await client
    .update(reportExports)
    .set({ status: 'consumed', consumedAt: now })
    .where(
      and(
        eq(reportExports.reportExportId, reportExportId),
        eq(reportExports.requestedByActorId, requestedByActorId),
        isNull(reportExports.consumedAt),
      ),
    )
    .returning({ reportExportId: reportExports.reportExportId });
  return rows.length === 1;
}

/**
 * Mark an export `failed` with a bounded NON-PII reason code — the compensating write when the API
 * cannot enqueue the build job or the worker cannot assemble. Scoped to `pending` rows only: guards
 * against a late job-timeout retry overwriting a `ready` or `consumed` row.
 */
export async function markReportExportFailed(
  client: Db,
  reportExportId: ReportExportId,
  requestedByActorId: string,
  reason: ReportFailureReasonCode,
): Promise<void> {
  await client
    .update(reportExports)
    .set({ status: 'failed', failedReason: reason })
    .where(
      and(
        eq(reportExports.reportExportId, reportExportId),
        eq(reportExports.requestedByActorId, requestedByActorId),
        eq(reportExports.status, 'pending'),
      ),
    );
}

// Reports library — the audit-log-query template (Story 10.7, Task 3; AC1(c), AC3).
//
// The Auditor-only audit-log report. REUSES the already-seeded `audit.export` key (Decision 6 — the
// canonical "who may export the audit log" authority; granted to the Auditor role, roles.ts). Reads
// `audit_log_entries` within the actor's Pariwar scope (RLS tenant-isolates under the caller's
// app.pariwar_id; the explicit `pariwar_id` predicate is defense-in-depth). NON-PII columns only — the
// audit rows are already NON-PII by construction (`requestPayloadHash` is a digest, never the payload).
//
// The Auditor's ceiling is `pariwar`, so the resolved scope is always pariwar-wide — the Auditor sees
// the FULL Pariwar log (no district narrowing). pariwar-dimension.

import { sql } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { ReportColumn, ReportScopeCtx, ReportTemplate } from '../types.js';
import { reportRowLimit } from './_shared.js';

export const AUDIT_LOG_REPORT_TYPE = 'audit_log_query';
/** REUSED Auditor-only audit-export key (Decision 6) — no new key minted. */
export const AUDIT_LOG_PERMISSION_KEY = 'audit.export';

interface AuditLogRow {
  audit_id: string;
  action: string;
  resource_locator: string;
  response_status: number;
  recorded_at: string;
  actor_role: string | null;
}

const columns: readonly ReportColumn[] = [
  { key: 'audit_id', header: 'Audit ID', piiTier: 3 },
  { key: 'action', header: 'Action', piiTier: 3 },
  { key: 'resource_locator', header: 'Resource', piiTier: 3 },
  { key: 'response_status', header: 'Status', piiTier: 3 },
  { key: 'recorded_at', header: 'Recorded At', piiTier: 3 },
  { key: 'actor_role', header: 'Actor Role', piiTier: 3 },
];

async function query(scopeCtx: ReportScopeCtx, client: Db): Promise<AuditLogRow[]> {
  const result = await client.execute<{
    audit_id: string;
    action: string;
    resource_locator: string;
    response_status: number;
    recorded_at: Date;
    actor_role: string | null;
  }>(sql`
    SELECT audit_id::text AS audit_id,
           action,
           resource_locator,
           response_status,
           recorded_at,
           actor_role
    FROM audit_log_entries
    WHERE pariwar_id = ${scopeCtx.pariwarId}
    ORDER BY seq DESC
    LIMIT ${reportRowLimit()}
  `);
  return result.rows.map((r) => ({
    audit_id: r.audit_id,
    action: r.action,
    resource_locator: r.resource_locator,
    response_status: Number(r.response_status),
    recorded_at: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : String(r.recorded_at),
    actor_role: r.actor_role,
  }));
}

export const auditLogQueryTemplate: ReportTemplate<AuditLogRow> = {
  reportType: AUDIT_LOG_REPORT_TYPE,
  permissionKey: AUDIT_LOG_PERMISSION_KEY,
  scopeDimension: 'pariwar',
  auditAction: 'report.generated',
  columns,
  query,
  csvRow: (row) => ({
    audit_id: row.audit_id,
    action: row.action,
    resource_locator: row.resource_locator,
    response_status: String(row.response_status),
    recorded_at: row.recorded_at,
    actor_role: row.actor_role ?? '',
  }),
  jsonRow: (row) => ({
    audit_id: row.audit_id,
    action: row.action,
    resource_locator: row.resource_locator,
    response_status: row.response_status,
    recorded_at: row.recorded_at,
    actor_role: row.actor_role,
  }),
};

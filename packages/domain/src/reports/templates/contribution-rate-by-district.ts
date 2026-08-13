// Reports library — the contribution-rate-by-district template (Story 10.7, Task 3; AC1(b), AC3).
//
// A scope-filtered GROUP BY aggregate — proves scope-as-predicate narrowing on an AGGREGATE (Decision
// 3). Grouped by the current posting district within the actor's scope.
//
// ── HONEST-EMPTY numerator (do NOT invent contribution facts) ──────────────────────────────────────
// The DENOMINATOR (members-per-district, scope-narrowed) is REAL — it proves the GROUP BY + scope
// predicate mechanism. The NUMERATOR (confirmed-contribution counts / the actual RATE) reads an Epic
// 8/9 contribution read-model that is NOT shaped yet, so it is emitted as an HONEST placeholder
// (`contribution_rate = 'n/a (Epic 8/9)'`, `_wired_by` note) rather than fabricated
// ([[project_engine_never_infers_contribution_facts]]; the 3.11 `EmptyExportSection` honesty). When the
// Epic 8/9 read-model lands, the numerator join swaps in here with ZERO harness changes.
//
// permissionKey = `reconciliation.review` (Decision 6, REUSED — a contribution-rate report is a finance/
// reconciliation read authority already held by finance_officer + pariwar_admin; the audit-log report's
// `audit.export` reuse precedent). pariwar-dimension.

import { sql } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { ReportColumn, ReportScopeCtx, ReportTemplate } from '../types.js';
import { resolveDistrictNarrowing, reportRowLimit } from './_shared.js';

export const CONTRIBUTION_RATE_REPORT_TYPE = 'contribution_rate_by_district';
/** REUSED finance/reconciliation read key (Decision 6) — NOT a new umbrella key. */
export const CONTRIBUTION_RATE_PERMISSION_KEY = 'reconciliation.review';

/** The Epic 8/9 numerator source, recorded openly as un-wired (never faked). */
const NUMERATOR_WIRED_BY = 'Epic 8/9 contribution read-model';

interface ContributionRateRow {
  district: string;
  member_count: number;
}

const columns: readonly ReportColumn[] = [
  { key: 'district', header: 'District', piiTier: 3 },
  { key: 'member_count', header: 'Members (denominator)', piiTier: 3 },
  // The numerator/rate is honestly un-sourced in v1 — a Tier-3 placeholder, never a fabricated fact.
  { key: 'contribution_rate', header: 'Contribution Rate', piiTier: 3 },
];

async function query(scopeCtx: ReportScopeCtx, client: Db): Promise<ContributionRateRow[]> {
  const narrowing = resolveDistrictNarrowing(scopeCtx.resolvedScope);
  // deny-deeper geo. ⛔ NOT pending a resolver — Story 1.18 shipped one and this branch deliberately
  // did not change; see `_shared.ts`'s per-dimension re-examination (state → Story 10.28's
  // single-valued-type limitation; block → rank order; self → not a tree node).
  if (narrowing.kind === 'deny') return [];

  // Tenant isolation via the EXPLICIT `m.pariwar_id` predicate (the build worker's BYPASSRLS service
  // pool bypasses RLS — the 3.11 convention); the district narrowing (Decision 3) composes on top.
  const scopeFilter =
    narrowing.kind === 'district'
      ? sql`WHERE m.pariwar_id = ${scopeCtx.pariwarId} AND cp.district = ${narrowing.district}`
      : sql`WHERE m.pariwar_id = ${scopeCtx.pariwarId}`;

  // The CTE is TENANT-SCOPED via its own `pariwar_id` predicate (review finding): on the worker's
  // BYPASSRLS service pool an unfiltered DISTINCT ON would scan+sort every tenant's member_postings.
  const result = await client.execute<{ district: string; member_count: number }>(sql`
    WITH current_posting AS (
      SELECT DISTINCT ON (member_id) member_id, district
      FROM member_postings
      WHERE pariwar_id = ${scopeCtx.pariwarId}
      ORDER BY member_id, created_at DESC
    )
    SELECT cp.district AS district, count(*)::int AS member_count
    FROM members m
    JOIN current_posting cp ON cp.member_id = m.member_id
    ${scopeFilter}
    GROUP BY cp.district
    ORDER BY cp.district
    LIMIT ${reportRowLimit()}
  `);
  return result.rows.map((r) => ({ district: r.district, member_count: Number(r.member_count) }));
}

export const contributionRateByDistrictTemplate: ReportTemplate<ContributionRateRow> = {
  reportType: CONTRIBUTION_RATE_REPORT_TYPE,
  permissionKey: CONTRIBUTION_RATE_PERMISSION_KEY,
  scopeDimension: 'pariwar',
  auditAction: 'report.generated',
  columns,
  query,
  csvRow: (row) => ({
    district: row.district,
    member_count: String(row.member_count),
    contribution_rate: `n/a (${NUMERATOR_WIRED_BY})`,
  }),
  jsonRow: (row) => ({
    district: row.district,
    member_count: row.member_count,
    contribution_rate: null,
    _wired_by: NUMERATOR_WIRED_BY,
  }),
};

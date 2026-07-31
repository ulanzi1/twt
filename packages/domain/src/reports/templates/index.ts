// Reports library — the v1 seed template set (Story 10.7, Task 3).
//
// THREE representative templates chosen to exercise every distinct axis (NOT all ~10 FR-58A reports —
// the rest register in follow-ups via the same contract, Decision 1):
//   · member_roster                — Tier-3-clear + masked columns; a district-scoped read (a NEW
//     district-capable key, proves district narrowing + mint).
//   · contribution_rate_by_district — a scope-filtered GROUP BY aggregate (proves scope-as-predicate on
//     an aggregate; REUSES reconciliation.review; honest-empty numerator).
//   · audit_log_query              — Auditor-only (REUSES the existing audit.export key).

import type { ReportTemplate } from '../types.js';
import { auditLogQueryTemplate } from './audit-log-query.js';
import { contributionRateByDistrictTemplate } from './contribution-rate-by-district.js';
import { memberRosterTemplate } from './member-roster.js';

export * from './member-roster.js';
export * from './contribution-rate-by-district.js';
export * from './audit-log-query.js';

/** The v1 seed template set `createReportRegistry()` ships with by default (AC1, Decision 1). Each is
 *  stored type-erased (its own `TRow` is opaque to the harness — the 10.6 registry posture). */
export const DEFAULT_REPORT_TEMPLATES: readonly ReportTemplate<unknown>[] = [
  memberRosterTemplate as unknown as ReportTemplate<unknown>,
  contributionRateByDistrictTemplate as unknown as ReportTemplate<unknown>,
  auditLogQueryTemplate as unknown as ReportTemplate<unknown>,
];
